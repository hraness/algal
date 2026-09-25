import { describe, expect, test } from "bun:test";
import invalidV2 from "../scripts/fixtures/schema-v2-admission.json";
import values from "../scripts/fixtures/schema-v2-values.json";
import { BOUNDS, manifestToJson, parseOrganismManifest, type OrganismManifest } from "./contract";
import { digestCanonical } from "./digest";
import { AlgalError } from "./errors";
import { checkSchema, scriptedExecutor } from "./effects";
import { builtinRegistry } from "./registry";
import { runOrganism } from "./run";
import { checkSchemaValueV2, SCHEMA_V2_BOUNDS } from "./schema";
import { MemoryStore } from "./store";
import { verifyReceipt } from "./verify";
import type { JsonObject, JsonValue } from "./values";

type Placement = "output" | "input-port" | "producer-port";
const VERSION_1 = Symbol("no schemaVersion");
function manifest(schema: unknown, placement: Placement, version: unknown = 2): unknown {
  const marker = version === VERSION_1 ? {} : { schemaVersion: version };
  const typed = { type: "json", schema, ...marker };
  return {
    contract: "algal.organism.v1", key: "organism:schema-v2", name: "Schema version 2",
    cells: placement === "output"
      ? [{ id: "answer", kind: "agent", prompt: "Must pass admission first.", output: { kind: "json", schema, ...marker } }]
      : placement === "input-port"
        ? [{ id: "answer", kind: "agent", inputs: { data: typed }, prompt: "Must pass admission first.", output: { kind: "text" } }]
        : [{ id: "input", kind: "input", outputs: { data: typed } }],
    edges: [],
  };
}
const placements: Placement[] = ["output", "input-port", "producer-port"];
function rejection(value: unknown): AlgalError {
  try { parseOrganismManifest(value); }
  catch (error) { expect(error).toBeInstanceOf(AlgalError); return error as AlgalError; }
  throw new Error("manifest was admitted");
}
const names = (count: number) => Array.from({ length: count }, (_, i) => `f${i}`);
// Cases too large to spell out in the shared fixture; the parity script builds the same ones.
const generated: { name: string; schema: JsonObject; reason: string }[] = [
  { name: "required-over-bound", schema: { required: names(65) }, reason: "required must list at most 64 distinct names of at most 64 UTF-16 code units" },
  { name: "properties-over-bound", schema: { properties: Object.fromEntries(names(65).map(name => [name, {}])) }, reason: "properties must map at most 64 names to schemas" },
  { name: "enum-over-bound", schema: { type: "number", enum: Array.from({ length: 33 }, (_, i) => i) }, reason: "enum must list 1 to 32 distinct values" },
  { name: "enum-value-over-bound", schema: { type: "string", enum: ["x".repeat(255)] }, reason: "enum values must be strings, finite numbers, booleans, or null of at most 256 canonical JSON bytes" },
];

describe("schema version 2 declarations", () => {
  for (const item of [...invalidV2 as { name: string; schema: JsonObject; reason: string }[], ...generated]) {
    test(`${item.name} is refused at every schema boundary with the shared reason`, () => {
      for (const placement of placements) {
        const error = rejection(manifest(item.schema, placement));
        expect(error.code).toBe("PARSE_FAILED");
        // The reference runtime prefixes the schema's location; the reason is the native message.
        expect(error.message.endsWith(item.reason), error.message).toBe(true);
      }
    });
  }

  test("the declared bounds are inclusive", () => {
    const nested = (levels: number): JsonObject => levels === 1 ? { type: "string" } : { type: "array", items: nested(levels - 1) };
    for (const schema of [
      { required: names(SCHEMA_V2_BOUNDS.maxRequired) },
      { properties: Object.fromEntries(names(SCHEMA_V2_BOUNDS.maxProperties).map(name => [name, {}])) },
      { type: "number", enum: Array.from({ length: SCHEMA_V2_BOUNDS.maxEnumValues }, (_, i) => i) },
      // 254 characters plus two quotes is exactly 256 canonical bytes.
      { type: "string", enum: ["x".repeat(254)] },
      nested(SCHEMA_V2_BOUNDS.maxLevels),
      { type: ["string", "null"], enum: ["open", null] },
      { type: "integer", minimum: 3, maximum: 3 },
      { type: ["number", "string"], minimum: -1.5 },
    ] as JsonObject[]) {
      for (const placement of placements) expect(() => parseOrganismManifest(manifest(schema, placement))).not.toThrow();
    }
    expect(BOUNDS.maxSchemaLevels).toBe(8);
    expect([BOUNDS.maxSchemaProperties, BOUNDS.maxSchemaRequired, BOUNDS.maxSchemaEnumValues, BOUNDS.maxSchemaEnumValueBytes]).toEqual([64, 64, 32, 256]);
  });

  test("schemaVersion is the number 2 beside a schema", () => {
    for (const placement of placements) {
      for (const version of [1, 3, "2", null]) {
        expect(rejection(manifest({ type: "string" }, placement, version)).message).toEndWith("schemaVersion must be 2");
      }
    }
    const port = (decl: JsonObject) => ({ contract: "algal.organism.v1", key: "organism:version", name: "Version",
      cells: [{ id: "input", kind: "input", outputs: { data: decl } }], edges: [] });
    expect(rejection(port({ type: "json", schemaVersion: 2 })).message).toEndWith("schemaVersion requires a schema");
    expect(rejection(port({ type: "text", schemaVersion: 2 })).message).toEndWith("schemaVersion requires a schema");
    expect(rejection(port({ type: "text", schema: { type: "string" }, schemaVersion: 2 })).message).toEndWith('schema requires type "json"');
  });

  test("the version is part of the manifest and its identity, and version 1 keeps its bytes", () => {
    const schema = { type: "array", items: { type: "number" } };
    for (const placement of placements) {
      const v2 = parseOrganismManifest(manifest(schema, placement));
      const json = manifestToJson(v2);
      expect(parseOrganismManifest(json)).toEqual(v2);
      expect(JSON.stringify(json)).toContain('"schemaVersion":2');
      const v1 = parseOrganismManifest(manifest(schema, placement, VERSION_1));
      expect(JSON.stringify(manifestToJson(v1))).not.toContain("schemaVersion");
      expect(digestCanonical(manifestToJson(v1))).not.toBe(digestCanonical(json));
    }
  });
});

// Each case: a schema, values it accepts, and malformed values with the exact
// message. The native tests and scripts/schema-parity.ts run the same table.
const valueCases = values as unknown as { name: string; schema: JsonObject; good: JsonValue[]; bad: [JsonValue, string][] }[];
const task = (valueCases[0]!.schema.items as JsonObject);

describe("schema version 2 values", () => {
  test("the shared table covers every value rule", () => {
    const messages = new Set(valueCases.flatMap(item => item.bad.map(([, message]) => message.replace(/^(item \d+: )+/, ""))));
    for (const message of ["expected array", "expected an allowed value", "number below minimum", "number above maximum", "missing required field", "expected integer"]) {
      expect(messages.has(message), message).toBe(true);
    }
    expect(valueCases.some(item => item.bad.some(([, message]) => message.startsWith("item 1: item 1: ")))).toBe(true);
    expect(valueCases.find(item => item.name === "canonical-allowed-values")?.good.some(value => Object.is(value, -0))).toBe(true);
  });
  for (const item of valueCases) {
    test(`${item.name}: accepted and rejected values with exact messages`, () => {
      for (const placement of placements) expect(() => parseOrganismManifest(manifest(item.schema, placement))).not.toThrow();
      for (const value of item.good) {
        expect(() => checkSchemaValueV2(item.schema, value, "TYPE_MISMATCH")).not.toThrow();
        expect(() => checkSchema(item.schema, value, "value", "EFFECT_UNPARSEABLE", 2)).not.toThrow();
      }
      for (const [value, message] of item.bad) {
        for (const code of ["TYPE_MISMATCH", "EFFECT_UNPARSEABLE"] as const) {
          let caught: unknown;
          try { checkSchema(item.schema, value, "value", code, 2); } catch (error) { caught = error; }
          expect(caught, JSON.stringify(value)).toBeInstanceOf(AlgalError);
          expect({ code: (caught as AlgalError).code, message: (caught as AlgalError).message }).toEqual({ code, message });
        }
      }
    });
  }

  test("the same keywords stay provider hints in version 1", () => {
    const list = { type: "array", items: { type: "string" } };
    expect(() => checkSchema(list, [1, 2], "value", "TYPE_MISMATCH")).not.toThrow();
    expect(() => checkSchema(list, [1, 2], "value", "TYPE_MISMATCH", 2)).toThrow("item 0: expected string");
    const bounded = { type: "number", enum: [1], maximum: 0 };
    expect(() => checkSchema(bounded, 5, "value", "TYPE_MISMATCH")).not.toThrow();
    expect(() => checkSchema(bounded, 5, "value", "TYPE_MISMATCH", 2)).toThrow("expected an allowed value");
  });
});

async function install(manifests: OrganismManifest[]) {
  const store = new MemoryStore();
  for (const item of manifests) await store.putManifest(item);
  return store;
}
async function replayed(receipt: unknown, root: OrganismManifest, store: MemoryStore) {
  expect((await verifyReceipt(receipt as JsonValue, manifestToJson(root), store, builtinRegistry())).ok).toBe(true);
}

describe("schema version 2 at execution boundaries", () => {
  const schema: JsonObject = { type: "array", items: task };
  test("agent output fails with EFFECT_UNPARSEABLE and replays", async () => {
    const root = parseOrganismManifest(manifest(schema, "output"));
    const store = await install([]);
    const bad = await runOrganism({ manifest: root, store, fns: builtinRegistry(), executors: [scriptedExecutor({ answer: [[{ id: "a", status: "open", urgency: 9 }]] })] });
    expect(bad.failure).toEqual({ code: "EFFECT_UNPARSEABLE", message: "item 0: number above maximum", path: "answer" });
    await replayed(bad, root, store);
    const good = await runOrganism({ manifest: root, store, fns: builtinRegistry(), executors: [scriptedExecutor({ answer: [[{ id: "a", status: "open", urgency: 5 }]] })] });
    expect(good.outcome).toBe("complete");
    await replayed(good, root, store);
  });

  test("a delivered input fails its consumer with TYPE_MISMATCH before any effect", async () => {
    const root = parseOrganismManifest({
      contract: "algal.organism.v1", key: "organism:schema-v2-input", name: "Schema version 2 input",
      cells: [{ id: "input", kind: "input", outputs: { data: "json" } },
        { id: "consumer", kind: "agent", inputs: { data: { type: "json", schema, schemaVersion: 2 } }, prompt: "Must not activate.", output: { kind: "text" } }],
      edges: [{ from: { cell: "input", port: "data" }, to: { cell: "consumer", port: "data" } }],
    });
    const store = await install([]);
    const receipt = await runOrganism({ manifest: root, store, fns: builtinRegistry(), executors: [],
      args: { input: { data: [{ id: "a", status: "open", urgency: 1 }, { id: "b", status: "later", urgency: 1 }] } } });
    expect(receipt.failure).toEqual({ code: "TYPE_MISMATCH", message: "item 1: expected an allowed value", path: "consumer" });
    expect(receipt.effects).toEqual([]);
    await replayed(receipt, root, store);
  });

  test("expr results, root arguments, and each items use the declared version", async () => {
    const child = parseOrganismManifest({
      contract: "algal.organism.v1", key: "organism:schema-v2-child", name: "Child",
      interface: { inputs: { level: { cell: "input", port: "level" } }, outputs: { result: { cell: "result", port: "out" } } },
      cells: [{ id: "input", kind: "input", outputs: { level: { type: "json", schema: { type: "number", maximum: 3 }, schemaVersion: 2 } } },
        { id: "result", kind: "expr", inputs: { level: "json" }, expr: { contract: "algal.expr.v1", program: ["mul", ["get", "level"], 2] },
          output: { kind: "json", schema: { type: "number", maximum: 4 }, schemaVersion: 2 } }],
      edges: [{ from: { cell: "input", port: "level" }, to: { cell: "result", port: "level" } }],
    });
    const store = await install([child]);
    const direct = await runOrganism({ manifest: child, store, fns: builtinRegistry(), executors: [], args: { input: { level: 4 } } });
    expect(direct.failure).toEqual({ code: "TYPE_MISMATCH", message: "number above maximum", path: "input" });
    const result = await runOrganism({ manifest: child, store, fns: builtinRegistry(), executors: [], args: { input: { level: 3 } } });
    expect(result.failure).toEqual({ code: "TYPE_MISMATCH", message: "number above maximum", path: "result" });
    await replayed(result, child, store);
    const parent = parseOrganismManifest({
      contract: "algal.organism.v1", key: "organism:schema-v2-parent", name: "Parent",
      cells: [{ id: "input", kind: "input", outputs: { levels: "json" } },
        { id: "map", kind: "each", manifest: digestCanonical(manifestToJson(child)), over: "level", maxItems: 4 }],
      edges: [{ from: { cell: "input", port: "levels" }, to: { cell: "map", port: "level" } }],
    });
    const each = await runOrganism({ manifest: parent, store, fns: builtinRegistry(), executors: [], args: { input: { levels: [1, 2, 5] } } });
    expect(each.failure).toEqual({ code: "TYPE_MISMATCH", message: "number above maximum", path: "map" });
    expect(Object.keys(each.cells).filter(path => path.startsWith("map/i2"))).toEqual([]);
    await replayed(each, parent, store);
  });
});
