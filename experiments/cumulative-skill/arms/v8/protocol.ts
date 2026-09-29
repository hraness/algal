// The committed plan fixes every draw, round mode, and stopping rule before inference.
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { digestCanonical, type Digest } from "../../../../src/digest";
import { experimentFamilyConfigDigest, generateExperimentTasks, parseExperimentFamilyConfig, type ExperimentFamilyConfig } from "../../../../src/experiment-family";
import { type ExperimentTaskSpec } from "../../../../src/experiment-task";
import { parseHabitatLimits, type HabitatLimits } from "../../../../src/habitat-budget";
import { boundedJsonSnapshot } from "../../../../src/source-dependencies";
import { asInt, asObject, canonicalize, noUnknownKeys, type JsonValue } from "../../../../src/values";
import { AGREEMENT, SCORER as V6_SCORER } from "../v6/protocol";

/** The development batch is scored by the v6 agreement program itself, not
 * its 0.9 pass threshold: the writer sees the value the gate hides. */
export const DEVELOPMENT_AGREEMENT: JsonValue = AGREEMENT as JsonValue;

export const ARMS = ["fixed", "retained", "optimizer", "optimizer-raw"] as const;
export type StudyArm = typeof ARMS[number];
export const ROUND_MODES = ["contrastive-examples", "error-analysis", "invariant-extraction", "counterexample-search",
  "minimal-rule-rewrite", "fresh-synthesis"] as const;
export type RoundMode = typeof ROUND_MODES[number];
export type StudyBlock = {
  id: string;
  stage: "calibration" | "confirmatory";
  /** Confirmatory groups are `a`..`c`; the fourth calibration block draws corpus `d`. */
  corpus: "a" | "b" | "c" | "d";
  repetition: number;
  armOrder: StudyArm[];
  seeds: { acquisition: number; unseen: number; shift: number; ancestor: number };
};
export type Protocol = {
  contract: "algal.study-protocol.v2";
  study: "cumulative-skill-v8";
  status: "implemented-no-inference";
  executor: { baseUrl: string; model: string; credentialEnv: string };
  concurrency: number;
  basis: { v6Protocol: string; v6Finding: string; change: string };
  unchanged: Record<string, JsonValue>;
  tasks: {
    acquisition: number; unseen: number; frozen: number;
    splits: ExperimentFamilyConfig["splits"];
    seedSplits: ExperimentFamilyConfig["splits"];
    seedRoles: Record<string, string>;
    frozenRecordsPerTask: number;
    shape: ExperimentFamilyConfig["shape"];
    evolve: { fromPhase: "acquisition"; addFields: number; reviseClasses: number; jitterRules: number };
    freshLineages: true; v5AndV6AncestorsExcluded: true;
  };
  seed: {
    maxGenerations: number; selection: "first-selection-pass"; selectionSplit: "validation"; normalizeEmitted: true;
    trainingFeedback: string; developmentFeedback: Record<string, JsonValue>; roundSchedule: RoundMode[];
    writerReceives: string[]; writerNeverReceives: string[]; duplicateRequestRule: string; duplicateManifestRule: string;
  };
  budgets: { seed: HabitatLimits; learning: HabitatLimits; frozen: HabitatLimits };
  calibration: { blocks: string[]; requiredSeeds: number; headroomRule: string; proceed: string; failure: string };
  replication: Record<string, JsonValue>;
  costAccounting: Record<string, JsonValue>;
  freezeRule: string;
  previousSeeds: number[];
  blocks: StudyBlock[];
};

const same = (a: unknown, b: unknown) => canonicalize(a as JsonValue) === canonicalize(b as JsonValue);
function requireMatch(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(`v8 protocol: ${message}`);
}
function exact(value: unknown, wanted: unknown, at: string): void {
  requireMatch(same(value, wanted), `${at} differs from the preregistered protocol`);
}

export const STUDY_ROOT = resolve(import.meta.dir, "..", "..");
export const ARM_BUDGET: HabitatLimits = { work: 40_000_000, attempts: 1024, runs: 512 };
export const SEED_BUDGET: HabitatLimits = { work: 8_000_000, attempts: 64, runs: 64 };
export const SEED_MAX_GENERATIONS = 8;
export const ROUND_SCHEDULE: readonly RoundMode[] = ["contrastive-examples", "error-analysis", "invariant-extraction",
  "counterexample-search", "minimal-rule-rewrite", "fresh-synthesis", "fresh-synthesis", "fresh-synthesis"];
/** Every v5, v6, and v7 task seed and ancestor, so no v8 lineage repeats one. */
const PREVIOUS_SEEDS = [57019, 99733, 271828, 314159, 644901, 739391, 20260927, 20261028, 20261029,
  41000001, 41000002, 41000003, 41000004, 41000005, 41000006,
  ...Array.from({ length: 48 }, (_, i) => 61000001 + i), ...Array.from({ length: 52 }, (_, i) => 71000001 + i)];
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
const CALIBRATION_BLOCKS = ["cal-a", "cal-b", "cal-c", "cal-d"] as const;
export const CALIBRATION = { requiredSeeds: 4, headroomMaxPassed: 6, headroomMinimumBlocks: 3 } as const;
export const REPLICATION = { blocks: 9, groups: ["a", "b", "c"], repetitionsPerGroup: 3, primary: "optimizer-versus-fixed",
  successRule: "optimizer strictly wins at least two of three blocks in every group and wins aggregate passes",
  requiredCoverage: ["all nine confirmatory blocks", "fixed arm", "optimizer arm"], secondaryFailures: "report separately",
  frozenBeforeEvaluation: true, productionActivation: false } as const;

export function parseProtocol(value: unknown): Protocol {
  const v = asObject(boundedJsonSnapshot(value, { maxBytes: 65_536, maxDepth: 16, maxNodes: 4096,
    maxEntries: 4096, maxStringBytes: 1024 }, "v8 protocol"), "v8 protocol");
  noUnknownKeys(v, ["contract", "study", "status", "executor", "concurrency", "basis", "unchanged", "tasks", "seed", "budgets",
    "calibration", "replication", "costAccounting", "freezeRule", "previousSeeds", "blocks"], "v8 protocol");
  exact(v.contract, "algal.study-protocol.v2", "contract");
  exact(v.study, "cumulative-skill-v8", "study");
  exact(v.status, "implemented-no-inference", "status");
  exact(v.executor, { baseUrl: "https://api.x.ai/v1", model: "grok-4.5", credentialEnv: "XAI_API_KEY" }, "executor");
  exact(v.concurrency, 3, "concurrency");
  const basis = asObject(v.basis, "basis");
  noUnknownKeys(basis, ["v7Protocol", "v7Finding", "change", "lineRule"], "basis");
  requireMatch(typeof basis.v7Protocol === "string" && /^[0-9a-f]{40}$/.test(basis.v7Protocol), "basis must name the v7 protocol commit");
  requireMatch(typeof basis.lineRule === "string" && basis.lineRule.length > 0, "basis must state the line rule");
  const unchanged = asObject(v.unchanged, "unchanged");
  exact([unchanged.family, unchanged.scorerPassAt, unchanged.confirmatoryArms], ["record-triage", 0.9, ARMS], "unchanged v6 values");
  const budgets = asObject(v.budgets, "budgets");
  noUnknownKeys(budgets, ["seed", "learning", "frozen"], "budgets");
  exact(parseHabitatLimits(budgets.seed), SEED_BUDGET, "seed budget");
  exact(parseHabitatLimits(budgets.learning), ARM_BUDGET, "learning budget");
  exact(parseHabitatLimits(budgets.frozen), ARM_BUDGET, "frozen budget");
  const seed = asObject(v.seed, "seed");
  noUnknownKeys(seed, ["maxGenerations", "selection", "selectionSplit", "normalizeEmitted", "trainingFeedback", "developmentFeedback",
    "roundSchedule", "writerReceives", "writerNeverReceives", "duplicateRequestRule", "duplicateManifestRule"], "seed");
  exact([seed.maxGenerations, seed.selection, seed.selectionSplit, seed.normalizeEmitted],
    [SEED_MAX_GENERATIONS, "first-selection-pass", "validation", true], "seed rules");
  exact(seed.roundSchedule, ROUND_SCHEDULE, "round schedule");
  const feedback = asObject(seed.developmentFeedback, "developmentFeedback");
  exact([feedback.visibility, feedback.fields, feedback.labels, feedback.records, feedback.outputs, feedback.summaries],
    ["bounded-agreement-score-only", ["score", "generation", "round"], false, false, false, false], "development feedback");
  const tasks = asObject(v.tasks, "tasks");
  noUnknownKeys(tasks, ["acquisition", "unseen", "frozen", "splits", "seedSplits", "seedRoles", "frozenRecordsPerTask", "shape", "evolve",
    "freshLineages", "v5ToV7AncestorsExcluded"], "tasks");
  exact([tasks.acquisition, tasks.unseen, tasks.frozen, tasks.frozenRecordsPerTask], [8, 32, 8, 12], "task counts");
  exact(tasks.splits, SPLITS, "splits");
  exact(tasks.seedSplits, SEED_SPLITS, "seed splits");
  exact(tasks.shape, SHAPE, "family shape");
  exact(tasks.evolve, EVOLVE, "shift rules");
  exact([tasks.freshLineages, tasks.v5ToV7AncestorsExcluded], [true, true], "lineage rules");
  const calibration = asObject(v.calibration, "calibration");
  noUnknownKeys(calibration, ["blocks", "requiredSeeds", "headroomRule", "proceed", "failure"], "calibration");
  exact([calibration.blocks, calibration.requiredSeeds], [CALIBRATION_BLOCKS, CALIBRATION.requiredSeeds], "calibration gate");
  exact(v.replication, REPLICATION, "replication rule");
  exact(v.previousSeeds, PREVIOUS_SEEDS, "previous seeds");
  requireMatch(Array.isArray(v.blocks) && v.blocks.length === 13, "expected all 13 planned blocks");
  const usedSeeds = new Set(PREVIOUS_SEEDS);
  const blocks = v.blocks.map((value, i): StudyBlock => {
    const b = asObject(value, `blocks[${i}]`);
    noUnknownKeys(b, ["id", "stage", "corpus", "repetition", "armOrder", "seeds"], `blocks[${i}]`);
    const calibrationBlock = i < CALIBRATION_BLOCKS.length;
    const ordinal = i - CALIBRATION_BLOCKS.length;
    const corpus = (["a", "b", "c", "d"] as const)[calibrationBlock ? i : Math.floor(ordinal / 3)]!;
    const repetition = calibrationBlock ? 1 : ordinal % 3 + 1;
    const stage = calibrationBlock ? "calibration" : "confirmatory";
    exact([b.id, b.stage, b.corpus, b.repetition], [calibrationBlock ? CALIBRATION_BLOCKS[i] : `${corpus}-r${repetition}`, stage, corpus, repetition],
      `block ${i} identity/order`);
    const rotation = ordinal % ARMS.length;
    exact(b.armOrder, calibrationBlock ? ["fixed"] : [...ARMS.slice(rotation), ...ARMS.slice(0, rotation)], `block ${i} arm order`);
    const seeds = asObject(b.seeds, `blocks[${i}].seeds`);
    noUnknownKeys(seeds, ["acquisition", "unseen", "shift", "ancestor"], `blocks[${i}].seeds`);
    for (const name of ["acquisition", "unseen", "shift", "ancestor"] as const) {
      const drawn = asInt(seeds[name], `blocks[${i}].seeds.${name}`, 1, 0xffff_ffff);
      requireMatch(!usedSeeds.has(drawn), `reused seed or ancestor ${drawn}`);
      usedSeeds.add(drawn);
    }
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
