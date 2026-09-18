import { expect, test } from "bun:test";
import { manifestToJson, parseOrganismManifest } from "./contract";
import { scriptedExecutor } from "./effects";
import { builtinRegistry } from "./registry";
import { runOrganism } from "./run";
import { MemoryStore } from "./store";
import type { ToolRegistry } from "./tools";
import { verifyReceipt } from "./verify";
import type { JsonValue } from "./values";

function lookupRegistry(calls: { value: number }): ToolRegistry {
  return new Map([[
    "records.lookup.v1",
    {
      signature: {
        inputs: { id: { type: "text" } },
        outputs: { record: { type: "json" } },
        effect: "read" as const,
        cost: 25,
        maxOutputBytes: 4096,
      },
      async tool(inputs, context) {
        calls.value++;
        expect(context.idempotencyKey).toBe(context.requestDigest);
        return { record: { id: inputs.id ?? null, status: "active" } };
      },
    },
  ]]);
}

const lookup = parseOrganismManifest({
  contract: "algal.organism.v1",
  key: "organism:tool-lookup",
  name: "Tool lookup",
  interface: {
    inputs: { id: { cell: "src", port: "id" } },
    outputs: { record: { cell: "lookup", port: "record" } },
  },
  cells: [
    { id: "src", kind: "input", outputs: { id: "text" } },
    { id: "lookup", kind: "tool", tool: "records.lookup.v1", budget: { maxEffectMs: 1000 } },
  ],
  edges: [
    { from: { cell: "src", port: "id" }, to: { cell: "lookup", port: "id" } },
  ],
});

test("explicit tool cells are typed, receipted, and replay without live I/O", async () => {
  const calls = { value: 0 };
  const tools = lookupRegistry(calls);
  const store = new MemoryStore();
  const receipt = await runOrganism({
    manifest: lookup,
    args: { src: { id: "customer-7" } },
    fns: builtinRegistry(),
    store,
    executors: [],
    tools,
  });

  expect(receipt.outcome).toBe("complete");
  expect(receipt.cells.lookup?.outputs?.record).toEqual({ id: "customer-7", status: "active" });
  expect(receipt.effects[0]?.executor).toBe("tool:records.lookup.v1");
  expect(calls.value).toBe(1);

  tools.get("records.lookup.v1")!.tool = async () => {
    throw new Error("live tool must not run during replay");
  };
  const verified = await verifyReceipt(
    receipt as unknown as JsonValue,
    manifestToJson(lookup),
    store,
    builtinRegistry(),
    undefined,
    tools,
  );
  expect(verified.mismatches).toEqual([]);
  expect(calls.value).toBe(1);
});

test("agents call declared external tools and replay the nested effect", async () => {
  const manifest = parseOrganismManifest({
    contract: "algal.organism.v1",
    key: "organism:agent-tool",
    name: "Agent external tool",
    cells: [{
      id: "agent",
      kind: "agent",
      inputs: {},
      prompt: "Look up the customer then answer.",
      view: { inputs: [] },
      tools: ["records.lookup.v1"],
      output: { kind: "text" },
      budget: { maxTurns: 2 },
    }],
    edges: [],
  });
  const calls = { value: 0 };
  const tools = lookupRegistry(calls);
  const store = new MemoryStore();
  const receipt = await runOrganism({
    manifest,
    fns: builtinRegistry(),
    store,
    tools,
    executors: [scriptedExecutor({
      agent: [
        { tool: "records.lookup.v1", inputs: { id: "customer-7" } },
        "active",
      ],
    })],
  });

  expect(receipt.outcome).toBe("complete");
  expect(receipt.cells.agent?.outputs?.out).toBe("active");
  expect(receipt.cells.agent?.toolCalls).toEqual([{
    fn: "records.lookup.v1",
    inputs: { id: "customer-7" },
    output: { record: { id: "customer-7", status: "active" } },
  }]);
  expect(receipt.effects.map((effect) => effect.executor)).toEqual([
    "scripted",
    "tool:records.lookup.v1",
    "scripted",
  ]);
  tools.get("records.lookup.v1")!.tool = async () => {
    throw new Error("live tool must not run during replay");
  };
  const verified = await verifyReceipt(
    receipt as unknown as JsonValue,
    manifestToJson(manifest),
    store,
    builtinRegistry(),
    undefined,
    tools,
  );
  expect(verified.mismatches).toEqual([]);
  expect(calls.value).toBe(1);
});

test("tool failures route through ordinary fail edges", async () => {
  const manifest = parseOrganismManifest({
    contract: "algal.organism.v1",
    key: "organism:tool-failure",
    name: "Tool failure",
    cells: [
      { id: "src", kind: "const", outputs: { id: { type: "text", value: "missing" } } },
      { id: "lookup", kind: "tool", tool: "records.lookup.v1" },
      { id: "field", kind: "const", outputs: { value: { type: "text", value: "code" } } },
      { id: "recover", kind: "fn", fn: "pick.v1" },
    ],
    edges: [
      { from: { cell: "src", port: "id" }, to: { cell: "lookup", port: "id" } },
      { from: { cell: "lookup", port: "record" }, to: { cell: "recover", port: "record" }, on: "fail" },
      { from: { cell: "field", port: "value" }, to: { cell: "recover", port: "field" } },
    ],
  });
  const tools = lookupRegistry({ value: 0 });
  tools.get("records.lookup.v1")!.tool = async () => {
    throw new Error("record unavailable");
  };
  const receipt = await runOrganism({
    manifest,
    fns: builtinRegistry(),
    store: new MemoryStore(),
    executors: [],
    tools,
  });

  expect(receipt.outcome).toBe("complete");
  expect(receipt.cells.lookup?.failure?.code).toBe("TOOL_FAILED");
  expect(receipt.cells.recover?.outputs?.value).toBe("TOOL_FAILED");
  expect(receipt.effects[0]?.error?.code).toBe("TOOL_FAILED");
});
