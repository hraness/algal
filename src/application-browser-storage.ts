/// <reference lib="dom" />
/// <reference lib="dom.asynciterable" />
/** IndexedDB custody for a bounded browser application. Every resolved write
 * observes transaction completion with the strict durability hint. Browser
 * eviction, user-cleared site data and device loss still require an export.
 * No lifecycle callback is enclosed in an IndexedDB transaction. */
import { APPLICATION_LIMITS, applicationId, applicationJson, applicationObject, applicationRef } from "./application-contract";
import type { ApplicationStorage } from "./application-storage";
import { manifestToJson, parseOrganismManifest } from "./contract";
import { asDigest, digestCanonical, digestText, type Digest } from "./digest";
import { parseEffectReceipt, type EffectReceipt } from "./effects";
import { AlgalError } from "./errors";
import type { Store } from "./store-contract";
import { effectKey } from "./store-memory";
import { utf8Length } from "./utf8";
import { canonicalize, type JsonValue } from "./values";

export const BROWSER_STORAGE_LIMITS = Object.freeze({
  applications: 8, rows: 8192, recordBytes: 262_144, totalBytes: 16_777_216,
  applicationReservationBytes: 4_194_304, totalReservationBytes: 16_777_216,
  rawExportBytes: 33_554_432,
});
const DEFAULT_NAME = "algal.application.browser.v1";
const ROWS = "rows", META = "metadata", META_KEY = "allocation";
type Allocation = { contract: "algal.browser-allocation.v1"; rows: number; bytes: number; charges: Record<string, number> };
type Envelope = { contract: "algal.browser-row.v1"; json: string; digest: Digest };
type Snapshot = { keys: IDBValidKey[]; values: unknown[]; metadataKeys: IDBValidKey[]; metadataValues: unknown[] };

function fail(message: string): never { throw new AlgalError("IO_FAILED", `Browser storage: ${message}; retained data was not reset`); }
function budget(message: string): never { throw new AlgalError("BUDGET_EXHAUSTED", `Browser storage: ${message}`); }
function nameOf(options: { name?: string }): string {
  if (!options || typeof options !== "object" || Object.keys(options).some(key => key !== "name")) throw new Error("Invalid browser storage options");
  const name = options.name ?? DEFAULT_NAME;
  if (typeof name !== "string" || !/^[a-z][a-z0-9._-]{0,95}$/.test(name)) throw new Error("Invalid browser database name");
  return name;
}
function browser(): { factory: IDBFactory; locks: LockManager } {
  const factory = globalThis.indexedDB, locks = globalThis.navigator?.locks;
  if (!factory || !locks || typeof locks.request !== "function") fail("IndexedDB and Web Locks are required on a secure origin");
  return { factory, locks };
}
function io(error: unknown): Error {
  if (error instanceof AlgalError) return error;
  if (error instanceof Error && error.name === "QuotaExceededError") return new AlgalError("BUDGET_EXHAUSTED", "Browser storage quota exceeded; retained data was not reset");
  return new AlgalError("IO_FAILED", "Browser storage transaction failed; retained data was not reset");
}
function request<T>(value: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    value.onsuccess = () => resolve(value.result);
    value.onerror = () => reject(io(value.error));
  });
}
function completion(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(io(transaction.error));
    transaction.onerror = () => { /* The abort event is the settlement boundary. */ };
  });
}
function integer(input: JsonValue | undefined, max: number): number {
  if (typeof input !== "number" || !Number.isSafeInteger(input) || input < 0 || input > max) fail("invalid allocation counter");
  return input;
}
function allocation(input: unknown): Allocation {
  const value = applicationObject(input, ["contract", "rows", "bytes", "charges"]);
  if (value.contract !== "algal.browser-allocation.v1" || !value.charges || typeof value.charges !== "object" || Array.isArray(value.charges)) fail("invalid allocation metadata");
  const entries = Object.entries(value.charges);
  if (entries.length > BROWSER_STORAGE_LIMITS.applications) fail("application allocation count exceeded");
  const charges: Record<string, number> = Object.create(null) as Record<string, number>;
  let total = 0;
  for (const [name, amount] of entries) {
    applicationId(name); charges[name] = integer(amount, BROWSER_STORAGE_LIMITS.applicationReservationBytes); total += charges[name];
  }
  if (total > BROWSER_STORAGE_LIMITS.totalReservationBytes) fail("allocation total exceeded");
  return { contract: "algal.browser-allocation.v1", rows: integer(value.rows, BROWSER_STORAGE_LIMITS.rows), bytes: integer(value.bytes, BROWSER_STORAGE_LIMITS.totalBytes), charges };
}
function envelope(input: unknown, maxBytes: number = BROWSER_STORAGE_LIMITS.recordBytes): { row: Envelope; value: JsonValue } {
  // Bound the string before JSON parsing. An envelope's payload remains exact
  // canonical bytes, including evidence needed by the raw recovery export.
  if (!input || typeof input !== "object" || Array.isArray(input)) fail("invalid row envelope");
  const row = input as Record<string, unknown>;
  if (Object.keys(row).sort().join("/") !== "contract/digest/json" || row.contract !== "algal.browser-row.v1" || typeof row.json !== "string" || utf8Length(row.json) > maxBytes) fail("invalid or oversized row envelope");
  const digest = asDigest(row.digest, "browser row digest");
  if (digestText(row.json) !== digest) fail("row digest mismatch");
  let value: JsonValue;
  try { value = applicationJson(JSON.parse(row.json) as unknown); }
  catch { fail("row JSON is corrupt"); }
  if (canonicalize(value) !== row.json) fail("row JSON is not canonical");
  return { row: { contract: "algal.browser-row.v1", json: row.json, digest }, value };
}
function encode(input: JsonValue, maxBytes: number = BROWSER_STORAGE_LIMITS.recordBytes): Envelope {
  const json = canonicalize(applicationJson(input));
  if (utf8Length(json) > maxBytes) budget("record byte limit exceeded");
  return { contract: "algal.browser-row.v1", json, digest: digestText(json) };
}
function rowBytes(key: string, value: Envelope): number { return utf8Length(key) + utf8Length(canonicalize(value)); }
function validateKey(input: IDBValidKey): string {
  if (typeof input !== "string" || input.length > 180) fail("invalid row key");
  const pieces = input.split("/");
  if (["manifest", "receipt", "value", "effect"].includes(pieces[0]!) && pieces.length === 2) applicationRef(pieces[1]);
  else if (pieces[0] === "slot" && pieces.length === 2) applicationId(pieces[1]);
  else if (pieces[0] === "application" && pieces.length >= 3) {
    applicationId(pieces[1]);
    if (pieces[2] === "head" && pieces.length === 3) return input;
    if ((pieces[2] !== "operation" && pieces[2] !== "dispatch") || pieces.length !== 4) fail("invalid application row key");
    applicationRef(pieces[3]);
  } else fail("unknown row key");
  return input;
}
function validateRow(key: string, input: unknown): { row: Envelope; value: JsonValue } {
  validateKey(key);
  const parsed = envelope(input, key.startsWith("application/") && key.endsWith("/head") ? 512 : key.startsWith("application/") && key.includes("/operation/") ? 2048 : BROWSER_STORAGE_LIMITS.recordBytes);
  const [kind, reference] = key.split("/");
  if (["manifest", "receipt", "value"].includes(kind!) && parsed.row.digest !== reference) fail("CAS row identity mismatch");
  if (kind === "manifest") parseOrganismManifest(parsed.value);
  if (kind === "effect") parseEffectReceipt(parsed.value);
  return parsed;
}
async function connect(name: string, initialize: boolean): Promise<IDBDatabase> {
  const factory = globalThis.indexedDB;
  if (!factory) fail("IndexedDB is unavailable");
  return new Promise((resolve, reject) => {
    let rejected = false;
    const opening = factory.open(name, 1);
    const rejectOpen = (error: unknown): void => { rejected = true; reject(io(error)); };
    opening.onerror = () => rejectOpen(opening.error);
    opening.onblocked = () => rejectOpen(new Error("Database opening is blocked by another version"));
    opening.onupgradeneeded = event => {
      const database = opening.result;
      if (!initialize || event.oldVersion !== 0 || database.objectStoreNames.length !== 0 || rejected) { opening.transaction?.abort(); return; }
      database.createObjectStore(ROWS);
      database.createObjectStore(META).put({ contract: "algal.browser-allocation.v1", rows: 0, bytes: 0, charges: {} } satisfies Allocation, META_KEY);
    };
    opening.onsuccess = () => {
      const database = opening.result;
      if (rejected) { database.close(); return; }
      if (database.version !== 1 || database.objectStoreNames.length !== 2 || !database.objectStoreNames.contains(ROWS) || !database.objectStoreNames.contains(META)) { database.close(); rejectOpen(new Error("Unexpected database schema")); return; }
      resolve(database);
    };
  });
}
async function snapshot(database: IDBDatabase): Promise<Snapshot> {
  const transaction = database.transaction([ROWS, META], "readonly"), done = completion(transaction);
  try {
    const rows = transaction.objectStore(ROWS), metadata = transaction.objectStore(META);
    const [keys, values, metadataKeys, metadataValues] = await Promise.all([
      request(rows.getAllKeys(undefined, BROWSER_STORAGE_LIMITS.rows + 1)), request(rows.getAll(undefined, BROWSER_STORAGE_LIMITS.rows + 1)) as Promise<unknown[]>,
      request(metadata.getAllKeys(undefined, 3)), request(metadata.getAll(undefined, 3)) as Promise<unknown[]>,
    ]);
    await done;
    if (keys.length > BROWSER_STORAGE_LIMITS.rows || keys.length !== values.length || metadataKeys.length !== metadataValues.length || metadataKeys.length > 2) budget("raw inventory count exceeded");
    return { keys, values, metadataKeys, metadataValues };
  } catch (error) { try { transaction.abort(); } catch { /* Already settled. */ } await done.catch(() => {}); throw io(error); }
}
function rawJson(input: unknown): JsonValue {
  let count = 0;
  const visit = (value: unknown, depth: number): JsonValue => {
    if (++count > 1_000_000 || depth > 32) budget("raw export structure exceeded");
    if (value === null || typeof value === "string" || typeof value === "boolean") return value;
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (Array.isArray(value)) return value.map(child => visit(child, depth + 1));
    if (value && typeof value === "object" && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null)) {
      const out: Record<string, JsonValue> = Object.create(null) as Record<string, JsonValue>;
      for (const [key, child] of Object.entries(value)) out[key] = visit(child, depth + 1);
      return out;
    }
    fail("raw export contains a non-JSON value; lossless JSON export is unavailable");
  };
  const value = visit(input, 0);
  if (utf8Length(JSON.stringify(value)) > BROWSER_STORAGE_LIMITS.rawExportBytes) budget("raw export byte limit exceeded");
  return value;
}

export class IndexedDbApplicationStorage implements ApplicationStorage {
  readonly store: Store;
  private closed = false;
  private constructor(private readonly database: IDBDatabase, private readonly locks: LockManager) {
    database.onversionchange = () => this.close();
    this.store = {
      getManifest: async reference => { const value = await this.read(`manifest/${applicationRef(reference)}`); return value === undefined ? undefined : parseOrganismManifest(value); },
      putManifest: async manifest => { const value = manifestToJson(parseOrganismManifest(manifestToJson(manifest))), reference = digestCanonical(value); await this.write(`manifest/${reference}`, value, "immutable"); return reference; },
      getReceipt: reference => this.read(`receipt/${applicationRef(reference)}`),
      putReceipt: value => this.putCas("receipt", value),
      getValue: reference => this.read(`value/${applicationRef(reference)}`),
      putValue: value => this.putCas("value", value),
      getEffect: async (reference, executor) => {
        const value = await this.read(`effect/${effectKey(reference, executor)}`);
        if (value === undefined) return undefined;
        const effect = parseEffectReceipt(value);
        if (effect.requestDigest !== reference) fail("effect request identity mismatch");
        return effect;
      },
      putEffect: async (input: EffectReceipt, executor) => {
        const effect = parseEffectReceipt(input);
        await this.write(`effect/${effectKey(effect.requestDigest, executor)}`, applicationJson(effect), "first");
        return effect.requestDigest;
      },
      getSlot: name => this.read(`slot/${applicationId(name)}`),
      setSlot: (name, value) => this.write(`slot/${applicationId(name)}`, value, "replace"),
    };
  }
  static async open(options: { name?: string } = {}): Promise<IndexedDbApplicationStorage> {
    const name = nameOf(options), { locks } = browser(), database = await connect(name, true);
    const adapter = new IndexedDbApplicationStorage(database, locks);
    try { await adapter.audit(); return adapter; }
    catch (error) { adapter.close(); throw error; }
  }
  /** Recovery access never initializes a missing database or parses its rows.
   * Use this when normal opening rejects corrupt metadata or retained evidence. */
  static async exportRaw(options: { name?: string } = {}): Promise<JsonValue> {
    const name = nameOf(options), database = await connect(name, false);
    try { return IndexedDbApplicationStorage.raw(name, await snapshot(database)); }
    finally { database.close(); }
  }
  private static raw(name: string, input: Snapshot): JsonValue {
    return rawJson({ contract: "algal.browser-raw-export.v1", database: name, version: 1,
      rows: input.keys.map((key, index) => ({ key, value: input.values[index] })),
      metadata: input.metadataKeys.map((key, index) => ({ key, value: input.metadataValues[index] })),
    });
  }
  async exportRaw(): Promise<JsonValue> { this.assertOpen(); return IndexedDbApplicationStorage.raw(this.database.name, await snapshot(this.database)); }
  close(): void { this.closed = true; this.database.close(); }
  private assertOpen(): void { if (this.closed) fail("connection is closed"); }
  private transaction(mode: IDBTransactionMode): IDBTransaction {
    this.assertOpen();
    // Strict is a standards-defined durability hint, not an eviction guarantee.
    const transaction = this.database.transaction([ROWS, META], mode, mode === "readwrite" ? { durability: "strict" } : {});
    if (mode === "readwrite" && transaction.durability !== "strict") { transaction.abort(); fail("strict transaction durability is unsupported"); }
    return transaction;
  }
  private async audit(): Promise<void> {
    const retained = await snapshot(this.database);
    if (retained.metadataKeys.length !== 1 || retained.metadataKeys[0] !== META_KEY) fail("missing or unexpected allocation metadata");
    const meta = allocation(retained.metadataValues[0]);
    let bytes = 0;
    for (let index = 0; index < retained.keys.length; index++) {
      const key = validateKey(retained.keys[index]!), row = validateRow(key, retained.values[index]);
      if (key.startsWith("application/") && !Object.hasOwn(meta.charges, key.split("/")[1]!)) fail("application row lacks retained allocation");
      bytes += rowBytes(key, row.row);
    }
    if (retained.keys.length !== meta.rows || bytes !== meta.bytes) fail("allocation inventory mismatch");
  }
  private async read(key: string): Promise<JsonValue | undefined> {
    validateKey(key);
    const transaction = this.transaction("readonly"), done = completion(transaction);
    try {
      const rows = transaction.objectStore(ROWS);
      const [raw, meta, count] = await Promise.all([request(rows.get(key)) as Promise<unknown>, request(transaction.objectStore(META).get(META_KEY)) as Promise<unknown>, request(rows.count())]);
      await done;
      if (allocation(meta).rows !== count) fail("allocation inventory count mismatch");
      return raw === undefined ? undefined : validateRow(key, raw).value;
    } catch (error) { await done.catch(() => {}); throw io(error); }
  }
  private async putCas(kind: "value" | "receipt", value: JsonValue): Promise<Digest> {
    const record = applicationJson(value), reference = digestCanonical(record);
    await this.write(`${kind}/${reference}`, record, "immutable");
    return reference;
  }
  private async write(key: string, value: JsonValue, mode: "immutable" | "replace" | "first", maxBytes: number = BROWSER_STORAGE_LIMITS.recordBytes): Promise<void> {
    validateKey(key);
    const encoded = encode(value, maxBytes);
    validateRow(key, encoded);
    const transaction = this.transaction("readwrite"), done = completion(transaction);
    try {
      const rows = transaction.objectStore(ROWS), metadata = transaction.objectStore(META);
      const [raw, metaRaw, count] = await Promise.all([request(rows.get(key)) as Promise<unknown>, request(metadata.get(META_KEY)) as Promise<unknown>, request(rows.count())]);
      const meta = allocation(metaRaw), previous = raw === undefined ? undefined : validateRow(key, raw).row;
      if (meta.rows !== count) fail("allocation inventory count mismatch");
      if (key.startsWith("application/") && !Object.hasOwn(meta.charges, key.split("/")[1]!)) fail("application row lacks retained allocation");
      if (previous && mode === "immutable" && previous.json !== encoded.json) throw new AlgalError("DIGEST_MISMATCH", "Browser storage immutable row conflicts");
      if (previous && (mode === "first" || previous.json === encoded.json)) { await done; return; }
      const next = { ...meta, rows: meta.rows + Number(!previous), bytes: meta.bytes - (previous ? rowBytes(key, previous) : 0) + rowBytes(key, encoded) };
      if (next.bytes < 0) fail("allocation byte counter underflow");
      if (next.rows > BROWSER_STORAGE_LIMITS.rows || next.bytes > BROWSER_STORAGE_LIMITS.totalBytes) budget("database capacity exceeded");
      rows.put(encoded, key); metadata.put(next, META_KEY);
      await done;
    } catch (error) { try { transaction.abort(); } catch { /* Already settled. */ } await done.catch(() => {}); throw io(error); }
  }
  private key(application: string, kind: "head" | "operation" | "dispatch", reference?: Digest): string {
    return `application/${applicationId(application)}/${kind}${reference === undefined ? "" : "/" + applicationRef(reference)}`;
  }
  readHead(application: string): Promise<JsonValue | undefined> { return this.read(this.key(application, "head")); }
  readOperation(application: string, operation: Digest): Promise<JsonValue | undefined> { return this.read(this.key(application, "operation", operation)); }
  readDispatch(application: string, intent: Digest): Promise<JsonValue | undefined> { return this.read(this.key(application, "dispatch", intent)); }
  writeHead(application: string, value: JsonValue): Promise<void> { return this.write(this.key(application, "head"), value, "replace", 512); }
  writeOperation(application: string, operation: Digest, value: JsonValue): Promise<void> { return this.write(this.key(application, "operation", operation), value, "immutable", 2048); }
  writeDispatch(application: string, intent: Digest, value: JsonValue, immutable: boolean): Promise<void> { return this.write(this.key(application, "dispatch", intent), value, immutable ? "immutable" : "replace"); }
  async operationCount(application: string): Promise<number> {
    const prefix = `application/${applicationId(application)}/operation/`;
    const transaction = this.transaction("readonly"), done = completion(transaction);
    try {
      const rows = transaction.objectStore(ROWS);
      const [count, total, meta] = await Promise.all([request(rows.count(IDBKeyRange.bound(prefix, prefix + "\uffff"))), request(rows.count()), request(transaction.objectStore(META).get(META_KEY)) as Promise<unknown>]);
      await done;
      if (allocation(meta).rows !== total) fail("allocation inventory count mismatch");
      if (count > APPLICATION_LIMITS.states) budget("application operation count exceeded");
      return count;
    } catch (error) { await done.catch(() => {}); throw io(error); }
  }
  async custody<T>(application: string, _creating: boolean, action: () => Promise<T>): Promise<T> {
    this.assertOpen();
    // Locks are per origin and exact database + application. An empty/denied
    // first admission leaves no namespace row. A lock survives arbitrary awaits.
    return await this.locks.request(`algal.browser:${this.database.name}:application:${applicationId(application)}`, { mode: "exclusive" }, async () => { this.assertOpen(); return action(); });
  }
  async publication<T>(application: string, writes: JsonValue[], action: () => Promise<T>): Promise<T> {
    this.assertOpen();
    const name = applicationId(application);
    if (!writes.length || writes.length > 64) budget("invalid publication count");
    const reservation = writes.reduce<number>((sum, value) => sum + 2 * utf8Length(canonicalize(applicationJson(value))), 0);
    return await this.locks.request(`algal.browser:${this.database.name}:publication`, { mode: "exclusive" }, async () => {
      const transaction = this.transaction("readwrite"), done = completion(transaction);
      try {
        const metadata = transaction.objectStore(META);
        const [raw, count] = await Promise.all([request(metadata.get(META_KEY)) as Promise<unknown>, request(transaction.objectStore(ROWS).count())]);
        const meta = allocation(raw);
        if (meta.rows !== count) fail("allocation inventory count mismatch");
        const prior = meta.charges[name] ?? 0, charge = prior + reservation;
        const total = Object.values(meta.charges).reduce((sum, value) => sum + value, 0) + reservation;
        if ((!Object.hasOwn(meta.charges, name) && Object.keys(meta.charges).length >= BROWSER_STORAGE_LIMITS.applications) || charge > BROWSER_STORAGE_LIMITS.applicationReservationBytes || total > BROWSER_STORAGE_LIMITS.totalReservationBytes) budget("application reservation capacity exceeded");
        meta.charges[name] = charge; metadata.put(meta, META_KEY);
        await done;
      } catch (error) { try { transaction.abort(); } catch { /* Already settled. */ } await done.catch(() => {}); throw io(error); }
      // The reservation survives later failure. The callback owns independent
      // CAS/operation/head writes and must not wait on an external effect.
      return action();
    });
  }
}
