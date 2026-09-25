import { copyFile, lstat, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, test } from "bun:test";
import { parseCapabilityHandle } from "./capabilities";
import { digestCanonical } from "./digest";
import { parseOrganismManifest, type OrganismManifest } from "./contract";
import { externalWakeKey, FileMailboxService, mailboxToolRegistry, MemoryMailboxService } from "./mailbox";
import { MemoryStore } from "./store";
import { runOrganism } from "./run";
import { resumeRun, verifyReceipt } from "./verify";
import type { JsonValue } from "./values";

const directories: string[] = [];
afterEach(async () => {
  await Promise.all(directories.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

function receiverManifest(): OrganismManifest {
  return parseOrganismManifest({
    contract: "algal.organism.v1",
    key: "organism:mailbox-receiver",
    name: "Mailbox receiver",
    cells: [
      {
        id: "source",
        kind: "input",
        outputs: {
          inbox: { type: "cap", capability: "mailbox-receive" },
        },
      },
      { id: "wait", kind: "tool", tool: "mailbox.receive.v1" },
    ],
    edges: [
      {
        from: { cell: "source", port: "inbox" },
        to: { cell: "wait", port: "mailbox" },
      },
    ],
  });
}

describe("mailbox capabilities", () => {
  test("operations reject missing admitted mailbox directories without recreating them", async () => {
    const dir = await mkdtemp(join(tmpdir(), "algal-mailbox-missing-layout-"));
    directories.push(dir);
    const service = new FileMailboxService(dir);
    const config = await service.create("incomplete");
    const messages = join(dir, "mailboxes/incomplete/messages");
    await rm(messages, { recursive: true });
    await expect(service.send(config.send, "message", digestCanonical("missing layout"))).rejects.toThrow();
    await expect(lstat(messages)).rejects.toMatchObject({ code: "ENOENT" });
  });

  for (const operation of ["receive", "hasPending", "retry"] as const) {
    test(`ambiguous pending and consumed evidence rejects ${operation} without reconciliation`, async () => {
      const dir = await mkdtemp(join(tmpdir(), "algal-mailbox-uncertain-"));
      directories.push(dir);
      const service = new FileMailboxService(dir);
      const config = await service.create("uncertain");
      const key = digestCanonical("uncertain delivery");
      await service.send(config.send, "message", key);
      const pending = join(dir, "mailboxes/uncertain/pending", `${key.slice(7)}.json`);
      const consumed = join(dir, "mailboxes/uncertain/consumed", `${key.slice(7)}.json`);
      await copyFile(pending, consumed);
      const before = await readFile(pending);
      const reopened = new FileMailboxService(dir);
      const invoke = () => operation === "receive" ? reopened.receive(config.receive)
        : operation === "hasPending" ? reopened.hasPending(config.receive)
        : reopened.send(config.send, "message", key);
      await expect(invoke()).rejects.toMatchObject({ code: "IO_FAILED" });
      expect(await readFile(pending)).toEqual(before);
      expect(await readFile(consumed)).toEqual(before);
      await writeFile(consumed, JSON.stringify({ contract: "algal.mailbox-delivery.v1", id: digestCanonical("foreign") }));
      const conflict = await readFile(consumed);
      await expect(invoke()).rejects.toMatchObject({ code: "DIGEST_MISMATCH" });
      expect(await readFile(pending)).toEqual(before);
      expect(await readFile(consumed)).toEqual(conflict);
    });
  }

  test("send is idempotent, receive is bounded, and revocation fails closed", async () => {
    const service = new MemoryMailboxService();
    const mailbox = await service.create("worker", {
      maxMessages: 1,
      maxMessageBytes: 32,
    });
    const key = externalWakeKey();
    const first = await service.send(mailbox.send, { task: "one" }, key);
    expect(await service.send(mailbox.send, { task: "one" }, key)).toEqual(first);
    await expect(service.send(mailbox.send, { task: "two" }, externalWakeKey()))
      .rejects.toMatchObject({ code: "MAILBOX_FULL" });
    expect(await service.receive(mailbox.receive)).toEqual({
      id: first.id,
      message: { task: "one" },
    });
    expect(await service.send(mailbox.send, { task: "one" }, key)).toEqual(first);
    await expect(service.send(mailbox.send, { task: "changed" }, key))
      .rejects.toMatchObject({ code: "DIGEST_MISMATCH" });
    await expect(service.receive(mailbox.receive))
      .rejects.toMatchObject({ code: "EFFECT_SUSPENDED" });
    await service.revoke(mailbox.send);
    await expect(service.send(mailbox.send, null, externalWakeKey()))
      .rejects.toMatchObject({ code: "CAPABILITY_DENIED" });
  });

  test("file mailboxes survive process boundaries and retain consumed evidence", async () => {
    const dir = await mkdtemp(join(tmpdir(), "algal-mailbox-"));
    directories.push(dir);
    const creator = new FileMailboxService(dir);
    const mailbox = await creator.create("durable");
    const key = externalWakeKey();
    const sent = await creator.send(mailbox.send, ["wake"], key);
    const reopened = new FileMailboxService(dir);
    expect(await reopened.receive(mailbox.receive)).toEqual({
      id: sent.id,
      message: ["wake"],
    });
    expect(await reopened.send(mailbox.send, ["wake"], key)).toEqual(sent);
    await expect(reopened.receive(mailbox.receive))
      .rejects.toMatchObject({ code: "EFFECT_SUSPENDED" });
    expect(await reopened.inspect("durable")).toEqual(mailbox);
    expect(await reopened.list()).toEqual([mailbox]);
  });

  test("file capability tampering and symlinked authority stores fail closed", async () => {
    const dir = await mkdtemp(join(tmpdir(), "algal-mailbox-audit-"));
    directories.push(dir);
    const service = new FileMailboxService(dir);
    const mailbox = await service.create("audited");
    await expect(service.send(mailbox.send, null, "../../escaped" as never))
      .rejects.toThrow();
    const digest = parseCapabilityHandle(mailbox.send).digest.slice(7);
    const recordPath = join(dir, "capabilities", `${digest}.json`);
    const record = JSON.parse(await readFile(recordPath, "utf8"));
    record.mailbox = "other";
    await writeFile(recordPath, JSON.stringify(record));
    await expect(service.send(mailbox.send, null, externalWakeKey()))
      .rejects.toMatchObject({ code: "DIGEST_MISMATCH" });

    const linked = await mkdtemp(join(tmpdir(), "algal-mailbox-link-"));
    directories.push(linked);
    const outside = join(linked, "outside");
    await mkdir(outside);
    await symlink(outside, join(linked, "mailboxes"));
    await expect(new FileMailboxService(linked).create("escaped"))
      .rejects.toMatchObject({ code: "IO_FAILED" });
    await expect(service.inspect("../escaped")).rejects.toThrow();
  });

  test("an empty receive suspends, an external message wakes resume, and both receipts verify", async () => {
    const service = new MemoryMailboxService();
    const mailbox = await service.create("wakeable");
    const manifest = receiverManifest();
    const tools = mailboxToolRegistry(service);
    const store = new MemoryStore();
    const suspended = await runOrganism({
      manifest,
      args: { source: { inbox: mailbox.receive } },
      store,
      fns: new Map(),
      executors: [],
      tools,
    });
    expect(suspended.outcome).toBe("suspended");
    expect(suspended.cells.wait?.status).toBe("suspended");
    expect(suspended.effects[0]).toMatchObject({
      executor: "tool:mailbox.receive.v1",
      error: { code: "EFFECT_SUSPENDED" },
      retryable: false,
    });
    const verifiedSuspended = await verifyReceipt(
      suspended as unknown as JsonValue,
      manifest as unknown as JsonValue,
      store,
      new Map(),
      undefined,
      tools,
    );
    expect(verifiedSuspended.ok).toBe(true);
    const wake = await service.send(mailbox.send, { command: "continue" }, externalWakeKey());
    const resumed = await resumeRun(
      suspended as unknown as JsonValue,
      manifest as unknown as JsonValue,
      store,
      [],
      new Map(),
      undefined,
      tools,
    );
    expect(resumed.outcome).toBe("complete");
    expect(resumed.cells.wait?.outputs).toEqual({
      id: wake.id,
      message: { command: "continue" },
    });
    expect(resumed.effects[0]?.requestDigest).toBe(suspended.effects[0]?.requestDigest);
    const verifiedResumed = await verifyReceipt(
      resumed as unknown as JsonValue,
      manifest as unknown as JsonValue,
      store,
      new Map(),
      undefined,
      tools,
    );
    expect(verifiedResumed.ok).toBe(true);
  });

  test("capability classes are structural and manifests cannot mint handles", async () => {
    expect(() => parseOrganismManifest({
      contract: "algal.organism.v1",
      key: "organism:mint-cap",
      name: "Mint cap",
      cells: [{
        id: "mint",
        kind: "const",
        outputs: {
          out: {
            type: "cap",
            capability: "mailbox-send",
            value: "cap:mailbox-send:sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          },
        },
      }],
      edges: [],
    })).toThrow("cannot mint capability handles");

    const service = new MemoryMailboxService();
    const mailbox = await service.create("typed");
    const manifest = parseOrganismManifest({
      contract: "algal.organism.v1",
      key: "organism:wrong-cap-class",
      name: "Wrong cap class",
      cells: [
        {
          id: "source",
          kind: "input",
          outputs: { cap: { type: "cap", capability: "mailbox-send" } },
        },
        { id: "wait", kind: "tool", tool: "mailbox.receive.v1" },
      ],
      edges: [{
        from: { cell: "source", port: "cap" },
        to: { cell: "wait", port: "mailbox" },
      }],
    });
    await expect(runOrganism({
      manifest,
      args: { source: { cap: mailbox.send } },
      store: new MemoryStore(),
      fns: new Map(),
      executors: [],
      tools: mailboxToolRegistry(service),
    })).rejects.toThrow("cannot feed");
  });
});
