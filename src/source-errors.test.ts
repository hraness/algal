import { expect, test } from "bun:test";
import { digestText } from "./digest";
import { compileSource, SourceError, type SourceSpan } from "./source";
import { createSourceErrorReport, renderSourceError, SOURCE_ERROR_BOUNDS } from "./source-errors";

function span(text: string, start: number, end = start): SourceSpan {
  const position = (offset: number) => ({ offset, line: text.slice(0, offset).split("\n").length, column: offset - text.slice(0, offset).lastIndexOf("\n") });
  return { start: position(start), end: position(end) };
}
function error(text: string, start: number, end = start, message = "unexpected token"): SourceError {
  return new SourceError(message, span(text, start, end), { source: "main.algal", sourceText: text });
}

test("compiler errors retain the exact child revision and ordered import declarations", () => {
  const main = 'import middle from "./middle.algal" program root() -> json { budget { max_agent_calls: 0 } return call middle using {} }';
  const middle = 'import child from "./child.algal" program middle() -> json { budget { max_agent_calls: 0 } return call child using {} }';
  const child = 'program child() -> json { budget { max_agent_calls: 0 }\n  return missing\n}';
  let failure: unknown;
  try { compileSource(main, { modules: { "middle.algal": middle, "child.algal": child } }); } catch (caught) { failure = caught; }
  expect(failure).toBeInstanceOf(SourceError);
  const report = createSourceErrorReport(failure as SourceError);
  expect(report.contract).toBe("algal.source-error.v1"); expect(report.code).toBe("PARSE_FAILED");
  expect(report.source).toBe("child.algal"); expect(report.sourceDigest).toBe(digestText(child));
  expect(report.imports.map(frame => frame.source)).toEqual(["main.algal", "middle.algal"]);
  expect(report.imports.map(frame => frame.path)).toEqual(["./middle.algal", "./child.algal"]);
  expect(report.excerpt?.lines).toEqual([{ line: 2, text: "  return missing", highlight: { start: 9, length: 7 } }]);
  expect(renderSourceError(report)).toContain("At child.algal:2:10");
  expect(JSON.stringify(report)).not.toContain('program child()');
});

test("EOF and empty source diagnostics get a visible insertion caret", () => {
  for (const text of ["", "return", "return\n"]) {
    const report = createSourceErrorReport(error(text, text.length));
    const line = report.excerpt!.lines[0]!;
    expect(line.line).toBe(text.split("\n").length); expect(line.highlight?.length).toBe(1);
    expect(line.highlight?.start).toBe(text.endsWith("\n") ? 0 : text.length);
    expect(renderSourceError(report)).toContain("^"); expect(report.truncated).toBeUndefined();
  }
});

test("late long-line errors keep the actual offending token under the caret", () => {
  const text = `${"a".repeat(600)} bad ${"z".repeat(600)}`;
  const offset = text.indexOf("bad");
  const report = createSourceErrorReport(error(text, offset, offset + 3));
  const line = report.excerpt!.lines[0]!;
  expect(line.text.startsWith("... ")).toBe(true); expect(line.text.endsWith(" ...")).toBe(true);
  expect(line.text.slice(line.highlight!.start, line.highlight!.start + line.highlight!.length)).toBe("bad");
  expect(line.text.length).toBeLessThanOrEqual(SOURCE_ERROR_BOUNDS.maxLineColumns);
  expect(report.span?.start.column).toBe(offset + 1); expect(report.truncated).toBe(true);
  const eof = createSourceErrorReport(error(text, text.length)).excerpt!.lines[0]!;
  expect(eof.highlight?.start).toBe(eof.text.length); expect(eof.highlight?.length).toBe(1);
});

test("short complete lines keep their beginning even when the error is near the end", () => {
  const text = '  return generate "Draft a helpful reply." using emial';
  const offset = text.indexOf("emial");
  const report = createSourceErrorReport(error(text, offset, offset + 5));
  expect(report.excerpt?.lines).toEqual([{ line: 1, text, highlight: { start: offset, length: 5 } }]);
  expect(report.truncated).toBeUndefined();
});

test("Unicode, tabs, combining marks and terminal controls cannot shift a source caret", () => {
  const text = "\t😀e\u0301\x1b\u009b\u202e bad";
  const offset = text.indexOf("bad");
  const report = createSourceErrorReport(error(text, offset, offset + 3));
  const line = report.excerpt!.lines[0]!;
  expect(line.text).toContain("\\t\\u{1f600}e\\u{301}\\u{1b}\\u{9b}\\u{202e}");
  expect(line.text.slice(line.highlight!.start, line.highlight!.start + line.highlight!.length)).toBe("bad");
  expect(renderSourceError(report)).toMatch(/^[\x20-\x7e\n]*$/);
  expect(report.sourceDigest).toBe(digestText(text));
  const emoji = createSourceErrorReport(error(text, 1, 3)).excerpt!.lines[0]!;
  expect(emoji.text.slice(emoji.highlight!.start, emoji.highlight!.start + emoji.highlight!.length)).toBe("\\u{1f600}");
});

test("CRLF source uses correct original offsets and digest but a clean visible line", () => {
  const text = "first\r\n\tbad\r\n";
  const offset = text.indexOf("bad");
  const report = createSourceErrorReport(error(text, offset, offset + 3));
  expect(report.excerpt?.lines).toEqual([{ line: 2, text: "\\tbad", highlight: { start: 2, length: 3 } }]);
  expect(report.sourceDigest).toBe(digestText(text)); expect(report.sourceDigest).not.toBe(digestText(text.replaceAll("\r", "")));
  const loneCr = createSourceErrorReport(error("bad\r", 3, 4));
  expect(loneCr.excerpt?.lines).toEqual([{ line: 1, text: "bad\\r", highlight: { start: 3, length: 2 } }]);
});

test("multiline spans show only the bounded highlighted portion and declare truncation", () => {
  const text = "one\ntwo\nthree\nfour\nfive\nsix";
  const report = createSourceErrorReport(error(text, 0, text.length));
  expect(report.excerpt?.lines.map(line => line.line)).toEqual([1, 2, 3]); expect(report.truncated).toBe(true);
  expect(report.excerpt?.lines.map(line => line.highlight?.length)).toEqual([3, 3, 5]);
  const halfOpen = createSourceErrorReport(error(text, 0, text.indexOf("three")));
  expect(halfOpen.excerpt?.lines.map(line => line.line)).toEqual([1, 2]); expect(halfOpen.truncated).toBeUndefined();
});

test("missing source, absent or invalid spans, and mismatched coordinates degrade safely", () => {
  const noSource = createSourceErrorReport(new SourceError("oops", span("", 0)));
  expect(noSource.excerptUnavailable).toBe("source-not-provided"); expect(noSource.sourceDigest).toBeUndefined();
  for (const invalid of [undefined, null, {}, { start: { offset: -1, line: 1, column: 1 }, end: { offset: 0, line: 1, column: 1 } }]) {
    const failure = error("bad", 0, 3);
    Object.defineProperty(failure, "diagnostic", { value: { message: "oops", imports: [], span: invalid } });
    const report = createSourceErrorReport(failure);
    expect(report.span).toBeUndefined(); expect(report.excerptUnavailable).toBe("span-unavailable");
    expect(report.sourceDigest).toBe(digestText("bad")); expect(renderSourceError(report)).toContain("Source excerpt unavailable.");
  }
  const mismatch = new SourceError("oops", { start: { offset: 0, line: 2, column: 1 }, end: { offset: 1, line: 2, column: 2 } }, { sourceText: "bad" });
  expect(createSourceErrorReport(mismatch).excerptUnavailable).toBe("span-out-of-range");
});

test("messages, paths and import frame counts obey byte bounds with explicit truncation", () => {
  const location = span("bad", 0, 3);
  const failure = new SourceError("😀".repeat(1000), location, {
    source: "é".repeat(1000), sourceText: "bad",
    imports: Array.from({ length: 20 }, (_, index) => ({ source: `file${index}-${"é".repeat(1000)}`, path: "😀".repeat(1000), span: location })),
  });
  const report = createSourceErrorReport(failure);
  expect(Buffer.byteLength(report.message)).toBeLessThanOrEqual(SOURCE_ERROR_BOUNDS.maxMessageBytes);
  expect(Buffer.byteLength(report.source!)).toBeLessThanOrEqual(SOURCE_ERROR_BOUNDS.maxPathBytes);
  expect(report.imports).toHaveLength(8); expect(report.truncated).toBe(true);
  for (const frame of report.imports) {
    expect(Buffer.byteLength(frame.source)).toBeLessThanOrEqual(SOURCE_ERROR_BOUNDS.maxPathBytes);
    expect(Buffer.byteLength(frame.path)).toBeLessThanOrEqual(SOURCE_ERROR_BOUNDS.maxPathBytes);
  }
  expect(JSON.stringify(report).length).toBeLessThan(12_000);
  expect(renderSourceError(report)).toContain("Some diagnostic details were truncated.");
  expect(createSourceErrorReport(error("bad", 0, 3, "x".repeat(512))).truncated).toBeUndefined();
  const importsOnly = new SourceError("oops", location, {
    sourceText: "bad", imports: Array.from({ length: 9 }, (_, index) => ({ source: `file${index}.algal`, path: "./child.algal", span: location })),
  });
  expect(importsOnly.diagnostic.imports).toHaveLength(8);
  expect(createSourceErrorReport(importsOnly).truncated).toBe(true);
});

test("plain text escapes diagnostic and import controls without changing JSON source names", () => {
  const failure = new SourceError("oops\x1b[31m\nforged", span("bad", 0, 3), {
    source: "é\u202e.algal", sourceText: "bad", imports: [{ source: "root\u009d.algal", path: "./child\t.algal", span: span("", 0) }],
  });
  const report = createSourceErrorReport(failure);
  expect(report.source).toBe("é\u202e.algal"); expect(report.message).toBe("oops\x1b[31m\nforged");
  const text = renderSourceError(report);
  expect(text).toMatch(/^[\x20-\x7e\n]*$/); expect(text).toContain("oops\\u{1b}[31m\\nforged");
  expect(text).toContain("\\u{e9}\\u{202e}.algal"); expect(text).toContain("./child\\t.algal");
});

test("formatter skips oversized source and never mutates errors or exposes full source text", () => {
  const failure = error("top secret context\nbad\nprivate ending", 19, 22);
  const before = JSON.stringify(failure);
  const report = createSourceErrorReport(failure);
  expect(JSON.stringify(failure)).toBe(before); expect(JSON.stringify(report)).not.toContain("top secret"); expect(JSON.stringify(report)).not.toContain("private ending");
  expect(createSourceErrorReport(failure)).toEqual(report);
  const oversized = new SourceError("oops", span("", 0));
  Object.defineProperty(oversized, "sourceText", { value: "x".repeat(SOURCE_ERROR_BOUNDS.maxSourceBytes + 1) });
  const large = createSourceErrorReport(oversized);
  expect(large.excerptUnavailable).toBe("source-too-large"); expect(large.sourceDigest).toBeUndefined(); expect(large.truncated).toBe(true);
});
