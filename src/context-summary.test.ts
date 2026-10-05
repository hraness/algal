import { afterEach, describe, expect, setDefaultTimeout, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { putAgentContext, type AgentContextEntryInput } from "./agent-context";
import {
  CONTEXT_HISTORY_JOB_CEILINGS, contextHistoryDigest, contextHistoryNode, parseContextHistory, parseContextHistoryGeneration,
  parseContextHistorySummaryResult, validateContextHistoryQueue, validateContextHistorySummaryResult,
  type ContextHistory, type ContextHistoryGeneration, type ContextHistorySummary,
} from "./context-history-contract";
import { captureContextHistory, ContextHistoryHost, type ContextHistoryCurrent, type ContextHistoryDerivatives } from "./context-history";
import {
  ContextSummaryDriver, contextSummaryPrompt, planContextSummaries,
  type ContextSummaryExecution, type ContextSummaryRecipe,
} from "./context-summary";
import { manifestToJson, parseOrganismManifest } from "./contract";
import { digestCanonical, type Digest } from "./digest";
import { effectRequestDigest, type EffectRequest, type Executor, type ExecutorMetadata } from "./effects";
import { AlgalError } from "./errors";
import { HabitatAccount } from "./habitat-budget";
import { ProcessSupervisor } from "./process";
import { builtinRegistry } from "./registry";
import { parseRunReceipt, runOrganism } from "./run";
import { FileStore } from "./store";
import { asJsonValue, canonicalBytes, type JsonValue } from "./values";
import { verifyReceipt } from "./verify";
import { contextSummaryVectors } from "../scripts/context-summary-vectors";
import summaryVectors from "../scripts/fixtures/context-summary.json";

setDefaultTimeout(20_000);
const directories: string[] = [];
afterEach(async () => {
  for (const dir of directories.splice(0)) await rm(dir, { recursive: true, force: true });
});
const hash = (value: unknown): Digest => digestCanonical(asJsonValue(value, "test identity"));
const scope = { application: "app", realm: "realm", workspace: "workspace", task: "task", audience: "owner" };
const recipe: ContextSummaryRecipe = {
  prompt: "Summarize the selected historical records. Keep corrections and unresolved decisions visible. Return only summary text.",
  policy: hash("source-preserving-test-policy"), summarizer: hash("scripted-summary-v1"),
  executor: "summary-scripted", configuration: hash("scripted-configuration-v1"), maxEffectMs: 2_000,
};
const originals = (count: number): AgentContextEntryInput[] => Array.from({ length: count }, (_, i) => ({
  kind: "observation", label: `event-${i}`, text: `Original ${i}: decision ${i}, not an admitted current claim.\n`,
}));
function pool(history: ContextHistory, ranges: [number, number][], counter = 0): ContextHistoryDerivatives {
  const nodes = ranges.map(([start, end]) => contextHistoryNode(history, start, end));
  const summaries: ContextHistorySummary[] = nodes.map(node => ({
    schema: "algal.context-history-summary.v1", history: contextHistoryDigest(history), node: contextHistoryDigest(node),
    sources: node.sources, children: [], prompt: contextSummaryPrompt(recipe), policy: recipe.policy,
    summarizer: recipe.summarizer, body: `Existing summary ${node.start}:${node.end}`,
  }));
  const generation: ContextHistoryGeneration = {
    schema: "algal.context-history-generation.v1", history: contextHistoryDigest(history), generation: counter,
    prompt: contextSummaryPrompt(recipe), policy: recipe.policy, summarizer: recipe.summarizer,
    summaries: summaries.map(summary => ({ node: summary.node, summary: contextHistoryDigest(summary) })),
  };
  return { generation, nodes, summaries };
}
async function fixture(values = originals(4), ranges: [number, number][] = []) {
  const dir = await mkdtemp(join(tmpdir(), "algal-context-summary-")); directories.push(dir);
  const store = new FileStore(dir);
  const snapshot = await putAgentContext(store, values);
  const capture = {
    scope, head: hash({ ownerSequence: 9 }), snapshot, epoch: 0, firstPosition: 0,
    sources: values.map((_, sourceIndex) => ({ sourceIndex, position: sourceIndex, event: hash({ event: sourceIndex }) })),
  };
  const history = await captureContextHistory(store, capture);
  let current: ContextHistoryCurrent = {
    access: { schema: "algal.context-history-access.v1", history: contextHistoryDigest(history), scope,
      head: history.head, snapshot, revision: 0, indices: values.map((_, i) => i), state: "active" },
    invalidated: [],
  };
  const parent = pool(history, ranges);
  const host = new ContextHistoryHost(store, { principal: "owner", resolveCurrent: () => structuredClone(current) });
  const reference = await host.admit(history, { recentLeaves: 0, protectedIndices: [], derivatives: parent });
  const account = new HabitatAccount("experiment", { work: 100_000_000, attempts: 8, runs: 16 });
  let calls = 0;
  let response: (request: EffectRequest, signal?: AbortSignal) => Promise<JsonValue> = async () => "The first decision is historical; the unresolved follow-up remains open.";
  let lastRequest: EffectRequest | undefined;
  const executor: Executor = {
    id: recipe.executor, cacheIdentity: recipe.configuration, cacheable: false, retryable: false,
    journalConfigurationFor: () => recipe.configuration,
    async execute(request, signal) { calls++; lastRequest = structuredClone(request); return response(request, signal); },
  };
  const driver = new ContextSummaryDriver({ dir, historyHost: host, account, executor });
  const plan = planContextSummaries({ history, parent, recipe, ranges: [{ start: 0, end: 2 }] });
  const input = (p = plan, index = 0) => ({ reference, plan: p, request: p.requests[index]! });
  return {
    dir, store, values, snapshot, capture, history, parent, reference, host, account, executor, driver, plan, input,
    get current() { return current; }, set current(value: ContextHistoryCurrent) { current = value; },
    get calls() { return calls; }, get lastRequest() { return lastRequest; },
    set response(value: typeof response) { response = value; },
  };
}
function job(execution: ContextSummaryExecution) {
  if (!execution.job) throw new Error("expected a durable summary job");
  return execution.job;
}
async function recorded(f: Awaited<ReturnType<typeof fixture>>, execution: ContextSummaryExecution) {
  const snapshot = await new ProcessSupervisor(f.dir).inspect(job(execution).name);
  if (!snapshot.process.receipt) throw new Error("expected settled process receipt");
  const raw = await f.store.getReceipt(snapshot.process.receipt);
  if (!raw) throw new Error("expected stored process receipt");
  return { snapshot, raw, receipt: parseRunReceipt(raw) };
}
function synthetic(count: number): ContextHistory {
  return parseContextHistory({
    schema: "algal.context-history.v1", scope, head: hash("synthetic-head"), snapshot: hash("synthetic-snapshot"), epoch: 0, firstPosition: 0,
    leaves: Array.from({ length: count }, (_, i) => ({ position: i, sourceIndex: i, entry: hash("empty-entry"), event: hash({ event: i }),
      bytes: 0, kind: "observation", label: "empty" })),
  });
}

describe("deterministic summary planning", () => {
  test("shared vectors freeze completed and failed receipts, lineage, account charges and refusals", async () => {
    const built = await contextSummaryVectors();
    expect(built.golden).toEqual(summaryVectors);
    expect(built.evidence.map(item => item.name)).toEqual(["complete", "failed"]);
    expect(built.evidence.map(item => item.value.records[item.value.head]!.status)).toEqual(["complete", "failed"]);
    expect(built.vectors).toHaveLength(7);
  });
  test("capture, append, ordinary reads and planning never call the supplied executor", async () => {
    const f = await fixture(originals(8));
    const before = await f.host.bind(f.reference).overview();
    expect(before.items.some(item => item.kind === "pending")).toBe(true);
    await f.host.bind(f.reference).read(0);
    await putAgentContext(f.store, [...f.values, { kind: "input", label: "append", text: "Later owner event" }]);
    expect(await captureContextHistory(f.store, f.capture)).toEqual(f.history);
    const plan = planContextSummaries({ history: f.history, parent: f.parent, recipe, ranges: [{ start: 0, end: 2 }, { start: 2, end: 4 }] });
    expect(plan).toEqual(planContextSummaries({ history: f.history, parent: f.parent, recipe, ranges: [{ start: 2, end: 4 }, { start: 0, end: 2 }] }));
    expect(plan.requests.map(request => request.generation)).toEqual([1, 1]);
    expect(plan.requests.every(request => request.children.length === 0)).toBe(true);
    validateContextHistoryQueue(f.history, plan.queue, plan.requests);
    expect(plan.work.planning).toBeGreaterThan(0);
    expect(f.calls).toBe(0);
    expect(f.account.record().charged).toEqual({ work: 0, attempts: 0, runs: 0 });
  });
  test("aligned nodes are ordered bottom-up; large nodes can bind two complete children", async () => {
    const f = await fixture(originals(8), [[0, 2], [2, 4]]);
    const plan = planContextSummaries({ history: f.history, parent: f.parent, recipe, ranges: [{ start: 0, end: 4 }] });
    expect(plan.requests[0]!.children).toEqual(f.parent.summaries.map(contextHistoryDigest));
    const execution = await f.driver.run(f.input(plan));
    expect(execution.result?.status).toBe("complete");
    expect(f.lastRequest!.context.inputs).toMatchObject({ data: { children: f.parent.summaries, originals: [] } });
    const generation = await f.driver.publish({ reference: f.reference, plan, jobs: [job(execution)] });
    const expanded = await f.host.bind(f.reference).expand(contextHistoryDigest(contextHistoryNode(f.history, 0, 4)));
    expect(expanded.items.map(item => item.kind)).toEqual(["summary", "summary"]);
    expect((await f.host.bind(f.reference).inspect()).generation).toBe(generation);
  });
  test("default work never silently queues more than four full-ceiling jobs", () => {
    const history = synthetic(8);
    expect(() => planContextSummaries({ history, parent: pool(history, []), recipe })).toThrow();
    const plan = planContextSummaries({ history, parent: pool(history, []), recipe, ranges: [
      { start: 0, end: 2 }, { start: 2, end: 4 }, { start: 4, end: 6 }, { start: 6, end: 8 },
    ] });
    expect(plan.queue.work).toBe(67_108_864);
    expect(plan.queue.requests).toHaveLength(4);
  });
  test("queue count, encoded bytes, generation, batch, source and work bounds are enforced", () => {
    const history = synthetic(256);
    const parent = pool(history, []);
    const small = { ...CONTEXT_HISTORY_JOB_CEILINGS, maxWork: 1 };
    const plan = planContextSummaries({ history, parent, recipe, limits: small, batchSize: 32 });
    expect(plan.requests).toHaveLength(255);
    expect(plan.queue.work).toBe(255);
    expect(canonicalBytes(asJsonValue(plan.queue, "queue")) + plan.requests.reduce((n, r) => n + canonicalBytes(asJsonValue(r, "request")), 0)).toBeLessThanOrEqual(524_288);
    const wide = synthetic(1024);
    expect(() => planContextSummaries({ history: wide, parent: pool(wide, []), recipe, limits: small })).toThrow();
    for (const batchSize of [0, 33, 1.5]) expect(() => planContextSummaries({ history, parent, recipe, limits: small, batchSize })).toThrow();
    expect(() => synthetic(1025)).toThrow();
    expect(() => planContextSummaries({ history, parent: pool(history, [], 4095), recipe, ranges: [] })).toThrow();
    const changed = { ...synthetic(2), leaves: synthetic(2).leaves.map(leaf => ({ ...leaf, bytes: 40_000 })) };
    expect(() => planContextSummaries({ history: changed, parent: pool(changed, []), recipe })).toThrow();
  });
  test("corrections queue affected nodes and every ancestor without reviving unrelated facts", async () => {
    const f = await fixture(originals(8), [[0, 2], [2, 4], [4, 6], [6, 8], [0, 4], [4, 8], [0, 8]]);
    f.current = { ...f.current, invalidated: [0], access: { ...f.current.access, revision: 1 } };
    const plan = planContextSummaries({ history: f.history, parent: f.parent, recipe, invalidated: [0] });
    expect(plan.nodes.map(node => [node.start, node.end])).toEqual([[0, 2], [0, 4], [0, 8]]);
    expect(plan.requests.every(request => request.children.length === 0)).toBe(true);
    const view = await f.host.bind(f.reference).overview();
    expect(view.items[0]!.kind).toBe("pending");
    expect((await f.host.bind(f.reference).read(0)).text).toBe(f.values[0]!.text);
    expect(f.current.invalidated).toEqual([0]);
    expect(f.calls).toBe(0);
  });
});

describe("recorded summary execution and publication", () => {
  test("one ordinary model effect completes with exact encoded usage and debits the existing account", async () => {
    const f = await fixture();
    const prior = parseOrganismManifest({ contract: "algal.organism.v1", key: "organism:prior-work", name: "Prior work", budgets: { maxAgentCalls: 0 }, cells: [{ id: "x", kind: "const", outputs: { out: { type: "text", value: "prior" } } }], edges: [] });
    const priorDigest = await f.store.putManifest(prior);
    f.account.reserve(priorDigest, prior.budgets);
    const receipt = await runOrganism({ manifest: prior, store: f.store, fns: builtinRegistry(), executors: [] });
    f.account.charge(await f.store.putReceipt(asJsonValue(receipt, "prior receipt")), receipt);
    const before = f.account.record();
    const execution = await f.driver.run(f.input());
    expect(execution.state).toBe("settled");
    const { snapshot, raw, receipt: finished } = await recorded(f, execution);
    expect(snapshot.process.maxGenerations).toBe(1);
    expect(snapshot.process.generation).toBe(1);
    expect(finished.effects.filter(effect => !effect.executor.startsWith("tool:"))).toHaveLength(1);
    expect(finished.effects.filter(effect => effect.executor.startsWith("tool:")).length).toBeGreaterThanOrEqual(4);
    expect(finished.work.agentCalls).toBe(1);
    const result = parseContextHistorySummaryResult(execution.result);
    const summary = await f.store.getValue(result.summary!);
    validateContextHistorySummaryResult(f.plan.requests[0], result, summary);
    expect(result.usage.inputBytes).toBe(canonicalBytes(asJsonValue(f.lastRequest, "entire model request")));
    expect(result.usage.outputBytes).toBe(canonicalBytes(summary!));
    expect(result.usage.work).toBe(finished.work.units);
    const account = f.account.record();
    expect(account.runs[0]).toEqual(before.runs[0]);
    expect(account.charged.work).toBe(before.charged.work + finished.work.units);
    expect(account.charged.attempts).toBe(1);
    expect(account.charged.runs).toBe(2);
    const checkpoint = await f.store.getValue(job(execution).checkpoint);
    expect(checkpoint).toEqual(asJsonValue(before, "checkpoint"));
    expect(asJsonValue(snapshot.process.args, "args")).toMatchObject({ job: { checkpoint: job(execution).checkpoint } });
    expect(await verifyReceipt(raw, manifestToJson((await f.store.getManifest(job(execution).manifest))!), f.store, builtinRegistry(), undefined, f.driver.evidenceTools(f.input()))).toMatchObject({ ok: true });
    expect(f.calls).toBe(1);
  });
  test("a complete bounded batch publishes once against its shared parent generation", async () => {
    const f = await fixture(originals(8));
    const plan = planContextSummaries({ history: f.history, parent: f.parent, recipe,
      ranges: [{ start: 0, end: 2 }, { start: 2, end: 4 }, { start: 4, end: 6 }, { start: 6, end: 8 }] });
    expect(plan.queue.batchSize).toBe(4);
    const jobs = [];
    for (const request of plan.requests) {
      const execution = await f.driver.run({ reference: f.reference, plan, request });
      expect(execution.result?.status).toBe("complete");
      jobs.push(job(execution));
    }
    const published = await f.driver.publish({ reference: f.reference, plan, jobs });
    const generation = parseContextHistoryGeneration(await f.store.getValue(published));
    expect(generation.generation).toBe(1);
    expect(generation.summaries).toHaveLength(4);
    const children = await f.host.bind(f.reference).expand(contextHistoryDigest(contextHistoryNode(f.history, 0, 4)));
    expect(children.items.map(item => item.kind)).toEqual(["summary", "summary"]);
    expect(f.account.record().charged).toMatchObject({ attempts: 4, runs: 4 });
    expect(f.calls).toBe(4);
  });
  test("offline replay calls neither provider nor source owner, even after revocation and source loss", async () => {
    const f = await fixture();
    const execution = await f.driver.run(f.input());
    const reader = f.host.bind(f.reference);
    f.current = { ...f.current, access: { ...f.current.access, state: "revoked", revision: 1 } };
    f.host.revoke(f.reference);
    const get = f.store.getValue.bind(f.store);
    let sourceReads = 0;
    f.store.getValue = async id => {
      if (id === f.snapshot || f.history.leaves.some(leaf => leaf.entry === id)) { sourceReads++; throw new Error("offline replay must not read originals"); }
      return get(id);
    };
    expect(await f.driver.verify({ ...f.input(), job: job(execution) })).toMatchObject({ ok: true });
    expect(f.calls).toBe(1);
    expect(sourceReads).toBe(0);
    await expect(f.driver.publish({ reference: f.reference, plan: f.plan, jobs: [job(execution)] })).rejects.toMatchObject({ code: "CAPABILITY_DENIED" });
    await expect(reader.overview()).rejects.toMatchObject({ code: "CAPABILITY_DENIED" });
  });
  test("duplicate and concurrent completion is first-wins and alternatives cannot substitute bodies", async () => {
    const f = await fixture();
    const [one, two] = await Promise.all([f.driver.run(f.input()), f.driver.run(f.input())]);
    expect(one).toEqual(two);
    expect(f.calls).toBe(1);
    expect(f.account.record().charged.runs).toBe(1);
    f.response = async () => "An alternative body must never replace the completed result.";
    const second = new ContextSummaryDriver({ dir: f.dir, historyHost: f.host, account: f.account, executor: f.executor });
    expect(await second.run(f.input())).toEqual(one);
    expect(f.calls).toBe(1);
    const generation = await second.publish({ reference: f.reference, plan: f.plan, jobs: [job(one)] });
    expect(await f.driver.publish({ reference: f.reference, plan: f.plan, jobs: [job(two)] })).toBe(generation);
    await expect(f.driver.publish({ reference: f.reference, plan: f.plan, jobs: [{ ...job(one), request: hash("alternative-request") }] })).rejects.toThrow();
    await expect(f.driver.publish({ reference: f.reference, plan: f.plan, jobs: [{ ...job(one), receipt: hash("alternative-receipt") }] })).rejects.toThrow();
    const { raw, snapshot } = await recorded(f, one);
    const receipt = parseRunReceipt(raw);
    const changed = asJsonValue({ ...receipt, cells: { ...receipt.cells, finish: { ...receipt.cells.finish, outputs: { record: { body: "alternative" } } } } }, "changed receipt");
    const getReceipt = FileStore.prototype.getReceipt;
    FileStore.prototype.getReceipt = async function (id) { return id === snapshot.process.receipt ? changed : getReceipt.call(this, id); };
    try { await expect(second.run(f.input())).rejects.toThrow(); } finally { FileStore.prototype.getReceipt = getReceipt; }
    expect(f.calls).toBe(1);
  });
  test("a cached summary cannot disclose its body after original source loss", async () => {
    const f = await fixture();
    const execution = await f.driver.run(f.input());
    await f.driver.publish({ reference: f.reference, plan: f.plan, jobs: [job(execution)] });
    const get = f.store.getValue.bind(f.store);
    f.store.getValue = async id => id === f.history.leaves[0]!.entry ? undefined : get(id);
    expect((await f.host.bind(f.reference).overview()).status).toBe("unavailable");
    await expect(f.host.bind(f.reference).expand(f.plan.requests[0]!.node)).rejects.toMatchObject({ code: "STORE_MISS" });
    expect(f.calls).toBe(1);
  });
  test("a colliding stable process name with another identity is refused", async () => {
    const f = await fixture();
    const execution = await f.driver.run(f.input());
    const changed = { ...f.input(), request: { ...f.plan.requests[0]!, sources: hash("changed-sources") } };
    await expect(f.driver.run(changed)).rejects.toThrow();
    const changedJob = { ...job(execution), manifest: hash("another-manifest") };
    await expect(f.driver.verify({ ...f.input(), job: changedJob })).rejects.toThrow();
    expect(f.calls).toBe(1);
  });
  test("publication writes candidate CAS records first, generation last, then conditionally changes the reader", async () => {
    const f = await fixture();
    const execution = await f.driver.run(f.input());
    const originalGeneration = (await f.host.bind(f.reference).inspect()).generation;
    const writes: string[] = [];
    const put = FileStore.prototype.putValue;
    FileStore.prototype.putValue = async function (value) {
      if (this.dir === f.dir && value !== null && typeof value === "object" && !Array.isArray(value) && typeof value.schema === "string") {
        writes.push(value.schema);
        if (value.schema === "algal.context-history-generation.v1" && value.generation === 1) throw new AlgalError("IO_FAILED", "torn candidate publication");
      }
      return put.call(this, value);
    };
    try { await expect(f.driver.publish({ reference: f.reference, plan: f.plan, jobs: [job(execution)] })).rejects.toThrow("torn"); } finally { FileStore.prototype.putValue = put; }
    expect(writes.at(-1)).toBe("algal.context-history-generation.v1");
    expect(writes).toContain("algal.context-history-summary.v1");
    expect((await f.host.bind(f.reference).inspect()).generation).toBe(originalGeneration);
    expect((await f.host.bind(f.reference).read(0)).text).toBe(f.values[0]!.text);
    const generation = await f.driver.publish({ reference: f.reference, plan: f.plan, jobs: [job(execution)] });
    expect((await f.host.bind(f.reference).inspect()).generation).toBe(generation);
    expect(f.calls).toBe(1);
  });
  test("stale expected generation or changed prompt, children and request cannot run or publish as the old job", async () => {
    const f = await fixture();
    const other = pool(f.history, [[2, 4]], 1);
    await f.host.publishGeneration(f.reference, other, contextHistoryDigest(f.parent.generation));
    const execution = await f.driver.run(f.input());
    expect(execution.result?.status).toBe("failed");
    expect(f.calls).toBe(0);
    const g = await fixture();
    const completed = await g.driver.run(g.input());
    const changedRecipe = { ...recipe, prompt: recipe.prompt + " A changed instruction." };
    const changedPlan = planContextSummaries({ history: g.history, parent: g.parent, recipe: changedRecipe, ranges: [{ start: 0, end: 2 }] });
    await expect(g.driver.publish({ reference: g.reference, plan: changedPlan, jobs: [job(completed)] })).rejects.toThrow();
    await g.host.publishGeneration(g.reference, pool(g.history, [[2, 4]], 1), contextHistoryDigest(g.parent.generation));
    await expect(g.driver.publish({ reference: g.reference, plan: g.plan, jobs: [job(completed)] })).rejects.toThrow();
    const children = await fixture(originals(8), [[0, 2], [2, 4]]);
    const childPlan = planContextSummaries({ history: children.history, parent: children.parent, recipe, ranges: [{ start: 0, end: 4 }] });
    const changedParent = structuredClone(children.parent);
    changedParent.summaries[0]!.body = "changed child";
    expect(() => planContextSummaries({ history: children.history, parent: changedParent, recipe, ranges: [{ start: 0, end: 4 }] })).toThrow();
    await expect(children.driver.run({ reference: children.reference, plan: childPlan, request: { ...childPlan.requests[0]!, children: childPlan.requests[0]!.children.toReversed() } })).rejects.toThrow();
    expect(children.calls).toBe(0);
  });
  test("revocation, narrowing, missing originals and changed originals refuse before inference", async () => {
    for (const mode of ["revoked", "narrowed", "missing", "changed"] as const) {
      const f = await fixture();
      if (mode === "revoked") f.current = { ...f.current, access: { ...f.current.access, state: "revoked", revision: 1 } };
      if (mode === "narrowed") f.current = { ...f.current, access: { ...f.current.access, indices: [2, 3], revision: 1 } };
      if (mode === "missing" || mode === "changed") {
        const get = FileStore.prototype.getValue;
        FileStore.prototype.getValue = async function (id) {
          if (this.dir === f.dir && id === f.history.leaves[0]!.entry) return mode === "missing" ? undefined : { schema: "algal.agent-context-entry.v1", ...f.values[0]!, text: "changed" };
          return get.call(this, id);
        };
        try { expect((await f.driver.run(f.input())).result?.status).toBe("failed"); } finally { FileStore.prototype.getValue = get; }
      } else expect((await f.driver.run(f.input())).result?.status).toBe("failed");
      expect(f.calls).toBe(0);
      expect(f.account.record().charged.work).toBeGreaterThan(1_000_000);
      expect(f.account.record().charged.runs).toBe(1);
    }
  });
  test("source corrections during prepare and after a model call prevent usable stale publication", async () => {
    const f = await fixture();
    const get = FileStore.prototype.getValue;
    let reads = 0;
    FileStore.prototype.getValue = async function (id) {
      const value = await get.call(this, id);
      if (this.dir === f.dir && id === f.history.leaves[0]!.entry && ++reads === 2) {
        f.current = { ...f.current, invalidated: [0], access: { ...f.current.access, revision: 1 } };
      }
      return value;
    };
    try { expect((await f.driver.run(f.input())).result?.status).toBe("failed"); } finally { FileStore.prototype.getValue = get; }
    expect(f.calls).toBe(0);
    const later = await fixture();
    later.response = async () => {
      later.current = { ...later.current, invalidated: [0], access: { ...later.current.access, revision: 1 } };
      return "This output must not replace the pending raw range.";
    };
    const execution = await later.driver.run(later.input());
    expect(execution.result?.status).toBe("failed");
    await expect(later.driver.publish({ reference: later.reference, plan: later.plan, jobs: [job(execution)] })).rejects.toThrow();
    expect((await later.host.bind(later.reference).overview()).items[0]!.kind).toBe("pending");
    expect((await later.host.bind(later.reference).read(0)).text).toBe(later.values[0]!.text);
    expect(later.current.invalidated).toEqual([0]);
    expect(later.calls).toBe(1);
  });
  test("model prose causes only derivative writes, never original mutation or corpus/application writes", async () => {
    const f = await fixture();
    const originalsBefore = await Promise.all([f.store.getValue(f.snapshot), ...f.history.leaves.map(leaf => f.store.getValue(leaf.entry))]);
    const forbidden = ["algal.agent-context-entry.v1", "algal.agent-context.v1", "algal.application-memory.v1", "algal.memory-observation.v1"];
    const put = FileStore.prototype.putValue;
    FileStore.prototype.putValue = async function (value) {
      if (this.dir === f.dir && value !== null && typeof value === "object" && !Array.isArray(value) && forbidden.includes(String(value.schema))) throw new Error("maintenance attempted source or fact write");
      return put.call(this, value);
    };
    try {
      const execution = await f.driver.run(f.input());
      await f.driver.publish({ reference: f.reference, plan: f.plan, jobs: [job(execution)] });
    } finally { FileStore.prototype.putValue = put; }
    expect(await Promise.all([f.store.getValue(f.snapshot), ...f.history.leaves.map(leaf => f.store.getValue(leaf.entry))])).toEqual(originalsBefore);
  });
});

describe("maintenance cancellation, failure and exact allowance recovery", () => {
  test("cancellation before dispatch does not call a model or allocate another account", async () => {
    const f = await fixture();
    const controller = new AbortController(); controller.abort();
    const before = f.account.record();
    const execution = await f.driver.run(f.input(), controller.signal);
    expect(execution.state).toBe("not-started");
    expect(execution.result).toMatchObject({ status: "cancelled", receipt: null, usage: { modelCalls: 0, work: 0 } });
    expect(f.calls).toBe(0);
    expect(f.account.record()).toEqual(before);
    expect(await new ProcessSupervisor(f.dir).list()).toEqual([]);
  });
  test("changed executor configuration is refused before a provider call and cannot free the allowance", async () => {
    const f = await fixture();
    f.executor.journalConfigurationFor = () => hash("changed-provider-configuration");
    const execution = await f.driver.run(f.input());
    expect(execution.state).toBe("open");
    expect(f.calls).toBe(0);
    expect(() => f.account.record()).toThrow("open");
    const restored = await ContextSummaryDriver.restore({ dir: f.dir, historyHost: f.host, executor: f.executor, ...f.input(), job: job(execution), checkpoint: job(execution).checkpoint });
    expect(restored.execution.state).toBe("open");
    expect(f.calls).toBe(0);
  });
  test("terminal provider failures debit work and attempts and are never automatically retried", async () => {
    const f = await fixture();
    f.response = async () => { throw new AlgalError("EFFECT_FAILED", "scripted settled failure"); };
    const execution = await f.driver.run(f.input());
    expect(execution.result).toMatchObject({ status: "failed", usage: { modelCalls: 1 } });
    expect(f.account.record().charged.attempts).toBe(1);
    expect(f.account.record().charged.work).toBeGreaterThan(1_000_000);
    expect(await f.driver.run(f.input())).toEqual(execution);
    expect(f.calls).toBe(1);
    expect(await f.driver.verify({ ...f.input(), job: job(execution) })).toMatchObject({ ok: true });
  });
  test("suspended provider work keeps its reservation without a resume call", async () => {
    const f = await fixture();
    f.response = async () => { throw new AlgalError("EFFECT_SUSPENDED", "provider has no terminal response"); };
    const execution = await f.driver.run(f.input());
    expect(execution.state).toBe("open");
    expect(() => f.account.record()).toThrow("open");
    expect(await f.driver.run(f.input())).toEqual(execution);
    expect(f.calls).toBe(1);
  });
  test("existing credit exhaustion refuses without model work and without a reset", async () => {
    const f = await fixture();
    const account = new HabitatAccount("experiment", { work: 1_000_000, attempts: 0, runs: 1 });
    const driver = new ContextSummaryDriver({ dir: f.dir, historyHost: f.host, account, executor: f.executor });
    const execution = await driver.run(f.input());
    expect(execution.result?.status).toBe("budget-exhausted");
    expect(account.record().outcome).toBe("exhausted");
    expect(account.record().charged.runs).toBe(0);
    expect(f.calls).toBe(0);
    await expect(driver.run(f.input())).rejects.toMatchObject({ code: "BUDGET_EXHAUSTED" });
    expect(() => new ContextSummaryDriver({ dir: f.dir, historyHost: f.host, account: { ...account } as HabitatAccount, executor: f.executor })).toThrow();
  });
  test("uncertain model work keeps the original reservation open and explicit restore never redispatches", async () => {
    const f = await fixture();
    f.response = async () => { throw new AlgalError("IO_FAILED", "crashed after model intent", undefined, { uncertain: true }); };
    const execution = await f.driver.run(f.input());
    expect(execution).toMatchObject({ state: "open", result: null, reservation: "open" });
    expect(() => f.account.record()).toThrow("open");
    expect(() => f.account.reserve(hash("another manifest"), { maxWork: 1, maxAgentCalls: 0 })).toThrow("previous run");
    expect(await f.driver.run(f.input())).toEqual(execution);
    const replacement = new HabitatAccount("experiment", { ...f.account.limits });
    const foreign = new ContextSummaryDriver({ dir: f.dir, historyHost: f.host, account: replacement, executor: f.executor });
    await expect(foreign.run(f.input())).rejects.toThrow("restore");
    expect(replacement.record().charged.runs).toBe(0);
    const restored = await ContextSummaryDriver.restore({ dir: f.dir, historyHost: f.host, executor: f.executor, ...f.input(), job: job(execution), checkpoint: job(execution).checkpoint });
    expect(restored.execution.state).toBe("open");
    expect(() => restored.account.record()).toThrow("open");
    expect(f.calls).toBe(1);
    await expect(ContextSummaryDriver.restore({ dir: f.dir, historyHost: f.host, executor: f.executor, ...f.input(), job: job(execution), checkpoint: hash("not-the-saved-allowance") })).rejects.toThrow();
    expect(f.calls).toBe(1);
  });
  test("cancellation after model start is uncertain rather than a free local failure", async () => {
    const f = await fixture();
    const controller = new AbortController();
    let started!: () => void;
    const invoked = new Promise<void>(resolve => { started = resolve; });
    let finish!: () => void;
    const held = new Promise<void>(resolve => { finish = resolve; });
    f.response = async () => { started(); await held; return "late result"; };
    const pending = f.driver.run(f.input(), controller.signal);
    await invoked; controller.abort();
    const execution = await pending;
    expect(execution.state).toBe("open");
    expect(() => f.account.record()).toThrow("open");
    finish();
    expect((await new ProcessSupervisor(f.dir).inspect(job(execution).name)).process.status).toBe("uncertain");
    expect(f.calls).toBe(1);
  });
  test("a crash after durable intent but before read evidence keeps its checkpoint and never repeats retrieval", async () => {
    const f = await fixture(), before = hash(f.account.record());
    const getValue = FileStore.prototype.getValue;
    FileStore.prototype.getValue = async function (id) {
      if (this.dir === f.dir && id === f.snapshot) throw new AlgalError("IO_FAILED", "interrupted first recorded read", undefined, { uncertain: true });
      return getValue.call(this, id);
    };
    let execution!: ContextSummaryExecution;
    try { execution = await f.driver.run(f.input()); } finally { FileStore.prototype.getValue = getValue; }
    expect(execution.state).toBe("open");
    expect(job(execution).checkpoint).toBe(before);
    expect((await new ProcessSupervisor(f.dir).inspect(job(execution).name)).process.status).toBe("uncertain");
    expect(() => f.account.record()).toThrow("open");
    expect((await f.driver.reconcile({ ...f.input(), job: job(execution) })).state).toBe("open");
    const restored = await ContextSummaryDriver.restore({ dir: f.dir, historyHost: f.host, executor: f.executor, ...f.input(), job: job(execution), checkpoint: before });
    expect(restored.execution.state).toBe("open");
    expect(() => restored.account.record()).toThrow("open");
    expect(f.calls).toBe(0);
  });
  test("failed run-receipt persistence restores and reconciles completed journal evidence with zero live calls", async () => {
    for (const settledFailure of [false, true]) {
      const f = await fixture();
      f.response = async () => {
        await writeFile(join(f.dir, "runs"), "test-owned receipt persistence failure");
        if (settledFailure) throw new AlgalError("EFFECT_FAILED", "settled provider failure");
        return "A recorded result survives the host receipt write failure.";
      };
      const execution = await f.driver.run(f.input());
      expect(execution.state).toBe("open");
      expect(() => f.account.record()).toThrow("open");
      const checkpoint = await f.store.getValue(job(execution).checkpoint);
      expect(checkpoint).toMatchObject({ charged: { work: 0, attempts: 0, runs: 0 } });
      await rm(join(f.dir, "runs"));
      let forbidden = 0;
      const getValue = FileStore.prototype.getValue;
      FileStore.prototype.getValue = async function (id) {
        if (this.dir === f.dir && (id === f.snapshot || f.history.leaves.some(leaf => leaf.entry === id))) { forbidden++; throw new Error("reconciliation called live source"); }
        return getValue.call(this, id);
      };
      try {
        const restored = await ContextSummaryDriver.restore({ dir: f.dir, historyHost: f.host, executor: f.executor, ...f.input(), job: job(execution), checkpoint: job(execution).checkpoint });
        expect(restored.execution.result?.status).toBe(settledFailure ? "failed" : "complete");
        expect(restored.account.record().charged.attempts).toBe(1);
        expect(restored.account.record().charged.runs).toBe(1);
        expect(restored.account.record().charged.work).toBeGreaterThan(1_000_000);
        expect(await restored.driver.verify({ ...f.input(), job: job(execution) })).toMatchObject({ ok: true });
      } finally { FileStore.prototype.getValue = getValue; }
      expect(forbidden).toBe(0);
      expect(f.calls).toBe(1);
    }
  });
  test("a completed process cannot be charged to an ambiguous replacement account", async () => {
    const f = await fixture();
    const execution = await f.driver.run(f.input());
    const replacement = new HabitatAccount("experiment", { ...f.account.limits });
    const foreign = new ContextSummaryDriver({ dir: f.dir, historyHost: f.host, account: replacement, executor: f.executor });
    await expect(foreign.run(f.input())).rejects.toThrow("restore");
    await expect(foreign.publish({ reference: f.reference, plan: f.plan, jobs: [job(execution)] })).rejects.toThrow("restore");
    expect(replacement.record().charged.runs).toBe(0);
    expect(f.calls).toBe(1);
    expect(job(execution).checkpoint).toBeDefined();
  });
});

describe("summary foreign-data and complete encoded bounds", () => {
  test("unknown keys, getters, prototypes, cycles, sparse arrays and mutation are screened before awaits", async () => {
    const f = await fixture();
    let getters = 0;
    const input = { ...f.input(), get request() { getters++; return f.plan.requests[0]; } };
    await expect(f.driver.run(input)).rejects.toThrow();
    expect(getters).toBe(0);
    for (const value of [
      { ...f.input(), extra: true },
      Object.assign(Object.create({ inherited: true }) as object, f.input()),
      { ...f.input(), plan: { ...f.plan, requests: Array(1) } },
      { ...f.input(), request: { ...f.plan.requests[0]!, limits: { ...CONTEXT_HISTORY_JOB_CEILINGS, extra: 1 } } },
    ]) await expect(f.driver.run(value)).rejects.toThrow();
    const recursive: Record<string, unknown> = {}; recursive.plan = recursive;
    await expect(f.driver.run(recursive)).rejects.toThrow();
    expect(f.calls).toBe(0);
    const mutable = structuredClone(f.input());
    const pending = f.driver.run(mutable);
    mutable.request.generation = 4095;
    mutable.plan.recipe.prompt = "mutated after dispatch";
    expect((await pending).result?.status).toBe("complete");
    expect(f.lastRequest!.prompt).toBe(recipe.prompt);
  });
  test("foreign executor result getters and metadata keys cannot execute or widen the profile", async () => {
    const f = await fixture();
    let getters = 0;
    f.executor.executeEffect = async () => ({ get output() { getters++; return "not a data property"; } });
    const execution = await f.driver.run(f.input());
    expect(execution.result?.status).toBe("failed");
    expect(getters).toBe(0);
    expect(f.account.record().charged.attempts).toBe(1);
    expect(await f.driver.verify({ ...f.input(), job: job(execution) })).toMatchObject({ ok: true });
    const foreign = await fixture();
    foreign.executor.executeEffect = async request => ({ output: await foreign.executor.execute(request), metadata: { unexpected: true } as unknown as ExecutorMetadata });
    expect((await foreign.driver.run(foreign.input())).result?.status).toBe("failed");
    expect(foreign.account.record().charged.attempts).toBe(1);
    expect(foreign.calls).toBe(1);
    const narrow = await fixture();
    narrow.executor.capabilities = { effects: ["decide"] };
    await expect(narrow.driver.run(narrow.input())).rejects.toMatchObject({ code: "CAPABILITY_DENIED" });
    expect(narrow.calls).toBe(0);
    expect(narrow.account.record().charged.runs).toBe(0);
  });
  test("whole escaped prompt, context, metadata and output record ceilings precede provider dispatch", async () => {
    const f = await fixture([{ kind: "input", label: "escaped", text: "\u0000".repeat(2_000) }, { kind: "input", label: "second", text: "two" }]);
    const limits = { ...CONTEXT_HISTORY_JOB_CEILINGS, maxInputBytes: 13_000 };
    const escapedRecipe = { ...recipe, prompt: "\u0000".repeat(1_000) };
    const plan = planContextSummaries({ history: f.history, parent: f.parent, recipe: escapedRecipe, limits, ranges: [{ start: 0, end: 2 }] });
    const execution = await f.driver.run(f.input(plan));
    expect(execution.result?.status).toBe("budget-exhausted");
    expect(f.calls).toBe(0);
    expect(f.account.record().charged.work).toBeGreaterThan(1_000_000);
    const tiny = await fixture();
    const workPlan = planContextSummaries({ history: tiny.history, parent: tiny.parent, recipe, limits: { ...CONTEXT_HISTORY_JOB_CEILINGS, maxWork: 1 }, ranges: [{ start: 0, end: 2 }] });
    expect((await tiny.driver.run(tiny.input(workPlan))).result?.status).toBe("budget-exhausted");
    expect(tiny.calls).toBe(0);
    const output = await fixture();
    output.response = async () => "\u0000".repeat(6_000);
    const failed = await output.driver.run(output.input());
    expect(failed.result?.status).toBe("budget-exhausted");
    expect(output.calls).toBe(1);
    expect(output.account.record().charged.attempts).toBe(1);
    expect(await output.driver.verify({ ...output.input(), job: job(failed) })).toMatchObject({ ok: true });
    const body = await fixture();
    body.response = async () => "a".repeat(16_385);
    expect((await body.driver.run(body.input())).result?.status).toBe("failed");
    expect(body.calls).toBe(1);
  });
  test("over-limit source proof/read framing is refused rather than bypassing a tool cost ceiling", async () => {
    const f = await fixture([{ kind: "input", label: "large", text: "a".repeat(40_000) }, { kind: "input", label: "small", text: "b" }]);
    const execution = await f.driver.run(f.input());
    expect(execution.result?.status).toBe("budget-exhausted");
    expect(f.calls).toBe(0);
    expect([...f.driver.evidenceTools(f.input()).values()].every(entry => entry.signature.cost <= 1_000_000)).toBe(true);
    const successful = await fixture();
    await successful.driver.run(successful.input());
    expect(effectRequestDigest(successful.lastRequest!)).toMatch(/^sha256:/);
  });
});
