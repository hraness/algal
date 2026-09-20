import { expect, test } from "bun:test";
import { digestText } from "./digest";
import { AlgalError } from "./errors";
import { scriptedExecutor, type Executor } from "./effects";
import { builtinRegistry } from "./registry";
import { receiptDigest, runOrganism, type RunReceipt } from "./run";
import { compileSource, type SourceCompilerOptions } from "./source";
import { diagnoseSource, renderSourceDiagnostics, SOURCE_DIAGNOSTIC_BOUNDS } from "./source-diagnostics";
import { SOURCE_TRACE_BOUNDS } from "./source-trace";
import { MemoryStore } from "./store";
import type { JsonValue } from "./values";

async function run(source: string, options: SourceCompilerOptions = {}, args: Record<string, Record<string, JsonValue>> = {}, executors: Executor[] = []) {
  const compilation = compileSource(source, options);
  const store = new MemoryStore();
  for (const manifest of compilation.modules) await store.putManifest(manifest);
  return runOrganism({ manifest: compilation.manifest, store, args, fns: builtinRegistry(), executors });
}
function changed(receipt: RunReceipt, edit: (value: RunReceipt) => void): RunReceipt {
  const result = structuredClone(receipt); edit(result); result.digest = receiptDigest(result); return result;
}
const arithmetic = 'program divide(value: json) -> json { budget { max_agent_calls: 0 } return 10 / value }';
const batch = `import divide from "./math.algal"
program batch(values: json) -> json {
  budget { max_agent_calls: 0 }
  return each divide over value in values using {} max_items 3
}`;
const batchOptions = { entry: "batch.algal", modules: { "math.algal": arithmetic } };

test("diagnostics locate the second batch item's child expression and exact caller", async () => {
  const receipt = await run(batch, batchOptions, { input: { values: [2, 0, 5] } });
  expect(receipt.outcome).toBe("failed");
  expect(receipt.failure?.path).toBe("result-each/i1/result");
  const report = diagnoseSource(receipt, batch, batchOptions);
  expect(report.verification).toBe("digest-bound"); expect(report.issues).toHaveLength(1);
  expect(report.receiptDigest).toBe(receipt.digest); expect(report.rootManifestDigest).toBe(receipt.manifestDigest);
  const issue = report.issues[0]!;
  expect(issue.path).toBe("result-each/i1/result"); expect(issue.kind).toBe("failure"); expect(issue.code).toBe("EXPR_FAILED");
  expect(issue.pathTruncated).toBeUndefined();
  expect(issue.location?.source).toBe("math.algal"); expect(issue.location?.title).toBe("return");
  expect(issue.location?.sourceDigest).toBe(digestText(arithmetic));
  expect(issue.location?.excerpt).toContain("10 / value");
  expect(issue.callers).toHaveLength(1); expect(issue.callers[0]?.kind).toBe("each"); expect(issue.callers[0]?.index).toBe(1);
  expect(issue.callers[0]?.location?.source).toBe("batch.algal"); expect(issue.callers[0]?.location?.span.start.line).toBe(4);
  expect(issue.callers[0]?.location?.sourceDigest).toBe(digestText(batch));
  const text = renderSourceDiagnostics(report);
  expect(text).toContain("not replay verification"); expect(text).toContain("math.algal:1:"); expect(text).toContain("each index 1");
});

test("failed argument narrowing stays at the caller before a child starts", async () => {
  const source = 'import child from "./child.algal" program root(data: json) -> text { budget { max_agent_calls: 0 } return call child using {value: data.value} }';
  const options = { modules: { "child.algal": 'program child(value: text) -> text { budget { max_agent_calls: 0 } return value }' } };
  const receipt = await run(source, options, { input: { data: { value: 4 } } });
  expect(receipt.failure?.path).toBe("result-arg-1");
  const issue = diagnoseSource(receipt, source, options).issues[0]!;
  expect(issue.location?.source).toBe("main.algal"); expect(issue.location?.role).toBe("call-argument");
  expect(issue.callers).toEqual([]); expect(issue.location?.excerpt).toContain("data.value");
});

test("diagnostics follow generated parameterless wrappers and nested calls", async () => {
  const source = 'import middle from "./middle.algal" program root() -> json { budget { max_agent_calls: 0, max_depth: 3 } return if true { call middle using {} } else { 0 } }';
  const options = { modules: {
    "middle.algal": 'import leaf from "./leaf.algal" program middle() -> json { budget { max_agent_calls: 0 } return call leaf using {} }',
    "leaf.algal": 'program leaf() -> json { budget { max_agent_calls: 0 } return 1 / 0 }',
  } };
  const receipt = await run(source, options);
  expect(receipt.outcome).toBe("failed");
  const issue = diagnoseSource(receipt, source, options).issues[0]!;
  expect(issue.path).toBe(receipt.failure?.path); expect(issue.location?.source).toBe("leaf.algal");
  expect(issue.callers.filter(frame => frame.location).map(frame => frame.location!.source)).toEqual(["main.algal", "middle.algal"]);
  expect(issue.unresolved).toBeUndefined();
});

test("identical child digests resolve to the actually imported file rather than the first match", async () => {
  const body = 'program same() -> json { budget { max_agent_calls: 0 } return 1 / 0 }';
  const source = 'import first from "./a.algal" import second from "./b.algal" program root() -> json { budget { max_agent_calls: 0 } return call second using {} }';
  const options = { modules: { "a.algal": body, "b.algal": `// different file\n${body}` } };
  expect(compileSource(body).sourceMap.manifestDigest).toBe(compileSource(options.modules["b.algal"]).sourceMap.manifestDigest);
  const issue = diagnoseSource(await run(source, options), source, options).issues[0]!;
  expect(issue.location?.source).toBe("b.algal"); expect(issue.location?.span.start.line).toBe(2);
});

test("terminal failure paths remain authoritative without cell records and invalid paths are never guessed", async () => {
  const receipt = await run(batch, batchOptions, { input: { values: [0] } });
  const withoutCell = changed(receipt, value => { delete value.cells[value.failure!.path!]; });
  expect(diagnoseSource(withoutCell, batch, batchOptions).issues[0]?.location?.source).toBe("math.algal");
  for (const path of ["missing", "result-each/i01/result", "result-each/i99/result", "result-each/i0/not-a-cell", "result-each//result", "result-each/i0/result/extra", ""]) {
    const invalid = changed(receipt, value => { value.failure!.path = path; });
    const issue = diagnoseSource(invalid, batch, batchOptions).issues[0]!;
    expect(issue.path).toBe(path); expect(issue.location).toBeUndefined(); expect(issue.unresolved).toBeTruthy();
  }
  const noPath = changed(receipt, value => { delete value.failure!.path; });
  const missing = diagnoseSource(noPath, batch, batchOptions).issues[0]!;
  expect(missing.path).toBeUndefined(); expect(missing.unresolved).toContain("no cell path");
});

test("oversized recorded failure paths are clipped for display without guessing a source location", async () => {
  const receipt = await run(batch, batchOptions, { input: { values: [0] } });
  const longPath = "result-each/i0/result/".padEnd(4096, "x");
  const oversized = changed(receipt, value => { value.failure!.path = longPath; });
  const report = diagnoseSource(oversized, batch, batchOptions);
  const issue = report.issues[0]!;
  expect(issue.path).toBe(`${longPath.slice(0, SOURCE_TRACE_BOUNDS.maxPathLength - 1)}…`);
  expect(issue.path!.length).toBe(SOURCE_TRACE_BOUNDS.maxPathLength);
  expect(issue.pathTruncated).toBe(true);
  expect(issue.location).toBeUndefined(); expect(issue.callers).toEqual([]);
  expect(issue.unresolved).toBe("execution path is not bounded text");
  expect(JSON.stringify(report).length).toBeLessThan(4096);
  const text = renderSourceDiagnostics(report);
  expect(text.length).toBeLessThan(4096); expect(text).toContain("(truncated)");
  expect(oversized.failure?.path).toBe(longPath);
});

test("step exhaustion maps the attempted child expression even before its cell record exists", async () => {
  const source = 'import child from "./child.algal" program root() -> json { budget { max_agent_calls: 0, max_steps: 1 } return call child using {} }';
  const options = { modules: { "child.algal": 'program child() -> json { budget { max_agent_calls: 0 } return 1 }' } };
  const receipt = await run(source, options);
  expect(receipt.failure?.code).toBe("BUDGET_EXHAUSTED"); expect(receipt.failure?.path).toBe("result/result");
  expect(receipt.cells["result/result"]).toBeUndefined();
  const issue = diagnoseSource(receipt, source, options).issues[0]!;
  expect(issue.location?.source).toBe("child.algal"); expect(issue.callers[0]?.location?.source).toBe("main.algal");
});

test("the deepest supported source call chain stays within eight bounded caller frames", async () => {
  const sources: Record<string, string> = {};
  for (let depth = 0; depth <= 8; depth++) {
    sources[`d${depth}.algal`] = `${depth < 8 ? `import child from "./d${depth + 1}.algal"` : ""}
program depth${depth}() -> json {
  budget { max_agent_calls: 0, max_depth: 8 }
  return ${depth < 8 ? "call child using {}" : "1 / 0"}
}`;
  }
  const source = sources["d0.algal"]!; const options = { entry: "d0.algal", modules: sources };
  const issue = diagnoseSource(await run(source, options), source, options).issues[0]!;
  expect(issue.location?.source).toBe("d8.algal"); expect(issue.callers).toHaveLength(8);
  expect(issue.callers.map(frame => frame.location?.source)).toEqual(Array.from({ length: 8 }, (_, index) => `d${index}.algal`));
  for (const frame of issue.callers) {
    expect(frame.location!.excerpt.length).toBeLessThanOrEqual(320);
    expect(frame.location!.excerpt.split("\n").length).toBeLessThanOrEqual(3);
  }
});

test("receipt tampering and executable drift fail while comment-only changes use supplied source lines", async () => {
  const source = 'program root() -> json { budget { max_agent_calls: 0 } return 1 / 0 }';
  const receipt = await run(source);
  const tampered = structuredClone(receipt); tampered.work.units++;
  expect(() => diagnoseSource(tampered, source)).toThrow(/receipt digest mismatch/);
  expect(() => diagnoseSource(receipt, source.replace("1 / 0", "2 / 0"))).toThrow(/root manifest/);
  const wrongKey = changed(receipt, value => { value.manifestKey = "organism:other"; });
  expect(() => diagnoseSource(wrongKey, source)).toThrow(/root manifest/);
  const a = diagnoseSource(receipt, source); const b = diagnoseSource(receipt, `// shifted\n${source}`);
  expect(a.rootManifestDigest).toBe(b.rootManifestDigest); expect(a.sourceDigest).not.toBe(b.sourceDigest);
  expect(b.issues[0]?.location?.span.start.line).toBe(2);
  expect(() => diagnoseSource(receipt, 'import absent from "./missing.algal" ' + source)).toThrow(/not supplied/);
});

test("comment-only child changes identify the supplied child revision and shifted lines", async () => {
  const receipt = await run(batch, batchOptions, { input: { values: [2, 0] } });
  const shifted = `// child-only comment\n${arithmetic}`;
  const before = diagnoseSource(receipt, batch, batchOptions);
  const after = diagnoseSource(receipt, batch, { ...batchOptions, modules: { "math.algal": shifted } });
  expect(after.rootManifestDigest).toBe(before.rootManifestDigest);
  expect(after.sourceDigest).toBe(before.sourceDigest);
  expect(after.receiptDigest).toBe(before.receiptDigest);
  expect(after.issues[0]?.location?.sourceDigest).toBe(digestText(shifted));
  expect(after.issues[0]?.location?.sourceDigest).not.toBe(before.issues[0]?.location?.sourceDigest);
  expect(before.issues[0]?.location?.span.start.line).toBe(1);
  expect(after.issues[0]?.location?.span.start.line).toBe(2);
  expect(after.issues[0]?.callers[0]?.location?.sourceDigest).toBe(digestText(batch));
});

test("complete runs keep handled failures distinct from terminal issues", async () => {
  const source = 'program root() -> json { budget { max_agent_calls: 0 } return 1 }';
  const receipt = await run(source);
  const history = changed(receipt, value => { value.cells.handled = { status: "failed", failure: { code: "EXPR_FAILED", message: "handled elsewhere" }, work: 1 }; });
  expect(diagnoseSource(history, source).issues).toEqual([]);
  expect(renderSourceDiagnostics(diagnoseSource(history, source))).toContain("No terminal issue recorded.");
  const stuck = changed(receipt, value => { value.outcome = "stuck"; });
  const issue = diagnoseSource(stuck, source).issues[0]!;
  expect(issue.kind).toBe("stuck"); expect(issue.code).toBeUndefined(); expect(issue.location).toBeUndefined();
});

test("suspensions select deepest recorded evidence without inventing a failure", async () => {
  const source = 'import child from "./child.algal" program root() -> text { budget { max_agent_calls: 1 } return call child using {} }';
  const options = { modules: { "child.algal": 'program child() -> text { budget { max_agent_calls: 1 } return generate "wait" using "context" }' } };
  const executor: Executor = { id: "waiting", execute: async () => { throw new AlgalError("EFFECT_SUSPENDED", "wait"); } };
  const receipt = await run(source, options, {}, [executor]);
  expect(receipt.outcome).toBe("suspended"); expect(receipt.failure).toBeUndefined();
  const issue = diagnoseSource(receipt, source, options).issues[0]!;
  expect(issue.kind).toBe("suspension"); expect(issue.path).toBe("result/result");
  expect(issue.code).toBeUndefined(); expect(issue.location?.source).toBe("child.algal");
  const eventsOnly = changed(receipt, value => { for (const [path, cell] of Object.entries(value.cells)) if (cell.status === "suspended") delete value.cells[path]; });
  expect(diagnoseSource(eventsOnly, source, options).issues[0]?.path).toBe("result/result");
  const cellsOnly = changed(receipt, value => { value.events = value.events.filter(event => event.kind !== "cell.suspend"); });
  expect(diagnoseSource(cellsOnly, source, options).issues[0]?.path).toBe("result/result");
  const unrelated = changed(receipt, value => {
    for (let index = 0; index < 4096; index++) value.cells[`result-unrelated-${index}`] = { status: "suspended", work: 0 };
  });
  expect(diagnoseSource(unrelated, source, options).issues[0]?.path).toBe("result/result");
  const missing = changed(eventsOnly, value => { value.events = value.events.filter(event => event.kind !== "cell.suspend"); });
  const unresolved = diagnoseSource(missing, source, options).issues[0]!;
  expect(unresolved.path).toBeUndefined(); expect(unresolved.unresolved).toContain("no suspended");
});

test("reports bound excerpts and messages, preserve inputs, and never execute or expand payloads", async () => {
  const source = `program root(secret: text) -> text {
budget { max_agent_calls: 1 }
return generate "${"instruction".repeat(50)}"
using {
  secret: secret,
  extra: 1
}
}`;
  let calls = 0;
  const delegate = scriptedExecutor({ result: "MODEL OUTPUT PRIVATE" });
  const receipt = await run(source, {}, { input: { secret: "INPUT PRIVATE" } }, [{ ...delegate, execute: async request => { calls++; return delegate.execute(request); } }]);
  const failure = changed(receipt, value => { value.outcome = "failed"; value.failure = { code: "EFFECT_FAILED", path: "result", message: `\x1b[31m\u009b31m\u009d${"x".repeat(1000)}` }; });
  const before = JSON.stringify(failure); const sourceBefore = source;
  const report = diagnoseSource(failure, source);
  expect(calls).toBe(1); expect(JSON.stringify(failure)).toBe(before); expect(source).toBe(sourceBefore);
  expect(JSON.stringify(report)).not.toContain("INPUT PRIVATE"); expect(JSON.stringify(report)).not.toContain("MODEL OUTPUT PRIVATE");
  const issue = report.issues[0]!;
  expect(issue.message.length).toBeLessThanOrEqual(SOURCE_DIAGNOSTIC_BOUNDS.maxMessageChars);
  expect(issue.location!.excerpt.length).toBeLessThanOrEqual(320); expect(issue.location!.excerpt.split("\n").length).toBeLessThanOrEqual(3);
  expect(issue.callers.length).toBeLessThanOrEqual(8); expect(report.issues).toHaveLength(1);
  expect(renderSourceDiagnostics(report)).not.toContain("\x1b");
  expect(renderSourceDiagnostics(report)).not.toContain("\u009b"); expect(renderSourceDiagnostics(report)).not.toContain("\u009d");
  expect(calls).toBe(1);
});
