import { expect, test } from "bun:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { loadSourceProject } from "../../../../src/source-project";
import { compileSource, SourceError, type SourceCompilation } from "../../../../src/source";
import { createSourceLock, verifySourceLock } from "../../../../src/source-lock";
import { diagnoseSource } from "../../../../src/source-diagnostics";
import { MemoryStore } from "../../../../src/store-memory";
import { builtinRegistry } from "../../../../src/registry";
import { runOrganism } from "../../../../src/run";
import { verifyReceipt } from "../../../../src/verify";
import { manifestToJson } from "../../../../src/contract";
import { packOrganism, unpackBundle } from "../../../../src/bundle";
import type { JsonValue } from "../../../../src/values";

type Args = Record<string, Record<string, JsonValue>>;
const entry = `${import.meta.dir}/scores.algal`;
const fixture = async (name: string) => JSON.parse(await readFile(`${import.meta.dir}/${name}`, "utf8")) as Args;
async function install(compilation: SourceCompilation) {
  const store = new MemoryStore();
  for (const module of compilation.modules) await store.putManifest(module);
  await store.putManifest(compilation.manifest);
  return store;
}
async function execute(compilation: SourceCompilation, args: Args, store?: MemoryStore) {
  const installed = store ?? await install(compilation);
  const receipt = await runOrganism({ manifest: compilation.manifest, args, store: installed, fns: builtinRegistry(), executors: [] });
  expect((await verifyReceipt(receipt as unknown as JsonValue, manifestToJson(compilation.manifest), installed, builtinRegistry())).ok).toBe(true);
  return receipt;
}

test("typed scorer checks every task and returns records from a portable closure", async () => {
  const project = await loadSourceProject(entry), args = await fixture("scores.args.json");
  expect(Object.keys(project.project.units)).toEqual(["score.algal", "scores.algal"]);
  expect(project.modules).toHaveLength(1);
  expect(project.analysis).toEqual({ maxAgentCalls: 0, requiredDepth: 1 });
  const weights = { type: "object", required: ["impact", "urgency"], properties: { urgency: { type: "number" }, impact: { type: "number" } } };
  const root = project.manifest.cells.find(cell => cell.id === "input");
  expect(root?.kind === "input" && root.outputs).toEqual({ tasks: { type: "json" }, weights: { type: "json", schema: weights } });
  const child = project.modules[0]!.cells.find(cell => cell.id === "input");
  expect(child?.kind === "input" && child.outputs.task).toEqual({ type: "json", schema: {
    type: "object", required: ["id", "impact", "status", "title", "urgency"],
    properties: { id: { type: "string" }, title: { type: "string" }, urgency: { type: "number" }, impact: { type: "number" }, status: { type: "string" }, notes: { type: "string" } },
  } });
  const store = await install(project), receipt = await execute(project, args, store);
  expect(receipt.outcome).toBe("complete");
  expect(receipt.work.agentCalls).toBe(0);
  expect(receipt.cells.result!.outputs!.out).toEqual([
    { id: "ship", title: "Ship the task workspace", total: 13, ready: true },
    { id: "polish", title: "Polish the empty state", total: 4, ready: false },
    { id: "backup", title: "Export a backup", total: 15, ready: false },
  ]);
  const bundle = await packOrganism(project.manifest, store), portable = new MemoryStore();
  await unpackBundle(bundle, portable);
  expect(await execute(project, args, portable)).toEqual(receipt);
});

test("a malformed task is rejected before it is scored, and diagnosis names the call", async () => {
  const project = await loadSourceProject(entry), args = await fixture("scores.malformed.args.json");
  const receipt = await execute(project, args);
  expect(receipt.outcome).toBe("failed");
  expect(receipt.failure).toEqual({ code: "TYPE_MISMATCH", message: "expected number", path: "result-each" });
  expect(receipt.cells["result-each/i0/result"]?.status).toBe("committed");
  expect(Object.keys(receipt.cells).filter(path => /^result-each\/i[12]\//.test(path))).toEqual([]);
  expect(receipt.cells.result?.outputs).toBeUndefined();
  const issue = diagnoseSource(receipt, project.source, project.compilerOptions).issues[0]!;
  expect(issue.location?.source).toBe("scores.algal");
  expect(issue.location?.span.start.line).toBe(9);
  for (const [tasks, message] of [
    [[{ id: "ship", title: "Ship", status: "open", urgency: 1 }], "missing required field"],
    [[{ id: "ship", title: "Ship", status: "open", urgency: 1, impact: 1, notes: null }], "expected string"],
    [{ id: "ship" }, 'each cell "result-each" over "task" expected a list'],
    [Array(9).fill((args.input!.tasks as JsonValue[])[0]), 'each cell "result-each" got 9 items, maxItems 8'],
  ] as const) {
    const rejected = await execute(project, { input: { ...args.input, tasks: tasks as unknown as JsonValue } });
    expect(rejected.failure?.message).toBe(message);
    expect(rejected.failure?.path).toBe("result-each");
  }
});

test("malformed weights fail at the root parameter", async () => {
  const project = await loadSourceProject(entry), args = await fixture("scores.args.json");
  for (const weights of [{ urgency: "high", impact: 1 }, { urgency: 2 }, [2, 1]]) {
    const receipt = await execute(project, { input: { ...args.input, weights: weights as JsonValue } });
    expect(receipt.outcome).toBe("failed");
    expect(receipt.failure?.path).toBe("input");
    expect(receipt.failure?.code).toBe("TYPE_MISMATCH");
    expect(Object.keys(receipt.cells)).toEqual(["input"]);
  }
});

test("record declarations are part of the checked interface", async () => {
  const project = await loadSourceProject(entry);
  const modules = project.compilerOptions.modules;
  const mistyped = project.source.replace("using { weights: weights }", 'using { weights: { urgency: "high", impact: 1 } }');
  expect(() => compileSource(mistyped, { entry: project.entry, modules: { ...modules, [project.entry]: mistyped } })).toThrow(SourceError);
  expect(() => compileSource(mistyped, { entry: project.entry, modules: { ...modules, [project.entry]: mistyped } })).toThrow("argument weights field urgency must be number, found text");
  const lock = await createSourceLock(project.source, project.compilerOptions);
  const required = { ...modules, "score.algal": modules["score.algal"]!.replace("notes: text?", "notes: text") };
  const drift = await verifySourceLock(project.source, { entry: project.entry, modules: required }, lock);
  expect(drift.ok).toBe(false);
  expect(drift.drift.find(item => item.kind === "interface")).toMatchObject({ subject: "score.algal" });
});

test("check reports the typed project with the usual source bounds", async () => {
  const dir = await mkdtemp(join(tmpdir(), "algal-typed-tasks-"));
  try {
    const child = Bun.spawn([process.execPath, "cli.ts", "check", entry, "--dir", dir, "--diagnostic-format", "text"],
      { cwd: resolve(import.meta.dir, "../../../.."), stdout: "pipe", stderr: "pipe" });
    const [stdout, stderr, code] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited]);
    expect(code, stderr).toBe(0);
    expect(JSON.parse(stdout).source).toEqual({ entry: "scores.algal", files: 2, maxAgentCalls: 0, requiredDepth: 1 });
  } finally { await rm(dir, { recursive: true, force: true }); }
});
