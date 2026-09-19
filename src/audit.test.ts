import { expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { canonicalize, type JsonObject, type JsonValue } from "./values";
import { digestCanonical, type Digest } from "./digest";
import { cachedExecutor, type EffectRequest } from "./effects";
import { commandJson } from "./io";
import { AlgalError } from "./errors";
import { FileStore, MemoryStore } from "./store";
import { manifestToJson, parseOrganismManifest } from "./contract";
import { packOrganism, unpackBundle } from "./bundle";
import { builtinRegistry } from "./registry";
import { runOrganism } from "./run";
import { verifyReceipt } from "./verify";
import { vercelGatewayExecutor } from "./gateway";
import type { ToolRegistry } from "./tools";

test("commands bound stderr and respect a pre-aborted launch", async () => {
  const overflow = commandJson([process.execPath, "-e", "process.stderr.write('x'.repeat(70000)); console.log('null')"], null);
  await expect(overflow).rejects.toBeInstanceOf(AlgalError);
  await expect(overflow).rejects.toMatchObject({ code: "BUDGET_EXHAUSTED", uncertain: true });
  const controller = new AbortController();
  controller.abort();
  const preAborted = commandJson(["missing-executable"], null, { signal: controller.signal });
  await expect(preAborted).rejects.toThrow("before launch");
  await expect(preAborted).rejects.toMatchObject({ code: "BUDGET_EXHAUSTED", uncertain: false });
});

test("command exit 75 asks the host to suspend; other nonzero exits fail", async () => {
  await expect(
    commandJson([process.execPath, "-e", "process.exit(75)"], null),
  ).rejects.toMatchObject({ code: "EFFECT_SUSPENDED" });
  await expect(
    commandJson([process.execPath, "-e", "process.exit(2)"], null),
  ).rejects.toMatchObject({ code: "EFFECT_FAILED" });
});

test("mutating executors are not blindly retried and their failure replays", async () => {
  const manifest = parseOrganismManifest({
    contract: "algal.organism.v1", key: "organism:no-retry", name: "No retry",
    cells: [{ id: "code", kind: "agent", inputs: {}, prompt: "task", output: { kind: "text" }, retry: { attempts: 2 } }],
  });
  let calls = 0;
  const store = new MemoryStore();
  const receipt = await runOrganism({
    manifest, store, fns: builtinRegistry(), executors: [{
      id: "coding-agent", retryable: false, cacheable: false,
      async execute() { calls++; throw new Error("unknown completion"); },
    }],
  });
  expect(calls).toBe(1);
  expect(receipt.effects).toHaveLength(1);
  expect(receipt.effects[0]?.retryable).toBe(false);
  expect((await verifyReceipt(receipt as unknown as JsonValue, manifestToJson(manifest), store)).ok).toBe(true);
});

const request: EffectRequest = {
  contract: "algal.effect.v1", cellId: "model", kind: "agent", prompt: "Answer",
  context: {}, output: { kind: "text" },
  budget: { maxContextBytes: 4096, maxOutputBytes: 4096 },
};

test("model cache identity survives a routing alias", async () => {
  const store = new MemoryStore();
  const one = { ...vercelGatewayExecutor({ model: "test/one", credential: "synthetic-credential", fetch: async () => Response.json({ choices: [{ message: { content: '{"value":"one"}' } }] }) }), id: "default" };
  const two = { ...vercelGatewayExecutor({ model: "test/two", credential: "synthetic-credential", fetch: async () => Response.json({ choices: [{ message: { content: '{"value":"two"}' } }] }) }), id: "default" };
  expect(await cachedExecutor(one, store).execute(request)).toBe("one");
  expect(await cachedExecutor(two, store).execute(request)).toBe("two");
});

test("invalid typed output is not memoized into a permanent retry failure", async () => {
  const manifest = parseOrganismManifest({
    contract: "algal.organism.v1", key: "organism:cache-retry", name: "Cache retry",
    cells: [{ id: "model", kind: "agent", inputs: {}, prompt: "answer", output: { kind: "text" }, retry: { attempts: 2 } }],
  });
  let calls = 0;
  const store = new MemoryStore();
  const executor = cachedExecutor({ id: "repair", execute: async () => ++calls === 1 ? 42 : "valid" }, store);
  const receipt = await runOrganism({ manifest, store, fns: builtinRegistry(), executors: [executor] });
  expect(receipt.outcome).toBe("complete");
  expect(calls).toBe(2);
});

test("missing tool receipts never cause verification to repeat live effects", async () => {
  let calls = 0;
  const tools: ToolRegistry = new Map([["read.v1", {
    signature: { inputs: {}, outputs: { value: { type: "json" } }, effect: "read", cost: 1, maxOutputBytes: 1024 },
    tool: async () => { calls++; return { value: "observed" }; },
  }]]);
  const manifest = parseOrganismManifest({ contract: "algal.organism.v1", key: "organism:offline-tool", name: "Offline tool", cells: [{ id: "read", kind: "tool", tool: "read.v1" }] });
  const store = new MemoryStore();
  const receipt = await runOrganism({ manifest, store, fns: builtinRegistry(), tools, executors: [] });
  expect(calls).toBe(1);
  const forged = { ...receipt, effects: [] };
  const result = await verifyReceipt(forged as unknown as JsonValue, manifestToJson(manifest), store, builtinRegistry(), undefined, tools);
  expect(result.ok).toBe(false);
  expect(calls).toBe(1);
});

test("canonicalization retains prototype-shaped own keys", () => {
  const value = JSON.parse('{"__proto__":{"evidence":true},"constructor":"data"}');
  expect(canonicalize(value)).toBe('{"__proto__":{"evidence":true},"constructor":"data"}');
  expect(digestCanonical(value)).not.toBe(digestCanonical({ constructor: "data" }));
});

test("memory stores isolate both submitted and returned objects", async () => {
  const store = new MemoryStore();
  const value = { answer: { n: 1 } };
  const digest = await store.putValue(value);
  value.answer.n = 2;
  expect(await store.getValue(digest)).toEqual({ answer: { n: 1 } });
  const read = await store.getValue(digest) as JsonObject;
  read.answer = null;
  expect(await store.getValue(digest)).toEqual({ answer: { n: 1 } });
});

test("model caches cannot cross executor identities", async () => {
  const store = new MemoryStore();
  let calls = 0;
  const one = cachedExecutor({ id: "provider:a", execute: async () => "a" }, store);
  const two = cachedExecutor({ id: "provider:b", execute: async () => { calls++; return "b"; } }, store);
  expect(await one.execute(request)).toBe("a");
  expect(await two.execute(request)).toBe("b");
  expect(await two.execute(request)).toBe("b");
  expect(calls).toBe(1);
});

test("file store validates SDK slot and digest paths", async () => {
  const dir = await mkdtemp(join(tmpdir(), "algal-paths-"));
  try {
    const store = new FileStore(dir);
    await expect(store.setSlot("../escaped", "no")).rejects.toThrow();
    await expect(store.getSlot("../escaped")).rejects.toThrow();
    await expect(store.getValue("sha256:../../escaped" as Digest)).rejects.toThrow();
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("rejected bundles write nothing to their destination store", async () => {
  const manifest = parseOrganismManifest({
    contract: "algal.organism.v1", key: "organism:audit", name: "Audit",
    cells: [{ id: "source", kind: "const", outputs: { value: { type: "json", value: 1 } } }],
  });
  const bundle = await packOrganism(manifest, new MemoryStore());
  bundle.values[digestCanonical("actual")] = "forged";
  const store = new MemoryStore();
  await expect(unpackBundle(bundle, store)).rejects.toThrow();
  expect(await store.getManifest(bundle.root)).toBeUndefined();
});

test("offline verification cannot rewind live slots", async () => {
  const manifest = parseOrganismManifest({
    contract: "algal.organism.v1", key: "organism:slot-audit", name: "Slot audit",
    cells: [
      { id: "source", kind: "const", outputs: { value: { type: "json", value: "old" } } },
      { id: "save", kind: "slot", name: "memory", mode: "write" },
    ],
    edges: [{ from: { cell: "source", port: "value" }, to: { cell: "save", port: "data" } }],
  });
  const store = new MemoryStore();
  const receipt = await runOrganism({ manifest, store, fns: builtinRegistry(), executors: [] });
  await store.setSlot("memory", "current");
  const verified = await verifyReceipt(receipt as unknown as JsonValue, manifestToJson(manifest), store);
  expect(verified.ok).toBe(true);
  expect(await store.getSlot("memory")).toBe("current");
});

test("HTTP response limits stop reading rather than buffer the whole body", async () => {
  let chunks = 0;
  let cancelled = false;
  const executor = vercelGatewayExecutor({
    model: "test/model", credential: "synthetic-test-credential", maxResponseBytes: 32,
    fetch: async () => new Response(new ReadableStream<Uint8Array>({
      pull(controller) {
        chunks++;
        if (chunks === 100) controller.close();
        else controller.enqueue(new Uint8Array(32));
      },
      cancel() { cancelled = true; },
    })),
  });
  const overflow = executor.execute(request);
  await expect(overflow).rejects.toBeInstanceOf(AlgalError);
  await expect(overflow).rejects.toMatchObject({ code: "BUDGET_EXHAUSTED", uncertain: true });
  expect(chunks).toBeLessThan(10);
  expect(cancelled).toBe(true);
});
