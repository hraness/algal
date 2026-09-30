// The public aggregate of a collected v9-pool study. Reads the study's
// frozen artifacts and stores as plain JSON, copies digests, counts, and
// costs only, and never a model input or output.
//
//   bun experiments/cumulative-skill/arms/v9-pool/export.ts <study-dir> <date>
//   -> docs/cumulative-skill-v9-pool-results-<date>.json
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { asDigest, type Digest } from "../../../../src/digest";
import { asArray, asInt, asObject, asString, type JsonObject, type JsonValue } from "../../../../src/values";
import { addCosts, zeroCost, type StudyCost } from "../v5/evidence-support";
import { hash, readJson, requireMatch, ROOT, type FrozenIdentity } from "./guards";
import { ARMS, POOL, RESULT_CONTRACT, STUDY_ID, type StudyArm } from "./protocol";

export const PUBLIC_SCHEMA = "algal.cumulative-skill-public.v9-pool" as const;
export type BlockStatus = "not-launched" | "interrupted" | "unqualified" | "qualified-not-compared" | "primary";
const json = (value: unknown): JsonValue => value as JsonValue;
const RECEIPT_FILE = /^([a-f0-9]{64})\.json$/;
const MAX_STORE_RECEIPTS = 8192;
const MAX_ATTEMPTS = 64;
/** Keys that only ever hold model inputs or outputs in a study artifact. */
const PRIVATE_KEYS = new Set(["cells", "prompt", "records", "outputs", "args", "instructions", "expect", "training", "library"]);
/** Keys that may name a stored artifact by digest but never carry it. */
const DIGEST_ONLY_KEYS = new Set(["manifest", "catalog", "report", "receipt", "session", "account", "head"]);

/** Deterministic text: every object's keys sorted, two-space indent. */
export function sortKeys(value: JsonValue): JsonValue {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, sortKeys(value[key]!)]));
  }
  return value;
}
export const publicText = (value: JsonValue): string => JSON.stringify(sortKeys(value), null, 2) + "\n";

/** Refuses any tree that carries a private key or an inline artifact where a digest belongs. */
export function assertPublic(value: JsonValue, at = "public"): void {
  if (Array.isArray(value)) value.forEach((item, i) => assertPublic(item, `${at}[${i}]`));
  else if (value !== null && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) {
      requireMatch(!PRIVATE_KEYS.has(key), `${at}.${key}: private key in the public summary`);
      if (DIGEST_ONLY_KEYS.has(key)) requireMatch(item === null || (typeof item === "string" && /^sha256:[a-f0-9]{64}$/.test(item)), `${at}.${key}: inline artifact in the public summary`);
      assertPublic(item, `${at}.${key}`);
    }
  }
}

function storeFile(study: string, block: string, stage: string, kind: "values" | "runs", digest: Digest): JsonObject {
  const value = asObject(readJson(join(study, "stores", block, stage, kind, `${digest.slice(7)}.json`)), `${block}/${stage} ${kind} ${digest}`);
  requireMatch(hash(value) === digest, `${block}/${stage}: ${kind} ${digest} hash mismatch`);
  return value;
}
/** What a receipt file costs, read as the driver's evidence support reads it:
 * one admitted run, one attempt per agent call, and unknown tokens once any
 * effect lacks usage. Returns the usage-less effects for the failure list. */
function receiptCost(receipt: JsonObject, at: string): { cost: StudyCost; missing: { code: string | null }[] } {
  const work = asObject(receipt.work, `${at}.work`);
  const cost = zeroCost();
  cost.workUnits = asInt(work.units, `${at}.work.units`, 0, Number.MAX_SAFE_INTEGER);
  cost.admittedRuns = 1;
  cost.modelCalls = asInt(work.agentCalls, `${at}.work.agentCalls`, 0, 1_000_000);
  const effects = asArray(receipt.effects ?? [], `${at}.effects`);
  const missing: { code: string | null }[] = [];
  for (const [i, raw] of effects.entries()) {
    const effect = asObject(raw, `${at}.effects[${i}]`);
    const usage = effect.usage === undefined ? null : asObject(effect.usage, `${at}.effects[${i}].usage`);
    if (usage === null || typeof usage.tokensIn !== "number" || typeof usage.tokensOut !== "number") {
      cost.tokensIn = null; cost.tokensOut = null; cost.effectsMissingUsage++;
      const error = effect.error === undefined ? null : asObject(effect.error, `${at}.effects[${i}].error`);
      missing.push({ code: error === null || typeof error.code !== "string" ? null : error.code });
      continue;
    }
    if (cost.tokensIn !== null) cost.tokensIn += usage.tokensIn;
    if (cost.tokensOut !== null) cost.tokensOut += usage.tokensOut;
  }
  const unrecorded = Math.max(0, cost.modelCalls - effects.length);
  if (unrecorded > 0) {
    cost.tokensIn = null; cost.tokensOut = null; cost.effectsMissingUsage += unrecorded;
  }
  return { cost, missing };
}
function receiptFiles(study: string, block: string, stage: string): Digest[] {
  const dir = join(study, "stores", block, stage, "runs");
  if (!existsSync(dir)) return [];
  const names = readdirSync(dir).sort();
  requireMatch(names.length <= MAX_STORE_RECEIPTS, `${block}/${stage}: too many receipt files`);
  return names.map(name => {
    const match = RECEIPT_FILE.exec(name);
    requireMatch(match !== null, `${block}/${stage}: unexpected receipt path ${name}`);
    return `sha256:${match[1]}` as Digest;
  });
}
/** A seed search's charge from its stored account and receipts, and the cost
 * of receipts in the store that the account does not name. */
function seedCost(study: string, block: string, summary: JsonObject): { cost: StudyCost; unreferenced: StudyCost; unreferencedReceipts: number } {
  const account = storeFile(study, block, "seed", "values", asDigest(summary.account, `${block} seed account`));
  const charged = asObject(account.charged, `${block} seed account charged`);
  const runs = asArray(account.runs, `${block} seed account runs`).map((run, i) => asDigest(asObject(run, `${block} seed run ${i}`).receipt, `${block} seed run ${i} receipt`));
  const cost = addCosts(...runs.map(digest => receiptCost(storeFile(study, block, "seed", "runs", digest), `${block}/seed ${digest}`).cost));
  cost.workUnits = asInt(charged.work, `${block} seed charged work`, 0, Number.MAX_SAFE_INTEGER);
  cost.admittedRuns = asInt(charged.runs, `${block} seed charged runs`, 0, MAX_STORE_RECEIPTS);
  cost.modelCalls = asInt(charged.attempts, `${block} seed charged attempts`, 0, 1_000_000);
  const referenced = new Set(runs);
  const extra = receiptFiles(study, block, "seed").filter(digest => !referenced.has(digest));
  return { cost, unreferenced: addCosts(...extra.map(digest => receiptCost(storeFile(study, block, "seed", "runs", digest), `${block}/seed ${digest}`).cost)), unreferencedReceipts: extra.length };
}

/** The v8 public attempt fields: identities, counts, and flags only. */
function publicAttempt(attempt: JsonObject, at: string): JsonObject {
  const score = (value: unknown, name: string): JsonValue => value === null ? null : (() => {
    const s = asObject(value, `${at}.${name}`);
    return { passed: asInt(s.passed, `${at}.${name}.passed`, 0, 64), total: asInt(s.total, `${at}.${name}.total`, 1, 64) };
  })();
  const development = attempt.development === null || attempt.development === undefined ? null : asObject(attempt.development, `${at}.development`).score;
  requireMatch(development === null || (typeof development === "number" && development >= 0 && development <= 1 && Math.round(development * 100) / 100 === development), `${at}: invalid development score`);
  const failure = attempt.failure === null || attempt.failure === undefined ? null : asObject(attempt.failure, `${at}.failure`);
  return {
    generation: asInt(attempt.generation, `${at}.generation`, 1, MAX_ATTEMPTS), round: asString(attempt.round, `${at}.round`, 64),
    mode: asString(attempt.mode, `${at}.mode`, 16), outcome: asString(attempt.outcome, `${at}.outcome`, 32),
    manifest: attempt.manifest === null ? null : asDigest(attempt.manifest, `${at}.manifest`),
    trainingBatches: score(attempt.train, "train"), validationBatches: score(attempt.validation, "validation"),
    developmentScore: development, developmentRecord: attempt.developmentRecord === null ? null : asDigest(attempt.developmentRecord, `${at}.developmentRecord`),
    writerRequest: attempt.request === null ? null : asDigest(attempt.request, `${at}.request`),
    duplicateRequest: attempt.duplicateRequest === true, repeatedManifest: attempt.repeatedManifest === true,
    failureCode: failure === null ? null : asString(failure.code, `${at}.failure.code`, 64),
  };
}
function publicSeed(study: string, block: string): JsonObject | null {
  const attemptDir = join(study, block, "attempts", "seed");
  const reconciliation = existsSync(join(attemptDir, "reconciliation.json")) ? asObject(readJson(join(attemptDir, "reconciliation.json")), `${block} reconciliation`) : null;
  let summary: JsonObject;
  if (existsSync(join(attemptDir, "result.json"))) summary = asObject(readJson(join(attemptDir, "result.json")), `${block} seed summary`);
  else if (reconciliation !== null) {
    const snapshot = asDigest(reconciliation.snapshot, `${block} reconciliation snapshot`);
    summary = { ...asObject(readJson(join(attemptDir, `seed-${snapshot.slice(7)}.json`)), `${block} retained snapshot`), termination: "interrupted", qualified: false };
  } else return null;
  const attempts = asArray(summary.attempts, `${block} seed attempts`);
  requireMatch(attempts.length <= MAX_ATTEMPTS, `${block}: too many seed attempts`);
  const rows = attempts.map((attempt, i) => publicAttempt(asObject(attempt, `${block} seed attempt ${i}`), `${block} seed attempt ${i}`));
  const { cost, unreferenced, unreferencedReceipts } = seedCost(study, block, summary);
  const inFlight = summary.inFlight === null || summary.inFlight === undefined ? null : asObject(summary.inFlight, `${block} in-flight plan`);
  return {
    qualified: summary.qualified === true, termination: asString(summary.termination, `${block} termination`, 32),
    generations: rows.length, duplicateRequests: asInt(summary.duplicateRequests, `${block} duplicate requests`, 0, MAX_ATTEMPTS),
    distinctWriterRequests: new Set(rows.map(row => row.writerRequest).filter(request => request !== null)).size,
    distinctManifests: new Set(rows.map(row => row.manifest).filter(manifest => manifest !== null)).size,
    manifest: summary.manifest === null ? null : asDigest(summary.manifest, `${block} seed manifest`),
    account: asDigest(summary.account, `${block} seed account`), cost: json(cost), attempts: rows,
    interrupted: reconciliation === null ? null : {
      completedGenerations: rows.length,
      inFlightGeneration: inFlight === null ? null : asInt(inFlight.generation, `${block} in-flight generation`, 1, MAX_ATTEMPTS),
      inFlightRound: inFlight === null ? null : asString(inFlight.round, `${block} in-flight round`, 64),
      inFlightMode: inFlight === null ? null : asString(inFlight.mode, `${block} in-flight mode`, 16),
      retainedSnapshot: reconciliation.snapshot === null ? null : asDigest(reconciliation.snapshot, `${block} snapshot`),
      storeReceipts: reconciliation.storeReceipts === null ? null : asInt(reconciliation.storeReceipts, `${block} store receipts`, 0, MAX_STORE_RECEIPTS),
      unreferencedReceipts, unreferencedReceiptCost: json(unreferenced),
      retry: "none", cause: "the stage was closed by `reconcile` without a provider call; the cause is outside the record",
    },
  };
}
function publicSession(value: unknown, at: string): JsonObject | null {
  if (value === undefined) return null;
  const session = asObject(value, at);
  return { session: session.session === null ? null : asDigest(session.session, `${at}.session`), outcome: asString(session.outcome, `${at}.outcome`, 32),
    observedTasks: asInt(session.observed, `${at}.observed`, 0, 1024), head: session.head === null ? null : asDigest(session.head, `${at}.head`),
    counts: json(asObject(session.counts, `${at}.counts`)), cost: json(asObject(session.cost, `${at}.cost`)), reconciled: session.reconciled === true };
}

const MAX_MISSING_STAGES = 24;
/** Why the primary rule has no verdict, read from the coverage the rule
 * recorded: a missing stage was reconciled, or it closed exhausted or short
 * of its planned tasks. Both leave the rule without a verdict and no block
 * replaces it; the sentence names the missing stages and claims only what
 * the rows show. */
export function insufficientCoverage(summary: JsonObject, rows: Map<string, JsonObject>): string {
  const missing = asArray(asObject(summary.coverage, "coverage").missing, "coverage.missing").map((id, i) => asString(id, `coverage.missing[${i}]`, 64));
  requireMatch(missing.length >= 1 && missing.length <= MAX_MISSING_STAGES, "insufficient coverage names no missing stage");
  const reconciled = missing.filter(id => {
    const match = /^(p-\d{2})\/(learning|frozen)-([a-z-]+)$/.exec(id);
    if (match === null) return false;
    const row = rows.get(match[1]!);
    if (row === undefined) return false;
    const stages = match[2] === "learning" ? asObject(asObject(row.learning, `${match[1]}.learning`).arms, `${match[1]}.learning.arms`) : asObject(row.frozen, `${match[1]}.frozen`);
    const session = stages[match[3]!];
    return session !== undefined && asObject(session, id).reconciled === true;
  });
  const listed = `the primary rule has no verdict and no block replaced it. Missing: ${missing.join(", ")}.`;
  if (reconciled.length > 0) return `A primary fixed or optimizer stage was reconciled as interrupted (${reconciled.join(", ")}); ${listed}`;
  if (missing.every(id => /^p-\d{2}\/(?:learning|frozen)-(?:fixed|optimizer)$/.test(id))) return `A primary fixed or optimizer stage closed exhausted or short of its planned tasks; ${listed}`;
  return `The primary set's coverage is incomplete; ${listed}`;
}

export function publicSummary(study: string, date: string): JsonObject {
  requireMatch(/^\d{4}-\d{2}-\d{2}$/.test(date), "date must be YYYY-MM-DD");
  const freeze = asObject(readJson(join(study, "freeze.json")), "freeze") as unknown as FrozenIdentity;
  const { digest: freezeDigest, ...body } = freeze;
  requireMatch(freeze.contract === "algal.study-freeze.v1" && freezeDigest === hash(body), "invalid freeze identity");
  const protocol = asObject(readJson(join(study, "protocol.json")), "frozen protocol");
  requireMatch(hash(protocol) === freeze.protocol && protocol.study === STUDY_ID, "frozen protocol differs from the freeze");
  const results = asObject(readJson(join(study, "results.json")), "results");
  requireMatch(results.contract === RESULT_CONTRACT && results.freeze === freezeDigest, "results do not belong to this freeze");
  const replay = existsSync(join(study, "replay.json")) ? asObject(readJson(join(study, "replay.json")), "replay") : null;
  if (replay !== null) requireMatch(replay.freeze === freezeDigest && replay.results === hash(results) && replay.ok === true, "replay does not verify these results");
  const pool = asObject(results.pool, "pool decision");
  const ids = (name: string) => asArray(pool[name], `pool.${name}`).map((id, i) => asString(id, `pool.${name}[${i}]`, 8));
  const launched = ids("launched"), qualified = ids("qualified"), interrupted = ids("interrupted"), unqualified = ids("unqualified");
  const primary = pool.primary === null ? null : ids("primary");
  requireMatch(launched.length <= POOL.launchCap && (primary === null || primary.length === POOL.primarySize), "pool decision out of plan");
  const summary = results.summary === undefined ? null : asObject(results.summary, "comparison summary");
  const rows = new Map((results.rows === undefined ? [] : asArray(results.rows, "primary rows")).map((raw, i) => {
    const row = asObject(raw, `rows[${i}]`);
    return [asString(asObject(row.block, `rows[${i}].block`).id, `rows[${i}].block.id`, 8), row];
  }));
  const blocks = asArray(protocol.blocks, "protocol blocks").map((raw, index) => {
    const block = asObject(raw, `protocol.blocks[${index}]`);
    const id = asString(block.id, `protocol.blocks[${index}].id`, 8);
    const status: BlockStatus = !launched.includes(id) ? "not-launched" : interrupted.includes(id) ? "interrupted"
      : primary?.includes(id) ? "primary" : qualified.includes(id) ? "qualified-not-compared" : "unqualified";
    requireMatch(status !== "unqualified" || unqualified.includes(id), `${id}: launched block outside every pool category`);
    const row = rows.get(id);
    requireMatch((row !== undefined) === (status === "primary"), `${id}: primary rows and the pool disagree`);
    const arms = row === undefined ? null : Object.fromEntries(ARMS.map((arm: StudyArm) => [arm, {
      learning: publicSession(asObject(asObject(row.learning, `${id}.learning`).arms, `${id}.learning.arms`)[arm], `${id}/learning-${arm}`),
      frozen: publicSession(asObject(row.frozen, `${id}.frozen`)[arm], `${id}/frozen-${arm}`),
    }]));
    return { block: id, index, seeds: json(block.seeds), status, seed: status === "not-launched" ? null : publicSeed(study, id), arms };
  });
  // Every effect without usage, located by receipt file; token subtotals over every receipt file.
  const failures: JsonObject[] = [];
  const fileTotals = { receiptFiles: 0, effectsWithUsage: 0, tokensIn: 0, tokensOut: 0, workUnits: 0 };
  for (const block of blocks) {
    const parent = join(study, "stores", block.block);
    if (!existsSync(parent)) continue;
    for (const stage of readdirSync(parent).sort()) {
      for (const digest of receiptFiles(study, block.block, stage)) {
        const receipt = storeFile(study, block.block, stage, "runs", digest);
        const { cost, missing } = receiptCost(receipt, `${block.block}/${stage} ${digest}`);
        fileTotals.receiptFiles++;
        fileTotals.workUnits += cost.workUnits;
        fileTotals.effectsWithUsage += asArray(receipt.effects ?? [], "effects").length - missing.length;
        fileTotals.tokensIn += cost.tokensIn ?? 0;
        fileTotals.tokensOut += cost.tokensOut ?? 0;
        for (const miss of missing) failures.push({ block: block.block, stage, receipt: digest, code: miss.code,
          category: "transport failed; external completion uncertain", usageKnown: false, retried: false, countsAsFailedCase: true });
      }
    }
  }
  const totalRealizedCost = asObject(summary?.totalRealizedCost ?? results.totalRealizedCost, "total realized cost");
  const status = asString(results.status, "status", 64);
  const limitations = [
    "The comparison is conditional on seed qualification, a pre-treatment event the launcher selected on; the six primary blocks are the lowest-index qualified searches, and that selection plausibly favors the optimizer.",
    "Fresh draws from one shared synthetic template family do not represent separate domains or human-adjudicated support messages.",
    "Validation selected seeds repeatedly and is not an untouched final test.",
    "Arms ran at unequal recorded spend; a met rule is a descriptive win, not a matched-spend win.",
    // The result's status is `insufficient` for a failed pool and for a
    // failed coverage alike; each sentence reads the record that failed.
    ...(pool.status === "insufficient" ? ["Fewer than six of sixteen seed searches qualified; no arm ran and there is no optimizer comparison."] : []),
    ...(summary !== null && summary.status === "insufficient" ? [insufficientCoverage(summary, rows)] : []),
    ...(interrupted.length > 0 ? [`${interrupted.length} seed search${interrupted.length === 1 ? " was" : "es were"} closed as interrupted by the host, not by the protocol, and by protocol not retried.`] : []),
    failures.length > 0 ? "Transport-failed calls have uncertain external completion and missing usage; full token totals and provider charges remain unknown." : "Provider charges remain unknown.",
  ];
  const result: JsonObject = {
    schema: PUBLIC_SCHEMA, study: STUDY_ID, studyDate: date, status,
    sourceRepository: "https://github.com/hraness/algal", sourceCommit: freeze.sourceCommit, bunVersion: freeze.bunVersion,
    executor: { baseUrl: freeze.route.baseUrl, model: freeze.route.model },
    identity: { freeze: freezeDigest, protocol: freeze.protocol, datasets: freeze.datasets, results: hash(results), replay: replay === null ? null : hash(replay) },
    method: {
      family: "synthetic record triage", scorerPassAt: 0.9, score: "(4 * exact full-record fraction + exact-summary indicator) / 5", wrongRowCountScore: 0,
      seedTrainingRecords: 24, seedValidationRecords: 12, seedDevelopmentRecords: 12, fixedRecordsPerTask: 12,
      maximumSeedGenerations: json(asObject(protocol.seed, "protocol.seed").maxGenerations), roundSchedule: json(asObject(protocol.seed, "protocol.seed").roundSchedule),
      writerFeedback: "Training examples, previous training output beside expected training output, the generation number, the predeclared round mode, and a bounded development score history of {generation, round, score} only, where score is the agreement value in [0,1] rounded to hundredths.",
      developmentUse: "A candidate that failed selection is executed once on a separate 12-record development batch; only its agreement score (rounded to hundredths) reaches later writer requests. No development records, labels, outputs, or summaries enter any request.",
      validationUse: "Repeated selection of the first passing candidate; validation labels, outputs, and scores excluded from writer requests.",
      writerRequestIdentity: "Digest of the executed writer program and its exact arguments; a duplicate request ends the search as a protocol failure.",
      budgets: json(protocol.budgets), poolRule: json(protocol.pool), comparisonRule: json(protocol.comparison),
      estimand: json(asObject(protocol.basis, "protocol.basis").change), lineRule: json(asObject(protocol.basis, "protocol.basis").lineRule),
      runDiscipline: json(protocol.runDiscipline),
    },
    pool: { launched, qualified, interrupted, unqualified, primary, qualifiedNotCompared: ids("qualifiedNotCompared"), status: asString(pool.status, "pool.status", 16),
      reasons: json(pool.reasons), rates: json(pool.rates), cost: json(pool.poolCost) },
    blocks, primaryComparison: summary === null ? null : json(summary), offline: json(results.offline ?? null),
    duplicateWriterRequests: json(results.duplicateWriterRequests ?? 0),
    totalRealizedCost: json(totalRealizedCost),
    costBreakdown: { poolAccounted: json(pool.poolAccountedCost), poolUnreferencedReceipts: json(pool.poolUnreferencedCost),
      comparison: json(summary?.comparisonCost ?? zeroCost()),
      scope: "poolAccounted sums every launched seed account; poolUnreferencedReceipts adds receipts an interrupted search left that no account names; comparison sums the learning and frozen accounts of the four arms on the primary blocks, with a reconciled stage's retained receipts summed in its place." },
    receiptFileTotals: { ...fileTotals, scope: "Per-receipt-file subtotals over every store, so a seed receipt copied into a learning store counts in both; token subtotals cover only effects that recorded usage." },
    costDefinitions: { workUnits: "Runtime work accounting, including every failed or repeated admission.", modelCalls: "Charged executor attempts; no provider billing attestation.",
      tokens: "Recorded usage counted per admitted run, including content-identical receipts. One missing usage makes full totals null.", providerDollars: null },
    recordedFailures: failures,
    recordedFailureLimit: "A failed local receipt does not establish the exact abort cause, provider completion, or billing; each listed miss is a transport failure, not a scored miss.",
    verification: replay === null ? null : { offlineReplayPassed: true, receiptFilesChecked: json(replay.checkedReceipts), stores: json(replay.stores), countScope: json(replay.countScope),
      interpretation: "Recorded execution replay is separate from task correctness and provider billing." },
    limitations,
  };
  assertPublic(result);
  return result;
}

/** Writes the public summary once; a second export must reproduce it byte for byte. */
export function exportStudy(study: string, date: string, docsDir = join(ROOT, "docs")): { path: string; bytes: number; digest: Digest } {
  const summary = publicSummary(study, date);
  const text = publicText(summary);
  const path = join(docsDir, `cumulative-skill-v9-pool-results-${date}.json`);
  if (existsSync(path)) requireMatch(readFileSync(path, "utf8") === text, "existing public summary differs from this export");
  else writeFileSync(path, text, { flag: "wx" });
  return { path, bytes: Buffer.byteLength(text), digest: hash(summary) };
}

if (import.meta.main) {
  const [study, date, ...extra] = process.argv.slice(2);
  requireMatch(study !== undefined && date !== undefined && extra.length === 0, "usage: bun arms/v9-pool/export.ts <study-directory> <YYYY-MM-DD>");
  console.log(JSON.stringify(exportStudy(resolve(study), date)));
}
