import { expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { loadSourceProject } from "../../../../src/source-project";
import { SourceError, type SourceCompilation } from "../../../../src/source";
import { createSourceDependencyReport } from "../../../../src/source-dependencies";
import { createSourceLock, sourceLockToJson, verifySourceLock } from "../../../../src/source-lock";
import { MemoryStore } from "../../../../src/store-memory";
import { builtinRegistry } from "../../../../src/registry";
import { runOrganism } from "../../../../src/run";
import { verifyReceipt } from "../../../../src/verify";
import { manifestToJson } from "../../../../src/contract";
import type { ErrorCode } from "../../../../src/errors";
import { packOrganism, unpackBundle } from "../../../../src/bundle";
import type { JsonValue } from "../../../../src/values";

type Args = Record<string, Record<string, JsonValue>>;
const projects = `${import.meta.dir}/..`;
const entry = `${import.meta.dir}/main.algal`;
// The imports leave this directory, so the project loads under the parent root.
const load = () => loadSourceProject(entry, { root: projects });
const fixture = async () => JSON.parse(await readFile(`${import.meta.dir}/main.args.json`, "utf8")) as Args;
const SHARED = [["task-planning/score_task.algal", "score_task.algal"], ["task-planning/lib/clamp.algal", "lib/clamp.algal"]] as const;
async function install(compilation: SourceCompilation) {
  const store = new MemoryStore();
  for (const module of compilation.modules) await store.putManifest(module);
  await store.putManifest(compilation.manifest);
  return store;
}
async function execute(compilation: SourceCompilation, args: Args, store?: MemoryStore) {
  return runOrganism({ manifest: compilation.manifest, args, store: store ?? await install(compilation), fns: builtinRegistry(), executors: [] });
}
const withTickets = (args: Args, tickets: JsonValue[]): Args => ({ input: { ...args.input!, tickets } });

test("the support queue scores tickets with the task planner's programs under an explicit source root", async () => {
  const project = await load(), args = await fixture();
  expect(project.entry).toBe("support-queue/main.algal");
  expect(Object.keys(project.sources).sort()).toEqual(["support-queue/main.algal", "support-queue/triage_ticket.algal", "task-planning/lib/clamp.algal", "task-planning/score_task.algal"]);
  expect(project.modules).toHaveLength(3);
  expect(project.analysis).toEqual({ maxAgentCalls: 0, requiredDepth: 3 });
  const receipt = await execute(project, args);
  expect(receipt.outcome).toBe("complete");
  expect(receipt.work.agentCalls).toBe(0);
  expect(receipt.cells.result!.outputs!.out).toEqual([
    { id: "T-101", subject: "Checkout returns an error", priority: 14, hours_left: 23, queue: "urgent" },
    { id: "T-102", subject: "Invoice shows the wrong address", priority: 6, hours_left: 21, queue: "standard" },
    { id: "T-103", subject: "Export button is hard to find", priority: 3, hours_left: 0, queue: "overdue" },
  ]);
  // The clamp caps hours left at the window when a clock reports a negative age.
  const early = await execute(project, withTickets(args, [{ id: "T-104", subject: "Clock skew", urgency: 1, impact: 1, hours_open: -5 }]));
  expect(early.cells.result!.outputs!.out).toEqual([{ id: "T-104", subject: "Clock skew", priority: 3, hours_left: 24, queue: "standard" }]);
  // Without the wider root, the ../ imports are refused before anything compiles.
  const refused = await loadSourceProject(entry).catch((error: unknown) => error);
  expect(refused).toBeInstanceOf(SourceError);
  expect((refused as SourceError).diagnostic).toMatchObject({ message: "import escapes the source project root", source: "triage_ticket.algal" });
});

test("shared programs keep the task planner's source, executable, and interface digests", async () => {
  const queue = await load();
  const planner = await loadSourceProject(`${projects}/task-planning/main.algal`);
  const inspector = await loadSourceProject(`${projects}/task-planning/inspect_task.algal`);
  const queueLock = await createSourceLock(queue.source, queue.compilerOptions);
  const plannerLock = await createSourceLock(planner.source, planner.compilerOptions);
  const unit = (lock: typeof queueLock, key: string) => lock.units.find(candidate => candidate.source === key)!;
  for (const [queueKey, plannerKey] of SHARED) {
    const shared = unit(queueLock, queueKey), original = unit(plannerLock, plannerKey);
    expect(shared.sourceDigest).toBe(original.sourceDigest);
    expect(shared.manifestDigest).toBe(original.manifestDigest);
    expect(queueLock.interfaces[shared.manifestDigest]).toBe(plannerLock.interfaces[original.manifestDigest]!);
    expect(inspector.project.units[plannerKey]!.manifestDigest).toBe(shared.manifestDigest);
  }
  expect((await verifySourceLock(queue.source, queue.compilerOptions, JSON.parse(JSON.stringify(sourceLockToJson(queueLock))))).ok).toBe(true);
  const report = await createSourceDependencyReport(queue.source, { sourceOptions: queue.compilerOptions });
  expect(report.counts).toEqual({ sourceUnits: 4, uniqueModules: 4, dependencyModules: 3, occurrences: 6, compositionEdges: 5, maxDepth: 3 });
  const clampCallers = report.occurrences.filter(occurrence => occurrence.source === "task-planning/lib/clamp.algal").map(occurrence => occurrence.caller?.origin?.source);
  expect(clampCallers).toEqual(["task-planning/score_task.algal", "task-planning/score_task.algal", "support-queue/triage_ticket.algal"]);
  expect(report.modules.every(module => module.effects.transitive.length === 0)).toBe(true);
});

test("the support queue replays from its portable closure", async () => {
  const project = await load(), args = await fixture();
  const store = await install(project), receipt = await execute(project, args, store);
  const bundle = await packOrganism(project.manifest, store), portable = new MemoryStore();
  await unpackBundle(bundle, portable);
  expect(Object.keys(bundle.manifests)).toHaveLength(4);
  for (const [key] of SHARED) expect(Object.hasOwn(bundle.manifests, project.project.units[key]!.manifestDigest)).toBe(true);
  expect(await execute(project, args, portable)).toEqual(receipt);
  expect((await verifyReceipt(receipt as unknown as JsonValue, manifestToJson(project.manifest), portable, builtinRegistry())).ok).toBe(true);
});

test("the support queue fails at the expression that receives a bad value and enforces its ticket limit", async () => {
  const project = await load(), args = await fixture();
  const ticket = (args.input!.tickets as JsonValue[])[0] as Record<string, JsonValue>;
  const atLimit = await execute(project, withTickets(args, Array.from({ length: 8 }, () => ticket)));
  expect(atLimit.outcome).toBe("complete");
  expect(atLimit.cells.result!.outputs!.out as JsonValue[]).toHaveLength(8);
  const cases: [string, Args, ErrorCode, string][] = [
    ["nine tickets", withTickets(args, Array.from({ length: 9 }, () => ticket)), "BUDGET_EXHAUSTED", "result-each"],
    ["a ticket without hours_open", withTickets(args, [{ id: "T-105", subject: "No age", urgency: 1, impact: 1 }]), "EXPR_FAILED", "result-each/i0/b2-hours-left-arg-1"],
    ["a text urgency", withTickets(args, [{ ...ticket, urgency: "high" }]), "EXPR_FAILED", "result-each/i0/b1-priority/b1-urgency/result"],
    ["a text window", { input: { ...args.input!, window: "24h" } }, "EXPR_FAILED", "result-each/i0/b2-hours-left-arg-1"],
  ];
  for (const [label, input, code, path] of cases) {
    const receipt = await execute(project, input);
    expect({ label, outcome: receipt.outcome, code: receipt.failure?.code, path: receipt.failure?.path }).toEqual({ label, outcome: "failed", code, path });
    expect(receipt.cells.result?.outputs).toBeUndefined();
  }
});
