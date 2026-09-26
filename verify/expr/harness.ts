// Runtime adapters for expr-conformance.
//
// Four admitted runtimes, with the relation between them made explicit:
//
//   committed-wasm   — raw algal_eval / algal_check on a fresh Instance of
//                      src/algal_expr.wasm (byte-exact responses);
//   bun-wrapper      — src/expr.ts evalProgram/checkProgram over the same
//                      module (wrapper fidelity: JSON in/out, no semantics);
//   native           — verification_boundary eval|check over the same request
//                      bytes (the crate's own byte entry points);
//   independent-model — verify/expr/model.ts, the executable mirror of
//                      Algal.Expr (see that file's header for fidelity notes).
//
// The `algal` product CLI is exercised on expr-bearing manifests in the ABI
// lane (admission goes through the same check_program code); the
// verification_lean_vectors artifact cross-checks canonical rendering.

import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { requireSuccess, runCommand } from "../lib/runner";
import { artifactIdentity, type CommandArtifact } from "../traces/native";
import { evalProgram, setExprExports, type EvalExports } from "../../src/expr";
import { admit, canonical, run as modelRun, type MV, type RunOutcome } from "./model";
import type { Case, Expected, ModelPin } from "./catalog";

const REPO = join(import.meta.dir, "..", "..");
export const WASM_PATH = join(REPO, "src", "algal_expr.wasm");

export const DEFAULT_ARTIFACT_DIR = join(
  homedir(), ".local", "share", "algal-verify", "merged", "artifacts",
);
export const LEAN_FIXTURES = join(REPO, "verify", "lean", "fixtures");

export function artifactPath(name: string): string {
  return process.env[`ALGAL_EXPR_${name.toUpperCase().replace(/-/g, "_")}_BIN`]
    ?? join(DEFAULT_ARTIFACT_DIR, name);
}

export interface ArtifactSet {
  boundary: CommandArtifact;
  leanVectors: CommandArtifact;
  algal: CommandArtifact;
  wasmSha256: string;
  wasmBytes: number;
}

export async function bindArtifacts(): Promise<ArtifactSet> {
  const wasm = readFileSync(WASM_PATH);
  return {
    boundary: await artifactIdentity(artifactPath("verification_boundary")),
    leanVectors: await artifactIdentity(artifactPath("verification_lean_vectors")),
    algal: await artifactIdentity(artifactPath("algal")),
    wasmSha256: `sha256:${new Bun.CryptoHasher("sha256").update(wasm).digest("hex")}`,
    wasmBytes: wasm.byteLength,
  };
}

// ------------------------------------------------------------- wasm bytes --

let module_: WebAssembly.Module | null = null;
export function wasmModule(): WebAssembly.Module {
  if (module_ === null) module_ = new WebAssembly.Module(readFileSync(WASM_PATH));
  return module_;
}

/** A fresh instance per call: each instantiation has its own linear memory. */
export function wasmInstance(): EvalExports {
  const ex = new WebAssembly.Instance(wasmModule(), {}).exports;
  return ex as unknown as EvalExports;
}

const decoder = new TextDecoder();

/** Raw byte-level call — mirrors the loader's exact alloc/write/pack/decode
 *  sequence, on a supplied instance, returning the response string verbatim. */
export function rawCall(ex: EvalExports, fn: "algal_eval" | "algal_check", input: Uint8Array): string {
  const inPtr = ex.algal_alloc(input.length);
  if (inPtr === 0) throw new Error("alloc returned null");
  try {
    new Uint8Array(ex.memory.buffer, inPtr, input.length).set(input);
    const packed = ex[fn](inPtr, input.length);
    if (packed === 0n) throw new Error(`${fn} returned null`);
    const outPtr = Number(packed >> 32n);
    const outLen = Number(packed & 0xffff_ffffn);
    const out = decoder.decode(new Uint8Array(ex.memory.buffer, outPtr, outLen));
    ex.algal_dealloc(outPtr, outLen);
    return out;
  } finally {
    ex.algal_dealloc(inPtr, input.length);
  }
}

const encode = (s: string): Uint8Array => new TextEncoder().encode(s);

/** The request bytes the wire contract uses: {"program":…,"env":…,"fuel":n}. */
export function evalRequestBytes(c: Case): Uint8Array {
  return encode(JSON.stringify({ program: c.program, env: c.env, fuel: c.fuel }));
}
export function checkRequestBytes(c: Case): Uint8Array {
  return encode(JSON.stringify({ program: c.program, names: [...Object.keys(c.env)].sort() }));
}

// ----------------------------------------------------------------- native --

const workdir = mkdtempSync(join(tmpdir(), "algal-expr-verify-"));
let fileSeq = 0;
const nativeFile = (bytes: Uint8Array): string => {
  const path = join(workdir, `case-${fileSeq++}.json`);
  writeFileSync(path, bytes);
  return path;
};

/** Run the boundary driver on owned request bytes. Returns stdout without the
 *  trailing newline (both drivers print the response plus one LF). */
export async function nativeBoundary(mode: "eval" | "check", input: Uint8Array): Promise<string> {
  const path = nativeFile(input);
  const result = await runCommand([artifactPath("verification_boundary"), mode, path], { timeoutMs: 15_000 });
  requireSuccess(result);
  if (!result.stdout.endsWith("\n")) throw new Error(`native ${mode}: unterminated stdout`);
  return result.stdout.slice(0, -1);
}

// ---------------------------------------------------------------- wrapper --

let wrapperBound = false;
export function bindWrapper(): void {
  if (!wrapperBound) {
    setExprExports(wasmInstance());
    wrapperBound = true;
  }
}

// --------------------------------------------------------------- response --

export interface ProjectedOk { ok: true; value: MV; fuel: number }
export interface ProjectedErr { ok: false; code: string; err: Record<string, unknown>; fuel: number }
export type Projected = ProjectedOk | ProjectedErr;

/** Closed response admission: the wire contract's two shapes only. */
export function project(raw: string, label: string): Projected {
  const parsed: unknown = JSON.parse(raw);
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`${label}: response not an object`);
  }
  const r = parsed as Record<string, unknown>;
  const keys = Object.keys(r);
  if (r.ok === true) {
    if (!keys.every(k => k === "ok" || k === "value" || k === "fuel")) throw new Error(`${label}: stray keys`);
    if (!Number.isSafeInteger(r.fuel) || (r.fuel as number) < 0) throw new Error(`${label}: bad fuel`);
    return { ok: true, value: admit(r.value), fuel: r.fuel as number };
  }
  if (r.ok === false) {
    if (!keys.every(k => k === "ok" || k === "err" || k === "fuel")) throw new Error(`${label}: stray keys`);
    const e = r.err;
    if (e === null || typeof e !== "object" || Array.isArray(e)) throw new Error(`${label}: err not object`);
    const code = (e as Record<string, unknown>).code;
    if (typeof code !== "string" || !/^EXPR_[A-Z_]+$/.test(code)) throw new Error(`${label}: bad code`);
    if (!Number.isSafeInteger(r.fuel) || (r.fuel as number) < 0) throw new Error(`${label}: bad fuel`);
    return { ok: false, code, err: e as Record<string, unknown>, fuel: r.fuel as number };
  }
  throw new Error(`${label}: ok not boolean`);
}

/** Model outcome → projected shape (code names mapped to EXPR_* spellings). */
export function projectModel(outcome: RunOutcome): Projected {
  if (outcome.ok) return { ok: true, value: outcome.value, fuel: outcome.used };
  return { ok: false, code: CODE_NAME[outcome.code], err: { code: CODE_NAME[outcome.code], ...outcome.details }, fuel: outcome.used };
}

const sameValue = (a: MV, b: MV): boolean => canonical(a) === canonical(b);

function expectedMatches(expected: Expected, got: Projected, label: string): void {
  if (expected.ok) {
    if (!got.ok) throw new Error(`${label}: expected ok, got ${got.code}`);
    if (expected.fuel !== got.fuel) throw new Error(`${label}: fuel ${expected.fuel} != ${got.fuel}`);
    if (expected.value !== undefined && !sameValue(admit(expected.value), got.value)) {
      throw new Error(`${label}: value ${canonical(admit(expected.value))} != ${canonical(got.value)}`);
    }
  } else {
    if (got.ok) throw new Error(`${label}: expected ${expected.code}, got ok`);
    if (got.code !== expected.code) throw new Error(`${label}: code ${got.code} != ${expected.code}`);
    if (got.fuel !== expected.fuel) throw new Error(`${label}: fuel ${expected.fuel} != ${got.fuel}`);
  }
}

function modelPinMatches(pin: Exclude<ModelPin, "agree">, got: Projected, label: string): void {
  if (pin.ok) {
    if (!got.ok) throw new Error(`${label}: model pin ok, got ${got.code}`);
    if (pin.used !== got.fuel) throw new Error(`${label}: model pin fuel ${pin.used} != ${got.fuel}`);
    if (pin.value !== undefined && !sameValue(admit(pin.value), got.value)) {
      throw new Error(`${label}: model pin value mismatch`);
    }
  } else {
    if (got.ok) throw new Error(`${label}: model pin ${pin.code}, got ok`);
    if (got.code !== pin.code) throw new Error(`${label}: model pin code ${got.code} != ${pin.code}`);
    if (pin.used !== got.fuel) throw new Error(`${label}: model pin fuel ${pin.used} != ${got.fuel}`);
  }
}

export interface CaseReport {
  id: string;
  family: Case["family"];
  relation: "three-way" | "wasm-native";
  raw: string;
  modelCode: string | null;
  modelFuel: number | null;
}

/** The full per-case comparison. Asserts:
 *  - wasm raw bytes ≡ native stdout bytes (strongest: response text exact);
 *  - the authored `expect` pin, when present, holds on the wire;
 *  - the Bun wrapper produces the same projected outcome (JSON round-trip);
 *  - on three-way cases the independent model agrees on
 *    (ok, canonical value, error code, fuel used); on pinned cases the model
 *    produces the pinned disposition exactly (code, fuel). */
export async function compareCase(c: Case, native = true): Promise<CaseReport> {
  bindWrapper();
  const ex = wasmInstance();
  const request = evalRequestBytes(c);
  const wasmRaw = rawCall(ex, "algal_eval", request);
  const projected = project(wasmRaw, `${c.id}:wasm`);

  if (c.expect !== null) expectedMatches(c.expect, projected, `${c.id}:pin`);

  const program = admit(c.program);
  const env = admit(c.env);
  const modelOutcome = projectModel(modelRun(program, env, c.fuel));

  if (c.family === "reject") {
    // Model relation is pinned explicitly; the production pin asserts the
    // check-level code. Both are exact.
    if (c.model !== "agree") modelPinMatches(c.model, modelOutcome, `${c.id}:model`);
  } else if (c.model === "agree") {
    expectedMatches(
      projected.ok
        ? { ok: true, value: undefined, fuel: projected.fuel }
        : { ok: false, code: projected.code, fuel: projected.fuel },
      modelOutcome,
      `${c.id}:model`,
    );
    if (projected.ok && modelOutcome.ok && !sameValue(modelOutcome.value, projected.value)) {
      throw new Error(`${c.id}:model value ${canonical(modelOutcome.value)} != ${canonical(projected.value)}`);
    }
  } else {
    modelPinMatches(c.model, modelOutcome, `${c.id}:model`);
  }

  // Wrapper fidelity: JSON in/out over the same module.
  const wrapped = evalProgram(c.program as never, c.env as never, c.fuel);
  const wrapProjected: Projected = wrapped.ok
    ? { ok: true, value: admit(wrapped.value), fuel: wrapped.fuel }
    : { ok: false, code: (wrapped.err as Record<string, unknown>).code as string, err: wrapped.err as Record<string, unknown>, fuel: wrapped.fuel };
  if (projected.ok !== wrapProjected.ok || projected.fuel !== wrapProjected.fuel) {
    throw new Error(`${c.id}:wrapper fuel/ok mismatch`);
  }
  if (!projected.ok && wrapProjected.ok === false && projected.code !== wrapProjected.code) {
    throw new Error(`${c.id}:wrapper code mismatch`);
  }
  if (projected.ok && wrapProjected.ok && !sameValue(projected.value, wrapProjected.value)) {
    throw new Error(`${c.id}:wrapper value mismatch`);
  }

  let nativeRaw = "";
  if (native) {
    nativeRaw = await nativeBoundary("eval", request);
    if (nativeRaw !== wasmRaw) {
      throw new Error(`${c.id}: native/wasm bytes diverge\nwasm:   ${wasmRaw.slice(0, 400)}\nnative: ${nativeRaw.slice(0, 400)}`);
    }
  }
  return { id: c.id, family: c.family, relation: "three-way", raw: wasmRaw,
    modelCode: modelOutcome.ok ? null : modelOutcome.code, modelFuel: modelOutcome.fuel };
}
