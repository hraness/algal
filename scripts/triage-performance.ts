/** Synthetic, opt-in diagnostic. Timings stay outside application records.
 * Run through the host scheduler: bun scripts/triage-performance.ts [task count]
 * [optional controller module path for an isolated baseline]. */
import { AsyncLocalStorage } from "node:async_hooks";
import { TriageCore, hash } from "../examples/local-triage/core";
import { ApplicationCore } from "../src/application-core";
import { MemoryApplicationStorage } from "../src/application-storage";
import { MemoryStore } from "../src/store-memory";
import { digestCanonical } from "../src/digest";
import { asJsonValue } from "../src/values";

const { BrowserTriageController } = await import(process.argv[3] ?? "../examples/browser-triage/controller") as typeof import("../examples/browser-triage/controller");

const count = Number(process.argv[2] ?? 32);
if (!Number.isSafeInteger(count) || count < 1 || count > 32) throw new Error("Task count must be 1 through 32");
type Span = { stage: string; children: number };
type Metric = { calls: number; inclusiveMs: number; selfMs: number };
const context = new AsyncLocalStorage<Span>(), metrics = new Map<string, Metric>();
let enabled = false;
function instrument(target: object, names: string[], prefix: string) {
  const methods = target as Record<string, (...args: unknown[]) => unknown>;
  for (const name of names) {
    const original = methods[name];
    if (typeof original !== "function") throw new Error(`Missing diagnostic method ${prefix}.${name}`);
    methods[name] = async function (this: unknown, ...args: unknown[]) {
      if (!enabled) return original.apply(this, args);
      const parent = context.getStore(), span = { stage: `${prefix}.${name}`, children: 0 }, started = performance.now();
      try { return await context.run(span, () => original.apply(this, args)); }
      finally {
        const elapsed = performance.now() - started;
        if (parent) parent.children += elapsed;
        const key = `${parent?.stage ?? "operation"} > ${span.stage}`, metric = metrics.get(key) ?? { calls: 0, inclusiveMs: 0, selfMs: 0 };
        metric.calls++; metric.inclusiveMs += elapsed; metric.selfMs += Math.max(0, elapsed - span.children); metrics.set(key, metric);
      }
    };
  }
}
instrument(BrowserTriageController.prototype, ["checkJournal", "exact", "captureOwned", "prepare", "recoverOwned", "binding", "inspectEvaluation"], "controller");
instrument(TriageCore.prototype, ["withVerifiedSource", "exportRecords", "verifySourceClosure", "import", "readTransfer", "tasks", "definition", "loadSession"], "triage");
instrument(TriageCore, ["withVerifiedTransfer"], "triage");
instrument(ApplicationCore.prototype, ["history", "commit"], "application");
instrument(MemoryStore.prototype, ["getValue", "getReceipt", "getManifest"], "store");
const controller = new BrowserTriageController(new MemoryApplicationStorage());
let current = await controller.initialize();
for (let index = 0; index < count; index++) {
  current = await controller.act(current.head, { kind: "add", task: { id: `task-${index}`, title: "Synthetic benchmark task", priority: "normal", status: "open", category: "inbox" } });
  if ((index + 1) % 8 === 0) console.error(JSON.stringify({ measurement: "triage-performance-setup", tasks: index + 1 }));
}
const before = current.head, started = performance.now(); enabled = true;
current = await controller.act(current.head, { kind: "edit", taskId: `task-${count - 1}`, title: "Synthetic benchmark edit", priority: "high", category: "inbox" });
enabled = false;
const elapsedMs = performance.now() - started, transfer = await controller.exportBundle();
console.log(JSON.stringify({ measurement: "triage-performance", runtime: Bun.version, tasks: count, elapsedMs: Math.round(elapsedMs), before, after: current.head, capture: hash(current), transfer: digestCanonical(asJsonValue(transfer, "diagnostic transfer")), states: transfer.states.length, records: transfer.records.length, bytes: new TextEncoder().encode(JSON.stringify(transfer)).byteLength, metrics: Object.fromEntries([...metrics.entries()].map(([key, value]) => [key, { calls: value.calls, inclusiveMs: Math.round(value.inclusiveMs), selfMs: Math.round(value.selfMs) }])) }, null, 2));
