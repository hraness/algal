/**
 * Admission-context harness — `lean-admission` leg of Phase 15.
 *
 * Wraps the Phase-11 independent derivation checker
 * (`verify/reference/memory/checker.ts`) with the explicit authority tuple
 * the Lean model proves exact (`verify/lean/Algal/Admission`):
 *
 *   (snapshot, program, host, engine)
 *
 * `admitResult` mirrors `Algal.Admission.admit`: the claim's recorded
 * identity must equal the admitting context *before* the embedded
 * `algal.query-result.v1` payload is checked. Snapshot and program bind by
 * canonical SHA-256 document digest (the executable surrogate for the
 * model's value equality); host and engine bind by opaque string identity.
 *
 * Correspondence is sampled fixture agreement on the accept/reject
 * partition — not a refinement proof. See SCOPE.md.
 */
import {
  checkQueryResult, digestDocument, type Json, type Reason,
} from "../reference/memory/checker";

/** The admitting context: the exact `(snapshot, program, host, engine)`
 *  tuple plus an optional source-selection context. */
export interface AdmissionContext {
  /** The `algal.memory.v1` snapshot document. */
  snapshot: Json;
  /** The `algal.query.v1` program document. */
  program: Json;
  /** Opaque admission-host identity. */
  host: string;
  /** Opaque executing-engine identity. */
  engine: string;
  /** Optional source custody context forwarded to the checker. */
  selection?: unknown;
}

/** An admitted-answer claim: the identity tuple it binds plus the result
 *  envelope carrying the rows, counters and proof DAG. */
export interface AdmissionClaim {
  /** Canonical digest of the snapshot the claim binds. */
  snapshot: string;
  /** Canonical digest of the program the claim binds. */
  program: string;
  /** Admission-host identity the claim binds. */
  host: string;
  /** Executing-engine identity the claim binds. */
  engine: string;
  /** The `algal.query-result.v1` payload. */
  result: unknown;
}

export type AdmitReason =
  | Reason
  | "snapshot-identity-mismatch"
  | "program-identity-mismatch"
  | "host-identity-mismatch"
  | "engine-identity-mismatch";

export type AdmitVerdict =
  | { accept: true; rows: number }
  | { accept: false; reason: AdmitReason; detail: string };

const identityReject = (reason: AdmitReason, detail: string): AdmitVerdict =>
  ({ accept: false, reason, detail });

/** Decide whether `claim` is admitted under `ctx`. Identity binding is
 *  checked first and exactly; the result envelope is then delegated to the
 *  independent checker, which re-binds `result.snapshot`/`result.program`
 *  to the same input digests and verifies the proof DAG against the
 *  admitted snapshot. */
export function admitResult(ctx: AdmissionContext, claim: AdmissionClaim): AdmitVerdict {
  if (claim.snapshot !== digestDocument(ctx.snapshot))
    return identityReject("snapshot-identity-mismatch",
      "claim binds a snapshot digest that is not the admitting snapshot");
  if (claim.program !== digestDocument(ctx.program))
    return identityReject("program-identity-mismatch",
      "claim binds a program digest that is not the admitting program");
  if (claim.host !== ctx.host)
    return identityReject("host-identity-mismatch",
      "claim binds a host identity that is not the admitting host");
  if (claim.engine !== ctx.engine)
    return identityReject("engine-identity-mismatch",
      "claim binds an engine identity that is not the admitting engine");
  return checkQueryResult({
    snapshot: ctx.snapshot, program: ctx.program,
    claimed: claim.result, selection: ctx.selection,
  });
}
