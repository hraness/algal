/** Credential-free authoring and optimization example. The fixture executor
 * validates the workflow; its scores are not evidence about language models. */
import { FileStore, buildTaskReviser, compileTask, optimizeTask, type Executor, type TaskCase } from "../index";

const task = compileTask({ contract: "algal.task.v1", key: "organism:ticket-router-task", name: "Ticket routing",
  inputs: { message: { type: "text" } }, output: { name: "team", contract: { kind: "choice", labels: ["billing", "support"] } },
  instructions: "Route invoice questions to billing and product failures to support.",
  budgets: { maxSteps: 4, maxAgentCalls: 1, maxWork: 100_000, maxContextBytes: 32_768, maxOutputBytes: 8192, maxDepth: 1 }, effectBudget: { maxEffectMs: 30_000 },
}).task;
const cases: TaskCase[] = [
  { id: "invoice", sourceId: "conversation-one", split: "train", args: { message: "Invoice is incorrect" }, expect: { team: "billing" } },
  { id: "failure", sourceId: "conversation-two", split: "train", args: { message: "The app stopped working" }, expect: { team: "support" } },
  { id: "receipt", sourceId: "conversation-three", split: "validation", args: { message: "Please send the invoice" }, expect: { team: "billing" } },
  { id: "audit", sourceId: "conversation-four", split: "holdout", args: { message: "I cannot open the app" }, expect: { team: "support" } },
];
const executor: Executor = { id: "example:deterministic-ticket-router", capabilities: { effects: ["agent"] },
  async execute(request) {
    const inputs = request.context.inputs;
    if (!inputs || typeof inputs !== "object" || Array.isArray(inputs) || typeof inputs.message !== "string") throw new Error("missing message");
    return inputs.message.toLowerCase().includes("invoice") ? "billing" : "support";
  } };
const report = await optimizeTask({ task, cases, strategy: "labeled", executors: [executor], store: new FileStore(".algal/task-example"),
  limits: { maxCandidates: 2, maxRounds: 0, maxExamples: 2, portfolioSize: 2, budget: { runs: 24, attempts: 24, work: 1_000_000 } } });
console.log(JSON.stringify({ mode: "scripted-workflow-check", status: report.status,
  selected: report.selected?.manifestDigest, holdout: report.result?.holdout, charged: report.budget.charged }, null, 2));

// For an explicitly configured model executor, use strategy: "feedback",
// maxRounds >= 1, and this reviser. It only proposes guarded instruction edits.
export const reviser = buildTaskReviser({ budgets: { maxSteps: 4, maxAgentCalls: 1, maxWork: 100_000, maxContextBytes: 32_768, maxOutputBytes: 8192, maxDepth: 1 } });
