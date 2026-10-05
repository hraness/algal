import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { putAgentContext } from "../../src/agent-context";
import { captureContextHistory, ContextHistoryHost, type ContextHistoryCurrent } from "../../src/context-history";
import { contextHistoryDigest, parseContextHistoryGeneration, parseContextHistorySummary, type ContextHistoryGeneration } from "../../src/context-history-contract";
import { ContextSummaryDriver, contextSummaryPrompt, planContextSummaries, type ContextSummaryRecipe } from "../../src/context-summary";
import { asDigest, digestCanonical } from "../../src/digest";
import { scriptedExecutor } from "../../src/effects";
import { AlgalError } from "../../src/errors";
import { HabitatAccount } from "../../src/habitat-budget";
import { ProcessSupervisor } from "../../src/process";
import { exportProcessEvidence, verifyProcessEvidence } from "../../src/process-evidence";
import { FileStore } from "../../src/store";

export async function scriptedContextSummary(includeEvidence = false, outcome: "complete" | "failed" = "complete") {
  if (typeof includeEvidence !== "boolean" || !["complete", "failed"].includes(outcome)) throw new Error("invalid scripted summary options");
  const dir = await mkdtemp(join(tmpdir(), "algal-scripted-context-history-"));
  try {
    const store = new FileStore(dir);
    const snapshot = await putAgentContext(store, [
      { kind: "observation", label: "initial-decision", text: "The team chose a local index. The provider option remains unresolved." },
      { kind: "observation", label: "correction", text: "Correction: the local index is a prototype, not a production deployment." },
      { kind: "input", label: "recent-work", text: "Recover the original decision and its correction before proposing a rollout." },
      { kind: "output", label: "pending-action", text: "No rollout has been approved." },
    ]);
    const scope = { application: "example", realm: "local", workspace: "synthetic", task: "decision", audience: "owner" };
    const history = await captureContextHistory(store, {
      scope, head: digestCanonical({ sequence: 4 }), snapshot, epoch: 0, firstPosition: 0,
      sources: Array.from({ length: 4 }, (_, sourceIndex) => ({ sourceIndex, position: sourceIndex, event: digestCanonical({ event: sourceIndex }) })),
    });
    const executor = scriptedExecutor({ summarize: "The local index is only a prototype. The provider option and any production rollout remain unresolved. Expand the original decision and its correction before acting." }, "summary-example");
    if (outcome === "failed") executor.execute = async () => { throw new AlgalError("EFFECT_FAILED", "scripted settled summary failure"); };
    const recipe: ContextSummaryRecipe = {
      prompt: "Summarize the selected history as a reading aid. Preserve corrections and unresolved work. Return only summary text.",
      policy: digestCanonical("example-source-preserving-policy-v1"), summarizer: digestCanonical("example-scripted-summarizer-v1"),
      executor: executor.id, configuration: asDigest(executor.cacheIdentity, "scripted executor configuration"), maxEffectMs: 2_000,
    };
    const generation: ContextHistoryGeneration = {
      schema: "algal.context-history-generation.v1", history: contextHistoryDigest(history), generation: 0,
      prompt: contextSummaryPrompt(recipe), policy: recipe.policy, summarizer: recipe.summarizer, summaries: [],
    };
    const parent = { generation, nodes: [], summaries: [] };
    const current: ContextHistoryCurrent = {
      access: { schema: "algal.context-history-access.v1", history: contextHistoryDigest(history), scope, head: history.head,
        snapshot, revision: 0, indices: [0, 1, 2, 3], state: "active" }, invalidated: [],
    };
    const host = new ContextHistoryHost(store, { principal: "owner", resolveCurrent: () => structuredClone(current) });
    const reference = await host.admit(history, { recentLeaves: 0, derivatives: parent });
    const account = new HabitatAccount("experiment", { work: 20_000_000, attempts: 1, runs: 1 });
    const driver = new ContextSummaryDriver({ dir, historyHost: host, account, executor });
    const plan = planContextSummaries({ history, parent, recipe, ranges: [{ start: 0, end: 2 }] });
    const input = { reference, plan, request: plan.requests[0]! };
    const pending = await host.bind(reference).overview();
    const execution = await driver.run(input);
    if (!execution.job || execution.result?.status !== outcome) throw new Error("scripted summary did not reach its expected result");
    const verified = await driver.verify({ ...input, job: execution.job });
    if (!verified.ok) throw new Error("scripted summary did not replay offline");
    const saved = await new ProcessSupervisor(dir).inspect(execution.job.name);
    const evidence = await exportProcessEvidence(saved, store, driver.evidenceTools(input));
    const evidenceVerified = await verifyProcessEvidence(evidence);
    const published = outcome === "complete" ? await driver.publish({ reference, plan, jobs: [execution.job] }) : null;
    const summary = execution.result.summary ? parseContextHistorySummary(await store.getValue(execution.result.summary)) : null;
    const active = published ? parseContextHistoryGeneration(await store.getValue(published)) : generation;
    const nodes = active.summaries.map(entry => plan.nodes.find(node => contextHistoryDigest(node) === entry.node)!);
    const records = { history, node: plan.nodes.find(node => contextHistoryDigest(node) === input.request.node)!,
      request: input.request, queue: plan.queue, result: execution.result, summary, generation: active, nodes };
    const original = await host.bind(reference).read(0);
    const view = await host.bind(reference).overview();
    return { pending: pending.status, completion: execution.result.status, offlineVerified: verified.ok,
      evidenceVerified: evidenceVerified.ok, readSignatures: Object.keys(evidence.tools).length,
      generation: published, original: original.text, view: view.status, charged: account.record().charged,
      ...(includeEvidence ? { evidence, records } : {}) };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

if (import.meta.main) {
  const args = Bun.argv.slice(2);
  if (args.length > 1 || args.some(arg => arg !== "--evidence")) throw new Error("only --evidence is supported");
  const result = await scriptedContextSummary(args.length === 1);
  console.log(JSON.stringify(args.length === 1 ? result.evidence : result));
}
