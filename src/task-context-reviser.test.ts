import { expect, test } from "bun:test";
import { agentContextReplayToolRegistry } from "./agent-context-tools";
import { manifestToJson } from "./contract";
import type { Executor } from "./effects";
import { checkHabitatBudgetEvidence } from "./habitat-budget";
import { builtinRegistry } from "./registry";
import { MemoryStore } from "./store-memory";
import { parseTaskDefinition, type TaskDefinition } from "./task";
import { buildContextTaskReviser, optimizeTask, parseTaskReviser, type TaskCase } from "./task-optimizer";
import { taskParameters, TASK_PARAMETER_PATCH_CONTRACT } from "./task-parameters";
import { asObject, type JsonValue } from "./values";
import { verifyReceipt } from "./verify";

const budgets = { maxSteps: 8, maxAgentCalls: 2, maxWork: 1_000_000, maxContextBytes: 65_536, maxOutputBytes: 8192, maxDepth: 0 };
const task = () => parseTaskDefinition({ contract: "algal.task.v1", key: "organism:context-policy", name: "Context policy",
  inputs: { message: "text" }, output: { name: "action", contract: { kind: "choice", labels: ["reply", "silence"] } },
  instructions: "Decide whether to reply.", budgets });
const cases = (): TaskCase[] => [
  { id: "train", sourceId: "source-train", split: "train", args: { message: "Training question?" }, expect: { action: "reply" } },
  { id: "validation", sourceId: "source-validation", split: "validation", args: { message: "Validation confidential?" }, expect: { action: "reply" } },
  { id: "audit", sourceId: "source-audit", split: "holdout", args: { message: "Audit confidential?" }, expect: { action: "reply" } },
];
const limits = { maxRounds: 1, maxCandidates: 2, maxExamples: 0, portfolioSize: 1, budget: { work: 30_000_000, attempts: 40, runs: 20 } };
function patch(source: TaskDefinition, valid = true): JsonValue {
  const parameters = taskParameters(source);
  return { contract: TASK_PARAMETER_PATCH_CONTRACT, taskDigest: valid ? parameters.taskDigest : parameters.manifestDigest,
    changes: [{ id: "task.instructions", expectedDigest: parameters.parameters[0]!.digest, value: "Improved: reply to a question." }] };
}

test("context reviser sees exact training executions, preserves audit boundary, and charges both calls", async () => {
  const store = new MemoryStore();
  let calls = 0;
  let auditCalls = 0;
  let selected = false;
  const reviserInputs: string[] = [];
  const executor: Executor = { id: "context-fixture", async execute(request) {
    calls++;
    const inputs = asObject(request.context.inputs, "inputs");
    if (inputs.feedback) {
      reviserInputs.push(JSON.stringify(inputs));
      const feedback = asObject(inputs.feedback, "feedback");
      if (request.cellId === "context-select") {
        expect(feedback.context).toMatchObject({ entries: [{ kind: "instruction" }, { kind: "input" }, { kind: "observation" }] });
        selected = true;
        return { indices: [2] };
      }
      expect(selected).toBe(true);
      const history = asObject(inputs.history, "history");
      const entries = history.entries as { text: string }[];
      const trajectory = JSON.parse(entries[0]!.text);
      expect(trajectory.contract).toBe("algal.run.v1");
      expect(trajectory.args.input.message).toBe("Training question?");
      expect(trajectory.effects[0].output).toBe("silence");
      return patch(feedback.task as unknown as TaskDefinition);
    }
    if (inputs.message === "Audit confidential?") auditCalls++;
    return request.prompt.includes("Improved") ? "reply" : "silence";
  } };
  const report = await optimizeTask({ task: task(), cases: cases(), strategy: "feedback", limits, store, executors: [executor], reviser: buildContextTaskReviser({ budgets }) });
  expect(report.status).toBe("complete");
  expect(report.selected!.task.instructions).toContain("Improved");
  expect(auditCalls).toBe(1);
  expect(report.budget.charged.attempts).toBe(calls);
  expect(reviserInputs).toHaveLength(2);
  for (const input of reviserInputs) {
    expect(input).not.toContain("Validation confidential");
    expect(input).not.toContain("Audit confidential");
    expect(input).not.toContain("source-validation");
  }
  for (const run of report.budget.runs) {
    const receipt = (await store.getReceipt(run.receipt))!;
    const manifest = (await store.getManifest(run.manifest))!;
    expect((await verifyReceipt(receipt, manifestToJson(manifest), store, builtinRegistry(), undefined, agentContextReplayToolRegistry())).ok).toBe(true);
  }
  expect((await checkHabitatBudgetEvidence(report.budget, store, { fns: builtinRegistry(), tools: agentContextReplayToolRegistry() })).mismatches).toEqual([]);
});

test("long Unicode training input is retrievable in exact contiguous pieces", async () => {
  const examples = cases();
  const message = "🌱".repeat(2500);
  examples[0]!.args.message = message;
  let received = false;
  await optimizeTask({ task: task(), cases: examples, strategy: "feedback", limits, store: new MemoryStore(), reviser: buildContextTaskReviser({ budgets }),
    executors: [{ id: "unicode-fixture", async execute(request) {
      const inputs = asObject(request.context.inputs, "inputs");
      if (!inputs.feedback) return "silence";
      const feedback = asObject(inputs.feedback, "feedback");
      if (request.cellId === "context-select") {
        const entries = asObject(feedback.context, "context").entries as { index: number; kind: string; bytes: number }[];
        expect(entries.every(entry => entry.bytes <= 8192)).toBe(true);
        return { indices: entries.filter(entry => entry.kind === "input").map(entry => entry.index) };
      }
      const parts = asObject(inputs.history, "history").entries as { text: string }[];
      expect(JSON.parse(parts.map(entry => entry.text).join(""))).toEqual({ message });
      received = true;
      return patch(feedback.task as unknown as TaskDefinition, false);
    } }],
  });
  expect(received).toBe(true);
});

test("failed context access preserves the incumbent and charges the failed proposal", async () => {
  const original = task();
  let proposer = 0;
  const report = await optimizeTask({ task: original, cases: cases(), strategy: "feedback", limits, store: new MemoryStore(), reviser: buildContextTaskReviser({ budgets }),
    executors: [{ id: "bad-selection", async execute(request) {
      if (request.cellId === "context-select") return { indices: [100] };
      if (asObject(request.context.inputs, "inputs").feedback) proposer++;
      return "silence";
    } }],
  });
  expect(proposer).toBe(0);
  expect(report.candidates).toHaveLength(1);
  expect(report.revisions[0]!.outcome).toBe("failed");
  expect(report.revisions[0]!.rejection).toBe("CAPABILITY_DENIED");
  expect(report.selected!.task).toEqual(original);
  expect(report.budget.charged.attempts).toBe(6); // 2 baseline + failed selector + 3 frozen evaluation
});

test("context profile cannot admit arbitrary tools or increase the supplied call allowance", () => {
  expect(() => buildContextTaskReviser({ budgets: { ...budgets, maxAgentCalls: 1 } })).toThrow();
  expect(() => buildContextTaskReviser({ budgets: { ...budgets, maxSteps: 3 } })).toThrow();
  const reviser = buildContextTaskReviser({ budgets });
  const tool = reviser.manifest.cells.find(cell => cell.kind === "tool")!;
  expect(() => parseTaskReviser({ ...reviser, context: false })).toThrow();
  expect(() => parseTaskReviser({ ...reviser, manifest: { ...reviser.manifest, cells: reviser.manifest.cells.map(cell => cell === tool ? { ...cell, tool: "write.anywhere" } : cell) } })).toThrow();
});
