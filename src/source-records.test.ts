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
  // The lowered schema must fit schema version 2's level bound.
  expect(SOURCE_BOUNDS.maxRecordSchemaLevels).toBe(BOUNDS.maxSchemaLevels);
  expect(() => compileSource(pure("record Inner { name: json, tags: json? }\nrecord Outer { inner: Inner, label: text }", "(value: Outer)", "return value.inner.name"))).not.toThrow();
  // Eight levels compile; a ninth is refused at the field that adds it.
  const chain = (levels: number) => ["record R1 { value: text }", ...Array.from({ length: levels - 2 }, (_, i) => `record R${i + 2} { label: text, next: R${i + 1} }`)].join("\n");
  expect(() => compileSource(pure(chain(8), "(value: R7) -> text", "return value.next.label"))).not.toThrow();
  const deep = chain(9);
  const error = failure(pure(deep, "()", "return 1"));
  expect(error.diagnostic.message).toBe(`record R8 nests field next beyond the schema limit of ${BOUNDS.maxSchemaLevels} levels`);
  const line = deep.split("\n").length;
  expect(error.diagnostic.span.start).toEqual({ offset: deep.lastIndexOf("next: R7"), line, column: deep.split("\n")[line - 1]!.indexOf("next: R7") + 1 });
  for (const [records, message] of [
    ["record task { id: text }", "uppercase letter"],
    ["record Task_1 { id: text }", "uppercase letter"],
    [`record T${"x".repeat(SOURCE_BOUNDS.maxNameLength)} { id: text }`, "40 characters"],
    ["record Task { id: text }\nrecord Task { name: text }", "duplicate record Task"],
    ["record Task { id: text, id: number }", "duplicate field id in record Task"],
    ["record Task { }", "needs at least one field"],
    ["record Task { text: text }", "non-reserved identifier"],
    ["record Task { owner: cap }", "record fields and list items use text, number, integer, boolean, json"],
    ["record Task { owner: list }", "a list such as [Task]"],
    ["record Task { owner: Owner }\nrecord Owner { name: json }", "unknown record type Owner"],
    ["record Task { next: Task }", "unknown record type Task"],
    ["record Task { id: text, }\nrecord Next { id: text? ? }", 'expected ","'],
  ] as const) expect(failure(pure(records, "()", "return 1")).diagnostic.message, records).toContain(message);
  expect(failure(pure("record Task { id: text }", "(task: Task?)", "return 1")).diagnostic.message).toContain('expected ","');
  expect(failure(pure("", "(value: number)", "return 1")).diagnostic.message).toContain("text, json, declared record types, and list types");
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

const taskRecords = `record Owner { name: text, team: text in ["platform", "design"] }
record Task {
  id: text,
  status: text in ["open", "done", "blocked"],
  urgency: number min 0 max 5,
  size: number in [5, 1, 2],
  score: number min -1.5,
  cap: number max 10,
  owner: Owner,
  tags: [text],
  steps: [text in ["a", "b"]]?,
  anything: [json],
}
record Plain { id: text, done: boolean }`;
const taskSchema = {
  type: "object", required: ["anything", "cap", "id", "owner", "score", "size", "status", "tags", "urgency"],
  properties: {
    id: { type: "string" },
    status: { type: "string", enum: ["blocked", "done", "open"] },
    urgency: { type: "number", minimum: 0, maximum: 5 },
    size: { type: "number", enum: [1, 2, 5] },
    score: { type: "number", minimum: -1.5 },
    cap: { type: "number", maximum: 10 },
    owner: { type: "object", required: ["name", "team"], properties: { name: { type: "string" }, team: { type: "string", enum: ["design", "platform"] } } },
    tags: { type: "array", items: { type: "string" } },
    steps: { type: "array", items: { type: "string", enum: ["a", "b"] } },
    anything: { type: "array" },
  },
};
const plainSchema = { type: "object", required: ["done", "id"], properties: { id: { type: "string" }, done: { type: "boolean" } } };
const task = (fields: Record<string, JsonValue> = {}): Record<string, JsonValue> =>
  ({ id: "t", status: "open", urgency: 3, size: 2, score: 0, cap: 1, owner: { name: "N", team: "design" }, tags: [], anything: [1, "x"], ...fields });

test("list, allowed-value, and range types lower to schema version 2 only where needed", async () => {
  const source = pure(taskRecords, "(tasks: [Task], plain: Plain, extra: [json]) -> [Plain]", "return [plain]");
  const compilation = compileSource(source);
  const input = compilation.manifest.cells.find(cell => cell.id === "input");
  expect(input?.kind === "input" && input.outputs).toEqual({
    tasks: { type: "json", schema: { type: "array", items: taskSchema }, schemaVersion: 2 },
    // A schema without version 2 keywords or deeper nesting stays version 1.
    plain: { type: "json", schema: plainSchema },
    extra: { type: "json", schema: { type: "array" } },
  });
  const result = compilation.manifest.cells.find(cell => cell.id === "result");
  expect(result?.kind === "expr" && result.output).toEqual({ kind: "json", schema: { type: "array", items: plainSchema }, schemaVersion: 2 });
  await compileOrganism(compilation.manifest, builtinRegistry(), new MemoryStore());
  expect(compilation.sourceMap.cells.find(cell => cell.cellId === "input")?.annotation?.details).toEqual(["tasks: [Task]", "plain: Plain", "extra: [json]"]);
  // Allowed values are sorted, so their order is not executable identity.
  const reordered = source.replace('["open", "done", "blocked"]', '["blocked", "open", "done"]').replace("[5, 1, 2]", "[2, 5, 1]");
  expect(compileSource(reordered).sourceMap.manifestDigest).toBe(compilation.sourceMap.manifestDigest);
  expect(compileSource(source.replace("max 5", "max 6")).sourceMap.manifestDigest).not.toBe(compilation.sourceMap.manifestDigest);
  const receipt = await execute(compilation, { input: { tasks: [task(), task({ steps: ["b"], extra: true })], plain: { id: "p", done: false }, extra: [] } });
  expect(receipt.outcome).toBe("complete");
  expect(receipt.cells.result?.outputs?.out).toEqual([{ id: "p", done: false }]);
});

test("the runtime checks lists, allowed values, bounds, and nesting where values enter a program", async () => {
  const compilation = compileSource(pure(taskRecords, "(tasks: [Task]) -> json", "return tasks"));
  for (const [tasks, message] of [
    [task(), "expected array"],
    [[task(), "t"], "item 1: expected object"],
    [[task(), task({ status: "later" })], "item 1: expected an allowed value"],
    [[task({ urgency: 5.5 })], "item 0: number above maximum"],
    [[task({ urgency: -0.5 })], "item 0: number below minimum"],
    [[task({ size: 3 })], "item 0: expected an allowed value"],
    [[task({ score: -2 })], "item 0: number below minimum"],
    [[task({ owner: { name: "N", team: "sales" } })], "item 0: expected an allowed value"],
    [[task({ owner: { team: "design" } })], "item 0: missing required field"],
    [[task({ tags: ["x", 2] })], "item 0: item 1: expected string"],
    [[task({ steps: ["a", "c"] })], "item 0: item 1: expected an allowed value"],
    [[task({ anything: {} })], "item 0: expected array"],
  ] as const) {
    const receipt = await execute(compilation, { input: { tasks: tasks as unknown as JsonValue } });
    expect(receipt.failure, JSON.stringify(tasks)).toEqual({ code: "TYPE_MISMATCH", message, path: "input" });
  }
  // A record nested beyond version 1's depth is checked in full.
  const nested = compileSource(pure("record Inner { name: text }\nrecord Outer { label: text, inner: Inner }", "(value: Outer) -> text", "return value.inner.name"));
  const port = nested.manifest.cells.find(cell => cell.id === "input");
  expect(port?.kind === "input" && port.outputs.value).toEqual({ type: "json", schemaVersion: 2, schema: {
    type: "object", required: ["inner", "label"], properties: { label: { type: "string" }, inner: { type: "object", required: ["name"], properties: { name: { type: "string" } } } } } });
  expect((await execute(nested, { input: { value: { label: "l", inner: { name: 3 } } } })).failure).toEqual({ code: "TYPE_MISMATCH", message: "expected string", path: "input" });
  expect((await execute(nested, { input: { value: { label: "l", inner: { name: "n" } } } })).cells.result?.outputs?.out).toBe("n");
  // A call argument, an each item, and a list result use the child's or caller's schema.
  const child = `${taskRecords}\nprogram child(task: Task) -> number { budget { max_agent_calls: 0 } return task.urgency }`.replace("-> number", "-> json");
  const modules = { "child.algal": child };
  const call = compileSource(`import child from "./child.algal"\n${pure("", "(value: json) -> json", "return call child using { task: value }")}`, { modules });
  expect((await execute(call, { input: { value: task({ status: "later" }) } })).failure).toEqual({ code: "TYPE_MISMATCH", message: "expected an allowed value", path: "result" });
  const each = compileSource(`import child from "./child.algal"\n${pure("record Score { id: text }", "(tasks: json) -> [Score]", "return each child over task in tasks using {} max_items 3")}`, { modules });
  const items = await execute(each, { input: { tasks: [task(), task({ urgency: 9 })] } });
  expect(items.failure).toEqual({ code: "TYPE_MISMATCH", message: "number above maximum", path: "result-value-each" });
  expect(items.cells["result-value-each/i0/result"]?.outputs?.out).toBe(3);
  // The child returns urgency numbers, which the caller's [Score] result rejects.
  expect((await execute(each, { input: { tasks: [task()] } })).failure).toEqual({ code: "TYPE_MISMATCH", message: "item 0: expected object", path: "result" });
});

test("allowed text values are a closed choice that match covers exactly", async () => {
  const source = (arms: string) => pure(taskRecords, "(task: Task) -> json", `return match task.status { ${arms} }`);
  const compilation = compileSource(source("open => 1, done => 2, blocked => 3"));
  expect((await execute(compilation, { input: { task: task({ status: "blocked" }) } })).cells.result?.outputs?.out).toBe(3);
  expect(failure(source("open => 1, done => 2")).diagnostic.message).toBe("match must cover exactly: blocked, done, open");
});

test("the compiler rejects allowed-value, bound, and list mismatches the source proves", () => {
  const child = `${taskRecords}\nprogram child(task: Task) -> json { budget { max_agent_calls: 0 } return task.urgency }`;
  const modules = { "child.algal": child };
  const defaults: Record<string, string> = { id: '"t"', status: '"open"', urgency: "3", size: "2", score: "0", cap: "1", owner: '{ name: "N", team: "design" }', tags: "[]", anything: "[]" };
  const literal = (fields: Record<string, string> = {}) => `{ ${Object.entries({ ...defaults, ...fields }).map(([key, value]) => `${key}: ${value}`).join(", ")} }`;
  const call = (records: string, signature: string, argument: string) =>
    `import child from "./child.algal"\n${pure(records, signature, `return call child using { task: ${argument} }`)}`;
  expect(() => compileSource(call("", "()", literal()), { modules })).not.toThrow();
  expect(() => compileSource(call("", "()", literal({ steps: '["a"]', urgency: "-0", score: "-1.5" })), { modules })).not.toThrow();
  for (const [source, message] of [
    [call("", "()", literal({ status: '"closed"' })), 'argument task field status must be one of the allowed values, found "closed"'],
    [call("", "()", literal({ urgency: "7" })), "argument task field urgency must be at most 5, found 7"],
    [call("", "()", literal({ urgency: "-1" })), "argument task field urgency must be at least 0, found -1"],
    [call("", "()", literal({ size: "4" })), "argument task field size must be one of the allowed values, found 4"],
    [call("", "()", literal({ tags: "[1]" })), "argument task field tags item 0 must be text, found number"],
    [call("", "()", literal({ tags: '"x"' })), "argument task field tags must be [text], found text"],
    [call("", "()", literal({ steps: '["c"]' })), 'argument task field steps item 0 must be one of the allowed values, found "c"'],
    [call("", "()", literal({ owner: '{ name: "N", team: "sales" }' })), 'argument task field owner field team must be one of the allowed values, found "sales"'],
    [call("record Loose { status: text }", "(value: Loose)", literal({ status: "value.status" })), undefined],
    [pure("record Plain { id: text }", "() -> [Plain]", "return [{ id: 1 }]"), "return value item 0 field id must be text, found number"],
    [pure("record Plain { id: text }", "() -> [Plain]", 'return { id: "p" }'), "return value must be [Plain], found record"],
    [pure("record Level { value: number in [1, 2] }", "(level: Level) -> json", "return level.value + 1"), undefined],
  ] as const) {
    if (message === undefined) expect(() => compileSource(source, { modules })).not.toThrow();
    else expect(failure(source, { modules }).diagnostic.message, source).toBe(message);
  }
  // A decision's closed labels must all be allowed values.
  const decided = (labels: string) => call("", "(email: text)", literal({ status: "pick.value" })).replace("max_agent_calls: 0", "max_agent_calls: 1")
    .replace("return call", `let pick = decide "Which status?" using email as choice { ${labels} }\n  return call`);
  expect(() => compileSource(decided('open: "Open", done: "Done"'), { modules })).not.toThrow();
  expect(failure(decided('open: "Open", closed: "Closed"'), { modules }).diagnostic.message).toBe('argument task field status must be one of the allowed values, found "closed"');
  // A checked list's items must suit each's child parameter.
  const each = (records: string, list: string) => `import child from "./child.algal"\n${pure(records, `(tasks: ${list}) -> json`, "return each child over task in tasks using {} max_items 3")}`;
  expect(() => compileSource(each(taskRecords, "[Task]"), { modules })).not.toThrow();
  expect(failure(each("record Other { id: text }", "[Other]"), { modules }).diagnostic.message).toBe("each item is missing field status required by record Task");
  expect(failure(each("", "[text]"), { modules }).diagnostic.message).toBe("each item must be record Task, found text");
});

test("list, allowed-value, and range syntax is bounded", () => {
  const field = (type: string) => pure(`record R { value: ${type} }`, "()", "return 1");
  const values = (count: number) => Array.from({ length: count }, (_, i) => `"v${i}"`).join(", ");
  expect(() => compileSource(field(`text in [${values(SOURCE_BOUNDS.maxAllowedValues)}]`))).not.toThrow();
  expect(() => compileSource(field(`text in ["${"x".repeat(SOURCE_BOUNDS.maxAllowedValueLength)}"]`))).not.toThrow();
  // The record, six lists, and the number are eight levels.
  expect(() => compileSource(field("[[[[[[number min 0]]]]]]"))).not.toThrow();
  for (const [type, message] of [
    ["text in []", "an allowed-value list needs at least one value"],
    [`text in [${values(SOURCE_BOUNDS.maxAllowedValues + 1)}]`, `a type lists at most ${SOURCE_BOUNDS.maxAllowedValues} allowed values`],
    ['text in ["a", "a"]', 'duplicate allowed value "a"'],
    ["number in [1, 1.0]", "duplicate allowed value 1"],
    [`text in ["${"x".repeat(SOURCE_BOUNDS.maxAllowedValueLength + 1)}"]`, `allowed values have at most ${SOURCE_BOUNDS.maxAllowedValueLength} characters`],
    ["text in [1]", "expected a quoted string"],
    ['number in ["a"]', 'expected a finite number, found "\\"a\\""'],
    ["number min 5 max 1", "number range min 5 exceeds max 1"],
    ["number min 1e400", 'expected a finite number, found "1e400"'],
    ["number max", 'expected a finite number, found "}"'],
    ["[text?]", 'expected "]", found "?"'],
    ["[[[[[[[number]]]]]]]", "record R nests field value beyond the schema limit of 8 levels"],
  ] as const) expect(failure(field(type)).diagnostic.message, type).toBe(message);
  expect(failure(pure("record R { value: text }", "(value: [[[[[[[[R]]]]]]]])", "return 1")).diagnostic.message).toBe("list type [[[[[[[[R]]]]]]]] exceeds the schema limit of 8 levels");
  // Nested records multiply in size; a compiled schema is limited to 64 KiB.
  const wide = (name: string, type: string) => `record ${name} { ${Array.from({ length: SOURCE_BOUNDS.maxRecordFields }, (_, i) => `field_number_${i}: ${type}`).join(", ")} }`;
  const oversized = [wide("A", "text"), wide("B", "A"), "record C { first: B, second: B, third: B }"].join("\n");
  expect(failure(pure(oversized, "()", "return 1")).diagnostic.message).toBe(`record C compiles to a schema over ${SOURCE_BOUNDS.maxRecordSchemaBytes} bytes`);
});

// Digests computed from these files before record syntax existed, plus the
// typed-tasks and support-queue files as compiler 1.4.0 compiled them. New
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
  "projects/typed-tasks/score.algal": "sha256:1e16c60e2bb4241d86f4600430d3cac1b8e81a0d2af0ff95c58cb2aa751836f1",
  "projects/typed-tasks/scores.algal": "sha256:6f1033646aa7b712e7f05fb850fb00856998c13702b70beb7896342f4be78743",
  "projects/support-queue/main.algal": "sha256:4360be754b397e6a04c875d63b667d239b55c68ebeccb9b82b48fbf9b492bb07",
  "projects/support-queue/triage_ticket.algal": "sha256:cedb94a955d8a302f911411830d8732f806855e9033ac1dd9cd6f0a43da8ab2e",
};

test("every earlier source example compiles to its pinned executable digest", async () => {
  const actual: Record<string, string> = {};
  for (const file of Object.keys(pinned).filter(name => !name.includes("/"))) {
    actual[file] = compileSource(await readFile(join(examples, file), "utf8")).sourceMap.manifestDigest;
  }
  for (const entry of ["inbox/inbox.algal", "ratios/ratios.algal", "task-planning/main.algal", "task-planning/inspect_task.algal", "typed-tasks/scores.algal"]) {
    const project = await loadSourceProject(join(examples, "projects", entry));
    for (const [key, map] of Object.entries(project.project.units)) actual[`projects/${entry.split("/")[0]}/${key}`] = map.manifestDigest;
  }
  // The support queue imports the planner's files under the projects root.
  const queue = await loadSourceProject(join(examples, "projects/support-queue/main.algal"), { root: join(examples, "projects") });
  for (const [key, map] of Object.entries(queue.project.units)) {
    if (key.startsWith("support-queue/")) actual[`projects/${key}`] = map.manifestDigest;
    else expect(map.manifestDigest as string).toBe(pinned[`projects/${key}`]!);
  }
  expect(actual).toEqual(pinned);
  // Every pinned top-level example still exists under its original name.
  const topLevel = (await readdir(examples)).filter(name => name.endsWith(".algal"));
  expect(Object.keys(pinned).filter(name => !name.includes("/")).every(name => topLevel.includes(name))).toBe(true);
});

const closedRecord = `closed record Task {
  id: slug,
  title: text min 2 max 40,
  urgency: integer min 0 max 5,
  tags: [text] unique,
  payload: json?,
  home: uri,
}`;
const closedSchema = {
  type: "object",
  required: ["home", "id", "tags", "title", "urgency"],
  properties: {
    id: { type: "string", format: "slug" },
    title: { type: "string", minLength: 2, maxLength: 40 },
    urgency: { type: "integer", minimum: 0, maximum: 5 },
    tags: { type: "array", items: { type: "string" }, uniqueItems: true },
    // A json field of a closed record is declared with the any-value union.
    payload: { type: ["null", "boolean", "object", "array", "number", "string"] },
    home: { type: "string", format: "uri" },
  },
  additionalProperties: false,
};
const closedTask = (fields: Record<string, JsonValue> = {}): Record<string, JsonValue> =>
  ({ id: "t-1", title: "Ship it", urgency: 3, tags: ["a"], home: "https://example.com/t", ...fields });

test("integer, text bounds, formats, unique lists, and closed records lower to schema version 3", async () => {
  const source = pure(`${closedRecord}\nrecord Plain { id: text }`, "(task: Task, names: [name], digests: [digest] unique, plain: Plain) -> json", "return task");
  const compilation = compileSource(source);
  const input = compilation.manifest.cells.find(cell => cell.id === "input");
  expect(input?.kind === "input" && input.outputs).toEqual({
    task: { type: "json", schema: closedSchema, schemaVersion: 3 },
    names: { type: "json", schema: { type: "array", items: { type: "string", format: "name" } }, schemaVersion: 3 },
    digests: { type: "json", schema: { type: "array", items: { type: "string", format: "digest" }, uniqueItems: true }, schemaVersion: 3 },
    // A version 1 record unchanged by the new syntax keeps its bytes.
    plain: { type: "json", schema: { type: "object", required: ["id"], properties: { id: { type: "string" } } } },
  });
  expect(compilation.sourceMap.compilerVersion).toBe("1.6.0");
  // The version is executable identity: a plain record parameter differs.
  const open = compileSource(pure("record Task { id: slug }", "(task: Task) -> json", "return task"));
  const closed = compileSource(pure("closed record Task { id: slug }", "(task: Task) -> json", "return task"));
  expect(open.sourceMap.manifestDigest).not.toBe(closed.sourceMap.manifestDigest);
  expect(compileSource(source).sourceMap.manifestDigest).toBe(compilation.sourceMap.manifestDigest);
  const receipt = await execute(compilation, { input: { task: closedTask(), names: ["alice"], digests: [`sha256:${"a".repeat(64)}`], plain: { id: "p" } } });
  expect(receipt.outcome).toBe("complete");
});

test("the runtime enforces version 3 schema rules where values enter a program", async () => {
  const compilation = compileSource(pure(closedRecord, "(task: Task) -> json", "return task"));
  const noTitle = closedTask();
  delete noTitle.title;
  for (const [task, message] of [
    [{ ...closedTask(), extra: 1 }, "undeclared field"],
    [{ ...closedTask(), urgency: 1.5 }, "expected integer"],
    [{ ...closedTask(), urgency: 9007199254740992 }, "expected integer"],
    [{ ...closedTask(), tags: ["a", "a"] }, "repeated item"],
    [{ ...closedTask(), title: "x" }, "text shorter than minLength"],
    [{ ...closedTask(), title: "x".repeat(41) }, "text longer than maxLength"],
    [{ ...closedTask(), id: "BAD" }, "text is not a slug"],
    [{ ...closedTask(), home: "example.com/no-scheme" }, "text is not a uri"],
    [noTitle, "missing required field"],
  ] as [Record<string, JsonValue>, string][]) {
    const receipt = await execute(compilation, { input: { task } });
    expect(receipt.failure, JSON.stringify(task)).toEqual({ code: "TYPE_MISMATCH", message, path: "input" });
    expect(receipt.cells.result?.status).toBeUndefined();
  }
});

test("version 3 field syntax is bounded and literal mismatches fail at compile time", () => {
  const field = (type: string) => pure(`record R { value: ${type} }`, "()", "return 1");
  for (const [type, message] of [
    ["integer in [1, 2.5]", "integer allowed values must be whole numbers, found 2.5"],
    ["integer in [9007199254740992]", "integer allowed values must be whole numbers"],
    ["integer min 5 max 1", "integer range min 5 exceeds max 1"],
    ["text min 5 max 1", "text length min 5 exceeds max 1"],
    ["text min -1", "text length bounds are integers in 0..1000000"],
    ["text max 1000001", "text length bounds are integers in 0..1000000"],
    ["[text] unique unique", 'expected ","'],
    ["closed", "record fields and list items use text, number, integer, boolean, json"],
    ["regex", "record fields and list items use text, number, integer, boolean, json"],
  ] as const) expect(failure(field(type)).diagnostic.message, type).toContain(message);
  // `closed` introduces only a record declaration.
  expect(failure("closed task { id: text }").diagnostic.message).toBe('expected "record", found "task"');
  expect(failure("closed record task { id: text }").diagnostic.message).toContain("uppercase letter");
  // Literal values the source can prove are rejected at compile time.
  const literal = (value: string) => pure("record R { urgency: integer min 0 max 5 }", "() -> R", `return { urgency: ${value} }`);
  expect(failure(literal("1.5")).diagnostic.message).toBe("return value field urgency must be a whole number, found 1.5");
  expect(failure(literal("9")).diagnostic.message).toBe("return value field urgency must be at most 5, found 9");
  const texted = (value: string) => pure("record R { id: slug, title: text min 2 }", "() -> R", `return { id: ${value}, title: "ok" }`);
  expect(failure(texted('"NOT-A-SLUG"')).diagnostic.message).toBe('return value field id must be slug, found "NOT-A-SLUG"');
  const short = pure("record R { title: text min 2 }", "() -> R", 'return { title: "x" }');
  expect(failure(short).diagnostic.message).toBe("return value field title must be at least 2 characters, found 1");
  // A literal field a closed record does not declare fails the same way.
  expect(failure(pure("closed record R { id: text }", "() -> R", 'return { id: "a", extra: 1 }')).diagnostic.message)
    .toBe("return value has field extra, which record R does not declare");
});
