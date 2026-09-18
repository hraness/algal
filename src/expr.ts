// algal.expr.v1 — the Bun-side face of the shared evaluator.
//
// The language is implemented ONCE in crates/algal-expr (Rust) and shipped
// to this runtime as src/algal_expr.wasm — rebuilt by scripts/build-expr-wasm.sh.
// There is no TypeScript implementation of the semantics: identical results,
// errors, and fuel burns are guaranteed by construction, not by parity tests.
//
// Boundary: JSON string in, JSON string out, over wasm linear memory.

import { readFileSync } from "node:fs";
import { AlgalError } from "./errors";
import type { JsonObject, JsonValue } from "./values";

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

type EvalExports = {
  memory: WebAssembly.Memory;
  algal_alloc(len: number): number;
  algal_dealloc(ptr: number, len: number): void;
  algal_eval(ptr: number, len: number): bigint;
  algal_check(ptr: number, len: number): bigint;
};

let exports_: EvalExports | null = null;

function load(): EvalExports {
  if (exports_) return exports_;
  const url = new URL("./algal_expr.wasm", import.meta.url);
  const bytes = readFileSync(url);
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
