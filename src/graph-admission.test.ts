import { expect, test } from "bun:test";
import { manifestToJson, parseOrganismManifest, type OrganismManifest, type PortMap } from "./contract";
import { type Digest } from "./digest";
import { argsForSubOrganism, COMPILE_BOUNDS, compileOrganism, outputPortType } from "./graph";
import { builtinRegistry } from "./registry";
import { runOrganism } from "./run";
import { MemoryStore } from "./store";
import { canonicalize, type JsonObject, type JsonValue } from "./values";
import { verifyReceipt } from "./verify";

class CountingStore extends MemoryStore {
  reads = 0;
  override async getManifest(digest: Digest) {
    this.reads++;
    return super.getManifest(digest);
  }
}
function module(name: string, cells: JsonValue[], edges: JsonValue[] = [], iface: JsonValue = { inputs: {}, outputs: {} }): OrganismManifest {
  return parseOrganismManifest({ contract: "algal.organism.v1", key: `organism:${name}`, name,
    cells, edges, interface: iface, budgets: { maxSteps: 1024, maxDepth: 8 } });
}
const constant = (id: string): JsonValue => ({ id, kind: "const", outputs: { out: { type: "text", value: "ok" } } });
const children = (digest: Digest, count: number): JsonValue[] => Array.from({ length: count }, (_, i) => ({ id: `child-${i}`, kind: "organism", manifest: digest }));
async function diamond(store: MemoryStore, levels: number): Promise<OrganismManifest> {
  let current = module("leaf", [constant("value")]);
  for (let i = 0; i < levels; i++) current = module(`level-${i}`, children(await store.putManifest(current), 2));
  return current;
}

test("a compact shared DAG is rejected within one shared compilation budget before runtime work", async () => {
  const store = new CountingStore();
  // Only twelve distinct manifests; an unchecked traversal expands 4095 instances.
  const manifest = await diamond(store, 11);
  await expect(compileOrganism(manifest, builtinRegistry(), store)).rejects.toMatchObject({ code: "BUDGET_EXHAUSTED" });
  expect(store.reads).toBe(COMPILE_BOUNDS.maxInstances);
  // An exhausted invocation cannot poison a later independent compilation.
  expect((await compileOrganism(module("later", [constant("v")]), builtinRegistry(), store)).children.size).toBe(0);
});

test("expanded cell admission counts repeated child occurrences before allocating them", async () => {
  const store = new CountingStore();
  const leaf = module("wide-leaf", Array.from({ length: 64 }, (_, i) => constant(`v-${i}`)));
  const ref = await store.putManifest(leaf);
  const empty = await store.putManifest(module("empty", []));
  const exact = module("exact-cells", [...children(ref, 63), { id: "last", kind: "organism", manifest: empty }]);
  expect((await compileOrganism(exact, builtinRegistry(), store)).children.size).toBe(64); // 64 + 63*64 = 4096
  await expect(compileOrganism(module("over-cells", children(ref, 64)), builtinRegistry(), store)).rejects.toMatchObject({ code: "BUDGET_EXHAUSTED" });
});

test("expanded edge admission bounds repeated dense but individually valid modules", async () => {
  const store = new MemoryStore();
  const cells: JsonValue[] = Array.from({ length: 16 }, (_, i) => constant(`source-${i}`));
  cells.push(...Array.from({ length: 16 }, (_, i) => ({ id: `join-${i}`, kind: "fn", fn: "join.v1" })));
  const edges: JsonValue[] = Array.from({ length: 256 }, (_, i) => ({ from: { cell: `source-${i % 16}`, port: "out" }, to: { cell: `join-${Math.floor(i / 16)}`, port: "items" } }));
  const ref = await store.putManifest(module("dense-leaf", cells, edges));
  const exact = module("exact-edges", children(ref, 64));
  expect((await compileOrganism(exact, builtinRegistry(), store)).children.size).toBe(64); // 64*256 = 16384
  const refExact = await store.putManifest(exact);
  await expect(compileOrganism(module("over-edges", [{ id: "all", kind: "organism", manifest: refExact }, { id: "extra", kind: "organism", manifest: ref }]), builtinRegistry(), store)).rejects.toMatchObject({ code: "BUDGET_EXHAUSTED" });
});

test("repeated large UTF-8 constants spend the expanded byte budget before count ceilings", async () => {
  const store = new CountingStore();
  const leaf = module("large-leaf", [{ id: "value", kind: "const", outputs: { out: { type: "text", value: "é".repeat(131_000) } } }]);
  const group = module("large-group", children(await store.putManifest(leaf), 64));
  const root = module("large-root", children(await store.putManifest(group), 5));
  await expect(compileOrganism(root, builtinRegistry(), store)).rejects.toMatchObject({ code: "BUDGET_EXHAUSTED", message: "expanded compilation manifest byte budget exceeded" });
  expect(store.reads).toBeLessThan(COMPILE_BOUNDS.maxInstances);
}, 20_000);

test("ordinary repeated children still execute and replay with unchanged receipts", async () => {
  const store = new MemoryStore();
  const manifest = await diamond(store, 3);
  const receipt = await runOrganism({ manifest, store, fns: builtinRegistry(), executors: [] });
  expect(receipt.outcome).toBe("complete");
  expect((await verifyReceipt(receipt as unknown as JsonValue, manifestToJson(manifest), store)).ok).toBe(true);
});

test("an undeclared constructor source output is rejected before execution", async () => {
  const manifest = module("missing-constructor", [constant("source"), { id: "sink", kind: "fn", fn: "echo.v1" }], [
    { from: { cell: "source", port: "constructor" }, to: { cell: "sink", port: "value" } },
  ]);
  await expect(compileOrganism(manifest, builtinRegistry(), new MemoryStore())).rejects.toMatchObject({ code: "MANIFEST_INVALID" });
});

test("output lookup ignores all inherited signature entries, not only constructor", () => {
  const cell = module("inherited-signature", [constant("source")]).cells[0]!;
  const outputs = Object.create({ inherited: { type: "json" } }) as PortMap;
  for (const port of ["constructor", "toString", "hasOwnProperty", "inherited"]) {
    expect(() => outputPortType(cell, port, { inputs: {}, outputs })).toThrow(`has no output port "${port}"`);
  }
});

test("undeclared constructor input and interface targets reject as missing ports", async () => {
  const missingInput = module("missing-input", [constant("source"), { id: "sink", kind: "fn", fn: "echo.v1" }], [
    { from: { cell: "source", port: "out" }, to: { cell: "sink", port: "constructor" } },
  ]);
  await expect(compileOrganism(missingInput, builtinRegistry(), new MemoryStore())).rejects.toMatchObject({ code: "MANIFEST_INVALID" });
  for (const direction of ["inputs", "outputs"] as const) {
    const iface = { inputs: {}, outputs: {}, [direction]: { exposed: { cell: "source", port: "constructor" } } };
    const manifest = module(`missing-interface-${direction}`, [{ id: "source", kind: "input", outputs: { value: "json" } }], [], iface);
    await expect(compileOrganism(manifest, builtinRegistry(), new MemoryStore())).rejects.toMatchObject({ code: "INTERFACE_MISMATCH" });
  }
});

test("repeat carry/until and each.over cannot name an inherited interface entry", async () => {
  const store = new MemoryStore();
  const sub = module("interface-source", [{ id: "input", kind: "input", outputs: { value: "text" } }], [], {
    inputs: { value: { cell: "input", port: "value" } }, outputs: { value: { cell: "input", port: "value" } },
  });
  const digest = await store.putManifest(sub);
  const cases: JsonValue[] = [
    { id: "loop", kind: "repeat", manifest: digest, maxRounds: 2, carry: { constructor: "value" } },
    { id: "loop", kind: "repeat", manifest: digest, maxRounds: 2, carry: { value: "constructor" } },
    { id: "loop", kind: "repeat", manifest: digest, maxRounds: 2, carry: { constructor: "constructor" } },
    { id: "loop", kind: "repeat", manifest: digest, maxRounds: 2, until: { output: "constructor", equals: "done" } },
    { id: "loop", kind: "each", manifest: digest, maxItems: 2, over: "constructor" },
  ];
  for (const cell of cases) await expect(compileOrganism(module("inherited-interface", [cell]), builtinRegistry(), store)).rejects.toMatchObject({ code: "INTERFACE_MISMATCH" });
});

test("agent view names require own declared inputs and ancestor outputs", async () => {
  const views: JsonValue[] = [{ inputs: ["constructor"] }, { inputs: "*", cells: [{ cell: "source", ports: ["constructor"] }] }];
  for (const view of views) {
    const manifest = module("inherited-view", [constant("source"), { id: "viewer", kind: "agent", inputs: { value: "text" }, prompt: "Read the value", output: { kind: "text" }, view }], [
      { from: { cell: "source", port: "out" }, to: { cell: "viewer", port: "value" } },
    ]);
    await expect(compileOrganism(manifest, builtinRegistry(), new MemoryStore())).rejects.toMatchObject({ code: "MANIFEST_INVALID" });
  }
});

test("an inherited transport name is not host configuration", async () => {
  const manifest = module("inherited-transport", [{ id: "child", kind: "organism", manifest: `sha256:${"0".repeat(64)}`, via: "constructor" }]);
  await expect(compileOrganism(manifest, builtinRegistry(), new MemoryStore(), 0, {})).rejects.toMatchObject({ code: "STORE_MISS" });
});

test("missing constructor arguments remain absent at both cell and interface boundaries", async () => {
  const manifest = module("missing-arguments", [{ id: "constructor", kind: "input", outputs: { name: "text", constructor: "json" } }], [], {
    inputs: { constructor: { cell: "constructor", port: "constructor" } }, outputs: { constructor: { cell: "constructor", port: "constructor" } },
  });
  expect(argsForSubOrganism(manifest, {})).toEqual({});
  expect(argsForSubOrganism(manifest, { constructor: "own" })).toEqual({ constructor: { constructor: "own" } });
  const store = new MemoryStore();
  const receipt = await runOrganism({ manifest, args: {}, store, fns: builtinRegistry(), executors: [] });
  expect(receipt.outcome).toBe("complete");
  expect(receipt.cells["constructor"]!.outputs).toBeUndefined();
  expect((await verifyReceipt(receipt as unknown as JsonValue, manifestToJson(manifest), store)).ok).toBe(true);
});

test("nested input aliases map in canonical key order and replay after manifest serialization", async () => {
  const store = new MemoryStore(), fns = builtinRegistry();
  const sub = module("aliased-child", [{ id: "input", kind: "input", outputs: { value: "json" } }], [], {
    inputs: Object.fromEntries([["z", { cell: "input", port: "value" }], ["a", { cell: "input", port: "value" }]]),
    outputs: { answer: { cell: "input", port: "value" } },
  });
  expect(argsForSubOrganism(sub, { a: "a", z: "z" })).toEqual({ input: { value: "z" } });
  const manifest = module("aliased-parent", [
    { id: "source", kind: "const", outputs: { a: { type: "json", value: "a" }, z: { type: "json", value: "z" } } },
    { id: "child", kind: "organism", manifest: await store.putManifest(sub) },
  ], [
    { from: { cell: "source", port: "a" }, to: { cell: "child", port: "a" } },
    { from: { cell: "source", port: "z" }, to: { cell: "child", port: "z" } },
  ]);
  const receipt = await runOrganism({ manifest, store, fns, executors: [] });
  expect(receipt.outcome).toBe("complete");
  expect(receipt.cells.child!.outputs!.answer).toBe("z");
  // Canonical serialization changes insertion order but not manifest identity.
  await store.putManifest(parseOrganismManifest(JSON.parse(canonicalize(manifestToJson(sub)))));
  expect((await verifyReceipt(receipt as unknown as JsonValue, manifestToJson(manifest), store, fns)).mismatches).toEqual([]);
});

test("host functions cannot produce an undeclared constructor output", async () => {
  const fns = builtinRegistry();
  fns.set("extra-output.v1", { signature: { inputs: {}, outputs: { value: { type: "json" } }, cost: 0 }, fn: () => ({ constructor: "undeclared" }) });
  const manifest = module("extra-output", [{ id: "producer", kind: "fn", fn: "extra-output.v1" }]);
  const store = new MemoryStore();
  const receipt = await runOrganism({ manifest, store, fns, executors: [] });
  expect(receipt.outcome).toBe("failed");
  expect(receipt.failure?.code).toBe("TYPE_MISMATCH");
  expect(receipt.failure?.message).toContain('undeclared output "constructor"');
  expect((await verifyReceipt(receipt as unknown as JsonValue, manifestToJson(manifest), store, fns)).ok).toBe(true);
});

test("declared optional constructor inputs and missing outputs stay absent", async () => {
  const fns = builtinRegistry();
  fns.set("missing-output.v1", { signature: { inputs: { constructor: { type: "json" as const, optional: true } }, outputs: { constructor: { type: "json" as const } }, cost: 0 }, fn: inputs => {
    expect(Object.hasOwn(inputs, "constructor")).toBe(false);
    return {};
  } });
  const manifest = module("missing-output", [{ id: "producer", kind: "fn", fn: "missing-output.v1" }]);
  const store = new MemoryStore();
  const receipt = await runOrganism({ manifest, store, fns, executors: [] });
  expect(receipt.outcome).toBe("complete");
  expect(receipt.cells.producer!.outputs).toBeUndefined();
  expect((await verifyReceipt(receipt as unknown as JsonValue, manifestToJson(manifest), store, fns)).ok).toBe(true);
});

test("declared constructor ports and interfaces preserve own __proto__ JSON data through replay", async () => {
  const store = new MemoryStore();
  const sub = module("constructor-child", [{ id: "constructor", kind: "input", outputs: { constructor: "json" } }], [], {
    inputs: { constructor: { cell: "constructor", port: "constructor" } }, outputs: { constructor: { cell: "constructor", port: "constructor" } },
  });
  const data = JSON.parse('{"__proto__":{"evidence":true},"constructor":"own-data"}') as JsonObject;
  const manifest = module("constructor-parent", [
    { id: "source", kind: "const", outputs: { constructor: { type: "json", value: data } } },
    { id: "constructor", kind: "organism", manifest: await store.putManifest(sub) },
  ], [{ from: { cell: "source", port: "constructor" }, to: { cell: "constructor", port: "constructor" } }], {
    inputs: {}, outputs: { constructor: { cell: "constructor", port: "constructor" } },
  });
  const receipt = await runOrganism({ manifest, store, fns: builtinRegistry(), executors: [] });
  expect(receipt.outcome).toBe("complete");
  const value = receipt.cells["constructor"]!.outputs!["constructor"]!;
  expect(value).toEqual(data);
  expect(typeof value === "object" && value !== null && Object.hasOwn(value, "__proto__")).toBe(true);
  expect((await verifyReceipt(receipt as unknown as JsonValue, manifestToJson(manifest), store)).ok).toBe(true);
});

test("prototype member names outside the port grammar remain invalid identifiers", () => {
  for (const port of ["__proto__", "toString", "hasOwnProperty"]) {
    expect(() => module("invalid-port", [{ id: "source", kind: "input", outputs: { [port]: "json" } }])).toThrow("lowercase kebab-case id");
  }
});
