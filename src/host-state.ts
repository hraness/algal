import { Database, constants as sqlite } from "bun:sqlite";
import { randomBytes } from "node:crypto";
import { constants } from "node:fs";
import { link, lstat, mkdir, open, opendir, realpath, rename, unlink } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { AlgalError } from "./errors";
import { canonicalize, asJsonValue, type JsonValue } from "./values";

export async function hostDirectory(path: string): Promise<void> {
  const absolute = resolve(path);
  try {
    const stat = await lstat(absolute);
    if (!stat.isDirectory() || stat.isSymbolicLink()) throw new AlgalError("IO_FAILED", "host state directory must be a real directory");
    return;
  } catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
  const parent = dirname(absolute);
  if (parent !== absolute) await hostDirectory(parent);
  try { await mkdir(absolute, { mode: 0o700 }); await syncDirectory(parent); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error; }
  const stat = await lstat(absolute);
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw new AlgalError("IO_FAILED", "host state directory must be a real directory");
}

export async function hostRead(path: string, maxBytes: number): Promise<JsonValue | undefined> {
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
    const value: unknown = JSON.parse(bytes.subarray(0, count).toString("utf8"));
    let nodes = 0;
    const visit = (v: unknown, depth: number): void => {
      if (++nodes > 100_000 || depth > 64) throw new AlgalError("BUDGET_EXHAUSTED", "host state structure bound exceeded");
      if (v && typeof v === "object") for (const child of Object.values(v)) visit(child, depth + 1);
    };
    visit(value, 0);
    return asJsonValue(value, "host state");
  } finally { await file.close(); }
}

async function syncDirectory(path: string): Promise<void> {
  const file = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  try { await file.sync(); } finally { await file.close(); }
}

export async function hostWrite(path: string, value: JsonValue, maxBytes: number, immutable = true): Promise<void> {
  const bytes = canonicalize(value);
  if (Buffer.byteLength(bytes) > maxBytes) throw new AlgalError("BUDGET_EXHAUSTED", "host state byte bound exceeded");
  const parent = dirname(path);
  await hostDirectory(parent);
  const existing = await hostRead(path, maxBytes);
  if (existing !== undefined && immutable) {
    if (canonicalize(existing) !== bytes) throw new AlgalError("DIGEST_MISMATCH", "immutable host state conflicts");
    return;
  }
  const temporary = join(parent, `.tmp-${randomBytes(24).toString("hex")}`);
  const file = await open(temporary, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600);
  try { await file.writeFile(bytes); await file.sync(); } finally { await file.close(); }
  try {
    if (immutable) {
      try { await link(temporary, path); }
      catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
        const winner = await hostRead(path, maxBytes);
        if (winner === undefined || canonicalize(winner) !== bytes) throw new AlgalError("DIGEST_MISMATCH", "host state publication conflicts");
      }
    } else {
      await hostRead(path, maxBytes);
      await rename(temporary, path);
    }
    await syncDirectory(parent);
  } finally { await unlink(temporary).catch(error => { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }); }
}

export async function hostNames(path: string, max: number, pattern: RegExp): Promise<string[]> {
  await hostDirectory(path);
  const names: string[] = [];
  let scanned = 0;
  for await (const entry of await opendir(path)) {
    if (++scanned > max * 2 + 16) throw new AlgalError("BUDGET_EXHAUSTED", "host state directory scan bound exceeded");
    if (!entry.isFile()) throw new AlgalError("IO_FAILED", "unexpected host state entry type");
    if (/^\.tmp-[a-f0-9]{48}$/.test(entry.name)) continue; // Unpublished crash residue is retained, never interpreted.
    if (!pattern.test(entry.name)) throw new AlgalError("IO_FAILED", "unexpected host state entry");
    names.push(entry.name);
    if (names.length > max) throw new AlgalError("BUDGET_EXHAUSTED", "host state entry bound exceeded");
  }
  return names.sort();
}

async function releaseMarker(lock: string, marker: JsonValue, directory: string): Promise<void> {
  const current = await hostRead(lock, 4096);
  if (canonicalize(current ?? null) !== canonicalize(marker)) throw new AlgalError("IO_FAILED", "owner marker changed during operation");
  await unlink(lock);
  await syncDirectory(directory);
}

function ownerTableExists(db: Database): boolean {
  const schema = db.query("SELECT type FROM sqlite_schema WHERE name='algal_owner' COLLATE NOCASE LIMIT 2").all() as {type: unknown}[];
  if (schema.length > 1 || (schema.length === 1 && schema[0]?.type !== "table")) throw new AlgalError("IO_FAILED", "invalid owner database schema");
  return schema.length === 1;
}

/** SQLite's process-owned transaction provides a shared Bun/Rust mutex that
 * the OS releases on process death. The database inode is retained forever;
 * no PID, age, or deletable lock pathname is treated as proof of ownership. */
export async function hostLease<T>(directory: string, processName: string, action: () => Promise<T>): Promise<T> {
  await hostDirectory(directory);
  directory = await realpath(directory);
  const path = join(directory, ".owner.sqlite");
  for (const suffix of ["", "-journal", "-wal", "-shm"]) {
    try {
      const stat = await lstat(path + suffix);
      if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 65_536) throw new AlgalError("IO_FAILED", "invalid owner database file");
    } catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
  }
  let db: Database | undefined;
  let marker: JsonValue | undefined;
  const lock = join(directory, ".lock");
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
      await unlink(lock);
      await syncDirectory(directory);
    }
    marker = {contract: "algal.process-owner.v2", process: processName, nonce: randomBytes(32).toString("hex")};
    await hostWrite(lock, marker, 4096);
    return await action();
  } catch (error) {
    if (error instanceof Error && /SQLITE_BUSY|database is locked/.test(error.message)) throw new AlgalError("IO_FAILED", "host lease is held by another live operation");
    throw error;
  } finally {
    try {
      if (marker !== undefined) {
        await releaseMarker(lock, marker, directory);
      }
    } finally {
      if (db) { try { if (db.inTransaction) db.exec("ROLLBACK;"); } finally { db.close(); } }
    }
  }
}
