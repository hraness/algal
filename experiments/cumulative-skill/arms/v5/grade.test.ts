import { describe, expect, test } from "bun:test";
import { manifestToJson, parseOrganismManifest } from "../../../../src/contract";
import { digestCanonical } from "../../../../src/digest";
import { parseExperimentArm, parseExperimentRun, parseExperimentSession, runExperimentArm, type ExperimentTask } from "../../../../src/experiment-run";
import { builtinRegistry } from "../../../../src/registry";
import { MemoryStore } from "../../../../src/store";
import type { JsonValue } from "../../../../src/values";
import { gradeStudy, type StudyTruth } from "./grade";

const json = (value: unknown): JsonValue => value as JsonValue;
const output = (label = "billing") => ({ results: [{ recordId: "r1", label, decision: "accept" }], summary: { billing: 1 } });
async function fixture(runs = 20) {
  const store = new MemoryStore();
  const manifest = parseOrganismManifest({ contract: "algal.organism.v1", key: "organism:grade-fixture", name: "Grade fixture",
    interface: { inputs: { payload: { cell: "in", port: "value" } }, outputs: { out: { cell: "in", port: "value" } } },
    cells: [{ id: "in", kind: "input", outputs: { value: "json" } }], edges: [] });
  const tasks: ExperimentTask[] = (["acquisition", "unseen", "shift"] as const).map((phase) => ({
    taskId: `${phase}-01`, phase, spec: {}, args: { payload: output() },
    ...(phase === "shift" ? {} : { expect: { out: output() } }),
  }));
  const config = { contract: "algal.experiment.config.v1", tasks,
    arm: { contract: "algal.experiment-arm.v1", arm: "fixed", family: "record-triage",
      budget: { work: 4_000_000_000, attempts: 256, runs }, manifest: manifestToJson(manifest) } };
  const result = await runExperimentArm({ arm: parseExperimentArm(config.arm), tasks, store, fns: builtinRegistry(), executors: [] });
  const truth = new Map<string, StudyTruth>(tasks.map((task) => [task.taskId, { out: output(), source: {
    digest: digestCanonical(json(task)), phase: task.phase, args: task.args, spec: task.spec,
  } }]));
  return { store, config, result, truth };
}

describe("v5 planned learning denominators", () => {
  test("scores an exhausted exact prefix and leaves its unexecuted suffix in all denominators", async () => {
    const f = await fixture(1);
    expect(f.result.session.outcome).toBe("exhausted");
    expect(f.result.session.tasks.length).toBeLessThan(3);
    const grade = await gradeStudy(f.store, f.truth, f.config, f.result.sessionDigest);
    expect(grade.groups.all.tasks).toBe(3);
    expect(grade.groups.all.recordsTotal).toBe(3);
    expect(grade.groups.all.complete).toBe(1);
    expect(grade.groups.all.scorerPassed).toBe(1);
    expect(grade.tasks[2]!.outcome).toBe("not-run");
    expect(grade.tasks[2]!.problems).toEqual(["planned task not run: session budget exhausted"]);
  });

  test("rejects complete omissions and exhausted non-prefix records", async () => {
    const complete = await fixture();
    const session = parseExperimentSession(await complete.store.getValue(complete.result.sessionDigest));
    session.tasks.pop();
    await expect(gradeStudy(complete.store, complete.truth, complete.config, await complete.store.putValue(json(session)))).rejects.toThrow("coverage");
    const exhausted = await fixture(1);
    const partial = parseExperimentSession(await exhausted.store.getValue(exhausted.result.sessionDigest));
    partial.tasks.reverse();
    await expect(gradeStudy(exhausted.store, exhausted.truth, exhausted.config, await exhausted.store.putValue(json(partial)))).rejects.toThrow("order or phase");
  });
});

describe("v5 independent corpus binding", () => {
  test("binds exact corpus args/spec and fingerprints sealed truth", async () => {
    const f = await fixture();
    const grade = await gradeStudy(f.store, f.truth, f.config, f.result.sessionDigest);
    expect(grade.provenance.corpusBinding).toBe("task-spec-args-truth");
    const changed = structuredClone(f.config);
    changed.tasks[0]!.spec = { changed: true };
    await expect(gradeStudy(f.store, f.truth, changed, f.result.sessionDigest)).rejects.toThrow("corpus source");
    const shiftedTruth = new Map(f.truth);
    shiftedTruth.set("shift-01", { ...shiftedTruth.get("shift-01")!, out: output("different") });
    const regraded = await gradeStudy(f.store, shiftedTruth, f.config, f.result.sessionDigest);
    expect(regraded.corpusDigest).not.toBe(grade.corpusDigest);
    expect(regraded.taskSetDigest).toBe(grade.taskSetDigest);
    expect(regraded.groups.shift.scorerPassed).toBe(0);
  });

  test("rejects a sealed expectation revision even if the supplied config hides that expectation", async () => {
    const f = await fixture();
    const session = parseExperimentSession(await f.store.getValue(f.result.sessionDigest));
    const entry = session.tasks[2]!;
    const record = parseExperimentRun(await f.store.getValue(entry.run));
    record.revise = { trigger: "missed-expectation", evidence: await f.store.putValue({ expect: { out: output() } }),
      generator: null, evaluated: false, promoted: false, report: null, validation: null, entry: null, supersedes: 0 };
    entry.run = await f.store.putValue(json(record));
    await expect(gradeStudy(f.store, f.truth, f.config, await f.store.putValue(json(session)))).rejects.toThrow("seal broken");
  });
});
