import { expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { packOrganism } from "./bundle";
import { BOUNDS, type OrganismManifest } from "./contract";
import { scriptedExecutor } from "./effects";
import { AlgalError } from "./errors";
import { builtinRegistry } from "./registry";
import { receiptDigest, runOrganism, type RunReceipt } from "./run";
import { compileSource, type SourceCompilation } from "./source";
import { loadSourceProject } from "./source-project";
import { MemoryStore } from "./store-memory";
import { createSourceDependencyReport, renderSourceDependencies, type SourceDependencyExecutionOccurrence, type SourceDependencyReport } from "./source-dependencies";
import { canonicalize, type JsonObject, type JsonValue } from "./values";

const projects = `${import.meta.dir}/../examples/source/projects`;
type Args = Record<string, Record<string, JsonValue>>;
const json = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
async function run(compilation: SourceCompilation, args: Args, responses?: Record<string, JsonValue>): Promise<RunReceipt> {
  const store = new MemoryStore();
  for (const module of compilation.modules) await store.putManifest(module);
  await store.putManifest(compilation.manifest);
  return runOrganism({ manifest: compilation.manifest, args, store, fns: builtinRegistry(), executors: responses === undefined ? [] : [scriptedExecutor(responses)] });
}
const failure = async (work: Promise<unknown>): Promise<AlgalError> => {
  try { await work; } catch (error) { if (error instanceof AlgalError) return error; throw error; }
  throw new Error("expected an AlgalError");
};
/** Re-sign a modified receipt so only the join's own checks can reject it. */
const redigest = (receipt: RunReceipt): RunReceipt => {
  const { digest: _digest, ...body } = receipt;
  return { ...body, digest: receiptDigest(body) };
};
const at = (entries: readonly SourceDependencyExecutionOccurrence[], path: string) => entries.find(entry => entry.path.join("/") === path)!;
const compositionIds = (manifest: OrganismManifest) => new Set(manifest.cells.filter(cell => cell.kind === "organism" || cell.kind === "each").map(cell => cell.id));
/** Self work without the report: own non-composition cells plus one activation per committed composition cell. */
function independentSelf(receipt: RunReceipt, manifest: OrganismManifest, prefixes: string[]): number {
  const composition = compositionIds(manifest);
  let total = 0;
  for (const prefix of prefixes) {
    for (const [path, cell] of Object.entries(receipt.cells)) {
      if (!path.startsWith(prefix) || path.slice(prefix.length).includes("/")) continue;
      const id = path.slice(prefix.length);
      total += composition.has(id) ? (cell.status === "committed" ? 100 : 0) : cell.work;
    }
  }
  return total;
}
const sums = (execution: SourceDependencyReport["execution"]) => ({
  self: execution!.occurrences.reduce((sum, entry) => sum + entry.selfWork, 0),
  cells: execution!.occurrences.reduce((sum, entry) => sum + entry.cells.committed + entry.cells.skipped + entry.cells.failed + entry.cells.suspended, 0),
  effects: execution!.occurrences.reduce((sum, entry) => sum + entry.effectCells, 0),
});

test("planner receipt attributes every cell, one invocation per item, with reconciled self and inclusive work", async () => {
  const project = await loadSourceProject(`${projects}/task-planning/main.algal`);
  const args = JSON.parse(await readFile(`${projects}/task-planning/main.args.json`, "utf8")) as Args;
  const receipt = await run(project, args);
  expect(receipt.outcome).toBe("complete");
  const report = await createSourceDependencyReport(project.source, { sourceOptions: project.compilerOptions, receipt: json(receipt) });
  const execution = report.execution!;
  expect(execution).toMatchObject({ receiptDigest: receipt.digest, outcome: "complete", verification: "digest-bound", work: receipt.work, unattributed: { cells: 0, work: 0 }, reconciled: true, inconsistencies: [] });
  expect(execution.occurrences.map(entry => entry.path)).toEqual(report.occurrences.map(entry => entry.path));
  expect(execution.occurrences.map(entry => entry.invocations)).toEqual([1, 3, 3, 3, 3, 3, 3]);
  expect(sums(execution).cells).toBe(Object.keys(receipt.cells).length);
  expect(execution.occurrences.every(entry => entry.cells.skipped === 0 && entry.cells.failed === 0 && entry.cells.suspended === 0 && entry.effectCells === 0)).toBe(true);
  expect(execution.occurrences[0]!.inclusiveWork).toBe(receipt.work.units);
  expect(sums(execution).self).toBe(receipt.work.units);
  // Independent recomputation from the receipt and manifests alone.
  const scoreManifest = project.modules.find(module => module.name === "score_task")!;
  const clampManifest = project.modules.find(module => module.name === "clamp")!;
  const root = execution.occurrences[0]!;
  const score = at(execution.occurrences, "result-each/b1-score");
  const urgency = at(execution.occurrences, "result-each/b1-score/b1-urgency");
  expect(root.selfWork).toBe(independentSelf(receipt, project.manifest, [""]));
  expect(score.selfWork).toBe(independentSelf(receipt, scoreManifest, [0, 1, 2].map(item => `result-each/i${item}/b1-score/`)));
  expect(urgency.selfWork).toBe(independentSelf(receipt, clampManifest, [0, 1, 2].map(item => `result-each/i${item}/b1-score/b1-urgency/`)));
  expect(urgency.selfWork).toBe(urgency.inclusiveWork);
  expect(score.inclusiveWork).toBeGreaterThan(score.selfWork);
  // Recorded values stay out of the report: the run's outputs contain task titles and recommendations.
  const text = renderSourceDependencies(report);
  for (const output of [canonicalize(report as unknown as JsonValue), text]) {
    expect(output).not.toContain("Ship the task workspace");
    expect(output).not.toContain("work next");
  }
  expect(text).toContain("with one recorded execution (not replay verification)");
  expect(text).toContain(`Execution: complete · receipt ${receipt.digest} · digest-bound (not replay verification) · ${receipt.work.steps} steps · 0 executor attempts · ${receipt.work.units} work units · reconciled`);
  expect(text).toContain(`result-each/b1-score/b1-urgency  3 invocations · 6 committed · self ${urgency.selfWork} · inclusive ${urgency.inclusiveWork}`);
  expect(text).toContain("Unattributed: 0 cells · 0 work units");
  expect(Object.isFrozen(execution.occurrences)).toBe(true);
  // A bundle and a receipt can be checked together; neither changes the static lists.
  const store = new MemoryStore();
  for (const module of project.modules) await store.putManifest(module);
  await store.putManifest(project.manifest);
  const both = await createSourceDependencyReport(project.source, { sourceOptions: project.compilerOptions, bundle: json(await packOrganism(project.manifest, store)), receipt: json(receipt) });
  expect(both.bundle?.reachable).toBe(6);
  expect(json(both.execution)).toEqual(json(execution));
  expect(json(both.occurrences)).toEqual(json(report.occurrences));
  const plain = await createSourceDependencyReport(project.source, { sourceOptions: project.compilerOptions });
  expect(plain.execution).toBeUndefined();
  expect(JSON.stringify(plain)).not.toContain("execution");
});

const effectSources = {
  "triage.algal": `program triage(note: text) -> json {
  budget { max_agent_calls: 1 }
  let intent = decide "Is this urgent?" using note
    as choice { hot: "Needs attention now", cold: "Can wait" }
  return { label: intent.value }
}`,
  "ping.algal": 'program ping() -> text { budget { max_agent_calls: 1 } return generate "Say pong" using {} }',
};
const effectEntry = `import triage from "./triage.algal"
import ping from "./ping.algal"
program outer(flag: json, notes: json) -> json {
  budget { max_agent_calls: 5, max_depth: 3 }
  let verdicts = each triage over note in notes using {} max_items 3
  let extra = if flag { call ping using {} } else { "skip" }
  return { verdicts: verdicts, extra: extra }
}`;
const decision = (choice: string): JsonValue => ({ answers: { answer: { choice, confidence: 0.9, probabilities: { hot: choice === "hot" ? 0.9 : 0.1, cold: choice === "hot" ? 0.1 : 0.9 } } } });

test("effect cells count recorded generate and decide cells per occurrence, including failed attempts", async () => {
  const compilation = compileSource(effectEntry, { modules: effectSources });
  for (const flag of [false, true]) {
    const receipt = await run(compilation, { input: { flag, notes: ["first", "second"] } }, { "b1-intent-decide": decision("hot"), result: "pong" });
    expect(receipt.outcome).toBe("complete");
    const report = await createSourceDependencyReport(effectEntry, { sourceOptions: { modules: effectSources }, receipt: json(receipt) });
    const execution = report.execution!;
    expect(execution.reconciled).toBe(true);
    const triage = at(execution.occurrences, "b1-verdicts-each");
    const wrapper = at(execution.occurrences, "branch-1-arm-1");
    const ping = at(execution.occurrences, "branch-1-arm-1/call");
    expect([triage.invocations, triage.effectCells]).toEqual([2, 2]);
    expect([wrapper.invocations, wrapper.effectCells, ping.invocations, ping.effectCells]).toEqual(flag ? [1, 0, 1, 1] : [0, 0, 0, 0]);
    expect(execution.occurrences[0]!.effectCells).toBe(0);
    expect(sums(execution).effects).toBe(receipt.work.agentCalls);
    expect(execution.occurrences[0]!.inclusiveWork).toBe(receipt.work.units);
    expect(wrapper.selfWork).toBe(flag ? 200 : 0);
    const text = renderSourceDependencies(report);
    expect(text).toContain(`b1-verdicts-each  2 invocations · ${triage.cells.committed} committed · 2 effect cells`);
    expect(text).not.toContain("pong");
    expect(text).not.toContain("Is this urgent");
  }
  const failed = await run(compilation, { input: { flag: false, notes: ["only"] } }, { "b1-intent-decide": decision("lukewarm"), result: "pong" });
  expect(failed.outcome).toBe("failed");
  const report = await createSourceDependencyReport(effectEntry, { sourceOptions: { modules: effectSources }, receipt: json(failed) });
  const triage = at(report.execution!.occurrences, "b1-verdicts-each");
  expect(triage.effectCells).toBeGreaterThanOrEqual(1);
  expect(triage.cells.failed).toBeGreaterThanOrEqual(1);
  expect(report.execution!.unattributed).toEqual({ cells: 0, work: 0 });
});

test("inactive branches keep zero-invocation occurrences visible and skipped cells on the caller", async () => {
  const child = 'program child() -> text { budget { max_agent_calls: 0 } return "active" }';
  const source = 'import child from "./child.algal" program main(enabled: json) -> text { budget { max_agent_calls: 0 } return if enabled == true { call child using {} } else { "inactive" } }';
  const modules = { "child.algal": child };
  const compilation = compileSource(source, { modules });
  for (const enabled of [false, true]) {
    const receipt = await run(compilation, { input: { enabled } });
    expect(receipt.outcome).toBe("complete");
    const report = await createSourceDependencyReport(source, { sourceOptions: { modules }, receipt: json(receipt) });
    expect(report.occurrences.map(entry => entry.path.join("/"))).toEqual(["", "branch-1-arm-1", "branch-1-arm-1/call"]);
    const [root, wrapper, inner] = report.execution!.occurrences;
    expect([wrapper!.invocations, inner!.invocations]).toEqual(enabled ? [1, 1] : [0, 0]);
    expect(wrapper!.cells.committed + inner!.cells.committed).toBe(enabled ? Object.keys(receipt.cells).filter(path => path.startsWith("branch-1-arm-1/")).length : 0);
    expect(root!.cells.skipped).toBeGreaterThan(0);
    expect(root!.cells.committed + root!.cells.skipped).toBe(Object.keys(receipt.cells).filter(path => !path.includes("/")).length);
    expect(root!.inclusiveWork).toBe(receipt.work.units);
    expect(root!.selfWork).toBe(independentSelf(receipt, compilation.manifest, [""]));
    expect(report.execution!.reconciled).toBe(true);
    expect(report.execution!.unattributed).toEqual({ cells: 0, work: 0 });
    const text = renderSourceDependencies(report);
    expect(text).toContain(enabled ? "branch-1-arm-1/call  1 invocation" : "branch-1-arm-1/call  0 invocations · no recorded cells · self 0 · inclusive 0");
  }
});

test("a failed run attributes the failing cell to its occurrence without hiding the failure path", async () => {
  const project = await loadSourceProject(`${projects}/ratios/ratios.algal`);
  const args = JSON.parse(await readFile(`${projects}/ratios/ratios.args.json`, "utf8")) as Args;
  const receipt = await run(project, args);
  expect(receipt.outcome).toBe("failed");
  expect(receipt.failure?.path?.startsWith("result-each/i1/")).toBe(true);
  const report = await createSourceDependencyReport(project.source, { sourceOptions: project.compilerOptions, receipt: json(receipt) });
  const [root, ratio] = report.execution!.occurrences;
  expect(report.execution!.outcome).toBe("failed");
  expect(ratio!.path).toEqual(["result-each"]);
  expect(ratio!.cells.failed).toBe(1);
  expect(ratio!.invocations).toBe(2);
  expect(root!.cells.failed + ratio!.cells.failed).toBe(Object.values(receipt.cells).filter(cell => cell.status === "failed").length);
  expect(root!.inclusiveWork).toBe(receipt.work.units);
  expect(report.execution!.reconciled).toBe(true);
  expect(report.execution!.unattributed).toEqual({ cells: 0, work: 0 });
  const text = renderSourceDependencies(report);
  expect(text).toContain("Execution: failed · receipt");
  expect(receipt.failure!.message.length).toBeGreaterThan(0);
  expect(text).not.toContain(receipt.failure!.message);
  expect(canonicalize(report as unknown as JsonValue)).not.toContain(receipt.failure!.message);
});

test("receipts must bind to the recompiled root and unresolvable paths stay unattributed", async () => {
  const planner = await loadSourceProject(`${projects}/task-planning/main.algal`);
  const inspector = await loadSourceProject(`${projects}/task-planning/inspect_task.algal`);
  const plannerArgs = JSON.parse(await readFile(`${projects}/task-planning/main.args.json`, "utf8")) as Args;
  const inspectorArgs = JSON.parse(await readFile(`${projects}/task-planning/inspect_task.args.json`, "utf8")) as Args;
  const inspect = (receipt: unknown) => createSourceDependencyReport(planner.source, { sourceOptions: planner.compilerOptions, receipt });
  const foreign = await run(inspector, inspectorArgs);
  const wrongRoot = await failure(inspect(json(foreign)));
  expect(wrongRoot.code).toBe("DIGEST_MISMATCH");
  expect(wrongRoot.message).toContain("root manifest");
  const receipt = await run(planner, plannerArgs);
  const tampered = json(receipt) as unknown as JsonObject;
  tampered.outcome = "stuck";
  const forgedOutcome = await failure(inspect(tampered));
  expect(forgedOutcome.code).toBe("DIGEST_MISMATCH");
  expect(forgedOutcome.message).toContain("receipt digest");
  const renamed = await failure(inspect(json(redigest({ ...receipt, manifestKey: "organism:other" }))));
  expect(renamed.code).toBe("DIGEST_MISMATCH");
  expect(renamed.message).toContain("root manifest");
  expect((await failure(inspect({ contract: "algal.run.v1" }))).code).toBe("PARSE_FAILED");
  // A self-consistent receipt with paths the static tree cannot own: each is counted, none is guessed.
  const forged = json(receipt);
  const strays = ["result-each/i01/result", "nowhere", "result-each/i0/b1-score-arg-1/x", "result-each/i0", "result-each/i99/result", "result-each/i16/result", "result-each/r0/result", "result-each/i0/b1-score/b1-urgency/result/deeper"];
  for (const path of strays) (forged.cells as Record<string, { status: "committed"; work: number }>)[path] = { status: "committed", work: 7 };
  const report = await inspect(json(redigest(forged)));
  const clean = await inspect(json(receipt));
  expect(report.execution!.unattributed).toEqual({ cells: strays.length, work: 7 * strays.length });
  expect(json(report.execution!.occurrences)).toEqual(json(clean.execution!.occurrences));
  expect(report.execution!.reconciled).toBe(true);
  expect(renderSourceDependencies(report)).toContain(`Unattributed: ${strays.length} cells · ${7 * strays.length} work units`);
  // The boundary item index is attributed while the first out-of-bound index is not.
  const boundary = json(receipt);
  (boundary.cells as Record<string, { status: "committed"; work: number }>)["result-each/i15/input"] = { status: "committed", work: 3 };
  const edge = await inspect(json(redigest(boundary)));
  expect(edge.execution!.unattributed).toEqual({ cells: 0, work: 0 });
  expect(at(edge.execution!.occurrences, "result-each").invocations).toBe(4);
});

test("forged but self-consistent receipts are reported as not reconciled", async () => {
  const child = 'program child() -> text { budget { max_agent_calls: 0 } return "active" }';
  const source = 'import child from "./child.algal" program main(enabled: json) -> text { budget { max_agent_calls: 0 } return if enabled == true { call child using {} } else { "inactive" } }';
  const modules = { "child.algal": child };
  const compilation = compileSource(source, { modules });
  const inspect = (receipt: unknown) => createSourceDependencyReport(source, { sourceOptions: { modules }, receipt });
  const active = await run(compilation, { input: { enabled: true } });
  const inflated = json(active);
  inflated.cells["branch-1-arm-1/input"]!.work = 1_000_000;
  const negative = (await inspect(json(redigest(inflated)))).execution!;
  expect(negative.reconciled).toBe(false);
  expect(negative.inconsistencies).toEqual(["negative-self-work"]);
  expect(negative.occurrences[0]!.selfWork).toBeLessThan(0);
  expect(renderSourceDependencies(await inspect(json(redigest(inflated))))).toContain("not reconciled: negative-self-work");
  const rootInflated = json(active);
  rootInflated.cells["result"]!.work += 1;
  const mismatch = (await inspect(json(redigest(rootInflated)))).execution!;
  expect(mismatch.inconsistencies).toEqual(["root-work-mismatch"]);
  expect(mismatch.occurrences[0]!.inclusiveWork).toBe(active.work.units + 1);
  const inactive = await run(compilation, { input: { enabled: false } });
  const orphan = json(inactive);
  (orphan.cells as Record<string, { status: "committed"; work: number }>)["branch-1-arm-1/call/result"] = { status: "committed", work: 0 };
  const orphaned = (await inspect(json(redigest(orphan)))).execution!;
  expect(orphaned.inconsistencies).toContain("invocation-without-parent-record");
  expect(at(orphaned.occurrences, "branch-1-arm-1/call").invocations).toBe(1);
  const oversized = json(active);
  oversized.cells["result"]!.work = BOUNDS.maxWork + 1;
  expect((await inspect(json(redigest(oversized)))).execution!.inconsistencies).toContain("cell-work-exceeds-runtime-limit");
  // The runtime's own receipts reconcile.
  expect((await inspect(json(active))).execution!.reconciled).toBe(true);
  expect((await inspect(json(inactive))).execution!.reconciled).toBe(true);
});

test("receipts are copied before any check, so later mutation, getters and forged messages cannot reach the report", async () => {
  const project = await loadSourceProject(`${projects}/task-planning/main.algal`);
  const args = JSON.parse(await readFile(`${projects}/task-planning/main.args.json`, "utf8")) as Args;
  const receipt = await run(project, args);
  const inspect = (value: unknown) => createSourceDependencyReport(project.source, { sourceOptions: project.compilerOptions, receipt: value });
  const live = json(receipt) as unknown as JsonObject;
  const pending = inspect(live);
  live.outcome = "stuck";
  (live.cells as JsonObject).result = { status: "committed", work: "7\nFAKE LINE" } as unknown as JsonValue;
  const report = await pending;
  expect(report.execution!.outcome).toBe("complete");
  expect(report.execution!.reconciled).toBe(true);
  expect(renderSourceDependencies(report)).not.toContain("FAKE LINE");
  let reads = 0;
  const trapped = { ...json(receipt) } as unknown as Record<string, unknown>;
  const cells = trapped.cells;
  Object.defineProperty(trapped, "cells", { get: () => { reads++; return cells; }, enumerable: true });
  expect((await failure(inspect(trapped))).code).toBe("PARSE_FAILED");
  expect(reads).toBe(0);
  let nested: unknown = [];
  for (let depth = 0; depth < 70; depth++) nested = [nested];
  expect((await failure(inspect({ ...json(receipt), events: nested }))).code).toBe("BUDGET_EXHAUSTED");
  const forged = json(receipt);
  forged.outcome = "failed";
  forged.failure = { code: "EXPR_FAILED", message: "SENTINEL_FAILURE_MESSAGE", path: "result" };
  const signed = await inspect(json(redigest(forged)));
  expect(signed.execution!.outcome).toBe("failed");
  for (const output of [canonicalize(signed as unknown as JsonValue), renderSourceDependencies(signed)]) expect(output).not.toContain("SENTINEL_FAILURE_MESSAGE");
});
