/**
 * verify/differential/gen.ts — deterministic generation of envelope byte
 * fixtures. Two generators:
 *   - raw-edge families: enumerated hostile byte spellings
 *   - seeded program generator over the mirrored op table with occasional
 *     deliberate defects (type confusion, bad arity, unbound names)
 *
 * All generation is deterministic under an explicit seed stream. Rendering
 * alternates canonical and "noisy" spellings (shuffled object keys, random
 * whitespace, mixed escape/number spellings) so the byte-level parser surface
 * is exercised without changing the admitted value.
 */

import { Rng } from "./prng";
import type { JVal } from "./json";

export type Envelope = { program: JVal; env?: ReadonlyMap<string, JVal>; fuel?: number | JVal; names?: JVal };

const NUM_POOL: readonly number[] = [
  0, -0, 1, -1, 2, 7, 42, -42, 0.5, -0.5, 2.5, -2.5, 0.1, 1e-7, -1e-7,
  1e21, -1e21, 5e-324, -5e-324, 2.2250738585072014e-308, 1.7976931348623157e308,
  9007199254740991, Number("9007199254740993"), Number("-9007199254740993"), 1e15, -1e15,
  Number("18446744073709551615"), 2 ** 64, -(2 ** 63),
  3.141592653589793, 1.5e300, -1.5e300,
];
const STR_POOL: readonly string[] = [
  "", "a", "abc", "Z", "0", "01", "10", "2", "4294967294", "4294967295",
  "4294967296", "1e2", "__proto__", "constructor", "prototype", "hasOwnProperty",
  "x", "é", "￿", "𐀀", "a\nb", "a\tb", " x ", "\u0000", "∀x",
  "a".repeat(20), "key-with-dash", "with space", "\\n", "\"quoted\"",
];
const VAR_POOL: readonly string[] = ["x", "y", "z", "acc", "it", "v", "_q", "n1"];

type Ctx = { rng: Rng; envKeys: string[]; scope: string[]; depth: number; nodes: number; nodeCap: number };

function num(v: number): JVal {
  return { kind: "num", f64: v, u64: Number.isSafeInteger(v) && v >= 0 ? BigInt(v) : null };
}

export function genValue(ctx: Ctx, depth: number): JVal {
  const roll = ctx.rng.below(100);
  if (depth <= 0 || roll < 55) {
    switch (ctx.rng.below(6)) {
      case 0: return null;
      case 1: return ctx.rng.bool(50);
      case 2: case 3: return num(ctx.rng.pick(NUM_POOL));
      default: return ctx.rng.pick(STR_POOL);
    }
  }
  if (roll < 80) {
    const n = ctx.rng.below(4);
    const out: JVal[] = [];
    for (let i = 0; i < n; i++) out.push(genValue(ctx, depth - 1));
    return out;
  }
  const n = ctx.rng.below(3);
  const out = new Map<string, JVal>();
  const keys = ctx.rng.bool(60) ? STR_POOL : ["a", "b", "k", "￿", "𐀀", "2", "10"];
  for (let i = 0; i < n; i++) out.set(ctx.rng.pick(keys), genValue(ctx, depth - 1));
  return out;
}

/** Programs cover the whole mirrored op table. Deliberate defect classes
 * (type confusion, arity, unbound names) are injected at a low rate. */
export function genProgram(ctx: Ctx, depth: number): JVal {
  const r = ctx.rng;
  const defect = r.bool(7);
  if (depth <= 0 || ctx.nodes >= ctx.nodeCap || r.bool(18)) {
    if (ctx.scope.length > 0 && r.bool(30)) return ["get", r.pick(ctx.scope)];
    if (ctx.envKeys.length > 0 && r.bool(30)) return ["get", r.pick(ctx.envKeys)];
    return genValue(ctx, 1);
  }
  ctx.nodes++;
  const table: [string, number, (op: string, argc: number) => JVal[]][] = [
    ["arith", 30, (op) => {
      const specTable: Record<string, readonly [number, number]> = { add: [1, 4], mul: [1, 3], sub: [2, 2], div: [2, 2], mod: [2, 2], neg: [1, 1], min: [1, 4], max: [1, 4], abs: [1, 1], floor: [1, 1], ceil: [1, 1], round: [1, 1], clamp: [3, 3] };
      const spec = specTable[op] ?? [1, 1];
      const n = spec[0] + r.below(spec[1] - spec[0] + 1);
      return Array.from({ length: defect ? spec[0] - 1 : n }, () => genOperand(ctx, depth));
    }],
    ["cmp", 12, () => [genOperand(ctx, depth), genOperand(ctx, depth)]],
    ["logic", 10, (op) => {
      if (op === "if") return [genOperand(ctx, depth), genOperand(ctx, depth), genOperand(ctx, depth)];
      const n = op === "not" ? 1 : 1 + r.below(3);
      return Array.from({ length: n }, () => genOperand(ctx, depth));
    }],
    ["binder", 12, (op) => {
      const v = r.pick(VAR_POOL);
      if (op === "let") {
        const init = genOperand(ctx, depth);
        ctx.scope.push(v);
        const body = genOperand(ctx, depth);
        ctx.scope.pop();
        return [v, init, body];
      }
      if (op === "fold") {
        const items = genOperand(ctx, depth - 1);
        const init = genOperand(ctx, depth);
        const acc = r.pick(VAR_POOL), item = r.pick(VAR_POOL);
        ctx.scope.push(acc, item);
        const body = genOperand(ctx, depth - 1);
        ctx.scope.length -= 2;
        return [items, init, acc, item, body];
      }
      const items = genOperand(ctx, depth - 1);
      ctx.scope.push(v);
      const body = genOperand(ctx, depth - 1);
      ctx.scope.pop();
      return [items, v, body];
    }],
    ["list", 14, (op) => {
      if (op === "list") return Array.from({ length: r.below(5) }, () => genOperand(ctx, depth));
      const l = ["quote", Array.from({ length: 1 + r.below(4) }, () => genValue(ctx, 1))] as JVal;
      const rest: Record<string, JVal[]> = {
        len: [], reverse: [], flat: [], unique: [], sort: [],
        nth: [num(r.below(4))], take: [num(r.below(3))], drop: [num(r.below(3))],
        contains: [genValue(ctx, 1)],
        concat: [l],
        map: [r.pick(VAR_POOL), genOperand(ctx, depth - 1)],
        filter: [r.pick(VAR_POOL), genOperand(ctx, depth - 1)],
      };
      return [l, ...(rest[op] ?? [])];
    }],
    ["string", 10, (op) => {
      const str = () => ["quote", r.pick(STR_POOL)] as JVal;
      const rest: Record<string, JVal[]> = {
        slen: [], upper: [], lower: [], trim: [],
        sconcat: Array.from({ length: r.below(3) }, str),
        split: [str()], join: [["quote", ["a", "b"]] as JVal],
        scontains: [str()], starts: [str()], ends: [str()],
      };
      return [str(), ...(rest[op] ?? [])];
    }],
    ["object", 6, (op) => {
      const m = ["quote", genValue(ctx, 2)] as JVal;
      if (op === "merge") return Array.from({ length: 1 + r.below(2) }, () => ["quote", genValue(ctx, 1)] as JVal);
      if (op === "has") return [m, r.pick(STR_POOL)];
      return [m];
    }],
    ["quote", 4, () => [genValue(ctx, 2)]],
    ["type", 4, () => [genOperand(ctx, depth)]],
    ["toText", 3, () => [genOperand(ctx, depth)]],
    ["get", 4, () => {
      const name = r.pick([...VAR_POOL, ...ctx.envKeys, ...STR_POOL.slice(4, 12)]);
      const path: JVal[] = [name];
      for (let i = r.below(3); i > 0; i--) path.push(r.bool(50) ? r.pick(STR_POOL) : num(r.below(3)));
      return path;
    }],
  ];
  const picked = table[r.below(table.length)]!;
  const ops: Record<string, string[]> = {
    arith: ["add", "sub", "mul", "div", "mod", "neg", "min", "max", "abs", "floor", "ceil", "round", "clamp"],
    cmp: ["lt", "lte", "gt", "gte", "eq", "neq"],
    logic: ["and", "or", "not", "if"],
    binder: ["let", "map", "filter", "fold"],
    list: ["list", "len", "nth", "concat", "map", "filter", "fold", "contains", "reverse", "take", "drop", "flat", "unique", "sort"],
    string: ["slen", "sconcat", "upper", "lower", "trim", "split", "join", "scontains", "starts", "ends"],
    object: ["has", "keys", "values", "merge"],
    quote: ["quote"], type: ["isText", "isNum", "isBool", "isList", "isMap", "isNull"], toText: ["toText"], get: ["get"],
  };
  const op = r.pick(ops[picked[0]]!);
  return [op, ...picked[2](op, 0)];
}

function genOperand(ctx: Ctx, depth: number): JVal {
  if (ctx.rng.bool(20)) return genValue(ctx, Math.min(2, depth));
  return genProgram(ctx, depth - 1);
}

/** Renders an envelope to bytes — canonical or noisy spelling. Noisy mode
 * keeps the same admitted value but reshuffles keys/whitespace/escapes so
 * the byte-level parser is exercised, not just canonical text. */
export function renderEnvelope(env: Envelope, rng: Rng, noisy: boolean): Uint8Array {
  const enc = new TextEncoder();
  const ws = (): string => noisy ? ["", " ", "  ", "\n", "\t", " \n "][rng.below(6)]! : "";
  const strLit = (s: string): string => {
    if (!noisy || s.length === 0 || rng.bool(70)) return JSON.stringify(s);
    // Random \uXXXX escaping of a substring — survives parse, same scalar string.
    const chars = [...s].map(c => c.charCodeAt(0) < 0x80 && !'\\"'.includes(c) && c.charCodeAt(0) >= 0x20 && rng.bool(30)
      ? `\\u${c.charCodeAt(0).toString(16).padStart(4, "0")}` : c === '"' ? '\\"' : c === "\\" ? "\\\\" : c);
    return '"' + chars.join("") + '"';
  };
  const numLit = (n: JVal & object): string => {
    const f = (n as { f64: number }).f64;
    if (!noisy || rng.bool(70)) return JSON.stringify(f);
    if (Number.isSafeInteger(f) && Math.abs(f) < 1e15) {
      if (f >= 0 && rng.bool(40)) return `${f}e0`;
      if (rng.bool(50)) return `${f}.0`;
      if (Math.abs(f) < 1e6 && rng.bool(30)) return f.toExponential(1);
    }
    return JSON.stringify(f);
  };
  const render = (v: JVal, depth: number): string => {
    if (v === null) return "null";
    if (typeof v === "boolean") return v ? "true" : "false";
    if (typeof v === "string") return strLit(v);
    if (Array.isArray(v)) return `[${v.map(i => ws() + render(i, depth + 1) + ws()).join(",")}]`;
    if (!(v instanceof Map)) return numLit(v);
    const keys = [...v.keys()];
    if (noisy) for (let i = keys.length - 1; i > 0; i--) { const j = rng.below(i + 1); [keys[i], keys[j]] = [keys[j]!, keys[i]!]; }
    return `{${keys.map(k => `${ws()}${strLit(k)}${ws()}:${ws()}${render(v.get(k)!, depth + 1)}${ws()}`).join(",")}}`;
  };
  const out = new Map<string, JVal>();
  out.set("program", env.program);
  if (env.env !== undefined) out.set("env", env.env);
  if (env.fuel !== undefined) out.set("fuel", typeof env.fuel === "number" ? { kind: "num", f64: env.fuel, u64: BigInt(Math.max(0, env.fuel)) } : env.fuel);
  if (env.names !== undefined) out.set("names", env.names);
  return enc.encode(render(out, 0));
}
