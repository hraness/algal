import { describe, expect, test } from "bun:test";
import { manifestToJson, parseOrganismManifest } from "./contract";
import { bindOutput, checkSchema, scriptedExecutor } from "./effects";
import { builtinRegistry } from "./registry";
import { runOrganism } from "./run";
import { MemoryStore } from "./store";
import { verifyReceipt } from "./verify";
import type { JsonObject, JsonValue } from "./values";

const nestedRequired: JsonObject = {
  type: "object", required: ["ticket"],
  properties: { ticket: { type: "object", required: ["owner"] } },
};
// Empty inner schema defaults to object and stays within the admitted depth 4.
const nestedType: JsonObject = {
  type: "object", required: ["ticket"],
  properties: { ticket: { properties: { detail: {} } } },
};
const cases: { name: string; schema: JsonObject; good: JsonValue; bad: JsonValue }[] = [
  { name: "root string", schema: { type: "string" }, good: "brief", bad: { summary: "wrong shape" } },
  { name: "root number", schema: { type: "number" }, good: 3.5, bad: [] },
  { name: "root integer", schema: { type: "integer" }, good: 3, bad: 3.5 },
  { name: "root boolean", schema: { type: "boolean" }, good: true, bad: { approved: true } },
  { name: "root null", schema: { type: "null" }, good: null, bad: {} },
  { name: "root array", schema: { type: "array" }, good: ["one"], bad: {} },
  { name: "root object", schema: { type: "object" }, good: {}, bad: [] },
  { name: "nested required", schema: nestedRequired, good: { ticket: { owner: "reviewer" } }, bad: { ticket: {} } },
  { name: "nested object type", schema: nestedType, good: { ticket: { detail: {} } }, bad: { ticket: { detail: "not a record" } } },
];

function agent(schema: JsonObject) {
  return parseOrganismManifest({
    contract: "algal.organism.v1", key: "organism:schema-output", name: "Schema output",
    cells: [{ id: "answer", kind: "agent", prompt: "Return the admitted fixture.",
      output: { kind: "json", schema } }], edges: [],
  });
}

describe("the declared schema subset at execution boundaries", () => {
  for (const item of cases) {
    test(`${item.name}: reject malformed agent output and replay a valid output`, async () => {
      const manifest = agent(item.schema);
      const store = new MemoryStore();
      const invalid = await runOrganism({ manifest, store, fns: builtinRegistry(),
        executors: [scriptedExecutor({ answer: [item.bad] })] });
      expect(invalid.outcome).toBe("failed");
      expect(invalid.failure?.code).toBe("EFFECT_UNPARSEABLE");
      expect(invalid.cells.answer?.status).toBe("failed");
      const valid = await runOrganism({ manifest, store, fns: builtinRegistry(),
        executors: [scriptedExecutor({ answer: [item.good] })] });
      expect(valid.outcome).toBe("complete");
      expect(valid.cells.answer?.outputs?.out).toEqual(item.good);
      expect((await verifyReceipt(valid as unknown as JsonValue, manifestToJson(manifest), store, builtinRegistry())).ok).toBe(true);
    });
  }

  for (const item of cases.filter(item => item.name.startsWith("nested") || item.name === "root string")) {
    test(`${item.name}: reject typed input before activating its consumer`, async () => {
      const manifest = parseOrganismManifest({
        contract: "algal.organism.v1", key: "organism:schema-input", name: "Schema input",
        cells: [{ id: "input", kind: "input", outputs: { data: "json" } },
          { id: "consumer", kind: "agent", inputs: { data: { type: "json", schema: item.schema } },
            prompt: "This executor must not activate for malformed input.", output: { kind: "text" } }],
        edges: [{ from: { cell: "input", port: "data" }, to: { cell: "consumer", port: "data" } }],
      });
      let calls = 0;
      const executor = scriptedExecutor({ consumer: "unreachable" });
      const original = executor.execute;
      executor.execute = async request => { calls++; return original(request); };
      const receipt = await runOrganism({ manifest, store: new MemoryStore(), fns: builtinRegistry(),
        args: { input: { data: item.bad } }, executors: [executor] });
      expect(receipt.cells.consumer?.failure?.code).toBe("TYPE_MISMATCH");
      expect(calls).toBe(0);
    });
  }

  test("required keys cannot be supplied by Object.prototype", () => {
    expect(() => checkSchema({ required: ["toString"] }, {}, "input", "TYPE_MISMATCH"))
      .toThrow("missing required field");
  });

  test("unsupported provider hints do not silently become VM constraints", async () => {
    const schema: JsonObject = { type: "object", required: ["summary"], additionalProperties: false,
      properties: { summary: { type: "string", maxLength: 2, enum: ["ok"] } } };
    const value = { summary: "longer than the provider hint", extra: true };
    expect(bindOutput({ kind: "json", schema }, value, "answer")).toEqual(value);
    const manifest = agent(schema);
    const receipt = await runOrganism({ manifest, store: new MemoryStore(), fns: builtinRegistry(),
      executors: [scriptedExecutor({ answer: value })] });
    expect(receipt.outcome).toBe("complete");
  });

  test("schema diagnostics and multi-failure order match the native contract", () => {
    const schema: JsonObject = { type: "object", required: ["severity"], properties: { severity: { type: "string" } } };
    expect(() => bindOutput({ kind: "json", schema }, 3, "answer")).toThrow("expected object");
    expect(() => bindOutput({ kind: "json", schema }, {}, "answer")).toThrow("missing required field");
    expect(() => bindOutput({ kind: "json", schema }, { severity: 3 }, "answer")).toThrow("expected string");
    expect(() => checkSchema({ properties: { z: { type: "string" }, a: { required: ["new"] } } },
      { z: 3, a: {} }, "value")).toThrow("missing required field");
    expect(() => checkSchema({ properties: { "😀": { type: "boolean" }, "\ue000": { type: "number" } } },
      { "😀": 3, "\ue000": false }, "value")).toThrow("expected number");
  });

  test("schema admission retains its existing depth bound", () => {
    expect(() => agent({ properties: { ticket: { properties: { detail: { type: "string" } } } } }))
      .toThrow(/schema depth/);
  });
});
