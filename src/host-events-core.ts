/** Host-event contract: bounded admission records, exact delivery markers,
 * and the clock-free message envelope. No filesystem, Node, or Bun imports:
 * the file driver in `host-events.ts` and the IndexedDB driver in
 * `host-events-idb.ts` share this wire layer. */
import { parseCapabilityHandle, type CapabilityHandle } from "./capabilities";
import { asDigest, digestCanonical, type Digest } from "./digest";
import { AlgalError } from "./errors";
import { MAILBOX_SEND, type MailboxService } from "./mailbox-core";
import {
  asInt, asJsonValue, asObject, asSafeId, asString, canonicalBytes,
  canonicalize, noUnknownKeys, type JsonValue,
} from "./values";

export const HOST_EVENT_CONTRACT = "algal.host-event.v1" as const;
export const HOST_MESSAGE_CONTRACT = "algal.host-message.v1" as const;
export const DELIVERY_CONTRACT = "algal.host-delivery.v1" as const;
export const HOST_EVENT_BOUNDS = {
  maxEvents: 1024,
  maxPayloadBytes: 64_000,
  maxRecordBytes: 72_000,
  maxDepth: 32,
  maxNodes: 16_384,
  maxDeliveryIdChars: 256,
  maxTimerHorizonMs: 30 * 24 * 60 * 60 * 1000,
  maxPasses: 1024,
  maxDurationMs: 60 * 60 * 1000,
  maxIntervalMs: 60_000,
} as const;

export type HostEventInput = {
  source: string;
  deliveryId: string;
  target: CapabilityHandle;
  payload: JsonValue;
  /** An absolute host wall-clock deadline. Omit for immediate delivery. */
  dueAtMs?: number;
};
export type HostEventRecord = HostEventInput & {
  contract: typeof HOST_EVENT_CONTRACT;
  eventId: Digest;
};
export type HostEventSnapshot = {
  event: HostEventRecord;
  status: "pending" | "sending" | "delivered" | "cancelled";
  messageId?: Digest;
};
export type DeliveryMarker = {
  contract: typeof DELIVERY_CONTRACT;
  eventId: Digest;
  admissionDigest: Digest;
  status: "sending" | "delivered" | "cancelled";
  messageId?: Digest;
};
export type HostEventCancelResult = {
  cancelled: boolean;
  reason?: "too-late" | "already-cancelled";
  event: HostEventSnapshot;
};
export type HostEventPollOptions = {
  maxPasses: number;
  maxDeliveries: number;
  maxDurationMs: number;
  intervalMs?: number;
  signal?: AbortSignal;
  /** Called after each bounded delivery pass; may schedule ready VM processes.
   * Cancellation stops admission of further work; this callback must honor the
   * signal itself if its own work is cancellable. */
  afterPass?: (delivered: HostEventSnapshot[], signal?: AbortSignal) => Promise<void>;
};
export type HostEventPollResult = {
  passes: number;
  delivered: HostEventSnapshot[];
  reason: "idle" | "cancelled" | "pass-limit" | "delivery-limit" | "duration-limit";
};
export type HostEventClock = {
  now?: () => number;
  sleep?: (milliseconds: number, signal?: AbortSignal) => Promise<void>;
};
/** The durable host outbox contract. MailboxService.send must honor its
 * durable idempotency contract; every marker publication observes one atomic
 * settlement boundary (a committed rename set or IndexedDB transaction). */
export interface HostEventServiceContract {
  enqueue(input: HostEventInput): Promise<HostEventSnapshot>;
  list(): Promise<HostEventSnapshot[]>;
  cancel(eventId: Digest): Promise<HostEventCancelResult>;
  deliverDue(options?: { maxEvents?: number; signal?: AbortSignal }): Promise<HostEventSnapshot[]>;
  poll(options: HostEventPollOptions): Promise<HostEventPollResult>;
}
export const json = (value: unknown): JsonValue => value as JsonValue;
export const same = (a: unknown, b: unknown): boolean => canonicalize(json(a)) === canonicalize(json(b));

export function boundedJson(value: unknown, bytes: number): JsonValue {
  let nodes = 0;
  function visit(item: unknown, depth: number): void {
    if (++nodes > HOST_EVENT_BOUNDS.maxNodes || depth > HOST_EVENT_BOUNDS.maxDepth)
      throw new AlgalError("BUDGET_EXHAUSTED", "host event JSON depth/count exceeded");
    if (item !== null && typeof item === "object")
      for (const child of Object.values(item)) visit(child, depth + 1);
  }
  visit(value, 0);
  const checked = asJsonValue(value, "host event JSON");
  if (canonicalBytes(checked) > bytes)
    throw new AlgalError("BUDGET_EXHAUSTED", "host event JSON byte limit exceeded");
  // Snapshot caller-owned values before the first await.
  return JSON.parse(canonicalize(checked)) as JsonValue;
}
export function eventIdentity(source: string, deliveryId: string): Digest {
  return digestCanonical({ contract: HOST_EVENT_CONTRACT, source, deliveryId });
}
export function parseInput(value: unknown): HostEventInput {
  const obj = asObject(boundedJson(value, HOST_EVENT_BOUNDS.maxRecordBytes), "host event input");
  noUnknownKeys(obj, ["source", "deliveryId", "target", "payload", "dueAtMs"], "host event input");
  const source = asSafeId(obj.source, "event source");
  const deliveryId = asString(obj.deliveryId, "event deliveryId", HOST_EVENT_BOUNDS.maxDeliveryIdChars);
  if (deliveryId.length === 0) throw new AlgalError("PARSE_FAILED", "event deliveryId must not be empty");
  const result: HostEventInput = {
    source, deliveryId,
    target: parseCapabilityHandle(obj.target, MAILBOX_SEND, "event target").handle,
    payload: boundedJson(obj.payload, HOST_EVENT_BOUNDS.maxPayloadBytes),
  };
  if (obj.dueAtMs !== undefined)
    result.dueAtMs = asInt(obj.dueAtMs, "event dueAtMs", 0, Number.MAX_SAFE_INTEGER);
  return result;
}
export function parseRecord(value: unknown): HostEventRecord {
  const obj = asObject(boundedJson(value, HOST_EVENT_BOUNDS.maxRecordBytes), "host event");
  noUnknownKeys(obj, ["contract", "eventId", "source", "deliveryId", "target", "payload", "dueAtMs"], "host event");
  if (obj.contract !== HOST_EVENT_CONTRACT) throw new AlgalError("PARSE_FAILED", "invalid host event contract");
  const { contract: _contract, eventId, ...input } = obj;
  const parsed = parseInput(input);
  const expected = eventIdentity(parsed.source, parsed.deliveryId);
  if (asDigest(eventId, "eventId") !== expected)
    throw new AlgalError("DIGEST_MISMATCH", "host event identity mismatch");
  return { contract: HOST_EVENT_CONTRACT, eventId: expected, ...parsed };
}
export function parseMarker(value: unknown, event: HostEventRecord, status: DeliveryMarker["status"]): DeliveryMarker {
  const obj = asObject(boundedJson(value, HOST_EVENT_BOUNDS.maxRecordBytes), "event delivery");
  noUnknownKeys(obj, ["contract", "eventId", "admissionDigest", "status", "messageId"], "event delivery");
  if (obj.contract !== DELIVERY_CONTRACT || obj.status !== status ||
      obj.eventId !== event.eventId || obj.admissionDigest !== digestCanonical(json(event)))
    throw new AlgalError("DIGEST_MISMATCH", "host event delivery does not match its admission");
  const marker: DeliveryMarker = {
    contract: DELIVERY_CONTRACT, eventId: event.eventId,
    admissionDigest: digestCanonical(json(event)), status,
  };
  if (status === "delivered") marker.messageId = asDigest(obj.messageId, "event messageId");
  else if (obj.messageId !== undefined) throw new AlgalError("PARSE_FAILED", "only delivered events have a messageId");
  return marker;
}
export function hostEventMessage(event: HostEventRecord): JsonValue {
  const checked = parseRecord(event);
  return {
    contract: HOST_MESSAGE_CONTRACT,
    eventId: checked.eventId,
    ...(checked.dueAtMs === undefined ? {} : { timer: checked.eventId }),
    payload: checked.payload,
  };
}
export async function sleep(milliseconds: number, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) return;
  await new Promise<void>((done) => {
    const finish = () => { clearTimeout(timer); signal?.removeEventListener("abort", finish); done(); };
    const timer = setTimeout(finish, milliseconds);
    signal?.addEventListener("abort", finish, { once: true });
  });
}
// Re-exported so the wire layer names the mailbox capability class it binds.
export { MAILBOX_SEND, type MailboxService };
