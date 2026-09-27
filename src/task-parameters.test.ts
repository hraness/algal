import { describe, expect, test } from "bun:test";
import { digestCanonical } from "./digest";
import { compileTask, parseTaskDefinition } from "./task";
import { applyTaskParameterPatch, taskParameters, TASK_PARAMETER_PATCH_CONTRACT } from "./task-parameters";

const task = () => parseTaskDefinition({
  contract: "algal.task.v1", key: "organism:parameters", name: "Parameters",
  inputs: { query: "text" }, output: { name: "answer", contract: { kind: "text" } }, instructions: "Answer briefly.",
  budgets: { maxSteps: 4, maxAgentCalls: 1, maxWork: 1000, maxContextBytes: 1024, maxOutputBytes: 1024, maxDepth: 0 },
  route: { provider: "host", model: "fixed-model" },
});

describe("task parameters", () => {
  test("guarded changes compile and preserve every non-editable field", () => {
    const original = task();
    const parameters = taskParameters(original);
    const next = applyTaskParameterPatch(original, {
      contract: TASK_PARAMETER_PATCH_CONTRACT, taskDigest: parameters.taskDigest,
      changes: [{ id: "task.instructions", expectedDigest: parameters.parameters[0]!.digest, value: "Answer with one sentence." }],
    });
    expect(next.instructions).toBe("Answer with one sentence.");
    expect(original.instructions).toBe("Answer briefly.");
    const { instructions: _before, ...before } = original;
    const { instructions: _after, ...after } = next;
    expect(after).toEqual(before);
    expect(compileTask(next).manifestDigest).not.toBe(compileTask(original).manifestDigest);
  });

  test("a late invalid change or stale digest leaves the source untouched", () => {
    const original = task();
    const parameters = taskParameters(original);
    const first = { id: "task.instructions", expectedDigest: parameters.parameters[0]!.digest, value: "Changed." };
    expect(() => applyTaskParameterPatch(original, {
      contract: TASK_PARAMETER_PATCH_CONTRACT, taskDigest: parameters.taskDigest,
      changes: [first, { id: "task.examples", expectedDigest: parameters.parameters[1]!.digest, value: "not examples" }],
    })).toThrow("examples");
    expect(taskParameters(original)).toEqual(parameters);
    expect(() => applyTaskParameterPatch(original, { contract: TASK_PARAMETER_PATCH_CONTRACT, taskDigest: digestCanonical("stale"), changes: [first] })).toThrow("stale task");
    expect(() => applyTaskParameterPatch(original, { contract: TASK_PARAMETER_PATCH_CONTRACT, taskDigest: parameters.taskDigest, changes: [{ ...first, expectedDigest: digestCanonical("stale") }] })).toThrow("stale value");
  });

  test("rejects tool, route and budget edits, duplicate ids and unknown keys", () => {
    const original = task();
    const parameters = taskParameters(original);
    const base = { contract: TASK_PARAMETER_PATCH_CONTRACT, taskDigest: parameters.taskDigest };
    const first = { id: "task.instructions", expectedDigest: parameters.parameters[0]!.digest, value: "Changed." };
    for (const id of ["task.tools", "task.route", "task.budgets", "task.effectBudget", "task.inputs", "task.output"]) {
      expect(() => applyTaskParameterPatch(original, { ...base, changes: [{ ...first, id }] })).toThrow("not editable");
    }
    expect(() => applyTaskParameterPatch(original, { ...base, changes: [first, first] })).toThrow("duplicate");
    expect(() => applyTaskParameterPatch(original, { ...base, changes: [first], run: "sh" })).toThrow("unknown key");
  });
});
