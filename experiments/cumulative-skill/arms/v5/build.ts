// Build matched learning configs from a qualified generated seed. Frozen
// shift inputs and labels never enter the learning task records.
// bun build.ts <corpusDir> <seedCatalog.json> <outDir>
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { manifestToJson, parseOrganismManifest } from "../../../../src/contract";
import { digestCanonical } from "../../../../src/digest";
import { parseExperimentArm, parseExperimentCatalog, parseExperimentTaskSet } from "../../../../src/experiment-run";
import { taskBatchArgs, taskCases, taskSpecData } from "../../../../src/experiment-task";
import { asObject, type JsonValue } from "../../../../src/values";
import { learningTasks, ARM_BUDGET, SCORER, SEED_MAX_GENERATIONS, studyGenerator, taskTruth } from "./shared";

export function buildStudyConfigs(corpusDir: string, catalogValue: unknown, manifestValue: unknown, summaryValue: unknown) {
  const catalog = parseExperimentCatalog(catalogValue);
  if (catalog.entries.length !== 1) throw new Error("expected one qualified generated seed entry; run seed.ts first");
  const entry = catalog.entries[0]!;
  const manifest = parseOrganismManifest(manifestValue);
  const manifestDigest = digestCanonical(manifestToJson(manifest));
  const summary = asObject(summaryValue, "seed summary");
  const validation = asObject(summary.validation, "seed validation");
  if (summary.contract !== "algal.study-seed.v1" || summary.qualified !== true || summary.termination !== "qualified" ||
      typeof validation.total !== "number" || validation.total < 1 || validation.passed !== validation.total ||
      summary.manifest !== entry.manifest || summary.report !== entry.report || summary.catalog !== digestCanonical(catalog as unknown as JsonValue) ||
      manifestDigest !== entry.manifest || entry.retired !== undefined || entry.supersedes !== undefined) {
    throw new Error("seed must be generated, qualified, and match its exact catalog and manifest");
  }
  if (!Array.isArray(summary.attempts) || summary.attempts.length < 1 || summary.attempts.length > SEED_MAX_GENERATIONS) {
    throw new Error("seed summary must preserve its bounded generation attempts");
  }
  const selected = asObject(summary.attempts.at(-1), "selected seed attempt");
  if (selected.generator === null || selected.generator === undefined || selected.manifest !== entry.manifest || selected.report !== entry.report ||
      digestCanonical(selected.validation!) !== digestCanonical(validation)) {
    throw new Error("seed catalog lacks its successful generation and evaluation provenance");
  }
  const tasks = learningTasks(corpusDir);
  const first = tasks.find((task) => task.phase === "acquisition");
  if (first === undefined) throw new Error(`${corpusDir}: no acquisition task`);
  const cases = taskCases(first).map((c) => ({ ...c, id: `${first.taskId}-${c.id}` }));
  const seedCases = cases.flatMap((c) => c.split === "holdout" ? [] : [{ id: c.id, split: c.split }]);
  if (entry.family !== "record-triage" || entry.taskId !== `seed-${first.taskId}-${summary.attempts.length}` || summary.taskId !== first.taskId || summary.taskDigest !== first.digest ||
      digestCanonical(entry.cases) !== digestCanonical(seedCases) ||
      entry.interfaceDigest !== digestCanonical(manifest.interface as unknown as JsonValue)) {
    throw new Error("seed catalog differs from this corpus's promotion cases or interface");
  }
  const adaptive = {
    contract: "algal.experiment-arm.v1", family: "record-triage", budget: ARM_BUDGET,
    generator: studyGenerator("generator.algal.json"), normalizeEmitted: true,
    maxEntries: 32, scorer: SCORER, cases,
  };
  const taskRecords = parseExperimentTaskSet({
    contract: "algal.experiment-tasks.v1",
    tasks: tasks.map((task) => {
      const batch = task.inputs.find((b) => b.split === "holdout");
      if (batch === undefined) throw new Error(`${task.taskId}: no task execution batch`);
      return { taskId: task.taskId, phase: task.phase, spec: taskSpecData(task), args: taskBatchArgs(task, batch), expect: taskTruth(task) };
    }),
  }).tasks;
  const configs = {
    fixed: {
      contract: "algal.experiment-arm.v1", arm: "fixed", family: "record-triage", budget: ARM_BUDGET,
      manifest: manifestToJson(manifest),
    },
    retained: { ...adaptive, arm: "retained", citeKeptEvaluation: true },
    optimizer: { ...adaptive, arm: "optimizer", reviser: studyGenerator("reviser.algal.json"), requalifyAfter: 2 },
    "optimizer-raw": { ...adaptive, arm: "optimizer", reviser: studyGenerator("reviser.algal.json"), requalifyAfter: 2, normalizeEmitted: false },
  };
  return Object.fromEntries(Object.entries(configs).map(([name, arm]) => {
    parseExperimentArm(arm);
    return [name, { contract: "algal.experiment.config.v1", arm, tasks: taskRecords, ...(name === "fixed" ? {} : { catalog }) }];
  }));
}

if (import.meta.main) {
  const [corpusDir, seedPath, outDirArg] = process.argv.slice(2);
  if (corpusDir === undefined || seedPath === undefined || outDirArg === undefined || process.argv.length !== 5) {
    throw new Error("usage: build.ts <corpusDir> <seedCatalog.json> <outDir>");
  }
  const seedDir = dirname(resolve(seedPath));
  const configs = buildStudyConfigs(corpusDir,
    JSON.parse(readFileSync(resolve(seedPath), "utf8")),
    JSON.parse(readFileSync(join(seedDir, "seed-manifest.json"), "utf8")),
    JSON.parse(readFileSync(join(seedDir, "seed-summary.json"), "utf8")));
  const outDir = resolve(outDirArg);
  mkdirSync(outDir, { recursive: true });
  for (const [name, record] of Object.entries(configs)) {
    const path = join(outDir, `${name}.config.json`);
    writeFileSync(path, JSON.stringify(record, null, 1) + "\n");
    console.log(`${path}: ${record.tasks.length} learning tasks`);
  }
}
