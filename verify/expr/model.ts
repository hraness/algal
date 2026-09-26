// independent-model — a TypeScript mirror of verify/lean/Algal/Expr/{Model,Eval}.lean
//
// This is NOT production linkage. It is an executable restatement of the Lean
// semantic model, used as an oracle in the expr-conformance suite: the
// committed WASM evaluator, the Bun wrapper (src/expr.ts) and the native
// verification_boundary driver are compared against it, and every divergence
// is a named, asserted relation — never silently absorbed.
//
// Fidelity notes (all decisions trace to Model.lean/Eval.lean lines):
// * Values: JSON scalars plus lists (`MV[]`) and maps (`Map<string, MV>`).
//   Map keys are unique; the admission reader stores entries in UTF-8 byte
//   order, matching `serde_json::Map`/`sortFieldsByte` iteration order.
// * Numbers are IEEE-754 binary64 (JS number). `admitNum` = Number.isFinite —
//   the model's finite-domain admission (`Binary64.admit` on result bits).
// * Fuel: the evaluator records the ordered charge trace (`charges`); `replay`
//   walks it against the budget exactly like `Algal.Expr.Eval.replay` — the
//   first charge whose cumulative spend exceeds the budget is the reported
//   EXPR_FUEL failure with (cost, left) recorded.
// * Error codes map to the closed ErrCode enum; `unmodeled` is surfaced as
//   the marker code EXPR_UNMODELED, which production never emits.
// * The static `check` pass is NOT in the Lean model; `checkMirror` below is a
//   separate mirror of crates/algal-expr's `check`/`check_program`, used only
//   to classify cases (the conformance assertion for check-rejected programs
//   is wasm≡native byte equality plus this mirror's predicted code).
// * Discovered gap, pinned rather than hidden: the Lean dispatch has no
//   `"quote"` arm — `["quote", v]` falls through to `errOp` (EXPR_OP) here,
//   while production returns the payload. Algal.Expr.SCOPE.md lists `quote`
//   as modelled; the code says otherwise. This mirror follows the code and
//   the conformance suite records the gap explicitly.

export type MV = null | boolean | number | string | MV[] | Map<string, MV>;
export type ErrCode =
  | "parse" | "op" | "arity" | "type" | "path" | "arg"
  | "num" | "divZero" | "bounds" | "fuel" | "unmodeled";

/** The production-facing spelling of each model code. `unmodeled` is the
 *  model-only marker — production cannot emit it, which is the point. */
export const CODE_NAME: Record<ErrCode, string> = {
  parse: "EXPR_PARSE", op: "EXPR_OP", arity: "EXPR_ARITY", type: "EXPR_TYPE",
  path: "EXPR_PATH", arg: "EXPR_ARG", num: "EXPR_NUM", divZero: "EXPR_DIV_ZERO",
  bounds: "EXPR_BOUNDS", fuel: "EXPR_FUEL", unmodeled: "EXPR_UNMODELED",
};

export class MErr extends Error {
  constructor(readonly code: ErrCode, readonly details: Record<string, unknown> = {}) {
    super(`${CODE_NAME[code]} ${JSON.stringify(details)}`);
    this.name = "MErr";
  }
}
const fail = (code: ErrCode, details: Record<string, unknown> = {}): never => {
  throw new MErr(code, details);
};

// ---------------------------------------------------------------- bounds ---
// Mirror of the `max*` constants in Model.lean (the crates/algal-expr MAX_* set).
export const BOUNDS = {
  maxProgramBytes: 16_384,
  maxProgramNodes: 512,
  maxProgramDepth: 16,
  maxEnvBytes: 262_144,
  maxValueDepth: 32,
  maxListLen: 1_024,
  maxObjectKeys: 256,
  maxStringBytes: 65_536,
  maxOutputBytes: 65_536,
  maxValueBytes: 262_144,
  maxVarLen: 64,
  maxFuel: 1_000_000,
} as const;

const enc = new TextEncoder();
const utf8Len = (s: string): number => enc.encode(s).length;

export function kindOf(v: MV): string {
  if (v === null) return "null";
  if (typeof v === "boolean") return "bool";
  if (typeof v === "number") return "number";
  if (typeof v === "string") return "text";
  if (Array.isArray(v)) return "list";
  return "map";
}

// ------------------------------------------------------------- admission ---
// Admission fixes the modelled domain: finite numbers, scalar strings (no
// unpaired surrogates — Lean Char and serde String share that domain), arrays,
// and objects stored as UTF-8-byte-sorted entry Maps (serde_json::Map order).
// JSON.parse is the only producer of `u` here; cycles and non-JSON values are
// rejected outright rather than interpreted.

export class AdmissionError extends Error {}

function hasLoneSurrogate(s: string): boolean {
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c >= 0xd800 && c <= 0xdfff) {
      if (c <= 0xdbff && i + 1 < s.length) {
        const d = s.charCodeAt(i + 1);
        if (d >= 0xdc00 && d <= 0xdfff) { i++; continue; }
      }
      return true;
    }
  }
  return false;
}

/** UTF-8 byte order: the `Ord String`/`BTreeMap`/`sortFieldsByte` order. For
 *  scalar strings this is code-point order; comparing encoded bytes is exact. */
export function byteOrderCompare(a: string, b: string): number {
  const x = enc.encode(a), y = enc.encode(b);
  const n = Math.min(x.length, y.length);
  for (let i = 0; i < n; i++) {
    const d = x[i]! - y[i]!;
    if (d !== 0) return d;
  }
  return x.length - y.length;
}

export function admit(u: unknown, depth = 0): MV {
  if (depth > 256) throw new AdmissionError("admission depth bound");
  if (u === null || typeof u === "boolean") return u;
  if (typeof u === "number") {
    if (!Number.isFinite(u)) throw new AdmissionError("non-finite number outside the domain");
    return u;
  }
  if (typeof u === "string") {
    if (hasLoneSurrogate(u)) throw new AdmissionError("unpaired surrogate outside the domain");
    return u;
  }
  if (Array.isArray(u)) return u.map(item => admit(item, depth + 1));
  if (u !== null && typeof u === "object") {
    const entries: [string, MV][] = [];
    for (const key of Object.keys(u)) {
      if (hasLoneSurrogate(key)) throw new AdmissionError("unpaired surrogate key outside the domain");
      entries.push([key, admit((u as Record<string, unknown>)[key], depth + 1)]);
    }
    entries.sort((x, y) => byteOrderCompare(x[0], y[0]));
    return new Map(entries);
  }
  throw new AdmissionError("value outside the JSON domain");
}

// ---------------------------------------------------- canonical rendering --
// The response surface renders canonical JSON: object keys in `keyOrder`
// (array-index keys numerically first, then UTF-16 code units), strings in the
// ECMAScript/serde escape profile (JSON.stringify), numbers in the shortest
// round-trip decimal (String(n) — sampled-identical to ryu_js; -0 renders "0").

/** `Text.arrayIndex`/`array_index`: a canonical decimal u32 spelling that is
 *  not 4294967295. Rejects "+1", "-0", "01", leading zeros, and overflow. */
export function arrayIndex(s: string): number | null {
  if (!/^[0-9]+$/.test(s)) return null;
  if (s.length > 1 && s[0] === "0") return null;
  const n = Number(s);
  return Number.isInteger(n) && n < 4_294_967_295 ? n : null;
}

/** UTF-16 code-unit comparison — JS `<` on strings is exactly this order. */
export function utf16Compare(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** `keyOrder`/`key_order`: array-index keys numerically first, then UTF-16. */
export function keyOrder(a: string, b: string): number {
  const ai = arrayIndex(a), bi = arrayIndex(b);
  if (ai !== null && bi !== null) return ai - bi;
  if (ai !== null) return -1;
  if (bi !== null) return 1;
  return utf16Compare(a, b);
}

/** `Text.canonicalKeys`: unique keys in canonical order. */
export function canonicalKeys(keys: Iterable<string>): string[] {
  return [...new Set(keys)].sort(keyOrder);
}

export function canonical(v: MV): string {
  if (v === null) return "null";
  if (typeof v === "boolean") return v ? "true" : "false";
  if (typeof v === "number") return String(v);
  if (typeof v === "string") return JSON.stringify(v);
  if (Array.isArray(v)) return `[${v.map(canonical).join(",")}]`;
  const parts: string[] = [];
  const keys = canonicalKeys(v.keys());
  for (const k of keys) parts.push(`${JSON.stringify(k)}:${canonical(v.get(k)!)}`);
  return `{${parts.join(",")}}`;
}

export function canonicalBytes(v: MV): number {
  return utf8Len(canonical(v));
}

// ----------------------------------------------------------- value measures

export function countNodes(v: MV): number {
  if (Array.isArray(v)) return 1 + v.reduce((n, x) => n + countNodes(x), 0);
  if (v instanceof Map) return 1 + [...v.values()].reduce((n, x) => n + countNodes(x), 0);
  return 1;
}

export function valueDepth(v: MV): number {
  if (Array.isArray(v)) return 1 + v.reduce((n, x) => Math.max(n, valueDepth(x)), 0);
  if (v instanceof Map) return 1 + [...v.values()].reduce((n, x) => Math.max(n, valueDepth(x)), 0);
  return 0;
}

/** `stringBytes`: escaped canonical string length (`JsonString.quote` /
 *  serde_json profile — identical to JSON.stringify on scalar strings). */
const stringBytes = (s: string): number => utf8Len(JSON.stringify(s));

/** `numberByteBound`: the model's conservative per-number byte charge — an
 *  upper bound on the shortest rendering, not the renderer itself. */
const NUMBER_BYTE_BOUND = 24;

/** `valueByteCount`: pure counter, model-exact (24 per number). */
export function valueByteCount(v: MV): number {
  if (v === null) return 4;
  if (typeof v === "boolean") return v ? 4 : 5;
  if (typeof v === "number") return NUMBER_BYTE_BOUND;
  if (typeof v === "string") return stringBytes(v);
  if (Array.isArray(v)) {
    let n = 2 + Math.max(0, v.length - 1);
    for (const x of v) n += valueByteCount(x);
    return n;
  }
  let n = 2 + Math.max(0, v.size - 1);
  for (const [k, x] of v) n += stringBytes(k) + 1 + valueByteCount(x);
  return n;
}

const errBounds = (what: string, max: number): never =>
  fail("bounds", { what, max });

function addValueBytes(total: number, extra: number): number {
  if (BOUNDS.maxValueBytes < total + extra) return errBounds("value-bytes", BOUNDS.maxValueBytes);
  return total + extra;
}

/** `valueBytes v depth`: the fallible bounded-byte walker. */
export function valueBytes(v: MV, depth: number): number {
  if (BOUNDS.maxValueDepth < depth) return errBounds("value-depth", BOUNDS.maxValueDepth);
  if (v === null) return 4;
  if (typeof v === "boolean") return v ? 4 : 5;
  if (typeof v === "number") return NUMBER_BYTE_BOUND;
  if (typeof v === "string") {
    if (BOUNDS.maxStringBytes < utf8Len(v)) return errBounds("string-bytes", BOUNDS.maxStringBytes);
    return stringBytes(v);
  }
  if (Array.isArray(v)) {
    if (BOUNDS.maxListLen < v.length) return errBounds("list-len", BOUNDS.maxListLen);
    let acc = 2 + Math.max(0, v.length - 1);
    for (const x of v) acc = addValueBytes(acc, valueBytes(x, depth + 1));
    if (BOUNDS.maxValueBytes < acc) return errBounds("value-bytes", BOUNDS.maxValueBytes);
    return acc;
  }
  if (BOUNDS.maxObjectKeys < v.size) return errBounds("object-keys", BOUNDS.maxObjectKeys);
  let acc = 2 + Math.max(0, v.size - 1);
  for (const [k, x] of v) {
    if (BOUNDS.maxStringBytes < utf8Len(k)) return errBounds("string-bytes", BOUNDS.maxStringBytes);
    acc = addValueBytes(acc, stringBytes(k) + 1);
    acc = addValueBytes(acc, valueBytes(x, depth + 1));
  }
  if (BOUNDS.maxValueBytes < acc) return errBounds("value-bytes", BOUNDS.maxValueBytes);
  return acc;
}

const checkValue = (v: MV): number => valueBytes(v, 0);

const envBytes = (env: Map<string, MV>): number => {
  let n = 2 + Math.max(0, env.size - 1);
  for (const [k, v] of env) n += stringBytes(k) + 1 + valueByteCount(v);
  return n;
};
const envDepth = (env: Map<string, MV>): number =>
  1 + [...env.values()].reduce((d, v) => Math.max(d, valueDepth(v)), 0);

// --------------------------------------------------------- equality/order --

/** `eqv`/`eq_values`: normalize-equality — IEEE `==` on finite numbers
 *  (signed zeros identified), order-insensitive on maps. */
export function eqv(a: MV, b: MV): boolean {
  if (a === null || b === null) return a === b;
  if (typeof a === "boolean" || typeof b === "boolean") return a === b;
  if (typeof a === "number" || typeof b === "number") return a === b;
  if (typeof a === "string" || typeof b === "string") return a === b;
  const aArr = Array.isArray(a), bArr = Array.isArray(b);
  if (aArr || bArr) {
    if (!aArr || !bArr || a.length !== b.length) return false;
    return (a as MV[]).every((x, i) => eqv(x, (b as MV[])[i]!));
  }
  if (a.size !== b.size) return false;
  for (const [k, v] of a) if (!b.has(k) || !eqv(v, b.get(k)!)) return false;
  return true;
}

const isNegZero = (x: number): boolean => Object.is(x, -0);

/** `fmin`/`fmax`: IEEE minNum/maxNum — the `min(0,-0) = -0`, `max(0,-0) = +0`
 *  tie rule Rust's f64::min/max implement. */
const fmin = (a: number, b: number): number =>
  a < b ? a : b < a ? b : (isNegZero(a) || isNegZero(b)) ? -0 : a;
const fmax = (a: number, b: number): number =>
  a < b ? b : b < a ? a : (isNegZero(a) && isNegZero(b)) ? a : a === 0 ? 0 : a;

/** `jsRound`: floor, bump when fraction ≥ 0.5 (round half toward +∞). */
const jsRound = (n: number): number => {
  const f = Math.floor(n);
  return n - f < 0.5 ? f : f + 1;
};

// ---------------------------------------------------------------- machine --

type Ctx = { env: Map<string, MV>; scope: [string, MV][]; charges: number[] };
const charge = (ctx: Ctx, c: number): void => { ctx.charges.push(c); };

const errType = (op: string, arg: number, want: string, got: string): never =>
  fail("type", { op, arg, want, got });
const arityWant = (lo: number, hi: number | null): string =>
  hi === null ? `${lo}..` : `${lo}..${hi}`;
const errArity = (op: string, want: string, got: number): never =>
  fail("arity", { op, want, got });

const checkArity = (op: string, argc: number, lo: number, hi: number | null): void => {
  if (!(lo <= argc && (hi === null || argc <= hi))) errArity(op, arityWant(lo, hi), argc);
};

const baseCost = (op: string, argc: number): number => {
  switch (op) {
    case "and": case "or": case "not": case "if": case "let": case "quote": case "list":
    case "isText": case "isNum": case "isBool": case "isList": case "isMap": case "isNull":
      return 1;
    case "get": return 2 + argc;
    default: return 2;
  }
};

const asNum = (op: string, arg: number, v: MV): number =>
  typeof v === "number" ? v : errType(op, arg, "number", kindOf(v));
const asBool = (op: string, arg: number, v: MV): boolean =>
  typeof v === "boolean" ? v : errType(op, arg, "bool", kindOf(v));
const asList = (op: string, arg: number, v: MV): MV[] =>
  Array.isArray(v) ? v : errType(op, arg, "list", kindOf(v));
const asMap = (op: string, arg: number, v: MV): Map<string, MV> =>
  v instanceof Map ? v : errType(op, arg, "map", kindOf(v));
const asStr = (op: string, arg: number, v: MV): string =>
  typeof v === "string" ? v : errType(op, arg, "string", kindOf(v));

/** `asIndex`: nonneg-integral float admission (EXPR_TYPE otherwise). */
const asIndex = (op: string, arg: number, v: MV): number => {
  if (typeof v === "number" && v >= 0 && v - Math.floor(v) === 0) return v;
  return errType(op, arg, "nonneg integer", kindOf(v));
};

/** `emitNum`: admit a computed float back to the finite domain or EXPR_NUM. */
const emitNum = (op: string, f: number): MV =>
  Number.isFinite(f) ? f : fail("num", { op });

const binderName = (v: MV): string => (typeof v === "string" ? v : "");

const lookupName = (ctx: Ctx, name: string): MV | undefined => {
  for (let i = ctx.scope.length - 1; i >= 0; i--) {
    const [n, v] = ctx.scope[i]!;
    if (n === name) return v;
  }
  return ctx.env.get(name);
};

const hasName = (ctx: Ctx, name: string): boolean => {
  for (const [n] of ctx.scope) if (n === name) return true;
  return ctx.env.has(name);
};

const numFold = (op: string, f: (a: number, b: number) => number, acc: number, items: MV[]): number => {
  let i = 0;
  for (const v of items) {
    if (typeof v !== "number") errType(op, i, "number", kindOf(v));
    acc = f(acc, v);
    i++;
  }
  return acc;
};

const minMaxFold = (op: string, f: (a: number, b: number) => number, items: MV[]): number => {
  if (items.length === 0) return fail("type");
  const [head, ...rest] = items;
  if (typeof head !== "number") errType(op, 0, "number", kindOf(head!));
  let acc = head as number;
  let i = 1;
  for (const v of rest) {
    if (typeof v !== "number") errType(op, i, "number", kindOf(v));
    acc = f(acc, v);
    i++;
  }
  return acc;
};

const containsLoop = (ctx: Ctx, needle: MV, items: MV[]): boolean => {
  for (const x of items) {
    charge(ctx, 1);
    if (eqv(x, needle)) return true;
  }
  return false;
};

const uniqueLoop = (ctx: Ctx, items: MV[]): MV[] => {
  const out: MV[] = [];
  for (const x of items) {
    let dup = false;
    for (const s of out) {
      charge(ctx, 1);
      if (eqv(s, x)) { dup = true; break; }
    }
    if (!dup) out.push(x);
  }
  return out;
};

const listCount = (op: string, items: MV[]): number => {
  let total = 0;
  for (const [i, v] of items.entries()) {
    if (!Array.isArray(v)) errType(op, i, "list", kindOf(v));
    total += v.length;
  }
  return total;
};

const listsOnto = (items: MV[]): MV[] => {
  const out: MV[] = [];
  for (const v of items) if (Array.isArray(v)) out.push(...v);
  return out;
};

const strFold = (op: string, items: MV[]): string[] => {
  const out: string[] = [];
  for (const [i, v] of items.entries()) {
    if (typeof v !== "string") errType(op, i, "string", kindOf(v));
    out.push(v);
  }
  return out;
};

const joinStrs = (sep: string, parts: string[]): string => parts.join(sep);

/** `mergeLoop`: per-argument key-count charge (kept in the trace on the
 *  bounds path), rightmost-wins extension, unique-key bound after each
 *  extension. */
const mergeLoop = (ctx: Ctx, op: string, args: MV[]): Map<string, MV> => {
  let acc = new Map<string, MV>();
  for (const [i, v] of args.entries()) {
    if (!(v instanceof Map)) errType(op, i, "map", kindOf(v));
    const merged = new Map(acc);
    for (const [k, x] of v) merged.set(k, x);
    charge(ctx, v.size);
    if (BOUNDS.maxObjectKeys < merged.size) errBounds("object-keys", BOUNDS.maxObjectKeys);
    acc = merged;
  }
  return acc;
};

/** `charInfix`/`splitChars`/`trimStr`/casing over scalar strings — the JS
 *  code-unit operations agree with the Rust char-level ones on this domain. */
const TRIM = /^[ \t\n\r\v\f]+|[ \t\n\r\v\f]+$/g;
const upperStr = (s: string): string => s.replace(/[a-z]/g, c => String.fromCharCode(c.charCodeAt(0) - 32));
const lowerStr = (s: string): string => s.replace(/[A-Z]/g, c => String.fromCharCode(c.charCodeAt(0) + 32));
const trimStr = (s: string): string => s.replace(TRIM, "");

/** `canonicalFields` for output: last-wins entries in canonical key order.
 *  Maps are unique-keyed already, so this is just the keyOrder sort at
 *  materialization time. */
const canonicalFields = (m: Map<string, MV>): Map<string, MV> =>
  new Map(canonicalKeys(m.keys()).map(k => [k, m.get(k)!] as [string, MV]));

/** The post-evaluation bound check on every `node` result. */
const postCheck = (v: MV): MV => { checkValue(v); return v; };

function evalArgs(ctx: Ctx, rest: MV[]): MV[] {
  const out: MV[] = [];
  let bytes = 2;
  for (const a of rest) {
    const v = node(ctx, a);
    bytes = addValueBytes(bytes, valueBytes(v, 0) + (out.length === 0 ? 0 : 1));
    out.push(v);
  }
  return out;
}

function evalObjFields(ctx: Ctx, fields: Map<string, MV>): Map<string, MV> {
  const out = new Map<string, MV>();
  let bytes = 2;
  for (const [k, e] of fields) {
    const v = node(ctx, e);
    bytes = addValueBytes(bytes, stringBytes(k) + 1 + (out.size === 0 ? 0 : 1));
    bytes = addValueBytes(bytes, valueBytes(v, 1));
    out.set(k, v);
  }
  return out;
}

function evalNodeBody(ctx: Ctx, v: MV): MV {
  if (v instanceof Map) {
    // `.node (.object fs)` — charge 1, key bound, fields in stored (UTF-8) order.
    charge(ctx, 1);
    if (BOUNDS.maxObjectKeys < v.size) errBounds("object-keys", BOUNDS.maxObjectKeys);
    return evalObjFields(ctx, v);
  }
  if (!Array.isArray(v)) {
    // scalar self-evaluation.
    charge(ctx, 1);
    return v;
  }
  if (v.length === 0) fail("parse", { what: "op head must be a string" });
  const op = v[0]!;
  if (typeof op !== "string") fail("parse", { what: "op head must be a string", got: kindOf(op) });
  const rest = v.slice(1);
  charge(ctx, baseCost(op, rest.length));
  switch (op) {
    case "add": case "mul": {
      checkArity(op, rest.length, 1, null);
      const items = evalArgs(ctx, rest);
      const f = op === "add" ? (a: number, b: number) => a + b : (a: number, b: number) => a * b;
      return emitNum(op, numFold(op, f, op === "add" ? 0 : 1, items));
    }
    case "sub": case "div": {
      if (rest.length !== 2) errArity(op, "2..2", rest.length);
      const x = asNum(op, 0, node(ctx, rest[0]!));
      const y = asNum(op, 1, node(ctx, rest[1]!));
      if (op === "div" && y === 0) fail("divZero", { op });
      return emitNum(op, op === "div" ? x / y : x - y);
    }
    case "neg": {
      if (rest.length !== 1) errArity(op, "1..1", rest.length);
      const x = asNum(op, 0, node(ctx, rest[0]!));
      return emitNum(op, -x);
    }
    case "min": case "max": {
      checkArity(op, rest.length, 1, null);
      const items = evalArgs(ctx, rest);
      return emitNum(op, minMaxFold(op, op === "min" ? fmin : fmax, items));
    }
    case "abs": case "floor": case "ceil": case "round": {
      if (rest.length !== 1) errArity(op, "1..1", rest.length);
      const n = asNum(op, 0, node(ctx, rest[0]!));
      return emitNum(op,
        op === "abs" ? Math.abs(n) : op === "floor" ? Math.floor(n)
          : op === "ceil" ? Math.ceil(n) : jsRound(n));
    }
    case "clamp": {
      if (rest.length !== 3) errArity(op, "3..3", rest.length);
      const x = asNum(op, 0, node(ctx, rest[0]!));
      const y = asNum(op, 1, node(ctx, rest[1]!));
      const z = asNum(op, 2, node(ctx, rest[2]!));
      if (z < y) fail("arg", { op, what: "clamp lo must be <= hi" });
      return emitNum(op, fmin(fmax(x, y), z));
    }
    case "lt": case "lte": case "gt": case "gte": {
      checkArity(op, rest.length, 2, 2);
      const items = evalArgs(ctx, rest);
      const [a, b] = items as [MV, MV];
      if (typeof a === "number" && typeof b === "number") {
        return op === "lt" ? a < b : op === "lte" ? a <= b : op === "gt" ? b < a : b <= a;
      }
      if (typeof a === "string" && typeof b === "string") {
        const c = utf16Compare(a, b);
        return c < 0 ? op === "lt" || op === "lte"
          : c === 0 ? op === "lte" || op === "gte" : op === "gt" || op === "gte";
      }
      return errType(op, 0, "two numbers or two strings", `${kindOf(a)},${kindOf(b)}`);
    }
    case "eq": case "neq": {
      checkArity(op, rest.length, 2, 2);
      const items = evalArgs(ctx, rest);
      const [a, b] = items as [MV, MV];
      charge(ctx, countNodes(a) + countNodes(b));
      return op === "eq" ? eqv(a, b) : !eqv(a, b);
    }
    case "and": case "or": {
      if (rest.length === 0) errArity(op, "1..", 0);
      const want = op === "and";
      for (const [i, a] of rest.entries()) {
        const v = node(ctx, a);
        if (typeof v !== "boolean") errType(op, i, "bool", kindOf(v));
        if (v !== want) return v;
      }
      return want;
    }
    case "not": {
      if (rest.length !== 1) errArity(op, "1..1", rest.length);
      const v = asBool(op, 0, node(ctx, rest[0]!));
      return !v;
    }
    case "if": {
      if (rest.length !== 3) errArity(op, "3..3", rest.length);
      const c = asBool(op, 0, node(ctx, rest[0]!));
      return node(ctx, c ? rest[1]! : rest[2]!);
    }
    case "let": {
      if (rest.length !== 3) errArity(op, "3..3", rest.length);
      const name = binderName(rest[0]!);
      const v = node(ctx, rest[1]!);
      ctx.scope.push([name, v]);
      try { return node(ctx, rest[2]!); } finally { ctx.scope.pop(); }
    }
    case "get": {
      if (rest.length === 0) errArity(op, "1..", 0);
      const first = node(ctx, rest[0]!);
      if (typeof first !== "string") errType(op, 0, "name string", kindOf(first));
      if (!hasName(ctx, first)) fail("path", { op, what: `unbound name "${first}"` });
      let cur = lookupName(ctx, first)!;
      for (const [i, stepE] of rest.slice(1).entries()) {
        const step = i + 1;
        const k = node(ctx, stepE);
        // `.getPath`: a miss (absent key, out-of-range index, or a
        // non-container current) returns .null immediately — remaining steps
        // are not evaluated. A *hit* on a .null value recurses, so the next
        // step still evaluates (and may itself charge or fault) before the
        // non-container dispatch returns .null.
        if (typeof k === "string") {
          if (!(cur instanceof Map)) return null;
          if (!cur.has(k)) return null;
          cur = cur.get(k)!;
        } else if (typeof k === "number") {
          if (k < 0 || k - Math.floor(k) !== 0) {
            errType(op, step, "nonneg integer index", "number");
          }
          if (!Array.isArray(cur)) return null;
          if (!(k < cur.length)) return null;
          cur = cur[k]!;
        } else {
          errType(op, step, "string key or nonneg integer index", kindOf(k));
        }
      }
      return cur;
    }
    case "list": {
      const items = evalArgs(ctx, rest);
      if (BOUNDS.maxListLen < items.length) errBounds("list-len", BOUNDS.maxListLen);
      return items;
    }
    case "len": {
      if (rest.length !== 1) errArity(op, "1..1", rest.length);
      const items = asList(op, 0, node(ctx, rest[0]!));
      return items.length;
    }
    case "nth": {
      if (rest.length !== 2) errArity(op, "2..2", rest.length);
      const items = asList(op, 0, node(ctx, rest[0]!));
      const index = asIndex(op, 1, node(ctx, rest[1]!));
      if (items.length <= index) fail("path", { op, what: "index out of range", length: items.length });
      return items[index]!;
    }
    case "concat": {
      checkArity(op, rest.length, 1, null);
      const items = evalArgs(ctx, rest);
      const total = listCount(op, items);
      charge(ctx, total);
      if (BOUNDS.maxListLen < total) errBounds("list-len", BOUNDS.maxListLen);
      return listsOnto(items);
    }
    case "map": case "filter": {
      if (rest.length !== 3) errArity(op, "3..3", rest.length);
      const items = asList(op, 0, node(ctx, rest[0]!));
      const name = binderName(rest[1]!);
      const body = rest[2]!;
      const isMap = op === "map";
      const out: MV[] = [];
      let bytes = 2;
      for (const [idx, x] of items.entries()) {
        charge(ctx, 1);
        ctx.scope.push([name, x]);
        let v: MV;
        try { v = node(ctx, body); } finally { ctx.scope.pop(); }
        if (isMap) {
          bytes = addValueBytes(bytes, valueBytes(v, 1) + (out.length === 0 ? 0 : 1));
          if (BOUNDS.maxListLen < out.length + 1) errBounds("list-len", BOUNDS.maxListLen);
          out.push(v);
        } else {
          if (typeof v !== "boolean") errType(op, idx, "bool", kindOf(v));
          if (v === true) {
            bytes = addValueBytes(bytes, valueBytes(x, 1) + (out.length === 0 ? 0 : 1));
            if (BOUNDS.maxListLen < out.length + 1) errBounds("list-len", BOUNDS.maxListLen);
            out.push(x);
          }
        }
      }
      return out;
    }
    case "fold": {
      if (rest.length !== 5) errArity(op, "5..5", rest.length);
      const items = asList(op, 0, node(ctx, rest[0]!));
      const init = node(ctx, rest[1]!);
      const accName = binderName(rest[2]!);
      const itemName = binderName(rest[3]!);
      const body = rest[4]!;
      let acc = init;
      for (const x of items) {
        charge(ctx, 1);
        ctx.scope.push([accName, acc], [itemName, x]);
        try { acc = node(ctx, body); } finally { ctx.scope.pop(); ctx.scope.pop(); }
      }
      return acc;
    }
    case "contains": {
      if (rest.length !== 2) errArity(op, "2..2", rest.length);
      const items = asList(op, 0, node(ctx, rest[0]!));
      const needle = node(ctx, rest[1]!);
      return containsLoop(ctx, needle, items);
    }
    case "reverse": {
      if (rest.length !== 1) errArity(op, "1..1", rest.length);
      const items = asList(op, 0, node(ctx, rest[0]!));
      return [...items].reverse();
    }
    case "take": case "drop": {
      if (rest.length !== 2) errArity(op, "2..2", rest.length);
      const items = asList(op, 0, node(ctx, rest[0]!));
      const n = asIndex(op, 1, node(ctx, rest[1]!));
      return op === "take" ? items.slice(0, n) : items.slice(n);
    }
    case "flat": {
      if (rest.length !== 1) errArity(op, "1..1", rest.length);
      const items = asList(op, 0, node(ctx, rest[0]!));
      const total = listCount(op, items);
      charge(ctx, total);
      if (BOUNDS.maxListLen < total) errBounds("list-len", BOUNDS.maxListLen);
      return listsOnto(items);
    }
    case "unique": {
      if (rest.length !== 1) errArity(op, "1..1", rest.length);
      const items = asList(op, 0, node(ctx, rest[0]!));
      return uniqueLoop(ctx, items);
    }
    case "slen": {
      if (rest.length !== 1) errArity(op, "1..1", rest.length);
      const s = asStr(op, 0, node(ctx, rest[0]!));
      return s.length; // UTF-16 code units.
    }
    case "sconcat": {
      checkArity(op, rest.length, 1, null);
      const items = evalArgs(ctx, rest);
      const parts = strFold(op, items);
      const bytes = parts.reduce((n, s) => n + utf8Len(s), 0);
      if (BOUNDS.maxStringBytes < bytes) errBounds("string-bytes", BOUNDS.maxStringBytes);
      charge(ctx, bytes);
      return parts.join("");
    }
    case "upper": case "lower": case "trim": {
      if (rest.length !== 1) errArity(op, "1..1", rest.length);
      const s = asStr(op, 0, node(ctx, rest[0]!));
      charge(ctx, utf8Len(s));
      const out = op === "upper" ? upperStr(s) : op === "lower" ? lowerStr(s) : trimStr(s);
      if (BOUNDS.maxStringBytes < utf8Len(out)) errBounds("string-bytes", BOUNDS.maxStringBytes);
      return out;
    }
    case "split": {
      if (rest.length !== 2) errArity(op, "2..2", rest.length);
      const s = asStr(op, 0, node(ctx, rest[0]!));
      const sep = asStr(op, 1, node(ctx, rest[1]!));
      if (sep === "") fail("arg", { op, what: "separator must be non-empty" });
      charge(ctx, utf8Len(s));
      const parts = s.split(sep);
      if (BOUNDS.maxListLen < parts.length) errBounds("list-len", BOUNDS.maxListLen);
      charge(ctx, parts.length);
      return parts;
    }
    case "join": {
      if (rest.length !== 2) errArity(op, "2..2", rest.length);
      const items = asList(op, 0, node(ctx, rest[0]!));
      const sep = asStr(op, 1, node(ctx, rest[1]!));
      const parts = strFold(op, items);
      const bytes = utf8Len(sep) * Math.max(0, parts.length - 1) +
        parts.reduce((n, s) => n + utf8Len(s), 0);
      if (BOUNDS.maxStringBytes < bytes) errBounds("string-bytes", BOUNDS.maxStringBytes);
      charge(ctx, bytes);
      return joinStrs(sep, parts);
    }
    case "scontains": {
      if (rest.length !== 2) errArity(op, "2..2", rest.length);
      const s = asStr(op, 0, node(ctx, rest[0]!));
      const sub = asStr(op, 1, node(ctx, rest[1]!));
      charge(ctx, utf8Len(s));
      return s.includes(sub);
    }
    case "starts": case "ends": {
      if (rest.length !== 2) errArity(op, "2..2", rest.length);
      const s = asStr(op, 0, node(ctx, rest[0]!));
      const p = asStr(op, 1, node(ctx, rest[1]!));
      charge(ctx, utf8Len(s));
      return op === "starts" ? s.startsWith(p) : s.endsWith(p);
    }
    case "has": {
      if (rest.length !== 2) errArity(op, "2..2", rest.length);
      const o = asMap(op, 0, node(ctx, rest[0]!));
      const k = asStr(op, 1, node(ctx, rest[1]!));
      return o.has(k);
    }
    case "keys": case "values": {
      if (rest.length !== 1) errArity(op, "1..1", rest.length);
      const o = asMap(op, 0, node(ctx, rest[0]!));
      const names = canonicalKeys(o.keys());
      return op === "keys" ? names : names.map(k => o.get(k)!);
    }
    case "merge": {
      checkArity(op, rest.length, 1, null);
      const items = evalArgs(ctx, rest);
      return canonicalFields(mergeLoop(ctx, op, items));
    }
    case "isText": case "isNum": case "isBool": case "isList": case "isMap": case "isNull": {
      if (rest.length !== 1) errArity(op, "1..1", rest.length);
      const v = node(ctx, rest[0]!);
      switch (kindOf(v)) {
        case "text": return op === "isText";
        case "number": return op === "isNum";
        case "bool": return op === "isBool";
        case "list": return op === "isList";
        case "map": return op === "isMap";
        default: return op === "isNull";
      }
    }
    // The Lean model's dispatch has no "quote" arm — `["quote", v]` reports
    // EXPR_OP. (SCOPE.md lists quote as modelled; the machine disagrees. This
    // mirror follows the machine and the suite pins the gap.)
    case "sort": case "toText": case "mod":
      return fail("unmodeled", { op });
    default:
      return fail("op", { op });
  }
}

/** `machine env scope (.node v)` — postCheck wraps every node result; the two
 *  malformed array shapes (`[]`, non-text head) bypass it with no charge. */
function node(ctx: Ctx, v: MV): MV {
  const malformed = Array.isArray(v) && (v.length === 0 || typeof v[0] !== "string");
  if (malformed) return evalNodeBody(ctx, v); // no charge, no postCheck
  return postCheck(evalNodeBody(ctx, v));
}

// ------------------------------------------------------------- fuel replay --

export type FuelFailure = { cost: number; left: number };

/** `replay`: walk the charge trace; the first unaffordable charge is the
 *  reported failure (cost, left-at-that-point). */
function replay(budget: number, charges: number[]): { left: number } | { failure: FuelFailure } {
  let left = budget;
  for (const c of charges) {
    if (c <= left) left -= c;
    else return { failure: { cost: c, left } };
  }
  return { left };
}

export type RunOutcome =
  | { ok: true; value: MV; used: number }
  | { ok: false; code: ErrCode; details: Record<string, unknown>; used: number };

const errOut = (code: ErrCode, details: Record<string, unknown>, used: number): RunOutcome =>
  ({ ok: false, code, details, used });

/** `evalFuelled`: replay the trace against the budget — a fuel failure wins
 *  over the eval result (the unaffordable charge precedes it chronologically),
 *  then the run-level output checks. */
function evalFuelled(env: Map<string, MV>, program: MV, budget: number): RunOutcome {
  if (BOUNDS.maxFuel < budget) {
    return errOut("bounds", { what: "fuel budget must be an integer in [0, 1000000]", max: BOUNDS.maxFuel }, 0);
  }
  const ctx: Ctx = { env, scope: [], charges: [] };
  let value: MV | undefined;
  let evalErr: MErr | undefined;
  try {
    value = node(ctx, program);
  } catch (error) {
    if (!(error instanceof MErr)) throw error;
    evalErr = error;
  }
  const rep = replay(budget, ctx.charges);
  if ("failure" in rep) {
    const f = rep.failure;
    return errOut("fuel", { cost: f.cost, left: f.left }, budget - f.left);
  }
  const used = budget - rep.left;
  if (evalErr) return errOut(evalErr.code, evalErr.details, used);
  if (BOUNDS.maxOutputBytes < valueByteCount(value!)) {
    return errOut("bounds", { what: "output-bytes", max: BOUNDS.maxOutputBytes }, used);
  }
  if (BOUNDS.maxValueDepth < valueDepth(value!)) {
    return errOut("bounds", { what: "value-depth", max: BOUNDS.maxValueDepth }, used);
  }
  return { ok: true, value: value!, used };
}

/** `run`: env checks, then program bound checks, then fuelled evaluation.
 *  The static `check` pass is not modelled (see the module doc). */
export function run(program: MV, env: Map<string, MV>, budget: number): RunOutcome {
  if (BOUNDS.maxObjectKeys < env.size) return errOut("bounds", { what: "object-keys", max: BOUNDS.maxObjectKeys }, 0);
  if (BOUNDS.maxEnvBytes < envBytes(env)) return errOut("bounds", { what: "env-bytes", max: BOUNDS.maxEnvBytes }, 0);
  if (BOUNDS.maxValueDepth < envDepth(env)) return errOut("bounds", { what: "value-depth", max: BOUNDS.maxValueDepth }, 0);
  for (const [, v] of env) {
    try { valueBytes(v, 1); }
    catch (error) {
      if (!(error instanceof MErr)) throw error;
      return errOut(error.code, error.details, 0);
    }
  }
  if (BOUNDS.maxProgramBytes < valueByteCount(program)) {
    return errOut("bounds", { what: "program-bytes", max: BOUNDS.maxProgramBytes }, 0);
  }
  if (BOUNDS.maxProgramNodes < countNodes(program)) {
    return errOut("bounds", { what: "program-nodes", max: BOUNDS.maxProgramNodes }, 0);
  }
  if (BOUNDS.maxProgramDepth < valueDepth(program) + 1) {
    return errOut("bounds", { what: "program-depth", max: BOUNDS.maxProgramDepth }, 0);
  }
  return evalFuelled(env, program, budget);
}

// ------------------------------------------------- production check mirror --
// `checkMirror` is NOT part of the Lean model — it mirrors crates/algal-expr's
// `check`/`check_program` so the suite can predict whether production admits a
// program before evaluation. The Lean model folds the observable envelope
// bounds (program bytes/nodes/depth) into `run`; op-table, arity, binder-shape
// and literal-get scope failures are run-level in production but check-level
// here. On check-rejected programs the model and production may diverge on
// code and fuel — the documented eval-vs-run asymmetry; the conformance suite
// asserts exact agreement only where this mirror admits.

const VARIADIC = -1;
type OpSpec = { min: number; max: number; binders: readonly number[] };
const s = (min: number, max: number): OpSpec => ({ min, max, binders: [] });
const b = (min: number, max: number, binders: readonly number[]): OpSpec => ({ min, max, binders });
export const OP_SPEC: Readonly<Record<string, OpSpec>> = {
  add: s(1, VARIADIC), sub: s(2, 2), mul: s(1, VARIADIC), div: s(2, 2), mod: s(2, 2),
  neg: s(1, 1), min: s(1, VARIADIC), max: s(1, VARIADIC),
  abs: s(1, 1), floor: s(1, 1), ceil: s(1, 1), round: s(1, 1), clamp: s(3, 3),
  lt: s(2, 2), lte: s(2, 2), gt: s(2, 2), gte: s(2, 2), eq: s(2, 2), neq: s(2, 2),
  and: s(1, VARIADIC), or: s(1, VARIADIC), not: s(1, 1), if: s(3, 3),
  let: b(3, 3, [0]), get: s(1, VARIADIC), list: s(0, VARIADIC), len: s(1, 1),
  nth: s(2, 2), concat: s(1, VARIADIC), map: b(3, 3, [1]), filter: b(3, 3, [1]),
  fold: b(5, 5, [2, 3]), contains: s(2, 2), reverse: s(1, 1), take: s(2, 2),
  drop: s(2, 2), flat: s(1, 1), unique: s(1, 1), sort: s(1, 1), slen: s(1, 1),
  sconcat: s(1, VARIADIC), upper: s(1, 1), lower: s(1, 1), trim: s(1, 1),
  split: s(2, 2), join: s(2, 2), scontains: s(2, 2), starts: s(2, 2), ends: s(2, 2),
  has: s(2, 2), keys: s(1, 1), values: s(1, 1), merge: s(1, VARIADIC),
  toText: s(1, 1),
  isText: s(1, 1), isNum: s(1, 1), isBool: s(1, 1), isList: s(1, 1), isMap: s(1, 1),
  isNull: s(1, 1), quote: s(1, 1),
};

/** `is_var_name`: nonempty, ≤64 UTF-8 bytes, ASCII identifier shape. The byte
 *  length check matters: multibyte names reject on bytes, not char count. */
export function isVarName(name: string): boolean {
  return name.length > 0 && utf8Len(name) <= BOUNDS.maxVarLen &&
    /^[A-Za-z_][A-Za-z0-9_]*$/.test(name);
}

export type CheckOutcome = { ok: true } | { ok: false; code: ErrCode; details: Record<string, unknown> };

function checkNode(node_: MV, depth: number, scope: string[]): CheckOutcome {
  if (BOUNDS.maxProgramDepth < depth) {
    return { ok: false, code: "bounds", details: { what: "program-depth", max: BOUNDS.maxProgramDepth } };
  }
  if (Array.isArray(node_)) {
    if (node_.length === 0 || typeof node_[0] !== "string") {
      return { ok: false, code: "parse", details: { what: "op head must be a string" } };
    }
    const op = node_[0];
    const spec = OP_SPEC[op];
    if (spec === undefined) return { ok: false, code: "op", details: { op } };
    const argc = node_.length - 1;
    if (argc < spec.min || (spec.max !== VARIADIC && argc > spec.max)) {
      return { ok: false, code: "arity", details: { op, want: arityWant(spec.min, spec.max === VARIADIC ? null : spec.max), got: argc } };
    }
    for (const i of spec.binders) {
      const name = node_[1 + i];
      if (typeof name !== "string" || !isVarName(name)) {
        return { ok: false, code: "parse", details: { op, what: `binder arg ${i} must be an identifier <= ${BOUNDS.maxVarLen} chars` } };
      }
    }
    if (op === "quote") return { ok: true };
    if (op === "get" && typeof node_[1] === "string" && !scope.includes(node_[1])) {
      return { ok: false, code: "path", details: { op, what: `unbound name "${node_[1]}"` } };
    }
    for (let i = 1; i < node_.length; i++) {
      if (i === node_.length - 1 && spec.binders.length > 0) {
        const pushed: string[] = [];
        for (const p of spec.binders) {
          const name = node_[1 + p];
          if (typeof name === "string") pushed.push(name);
        }
        scope.push(...pushed);
        const inner = checkNode(node_[i]!, depth + 1, scope);
        scope.length -= spec.binders.length;
        if (!inner.ok) return inner;
      } else {
        const inner = checkNode(node_[i]!, depth + 1, scope);
        if (!inner.ok) return inner;
      }
    }
    return { ok: true };
  }
  if (node_ instanceof Map) {
    for (const child of node_.values()) {
      const inner = checkNode(child, depth + 1, scope);
      if (!inner.ok) return inner;
    }
    return { ok: true };
  }
  return { ok: true };
}

/** `check_program`: canonical byte bound (exact rendering, not the model's
 *  conservative count), node bound, then the recursive static check. */
export function checkMirror(program: MV, names: readonly string[]): CheckOutcome {
  if (BOUNDS.maxProgramBytes < canonicalBytes(program)) {
    return { ok: false, code: "bounds", details: { what: "program-bytes", max: BOUNDS.maxProgramBytes } };
  }
  if (BOUNDS.maxProgramNodes < countNodes(program)) {
    return { ok: false, code: "bounds", details: { what: "program-nodes", max: BOUNDS.maxProgramNodes } };
  }
  return checkNode(program, 1, [...names]);
}

/** The modelled-dispatch op set of Eval.lean: every arm except the three
 *  `EXPR_UNMODELED` exclusions and the documented `quote` gap. Used by the
 *  suite to split three-way-agreement cases from model-exclusion cases. */
export const UNMODELED_OPS = new Set(["mod", "sort", "toText"]);
export const MODEL_GAP_OPS = new Set(["quote"]);

/** Ops literally present in the program tree (occurrence, not dispatch —
 *  a dead `if` branch still counts). */
export function programOps(v: MV, into = new Set<string>()): Set<string> {
  if (Array.isArray(v)) {
    if (v.length > 0 && typeof v[0] === "string") into.add(v[0]);
    for (const x of v) programOps(x, into);
  } else if (v instanceof Map) {
    for (const x of v.values()) programOps(x, into);
  }
  return into;
}
