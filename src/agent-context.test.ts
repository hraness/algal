import { describe, expect, test } from "bun:test";
import { AgentContextHost, AGENT_CONTEXT_BOUNDS, parseAgentContextRef, putAgentContext, type AgentContextEntryInput, type AgentContextLimits } from "./agent-context";
import { capabilityHandle } from "./capabilities";
import { digestCanonical, type Digest } from "./digest";
import { MemoryStore } from "./store-memory";
import { canonicalize, type JsonValue } from "./values";

const entries: AgentContextEntryInput[] = [
  { kind: "instruction", label: "original", text: "Keep exact 🐚 instructions.\n" },
  { kind: "input", label: "structured", text: canonicalize({ z: "東京", a: [1, true] }) },
  { kind: "observation", label: "tool", text: "é🐚 é🐚 needle needle" },
  { kind: "output", label: "response", text: "private answer" },
];
async function fixture() {
  const store = new MemoryStore();
  const snapshot = await putAgentContext(store, entries);
  const host = new AgentContextHost(store);
  const ref = await host.grant(snapshot);
  return { store, snapshot, host, ref };
}
describe("agent context source and permission", () => {
  test("captures exact immutable sources and uses a shared canonical schema", async () => {
    const { store, snapshot, host, ref } = await fixture();
    expect(snapshot).toBe(digestCanonical(await store.getValue(snapshot) as JsonValue));
    expect(await host.read(ref, 1)).toEqual(entries[1]!);
    expect(JSON.parse((await host.read(ref, 1)).text)).toEqual({ a: [1, true], z: "東京" });
    const view = await host.inspect(ref);
    expect(view.entries).toHaveLength(4);
    expect(view.entries[0]!.bytes).toBe(new TextEncoder().encode(entries[0]!.text).length);
    const first = await host.read(ref, 0);
    first.text = "altered return";
    expect((await host.read(ref, 0)).text).toBe(entries[0]!.text);
    const next = await putAgentContext(store, [...entries, { kind: "output", label: "later", text: "new" }]);
    expect(next).not.toBe(snapshot);
    expect((await host.inspect(ref)).entries).toHaveLength(4);
    expect(await store.getValue(snapshot)).toBeDefined();
  });
  test("captures mutable caller input and options before awaiting", async () => {
    const store = new MemoryStore();
    const input = entries.map((entry) => ({ ...entry }));
    const pending = putAgentContext(store, input);
    input[0]!.text = "changed after call";
    const snapshot = await pending;
    const host = new AgentContextHost(store);
    const selected = [0];
    const requested = { maxReadBytes: 100 };
    const grant = host.grant(snapshot, selected, requested);
    selected.push(3);
    requested.maxReadBytes = 1000;
    const ref = await grant;
    expect((await host.read(ref, 0)).text).toBe(entries[0]!.text);
    await expect(host.read(ref, 3)).rejects.toMatchObject({ code: "CAPABILITY_DENIED" });
  });
  test("digest and self-constructed handle cannot create permission", async () => {
    const { store, snapshot, host, ref } = await fixture();
    await expect(new AgentContextHost(store).read(ref, 0)).rejects.toMatchObject({ code: "CAPABILITY_DENIED" });
    const forged = { ...ref, capability: capabilityHandle("agent-context", { snapshot, indices: [0] }) };
    await expect(host.read(forged, 0)).rejects.toMatchObject({ code: "CAPABILITY_DENIED" });
    const other = await putAgentContext(store, []);
    await expect(host.read({ ...ref, snapshot: other }, 0)).rejects.toMatchObject({ code: "CAPABILITY_DENIED" });
    expect(() => parseAgentContextRef({ ...ref, trust: true })).toThrow();
    expect(() => host.bind(forged)).toThrow();
  });
  test("delegation only narrows scope and limits, including empty scope", async () => {
    const { host, ref } = await fixture();
    const reader = host.bind(ref);
    const child = await reader.delegate([0, 2], { maxReadBytes: 8, maxSearchResults: 1 });
    expect((await child.inspect()).entries.map((entry) => entry.index)).toEqual([0, 2]);
    await expect(child.read(3)).rejects.toMatchObject({ code: "CAPABILITY_DENIED" });
    await expect(child.delegate([1])).rejects.toMatchObject({ code: "CAPABILITY_DENIED" });
    await expect(child.delegate([0], { maxReadBytes: 9 })).rejects.toThrow();
    expect((await (await child.delegate([])).inspect()).entries).toEqual([]);
    expect(await reader.read(3)).toEqual(entries[3]!);
    for (const selected of [[0, 0], [2, 0], [-1], [1024], [1.1]]) await expect(host.delegate(ref, selected)).rejects.toThrow();
    expect(Object.isFrozen(child.ref)).toBe(true);
    expect(Object.isFrozen(child)).toBe(true);
  });
  test("missing and corrupt sources fail without synthetic fallback", async () => {
    const { store, snapshot, host, ref } = await fixture();
    const source = (await host.inspect(ref)).entries[0]!.digest;
    const original = store.getValue.bind(store);
    store.getValue = async (id) => id === source ? undefined : original(id);
    await expect(host.read(ref, 0)).rejects.toMatchObject({ code: "STORE_MISS" });
    store.getValue = async (id) => id === source ? { schema: "algal.agent-context-entry.v1", ...entries[0]!, text: "tampered" } : original(id);
    await expect(host.read(ref, 0)).rejects.toMatchObject({ code: "DIGEST_MISMATCH" });
    store.getValue = async (id) => id === snapshot ? undefined : original(id);
    await expect(host.inspect(ref)).rejects.toMatchObject({ code: "STORE_MISS" });
    store.getValue = async (id) => id === snapshot ? { schema: "algal.agent-context.v1", entries: [] } : original(id);
    await expect(host.inspect(ref)).rejects.toMatchObject({ code: "DIGEST_MISMATCH" });
  });
  test("valid content digest with false declared size fails", async () => {
    const { store, snapshot } = await fixture();
    const record = await store.getValue(snapshot) as { schema: string; entries: {digest: Digest; bytes: number}[] };
    record.entries[0]!.bytes = 1;
    const falseSize = await store.putValue(record);
    const host = new AgentContextHost(store);
    await expect(host.read(await host.grant(falseSize), 0)).rejects.toMatchObject({ code: "DIGEST_MISMATCH" });
  });
});
describe("agent context limits and UTF-8", () => {
  test("foreign arrays and accessors are rejected without execution or writes", async () => {
    const store = new MemoryStore();
    let calls = 0;
    const hostile = { kind: "input", label: "x", get text() { calls++; return "secret"; } };
    await expect(putAgentContext(store, [hostile] as AgentContextEntryInput[])).rejects.toMatchObject({ code: "PARSE_FAILED" });
    await expect(putAgentContext(store, Array(1) as AgentContextEntryInput[])).rejects.toMatchObject({ code: "PARSE_FAILED" });
    const id = await putAgentContext(store, entries);
    const host = new AgentContextHost(store);
    const ref = await host.grant(id);
    await expect(host.grant(id, Array(1) as number[])).rejects.toMatchObject({ code: "PARSE_FAILED" });
    await expect(host.search(ref, { get query() { calls++; return "secret"; } })).rejects.toMatchObject({ code: "PARSE_FAILED" });
    expect(() => parseAgentContextRef({ ...ref, get snapshot() { calls++; return id; } })).toThrow();
    expect(calls).toBe(0);
    let writes = 0;
    store.putValue = async () => { writes++; throw new Error("unexpected write"); };
    // The tenth source must never even be inspected: nine full entries already
    // exceed the aggregate bound. This also guards accidental whole-array maps.
    const large = Array(1024).fill({ kind: "input", label: "x", text: "x".repeat(1_048_576) }) as AgentContextEntryInput[];
    Object.defineProperty(large, 9, { enumerable: true, get() { calls++; return hostile; } });
    await expect(putAgentContext(store, large)).rejects.toMatchObject({ code: "BUDGET_EXHAUSTED" });
    expect(calls).toBe(0);
    expect(writes).toBe(0);
  });
  test("slices use exact UTF-8 boundaries, retain BOM and preserve sources", async () => {
    const { store, host, ref } = await fixture();
    const child = await host.delegate(ref, [2], { maxReadBytes: 6 });
    expect(await host.slice(child, 2, 0, 6)).toBe("é🐚");
    await expect(host.read(child, 2)).rejects.toMatchObject({ code: "BUDGET_EXHAUSTED" });
    for (const range of [[1, 2], [2, 5], [1, 1], [-1, 2], [6, 0], [0, 1000], [0, 1.5]]) await expect(host.slice(child, 2, range[0]!, range[1]!)).rejects.toThrow();
    expect(await host.slice(child, 2, 6, 6)).toBe("");
    const bom = await putAgentContext(store, [{ kind: "input", label: "bom", text: "\uFEFFx" }]);
    expect(await host.slice(await host.grant(bom), 0, 0, 4)).toBe("\uFEFFx");
    expect(await host.read(ref, 2)).toEqual(entries[2]!);
  });
  test("exact non-overlapping search only visits permitted entries and reports caps", async () => {
    const { host, ref } = await fixture();
    const scoped = await host.delegate(ref, [2]);
    expect(await host.search(scoped, { query: "🐚" })).toEqual({ matches: [{ index: 2, startByte: 2, endByte: 6 }, { index: 2, startByte: 9, endByte: 13 }], scannedBytes: 27, complete: true });
    expect((await host.search(scoped, { query: "private" })).matches).toEqual([]);
    expect(await host.search(scoped, { query: "needle", maxScanBytes: 1 })).toEqual({ matches: [], scannedBytes: 0, complete: false });
    expect((await host.search(scoped, { query: "needle", maxResults: 1 })).complete).toBe(false);
    for (const options of [{ query: "" }, { query: "x", maxResults: 129 }, { query: "x", maxResults: null }, { query: "x", unknown: true }]) await expect(host.search(ref, options as never)).rejects.toThrow();
  });
  test("all source counts/bytes, limits and foreign keys are checked", async () => {
    const store = new MemoryStore();
    const base = { kind: "input", label: "x", text: "" } as const;
    for (const value of [{ ...base, text: "\ud800" }, { ...base, label: "é".repeat(65) }, { ...base, text: "x".repeat(AGENT_CONTEXT_BOUNDS.maxEntryBytes + 1) }, { ...base, extra: 1 }]) await expect(putAgentContext(store, [value])).rejects.toThrow();
    await expect(putAgentContext(store, Array(1025).fill(base))).rejects.toThrow();
    await expect(putAgentContext(store, Array(9).fill({ ...base, text: "x".repeat(1_048_576) }))).rejects.toMatchObject({ code: "BUDGET_EXHAUSTED" });
    const host = new AgentContextHost(store);
    const empty = await putAgentContext(store, []);
    expect((await host.inspect(await host.grant(empty))).entries).toEqual([]);
    for (const requested of [{ maxReadBytes: 0 }, { maxScanBytes: 8_388_609 }, { maxSearchResults: 129 }, { maxReadBytes: null }, { extra: 1 }]) await expect(host.grant(empty, [], requested as Partial<AgentContextLimits>)).rejects.toThrow();
    const id = await putAgentContext(store, [base]);
    for (let i = 1; i <= 255; i++) await host.grant(id, [0], { maxReadBytes: i });
    await expect(host.grant(id, [0], { maxReadBytes: 256 })).rejects.toMatchObject({ code: "BUDGET_EXHAUSTED" });
  });
});
