import { expect, test } from "bun:test";
import { manifestToJson, parseOrganismManifest, type OrganismManifest } from "./contract";
import { type Digest } from "./digest";
import { COMPILE_BOUNDS, compileOrganism } from "./graph";
import { builtinRegistry } from "./registry";
import { runOrganism } from "./run";
import { MemoryStore } from "./store";
import { type JsonValue } from "./values";
import { verifyReceipt } from "./verify";

class CountingStore extends MemoryStore {
  reads = 0;
  override async getManifest(digest: Digest) {
    this.reads++;
    return super.getManifest(digest);
  }
}
function module(name: string, cells: JsonValue[], edges: JsonValue[] = []): OrganismManifest {
  return parseOrganismManifest({ contract: "algal.organism.v1", key: `organism:${name}`, name,
    cells, edges, interface: { inputs: {}, outputs: {} }, budgets: { maxSteps: 1024, maxDepth: 8 } });
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
