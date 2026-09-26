// Conformance case catalog: schema, admission, classification, and the
// authored corner/boundary tables. Fixed seeds live here; the seeded family
// body is produced by generate.ts.
//
// Case `expect` fields pin the *production* contract (they are the claim being
// tested — the committed WASM and the native driver must produce exactly this
// on the wire). `model` pins the independent-model relation:
//   "agree"          — the model must produce the same observable outcome
//                      (ok, canonical value, error code, fuel used);
//   "check-rejected" — production `check` rejects; the Lean model does not
//                      include static checking, so only wasm≡native bytes and
//                      the mirror-predicted code are asserted, plus `pin` if
//                      the model's own disposition is documented;
//   {…pin}           — an explicit expected model outcome, asserted exactly
//                      (used for the documented eval-vs-run asymmetry and the
//                      `quote` dispatch gap).
// Fuel numbers in `expect`/`model` are hand-derived from the charge rules in
// crates/algal-expr/src/lib.rs and Eval.lean; the suite re-verifies them
// against all three runtimes, so a wrong pin fails loudly.

import {
  admit, checkMirror, programOps, MODEL_GAP_OPS, UNMODELED_OPS,
  type MV,
} from "./model";

export interface Expected {
  ok: boolean;
  value?: unknown;   // canonicalized before comparison (object order irrelevant)
  code?: string;     // EXPR_* spelling
  fuel: number;
}
export type ModelPin =
  | "agree"
  | { ok: true; value?: unknown; used: number }
  | { ok: false; code: string; used: number };

export interface Case {
  contract: "algal.expr-conformance.v1";
  id: string;
  family: "seeded" | "corner" | "boundary" | "reject" | "unmodeled" | "gap";
  program: unknown;
  env: Record<string, unknown>;
  fuel: number;
  expect: Expected | null;   // null → seeded: expectation comes from wasm≡native bytes
  model: ModelPin;
  note?: string;
}

const mk = (
  id: string, family: Case["family"], program: unknown,
  env: Record<string, unknown> = {}, fuel = 10_000,
  expect: Expected | null = null, model: ModelPin = "agree", note?: string,
): Case => ({
  contract: "algal.expr-conformance.v1", id, family, program, env, fuel, expect, model,
  // `note` is optional in the case shape: omitting the key keeps the catalog
  // JSON-representable for the determinism fingerprint.
  ...(note === undefined ? {} : { note }),
});

const ok = (value: unknown, fuel: number): Expected => ({ ok: true, value, fuel });
const err = (code: string, fuel: number): Expected => ({ ok: false, code, fuel });
const mok = (value: unknown, used: number): ModelPin => ({ ok: true, value, used });
const merr = (code: string, used: number): ModelPin => ({ ok: false, code, used });

const str = (n: number): string => "x".repeat(n);
const notChain = (k: number): unknown => (k === 0 ? true : ["not", notChain(k - 1)]);
const nestedList = (n: number): unknown => (n === 0 ? null : [nestedList(n - 1)]);
const listOf = (v: unknown, n: number): unknown[] => Array.from({ length: n }, () => v);
const keyEnv = (n: number, fill: (k: string) => unknown = () => null): Record<string, unknown> =>
  Object.fromEntries(Array.from({ length: n }, (_, i) => [`k${String(i).padStart(3, "0")}`, fill(`k${String(i).padStart(3, "0")}`)]));

// ---------------------------------------------------------------- seeded ---

export const SEEDS = [1, 0x6d2b79f5, 0x9e3779b9, 0xffffffff, 0x2545f491, 0x1234567] as const;
export const SEEDED_PER_SEED = 14;

// ---------------------------------------------------------------- corner ---
// Hand-authored pins for the Lean model's proven corner cases, in
// three-way-agreement form where the modelled subset reaches them.

const ENV_BASIC: Record<string, unknown> = {
  n: 5, d: 2.5, s: "hello", t: "wörld", b: true,
  xs: [1, 2, 3], ss: ["a", "b"], ys: [1, "x", null],
  m: { "2": 1, "10": 2, a: "av", b: 4 },
  nested: { a: { b: [7, 8, 9] }, k: "kv" },
  pair: [10, 20], words: ["hi", "yo"], nn: [null],
  x: 9,
};

const CORNER: Case[] = [
  // — signed zero (JSON renders -0 as 0; the sign is unobservable on the wire,
  //   so agreement is on the rendered value and charge; the mirror's own unit
  //   tests in conformance.test.ts pin the -0 bit internally).
  mk("corner-mul-neg-zero", "corner", ["mul", -1, 0], {}, 10_000, ok(0, 4)),
  mk("corner-sub-zero", "corner", ["sub", 0, 0], {}, 10_000, ok(0, 4)),
  mk("corner-neg-zero", "corner", ["neg", 0], {}, 10_000, ok(0, 3)),
  mk("corner-eq-neg-zero", "corner", ["eq", ["mul", -1, 0], 0], {}, 10_000, ok(true, 9)),
  mk("corner-nth-neg-zero", "corner", ["nth", ["list", "first", "second"], ["mul", -1, 0]], {}, 10_000, ok("first", 9)),
  mk("corner-div-neg-zero-divisor", "corner", ["div", 1, ["mul", -1, 0]], {}, 10_000, err("EXPR_DIV_ZERO", 7)),
  // — fmin/fmax signed-zero ties (the model's proven tie rule; rendered "0").
  mk("corner-min-zero-tie", "corner", ["min", ["mul", -1, 0], 0], {}, 10_000, ok(0, 7)),
  mk("corner-max-zero-tie", "corner", ["max", ["mul", -1, 0], 0], {}, 10_000, ok(0, 7)),
  mk("corner-min-zero-zero", "corner", ["min", ["mul", -1, 0], ["mul", -1, 0]], {}, 10_000, ok(0, 10)),
  // — division by zero (positive and computed divisors).
  mk("corner-div-zero", "corner", ["div", 1, 0], {}, 10_000, err("EXPR_DIV_ZERO", 4)),
  mk("corner-div-zero-computed", "corner", ["div", 1, ["sub", 2, 2]], {}, 10_000, err("EXPR_DIV_ZERO", 7)),
  mk("corner-div-neg-underflow", "corner", ["div", -1, 1e308], {}, 10_000, ok(-1e-308, 4)),
  // — nonfinite rejection (EXPR_NUM).
  mk("corner-add-overflow", "corner", ["add", 1e308, 1e308], {}, 10_000, err("EXPR_NUM", 4)),
  mk("corner-mul-overflow", "corner", ["mul", 1e308, 2], {}, 10_000, err("EXPR_NUM", 4)),
  mk("corner-neg-no-overflow", "corner", ["neg", -1e308], {}, 10_000, ok(1e308, 3)),
  // — UTF-16 ordering: BMP vs surrogate-pair comparisons and no NFC.
  mk("corner-lt-bmp-astral", "corner", ["lt", "b", "😀"], {}, 10_000, ok(true, 4)),
  mk("corner-gt-astral-bmp", "corner", ["gt", "😀", "z"], {}, 10_000, ok(true, 4)),
  mk("corner-lt-accent-bmp", "corner", ["lt", "é", "z"], {}, 10_000, ok(false, 4)),
  mk("corner-eq-combining", "corner", ["eq", "é", "é"], {}, 10_000, ok(false, 6)),
  mk("corner-lte-eq-str", "corner", ["lte", "same", "same"], {}, 10_000, ok(true, 4)),
  mk("corner-gte-eq-str", "corner", ["gte", "same", "same"], {}, 10_000, ok(true, 4)),
  mk("corner-slen-astral", "corner", ["slen", "a😀é"], {}, 10_000, ok(4, 3)),
  // — canonical key order: array-index keys numerically first, then UTF-16.
  mk("corner-keys-order", "corner", ["keys", ["get", "m"]], ENV_BASIC, 10_000, ok(["2", "10", "a", "b"], 6)),
  mk("corner-values-order", "corner", ["values", ["get", "m"]], ENV_BASIC, 10_000, ok([1, 2, "av", 4], 6)),
  mk("corner-keys-literal", "corner", ["keys", { b: 1, "2": 2, "10": 3, a: 4 }], {}, 10_000, ok(["2", "10", "a", "b"], 7)),
  mk("corner-values-literal", "corner", ["values", { b: 1, "2": 2, "10": 3, a: 4 }], {}, 10_000, ok([2, 3, 4, 1], 7)),
  mk("corner-merge-order", "corner", ["merge", { b: 1 }, { a: 2, b: 3 }], {}, 10_000, ok({ a: 2, b: 3 }, 10)),
  mk("corner-merge-last-wins", "corner", ["merge", { a: 1 }, { a: 9 }, { a: 5, b: 2 }], {}, 10_000, ok({ a: 5, b: 2 }, 13)),
  // — equality: order-insensitive maps, structural lists, kind strictness.
  mk("corner-eq-map-order", "corner", ["eq", { a: 1, b: 2 }, { b: 2, a: 1 }], {}, 10_000, ok(true, 14)),
  mk("corner-neq-list", "corner", ["neq", ["list", 1, 2], ["list", 1, 3]], {}, 10_000, ok(true, 14)),
  mk("corner-eq-kind", "corner", ["eq", 0, "0"], {}, 10_000, ok(false, 6)),
  mk("corner-eq-num-bool", "corner", ["eq", 1, true], {}, 10_000, ok(false, 6)),
  // — concat order (variadic append order).
  mk("corner-concat-order", "corner", ["concat", ["list", 1, 2], ["list", 3], ["list"]], {}, 10_000, ok([1, 2, 3], 11)),
  mk("corner-sconcat-order", "corner", ["sconcat", "a", "😀", "b"], {}, 10_000, ok("a😀b", 11)),
  // — let scope restoration: siblings see the env binding, not the let.
  mk("corner-let-shadow", "corner", ["concat", ["let", "x", 1, ["list", ["get", "x"]]], ["list", ["get", "x"]]], ENV_BASIC, 10_000, ok([1, 9], 16)),
  mk("corner-let-nested-shadow", "corner",
    ["let", "n", 5, ["let", "n", ["mul", ["get", "n"], 2], ["add", ["get", "n"], 1]]], {}, 10_000, ok(11, 17)),
  mk("corner-let-body", "corner", ["let", "x", 1, ["get", "x"]], {}, 10_000, ok(1, 6)),
  // — map scope restoration: the binder dies with the map; env name survives.
  mk("corner-map-restore", "corner",
    ["concat", ["map", ["list", 1], "x", ["list", ["get", "x"]]], ["list", ["get", "x"]]], ENV_BASIC, 10_000, ok([[1], 9], 19)),
  mk("corner-map-shadow-env", "corner", ["map", ["get", "xs"], "xs", ["get", "xs"]], ENV_BASIC, 10_000, ok([1, 2, 3], 21)),
  mk("corner-filter-shadow", "corner", ["filter", ["get", "xs"], "it", ["gt", ["get", "it"], 1]], ENV_BASIC, 10_000, ok([2, 3], 30)),
  mk("corner-fold-acc", "corner", ["fold", ["get", "xs"], 0, "acc", "it", ["add", ["get", "acc"], ["get", "it"]]], ENV_BASIC, 10_000, ok(6, 40)),
  // — get path semantics: hits on null continue evaluating steps; misses stop.
  mk("corner-get-deep", "corner", ["get", "nested", "a", "b", 1], ENV_BASIC, 10_000, ok(8, 10)),
  mk("corner-get-miss-key", "corner", ["get", "m", "zzz"], ENV_BASIC, 10_000, ok(null, 6)),
  mk("corner-get-miss-index", "corner", ["get", "pair", 5], ENV_BASIC, 10_000, ok(null, 6)),
  mk("corner-get-null-hit-continues", "corner", ["get", "nn", 0, "k"], ENV_BASIC, 10_000, ok(null, 8)),
  mk("corner-get-null-hit-evals-step", "corner", ["get", "nn", 0, ["div", 1, 0]], ENV_BASIC, 10_000, err("EXPR_DIV_ZERO", 11)),
  mk("corner-get-scalar", "corner", ["get", "n", "k"], ENV_BASIC, 10_000, ok(null, 6)),
  mk("corner-get-computed-head", "corner", ["get", ["sconcat", "s", "s"]], ENV_BASIC, 10_000, ok(["a", "b"], 9)),
  // — lazy branches and short circuits (faulty branches never evaluated).
  mk("corner-if-lazy-then", "corner", ["if", true, 1, ["div", 1, 0]], {}, 10_000, ok(1, 3)),
  mk("corner-if-lazy-else", "corner", ["if", false, ["div", 1, 0], 7], {}, 10_000, ok(7, 3)),
  mk("corner-and-short", "corner", ["and", false, ["div", 1, 0]], {}, 10_000, ok(false, 2)),
  mk("corner-and-live-fault", "corner", ["and", true, ["div", 1, 0]], {}, 10_000, err("EXPR_DIV_ZERO", 6)),
  mk("corner-or-short", "corner", ["or", true, ["div", 1, 0]], {}, 10_000, ok(true, 2)),
  // — typed errors.
  mk("corner-type-add", "corner", ["add", "x", 1], {}, 10_000, err("EXPR_TYPE", 4)),
  mk("corner-type-len", "corner", ["len", "x"], {}, 10_000, err("EXPR_TYPE", 3)),
  mk("corner-type-nth", "corner", ["nth", ["list", 9], 1.5], {}, 10_000, err("EXPR_TYPE", 5)),
  mk("corner-type-if", "corner", ["if", 1, 2, 3], {}, 10_000, err("EXPR_TYPE", 2)),
  mk("corner-type-get-step", "corner", ["get", "m", null], ENV_BASIC, 10_000, err("EXPR_TYPE", 6)),
  mk("corner-arg-clamp", "corner", ["clamp", 1, 5, 2], {}, 10_000, err("EXPR_ARG", 5)),
  mk("corner-arg-split", "corner", ["split", "abc", ""], {}, 10_000, err("EXPR_ARG", 4)),
  mk("corner-path-nth", "corner", ["nth", ["list", 9, 8], 2], {}, 10_000, err("EXPR_PATH", 6)),
  // — clamp / jsRound / arithmetic corners.
  mk("corner-clamp-inside", "corner", ["clamp", 3, 1, 5], {}, 10_000, ok(3, 5)),
  mk("corner-clamp-lo", "corner", ["clamp", 0, 1, 5], {}, 10_000, ok(1, 5)),
  mk("corner-round-half", "corner", ["round", 2.5], {}, 10_000, ok(3, 3)),
  mk("corner-round-neg-half", "corner", ["round", -2.5], {}, 10_000, ok(-2, 3)),
  mk("corner-div-third", "corner", ["div", 1, 3], {}, 10_000, ok(1 / 3, 4)),
  mk("corner-take-saturate", "corner", ["take", ["list", 1, 2], 5], {}, 10_000, ok([1, 2], 6)),
  mk("corner-drop-all", "corner", ["drop", ["list", 1, 2], 9], {}, 10_000, ok([], 6)),
  mk("corner-flat-order", "corner", ["flat", ["list", ["list", 1], ["list", 2, 3]]], {}, 10_000, ok([1, 2, 3], 11)),
  mk("corner-unique-first-seen", "corner",
    ["unique", ["list", 1, 1, 2, "x", "x", null, null]], {}, 10_000, ok([1, 2, "x", null], 24)),
  mk("corner-contains-hit", "corner", ["contains", ["list", 1, 2], 2], {}, 10_000, ok(true, 8)),
  mk("corner-contains-miss", "corner", ["contains", ["list", 1, 2], "x"], {}, 10_000, ok(false, 8)),
  mk("corner-split-join", "corner", ["join", ["split", "a,b,c", ","], "|"], {}, 10_000, ok("a|b|c", 20)),
  mk("corner-split-edge", "corner", ["split", ",", ","], {}, 10_000, ok(["", ""], 7)),
  mk("corner-upper-ascii", "corner", ["upper", "héllo"], {}, 10_000, ok("HéLLO", 9)),
  mk("corner-lower-ascii", "corner", ["lower", "HÉLLO"], {}, 10_000, ok("hÉllo", 9)),
  mk("corner-trim", "corner", ["trim", "  pad  "], {}, 10_000, ok("pad", 10)),
  mk("corner-has", "corner", ["has", { a: 1 }, "a"], {}, 10_000, ok(true, 5)),
  mk("corner-has-miss", "corner", ["has", { a: 1 }, "z"], {}, 10_000, ok(false, 5)),
  mk("corner-isX", "corner", ["list", ["isText", "a"], ["isNum", 1], ["isList", ["list"]], ["isMap", {}], ["isNull", null], ["isBool", false]], {}, 10_000,
    ok([true, true, true, true, true, true], 13)),
  mk("corner-isX-negative", "corner", ["list", ["isText", 1], ["isNum", "a"], ["isBool", 0], ["isList", {}], ["isMap", ["list"]], ["isNull", 0]], {}, 10_000,
    ok([false, false, false, false, false, false], 13)),
  mk("corner-ends", "corner", ["ends", "algal", "gal"], {}, 10_000, ok(true, 9)),
  mk("corner-ends-miss", "corner", ["ends", "algal", "x"], {}, 10_000, ok(false, 9)),
  mk("corner-nth-zero", "corner", ["nth", ["list", 9, 8, 7], 0], {}, 10_000, ok(9, 7)),
  mk("corner-nth-neg-one", "corner", ["nth", ["list", 9, 8, 7], -1], {}, 10_000, err("EXPR_TYPE", 7)),
  mk("corner-empty-list-node", "corner", ["list"], {}, 10_000, ok([], 1)),
  mk("corner-empty-map-node", "corner", { a: 1 }, {}, 10_000, ok({ a: 1 }, 2)),
  mk("corner-scalar", "corner", 42, {}, 10_000, ok(42, 1)),
  mk("corner-null-scalar", "corner", null, {}, 10_000, ok(null, 1)),
];

// --------------------------------------------------------------- boundary --
// boundary-1 / boundary / boundary+1 against the declared limits in
// BOUNDS (model.ts) ≡ crates/algal-expr/src/lib.rs.

const ENV_SCONCAT = (b: number): Record<string, unknown> => ({ a: str(32768), b: str(b) });
const ENV_CONCAT = (n: number): Record<string, unknown> => ({ a: listOf(null, 512), b: listOf(null, n) });
const envBytesEnv = (delta: number): Record<string, unknown> => ({
  ...keyEnv(256, k => (k === "k255" ? str(1268 + delta) : str(1013))),
});
const ENV_BIGSTR = (n: number): Record<string, unknown> => ({ s: str(n) });
const ENV_DEEP = (n: number): Record<string, unknown> => ({ deep: nestedList(n) });
const splitEnv = (parts: number): Record<string, unknown> => ({ csv: listOf("x", parts).join(",") });

const BOUNDARY: Case[] = [
  // — fuel budget bound (MAX_FUEL = 1_000_000): under / at / over.
  mk("boundary-fuel-under", "boundary", true, {}, 999_999, ok(true, 1)),
  mk("boundary-fuel-at", "boundary", true, {}, 1_000_000, ok(true, 1)),
  mk("boundary-fuel-over", "boundary", true, {}, 1_000_001, err("EXPR_BOUNDS", 0)),
  mk("boundary-fuel-zero", "boundary", true, {}, 0, err("EXPR_FUEL", 0)),
  // — program depth (MAX_PROGRAM_DEPTH = 16, root at depth 1): 14/15 accept,
  //   16/17 reject. The wire rejects inside the static check; the model's
  //   run-level program-depth bound reports the identical observable outcome.
  mk("boundary-depth-14", "boundary", notChain(14), {}, 10_000, ok(true, 15)),
  mk("boundary-depth-15", "boundary", notChain(15), {}, 10_000, ok(false, 16)),
  mk("boundary-depth-16", "boundary", notChain(16), {}, 10_000, err("EXPR_BOUNDS", 0), merr("EXPR_BOUNDS", 0),
    "check-level rejection; the model's run-level depth bound reports the same code at fuel 0"),
  mk("boundary-depth-17", "boundary", notChain(17), {}, 10_000, err("EXPR_BOUNDS", 0), merr("EXPR_BOUNDS", 0)),
  // — program nodes (MAX_PROGRAM_NODES = 512): every JSON node counts,
  //   including the op-head text node — ["list", ...n scalars] is n+2 nodes,
  //   so 509/510 scalar args sit under/at the bound and 511 rejects.
  mk("boundary-nodes-511", "boundary", ["list", ...listOf(null, 509)], {}, 10_000, ok(listOf(null, 509), 510)),
  mk("boundary-nodes-512", "boundary", ["list", ...listOf(null, 510)], {}, 10_000, ok(listOf(null, 510), 511)),
  mk("boundary-nodes-513", "boundary", ["list", ...listOf(null, 511)], {}, 10_000, err("EXPR_BOUNDS", 0), merr("EXPR_BOUNDS", 0),
    "check-level node bound; the model's run-level node bound agrees on (code, fuel)"),
  // — program bytes (MAX_PROGRAM_BYTES = 16384): ["slen","x"*k] renders k+11.
  mk("boundary-bytes-under", "boundary", ["slen", str(16372)], {}, 10_000, ok(16372, 3)),
  mk("boundary-bytes-at", "boundary", ["slen", str(16373)], {}, 10_000, ok(16373, 3)),
  mk("boundary-bytes-over", "boundary", ["slen", str(16374)], {}, 10_000, err("EXPR_BOUNDS", 0), merr("EXPR_BOUNDS", 0),
    "check-level byte bound; the model's run-level byte bound agrees on (code, fuel)"),
  // — string-bytes (MAX_STRING_BYTES = 65536) vs output-bytes interaction:
  //   a produced string renders inside quotes, so a 65534-byte concat is the
  //   largest that still fits the 65536 output bound; at 65536 the string
  //   bound admits but the output render (65538) does not; at 65537 the
  //   string bound itself rejects before the byte charge lands.
  mk("boundary-str-under", "boundary", ["sconcat", ["get", "a"], ["get", "b"]], ENV_SCONCAT(32766), 100_000, ok(str(65534), 65544)),
  mk("boundary-str-at", "boundary", ["sconcat", ["get", "a"], ["get", "b"]], ENV_SCONCAT(32768), 100_000, err("EXPR_BOUNDS", 65546), "agree",
    "string-bytes admits 65536; the canonical render (quotes) exceeds output-bytes"),
  mk("boundary-str-over", "boundary", ["sconcat", ["get", "a"], ["get", "b"]], ENV_SCONCAT(32769), 10_000, err("EXPR_BOUNDS", 10)),
  // — list-len (MAX_LIST_LEN = 1024): concat total / split parts.
  mk("boundary-list-under", "boundary", ["concat", ["get", "a"], ["get", "b"]], ENV_CONCAT(511), 10_000, ok(listOf(null, 1023), 1033)),
  mk("boundary-list-at", "boundary", ["concat", ["get", "a"], ["get", "b"]], ENV_CONCAT(512), 10_000, ok(listOf(null, 1024), 1034)),
  mk("boundary-list-over", "boundary", ["concat", ["get", "a"], ["get", "b"]], ENV_CONCAT(513), 10_000, err("EXPR_BOUNDS", 1035)),
  mk("boundary-split-under", "boundary", ["split", ["get", "csv"], ","], splitEnv(1023), 10_000, ok(listOf("x", 1023), 3075)),
  mk("boundary-split-at", "boundary", ["split", ["get", "csv"], ","], splitEnv(1024), 10_000, ok(listOf("x", 1024), 3078)),
  mk("boundary-split-over", "boundary", ["split", ["get", "csv"], ","], splitEnv(1025), 10_000, err("EXPR_BOUNDS", 2056)),
  // — object-keys (MAX_OBJECT_KEYS = 256): env-level and eval-level.
  mk("boundary-objkeys-env-at", "boundary", ["get", "k000"], keyEnv(256), 10_000, ok(null, 4)),
  mk("boundary-objkeys-env-over", "boundary", ["get", "k000"], keyEnv(257), 10_000, err("EXPR_BOUNDS", 0)),
  mk("boundary-objkeys-prog-at", "boundary", keyEnv(256, () => 0), {}, 10_000, ok(keyEnv(256, () => 0), 257)),
  mk("boundary-objkeys-prog-over", "boundary", keyEnv(257, () => 0), {}, 10_000, err("EXPR_BOUNDS", 1)),
  // — env-bytes (MAX_ENV_BYTES = 262144): 256 keys of ~1KB strings tuned to
  //   exactly 262143 / 262144 / 262145 canonical env bytes.
  mk("boundary-envbytes-under", "boundary", ["get", "k255"], envBytesEnv(-1), 10_000, ok(str(1267), 4)),
  mk("boundary-envbytes-at", "boundary", ["get", "k255"], envBytesEnv(0), 10_000, ok(str(1268), 4)),
  mk("boundary-envbytes-over", "boundary", ["get", "k255"], envBytesEnv(1), 10_000, err("EXPR_BOUNDS", 0)),
  // — env value depth (map_depth ≤ 32 → member values ≤ 31).
  mk("boundary-envdepth-31", "boundary", ["get", "deep"], ENV_DEEP(31), 10_000, ok(nestedList(31), 4)),
  mk("boundary-envdepth-32", "boundary", ["get", "deep"], ENV_DEEP(32), 10_000, err("EXPR_BOUNDS", 0)),
  mk("boundary-envdepth-33", "boundary", ["get", "deep"], ENV_DEEP(33), 10_000, err("EXPR_BOUNDS", 0)),
  // — output value depth (MAX_VALUE_DEPTH = 32) via eval-produced wraps.
  mk("boundary-outdepth-32", "boundary", ["list", ["get", "deep"]], ENV_DEEP(31), 10_000, ok([nestedList(31)], 5)),
  mk("boundary-outdepth-33", "boundary", ["list", ["list", ["get", "deep"]]], ENV_DEEP(31), 10_000, err("EXPR_BOUNDS", 6)),
  // — output-bytes (MAX_OUTPUT_BYTES = 65536) on a canonical string render.
  mk("boundary-outbytes-at", "boundary", ["get", "s"], ENV_BIGSTR(65534), 10_000, ok(str(65534), 4)),
  mk("boundary-outbytes-over", "boundary", ["get", "s"], ENV_BIGSTR(65535), 10_000, err("EXPR_BOUNDS", 4)),
];

// ------------------------------------------------------------------ reject --
// check-level rejections: production answers fuel 0 with the typed code; the
// Lean model (no static pass) produces its own disposition — pinned exactly
// where it is informative about the eval-vs-run asymmetry.

const REJECT: Case[] = [
  mk("reject-arity-sub", "reject", ["sub", 5], {}, 10_000, err("EXPR_ARITY", 0), merr("EXPR_ARITY", 2),
    "model charges the op base cost before the arity check fires"),
  mk("reject-arity-add", "reject", ["add"], {}, 10_000, err("EXPR_ARITY", 0), merr("EXPR_ARITY", 2)),
  mk("reject-arity-let", "reject", ["let", "x", 1], {}, 10_000, err("EXPR_ARITY", 0), merr("EXPR_ARITY", 1)),
  mk("reject-op", "reject", ["frobnicate", 1], {}, 10_000, err("EXPR_OP", 0), merr("EXPR_OP", 2)),
  mk("reject-op-dead-branch", "reject", ["if", true, 1, ["frobnicate", 2]], {}, 10_000, err("EXPR_OP", 0), mok(1, 3),
    "check validates the dead branch; the model evaluates the live branch"),
  mk("reject-unbound-get", "reject", ["get", "zzz"], {}, 10_000, err("EXPR_PATH", 0), merr("EXPR_PATH", 4)),
  mk("reject-binder-shape-let", "reject", ["let", 5, 1, 2], {}, 10_000, err("EXPR_PARSE", 0), mok(2, 3),
    "production requires a literal identifier; the model binds the empty name"),
  mk("reject-binder-shape-map", "reject", ["map", ["list", 1], 9, ["get", "x"]], {}, 10_000,
    err("EXPR_PARSE", 0), merr("EXPR_PATH", 9),
    "model binds the empty name; the failing get charges base+head before the path error"),
  mk("reject-sibling-scope", "reject", ["concat", ["let", "x", 1, ["list", ["get", "x"]]], ["get", "x"]], {}, 10_000,
    err("EXPR_PATH", 0), merr("EXPR_PATH", 13),
    "the Lean scope-restoration witness: check rejects the sibling get outright"),
  mk("reject-let-value-unbound", "reject", ["let", "x", ["get", "x"], 1], {}, 10_000, err("EXPR_PATH", 0), merr("EXPR_PATH", 5)),
  mk("reject-head-number", "reject", [1, 2], {}, 10_000, err("EXPR_PARSE", 0), merr("EXPR_PARSE", 0),
    "malformed arrays fail identically in both: no charge, EXPR_PARSE"),
  mk("reject-head-empty", "reject", [], {}, 10_000, err("EXPR_PARSE", 0), merr("EXPR_PARSE", 0)),
  mk("reject-get-arity", "reject", ["get"], {}, 10_000, err("EXPR_ARITY", 0), merr("EXPR_ARITY", 2)),
];

// --------------------------------------------------------------- unmodeled --
// mod / sort / toText are real production ops the Lean model deliberately
// excludes (`EXPR_UNMODELED`). The suite asserts wasm≡native byte equality and
// that the mirror reports the model-only marker.

const UNMODELED: Case[] = [
  mk("unmodeled-mod", "unmodeled", ["mod", 7, 2], {}, 10_000, ok(1, 4), merr("EXPR_UNMODELED", 2)),
  mk("unmodeled-mod-neg", "unmodeled", ["mod", -7, 2], {}, 10_000, ok(-1, 4), merr("EXPR_UNMODELED", 2)),
  mk("unmodeled-mod-zero", "unmodeled", ["mod", 7, 0], {}, 10_000, err("EXPR_DIV_ZERO", 4), merr("EXPR_UNMODELED", 2),
    "production reaches DIV_ZERO at eval; the model rejects the op itself"),
  mk("unmodeled-sort", "unmodeled", ["sort", ["list", 3, 1, 2]], {}, 10_000, ok([1, 2, 3], 9), merr("EXPR_UNMODELED", 2)),
  mk("unmodeled-sort-str", "unmodeled", ["sort", ["list", "b", "😀", "a", "2", "10"]], {}, 10_000,
    ok(["10", "2", "a", "b", "😀"], 13), merr("EXPR_UNMODELED", 2)),
  mk("unmodeled-totext", "unmodeled", ["toText", ["list", 1, "x", null]], {}, 10_000, ok("[1,\"x\",null]", 18), merr("EXPR_UNMODELED", 2)),
  mk("unmodeled-totext-map", "unmodeled", ["toText", { b: 1, a: 2 }], {}, 10_000, ok("{\"a\":2,\"b\":1}", 18), merr("EXPR_UNMODELED", 2)),
  mk("unmodeled-totext-negzero", "unmodeled", ["toText", ["mul", -1, 0]], {}, 10_000, ok("0", 7), merr("EXPR_UNMODELED", 2)),
];

// -------------------------------------------------------------------- gap --
// `["quote", v]`: production evaluates the payload; the Lean dispatch has no
// quote arm and reports EXPR_OP — the discovered model/SCOPE divergence,
// pinned as an explicit relation rather than a silent exclusion.

const GAP: Case[] = [
  mk("gap-quote-list", "gap", ["quote", [1, "x", null]], {}, 10_000, ok([1, "x", null], 1), merr("EXPR_OP", 1)),
  mk("gap-quote-map", "gap", ["quote", { b: 1, a: 2 }], {}, 10_000, ok({ a: 2, b: 1 }, 1), merr("EXPR_OP", 1)),
  mk("gap-quote-under-nth", "gap", ["nth", ["quote", [9, 8]], 0], {}, 10_000, ok(9, 4), merr("EXPR_OP", 3)),
];

export const AUTHORED: Case[] = [...CORNER, ...BOUNDARY, ...REJECT, ...UNMODELED, ...GAP];

// ------------------------------------------------------------ seeded cases --

import { generate } from "./generate";

export function seededCatalog(): Case[] {
  const cases: Case[] = [];
  for (const seed of SEEDS) {
    for (let i = 0; i < SEEDED_PER_SEED; i++) {
      const g = generate(seed, i);
      cases.push(mk(
        `seed-${seed.toString(16)}-${i}`, "seeded", g.program, g.env, 10_000,
        null, "agree",
      ));
    }
  }
  return cases;
}

export function catalog(): Case[] {
  return [...AUTHORED, ...seededCatalog()];
}

// ------------------------------------------------------------ admission ----

export class CaseAdmissionError extends Error {
  constructor(id: string, why: string) { super(`${id}: ${why}`); this.name = "CaseAdmissionError"; }
}

export interface Admitted {
  case: Case;
  program: MV;
  env: Map<string, MV>;
  relation: "three-way" | "wasm-native";
}

/** Validate the case shape, admit program+env into the modelled domain, and
 *  classify: three-way agreement requires the check mirror to admit and the
 *  program to stay inside the modelled op set. */
export function admitCase(c: Case): Admitted {
  if (c.contract !== "algal.expr-conformance.v1") throw new CaseAdmissionError(c.id, "contract");
  const program = admit(c.program);
  const env = admit(c.env);
  if (!(env instanceof Map)) throw new CaseAdmissionError(c.id, "env must be an object");
  const check = checkMirror(program, Object.keys(c.env));
  const ops = programOps(program);
  const excluded = [...ops].some(op => UNMODELED_OPS.has(op) || MODEL_GAP_OPS.has(op));
  const relation: Admitted["relation"] = check.ok && !excluded ? "three-way" : "wasm-native";
  return { case: c, program, env, relation };
}
