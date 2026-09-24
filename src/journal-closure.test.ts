import { afterEach, expect, test } from "bun:test";
import { mkdtemp, readFile, readdir, realpath, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseOrganismManifest } from "./contract";
import { digestCanonical } from "./digest";
import { withDurableFsProbe } from "./durable-fs";
import { cachedExecutor, effectRequestDigest, replayExecutor, type EffectReceipt, type EffectRequest, type Executor } from "./effects";
import { AlgalError } from "./errors";
import { hostRead, hostWrite } from "./host-state";
import { ProcessSupervisor } from "./process";
import { ProcessJournal, type JournalBinding, type RuntimeJournal } from "./process-journal";
import { builtinRegistry } from "./registry";
import { runOrganism } from "./run";
import { FileStore, MemoryStore } from "./store";
import type { ToolRegistry } from "./tools";
import { canonicalize, type JsonValue } from "./values";

const directories: string[] = [];
afterEach(async () => { for (const root of directories.splice(0)) await rm(root, { recursive: true, force: true }); });
async function directory() { const root = await realpath(await mkdtemp(join(tmpdir(), "algal-journal-closure-"))); directories.push(root); return root; }
const intent = digestCanonical("closure-intent"), manifestDigest = digestCanonical("closure-manifest");
const binding: JournalBinding = { requestDigest: digestCanonical("closure-request"), executor: "closure", configurationDigest: digestCanonical("closure-configuration"), idempotencyKey: digestCanonical("closure-idempotency"), recovery: "never" };
function nodes(value: unknown): number { let count = 1; if (value !== null && typeof value === "object") for (const child of Object.values(value)) count += nodes(child); return count; }
function nested(depth: number): JsonValue { let value: JsonValue = 0; for (let i = 0; i < depth; i++) value = [value]; return value; }

test("host writes and fresh reads have identical exact node and depth boundaries", async () => {
  const root = await directory();
  for (const [name, value, admitted] of [
    ["nodes-at", Array(99_999).fill(0), true], ["nodes-over", Array(100_000).fill(0), false],
    ["depth-at", nested(64), true], ["depth-over", nested(65), false],
  ] as const) {
    const path = join(root, name);
    if (admitted) { await hostWrite(path, value, 1_048_576); expect(await hostRead(path, 1_048_576)).toEqual(value); }
    else { await expect(hostWrite(path, value, 1_048_576)).rejects.toMatchObject({ code: "BUDGET_EXHAUSTED", uncertain: false }); expect(await hostRead(path, 1_048_576)).toBeUndefined(); }
  }
});

test("host admission counts sparse slots as serialized nulls and rejects explicit undefined", async () => {
  const root = await directory(), at = join(root, "sparse-at");
  await hostWrite(at, Array(99_999), 1_048_576);
  expect(await hostRead(at, 1_048_576)).toEqual(Array(99_999).fill(null));
  for (const length of [100_000, 0xffff_ffff]) {
    const path = join(root, `sparse-over-${length}`);
    await expect(hostWrite(path, Array(length), 1_048_576)).rejects.toMatchObject({ code: "BUDGET_EXHAUSTED", uncertain: false });
    expect(await hostRead(path, 1_048_576)).toBeUndefined();
  }
  await expect(hostWrite(join(root, "undefined"), [undefined] as unknown as JsonValue, 1_048_576)).rejects.toMatchObject({ code: "PARSE_FAILED", uncertain: false });
  expect(await hostRead(join(root, "undefined"), 1_048_576)).toBeUndefined();
});

for (const sparse of [false, true]) test.each([0, 1])(`prospective journal record counts its wrapper at the host node boundary +%i (sparse ${sparse})`, async extra => {
  const root = await directory(), journal = await ProcessJournal.create(root, "actor", intent, manifestDigest);
  const ticket = await journal.before(binding);
  const started = (journal.describe() as { effects: { record: JsonValue }[] }).effects[0]!.record;
  const receipt: EffectReceipt = { requestDigest: binding.requestDigest, executor: binding.executor, output: [] };
  const wrapped = { ...(started as object), state: "completed", previous: ticket.token!, receipt };
  receipt.output = Array(100_000 - nodes(wrapped) + extra);
  if (!sparse) receipt.output.fill(0);
  expect(nodes(JSON.parse(canonicalize(wrapped as JsonValue)))).toBe(100_000 + extra);
  const path = join(root, "processes/actor/journals", intent.slice(7), "entries/000000.json");
  const before = await readFile(path, "utf8"), values = (await readdir(join(root, "values"))).sort();
  if (extra) {
    await expect(journal.after(ticket.token!, receipt)).rejects.toMatchObject({ code: "BUDGET_EXHAUSTED" });
    expect(await readFile(path, "utf8")).toBe(before);
    expect((await readdir(join(root, "values"))).sort()).toEqual(values);
    const reopened = await ProcessJournal.open(root, "actor", intent, manifestDigest);
    expect(reopened.describe()).toMatchObject({ effects: [{ record: { state: "started", recovery: "never" } }] });
    await expect(reopened.beginRecovery()).rejects.toThrow("unknown completion");
  } else {
    await journal.after(ticket.token!, receipt); journal.assertComplete();
    const reopened = await ProcessJournal.open(root, "actor", intent, manifestDigest);
    await reopened.beginRecovery(); expect(canonicalize((await reopened.before(binding)).receipt as unknown as JsonValue)).toBe(canonicalize(receipt as unknown as JsonValue)); reopened.assertComplete();
  }
});

test.each([62, 63])("journal completion checks full record depth for output depth %i", async depth => {
  const root = await directory(), journal = await ProcessJournal.create(root, "actor", intent, manifestDigest);
  const ticket = await journal.before(binding);
  const receipt: EffectReceipt = { requestDigest: binding.requestDigest, executor: binding.executor, output: nested(depth) };
  if (depth === 62) {
    await journal.after(ticket.token!, receipt);
    const reopened = await ProcessJournal.open(root, "actor", intent, manifestDigest);
    await reopened.beginRecovery(); expect((await reopened.before(binding)).receipt).toEqual(receipt);
  } else {
    await expect(journal.after(ticket.token!, receipt)).rejects.toMatchObject({ code: "BUDGET_EXHAUSTED" });
    const reopened = await ProcessJournal.open(root, "actor", intent, manifestDigest);
    expect(reopened.describe()).toMatchObject({ effects: [{ record: { state: "started" } }] });
  }
});

test.each(["structure", "sparse", "publication"] as const)("a real write with rejected journal %s keeps started evidence and blocks fallback", async mode => {
  const root = await directory(), store = new FileStore(root);
  let calls = 0, fallbacks = 0, dispatched = false, cutReached = false;
  const original = new AlgalError("IO_FAILED", "completion publication cut", { operation: "completion", marker: 7 });
  const tools: ToolRegistry = new Map([
    ["prefix.v1", { signature: { inputs: {}, outputs: { value: { type: "text" } }, effect: "write", cost: 1, maxOutputBytes: 256 }, configurationDigest: binding.configurationDigest,
      tool: async () => { await store.setSlot("prefix-count", 1); return { value: "prefix" }; } }],
    ["record.v1", { signature: { inputs: {}, outputs: { value: { type: "json" } }, effect: "write", cost: 1, maxOutputBytes: 262_144 }, configurationDigest: binding.configurationDigest,
      tool: async () => { calls++; await store.setSlot("effect-count", calls); dispatched = true; return { value: mode === "structure" ? Array(100_001).fill(0) : mode === "sparse" ? Array(100_001) : "written" }; } }],
    ["fallback.v1", { signature: { inputs: { error: { type: "json" } }, outputs: { value: { type: "text" } }, effect: "write", cost: 1, maxOutputBytes: 256 }, configurationDigest: binding.configurationDigest,
      tool: async () => { fallbacks++; return { value: "fallback" }; } }],
  ]);
  const vm = new ProcessSupervisor(root, { tools, journal: true });
  await vm.create("actor", parseOrganismManifest({ contract: "algal.organism.v1", key: "organism:journal-closure", name: "journal closure",
    cells: [{ id: "prefix", kind: "tool", tool: "prefix.v1" }, { id: "produce", kind: "tool", tool: "record.v1" }, { id: "fallback", kind: "tool", tool: "fallback.v1" }],
    edges: [{ from: { cell: "produce", port: "value" }, to: { cell: "fallback", port: "error" }, on: "fail" }],
  }), {});
  const result = await withDurableFsProbe(event => {
    if (mode === "publication" && dispatched && event.step === "link" && event.phase === "before" && event.target?.startsWith(join(root, "values") + "/")) { cutReached = true; throw original; }
  }, () => vm.tick("actor")).then(value => ({ value }), error => ({ error }));
  expect(result).toMatchObject({ error: { code: mode === "publication" ? "IO_FAILED" : "BUDGET_EXHAUSTED", uncertain: true } });
  if (mode === "publication") { expect(cutReached).toBe(true); expect(result).toMatchObject({ error: { message: original.message, details: original.details } }); }
  const after = await vm.inspect("actor"), journal = await vm.journal("actor");
  expect(after.process.status).toBe("uncertain"); expect(after.process.receipt).toBeUndefined();
  expect(journal).toMatchObject({ effects: [
    { record: { state: "completed", receipt: { output: { value: "prefix" } } } },
    { record: { state: "started", recovery: "never" } },
  ] });
  const record = (journal as { effects: { record: Record<string, unknown> }[] }).effects[1]!.record;
  expect(record.receipt).toBeUndefined();
  await expect(new ProcessSupervisor(root, { tools, journal: true }).recover("actor", after.digest)).rejects.toThrow("unknown completion");
  expect((await vm.inspect("actor")).digest).toBe(after.digest); expect(await vm.journal("actor")).toEqual(journal);
  expect(await store.getSlot("effect-count")).toBe(1); expect(calls).toBe(1); expect(fallbacks).toBe(0);
  expect(await store.getSlot("prefix-count")).toBe(1);
});

function refusingJournal(mode: "before" | "after" | "replay", receipt?: EffectReceipt) {
  let poisoned: unknown, before = 0, after = 0;
  const failure = new AlgalError("IO_FAILED", "journal admission refused", { marker: "preserved" });
  const journal: RuntimeJournal = {
    before: async () => { before++; if (mode === "before") throw failure; return mode === "replay" ? { receipt: receipt! } : { token: intent }; },
    after: async () => { after++; throw failure; },
    assertHealthy: () => { if (poisoned) throw poisoned; }, poison: error => { poisoned ??= error; },
  };
  return { journal, failure, counts: () => ({ before, after }) };
}

test.each(["before", "live", "cached", "replay"] as const)("provider journal refusal preserves the %s dispatch distinction", async mode => {
  let calls = 0;
  const executor: Executor = { id: "fixture", cacheIdentity: binding.configurationDigest, execute: async () => { calls++; return "answer"; },
    ...(mode === "cached" ? { executeEffect: async () => ({ output: "answer", metadata: { cached: true } }) } : {}) };
  const manifest = parseOrganismManifest({ contract: "algal.organism.v1", key: "organism:provider-closure", name: "provider closure", cells: [{ id: "answer", kind: "agent", prompt: "answer", output: { kind: "text" } }], edges: [] });
  const baseline = mode === "replay" ? await runOrganism({ manifest, store: new MemoryStore(), fns: builtinRegistry(), executors: [executor] }) : undefined;
  calls = 0;
  const fixture = refusingJournal(mode === "before" ? "before" : mode === "replay" ? "replay" : "after", baseline?.effects[0]);
  const result = await runOrganism({ manifest, store: new MemoryStore(), fns: builtinRegistry(), executors: [executor], journal: fixture.journal }).then(value => ({ value }), error => ({ error }));
  if (mode === "replay") { expect(result).toMatchObject({ value: { outcome: "complete" } }); expect(fixture.counts()).toEqual({ before: 1, after: 0 }); }
  else {
    expect(result).toMatchObject({ error: { code: fixture.failure.code, message: fixture.failure.message, details: fixture.failure.details, uncertain: mode === "live" } });
    expect(fixture.counts()).toEqual({ before: 1, after: mode === "before" ? 0 : 1 });
  }
  expect(calls).toBe(mode === "live" ? 1 : 0);
});

test("explicit replay executor bypasses journal completion even without cached metadata", async () => {
  const manifest = parseOrganismManifest({ contract: "algal.organism.v1", key: "organism:replay-closure", name: "replay closure", cells: [{ id: "answer", kind: "agent", prompt: "answer", output: { kind: "text" } }], edges: [] });
  const receipt = await runOrganism({ manifest, store: new MemoryStore(), fns: builtinRegistry(), executors: [{ id: "fixture", execute: async () => "answer" }] });
  expect(receipt.effects[0]?.cached).toBeUndefined();
  const fixture = refusingJournal("after");
  const replay = await runOrganism({ manifest, store: new MemoryStore(), fns: builtinRegistry(), executors: [replayExecutor(receipt.effects)], journal: fixture.journal });
  expect(replay).toEqual(receipt); expect(fixture.counts()).toEqual({ before: 0, after: 0 });
});

test("cache publication failure after a live provider result preserves uncertainty and started intent", async () => {
  const root = await directory(), journal = await ProcessJournal.create(root, "actor", intent, manifestDigest);
  let calls = 0;
  const cause = new AlgalError("IO_FAILED", "cache publication cut", { cache: "owned" });
  const store = new MemoryStore(); store.putEffect = async () => { throw cause; };
  const executor = cachedExecutor({ id: "fixture", cacheIdentity: binding.configurationDigest, execute: async () => { calls++; return "answer"; } }, store);
  const manifest = parseOrganismManifest({ contract: "algal.organism.v1", key: "organism:cache-closure", name: "cache closure", cells: [{ id: "answer", kind: "agent", prompt: "answer", output: { kind: "text" } }], edges: [] });
  await expect(runOrganism({ manifest, store, fns: builtinRegistry(), executors: [executor], journal })).rejects.toMatchObject({ code: cause.code, message: cause.message, details: cause.details, uncertain: true });
  expect(calls).toBe(1);
  const reopened = await ProcessJournal.open(root, "actor", intent, manifestDigest);
  expect(reopened.describe()).toMatchObject({ effects: [{ record: { state: "started", recovery: "never" } }] });
  await expect(reopened.beginRecovery()).rejects.toThrow("unknown completion");
  expect(calls).toBe(1);
});

test("cache encoding failure after a live result retains the started journal instead of recording a replacement error", async () => {
  const root = await directory(), journal = await ProcessJournal.create(root, "actor", intent, manifestDigest);
  let calls = 0;
  // Finite JSON from the adapter, beyond the recursive cache encoder's stack
  // capacity. It must not replace the returned output with a settled error.
  const output = nested(100_000), store = new MemoryStore();
  const executor = cachedExecutor({ id: "fixture", cacheIdentity: binding.configurationDigest, execute: async () => { calls++; return output; } }, store);
  const manifest = parseOrganismManifest({ contract: "algal.organism.v1", key: "organism:cache-encoding", name: "cache encoding", cells: [{ id: "answer", kind: "agent", prompt: "answer", output: { kind: "json", schema: {} } }], edges: [] });
  await expect(runOrganism({ manifest, store, fns: builtinRegistry(), executors: [executor], journal })).rejects.toMatchObject({ uncertain: true });
  expect(calls).toBe(1);
  const reopened = await ProcessJournal.open(root, "actor", intent, manifestDigest);
  expect(reopened.describe()).toMatchObject({ effects: [{ record: { state: "started", recovery: "never" } }] });
  await expect(reopened.beginRecovery()).rejects.toThrow("unknown completion");
  expect(calls).toBe(1);
});

test("a cache miss after prefetched cache metadata still marks live completion refusal uncertain", async () => {
  let lookups = 0, calls = 0;
  const store = new MemoryStore();
  store.getEffect = async requestDigest => ++lookups === 1 ? { requestDigest, executor: "fixture", output: "prefetched" } : undefined;
  const executor = cachedExecutor({ id: "fixture", cacheIdentity: binding.configurationDigest, execute: async () => { calls++; return "live"; } }, store);
  const fixture = refusingJournal("after");
  const manifest = parseOrganismManifest({ contract: "algal.organism.v1", key: "organism:cache-miss", name: "cache miss", cells: [{ id: "answer", kind: "agent", prompt: "answer", output: { kind: "text" } }], edges: [] });
  await expect(runOrganism({ manifest, store, fns: builtinRegistry(), executors: [executor], journal: fixture.journal })).rejects.toMatchObject({ code: "IO_FAILED", uncertain: true });
  expect(calls).toBe(1); expect(lookups).toBe(2);
});

test.each(["live-error", "lookup-error", "metadata-error", "cached-publication-error"] as const)("prefetched cache metadata cannot classify a later %s invocation", async mode => {
  let lookups = 0, calls = 0, metadataCalls = 0;
  const store = new MemoryStore();
  store.getEffect = async requestDigest => {
    if (++lookups === 1) return { requestDigest, executor: "fixture", output: "prefetched" };
    if (mode === "lookup-error") throw new AlgalError("IO_FAILED", "cache lookup cut");
    return undefined;
  };
  store.putEffect = async () => { throw new AlgalError("IO_FAILED", "cache publication cut"); };
  const executor = cachedExecutor({
    id: "fixture", cacheIdentity: binding.configurationDigest,
    ...(mode === "metadata-error" ? { receiptFor: async () => {
      if (++metadataCalls > 1) throw new AlgalError("IO_FAILED", "inner metadata cut");
      return { configurationDigest: binding.configurationDigest };
    } } : {}),
    ...(mode === "cached-publication-error" ? { executeEffect: async () => ({ output: "cached", metadata: { cached: true } }) } : {}),
    execute: async () => { calls++; throw new AlgalError("EFFECT_FAILED", "live settled error"); },
  }, store);
  const fixture = refusingJournal("after");
  const manifest = parseOrganismManifest({ contract: "algal.organism.v1", key: "organism:cache-error-miss", name: "cache error miss", cells: [{ id: "answer", kind: "agent", prompt: "answer", output: { kind: "text" } }], edges: [] });
  await expect(runOrganism({ manifest, store, fns: builtinRegistry(), executors: [executor], journal: fixture.journal })).rejects.toMatchObject({
    code: fixture.failure.code, message: fixture.failure.message, details: fixture.failure.details, uncertain: mode === "live-error",
  });
  expect(calls).toBe(mode === "live-error" ? 1 : 0);
  expect(lookups).toBe(2); expect(fixture.counts()).toEqual({ before: 1, after: 1 });
});

test("a live failed cache miss is not recorded as a cached result", async () => {
  let lookups = 0, calls = 0;
  const store = new MemoryStore();
  store.getEffect = async requestDigest => ++lookups === 1 ? { requestDigest, executor: "fixture", output: "prefetched" } : undefined;
  const executor = cachedExecutor({ id: "fixture", cacheIdentity: binding.configurationDigest, execute: async () => {
    calls++; throw new AlgalError("EFFECT_FAILED", "live settled error");
  } }, store);
  const fixture = refusingJournal("after");
  let completion: EffectReceipt | undefined;
  fixture.journal.after = async (_token, effect) => { completion = effect; };
  const manifest = parseOrganismManifest({ contract: "algal.organism.v1", key: "organism:cache-error-miss", name: "cache error miss", cells: [{ id: "answer", kind: "agent", prompt: "answer", output: { kind: "text" } }], edges: [] });
  const receipt = await runOrganism({ manifest, store, fns: builtinRegistry(), executors: [executor], journal: fixture.journal });
  expect(receipt.outcome).toBe("failed"); expect(calls).toBe(1);
  expect(completion?.error).toEqual({ code: "EFFECT_FAILED", message: "live settled error" });
  expect(completion?.cached).toBeUndefined(); expect(receipt.effects[0]?.cached).toBeUndefined();
});

test("an execution-time cache lookup failure without a prefetched hit has no live dispatch", async () => {
  let lookups = 0, calls = 0;
  const store = new MemoryStore();
  store.getEffect = async () => {
    if (++lookups > 1) throw new AlgalError("IO_FAILED", "execution-time lookup cut");
    return undefined;
  };
  const executor = cachedExecutor({ id: "fixture", cacheIdentity: binding.configurationDigest, execute: async () => { calls++; return "live"; } }, store);
  const fixture = refusingJournal("after");
  const manifest = parseOrganismManifest({ contract: "algal.organism.v1", key: "organism:cache-lookup-error", name: "cache lookup error", cells: [{ id: "answer", kind: "agent", prompt: "answer", output: { kind: "text" } }], edges: [] });
  await expect(runOrganism({ manifest, store, fns: builtinRegistry(), executors: [executor], journal: fixture.journal })).rejects.toMatchObject({ code: "IO_FAILED", uncertain: false });
  expect(lookups).toBe(2); expect(calls).toBe(0); expect(fixture.counts()).toEqual({ before: 1, after: 1 });
});

test.each([false, true])("plain execute cannot turn preflight cached metadata into dispatch evidence when wrapped: %s", async wrapped => {
  let calls = 0;
  const store = new MemoryStore();
  const inner: Executor = { id: "fixture", cacheIdentity: binding.configurationDigest,
    receiptFor: () => ({ cached: true }), execute: async () => { calls++; return "live"; } };
  const executor = wrapped ? cachedExecutor(inner, store) : inner;
  const fixture = refusingJournal("after");
  const manifest = parseOrganismManifest({ contract: "algal.organism.v1", key: "organism:plain-cache-metadata", name: "plain cache metadata", cells: [{ id: "answer", kind: "agent", prompt: "answer", output: { kind: "text" } }], edges: [] });
  await expect(runOrganism({ manifest, store, fns: builtinRegistry(), executors: [executor], journal: fixture.journal })).rejects.toMatchObject({ code: "IO_FAILED", uncertain: true });
  expect(calls).toBe(1);
  const accepted = refusingJournal("after"); let completed: EffectReceipt | undefined;
  accepted.journal.after = async (_token, effect) => { completed = effect; };
  const fresh = wrapped ? cachedExecutor(inner, new MemoryStore()) : inner;
  const receipt = await runOrganism({ manifest, store, fns: builtinRegistry(), executors: [fresh], journal: accepted.journal });
  expect(calls).toBe(2); expect(completed?.cached).toBeUndefined(); expect(receipt.effects[0]?.cached).toBeUndefined();
});

test("replacing a copied cache executor method uses the replacement invocation", async () => {
  const store = new MemoryStore(); let originalCalls = 0, replacementCalls = 0;
  const cached = cachedExecutor({ id: "fixture", cacheIdentity: binding.configurationDigest, execute: async () => { originalCalls++; return "original"; } }, store);
  const executor: Executor = { ...cached, executeEffect: async () => { replacementCalls++; throw new AlgalError("EFFECT_FAILED", "replacement failed"); } };
  const fixture = refusingJournal("after");
  const manifest = parseOrganismManifest({ contract: "algal.organism.v1", key: "organism:cache-replacement", name: "cache replacement", cells: [{ id: "answer", kind: "agent", prompt: "answer", output: { kind: "text" } }], edges: [] });
  await expect(runOrganism({ manifest, store, fns: builtinRegistry(), executors: [executor], journal: fixture.journal })).rejects.toMatchObject({ code: "IO_FAILED", uncertain: true });
  expect(originalCalls).toBe(0); expect(replacementCalls).toBe(1);
});

test.each([false, true])("nested cache wrappers preserve dispatch provenance with an inner cache hit: %s", async hit => {
  let calls = 0;
  const store = new MemoryStore(), innerStore = new MemoryStore();
  innerStore.getEffect = async requestDigest => hit ? { requestDigest, executor: "fixture", output: "inner hit" } : undefined;
  store.putEffect = async () => { throw new AlgalError("IO_FAILED", "outer publication cut"); };
  const executor = cachedExecutor(cachedExecutor({ id: "fixture", cacheIdentity: binding.configurationDigest, execute: async () => {
    calls++; throw new AlgalError("EFFECT_FAILED", "live settled error");
  } }, innerStore), store);
  const fixture = refusingJournal("after");
  const manifest = parseOrganismManifest({ contract: "algal.organism.v1", key: "organism:nested-cache-error", name: "nested cache error", cells: [{ id: "answer", kind: "agent", prompt: "answer", output: { kind: "text" } }], edges: [] });
  await expect(runOrganism({ manifest, store, fns: builtinRegistry(), executors: [executor], journal: fixture.journal })).rejects.toMatchObject({ code: "IO_FAILED", uncertain: !hit });
  expect(calls).toBe(hit ? 0 : 1); expect(fixture.counts()).toEqual({ before: 1, after: 1 });
});

test.each(["cached", "replay"] as const)("cache publication after an inner %s result preserves settled error certainty", async mode => {
  const request: EffectRequest = { contract: "algal.effect.v1", cellId: "answer", kind: "agent", prompt: "answer", context: {}, output: { kind: "text" }, budget: { maxContextBytes: 65536, maxOutputBytes: 65536 } };
  const cause = new AlgalError("IO_FAILED", "outer cache publication cut", { cache: "outer" });
  const store = new MemoryStore(); let writes = 0;
  store.putEffect = async () => { writes++; throw cause; };
  const inner: Executor = mode === "replay"
    ? replayExecutor([{ requestDigest: effectRequestDigest(request), executor: "recorded", output: "answer" }])
    : { id: "inner-cache", execute: async () => { throw new Error("no live dispatch"); }, executeEffect: async () => ({ output: "answer", metadata: { cached: true } }) };
  const executor = cachedExecutor(inner, store);
  await expect(executor.executeEffect!(request)).rejects.toBe(cause);
  expect(writes).toBe(1); expect(cause.uncertain).toBe(false);
});
