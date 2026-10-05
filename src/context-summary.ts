import { resolve } from "node:path";
import {
  CONTEXT_HISTORY_BOUNDS as B, CONTEXT_HISTORY_JOB_CEILINGS, CONTEXT_HISTORY_READ_CEILINGS,
  contextHistoryDigest, parseContextHistory, parseContextHistoryGeneration, parseContextHistoryNode,
  parseContextHistoryQueue, parseContextHistoryRef, parseContextHistorySummary, parseContextHistorySummaryRequest,
  parseContextHistorySummaryResult, validateContextHistoryGeneration, validateContextHistoryQueue,
  validateContextHistorySummary, validateContextHistorySummaryRequest, validateContextHistorySummaryResult,
  type ContextHistory, type ContextHistoryGeneration, type ContextHistoryJobLimits, type ContextHistoryNode,
  type ContextHistoryQueue, type ContextHistoryRef, type ContextHistorySummary, type ContextHistorySummaryFailure,
  type ContextHistorySummaryRequest, type ContextHistorySummaryResult,
} from "./context-history-contract";
import { ContextHistoryHost, type ContextHistoryDerivatives, type ContextHistoryInspection } from "./context-history";
import { BOUNDS, manifestToJson, parseOrganismManifest, type Edge, type OrganismManifest } from "./contract";
import { asDigest, digestCanonical, type Digest } from "./digest";
import { effectRequestDigest, executorSupports, type EffectRequest, type Executor, type ExecutorMetadata, type ExecutorResult } from "./effects";
import { AlgalError, ERROR_CODES, type ErrorCode } from "./errors";
import { HabitatAccount, parseHabitatBudget, type HabitatBudget } from "./habitat-budget";
import { boundedJsonSnapshot } from "./json-snapshot";
import { ProcessSupervisor, type ProcessSnapshot } from "./process";
import { builtinRegistry } from "./registry";
import { parseRunReceipt, WORK, type RunReceipt } from "./run";
import { FileStore } from "./store";
import { parseToolSignature, TOOL_SIGNATURE_BOUNDS, type ToolRegistry, type ToolSignature } from "./tools";
import { utf8Length } from "./utf8";
import { asInt, asJsonValue, asObject, asSafeId, canonicalBytes, canonicalize, noUnknownKeys, type JsonObject, type JsonValue } from "./values";
import { verifyReceipt } from "./verify";

export const CONTEXT_SUMMARY_BOUNDS = Object.freeze({
  maxPlanBytes: 8_388_608, maxPlanNodes: 262_144, maxPublicationBytes: 524_288,
  toolCost: TOOL_SIGNATURE_BOUNDS.maxCost, sourceProofPasses: 5,
});
export type ContextSummaryRecipe = {
  prompt: string; policy: Digest; summarizer: Digest; executor: string; configuration: Digest; maxEffectMs: number;
};
export type ContextSummaryPlan = {
  history: ContextHistory; parent: ContextHistoryDerivatives; recipe: ContextSummaryRecipe;
  limits: ContextHistoryJobLimits; ranges: { start: number; end: number }[]; invalidated: number[];
  nodes: ContextHistoryNode[]; requests: ContextHistorySummaryRequest[]; queue: ContextHistoryQueue;
  work: { planning: number; publication: number };
};
export type ContextSummaryJob = { name: string; request: Digest; manifest: Digest; checkpoint: Digest };
export type ContextSummaryExecution = {
  state: "settled" | "not-started"; job: ContextSummaryJob | null; result: ContextHistorySummaryResult;
  accountCheckpoint: Digest | null;
} | {
  state: "open"; job: ContextSummaryJob; result: null; reservation: "open"; accountCheckpoint: null;
};
type Input = { reference: ContextHistoryRef; plan: ContextSummaryPlan; request: ContextHistorySummaryRequest };
type Binding = {
  history: Digest; plan: Digest; request: Digest; expectedGeneration: Digest; recipe: Digest;
  checkpoint: Digest; reference: ContextHistoryRef;
};
type Diagnostic = { status: Exclude<ContextHistorySummaryFailure, "uncertain">; code: ErrorCode };
type Proof = { status: "ready"; history: Digest; generation: Digest; validationWork: number; snapshotBound: number };
type Selection = { status: "ready"; selection: Digest };
type Preparation = { status: "ready"; selection: Digest; inputBytes: number; effect: Digest };
type Final = { status: "complete"; summary: ContextHistorySummary; inputBytes: number; effect: Digest };
type Output = Diagnostic | Proof | Selection | Preparation | Final;
type JobInput = Input & { job: ContextSummaryJob };
const COST = CONTEXT_SUMMARY_BOUNDS.toolCost;
const toolNames = ["catalog", "selection", "prepare", "check", "recheck", "finish"] as const;
const toolName = (name: typeof toolNames[number]): string => `context-summary.${name}.v1`;
const inflight = new WeakMap<HabitatAccount, { identity: Digest; promise: Promise<ContextSummaryExecution> }>();
const reservations = new WeakMap<HabitatAccount, { dir: string; job: ContextSummaryJob }>();
const json = (value: unknown): JsonValue => asJsonValue(value, "context summary data");
const hash = (value: unknown): Digest => digestCanonical(json(value));
const bytes = (value: unknown): number => canonicalBytes(json(value));
const equal = (a: unknown, b: unknown): boolean => canonicalize(json(a)) === canonicalize(json(b));
function invalid(message: string): never { throw new AlgalError("PARSE_FAILED", `context summary: ${message}`); }
function mismatch(message: string): never { throw new AlgalError("RECEIPT_MISMATCH", `context summary: ${message}`); }
function exhausted(message: string): never { throw new AlgalError("BUDGET_EXHAUSTED", `context summary: ${message}`); }
function snapshot(value: unknown, maxBytes: number = CONTEXT_SUMMARY_BOUNDS.maxPlanBytes): JsonValue {
  return boundedJsonSnapshot(value, { maxBytes, maxDepth: 12, maxNodes: CONTEXT_SUMMARY_BOUNDS.maxPlanNodes,
    maxEntries: B.maxTreeNodes, maxStringBytes: B.maxSummaryBytes * 6 }, "context summary data");
}
function object(value: unknown, allowed: readonly string[], required: readonly string[] = allowed): JsonObject {
  const checked = asObject(value, "context summary object");
  noUnknownKeys(checked, allowed, "context summary object");
  if (required.some(key => !Object.hasOwn(checked, key))) invalid("missing field");
  return checked;
}
function hostOptions(value: unknown, fields: readonly string[]): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) invalid("host options must be an ordinary object");
  const result: Record<string, unknown> = {};
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== "string" || !fields.includes(key)) invalid("unknown host option");
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, "value")) invalid("host options require enumerable data properties");
    result[key] = descriptor.value as unknown;
  }
  if (fields.some(key => !Object.hasOwn(result, key))) invalid("missing host option");
  return result;
}
function list(value: unknown, maximum: number): JsonValue[] {
  if (!Array.isArray(value) || value.length > maximum) invalid("list exceeds its count bound");
  return value as JsonValue[];
}
function text(value: unknown, maximum: number): string {
  if (typeof value !== "string" || value.length > maximum || /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u.test(value) || utf8Length(value) > maximum) invalid("invalid or over-limit text");
  return value;
}
function parseRecipe(value: unknown): ContextSummaryRecipe {
  const v = object(snapshot(value, BOUNDS.maxPromptLen * 6 + 2_048), ["prompt", "policy", "summarizer", "executor", "configuration", "maxEffectMs"]);
  const prompt = text(v.prompt, BOUNDS.maxPromptLen);
  const executor = text(v.executor, BOUNDS.maxRefLen);
  if (!prompt.length || !executor.length) invalid("prompt and executor must be nonempty");
  return { prompt, policy: asDigest(v.policy, "summary policy"), summarizer: asDigest(v.summarizer, "summarizer"), executor,
    configuration: asDigest(v.configuration, "executor configuration"), maxEffectMs: asInt(v.maxEffectMs, "effect duration", 1, BOUNDS.maxEffectMs) };
}
export function contextSummaryPrompt(value: unknown): Digest {
  const recipe = parseRecipe(value);
  return hash({ contract: "algal.effect.v1", cellId: "summarize", kind: "agent", prompt: recipe.prompt,
    output: { kind: "text" }, executor: recipe.executor, configuration: recipe.configuration, maxEffectMs: recipe.maxEffectMs });
}
function node(history: ContextHistory, start: number, end: number, id = hash(history)): ContextHistoryNode {
  return parseContextHistoryNode({ schema: "algal.context-history-node.v1", history: id, start, end,
    sources: hash({ schema: "algal.context-history-sources.v1", history: id, leaves: history.leaves.slice(start, end) }) });
}
function parsePool(history: ContextHistory, value: unknown): ContextHistoryDerivatives {
  const v = object(value, ["generation", "nodes", "summaries"]);
  const generation = parseContextHistoryGeneration(v.generation);
  const nodes = list(v.nodes, B.maxTreeNodes).map(parseContextHistoryNode);
  const summaries = list(v.summaries, B.maxInternalNodes).map(parseContextHistorySummary);
  validateContextHistoryGeneration(history, generation, nodes, summaries);
  return { generation, nodes, summaries };
}
function selectedIndices(history: ContextHistory, value: unknown): number[] {
  const picked = list(value, B.maxLeaves).map(n => asInt(n, "invalidated source index", 0, B.maxLeaves - 1));
  const catalog = new Set(history.leaves.map(leaf => leaf.sourceIndex));
  if (picked.some((n, i) => !catalog.has(n) || (i > 0 && picked[i - 1]! >= n))) invalid("invalidated indices must be selected, unique and increasing");
  return picked;
}
function sameRecipe(summary: Pick<ContextHistorySummary, "prompt" | "policy" | "summarizer">, recipe: ContextSummaryRecipe): boolean {
  return summary.prompt === contextSummaryPrompt(recipe) && summary.policy === recipe.policy && summary.summarizer === recipe.summarizer;
}
function affected(history: ContextHistory, sourceNode: ContextHistoryNode, invalidated: readonly number[]): boolean {
  const selected = new Set(invalidated);
  return history.leaves.slice(sourceNode.start, sourceNode.end).some(leaf => selected.has(leaf.sourceIndex));
}
function retained(plan: Pick<ContextSummaryPlan, "history" | "parent" | "recipe" | "invalidated">): ContextHistorySummary[] {
  const nodes = new Map(plan.parent.nodes.map(sourceNode => [hash(sourceNode), sourceNode]));
  return plan.parent.summaries.filter(summary => sameRecipe(summary, plan.recipe) && !affected(plan.history, nodes.get(summary.node)!, plan.invalidated));
}
export function planContextSummaries(value: unknown): ContextSummaryPlan {
  const copied = snapshot(value);
  const v = object(copied, ["history", "parent", "recipe", "limits", "batchSize", "ranges", "invalidated"], ["history", "parent", "recipe"]);
  const history = parseContextHistory(v.history), id = contextHistoryDigest(history), parent = parsePool(history, v.parent), recipe = parseRecipe(v.recipe);
  if (parent.generation.generation === B.maxGeneration) exhausted("generation counter is exhausted");
  const invalidated = selectedIndices(history, v.invalidated ?? []);
  const limitValue = v.limits ?? json(CONTEXT_HISTORY_JOB_CEILINGS);
  const configuredBatch = v.batchSize === undefined ? undefined : asInt(v.batchSize, "maintenance batch", 1, B.maxBatchJobs);
  const proposed: { start: number; end: number }[] = [];
  if (v.ranges === undefined) {
    for (let length = 2; length <= history.leaves.length; length *= 2) {
      for (let start = 0; start + length <= history.leaves.length; start += length) proposed.push({ start, end: start + length });
    }
  } else for (const raw of list(v.ranges, B.maxInternalNodes)) {
    const range = object(raw, ["start", "end"]);
    proposed.push({ start: asInt(range.start, "summary start", 0, B.maxLeaves - 1), end: asInt(range.end, "summary end", 1, B.maxLeaves) });
  }
  proposed.sort((a, b) => (a.end - a.start) - (b.end - b.start) || a.start - b.start);
  const ranges = proposed.map(range => {
    const checked = node(history, range.start, range.end, id);
    if (checked.end - checked.start < 2) invalid("leaf summaries are not allowed");
    return { start: checked.start, end: checked.end };
  });
  if (ranges.some((r, i) => i > 0 && equal(r, ranges[i - 1]))) invalid("duplicate summary range");
  const existing = retained({ history, parent, recipe, invalidated });
  const byNode = new Map(existing.map(summary => [summary.node, summary]));
  const nodes: ContextHistoryNode[] = [], requests: ContextHistorySummaryRequest[] = [];
  const pendingCount = ranges.filter(range => !byNode.has(hash(node(history, range.start, range.end, id)))).length;
  if (bytes(history) * (pendingCount + 1) + bytes(parent) > B.maxMaintenanceWork) exhausted("pure planning work exceeds its ceiling");
  let limits: ContextHistoryJobLimits | undefined;
  for (const range of ranges) {
    const sourceNode = node(history, range.start, range.end, id), sourceId = hash(sourceNode);
    if (byNode.has(sourceId)) continue;
    const middle = (sourceNode.start + sourceNode.end) / 2;
    const left = sourceNode.end - sourceNode.start > 2 ? byNode.get(hash(node(history, sourceNode.start, middle, id))) : undefined;
    const right = sourceNode.end - sourceNode.start > 2 ? byNode.get(hash(node(history, middle, sourceNode.end, id))) : undefined;
    const children = left && right ? [left, right] : [];
    const request = parseContextHistorySummaryRequest({ schema: "algal.context-history-summary-request.v1", history: id,
      node: sourceId, sources: sourceNode.sources, children: children.map(hash), prompt: contextSummaryPrompt(recipe), policy: recipe.policy,
      summarizer: recipe.summarizer, generation: parent.generation.generation + 1, limits: limitValue });
    validateContextHistorySummaryRequest(history, sourceNode, request, children);
    limits = request.limits; nodes.push(sourceNode); requests.push(request);
  }
  if (limits === undefined) {
    const checked = object(snapshot(limitValue, 512), Object.keys(CONTEXT_HISTORY_JOB_CEILINGS));
    limits = Object.fromEntries(Object.entries(CONTEXT_HISTORY_JOB_CEILINGS).map(([key, maximum]) => [key, asInt(checked[key], "summary job limit", 1, maximum)])) as ContextHistoryJobLimits;
  }
  const batchSize = configuredBatch ?? Math.max(1, Math.min(B.maxBatchJobs, requests.length));
  const queue = parseContextHistoryQueue({ schema: "algal.context-history-queue.v1", history: id, generation: parent.generation.generation + 1,
    requests: requests.map(hash), batchSize, work: requests.reduce((n, request) => n + request.limits.maxWork, 0) });
  validateContextHistoryQueue(history, queue, requests);
  const planning = bytes({ history, parent, recipe, limits, batchSize, ranges, invalidated }) + bytes(history) * (requests.length + 1)
    + bytes(parent) + bytes(queue) + requests.reduce((n, request) => n + bytes(request), 0);
  const publication = 2 * (bytes(parent) + Math.min(batchSize, requests.length) * B.maxSummaryRecordBytes + B.maxGenerationBytes);
  if (planning > B.maxMaintenanceWork || publication > B.maxMaintenanceWork) exhausted("pure planning/publication work exceeds its ceiling");
  return { history, parent, recipe, limits, ranges, invalidated, nodes, requests, queue, work: { planning, publication } };
}
function checkedPlan(value: unknown): ContextSummaryPlan {
  const v = object(value, ["history", "parent", "recipe", "limits", "ranges", "invalidated", "nodes", "requests", "queue", "work"]);
  const queue = parseContextHistoryQueue(v.queue);
  const plan = planContextSummaries({ history: v.history, parent: v.parent, recipe: v.recipe, limits: v.limits,
    batchSize: queue.batchSize, ranges: v.ranges, invalidated: v.invalidated });
  if (!equal(plan, v)) invalid("plan differs from its deterministic records");
  return plan;
}
function parseInput(value: unknown, extra: readonly string[] = []): Input & JsonObject {
  const v = object(snapshot(value, CONTEXT_SUMMARY_BOUNDS.maxPlanBytes * 2), ["reference", "plan", "request", ...extra]);
  const reference = parseContextHistoryRef(v.reference), plan = checkedPlan(v.plan), request = parseContextHistorySummaryRequest(v.request);
  if (reference.history !== hash(plan.history) || !plan.requests.some(candidate => equal(candidate, request))) invalid("request/ref is not a member of this plan");
  return { ...v, reference, plan, request } as Input & JsonObject;
}
function parseJob(value: unknown): ContextSummaryJob {
  const v = object(snapshot(value, 512), ["name", "request", "manifest", "checkpoint"]);
  return { name: asSafeId(v.name, "summary process"), request: asDigest(v.request, "summary request"),
    manifest: asDigest(v.manifest, "summary manifest"), checkpoint: asDigest(v.checkpoint, "account checkpoint") };
}
function parseJobInput(value: unknown): JobInput {
  const input = parseInput(value, ["job"]);
  return { reference: input.reference, plan: input.plan, request: input.request, job: parseJob(input.job) };
}
function binding(input: Input, checkpoint: Digest): Binding {
  return { history: hash(input.plan.history), plan: hash(input.plan), request: hash(input.request), expectedGeneration: hash(input.plan.parent.generation),
    recipe: hash(input.plan.recipe), checkpoint, reference: input.reference };
}
function processArgs(input: Input, checkpoint: Digest): ProcessSnapshot["process"]["args"] {
  return { job: { binding: json(binding(input, checkpoint)), checkpoint } };
}
function summaryRecord(input: Input, body: string): ContextHistorySummary {
  const { history, node: sourceNode, sources, children, prompt, policy, summarizer } = input.request;
  return parseContextHistorySummary({ schema: "algal.context-history-summary.v1", history, node: sourceNode, sources, children, prompt, policy, summarizer, body });
}
function outputAllowance(input: Input): number {
  const emptyBytes = bytes(summaryRecord(input, ""));
  const allowance = input.request.limits.maxOutputBytes - emptyBytes + 2;
  if (allowance < 2) exhausted("summary record frame cannot fit the output allowance");
  return allowance;
}
function edge(from: string, port: string, to: string, input: string): Edge {
  return { from: { cell: from, port }, to: { cell: to, port: input } };
}
function signatures(input: Input): Record<typeof toolNames[number], ToolSignature> {
  const port = { type: "json" as const };
  const output = { out: port };
  return {
    catalog: parseToolSignature({ inputs: { binding: port }, outputs: output, effect: "read", cost: COST, maxOutputBytes: 2_048 }),
    selection: parseToolSignature({ inputs: { binding: port, proof: port }, outputs: output, effect: "read", cost: COST, maxOutputBytes: 1_024 }),
    prepare: parseToolSignature({ inputs: { binding: port, proof: port, selection: port }, outputs: { ...output, data: { ...port, optional: true } },
      effect: "read", cost: COST, maxOutputBytes: input.request.limits.maxInputBytes + 4_096 }),
    check: parseToolSignature({ inputs: { binding: port, prepared: port, body: { type: "text" } }, outputs: output, effect: "read", cost: COST, maxOutputBytes: 2_048 }),
    recheck: parseToolSignature({ inputs: { binding: port, proof: port, prepared: port }, outputs: output, effect: "read", cost: COST, maxOutputBytes: 1_024 }),
    finish: parseToolSignature({ inputs: { binding: port, proof: port, selection: port, prepared: port, body: { type: "text" } }, outputs: output,
      effect: "read", cost: COST, maxOutputBytes: input.request.limits.maxOutputBytes + 2_048 }),
  };
}
export function contextSummaryManifest(value: unknown): OrganismManifest {
  const input = parseInput(value), out = outputAllowance(input);
  return manifest(input, out);
}
function manifest(input: Input, out = outputAllowance(input)): OrganismManifest {
  const tool = (id: typeof toolNames[number]) => ({ id, kind: "tool", tool: toolName(id), budget: { maxEffectMs: input.plan.recipe.maxEffectMs } });
  return parseOrganismManifest({ contract: "algal.organism.v1", key: "organism:context-summary", name: "Context history summary",
    budgets: { maxSteps: 8, maxAgentCalls: 1, maxWork: input.request.limits.maxWork, maxContextBytes: input.request.limits.maxInputBytes,
      maxOutputBytes: out, maxDepth: 0 },
    cells: [
      { id: "job", kind: "input", outputs: { binding: { type: "json" }, checkpoint: { type: "json" } } },
      tool("catalog"), tool("selection"), tool("prepare"),
      { id: "summarize", kind: "agent", inputs: { data: { type: "json" } }, prompt: input.plan.recipe.prompt, output: { kind: "text" },
        budget: { maxContextBytes: input.request.limits.maxInputBytes, maxOutputBytes: out, maxTurns: 1, maxEffectMs: input.plan.recipe.maxEffectMs } },
      tool("check"), tool("recheck"), tool("finish"),
    ],
    edges: [
      ...toolNames.map(name => edge("job", "binding", name, "binding")),
      edge("catalog", "out", "selection", "proof"), edge("catalog", "out", "prepare", "proof"),
      edge("selection", "out", "prepare", "selection"), edge("prepare", "data", "summarize", "data"),
      edge("prepare", "out", "check", "prepared"), edge("summarize", "out", "check", "body"),
      edge("check", "out", "recheck", "proof"), edge("prepare", "out", "recheck", "prepared"),
      edge("check", "out", "finish", "proof"), edge("recheck", "out", "finish", "selection"),
      edge("prepare", "out", "finish", "prepared"), edge("summarize", "out", "finish", "body"),
    ],
    interface: { inputs: {}, outputs: { result: { cell: "finish", port: "out" } } },
  });
}
function executionCeiling(input: Input): number {
  const declared = signatures(input);
  return 8 * WORK.activation + WORK.effectBase + input.request.limits.maxInputBytes * WORK.perContextByte + outputAllowance(input) * WORK.perOutputByte
    + toolNames.reduce((n, name) => n + declared[name].cost + declared[name].maxOutputBytes, 0);
}
function sourceBytes(history: ContextHistory): number { return history.leaves.reduce((n, leaf) => n + leaf.bytes, 0); }
function entryCeiling(history: ContextHistory, start = 0, end = history.leaves.length): number {
  return history.leaves.slice(start, end).reduce((n, leaf) => n + 6 * leaf.bytes + 1_024, 0);
}
function catalogCeiling(history: ContextHistory): number {
  return 2 * 262_144 + 4 * entryCeiling(history) + 32 * bytes(history) + 8_192;
}
function poolBytes(input: Input): number { return bytes(input.plan.parent); }
function publicationBytes(input: Input): number {
  return poolBytes(input) + Math.min(input.plan.queue.batchSize, input.plan.requests.length) * (B.maxSummaryRecordBytes + B.maxNodeBytes + 160)
    + bytes(input.plan.parent.generation) + 2_048;
}
function requireExecutionBounds(input: Input): void {
  if (executionCeiling(input) > input.request.limits.maxWork) exhausted("declared work cannot cover all recorded cells and framing");
  const sourceNode = input.plan.nodes.find(candidate => hash(candidate) === input.request.node)!;
  const target = input.plan.history.leaves.slice(sourceNode.start, sourceNode.end).reduce((n, leaf) => n + leaf.bytes, 0);
  if (CONTEXT_SUMMARY_BOUNDS.sourceProofPasses * sourceBytes(input.plan.history) + target > input.request.limits.maxSourceBytes) exhausted("complete current-source proofs exceed the source allowance");
  if (catalogCeiling(input.plan.history) > COST || publicationBytes(input) > CONTEXT_SUMMARY_BOUNDS.maxPublicationBytes) exhausted("source validation or publication exceeds the recorded cell ceiling");
  if (2 * publicationBytes(input) + 3 * input.request.limits.maxInputBytes + 4 * input.request.limits.maxOutputBytes > COST) exhausted("completion framing exceeds the recorded cell ceiling");
}
function diag(error: unknown, signal?: AbortSignal): Diagnostic {
  if (signal?.aborted) return { status: "cancelled", code: "EFFECT_FAILED" };
  return { status: error instanceof AlgalError && error.code === "BUDGET_EXHAUSTED" ? "budget-exhausted" : "failed",
    code: error instanceof AlgalError ? error.code : "TOOL_FAILED" };
}
function cancel(signal?: AbortSignal): void { if (signal?.aborted) throw new AlgalError("EFFECT_FAILED", "context summary cancelled before dispatch"); }
function parseOutput(value: unknown): Output {
  const v = asObject(snapshot(value, B.maxSummaryRecordBytes + 2_048), "summary tool output");
  if (v.status === "ready" && Object.hasOwn(v, "snapshotBound")) {
    object(v, ["status", "history", "generation", "validationWork", "snapshotBound"]);
    return { status: "ready", history: asDigest(v.history, "source history"), generation: asDigest(v.generation, "source generation"),
      validationWork: asInt(v.validationWork, "source proof work", 0, COST), snapshotBound: asInt(v.snapshotBound, "snapshot proof bound", 0, 262_144) };
  }
  if (v.status === "ready" && Object.hasOwn(v, "inputBytes")) {
    object(v, ["status", "selection", "inputBytes", "effect"]);
    return { status: "ready", selection: asDigest(v.selection, "source selection"), inputBytes: asInt(v.inputBytes, "full input bytes", 1, CONTEXT_HISTORY_JOB_CEILINGS.maxInputBytes), effect: asDigest(v.effect, "model request") };
  }
  if (v.status === "ready") {
    object(v, ["status", "selection"]);
    return { status: "ready", selection: asDigest(v.selection, "source selection") };
  }
  if (v.status === "complete") {
    object(v, ["status", "summary", "inputBytes", "effect"]);
    return { status: "complete", summary: parseContextHistorySummary(v.summary), inputBytes: asInt(v.inputBytes, "full input bytes", 1, CONTEXT_HISTORY_JOB_CEILINGS.maxInputBytes), effect: asDigest(v.effect, "model request") };
  }
  object(v, ["status", "code"]);
  if (!["failed", "cancelled", "budget-exhausted"].includes(v.status as string) || !(ERROR_CODES as readonly unknown[]).includes(v.code)) invalid("unknown tool diagnostic");
  return { status: v.status as Diagnostic["status"], code: v.code as ErrorCode };
}
function proof(value: unknown): Proof | Diagnostic {
  const output = parseOutput(value);
  if (output.status !== "ready") { if (output.status === "complete") invalid("expected a source proof"); return output; }
  if (!("snapshotBound" in output)) invalid("expected a source proof");
  return output;
}
function preparation(value: unknown): Preparation | Diagnostic {
  const output = parseOutput(value);
  if (output.status !== "ready") { if (output.status === "complete") invalid("expected preparation evidence"); return output; }
  if (!("inputBytes" in output)) invalid("expected preparation evidence");
  return output;
}
function selection(value: unknown): Selection | Diagnostic {
  const output = parseOutput(value);
  if (output.status !== "ready") { if (output.status === "complete") invalid("expected selection evidence"); return output; }
  if ("snapshotBound" in output || "inputBytes" in output) invalid("expected selection evidence");
  return output;
}
function viewCeiling(input: Input, sourceProof: Proof): number {
  const history = input.plan.history, count = history.leaves.length;
  const frame = 4_096 + 6 * sourceBytes(history) + 2 * bytes(history) + poolBytes(input);
  return sourceProof.snapshotBound * (2 * count + 1) + 4 * entryCeiling(history) + 32 * bytes(history)
    + 2 * (count + 1) * frame + 4 * poolBytes(input) + 8_192;
}
function modelRequest(input: Input, data: JsonValue): EffectRequest {
  return { contract: "algal.effect.v1", cellId: "summarize", kind: "agent", prompt: input.plan.recipe.prompt,
    context: { inputs: { data }, turn: 0 }, output: { kind: "text" },
    budget: { maxContextBytes: input.request.limits.maxInputBytes, maxOutputBytes: outputAllowance(input) } };
}
function failureResult(request: ContextHistorySummaryRequest, status: ContextHistorySummaryFailure, receipt: Digest | null = null,
  usage = { inputBytes: 0, outputBytes: 0, work: 0, modelCalls: 0 }): ContextHistorySummaryResult {
  return parseContextHistorySummaryResult({ schema: "algal.context-history-summary-result.v1", request: hash(request), status,
    summary: null, receipt, usage, reason: status });
}
function parseMetadata(value: unknown): ExecutorMetadata {
  const v = object(snapshot(value, 4_096), ["executor", "usage", "cached", "retryable", "configurationDigest"], []);
  const result: ExecutorMetadata = {};
  if (v.executor !== undefined) result.executor = text(v.executor, 256);
  if (v.configurationDigest !== undefined) result.configurationDigest = asDigest(v.configurationDigest, "executor configuration");
  if (v.cached !== undefined) { if (v.cached !== true) invalid("cached must be true when present"); result.cached = true; }
  if (v.retryable !== undefined) { if (v.retryable !== false) invalid("retryable must be false when present"); result.retryable = false; }
  if (v.usage !== undefined) {
    const usage = object(v.usage, ["model", "tokensIn", "tokensOut"], []);
    result.usage = {};
    if (usage.model !== undefined) result.usage.model = text(usage.model, 128);
    if (usage.tokensIn !== undefined) result.usage.tokensIn = asInt(usage.tokensIn, "input tokens", 0, Number.MAX_SAFE_INTEGER);
    if (usage.tokensOut !== undefined) result.usage.tokensOut = asInt(usage.tokensOut, "output tokens", 0, Number.MAX_SAFE_INTEGER);
  }
  return result;
}
function accountSnapshot(account: HabitatAccount): HabitatBudget {
  if (!(account instanceof HabitatAccount)) invalid("a concrete existing HabitatAccount is required");
  return parseHabitatBudget(snapshot(account.record()));
}
function accountRecordFits(account: HabitatBudget, input: Input): boolean {
  return account.charged.work + input.request.limits.maxWork <= account.limits.work
    && account.charged.attempts + 1 <= account.limits.attempts && account.charged.runs + 1 <= account.limits.runs;
}
function jobName(request: Digest): string { return `summary-${request.slice(7, 63)}`; }
function jobFor(input: Input, checkpoint: Digest): ContextSummaryJob {
  return { name: jobName(hash(input.request)), request: hash(input.request), manifest: hash(manifestToJson(manifest(input))), checkpoint };
}
function checkSnapshot(input: JobInput, saved: ProcessSnapshot): void {
  const expected = jobFor(input, input.job.checkpoint);
  if (!equal(input.job, expected) || saved.process.name !== expected.name || saved.process.manifestDigest !== expected.manifest
    || saved.process.maxGenerations !== 1 || !equal(saved.process.args, processArgs(input, expected.checkpoint))) mismatch("process name, request, prompt, checkpoint or arguments conflict");
}
async function storedValue(store: FileStore, id: Digest): Promise<JsonValue> {
  const value = await store.getValue(id);
  if (value === undefined) throw new AlgalError("STORE_MISS", "context summary checkpoint or derivative is missing");
  const copied = snapshot(value);
  if (hash(copied) !== id) mismatch("stored value identity changed");
  return copied;
}

export class ContextSummaryDriver {
  readonly dir: string;
  readonly store: FileStore;
  readonly #history: ContextHistoryHost;
  readonly #account: HabitatAccount;
  readonly #executor: Executor;
  constructor(options: { dir: string; historyHost: ContextHistoryHost; account: HabitatAccount; executor: Executor }) {
    const checked = hostOptions(options, ["dir", "historyHost", "account", "executor"]);
    if (!(checked.historyHost instanceof ContextHistoryHost) || !(checked.account instanceof HabitatAccount)) invalid("a trusted history host and existing concrete account are required");
    const executor = checked.executor as Executor | undefined;
    if (!executor || typeof executor.execute !== "function" || typeof executor.id !== "string") invalid("a host-supplied executor is required");
    this.dir = resolve(text(checked.dir, 4_096)); this.store = new FileStore(this.dir);
    this.#history = checked.historyHost; this.#account = checked.account; this.#executor = executor;
  }
  #provider(input: Input, signal?: AbortSignal, replayOnly = false): Executor {
    const inner = this.#executor, recipe = input.plan.recipe;
    if (inner.id !== recipe.executor) invalid("the recipe selects another host executor");
    if (!executorSupports(inner, "agent")) throw new AlgalError("CAPABILITY_DENIED", "context summary executor does not admit agent effects");
    const metadata: ExecutorMetadata = { configurationDigest: recipe.configuration };
    const invoke = async (request: EffectRequest, runtimeSignal?: AbortSignal): Promise<ExecutorResult> => {
      if (replayOnly) throw new AlgalError("IO_FAILED", "summary reconciliation cannot dispatch a new model request", undefined, { uncertain: true });
      if (request.prompt !== recipe.prompt || request.kind !== "agent" || request.cellId !== "summarize" || bytes(request) > input.request.limits.maxInputBytes) exhausted("model request differs or exceeds the complete encoded ceiling");
      cancel(signal); cancel(runtimeSignal);
      const controller = new AbortController();
      const signals = [signal, runtimeSignal].filter((value): value is AbortSignal => value !== undefined);
      let reject!: (error: Error) => void;
      const cancelled = new Promise<never>((_, fail) => { reject = fail; });
      const abort = (): void => {
        reject(new AlgalError("IO_FAILED", "summary model completion is uncertain after cancellation", undefined, { uncertain: true }));
        controller.abort();
      };
      for (const attached of signals) attached.addEventListener("abort", abort, { once: true });
      try {
        const call = async (): Promise<ExecutorResult> => {
          const result = inner.executeEffect
            ? object(snapshot(await inner.executeEffect(request, controller.signal), input.request.limits.maxOutputBytes + 4_096), ["output", "metadata"], ["output"])
            : { output: await inner.execute(request, controller.signal) };
          if (signals.some(attached => attached.aborted)) throw new AlgalError("IO_FAILED", "summary model completion is uncertain after cancellation", undefined, { uncertain: true });
          const output = boundedJsonSnapshot(result.output, { maxBytes: input.request.limits.maxOutputBytes, maxDepth: 8,
            maxNodes: B.maxJsonNodes, maxEntries: B.maxTreeNodes, maxStringBytes: input.request.limits.maxOutputBytes }, "summary executor output");
          const recorded = parseMetadata("metadata" in result ? result.metadata : await inner.receiptFor?.(request) ?? {});
          if (recorded.configurationDigest !== undefined && recorded.configurationDigest !== recipe.configuration) {
            throw new AlgalError("IO_FAILED", "summary executor configuration changed after dispatch", undefined, { uncertain: true });
          }
          return { output, metadata: { ...recorded, configurationDigest: recipe.configuration } };
        };
        return await Promise.race([call(), cancelled]);
      } finally {
        for (const attached of signals) attached.removeEventListener("abort", abort);
      }
    };
    return { id: inner.id, capabilities: { effects: ["agent"] }, cacheable: false, retryable: false,
      journalConfigurationFor: async request => {
        if (replayOnly) return recipe.configuration;
        cancel(signal);
        const admitted = asDigest(snapshot(inner.journalConfigurationFor ? await inner.journalConfigurationFor(request) : inner.cacheIdentity, 128), "current executor configuration");
        if (admitted !== recipe.configuration) mismatch("host executor configuration no longer matches the exact prompt/profile");
        cancel(signal);
        return admitted;
      }, receiptFor: () => metadata,
      execute: async (request, runtimeSignal) => (await invoke(request, runtimeSignal)).output, executeEffect: invoke };
  }
  #tools(input: Input, checkpoint: Digest, signal?: AbortSignal, offline = false): ToolRegistry {
    const expected = binding(input, checkpoint), declared = signatures(input), history = input.plan.history;
    const sourceNode = input.plan.nodes.find(candidate => hash(candidate) === input.request.node)!;
    const limits = { ...CONTEXT_HISTORY_READ_CEILINGS, maxReadBytes: input.request.limits.maxSourceBytes,
      maxScanBytes: input.request.limits.maxSourceBytes, maxWork: COST };
    const reader = () => this.#history.bind(input.reference);
    const inspect = async (): Promise<Proof> => {
      cancel(signal);
      if (catalogCeiling(history) > COST) exhausted("catalog proof exceeds its recorded tool cost");
      const inspected: ContextHistoryInspection = await reader().inspect(signal);
      cancel(signal);
      if (!equal(inspected.history, history) || inspected.generation !== expected.expectedGeneration) mismatch("captured source or expected generation changed");
      const validationWork = inspected.usage.work - inspected.usage.outputBytes;
      if (validationWork > COST) exhausted("catalog proof exceeds its recorded tool cost");
      return { status: "ready", history: hash(history), generation: inspected.generation, validationWork,
        snapshotBound: Math.min(262_144, Math.ceil(validationWork / 2)) };
    };
    const current = async (sourceProof: Proof): Promise<Selection> => {
      cancel(signal);
      if (viewCeiling(input, sourceProof) > COST) exhausted("current-selection proof exceeds its recorded tool cost");
      const view = await reader().overview({ limits }, signal);
      cancel(signal);
      if (view.binding.history !== expected.history || view.binding.generation !== expected.expectedGeneration) mismatch("source selection or expected generation changed");
      if (view.status === "unavailable") throw new AlgalError("STORE_MISS", "summary originals are unavailable");
      if (view.status === "budget-exhausted" || view.end !== history.leaves.length) exhausted("complete selection proof did not fit its read allowance");
      return { status: "ready", selection: hash({ selection: view.binding.selection, generation: view.binding.generation }) };
    };
    const registry: ToolRegistry = new Map();
    for (const name of toolNames) registry.set(toolName(name), {
      signature: declared[name], configurationDigest: hash({ recipe: hash(input.plan.recipe), request: expected.request, tool: name, signature: declared[name] }),
      tool: async raw => {
        if (offline) throw new AlgalError("IO_FAILED", "summary replay cannot call a live read tool", undefined, { uncertain: true });
        try {
          const args = object(snapshot(raw, B.maxSummaryRecordBytes + 4_096), Object.keys(declared[name].inputs));
          if (!equal(args.binding, expected)) mismatch("recorded read-tool binding changed");
          cancel(signal);
          if (name === "catalog") return { out: json(await inspect()) };
          if (name === "check") {
            const prepared = preparation(args.prepared);
            if (prepared.status !== "ready") return { out: json(prepared) };
            return { out: json(await inspect()) };
          }
          const sourceProof = proof(args.proof);
          if (sourceProof.status !== "ready") return { out: json(sourceProof) };
          if (sourceProof.history !== expected.history || sourceProof.generation !== expected.expectedGeneration) mismatch("source proof belongs to another job");
          if (name === "selection" || name === "recheck") {
            const selected = await current(sourceProof);
            if (name === "recheck") {
              const prepared = preparation(args.prepared);
              if (prepared.status !== "ready") return { out: json(prepared) };
              if (selected.selection !== prepared.selection) mismatch("source corrections or selection changed during the model call");
            }
            return { out: json(selected) };
          }
          const selected = selection(args.selection);
          if (selected.status !== "ready") return { out: json(selected) };
          if (name === "prepare") {
            const count = sourceNode.end - sourceNode.start;
            const reading = input.request.children.length ? 5 * sourceProof.snapshotBound + 4 * entryCeiling(history, sourceNode.start, sourceNode.end)
              : 2 * count * sourceProof.snapshotBound + 4 * entryCeiling(history, sourceNode.start, sourceNode.end);
            const boundChildren = input.request.children.map(id => input.plan.parent.summaries.find(summary => hash(summary) === id)!);
            const emptyData = json({ request: input.request, node: sourceNode, leaves: history.leaves.slice(sourceNode.start, sourceNode.end), originals: [], children: boundChildren });
            const encodedInputCeiling = bytes(modelRequest(input, emptyData)) + (boundChildren.length ? 0 : entryCeiling(history, sourceNode.start, sourceNode.end) + count);
            const framing = 32 * count * bytes(history) + 3 * encodedInputCeiling + 2 * input.request.limits.maxOutputBytes + 8_192;
            if (reading + framing + viewCeiling(input, sourceProof) > COST) exhausted("original/child retrieval and full prompt framing exceed the recorded cell cost");
            const originals: JsonValue[] = [], children: ContextHistorySummary[] = [];
            if (input.request.children.length) {
              const expansion = await reader().expand(input.request.node, limits, signal);
              if (expansion.status !== "complete" || expansion.items.length !== 2) mismatch("complete child summaries are no longer available");
              for (let index = 0; index < expansion.items.length; index++) {
                const item = expansion.items[index]!, child = input.plan.parent.summaries.find(summary => hash(summary) === input.request.children[index]);
                if (!child || item.kind !== "summary" || item.summary !== hash(child) || item.text !== child.body) mismatch("child summary body or original lineage changed");
                children.push(child);
              }
            } else for (let index = sourceNode.start; index < sourceNode.end; index++) {
              const leaf = history.leaves[index]!, original = await reader().read(leaf.sourceIndex, limits, signal);
              cancel(signal);
              const record = { schema: "algal.agent-context-entry.v1", kind: original.kind, label: original.label, text: original.text };
              if (original.entry !== leaf.entry || original.position !== leaf.position || hash(record) !== leaf.entry) mismatch("ordered original source changed");
              originals.push(record);
            }
            const checked = await current(sourceProof);
            if (checked.selection !== selected.selection) mismatch("source selection changed while preparing model input");
            const data = json({ request: input.request, node: sourceNode, leaves: history.leaves.slice(sourceNode.start, sourceNode.end), originals, children });
            const request = modelRequest(input, data), inputBytes = bytes(request);
            if (inputBytes > input.request.limits.maxInputBytes) exhausted("complete escaped prompt/context/metadata exceeds maxInputBytes");
            const prepared: Preparation = { status: "ready", selection: checked.selection, inputBytes, effect: effectRequestDigest(request) };
            return { out: json(prepared), data };
          }
          const prepared = preparation(args.prepared);
          if (prepared.status !== "ready") return { out: json(prepared) };
          if (selected.selection !== prepared.selection) mismatch("source selection changed before completion");
          const summary = summaryRecord(input, text(args.body, B.maxSummaryBytes));
          if (bytes(summary) > input.request.limits.maxOutputBytes) exhausted("complete summary record exceeds maxOutputBytes");
          const children = input.request.children.map(id => input.plan.parent.summaries.find(child => hash(child) === id)!);
          validateContextHistorySummary(history, sourceNode, summary, children);
          const result: Final = { status: "complete", summary, inputBytes: prepared.inputBytes, effect: prepared.effect };
          return { out: json(result) };
        } catch (error) {
          if (error instanceof AlgalError && error.uncertain) throw error;
          return { out: json(diag(error, signal)) };
        }
      },
    });
    return registry;
  }
  #supervisor(input: Input, checkpoint: Digest, signal?: AbortSignal, offline = false): ProcessSupervisor {
    return new ProcessSupervisor(this.dir, { fns: builtinRegistry(), journal: true,
      tools: this.#tools(input, checkpoint, signal, offline), executors: [this.#provider(input, signal, offline)] });
  }
  evidenceTools(value: unknown): ToolRegistry {
    const input = parseInput(value);
    return this.#supervisor(input, hash(null), undefined, true).evidenceTools();
  }
  async run(value: unknown, signal?: AbortSignal): Promise<ContextSummaryExecution> {
    const input = parseInput(value);
    if (signal !== undefined && !(signal instanceof AbortSignal)) invalid("signal must be a host AbortSignal");
    const identity = hash({ dir: this.dir, input }), active = inflight.get(this.#account);
    if (active) {
      if (active.identity !== identity) throw new AlgalError("IO_FAILED", "context summary account already has an active job");
      return active.promise;
    }
    const promise = this.#run(input, signal);
    inflight.set(this.#account, { identity, promise });
    void promise.finally(() => { if (inflight.get(this.#account)?.promise === promise) inflight.delete(this.#account); }).catch(() => undefined);
    return promise;
  }
  async #run(input: Input, signal?: AbortSignal): Promise<ContextSummaryExecution> {
    if (signal?.aborted) return { state: "not-started", job: null, result: failureResult(input.request, "cancelled"), accountCheckpoint: null };
    try { requireExecutionBounds(input); } catch (error) {
      if (error instanceof AlgalError && error.code === "BUDGET_EXHAUSTED") return { state: "not-started", job: null,
        result: failureResult(input.request, "budget-exhausted"), accountCheckpoint: null };
      throw error;
    }
    let saved: ProcessSnapshot | undefined;
    const lookup = new ProcessSupervisor(this.dir);
    try { saved = await lookup.inspect(jobName(hash(input.request))); } catch (error) {
      if (!(error instanceof AlgalError && error.code === "STORE_MISS")) throw error;
    }
    if (saved) {
      const args = object(saved.process.args.job, ["binding", "checkpoint"]);
      const checkpoint = asDigest(args.checkpoint, "saved budget checkpoint"), job = jobFor(input, checkpoint);
      checkSnapshot({ ...input, job }, saved);
      if (["uncertain", "ready", "suspended"].includes(saved.process.status)) {
        const reserved = reservations.get(this.#account);
        if (!reserved || reserved.dir !== this.dir || !equal(reserved.job, job)) mismatch("open process requires an explicit exact-account restore handoff");
        return { state: "open", job, result: null, reservation: "open", accountCheckpoint: null };
      }
      return this.#settle({ ...input, job }, saved);
    }
    const account = accountSnapshot(this.#account);
    if (account.outcome !== "complete") throw new AlgalError("BUDGET_EXHAUSTED", "context summary account is exhausted");
    const manifestValue = manifest(input), manifestDigest = hash(manifestToJson(manifestValue));
    if (!accountRecordFits(account, input)) {
      try { this.#account.reserve(manifestDigest, manifestValue.budgets); } catch (error) {
        if (!(error instanceof AlgalError && error.code === "BUDGET_EXHAUSTED")) throw error;
        const refused = accountSnapshot(this.#account), checkpoint = hash(refused);
        await this.#put(refused, checkpoint);
        return { state: "not-started", job: null, result: failureResult(input.request, "budget-exhausted"), accountCheckpoint: checkpoint };
      }
      mismatch("refused account unexpectedly admitted work");
    }
    const checkpoint = hash(account), job = jobFor(input, checkpoint), supervisor = this.#supervisor(input, checkpoint, signal);
    await this.#put(account, checkpoint);
    const metadata = [input.plan.history, ...input.plan.parent.nodes, ...input.plan.parent.summaries, input.plan.parent.generation,
      ...input.plan.nodes, input.request, input.plan.recipe];
    for (const record of metadata) await this.#put(record, hash(record));
    if (signal?.aborted) return { state: "not-started", job: null, result: failureResult(input.request, "cancelled"), accountCheckpoint: checkpoint };
    if (hash(accountSnapshot(this.#account)) !== checkpoint) mismatch("existing work account changed before durable admission");
    try { await supervisor.create(job.name, manifestValue, processArgs(input, checkpoint), 1); } catch (error) {
      let existing: ProcessSnapshot;
      try { existing = await supervisor.inspect(job.name); } catch { throw error; }
      checkSnapshot({ ...input, job }, existing);
      if (!["ready", "uncertain", "suspended"].includes(existing.process.status)) return this.#settle({ ...input, job }, existing);
      mismatch("existing process requires an explicit exact-account restore handoff");
    }
    if (hash(accountSnapshot(this.#account)) !== checkpoint) mismatch("existing account changed after process creation; restore handoff is required");
    this.#account.reserve(manifestDigest, manifestValue.budgets);
    reservations.set(this.#account, { dir: this.dir, job });
    try {
      const finished = await supervisor.tick(job.name);
      if (!finished) mismatch("summary dispatch produced no process evidence");
      return await this.#settle({ ...input, job }, finished);
    } catch (error) {
      const current = await supervisor.inspect(job.name);
      checkSnapshot({ ...input, job }, current);
      if (!["uncertain", "ready", "suspended"].includes(current.process.status)) throw error;
      return { state: "open", job, result: null, reservation: "open", accountCheckpoint: null };
    }
  }
  async #put(value: unknown, expected: Digest): Promise<void> {
    const returned = await this.store.putValue(json(value));
    if (returned !== expected) mismatch("CAS write returned another identity");
    const stored = await storedValue(this.store, expected);
    if (!equal(stored, value)) mismatch("CAS write conflicts with saved body");
  }
  async #verified(input: JobInput, saved?: ProcessSnapshot): Promise<{ snapshot: ProcessSnapshot; receipt: RunReceipt; raw: JsonValue }> {
    const supervisor = this.#supervisor(input, input.job.checkpoint, undefined, true);
    const current = saved ?? await supervisor.inspect(input.job.name);
    checkSnapshot(input, current);
    if (!current.process.receipt || !["complete", "failed", "stuck"].includes(current.process.status)) mismatch("summary process has no terminal evidence");
    const raw = await this.store.getReceipt(current.process.receipt);
    if (raw === undefined || hash(raw) !== current.process.receipt) mismatch("summary receipt content conflicts with process evidence");
    const receipt = parseRunReceipt(snapshot(raw, 16_000_000));
    if (receipt.manifestDigest !== input.job.manifest || !equal(receipt.args, processArgs(input, input.job.checkpoint))) mismatch("receipt belongs to another checkpoint or request");
    const verified = await verifyReceipt(raw, manifestToJson(manifest(input)), this.store, builtinRegistry(), undefined, supervisor.evidenceTools());
    if (!verified.ok) mismatch(`receipt does not replay: ${verified.mismatches[0]}`);
    await supervisor.verify(input.job.name);
    return { snapshot: current, receipt, raw };
  }
  #result(input: JobInput, recorded: RunReceipt, receipt: Digest): { result: ContextHistorySummaryResult; summary: ContextHistorySummary | null } {
    const rawPrepared = recorded.cells.prepare?.outputs?.out;
    const prepared = rawPrepared === undefined ? undefined : preparation(rawPrepared);
    const inputBytes = prepared?.status === "ready" ? prepared.inputBytes : 0;
    const usage = { inputBytes, outputBytes: 0, work: recorded.work.units, modelCalls: recorded.work.agentCalls };
    const rawFinal = recorded.cells.finish?.outputs?.out;
    const final = rawFinal === undefined ? undefined : parseOutput(rawFinal);
    if (recorded.outcome === "complete" && final?.status === "complete") {
      const model = prepared?.status === "ready" ? recorded.effects.find(effect => effect.requestDigest === prepared.effect) : undefined;
      if (!model || model.error || model.requestDigest !== final.effect || prepared?.status !== "ready" || !equal(model.output, final.summary.body)
        || model.configurationDigest !== input.plan.recipe.configuration || recorded.work.agentCalls !== 1) mismatch("completed summary conflicts with its recorded model body/request");
      usage.outputBytes = bytes(final.summary);
      const result = parseContextHistorySummaryResult({ schema: "algal.context-history-summary-result.v1", request: input.job.request,
        status: "complete", summary: hash(final.summary), receipt, usage, reason: null });
      validateContextHistorySummaryResult(input.request, result, final.summary);
      return { result, summary: final.summary };
    }
    let status: ContextHistorySummaryFailure = recorded.failure?.code === "BUDGET_EXHAUSTED" ? "budget-exhausted" : "failed";
    for (const cell of ["catalog", "selection", "prepare", "check", "recheck", "finish"]) {
      const output = recorded.cells[cell]?.outputs?.out;
      if (output !== undefined) {
        const parsed = parseOutput(output);
        if (parsed.status !== "ready" && parsed.status !== "complete") { status = parsed.status; break; }
      }
    }
    const result = failureResult(input.request, status, receipt, usage);
    validateContextHistorySummaryResult(input.request, result, null);
    return { result, summary: null };
  }
  async #settle(input: JobInput, saved?: ProcessSnapshot): Promise<ContextSummaryExecution> {
    const verified = await this.#verified(input, saved), receiptDigest = verified.snapshot.process.receipt!;
    const output = this.#result(input, verified.receipt, receiptDigest);
    const reserved = reservations.get(this.#account);
    if (reserved?.dir === this.dir && equal(reserved.job, input.job)) {
      this.#account.charge(receiptDigest, verified.receipt);
      reservations.delete(this.#account);
    } else {
      const account = accountSnapshot(this.#account), checkpoint = parseHabitatBudget(await storedValue(this.store, input.job.checkpoint));
      const index = account.runs.findIndex(run => run.receipt === receiptDigest && run.manifest === input.job.manifest);
      if (index < 0 || index !== checkpoint.runs.length || !equal(account.runs.slice(0, index), checkpoint.runs)
        || account.activity !== checkpoint.activity || !equal(account.limits, checkpoint.limits)) mismatch("completed process requires an explicit exact-account restore handoff");
      const run = account.runs[index]!;
      if (run.charged.work !== verified.receipt.work.units || run.charged.attempts !== verified.receipt.work.agentCalls
        || run.ceiling.work !== input.request.limits.maxWork || run.ceiling.attempts !== 1) mismatch("account charge differs from the verified summary receipt");
    }
    if (output.summary) await this.#put(output.summary, hash(output.summary));
    await this.#put(output.result, hash(output.result));
    const account = accountSnapshot(this.#account), checkpoint = hash(account);
    await this.#put(account, checkpoint);
    return { state: "settled", job: input.job, result: output.result, accountCheckpoint: checkpoint };
  }
  async reconcile(value: unknown): Promise<ContextSummaryExecution> {
    const input = parseJobInput(value), reserved = reservations.get(this.#account);
    if (!reserved || reserved.dir !== this.dir || !equal(reserved.job, input.job)) mismatch("reconciliation requires the exact open reservation or an explicit restore handoff");
    const saved = await new ProcessSupervisor(this.dir).inspect(input.job.name);
    checkSnapshot(input, saved);
    return this.#reconcile(input, saved);
  }
  async verify(value: unknown): Promise<{ ok: true; digest: Digest; receipt: Digest }> {
    const input = parseJobInput(value);
    const verified = await this.#verified(input);
    this.#result(input, verified.receipt, verified.snapshot.process.receipt!);
    return { ok: true, digest: verified.receipt.digest, receipt: verified.snapshot.process.receipt! };
  }
  async publish(value: unknown): Promise<Digest> {
    const v = object(snapshot(value, CONTEXT_SUMMARY_BOUNDS.maxPlanBytes * 2), ["reference", "plan", "jobs"]);
    const reference = parseContextHistoryRef(v.reference), plan = checkedPlan(v.plan);
    if (reference.history !== hash(plan.history)) invalid("publication ref belongs to another history");
    const jobs = list(v.jobs, Math.min(plan.queue.batchSize, B.maxBatchJobs)).map(parseJob);
    if (!jobs.length || new Set(jobs.map(job => job.request)).size !== jobs.length) invalid("publication needs unique completed jobs");
    const accepted = retained(plan), byNode = new Map(accepted.map(summary => [summary.node, summary]));
    for (const job of jobs) {
      const request = plan.requests.find(candidate => hash(candidate) === job.request);
      if (!request) mismatch("publication completion belongs to another queue/request");
      const input: JobInput = { reference, plan, request, job };
      await this.#settle(input);
      const verified = await this.#verified(input), completed = this.#result(input, verified.receipt, verified.snapshot.process.receipt!);
      if (!completed.summary || completed.result.status !== "complete") mismatch("only a verified complete result can publish a derivative");
      const old = byNode.get(completed.summary.node);
      if (old && !equal(old, completed.summary)) mismatch("alternative summary body conflicts with the first completion");
      byNode.set(completed.summary.node, completed.summary);
    }
    const nodesById = new Map([...plan.parent.nodes, ...plan.nodes].map(sourceNode => [hash(sourceNode), sourceNode]));
    const summaries = [...byNode.values()].sort((a, b) => {
      const left = nodesById.get(a.node)!, right = nodesById.get(b.node)!;
      return (left.end - left.start) - (right.end - right.start) || left.start - right.start;
    });
    const nodes = summaries.map(summary => nodesById.get(summary.node)!);
    const generation: ContextHistoryGeneration = parseContextHistoryGeneration({ schema: "algal.context-history-generation.v1", history: hash(plan.history),
      generation: plan.parent.generation.generation + 1, prompt: contextSummaryPrompt(plan.recipe), policy: plan.recipe.policy,
      summarizer: plan.recipe.summarizer, summaries: summaries.map(summary => ({ node: summary.node, summary: hash(summary) })) });
    const derivatives = { generation, nodes, summaries };
    validateContextHistoryGeneration(plan.history, generation, nodes, summaries);
    if (bytes(derivatives) > CONTEXT_SUMMARY_BOUNDS.maxPublicationBytes) exhausted("publication record pool exceeds its explicit byte ceiling");
    for (const record of [...nodes, ...summaries]) await this.#put(record, hash(record));
    await this.#put(generation, hash(generation));
    await this.#history.publishGeneration(reference, derivatives, hash(plan.parent.generation));
    return hash(generation);
  }
  static async restore(options: { dir: string; historyHost: ContextHistoryHost; executor: Executor; checkpoint: unknown;
    reference: unknown; plan: unknown; request: unknown; job: unknown }): Promise<{ driver: ContextSummaryDriver; account: HabitatAccount; execution: ContextSummaryExecution }> {
    const checked = hostOptions(options, ["dir", "historyHost", "executor", "checkpoint", "reference", "plan", "request", "job"]);
    const input = parseJobInput({ reference: checked.reference, plan: checked.plan, request: checked.request, job: checked.job });
    const checkpoint = asDigest(snapshot(checked.checkpoint, 128), "authorized checkpoint handoff");
    if (checkpoint !== input.job.checkpoint) mismatch("restore must use the exact saved account checkpoint");
    requireExecutionBounds(input);
    if (!(checked.historyHost instanceof ContextHistoryHost)) invalid("restore requires a trusted current history host");
    const executor = checked.executor as Executor;
    if (!executor || typeof executor.execute !== "function" || executor.id !== input.plan.recipe.executor || !executorSupports(executor, "agent")) invalid("restore requires the original host executor profile");
    const store = new FileStore(resolve(text(checked.dir, 4_096)));
    const saved = await new ProcessSupervisor(store.dir).inspect(input.job.name);
    checkSnapshot(input, saved);
    const declared = await store.getManifest(input.job.manifest);
    if (!declared || !equal(manifestToJson(declared), manifestToJson(manifest(input)))) mismatch("restore manifest or declared budgets changed");
    const record = parseHabitatBudget(await storedValue(store, checkpoint));
    const account = await HabitatAccount.resume(record, store);
    const driver = new ContextSummaryDriver({ dir: store.dir, historyHost: checked.historyHost, account, executor });
    account.reserve(input.job.manifest, manifest(input).budgets);
    reservations.set(account, { dir: store.dir, job: input.job });
    const execution = await driver.#reconcile(input, saved);
    return { driver, account, execution };
  }
  async #reconcile(input: JobInput, saved: ProcessSnapshot): Promise<ContextSummaryExecution> {
    if (!["ready", "uncertain", "suspended"].includes(saved.process.status)) return this.#settle(input, saved);
    if (saved.process.status !== "uncertain") return { state: "open", job: input.job, result: null, reservation: "open", accountCheckpoint: null };
    const supervisor = this.#supervisor(input, input.job.checkpoint, undefined, true);
    const journal = object(snapshot(await supervisor.journal(input.job.name)), ["header", "effects", "bytes"]);
    const effects = list(journal.effects, 16).map(value => object(value, ["digest", "record"]));
    if (!effects.length || effects.some(value => object(value.record, ["contract", "intent", "ordinal", "requestDigest", "executor", "configurationDigest", "idempotencyKey", "recovery", "state", "attempt", "previous", "receipt"],
      ["contract", "intent", "ordinal", "requestDigest", "executor", "configurationDigest", "idempotencyKey", "recovery", "state", "attempt"]).state !== "completed")) {
      return { state: "open", job: input.job, result: null, reservation: "open", accountCheckpoint: null };
    }
    const last = asObject(effects.at(-1)!.record, "journal terminal effect"), terminal = asObject(last.receipt, "terminal effect receipt");
    let settledPrefix = last.executor === `tool:${toolName("finish")}`;
    if (last.executor === input.plan.recipe.executor && terminal.error !== undefined && asObject(terminal.error, "model failure").code !== "EFFECT_SUSPENDED") settledPrefix = true;
    if (last.executor === `tool:${toolName("prepare")}` && terminal.output !== undefined) {
      const output = object(terminal.output, ["out", "data"], ["out"]);
      const prepared = preparation(output.out);
      if (prepared.status !== "ready" && output.data === undefined) settledPrefix = true;
    }
    if (!settledPrefix) return { state: "open", job: input.job, result: null, reservation: "open", accountCheckpoint: null };
    const recovered = await supervisor.recover(input.job.name, saved.digest);
    return this.#settle(input, recovered);
  }
}
