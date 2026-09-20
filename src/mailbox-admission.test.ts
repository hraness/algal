import { afterEach, expect, test } from "bun:test";
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { digestCanonical } from "./digest";
import { hostLease } from "./host-state";
import { FileMailboxService, MAILBOX_BOUNDS, type MailboxConfig } from "./mailbox";
import { canonicalize, type JsonValue } from "./values";

const roots: string[] = [];
afterEach(async () => {
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true });
});
async function directory(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "algal-mailbox-admission-"));
  roots.push(root);
  return root;
}
function gate() {
  let release!: () => void;
  const promise = new Promise<void>(resolve => { release = resolve; });
  return { promise, release };
}
class PausedCreator extends FileMailboxService {
  readonly entered = gate();
  readonly resume = gate();
  private paused = false;
  override async inspect(name: string): Promise<MailboxConfig | undefined> {
    const existing = await super.inspect(name);
    if (!this.paused) {
      this.paused = true;
      this.entered.release();
      await this.resume.promise;
    }
    return existing;
  }
}
async function write(path: string, value: JsonValue): Promise<void> {
  await writeFile(path, canonicalize(value));
}

test("creation custody excludes a conflicting creator before bounds can widen", async () => {
  const root = await directory();
  const first = new PausedCreator(root);
  const peer = new FileMailboxService(root);
  const creating = first.create("same", { maxMessages: 1, maxMessageBytes: 32 });
  try {
    await first.entered.promise;
    await expect(peer.create("same", { maxMessages: 64, maxMessageBytes: 1024 }))
      .rejects.toMatchObject({ code: "IO_FAILED" });
    expect(await peer.inspect("same")).toBeUndefined();
  } finally { first.resume.release(); }
  const admitted = await creating;
  expect(admitted).toMatchObject({ maxMessages: 1, maxMessageBytes: 32 });
  await expect(peer.create("same", { maxMessages: 64, maxMessageBytes: 1024 }))
    .rejects.toMatchObject({ code: "PARSE_FAILED" });
  expect(await peer.create("same", { maxMessages: 1, maxMessageBytes: 32 })).toEqual(admitted);
  expect(await readdir(join(root, "capabilities"))).toHaveLength(2);
});

test("the standard host lease prevents any mailbox admission and is released after failure", async () => {
  const root = await directory();
  const service = new FileMailboxService(root);
  await hostLease(join(root, ".mailbox-admission"), "mailbox-admission", async () => {
    await expect(service.create("blocked")).rejects.toMatchObject({ code: "IO_FAILED" });
    expect(await service.list()).toEqual([]);
  });
  await service.create("admitted");
  expect((await service.list()).map(item => item.name)).toEqual(["admitted"]);
  expect(await readdir(join(root, ".mailbox-admission"))).not.toContain(".lock");
});

test("concurrent admission at capacity never publishes an extra identity or capability", async () => {
  const root = await directory();
  const service = new FileMailboxService(root);
  const template = await service.create("seed", { maxMessages: 1, maxMessageBytes: 8 });
  // Capacity is the number of published configurations. These valid-format,
  // unused fixtures avoid quadratic creation and thousands of unrelated fsyncs.
  await Promise.all(Array.from({ length: MAILBOX_BOUNDS.maxMailboxes - 2 }, async (_, index) => {
    const name = `seed-${index + 1}`;
    await mkdir(join(root, "mailboxes", name));
    await write(join(root, "mailboxes", name, "config.json"), { ...template, name });
  }));
  expect(await service.list()).toHaveLength(MAILBOX_BOUNDS.maxMailboxes - 1);
  const first = new PausedCreator(root);
  const creating = first.create("last-a", { maxMessages: 1, maxMessageBytes: 8 });
  try {
    await first.entered.promise;
    await expect(service.create("last-b", { maxMessages: 1, maxMessageBytes: 8 }))
      .rejects.toMatchObject({ code: "IO_FAILED" });
  } finally { first.resume.release(); }
  await creating;
  await expect(service.create("last-b", { maxMessages: 1, maxMessageBytes: 8 }))
    .rejects.toMatchObject({ code: "BUDGET_EXHAUSTED" });
  expect(await service.inspect("last-b")).toBeUndefined();
  expect(await service.list()).toHaveLength(MAILBOX_BOUNDS.maxMailboxes);
  expect(await readdir(join(root, "capabilities"))).toHaveLength(4);
}, 20_000);

test("a self-consistent oversized claim remains pending; exact UTF-8 byte limits succeed", async () => {
  const root = await directory();
  const service = new FileMailboxService(root);
  const config = await service.create("small", { maxMessages: 2, maxMessageBytes: 4 });
  const key = digestCanonical("oversize");
  const envelope = { contract: "algal.mailbox-message.v1", mailbox: "small", idempotencyKey: key, value: "éé" };
  const id = digestCanonical(envelope);
  const file = `${key.slice(7)}.json`;
  const message = join(root, "mailboxes", "small", "messages", file);
  const pending = join(root, "mailboxes", "small", "pending", file);
  await write(message, { ...envelope, id });
  await write(pending, { contract: "algal.mailbox-delivery.v1", id });
  const before = [await readFile(message, "utf8"), await readFile(pending, "utf8")];
  await expect(service.receive(config.receive)).rejects.toMatchObject({ code: "BUDGET_EXHAUSTED" });
  expect([await readFile(message, "utf8"), await readFile(pending, "utf8")]).toEqual(before);
  expect(await readdir(join(root, "mailboxes", "small", "consumed"))).toEqual([]);
  const exact = await service.create("exact", { maxMessages: 2, maxMessageBytes: 4 });
  await service.send(exact.send, "é", key);
  expect(await service.receive(exact.receive)).toMatchObject({ message: "é" });
});


test("Bun mailbox FIFO rejection terminates in an owned child and preserves the pending marker", async () => {
  const root = await directory();
  const service = new FileMailboxService(root);
  const config = await service.create("fifo", { maxMessages: 2, maxMessageBytes: 32 });
  const key = digestCanonical("fifo-claim");
  await service.send(config.send, "hello", key);
  const file = `${key.slice(7)}.json`;
  const claim = join(root, "mailboxes", "fifo", "messages", file);
  const pending = join(root, "mailboxes", "fifo", "pending", file);
  const before = await readFile(pending, "utf8");
  await rm(claim);
  const make = Bun.spawn(["/usr/bin/mkfifo", claim], { stdout: "ignore", stderr: "pipe" });
  expect(await make.exited).toBe(0);
  const child = Bun.spawn([process.execPath, "--eval", `
    import {FileMailboxService} from ${JSON.stringify(join(import.meta.dir, "mailbox.ts"))};
    try { await new FileMailboxService(${JSON.stringify(root)}).receive(${JSON.stringify(config.receive)}); process.exit(1); }
    catch (error) { console.log(error.code); process.exit(error.code === "BUDGET_EXHAUSTED" ? 0 : 2); }
  `], { stdin: "ignore", stdout: "pipe", stderr: "pipe", timeout: 5_000, killSignal: "SIGKILL" });
  try {
    const [code, stdout, stderr] = await Promise.all([child.exited, new Response(child.stdout).text(), new Response(child.stderr).text()]);
    expect({ code, stdout: stdout.trim(), stderr }).toEqual({ code: 0, stdout: "BUDGET_EXHAUSTED", stderr: "" });
  } finally { if (child.exitCode === null) child.kill("SIGKILL"); await child.exited; }
  expect(await readFile(pending, "utf8")).toBe(before);
  expect(await readdir(join(root, "mailboxes", "fifo", "consumed"))).toEqual([]);
});


test("invalid UTF-8 and BOM artifacts are refused without consuming a replacement-character claim", async () => {
  const root = await directory();
  const service = new FileMailboxService(root);
  const config = await service.create("encoding", { maxMessages: 2, maxMessageBytes: 32 });
  const key = digestCanonical("replacement-claim");
  await service.send(config.send, "\uFFFD", key);
  const file = `${key.slice(7)}.json`;
  const base = join(root, "mailboxes", "encoding");
  const claimPath = join(base, "messages", file);
  const pendingPath = join(base, "pending", file);
  const configPath = join(base, "config.json");
  const originalClaim = await readFile(claimPath);
  const originalConfig = await readFile(configPath);
  const pending = await readFile(pendingPath);
  const offset = originalClaim.indexOf(Buffer.from("\uFFFD"));
  expect(offset).toBeGreaterThanOrEqual(0);
  // The stored digest is correct for U+FFFD. A replacing decoder would silently
  // admit this malformed byte as that value and consume the pending marker.
  const malformed = Buffer.concat([originalClaim.subarray(0, offset), Buffer.from([0xff]), originalClaim.subarray(offset + 3)]);
  for (const bytes of [malformed, Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), originalClaim])]) {
    await writeFile(claimPath, bytes);
    await expect(service.receive(config.receive)).rejects.toMatchObject({ code: "PARSE_FAILED" });
    expect(await readFile(claimPath)).toEqual(bytes);
    expect(await readFile(pendingPath)).toEqual(pending);
    expect(await readdir(join(base, "consumed"))).toEqual([]);
  }
  await writeFile(claimPath, originalClaim);
  const invalidConfig = Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), originalConfig]);
  await writeFile(configPath, invalidConfig);
  await expect(service.receive(config.receive)).rejects.toMatchObject({ code: "PARSE_FAILED" });
  expect(await readFile(configPath)).toEqual(invalidConfig);
  expect(await readFile(pendingPath)).toEqual(pending);
  expect(await readdir(join(base, "consumed"))).toEqual([]);
  await writeFile(configPath, originalConfig);
  expect(await service.receive(config.receive)).toMatchObject({ message: "\uFFFD" });
});
