import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { manifestToJson, parseOrganismManifest } from "./contract";
import { digestCanonical } from "./digest";
import { scriptedExecutor, type Executor } from "./effects";
import { gradeExperimentCase, gradeExperimentMismatches, parseExperimentTaskSpec, taskBatchArgs } from "./experiment-task";
import { builtinRegistry } from "./registry";
import { runOrganism } from "./run";
import { MemoryStore } from "./store";
import { AlgalError } from "./errors";
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

// The Jev classify variant: `each` maps records through the record-classify
// child, whose classifier resolves its choice set from the task spec via
// `labelsExpr` and routes to provider "jev". The test's executor stands in
// for Jev — it asserts the request carries the task's resolved label set,
// then returns the batch's declared label for the record.
const jevManifest = parseOrganismManifest(
  JSON.parse(readFileSync(join(PIPELINE_DIR, "record-triage-jev.algal.json"), "utf8")) as JsonValue,
);
const childManifest = parseOrganismManifest(
  JSON.parse(readFileSync(join(PIPELINE_DIR, "record-classify.algal.json"), "utf8")) as JsonValue,
);

function jevManifestArgs(task: (typeof tasks)[number], batch: (typeof tasks)[number]["inputs"][number]) {
  const args: Record<string, Record<string, JsonValue>> = Object.create(null);
  for (const [name, value] of Object.entries(taskBatchArgs(task, batch))) {
    const target = jevManifest.interface!.inputs[name]!;
    (args[target.cell] ??= Object.create(null))[target.port] = value;
  }
  return args;
}

function jevStubExecutor(batch: (typeof tasks)[number]["inputs"][number], classIds: string[]) {
  const expectLabels = new Map(
    batch.expect.out.results.map((r) => [r.recordId, r.label]),
  );
  let calls = 0;
  const executor: Executor = {
    id: "jev",
    capabilities: { effects: ["classifier"] },
    async execute(request) {
      calls += 1;
      // labelsExpr resolved before dispatch: the request carries the
      // task's concrete taxonomy classes, never an unresolved program.
      const output = request.output as { kind: string; labels?: string[] };
      expect(output.kind).toBe("choice");
      expect(output.labels).toEqual(classIds);
      const record = (request.context.inputs as JsonObject).record as JsonObject;
      const label = expectLabels.get(record.id as string);
      if (label === undefined) {
        throw new AlgalError("EFFECT_UNBOUND", `no expected label for record ${String(record.id)}`);
      }
      return label;
    },
  };
  return { executor, calls: () => calls };
}

describe("record-triage Jev pipeline", () => {
  test("digests are stable, the each cell pins the child manifest", () => {
    const childDigest = digestCanonical(manifestToJson(childManifest));
    const each = jevManifest.cells.find((cell) => cell.kind === "each");
    expect(each).toBeDefined();
    expect((each as { manifest: string }).manifest).toBe(childDigest);
    expect(Object.keys(jevManifest.interface!.inputs).sort()).toEqual(["records", "spec"]);
    const kinds = jevManifest.cells.map((cell) => cell.kind).sort();
    expect(kinds).toEqual(["each", "expr", "expr", "expr", "input"]);
  });

  test("every acquisition case passes with one classifier effect per record", async () => {
    for (const task of tasks) {
      const store = new MemoryStore();
      await store.putManifest(childManifest);
      const classIds = task.taxonomy.classes.map((c) => c.id);
      for (const batch of task.inputs) {
        const stub = jevStubExecutor(batch, classIds);
        const receipt = await runOrganism({
          manifest: jevManifest,
          args: jevManifestArgs(task, batch),
          fns: builtinRegistry(),
          store,
          executors: [stub.executor],
        });
        expect(receipt.outcome).toBe("complete");
        expect(stub.calls()).toBe(batch.records.length);
        expect(receipt.effects.length).toBe(batch.records.length);
        const outputs: JsonObject = Object.create(null) as JsonObject;
        for (const [name, source] of Object.entries(jevManifest.interface!.outputs)) {
          const value = receipt.cells[source.cell]?.outputs?.[source.port];
          if (value !== undefined) outputs[name] = value;
        }
        const grade = gradeExperimentCase(task, batch, outputs);
        expect(grade.passed).toBe(true);
        expect(gradeExperimentMismatches(task, grade)).toEqual([]);
      }
    }
  });
});
