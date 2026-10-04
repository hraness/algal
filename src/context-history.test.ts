import { describe, expect, test } from "bun:test";
import { AGENT_CONTEXT_BOUNDS, putAgentContext, type AgentContextEntryInput } from "./agent-context";
import {
  CONTEXT_HISTORY_READ_CEILINGS, contextHistoryDigest, contextHistoryNode, contextHistoryRef,
  parseContextHistoryView, type ContextHistory, type ContextHistoryAccess, type ContextHistoryGeneration,
  type ContextHistoryReadLimits, type ContextHistorySummary,
} from "./context-history-contract";
import {
  captureContextHistory, contextHistoryCover, contextHistoryOutputBytes, ContextHistoryHost,
  type ContextHistoryConfiguration, type ContextHistoryCurrent,
} from "./context-history";
import { contextHistorySelection } from "./context-history-access";
import { digestCanonical, type Digest } from "./digest";
import { MemoryStore } from "./store-memory";
import { asJsonValue, canonicalBytes } from "./values";

const hash = (value: unknown): Digest => digestCanonical(asJsonValue(value, "test identity"));
const scope = { application: "app", realm: "realm", workspace: "workspace", task: "task", audience: "owner" };
const ceilings: ContextHistoryReadLimits = { ...CONTEXT_HISTORY_READ_CEILINGS };
const recipe = { prompt: hash("prompt"), policy: hash("policy"), summarizer: hash("scripted") };
const original = (count = 8): AgentContextEntryInput[] => Array.from({ length: count }, (_, i) => ({
  kind: i === 0 ? "instruction" : "observation", label: `source-${i}`, text: `record ${i} needle\n`,
}));

async function fixture(values = original(), order = values.map((_, i) => i), configuration?: ContextHistoryConfiguration) {
  const store = new MemoryStore();
  const snapshot = await putAgentContext(store, values);
  const request = {
    scope: { ...scope }, head: hash({ ownerSequence: 19 }), snapshot, epoch: 2, firstPosition: 37,
    sources: order.map((sourceIndex, i) => ({ sourceIndex, event: hash({ event: i }), position: 37 + i })),
  };
  const history = await captureContextHistory(store, request);
  let current: ContextHistoryCurrent = {
    access: {
      schema: "algal.context-history-access.v1", history: contextHistoryDigest(history), scope: { ...scope },
      head: history.head, snapshot, revision: 0, indices: [...order].sort((a, b) => a - b), state: "active",
    }, invalidated: [],
  };
  let resolveCalls = 0;
  const host = new ContextHistoryHost(store, {
    principal: "owner", resolveCurrent: async (captured, principal) => {
      expect(captured.snapshot).toBe(snapshot);
      expect(principal).toBe("owner");
      resolveCalls++;
      return structuredClone(current);
    },
  });
  const ref = await host.admit(history, configuration);
  const reader = host.bind(ref);
  return {
    store, snapshot, history, request, host, ref, reader, values,
    get current() { return current; }, set current(value: ContextHistoryCurrent) { current = value; },
    get resolveCalls() { return resolveCalls; },
  };
}

function derivatives(history: ContextHistory, ranges: [number, number][], generation = 0) {
  const nodes = ranges.map(([start, end]) => contextHistoryNode(history, start, end));
  const summaries: ContextHistorySummary[] = nodes.map((node, i) => ({
    schema: "algal.context-history-summary.v1", ...recipe, history: node.history,
    node: contextHistoryDigest(node), sources: node.sources, children: [], body: `scripted range ${i}`,
  }));
  const record: ContextHistoryGeneration = {
    schema: "algal.context-history-generation.v1", history: contextHistoryDigest(history), generation, ...recipe,
    summaries: summaries.map(summary => ({ node: summary.node, summary: contextHistoryDigest(summary) })),
  };
  return { generation: record, nodes, summaries };
}

function oracle(count: number, recent: number, detailed: number[]) {
  const blocks: { start: number; end: number }[] = [];
  let start = 0;
  while (start < count) {
    let length = 1;
    for (let size = 2; size <= count; size *= 2) {
      const end = start + size;
      if (start % size !== 0 || end > count || end > count - recent || size > count - end) continue;
      let containsDetail = false;
      for (let i = start; i < end; i++) if (detailed.includes(i)) containsDetail = true;
      if (!containsDetail) length = size;
    }
    blocks.push({ start, end: start + length });
    start += length;
  }
  return blocks;
}

async function deny(promise: Promise<unknown>) {
  await expect(promise).rejects.toMatchObject({ code: "CAPABILITY_DENIED" });
}

describe("context history independent aligned cover", () => {
  test("matches a separately enumerated oracle, including every prefix and power boundary", () => {
    for (let count = 0; count <= 1024; count++) {
      for (const recent of [0, 1, 2, 4, 17]) {
        const detailed = [0, Math.floor(count / 2), count - 1].filter((n, i, a) => n >= 0 && n < count && a.indexOf(n) === i).sort((a, b) => a - b);
        const cover = contextHistoryCover(count, recent, detailed);
        expect(cover).toEqual(oracle(count, Math.min(count, recent), detailed));
        expect(cover.reduce((sum, r) => sum + r.end - r.start, 0)).toBe(count);
        for (const range of cover) {
          expect(range.start % (range.end - range.start)).toBe(0);
          expect(Math.log2(range.end - range.start) % 1).toBe(0);
        }
      }
    }
  });
  test("keeps recent leaves detailed and rejects foreign/unbounded selections", () => {
    expect(contextHistoryCover(16, 4)).toEqual([
      { start: 0, end: 8 }, { start: 8, end: 12 }, { start: 12, end: 13 },
      { start: 13, end: 14 }, { start: 14, end: 15 }, { start: 15, end: 16 },
    ]);
    for (const count of [-1, 1.5, 1025]) expect(() => contextHistoryCover(count)).toThrow();
    for (const picked of [[0, 0], [1, 0], [16], Array(1)]) expect(() => contextHistoryCover(16, 4, picked)).toThrow();
    expect(() => contextHistoryCover(1, 1025)).toThrow();
  });
});

describe("context history capture and exact data flow", () => {
  test("captures explicitly selected original snapshot indices in owner chronology without any writes", async () => {
    const f = await fixture(original(4), [2, 0, 3]);
    let writes = 0;
    f.store.putValue = async () => { writes++; throw new Error("read must not write"); };
    const history = await captureContextHistory(f.store, f.request);
    expect(history.leaves.map(leaf => leaf.sourceIndex)).toEqual([2, 0, 3]);
    expect(history.leaves.map(leaf => leaf.position)).toEqual([37, 38, 39]);
    expect(history.snapshot).toBe(f.snapshot);
    expect(history.leaves[0]!.entry).toBe(hash({ schema: "algal.agent-context-entry.v1", ...f.values[2]! }));
    const exact = await f.reader.read(0);
    expect(exact).toMatchObject({ sourceIndex: 0, leafIndex: 1, position: 38, ...f.values[0]! });
    expect(exact.usage.outputBytes).toBe(canonicalBytes(asJsonValue(exact, "read")));
    await deny(f.reader.read(1));
    expect(writes).toBe(0);
    expect(Object.keys(f.reader).sort()).toEqual(["delegate", "expand", "inspect", "overview", "read", "ref", "search", "slice"]);
    expect(Object.isFrozen(f.reader)).toBe(true);
    expect(Object.isFrozen(f.reader.ref)).toBe(true);
  });
  test("original UTF-8 slices, BOM, literal search and exact digest failures use the original reader", async () => {
    const f = await fixture([{ kind: "input", label: "unicode", text: "\uFEFFé東京 é東京" }]);
    expect((await f.reader.slice(0, 0, 5)).text).toBe("\uFEFFé");
    await expect(f.reader.slice(0, 4, 5)).rejects.toMatchObject({ code: "PARSE_FAILED" });
    const search = await f.reader.search({ query: "東京" });
    expect(search.matches).toEqual([
      { sourceIndex: 0, leafIndex: 0, position: 37, startByte: 5, endByte: 11 },
      { sourceIndex: 0, leafIndex: 0, position: 37, startByte: 14, endByte: 20 },
    ]);
    expect(search.complete).toBe(true);
    const source = f.history.leaves[0]!.entry;
    const get = f.store.getValue.bind(f.store);
    f.store.getValue = async id => id === source ? { schema: "algal.agent-context-entry.v1", kind: "input", label: "unicode", text: "changed" } : get(id);
    await expect(f.reader.read(0)).rejects.toMatchObject({ code: "DIGEST_MISMATCH" });
    await expect(f.reader.slice(0, 0, 1)).rejects.toMatchObject({ code: "DIGEST_MISMATCH" });
    await expect(f.reader.search({ query: "changed" })).rejects.toMatchObject({ code: "DIGEST_MISMATCH" });
  });
  test("capture options are copied before awaiting and unselected originals never become leaves", async () => {
    const f = await fixture(original(4), [2, 0]);
    const request = structuredClone(f.request);
    const pending = captureContextHistory(f.store, request);
    request.sources[0]!.sourceIndex = 1;
    request.scope.audience = "other";
    expect(await pending).toEqual(f.history);
    for (const request of [
      { ...f.request, sources: [{ ...f.request.sources[0]!, position: 42 }] },
      { ...f.request, sources: [f.request.sources[0], f.request.sources[0]] },
      { ...f.request, extra: true },
    ]) await expect(captureContextHistory(f.store, request)).rejects.toThrow();
    let getters = 0;
    await expect(captureContextHistory(f.store, { ...f.request, get head() { getters++; return f.request.head; } })).rejects.toThrow();
    expect(getters).toBe(0);
  });
  test("empty and one-leaf histories stay explicit and missing snapshots fail", async () => {
    for (const values of [[], original(1)]) {
      const f = await fixture(values);
      const view = await f.reader.overview();
      expect(view.status).toBe("complete");
      expect(view.end).toBe(values.length);
      expect(view.items).toHaveLength(values.length);
      expect(contextHistoryOutputBytes(view)).toBe(canonicalBytes(asJsonValue(view, "view")));
    }
    const f = await fixture([]);
    f.store.getValue = async () => undefined;
    await expect(captureContextHistory(f.store, f.request)).rejects.toMatchObject({ code: "STORE_MISS" });
    await expect(f.reader.overview()).resolves.toMatchObject({ status: "unavailable", reason: "source-unavailable" });
    await expect(f.reader.search({ query: "x" })).rejects.toMatchObject({ code: "STORE_MISS" });
  });
});

describe("context history progressive views and continuations", () => {
  test("issued pages bind the portable authorization join to the retained read request", async () => {
    const f = await fixture();
    const view = await f.reader.overview();
    const grant = {
      schema: "algal.context-history-grant.v1", history: contextHistoryDigest(f.history),
      scope, indices: f.current.access.indices, limits: ceilings,
    };
    const retained = hash({
      schema: "algal.context-history-read-request.v1", principal: "owner",
      request: { recentLeaves: 4, protectedIndices: [0], relevance: null },
      current: hash(f.current), generation: view.binding.generation, limits: view.limits,
    });
    expect(view.binding.selection).toBe(contextHistorySelection(grant, f.current.access, retained));
  });
  test("missing summaries remain expandable pending ranges and reads perform no maintenance", async () => {
    const f = await fixture(original(16));
    let writes = 0;
    f.store.putValue = async () => { writes++; throw new Error("unexpected maintenance"); };
    const view = await f.reader.overview();
    expect(view.status).toBe("incomplete");
    expect(view.reason).toBe("missing-summary");
    expect(view.items.filter(item => item.kind === "pending").length).toBeGreaterThan(0);
    expect(view.items.find(item => item.start === 0)).toMatchObject({ kind: "exact", text: f.values[0]!.text });
    expect(view.items.slice(-4).map(item => item.kind)).toEqual(["exact", "exact", "exact", "exact"]);
    const pending = view.items.find(item => item.kind === "pending")!;
    const expansion = await f.reader.expand(pending.node);
    expect(expansion.items.map(item => [item.start, item.end])).toEqual([
      [pending.start, (pending.start + pending.end) / 2], [(pending.start + pending.end) / 2, pending.end],
    ]);
    let node = pending.node;
    for (;;) {
      const result = await f.reader.expand(node);
      const child = result.items[0]!;
      if (child.kind === "exact") {
        expect(child.text).toBe(f.values[child.start]!.text);
        expect(child.end - child.start).toBe(1);
        break;
      }
      node = child.node;
    }
    expect(writes).toBe(0);
    parseContextHistoryView(view);
    await f.host.validateView(f.ref, view);
  });
  test("scripted summaries must match complete lineage, generation and source pools", async () => {
    const f = await fixture(original(16));
    const pool = derivatives(f.history, [[4, 8], [8, 12]]);
    await f.host.useGeneration(f.ref, pool);
    const view = await f.reader.overview();
    expect(view.items.filter(item => item.kind === "summary").map(item => item.text)).toEqual(pool.summaries.map(item => item.body));
    await f.host.validateView(f.ref, view);
    await expect(f.host.useGeneration(f.ref, { ...pool, summaries: [] })).rejects.toThrow();
    await expect(f.host.useGeneration(f.ref, { ...pool, nodes: [...pool.nodes, pool.nodes[0]!] })).rejects.toThrow();
    await expect(f.host.useGeneration(f.ref, { ...pool, summaries: [{ ...pool.summaries[0]!, body: "forged" }, pool.summaries[1]!] })).rejects.toThrow();
  });
  test("issued cursors bind full request, grant, live access, head, budget, policy and generation", async () => {
    const values = original(16).map(value => ({ ...value, kind: "observation" as const, text: "a".repeat(1800) }));
    const f = await fixture(values, undefined, { recentLeaves: 0 });
    const limits = { maxReadBytes: 2000 };
    const first = await f.reader.overview({ limits });
    expect(first.cursor).not.toBeNull();
    expect(first.end).toBeGreaterThan(0);
    expect(first.end).toBeLessThan(16);
    const again = await f.reader.overview({ limits, cursor: first.cursor! });
    expect(again.start).toBe(first.end);
    expect(await f.reader.overview({ limits, cursor: first.cursor! })).toEqual(again);
    const forged = structuredClone(first.cursor!);
    forged.offset++;
    await deny(f.reader.overview({ limits, cursor: forged }));
    await deny(f.reader.overview({ limits: { maxReadBytes: 3000 }, cursor: first.cursor! }));
    for (const key of ["history", "head", "policy", "generation", "selection"] as const) {
      await deny(f.reader.overview({ limits, cursor: { ...first.cursor!, binding: { ...first.cursor!.binding, [key]: hash(`changed ${key}`) } } }));
    }
    const narrow = await f.reader.delegate([0]);
    await deny(narrow.overview({ limits, cursor: first.cursor! }));
    const oldAccess = structuredClone(f.current);
    f.current = { ...oldAccess, access: { ...oldAccess.access, revision: 1 } };
    await deny(f.reader.overview({ limits, cursor: first.cursor! }));
    await deny(f.host.validateView(f.ref, first));
    f.current = oldAccess;
    await deny(f.reader.read(0));
    f.current = { ...oldAccess, access: { ...oldAccess.access, revision: 1 } };
    const currentPage = await f.reader.overview({ limits });
    await f.host.useGeneration(f.ref, derivatives(f.history, [[0, 8]], 1));
    await deny(f.reader.overview({ limits, cursor: currentPage.cursor! }));
  });
  test("appending another snapshot cannot remap a captured continuation", async () => {
    const values = original(8).map(value => ({ ...value, kind: "observation" as const, text: "b".repeat(1000) }));
    const f = await fixture(values, undefined, { recentLeaves: 0 });
    const first = await f.reader.overview({ limits: { maxReadBytes: 1100 } });
    const later = await putAgentContext(f.store, [...values, { kind: "output", label: "append", text: "new" }]);
    expect(later).not.toBe(f.snapshot);
    const next = await f.reader.overview({ limits: { maxReadBytes: 1100 }, cursor: first.cursor! });
    expect(next.binding).toEqual(first.binding);
    expect(next.end).toBeLessThanOrEqual(8);
  });
  test("protected instructions and host-selected current constraints never disappear under overflow", async () => {
    const values: AgentContextEntryInput[] = original(16).map(value => ({ ...value, kind: "observation" }));
    values[15] = { kind: "instruction", label: "current", text: "x".repeat(5000) };
    const f = await fixture(values, undefined, { protectedIndices: [10], recentLeaves: 0 });
    const view = await f.reader.overview({ limits: { maxReadBytes: 1000 } });
    expect(view).toMatchObject({ status: "budget-exhausted", reason: "protected-overflow", start: 0, end: 0, items: [] });
    const fitting = await f.reader.overview();
    expect(fitting.items.find(item => item.start === 15)).toMatchObject({ kind: "exact", text: values[15]!.text });
    expect(fitting.items.find(item => item.start === 10)).toMatchObject({ kind: "exact", text: values[10]!.text });
    const many = await fixture(original(129), undefined, { recentLeaves: 0, protectedIndices: Array.from({ length: 129 }, (_, i) => i) });
    expect(await many.reader.overview()).toMatchObject({ status: "budget-exhausted", reason: "protected-overflow", items: [] });
  });
  test("encoded output overhead and escaping are charged instead of silently truncating exact originals", async () => {
    const f = await fixture([{ kind: "input", label: "escaped", text: "\u0000".repeat(6000) }]);
    const view = await f.reader.overview({ limits: { maxOutputBytes: 4000 } });
    expect(view).toMatchObject({ status: "budget-exhausted", reason: "output-limit", items: [] });
    expect(contextHistoryOutputBytes(view)).toBeLessThanOrEqual(4000);
    await expect(f.reader.overview({ limits: { maxOutputBytes: 1 } })).rejects.toMatchObject({ code: "BUDGET_EXHAUSTED" });
    await expect(f.reader.read(0, { maxOutputBytes: 4000 })).rejects.toMatchObject({ code: "BUDGET_EXHAUSTED" });
    expect((await f.reader.slice(0, 0, 100, { maxOutputBytes: 4000 })).text).toHaveLength(100);
  });
  test("relevance inputs are bounded, deduplicated with protected/recent leaves, and bound to selection", async () => {
    const f = await fixture(original(16), undefined, { recentLeaves: 2, protectedIndices: [0, 1], relevance: { query: "older decision", indices: [1, 4, 15] } });
    const plain = await fixture(original(16), undefined, { recentLeaves: 2, protectedIndices: [0, 1] });
    const view = await f.reader.overview();
    expect(view.binding.selection).not.toBe((await plain.reader.overview()).binding.selection);
    expect(view.items.find(item => item.start === 4)).toMatchObject({ kind: "exact" });
    expect(view.items.filter(item => item.start === 1)).toHaveLength(1);
    expect(view.items.filter(item => item.start === 15)).toHaveLength(1);
    await expect(f.host.admit(f.history, { relevance: { query: "x".repeat(4097), indices: [4] } })).rejects.toThrow();
  });
});

describe("context history live permissions", () => {
  test("serialized grants, access descriptors and structural views do not confer current permission", async () => {
    const f = await fixture();
    const stranger = new ContextHistoryHost(f.store, { principal: "other", resolveCurrent: () => f.current });
    expect(() => stranger.bind(f.ref)).toThrow();
    await deny(stranger.read(f.ref, 0));
    const forged = contextHistoryRef({ schema: "algal.context-history-grant.v1", history: contextHistoryDigest(f.history), scope, indices: [0], limits: ceilings });
    await deny(f.host.read(forged, 0));
    const view = await f.reader.overview();
    f.current = { ...f.current, access: { ...f.current.access, state: "revoked" } };
    await deny(f.reader.inspect());
    await deny(f.reader.overview());
    await deny(f.host.validateView(f.ref, view));
    await deny(f.reader.expand(contextHistoryDigest(contextHistoryNode(f.history, 0, 2))));
  });
  test("narrow readers disclose only permitted indices, never a broad summary or hidden metadata", async () => {
    const f = await fixture(original(8), [5, 0, 2, 7, 1, 6, 3, 4]);
    await f.host.useGeneration(f.ref, derivatives(f.history, [[0, 4]]));
    const child = await f.reader.delegate([0, 2], { maxReadBytes: 64, maxSearchResults: 1 });
    await deny(child.inspect());
    await deny(child.overview());
    await deny(child.read(5));
    await deny(child.expand(contextHistoryDigest(contextHistoryNode(f.history, 0, 4))));
    const exact = await child.expand(contextHistoryDigest(contextHistoryNode(f.history, 1, 2)));
    expect(exact.items[0]).toMatchObject({ kind: "exact", text: f.values[0]!.text });
    await deny(child.expand(contextHistoryDigest(contextHistoryNode(f.history, 2, 4))));
    const pairReader = await f.reader.delegate([2, 7]);
    const pair = await pairReader.expand(contextHistoryDigest(contextHistoryNode(f.history, 2, 4)));
    expect(pair.items.every(item => item.kind !== "summary")).toBe(true);
    expect((await child.search({ query: "needle" })).matches.every(match => [0, 2].includes(match.sourceIndex))).toBe(true);
    await deny(child.delegate([1]));
    await expect(child.delegate([0], { maxReadBytes: 65 })).rejects.toThrow();
    await expect(child.delegate([0], { audience: "other" } as never)).rejects.toThrow();
    f.current = { ...f.current, access: { ...f.current.access, indices: [0, 2] } };
    expect((await child.read(0)).text).toBe(f.values[0]!.text);
    await deny(f.reader.overview());
  });
  test("explicit revocation denies descendants and identical re-admission cannot resurrect a handle", async () => {
    const f = await fixture();
    const child = await f.reader.delegate([0, 2]);
    const grandchild = await child.delegate([2]);
    f.host.revoke(f.ref);
    await deny(f.reader.read(0));
    await deny(child.read(0));
    await deny(grandchild.read(2));
    await deny(f.host.admit(f.history));
    await deny(f.host.delegate(child.ref, [0]));
  });
  test("source selection, access identity and invalidation are checked before and after asynchronous reads", async () => {
    for (const mutation of ["selection", "retention", "invalidation", "revoke"] as const) {
      const f = await fixture();
      const get = f.store.getValue.bind(f.store);
      let fired = false;
      f.store.getValue = async id => {
        const value = await get(id);
        if (!fired && id === f.history.leaves[0]!.entry) {
          fired = true;
          if (mutation === "selection") f.current = { ...f.current, access: { ...f.current.access, indices: [1, 2, 3, 4, 5, 6, 7] } };
          if (mutation === "retention") f.current = { ...f.current, access: { ...f.current.access, state: "unavailable" } };
          if (mutation === "invalidation") f.current = { ...f.current, invalidated: [0] };
          if (mutation === "revoke") f.host.revoke(f.ref);
        }
        return value;
      };
      await deny(f.reader.read(0));
      expect(fired).toBe(true);
    }
  });
  test("invalidation blocks every affected ancestor but keeps selected historical originals readable", async () => {
    const f = await fixture(original(16), undefined, { recentLeaves: 0 });
    await f.host.useGeneration(f.ref, derivatives(f.history, [[0, 8], [4, 8]]));
    const broad = contextHistoryDigest(contextHistoryNode(f.history, 0, 8));
    expect((await f.reader.expand(broad)).items.some(item => item.kind === "summary")).toBe(true);
    f.current = { ...f.current, invalidated: [4] };
    const view = await f.reader.overview();
    expect(view.items.filter(item => item.kind === "summary")).toEqual([]);
    expect((await f.reader.expand(broad)).items.find(item => item.start === 4)).toMatchObject({ kind: "pending" });
    expect((await f.reader.read(4)).text).toBe(f.values[4]!.text);
  });
  test("cached page validation refuses missing originals and rechecks permission after source fetches", async () => {
    for (const fault of ["missing", "revision"] as const) {
      const f = await fixture(original(16), undefined, { recentLeaves: 0 });
      await f.host.useGeneration(f.ref, derivatives(f.history, [[0, 8], [4, 8]]));
      const page = await f.reader.overview();
      expect(page.items.some(item => item.kind === "summary")).toBe(true);
      await f.host.validateView(f.ref, page);
      const get = f.store.getValue.bind(f.store);
      let fetched = false;
      f.store.getValue = async id => {
        const source = await get(id);
        if (id === f.history.leaves[4]!.entry) {
          fetched = true;
          if (fault === "missing") return undefined;
          f.current = { ...f.current, access: { ...f.current.access, revision: f.current.access.revision + 1 } };
        }
        return source;
      };
      await expect(f.host.validateView(f.ref, page)).rejects.toMatchObject({ code: fault === "missing" ? "STORE_MISS" : "CAPABILITY_DENIED" });
      expect(fetched).toBe(true);
    }
  });
  test("cached summaries cannot survive a missing source, and scan/read/work limits remain effective", async () => {
    const f = await fixture(original(16), undefined, { recentLeaves: 0 });
    await f.host.useGeneration(f.ref, derivatives(f.history, [[0, 8]]));
    const get = f.store.getValue.bind(f.store);
    f.store.getValue = async id => id === f.history.leaves[4]!.entry ? undefined : get(id);
    expect(await f.reader.overview()).toMatchObject({ status: "unavailable", reason: "source-unavailable" });
    await expect(f.reader.search({ query: "absent" })).rejects.toMatchObject({ code: "STORE_MISS" });
    f.store.getValue = get;
    const result = await f.reader.search({ query: "needle", maxScanBytes: 1 });
    expect(result).toMatchObject({ matches: [], complete: false, scannedBytes: 0 });
    await expect(f.reader.read(0, { maxReadBytes: 1 })).rejects.toMatchObject({ code: "BUDGET_EXHAUSTED" });
    await expect(f.reader.read(0, { maxWork: 1 })).rejects.toMatchObject({ code: "BUDGET_EXHAUSTED" });
  });
  test("cancellation yields no source bodies and immutable caller options cannot change an in-flight request", async () => {
    const f = await fixture();
    const abort = new AbortController();
    abort.abort();
    expect(await f.reader.overview({}, abort.signal)).toMatchObject({ status: "incomplete", reason: "cancelled", items: [] });
    await expect(f.reader.read(0, undefined, abort.signal)).rejects.toMatchObject({ code: "EFFECT_FAILED" });
    const opts = { limits: { maxReadBytes: 2000 } };
    const pending = f.reader.overview(opts);
    opts.limits.maxReadBytes = 1;
    expect((await pending).limits.maxReadBytes).toBe(2000);
    let calls = 0;
    await expect(f.reader.overview({ get limits() { calls++; return {}; } })).rejects.toThrow();
    await expect(f.reader.search({ query: "x", extra: true } as never)).rejects.toThrow();
    expect(calls).toBe(0);
  });
  test("registry counts and tombstones stay bounded by existing permission capacity", async () => {
    const f = await fixture([]);
    for (let i = 1; i < AGENT_CONTEXT_BOUNDS.maxGrants; i++) await f.host.admit(f.history, undefined, [], { maxReadBytes: i });
    await expect(f.host.admit(f.history, undefined, [], { maxReadBytes: 257 })).rejects.toMatchObject({ code: "BUDGET_EXHAUSTED" });
    f.host.revoke(f.ref);
    await deny(f.host.admit(f.history));
  });
});

export function accessFor(history: ContextHistory): ContextHistoryAccess {
  return {
    schema: "algal.context-history-access.v1", history: contextHistoryDigest(history), scope: history.scope,
    head: history.head, snapshot: history.snapshot, revision: 0,
    indices: history.leaves.map(leaf => leaf.sourceIndex).sort((a, b) => a - b), state: "active",
  };
}
