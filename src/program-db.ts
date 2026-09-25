// Program database — a derived, disposable structural index over the
// content-addressed store, with a bounded declarative query surface.
// `bun:sqlite` materializes relations from the records on disk; a query is
// JSON parsed with unknown-key rejection and answered with generated SQL
// over whitelisted tables, columns, and operators. Raw SQL never crosses
// the seam: bun:sqlite exposes no authorizer hook, and a parsed shape gives
// every count, byte size, and list a bound.
//
// The index is host tooling, not contract data. Manifests, receipts, and
// records keep their bytes; nothing a run depends on is stored here; the
// database can be deleted and rebuilt at any time. `meta.state` fingerprints
// the store state that was indexed, and `programIndexStatus` rescans entry
// names (plus the small mutable head/config/slot files) and reports drift.
// Unreadable or foreign records are counted and skipped, never fatal.

import { Database } from "bun:sqlite";
import { lstat, mkdir, open, readdir, rename, rm } from "node:fs/promises";
import { join, resolve } from "node:path";
import { BOUNDS, parseOrganismManifest, type OrganismManifest, type PortMap } from "./contract";
import { asDigest, digestCanonical, type Digest } from "./digest";
import { AlgalError } from "./errors";
import { PROCESS_BOUNDS, PROCESS_CONTRACT, parseProcessRecord } from "./process";
import { parseRunReceipt } from "./run";
import { parseEffectReceipt } from "./effects";
import {
  applicationId,
  applicationObject,
  applicationRef,
  parseApplicationHead,
  parseApplicationRevision,
  parseApplicationState,
  parseApplicationTransition,
} from "./application-contract";
import { parseApplicationEvaluation } from "./application-adaptation";
import { compareUtf8, utf8Length } from "./utf8";
import {
  asArray,
  asInt,
  asJsonValue,
  asObject,
  asString,
  canonicalBytes,
  canonicalize,
  noUnknownKeys,
  optField,
  reqField,
  type JsonObject,
  type JsonValue,
} from "./values";

export const PROGRAM_DB_FILE = "program.db";
export const PROGRAM_DB_SCHEMA = "algal.program-db.v1";

export const PROGRAM_DB_BOUNDS = Object.freeze({
  /** Directory entries scanned per record place. */
  maxFiles: 65_536,
  /** Rows materialized per relation. */
  maxRowsPerRelation: 1_048_576,
  maxManifestBytes: BOUNDS.maxManifestBytes,
  maxReceiptBytes: PROCESS_BOUNDS.maxReceiptBytes,
  /** A values/ record larger than this is counted without parsing. */
  maxValueBytes: 4_194_304,
  maxSlotBytes: BOUNDS.maxBlobBytes,
  /** head.json, .creating.json, mailbox config.json, capability records. */
  maxSmallFileBytes: 16_384,
  maxApplicationFileBytes: 262_144,
  /** Skipped-record rows listed per build; the rest are counted. */
  maxSkippedListed: 256,
  // Query surface.
  maxQueryBytes: 8_192,
  /** Total nodes across columns, predicates, order keys, and `in` values. */
  maxQueryNodes: 128,
  maxColumns: 32,
  maxPredicates: 32,
  maxInList: 64,
  maxOrders: 8,
  maxRows: 1_024,
  defaultRows: 64,
  maxRowBytes: 4_096,
  maxResultBytes: 1_048_576,
  /** Closure walk depth for revisions-for-executable. */
  maxClosureDepth: 64,
} as const);

/** Scan/query limits a test or embedder may tighten. */
export type ProgramDbLimits = {
  maxFiles?: number;
  maxRowsPerRelation?: number;
  maxValueBytes?: number;
  maxRows?: number;
  maxResultBytes?: number;
};

type Limits = Required<ProgramDbLimits>;

function limits(overrides?: ProgramDbLimits): Limits {
  const out: Limits = {
    maxFiles: PROGRAM_DB_BOUNDS.maxFiles,
    maxRowsPerRelation: PROGRAM_DB_BOUNDS.maxRowsPerRelation,
    maxValueBytes: PROGRAM_DB_BOUNDS.maxValueBytes,
    maxRows: PROGRAM_DB_BOUNDS.maxRows,
    maxResultBytes: PROGRAM_DB_BOUNDS.maxResultBytes,
  };
  for (const key of ["maxFiles", "maxRowsPerRelation", "maxValueBytes", "maxRows", "maxResultBytes"] as const) {
    const value = overrides?.[key];
    if (value === undefined) continue;
    if (!Number.isSafeInteger(value) || value < 1 || value > PROGRAM_DB_BOUNDS[key]) {
      throw new AlgalError("PARSE_FAILED", `program-db limit "${key}" must be 1..${PROGRAM_DB_BOUNDS[key]}`);
    }
    out[key] = value;
  }
  return out;
}

// ------------------------------------------------------------- relations ---

/** The queryable relations and their column types. `db tables` renders this. */
export const PROGRAM_DB_TABLES = {
  manifests: {
    columns: { digest: "text", key: "text", name: "text", cells: "integer", edges: "integer", bytes: "integer" },
    description: "One row per admitted manifest under manifests/: canonical digest, key, name, cell and edge counts, file bytes.",
  },
  cells: {
    columns: { manifest_digest: "text", cell: "text", kind: "text", detail: "text", out_kind: "text", out_schema_digest: "text" },
    description: "One row per cell per manifest. detail carries the fn, tool, or slot name (and slot mode) for those kinds, the child reference for organism/each/repeat; out_kind is the declared output contract kind for effect cells; out_schema_digest is the canonical digest of a json output schema.",
  },
  cell_ports: {
    columns: { manifest_digest: "text", cell: "text", direction: "text", port: "text", type: "text", capability: "text", schema_digest: "text" },
    description: "Port maps declared on cells (direction in/out). capability is set on cap ports; schema_digest on json ports that carry a schema. fn, tool, and organism ports live in the registry or the child manifest, not here.",
  },
  manifest_children: {
    columns: { manifest_digest: "text", cell: "text", kind: "text", child_digest: "text" },
    description: "Static composition edges: organism, each, and repeat cells linking a parent manifest digest to the child manifest reference it embeds.",
  },
  receipts: {
    columns: { digest: "text", execution_digest: "text", manifest_digest: "text", manifest_key: "text", outcome: "text", steps: "integer", agent_calls: "integer", work_units: "integer", committed: "integer", skipped: "integer", failed: "integer", suspended: "integer", bytes: "integer" },
    description: "One row per run receipt under runs/. digest is the storage digest (the runs/ filename); execution_digest is the receipt's intrinsic digest field. Cell counts come from the receipt's cells map; work_units is recorded work.",
  },
  receipt_cells: {
    columns: { receipt_digest: "text", path: "text", status: "text", work: "integer" },
    description: "One row per cell record inside a receipt: cell path, committed/skipped/failed/suspended status, recorded work.",
  },
  receipt_capabilities: {
    columns: { receipt_digest: "text", source: "text", capability: "text" },
    description: "Capability classes a receipt touched: source arg for cap handles in run arguments, wake for handles recorded on suspended effects.",
  },
  values_index: {
    columns: { digest: "text", contract: "text", bytes: "integer" },
    description: "Every parsed record under values/: canonical digest, its contract tag (null for values without one), file bytes.",
  },
  process_records: {
    columns: { digest: "text", name: "text", generation: "integer", max_generations: "integer", status: "text", manifest_digest: "text", receipt_digest: "text", previous_digest: "text", head: "integer" },
    description: "Every algal.process.v1 record found under values/, head = 1 on the record a processes/<name>/head.json points at.",
  },
  process_capabilities: {
    columns: { record_digest: "text", name: "text", source: "text", capability: "text", handle: "text" },
    description: "Capability handles on process records: source wake for the wake list, cause for a capability cause, arg for handles inside arguments.",
  },
  processes: {
    columns: { name: "text", head_digest: "text", status: "text", generation: "integer", max_generations: "integer", manifest_digest: "text", receipt_digest: "text" },
    description: "Latest record per process name: the processes/<name>/head.json join. Null fields when the head's record is absent or skipped.",
  },
  applications: {
    columns: { name: "text", head_digest: "text", sequence: "integer", epoch: "integer", revision_digest: "text" },
    description: "Latest state per application: applications/<name>/head.json joined to the indexed application-state record.",
  },
  app_revisions: {
    columns: { digest: "text", application: "text", parent_digest: "text" },
    description: "algal.application-revision.v1 records: program, schema, and policy bundle pinned by digest, chained by parent.",
  },
  app_entrypoints: {
    columns: { revision_digest: "text", name: "text", manifest_digest: "text" },
    description: "Entrypoints declared by each revision: name plus the executable manifest digest it runs.",
  },
  app_states: {
    columns: { digest: "text", application: "text", sequence: "integer", epoch: "integer", revision_digest: "text", transition_digest: "text" },
    description: "algal.application-state.v1 records: committed history, genesis to head.",
  },
  app_transitions: {
    columns: { digest: "text", application: "text", kind: "text", revision_digest: "text", previous_digest: "text" },
    description: "algal.application-transition.v1 records: create, memory, investigate, activate, migrate, restore, propose.",
  },
  app_evaluations: {
    columns: { digest: "text", candidate_revision: "text", parent_state: "text", verdict: "text" },
    description: "algal.application-evaluation.v1 records: candidate revision measured at a parent state, verdict accepted, rejected, or incomplete.",
  },
  app_operations: {
    columns: { digest: "text", application: "text", operation: "text", transition_digest: "text", state_digest: "text" },
    description: "applications/<name>/operations records: the stable binding of an operation to its transition and resulting state.",
  },
  app_dispatches: {
    columns: { digest: "text", application: "text", intent_digest: "text", status: "text" },
    description: "applications/<name>/outbox records: started, settled, blocked, or uncertain dispatches of an intent; the filename is the intent digest.",
  },
  slots: {
    columns: { name: "text", digest: "text", bytes: "integer" },
    description: "Mutable slot cells' current state: name, canonical digest of the value, file bytes.",
  },
  effects: {
    columns: { key: "text", request_digest: "text", executor: "text", ok: "integer", bytes: "integer" },
    description: "Effect memo records under effects/: storage key, the request digest answered, executor id, whether the receipt holds an output (1) or an error (0).",
  },
  record_kinds: {
    columns: { place: "text", contract: "text", files: "integer", bytes: "integer" },
    description: "Histogram of what the store held at index time: place (manifests, runs, values, effects, slots, processes, applications, mailboxes, capabilities, other) by contract tag.",
  },
  skipped: {
    columns: { place: "text", name: "text", reason: "text" },
    description: "Records the index could not read or classify, each with a short reason; the build report counts any overflow not listed here.",
  },
} as const;

export type ProgramTable = keyof typeof PROGRAM_DB_TABLES;
type ColumnType = "text" | "integer";

const SCHEMA = `
CREATE TABLE meta(k TEXT PRIMARY KEY, v TEXT NOT NULL);
CREATE TABLE manifests(digest TEXT PRIMARY KEY, key TEXT NOT NULL, name TEXT NOT NULL, cells INTEGER NOT NULL, edges INTEGER NOT NULL, bytes INTEGER NOT NULL);
CREATE TABLE cells(manifest_digest TEXT NOT NULL, cell TEXT NOT NULL, kind TEXT NOT NULL, detail TEXT, out_kind TEXT, out_schema_digest TEXT, PRIMARY KEY(manifest_digest, cell));
CREATE TABLE cell_ports(manifest_digest TEXT NOT NULL, cell TEXT NOT NULL, direction TEXT NOT NULL, port TEXT NOT NULL, type TEXT NOT NULL, capability TEXT, schema_digest TEXT, PRIMARY KEY(manifest_digest, cell, direction, port));
CREATE TABLE manifest_children(manifest_digest TEXT NOT NULL, cell TEXT NOT NULL, kind TEXT NOT NULL, child_digest TEXT NOT NULL, PRIMARY KEY(manifest_digest, cell));
CREATE TABLE receipts(digest TEXT PRIMARY KEY, execution_digest TEXT, manifest_digest TEXT, manifest_key TEXT, outcome TEXT, steps INTEGER, agent_calls INTEGER, work_units INTEGER, committed INTEGER, skipped INTEGER, failed INTEGER, suspended INTEGER, bytes INTEGER NOT NULL);
CREATE INDEX receipts_manifest ON receipts(manifest_digest);
CREATE INDEX receipts_outcome ON receipts(outcome);
CREATE TABLE receipt_cells(receipt_digest TEXT NOT NULL, path TEXT NOT NULL, status TEXT NOT NULL, work INTEGER NOT NULL, PRIMARY KEY(receipt_digest, path));
CREATE INDEX receipt_cells_status ON receipt_cells(status);
CREATE TABLE receipt_capabilities(receipt_digest TEXT NOT NULL, source TEXT NOT NULL, capability TEXT NOT NULL, PRIMARY KEY(receipt_digest, source, capability));
CREATE INDEX receipt_capabilities_class ON receipt_capabilities(capability);
CREATE TABLE values_index(digest TEXT PRIMARY KEY, contract TEXT, bytes INTEGER NOT NULL);
CREATE INDEX values_contract ON values_index(contract);
CREATE TABLE process_records(digest TEXT PRIMARY KEY, name TEXT NOT NULL, generation INTEGER NOT NULL, max_generations INTEGER NOT NULL, status TEXT NOT NULL, manifest_digest TEXT NOT NULL, receipt_digest TEXT, previous_digest TEXT, head INTEGER NOT NULL);
CREATE INDEX process_records_name ON process_records(name);
CREATE TABLE process_capabilities(record_digest TEXT NOT NULL, name TEXT NOT NULL, source TEXT NOT NULL, capability TEXT NOT NULL, handle TEXT NOT NULL, PRIMARY KEY(record_digest, source, handle));
CREATE INDEX process_capabilities_class ON process_capabilities(capability);
CREATE TABLE processes(name TEXT PRIMARY KEY, head_digest TEXT NOT NULL, status TEXT, generation INTEGER, max_generations INTEGER, manifest_digest TEXT, receipt_digest TEXT);
CREATE TABLE applications(name TEXT PRIMARY KEY, head_digest TEXT NOT NULL, sequence INTEGER, epoch INTEGER, revision_digest TEXT);
CREATE TABLE app_revisions(digest TEXT PRIMARY KEY, application TEXT NOT NULL, parent_digest TEXT);
CREATE INDEX app_revisions_app ON app_revisions(application);
CREATE TABLE app_entrypoints(revision_digest TEXT NOT NULL, name TEXT NOT NULL, manifest_digest TEXT NOT NULL, PRIMARY KEY(revision_digest, name));
CREATE INDEX app_entrypoints_manifest ON app_entrypoints(manifest_digest);
CREATE TABLE app_states(digest TEXT PRIMARY KEY, application TEXT NOT NULL, sequence INTEGER NOT NULL, epoch INTEGER NOT NULL, revision_digest TEXT NOT NULL, transition_digest TEXT NOT NULL);
CREATE INDEX app_states_app ON app_states(application);
CREATE TABLE app_transitions(digest TEXT PRIMARY KEY, application TEXT NOT NULL, kind TEXT NOT NULL, revision_digest TEXT NOT NULL, previous_digest TEXT);
CREATE INDEX app_transitions_app ON app_transitions(application);
CREATE TABLE app_evaluations(digest TEXT PRIMARY KEY, candidate_revision TEXT NOT NULL, parent_state TEXT NOT NULL, verdict TEXT NOT NULL);
CREATE INDEX app_evaluations_revision ON app_evaluations(candidate_revision);
CREATE TABLE app_operations(digest TEXT PRIMARY KEY, application TEXT NOT NULL, operation TEXT NOT NULL, transition_digest TEXT NOT NULL, state_digest TEXT NOT NULL);
CREATE TABLE app_dispatches(digest TEXT PRIMARY KEY, application TEXT NOT NULL, intent_digest TEXT NOT NULL, status TEXT NOT NULL);
CREATE TABLE slots(name TEXT PRIMARY KEY, digest TEXT NOT NULL, bytes INTEGER NOT NULL);
CREATE TABLE effects(key TEXT PRIMARY KEY, request_digest TEXT, executor TEXT, ok INTEGER, bytes INTEGER NOT NULL);
CREATE TABLE record_kinds(place TEXT NOT NULL, contract TEXT, files INTEGER NOT NULL, bytes INTEGER NOT NULL, PRIMARY KEY(place, contract));
CREATE TABLE skipped(place TEXT NOT NULL, name TEXT NOT NULL, reason TEXT NOT NULL, PRIMARY KEY(place, name));
`;

export function programDbPath(dir: string): string {
  return join(dir, PROGRAM_DB_FILE);
}

// -------------------------------------------------------------- scanning ---

const HEX_NAME = /^[0-9a-f]{64}\.json$/;
const CAP_HANDLE = /^cap:([a-z][a-z0-9-]{0,63}):sha256:[0-9a-f]{64}$/;
const SLOT_NAME = /^[a-z][a-z0-9._-]{0,63}\.json$/;
const PROCESS_NAME = /^[a-z][a-z0-9-]{0,63}$/;
const APPLICATION_NAME = /^[a-z][a-z0-9._-]{0,63}$/;

export const PROGRAM_DB_PLACES = [
  "manifests",
  "runs",
  "values",
  "effects",
  "slots",
  "processes",
  "applications",
  "mailboxes",
  "capabilities",
  "other",
] as const;
export type ProgramPlace = (typeof PROGRAM_DB_PLACES)[number];
/** Directories whose entries carry record content the index reads. */
const RECORD_PLACES: Record<string, true> = {
  manifests: true, runs: true, values: true, effects: true, slots: true,
  processes: true, applications: true, mailboxes: true, capabilities: true,
};
/** Derived or coordination files at a store root that are never records. */
const DERIVED_FILES = /^\.|(program|semantic)\.db(-(journal|wal|shm))?$/;

type Skipped = { place: string; name: string; reason: string };
export type ProgramPlaceFingerprint = { entries: number; digest: Digest; truncated: boolean; skipped: number };
export type ProgramFingerprint = Record<ProgramPlace, ProgramPlaceFingerprint>;

function shortReason(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  const line = message.split("\n")[0] ?? "unreadable";
  return [...line].slice(0, 240).join("");
}

/** Read one record file: regular, not a symlink, within `maxBytes`, parsed JSON. */
async function readRecord(path: string, maxBytes: number): Promise<{ value: unknown; bytes: number }> {
  const stat = await lstat(path);
  if (!stat.isFile() || stat.isSymbolicLink()) throw new AlgalError("IO_FAILED", "not a regular file");
  if (stat.size > maxBytes) throw new AlgalError("BUDGET_EXHAUSTED", `over ${maxBytes} bytes`);
  const file = await open(path, "r");
  try {
    const text = await file.readFile("utf8");
    return { value: JSON.parse(text) as unknown, bytes: stat.size };
  } finally {
    await file.close();
  }
}

/** List one level of a record directory: `pattern`-matching names sorted,
 * non-matching non-hidden names returned as foreign. More than `max`
 * matching names truncates the walk — the extra entries are fingerprinted
 * through `names` only up to the bound. */
async function listRecords(
  dir: string,
  pattern: RegExp,
  max: number,
): Promise<{ names: string[]; foreign: string[]; truncated: boolean }> {
  let raw: string[] = [];
  try {
    raw = (await readdir(dir)).sort();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    return { names: [], foreign: [], truncated: false };
  }
  const names: string[] = [];
  const foreign: string[] = [];
  let truncated = false;
  for (const name of raw) {
    if (pattern.test(name)) {
      if (names.length >= max) { truncated = true; continue; }
      names.push(name);
    } else if (!name.startsWith(".") && !name.endsWith(".tmp")) {
      foreign.push(name);
    }
  }
  return { names, foreign, truncated };
}

/** Cap classes mentioned anywhere inside a JSON value's `cap:` strings. */
function capabilitiesIn(value: JsonValue, into: Set<string>, depth = 0): void {
  if (depth > 64 || into.size > 64) return;
  if (typeof value === "string") {
    const match = CAP_HANDLE.exec(value);
    if (match) into.add(match[1]!);
    return;
  }
  if (value !== null && typeof value === "object") {
    for (const child of Object.values(value)) capabilitiesIn(child, into, depth + 1);
  }
}

/** Whole cap handles inside a value, mapped to their class (process rows). */
function handlesIn(value: JsonValue, into: Map<string, string>, depth = 0): void {
  if (depth > 64 || into.size > 64) return;
  if (typeof value === "string") {
    const match = CAP_HANDLE.exec(value);
    if (match) into.set(value, match[1]!);
    return;
  }
  if (value !== null && typeof value === "object") {
    for (const child of Object.values(value)) handlesIn(child, into, depth + 1);
  }
}

type Sink = {
  /** Insert one row; beyond the relation cap the row drops and the relation is flagged truncated. */
  add(relation: ProgramTable, columns: (string | number | null)[]): void;
  truncated: Set<string>;
};

function makeSink(db: Database, lim: Limits): { sink: Sink; inserted: Record<string, number> } {
  const requested: Record<string, number> = {};
  const inserted: Record<string, number> = {};
  const truncated = new Set<string>();
  const prepared = new Map<string, ReturnType<Database["prepare"]>>();
  return {
    inserted,
    sink: {
      truncated,
      add(relation, columns) {
        requested[relation] = (requested[relation] ?? 0) + 1;
        if ((inserted[relation] ?? 0) >= lim.maxRowsPerRelation) {
          truncated.add(relation);
          return;
        }
        let stmt = prepared.get(relation);
        if (!stmt) {
          stmt = db.prepare(
            `INSERT OR REPLACE INTO ${relation} VALUES(${Object.keys(PROGRAM_DB_TABLES[relation].columns).map(() => "?").join(",")})`,
          );
          prepared.set(relation, stmt);
        }
        stmt.run(...columns);
        inserted[relation] = (inserted[relation] ?? 0) + 1;
      },
    },
  };
}

/** Per-place bookkeeping the walk returns: fingerprint inputs and tallies. */
type Walk = {
  fingerprint: ProgramFingerprint;
  skipped: Skipped[];
  skippedTotal: number;
  /** (place, contract) → {files, bytes} histogram accumulator. */
  kinds: Map<string, { place: string; contract: string | null; files: number; bytes: number }>;
};

function newWalk(): Walk {
  const fingerprint = {} as ProgramFingerprint;
  for (const place of PROGRAM_DB_PLACES) {
    fingerprint[place] = { entries: 0, digest: digestCanonical([]), truncated: false, skipped: 0 };
  }
  return { fingerprint, skipped: [], skippedTotal: 0, kinds: new Map() };
}

function note(walk: Walk, place: ProgramPlace, contract: string | null, bytes: number): void {
  const key = `${place}${contract ?? ""}`;
  const row = walk.kinds.get(key) ?? { place, contract, files: 0, bytes: 0 };
  row.files += 1;
  row.bytes += bytes;
  walk.kinds.set(key, row);
}

function skip(walk: Walk, place: ProgramPlace, name: string, reason: string): void {
  walk.fingerprint[place].skipped += 1;
  walk.skippedTotal += 1;
  if (walk.skipped.length < PROGRAM_DB_BOUNDS.maxSkippedListed) {
    walk.skipped.push({ place, name, reason });
  }
}

function setFingerprint(walk: Walk, place: ProgramPlace, entries: string[], truncated: boolean): void {
  walk.fingerprint[place] = {
    entries: entries.length,
    digest: digestCanonical(entries as JsonValue),
    truncated,
    skipped: walk.fingerprint[place].skipped,
  };
}

/** Walk a CAS directory of `<hex>.json` files. Yields digest + file name. */
async function* casFiles(
  dir: string,
  place: "manifests" | "runs" | "values" | "effects" | "capabilities",
  walk: Walk,
  lim: Limits,
): AsyncGenerator<{ digest: Digest; name: string }> {
  const listed = await listRecords(join(dir, place), HEX_NAME, lim.maxFiles);
  for (const foreign of listed.foreign) skip(walk, place, foreign, "foreign name");
  setFingerprint(walk, place, listed.names, listed.truncated);
  for (const name of listed.names) {
    yield { digest: `sha256:${name.slice(0, -5)}` as Digest, name };
  }
}

/** Port-map rows for one cell: declared ports only, in both directions. */
function scanPorts(sink: Sink, digest: Digest, cellId: string, map: PortMap | undefined, direction: "in" | "out"): void {
  for (const [port, type] of Object.entries(map ?? {})) {
    sink.add("cell_ports", [
      digest, cellId, direction, port, type.type,
      type.type === "cap" ? type.capability : null,
      type.type === "json" && type.schema !== undefined ? digestCanonical(type.schema) : null,
    ]);
  }
}

function scanManifest(manifest: OrganismManifest, digest: Digest, bytes: number, sink: Sink): void {
  sink.add("manifests", [digest, manifest.key, manifest.name, manifest.cells.length, manifest.edges.length, bytes]);
  for (const cell of manifest.cells) {
    let detail: string | null = null;
    let outKind: string | null = null;
    let outSchema: Digest | null = null;
    switch (cell.kind) {
      case "fn": detail = cell.fn; break;
      case "tool": detail = cell.tool; break;
      case "slot": detail = `${cell.mode}:${cell.name}`; break;
      case "organism":
      case "each":
      case "repeat":
        detail = cell.manifest;
        sink.add("manifest_children", [digest, cell.id, cell.kind, cell.manifest]);
        break;
      case "agent":
      case "expr":
        outKind = cell.output.kind;
        if (cell.output.kind === "json") outSchema = digestCanonical(cell.output.schema);
        break;
      case "classifier":
      case "gate":
        outKind = cell.output.kind;
        break;
      case "decide":
      case "recall":
        // Derived outputs: a json record of answers / ranked hits.
        outKind = "json";
        break;
      default: break;
    }
    sink.add("cells", [digest, cell.id, cell.kind, detail, outKind, outSchema]);
    if (cell.kind === "input") scanPorts(sink, digest, cell.id, cell.outputs, "out");
    if (cell.kind === "const") scanPorts(sink, digest, cell.id, cell.outputs as PortMap, "out");
    if ("inputs" in cell) scanPorts(sink, digest, cell.id, cell.inputs as PortMap | undefined, "in");
  }
}

function scanReceipt(json: JsonValue, digest: Digest, bytes: number, sink: Sink): void {
  const receipt = parseRunReceipt(json);
  const counts = { committed: 0, skipped: 0, failed: 0, suspended: 0 };
  for (const record of Object.values(receipt.cells)) counts[record.status] += 1;
  sink.add("receipts", [
    digest, receipt.digest, receipt.manifestDigest, receipt.manifestKey, receipt.outcome,
    receipt.work.steps, receipt.work.agentCalls, receipt.work.units,
    counts.committed, counts.skipped, counts.failed, counts.suspended, bytes,
  ]);
  for (const [path, record] of Object.entries(receipt.cells)) {
    sink.add("receipt_cells", [digest, path, record.status, record.work]);
  }
  const argClasses = new Set<string>();
  capabilitiesIn(receipt.args as unknown as JsonValue, argClasses);
  for (const capability of [...argClasses].sort(compareUtf8)) {
    sink.add("receipt_capabilities", [digest, "arg", capability]);
  }
  const wakeClasses = new Set<string>();
  for (const effect of receipt.effects) {
    for (const handle of effect.wake ?? []) {
      const parsed = CAP_HANDLE.exec(handle);
      if (parsed) wakeClasses.add(parsed[1]!);
    }
  }
  for (const capability of [...wakeClasses].sort(compareUtf8)) {
    sink.add("receipt_capabilities", [digest, "wake", capability]);
  }
}

/** Strict read of a values/ record into whichever typed relation its
 * contract tag claims. The values_index row always lands; a record that
 * claims a known contract but fails its parser is skipped by the caller. */
function scanValue(digest: Digest, json: JsonValue, bytes: number, sink: Sink): void {
  const contract =
    typeof json === "object" && json !== null && !Array.isArray(json) && typeof json.contract === "string"
      ? json.contract
      : null;
  sink.add("values_index", [digest, contract, bytes]);
  switch (contract) {
    case PROCESS_CONTRACT: {
      const record = parseProcessRecord(json);
      sink.add("process_records", [
        digest, record.name, record.generation, record.maxGenerations, record.status,
        record.manifestDigest, record.receipt ?? null, record.previous ?? null, 0,
      ]);
      const wake = new Map<string, string>();
      for (const handle of record.wake) {
        const parsed = CAP_HANDLE.exec(handle);
        if (parsed) wake.set(handle, parsed[1]!);
      }
      for (const [handle, capability] of [...wake].sort(([a], [b]) => compareUtf8(a, b))) {
        sink.add("process_capabilities", [digest, record.name, "wake", capability, handle]);
      }
      if (record.cause !== undefined && record.cause !== "start" && record.cause !== "manual") {
        const parsed = CAP_HANDLE.exec(record.cause);
        if (parsed) sink.add("process_capabilities", [digest, record.name, "cause", parsed[1]!, record.cause]);
      }
      const args = new Map<string, string>();
      handlesIn(record.args as unknown as JsonValue, args);
      for (const [handle, capability] of [...args].sort(([a], [b]) => compareUtf8(a, b))) {
        sink.add("process_capabilities", [digest, record.name, "arg", capability, handle]);
      }
      break;
    }
    case "algal.application-revision.v1": {
      const revision = parseApplicationRevision(json);
      sink.add("app_revisions", [digest, revision.application, revision.parent]);
      for (const entrypoint of revision.entrypoints) {
        sink.add("app_entrypoints", [digest, entrypoint.name, entrypoint.manifest]);
      }
      break;
    }
    case "algal.application-state.v1": {
      const state = parseApplicationState(json);
      sink.add("app_states", [digest, state.application, state.sequence, state.epoch, state.revision, state.transition]);
      break;
    }
    case "algal.application-transition.v1": {
      const transition = parseApplicationTransition(json);
      sink.add("app_transitions", [digest, transition.application, transition.kind, transition.revision, transition.previous]);
      break;
    }
    case "algal.application-evaluation.v1": {
      const evaluation = parseApplicationEvaluation(json);
      sink.add("app_evaluations", [digest, evaluation.candidateRevision, evaluation.parentState, evaluation.verdict.status]);
      break;
    }
    default:
      break;
  }
}

type ProcessHead = { name: string; record: Digest };
type ApplicationHeadRef = { name: string; state: Digest };

async function walkStore(
  dir: string,
  lim: Limits,
  deep: { sink: Sink } | null,
  walk: Walk,
): Promise<{ heads: ProcessHead[]; appHeads: ApplicationHeadRef[] }> {
  const heads: ProcessHead[] = [];
  const appHeads: ApplicationHeadRef[] = [];

  // manifests/, runs/, values/, effects/ — CAS files named by digest.
  for (const place of ["manifests", "runs", "values", "effects"] as const) {
    for await (const { digest, name } of casFiles(dir, place, walk, lim)) {
      const max =
        place === "manifests" ? PROGRAM_DB_BOUNDS.maxManifestBytes
        : place === "runs" ? PROGRAM_DB_BOUNDS.maxReceiptBytes
        : place === "values" ? lim.maxValueBytes
        : lim.maxValueBytes; // effect receipts carry bounded executor output
      let record: { value: unknown; bytes: number };
      try {
        record = await readRecord(join(dir, place, name), max);
      } catch (error) {
        skip(walk, place, name, shortReason(error));
        continue;
      }
      try {
        const json = asJsonValue(record.value, `${place} record`);
        if (place !== "effects" && digestCanonical(json) !== digest) {
          throw new AlgalError("DIGEST_MISMATCH", `${place} file does not hash to its name`);
        }
        if (place === "manifests") {
          const manifest = parseOrganismManifest(json);
          note(walk, place, "algal.organism.v1", record.bytes);
          if (deep) scanManifest(manifest, digest, record.bytes, deep.sink);
        } else if (place === "runs") {
          note(walk, place, "algal.run.v1", record.bytes);
          if (deep) scanReceipt(json, digest, record.bytes, deep.sink);
        } else if (place === "effects") {
          const effect = parseEffectReceipt(json);
          note(walk, place, "algal.effect.v1", record.bytes);
          deep?.sink.add("effects", [
            digest, effect.requestDigest, effect.executor,
            effect.output !== undefined ? 1 : 0, record.bytes,
          ]);
        } else {
          note(walk, place,
            typeof json === "object" && json !== null && !Array.isArray(json) && typeof json.contract === "string"
              ? json.contract : null,
            record.bytes);
          if (deep) scanValue(digest, json, record.bytes, deep.sink);
        }
      } catch (error) {
        skip(walk, place, name, shortReason(error));
      }
    }
  }

  // slots/ — named mutable values; the fingerprint carries the content digest.
  {
    const listed = await listRecords(join(dir, "slots"), SLOT_NAME, lim.maxFiles);
    const entries: string[] = [];
    for (const foreign of listed.foreign) skip(walk, "slots", foreign, "foreign name");
    for (const name of listed.names) {
      const slot = name.slice(0, -5);
      try {
        const record = await readRecord(join(dir, "slots", name), PROGRAM_DB_BOUNDS.maxSlotBytes);
        const json = asJsonValue(record.value, "slot value");
        const valueDigest = digestCanonical(json);
        entries.push(`${slot}:${valueDigest.slice(7)}`);
        note(walk, "slots", null, record.bytes);
        deep?.sink.add("slots", [slot, valueDigest, record.bytes]);
      } catch (error) {
        skip(walk, "slots", name, shortReason(error));
      }
    }
    entries.sort(compareUtf8);
    setFingerprint(walk, "slots", entries, listed.truncated);
  }

  // processes/<name>/ — head.json points at a values/ process record.
  {
    const listed = await listRecords(join(dir, "processes"), PROCESS_NAME, lim.maxFiles);
    const entries: string[] = [];
    for (const foreign of listed.foreign) skip(walk, "processes", foreign, "foreign name");
    for (const name of listed.names) {
      const stat = await lstat(join(dir, "processes", name)).catch(() => null);
      if (!stat?.isDirectory() || stat.isSymbolicLink()) {
        skip(walk, "processes", name, "not a directory");
        continue;
      }
      entries.push(name);
      const head = await readRecord(join(dir, "processes", name, "head.json"), PROGRAM_DB_BOUNDS.maxSmallFileBytes)
        .then((r) => r.value)
        .catch((error: unknown) => {
          if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
          skip(walk, "processes", `${name}/head.json`, shortReason(error));
          return undefined;
        });
      if (head !== undefined) {
        try {
          const obj = asObject(head, "process head");
          noUnknownKeys(obj, ["contract", "name", "record"], "process head");
          if (obj.contract !== "algal.process-head.v1") throw new AlgalError("PARSE_FAILED", "invalid process head contract");
          if (obj.name !== name) throw new AlgalError("PARSE_FAILED", "process head name does not match its directory");
          const record = asDigest(obj.record, "process head record");
          heads.push({ name, record });
          entries.push(`${name}:head:${record.slice(7)}`);
          note(walk, "processes", "algal.process-head.v1", 0);
        } catch (error) {
          skip(walk, "processes", `${name}/head.json`, shortReason(error));
        }
      }
      const creating = await readRecord(join(dir, "processes", name, ".creating.json"), PROGRAM_DB_BOUNDS.maxSmallFileBytes)
        .then((r) => r.value)
        .catch(() => undefined);
      if (creating !== undefined) {
        try {
          const obj = asObject(creating, "process creation marker");
          if (obj.contract === "algal.process-creation.v1") {
            entries.push(`${name}:creating:${digestCanonical(obj).slice(7)}`);
            note(walk, "processes", "algal.process-creation.v1", 0);
          }
        } catch { /* marker residue stays out of the fingerprint */ }
      }
    }
    entries.sort(compareUtf8);
    setFingerprint(walk, "processes", entries, listed.truncated);
  }

  // applications/<name>/ — head.json, operations/, outbox/. The operation
  // and dispatch filenames are semantic refs (operation and intent digests),
  // not content digests — the row's digest column is the canonical digest.
  {
    const root = join(dir, "applications");
    const listed = await listRecords(root, APPLICATION_NAME, lim.maxFiles);
    const entries: string[] = [];
    for (const foreign of listed.foreign) skip(walk, "applications", foreign, "foreign name");
    for (const name of listed.names) {
      const stat = await lstat(join(root, name)).catch(() => null);
      if (!stat?.isDirectory() || stat.isSymbolicLink()) {
        skip(walk, "applications", name, "not a directory");
        continue;
      }
      entries.push(name);
      const head = await readRecord(join(root, name, "head.json"), PROGRAM_DB_BOUNDS.maxSmallFileBytes)
        .then((r) => r.value)
        .catch((error: unknown) => {
          if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
          skip(walk, "applications", `${name}/head.json`, shortReason(error));
          return undefined;
        });
      if (head !== undefined) {
        try {
          const parsed = parseApplicationHead(head);
          if (parsed.application !== name) throw new AlgalError("PARSE_FAILED", "application head name does not match its directory");
          appHeads.push({ name, state: parsed.state });
          entries.push(`${name}:head:${parsed.state.slice(7)}`);
          note(walk, "applications", "algal.application-head.v1", 0);
        } catch (error) {
          skip(walk, "applications", `${name}/head.json`, shortReason(error));
        }
      }
      for (const sub of ["operations", "outbox"] as const) {
        const subListed = await listRecords(join(root, name, sub), HEX_NAME, lim.maxFiles);
        for (const foreign of subListed.foreign) skip(walk, "applications", `${name}/${sub}/${foreign}`, "foreign name");
        entries.push(...subListed.names.map((file) => `${name}/${sub}/${file}`));
        for (const file of subListed.names) {
          try {
            const record = await readRecord(join(root, name, sub, file), PROGRAM_DB_BOUNDS.maxApplicationFileBytes);
            const ref = `sha256:${file.slice(0, -5)}`;
            if (sub === "operations") {
              const obj = applicationObject(record.value, ["contract", "application", "operation", "request", "transition", "state"]);
              if (obj.contract !== "algal.application-operation.v1") throw new AlgalError("PARSE_FAILED", "unexpected operation contract");
              if (applicationRef(obj.operation) !== ref) throw new AlgalError("PARSE_FAILED", "operation file name does not match its operation ref");
              const contentDigest = digestCanonical(obj);
              note(walk, "applications", "algal.application-operation.v1", record.bytes);
              deep?.sink.add("app_operations", [
                contentDigest, applicationId(obj.application), applicationRef(obj.operation),
                applicationRef(obj.transition), applicationRef(obj.state),
              ]);
            } else {
              const obj = applicationObject(record.value, ["contract", "application", "intent", "sourceState", "configurationDigest", "identity", "plan", "status", "result", "reason"]);
              if (obj.contract !== "algal.application-dispatch.v1") throw new AlgalError("PARSE_FAILED", "unexpected dispatch contract");
              if (applicationRef(obj.intent) !== ref) throw new AlgalError("PARSE_FAILED", "dispatch file name does not match its intent ref");
              const status = asString(obj.status, "dispatch status", 32);
              if (!["started", "settled", "blocked", "uncertain"].includes(status)) {
                throw new AlgalError("PARSE_FAILED", "unexpected dispatch status");
              }
              const contentDigest = digestCanonical(obj);
              note(walk, "applications", "algal.application-dispatch.v1", record.bytes);
              deep?.sink.add("app_dispatches", [contentDigest, applicationId(obj.application), applicationRef(obj.intent), status]);
            }
          } catch (error) {
            skip(walk, "applications", `${name}/${sub}/${file}`, shortReason(error));
          }
        }
      }
    }
    entries.sort(compareUtf8);
    setFingerprint(walk, "applications", entries, listed.truncated);
  }

  // mailboxes/<name>/config.json — message files churn and are never indexed.
  {
    const root = join(dir, "mailboxes");
    const listed = await listRecords(root, PROCESS_NAME, lim.maxFiles);
    const entries: string[] = [];
    for (const foreign of listed.foreign) skip(walk, "mailboxes", foreign, "foreign name");
    for (const name of listed.names) {
      const stat = await lstat(join(root, name)).catch(() => null);
      if (!stat?.isDirectory() || stat.isSymbolicLink()) {
        skip(walk, "mailboxes", name, "not a directory");
        continue;
      }
      entries.push(name);
      const config = await readRecord(join(root, name, "config.json"), PROGRAM_DB_BOUNDS.maxSmallFileBytes)
        .then((r) => r.value)
        .catch(() => undefined);
      if (config !== undefined) {
        try {
          const obj = asObject(config, "mailbox config");
          entries.push(`${name}:config:${digestCanonical(obj).slice(7)}`);
          note(walk, "mailboxes", typeof obj.contract === "string" ? obj.contract : null, 0);
        } catch { /* unreadable configs stay out of the fingerprint */ }
      }
    }
    entries.sort(compareUtf8);
    setFingerprint(walk, "mailboxes", entries, listed.truncated);
  }

  // capabilities/<hex>.json — host-admitted capability records.
  {
    for await (const { name } of casFiles(dir, "capabilities", walk, lim)) {
      try {
        const record = await readRecord(join(dir, "capabilities", name), PROGRAM_DB_BOUNDS.maxSmallFileBytes);
        const obj = record.value;
        note(walk, "capabilities",
          typeof obj === "object" && obj !== null && !Array.isArray(obj) && typeof (obj as JsonObject).contract === "string"
            ? ((obj as JsonObject).contract as string) : null,
          record.bytes);
      } catch (error) {
        skip(walk, "capabilities", name, shortReason(error));
      }
    }
  }

  // other — top-level entries that are no record place and no derived file.
  {
    let raw: string[] = [];
    try {
      raw = (await readdir(dir)).sort();
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
    const entries: string[] = [];
    let truncated = false;
    for (const name of raw) {
      if ((RECORD_PLACES as Record<string, boolean>)[name] || DERIVED_FILES.test(name)) continue;
      if (entries.length >= lim.maxFiles) { truncated = true; break; }
      entries.push(name);
    }
    if (entries.length > 0) {
      walk.kinds.set("other ", { place: "other", contract: null, files: entries.length, bytes: 0 });
    }
    setFingerprint(walk, "other", entries, truncated);
  }

  return { heads, appHeads };
}

// ----------------------------------------------------------------- build ---

export type ProgramIndexReport = {
  ok: true;
  dir: string;
  index: string;
  schema: string;
  /** Fingerprint of the store state this build indexed. */
  state: { digest: Digest; places: ProgramFingerprint };
  /** Rows materialized per relation (capped per relation). */
  records: Record<string, number>;
  /** Relations that hit the row cap. */
  truncatedRelations: string[];
  skipped: Skipped[];
  skippedTotal: number;
};

function stateDigestOf(places: ProgramFingerprint): Digest {
  return digestCanonical(
    Object.fromEntries(
      PROGRAM_DB_PLACES.map((place) => [
        place,
        { entries: places[place].entries, digest: places[place].digest, truncated: places[place].truncated },
      ]),
    ) as unknown as JsonValue,
  );
}

/** Full bounded rebuild of the derived index. The new index is assembled in
 * a scratch file and renamed over `program.db`, so a crashed build never
 * leaves a half-written index behind. */
export async function buildProgramIndex(
  dir: string,
  options: { limits?: ProgramDbLimits } = {},
): Promise<ProgramIndexReport> {
  const lim = limits(options.limits);
  const root = resolve(dir);
  await mkdir(root, { recursive: true });
  const scratch = join(root, `.program-db-${process.pid}-${Math.random().toString(16).slice(2, 10)}.db`);
  await rm(scratch, { recursive: true, force: true });
  const db = new Database(scratch);
  const walk = newWalk();
  const { sink, inserted } = makeSink(db, lim);
  let committed = false;
  try {
    db.exec(SCHEMA);
    db.exec("BEGIN IMMEDIATE");
    try {
      const { heads, appHeads } = await walkStore(root, lim, { sink }, walk);
      // Join heads to the indexed records; a head whose record was skipped
      // or absent still lands in the table with null fields so the gap shows.
      const records = new Map(
        (db.query(
          "SELECT digest, status, generation, max_generations, manifest_digest, receipt_digest FROM process_records",
        ).all() as { digest: string; status: string; generation: number; max_generations: number; manifest_digest: string; receipt_digest: string | null }[])
          .map((row) => [row.digest, row]),
      );
      for (const head of heads.sort((a, b) => compareUtf8(a.name, b.name))) {
        const record = records.get(head.record);
        sink.add("processes", [
          head.name, head.record, record?.status ?? null, record?.generation ?? null,
          record?.max_generations ?? null, record?.manifest_digest ?? null, record?.receipt_digest ?? null,
        ]);
        if (record) db.prepare("UPDATE process_records SET head = 1 WHERE digest = ?").run(head.record);
      }
      const states = new Map(
        (db.query("SELECT digest, sequence, epoch, revision_digest FROM app_states").all() as
          { digest: string; sequence: number; epoch: number; revision_digest: string }[])
          .map((row) => [row.digest, row]),
      );
      for (const head of appHeads.sort((a, b) => compareUtf8(a.name, b.name))) {
        const state = states.get(head.state);
        sink.add("applications", [
          head.name, head.state, state?.sequence ?? null, state?.epoch ?? null, state?.revision_digest ?? null,
        ]);
      }
      for (const row of [...walk.kinds.values()].sort(
        (a, b) => compareUtf8(a.place, b.place) || compareUtf8(a.contract ?? "", b.contract ?? ""),
      )) {
        sink.add("record_kinds", [row.place, row.contract, row.files, row.bytes]);
      }
      for (const row of walk.skipped) {
        sink.add("skipped", [row.place, row.name, row.reason]);
      }
      const stateDigest = stateDigestOf(walk.fingerprint);
      db.prepare("INSERT OR REPLACE INTO meta(k, v) VALUES('schema', ?)").run(PROGRAM_DB_SCHEMA);
      db.prepare("INSERT OR REPLACE INTO meta(k, v) VALUES('state', ?)").run(
        canonicalize({ digest: stateDigest, places: walk.fingerprint } as unknown as JsonValue),
      );
      db.exec("COMMIT");
      committed = true;
      return {
        ok: true,
        dir: root,
        index: programDbPath(root),
        schema: PROGRAM_DB_SCHEMA,
        state: { digest: stateDigest, places: walk.fingerprint },
        records: Object.fromEntries(
          Object.keys(PROGRAM_DB_TABLES).map((name) => [name, inserted[name] ?? 0]),
        ),
        truncatedRelations: [...sink.truncated].sort(compareUtf8),
        skipped: walk.skipped,
        skippedTotal: walk.skippedTotal,
      };
    } catch (error) {
      try {
        db.exec("ROLLBACK");
      } catch { /* a broken connection is already unwinding */ }
      throw error;
    }
  } finally {
    db.close();
    if (committed) {
      // The committed scratch becomes the index atomically; on any failure
      // before this point the previous index (if any) stays in place.
      await rename(scratch, programDbPath(root));
    } else {
      await rm(scratch, { force: true });
    }
  }
}

// ----------------------------------------------------------------- query ---

export type ProgramQueryPredicate = {
  column: string;
  op: "eq" | "ne" | "lt" | "le" | "gt" | "ge" | "in" | "like" | "null" | "not-null";
  value?: JsonValue;
};
export type ProgramQuery = {
  table: ProgramTable;
  columns?: string[];
  where?: ProgramQueryPredicate[];
  order?: { column: string; direction?: "asc" | "desc" }[];
  limit?: number;
};
export type ProgramQueryResult = {
  ok: true;
  table: string;
  columns: string[];
  rows: JsonObject[];
  truncated: boolean;
  index: { schema: string; digest: Digest };
};

const OPS = ["eq", "ne", "lt", "le", "gt", "ge", "in", "like", "null", "not-null"] as const;
const SQL_OPS = { eq: "=", ne: "!=", lt: "<", le: "<=", gt: ">", ge: ">=" } as const;

/** Parse a declarative query strictly: known keys only, whitelisted tables
 * and columns, scalar values of the column's type, every list bounded. */
export function parseProgramQuery(input: unknown): ProgramQuery {
  const obj = asObject(input, "program query");
  noUnknownKeys(obj, ["table", "columns", "where", "order", "limit"], "program query");
  if (canonicalBytes(obj) > PROGRAM_DB_BOUNDS.maxQueryBytes) {
    throw new AlgalError("BUDGET_EXHAUSTED", `program query exceeds ${PROGRAM_DB_BOUNDS.maxQueryBytes} bytes`);
  }
  let nodes = 0;
  const charge = (n = 1) => {
    nodes += n;
    if (nodes > PROGRAM_DB_BOUNDS.maxQueryNodes) {
      throw new AlgalError("BUDGET_EXHAUSTED", `program query exceeds ${PROGRAM_DB_BOUNDS.maxQueryNodes} nodes`);
    }
  };
  const tableName = asString(reqField(obj, "table", "program query"), "program query table", 64);
  const table = (PROGRAM_DB_TABLES as Record<string, { columns: Record<string, ColumnType> }>)[tableName];
  if (!table) throw new AlgalError("PARSE_FAILED", `program query table "${tableName}" is not a known relation`);
  charge();
  const columnType = (name: string): ColumnType => {
    const type = table.columns[name];
    if (type === undefined) throw new AlgalError("PARSE_FAILED", `program query column "${name}" is not on ${tableName}`);
    return type;
  };
  let columns: string[] | undefined;
  const columnsRaw = optField(obj, "columns");
  if (columnsRaw !== undefined) {
    const list = asArray(columnsRaw, "program query columns");
    if (list.length === 0 || list.length > PROGRAM_DB_BOUNDS.maxColumns) {
      throw new AlgalError("BUDGET_EXHAUSTED", `program query columns must hold 1..${PROGRAM_DB_BOUNDS.maxColumns} names`);
    }
    columns = list.map((item, i) => {
      charge();
      const name = asString(item, `program query columns[${i}]`, 64);
      columnType(name);
      return name;
    });
    if (new Set(columns).size !== columns.length) {
      throw new AlgalError("PARSE_FAILED", "program query columns must be unique");
    }
  }
  let where: ProgramQueryPredicate[] | undefined;
  const whereRaw = optField(obj, "where");
  if (whereRaw !== undefined) {
    const list = asArray(whereRaw, "program query where");
    if (list.length > PROGRAM_DB_BOUNDS.maxPredicates) {
      throw new AlgalError("BUDGET_EXHAUSTED", `program query predicates exceed ${PROGRAM_DB_BOUNDS.maxPredicates}`);
    }
    where = list.map((item, i): ProgramQueryPredicate => {
      charge();
      const what = `program query where[${i}]`;
      const pred = asObject(item, what);
      noUnknownKeys(pred, ["column", "op", "value"], what);
      const column = asString(reqField(pred, "column", what), `${what}.column`, 64);
      const type = columnType(column);
      const op = asString(reqField(pred, "op", what), `${what}.op`, 16) as ProgramQueryPredicate["op"];
      if (!(OPS as readonly string[]).includes(op)) throw new AlgalError("PARSE_FAILED", `${what}.op "${op}" is not supported`);
      const value = optField(pred, "value");
      if (op === "null" || op === "not-null") {
        if (value !== undefined) throw new AlgalError("PARSE_FAILED", `${what}: ${op} takes no value`);
        return { column, op };
      }
      if (value === undefined) throw new AlgalError("PARSE_FAILED", `${what} requires a value`);
      if (op === "in") {
        const values = asArray(value, `${what}.value`);
        if (values.length === 0 || values.length > PROGRAM_DB_BOUNDS.maxInList) {
          throw new AlgalError("BUDGET_EXHAUSTED", `${what}.value must hold 1..${PROGRAM_DB_BOUNDS.maxInList} values`);
        }
        charge(values.length);
        for (const entry of values) scalarFor(entry, type, `${what}.value`);
        return { column, op, value: values };
      }
      if (op === "like" && type !== "text") throw new AlgalError("PARSE_FAILED", `${what}: like needs a text column`);
      scalarFor(value, type, `${what}.value`);
      return { column, op, value: value as JsonValue };
    });
  }
  let order: ProgramQuery["order"];
  const orderRaw = optField(obj, "order");
  if (orderRaw !== undefined) {
    const list = asArray(orderRaw, "program query order");
    if (list.length > PROGRAM_DB_BOUNDS.maxOrders) {
      throw new AlgalError("BUDGET_EXHAUSTED", `program query order keys exceed ${PROGRAM_DB_BOUNDS.maxOrders}`);
    }
    order = list.map((item, i) => {
      charge();
      const what = `program query order[${i}]`;
      const ord = asObject(item, what);
      noUnknownKeys(ord, ["column", "direction"], what);
      const column = asString(reqField(ord, "column", what), `${what}.column`, 64);
      columnType(column);
      const direction = optField(ord, "direction");
      if (direction !== undefined && direction !== "asc" && direction !== "desc") {
        throw new AlgalError("PARSE_FAILED", `${what}.direction must be asc or desc`);
      }
      return { column, ...(direction === undefined ? {} : { direction }) };
    });
  }
  let limit: number | undefined;
  const limitRaw = optField(obj, "limit");
  if (limitRaw !== undefined) {
    limit = asInt(limitRaw, "program query limit", 1, PROGRAM_DB_BOUNDS.maxRows);
  }
  return {
    table: tableName as ProgramTable,
    ...(columns ? { columns } : {}),
    ...(where ? { where } : {}),
    ...(order ? { order } : {}),
    ...(limit !== undefined ? { limit } : {}),
  };
}

function scalarFor(value: unknown, type: ColumnType, what: string): void {
  if (type === "integer") {
    if (typeof value !== "number" || !Number.isSafeInteger(value)) {
      throw new AlgalError("PARSE_FAILED", `${what} must be a safe integer`);
    }
  } else if (typeof value !== "string" || utf8Length(value) > 4096) {
    throw new AlgalError("PARSE_FAILED", `${what} must be a string of at most 4096 bytes`);
  }
}

/** Compile a parsed query to parameterized SQL. Identifiers come only from
 * the whitelisted table/column maps; every value is a bound parameter. */
function querySql(query: ProgramQuery): { sql: string; params: (string | number)[] } {
  const table = PROGRAM_DB_TABLES[query.table];
  const columns = query.columns ?? Object.keys(table.columns);
  const params: (string | number)[] = [];
  const clauses: string[] = [];
  for (const pred of query.where ?? []) {
    const c = `"${pred.column}"`;
    if (pred.op === "null") clauses.push(`${c} IS NULL`);
    else if (pred.op === "not-null") clauses.push(`${c} IS NOT NULL`);
    else if (pred.op === "in") {
      const values = pred.value as JsonValue[];
      clauses.push(`${c} IN (${values.map(() => "?").join(",")})`);
      params.push(...(values as (string | number)[]));
    } else if (pred.op === "like") {
      clauses.push(`${c} LIKE ?`);
      params.push(pred.value as string);
    } else {
      clauses.push(`${c} ${SQL_OPS[pred.op as keyof typeof SQL_OPS]} ?`);
      params.push(pred.value as string | number);
    }
  }
  const order = (query.order ?? [])
    .map((o) => `"${o.column}" ${o.direction === "desc" ? "DESC" : "ASC"}`)
    .join(", ");
  const limit = query.limit ?? PROGRAM_DB_BOUNDS.defaultRows;
  return {
    sql: `SELECT ${columns.map((c) => `"${c}"`).join(",")} FROM "${query.table}"${clauses.length ? ` WHERE ${clauses.join(" AND ")}` : ""}${order ? ` ORDER BY ${order}` : ""} LIMIT ${limit + 1}`,
    params,
  };
}

function indexMeta(db: Database): { schema: string; digest: Digest } {
  const schema = db.query("SELECT v FROM meta WHERE k = 'schema'").get() as { v: string } | null;
  if (!schema || schema.v !== PROGRAM_DB_SCHEMA) {
    throw new AlgalError("PARSE_FAILED", "program index schema mismatch — run `algal db build` to rebuild");
  }
  const state = db.query("SELECT v FROM meta WHERE k = 'state'").get() as { v: string } | null;
  return { schema: schema.v, digest: state ? (JSON.parse(state.v) as { digest: Digest }).digest : digestCanonical("") };
}

function openProgramIndex(dir: string): Database {
  const path = programDbPath(resolve(dir));
  try {
    return new Database(path, { readonly: true, create: false });
  } catch {
    throw new AlgalError("STORE_MISS", `no program index at ${path} — run \`algal db build\` first`);
  }
}

function collectRows(
  rows: Record<string, unknown>[],
  maxRows: number,
  maxResultBytes: number,
): { rows: JsonObject[]; truncated: boolean } {
  const out: JsonObject[] = [];
  let bytes = 2;
  let truncated = false;
  for (const row of rows) {
    if (out.length >= maxRows) { truncated = true; break; }
    const json = JSON.stringify(row);
    const size = Buffer.byteLength(json, "utf8");
    if (size > PROGRAM_DB_BOUNDS.maxRowBytes) {
      throw new AlgalError("BUDGET_EXHAUSTED", `program query row exceeds ${PROGRAM_DB_BOUNDS.maxRowBytes} bytes`);
    }
    if (bytes + size + 1 > maxResultBytes) { truncated = true; break; }
    bytes += size + 1;
    out.push(row as JsonObject);
  }
  return { rows: out, truncated };
}

/** Run a declarative query against the built index. The index must exist —
 * `algal db build` produces it; `algal db status` reports drift. */
export function runProgramQuery(
  dir: string,
  query: unknown,
  options: { limits?: ProgramDbLimits } = {},
): ProgramQueryResult {
  const lim = limits(options.limits);
  const parsed = parseProgramQuery(query);
  const limit = parsed.limit ?? PROGRAM_DB_BOUNDS.defaultRows;
  if (limit > lim.maxRows) {
    throw new AlgalError("BUDGET_EXHAUSTED", `program query limit exceeds ${lim.maxRows}`);
  }
  const db = openProgramIndex(dir);
  try {
    const meta = indexMeta(db);
    const { sql, params } = querySql(parsed);
    const raw = db.query(sql).all(...params) as Record<string, unknown>[];
    const extra = raw.length > limit;
    const { rows, truncated } = collectRows(extra ? raw.slice(0, limit) : raw, lim.maxRows, lim.maxResultBytes);
    return {
      ok: true,
      table: parsed.table,
      columns: parsed.columns ?? Object.keys(PROGRAM_DB_TABLES[parsed.table].columns),
      rows,
      truncated: truncated || extra,
      index: meta,
    };
  } finally {
    db.close();
  }
}

// ------------------------------------------------------------ projections ---

/** Composition closure rooted at entrypoint manifests — the only roots the
 * revisions-for-executable projection walks. Depth is capped. */
const CLOSURE = `WITH RECURSIVE closure(root, child, depth) AS (
  SELECT c.manifest_digest, c.child_digest, 1
  FROM manifest_children c
  JOIN app_entrypoints e ON e.manifest_digest = c.manifest_digest
  UNION
  SELECT c.root, m.child_digest, c.depth + 1
  FROM closure c JOIN manifest_children m ON m.manifest_digest = c.child
  WHERE c.depth < ${PROGRAM_DB_BOUNDS.maxClosureDepth}
)`;

export type ProgramProjection = {
  /** CLI argument names, in order. */
  args: string[];
  description: string;
};

export const PROGRAM_PROJECTIONS = {
  "callers-of": {
    args: ["digest"],
    description: "Manifests that embed the given child manifest digest through an organism, each, or repeat cell.",
  },
  "revisions-for-executable": {
    args: ["digest"],
    description: "Application revisions whose entrypoints run the given manifest digest, directly or through their indexed child closure.",
  },
  "receipts-touching-capability": {
    args: ["class"],
    description: "Receipts that carried a capability handle of the given class in arguments or recorded one in a suspended effect's wake list.",
  },
  "unevaluated-revisions": {
    args: [],
    description: "Application revisions with no indexed evaluation record measuring them as a candidate.",
  },
  "largest-work": {
    args: [],
    description: "Receipts ordered by recorded work units, largest first; --limit caps the list.",
  },
  "process-status": {
    args: [],
    description: "Head-record counts per process status.",
  },
  "kinds": {
    args: [],
    description: "The record-kind histogram the index counted at build time.",
  },
} as const satisfies Record<string, ProgramProjection>;

export type ProgramProjectionName = keyof typeof PROGRAM_PROJECTIONS;

/** Run a canned projection: a fixed bounded join callable without a query. */
export function runProgramProjection(
  dir: string,
  name: string,
  args: string[] = [],
  options: { limit?: number; limits?: ProgramDbLimits } = {},
): ProgramQueryResult & { projection: string } {
  const lim = limits(options.limits);
  const spec = (PROGRAM_PROJECTIONS as Record<string, ProgramProjection>)[name];
  if (!spec) {
    throw new AlgalError("PARSE_FAILED", `unknown projection "${name}" — expected one of: ${Object.keys(PROGRAM_PROJECTIONS).join(", ")}`);
  }
  if (args.length !== spec.args.length) {
    throw new AlgalError("PARSE_FAILED", `projection ${name} takes ${spec.args.length} argument(s): ${spec.args.join(", ")}`);
  }
  const limit = Math.min(options.limit ?? PROGRAM_DB_BOUNDS.defaultRows, lim.maxRows);
  const db = openProgramIndex(dir);
  try {
    const meta = indexMeta(db);
    let sql = "";
    const params: (string | number)[] = [];
    let columns: string[] = [];
    switch (name as ProgramProjectionName) {
      case "callers-of": {
        const digest = asDigest(args[0], "callers-of digest");
        sql = `SELECT c.manifest_digest AS digest, c.cell, c.kind, m.key, m.name
          FROM manifest_children c LEFT JOIN manifests m ON m.digest = c.manifest_digest
          WHERE c.child_digest = ? ORDER BY c.manifest_digest, c.cell LIMIT ?`;
        params.push(digest, limit + 1);
        columns = ["digest", "cell", "kind", "key", "name"];
        break;
      }
      case "revisions-for-executable": {
        const digest = asDigest(args[0], "revisions-for-executable digest");
        sql = `${CLOSURE}
          SELECT DISTINCT r.digest, r.application, r.parent_digest, e.name AS entrypoint
          FROM app_entrypoints e
          JOIN app_revisions r ON r.digest = e.revision_digest
          WHERE e.manifest_digest = ?
             OR EXISTS (SELECT 1 FROM closure c WHERE c.root = e.manifest_digest AND c.child = ?)
          ORDER BY r.digest LIMIT ?`;
        params.push(digest, digest, limit + 1);
        columns = ["digest", "application", "parent_digest", "entrypoint"];
        break;
      }
      case "receipts-touching-capability": {
        const capability = asString(args[0], "capability class", 64);
        if (!/^[a-z][a-z0-9-]*$/.test(capability)) {
          throw new AlgalError("PARSE_FAILED", "capability class must be a lowercase kebab-case id");
        }
        sql = `SELECT DISTINCT c.receipt_digest AS digest, c.source, r.manifest_digest, r.outcome, r.work_units
          FROM receipt_capabilities c LEFT JOIN receipts r ON r.digest = c.receipt_digest
          WHERE c.capability = ? ORDER BY c.receipt_digest, c.source LIMIT ?`;
        params.push(capability, limit + 1);
        columns = ["digest", "source", "manifest_digest", "outcome", "work_units"];
        break;
      }
      case "unevaluated-revisions": {
        sql = `SELECT r.digest, r.application, r.parent_digest
          FROM app_revisions r
          WHERE NOT EXISTS (SELECT 1 FROM app_evaluations e WHERE e.candidate_revision = r.digest)
          ORDER BY r.digest LIMIT ?`;
        params.push(limit + 1);
        columns = ["digest", "application", "parent_digest"];
        break;
      }
      case "largest-work": {
        sql = `SELECT digest, manifest_digest, manifest_key, outcome, work_units, agent_calls, steps
          FROM receipts ORDER BY work_units DESC, digest LIMIT ?`;
        params.push(limit + 1);
        columns = ["digest", "manifest_digest", "manifest_key", "outcome", "work_units", "agent_calls", "steps"];
        break;
      }
      case "process-status": {
        sql = `SELECT status, COUNT(*) AS processes FROM processes
          GROUP BY status ORDER BY status LIMIT ?`;
        params.push(limit + 1);
        columns = ["status", "processes"];
        break;
      }
      case "kinds": {
        sql = "SELECT place, contract, files, bytes FROM record_kinds ORDER BY place, contract LIMIT ?";
        params.push(limit + 1);
        columns = ["place", "contract", "files", "bytes"];
        break;
      }
    }
    const raw = db.query(sql).all(...params) as Record<string, unknown>[];
    const extra = raw.length > limit;
    const { rows, truncated } = collectRows(extra ? raw.slice(0, limit) : raw, lim.maxRows, lim.maxResultBytes);
    return {
      ok: true,
      projection: name,
      table: name,
      columns,
      rows,
      truncated: truncated || extra,
      index: meta,
    };
  } finally {
    db.close();
  }
}

// ---------------------------------------------------------------- status ---

export type ProgramIndexStatus = {
  ok: true;
  dir: string;
  index: string;
  /** Whether an index exists and its schema matches this runtime. */
  indexed: boolean;
  schema?: string;
  /** True when the indexed fingerprint differs from the live store scan. */
  stale: boolean;
  /** Per-place comparison; present when an index was read. */
  places?: Record<ProgramPlace, { indexed: ProgramPlaceFingerprint; current: ProgramPlaceFingerprint; match: boolean }>;
  /** Fingerprint digests; equal means the index matches this store state. */
  digest: { indexed: Digest | null; current: Digest };
};

/** Rescan the store and compare fingerprints with the indexed state. A
 * missing or unreadable index reports `indexed: false`; per-place drift
 * names entry counts and whether the content digests match. */
export async function programIndexStatus(
  dir: string,
  options: { limits?: ProgramDbLimits } = {},
): Promise<ProgramIndexStatus> {
  const lim = limits(options.limits);
  const root = resolve(dir);
  const walk = newWalk();
  await walkStore(root, lim, null, walk);
  const current = walk.fingerprint;
  const currentDigest = stateDigestOf(current);
  let indexedState: { digest: Digest; places: ProgramFingerprint } | undefined;
  let schema: string | undefined;
  try {
    const db = new Database(programDbPath(root), { readonly: true, create: false });
    try {
      const schemaRow = db.query("SELECT v FROM meta WHERE k = 'schema'").get() as { v: string } | null;
      schema = schemaRow?.v;
      const stateRow = db.query("SELECT v FROM meta WHERE k = 'state'").get() as { v: string } | null;
      if (stateRow) {
        const parsed = JSON.parse(stateRow.v) as { digest: Digest; places: Partial<Record<ProgramPlace, Partial<ProgramPlaceFingerprint>>> };
        const places = {} as ProgramFingerprint;
        for (const place of PROGRAM_DB_PLACES) {
          const p = parsed.places?.[place];
          places[place] = {
            entries: p?.entries ?? 0,
            digest: p?.digest ?? digestCanonical(""),
            truncated: p?.truncated ?? false,
            skipped: p?.skipped ?? 0,
          };
        }
        indexedState = { digest: parsed.digest, places };
      }
    } finally {
      db.close();
    }
  } catch { /* no index, or one this runtime cannot read */ }
  const indexed = indexedState !== undefined && schema === PROGRAM_DB_SCHEMA;
  const places = {} as NonNullable<ProgramIndexStatus["places"]>;
  let stale = false;
  for (const place of PROGRAM_DB_PLACES) {
    const was: ProgramPlaceFingerprint = indexedState?.places[place] ?? {
      entries: 0, digest: digestCanonical(""), truncated: false, skipped: 0,
    };
    const now = current[place];
    const match = was.entries === now.entries && was.digest === now.digest && was.truncated === now.truncated;
    if (!match) stale = true;
    places[place] = { indexed: was, current: now, match };
  }
  return {
    ok: true,
    dir: root,
    index: programDbPath(root),
    indexed,
    ...(schema !== undefined ? { schema } : {}),
    stale: indexed && stale,
    ...(indexedState !== undefined ? { places } : {}),
    digest: { indexed: indexedState?.digest ?? null, current: currentDigest },
  };
}
