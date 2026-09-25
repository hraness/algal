/** Bounded, read-only observation of a live store.
 *
 * `observeStore` projects a store's current contents into one bounded JSON
 * snapshot: process heads, mailbox queues, capability records, host events,
 * application heads, stored habitat accounts and schedules, and a
 * digest-ordered tail of run receipts. `followStore` re-projects on a
 * host-side poll interval and emits each difference in a defined order until
 * a bound or an interrupt stops it.
 *
 * Observation never writes, never takes a lease, and produces no evidence
 * record. A snapshot can straddle a transition: an entry whose pointer moved
 * between its first read and the confirm pass is flagged `stable: false`,
 * and the snapshot reports `consistent: false`. Clocks live only in the
 * polling loop; emitted values are a deterministic function of store state
 * and carry no wall-clock field. */
import { lstat, opendir } from "node:fs/promises";
import { join, resolve } from "node:path";
import {
  applicationId,
  parseApplicationHead,
  parseApplicationState,
} from "./application-contract";
import { capabilityHandle, parseCapabilityHandle } from "./capabilities";
import { asDigest, digestCanonical, type Digest } from "./digest";
import { AlgalError, errorReport } from "./errors";
import { parseHabitatBudget, type HabitatBudget } from "./habitat-budget";
import { parseHabitatSchedule, type HabitatSchedule } from "./habitat-schedule";
import { HOST_EVENT_BOUNDS, HOST_EVENT_CONTRACT } from "./host-events";
import { boundedFileBytes } from "./io";
import {
  CAPABILITY_CONTRACT,
  MAILBOX_BOUNDS,
  MAILBOX_CONTRACT,
  MAILBOX_DELIVERY_CONTRACT,
  MAILBOX_RECEIVE,
  MAILBOX_SEND,
} from "./mailbox";
import { parseProcessRecord, PROCESS_BOUNDS } from "./process";
import {
  asInt,
  asJsonValue,
  asObject,
  asSafeId,
  asString,
  canonicalize,
  noUnknownKeys,
  type JsonValue,
} from "./values";

export const OBSERVE_BOUNDS = Object.freeze({
  /** Directory entries enumerated in one scan before it stops. */
  maxDirectoryEntries: 8_192,
  /** Largest `--max-items`: entries one section listing can emit. */
  maxItems: 256,
  /** Failure details kept per section. */
  maxErrors: 8,
  /** Pending deliveries listed per mailbox. */
  maxPending: 16,
  /** Byte cap on one record file read while classifying or tailing. */
  maxRecordBytes: 4_194_304,
  /** Total bytes read while projecting the run tail. */
  maxRunSectionBytes: 33_554_432,
  /** `values/` objects examined for habitat records in one snapshot. */
  maxValuesScanned: 1_024,
  /** Bytes read while classifying `values/` objects. */
  maxValueScanBytes: 33_554_432,
  /** Poll interval bounds and follow limits. */
  minIntervalMs: 25,
  maxIntervalMs: 60_000,
  maxPolls: 65_536,
  maxEvents: 65_536,
  /** Small record files: heads, markers, configs, capabilities. */
  maxMarkerBytes: 8_192,
});

export type ObserveListing<T> = {
  /** Emitted entries in the section's defined order. */
  items: T[];
  /** Entries counted during the scan, listed or not. */
  total: number;
  /** True when a scan or listing bound dropped or skipped entries. */
  truncated: boolean;
};

export type ObserveSection<T> = ObserveListing<T> & {
  /** Recognized records that failed admission, parsing, or validation. */
  unreadable: number;
  /** Directory entries outside this area's layout. */
  foreign: number;
  /** The first failures, bounded to OBSERVE_BOUNDS.maxErrors. */
  errors: { key: string; error: string }[];
};

export type ObserveCount = { count: number; truncated: boolean };

export type ObserveProcess = {
  name: string;
  /** A record status, or `creating` while only the creation marker exists. */
  status:
    | "ready"
    | "uncertain"
    | "suspended"
    | "complete"
    | "failed"
    | "stuck"
    | "creating";
  generation: number | null;
  maxGenerations: number | null;
  manifestDigest: Digest | null;
  /** The record the published head names; the intended record while creating. */
  record: Digest | null;
  cause: string | null;
  wake: string[];
  /** False when the head moved between the scan and the confirm pass. */
  stable: boolean;
};

export type ObservePending = { file: string; id: Digest };
export type ObserveMailbox = {
  name: string;
  maxMessages: number;
  maxMessageBytes: number;
  send: string;
  receive: string;
  /** A send/receive operation holds the mailbox `.lock` file. */
  locked: boolean;
  pending: ObserveListing<ObservePending>;
  consumed: ObserveCount;
  messages: ObserveCount;
  /** False when the pending set moved between the scan and the confirm pass. */
  stable: boolean;
};

export type ObserveCapability = {
  digest: Digest;
  handle: string;
  capability: string;
  mailbox: string;
  revoked: boolean;
};

export type ObserveHostEvent = {
  event: Digest;
  source: string;
  deliveryId: string;
  status: "pending" | "sending" | "delivered" | "cancelled";
  /** The admitted deadline, a record field, not a read of the clock. */
  dueAtMs: number | null;
  message: Digest | null;
  /** False when the delivery markers moved between scan and confirm. */
  stable: boolean;
};

export type ObserveApplication = {
  name: string;
  /** The state digest the head names. */
  state: Digest | null;
  sequence: number | null;
  epoch: number | null;
  revision: Digest | null;
  transition: Digest | null;
  operations: ObserveCount;
  outbox: ObserveCount;
  /** False when the head moved between the scan and the confirm pass. */
  stable: boolean;
};

export type ObserveHabitatAccount = {
  digest: Digest;
  activity: HabitatBudget["activity"];
  limits: HabitatBudget["limits"];
  charged: HabitatBudget["charged"];
  /** Charged runs in the record, counted, not listed. */
  runs: number;
  outcome: HabitatBudget["outcome"];
  refused: HabitatBudget["refused"];
};

export type ObserveHabitatSchedule = {
  digest: Digest;
  order: HabitatSchedule["order"];
  limits: HabitatSchedule["limits"];
  charged: HabitatSchedule["charged"];
  outcome: HabitatSchedule["outcome"];
  activities: HabitatSchedule["activities"];
  /** Charged runs in the record, counted, not listed. */
  runs: number;
  refused: HabitatSchedule["refused"];
};

export type ObserveRun = {
  digest: Digest;
  manifestKey: string | null;
  outcome: string | null;
  effects: number | null;
};

export type ObserveSnapshot = {
  /** The store directory as passed to the command. */
  dir: string;
  /** True when no pointer moved between a section scan and its confirm pass. */
  consistent: boolean;
  /** True when any section hit a scan, listing, or byte bound. */
  truncated: boolean;
  /** Recognized records that failed to project, summed across sections. */
  unreadable: number;
  /** Entries outside the known store layout, summed across sections. */
  foreign: number;
  processes: ObserveSection<ObserveProcess>;
  mailboxes: ObserveSection<ObserveMailbox>;
  capabilities: ObserveSection<ObserveCapability>;
  hostEvents: ObserveSection<ObserveHostEvent>;
  applications: ObserveSection<ObserveApplication>;
  habitat: {
    /** `values/` objects examined for habitat records. */
    scanned: number;
    /** `values/` objects left unexamined by the scan bounds. */
    skipped: number;
    truncated: boolean;
    unreadable: number;
    errors: { key: string; error: string }[];
    accounts: ObserveListing<ObserveHabitatAccount>;
    schedules: ObserveListing<ObserveHabitatSchedule>;
  };
  /** The highest digests in sorted order; the store carries no time order. */
  runs: ObserveSection<ObserveRun> & { skipped: number };
  store: {
    manifests: ObserveCount;
    values: ObserveCount;
    runs: ObserveCount;
    effects: ObserveCount;
    slots: ObserveCount;
    /** Top-level entries outside the observed areas, listed by name. */
    other: ObserveListing<string>;
  };
};

export type ObserveOptions = {
  /** Entries emitted per section listing, 1..OBSERVE_BOUNDS.maxItems. */
  maxItems?: number;
  /** Test/host seam: runs once between the scan and the confirm pass. */
  interrupt?: () => Promise<void>;
};

const DIGEST_FILE = /^[0-9a-f]{64}\.json$/;
const SLOT_FILE = /^[a-z][a-z0-9._-]{0,63}\.json$/;
const missing = (error: unknown): boolean =>
  (error as NodeJS.ErrnoException).code === "ENOENT";
const message = (error: unknown): string => errorReport(error).message;

/** Read one bounded JSON file; undefined when it does not exist. */
async function readJson(
  path: string,
  maxBytes: number,
): Promise<JsonValue | undefined> {
  let bytes: Uint8Array;
  try {
    bytes = await boundedFileBytes(path, maxBytes, "observe read");
  } catch (error) {
    if (missing(error)) return undefined;
    throw error;
  }
  let value: unknown;
  try {
    value = JSON.parse(
      new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes),
    );
  } catch {
    throw new AlgalError("PARSE_FAILED", `${path} is not UTF-8 JSON`);
  }
  return asJsonValue(value, path);
}

type Named = { name: string; directory: boolean };
/** Enumerate one directory, bounded and sorted; a missing directory is empty. */
async function scanDir(
  path: string,
): Promise<{ entries: Named[]; truncated: boolean }> {
  const entries: Named[] = [];
  let truncated = false;
  try {
    const directory = await opendir(path);
    for await (const entry of directory) {
      if (entries.length >= OBSERVE_BOUNDS.maxDirectoryEntries) {
        truncated = true;
        break;
      }
      entries.push({
        name: entry.name,
        directory: entry.isDirectory() && !entry.isSymbolicLink(),
      });
    }
  } catch (error) {
    if (missing(error)) return { entries: [], truncated: false };
    throw error;
  }
  entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  return { entries, truncated };
}

const namedDigestFiles = (entries: Named[], pattern = DIGEST_FILE): Named[] =>
  entries.filter((entry) => !entry.directory && pattern.test(entry.name));

function listing<T>(
  items: T[],
  total: number,
  truncated: boolean,
): ObserveListing<T> {
  return { items, total, truncated };
}

function section<T>(): ObserveSection<T> {
  return {
    items: [],
    total: 0,
    truncated: false,
    unreadable: 0,
    foreign: 0,
    errors: [],
  };
}

function fail<T>(
  target: ObserveSection<T> | { unreadable: number; errors: { key: string; error: string }[] },
  key: string,
  error: unknown,
): void {
  target.unreadable++;
  if (target.errors.length < OBSERVE_BOUNDS.maxErrors)
    target.errors.push({ key, error: message(error) });
}

type Confirm = () => Promise<boolean>;

async function processHead(path: string, name: string): Promise<Digest> {
  const head = await readJson(join(path, "head.json"), 4_096);
  if (head === undefined)
    throw new AlgalError("STORE_MISS", "process head missing");
  const obj = asObject(head, "process head");
  noUnknownKeys(obj, ["contract", "name", "record"], "process head");
  if (obj.contract !== "algal.process-head.v1" || obj.name !== name)
    throw new AlgalError("RECEIPT_MISMATCH", "process head identity mismatch");
  return asDigest(obj.record, "process record");
}

/** A marker-only directory names an interrupted creation's intended record. */
async function creatingRecord(path: string): Promise<Digest | undefined> {
  const marker = await readJson(
    join(path, ".creating.json"),
    OBSERVE_BOUNDS.maxMarkerBytes,
  );
  if (marker === undefined) return undefined;
  const obj = asObject(marker, "process creation marker");
  noUnknownKeys(obj, ["contract", "name", "record"], "process creation marker");
  if (obj.contract !== "algal.process-creation.v1")
    throw new AlgalError("PARSE_FAILED", "invalid creation marker contract");
  return asDigest(obj.record, "creation marker record");
}

async function observeProcesses(
  dir: string,
  maxItems: number,
  confirms: Confirm[],
): Promise<ObserveSection<ObserveProcess>> {
  const out = section<ObserveProcess>();
  const base = join(dir, "processes");
  const scanned = await scanDir(base);
  out.truncated = scanned.truncated;
  const names: string[] = [];
  for (const entry of scanned.entries) {
    if (entry.name === ".lock") continue;
    if (!entry.directory) {
      out.foreign++;
      continue;
    }
    try {
      names.push(applicationId(entry.name));
    } catch {
      out.foreign++;
    }
  }
  out.total = names.length;
  for (const name of names.slice(0, maxItems)) {
    const path = join(base, name);
    try {
      let record: Digest;
      try {
        record = await processHead(path, name);
      } catch (error) {
        if (!(error instanceof AlgalError) || error.code !== "STORE_MISS")
          throw error;
        const intended = await creatingRecord(path);
        if (intended === undefined) throw error;
        out.items.push({
          name, status: "creating", generation: null, maxGenerations: null,
          manifestDigest: null, record: intended, cause: null, wake: [],
          stable: true,
        });
        confirms.push(async () => {
          const item = out.items.find((entry) => entry.name === name);
          let stable = false;
          try {
            stable =
              (await readJson(join(path, "head.json"), 4_096)) === undefined;
          } catch { /* a head that appeared or failed is a moved pointer */ }
          if (item) item.stable = stable;
          return stable;
        });
        continue;
      }
      const raw = await readJson(
        join(dir, "values", `${record.slice(7)}.json`),
        PROCESS_BOUNDS.maxRecordBytes,
      );
      if (raw === undefined)
        throw new AlgalError("STORE_MISS", "process record missing");
      const parsed = parseProcessRecord(raw);
      if (
        parsed.name !== name ||
        digestCanonical(parsed as unknown as JsonValue) !== record
      )
        throw new AlgalError(
          "DIGEST_MISMATCH",
          "process record identity mismatch",
        );
      out.items.push({
        name,
        status: parsed.status,
        generation: parsed.generation,
        maxGenerations: parsed.maxGenerations,
        manifestDigest: parsed.manifestDigest,
        record,
        cause: parsed.cause ?? null,
        wake: [...parsed.wake],
        stable: true,
      });
      confirms.push(async () => {
        const item = out.items.find((entry) => entry.name === name);
        let stable = false;
        try {
          stable = (await processHead(path, name)) === record;
        } catch { /* a head that failed or vanished is a moved pointer */ }
        if (item) item.stable = stable;
        return stable;
      });
    } catch (error) {
      fail(out, name, error);
    }
  }
  out.truncated = out.truncated || names.length > maxItems;
  return out;
}

async function observeMailboxes(
  dir: string,
  maxItems: number,
  confirms: Confirm[],
): Promise<ObserveSection<ObserveMailbox>> {
  const out = section<ObserveMailbox>();
  const base = join(dir, "mailboxes");
  const scanned = await scanDir(base);
  out.truncated = scanned.truncated;
  const names: string[] = [];
  for (const entry of scanned.entries) {
    if (!entry.directory) {
      out.foreign++;
      continue;
    }
    try {
      names.push(applicationId(entry.name));
    } catch {
      out.foreign++;
    }
  }
  out.total = names.length;
  for (const name of names.slice(0, maxItems)) {
    const path = join(base, name);
    try {
      const config = await readJson(
        join(path, "config.json"),
        OBSERVE_BOUNDS.maxMarkerBytes,
      );
      if (config === undefined)
        throw new AlgalError("STORE_MISS", "mailbox config missing");
      const obj = asObject(config, "mailbox config");
      noUnknownKeys(
        obj,
        ["contract", "name", "maxMessages", "maxMessageBytes", "send", "receive"],
        "mailbox config",
      );
      if (obj.contract !== MAILBOX_CONTRACT || obj.name !== name)
        throw new AlgalError("PARSE_FAILED", "mailbox config identity mismatch");
      const pendingDir = await scanDir(join(path, "pending"));
      const consumedDir = await scanDir(join(path, "consumed"));
      const messagesDir = await scanDir(join(path, "messages"));
      const pendingFiles = namedDigestFiles(pendingDir.entries).map(
        (entry) => entry.name,
      );
      out.foreign += pendingDir.entries.length - pendingFiles.length;
      const pending: ObservePending[] = [];
      for (const file of pendingFiles.slice(0, OBSERVE_BOUNDS.maxPending)) {
        try {
          const marker = await readJson(
            join(path, "pending", file),
            OBSERVE_BOUNDS.maxMarkerBytes,
          );
          if (marker === undefined)
            throw new AlgalError("STORE_MISS", "delivery marker missing");
          const parsed = asObject(marker, "mailbox delivery");
          noUnknownKeys(parsed, ["contract", "id"], "mailbox delivery");
          if (parsed.contract !== MAILBOX_DELIVERY_CONTRACT)
            throw new AlgalError("PARSE_FAILED", "invalid delivery contract");
          pending.push({ file, id: asDigest(parsed.id, "mailbox delivery") });
        } catch (error) {
          fail(out, `${name}/pending/${file}`, error);
        }
      }
      let locked = false;
      try {
        locked = (await lstat(join(path, ".lock"))).isFile();
      } catch (error) {
        if (!missing(error)) throw error;
      }
      const item: ObserveMailbox = {
        name,
        maxMessages: asInt(obj.maxMessages, "mailbox maxMessages", 1, MAILBOX_BOUNDS.maxMessages),
        maxMessageBytes: asInt(obj.maxMessageBytes, "mailbox maxMessageBytes", 1, MAILBOX_BOUNDS.maxMessageBytes),
        send: parseCapabilityHandle(obj.send, MAILBOX_SEND, "mailbox send").handle,
        receive: parseCapabilityHandle(obj.receive, MAILBOX_RECEIVE, "mailbox receive").handle,
        locked,
        pending: listing(
          pending,
          pendingFiles.length,
          pendingDir.truncated ||
            pendingFiles.length > OBSERVE_BOUNDS.maxPending,
        ),
        consumed: {
          count: namedDigestFiles(consumedDir.entries).length,
          truncated: consumedDir.truncated,
        },
        messages: {
          count: namedDigestFiles(messagesDir.entries).length,
          truncated: messagesDir.truncated,
        },
        stable: true,
      };
      out.items.push(item);
      const expected = pendingFiles.join(" ");
      confirms.push(async () => {
        let stable = false;
        try {
          const again = await scanDir(join(path, "pending"));
          stable =
            namedDigestFiles(again.entries)
              .map((entry) => entry.name)
              .join(" ") === expected;
        } catch { /* a pending set that cannot be re-read moved */ }
        item.stable = stable;
        return stable;
      });
    } catch (error) {
      fail(out, name, error);
    }
  }
  out.truncated = out.truncated || names.length > maxItems;
  return out;
}

async function observeCapabilities(
  dir: string,
  maxItems: number,
): Promise<ObserveSection<ObserveCapability>> {
  const out = section<ObserveCapability>();
  const scanned = await scanDir(join(dir, "capabilities"));
  out.truncated = scanned.truncated;
  const files = namedDigestFiles(scanned.entries);
  out.foreign = scanned.entries.length - files.length;
  out.total = files.length;
  for (const entry of files.slice(0, maxItems)) {
    const digest = `sha256:${entry.name.slice(0, -5)}` as Digest;
    try {
      const raw = await readJson(
        join(dir, "capabilities", entry.name),
        OBSERVE_BOUNDS.maxMarkerBytes,
      );
      if (raw === undefined)
        throw new AlgalError("STORE_MISS", "capability record missing");
      const obj = asObject(raw, "capability record");
      noUnknownKeys(
        obj,
        ["contract", "handle", "capability", "mailbox", "nonce", "revoked"],
        "capability record",
      );
      if (obj.contract !== CAPABILITY_CONTRACT)
        throw new AlgalError("PARSE_FAILED", "invalid capability contract");
      if (obj.capability !== MAILBOX_SEND && obj.capability !== MAILBOX_RECEIVE)
        throw new AlgalError("PARSE_FAILED", "capability is not a mailbox right");
      const handle = parseCapabilityHandle(obj.handle, obj.capability);
      if (handle.digest !== digest)
        throw new AlgalError(
          "DIGEST_MISMATCH",
          "capability record is filed under another handle",
        );
      const mailbox = asSafeId(obj.mailbox, "capability mailbox");
      const nonce = asString(obj.nonce, "capability nonce", 128);
      if (
        capabilityHandle(obj.capability, {
          capability: obj.capability,
          contract: CAPABILITY_CONTRACT,
          mailbox,
          nonce,
        } as JsonValue) !== handle.handle
      )
        throw new AlgalError(
          "DIGEST_MISMATCH",
          "capability handle does not match its admission",
        );
      if (obj.revoked !== true && obj.revoked !== false)
        throw new AlgalError("PARSE_FAILED", "capability revoked must be a boolean");
      out.items.push({
        digest,
        handle: handle.handle,
        capability: handle.capability,
        mailbox,
        revoked: obj.revoked,
      });
    } catch (error) {
      fail(out, digest, error);
    }
  }
  out.truncated = out.truncated || files.length > maxItems;
  return out;
}

const DELIVERY_MARKER = "algal.host-delivery.v1";

async function eventStatus(
  root: string,
  eventId: Digest,
  admissionDigest: Digest,
): Promise<{ status: ObserveHostEvent["status"]; message: Digest | null }> {
  const read = (kind: string): Promise<JsonValue | undefined> =>
    readJson(
      join(root, kind, `${eventId.slice(7)}.json`),
      HOST_EVENT_BOUNDS.maxRecordBytes,
    );
  const delivered = await read("delivered");
  const cancelled = await read("cancelled");
  const sending = await read("sending");
  const marker = (
    value: JsonValue | undefined,
    status: string,
  ): Digest | null => {
    if (value === undefined) return null;
    const obj = asObject(value, "host event marker");
    noUnknownKeys(
      obj,
      ["contract", "eventId", "admissionDigest", "status", "messageId"],
      "host event marker",
    );
    if (
      obj.contract !== DELIVERY_MARKER ||
      obj.status !== status ||
      obj.eventId !== eventId ||
      obj.admissionDigest !== admissionDigest
    )
      throw new AlgalError("DIGEST_MISMATCH", "host event marker mismatch");
    return obj.messageId === undefined
      ? null
      : asDigest(obj.messageId, "event messageId");
  };
  if (
    cancelled !== undefined &&
    (sending !== undefined || delivered !== undefined)
  )
    throw new AlgalError(
      "DIGEST_MISMATCH",
      "host event is both cancelled and in flight",
    );
  const deliveredMessage = marker(delivered, "delivered");
  if (delivered !== undefined && sending === undefined)
    throw new AlgalError("DIGEST_MISMATCH", "host event delivery lacks intent");
  if (delivered !== undefined)
    return { status: "delivered", message: deliveredMessage };
  marker(sending, "sending");
  marker(cancelled, "cancelled");
  return {
    status:
      cancelled !== undefined
        ? "cancelled"
        : sending !== undefined
          ? "sending"
          : "pending",
    message: null,
  };
}

async function observeHostEvents(
  dir: string,
  maxItems: number,
  confirms: Confirm[],
): Promise<ObserveSection<ObserveHostEvent>> {
  const out = section<ObserveHostEvent>();
  const root = join(dir, "host-events");
  const scanned = await scanDir(join(root, "events"));
  out.truncated = scanned.truncated;
  const files = namedDigestFiles(scanned.entries);
  out.foreign = scanned.entries.length - files.length;
  out.total = files.length;
  for (const file of files.slice(0, maxItems)) {
    const eventId = `sha256:${file.name.slice(0, -5)}` as Digest;
    try {
      const raw = await readJson(
        join(root, "events", file.name),
        HOST_EVENT_BOUNDS.maxRecordBytes,
      );
      if (raw === undefined)
        throw new AlgalError("STORE_MISS", "host event missing");
      const obj = asObject(raw, "host event");
      noUnknownKeys(
        obj,
        ["contract", "eventId", "source", "deliveryId", "target", "payload", "dueAtMs"],
        "host event",
      );
      if (obj.contract !== HOST_EVENT_CONTRACT || obj.eventId !== eventId)
        throw new AlgalError("DIGEST_MISMATCH", "host event identity mismatch");
      const identity = digestCanonical({
        contract: HOST_EVENT_CONTRACT,
        source: obj.source,
        deliveryId: obj.deliveryId,
      } as JsonValue);
      if (identity !== eventId)
        throw new AlgalError("DIGEST_MISMATCH", "host event identity mismatch");
      const status = await eventStatus(root, eventId, digestCanonical(obj));
      const item: ObserveHostEvent = {
        event: eventId,
        source: String(obj.source),
        deliveryId: String(obj.deliveryId),
        status: status.status,
        dueAtMs: typeof obj.dueAtMs === "number" ? obj.dueAtMs : null,
        message: status.message,
        stable: true,
      };
      out.items.push(item);
      confirms.push(async () => {
        let stable = false;
        try {
          const again = await eventStatus(root, eventId, digestCanonical(obj));
          stable =
            again.status === status.status && again.message === status.message;
        } catch { /* a marker set that cannot be re-read moved */ }
        item.stable = stable;
        return stable;
      });
    } catch (error) {
      fail(out, eventId, error);
    }
  }
  out.truncated = out.truncated || files.length > maxItems;
  return out;
}

async function observeApplications(
  dir: string,
  maxItems: number,
  confirms: Confirm[],
): Promise<ObserveSection<ObserveApplication>> {
  const out = section<ObserveApplication>();
  const base = join(dir, "applications");
  const scanned = await scanDir(base);
  out.truncated = scanned.truncated;
  const names: string[] = [];
  for (const entry of scanned.entries) {
    if (entry.name === ".creation") continue;
    if (!entry.directory) {
      out.foreign++;
      continue;
    }
    try {
      names.push(applicationId(entry.name));
    } catch {
      out.foreign++;
    }
  }
  out.total = names.length;
  for (const name of names.slice(0, maxItems)) {
    const path = join(base, name);
    try {
      const head = await readJson(join(path, "head.json"), 512);
      if (head === undefined)
        throw new AlgalError("STORE_MISS", "application head missing");
      const parsed = parseApplicationHead(head);
      if (parsed.application !== name)
        throw new AlgalError(
          "DIGEST_MISMATCH",
          "application head identity mismatch",
        );
      const item: ObserveApplication = {
        name,
        state: parsed.state,
        sequence: null,
        epoch: null,
        revision: null,
        transition: null,
        operations: { count: 0, truncated: false },
        outbox: { count: 0, truncated: false },
        stable: true,
      };
      const stateRaw = await readJson(
        join(dir, "values", `${parsed.state.slice(7)}.json`),
        262_144,
      );
      if (stateRaw === undefined) {
        fail(
          out,
          name,
          new AlgalError("STORE_MISS", "application state record missing"),
        );
      } else {
        try {
          const state = parseApplicationState(stateRaw);
          if (
            state.application !== name ||
            digestCanonical(state as unknown as JsonValue) !== parsed.state
          )
            throw new AlgalError(
              "DIGEST_MISMATCH",
              "application state identity mismatch",
            );
          item.sequence = state.sequence;
          item.epoch = state.epoch;
          item.revision = state.revision;
          item.transition = state.transition;
        } catch (error) {
          fail(out, name, error);
        }
      }
      const operations = await scanDir(join(path, "operations"));
      const outbox = await scanDir(join(path, "outbox"));
      item.operations = {
        count: namedDigestFiles(operations.entries).length,
        truncated: operations.truncated,
      };
      item.outbox = {
        count: namedDigestFiles(outbox.entries).length,
        truncated: outbox.truncated,
      };
      out.items.push(item);
      confirms.push(async () => {
        let stable = false;
        try {
          const again = await readJson(join(path, "head.json"), 512);
          stable =
            again !== undefined &&
            parseApplicationHead(again).state === parsed.state;
        } catch { /* a head that failed or vanished is a moved pointer */ }
        item.stable = stable;
        return stable;
      });
    } catch (error) {
      fail(out, name, error);
    }
  }
  out.truncated = out.truncated || names.length > maxItems;
  return out;
}

async function observeHabitat(
  dir: string,
  values: Named[],
  maxItems: number,
): Promise<ObserveSnapshot["habitat"]> {
  const habitat: ObserveSnapshot["habitat"] = {
    scanned: 0,
    skipped: 0,
    truncated: false,
    unreadable: 0,
    errors: [],
    accounts: listing([], 0, false),
    schedules: listing([], 0, false),
  };
  let bytes = 0;
  const accounts: ObserveHabitatAccount[] = [];
  const schedules: ObserveHabitatSchedule[] = [];
  for (const entry of values) {
    if (
      habitat.scanned >= OBSERVE_BOUNDS.maxValuesScanned ||
      bytes >= OBSERVE_BOUNDS.maxValueScanBytes
    ) {
      // The unexamined remainder joins the read-bound skips already counted.
      habitat.skipped += values.length - habitat.scanned - habitat.skipped;
      habitat.truncated = true;
      break;
    }
    let raw: JsonValue | undefined;
    try {
      raw = await readJson(
        join(dir, "values", entry.name),
        OBSERVE_BOUNDS.maxRecordBytes,
      );
    } catch (error) {
      if (error instanceof AlgalError && error.code === "BUDGET_EXHAUSTED") {
        habitat.skipped++;
        continue;
      }
      habitat.scanned++;
      fail(habitat, entry.name, error);
      continue;
    }
    habitat.scanned++;
    if (raw === undefined) continue;
    bytes += canonicalize(raw).length;
    if (typeof raw !== "object" || Array.isArray(raw)) continue;
    const contract = (raw as { contract?: unknown }).contract;
    if (
      contract !== "algal.habitat-budget.v1" &&
      contract !== "algal.habitat-schedule.v1"
    )
      continue;
    const digest = `sha256:${entry.name.slice(0, -5)}` as Digest;
    try {
      if (digestCanonical(raw) !== digest)
        throw new AlgalError(
          "DIGEST_MISMATCH",
          "value does not match its address",
        );
      if (contract === "algal.habitat-budget.v1") {
        const account = parseHabitatBudget(raw);
        accounts.push({
          digest,
          activity: account.activity,
          limits: account.limits,
          charged: account.charged,
          runs: account.runs.length,
          outcome: account.outcome,
          refused: account.refused,
        });
      } else {
        const schedule = parseHabitatSchedule(raw);
        schedules.push({
          digest,
          order: schedule.order,
          limits: schedule.limits,
          charged: schedule.charged,
          outcome: schedule.outcome,
          activities: schedule.activities,
          runs: schedule.runs.length,
          refused: schedule.refused,
        });
      }
    } catch (error) {
      fail(habitat, digest, error);
    }
  }
  habitat.accounts = listing(
    accounts.slice(0, maxItems),
    accounts.length,
    accounts.length > maxItems,
  );
  habitat.schedules = listing(
    schedules.slice(0, maxItems),
    schedules.length,
    schedules.length > maxItems,
  );
  habitat.truncated =
    habitat.truncated ||
    habitat.accounts.truncated ||
    habitat.schedules.truncated;
  return habitat;
}

async function observeRuns(
  dir: string,
  names: Named[],
  maxItems: number,
): Promise<ObserveSection<ObserveRun> & { skipped: number }> {
  const out = section<ObserveRun>() as ObserveSection<ObserveRun> & {
    skipped: number;
  };
  out.skipped = 0;
  out.total = names.length;
  const tail = names.slice(-Math.min(maxItems, 64));
  let bytes = 0;
  for (const entry of tail) {
    const digest = `sha256:${entry.name.slice(0, -5)}` as Digest;
    if (bytes >= OBSERVE_BOUNDS.maxRunSectionBytes) {
      out.skipped++;
      continue;
    }
    try {
      const raw = await readJson(
        join(dir, "runs", entry.name),
        OBSERVE_BOUNDS.maxRecordBytes,
      );
      if (raw === undefined)
        throw new AlgalError("STORE_MISS", "run receipt missing");
      bytes += canonicalize(raw).length;
      const obj = asObject(raw, "run receipt");
      out.items.push({
        digest,
        manifestKey: typeof obj.manifestKey === "string" ? obj.manifestKey : null,
        outcome: typeof obj.outcome === "string" ? obj.outcome : null,
        effects: Array.isArray(obj.effects) ? obj.effects.length : null,
      });
    } catch (error) {
      if (error instanceof AlgalError && error.code === "BUDGET_EXHAUSTED") {
        out.skipped++;
        continue;
      }
      fail(out, digest, error);
    }
  }
  out.truncated = names.length > tail.length || out.skipped > 0;
  return out;
}

/** Store areas with a section or counter of their own plus the coordination
 * directories writers keep at the root; anything else lands in `store.other`. */
const STORE_AREAS = [
  ".application-quota",
  ".mailbox-admission",
  ".process-creation",
  "applications",
  "capabilities",
  "effects",
  "host-events",
  "mailboxes",
  "manifests",
  "processes",
  "runs",
  "slots",
  "values",
] as const;

function emptySnapshot(dir: string): ObserveSnapshot {
  return {
    dir,
    consistent: true,
    truncated: false,
    unreadable: 0,
    foreign: 0,
    processes: section(),
    mailboxes: section(),
    capabilities: section(),
    hostEvents: section(),
    applications: section(),
    habitat: {
      scanned: 0,
      skipped: 0,
      truncated: false,
      unreadable: 0,
      errors: [],
      accounts: listing([], 0, false),
      schedules: listing([], 0, false),
    },
    runs: { ...section<ObserveRun>(), skipped: 0 },
    store: {
      manifests: { count: 0, truncated: false },
      values: { count: 0, truncated: false },
      runs: { count: 0, truncated: false },
      effects: { count: 0, truncated: false },
      slots: { count: 0, truncated: false },
      other: listing([], 0, false),
    },
  };
}

/** Project one bounded snapshot of the store's current state. Read-only: no
 * write, mkdir, lease, or lock is taken. The confirm pass re-reads every
 * emitted pointer after the scan; an entry that moved carries
 * `stable: false` and the snapshot reports `consistent: false`. */
export async function observeStore(
  dir: string,
  options: ObserveOptions = {},
): Promise<ObserveSnapshot> {
  const root = resolve(dir);
  const maxItems =
    options.maxItems === undefined
      ? 32
      : Math.min(
          Math.max(1, Math.trunc(options.maxItems)),
          OBSERVE_BOUNDS.maxItems,
        );
  const info = await lstat(root).catch((error: unknown) => {
    if (missing(error)) return undefined;
    throw error;
  });
  if (info === undefined) return emptySnapshot(dir);
  if (info.isSymbolicLink() || !info.isDirectory())
    throw new AlgalError("IO_FAILED", "store path must be a real directory");

  const confirms: Confirm[] = [];
  const processes = await observeProcesses(root, maxItems, confirms);
  const mailboxes = await observeMailboxes(root, maxItems, confirms);
  const capabilities = await observeCapabilities(root, maxItems);
  const hostEvents = await observeHostEvents(root, maxItems, confirms);
  const applications = await observeApplications(root, maxItems, confirms);

  const areas: Record<
    "manifests" | "values" | "runs" | "effects" | "slots",
    { entries: Named[]; truncated: boolean }
  > = {
    manifests: await scanDir(join(root, "manifests")),
    values: await scanDir(join(root, "values")),
    runs: await scanDir(join(root, "runs")),
    effects: await scanDir(join(root, "effects")),
    slots: await scanDir(join(root, "slots")),
  };
  const areaFiles = {
    manifests: namedDigestFiles(areas.manifests.entries),
    values: namedDigestFiles(areas.values.entries),
    runs: namedDigestFiles(areas.runs.entries),
    effects: namedDigestFiles(areas.effects.entries),
    slots: namedDigestFiles(areas.slots.entries, SLOT_FILE),
  };
  const habitat = await observeHabitat(root, areaFiles.values, maxItems);
  const runs = await observeRuns(root, areaFiles.runs, maxItems);
  runs.foreign = areas.runs.entries.length - areaFiles.runs.length;
  const topLevel = await scanDir(root);
  const otherNames = topLevel.entries
    .filter((entry) => !(STORE_AREAS as readonly string[]).includes(entry.name))
    .map((entry) => entry.name);

  const snapshot = emptySnapshot(dir);
  snapshot.processes = processes;
  snapshot.mailboxes = mailboxes;
  snapshot.capabilities = capabilities;
  snapshot.hostEvents = hostEvents;
  snapshot.applications = applications;
  snapshot.habitat = habitat;
  snapshot.runs = runs;
  snapshot.store = {
    manifests: {
      count: areaFiles.manifests.length,
      truncated: areas.manifests.truncated,
    },
    values: { count: areaFiles.values.length, truncated: areas.values.truncated },
    runs: { count: areaFiles.runs.length, truncated: areas.runs.truncated },
    effects: {
      count: areaFiles.effects.length,
      truncated: areas.effects.truncated,
    },
    slots: { count: areaFiles.slots.length, truncated: areas.slots.truncated },
    other: listing(
      otherNames.slice(0, maxItems),
      otherNames.length,
      topLevel.truncated || otherNames.length > maxItems,
    ),
  };
  snapshot.foreign =
    processes.foreign +
    mailboxes.foreign +
    capabilities.foreign +
    hostEvents.foreign +
    applications.foreign +
    (areas.values.entries.length - areaFiles.values.length) +
    (areas.runs.entries.length - areaFiles.runs.length) +
    (areas.manifests.entries.length - areaFiles.manifests.length) +
    (areas.effects.entries.length - areaFiles.effects.length) +
    (areas.slots.entries.length - areaFiles.slots.length);
  snapshot.unreadable =
    processes.unreadable +
    mailboxes.unreadable +
    capabilities.unreadable +
    hostEvents.unreadable +
    applications.unreadable +
    habitat.unreadable +
    runs.unreadable;
  snapshot.truncated =
    processes.truncated ||
    mailboxes.truncated ||
    capabilities.truncated ||
    hostEvents.truncated ||
    applications.truncated ||
    habitat.truncated ||
    runs.truncated ||
    areas.values.truncated ||
    areas.runs.truncated ||
    areas.manifests.truncated ||
    areas.effects.truncated ||
    areas.slots.truncated ||
    topLevel.truncated ||
    snapshot.store.other.truncated;

  await options.interrupt?.();
  // Confirm pass: re-read each emitted pointer. Anything that moved between
  // the two reads flags the entry and the snapshot; records themselves are
  // immutable, so a moved pointer means the view straddled a transition.
  for (const confirm of confirms) {
    if (!(await confirm())) snapshot.consistent = false;
  }
  return snapshot;
}

export type ObserveChange = {
  /** The section that changed, in emission order. */
  section:
    | "processes"
    | "mailboxes"
    | "capabilities"
    | "hostEvents"
    | "applications"
    | "habitat.accounts"
    | "habitat.schedules"
    | "runs"
    | "meta";
  /** Process name, record digest, event id, or counter path. */
  key: string;
  change: "added" | "changed" | "removed";
  /** Digest of the previously projected value; null for an added key. */
  previous: Digest | null;
  /** The newly projected value; null for a removed key. */
  value: JsonValue | null;
};

/** The sections diffed in emission order; keys sort within each section. */
const CHANGE_SECTIONS: ObserveChange["section"][] = [
  "processes",
  "mailboxes",
  "capabilities",
  "hostEvents",
  "applications",
  "habitat.accounts",
  "habitat.schedules",
  "runs",
  "meta",
];

type Flattened = { section: ObserveChange["section"]; value: JsonValue };

/** Flatten a snapshot to key→value rows for diffing. `stable` flags and the
 * directory name are observation detail, not store state, and never diff. */
function flatten(snapshot: ObserveSnapshot): Map<string, Flattened> {
  const map = new Map<string, Flattened>();
  const strip = (value: object): JsonValue => {
    const { stable: _stable, ...rest } = value as Record<string, unknown>;
    return rest as JsonValue;
  };
  for (const item of snapshot.processes.items)
    map.set(`processes:${item.name}`, { section: "processes", value: strip(item) });
  for (const item of snapshot.mailboxes.items)
    map.set(`mailboxes:${item.name}`, { section: "mailboxes", value: strip(item) });
  for (const item of snapshot.capabilities.items)
    map.set(`capabilities:${item.digest}`, { section: "capabilities", value: strip(item) });
  for (const item of snapshot.hostEvents.items)
    map.set(`hostEvents:${item.event}`, { section: "hostEvents", value: strip(item) });
  for (const item of snapshot.applications.items)
    map.set(`applications:${item.name}`, { section: "applications", value: strip(item) });
  for (const item of snapshot.habitat.accounts.items)
    map.set(`habitat.accounts:${item.digest}`, { section: "habitat.accounts", value: item as unknown as JsonValue });
  for (const item of snapshot.habitat.schedules.items)
    map.set(`habitat.schedules:${item.digest}`, { section: "habitat.schedules", value: item as unknown as JsonValue });
  for (const item of snapshot.runs.items)
    map.set(`runs:${item.digest}`, { section: "runs", value: item as unknown as JsonValue });
  // Counter rows surface changes beyond the listed pages: totals, truncation,
  // failure counts, and the store-wide file counts.
  const meta = (key: string, value: JsonValue): void => {
    map.set(`meta:${key}`, { section: "meta", value });
  };
  const metaOf = (s: ObserveSection<unknown> | ObserveListing<unknown>) => ({
    total: s.total,
    truncated: s.truncated,
    ...("unreadable" in s ? { unreadable: s.unreadable } : {}),
    ...("foreign" in s ? { foreign: s.foreign } : {}),
    ...("skipped" in s ? { skipped: s.skipped } : {}),
  });
  meta("consistent", snapshot.consistent);
  meta("processes", metaOf(snapshot.processes) as JsonValue);
  meta("mailboxes", metaOf(snapshot.mailboxes) as JsonValue);
  meta("capabilities", metaOf(snapshot.capabilities) as JsonValue);
  meta("hostEvents", metaOf(snapshot.hostEvents) as JsonValue);
  meta("applications", metaOf(snapshot.applications) as JsonValue);
  meta("runs", metaOf(snapshot.runs) as JsonValue);
  meta("habitat", {
    scanned: snapshot.habitat.scanned,
    skipped: snapshot.habitat.skipped,
    truncated: snapshot.habitat.truncated,
    unreadable: snapshot.habitat.unreadable,
    accounts: snapshot.habitat.accounts.total,
    schedules: snapshot.habitat.schedules.total,
  });
  meta("store.manifests", snapshot.store.manifests as unknown as JsonValue);
  meta("store.values", snapshot.store.values as unknown as JsonValue);
  meta("store.runs", snapshot.store.runs as unknown as JsonValue);
  meta("store.effects", snapshot.store.effects as unknown as JsonValue);
  meta("store.slots", snapshot.store.slots as unknown as JsonValue);
  meta("store.other", {
    total: snapshot.store.other.total,
    truncated: snapshot.store.other.truncated,
  });
  return map;
}

/** The deterministic diff between two snapshots: sections emit in
 * CHANGE_SECTIONS order, keys sort lexicographically within a section, and
 * each key emits at most one change. */
export function diffSnapshots(
  before: ObserveSnapshot,
  after: ObserveSnapshot,
): ObserveChange[] {
  const a = flatten(before);
  const b = flatten(after);
  const changes: ObserveChange[] = [];
  for (const section of CHANGE_SECTIONS) {
    const keys = new Set<string>();
    for (const key of a.keys())
      if (a.get(key)!.section === section) keys.add(key);
    for (const key of b.keys())
      if (b.get(key)!.section === section) keys.add(key);
    for (const flat of [...keys].sort()) {
      const prev = a.get(flat);
      const next = b.get(flat);
      if (
        prev !== undefined &&
        next !== undefined &&
        canonicalize(prev.value) === canonicalize(next.value)
      )
        continue;
      changes.push({
        section,
        key: flat.slice(flat.indexOf(":") + 1),
        change:
          prev === undefined
            ? "added"
            : next === undefined
              ? "removed"
              : "changed",
        previous: prev === undefined ? null : digestCanonical(prev.value),
        value: next === undefined ? null : next.value,
      });
    }
  }
  return changes;
}

export type ObserveFollowEvent =
  | { event: "snapshot"; sequence: number; snapshot: ObserveSnapshot }
  | (ObserveChange & { event: "change"; sequence: number })
  | {
      event: "error";
      sequence: number;
      error: { code: string; message: string };
    }
  | {
      event: "end";
      sequence: number;
      reason: "poll-limit" | "event-limit" | "interrupted";
      polls: number;
      emitted: number;
    };

export type ObserveFollowOptions = ObserveOptions & {
  /** Host-side pause between snapshots, in milliseconds. */
  intervalMs?: number;
  /** Most polls before the follow stops. */
  maxPolls?: number;
  /** Most emitted events before the follow stops. */
  maxEvents?: number;
  signal?: AbortSignal;
  /** Test/host seam: awaited once after each poll's emissions. */
  afterPoll?: (poll: number) => Promise<void>;
  /** Test/host seam: replaces the interval sleep. */
  sleep?: (ms: number, signal?: AbortSignal) => Promise<void>;
};

export type ObserveFollowResult = {
  polls: number;
  emitted: number;
  reason: "poll-limit" | "event-limit" | "interrupted";
};

async function defaultSleep(
  milliseconds: number,
  signal?: AbortSignal,
): Promise<void> {
  if (signal?.aborted) return;
  await new Promise<void>((done) => {
    const finish = () => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", finish);
      done();
    };
    const timer = setTimeout(finish, milliseconds);
    signal?.addEventListener("abort", finish, { once: true });
  });
}

/** Poll the store and emit the initial snapshot, each change in
 * `diffSnapshots` order, and a terminal `end` event. Emitted events carry a
 * monotonically increasing `sequence` and no wall-clock field; the interval,
 * poll count, and stop reason live in the host loop. */
export async function followStore(
  dir: string,
  emit: (event: ObserveFollowEvent) => void,
  options: ObserveFollowOptions = {},
): Promise<ObserveFollowResult> {
  const intervalMs = Math.min(
    Math.max(OBSERVE_BOUNDS.minIntervalMs, Math.trunc(options.intervalMs ?? 250)),
    OBSERVE_BOUNDS.maxIntervalMs,
  );
  const maxPolls = Math.min(
    Math.max(1, Math.trunc(options.maxPolls ?? 1_024)),
    OBSERVE_BOUNDS.maxPolls,
  );
  const maxEvents = Math.min(
    Math.max(1, Math.trunc(options.maxEvents ?? 4_096)),
    OBSERVE_BOUNDS.maxEvents,
  );
  const sleep = options.sleep ?? defaultSleep;
  let sequence = 0;
  let emitted = 0;
  const send = (event: ObserveFollowEvent): boolean => {
    emit(event);
    sequence++;
    emitted++;
    return emitted < maxEvents;
  };
  let polls = 0;
  let previous: ObserveSnapshot | undefined;
  let broke = false;
  while (polls < maxPolls && emitted < maxEvents) {
    if (options.signal?.aborted) break;
    let snapshot: ObserveSnapshot;
    try {
      snapshot = await observeStore(dir, options);
    } catch (error) {
      send({
        event: "error",
        sequence,
        error: errorReport(error),
      });
      previous = undefined;
      polls++;
      await options.afterPoll?.(polls);
      await sleep(intervalMs, options.signal);
      continue;
    }
    if (previous === undefined) {
      if (!send({ event: "snapshot", sequence, snapshot })) {
        broke = true;
        break;
      }
    } else {
      for (const change of diffSnapshots(previous, snapshot)) {
        if (!send({ event: "change", sequence, ...change })) {
          broke = true;
          break;
        }
      }
      if (broke) break;
    }
    previous = snapshot;
    polls++;
    await options.afterPoll?.(polls);
    if (options.signal?.aborted) break;
    if (polls < maxPolls && emitted < maxEvents)
      await sleep(intervalMs, options.signal);
  }
  const reason: ObserveFollowResult["reason"] = options.signal?.aborted
    ? "interrupted"
    : broke || emitted >= maxEvents
      ? "event-limit"
      : "poll-limit";
  emit({
    event: "end",
    sequence,
    reason,
    polls,
    emitted,
  });
  return { polls, emitted, reason };
}
