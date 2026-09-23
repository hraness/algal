import { afterEach, expect, test } from "bun:test";
import { mkdir, mkdtemp, readFile, readdir, realpath, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join, relative, resolve } from "node:path";
import { digestCanonical } from "./digest";
import { AlgalError } from "./errors";
import { ensureDurableDirectory, withDurableFsProbe, type DurableFsEvent } from "./durable-fs";
import { hostRead, hostWrite } from "./host-state";
import { FileMailboxService } from "./mailbox";
import { FileStore } from "./store";

const owned: string[] = [];
afterEach(async () => { await Promise.all(owned.splice(0).map(path => rm(path, { recursive: true, force: true }))); });
async function temporary(): Promise<string> {
  const path = await realpath(await mkdtemp(join(tmpdir(), "algal-publication-")));
  owned.push(path);
  return path;
}
type Entry = { kind: "file" | "directory"; inode: string };
type Record = DurableFsEvent & { bytes?: Buffer; openedInode?: string };

// Deliberately separate volatile contents from directory bindings. fsync of a
// directory never implies file-content persistence or persistence of its own
// binding in its parent. The fixture root is an explicit durable initial anchor.
// This is a conditional crash-image model, not a power-loss emulator.
class Image {
  visible = new Map<string, Entry>();
  contents = new Map<string, Buffer>();
  durable = new Map<string, Entry>();
  saved = new Map<string, Buffer>();

  clone(): Image {
    const next = new Image();
    next.visible = new Map(this.visible); next.contents = new Map(this.contents);
    next.durable = new Map(this.durable); next.saved = new Map(this.saved);
    return next;
  }
  apply(record: Record, anchor: string): void {
    const path = relative(anchor, record.path);
    if (path.startsWith("..") || resolve(anchor, path) !== record.path) return;
    const target = record.target === undefined ? undefined : relative(anchor, record.target);
    if (record.step === "mkdir") this.visible.set(path, { kind: "directory", inode: path });
    if (record.step === "write-temp" || record.step === "create-lock") {
      if (record.openedInode === undefined || record.bytes === undefined) throw new Error("missing real write observation");
      this.visible.set(path, { kind: "file", inode: record.openedInode });
      this.contents.set(record.openedInode, record.bytes);
    }
    if (record.step === "file-sync") {
      const bytes = this.contents.get(record.inode!);
      if (bytes === undefined) throw new Error("file sync has no opened-inode contents");
      this.saved.set(record.inode!, bytes);
    }
    if (record.step === "link" || record.step === "replace") {
      const source = this.visible.get(path);
      if (source === undefined || target === undefined) throw new Error("publication lacks its observed source");
      this.visible.set(target, source);
      if (record.step === "replace") this.visible.delete(path);
    }
    if (record.step.startsWith("unlink-")) this.visible.delete(path);
    if (record.step === "dir-sync") {
      const parent = path === "" ? "." : path;
      for (const name of this.durable.keys()) if (dirname(name) === parent) this.durable.delete(name);
      for (const [name, value] of this.visible) if (dirname(name) === parent) this.durable.set(name, value);
    }
  }
  backgroundBinding(path: string): void {
    const entry = this.visible.get(path);
    if (entry) this.durable.set(path, entry);
    else this.durable.delete(path);
  }
  async materialize(): Promise<string> {
    const root = await temporary();
    const reachable = new Set(["."]);
    for (const [path, entry] of [...this.durable].sort(([a], [b]) => a.split("/").length - b.split("/").length)) {
      if (!reachable.has(dirname(path))) continue;
      if (entry.kind === "directory") { await mkdir(join(root, path)); reachable.add(path); }
      else await writeFile(join(root, path), this.saved.get(entry.inode) ?? Buffer.alloc(0));
    }
    return root;
  }
}

async function snapshot(root: string, durable = true): Promise<Image> {
  const image = new Image();
  async function walk(path: string): Promise<void> {
    for (const entry of await readdir(path, { withFileTypes: true })) {
      const absolute = join(path, entry.name);
      const info = await stat(absolute);
      const inode = `${info.dev}:${info.ino}`;
      const name = relative(root, absolute);
      image.visible.set(name, { kind: entry.isDirectory() ? "directory" : "file", inode });
      if (entry.isDirectory()) await walk(absolute);
      else image.contents.set(inode, await readFile(absolute));
    }
  }
  await walk(root);
  if (durable) { image.durable = new Map(image.visible); image.saved = new Map(image.contents); }
  return image;
}

async function trace<T>(root: string, action: () => Promise<T>): Promise<{ result: T; records: Record[] }> {
  const records: Record[] = [];
  const result = await withDurableFsProbe(async event => {
    if (event.phase !== "after" || relative(root, event.path).startsWith("..")) return;
    const record: Record = { ...event };
    if (event.step === "write-temp" || event.step === "create-lock") {
      const info = await stat(event.path);
      record.openedInode = `${info.dev}:${info.ino}`;
      record.bytes = await readFile(event.path);
    }
    records.push(record);
  }, action);
  return { result, records };
}
function replay(initial: Image, root: string, records: Record[], omit: (record: Record) => boolean = () => false): Image {
  const image = initial.clone();
  for (const record of records) if (!omit(record)) image.apply(record, root);
  return image;
}

test("acknowledged CAS and selected head survive modeled crash; every required barrier has a negative control", async () => {
  const root = await temporary();
  const storeRoot = join(root, "new", "nested", "store");
  const { result: digest, records } = await trace(root, async () => {
    const digest = await new FileStore(storeRoot).putValue({ selected: 1 });
    await hostWrite(join(storeRoot, "head.json"), { value: digest }, 1024, false);
    return digest;
  });
  const check = async (image: Image): Promise<boolean> => {
    const cold = await image.materialize();
    try {
      const store = new FileStore(join(cold, "new/nested/store"));
      return JSON.stringify(await store.getValue(digest)) === '{"selected":1}' &&
        JSON.stringify(await hostRead(join(cold, "new/nested/store/head.json"), 1024)) === JSON.stringify({ value: digest });
    } catch { return false; }
  };
  expect(await check(replay(new Image(), root, records))).toBe(true);
  // Remove every occurrence for a necessary binding: later redundant syncs
  // must not accidentally hide a deliberately omitted barrier class.
  for (const path of [root, join(root, "new"), join(root, "new/nested"), storeRoot, join(storeRoot, "values")]) {
    expect(records.some(record => record.step === "dir-sync" && record.path === path)).toBe(true);
    expect(await check(replay(new Image(), root, records, record => record.step === "dir-sync" && record.path === path))).toBe(false);
  }
  const valueTemp = records.find(record => record.step === "link" && record.target?.includes("/values/"))!.path;
  expect(await check(replay(new Image(), root, records, record => record.step === "file-sync" && record.path === valueTemp))).toBe(false);
});

test("visible ancestors are synchronized and retained first winner is synced through its admitted inode", async () => {
  const root = await temporary();
  const dir = join(root, "visible", "store");
  await mkdir(join(dir, "effects"), { recursive: true });
  const requestDigest = digestCanonical("retained request");
  const path = join(dir, "effects", `${requestDigest.slice(7)}.json`);
  const first = { requestDigest, executor: "actual executor", output: "first" };
  await writeFile(path, JSON.stringify(first));
  const initial = await snapshot(root, false);
  const info = await stat(path);
  const inode = `${info.dev}:${info.ino}`;
  const { records } = await trace(root, () => new FileStore(dir).putEffect({ ...first, output: "loser" }));
  const retainedSync = records.filter(record => record.step === "file-sync" && record.path === path);
  expect(retainedSync).toHaveLength(1);
  expect(retainedSync[0]!.inode).toBe(inode);
  const cold = await replay(initial, root, records).materialize();
  expect(await new FileStore(join(cold, "visible/store")).getEffect(requestDigest)).toEqual(first);
  const omitted = await replay(initial, root, records, record => record.step === "file-sync" && record.path === path).materialize();
  await expect(new FileStore(join(omitted, "visible/store")).getEffect(requestDigest)).rejects.toThrow();
  expect(await readFile(path, "utf8")).toBe(JSON.stringify(first));
});

test("every fresh-publication before/after I/O failure rejects without deleting unrelated state or rolling back a published object", async () => {
  for (const phase of ["before", "after"] as const) {
    for (const step of ["mkdir", "write-temp", "file-sync", "link", "dir-sync", "unlink-temp"] as const) {
      const root = await temporary();
      const dir = join(root, "child", "store");
      const unrelated = join(root, ".tmp-unrelated");
      await writeFile(unrelated, "owned by someone else");
      let reached = false;
      const fault = new AlgalError("IO_FAILED", `injected ${phase} ${step}`);
      await expect(withDurableFsProbe(event => {
        if (!reached && event.phase === phase && event.step === step && event.path.startsWith(root)) {
          reached = true; throw fault;
        }
      }, () => new FileStore(dir).putValue("retained despite uncertainty"))).rejects.toBe(fault);
      expect(reached).toBe(true);
      expect(await readFile(unrelated, "utf8")).toBe("owned by someone else");
      const value = await new FileStore(dir).getValue(digestCanonical("retained despite uncertainty"));
      if (step === "unlink-temp" || (step === "link" && phase === "after")) expect(value).toBe("retained despite uncertainty");
      else expect(value === undefined || value === "retained despite uncertainty").toBe(true);
    }
  }
});

test("mailbox acknowledged transfer needs consumed, pending deletion and lock-release barriers", async () => {
  const root = await temporary();
  const service = new FileMailboxService(root);
  const config = await service.create("transfer");
  const key = digestCanonical("transfer key");
  const sent = await service.send(config.send, "payload", key);
  const initial = await snapshot(root);
  const { records, result } = await trace(root, () => service.receive(config.receive));
  expect(result).toEqual({ id: sent.id, message: "payload" });
  const consumedDir = join(root, "mailboxes/transfer/consumed");
  const pendingDir = join(root, "mailboxes/transfer/pending");
  const mailboxDir = join(root, "mailboxes/transfer");
  const consumedLink = records.findIndex(record => record.step === "link" && dirname(record.target!) === consumedDir);
  const consumedSync = records.findIndex((record, index) => index > consumedLink && record.step === "dir-sync" && record.path === consumedDir);
  const pendingUnlink = records.findIndex(record => record.step === "unlink-pending");
  const release = records.findIndex(record => record.step === "unlink-lock");
  expect(consumedLink).toBeGreaterThanOrEqual(0);
  expect(consumedSync).toBeGreaterThan(consumedLink);
  expect(pendingUnlink).toBeGreaterThan(consumedSync);
  expect(release).toBeGreaterThan(pendingUnlink);
  const cold = await replay(initial, root, records).materialize();
  expect(await new FileMailboxService(cold).hasPending(config.receive)).toBe(false);
  expect(await new FileMailboxService(cold).send(config.send, "payload", key)).toEqual(sent);

  // Without consumed publication, an acknowledged receive can be redelivered.
  const missingConsumed = await replay(initial, root, records, record => record.step === "dir-sync" && record.path === consumedDir).materialize();
  const unsafe = new FileMailboxService(missingConsumed);
  await unsafe.send(config.send, "payload", key);
  expect(await unsafe.receive(config.receive)).toEqual(result);
  for (const omit of [
    (record: Record) => record.step === "dir-sync" && record.path === pendingDir,
    (record: Record) => record.step === "dir-sync" && record.path === mailboxDir && records.indexOf(record) > release,
  ]) {
    const image = await replay(initial, root, records, omit).materialize();
    await expect(new FileMailboxService(image).hasPending(config.receive)).rejects.toMatchObject({ code: "IO_FAILED" });
  }
  const consumedFile = records[consumedLink]!.path;
  const unsynced = await replay(initial, root, records, record => record.step === "file-sync" && record.path === consumedFile).materialize();
  await expect(new FileMailboxService(unsynced).send(config.send, "payload", key)).rejects.toThrow();
});

test("every recorded receive prefix preserves a delivery witness under independent background persistence", async () => {
  const root = await temporary();
  const service = new FileMailboxService(root);
  const config = await service.create("prefixes");
  const key = digestCanonical("prefix message");
  await service.send(config.send, "payload", key);
  const initial = await snapshot(root);
  const { records } = await trace(root, () => service.receive(config.receive));
  expect(records.length).toBeLessThan(128);
  const pending = `mailboxes/prefixes/pending/${key.slice(7)}.json`;
  const consumed = `mailboxes/prefixes/consumed/${key.slice(7)}.json`;
  const lock = "mailboxes/prefixes/.lock";
  for (const background of [[], [pending], [consumed], [pending, consumed]]) {
    const image = initial.clone();
    for (let prefix = 0; prefix <= records.length; prefix++) {
      const cold = await image.materialize();
      const exists = async (path: string): Promise<boolean> => {
        try { await stat(join(cold, path)); return true; }
        catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return false; throw error; }
      };
      const hasPending = await exists(pending);
      const hasConsumed = await exists(consumed);
      const locked = await exists(lock);
      expect(hasPending || hasConsumed).toBe(true);
      const reopened = new FileMailboxService(cold);
      if (locked || (hasPending && hasConsumed)) await expect(reopened.hasPending(config.receive)).rejects.toMatchObject({ code: "IO_FAILED" });
      else expect(await reopened.hasPending(config.receive)).toBe(hasPending);
      if (prefix === records.length) {
        expect([hasPending, hasConsumed, locked]).toEqual([false, true, false]);
      } else {
        image.apply(records[prefix]!, root);
        for (const path of background) image.backgroundBinding(path);
      }
    }
  }
});

test("mutable slot ACK persists the replacement rather than merely the old binding", async () => {
  const root = await temporary();
  const store = new FileStore(root);
  await store.setSlot("memory", "old");
  const initial = await snapshot(root);
  const { records } = await trace(root, () => store.setSlot("memory", "new"));
  const cold = await replay(initial, root, records).materialize();
  expect(await new FileStore(cold).getSlot("memory")).toBe("new");
  const slots = join(root, "slots");
  const old = await replay(initial, root, records, record => record.step === "dir-sync" && record.path === slots).materialize();
  expect(await new FileStore(old).getSlot("memory")).toBe("old");
  const incomplete = await replay(initial, root, records, record => record.step === "file-sync").materialize();
  await expect(new FileStore(incomplete).getSlot("memory")).rejects.toThrow();
});

test("a consumed-first interruption preserves dual markers and never silently replays; failed release never removes a successor lock", async () => {
  const root = await temporary();
  const service = new FileMailboxService(root);
  const config = await service.create("uncertain");
  const key = digestCanonical("interrupted transfer");
  await service.send(config.send, "payload", key);
  const fault = new AlgalError("IO_FAILED", "injected before pending removal");
  let reached = false;
  await expect(withDurableFsProbe(event => {
    if (event.step === "unlink-pending" && event.phase === "before") { reached = true; throw fault; }
  }, () => service.receive(config.receive))).rejects.toBe(fault);
  expect(reached).toBe(true);
  await expect(service.hasPending(config.receive)).rejects.toMatchObject({ code: "IO_FAILED" });
  for (const namespace of ["pending", "consumed"]) expect((await readdir(join(root, "mailboxes/uncertain", namespace)))).toContain(`${key.slice(7)}.json`);

  const next = await service.create("release");
  const lock = join(root, "mailboxes/release/.lock");
  let released = false;
  await expect(withDurableFsProbe(async event => {
    if (!released && event.phase === "after" && event.step === "unlink-lock" && event.path === lock) {
      released = true; await writeFile(lock, "successor owns this lock"); throw fault;
    }
  }, () => service.hasPending(next.receive))).rejects.toBe(fault);
  expect(released).toBe(true);
  expect(await readFile(lock, "utf8")).toBe("successor owns this lock");
});

test("relative and aliased existing ancestors are normalized without treating visibility as durability", async () => {
  const root = await temporary();
  const path = join(root, "already", "here");
  await mkdir(path, { recursive: true });
  const observed: string[] = [];
  await withDurableFsProbe(event => {
    if (event.phase === "after" && event.step === "dir-sync") observed.push(event.path);
  }, () => ensureDurableDirectory(relative(process.cwd(), path)));
  expect(observed).toContain(path);
  expect(observed).toContain(dirname(path));
  expect(observed).toContain(root);
  expect(observed.at(-1)).toBe("/");
  expect(observed.every(path => basename(path) !== "..")).toBe(true);
});
