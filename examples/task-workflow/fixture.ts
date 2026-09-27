/** Deterministic transport fixture; this does not measure model usefulness. */
import { buildTaskWorkflowArchive, type TaskWorkflowConfig } from "../../src/task-workflow";
import { buildEvaluatedTaskArtifact } from "../../src/task-artifact";
import { MemoryStore } from "../../src/store-memory";
import { parseTaskDefinition } from "../../src/task";
import { optimizeTask, type TaskCase, type TaskOptimizerLimits } from "../../src/task-optimizer";

export const fixtureTask = parseTaskDefinition({
  contract: "algal.task.v1", key: "organism:task-workflow-fixture", name: "Task workflow fixture",
  inputs: { message: "text" }, output: { name: "action", contract: { kind: "choice", labels: ["reply", "silence"] } },
  instructions: "Reply to questions. Stay silent otherwise.",
  budgets: { maxSteps: 4, maxAgentCalls: 1, maxWork: 100_000, maxContextBytes: 16_384, maxOutputBytes: 4096, maxDepth: 0 },
});
export const fixtureCases: TaskCase[] = [
  { id: "train", sourceId: "source-train", split: "train", args: { message: "Training question?" }, expect: { action: "reply" } },
  { id: "validation", sourceId: "source-validation", split: "validation", args: { message: "Validation question?" }, expect: { action: "reply" } },
  { id: "holdout", sourceId: "source-holdout", split: "holdout", args: { message: "Holdout question?" }, expect: { action: "reply" } },
];
export const fixtureLimits: TaskOptimizerLimits = { maxRounds: 0, maxCandidates: 2, maxExamples: 1, portfolioSize: 2, budget: { work: 2_000_000, attempts: 20, runs: 20 } };
export async function evaluatedTaskFixture() {
  const store = new MemoryStore();
  const config: TaskWorkflowConfig = { contract: "algal.task-workflow.v1", task: fixtureTask, cases: fixtureCases, strategy: "labeled", limits: fixtureLimits };
  const report = await optimizeTask({ ...config, store, executors: [{ id: "fixture-only", async execute() { return "reply"; } }] });
  const artifact = await buildEvaluatedTaskArtifact({ baseTask: fixtureTask, report, store });
  const archive = await buildTaskWorkflowArchive({ config, report, store });
  return { artifact, archive, config, report, store, baseTask: fixtureTask };
}
if (import.meta.main) console.log(JSON.stringify((await evaluatedTaskFixture()).artifact, null, 2));
