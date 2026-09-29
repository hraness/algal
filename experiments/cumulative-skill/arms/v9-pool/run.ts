// One owner runs each paid stage. Seed searches launch in protocol order and
// stop launching once six closed searches qualified; arms run only on the
// primary set the pool decision names. Completed stages are checked before
// reuse; an incomplete attempt is retained and stops progress until
// `reconcile` closes it as interrupted without a provider call.
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { asDigest, type Digest } from "../../../../src/digest";
import { parseExperimentArm, parseExperimentCatalog, parseExperimentTaskSet, runExperimentArm } from "../../../../src/experiment-run";
import type { Executor } from "../../../../src/effects";
import { builtinRegistry } from "../../../../src/registry";
import { FileStore } from "../../../../src/store";
import { asArray, asObject, asString, type JsonObject, type JsonValue } from "../../../../src/values";
import { defaultExecutor } from "../v5/evidence";
import { storedManifest } from "../v5/evidence-support";
import { manifestToJson } from "../../../../src/contract";
import { buildStudyConfigs } from "./build";
import { checkFreeze, freezeStudy, hash, readJson, requireMatch, ROOT, ROUTE, startStage, writeNew, type FrozenIdentity } from "./guards";
import { ARMS, BLOCKS, blockById, POOL, POOL_CONTRACT, PROTOCOL, PROTOCOL_DIGEST, RECONCILIATION_CONTRACT, RESULT_CONTRACT,
  generateBlock, learningTasks, frozenHoldoutTasks, seedTask, type StudyBlock } from "./protocol";
import { generateStudySeed, verifySeedEvidence, type SeedSummary } from "./seed";
import { closingFailure, comparison, fixedConfig, inspectLearning, inspectSeed, inspectSession, offlineAnalyses, parseReconciliation, poolDecision,
  retainedSeedSnapshots, seedInput, seedQualified, selfClosedSnapshot, stageDone, storePath,
  type LearningBlock, type PoolRow, type PrimaryRow, type RetainedSnapshot, type SeedEvidence } from "./results";

const json = (value: unknown): JsonValue => value as JsonValue;
export const datasets = () => PROTOCOL.blocks.map(block => ({ block: block.id, ...generateBlock(block) }));

/** The nine stores a block can hold: its seed search and four arms twice. */
export const STAGE_PATTERN = new RegExp(`^(?:seed|learning-(?:${ARMS.join("|")})|frozen-(?:${ARMS.join("|")}))$`);
export type StageKind = "seed" | "learning" | "frozen";
export function stageKind(stage: string): StageKind {
  requireMatch(STAGE_PATTERN.test(stage), `unknown stage ${stage}`);
  return stage === "seed" ? "seed" : stage.startsWith("learning-") ? "learning" : "frozen";
}
/** The plan's hard ceilings: sixteen seed searches, then four arms on six
 * primary blocks. The driver refuses any stage past them. */
export const CEILINGS: Record<StageKind, number> = { seed: POOL.launchCap, learning: POOL.primarySize * ARMS.length, frozen: POOL.primarySize * ARMS.length };
export type PoolRecord = { contract: typeof POOL_CONTRACT; freeze: Digest } & ReturnType<typeof poolDecision>;

export function stageCounts(study: string): Record<StageKind, number> {
  const counts: Record<StageKind, number> = { seed: 0, learning: 0, frozen: 0 };
  for (const block of BLOCKS) {
    const parent = join(study, block.id, "attempts");
    if (!existsSync(parent)) continue;
    for (const stage of readdirSync(parent).sort()) counts[stageKind(stage)] += 1;
  }
  return counts;
}
/** Only the recorded pool decision names the blocks an arm may run on; its
 * evidence is re-checked by `checkPool` before any arm is launched. */
function recordedPrimary(study: string): string[] {
  const path = join(study, "pool.json");
  requireMatch(existsSync(path), "no pool decision; arm stages run only after `seed` closed the pool");
  const pool = asObject(readJson(path), "pool decision");
  requireMatch(pool.contract === POOL_CONTRACT && pool.status === "qualified" && Array.isArray(pool.primary), "pool did not qualify; no arm stage may run");
  const primary = asArray(pool.primary, "pool primary").map(id => blockById(asString(id, "primary block", 8)).id);
  requireMatch(primary.length === POOL.primarySize && new Set(primary).size === POOL.primarySize, "pool primary set must name six distinct blocks");
  return primary;
}
export function checkCeilings(study: string, next?: { block: string; stage: string }): Record<StageKind, number> {
  const counts = stageCounts(study);
  for (const kind of Object.keys(CEILINGS) as StageKind[]) requireMatch(counts[kind] <= CEILINGS[kind], `${kind} stages exceed the plan ceiling of ${CEILINGS[kind]}`);
  if (next !== undefined) {
    const kind = stageKind(next.stage);
    requireMatch(counts[kind] < CEILINGS[kind], `${next.block}/${next.stage}: ${kind} stages reached the plan ceiling of ${CEILINGS[kind]}`);
    if (kind !== "seed") requireMatch(recordedPrimary(study).includes(next.block), `${next.block}/${next.stage}: arm stages run only on the six primary blocks`);
  }
  return counts;
}

export async function mapConcurrent<T>(items: T[], width: number, run: (item: T) => Promise<void>): Promise<void> {
  requireMatch(Number.isInteger(width) && width >= 1 && width <= 3, "concurrency must be 1..3");
  let next = 0;
  const errors: unknown[] = [];
  await Promise.all(Array.from({ length: Math.min(width, items.length) }, async () => {
    while (next < items.length && errors.length === 0) {
      const item = items[next++]!;
      try { await run(item); } catch (error) { errors.push(error); }
    }
  }));
  // All started effects have settled before the process can exit.
  if (errors.length) throw new AggregateError(errors, "a study lane failed; preserve its attempts before resuming");
}

export type LaunchStatus = "not-launched" | "qualified" | "not-qualified";
/** Launches items strictly in order on `width` lanes. Nothing launches once
 * `stopAfter` closed items are qualified or `cap` items have launched, and
 * every launched item runs to its own end, so the launched set is always an
 * index prefix. Items already closed are skipped, which makes a re-run resume. */
export async function launchInOrder<T>(items: T[], opts: { width: number; cap: number; stopAfter: number; status: (item: T) => LaunchStatus;
  launch: (item: T) => Promise<void> }): Promise<T[]> {
  requireMatch(Number.isInteger(opts.width) && opts.width >= 1 && opts.width <= 3, "concurrency must be 1..3");
  const launched = items.filter(item => opts.status(item) !== "not-launched");
  requireMatch(launched.length <= opts.cap, "launched items exceed the cap");
  const qualified = () => items.filter(item => opts.status(item) === "qualified").length;
  let next = 0;
  const errors: unknown[] = [];
  await Promise.all(Array.from({ length: Math.min(opts.width, items.length) }, async () => {
    while (errors.length === 0 && next < items.length && qualified() < opts.stopAfter && launched.length < opts.cap) {
      const item = items[next++]!;
      if (opts.status(item) !== "not-launched") continue;
      launched.push(item);
      try { await opts.launch(item); } catch (error) { errors.push(error); }
    }
  }));
  if (errors.length) throw new AggregateError(errors, "a seed lane failed; reconcile its attempt before resuming");
  return launched;
}

async function liveExecutor(): Promise<Executor> {
  requireMatch(Boolean(process.env[ROUTE.credentialEnv]), `${ROUTE.credentialEnv} must be set`);
  const { openAICompatibleExecutor } = await import("../../../../src/openai-compatible");
  return defaultExecutor(openAICompatibleExecutor(ROUTE));
}

export async function executeConfig(opts: {
  study: string; freeze: FrozenIdentity; block: StudyBlock; stage: string; config: JsonObject;
  executor: Executor; copySeed?: boolean;
}): Promise<void> {
  const { study, freeze, block, stage, config, executor } = opts;
  requireMatch(checkFreeze(study, PROTOCOL, datasets()).digest === freeze.digest, "stage freeze changed");
  const storeDir = storePath(study, block.id, stage);
  requireMatch(!existsSync(storeDir), `${block.id}/${stage}: store already exists; preserve its evidence`);
  checkCeilings(study, { block: block.id, stage });
  const attempt = startStage(study, freeze, block.id, stage, config);
  mkdirSync(join(study, "stores", block.id), { recursive: true });
  if (opts.copySeed) cpSync(storePath(study, block.id, "seed"), storeDir, { recursive: true, errorOnExist: true, force: false });
  const result = await runExperimentArm({
    arm: parseExperimentArm(config.arm), tasks: parseExperimentTaskSet({ contract: "algal.experiment-tasks.v1", tasks: config.tasks }).tasks,
    ...(config.catalog === undefined ? {} : { catalog: parseExperimentCatalog(config.catalog).entries }),
    store: new FileStore(storeDir), executors: [executor], fns: builtinRegistry(),
  });
  // Save the completed native session before derived grading or reports.
  writeNew(join(attempt, "result.json"), { session: result.sessionDigest });
  console.log(JSON.stringify({ block: block.id, stage, outcome: result.session.outcome, tasks: result.session.tasks.length }));
}

async function seedBlock(study: string, freeze: FrozenIdentity, block: StudyBlock): Promise<SeedEvidence> {
  if (!stageDone(study, block.id, "seed")) {
    requireMatch(checkFreeze(study, PROTOCOL, datasets()).digest === freeze.digest, "seed freeze changed");
    const executor = await liveExecutor();
    const storeDir = storePath(study, block.id, "seed");
    requireMatch(!existsSync(storeDir), `${block.id}: seed store exists without completed stage; reconcile before any provider call`);
    checkCeilings(study, { block: block.id, stage: "seed" });
    const attempt = startStage(study, freeze, block.id, "seed", seedInput(block));
    const result = await generateStudySeed({ first: seedTask(block), corpus: block.id, blockId: block.id,
      protocolDigest: PROTOCOL_DIGEST, store: new FileStore(storeDir), executors: [executor],
      onAttempt: summary => {
        const path = join(attempt, `seed-${hash(summary).slice(7)}.json`);
        if (!existsSync(path)) writeNew(path, summary);
      },
    });
    writeNew(join(attempt, "result.json"), result.summary);
    console.log(JSON.stringify({ block: block.id, stage: "seed", qualified: result.summary.qualified, generations: result.summary.attempts.length }));
  }
  return inspectSeed(study, freeze, block);
}

/** Every launched seed stage, closed by its search or by `reconcile`; an
 * unclosed one stops the study until it is reconciled. */
async function poolRows(study: string, freeze: FrozenIdentity): Promise<PoolRow[]> {
  const rows: PoolRow[] = [];
  for (const block of BLOCKS) {
    if (stageDone(study, block.id, "seed")) rows.push({ block: block.id, seed: await inspectSeed(study, freeze, block) });
    else requireMatch(!existsSync(join(study, block.id, "attempts", "seed")) && !existsSync(storePath(study, block.id, "seed")),
      `${block.id}: seed started without a result; reconcile before any provider call`);
  }
  return rows;
}
function poolRecord(freeze: FrozenIdentity, rows: PoolRow[]): PoolRecord {
  return { contract: POOL_CONTRACT, freeze: freeze.digest, ...poolDecision(rows) };
}

async function seedPool(study: string, freeze: FrozenIdentity): Promise<void> {
  const closed = new Map((await poolRows(study, freeze)).map(row => [row.block, row.seed]));
  const status = (block: StudyBlock): LaunchStatus => {
    const seed = closed.get(block.id);
    return seed === undefined ? "not-launched" : seedQualified(seed.summary) ? "qualified" : "not-qualified";
  };
  await launchInOrder(BLOCKS, { width: PROTOCOL.concurrency, cap: POOL.launchCap, stopAfter: POOL.minimumQualified, status,
    launch: async block => { closed.set(block.id, await seedBlock(study, freeze, block)); } });
  const rows = BLOCKS.flatMap(block => closed.has(block.id) ? [{ block: block.id, seed: closed.get(block.id)! }] : []);
  const record = poolRecord(freeze, rows);
  // The pool closes only when the launcher stopped for a reason the plan names.
  requireMatch(record.status !== "in-progress", `pool is still launching; resume \`seed\`: ${record.reasons.join("; ")}`);
  const path = join(study, "pool.json");
  if (existsSync(path)) requireMatch(hash(readJson(path)) === hash(record), "saved pool decision differs from evidence");
  else writeNew(path, record);
  console.log(JSON.stringify({ status: record.status, launched: record.launched.length, qualified: record.qualified.length, primary: record.primary }));
}

/** The recorded pool decision, re-derived from every launched seed's evidence. */
async function checkPool(study: string, freeze: FrozenIdentity): Promise<{ pool: PoolRecord; rows: PoolRow[] }> {
  requireMatch(existsSync(join(study, "pool.json")), "no pool decision; `seed` closes the pool before any arm or result");
  const rows = await poolRows(study, freeze);
  const pool = poolRecord(freeze, rows);
  requireMatch(hash(readJson(join(study, "pool.json"))) === hash(pool), "pool decision changed");
  return { pool, rows };
}
async function poolGate(study: string, freeze: FrozenIdentity): Promise<StudyBlock[]> {
  const { pool } = await checkPool(study, freeze);
  requireMatch(pool.status === "qualified" && pool.primary !== null, `pool did not qualify: ${pool.reasons.join("; ")}`);
  requireMatch(hash(pool.primary) === hash(recordedPrimary(study)), "primary set differs from the recorded pool");
  return pool.primary.map(blockById);
}

export type Reconciliation = {
  contract: typeof RECONCILIATION_CONTRACT; freeze: Digest; block: string; stage: string; input: Digest;
  termination: "interrupted"; snapshot: Digest | null; storeReceipts: number | null; retry: "none";
};
/** A seed search that closed on its own and was killed before its result was
 * written: `reconcile` recovers the result from the terminal snapshot and
 * writes no reconciliation record, so the search inspects as its own closing. */
export type SelfClosed = { block: string; stage: "seed"; termination: SeedSummary["termination"]; snapshot: Digest; storeReceipts: number };
/** Closes one started, unfinished stage as terminal `interrupted`. Writes the
 * reconciliation record and the stage result once, reads no credential, and
 * writes nothing to a store: a seed store is only read, to choose a snapshot
 * that verifies. A close is two writes; a record left without its result by
 * a kill between them is finished from the same evidence, which must agree
 * with the record byte for byte. */
export async function reconcileStage(study: string, freeze: FrozenIdentity, blockId: string, stage: string): Promise<Reconciliation | SelfClosed> {
  const studyBlock = blockById(blockId);
  const block = studyBlock.id;
  stageKind(stage);
  const dir = join(study, block, "attempts", stage);
  requireMatch(existsSync(join(dir, "binding.json")), `${block}/${stage}: never started; nothing to reconcile`);
  requireMatch(!existsSync(join(dir, "result.json")), `${block}/${stage}: already closed; its result stands`);
  const existing = existsSync(join(dir, "reconciliation.json")) ? parseReconciliation(readJson(join(dir, "reconciliation.json")), `${block}/${stage} reconciliation`) : null;
  const binding = asObject(readJson(join(dir, "binding.json")), "attempt binding");
  requireMatch(binding.contract === "algal.study-stage.v1" && binding.freeze === freeze.digest && binding.block === block && binding.stage === stage,
    `${block}/${stage}: attempt binding mismatch`);
  const input = asDigest(binding.input, "attempt input");
  const runs = join(storePath(study, block, stage), "runs");
  const storeReceipts = !existsSync(storePath(study, block, stage)) ? null
    : existsSync(runs) ? readdirSync(runs).filter(name => /^[a-f0-9]{64}\.json$/.test(name)).length : 0;
  let snapshot: Digest | null = null;
  let result: unknown;
  if (stage === "seed") {
    // The search saved its summary before every writer call, on a thrown
    // error, and when it closed on its own, so an interrupted search leaves
    // its last plan as evidence and a killed one leaves its closing. A
    // terminal snapshot is that closing: it must verify as a finished search
    // whose account names every receipt in the store, and it becomes the
    // result with no reconciliation record. Otherwise the closed summary is
    // the latest retained snapshot that verifies against the store, with the
    // terminal marker; the seed verifier checks it against `snapshot` byte
    // for byte and `inspectSeed` re-checks that no later snapshot verifies.
    // Only the thrown-error snapshot may be skipped, when the error left it
    // unverifiable (a pushed attempt without its development score, or a
    // charge for an attempt never pushed); an in-progress snapshot that does
    // not verify means the store is damaged, and nothing earlier may close.
    const snapshots = retainedSeedSnapshots(dir, `${block}/seed`);
    requireMatch(snapshots.length > 0, `${block}/seed: no retained seed snapshot to close`);
    requireMatch(storeReceipts !== null, `${block}/seed: no seed store beside the retained snapshots`);
    const store = new FileStore(storePath(study, block, stage));
    const own = selfClosedSnapshot(snapshots, `${block}/seed`);
    if (own !== null) {
      requireMatch(existing === null, `${block}/seed: a reconciliation record stands beside a search that closed on its own`);
      const summary = own.summary as unknown as SeedSummary;
      const account = await verifySeedEvidence(summary, seedTask(studyBlock), store);
      requireMatch(new Set(account.runs.map(run => run.receipt)).size === storeReceipts, `${block}/seed: the closed search left receipts its account does not name`);
      writeNew(join(dir, "result.json"), own.summary);
      console.log(JSON.stringify({ block, stage, termination: summary.termination, storeReceipts, reconciled: false }));
      return { block, stage: "seed", termination: summary.termination, snapshot: own.digest, storeReceipts };
    }
    const failures: string[] = [];
    let chosen: RetainedSnapshot | undefined;
    for (const candidate of snapshots) {
      const failure = await closingFailure(candidate, studyBlock, store);
      if (failure === null) { chosen = candidate; break; }
      requireMatch(candidate.summary.termination === "interrupted", `${block}/seed: retained in-progress snapshot does not verify: ${failure}`);
      failures.push(`${candidate.digest.slice(0, 19)}: ${failure}`);
    }
    requireMatch(chosen !== undefined, `${block}/seed: no retained snapshot verifies: ${failures.join("; ")}`);
    snapshot = chosen.digest;
    result = { ...chosen.summary, termination: "interrupted" };
  }
  const record: Reconciliation = { contract: RECONCILIATION_CONTRACT, freeze: freeze.digest, block, stage, input,
    termination: "interrupted", snapshot, storeReceipts, retry: "none" };
  if (existing === null) writeNew(join(dir, "reconciliation.json"), record);
  else requireMatch(hash(existing) === hash(record), `${block}/${stage}: the saved reconciliation record differs from the evidence`);
  writeNew(join(dir, "result.json"), result ?? { session: null, reconciliation: hash(record) });
  console.log(JSON.stringify({ block, stage, termination: record.termination, storeReceipts, reconciled: true }));
  return record;
}

export async function learn(study: string, freeze: FrozenIdentity): Promise<void> {
  const primary = await poolGate(study, freeze);
  requireMatch(!existsSync(join(study, "heads.json")), "learning heads already frozen");
  await mapConcurrent(primary, PROTOCOL.concurrency, async block => {
    const seed = await inspectSeed(study, freeze, block);
    const configs = buildStudyConfigs(block, seed.catalog, seed.manifest, seed.summary);
    for (const arm of block.armOrder) {
      const config = asObject(json(configs[arm]), "learning config");
      const stage = `learning-${arm}`;
      if (!stageDone(study, block.id, stage)) await executeConfig({ study, freeze, block, stage, config, executor: await liveExecutor(), copySeed: true });
      await inspectSession(study, freeze, block, stage, config, learningTasks(block));
    }
  });
  await freezeHeads(study, freeze, primary);
}

async function freezeHeads(study: string, freeze: FrozenIdentity, primary: StudyBlock[]): Promise<LearningBlock[]> {
  const blocks: LearningBlock[] = [];
  // Every primary block's every arm must have a closed native record
  // (complete, exhausted, or reconciled) before any true final task runs.
  // heads.v2: the rows carry `reconciled` on every session and seed and
  // `unreferenced` on the seed, so the v8 heads.v1 id is not reused.
  for (const block of primary) blocks.push(await inspectLearning(study, freeze, block));
  const plan = { contract: "algal.study-heads.v2", freeze: freeze.digest, blocks };
  const path = join(study, "heads.json");
  if (existsSync(path)) requireMatch(hash(readJson(path)) === hash(plan), "learning evidence differs from frozen heads");
  else writeNew(path, plan);
  return blocks;
}

async function evaluate(study: string, freeze: FrozenIdentity): Promise<void> {
  const primary = await poolGate(study, freeze);
  requireMatch(existsSync(join(study, "heads.json")), "all learning heads must be saved before evaluation");
  const heads = await freezeHeads(study, freeze, primary);
  await mapConcurrent(primary, PROTOCOL.concurrency, async block => {
    const learning = heads.find(row => row.block === block.id)!;
    for (const arm of block.armOrder) {
      const head = learning.arms[arm]?.head;
      if (head === null || head === undefined) continue;
      const sourceStore = new FileStore(storePath(study, block.id, `learning-${arm}`));
      const config = fixedConfig(manifestToJson(await storedManifest(sourceStore, head)), frozenHoldoutTasks(block));
      const stage = `frozen-${arm}`;
      if (!stageDone(study, block.id, stage)) await executeConfig({ study, freeze, block, stage, config, executor: await liveExecutor() });
      await inspectSession(study, freeze, block, stage, config, frozenHoldoutTasks(block));
    }
  });
  await collect(study, freeze);
}

export async function collect(study: string, freeze: FrozenIdentity): Promise<unknown> {
  const { pool, rows: seeds } = await checkPool(study, freeze);
  const duplicateWriterRequests = seeds.reduce((n, row) => n + row.seed.summary.duplicateRequests, 0);
  // Preregistered receipts-only analyses over every launched search; no verdict depends on them.
  const offline = await offlineAnalyses(study, freeze, seeds);
  let result: unknown;
  if (pool.status === "insufficient") {
    const counts = checkCeilings(study);
    requireMatch(counts.learning === 0 && counts.frozen === 0, "arm work exists after an insufficient pool");
    result = { contract: RESULT_CONTRACT, freeze: freeze.digest, status: "insufficient", pool, primaryClaim: null,
      plannedPrimaryBlocks: POOL.primarySize, observedPrimaryBlocks: 0, duplicateWriterRequests, offline, totalRealizedCost: pool.poolCost };
  } else {
    const primary = await poolGate(study, freeze);
    const heads = await freezeHeads(study, freeze, primary);
    const rows: PrimaryRow[] = [];
    for (const block of primary) {
      const learning = heads.find(row => row.block === block.id)!;
      const frozen: PrimaryRow["frozen"] = {};
      for (const arm of block.armOrder) {
        const head = learning.arms[arm]?.head;
        if (head === undefined || head === null) continue;
        const sourceStore = new FileStore(storePath(study, block.id, `learning-${arm}`));
        const config = fixedConfig(manifestToJson(await storedManifest(sourceStore, head)), frozenHoldoutTasks(block));
        frozen[arm] = await inspectSession(study, freeze, block, `frozen-${arm}`, config, frozenHoldoutTasks(block));
      }
      rows.push({ block, learning, frozen });
    }
    const summary = comparison(rows, pool.poolCost);
    result = { contract: RESULT_CONTRACT, freeze: freeze.digest, status: summary.status, pool, rows, duplicateWriterRequests, offline, summary };
  }
  const path = join(study, "results.json");
  if (existsSync(path)) requireMatch(hash(readJson(path)) === hash(result), "existing results differ from offline reproduction");
  else writeNew(path, result);
  return result;
}

async function main(): Promise<void> {
  const [command, path, ...extra] = process.argv.slice(2);
  const usage = "usage: bun arms/v9-pool/run.ts init|seed|learn|evaluate|collect <study-directory> | reconcile <study-directory> <block> <stage>";
  requireMatch(path !== undefined && ["init", "seed", "reconcile", "learn", "evaluate", "collect"].includes(command!) &&
    extra.length === (command === "reconcile" ? 2 : 0), usage);
  const study = resolve(path);
  if (command === "init") {
    const paths = ["src", "cli.ts", "package.json", "bun.lock", "experiments/cumulative-skill/arms/v5", "experiments/cumulative-skill/arms/v6",
      "experiments/cumulative-skill/arms/v9-pool", "experiments/cumulative-skill/pipeline", "experiments/cumulative-skill/seeds-ledger.ts"];
    requireMatch(execFileSync("git", ["status", "--porcelain", "--", ...paths], { cwd: ROOT, encoding: "utf8" }).trim() === "", "commit reviewed implementation before freezing a study");
    const sourceCommit = execFileSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim();
    const frozen = freezeStudy(study, PROTOCOL, datasets(), sourceCommit);
    console.log(JSON.stringify({ freeze: frozen.digest, sourceCommit }));
    return;
  }
  const freeze = checkFreeze(study, PROTOCOL, datasets());
  checkCeilings(study);
  if (command === "seed") await seedPool(study, freeze);
  else if (command === "reconcile") await reconcileStage(study, freeze, extra[0]!, extra[1]!);
  else if (command === "learn") await learn(study, freeze);
  else if (command === "evaluate") await evaluate(study, freeze);
  else console.log(JSON.stringify(await collect(study, freeze)));
}

if (import.meta.main) await main();
