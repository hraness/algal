import { expect, test } from "bun:test";
import { manifestToJson, parseOrganismManifest, type OrganismManifest } from "./contract";
import { compileOrganism, portCompatible } from "./graph";
import { scriptedExecutor } from "./effects";
import { builtinRegistry } from "./registry";
import { runOrganism } from "./run";
import { MemoryStore } from "./store";
import { verifyReceipt } from "./verify";
import type { JsonObject, JsonValue } from "./values";

const manifest = (fields: JsonObject) => parseOrganismManifest({
  contract: "algal.organism.v1", key: "organism:safety", name: "Safety", ...fields,
});
const edge = (from: string, to: string, port = "value", guard?: JsonValue) => ({
  from: { cell: from, port: "value" }, to: { cell: to, port }, ...(guard ? { guard } : {}),
});
async function run(m: OrganismManifest, store = new MemoryStore()) {
  return runOrganism({ manifest: m, store, fns: new Map(), executors: [] });
}

test("SDK argument admission bounds unused data before any activation", async () => {
  const m = manifest({ cells: [] });
  for (const args of [{ unused: { value: "x".repeat(1_048_576) } }, { unused: null }]) {
    await expect(runOrganism({ manifest: m, args: args as never, store: new MemoryStore(), fns: new Map(), executors: [] })).rejects.toThrow();
  }
});

test("agent tool calls reject undeclared arguments before entering host code", async () => {
  const m = manifest({ cells: [{ id: "agent", kind: "agent", prompt: "Call the admitted tool", tools: ["pick.v1"], output: { kind: "text" } }] });
  const receipt = await runOrganism({ manifest: m, store: new MemoryStore(), fns: builtinRegistry(),
    executors: [scriptedExecutor({ agent: [{ tool: "pick.v1", inputs: { record: { name: "ok" }, field: "name", hidden: true } }, "done"] })] });
  expect(receipt.failure).toMatchObject({ code: "TYPE_MISMATCH", message: "tool pick.v1 received undeclared input hidden" });
  expect(receipt.effects).toHaveLength(1);
});

test("compaction decisions obey the same effect output bound as ordinary calls", async () => {
  const m = manifest({ cells: [{ id: "agent", kind: "agent", prompt: "Use the tool", tools: ["pick.v1"],
    compact: { maxLogBytes: 1 }, budget: { maxOutputBytes: 128, maxTurns: 3 }, output: { kind: "text" } }] });
  const store = new MemoryStore();
  const receipt = await runOrganism({ manifest: m, store, fns: builtinRegistry(), executors: [scriptedExecutor({ agent: [
    { tool: "pick.v1", inputs: { record: { name: "ok" }, field: "name" } },
    { answers: { keep_0: { noul: 0.1 } }, extra: "x".repeat(1024) }, "done",
  ] })] });
  expect(receipt.failure?.code).toBe("BUDGET_EXHAUSTED");
  expect(receipt.effects).toHaveLength(2);
  expect((await verifyReceipt(receipt as unknown as JsonValue, manifestToJson(m), store, builtinRegistry())).ok).toBe(true);
});

test("expr output schemas fail at commit and yield replayable failure evidence", async () => {
  const m = manifest({ cells: [{ id: "answer", kind: "expr", expr: { contract: "algal.expr.v1", program: 42 },
    output: { kind: "json", schema: { type: "object", required: ["answer"] } } }] });
  const store = new MemoryStore();
  const receipt = await run(m, store);
  expect(receipt.outcome).toBe("failed");
  expect(receipt.cells.answer?.failure?.code).toBe("TYPE_MISMATCH");
  expect((await verifyReceipt(receipt as unknown as JsonValue, manifestToJson(m), store, new Map())).ok).toBe(true);
});

test("repeat carries preserve port types and cap/ref lists never feed scalar ports", async () => {
  for (const type of ["ref", "cap"] as const) {
    const port = type === "cap" ? { type, capability: "mailbox-send" } : { type };
    expect(portCompatible({ ...port, many: true }, port)).toBe(false);
    expect(portCompatible(port, { ...port, many: true })).toBe(true);
  }
  const store = new MemoryStore();
  const child = manifest({ cells: [
    { id: "input", kind: "input", outputs: { value: "text" } },
    { id: "answer", kind: "const", outputs: { value: { type: "json", value: 42 } } },
  ], interface: { inputs: { value: { cell: "input", port: "value" } }, outputs: { value: { cell: "answer", port: "value" } } } });
  const digest = await store.putManifest(child);
  const m = manifest({ cells: [{ id: "loop", kind: "repeat", manifest: digest, maxRounds: 2, carry: { value: "value" } }] });
  await expect(compileOrganism(m, new Map(), store)).rejects.toMatchObject({ code: "TYPE_MISMATCH" });
});

test("invalid interface output references fail with a contract error", async () => {
  const m = manifest({ cells: [], interface: { outputs: { value: { cell: "missing", port: "value" } } } });
  await expect(compileOrganism(m, new Map(), new MemoryStore())).rejects.toMatchObject({ code: "INTERFACE_MISMATCH" });
});

test("each and spawn cannot manufacture typed capability edges from json", async () => {
  const store = new MemoryStore();
  const child = manifest({ cells: [{ id: "input", kind: "input", outputs: { value: { type: "cap", capability: "mailbox-send" } } }],
    interface: { inputs: { value: { cell: "input", port: "value" } }, outputs: { value: { cell: "input", port: "value" } } } });
  const digest = await store.putManifest(child);
  await expect(compileOrganism(manifest({ cells: [{ id: "map", kind: "each", manifest: digest, over: "value", maxItems: 2 }] }), new Map(), store))
    .rejects.toMatchObject({ code: "TYPE_MISMATCH" });
  const receipt = await run(manifest({ cells: [
    { id: "definition", kind: "const", outputs: { value: { type: "json", value: manifestToJson(child) } } },
    { id: "child", kind: "spawn" },
  ], edges: [edge("definition", "child", "manifest")] }), store);
  expect(receipt.failure?.code).toBe("TYPE_MISMATCH");
  expect(receipt.cells["child/input"]).toBeUndefined();
  // The same child remains available through the explicit typed interface.
  await expect(compileOrganism(manifest({ cells: [{ id: "child", kind: "organism", manifest: digest }] }), new Map(), store)).resolves.toBeDefined();
});

test("guard errors preserve the prefix and verify without throwing", async () => {
  for (const program of [1, ["div", 1, 0]] as JsonValue[]) {
    const m = manifest({ cells: [
      { id: "source", kind: "const", outputs: { value: { type: "json", value: 1 } } },
      { id: "sink", kind: "store" },
    ], edges: [edge("source", "sink", "data", { expr: { contract: "algal.expr.v1", program } })] });
    const store = new MemoryStore();
    const receipt = await run(m, store);
    expect(receipt.outcome).toBe("failed");
    expect(receipt.failure).toMatchObject({ code: "GUARD_INVALID", path: "sink" });
    expect(receipt.cells.source?.status).toBe("committed");
    expect(receipt.cells.sink).toBeUndefined();
    expect((await verifyReceipt(receipt as unknown as JsonValue, manifestToJson(m), store, new Map())).ok).toBe(true);
  }
});

test("false guards still exhaust work and guards burn only once after dependencies resolve", async () => {
  const guard = { expr: { contract: "algal.expr.v1", program: ["eq", ["get", "value"], 1] } };
  const cells: JsonValue[] = [
    { id: "source", kind: "const", outputs: { value: { type: "json", value: 1 } } },
    { id: "sink", kind: "expr", inputs: { a: "json", b: "json" }, expr: { contract: "algal.expr.v1", program: true }, output: { kind: "json", schema: { type: "boolean" } } },
    { id: "delayed", kind: "const", outputs: { value: { type: "json", value: 2 } } },
  ];
  const edges = [edge("source", "sink", "a", guard), edge("delayed", "sink", "b")];
  const early = await run(manifest({ cells, edges }));
  const late = await run(manifest({ cells: [cells[0]!, cells[2]!, cells[1]!], edges }));
  expect(early.work).toEqual(late.work);
  const bounded = await run(manifest({ budgets: { maxWork: 100 }, cells: [cells[0]!, { id: "sink", kind: "store" }],
    edges: [edge("source", "sink", "data", { expr: { contract: "algal.expr.v1", program: false } })] }));
  expect(bounded.failure?.code).toBe("BUDGET_EXHAUSTED");
  expect(bounded.work.units).toBe(101);
});
