// Closed error-code union. `incomplete` and `failed` are distinct outcomes:
// a run that cannot resolve its remaining cells is `stuck`, not `failed`.

export const ERROR_CODES = [
  "PARSE_FAILED",
  "MANIFEST_INVALID",
  "GRAPH_CYCLE",
  "TYPE_MISMATCH",
  "GUARD_INVALID",
  "INTERFACE_MISMATCH",
  "DEPTH_EXCEEDED",
  "INPUT_MISSING",
  "FN_UNKNOWN",
  "FN_FAILED",
  "EFFECT_FAILED",
  "EFFECT_UNPARSEABLE",
  "EFFECT_UNBOUND",
  "BUDGET_EXHAUSTED",
  "STUCK",
  "STORE_MISS",
  "DIGEST_MISMATCH",
  "RECEIPT_MISMATCH",
  "IO_FAILED",
  "INTERNAL",
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

export class MorphogenError extends Error {
  readonly code: ErrorCode;
  readonly details?: unknown;

  constructor(code: ErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = "MorphogenError";
    this.code = code;
    if (details !== undefined) this.details = details;
  }
}

export function isMorphogenError(u: unknown): u is MorphogenError {
  return u instanceof MorphogenError;
}

export function errorReport(u: unknown): { code: ErrorCode; message: string } {
  if (isMorphogenError(u)) return { code: u.code, message: u.message };
  return {
    code: "INTERNAL",
    message: u instanceof Error ? u.message : String(u),
  };
}
