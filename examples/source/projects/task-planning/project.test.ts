import { expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { loadSourceProject } from "../../../../src/source-project";
import { compileSource, type SourceCompilation } from "../../../../src/source";
import { MemoryStore } from "../../../../src/store-memory";
import { builtinRegistry } from "../../../../src/registry";
import { runOrganism } from "../../../../src/run";
import { verifyReceipt } from "../../../../src/verify";
import { manifestToJson } from "../../../../src/contract";
import { packOrganism, unpackBundle } from "../../../../src/bundle";
import type { JsonValue } from "../../../../src/values";

const entry = `${import.meta.dir}/main.algal`;
const fixture = async () => JSON.parse(await readFile(`${import.meta.dir}/main.args.json`, "utf8")) as Record<string, Record<string, JsonValue>>;
async function install(compilation: SourceCompilation) {
  const store = new MemoryStore();
  for (const module of compilation.modules) await store.putManifest(module);
  await store.putManifest(compilation.manifest);
  return store;
}
async function execute(compilation: SourceCompilation, args: Record<string, Record<string, JsonValue>>, store?: MemoryStore) {
  return runOrganism({ manifest: compilation.manifest, args, store: store ?? await install(compilation), fns: builtinRegistry(), executors: [] });
}

test("six-module task plan reuses one helper and replays from a portable closure", async () => {
  const project = await loadSourceProject(entry), args = await fixture();
  expect(project.files).toHaveLength(6);
  expect(project.modules).toHaveLength(5);
  expect(project.analysis).toEqual({ maxAgentCalls: 0, requiredDepth: 3 });
  const clamp = project.project.units["lib/clamp.algal"]!.manifestDigest;
  const calls = project.project.calls.filter(call => call.childSource === "lib/clamp.algal");
  expect(calls).toHaveLength(2);
  expect(calls.every(call => call.childManifestDigest === clamp)).toBe(true);
  const store = await install(project), receipt = await execute(project, args, store);
  expect(receipt.outcome).toBe("complete");
  expect(receipt.work.agentCalls).toBe(0);
  const outputs = receipt.cells.result!.outputs!.out as { task: JsonValue; score: number; action: string; view: { label: string } }[];
  expect(outputs.map(row => row.task)).toEqual(args.input!.tasks as JsonValue[]);
  expect(outputs.map(row => row.score)).toEqual([13, 4, 15]);
  expect(outputs.map(row => row.action)).toEqual(["work next", "review later", "archive"]);
  expect(outputs[0]!.view.label).toBe("Ship the task workspace: work next");
  const bundle = await packOrganism(project.manifest, store), portable = new MemoryStore();
  await unpackBundle(bundle, portable);
  expect(await execute(project, args, portable)).toEqual(receipt);
  expect((await verifyReceipt(receipt as unknown as JsonValue, manifestToJson(project.manifest), portable, builtinRegistry())).ok).toBe(true);
});

test("editing a shared helper changes dependent programs while old bundles retain behavior", async () => {
  const previous = await loadSourceProject(entry), args = await fixture();
  const sources = { ...previous.compilerOptions.modules };
  sources["lib/clamp.algal"] = sources["lib/clamp.algal"]!.replace("else { value }", "else { value + 1 }");
  const next = compileSource(previous.source, { entry: previous.entry, modules: sources });
  const changed = Object.keys(previous.project.units).filter(path => previous.project.units[path]!.manifestDigest !== next.project.units[path]!.manifestDigest).sort();
  expect(changed).toEqual(["lib/clamp.algal", "main.algal", "plan_task.algal", "score_task.algal"]);
  const oldStore = await install(previous), oldRun = await execute(previous, args, oldStore);
  const nextRun = await execute(next, args);
  expect(nextRun.outcome).toBe("complete");
  expect(nextRun.cells.result!.outputs!.out).not.toEqual(oldRun.cells.result!.outputs!.out);
  expect(await execute(previous, args, oldStore)).toEqual(oldRun);
  expect((await verifyReceipt(oldRun as unknown as JsonValue, manifestToJson(previous.manifest), oldStore, builtinRegistry())).ok).toBe(true);
});

test("task plan enforces its collection bound, numeric inputs and shared root work allowance", async () => {
  const project = await loadSourceProject(entry), args = await fixture();
  const task = (args.input!.tasks as JsonValue[])[0]!;
  const atLimit = await execute(project, { input: { tasks: Array.from({ length: 16 }, () => task), weights: args.input!.weights! } });
  expect(atLimit.outcome).toBe("complete");
  expect((atLimit.cells.result!.outputs!.out as JsonValue[])).toHaveLength(16);
  const overflow = await execute(project, { input: { tasks: Array.from({ length: 17 }, () => task), weights: args.input!.weights! } });
  expect(overflow.outcome).toBe("failed");
  expect(overflow.cells.result?.outputs).toBeUndefined();
  const invalid = await execute(project, { input: { tasks: [{ ...(task as object), urgency: "soon" }], weights: args.input!.weights! } });
  expect(invalid.outcome).toBe("failed");
  expect(invalid.cells.result?.outputs).toBeUndefined();
  const limitedSource = project.source.replace("max_steps: 1024", "max_steps: 10");
  const limited = compileSource(limitedSource, { entry: project.entry, modules: { ...project.compilerOptions.modules, [project.entry]: limitedSource } });
  expect((await execute(limited, args)).outcome).toBe("failed");
});
