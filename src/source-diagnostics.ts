// Source-aware presentation derived from original text and a bound receipt.
// This is deliberately separate from replay verification and run receipts.
import type { Digest } from "./digest";
import { AlgalError, type ErrorCode } from "./errors";
import { parseRunReceipt, receiptDigest, type RunOutcome, type RunReceipt } from "./run";
import type { SourceCompilerOptions, SourceSpan } from "./source";
import { createSourceTrace, resolveSourcePath, SOURCE_TRACE_BOUNDS, type SourceTraceContext, type SourceTraceLocation } from "./source-trace";

export const SOURCE_DIAGNOSTIC_BOUNDS = Object.freeze({ maxIssues: 1, maxCallers: 8, maxMessageChars: 512, maxExcerptChars: 320, maxExcerptLines: 3 });
export type SourceDiagnosticLocation = {
  source: string;
  sourceDigest: Digest;
  cellId: string;
  span: SourceSpan;
  title?: string;
  role?: string;
  excerpt: string;
};
export type SourceDiagnosticCaller = {
  path: string;
  kind: "call" | "each" | "repeat";
  manifestDigest: Digest;
  index?: number;
  location?: SourceDiagnosticLocation;
};
export type SourceDiagnosticIssue = {
  kind: "failure" | "suspension" | "stuck";
  terminal: true;
  code?: ErrorCode;
  /** Recorded failure text, clipped; no input, context, or effect expansion. */
  message: string;
  path?: string;
  pathTruncated?: true;
  location?: SourceDiagnosticLocation;
  callers: SourceDiagnosticCaller[];
  unresolved?: string;
};
export type SourceDiagnostics = {
  contract: "algal.source-diagnostics.v1";
  rootManifestDigest: Digest;
  sourceDigest: Digest;
  receiptDigest: Digest;
  outcome: RunOutcome;
  verification: "digest-bound";
  issues: SourceDiagnosticIssue[];
};

function clipped(text: string, maximum: number): string {
  return text.length <= maximum ? text : `${text.slice(0, maximum - 1)}…`;
}

function sourceLocation(context: SourceTraceContext, location: SourceTraceLocation): SourceDiagnosticLocation {
  const text = context.sources[location.source];
  const excerpt = text === undefined ? "" : clipped(text.split("\n")
    .slice(location.span.start.line - 1, Math.min(location.span.end.line, location.span.start.line + SOURCE_DIAGNOSTIC_BOUNDS.maxExcerptLines - 1))
    .join("\n"), SOURCE_DIAGNOSTIC_BOUNDS.maxExcerptChars);
  return {
    source: location.source, sourceDigest: context.compilation.project.units[location.source]!.sourceDigest,
    cellId: location.cellId, span: structuredClone(location.span), excerpt, role: location.role,
    ...(location.annotation === undefined ? {} : { title: location.annotation.title }),
  };
}

/** Prefer a deepest recorded suspension, since caller cells propagate it.
 * Prefix comparison only ranks recorded evidence; source interpretation is
 * exclusively the shared resolver's responsibility.
 */
function suspendedPath(receipt: RunReceipt): string | undefined {
  const candidates = new Map<string, number>();
  for (const [path, cell] of Object.entries(receipt.cells)) if (cell.status === "suspended") candidates.set(path, -1);
  for (const event of receipt.events) if (event.kind === "cell.suspend" && event.path !== undefined) candidates.set(event.path, Math.max(candidates.get(event.path) ?? -1, event.seq));
  const paths = [...candidates.keys()].sort();
  // A lower-bound search keeps adversarial, unrelated recorded paths bounded
  // by O(N log N), instead of comparing every path with every other path.
  const deepest = paths.filter(path => {
    const prefix = `${path}/`;
    let low = 0; let high = paths.length;
    while (low < high) {
      const middle = (low + high) >>> 1;
      if (paths[middle]! < prefix) low = middle + 1;
      else high = middle;
    }
    return !paths[low]?.startsWith(prefix);
  });
  deepest.sort((left, right) => candidates.get(right)! - candidates.get(left)! || (left < right ? -1 : left > right ? 1 : 0));
  return deepest[0];
}

/** Recompile a closed project and bind receipt identity before reading labels.
 * Does not execute a model, replay effects, touch a store, or mutate its inputs.
 */
export function diagnoseSource(receiptValue: unknown, source: string, sourceOptions?: SourceCompilerOptions): SourceDiagnostics {
  const receipt = parseRunReceipt(receiptValue);
  if (receiptDigest(receipt) !== receipt.digest) throw new AlgalError("DIGEST_MISMATCH", "source diagnostics: receipt digest mismatch");
  const context = createSourceTrace(source, sourceOptions);
  const { compilation } = context;
  if (receipt.manifestDigest !== compilation.sourceMap.manifestDigest || receipt.manifestKey !== compilation.manifest.key) {
    throw new AlgalError("DIGEST_MISMATCH", "source diagnostics: source does not compile to this receipt's root manifest");
  }
  const report: SourceDiagnostics = {
    contract: "algal.source-diagnostics.v1", rootManifestDigest: receipt.manifestDigest,
    sourceDigest: compilation.sourceMap.sourceDigest, receiptDigest: receipt.digest,
    outcome: receipt.outcome, verification: "digest-bound", issues: [],
  };
  // Handled cell failures are execution history, not a terminal issue.
  if (receipt.outcome === "complete") return report;
  const suspension = receipt.outcome === "suspended";
  const path = suspension ? suspendedPath(receipt) : receipt.failure?.path;
  const issue: SourceDiagnosticIssue = {
    kind: suspension ? "suspension" : receipt.outcome === "stuck" ? "stuck" : "failure",
    terminal: true,
    ...(!suspension && receipt.failure ? { code: receipt.failure.code } : {}),
    message: suspension ? "Execution is suspended at the recorded invocation."
      : clipped(receipt.failure?.message ?? `The receipt records a ${receipt.outcome} outcome without a terminal failure detail.`, SOURCE_DIAGNOSTIC_BOUNDS.maxMessageChars),
    ...(path === undefined ? {} : {
      path: clipped(path, SOURCE_TRACE_BOUNDS.maxPathLength),
      ...(path.length > SOURCE_TRACE_BOUNDS.maxPathLength ? { pathTruncated: true as const } : {}),
    }),
    callers: [],
  };
  if (path === undefined || path === "") {
    issue.unresolved = suspension ? "The receipt has no suspended cell or event path." : "The terminal failure has no cell path.";
  } else {
    const resolution = resolveSourcePath(context, path, "cell");
    if (!resolution.ok) issue.unresolved = clipped(resolution.reason, SOURCE_DIAGNOSTIC_BOUNDS.maxMessageChars);
    else {
      if (resolution.location) issue.location = sourceLocation(context, resolution.location);
      else issue.unresolved = resolution.generated ? "This path identifies compiler-generated control structure with no direct source expression." : "This path has no source expression location.";
      issue.callers = resolution.frames.slice(0, SOURCE_DIAGNOSTIC_BOUNDS.maxCallers).map(frame => ({
        path: frame.path, kind: frame.kind, manifestDigest: frame.manifestDigest,
        ...(frame.index === undefined ? {} : { index: frame.index }),
        ...(frame.location === undefined ? {} : { location: sourceLocation(context, frame.location) }),
      }));
    }
  }
  report.issues.push(issue);
  return report;
}

function printable(text: string): string {
  return [...text].map(char => {
    const code = char.charCodeAt(0);
    return (code < 32 && char !== "\n" && char !== "\t") || (code >= 127 && code <= 159) || (code >= 0x202a && code <= 0x202e) || (code >= 0x2066 && code <= 0x2069) ? "�" : char;
  }).join("");
}
function locationText(location: SourceDiagnosticLocation): string {
  return `${location.source}:${location.span.start.line}:${location.span.start.column}${location.title ? ` (${location.title})` : ""}`;
}

export function renderSourceDiagnostics(report: SourceDiagnostics): string {
  const lines = [`ALGAL ${report.outcome} · ${report.verification} (not replay verification)`, `Receipt: ${report.receiptDigest}`, `Manifest: ${report.rootManifestDigest}`, `Source: ${report.sourceDigest}`];
  if (!report.issues.length) lines.push("No terminal issue recorded.");
  for (const issue of report.issues.slice(0, SOURCE_DIAGNOSTIC_BOUNDS.maxIssues)) {
    lines.push("", `${issue.kind}${issue.code ? ` · ${issue.code}` : ""}${issue.path !== undefined ? ` · ${clipped(issue.path, SOURCE_TRACE_BOUNDS.maxPathLength) || "(root)"}${issue.pathTruncated ? " (truncated)" : ""}` : ""}`, `${issue.kind === "suspension" ? "State" : "Recorded message"}: ${clipped(issue.message, SOURCE_DIAGNOSTIC_BOUNDS.maxMessageChars)}`);
    if (issue.location) {
      lines.push(`At ${locationText(issue.location)}${issue.location.role ? ` [${issue.location.role}]` : ""}`);
      if (issue.location.excerpt) lines.push(clipped(issue.location.excerpt, SOURCE_DIAGNOSTIC_BOUNDS.maxExcerptChars));
    }
    if (issue.unresolved) lines.push(`Source location unavailable: ${issue.unresolved}`);
    for (const frame of issue.callers.slice(0, SOURCE_DIAGNOSTIC_BOUNDS.maxCallers).reverse()) {
      lines.push(`Called from ${frame.location ? locationText(frame.location) : frame.path} [${frame.kind}${frame.index === undefined ? "" : ` index ${frame.index}`}]`);
    }
  }
  return `${printable(lines.join("\n"))}\n`;
}
