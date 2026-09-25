// Local filesystem publication under the documented fsync and stable-namespace
// assumptions. A visible directory is not evidence that its binding is durable.
// Diagnostic probes are internal, scoped to one async operation, and can fail
// an I/O step but cannot bypass it or turn a failed syscall into success.
import { AsyncLocalStorage } from "node:async_hooks";
import { randomBytes } from "node:crypto";
import { constants } from "node:fs";
import { link, lstat, mkdir, open, realpath, rename, unlink, type FileHandle } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { AlgalError } from "./errors";

export type DurableFsStep = "mkdir" | "write-temp" | "file-sync" | "link" | "replace" |
  "dir-sync" | "unlink-temp" | "unlink-pending" | "create-lock" | "unlink-lock";
export type DurableFsEvent = {
  step: DurableFsStep;
  phase: "before" | "after";
  path: string;
  target?: string;
  inode?: string;
};
type Probe = (event: DurableFsEvent) => void | Promise<void>;
const probes = new AsyncLocalStorage<Probe>();

/** Internal verification seam; not exported from the package surface. */
export function withDurableFsProbe<T>(probe: Probe, action: () => Promise<T>): Promise<T> {
  return probes.run(probe, action);
}

export async function durableStep<T>(
  step: DurableFsStep, path: string, action: () => Promise<T>, detail: { target?: string; inode?: string } = {},
): Promise<T> {
  const event = { step, path: resolve(path), ...detail };
  const probe = probes.getStore();
  await probe?.({ ...event, phase: "before" });
  const result = await action();
  await probe?.({ ...event, phase: "after" });
  return result;
}

const MAX_ANCESTORS = 256;
async function realDirectory(path: string): Promise<void> {
  const stat = await lstat(path);
  if (!stat.isDirectory() || stat.isSymbolicLink()) {
    throw new AlgalError("IO_FAILED", "publication directory must be a real directory");
  }
}

export async function syncDirectory(path: string): Promise<void> {
  const file = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_DIRECTORY | constants.O_NONBLOCK);
  try {
    const stat = await file.stat();
    if (!stat.isDirectory()) throw new AlgalError("IO_FAILED", "publication directory descriptor is not a directory");
    await durableStep("dir-sync", path, () => file.sync(), { inode: `${stat.dev}:${stat.ino}` });
  } finally { await file.close(); }
}

async function syncAncestors(path: string): Promise<void> {
  await realDirectory(path);
  let current = await realpath(path);
  for (let count = 0; count < MAX_ANCESTORS; count++) {
    await syncDirectory(current);
    const parent = dirname(current);
    if (parent === current) return;
    current = parent;
  }
  throw new AlgalError("BUDGET_EXHAUSTED", "publication ancestor bound exceeded");
}

/** Establish all directory bindings, including already-visible ones. Existing
 * ancestor aliases (/tmp, for example) are resolved before the physical walk;
 * callers still reject symlinks at managed roots/namespaces and leaf targets.
 * Filesystem roots and stable mount mappings are explicit initial assumptions. */
export async function ensureDurableDirectory(path: string): Promise<void> {
  const absolute = resolve(path);
  const missing: string[] = [];
  let current = absolute;
  for (;;) {
    try {
      if (current === absolute) await realDirectory(current);
      else await lstat(current);
      break;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      if (missing.length >= MAX_ANCESTORS) throw new AlgalError("BUDGET_EXHAUSTED", "publication ancestor bound exceeded");
      missing.push(basename(current));
      const parent = dirname(current);
      if (parent === current) throw error;
      current = parent;
    }
  }
  current = await realpath(current);
  await realDirectory(current);
  for (const component of missing.reverse()) {
    current = join(current, component);
    try { await durableStep("mkdir", current, () => mkdir(current, { mode: 0o700 })); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error; }
    await realDirectory(current);
  }
  await syncAncestors(current);
}

export async function syncFile(file: FileHandle, path: string): Promise<void> {
  const stat = await file.stat();
  if (!stat.isFile()) throw new AlgalError("IO_FAILED", "publication file descriptor is not regular");
  await durableStep("file-sync", path, () => file.sync(), { inode: `${stat.dev}:${stat.ino}` });
}

/** The caller must admit the contents while this same descriptor remains open.
 * This never creates missing directories or repairs the retained bytes. */
export async function syncRetainedFile(file: FileHandle, path: string): Promise<void> {
  await syncFile(file, path);
  await syncAncestors(dirname(resolve(path)));
}

/** A false result is an unadmitted existing winner, not an acknowledgment.
 * The caller must read, validate and sync that winner through its opened fd. */
export async function publishFile(path: string, bytes: string, replace = false): Promise<boolean> {
  path = resolve(path);
  const parent = dirname(path);
  await ensureDurableDirectory(parent);
  const temporary = join(parent, `.tmp-${randomBytes(24).toString("hex")}`);
  const file = await open(temporary, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600);
  let failed = false;
  let failure: unknown;
  let fresh = true;
  try {
    try {
      await durableStep("write-temp", temporary, () => file.writeFile(bytes));
      await syncFile(file, temporary);
    } finally { await file.close(); }
    if (replace) await durableStep("replace", temporary, () => rename(temporary, path), { target: path });
    else {
      try { await durableStep("link", temporary, () => link(temporary, path), { target: path }); }
      catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
        fresh = false;
      }
    }
    if (fresh) await syncDirectory(parent);
  } catch (error) { failed = true; failure = error; }
  try {
    await durableStep("unlink-temp", temporary, async () => {
      try { await unlink(temporary); }
      catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
    });
  } catch (error) { if (!failed) { failed = true; failure = error; } }
  if (failed) throw failure;
  return fresh;
}

export async function durableUnlink(path: string, step: "unlink-pending" | "unlink-lock"): Promise<void> {
  await durableStep(step, path, () => unlink(path));
  await syncDirectory(dirname(path));
}
