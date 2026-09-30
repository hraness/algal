// Build every learning arm from the same verified seed and training examples.
import { manifestToJson, parseOrganismManifest } from "../../../../src/contract";
import { asDigest, digestCanonical } from "../../../../src/digest";
import { parseExperimentArm, parseExperimentCatalog, parseExperimentTaskSet } from "../../../../src/experiment-run";
import { taskBatchArgs, taskCases, taskSpecData } from "../../../../src/experiment-task";
import { asInt, asObject, canonicalize, type JsonValue } from "../../../../src/values";
import { seedTrainingExamples, studyGenerator } from "./generators";
import { ARMS, ARM_BUDGET, blockById, learningTasks, PROTOCOL_DIGEST, SCORER, SEED_MAX_GENERATIONS, seedTask, taskTruth, type StudyBlock } from "./protocol";
import { SEED_CONTRACT } from "./seed";

const same = (a: unknown, b: unknown) => canonicalize(a as JsonValue) === canonicalize(b as JsonValue);
function requireMatch(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(`v9-pool build: ${message}`);
}

export function buildStudyConfigs(blockValue: StudyBlock | string, catalogValue: unknown, manifestValue: unknown, summaryValue: unknown) {
  const block = typeof blockValue === "string" ? blockById(blockValue) : blockValue;
  requireMatch(same(block, blockById(block.id)), "block differs from the committed protocol");
  // Every block is a pool block; whether its arms run is the pool decision's
  // business (run.ts), not a block property.
  requireMatch(block.stage === "pool", "arms are built only for pool blocks");
  const tasks = learningTasks(block);
  const first = tasks[0]!;
  // The seed searched the same first task plus its development batch.
  const seed = seedTask(block);
  const catalog = parseExperimentCatalog(catalogValue);
  requireMatch(catalog.entries.length === 1, "expected one qualified generated seed entry");
  const entry = catalog.entries[0]!;
  const manifest = parseOrganismManifest(manifestValue);
  const manifestDigest = digestCanonical(manifestToJson(manifest));
  const summary = asObject(summaryValue, "seed summary");
  const validation = asObject(summary.validation, "seed validation");
  const validationTotal = asInt(validation.total, "seed validation total", 1, 256);
  requireMatch(summary.contract === SEED_CONTRACT && summary.blockId === block.id && summary.protocol === PROTOCOL_DIGEST &&
    summary.taskId === seed.taskId && summary.taskDigest === seed.digest, "seed belongs to another block, task, or protocol");
  requireMatch(summary.qualified === true && summary.termination === "qualified" && validation.passed === validationTotal &&
    summary.manifest === entry.manifest && summary.report === entry.report &&
    summary.catalog === digestCanonical(catalog as unknown as JsonValue) && manifestDigest === entry.manifest &&
    entry.retired === undefined && entry.supersedes === undefined, "seed must be qualified and match its exact catalog, manifest, and evaluation");
  requireMatch(summary.maxGenerations === SEED_MAX_GENERATIONS && Array.isArray(summary.attempts) &&
    summary.attempts.length > 0 && summary.attempts.length <= SEED_MAX_GENERATIONS, "seed must preserve its bounded attempts");
  const selected = asObject(summary.attempts.at(-1), "selected seed attempt");
  const generation = asObject(selected.generator, "selected seed generator");
  const training = seedTrainingExamples(first);
  const generator = studyGenerator("generator.algal.json", training);
  const reviser = studyGenerator("reviser.algal.json", training);
  requireMatch(selected.mode === "generate" || selected.mode === "revise", "seed attempt is missing its generation mode");
  requireMatch(selected.duplicateRequest === false && summary.duplicateRequests === 0, "a seed with a duplicate writer request cannot qualify");
  const expectedGenerator = selected.mode === "generate" ? generator : reviser;
  requireMatch(selected.generation === summary.attempts.length && selected.manifest === entry.manifest && selected.report === entry.report &&
    same(selected.validation, validation), "seed selection differs from the successful attempt");
  requireMatch(generation.manifest === digestCanonical(expectedGenerator.manifest as JsonValue), "selected seed generator differs from the protocol");
  requireMatch(Object.hasOwn(selected, "parentManifest") && Object.hasOwn(selected, "trainEvidence"), "seed is missing correction provenance");
  if (selected.mode === "generate") requireMatch(selected.parentManifest === null && selected.trainEvidence === null, "fresh generation carries correction provenance");
  else {
    asDigest(selected.parentManifest, "seed parent manifest");
    asDigest(selected.trainEvidence, "seed training evidence");
  }
  const cases = taskCases(first).map((row) => ({ ...row, id: `${first.taskId}-${row.id}` }));
  requireMatch(cases.every((row) => row.split !== "development"), "learning tasks carry no development batch");
  const selectionCases = cases.flatMap((row) => row.split === "holdout" ? [] : [{ id: row.id, split: row.split }]);
  requireMatch(entry.family === "record-triage" && entry.taskId === `seed-${first.taskId}-${summary.attempts.length}` &&
    same(entry.cases, selectionCases) && entry.interfaceDigest === digestCanonical(manifest.interface as unknown as JsonValue),
  "seed catalog differs from this block's selection cases or interface");
  const taskRecords = parseExperimentTaskSet({ contract: "algal.experiment-tasks.v1", tasks: tasks.map((task) => {
    const batch = task.inputs.find((row) => row.split === "holdout");
    requireMatch(batch !== undefined, `${task.taskId}: no learning execution batch`);
    return { taskId: task.taskId, phase: task.phase, spec: taskSpecData(task), args: taskBatchArgs(task, batch), expect: taskTruth(task) };
  }) }).tasks;
  const adaptive = { contract: "algal.experiment-arm.v1", family: "record-triage", budget: ARM_BUDGET,
    generator, normalizeEmitted: true, maxEntries: 32, scorer: SCORER, cases };
  const arms = {
    fixed: { contract: "algal.experiment-arm.v1", arm: "fixed", family: "record-triage", budget: ARM_BUDGET, manifest: manifestToJson(manifest) },
    retained: { ...adaptive, arm: "retained", citeKeptEvaluation: true },
    optimizer: { ...adaptive, arm: "optimizer", reviser, requalifyAfter: 2 },
    "optimizer-raw": { ...adaptive, arm: "optimizer", reviser, requalifyAfter: 2, normalizeEmitted: false },
  };
  return Object.fromEntries(ARMS.map((name) => {
    const arm = arms[name];
    parseExperimentArm(arm);
    return [name, { contract: "algal.experiment.config.v1", arm, tasks: taskRecords, ...(name === "fixed" ? {} : { catalog }) }];
  }));
}
