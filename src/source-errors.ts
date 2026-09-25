import { digestText, type Digest } from "./digest";
import { SOURCE_BOUNDS, type SourceError, type SourcePosition, type SourceSpan } from "./source";
import { utf8Length } from "./utf8";

export const SOURCE_ERROR_BOUNDS = Object.freeze({
  maxMessageBytes: 512, maxPathBytes: 512, maxImports: 8, maxExcerptLines: 3,
  maxLineColumns: 120, maxSourceBytes: SOURCE_BOUNDS.maxSourceBytes,
});
export type SourceErrorExcerptLine = {
  line: number;
  /** ASCII display text; escapes keep Unicode and control-character carets exact. */
  text: string;
  /** Zero-based columns in text, not in the original source. */
  highlight?: { start: number; length: number };
};
export type SourceErrorReport = {
  contract: "algal.source-error.v1";
  code: "PARSE_FAILED";
  message: string;
  source?: string;
  span?: SourceSpan;
  sourceDigest?: Digest;
  excerpt?: { lines: SourceErrorExcerptLine[] };
  imports: { source: string; path: string; span?: SourceSpan }[];
  truncated?: true;
  excerptUnavailable?: "source-not-provided" | "source-too-large" | "span-unavailable" | "span-out-of-range";
};

function visible(char: string): string {
  if (char === "\t") return "\\t";
  if (char === "\r") return "\\r";
  if (char === "\n") return "\\n";
  if (char === "\\") return "\\\\";
  const code = char.codePointAt(0)!;
  return code >= 32 && code <= 126 ? char : `\\u{${code.toString(16)}}`;
}
function boundedText(value: unknown, maximum: number): { text: string; truncated: boolean } {
  if (typeof value !== "string") return { text: "", truncated: false };
  const characters: string[] = []; let bytes = 0;
  for (const char of value) {
    const size = utf8Length(char);
    if (bytes + size > maximum) {
      while (bytes > maximum - 3) bytes -= utf8Length(characters.pop()!);
      return { text: `${characters.join("")}...`, truncated: true };
    }
    characters.push(char); bytes += size;
  }
  return { text: characters.join(""), truncated: false };
}
function validPosition(value: unknown): value is SourcePosition {
  if (!value || typeof value !== "object") return false;
  const position = value as Partial<SourcePosition>;
  return Number.isSafeInteger(position.offset) && position.offset! >= 0 && position.offset! <= SOURCE_ERROR_BOUNDS.maxSourceBytes
    && Number.isSafeInteger(position.line) && position.line! >= 1 && position.line! <= SOURCE_ERROR_BOUNDS.maxSourceBytes + 1
    && Number.isSafeInteger(position.column) && position.column! >= 1 && position.column! <= SOURCE_ERROR_BOUNDS.maxSourceBytes + 1;
}
function validSpan(value: unknown): SourceSpan | undefined {
  if (!value || typeof value !== "object") return undefined;
  const span = value as Partial<SourceSpan>;
  if (!validPosition(span.start) || !validPosition(span.end) || span.start.offset > span.end.offset
    || span.start.line > span.end.line || (span.start.line === span.end.line && span.start.column > span.end.column)) return undefined;
  const copy = ({ offset, line, column }: SourcePosition): SourcePosition => ({ offset, line, column });
  return { start: copy(span.start), end: copy(span.end) };
}
function matchesPosition(source: string, position: SourcePosition): boolean {
  if (position.offset > source.length) return false;
  const prefix = source.slice(0, position.offset);
  return prefix.split("\n").length === position.line && position.offset - prefix.lastIndexOf("\n") === position.column;
}
function excerptLine(raw: string, line: number, start: number, end: number): { value: SourceErrorExcerptLine; truncated: boolean } {
  start = Math.min(start, raw.length); end = Math.min(end, raw.length);
  let text = ""; let offset = 0; let from = 0; let to = 0;
  const boundaries = [0];
  for (const char of raw) {
    text += visible(char);
    if (offset + char.length <= start) from = text.length;
    if (offset < end) to = text.length;
    offset += char.length; boundaries.push(text.length);
  }
  const floorBoundary = (target: number): number => {
    let low = 0; let high = boundaries.length;
    while (low < high) {
      const middle = (low + high) >>> 1;
      if (boundaries[middle]! <= target) low = middle + 1;
      else high = middle;
    }
    return boundaries[Math.max(0, low - 1)]!;
  };
  const fits = text.length <= SOURCE_ERROR_BOUNDS.maxLineColumns;
  const left = fits ? 0 : floorBoundary(Math.max(0, from - 32));
  const right = fits ? text.length : floorBoundary(Math.min(text.length, left + SOURCE_ERROR_BOUNDS.maxLineColumns - 8));
  const prefix = left > 0 ? "... " : "";
  const suffix = right < text.length ? " ..." : "";
  return {
    value: { line, text: prefix + text.slice(left, right) + suffix,
      highlight: { start: prefix.length + from - left, length: Math.max(1, Math.min(to, right) - from) } },
    truncated: left > 0 || right < text.length,
  };
}

/** Presentation only: no I/O, source loading, recompilation, or execution. */
export function createSourceErrorReport(error: SourceError): SourceErrorReport {
  const message = boundedText(error.diagnostic?.message ?? error.message, SOURCE_ERROR_BOUNDS.maxMessageBytes);
  const report: SourceErrorReport = { contract: "algal.source-error.v1", code: "PARSE_FAILED", message: message.text, imports: [] };
  let truncated = message.truncated;
  const source = error.diagnostic?.source;
  if (typeof source === "string") {
    const path = boundedText(source, SOURCE_ERROR_BOUNDS.maxPathBytes);
    report.source = path.text; truncated ||= path.truncated;
  }
  const span = validSpan(error.diagnostic?.span);
  if (span) report.span = span;
  const imports = error.diagnostic?.imports ?? [];
  for (const frame of imports.slice(0, SOURCE_ERROR_BOUNDS.maxImports)) {
    const source = boundedText(frame.source, SOURCE_ERROR_BOUNDS.maxPathBytes);
    const path = boundedText(frame.path, SOURCE_ERROR_BOUNDS.maxPathBytes);
    const frameSpan = validSpan(frame.span);
    report.imports.push({ source: source.text, path: path.text, ...(frameSpan ? { span: frameSpan } : {}) });
    truncated ||= source.truncated || path.truncated;
  }
  truncated ||= imports.length > SOURCE_ERROR_BOUNDS.maxImports || error.diagnostic?.importsTruncated === true;
  const text = error.sourceText;
  if (typeof text !== "string") report.excerptUnavailable = "source-not-provided";
  else if (text.length > SOURCE_ERROR_BOUNDS.maxSourceBytes || utf8Length(text) > SOURCE_ERROR_BOUNDS.maxSourceBytes) {
    report.excerptUnavailable = "source-too-large"; truncated = true;
  } else {
    report.sourceDigest = digestText(text);
    if (!span) report.excerptUnavailable = "span-unavailable";
    else if (!matchesPosition(text, span.start) || !matchesPosition(text, span.end)) report.excerptUnavailable = "span-out-of-range";
    else {
      const lines = text.split("\n");
      const lastLine = Math.max(span.start.line, span.end.line - (span.end.column === 1 ? 1 : 0));
      const shownEnd = Math.min(lastLine, span.start.line + SOURCE_ERROR_BOUNDS.maxExcerptLines - 1);
      report.excerpt = { lines: [] };
      for (let line = span.start.line; line <= shownEnd; line++) {
        const raw = lines[line - 1]!;
        // Strip CR only as part of CRLF; a final lone CR remains an escaped token.
        const displayLine = line < lines.length && raw.endsWith("\r") ? raw.slice(0, -1) : raw;
        const rendered = excerptLine(displayLine, line, line === span.start.line ? span.start.column - 1 : 0, line === span.end.line ? span.end.column - 1 : raw.length);
        report.excerpt.lines.push(rendered.value); truncated ||= rendered.truncated;
      }
      truncated ||= shownEnd < lastLine;
    }
  }
  if (truncated) report.truncated = true;
  return report;
}

export function renderSourceError(report: SourceErrorReport): string {
  const display = (value: string): string => [...value].map(visible).join("");
  const location = report.span ? `:${report.span.start.line}:${report.span.start.column}` : "";
  const lines = [`${report.code}: ${display(report.message)}`, `At ${display(report.source ?? "<source>")}${location}`];
  for (const frame of report.imports) {
    const location = frame.span ? `:${frame.span.start.line}:${frame.span.start.column}` : "";
    lines.push(`Imported from ${display(frame.source)}${location} -> ${display(frame.path)}`);
  }
  if (report.excerpt) {
    const width = String(report.excerpt.lines.at(-1)?.line ?? 1).length;
    for (const line of report.excerpt.lines) {
      lines.push(`${String(line.line).padStart(width)} | ${line.text}`);
      if (line.highlight) lines.push(`${" ".repeat(width)} | ${" ".repeat(line.highlight.start)}${"^".repeat(line.highlight.length)}`);
    }
  } else lines.push("Source excerpt unavailable.");
  if (report.truncated) lines.push("Some diagnostic details were truncated.");
  return `${lines.join("\n")}\n`;
}
