import {
  AGENT_CONTEXT_BOUNDS, AgentContextHost, type AgentContextEntryInput, type AgentContextReader,
  type AgentContextSearch,
} from "./agent-context";
import { applicationId } from "./application-contract";
import { contextHistorySelection, validateContextHistoryViewAccess } from "./context-history-access";
import type { CapabilityHandle } from "./capabilities";
import {
  CONTEXT_HISTORY_BOUNDS as B, CONTEXT_HISTORY_READ_CEILINGS,
  contextHistoryDigest, contextHistoryNode, contextHistoryRef,
  parseContextHistory, parseContextHistoryAccess, parseContextHistoryCursor, parseContextHistoryGeneration,
  parseContextHistoryGrant, parseContextHistoryNode, parseContextHistoryRef, parseContextHistorySummary,
  parseContextHistoryView, validateContextHistoryAccess, validateContextHistoryDelegation,
  validateContextHistoryGeneration, validateContextHistoryNode, validateContextHistorySources,
  type ContextHistory, type ContextHistoryAccess, type ContextHistoryBudgetReason, type ContextHistoryCursor,
  type ContextHistoryGeneration, type ContextHistoryGrant, type ContextHistoryNode, type ContextHistoryReadLimits,
  type ContextHistoryRef, type ContextHistoryScope, type ContextHistorySummary, type ContextHistoryView,
  type ContextHistoryViewBinding, type ContextHistoryViewItem,
} from "./context-history-contract";
import { asDigest, digestCanonical, type Digest } from "./digest";
import { AlgalError } from "./errors";
import { boundedJsonSnapshot } from "./json-snapshot";
import type { Store } from "./store-contract";
import { utf8Length } from "./utf8";
import { asInt, asJsonValue, asObject, canonicalBytes, noUnknownKeys, type JsonValue } from "./values";

export type ContextHistoryCapture = {
  scope: ContextHistoryScope; head: Digest; snapshot: Digest; epoch: number; firstPosition: number;
  sources: { sourceIndex: number; position: number; event: Digest }[];
};
export type ContextHistoryRange = { start: number; end: number };
export type ContextHistoryDerivatives = {
  generation: ContextHistoryGeneration; nodes: readonly ContextHistoryNode[]; summaries: readonly ContextHistorySummary[];
};
export type ContextHistoryConfiguration = {
  recentLeaves?: number; protectedIndices?: readonly number[];
  relevance?: { query: string; indices: readonly number[] }; derivatives?: ContextHistoryDerivatives;
};
export type ContextHistoryCurrent = { access: ContextHistoryAccess; invalidated: readonly number[] };
export type ContextHistoryResolver = (history: Readonly<ContextHistory>, principal: string) => ContextHistoryCurrent | Promise<ContextHistoryCurrent>;
export type ContextHistoryPageOptions = { limits?: Partial<ContextHistoryReadLimits>; cursor?: ContextHistoryCursor };
export type ContextHistoryUsage = ContextHistoryView["usage"] & { outputBytes: number };
export type ContextHistoryRead = AgentContextEntryInput & {
  sourceIndex: number; leafIndex: number; position: number; entry: Digest; usage: ContextHistoryUsage;
};
export type ContextHistorySlice = {
  sourceIndex: number; leafIndex: number; position: number; startByte: number; endByte: number; text: string; usage: ContextHistoryUsage;
};
export type ContextHistorySearchResult = {
  matches: { sourceIndex: number; leafIndex: number; position: number; startByte: number; endByte: number }[];
  scannedBytes: number; complete: boolean; usage: ContextHistoryUsage;
};
export type ContextHistoryInspection = { history: ContextHistory; generation: Digest; usage: ContextHistoryUsage };
export type ContextHistoryExpansion = {
  node: Digest; start: number; end: number; items: ContextHistoryViewItem[]; usage: ContextHistoryUsage;
  status: "complete" | "incomplete"; reason: "missing-summary" | null;
};
export interface ContextHistoryReader {
  readonly ref: Readonly<ContextHistoryRef>;
  inspect(signal?: AbortSignal): Promise<ContextHistoryInspection>;
  overview(options?: ContextHistoryPageOptions, signal?: AbortSignal): Promise<ContextHistoryView>;
  expand(node: Digest, limits?: Partial<ContextHistoryReadLimits>, signal?: AbortSignal): Promise<ContextHistoryExpansion>;
  read(sourceIndex: number, limits?: Partial<ContextHistoryReadLimits>, signal?: AbortSignal): Promise<ContextHistoryRead>;
  slice(sourceIndex: number, startByte: number, endByte: number, limits?: Partial<ContextHistoryReadLimits>, signal?: AbortSignal): Promise<ContextHistorySlice>;
  search(options: AgentContextSearch, limits?: Partial<ContextHistoryReadLimits>, signal?: AbortSignal): Promise<ContextHistorySearchResult>;
  delegate(indices: readonly number[], limits?: Partial<ContextHistoryReadLimits>): Promise<ContextHistoryReader>;
}

type Selection = { recentLeaves: number; protectedIndices: number[]; relevance: { query: string; indices: number[] } | null };
type Catalog = {
  history: ContextHistory; id: Digest; nodes: Map<Digest, ContextHistoryNode>; leaves: Map<number, number>;
  selection: Selection; generation: ContextHistoryGeneration; summaries: Map<Digest, ContextHistorySummary>;
};
type Registered = { grant: ContextHistoryGrant; catalog: Catalog; parents: Set<CapabilityHandle>; revoked: boolean };
type SavedSelection = { ref: CapabilityHandle; binding: ContextHistoryViewBinding; request: Selection; requestDigest: Digest; current: Digest };
type Run = {
  ref: ContextHistoryRef; registered: Registered; targets: ContextHistoryNode[] | null;
  limits: ContextHistoryReadLimits; current: ContextHistoryCurrent; identity: Digest; generation: Digest;
  meter: Meter; exact: AgentContextReader | undefined; open: () => Promise<AgentContextReader>; signal: AbortSignal | undefined;
};
const ceilings: ContextHistoryReadLimits = { ...CONTEXT_HISTORY_READ_CEILINGS };
const fields = Object.keys(ceilings) as (keyof ContextHistoryReadLimits)[];
function denied(): never { throw new AlgalError("CAPABILITY_DENIED", "context history scope does not authorize this operation"); }
function invalid(message: string): never { throw new AlgalError("PARSE_FAILED", message); }
function exhausted(): never { throw new AlgalError("BUDGET_EXHAUSTED", "context history read exceeds its budget; request a smaller read or a new budget"); }
function hash(value: unknown): Digest { return digestCanonical(asJsonValue(value, "context history identity")); }
export function contextHistoryOutputBytes(value: unknown): number { return canonicalBytes(asJsonValue(value, "context history output")); }
function objectFields(value: unknown, allowed: readonly string[], required: readonly string[] = []): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) invalid("context history options must be an ordinary object");
  const result: Record<string, unknown> = {};
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== "string" || !allowed.includes(key)) invalid("context history options have an unknown field");
    const property = Object.getOwnPropertyDescriptor(value, key);
    if (!property || !Object.hasOwn(property, "value") || !property.enumerable) invalid("context history options require enumerable data properties");
    result[key] = property.value as unknown;
  }
  if (required.some(key => !Object.hasOwn(result, key))) invalid("context history options have a missing field");
  return result;
}
function array(value: unknown, max: number): unknown[] {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype || value.length > max || Reflect.ownKeys(value).length !== value.length + 1) invalid("context history inputs must be ordinary dense arrays");
  const result: unknown[] = [];
  for (let i = 0; i < value.length; i++) {
    const property = Object.getOwnPropertyDescriptor(value, i);
    if (!property || !Object.hasOwn(property, "value") || !property.enumerable) invalid("context history inputs require enumerable data properties");
    result.push(property.value as unknown);
  }
  return result;
}
function indices(value: unknown, count: number = B.maxLeaves, max: number = B.maxLeaves): number[] {
  const result = array(value, max).map(n => asInt(n, "context history snapshot index", 0, count - 1));
  if (result.some((n, i) => i > 0 && result[i - 1]! >= n)) invalid("context history indices must be unique and increasing");
  return result;
}
function text(value: unknown, max: number): string {
  if (typeof value !== "string" || value.length > max || /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u.test(value) || utf8Length(value) > max) invalid("context history text exceeds its UTF-8 bound or is invalid Unicode");
  return value;
}
function limits(value: unknown = {}, ceiling: ContextHistoryReadLimits = ceilings): ContextHistoryReadLimits {
  const raw = objectFields(value, fields);
  const result = { ...ceiling };
  for (const key of fields) if (Object.hasOwn(raw, key)) result[key] = asInt(raw[key], "context history read limit", 1, ceiling[key]);
  return result;
}
function sortedUnion(...lists: readonly number[][]): number[] { return [...new Set(lists.flat())].sort((a, b) => a - b); }

export function contextHistoryCover(count: number, recentLeaves = 4, detailedIndices: readonly number[] = []): ContextHistoryRange[] {
  const size = asInt(count, "context history leaf count", 0, B.maxLeaves);
  const recent = Math.min(size, asInt(recentLeaves, "context history recent leaf count", 0, B.maxLeaves));
  const detailed = new Set(indices(detailedIndices, size));
  const result: ContextHistoryRange[] = [];
  const visit = (start: number, end: number): void => {
    const length = end - start;
    let forced = false;
    for (let i = start; i < end; i++) if (detailed.has(i)) { forced = true; break; }
    if (length === 1 || (!forced && end <= size - recent && length <= size - end)) {
      result.push({ start, end });
      return;
    }
    const middle = (start + end) / 2;
    visit(start, middle); visit(middle, end);
  };
  let start = 0;
  for (let length = 2 ** B.maxTreeDepth; length >= 1; length /= 2) {
    if (start + length <= size) { visit(start, start + length); start += length; }
  }
  return result;
}

async function sourceProof(store: Store, history: ContextHistory, check: () => Promise<void> = async () => {}): Promise<void> {
  const get = async (id: Digest): Promise<JsonValue> => {
    await check();
    let value: JsonValue | undefined;
    try { value = await store.getValue(id); } finally { await check(); }
    if (value === undefined) throw new AlgalError("STORE_MISS", "context history original source unavailable");
    return value;
  };
  const snapshot = await get(history.snapshot);
  const originals: JsonValue[] = [];
  const seen = new Map<Digest, JsonValue>();
  for (const leaf of history.leaves) {
    let value = seen.get(leaf.entry);
    if (value === undefined) { value = await get(leaf.entry); seen.set(leaf.entry, value); }
    originals.push(value);
  }
  validateContextHistorySources(history, snapshot, originals);
}
export async function captureContextHistory(store: Store, input: unknown): Promise<ContextHistory> {
  const raw = asObject(boundedJsonSnapshot(input, {
    maxBytes: B.maxHistoryBytes, maxDepth: 4, maxNodes: B.maxJsonNodes, maxEntries: B.maxLeaves, maxStringBytes: 512,
  }, "context history capture"), "context history capture");
  noUnknownKeys(raw, ["scope", "head", "snapshot", "epoch", "firstPosition", "sources"], "context history capture");
  const base = parseContextHistory({ schema: "algal.context-history.v1", scope: raw.scope, head: raw.head, snapshot: raw.snapshot, epoch: raw.epoch, firstPosition: raw.firstPosition, leaves: [] });
  const sources = array(raw.sources, B.maxLeaves).map((value, i) => {
    const row = objectFields(value, ["sourceIndex", "position", "event"], ["sourceIndex", "position", "event"]);
    const position = asInt(row.position, "context history ordinal position", 0, B.maxPositions - 1);
    if (position !== base.firstPosition + i) invalid("context history capture requires explicit consecutive owner positions");
    return { sourceIndex: asInt(row.sourceIndex, "context history snapshot index", 0, B.maxLeaves - 1), position, event: asDigest(row.event, "context history source event") };
  });
  const selected = sources.map(row => row.sourceIndex).sort((a, b) => a - b);
  const exactHost = new AgentContextHost(store);
  const exact = exactHost.bind(await exactHost.grant(base.snapshot, selected));
  const inspection = await exact.inspect();
  const metadata = new Map(inspection.entries.map(row => [row.index, row]));
  const history = parseContextHistory({ ...base, leaves: sources.map(row => {
    const source = metadata.get(row.sourceIndex);
    if (!source) denied();
    return { ...row, entry: source.digest, bytes: source.bytes, kind: source.kind, label: source.label };
  }) });
  await sourceProof(store, history);
  return history;
}
function allNodes(history: ContextHistory, id: Digest): Map<Digest, ContextHistoryNode> {
  const nodes = new Map<Digest, ContextHistoryNode>();
  for (let length = 1; length <= history.leaves.length; length *= 2) {
    for (let start = 0; start + length <= history.leaves.length; start += length) {
      const node: ContextHistoryNode = {
        schema: "algal.context-history-node.v1", history: id, start, end: start + length,
        sources: hash({ schema: "algal.context-history-sources.v1", history: id, leaves: history.leaves.slice(start, start + length) }),
      };
      nodes.set(contextHistoryDigest(node), node);
    }
  }
  return nodes;
}
function derivatives(history: ContextHistory, input?: unknown): { generation: ContextHistoryGeneration; summaries: Map<Digest, ContextHistorySummary> } {
  const id = contextHistoryDigest(history);
  if (input === undefined) return {
    generation: parseContextHistoryGeneration({ schema: "algal.context-history-generation.v1", history: id, generation: 0,
      prompt: hash("algal.context-history.no-prompt.v1"), policy: hash("algal.context-history.recency-aligned.v1"),
      summarizer: hash("algal.context-history.no-summarizer.v1"), summaries: [] }), summaries: new Map(),
  };
  const raw = objectFields(input, ["generation", "nodes", "summaries"], ["generation", "nodes", "summaries"]);
  const generation = parseContextHistoryGeneration(raw.generation);
  const nodes = array(raw.nodes, B.maxTreeNodes).map(parseContextHistoryNode);
  const summaries = array(raw.summaries, B.maxInternalNodes).map(parseContextHistorySummary);
  validateContextHistoryGeneration(history, generation, nodes, summaries);
  return { generation, summaries: new Map(summaries.map(summary => [summary.node, summary])) };
}
function configuration(history: ContextHistory, input: unknown = {}): { selection: Selection; derivatives: ReturnType<typeof derivatives> } {
  const raw = objectFields(input, ["recentLeaves", "protectedIndices", "relevance", "derivatives"]);
  const catalog = new Set(history.leaves.map(leaf => leaf.sourceIndex));
  const picked = raw.protectedIndices === undefined ? [] : indices(raw.protectedIndices);
  let relevance: Selection["relevance"] = null;
  if (raw.relevance !== undefined) {
    const r = objectFields(raw.relevance, ["query", "indices"], ["query", "indices"]);
    const query = text(r.query, AGENT_CONTEXT_BOUNDS.maxQueryBytes);
    if (!query.length) invalid("context history relevance query must not be empty");
    relevance = { query, indices: indices(r.indices, B.maxLeaves, CONTEXT_HISTORY_READ_CEILINGS.maxSearchResults) };
  }
  if ([...picked, ...(relevance?.indices ?? [])].some(n => !catalog.has(n))) denied();
  const protectedIndices = sortedUnion(picked, history.leaves.filter(leaf => leaf.kind === "instruction").map(leaf => leaf.sourceIndex));
  return { selection: { recentLeaves: raw.recentLeaves === undefined ? 4 : asInt(raw.recentLeaves, "context history recent leaves", 0, B.maxLeaves), protectedIndices, relevance }, derivatives: derivatives(history, raw.derivatives) };
}
class BudgetStop extends Error { constructor(readonly reason: ContextHistoryBudgetReason) { super(reason); } }
class Cancelled extends Error {}
class Meter {
  readBytes = 0; scanBytes = 0; nodeVisits = 0; work = 0;
  constructor(readonly limits: ContextHistoryReadLimits) {}
  charge(work: number, scanBytes = 0, nodes = 0, readBytes = 0): void {
    if (this.work + work > this.limits.maxWork || this.nodeVisits + nodes > this.limits.maxNodes) throw new BudgetStop("work-limit");
    if (this.scanBytes + scanBytes > this.limits.maxScanBytes) throw new BudgetStop("scan-limit");
    if (this.readBytes + readBytes > this.limits.maxReadBytes) throw new BudgetStop("read-limit");
    this.work += work; this.scanBytes += scanBytes; this.nodeVisits += nodes; this.readBytes += readBytes;
  }
  usage(): ContextHistoryView["usage"] { return { readBytes: this.readBytes, scanBytes: this.scanBytes, nodeVisits: this.nodeVisits, work: this.work }; }
}
function cancel(signal: AbortSignal | undefined): void { if (signal?.aborted) throw new Cancelled(); }
function publicError(error: unknown): never {
  if (error instanceof BudgetStop) exhausted();
  if (error instanceof Cancelled) throw new AlgalError("EFFECT_FAILED", "context history read cancelled");
  throw error;
}

export class ContextHistoryHost {
  readonly #store: Store;
  readonly #principal: string;
  readonly #resolve: ContextHistoryResolver;
  readonly #catalogs = new Map<Digest, Catalog>();
  readonly #grants = new Map<CapabilityHandle, Registered>();
  readonly #revisions = new Map<Digest, number>();
  readonly #selections = new Map<Digest, SavedSelection>();
  readonly #cursors = new Set<Digest>();
  constructor(store: Store, options: { principal: string; resolveCurrent: ContextHistoryResolver }) {
    this.#store = store; this.#principal = applicationId(options.principal);
    if (typeof options.resolveCurrent !== "function") invalid("context history host requires a trusted current access resolver");
    this.#resolve = options.resolveCurrent;
  }
  #registered(input: unknown): { ref: ContextHistoryRef; value: Registered } {
    const ref = parseContextHistoryRef(input), value = this.#grants.get(ref.capability);
    if (!value || ref.history !== value.grant.history) denied();
    const seen = new Set<CapabilityHandle>();
    const check = (capability: CapabilityHandle): void => {
      if (seen.has(capability)) return;
      seen.add(capability);
      const registered = this.#grants.get(capability);
      if (!registered || registered.revoked) denied();
      for (const parent of registered.parents) check(parent);
    };
    check(ref.capability);
    return { ref, value };
  }
  #register(grant: ContextHistoryGrant, catalog: Catalog, parent?: CapabilityHandle): ContextHistoryRef {
    const ref = contextHistoryRef(grant), previous = this.#grants.get(ref.capability);
    if (previous) {
      this.#registered(ref);
      if (parent !== undefined && parent !== ref.capability) previous.parents.add(parent);
    } else {
      if (this.#grants.size >= AGENT_CONTEXT_BOUNDS.maxGrants) exhausted();
      this.#grants.set(ref.capability, { grant, catalog, parents: new Set(parent === undefined ? [] : [parent]), revoked: false });
    }
    return Object.freeze(ref);
  }
  #targets(catalog: Catalog, selected: readonly number[]): ContextHistoryNode[] {
    return selected.map(n => {
      const index = catalog.leaves.get(n);
      if (index === undefined) denied();
      return this.#node(catalog, index, index + 1);
    });
  }
  #node(catalog: Catalog, start: number, end: number): ContextHistoryNode {
    const node = contextHistoryNode(catalog.history, start, end);
    const checked = catalog.nodes.get(contextHistoryDigest(node));
    if (!checked) denied();
    return checked;
  }
  #lookup(catalog: Catalog, input: unknown): ContextHistoryNode {
    const id = asDigest(input, "context history node"), node = catalog.nodes.get(id);
    if (!node) denied();
    validateContextHistoryNode(catalog.history, node);
    return node;
  }
  async #current(catalog: Catalog, ref: ContextHistoryRef, grant: ContextHistoryGrant, targets: ContextHistoryNode[] | null): Promise<ContextHistoryCurrent> {
    const resolved = objectFields(await this.#resolve(parseContextHistory(catalog.history), this.#principal), ["access", "invalidated"], ["access", "invalidated"]);
    const access = parseContextHistoryAccess(resolved.access), invalidated = indices(resolved.invalidated);
    const current = { access, invalidated };
    if (access.history !== catalog.id || hash(access.scope) !== hash(catalog.history.scope) || access.head !== catalog.history.head || access.snapshot !== catalog.history.snapshot || ref.capability !== contextHistoryRef(grant).capability) denied();
    if (access.revision < (this.#revisions.get(catalog.id) ?? 0)) denied();
    if (!this.#revisions.has(catalog.id) && this.#revisions.size >= AGENT_CONTEXT_BOUNDS.maxGrants) exhausted();
    this.#revisions.set(catalog.id, access.revision);
    if (access.state === "revoked") {
      for (const value of this.#grants.values()) if (value.catalog.id === catalog.id) value.revoked = true;
      denied();
    }
    if (access.state !== "active" || invalidated.some(n => !catalog.leaves.has(n))) denied();
    if (targets === null) validateContextHistoryAccess(catalog.history, ref, grant, access);
    else if (targets.length) for (const node of targets) validateContextHistoryAccess(catalog.history, ref, grant, access, node);
    else if (grant.indices.length || grant.history !== catalog.id || hash(grant.scope) !== hash(catalog.history.scope)) denied();
    return current;
  }
  async #check(run: Run): Promise<void> {
    const { value } = this.#registered(run.ref);
    if (value !== run.registered || contextHistoryDigest(value.catalog.generation) !== run.generation) denied();
    const current = await this.#current(value.catalog, run.ref, value.grant, run.targets);
    this.#registered(run.ref);
    if (hash(current) !== run.identity) denied();
  }
  async admit(historyInput: unknown, configInput?: ContextHistoryConfiguration, selected?: readonly number[], requested?: Partial<ContextHistoryReadLimits>): Promise<ContextHistoryRef> {
    const history = parseContextHistory(historyInput), id = contextHistoryDigest(history);
    const existing = this.#catalogs.get(id);
    const config = configInput === undefined && existing ? { selection: existing.selection, derivatives: { generation: existing.generation, summaries: existing.summaries } } : configuration(history, configInput);
    if (existing && hash(config.selection) !== hash(existing.selection)) invalid("a captured history already has a different host selection");
    const catalog: Catalog = existing ?? {
      history, id, nodes: allNodes(history, id), leaves: new Map(history.leaves.map((leaf, i) => [leaf.sourceIndex, i])),
      selection: config.selection, ...config.derivatives,
    };
    const picked = selected === undefined ? history.leaves.map(leaf => leaf.sourceIndex).sort((a, b) => a - b) : indices(selected);
    if (picked.some(n => !catalog.leaves.has(n))) denied();
    const grant = parseContextHistoryGrant({ schema: "algal.context-history-grant.v1", history: id, scope: history.scope, indices: picked, limits: limits(requested) });
    const ref = contextHistoryRef(grant);
    if (this.#grants.has(ref.capability)) this.#registered(ref);
    const ownerGrant = { ...grant, indices: history.leaves.map(leaf => leaf.sourceIndex).sort((a, b) => a - b) };
    const ownerRef = contextHistoryRef(ownerGrant);
    const current = await this.#current(catalog, ownerRef, ownerGrant, null);
    const check = async (): Promise<void> => {
      if (this.#grants.has(ref.capability)) this.#registered(ref);
      if (hash(await this.#current(catalog, ownerRef, ownerGrant, null)) !== hash(current)) denied();
    };
    await sourceProof(this.#store, history, check);
    await check();
    if (!existing && this.#catalogs.size >= AGENT_CONTEXT_BOUNDS.maxGrants) exhausted();
    this.#catalogs.set(id, catalog);
    return this.#register(grant, catalog);
  }
  async capture(input: ContextHistoryCapture, configuration?: ContextHistoryConfiguration, requested?: Partial<ContextHistoryReadLimits>): Promise<ContextHistoryRef> {
    const captured = objectFields(configuration ?? {}, ["recentLeaves", "protectedIndices", "relevance", "derivatives"]);
    const copiedConfig = boundedJsonSnapshot(captured, { maxBytes: B.maxHistoryBytes * 32, maxDepth: 8, maxNodes: B.maxJsonNodes * 16, maxEntries: B.maxTreeNodes, maxStringBytes: B.maxSummaryBytes * 6 }, "context history configuration") as ContextHistoryConfiguration;
    const copiedLimits = limits(requested);
    return this.admit(await captureContextHistory(this.#store, input), copiedConfig, undefined, copiedLimits);
  }
  revoke(input: ContextHistoryRef): void {
    const ref = parseContextHistoryRef(input), registered = this.#grants.get(ref.capability);
    if (!registered || registered.grant.history !== ref.history) denied();
    registered.revoked = true;
    let changed = true;
    while (changed) {
      changed = false;
      for (const value of this.#grants.values()) if (!value.revoked && [...value.parents].some(parent => this.#grants.get(parent)?.revoked !== false)) {
        value.revoked = true; changed = true;
      }
    }
  }
  async useGeneration(input: ContextHistoryRef, derivativeInput: ContextHistoryDerivatives): Promise<void> {
    const { ref, value } = this.#registered(input);
    const checked = derivatives(value.catalog.history, derivativeInput);
    const current = await this.#current(value.catalog, ref, value.grant, null);
    this.#registered(ref);
    const again = await this.#current(value.catalog, ref, value.grant, null);
    this.#registered(ref);
    if (hash(current) !== hash(again)) denied();
    value.catalog.generation = checked.generation; value.catalog.summaries = checked.summaries;
  }
  async delegate(input: ContextHistoryRef, selected: readonly number[], requested?: Partial<ContextHistoryReadLimits>): Promise<ContextHistoryRef> {
    const { ref, value } = this.#registered(input);
    const grant = parseContextHistoryGrant({ ...value.grant, indices: indices(selected), limits: limits(requested, value.grant.limits) });
    validateContextHistoryDelegation(value.grant, grant);
    const targets = this.#targets(value.catalog, grant.indices);
    const before = await this.#current(value.catalog, ref, value.grant, targets);
    this.#registered(ref);
    const after = await this.#current(value.catalog, ref, value.grant, targets);
    this.#registered(ref);
    if (hash(before) !== hash(after)) denied();
    return this.#register(grant, value.catalog, ref.capability);
  }
  async #start(input: ContextHistoryRef, requested: unknown, target: "whole" | readonly number[] | Digest, signal: AbortSignal | undefined): Promise<Run> {
    const { ref, value } = this.#registered(input), bounded = limits(requested, value.grant.limits);
    const targets = target === "whole" ? null : typeof target === "string" ? [this.#lookup(value.catalog, target)] : this.#targets(value.catalog, target);
    const current = await this.#current(value.catalog, ref, value.grant, targets);
    this.#registered(ref);
    const meter = new Meter(bounded);
    const run: Run = { ref, registered: value, targets, limits: bounded, current, identity: hash(current), generation: contextHistoryDigest(value.catalog.generation), meter, exact: undefined, open: async () => denied(), signal };
    const cache = new Map<Digest, JsonValue | undefined>();
    const sourceBytes = new Map(value.catalog.history.leaves.map(leaf => [leaf.entry, leaf.bytes]));
    const getValue = async (id: Digest): Promise<JsonValue | undefined> => {
      await this.#check(run); cancel(signal);
      let record: JsonValue | undefined;
      const fresh = !cache.has(id), bytes = sourceBytes.get(id) ?? 0;
      if (fresh && bytes > bounded.maxScanBytes - meter.scanBytes) throw new BudgetStop("scan-limit");
      if (fresh) {
        try { record = await this.#store.getValue(id); } finally { await this.#check(run); }
        cancel(signal);
        if (record !== undefined) record = boundedJsonSnapshot(record, {
          maxBytes: id === value.catalog.history.snapshot ? 262144 : B.maxEntryBytes * 6 + 2048,
          maxDepth: 3, maxNodes: 4096, maxEntries: B.maxLeaves, maxStringBytes: B.maxEntryBytes * 6,
        }, "original context history source");
        cache.set(id, record);
      } else record = cache.get(id);
      meter.charge(record === undefined ? 1 : contextHistoryOutputBytes(record), fresh && record !== undefined ? bytes : 0);
      return record;
    };
    const blocked = async (): Promise<never> => denied();
    const store: Store = { getValue, putValue: blocked, getManifest: blocked, putManifest: blocked, getReceipt: blocked, putReceipt: blocked, getEffect: blocked, putEffect: blocked, getSlot: blocked, setSlot: blocked };
    run.open = async () => {
      cancel(signal);
      const exactHost = new AgentContextHost(store);
      const picked = targets === null ? value.grant.indices : sortedUnion(...targets.map(node => value.catalog.history.leaves.slice(node.start, node.end).map(leaf => leaf.sourceIndex)));
      return exactHost.bind(await exactHost.grant(value.catalog.history.snapshot, picked, {
        maxReadBytes: bounded.maxReadBytes, maxScanBytes: bounded.maxScanBytes, maxSearchResults: bounded.maxSearchResults,
      }));
    };
    await this.#check(run);
    return run;
  }
  async #exact(run: Run): Promise<AgentContextReader> {
    if (run.exact === undefined) run.exact = await run.open();
    return run.exact;
  }
  #finish<T extends { usage: ContextHistoryUsage }>(run: Run, output: T): T {
    const base = run.meter.work;
    let bytes = 0;
    for (let i = 0; i < 8; i++) {
      output.usage = { ...run.meter.usage(), work: base + bytes, outputBytes: bytes };
      const next = contextHistoryOutputBytes(output);
      if (next === bytes) {
        if (bytes > run.limits.maxOutputBytes || base + bytes > run.limits.maxWork) exhausted();
        return output;
      }
      bytes = next;
    }
    exhausted();
  }
  async #verify(run: Run, node: ContextHistoryNode): Promise<void> {
    const catalog = run.registered.catalog;
    validateContextHistoryNode(catalog.history, node);
    run.meter.charge(contextHistoryOutputBytes(node) + 1, 0, 1);
    const picked = catalog.history.leaves.slice(node.start, node.end).map(leaf => leaf.sourceIndex).sort((a, b) => a - b);
    const reader = await (await this.#exact(run)).delegate(picked);
    await reader.inspect();
    await this.#check(run); cancel(run.signal);
  }
  async #item(run: Run, node: ContextHistoryNode, exacts = new Map<number, AgentContextEntryInput>()): Promise<ContextHistoryViewItem> {
    const catalog = run.registered.catalog, id = contextHistoryDigest(node);
    const base = { node: id, start: node.start, end: node.end };
    if (node.end - node.start === 1) {
      run.meter.charge(contextHistoryOutputBytes(node) + 1, 0, 1);
      const leaf = catalog.history.leaves[node.start]!;
      let original = exacts.get(leaf.sourceIndex);
      if (!original) {
        if (leaf.bytes > run.limits.maxReadBytes - run.meter.readBytes) throw new BudgetStop("read-limit");
        original = await (await this.#exact(run)).read(leaf.sourceIndex);
        run.meter.charge(0, 0, 0, leaf.bytes);
        exacts.set(leaf.sourceIndex, original);
      }
      await this.#check(run); cancel(run.signal);
      return { ...base, kind: "exact", text: original.text };
    }
    await this.#verify(run, node);
    const summary = catalog.summaries.get(id);
    if (!summary || catalog.history.leaves.slice(node.start, node.end).some(leaf => run.current.invalidated.includes(leaf.sourceIndex))) return { ...base, kind: "pending", reason: "missing-summary" };
    run.meter.charge(contextHistoryOutputBytes(summary), 0, 0, utf8Length(summary.body));
    return { ...base, kind: "summary", summary: contextHistoryDigest(summary), text: summary.body };
  }
  async inspect(input: ContextHistoryRef, signal?: AbortSignal): Promise<ContextHistoryInspection> {
    try {
      const run = await this.#start(input, undefined, "whole", signal);
      cancel(signal); await (await this.#exact(run)).inspect(); await this.#check(run); cancel(signal);
      run.meter.charge(run.registered.catalog.history.leaves.length, 0, run.registered.catalog.history.leaves.length);
      return this.#finish(run, { history: parseContextHistory(run.registered.catalog.history), generation: run.generation, usage: { ...run.meter.usage(), outputBytes: 0 } });
    } catch (error) { return publicError(error); }
  }
  async read(input: ContextHistoryRef, sourceIndex: number, requested?: Partial<ContextHistoryReadLimits>, signal?: AbortSignal): Promise<ContextHistoryRead> {
    try {
      const picked = asInt(sourceIndex, "context history snapshot index", 0, B.maxLeaves - 1);
      const run = await this.#start(input, requested, [picked], signal); cancel(signal);
      const original = await (await this.#exact(run)).read(picked);
      await this.#check(run); cancel(signal);
      const leafIndex = run.registered.catalog.leaves.get(picked)!, leaf = run.registered.catalog.history.leaves[leafIndex]!;
      run.meter.charge(1, 0, 1, utf8Length(original.text));
      return this.#finish(run, { sourceIndex: picked, leafIndex, position: leaf.position, entry: leaf.entry, ...original, usage: { ...run.meter.usage(), outputBytes: 0 } });
    } catch (error) { return publicError(error); }
  }
  async slice(input: ContextHistoryRef, sourceIndex: number, startByte: number, endByte: number, requested?: Partial<ContextHistoryReadLimits>, signal?: AbortSignal): Promise<ContextHistorySlice> {
    try {
      const picked = asInt(sourceIndex, "context history snapshot index", 0, B.maxLeaves - 1);
      const start = asInt(startByte, "context history slice start", 0, B.maxEntryBytes), end = asInt(endByte, "context history slice end", start, B.maxEntryBytes);
      const run = await this.#start(input, requested, [picked], signal); cancel(signal);
      const body = await (await this.#exact(run)).slice(picked, start, end);
      await this.#check(run); cancel(signal);
      const leafIndex = run.registered.catalog.leaves.get(picked)!, leaf = run.registered.catalog.history.leaves[leafIndex]!;
      run.meter.charge(1, 0, 1, utf8Length(body));
      return this.#finish(run, { sourceIndex: picked, leafIndex, position: leaf.position, startByte: start, endByte: end, text: body, usage: { ...run.meter.usage(), outputBytes: 0 } });
    } catch (error) { return publicError(error); }
  }
  async search(input: ContextHistoryRef, options: AgentContextSearch, requested?: Partial<ContextHistoryReadLimits>, signal?: AbortSignal): Promise<ContextHistorySearchResult> {
    const raw = objectFields(options, ["query", "maxResults", "maxScanBytes"], ["query"]);
    const query = text(raw.query, AGENT_CONTEXT_BOUNDS.maxQueryBytes);
    if (!query.length) invalid("context history literal query must not be empty");
    const { value } = this.#registered(input);
    const requestedLimits = limits(requested, value.grant.limits);
    const opts = { query, maxResults: raw.maxResults === undefined ? requestedLimits.maxSearchResults : asInt(raw.maxResults, "context history search results", 1, requestedLimits.maxSearchResults), maxScanBytes: raw.maxScanBytes === undefined ? requestedLimits.maxScanBytes : asInt(raw.maxScanBytes, "context history search scan bytes", 1, requestedLimits.maxScanBytes) };
    try {
      const run = await this.#start(input, requestedLimits, value.grant.indices, signal); cancel(signal);
      const result = await (await this.#exact(run)).search(opts);
      await this.#check(run); cancel(signal);
      const matches = result.matches.map(match => {
        const leafIndex = run.registered.catalog.leaves.get(match.index)!;
        return { sourceIndex: match.index, leafIndex, position: run.registered.catalog.history.leaves[leafIndex]!.position, startByte: match.startByte, endByte: match.endByte };
      });
      run.meter.charge(matches.length + 1, 0, Math.max(1, value.grant.indices.length));
      return this.#finish(run, { matches, scannedBytes: result.scannedBytes, complete: result.complete, usage: { ...run.meter.usage(), outputBytes: 0 } });
    } catch (error) { return publicError(error); }
  }
  async expand(input: ContextHistoryRef, nodeInput: Digest, requested?: Partial<ContextHistoryReadLimits>, signal?: AbortSignal): Promise<ContextHistoryExpansion> {
    try {
      const nodeId = asDigest(nodeInput, "context history node");
      const run = await this.#start(input, requested, nodeId, signal); cancel(signal);
      const catalog = run.registered.catalog, node = this.#lookup(catalog, nodeId);
      const middle = (node.start + node.end) / 2;
      const children = node.end - node.start === 1 ? [node] : [this.#node(catalog, node.start, middle), this.#node(catalog, middle, node.end)];
      const items: ContextHistoryViewItem[] = [];
      for (const child of children) items.push(await this.#item(run, child));
      await this.#check(run); cancel(signal);
      const pending = items.some(item => item.kind === "pending");
      return this.#finish<ContextHistoryExpansion>(run, { node: nodeId, start: node.start, end: node.end, items, status: pending ? "incomplete" : "complete", reason: pending ? "missing-summary" : null, usage: { ...run.meter.usage(), outputBytes: 0 } });
    } catch (error) { return publicError(error); }
  }
  #binding(run: Run): ContextHistoryViewBinding {
    const catalog = run.registered.catalog;
    const requestDigest = hash({ schema: "algal.context-history-read-request.v1", principal: this.#principal,
      request: catalog.selection, current: run.identity, generation: run.generation, limits: run.limits });
    const selection = contextHistorySelection(run.registered.grant, run.current.access, requestDigest);
    const binding = { history: catalog.id, head: catalog.history.head, audience: catalog.history.scope.audience, generation: run.generation, policy: catalog.generation.policy, budget: hash(run.limits), selection };
    if (!this.#selections.has(selection)) {
      if (this.#selections.size >= AGENT_CONTEXT_BOUNDS.maxGrants) exhausted();
      this.#selections.set(selection, { ref: run.ref.capability, binding, request: structuredClone(catalog.selection), requestDigest, current: run.identity });
    }
    return binding;
  }
  #cursor(binding: ContextHistoryViewBinding, offset: number): ContextHistoryCursor {
    const cursor = parseContextHistoryCursor({ schema: "algal.context-history-cursor.v1", binding, offset });
    const id = contextHistoryDigest(cursor);
    if (!this.#cursors.has(id)) {
      if (this.#cursors.size >= AGENT_CONTEXT_BOUNDS.maxGrants) exhausted();
      this.#cursors.add(id);
    }
    return cursor;
  }
  #page(run: Run, binding: ContextHistoryViewBinding, start: number, items: ContextHistoryViewItem[], status: ContextHistoryView["status"], reason: ContextHistoryView["reason"]): ContextHistoryView {
    const end = items.at(-1)?.end ?? start;
    const cursor = status === "complete" || status === "unavailable" || end === run.registered.catalog.history.leaves.length ? null : { schema: "algal.context-history-cursor.v1" as const, binding, offset: end };
    const base = { schema: "algal.context-history-view.v1" as const, binding, limits: run.limits, start, end, items, usage: run.meter.usage() };
    const page = { ...base, status, reason, cursor } as ContextHistoryView;
    let bytes = contextHistoryOutputBytes(page);
    for (let i = 0; i < 8; i++) {
      page.usage.work = run.meter.work + bytes;
      const next = contextHistoryOutputBytes(page);
      if (bytes === next) break;
      bytes = next;
    }
    if (bytes > run.limits.maxOutputBytes || page.usage.work > run.limits.maxWork) throw new BudgetStop(bytes > run.limits.maxOutputBytes ? "output-limit" : "work-limit");
    return parseContextHistoryView(page);
  }
  async overview(input: ContextHistoryRef, options: ContextHistoryPageOptions = {}, signal?: AbortSignal): Promise<ContextHistoryView> {
    const raw = objectFields(options, ["limits", "cursor"]);
    const { value } = this.#registered(input);
    const requested = limits(raw.limits, value.grant.limits), cursor = raw.cursor === undefined ? undefined : parseContextHistoryCursor(raw.cursor);
    let run: Run;
    try { run = await this.#start(input, requested, "whole", signal); } catch (error) { return publicError(error); }
    const catalog = run.registered.catalog, binding = this.#binding(run);
    if (cursor && (!this.#cursors.has(contextHistoryDigest(cursor)) || hash(cursor.binding) !== hash(binding))) denied();
    const start = cursor?.offset ?? 0;
    const detailed = sortedUnion(catalog.selection.protectedIndices, catalog.selection.relevance?.indices ?? []).map(index => catalog.leaves.get(index)!).sort((a, b) => a - b);
    const cover = contextHistoryCover(catalog.history.leaves.length, catalog.selection.recentLeaves, detailed);
    if (start !== catalog.history.leaves.length && !cover.some(range => range.start === start)) denied();
    const items: ContextHistoryViewItem[] = [], exacts = new Map<number, AgentContextEntryInput>();
    const protectedLeaves = catalog.selection.protectedIndices.map(index => catalog.leaves.get(index)!).filter(index => index >= start);
    let status: ContextHistoryView["status"] = "complete", reason: ContextHistoryView["reason"] = null;
    try {
      cancel(signal);
      await this.#exact(run);
      run.meter.charge(cover.length + catalog.history.leaves.length);
      if (protectedLeaves.length > B.maxViewItems || protectedLeaves.reduce((sum, index) => sum + catalog.history.leaves[index]!.bytes, 0) > run.limits.maxReadBytes) throw new BudgetStop("protected-overflow");
      const recentStart = Math.max(start, catalog.history.leaves.length - catalog.selection.recentLeaves);
      const reserve = sortedUnion(protectedLeaves, Array.from({ length: catalog.history.leaves.length - recentStart }, (_, i) => recentStart + i));
      for (const index of reserve) {
        const leaf = catalog.history.leaves[index]!;
        if (leaf.bytes > run.limits.maxReadBytes - run.meter.readBytes) throw new BudgetStop(protectedLeaves.includes(index) ? "protected-overflow" : "read-limit");
        const entry = await (await this.#exact(run)).read(leaf.sourceIndex);
        run.meter.charge(0, 0, 0, leaf.bytes);
        exacts.set(leaf.sourceIndex, entry);
      }
      for (const range of cover) {
        if (range.start < start) continue;
        if (items.length >= B.maxViewItems) { status = "incomplete"; reason = "page-limit"; break; }
        const item = await this.#item(run, this.#node(catalog, range.start, range.end), exacts);
        const trial = [...items, item];
        this.#page(run, binding, start, trial, trial.at(-1)!.end === catalog.history.leaves.length && trial.every(row => row.kind !== "pending") ? "complete" : "incomplete", trial.some(row => row.kind === "pending") ? "missing-summary" : trial.at(-1)!.end === catalog.history.leaves.length ? null : "page-limit");
        items.push(item);
      }
      if (reason === null && items.some(item => item.kind === "pending")) { status = "incomplete"; reason = "missing-summary"; }
    } catch (error) {
      if (error instanceof Cancelled) { status = "incomplete"; reason = "cancelled"; items.length = 0; }
      else if (error instanceof BudgetStop) { status = "budget-exhausted"; reason = error.reason; }
      else if (error instanceof AlgalError && error.code === "STORE_MISS") { status = "unavailable"; reason = "source-unavailable"; items.length = 0; }
      else return publicError(error);
    }
    if (status !== "unavailable" && reason !== "cancelled" && protectedLeaves.some(index => !items.some(item => item.kind === "exact" && item.start === index))) {
      status = "budget-exhausted"; reason = "protected-overflow"; items.length = 0;
    }
    if (reason === "protected-overflow") items.length = 0;
    await this.#check(run);
    let page: ContextHistoryView;
    try { page = this.#page(run, binding, start, items, status, reason); } catch (error) {
      if (!(error instanceof BudgetStop)) return publicError(error);
      try { page = this.#page(run, binding, start, [], "budget-exhausted", error.reason); } catch { exhausted(); }
    }
    if (page.cursor) this.#cursor(binding, page.cursor.offset);
    validateContextHistoryViewAccess(catalog.history, catalog.generation, page, [...catalog.nodes.values()], [...catalog.summaries.values()], {
      reference: run.ref, grant: run.registered.grant, access: run.current.access,
      request: this.#selections.get(binding.selection)!.requestDigest,
    }, cursor);
    return page;
  }
  async validateView(input: ContextHistoryRef, viewInput: unknown, cursorInput?: unknown): Promise<void> {
    try {
      const { ref, value } = this.#registered(input);
      const view = parseContextHistoryView(viewInput), selection = this.#selections.get(view.binding.selection);
      if (!selection || selection.ref !== ref.capability || hash(selection.binding) !== hash(view.binding) || hash(selection.request) !== hash(value.catalog.selection)) denied();
      if (cursorInput !== undefined && !this.#cursors.has(contextHistoryDigest(parseContextHistoryCursor(cursorInput)))) denied();
      const current = await this.#current(value.catalog, ref, value.grant, null);
      this.#registered(ref);
      if (hash(current) !== selection.current || contextHistoryDigest(value.catalog.generation) !== view.binding.generation) denied();
      validateContextHistoryDelegation(value.grant, { ...value.grant, limits: view.limits });
      for (const item of view.items) {
        const node = this.#lookup(value.catalog, item.node);
        validateContextHistoryAccess(value.catalog.history, ref, value.grant, current.access, node);
        if (item.kind === "summary" && value.catalog.history.leaves.slice(node.start, node.end).some(leaf => current.invalidated.includes(leaf.sourceIndex))) denied();
      }
      validateContextHistoryViewAccess(value.catalog.history, value.catalog.generation, view, [...value.catalog.nodes.values()], [...value.catalog.summaries.values()], {
        reference: ref, grant: value.grant, access: current.access, request: selection.requestDigest,
      }, cursorInput);
      const run = await this.#start(ref, view.limits, "whole", undefined);
      if (run.identity !== selection.current) denied();
      await this.#exact(run);
      for (const item of view.items) await this.#verify(run, this.#lookup(value.catalog, item.node));
      await this.#check(run);
    } catch (error) { return publicError(error); }
  }
  bind(input: ContextHistoryRef): ContextHistoryReader {
    const { ref } = this.#registered(input), fixed = Object.freeze(ref);
    return Object.freeze({
      ref: fixed,
      inspect: (signal?: AbortSignal) => this.inspect(fixed, signal),
      overview: (options?: ContextHistoryPageOptions, signal?: AbortSignal) => this.overview(fixed, options, signal),
      expand: (node: Digest, limits?: Partial<ContextHistoryReadLimits>, signal?: AbortSignal) => this.expand(fixed, node, limits, signal),
      read: (index: number, limits?: Partial<ContextHistoryReadLimits>, signal?: AbortSignal) => this.read(fixed, index, limits, signal),
      slice: (index: number, start: number, end: number, limits?: Partial<ContextHistoryReadLimits>, signal?: AbortSignal) => this.slice(fixed, index, start, end, limits, signal),
      search: (options: AgentContextSearch, limits?: Partial<ContextHistoryReadLimits>, signal?: AbortSignal) => this.search(fixed, options, limits, signal),
      delegate: async (indices: readonly number[], limits?: Partial<ContextHistoryReadLimits>) => this.bind(await this.delegate(fixed, indices, limits)),
    });
  }
}
