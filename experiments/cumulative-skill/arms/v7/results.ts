// Independent offline scoring and cost accounting for the frozen v7 plan.
import { existsSync } from "node:fs";
import { join } from "node:path";
import { manifestToJson } from "../../../../src/contract";
import { asDigest, type Digest } from "../../../../src/digest";
import { buildExperimentReport } from "../../../../src/experiment-report";
import { parseExperimentCatalog, parseExperimentRun, parseExperimentSession } from "../../../../src/experiment-run";
import { taskBatchArgs, taskSpecData, type ExperimentTaskSpec } from "../../../../src/experiment-task";
import { verifyExperimentReport } from "../../../../src/experiment-verify";
import { parseHabitatBudget } from "../../../../src/habitat-budget";
import { FileStore } from "../../../../src/store";
import { asObject, type JsonObject, type JsonValue } from "../../../../src/values";
import { verifyObservedRoute } from "../v5/evidence";
import { accountCost, addCosts, storedManifest, storedValue, zeroCost, type StudyCost } from "../v5/evidence-support";
import { gradeStudy, type Counts, type StudyTruth } from "../v5/grade";
import { hash, readJson, requireMatch, verifyStage, writeNew, type FrozenIdentity } from "./guards";
import { buildStudyConfigs } from "./build";
import { ARMS, ARM_BUDGET, CALIBRATION, PROTOCOL, PROTOCOL_DIGEST, SEED_BUDGET, SEED_MAX_GENERATIONS, frozenHoldoutTasks, learningTasks, seedTask, taskTruth, type StudyBlock } from "./protocol";
import { verifySeedEvidence, type SeedSummary } from "./seed";

export type ArmName = typeof ARMS[number];
export type SessionSummary = { session: Digest; outcome: string; observed: number; head: Digest | null; cost: StudyCost; counts: Counts };
export type SeedEvidence = { summary: SeedSummary; cost: StudyCost; catalog: JsonValue | null; manifest: JsonValue | null };
const json = (value: unknown): JsonValue => value as JsonValue;
export const storePath = (study: string, block: string, stage: string): string => join(study, "stores", block, stage);
export const stageDone = (study: string, block: string, stage: string): boolean => existsSync(join(study, block, "attempts", stage, "result.json"));

export function seedInput(block: StudyBlock): unknown {
  return { block: block.id, corpus: block.id, protocol: PROTOCOL_DIGEST, first: seedTask(block) };
}

export async function inspectSeed(study: string, freeze: FrozenIdentity, block: StudyBlock): Promise<SeedEvidence> {
  const summary = verifyStage(study, freeze, block.id, "seed", seedInput(block)) as SeedSummary;
  const first = seedTask(block);
  const store = new FileStore(storePath(study, block.id, "seed"));
  await verifySeedEvidence(summary, first, store);
  requireMatch(summary.blockId === block.id && summary.protocol === PROTOCOL_DIGEST && summary.corpus === block.id, "seed protocol/block mismatch");
  const account = parseHabitatBudget(await storedValue(store, summary.account));
  requireMatch(summary.maxGenerations === SEED_MAX_GENERATIONS && hash(account.limits) === hash(SEED_BUDGET), "seed ceilings differ from the frozen protocol");
  await verifyObservedRoute(store, account.runs, Buffer.from(JSON.stringify({ executor: freeze.route })));
  return { summary, cost: await accountCost(store, account),
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
  const result = asObject(verifyStage(study, freeze, block.id, stage, config), "stage result");
  const sessionDigest = asDigest(result.session, "session");
  const dir = storePath(study, block.id, stage);
  const store = new FileStore(dir);
  const session = parseExperimentSession(await storedValue(store, sessionDigest));
  const scores = await gradeStudy(store, truthFor(tasks), config, sessionDigest);
  const reportPath = join(study, block.id, "attempts", stage, "report.json");
  if (!existsSync(reportPath)) {
    const report = await buildExperimentReport(dir, {
      contract: "algal.skill-experiment.config.v1", study: "cumulative-skill-v7", arms: [{ session: sessionDigest }],
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
  return { session: sessionDigest, outcome: session.outcome, observed: session.tasks.length, head, cost: await accountCost(store, account), counts: scores.groups.all };
}

export type CalibrationRow = { block: string; seed: SeedEvidence; frozen: SessionSummary | null };
export function calibrationDecision(rows: CalibrationRow[]): { proceed: boolean; reasons: string[]; headroomBlocks: number; cost: StudyCost } {
  const reasons: string[] = [];
  const planned = PROTOCOL.calibration.blocks;
  if (rows.length !== planned.length || hash(rows.map(row => row.block)) !== hash(planned)) reasons.push("all four planned calibration blocks are required");
  if (rows.some(row => !row.seed.summary.qualified)) reasons.push("a calibration seed did not qualify");
  if (rows.some(row => row.seed.summary.qualified && (row.frozen?.outcome !== "complete" || row.frozen.counts.tasks !== 8 || row.frozen.observed !== 8))) reasons.push("calibration evaluation is incomplete");
  const headroomBlocks = rows.filter(row => row.frozen?.outcome === "complete" && row.frozen.observed === 8 && row.frozen.counts.scorerPassed <= CALIBRATION.headroomMaxPassed).length;
  if (headroomBlocks < CALIBRATION.headroomMinimumBlocks) reasons.push("fewer than three calibration blocks have at least two failing frozen tasks");
  return { proceed: reasons.length === 0, reasons, headroomBlocks,
    cost: addCosts(...rows.flatMap(row => [row.seed.cost, ...(row.frozen ? [row.frozen.cost] : [])])),
  };
}

export async function inspectCalibration(study: string, freeze: FrozenIdentity, blocks: StudyBlock[]) {
  const rows: CalibrationRow[] = [];
  for (const block of blocks) {
    const seed = await inspectSeed(study, freeze, block);
    const frozen = seed.summary.qualified ? await inspectSession(study, freeze, block, "frozen-fixed",
      fixedConfig(seed.manifest!, frozenHoldoutTasks(block)), frozenHoldoutTasks(block)) : null;
    rows.push({ block: block.id, seed, frozen });
  }
  return { contract: "algal.study-calibration.v2", freeze: freeze.digest, rows, decision: calibrationDecision(rows) };
}

export type LearningBlock = { block: string; seed: SeedEvidence; arms: Partial<Record<ArmName, SessionSummary>> };
export async function inspectLearning(study: string, freeze: FrozenIdentity, block: StudyBlock): Promise<LearningBlock> {
  const seed = await inspectSeed(study, freeze, block);
  const arms: LearningBlock["arms"] = {};
  if (seed.summary.qualified) {
    const configs = buildStudyConfigs(block, seed.catalog, seed.manifest, seed.summary);
    for (const arm of ARMS) arms[arm] = await inspectSession(study, freeze, block, `learning-${arm}`, asObject(json(configs[arm]), "config"), learningTasks(block));
  }
  return { block: block.id, seed, arms };
}

export type ConfirmatoryRow = { block: StudyBlock; learning: LearningBlock; frozen: Partial<Record<ArmName, SessionSummary>> };
export function comparison(rows: ConfirmatoryRow[], calibrationCost: StudyCost) {
  const planned = PROTOCOL.blocks.filter(block => block.stage === "confirmatory");
  const coverage = rows.length === planned.length && hash(rows.map(row => row.block).sort((a, b) => a.id.localeCompare(b.id))) === hash([...planned].sort((a, b) => a.id.localeCompare(b.id)));
  const armComplete = (row: ConfirmatoryRow, arm: ArmName) => row.learning.arms[arm]?.outcome === "complete" &&
    row.learning.arms[arm]?.observed === 40 && row.learning.arms[arm]?.counts.tasks === 40 &&
    row.frozen[arm]?.outcome === "complete" && row.frozen[arm]?.observed === 8 && row.frozen[arm]?.counts.tasks === 8;
  const incomplete = !coverage || rows.some(row => !row.learning.seed.summary.qualified || !armComplete(row, "fixed") || !armComplete(row, "optimizer"));
  const secondaryComplete = coverage && rows.every(row => armComplete(row, "retained") && armComplete(row, "optimizer-raw"));
  const groups = ["a", "b", "c"].map(group => {
    const members = rows.filter(row => row.block.id.startsWith(`${group}-`));
    return { group, plannedBlocks: 3, wins: members.filter(row => (row.frozen.optimizer?.counts.scorerPassed ?? 0) > (row.frozen.fixed?.counts.scorerPassed ?? 0)).length,
      ties: members.filter(row => row.frozen.optimizer && row.frozen.fixed && row.frozen.optimizer.counts.scorerPassed === row.frozen.fixed.counts.scorerPassed).length };
  });
  const arms = Object.fromEntries(ARMS.map(arm => {
    const passed = rows.reduce((n, row) => n + (row.frozen[arm]?.counts.scorerPassed ?? 0), 0);
    const cost = addCosts(...rows.flatMap(row => [row.learning.seed.cost, row.learning.arms[arm]?.cost ?? zeroCost(), row.frozen[arm]?.cost ?? zeroCost()]));
    return [arm, { passed, planned: 72, cost, workPerPassedTask: passed === 0 ? null : cost.workUnits / passed }];
  })) as Record<ArmName, { passed: number; planned: number; cost: StudyCost; workPerPassedTask: number | null }>;
  const repeatable = !incomplete && groups.every(group => group.wins >= 2) && arms.optimizer.passed > arms.fixed.passed;
  const confirmationCost = addCosts(...rows.flatMap(row => [row.learning.seed.cost, ...ARMS.flatMap(arm => [row.learning.arms[arm]?.cost ?? zeroCost(), row.frozen[arm]?.cost ?? zeroCost()])]));
  return { status: incomplete ? "insufficient" : repeatable ? "descriptive-repeatability-rule-met" : "descriptive-repeatability-rule-not-met",
    plannedBlocks: 9, observedBlocks: rows.length, primaryComplete: !incomplete, secondaryComplete, primaryContrast: "optimizer versus fixed", groups, arms,
    calibrationCost, confirmationCost, totalRealizedCost: addCosts(calibrationCost, confirmationCost),
    interpretation: "Descriptive comparisons of fresh draws from one synthetic template family, not statistical significance or distinct task domains.",
  };
}
