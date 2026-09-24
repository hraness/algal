import { afterEach, expect, test } from "bun:test";
import { BUNDLE_CONTRACT, packOrganism, parseBundle, unpackBundle, type Bundle } from "./bundle";
import { BOUNDS, manifestToJson, parseOrganismManifest, type OrganismManifest } from "./contract";
import { digestCanonical, type Digest } from "./digest";
import { MemoryStore } from "./store-memory";
import { canonicalBytes, canonicalize, type JsonValue } from "./values";

afterEach(() => { Bun.gc(true); });
const manifest = (name: string, cells: unknown[] = []): OrganismManifest => parseOrganismManifest({ contract: "algal.organism.v1", key: `organism:${name}`, name, cells });
function bundleFor(root: OrganismManifest, values: Record<Digest, JsonValue> = {}): Bundle {
  const json = manifestToJson(root), ref = digestCanonical(json);
  return { contract: BUNDLE_CONTRACT, root: ref, manifests: { [ref]: json }, values };
}
function nodes(value: JsonValue): number {
  if (value === null || typeof value !== "object") return 1;
  return 1 + Object.values(value).reduce<number>((sum, child) => sum + nodes(child), 0);
}
async function payloadFixture(value: JsonValue) {
  const source = new MemoryStore(), ref = await source.putValue(value);
  const root = manifest("payload", [{ id: "ref", kind: "const", outputs: { value: { type: "ref", value: ref } } }]);
  return { source, root, bundle: bundleFor(root, { [ref]: value }) };
}
async function refusedWithoutWrites(bundle: Bundle, code = "BUDGET_EXHAUSTED") {
  const destination = new MemoryStore();
  await expect(unpackBundle(bundle, destination)).rejects.toMatchObject({ code });
  expect(await destination.getManifest(bundle.root)).toBeUndefined();
}

for (const count of [511, 512, 513]) test(`producer admits at most 512 distinct values: ${count}`, async () => {
  class CountingStore extends MemoryStore {
    reads = 0;
    override getValue(ref: Digest) { this.reads++; return super.getValue(ref); }
  }
  const source = new CountingStore(), children: Digest[] = [];
  for (let start = 0; start < count; start += 64) {
    const cells = [];
    for (let index = start; index < Math.min(start + 64, count); index++) cells.push({ id: `v${index}`, kind: "const", outputs: { value: { type: "ref", value: await source.putValue(index) } } });
    children.push(await source.putManifest(manifest(`values-${start}`, cells)));
  }
  const root = manifest("values", [...children.map((ref, index) => ({ id: `child${index}`, kind: "organism", manifest: ref })), { id: "duplicate", kind: "const", outputs: { value: { type: "ref", value: digestCanonical(0) } } }]);
  if (count > 512) await expect(packOrganism(root, source)).rejects.toMatchObject({ code: "BUDGET_EXHAUSTED" });
  else {
    const bundle = await packOrganism(root, source);
    expect(Object.keys(parseBundle(bundle).values)).toHaveLength(count);
    expect(await unpackBundle(bundle, new MemoryStore())).toEqual({ manifests: children.length + 1, values: count });
  }
  expect(source.reads).toBe(Math.min(count, 512));
});

for (const namespace of ["manifests", "values"] as const) test(`parser stops ${namespace} at entry 513 before reading its value`, () => {
  const entries: Record<string, unknown> = {}; let reads = 0;
  for (let index = 0; index < 513; index++) Object.defineProperty(entries, `sha256:${index.toString(16).padStart(64, "0")}`, {
    enumerable: true, get() { reads++; if (index === 512) throw new Error("over-bound entry was read"); return null; },
  });
  const bundle = { ...bundleFor(manifest("bounded-entries")), [namespace]: entries };
  expect(() => parseBundle(bundle)).toThrow(`bundle.${namespace} exceeds 512 entries`);
  expect(reads).toBe(512);
});

test("duplicate references spend one value slot and one source read", async () => {
  class CountingStore extends MemoryStore {
    reads = 0;
    override getValue(ref: Digest) { this.reads++; return super.getValue(ref); }
  }
  const source = new CountingStore(), ref = await source.putValue({ stable: true });
  const child = await source.putManifest(manifest("shared", Array.from({ length: 64 }, (_, index) => ({ id: `v${index}`, kind: "const", outputs: { value: { type: "ref", value: ref } } }))));
  const root = manifest("duplicate", Array.from({ length: 64 }, (_, index) => ({ id: `child${index}`, kind: "organism", manifest: child })));
  const bundle = await packOrganism(root, source);
  expect(source.reads).toBe(1);
  expect(await unpackBundle(bundle, new MemoryStore())).toEqual({ manifests: 2, values: 1 });
});

for (const count of [511, 512, 513]) test(`manifest namespace boundary remains ${count}`, async () => {
  const source = new MemoryStore(); let identity = 0;
  async function tree(size: number): Promise<OrganismManifest> {
    const name = `tree-${identity++}`, cells = [], children = Math.min(64, size - 1); let remaining = size - 1;
    for (let index = 0; index < children; index++) {
      const childSize = Math.ceil(remaining / (children - index)); remaining -= childSize;
      cells.push({ id: `child${index}`, kind: "organism", manifest: await source.putManifest(await tree(childSize)) });
    }
    return manifest(name, cells);
  }
  const root = await tree(count);
  if (count > 512) await expect(packOrganism(root, source)).rejects.toMatchObject({ code: "BUDGET_EXHAUSTED" });
  else {
    const bundle = await packOrganism(root, source);
    expect(Object.keys(parseBundle(bundle).manifests)).toHaveLength(count);
    expect((await unpackBundle(bundle, new MemoryStore())).manifests).toBe(count);
  }
});

for (const depth of [61, 62, 63, 64]) test(`bundle wrapper consumes payload depth: ${depth}`, async () => {
  let value: JsonValue = null;
  for (let index = 0; index < depth; index++) value = [value];
  const { source, root, bundle } = await payloadFixture(value);
  if (depth <= 62) {
    expect(parseBundle(await packOrganism(root, source))).toEqual(bundle);
    expect(await unpackBundle(bundle, new MemoryStore())).toEqual({ manifests: 1, values: 1 });
  } else {
    await expect(packOrganism(root, source)).rejects.toMatchObject({ code: "BUDGET_EXHAUSTED" });
    expect(() => parseBundle(bundle)).toThrow("depth/node");
    await refusedWithoutWrites(bundle);
  }
});

for (const total of [999_999, 1_000_000, 1_000_001]) test(`whole-envelope node boundary ${total}`, async () => {
  const empty = await payloadFixture([]), count = total - nodes(empty.bundle as unknown as JsonValue);
  const { source, root, bundle } = await payloadFixture(Array(count).fill(null));
  expect(nodes(bundle as unknown as JsonValue)).toBe(total);
  if (total <= 1_000_000) {
    expect(parseBundle(await packOrganism(root, source)).root).toBe(bundle.root);
    expect(await unpackBundle(bundle, new MemoryStore())).toEqual({ manifests: 1, values: 1 });
  } else {
    await expect(packOrganism(root, source)).rejects.toMatchObject({ code: "BUDGET_EXHAUSTED" });
    await refusedWithoutWrites(bundle);
  }
}, 20_000);

for (const delta of [-1, 0, 1]) test(`exact canonical bundle byte boundary ${delta}`, async () => {
  // Bun SDK strings also exercise JSON.stringify's lone-surrogate escapes.
  // Native's matching wire-byte fixture uses admitted Unicode scalars only.
  const key = "é😀\"\\\n\u0001", prefix = "é😀\"\\\b\t\n\f\r\u0001\ud800x\udc00";
  const base = await payloadFixture({ [key]: [prefix, ""] });
  const count = BOUNDS.maxBundleBytes + delta - canonicalBytes(base.bundle as unknown as JsonValue);
  const { source, root, bundle } = await payloadFixture({ [key]: [prefix, "x".repeat(count)] });
  if (delta <= 0) {
    expect(parseBundle(await packOrganism(root, source)).root).toBe(bundle.root);
    expect(await unpackBundle(bundle, new MemoryStore())).toEqual({ manifests: 1, values: 1 });
  } else {
    await expect(packOrganism(root, source)).rejects.toMatchObject({ code: "BUDGET_EXHAUSTED" });
    await refusedWithoutWrites(bundle);
  }
}, 20_000);

for (const kind of ["nodes", "bytes"] as const) test(`normalized manifest expansion is admitted before writes: ${kind}`, async () => {
  const raw = { contract: "algal.organism.v1", key: "organism:compact", name: "compact", cells: [] };
  const normalized = manifestToJson(parseOrganismManifest(raw)), root = digestCanonical(normalized);
  const emptyValue: JsonValue = kind === "nodes" ? [] : "";
  const base = { contract: BUNDLE_CONTRACT, root, manifests: { [root]: raw }, values: { [digestCanonical(emptyValue)]: emptyValue } } as Bundle;
  const value: JsonValue = kind === "nodes" ? Array(1_000_000 - nodes(base as unknown as JsonValue)).fill(null) : "x".repeat(BOUNDS.maxBundleBytes - canonicalBytes(base as unknown as JsonValue));
  const bundle = { ...base, values: { [digestCanonical(value)]: value } };
  expect(parseBundle(bundle).root).toBe(root); // compact supplied representation fits exactly
  await refusedWithoutWrites(bundle); // normalized defaults exceed the same bound
}, 20_000);

test("logical sparse positions match serialization and cannot hide resources", async () => {
  const root = manifest("sparse"), small = Array(3) as JsonValue[];
  const bundle = bundleFor(root, { [digestCanonical(small)]: small });
  expect(canonicalize(parseBundle(bundle) as unknown as JsonValue)).toContain("[null,null,null]");
  expect(await unpackBundle(bundle, new MemoryStore())).toEqual({ manifests: 1, values: 1 });
  for (const shape of ["holes", "hidden", "inherited", "undefined"] as const) {
    const value: unknown[] = shape === "holes" ? Array(1_000_001) : Array(1);
    let nested: JsonValue = null; for (let index = 0; index < 64; index++) nested = [nested];
    if (shape === "hidden") Object.defineProperty(value, "0", { value: nested });
    if (shape === "inherited") Object.setPrototypeOf(value, Object.assign(Object.create(Array.prototype), { 0: nested }));
    if (shape === "undefined") value[0] = undefined;
    const bad = bundleFor(root, { [digestCanonical(null)]: value as JsonValue });
    await refusedWithoutWrites(bad, shape === "undefined" ? "PARSE_FAILED" : "BUDGET_EXHAUSTED");
  }
});

test("partial imports remain valid while pack requires missing static dependencies", async () => {
  const child = manifest("absent"), childRef = digestCanonical(manifestToJson(child)), valueRef = digestCanonical("absent");
  const root = manifest("partial", [{ id: "child", kind: "organism", manifest: childRef }, { id: "ref", kind: "const", outputs: { value: { type: "ref", value: valueRef } } }]);
  const bundle = bundleFor(root), destination = new MemoryStore();
  expect(await unpackBundle(bundle, destination)).toEqual({ manifests: 1, values: 0 });
  expect(await destination.getManifest(childRef)).toBeUndefined();
  expect(await destination.getValue(valueRef)).toBeUndefined();
  await expect(packOrganism(root, destination)).rejects.toMatchObject({ code: "STORE_MISS" });
  await destination.putManifest(child); await destination.putValue("absent");
  expect(await unpackBundle(bundle, destination)).toEqual({ manifests: 1, values: 0 });
  expect(await unpackBundle(await packOrganism(root, destination), new MemoryStore())).toEqual({ manifests: 2, values: 1 });
});
