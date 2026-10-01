import { expect, test } from "bun:test";
import { AgentContextHost, putAgentContext } from "./agent-context";
import { AGENT_CONTEXT_QUERY_TOOL, agentContextToolRegistry, agentContextReplayToolRegistry, parseAgentContextQuery, queryAgentContext, selectAgentContext } from "./agent-context-tools";
import { BOUNDS, manifestToJson, parseOrganismManifest } from "./contract";
import { digestCanonical } from "./digest";
import { scriptedExecutor } from "./effects";
import { builtinRegistry } from "./registry";
import { runOrganism } from "./run";
import { MemoryStore } from "./store-memory";
import { canonicalBytes, type JsonValue } from "./values";
import { verifyReceipt } from "./verify";

async function setup(text = "keep 🌱 exact") {
  const store = new MemoryStore();
  const source = await putAgentContext(store, [
    { kind: "instruction", label: "original request", text },
    { kind: "observation", label: "another principal", text: "private" },
  ]);
  const host = new AgentContextHost(store);
  return { store, reader: host.bind(await host.grant(source, [0])) };
}

test("portable queries inspect, read, slice, and search only the bound source", async () => {
  const { reader } = await setup();
  expect(await queryAgentContext(reader, { op: "inspect", limit: 1 })).toMatchObject({ totalEntries: 1, nextOffset: null, entries: [{ index: 0, label: "original request" }] });
  expect(await queryAgentContext(reader, { op: "read", index: 0 })).toMatchObject({ text: "keep 🌱 exact" });
  expect(await queryAgentContext(reader, { op: "slice", index: 0, startByte: 5, endByte: 9 })).toBe("🌱");
  expect(await queryAgentContext(reader, { op: "search", query: "🌱" })).toMatchObject({ matches: [{ index: 0, startByte: 5, endByte: 9 }] });
  await expect(queryAgentContext(reader, { op: "read", index: 1 })).rejects.toMatchObject({ code: "CAPABILITY_DENIED" });
  await expect(selectAgentContext(reader, { indices: [1] })).rejects.toMatchObject({ code: "CAPABILITY_DENIED" });
  expect(await selectAgentContext(reader, { indices: [0] })).toMatchObject({ entries: [{ index: 0, text: "keep 🌱 exact" }] });
});

test("query protocol refuses scope substitution, accessors, oversized and malformed queries", () => {
  for (const query of [
    { op: "read", index: 0, snapshot: digestCanonical("other") },
    { op: "inspect", limit: 65 }, { op: "inspect", offset: -1 },
    { op: "read", index: 0.5 }, { op: "search", query: "" },
    { op: "search", query: "a".repeat(8193) }, { op: "search", query: "x", maxResults: 129 },
    { op: "search", query: "x", maxScanBytes: 8_388_609 },
    { op: "slice", index: 0, startByte: 0, endByte: 1_048_577 },
    { op: "grant", indices: [0] },
  ]) expect(() => parseAgentContextQuery(query)).toThrow();
  let read = false;
  expect(() => parseAgentContextQuery({ get op() { read = true; return "inspect"; } })).toThrow();
  expect(read).toBe(false);
});

test("selection count, uniqueness and combined output limits apply before returning data", async () => {
  const { reader } = await setup("\u0000".repeat(20_000));
  await expect(selectAgentContext(reader, { indices: [0, 0] })).rejects.toThrow();
  await expect(selectAgentContext(reader, { indices: [0, 1, 2, 3, 4] })).rejects.toThrow();
  await expect(selectAgentContext(reader, { indices: [0] })).rejects.toMatchObject({ code: "BUDGET_EXHAUSTED" });
  expect(await selectAgentContext(reader, { indices: [] })).toMatchObject({ entries: [] });
});

test("tool bound includes its result wrapper and cancellation after a pending read", async () => {
  // JSON string itself fits exactly; its registry result envelope would not.
  const text = "\u0000".repeat(43_690) + "ab";
  expect(canonicalBytes(text)).toBe(BOUNDS.maxValueBytes);
  const { reader } = await setup(text);
  await expect(queryAgentContext(reader, { op: "slice", index: 0, startByte: 0, endByte: text.length })).rejects.toMatchObject({ code: "BUDGET_EXHAUSTED" });
  const controller = new AbortController();
  const delayed = { ...reader, async read(index: number) { const result = await reader.read(index); controller.abort(); return result; } };
  const registry = agentContextToolRegistry(delayed);
  await expect(registry.get(AGENT_CONTEXT_QUERY_TOOL)!.tool({ query: { op: "read", index: 0 } }, {
    requestDigest: digestCanonical("call"), idempotencyKey: digestCanonical("key"), signal: controller.signal,
  })).rejects.toThrow();
});

test("model-directed retrieval is charged and replays offline without live context access", async () => {
  const { store, reader } = await setup();
  const manifest = parseOrganismManifest({
    contract: "algal.organism.v1", key: "organism:context-reader-test", name: "Context reader test",
    budgets: { maxSteps: 3, maxAgentCalls: 2, maxWork: 100_000, maxContextBytes: 8192, maxOutputBytes: 4096, maxDepth: 0 },
    cells: [{ id: "answer", kind: "agent", inputs: {}, view: { inputs: "*" }, prompt: "Read the original instruction.",
      output: { kind: "text" }, tools: [AGENT_CONTEXT_QUERY_TOOL], budget: { maxTurns: 2 } }], edges: [],
  });
  const receipt = await runOrganism({ manifest, args: {}, fns: builtinRegistry(), store, tools: agentContextToolRegistry(reader),
    executors: [scriptedExecutor({ answer: [{ tool: AGENT_CONTEXT_QUERY_TOOL, inputs: { query: { op: "read", index: 0 } } }, "keep 🌱 exact"] })] });
  expect(receipt.outcome).toBe("complete");
  expect(receipt.work.agentCalls).toBe(2);
  expect(receipt.effects.some(effect => effect.executor === `tool:${AGENT_CONTEXT_QUERY_TOOL}`)).toBe(true);
  expect((await verifyReceipt(receipt as unknown as JsonValue, manifestToJson(manifest), store, builtinRegistry(), undefined, agentContextReplayToolRegistry())).ok).toBe(true);
});
