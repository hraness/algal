import { expect } from "bun:test";
import { createHash } from "node:crypto";
import { link, lstat, mkdir, mkdtemp, open, readFile, readdir, rename, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { runCommand } from "../verify/lib/runner";
import { applicationTests } from "./fixtures/application-test-scope";
import { FileMailboxService, MAILBOX_BOUNDS } from "./mailbox";

const { test, resources } = applicationTests();
const root = dirname(import.meta.dir), cli = join(root, "cli.ts");
const LISTING_ENTRIES = 4096, MODULE_ENTRIES = 4096, MODULES = 512;
const owner = "retained owner evidence\n";
const manifest = { contract: "algal.organism.v1", key: "organism:directory-admission", name: "Directory admission", cells: [{ id: "out", kind: "const", outputs: { value: { type: "json", value: "ok" } } }], edges: [] };
// Every immutable CAS attempt syncs its ancestor chain. Keep this POSIX fixture
// shallow so count tests measure admission without thousands of extra fsyncs
// through macOS's per-user temporary-directory ancestors.
async function temporary() {
  const base = process.platform === "darwin" ? "/private/tmp" : tmpdir();
  return resources().directory(await mkdtemp(join(base, "algal-directory-admission-")));
}
async function residue(directory: string, start: number, end: number) {
  for (let offset = start; offset < end; offset += 32) {
    resources().checkActive();
    await Promise.all(Array.from({ length: Math.min(32, end - offset) }, async (_, index) => {
      const ordinal = offset + index, path = join(directory, `orphan-${ordinal}`);
      // Three real orphans exercise type/config filtering; every remaining
      // ignored file still spends the identical physical-entry budget.
      if (ordinal < 3) await resources().own(mkdir(path));
      else await resources().own(writeFile(path, `retained ${ordinal}\n`));
    }));
  }
}
async function inventory(directory: string): Promise<string> {
  const entries = (await readdir(directory, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name));
  const digest = createHash("sha256");
  for (let offset = 0; offset < entries.length; offset += 32) {
    resources().checkActive();
    const batch = entries.slice(offset, offset + 32);
    const bytes = await Promise.all(batch.map(entry => entry.isFile()
      ? resources().own(readFile(join(directory, entry.name))) : undefined));
    for (const [index, entry] of batch.entries()) {
      digest.update(JSON.stringify([entry.name, entry.isDirectory() ? "directory" : "file"]));
      if (bytes[index] !== undefined) digest.update(bytes[index]!);
    }
  }
  return digest.digest("hex");
}
async function invoke(args: string[]) {
  resources().checkActive();
  const result = await runCommand([process.execPath, cli, ...args], root, { timeoutMs: 10_000, maxOutputBytes: 1_048_576 });
  expect(result.timedOut).toBe(false); expect(result.outputExceeded).toBe(false);
  expect(result.signal).toBeNull(); expect(result.cleanupObserved).toBe(true);
  return result;
}
function refused(result: Awaited<ReturnType<typeof invoke>>) {
  expect(result.exitCode).toBe(2); expect(result.stdout).toBe("");
  expect(JSON.parse(result.stderr)).toMatchObject({ error: "BUDGET_EXHAUSTED" });
}

test("mailbox namespace scans count ignored files, orphan directories and retained locks before admission", async () => {
  expect(MAILBOX_BOUNDS.maxDirectoryEntries).toBe(2064);
  const dir = await temporary(), service = new FileMailboxService(dir), live = await service.create("live");
  const namespace = join(dir, "mailboxes"), config = await readFile(join(namespace, "live", "config.json"));
  await writeFile(join(namespace, ".held.lock"), owner);
  await residue(namespace, 0, 2061); // live + lock + residue = bound - 1
  expect((await readdir(namespace)).length).toBe(2063);
  expect(await service.list()).toEqual([live]);
  await residue(namespace, 2061, 2062);
  expect(await service.list()).toEqual([live]);
  await residue(namespace, 2062, 2063);
  const retained = await inventory(namespace);
  await expect(service.list()).rejects.toMatchObject({ code: "BUDGET_EXHAUSTED" });
  await expect(service.create("refused")).rejects.toMatchObject({ code: "BUDGET_EXHAUSTED" });
  expect(await service.inspect("refused")).toBeUndefined();
  expect(await inventory(namespace)).toBe(retained);
  expect(await readFile(join(namespace, ".held.lock"), "utf8")).toBe(owner);
  expect(await readFile(join(namespace, "live", "config.json"))).toEqual(config);
  expect((await readdir(join(dir, "capabilities"))).length).toBe(2);
});

test("every store listing enforces the physical limit while retaining mixed residue and lock evidence", async () => {
  const dir = await temporary();
  let namespace = join(dir, "runs"); await mkdir(namespace);
  await writeFile(join(namespace, "record.json"), JSON.stringify({ fixture: "retained listing record" }));
  await writeFile(join(namespace, ".held.lock"), owner);
  await residue(namespace, 0, LISTING_ENTRIES - 3);
  for (const count of [LISTING_ENTRIES - 1, LISTING_ENTRIES, LISTING_ENTRIES + 1]) {
    if (count >= LISTING_ENTRIES) await residue(namespace, count - 3, count - 2);
    expect((await readdir(namespace)).length).toBe(count);
    const retained = await inventory(namespace);
    for (const kind of ["runs", "slots", "manifests"] as const) {
      resources().checkActive();
      const next = join(dir, kind); if (next !== namespace) { await rename(namespace, next); namespace = next; }
      const result = await invoke([kind, "--dir", dir]);
      if (count > LISTING_ENTRIES) refused(result);
      else { expect(result.exitCode).toBe(0); expect(JSON.parse(result.stdout)[kind]).toHaveLength(1); }
      expect(await inventory(namespace)).toBe(retained);
      expect(await readFile(join(namespace, ".held.lock"), "utf8")).toBe(owner);
    }
  }
});

test("an absent listing is empty but a non-directory namespace remains an IO failure", async () => {
  const dir = await temporary();
  for (const kind of ["runs", "slots", "manifests"] as const) {
    const absent = await invoke([kind, "--dir", dir]);
    expect(absent.exitCode).toBe(0); expect(JSON.parse(absent.stdout)[kind]).toEqual([]);
    await writeFile(join(dir, kind), owner);
    const invalid = await invoke([kind, "--dir", dir]);
    expect(invalid.exitCode).toBe(2); expect(invalid.stdout).toBe("");
    expect(JSON.parse(invalid.stderr)).toMatchObject({ error: "IO_FAILED" });
    expect(await readFile(join(dir, kind), "utf8")).toBe(owner);
  }
});

test("listing records bound regular-file bytes and refuse FIFOs while retaining per-record diagnostics", async () => {
  const dir = await temporary();
  for (const kind of ["runs", "slots", "manifests"] as const) {
    const namespace = join(dir, kind); await mkdir(namespace);
    const limit = kind === "slots" ? 262_144 : 67_108_864;
    const oversized = join(namespace, "oversized.json"), fifo = join(namespace, "fifo.json");
    const file = await open(oversized, "w");
    try { await file.truncate(limit + 1); } finally { await file.close(); }
    const maker = await runCommand(["/usr/bin/mkfifo", fifo], root, { timeoutMs: 2000, maxOutputBytes: 4096 });
    expect(maker.exitCode).toBe(0); expect(maker.timedOut).toBe(false);
    expect(maker.outputExceeded).toBe(false); expect(maker.signal).toBeNull(); expect(maker.cleanupObserved).toBe(true);
    await writeFile(join(namespace, "valid.json"), '{"fixture":"retained"}');
    const result = await invoke([kind, "--dir", dir]);
    expect(result.exitCode).toBe(0);
    const rows = JSON.parse(result.stdout)[kind] as { error?: string }[];
    expect(rows).toHaveLength(3);
    expect(rows.filter(row => row.error === undefined)).toHaveLength(1);
    const errors = rows.flatMap(row => row.error === undefined ? [] : [row.error]);
    expect(errors).toHaveLength(2);
    expect(errors.every(error => error.includes("regular file byte bound"))).toBe(true);
    expect((await lstat(oversized)).size).toBe(limit + 1);
    expect((await lstat(fifo)).isFIFO()).toBe(true);
    expect(await readFile(join(namespace, "valid.json"), "utf8")).toBe('{"fixture":"retained"}');
  }
});

test("module scans enforce the physical limit before loading matched manifests", async () => {
  const dir = await temporary(), modules = join(dir, "modules"); await mkdir(modules);
  const input = join(modules, "input.algal.json"); await writeFile(input, JSON.stringify(manifest));
  await writeFile(join(modules, ".held.lock"), owner);
  await residue(modules, 0, MODULE_ENTRIES - 3);
  for (const count of [MODULE_ENTRIES - 1, MODULE_ENTRIES, MODULE_ENTRIES + 1]) {
    if (count >= MODULE_ENTRIES) await residue(modules, count - 3, count - 2);
    expect((await readdir(modules)).length).toBe(count);
    const retained = await inventory(modules), store = join(dir, `store-${count}`);
    const result = await invoke(["check", input, "--modules", modules, "--dir", store]);
    if (count > MODULE_ENTRIES) {
      refused(result);
      await expect(lstat(join(store, "manifests"))).rejects.toMatchObject({ code: "ENOENT" });
    } else expect(result.exitCode).toBe(0);
    expect(await inventory(modules)).toBe(retained);
    expect(await readFile(join(modules, ".held.lock"), "utf8")).toBe(owner);
  }
});

for (const count of [MODULES - 1, MODULES, MODULES + 1]) {
  test(`${count} module filenames retain the separate 512 logical limit despite deduplicated content`, async () => {
    const dir = await temporary(), modules = join(dir, "modules"); await mkdir(modules);
    const input = join(dir, "input.algal.json"), body = JSON.stringify(manifest); await writeFile(input, body);
    await writeFile(join(modules, ".held.lock"), owner);
    for (let offset = 0; offset < count; offset += 32) {
      resources().checkActive();
      await Promise.all(Array.from({ length: Math.min(32, count - offset) }, (_, index) =>
        resources().own(link(input, join(modules, `module-${offset + index}.algal.json`)))));
    }
    const retained = await inventory(modules);
    const result = await invoke(["check", input, "--modules", modules, "--dir", join(dir, "store")]);
    if (count > MODULES) refused(result);
    else expect(result.exitCode).toBe(0);
    expect(await inventory(modules)).toBe(retained);
    expect(await readFile(join(modules, ".held.lock"), "utf8")).toBe(owner);
  });
}
