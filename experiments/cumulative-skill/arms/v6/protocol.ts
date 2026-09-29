// The committed plan fixes every draw and stopping rule before inference.
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { digestCanonical, type Digest } from "../../../../src/digest";
import { experimentFamilyConfigDigest, generateExperimentTasks, parseExperimentFamilyConfig, type ExperimentFamilyConfig } from "../../../../src/experiment-family";
import { type ExperimentTaskSpec } from "../../../../src/experiment-task";
import { parseHabitatLimits, type HabitatLimits } from "../../../../src/habitat-budget";
import { boundedJsonSnapshot } from "../../../../src/source-dependencies";
import { asInt, asObject, canonicalize, noUnknownKeys, type JsonValue } from "../../../../src/values";

export const ARMS = ["fixed", "retained", "optimizer", "optimizer-raw"] as const;
export type StudyArm = typeof ARMS[number];
export type StudyBlock = {
  id: string;
  stage: "calibration" | "confirmatory";
  corpus: "a" | "b" | "c";
  repetition: number;
  armOrder: StudyArm[];
  seeds: { acquisition: number; unseen: number; shift: number; ancestor: number };
};
export type Protocol = {
  contract: "algal.study-protocol.v1";
  study: "cumulative-skill-v6";
  executor: { baseUrl: string; model: string; credentialEnv: string };
  arms: StudyArm[];
  concurrency: number;
  budgets: { seed: HabitatLimits; learning: HabitatLimits; frozen: HabitatLimits };
  seed: { maxGenerations: number; feedback: "train-only"; selection: "first-validation-pass"; normalizeEmitted: true };
  tasks: {
    acquisition: number; unseen: number; frozen: number;
    splits: ExperimentFamilyConfig["splits"];
    shape: ExperimentFamilyConfig["shape"];
    evolve: { fromPhase: "acquisition"; addFields: number; reviseClasses: number; jitterRules: number };
  };
  calibration: { requiredSeeds: number; headroomMaxPassed: number; headroomMinimumBlocks: number };
  replication: { corpora: ["a", "b", "c"]; repetitions: number; primary: "optimizer"; baseline: "fixed";
    minimumWinsPerCorpus: number; aggregate: "strict-win"; requireAllBlocks: true;
    requiredArms: ["fixed", "optimizer"]; secondaryFailures: "report-separately" };
  frozen: { mode: "fixed-task-execution"; allLearningHeadsBeforeEvaluation: true; feedback: false };
  previousSeeds: number[];
  blocks: StudyBlock[];
};

const same = (a: unknown, b: unknown) => canonicalize(a as JsonValue) === canonicalize(b as JsonValue);
function requireMatch(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(`v6 protocol: ${message}`);
}
function exact(value: unknown, wanted: unknown, at: string): void {
  requireMatch(same(value, wanted), `${at} differs from the preregistered protocol`);
}

export const STUDY_ROOT = resolve(import.meta.dir, "..", "..");
export const ARM_BUDGET: HabitatLimits = { work: 40_000_000, attempts: 1024, runs: 512 };
export const SEED_BUDGET: HabitatLimits = { work: 8_000_000, attempts: 64, runs: 64 };
export const SEED_MAX_GENERATIONS = 8;
const PREVIOUS_SEEDS = [57019, 99733, 271828, 314159, 644901, 739391, 20260927, 20261028, 20261029,
  41000001, 41000002, 41000003, 41000004, 41000005, 41000006];
const SHAPE: ExperimentFamilyConfig["shape"] = {
  classes: [10, 14], optionalFields: [3, 4], rules: [6, 10], decisionLabels: [3, 5], queueLabels: [3, 5],
  summaries: [2, 4], grader: "mixed", scorerPassAt: 0.9,
  difficulty: { hintLeak: 0.5, noiseSentences: [0, 2], confusable: 0.7, subjectMislead: 0.25 },
};

export function parseProtocol(value: unknown): Protocol {
  const v = asObject(boundedJsonSnapshot(value, { maxBytes: 65_536, maxDepth: 16, maxNodes: 4096,
    maxEntries: 4096, maxStringBytes: 1024 }, "v6 protocol"), "v6 protocol");
  noUnknownKeys(v, ["contract", "study", "executor", "arms", "concurrency", "budgets", "seed", "tasks",
    "calibration", "replication", "frozen", "previousSeeds", "blocks"], "v6 protocol");
  exact(v.contract, "algal.study-protocol.v1", "contract");
  exact(v.study, "cumulative-skill-v6", "study");
  exact(v.executor, { baseUrl: "https://api.x.ai/v1", model: "grok-4.5", credentialEnv: "XAI_API_KEY" }, "executor");
  exact(v.arms, ARMS, "arms");
  exact(v.concurrency, 3, "concurrency");
  const budgets = asObject(v.budgets, "budgets");
  noUnknownKeys(budgets, ["seed", "learning", "frozen"], "budgets");
  exact(parseHabitatLimits(budgets.seed), SEED_BUDGET, "seed budget");
  exact(parseHabitatLimits(budgets.learning), ARM_BUDGET, "learning budget");
  exact(parseHabitatLimits(budgets.frozen), ARM_BUDGET, "frozen budget");
  exact(v.seed, { maxGenerations: SEED_MAX_GENERATIONS, feedback: "train-only", selection: "first-validation-pass", normalizeEmitted: true }, "seed");
  const tasks = asObject(v.tasks, "tasks");
  noUnknownKeys(tasks, ["acquisition", "unseen", "frozen", "splits", "shape", "evolve"], "tasks");
  exact([tasks.acquisition, tasks.unseen, tasks.frozen], [8, 32, 8], "task counts");
  exact(tasks.splits, { train: 24, validation: 12, holdout: 12 }, "splits");
  exact(tasks.shape, SHAPE, "family shape");
  exact(tasks.evolve, { fromPhase: "acquisition", addFields: 3, reviseClasses: 2, jitterRules: 4 }, "shift rules");
  exact(v.calibration, { requiredSeeds: 3, headroomMaxPassed: 6, headroomMinimumBlocks: 2 }, "calibration gate");
  exact(v.replication, { corpora: ["a", "b", "c"], repetitions: 3, primary: "optimizer", baseline: "fixed",
    minimumWinsPerCorpus: 2, aggregate: "strict-win", requireAllBlocks: true,
    requiredArms: ["fixed", "optimizer"], secondaryFailures: "report-separately" }, "replication rule");
  exact(v.frozen, { mode: "fixed-task-execution", allLearningHeadsBeforeEvaluation: true, feedback: false }, "frozen evaluation");
  exact(v.previousSeeds, PREVIOUS_SEEDS, "previous seeds");
  requireMatch(Array.isArray(v.blocks) && v.blocks.length === 12, "expected all 12 planned blocks");
  const usedSeeds = new Set(PREVIOUS_SEEDS);
  const blocks = v.blocks.map((value, i): StudyBlock => {
    const b = asObject(value, `blocks[${i}]`);
    noUnknownKeys(b, ["id", "stage", "corpus", "repetition", "armOrder", "seeds"], `blocks[${i}]`);
    const calibration = i < 3;
    const ordinal = i - 3;
    const corpus = (["a", "b", "c"] as const)[calibration ? i : Math.floor(ordinal / 3)]!;
    const repetition = calibration ? 1 : ordinal % 3 + 1;
    const stage = calibration ? "calibration" : "confirmatory";
    exact([b.id, b.stage, b.corpus, b.repetition], [calibration ? `cal-${corpus}` : `${corpus}-r${repetition}`, stage, corpus, repetition], `block ${i} identity/order`);
    const rotation = ordinal % ARMS.length;
    exact(b.armOrder, calibration ? ["fixed"] : [...ARMS.slice(rotation), ...ARMS.slice(0, rotation)], `block ${i} arm order`);
    const seeds = asObject(b.seeds, `blocks[${i}].seeds`);
    noUnknownKeys(seeds, ["acquisition", "unseen", "shift", "ancestor"], `blocks[${i}].seeds`);
    for (const name of ["acquisition", "unseen", "shift", "ancestor"] as const) {
      const seed = asInt(seeds[name], `blocks[${i}].seeds.${name}`, 1, 0xffff_ffff);
      requireMatch(!usedSeeds.has(seed), `reused seed or ancestor ${seed}`);
      usedSeeds.add(seed);
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

export function blockConfigs(value: StudyBlock | string): Record<"acquisition" | "unseen" | "shift", ExperimentFamilyConfig> {
  const block = checkedBlock(value);
  const common = { contract: "algal.experiment-family.v1", family: "record-triage", splits: PROTOCOL.tasks.splits, shape: PROTOCOL.tasks.shape };
  return {
    acquisition: parseExperimentFamilyConfig({ ...common, phase: "acquisition", seed: block.seeds.acquisition, tasks: PROTOCOL.tasks.acquisition }),
    unseen: parseExperimentFamilyConfig({ ...common, phase: "unseen", seed: block.seeds.unseen, tasks: PROTOCOL.tasks.unseen }),
    shift: parseExperimentFamilyConfig({ ...common, phase: "shift", seed: block.seeds.shift, tasks: PROTOCOL.tasks.frozen,
      evolve: { ...PROTOCOL.tasks.evolve, fromSeed: block.seeds.ancestor } }),
  };
}
export function learningTasks(block: StudyBlock | string): ExperimentTaskSpec[] {
  const configs = blockConfigs(block);
  return [configs.acquisition, configs.unseen].flatMap((config) => generateExperimentTasks(config).tasks);
}
export function frozenHoldoutTasks(block: StudyBlock | string): ExperimentTaskSpec[] {
  return generateExperimentTasks(blockConfigs(block).shift).tasks;
}
export function generateBlock(block: StudyBlock | string) {
  return { learning: learningTasks(block), frozen: frozenHoldoutTasks(block), configs: blockConfigs(block) };
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

// Same full-record/summary measure and threshold as v5.
export const AGREEMENT = [
  "let", "er", ["get", "expect", "out", "results"],
  ["let", "ar0", ["get", "outputs", "out", "results"],
    ["let", "ar", ["if", ["isList", ["get", "ar0"]], ["get", "ar0"], ["list"]],
      ["let", "es", ["get", "expect", "out", "summary"],
        ["let", "asum", ["get", "outputs", "out", "summary"],
          ["if", ["neq", ["len", ["get", "er"]], ["len", ["get", "ar"]]], 0,
            ["div", ["add", ["mul", 4, ["div", ["len", ["filter", ["get", "er"], "e", ["contains", ["get", "ar"], ["get", "e"]]]], ["len", ["get", "er"]]]],
              ["if", ["eq", ["get", "es"], ["get", "asum"]], 1, 0]], 5]]]]]],
] as unknown as JsonValue;
export const SCORER = { contract: "algal.expr.v1" as const, program: ["gte", AGREEMENT, 0.9] };
