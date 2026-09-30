// One owner runs each paid stage. Completed stages are checked before reuse;
// an incomplete attempt is retained and stops progress until reconciliation.
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { parseExperimentArm, parseExperimentCatalog, parseExperimentTaskSet, runExperimentArm } from "../../../../src/experiment-run";
import type { Executor } from "../../../../src/effects";
import { builtinRegistry } from "../../../../src/registry";
import { FileStore } from "../../../../src/store";
import { asObject, type JsonObject, type JsonValue } from "../../../../src/values";
import { defaultExecutor } from "../v5/evidence";
import { storedManifest } from "../v5/evidence-support";
import { manifestToJson } from "../../../../src/contract";
import { buildStudyConfigs } from "./build";
import { checkFreeze, freezeStudy, hash, readJson, requireMatch, ROOT, ROUTE, startStage, writeNew, type FrozenIdentity } from "./guards";
import { PROTOCOL, PROTOCOL_DIGEST, generateBlock, learningTasks, frozenHoldoutTasks, seedTask, type StudyBlock } from "./protocol";
import { generateStudySeed } from "./seed";
import { comparison, fixedConfig, inspectCalibration, inspectLearning, inspectSeed, inspectSession,
  seedInput, stageDone, storePath, type ConfirmatoryRow, type LearningBlock } from "./results";

const json = (value: unknown): JsonValue => value as JsonValue;
const calibrationBlocks = () => PROTOCOL.blocks.filter(block => block.stage === "calibration");
const confirmatoryBlocks = () => PROTOCOL.blocks.filter(block => block.stage === "confirmatory");
export const datasets = () => PROTOCOL.blocks.map(block => ({ block: block.id, ...generateBlock(block) }));

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

async function seedBlock(study: string, freeze: FrozenIdentity, block: StudyBlock): Promise<void> {
  if (!stageDone(study, block.id, "seed")) {
    requireMatch(checkFreeze(study, PROTOCOL, datasets()).digest === freeze.digest, "seed freeze changed");
    const executor = await liveExecutor();
    const storeDir = storePath(study, block.id, "seed");
    requireMatch(!existsSync(storeDir), `${block.id}: seed store exists without completed stage; reconcile before any provider call`);
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
  await inspectSeed(study, freeze, block);
}

async function calibrate(study: string, freeze: FrozenIdentity): Promise<void> {
  await mapConcurrent(calibrationBlocks(), PROTOCOL.concurrency, async block => {
    await seedBlock(study, freeze, block);
    const seed = await inspectSeed(study, freeze, block);
    if (seed.summary.qualified) {
      const config = fixedConfig(seed.manifest!, frozenHoldoutTasks(block));
      if (!stageDone(study, block.id, "frozen-fixed")) await executeConfig({ study, freeze, block, stage: "frozen-fixed", config, executor: await liveExecutor() });
      await inspectSession(study, freeze, block, "frozen-fixed", config, frozenHoldoutTasks(block));
    }
  });
  const result = await inspectCalibration(study, freeze, calibrationBlocks());
  const path = join(study, "calibration.json");
  if (existsSync(path)) requireMatch(hash(readJson(path)) === hash(result), "saved calibration result differs from evidence");
  else writeNew(path, result);
  console.log(JSON.stringify(result.decision));
}

async function calibrationGate(study: string, freeze: FrozenIdentity) {
  const result = await inspectCalibration(study, freeze, calibrationBlocks());
  requireMatch(hash(readJson(join(study, "calibration.json"))) === hash(result), "calibration decision changed");
  requireMatch(result.decision.proceed, `calibration stopped the study: ${result.decision.reasons.join("; ")}`);
  return result;
}

async function learn(study: string, freeze: FrozenIdentity): Promise<void> {
  await calibrationGate(study, freeze);
  requireMatch(!existsSync(join(study, "heads.json")), "learning heads already frozen");
  await mapConcurrent(confirmatoryBlocks(), PROTOCOL.concurrency, async block => {
    await seedBlock(study, freeze, block);
    const seed = await inspectSeed(study, freeze, block);
    if (!seed.summary.qualified) return;
    const configs = buildStudyConfigs(block, seed.catalog, seed.manifest, seed.summary);
    for (const arm of block.armOrder) {
      const config = asObject(json(configs[arm]), "learning config");
      const stage = `learning-${arm}`;
      if (!stageDone(study, block.id, stage)) await executeConfig({ study, freeze, block, stage, config, executor: await liveExecutor(), copySeed: true });
      await inspectSession(study, freeze, block, stage, config, learningTasks(block));
    }
  });
  await freezeHeads(study, freeze);
}

async function freezeHeads(study: string, freeze: FrozenIdentity): Promise<LearningBlock[]> {
  const blocks: LearningBlock[] = [];
  // Every planned seed and every eligible arm must have a completed native
  // record (including an exhausted outcome) before any true final task runs.
  for (const block of confirmatoryBlocks()) blocks.push(await inspectLearning(study, freeze, block));
  const plan = { contract: "algal.study-heads.v1", freeze: freeze.digest, blocks };
  const path = join(study, "heads.json");
  if (existsSync(path)) requireMatch(hash(readJson(path)) === hash(plan), "learning evidence differs from frozen heads");
  else writeNew(path, plan);
  return blocks;
}

async function evaluate(study: string, freeze: FrozenIdentity): Promise<void> {
  await calibrationGate(study, freeze);
  requireMatch(existsSync(join(study, "heads.json")), "all learning heads must be saved before evaluation");
  const heads = await freezeHeads(study, freeze);
  await mapConcurrent(confirmatoryBlocks(), PROTOCOL.concurrency, async block => {
    const learning = heads.find(row => row.block === block.id)!;
    if (!learning.seed.summary.qualified) return;
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
  const calibration = await inspectCalibration(study, freeze, calibrationBlocks());
  requireMatch(hash(readJson(join(study, "calibration.json"))) === hash(calibration), "calibration artifact differs from evidence");
  let result: unknown;
  if (!calibration.decision.proceed) {
    requireMatch(confirmatoryBlocks().every(block => !existsSync(join(study, block.id))), "confirmatory work exists after failed calibration gate");
    result = { contract: "algal.study-result.v2", freeze: freeze.digest, status: "stopped-after-calibration", calibration,
      primaryClaim: null, plannedConfirmatoryBlocks: 9, observedConfirmatoryBlocks: 0, duplicateWriterRequests: calibration.rows.reduce((n, row) => n + row.seed.summary.duplicateRequests, 0),
      totalRealizedCost: calibration.decision.cost };
  } else {
    const heads = await freezeHeads(study, freeze);
    const rows: ConfirmatoryRow[] = [];
    for (const block of confirmatoryBlocks()) {
      const learning = heads.find(row => row.block === block.id)!;
      const frozen: ConfirmatoryRow["frozen"] = {};
      for (const arm of block.armOrder) {
        const head = learning.arms[arm]?.head;
        if (head === undefined || head === null) continue;
        const sourceStore = new FileStore(storePath(study, block.id, `learning-${arm}`));
        const config = fixedConfig(manifestToJson(await storedManifest(sourceStore, head)), frozenHoldoutTasks(block));
        frozen[arm] = await inspectSession(study, freeze, block, `frozen-${arm}`, config, frozenHoldoutTasks(block));
      }
      rows.push({ block, learning, frozen });
    }
    result = { contract: "algal.study-result.v2", freeze: freeze.digest, calibration, rows,
      duplicateWriterRequests: [...calibration.rows, ...rows.map(row => row.learning)].reduce((n, row) => n + row.seed.summary.duplicateRequests, 0),
      summary: comparison(rows, calibration.decision.cost) };
  }
  const path = join(study, "results.json");
  if (existsSync(path)) requireMatch(hash(readJson(path)) === hash(result), "existing results differ from offline reproduction");
  else writeNew(path, result);
  return result;
}

async function main(): Promise<void> {
  const [command, path, ...extra] = process.argv.slice(2);
  requireMatch(path !== undefined && extra.length === 0 && ["init", "calibrate", "learn", "evaluate", "collect"].includes(command!),
    "usage: bun arms/v7/run.ts init|calibrate|learn|evaluate|collect <new-study-directory>");
  const study = resolve(path);
  if (command === "init") {
    const paths = ["src", "cli.ts", "package.json", "bun.lock", "experiments/cumulative-skill/arms/v5", "experiments/cumulative-skill/arms/v6", "experiments/cumulative-skill/arms/v7", "experiments/cumulative-skill/pipeline"];
    requireMatch(execFileSync("git", ["status", "--porcelain", "--", ...paths], { cwd: ROOT, encoding: "utf8" }).trim() === "", "commit reviewed implementation before freezing a study");
    const sourceCommit = execFileSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim();
    const frozen = freezeStudy(study, PROTOCOL, datasets(), sourceCommit);
    console.log(JSON.stringify({ freeze: frozen.digest, sourceCommit }));
    return;
  }
  const freeze = checkFreeze(study, PROTOCOL, datasets());
  if (command === "calibrate") await calibrate(study, freeze);
  else if (command === "learn") await learn(study, freeze);
  else if (command === "evaluate") await evaluate(study, freeze);
  else console.log(JSON.stringify(await collect(study, freeze)));
}

if (import.meta.main) await main();
