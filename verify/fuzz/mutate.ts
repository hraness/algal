/**
 * verify/fuzz/mutate.ts — deterministic mutators for the fuzz-smoke lane.
 * Two engines over a seed case's bytes:
 *
 *   grammar-*  parse the envelope into the lane's JVal domain, mutate the
 *              value tree (op swaps, numeric/string perturbation, subtree
 *              splice, env/fuel/names edits, depth pushes), re-encode.
 *              Mutants stay admitted JSON; they exercise semantics.
 *   byte-*     raw-byte edits on the encoded input (flip/insert/delete/
 *              truncate/duplicate/splice, invalid-UTF-8 and boundary-scalar
 *              injection, depth pushes). Mutants exercise the parser
 *              surface and may not parse at all.
 *
 * Every mutator is total and deterministic under the supplied Rng; a
 * mutator returns null when its precondition cannot be met (that counts
 * against the generator's produced-total, not silently skipped). Mutated
 * inputs are still subject to the lane's byte bound — oversized mutants
 * are declined by the caller, which keeps the grammar mutators honest about
 * the envelope limits they can cross.
 */

import { Rng } from "../differential/prng";
import { parseJsonBytes, type JVal } from "../differential/json";
import { canonical, isNum, valueDepth } from "../differential/canonical";

const enc = new TextEncoder();

export type Mutator = {
  id: string;
  family: "grammar" | "byte";
  /** `other` is a fragment donor (another seed's bytes) for splice mutators. */
  apply(bytes: Uint8Array, rng: Rng, other?: Uint8Array): Uint8Array | null;
};

const num = (v: number): JVal => ({ kind: "num", f64: v, u64: Number.isSafeInteger(v) && v >= 0 ? BigInt(v) : null });

/** Full algal.expr.v1 op heads, mirrored from the oracle's dispatch table. */
const OP_NAMES: readonly string[] = [
  "add", "sub", "mul", "div", "mod", "neg", "min", "max", "abs", "floor",
  "ceil", "round", "clamp", "lt", "lte", "gt", "gte", "eq", "neq", "and",
  "or", "not", "if", "let", "get", "list", "len", "nth", "concat", "map",
  "filter", "fold", "contains", "reverse", "take", "drop", "flat", "unique",
  "sort", "slen", "sconcat", "upper", "lower", "trim", "split", "join",
  "scontains", "starts", "ends", "has", "keys", "values", "merge", "toText",
  "isText", "isNum", "isBool", "isList", "isMap", "isNull", "quote",
];

const NUM_EDGE: readonly number[] = [
  0, -0, 1, -1, 0.5, -0.5, 5e-324, -5e-324, 2.2250738585072014e-308,
  1.7976931348623157e308, -1.7976931348623157e308, 9007199254740991,
  Number("9007199254740993"), Number("-9007199254740993"), 4294967295, 4294967296, 1e15, 1e21, 1e-7,
];
const STR_EDGE: readonly string[] = [
  "", "0", "01", "4294967295", "__proto__", "constructor", "￿", "𐀀",
  "é", "é", " ", "a\nb", "x".repeat(40),
];

type Site = { path: readonly (number | string)[]; value: JVal };

/** Collect every child edit site in a tree as (path, value) pairs. */
function sites(root: JVal): Site[] {
  const out: Site[] = [];
  const walk = (v: JVal, path: readonly (number | string)[]): void => {
    if (Array.isArray(v)) {
      v.forEach((item, i) => { const p = [...path, i]; out.push({ path: p, value: item }); walk(item, p); });
    } else if (v instanceof Map) {
      for (const [k, item] of v) { const p = [...path, k]; out.push({ path: p, value: item }); walk(item, p); }
    }
  };
  walk(root, []);
  return out;
}

/** Immutable rebuild with the node at `path` replaced. */
function replaceAt(v: JVal, path: readonly (number | string)[], sub: JVal): JVal {
  if (path.length === 0) return sub;
  const [h, ...rest] = path;
  if (Array.isArray(v) && typeof h === "number" && h < v.length)
    return v.map((x, i) => i === h ? replaceAt(x, rest, sub) : x);
  if (v instanceof Map && typeof h === "string" && v.has(h)) {
    const m = new Map(v);
    m.set(h, replaceAt(m.get(h)!, rest, sub));
    return m;
  }
  return v;
}

function parsed(bytes: Uint8Array): Map<string, JVal> | null {
  const p = parseJsonBytes(bytes);
  return p.ok && p.value instanceof Map ? p.value : null;
}

const rerender = (doc: Map<string, JVal>): Uint8Array => enc.encode(canonical(doc));

/** Grammar mutants stay inside the admitted-JSON domain — the byte
 * mutators own the reject surface. Re-encode and re-admit; a mutant that
 * would exceed the parser's depth bound declines instead. */
const admits = (b: Uint8Array | null): Uint8Array | null =>
  b !== null && parseJsonBytes(b).ok ? b : null;

const spliceable = (v: JVal): v is JVal[] => Array.isArray(v) && typeof v[0] === "string";

/** Pick a random site inside `doc.program` and rewrite it with `fn`. */
function treeEdit(doc: Map<string, JVal>, rng: Rng, fn: (v: JVal, depth: number) => JVal | null): Uint8Array | null {
  const program = doc.get("program");
  if (program === undefined) return null;
  const all = sites(program);
  if (all.length === 0) return null;
  const picked = all[rng.below(all.length)]!;
  const next = fn(picked.value, picked.path.length);
  if (next === null) return null;
  const d = new Map(doc);
  d.set("program", replaceAt(program, picked.path, next));
  return admits(rerender(d));
}

export const MUTATORS: readonly Mutator[] = [
  {
    id: "grammar-swap-op",
    family: "grammar",
    apply(bytes, rng) {
      const doc = parsed(bytes);
      if (!doc) return null;
      return treeEdit(doc, rng, v =>
        Array.isArray(v) && typeof v[0] === "string" && OP_NAMES.includes(v[0])
          ? [rng.pick(OP_NAMES), ...v.slice(1)] : null);
    },
  },
  {
    id: "grammar-num-perturb",
    family: "grammar",
    apply(bytes, rng) {
      const doc = parsed(bytes);
      if (!doc) return null;
      return treeEdit(doc, rng, v => isNum(v) ? num(rng.pick(NUM_EDGE)) : null);
    },
  },
  {
    id: "grammar-str-perturb",
    family: "grammar",
    apply(bytes, rng) {
      const doc = parsed(bytes);
      if (!doc) return null;
      return treeEdit(doc, rng, v => typeof v === "string" ? rng.pick(STR_EDGE) : null);
    },
  },
  {
    id: "grammar-drop-arg",
    family: "grammar",
    apply(bytes, rng) {
      const doc = parsed(bytes);
      if (!doc) return null;
      return treeEdit(doc, rng, v =>
        spliceable(v) && v.length > 1 ? [v[0]!, ...v.slice(1).filter(() => rng.bool(50))] : null);
    },
  },
  {
    id: "grammar-dup-arg",
    family: "grammar",
    apply(bytes, rng) {
      const doc = parsed(bytes);
      if (!doc) return null;
      return treeEdit(doc, rng, v => spliceable(v) && v.length > 1 ? [...v, v[1 + rng.below(v.length - 1)]!] : null);
    },
  },
  {
    id: "grammar-type-flip",
    family: "grammar",
    apply(bytes, rng) {
      const doc = parsed(bytes);
      if (!doc) return null;
      const flips: JVal[] = [null, true, num(0), "", [], new Map()];
      return treeEdit(doc, rng, () => rng.pick(flips));
    },
  },
  {
    id: "grammar-splice-subtree",
    family: "grammar",
    apply(bytes, rng) {
      const doc = parsed(bytes);
      if (!doc) return null;
      const program = doc.get("program");
      if (program === undefined) return null;
      const all = sites(program);
      if (all.length === 0) return null;
      const donor = all[rng.below(all.length)]!.value;
      return treeEdit(doc, rng, () => donor);
    },
  },
  {
    id: "grammar-wrap-op",
    family: "grammar",
    apply(bytes, rng) {
      const doc = parsed(bytes);
      if (!doc) return null;
      const program = doc.get("program");
      if (program === undefined) return null;
      // Grammar mutants stay inside the admitted-JSON domain: wrapping a
      // 127-deep program would make the envelope itself unparseable — the
      // byte mutators own that surface.
      if (valueDepth(program) >= 126) return null;
      const op = rng.pick(["neg", "abs", "not", "len", "slen", "isNum", "reverse", "quote", "floor"]);
      const d = new Map(doc);
      d.set("program", [op, program]);
      return admits(rerender(d));
    },
  },
  {
    id: "grammar-env-set",
    family: "grammar",
    apply(bytes, rng) {
      const doc = parsed(bytes);
      if (!doc) return null;
      const env = doc.get("env");
      const next = env instanceof Map ? new Map(env) : new Map<string, JVal>();
      next.set(rng.pick(["x", "y", "e", "z", "__proto__", "0"]), rng.bool(50) ? num(rng.pick(NUM_EDGE)) : rng.pick(STR_EDGE));
      const d = new Map(doc);
      d.set("env", next);
      return admits(rerender(d));
    },
  },
  {
    id: "grammar-env-drop",
    family: "grammar",
    apply(bytes, rng) {
      const doc = parsed(bytes);
      if (!doc) return null;
      const env = doc.get("env");
      if (!(env instanceof Map) || env.size === 0) return null;
      const next = new Map(env);
      next.delete([...next.keys()][rng.below(next.size)]!);
      const d = new Map(doc);
      d.set("env", next);
      return admits(rerender(d));
    },
  },
  {
    id: "grammar-env-confuse",
    family: "grammar",
    apply(bytes, rng) {
      const doc = parsed(bytes);
      if (!doc || !doc.has("env")) return null;
      const d = new Map(doc);
      d.set("env", rng.pick<JVal>([null, num(1), "x", [], true]));
      return admits(rerender(d));
    },
  },
  {
    id: "grammar-fuel-mutate",
    family: "grammar",
    apply(bytes, rng) {
      const doc = parsed(bytes);
      if (!doc) return null;
      const d = new Map(doc);
      const pick = rng.below(6);
      if (pick === 0) d.delete("fuel");
      else if (pick === 1) d.set("fuel", num(rng.pick([0, 1, 4, 100, 10_000, 1_000_000, 1_000_001])));
      else if (pick === 2) d.set("fuel", num(-1));
      else if (pick === 3) d.set("fuel", { kind: "num", f64: 100, u64: null }); // float-typed 100 — as_u64 must refuse
      else if (pick === 4) d.set("fuel", "5");
      else d.set("fuel", null);
      return admits(rerender(d));
    },
  },
  {
    id: "grammar-names-mutate",
    family: "grammar",
    apply(bytes, rng) {
      const doc = parsed(bytes);
      if (!doc || !doc.has("names")) return null;
      const names = doc.get("names");
      const list = Array.isArray(names) ? [...names] : [];
      const pick = rng.below(4);
      if (pick === 0 && list.length) list.splice(rng.below(list.length), 1);
      else if (pick === 1) list.push(rng.pick(STR_EDGE));
      else if (pick === 2) list.push(num(1), null);
      else list.push("x");
      const d = new Map(doc);
      d.set("names", list);
      return admits(rerender(d));
    },
  },
  {
    id: "grammar-deepen",
    family: "grammar",
    apply(bytes, rng) {
      const doc = parsed(bytes);
      if (!doc) return null;
      return treeEdit(doc, rng, (v, depth) => depth < 14 ? [rng.pick(["add", "mul", "and", "or"]), v, num(1)] : null);
    },
  },
  {
    id: "grammar-program-literal",
    family: "grammar",
    apply(bytes, rng) {
      const doc = parsed(bytes);
      if (!doc) return null;
      const d = new Map(doc);
      d.set("program", rng.pick<JVal>([null, true, num(0), "", "program", [], ["quote", num(1)]]));
      return admits(rerender(d));
    },
  },
  // ---------------------------------------------------------- raw bytes ---
  {
    id: "byte-flip",
    family: "byte",
    apply(bytes, rng) {
      if (bytes.length === 0) return null;
      const out = bytes.slice();
      const i = rng.below(out.length);
      out[i] = out[i]! ^ (1 << rng.below(8));
      return out;
    },
  },
  {
    id: "byte-insert",
    family: "byte",
    apply(bytes, rng) {
      if (bytes.length === 0 || bytes.length >= 400_000) return null;
      const i = rng.below(bytes.length + 1);
      const b = rng.pick([0x22, 0x2c, 0x3a, 0x7b, 0x7d, 0x5b, 0x5d, 0x00, 0x20, 0x7f, 0x80, 0xff, 0x65, 0x30]);
      const out = new Uint8Array(bytes.length + 1);
      out.set(bytes.subarray(0, i)); out[i] = b; out.set(bytes.subarray(i), i + 1);
      return out;
    },
  },
  {
    id: "byte-delete",
    family: "byte",
    apply(bytes, rng) {
      if (bytes.length < 2) return null;
      const i = rng.below(bytes.length);
      const out = new Uint8Array(bytes.length - 1);
      out.set(bytes.subarray(0, i)); out.set(bytes.subarray(i + 1), i);
      return out;
    },
  },
  {
    id: "byte-truncate",
    family: "byte",
    apply(bytes, rng) {
      if (bytes.length < 2) return null;
      return bytes.subarray(0, rng.below(bytes.length)).slice();
    },
  },
  {
    id: "byte-dup-segment",
    family: "byte",
    apply(bytes, rng) {
      if (bytes.length < 4 || bytes.length >= 200_000) return null;
      const start = rng.below(bytes.length - 1);
      const len = 1 + rng.below(Math.min(64, bytes.length - start));
      const seg = bytes.subarray(start, start + len);
      const at = rng.below(bytes.length + 1);
      const out = new Uint8Array(bytes.length + len);
      out.set(bytes.subarray(0, at)); out.set(seg, at); out.set(bytes.subarray(at), at + len);
      return out;
    },
  },
  {
    id: "byte-utf8-inject",
    family: "byte",
    apply(bytes, rng) {
      if (bytes.length === 0 || bytes.length >= 400_000) return null;
      const seq = rng.pick([
        [0x80], [0xbf], [0xc0, 0x80], [0xed, 0xa0, 0x80], [0xf4, 0x90, 0x80, 0x80],
        [0xfe], [0xff], [0xe2, 0x28, 0xa1], [0xf0, 0x9f, 0x98, 0x80],
      ]);
      const at = rng.below(bytes.length + 1);
      const out = new Uint8Array(bytes.length + seq.length);
      out.set(bytes.subarray(0, at)); out.set(seq, at); out.set(bytes.subarray(at), at + seq.length);
      return out;
    },
  },
  {
    id: "byte-escape-break",
    family: "byte",
    apply(bytes, rng) {
      if (bytes.length === 0 || bytes.length >= 400_000) return null;
      const frag = rng.pick([
        enc.encode("\\ud800"), enc.encode("\\udfff"), enc.encode("\\x"),
        enc.encode("\\u"), enc.encode("\\"), enc.encode('"'),
      ]);
      const at = rng.below(bytes.length + 1);
      const out = new Uint8Array(bytes.length + frag.length);
      out.set(bytes.subarray(0, at)); out.set(frag, at); out.set(bytes.subarray(at), at + frag.length);
      return out;
    },
  },
  {
    id: "byte-depth-push",
    family: "byte",
    apply(bytes, rng) {
      if (bytes.length >= 400_000) return null;
      const opens = rng.pick([1, 4, 60, 125, 128, 130]);
      const out = new Uint8Array(bytes.length + opens * 2);
      out.fill(0x5b, 0, opens);
      out.set(bytes, opens);
      out.fill(0x5d, opens + bytes.length);
      return out;
    },
  },
  {
    id: "byte-splice-other",
    family: "byte",
    apply(bytes, rng, other) {
      if (!other || bytes.length >= 400_000) return null;
      const take = Math.min(other.length, 64);
      const seg = other.subarray(other.length - take);
      const at = rng.below(bytes.length + 1);
      const out = new Uint8Array(bytes.length + seg.length);
      out.set(bytes.subarray(0, at)); out.set(seg, at); out.set(bytes.subarray(at), at + seg.length);
      return out;
    },
  },
];
