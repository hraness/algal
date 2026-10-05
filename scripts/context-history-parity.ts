import { resolve } from "node:path";
import { putAgentContext, type AgentContextEntryInput } from "../src/agent-context";
import {
  contextHistoryDigest, contextHistoryNode, parseContextHistoryCursor, type ContextHistory, type ContextHistoryGeneration,
  type ContextHistoryRef, type ContextHistorySummary,
} from "../src/context-history-contract";
import { captureContextHistory, contextHistoryCover, ContextHistoryHost, type ContextHistoryCurrent } from "../src/context-history";
import { digestCanonical, type Digest } from "../src/digest";
import { AlgalError } from "../src/errors";
import { MemoryStore } from "../src/store-memory";
import { asJsonValue, canonicalize, type JsonObject, type JsonValue } from "../src/values";

const root = resolve(import.meta.dir, "..");
const binary = process.env.ALGAL_CONTEXT_HISTORY_BIN ?? resolve(root, "target/debug/examples/context_history_parity");
const hash = (value: unknown): Digest => digestCanonical(asJsonValue(value, "parity identity"));
const scope = { application: "app", realm: "realm", workspace: "workspace", task: "task", audience: "owner" };
const recipe = { prompt: hash("prompt"), policy: hash("policy"), summarizer: hash("scripted") };
type Case = { name: string; sources: AgentContextEntryInput[]; order?: number[]; configuration?: JsonObject; operations: JsonObject[] };
const source = (count: number, text?: string): AgentContextEntryInput[] => Array.from({ length: count }, (_, i) => ({
  kind: i === 0 ? "instruction" : "observation", label: `source-${i}`, text: text ?? `record ${i} needle\n`,
}));
const overview = (extra: JsonObject = {}): JsonObject => ({ op: "overview", ...extra });
const read = (index: number, extra: JsonObject = {}): JsonObject => ({ op: "read", index, ...extra });
const cases: Case[] = [
  { name: "empty", sources: [], operations: [overview(), { op: "inspect" }, { op: "search", query: "absent" }, read(0)] },
  { name: "unicode", sources: [{ kind: "input", label: "unicode", text: "\uFEFFé東京 é東京" }], operations: [overview(), read(0), { op: "slice", index: 0, startByte: 0, endByte: 5 }, { op: "slice", index: 0, startByte: 4, endByte: 5 }, { op: "search", query: "東京" }, { op: "search", query: "東京", maxResults: 1 }] },
  { name: "owner-order", sources: source(4), order: [2, 0, 3], operations: [overview(), read(0), read(1), { op: "delegate", indices: [0], name: "child" }, read(0, { ref: "child" }), overview({ ref: "child" }), { op: "expand", start: 1, end: 2, ref: "child" }] },
  { name: "missing-summaries", sources: source(16), operations: [overview(), { op: "expand", start: 0, end: 8 }, { op: "expand", start: 0, end: 2 }, read(13), { op: "inspect" }] },
  { name: "scripted-generation-and-correction", sources: source(16), operations: [{ op: "generation", ranges: [[0, 8], [4, 8], [8, 12]], generation: 0 }, overview({ save: "original" }), { op: "expand", start: 0, end: 8 }, { op: "current", invalidated: [4] }, overview(), { op: "validate", saved: "original" }, { op: "expand", start: 0, end: 8 }, read(4)] },
  { name: "live-narrowing-and-revocation", sources: source(8), operations: [overview({ save: "original" }), { op: "current", indices: [0] }, read(0), read(1), overview(), { op: "validate", saved: "original" }, { op: "delegate", indices: [0], name: "child" }, { op: "search", query: "needle", ref: "child" }, { op: "current", state: "revoked" }, read(0, { ref: "child" }), { op: "current", state: "active" }, read(0)] },
  { name: "limits", sources: source(8), operations: [{ op: "search", query: "needle", maxScanBytes: 1 }, read(0, { limits: { maxReadBytes: 1 } }), read(0, { limits: { maxWork: 1 } }), overview({ limits: { maxWork: 1 } }), { op: "search", query: "needle", maxResults: 1 }, { op: "read", index: 0, limits: { maxReadBytes: 0 } }] },
  { name: "escaped-output", sources: [{ kind: "input", label: "escaped", text: "\u0000".repeat(6000) }], operations: [overview({ limits: { maxOutputBytes: 4000 } }), read(0, { limits: { maxOutputBytes: 4000 } }), { op: "slice", index: 0, startByte: 0, endByte: 100, limits: { maxOutputBytes: 4000 } }, overview({ limits: { maxOutputBytes: 1 } })] },
  { name: "continuations", sources: source(16, "a".repeat(1800)).map(value => ({ ...value, kind: "observation" })), configuration: { recentLeaves: 0 }, operations: [overview({ limits: { maxReadBytes: 2000 }, save: "first" }), overview({ limits: { maxReadBytes: 2000 }, after: "first", save: "second" }), overview({ limits: { maxReadBytes: 2000 }, after: "first" }), overview({ limits: { maxReadBytes: 3000 }, after: "first" }), { op: "generation", ranges: [[0, 8]], generation: 1 }, overview({ limits: { maxReadBytes: 2000 }, after: "second" })] },
  { name: "protected-overflow", sources: source(16).map((value, i) => i === 15 ? { kind: "instruction", label: "current", text: "x".repeat(5000) } : { ...value, kind: "observation" }), configuration: { recentLeaves: 0, protectedIndices: [10] }, operations: [overview({ limits: { maxReadBytes: 1000 } }), overview()] },
  { name: "protected-item-capacity", sources: source(129), configuration: { recentLeaves: 0, protectedIndices: Array.from({ length: 129 }, (_, i) => i) }, operations: [overview()] },
  { name: "relevance", sources: source(16), configuration: { recentLeaves: 2, protectedIndices: [0, 1], relevance: { query: "older decision", indices: [1, 4, 15] } }, operations: [overview(), { op: "search", query: "record 4" }] },
  { name: "cancelled-and-unavailable", sources: source(8), operations: [overview({ cancelled: true }), read(0, { cancelled: true }), { op: "current", state: "unavailable" }, overview(), read(0)] },
  { name: "revoked-descendants", sources: source(8), operations: [{ op: "delegate", indices: [0, 2], name: "child" }, { op: "delegate", indices: [2], name: "grandchild", ref: "child" }, { op: "revoke" }, read(0), read(0, { ref: "child" }), read(2, { ref: "grandchild" })] },
  { name: "access-revisions", sources: source(8), operations: [overview({ save: "first" }), { op: "current", revision: 1 }, { op: "validate", saved: "first" }, overview(), { op: "current", revision: 0 }, read(0)] },
  { name: "cached-source-removal", sources: source(16), configuration: { recentLeaves: 0 }, operations: [{ op: "generation", ranges: [[0, 8], [4, 8]], generation: 0 }, overview({ save: "cached" }), { op: "validate", saved: "cached" }, { op: "missing", index: 4 }, { op: "validate", saved: "cached" }, overview(), read(4), { op: "search", query: "needle" }] },
  { name: "cached-empty-snapshot-removal", sources: [], operations: [overview({ save: "cached" }), { op: "missing" }, { op: "validate", saved: "cached" }, { op: "inspect" }] },
  { name: "unadmitted-node", sources: source(8), operations: [{ op: "expand-unknown" }, read(0)] },
  { name: "cached-input-cursor", sources: source(16, "a".repeat(1800)).map(value => ({ ...value, kind: "observation" })), configuration: { recentLeaves: 0 }, operations: [overview({ limits: { maxReadBytes: 2000 }, save: "first" }), overview({ limits: { maxReadBytes: 2000 }, after: "first", save: "second" }), { op: "validate", saved: "second", after: "first" }, { op: "validate", saved: "first", after: "first" }, { op: "validate", saved: "second", after: "first", index: 0 }] },
  { name: "conditional-publication", sources: source(8), operations: [{ op: "inspect", save: "before" }, { op: "publish", ranges: [[0, 4]], generation: 2, after: "before" }, { op: "publish", ranges: [[0, 4]], generation: 1, after: "before" }, { op: "publish", ranges: [[0, 4]], generation: 1, after: "before" }, { op: "inspect", save: "published" }, { op: "publish", ranges: [[4, 8]], generation: 1, after: "published" }, { op: "publish", ranges: [[4, 8]], generation: 2, after: "before" }, { op: "publish", ranges: [[4, 8]], generation: 2, after: "published" }, { op: "inspect" }] },
  { name: "invalidated-publication", sources: source(8), operations: [{ op: "inspect", save: "before" }, { op: "current", invalidated: [4] }, { op: "publish", ranges: [[0, 8]], generation: 1, after: "before" }, { op: "publish", ranges: [[0, 4]], generation: 1, after: "before" }, { op: "current", invalidated: [0, 4] }, { op: "publish", ranges: [[0, 4]], generation: 1, after: "before" }, read(4)] },
  { name: "revoked-publication", sources: source(8), operations: [{ op: "inspect", save: "before" }, { op: "current", state: "revoked" }, { op: "publish", ranges: [[0, 4]], generation: 1, after: "before" }] },
];

function derivatives(history: ContextHistory, ranges: JsonValue, generation: number) {
  if (!Array.isArray(ranges)) throw new Error("parity ranges must be an array");
  const nodes = ranges.map(value => {
    if (!Array.isArray(value)) throw new Error("parity range must be an array");
    return contextHistoryNode(history, value[0] as number, value[1] as number);
  });
  const summaries: ContextHistorySummary[] = nodes.map((node, i) => ({
    schema: "algal.context-history-summary.v1", ...recipe, history: node.history,
    node: contextHistoryDigest(node), sources: node.sources, children: [], body: `scripted range ${i}`,
  }));
  const record: ContextHistoryGeneration = {
    schema: "algal.context-history-generation.v1", history: contextHistoryDigest(history), generation, ...recipe,
    summaries: summaries.map(summary => ({ node: summary.node, summary: contextHistoryDigest(summary) })),
  };
  return { generation: record, nodes, summaries };
}

async function reference(item: Case): Promise<JsonValue> {
  const store = new MemoryStore();
  const snapshot = await putAgentContext(store, item.sources);
  const order = item.order ?? item.sources.map((_, i) => i);
  const history = await captureContextHistory(store, {
    scope, head: hash({ ownerSequence: 19 }), snapshot, epoch: 2, firstPosition: 37,
    sources: order.map((sourceIndex, i) => ({ sourceIndex, event: hash({ event: i }), position: 37 + i })),
  });
  let current: ContextHistoryCurrent = { access: {
    schema: "algal.context-history-access.v1", history: contextHistoryDigest(history), scope,
    head: history.head, snapshot, revision: 0, indices: [...order].sort((a, b) => a - b), state: "active",
  }, invalidated: [] };
  const unavailable = new Set<Digest>(), originalGet = store.getValue.bind(store);
  store.getValue = async id => unavailable.has(id) ? undefined : originalGet(id);
  const host = new ContextHistoryHost(store, { principal: "owner", resolveCurrent: () => structuredClone(current) });
  const ref = await host.admit(history, item.configuration);
  const refs = new Map<string, ContextHistoryRef>([["root", ref]]);
  const saved = new Map<string, JsonObject>();
  const results: JsonValue[] = [];
  for (const operation of item.operations) {
    const selected = refs.get(typeof operation.ref === "string" ? operation.ref : "root")!;
    const limits = operation.limits as Parameters<typeof host.read>[2];
    const abort = new AbortController();
    if (operation.cancelled === true) abort.abort();
    try {
      let value: unknown;
      switch (operation.op) {
        case "overview": {
          const opts = { ...(limits === undefined ? {} : { limits }), ...(typeof operation.after === "string" ? { cursor: parseContextHistoryCursor(saved.get(operation.after)!.cursor) } : {}) };
          value = await host.overview(selected, opts, abort.signal);
          if (typeof operation.save === "string") saved.set(operation.save, asJsonValue(value, "saved parity page") as JsonObject);
          break;
        }
        case "inspect": {
          value = await host.inspect(selected, abort.signal);
          if (typeof operation.save === "string") saved.set(operation.save, asJsonValue(value, "saved parity inspection") as JsonObject);
          break;
        }
        case "read": value = await host.read(selected, operation.index as number, limits, abort.signal); break;
        case "slice": value = await host.slice(selected, operation.index as number, operation.startByte as number, operation.endByte as number, limits, abort.signal); break;
        case "search": value = await host.search(selected, {
          query: operation.query as string,
          ...(operation.maxResults === undefined ? {} : { maxResults: operation.maxResults as number }),
          ...(operation.maxScanBytes === undefined ? {} : { maxScanBytes: operation.maxScanBytes as number }),
        }, limits, abort.signal); break;
        case "expand": case "expand-unknown": value = await host.expand(selected, operation.op === "expand-unknown" ? hash("unadmitted source node") : contextHistoryDigest(contextHistoryNode(history, operation.start as number, operation.end as number)), limits, abort.signal); break;
        case "delegate": {
          const child = await host.delegate(selected, operation.indices as number[], limits);
          refs.set(operation.name as string, child); value = child; break;
        }
        case "revoke": host.revoke(selected); value = null; break;
        case "missing": unavailable.add(operation.index === undefined ? snapshot : history.leaves[operation.index as number]!.entry); value = null; break;
        case "validate": {
          const cursor = typeof operation.after === "string" ? structuredClone(saved.get(operation.after)!.cursor as JsonObject) : undefined;
          if (cursor && operation.index !== undefined) cursor.offset = operation.index;
          await host.validateView(selected, saved.get(operation.saved as string)!, cursor); value = null; break;
        }
        case "generation": case "publish": {
          const pool = derivatives(history, operation.ranges!, operation.generation as number);
          if (operation.op === "publish") await host.publishGeneration(selected, pool, saved.get(operation.after as string)!.generation as Digest);
          else await host.useGeneration(selected, pool);
          value = null; break;
        }
        case "current": {
          const { op: _, ...changes } = operation;
          const invalidated = changes.invalidated;
          delete changes.invalidated;
          current = { access: { ...current.access, ...changes } as ContextHistoryCurrent["access"], invalidated: invalidated === undefined ? current.invalidated : invalidated as number[] };
          value = null; break;
        }
        default: throw new Error("unknown parity operation");
      }
      results.push({ ok: true, value: asJsonValue(value, "parity output") });
    } catch (error) {
      if (!(error instanceof AlgalError)) throw error;
      results.push({ ok: false, code: error.code });
    }
  }
  return asJsonValue({ name: item.name, history, ref, results }, "parity reference");
}

const coverCases = [0, 1, 2, 3, 7, 8, 9, 15, 16, 17, 31, 32, 33, 511, 512, 513, 1023, 1024].flatMap(count => [0, 1, 4, 17].map(recent => ({
  count, recent, detailed: [...new Set([0, Math.floor(count / 2), count - 1].filter(n => n >= 0 && n < count))].sort((a, b) => a - b),
})));
const expected = asJsonValue({
  covers: coverCases.map(item => contextHistoryCover(item.count, item.recent, item.detailed)),
  cases: await Promise.all(cases.map(reference)),
}, "parity expected");
const child = Bun.spawn([binary], { cwd: root, stdin: "pipe", stdout: "pipe", stderr: "pipe" });
const timer = setTimeout(() => child.kill(), 60_000);
try {
  child.stdin.write(canonicalize(asJsonValue({ scope, head: hash({ ownerSequence: 19 }), epoch: 2, firstPosition: 37, recipe, coverCases, cases }, "parity input")));
  child.stdin.end();
  const [stdout, stderr, code] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited]);
  if (code !== 0 || child.signalCode !== null) throw new Error(`native history parity exited ${code}: ${(stderr || stdout).slice(-2000)}`);
  if (stdout.length > 16 * 1024 * 1024) throw new Error("native history parity output exceeded its limit");
  const actual = asJsonValue(JSON.parse(stdout), "native parity output");
  if (canonicalize(actual) !== canonicalize(expected)) {
    const actualCases = (actual as JsonObject).cases as JsonObject[];
    const expectedCases = (expected as JsonObject).cases as JsonObject[];
    for (let i = 0; i < expectedCases.length; i++) if (canonicalize(actualCases[i]!) !== canonicalize(expectedCases[i]!)) {
      throw new Error(`history parity mismatch in ${cases[i]!.name}\n${canonicalize(asJsonValue({ expected: expectedCases[i], actual: actualCases[i] }, "parity mismatch"))}`);
    }
    throw new Error("history cover parity mismatch");
  }
  console.log(JSON.stringify({ cases: cases.length, operations: cases.reduce((sum, item) => sum + item.operations.length, 0), covers: coverCases.length, passed: true, checks: "identical views, original reads, Unicode, scope, revocation, invalidation, continuations, cancellation and counters; no inference or store writes during reads" }));
} finally { clearTimeout(timer); }
