// expr-abi — WASM loader boundary evidence for the committed module.
//
// Everything here is byte-level: requests are Uint8Array payloads handed to
// raw algal_eval / algal_check exports and to verification_boundary's
// eval|check file entry points. The expectations pin the closed response
// shape the boundary guarantees: {"ok":true,"value":…,"fuel":n} or
// {"err":{"code":EXPR_*},"fuel":n,"ok":false} — traps never escape, nulls are
// reported as typed EXPR_FAILED by the host, and malformed envelopes reject
// with fuel 0.
//
// These are ABI assertions, not evaluator-semantics assertions: the semantic
// agreement claims live in expr-conformance.

import { Random } from "./generate";

export const enc = (s: string): Uint8Array => new TextEncoder().encode(s);

export interface AbiExpectation {
  ok: boolean;
  /** The pinned EXPR_* code on failure, or the pinned canonical value on
   *  success (compared through canonical rendering, not wire text). */
  code?: string;
  value?: unknown;
  /** Exact fuel charge on eval responses; `null` = the response carries no
   *  fuel field (algal_check responses). */
  fuel: number | null;
}
const ok = (value: unknown, fuel: number | null): AbiExpectation =>
  ({ ok: true, value, fuel });
const err = (code: string, fuel: number | null = 0): AbiExpectation =>
  ({ ok: false, code, fuel });

export interface AbiCase {
  id: string;
  /** Request bytes as text (utf8) or raw bytes for invalid-UTF8 cases. */
  input: string | Uint8Array;
  expect: AbiExpectation;
  note?: string;
}

// ------------------------------------------------------ envelope fixtures --
// Hand-authored byte shapes exercising the request envelope contract.
// Every case is asserted wasm≡native byte-identical plus the pinned code.

export const ENVELOPE_CASES: AbiCase[] = [
  { id: "env-empty", input: "", expect: err("EXPR_PARSE"), note: "empty input" },
  { id: "env-ws-only", input: "  \n\t ", expect: err("EXPR_PARSE") },
  { id: "env-truncated", input: '{"program":true,"fuel":5', expect: err("EXPR_PARSE") },
  { id: "env-truncated-mid-string", input: '{"program":"abc', expect: err("EXPR_PARSE") },
  { id: "env-not-json", input: "not json", expect: err("EXPR_PARSE") },
  { id: "env-single-value", input: "5", expect: err("EXPR_PARSE"), note: "request doc must be an object" },
  { id: "env-array-doc", input: "[1,2]", expect: err("EXPR_PARSE") },
  { id: "env-null-doc", input: "null", expect: err("EXPR_PARSE") },
  { id: "env-bom", input: "﻿{\"program\":true}", expect: err("EXPR_PARSE"), note: "BOM is not skipped" },
  { id: "env-trailing-garbage", input: '{"program":true}xyz', expect: err("EXPR_PARSE") },
  { id: "env-trailing-ws", input: '{"program":true} \n', expect: ok(true, 1), note: "serde_json::from_slice accepts trailing whitespace; only non-whitespace garbage rejects" },
  { id: "env-missing-program", input: '{"env":{},"fuel":9}', expect: err("EXPR_PARSE") },
  { id: "env-empty-object", input: "{}", expect: err("EXPR_PARSE") },
  { id: "env-program-null", input: '{"program":null}', expect: ok(null, 1) },
  { id: "env-program-string", input: '{"program":"ok"}', expect: ok("ok", 1) },
  { id: "env-program-case-key", input: '{"Program":true}', expect: err("EXPR_PARSE"), note: "keys are case-sensitive" },
  { id: "env-dup-key-last-wins", input: '{"program":false,"program":true}', expect: ok(true, 1) },
  { id: "env-extra-keys-ignored", input: '{"program":true,"env":{},"fuel":7,"extra":{"n":1},"junk":[1,2]}', expect: ok(true, 1) },
  { id: "env-env-number", input: '{"program":["get","x"],"env":5}', expect: err("EXPR_PATH"),
    note: "non-object env silently defaults to {}" },
  { id: "env-env-array", input: '{"program":["get","x"],"env":[1,2]}', expect: err("EXPR_PATH") },
  { id: "env-env-null", input: '{"program":["get","x"],"env":null}', expect: err("EXPR_PATH") },
  { id: "env-env-string", input: '{"program":["get","x"],"env":"x"}', expect: err("EXPR_PATH") },
  // fuel field: strict u64 admission — the integral spelling matters.
  { id: "env-fuel-absent-default", input: '{"program":["add",1,2]}', expect: ok(3, 4) },
  { id: "env-fuel-explicit-default", input: '{"program":["add",1,2],"fuel":10000}', expect: ok(3, 4) },
  { id: "env-fuel-zero", input: '{"program":true,"fuel":0}', expect: err("EXPR_FUEL") },
  { id: "env-fuel-float-spelling", input: '{"program":true,"fuel":1e4}', expect: err("EXPR_BOUNDS"),
    note: "serde as_u64 rejects float spellings even when integral" },
  { id: "env-fuel-integral-float", input: '{"program":true,"fuel":5.0}', expect: err("EXPR_BOUNDS") },
  { id: "env-fuel-negative", input: '{"program":true,"fuel":-1}', expect: err("EXPR_BOUNDS") },
  { id: "env-fuel-string", input: '{"program":true,"fuel":"100"}', expect: err("EXPR_BOUNDS") },
  { id: "env-fuel-null", input: '{"program":true,"fuel":null}', expect: err("EXPR_BOUNDS") },
  { id: "env-fuel-u64-max", input: '{"program":true,"fuel":18446744073709551615}', expect: err("EXPR_BOUNDS") },
  { id: "env-fuel-max", input: '{"program":true,"fuel":1000000}', expect: ok(true, 1) },
  { id: "env-fuel-over-max", input: '{"program":true,"fuel":1000001}', expect: err("EXPR_BOUNDS") },
  { id: "env-fuel-under-need", input: '{"program":["add",1,2],"fuel":3}', expect: err("EXPR_FUEL", 3) },
  { id: "env-fuel-at-need", input: '{"program":["add",1,2],"fuel":4}', expect: ok(3, 4) },
  // deep nesting at the JSON parser level (serde recursion bound).
  { id: "env-deep-doc", input: `{"program":${"[".repeat(512) + "]".repeat(512)}}`, expect: err("EXPR_PARSE") },
  // number spellings that leave the finite domain.
  { id: "env-num-huge-exp", input: '{"program":1e400}', expect: err("EXPR_PARSE"),
    note: "serde_json refuses nonfinite number literals" },
  { id: "env-num-negative-zero", input: '{"program":-0}', expect: ok(0, 1) },
  { id: "env-nan-literal", input: '{"program":NaN}', expect: err("EXPR_PARSE") },
  // escaped surrogate handling at the JSON boundary.
  { id: "env-lone-high-surrogate", input: '{"program":"\\ud800"}', expect: err("EXPR_PARSE") },
  { id: "env-lone-low-surrogate", input: '{"program":"\\udfff"}', expect: err("EXPR_PARSE") },
  { id: "env-surrogate-pair", input: '{"program":"\\ud800\\udfff"}', expect: ok("\u{103ff}", 1),
    note: "D800+DFFF decodes to U+103FF — the pair arithmetic, not a glyph pin" },
  // invalid UTF-8 bytes — raw bytes, not text.
  { id: "env-invalid-utf8", input: Uint8Array.from([0x7b, 0x22, 0x70, 0x72, 0x6f, 0x67, 0x72, 0x61, 0x6d, 0x22, 0x3a, 0x22, 0xff, 0xfe, 0x22, 0x7d]), expect: err("EXPR_PARSE") },
  { id: "env-invalid-utf8-prefix", input: Uint8Array.from([0xff, 0x7b, 0x7d]), expect: err("EXPR_PARSE") },
];

export const CHECK_CASES: AbiCase[] = [
  { id: "check-empty", input: "", expect: err("EXPR_PARSE"),
    note: "request-level parse errors carry fuel 0 even on the check lane" },
  { id: "check-missing-program", input: '{"names":[]}', expect: err("EXPR_PARSE") },
  { id: "check-ok", input: '{"program":["get","x"],"names":["x"]}', expect: ok(true, null) },
  { id: "check-unbound", input: '{"program":["get","x"],"names":[]}', expect: { ok: false, code: "EXPR_PATH", fuel: null },
    note: "check verdicts carry no fuel field at all" },
  { id: "check-names-not-array", input: '{"program":["get","x"],"names":"x"}', expect: { ok: false, code: "EXPR_PATH", fuel: null },
    note: "non-array names default to empty scope" },
  { id: "check-names-nonstring-filtered", input: '{"program":["get","x"],"names":["x",5,null]}', expect: ok(true, null),
    note: "non-string names are dropped, not errors" },
  { id: "check-names-dup", input: '{"program":["get","x"],"names":["x","x"]}', expect: ok(true, null) },
  { id: "check-extra-keys", input: '{"program":true,"names":[],"extra":1}', expect: ok(true, null) },
];

// ------------------------------------------------ seeded byte mutation ----
// Deterministic fuzz over a valid request: truncations, byte flips, NUL
// injections and UTF-8 boundary corruption. Every mutation must fail closed
// (a typed response — EXPR_* or a well-formed ok — never a crash) and agree
// byte-for-byte between the WASM and native boundary drivers.

export interface Mutation { id: string; bytes: Uint8Array; kind: string }

export function mutations(base: Uint8Array, seed: number, count: number): Mutation[] {
  const rng = new Random(seed);
  const out: Mutation[] = [];
  let i = 0;
  while (out.length < count && i < count * 4) {
    i++;
    const kind = rng.below(6);
    const m = base.slice();
    let label: string;
    switch (kind) {
      case 0: { // truncate
        const n = 1 + rng.below(m.length);
        out.push({ id: `mut-${out.length}-trunc-${n}`, bytes: m.slice(0, n), kind: "truncate" });
        continue;
      }
      case 1: { // flip a byte
        const at = rng.below(m.length);
        m[at] = m[at]! ^ 0xff;
        label = `flip-${at}`;
        break;
      }
      case 2: { // NUL injection
        const at = rng.below(m.length);
        m[at] = 0;
        label = `nul-${at}`;
        break;
      }
      case 3: { // UTF-8 corruption
        const at = rng.below(m.length);
        m[at] = 0xff;
        label = `utf8-${at}`;
        break;
      }
      case 4: { // zero a numeric digit
        const digits = [...m].map((b, j) => (b >= 48 && b <= 57 ? j : -1)).filter(j => j >= 0);
        if (digits.length === 0) continue;
        const at = digits[rng.below(digits.length)]!;
        m[at] = 0x30;
        label = `digit-${at}`;
        break;
      }
      default: { // splice: cut a span
        const a = rng.below(m.length), b2 = a + rng.below(Math.min(24, m.length - a));
        const spliced = new Uint8Array([...m.slice(0, a), ...m.slice(b2)]);
        out.push({ id: `mut-${out.length}-splice-${a}-${b2}`, bytes: spliced, kind: "splice" });
        continue;
      }
    }
    out.push({ id: `mut-${out.length}-${label}`, bytes: m, kind: label.split("-")[0]! });
  }
  return out;
}
