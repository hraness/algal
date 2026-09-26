/// <reference lib="dom" />
/// <reference lib="dom.asynciterable" />
/** Real IndexedDB conformance checks for the durable browser drivers. Bundled
 * by `scripts/browser-idb-qualification.mjs` and evaluated inside real
 * Chromium: mailbox send/receive/idempotency/capability/bounds, durable
 * reopen across connections, host-event admission, intent-to-delivery
 * acknowledgement, cancellation, and a peer-tab handoff. */
import { IndexedDbMailboxService } from "../src/mailbox-idb";
import { IndexedDbHostEventService } from "../src/host-events-idb";
import type { Digest } from "../src/digest";

export { IndexedDbMailboxService, IndexedDbHostEventService };

function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}
async function rejects(action: () => Promise<unknown>, message: string): Promise<void> {
  let rejected = false;
  try { await action(); } catch { rejected = true; }
  assert(rejected, `Expected rejection: ${message}`);
}
const hex = (fill: string, tail = ""): Digest => `sha256:${fill.repeat(64 - tail.length)}${tail}` as Digest;

export async function storageChecks(): Promise<{ checks: string[]; mailboxDb: string; eventDb: string }> {
  const mailboxDb = `algal-mb-qa-${crypto.randomUUID()}`;
  const eventDb = `algal-ev-qa-${crypto.randomUUID()}`;
  const checks: string[] = [];

  // Durable mailbox on the real engine.
  let service = await IndexedDbMailboxService.open({ name: mailboxDb });
  const config = await service.create("panel", { maxMessages: 4, maxMessageBytes: 4096 });
  assert(config.send.startsWith("cap:mailbox-send:") && config.receive.startsWith("cap:mailbox-receive:"), "mailbox admits paired capability handles");
  const key1 = hex("0", "1");
  const { id } = await service.send(config.send, { hello: "浏览器 ✓", seq: 1 }, key1);
  const again = await service.send(config.send, { hello: "浏览器 ✓", seq: 1 }, key1);
  assert(again.id === id, "idempotent resend resolves the retained message id");
  await rejects(() => service.send(config.send, { different: true }, key1), "idempotency key conflict");
  assert(await service.hasPending(config.receive), "pending entry is visible after send");
  const got = await service.receive(config.receive);
  assert(got.id === id && (got.message as { hello: string }).hello === "浏览器 ✓", "delivery round-trips the canonical message");
  await rejects(() => service.receive(config.receive), "empty mailbox suspension");
  service.close();
  service = await IndexedDbMailboxService.open({ name: mailboxDb });
  assert((await service.inspect("panel"))?.receive === config.receive, "reopen on the real engine preserves admission");
  checks.push("real IndexedDB mailbox: admission, idempotent send, ordered delivery, suspension, reopen");

  // Durable host outbox acknowledging through the same mailbox service, on a
  // dedicated mailbox so the panel mailbox's handles stay live for the peer
  // tab below and revocation can be exercised here without breaking it.
  const outbox = await service.create("outbox", { maxMessages: 4, maxMessageBytes: 4096 });
  let events = await IndexedDbHostEventService.open({ name: eventDb, mailboxes: service });
  const snap = await events.enqueue({ source: "panel", deliveryId: "host-evt-1", target: outbox.send, payload: { tick: 1 } });
  assert(snap.status === "pending" && snap.event.contract === "algal.host-event.v1", "event admitted pending");
  const dup = await events.enqueue({ source: "panel", deliveryId: "host-evt-1", target: outbox.send, payload: { tick: 1 } });
  assert(dup.event.eventId === snap.event.eventId, "replayed admission resolves the retained event");
  await rejects(() => events.enqueue({ source: "panel", deliveryId: "host-evt-1", target: outbox.send, payload: { other: 2 } }), "event identity conflict");
  const delivered = await events.deliverDue();
  assert(delivered.length === 1 && delivered[0]!.status === "delivered", "intent-to-delivery settles delivered");
  const host = await service.receive(outbox.receive);
  const envelope = host.message as Record<string, unknown>;
  assert(envelope.contract === "algal.host-message.v1" && envelope.eventId === snap.event.eventId && (envelope.payload as { tick: number }).tick === 1, "mailbox carries the host message envelope");
  assert((await events.deliverDue()).length === 0, "delivered event does not re-send");
  const cancelPending = await events.enqueue({ source: "panel", deliveryId: "host-evt-2", target: outbox.send, payload: null });
  const cancelled = await events.cancel(cancelPending.event.eventId);
  assert(cancelled.cancelled && cancelled.event.status === "cancelled", "pending cancel commits");
  const tooLate = await events.cancel(snap.event.eventId);
  assert(tooLate.cancelled === false && tooLate.reason === "too-late", "delivered event cannot be cancelled");
  events.close();
  events = await IndexedDbHostEventService.open({ name: eventDb, mailboxes: service });
  const statuses = (await events.list()).map((s) => `${s.event.deliveryId}:${s.status}`).sort();
  assert(statuses.join(",") === "host-evt-1:delivered,host-evt-2:cancelled", "event snapshots survive reopen");
  // The panel mailbox's send must stay live: the peer tab sends to it below.
  await service.revoke(outbox.send);
  await rejects(() => service.send(outbox.send, "x", hex("b")), "revoked capability denial");
  service.close();
  events.close();
  checks.push("real IndexedDB host outbox: deduped admission, durable intent, mailbox acknowledgement, cancel races, reopen, revoked capability denial");

  return { checks, mailboxDb, eventDb };
}

/** Runs in a second browser tab against the storage created by storageChecks:
 * the peer connection claims a new idempotent delivery on the shared mailbox. */
export async function peerChecks(mailboxDb: string): Promise<{ checks: string[]; messageId: string }> {
  const service = await IndexedDbMailboxService.open({ name: mailboxDb });
  const config = await service.inspect("panel");
  assert(config, "peer tab sees the admitted mailbox");
  const key = hex("a");
  const { id } = await service.send(config!.send, { from: "peer-tab" }, key);
  const again = await service.send(config!.send, { from: "peer-tab" }, key);
  assert(again.id === id, "peer tab resend is idempotent");
  service.close();
  return { checks: ["peer tab shares the durable mailbox and honors the idempotent claim"], messageId: id };
}

/** Back in the first tab: the peer tab's committed message is receivable. */
export async function mainFollowUp(mailboxDb: string, messageId: string): Promise<string[]> {
  const service = await IndexedDbMailboxService.open({ name: mailboxDb });
  const config = await service.inspect("panel");
  const got = await service.receive(config!.receive);
  assert(got.id === messageId && (got.message as { from: string }).from === "peer-tab", "main tab receives the peer tab's durable message");
  service.close();
  return ["peer tab delivery is durable and consumed by the owning tab"];
}
