// algal.expr.v1 — the Bun-side face of the shared evaluator.
//
// The language is implemented ONCE in crates/algal-expr (Rust) and shipped
// to this runtime as src/algal_expr.wasm — rebuilt by scripts/build-expr-wasm.sh.
// There is no TypeScript implementation of the semantics: identical results,
// errors, and fuel burns are guaranteed by construction, not by parity tests.
//
// Boundary: JSON string in, JSON string out, over wasm linear memory.

import { AlgalError } from "./errors";
import { canonicalize, type JsonObject, type JsonValue } from "./values";

export type ExprErr = { code: string } & { [k: string]: JsonValue };
export type ExprResult =
  | { ok: true; value: JsonValue; fuel: number }
  | { ok: false; err: ExprErr; fuel: number };
export type ExprCheck =
  | { ok: true }
  | { ok: false; err: ExprErr };

/** Mirror of crates/algal-expr constants — the crate is the source of
 * truth; these are duplicated only so callers can size budgets without a
 * wasm call. Keep in sync (they are asserted by the crate's tests). */
export const EXPR_BOUNDS = {
  maxProgramBytes: 16_384,
  maxProgramNodes: 512,
  maxProgramDepth: 16,
  maxEnvBytes: 262_144,
  maxValueDepth: 32,
  maxListLen: 1_024,
  maxObjectKeys: 256,
  maxStringBytes: 65_536,
  maxOutputBytes: 65_536,
  maxVarLen: 64,
  maxFuel: 1_000_000,
} as const;
export const EXPR_DEFAULT_FUEL = 10_000;

export type EvalExports = {
  memory: WebAssembly.Memory;
  algal_alloc(len: number): number;
  algal_dealloc(ptr: number, len: number): void;
  algal_eval(ptr: number, len: number): bigint;
  algal_check(ptr: number, len: number): bigint;
};

let exports_: EvalExports | null = null;

/** Hosts that cannot read the committed wasm artifact from disk inject the
 * shared evaluator once — a workerd bundle hands over the same
 * WebAssembly.Module through its wasm import rule. Same artifact,
 * different delivery path: values, error codes, and fuel burns are
 * identical by construction. Keeps node:fs out of this module's import
 * graph so the contract parse chain stays bundle-safe. */
export function setExprExports(exports: EvalExports): void {
  exports_ = exports;
}

type FsLike = { readFileSync(path: URL): Uint8Array };

function filesystem(): FsLike {
  const require_ = (
    import.meta as { require?: (id: string) => FsLike }
  ).require;
  if (require_ !== undefined) return require_("node:fs");
  const getBuiltinModule = (
    globalThis as {
      process?: { getBuiltinModule?: (id: string) => FsLike };
    }
  ).process?.getBuiltinModule;
  if (getBuiltinModule !== undefined) {
    return getBuiltinModule.call(globalThis.process, "node:fs");
  }
  throw new AlgalError(
    "EXPR_FAILED",
    "no filesystem evaluator loader on this host — call setExprExports with the algal_expr.wasm instance",
  );
}

function load(): EvalExports {
  if (exports_) return exports_;
  const url = new URL("./algal_expr.wasm", import.meta.url);
  const bytes = filesystem().readFileSync(url);
  const module = new WebAssembly.Module(bytes);
  const instance = new WebAssembly.Instance(module, {});
  exports_ = instance.exports as unknown as EvalExports;
  return exports_;
}

const enc = new TextEncoder();
const dec = new TextDecoder();

function call(fn: "algal_eval" | "algal_check", request: JsonObject): string {
  const ex = load();
  const input = enc.encode(JSON.stringify(request));
  const inPtr = ex.algal_alloc(input.length);
  if (inPtr === 0) {
    throw new AlgalError("EXPR_FAILED", "expr evaluator allocation failed");
  }
  new Uint8Array(ex.memory.buffer, inPtr, input.length).set(input);
  const packed = ex[fn](inPtr, input.length);
  ex.algal_dealloc(inPtr, input.length);
  if (packed === 0n) {
    throw new AlgalError("EXPR_FAILED", "expr evaluator returned null");
  }
  const outPtr = Number(packed >> 32n);
  const outLen = Number(packed & 0xffff_ffffn);
  const out = dec.decode(new Uint8Array(ex.memory.buffer, outPtr, outLen));
  ex.algal_dealloc(outPtr, outLen);
  return out;
}

/** Evaluate an algal.expr.v1 program against an env record. Deterministic:
 * same program + env => same value/err and same fuel burn. */
export function evalProgram(
  program: JsonValue,
  env: JsonObject,
  fuel: number = EXPR_DEFAULT_FUEL,
): ExprResult {
  const raw = call("algal_eval", { program, env, fuel });
  const r = JSON.parse(raw) as
    | { ok: true; value: JsonValue; fuel: number }
    | { ok: false; err: ExprErr; fuel: number };
  return r;
}

/** Static check: program shape, op table, arity, bounds, and that literal
 * ["get","name",...] heads resolve against `names` (input ports or binders). */
export function checkProgram(
  program: JsonValue,
  names: readonly string[],
): ExprCheck {
  const raw = call("algal_check", { program, names: [...names] });
  return JSON.parse(raw) as ExprCheck;
}

/** An `algal.expr.v1` program scored per case over the fixed environment
 * {"args","expect","outputs"} — the pass predicate as data, shared by
 * foundry fitness and bench claims. */
export type ExprScorer = { contract: "algal.expr.v1"; program: JsonValue };

const SCORER_NAMES = ["args", "expect", "outputs"] as const;

/** Scorer fuel budget — must match crates/algal scorer::MAX_EXPR_FUEL. */
const SCORER_FUEL = 100_000;

/** The versioned envelope every expr consumer shares. */
export type ExprEnvelope = { contract: "algal.expr.v1"; program: JsonValue };

/** Parse the `{"contract":"algal.expr.v1","program":…}` envelope from a
 * foreign value — shape only; each consumer then statically checks the
 * program against its own environment names. */
export function parseExprEnvelope(value: unknown, at: string): ExprEnvelope {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new AlgalError("PARSE_FAILED", `${at} must be an object`);
  }
  const s = value as JsonObject;
  const extra = Object.keys(s).find((key) => !["contract", "program"].includes(key));
  if (extra) throw new AlgalError("PARSE_FAILED", `${at}: unknown key "${extra}"`);
  if (s.contract !== "algal.expr.v1") {
    throw new AlgalError("PARSE_FAILED", `${at}.contract must be algal.expr.v1`);
  }
  if (s.program === undefined) {
    throw new AlgalError("PARSE_FAILED", `${at}.program is required`);
  }
  return { contract: "algal.expr.v1", program: s.program };
}

/** Parse and statically check a scorer from a foreign value. A malformed
 * shape is PARSE_FAILED; a well-formed envelope with a bad program is
 * SCORER_INVALID — the distinction a config author needs. */
export function parseExprScorer(value: unknown, at: string): ExprScorer {
  const s = parseExprEnvelope(value, at);
  const c = checkProgram(s.program, SCORER_NAMES);
  if (!c.ok) {
    throw new AlgalError("SCORER_INVALID", `${at} ${canonicalize(c.err)}`);
  }
  return s;
}

/** Run a scorer against one case: env is {"args","expect","outputs"}, the
 * result must be a strict boolean. A thrown or non-boolean scorer is a
 * config bug — SCORER_INVALID, never a silent case failure. */
export function evalScorer(
  scorer: ExprScorer,
  c: { args: Record<string, JsonValue>; expect: Record<string, JsonValue> },
  outputs: Record<string, JsonValue>,
): boolean {
  const r = evalProgram(
    scorer.program,
    { args: c.args, expect: c.expect, outputs },
    SCORER_FUEL,
  );
  if (!r.ok) {
    throw new AlgalError("SCORER_INVALID", `scorer ${canonicalize(r.err)}`);
  }
  if (typeof r.value !== "boolean") {
    throw new AlgalError(
      "SCORER_INVALID",
      `scorer must produce boolean, got ${canonicalize(r.value)}`,
    );
  }
  return r.value;
}

/** Run a pareto-axis program over a system aggregate record; the result
 * must be a finite number — a dominance coordinate, not a verdict. Same
 * budget class as scorers; AXIS_INVALID on any failure. */
export function evalAxis(program: JsonValue, env: JsonObject): number {
  const r = evalProgram(program, env, SCORER_FUEL);
  if (!r.ok) {
    throw new AlgalError("AXIS_INVALID", `axis ${canonicalize(r.err)}`);
  }
  if (typeof r.value !== "number" || !Number.isFinite(r.value)) {
    throw new AlgalError(
      "AXIS_INVALID",
      `axis must produce a finite number, got ${canonicalize(r.value)}`,
    );
  }
  return r.value;
}
