/// <reference lib="dom" />
/// <reference lib="dom.asynciterable" />
/** IndexedDbHostEventService contract tests on the fake IndexedDB harness
 * (`idb-fake.ts`). Assert the same observable behavior as the file driver:
 * admission dedupe by source/deliveryId, durable intent before mailbox
 * acknowledgement, terminal status transitions, cancel races, bounded poll,
 * and durable snapshots across connections. */
import { beforeAll, describe, expect, test } from "bun:test";
import { AlgalError } from "./errors";
import { asIdbFactory, installFakeIdb } from "./idb-fake";
import { IndexedDbHostEventService } from "./host-events-idb";
import type { HostEventInput } from "./host-events-core";
import { IndexedDbMailboxService, MAILBOX_IDB_NAME } from "./mailbox-idb";
import { MemoryMailboxService, type MailboxConfig } from "./mailbox-core";
import type { JsonValue } from "./values";

let factory: IDBFactory;
async function code(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
    return "OK";
  } catch (error) {
    return error instanceof AlgalError ? error.code : String(error);
  }
}
const input = (
  target: MailboxConfig["send"],
  source: string,
  deliveryId: string,
  payload: JsonValue = { ping: true },
  dueAtMs?: number,
): HostEventInput => ({
  source,
  deliveryId,
  target,
  payload,
  ...(dueAtMs === undefined ? {} : { dueAtMs }),
});

beforeAll(() => {
  factory = asIdbFactory(installFakeIdb());
});

describe("IndexedDbHostEventService", () => {
  test("enqueue admits once per source/deliveryId and dedupes replays", async () => {
    const mailboxes = new MemoryMailboxService();
    const mb = await mailboxes.create("inbox");
    const service = await IndexedDbHostEventService.open({ name: "t.he.admit", factory, mailboxes });
    const snap = await service.enqueue(input(mb.send, "webhook", "evt-1"));
    expect(snap.status).toBe("pending");
    expect(snap.event.eventId).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(snap.event.contract).toBe("algal.host-event.v1");
    // Replay of the same admission resolves the retained snapshot.
    const again = await service.enqueue(input(mb.send, "webhook", "evt-1"));
    expect(again.event.eventId).toBe(snap.event.eventId);
    expect(again.status).toBe("pending");
    // Same source/deliveryId carrying different content is an immutable conflict.
    expect(await code(service.enqueue(input(mb.send, "webhook", "evt-1", { different: 1 })))).toBe("DIGEST_MISMATCH");
    const listed = await service.list();
    expect(listed).toHaveLength(1);
    expect(listed[0]!.event.eventId).toBe(snap.event.eventId);
    service.close();
  });
  test("deliverDue acknowledges through the mailbox and settles delivered", async () => {
    const mailboxes = new MemoryMailboxService();
    const mb = await mailboxes.create("inbox");
    const service = await IndexedDbHostEventService.open({ name: "t.he.due", factory, mailboxes });
    const snap = await service.enqueue(input(mb.send, "timer", "evt-2", { tick: 1 }));
    const delivered = await service.deliverDue();
    expect(delivered).toHaveLength(1);
    expect(delivered[0]!.status).toBe("delivered");
    expect(delivered[0]!.messageId).toMatch(/^sha256:[0-9a-f]{64}$/);
    // The mailbox received exactly one host message carrying the event payload.
    const got = await mailboxes.receive(mb.receive);
    const message = got.message as Record<string, unknown>;
    expect(message.contract).toBe("algal.host-message.v1");
    expect(message.eventId).toBe(snap.event.eventId);
    expect(message.payload).toEqual({ tick: 1 });
    expect(await code(mailboxes.receive(mb.receive))).toBe("EFFECT_SUSPENDED");
    // A second pass is a no-op; the event stays delivered in list().
    expect(await service.deliverDue()).toEqual([]);
    expect((await service.list())[0]!.status).toBe("delivered");
    service.close();
  });
  test("re-enqueue after delivery returns the terminal snapshot", async () => {
    const mailboxes = new MemoryMailboxService();
    const mb = await mailboxes.create("inbox");
    const service = await IndexedDbHostEventService.open({ name: "t.he.term", factory, mailboxes });
    await service.enqueue(input(mb.send, "webhook", "evt-3"));
    await service.deliverDue();
    const again = await service.enqueue(input(mb.send, "webhook", "evt-3"));
    expect(again.status).toBe("delivered");
    expect(again.messageId).toBeDefined();
    service.close();
  });
  test("cancel transitions pending to cancelled and reports races", async () => {
    const mailboxes = new MemoryMailboxService();
    const mb = await mailboxes.create("inbox");
    const service = await IndexedDbHostEventService.open({ name: "t.he.cancel", factory, mailboxes });
    const pending = await service.enqueue(input(mb.send, "webhook", "evt-4"));
    const done = await service.enqueue(input(mb.send, "webhook", "evt-5"));
    const gone = await service.cancel(pending.event.eventId);
    expect(gone.cancelled).toBe(true);
    expect(gone.event.status).toBe("cancelled");
    const again = await service.cancel(pending.event.eventId);
    expect(again.cancelled).toBe(true);
    expect(again.reason).toBe("already-cancelled");
    // Cancelled events are never delivered.
    await service.deliverDue();
    const tooLate = await service.cancel(done.event.eventId);
    expect(tooLate.cancelled).toBe(false);
    expect(tooLate.reason).toBe("too-late");
    const statuses = (await service.list()).map((s) => s.status).sort();
    expect(statuses).toEqual(["cancelled", "delivered"]);
    service.close();
  });
  test("future dueAtMs defers delivery until the host clock reaches it", async () => {
    const mailboxes = new MemoryMailboxService();
    const mb = await mailboxes.create("inbox");
    let now = 1_000_000;
    const service = await IndexedDbHostEventService.open({
      name: "t.he.timer",
      factory,
      mailboxes,
      clock: { now: () => now, sleep: () => Promise.resolve() },
    });
    const snap = await service.enqueue(input(mb.send, "timer", "evt-6", { wake: true }, now + 60_000));
    expect(await service.deliverDue()).toEqual([]);
    expect((await service.list())[0]!.status).toBe("pending");
    now += 60_001;
    const delivered = await service.deliverDue();
    expect(delivered).toHaveLength(1);
    const got = await mailboxes.receive(mb.receive);
    const message = got.message as Record<string, unknown>;
    expect(message.eventId).toBe(snap.event.eventId);
    expect(message.timer).toBe(snap.event.eventId);
    service.close();
  });
  test("input bounds reject oversized deliveryId and payload", async () => {
    const mailboxes = new MemoryMailboxService();
    const mb = await mailboxes.create("inbox");
    const service = await IndexedDbHostEventService.open({ name: "t.he.bounds", factory, mailboxes });
    expect(await code(service.enqueue(input(mb.send, "webhook", "x".repeat(300))))).toBe("PARSE_FAILED");
    expect(await code(service.enqueue(input(mb.send, "webhook", "evt-7", { blob: "y".repeat(70_000) })))).toBe("BUDGET_EXHAUSTED");
    service.close();
  });
  test("poll delivers pending work within its bounds and reports the stop reason", async () => {
    const mailboxes = new MemoryMailboxService();
    const mb = await mailboxes.create("inbox");
    const service = await IndexedDbHostEventService.open({
      name: "t.he.poll",
      factory,
      mailboxes,
      clock: { sleep: () => Promise.resolve() },
    });
    await service.enqueue(input(mb.send, "webhook", "evt-8"));
    const result = await service.poll({ maxPasses: 4, maxDeliveries: 8, maxDurationMs: 60_000, intervalMs: 1 });
    expect(result.passes).toBe(1);
    expect(result.delivered).toHaveLength(1);
    expect(result.reason).toBe("idle");
    service.close();
  });
  test("durable snapshots survive close and reopen", async () => {
    const mailboxes = new MemoryMailboxService();
    const mb = await mailboxes.create("inbox");
    const first = await IndexedDbHostEventService.open({ name: "t.he.durable", factory, mailboxes });
    const snap = await first.enqueue(input(mb.send, "webhook", "evt-9"));
    first.close();
    const second = await IndexedDbHostEventService.open({ name: "t.he.durable", factory, mailboxes });
    const listed = await second.list();
    expect(listed).toHaveLength(1);
    expect(listed[0]!.event.eventId).toBe(snap.event.eventId);
    expect(listed[0]!.status).toBe("pending");
    second.close();
  });
  test("default owned IndexedDB mailbox delivers end to end", async () => {
    // The owned mailbox service shares the default database name on the same
    // factory, so a mailbox created on a separate connection is visible.
    const owned = await IndexedDbMailboxService.open({ name: MAILBOX_IDB_NAME, factory });
    const mb = await owned.create("inbox");
    const service = await IndexedDbHostEventService.open({ name: "t.he.owned", factory });
    await service.enqueue(input(mb.send, "webhook", "evt-10", { owned: 1 }));
    expect((await service.deliverDue())).toHaveLength(1);
    const got = await owned.receive(mb.receive);
    expect((got.message as Record<string, unknown>).contract).toBe("algal.host-message.v1");
    service.close();
    owned.close();
  });
});
