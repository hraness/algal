import { describe, expect, test } from "bun:test";
import { evaluatedTaskFixture, fixtureCases, fixtureLimits, fixtureTask } from "../examples/task-workflow/fixture";
import { digestCanonical } from "./digest";
import { AlgalError } from "./errors";
import { MemoryStore } from "./store-memory";
import { assertEvaluatedTaskCompatible, buildEvaluatedTaskArtifact, parseEvaluatedTaskArtifact } from "./task-artifact";
import { compileTask } from "./task";
import { buildTaskReviser, optimizeTask } from "./task-optimizer";
import { taskParameters } from "./task-parameters";
import { buildTaskWorkflowArchive, compareTaskWorkflows, inspectTaskWorkflow, parseTaskOptimizationReport, parseTaskWorkflowArchive, parseTaskWorkflowConfig, verifyTaskWorkflowArchive, type TaskWorkflowConfig } from "./task-workflow";
import { asObject, type JsonValue } from "./values";

const json = (value: unknown) => value as JsonValue;
function resign<T extends { digest: string }>(value: T): T {
  const { digest: _digest, ...base } = value;
  return { ...value, digest: digestCanonical(json(base)) };
}
const config = (): TaskWorkflowConfig => ({ contract: "algal.task-workflow.v1", task: fixtureTask, cases: fixtureCases, strategy: "fixed", limits: fixtureLimits });

describe("portable task workflow", () => {
  test("round trips all evidence offline and binds artifact to the host task", async () => {
    const fixture = await evaluatedTaskFixture();
    const verified = await verifyTaskWorkflowArchive(JSON.parse(JSON.stringify(fixture.archive)));
    expect(verified.report).toEqual(fixture.report);
    expect(await buildEvaluatedTaskArtifact({ baseTask: fixtureTask, report: verified.report, store: verified.store })).toEqual(fixture.artifact);
    expect(assertEvaluatedTaskCompatible(fixture.artifact, fixtureTask).manifestDigest).toBe(fixture.artifact.manifestDigest);
    expect(inspectTaskWorkflow(fixture.archive).budget.charged.runs).toBe(7);
    expect(compareTaskWorkflows(fixture.archive, fixture.archive).comparable).toBe(true);
  });

  test("rejects foreign keys, getters and non-normalized artifact data", async () => {
    const { artifact, archive } = await evaluatedTaskFixture();
    expect(() => parseEvaluatedTaskArtifact({ ...artifact, activate: true })).toThrow("unknown key");
    expect(() => parseTaskWorkflowConfig({ ...config(), provider: "foreign" })).toThrow("unknown key");
    expect(() => parseTaskWorkflowArchive({ ...archive, receipts: {} })).toThrow("receipt closure");
    let invoked = false;
    expect(() => parseTaskWorkflowConfig(Object.defineProperty({}, "task", { enumerable: true, get() { invoked = true; return fixtureTask; } }))).toThrow("accessor");
    expect(invoked).toBe(false);
    expect(() => parseTaskWorkflowConfig({ ...config(), task: { ...fixtureTask, instructions: "x".repeat(1_048_577) } })).toThrow("bytes");
    const changed = structuredClone(artifact);
    changed.bundle.values[digestCanonical(null)] = null;
    expect(() => parseEvaluatedTaskArtifact(resign(changed))).toThrow("exactly the compiled task");
  });

  test("instructions may change but base, routes, contracts and budgets cannot", async () => {
    const { artifact } = await evaluatedTaskFixture();
    expect(() => assertEvaluatedTaskCompatible(artifact, { ...fixtureTask, name: "Another host" })).toThrow("host base");
    for (const change of [{ name: "Changed name" }, { route: { provider: "foreign" } }, { budgets: { ...fixtureTask.budgets, maxWork: fixtureTask.budgets.maxWork + 1 } }, { output: { name: "action", contract: { kind: "choice", labels: ["reply", "silence", "send"] } } }]) {
      const compiled = compileTask({ ...artifact.task, ...change });
      const candidate = resign({ ...artifact, task: compiled.task, taskDigest: compiled.taskDigest, manifestDigest: compiled.manifestDigest, bundle: { ...artifact.bundle, root: compiled.manifestDigest, manifests: { [compiled.manifestDigest]: json(compiled.manifest) } } });
      expect(() => assertEvaluatedTaskCompatible(candidate, fixtureTask)).toThrow("immutable");
    }
    const compiled = compileTask({ ...artifact.task, instructions: "A candidate instruction." });
    const candidate = resign({ ...artifact, task: compiled.task, taskDigest: compiled.taskDigest, manifestDigest: compiled.manifestDigest, bundle: { ...artifact.bundle, root: compiled.manifestDigest, manifests: { [compiled.manifestDigest]: json(compiled.manifest) } } });
    expect(assertEvaluatedTaskCompatible(candidate, fixtureTask).task.instructions).toBe("A candidate instruction.");
  });

  test("rehashed report tampering is rejected by optimizer reconstruction", async () => {
    const { archive } = await evaluatedTaskFixture();
    const forged = structuredClone(archive);
    forged.report.candidates[0]!.evaluation.validation.passed = 0;
    forged.report = resign(forged.report);
    await expect(verifyTaskWorkflowArchive(resign(forged))).rejects.toThrow("reconstructed optimizer report");
    const changedCase = structuredClone(archive);
    changedCase.config.cases[0]!.sourceId = "different-source";
    await expect(verifyTaskWorkflowArchive(resign(changedCase))).rejects.toThrow("reconstructed optimizer report");
    const changedReceipt = structuredClone(archive);
    const key = Object.keys(changedReceipt.receipts)[0]!;
    (changedReceipt.receipts[key as keyof typeof changedReceipt.receipts] as { outcome: string }).outcome = "failed";
    await expect(verifyTaskWorkflowArchive(resign(changedReceipt))).rejects.toThrow();
    expect(() => parseTaskOptimizationReport({ ...archive.report, digest: digestCanonical(null) })).toThrow("report digest");
  });

  test("preserves partial evaluations and refusals at exhaustion", async () => {
    const c = config();
    c.limits = { ...fixtureLimits, budget: { ...fixtureLimits.budget, runs: 1 } };
    let calls = 0;
    const store = new MemoryStore();
    const report = await optimizeTask({ ...c, store, executors: [{ id: "counted", async execute() { calls++; return "reply"; } }] });
    expect(report.status).toBe("budget-exhausted");
    expect(report.candidates).toHaveLength(0);
    expect(report.budget.runs).toHaveLength(1);
    const archive = await buildTaskWorkflowArchive({ config: c, report, store });
    expect((await verifyTaskWorkflowArchive(archive)).report).toEqual(report);
    expect(calls).toBe(1);
    await expect(buildEvaluatedTaskArtifact({ baseTask: fixtureTask, report, store })).rejects.toThrow("completed selection");
  });

  test("replays non-repeatable outcomes and failed calls without cache substitution", async () => {
    const c = config();
    let calls = 0;
    const store = new MemoryStore();
    const report = await optimizeTask({ ...c, store, executors: [{ id: "varying-outcomes", async execute() {
      calls++;
      if (calls === 2) throw new AlgalError("EFFECT_FAILED", "recorded failure");
      return calls % 2 ? "reply" : "silence";
    } }] });
    const archive = await buildTaskWorkflowArchive({ config: c, report, store });
    expect(report.budget.charged.attempts).toBe(calls);
    expect((await verifyTaskWorkflowArchive(archive)).report).toEqual(report);
    expect(calls).toBe(5);
  });

  test("missing executors and deadline cancellation replay without fresh attempts", async () => {
    for (const hanging of [false, true]) {
      const c = config();
      c.task = compileTask({ ...c.task, effectBudget: { ...c.task.effectBudget, maxEffectMs: 5 } }).task;
      let cancellations = 0;
      const store = new MemoryStore();
      const report = await optimizeTask({ ...c, store, executors: hanging ? [{ id: "deadline-fixture", async execute(_request, signal) {
        signal?.addEventListener("abort", () => cancellations++);
        return new Promise<never>(() => {});
      } }] : [] });
      const archive = await buildTaskWorkflowArchive({ config: c, report, store });
      expect(report.candidates[0]!.evaluation.validation.passed).toBe(0);
      expect((await verifyTaskWorkflowArchive(archive)).report).toEqual(report);
      expect(cancellations).toBe(hanging ? 5 : 0);
    }
  });

  test("replays feedback proposals, rejection and frozen holdout under a data scorer", async () => {
    const c = parseTaskWorkflowConfig({ ...config(), strategy: "feedback", limits: { ...fixtureLimits, maxRounds: 2, maxCandidates: 4 }, reviser: buildTaskReviser({ budgets: fixtureTask.budgets }), scorer: { contract: "algal.expr.v1", program: ["eq", ["get", "outputs", "action"], ["get", "expect", "action"]] } });
    let proposals = 0;
    let holdoutCalls = 0;
    const store = new MemoryStore();
    const report = await optimizeTask({ ...c, store, executors: [{ id: "feedback-fixture", async execute(request) {
      const inputs = asObject(request.context.inputs, "inputs");
      if (inputs.feedback) {
        const feedback = asObject(inputs.feedback, "feedback");
        expect(JSON.stringify(feedback)).not.toContain("Holdout question?");
        expect(JSON.stringify(feedback)).not.toContain("Validation question?");
        if (++proposals === 1) return { invalid: true };
        const parameters = taskParameters(compileTask(feedback.task).task);
        return { contract: "algal.task-parameter-patch.v1", taskDigest: parameters.taskDigest, changes: [{ id: "task.instructions", expectedDigest: parameters.parameters[0]!.digest, value: "Reply to all questions precisely." }] };
      }
      if (inputs.message === "Holdout question?") holdoutCalls++;
      return "reply";
    } }] });
    const archive = await buildTaskWorkflowArchive({ config: c, report, store });
    expect(report.revisions[0]!.rejection).not.toBeNull();
    expect(report.revisions[1]!.candidate).not.toBeNull();
    expect((await verifyTaskWorkflowArchive(archive)).report).toEqual(report);
    expect(holdoutCalls).toBe(1);
  });
});
