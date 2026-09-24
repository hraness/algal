/** Synthetic, opt-in diagnostic for task history plus saved workflow
 * candidates. Counts and timings stay outside application records. The output
 * carries digests and counts only, never task text or draft content.
 *
 * Run through the host scheduler:
 *   bun scripts/triage-history-performance.ts --tasks 16 --candidates 16
 *
 * The run adds `--tasks` synthetic tasks, saves `--candidates` owner workflow
 * candidates at that head, then instruments one capture and one edit. To
 * measure a base commit, run this same file from an exported copy of that
 * commit; `sources` names the exact controller and core bytes measured. */
import { AsyncLocalStorage } from "node:async_hooks";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { BrowserTriageController } from "../examples/browser-triage/controller";
import { TriageCore } from "../examples/local-triage/core";
import type { Config } from "../examples/local-triage/contract";
import { ApplicationCore } from "../src/application-core";
import { MemoryApplicationStorage } from "../src/application-storage";
import { MemoryStore } from "../src/store-memory";
import { digestCanonical } from "../src/digest";
import type { Digest } from "../src/digest-type";
import { asJsonValue } from "../src/values";

const MAX_TASKS = 32, MAX_CANDIDATES = 16;
const args = process.argv.slice(2);
if (args.length % 2 !== 0 || args.some((arg, index) => index % 2 === 0 && arg !== "--tasks" && arg !== "--candidates")) throw new Error("Usage: triage-history-performance.ts [--tasks 1-32] [--candidates 0-16]");
function option(name: string, fallback: number, min: number, max: number): number {
  const index = args.indexOf(`--${name}`), value = Number(index === -1 ? fallback : args[index + 1]);
  if (!Number.isSafeInteger(value) || value < min || value > max) throw new Error(`--${name} must be an integer from ${min} through ${max}`);
  return value;
}
const taskCount = option("tasks", 16, 1, MAX_TASKS), candidateCount = option("candidates", 16, 0, MAX_CANDIDATES);

type Counts = {
  elapsedMs: number; privateReplays: number; sourceSnapshots: number; candidateReplays: number;
  inspectEvaluation: { individual: number; liveCore: number; privateCore: number };
  reads: { live: { value: number; manifest: number; receipt: number; slot: number }; private: { value: number; manifest: number; receipt: number } };
  commits: { live: number; private: number }; history: { live: number; private: number };
};
const counts = (): Counts => ({
  elapsedMs: 0, privateReplays: 0, sourceSnapshots: 0, candidateReplays: 0,
  inspectEvaluation: { individual: 0, liveCore: 0, privateCore: 0 },
  reads: { live: { value: 0, manifest: 0, receipt: 0, slot: 0 }, private: { value: 0, manifest: 0, receipt: 0 } },
  commits: { live: 0, private: 0 }, history: { live: 0, private: 0 },
});
type Span = { stage: string; phase: string; parent: Span | undefined; childMs: number };
type Stage = { calls: number; inclusiveMs: number; selfMs: number };
type Measurement = { totals: Counts; phases: Map<string, Counts>; stages: Map<string, Stage> };
const context = new AsyncLocalStorage<Span>();
// Private verification copies use their own stores; only this one is live.
const storage = new MemoryApplicationStorage(), liveStore: unknown = storage.store;
let active: Measurement | undefined;
const liveWrites: string[] = [];

/** A counter goes to the operation total and to its outermost instrumented
 * phase, such as the capture, prepare, or recovery step of an action. */
function count(update: (target: Counts) => void): void {
  if (!active) return;
  update(active.totals);
  const phase = context.getStore()?.phase ?? "operation";
  if (!active.phases.has(phase)) active.phases.set(phase, counts());
  update(active.phases.get(phase)!);
}
function within(stage: string): boolean {
  for (let span = context.getStore()?.parent; span; span = span.parent) if (span.stage === stage) return true;
  return false;
}
const isLive = (store: unknown) => store === liveStore;
// Identity digests cover whole captures and transfers, beyond the record bound.
const digest = (value: unknown) => digestCanonical(asJsonValue(value, "diagnostic identity"));

/** Method names differ between measured versions; absent methods are listed. */
function instrument(target: object, names: readonly string[], prefix: string, onCall?: (self: unknown) => void): { found: string[]; missing: string[] } {
  const methods = target as Record<string, (...input: unknown[]) => unknown>, found: string[] = [], missing: string[] = [];
  for (const name of names) {
    const original = methods[name];
    if (typeof original !== "function") { missing.push(`${prefix}.${name}`); continue; }
    found.push(`${prefix}.${name}`);
    methods[name] = async function (this: unknown, ...input: unknown[]) {
      const measurement = active;
      if (!measurement) return original.apply(this, input);
      const parent = context.getStore(), stage = `${prefix}.${name}`, span: Span = { stage, phase: parent?.phase ?? stage, parent, childMs: 0 }, started = performance.now();
      try {
        return await context.run(span, () => { onCall?.(this); return original.apply(this, input); });
      } finally {
        const elapsed = performance.now() - started;
        if (parent) parent.childMs += elapsed;
        else { const phase = measurement.phases.get(stage) ?? counts(); phase.elapsedMs += elapsed; measurement.phases.set(stage, phase); }
        const key = `${parent?.stage ?? "operation"} > ${stage}`, metric = measurement.stages.get(key) ?? { calls: 0, inclusiveMs: 0, selfMs: 0 };
        metric.calls++; metric.inclusiveMs += elapsed; metric.selfMs += Math.max(0, elapsed - span.childMs); measurement.stages.set(key, metric);
      }
    };
  }
  return { found, missing };
}
const liveCore = (self: unknown) => isLive((self as TriageCore).service.store);
const liveService = (self: unknown) => isLive((self as ApplicationCore).store);
const coverage = [
  // The controller's own inspectEvaluation is the individual candidate proof:
  // each first call in an operation replays the full history privately.
  instrument(BrowserTriageController.prototype, ["inspectEvaluation"], "controller", () => count(c => c.inspectEvaluation.individual++)),
  instrument(BrowserTriageController.prototype, ["checkedJournal", "checkJournal", "exact", "captureOwned", "prepare", "recoverOwned", "binding"], "controller"),
  instrument(TriageCore.prototype, ["withVerifiedSource"], "triage", self => { if (liveCore(self)) count(c => c.sourceSnapshots++); }),
  instrument(TriageCore.prototype, ["inspectEvaluation"], "triage", self => { const live = liveCore(self); count(c => { if (live) c.inspectEvaluation.liveCore++; else c.inspectEvaluation.privateCore++; }); }),
  instrument(TriageCore.prototype, ["verifySourceClosure", "exportRecords", "import", "readTransfer", "loadSession", "capture"], "triage"),
  instrument(TriageCore, ["withVerifiedTransfer"], "triage", () => { const candidate = within("controller.inspectEvaluation"); count(c => { c.privateReplays++; if (candidate) c.candidateReplays++; }); }),
  instrument(ApplicationCore.prototype, ["history"], "application", self => { const live = liveService(self); count(c => { if (live) c.history.live++; else c.history.private++; }); }),
  instrument(ApplicationCore.prototype, ["commit"], "application", self => { const live = liveService(self); count(c => { if (live) c.commits.live++; else c.commits.private++; }); }),
];

const store = MemoryStore.prototype as unknown as Record<string, (...input: unknown[]) => Promise<unknown>>;
for (const [method, kind] of [["getValue", "value"], ["getManifest", "manifest"], ["getReceipt", "receipt"]] as const) {
  const original = store[method]!;
  store[method] = function (this: unknown, ...input: unknown[]) { const live = isLive(this); count(c => { if (live) c.reads.live[kind]++; else c.reads.private[kind]++; }); return original.apply(this, input); };
}
{
  const original = store.getSlot!;
  store.getSlot = function (this: unknown, ...input: unknown[]) { if (isLive(this)) count(c => c.reads.live.slot++); return original.apply(this, input); };
}
// Live writes are identity evidence: both measured versions must write the
// same records and slot values. Only digests are retained.
for (const method of ["putValue", "putReceipt", "putManifest", "setSlot"] as const) {
  const original = store[method]!;
  store[method] = async function (this: unknown, ...input: unknown[]) {
    const result = await original.apply(this, input);
    if (isLive(this)) liveWrites.push(method === "setSlot" ? `slot:${String(input[0])}:${digest(input[1])}` : `${method}:${String(result)}`);
    return result;
  };
}

async function measure<T>(operation: () => Promise<T>): Promise<{ result: T; measurement: Measurement }> {
  const measurement: Measurement = { totals: counts(), phases: new Map(), stages: new Map() };
  active = measurement;
  const started = performance.now();
  try { return { result: await operation(), measurement }; }
  finally { measurement.totals.elapsedMs = performance.now() - started; active = undefined; }
}
const rounded = (value: Counts): Counts => ({ ...value, elapsedMs: Math.round(value.elapsedMs) });
const report = (m: Measurement) => ({
  totals: rounded(m.totals),
  phases: Object.fromEntries([...m.phases.entries()].map(([key, value]) => [key, rounded(value)])),
  stages: Object.fromEntries([...m.stages.entries()].map(([key, value]) => [key, { calls: value.calls, inclusiveMs: Math.round(value.inclusiveMs), selfMs: Math.round(value.selfMs) }])),
});

/** Distinct owner workflows, mixing schema v1 and v2 candidates. */
function workflows(total: number): { config: Config; schemaVersion: 1 | 2; rationale: string }[] {
  const result: { config: Config; schemaVersion: 1 | 2; rationale: string }[] = [];
  for (const group of ["none", "priority", "category", "status"] as const) for (const sort of ["title", "created", "priority"] as const) for (const allowReopen of [false, true]) {
    if (result.length < total) result.push({ config: { sort, group, allowReopen }, schemaVersion: group === "category" || result.length % 2 === 1 ? 2 : 1, rationale: `Synthetic workflow candidate ${result.length + 1}` });
  }
  return result;
}
const sha256 = async (path: string) => `sha256:${createHash("sha256").update(await readFile(new URL(path, import.meta.url))).digest("hex")}`;

const controller = new BrowserTriageController(storage);
let current = await controller.initialize();
for (let index = 0; index < taskCount; index++) {
  current = await controller.act(current.head, { kind: "add", task: { id: `task-${index}`, title: "Synthetic benchmark task", priority: "normal", status: "open", category: "inbox" } });
  if ((index + 1) % 8 === 0) console.error(JSON.stringify({ measurement: "triage-history-performance-setup", tasks: index + 1 }));
}
const candidates: Digest[] = [];
for (const workflow of workflows(candidateCount)) {
  const proposed = await controller.propose(current.head, workflow);
  if (proposed.head !== current.head || !proposed.pending) throw new Error("Workflow candidate was not saved at the task head");
  candidates.push(proposed.pending.reference);
  if (candidates.length % 4 === 0) console.error(JSON.stringify({ measurement: "triage-history-performance-setup", candidates: candidates.length }));
}
const setupWrites = liveWrites.length;
const captured = await measure(() => controller.capture());
if (captured.result.head !== current.head || captured.result.remainingEvaluations !== MAX_CANDIDATES - candidateCount) throw new Error("Unexpected capture state");
const edited = await measure(() => controller.act(current.head, { kind: "edit", taskId: `task-${taskCount - 1}`, title: "Synthetic benchmark edit", priority: "high", category: "inbox" }));
const transfer = await controller.exportBundle();
console.log(JSON.stringify({
  measurement: "triage-history-performance", runtime: Bun.version, tasks: taskCount, candidates: candidateCount,
  sources: { controller: await sha256("../examples/browser-triage/controller.ts"), core: await sha256("../examples/local-triage/core.ts"), diagnostic: await sha256(import.meta.url) },
  instrumented: coverage.flatMap(c => c.found), notInstrumented: coverage.flatMap(c => c.missing),
  identity: {
    head: current.head, editedHead: edited.result.head, candidateSet: digest(candidates),
    capture: digest(captured.result), editCapture: digest(edited.result),
    transfer: digest(transfer), transferStates: transfer.states.length, transferRecords: transfer.records.length, transferBytes: new TextEncoder().encode(JSON.stringify(transfer)).byteLength,
    setupLiveWrites: setupWrites, measuredLiveWrites: liveWrites.length - setupWrites, liveWritesDigest: digest([...liveWrites].sort()),
  },
  capture: report(captured.measurement), edit: report(edited.measurement),
}, null, 2));
