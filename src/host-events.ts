// Host-side clock eligibility and durable mailbox delivery on the filesystem.
// No clock reading is embedded in a VM message or receipt. OS leases survive
// crashes safely; unknown legacy lock files require reconciliation. The wire
// contract lives in `host-events-core.ts`; the IndexedDB driver is
// `host-events-idb.ts`.
import { randomBytes } from "node:crypto";
import { constants } from "node:fs";
import { link, lstat, mkdir, open, opendir, unlink } from "node:fs/promises";
import { join, resolve } from "node:path";
import { asDigest, digestCanonical, type Digest } from "./digest";
import { AlgalError } from "./errors";
import { hostLease } from "./host-state";
import { FileMailboxService, type MailboxService } from "./mailbox";
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
} from "./host-events-core";
import { asInt, canonicalize } from "./values";

export {
  boundedJson,
  DELIVERY_CONTRACT,
  eventIdentity,
  HOST_EVENT_BOUNDS,
  HOST_EVENT_CONTRACT,
  HOST_MESSAGE_CONTRACT,
  hostEventMessage,
  parseInput,
  parseMarker,
  parseRecord,
  same,
  sleep,
} from "./host-events-core";
export type {
  DeliveryMarker,
  HostEventCancelResult,
  HostEventClock,
  HostEventInput,
  HostEventPollOptions,
  HostEventPollResult,
  HostEventRecord,
  HostEventServiceContract,
  HostEventSnapshot,
} from "./host-events-core";

const missing = (error: unknown): boolean => (error as NodeJS.ErrnoException).code === "ENOENT";

async function guard(path: string, directory: boolean): Promise<void> {
  try {
    const stat = await lstat(path);
    if (stat.isSymbolicLink() || (directory ? !stat.isDirectory() : !stat.isFile()))
      throw new AlgalError("IO_FAILED", "host event symlinks and unexpected file types are not admitted");
  } catch (error) { if (!missing(error)) throw error; }
}
async function syncDirectory(path: string): Promise<void> {
  const handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  try { await handle.sync(); } finally { await handle.close(); }
}

/** A bounded durable host outbox. MailboxService.send must honor its durable
 * idempotency contract. No arbitrary tool retry or process recovery is implied. */
export class HostEventService implements HostEventServiceContract {
  readonly dir: string;
  private readonly root: string;
  private readonly mailboxes: MailboxService;
  private readonly now: () => number;
  private readonly sleep: NonNullable<HostEventClock["sleep"]>;
  constructor(dir: string, mailboxes?: MailboxService, clock: HostEventClock = {}) {
    this.dir = resolve(dir);
    this.root = join(this.dir, "host-events");
    this.mailboxes = mailboxes ?? new FileMailboxService(this.dir);
    this.now = clock.now ?? Date.now;
    this.sleep = clock.sleep ?? sleep;
  }
  private time(): number { return asInt(this.now(), "host clock", 0, Number.MAX_SAFE_INTEGER); }
  private async init(): Promise<void> {
    for (const path of [this.dir, this.root, ...["events", "sending", "delivered", "cancelled", "locks", "owners"].map((name) => join(this.root, name))]) {
      await guard(path, true);
      await mkdir(path, { recursive: true, mode: 0o700 });
      await guard(path, true);
    }
    await syncDirectory(this.dir);
    await syncDirectory(this.root);
  }
  private path(kind: string, eventId: Digest): string {
    return join(this.root, kind, `${asDigest(eventId, "eventId").slice(7)}.json`);
  }
  private async read(path: string): Promise<unknown | undefined> {
    await guard(path, false);
    let file;
    try { file = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK); }
    catch (error) { if (missing(error)) return undefined; throw error; }
    try {
      const stat = await file.stat();
      if (!stat.isFile()) throw new AlgalError("IO_FAILED", "host event record must be a regular file");
      if (stat.size > HOST_EVENT_BOUNDS.maxRecordBytes)
        throw new AlgalError("BUDGET_EXHAUSTED", "host event record byte limit exceeded");
      const chunks: Buffer[] = [];
      let total = 0;
      while (true) {
        const chunk = Buffer.alloc(16_384);
        const { bytesRead } = await file.read(chunk);
        if (bytesRead === 0) break;
        total += bytesRead;
        if (total > HOST_EVENT_BOUNDS.maxRecordBytes)
          throw new AlgalError("BUDGET_EXHAUSTED", "host event record byte limit exceeded");
        chunks.push(chunk.subarray(0, bytesRead));
      }
      return boundedJson(JSON.parse(Buffer.concat(chunks).toString("utf8")), HOST_EVENT_BOUNDS.maxRecordBytes);
    } finally { await file.close(); }
  }
  private async publish(kind: string, eventId: Digest, value: unknown): Promise<void> {
    const checked = boundedJson(value, HOST_EVENT_BOUNDS.maxRecordBytes);
    const parent = join(this.root, kind);
    const destination = this.path(kind, eventId);
    await guard(parent, true);
    await guard(destination, false);
    const temporary = join(parent, `.${randomBytes(16).toString("hex")}.tmp`);
    const file = await open(temporary, "wx", 0o600);
    try { await file.writeFile(canonicalize(checked)); await file.sync(); }
    finally { await file.close(); }
    try {
      try { await link(temporary, destination); }
      catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
        const retained = await this.read(destination);
        if (retained === undefined || !same(retained, checked))
          throw new AlgalError("DIGEST_MISMATCH", "host event record already claims different content");
      }
      await syncDirectory(parent);
    } finally { await unlink(temporary); }
  }
  private async locked<T>(key: string, body: () => Promise<T>): Promise<T> {
    // Never infer ownership of an old create-exclusive lock from PID or age.
    // Existing deployments retain those locks until an operator reconciles
    // them. New operations use the shared OS-released SQLite owner lease.
    try {
      await lstat(join(this.root, "locks", `${key}.lock`));
      throw new AlgalError("IO_FAILED", "host event has a legacy lock; reconcile the owning operation before retrying");
    } catch (error) { if (!missing(error)) throw error; }
    return hostLease(join(this.root, "owners", key), `event-${key}`, body);
  }
  private async ids(): Promise<Digest[]> {
    const result: Digest[] = [];
    const directory = await opendir(join(this.root, "events"));
    let count = 0;
    for await (const entry of directory) {
      if (++count > HOST_EVENT_BOUNDS.maxEvents * 2)
        throw new AlgalError("BUDGET_EXHAUSTED", "host event directory entry limit exceeded");
      // A crash before immutable publication may leave an unpublished temp file.
      if (/^\.[0-9a-f]{32}\.tmp$/.test(entry.name) && entry.isFile()) continue;
      if (!/^[0-9a-f]{64}\.json$/.test(entry.name) || !entry.isFile())
        throw new AlgalError("IO_FAILED", "unexpected host event admission entry");
      result.push(asDigest(`sha256:${entry.name.slice(0, -5)}`, "event filename"));
      if (result.length > HOST_EVENT_BOUNDS.maxEvents)
        throw new AlgalError("BUDGET_EXHAUSTED", "host event count exceeded");
    }
    return result.sort();
  }
  private async snapshot(eventId: Digest): Promise<HostEventSnapshot> {
    const raw = await this.read(this.path("events", eventId));
    if (raw === undefined) throw new AlgalError("STORE_MISS", "host event not found");
    const event = parseRecord(raw);
    if (event.eventId !== eventId) throw new AlgalError("DIGEST_MISMATCH", "host event filename mismatch");
    // Read terminal markers before intent so concurrent forward publication can
    // give a stale snapshot, but cannot give a false missing-intent error.
    const delivered = await this.read(this.path("delivered", eventId));
    const cancelled = await this.read(this.path("cancelled", eventId));
    const sending = await this.read(this.path("sending", eventId));
    if (cancelled !== undefined && (sending !== undefined || delivered !== undefined))
      throw new AlgalError("DIGEST_MISMATCH", "host event cannot be both cancelled and sending");
    if (sending !== undefined) parseMarker(sending, event, "sending");
    if (delivered !== undefined) {
      if (sending === undefined) throw new AlgalError("DIGEST_MISMATCH", "host event delivery lacks intent");
      const marker = parseMarker(delivered, event, "delivered");
      return { event, status: "delivered", messageId: marker.messageId! };
    }
    if (cancelled !== undefined) { parseMarker(cancelled, event, "cancelled"); return { event, status: "cancelled" }; }
    return { event, status: sending === undefined ? "pending" : "sending" };
  }
  private async mark(event: HostEventRecord, status: DeliveryMarker["status"], messageId?: Digest): Promise<void> {
    await this.publish(status, event.eventId, {
      contract: DELIVERY_CONTRACT, eventId: event.eventId,
      admissionDigest: digestCanonical(json(event)), status,
      ...(messageId === undefined ? {} : { messageId: asDigest(messageId, "event messageId") }),
    });
  }
  async enqueue(input: HostEventInput): Promise<HostEventSnapshot> {
    const parsed = parseInput(input);
    const event: HostEventRecord = {
      contract: HOST_EVENT_CONTRACT,
      eventId: eventIdentity(parsed.source, parsed.deliveryId), ...parsed,
    };
    await this.init();
    // Re-reading an immutable admission needs no creation lease. In particular,
    // an unrelated crashed creator cannot prevent an existing event's retry.
    const existing = await this.read(this.path("events", event.eventId));
    if (existing !== undefined) {
      if (!same(parseRecord(existing), event))
        throw new AlgalError("DIGEST_MISMATCH", "event source/deliveryId already claims different content");
      return this.snapshot(event.eventId);
    }
    return this.locked("admission", async () => {
      const retained = await this.read(this.path("events", event.eventId));
      if (retained !== undefined) {
        if (!same(parseRecord(retained), event))
          throw new AlgalError("DIGEST_MISMATCH", "event source/deliveryId already claims different content");
        return this.snapshot(event.eventId);
      }
      if ((await this.ids()).length >= HOST_EVENT_BOUNDS.maxEvents)
        throw new AlgalError("BUDGET_EXHAUSTED", "host event count exceeded; rotate to a new host store explicitly");
      if (event.dueAtMs !== undefined && event.dueAtMs - this.time() > HOST_EVENT_BOUNDS.maxTimerHorizonMs)
        throw new AlgalError("BUDGET_EXHAUSTED", "host timer horizon exceeded");
      await this.publish("events", event.eventId, event);
      return { event, status: "pending" };
    });
  }
  async list(): Promise<HostEventSnapshot[]> {
    await this.init();
    const result: HostEventSnapshot[] = [];
    for (const id of await this.ids()) result.push(await this.snapshot(id));
    return result;
  }
  async cancel(eventId: Digest): Promise<{ cancelled: boolean; reason?: "too-late" | "already-cancelled"; event: HostEventSnapshot }> {
    eventId = asDigest(eventId, "eventId");
    await this.init();
    const terminal = (snapshot: HostEventSnapshot) => {
      if (snapshot.status === "cancelled") return { cancelled: true, reason: "already-cancelled" as const, event: snapshot };
      if (snapshot.status !== "pending") return { cancelled: false, reason: "too-late" as const, event: snapshot };
      return undefined;
    };
    // Intent is irrevocable even while its owner is still sending. Reading it
    // needs no lease; only a transition from pending to cancelled needs one.
    const observed = terminal(await this.snapshot(eventId));
    if (observed !== undefined) return observed;
    return this.locked(eventId.slice(7), async () => {
      const snapshot = await this.snapshot(eventId);
      const retained = terminal(snapshot);
      if (retained !== undefined) return retained;
      await this.mark(snapshot.event, "cancelled");
      return { cancelled: true, event: { ...snapshot, status: "cancelled" } };
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
      const result = await this.locked(snapshot.event.eventId.slice(7), async () => {
        const current = await this.snapshot(snapshot.event.eventId);
        if (options.signal?.aborted || current.status === "delivered" || current.status === "cancelled") return undefined;
        if (current.status === "pending" && current.event.dueAtMs !== undefined && current.event.dueAtMs > this.time()) return undefined;
        if (current.status === "pending") await this.mark(current.event, "sending");
        // After intent, cancellation is too late. On a failed acknowledgement a
        // restart repeats this exact body/key; consumed messages stay consumed.
        const { id } = await this.mailboxes.send(current.event.target, hostEventMessage(current.event), current.event.eventId);
        await this.mark(current.event, "delivered", id);
        return { event: current.event, status: "delivered" as const, messageId: id };
      });
      if (result !== undefined) delivered.push(result);
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
        await this.sleep(Math.min(intervalMs, Math.max(1, nextDue - this.time()), remaining), signal);
      }
      return result;
    } finally {
      clearTimeout(timeout);
      options.signal?.removeEventListener("abort", abort);
    }
  }
}
