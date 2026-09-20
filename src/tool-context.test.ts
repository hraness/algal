import { expect, test } from "bun:test";
import { parseOrganismManifest, manifestToJson } from "./contract";
import { digestCanonical } from "./digest";
import { scriptedExecutor } from "./effects";
import { builtinRegistry } from "./registry";
import { runOrganism } from "./run";
import { MemoryStore } from "./store";
import { elideToolContext } from "./tool-context";
import { canonicalBytes, type JsonObject, type JsonValue } from "./values";
import { verifyReceipt } from "./verify";

const policy = { mode: "elide" as const, maxLogBytes: 700, keepRecent: 1 };
const call = (letter: string) => ({ tool: "pick.v1", inputs: { record: { data: letter.repeat(250) }, field: "data" } });
function manifest(compact: unknown = policy, maxContextBytes = 1100) {
  return parseOrganismManifest({ contract: "algal.organism.v1", key: "organism:elide-test", name: "Elide test",
    cells: [{ id: "a", kind: "agent", inputs: {}, prompt: "Read both records then answer", output: { kind: "text" }, tools: ["pick.v1"], compact,
      budget: { maxTurns: 4, maxContextBytes, maxOutputBytes: 2000 } }], edges: [] });
}

function context(): JsonObject {
  return { inputs: {}, turn: 2, toolLog: [
    { fn: "pick.v1", inputs: call("a").inputs, output: { value: "a".repeat(250) } },
    { fn: "pick.v1", inputs: call("b").inputs, output: { value: "b".repeat(250) } },
  ] };
}

test("opt-in elision rescues an over-budget log without a decision call and preserves receipt source", async () => {
  const m = manifest();
  const r = await runOrganism({ manifest: m, args: {}, fns: builtinRegistry(), store: new MemoryStore(), executors: [scriptedExecutor({ a: [call("a"), call("b"), "done"] })] });
  expect(r.outcome).toBe("complete");
  expect(r.work.agentCalls).toBe(3);
  expect(r.effects).toHaveLength(3);
  const full = r.cells.a!.toolCalls as JsonObject[];
  expect(full).toHaveLength(2);
  expect(full[0]!.output).toEqual({ value: "a".repeat(250) });
  expect(full[1]!.inputs).toEqual(call("b").inputs);
  const verified = await verifyReceipt(r as unknown as JsonValue, manifestToJson(m), new MemoryStore());
  expect(verified.ok).toBe(true);
});

test("omitted mode retains the legacy preflight failure and exact replay", async () => {
  const m = manifest({ maxLogBytes: 700, keepRecent: 1 });
  const r = await runOrganism({ manifest: m, args: {}, fns: builtinRegistry(), store: new MemoryStore(), executors: [scriptedExecutor({ a: [call("a"), call("b"), "must not run"] })] });
  expect(r.outcome).toBe("failed");
  expect(r.failure?.message).toBe("compaction context 1206B exceeds maxContextBytes 1100B");
  expect(r.work.agentCalls).toBe(2);
  expect((manifestToJson(m).cells as JsonObject[])[0]!.compact).toEqual({ maxLogBytes: 700, keepRecent: 1 });
  expect((await verifyReceipt(r as unknown as JsonValue, manifestToJson(m), new MemoryStore())).ok).toBe(true);
});

test("projection replaces only stale body, binds exact UTF-8 bytes, and is repeatable without mutating source", () => {
  const source = context();
  const log = source.toolLog as JsonObject[];
  log[0]!.output = { value: "🍄".repeat(300) };
  const before = structuredClone(source);
  const projected = elideToolContext(source, policy, 1100);
  const result = projected.toolLog as JsonObject[];
  expect(source).toEqual(before);
  expect(result[0]!.fn).toBe(log[0]!.fn);
  expect(result[0]!.inputs).toEqual(log[0]!.inputs);
  expect(result[0]!.output).toEqual({ contract: "algal.tool-output-ref.v1", source: digestCanonical(log[0]!.output!), bytes: canonicalBytes(log[0]!.output!) });
  expect(result[1]).toEqual(log[1]);
  expect(elideToolContext(source, policy, 1100)).toEqual(projected);
  expect(elideToolContext(projected, policy, 1100)).toEqual(projected);
  expect(canonicalBytes(projected)).toBeLessThan(canonicalBytes(source));
});

test("no-op keeps small outputs and below-threshold contexts exact", () => {
  const source = context();
  expect(elideToolContext(source, { ...policy, maxLogBytes: 5000 }, 5000)).toBe(source);
  const small: JsonObject = { inputs: {}, turn: 1, toolLog: [{ fn: "inc.v1", inputs: { value: 1 }, output: { value: 2 } }] };
  expect(elideToolContext(small, { ...policy, keepRecent: 0, maxLogBytes: 1 }, 5000)).toEqual(small);
});

test("full context size can trigger projection below the log target", () => {
  const source = { ...context(), note: "n".repeat(100) };
  const projected = elideToolContext(source, { ...policy, maxLogBytes: 5000 }, 1200);
  expect(canonicalBytes(source)).toBeGreaterThan(1200);
  expect(canonicalBytes(projected)).toBeLessThanOrEqual(1200);
  expect(projected.note).toBe(source.note);
});

test("protected tail and metadata overflow fail before another model call", async () => {
  for (const compact of [{ ...policy, keepRecent: 2 }, policy]) {
    const m = manifest(compact, 800);
    const r = await runOrganism({ manifest: m, args: {}, fns: builtinRegistry(), store: new MemoryStore(), executors: [scriptedExecutor({ a: [call("a"), call("b"), "must not run"] })] });
    expect(r.outcome).toBe("failed");
    expect(r.failure?.code).toBe("BUDGET_EXHAUSTED");
    expect(r.failure?.message).toContain("context view");
    expect(r.work.agentCalls).toBe(2);
  }
});

test("mode is a closed opt-in and cannot silently ignore a judge route", () => {
  for (const mode of ["decide", "summary", true, null]) expect(() => manifest({ ...policy, mode })).toThrow();
  expect(() => manifest({ ...policy, route: { provider: "ignored" } })).toThrow();
  expect(() => manifest({ ...policy, extra: true })).toThrow();
  expect((manifestToJson(manifest()).cells as JsonObject[])[0]!.compact).toEqual(policy);
});

test("external results remain verbatim in effect evidence and replay without live tool calls", async () => {
  const m = parseOrganismManifest({ contract: "algal.organism.v1", key: "organism:elide-external", name: "External evidence",
    cells: [{ id: "a", kind: "agent", inputs: {}, prompt: "Read two logs then finish", output: { kind: "text" }, tools: ["log.v1"],
      compact: { ...policy, maxLogBytes: 2000 }, budget: { maxTurns: 3, maxContextBytes: 3000 } }], edges: [] });
  const tools: import("./tools").ToolRegistry = new Map([["log.v1", {
    signature: { inputs: { id: { type: "text" } }, outputs: { value: { type: "text" } }, effect: "read", cost: 1, maxOutputBytes: 3000 },
    tool: async (inputs) => ({ value: String(inputs.id).repeat(2000) }),
  }]]);
  const r = await runOrganism({ manifest: m, args: {}, fns: builtinRegistry(), store: new MemoryStore(), tools,
    executors: [scriptedExecutor({ a: [{ tool: "log.v1", inputs: { id: "a" } }, { tool: "log.v1", inputs: { id: "b" } }, "done"] })] });
  expect(r.outcome).toBe("complete");
  expect(r.effects.filter(effect => effect.executor === "tool:log.v1").map(effect => effect.output)).toEqual([{ value: "a".repeat(2000) }, { value: "b".repeat(2000) }]);
  expect((r.cells.a!.toolCalls as JsonObject[])[0]!.output).toEqual({ value: "a".repeat(2000) });
  tools.get("log.v1")!.tool = async () => { throw new Error("replay must not call live tool"); };
  expect((await verifyReceipt(r as unknown as JsonValue, manifestToJson(m), new MemoryStore(), builtinRegistry(), undefined, tools)).ok).toBe(true);
});
