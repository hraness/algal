import { afterEach, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { manifestToJson, parseOrganismManifest, type OrganismManifest } from "./contract";
import { AlgalError } from "./errors";
import { builtinRegistry } from "./registry";
import { parseRunReceipt, RECEIPT_BOUNDS, receiptDigest, runOrganism, type RunReceipt } from "./run";
import { FileStore, MemoryStore } from "./store";
import type { JsonValue } from "./values";
import { verifyReceipt } from "./verify";

const roots: string[] = [];
afterEach(async () => { await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))); });

function inputs(ids: string[]): OrganismManifest {
  return parseOrganismManifest({
    contract: "algal.organism.v1", key: "organism:receipt-closure", name: "Receipt closure",
    cells: ids.map(id => ({ id, kind: "input", outputs: { value: "json" } })), edges: [],
  });
}

async function readable(receipt: RunReceipt, manifest: OrganismManifest, memory: MemoryStore): Promise<void> {
  expect(parseRunReceipt(receipt)).toBe(receipt);
  expect(receiptDigest(receipt)).toBe(receipt.digest);
  const root = await mkdtemp(join(tmpdir(), "algal-receipt-closure-"));
  roots.push(root);
  const file = new FileStore(root);
  const key = await file.putReceipt(receipt as unknown as JsonValue);
  const reopened = parseRunReceipt(await file.getReceipt(key));
  expect(reopened.digest).toBe(receipt.digest);
  expect(receiptDigest(reopened)).toBe(receipt.digest);
  expect((await verifyReceipt(reopened as unknown as JsonValue, manifestToJson(manifest), memory)).ok).toBe(true);
}

for (const depth of [59, 60, 61, 62]) {
  test(`run producer admits the receipt wrapper at input depth ${depth}`, async () => {
    let value: JsonValue = null;
    for (let i = 0; i < depth; i++) value = [value];
    const manifest = inputs(["source"]), store = new MemoryStore();
    const result = runOrganism({ manifest, args: { source: { value } }, store, fns: builtinRegistry(), executors: [] });
    if (depth > 60) {
      await expect(result).rejects.toMatchObject({ code: "BUDGET_EXHAUSTED", message: "receipt structural bounds exceeded" });
    } else {
      const receipt = await result;
      expect(receipt.outcome).toBe("complete");
      await readable(receipt, manifest, store);
    }
  });
}

for (const count of [124_990, 125_000, 130_000]) {
  test(`run producer counts duplicated args and cell outputs: ${count} elements per input`, async () => {
    const ids = ["a", "b", "c", "d"], manifest = inputs(ids), store = new MemoryStore();
    const args = Object.fromEntries(ids.map(id => [id, { value: Array(count).fill(0) as JsonValue }]));
    const result = runOrganism({ manifest, args, store, fns: builtinRegistry(), executors: [] });
    if (count >= 125_000) {
      await expect(result).rejects.toMatchObject({ code: "BUDGET_EXHAUSTED" });
    } else {
      const receipt = await result;
      expect(receipt.outcome).toBe("complete");
      await readable(receipt, manifest, store);
    }
  }, 20_000);
}

// Independent fixture measurement, including root, containers and digest.
function nodes(value: unknown): number {
  const pending = [value];
  let count = 0;
  while (pending.length) {
    const current = pending.pop();
    count++;
    if (current !== null && typeof current === "object") {
      for (const child of Object.values(current)) pending.push(child);
    }
  }
  return count;
}

test("whole receipt admits exactly one million nodes and rejects the next; foreign errors stay parse failures", async () => {
  const ids = ["a", "b", "c", "d"], manifest = inputs(ids), store = new MemoryStore();
  const args: Record<string, Record<string, JsonValue>> = Object.fromEntries(ids.map(id => [id, { value: Array(124_990).fill(0) }]));
  const run = () => runOrganism({ manifest, args, store, fns: builtinRegistry(), executors: [] });
  const base = await run();
  const padding = RECEIPT_BOUNDS.maxNodes - nodes(base) - 2;
  expect(padding).toBeGreaterThanOrEqual(0);
  args.unused = { value: Array(padding).fill(0) };
  const exact = await run();
  expect(nodes(exact)).toBe(1_000_000);
  await readable(exact, manifest, store);
  const foreign = structuredClone(exact);
  (foreign.args.unused!.value as JsonValue[]).push(0);
  (args.unused.value as JsonValue[]).push(0);
  await expect(run()).rejects.toMatchObject({ code: "BUDGET_EXHAUSTED" });
  expect(() => parseRunReceipt(foreign)).toThrow(expect.objectContaining({ code: "PARSE_FAILED" }));
}, 20_000);

for (const outcome of ["failed", "suspended"] as const) {
  test(`${outcome} receipts also satisfy reader/store/replay admission`, async () => {
    const manifest = parseOrganismManifest({
      contract: "algal.organism.v1", key: "organism:receipt-closure", name: "Receipt closure",
      cells: [{ id: "agent", kind: "agent", prompt: "fixture", output: { kind: "text" } }], edges: [],
    });
    const store = new MemoryStore();
    const receipt = await runOrganism({ manifest, store, fns: builtinRegistry(), executors: [{
      id: "fixture", capabilities: { effects: ["agent"] },
      async execute() { throw new AlgalError(outcome === "suspended" ? "EFFECT_SUSPENDED" : "EFFECT_FAILED", "fixture"); },
    }] });
    expect(receipt.outcome).toBe(outcome);
    await readable(receipt, manifest, store);
  });
}

for (const shape of ["sparse", "hidden-index", "inherited-index", "undefined-index"] as const) {
  test(`producer counts serialized ${shape} array positions after an effect returns`, async () => {
    let output: JsonValue[];
    if (shape === "sparse") output = Array(1_000_001);
    else if (shape === "undefined-index") output = [undefined as unknown as JsonValue];
    else {
      let value: JsonValue = null;
      for (let i = 0; i < 62; i++) value = [value];
      output = Array(1);
      if (shape === "hidden-index") Object.defineProperty(output, "0", { value, enumerable: false });
      else {
        const prototype = Object.create(Array.prototype);
        Object.defineProperty(prototype, "0", { value, enumerable: false });
        Object.setPrototypeOf(output, prototype);
      }
    }
    expect(Object.keys(output)).toHaveLength(shape === "undefined-index" ? 1 : 0);
    const manifest = parseOrganismManifest({
      contract: "algal.organism.v1", key: "organism:receipt-closure", name: "Receipt closure",
      cells: [{ id: "agent", kind: "agent", prompt: "fixture", output: { kind: "json", schema: { type: "array" } } }], edges: [],
    });
    let calls = 0;
    await expect(runOrganism({ manifest, store: new MemoryStore(), fns: builtinRegistry(), executors: [{
      id: "fixture", capabilities: { effects: ["agent"] },
      async execute() { calls++; return output; },
    }] })).rejects.toMatchObject({ code: "BUDGET_EXHAUSTED" });
    // This is final return admission, not a claim of pre-dispatch reservation.
    expect(calls).toBe(1);
  });
}

test("small sparse effect output counts its null serialization and remains replayable", async () => {
  const manifest = parseOrganismManifest({
    contract: "algal.organism.v1", key: "organism:receipt-closure", name: "Receipt closure",
    cells: [{ id: "agent", kind: "agent", prompt: "fixture", output: { kind: "json", schema: { type: "array" } } }], edges: [],
  });
  const store = new MemoryStore();
  const receipt = await runOrganism({ manifest, store, fns: builtinRegistry(), executors: [{
    id: "fixture", capabilities: { effects: ["agent"] },
    async execute() { return Array(2); },
  }] });
  expect(receipt.outcome).toBe("complete");
  const reparsed = parseRunReceipt(JSON.parse(JSON.stringify(receipt)));
  expect(reparsed.effects[0]?.output).toEqual([null, null]);
  expect(receiptDigest(reparsed)).toBe(receipt.digest);
  await readable(receipt, manifest, store);
});
