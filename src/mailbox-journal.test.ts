import { expect, test } from "bun:test";
import { mkdtemp, readFile, readdir, realpath, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseOrganismManifest } from "./contract";
import { digestCanonical } from "./digest";
import { withDurableFsProbe } from "./durable-fs";
import { AlgalError } from "./errors";
import { FileMailboxService, mailboxToolRegistry } from "./mailbox";
import { ProcessSupervisor } from "./process";
import { asObject, type JsonValue } from "./values";

test("a lost mailbox receive return keeps the journal started and blocks fallback and recovery", async () => {
  const root = await realpath(await mkdtemp(join(tmpdir(), "algal-mailbox-journal-")));
  try {
    const service = new FileMailboxService(root), config = await service.create("model", { maxMessages: 1, maxMessageBytes: 64 });
    const key = digestCanonical("lost return"), sent = await service.send(config.send, "message", key);
    const tools = mailboxToolRegistry(service);
    let fallbackCalls = 0;
    tools.set("fallback.v1", {
      signature: { inputs: { error: { type: "json" } }, outputs: { value: { type: "text" } }, effect: "write", cost: 1, maxOutputBytes: 1000 },
      configurationDigest: digestCanonical("mailbox lost-return fallback"),
      tool: async () => { fallbackCalls++; return { value: "fallback executed" }; },
    });
    const vm = new ProcessSupervisor(root, { mailboxes: service, tools, journal: true });
    await vm.create("actor", parseOrganismManifest({ contract: "algal.organism.v1", key: "organism:mailbox-lost-return", name: "Mailbox lost return",
      cells: [{ id: "source", kind: "input", outputs: { mailbox: { type: "cap", capability: "mailbox-receive" } } },
        { id: "receive", kind: "tool", tool: "mailbox.receive.v1" }, { id: "fallback", kind: "tool", tool: "fallback.v1" }],
      edges: [{ from: { cell: "source", port: "mailbox" }, to: { cell: "receive", port: "mailbox" } },
        { from: { cell: "receive", port: "message" }, to: { cell: "fallback", port: "error" }, on: "fail" }],
    }), { source: { mailbox: config.receive } });
    const base = join(root, "mailboxes", "model");
    let unlinked = false, injected = false;
    let started: JsonValue | undefined;
    const result = await withDurableFsProbe(async event => {
      if (event.step === "unlink-lock" && event.phase === "after" && event.path === join(base, ".lock")) unlinked = true;
      if (unlinked && !injected && event.step === "dir-sync" && event.phase === "after" && event.path === base) {
        injected = true;
        started = await vm.journal("actor");
        throw new AlgalError("IO_FAILED", "lost dequeue return after lock-release sync");
      }
    }, () => vm.tick("actor")).then(value => ({ value }), error => ({ error }));
    expect(injected).toBe(true);
    expect(result).toMatchObject({ error: { code: "IO_FAILED", uncertain: true } });
    expect(fallbackCalls).toBe(0);
    const uncertain = await vm.inspect("actor");
    expect(uncertain.process.status).toBe("uncertain");
    expect(uncertain.process.receipt).toBeUndefined();
    if (started === undefined) throw new Error("lost-return cut did not retain the started journal");
    const entries = asObject(started, "journal").effects as { record: { state: string; recovery: string; receipt?: unknown } }[];
    expect(entries).toHaveLength(1);
    expect(entries[0]?.record).toMatchObject({ state: "started", recovery: "never" });
    expect(entries[0]?.record.receipt).toBeUndefined();
    expect(await vm.journal("actor")).toEqual(started);
    expect(await readdir(join(base, "pending"))).toEqual([]);
    expect(JSON.parse(await readFile(join(base, "consumed", `${key.slice(7)}.json`), "utf8"))).toEqual({ contract: "algal.mailbox-delivery.v1", id: sent.id });
    const reopened = new ProcessSupervisor(root, { mailboxes: new FileMailboxService(root), tools, journal: true });
    await expect(reopened.recover("actor", uncertain.digest)).rejects.toThrow("unknown completion");
    expect((await reopened.inspect("actor")).digest).toBe(uncertain.digest);
    expect(await reopened.journal("actor")).toEqual(started);
    expect(fallbackCalls).toBe(0);
  } finally { await rm(root, { recursive: true, force: true }); }
}, 20_000);
