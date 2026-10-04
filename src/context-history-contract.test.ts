import { describe, expect, test } from "bun:test";
import fixture from "../scripts/fixtures/context-history.json";
import { putAgentContext } from "./agent-context";
import { parseMemoryClaim, parseMemoryObservation } from "./application-memory";
import {
  CONTEXT_HISTORY_BOUNDS, contextHistoryDigest, contextHistoryNode, contextHistoryRef,
  parseContextHistory, parseContextHistoryRecord,
  validateContextHistoryAccess, validateContextHistoryDelegation, validateContextHistoryGeneration,
  validateContextHistoryNode, validateContextHistoryQueue, validateContextHistorySources,
  validateContextHistorySummary, validateContextHistorySummaryRequest, validateContextHistorySummaryResult,
  validateContextHistoryView,
} from "./context-history-contract";
import { digestCanonical, type Digest } from "./digest";
import { MemoryStore } from "./store-memory";
import { utf8Length } from "./utf8";
import { asJsonValue, canonicalize, type JsonValue } from "./values";

const records = fixture.records as unknown as Record<string, JsonValue>;
const digests = fixture.digests as Record<string, Digest>;
const record = (name: string): JsonValue => structuredClone(records[name]!);
const hash = (input: unknown): Digest => digestCanonical(asJsonValue(input, "test record"));
const other = hash({ name: "other" });
const nodes = (): JsonValue[] => ["leaf0", "leaf1", "leaf2", "leaf3", "left", "right", "root"].map(record);
const summaries = (): JsonValue[] => ["summaryLeft", "summaryRight", "summaryRoot"].map(record);
const children = (): JsonValue[] => [record("summaryLeft"), record("summaryRight")];
type Path = readonly (string | number)[];
function at(input: unknown, path: Path): unknown {
  let value = input;
  for (const key of path) value = (value as Record<string, unknown>)[key];
  return value;
}
function changed(input: unknown, path: Path, replacement: unknown, remove = false): unknown {
  const result: unknown = structuredClone(input);
  const parent = at(result, path.slice(0, -1)) as Record<string, unknown>;
  const key = String(path.at(-1));
  if (remove) delete parent[key];
  else parent[key] = replacement;
  return result;
}
function objectPaths(input: JsonValue, path: Path = []): { path: Path; keys: string[] }[] {
  if (!input || typeof input !== "object") return [];
  const own = Array.isArray(input) ? [] : [{ path, keys: Object.keys(input) }];
  return [...own, ...Object.entries(input).flatMap(([key, value]) => objectPaths(value, [...path, key]))];
}
function variant(row: { base: string; changes: { path: (string | number)[]; value: unknown }[] }): unknown {
  return row.changes.reduce((value, change) => changed(value, change.path, change.value), record(row.base) as unknown);
}
function largeHistory(count = 1024): unknown {
  const base = parseContextHistory(record("history"));
  return {
    ...base, epoch: 127, firstPosition: 131072 - count,
    leaves: Array.from({ length: count }, (_, index) => ({
      position: 131072 - count + index, event: hash({ event: index }), sourceIndex: index,
      entry: hash({ entry: index }), bytes: index < 8 ? 1048576 : 0, kind: "input", label: "\0".repeat(128),
    })),
  };
}

describe("context history shared canonical vectors", () => {
  test("all frozen records and degraded views have identical canonical identities", () => {
    for (const [name, value] of Object.entries(records)) {
      expect(contextHistoryDigest(value)).toBe(digests[name]!);
      expect(hash(parseContextHistoryRecord(value))).toBe(digests[name]!);
      expect(canonicalize(asJsonValue(parseContextHistoryRecord(value), "parsed"))).toBe(canonicalize(value));
    }
    for (const row of fixture.validViews) {
      const value = variant(row);
      expect(contextHistoryDigest(value)).toBe(row.digest as Digest);
      validateContextHistoryView(record("history"), record("generation"), value, nodes(), summaries());
    }
    for (const row of fixture.validResults) {
      const value = variant(row);
      expect(contextHistoryDigest(value)).toBe(row.digest as Digest);
      validateContextHistorySummaryResult(record("request"), value, null);
      expect(() => validateContextHistorySummaryResult(record("request"), value, record("summaryRoot"))).toThrow();
    }
  });
  test("reuses the unchanged original V1 bodies and ordered snapshot", async () => {
    const store = new MemoryStore();
    const snapshot = await putAgentContext(store, fixture.sources.map(({ kind, label, text }) => ({ kind, label, text })) as Parameters<typeof putAgentContext>[1]);
    expect(snapshot).toBe(at(record("history"), ["snapshot"]) as Digest);
    expect(await store.getValue(snapshot)).toEqual(fixture.snapshot);
    validateContextHistorySources(record("history"), fixture.snapshot, fixture.sources);
    for (const leaf of parseContextHistory(record("history")).leaves) expect(await store.getValue(leaf.entry)).toEqual(fixture.sources[leaf.sourceIndex]!);
  });
  test("checks node, child, job, publication, queue, and captured-head page bindings", () => {
    const history = record("history");
    for (const node of nodes()) validateContextHistoryNode(history, node);
    expect(asJsonValue(contextHistoryNode(history, 0, 4), "node")).toEqual(record("root"));
    validateContextHistorySummary(history, record("root"), record("summaryRoot"), children());
    validateContextHistorySummaryRequest(history, record("root"), record("request"), children());
    validateContextHistorySummaryResult(record("request"), record("result"), record("summaryRoot"));
    validateContextHistoryGeneration(history, record("generation"), nodes(), summaries());
    validateContextHistoryQueue(history, record("queue"), [record("request")]);
    validateContextHistoryView(history, record("generation"), record("view"), nodes(), summaries());
    validateContextHistoryView(history, record("generation"), record("tail"), nodes(), summaries(), record("cursor"));
    validateContextHistoryAccess(history, record("ref"), record("grant"), record("access"));
    expect(asJsonValue(contextHistoryRef(record("grant")), "ref")).toEqual(record("ref"));
  });
  test("source/range identity cannot depend on publication or a job result", () => {
    const before = contextHistoryNode(record("history"), 0, 4);
    for (const field of ["prompt", "policy", "summarizer", "body"] as const) {
      const replacement = field === "body" ? "Different reading aid" : other;
      expect(contextHistoryDigest(changed(record("summaryRoot"), [field], replacement))).not.toBe(digests.summaryRoot!);
      expect(contextHistoryNode(record("history"), 0, 4)).toEqual(before);
    }
    const next = changed(record("request"), ["generation"], 1);
    expect(contextHistoryDigest(next)).not.toBe(digests.request!);
    expect(hash(before)).toBe(digests.root!);
    expect(() => parseContextHistoryRecord(changed(record("root"), ["job"], digests.request))).toThrow();
  });
});

describe("closed portable ingress", () => {
  test("unknown and missing keys are rejected at every object level", () => {
    for (const value of [...Object.values(records), ...[...fixture.validViews, ...fixture.validResults].map(row => asJsonValue(variant(row), "variant"))]) {
      for (const { path, keys } of objectPaths(value)) {
        expect(() => parseContextHistoryRecord(changed(value, [...path, "unknown"], true))).toThrow();
        for (const key of keys) expect(() => parseContextHistoryRecord(changed(value, [...path, key], null, true))).toThrow();
      }
    }
  });
  test("shared malformed and numeric over-limit cases fail", () => {
    for (const row of fixture.refusals) expect(() => parseContextHistoryRecord(changed(record(row.record), row.path, row.value))).toThrow();
    for (const row of fixture.numericBounds) {
      for (const value of [row.max + 1, -1, 0.5, null, "1", true]) expect(() => parseContextHistoryRecord(changed(record(row.record), row.path, value))).toThrow();
    }
  });
  test("foreign sparse, accessor, prototype, symbol, cyclic, and noncanonical values never run code", () => {
    let calls = 0;
    const get = () => { calls++; return "owner"; };
    const accessor = record("history") as Record<string, unknown>;
    Object.defineProperty(accessor, "scope", { enumerable: true, get });
    const arrayGetter = [record("history")];
    Object.defineProperty(arrayGetter, 0, { enumerable: true, get });
    const symbol = Object.assign(record("history") as object, { [Symbol("hidden")]: 1 });
    const hidden = record("history") as object;
    Object.defineProperty(hidden, "hidden", { value: 1, enumerable: false });
    const cyclic = record("history") as Record<string, unknown>;
    cyclic.extra = cyclic;
    const toJson = { ...record("history") as object, toJSON() { calls++; return {}; } };
    for (const value of [accessor, symbol, hidden, cyclic, toJson, new Date(0), Object.create({ schema: "algal.context-history.v1" }), changed(record("history"), ["leaves"], Array(1)), changed(record("history"), ["leaves"], arrayGetter), changed(record("history"), ["epoch"], Infinity), changed(record("history"), ["epoch"], 1n)]) {
      expect(() => parseContextHistoryRecord(value)).toThrow();
    }
    expect(calls).toBe(0);
    const parsed = parseContextHistory(record("history"));
    (records.history as Record<string, JsonValue>).epoch = 1;
    expect(parsed.epoch).toBe(0);
    (records.history as Record<string, JsonValue>).epoch = 0;
  });
  test("Unicode, key order, and numeric normalization preserve portable identities", () => {
    const history = record("history");
    const reversed = Object.fromEntries(Object.entries(history as object).reverse());
    expect(contextHistoryDigest(reversed)).toBe(digests.history!);
    expect(contextHistoryDigest(changed(history, ["epoch"], -0))).toBe(digests.history!);
    for (const path of [["leaves", 0, "label"], ["scope", "audience"]] as const) {
      for (const bad of ["\ud800", "\udc00", "x\ud800y"]) expect(() => parseContextHistoryRecord(changed(history, path, bad))).toThrow();
    }
    expect(() => parseContextHistoryRecord(changed(history, ["leaves", 0, "label"], "é".repeat(64)))).not.toThrow();
    expect(() => parseContextHistoryRecord(changed(history, ["leaves", 0, "label"], "é".repeat(65)))).toThrow();
    expect(() => parseContextHistoryRecord(changed(record("summaryLeft"), ["body"], "𝄞\ufeff東京\n\0"))).not.toThrow();
  });
});

describe("finite capacities and encoded overhead", () => {
  test("maximum capture retains the V1 ceilings, including control-character labels", () => {
    const history = parseContextHistory(largeHistory());
    expect(history.leaves).toHaveLength(1024);
    expect(history.leaves.reduce((total, leaf) => total + leaf.bytes, 0)).toBe(8388608);
    expect(utf8Length(canonicalize(asJsonValue(history, "maximum history")))).toBeLessThanOrEqual(CONTEXT_HISTORY_BOUNDS.maxHistoryBytes);
    const root = contextHistoryNode(history, 0, 1024);
    expect(Math.log2(root.end - root.start)).toBe(10);
    expect(CONTEXT_HISTORY_BOUNDS.maxInternalNodes).toBe(1023);
    expect(CONTEXT_HISTORY_BOUNDS.maxTreeNodes).toBe(2047);
    expect(() => parseContextHistory(largeHistory(1025))).toThrow();
    expect(() => parseContextHistory(changed(history, ["leaves", 8, "bytes"], 1))).toThrow();
    expect(() => parseContextHistory(changed(history, ["leaves", 0, "bytes"], 1048577))).toThrow();
    expect(() => parseContextHistory(changed(history, ["leaves", 0, "label"], "\0".repeat(129)))).toThrow();
    expect(() => contextHistoryNode(history, 0, 2048)).toThrow();
  });
  test("empty and one-leaf captures have explicit, bounded identities", () => {
    const history = changed(record("history"), ["leaves"], []);
    expect(parseContextHistory(history).leaves).toEqual([]);
    expect(() => contextHistoryNode(history, 0, 1)).toThrow();
    const one = changed(record("history"), ["leaves"], [at(record("history"), ["leaves", 0])]);
    expect(contextHistoryNode(one, 0, 1).end).toBe(1);
    expect(() => validateContextHistorySummary(one, contextHistoryNode(one, 0, 1), record("summaryLeft"), [])).toThrow();
  });
  test("maximum scalar limits are admitted but zero operation limits are not", () => {
    expect(() => parseContextHistoryRecord(changed(record("request"), ["limits", "maxWork"], 16777216))).not.toThrow();
    expect(() => parseContextHistoryRecord(changed(record("request"), ["generation"], 4095))).not.toThrow();
    expect(() => parseContextHistoryRecord(changed(record("access"), ["revision"], 4095))).not.toThrow();
    expect(() => parseContextHistoryRecord(changed(record("cursor"), ["offset"], 1024))).not.toThrow();
    for (const row of fixture.numericBounds.filter(row => row.path[0] === "limits" || row.path.at(-1) === "batchSize")) expect(() => parseContextHistoryRecord(changed(record(row.record), row.path, 0))).toThrow();
  });
  test("encoded node, page, cursor and queue overhead have independent caps", () => {
    expect(() => parseContextHistoryRecord(changed(record("summaryLeft"), ["body"], "x".repeat(16384)))).not.toThrow();
    expect(() => parseContextHistoryRecord(changed(record("summaryLeft"), ["body"], "x".repeat(16385)))).toThrow();
    const escapedSummary = changed(record("summaryLeft"), ["body"], "\0".repeat(6000));
    expect(utf8Length(canonicalize(asJsonValue(escapedSummary, "summary")))).toBeGreaterThan(32768);
    expect(() => parseContextHistoryRecord(escapedSummary)).toThrow();
    let escapedPage = changed(record("tail"), ["items"], [{ kind: "exact", node: digests.leaf3, start: 3, end: 4, text: "\0".repeat(11000) }]);
    escapedPage = changed(escapedPage, ["start"], 3);
    escapedPage = changed(escapedPage, ["usage", "readBytes"], 11000);
    expect(() => parseContextHistoryRecord(escapedPage)).toThrow();
    const limitedPage = changed(record("tail"), ["limits", "maxOutputBytes"], 1024);
    const pageBytes = utf8Length(canonicalize(asJsonValue(limitedPage, "limited page")));
    expect(() => parseContextHistoryRecord(changed(limitedPage, ["limits", "maxOutputBytes"], pageBytes))).not.toThrow();
    expect(() => parseContextHistoryRecord(changed(limitedPage, ["limits", "maxOutputBytes"], pageBytes - 1))).toThrow();
    expect(() => parseContextHistoryRecord(changed(record("view"), ["items"], Array(129).fill(at(record("view"), ["items", 0]))))).toThrow();
    expect(() => parseContextHistoryRecord(changed(record("generation"), ["summaries"], Array(1024).fill(at(record("generation"), ["summaries", 0]))))).toThrow();
    expect(() => parseContextHistoryRecord(changed(record("queue"), ["requests"], Array(1024).fill(other)))).toThrow();
    expect(() => parseContextHistoryRecord(changed(record("grant"), ["indices"], Array.from({ length: 1025 }, (_, index) => index)))).toThrow();
    expect(() => validateContextHistoryGeneration(record("history"), record("generation"), Array(2048).fill(record("root")), summaries())).toThrow();
  });
  test("maximum collection and identifier fields still parse independently of permission", () => {
    for (const key of ["application", "realm", "workspace", "task", "audience"]) {
      expect(() => parseContextHistoryRecord(changed(record("history"), ["scope", key], "a".repeat(64)))).not.toThrow();
      expect(() => parseContextHistoryRecord(changed(record("history"), ["scope", key], "a".repeat(65)))).toThrow();
    }
    expect(() => parseContextHistoryRecord(changed(record("grant"), ["indices"], Array.from({ length: 1024 }, (_, index) => index)))).not.toThrow();
    const maxGeneration = changed(record("generation"), ["summaries"], Array.from({ length: 1023 }, (_, index) => ({ node: hash({ node: index }), summary: hash({ summary: index }) })));
    expect(() => parseContextHistoryRecord(maxGeneration)).not.toThrow();
    const maxQueue = changed(record("queue"), ["requests"], Array.from({ length: 1023 }, (_, index) => hash({ job: index })));
    expect(() => parseContextHistoryRecord(changed(maxQueue, ["batchSize"], 32))).not.toThrow();
    const maxView = { ...record("tail") as object, start: 0, end: 128,
      items: Array.from({ length: 128 }, (_, index) => ({ kind: "exact", node: hash({ node: index }), start: index, end: index + 1, text: "" })),
      usage: { readBytes: 0, scanBytes: 0, nodeVisits: 128, work: 128 } };
    expect(() => parseContextHistoryRecord(maxView)).not.toThrow();
  });
  test("the queue accounts for request bodies and the encoded reference frame", () => {
    const history = parseContextHistory(largeHistory());
    history.leaves = history.leaves.map(row => ({ ...row, bytes: 0 }));
    const id = hash(history);
    const jobs: JsonValue[] = [];
    for (let size = 2; size <= 1024; size *= 2) {
      for (let start = 0; start < 1024; start += size) {
        const node = { schema: "algal.context-history-node.v1", history: id, start, end: start + size,
          sources: hash({ schema: "algal.context-history-sources.v1", history: id, leaves: history.leaves.slice(start, start + size) }) };
        jobs.push(asJsonValue({ ...record("request") as object, history: id, node: hash(node), sources: node.sources, children: [],
          limits: { ...at(record("request"), ["limits"]) as object, maxWork: 1 } }, "job"));
      }
    }
    const jobIds = jobs.map(hash);
    const queue = (count: number): JsonValue => asJsonValue({ ...record("queue") as object, history: id, requests: jobIds.slice(0, count), work: count }, "queue");
    const jobBytes = utf8Length(canonicalize(jobs[0]!));
    const total = (count: number): number => utf8Length(canonicalize(queue(count))) + jobBytes * count;
    let count = 0;
    while (count < jobs.length && total(count + 1) <= CONTEXT_HISTORY_BOUNDS.maxQueueBytes) count++;
    expect(CONTEXT_HISTORY_BOUNDS.maxQueueBytes).toBe(524288);
    expect(count).toBeLessThan(jobs.length);
    validateContextHistoryQueue(history, queue(count), jobs.slice(0, count));
    expect(() => validateContextHistoryQueue(history, queue(count + 1), jobs.slice(0, count + 1))).toThrow("encoded bytes");
    const costly = jobs.slice(0, 5).map(job => changed(job, ["limits", "maxWork"], 16777216));
    expect(() => validateContextHistoryQueue(history, { ...queue(0) as object, requests: costly.map(hash), work: 67108864 }, costly)).toThrow();
  });
  test("the maximum original record is still a V1 source, not a history body", () => {
    const source = { schema: "algal.agent-context-entry.v1", kind: "input", label: "\0".repeat(128), text: "\0".repeat(1048576) };
    const snapshot = { schema: "algal.agent-context.v1", entries: [{ digest: hash(source), bytes: 1048576 }] };
    const original = parseContextHistory(record("history"));
    const history = { ...original, snapshot: hash(snapshot), leaves: [{ ...original.leaves[0]!, entry: hash(source), bytes: 1048576, kind: "input", label: source.label }] };
    validateContextHistorySources(history, snapshot, [source]);
    expect(() => validateContextHistorySources(history, snapshot, [{ ...source, text: source.text + "x" }])).toThrow();
    expect(() => validateContextHistorySources(history, snapshot, [{ ...source, text: "\ud800" }])).toThrow();
  });
});

describe("cross-record and host-side refusals", () => {
  test("mismatched snapshots, original bytes, duplicate events, and conflicting bodies fail", () => {
    const history = record("history");
    expect(() => validateContextHistorySources(history, changed(fixture.snapshot, ["entries", 0, "bytes"], 25), fixture.sources)).toThrow();
    expect(() => validateContextHistorySources(history, fixture.snapshot, changed(fixture.sources, [0, "text"], "changed"))).toThrow();
    expect(() => validateContextHistorySources(history, fixture.snapshot, changed(fixture.sources, [0, "label"], "changed"))).toThrow();
    expect(() => validateContextHistorySources(history, fixture.snapshot, Array(4))).toThrow();
    expect(() => validateContextHistorySources(history, fixture.snapshot, [...fixture.sources, fixture.sources[0]])).toThrow();
    const swapped = changed(history, ["leaves", 0, "sourceIndex"], 100);
    expect(() => validateContextHistorySources(swapped, fixture.snapshot, fixture.sources)).toThrow();
    expect(() => validateContextHistoryNode(history, changed(record("root"), ["history"], other))).toThrow();
    expect(() => validateContextHistoryNode(history, changed(record("root"), ["sources"], other))).toThrow();
  });
  test("identical original bodies can occur in distinct source events", () => {
    const history = parseContextHistory(record("history"));
    const first = history.leaves[0]!, second = history.leaves[1]!;
    history.leaves[1] = { ...first, event: second.event, position: second.position, sourceIndex: second.sourceIndex };
    const snapshot = structuredClone(fixture.snapshot);
    snapshot.entries[1] = { ...snapshot.entries[0]! };
    history.snapshot = hash(snapshot);
    validateContextHistorySources(history, snapshot, [fixture.sources[0], fixture.sources[0], fixture.sources[2], fixture.sources[3]]);
    expect(() => parseContextHistory(changed(history, ["leaves", 1, "label"], "different body label"))).toThrow();
  });
  test("a two-leaf source range cannot publish summaries of individual leaves", () => {
    const forged = [0, 1].map(index => asJsonValue({ ...record("summaryLeft") as object,
      node: digests[`leaf${index}`], sources: at(record(`leaf${index}`), ["sources"]), body: "invented leaf summary" }, "child"));
    const parent = changed(record("summaryLeft"), ["children"], forged.map(hash));
    expect(() => validateContextHistorySummary(record("history"), record("left"), parent, forged)).toThrow();
  });
  test("child lineage, recipes, history and publication must agree", () => {
    const history = record("history");
    expect(() => validateContextHistorySummary(history, record("root"), record("summaryRoot"), children().reverse())).toThrow();
    expect(() => validateContextHistorySummary(history, record("root"), record("summaryRoot"), [changed(record("summaryLeft"), ["history"], other), record("summaryRight")])).toThrow();
    expect(() => validateContextHistorySummaryRequest(history, record("root"), changed(record("request"), ["sources"], other), children())).toThrow();
    expect(() => validateContextHistorySummaryResult(record("request"), record("result"), changed(record("summaryRoot"), ["body"], "conflict"))).toThrow();
    expect(() => validateContextHistorySummaryResult(changed(record("request"), ["policy"], other), record("result"), record("summaryRoot"))).toThrow();
    expect(() => validateContextHistorySummaryResult(record("request"), changed(record("result"), ["usage", "outputBytes"], 1), record("summaryRoot"))).toThrow();
    expect(() => validateContextHistoryGeneration(history, changed(record("generation"), ["prompt"], other), nodes(), summaries())).toThrow();
    expect(() => validateContextHistoryGeneration(history, record("generation"), [...nodes(), record("root")], summaries())).toThrow();
    expect(() => validateContextHistoryGeneration(history, record("generation"), nodes(), [...summaries(), record("summaryRoot")])).toThrow();
    expect(() => validateContextHistoryQueue(history, changed(record("queue"), ["work"], 1), [record("request")])).toThrow();
    expect(() => validateContextHistoryQueue(history, record("queue"), [changed(record("request"), ["generation"], 1)])).toThrow();
  });
  test("continuations bind audience, head, generation, selection and budget", () => {
    for (const [field, replacement] of [["head", other], ["audience", "child"], ["generation", other], ["policy", other], ["budget", other], ["selection", other]] as const) {
      expect(() => validateContextHistoryView(record("history"), record("generation"), record("tail"), nodes(), summaries(), changed(record("cursor"), ["binding", field], replacement))).toThrow();
    }
    expect(() => validateContextHistoryView(record("history"), record("generation"), changed(record("tail"), ["items", 0, "text"], "invented"), nodes(), summaries())).toThrow();
    expect(() => validateContextHistoryView(changed(record("history"), ["scope", "audience"], "child"), record("generation"), record("view"), nodes(), summaries())).toThrow();
    expect(() => validateContextHistoryView(record("history"), record("generation"), changed(record("tail"), ["limits", "maxReadBytes"], 4096), nodes(), summaries(), record("cursor"))).toThrow();
  });
  test("a current revoked grant denies a cached summary and all its metadata", () => {
    for (const row of fixture.accessRefusals) {
      expect(() => validateContextHistoryAccess(record("history"), record("ref"), record("grant"), changed(record("access"), row.path, row.value), row.node === null ? undefined : record(row.node))).toThrow("context history scope does not authorize this operation");
    }
    validateContextHistoryAccess(record("history"), record("ref"), record("grant"), changed(record("access"), ["indices"], [0, 1]), record("left"));
    expect(() => validateContextHistoryAccess(record("history"), changed(record("ref"), ["capability"], `cap:context-history:${other}`), record("grant"), record("access"))).toThrow();
    expect(() => validateContextHistoryAccess(record("history"), record("ref"), changed(record("grant"), ["scope", "audience"], "child"), record("access"))).toThrow();
  });
  test("delegation narrows selected sources and every budget without changing audience", () => {
    const child = changed(record("grant"), ["indices"], [0]);
    validateContextHistoryDelegation(record("grant"), child);
    validateContextHistoryDelegation(record("grant"), changed(child, ["indices"], []));
    for (const mutation of [changed(child, ["indices"], [4]), changed(child, ["scope", "task"], "other"), changed(child, ["scope", "audience"], "child"), changed(child, ["history"], other)]) expect(() => validateContextHistoryDelegation(record("grant"), mutation)).toThrow();
    for (const key of Object.keys(at(child, ["limits"]) as object)) {
      const parent = changed(record("grant"), ["limits", key], 1);
      expect(() => validateContextHistoryDelegation(parent, child)).toThrow();
    }
  });
  test("derived summaries cannot be parsed as facts or observations and carry no clocks", () => {
    expect(() => parseMemoryClaim(record("summaryRoot"))).toThrow();
    expect(() => parseMemoryObservation(record("summaryRoot"))).toThrow();
    for (const name of ["history", "summaryRoot", "request", "result", "view"]) {
      for (const field of ["timestamp", "createdAt", "claims", "capabilities"]) expect(() => parseContextHistoryRecord(changed(record(name), [field], 1))).toThrow();
    }
  });
});
