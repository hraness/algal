/** Cumulative-skill experiment arm-runner: host tooling that runs one bounded
 * task set through one arm configuration and records everything in the store.
 * The four arms share one code path and differ only in which hooks the arm
 * kind enables:
 *
 * - `retained`: a catalog-consult hook before each task (the last kept
 *   procedure matching the arm's declared family signature runs again, its
 *   manifest digest-resolved through the store) and a promote hook after each
 *   task (the program is evaluated through the ordinary foundry path on the
 *   arm's declared train/validation cases — holdout cases are declared but
 *   never run — and a candidate that passes every validation case is added to
 *   the catalog with its recorded cases).
 * - `ablation`: identical machinery with both hooks disabled. Every task
 *   generates and runs fresh under the same budget.
 * - `fresh`: one generation produces a manifest per task; no consult, no
 *   evaluation loop, no catalog writes.
 * - `fixed`: one declared manifest runs every task.
 *
 * Every run — generation, the task itself, and promotion evaluation — is an
 * ordinary `runOrganism` run with an ordinary receipt, admitted through the
 * arm's own `algal.habitat-budget.v1` account (activity `experiment`), so
 * generation, evaluation, promotion, and task runs all charge to the same
 * account. The first refused reservation is terminal: it is recorded on the
 * account and on the run record, and the session ends `exhausted` rather than
 * aborting.
 *
 * Records: one bounded `algal.experiment-run.v1` per task, one
 * `algal.experiment-catalog.v1` per session (the kept-procedure list), and one
 * `algal.experiment-session.v1` per arm joining them. All are closed,
 * digest-bearing, and carry no wall-clock values. */
import { parseOrganismManifest, type OrganismManifest } from "./contract";
import { asDigest, digestCanonical, type Digest } from "./digest";
import type { Executor } from "./effects";
import { AlgalError } from "./errors";
import { parseExprScorer, type ExprScorer } from "./expr";
import { evaluateFoundryPopulation, FOUNDRY_BOUNDS, type FoundryCase } from "./foundry";
import {
  HabitatAccount,
  parseHabitatLimits,
  type HabitatLedger,
  type HabitatLimits,
} from "./habitat-budget";
import type { FnRegistry } from "./registry";
import type { RunOutcome, RunReceipt } from "./run";
import { runOrganism } from "./run";
import { boundedJsonSnapshot } from "./source-dependencies";
import type { Store } from "./store-contract";
import type { Transport } from "./transport-contract";
import type { ToolRegistry } from "./tools";
import {
  asInt,
  asObject,
  noUnknownKeys,
  type JsonValue,
} from "./values";

export const EXPERIMENT_ARM_CONTRACT = "algal.experiment-arm.v1" as const;
export const EXPERIMENT_TASKS_CONTRACT = "algal.experiment-tasks.v1" as const;
export const EXPERIMENT_CATALOG_CONTRACT = "algal.experiment-catalog.v1" as const;
export const EXPERIMENT_RUN_CONTRACT = "algal.experiment-run.v1" as const;
export const EXPERIMENT_SESSION_CONTRACT = "algal.experiment-session.v1" as const;

export const EXPERIMENT_BOUNDS = Object.freeze({
  /** Tasks in one set; the pre-registered study uses 20. */
  maxTasks: 64,
  maxTaskIdLength: 128,
  maxFamilyLength: 64,
  /** Kept procedures in one catalog. */
  maxCatalogEntries: 32,
  /** Promotion-evaluation cases; the foundry case bound. */
  maxCases: FOUNDRY_BOUNDS.maxCases,
  /** Recorded failure message length. */
  maxFailureLength: 512,
  /** Snapshot limits for a task's opaque `spec` or one argument value. */
  spec: Object.freeze({ maxBytes: 65_536, maxDepth: 32, maxNodes: 16_384, maxEntries: 16_384, maxStringBytes: 65_536 }),
  /** Snapshot limits for a foreign record value. */
  record: Object.freeze({ maxBytes: 262_144, maxDepth: 8, maxNodes: 8_192, maxEntries: 4_096, maxStringBytes: 4_096 }),
});

export const EXPERIMENT_ARMS = ["retained", "ablation", "fresh", "fixed"] as const;
export type ExperimentArmKind = (typeof EXPERIMENT_ARMS)[number];
export const EXPERIMENT_PHASES = ["acquisition", "unseen", "shift"] as const;
export type ExperimentPhase = (typeof EXPERIMENT_PHASES)[number];

function fail(message: string): never {
  throw new AlgalError("PARSE_FAILED", `experiment: ${message}`);
}

/** Closed record: unknown keys rejected, every listed field required. Optional
 * fields are not listed — callers read them through `opt` after the shape
 * check and parse them when present. */
function closed(value: unknown, required: readonly string[], optional: readonly string[], at: string): Record<string, unknown> {
  const object = asObject(value, `experiment ${at}`);
  noUnknownKeys(object, [...required, ...optional], `experiment ${at}`);
  for (const key of required) {
    if (!Object.hasOwn(object, key)) fail(`${at} is missing "${key}"`);
  }
  return object;
}

function opt(object: Record<string, unknown>, key: string): { present: boolean; value: unknown } {
  return Object.hasOwn(object, key) ? { present: true, value: object[key] } : { present: false, value: undefined };
}

function count(value: unknown, min: number, max: number, at: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < min || value > max) {
    fail(`${at} must be an integer in ${min}..${max}`);
  }
  return value;
}

function reference(value: unknown, at: string): Digest {
  return asDigest(value, `experiment ${at}`);
}

function nullableRef(value: unknown, at: string): Digest | null {
  return value === null ? null : reference(value, at);
}

function label(value: unknown, at: string, max: number = EXPERIMENT_BOUNDS.maxTaskIdLength): string {
  if (typeof value !== "string" || value.length === 0 || value.length > max || [...value].some(c => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127)) {
    fail(`${at} must be a printable string of 1..${max} characters`);
  }
  return value;
}

function armKind(value: unknown, at: string): ExperimentArmKind {
  if (!(EXPERIMENT_ARMS as readonly unknown[]).includes(value)) fail(`${at} must be one of ${EXPERIMENT_ARMS.join(", ")}`);
  return value as ExperimentArmKind;
}

function phase(value: unknown, at: string): ExperimentPhase {
  if (!(EXPERIMENT_PHASES as readonly unknown[]).includes(value)) fail(`${at} must be one of ${EXPERIMENT_PHASES.join(", ")}`);
  return value as ExperimentPhase;
}

/** A bounded named-value map (task args, case args, expectations). */
function valueMap(value: unknown, at: string): Record<string, JsonValue> {
  const object = asObject(boundedJsonSnapshot(value, EXPERIMENT_BOUNDS.spec, at), `experiment ${at}`);
  const out: Record<string, JsonValue> = {};
  for (const [name, item] of Object.entries(object)) {
    if (name.length === 0 || name.length > EXPERIMENT_BOUNDS.maxTaskIdLength) fail(`${at} has an over-long key`);
    out[name] = item;
  }
  return out;
}

// ------------------------------------------------------------ task spec ---

/** The runner's minimal task record: `spec` is the opaque task description the
 * generation path receives (bounded JSON, shape owned by the task set), and
 * `args` is the interface-input-keyed argument map both the consult-hit and
 * generation paths map through the executed manifest's interface. */
export type ExperimentTask = {
  taskId: string;
  phase: ExperimentPhase;
  spec: JsonValue;
  args: Record<string, JsonValue>;
};

export type ExperimentTaskSet = {
  contract: typeof EXPERIMENT_TASKS_CONTRACT;
  tasks: ExperimentTask[];
};

export function parseExperimentTask(value: unknown, at = "task"): ExperimentTask {
  const raw = asObject(value, `experiment ${at}`);
  // `spec` and `args` carry task data that nests legitimately past the shared
  // record depth; each re-parses under the deeper `spec` bound.
  const shallow: Record<string, unknown> = { ...raw };
  for (const key of ["spec", "args"] as const) {
    if (Object.hasOwn(shallow, key)) shallow[key] = true;
  }
  const v = closed(boundedJsonSnapshot(shallow, EXPERIMENT_BOUNDS.record, at), ["taskId", "phase", "spec", "args"], [], at);
  return {
    taskId: label(v.taskId, `${at}.taskId`),
    phase: phase(v.phase, `${at}.phase`),
    spec: boundedJsonSnapshot(raw.spec, EXPERIMENT_BOUNDS.spec, `${at}.spec`),
    args: valueMap(raw.args, `${at}.args`),
  };
}

export function parseExperimentTaskSet(value: unknown): ExperimentTaskSet {
  const raw = asObject(value, "experiment task set");
  const shallow: Record<string, unknown> = { ...raw };
  if (Object.hasOwn(shallow, "tasks")) shallow.tasks = true;
  const v = closed(boundedJsonSnapshot(shallow, EXPERIMENT_BOUNDS.record, "task set"), ["contract", "tasks"], [], "task set");
  if (v.contract !== EXPERIMENT_TASKS_CONTRACT) fail(`contract must be ${EXPERIMENT_TASKS_CONTRACT}`);
  if (!Array.isArray(raw.tasks) || raw.tasks.length === 0 || raw.tasks.length > EXPERIMENT_BOUNDS.maxTasks) {
    fail(`tasks must list 1..${EXPERIMENT_BOUNDS.maxTasks} entries`);
  }
  const ids = new Set<string>();
  const tasks = raw.tasks.map((entry, i) => {
    const task = parseExperimentTask(entry, `tasks[${i}]`);
    if (ids.has(task.taskId)) fail(`tasks[${i}] repeats taskId "${task.taskId}"`);
    ids.add(task.taskId);
    return task;
  });
  return { contract: EXPERIMENT_TASKS_CONTRACT, tasks };
}

// ------------------------------------------------------------ arm config ---

/** The generation manifest a non-fixed arm runs per task: its interface input
 * `task` receives the task's `spec`, and the declared interface output emits
 * one complete manifest (with `field` selecting it from an object output). */
export type ExperimentGenerator = {
  manifest: OrganismManifest;
  output: string;
  field?: string;
  /** Extra interface-input-keyed arguments merged beside `task`. */
  args?: Record<string, JsonValue>;
};

export type ExperimentArm = {
  contract: typeof EXPERIMENT_ARM_CONTRACT;
  arm: ExperimentArmKind;
  /** Family signature the consult hook matches catalog entries against. */
  family: string;
  /** The arm's own habitat account ceilings; every run charges to it. */
  budget: HabitatLimits;
  /** Required for retained, ablation, and fresh. */
  generator?: ExperimentGenerator;
  /** Required for fixed: the declared manifest every task runs. */
  manifest?: OrganismManifest;
  /** Required for retained: train/validation/holdout cases the promote hook
   * evaluates through the foundry path (holdout is declared but never run). */
  cases?: FoundryCase[];
  scorer?: ExprScorer;
  /** Catalog bound; defaults to `maxCatalogEntries`. */
  maxEntries?: number;
};

function parseGenerator(value: unknown, at: string): ExperimentGenerator {
  const raw = asObject(value, `experiment ${at}`);
  const shallow: Record<string, unknown> = { ...raw };
  if (Object.hasOwn(shallow, "manifest")) shallow.manifest = true;
  const v = closed(boundedJsonSnapshot(shallow, EXPERIMENT_BOUNDS.record, at), ["manifest", "output"], ["field", "args"], at);
  const generator: ExperimentGenerator = {
    manifest: parseOrganismManifest(raw.manifest),
    output: label(v.output, `${at}.output`, EXPERIMENT_BOUNDS.maxFamilyLength),
  };
  const field = opt(v, "field");
  if (field.present) generator.field = label(field.value, `${at}.field`, EXPERIMENT_BOUNDS.maxFamilyLength);
  if (raw.args !== undefined) generator.args = valueMap(raw.args, `${at}.args`);
  return generator;
}

function parseFoundryCase(value: unknown, at: string): FoundryCase {
  const v = closed(boundedJsonSnapshot(value, EXPERIMENT_BOUNDS.record, at), ["id", "split", "args", "expect"], [], at);
  if (v.split !== "train" && v.split !== "validation" && v.split !== "holdout") fail(`${at}.split must be train, validation, or holdout`);
  return {
    id: label(v.id, `${at}.id`, FOUNDRY_BOUNDS.maxCaseIdLen),
    split: v.split,
    args: valueMap(v.args, `${at}.args`),
    expect: valueMap(v.expect, `${at}.expect`),
  };
}

/** Parse a closed `algal.experiment-arm.v1` record. Manifests arrive as inline
 * manifest JSON; a caller that reads paths resolves them before parsing. */
export function parseExperimentArm(value: unknown): ExperimentArm {
  const raw = asObject(value, "experiment arm");
  // Manifest, generator, case, and scorer subtrees carry their own bounds
  // (organism manifests legitimately nest past the shared record depth), so
  // the shared snapshot only checks this record's own shape.
  const shallow: Record<string, unknown> = { ...raw };
  for (const key of ["generator", "manifest", "cases", "scorer"] as const) {
    if (Object.hasOwn(shallow, key)) shallow[key] = true;
  }
  const v = closed(boundedJsonSnapshot(shallow, EXPERIMENT_BOUNDS.record, "arm"), ["contract", "arm", "family", "budget"], ["generator", "manifest", "cases", "scorer", "maxEntries"], "arm");
  if (v.contract !== EXPERIMENT_ARM_CONTRACT) fail(`contract must be ${EXPERIMENT_ARM_CONTRACT}`);
  const arm: ExperimentArm = {
    contract: EXPERIMENT_ARM_CONTRACT,
    arm: armKind(v.arm, "arm.arm"),
    family: label(v.family, "arm.family", EXPERIMENT_BOUNDS.maxFamilyLength),
    budget: parseHabitatLimits(v.budget),
  };
  if (raw.generator !== undefined) arm.generator = parseGenerator(raw.generator, "arm.generator");
  if (raw.manifest !== undefined) arm.manifest = parseOrganismManifest(raw.manifest);
  if (raw.cases !== undefined) {
    if (!Array.isArray(raw.cases) || raw.cases.length === 0 || raw.cases.length > EXPERIMENT_BOUNDS.maxCases) {
      fail(`arm.cases must list 1..${EXPERIMENT_BOUNDS.maxCases} entries`);
    }
    arm.cases = raw.cases.map((entry, i) => parseFoundryCase(entry, `arm.cases[${i}]`));
  }
  if (raw.scorer !== undefined) arm.scorer = parseExprScorer(raw.scorer, "arm.scorer");
  const maxEntries = opt(v, "maxEntries");
  if (maxEntries.present) arm.maxEntries = asInt(maxEntries.value, "arm.maxEntries", 1, EXPERIMENT_BOUNDS.maxCatalogEntries);

  if (arm.arm === "fixed") {
    if (arm.manifest === undefined) fail("a fixed arm requires manifest");
    if (arm.generator !== undefined) fail("a fixed arm declares no generator");
  } else {
    if (arm.manifest !== undefined) fail(`a ${arm.arm} arm declares no manifest`);
    if (arm.generator === undefined) fail(`a ${arm.arm} arm requires a generator`);
    const iface = arm.generator.manifest.interface;
    if (iface === undefined) fail(`a ${arm.arm} generator must declare an interface`);
    if (iface.inputs.task === undefined) fail(`a ${arm.arm} generator needs a "task" interface input`);
    if (iface.outputs[arm.generator.output] === undefined) {
      fail(`a ${arm.arm} generator has no interface output "${arm.generator.output}"`);
    }
    for (const name of Object.keys(arm.generator.args ?? {})) {
      if (iface.inputs[name] === undefined) fail(`arm.generator.args names unknown interface input "${name}"`);
    }
  }
  if (arm.arm === "retained") {
    if (arm.cases === undefined) fail("a retained arm requires promotion cases");
    for (const split of ["train", "validation", "holdout"] as const) {
      if (!arm.cases.some(c => c.split === split)) fail(`a retained arm needs at least one ${split} case`);
    }
  } else {
    if (arm.cases !== undefined) fail(`a ${arm.arm} arm declares no cases`);
    if (arm.scorer !== undefined) fail(`a ${arm.arm} arm declares no scorer`);
  }
  return arm;
}

// --------------------------------------------------------------- catalog ---

/** One kept procedure: the manifest that qualified, the interface and cases it
 * qualified under, and the stored evaluation that promoted it. */
export type ExperimentCatalogEntry = {
  family: string;
  manifest: Digest;
  interfaceDigest: Digest | null;
  cases: { id: string; split: "train" | "validation" }[];
  /** Digest of the stored promotion-evaluation evidence value. */
  report: Digest;
  taskId: string;
};

export type ExperimentCatalog = {
  contract: typeof EXPERIMENT_CATALOG_CONTRACT;
  entries: ExperimentCatalogEntry[];
};

function parseCatalogCase(value: unknown, at: string): ExperimentCatalogEntry["cases"][number] {
  const v = closed(value, ["id", "split"], [], at);
  if (v.split !== "train" && v.split !== "validation") fail(`${at}.split must be train or validation`);
  return { id: label(v.id, `${at}.id`, FOUNDRY_BOUNDS.maxCaseIdLen), split: v.split };
}

function parseCatalogEntry(value: unknown, at: string): ExperimentCatalogEntry {
  const v = closed(value, ["family", "manifest", "interfaceDigest", "cases", "report", "taskId"], [], at);
  if (!Array.isArray(v.cases) || v.cases.length === 0 || v.cases.length > EXPERIMENT_BOUNDS.maxCases) fail(`${at}.cases must list 1..${EXPERIMENT_BOUNDS.maxCases} entries`);
  return {
    family: label(v.family, `${at}.family`, EXPERIMENT_BOUNDS.maxFamilyLength),
    manifest: reference(v.manifest, `${at}.manifest`),
    interfaceDigest: nullableRef(v.interfaceDigest, `${at}.interfaceDigest`),
    cases: v.cases.map((raw, i) => parseCatalogCase(raw, `${at}.cases[${i}]`)),
    report: reference(v.report, `${at}.report`),
    taskId: label(v.taskId, `${at}.taskId`),
  };
}

export function parseExperimentCatalog(value: unknown): ExperimentCatalog {
  const v = closed(boundedJsonSnapshot(value, EXPERIMENT_BOUNDS.record, "catalog"), ["contract", "entries"], [], "catalog");
  if (v.contract !== EXPERIMENT_CATALOG_CONTRACT) fail(`contract must be ${EXPERIMENT_CATALOG_CONTRACT}`);
  if (!Array.isArray(v.entries) || v.entries.length > EXPERIMENT_BOUNDS.maxCatalogEntries) fail(`entries must list at most ${EXPERIMENT_BOUNDS.maxCatalogEntries}`);
  return { contract: EXPERIMENT_CATALOG_CONTRACT, entries: v.entries.map((raw, i) => parseCatalogEntry(raw, `entries[${i}]`)) };
}

/** The session's kept-procedure list. `consult` is a pure lookup by declared
 * family signature — the last promoted entry wins, matching "reuse or
 * deliberately revise a kept procedure" recency — and `add` appends a new
 * entry once the promote hook's candidate passes every validation case. */
export class ExperimentCatalogState {
  readonly #entries: ExperimentCatalogEntry[];
  readonly #maxEntries: number;

  constructor(seed: readonly ExperimentCatalogEntry[] = [], maxEntries: number = EXPERIMENT_BOUNDS.maxCatalogEntries) {
    this.#maxEntries = asInt(maxEntries, "maxEntries", 1, EXPERIMENT_BOUNDS.maxCatalogEntries);
    if (seed.length > this.#maxEntries) fail(`catalog seed exceeds ${this.#maxEntries} entries`);
    this.#entries = [...seed];
  }

  get entries(): readonly ExperimentCatalogEntry[] {
    return this.#entries;
  }

  /** The most recently promoted entry matching `family`, or undefined. */
  consult(family: string): ExperimentCatalogEntry | undefined {
    for (let i = this.#entries.length - 1; i >= 0; i--) {
      if (this.#entries[i]!.family === family) return this.#entries[i];
    }
    return undefined;
  }

  /** True when `manifest` is already kept; re-promotion of the same program
   * is evaluated and recorded but does not duplicate the entry. */
  kept(manifest: Digest): boolean {
    return this.#entries.some(entry => entry.manifest === manifest);
  }

  add(entry: ExperimentCatalogEntry): number {
    if (this.#entries.length >= this.#maxEntries) fail(`catalog exceeds ${this.#maxEntries} entries`);
    this.#entries.push(entry);
    return this.#entries.length - 1;
  }

  record(): ExperimentCatalog {
    return parseExperimentCatalog({ contract: EXPERIMENT_CATALOG_CONTRACT, entries: this.#entries });
  }
}

// ---------------------------------------------------------------- records ---

export type ExperimentConsult = {
  outcome: "hit" | "miss" | "disabled";
  /** Catalog index consulted on a hit; null otherwise. */
  entry: number | null;
  /** The kept manifest a hit resolved to; null otherwise. */
  manifest: Digest | null;
};

export type ExperimentPromote = {
  evaluated: boolean;
  /** True when this run added a catalog entry. */
  promoted: boolean;
  /** Stored promotion-evaluation evidence digest; null when not evaluated. */
  report: Digest | null;
  /** The catalog index added; null when nothing was added. */
  entry: number | null;
  validation: { passed: number; total: number } | null;
};

/** One task's outcome. Every referenced record is stored; a run that never
 * produced a manifest or receipt records nulls there, and `outcome` says why:
 * an ordinary `RunOutcome`, `exhausted` when the account refused the run, or
 * `invalid` when the harness could not build a valid run (bad generated
 * manifest, an interface the task's args do not fit, a missing kept entry). */
export type ExperimentRun = {
  contract: typeof EXPERIMENT_RUN_CONTRACT;
  arm: ExperimentArmKind;
  taskId: string;
  phase: ExperimentPhase;
  consult: ExperimentConsult;
  /** The generation run, when this task generated its manifest. */
  generator: { manifest: Digest; receipt: Digest } | null;
  /** The executed manifest's digest; null when none was produced. */
  manifest: Digest | null;
  /** Digest of the stored run arguments; null when the run never admitted. */
  args: Digest | null;
  receipt: Digest | null;
  outcome: RunOutcome | "exhausted" | "invalid";
  work: { units: number; agentCalls: number };
  failure: { code: string; message: string } | null;
  promote: ExperimentPromote | null;
};

function parseConsult(value: unknown, at: string): ExperimentConsult {
  const v = closed(value, ["outcome", "entry", "manifest"], [], at);
  if (v.outcome !== "hit" && v.outcome !== "miss" && v.outcome !== "disabled") fail(`${at}.outcome must be hit, miss, or disabled`);
  const outcome = v.outcome;
  const entry = v.entry === null ? null : count(v.entry, 0, EXPERIMENT_BOUNDS.maxCatalogEntries - 1, `${at}.entry`);
  const manifest = nullableRef(v.manifest, `${at}.manifest`);
  if (outcome === "hit" && (entry === null || manifest === null)) fail(`${at}: a hit needs an entry and a manifest`);
  if (outcome !== "hit" && (entry !== null || manifest !== null)) fail(`${at}: only a hit records an entry and manifest`);
  return { outcome, entry, manifest };
}

function parsePromote(value: unknown, at: string): ExperimentPromote {
  const v = closed(value, ["evaluated", "promoted", "report", "entry", "validation"], [], at);
  if (typeof v.evaluated !== "boolean" || typeof v.promoted !== "boolean") fail(`${at} flags must be boolean`);
  const report = nullableRef(v.report, `${at}.report`);
  const entry = v.entry === null ? null : count(v.entry, 0, EXPERIMENT_BOUNDS.maxCatalogEntries - 1, `${at}.entry`);
  let validation: ExperimentPromote["validation"] = null;
  if (v.validation !== null) {
    const score = closed(v.validation, ["passed", "total"], [], `${at}.validation`);
    const total = count(score.total, 1, EXPERIMENT_BOUNDS.maxCases, `${at}.validation.total`);
    validation = { passed: count(score.passed, 0, total, `${at}.validation.passed`), total };
  }
  if (v.promoted && (entry === null || report === null)) fail(`${at}: a promotion needs an entry and a report`);
  if (v.evaluated && (report === null || validation === null)) fail(`${at}: an evaluation needs a report and a validation score`);
  return { evaluated: v.evaluated, promoted: v.promoted, report, entry, validation };
}

export function parseExperimentRun(value: unknown): ExperimentRun {
  const at = "run";
  const v = closed(boundedJsonSnapshot(value, EXPERIMENT_BOUNDS.record, at), ["contract", "arm", "taskId", "phase", "consult", "generator", "manifest", "args", "receipt", "outcome", "work", "failure", "promote"], [], at);
  if (v.contract !== EXPERIMENT_RUN_CONTRACT) fail(`contract must be ${EXPERIMENT_RUN_CONTRACT}`);
  let generator: ExperimentRun["generator"] = null;
  if (v.generator !== null) {
    const g = closed(v.generator, ["manifest", "receipt"], [], `${at}.generator`);
    generator = { manifest: reference(g.manifest, `${at}.generator.manifest`), receipt: reference(g.receipt, `${at}.generator.receipt`) };
  }
  const outcomes = ["complete", "failed", "stuck", "suspended", "exhausted", "invalid"];
  if (!outcomes.includes(v.outcome as string)) fail(`${at}.outcome must be one of ${outcomes.join(", ")}`);
  const outcome = v.outcome as ExperimentRun["outcome"];
  const work = closed(v.work, ["units", "agentCalls"], [], `${at}.work`);
  let failure: ExperimentRun["failure"] = null;
  if (v.failure !== null) {
    const f = closed(v.failure, ["code", "message"], [], `${at}.failure`);
    failure = {
      code: label(f.code, `${at}.failure.code`, 64),
      message: label(f.message, `${at}.failure.message`, EXPERIMENT_BOUNDS.maxFailureLength),
    };
  }
  const manifest = nullableRef(v.manifest, `${at}.manifest`);
  const args = nullableRef(v.args, `${at}.args`);
  const receipt = nullableRef(v.receipt, `${at}.receipt`);
  if (outcome === "complete" || outcome === "failed" || outcome === "stuck" || outcome === "suspended") {
    if (manifest === null || receipt === null) fail(`${at}: a finished run needs a manifest and a receipt`);
  }
  return {
    contract: EXPERIMENT_RUN_CONTRACT,
    arm: armKind(v.arm, `${at}.arm`),
    taskId: label(v.taskId, `${at}.taskId`),
    phase: phase(v.phase, `${at}.phase`),
    consult: parseConsult(v.consult, `${at}.consult`),
    generator,
    manifest,
    args,
    receipt,
    outcome,
    work: {
      units: count(work.units, 0, Number.MAX_SAFE_INTEGER, `${at}.work.units`),
      agentCalls: count(work.agentCalls, 0, Number.MAX_SAFE_INTEGER, `${at}.work.agentCalls`),
    },
    failure,
    promote: v.promote === null ? null : parsePromote(v.promote, `${at}.promote`),
  };
}

/** The per-arm record: each task's run record in task order, the arm's closed
 * habitat account, and the catalog the session ended with. */
export type ExperimentSession = {
  contract: typeof EXPERIMENT_SESSION_CONTRACT;
  arm: ExperimentArmKind;
  family: string;
  tasks: { taskId: string; phase: ExperimentPhase; run: Digest }[];
  /** Digest of the stored `algal.habitat-budget.v1` account. */
  budget: Digest;
  /** Digest of the stored `algal.experiment-catalog.v1` record. */
  catalog: Digest;
  outcome: "complete" | "exhausted";
};

export function parseExperimentSession(value: unknown): ExperimentSession {
  const at = "session";
  const v = closed(boundedJsonSnapshot(value, EXPERIMENT_BOUNDS.record, at), ["contract", "arm", "family", "tasks", "budget", "catalog", "outcome"], [], at);
  if (v.contract !== EXPERIMENT_SESSION_CONTRACT) fail(`contract must be ${EXPERIMENT_SESSION_CONTRACT}`);
  if (!Array.isArray(v.tasks) || v.tasks.length > EXPERIMENT_BOUNDS.maxTasks) fail(`tasks must list at most ${EXPERIMENT_BOUNDS.maxTasks}`);
  const tasks = v.tasks.map((raw, i) => {
    const t = closed(raw, ["taskId", "phase", "run"], [], `${at}.tasks[${i}]`);
    return { taskId: label(t.taskId, `${at}.tasks[${i}].taskId`), phase: phase(t.phase, `${at}.tasks[${i}].phase`), run: reference(t.run, `${at}.tasks[${i}].run`) };
  });
  if (v.outcome !== "complete" && v.outcome !== "exhausted") fail(`${at}.outcome must be complete or exhausted`);
  return {
    contract: EXPERIMENT_SESSION_CONTRACT,
    arm: armKind(v.arm, `${at}.arm`),
    family: label(v.family, `${at}.family`, EXPERIMENT_BOUNDS.maxFamilyLength),
    tasks,
    budget: reference(v.budget, `${at}.budget`),
    catalog: reference(v.catalog, `${at}.catalog`),
    outcome: v.outcome,
  };
}

// ---------------------------------------------------------------- engine ---

export type ExperimentTaskContext = {
  arm: ExperimentArm;
  task: ExperimentTask;
  store: Store;
  fns: FnRegistry;
  executors: Executor[];
  transports?: Record<string, Transport>;
  tools?: ToolRegistry;
  /** The arm's account; a host `runTask` admits its own runs through it. */
  account: HabitatLedger;
};

/** The task-mapping result: either a manifest with its mapped arguments, or a
 * `failure` when the mapping could not produce a runnable program — the
 * generation run's references stay attached either way, so a generator that
 * charged the account and then failed is still joined in the record. */
export type ExperimentRunTaskResult =
  | {
    manifest: OrganismManifest;
    args: Record<string, Record<string, JsonValue>>;
    /** The generation run that produced the manifest, when one ran. */
    generator?: { manifest: Digest; receipt: Digest };
  }
  | {
    failure: { code: string; message: string };
    generator?: { manifest: Digest; receipt: Digest };
  };

export type ExperimentRunTask = (ctx: ExperimentTaskContext) => Promise<ExperimentRunTaskResult>;

export type ExperimentRunOptions = {
  arm: ExperimentArm;
  tasks: ExperimentTask[];
  fns: FnRegistry;
  store: Store;
  executors: Executor[];
  transports?: Record<string, Transport>;
  tools?: ToolRegistry;
  /** Kept entries the catalog starts with, for sessions that resume retention. */
  catalog?: ExperimentCatalogEntry[];
  /** Host override for the task-to-manifest mapping; the default runs the
   * arm's generator (or serves the fixed arm's declared manifest). */
  runTask?: ExperimentRunTask;
};

export type ExperimentRunResult = {
  session: ExperimentSession;
  sessionDigest: Digest;
  runs: ExperimentRun[];
  runDigests: Digest[];
  catalog: ExperimentCatalog;
  catalogDigest: Digest;
};

const exhausted = (error: unknown): boolean => error instanceof AlgalError && error.code === "BUDGET_EXHAUSTED";

const truncate = (value: string, max: number): string => [...value].slice(0, max).join("");

function failureOf(error: unknown): { code: string; message: string } {
  const code = error instanceof AlgalError ? error.code : "INTERNAL";
  const message = error instanceof Error ? error.message : String(error);
  return { code: truncate(code, 64), message: truncate(message, EXPERIMENT_BOUNDS.maxFailureLength) };
}

/** Maps interface-input-keyed args through the executed manifest's declared
 * interface. An input name the manifest does not declare is an admission
 * failure — for a catalog hit that is "a vendored procedure that failed
 * admission on reuse". */
function interfaceArgs(manifest: OrganismManifest, args: Record<string, JsonValue>): Record<string, Record<string, JsonValue>> {
  const inputs = manifest.interface?.inputs;
  if (inputs === undefined) throw new AlgalError("PARSE_FAILED", `experiment: manifest ${manifest.key} declares no interface inputs`);
  const out: Record<string, Record<string, JsonValue>> = {};
  for (const [name, value] of Object.entries(args)) {
    const target = inputs[name];
    if (target === undefined) throw new AlgalError("PARSE_FAILED", `experiment: manifest ${manifest.key} has no interface input "${name}"`);
    (out[target.cell] ??= {})[target.port] = value;
  }
  return out;
}

/** The default task mapping: `fixed` serves its declared manifest; every other
 * arm runs the generator through the arm's account and parses the emitted
 * manifest with `parseOrganismManifest`. A generator that ran and charged but
 * did not emit a valid manifest returns a `failure` result carrying the
 * generation run's references. */
async function defaultRunTask(ctx: ExperimentTaskContext): Promise<ExperimentRunTaskResult> {
  const { arm, task } = ctx;
  if (arm.arm === "fixed") {
    const manifest = arm.manifest!;
    return { manifest, args: interfaceArgs(manifest, task.args) };
  }
  const generator = arm.generator!;
  const genArgs = interfaceArgs(generator.manifest, { ...(generator.args ?? {}), task: task.spec });
  const generatorDigest = await ctx.store.putManifest(generator.manifest);
  const { receipt, receiptDigest } = await ctx.account.admit(
    { manifest: generatorDigest, budgets: generator.manifest.budgets, args: genArgs },
    () => runOrganism({
      manifest: generator.manifest,
      args: genArgs,
      fns: ctx.fns,
      store: ctx.store,
      executors: ctx.executors,
      ...(ctx.transports ? { transports: ctx.transports } : {}),
      ...(ctx.tools ? { tools: ctx.tools } : {}),
    }),
    ctx.store,
  );
  const lineage = { manifest: generatorDigest, receipt: receiptDigest };
  if (receipt.outcome !== "complete") {
    return { failure: { code: "RUN_FAILED", message: `generator ${generator.manifest.key} ended ${receipt.outcome}` }, generator: lineage };
  }
  const source = generator.manifest.interface!.outputs[generator.output]!;
  const output = receipt.cells[source.cell]?.outputs?.[source.port];
  const value = generator.field !== undefined && output !== null && typeof output === "object" && !Array.isArray(output)
    ? output[generator.field]
    : output;
  try {
    const manifest = parseOrganismManifest(value);
    return { manifest, args: interfaceArgs(manifest, task.args), generator: lineage };
  } catch (error) {
    return { failure: failureOf(error), generator: lineage };
  }
}

/** The promote hook: the task's manifest is evaluated through the ordinary
 * foundry path on the arm's declared cases — train and validation run and
 * charge to the account, holdout is declared but never touched — and a
 * candidate that passes every validation case joins the catalog. */
async function promoteHook(
  ctx: ExperimentTaskContext,
  manifest: OrganismManifest,
  manifestDigest: Digest,
  catalog: ExperimentCatalogState,
): Promise<ExperimentPromote> {
  const arm = ctx.arm;
  const selection = await evaluateFoundryPopulation({
    candidates: [manifest],
    cases: arm.cases!,
    fns: ctx.fns,
    store: ctx.store,
    executors: ctx.executors,
    ...(ctx.transports ? { transports: ctx.transports } : {}),
    ...(ctx.tools ? { tools: ctx.tools } : {}),
    ...(arm.scorer ? { scorer: arm.scorer } : {}),
    account: ctx.account,
  });
  const candidate = selection.candidates[0]!;
  const report = await ctx.store.putValue(selection as unknown as JsonValue);
  const validation = { passed: candidate.validation.passed, total: candidate.validation.total };
  const passing = candidate.validation.passed === candidate.validation.total;
  if (passing && !catalog.kept(manifestDigest)) {
    const entry = catalog.add({
      family: arm.family,
      manifest: manifestDigest,
      interfaceDigest: manifest.interface !== undefined ? digestCanonical(manifest.interface as unknown as JsonValue) : null,
      cases: arm.cases!.flatMap((c): { id: string; split: "train" | "validation" }[] =>
        c.split === "holdout" ? [] : [{ id: c.id, split: c.split }]),
      report,
      taskId: ctx.task.taskId,
    });
    return { evaluated: true, promoted: true, report, entry, validation };
  }
  return { evaluated: true, promoted: false, report, entry: null, validation };
}

/** Runs one arm configuration over the task set and records everything.
 * Never throws on an exhausted account or an invalid task: those land on the
 * run and session records. Other host failures (store IO, registry holes)
 * propagate. */
export async function runExperimentArm(opts: ExperimentRunOptions): Promise<ExperimentRunResult> {
  const arm = opts.arm;
  if (arm.arm === "fixed") {
    if (arm.manifest === undefined) fail("a fixed arm requires manifest");
  } else {
    if (arm.generator === undefined) fail(`a ${arm.arm} arm requires a generator`);
    if (arm.generator.manifest.interface?.outputs[arm.generator.output] === undefined) {
      fail(`a ${arm.arm} generator must declare interface output "${arm.generator.output}"`);
    }
    if (arm.arm === "retained" && arm.cases === undefined) fail("a retained arm requires promotion cases");
  }
  if (opts.tasks.length === 0 || opts.tasks.length > EXPERIMENT_BOUNDS.maxTasks) fail(`tasks must list 1..${EXPERIMENT_BOUNDS.maxTasks} entries`);
  const account = new HabitatAccount("experiment", arm.budget);
  const catalog = new ExperimentCatalogState(opts.catalog ?? [], arm.maxEntries ?? EXPERIMENT_BOUNDS.maxCatalogEntries);
  const consultEnabled = arm.arm === "retained";
  const promoteEnabled = arm.arm === "retained";
  const runTask = opts.runTask ?? defaultRunTask;
  const shared = {
    fns: opts.fns,
    store: opts.store,
    executors: opts.executors,
    ...(opts.transports ? { transports: opts.transports } : {}),
    ...(opts.tools ? { tools: opts.tools } : {}),
  };

  const runs: ExperimentRun[] = [];
  const runDigests: Digest[] = [];
  let stopped = false;

  for (const task of opts.tasks) {
    if (stopped) break;
    const ctx: ExperimentTaskContext = { arm, task, ...shared, account };
    const record = async (partial: Omit<ExperimentRun, "contract" | "arm" | "taskId" | "phase">): Promise<ExperimentRun> => {
      const run = parseExperimentRun({
        contract: EXPERIMENT_RUN_CONTRACT, arm: arm.arm, taskId: task.taskId, phase: task.phase, ...partial,
      });
      runs.push(run);
      runDigests.push(await opts.store.putValue(run as unknown as JsonValue));
      return run;
    };

    // Consult hook: a hit digest-resolves the kept manifest through the store;
    // a miss or disabled hook falls through to the task mapping.
    let consult: ExperimentConsult = { outcome: consultEnabled ? "miss" : "disabled", entry: null, manifest: null };
    let prepared: ExperimentRunTaskResult | null = null;
    if (consultEnabled) {
      const hit = catalog.consult(arm.family);
      if (hit !== undefined) {
        const kept = await opts.store.getManifest(hit.manifest);
        if (kept === undefined) {
          consult = { outcome: "miss", entry: null, manifest: null };
        } else {
          consult = { outcome: "hit", entry: catalog.entries.indexOf(hit), manifest: hit.manifest };
          try {
            prepared = { manifest: kept, args: interfaceArgs(kept, task.args) };
          } catch (error) {
            await record({
              consult, generator: null, manifest: hit.manifest, args: null, receipt: null,
              outcome: "invalid", work: { units: 0, agentCalls: 0 }, failure: failureOf(error), promote: null,
            });
            continue;
          }
        }
      }
    }

    let manifest: OrganismManifest | null = null;
    let args: Record<string, Record<string, JsonValue>> | null = null;
    let generator: ExperimentRun["generator"] = null;
    if (prepared === null) {
      try {
        prepared = await runTask(ctx);
      } catch (error) {
        const run = await record({
          consult, generator: null, manifest: null, args: null, receipt: null,
          outcome: exhausted(error) ? "exhausted" : "invalid",
          work: { units: 0, agentCalls: 0 }, failure: failureOf(error), promote: null,
        });
        if (run.outcome === "exhausted") stopped = true;
        continue;
      }
    }
    if ("failure" in prepared) {
      await record({
        consult, generator: prepared.generator ?? null, manifest: null, args: null, receipt: null,
        outcome: "invalid", work: { units: 0, agentCalls: 0 }, failure: prepared.failure, promote: null,
      });
      continue;
    }
    manifest = prepared.manifest;
    args = prepared.args;
    generator = prepared.generator ?? null;

    let settled: { manifest: Digest; args: Digest; receipt: RunReceipt; receiptDigest: Digest } | null = null;
    let refused: Digest | null = null;
    try {
      const manifestDigest = await opts.store.putManifest(manifest);
      refused = manifestDigest;
      const admitted = await account.admit(
        { manifest: manifestDigest, budgets: manifest.budgets, args },
        () => runOrganism({ manifest, args, ...shared }),
        opts.store,
      );
      settled = {
        manifest: manifestDigest,
        receipt: admitted.receipt,
        receiptDigest: admitted.receiptDigest,
        args: await opts.store.putValue(args as JsonValue),
      };
    } catch (error) {
      // A refused reservation records the manifest it tried to admit — the
      // same digest the account's terminal refusal names.
      const run = await record({
        consult, generator, manifest: refused, args: null, receipt: null,
        outcome: exhausted(error) ? "exhausted" : "invalid",
        work: { units: 0, agentCalls: 0 }, failure: failureOf(error), promote: null,
      });
      if (run.outcome === "exhausted") stopped = true;
      continue;
    }

    // Promote hook: evaluate the program that ran; passing candidates join the
    // catalog later tasks consult.
    let promote: ExperimentPromote | null = null;
    if (promoteEnabled) {
      try {
        promote = await promoteHook(ctx, manifest, settled.manifest, catalog);
      } catch (error) {
        const run = await record({
          consult, generator, manifest: settled.manifest, args: settled.args,
          receipt: settled.receiptDigest, outcome: exhausted(error) ? "exhausted" : settled.receipt.outcome,
          work: { units: settled.receipt.work.units, agentCalls: settled.receipt.work.agentCalls },
          failure: failureOf(error), promote: null,
        });
        if (run.outcome === "exhausted") stopped = true;
        continue;
      }
    }

    await record({
      consult,
      generator,
      manifest: settled.manifest,
      args: settled.args,
      receipt: settled.receiptDigest,
      outcome: settled.receipt.outcome,
      work: { units: settled.receipt.work.units, agentCalls: settled.receipt.work.agentCalls },
      failure: null,
      promote,
    });
  }

  const budgetDigest = await opts.store.putValue(account.record() as unknown as JsonValue);
  const catalogDigest = await opts.store.putValue(catalog.record() as unknown as JsonValue);
  const session = parseExperimentSession({
    contract: EXPERIMENT_SESSION_CONTRACT,
    arm: arm.arm,
    family: arm.family,
    tasks: runs.map((run, i) => ({ taskId: run.taskId, phase: run.phase, run: runDigests[i]! })),
    budget: budgetDigest,
    catalog: catalogDigest,
    outcome: account.exhausted ? "exhausted" : "complete",
  });
  const sessionDigest = await opts.store.putValue(session as unknown as JsonValue);
  return { session, sessionDigest, runs, runDigests, catalog: catalog.record(), catalogDigest };
}
