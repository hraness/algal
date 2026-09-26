import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { manifestToJson, parseOrganismManifest } from "./contract";
import { digestCanonical } from "./digest";
import { scriptedExecutor } from "./effects";
import { gradeExperimentCase, gradeExperimentMismatches, parseExperimentTaskSpec, taskBatchArgs } from "./experiment-task";
import { builtinRegistry } from "./registry";
import { runOrganism } from "./run";
import { MemoryStore } from "./store";
import type { JsonObject, JsonValue } from "./values";

// The committed reference pipeline under experiments/cumulative-skill/pipeline:
// one agent cell labels records, deterministic expr cells apply the declared
// rules and summaries. The committed .responses.json scripts the agent cell
// per acquisition batch (keyed by request digest), and every acquisition case
// must pass its declared grader.
const PIPELINE_DIR = join(import.meta.dir, "..", "experiments", "cumulative-skill", "pipeline");
const ACQUISITION_DIR = join(import.meta.dir, "..", "experiments", "cumulative-skill", "tasks", "acquisition");

const manifestRaw = JSON.parse(readFileSync(join(PIPELINE_DIR, "record-triage.algal.json"), "utf8")) as JsonValue;
const manifest = parseOrganismManifest(manifestRaw);
const responses = JSON.parse(readFileSync(join(PIPELINE_DIR, "record-triage.responses.json"), "utf8")) as Record<string, JsonValue>;

const tasks = readdirSync(ACQUISITION_DIR)
  .filter((file) => file.endsWith(".task.json"))
  .sort()
  .map((file) => parseExperimentTaskSpec(JSON.parse(readFileSync(join(ACQUISITION_DIR, file), "utf8"))));

function caseRunArgs(task: (typeof tasks)[number], batch: (typeof tasks)[number]["inputs"][number]) {
  const args: Record<string, Record<string, JsonValue>> = Object.create(null);
  for (const [name, value] of Object.entries(taskBatchArgs(task, batch))) {
    const target = manifest.interface!.inputs[name]!;
    (args[target.cell] ??= Object.create(null))[target.port] = value;
  }
  return args;
}

function interfaceOutputs(cells: Record<string, { outputs?: Record<string, JsonValue> }>): JsonObject {
  const outputs: JsonObject = Object.create(null) as JsonObject;
  for (const [name, source] of Object.entries(manifest.interface!.outputs)) {
    const value = cells[source.cell]?.outputs?.[source.port];
    if (value !== undefined) outputs[name] = value;
  }
  return outputs;
}

describe("record-triage reference pipeline", () => {
  test("manifest digest is stable and interface is conforming", () => {
    expect(digestCanonical(manifestToJson(manifest))).toBe("sha256:eff3c49c37d56b13003cf0742353b0eebb01d5006ef190d73276ef7275fda3be");
    expect(Object.keys(manifest.interface!.inputs).sort()).toEqual(["records", "spec"]);
    expect(Object.keys(manifest.interface!.outputs)).toEqual(["out"]);
    const kinds = manifest.cells.map((cell) => cell.kind).sort();
    expect(kinds).toEqual(["agent", "expr", "expr", "expr", "input"]);
  });

  test("every acquisition case passes under the scripted executor", async () => {
    for (const task of tasks) {
      for (const batch of task.inputs) {
        const receipt = await runOrganism({
          manifest,
          args: caseRunArgs(task, batch),
          fns: builtinRegistry(),
          store: new MemoryStore(),
          executors: [scriptedExecutor(responses)],
        });
        expect(receipt.outcome).toBe("complete");
        const outputs = interfaceOutputs(receipt.cells);
        const grade = gradeExperimentCase(task, batch, outputs);
        expect(grade.passed).toBe(true);
        expect(grade.score).toBe(1);
        expect(gradeExperimentMismatches(task, grade)).toEqual([]);
      }
    }
  });

  test("a wrong label map fails the declared grader", async () => {
    const task = tasks[0]!;
    const batch = task.inputs.find((entry) => entry.split === "train")!;
    const wrong = Object.create(null) as JsonObject;
    for (const [digest, value] of Object.entries(responses)) {
      const labels = value as JsonObject;
      wrong[digest] = Object.fromEntries(
        Object.entries(labels).map(([id]) => [id, task.taxonomy.classes[0]!.id]),
      );
    }
    const receipt = await runOrganism({
      manifest,
      args: caseRunArgs(task, batch),
      fns: builtinRegistry(),
      store: new MemoryStore(),
      executors: [scriptedExecutor(wrong)],
    });
    expect(receipt.outcome).toBe("complete");
    const outputs = interfaceOutputs(receipt.cells);
    const grade = gradeExperimentCase(task, batch, outputs);
    expect(grade.passed).toBe(false);
  });
});
