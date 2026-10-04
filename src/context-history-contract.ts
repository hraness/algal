import { AGENT_CONTEXT_BOUNDS, type AgentContextKind } from "./agent-context";
import { applicationId, applicationInt, applicationList, applicationTag } from "./application-contract";
import { capabilityHandle, parseCapabilityHandle, type CapabilityHandle } from "./capabilities";
import { asDigest, digestCanonical, type Digest } from "./digest";
import { AlgalError } from "./errors";
import { boundedJsonSnapshot } from "./json-snapshot";
import { utf8Length } from "./utf8";
import { asJsonValue, asObject, canonicalize, noUnknownKeys, type JsonObject, type JsonValue } from "./values";

export const CONTEXT_HISTORY_BOUNDS = Object.freeze({
  maxLeaves: AGENT_CONTEXT_BOUNDS.maxEntries,
  maxEntryBytes: AGENT_CONTEXT_BOUNDS.maxEntryBytes,
  maxSourceBytes: AGENT_CONTEXT_BOUNDS.maxTotalBytes,
  maxLabelBytes: AGENT_CONTEXT_BOUNDS.maxLabelBytes,
  maxInternalNodes: 1023, maxTreeNodes: 2047, maxTreeDepth: 10,
  maxEpochs: 128, maxPositions: 131072, maxGeneration: 4095,
  maxHistoryBytes: 2097152, maxLeafBytes: 2048, maxNodeBytes: 2048,
  maxSummaryBytes: 16384, maxSummaryRecordBytes: 32768,
  maxRequestBytes: 4096, maxResultBytes: 2048, maxGenerationBytes: 262144,
  maxCursorBytes: 2048, maxViewBytes: 65536, maxViewItems: 128,
  maxGrantBytes: 16384, maxRefBytes: 512, maxQueueRecordBytes: 131072,
  maxQueuedJobs: 1023, maxQueueBytes: 524288, maxBatchJobs: 32,
  maxMaintenanceWork: 67108864, maxJsonDepth: 8, maxJsonNodes: 16384,
});
export const CONTEXT_HISTORY_READ_CEILINGS = Object.freeze({
  maxReadBytes: 65536, maxScanBytes: 8388608, maxOutputBytes: 65536,
  maxNodes: 2047, maxWork: 67108864, maxSearchResults: 128,
});
export const CONTEXT_HISTORY_JOB_CEILINGS = Object.freeze({
  maxSourceBytes: 65536, maxInputBytes: 131072, maxOutputBytes: 32768,
  maxWork: 16777216, maxModelCalls: 1,
});
export type ContextHistoryScope = { application: string; realm: string; workspace: string; task: string; audience: string };
export type ContextHistoryLeaf = {
  position: number; event: Digest; sourceIndex: number; entry: Digest;
  bytes: number; kind: AgentContextKind; label: string;
};
export type ContextHistory = {
  schema: "algal.context-history.v1"; scope: ContextHistoryScope; head: Digest; snapshot: Digest;
  epoch: number; firstPosition: number; leaves: ContextHistoryLeaf[];
};
export type ContextHistoryNode = {
  schema: "algal.context-history-node.v1"; history: Digest; start: number; end: number; sources: Digest;
};
export type ContextHistoryLineage = {
  history: Digest; node: Digest; sources: Digest; children: Digest[];
  prompt: Digest; policy: Digest; summarizer: Digest;
};
export type ContextHistorySummary = ContextHistoryLineage & { schema: "algal.context-history-summary.v1"; body: string };
export type ContextHistoryReadLimits = { [K in keyof typeof CONTEXT_HISTORY_READ_CEILINGS]: number };
export type ContextHistoryJobLimits = { [K in keyof typeof CONTEXT_HISTORY_JOB_CEILINGS]: number };
export type ContextHistorySummaryRequest = ContextHistoryLineage & {
  schema: "algal.context-history-summary-request.v1"; generation: number; limits: ContextHistoryJobLimits;
};
export type ContextHistorySummaryUsage = { inputBytes: number; outputBytes: number; work: number; modelCalls: number };
export type ContextHistorySummaryFailure = "failed" | "cancelled" | "uncertain" | "budget-exhausted";
export type ContextHistorySummaryResult = {
  schema: "algal.context-history-summary-result.v1"; request: Digest; usage: ContextHistorySummaryUsage;
} & (
  | { status: "complete"; summary: Digest; receipt: Digest; reason: null }
  | { [S in ContextHistorySummaryFailure]: { status: S; summary: null; receipt: Digest | null; reason: S } }[ContextHistorySummaryFailure]
);
export type ContextHistoryGeneration = {
  schema: "algal.context-history-generation.v1"; history: Digest; generation: number;
  prompt: Digest; policy: Digest; summarizer: Digest; summaries: { node: Digest; summary: Digest }[];
};
export type ContextHistoryViewBinding = {
  history: Digest; head: Digest; audience: string; generation: Digest;
  policy: Digest; budget: Digest; selection: Digest;
};
export type ContextHistoryCursor = { schema: "algal.context-history-cursor.v1"; binding: ContextHistoryViewBinding; offset: number };
export type ContextHistoryUnavailableReason = "source-unavailable" | "retention-expired" | "source-not-selected" | "revoked";
export type ContextHistoryIncompleteReason = "page-limit" | "missing-summary" | "source-unavailable" | "cancelled";
export type ContextHistoryBudgetReason = "read-limit" | "scan-limit" | "output-limit" | "work-limit" | "protected-overflow";
export type ContextHistoryViewItem = { node: Digest; start: number; end: number } & (
  | { kind: "exact"; text: string }
  | { kind: "summary"; summary: Digest; text: string }
  | { kind: "pending"; reason: "missing-summary" }
  | { kind: "unavailable"; reason: ContextHistoryUnavailableReason }
);
export type ContextHistoryView = {
  schema: "algal.context-history-view.v1"; binding: ContextHistoryViewBinding; limits: ContextHistoryReadLimits;
  start: number; end: number; items: ContextHistoryViewItem[];
  usage: { readBytes: number; scanBytes: number; nodeVisits: number; work: number };
} & (
  | { status: "complete"; reason: null; cursor: null }
  | { status: "incomplete"; reason: ContextHistoryIncompleteReason; cursor: ContextHistoryCursor | null }
  | { status: "unavailable"; reason: ContextHistoryUnavailableReason; cursor: ContextHistoryCursor | null }
  | { status: "budget-exhausted"; reason: ContextHistoryBudgetReason; cursor: ContextHistoryCursor | null }
);
export type ContextHistoryGrant = {
  schema: "algal.context-history-grant.v1"; history: Digest; scope: ContextHistoryScope;
  indices: number[]; limits: ContextHistoryReadLimits;
};
export type ContextHistoryRef = { schema: "algal.context-history-ref.v1"; history: Digest; capability: CapabilityHandle };
export type ContextHistoryAccess = {
  schema: "algal.context-history-access.v1"; history: Digest; scope: ContextHistoryScope; head: Digest;
  snapshot: Digest; revision: number; indices: number[]; state: "active" | "revoked" | "unavailable";
};
export type ContextHistoryQueue = {
  schema: "algal.context-history-queue.v1"; history: Digest; generation: number;
  requests: Digest[]; batchSize: number; work: number;
};
export type ContextHistoryRecord = ContextHistory | ContextHistoryNode | ContextHistorySummary | ContextHistorySummaryRequest |
  ContextHistorySummaryResult | ContextHistoryGeneration | ContextHistoryCursor | ContextHistoryView |
  ContextHistoryGrant | ContextHistoryRef | ContextHistoryAccess | ContextHistoryQueue;

const B = CONTEXT_HISTORY_BOUNDS;
const unavailable = ["source-unavailable", "retention-expired", "source-not-selected", "revoked"] as const;
const incomplete = ["page-limit", "missing-summary", "source-unavailable", "cancelled"] as const;
const budgetReasons = ["read-limit", "scan-limit", "output-limit", "work-limit", "protected-overflow"] as const;
const lineageKeys = ["history", "node", "sources", "children", "prompt", "policy", "summarizer"] as const;
function invalid(message: string): never { throw new AlgalError("PARSE_FAILED", message); }
function exhausted(message: string): never { throw new AlgalError("BUDGET_EXHAUSTED", message); }
function denied(): never { throw new AlgalError("CAPABILITY_DENIED", "context history scope does not authorize this operation"); }
function closed(input: unknown, fields: readonly string[]): JsonObject {
  const v = asObject(input, "context history object");
  noUnknownKeys(v, fields, "context history object");
  if (fields.some(key => !Object.hasOwn(v, key))) invalid("context history object has a missing field");
  return v;
}
function json(input: unknown, maxBytes: number = B.maxHistoryBytes): JsonValue {
  return boundedJsonSnapshot(input, {
    maxBytes, maxDepth: B.maxJsonDepth, maxNodes: B.maxJsonNodes,
    maxEntries: B.maxTreeNodes, maxStringBytes: CONTEXT_HISTORY_READ_CEILINGS.maxReadBytes * 6,
    sortObjectKeys: true,
  }, "context history record");
}
function hash(input: unknown): Digest { return digestCanonical(asJsonValue(input, "context history identity")); }
function encodedBytes(input: unknown): number { return utf8Length(canonicalize(asJsonValue(input, "context history record"))); }
function byteBound(input: unknown, max: number): void {
  if (encodedBytes(input) > max) exhausted(`context history record exceeds ${max} encoded bytes`);
}
function same(a: unknown, b: unknown): boolean { return hash(a) === hash(b); }
function text(input: unknown, max: number): string {
  if (typeof input !== "string" || input.length > max || /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u.test(input) || utf8Length(input) > max) invalid("context history text exceeds its UTF-8 bound or is invalid Unicode");
  return input;
}
function oneOf<T extends string>(input: unknown, allowed: readonly T[]): T {
  if (typeof input !== "string" || !allowed.includes(input as T)) invalid("invalid context history tag");
  return input as T;
}
function scope(input: unknown): ContextHistoryScope {
  const v = closed(input, ["application", "realm", "workspace", "task", "audience"]);
  return { application: applicationId(v.application), realm: applicationId(v.realm), workspace: applicationId(v.workspace), task: applicationId(v.task), audience: applicationId(v.audience) };
}
function range(start: unknown, end: unknown): { start: number; end: number } {
  const a = applicationInt(start, 0, B.maxLeaves - 1), b = applicationInt(end, a + 1, B.maxLeaves);
  const length = b - a;
  if ((length & (length - 1)) !== 0 || a % length !== 0 || Math.log2(length) > B.maxTreeDepth) invalid("context history ranges must be aligned powers of two");
  return { start: a, end: b };
}
function refs(input: unknown, max: number): Digest[] {
  const result = applicationList(input, max, value => asDigest(value, "context history reference"));
  if (new Set(result).size !== result.length) invalid("duplicate context history reference");
  return result;
}
function indices(input: unknown): number[] {
  const result = applicationList(input, B.maxLeaves, value => applicationInt(value, 0, B.maxLeaves - 1));
  if (result.some((value, index) => index > 0 && result[index - 1]! >= value)) invalid("context history indices must be unique and increasing");
  return result;
}
function readLimits(input: unknown): ContextHistoryReadLimits {
  const v = closed(input, Object.keys(CONTEXT_HISTORY_READ_CEILINGS));
  return {
    maxReadBytes: applicationInt(v.maxReadBytes, 1, CONTEXT_HISTORY_READ_CEILINGS.maxReadBytes),
    maxScanBytes: applicationInt(v.maxScanBytes, 1, CONTEXT_HISTORY_READ_CEILINGS.maxScanBytes),
    maxOutputBytes: applicationInt(v.maxOutputBytes, 1, CONTEXT_HISTORY_READ_CEILINGS.maxOutputBytes),
    maxNodes: applicationInt(v.maxNodes, 1, CONTEXT_HISTORY_READ_CEILINGS.maxNodes),
    maxWork: applicationInt(v.maxWork, 1, CONTEXT_HISTORY_READ_CEILINGS.maxWork),
    maxSearchResults: applicationInt(v.maxSearchResults, 1, CONTEXT_HISTORY_READ_CEILINGS.maxSearchResults),
  };
}
function jobLimits(input: unknown): ContextHistoryJobLimits {
  const v = closed(input, Object.keys(CONTEXT_HISTORY_JOB_CEILINGS));
  return {
    maxSourceBytes: applicationInt(v.maxSourceBytes, 1, CONTEXT_HISTORY_JOB_CEILINGS.maxSourceBytes),
    maxInputBytes: applicationInt(v.maxInputBytes, 1, CONTEXT_HISTORY_JOB_CEILINGS.maxInputBytes),
    maxOutputBytes: applicationInt(v.maxOutputBytes, 1, CONTEXT_HISTORY_JOB_CEILINGS.maxOutputBytes),
    maxWork: applicationInt(v.maxWork, 1, CONTEXT_HISTORY_JOB_CEILINGS.maxWork),
    maxModelCalls: applicationInt(v.maxModelCalls, 1, CONTEXT_HISTORY_JOB_CEILINGS.maxModelCalls),
  };
}
function leaf(input: unknown): ContextHistoryLeaf {
  const v = closed(input, ["position", "event", "sourceIndex", "entry", "bytes", "kind", "label"]);
  return {
    position: applicationInt(v.position, 0, B.maxPositions - 1), event: asDigest(v.event, "source event"),
    sourceIndex: applicationInt(v.sourceIndex, 0, B.maxLeaves - 1), entry: asDigest(v.entry, "original entry"),
    bytes: applicationInt(v.bytes, 0, B.maxEntryBytes), kind: oneOf(v.kind, ["instruction", "input", "observation", "output"]), label: text(v.label, B.maxLabelBytes),
  };
}
export function parseContextHistoryLeaf(input: unknown): ContextHistoryLeaf { return leaf(json(input, B.maxLeafBytes)); }
function historyRecord(input: JsonObject): ContextHistory {
  const v = closed(input, ["schema", "scope", "head", "snapshot", "epoch", "firstPosition", "leaves"]);
  const firstPosition = applicationInt(v.firstPosition, 0, B.maxPositions);
  const leaves = applicationList(v.leaves, B.maxLeaves, leaf);
  if (firstPosition + leaves.length > B.maxPositions || leaves.some((row, index) => row.position !== firstPosition + index)) invalid("context history positions must form the captured consecutive prefix");
  if (new Set(leaves.map(row => row.event)).size !== leaves.length || new Set(leaves.map(row => row.sourceIndex)).size !== leaves.length) invalid("duplicate context history source event or snapshot index");
  if (leaves.reduce((sum, row) => sum + row.bytes, 0) > B.maxSourceBytes) exhausted("context history source byte bound exceeded");
  const bodies = new Map<Digest, ContextHistoryLeaf>();
  for (const row of leaves) {
    const previous = bodies.get(row.entry);
    if (previous && (row.bytes !== previous.bytes || row.kind !== previous.kind || row.label !== previous.label)) invalid("conflicting metadata for the same original entry");
    bodies.set(row.entry, row);
  }
  return { schema: "algal.context-history.v1", scope: scope(v.scope), head: asDigest(v.head, "captured head"), snapshot: asDigest(v.snapshot, "original snapshot"), epoch: applicationInt(v.epoch, 0, B.maxEpochs - 1), firstPosition, leaves };
}
function nodeRecord(input: JsonObject): ContextHistoryNode {
  const v = closed(input, ["schema", "history", "start", "end", "sources"]);
  byteBound(v, B.maxNodeBytes);
  return { schema: "algal.context-history-node.v1", history: asDigest(v.history, "history"), ...range(v.start, v.end), sources: asDigest(v.sources, "ordered sources") };
}
function lineage(v: JsonObject): ContextHistoryLineage {
  const children = refs(v.children, 2);
  if (children.length !== 0 && children.length !== 2) invalid("a summary must use originals or exactly two ordered children");
  return { history: asDigest(v.history, "history"), node: asDigest(v.node, "source node"), sources: asDigest(v.sources, "ordered sources"), children, prompt: asDigest(v.prompt, "prompt"), policy: asDigest(v.policy, "policy"), summarizer: asDigest(v.summarizer, "summarizer") };
}
function summaryRecord(input: JsonObject): ContextHistorySummary {
  const v = closed(input, ["schema", ...lineageKeys, "body"]);
  byteBound(v, B.maxSummaryRecordBytes);
  return { schema: "algal.context-history-summary.v1", ...lineage(v), body: text(v.body, B.maxSummaryBytes) };
}
function requestRecord(input: JsonObject): ContextHistorySummaryRequest {
  const v = closed(input, ["schema", ...lineageKeys, "generation", "limits"]);
  byteBound(v, B.maxRequestBytes);
  return { schema: "algal.context-history-summary-request.v1", ...lineage(v), generation: applicationInt(v.generation, 0, B.maxGeneration), limits: jobLimits(v.limits) };
}
function resultRecord(input: JsonObject): ContextHistorySummaryResult {
  const v = closed(input, ["schema", "request", "status", "summary", "receipt", "usage", "reason"]);
  byteBound(v, B.maxResultBytes);
  const u = closed(v.usage, ["inputBytes", "outputBytes", "work", "modelCalls"]);
  const base = { schema: "algal.context-history-summary-result.v1" as const, request: asDigest(v.request, "summary request"), usage: {
    inputBytes: applicationInt(u.inputBytes, 0, CONTEXT_HISTORY_JOB_CEILINGS.maxInputBytes), outputBytes: applicationInt(u.outputBytes, 0, CONTEXT_HISTORY_JOB_CEILINGS.maxOutputBytes),
    work: applicationInt(u.work, 0, CONTEXT_HISTORY_JOB_CEILINGS.maxWork), modelCalls: applicationInt(u.modelCalls, 0, CONTEXT_HISTORY_JOB_CEILINGS.maxModelCalls),
  } };
  if (v.status === "complete") {
    if (v.reason !== null) invalid("a complete summary result has no failure reason");
    return { ...base, status: "complete", summary: asDigest(v.summary, "derived summary"), receipt: asDigest(v.receipt, "execution receipt"), reason: null };
  }
  const status = oneOf(v.status, ["failed", "cancelled", "uncertain", "budget-exhausted"]);
  if (v.summary !== null || v.reason !== status || (status === "uncertain" && base.usage.modelCalls !== 1)) invalid("invalid incomplete summary result");
  return { ...base, status, summary: null, receipt: v.receipt === null ? null : asDigest(v.receipt, "execution receipt"), reason: status } as ContextHistorySummaryResult;
}
function generationRecord(input: JsonObject): ContextHistoryGeneration {
  const v = closed(input, ["schema", "history", "generation", "prompt", "policy", "summarizer", "summaries"]);
  byteBound(v, B.maxGenerationBytes);
  const summaries = applicationList(v.summaries, B.maxInternalNodes, row => {
    const r = closed(row, ["node", "summary"]);
    return { node: asDigest(r.node, "source node"), summary: asDigest(r.summary, "derived summary") };
  });
  if (new Set(summaries.map(row => row.node)).size !== summaries.length || new Set(summaries.map(row => row.summary)).size !== summaries.length) invalid("duplicate published summary or source node");
  return { schema: "algal.context-history-generation.v1", history: asDigest(v.history, "history"), generation: applicationInt(v.generation, 0, B.maxGeneration), prompt: asDigest(v.prompt, "prompt"), policy: asDigest(v.policy, "policy"), summarizer: asDigest(v.summarizer, "summarizer"), summaries };
}
function binding(input: unknown): ContextHistoryViewBinding {
  const v = closed(input, ["history", "head", "audience", "generation", "policy", "budget", "selection"]);
  return { history: asDigest(v.history, "history"), head: asDigest(v.head, "captured head"), audience: applicationId(v.audience), generation: asDigest(v.generation, "view generation"), policy: asDigest(v.policy, "view policy"), budget: asDigest(v.budget, "read budget"), selection: asDigest(v.selection, "view selection") };
}
function cursorRecord(input: unknown): ContextHistoryCursor {
  const v = closed(input, ["schema", "binding", "offset"]);
  applicationTag(v.schema, "algal.context-history-cursor.v1");
  byteBound(v, B.maxCursorBytes);
  return { schema: "algal.context-history-cursor.v1", binding: binding(v.binding), offset: applicationInt(v.offset, 0, B.maxLeaves) };
}
function viewItem(input: unknown): ContextHistoryViewItem {
  const raw = asObject(input, "context history view item");
  const kind = oneOf(raw.kind, ["exact", "summary", "pending", "unavailable"]);
  const v = closed(raw, ["kind", "node", "start", "end", ...(kind === "exact" ? ["text"] : kind === "summary" ? ["summary", "text"] : ["reason"])]);
  const base = { node: asDigest(v.node, "source node"), ...range(v.start, v.end) };
  if (kind === "exact") {
    if (base.end - base.start !== 1) invalid("exact view items must name one original leaf");
    return { ...base, kind, text: text(v.text, CONTEXT_HISTORY_READ_CEILINGS.maxReadBytes) };
  }
  if (kind === "summary") {
    if (base.end - base.start < 2) invalid("a derived summary must name an internal node");
    return { ...base, kind, summary: asDigest(v.summary, "derived summary"), text: text(v.text, B.maxSummaryBytes) };
  }
  if (kind === "pending") {
    applicationTag(v.reason, "missing-summary");
    return { ...base, kind, reason: "missing-summary" };
  }
  return { ...base, kind, reason: oneOf(v.reason, unavailable) };
}
function viewRecord(input: JsonObject): ContextHistoryView {
  const v = closed(input, ["schema", "binding", "limits", "start", "end", "items", "status", "reason", "cursor", "usage"]);
  const limits = readLimits(v.limits);
  byteBound(v, limits.maxOutputBytes);
  const start = applicationInt(v.start, 0, B.maxLeaves), end = applicationInt(v.end, start, B.maxLeaves);
  const items = applicationList(v.items, B.maxViewItems, viewItem);
  let offset = start, bodyBytes = 0;
  for (const item of items) {
    if (item.start !== offset) invalid("context history view coverage has a gap or overlap");
    offset = item.end;
    if (item.kind === "exact" || item.kind === "summary") bodyBytes += utf8Length(item.text);
  }
  if (offset !== end) invalid("context history view coverage differs from its declared range");
  const pageBinding = binding(v.binding);
  const cursor = v.cursor === null ? null : cursorRecord(v.cursor);
  if (cursor && (!same(cursor.binding, pageBinding) || cursor.offset !== end)) invalid("context history continuation changed its captured binding or offset");
  const u = closed(v.usage, ["readBytes", "scanBytes", "nodeVisits", "work"]);
  const usage = { readBytes: applicationInt(u.readBytes, 0, limits.maxReadBytes), scanBytes: applicationInt(u.scanBytes, 0, limits.maxScanBytes), nodeVisits: applicationInt(u.nodeVisits, 0, limits.maxNodes), work: applicationInt(u.work, 0, limits.maxWork) };
  if (usage.readBytes < bodyBytes || usage.nodeVisits < items.length || usage.work < usage.nodeVisits) invalid("context history view understates displayed bytes or node work");
  const base = { schema: "algal.context-history-view.v1" as const, binding: pageBinding, limits, start, end, items, usage };
  if (v.status === "complete") {
    if (v.reason !== null || cursor !== null || items.some(item => item.kind === "pending" || item.kind === "unavailable")) invalid("a complete context history view cannot hide missing ranges or a continuation");
    return { ...base, status: "complete", reason: null, cursor: null };
  }
  if (v.status === "incomplete") return { ...base, status: "incomplete", reason: oneOf(v.reason, incomplete), cursor };
  if (v.status === "unavailable") {
    if (items.some(item => item.kind === "exact" || item.kind === "summary")) invalid("an unavailable view cannot contain readable bodies");
    return { ...base, status: "unavailable", reason: oneOf(v.reason, unavailable), cursor };
  }
  applicationTag(v.status, "budget-exhausted");
  return { ...base, status: "budget-exhausted", reason: oneOf(v.reason, budgetReasons), cursor };
}
function grantRecord(input: JsonObject): ContextHistoryGrant {
  const v = closed(input, ["schema", "history", "scope", "indices", "limits"]);
  byteBound(v, B.maxGrantBytes);
  return { schema: "algal.context-history-grant.v1", history: asDigest(v.history, "history"), scope: scope(v.scope), indices: indices(v.indices), limits: readLimits(v.limits) };
}
function accessRecord(input: JsonObject): ContextHistoryAccess {
  const v = closed(input, ["schema", "history", "scope", "head", "snapshot", "revision", "indices", "state"]);
  byteBound(v, B.maxGrantBytes);
  return { schema: "algal.context-history-access.v1", history: asDigest(v.history, "history"), scope: scope(v.scope), head: asDigest(v.head, "captured head"), snapshot: asDigest(v.snapshot, "original snapshot"), revision: applicationInt(v.revision, 0, B.maxGeneration), indices: indices(v.indices), state: oneOf(v.state, ["active", "revoked", "unavailable"]) };
}
function refRecord(input: JsonObject): ContextHistoryRef {
  const v = closed(input, ["schema", "history", "capability"]);
  byteBound(v, B.maxRefBytes);
  return { schema: "algal.context-history-ref.v1", history: asDigest(v.history, "history"), capability: parseCapabilityHandle(v.capability, "context-history").handle };
}
function queueRecord(input: JsonObject): ContextHistoryQueue {
  const v = closed(input, ["schema", "history", "generation", "requests", "batchSize", "work"]);
  byteBound(v, B.maxQueueRecordBytes);
  return { schema: "algal.context-history-queue.v1", history: asDigest(v.history, "history"), generation: applicationInt(v.generation, 0, B.maxGeneration), requests: refs(v.requests, B.maxQueuedJobs), batchSize: applicationInt(v.batchSize, 1, B.maxBatchJobs), work: applicationInt(v.work, 0, B.maxMaintenanceWork) };
}
export function parseContextHistoryRecord(input: unknown): ContextHistoryRecord {
  const v = asObject(json(input), "context history record");
  switch (v.schema) {
    case "algal.context-history.v1": return historyRecord(v);
    case "algal.context-history-node.v1": return nodeRecord(v);
    case "algal.context-history-summary.v1": return summaryRecord(v);
    case "algal.context-history-summary-request.v1": return requestRecord(v);
    case "algal.context-history-summary-result.v1": return resultRecord(v);
    case "algal.context-history-generation.v1": return generationRecord(v);
    case "algal.context-history-cursor.v1": return cursorRecord(v);
    case "algal.context-history-view.v1": return viewRecord(v);
    case "algal.context-history-grant.v1": return grantRecord(v);
    case "algal.context-history-ref.v1": return refRecord(v);
    case "algal.context-history-access.v1": return accessRecord(v);
    case "algal.context-history-queue.v1": return queueRecord(v);
    default: return invalid("invalid context history schema");
  }
}
type RecordFor<S extends ContextHistoryRecord["schema"]> = Extract<ContextHistoryRecord, { schema: S }>;
function parse<S extends ContextHistoryRecord["schema"]>(input: unknown, schema: S): RecordFor<S> {
  const value = parseContextHistoryRecord(input);
  applicationTag(value.schema, schema);
  return value as RecordFor<S>;
}
export const parseContextHistory = (input: unknown): ContextHistory => parse(input, "algal.context-history.v1");
export const parseContextHistoryNode = (input: unknown): ContextHistoryNode => parse(input, "algal.context-history-node.v1");
export const parseContextHistorySummary = (input: unknown): ContextHistorySummary => parse(input, "algal.context-history-summary.v1");
export const parseContextHistorySummaryRequest = (input: unknown): ContextHistorySummaryRequest => parse(input, "algal.context-history-summary-request.v1");
export const parseContextHistorySummaryResult = (input: unknown): ContextHistorySummaryResult => parse(input, "algal.context-history-summary-result.v1");
export const parseContextHistoryGeneration = (input: unknown): ContextHistoryGeneration => parse(input, "algal.context-history-generation.v1");
export const parseContextHistoryCursor = (input: unknown): ContextHistoryCursor => parse(input, "algal.context-history-cursor.v1");
export const parseContextHistoryView = (input: unknown): ContextHistoryView => parse(input, "algal.context-history-view.v1");
export const parseContextHistoryGrant = (input: unknown): ContextHistoryGrant => parse(input, "algal.context-history-grant.v1");
export const parseContextHistoryAccess = (input: unknown): ContextHistoryAccess => parse(input, "algal.context-history-access.v1");
export const parseContextHistoryRef = (input: unknown): ContextHistoryRef => parse(input, "algal.context-history-ref.v1");
export const parseContextHistoryQueue = (input: unknown): ContextHistoryQueue => parse(input, "algal.context-history-queue.v1");
export function contextHistoryDigest(input: unknown): Digest { return hash(parseContextHistoryRecord(input)); }

function denseArray(input: unknown, max: number): unknown[] {
  if (!Array.isArray(input) || Object.getPrototypeOf(input) !== Array.prototype || input.length > max || Reflect.ownKeys(input).length !== input.length + 1) invalid("context history inputs must be ordinary dense arrays without extra properties");
  const result: unknown[] = [];
  for (let index = 0; index < input.length; index++) {
    const descriptor = Object.getOwnPropertyDescriptor(input, index);
    if (!descriptor || !Object.hasOwn(descriptor, "value") || !descriptor.enumerable) invalid("context history array elements must be enumerable data properties");
    result.push(descriptor.value as unknown);
  }
  return result;
}
function sourceEntry(source: ContextHistoryLeaf, input: unknown): void {
  const v = closed(boundedJsonSnapshot(input, {
    maxBytes: B.maxEntryBytes * 6 + 2048, maxDepth: 1, maxNodes: 5, maxEntries: 4,
    maxStringBytes: B.maxEntryBytes * 6, sortObjectKeys: true,
  }, "original context history entry"), ["schema", "kind", "label", "text"]);
  applicationTag(v.schema, "algal.agent-context-entry.v1");
  const kind = oneOf(v.kind, ["instruction", "input", "observation", "output"]);
  const label = text(v.label, B.maxLabelBytes), body = text(v.text, B.maxEntryBytes);
  if (hash(v) !== source.entry || utf8Length(body) !== source.bytes || kind !== source.kind || label !== source.label) throw new AlgalError("DIGEST_MISMATCH", "original context history entry differs from captured metadata");
}
export function validateContextHistorySources(historyInput: unknown, snapshotInput: unknown, entriesInput: unknown): void {
  const history = parseContextHistory(historyInput);
  const snapshot = closed(boundedJsonSnapshot(snapshotInput, {
    maxBytes: 262144, maxDepth: 3, maxNodes: 4096, maxEntries: B.maxLeaves, maxStringBytes: 100, sortObjectKeys: true,
  }, "original context history snapshot"), ["schema", "entries"]);
  applicationTag(snapshot.schema, "algal.agent-context.v1");
  const rows = applicationList(snapshot.entries, B.maxLeaves, input => {
    const v = closed(input, ["digest", "bytes"]);
    return { digest: asDigest(v.digest, "original context entry"), bytes: applicationInt(v.bytes, 0, B.maxEntryBytes) };
  });
  if (rows.reduce((sum, row) => sum + row.bytes, 0) > B.maxSourceBytes) exhausted("original context history snapshot source byte bound exceeded");
  if (hash(snapshot) !== history.snapshot) throw new AlgalError("DIGEST_MISMATCH", "original context history snapshot differs from captured identity");
  const entries = denseArray(entriesInput, B.maxLeaves);
  if (entries.length !== history.leaves.length) invalid("context history source proof count differs from captured leaves");
  for (const [index, source] of history.leaves.entries()) {
    const row = rows[source.sourceIndex];
    if (!row || row.digest !== source.entry || row.bytes !== source.bytes) invalid("context history leaf differs from its original snapshot source");
    sourceEntry(source, entries[index]);
  }
}
function makeNode(history: ContextHistory, start: number, end: number, id: Digest = hash(history)): ContextHistoryNode {
  const r = range(start, end);
  if (r.end > history.leaves.length) invalid("context history node extends beyond the captured head");
  return { schema: "algal.context-history-node.v1", history: id, ...r, sources: hash({ schema: "algal.context-history-sources.v1", history: id, leaves: history.leaves.slice(r.start, r.end) }) };
}
export function contextHistoryNode(historyInput: unknown, start: number, end: number): ContextHistoryNode { return makeNode(parseContextHistory(historyInput), start, end); }
function checkedNode(history: ContextHistory, node: ContextHistoryNode, id: Digest = hash(history)): void {
  if (!same(node, makeNode(history, node.start, node.end, id))) invalid("context history node has a different history or ordered source set");
}
export function validateContextHistoryNode(historyInput: unknown, nodeInput: unknown): void { checkedNode(parseContextHistory(historyInput), parseContextHistoryNode(nodeInput)); }
function recipeEqual(a: { prompt: Digest; policy: Digest; summarizer: Digest }, b: { prompt: Digest; policy: Digest; summarizer: Digest }): boolean {
  return a.prompt === b.prompt && a.policy === b.policy && a.summarizer === b.summarizer;
}
function checkedLineage(history: ContextHistory, node: ContextHistoryNode, value: ContextHistoryLineage, children: ContextHistorySummary[], id: Digest = hash(history)): void {
  checkedNode(history, node, id);
  if (node.end - node.start < 2 || value.history !== node.history || value.node !== hash(node) || value.sources !== node.sources || children.length !== value.children.length) invalid("summary lineage differs from the captured source node");
  if (children.length === 0) return;
  if (node.end - node.start < 4) invalid("summary children must name internal nodes, not original leaves");
  const middle = (node.start + node.end) / 2;
  const halves = [makeNode(history, node.start, middle, id), makeNode(history, middle, node.end, id)];
  for (const [index, child] of children.entries()) {
    const half = halves[index]!;
    if (hash(child) !== value.children[index] || child.history !== value.history || child.node !== hash(half) || child.sources !== half.sources || !recipeEqual(value, child)) invalid("summary child has a different history, audience, range, body or recipe");
  }
}
export function validateContextHistorySummary(historyInput: unknown, nodeInput: unknown, summaryInput: unknown, childrenInput: unknown): void {
  checkedLineage(parseContextHistory(historyInput), parseContextHistoryNode(nodeInput), parseContextHistorySummary(summaryInput), denseArray(childrenInput, 2).map(parseContextHistorySummary));
}
export function validateContextHistorySummaryRequest(historyInput: unknown, nodeInput: unknown, requestInput: unknown, childrenInput: unknown): void {
  const history = parseContextHistory(historyInput), node = parseContextHistoryNode(nodeInput), request = parseContextHistorySummaryRequest(requestInput);
  const children = denseArray(childrenInput, 2).map(parseContextHistorySummary);
  checkedLineage(history, node, request, children);
  if (children.length === 0 && history.leaves.slice(node.start, node.end).reduce((sum, row) => sum + row.bytes, 0) > request.limits.maxSourceBytes) exhausted("summary request exceeds its original-source read allowance");
  if (children.length > 0 && encodedBytes(children) > request.limits.maxInputBytes) exhausted("summary request exceeds its encoded child input allowance");
}
export function validateContextHistorySummaryResult(requestInput: unknown, resultInput: unknown, summaryInput: unknown): void {
  const request = parseContextHistorySummaryRequest(requestInput), result = parseContextHistorySummaryResult(resultInput);
  if (result.request !== hash(request)) invalid("summary result belongs to a different request");
  for (const [field, max] of [["inputBytes", request.limits.maxInputBytes], ["outputBytes", request.limits.maxOutputBytes], ["work", request.limits.maxWork], ["modelCalls", request.limits.maxModelCalls]] as const) {
    if (result.usage[field] > max) exhausted("summary result exceeds its requested work allowance");
  }
  if (result.status !== "complete") {
    if (summaryInput !== null) invalid("an incomplete summary result cannot publish a derivative");
    return;
  }
  const summary = parseContextHistorySummary(summaryInput);
  if (hash(summary) !== result.summary || result.usage.outputBytes !== encodedBytes(summary) || lineageKeys.some(key => !same(summary[key], request[key]))) invalid("summary result changed its body, lineage, recipe or encoded output size");
}
function internalNodeCount(leaves: number): number {
  let bits = 0;
  for (let value = leaves; value > 0; value >>>= 1) bits += value & 1;
  return leaves - bits;
}
function checkedPool(history: ContextHistory, generation: ContextHistoryGeneration, nodesInput: unknown, summariesInput: unknown, complete: boolean): { nodes: Map<Digest, ContextHistoryNode>; summaries: Map<Digest, ContextHistorySummary> } {
  const id = hash(history);
  if (generation.history !== id) invalid("summary generation belongs to another captured history or audience");
  const nodeRows = denseArray(nodesInput, B.maxTreeNodes).map(parseContextHistoryNode);
  const summaryRows = denseArray(summariesInput, B.maxInternalNodes).map(parseContextHistorySummary);
  const count = internalNodeCount(history.leaves.length);
  if (nodeRows.length > history.leaves.length + count || summaryRows.length > count || generation.summaries.length > count) invalid("captured history tree or internal summary capacity exceeded");
  const nodeMap = new Map<Digest, ContextHistoryNode>(), summaryMap = new Map<Digest, ContextHistorySummary>();
  for (const node of nodeRows) { checkedNode(history, node, id); nodeMap.set(hash(node), node); }
  for (const summary of summaryRows) summaryMap.set(hash(summary), summary);
  if (nodeMap.size !== nodeRows.length || summaryMap.size !== summaryRows.length) invalid("duplicate source descriptor or conflicting summary body");
  if (complete && summaryRows.length !== generation.summaries.length) invalid("published generation has missing or extra summaries");
  const published = new Map(generation.summaries.map(row => [row.summary, row.node]));
  for (const summary of summaryRows) {
    const node = nodeMap.get(summary.node);
    if (!node || published.get(hash(summary)) !== summary.node || !recipeEqual(summary, generation)) invalid("published summary differs from its generation or source descriptor");
    const children = summary.children.map(id => {
      const child = summaryMap.get(id);
      if (!child) invalid("published summary child is unavailable");
      return child;
    });
    checkedLineage(history, node, summary, children, id);
  }
  if (complete && generation.summaries.some(row => !summaryMap.has(row.summary))) invalid("published generation contains an unavailable summary");
  return { nodes: nodeMap, summaries: summaryMap };
}
export function validateContextHistoryGeneration(historyInput: unknown, generationInput: unknown, nodesInput: unknown, summariesInput: unknown): void {
  checkedPool(parseContextHistory(historyInput), parseContextHistoryGeneration(generationInput), nodesInput, summariesInput, true);
}
export function validateContextHistoryView(historyInput: unknown, generationInput: unknown, viewInput: unknown, nodesInput: unknown, summariesInput: unknown, cursorInput?: unknown): void {
  const history = parseContextHistory(historyInput), generation = parseContextHistoryGeneration(generationInput), view = parseContextHistoryView(viewInput);
  const pool = checkedPool(history, generation, nodesInput, summariesInput, false);
  if (view.binding.history !== hash(history) || view.binding.head !== history.head || view.binding.audience !== history.scope.audience || view.binding.generation !== hash(generation) || view.binding.policy !== generation.policy || view.binding.budget !== hash(view.limits)) invalid("context history view changed its captured head, audience, generation, policy or budget");
  if (view.end > history.leaves.length || (view.status === "complete" && view.end !== history.leaves.length) || (view.end < history.leaves.length && view.cursor === null && view.status !== "unavailable")) invalid("context history view omits its unfinished captured prefix");
  if (cursorInput !== undefined) {
    const cursor = parseContextHistoryCursor(cursorInput);
    if (!same(cursor.binding, view.binding) || cursor.offset !== view.start) invalid("context history continuation belongs to a different head, audience, generation, selection or budget");
  }
  for (const item of view.items) {
    const node = pool.nodes.get(item.node);
    if (!node || node.start !== item.start || node.end !== item.end) invalid("context history view item changed its source range");
    if (item.kind === "exact") {
      const original = history.leaves[item.start]!;
      sourceEntry(original, { schema: "algal.agent-context-entry.v1", kind: original.kind, label: original.label, text: item.text });
    } else if (item.kind === "summary") {
      const summary = pool.summaries.get(item.summary);
      if (!summary || summary.node !== item.node || summary.body !== item.text) invalid("context history view changed a published summary body");
    }
  }
}
export function validateContextHistoryQueue(historyInput: unknown, queueInput: unknown, requestsInput: unknown): void {
  const history = parseContextHistory(historyInput), queue = parseContextHistoryQueue(queueInput);
  const requests = denseArray(requestsInput, B.maxQueuedJobs).map(parseContextHistorySummaryRequest);
  if (queue.history !== hash(history) || requests.length !== queue.requests.length || requests.length > internalNodeCount(history.leaves.length) || new Set(requests.map(row => row.node)).size !== requests.length) invalid("summary queue changed its history, source jobs or internal-node capacity");
  let bytes = encodedBytes(queue), work = 0;
  for (const [index, request] of requests.entries()) {
    if (hash(request) !== queue.requests[index] || request.history !== queue.history || request.generation !== queue.generation) invalid("summary queue request belongs to a different history or generation");
    bytes += encodedBytes(request); work += request.limits.maxWork;
  }
  if (bytes > B.maxQueueBytes || work > B.maxMaintenanceWork) exhausted("summary queue exceeds its encoded bytes or total rebuild work");
  if (work !== queue.work) invalid("summary queue planned work differs from its requests");
}
export function contextHistoryRef(grantInput: unknown): ContextHistoryRef {
  const grant = parseContextHistoryGrant(grantInput);
  return { schema: "algal.context-history-ref.v1", history: grant.history, capability: capabilityHandle("context-history", asJsonValue(grant, "context history descriptor")) };
}
export function validateContextHistoryAccess(historyInput: unknown, refInput: unknown, grantInput: unknown, accessInput: unknown, nodeInput?: unknown): void {
  const history = parseContextHistory(historyInput), ref = parseContextHistoryRef(refInput), grant = parseContextHistoryGrant(grantInput), access = parseContextHistoryAccess(accessInput);
  const id = hash(history);
  if (access.state !== "active" || ref.history !== id || grant.history !== id || access.history !== id || ref.capability !== contextHistoryRef(grant).capability || !same(history.scope, grant.scope) || !same(history.scope, access.scope) || access.head !== history.head || access.snapshot !== history.snapshot) denied();
  const catalog = new Set(history.leaves.map(row => row.sourceIndex));
  if (grant.indices.some(index => !catalog.has(index))) denied();
  let selected = history.leaves;
  if (nodeInput !== undefined) {
    const node = parseContextHistoryNode(nodeInput);
    checkedNode(history, node);
    selected = history.leaves.slice(node.start, node.end);
  }
  const granted = new Set(grant.indices), current = new Set(access.indices);
  if (selected.some(row => !granted.has(row.sourceIndex) || !current.has(row.sourceIndex))) denied();
}
export function validateContextHistoryDelegation(parentInput: unknown, childInput: unknown): void {
  const parent = parseContextHistoryGrant(parentInput), child = parseContextHistoryGrant(childInput);
  if (parent.history !== child.history || !same(parent.scope, child.scope) || child.indices.some(index => !parent.indices.includes(index)) || (Object.keys(CONTEXT_HISTORY_READ_CEILINGS) as (keyof ContextHistoryReadLimits)[]).some(key => child.limits[key] > parent.limits[key])) denied();
}
