// `algal.skill-experiment.v1` — the bounded per-arm report of a
// cumulative-skill study (docs/cumulative-skill-experiment.md). The report is
// derived evidence: it cites the `algal.experiment-session.v1` record each
// arm produced — which itself names the arm's `algal.habitat-budget.v1`
// account, its `algal.experiment-catalog.v1` kept-procedure list, and the
// ordered `algal.experiment-run.v1` task records — plus the program-index
// state digest the aggregates were computed against, so every number can be
// re-derived offline. It records counts and digests, never narratives and
// never wall-clock values.
//
// The pre-registered measures map to fields like so:
//   held-out success     → heldOutPassed / heldOutTotal (unseen+shift tasks;
//                          a task passes when its recorded outcome is
//                          `complete` — deterministic grading is inside the
//                          program, so `failed`, `stuck`, `invalid`, and
//                          `exhausted` outcomes are not passes)
//   cost per success     → workTotal, attemptsTotal, runsTotal ÷ heldOutPassed
//   reuse contribution   → reuse[]: kept catalog manifests joined to later
//                          task receipts through the program index's
//                          receipts relation
//   val-vs-holdout gap   → holdoutGaps[] per entry promoted in the session
//   catalog failure mode → consultations, catalogHits, catalogMisses,
//                          admissionFailures (a consult hit whose run could
//                          not be admitted — the kept procedure failed
//                          interface admission on reuse), keptEntries vs
//                          reusedEntries
//   spend comparison     → limits + workTotal/attemptsTotal/runsTotal,
//                          matched across arms by the account records
//
// Evidence discovery: the report config cites each arm's session digest; the
// rollup re-reads the session's account, catalog, and task records,
// reconciles the account against the store, and joins kept manifests to
// task receipts through the derived program index (whose state digest the
// report records). Human-correction effort is not measured: the run records
// the arm-runner stream writes carry no correction signal, so no field
// claims one.
import { lstat, open, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { digestCanonical, type Digest } from "./digest";
import { AlgalError } from "./errors";
import {
  EXPERIMENT_ARMS,
  EXPERIMENT_BOUNDS,
  EXPERIMENT_RUN_CONTRACT,
  parseExperimentCatalog,
  parseExperimentRun,
  parseExperimentSession,
  type ExperimentArmKind,
  type ExperimentCatalog,
  type ExperimentRun,
  type ExperimentSession,
} from "./experiment-run";
import {
  checkHabitatBudgetEvidence,
  parseHabitatBudget,
  type HabitatBudget,
  type HabitatLimits,
} from "./habitat-budget";
import { buildProgramIndex, runProgramQuery } from "./program-db";
import { parseRunReceipt } from "./run";
import { FileStore } from "./store";
import { compareUtf8 } from "./utf8";
import {
  asArray,
  asObject,
  asSafeId,
  asString,
  canonicalBytes,
  noUnknownKeys,
  reqField,
  type JsonObject,
  type JsonValue,
} from "./values";

export const SKILL_EXPERIMENT_CONTRACT = "algal.skill-experiment.v1" as const;
export const SKILL_EXPERIMENT_CONFIG_CONTRACT = "algal.skill-experiment.config.v1" as const;

/** Held-out success is measured on the unseen and shift phases. */
const HELD_OUT_PHASES: readonly string[] = ["unseen", "shift"];

export const SKILL_EXPERIMENT_BOUNDS = Object.freeze({
  /** Canonical bytes of one report record. */
  maxBytes: 1_048_576,
  /** Arms one report may compare. */
  maxArms: 8,
  /** Task records per arm; the session record's own bound. */
  maxRecords: EXPERIMENT_BOUNDS.maxTasks,
  /** Kept catalog entries per arm; the catalog record's own bound. */
  maxKept: EXPERIMENT_BOUNDS.maxCatalogEntries,
  /** Later task runs listed per kept entry. */
  maxReuseRuns: EXPERIMENT_BOUNDS.maxTasks,
  /** Config file bytes. */
  maxConfigBytes: 65_536,
  /** Bytes one experiment-run record may occupy in the values/ scan; the
   * record contract's own snapshot bound. */
  maxRecordBytes: EXPERIMENT_BOUNDS.record.maxBytes,
  /** Directory entries the values/ scan walks. */
  maxFiles: 65_536,
  /** Kept manifests joined per index query (the query surface's `in` bound). */
  maxJoinChunk: 64,
} as const);

export type SkillExperimentScore = { passed: number; total: number };

/** One kept catalog entry and the later task receipts that reused its
 * manifest: the reuse-contribution join. `runs` are task receipt digests in
 * task order; `heldOutRuns` is the subset in held-out phases. */
export type SkillExperimentReuse = {
  manifest: Digest;
  /** The entry's index in the arm's catalog record. */
  entry: number;
  /** The task the entry records as its promoter. */
  taskId: string;
  /** The promoting task's position in the session's task order, or null when
   * the entry predates this session (a seeded catalog entry). */
  promotedSequence: number | null;
  runs: Digest[];
  heldOutRuns: Digest[];
};

/** One in-session promotion's validation-versus-held-out counts — the
 * overfitting signal as raw numbers; the gap is their difference. Entries
 * the session inherited carry no validation record here. */
export type SkillExperimentHoldoutGap = {
  manifest: Digest;
  validation: SkillExperimentScore;
  heldOut: SkillExperimentScore;
};

export type SkillExperimentArm = {
  /** The arm kind the session ran; unique across the report's arms. */
  name: ExperimentArmKind;
  /** The consult signature the arm declared. */
  family: string;
  /** The arm's `algal.experiment-session.v1` record digest. */
  session: Digest;
  /** The session's `algal.habitat-budget.v1` account record digest. */
  account: Digest;
  /** The session's `algal.experiment-catalog.v1` record digest. */
  catalog: Digest;
  accountOutcome: "complete" | "exhausted";
  /** The account's declared ceilings — what "matched budget" means. */
  limits: HabitatLimits;
  /** Total recorded work charged to the account. */
  workTotal: number;
  /** Total executor attempts charged to the account. */
  attemptsTotal: number;
  /** Total runs the account admitted — task, generation, and evaluation
   * runs alike. */
  runsTotal: number;
  tasksAttempted: number;
  /** Tasks whose recorded outcome is `complete`. */
  tasksPassed: number;
  /** Held-out success: passing tasks in the unseen and shift phases. */
  heldOutPassed: number;
  heldOutTotal: number;
  /** Tasks that ended `invalid` or `exhausted`. */
  invalidTasks: number;
  exhaustedTasks: number;
  /** Catalog consultations the arm ran (hits + misses). */
  consultations: number;
  catalogHits: number;
  catalogMisses: number;
  /** Consult hits whose reuse could not be admitted — the kept procedure
   * failed interface admission on reuse. */
  admissionFailures: number;
  /** Entries in the session's catalog record. */
  keptEntries: number;
  /** Kept entries a later task ran at least once. */
  reusedEntries: number;
  reuse: SkillExperimentReuse[];
  holdoutGaps: SkillExperimentHoldoutGap[];
  /** The `algal.experiment-run.v1` record digests this arm aggregates, in
   * the session's task order — the cited evidence every count derives
   * from. */
  records: Digest[];
};

export type SkillExperimentReport = {
  contract: typeof SKILL_EXPERIMENT_CONTRACT;
  /** The study these arms belong to; the config names it. */
  study: string;
  /** The program-index state digest the aggregates were computed against —
   * a fingerprint of the whole store at report time. */
  index: Digest;
  arms: SkillExperimentArm[];
  digest: Digest;
};

export type SkillExperimentConfigArm = { session: Digest };
export type SkillExperimentConfig = {
  contract: typeof SKILL_EXPERIMENT_CONFIG_CONTRACT;
  study: string;
  arms: SkillExperimentConfigArm[];
};

function fail(message: string): never {
  throw new AlgalError("PARSE_FAILED", `skill experiment: ${message}`);
}

function closed(value: unknown, fields: readonly string[], at: string): JsonObject {
  const obj = asObject(value, `skill experiment ${at}`);
  noUnknownKeys(obj, fields, `skill experiment ${at}`);
  return obj;
}

function reference(value: unknown, at: string): Digest {
  if (typeof value !== "string" || !/^sha256:[0-9a-f]{64}$/.test(value)) {
    fail(`${at} must be a sha256 digest`);
  }
  return value as Digest;
}

function count(value: unknown, min: number, max: number, at: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < min || value > max) {
    fail(`${at} must be an integer in ${min}..${max}`);
  }
  return value;
}

function parseScore(value: unknown, at: string, max: number, allowZeroTotal: boolean): SkillExperimentScore {
  const s = closed(value, ["passed", "total"], at);
  const total = count(s.total, allowZeroTotal ? 0 : 1, max, `${at}.total`);
  const passed = count(s.passed, 0, max, `${at}.passed`);
  if (passed > total) fail(`${at}.passed exceeds its total`);
  return { passed, total };
}

function parseLimits(value: unknown, at: string): HabitatLimits {
  const v = closed(value, ["work", "attempts", "runs"], at);
  return {
    work: count(v.work, 1, Number.MAX_SAFE_INTEGER, `${at}.work`),
    attempts: count(v.attempts, 0, Number.MAX_SAFE_INTEGER, `${at}.attempts`),
    runs: count(v.runs, 1, Number.MAX_SAFE_INTEGER, `${at}.runs`),
  };
}

function parseDigestList(value: unknown, at: string, max: number): Digest[] {
  const list = asArray(value, `skill experiment ${at}`);
  if (list.length > max) fail(`${at} exceeds ${max} entries`);
  const out = list.map((item, i) => reference(item, `${at}[${i}]`));
  if (new Set(out).size !== out.length) fail(`${at} contains a duplicate`);
  return out;
}

function parseReuse(value: unknown, at: string): SkillExperimentReuse {
  const r = closed(value, ["manifest", "entry", "taskId", "promotedSequence", "runs", "heldOutRuns"], at);
  const runs = parseDigestList(reqField(r, "runs", at), `${at}.runs`, SKILL_EXPERIMENT_BOUNDS.maxReuseRuns);
  const heldOutRuns = parseDigestList(reqField(r, "heldOutRuns", at), `${at}.heldOutRuns`, SKILL_EXPERIMENT_BOUNDS.maxReuseRuns);
  const runSet = new Set(runs);
  if (heldOutRuns.some((d) => !runSet.has(d))) fail(`${at}.heldOutRuns must be a subset of runs`);
  const promotedSequence = r.promotedSequence;
  if (promotedSequence !== null && (typeof promotedSequence !== "number" || !Number.isSafeInteger(promotedSequence) || promotedSequence < 0 || promotedSequence >= SKILL_EXPERIMENT_BOUNDS.maxRecords)) {
    fail(`${at}.promotedSequence must be a task index or null`);
  }
  return {
    manifest: reference(reqField(r, "manifest", at), `${at}.manifest`),
    entry: count(reqField(r, "entry", at), 0, SKILL_EXPERIMENT_BOUNDS.maxKept - 1, `${at}.entry`),
    taskId: asString(reqField(r, "taskId", at), `skill experiment ${at}.taskId`, EXPERIMENT_BOUNDS.maxTaskIdLength),
    promotedSequence: promotedSequence as number | null,
    runs,
    heldOutRuns,
  };
}

function parseHoldoutGap(value: unknown, at: string): SkillExperimentHoldoutGap {
  const g = closed(value, ["manifest", "validation", "heldOut"], at);
  return {
    manifest: reference(reqField(g, "manifest", at), `${at}.manifest`),
    validation: parseScore(reqField(g, "validation", at), `${at}.validation`, EXPERIMENT_BOUNDS.maxCases, false),
    heldOut: parseScore(reqField(g, "heldOut", at), `${at}.heldOut`, SKILL_EXPERIMENT_BOUNDS.maxRecords, true),
  };
}

function parseArm(value: unknown, i: number): SkillExperimentArm {
  const at = `arms[${i}]`;
  const a = closed(value, [
    "name", "family", "session", "account", "catalog", "accountOutcome", "limits",
    "workTotal", "attemptsTotal", "runsTotal",
    "tasksAttempted", "tasksPassed", "heldOutPassed", "heldOutTotal",
    "invalidTasks", "exhaustedTasks",
    "consultations", "catalogHits", "catalogMisses", "admissionFailures",
    "keptEntries", "reusedEntries", "reuse", "holdoutGaps", "records",
  ], at);
  const name = a.name;
  if (!(EXPERIMENT_ARMS as readonly unknown[]).includes(name)) {
    fail(`${at}.name must be one of ${EXPERIMENT_ARMS.join(", ")}`);
  }
  const limits = parseLimits(reqField(a, "limits", at), `${at}.limits`);
  const outcome = a.accountOutcome;
  if (outcome !== "complete" && outcome !== "exhausted") fail(`${at}.accountOutcome must be complete or exhausted`);
  const workTotal = count(reqField(a, "workTotal", at), 0, Number.MAX_SAFE_INTEGER, `${at}.workTotal`);
  const attemptsTotal = count(reqField(a, "attemptsTotal", at), 0, Number.MAX_SAFE_INTEGER, `${at}.attemptsTotal`);
  const runsTotal = count(reqField(a, "runsTotal", at), 0, Number.MAX_SAFE_INTEGER, `${at}.runsTotal`);
  if (workTotal > limits.work || attemptsTotal > limits.attempts || runsTotal > limits.runs) {
    fail(`${at} charged totals exceed its declared limits`);
  }
  const tasksAttempted = count(reqField(a, "tasksAttempted", at), 0, SKILL_EXPERIMENT_BOUNDS.maxRecords, `${at}.tasksAttempted`);
  const tasksPassed = count(reqField(a, "tasksPassed", at), 0, SKILL_EXPERIMENT_BOUNDS.maxRecords, `${at}.tasksPassed`);
  const heldOutTotal = count(reqField(a, "heldOutTotal", at), 0, SKILL_EXPERIMENT_BOUNDS.maxRecords, `${at}.heldOutTotal`);
  const heldOutPassed = count(reqField(a, "heldOutPassed", at), 0, SKILL_EXPERIMENT_BOUNDS.maxRecords, `${at}.heldOutPassed`);
  const invalidTasks = count(reqField(a, "invalidTasks", at), 0, SKILL_EXPERIMENT_BOUNDS.maxRecords, `${at}.invalidTasks`);
  const exhaustedTasks = count(reqField(a, "exhaustedTasks", at), 0, SKILL_EXPERIMENT_BOUNDS.maxRecords, `${at}.exhaustedTasks`);
  if (tasksPassed > tasksAttempted) fail(`${at}.tasksPassed exceeds tasksAttempted`);
  if (heldOutTotal > tasksAttempted) fail(`${at}.heldOutTotal exceeds tasksAttempted`);
  if (heldOutPassed > heldOutTotal) fail(`${at}.heldOutPassed exceeds heldOutTotal`);
  if (heldOutPassed > tasksPassed) fail(`${at}.heldOutPassed exceeds tasksPassed`);
  if (tasksPassed + invalidTasks + exhaustedTasks > tasksAttempted) {
    fail(`${at}.tasksPassed + invalidTasks + exhaustedTasks exceeds tasksAttempted`);
  }
  if (tasksAttempted > runsTotal) fail(`${at}.tasksAttempted exceeds the account's runs`);
  const consultations = count(reqField(a, "consultations", at), 0, SKILL_EXPERIMENT_BOUNDS.maxRecords, `${at}.consultations`);
  const catalogHits = count(reqField(a, "catalogHits", at), 0, SKILL_EXPERIMENT_BOUNDS.maxRecords, `${at}.catalogHits`);
  const catalogMisses = count(reqField(a, "catalogMisses", at), 0, SKILL_EXPERIMENT_BOUNDS.maxRecords, `${at}.catalogMisses`);
  if (catalogHits + catalogMisses !== consultations) {
    fail(`${at}.consultations must equal catalogHits + catalogMisses`);
  }
  const admissionFailures = count(reqField(a, "admissionFailures", at), 0, SKILL_EXPERIMENT_BOUNDS.maxRecords, `${at}.admissionFailures`);
  if (admissionFailures > catalogHits) fail(`${at}.admissionFailures exceeds catalogHits`);
  const keptEntries = count(reqField(a, "keptEntries", at), 0, SKILL_EXPERIMENT_BOUNDS.maxKept, `${at}.keptEntries`);
  const reusedEntries = count(reqField(a, "reusedEntries", at), 0, SKILL_EXPERIMENT_BOUNDS.maxKept, `${at}.reusedEntries`);
  if (reusedEntries > keptEntries) fail(`${at}.reusedEntries exceeds keptEntries`);
  const reuse = asArray(reqField(a, "reuse", at), `skill experiment ${at}.reuse`)
    .map((item, j) => parseReuse(item, `${at}.reuse[${j}]`));
  if (reuse.length !== keptEntries) fail(`${at}.reuse must list every kept entry`);
  if (reuse.some((entry, j) => entry.entry !== j)) {
    fail(`${at}.reuse must list kept entries in catalog order`);
  }
  const gaps = asArray(reqField(a, "holdoutGaps", at), `skill experiment ${at}.holdoutGaps`)
    .map((item, j) => parseHoldoutGap(item, `${at}.holdoutGaps[${j}]`));
  // Gaps cover in-session promotions that recorded validation — a
  // subsequence of the entries promoted inside the session, in reuse order.
  const gapable = reuse.filter((entry) => entry.promotedSequence !== null).map((entry) => entry.manifest);
  let cursor = 0;
  for (const gap of gaps) {
    const index = gapable.indexOf(gap.manifest, cursor);
    if (index === -1) {
      fail(`${at}.holdoutGaps must name in-session promotions in reuse order`);
    }
    cursor = index + 1;
  }
  const stillKept = reuse.filter((entry) => entry.runs.length > 0).length;
  if (stillKept !== reusedEntries) fail(`${at}.reusedEntries must count the kept entries later tasks ran`);
  const records = parseDigestList(reqField(a, "records", at), `${at}.records`, SKILL_EXPERIMENT_BOUNDS.maxRecords);
  if (records.length !== tasksAttempted) fail(`${at}.records must cite every attempted task record`);
  return {
    name: name as ExperimentArmKind,
    family: asString(reqField(a, "family", at), `skill experiment ${at}.family`, EXPERIMENT_BOUNDS.maxFamilyLength),
    session: reference(reqField(a, "session", at), `${at}.session`),
    account: reference(reqField(a, "account", at), `${at}.account`),
    catalog: reference(reqField(a, "catalog", at), `${at}.catalog`),
    accountOutcome: outcome,
    limits,
    workTotal,
    attemptsTotal,
    runsTotal,
    tasksAttempted,
    tasksPassed,
    heldOutPassed,
    heldOutTotal,
    invalidTasks,
    exhaustedTasks,
    consultations,
    catalogHits,
    catalogMisses,
    admissionFailures,
    keptEntries,
    reusedEntries,
    reuse,
    holdoutGaps: gaps,
    records,
  };
}

/** Parse a closed `algal.skill-experiment.v1` report: unknown keys are
 * rejected, every count and list is bounded, and the aggregates must be
 * internally coherent — passes within attempts, consultations equal to hits
 * plus misses, one reuse row per catalog entry in catalog order, held-out
 * gaps in reuse order, and one cited run record per attempted task.
 * Evidence checks against a store are `verifyExperimentReport`'s job. */
export function parseSkillExperimentReport(value: unknown): SkillExperimentReport {
  const r = asObject(value, "skill experiment report");
  if (canonicalBytes(r) > SKILL_EXPERIMENT_BOUNDS.maxBytes) {
    throw new AlgalError("BUDGET_EXHAUSTED", `skill experiment report exceeds ${SKILL_EXPERIMENT_BOUNDS.maxBytes} bytes`);
  }
  noUnknownKeys(r, ["contract", "study", "index", "arms", "digest"], "skill experiment report");
  if (r.contract !== SKILL_EXPERIMENT_CONTRACT) {
    fail(`contract must be ${SKILL_EXPERIMENT_CONTRACT}`);
  }
  const arms = asArray(reqField(r, "arms", "report"), "skill experiment arms")
    .map((item, i) => parseArm(item, i));
  if (arms.length === 0 || arms.length > SKILL_EXPERIMENT_BOUNDS.maxArms) {
    fail(`arms must be a bounded non-empty list of at most ${SKILL_EXPERIMENT_BOUNDS.maxArms}`);
  }
  const names = new Set(arms.map((arm) => arm.name));
  if (names.size !== arms.length) fail("arms must have unique names");
  const sessions = new Set(arms.map((arm) => arm.session));
  if (sessions.size !== arms.length) fail("arms must cite distinct sessions");
  const accounts = new Set(arms.map((arm) => arm.account));
  if (accounts.size !== arms.length) fail("arms must charge distinct accounts");
  return {
    contract: SKILL_EXPERIMENT_CONTRACT,
    study: asSafeId(reqField(r, "study", "report"), "skill experiment study"),
    index: reference(reqField(r, "index", "report"), "index"),
    arms,
    digest: reference(reqField(r, "digest", "report"), "digest"),
  };
}

/** Parse the rollup's input: a study label plus the session digests the
 * report aggregates. Everything else is discovered through the sessions. */
export function parseSkillExperimentConfig(value: unknown): SkillExperimentConfig {
  const c = asObject(value, "skill experiment config");
  if (canonicalBytes(c) > SKILL_EXPERIMENT_BOUNDS.maxConfigBytes) {
    throw new AlgalError("BUDGET_EXHAUSTED", `skill experiment config exceeds ${SKILL_EXPERIMENT_BOUNDS.maxConfigBytes} bytes`);
  }
  noUnknownKeys(c, ["contract", "study", "arms"], "skill experiment config");
  if (c.contract !== SKILL_EXPERIMENT_CONFIG_CONTRACT) {
    fail(`config contract must be ${SKILL_EXPERIMENT_CONFIG_CONTRACT}`);
  }
  const arms = asArray(reqField(c, "arms", "config"), "skill experiment config arms")
    .map((item, i): SkillExperimentConfigArm => {
      const at = `config.arms[${i}]`;
      const a = closed(item, ["session"], at);
      return { session: reference(reqField(a, "session", at), `${at}.session`) };
    });
  if (arms.length === 0 || arms.length > SKILL_EXPERIMENT_BOUNDS.maxArms) {
    fail(`config arms must be a bounded non-empty list of at most ${SKILL_EXPERIMENT_BOUNDS.maxArms}`);
  }
  const sessions = new Set(arms.map((arm) => arm.session));
  if (sessions.size !== arms.length) fail("config arms must cite distinct sessions");
  return {
    contract: SKILL_EXPERIMENT_CONFIG_CONTRACT,
    study: asSafeId(reqField(c, "study", "config"), "skill experiment config study"),
    arms,
  };
}

// ------------------------------------------------------------ discovery ----

export type ScannedExperimentRecord =
  | { digest: Digest; run: ExperimentRun; error?: never }
  | { digest: Digest; run?: never; error: AlgalError };

const HEX_NAME = /^[0-9a-f]{64}\.json$/;

/** One bounded record file: regular, not a symlink, within `maxBytes`. */
async function readRecordBytes(path: string, maxBytes: number): Promise<unknown> {
  const stat = await lstat(path);
  if (!stat.isFile() || stat.isSymbolicLink()) throw new AlgalError("IO_FAILED", "not a regular file");
  if (stat.size > maxBytes) throw new AlgalError("BUDGET_EXHAUSTED", `over ${maxBytes} bytes`);
  const file = await open(path, "r");
  try {
    return JSON.parse(await file.readFile("utf8")) as unknown;
  } finally {
    await file.close();
  }
}

/** Scan `dir/values/` for `algal.experiment-run.v1` records. Files that
 * cannot be this contract (foreign names, over-bound, or not JSON objects
 * naming it) are skipped like the program index skips them; a file that
 * claims the contract but fails the strict parser comes back as an error
 * entry — malformed evidence is reported, not dropped. */
export async function scanExperimentRunRecords(dir: string): Promise<ScannedExperimentRecord[]> {
  const root = join(resolve(dir), "values");
  let names: string[] = [];
  try {
    names = (await readdir(root)).sort(compareUtf8);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    return [];
  }
  const out: ScannedExperimentRecord[] = [];
  let files = 0;
  for (const name of names) {
    if (!HEX_NAME.test(name)) continue;
    if (++files > SKILL_EXPERIMENT_BOUNDS.maxFiles) {
      throw new AlgalError("BUDGET_EXHAUSTED", `experiment report: values entries exceed ${SKILL_EXPERIMENT_BOUNDS.maxFiles}`);
    }
    let value: unknown;
    try {
      value = await readRecordBytes(join(root, name), SKILL_EXPERIMENT_BOUNDS.maxRecordBytes);
    } catch {
      continue; // unreadable or over-bound: cannot be this contract
    }
    if (value === null || typeof value !== "object" || Array.isArray(value)) continue;
    const record = value as Record<string, unknown>;
    if (record.contract !== EXPERIMENT_RUN_CONTRACT) continue;
    const digest = `sha256:${name.slice(0, -5)}` as Digest;
    try {
      out.push({ digest, run: parseExperimentRun(value) });
    } catch (error) {
      out.push({ digest, error: error instanceof AlgalError ? error : new AlgalError("PARSE_FAILED", String(error)) });
    }
  }
  return out;
}

// -------------------------------------------------------------- rollup -----

function evidenceError(message: string): never {
  throw new AlgalError("PARSE_FAILED", `skill experiment evidence: ${message}`);
}

/** Aggregate one arm's cited evidence: the session's task order is the run
 * order, each task's receipts must be charged to the arm's account in that
 * order, consult and promote indices must resolve inside the arm's catalog,
 * and every measure folds out of the same pass. Shared by the rollup (which
 * throws on inconsistency) and the verifier (which reports it). */
export function aggregateExperimentArm(
  session: ExperimentSession,
  records: { digest: Digest; run: ExperimentRun }[],
  catalog: ExperimentCatalog,
  account: HabitatBudget,
  receiptsRanManifest: (manifest: Digest) => ReadonlySet<Digest>,
): Omit<SkillExperimentArm, "name" | "family" | "session" | "account" | "catalog"> {
  if (records.length !== session.tasks.length) {
    evidenceError(`session lists ${session.tasks.length} tasks, ${records.length} run records were supplied`);
  }
  if (session.outcome !== account.outcome) {
    evidenceError(`session outcome ${session.outcome} but the account is ${account.outcome}`);
  }
  // Task and generation receipts must be charged to the account, in task
  // order: walking the account's admission order, each cited receipt must
  // appear strictly after the previous one.
  const positions = new Map<Digest, number[]>();
  account.runs.forEach((run, i) => {
    const list = positions.get(run.receipt);
    if (list) list.push(i);
    else positions.set(run.receipt, [i]);
  });
  let lastPosition = -1;
  const positionOf = (receipt: Digest, what: string): void => {
    const list = positions.get(receipt);
    if (!list) evidenceError(`${what} receipt ${receipt} is not charged to the arm's account`);
    const position = list!.find((p) => p > lastPosition);
    if (position === undefined) {
      evidenceError(`${what} receipt ${receipt} contradicts the account's admission order`);
    }
    lastPosition = position;
  };
  let tasksPassed = 0;
  let heldOutPassed = 0;
  let heldOutTotal = 0;
  let invalidTasks = 0;
  let exhaustedTasks = 0;
  let catalogHits = 0;
  let catalogMisses = 0;
  let admissionFailures = 0;
  /** Each in-session promotion: the catalog index it added, the promoting
   * task's position, and the recorded validation score when present. */
  const promotedInSession = new Map<number, { taskIndex: number; manifest: Digest; validation: SkillExperimentScore | null }>();
  for (const [i, entry] of records.entries()) {
    const task = session.tasks[i]!;
    const { run } = entry;
    if (entry.digest !== task.run) {
      evidenceError(`task ${i}'s record digest ${entry.digest} is not the session's ${task.run}`);
    }
    if (run.arm !== session.arm) evidenceError(`task ${task.taskId}'s record claims arm ${run.arm}, not ${session.arm}`);
    if (run.taskId !== task.taskId) evidenceError(`task ${i}'s record claims taskId ${run.taskId}, not ${task.taskId}`);
    if (run.phase !== task.phase) evidenceError(`task ${task.taskId}'s record claims phase ${run.phase}, not ${task.phase}`);
    if (run.generator !== null) positionOf(run.generator.receipt, `task ${task.taskId}'s generator`);
    if (run.receipt !== null) positionOf(run.receipt, `task ${task.taskId}'s`);
    if (run.consult.outcome === "hit") {
      catalogHits += 1;
      const consulted = catalog.entries[run.consult.entry!];
      if (consulted === undefined || consulted.manifest !== run.consult.manifest) {
        evidenceError(`task ${task.taskId}'s consult entry ${run.consult.entry} does not name manifest ${run.consult.manifest} in the catalog`);
      }
      // A hit runs the kept manifest it consulted; a record that claims
      // another manifest under the hit is not what the runner writes.
      if (run.manifest !== null && run.manifest !== run.consult.manifest) {
        evidenceError(`task ${task.taskId}'s hit consulted ${run.consult.manifest} but the record claims it ran ${run.manifest}`);
      }
      if (run.outcome === "invalid") admissionFailures += 1;
    } else if (run.consult.outcome === "miss") {
      catalogMisses += 1;
    }
    if (run.promote !== null) {
      if (run.promote.promoted) {
        const index = run.promote.entry!;
        const added = catalog.entries[index];
        if (added === undefined) {
          evidenceError(`task ${task.taskId}'s promotion entry ${index} is beyond the catalog`);
        } else {
          if (added.taskId !== task.taskId) evidenceError(`task ${task.taskId}'s promotion is recorded as entry ${index}, which names task ${added.taskId}`);
          if (added.manifest !== run.manifest) evidenceError(`task ${task.taskId}'s promotion entry ${index} keeps ${added.manifest}, not ${run.manifest}`);
          if (added.report !== run.promote.report) evidenceError(`task ${task.taskId}'s promotion cites report ${run.promote.report}, the catalog records ${added.report}`);
          promotedInSession.set(index, { taskIndex: i, manifest: added.manifest, validation: run.promote.validation });
        }
      }
    }
    if (run.outcome === "complete") tasksPassed += 1;
    if (run.outcome === "invalid") invalidTasks += 1;
    if (run.outcome === "exhausted") exhaustedTasks += 1;
    if (HELD_OUT_PHASES.includes(run.phase)) {
      heldOutTotal += 1;
      if (run.outcome === "complete") heldOutPassed += 1;
    }
  }
  // Reuse join: for every catalog entry, the later task receipts that ran
  // the kept manifest. An entry promoted inside the session orders after
  // its promoting task; an inherited entry predates the session.
  const reuse: SkillExperimentReuse[] = catalog.entries.map((entry, index) => {
    const inSession = promotedInSession.get(index);
    const seededTask = session.tasks.findIndex((task) => task.taskId === entry.taskId);
    const promoted = inSession?.taskIndex ?? (seededTask === -1 ? null : seededTask);
    const later = records.filter(({ run }, i) =>
      (promoted === null || i > promoted) &&
      run.receipt !== null &&
      run.manifest === entry.manifest &&
      receiptsRanManifest(entry.manifest).has(run.receipt));
    const heldOut = later.filter(({ run }) => HELD_OUT_PHASES.includes(run.phase));
    return {
      manifest: entry.manifest,
      entry: index,
      taskId: entry.taskId,
      promotedSequence: promoted,
      runs: later.map(({ run }) => run.receipt!),
      heldOutRuns: heldOut.map(({ run }) => run.receipt!),
    };
  });
  const passByReceipt = new Map<Digest, boolean>();
  for (const { run } of records) {
    if (run.receipt !== null) passByReceipt.set(run.receipt, run.outcome === "complete");
  }
  const holdoutGaps: SkillExperimentHoldoutGap[] = reuse
    .filter((entry) => promotedInSession.get(entry.entry)?.validation != null)
    .map((entry) => ({
      manifest: entry.manifest,
      validation: promotedInSession.get(entry.entry)!.validation!,
      heldOut: {
        passed: entry.heldOutRuns.filter((receipt) => passByReceipt.get(receipt) === true).length,
        total: entry.heldOutRuns.length,
      },
    }));
  return {
    accountOutcome: account.outcome,
    limits: account.limits,
    workTotal: account.charged.work,
    attemptsTotal: account.charged.attempts,
    runsTotal: account.charged.runs,
    tasksAttempted: records.length,
    tasksPassed,
    heldOutPassed,
    heldOutTotal,
    invalidTasks,
    exhaustedTasks,
    consultations: catalogHits + catalogMisses,
    catalogHits,
    catalogMisses,
    admissionFailures,
    keptEntries: catalog.entries.length,
    reusedEntries: reuse.filter((entry) => entry.runs.length > 0).length,
    reuse,
    holdoutGaps,
    records: session.tasks.map((task) => task.run),
  };
}

/** Load an arm's cited evidence for aggregation: the session, its account,
 * its catalog, and every task's run record in session order. Shared by the
 * rollup and the verifier. */
export async function loadExperimentArmEvidence(
  dir: string,
  sessionDigest: Digest,
): Promise<{
  session: ExperimentSession;
  records: { digest: Digest; run: ExperimentRun }[];
  catalog: ExperimentCatalog;
  account: HabitatBudget;
}> {
  const store = new FileStore(resolve(dir));
  const sessionValue = await store.getValue(sessionDigest);
  if (sessionValue === undefined) {
    throw new AlgalError("STORE_MISS", `skill experiment: session ${sessionDigest} is not in the store`);
  }
  const session = parseExperimentSession(sessionValue);
  const accountValue = await store.getValue(session.budget);
  if (accountValue === undefined) {
    throw new AlgalError("STORE_MISS", `skill experiment: arm ${session.arm}'s account ${session.budget} is not in the store`);
  }
  const account = parseHabitatBudget(accountValue);
  const catalogValue = await store.getValue(session.catalog);
  if (catalogValue === undefined) {
    throw new AlgalError("STORE_MISS", `skill experiment: arm ${session.arm}'s catalog ${session.catalog} is not in the store`);
  }
  const catalog = parseExperimentCatalog(catalogValue);
  const records: { digest: Digest; run: ExperimentRun }[] = [];
  for (const task of session.tasks) {
    const value = await store.getValue(task.run);
    if (value === undefined) {
      evidenceError(`task ${task.taskId}'s record ${task.run} is not in the store`);
    }
    records.push({ digest: task.run, run: parseExperimentRun(value) });
  }
  return { session, records, catalog, account };
}

/** Compute a study's per-arm aggregates from store evidence: rebuild the
 * derived program index, load each cited session's account, catalog, and
 * task records, reconcile the account against the store (ceilings are the
 * manifests' declared budgets; charges are the receipts' recorded work),
 * and join kept catalog manifests to later task receipts through the
 * index's receipts relation. Inconsistent evidence — a missing record, an
 * uncharged task run, a catalog index that does not resolve — fails the
 * rollup rather than producing a report it cannot support. */
export async function buildExperimentReport(dir: string, config: SkillExperimentConfig): Promise<SkillExperimentReport> {
  const root = resolve(dir);
  const index = await buildProgramIndex(root);
  const store = new FileStore(root);
  const receiptsByManifest = new Map<Digest, Set<Digest>>();
  // The reuse join resolves each task-cited receipt to the manifest it ran
  // through the index's receipts relation — bounded by the session's own
  // task count, not by the store's history.
  const joinReceipts = async (taskReceipts: Digest[]): Promise<void> => {
    const wanted = [...new Set(taskReceipts)].filter((receipt) => ![...receiptsByManifest.values()].some((set) => set.has(receipt)));
    for (let i = 0; i < wanted.length; i += SKILL_EXPERIMENT_BOUNDS.maxJoinChunk) {
      const chunk = wanted.slice(i, i + SKILL_EXPERIMENT_BOUNDS.maxJoinChunk);
      if (chunk.length === 0) break;
      const result = runProgramQuery(root, {
        table: "receipts",
        columns: ["digest", "manifest_digest"],
        where: [{ column: "digest", op: "in", value: chunk }],
        limit: chunk.length,
      });
      if (result.truncated) {
        throw new AlgalError("BUDGET_EXHAUSTED", "skill experiment: task receipt join exceeded the bounded index query");
      }
      for (const row of result.rows) {
        const manifest = row.manifest_digest as Digest;
        const set = receiptsByManifest.get(manifest) ?? new Set<Digest>();
        set.add(row.digest as Digest);
        receiptsByManifest.set(manifest, set);
      }
    }
  };
  const arms: SkillExperimentArm[] = [];
  const armNames = new Set<string>();
  for (const arm of config.arms) {
    const { session, records, catalog, account } = await loadExperimentArmEvidence(root, arm.session);
    if (armNames.has(session.arm)) {
      evidenceError(`two sessions claim arm ${session.arm}`);
    }
    armNames.add(session.arm);
    // The account itself must reconcile with the store: every charged
    // ceiling is its manifest's declared budget and every charge is the
    // work its stored receipt records.
    const accountCheck = await checkHabitatBudgetEvidence(account, store);
    if (accountCheck.mismatches.length > 0) {
      evidenceError(`arm ${session.arm}'s account does not reconcile with the store: ${accountCheck.mismatches[0]}`);
    }
    for (const { run } of records) {
      if (run.receipt === null) continue;
      const stored = await store.getReceipt(run.receipt);
      if (stored === undefined) {
        evidenceError(`task ${run.taskId}'s receipt ${run.receipt} is not in the store`);
      }
      const receipt = parseRunReceipt(stored);
      if (receipt.manifestDigest !== run.manifest) {
        evidenceError(`task ${run.taskId}'s receipt ran ${receipt.manifestDigest}, not ${run.manifest}`);
      }
    }
    await joinReceipts(records.map(({ run }) => run.receipt).filter((digest): digest is Digest => digest !== null));
    const aggregate = aggregateExperimentArm(
      session,
      records,
      catalog,
      account,
      (manifest) => receiptsByManifest.get(manifest) ?? new Set(),
    );
    arms.push({
      name: session.arm,
      family: session.family,
      session: arm.session,
      account: session.budget,
      catalog: session.catalog,
      ...aggregate,
    });
  }
  const base = {
    contract: SKILL_EXPERIMENT_CONTRACT,
    study: config.study,
    index: index.state.digest,
    arms,
  };
  if (canonicalBytes(base as unknown as JsonValue) > SKILL_EXPERIMENT_BOUNDS.maxBytes) {
    throw new AlgalError("BUDGET_EXHAUSTED", `skill experiment report exceeds ${SKILL_EXPERIMENT_BOUNDS.maxBytes} bytes`);
  }
  return { ...base, digest: digestCanonical(base as unknown as JsonValue) };
}

// -------------------------------------------------------------- render -----

function pad(value: string, width: number): string {
  return value.length >= width ? value : value + " ".repeat(width - value.length);
}

function ratio(part: number, whole: number): string {
  return `${part}/${whole}`;
}

function perSuccess(work: number, passed: number): string {
  return passed === 0 ? "-" : String(Math.round(work / passed));
}

/** The human summary table: one row per arm, the pre-registered measures as
 * columns, then each in-session promotion's validation-versus-held-out
 * counts. Rendered from the parsed report, so the numbers are exactly the
 * record's. */
export function renderExperimentReport(report: SkillExperimentReport): string {
  const lines: string[] = [];
  lines.push(`ALGAL skill experiment · study ${report.study} · ${report.arms.length} arm${report.arms.length === 1 ? "" : "s"}`);
  lines.push(`index ${report.index}`);
  lines.push("");
  const header = [
    pad("arm", 10),
    pad("tasks", 8),
    pad("held-out", 9),
    pad("work", 9),
    pad("work/pass", 9),
    pad("attempts", 8),
    pad("runs", 6),
    pad("catalog", 15),
    pad("reused", 8),
    "ended",
  ].join(" ").replace(/\s+$/, "");
  lines.push(header);
  for (const arm of report.arms) {
    const catalog = arm.consultations === 0
      ? "-"
      : `${arm.catalogHits}/${arm.catalogMisses}${arm.admissionFailures > 0 ? ` (${arm.admissionFailures} fail)` : ""}`;
    const reuse = arm.keptEntries === 0 ? "-" : `${arm.reusedEntries}/${arm.keptEntries}`;
    const ended = [arm.invalidTasks > 0 ? `${arm.invalidTasks} invalid` : "", arm.exhaustedTasks > 0 ? `${arm.exhaustedTasks} exhausted` : ""]
      .filter((part) => part !== "")
      .join("+");
    const row = [
      pad(arm.accountOutcome === "exhausted" ? `${arm.name}*` : arm.name, 10),
      pad(ratio(arm.tasksPassed, arm.tasksAttempted), 8),
      pad(ratio(arm.heldOutPassed, arm.heldOutTotal), 9),
      pad(String(arm.workTotal), 9),
      pad(perSuccess(arm.workTotal, arm.heldOutPassed), 9),
      pad(String(arm.attemptsTotal), 8),
      pad(String(arm.runsTotal), 6),
      pad(catalog, 15),
      pad(reuse, 8),
      ended === "" ? "-" : ended,
    ].join(" ").replace(/\s+$/, "");
    lines.push(row);
  }
  if (report.arms.some((arm) => arm.accountOutcome === "exhausted")) {
    lines.push("* account exhausted: a reservation was refused before the arm finished");
  }
  const gaps = report.arms.flatMap((arm) => arm.holdoutGaps.map((gap) => ({ arm: arm.name, gap })));
  if (gaps.length > 0) {
    lines.push("");
    lines.push("validation vs held-out per promoted procedure:");
    for (const { arm, gap } of gaps) {
      lines.push(`  ${arm} ${gap.manifest} validation ${ratio(gap.validation.passed, gap.validation.total)} held-out ${ratio(gap.heldOut.passed, gap.heldOut.total)}`);
    }
  }
  return `${lines.join("\n")}\n`;
}
