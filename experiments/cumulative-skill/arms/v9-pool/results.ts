// Independent offline scoring and cost accounting for the frozen v9-pool plan.
// The pool decision and the primary rule are numeric functions of inspected
// evidence; a stage closed by `reconcile` inspects as `interrupted` with its
// retained receipts summed, never as a missing observation.
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { manifestToJson } from "../../../../src/contract";
import { asDigest, type Digest } from "../../../../src/digest";
import { buildExperimentReport } from "../../../../src/experiment-report";
import { parseExperimentCatalog, parseExperimentRun, parseExperimentSession } from "../../../../src/experiment-run";
import { taskBatchArgs, taskSpecData, type ExperimentTaskSpec } from "../../../../src/experiment-task";
import { verifyExperimentReport } from "../../../../src/experiment-verify";
import { parseHabitatBudget, type HabitatRun } from "../../../../src/habitat-budget";
import { parseRunReceipt, receiptDigest, type RunReceipt } from "../../../../src/run";
import { FileStore } from "../../../../src/store";
import { asArray, asInt, asObject, noUnknownKeys, type JsonObject, type JsonValue } from "../../../../src/values";
import { verifyObservedRoute } from "../v5/evidence";
import { accountCost, addCosts, storedManifest, storedValue, zeroCost, type StudyCost } from "../v5/evidence-support";
import { gradeStudy, type Counts, type StudyTruth } from "../v5/grade";
import { hash, readJson, requireMatch, verifyStage, writeNew, type FrozenIdentity } from "./guards";
import { buildStudyConfigs } from "./build";
import { ARMS, ARM_BUDGET, blockIndex, COMPARISON, POOL, POOL_BLOCK_IDS, PROTOCOL, PROTOCOL_DIGEST, RECONCILIATION_CONTRACT, SEED_BUDGET,
  SEED_MAX_GENERATIONS, STUDY_ID, learningTasks, seedTask, taskTruth, type RoundMode, type StudyBlock } from "./protocol";
import { caseDiagnostics, DEVELOPMENT_CONTRACT, developmentCase, manifestOutputs, parseDevelopmentRecord, selectionDiagnostics, verifySeedEvidence,
  type CaseDiagnostics, type SeedSummary, type SelectionDiagnostics } from "./seed";

export type ArmName = typeof ARMS[number];
/** A reconciled stage has no session and no head; its cost sums the receipts
 * it left behind and its counts are zero. */
export type SessionSummary = { session: Digest | null; outcome: string; observed: number; head: Digest | null; cost: StudyCost; counts: Counts; reconciled: boolean };
/** `cost` is the seed account's charge; `unreferenced` sums receipts the store
 * holds that no account names — the in-flight writer call of an interrupted
 * search — and is zero for a search that closed on its own. */
export type SeedEvidence = { summary: SeedSummary; reconciled: boolean; cost: StudyCost; unreferenced: StudyCost; catalog: JsonValue | null; manifest: JsonValue | null };
const json = (value: unknown): JsonValue => value as JsonValue;
const RECEIPT_FILE = /^([a-f0-9]{64})\.json$/;
const MAX_STORE_RECEIPTS = 8192;
const emptyCounts = (): Counts => ({ tasks: 0, complete: 0, labelsCorrect: 0, recordsCorrect: 0, recordsTotal: 0, summariesExact: 0, outputsExact: 0, scorerPassed: 0 });
export const storePath = (study: string, block: string, stage: string): string => join(study, "stores", block, stage);
export const stageDone = (study: string, block: string, stage: string): boolean => existsSync(join(study, block, "attempts", stage, "result.json"));

export function seedInput(block: StudyBlock): unknown {
  return { block: block.id, corpus: block.id, protocol: PROTOCOL_DIGEST, first: seedTask(block) };
}

/** The pool's qualification predicate: the build's seed checks, decided from
 * the summary alone so the launcher and the decision agree byte for byte. */
export function seedQualified(summary: SeedSummary): boolean {
  return summary.qualified === true && summary.termination === "qualified" && summary.validation !== null &&
    summary.validation.passed === summary.validation.total && summary.duplicateRequests === 0 &&
    summary.manifest !== null && summary.catalog !== null;
}

/** The write-once record `reconcile` leaves beside a stage's binding. */
export type Reconciliation = {
  contract: typeof RECONCILIATION_CONTRACT; freeze: Digest; block: string; stage: string; input: Digest;
  termination: "interrupted"; snapshot: Digest | null; storeReceipts: number | null; retry: "none";
};
export function parseReconciliation(value: unknown, at = "reconciliation"): Reconciliation {
  const record = asObject(value, at);
  noUnknownKeys(record, ["contract", "freeze", "block", "stage", "input", "termination", "snapshot", "storeReceipts", "retry"], at);
  requireMatch(record.contract === RECONCILIATION_CONTRACT && record.termination === "interrupted" && record.retry === "none", `${at}: not a terminal interrupted record`);
  requireMatch(typeof record.block === "string" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(record.block) &&
    typeof record.stage === "string" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(record.stage), `${at}: invalid block or stage`);
  return {
    contract: RECONCILIATION_CONTRACT, freeze: asDigest(record.freeze, `${at}.freeze`), block: record.block, stage: record.stage,
    input: asDigest(record.input, `${at}.input`), termination: "interrupted",
    snapshot: record.snapshot === null ? null : asDigest(record.snapshot, `${at}.snapshot`),
    storeReceipts: record.storeReceipts === null ? null : asInt(record.storeReceipts, `${at}.storeReceipts`, 0, MAX_STORE_RECEIPTS), retry: "none",
  };
}

const SNAPSHOT_FILE = /^seed-([a-f0-9]{64})\.json$/;
const MAX_SEED_SNAPSHOTS = 64;
const TERMINAL_SEED_TERMINATIONS = new Set<string>(["qualified", "generation-limit", "budget-limit", "duplicate-request"]);
/** One summary the search saved beside its attempt (`seed-<digest>.json`).
 * `terminal` marks a snapshot the search wrote when it closed on its own;
 * `interrupted` is the thrown-error snapshot and is not terminal here. */
export type RetainedSnapshot = { digest: Digest; summary: JsonObject; attempts: number; rank: number; terminal: boolean };
/** Every summary the search saved, latest first: most attempts, then the
 * terminal or thrown-error, planned, or settled state after the executed
 * ones. Every snapshot names its own hash. A terminal snapshot is the
 * search's own closing, and only a search killed between that snapshot and
 * its result may still hold one without a result; `reconcile` recovers it
 * and `inspectSeed` refuses one under a reconciliation record. */
export function retainedSeedSnapshots(attemptDir: string, at: string): RetainedSnapshot[] {
  const names = readdirSync(attemptDir).filter(name => SNAPSHOT_FILE.test(name)).sort();
  requireMatch(names.length <= MAX_SEED_SNAPSHOTS, `${at}: too many seed snapshots`);
  const snapshots = names.map((name): RetainedSnapshot => {
    const summary = asObject(readJson(join(attemptDir, name)), name);
    const digest = hash(summary);
    requireMatch(digest === `sha256:${SNAPSHOT_FILE.exec(name)![1]}`, `${name}: snapshot hash mismatch`);
    const termination = String(summary.termination);
    const terminal = TERMINAL_SEED_TERMINATIONS.has(termination);
    requireMatch(terminal || (summary.qualified === false && (termination === "in-progress" || termination === "interrupted")),
      `${at}: retained snapshot carries an unknown termination ${termination}`);
    const attempts = asArray(summary.attempts, `${name} attempts`).length;
    requireMatch(attempts <= SEED_MAX_GENERATIONS, `${name}: too many attempts`);
    return { digest, summary, attempts, rank: termination !== "in-progress" ? 2 : summary.inFlight !== null ? 1 : 0, terminal };
  });
  return snapshots.sort((a, b) => b.attempts - a.attempts || b.rank - a.rank || a.digest.localeCompare(b.digest));
}
/** The retained snapshot a search wrote when it closed on its own, when the
 * latest retained one is terminal. Any terminal snapshot below the latest
 * cannot be the driver's, which writes one only at the end of a search. */
export function selfClosedSnapshot(snapshots: RetainedSnapshot[], at: string): RetainedSnapshot | null {
  const latest = snapshots[0];
  if (latest === undefined || !latest.terminal) {
    requireMatch(snapshots.every(snapshot => !snapshot.terminal), `${at}: a retained snapshot already terminated as ${String(snapshots.find(s => s.terminal)?.summary.termination)} below a later one`);
    return null;
  }
  requireMatch(snapshots.slice(1).every(snapshot => !snapshot.terminal), `${at}: more than one retained snapshot is terminal`);
  return latest;
}
const VALUE_FILE = /^([a-f0-9]{64})\.json$/;
/** Whether the seed store holds evidence that the search settled a
 * generation at or past `generation`: a promoted catalog (only a qualifying
 * generation stores entries) or a development record of that generation
 * (stored only after its attempt was pushed). A search interrupted before
 * that generation settled stores neither, so either one means the search did
 * not stop there. A session alone is not such evidence: the driver stores it
 * before the push, and an interruption between the two leaves it behind.
 * Bounded like the receipt scan; every value is checked against its name. */
export async function closedGenerationInStore(dir: string, generation: number): Promise<"promoted catalog" | "development record" | null> {
  if (!existsSync(join(dir, "values"))) return null;
  const store = new FileStore(dir);
  const names = readdirSync(join(dir, "values")).sort();
  requireMatch(names.length <= MAX_STORE_RECEIPTS, "invalid store value count");
  for (const name of names) {
    const match = VALUE_FILE.exec(name);
    requireMatch(match !== null, "unexpected value path");
    const digest = `sha256:${match[1]}` as Digest;
    const raw = await store.getValue(digest);
    requireMatch(raw !== undefined && hash(raw) === digest, `value hash mismatch ${digest}`);
    if (raw === null || typeof raw !== "object" || Array.isArray(raw)) continue;
    if (raw.contract === "algal.experiment-catalog.v1" && parseExperimentCatalog(raw).entries.length > 0) return "promoted catalog";
    if (raw.contract === DEVELOPMENT_CONTRACT && parseDevelopmentRecord(raw, name).generation >= generation) return "development record";
  }
  return null;
}
/** Why a retained snapshot, closed as `interrupted`, does not verify against
 * the seed store, or null when it does. The driver's thrown-error snapshot
 * can carry an attempt whose development score never landed, or the charge
 * of an attempt it never pushed, and then belongs to no verifiable closing.
 * A snapshot whose store already settled the next generation is not a
 * closing either: the search went on past it. Reads the store only; no
 * provider call. */
export async function closingFailure(snapshot: RetainedSnapshot, block: StudyBlock, store: FileStore): Promise<string | null> {
  try {
    await verifySeedEvidence({ ...snapshot.summary, termination: "interrupted" } as unknown as SeedSummary, seedTask(block), store, { snapshot: snapshot.digest });
    await requireOpenAfter(store.dir, snapshot.attempts, `${block.id}/seed`);
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}
/** An interrupted search with `attempts` pushed attempts must not have
 * settled the next generation in its store. */
async function requireOpenAfter(dir: string, attempts: number, at: string): Promise<void> {
  const generation = attempts + 1;
  const closed = await closedGenerationInStore(dir, generation);
  if (closed !== null) throw new Error(`${at}: interrupted seed store holds a closed generation ${generation} (${closed}); the search did not stop there`);
}

/** A closed stage is one with a result, a reconciliation record, or both:
 * `reconcile` writes both, and a record alone still closes the stage. The
 * binding and input snapshot are checked either way. */
export function closedStage(study: string, freeze: FrozenIdentity, block: string, stage: string, input: unknown): { result: unknown | null; reconciliation: Reconciliation | null } {
  const dir = join(study, block, "attempts", stage);
  let reconciliation: Reconciliation | null = null;
  if (existsSync(join(dir, "reconciliation.json"))) {
    reconciliation = parseReconciliation(readJson(join(dir, "reconciliation.json")), `${block}/${stage} reconciliation`);
    requireMatch(reconciliation.freeze === freeze.digest && reconciliation.block === block && reconciliation.stage === stage &&
      reconciliation.input === hash(input), `${block}/${stage}: reconciliation binding mismatch`);
  }
  if (existsSync(join(dir, "result.json"))) return { result: verifyStage(study, freeze, block, stage, input), reconciliation };
  requireMatch(reconciliation !== null, `${block}/${stage}: stage is not closed`);
  requireMatch(hash(readJson(join(dir, "binding.json"))) === hash({ contract: "algal.study-stage.v1", freeze: freeze.digest, block, stage, input: hash(input) }), `${block}/${stage}: attempt binding mismatch`);
  requireMatch(hash(readJson(join(dir, "input.json"))) === hash(input), `${block}/${stage}: input snapshot mismatch`);
  return { result: null, reconciliation };
}

/** Receipt files a store holds, checked by name and content hash. */
async function storeReceipts(dir: string): Promise<Map<Digest, RunReceipt>> {
  const receipts = new Map<Digest, RunReceipt>();
  if (!existsSync(join(dir, "runs"))) return receipts;
  const store = new FileStore(dir);
  const names = readdirSync(join(dir, "runs")).sort();
  requireMatch(names.length <= MAX_STORE_RECEIPTS, "invalid store receipt count");
  for (const name of names) {
    const match = RECEIPT_FILE.exec(name);
    requireMatch(match !== null, "unexpected receipt path");
    const digest = `sha256:${match[1]}` as Digest;
    const raw = await store.getReceipt(digest);
    requireMatch(raw !== undefined && hash(raw) === digest, `receipt hash mismatch ${digest}`);
    const receipt = parseRunReceipt(raw);
    requireMatch(receipt.digest === receiptDigest(receipt), "receipt inner digest mismatch");
    receipts.set(digest, receipt);
  }
  return receipts;
}

/** The cost of receipts no account names, charged the way `accountCost`
 * charges an admission: every receipt is one run and one attempt per agent
 * call, and one missing usage makes the token totals unknown. */
function receiptCost(receipt: RunReceipt): StudyCost {
  const cost = zeroCost();
  cost.workUnits = receipt.work.units;
  cost.admittedRuns = 1;
  cost.modelCalls = receipt.work.agentCalls;
  for (const effect of receipt.effects) {
    if (effect.usage?.tokensIn === undefined) cost.tokensIn = null;
    else if (cost.tokensIn !== null) cost.tokensIn += effect.usage.tokensIn;
    if (effect.usage?.tokensOut === undefined) cost.tokensOut = null;
    else if (cost.tokensOut !== null) cost.tokensOut += effect.usage.tokensOut;
    if (effect.usage?.tokensIn === undefined || effect.usage?.tokensOut === undefined) cost.effectsMissingUsage++;
  }
  const unrecorded = Math.max(0, receipt.work.agentCalls - receipt.effects.length);
  if (unrecorded > 0) {
    cost.tokensIn = null; cost.tokensOut = null; cost.effectsMissingUsage += unrecorded;
  }
  return cost;
}
async function unreferencedReceiptCost(dir: string, freeze: FrozenIdentity, referenced: ReadonlySet<Digest>): Promise<{ cost: StudyCost; receipts: number }> {
  const receipts = await storeReceipts(dir);
  const extra = [...receipts].filter(([digest]) => !referenced.has(digest));
  const runs: HabitatRun[] = extra.map(([digest, receipt]) => ({ manifest: receipt.manifestDigest, receipt: digest,
    ceiling: { work: receipt.work.units, attempts: receipt.work.agentCalls }, charged: { work: receipt.work.units, attempts: receipt.work.agentCalls } }));
  await verifyObservedRoute(new FileStore(dir), runs, Buffer.from(JSON.stringify({ executor: freeze.route })));
  return { cost: addCosts(...extra.map(([, receipt]) => receiptCost(receipt))), receipts: receipts.size };
}

export async function inspectSeed(study: string, freeze: FrozenIdentity, block: StudyBlock): Promise<SeedEvidence> {
  const { result, reconciliation } = closedStage(study, freeze, block.id, "seed", seedInput(block));
  const dir = storePath(study, block.id, "seed");
  const store = new FileStore(dir);
  let summary: SeedSummary;
  if (reconciliation === null) summary = result as SeedSummary;
  else {
    // A reconciled search closes from the latest retained snapshot that
    // verifies. The record names it and counts the store's receipts, no
    // retained snapshot is terminal (the search never closed on its own), and
    // every later snapshot is a thrown-error one that does not verify:
    // nothing completed after the closing, so a record naming an early
    // snapshot cannot hide later attempts. A later in-progress snapshot is
    // never tolerated: the driver writes one only at a consistent point, so
    // one that does not verify means the store was damaged, not that the
    // search stopped earlier.
    requireMatch(reconciliation.snapshot !== null && reconciliation.storeReceipts !== null,
      `${block.id}/seed: reconciliation must name a retained snapshot and its store receipt count`);
    const snapshots = retainedSeedSnapshots(join(study, block.id, "attempts", "seed"), `${block.id}/seed`);
    const terminal = snapshots.find(snapshot => snapshot.terminal);
    requireMatch(terminal === undefined, `${block.id}/seed: retained snapshot already terminated as ${String(terminal?.summary.termination)}; the search closed on its own`);
    const index = snapshots.findIndex(snapshot => snapshot.digest === reconciliation.snapshot);
    requireMatch(index >= 0, `${block.id}/seed: reconciliation names no retained snapshot`);
    for (const later of snapshots.slice(0, index)) {
      requireMatch(await closingFailure(later, block, store) !== null, `${block.id}/seed: a later retained snapshot verifies; the reconciliation closed the search early`);
      requireMatch(later.summary.termination === "interrupted", `${block.id}/seed: a later in-progress snapshot does not verify; the store is damaged`);
    }
    summary = result !== null ? result as SeedSummary : { ...snapshots[index]!.summary, termination: "interrupted", qualified: false } as unknown as SeedSummary;
    requireMatch(summary.termination === "interrupted" && summary.qualified === false, `${block.id}/seed: reconciled seed must close as interrupted`);
  }
  const first = seedTask(block);
  const account = await verifySeedEvidence(summary, first, store, reconciliation === null ? null : { snapshot: reconciliation.snapshot! });
  if (reconciliation !== null) await requireOpenAfter(dir, summary.attempts.length, `${block.id}/seed`);
  requireMatch(summary.blockId === block.id && summary.protocol === PROTOCOL_DIGEST && summary.corpus === block.id, "seed protocol/block mismatch");
  requireMatch(summary.maxGenerations === SEED_MAX_GENERATIONS && hash(account.limits) === hash(SEED_BUDGET), "seed ceilings differ from the frozen protocol");
  await verifyObservedRoute(store, account.runs, Buffer.from(JSON.stringify({ executor: freeze.route })));
  const unreferenced = await unreferencedReceiptCost(dir, freeze, new Set(account.runs.map(run => run.receipt)));
  if (reconciliation !== null) requireMatch(reconciliation.storeReceipts === unreferenced.receipts, `${block.id}/seed: store receipts differ from the reconciliation record`);
  if (reconciliation === null) requireMatch(unreferenced.cost.admittedRuns === 0, `${block.id}/seed: a closed search left receipts its account does not name`);
  return { summary, reconciled: reconciliation !== null, cost: await accountCost(store, account), unreferenced: unreferenced.cost,
    catalog: summary.catalog === null ? null : await storedValue(store, summary.catalog),
    manifest: summary.manifest === null ? null : manifestToJson(await storedManifest(store, summary.manifest)),
  };
}

export function truthFor(tasks: ExperimentTaskSpec[]): Map<string, StudyTruth> {
  return new Map(tasks.map(task => [task.taskId, { out: taskTruth(task).out!, source: {
    digest: task.digest, phase: task.phase, spec: taskSpecData(task),
    args: taskBatchArgs(task, task.inputs.find(batch => batch.split === "holdout")!),
  } }]));
}

export function fixedConfig(manifest: JsonValue, tasks: ExperimentTaskSpec[]): JsonObject {
  return {
    contract: "algal.experiment.config.v1",
    arm: { contract: "algal.experiment-arm.v1", arm: "fixed", family: "record-triage", budget: ARM_BUDGET, manifest },
    tasks: tasks.map(task => ({ taskId: task.taskId, phase: task.phase, spec: taskSpecData(task),
      args: taskBatchArgs(task, task.inputs.find(batch => batch.split === "holdout")!),
      ...(task.phase === "shift" ? {} : { expect: taskTruth(task) }),
    })),
  } as unknown as JsonObject;
}

export async function inspectSession(study: string, freeze: FrozenIdentity, block: StudyBlock, stage: string,
  config: JsonObject, tasks: ExperimentTaskSpec[]): Promise<SessionSummary> {
  const { result, reconciliation } = closedStage(study, freeze, block.id, stage, config);
  const dir = storePath(study, block.id, stage);
  if (reconciliation !== null) {
    if (result !== null) {
      const closed = asObject(result, "reconciled stage result");
      requireMatch(closed.session === null && closed.reconciliation === hash(reconciliation), `${block.id}/${stage}: reconciled stage carries a session`);
    }
    // A learning store starts as a copy of the seed store; those receipts are
    // the seed's charge, not this stage's.
    const copied = stage.startsWith("learning-") ? new Set((await storeReceipts(storePath(study, block.id, "seed"))).keys()) : new Set<Digest>();
    const left = await unreferencedReceiptCost(dir, freeze, copied);
    if (reconciliation.storeReceipts !== null) requireMatch(reconciliation.storeReceipts === left.receipts, `${block.id}/${stage}: store receipts differ from the reconciliation record`);
    return { session: null, outcome: "interrupted", observed: 0, head: null, cost: left.cost, counts: emptyCounts(), reconciled: true };
  }
  const sessionDigest = asDigest(asObject(result, "stage result").session, "session");
  const store = new FileStore(dir);
  const session = parseExperimentSession(await storedValue(store, sessionDigest));
  const scores = await gradeStudy(store, truthFor(tasks), config, sessionDigest);
  const reportPath = join(study, block.id, "attempts", stage, "report.json");
  if (!existsSync(reportPath)) {
    const report = await buildExperimentReport(dir, {
      contract: "algal.skill-experiment.config.v1", study: STUDY_ID, arms: [{ session: sessionDigest }],
    });
    writeNew(reportPath, report);
  }
  const report = asObject(readJson(reportPath), "native report");
  requireMatch(Array.isArray(report.arms) && report.arms.length === 1 && asObject(report.arms[0], "report arm").session === sessionDigest, "report/session mismatch");
  const verified = await verifyExperimentReport(report, dir);
  requireMatch(verified.ok && verified.uncited === 0, `native session verification failed: ${verified.mismatches.join("; ")}`);
  const account = parseHabitatBudget(await storedValue(store, session.budget));
  await verifyObservedRoute(store, account.runs, Buffer.from(JSON.stringify({ executor: freeze.route })));
  const arm = asObject(config.arm, "arm config");
  if (arm.arm === "fixed") {
    const expectedManifest = hash(arm.manifest);
    requireMatch(account.runs.every(run => run.manifest === expectedManifest), "fixed account ran a different manifest");
    for (const row of session.tasks) {
      const run = parseExperimentRun(await storedValue(store, row.run));
      requireMatch(run.manifest === expectedManifest || run.manifest === null && run.receipt === null && run.outcome !== "complete", "fixed task ran a different manifest");
    }
  }
  const catalog = parseExperimentCatalog(await storedValue(store, session.catalog));
  const head = arm.arm === "fixed" ? hash(arm.manifest) : [...catalog.entries].reverse().find(entry => entry.retired === undefined)?.manifest ?? null;
  if (head !== null) await storedManifest(store, head);
  return { session: sessionDigest, outcome: session.outcome, observed: session.tasks.length, head, cost: await accountCost(store, account), counts: scores.groups.all, reconciled: false };
}

/** One launched search, closed by itself or by `reconcile`. */
export type PoolRow = { block: string; seed: SeedEvidence };
export type PoolStatus = "qualified" | "insufficient" | "in-progress";
export type PoolDecision = {
  launched: string[]; qualified: string[]; interrupted: string[]; unqualified: string[];
  /** The six lowest-index qualified blocks, or null until the pool is decided. */
  primary: string[] | null; qualifiedNotCompared: string[]; status: PoolStatus; reasons: string[];
  rates: { qualifiedPerLaunched: number | null; interruptedPerLaunched: number | null };
  poolAccountedCost: StudyCost; poolUnreferencedCost: StudyCost; poolCost: StudyCost;
};
const ratio = (n: number, d: number): number | null => d === 0 ? null : Math.round((n / d) * 1000) / 1000;
/** The pool gate over the closed launched searches. Rows arrive in protocol
 * order and must be an index prefix: the launcher never skips a block. Q at
 * least six decides `qualified`; sixteen launched with fewer decides
 * `insufficient`; anything else is still launching. */
export function poolDecision(rows: PoolRow[]): PoolDecision {
  requireMatch(rows.length <= POOL.launchCap, `more than ${POOL.launchCap} launched searches`);
  for (const [index, row] of rows.entries()) {
    requireMatch(row.block === POOL_BLOCK_IDS[index] && row.seed.summary.blockId === row.block, "launched searches must be a protocol-order prefix");
  }
  const launched = rows.map(row => row.block);
  const qualified = rows.filter(row => seedQualified(row.seed.summary)).map(row => row.block);
  const interrupted = rows.filter(row => row.seed.summary.termination === "interrupted").map(row => row.block);
  const unqualified = launched.filter(block => !qualified.includes(block) && !interrupted.includes(block));
  const reasons: string[] = [];
  let status: PoolStatus;
  if (qualified.length >= POOL.minimumQualified) status = "qualified";
  else if (launched.length === POOL.launchCap) {
    status = "insufficient";
    reasons.push(`fewer than ${POOL.minimumQualified} of ${POOL.launchCap} seed searches qualified`);
  } else {
    status = "in-progress";
    reasons.push(`pool still launching: ${launched.length} launched, ${qualified.length} qualified`);
  }
  const primary = status === "qualified" ? qualified.slice(0, POOL.primarySize) : null;
  const poolAccountedCost = addCosts(...rows.map(row => row.seed.cost));
  const poolUnreferencedCost = addCosts(...rows.map(row => row.seed.unreferenced));
  return { launched, qualified, interrupted, unqualified, primary, qualifiedNotCompared: primary === null ? [] : qualified.slice(POOL.primarySize), status, reasons,
    rates: { qualifiedPerLaunched: ratio(qualified.length, launched.length), interruptedPerLaunched: ratio(interrupted.length, launched.length) },
    poolAccountedCost, poolUnreferencedCost, poolCost: addCosts(poolAccountedCost, poolUnreferencedCost) };
}

export type LearningBlock = { block: string; seed: SeedEvidence; arms: Partial<Record<ArmName, SessionSummary>> };
export async function inspectLearning(study: string, freeze: FrozenIdentity, block: StudyBlock): Promise<LearningBlock> {
  const seed = await inspectSeed(study, freeze, block);
  const arms: LearningBlock["arms"] = {};
  if (seedQualified(seed.summary)) {
    const configs = buildStudyConfigs(block, seed.catalog, seed.manifest, seed.summary);
    for (const arm of ARMS) arms[arm] = await inspectSession(study, freeze, block, `learning-${arm}`, asObject(json(configs[arm]), "config"), learningTasks(block));
  }
  return { block: block.id, seed, arms };
}

export type PrimaryRow = { block: StudyBlock; learning: LearningBlock; frozen: Partial<Record<ArmName, SessionSummary>> };
export type BlockOutcome = "win" | "tie" | "loss" | "incomplete";
export type ComparisonStatus = "insufficient" | "descriptive-repeatability-rule-met" | "descriptive-repeatability-rule-not-met";
const LEARNING_TASKS = 40;
const FROZEN_TASKS = 8;
const HEADROOM_MAX_PASSED = 6;
const armComplete = (row: PrimaryRow, arm: ArmName): boolean => row.learning.arms[arm]?.outcome === "complete" &&
  row.learning.arms[arm]?.observed === LEARNING_TASKS && row.learning.arms[arm]?.counts.tasks === LEARNING_TASKS &&
  row.frozen[arm]?.outcome === "complete" && row.frozen[arm]?.observed === FROZEN_TASKS && row.frozen[arm]?.counts.tasks === FROZEN_TASKS;
/** Strict win versus fixed on a block where both arms are complete. */
function blockOutcome(row: PrimaryRow, arm: ArmName): BlockOutcome {
  if (!armComplete(row, "fixed") || !armComplete(row, arm)) return "incomplete";
  const fixed = row.frozen.fixed!.counts.scorerPassed;
  const passed = row.frozen[arm]!.counts.scorerPassed;
  return passed > fixed ? "win" : passed === fixed ? "tie" : "loss";
}
function tally(rows: PrimaryRow[], arm: ArmName) {
  const outcomes = rows.map(row => blockOutcome(row, arm));
  return { complete: outcomes.every(outcome => outcome !== "incomplete"),
    wins: outcomes.filter(outcome => outcome === "win").length, ties: outcomes.filter(outcome => outcome === "tie").length,
    losses: outcomes.filter(outcome => outcome === "loss").length, passed: rows.reduce((n, row) => n + (row.frozen[arm]?.counts.scorerPassed ?? 0), 0) };
}
/** The primary rule over the six primary blocks: coverage, at least five
 * strict wins, and a strict aggregate over the 48 frozen tasks. Ties are
 * non-wins. A reconciled fixed or optimizer stage fails coverage. Retained
 * and optimizer-raw are read the same way and decide nothing. */
export function comparison(rows: PrimaryRow[], poolCost: StudyCost) {
  const ordered = [...rows].sort((a, b) => blockIndex(a.block.id) - blockIndex(b.block.id));
  const missing: string[] = [];
  if (ordered.length !== POOL.primarySize || new Set(ordered.map(row => row.block.id)).size !== ordered.length) missing.push(`${POOL.primarySize} distinct primary blocks`);
  for (const row of ordered) {
    if (!seedQualified(row.learning.seed.summary)) missing.push(`${row.block.id}/seed`);
    for (const arm of ["fixed", "optimizer"] as const) {
      for (const stage of ["learning", "frozen"] as const) {
        const session = stage === "learning" ? row.learning.arms[arm] : row.frozen[arm];
        const observed = stage === "learning" ? LEARNING_TASKS : FROZEN_TASKS;
        if (session?.outcome !== "complete" || session.observed !== observed || session.counts.tasks !== observed) missing.push(`${row.block.id}/${stage}-${arm}`);
      }
    }
  }
  const coverage = { complete: missing.length === 0, missing };
  const primary = tally(ordered, "optimizer");
  const fixedPassed = ordered.reduce((n, row) => n + (row.frozen.fixed?.counts.scorerPassed ?? 0), 0);
  const aggregate = { optimizer: primary.passed, fixed: fixedPassed, plannedTasks: POOL.frozenTasksPrimary, strict: primary.passed > fixedPassed };
  const blocks = ordered.map(row => ({ block: row.block.id, index: blockIndex(row.block.id),
    fixed: armComplete(row, "fixed") ? row.frozen.fixed!.counts.scorerPassed : null,
    optimizer: armComplete(row, "optimizer") ? row.frozen.optimizer!.counts.scorerPassed : null,
    outcome: blockOutcome(row, "optimizer"),
    headroom: armComplete(row, "fixed") ? row.frozen.fixed!.counts.scorerPassed <= HEADROOM_MAX_PASSED : null }));
  const secondary = Object.fromEntries(COMPARISON.secondaryArms.map(arm => [arm, tally(ordered, arm)])) as Record<typeof COMPARISON.secondaryArms[number], ReturnType<typeof tally>>;
  const armCost = (arm: ArmName) => addCosts(...ordered.flatMap(row => [row.learning.arms[arm]?.cost ?? zeroCost(), row.frozen[arm]?.cost ?? zeroCost()]));
  const arms = Object.fromEntries(ARMS.map(arm => {
    const passed = ordered.reduce((n, row) => n + (row.frozen[arm]?.counts.scorerPassed ?? 0), 0);
    const cost = armCost(arm);
    return [arm, { passed, planned: POOL.frozenTasksPrimary, cost, workPerPassedTask: passed === 0 ? null : cost.workUnits / passed }];
  })) as Record<ArmName, { passed: number; planned: number; cost: StudyCost; workPerPassedTask: number | null }>;
  const met = coverage.complete && primary.wins >= POOL.winsRequired && aggregate.strict;
  const comparisonCost = addCosts(...ARMS.map(armCost));
  return { status: (!coverage.complete ? "insufficient" : met ? "descriptive-repeatability-rule-met" : "descriptive-repeatability-rule-not-met") as ComparisonStatus,
    primaryContrast: "optimizer versus fixed", plannedBlocks: POOL.primarySize, observedBlocks: rows.length, coverage,
    wins: primary.wins, ties: primary.ties, losses: primary.losses, winsRequired: POOL.winsRequired, tiesWin: COMPARISON.tiesWin, aggregate, blocks,
    headroomBlocks: blocks.filter(block => block.headroom === true).length, headroomRule: PROTOCOL.pool.headroom,
    secondary, secondaryComplete: COMPARISON.secondaryArms.every(arm => secondary[arm].complete), arms,
    workRatio: { optimizerToFixed: arms.fixed.cost.workUnits === 0 ? null : arms.optimizer.cost.workUnits / arms.fixed.cost.workUnits,
      scope: "learning and frozen work of each arm; the shared seed search is in poolCost" },
    nullTail: PROTOCOL.pool.nullTail, poolCost, comparisonCost, totalRealizedCost: addCosts(poolCost, comparisonCost),
    interpretation: "Descriptive comparisons of fresh draws from one synthetic template family, conditional on seed qualification; not statistical significance, distinct task domains, or matched spend.",
  };
}

// --- Preregistered offline analyses over stored seed receipts ---------------

/** What one attempt's stored evidence yields: the selection report's train
 * and validation readings when the candidate was evaluated, and the
 * development receipt's reading when it was scored. */
export type AttemptReading = { generation: number; round: RoundMode; mode: "generate" | "revise"; selection: SelectionDiagnostics | null; development: CaseDiagnostics | null };
export type AttemptAccuracy = {
  generation: number; round: RoundMode; mode: "generate" | "revise"; executed: boolean;
  trainExactRows: number | null; trainRows: number; trainSummaryExact: boolean | null;
  validationExactRows: number | null; validationRows: number; validationSummaryExact: boolean | null;
  validationMissedRecordIds: string[];
  labelsCorrect: { train: number | null; validation: number | null; development: number | null };
};
export type SearchAccuracy = {
  block: string; index: number; termination: SeedSummary["termination"]; qualified: boolean;
  generations: number; executedGenerations: number;
  maxExactValidationRows: number | null;
  /** Validation record ids missed on every executed generation; empty when none executed. */
  persistentMisses: string[];
  firstGenerationAtOrAbove: { 11: number | null; 10: number | null };
  perLabelSummaryDeclared: boolean;
  attempts: AttemptAccuracy[];
};
const MAX_ATTEMPT_ROWS = 64;
function rowCount(batch: { expect: { out: { results: unknown[] } } } | undefined, at: string): number {
  requireMatch(batch !== undefined, `${at}: batch absent`);
  const rows = batch.expect.out.results.length;
  requireMatch(rows >= 1 && rows <= MAX_ATTEMPT_ROWS, `${at}: invalid row count`);
  return rows;
}
/** Pure: the per-search table from per-attempt readings, with the equality of
 * arms/v5/grade.ts carried by the seed module's diagnostics. Attempts arrive
 * in generation order; an attempt without a selection report executed no
 * evaluated candidate. */
export function searchAccuracy(block: StudyBlock, summary: Pick<SeedSummary, "termination" | "qualified">, first: ExperimentTaskSpec, readings: AttemptReading[]): SearchAccuracy {
  requireMatch(readings.length <= SEED_MAX_GENERATIONS, `${block.id}: too many attempt readings`);
  const trainRows = rowCount(first.inputs.find(batch => batch.split === "train"), `${block.id} train`);
  const validationRows = rowCount(first.inputs.find(batch => batch.split === "validation"), `${block.id} validation`);
  const validationIds = first.inputs.find(batch => batch.split === "validation")!.expect.out.results.map(row => row.recordId);
  const attempts = readings.map((reading, index): AttemptAccuracy => {
    requireMatch(reading.generation === index + 1, `${block.id}: attempt readings out of generation order`);
    const { selection, development } = reading;
    if (selection !== null) requireMatch(selection.train.total === trainRows && selection.validation.total === validationRows, `${block.id}: selection rows differ from the seed task`);
    return { generation: reading.generation, round: reading.round, mode: reading.mode, executed: selection !== null,
      trainExactRows: selection?.train.exactRows ?? null, trainRows, trainSummaryExact: selection?.train.summaryExact ?? null,
      validationExactRows: selection?.validation.exactRows ?? null, validationRows, validationSummaryExact: selection?.validation.summaryExact ?? null,
      validationMissedRecordIds: selection === null ? [] : [...selection.validation.missedRecordIds],
      labelsCorrect: { train: selection?.train.labelsCorrect ?? null, validation: selection?.validation.labelsCorrect ?? null, development: development?.labelsCorrect ?? null } };
  });
  const executed = attempts.filter(attempt => attempt.executed);
  const exactRows = executed.map(attempt => attempt.validationExactRows!);
  const firstAtOrAbove = (rows: number) => executed.find(attempt => attempt.validationExactRows! >= rows)?.generation ?? null;
  return { block: block.id, index: blockIndex(block.id), termination: summary.termination, qualified: summary.qualified,
    generations: attempts.length, executedGenerations: executed.length,
    maxExactValidationRows: exactRows.length === 0 ? null : Math.max(...exactRows),
    persistentMisses: executed.length === 0 ? [] : validationIds.filter(id => executed.every(attempt => attempt.validationMissedRecordIds.includes(id))),
    firstGenerationAtOrAbove: { 11: firstAtOrAbove(11), 10: firstAtOrAbove(10) },
    perLabelSummaryDeclared: first.outputFormat.summaries.includes("perLabel"), attempts };
}

export type OfflineAnalyses = {
  contract: "algal.study-offline.v1"; searches: SearchAccuracy[];
  /** The reading's split over searches that closed without qualifying. */
  unqualified: { searches: number; singlePersistentMissReaching11: number; multipleMissesBelow11: number; other: number };
  reading: string;
};
/** Pure: the preregistered reading over every launched search. Never a gate. */
export function offlineSummary(searches: SearchAccuracy[]): OfflineAnalyses {
  requireMatch(searches.length <= POOL.launchCap, "too many searches");
  const unqualified = searches.filter(search => !search.qualified);
  const reaching11 = (search: SearchAccuracy) => search.maxExactValidationRows !== null && search.maxExactValidationRows >= 11;
  const single = unqualified.filter(search => search.persistentMisses.length === 1 && reaching11(search)).length;
  const multiple = unqualified.filter(search => search.persistentMisses.length >= 2 && !reaching11(search)).length;
  return { contract: "algal.study-offline.v1", searches,
    unqualified: { searches: unqualified.length, singlePersistentMissReaching11: single, multipleMissesBelow11: multiple, other: unqualified.length - single - multiple },
    reading: PROTOCOL.comparison.offlineReading };
}

/** Reads one attempt's stored report and development receipt back into the
 * two diagnostics. The report and record are bound to their receipts by
 * `verifySeedEvidence`, which every inspected seed has already passed. */
async function attemptReading(store: FileStore, first: ExperimentTaskSpec, attempt: SeedSummary["attempts"][number]): Promise<AttemptReading> {
  const selection = attempt.report === null ? null : selectionDiagnostics(await storedValue(store, attempt.report));
  let development: CaseDiagnostics | null = null;
  if (attempt.developmentRecord !== null) {
    const record = asObject(await storedValue(store, attempt.developmentRecord), "development record");
    if (record.receipt !== null) {
      requireMatch(attempt.manifest !== null, "development run without a candidate manifest");
      const raw = await store.getReceipt(asDigest(record.receipt, "development receipt"));
      requireMatch(raw !== undefined && hash(raw) === record.receipt, `missing or mismatched development receipt ${record.receipt}`);
      const receipt = parseRunReceipt(raw);
      const manifest = await storedManifest(store, attempt.manifest);
      const c = developmentCase(first);
      development = caseDiagnostics({ expect: c.expect, outputs: receipt.outcome === "complete" ? manifestOutputs(manifest, receipt.cells) : null }, "development case");
    }
  }
  return { generation: attempt.generation, round: attempt.round, mode: attempt.mode, selection, development };
}
export async function offlineAnalyses(study: string, freeze: FrozenIdentity, rows: PoolRow[]): Promise<OfflineAnalyses> {
  requireMatch(existsSync(join(study, "freeze.json")) && hash(readJson(join(study, "freeze.json"))) === hash(freeze), "offline analyses need the frozen study");
  const searches: SearchAccuracy[] = [];
  for (const row of rows) {
    const block = PROTOCOL.blocks[blockIndex(row.block)]!;
    const first = seedTask(block);
    const store = new FileStore(storePath(study, block.id, "seed"));
    const readings: AttemptReading[] = [];
    for (const attempt of row.seed.summary.attempts) readings.push(await attemptReading(store, first, attempt));
    searches.push(searchAccuracy(block, row.seed.summary, first, readings));
  }
  return offlineSummary(searches);
}
