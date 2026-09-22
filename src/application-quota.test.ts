import { afterEach, expect, test } from "bun:test";
import { mkdir, mkdtemp, open, readFile, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { APPLICATION_QUOTA_LIMITS as limits, withApplicationQuota } from "./application-quota";
import { canonicalize } from "./values";

const dirs: string[] = [];
async function root() { const dir = await mkdtemp(join(tmpdir(), "algal-quota-")); dirs.push(dir); return dir; }
async function sparse(path: string, bytes: number) {
  const file = await open(path, "w"); try { await file.truncate(bytes); } finally { await file.close(); }
}
async function ledger(dir: string): Promise<{applications: {application: string; bytes: number}[]}> {
  return JSON.parse(await readFile(join(dir, ".application-quota", "ledger.json"), "utf8"));
}
afterEach(async () => { for (const dir of dirs.splice(0)) await rm(dir, {recursive: true, force: true}); });

test("quota reservations precede publication and survive failed or absent writes", async () => {
  const dir = await root(), value = {retained: "evidence"}, charge = 2 * Buffer.byteLength(canonicalize(value));
  await expect(withApplicationQuota(dir, "one", [value], async () => { throw new Error("crashed after reservation"); })).rejects.toThrow("crashed");
  expect((await ledger(dir)).applications).toEqual([{application: "one", bytes: limits.ownerHeadroom + charge}]);
  await withApplicationQuota(dir, "one", [value], async () => {});
  expect((await ledger(dir)).applications[0]!.bytes).toBe(limits.ownerHeadroom + charge * 2);
});

test("per-application exact boundary retains charges after namespace files disappear", async () => {
  const dir = await root(), app = join(dir, "applications", "one"); await mkdir(app, {recursive: true});
  await sparse(join(app, "orphan"), limits.applicationBytes - limits.ownerHeadroom - 8);
  await withApplicationQuota(dir, "one", [null], async () => {});
  expect((await ledger(dir)).applications[0]!.bytes).toBe(limits.applicationBytes);
  await rm(join(app, "orphan"));
  let published = false;
  await expect(withApplicationQuota(dir, "one", [null], async () => { published = true; })).rejects.toThrow("per-application");
  expect(published).toBe(false);
});

test("aggregate quota includes unindexed prepared, temporary and orphaned namespace bytes", async () => {
  const dir = await root();
  for (const application of ["one", "two", "three", "four"]) {
    const app = join(dir, "applications", application); await mkdir(app, {recursive: true});
    await sparse(join(app, ".tmp-retained"), 253 * 1024 * 1024);
  }
  await expect(withApplicationQuota(dir, "five", [null], async () => {})).rejects.toThrow("aggregate");
  await expect(readFile(join(dir, ".application-quota", "ledger.json"))).rejects.toThrow();
});

test("concurrent applications cannot allocate through another live quota publication", async () => {
  const dir = await root();
  let entered!: () => void, release!: () => void;
  const ready = new Promise<void>(resolve => { entered = resolve; }), wait = new Promise<void>(resolve => { release = resolve; });
  const first = withApplicationQuota(dir, "one", [null], async () => { entered(); await wait; });
  await ready;
  try { await expect(withApplicationQuota(dir, "two", [null], async () => {})).rejects.toThrow("held by another live operation"); }
  finally { release(); }
  await first;
  await withApplicationQuota(dir, "two", [null], async () => {});
  expect((await ledger(dir)).applications.map(row => row.application)).toEqual(["one", "two"]);
});

test("quota scans reject symlinks, deep trees and excessive file counts", async () => {
  const dir = await root(), app = join(dir, "applications", "one"); await mkdir(app, {recursive: true});
  await symlink(dir, join(app, "link"));
  await expect(withApplicationQuota(dir, "one", [null], async () => {})).rejects.toThrow("symlink");
  await rm(join(app, "link"));
  await mkdir(join(app, "a/b/c/d/e"), {recursive: true});
  await expect(withApplicationQuota(dir, "one", [null], async () => {})).rejects.toThrow("scan bound");
  await rm(join(app, "a"), {recursive: true});
  for (let batch = 0; batch < 100; batch++) await Promise.all(Array.from({length: 100}, (_, i) => sparse(join(app, `${batch}-${i}`), 0)));
  await expect(withApplicationQuota(dir, "one", [null], async () => {})).rejects.toThrow("scan bound");
});

test("namespace fallback neither charges nor claims ownership of unrelated shared CAS", async () => {
  const dir = await root(); await mkdir(join(dir, "values"));
  await sparse(join(dir, "values", "unrelated"), limits.aggregateBytes + 1);
  await withApplicationQuota(dir, "one", [null], async () => {});
  expect((await ledger(dir)).applications[0]!.bytes).toBe(limits.ownerHeadroom + 8);
});
