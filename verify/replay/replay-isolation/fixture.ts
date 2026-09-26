/** Replay-isolation scenario runner — a supervised subprocess fixture.
 *
 * Each scenario executes the real production surfaces — `runOrganism`,
 * `verifyReceipt`, `resumeRun` — against instrumented `Store`, `Executor`,
 * `ToolRegistry` and `Transport` seams. The wrappers count every invocation,
 * so "replay did not reach the live channel" is an observed counter, not a
 * code-path assumption.
 *
 * Invocation: `bun fixture.ts <scenario> <workdir>`
 * Writes `<workdir>/evidence/report.json` (the full capture) plus the
 * scenario receipts, and prints the same report as a single bounded JSON
 * line on stdout for the harness caller. All manifests, responses and
 * tampering are fixed constants — there is no nondeterminism to seed.
 */
import { strict as assert } from "node:assert";
import { mkdir, writeFile } from "node:fs/promises";
import { isAbsolute, join } from "node:path";
import { digestCanonical } from "../../../src/digest";
import type { Digest } from "../../../src/digest-type";
import { AlgalError } from "../../../src/errors";
import { replayExecutor, scriptedExecutor, type Executor } from "../../../src/effects";
import { builtinRegistry } from "../../../src/registry";
import { manifestToJson, parseOrganismManifest, type OrganismManifest } from "../../../src/contract";
import { canonicalizeReceipt, receiptDigest, runOrganism, type RunReceipt } from "../../../src/run";
import { replayStore, MemoryStore } from "../../../src/store-memory";
import type { Store } from "../../../src/store-contract";
import type { Transport } from "../../../src/transport-contract";
import { packOrganism } from "../../../src/bundle";
import type { ToolRegistry } from "../../../src/tools";
import { diffReceipts, resumeRun, verifyReceipt } from "../../../src/verify";
import type { JsonValue } from "../../../src/values";

// ------------------------------------------------------------ inventory ---

/** Every Store method, named once; a counter per method makes a missed
 * channel a zero instead of an omission. */
const STORE_METHODS = [
  "getManifest", "putManifest", "getReceipt", "putReceipt",
  "getValue", "putValue", "getEffect", "putEffect", "getSlot", "setSlot",
] as const;
type StoreMethod = (typeof STORE_METHODS)[number];
type StoreCalls = Record<StoreMethod, number>;

function instrumentStore(inner: Store): { store: Store; calls: StoreCalls; manifestReads: Digest[]; slotWrites: string[] } {
  const calls = Object.fromEntries(STORE_METHODS.map(name => [name, 0])) as StoreCalls;
  const manifestReads: Digest[] = [];
  const slotWrites: string[] = [];
  return {
    calls, manifestReads, slotWrites,
    store: {
      async getManifest(digest) { calls.getManifest++; manifestReads.push(digest); return inner.getManifest(digest); },
      async putManifest(m) { calls.putManifest++; return inner.putManifest(m); },
      async getReceipt(d) { calls.getReceipt++; return inner.getReceipt(d); },
      async putReceipt(r) { calls.putReceipt++; return inner.putReceipt(r); },
      async getValue(d) { calls.getValue++; return inner.getValue(d); },
      async putValue(v) { calls.putValue++; return inner.putValue(v); },
      async getEffect(d, e) { calls.getEffect++; return inner.getEffect(d, e); },
      async putEffect(r, e) { calls.putEffect++; return inner.putEffect(r, e); },
      async getSlot(n) { calls.getSlot++; return inner.getSlot(n); },
      async setSlot(n, v) { calls.setSlot++; slotWrites.push(n); return inner.setSlot(n, v); },
    },
  };
}

/** A live executor whose only evidence is its counters — `answer` is the
 * value the admitted tail may legitimately return; `execute` still counts. */
function countingExecutor(id: string, answer: JsonValue): { executor: Executor; calls: Record<string, number> } {
  const calls = { execute: 0, executeEffect: 0, receiptFor: 0, serves: 0, journalConfigurationFor: 0 };
  return {
    calls,
    executor: {
      id,
      capabilities: { effects: ["agent", "classifier", "gate", "decide", "recall"] },
      async execute() { calls.execute++; return answer; },
      serves() { calls.serves++; return false; },
      receiptFor() { calls.receiptFor++; return {}; },
      journalConfigurationFor() { calls.journalConfigurationFor++; return `sha256:${"0".repeat(64)}` as Digest; },
    },
  };
}

function instrumentedTools(toolName: string, output: Record<string, JsonValue>): { registry: ToolRegistry; count(): number } {
  let calls = 0;
  return {
    registry: new Map([[toolName, {
      signature: { inputs: {}, outputs: { value: { type: "json" } }, effect: "read", cost: 1, maxOutputBytes: 1024 },
      async tool() { calls++; return output; },
    }]]),
    count() { return calls; },
  };
}

function instrumentedTransport(id: string, bundle: () => Promise<import("../../../src/bundle").Bundle | null>): { transport: Transport; calls: Digest[] } {
  const calls: Digest[] = [];
  return {
    calls,
    transport: { id, async getBundle(root) { calls.push(root); return bundle(); } },
  };
}

/** Faithful copy of `verify.ts`'s private `replayInputs` — the recorded
 * provenance a rerun needs. verifyReceipt builds it internally; the direct
 * `runOrganism` arm below needs the same record. */
function replayInputs(receipt: RunReceipt): {
  replayVia: Record<string, string>;
  replaySlots: Record<string, { value?: JsonValue; missing?: boolean }>;
} {
  const replayVia: Record<string, string> = {};
  const replaySlots: Record<string, { value?: JsonValue; missing?: boolean }> = {};
  for (const [path, rec] of Object.entries(receipt.cells)) {
    if (rec.via) replayVia[path] = rec.via;
    if (rec.slot?.mode === "read") {
      const v = rec.status === "committed" ? rec.outputs?.data : undefined;
      replaySlots[path] = v !== undefined ? { value: v } : { missing: true };
    }
  }
  return { replayVia, replaySlots };
}

// ------------------------------------------------------------ manifests ---

const BUDGETS = {
  maxSteps: 16, maxAgentCalls: 8, maxWork: 100_000,
  maxContextBytes: 8192, maxOutputBytes: 8192, maxDepth: 2,
};

/** Exercises every mutable channel: an agent effect, a CAS `store` write, a
 * `slot` write, a `slot` read, and a `tool` dispatch. */
function isolationManifest(): OrganismManifest {
  return parseOrganismManifest({
    contract: "algal.organism.v1",
    key: "organism:replay-isolation",
    name: "Replay isolation",
    cells: [
      { id: "ask", kind: "input", outputs: { q: "text" } },
      { id: "lookup", kind: "tool", tool: "catalog.v1" },
      { id: "answer", kind: "agent", inputs: { q: "text" }, prompt: "Answer briefly.", output: { kind: "text" } },
      { id: "pin", kind: "store" },
      { id: "note", kind: "slot", name: "isolation-note", mode: "write" },
      { id: "seed", kind: "slot", name: "isolation-seed", mode: "read" },
    ],
    edges: [
      { from: { cell: "ask", port: "q" }, to: { cell: "answer", port: "q" } },
      { from: { cell: "answer", port: "out" }, to: { cell: "pin", port: "data" } },
      { from: { cell: "lookup", port: "value" }, to: { cell: "note", port: "data" } },
    ],
    budgets: BUDGETS,
  });
}

/** A committed prefix (agent + slot write) and a suspended tail agent. */
function resumeManifest(): OrganismManifest {
  return parseOrganismManifest({
    contract: "algal.organism.v1",
    key: "organism:replay-resume",
    name: "Replay resume",
    cells: [
      { id: "go", kind: "input", outputs: { q: "text" } },
      { id: "step1", kind: "agent", inputs: { q: "text" }, prompt: "step one", output: { kind: "text" } },
      { id: "memo", kind: "slot", name: "resume-note", mode: "write" },
      { id: "step2", kind: "agent", inputs: { q: "text", mid: "text" }, prompt: "step two", output: { kind: "text" } },
    ],
    edges: [
      { from: { cell: "go", port: "q" }, to: { cell: "step1", port: "q" } },
      { from: { cell: "step1", port: "out" }, to: { cell: "memo", port: "data" } },
      { from: { cell: "go", port: "q" }, to: { cell: "step2", port: "q" } },
      { from: { cell: "step1", port: "out" }, to: { cell: "step2", port: "mid" } },
    ],
    budgets: BUDGETS,
  });
}

/** The closed dependency fixture: a sub-manifest with an interface, embedded
 * by digest inside a parent organism cell. */
function closureManifests(): { sub: OrganismManifest; subDigest: Digest; parent: OrganismManifest; parentVia: OrganismManifest } {
  const sub = parseOrganismManifest({
    contract: "algal.organism.v1",
    key: "organism:closure-sub",
    name: "ClosureSub",
    interface: { inputs: { q: { cell: "in", port: "v" } }, outputs: { out: { cell: "out", port: "value" } } },
    cells: [
      { id: "in", kind: "input", outputs: { v: "text" } },
      { id: "out", kind: "const", outputs: { value: { type: "text", value: "sub-answer" } } },
    ],
    edges: [],
  });
  const subDigest = digestCanonical(manifestToJson(sub));
  const parent = (via: boolean) => parseOrganismManifest({
    contract: "algal.organism.v1",
    key: via ? "organism:closure-parent-via" : "organism:closure-parent",
    name: "ClosureParent",
    cells: [
      { id: "ask", kind: "input", outputs: { q: "text" } },
      { id: "sub", kind: "organism", manifest: subDigest, ...(via ? { via: "docs" } : {}) },
      { id: "done", kind: "agent", inputs: { got: "text" }, prompt: "wrap it", output: { kind: "text" } },
    ],
    edges: [
      { from: { cell: "ask", port: "q" }, to: { cell: "sub", port: "q" } },
      { from: { cell: "sub", port: "out" }, to: { cell: "done", port: "got" } },
    ],
    budgets: BUDGETS,
  });
  return { sub, subDigest, parent: parent(false), parentVia: parent(true) };
}

const manifestJson = (m: OrganismManifest) => manifestToJson(m) as unknown as JsonValue;
const receiptJson = (r: RunReceipt) => r as unknown as JsonValue;

const zeroStoreCalls = (): StoreCalls =>
  Object.fromEntries(STORE_METHODS.map(name => [name, 0])) as StoreCalls;

function mutateCalls(calls: StoreCalls): StoreCalls {
  return {
    getManifest: calls.getManifest, putManifest: calls.putManifest,
    getReceipt: calls.getReceipt, putReceipt: calls.putReceipt,
    getValue: calls.getValue, putValue: calls.putValue,
    getEffect: calls.getEffect, putEffect: calls.putEffect,
    getSlot: calls.getSlot, setSlot: calls.setSlot,
  };
}

/** Mutating channels: any call reaching the source store on one of these
 * during verify means a replay write escaped the overlay. */
function mutations(calls: StoreCalls): number {
  return calls.putManifest + calls.putReceipt + calls.putValue + calls.putEffect + calls.setSlot;
}

async function writeEvidence(directory: string, name: string, value: JsonValue): Promise<void> {
  await writeFile(join(directory, "evidence", `${name}.json`), JSON.stringify(value, null, 2) + "\n");
}

// ------------------------------------------------------------ scenarios ---

/** Record → verify under full instrumentation, then a scheduler-level arm
 * with an admissible live executor that must never be selected. */
async function scenarioVerifyIsolation(directory: string): Promise<JsonValue> {
  const manifest = isolationManifest();
  const record = instrumentStore(new MemoryStore());
  // Seed the slot the read cell will observe — the record itself holds it.
  await record.store.setSlot("isolation-seed", "seeded-value");
  const recordTools = instrumentedTools("catalog.v1", { value: "cataloged" });
  const receipt = await runOrganism({
    manifest, args: { ask: { q: "summarize" } }, fns: builtinRegistry(),
    store: record.store, executors: [scriptedExecutor({ answer: "recorded answer" })],
    tools: recordTools.registry,
  });
  assert(receipt.outcome === "complete");
  const recordCalls = mutateCalls(record.calls);
  // Control: the live record DID write — the instrumentation sees writes.
  assert(mutations(recordCalls) >= 3 && recordCalls.getSlot >= 1 && recordTools.count() === 1);

  // Verify against a fresh instrumented source store.
  const source = instrumentStore(new MemoryStore());
  const verifyTools = instrumentedTools("catalog.v1", { value: "cataloged" });
  const verified = await verifyReceipt(receiptJson(receipt), manifestJson(manifest), source.store, builtinRegistry(), undefined, verifyTools.registry);
  assert(verified.ok === true);
  const verifyCalls = mutateCalls(source.calls);
  const toolCallsAfterVerify = verifyTools.count();

  // Scheduler-level arm: replayExecutor + an admissible live executor, all
  // replay options present — the live executor must never be selected.
  const armSource = instrumentStore(new MemoryStore());
  const sentinel = countingExecutor("live-sentinel", "LIVE-DISPATCHED");
  const { replayVia, replaySlots } = replayInputs(receipt);
  const armTools = instrumentedTools("catalog.v1", { value: "cataloged" });
  const rerun = await runOrganism({
    manifest, args: { ask: { q: "summarize" } }, fns: builtinRegistry(),
    store: replayStore(armSource.store),
    executors: [replayExecutor(receipt.effects), sentinel.executor],
    replayVia, replaySlots,
    replayToolEffects: receipt.effects.filter(e => e.executor.startsWith("tool:")),
    replayRuntime: receipt.runtime,
    tools: armTools.registry,
  });
  assert(canonicalizeReceipt(rerun) === canonicalizeReceipt(receipt));
  return {
    ok: true,
    recordStoreWrites: mutations(recordCalls),
    recordToolCalls: recordTools.count(),
    verifySourceMutations: mutations(verifyCalls),
    verifySourceCalls: verifyCalls,
    verifyToolCalls: toolCallsAfterVerify,
    armSourceMutations: mutations(armSource.calls),
    armLiveCalls: sentinel.calls,
    armToolCalls: armTools.count(),
    receiptIdentical: true,
  };
}

/** A receipt that lost its tool record: strict replay answers nothing —
 * the run diverges, it does not call the live tool. */
async function scenarioToolMiss(directory: string): Promise<JsonValue> {
  const manifest = isolationManifest();
  const record = instrumentStore(new MemoryStore());
  await record.store.setSlot("isolation-seed", "seeded-value");
  const recordTools = instrumentedTools("catalog.v1", { value: "cataloged" });
  const receipt = await runOrganism({
    manifest, args: { ask: { q: "summarize" } }, fns: builtinRegistry(),
    store: record.store, executors: [scriptedExecutor({ answer: "recorded answer" })],
    tools: recordTools.registry,
  });
  const forged = structuredClone(receipt);
  forged.effects = forged.effects.filter(e => !e.executor.startsWith("tool:"));
  forged.digest = receiptDigest(forged);
  const source = instrumentStore(new MemoryStore());
  const verifyTools = instrumentedTools("catalog.v1", { value: "cataloged" });
  const result = await verifyReceipt(receiptJson(forged), manifestJson(manifest), source.store, builtinRegistry(), undefined, verifyTools.registry);
  assert(result.ok === false);
  return {
    ok: true,
    verifiedOk: result.ok,
    mismatches: result.mismatches.length,
    verifyToolCalls: verifyTools.count(),
    verifySourceMutations: mutations(source.calls),
  };
}

/** A suspended checkpoint replays its recorded prefix on resume; the live
 * tail answers only the effect the checkpoint never reached. */
async function scenarioResumePrefix(directory: string): Promise<JsonValue> {
  const manifest = resumeManifest();
  const gatekeeper: Executor = {
    id: "gatekeeper",
    capabilities: { effects: ["agent", "classifier", "gate", "decide", "recall"] },
    async execute(request) {
      if (request.cellId === "step2") throw new AlgalError("EFFECT_SUSPENDED", "awaiting decision");
      return "answered " + request.cellId;
    },
  };
  const recordStore = instrumentStore(new MemoryStore());
  const checkpoint = await runOrganism({
    manifest, args: { go: { q: "start" } }, fns: builtinRegistry(),
    store: recordStore.store, executors: [gatekeeper],
  });
  assert(checkpoint.outcome === "suspended" && checkpoint.cells.memo?.status === "committed");

  // The suspended checkpoint still verifies bit-for-bit.
  const verifySource = instrumentStore(new MemoryStore());
  const verified = await verifyReceipt(receiptJson(checkpoint), manifestJson(manifest), verifySource.store);
  assert(verified.ok === true);
  const verifyMutations = mutations(verifySource.calls);

  const liveStore = instrumentStore(new MemoryStore());
  const tail = countingExecutor("live-tail", "approved work");
  const resumed = await resumeRun(receiptJson(checkpoint), manifestJson(manifest), liveStore.store, [tail.executor]);
  // Snapshot the run's channel use BEFORE probing the settled slot — the
  // probe is instrumentation, not a run call.
  const resumeCalls = mutateCalls(liveStore.calls);
  const tailCalls = { ...tail.calls };
  const slotAfter = await liveStore.store.getSlot("resume-note");
  return {
    ok: true,
    checkpointOutcome: checkpoint.outcome,
    verifiedOk: verified.ok,
    verifyMutations,
    resumeOutcome: resumed.outcome,
    resumedEffects: resumed.effects.length,
    tailCalls,
    resumeStoreCalls: resumeCalls,
    settledSlotAfterResume: slotAfter ?? null,
    prefixDigestKept: resumed.effects[0]?.requestDigest === checkpoint.effects[0]?.requestDigest,
    step1Status: resumed.cells.step1?.status ?? "missing",
    step2Output: resumed.cells.step2?.outputs?.out ?? null,
  };
}

/** A checkpoint whose digest field disagrees with its contents is refused
 * before the prefix is replayed — the live tail is never consulted. */
async function scenarioResumeTamperedDigest(directory: string): Promise<JsonValue> {
  const manifest = resumeManifest();
  const gatekeeper: Executor = {
    id: "gatekeeper",
    capabilities: { effects: ["agent", "classifier", "gate", "decide", "recall"] },
    async execute(request) {
      if (request.cellId === "step2") throw new AlgalError("EFFECT_SUSPENDED", "awaiting decision");
      return "answered " + request.cellId;
    },
  };
  const checkpoint = await runOrganism({
    manifest, args: { go: { q: "start" } }, fns: builtinRegistry(),
    store: new MemoryStore(), executors: [gatekeeper],
  });
  const forged = { ...structuredClone(checkpoint), digest: `sha256:${"0".repeat(64)}` as Digest };
  const liveStore = instrumentStore(new MemoryStore());
  const tail = countingExecutor("live-tail", "approved work");
  let code = "none";
  try { await resumeRun(receiptJson(forged as RunReceipt), manifestJson(manifest), liveStore.store, [tail.executor]); }
  catch (error) { code = error instanceof AlgalError ? error.code : String(error); }
  return {
    ok: true, rejectedCode: code, tailCalls: tail.calls,
    storeMutations: mutations(liveStore.calls),
  };
}

/** A receipt-consistent but semantically forged checkpoint (the digest was
 * recomputed over the altered fields) passes the self-check and is refused
 * by prefix verification — again before any live dispatch. */
async function scenarioResumeTamperedContent(directory: string): Promise<JsonValue> {
  const manifest = resumeManifest();
  const gatekeeper: Executor = {
    id: "gatekeeper",
    capabilities: { effects: ["agent", "classifier", "gate", "decide", "recall"] },
    async execute(request) {
      if (request.cellId === "step2") throw new AlgalError("EFFECT_SUSPENDED", "awaiting decision");
      return "answered " + request.cellId;
    },
  };
  const checkpoint = await runOrganism({
    manifest, args: { go: { q: "start" } }, fns: builtinRegistry(),
    store: new MemoryStore(), executors: [gatekeeper],
  });
  const forged = structuredClone(checkpoint);
  const step1 = forged.cells.step1;
  assert(step1?.status === "committed");
  forged.cells.step1 = { ...step1, outputs: { out: "forged prefix" } };
  forged.digest = receiptDigest(forged);
  const liveStore = instrumentStore(new MemoryStore());
  const tail = countingExecutor("live-tail", "approved work");
  let code = "none";
  try { await resumeRun(receiptJson(forged), manifestJson(manifest), liveStore.store, [tail.executor]); }
  catch (error) { code = error instanceof AlgalError ? error.code : String(error); }
  return {
    ok: true, rejectedCode: code, tailCalls: tail.calls,
    storeMutations: mutations(liveStore.calls),
  };
}

/** Closed portable dependencies: a digest-referenced sub-manifest resolves
 * only from the store or the declared `via` transport — nothing ambient. */
async function scenarioClosure(directory: string): Promise<JsonValue> {
  const { sub, subDigest, parent, parentVia } = closureManifests();
  const out: Record<string, JsonValue> = { ok: true, subDigest };

  // (a) sub-manifest admitted to the store: record + verify, transport never consulted.
  const depot = new MemoryStore();
  await depot.putManifest(sub);
  const recordA = instrumentStore(depot);
  const receiptA = await runOrganism({
    manifest: parent, args: { ask: { q: "go" } }, fns: builtinRegistry(),
    store: recordA.store, executors: [scriptedExecutor({ done: "wrapped" })],
  });
  assert(receiptA.outcome === "complete");
  const manifestReadsA = [...recordA.manifestReads];
  const sourceA = instrumentStore(depot);
  const transportA = instrumentedTransport("docs", async () => null);
  const verifiedA = await verifyReceipt(receiptJson(receiptA), manifestJson(parent), sourceA.store, builtinRegistry(), { docs: transportA.transport });
  assert(verifiedA.ok === true);
  out.installed = {
    recordManifestReads: manifestReadsA,
    verifyManifestReads: [...sourceA.manifestReads],
    verifyTransportCalls: transportA.calls.length,
    verifyMutations: mutations(sourceA.calls),
  };

  // (b) missing manifest, `via` declared, transport holds the closure —
  // exactly one declared fetch installs the digest-verified bundle.
  const depotB = new MemoryStore();
  await depotB.putManifest(sub);
  const bundle = await packOrganism(sub, depotB);
  const storeB = instrumentStore(new MemoryStore());
  const transportB = instrumentedTransport("docs", async () => bundle);
  const receiptB = await runOrganism({
    manifest: parentVia, args: { ask: { q: "go" } }, fns: builtinRegistry(),
    store: storeB.store, executors: [scriptedExecutor({ done: "wrapped" })],
    transports: { docs: transportB.transport },
  });
  assert(receiptB.outcome === "complete" && receiptB.cells.sub?.via === "docs");
  out.via = {
    transportCalls: [...transportB.calls],
    installed: await storeB.store.getManifest(subDigest) !== undefined,
    recordedVia: receiptB.cells.sub?.via ?? null,
  };

  // (c) missing manifest, `via` declared, transport empty — refused with the
  // exact digest, and the declared channel was consulted exactly once.
  const storeC = instrumentStore(new MemoryStore());
  const transportC = instrumentedTransport("docs", async () => null);
  let missCode = "none", missMessage = "";
  try {
    await runOrganism({
      manifest: parentVia, args: { ask: { q: "go" } }, fns: builtinRegistry(),
      store: storeC.store, executors: [scriptedExecutor({ done: "wrapped" })],
      transports: { docs: transportC.transport },
    });
  } catch (error) {
    missCode = error instanceof AlgalError ? error.code : String(error);
    missMessage = error instanceof Error ? error.message : String(error);
  }
  out.viaMiss = {
    code: missCode, namesDigest: missMessage.includes(subDigest),
    transportCalls: transportC.calls.length,
  };

  // (d) missing manifest, no `via` — refused with the exact digest; an
  // ambient transport sitting in the same registry is never consulted.
  const storeD = instrumentStore(new MemoryStore());
  const transportD = instrumentedTransport("docs", async () => bundle);
  let plainCode = "none", plainMessage = "";
  try {
    await runOrganism({
      manifest: parent, args: { ask: { q: "go" } }, fns: builtinRegistry(),
      store: storeD.store, executors: [scriptedExecutor({ done: "wrapped" })],
      transports: { docs: transportD.transport },
    });
  } catch (error) {
    plainCode = error instanceof AlgalError ? error.code : String(error);
    plainMessage = error instanceof Error ? error.message : String(error);
  }
  out.ambientMiss = {
    code: plainCode, namesDigest: plainMessage.includes(subDigest),
    transportCalls: transportD.calls.length,
  };
  return out as JsonValue;
}

/** Recomputing the same manifest under a different oracle produces a
 * different, still self-verifying receipt: distinct execution evidence,
 * not detectable forgery. */
async function scenarioOracleReplacement(directory: string): Promise<JsonValue> {
  const manifest = isolationManifest();
  const mkStore = async () => {
    const s = new MemoryStore();
    await s.setSlot("isolation-seed", "seeded-value");
    return s;
  };
  const toolsOne = instrumentedTools("catalog.v1", { value: "cataloged" });
  const first = await runOrganism({
    manifest, args: { ask: { q: "summarize" } }, fns: builtinRegistry(),
    store: await mkStore(), executors: [scriptedExecutor({ answer: "answer one" })],
    tools: toolsOne.registry,
  });
  const toolsTwo = instrumentedTools("catalog.v1", { value: "cataloged" });
  const second = await runOrganism({
    manifest, args: { ask: { q: "summarize" } }, fns: builtinRegistry(),
    store: await mkStore(), executors: [scriptedExecutor({ answer: "answer two" })],
    tools: toolsTwo.registry,
  });
  const digestsDiffer = first.digest !== second.digest;
  const verifyFirst = await verifyReceipt(receiptJson(first), manifestJson(manifest), new MemoryStore(), builtinRegistry(), undefined, instrumentedTools("catalog.v1", { value: "cataloged" }).registry);
  const verifySecond = await verifyReceipt(receiptJson(second), manifestJson(manifest), new MemoryStore(), builtinRegistry(), undefined, instrumentedTools("catalog.v1", { value: "cataloged" }).registry);
  const divergences = diffReceipts(first, second);
  return {
    ok: true,
    digestsDiffer,
    firstVerified: verifyFirst.ok,
    secondVerified: verifySecond.ok,
    divergences: divergences.length,
    sampleDivergence: divergences[0] ?? "none",
  };
}

// ------------------------------------------------------------- driver ----

const SCENARIOS: Record<string, (directory: string) => Promise<JsonValue>> = {
  "verify-isolation": scenarioVerifyIsolation,
  "tool-miss": scenarioToolMiss,
  "resume-prefix": scenarioResumePrefix,
  "resume-tampered-digest": scenarioResumeTamperedDigest,
  "resume-tampered-content": scenarioResumeTamperedContent,
  "closure": scenarioClosure,
  "oracle-replacement": scenarioOracleReplacement,
};

const [scenario, directory] = process.argv.slice(2);
assert(process.argv.length === 4 && scenario !== undefined && directory !== undefined && isAbsolute(directory), "closed control arguments");
const run = SCENARIOS[scenario];
assert(run !== undefined, `unknown scenario ${scenario}`);
await mkdir(join(directory, "evidence"), { recursive: true });
const report = { contract: "algal.replay-isolation.v1", scenario, ...(await run(directory) as Record<string, JsonValue>) };
await writeEvidence(directory, "report", report as JsonValue);
console.log(JSON.stringify(report));
