import { Database, constants as sqlite } from "bun:sqlite";
import { randomBytes } from "node:crypto";
import { constants } from "node:fs";
import { lstat, open, opendir, realpath } from "node:fs/promises";
import { join } from "node:path";
import { AlgalError } from "./errors";
import { durableUnlink, ensureDurableDirectory, publishFile, syncRetainedFile } from "./durable-fs";
import { canonicalize, asJsonValue, type JsonValue } from "./values";

export async function hostDirectory(path: string): Promise<void> {
  await ensureDurableDirectory(path);
}

export async function hostRead(path: string, maxBytes: number): Promise<JsonValue | undefined> {
  return readHost(path, maxBytes);
}

async function readHost(path: string, maxBytes: number, retain?: (value: JsonValue) => void): Promise<JsonValue | undefined> {
  let file;
  try { file = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined; throw error; }
  try {
    const stat = await file.stat();
    if (!stat.isFile() || stat.size > maxBytes) throw new AlgalError("IO_FAILED", "host state file type or byte bound failed");
    const bytes = Buffer.alloc(Math.min(stat.size + 1, maxBytes + 1));
    let count = 0;
    while (count < bytes.length) {
      const result = await file.read(bytes, count, bytes.length - count, count);
      if (result.bytesRead === 0) break;
      count += result.bytesRead;
    }
    if (count > maxBytes || count !== stat.size) throw new AlgalError("IO_FAILED", "host state changed while reading");
    let text: string;
    try {
      // Keep a leading BOM visible to JSON.parse, which rejects it.
      text = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes.subarray(0, count));
    } catch {
      throw new AlgalError("PARSE_FAILED", "host state contains invalid UTF-8");
    }
    const value: unknown = JSON.parse(text);
    let nodes = 0;
    const visit = (v: unknown, depth: number): void => {
      if (++nodes > 100_000 || depth > 64) throw new AlgalError("BUDGET_EXHAUSTED", "host state structure bound exceeded");
      if (v && typeof v === "object") for (const child of Object.values(v)) visit(child, depth + 1);
    };
    visit(value, 0);
    const parsed = asJsonValue(value, "host state");
    if (retain) { retain(parsed); await syncRetainedFile(file, path); }
    return parsed;
  } finally { await file.close(); }
}

export async function hostWrite(path: string, value: JsonValue, maxBytes: number, immutable = true): Promise<void> {
  const bytes = canonicalize(value);
  if (Buffer.byteLength(bytes) > maxBytes) throw new AlgalError("BUDGET_EXHAUSTED", "host state byte bound exceeded");
  const validate = (existing: JsonValue): void => {
    if (canonicalize(existing) !== bytes) throw new AlgalError("DIGEST_MISMATCH", "immutable host state conflicts");
  };
  const existing = await readHost(path, maxBytes, immutable ? validate : undefined);
  if (existing !== undefined && immutable) return;
  if (!await publishFile(path, bytes, !immutable)) {
    if (await readHost(path, maxBytes, validate) === undefined) throw new AlgalError("IO_FAILED", "host state publication disappeared");
  }
}

/** List published record names. Entries must be regular files; a name outside
 * `pattern` fails when `strict`, and is otherwise skipped as stray residue. */
export async function hostNames(path: string, max: number, pattern: RegExp, strict = true): Promise<string[]> {
  await hostDirectory(path);
  const names: string[] = [];
  let scanned = 0;
  for await (const entry of await opendir(path)) {
    if (++scanned > max * 2 + 16) throw new AlgalError("BUDGET_EXHAUSTED", "host state directory scan bound exceeded");
    if (!entry.isFile()) throw new AlgalError("IO_FAILED", "unexpected host state entry type");
    if (/^\.tmp-[a-f0-9]{48}$/.test(entry.name)) continue; // Unpublished crash residue is retained, never interpreted.
    if (!pattern.test(entry.name)) { if (strict) throw new AlgalError("IO_FAILED", "unexpected host state entry"); continue; }
    names.push(entry.name);
    if (names.length > max) throw new AlgalError("BUDGET_EXHAUSTED", "host state entry bound exceeded");
  }
  return names.sort();
}

async function releaseMarker(lock: string, marker: JsonValue): Promise<void> {
  const current = await hostRead(lock, 4096);
  if (canonicalize(current ?? null) !== canonicalize(marker)) throw new AlgalError("IO_FAILED", "owner marker changed during operation");
  await durableUnlink(lock, "unlink-lock");
}

function ownerTableExists(db: Database): boolean {
  const schema = db.query("SELECT type FROM sqlite_schema WHERE name='algal_owner' COLLATE NOCASE LIMIT 2").all() as {type: unknown}[];
  if (schema.length > 1 || (schema.length === 1 && schema[0]?.type !== "table")) throw new AlgalError("IO_FAILED", "invalid owner database schema");
  return schema.length === 1;
}

/** Shared coordination leases (`.creation`, `.application-quota`) are held
 * briefly by every writer; a caller waits this long, polling at this interval,
 * before reporting live contention. Identical in `crates/algal/src/lease.rs`. */
export const SHARED_LEASE_RETRY = Object.freeze({ waitMs: 2000, pollMs: 25 });
export type HostLeaseRetry = { waitMs: number; pollMs: number };
const CONTENDED = "host lease is held by another live operation";
type Acquired = { db: Database; lock: string; marker: JsonValue; directory: string };

/** Everything up to the published ownership marker; a thrown error here has
 * acquired nothing that `release` must undo beyond the open connection. */
async function acquire(directory: string, processName: string): Promise<Acquired> {
  await hostDirectory(directory);
  directory = await realpath(directory);
  const path = join(directory, ".owner.sqlite");
  for (const suffix of ["", "-journal", "-wal", "-shm"]) {
    try {
      const stat = await lstat(path + suffix);
      if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 65_536) throw new AlgalError("IO_FAILED", "invalid owner database file");
    } catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
  }
  const lock = join(directory, ".lock");
  let db: Database | undefined;
  try {
    db = new Database(path, sqlite.SQLITE_OPEN_READWRITE | sqlite.SQLITE_OPEN_CREATE | sqlite.SQLITE_OPEN_NOFOLLOW | sqlite.SQLITE_OPEN_PRIVATECACHE);
    db.exec("PRAGMA busy_timeout=0; PRAGMA journal_mode=DELETE; PRAGMA synchronous=FULL;");
    if (!ownerTableExists(db)) db.exec("CREATE TABLE IF NOT EXISTS algal_owner(contract TEXT PRIMARY KEY);");
    // A retained, initialized database needs no schema or contract writes.
    // Even INSERT OR IGNORE can contend before custody has been acquired.
    // Empty tables can result from an interrupted first initialization.
    const initial = db.query("SELECT contract FROM algal_owner LIMIT 2").all() as {contract: unknown}[];
    if (initial.length === 0) {
      const columns = db.query("SELECT name, type, pk, hidden, dflt_value FROM pragma_table_xinfo('algal_owner') LIMIT 2").all() as {name: unknown; type: unknown; pk: unknown; hidden: unknown; dflt_value: unknown}[];
      const column = columns[0];
      if (columns.length !== 1 || column?.name !== "contract" || typeof column.type !== "string" || column.type.toUpperCase() !== "TEXT" || column.pk !== 1 || column.hidden !== 0 || column.dflt_value !== null) throw new AlgalError("IO_FAILED", "invalid owner database schema");
      db.exec("INSERT OR IGNORE INTO algal_owner(contract) VALUES('algal.process-owner.v2');");
    }
    else if (initial.length !== 1 || initial[0]?.contract !== "algal.process-owner.v2") throw new AlgalError("IO_FAILED", "unknown owner database contract");
    db.exec("BEGIN IMMEDIATE;");
    if (!ownerTableExists(db)) throw new AlgalError("IO_FAILED", "invalid owner database schema");
    const rows = db.query("SELECT contract FROM algal_owner LIMIT 2").all() as {contract: unknown}[];
    if (rows.length !== 1 || rows[0]?.contract !== "algal.process-owner.v2") throw new AlgalError("IO_FAILED", "unknown owner database contract");
    const previous = await hostRead(lock, 4096);
    if (previous !== undefined) {
      if (!previous || typeof previous !== "object" || Array.isArray(previous) ||
          Object.keys(previous).sort().join(",") !== "contract,nonce,process" ||
          previous.contract !== "algal.process-owner.v2" || previous.process !== processName ||
          typeof previous.nonce !== "string" || !/^[a-f0-9]{64}$/.test(previous.nonce)) {
        throw new AlgalError("IO_FAILED", "legacy process lease requires operator reconciliation");
      }
      const history = join(directory, "owners");
      const names = await hostNames(history, 256, /^[a-f0-9]{64}\.json$/);
      if (names.length >= 256 && !names.includes(`${previous.nonce}.json`)) throw new AlgalError("BUDGET_EXHAUSTED", "owner recovery evidence limit exceeded");
      await hostWrite(join(history, `${previous.nonce}.json`), previous, 4096);
      await durableUnlink(lock, "unlink-lock");
    }
    const marker: JsonValue = {contract: "algal.process-owner.v2", process: processName, nonce: randomBytes(32).toString("hex")};
    await hostWrite(lock, marker, 4096);
    return {db, lock, marker, directory};
  } catch (error) {
    if (db) { try { if (db.inTransaction) db.exec("ROLLBACK;"); } finally { db.close(); } }
    if (error instanceof Error && /SQLITE_BUSY|database is locked/.test(error.message)) throw new AlgalError("IO_FAILED", CONTENDED);
    throw error;
  }
}

/** SQLite's process-owned transaction provides a shared Bun/Rust mutex that
 * the OS releases on process death. The database inode is retained forever;
 * no PID, age, or deletable lock pathname is treated as proof of ownership.
 * With `retry`, only live contention during acquisition is retried until the
 * wait elapses; every other failure and the acquired custody are unchanged. */
export async function hostLease<T>(directory: string, processName: string, action: () => Promise<T>, retry?: HostLeaseRetry): Promise<T> {
  const deadline = Date.now() + (retry?.waitMs ?? 0);
  let owned: Acquired;
  for (;;) {
    try { owned = await acquire(directory, processName); break; }
    catch (error) {
      if (!retry || !(error instanceof AlgalError) || error.code !== "IO_FAILED" || error.message !== CONTENDED || Date.now() >= deadline) throw error;
      await new Promise(resolve => setTimeout(resolve, retry.pollMs));
    }
  }
  try {
    return await action();
  } finally {
    try { await releaseMarker(owned.lock, owned.marker); }
    finally { try { if (owned.db.inTransaction) owned.db.exec("ROLLBACK;"); } finally { owned.db.close(); } }
  }
}
