// `algal vendor check` and `algal vendor update`: the only read paths that
// consult a vendored copy's recorded origin again. `check` fetches each
// record's catalog page under the same bounds vendoring uses and reports, per
// directory, whether the page is unchanged, revised, missing the entry, or
// unreadable — every outcome is a fact in an `algal.vendor-check.v1` report,
// not an abort. `update` re-vendors one entry through the ordinary vendor
// pipeline into a directory that did not exist and emits an
// `algal.vendor-update.v1` proposal naming the old and new lock pins; nothing
// edits a lock or an existing copy. `lock`, `verify`, and `dependencies`
// never fetch.
import { realpath } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { asDigest, digestCanonical, digestText, type Digest } from "./digest";
import { AlgalError } from "./errors";
import { parseLibraryIndex } from "./library-index";
import { boundedJsonSnapshot, freezeDeep, printableText } from "./source-dependencies";
import { loadSourceFiles } from "./source-project";
import type { SourceLockVendored } from "./source-lock";
import { compareUtf8 } from "./utf8";
import { asArray, asObject, asString, noUnknownKeys, optField, reqField, type JsonObject } from "./values";
import { entryClosure, openVendorCatalog, vendorCatalogEntry, VENDOR_FETCH_BOUNDS, type VendorFetchContext } from "./vendor";
import {
  parseVendorRecord, vendorOrigin, vendorPath, vendorRecordToJson, VENDOR_BOUNDS, VENDOR_RECORD_FILE,
  type VendoredSources, type VendorRecord,
} from "./vendor-record";

export const VENDOR_CHECK_CONTRACT = "algal.vendor-check.v1" as const;
export const VENDOR_UPDATE_CONTRACT = "algal.vendor-update.v1" as const;
export const VENDOR_CHECK_BOUNDS = Object.freeze({
  /** One report or proposal covers at most every vendored directory a project may hold. */
  maxEntries: VENDOR_BOUNDS.maxDirectories,
  /** Characters of a `reason` on a `removed` or `unreadable` entry. */
  maxReasonLength: 512,
  /** Own-data limits for a check report or an update proposal value. */
  record: Object.freeze({ maxBytes: 65_536, maxDepth: 4, maxNodes: 1_024, maxEntries: 16, maxStringBytes: 1_024 }),
});

export const VENDOR_CHECK_STATUSES = ["unchanged", "update-available", "removed", "unreadable"] as const;
export type VendorCheckStatus = typeof VENDOR_CHECK_STATUSES[number];
/** One vendored directory's outcome: the pinned catalog and record digests,
 * the live page digest when a page was read, and a reason when the entry is
 * `removed` or `unreadable`. */
export type VendorCheckEntry = {
  readonly directory: string;
  readonly entry: string;
  readonly origin: string;
  /** SHA-256 of the catalog page the copy was checked against. */
  readonly catalog: Digest;
  /** Digest of the record's canonical JSON; the pin `lock` would write. */
  readonly record: Digest;
  readonly status: VendorCheckStatus;
  /** SHA-256 of the page as fetched; absent when no page could be read. */
  readonly live?: Digest;
  readonly reason?: string;
};
export type VendorCheck = {
  readonly contract: typeof VENDOR_CHECK_CONTRACT;
  /** Present when the check was restricted to records naming this origin. */
  readonly from?: string;
  /** Every checked directory, sorted by directory. */
  readonly entries: readonly VendorCheckEntry[];
};

/** An update proposal: the lock's `vendored` pin as it stands and the pin a
 * re-locked project would write for the fresh copy. `status` is
 * `update-available` when the live page's digest moved, `unchanged` when a
 * re-vendor produced the same catalog pin. */
export type VendorUpdate = {
  readonly contract: typeof VENDOR_UPDATE_CONTRACT;
  readonly status: "unchanged" | "update-available";
  readonly from: SourceLockVendored;
  readonly to: SourceLockVendored;
};

const checks = new WeakSet<VendorCheck>();
const REFUSED = "vendor check: only reports created by checkVendoredCatalogs or parseVendorCheck can be rendered";
const SEGMENT = /^[A-Za-z0-9_-][A-Za-z0-9_.-]*$/;
const fail = (message: string): never => { throw new AlgalError("PARSE_FAILED", `vendor: ${message}`); };
const failed = (message: string, error: unknown): AlgalError => {
  const code = (error as NodeJS.ErrnoException | undefined)?.code;
  return new AlgalError("IO_FAILED", `vendor: ${message}${typeof code === "string" ? ` (${code})` : ""}`);
};
/** One line of a failure message, printable and bounded, for a report's `reason`. */
const reason = (error: unknown): string =>
  [...printableText((error instanceof Error ? error.message : String(error)).replaceAll("\n", " "))].slice(0, VENDOR_CHECK_BOUNDS.maxReasonLength).join("");

/** Lone surrogates are not text; they would also cost six JSON bytes each. */
function wellFormed(text: string): boolean {
  for (let index = 0; index < text.length; index++) {
    const unit = text.charCodeAt(index);
    if (unit >= 0xdc00 && unit <= 0xdfff) return false;
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = text.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return false;
      index++;
    }
  }
  return true;
}
/** A project-relative directory, with the lock's own key rules. */
function directoryPath(value: unknown, what: string): string {
  const key = asString(value, what, VENDOR_BOUNDS.maxPathLength);
  const invalid = key.includes("\\") || key.includes(":") || !wellFormed(key)
    || [...key].some(char => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127)
    || key.split("/").some(part => !part || part === "." || part === "..");
  if (invalid) throw new AlgalError("PARSE_FAILED", `${what} must be a normalized project-relative directory`);
  return key;
}
/** A directory a new copy is written into: the vendor command's own stricter
 * rule of plain segments only. */
function intoDirectory(value: unknown, what: string): string {
  const key = asString(value, what, VENDOR_BOUNDS.maxPathLength);
  if (key.length === 0 || key.split("/").some(part => !SEGMENT.test(part))) {
    throw new AlgalError("PARSE_FAILED", `${what} must be a relative path of plain segments (letters, digits, ".", "_", "-")`);
  }
  return key;
}

/** A recorded origin names the page to read: an https URL, a loopback http URL
 * from a test, or a file URL for a local page — which `openVendorCatalog`
 * takes as a path. */
export function catalogForOrigin(origin: string): string {
  if (!origin.startsWith("file:")) return origin;
  try { return fileURLToPath(origin); }
  catch { throw new AlgalError("PARSE_FAILED", `vendor: origin ${origin} is not a readable file URL`); }
}

/** The `vendored` list element a lock would record for a record written
 * beneath `directory`. */
function vendoredPin(directory: string, record: VendorRecord): SourceLockVendored {
  return { directory, origin: record.origin, catalog: record.catalog, entry: record.entry, record: digestCanonical(vendorRecordToJson(record)) };
}

export type VendorCheckOptions = Partial<VendorFetchContext> & {
  /** Report only directories whose record names this catalog origin. */
  readonly from?: string;
};

/** Fetch each vendored directory's recorded catalog page and report what the
 * pin would find now. Records come as closed data (`loadVendoredSources`);
 * each is parsed strictly before its origin is contacted, and an origin that
 * fails, a page that does not parse, or a page that no longer resolves the
 * entry becomes a report entry rather than an abort. A page whose bytes still
 * digest to the pinned `catalog` is `unchanged`; a page that moved and still
 * resolves the entry is `update-available`; a page that cannot supply the
 * entry is `removed`; anything else is `unreadable` with a bounded reason.
 * At most `VENDOR_BOUNDS.maxDirectories` fetches happen, each under the
 * vendoring bounds, and nothing is written.
 */
export async function checkVendoredCatalogs(vendored: VendoredSources, options: VendorCheckOptions = {}): Promise<VendorCheck> {
  const timeoutMs = options.timeoutMs ?? VENDOR_FETCH_BOUNDS.timeoutMs;
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > VENDOR_FETCH_BOUNDS.maxTimeoutMs) {
    fail(`timeout must be 1 to ${VENDOR_FETCH_BOUNDS.maxTimeoutMs} milliseconds`);
  }
  const context: VendorFetchContext = { timeoutMs, allowLoopbackHttp: options.allowLoopbackHttp === true };
  const from = options.from === undefined ? undefined : vendorOrigin(options.from, "vendor check --from");
  const entries: VendorCheckEntry[] = [];
  for (const directory of Object.keys(vendored.records).sort(compareUtf8)) {
    const record = parseVendorRecord(vendored.records[directory], `${directory}/${VENDOR_RECORD_FILE}`);
    if (from !== undefined && record.origin !== from) continue;
    const pinned = { directory, entry: record.entry, origin: record.origin, catalog: record.catalog, record: digestCanonical(vendorRecordToJson(record)) };
    let text: string;
    try {
      text = (await openVendorCatalog(catalogForOrigin(record.origin), context)).text;
    } catch (error) {
      entries.push({ ...pinned, status: "unreadable", reason: reason(error) });
      continue;
    }
    const live = digestText(text);
    let index;
    try { index = parseLibraryIndex(text); }
    catch (error) {
      entries.push({ ...pinned, status: "unreadable", live, reason: reason(error) });
      continue;
    }
    try { entryClosure(index, record.entry); }
    catch (error) {
      entries.push({ ...pinned, status: "removed", live, reason: reason(error) });
      continue;
    }
    entries.push({ ...pinned, live, status: live === record.catalog ? "unchanged" : "update-available" });
  }
  const report: VendorCheck = { contract: VENDOR_CHECK_CONTRACT, ...(from === undefined ? {} : { from }), entries };
  freezeDeep(report);
  checks.add(report);
  return report;
}

function status(value: unknown, what: string): VendorCheckStatus {
  const name = asString(value, what, 24);
  if (!(VENDOR_CHECK_STATUSES as readonly string[]).includes(name)) throw new AlgalError("PARSE_FAILED", `${what} must be one of ${VENDOR_CHECK_STATUSES.join(", ")}`);
  return name as VendorCheckStatus;
}
function entryReason(value: unknown, what: string): string {
  const text = asString(value, what, VENDOR_CHECK_BOUNDS.maxReasonLength);
  if (!wellFormed(text)) throw new AlgalError("PARSE_FAILED", `${what} must be well-formed text`);
  return text;
}

/** Parse foreign report data strictly: the contract, an optional `from`
 * origin, and a bounded list of entries sorted by unique directory. `live`
 * digests appear exactly where a page was read (always for `removed`, never
 * required for `unreadable`), and `reason` exactly where a status explains
 * itself. The result is fresh, frozen, and renderable. */
export function parseVendorCheck(value: unknown): VendorCheck {
  const object = asObject(boundedJsonSnapshot(value, VENDOR_CHECK_BOUNDS.record, "vendor check"), "vendor check");
  noUnknownKeys(object, ["contract", "from", "entries"], "vendor check");
  if (object.contract !== VENDOR_CHECK_CONTRACT) throw new AlgalError("PARSE_FAILED", `vendor check: expected contract "${VENDOR_CHECK_CONTRACT}"`);
  const fromValue = optField(object, "from");
  const from = fromValue === undefined ? undefined : vendorOrigin(fromValue, "vendor check from");
  const raw = asArray(reqField(object, "entries", "vendor check"), "vendor check entries");
  if (raw.length > VENDOR_CHECK_BOUNDS.maxEntries) throw new AlgalError("BUDGET_EXHAUSTED", `vendor check entries exceed ${VENDOR_CHECK_BOUNDS.maxEntries}`);
  const entries = raw.map((item, index): VendorCheckEntry => {
    const what = `vendor check entry ${index}`;
    const entry = asObject(item, what);
    noUnknownKeys(entry, ["directory", "entry", "origin", "catalog", "record", "status", "live", "reason"], what);
    const found = status(reqField(entry, "status", what), `${what} status`);
    const liveValue = optField(entry, "live");
    const reasonValue = optField(entry, "reason");
    const parsed: VendorCheckEntry = {
      directory: directoryPath(reqField(entry, "directory", what), `${what} directory`),
      entry: vendorPath(reqField(entry, "entry", what), `${what} entry`),
      origin: vendorOrigin(reqField(entry, "origin", what), `${what} origin`),
      catalog: asDigest(reqField(entry, "catalog", what), `${what} catalog`),
      record: asDigest(reqField(entry, "record", what), `${what} record`),
      status: found,
      ...(liveValue === undefined ? {} : { live: asDigest(liveValue, `${what} live`) }),
      ...(reasonValue === undefined ? {} : { reason: entryReason(reasonValue, `${what} reason`) }),
    };
    if (found === "unreadable" || found === "removed") {
      if (parsed.reason === undefined) throw new AlgalError("PARSE_FAILED", `${what} ${found} requires "reason"`);
      if (found === "removed" && parsed.live === undefined) throw new AlgalError("PARSE_FAILED", `${what} removed requires "live"`);
    } else {
      if (parsed.reason !== undefined) throw new AlgalError("PARSE_FAILED", `${what} ${found} must not carry "reason"`);
      if (parsed.live === undefined) throw new AlgalError("PARSE_FAILED", `${what} ${found} requires "live"`);
    }
    return parsed;
  });
  for (let index = 1; index < entries.length; index++) {
    if (compareUtf8(entries[index - 1]!.directory, entries[index]!.directory) >= 0) throw new AlgalError("PARSE_FAILED", "vendor check entries must be sorted by unique directory");
  }
  const report: VendorCheck = { contract: VENDOR_CHECK_CONTRACT, ...(from === undefined ? {} : { from }), entries };
  freezeDeep(report);
  checks.add(report);
  return report;
}

export function vendorCheckToJson(check: VendorCheck): JsonObject {
  return {
    contract: check.contract,
    ...(check.from === undefined ? {} : { from: check.from }),
    entries: check.entries.map(entry => ({
      directory: entry.directory, entry: entry.entry, origin: entry.origin, catalog: entry.catalog, record: entry.record,
      status: entry.status, ...(entry.live === undefined ? {} : { live: entry.live }), ...(entry.reason === undefined ? {} : { reason: entry.reason }),
    })),
  };
}

/** One-line label: parsed keys and tokens exclude controls already; this keeps a forged field on its own line. */
const label = (text: string): string => printableText(text.replaceAll("\n", ""));

/** Render a report this module produced or parsed; foreign objects are refused. */
export function renderVendorCheck(check: VendorCheck): string {
  if (!checks.has(check)) throw new AlgalError("PARSE_FAILED", REFUSED);
  const counts = new Map<VendorCheckStatus, number>();
  for (const entry of check.entries) counts.set(entry.status, (counts.get(entry.status) ?? 0) + 1);
  const summary = VENDOR_CHECK_STATUSES.filter(name => counts.has(name)).map(name => `${counts.get(name)} ${name}`).join(", ");
  const lines = [
    `ALGAL vendor check · ${check.entries.length} director${check.entries.length === 1 ? "y" : "ies"}${summary.length === 0 ? "" : ` · ${summary}`}${check.from === undefined ? "" : ` · from ${check.from}`}`,
  ];
  if (check.entries.length === 0) lines.push("The project pins no vendored directories.");
  for (const entry of check.entries) {
    const digests = entry.live === undefined ? `catalog ${entry.catalog}` : `catalog ${entry.catalog} -> live ${entry.live}`;
    lines.push(`  ${label(entry.directory)} ${label(entry.entry)}: ${entry.status} (${digests})${entry.reason === undefined ? "" : ` · ${label(entry.reason)}`}`);
  }
  return `${lines.join("\n")}\n`;
}

/** A lock pin in an update proposal, parsed strictly: the same fields
 * `parseVendored` checks, without the requirement that the directory hold a
 * project unit (the proposal precedes the re-lock that would pin it). */
function updatePin(value: unknown, what: string): SourceLockVendored {
  const object = asObject(value, what);
  noUnknownKeys(object, ["directory", "origin", "catalog", "entry", "record"], what);
  return {
    directory: directoryPath(reqField(object, "directory", what), `${what} directory`),
    origin: vendorOrigin(reqField(object, "origin", what), `${what} origin`),
    catalog: asDigest(reqField(object, "catalog", what), `${what} catalog`),
    entry: vendorPath(reqField(object, "entry", what), `${what} entry`),
    record: asDigest(reqField(object, "record", what), `${what} record`),
  };
}

/** Parse foreign proposal data strictly: the contract, the status, and the
 * two pins. The result is fresh, frozen data. */
export function parseVendorUpdate(value: unknown): VendorUpdate {
  const object = asObject(boundedJsonSnapshot(value, VENDOR_CHECK_BOUNDS.record, "vendor update"), "vendor update");
  noUnknownKeys(object, ["contract", "status", "from", "to"], "vendor update");
  if (object.contract !== VENDOR_UPDATE_CONTRACT) throw new AlgalError("PARSE_FAILED", `vendor update: expected contract "${VENDOR_UPDATE_CONTRACT}"`);
  const name = asString(reqField(object, "status", "vendor update"), "vendor update status", 24);
  if (name !== "unchanged" && name !== "update-available") throw new AlgalError("PARSE_FAILED", `vendor update status must be "unchanged" or "update-available"`);
  const update: VendorUpdate = { contract: VENDOR_UPDATE_CONTRACT, status: name, from: updatePin(reqField(object, "from", "vendor update"), "vendor update from"), to: updatePin(reqField(object, "to", "vendor update"), "vendor update to") };
  if (update.from.directory === update.to.directory) throw new AlgalError("PARSE_FAILED", "vendor update pins two records at the same directory");
  return freezeDeep(update);
}

export function vendorUpdateToJson(update: VendorUpdate): JsonObject {
  const pin = (item: SourceLockVendored): JsonObject => ({ directory: item.directory, origin: item.origin, catalog: item.catalog, entry: item.entry, record: item.record });
  return { contract: update.contract, status: update.status, from: pin(update.from), to: pin(update.to) };
}

export type VendorUpdateOptions = Partial<VendorFetchContext> & {
  /** The vendored directory to re-read, relative to `root`. */
  readonly directory: string;
  /** The fresh directory the revised copy is written into, relative to `root`. */
  readonly into: string;
  /** Directory that both paths are relative to, usually the project directory. */
  readonly root: string;
};

/** Re-vendor the entry one vendored directory records, from the origin its
 * record names, into a fresh directory beneath `root`. The existing copy is
 * never touched and the catalog digests are checked by the ordinary pipeline:
 * a page that no longer lists the entry or whose listed digests no longer
 * match the download fails before anything is written. The result is an
 * `algal.vendor-update.v1` proposal naming the pin the lock holds and the pin
 * a re-lock would write; applying it is a separate step (update the import,
 * run `lock` again) that this command never performs.
 */
export async function proposeVendorUpdate(options: VendorUpdateOptions): Promise<VendorUpdate> {
  const directory = directoryPath(options.directory, "vendored directory");
  const into = intoDirectory(options.into, "the directory to create");
  const timeoutMs = options.timeoutMs ?? VENDOR_FETCH_BOUNDS.timeoutMs;
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > VENDOR_FETCH_BOUNDS.maxTimeoutMs) {
    fail(`timeout must be 1 to ${VENDOR_FETCH_BOUNDS.maxTimeoutMs} milliseconds`);
  }
  let root: string;
  try { root = await realpath(options.root); } catch (error) { throw failed("cannot resolve the project directory", error); }
  const key = `${directory}/${VENDOR_RECORD_FILE}`;
  const texts = await loadSourceFiles(root, [key], VENDOR_BOUNDS.record.maxBytes, { noun: "vendor record" });
  let value: unknown;
  try { value = JSON.parse(texts[key]!); } catch { throw new AlgalError("PARSE_FAILED", `${key} is not valid JSON`); }
  const record = parseVendorRecord(value, key);
  const revised = await vendorCatalogEntry({
    catalog: catalogForOrigin(record.origin), entry: record.entry, into, root: options.root,
    timeoutMs, allowLoopbackHttp: options.allowLoopbackHttp === true,
  });
  return freezeDeep({
    contract: VENDOR_UPDATE_CONTRACT,
    status: revised.catalog === record.catalog ? "unchanged" : "update-available",
    from: vendoredPin(directory, record),
    to: vendoredPin(into, revised),
  });
}
