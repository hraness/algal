// Host-selected adapters are trusted custody authorities, not cryptographic
// attestors. An observation must never submit, resume, cancel, or retry work.
import { isAbsolute } from "node:path";
import { asDigest, digestCanonical, digestText, type Digest } from "./digest";
import { AlgalError } from "./errors";
import { commandJson } from "./io";
import {
  asInt,
  asObject,
  asString,
  canonicalBytes,
  canonicalize,
  noUnknownKeys,
  type JsonValue,
} from "./values";

export const CODING_OPERATION_PROTOCOL = "algal.coding-operation.v1" as const;
export const CODING_OPERATION_BOUNDS = {
  maxOutputBytes: 1_048_576,
  maxProofBytes: 4096,
  maxInputBytes: 1_048_576,
  maxRuntimeMs: 600_000,
  maxArgvPrefix: 31,
  maxArgvBytes: 16_384,
  maxRevision: 2_147_483_647,
} as const;

/** Both identities are caller-retained, stable identities. authorityId names a
 * particular custody ledger incarnation, not a provider display name. */
export type CodingOperationBinding = {
  operationId: string;
  authorityId: string;
  requestDigest: Digest;
};
export type CodingOperationAdapter = {
  protocol: typeof CODING_OPERATION_PROTOCOL;
  authorityId: string;
  executable: string;
  argvPrefix: string[];
};
type CodingOperationBase = CodingOperationBinding & {
  contract: typeof CODING_OPERATION_PROTOCOL;
  revision: number;
};
export type CodingOperationOutcome = CodingOperationBase & (
  | { state: "unknown"; reason: "missing" | "expired" | "unavailable" | "unresolved" }
  | { state: "accepted"; acceptanceRef: Digest }
  | {
      state: "terminal";
      acceptanceRef: Digest;
      outcome: "completed" | "failed" | "cancelled";
      settlement: "all-admitted-work-settled";
      result: { text: string; digest: Digest; length: number };
    }
);
export type CodingOperationWireRequest = {
  contract: "algal.coding-operation-request.v1";
  binding: CodingOperationBinding;
} & (
  | { action: "submit"; payload: JsonValue }
  | { action: "observe" }
);
export type CodingOperationRequest = {
  binding: CodingOperationBinding;
  signal: AbortSignal;
  timeoutMs: number;
  maxOutputBytes: number;
};
/** SDK transports return unknown so the host must parse every foreign outcome,
 * including responses from custom transports. Observe receives no task payload. */
export type CodingOperationTransport = {
  submit(request: CodingOperationRequest & { payload: JsonValue }): Promise<unknown>;
  observe(request: CodingOperationRequest): Promise<unknown>;
};

const json = (value: unknown): JsonValue => value as JsonValue;
function invalid(message: string): never {
  throw new AlgalError("PARSE_FAILED", message);
}
function identity(raw: unknown, label: string): string {
  const value = asString(raw, label, 160);
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/.test(value)) invalid(`invalid ${label}`);
  return value;
}
function bindingFields(raw: ReturnType<typeof asObject>): CodingOperationBinding {
  return {
    operationId: identity(raw.operationId, "operation identity"),
    authorityId: identity(raw.authorityId, "operation authority"),
    requestDigest: asDigest(raw.requestDigest, "operation request digest"),
  };
}
export function parseCodingOperationBinding(raw: unknown): CodingOperationBinding {
  const value = asObject(raw, "operation binding");
  noUnknownKeys(value, ["operationId", "authorityId", "requestDigest"], "operation binding");
  return bindingFields(value);
}
export function parseCodingOperationAdapter(raw: unknown): CodingOperationAdapter {
  const value = asObject(raw, "operation adapter");
  noUnknownKeys(value, ["protocol", "authorityId", "executable", "argvPrefix"], "operation adapter");
  if (value.protocol !== CODING_OPERATION_PROTOCOL) invalid("unsupported coding operation protocol");
  const executable = asString(value.executable, "operation executable", 4096);
  if (!isAbsolute(executable) || /[\0\r\n]/.test(executable))
    invalid("operation executable must be an absolute host-selected path");
  if (!Array.isArray(value.argvPrefix) || value.argvPrefix.length > CODING_OPERATION_BOUNDS.maxArgvPrefix)
    invalid("invalid operation argv prefix");
  const argvPrefix = value.argvPrefix.map((raw) => {
    const arg = asString(raw, "operation argv argument", 4096);
    if (arg.includes("\0") || Buffer.byteLength(arg) > 4096) invalid("invalid operation argv argument");
    return arg;
  });
  if (Buffer.byteLength(executable) > 4096 ||
      Buffer.byteLength(executable) + argvPrefix.reduce((sum, arg) => sum + Buffer.byteLength(arg), 0) > CODING_OPERATION_BOUNDS.maxArgvBytes)
    invalid("operation argv exceeds byte bound");
  return {
    protocol: CODING_OPERATION_PROTOCOL,
    authorityId: identity(value.authorityId, "operation authority"),
    executable,
    argvPrefix,
  };
}
function equalBinding(actual: CodingOperationBinding, expected: CodingOperationBinding): void {
  if (actual.operationId !== expected.operationId || actual.authorityId !== expected.authorityId ||
      actual.requestDigest !== expected.requestDigest) invalid("coding operation binding mismatch");
}

/** Parse integrity and custody assertions. No digest authenticates their issuer.
 * A missing/expired lookup is never evidence that submission cannot still land.
 * If history contains more than one witness, callers must retain the strongest
 * acceptance binding as well as the latest revision (or compare every witness).
 * Identical repeat evidence is permitted; a terminal assertion is immutable. */
export function parseCodingOperationOutcome(
  raw: unknown,
  expected: CodingOperationBinding,
  options: { maxOutputBytes?: number; previous?: CodingOperationOutcome } = {},
): CodingOperationOutcome {
  const maxBytes = asInt(options.maxOutputBytes ?? CODING_OPERATION_BOUNDS.maxOutputBytes,
    "operation output byte bound", 1024, CODING_OPERATION_BOUNDS.maxOutputBytes);
  const binding = parseCodingOperationBinding(expected);
  const value = asObject(raw, "operation outcome");
  const baseKeys = ["contract", "operationId", "authorityId", "requestDigest", "revision", "state"];
  if (value.contract !== CODING_OPERATION_PROTOCOL) invalid("unsupported coding operation outcome");
  const actual = bindingFields(value);
  equalBinding(actual, binding);
  const revision = asInt(value.revision, "operation revision", value.state === "unknown" ? 0 : 1,
    CODING_OPERATION_BOUNDS.maxRevision);
  const base = { contract: CODING_OPERATION_PROTOCOL, ...actual, revision };
  let result: CodingOperationOutcome;
  if (value.state === "unknown") {
    noUnknownKeys(value, [...baseKeys, "reason"], "unknown operation outcome");
    const reason = value.reason;
    if (reason !== "missing" && reason !== "expired" && reason !== "unavailable" && reason !== "unresolved")
      invalid("invalid unknown operation reason");
    result = { ...base, state: "unknown", reason };
  } else if (value.state === "accepted") {
    noUnknownKeys(value, [...baseKeys, "acceptanceRef"], "accepted operation outcome");
    result = { ...base, state: "accepted", acceptanceRef: asDigest(value.acceptanceRef, "operation acceptance reference") };
  } else if (value.state === "terminal") {
    noUnknownKeys(value, [...baseKeys, "acceptanceRef", "outcome", "settlement", "result"], "terminal operation outcome");
    if (value.settlement !== "all-admitted-work-settled") invalid("coding operation lacks complete settlement");
    const outcome = value.outcome;
    if (outcome !== "completed" && outcome !== "failed" && outcome !== "cancelled") invalid("invalid terminal operation outcome");
    const output = asObject(value.result, "operation result");
    noUnknownKeys(output, ["text", "digest", "length"], "operation result");
    const text = asString(output.text, "operation result text", maxBytes);
    const length = asInt(output.length, "operation result length", 0, maxBytes);
    const digest = asDigest(output.digest, "operation result digest");
    if (Buffer.byteLength(text) !== length || digestText(text) !== digest) invalid("coding operation result integrity mismatch");
    result = {
      ...base, state: "terminal", acceptanceRef: asDigest(value.acceptanceRef, "operation acceptance reference"),
      outcome, settlement: "all-admitted-work-settled", result: { text, digest, length },
    };
  } else {
    invalid("invalid coding operation state");
  }
  if (canonicalBytes(json(result)) > maxBytes) invalid("coding operation outcome exceeds byte bound");
  const proof = result.state === "terminal" ? { ...result, result: { digest: result.result.digest, length: result.result.length } } : result;
  if (canonicalBytes(json(proof)) > CODING_OPERATION_BOUNDS.maxProofBytes) invalid("coding operation proof exceeds byte bound");
  if (options.previous !== undefined) {
    // Reparse retained/SDK evidence too; trusting its TypeScript annotation would
    // allow malformed data to weaken an acceptance or terminal binding.
    const previous = parseCodingOperationOutcome(options.previous, binding, { maxOutputBytes: maxBytes });
    if (result.revision < previous.revision) invalid("stale coding operation revision");
    const identical = canonicalize(json(result)) === canonicalize(json(previous));
    if ((result.revision === previous.revision || previous.state === "terminal") && !identical)
      invalid("conflicting immutable coding operation evidence");
    if (previous.state !== "unknown" && result.state !== "unknown" && previous.acceptanceRef !== result.acceptanceRef)
      invalid("coding operation acceptance binding mismatch");
  }
  return result;
}

// Bound the generic SDK payload before canonicalization. The job layer owns its
// schema; the transport owns the total JSON depth, count, bytes and digest.
function boundedPayload(value: unknown): JsonValue {
  let count = 0;
  let bytes = 0;
  const visit = (item: unknown, depth: number): void => {
    if (++count > 16_384 || depth > 16) invalid("operation payload exceeds structural bounds");
    if (item === null || typeof item === "boolean") return;
    if (typeof item === "number" && Number.isFinite(item)) return;
    if (typeof item === "string") {
      bytes += Buffer.byteLength(item);
      if (bytes > CODING_OPERATION_BOUNDS.maxInputBytes) invalid("operation payload exceeds byte bound");
      return;
    }
    if (typeof item !== "object" || item === null) invalid("invalid operation payload JSON");
    if (Array.isArray(item)) {
      if (item.length > 256) invalid("operation payload array exceeds bound");
      for (const child of item) visit(child, depth + 1);
    } else {
      if (Object.getPrototypeOf(item) !== Object.prototype && Object.getPrototypeOf(item) !== null)
        invalid("invalid operation payload JSON object");
      const entries = Object.entries(item);
      if (entries.length > 64) invalid("operation payload object exceeds bound");
      for (const [key, child] of entries) {
        const keyBytes = Buffer.byteLength(key);
        if (keyBytes > 256) invalid("operation payload key exceeds bound");
        bytes += keyBytes;
        if (bytes > CODING_OPERATION_BOUNDS.maxInputBytes) invalid("operation payload exceeds byte bound");
        visit(child, depth + 1);
      }
    }
  };
  visit(value, 0);
  if (canonicalBytes(json(value)) > CODING_OPERATION_BOUNDS.maxInputBytes) invalid("operation payload exceeds byte bound");
  return json(value);
}

/** Adapter-side parser for the exact argv operation's JSON stdin. The program
 * must additionally require that request.action matches its submit/observe argv.
 * A request digest identifies canonical payload bytes, never the whole envelope. */
export function parseCodingOperationRequest(raw: unknown): CodingOperationWireRequest {
  const value = asObject(raw, "coding operation request");
  if (value.contract !== "algal.coding-operation-request.v1") invalid("unsupported coding operation request");
  if (value.action !== "submit" && value.action !== "observe") invalid("invalid coding operation action");
  noUnknownKeys(value, ["contract", "action", "binding", ...(value.action === "submit" ? ["payload"] : [])], "coding operation request");
  const binding = parseCodingOperationBinding(value.binding);
  let result: CodingOperationWireRequest;
  if (value.action === "submit") {
    const payload = boundedPayload(value.payload);
    if (digestCanonical(payload) !== binding.requestDigest) invalid("coding operation payload digest mismatch");
    result = { contract: "algal.coding-operation-request.v1", action: "submit", binding, payload };
  } else {
    result = { contract: "algal.coding-operation-request.v1", action: "observe", binding };
  }
  if (canonicalBytes(json(result)) > CODING_OPERATION_BOUNDS.maxInputBytes) invalid("coding operation request exceeds byte bound");
  return result;
}

/** Fixed argv transport: argvPrefix is host configuration, never model output.
 * The configured program must implement read-only exact lookup for observe and
 * durable caller-key deduplication for submit. Algal never retries either call.
 * Joining this subprocess does not itself prove external settlement. */
export function codingOperationCommandTransport(raw: CodingOperationAdapter): CodingOperationTransport {
  const adapter = parseCodingOperationAdapter(raw); // Defensive snapshot.
  const request = async (action: "submit" | "observe", call: CodingOperationRequest, payload?: JsonValue): Promise<CodingOperationOutcome> => {
    if (call.signal.aborted) throw new AlgalError("BUDGET_EXHAUSTED", "coding operation cancelled before dispatch");
    const binding = parseCodingOperationBinding(call.binding);
    if (binding.authorityId !== adapter.authorityId) invalid("coding operation authority differs from admitted adapter");
    const timeoutMs = asInt(call.timeoutMs, "operation timeout", 1, CODING_OPERATION_BOUNDS.maxRuntimeMs);
    const maxOutputBytes = asInt(call.maxOutputBytes, "operation output byte bound", 1024, CODING_OPERATION_BOUNDS.maxOutputBytes);
    const input = parseCodingOperationRequest({
      contract: "algal.coding-operation-request.v1", action, binding,
      ...(action === "submit" ? { payload } : {}),
    });
    if (call.signal.aborted) throw new AlgalError("BUDGET_EXHAUSTED", "coding operation cancelled before dispatch");
    try {
      const outcome = await commandJson([adapter.executable, ...adapter.argvPrefix, action],
        json(input), { timeoutMs, maxStdoutBytes: maxOutputBytes, signal: call.signal });
      return parseCodingOperationOutcome(outcome, binding, { maxOutputBytes });
    } catch {
      // A bad/absent acknowledgement, failed command, or cancellation supplies
      // no evidence about admitted provider work, regardless of child exit.
      throw new AlgalError("EFFECT_FAILED", "coding operation response unavailable or invalid; settlement unknown", undefined, { uncertain: true });
    }
  };
  return {
    submit: (call) => request("submit", call, call.payload),
    observe: (call) => request("observe", call),
  };
}
