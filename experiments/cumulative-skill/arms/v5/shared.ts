// Shared constants for the v5 matched-conditions study: the corpus loader,
// the family's agreement scorer, and the arm skeleton every config builds on.
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { manifestToJson, parseOrganismManifest } from "../../../../src/contract";
import { experimentFamilyConfigDigest, parseExperimentFamilyConfig, parseExperimentSet } from "../../../../src/experiment-family";
import { parseExperimentTaskSpec, type ExperimentTaskSpec } from "../../../../src/experiment-task";
import type { JsonValue } from "../../../../src/values";

/** `tasks/` corpus roots the study compares: the v4 corpus plus the two
 * corpora generated at fresh seeds for v5. Each entry is a corpus root
 * containing `acquisition/`, `unseen/`, and `shift/` directories. */
export const CORPORA = ["v4", "v5/b", "v5/c"] as const;
export type CorpusName = (typeof CORPORA)[number];
export const STUDY_SLUGS = ["v4", "v5-b", "v5-c"] as const;
export type StudySlug = (typeof STUDY_SLUGS)[number];
export const STUDY_ROOT = resolve(import.meta.dir, "..", "..");
const CORPUS_PATHS: Record<StudySlug, string> = { v4: "v4", "v5-b": "v5/b", "v5-c": "v5/c" };

function phaseTasks(root: string, phase: "acquisition" | "unseen" | "shift"): ExperimentTaskSpec[] {
  return readdirSync(join(root, phase)).filter((f) => f.endsWith(".task.json")).sort()
    .map((f) => parseExperimentTaskSpec(JSON.parse(readFileSync(join(root, phase, f), "utf8"))));
}

/** Every `*.task.json` under one corpus root, in phase order. */
export function corpusTasks(root: string): ExperimentTaskSpec[] {
  const dir = resolve(root);
  return (["acquisition", "unseen", "shift"] as const).flatMap((phase) =>
    phaseTasks(dir, phase));
}

/** Learning never loads a shift task, including its inputs or labels. */
export function learningTasks(root: string): ExperimentTaskSpec[] {
  return (["acquisition", "unseen"] as const).flatMap((phase) => phaseTasks(resolve(root), phase));
}

/** Fresh shift tasks generated from ancestors absent from every learning set. */
export function frozenHoldoutTasks(slug: StudySlug): ExperimentTaskSpec[] {
  const config = parseExperimentFamilyConfig(JSON.parse(readFileSync(join(STUDY_ROOT, "configs", "v5", "holdout", `${slug}.family.json`), "utf8")));
  const dir = join(STUDY_ROOT, "tasks", "v5", "holdout", slug);
  const index = parseExperimentSet(JSON.parse(readFileSync(join(dir, "index.json"), "utf8")));
  if (index.config !== experimentFamilyConfigDigest(config) || index.seed !== config.seed || index.phase !== "shift" || index.tasks.length !== config.tasks) {
    throw new Error(`${slug}: frozen holdout index differs from its family config`);
  }
  return index.tasks.map((entry, i) => {
    const task = parseExperimentTaskSpec(JSON.parse(readFileSync(join(dir, entry.file), "utf8")));
    if (task.taskId !== entry.taskId || task.digest !== entry.digest || task.family.config !== index.config || task.family.seed !== index.seed || task.family.index !== i || task.phase !== "shift") {
      throw new Error(`${slug}/${entry.file}: frozen holdout differs from its index`);
    }
    return task;
  });
}

/** A task and its evolved descendants share their actual ancestor's group.
 * The config digest, seed, phase, and index are checked before grouping. */
export function taskLineageGroup(task: ExperimentTaskSpec): string {
  const paths = STUDY_SLUGS.flatMap((slug) => [
    ...["acquisition", "unseen", "shift"].map((phase) => join(STUDY_ROOT, "configs", CORPUS_PATHS[slug], `${phase}.family.json`)),
    join(STUDY_ROOT, "configs", "v5", "holdout", `${slug}.family.json`),
  ]);
  const config = paths.map((path) => parseExperimentFamilyConfig(JSON.parse(readFileSync(path, "utf8"))))
    .find((candidate) => experimentFamilyConfigDigest(candidate) === task.family.config);
  if (config === undefined || config.seed !== task.family.seed || config.phase !== task.phase || task.family.index >= config.tasks) {
    throw new Error(`${task.taskId}: no matching study lineage config`);
  }
  const ancestorSeed = config.evolve?.fromSeed ?? config.seed;
  const ancestorPhase = config.evolve?.fromPhase ?? (config.evolve === undefined ? config.phase : "acquisition");
  const revisedFrom = config.evolve === undefined ? undefined : `${ancestorPhase}-${String(task.family.index + 1).padStart(2, "0")}`;
  if (task.family.revisedFrom !== revisedFrom) throw new Error(`${task.taskId}: revisedFrom differs from its lineage config`);
  return `record-triage-${ancestorSeed}-${ancestorPhase}-${task.family.index}`;
}

/** One generator definition is shared by seed generation and every arm. */
export function studyGenerator(file: "generator.algal.json" | "reviser.algal.json") {
  const manifest = parseOrganismManifest(JSON.parse(readFileSync(join(import.meta.dir, file), "utf8")));
  const library = manifestToJson(parseOrganismManifest(JSON.parse(readFileSync(join(STUDY_ROOT, "pipeline", "record-triage.algal.json"), "utf8"))));
  return { manifest: manifestToJson(manifest), output: "manifest", field: "manifest", args: { library } };
}

/** Machine-generated expected outputs for one task's holdout batch: the
 * `expect.out` the seeded generator declared at task creation. This is the
 * study's ground truth, independent of what any arm config carried. */
export function taskTruth(task: ExperimentTaskSpec): Record<string, JsonValue> {
  const holdout = task.inputs.find((b) => b.split === "holdout");
  if (holdout === undefined) throw new Error(`${task.taskId}: task has no holdout batch`);
  return holdout.expect as Record<string, JsonValue>;
}

/** The family's agreement scorer, (4 x result match + summary match) / 5,
 * passing at 0.9. Identical to the scorer the v3/v4 arms carried. */
export const AGREEMENT = [
  "let", "er", ["get", "expect", "out", "results"],
  ["let", "ar0", ["get", "outputs", "out", "results"],
    ["let", "ar", ["if", ["isList", ["get", "ar0"]], ["get", "ar0"], ["list"]],
      ["let", "es", ["get", "expect", "out", "summary"],
        ["let", "asum", ["get", "outputs", "out", "summary"],
          ["if", ["neq", ["len", ["get", "er"]], ["len", ["get", "ar"]]], 0,
            ["div",
              ["add",
                ["mul", 4, ["div", ["len", ["filter", ["get", "er"], "e", ["contains", ["get", "ar"], ["get", "e"]]]], ["len", ["get", "er"]]]],
                ["if", ["eq", ["get", "es"], ["get", "asum"]], 1, 0]],
              5]]]]]],
] as unknown as JsonValue;

export const SCORER = { contract: "algal.expr.v1", program: ["gte", AGREEMENT, 0.9] };

/** Per-arm-session habitat account, identical to v4's. */
export const ARM_BUDGET = { work: 40_000_000, attempts: 1024, runs: 512 };

/** Common, separately reported seed acquisition cost; never renewed on retry. */
export const SEED_BUDGET = { work: 8_000_000, attempts: 64, runs: 64 };
export const SEED_MAX_GENERATIONS = 8;
