import { expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { AlgalError } from "./errors";
import { builtinRegistry } from "./registry";
import { receiptDigest, runOrganism, type RunReceipt } from "./run";
import { compileSource, type SourceCompilation } from "./source";
import { loadSourceProject } from "./source-project";
import { MemoryStore } from "./store-memory";
import { createSourceDependencyReport, renderSourceDependencies, type SourceDependencyExecutionOccurrence } from "./source-dependencies";
import type { JsonObject, JsonValue } from "./values";

const projects = `${import.meta.dir}/../examples/source/projects`;
type Args = Record<string, Record<string, JsonValue>>;
const json = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
async function run(compilation: SourceCompilation, args: Args): Promise<RunReceipt> {
  const store = new MemoryStore();
  for (const module of compilation.modules) await store.putManifest(module);
  await store.putManifest(compilation.manifest);
  return runOrganism({ manifest: compilation.manifest, args, store, fns: builtinRegistry(), executors: [] });
}
const failure = async (work: Promise<unknown>): Promise<AlgalError> => {
  try { await work; } catch (error) { if (error instanceof AlgalError) return error; throw error; }
  throw new Error("expected an AlgalError");
};
/** Work of the cells one level under a recorded invocation prefix, computed without the report. */
const ownedWork = (receipt: RunReceipt, prefix: string): number => Object.entries(receipt.cells)
  .filter(([path]) => path.startsWith(prefix) && !path.slice(prefix.length).includes("/"))
  .reduce((sum, [, cell]) => sum + cell.work, 0);
const at = (entries: readonly SourceDependencyExecutionOccurrence[], path: string) => entries.find(entry => entry.path.join("/") === path)!;

test("planner receipt attributes every cell, one invocation per item, with self and inclusive work that reconcile", async () => {
  const project = await loadSourceProject(`${projects}/task-planning/main.algal`);
  const args = JSON.parse(await readFile(`${projects}/task-planning/main.args.json`, "utf8")) as Args;
  const receipt = await run(project, args);
  expect(receipt.outcome).toBe("complete");
  const report = await createSourceDependencyReport(project.source, { sourceOptions: project.compilerOptions, receipt: json(receipt) });
  const execution = report.execution!;
  expect(execution).toMatchObject({ receiptDigest: receipt.digest, outcome: "complete", verification: "digest-bound", work: receipt.work, unattributed: { cells: 0, work: 0 } });
  expect(execution.occurrences.map(entry => entry.path)).toEqual(report.occurrences.map(entry => entry.path));
  expect(execution.occurrences.map(entry => entry.invocations)).toEqual([1, 3, 3, 3, 3, 3, 3]);
  expect(execution.occurrences.reduce((sum, entry) => sum + entry.cells.committed, 0)).toBe(Object.keys(receipt.cells).length);
  expect(execution.occurrences.every(entry => entry.cells.skipped === 0 && entry.cells.failed === 0 && entry.cells.suspended === 0 && entry.effectCells === 0)).toBe(true);
  expect(execution.occurrences[0]!.inclusiveWork).toBe(receipt.work.units);
  expect(execution.occurrences.reduce((sum, entry) => sum + entry.selfWork, 0)).toBe(receipt.work.units);
  const urgency = at(execution.occurrences, "result-each/b1-score/b1-urgency");
  const impact = at(execution.occurrences, "result-each/b1-score/b2-impact");
  const score = at(execution.occurrences, "result-each/b1-score");
  expect(urgency.inclusiveWork).toBe([0, 1, 2].reduce((sum, item) => sum + ownedWork(receipt, `result-each/i${item}/b1-score/b1-urgency/`), 0));
  expect(urgency.selfWork).toBe(urgency.inclusiveWork);
  expect(score.inclusiveWork).toBe([0, 1, 2].reduce((sum, item) => sum + ownedWork(receipt, `result-each/i${item}/b1-score/`), 0));
  expect(score.selfWork).toBe(score.inclusiveWork - urgency.inclusiveWork - impact.inclusiveWork);
  expect(score.selfWork).toBeGreaterThan(0);
  const text = renderSourceDependencies(report);
  expect(text).toContain(`Execution: complete · receipt ${receipt.digest} · digest-bound (not replay verification) · ${receipt.work.steps} steps · 0 executor attempts · ${receipt.work.units} work units`);
  expect(text).toContain(`result-each/b1-score/b1-urgency  3 invocations · 6 committed · self ${urgency.selfWork} · inclusive ${urgency.inclusiveWork}`);
  expect(text).toContain("Unattributed: 0 cells · 0 work");
  expect(Object.isFrozen(execution.occurrences)).toBe(true);
  const plain = await createSourceDependencyReport(project.source, { sourceOptions: project.compilerOptions });
  expect(plain.execution).toBeUndefined();
  expect(JSON.stringify(plain)).not.toContain("execution");
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
    expect(report.execution!.occurrences.reduce((sum, entry) => sum + entry.selfWork, 0)).toBe(receipt.work.units);
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
  expect(report.execution!.unattributed).toEqual({ cells: 0, work: 0 });
  expect(report.execution!.occurrences.reduce((sum, entry) => sum + entry.selfWork, 0)).toBe(root!.inclusiveWork);
  expect(renderSourceDependencies(report)).toContain("Execution: failed · receipt");
});

test("receipts must bind to the recompiled root and unresolvable paths stay unattributed", async () => {
  const planner = await loadSourceProject(`${projects}/task-planning/main.algal`);
  const inspector = await loadSourceProject(`${projects}/task-planning/inspect_task.algal`);
  const plannerArgs = JSON.parse(await readFile(`${projects}/task-planning/main.args.json`, "utf8")) as Args;
  const inspectorArgs = JSON.parse(await readFile(`${projects}/task-planning/inspect_task.args.json`, "utf8")) as Args;
  const foreign = await run(inspector, inspectorArgs);
  const wrongRoot = await failure(createSourceDependencyReport(planner.source, { sourceOptions: planner.compilerOptions, receipt: json(foreign) }));
  expect(wrongRoot.code).toBe("DIGEST_MISMATCH");
  expect(wrongRoot.message).toContain("root manifest");
  const receipt = await run(planner, plannerArgs);
  const tampered = json(receipt) as unknown as JsonObject;
  tampered.outcome = "stuck";
  const forgedOutcome = await failure(createSourceDependencyReport(planner.source, { sourceOptions: planner.compilerOptions, receipt: tampered }));
  expect(forgedOutcome.code).toBe("DIGEST_MISMATCH");
  expect(forgedOutcome.message).toContain("receipt digest");
  expect((await failure(createSourceDependencyReport(planner.source, { sourceOptions: planner.compilerOptions, receipt: { contract: "algal.run.v1" } }))).code).toBe("PARSE_FAILED");
  // A self-consistent receipt with paths the static tree cannot own: each is counted, none is guessed.
  const forged = json(receipt) as unknown as RunReceipt;
  const strays = ["result-each/i01/result", "nowhere", "result-each/i0/b1-score-arg-1/x", "result-each/i0", "result-each/i99/result", "result-each/i0/b1-score/b1-urgency/result/deeper"];
  for (const path of strays) (forged.cells as Record<string, { status: "committed"; work: number }>)[path] = { status: "committed", work: 7 };
  const { digest: _digest, ...body } = forged;
  forged.digest = receiptDigest(body);
  const report = await createSourceDependencyReport(planner.source, { sourceOptions: planner.compilerOptions, receipt: json(forged) });
  const clean = await createSourceDependencyReport(planner.source, { sourceOptions: planner.compilerOptions, receipt: json(receipt) });
  expect(report.execution!.unattributed).toEqual({ cells: strays.length, work: 7 * strays.length });
  expect(json(report.execution!.occurrences)).toEqual(json(clean.execution!.occurrences));
  expect(renderSourceDependencies(report)).toContain(`Unattributed: ${strays.length} cells · ${7 * strays.length} work`);
});
