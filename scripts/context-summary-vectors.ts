import { scriptedContextSummary } from "../examples/context-history/scripted";
import {
  contextHistoryDigest, parseContextHistory, parseContextHistoryGeneration, parseContextHistoryNode,
  parseContextHistoryQueue, parseContextHistorySummary, parseContextHistorySummaryRequest, parseContextHistorySummaryResult,
  validateContextHistoryGeneration, validateContextHistoryQueue, validateContextHistorySummaryRequest, validateContextHistorySummaryResult,
} from "../src/context-history-contract";
import { digestCanonical } from "../src/digest";
import { AlgalError } from "../src/errors";
import { boundedJsonSnapshot } from "../src/json-snapshot";
import type { ProcessEvidence } from "../src/process-evidence";
import { asJsonValue, asObject, noUnknownKeys, type JsonValue } from "../src/values";

type Records = NonNullable<Awaited<ReturnType<typeof scriptedContextSummary>>["records"]>;
export type SummaryVector = { name: string; records: Records; result: JsonValue };
export function summaryVectorResult(input: unknown): JsonValue {
  try {
    const value = asObject(boundedJsonSnapshot(input, { maxBytes: 1_048_576, maxDepth: 12, maxNodes: 16_384, maxEntries: 2_047, maxStringBytes: 98_304 }, "summary vector"), "summary vector");
    noUnknownKeys(value, ["history", "node", "request", "queue", "result", "summary", "generation", "nodes"], "summary vector");
    const history = parseContextHistory(value.history), node = parseContextHistoryNode(value.node);
    const request = parseContextHistorySummaryRequest(value.request), queue = parseContextHistoryQueue(value.queue);
    const result = parseContextHistorySummaryResult(value.result), generation = parseContextHistoryGeneration(value.generation);
    const summary = value.summary === null ? null : parseContextHistorySummary(value.summary);
    if (!Array.isArray(value.nodes) || value.nodes.length > 1_023) throw new AlgalError("PARSE_FAILED", "summary vector nodes must be limited");
    const nodes = value.nodes.map(parseContextHistoryNode);
    validateContextHistorySummaryRequest(history, node, request, []);
    validateContextHistoryQueue(history, queue, [request]);
    validateContextHistorySummaryResult(request, result, summary);
    validateContextHistoryGeneration(history, generation, nodes, summary ? [summary] : []);
    if (result.status === "complete" && request.generation !== generation.generation) throw new AlgalError("PARSE_FAILED", "summary completion generation differs from request");
    return asJsonValue({ ok: true, value: { history: contextHistoryDigest(history), node: contextHistoryDigest(node),
      request: contextHistoryDigest(request), queue: contextHistoryDigest(queue), result: contextHistoryDigest(result),
      generation: contextHistoryDigest(generation), summary: summary ? contextHistoryDigest(summary) : null } }, "summary vector result");
  } catch (error) {
    if (!(error instanceof AlgalError)) throw error;
    return { ok: false, code: error.code };
  }
}
export async function contextSummaryVectors(): Promise<{
  vectors: SummaryVector[];
  evidence: { name: string; value: ProcessEvidence }[];
  golden: JsonValue;
}> {
  const vectors: SummaryVector[] = [], evidence: { name: string; value: ProcessEvidence }[] = [];
  const metrics: JsonValue[] = [];
  const add = (name: string, records: Records): void => { vectors.push({ name, records, result: summaryVectorResult(records) }); };
  let complete: Records | undefined;
  for (const outcome of ["complete", "failed"] as const) {
    const example = await scriptedContextSummary(true, outcome);
    if (!example.records || !example.evidence) throw new Error("scripted fixture did not return portable records");
    add(outcome, example.records);
    evidence.push({ name: outcome, value: example.evidence });
    metrics.push(asJsonValue({ name: outcome, evidence: digestCanonical(asJsonValue(example.evidence, "portable evidence")), charged: example.charged,
      original: example.original, view: example.view, readSignatures: example.readSignatures }, "fixture metrics"));
    if (outcome === "complete") complete = example.records;
  }
  if (!complete) throw new Error("missing completed fixture");
  const changes: [string, (value: Records) => void][] = [
    ["changed-body", value => { value.summary!.body += " A substituted body."; }],
    ["changed-prompt", value => { value.request.prompt = digestCanonical("another prompt"); }],
    ["changed-output-bytes", value => { value.result.usage.outputBytes++; }],
    ["skipped-generation", value => { value.generation.generation++; }],
    ["extra-result-key", value => { Object.assign(value.result, { unrecorded: true }); }],
  ];
  for (const [name, change] of changes) { const value = structuredClone(complete); change(value); add(name, value); }
  return { vectors, evidence, golden: asJsonValue({ schema: "algal.context-summary-vectors.v1",
    cases: vectors.map(({ name, result }) => ({ name, result })), metrics }, "summary vectors") };
}
if (import.meta.main) {
  if (Bun.argv.slice(2).join(" ") !== "--report") throw new Error("only --report is supported");
  console.log(JSON.stringify((await contextSummaryVectors()).golden, null, 2));
}
