/**
 * verify/differential/engine.ts — per-case target classification and
 * comparison. Pure logic: target outputs are supplied, never executed here.
 *
 * Classification axes (each case lands in exactly one):
 *   agreement        — all observed targets + oracle prediction agree
 *   mismatch-oracle  — a target's response class/bytes differ from the oracle
 *   mismatch-targets — committed WASM and native bytes differ
 *   mismatch-wrapper — the Bun wrapper response differs from the raw boundary
 *   wasm-transport   — the wasm ABI could not carry the input (null alloc)
 *   infra-failure    — a target failed at the transport layer (trap, nonzero
 *                      exit, timeout, unparseable output)
 */

import { canonical, isNum } from "./canonical";
import { fromJs, parseJsonBytes } from "./json";
import { predictEval, predictCheck } from "./oracle";
import { stableJson } from "../lib/files";

/** The wrapper leg re-encodes the envelope through JSON.stringify — the only
 * place the byte-level spelling survives into semantics is `fuel` (the
 * envelope's only u64-typed field). A float-spelled or out-of-range fuel
 * token cannot be faithfully re-encoded, so the wrapper leg is skipped there;
 * every other envelope shape round-trips. */
export function wrapperFaithful(bytes: Uint8Array): boolean {
  const parsed = parseJsonBytes(bytes);
  if (!parsed.ok || !(parsed.value instanceof Map)) return false;
  const fuel = parsed.value.get("fuel");
  if (fuel === undefined) return true;
  if (isNum(fuel)) return fuel.u64 !== null;
  return true; // non-number fuel re-encodes identically and rejects identically
}

export type TargetResponse =
  | { status: "ok"; text: string }
  | { status: "trap" | "bad-output" | "read-error" | "null-input" | "timeout" | "crashed" | "nonzero"; error: string };

export type Verdict = "agree" | "mismatch-oracle" | "mismatch-targets" | "mismatch-wrapper" | "wasm-transport" | "infra-failure" | "uncovered";

export type Comparison = {
  id: string;
  verdict: Verdict;
  axis: string;
  wasmClass: string;
  nativeClass: string | null;
  wrapperClass: string | null;
  oracleClass: string;
  detail: string;
};

/** Canonical response class for comparison: ok-value+fuel or err-code+fuel. */
export function classifyResponse(mode: "eval" | "check", text: string): { cls: string; canonical: string | null } | { cls: "malformed"; canonical: null } {
  let r: unknown;
  try { r = JSON.parse(text); } catch { return { cls: "malformed", canonical: null }; }
  if (r === null || typeof r !== "object" || Array.isArray(r)) return { cls: "malformed", canonical: null };
  const o = r as Record<string, unknown>;
  if (mode === "check") {
    if (o.ok === true) return { cls: "ok", canonical: null };
    if (o.ok === false && o.err && typeof o.err === "object" && typeof (o.err as Record<string, unknown>).code === "string") {
      return { cls: `err:${(o.err as { code: string }).code}`, canonical: null };
    }
    return { cls: "malformed", canonical: null };
  }
  if (o.ok === true && typeof o.fuel === "number" && Number.isInteger(o.fuel) && o.fuel >= 0 && o.fuel <= 1_000_000) {
    let canon: string | null = null;
    try { canon = canonical(fromJs(o.value)); } catch { canon = null; }
    return { cls: `ok:fuel=${o.fuel}`, canonical: canon };
  }
  if (o.ok === false && typeof o.fuel === "number" && o.err && typeof o.err === "object" && typeof (o.err as Record<string, unknown>).code === "string") {
    return { cls: `err:${(o.err as { code: string }).code}:fuel=${o.fuel}`, canonical: null };
  }
  return { cls: "malformed", canonical: null };
}

function oracleClass(mode: "eval" | "check", bytes: Uint8Array): { cls: string; canonical: string | null; exact: boolean } {
  if (mode === "check") {
    const p = predictCheck(bytes);
    if (p.ok === "uncovered") return { cls: "uncovered", canonical: null, exact: false };
    return { cls: p.ok ? "ok" : `err:${p.code}`, canonical: null, exact: true };
  }
  const p = predictEval(bytes);
  if (p.ok === "uncovered") return { cls: "uncovered", canonical: null, exact: false };
  if (p.ok === true) return { cls: `ok:fuel=${p.fuel}`, canonical: canonical(p.value), exact: true };
  return { cls: `err:${p.code}:fuel=${p.fuel}`, canonical: null, exact: true };
}

/** Deep-stable compare of a wrapper object against the raw boundary text. */
function wrapperCompare(mode: "eval" | "check", wrapper: unknown, rawText: string): boolean {
  let raw: unknown;
  try { raw = JSON.parse(rawText); } catch { return false; }
  return stableJson(wrapper) === stableJson(raw);
}

export function compareCase(
  mode: "eval" | "check",
  bytes: Uint8Array,
  wasm: TargetResponse,
  native: TargetResponse | null,
  wrapper: unknown,
  id = "?",
): Comparison {
  const oracle = oracleClass(mode, bytes);
  const wCls = wasm.status === "ok" ? classifyResponse(mode, wasm.text) : { cls: `transport:${wasm.status}`, canonical: null };
  const nCls = native === null ? null : native.status === "ok" ? classifyResponse(mode, native.text) : { cls: `transport:${native.status}`, canonical: null };
  let wrapCls: string | null = null;
  if (wrapper !== null && wrapper !== "skipped") {
    if (wrapper !== null && typeof wrapper === "object" && "threw" in wrapper) wrapCls = `wrapper-threw:${(wrapper as { threw: string }).threw.slice(0, 40)}`;
    else wrapCls = wasm.status === "ok" && wCls.cls !== "malformed" ? (wrapperCompare(mode, wrapper, wasm.text) ? "match" : "differ") : "unchecked";
  } else wrapCls = wrapper === "skipped" ? "skipped" : null;

  let verdict: Verdict = "agree";
  let axis = "none";
  let detail = "";

  if (wasm.status !== "ok") {
    verdict = wasm.status === "null-input" ? "wasm-transport" : "infra-failure";
    axis = wasm.status === "null-input" ? "wasm-transport" : "wasm";
    detail = `${wasm.status}: ${wasm.error.slice(0, 200)}`;
  } else if (wCls.cls === "malformed") {
    verdict = "infra-failure"; axis = "wasm"; detail = "malformed response envelope";
  } else if (native !== null && native.status !== "ok") {
    verdict = "infra-failure"; axis = "native"; detail = `${native.status}: ${native.error.slice(0, 200)}`;
  } else if (native !== null && nCls !== null && nCls.cls === "malformed") {
    verdict = "infra-failure"; axis = "native"; detail = "malformed response envelope";
  } else if (native !== null && wasm.status === "ok" && native.status === "ok" && wasm.text !== native.text) {
    verdict = "mismatch-targets"; axis = "wasm-vs-native";
    detail = `wasm ${wCls.cls} vs native ${nCls!.cls}`;
  } else if (oracle.exact) {
    const valueEq = wCls.canonical === null || oracle.canonical === null ? true : wCls.canonical === oracle.canonical;
    if (wCls.cls !== oracle.cls || !valueEq) {
      verdict = "mismatch-oracle"; axis = "wasm-vs-oracle";
      detail = `oracle ${oracle.cls}${oracle.canonical !== null ? ":" + oracle.canonical.slice(0, 60) : ""} vs wasm ${wCls.cls}${wCls.canonical !== null ? ":" + wCls.canonical.slice(0, 60) : ""}`;
    } else if (wrapCls === "differ") {
      verdict = "mismatch-wrapper"; axis = "wrapper-vs-boundary"; detail = "Bun wrapper response differs from the raw boundary bytes";
    }
  } else if (wrapCls === "differ") {
    verdict = "mismatch-wrapper"; axis = "wrapper-vs-boundary"; detail = "Bun wrapper response differs from the raw boundary bytes";
  }
  if (verdict === "agree" && !oracle.exact) verdict = "uncovered";
  return { id, verdict, axis, wasmClass: wCls.cls, nativeClass: nCls?.cls ?? null, wrapperClass: wrapCls, oracleClass: oracle.cls, detail };
}
