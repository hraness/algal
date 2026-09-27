import { describe, expect, test } from "bun:test";
import { manifestToJson } from "./contract";
import { digestCanonical } from "./digest";
import type { Executor } from "./effects";
import type { FoundryCandidateResult } from "./foundry";
import { verifyFoundryReport } from "./foundry-verify";
import { checkHabitatBudgetEvidence } from "./habitat-budget";
import { builtinRegistry } from "./registry";
import { MemoryStore } from "./store-memory";
import { parseTaskDefinition, type TaskDefinition } from "./task";
import { buildTaskReviser, optimizeTask, parseTaskCases, selectTaskPortfolio, type TaskCase, type TaskOptimizerLimits } from "./task-optimizer";
import { taskParameters, TASK_PARAMETER_PATCH_CONTRACT } from "./task-parameters";
import { asObject, type JsonValue } from "./values";
import { verifyReceipt } from "./verify";

const budgets = { maxSteps: 4, maxAgentCalls: 1, maxWork: 100_000, maxContextBytes: 32_768, maxOutputBytes: 8192, maxDepth: 0 };
const task = () => parseTaskDefinition({
  contract: "algal.task.v1", key: "organism:optimizer-policy", name: "Optimizer policy",
  inputs: { message: "text" }, output: { name: "action", contract: { kind: "choice", labels: ["reply", "silence"] } },
  instructions: "Decide whether to reply.", budgets,
});
const cases = (): TaskCase[] => [
  { id: "train-question", sourceId: "source-a", split: "train", args: { message: "Training question?" }, expect: { action: "reply" } },
  { id: "train-note", sourceId: "source-b", split: "train", args: { message: "Training note." }, expect: { action: "silence" } },
  { id: "validation-question", sourceId: "source-c", split: "validation", args: { message: "Validation question?" }, expect: { action: "reply" } },
  { id: "holdout-question", sourceId: "source-d", split: "holdout", args: { message: "Untouched question?" }, expect: { action: "reply" } },
];
const limits = (overrides: Partial<TaskOptimizerLimits> = {}): TaskOptimizerLimits => ({ maxRounds: 2, maxCandidates: 4, maxExamples: 2, portfolioSize: 2, budget: { work: 10_000_000, attempts: 100, runs: 100 }, ...overrides });

function instructionPatch(parent: TaskDefinition, instructions: string): JsonValue {
  const params = taskParameters(parent);
  return { contract: TASK_PARAMETER_PATCH_CONTRACT, taskDigest: params.taskDigest, changes: [{ id: "task.instructions", expectedDigest: params.parameters[0]!.digest, value: instructions }] };
}

describe("task optimizer", () => {
  test("fixed and labeled baselines use ordinary foundry evidence", async () => {
    for (const strategy of ["fixed", "labeled"] as const) {
      const store = new MemoryStore();
      const report = await optimizeTask({ task: task(), cases: cases(), strategy, limits: limits(), store, executors: [{ id: "constant-fixture", async execute() { return "silence"; } }] });
      expect(report.status).toBe("complete");
      expect(report.candidates.map(item => item.stage)).toEqual(strategy === "fixed" ? ["fixed"] : ["fixed", "labeled"]);
      expect(report.result!.holdout.passed).toBe(0);
      expect((await verifyFoundryReport(report.result!, store, builtinRegistry())).ok).toBe(true);
      expect((await checkHabitatBudgetEvidence(report.budget, store)).mismatches).toEqual([]);
      const { digest, ...base } = report;
      expect(digest).toBe(digestCanonical(base as unknown as JsonValue));
    }
  });

  test("feedback is training-only, proposals and all evaluations replay, audit happens once after freeze", async () => {
    const store = new MemoryStore();
    const observed: string[] = [];
    let holdoutCalls = 0;
    let calls = 0;
    const executor: Executor = {
      id: "scripted-fixture-not-model-evidence",
      async execute(request) {
        calls++;
        const inputs = asObject(request.context.inputs, "inputs");
        if (inputs.feedback) {
          observed.push(JSON.stringify(inputs.feedback));
          const feedback = asObject(inputs.feedback, "feedback");
          return instructionPatch(feedback.task as unknown as TaskDefinition, "Improved policy: reply when the message contains a question mark.");
        }
        const message = inputs.message as string;
        if (message === "Untouched question?") holdoutCalls++;
        return request.prompt.includes("Improved policy") && message.includes("?") ? "reply" : "silence";
      },
    };
    const report = await optimizeTask({ task: task(), cases: cases(), strategy: "feedback", limits: limits(), store, executors: [executor], reviser: buildTaskReviser({ budgets }) });
    expect(report.status).toBe("complete");
    expect(report.selected!.task.instructions).toContain("Improved policy");
    expect(report.result!.holdout.passed).toBe(1);
    expect(holdoutCalls).toBe(1);
    expect(report.revisions).toHaveLength(2);
    expect(report.revisions.every(revision => revision.rejection === null)).toBe(true);
    expect(report.budget.charged.attempts).toBe(calls);
    expect(observed).toHaveLength(2);
    for (const item of observed) {
      expect(item).toContain("Training question?");
      expect(item).toContain('"outputs":{"action":"silence"}');
      expect(item).not.toContain("Validation question?");
      expect(item).not.toContain("Untouched question?");
      expect(item).not.toContain("source-c");
      expect(item).not.toContain("source-d");
    }
    for (const recorded of report.budget.runs) {
      const receipt = (await store.getReceipt(recorded.receipt))!;
      const manifest = (await store.getManifest(recorded.manifest))!;
      expect((await verifyReceipt(receipt, manifestToJson(manifest), store)).ok).toBe(true);
    }
    expect((await checkHabitatBudgetEvidence(report.budget, store)).mismatches).toEqual([]);
  });

  test("malformed and forged revisions remain charged failures and never change authority", async () => {
    let proposal = 0;
    const report = await optimizeTask({
      task: task(), cases: cases(), strategy: "feedback", limits: limits({ maxExamples: 0 }), store: new MemoryStore(), reviser: buildTaskReviser({ budgets }),
      executors: [{ id: "bad-proposals", async execute(request) {
        const inputs = asObject(request.context.inputs, "inputs");
        if (!inputs.feedback) return "silence";
        if (proposal++ === 0) return { invalid: true };
        return { contract: TASK_PARAMETER_PATCH_CONTRACT, taskDigest: digestCanonical("forged"), changes: [{ id: "task.instructions", expectedDigest: digestCanonical("forged"), value: "Escalate" }] };
      } }],
    });
    expect(report.status).toBe("complete");
    expect(report.candidates).toHaveLength(1);
    expect(report.revisions[0]!.outcome).toBe("failed");
    expect(report.revisions[1]!.rejection).toContain("DIGEST_MISMATCH");
    expect(report.budget.charged.attempts).toBe(9); // 3 selection + 2 proposals + 4 final
    expect(report.selected!.task.instructions).toBe(task().instructions);
  });

  test("rejects source overlap, identical cross-split inputs, mislabeled demos and unknown input labels before dispatch", async () => {
    const reusedSource = cases();
    reusedSource[3]!.sourceId = reusedSource[0]!.sourceId;
    expect(() => parseTaskCases(task(), reusedSource)).toThrow("crosses splits");
    const repeatedInput = cases();
    repeatedInput[3]!.args = repeatedInput[0]!.args;
    expect(() => parseTaskCases(task(), repeatedInput)).toThrow("repeats inputs");
    const leakedLabel = cases();
    leakedLabel[0]!.args.action = "reply";
    expect(() => parseTaskCases(task(), leakedLabel)).toThrow("unknown key");
    let calls = 0;
    const { split: _split, ...holdout } = cases()[3]!;
    await expect(optimizeTask({ task: { ...task(), examples: [holdout] }, cases: cases(), strategy: "fixed", limits: limits(), store: new MemoryStore(), executors: [{ id: "never", async execute() { calls++; return "silence"; } }] })).rejects.toThrow("training case");
    expect(calls).toBe(0);
  });

  test("a proposed demonstration must exactly match training data", async () => {
    const reviser = buildTaskReviser({ budgets });
    const writer = reviser.manifest.cells[1]!;
    if (writer.kind !== "agent") throw new Error("expected agent");
    // A host may supply a broader proposer than the instructions-only helper;
    // the patch parser and source checks still control what can change.
    writer.output = { kind: "json", schema: { type: "object" } };
    const report = await optimizeTask({
      task: task(), cases: cases(), strategy: "feedback", limits: limits({ maxRounds: 1 }), store: new MemoryStore(), reviser,
      executors: [{ id: "label-forger", async execute(request) {
        const inputs = asObject(request.context.inputs, "inputs");
        if (!inputs.feedback) return "silence";
        const parent = asObject(inputs.feedback, "feedback").task as unknown as TaskDefinition;
        const params = taskParameters(parent);
        const { split: _split, ...example } = cases()[0]!;
        return { contract: TASK_PARAMETER_PATCH_CONTRACT, taskDigest: params.taskDigest, changes: [{ id: "task.examples", expectedDigest: params.parameters[1]!.digest, value: [{ ...example, expect: { action: "silence" } }] }] };
      } }],
    });
    expect(report.revisions[0]!.rejection).toContain("training case");
    expect(report.candidates).toHaveLength(2);
  });

  test("budget refusal preserves partial receipts but exposes no deployable selected task", async () => {
    let calls = 0;
    const store = new MemoryStore();
    const report = await optimizeTask({ task: task(), cases: cases(), strategy: "fixed", limits: limits({ budget: { work: 1_000_000, attempts: 2, runs: 100 } }), store, executors: [{ id: "bounded", async execute() { calls++; return "silence"; } }] });
    expect(calls).toBe(2);
    expect(report.status).toBe("budget-exhausted");
    expect(report.selected).toBeNull();
    expect(report.result).toBeNull();
    expect(report.budget.runs).toHaveLength(2);
    expect(report.budget.outcome).toBe("exhausted");
    expect((await checkHabitatBudgetEvidence(report.budget, store)).mismatches).toEqual([]);
  });

  test("portfolio keeps a complementary specialist after the validation champion", () => {
    const candidate = (id: string, passes: boolean[]): FoundryCandidateResult => ({
      manifestDigest: digestCanonical(id), manifestKey: `organism:${id}`, train: { passed: 1, total: 1 }, validation: { passed: passes.filter(Boolean).length, total: passes.length }, work: { steps: 1, agentCalls: 1, units: 1 }, usage: { tokensIn: 0, tokensOut: 0 },
      cases: passes.map((passed, i) => ({ id: `v-${i}`, split: "validation", passed, outcome: "complete", args: {}, expect: {}, outputs: {}, receiptDigest: digestCanonical(`${id}-${i}`), work: { steps: 1, agentCalls: 1, units: 1 }, usage: { tokensIn: 0, tokensOut: 0 } })),
    });
    const champion = candidate("champion", [true, true, true, false]);
    const redundant = candidate("redundant", [true, true, false, false]);
    const specialist = candidate("specialist", [false, false, false, true]);
    expect(selectTaskPortfolio([redundant, specialist, champion], 2)).toEqual([champion.manifestDigest, specialist.manifestDigest]);
  });

  test("reviser cannot introduce tool, slot or dynamic child execution", async () => {
    const reviser = buildTaskReviser({ budgets });
    reviser.manifest.cells.push({ id: "write", kind: "slot", name: "danger", mode: "write" });
    await expect(optimizeTask({ task: task(), cases: cases(), strategy: "feedback", limits: limits(), store: new MemoryStore(), executors: [], reviser })).rejects.toThrow("not allowed");
  });

  test("hanging revision attempts stop at their deadline, stay charged and replay", async () => {
    const store = new MemoryStore();
    let proposals = 0;
    const report = await optimizeTask({
      task: task(), cases: cases(), strategy: "feedback", limits: limits({ maxRounds: 1, maxExamples: 0 }), store,
      reviser: buildTaskReviser({ budgets, effectBudget: { maxEffectMs: 10 } }),
      executors: [{ id: "hanging-proposer", async execute(request) {
        if (asObject(request.context.inputs, "inputs").feedback) { proposals++; return new Promise<JsonValue>(() => {}); }
        return "silence";
      } }],
    });
    expect(report.status).toBe("complete");
    expect(report.revisions[0]!.outcome).toBe("failed");
    expect(report.revisions[0]!.rejection).toBe("BUDGET_EXHAUSTED");
    expect(report.budget.charged.attempts).toBe(8);
    expect(proposals).toBe(1);
    const recorded = report.revisions[0]!;
    const receipt = (await store.getReceipt(recorded.receiptDigest))!;
    const manifest = (await store.getManifest(recorded.manifestDigest))!;
    expect((await verifyReceipt(receipt, manifestToJson(manifest), store)).ok).toBe(true);
    expect((await checkHabitatBudgetEvidence(report.budget, store)).mismatches).toEqual([]);
  });

  test("custom revision manifests must declare an effect deadline", async () => {
    const reviser = buildTaskReviser({ budgets });
    const agent = reviser.manifest.cells[1]!;
    if (agent.kind !== "agent") throw new Error("expected agent");
    delete agent.budget;
    await expect(optimizeTask({ task: task(), cases: cases(), strategy: "feedback", limits: limits(), store: new MemoryStore(), executors: [], reviser })).rejects.toThrow("maxEffectMs deadline");
  });
});
