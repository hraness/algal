/** Immutable exact context in the CAS. Content identity never grants permission.
 * Keep AgentContextHost in trusted host code; expose only a bound reader/tools. */
import { capabilityHandle, parseCapabilityHandle, type CapabilityHandle } from "./capabilities";
import { asDigest, digestCanonical, type Digest } from "./digest";
import { AlgalError } from "./errors";
import { boundedJsonSnapshot } from "./json-snapshot";
import type { Store } from "./store-contract";
import { asInt, asObject, noUnknownKeys } from "./values";

export const AGENT_CONTEXT_BOUNDS = {
  maxEntries: 1024, maxEntryBytes: 1_048_576, maxTotalBytes: 8_388_608,
  maxLabelBytes: 128, maxReadBytes: 65_536, maxSearchResults: 128,
  maxQueryBytes: 4096, maxGrants: 256,
} as const;
export type AgentContextKind = "instruction" | "input" | "observation" | "output";
export interface AgentContextEntryInput { kind: AgentContextKind; label: string; text: string }
export interface AgentContextLimits { maxReadBytes: number; maxScanBytes: number; maxSearchResults: number }
export interface AgentContextRef {
  schema: "algal.agent-context-ref.v1"; snapshot: Digest; capability: CapabilityHandle;
}
export interface AgentContextSearch {
  query: string; maxResults?: number; maxScanBytes?: number;
}
export interface AgentContextSearchResult {
  matches: { index: number; startByte: number; endByte: number }[];
  scannedBytes: number; complete: boolean;
}
export interface AgentContextInspection {
  snapshot: Digest;
  entries: { index: number; digest: Digest; kind: AgentContextKind; label: string; bytes: number }[];
}
export interface AgentContextReader {
  readonly ref: Readonly<AgentContextRef>;
  inspect(): Promise<AgentContextInspection>;
  read(index: number): Promise<AgentContextEntryInput>;
  slice(index: number, startByte: number, endByte: number): Promise<string>;
  search(options: AgentContextSearch): Promise<AgentContextSearchResult>;
  delegate(indices: readonly number[], limits?: Partial<AgentContextLimits>): Promise<AgentContextReader>;
}
interface Snapshot {
  schema: "algal.agent-context.v1";
  entries: { digest: Digest; bytes: number }[];
}
interface Grant { snapshot: Digest; indices: number[]; limits: AgentContextLimits }
const encoder = new TextEncoder();
const defaults: AgentContextLimits = {
  maxReadBytes: AGENT_CONTEXT_BOUNDS.maxReadBytes,
  maxScanBytes: AGENT_CONTEXT_BOUNDS.maxTotalBytes,
  maxSearchResults: AGENT_CONTEXT_BOUNDS.maxSearchResults,
};
function denied(): never { throw new AlgalError("CAPABILITY_DENIED", "agent context scope does not authorize this operation"); }
function text(value: unknown, max: number, what: string): string {
  // Reject lone UTF-16 surrogates: Rust strings and UTF-8 cannot preserve them.
  if (typeof value !== "string" || value.length > max || /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u.test(value) || encoder.encode(value).length > max) {
    throw new AlgalError("PARSE_FAILED", `${what} exceeds its UTF-8 bound or is invalid Unicode`);
  }
  return value;
}
function entry(value: unknown, stored = false): AgentContextEntryInput {
  // Screen string lengths without invoking getters before the escaped-JSON
  // budget walk (which must allow six bytes for each literal control byte).
  if (value !== null && typeof value === "object") {
    for (const [key, max] of [["text", AGENT_CONTEXT_BOUNDS.maxEntryBytes], ["label", AGENT_CONTEXT_BOUNDS.maxLabelBytes]] as const) {
      const property = Object.getOwnPropertyDescriptor(value, key);
      if (property && Object.hasOwn(property, "value") && typeof property.value === "string" && property.value.length > max)
        throw new AlgalError("PARSE_FAILED", `entry ${key} exceeds its UTF-8 bound`);
    }
  }
  const obj = asObject(boundedJsonSnapshot(value, { maxBytes: AGENT_CONTEXT_BOUNDS.maxEntryBytes * 6 + 2048,
    maxDepth: 1, maxNodes: 5, maxEntries: 4, maxStringBytes: AGENT_CONTEXT_BOUNDS.maxEntryBytes * 6 }, "agent context entry"), "agent context entry");
  noUnknownKeys(obj, stored ? ["schema", "kind", "label", "text"] : ["kind", "label", "text"], "agent context entry");
  if (stored && obj.schema !== "algal.agent-context-entry.v1") throw new AlgalError("PARSE_FAILED", "invalid agent context entry schema");
  if (!["instruction", "input", "observation", "output"].includes(obj.kind as string)) throw new AlgalError("PARSE_FAILED", "invalid agent context entry kind");
  return { kind: obj.kind as AgentContextKind, label: text(obj.label, AGENT_CONTEXT_BOUNDS.maxLabelBytes, "entry label"), text: text(obj.text, AGENT_CONTEXT_BOUNDS.maxEntryBytes, "entry text") };
}
function snapshot(value: unknown): Snapshot {
  const obj = asObject(boundedJsonSnapshot(value, { maxBytes: 262_144, maxDepth: 3,
    maxNodes: 4096, maxEntries: AGENT_CONTEXT_BOUNDS.maxEntries, maxStringBytes: 100 }, "agent context snapshot"), "agent context snapshot");
  noUnknownKeys(obj, ["schema", "entries"], "agent context snapshot");
  if (obj.schema !== "algal.agent-context.v1" || !Array.isArray(obj.entries) || obj.entries.length > AGENT_CONTEXT_BOUNDS.maxEntries) throw new AlgalError("PARSE_FAILED", "invalid agent context snapshot");
  let total = 0;
  const entries = obj.entries.map((item) => {
    const row = asObject(item, "agent context source");
    noUnknownKeys(row, ["digest", "bytes"], "agent context source");
    const bytes = asInt(row.bytes, "source bytes", 0, AGENT_CONTEXT_BOUNDS.maxEntryBytes);
    total += bytes;
    return { digest: asDigest(row.digest, "source digest"), bytes };
  });
  if (total > AGENT_CONTEXT_BOUNDS.maxTotalBytes) throw new AlgalError("BUDGET_EXHAUSTED", "agent context source byte bound exceeded");
  return { schema: "algal.agent-context.v1", entries };
}
export function parseAgentContextRef(value: unknown): AgentContextRef {
  const obj = asObject(boundedJsonSnapshot(value, { maxBytes: 512, maxDepth: 1, maxNodes: 4,
    maxEntries: 3, maxStringBytes: 128 }, "agent context reference"), "agent context reference");
  noUnknownKeys(obj, ["schema", "snapshot", "capability"], "agent context reference");
  if (obj.schema !== "algal.agent-context-ref.v1") throw new AlgalError("PARSE_FAILED", "invalid agent context reference schema");
  return { schema: "algal.agent-context-ref.v1", snapshot: asDigest(obj.snapshot, "context snapshot"), capability: parseCapabilityHandle(obj.capability, "agent-context").handle };
}
function limits(value: unknown = {}, ceiling: AgentContextLimits = defaults): AgentContextLimits {
  const obj = asObject(boundedJsonSnapshot(value, { maxBytes: 256, maxDepth: 1, maxNodes: 4,
    maxEntries: 3, maxStringBytes: 32 }, "agent context limits"), "agent context limits");
  noUnknownKeys(obj, ["maxReadBytes", "maxScanBytes", "maxSearchResults"], "agent context limits");
  return {
    maxReadBytes: asInt(obj.maxReadBytes === undefined ? ceiling.maxReadBytes : obj.maxReadBytes, "read byte limit", 1, ceiling.maxReadBytes),
    maxScanBytes: asInt(obj.maxScanBytes === undefined ? ceiling.maxScanBytes : obj.maxScanBytes, "scan byte limit", 1, ceiling.maxScanBytes),
    maxSearchResults: asInt(obj.maxSearchResults === undefined ? ceiling.maxSearchResults : obj.maxSearchResults, "search result limit", 1, ceiling.maxSearchResults),
  };
}
function indices(value: unknown, count: number): number[] {
  const checked = boundedJsonSnapshot(value, { maxBytes: 8192, maxDepth: 1, maxNodes: 1025,
    maxEntries: AGENT_CONTEXT_BOUNDS.maxEntries, maxStringBytes: 0 }, "context indices");
  if (!Array.isArray(checked)) throw new AlgalError("PARSE_FAILED", "invalid context indices");
  let previous = -1;
  return checked.map((item) => {
    const index = asInt(item, "context index", 0, count - 1);
    if (index <= previous) throw new AlgalError("PARSE_FAILED", "context indices must be unique and increasing");
    previous = index;
    return index;
  });
}
async function loadSnapshot(store: Store, id: Digest): Promise<Snapshot> {
  const value = await store.getValue(id);
  if (value === undefined) throw new AlgalError("STORE_MISS", "agent context snapshot unavailable");
  const parsed = snapshot(value);
  if (digestCanonical(value) !== id) throw new AlgalError("DIGEST_MISMATCH", "agent context snapshot was changed");
  return parsed;
}
async function loadEntry(store: Store, source: Snapshot["entries"][number]): Promise<AgentContextEntryInput> {
  const value = await store.getValue(source.digest);
  if (value === undefined) throw new AlgalError("STORE_MISS", "agent context source unavailable");
  const parsed = entry(value, true);
  if (digestCanonical(value) !== source.digest || encoder.encode(parsed.text).length !== source.bytes) throw new AlgalError("DIGEST_MISMATCH", "agent context source was changed");
  return parsed;
}
/** Captures exact strings before the first await. Appending or projecting creates
 * another snapshot; it never modifies or removes the previous source records. */
export async function putAgentContext(store: Store, values: readonly AgentContextEntryInput[]): Promise<Digest> {
  if (!Array.isArray(values) || values.length > AGENT_CONTEXT_BOUNDS.maxEntries) throw new AlgalError("PARSE_FAILED", "invalid context entry count");
  if (Object.getPrototypeOf(values) !== Array.prototype || Reflect.ownKeys(values).length !== values.length + 1)
    throw new AlgalError("PARSE_FAILED", "context entries must be an ordinary dense array without extra properties");
  const checked: AgentContextEntryInput[] = [];
  const lengths: number[] = [];
  let total = 0;
  for (let index = 0; index < values.length; index++) {
    const property = Object.getOwnPropertyDescriptor(values, index);
    if (!property || !Object.hasOwn(property, "value") || !property.enumerable)
      throw new AlgalError("PARSE_FAILED", "context entries must contain enumerable data properties");
    const captured = entry(property.value);
    const bytes = encoder.encode(captured.text).length;
    total += bytes;
    if (total > AGENT_CONTEXT_BOUNDS.maxTotalBytes) throw new AlgalError("BUDGET_EXHAUSTED", "agent context source byte bound exceeded");
    checked.push(captured);
    lengths.push(bytes);
  }
  const entries: Snapshot["entries"] = [];
  for (const [index, value] of checked.entries()) {
    const record = { schema: "algal.agent-context-entry.v1", ...value };
    const id = await store.putValue(record);
    if (id !== digestCanonical(record)) throw new AlgalError("DIGEST_MISMATCH", "store returned incorrect context source identity");
    entries.push({ digest: id, bytes: lengths[index]! });
  }
  const record = { schema: "algal.agent-context.v1", entries };
  const id = await store.putValue(record);
  if (id !== digestCanonical(record)) throw new AlgalError("DIGEST_MISMATCH", "store returned incorrect context snapshot identity");
  return id;
}

/** Trusted, per-principal permission registry. Handles are identifiers, not
 * secrets. Never share this host across mutually untrusted principals. Serialized
 * refs must be matched to host policy again when restoring a process. */
export class AgentContextHost {
  readonly #store: Store;
  readonly #grants = new Map<CapabilityHandle, Grant>();
  constructor(store: Store) { this.#store = store; }
  #grant(ref: unknown): Grant {
    const checked = parseAgentContextRef(ref);
    const grant = this.#grants.get(checked.capability);
    if (!grant || grant.snapshot !== checked.snapshot) denied();
    return grant;
  }
  #register(grant: Grant): AgentContextRef {
    const capability = capabilityHandle("agent-context", { schema: "algal.agent-context-grant.v1", snapshot: grant.snapshot, indices: grant.indices, limits: { ...grant.limits } });
    if (!this.#grants.has(capability) && this.#grants.size >= AGENT_CONTEXT_BOUNDS.maxGrants) throw new AlgalError("BUDGET_EXHAUSTED", "agent context grant bound exceeded");
    this.#grants.set(capability, grant);
    return Object.freeze({ schema: "algal.agent-context-ref.v1", snapshot: grant.snapshot, capability });
  }
  /** Host-only admission. A digest is checked here only because the caller is trusted. */
  async grant(source: Digest, selected?: readonly number[], requested?: Partial<AgentContextLimits>): Promise<AgentContextRef> {
    const id = asDigest(source, "context snapshot");
    // Capture caller-owned options before crossing an asynchronous boundary.
    const picked = selected === undefined ? undefined : indices(selected, AGENT_CONTEXT_BOUNDS.maxEntries);
    const bounded = limits(requested);
    const record = await loadSnapshot(this.#store, id);
    return this.#register({ snapshot: id, indices: indices(picked ?? record.entries.map((_, i) => i), record.entries.length), limits: bounded });
  }
  async delegate(ref: AgentContextRef, selected: readonly number[], requested?: Partial<AgentContextLimits>): Promise<AgentContextRef> {
    const parent = this.#grant(ref);
    const picked = indices(selected, AGENT_CONTEXT_BOUNDS.maxEntries);
    if (picked.some((index) => !parent.indices.includes(index))) denied();
    const bounded = limits(requested, parent.limits);
    await loadSnapshot(this.#store, parent.snapshot);
    return this.#register({ snapshot: parent.snapshot, indices: picked, limits: bounded });
  }
  async #source(ref: AgentContextRef, index: number) {
    const grant = this.#grant(ref);
    if (!Number.isInteger(index) || !grant.indices.includes(index)) denied();
    const record = await loadSnapshot(this.#store, grant.snapshot);
    return { grant, source: record.entries[index]!, value: await loadEntry(this.#store, record.entries[index]!) };
  }
  async inspect(ref: AgentContextRef): Promise<AgentContextInspection> {
    const grant = this.#grant(ref);
    const record = await loadSnapshot(this.#store, grant.snapshot);
    const entries: AgentContextInspection["entries"] = [];
    for (const index of grant.indices) {
      const source = record.entries[index]!;
      const value = await loadEntry(this.#store, source);
      entries.push({ index, digest: source.digest, kind: value.kind, label: value.label, bytes: source.bytes });
    }
    return { snapshot: grant.snapshot, entries };
  }
  async read(ref: AgentContextRef, index: number): Promise<AgentContextEntryInput> {
    const { grant, source, value } = await this.#source(ref, index);
    if (source.bytes > grant.limits.maxReadBytes) throw new AlgalError("BUDGET_EXHAUSTED", "context read exceeds byte limit; use slice");
    return value;
  }
  async slice(ref: AgentContextRef, index: number, startByte: number, endByte: number): Promise<string> {
    const { grant, source, value } = await this.#source(ref, index);
    const start = asInt(startByte, "slice start", 0, source.bytes);
    const end = asInt(endByte, "slice end", start, source.bytes);
    if (end - start > grant.limits.maxReadBytes) throw new AlgalError("BUDGET_EXHAUSTED", "context slice exceeds byte limit");
    const bytes = encoder.encode(value.text);
    if ((start < bytes.length && (bytes[start]! & 0xc0) === 0x80) || (end < bytes.length && (bytes[end]! & 0xc0) === 0x80)) throw new AlgalError("PARSE_FAILED", "context slice must use UTF-8 boundaries");
    // ignoreBOM retains a literal initial U+FEFF rather than silently removing it.
    return new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes.subarray(start, end));
  }
  async search(ref: AgentContextRef, options: AgentContextSearch): Promise<AgentContextSearchResult> {
    const grant = this.#grant(ref);
    const obj = asObject(boundedJsonSnapshot(options, { maxBytes: AGENT_CONTEXT_BOUNDS.maxQueryBytes * 6 + 256,
      maxDepth: 1, maxNodes: 4, maxEntries: 3, maxStringBytes: AGENT_CONTEXT_BOUNDS.maxQueryBytes * 6 }, "context search"), "context search");
    noUnknownKeys(obj, ["query", "maxResults", "maxScanBytes"], "context search");
    const query = text(obj.query, AGENT_CONTEXT_BOUNDS.maxQueryBytes, "context search query");
    if (query.length === 0) throw new AlgalError("PARSE_FAILED", "context search query must not be empty");
    const resultLimit = asInt(obj.maxResults === undefined ? grant.limits.maxSearchResults : obj.maxResults, "result limit", 1, grant.limits.maxSearchResults);
    const scanLimit = asInt(obj.maxScanBytes === undefined ? grant.limits.maxScanBytes : obj.maxScanBytes, "scan limit", 1, grant.limits.maxScanBytes);
    const record = await loadSnapshot(this.#store, grant.snapshot);
    const result: AgentContextSearchResult = { matches: [], scannedBytes: 0, complete: true };
    const queryBytes = encoder.encode(query).length;
    for (const index of grant.indices) {
      const source = record.entries[index]!;
      if (source.bytes > scanLimit - result.scannedBytes) { result.complete = false; break; }
      const value = await loadEntry(this.#store, source);
      result.scannedBytes += source.bytes;
      let position = 0;
      for (;;) {
        const found = value.text.indexOf(query, position);
        if (found < 0) break;
        const startByte = encoder.encode(value.text.slice(0, found)).length;
        result.matches.push({ index, startByte, endByte: startByte + queryBytes });
        if (result.matches.length >= resultLimit) { result.complete = false; return result; }
        position = found + query.length;
      }
    }
    return result;
  }
  /** Safe host API to pass to an adapter; the Store and grant method stay private. */
  bind(ref: AgentContextRef): AgentContextReader {
    this.#grant(ref);
    const fixed = Object.freeze(parseAgentContextRef(ref));
    return Object.freeze({
      ref: fixed,
      inspect: () => this.inspect(fixed),
      read: (index: number) => this.read(fixed, index),
      slice: (index: number, start: number, end: number) => this.slice(fixed, index, start, end),
      search: (options: AgentContextSearch) => this.search(fixed, options),
      delegate: async (selected: readonly number[], requested?: Partial<AgentContextLimits>) => this.bind(await this.delegate(fixed, selected, requested)),
    });
  }
}
