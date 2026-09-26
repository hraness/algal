// Seeded deterministic generation for expr-conformance.
//
// The generator produces bounded expression programs over the modelled op
// subset plus generated environments. Every case is reproducible: the same
// seed produces the same program, env, and request bytes. Generator output is
// admitted through `admit` (verify/expr/model.ts) — programs that would fall
// outside the modelled domain are never produced: finite numbers, scalar
// strings, program depth ≤ 8, node count far under the 512 bound.
//
// Type-directed generation keeps most programs eval-valid; a bounded fault
// injector (~1 in 6 cases) plants a seeded runtime fault (type error,
// divide-by-zero, index path error, arg error, nonfinite arithmetic, computed
// unbound get). Static faults (bad arity, unknown op, bad binder, unbound
// literal get) are authored in the check-reject family in catalog.ts — this
// generator only emits check-passing programs.

import { admit, type MV } from "./model";

/** xorshift32 — same construction as verify/corpus/generate.ts; rejects the
 *  absorbing seed. */
export class Random {
  private state: number;
  constructor(seed: number) {
    if (!Number.isInteger(seed) || seed <= 0 || seed > 0xffffffff) {
      throw new Error("seed must be a nonzero uint32");
    }
    this.state = seed;
  }
  next(): number {
    let x = this.state;
    x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
    this.state = x >>> 0;
    return this.state;
  }
  below(n: number): number { return this.next() % n; }
  pick<T>(items: readonly T[]): T { return items[this.below(items.length)]!; }
  chance(numerator: number, denominator: number): boolean {
    return this.below(denominator) < numerator;
  }
}

const NUMS: readonly number[] = [-9, -3, -1, -0.5, 0, 0.5, 1, 2, 3, 4, 7, 9, 12, 100, 1e4, 0.1, 2.5, -2.5];
const STRS: readonly string[] = [
  "", "a", "b", "x", "ab", "abc", "héllo", "wörld", "😀", "a😀e", "é", "  pad  ",
  "0", "10", "2", "key", "null", "true", "CamelCase", "with space", "end,dot.",
];
const NAMES: readonly string[] = ["n", "d", "s", "t", "b", "xs", "ss", "ys", "m", "nested", "pair", "words"];

export interface Generated {
  program: unknown;
  env: Record<string, unknown>;
}

interface G {
  rng: Random;
  env: Record<string, unknown>;
  names: string[];
  scope: string[];
}

function numLit(rng: Random): number {
  const n = rng.pick(NUMS);
  return n === -0.5 && rng.chance(1, 8) ? -0.5 : n;
}
const strLit = (rng: Random): string => rng.pick(STRS);

export function genEnv(rng: Random): Record<string, unknown> {
  const env: Record<string, unknown> = {
    n: numLit(rng),
    d: rng.pick([0.5, -1.5, 2.25, 7, -3]),
    s: strLit(rng),
    t: strLit(rng),
    b: rng.chance(1, 2),
    xs: Array.from({ length: rng.below(6) + 1 }, () => numLit(rng)),
    ss: Array.from({ length: rng.below(4) + 1 }, () => strLit(rng)),
    ys: Array.from({ length: rng.below(5) + 2 }, () => rng.pick([numLit(rng), strLit(rng), rng.chance(1, 3) ? null : rng.pick(NUMS)]) as unknown),
    m: { "2": numLit(rng), "10": numLit(rng), a: strLit(rng), b: numLit(rng) },
    nested: { a: { b: [numLit(rng), numLit(rng), strLit(rng)] }, k: strLit(rng) },
    pair: [numLit(rng), numLit(rng)],
    words: Array.from({ length: rng.below(4) + 1 }, () => strLit(rng)),
  };
  if (rng.chance(1, 4)) env["zero"] = [null];
  if (rng.chance(1, 4)) env["extra"] = { deep: { deeper: strLit(rng) } };
  return env;
}

// The number of context levels a recursive generator may descend. Programs
// stay well under MAX_PROGRAM_DEPTH (16) so boundary faults never come from
// accidental nesting.
const MAX_GEN_DEPTH = 7;

/** `["get", <in-scope name>, <optional path steps>]`. Literal head names are
 *  drawn from env keys plus live binder names so `check` always admits them. */
function scopeGet(g: G): unknown | null {
  const pool = [...new Set([...g.names, ...g.scope])]
    .filter(n => Object.hasOwn(g.env, n) || g.scope.includes(n));
  if (pool.length === 0) return null;
  const name = g.rng.pick(pool);
  const v = g.env[name];
  const steps: unknown[] = [];
  if (g.rng.chance(1, 4)) {
    if (Array.isArray(v)) steps.push(g.rng.below(v.length + 2));
    else if (v !== null && typeof v === "object") steps.push(strLit(g.rng));
    else if (g.rng.chance(1, 2)) steps.push(strLit(g.rng));
  }
  return ["get", name, ...steps];
}

const binderGet = (g: G): unknown | null =>
  g.scope.length === 0 ? null : scopeGet(g);

function genNum(g: G, d: number): unknown {
  const r = g.rng;
  if (d >= MAX_GEN_DEPTH || r.chance(3, 10)) {
    const alt = r.chance(1, 3) ? binderGet(g) : null;
    return alt ?? numLit(r);
  }
  switch (r.below(14)) {
    case 0: case 1: return ["add", genNum(g, d + 1), genNum(g, d + 1)];
    case 2: return ["sub", genNum(g, d + 1), genNum(g, d + 1)];
    case 3: return ["mul", genNum(g, d + 1), genNum(g, d + 1)];
    case 4: return ["div", genNum(g, d + 1), genNum(g, d + 1)];
    case 5: return [r.pick(["neg", "abs", "floor", "ceil", "round"]), genNum(g, d + 1)];
    case 6: return ["clamp", genNum(g, d + 1), numLit(r), numLit(r)];
    case 7: return [r.pick(["min", "max"]), genNum(g, d + 1), genNum(g, d + 1)];
    case 8: return ["len", genList(g, d + 1)];
    case 9: return ["nth", genList(g, d + 1), r.below(4)];
    case 10: return ["if", genBool(g, d + 1), genNum(g, d + 1), genNum(g, d + 1)];
    case 11: return ["get", r.pick(g.names.filter(n => typeof g.env[n] === "number"))];
    case 12: {
      const xs = genList(g, d + 1);
      const saved = [...g.scope];
      g.scope.push("acc", "it");
      const body = ["add", ["get", "acc"], ["get", "it"]];
      g.scope = saved;
      return ["fold", xs, numLit(r), "acc", "it", body];
    }
    default: {
      const name = `v${r.below(3)}`;
      const saved = [...g.scope];
      g.scope.push(name);
      const body = genNum(g, d + 1);
      g.scope = saved;
      return ["let", name, genNum(g, d + 1), body];
    }
  }
}

function genBool(g: G, d: number): unknown {
  const r = g.rng;
  if (d >= MAX_GEN_DEPTH || r.chance(3, 10)) {
    const alt = r.chance(1, 4) ? binderGet(g) : null;
    return alt ?? r.chance(1, 2);
  }
  switch (r.below(14)) {
    case 0: case 1: return [r.pick(["lt", "lte", "gt", "gte"]), genNum(g, d + 1), genNum(g, d + 1)];
    case 2: return [r.pick(["lt", "gte"]), genStr(g, d + 1), genStr(g, d + 1)];
    case 3: case 4: return [r.pick(["eq", "neq"]), genAny(g, d + 1), genAny(g, d + 1)];
    case 5: return ["and", genBool(g, d + 1), genBool(g, d + 1)];
    case 6: return ["or", genBool(g, d + 1), genBool(g, d + 1)];
    case 7: return ["not", genBool(g, d + 1)];
    case 8: return ["if", genBool(g, d + 1), genBool(g, d + 1), genBool(g, d + 1)];
    case 9: return ["contains", genList(g, d + 1), genAny(g, d + 1)];
    case 10: return [r.pick(["scontains", "starts", "ends"]), genStr(g, d + 1), genStr(g, d + 1)];
    case 11: return ["has", genMap(g, d + 1), genStr(g, d + 1)];
    case 12: return [r.pick(["isText", "isNum", "isBool", "isList", "isMap", "isNull"]), genAny(g, d + 1)];
    default: return ["get", r.pick(g.names.filter(n => typeof g.env[n] === "boolean"))];
  }
}

function genStr(g: G, d: number): unknown {
  const r = g.rng;
  if (d >= MAX_GEN_DEPTH || r.chance(3, 10)) {
    const alt = r.chance(1, 4) ? binderGet(g) : null;
    return alt ?? strLit(r);
  }
  switch (r.below(10)) {
    case 0: case 1: return ["sconcat", genStr(g, d + 1), genStr(g, d + 1)];
    case 2: return [r.pick(["upper", "lower", "trim"]), genStr(g, d + 1)];
    case 3: return ["join", ["list", ...Array.from({ length: r.below(4) + 1 }, () => strLit(r))], strLit(r)];
    case 4: return ["if", genBool(g, d + 1), genStr(g, d + 1), genStr(g, d + 1)];
    case 5: {
      const name = r.pick(g.names.filter(n => typeof g.env[n] === "string"));
      return r.chance(1, 4) ? ["get", name, strLit(r)] : ["get", name];
    }
    case 6: return ["nth", genStrList(g, d + 1), r.below(4)];
    case 7: return ["sconcat", ["upper", genStr(g, d + 1)], genStr(g, d + 1)];
    default: {
      const name = `v${r.below(3)}`;
      const saved = [...g.scope];
      g.scope.push(name);
      const body = genStr(g, d + 1);
      g.scope = saved;
      return ["let", name, genStr(g, d + 1), body];
    }
  }
}

function genStrList(g: G, d: number): unknown {
  const r = g.rng;
  if (d >= MAX_GEN_DEPTH || r.chance(4, 10)) {
    return ["list", ...Array.from({ length: r.below(4) + 1 }, () => strLit(r))];
  }
  switch (r.below(6)) {
    case 0: return ["concat", genStrList(g, d + 1), genStrList(g, d + 1)];
    case 1: return ["take", genStrList(g, d + 1), r.below(4)];
    case 2: return ["drop", genStrList(g, d + 1), r.below(3)];
    case 3: return ["reverse", genStrList(g, d + 1)];
    case 4: return ["unique", genStrList(g, d + 1)];
    default: return ["get", r.pick(g.names.filter(n => {
      const v = g.env[n];
      return Array.isArray(v) && v.every(x => typeof x === "string");
    }))];
  }
}

function genList(g: G, d: number): unknown {
  const r = g.rng;
  if (d >= MAX_GEN_DEPTH || r.chance(4, 10)) {
    if (r.chance(1, 2)) return ["get", r.pick(g.names.filter(n => Array.isArray(g.env[n])))];
    return ["list", ...Array.from({ length: r.below(5) + 1 }, () => genScalar(g, d + 1))];
  }
  switch (r.below(9)) {
    case 0: return ["concat", genList(g, d + 1), genList(g, d + 1)];
    case 1: return [r.pick(["take", "drop"]), genList(g, d + 1), r.below(4)];
    case 2: return ["reverse", genList(g, d + 1)];
    case 3: return ["unique", genList(g, d + 1)];
    case 4: {
      const xs = genList(g, d + 1);
      const name = `it${r.below(3)}`;
      const saved = [...g.scope];
      g.scope.push(name);
      const body = genAny(g, d + 1);
      g.scope = saved;
      return ["map", xs, name, body];
    }
    case 5: {
      const xs = genList(g, d + 1);
      const name = `it${r.below(3)}`;
      const saved = [...g.scope];
      g.scope.push(name);
      const body = genBool(g, d + 1);
      g.scope = saved;
      return ["filter", xs, name, body];
    }
    case 6: return ["flat", ["list", genList(g, d + 1), genList(g, d + 1)]];
    case 7: return ["split", genStr(g, d + 1), strLit(r) === "" ? "," : strLit(r)];
    default: return ["if", genBool(g, d + 1), genList(g, d + 1), genList(g, d + 1)];
  }
}

function genMap(g: G, d: number): unknown {
  const r = g.rng;
  if (d >= MAX_GEN_DEPTH || r.chance(4, 10)) {
    const keys = ["a", "b", "2", "10", "k1", "z"].sort(() => r.below(3) - 1);
    const entries = keys.slice(0, r.below(4) + 1);
    const obj: Record<string, unknown> = {};
    for (const k of entries) obj[k] = genScalar(g, d + 1);
    return obj;
  }
  switch (r.below(4)) {
    case 0: case 1: return ["merge", genMap(g, d + 1), genMap(g, d + 1)];
    case 2: return ["if", genBool(g, d + 1), genMap(g, d + 1), genMap(g, d + 1)];
    default: return ["get", r.pick(g.names.filter(n => {
      const v = g.env[n];
      return v !== null && typeof v === "object" && !Array.isArray(v);
    }))];
  }
}

function genScalar(g: G, d: number): unknown {
  const r = g.rng;
  switch (r.below(6)) {
    case 0: return numLit(r);
    case 1: return strLit(r);
    case 2: return r.chance(1, 2);
    case 3: return null;
    case 4: return d < MAX_GEN_DEPTH ? genNum(g, d + 1) : numLit(r);
    default: return d < MAX_GEN_DEPTH ? genBool(g, d + 1) : r.chance(1, 2);
  }
}

function genAny(g: G, d: number): unknown {
  const r = g.rng;
  if (d >= MAX_GEN_DEPTH) return genScalar(g, d);
  switch (r.below(8)) {
    case 0: case 1: return genNum(g, d + 1);
    case 2: return genBool(g, d + 1);
    case 3: return genStr(g, d + 1);
    case 4: return genList(g, d + 1);
    case 5: return genMap(g, d + 1);
    case 6: return ["get", r.pick(g.names), ...(r.chance(1, 3) ? [strLit(r)] : [])];
    default: return genScalar(g, d + 1);
  }
}

/** Deterministic seeded runtime faults — every one is check-passing (eval-
 *  level faults only) so the three runtimes exercise the same error paths. */
function injectFault(g: G): unknown | null {
  const r = g.rng;
  switch (r.below(10)) {
    case 0: return ["div", genNum(g, 0), r.chance(1, 2) ? 0 : ["sub", numLit(r), numLit(r)]];
    case 1: return ["add", genStr(g, 0), genNum(g, 0)];
    case 2: return ["nth", genList(g, 0), 8 + r.below(90)];
    case 3: return ["clamp", genNum(g, 0), 9, 1];
    case 4: return ["split", genStr(g, 0), ""];
    case 5: return ["add", 1e308, 1e308];
    case 6: return ["len", genStr(g, 0)];
    case 7: return ["and", genBool(g, 0), genNum(g, 0)];
    case 8: return ["get", ["sconcat", "nope", "missing"]];
    default: return ["nth", genStrList(g, 0), ["sub", 0, 3]];
  }
}

/** Generate one deterministic case. `fault` plants a seeded runtime fault on
 *  ~1 in 6 calls; `program` stays inside the modelled op set always. */
export function generate(seed: number, index: number): Generated {
  const rng = new Random((seed ^ ((index + 1) * 0x9e3779b9)) >>> 0);
  const env = genEnv(rng);
  const g: G = { rng, env, names: Object.keys(env), scope: [] };
  const program = rng.chance(1, 6) ? injectFault(g) ?? genAny(g, 0) : genAny(g, 0);
  return { program, env };
}

/** Cheap sanity admission: the generated program/env enter the modelled
 *  domain and stay inside the program bounds the suite samples. */
export function admitGenerated(out: Generated): { program: MV; env: Map<string, MV> } {
  return { program: admit(out.program), env: admit(out.env) };
}
