// Counterfactual replay: `algal replay <receipt> --with <manifest>` runs a
// revised manifest against the recorded evidence of an earlier run. Recorded
// effects answer while the revised trace still issues the recorded requests;
// requests the record cannot answer — and no admitted executor can — end the
// run where the evidence ends, and the comparison reports `could-not-replay`
// rather than inventing data. The result is a bounded, parseable
// `algal.replay-comparison.v1` record.

import { digestCanonical, asDigest, type Digest } from "./digest";
import { AlgalError } from "./errors";
import { replayExecutor, type Executor } from "./effects";
import { compileOrganism } from "./graph";
import { builtinRegistry, type FnRegistry } from "./registry";
import {
  manifestToJson,
  parseOrganismManifest,
  type OrganismManifest,
} from "./contract";
import {
  parseRunReceipt,
  receiptDigest,
  runOrganism,
  type CellRecord,
  type RunReceipt,
} from "./run";
import { replayStore } from "./store-memory";
import type { Store } from "./store-contract";
import type { Transport } from "./transport-contract";
import type { ToolRegistry } from "./tools";
import {
  asObject,
  asString,
  canonicalize,
  canonicalBytes,
  noUnknownKeys,
  optField,
  reqField,
  type JsonObject,
  type JsonValue,
} from "./values";

export const REPLAY_COMPARISON_CONTRACT = "algal.replay-comparison.v1" as const;

export const REPLAY_COMPARISON_BOUNDS = {
  maxBytes: 1_048_576,
  maxPrefix: 256,
  maxAdded: 256,
  maxPathLen: 4096,
  maxDetailLen: 2048,
  maxStatusLen: 64,
} as const;

export type ReplayVerdict = "identical" | "diverged" | "could-not-replay";

export type ReplayReasonCode =
  | "manifest-invalid"
  | "missing-input"
  | "missing-effect";

export type ReplayReason = {
  code: ReplayReasonCode;
  /** `cell.port` for missing-input; the cell path for missing-effect. */
  path?: string;
  /** The unmatched request digest for missing-effect, when the run emitted one. */
  request?: Digest;
  detail?: string;
};

export type ReplayDivergenceKind =
  | "cell"
  | "effects"
  | "outcome"
  | "work"
  | "failure";

export type ReplayDivergence = {
  kind: ReplayDivergenceKind;
  /** The cell path for `cell` divergence; null for receipt-level divergence. */
  path: string | null;
  /** The recorded run's side: cell status and record digest. Null when the
   * path never activated in the recorded run. */
  original: { status: string; digest: Digest } | null;
  /** The revised run's side. Null when the path never activated in it. */
  revised: { status: string; digest: Digest } | null;
  detail?: string;
};

export type ReplayComparison = {
  contract: typeof REPLAY_COMPARISON_CONTRACT;
  /** Intrinsic digest of the recorded receipt being replayed. */
  receipt: Digest;
  /** The manifest digest the recorded receipt ran under. */
  manifest: Digest;
  /** Canonical digest of the revision manifest JSON as supplied — the
   * identity of what was asked even when it does not admit. */
  supplied: Digest;
  /** The revision's admitted manifest digest — null when it never admitted. */
  revision: Digest | null;
  /** Digest of the args the revised run used (recorded args merged with any
   * override). */
  args: Digest;
  verdict: ReplayVerdict;
  /** Leading cells the revision reproduced identically, in recorded
   * activation order: `{path, digest}` of each recorded cell record. */
  prefix: { path: string; digest: Digest }[];
  /** True when the prefix list was truncated to the bound. */
  prefixTruncated: boolean;
  /** Cell paths the revised run recorded that the original did not, sorted. */
  added: string[];
  addedTruncated: boolean;
  divergence: ReplayDivergence | null;
  outcomes: { original: string; revised: string | null };
  /** Whether the effect sequences are canonically equal — null when the
   * revision never ran. */
  effectsMatch: boolean | null;
  /** Intrinsic digest of the revised run's receipt — null when no revised
   * run was produced. */
  revisedReceipt: Digest | null;
  /** Present exactly when the verdict is could-not-replay. */
  reason: ReplayReason | null;
};

// ------------------------------------------------------------ recording ---

const CELL_EVENTS = new Set(["cell.commit", "cell.skip", "cell.fail", "cell.suspend"]);

/** The run's activation order, from the event log. Events cap at the run's
 * event bound, so any recorded cell missing from the log follows in sorted
 * order — the order is a listing device, not a claim about scheduling. */
function activationOrder(receipt: RunReceipt): string[] {
  const order: string[] = [];
  const seen = new Set<string>();
  for (const event of receipt.events) {
    if (CELL_EVENTS.has(event.kind) && event.path !== undefined && !seen.has(event.path)) {
      seen.add(event.path);
      order.push(event.path);
    }
  }
  for (const path of Object.keys(receipt.cells).sort()) {
    if (!seen.has(path)) order.push(path);
  }
  return order;
}

function cellDigest(record: CellRecord | undefined): Digest | null {
  return record === undefined
    ? null
    : digestCanonical(record as unknown as JsonValue);
}

function cellSide(record: CellRecord | undefined): { status: string; digest: Digest } | null {
  return record === undefined
    ? null
    : { status: record.status, digest: digestCanonical(record as unknown as JsonValue) };
}

/** Cell failure codes that mean "the record or host cannot answer": the run
 * produced this failure because evidence or an admitted resource was absent,
 * not because the program decided it. When such a failure is not an identical
 * reproduction of a recorded one, the honest verdict is could-not-replay. */
const MISSING_CODES = new Set([
  "EFFECT_UNBOUND",
  "TOOL_UNKNOWN",
  "FN_UNKNOWN",
  "INPUT_MISSING",
]);

function reasonCodeFor(failureCode: string): ReplayReasonCode {
  return failureCode === "INPUT_MISSING" ? "missing-input" : "missing-effect";
}

/** The last effect request the cell issued, from the event log — the
 * request that went unanswered for a missing-effect failure. */
function lastEffectRequest(receipt: RunReceipt, path: string): Digest | undefined {
  let digest: Digest | undefined;
  for (const event of receipt.events) {
    if (event.kind === "effect" && event.path === path) {
      digest = event.digest as Digest | undefined;
    }
  }
  return digest;
}

// ------------------------------------------------------------------ run ---

/** Args the revised run uses: the recorded args merged with any override,
 * per cell per port. An override replaces a port value, never a whole cell. */
function mergeArgs(
  base: Record<string, Record<string, JsonValue>>,
  override?: Record<string, Record<string, JsonValue>>,
): Record<string, Record<string, JsonValue>> {
  const merged: Record<string, Record<string, JsonValue>> = {};
  for (const [cell, ports] of Object.entries(base)) merged[cell] = { ...ports };
  for (const [cell, ports] of Object.entries(override ?? {})) {
    merged[cell] = { ...(merged[cell] ?? {}), ...ports };
  }
  return merged;
}

/** A root input port that is wired but unsupplied cannot be answered from
 * the record — the consumer would silently see a dead edge. Surface it. */
function missingInput(
  manifest: OrganismManifest,
  args: Record<string, Record<string, JsonValue>>,
): string | null {
  const wired = new Set<string>();
  for (const edge of manifest.edges) wired.add(`${edge.from.cell}.${edge.from.port}`);
  for (const cell of manifest.cells) {
    if (cell.kind !== "input") continue;
    for (const port of Object.keys(cell.outputs)) {
      const key = `${cell.id}.${port}`;
      if (wired.has(key) && args[cell.id]?.[port] === undefined) return key;
    }
  }
  return null;
}

export type ReplayRequest = {
  /** The recorded run receipt (algal.run.v1) as parsed JSON. */
  receipt: JsonValue;
  /** The revised manifest JSON as supplied. */
  revision: JsonValue;
  /** Args merged over the recorded run's args, per cell per port. */
  args?: Record<string, Record<string, JsonValue>>;
  store: Store;
  fns?: FnRegistry;
  /** Live executors admitted for the post-divergence tail. Requests the
   * record answers never reach them; requests the record cannot answer go to
   * them in declared order, exactly like a fresh run. */
  executors?: Executor[];
  /** Tool signatures the revised manifest may name. Tool effects always come
   * from the record — replay never invokes a live tool. */
  tools?: ToolRegistry;
  transports?: Record<string, Transport>;
};

export type ReplayResult = {
  comparison: ReplayComparison;
  /** The revised run's receipt when one was produced — the caller decides
   * whether to persist it. */
  revised?: RunReceipt;
};

/** Compare a recorded run to a run of the revised manifest. The revised run
 * executes against a replay overlay of `store`, so it never mutates the live
 * store: recorded effects, slot reads, and transport provenance are served
 * from the record; anything the record cannot answer either reaches an
 * admitted live executor or fails as unbound evidence. */
export async function replayComparison(request: ReplayRequest): Promise<ReplayResult> {
  const original = parseRunReceipt(request.receipt);
  if (receiptDigest(original) !== original.digest) {
    throw new AlgalError(
      "DIGEST_MISMATCH",
      "receipt digest does not match its contents",
    );
  }
  const supplied = digestCanonical(request.revision as JsonValue);
  const fns = request.fns ?? builtinRegistry();
  const args = mergeArgs(original.args, request.args);
  const argsDigest = digestCanonical(args as unknown as JsonValue);

  const base: Omit<ReplayComparison, "verdict" | "reason"> = {
    contract: REPLAY_COMPARISON_CONTRACT,
    receipt: original.digest,
    manifest: original.manifestDigest,
    supplied,
    revision: null,
    args: argsDigest,
    prefix: [],
    prefixTruncated: false,
    added: [],
    addedTruncated: false,
    divergence: null,
    outcomes: { original: original.outcome, revised: null },
    effectsMatch: null,
    revisedReceipt: null,
  };

  let manifest: OrganismManifest;
  try {
    manifest = parseOrganismManifest(request.revision);
  } catch (error) {
    const detail = error instanceof AlgalError
      ? `${error.code}: ${error.message}`
      : String(error);
    return {
      comparison: parseReplayComparison({
        ...base,
        verdict: "could-not-replay",
        reason: { code: "manifest-invalid", detail },
      }),
    };
  }
  base.revision = digestCanonical(manifestToJson(manifest) as JsonValue);

  // Admission under this host is part of what the record can say: a
  // revision naming an unadmitted tool, an unknown function, or an
  // unresolvable reference cannot run — that is manifest-invalid evidence,
  // not a thrown usage error.
  try {
    await compileOrganism(
      manifest, fns, request.store, 0, request.transports, request.tools,
    );
  } catch (error) {
    const detail = error instanceof AlgalError
      ? `${error.code}: ${error.message}`
      : String(error);
    return {
      comparison: parseReplayComparison({
        ...base,
        verdict: "could-not-replay",
        reason: { code: "manifest-invalid", detail },
      }),
    };
  }

  const missing = missingInput(manifest, args);
  if (missing !== null) {
    return {
      comparison: parseReplayComparison({
        ...base,
        verdict: "could-not-replay",
        reason: {
          code: "missing-input",
          path: missing,
          detail: `wired input ${missing} has no recorded or supplied value`,
        },
      }),
    };
  }

  // Recorded inputs the revision may still need: transport provenance and
  // slot reads. The record is authoritative; a live slot or transport is
  // never consulted for a path the run recorded.
  const replayVia: Record<string, string> = {};
  const replaySlots: Record<string, { value?: JsonValue; missing?: boolean }> = {};
  for (const [path, rec] of Object.entries(original.cells)) {
    if (rec.via) replayVia[path] = rec.via;
    if (rec.slot?.mode === "read") {
      const v = rec.status === "committed" ? rec.outputs?.data : undefined;
      replaySlots[path] = v !== undefined ? { value: v } : { missing: true };
    }
  }

  const revised = await runOrganism({
    manifest,
    args,
    fns,
    store: replayStore(request.store),
    executors: [replayExecutor(original.effects), ...(request.executors ?? [])],
    replayVia,
    replaySlots,
    // Every recorded tool effect — suspensions included — replays. A request
    // the record cannot answer fails EFFECT_UNBOUND; replayToolFallthrough is
    // never set, so no live tool runs.
    replayToolEffects: original.effects.filter((effect) =>
      effect.executor.startsWith("tool:")),
    replayRuntime: original.runtime,
    ...(request.transports ? { transports: request.transports } : {}),
    ...(request.tools ? { tools: request.tools } : {}),
  });

  base.outcomes.revised = revised.outcome;
  base.revisedReceipt = revised.digest;

  // Activation order: the recorded trace's order governs the shared prefix.
  const order = activationOrder(original);
  let divergence: ReplayDivergence | null = null;
  let missingReason: ReplayReason | null = null;
  for (let i = 0; i < order.length; i++) {
    const path = order[i]!;

    const a = original.cells[path];
    const b = revised.cells[path];
    if (a !== undefined && b !== undefined && cellDigest(a) === cellDigest(b)) {
      if (base.prefix.length < REPLAY_COMPARISON_BOUNDS.maxPrefix) {
        base.prefix.push({ path, digest: cellDigest(a)! });
      } else base.prefixTruncated = true;
      continue;
    }
    divergence = {
      kind: "cell",
      path,
      original: cellSide(a),
      revised: cellSide(b),
    };
    break;
  }

  // Revised-only cells: any cell the revised run recorded that the original
  // never activated. Sorted — the listing is deterministic.
  const revisedOrder = activationOrder(revised);
  const added: string[] = revisedOrder
    .filter((path) => original.cells[path] === undefined)
    .sort();
  if (added.length > REPLAY_COMPARISON_BOUNDS.maxAdded) {
    base.added = added.slice(0, REPLAY_COMPARISON_BOUNDS.maxAdded);
    base.addedTruncated = true;
  } else {
    base.added = added;
  }

  if (divergence === null && added.length > 0) {
    const path = added[0]!;
    divergence = {
      kind: "cell",
      path,
      original: null,
      revised: cellSide(revised.cells[path]),
    };
  }

  // An unanswered request anywhere in the revised run — not reproduced from
  // the record — means the comparison cannot claim what the revision would
  // do past that point.
  for (const path of revisedOrder) {
    const rec = revised.cells[path];
    if (rec?.status !== "failed" || rec.failure === undefined) continue;
    if (!MISSING_CODES.has(rec.failure.code)) continue;
    const a = original.cells[path];
    if (a !== undefined && canonicalize(a as unknown as JsonValue) === canonicalize(rec as unknown as JsonValue)) {
      continue; // the identical failure is part of the record
    }
    if (a !== undefined && a.failure !== undefined &&
        canonicalize(a.failure as unknown as JsonValue) === canonicalize(rec.failure as unknown as JsonValue)) {
      continue; // same recorded failure under a diverging record
    }
    const unanswered = lastEffectRequest(revised, path);
    missingReason = {
      code: reasonCodeFor(rec.failure.code),
      path,
      ...(unanswered !== undefined ? { request: unanswered } : {}),
      detail: rec.failure.message,
    };
    break;
  }

  const effectsMatch =
    canonicalize(original.effects as unknown as JsonValue) ===
    canonicalize(revised.effects as unknown as JsonValue);

  if (divergence === null) {
    if (!effectsMatch) {
      divergence = {
        kind: "effects",
        path: null,
        original: null,
        revised: null,
        detail: "effect sequences differ",
      };
    } else if (original.outcome !== revised.outcome) {
      divergence = {
        kind: "outcome",
        path: null,
        original: null,
        revised: null,
        detail: `${original.outcome} vs ${revised.outcome}`,
      };
    } else if (
      canonicalize(original.failure as unknown as JsonValue ?? null) !==
      canonicalize(revised.failure as unknown as JsonValue ?? null)
    ) {
      divergence = {
        kind: "failure",
        path: null,
        original: null,
        revised: null,
        detail: `${original.failure?.code ?? "none"} vs ${revised.failure?.code ?? "none"}`,
      };
    } else if (
      canonicalize(original.work as unknown as JsonValue) !==
      canonicalize(revised.work as unknown as JsonValue)
    ) {
      divergence = {
        kind: "work",
        path: null,
        original: null,
        revised: null,
        detail: `units ${original.work.units} vs ${revised.work.units}`,
      };
    }
  }

  base.divergence = divergence;
  base.effectsMatch = effectsMatch;

  if (missingReason !== null) {
    return {
      comparison: parseReplayComparison({
        ...base,
        verdict: "could-not-replay",
        reason: missingReason,
      }),
      revised,
    };
  }
  if (divergence === null) {
    return {
      comparison: parseReplayComparison({ ...base, verdict: "identical", reason: null }),
      revised,
    };
  }
  return {
    comparison: parseReplayComparison({ ...base, verdict: "diverged", reason: null }),
    revised,
  };
}

// ----------------------------------------------------------------- parse ---

function parseSide(u: unknown, what: string): { status: string; digest: Digest } | null {
  if (u === null) return null;
  const o = asObject(u, what);
  noUnknownKeys(o, ["status", "digest"], what);
  return {
    status: asString(reqField(o, "status", what), `${what}.status`, REPLAY_COMPARISON_BOUNDS.maxStatusLen),
    digest: asDigest(reqField(o, "digest", what), `${what}.digest`),
  };
}

function parseDivergence(u: unknown): ReplayDivergence {
  const o = asObject(u, "divergence");
  noUnknownKeys(o, ["kind", "path", "original", "revised", "detail"], "divergence");
  const kind = asString(reqField(o, "kind", "divergence"), "divergence.kind", 32);
  if (!["cell", "effects", "outcome", "work", "failure"].includes(kind)) {
    throw new AlgalError("PARSE_FAILED", `unknown divergence kind "${kind}"`);
  }
  const path = optField(o, "path");
  if (path !== undefined && path !== null) {
    asString(path, "divergence.path", REPLAY_COMPARISON_BOUNDS.maxPathLen);
  }
  const detail = optField(o, "detail");
  if (detail !== undefined) {
    asString(detail, "divergence.detail", REPLAY_COMPARISON_BOUNDS.maxDetailLen);
  }
  const original = parseSide(reqField(o, "original", "divergence"), "divergence.original");
  const revised = parseSide(reqField(o, "revised", "divergence"), "divergence.revised");
  if (kind === "cell") {
    if (typeof path !== "string") {
      throw new AlgalError("PARSE_FAILED", "cell divergence requires a path");
    }
    if (original === null && revised === null) {
      throw new AlgalError("PARSE_FAILED", "cell divergence requires a side");
    }
  }
  return {
    kind: kind as ReplayDivergenceKind,
    path: typeof path === "string" ? path : null,
    original,
    revised,
    ...(detail !== undefined ? { detail: detail as string } : {}),
  };
}

function parseReason(u: unknown): ReplayReason {
  const o = asObject(u, "reason");
  noUnknownKeys(o, ["code", "path", "request", "detail"], "reason");
  const code = asString(reqField(o, "code", "reason"), "reason.code", 64);
  if (!["manifest-invalid", "missing-input", "missing-effect"].includes(code)) {
    throw new AlgalError("PARSE_FAILED", `unknown could-not-replay code "${code}"`);
  }
  const path = optField(o, "path");
  if (path !== undefined) asString(path, "reason.path", REPLAY_COMPARISON_BOUNDS.maxPathLen);
  const request = optField(o, "request");
  if (request !== undefined) asDigest(request, "reason.request");
  const detail = optField(o, "detail");
  if (detail !== undefined) asString(detail, "reason.detail", REPLAY_COMPARISON_BOUNDS.maxDetailLen);
  if ((code === "missing-input" || code === "missing-effect") && typeof path !== "string") {
    throw new AlgalError("PARSE_FAILED", `${code} requires a path`);
  }
  return {
    code: code as ReplayReasonCode,
    ...(path !== undefined ? { path: path as string } : {}),
    ...(request !== undefined ? { request: request as Digest } : {}),
    ...(detail !== undefined ? { detail: detail as string } : {}),
  };
}

/** Parse an `algal.replay-comparison.v1` record from `unknown`, rejecting
 * unknown keys and enforcing the bounds. The verdict's internal consistency
 * is part of the contract: an identical verdict carries no divergence, a
 * could-not-replay verdict carries its reason. */
export function parseReplayComparison(u: unknown): ReplayComparison {
  if (canonicalBytes(u as JsonValue) > REPLAY_COMPARISON_BOUNDS.maxBytes) {
    throw new AlgalError("PARSE_FAILED", "replay comparison exceeds its byte bound");
  }
  const o = asObject(u, "replay comparison");
  noUnknownKeys(
    o,
    ["contract", "receipt", "manifest", "supplied", "revision", "args",
      "verdict", "prefix", "prefixTruncated", "added", "addedTruncated",
      "divergence", "outcomes", "effectsMatch", "revisedReceipt", "reason"],
    "replay comparison",
  );
  if (o.contract !== REPLAY_COMPARISON_CONTRACT) {
    throw new AlgalError("PARSE_FAILED", `expected contract "${REPLAY_COMPARISON_CONTRACT}"`);
  }
  const verdict = asString(reqField(o, "verdict", "replay comparison"), "verdict", 32);
  if (!["identical", "diverged", "could-not-replay"].includes(verdict)) {
    throw new AlgalError("PARSE_FAILED", `unknown verdict "${verdict}"`);
  }

  const prefixRaw = reqField(o, "prefix", "replay comparison");
  if (!Array.isArray(prefixRaw) || prefixRaw.length > REPLAY_COMPARISON_BOUNDS.maxPrefix) {
    throw new AlgalError("PARSE_FAILED", `prefix must be an array of at most ${REPLAY_COMPARISON_BOUNDS.maxPrefix} entries`);
  }
  const prefixSeen = new Set<string>();
  const prefix = prefixRaw.map((entry, index) => {
    const e = asObject(entry, `prefix[${index}]`);
    noUnknownKeys(e, ["path", "digest"], `prefix[${index}]`);
    const path = asString(reqField(e, "path", `prefix[${index}]`), `prefix[${index}].path`, REPLAY_COMPARISON_BOUNDS.maxPathLen);
    if (prefixSeen.has(path)) {
      throw new AlgalError("PARSE_FAILED", `prefix repeats path "${path}"`);
    }
    prefixSeen.add(path);
    return { path, digest: asDigest(reqField(e, "digest", `prefix[${index}]`), `prefix[${index}].digest`) };
  });

  const addedRaw = reqField(o, "added", "replay comparison");
  if (!Array.isArray(addedRaw) || addedRaw.length > REPLAY_COMPARISON_BOUNDS.maxAdded) {
    throw new AlgalError("PARSE_FAILED", `added must be an array of at most ${REPLAY_COMPARISON_BOUNDS.maxAdded} entries`);
  }
  const added = addedRaw.map((entry, index) =>
    asString(entry, `added[${index}]`, REPLAY_COMPARISON_BOUNDS.maxPathLen));
  if (new Set(added).size !== added.length) {
    throw new AlgalError("PARSE_FAILED", "added must contain unique paths");
  }
  if ([...added].sort().join("") !== added.join("")) {
    throw new AlgalError("PARSE_FAILED", "added must be sorted");
  }

  const outcomes = asObject(reqField(o, "outcomes", "replay comparison"), "outcomes");
  noUnknownKeys(outcomes, ["original", "revised"], "outcomes");
  const originalOutcome = asString(reqField(outcomes, "original", "outcomes"), "outcomes.original", 32);
  const revisedOutcomeRaw = reqField(outcomes, "revised", "outcomes");
  if (revisedOutcomeRaw !== null) {
    asString(revisedOutcomeRaw, "outcomes.revised", 32);
  }

  const prefixTruncated = reqField(o, "prefixTruncated", "replay comparison") === true;
  const addedTruncated = reqField(o, "addedTruncated", "replay comparison") === true;
  const effectsMatchRaw = reqField(o, "effectsMatch", "replay comparison");
  if (effectsMatchRaw !== null && typeof effectsMatchRaw !== "boolean") {
    throw new AlgalError("PARSE_FAILED", "effectsMatch must be a boolean or null");
  }
  const divergenceRaw = optField(o, "divergence");
  const divergence = divergenceRaw === undefined || divergenceRaw === null
    ? null
    : parseDivergence(divergenceRaw);
  const reasonRaw = optField(o, "reason");
  const reason = reasonRaw === undefined || reasonRaw === null
    ? null
    : parseReason(reasonRaw);
  const revisionRaw = reqField(o, "revision", "replay comparison");
  if (revisionRaw !== null) asDigest(revisionRaw, "revision");
  const revisedReceiptRaw = reqField(o, "revisedReceipt", "replay comparison");
  if (revisedReceiptRaw !== null) asDigest(revisedReceiptRaw, "revisedReceipt");

  // Verdict coherence: the record may not claim a verdict its fields deny.
  if (verdict === "could-not-replay" && reason === null) {
    throw new AlgalError("PARSE_FAILED", "could-not-replay requires a reason");
  }
  if (verdict !== "could-not-replay" && reason !== null) {
    throw new AlgalError("PARSE_FAILED", "reason is present only on could-not-replay");
  }
  if (verdict === "identical") {
    if (divergence !== null || effectsMatchRaw !== true || added.length > 0 ||
        revisedOutcomeRaw === null || revisedOutcomeRaw !== originalOutcome ||
        revisedReceiptRaw === null) {
      throw new AlgalError("PARSE_FAILED", "identical verdict contradicts its evidence");
    }
  }
  if (verdict === "diverged" && revisedReceiptRaw === null) {
    throw new AlgalError("PARSE_FAILED", "diverged requires a revised receipt");
  }
  if (verdict === "diverged" && divergence === null && effectsMatchRaw === true &&
      revisedOutcomeRaw === originalOutcome && added.length === 0) {
    throw new AlgalError("PARSE_FAILED", "diverged verdict shows no divergence");
  }
  if (reason !== null && reason.code === "manifest-invalid" && revisedReceiptRaw !== null) {
    throw new AlgalError("PARSE_FAILED", "manifest-invalid carries no revised receipt");
  }

  return {
    contract: REPLAY_COMPARISON_CONTRACT,
    receipt: asDigest(reqField(o, "receipt", "replay comparison"), "receipt"),
    manifest: asDigest(reqField(o, "manifest", "replay comparison"), "manifest"),
    supplied: asDigest(reqField(o, "supplied", "replay comparison"), "supplied"),
    revision: revisionRaw === null ? null : (revisionRaw as Digest),
    args: asDigest(reqField(o, "args", "replay comparison"), "args"),
    verdict: verdict as ReplayVerdict,
    prefix,
    prefixTruncated,
    added,
    addedTruncated,
    divergence,
    outcomes: {
      original: originalOutcome,
      revised: revisedOutcomeRaw === null ? null : (revisedOutcomeRaw as string),
    },
    effectsMatch: effectsMatchRaw as boolean | null,
    revisedReceipt: revisedReceiptRaw === null ? null : (revisedReceiptRaw as Digest),
    reason,
  };
}

/** Canonical serialization of the comparison record. */
export function replayComparisonToJson(c: ReplayComparison): JsonObject {
  const divergence = c.divergence === null ? null : {
    kind: c.divergence.kind,
    path: c.divergence.path,
    original: c.divergence.original,
    revised: c.divergence.revised,
    ...(c.divergence.detail !== undefined ? { detail: c.divergence.detail } : {}),
  };
  const reason = c.reason === null ? null : {
    code: c.reason.code,
    ...(c.reason.path !== undefined ? { path: c.reason.path } : {}),
    ...(c.reason.request !== undefined ? { request: c.reason.request } : {}),
    ...(c.reason.detail !== undefined ? { detail: c.reason.detail } : {}),
  };
  return {
    contract: c.contract,
    receipt: c.receipt,
    manifest: c.manifest,
    supplied: c.supplied,
    revision: c.revision,
    args: c.args,
    verdict: c.verdict,
    prefix: c.prefix.map((entry) => ({ ...entry })),
    prefixTruncated: c.prefixTruncated,
    added: [...c.added],
    addedTruncated: c.addedTruncated,
    divergence,
    outcomes: { original: c.outcomes.original, revised: c.outcomes.revised },
    effectsMatch: c.effectsMatch,
    revisedReceipt: c.revisedReceipt,
    reason,
  };
}
