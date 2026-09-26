/// <reference lib="dom" />
/// <reference lib="dom.asynciterable" />
/** IndexedDB-backed durable host outbox. It binds the same `algal.host-event.v1`
 * wire records, delivery markers, idempotent mailbox acknowledgement, and
 * bounded poll contract as the file driver in `host-events.ts`; the settlement
 * boundaries are one readwrite transaction per atomic transition instead of a
 * locked rename set. Delivery runs as intent commit, mailbox acknowledgement,
 * then delivered commit, so a crash between commits replays the exact same
 * message body and idempotency key. IndexedDB serializes readwrite
 * transactions across connections and tabs, which replaces the file driver's
 * owner leases; a crashed tab's in-flight write simply never commits. */
import { asDigest, digestCanonical, type Digest } from "./digest";
import { AlgalError } from "./errors";
import {
  boundedJson,
  DELIVERY_CONTRACT,
  eventIdentity,
  HOST_EVENT_BOUNDS,
  HOST_EVENT_CONTRACT,
  hostEventMessage,
  json,
  parseInput,
  parseMarker,
  parseRecord,
  same,
  sleep,
  type DeliveryMarker,
  type HostEventClock,
  type HostEventInput,
  type HostEventPollOptions,
  type HostEventPollResult,
  type HostEventRecord,
  type HostEventServiceContract,
  type HostEventSnapshot,
  type MailboxService,
} from "./host-events-core";
import {
  idbConnect,
  idbEncode,
  idbFail,
  idbFactory,
  idbName,
  idbRequest,
  idbRow,
  idbTransact,
  type IdbOpenOptions,
} from "./idb-runtime";
import { IndexedDbMailboxService, MAILBOX_IDB_NAME } from "./mailbox-idb";
import { asInt, type JsonValue } from "./values";

export const HOST_EVENTS_IDB_NAME = "algal.host-events.idb.v1" as const;
const EVENTS = "events";
const SENDING = "sending";
const DELIVERED = "delivered";
const CANCELLED = "cancelled";
const STORES: readonly string[] = [EVENTS, SENDING, DELIVERED, CANCELLED];
const RECORD_BYTES = HOST_EVENT_BOUNDS.maxRecordBytes;
const EVENT_KEY = /^[0-9a-f]{64}$/;

export type IndexedDbHostEventOptions = IdbOpenOptions & {
  /** The durable mailbox service that receives host messages; defaults to an
   * `IndexedDbMailboxService` the service owns and closes. */
  mailboxes?: MailboxService;
  /** Database name for the default mailbox service. */
  mailboxName?: string;
  clock?: HostEventClock;
};

export class IndexedDbHostEventService implements HostEventServiceContract {
  private closed = false;
  private readonly now: () => number;
  private readonly sleeper: NonNullable<HostEventClock["sleep"]>;
  private constructor(
    private readonly database: IDBDatabase,
    private readonly mailboxes: MailboxService,
    private readonly ownedMailboxes: IndexedDbMailboxService | undefined,
    clock: HostEventClock,
  ) {
    database.onversionchange = () => this.close();
    this.now = clock.now ?? Date.now;
    this.sleeper = clock.sleep ?? sleep;
  }
  /** Opens (or creates) the bounded host-event database. `factory` injects the
   * IDBFactory for non-window hosts; ambient `indexedDB` is the default. */
  static async open(
    options: IndexedDbHostEventOptions = {},
  ): Promise<IndexedDbHostEventService> {
    const name = idbName(options, HOST_EVENTS_IDB_NAME, [
      "name",
      "factory",
      "mailboxes",
      "mailboxName",
      "clock",
    ]);
    const factory = idbFactory(options.factory);
    const database = await idbConnect(factory, name, STORES);
    let mailboxes = options.mailboxes;
    let owned: IndexedDbMailboxService | undefined;
    if (mailboxes === undefined) {
      owned = await IndexedDbMailboxService.open({
        name: options.mailboxName ?? MAILBOX_IDB_NAME,
        factory,
      });
      mailboxes = owned;
    }
    return new IndexedDbHostEventService(database, mailboxes, owned, options.clock ?? {});
  }
  close(): void {
    this.closed = true;
    this.database.close();
    this.ownedMailboxes?.close();
  }
  private assertOpen(): void {
    if (this.closed) idbFail("host events connection is closed");
  }
  private transact<T>(
    mode: IDBTransactionMode,
    body: (transaction: IDBTransaction) => Promise<T>,
  ): Promise<T> {
    this.assertOpen();
    return idbTransact(this.database, STORES, mode, body);
  }
  private time(): number {
    return asInt(this.now(), "host clock", 0, Number.MAX_SAFE_INTEGER);
  }
  private async read(
    transaction: IDBTransaction,
    store: string,
    key: string,
  ): Promise<unknown | undefined> {
    const raw = await idbRequest(transaction.objectStore(store).get(key)) as unknown;
    if (raw === undefined) return undefined;
    return idbRow(raw, RECORD_BYTES).value;
  }
  private async snapshot(
    transaction: IDBTransaction,
    eventId: Digest,
  ): Promise<HostEventSnapshot> {
    const key = eventId.slice(7);
    const raw = await this.read(transaction, EVENTS, key);
    if (raw === undefined) throw new AlgalError("STORE_MISS", "host event not found");
    const event = parseRecord(raw);
    if (event.eventId !== eventId) {
      throw new AlgalError("DIGEST_MISMATCH", "host event key mismatch");
    }
    // Read terminal markers before intent, as in the file driver.
    const delivered = await this.read(transaction, DELIVERED, key);
    const cancelled = await this.read(transaction, CANCELLED, key);
    const sending = await this.read(transaction, SENDING, key);
    if (cancelled !== undefined && (sending !== undefined || delivered !== undefined))
      throw new AlgalError("DIGEST_MISMATCH", "host event cannot be both cancelled and sending");
    if (sending !== undefined) parseMarker(sending, event, "sending");
    if (delivered !== undefined) {
      if (sending === undefined) throw new AlgalError("DIGEST_MISMATCH", "host event delivery lacks intent");
      const marker = parseMarker(delivered, event, "delivered");
      return { event, status: "delivered", messageId: marker.messageId! };
    }
    if (cancelled !== undefined) {
      parseMarker(cancelled, event, "cancelled");
      return { event, status: "cancelled" };
    }
    return { event, status: sending === undefined ? "pending" : "sending" };
  }
  private async mark(
    transaction: IDBTransaction,
    event: HostEventRecord,
    status: DeliveryMarker["status"],
    messageId?: Digest,
  ): Promise<void> {
    const checked = boundedJson(
      {
        contract: DELIVERY_CONTRACT,
        eventId: event.eventId,
        admissionDigest: digestCanonical(json(event)),
        status,
        ...(messageId === undefined ? {} : { messageId: asDigest(messageId, "event messageId") }),
      },
      RECORD_BYTES,
    );
    const store = status === "sending" ? SENDING : status === "delivered" ? DELIVERED : CANCELLED;
    const raw = await this.read(transaction, store, event.eventId.slice(7));
    if (raw !== undefined) {
      if (!same(raw, checked))
        throw new AlgalError("DIGEST_MISMATCH", "host event record already claims different content");
      return;
    }
    transaction.objectStore(store).put(idbEncode(checked, RECORD_BYTES), event.eventId.slice(7));
  }
  async enqueue(input: HostEventInput): Promise<HostEventSnapshot> {
    const parsed = parseInput(input);
    const event: HostEventRecord = {
      contract: HOST_EVENT_CONTRACT,
      eventId: eventIdentity(parsed.source, parsed.deliveryId),
      ...parsed,
    };
    return this.transact("readwrite", async (transaction) => {
      const key = event.eventId.slice(7);
      const retained = await this.read(transaction, EVENTS, key);
      if (retained !== undefined) {
        if (!same(parseRecord(retained), event))
          throw new AlgalError("DIGEST_MISMATCH", "event source/deliveryId already claims different content");
        return this.snapshot(transaction, event.eventId);
      }
      const count = await idbRequest(transaction.objectStore(EVENTS).count());
      if (count >= HOST_EVENT_BOUNDS.maxEvents)
        throw new AlgalError("BUDGET_EXHAUSTED", "host event count exceeded; rotate to a new host store explicitly");
      if (event.dueAtMs !== undefined && event.dueAtMs - this.time() > HOST_EVENT_BOUNDS.maxTimerHorizonMs)
        throw new AlgalError("BUDGET_EXHAUSTED", "host timer horizon exceeded");
      transaction.objectStore(EVENTS).put(idbEncode(event as unknown as JsonValue, RECORD_BYTES), key);
      return { event, status: "pending" };
    });
  }
  private async ids(transaction: IDBTransaction): Promise<Digest[]> {
    const keys = await idbRequest(
      transaction.objectStore(EVENTS).getAllKeys(undefined, HOST_EVENT_BOUNDS.maxEvents + 1),
    ) as IDBValidKey[];
    if (keys.length > HOST_EVENT_BOUNDS.maxEvents)
      throw new AlgalError("BUDGET_EXHAUSTED", "host event count exceeded");
    const result: Digest[] = [];
    for (const key of keys) {
      if (typeof key !== "string" || !EVENT_KEY.test(key))
        throw new AlgalError("IO_FAILED", "unexpected host event admission entry");
      result.push(asDigest(`sha256:${key}`, "event key"));
    }
    return result.sort();
  }
  async list(): Promise<HostEventSnapshot[]> {
    return this.transact("readonly", async (transaction) => {
      const result: HostEventSnapshot[] = [];
      for (const id of await this.ids(transaction)) result.push(await this.snapshot(transaction, id));
      return result;
    });
  }
  async cancel(eventId: Digest): Promise<{ cancelled: boolean; reason?: "too-late" | "already-cancelled"; event: HostEventSnapshot }> {
    eventId = asDigest(eventId, "eventId");
    return this.transact("readwrite", async (transaction) => {
      // Intent is irrevocable even while its owner is still sending; only a
      // transition from pending to cancelled may publish the cancelled marker.
      const snapshot = await this.snapshot(transaction, eventId);
      if (snapshot.status === "cancelled") return { cancelled: true, reason: "already-cancelled" as const, event: snapshot };
      if (snapshot.status !== "pending") return { cancelled: false, reason: "too-late" as const, event: snapshot };
      await this.mark(transaction, snapshot.event, "cancelled");
      return { cancelled: true, event: { ...snapshot, status: "cancelled" as const } };
    });
  }
  async deliverDue(options: { maxEvents?: number; signal?: AbortSignal } = {}): Promise<HostEventSnapshot[]> {
    const maxEvents = asInt(options.maxEvents ?? HOST_EVENT_BOUNDS.maxEvents, "maxEvents", 1, HOST_EVENT_BOUNDS.maxEvents);
    const snapshots = await this.list();
    const delivered: HostEventSnapshot[] = [];
    for (const snapshot of snapshots) {
      if (options.signal?.aborted || delivered.length >= maxEvents) break;
      if (snapshot.status === "delivered" || snapshot.status === "cancelled" ||
          (snapshot.status === "pending" && snapshot.event.dueAtMs !== undefined && snapshot.event.dueAtMs > this.time())) continue;
      // Commit the durable sending intent first; without it an acknowledged
      // message could outlive its event. A pending claim that loses the race to
      // another connection's intent or cancellation simply resolves undefined.
      const current = await this.transact("readwrite", async (transaction) => {
        const observed = await this.snapshot(transaction, snapshot.event.eventId);
        if (options.signal?.aborted || observed.status === "delivered" || observed.status === "cancelled") return undefined;
        if (observed.status === "pending" && observed.event.dueAtMs !== undefined && observed.event.dueAtMs > this.time()) return undefined;
        if (observed.status === "pending") await this.mark(transaction, observed.event, "sending");
        return observed;
      });
      if (current === undefined) continue;
      // After intent, cancellation is too late. On a failed acknowledgement a
      // restart repeats this exact body/key; consumed messages stay consumed.
      const { id } = await this.mailboxes.send(current.event.target, hostEventMessage(current.event), current.event.eventId);
      await this.transact("readwrite", async (transaction) => {
        await this.mark(transaction, current.event, "delivered", id);
      });
      delivered.push({ event: current.event, status: "delivered", messageId: id });
    }
    return delivered;
  }
  async poll(options: HostEventPollOptions): Promise<HostEventPollResult> {
    const maxPasses = asInt(options.maxPasses, "maxPasses", 1, HOST_EVENT_BOUNDS.maxPasses);
    const maxDeliveries = asInt(options.maxDeliveries, "maxDeliveries", 1, HOST_EVENT_BOUNDS.maxEvents);
    const maxDurationMs = asInt(options.maxDurationMs, "maxDurationMs", 1, HOST_EVENT_BOUNDS.maxDurationMs);
    const intervalMs = asInt(options.intervalMs ?? 1000, "intervalMs", 1, HOST_EVENT_BOUNDS.maxIntervalMs);
    const start = performance.now();
    const controller = new AbortController();
    const abort = () => controller.abort();
    options.signal?.addEventListener("abort", abort, { once: true });
    if (options.signal?.aborted) abort();
    const timeout = setTimeout(abort, maxDurationMs);
    const signal = controller.signal;
    const result: HostEventPollResult = { passes: 0, delivered: [], reason: "pass-limit" };
    const stop = (reason: HostEventPollResult["reason"]): HostEventPollResult => ({ ...result, reason });
    const cancelled = (): HostEventPollResult => stop(options.signal?.aborted ? "cancelled" : "duration-limit");
    try {
      while (result.passes < maxPasses) {
        if (signal.aborted) return cancelled();
        if (performance.now() - start >= maxDurationMs) return stop("duration-limit");
        const delivered = await this.deliverDue({ maxEvents: maxDeliveries - result.delivered.length, signal });
        result.passes++;
        result.delivered.push(...delivered);
        if (!signal.aborted) await options.afterPass?.(delivered, signal);
        if (signal.aborted) return cancelled();
        if (result.delivered.length >= maxDeliveries) return stop("delivery-limit");
        const remaining = maxDurationMs - (performance.now() - start);
        if (remaining <= 0) return stop("duration-limit");
        const active = (await this.list()).filter((item) => item.status === "pending" || item.status === "sending");
        if (active.length === 0) return stop("idle");
        if (result.passes >= maxPasses) return stop("pass-limit");
        const nextDue = Math.min(...active.map((item) => item.status === "sending" ? 0 : item.event.dueAtMs ?? 0));
        await this.sleeper(Math.min(intervalMs, Math.max(1, nextDue - this.time()), remaining), signal);
      }
      return result;
    } finally {
      clearTimeout(timeout);
      options.signal?.removeEventListener("abort", abort);
    }
  }
}
