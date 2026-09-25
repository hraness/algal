import { expect, test } from "bun:test";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { compileSource, SOURCE_BOUNDS, SOURCE_PROFILE, SourceError, type SourceCompilation, type SourceCompilerOptions } from "./source";
import { loadSourceProject } from "./source-project";
import { BOUNDS, manifestToJson, parseOrganismManifest } from "./contract";
import { compileOrganism } from "./graph";
import { builtinRegistry } from "./registry";
import { MemoryStore } from "./store";
import { runOrganism } from "./run";
import { verifyReceipt } from "./verify";
import type { JsonValue } from "./values";

const examples = join(import.meta.dir, "../examples/source");
const pure = (records: string, signature: string, body: string) =>
  `${records}\nprogram main${signature.includes("->") ? signature : `${signature} -> json`} {\n  budget { max_agent_calls: 0 }\n  ${body}\n}`;
function failure(source: string, options?: SourceCompilerOptions): SourceError {
  try { compileSource(source, options); }
  catch (error) { expect(error).toBeInstanceOf(SourceError); return error as SourceError; }
  throw new Error("invalid source was accepted");
}
async function execute(compilation: SourceCompilation, args: Record<string, Record<string, JsonValue>>) {
  const store = new MemoryStore();
  for (const module of compilation.modules) await store.putManifest(module);
  const receipt = await runOrganism({ manifest: compilation.manifest, args, store, fns: builtinRegistry(), executors: [] });
  // Failed and completed receipts both replay offline.
  expect((await verifyReceipt(receipt as unknown as JsonValue, manifestToJson(compilation.manifest), store, builtinRegistry())).ok).toBe(true);
  return receipt;
}

test("record parameters and results lower to json ports with the core schema subset", async () => {
  const source = `record Owner { name: json }
record Task {
  id: text,
  title: text,
  urgency: number,
  done: boolean,
  owner: Owner,
  tags: json,
  notes: text?,
  extra: json?,
}
record Score { id: text, total: number }

program score(task: Task, weight: json) -> Score {
  budget { max_agent_calls: 0 }
  return { id: task.id, total: task.urgency * weight }
}`;
  const compilation = compileSource(source);
  const { manifest, sourceMap } = compilation;
  const input = manifest.cells.find(cell => cell.id === "input");
  expect(input?.kind === "input" && input.outputs).toEqual({
    task: { type: "json", schema: {
      type: "object", required: ["done", "id", "owner", "tags", "title", "urgency"],
      properties: {
        id: { type: "string" }, title: { type: "string" }, urgency: { type: "number" }, done: { type: "boolean" },
        owner: { type: "object", required: ["name"] }, notes: { type: "string" },
      },
    } },
    weight: { type: "json" },
  });
  const result = manifest.cells.find(cell => cell.id === "result");
  expect(result?.kind === "expr" && result.output).toEqual({ kind: "json", schema: {
    type: "object", required: ["id", "total"], properties: { id: { type: "string" }, total: { type: "number" } },
  } });
  expect(manifest.interface?.outputs).toEqual({ result: { cell: "result", port: "out" } });
  expect(parseOrganismManifest(manifestToJson(manifest))).toEqual(manifest);
  await compileOrganism(manifest, builtinRegistry(), new MemoryStore());
  expect(sourceMap.cells.map(cell => cell.cellId)).toEqual(manifest.cells.map(cell => cell.id));
  expect(sourceMap.compilerVersion).toBe(SOURCE_PROFILE.compilerVersion);
  expect(sourceMap.cells.find(cell => cell.cellId === "input")?.annotation?.details).toEqual(["task: Task", "weight: json"]);
  // Field order and formatting are not executable identity; names and types are.
  const reordered = source.replace("  id: text,\n  title: text,", "  title: text,\n  id: text,");
  expect(compileSource(reordered).sourceMap.manifestDigest).toBe(sourceMap.manifestDigest);
  expect(compileSource(source.replace("notes: text?", "notes: text")).sourceMap.manifestDigest).not.toBe(sourceMap.manifestDigest);
  const receipt = await execute(compilation, { input: { task: { id: "a", title: "A", urgency: 3, done: false, owner: { name: null }, tags: [], other: 1 }, weight: 2 } });
  expect(receipt.outcome).toBe("complete");
  expect(receipt.cells.result?.outputs?.out).toEqual({ id: "a", total: 6 });
});

test("record declarations are bounded by count, fields, schema depth, and name rules", () => {
  const records = (count: number) => Array.from({ length: count }, (_, i) => `record R${i} { value: text }`).join("\n");
  expect(() => compileSource(pure(records(SOURCE_BOUNDS.maxRecords), "()", "return 1"))).not.toThrow();
  expect(failure(pure(records(SOURCE_BOUNDS.maxRecords + 1), "()", "return 1")).diagnostic.message).toContain(`at most ${SOURCE_BOUNDS.maxRecords} records`);
  const fields = (count: number) => `record Wide { ${Array.from({ length: count }, (_, i) => `f${i}: number`).join(", ")} }`;
  const wide = compileSource(pure(fields(SOURCE_BOUNDS.maxRecordFields), "(value: Wide)", "return value.f31"));
  expect(wide.manifest.cells[0]?.kind === "input" && wide.manifest.cells[0].outputs.value?.type === "json" && wide.manifest.cells[0].outputs.value.schema?.required).toHaveLength(SOURCE_BOUNDS.maxRecordFields);
  expect(failure(pure(fields(SOURCE_BOUNDS.maxRecordFields + 1), "()", "return 1")).diagnostic.message).toBe(`record Wide exceeds ${SOURCE_BOUNDS.maxRecordFields} fields`);
  // The lowered schema must fit the same depth bound as manifest admission.
  expect(SOURCE_BOUNDS.maxRecordSchemaDepth).toBe(BOUNDS.maxSchemaDepth);
  expect(() => compileSource(pure("record Inner { name: json, tags: json? }\nrecord Outer { inner: Inner, label: text }", "(value: Outer)", "return value.inner.name"))).not.toThrow();
  const deep = "record Inner { name: text }\nrecord Outer { label: text, inner: Inner }";
  const error = failure(pure(deep, "()", "return 1"));
  expect(error.diagnostic.message).toBe(`record Outer nests Inner in field inner beyond the schema depth limit of ${BOUNDS.maxSchemaDepth}; a record used as a field type may contain only json fields`);
  expect(error.diagnostic.span.start).toEqual({ offset: deep.indexOf("inner: Inner"), line: 2, column: deep.split("\n")[1]!.indexOf("inner: Inner") + 1 });
  expect(failure(pure("record A { x: json }\nrecord B { a: A }\nrecord C { b: B }", "()", "return 1")).diagnostic.message).toContain("record C nests B in field b");
  for (const [records, message] of [
    ["record task { id: text }", "uppercase letter"],
    ["record Task_1 { id: text }", "uppercase letter"],
    [`record T${"x".repeat(SOURCE_BOUNDS.maxNameLength)} { id: text }`, "40 characters"],
    ["record Task { id: text }\nrecord Task { name: text }", "duplicate record Task"],
    ["record Task { id: text, id: number }", "duplicate field id in record Task"],
    ["record Task { }", "needs at least one field"],
    ["record Task { text: text }", "non-reserved identifier"],
    ["record Task { owner: cap }", "record fields use text, number, boolean, json"],
    ["record Task { owner: list }", "record fields use text, number, boolean, json"],
    ["record Task { owner: Owner }\nrecord Owner { name: json }", "unknown record type Owner"],
    ["record Task { next: Task }", "unknown record type Task"],
    ["record Task { id: text, }\nrecord Next { id: text? ? }", 'expected ","'],
  ] as const) expect(failure(pure(records, "()", "return 1")).diagnostic.message, records).toContain(message);
  expect(failure(pure("record Task { id: text }", "(task: Task?)", "return 1")).diagnostic.message).toContain('expected ","');
  expect(failure(pure("", "(value: number)", "return 1")).diagnostic.message).toContain("text, json, and declared record types");
  expect(failure(pure("", "(value: Missing)", "return 1")).diagnostic.message).toBe("unknown record type Missing; declare a record before using it");
  expect(failure(`import helper from "./helper.algal"\n${pure("", "()", "return 1")}\nrecord Late { id: text }`).diagnostic.message).toContain("expected");
  expect(failure(`record Early { id: text }\nimport helper from "./helper.algal"\n${pure("", "()", "return 1")}`).diagnostic.message).toBe('expected "program", found "import"');
});

test("record, number, and boolean stay ordinary identifiers outside type positions", async () => {
  const compilation = compileSource(pure("record Pair { record: json, number: number }", "(record: Pair)", "let number = record.number\n  let boolean = { record: record.record, number: number }\n  return boolean"));
  const receipt = await execute(compilation, { input: { record: { record: "r", number: 2 } } });
  expect(receipt.cells.result?.outputs?.out).toEqual({ record: "r", number: 2 });
});

test("the compiler rejects record mismatches the source proves and leaves dynamic JSON to the runtime", () => {
  const child = "record Task { id: text, urgency: number }\nprogram child(task: Task) -> json { budget { max_agent_calls: 0 } return task.urgency }";
  const modules = { "child.algal": child };
  const call = (records: string, signature: string, argument: string) =>
    `import child from "./child.algal"\n${pure(records, signature, `return call child using { task: ${argument} }`)}`;
  expect(() => compileSource(call("", "(value: json)", "value"), { modules })).not.toThrow();
  expect(() => compileSource(call("", "()", '{ id: "a", urgency: 1 }'), { modules })).not.toThrow();
  // A declared record value may be wider than the callee's record.
  expect(() => compileSource(call("record Wide { id: text, urgency: number, owner: text }", "(value: Wide)", "value"), { modules })).not.toThrow();
  for (const [source, message] of [
    [call("", "()", '{ id: "a" }'), "argument task is missing field urgency required by record Task"],
    [call("", "()", '{ id: "a", urgency: "high" }'), "argument task field urgency must be number, found text"],
    [call("", "()", '{ id: "a", urgency: 1, urgent: true }'), "argument task has field urgent, which record Task does not declare"],
    [call("", '(value: text)', "value"), "argument task must be record Task, found text"],
    [call("record Narrow { id: text }", "(value: Narrow)", "value"), "argument task is missing field urgency required by record Task"],
    [call("record Other { id: number, urgency: number }", "(value: Other)", "value"), "argument task field id must be text, found number"],
    [pure("record Score { total: number }", "() -> Score", 'return { total: "high" }'), "return value field total must be number, found text"],
    [pure("record Score { total: number, note: text? }", "() -> Score", "return { total: 1, note: null }"), "return value field note must be text, found null"],
    [pure("record Score { total: number }", "() -> Score", "return [1]"), "return value must be record Score, found list"],
    [pure("record Score { total: number }", "(value: text) -> Score", "return value"), "return value must be record Score, found text"],
    [pure("record Task { id: text }", "(task: Task) -> json", "return task.title"), "unknown record field title"],
    [pure("record Task { id: text }", "(task: Task) -> json", "return task.id * 2"), "expected number, found text"],
    [pure("record Task { note: text? }", "(task: Task) -> text", 'return task.note + "!"'), "expected number, found text"],
  ] as const) expect(failure(source, { modules }).diagnostic.message, source).toBe(message);
  const effects = (body: string) => pure("record Score { total: number }", "(value: text) -> Score", body).replace("max_agent_calls: 0", "max_agent_calls: 1");
  expect(failure(effects('return generate "score" using value')).diagnostic.message).toBe("return value must be record Score, found text");
  expect(failure(effects('return decide "pick" using value as choice { a: "A" }')).diagnostic.message).toBe("return value must be record Score, found decision");
  expect(failure(effects('return if value == "x" { generate "a" using value } else { { total: 1 } }')).diagnostic.message).toBe("return value must be record Score, found text");
});

test("record results declare their schema where the value is produced", async () => {
  const child = (output: string, body: string) => `record Score { total: number }\nprogram child(value: json) -> ${output} { budget { max_agent_calls: 0 } return ${body} }`;
  const root = (records: string) => `import child from "./child.algal"\n${pure(records, "(value: json) -> Score", "return call child using { value: value }")}`;
  // An identical child schema is already checked by the child's result cell.
  const same = compileSource(root("record Score { total: number }"), { modules: { "child.algal": child("Score", "{ total: value }") } });
  expect(same.manifest.cells.map(cell => [cell.id, cell.kind])).toEqual([["input", "input"], ["result-arg-1", "expr"], ["result", "organism"]]);
  expect(same.analysis).toEqual({ maxAgentCalls: 0, requiredDepth: 1 });
  expect((await execute(same, { input: { value: 4 } })).cells.result?.outputs?.result).toEqual({ total: 4 });
  const invalidChild = await execute(same, { input: { value: "four" } });
  expect(invalidChild.failure).toEqual({ code: "TYPE_MISMATCH", message: "expected number", path: "result/result" });
  // A dynamic child result passes through one identity cell with the caller's schema.
  const dynamic = compileSource(root("record Score { total: number }"), { modules: { "child.algal": child("json", "{ total: value }") } });
  expect(dynamic.manifest.cells.map(cell => [cell.id, cell.kind])).toEqual([["input", "input"], ["result-value-arg-1", "expr"], ["result-value", "organism"], ["result", "expr"]]);
  expect(dynamic.sourceMap.cells.find(cell => cell.cellId === "result")?.role).toBe("result-check");
  expect((await execute(dynamic, { input: { value: 4 } })).cells.result?.outputs?.out).toEqual({ total: 4 });
  const rejected = await execute(dynamic, { input: { value: "four" } });
  expect(rejected.failure).toEqual({ code: "TYPE_MISMATCH", message: "expected number", path: "result" });
  expect(rejected.cells["result-value"]?.status).toBe("committed");
  // An effectful branch declares the schema on its merge cell.
  const branch = compileSource(`import child from "./child.algal"\n${pure("record Score { total: number }", "(value: json) -> Score", "return if value == 0 { { total: 0 } } else { call child using { value: value } }")}`, { modules: { "child.algal": child("json", "{ total: value }") } });
  const merge = branch.manifest.cells.find(cell => cell.id === "result");
  expect(merge?.kind === "expr" && merge.output).toEqual({ kind: "json", schema: { type: "object", required: ["total"], properties: { total: { type: "number" } } } });
  expect((await execute(branch, { input: { value: 0 } })).cells.result?.outputs?.out).toEqual({ total: 0 });
  expect((await execute(branch, { input: { value: "four" } })).failure).toEqual({ code: "TYPE_MISMATCH", message: "expected number", path: "result" });
});

test("the runtime rejects malformed record values at each receiving port before dependent cells run", async () => {
  const child = "record Task { id: text, urgency: number, note: text? }\nprogram child(task: Task) -> json { budget { max_agent_calls: 0 } return task.urgency }";
  const modules = { "child.algal": child };
  const root = compileSource(child);
  for (const [task, message] of [
    [{ id: "a", urgency: 1, note: "n", other: [] }, undefined],
    [{ id: "a" }, "missing required field"],
    [{ id: "a", urgency: "high" }, "expected number"],
    [{ id: "a", urgency: 1, note: null }, "expected string"],
    [["a"], "expected object"],
  ] as const) {
    const receipt = await execute(root, { input: { task: task as unknown as JsonValue } });
    if (message === undefined) { expect(receipt.outcome).toBe("complete"); continue; }
    expect(receipt.failure).toEqual({ code: "TYPE_MISMATCH", message, path: "input" });
    expect(receipt.cells.result?.status).toBeUndefined();
  }
  // A call argument is checked on delivery to the call cell.
  const call = compileSource(`import child from "./child.algal"\n${pure("", "(value: json) -> json", "return call child using { task: value }")}`, { modules });
  const delivered = await execute(call, { input: { value: { id: "a", urgency: "high" } } });
  expect(delivered.failure).toEqual({ code: "TYPE_MISMATCH", message: "expected number", path: "result" });
  expect(Object.keys(delivered.cells).some(path => path.startsWith("result/"))).toBe(false);
  // Each element is checked against the child's record before its run starts.
  const each = compileSource(`import child from "./child.algal"\n${pure("", "(tasks: json) -> json", "return each child over task in tasks using {} max_items 3")}`, { modules });
  const items = await execute(each, { input: { tasks: [{ id: "a", urgency: 1 }, { id: "b" }, { id: "c", urgency: 3 }] } });
  expect(items.failure).toEqual({ code: "TYPE_MISMATCH", message: "missing required field", path: "result-each" });
  expect(items.cells["result-each/i0/result"]?.outputs?.out).toBe(1);
  expect(Object.keys(items.cells).filter(path => path.startsWith("result-each/i1") || path.startsWith("result-each/i2"))).toEqual([]);
  expect((await execute(each, { input: { tasks: [{ id: "a", urgency: 1 }, { id: "b", urgency: 2 }] } })).cells.result?.outputs?.out).toEqual([1, 2]);
});

// Digests computed from these files before record syntax existed. Adding the
// syntax must not change the manifest any existing program compiles to.
const pinned: Record<string, string> = {
  "clarify.algal": "sha256:45069941a05fe7504b612975fc9a8ad57a410a99cc37c43df56987860d0dd91f",
  "quote.algal": "sha256:040dae4481f1d996b39019cd9ba8595c837b20a151c661bc86d2a305301c4ea9",
  "reply.algal": "sha256:fa60e616cc9c4474cc3f31962932cc3ff33ac12155f011919b09e2f1e2d08012",
  "route.algal": "sha256:69a990085c0a8a3454d5facac5bc41684b107648d1ac0f07a75468a0dd77c323",
  "uncertain.algal": "sha256:da4e470b18a03926ae69a9706037f77448ed7a1179eba4ea22ea85824db362c9",
  "projects/inbox/draft.algal": "sha256:2239244e0e8a90a7d7f414867977bb72f935c005476c5a02121631a6c56afafb",
  "projects/inbox/inbox.algal": "sha256:7dad396424aa1b81b267ac1cb9b33f042457a94234c16e39a293830439d72b04",
  "projects/ratios/ratio.algal": "sha256:db83448450592317238d3e16f4ff1fdeda4bb490d89c7a395fd3c30962107a74",
  "projects/ratios/ratios.algal": "sha256:5ec7e848d41521355bd6a01554ca3976edabff289cd9901471365ab1a2be56e0",
  "projects/task-planning/choose_action.algal": "sha256:c0838bde6063c8de0aa3db58ff4aaf9a7f97579694412661fb97926a15ff10b9",
  "projects/task-planning/inspect_task.algal": "sha256:f8a28154431c2dd9de6374b52ddc173c21aae1a67e131d95ebe84a88d32effea",
  "projects/task-planning/lib/clamp.algal": "sha256:e0023e6a72961ff823b468d357572507305652cd0a5e9a31648550684db0cb3a",
  "projects/task-planning/main.algal": "sha256:5ce98ce96e9098b3a3d2f4e34a529662d4eb36c19a60291df8c87821874fb78c",
  "projects/task-planning/plan_task.algal": "sha256:465f978b9ce97461f6fbe6c3bc6714f9629d3752b80d06ec0abd2a837bde260d",
  "projects/task-planning/present_task.algal": "sha256:9facfbb6a4015425f1e209c015074f490f6a8b24b591b928c727b241281743cd",
  "projects/task-planning/score_task.algal": "sha256:10ee90055c33b6d21956fff7a53e4e34a3f5074c16298dc83d452bedf9c0d0d0",
};

test("every earlier source example compiles to its pinned executable digest", async () => {
  const actual: Record<string, string> = {};
  for (const file of Object.keys(pinned).filter(name => !name.includes("/"))) {
    actual[file] = compileSource(await readFile(join(examples, file), "utf8")).sourceMap.manifestDigest;
  }
  for (const entry of ["inbox/inbox.algal", "ratios/ratios.algal", "task-planning/main.algal", "task-planning/inspect_task.algal"]) {
    const project = await loadSourceProject(join(examples, "projects", entry));
    for (const [key, map] of Object.entries(project.project.units)) actual[`projects/${entry.split("/")[0]}/${key}`] = map.manifestDigest;
  }
  expect(actual).toEqual(pinned);
  // Every pinned top-level example still exists under its original name.
  const topLevel = (await readdir(examples)).filter(name => name.endsWith(".algal"));
  expect(Object.keys(pinned).filter(name => !name.includes("/")).every(name => topLevel.includes(name))).toBe(true);
});
