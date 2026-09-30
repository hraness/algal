// The committed plan fixes every draw, round mode, launch order, and stopping rule before inference.
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { digestCanonical, type Digest } from "../../../../src/digest";
import { experimentFamilyConfigDigest, generateExperimentTasks, parseExperimentFamilyConfig, type ExperimentFamilyConfig } from "../../../../src/experiment-family";
import { type ExperimentTaskSpec } from "../../../../src/experiment-task";
import { parseHabitatLimits, type HabitatLimits } from "../../../../src/habitat-budget";
import { boundedJsonSnapshot } from "../../../../src/source-dependencies";
import { asInt, asObject, asString, canonicalize, noUnknownKeys, type JsonValue } from "../../../../src/values";
import { CONSUMED_SEEDS, RESERVED_RANGES } from "../../seeds-ledger";
import { AGREEMENT, SCORER as V6_SCORER } from "../v6/protocol";

/** The development batch is scored by the v6 agreement program itself, not
 * its 0.9 pass threshold: the writer sees the value the gate hides. */
export const DEVELOPMENT_AGREEMENT: JsonValue = AGREEMENT as JsonValue;

/** Contract ids this line allocates: every shape that differs from v8 gets
 * its own id, and the v8 ids stay on the shapes that are byte-identical
 * (seed.v3, development-score.v2, freeze/stage/heads/replay v1). The
 * in-driver reconciliation record is a stage record, so it does not reuse
 * `algal.study-reconciliation.v1`, the id of the v8 lane's hand-made
 * study-level record (archived with a different key set). */
export const STUDY_ID = "cumulative-skill-v9-pool" as const;
export const PROTOCOL_CONTRACT = "algal.study-protocol.v3" as const;
export const POOL_CONTRACT = "algal.study-pool.v1" as const;
export const RESULT_CONTRACT = "algal.study-result.v3" as const;
export const RECONCILIATION_CONTRACT = "algal.study-stage-reconciliation.v1" as const;

export const ARMS = ["fixed", "retained", "optimizer", "optimizer-raw"] as const;
export type StudyArm = typeof ARMS[number];
export const ROUND_MODES = ["contrastive-examples", "error-analysis", "invariant-extraction", "counterexample-search",
  "minimal-rule-rewrite", "fresh-synthesis"] as const;
export type RoundMode = typeof ROUND_MODES[number];
export type StudyBlock = {
  id: string;
  /** Every block is a pool block; the primary set is chosen by seed outcome, not by plan. */
  stage: "pool";
  repetition: number;
  armOrder: StudyArm[];
  seeds: { acquisition: number; unseen: number; shift: number; ancestor: number };
};
export type PoolRule = {
  size: number; launchOrder: "protocol-index"; concurrency: number; launchCap: number; stopLaunching: string; qualified: string;
  interruptedSeed: string; minimumQualified: number; primarySize: number; primarySelection: string; winsRequired: number;
  frozenTasksPrimary: number; nullTail: string; decision: string; insufficient: string; headroom: string;
};
export type ComparisonRule = {
  primary: "optimizer-versus-fixed"; coverage: string; wins: string; aggregate: string; tiesWin: false; aggregateStrict: true;
  successRule: string; matchedSpend: string; requiredCoverage: string[]; secondaryArms: StudyArm[]; secondaryFailures: string;
  offlineAnalyses: string; offlineReading: string; frozenBeforeEvaluation: true; productionActivation: false;
};
export type Protocol = {
  contract: typeof PROTOCOL_CONTRACT;
  study: typeof STUDY_ID;
  status: "implemented-no-inference";
  executor: { baseUrl: string; model: string; credentialEnv: string };
  concurrency: number;
  basis: { v8Protocol: string; v8Finding: string; change: string; lineRule: string };
  unchanged: Record<string, JsonValue>;
  tasks: {
    acquisition: number; unseen: number; frozen: number;
    splits: ExperimentFamilyConfig["splits"];
    seedSplits: ExperimentFamilyConfig["splits"];
    seedRoles: Record<string, string>;
    frozenRecordsPerTask: number;
    shape: ExperimentFamilyConfig["shape"];
    evolve: { fromPhase: "acquisition"; addFields: number; reviseClasses: number; jitterRules: number };
    freshLineages: true; v5ToV8AncestorsExcluded: true;
  };
  seed: {
    maxGenerations: number; selection: "first-selection-pass"; selectionSplit: "validation"; normalizeEmitted: true;
    trainingFeedback: string; developmentFeedback: Record<string, JsonValue>; roundSchedule: RoundMode[];
    writerReceives: string[]; writerNeverReceives: string[]; duplicateRequestRule: string; duplicateManifestRule: string;
  };
  budgets: { seed: HabitatLimits; learning: HabitatLimits; frozen: HabitatLimits };
  pool: PoolRule;
  comparison: ComparisonRule;
  runDiscipline: string;
  costAccounting: Record<string, JsonValue>;
  freezeRule: string;
  previousSeeds: number[];
  blocks: StudyBlock[];
};

const same = (a: unknown, b: unknown) => canonicalize(a as JsonValue) === canonicalize(b as JsonValue);
function requireMatch(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(`v9-pool protocol: ${message}`);
}
function exact(value: unknown, wanted: unknown, at: string): void {
  requireMatch(same(value, wanted), `${at} differs from the preregistered protocol`);
}
/** Free-form protocol prose: present, non-empty, and under the snapshot's string bound. */
function prose(value: unknown, at: string): string {
  const text = asString(value, at, MAX_STRING_BYTES);
  requireMatch(text.length > 0 && Buffer.byteLength(text) <= MAX_STRING_BYTES, `${at} must be a non-empty string of at most ${MAX_STRING_BYTES} bytes`);
  return text;
}

export const STUDY_ROOT = resolve(import.meta.dir, "..", "..");
const MAX_STRING_BYTES = 1024;
export const ARM_BUDGET: HabitatLimits = { work: 40_000_000, attempts: 1024, runs: 512 };
/** Learning and frozen stages share the v8 per-arm ceiling; the names exist so a fork reads which stage it bounds. */
export const LEARNING_BUDGET: HabitatLimits = ARM_BUDGET;
export const FROZEN_BUDGET: HabitatLimits = ARM_BUDGET;
export const SEED_BUDGET: HabitatLimits = { work: 8_000_000, attempts: 64, runs: 64 };
export const SEED_MAX_GENERATIONS = 8;
export const ROUND_SCHEDULE: readonly RoundMode[] = ["contrastive-examples", "error-analysis", "invariant-extraction",
  "counterexample-search", "minimal-rule-rewrite", "fresh-synthesis", "fresh-synthesis", "fresh-synthesis"];
/** Every v5, v6, v7, and v8 task seed and ancestor (v8's 115 plus its own 52),
 * so no v9-pool lineage repeats one; the ledger is the reviewed source. */
export const PREVIOUS_SEEDS: readonly number[] = CONSUMED_SEEDS;
const SPLITS: ExperimentFamilyConfig["splits"] = { train: 24, validation: 12, holdout: 12 };
/** The seed task adds a scored development batch after the three v6 splits;
 * those three keep their v6-shaped bytes and the family generator forks the
 * fourth batch last. */
const SEED_SPLITS: ExperimentFamilyConfig["splits"] = { ...SPLITS, development: 12 };
const SHAPE: ExperimentFamilyConfig["shape"] = {
  classes: [10, 14], optionalFields: [3, 4], rules: [6, 10], decisionLabels: [3, 5], queueLabels: [3, 5],
  summaries: [2, 4], grader: "mixed", scorerPassAt: 0.9,
  difficulty: { hintLeak: 0.5, noiseSentences: [0, 2], confusable: 0.7, subjectMislead: 0.25 },
};
const EVOLVE = { fromPhase: "acquisition", addFields: 3, reviseClasses: 2, jitterRules: 4 } as const;
/** The pool gate and primary rule as numbers; the prose beside them in
 * protocol.json is bounded, not interpreted. Reference no-tie null tail for
 * winsRequired of primarySize is 7/64. */
export const POOL = { size: 16, launchCap: 16, concurrency: 3, minimumQualified: 6, primarySize: 6, winsRequired: 5,
  frozenTasksPrimary: 48 } as const;
export const COMPARISON = { primary: "optimizer-versus-fixed", tiesWin: false, aggregateStrict: true,
  requiredCoverage: ["six primary blocks", "fixed arm", "optimizer arm"], secondaryArms: ["retained", "optimizer-raw"],
  secondaryFailures: "report separately", frozenBeforeEvaluation: true, productionActivation: false } as const;
/** Block p-NN draws `93000000 + 4(NN-1) + {1,2,3,4}`, the pool line's reserved range. */
export const POOL_BLOCK_IDS: readonly string[] = Array.from({ length: POOL.size }, (_, i) => `p-${String(i + 1).padStart(2, "0")}`);
export function blockSeeds(index: number): StudyBlock["seeds"] {
  asInt(index, "block index", 0, POOL.size - 1);
  const base = RESERVED_RANGES.pool.first - 1 + 4 * index;
  return { acquisition: base + 1, unseen: base + 2, shift: base + 3, ancestor: base + 4 };
}

export function parseProtocol(value: unknown): Protocol {
  const v = asObject(boundedJsonSnapshot(value, { maxBytes: 65_536, maxDepth: 16, maxNodes: 4096,
    maxEntries: 4096, maxStringBytes: MAX_STRING_BYTES }, "v9-pool protocol"), "v9-pool protocol");
  noUnknownKeys(v, ["contract", "study", "status", "executor", "concurrency", "basis", "unchanged", "tasks", "seed", "budgets",
    "pool", "comparison", "runDiscipline", "costAccounting", "freezeRule", "previousSeeds", "blocks"], "v9-pool protocol");
  exact(v.contract, PROTOCOL_CONTRACT, "contract");
  exact(v.study, STUDY_ID, "study");
  exact(v.status, "implemented-no-inference", "status");
  exact(v.executor, { baseUrl: "https://api.x.ai/v1", model: "grok-4.5", credentialEnv: "XAI_API_KEY" }, "executor");
  exact(v.concurrency, POOL.concurrency, "concurrency");
  const basis = asObject(v.basis, "basis");
  noUnknownKeys(basis, ["v8Protocol", "v8Finding", "change", "lineRule"], "basis");
  requireMatch(typeof basis.v8Protocol === "string" && /^[0-9a-f]{40}$/.test(basis.v8Protocol), "basis must name the v8 protocol commit");
  prose(basis.v8Finding, "basis.v8Finding");
  const change = prose(basis.change, "basis.change");
  requireMatch(/estimand/.test(change) && /conditional/.test(change) && /favors the optimizer/.test(change),
    "basis.change must state the estimand change and the selection direction");
  requireMatch(typeof basis.lineRule === "string" && basis.lineRule.length > 0, "basis must state the line rule");
  const unchanged = asObject(v.unchanged, "unchanged");
  noUnknownKeys(unchanged, ["family", "scorerPassAt", "modelRoute", "resourceCeilings", "confirmatoryArms", "claims", "roundSchedule",
    "seedProcedure"], "unchanged");
  exact([unchanged.family, unchanged.scorerPassAt, unchanged.confirmatoryArms], ["record-triage", 0.9, ARMS], "unchanged v6 values");
  for (const key of ["modelRoute", "resourceCeilings", "claims", "roundSchedule", "seedProcedure"]) prose(unchanged[key], `unchanged.${key}`);
  const budgets = asObject(v.budgets, "budgets");
  noUnknownKeys(budgets, ["seed", "learning", "frozen"], "budgets");
  exact(parseHabitatLimits(budgets.seed), SEED_BUDGET, "seed budget");
  exact(parseHabitatLimits(budgets.learning), LEARNING_BUDGET, "learning budget");
  exact(parseHabitatLimits(budgets.frozen), FROZEN_BUDGET, "frozen budget");
  const seed = asObject(v.seed, "seed");
  noUnknownKeys(seed, ["maxGenerations", "selection", "selectionSplit", "normalizeEmitted", "trainingFeedback", "developmentFeedback",
    "roundSchedule", "writerReceives", "writerNeverReceives", "duplicateRequestRule", "duplicateManifestRule"], "seed");
  exact([seed.maxGenerations, seed.selection, seed.selectionSplit, seed.normalizeEmitted],
    [SEED_MAX_GENERATIONS, "first-selection-pass", "validation", true], "seed rules");
  exact(seed.roundSchedule, ROUND_SCHEDULE, "round schedule");
  const feedback = asObject(seed.developmentFeedback, "developmentFeedback");
  noUnknownKeys(feedback, ["visibility", "fields", "score", "labels", "records", "outputs", "summaries", "purpose"], "developmentFeedback");
  exact([feedback.visibility, feedback.fields, feedback.labels, feedback.records, feedback.outputs, feedback.summaries],
    ["bounded-agreement-score-only", ["score", "generation", "round"], false, false, false, false], "development feedback");
  for (const key of ["trainingFeedback", "duplicateRequestRule", "duplicateManifestRule"]) prose(seed[key], `seed.${key}`);
  for (const key of ["writerReceives", "writerNeverReceives"]) {
    const list = seed[key];
    requireMatch(Array.isArray(list) && list.length >= 1 && list.length <= 16, `seed.${key} must list 1 to 16 items`);
    list.forEach((item, i) => prose(item, `seed.${key}[${i}]`));
  }
  const tasks = asObject(v.tasks, "tasks");
  noUnknownKeys(tasks, ["acquisition", "unseen", "frozen", "splits", "seedSplits", "seedRoles", "frozenRecordsPerTask", "shape", "evolve",
    "freshLineages", "v5ToV8AncestorsExcluded"], "tasks");
  exact([tasks.acquisition, tasks.unseen, tasks.frozen, tasks.frozenRecordsPerTask], [8, 32, 8, 12], "task counts");
  exact(tasks.splits, SPLITS, "splits");
  exact(tasks.seedSplits, SEED_SPLITS, "seed splits");
  exact(Object.keys(asObject(tasks.seedRoles, "seedRoles")).sort(), ["development", "holdout", "train", "validation"], "seed roles");
  exact(tasks.shape, SHAPE, "family shape");
  exact(tasks.evolve, EVOLVE, "shift rules");
  exact([tasks.freshLineages, tasks.v5ToV8AncestorsExcluded], [true, true], "lineage rules");
  const pool = asObject(v.pool, "pool");
  noUnknownKeys(pool, ["size", "launchOrder", "concurrency", "launchCap", "stopLaunching", "qualified", "interruptedSeed", "minimumQualified",
    "primarySize", "primarySelection", "winsRequired", "frozenTasksPrimary", "nullTail", "decision", "insufficient", "headroom"], "pool");
  exact([pool.size, pool.launchCap, pool.concurrency, pool.minimumQualified, pool.primarySize, pool.winsRequired, pool.frozenTasksPrimary],
    [POOL.size, POOL.launchCap, POOL.concurrency, POOL.minimumQualified, POOL.primarySize, POOL.winsRequired, POOL.frozenTasksPrimary], "pool gate");
  exact(pool.launchOrder, "protocol-index", "pool launch order");
  for (const key of ["stopLaunching", "qualified", "interruptedSeed", "primarySelection", "decision", "insufficient", "headroom"]) prose(pool[key], `pool.${key}`);
  requireMatch(prose(pool.nullTail, "pool.nullTail").includes("7/64"), "pool.nullTail must state the 7/64 no-tie null tail");
  const comparison = asObject(v.comparison, "comparison");
  noUnknownKeys(comparison, ["primary", "coverage", "wins", "aggregate", "tiesWin", "aggregateStrict", "successRule", "matchedSpend",
    "requiredCoverage", "secondaryArms", "secondaryFailures", "offlineAnalyses", "offlineReading", "frozenBeforeEvaluation",
    "productionActivation"], "comparison");
  exact([comparison.primary, comparison.tiesWin, comparison.aggregateStrict, comparison.requiredCoverage, comparison.secondaryArms,
    comparison.secondaryFailures, comparison.frozenBeforeEvaluation, comparison.productionActivation],
    [COMPARISON.primary, COMPARISON.tiesWin, COMPARISON.aggregateStrict, COMPARISON.requiredCoverage, COMPARISON.secondaryArms,
      COMPARISON.secondaryFailures, COMPARISON.frozenBeforeEvaluation, COMPARISON.productionActivation], "comparison rule");
  for (const key of ["coverage", "wins", "aggregate", "successRule", "matchedSpend", "offlineAnalyses", "offlineReading"]) prose(comparison[key], `comparison.${key}`);
  prose(v.runDiscipline, "runDiscipline");
  const costAccounting = asObject(v.costAccounting, "costAccounting");
  noUnknownKeys(costAccounting, ["seedSharedPerBlock", "failedAndRepeatedAttemptsIncluded", "providerBilling", "nonPrimarySeedCost"], "costAccounting");
  exact([costAccounting.seedSharedPerBlock, costAccounting.failedAndRepeatedAttemptsIncluded], [true, true], "cost accounting");
  prose(costAccounting.providerBilling, "costAccounting.providerBilling");
  prose(costAccounting.nonPrimarySeedCost, "costAccounting.nonPrimarySeedCost");
  requireMatch(prose(v.freezeRule, "freezeRule").includes("seeds ledger"), "freezeRule must commit the seeds ledger");
  requireMatch(PREVIOUS_SEEDS.length === 167, "the ledger must hold the 167 consumed seeds");
  exact(v.previousSeeds, PREVIOUS_SEEDS, "previous seeds");
  requireMatch(Array.isArray(v.blocks) && v.blocks.length === POOL.size, `expected all ${POOL.size} planned blocks`);
  const usedSeeds = new Set(PREVIOUS_SEEDS);
  const blocks = v.blocks.map((value, i): StudyBlock => {
    const b = asObject(value, `blocks[${i}]`);
    noUnknownKeys(b, ["id", "stage", "repetition", "armOrder", "seeds"], `blocks[${i}]`);
    exact([b.id, b.stage, b.repetition], [POOL_BLOCK_IDS[i], "pool", i + 1], `block ${i} identity/order`);
    const rotation = i % ARMS.length;
    exact(b.armOrder, [...ARMS.slice(rotation), ...ARMS.slice(0, rotation)], `block ${i} arm order`);
    const seeds = asObject(b.seeds, `blocks[${i}].seeds`);
    noUnknownKeys(seeds, ["acquisition", "unseen", "shift", "ancestor"], `blocks[${i}].seeds`);
    for (const name of ["acquisition", "unseen", "shift", "ancestor"] as const) {
      const drawn = asInt(seeds[name], `blocks[${i}].seeds.${name}`, 1, 0xffff_ffff);
      requireMatch(!usedSeeds.has(drawn), `reused seed or ancestor ${drawn}`);
      usedSeeds.add(drawn);
    }
    // The formula pins every draw inside the pool line's reserved range.
    exact(seeds, blockSeeds(i), `block ${i} seed formula`);
    return b as unknown as StudyBlock;
  });
  return { ...v, blocks } as unknown as Protocol;
}

export function loadProtocol(path = join(import.meta.dir, "protocol.json")): Protocol {
  return parseProtocol(JSON.parse(readFileSync(path, "utf8")));
}
export const PROTOCOL = loadProtocol();
export const PROTOCOL_DIGEST: Digest = digestCanonical(PROTOCOL as unknown as JsonValue);
export const BLOCKS = PROTOCOL.blocks;

export function blockById(id: string): StudyBlock {
  const block = BLOCKS.find((row) => row.id === id);
  requireMatch(block !== undefined, `unknown block ${id}`);
  return structuredClone(block);
}
/** Position in the launch order; the primary set is the six lowest indices that qualified. */
export function blockIndex(id: string): number {
  const index = BLOCKS.findIndex((row) => row.id === id);
  requireMatch(index >= 0, `unknown block ${id}`);
  return index;
}
function checkedBlock(block: StudyBlock | string): StudyBlock {
  const value = typeof block === "string" ? blockById(block) : block;
  exact(value, blockById(value.id), "block");
  return value;
}

export function blockConfigs(value: StudyBlock | string): Record<"acquisition" | "seed" | "unseen" | "shift", ExperimentFamilyConfig> {
  const block = checkedBlock(value);
  const common = { contract: "algal.experiment-family.v1", family: "record-triage", splits: PROTOCOL.tasks.splits, shape: PROTOCOL.tasks.shape };
  return {
    acquisition: parseExperimentFamilyConfig({ ...common, phase: "acquisition", seed: block.seeds.acquisition, tasks: PROTOCOL.tasks.acquisition }),
    // Same seed, phase, and count as acquisition plus the scored development batch.
    seed: parseExperimentFamilyConfig({ ...common, splits: PROTOCOL.tasks.seedSplits, phase: "acquisition", seed: block.seeds.acquisition, tasks: PROTOCOL.tasks.acquisition }),
    unseen: parseExperimentFamilyConfig({ ...common, phase: "unseen", seed: block.seeds.unseen, tasks: PROTOCOL.tasks.unseen }),
    shift: parseExperimentFamilyConfig({ ...common, phase: "shift", seed: block.seeds.shift, tasks: PROTOCOL.tasks.frozen,
      evolve: { ...PROTOCOL.tasks.evolve, fromSeed: block.seeds.ancestor } }),
  };
}
export function learningTasks(block: StudyBlock | string): ExperimentTaskSpec[] {
  const configs = blockConfigs(block);
  return [configs.acquisition, configs.unseen].flatMap((config) => generateExperimentTasks(config).tasks);
}
/** The first acquisition task with its development batch. Its train,
 * validation, and holdout batches are byte-identical to the learning task's. */
export function seedTask(block: StudyBlock | string): ExperimentTaskSpec {
  const task = generateExperimentTasks(blockConfigs(block).seed).tasks[0]!;
  const learning = learningTasks(block)[0]!;
  requireMatch(task.taskId === learning.taskId && task.inputs.length === 4 && task.inputs[3]!.split === "development" &&
    same(task.inputs.slice(0, 3), learning.inputs), "seed task differs from the first learning task");
  return task;
}
export function frozenHoldoutTasks(block: StudyBlock | string): ExperimentTaskSpec[] {
  return generateExperimentTasks(blockConfigs(block).shift).tasks;
}
/** v8's name for the frozen shift tasks, kept beside the spec's wording. */
export const frozenTasks = frozenHoldoutTasks;
export function generateBlock(block: StudyBlock | string) {
  return { seed: seedTask(block), learning: learningTasks(block), frozen: frozenHoldoutTasks(block), configs: blockConfigs(block) };
}

const CONFIGS = new Map(BLOCKS.flatMap((block) => Object.values(blockConfigs(block))).map((config) => [experimentFamilyConfigDigest(config), config]));
export function taskLineageGroup(task: ExperimentTaskSpec): string {
  const config = CONFIGS.get(task.family.config);
  requireMatch(config !== undefined && config.seed === task.family.seed && config.phase === task.phase &&
    Number.isInteger(task.family.index) && task.family.index >= 0 && task.family.index < config.tasks, `${task.taskId}: unknown lineage`);
  const seed = config.evolve?.fromSeed ?? config.seed;
  const phase = config.evolve?.fromPhase ?? (config.evolve ? "acquisition" : config.phase);
  const ancestor = config.evolve ? `${phase}-${String(task.family.index + 1).padStart(2, "0")}` : undefined;
  requireMatch(task.family.revisedFrom === ancestor, `${task.taskId}: forged ancestor`);
  return `record-triage-${seed}-${phase}-${task.family.index}`;
}
export function taskTruth(task: ExperimentTaskSpec): Record<string, JsonValue> {
  const batch = task.inputs.find((row) => row.split === "holdout");
  requireMatch(batch !== undefined, `${task.taskId}: no execution batch`);
  return batch.expect as unknown as Record<string, JsonValue>;
}

// Same full-record/summary measure and threshold as v5 and v6.
export { AGREEMENT };
export const SCORER = V6_SCORER;
