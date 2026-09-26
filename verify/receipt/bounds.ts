/**
 * verify/receipt/bounds.ts — Phase 14 receipt-closure analysis.
 *
 * Closure obligation (docs/formal-verification-plan.md, Phase 14: "Artifact
 * byte/depth/node closure is established or typed bounded failure preserves
 * custody"; verify/properties.json RCP-05, finding F09): every permitted
 * execution must end in exactly one of two sanctioned shapes —
 *
 *   (a) a minted `algal.run.v1` receipt that satisfies every admission bound
 *       of every consumer it can reach (parser, store, durable-process
 *       custody, evidence export), or
 *   (b) a thrown typed bounded failure: `AlgalError` with a code from the
 *       closed union, produced at mint by `checkReceiptResources` and
 *       re-wrapped to carry `{outcome, failure, work}` (src/run.ts:279-288).
 *
 * This module is pure and dependency-free. It mirrors — symbol for symbol —
 * the resource predicate the runtime applies in `checkReceiptResources`
 * (src/run.ts:1864-1906) and the field bounds applied by
 * `parseReceiptFields` (src/run.ts:1908-1984), then decides the closure
 * class of a produced run summary: "mintable", "bounded-failure", or
 * "invalid" (a summary that is malformed, internally inconsistent, or claims
 * an outcome outside the two sanctioned arms).
 *
 * It does not run anything. Numbers come from measured summaries; the
 * runtime stays the single implementation of the check.
 */

// ----------------------------------------------------------------- mirrors ---

/** UTF-8 byte length, mirroring src/utf8.ts:5-15 — unpaired UTF-16
 *  surrogates count as U+FFFD (3 bytes), matching TextEncoder/Node. */
function utf8Length(text: string): number {
  let bytes = 0;
  for (let index = 0; index < text.length; index++) {
    const code = text.charCodeAt(index);
    if (code < 0x80) bytes++;
    else if (code < 0x800) bytes += 2;
    else if (
      code >= 0xd800 && code <= 0xdbff && index + 1 < text.length &&
      text.charCodeAt(index + 1) >= 0xdc00 && text.charCodeAt(index + 1) <= 0xdfff
    ) { bytes += 4; index++; }
    else bytes += 3;
  }
  return bytes;
}

/** Mirror of src/values.ts canonicalize + canonicalBytes: object keys sorted,
 *  array order preserved, sparse slots serialize as null. Only called on
 *  values the resource walk has already proved JSON-pure — a precondition
 *  shared with the runtime, which canonicalizes only after the walk. */
function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) {
    let out = "[";
    for (let i = 0; i < value.length; i++) {
      if (i > 0) out += ",";
      out += i in value ? canonicalJson(value[i]) : "null";
    }
    return out + "]";
  }
  if (value !== null && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj).sort();
    let out = "{";
    for (let i = 0; i < keys.length; i++) {
      if (i > 0) out += ",";
      out += `${JSON.stringify(keys[i])}:${canonicalJson(obj[keys[i]!])}`;
    }
    return out + "}";
  }
  return JSON.stringify(value) as string;
}

// ------------------------------------------------------------------ bounds ---

/** A named structural bound profile: the three measures every consumer of a
 *  JSON document applies, plus whether accumulated UTF-8 string content also
 *  counts toward `maxBytes` mid-traversal (the receipt walker's early term). */
export type StructuralProfile = {
  readonly name: string;
  readonly maxNodes: number;
  readonly maxDepth: number;
  readonly maxBytes: number;
  readonly countsStringBytes: boolean;
};

/** `RECEIPT_BOUNDS` resource members — src/run.ts:1849-1852. Enforced at
 *  producer mint as `BUDGET_EXHAUSTED` (src/run.ts:280) and at parser
 *  admission as `PARSE_FAILED` (src/run.ts:1860). */
export const RECEIPT_RESOURCE_BOUNDS = Object.freeze({
  maxNodes: 1_000_000,
  maxDepth: 64,
  maxBytes: 67_108_864,
});

/** Producer/parser envelope for a run receipt (the mint and `parseRunReceipt`
 *  arms share one predicate with different error codes). */
export const RECEIPT_ENVELOPE_PROFILE: StructuralProfile = Object.freeze({
  name: "receipt-envelope",
  ...RECEIPT_RESOURCE_BOUNDS,
  countsStringBytes: true,
});

/** FileStore document admission — `STORE_BOUNDS` (src/store.ts:27). The byte
 *  bound applies to the canonical text at publish/read (src/store.ts:88-143);
 *  the node/depth walk (`storeJson`, src/store.ts:29-47) counts enumerable
 *  members via `Object.values`, not serialized array positions. */
export const FILE_STORE_DOCUMENT_PROFILE: StructuralProfile = Object.freeze({
  name: "file-store-document",
  maxNodes: 1_000_000,
  maxDepth: 64,
  maxBytes: 67_108_864,
  countsStringBytes: false,
});

/** Durable-process receipt custody — `boundedValue` (src/process.ts:98-118)
 *  at `PROCESS_BOUNDS.maxReceiptBytes` (src/process.ts:67), applied to the
 *  minted receipt at src/process.ts:791 and on `runs/` readback. Strictly
 *  tighter than the receipt envelope on both nodes and bytes. */
export const PROCESS_RUNS_PROFILE: StructuralProfile = Object.freeze({
  name: "process-runs-custody",
  maxNodes: 100_000,
  maxDepth: 64,
  maxBytes: 16_000_000,
  countsStringBytes: false,
});

/** Process evidence export envelope — `PROCESS_EVIDENCE_BOUNDS`
 *  (src/process-evidence.ts:36-46) via `boundedDocument`
 *  (src/process-evidence.ts:66-109). The bound covers the whole evidence
 *  document — records, receipts, manifests, values — so a receipt fitting
 *  this profile is necessary but not sufficient for export. */
export const PROCESS_EVIDENCE_PROFILE: StructuralProfile = Object.freeze({
  name: "process-evidence-envelope",
  maxNodes: 1_000_000,
  maxDepth: 64,
  maxBytes: 67_108_864,
  countsStringBytes: true,
});

/** Host/journal single-value admission — `hostValue` (src/host-state.ts:19-42)
 *  plus `JOURNAL_BOUNDS.maxRecordBytes` (src/process-journal.ts:8). Bounds
 *  journaled effect records and process objects, not run receipts; listed so
 *  the bound family is complete. The journal as a whole is separately capped
 *  at 16,777,216 bytes (JOURNAL_BOUNDS.maxBytes). */
export const JOURNAL_VALUE_PROFILE: StructuralProfile = Object.freeze({
  name: "journal-value",
  maxNodes: 100_000,
  maxDepth: 64,
  maxBytes: 1_048_576,
  countsStringBytes: false,
});

/** The admission profiles a produced run receipt can meet downstream. The
 *  journal profile is excluded — it bounds effect records, not receipts. */
export const RECEIPT_CONSUMERS: readonly StructuralProfile[] = Object.freeze([
  RECEIPT_ENVELOPE_PROFILE,
  FILE_STORE_DOCUMENT_PROFILE,
  PROCESS_RUNS_PROFILE,
  PROCESS_EVIDENCE_PROFILE,
]);

/** Field-level admission inside `parseReceiptFields` (src/run.ts:1853-1855
 *  for the first two; the rest inline at run.ts:1923 and 1971). Minted
 *  receipts satisfy all of these by construction, so at mint they are a
 *  backstop that cannot fire — see closure.md. */
export const RECEIPT_FIELD_BOUNDS = Object.freeze({
  /** BOUNDS.maxSteps (1024) × BOUNDS.maxCells (64) — src/contract.ts:62,41.
   *  Producer side: one record per activation ≤ maxSteps ≤ 1024. */
  maxCells: 65_536,
  /** BOUNDS.maxSteps × BOUNDS.maxTurns (16) + BOUNDS.maxAgentCalls (64) —
   *  src/contract.ts:62,51,63; derived so a produced run's effect records
   *  always fit. */
  maxEffects: 16_448,
  /** BOUNDS.maxEvents — src/contract.ts:68. `emit` hard-caps the log at the
   *  same value (src/run.ts:299-302), so produced receipts never exceed. */
  maxEvents: 4_096,
  /** BOUNDS.maxArgsBytes — src/contract.ts:69. `checkRunArgs`
   *  (src/run.ts:190-229) applies the identical canonical byte accounting
   *  before execution begins. */
  maxArgsBytes: 1_048_576,
});

/** Scheduler invariants any produced summary must satisfy (src/contract.ts
 *  BOUNDS caps manifest budgets; src/run.ts:487-493 and 809-812 enforce per
 *  run; every step charges WORK.activation = 100 units, src/run.ts:78-83). */
export const PRODUCED_SUMMARY_INVARIANTS = Object.freeze({
  maxSteps: 1_024,
  maxAgentCalls: 64,
  unitsPerStep: 100,
});

/** Closed error-code union — mirrors src/errors.ts:4-33. The bounded-failure
 *  channel is the BUDGET_EXHAUSTED member thrown at mint; every other member
 *  still names a typed error, but not the custody-preserving one. */
export const ERROR_CODES = [
  "PARSE_FAILED", "MANIFEST_INVALID", "GRAPH_CYCLE", "TYPE_MISMATCH",
  "GUARD_INVALID", "SCORER_INVALID", "AXIS_INVALID", "INTERFACE_MISMATCH",
  "DEPTH_EXCEEDED", "INPUT_MISSING", "FN_UNKNOWN", "FN_FAILED", "EXPR_FAILED",
  "TOOL_UNKNOWN", "TOOL_FAILED", "EFFECT_FAILED", "EFFECT_UNPARSEABLE",
  "EFFECT_UNBOUND", "EFFECT_SUSPENDED", "CAPABILITY_DENIED", "MAILBOX_FULL",
  "BUDGET_EXHAUSTED", "STUCK", "STORE_MISS", "DIGEST_MISMATCH",
  "RECEIPT_MISMATCH", "IO_FAILED", "INTERNAL",
] as const;

// ------------------------------------------------- value-level measurement ---

/** Why the resource walk refused a value. `nodes`/`depth` carry the runtime
 *  message "receipt structural bounds exceeded" / "receipt node bound
 *  exceeded"; `stringBytes`/`canonicalBytes` carry "receipt byte bound
 *  exceeded"; `nonJson` carries "receipt must contain only JSON values". */
export type ResourceReason =
  | "nodes"
  | "depth"
  | "stringBytes"
  | "canonicalBytes"
  | "nonJson";

/** Counters observed at the moment the walk finished or refused. */
export type ResourceObservation = {
  nodes: number;
  maxDepth: number;
  stringBytes: number;
};

export type ResourceVerdict =
  | {
      ok: true;
      nodes: number;
      maxDepth: number;
      stringBytes: number;
      canonicalBytes: number;
    }
  | {
      ok: false;
      reason: ResourceReason;
      /** The exact message the runtime throws for this failure. */
      message: string;
      observation: ResourceObservation & { canonicalBytes?: number };
    };

/** Exact mirror of `checkReceiptResources` (src/run.ts:1864-1906): an
 *  iterative LIFO walk over the value. Every popped value counts as a node —
 *  scalars, containers and the root included. Array slots count serialized
 *  positions (`i in value`, holes read as null, so inherited and
 *  non-enumerable indices count, exactly as `JSON.stringify` emits them);
 *  object members count own enumerable entries via `Object.entries`, and
 *  keys accumulate UTF-8 bytes toward `maxBytes` without counting as nodes.
 *  Depth is structural: the root sits at 0, children at parent + 1. The walk
 *  order and the order of the internal checks are preserved so the first
 *  violation reported matches the runtime's. */
export function inspectReceiptResources(
  u: unknown,
  profile: StructuralProfile = RECEIPT_ENVELOPE_PROFILE,
): ResourceVerdict {
  const pending: { value: unknown; depth: number }[] = [{ value: u, depth: 0 }];
  let nodes = 0;
  let stringBytes = 0;
  let maxDepth = 0;
  const fail = (reason: ResourceReason, message: string, canonicalBytes?: number): ResourceVerdict => ({
    ok: false,
    reason,
    message,
    observation:
      canonicalBytes === undefined
        ? { nodes, maxDepth, stringBytes }
        : { nodes, maxDepth, stringBytes, canonicalBytes },
  });
  while (pending.length > 0) {
    const { value, depth } = pending.pop()!;
    ++nodes;
    if (depth > maxDepth) maxDepth = depth;
    if (nodes > profile.maxNodes || depth > profile.maxDepth) {
      return fail(
        nodes > profile.maxNodes ? "nodes" : "depth",
        "receipt structural bounds exceeded",
      );
    }
    if (typeof value === "string") {
      stringBytes += utf8Length(value);
      if (profile.countsStringBytes && stringBytes > profile.maxBytes) {
        return fail("stringBytes", "receipt byte bound exceeded");
      }
    } else if (Array.isArray(value)) {
      // JSON serialization includes every array position, including holes as
      // null. Enumerable properties alone do not bound the serialized tree.
      if (nodes + pending.length + value.length > profile.maxNodes) {
        return fail("nodes", "receipt node bound exceeded");
      }
      for (let i = 0; i < value.length; i++) {
        pending.push({ value: i in value ? value[i] : null, depth: depth + 1 });
      }
    } else if (value !== null && typeof value === "object") {
      for (const [key, child] of Object.entries(value)) {
        stringBytes += utf8Length(key);
        pending.push({ value: child, depth: depth + 1 });
        if (pending.length > profile.maxNodes) {
          return fail("nodes", "receipt node bound exceeded");
        }
      }
    } else if (
      value !== null && typeof value !== "boolean" &&
      (typeof value !== "number" || !Number.isFinite(value))
    ) {
      return fail("nonJson", "receipt must contain only JSON values");
    }
    if (profile.countsStringBytes && stringBytes > profile.maxBytes) {
      return fail("stringBytes", "receipt byte bound exceeded");
    }
  }
  const canonicalBytes = utf8Length(canonicalJson(u));
  if (canonicalBytes > profile.maxBytes) {
    return fail("canonicalBytes", "receipt byte bound exceeded", canonicalBytes);
  }
  return { ok: true, nodes, maxDepth, stringBytes, canonicalBytes };
}

// --------------------------------------------------- summary-level decision ---

export const RUN_OUTCOMES = ["complete", "failed", "stuck", "suspended"] as const;
export type RunOutcome = (typeof RUN_OUTCOMES)[number];

/** The work triple every produced run measures (RunReceipt.work,
 *  src/run.ts:273) — and the custody payload re-attached to the thrown
 *  bounded failure (src/run.ts:285). */
export type WorkSummary = {
  steps: number;
  agentCalls: number;
  units: number;
};

/** Measured structural dimensions of the receipt an execution produced or
 *  attempted to mint. Counts are the receipt-walker's: `nodes` includes
 *  containers, scalars and array holes; `maxDepth` counts the root as 0;
 *  `canonicalBytes` is the serialized UTF-8 length; `stringBytes` (string
 *  contents + object keys) is the walker's intermediate byte term — optional
 *  because it is an under-approximation of `canonicalBytes` and adds nothing
 *  the canonical check cannot decide. The field-level members are checked
 *  only when measured. */
export type ReceiptDimensions = {
  nodes: number;
  maxDepth: number;
  canonicalBytes: number;
  stringBytes?: number;
  cells?: number;
  effects?: number;
  events?: number;
  argsBytes?: number;
};

/** What an execution left behind, stated for the closure decision.
 *  `outcome`/`failure`/`work` are the run's own accounting — for a resolved
 *  run they are the receipt fields; for a mint rejection they are the thrown
 *  error's `details` payload. `receipt` is the measured envelope the run
 *  resolved or attempted; `null` means nothing was minted or measurable.
 *  `mintCode`, when present, is the observed thrown error code — the run
 *  rejected rather than resolving. */
export type RunSummary = {
  outcome: RunOutcome;
  failure: string | null;
  work: WorkSummary;
  receipt: ReceiptDimensions | null;
  mintCode?: string;
};

export type BoundName =
  | "nodes"
  | "depth"
  | "stringBytes"
  | "canonicalBytes"
  | "cells"
  | "effects"
  | "events"
  | "argsBytes";

/** Per-consumer admission of a measured envelope. `admitted: false` with a
 *  nonempty `exceeded` names the profile's violated bound. */
export type ProfileAdmission = {
  profile: string;
  admitted: boolean;
  exceeded: BoundName[];
};

export type ClosureVerdict =
  | {
      /** The envelope fits the mint/parser envelope and the measured field
       *  bounds — the receipt can exist. `admission` reports every known
       *  consumer profile, including the tighter process-custody one a
       *  mintable receipt may still exceed. */
      kind: "mintable";
      admission: ProfileAdmission[];
    }
  | {
      /** The envelope crosses a structural bound — the mint path throws
       *  `AlgalError("BUDGET_EXHAUSTED")` carrying `details`, so no
       *  unrepresentable receipt exists and custody is preserved. */
      kind: "bounded-failure";
      code: "BUDGET_EXHAUSTED";
      /** The envelope bounds the measurement exceeds. Empty when the summary
       *  reports only the thrown channel (receipt: null) with no dims. */
      exceeded: BoundName[];
      admission: ProfileAdmission[];
      details: { outcome: RunOutcome; failure: string | null; work: WorkSummary };
    }
  | {
      /** Malformed, internally inconsistent, or a claimed outcome outside
       *  the two sanctioned arms — e.g. field bounds exceeded on a
       *  structurally admissible envelope (the PARSE_FAILED mint backstop),
       *  or a thrown code that measurements contradict. */
      kind: "invalid";
      reason: string;
    };

/** Which structural bounds a measurement exceeds under one profile, in the
 *  order the predicate tests them (nodes, depth, string bytes, canonical
 *  bytes). Empty means the profile admits the envelope. */
export function exceededStructural(
  dims: ReceiptDimensions,
  profile: StructuralProfile,
): BoundName[] {
  const exceeded: BoundName[] = [];
  if (dims.nodes > profile.maxNodes) exceeded.push("nodes");
  if (dims.maxDepth > profile.maxDepth) exceeded.push("depth");
  if (
    profile.countsStringBytes && dims.stringBytes !== undefined &&
    dims.stringBytes > profile.maxBytes
  ) {
    exceeded.push("stringBytes");
  }
  if (dims.canonicalBytes > profile.maxBytes) exceeded.push("canonicalBytes");
  return exceeded;
}

/** Which receipt field bounds a measurement exceeds (only measured fields
 *  participate — an absent field is unmeasured, not zero). */
export function exceededFields(
  dims: ReceiptDimensions,
  fields: typeof RECEIPT_FIELD_BOUNDS = RECEIPT_FIELD_BOUNDS,
): BoundName[] {
  const exceeded: BoundName[] = [];
  if (dims.cells !== undefined && dims.cells > fields.maxCells) exceeded.push("cells");
  if (dims.effects !== undefined && dims.effects > fields.maxEffects) exceeded.push("effects");
  if (dims.events !== undefined && dims.events > fields.maxEvents) exceeded.push("events");
  if (dims.argsBytes !== undefined && dims.argsBytes > fields.maxArgsBytes) exceeded.push("argsBytes");
  return exceeded;
}

/** Evaluate a measured envelope against each consumer profile. */
export function admitDimensions(
  dims: ReceiptDimensions,
  profiles: readonly StructuralProfile[] = RECEIPT_CONSUMERS,
): ProfileAdmission[] {
  return profiles.map((profile) => {
    const exceeded = exceededStructural(dims, profile);
    return { profile: profile.name, admitted: exceeded.length === 0, exceeded };
  });
}

// --------------------------------------------------------------- internals ---

function isNonNegativeInt(u: unknown): u is number {
  return typeof u === "number" && Number.isSafeInteger(u) && u >= 0;
}

function parseWork(u: unknown): WorkSummary | string {
  if (typeof u !== "object" || u === null || Array.isArray(u)) {
    return "work must be an object {steps, agentCalls, units}";
  }
  const w = u as Record<string, unknown>;
  for (const key of Object.keys(w)) {
    if (!["steps", "agentCalls", "units"].includes(key)) {
      return `work has unknown field "${key}"`;
    }
  }
  for (const key of ["steps", "agentCalls", "units"] as const) {
    if (!isNonNegativeInt(w[key])) return `work.${key} must be a nonnegative safe integer`;
  }
  const work = w as unknown as WorkSummary;
  if (work.steps > PRODUCED_SUMMARY_INVARIANTS.maxSteps) {
    return `work.steps ${work.steps} exceeds the schedulable step bound ${PRODUCED_SUMMARY_INVARIANTS.maxSteps}`;
  }
  if (work.agentCalls > PRODUCED_SUMMARY_INVARIANTS.maxAgentCalls) {
    return `work.agentCalls ${work.agentCalls} exceeds the schedulable call bound ${PRODUCED_SUMMARY_INVARIANTS.maxAgentCalls}`;
  }
  if (work.units < work.steps * PRODUCED_SUMMARY_INVARIANTS.unitsPerStep) {
    return `work.units ${work.units} is below the ${PRODUCED_SUMMARY_INVARIANTS.unitsPerStep} units charged per step`;
  }
  return work;
}

const DIMS_KEYS = ["nodes", "maxDepth", "canonicalBytes", "stringBytes", "cells", "effects", "events", "argsBytes"];

function parseDims(u: unknown): ReceiptDimensions | string {
  if (typeof u !== "object" || u === null || Array.isArray(u)) {
    return "receipt must be a dimensions object or null";
  }
  const d = u as Record<string, unknown>;
  for (const key of Object.keys(d)) {
    if (!DIMS_KEYS.includes(key)) return `receipt dimensions have unknown field "${key}"`;
  }
  for (const key of ["nodes", "maxDepth", "canonicalBytes"] as const) {
    if (!isNonNegativeInt(d[key])) return `receipt.${key} must be a nonnegative safe integer`;
  }
  for (const key of ["stringBytes", "cells", "effects", "events", "argsBytes"] as const) {
    if (d[key] !== undefined && !isNonNegativeInt(d[key])) {
      return `receipt.${key} must be a nonnegative safe integer when measured`;
    }
  }
  const dims = d as unknown as ReceiptDimensions;
  // The canonical serialization contains every counted string and key in
  // escaped form plus syntax, so it can never measure below the string term.
  if (dims.stringBytes !== undefined && dims.stringBytes > dims.canonicalBytes) {
    return `receipt.stringBytes ${dims.stringBytes} exceeds receipt.canonicalBytes ${dims.canonicalBytes} — impossible measurement`;
  }
  return dims;
}

/**
 * Decide the closure class of a produced run summary.
 *
 *   mintable         — the measured envelope passes the mint/parser envelope
 *                      and every measured field bound; `admission` reports
 *                      each downstream consumer profile.
 *   bounded-failure  — a structural bound is exceeded, so the run ends in
 *                      the thrown `BUDGET_EXHAUSTED` carrying
 *                      `{outcome, failure, work}` (src/run.ts:279-288), or the
 *                      summary reports that throw directly (receipt: null).
 *   invalid          — the summary is malformed or describes an outcome
 *                      outside the sanctioned arms: an unminted run without
 *                      the bounded-failure throw, a thrown code the
 *                      measurements contradict, or a structurally admissible
 *                      envelope that violates field admission (reachable
 *                      only through the PARSE_FAILED backstop at
 *                      src/run.ts:289 — a producer-invariant violation, see
 *                      closure.md §residual-gaps).
 */
export function decideRunClosure(
  u: unknown,
  envelope: StructuralProfile = RECEIPT_ENVELOPE_PROFILE,
  consumers: readonly StructuralProfile[] = RECEIPT_CONSUMERS,
): ClosureVerdict {
  const invalid = (reason: string): ClosureVerdict => ({ kind: "invalid", reason });
  if (typeof u !== "object" || u === null || Array.isArray(u)) {
    return invalid("run summary must be an object");
  }
  const s = u as Record<string, unknown>;
  for (const key of Object.keys(s)) {
    if (!["outcome", "failure", "work", "receipt", "mintCode"].includes(key)) {
      return invalid(`unknown summary field "${key}"`);
    }
  }
  if (typeof s.outcome !== "string" || !(RUN_OUTCOMES as readonly string[]).includes(s.outcome)) {
    return invalid(`outcome ${JSON.stringify(s.outcome)} is not a produced run outcome`);
  }
  const outcome = s.outcome as RunOutcome;
  if (s.failure !== null && (typeof s.failure !== "string" || !(ERROR_CODES as readonly string[]).includes(s.failure))) {
    return invalid(`failure ${JSON.stringify(s.failure)} is not a typed error code or null`);
  }
  const failure = s.failure as string | null;
  // A run's failure record exists exactly when its outcome is "failed"
  // (src/run.ts:269 with 274; handled fail edges delete the record, so the
  // outcome is then not "failed").
  if ((outcome === "failed") !== (failure !== null)) {
    return invalid(`outcome "${outcome}" is inconsistent with failure ${JSON.stringify(failure)}`);
  }
  const work = parseWork(s.work);
  if (typeof work === "string") return invalid(work);
  if (s.mintCode !== undefined && (typeof s.mintCode !== "string" || !(ERROR_CODES as readonly string[]).includes(s.mintCode))) {
    return invalid(`mintCode ${JSON.stringify(s.mintCode)} is not a typed error code`);
  }
  const mintCode = s.mintCode as string | undefined;
  if (s.receipt === undefined) {
    return invalid("receipt field is required — null when nothing was minted or measured");
  }
  const details = { outcome, failure, work };
  if (s.receipt === null) {
    if (mintCode === "BUDGET_EXHAUSTED") {
      return {
        kind: "bounded-failure",
        code: "BUDGET_EXHAUSTED",
        exceeded: [],
        admission: [],
        details,
      };
    }
    return invalid(
      mintCode === undefined
        ? "no receipt and no mint failure — an executed run cannot produce no evidence"
        : `no receipt and mint threw ${mintCode}, which is not the bounded-failure channel`,
    );
  }
  const dims = parseDims(s.receipt);
  if (typeof dims === "string") return invalid(dims);
  const admission = admitDimensions(dims, consumers);
  const exceeded = exceededStructural(dims, envelope);
  if (exceeded.length > 0) {
    if (mintCode !== undefined && mintCode !== "BUDGET_EXHAUSTED") {
      return invalid(
        `envelope exceeds ${exceeded.join("/")} but mint threw ${mintCode} — outside the bounded-failure channel`,
      );
    }
    return {
      kind: "bounded-failure",
      code: "BUDGET_EXHAUSTED",
      exceeded,
      admission,
      details,
    };
  }
  const fieldExceeded = exceededFields(dims);
  if (fieldExceeded.length > 0) {
    return invalid(
      `receipt structural bounds hold but field admission fails on ${fieldExceeded.join("/")} — ` +
      `the mint PARSE_FAILED backstop (src/run.ts:289) is outside the bounded-failure channel`,
    );
  }
  if (mintCode !== undefined) {
    return invalid(`all measured bounds hold but mint threw ${mintCode} — inconsistent measurement`);
  }
  return { kind: "mintable", admission };
}
