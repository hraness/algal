import { describe, expect, test } from "bun:test";
import { manifestToJson, parseOrganismManifest } from "../../../../src/contract";
import { digestCanonical } from "../../../../src/digest";
import { parseExperimentArm, parseExperimentRun, parseExperimentSession, runExperimentArm, type ExperimentTask } from "../../../../src/experiment-run";
import { parseHabitatBudget } from "../../../../src/habitat-budget";
import { builtinRegistry } from "../../../../src/registry";
import { parseRunReceipt, receiptDigest } from "../../../../src/run";
import { MemoryStore } from "../../../../src/store";
import { type JsonValue } from "../../../../src/values";
import { gradeStudy } from "./grade";

const asJson = (value: unknown) => value as JsonValue;
const output = (decision = "accept") => ({
  results: [{ recordId: "r1", label: "billing", decision }], summary: { billing: 1 },
});

async function fixture() {
  // Deliberately uses no cell called `pack`; the grader must follow the interface.
  const manifest = parseOrganismManifest({ contract: "algal.organism.v1", key: "organism:grade-fixture", name: "Grade fixture",
    interface: { inputs: { payload: { cell: "input", port: "data" } }, outputs: { out: { cell: "input", port: "data" } } },
    cells: [{ id: "input", kind: "input", outputs: { data: "json" } }], edges: [],
  });
  const generator = { contract: "algal.organism.v1", key: "organism:grade-generator", name: "Grade generator",
    interface: { inputs: { task: { cell: "task", port: "value" } }, outputs: { manifest: { cell: "emit", port: "value" } } },
    cells: [{ id: "task", kind: "input", outputs: { value: "json" } },
      { id: "emit", kind: "const", outputs: { value: { type: "json", value: manifestToJson(manifest) } } }], edges: [] };
  const armValue = { contract: "algal.experiment-arm.v1", arm: "retained", family: "record-triage",
    budget: { work: 4_000_000_000, runs: 256, attempts: 256 }, generator: { manifest: generator, output: "manifest" }, citeKeptEvaluation: true,
    cases: ["train", "validation", "holdout"].map((split) => ({ id: split, split, args: { payload: output() }, expect: { out: output() } })),
    scorer: { contract: "algal.expr.v1", program: ["eq", ["get", "expect", "out", "summary"], ["get", "outputs", "out", "summary"]] },
  };
  const tasks: ExperimentTask[] = (["acquisition", "unseen", "shift"] as const).map((phase) => ({
    taskId: `${phase}-01`, phase, spec: {}, args: { payload: output(phase === "unseen" ? "wrong" : "accept") },
    expect: { out: output() },
  }));
  const store = new MemoryStore();
  const result = await runExperimentArm({ arm: parseExperimentArm(armValue), tasks, store, fns: builtinRegistry(), executors: [] });
  return { store, config: { contract: "algal.experiment.config.v1", arm: armValue, tasks }, session: result.sessionDigest };
}

async function replaceRecord(f: Awaited<ReturnType<typeof fixture>>, change: (record: ReturnType<typeof parseExperimentRun>) => void) {
  const session = parseExperimentSession(await f.store.getValue(f.session));
  const record = parseExperimentRun(await f.store.getValue(session.tasks[1]!.run));
  change(record);
  session.tasks[1]!.run = await f.store.putValue(asJson(record));
  return f.store.putValue(asJson(session));
}

describe("offline v4 study grading", () => {
  test("follows the cited session and interface, and distinguishes labels, records, scorer and exact output", async () => {
    const f = await fixture();
    // An uncited record for an existing task must not overwrite the cited run.
    await replaceRecord(f, (r) => { r.outcome = "invalid"; r.manifest = null; r.args = null; r.receipt = null; });
    const report = await gradeStudy(f.store, f.config, f.session);
    expect(report.groups.all).toEqual({ tasks: 3, complete: 3, labelsCorrect: 3, recordsCorrect: 2,
      recordsTotal: 3, summariesExact: 3, outputsExact: 2, scorerPassed: 3 });
    expect(report.groups.unseen).toEqual({ tasks: 1, complete: 1, labelsCorrect: 1, recordsCorrect: 0,
      recordsTotal: 1, summariesExact: 1, outputsExact: 0, scorerPassed: 1 });
    expect(report.groups["unseen+shift"].tasks).toBe(2);
    expect(report.tasks.map((r) => r.taskId)).toEqual(["acquisition-01", "unseen-01", "shift-01"]);
  });

  test("keeps invalid runs in all scoring denominators", async () => {
    const f = await fixture();
    const session = await replaceRecord(f, (r) => { r.outcome = "invalid"; r.manifest = null; r.args = null; r.receipt = null; });
    const report = await gradeStudy(f.store, f.config, session);
    expect(report.groups.all.tasks).toBe(3);
    expect(report.groups.all.recordsTotal).toBe(3);
    expect(report.groups.all.complete).toBe(2);
    expect(report.tasks[1]!.problems).toEqual(["run outcome invalid"]);
  });

  test("scores completed task output when later maintenance exhausts the account", async () => {
    const f = await fixture();
    const session = parseExperimentSession(await f.store.getValue(f.session));
    const account = parseHabitatBudget(await f.store.getValue(session.budget));
    const record = parseExperimentRun(await f.store.getValue(session.tasks[2]!.run));
    account.limits.runs = account.charged.runs;
    f.config.arm.budget.runs = account.charged.runs;
    account.outcome = "exhausted";
    account.refused = { manifest: record.manifest!, ceiling: account.runs[0]!.ceiling, reasons: ["runs"] };
    session.outcome = "exhausted";
    session.budget = await f.store.putValue(asJson(account));
    record.outcome = "exhausted";
    session.tasks[2]!.run = await f.store.putValue(asJson(record));
    const report = await gradeStudy(f.store, f.config, await f.store.putValue(asJson(session)));
    expect(report.groups.all.complete).toBe(3);
    expect(report.groups.shift.outputsExact).toBe(1);
    expect(report.tasks[2]!.executionOutcome).toBe("complete");
    expect(report.tasks[2]!.outcome).toBe("exhausted");
    expect(report.tasks[2]!.problems).toEqual(["task completed; subsequent maintenance exhausted the account"]);
  });

  test("rejects changed task input, order, coverage, duplicates, arm and limits", async () => {
    const f = await fixture();
    const configs = [
      { ...f.config, tasks: f.config.tasks.map((t, i) => i === 1 ? { ...t, args: { payload: output("changed") } } : t) },
      { ...f.config, tasks: [...f.config.tasks].reverse() },
      { ...f.config, tasks: f.config.tasks.slice(1) },
      { ...f.config, tasks: [f.config.tasks[0], f.config.tasks[0], f.config.tasks[2]] },
      { ...f.config, arm: { ...f.config.arm, family: "different" } },
      { ...f.config, arm: { ...f.config.arm, budget: { ...f.config.arm.budget, work: 999 } } },
    ];
    for (const config of configs) await expect(gradeStudy(f.store, config, f.session)).rejects.toThrow();
    const session = parseExperimentSession(await f.store.getValue(f.session));
    session.tasks[1] = session.tasks[0]!;
    await expect(gradeStudy(f.store, f.config, await f.store.putValue(asJson(session)))).rejects.toThrow("duplicate session task");
  });

  test("rejects mismatched session/run and missing or corrupted artifacts", async () => {
    const f = await fixture();
    const session = await replaceRecord(f, (r) => { r.taskId = "other-task"; });
    await expect(gradeStudy(f.store, f.config, session)).rejects.toThrow("session/run identity mismatch");
    await expect(gradeStudy({ ...f.store, getValue: f.store.getValue.bind(f.store), getManifest: f.store.getManifest.bind(f.store),
      getReceipt: async () => undefined }, f.config, f.session)).rejects.toThrow("missing charged receipt");
    await expect(gradeStudy({ getValue: f.store.getValue.bind(f.store), getManifest: f.store.getManifest.bind(f.store),
      getReceipt: async () => ({ bad: true }) }, f.config, f.session)).rejects.toThrow("receipt digest mismatch");
  });

  test("counts missing complete outputs as incorrect and reports them", async () => {
    const f = await fixture();
    const session = parseExperimentSession(await f.store.getValue(f.session));
    const record = parseExperimentRun(await f.store.getValue(session.tasks[1]!.run));
    const receipt = parseRunReceipt(await f.store.getReceipt(record.receipt!));
    receipt.cells.input!.outputs = {};
    receipt.digest = receiptDigest(receipt);
    const changed = await f.store.putReceipt(asJson(receipt));
    const account = parseHabitatBudget(await f.store.getValue(session.budget));
    for (const run of account.runs) if (run.receipt === record.receipt) run.receipt = changed;
    session.budget = await f.store.putValue(asJson(account));
    record.receipt = changed;
    session.tasks[1]!.run = await f.store.putValue(asJson(record));
    const report = await gradeStudy(f.store, f.config, await f.store.putValue(asJson(session)));
    expect(report.groups.all.complete).toBe(3);
    expect(report.groups.all.recordsTotal).toBe(3);
    expect(report.groups.all.labelsCorrect).toBe(2);
    expect(report.tasks[1]!.problems).toEqual(["missing interface output out"]);
  });

  test("rejects generator drift and revision expectation drift", async () => {
    const f = await fixture();
    const unknown = digestCanonical({ unexpected: true });
    const session = await replaceRecord(f, (r) => { r.generator = { manifest: unknown, receipt: unknown }; });
    await expect(gradeStudy(f.store, f.config, session)).rejects.toThrow("config/generator manifest mismatch");
    const evidence = await f.store.putValue({ expect: { out: output("changed") } });
    const changedSession = await replaceRecord(f, (r) => {
      r.revise = { trigger: "missed-expectation", evidence, generator: null,
        evaluated: false, promoted: false, report: null, validation: null, entry: null, supersedes: 0 };
    });
    await expect(gradeStudy(f.store, f.config, changedSession)).rejects.toThrow("revision/config expectation mismatch");
  });

  test("duplicate output ids cannot inflate label or full-record scores", async () => {
    const f = await fixture();
    const bad = output();
    bad.results.push(bad.results[0]!);
    f.config.tasks[1]!.args.payload = bad;
    const arm = parseExperimentArm(f.config.arm);
    const run = await runExperimentArm({ arm, tasks: f.config.tasks, store: f.store, fns: builtinRegistry(), executors: [] });
    const report = await gradeStudy(f.store, f.config, run.sessionDigest);
    expect(report.groups.unseen.labelsCorrect).toBe(0);
    expect(report.groups.unseen.recordsCorrect).toBe(0);
    expect(report.tasks[1]!.problems).toEqual(["invalid or duplicate result records"]);
  });
});
