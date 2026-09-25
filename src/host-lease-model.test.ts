import { afterEach, expect, test } from "bun:test";
import { mkdir, mkdtemp, readFile, readdir, realpath, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { withDurableFsProbe } from "./durable-fs";
import { AlgalError } from "./errors";
import { hostLease } from "./host-state";
import { canonicalize } from "./values";

const directories: string[] = [];
afterEach(async () => { for (const dir of directories.splice(0)) await rm(dir, { recursive: true, force: true }); });
const marker = (n: number, process = "model") => ({ contract: "algal.process-owner.v2", process, nonce: n.toString(16).padStart(64, "0") });
const archiveName = (n: number) => `${marker(n).nonce}.json`;
async function setup(count = 0) {
  const dir = await realpath(await mkdtemp(join(tmpdir(), "algal-lease-model-"))); directories.push(dir);
  await hostLease(dir, "model", async () => undefined);
  const owners = join(dir, "owners"); await mkdir(owners);
  // Bounded retained-state fixtures, outside the operation/fault transcript.
  for (let n = 0; n < count; n++) await writeFile(join(owners, archiveName(n)), canonicalize(marker(n)));
  return { dir, owners, lock: join(dir, ".lock"), database: join(dir, ".owner.sqlite") };
}
async function retained(directory: string) {
  const result: [string, string][] = [];
  for (const name of (await readdir(directory)).sort()) result.push([name, await readFile(join(directory, name), "utf8")]);
  return result;
}

test("owner archives admit the 256th marker and refuse a new 257th without erasing evidence", async () => {
  const { dir, owners, lock, database } = await setup(255);
  const inode = (await stat(database)).ino;
  await writeFile(lock, canonicalize(marker(255)));
  expect(await hostLease(dir, "model", async () => {
    expect(await readdir(owners)).toHaveLength(256);
    expect(await readFile(join(owners, archiveName(255)), "utf8")).toBe(canonicalize(marker(255)));
    return "admitted";
  })).toBe("admitted");
  const before = await retained(owners), old = canonicalize(marker(256));
  await writeFile(lock, old);
  let called = false;
  await expect(hostLease(dir, "model", async () => { called = true; })).rejects.toMatchObject({ code: "BUDGET_EXHAUSTED" });
  expect(called).toBe(false);
  expect(await readFile(lock, "utf8")).toBe(old);
  expect(await retained(owners)).toEqual(before);
  expect((await stat(database)).ino).toBe(inode);
});

test.each([false, true])("a full owner archive admits an equal winner and preserves conflicts (conflict=%s)", async conflict => {
  const { dir, owners, lock, database } = await setup(256);
  const inode = (await stat(database)).ino, old = canonicalize(marker(42));
  if (conflict) await writeFile(join(owners, archiveName(42)), canonicalize(marker(42, "other")));
  const before = await retained(owners);
  await writeFile(lock, old);
  let called = false;
  const operation = hostLease(dir, "model", async () => { called = true; return "admitted"; });
  if (conflict) {
    await expect(operation).rejects.toMatchObject({ code: "DIGEST_MISMATCH" });
    expect(called).toBe(false);
    expect(await readFile(lock, "utf8")).toBe(old);
  } else {
    expect(await operation).toBe("admitted");
    expect(called).toBe(true);
  }
  expect(await retained(owners)).toEqual(before);
  expect((await stat(database)).ino).toBe(inode);
});

test("recognized owner evidence is already archived when old-marker removal fails", async () => {
  const { dir, owners, lock } = await setup();
  const old = canonicalize(marker(42)), cut = new AlgalError("IO_FAILED", "archive-before-clear cut");
  await writeFile(lock, old);
  let reached = false, called = false;
  await expect(withDurableFsProbe(async event => {
    if (event.step === "unlink-lock" && event.phase === "before" && event.path === lock) {
      reached = true;
      expect(await readFile(join(owners, archiveName(42)), "utf8")).toBe(old);
      throw cut;
    }
  }, () => hostLease(dir, "model", async () => { called = true; }))).rejects.toBe(cut);
  expect(reached).toBe(true); expect(called).toBe(false);
  expect(await readFile(lock, "utf8")).toBe(old);
  expect(await readdir(owners)).toEqual([archiveName(42)]);
  expect(await hostLease(dir, "model", async () => "explicitly reopened")).toBe("explicitly reopened");
  expect(await readFile(join(owners, archiveName(42)), "utf8")).toBe(old);
});

test.each(["before-unlink", "after-unlink"] as const)("Bun reports cleanup failure and releases live custody at %s", async boundary => {
  const { dir, owners, lock, database } = await setup();
  const inode = (await stat(database)).ino, cut = new AlgalError("IO_FAILED", `cleanup ${boundary}`);
  let armed = false, removed = false, reached = false, admittedMarker = "";
  await expect(withDurableFsProbe(event => {
    if (!armed) return;
    if (event.step === "unlink-lock" && event.phase === "after" && event.path === lock) removed = true;
    const target = boundary === "before-unlink"
      ? event.step === "unlink-lock" && event.phase === "before" && event.path === lock
      : removed && event.step === "dir-sync" && event.phase === "before" && event.path === dir;
    if (target) { reached = true; throw cut; }
  }, () => hostLease(dir, "model", async () => {
    admittedMarker = await readFile(lock, "utf8"); armed = true; return "callback completed";
  }))).rejects.toBe(cut);
  expect(armed).toBe(true); expect(reached).toBe(true);
  if (boundary === "before-unlink") expect(await readFile(lock, "utf8")).toBe(admittedMarker);
  else expect(await readdir(dir)).not.toContain(".lock"); // Current visibility, not a crash-durability claim.
  expect(await hostLease(dir, "model", async () => "new live owner")).toBe("new live owner");
  const archive = await retained(owners);
  expect(archive).toHaveLength(boundary === "before-unlink" ? 1 : 0);
  if (boundary === "before-unlink") expect(archive[0]![1]).toBe(admittedMarker);
  expect((await stat(database)).ino).toBe(inode);
});
