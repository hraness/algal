/// <reference lib="dom" />
/// <reference lib="dom.asynciterable" />
/** Shared IndexedDB plumbing for the durable browser drivers
 * (`mailbox-idb.ts`, `host-events-idb.ts`). Rows are canonical-JSON envelopes
 * with a content digest, so stored bytes stay digest-deterministic and
 * corruption fails closed. Every resolved write observes transaction
 * completion with the strict durability hint; the adapters never hold an
 * application callback inside a transaction. */
import { asDigest, digestText, type Digest } from "./digest";
import { AlgalError } from "./errors";
import { utf8Length } from "./utf8";
import { canonicalize, type JsonValue } from "./values";

export const IDB_ROW_CONTRACT = "algal.idb-row.v1" as const;
export type IdbEnvelope = {
  contract: typeof IDB_ROW_CONTRACT;
  json: string;
  digest: Digest;
};
export type IdbOpenOptions = {
  name?: string;
  factory?: IDBFactory;
};

export function idbFail(message: string): never {
  throw new AlgalError("IO_FAILED", `Browser storage: ${message}; retained data was not reset`);
}
export function idbBudget(message: string): never {
  throw new AlgalError("BUDGET_EXHAUSTED", `Browser storage: ${message}`);
}
export function idbIo(error: unknown): Error {
  if (error instanceof AlgalError) return error;
  if (error instanceof Error && error.name === "QuotaExceededError")
    return new AlgalError("BUDGET_EXHAUSTED", "Browser storage quota exceeded; retained data was not reset");
  return new AlgalError("IO_FAILED", "Browser storage transaction failed; retained data was not reset");
}
export function idbName(
  options: IdbOpenOptions | undefined,
  fallback: string,
  allowedKeys: readonly string[] = ["name", "factory"],
): string {
  if (
    options !== undefined &&
    (typeof options !== "object" || options === null || Array.isArray(options) ||
      Object.keys(options).some((key) => !allowedKeys.includes(key)))
  ) {
    throw new Error("Invalid browser storage options");
  }
  const name = options?.name ?? fallback;
  if (typeof name !== "string" || !/^[a-z][a-z0-9._-]{0,95}$/.test(name)) {
    throw new Error("Invalid browser database name");
  }
  return name;
}
export function idbFactory(factory?: IDBFactory): IDBFactory {
  const resolved = factory ?? globalThis.indexedDB;
  if (!resolved) idbFail("IndexedDB is required on a secure origin");
  return resolved;
}
export function idbKeyRange(): typeof IDBKeyRange {
  const range = globalThis.IDBKeyRange;
  if (!range) idbFail("IDBKeyRange is required on a secure origin");
  return range;
}
/** Contiguous primary-key range covering every key that starts with
 * `prefix` (prefixes never contain code points above U+FFFF). */
export function idbPrefix(prefix: string): IDBKeyRange {
  return idbKeyRange().bound(prefix, `${prefix}\uffff`);
}

export function idbRequest<T>(value: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    value.onsuccess = () => resolve(value.result);
    value.onerror = () => reject(idbIo(value.error));
  });
}
export function idbCompletion(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(idbIo(transaction.error));
    transaction.onerror = () => { /* The abort event is the settlement boundary. */ };
  });
}
/** Runs `body` inside one transaction that settles on commit; readwrite
 * transactions request the strict durability hint and fail closed when the
 * engine cannot report it. The body may only await request promises it
 * issued: any other await lets the real transaction autocommit. */
export async function idbTransact<T>(
  database: IDBDatabase,
  stores: readonly string[],
  mode: IDBTransactionMode,
  body: (transaction: IDBTransaction) => Promise<T>,
): Promise<T> {
  const transaction = database.transaction(
    [...stores],
    mode,
    mode === "readwrite" ? { durability: "strict" } : {},
  );
  if (mode === "readwrite" && transaction.durability !== "strict") {
    transaction.abort();
    idbFail("strict transaction durability is unsupported");
  }
  const done = idbCompletion(transaction);
  try {
    const result = await body(transaction);
    await done;
    return result;
  } catch (error) {
    try { transaction.abort(); } catch { /* Already settled. */ }
    await done.catch(() => {});
    throw idbIo(error);
  }
}
export function idbEncode(value: JsonValue, maxBytes: number): IdbEnvelope {
  const json = canonicalize(value);
  if (utf8Length(json) > maxBytes) idbBudget("record byte limit exceeded");
  return { contract: IDB_ROW_CONTRACT, json, digest: digestText(json) };
}
export function idbRow(input: unknown, maxBytes: number): { row: IdbEnvelope; value: JsonValue } {
  if (!input || typeof input !== "object" || Array.isArray(input)) idbFail("invalid row envelope");
  const row = input as Record<string, unknown>;
  if (
    Object.keys(row).sort().join("/") !== "contract/digest/json" ||
    row.contract !== IDB_ROW_CONTRACT ||
    typeof row.json !== "string" ||
    utf8Length(row.json) > maxBytes
  ) {
    idbFail("invalid or oversized row envelope");
  }
  const digest = asDigest(row.digest, "browser row digest");
  if (digestText(row.json) !== digest) idbFail("row digest mismatch");
  let value: unknown;
  try { value = JSON.parse(row.json); } catch { idbFail("row JSON is corrupt"); }
  return { row: row as unknown as IdbEnvelope, value: value as JsonValue };
}
/** Opens the database at schema version 1, creating the declared object
 * stores on a completely fresh database and failing closed on any other
 * retained schema. */
export function idbConnect(
  factory: IDBFactory,
  name: string,
  stores: readonly string[],
): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    let rejected = false;
    const opening = factory.open(name, 1);
    const rejectOpen = (error: unknown): void => { rejected = true; reject(idbIo(error)); };
    opening.onerror = () => rejectOpen(opening.error);
    opening.onblocked = () => rejectOpen(new Error("Database opening is blocked by another version"));
    opening.onupgradeneeded = (event) => {
      const database = opening.result;
      if (event.oldVersion !== 0 || database.objectStoreNames.length !== 0 || rejected) {
        opening.transaction?.abort();
        return;
      }
      for (const store of stores) database.createObjectStore(store);
    };
    opening.onsuccess = () => {
      const database = opening.result;
      if (rejected) { database.close(); return; }
      if (
        database.version !== 1 ||
        database.objectStoreNames.length !== stores.length ||
        !stores.every((store) => database.objectStoreNames.contains(store))
      ) {
        database.close();
        rejectOpen(new Error("Unexpected database schema"));
        return;
      }
      resolve(database);
    };
  });
}
