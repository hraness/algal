import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { digestCanonical, type Digest } from "./digest";
import { AlgalError } from "./errors";
import {
  HOST_EVENT_BOUNDS, HOST_MESSAGE_CONTRACT, HostEventService,
  hostEventMessage, type HostEventInput,
} from "./host-events";
import { FileMailboxService, type MailboxService } from "./mailbox";
import type { JsonValue } from "./values";

const directories: string[] = [];
const children: Bun.Subprocess[] = [];
afterEach(async () => {
  for (const child of children.splice(0)) { if (child.exitCode === null) child.kill("SIGKILL"); await child.exited; }
  await Promise.all(directories.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});
async function setup() {
  const dir = await mkdtemp(join(tmpdir(), "algal-host-events-"));
  directories.push(dir);
  const mailboxes = new FileMailboxService(dir);
  const mailbox = await mailboxes.create("work");
  return {
    dir, mailboxes, mailbox,
    input: { source: "github", deliveryId: "delivery-1", target: mailbox.send, payload: { head: "abc" } } satisfies HostEventInput,
  };
}
function markerPath(dir: string, status: string, eventId: Digest) {
  return join(dir, "host-events", status, `${eventId.slice(7)}.json`);
}

describe("durable host events", () => {
  test("immediate event survives restart; identical admission and delivery are deduped after consumption", async () => {
    const { dir, mailbox, mailboxes, input } = await setup();
    const admitted = await new HostEventService(dir).enqueue(input);
    expect(admitted.status).toBe("pending");
    const resumed = new HostEventService(dir);
    expect(await resumed.enqueue(input)).toEqual(admitted);
    const [delivered] = await resumed.deliverDue();
    expect(delivered?.status).toBe("delivered");
    const message = await mailboxes.receive(mailbox.receive);
    expect(message.message).toEqual({ contract: HOST_MESSAGE_CONTRACT, eventId: admitted.event.eventId, payload: input.payload });
    expect(delivered?.messageId).toBe(message.id);
    expect(await new HostEventService(dir).deliverDue()).toEqual([]);
    expect((await resumed.enqueue(input)).status).toBe("delivered");
    expect(await mailboxes.hasPending(mailbox.receive)).toBe(false);
  });

  test("same source and deliveryId rejects conflicting target, payload, or timer deadline", async () => {
    const { dir, mailboxes, input } = await setup();
    const service = new HostEventService(dir);
    const second = await mailboxes.create("other");
    await service.enqueue(input);
    for (const patch of [{ target: second.send }, { payload: "different" }, { dueAtMs: 0 }])
      await expect(service.enqueue({ ...input, ...patch })).rejects.toThrow("already claims different content");
    const otherSource = await service.enqueue({ ...input, source: "ci" });
    expect(otherSource.event.eventId).not.toBe((await service.enqueue(input)).event.eventId);
  });

  test("timer persists its deadline but delivers a stable clock-free envelope after restart", async () => {
    const { dir, mailbox, mailboxes, input } = await setup();
    let now = 1_000;
    const event = await new HostEventService(dir, undefined, { now: () => now }).enqueue({ ...input, dueAtMs: 2_000 });
    expect(await new HostEventService(dir, undefined, { now: () => now }).deliverDue()).toEqual([]);
    now = 2_000;
    const restored = new HostEventService(dir, undefined, { now: () => now });
    expect((await restored.list())[0]?.event.dueAtMs).toBe(2_000);
    expect(await restored.deliverDue()).toHaveLength(1);
    expect((await mailboxes.receive(mailbox.receive)).message).toEqual({
      contract: HOST_MESSAGE_CONTRACT, eventId: event.event.eventId,
      timer: event.event.eventId, payload: input.payload,
    });
    now = 90_000;
    expect((await restored.enqueue({ ...input, dueAtMs: 2_000 })).status).toBe("delivered");
    expect(hostEventMessage(event.event)).not.toHaveProperty("dueAtMs");
    expect(hostEventMessage(event.event)).not.toHaveProperty("observedAt");
  });

  test("interruption after send acknowledgement loss retries the same mailbox key without requeueing consumed work", async () => {
    const { dir, mailboxes, mailbox, input } = await setup();
    let sent = false;
    const interrupted: MailboxService = {
      create: (n, o) => mailboxes.create(n, o), list: () => mailboxes.list(),
      inspect: (n) => mailboxes.inspect(n), revoke: (h) => mailboxes.revoke(h),
      receive: (h) => mailboxes.receive(h), hasPending: (h) => mailboxes.hasPending(h),
      send: async (handle, value, key) => {
        await mailboxes.send(handle, value, key);
        sent = true;
        throw new AlgalError("IO_FAILED", "simulated lost acknowledgement after durable mailbox send");
      },
    };
    const service = new HostEventService(dir, interrupted);
    const admission = await service.enqueue(input);
    await expect(service.deliverDue()).rejects.toThrow("lost acknowledgement");
    expect(sent).toBe(true);
    expect((await service.list())[0]?.status).toBe("sending");
    const received = await mailboxes.receive(mailbox.receive);
    const restored = new HostEventService(dir);
    const [reconciled] = await restored.deliverDue();
    expect(reconciled?.messageId).toBe(received.id);
    expect(await mailboxes.hasPending(mailbox.receive)).toBe(false);
    expect((await restored.cancel(admission.event.eventId)).reason).toBe("too-late");
    expect(await restored.deliverDue()).toEqual([]);
  });

  test("cancellation persists; sending intent is too late even if the mailbox rejected the send", async () => {
    const { dir, mailboxes, mailbox, input } = await setup();
    const service = new HostEventService(dir);
    const first = await service.enqueue(input);
    expect((await service.cancel(first.event.eventId)).cancelled).toBe(true);
    expect((await new HostEventService(dir).cancel(first.event.eventId)).reason).toBe("already-cancelled");
    expect(await service.deliverDue()).toEqual([]);
    expect(await mailboxes.hasPending(mailbox.receive)).toBe(false);
    const second = await service.enqueue({ ...input, deliveryId: "delivery-2" });
    await mailboxes.revoke(mailbox.send);
    await expect(service.deliverDue()).rejects.toThrow();
    const cancelled = await service.cancel(second.event.eventId);
    expect(cancelled).toMatchObject({ cancelled: false, reason: "too-late", event: { status: "sending" } });
  });

  test("cancellation racing an in-flight mailbox send explicitly reports too late", async () => {
    const { dir, mailboxes, input } = await setup();
    let release!: () => void;
    const blocked = new Promise<void>((done) => { release = done; });
    let started!: () => void;
    const entered = new Promise<void>((done) => { started = done; });
    const sender: MailboxService = {
      create: (n, o) => mailboxes.create(n, o), list: () => mailboxes.list(),
      inspect: (n) => mailboxes.inspect(n), revoke: (h) => mailboxes.revoke(h),
      receive: (h) => mailboxes.receive(h), hasPending: (h) => mailboxes.hasPending(h),
      send: async (handle, value, key) => {
        started(); await blocked;
        return mailboxes.send(handle, value, key);
      },
    };
    const service = new HostEventService(dir, sender);
    const event = await service.enqueue(input);
    const dispatch = service.deliverDue();
    await entered;
    try {
      expect((await new HostEventService(dir).cancel(event.event.eventId)).reason).toBe("too-late");
    } finally { release(); }
    expect(await dispatch).toHaveLength(1);
  });

  test("legacy event lease fails closed and is never automatically reclaimed", async () => {
    const { dir, input } = await setup();
    const service = new HostEventService(dir);
    const snapshot = await service.enqueue(input);
    const lock = join(dir, "host-events", "locks", `${snapshot.event.eventId.slice(7)}.lock`);
    await writeFile(lock, '{"pid":2147483647}');
    await expect(new HostEventService(dir).deliverDue()).rejects.toThrow("reconcile the owning operation");
    await expect(new HostEventService(dir).cancel(snapshot.event.eventId)).rejects.toThrow("reconcile the owning operation");
    expect(await readFile(lock, "utf8")).toBe('{"pid":2147483647}');
  });

  test("real SIGKILL after mailbox send recovers its owner lease and never requeues consumed work", async () => {
    const { dir, input, mailboxes, mailbox } = await setup();
    const admitted = await new HostEventService(dir).enqueue(input);
    const child = Bun.spawn([process.execPath, "--eval", `
      import {HostEventService} from ${JSON.stringify(join(import.meta.dir, "host-events.ts"))};
      import {FileMailboxService} from ${JSON.stringify(join(import.meta.dir, "mailbox.ts"))};
      const mailbox = new FileMailboxService(${JSON.stringify(dir)});
      const interrupted = {send:async(...args)=>{
        await mailbox.send(...args); console.log("ready");
        setInterval(()=>{},1000); return await new Promise(()=>{});
      }};
      await new HostEventService(${JSON.stringify(dir)}, interrupted).deliverDue();
    `], {stdin:"ignore", stdout:"pipe", stderr:"pipe"});
    children.push(child);
    const reader = child.stdout.getReader();
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      const chunk = await Promise.race([
        reader.read(),
        new Promise<never>((_, reject) => { timeout = setTimeout(() => reject(new Error("event child did not send")), 5_000); }),
      ]);
      if (!new TextDecoder().decode(chunk.value).includes("ready"))
        throw new Error(`event child failed: ${await new Response(child.stderr).text()}`);
    } finally { if (timeout !== undefined) clearTimeout(timeout); reader.releaseLock(); }
    const ownerDir = join(dir, "host-events", "owners", admitted.event.eventId.slice(7));
    const oldMarker = await readFile(join(ownerDir, ".lock"), "utf8");
    child.kill("SIGKILL"); await child.exited;
    const received = await mailboxes.receive(mailbox.receive);
    const restored = new HostEventService(dir);
    expect((await restored.list())[0]?.status).toBe("sending");
    const [delivered] = await restored.deliverDue();
    expect(delivered?.messageId).toBe(received.id);
    expect(await mailboxes.hasPending(mailbox.receive)).toBe(false);
    expect(await restored.deliverDue()).toEqual([]);
    const history = await readdir(join(ownerDir, "owners"));
    expect(history).toHaveLength(1);
    expect(await readFile(join(ownerDir, "owners", history[0]!), "utf8")).toBe(oldMarker);
  });

  test("an existing identical admission remains readable while a stale creation lease blocks new events", async () => {
    const { dir, input } = await setup();
    const service = new HostEventService(dir);
    const existing = await service.enqueue(input);
    const lock = join(dir, "host-events", "locks", "admission.lock");
    await writeFile(lock, "crashed creator");
    expect(await new HostEventService(dir).enqueue(input)).toEqual(existing);
    await expect(service.enqueue({ ...input, deliveryId: "new" })).rejects.toThrow("reconcile the owning operation");
    await expect(service.enqueue({ ...input, payload: "conflict" })).rejects.toThrow("already claims different content");
    expect(await readFile(lock, "utf8")).toBe("crashed creator");
  });

  test("invalid inputs and bounded timer horizon are rejected before admission", async () => {
    const { dir, input, mailbox } = await setup();
    const service = new HostEventService(dir, undefined, { now: () => 1_000 });
    const cyclic: { child?: unknown } = {}; cyclic.child = cyclic;
    for (const patch of [
      { source: "../escape" }, { deliveryId: "" },
      { deliveryId: "a".repeat(HOST_EVENT_BOUNDS.maxDeliveryIdChars + 1) },
      { target: mailbox.receive }, { payload: "x".repeat(HOST_EVENT_BOUNDS.maxPayloadBytes + 1) },
      { payload: cyclic }, { payload: undefined }, { dueAtMs: -1 },
      { dueAtMs: 1_000 + HOST_EVENT_BOUNDS.maxTimerHorizonMs + 1 }, { unknown: true },
    ]) await expect(service.enqueue({ ...input, ...patch } as HostEventInput)).rejects.toThrow();
    expect(await service.list()).toEqual([]);
    expect((await service.enqueue({ ...input, dueAtMs: 0 })).status).toBe("pending");
  });

  test("tampered intent and planted leaf symlinks are rejected without dispatch", async () => {
    const { dir, input, mailboxes, mailbox } = await setup();
    const service = new HostEventService(dir);
    const first = await service.enqueue(input);
    const forged = {
      contract: "algal.host-delivery.v1", eventId: first.event.eventId,
      admissionDigest: digestCanonical(null), status: "sending",
    };
    await writeFile(markerPath(dir, "sending", first.event.eventId), JSON.stringify(forged));
    await expect(service.deliverDue()).rejects.toThrow("does not match its admission");
    expect(await mailboxes.hasPending(mailbox.receive)).toBe(false);
    await rm(markerPath(dir, "sending", first.event.eventId));
    const victim = join(dir, "victim.txt");
    await writeFile(victim, "retained");
    await symlink(victim, markerPath(dir, "sending", first.event.eventId));
    await expect(service.deliverDue()).rejects.toThrow("symlinks");
    expect(await readFile(victim, "utf8")).toBe("retained");
  });

  test("retained admission count stays bounded without deleting dedupe history", async () => {
    const { dir, input } = await setup();
    const service = new HostEventService(dir);
    const original = await service.enqueue(input);
    // Seed valid immutable admissions directly to avoid 1024 unrelated fsyncs.
    for (let i = 1; i < HOST_EVENT_BOUNDS.maxEvents; i++) {
      const deliveryId = `delivery-${i + 1}`;
      const eventId = digestCanonical({ contract: "algal.host-event.v1", source: input.source, deliveryId });
      await writeFile(markerPath(dir, "events", eventId), JSON.stringify({ ...original.event, deliveryId, eventId }));
    }
    await expect(service.enqueue({ ...input, deliveryId: "one-too-many" })).rejects.toThrow("count exceeded");
    expect((await service.enqueue(input)).event).toEqual(original.event);
  });
});

describe("bounded host polling", () => {
  test("sleeping timer wakes after restart and each pass can schedule ready work", async () => {
    const { dir, input } = await setup();
    let now = 1_000;
    const clock = { now: () => now, sleep: async (ms: number) => { now += ms; } };
    await new HostEventService(dir, undefined, clock).enqueue({ ...input, dueAtMs: 1_010 });
    const passes: number[] = [];
    const result = await new HostEventService(dir, undefined, clock).poll({
      maxPasses: 4, maxDeliveries: 4, maxDurationMs: 1_000, intervalMs: 10,
      afterPass: async (delivered) => { passes.push(delivered.length); },
    });
    expect(passes).toEqual([0, 1]);
    expect(result).toMatchObject({ passes: 2, reason: "idle" });
    expect(result.delivered).toHaveLength(1);
  });

  test("cancellation stops subsequent passes and delivers no work when pre-aborted", async () => {
    const { dir, input } = await setup();
    const controller = new AbortController();
    const service = new HostEventService(dir);
    await service.enqueue(input);
    controller.abort();
    const options = { maxPasses: 2, maxDeliveries: 1, maxDurationMs: 1_000, signal: controller.signal };
    expect(await service.poll(options)).toEqual({ passes: 0, delivered: [], reason: "cancelled" });
    expect(await service.deliverDue({ signal: controller.signal })).toEqual([]);
    const active = new AbortController();
    const result = await service.poll({ ...options, signal: active.signal, afterPass: async () => { active.abort(); } });
    expect(result.reason).toBe("cancelled");
    expect(result.passes).toBe(1);
    expect(result.delivered).toHaveLength(1);
  });

  test("pass, delivery and duration bounds stop admission of additional work", async () => {
    const { dir, input } = await setup();
    const service = new HostEventService(dir, undefined, { now: () => 0, sleep: async () => {} });
    await service.enqueue({ ...input, dueAtMs: 10_000 });
    expect((await service.poll({ maxPasses: 1, maxDeliveries: 2, maxDurationMs: 1_000 })).reason).toBe("pass-limit");
    await service.enqueue({ ...input, deliveryId: "immediate" });
    await service.enqueue({ ...input, deliveryId: "immediate-2" });
    const limited = await service.poll({ maxPasses: 4, maxDeliveries: 1, maxDurationMs: 1_000 });
    expect(limited.reason).toBe("delivery-limit");
    expect(limited.delivered).toHaveLength(1);
    const duration = await service.poll({
      maxPasses: 4, maxDeliveries: 4, maxDurationMs: 1,
      afterPass: async () => { await new Promise((done) => setTimeout(done, 5)); },
    });
    expect(duration.reason).toBe("duration-limit");
    expect(duration.passes).toBeLessThanOrEqual(1);
    await expect(service.poll({ maxPasses: 0, maxDeliveries: 1, maxDurationMs: 10 })).rejects.toThrow();
    await expect(service.enqueue({ ...input, deliveryId: "bad-json", payload: undefined as unknown as JsonValue })).rejects.toThrow();
  });
});
