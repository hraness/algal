import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseWakeCapabilities, suspensionDetails, suspensionWake } from "./capabilities";
import { manifestToJson, parseOrganismManifest } from "./contract";
import { digestCanonical } from "./digest";
import { parseEffectReceipt, type Executor } from "./effects";
import { AlgalError } from "./errors";
import { externalWakeKey, FileMailboxService, mailboxToolRegistry, MemoryMailboxService } from "./mailbox";
import { parseRunReceipt, receiptDigest, runOrganism } from "./run";
import { MemoryStore } from "./store";
import { resumeRun, verifyReceipt } from "./verify";
import type { JsonValue } from "./values";
import type { ToolRegistry } from "./tools";

const directories: string[] = [];
afterEach(async () => {
  await Promise.all(directories.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

const waitManifest = parseOrganismManifest({
  contract: "algal.organism.v1", key: "organism:vm-wait", name: "VM wait",
  cells: [{ id: "wait", kind: "agent", prompt: "Wait for work", output: { kind: "text" } }],
});

describe("VM resume boundaries", () => {
  test("wake handles are bounded, unique, and present only on suspension", async () => {
    const service = new MemoryMailboxService();
    const mailbox = await service.create("wake");
    expect(parseWakeCapabilities([mailbox.receive])).toEqual([mailbox.receive]);
    for (const invalid of [[], [mailbox.receive, mailbox.receive], Array(17).fill(mailbox.receive), ["fake"]]) {
      expect(() => parseWakeCapabilities(invalid)).toThrow();
    }
    expect(suspensionWake(new AlgalError("TOOL_FAILED", "failure", suspensionDetails(mailbox.receive)))).toEqual([]);
    expect(() => parseEffectReceipt({
      requestDigest: externalWakeKey(), output: "done", executor: "test", wake: [mailbox.receive],
    })).toThrow("requires EFFECT_SUSPENDED");
    const executor: Executor = {
      id: "wake-driver",
      receiptFor: () => ({ wake: [mailbox.receive] }),
      execute: async () => { throw new AlgalError("EFFECT_SUSPENDED", "waiting"); },
    };
    const store = new MemoryStore();
    const receipt = await runOrganism({ manifest: waitManifest, store, fns: new Map(), executors: [executor] });
    expect(receipt.effects[0]?.wake).toEqual([mailbox.receive]);
    expect((await verifyReceipt(receipt as unknown as JsonValue, manifestToJson(waitManifest), store, new Map())).ok).toBe(true);
    const failed = await runOrganism({ manifest: waitManifest, store, fns: new Map(), executors: [{
      ...executor, execute: async () => { throw new AlgalError("EFFECT_FAILED", "failure"); },
    }] });
    expect(failed.effects[0]?.wake).toBeUndefined();
  });

  test("resume suppresses completed slot writes while later reads and writes remain live", async () => {
    const manifest = parseOrganismManifest({
      contract: "algal.organism.v1", key: "organism:vm-slots", name: "VM slots",
      cells: [
        { id: "source", kind: "const", outputs: { value: { type: "json", value: "old" } } },
        { id: "before", kind: "slot", name: "shared", mode: "write" },
        { id: "wait", kind: "agent", prompt: "Wait", output: { kind: "text" } },
        { id: "read", kind: "slot", name: "shared", mode: "read" },
        { id: "after", kind: "slot", name: "result", mode: "write" },
      ],
      edges: [
        { from: { cell: "source", port: "value" }, to: { cell: "before", port: "data" } },
        { from: { cell: "read", port: "data" }, to: { cell: "after", port: "data" } },
      ],
    });
    const store = new MemoryStore();
    const checkpoint = await runOrganism({ manifest, store, fns: new Map(), executors: [{
      id: "wait", execute: async () => { throw new AlgalError("EFFECT_SUSPENDED", "waiting"); },
    }] });
    expect(checkpoint.outcome).toBe("suspended");
    expect(await store.getSlot("shared")).toBe("old");
    await store.setSlot("shared", "newer");
    let calls = 0;
    const resumed = await resumeRun(checkpoint as unknown as JsonValue, manifestToJson(manifest), store, [{
      id: "wait", execute: async () => { calls++; return "ready"; },
    }], new Map());
    expect(resumed.outcome).toBe("complete");
    expect(calls).toBe(1);
    expect(await store.getSlot("shared")).toBe("newer");
    expect(await store.getSlot("result")).toBe("newer");
    expect(resumed.cells.read?.outputs?.data).toBe("newer");
    expect((await verifyReceipt(resumed as unknown as JsonValue, manifestToJson(manifest), store, new Map())).ok).toBe(true);
  });

  for (const kind of ["organism", "spawn"] as const) {
    test(`${kind} propagates child suspension, replays the write prefix, and resumes its tail`, async () => {
      const store = new MemoryStore();
      let prefixWrites = 0;
      let tailWrites = 0;
      const tools: ToolRegistry = new Map([
        ["test.prefix.v1", {
          signature: { inputs: {}, outputs: { value: { type: "text" } }, effect: "write", cost: 1, maxOutputBytes: 256 },
          tool: async () => { prefixWrites++; return { value: "retained prefix" }; },
        }],
        ["test.tail.v1", {
          signature: { inputs: { value: { type: "json" } }, outputs: {}, effect: "write", cost: 1, maxOutputBytes: 256 },
          tool: async () => { tailWrites++; return {}; },
        }],
      ]);
      const child = parseOrganismManifest({
        contract: "algal.organism.v1", key: "organism:nested-wait", name: "Nested wait",
        interface: { inputs: {}, outputs: { result: { cell: "wait", port: "out" } } },
        cells: [
          { id: "prefix", kind: "tool", tool: "test.prefix.v1" },
          { id: "wait", kind: "agent", inputs: { value: "text" }, prompt: "Wait for approval", output: { kind: "text" } },
        ],
        edges: [{ from: { cell: "prefix", port: "value" }, to: { cell: "wait", port: "value" } }],
      });
      const childDigest = await store.putManifest(child);
      const manifest = parseOrganismManifest({
        contract: "algal.organism.v1", key: `organism:nested-${kind}`, name: "Nested continuation",
        cells: kind === "organism" ? [
          { id: "nested", kind, manifest: childDigest },
          { id: "tail", kind: "tool", tool: "test.tail.v1" },
        ] : [
          { id: "definition", kind: "const", outputs: { value: { type: "json", value: manifestToJson(child) } } },
          { id: "nested", kind },
          { id: "tail", kind: "tool", tool: "test.tail.v1" },
        ],
        edges: [
          ...(kind === "spawn" ? [{ from: { cell: "definition", port: "value" }, to: { cell: "nested", port: "manifest" } }] : []),
          { from: { cell: "nested", port: kind === "organism" ? "result" : "data" }, to: { cell: "tail", port: "value" } },
        ],
      });
      const checkpoint = await runOrganism({ manifest, store, fns: new Map(), tools, executors: [{
        id: "approval", execute: async () => { throw new AlgalError("EFFECT_SUSPENDED", "approval pending"); },
      }] });
      expect(checkpoint.outcome).toBe("suspended");
      expect(checkpoint.cells["nested/prefix"]?.status).toBe("committed");
      expect(checkpoint.cells["nested/wait"]?.status).toBe("suspended");
      expect(checkpoint.cells.nested?.status).toBe("suspended");
      expect(checkpoint.cells.tail).toBeUndefined();
      expect(checkpoint.events.filter(event => event.kind === "cell.suspend").map(event => event.path))
        .toEqual(["nested/wait", "nested"]);
      expect(prefixWrites).toBe(1);
      expect(tailWrites).toBe(0);
      expect((await verifyReceipt(checkpoint as unknown as JsonValue, manifestToJson(manifest), store, new Map(), undefined, tools)).ok).toBe(true);
      const resumed = await resumeRun(checkpoint as unknown as JsonValue, manifestToJson(manifest), store, [{
        id: "approval", execute: async () => "approved",
      }], new Map(), undefined, tools);
      expect(resumed.outcome).toBe("complete");
      expect(resumed.cells.nested?.status).toBe("committed");
      expect(resumed.cells.tail?.status).toBe("committed");
      expect(resumed.cells["nested/wait"]?.outputs?.out).toBe("approved");
      expect(prefixWrites).toBe(1);
      expect(tailWrites).toBe(1);
      expect((await verifyReceipt(resumed as unknown as JsonValue, manifestToJson(manifest), store, new Map(), undefined, tools)).ok).toBe(true);
      expect(prefixWrites).toBe(1);
      expect(tailWrites).toBe(1);
    });
  }

  test("resume routes live when its replay prefix ends between retry attempts", async () => {
    const manifest = parseOrganismManifest({
      contract: "algal.organism.v1", key: "organism:vm-retry", name: "VM retry",
      cells: [{ id: "wait", kind: "agent", prompt: "Wait", output: { kind: "text" }, retry: { attempts: 3 } }],
    });
    const store = new MemoryStore();
    let initialCalls = 0;
    const checkpoint = await runOrganism({ manifest, store, fns: new Map(), executors: [{
      id: "wait", execute: async () => {
        if (++initialCalls === 1) throw new AlgalError("EFFECT_FAILED", "temporary failure");
        throw new AlgalError("EFFECT_SUSPENDED", "waiting");
      },
    }] });
    expect(checkpoint.outcome).toBe("suspended");
    expect(checkpoint.effects).toHaveLength(2);
    let liveCalls = 0;
    const resumed = await resumeRun(checkpoint as unknown as JsonValue, manifestToJson(manifest), store, [{
      id: "wait", execute: async () => { liveCalls++; return "ready"; },
    }], new Map());
    expect(resumed.outcome).toBe("complete");
    expect(liveCalls).toBe(1);
    expect(resumed.effects).toHaveLength(2);
    expect(resumed.effects[0]?.error?.code).toBe("EFFECT_FAILED");
    expect(resumed.effects[1]?.output).toBe("ready");
  });

  test("tampered checkpoints never reach live execution, even with a recomputed digest", async () => {
    const store = new MemoryStore();
    const checkpoint = await runOrganism({ manifest: waitManifest, store, fns: new Map(), executors: [{
      id: "wait", execute: async () => { throw new AlgalError("EFFECT_SUSPENDED", "waiting"); },
    }] });
    let calls = 0;
    const live: Executor = { id: "wait", execute: async () => { calls++; return "live"; } };
    const corrupt = structuredClone(checkpoint);
    corrupt.work.units++;
    await expect(resumeRun(corrupt as unknown as JsonValue, manifestToJson(waitManifest), store, [live], new Map()))
      .rejects.toMatchObject({ code: "DIGEST_MISMATCH" });
    corrupt.digest = receiptDigest(corrupt);
    await expect(resumeRun(corrupt as unknown as JsonValue, manifestToJson(waitManifest), store, [live], new Map()))
      .rejects.toMatchObject({ code: "RECEIPT_MISMATCH" });
    expect(calls).toBe(0);
    expect(() => parseRunReceipt({ ...checkpoint, unexpected: true })).toThrow("unknown key");
    expect(() => parseRunReceipt({ ...checkpoint, outcome: ["suspended"] })).toThrow("unknown receipt outcome");
    expect(() => parseRunReceipt({ ...checkpoint, cells: { wait: { ...checkpoint.cells.wait, status: ["suspended"] } } })).toThrow("unknown receipt cell status");
    expect(() => parseRunReceipt({ ...checkpoint, events: [{ ...checkpoint.events[0], kind: ["run.start"] }] })).toThrow("unknown receipt event kind");
    const malformed = structuredClone(checkpoint);
    malformed.effects[0]!.requestDigest = "bad" as never;
    expect(() => parseRunReceipt(malformed)).toThrow();
    let deep: unknown = null;
    for (let i = 0; i < 65; i++) deep = { deeper: deep };
    expect(() => parseRunReceipt({ ...checkpoint, args: { source: { deep } } })).toThrow("structural bounds");
  });
});

describe("VM mailbox readiness and serialization", () => {
  test("readiness requires active receive authority and never consumes a message", async () => {
    const dir = await mkdtemp(join(tmpdir(), "algal-ready-"));
    directories.push(dir);
    for (const service of [new MemoryMailboxService(), new FileMailboxService(dir)]) {
      const mailbox = await service.create("ready");
      expect(await service.hasPending(mailbox.receive)).toBe(false);
      await expect(service.hasPending(mailbox.send)).rejects.toThrow();
      const sent = await service.send(mailbox.send, "work", externalWakeKey());
      expect(await service.hasPending(mailbox.receive)).toBe(true);
      expect(await service.hasPending(mailbox.receive)).toBe(true);
      expect(await service.receive(mailbox.receive)).toEqual({ id: sent.id, message: "work" });
      await service.revoke(mailbox.receive);
      await expect(service.hasPending(mailbox.receive)).rejects.toMatchObject({ code: "CAPABILITY_DENIED" });
    }
  });

  test("concurrent senders cannot overflow a one-message mailbox", async () => {
    const dir = await mkdtemp(join(tmpdir(), "algal-send-race-"));
    directories.push(dir);
    const service = new FileMailboxService(dir);
    const mailbox = await service.create("bounded", { maxMessages: 1 });
    const results = await Promise.allSettled(Array.from({ length: 12 }, (_, index) =>
      new FileMailboxService(dir).send(mailbox.send, index, externalWakeKey())));
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    for (const result of results) {
      if (result.status === "rejected") expect(["IO_FAILED", "MAILBOX_FULL"]).toContain(result.reason.code);
    }
    expect(await service.hasPending(mailbox.receive)).toBe(true);
    await service.receive(mailbox.receive);
    expect(await service.hasPending(mailbox.receive)).toBe(false);
  });

  test("an existing lock fails closed and is never automatically reclaimed", async () => {
    const dir = await mkdtemp(join(tmpdir(), "algal-held-lock-"));
    directories.push(dir);
    const service = new FileMailboxService(dir);
    const mailbox = await service.create("locked");
    const lock = join(dir, "mailboxes", "locked", ".lock");
    await writeFile(lock, "uncertain prior operation");
    for (const operation of [
      () => service.send(mailbox.send, "work", externalWakeKey()),
      () => service.receive(mailbox.receive),
      () => service.revoke(mailbox.send),
      () => service.hasPending(mailbox.receive),
    ]) await expect(operation()).rejects.toMatchObject({ code: "IO_FAILED" });
    expect(await readFile(lock, "utf8")).toBe("uncertain prior operation");
  });

  test("mailbox suspension records exact wake authority and verifies offline", async () => {
    const service = new MemoryMailboxService();
    const mailbox = await service.create("receipted");
    const manifest = parseOrganismManifest({
      contract: "algal.organism.v1", key: "organism:vm-receive", name: "VM receive",
      cells: [
        { id: "in", kind: "input", outputs: { cap: { type: "cap", capability: "mailbox-receive" } } },
        { id: "receive", kind: "tool", tool: "mailbox.receive.v1" },
      ],
      edges: [{ from: { cell: "in", port: "cap" }, to: { cell: "receive", port: "mailbox" } }],
    });
    const store = new MemoryStore();
    const tools = mailboxToolRegistry(service);
    const checkpoint = await runOrganism({ manifest, args: { in: { cap: mailbox.receive } }, store, fns: new Map(), executors: [], tools });
    expect(checkpoint.effects[0]?.wake).toEqual([mailbox.receive]);
    await service.revoke(mailbox.receive);
    expect((await verifyReceipt(checkpoint as unknown as JsonValue, manifestToJson(manifest), store, new Map(), undefined, tools)).ok).toBe(true);
    expect(checkpoint.digest).toBe(digestCanonical(Object.fromEntries(Object.entries(checkpoint).filter(([key]) => key !== "digest")) as JsonValue));
  });
});
