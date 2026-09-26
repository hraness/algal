/**
 * verify/differential/cases.ts — the differential case catalog. Fixed
 * enumeration of hostile byte spellings plus seeded program generation:
 *
 *   raw-*    byte-level envelope edges (invalid UTF-8, lone surrogates,
 *            duplicate/unknown/prototype keys, number spellings, whitespace,
 *            structural truncations, top-level non-envelopes, depth limits)
 *   bound-*  boundary-1 / boundary / boundary+1 for every evaluator limit
 *   sem-*    semantic probes (UTF-16 vs UTF-8 ordering, get-path edges,
 *            index-key limits, merge/keys order, fuel accounting)
 *   gen-*    seeded generated programs over the full op table
 *   check-*  check-mode admission surface
 *
 * Every case is a self-contained byte fixture; the oracle predicts a class
 * or the full canonical response. `wrapper` flags cases eligible for the
 * Bun evalProgram/checkProgram leg (JS-representable envelopes).
 */

import { genProgram, genValue, renderEnvelope } from "./gen";
import { Rng } from "./prng";
import type { JVal } from "./json";

export type Case = {
  id: string;
  mode: "eval" | "check";
  bytes: Uint8Array;
  note: string;
  wrapper: boolean;
};

const enc = new TextEncoder();
const num = (v: number): JVal => ({ kind: "num", f64: v, u64: Number.isSafeInteger(v) && v >= 0 ? BigInt(v) : null });
const raw = (id: string, note: string, bytes: string | Uint8Array, mode: "eval" | "check" = "eval"): Case =>
  ({ id, mode, bytes: typeof bytes === "string" ? enc.encode(bytes) : bytes, note, wrapper: false });
const prog = (id: string, note: string, program: JVal, extra: Record<string, JVal> = {}, mode: "eval" | "check" = "eval", wrapper = true): Case => {
  const doc = new Map<string, JVal>();
  doc.set("program", program);
  for (const [k, v] of Object.entries(extra)) doc.set(k, v);
  const parts = [...doc.entries()].map(([k, v]) => `${JSON.stringify(k)}:${renderJVal(v)}`).join(",");
  return { id, mode, bytes: enc.encode(`{${parts}}`), note, wrapper };
};
function renderJVal(v: JVal): string {
  if (v === null) return "null";
  if (typeof v === "boolean") return v ? "true" : "false";
  if (typeof v === "string") return JSON.stringify(v);
  if (Array.isArray(v)) return `[${v.map(renderJVal).join(",")}]`;
  if ("f64" in v) {
    const spelled = JSON.stringify(v.f64);
    if (spelled === undefined) throw new Error("non-finite number cannot be spelled");
    return spelled;
  }
  return `{${[...v.entries()].map(([k, x]) => `${JSON.stringify(k)}:${renderJVal(x)}`).join(",")}}`;
}

export function catalog(seedStream: readonly number[]): Case[] {
  const out: Case[] = [];
  const seen = new Set<string>();
  const add = (c: Case): void => {
    if (seen.has(c.id)) throw new Error(`duplicate case id ${c.id}`);
    seen.add(c.id);
    out.push(c);
  };
  const dedupBytes = new Set<string>();
  const addDedup = (c: Case): void => {
    const key = Buffer.from(c.bytes).toString("base64") + c.mode;
    if (dedupBytes.has(key)) return;
    dedupBytes.add(key);
    add(c);
  };

  // ------------------------------------------------------------- raw edges ---
  const rawText = (id: string, note: string, text: string) => add(raw(id, note, text));
  const rawBytes = (id: string, note: string, bytes: Uint8Array) => add(raw(id, note, bytes));

  rawText("raw-empty", "empty input", "");
  rawText("raw-ws-only", "whitespace only", "  \n\t\r ");
  rawText("raw-null", "top-level null has no program", "null");
  rawText("raw-bool", "top-level bool has no program", "true");
  rawText("raw-num", "top-level number has no program", "42");
  rawText("raw-str", "top-level string has no program", "\"x\"");
  rawText("raw-arr", "top-level array has no program", "[\"program\",true]");
  rawText("raw-obj-empty", "empty object lacks program", "{}");
  rawText("raw-prog-absent-env-only", "env without program", "{\"env\":{\"x\":1}}");
  rawText("raw-trailing-garbage", "trailing bytes after document", "{\"program\":true} x");
  rawText("raw-trailing-doc", "second document after first", "{\"program\":true}{\"program\":false}");
  rawText("raw-trailing-comma-obj", "object trailing comma", "{\"program\":true,}");
  rawText("raw-trailing-comma-arr", "array trailing comma", "{\"program\":[\"add\",1,2,]}");
  rawText("raw-double-comma", "doubled comma", "{\"program\":[1,,2]}");
  rawText("raw-missing-colon", "missing colon", "{\"program\" true}");
  rawText("raw-missing-comma-obj", "missing object comma", "{\"a\":1 \"b\":2}");
  rawText("raw-bare-key", "unquoted object key", "{program:true}");
  rawText("raw-key-num", "numeric object key", "{1:2}");
  rawText("raw-unclosed-obj", "unclosed object", "{\"program\":true");
  rawText("raw-unclosed-arr", "unclosed array", "{\"program\":[\"add\",1,2}");
  rawText("raw-unclosed-str", "unterminated string", "{\"program\":\"abc}");
  rawText("raw-extra-close", "extra closing bracket", "{\"program\":true}}");
  rawText("raw-swap-brackets", "mismatched closers", "{\"program\":[\"add\",1,2}]");
  rawText("raw-bom-prefix", "BOM before document", "﻿{\"program\":true}");
  rawText("raw-bom-mid", "BOM char inside string is data", "{\"program\":\"x﻿y\"}");
  const spliceByte = (pre: string, insert: number, post: string): Uint8Array => {
    const p = enc.encode(pre), q = enc.encode(post);
    const r = new Uint8Array(p.length + 1 + q.length);
    r.set(p); r[p.length] = insert; r.set(q, p.length + 1);
    return r;
  };
  rawBytes("raw-nul-inside", "raw NUL byte in string", spliceByte("{\"program\":\"a", 0x00, "b\"}"));
  rawText("raw-nul-escape", "escaped NUL in string", "{\"program\":\"a\\u0000b\"}");
  rawBytes("raw-del-raw", "raw DEL byte is string data", spliceByte("{\"program\":\"a", 0x7f, "b\"}"));
  rawText("raw-vtab-ws", "vertical tab is not JSON ws", "{\"program\"\x0b:\x0btrue}");
  rawText("raw-ff-ws", "form feed is not JSON ws", "{\"program\"\x0c:\x0ctrue}");
  rawText("raw-tab-ws", "tab ws admitted", "{\"program\"\t:\ttrue}");
  rawText("raw-allws", "all four JSON ws bytes", "{ \t\r\n\"program\" \t:\r\n\t true \r\n}");
  rawText("raw-nbsp-ws", "NBSP is not JSON ws", "{\"program\" :true}");
  rawText("raw-single-quote", "single-quoted string", "{'program':true}");
  rawText("raw-literal-caps", "True is not a literal", "{\"program\":True}");
  rawText("raw-literal-t", "bare t literal fragment", "{\"program\":t}");
  rawBytes("raw-nul-after", "NUL byte after document", spliceByte("{\"program\":true}", 0x00, ""));
  rawBytes("raw-ctrl-01", "raw control byte in string", spliceByte("{\"program\":\"a", 0x01, "b\"}"));
  rawBytes("raw-del-byte", "raw DEL byte again", spliceByte("{\"program\":\"a", 0x7f, "b\"}"));

  // Invalid UTF-8 families — each alone inside the program string position.
  const utf8Invalid: [string, number[]][] = [
    ["u8-lone-cont", [0x80]],
    ["u8-lone-cont-hi", [0xbf]],
    ["u8-overlong-2", [0xc0, 0x80]],
    ["u8-overlong-2b", [0xc1, 0xbf]],
    ["u8-overlong-3", [0xe0, 0x80, 0x80]],
    ["u8-overlong-4", [0xf0, 0x80, 0x80, 0x80]],
    ["u8-truncated-2", [0xc2]],
    ["u8-truncated-3", [0xe1, 0x80]],
    ["u8-truncated-4", [0xf0, 0x90, 0x80]],
    ["u8-surrogate-lo", [0xed, 0xa0, 0x80]],
    ["u8-surrogate-hi", [0xed, 0xbf, 0xbf]],
    ["u8-max-plus", [0xf4, 0x90, 0x80, 0x80]],
    ["u8-lead-f5", [0xf5, 0x80, 0x80, 0x80]],
    ["u8-lead-fe", [0xfe]],
    ["u8-lead-ff", [0xff]],
    ["u8-bad-cont", [0xe2, 0x28, 0xa1]],
  ];
  for (const [id, bytes] of utf8Invalid) {
    const pre = enc.encode("{\"program\":\"a"), post = enc.encode("b\"}");
    const buf = new Uint8Array(pre.length + bytes.length + post.length);
    buf.set(pre); buf.set(bytes, pre.length); buf.set(post, pre.length + bytes.length);
    rawBytes(`raw-${id}`, "invalid UTF-8 inside string", buf);
  }
  // Valid UTF-8 edges that must be admitted.
  const utf8Valid: [string, string][] = [
    ["u8-2byte-max", "{" + "\"program\":\"\\u07ff\"}"],
    ["u8-3byte-bmp", "{\"program\":\"￿\"}"],
    ["u8-astral", "{\"program\":\"𐀀😀\"}"],
    ["u8-nonchar", "{\"program\":\"\"}"],
    ["u8-combining", "{\"program\":\"é\"}"],
  ];
  for (const [id, t] of utf8Valid) rawText(`raw-${id}`, "admitted UTF-8 edge", t);

  // Lone surrogate and paired escapes.
  const surrogateEscapes: [string, string][] = [
    ["surr-lone-hi", "{\"program\":\"\\ud800\"}"],
    ["surr-lone-hi-ff", "{\"program\":\"\\udbff\"}"],
    ["surr-lone-lo", "{\"program\":\"\\udc00\"}"],
    ["surr-lone-lo-ff", "{\"program\":\"\\udfff\"}"],
    ["surr-pair-valid", "{\"program\":\"\\ud83d\\ude00\"}"],
    ["surr-pair-min", "{\"program\":\"\\ud800\\udc00\"}"],
    ["surr-pair-max", "{\"program\":\"\\udbff\\udfff\"}"],
    ["surr-hi-hi", "{\"program\":\"\\ud800\\ud800\"}"],
    ["surr-hi-bmp", "{\"program\":\"\\ud800A\"}"],
    ["surr-hi-esc-bmp", "{\"program\":\"\\ud800\\u0041\"}"],
    ["surr-escaped-backslash", "{\"program\":\"\\\\ud800\"}"],
    ["surr-in-env-key", "{\"program\":[\"get\",\"x\"],\"env\":{\"\\ud800\":1}}"],
    ["surr-in-env-val", "{\"program\":true,\"env\":{\"x\":\"\\udfff\"}}"],
    ["surr-in-names", "{\"program\":[\"get\",\"x\"],\"names\":[\"\\ud800\"]}", ],
  ];
  for (const [id, t] of surrogateEscapes) rawText(`raw-${id}`, "surrogate escape edge", t);

  // Duplicate and prototype keys at each level.
  rawText("raw-dup-envelope", "duplicate program key last-wins", "{\"program\":false,\"program\":true}");
  rawText("raw-dup-envelope-type", "duplicate program changes type", "{\"program\":[1,2],\"program\":true}");
  rawText("raw-dup-env", "duplicate env key last-wins", "{\"program\":[\"get\",\"x\"],\"env\":{\"x\":1,\"x\":2}}");
  rawText("raw-dup-env-swallow", "duplicate env key drops object", "{\"program\":[\"get\",\"x\"],\"env\":{\"x\":{\"a\":1},\"x\":7}}");
  rawText("raw-dup-prog-obj", "duplicate key inside object program", "{\"program\":{\"a\":1,\"a\":2}}");
  rawText("raw-dup-nested", "duplicate key in nested literal", "{\"program\":{\"a\":{\"k\":1,\"k\":2}}}");
  rawText("raw-dup-fuel", "duplicate fuel key last-wins", "{\"program\":true,\"fuel\":1,\"fuel\":0}");
  rawText("raw-unknown-keys", "unknown envelope keys ignored", "{\"program\":true,\"zz\":1,\"__proto__\":9,\"extra\":{\"x\":[]}}");
  rawText("raw-proto-env", "__proto__ as env key is data", "{\"program\":[\"get\",\"__proto__\"],\"env\":{\"__proto__\":7}}");
  rawText("raw-proto-env-nested", "nested __proto__ value is data", "{\"program\":[\"get\",\"e\",\"__proto__\"],\"env\":{\"e\":{\"__proto__\":8}}}");
  rawText("raw-proto-prog", "__proto__ as object-program key", "{\"program\":{\"__proto__\":1,\"a\":2}}");
  rawText("raw-proto-constructor", "constructor/prototype keys are data", "{\"program\":[\"keys\",[\"quote\",{\"constructor\":1,\"prototype\":2,\"__proto__\":3}]]}");
  rawText("raw-proto-binder", "__proto__ is a valid binder", "{\"program\":[\"let\",\"__proto__\",5,[\"get\",\"__proto__\"]]}");
  rawText("raw-ho-proto-get", "prototype-ish get names", "{\"program\":[\"get\",\"constructor\"],\"env\":{\"constructor\":{\"prototype\":9}}}");
  rawText("raw-escaped-key", "escaped key equals unescaped", "{\"program\":[\"get\",\"é\"],\"env\":{\"\\u00e9\":5}}");
  rawText("raw-escape-solidus", "escaped solidus in key", "{\"program\":[\"get\",\"a/b\"],\"env\":{\"a\\/b\":1}}");
  rawText("raw-env-empty-key", "empty env key is a name", "{\"program\":[\"get\",\"\"],\"env\":{\"\":3}}");
  rawText("raw-env-empty", "empty env object", "{\"program\":true,\"env\":{}}");

  // Envelope type confusions.
  const typeConfusions: [string, string][] = [
    ["env-null", "{\"program\":true,\"env\":null}"],
    ["env-array", "{\"program\":true,\"env\":[1,2]}"],
    ["env-str", "{\"program\":true,\"env\":\"x\"}"],
    ["env-num", "{\"program\":true,\"env\":42}"],
    ["env-bool", "{\"program\":true,\"env\":true}"],
    ["fuel-str", "{\"program\":true,\"fuel\":\"5\"}"],
    ["fuel-bool", "{\"program\":true,\"fuel\":true}"],
    ["fuel-null", "{\"program\":true,\"fuel\":null}"],
    ["fuel-arr", "{\"program\":true,\"fuel\":[5]}"],
    ["fuel-obj", "{\"program\":true,\"fuel\":{\"x\":5}}"],
  ];
  for (const [id, t] of typeConfusions) rawText(`raw-${id}`, "envelope field type confusion", t);

  // Number spellings — each admitted or rejected per strict grammar.
  const nums: [string, string][] = [
    ["num-int", "{\"program\":42}"], ["num-neg", "{\"program\":-42}"], ["num-zero", "{\"program\":0}"],
    ["num-neg0-int", "{\"program\":-0}"], ["num-neg0-float", "{\"program\":-0.0}"],
    ["num-frac", "{\"program\":0.5}"], ["num-frac-neg", "{\"program\":-2.5}"],
    ["num-exp", "{\"program\":1e2}"], ["num-exp-cap", "{\"program\":1E2}"],
    ["num-exp-neg", "{\"program\":1.5e-3}"], ["num-exp-plus", "{\"program\":1e+2}"],
    ["num-leading-zero", "{\"program\":01}"], ["num-neg-leading-zero", "{\"program\":-01}"],
    ["num-plus", "{\"program\":+1}"], ["num-dot-lead", "{\"program\":.5}"],
    ["num-dot-trail", "{\"program\":1.}"], ["num-hex", "{\"program\":0x10}"],
    ["num-nan", "{\"program\":NaN}"], ["num-inf", "{\"program\":Infinity}"],
    ["num-neg-inf", "{\"program\":-Infinity}"], ["num-exp-empty", "{\"program\":1e}"],
    ["num-exp-sign-empty", "{\"program\":1e+}"], ["num-double-neg", "{\"program\":--1}"],
    ["num-dot-exp", "{\"program\":1.e3}"], ["num-zero-frac", "{\"program\":0.0}"],
    ["num-u64-max", "{\"program\":18446744073709551615}"],
    ["num-u64-over", "{\"program\":18446744073709551616}"],
    ["num-i64-min", "{\"program\":-9223372036854775808}"],
    ["num-i64-under", "{\"program\":-9223372036854775809}"],
    ["num-safe-max", "{\"program\":9007199254740991}"],
    ["num-safe-plus1", "{\"program\":9007199254740992}"],
    ["num-safe-plus2", "{\"program\":9007199254740993}"],
    ["num-neg-safe", "{\"program\":-9007199254740993}"],
    ["num-f64-max", "{\"program\":1.7976931348623157e308}"],
    ["num-f64-over", "{\"program\":1e309}"], ["num-f64-neg-over", "{\"program\":-1e309}"],
    ["num-subnormal-min", "{\"program\":5e-324}"], ["num-subnormal-under", "{\"program\":1e-324}"],
    ["num-subnormal-round", "{\"program\":4.9e-324}"], ["num-norm-min", "{\"program\":2.2250738585072014e-308}"],
    ["num-norm-below", "{\"program\":2.2250738585072009e-308}"],
    ["num-1e21", "{\"program\":1e21}"], ["num-1e20", "{\"program\":1e20}"],
    ["num-big-digits", `{"program":${"7".repeat(300)}}`],
    ["num-exp-huge-digits", "{\"program\":1e999999999999999999999}"],
    ["num-frac-many", `{"program":0.${"1".repeat(320)}}`],
    ["num-ws-inside", "{\"program\":1 2}"],
  ];
  for (const [id, t] of nums) rawText(`raw-${id}`, "number spelling edge", t);

  // Number spellings in fuel position.
  const fuelNums: [string, string][] = [
    ["fuel-0", "0"], ["fuel-1", "1"], ["fuel-max", "1000000"], ["fuel-over", "1000001"],
    ["fuel-neg", "-1"], ["fuel-neg0", "-0"], ["fuel-frac", "100.0"], ["fuel-exp", "1e2"],
    ["fuel-u64max", "18446744073709551615"], ["fuel-u64over", "18446744073709551616"],
    ["fuel-huge", "1e309"], ["fuel-str-num", "\"5\""],
  ];
  for (const [id, v] of fuelNums) rawText(`raw-${id}`, "fuel spelling edge", `{"program":true,"fuel":${v}}`);

  // Depth edges — JSON container limit and program-depth limit.
  const depthCases: [string, number, string][] = [
    ["depth-cont-125", 125, "ok"], ["depth-cont-126", 126, "ok"],
    ["depth-cont-127", 127, "boundary"], ["depth-cont-128", 128, "reject"],
    ["depth-cont-129", 129, "reject"],
  ];
  for (const [id, d, _note] of depthCases) {
    const bytes = enc.encode(`{"program":${"[".repeat(d)}1${"]".repeat(d)}}`);
    rawBytes(`raw-${id}`, `JSON container depth ${d}`, bytes);
  }
  // program-depth via nested arithmetic (depth 15/16/17 at program level).
  for (const d of [15, 16, 17]) {
    let p: JVal = num(1);
    for (let i = 0; i < d - 1; i++) p = ["add", num(0), p];
    add(prog(`bound-prog-depth-${d}`, `program depth ${d}`, p));
  }

  // --------------------------------------------------------------- bounds ---
  const pad = (n: number): JVal => "x".repeat(n);
  // program-bytes: canonical ["quote","x"*n] = n+12 → boundary 16384.
  for (const [d, n] of [[16383, 16371], [16384, 16372], [16385, 16373]] as const) {
    add(prog(`bound-prog-bytes-${d}`, `program canonical bytes ${d}`, ["quote", pad(n)]));
  }
  // program-nodes: ["list", 0*k] has 1+k nodes → boundary 512.
  for (const [d, k] of [[511, 510], [512, 511], [513, 512]] as const) {
    add(prog(`bound-prog-nodes-${d}`, `program nodes ${d}`, ["list", ...Array.from({ length: k }, () => num(0))]));
  }
  // env object-keys: boundary 256.
  for (const [d, k] of [[255, 255], [256, 256], [257, 257]] as const) {
    const env2 = new Map<string, JVal>();
    for (let i = 0; i < k - 1; i++) env2.set(`k${i}`, num(0));
    env2.set("x", num(7));
    add(prog(`bound-env-keys-${d}`, `env has ${k} keys`, ["get", "x"], { env: env2 }));
  }
  // env-bytes: env {"x":"y"*n} canonical = n+8 → boundary 262144.
  for (const [d, n] of [[262143, 262135], [262144, 262136], [262145, 262137]] as const) {
    add(prog(`bound-env-bytes-${d}`, `env canonical bytes ${d}`, ["get", "x"], { env: new Map([["x", pad(n)]]) }));
  }
  // env value depth (map_depth = 1 + value depth): boundary value-depth 32.
  for (const [d, n] of [[31, 30], [32, 31], [33, 32]] as const) {
    let v: JVal = num(0);
    for (let i = 0; i < n; i++) v = [v];
    add(prog(`bound-env-depth-${d}`, `env value depth ${n + 1}`, ["get", "v"], { env: new Map([["v", v]]) }));
  }
  // value depth on the result via quote payload.
  for (const [d, n] of [[32, 32], [33, 33]] as const) {
    let v: JVal = num(0);
    for (let i = 0; i < n; i++) v = [v];
    add(prog(`bound-val-depth-${d}`, `result value depth ${d}`, ["quote", v]));
  }
  // list-len via env values (1024/1025) and mid-eval concat.
  for (const [d, n] of [[1024, 1024], [1025, 1025]] as const) {
    add(prog(`bound-env-list-${d}`, `env value list length ${d}`, ["len", ["get", "l"]], { env: new Map([["l", Array.from({ length: n }, () => num(0))]]) }));
  }
  {
    const env = new Map<string, JVal>();
    env.set("a", Array.from({ length: 700 }, () => num(1)));
    env.set("b", Array.from({ length: 325 }, () => num(2)));
    add(prog("bound-concat-1025", "concat of 700+325 exceeds list-len mid-eval", ["concat", ["get", "a"], ["get", "b"]], { env }));
    const env2 = new Map<string, JVal>();
    env2.set("a", Array.from({ length: 700 }, () => num(1)));
    env2.set("b", Array.from({ length: 324 }, () => num(2)));
    add(prog("bound-concat-1024", "concat of 700+324 at list-len", ["concat", ["get", "a"], ["get", "b"]], { env: env2 }));
    env2.set("c", Array.from({ length: 700 }, () => num(3)));
    add(prog("bound-concat-1024v2", "concat of 700+324+... over", ["concat", ["get", "a"], ["get", "b"], ["get", "c"]], { env: env2 }));
  }
  // string-bytes: env value 65536/65537 and mid-eval sconcat.
  for (const [d, n] of [[65536, 65536], [65537, 65537]] as const) {
    add(prog(`bound-env-str-${d}`, `env value string ${d} bytes`, ["slen", ["get", "s"]], { env: new Map([["s", pad(n)]]) }));
  }
  {
    const env = new Map<string, JVal>();
    env.set("a", pad(40000));
    env.set("b", pad(25536));
    add(prog("bound-sconcat-65536", "sconcat at string-bytes", ["sconcat", ["get", "a"], ["get", "b"]], { env }));
    env.set("b", pad(25537));
    add(prog("bound-sconcat-65537", "sconcat over string-bytes", ["sconcat", ["get", "a"], ["get", "b"]], { env }));
  }
  // output-bytes: quote payload canonical >65536 → EXPR_BOUNDS output-bytes at fuel 1.
  for (const d of [65536, 65537] as const) {
    // {"k0":"x"*m,...} — tune m so canonical size is at/over the bound.
    const keys = 250;
    const per = Math.floor((d - 2 - (keys - 1)) / keys) - 5; // braces + commas + "kNNN":""
    const payload = new Map<string, JVal>();
    for (let i = 0; i < keys; i++) payload.set(`k${i}`, pad(Math.max(1, per)));
    add(prog(`bound-output-${d}`, `output canonical ~${d} bytes`, ["quote", payload]));
  }
  // value-bytes via map accumulation (~260KB mid-eval).
  {
    const env = new Map<string, JVal>();
    env.set("l", Array.from({ length: 600 }, () => pad(350)));
    add(prog("bound-value-bytes", "map doubling 600*350-byte strings exceeds value-bytes", ["map", ["get", "l"], "x", ["sconcat", ["get", "x"], ["get", "x"]]], { env }));
  }
  // var length boundary: binder name 63/64/65.
  for (const [d, n] of [[63, 63], [64, 64], [65, 65]] as const) {
    add(prog(`bound-varlen-${d}`, `binder name length ${d}`, ["let", "v".repeat(n), num(1), num(2)]));
  }
  // fuel boundary on a fixed-cost program: ["add",1,2] costs 4.
  for (const f of [0, 3, 4, 5]) {
    add(prog(`bound-fuel-${f}`, `fuel ${f} vs cost 4`, ["add", num(1), num(2)], { fuel: num(f) }));
  }
  // get-path index-key edges.
  const indexKeys: [string, JVal][] = [
    ["idx-0", num(0)], ["idx-neg", num(-1)], ["idx-frac", num(1.5)],
    ["idx-u32max", num(4294967295)], ["idx-u32max-plus", num(4294967296)],
    ["idx-1e20", num(1e20)], ["idx-bignum", num(Number("18446744073709551615"))],
    ["idx-str-0", "0"], ["idx-str-01", "01"], ["idx-str-neg", "-1"],
  ];
  for (const [id, k] of indexKeys) {
    add(prog(`bound-${id}`, `get path index ${id}`, ["get", "l", k], { env: new Map([["l", [num(10), num(20)]]]) }));
  }
  // index-key ordering: array-index keys numerically first, then UTF-16.
  {
    const m = new Map<string, JVal>();
    m.set("10", num(10)); m.set("2", num(2)); m.set("￿", num(1)); m.set("𐀀", num(0));
    m.set("z", num(26)); m.set("a", num(1)); m.set("A", num(65)); m.set("0", num(0));
    m.set("01", num(99)); m.set("4294967294", num(1)); m.set("4294967295", num(2)); m.set("4294967296", num(3));
    add(prog("sem-key-order", "canonical key order index-first then UTF-16", ["keys", ["quote", m]]));
    add(prog("sem-key-order-values", "values follow key order", ["values", ["quote", m]]));
    add(prog("sem-key-sort-str", "sort orders strings by UTF-16 units", ["sort", ["list", "￿", "𐀀", "z", "A", "a", "é"]]));
    add(prog("sem-key-merge-order", "merge last-wins with ordering", ["merge", ["quote", new Map([["b", num(1)], ["2", num(2)]])], ["quote", new Map([["a", num(3)], ["10", num(4)]])]]));
    add(prog("sem-key-eq-order", "object equality ignores order", ["eq", ["quote", new Map([["a", num(1)], ["b", num(2)]])], ["quote", new Map([["b", num(2)], ["a", num(1)]])]]));
  }
  // UTF-8 (BTreeMap) vs UTF-16 iteration divergence probe.
  {
    const m = new Map<string, JVal>();
    m.set("￿", ["nosuch"]); m.set("𐀀", [num(1), num(2)]);
    add(prog("sem-iter-order", "object program iterates env in UTF-8 order for error choice", m, {}, "eval", true));
    const m2 = new Map<string, JVal>();
    m2.set("𐀀", [num(1), num(2)]); m2.set("￿", ["nosuch"]);
    add(prog("sem-iter-order-flip", "same keys inserted in opposite order", m2, {}, "eval", true));
  }
  // more semantic probes.
  const sem: [string, JVal, Record<string, JVal>?][] = [
    ["sem-get-self", ["get", "get"], {}],
    ["sem-get-nested-str-key-on-arr", ["get", "l", "0"], { env: new Map([["l", [num(9)]]]) }],
    ["sem-get-num-on-obj", ["get", "o", num(0)], { env: new Map([["o", new Map([["0", num(9)]])]]) }],
    ["sem-get-missing-early", ["get", "o", "nope", "deeper", "x"], { env: new Map([["o", new Map([["a", num(1)]])]]) }],
    ["sem-get-null-short", ["get", "o", "a", "x", "y"], { env: new Map([["o", new Map([["a", num(1)]])]]) }],
    ["sem-and-short", ["and", false, ["div", num(1), num(0)]], {}],
    ["sem-or-short", ["or", true, ["div", num(1), num(0)]], {}],
    ["sem-and-type", ["and", true, num(1)], {}],
    ["sem-let-shadow-env", ["let", "x", num(5), ["get", "x"]], { env: new Map([["x", num(9)]]) }],
    ["sem-let-nested-shadow", ["let", "x", num(1), ["let", "x", num(2), ["get", "x"]]], {}],
    ["sem-map-scope-leak", ["list", ["map", ["list", num(1)], "x", ["get", "x"]], ["get", "x"]], { env: new Map([["x", num(7)]]) }],
    ["sem-nth-neg", ["nth", ["list", num(1)], num(-1)], {}],
    ["sem-nth-frac", ["nth", ["list", num(1)], num(0.5)], {}],
    ["sem-div-negzero", ["div", num(1), num(-0)], {}],
    ["sem-mod-zero", ["mod", num(1), num(0)], {}],
    ["sem-neg0-eq", ["eq", num(-0), num(0)], {}],
    ["sem-inf-overflow", ["add", num(1.7976931348623157e308), num(1.7976931348623157e308)], {}],
    ["sem-inf-mul", ["mul", num(1e308), num(1e308)], {}],
    ["sem-nan-not-possible", ["div", num(0), num(0)], {}],
    ["sem-sconcat-nonascii", ["sconcat", "é", "￿", "𐀀"], {}],
    ["sem-sort-objs", ["sort", ["list", ["quote", new Map([["b", num(1)]])], ["quote", new Map([["a", num(1)]])]]], {}],
    ["sem-sort-mixed", ["sort", ["list", [num(2)], num(1), "a", true, null]], {}],
    ["sem-uniq-mixed", ["unique", ["list", num(1), num(1.0), "a", "a", num(2)]], {}],
    ["sem-sub-order", ["sub", true, ["div", num(1), num(0)]], {}],
    ["sem-min-all-eval", ["min", true, ["div", num(1), num(0)]], {}],
    ["sem-empty-arr-op", [""], {}],
    ["sem-num-head", [num(1), num(2)], {}],
    ["sem-null-head", [null], {}],
    ["sem-empty-prog", [], {}],
    ["sem-fuel-zero-quote", ["quote", num(1)], { fuel: num(0) }],
    ["sem-env-not-used", true, { env: new Map([["x", num(1)]]) }],
    ["sem-obj-empty", new Map(), {}],
    ["sem-obj-nested-eval", new Map<string, JVal>([["b", ["div", num(1), num(0)]], ["a", true]]), {}],
    ["sem-str-utf16-len", ["slen", "😀"], {}],
    ["sem-split-empty-sep", ["split", "abc", ""], {}],
    ["sem-join-num", ["join", ["list", "a", num(1)], "-"], {}],
    ["sem-clamp-inverted", ["clamp", num(5), num(10), num(0)], {}],
    ["sem-round-half-up", ["round", num(2.5)], {}],
    ["sem-round-neg", ["round", num(-2.5)], {}],
    ["sem-round-half-down", ["round", num(2.4999999999999996)], {}],
    ["sem-upper-ascii-only", ["upper", "éa"], {}],
    ["sem-lower-ascii-only", ["lower", "ÉA"], {}],
    ["sem-trim-set", ["trim", " \t\n\r\u000b\u000cx \t\n\r\u000b\u000c"], {}],
    ["sem-contains-obj", ["contains", ["list", ["quote", new Map([["a", num(1)]])]], ["quote", new Map([["a", num(1)]])]], {}],
    ["sem-typecheck-all", ["list", ["isText", "x"], ["isNum", num(1)], ["isBool", true], ["isList", ["list", num(1)]], ["isMap", new Map()], ["isNull", null]], {}],
  ];
  for (const [id, p, extra] of sem) {
    try { add(prog(id, "semantic probe", p, extra)); }
    catch (e) { throw new Error(`sem case ${id} failed to render: ${String(e)}`); }
  }

  // ---------------------------------------------------- seeded generated ---
  for (const seed of seedStream) {
    const rng = new Rng(seed);
    const count = 60;
    for (let i = 0; i < count; i++) {
      const ctx = { rng, envKeys: ["x", "y", "e"], scope: [] as string[], depth: 0, nodes: 0, nodeCap: 60 };
      const program = genProgram(ctx, 6);
      const env = new Map<string, JVal>();
      const vctx = { rng, envKeys: [], scope: [], depth: 0, nodes: 0, nodeCap: 8 };
      env.set("x", genValue(vctx, 2));
      env.set("y", genValue(vctx, 2));
      env.set("e", genValue(vctx, 3));
      const fuelPick = rng.pick([undefined, undefined, undefined, 0, 4, 20, 200, 10_000]);
      const bytes = renderEnvelope(fuelPick === undefined ? { program, env } : { program, env, fuel: fuelPick }, rng, rng.bool(35));
      addDedup({ id: `gen-${seed.toString(16)}-${i}`, mode: "eval", bytes, note: "seeded generated program", wrapper: true });
    }
  }

  // ----------------------------------------------------------- check mode ---
  const checks: [string, string][] = [
    ["chk-basic", '{"program":["get","x"],"names":["x"]}'],
    ["chk-unbound", '{"program":["get","x"],"names":[]}'],
    ["chk-names-filter", '{"program":["get","x"],"names":["x",1,null,true]}'],
    ["chk-names-obj", '{"program":["get","x"],"names":{"x":1}}'],
    ["chk-names-str", '{"program":["get","x"],"names":"x"}'],
    ["chk-no-names", '{"program":["get","x"]}'],
    ["chk-dup-prog", '{"program":["list",1],"program":["get","x"],"names":["x"]}'],
    ["chk-arity", '{"program":["sub",1],"names":["x"]}'],
    ["chk-unknown", '{"program":["nosuch"],"names":[]}'],
    ["chk-depth-16", `{"program":${"[".repeat(0)}1${"]".repeat(0)},"names":[]}`],
    ["chk-binder", '{"program":["map",["list",1],"x",["get","x"]],"names":[]}'],
    ["chk-binder-outside", '{"program":["list",["get","x"]],"names":["x"]}'],
    ["chk-binder-leak", '{"program":["map",["list",1],"x",["get","x"],["get","x"]],"names":[]}'],
    ["chk-nonstring-names", '{"program":["get","x"],"names":[1,2,3]}'],
    ["chk-extra-keys", '{"program":["get","x"],"names":["x"],"env":{"y":1},"fuel":0}'],
    ["chk-empty-names", '{"program":["get","x"],"names":[""]}'],
    ["chk-proto-name", '{"program":["get","__proto__"],"names":["__proto__"]}'],
    ["chk-quote-free", '{"program":["quote",["get","x"]],"names":[]}'],
    ["chk-non-obj", '"[1,2]"'],
    ["chk-num-program", '{"program":42,"names":[]}'],
  ];
  for (const [id, t] of checks) add(raw(id, "check-mode admission", t, "check"));

  return out;
}
