/**
 * verify/differential/oracle.ts — independent decision engine for the
 * algal.expr.v1 host boundary. Mirrors the documented evaluator contract
 * (envelope admission, static bounds, op table, fuel accounting, value
 * bounds, canonical output) on this lane's own JVal domain. No production
 * code is imported; disagreements between this mirror and any production
 * target are differential findings, not oracle failures.
 *
 * Scope of the mirror:
 *  - Full `eval_json` and `check_json` envelopes: parse (json.ts), program
 *    presence, env defaulting, fuel class, env/program bound pipeline order.
 *  - The complete op table with mirrored argument-evaluation order, error
 *    order, and fuel accounting. Where the mirror deliberately cannot decide
 *    (kept empty — see Uncovered), the prediction degrades to class-only
 *    cross-target comparison.
 *  - Predictions compare: full canonical response bytes for ok results,
 *    error code + spent fuel for errors. Error detail fields are covered by
 *    committed-WASM/native byte equality, not by this oracle.
 */

import { parseJsonBytes, type JNum, type JVal } from "./json";
import { BOUNDS, Bounds, canonical, canonicalBytes, countNodes, isNum, keyOrder, mapBytes, mapDepth, utf8Compare, valueBytes, valueDepth } from "./canonical";

// ------------------------------------------------------------ error model ---

export type Prediction =
  | { ok: true; value: JVal; fuel: number }
  | { ok: false; code: string; fuel: number }
  | { ok: "uncovered" };

export class OracleReject extends Error {
  constructor(readonly code: string, message: string) { super(message); this.name = "OracleReject"; }
}
/** Marker: the mirror declines to predict this case. Cross-target only. */
class Uncovered extends Error {}

type E = { code: string; fuel?: number };
const errAt = (code: string): OracleReject => new OracleReject(code, code);

// ------------------------------------------------------------ op schema -----

const V = -1; // variadic
type Spec = { min: number; max: number; binders: readonly number[] };
const s = (min: number, max: number): Spec => ({ min, max, binders: [] });
const b = (min: number, max: number, binders: readonly number[]): Spec => ({ min, max, binders });
const OP_SPECS: ReadonlyMap<string, Spec> = new Map(Object.entries({
  add: s(1, V), sub: s(2, 2), mul: s(1, V), div: s(2, 2), mod: s(2, 2), neg: s(1, 1),
  min: s(1, V), max: s(1, V), abs: s(1, 1), floor: s(1, 1), ceil: s(1, 1), round: s(1, 1), clamp: s(3, 3),
  lt: s(2, 2), lte: s(2, 2), gt: s(2, 2), gte: s(2, 2), eq: s(2, 2), neq: s(2, 2),
  and: s(1, V), or: s(1, V), not: s(1, 1), if: s(3, 3), let: b(3, 3, [0]), get: s(1, V),
  list: s(0, V), len: s(1, 1), nth: s(2, 2), concat: s(1, V),
  map: b(3, 3, [1]), filter: b(3, 3, [1]), fold: b(5, 5, [2, 3]),
  contains: s(2, 2), reverse: s(1, 1), take: s(2, 2), drop: s(2, 2),
  flat: s(1, 1), unique: s(1, 1), sort: s(1, 1),
  slen: s(1, 1), sconcat: s(1, V), upper: s(1, 1), lower: s(1, 1), trim: s(1, 1),
  split: s(2, 2), join: s(2, 2), scontains: s(2, 2), starts: s(2, 2), ends: s(2, 2),
  has: s(2, 2), keys: s(1, 1), values: s(1, 1), merge: s(1, V), toText: s(1, 1),
  isText: s(1, 1), isNum: s(1, 1), isBool: s(1, 1), isList: s(1, 1), isMap: s(1, 1), isNull: s(1, 1),
  quote: s(1, 1),
}));

const BASE_COST = (op: string, argc: number): number =>
  ["and", "or", "not", "if", "let", "quote", "list", "isText", "isNum", "isBool", "isList", "isMap", "isNull"].includes(op) ? 1
    : op === "get" ? 2 + argc : 2;

const isVarName = (s: string): boolean => s.length > 0 && s.length <= BOUNDS.maxVarLen && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(s);

export function kindOf(v: JVal): string {
  if (v === null) return "null";
  if (typeof v === "boolean") return "bool";
  if (isNum(v)) return "number";
  if (typeof v === "string") return "text";
  if (Array.isArray(v)) return "list";
  return "map";
}

// -------------------------------------------------------- static check ----

/** Mirrors `check(node, depth, scope)` — sorted-key (UTF-8) object order,
 * array order, binder-scope widening on the last argument only. */
export function check(node: JVal, depth: number, scope: string[]): void {
  if (depth > BOUNDS.maxProgramDepth) throw new Bounds("program-depth", BOUNDS.maxProgramDepth);
  if (Array.isArray(node)) {
    const head = node[0];
    if (typeof head !== "string") throw new OracleReject("EXPR_PARSE", "op head must be a string");
    const spec = OP_SPECS.get(head);
    if (!spec) throw new OracleReject("EXPR_OP", `unknown op ${head}`);
    const argc = node.length - 1;
    if (argc < spec.min || (spec.max !== V && argc > spec.max)) throw new OracleReject("EXPR_ARITY", `${head} arity ${argc}`);
    for (const i of spec.binders) {
      const name = node[1 + i];
      if (typeof name !== "string" || !isVarName(name)) throw new OracleReject("EXPR_PARSE", `binder arg ${i} must be an identifier <= ${BOUNDS.maxVarLen} chars`);
    }
    if (head === "quote") return;
    if (head === "get") {
      const first = node[1];
      if (typeof first === "string" && !scope.includes(first)) throw new OracleReject("EXPR_PATH", `unbound name "${first}"`);
    }
    for (let i = 1; i < node.length; i++) {
      if (i === node.length - 1 && spec.binders.length > 0) {
        for (const p of spec.binders) {
          const name = node[1 + p];
          if (typeof name === "string") scope.push(name);
        }
        check(node[i]!, depth + 1, scope);
        scope.length -= spec.binders.length;
      } else check(node[i]!, depth + 1, scope);
    }
    return;
  }
  if (node instanceof Map) {
    const keys = [...node.keys()].sort(utf8Compare);
    for (const k of keys) check(node.get(k)!, depth + 1, scope);
    return;
  }
}

export function checkProgram(program: JVal, names: ReadonlySet<string>): void {
  if (canonicalBytes(program) > BOUNDS.maxProgramBytes) throw new Bounds("program-bytes", BOUNDS.maxProgramBytes);
  if (countNodes(program) > BOUNDS.maxProgramNodes) throw new Bounds("program-nodes", BOUNDS.maxProgramNodes);
  check(program, 1, [...names]);
}

// ------------------------------------------------------------------ eval ----

class FuelExhausted extends Error {
  constructor(readonly cost: number, readonly left: number) { super("EXPR_FUEL"); }
}
class EvalError extends Error {
  constructor(readonly code: string, message: string) { super(message); }
}
const boundsError = (e: Bounds): EvalError => new EvalError("EXPR_BOUNDS", e.what);
const errType = (op: string, arg: number, want: string, got: string): EvalError =>
  new EvalError("EXPR_TYPE", `${op} arg ${arg} want ${want} got ${got}`);
const errPath = (op: string, what: string): EvalError => new EvalError("EXPR_PATH", what);
const errNum = (op: string): EvalError => new EvalError("EXPR_NUM", op);
const errDiv = (op: string): EvalError => new EvalError("EXPR_DIV_ZERO", op);
const errArg = (op: string, what: string): EvalError => new EvalError("EXPR_ARG", what);

const utf8 = (s: string): number => new TextEncoder().encode(s).byteLength;

export function eqValues(a: JVal, b: JVal): boolean {
  if (isNum(a) && isNum(b)) return a.f64 === b.f64;
  if (a === null || b === null) return a === b;
  if (typeof a === "boolean" && typeof b === "boolean") return a === b;
  if (typeof a === "string" && typeof b === "string") return a === b;
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((x, i) => eqValues(x, b[i]!));
  if (a instanceof Map && b instanceof Map) {
    if (a.size !== b.size) return false;
    for (const [k, v] of a) { const w = b.get(k); if (w === undefined || !eqValues(v, w)) return false; }
    return true;
  }
  return false;
}

function cmpValues(a: JVal, b: JVal): number {
  const rank = (v: JVal): number => v === null ? 0 : typeof v === "boolean" ? 1 : isNum(v) ? 2 : typeof v === "string" ? 3 : Array.isArray(v) ? 4 : 5;
  const r = rank(a) - rank(b);
  if (r !== 0) return r;
  if (typeof a === "boolean" && typeof b === "boolean") return Number(a) - Number(b);
  if (isNum(a) && isNum(b)) return a.f64 < b.f64 ? -1 : a.f64 > b.f64 ? 1 : 0;
  if (typeof a === "string" && typeof b === "string") return a < b ? -1 : a > b ? 1 : 0;
  if (Array.isArray(a) && Array.isArray(b)) {
    for (let i = 0; i < Math.min(a.length, b.length); i++) {
      const c = cmpValues(a[i]!, b[i]!);
      if (c !== 0) return c;
    }
    return a.length - b.length;
  }
  if (a instanceof Map && b instanceof Map) return utf8Compare(canonical(a), canonical(b));
  return 0;
}

export class Mirror {
  scope: [string, JVal][] = [];
  left: number;
  constructor(readonly env: ReadonlyMap<string, JVal>, readonly budget: number) {
    this.left = budget;
  }
  spend(cost: number): void {
    if (cost > this.left) throw new FuelExhausted(cost, this.left);
    this.left -= cost;
  }
  num(node: JVal, op: string, arg: number): number {
    const v = this.eval(node);
    if (isNum(v)) return v.f64;
    throw errType(op, arg, "number", kindOf(v));
  }
  string(node: JVal, op: string, arg: number): string {
    const v = this.eval(node);
    if (typeof v === "string") return v;
    throw errType(op, arg, "string", kindOf(v));
  }
  list(node: JVal, op: string, arg: number): JVal[] {
    const v = this.eval(node);
    if (Array.isArray(v)) return v;
    throw errType(op, arg, "list", kindOf(v));
  }
  object(node: JVal, op: string, arg: number): ReadonlyMap<string, JVal> {
    const v = this.eval(node);
    if (v instanceof Map) return v;
    throw errType(op, arg, "map", kindOf(v));
  }
  bool(v: JVal, op: string, arg: number): boolean {
    if (typeof v === "boolean") return v;
    throw errType(op, arg, "bool", kindOf(v));
  }
  evalArgs(arr: JVal[]): JVal[] {
    const out: JVal[] = [];
    let bytes = 2;
    for (const a of arr.slice(1)) {
      const value = this.eval(a);
      try {
        bytes += valueBytes(value, 0) + (out.length === 0 ? 0 : 1);
        if (bytes > BOUNDS.maxValueBytes) throw new Bounds("value-bytes", BOUNDS.maxValueBytes);
      } catch (e) { throw e instanceof Bounds ? boundsError(e) : e; }
      out.push(value);
    }
    return out;
  }
  eval(node: JVal): JVal {
    let result: JVal;
    try {
      if (Array.isArray(node)) {
        const head = node[0];
        const op = typeof head === "string" ? head : "";
        this.spend(BASE_COST(op, node.length - 1));
        result = this.op(op, node);
      } else if (node instanceof Map) {
        this.spend(1);
        if (node.size > BOUNDS.maxObjectKeys) throw boundsError(new Bounds("object-keys", BOUNDS.maxObjectKeys));
        const out = new Map<string, JVal>();
        let bytes = 2;
        for (const k of [...node.keys()].sort(utf8Compare)) {
          const base = this.scope.length;
          let value: JVal;
          try { value = this.eval(node.get(k)!); }
          finally { this.scope.length = base; }
          const kb = canonicalBytes(k) + 1 + (out.size === 0 ? 0 : 1);
          bytes += kb;
          if (bytes > BOUNDS.maxValueBytes) throw boundsError(new Bounds("value-bytes", BOUNDS.maxValueBytes));
          bytes += valueBytes(value, 1);
          if (bytes > BOUNDS.maxValueBytes) throw boundsError(new Bounds("value-bytes", BOUNDS.maxValueBytes));
          out.set(k, value);
        }
        result = out;
      } else {
        this.spend(1);
        result = node;
      }
    } catch (e) {
      if (e instanceof Bounds) throw boundsError(e);
      throw e;
    }
    try { valueBytes(result, 0); } catch (e) { throw e instanceof Bounds ? boundsError(e) : e; }
    return result;
  }
  op(op: string, arr: JVal[]): JVal {
    const argc = arr.length - 1;
    const at = (i: number): JVal => i < arr.length ? arr[i]! : null;
    switch (op) {
      case "add": case "mul": {
        const args = this.evalArgs(arr);
        let acc = op === "add" ? 0 : 1;
        for (let i = 0; i < args.length; i++) {
          const v = args[i]!;
          if (!isNum(v)) throw errType(op, i, "number", kindOf(v));
          acc = op === "add" ? acc + v.f64 : acc * v.f64;
        }
        if (!Number.isFinite(acc)) throw errNum(op);
        return { kind: "num", f64: acc, u64: null };
      }
      case "sub": case "div": case "mod": {
        const a = this.num(at(1), op, 0), b = this.num(at(2), op, 1);
        if ((op === "div" || op === "mod") && b === 0) throw errDiv(op);
        const r = op === "sub" ? a - b : op === "div" ? a / b : a % b;
        if (!Number.isFinite(r)) throw errNum(op);
        return { kind: "num", f64: r, u64: null };
      }
      case "neg": {
        const v = -this.num(at(1), op, 0);
        if (!Number.isFinite(v)) throw errNum(op);
        return { kind: "num", f64: v, u64: null };
      }
      case "min": case "max": {
        const args = this.evalArgs(arr);
        const first = args[0]!;
        if (!isNum(first)) throw errType(op, 0, "number", kindOf(first));
        let best = first.f64;
        for (let i = 1; i < args.length; i++) {
          const v = args[i]!;
          if (!isNum(v)) throw errType(op, i, "number", kindOf(v));
          best = op === "min" ? Math.min(best, v.f64) : Math.max(best, v.f64);
        }
        return { kind: "num", f64: best, u64: null };
      }
      case "abs": case "floor": case "ceil": case "round": {
        const n = this.num(at(1), op, 0);
        const f = Math.floor(n);
        const r = op === "abs" ? Math.abs(n) : op === "floor" ? f : op === "ceil" ? Math.ceil(n) : n - f < 0.5 ? f : f + 1;
        if (!Number.isFinite(r)) throw errNum(op);
        return { kind: "num", f64: r, u64: null };
      }
      case "clamp": {
        const x = this.num(at(1), op, 0), lo = this.num(at(2), op, 1), hi = this.num(at(3), op, 2);
        if (lo > hi) throw errArg(op, "clamp lo must be <= hi");
        return { kind: "num", f64: Math.max(lo, Math.min(hi, x)), u64: null };
      }
      case "lt": case "lte": case "gt": case "gte": {
        const args = this.evalArgs(arr);
        const a = args[0]!, bb = args[1]!;
        let r: boolean;
        if (isNum(a) && isNum(bb)) r = op === "lt" ? a.f64 < bb.f64 : op === "lte" ? a.f64 <= bb.f64 : op === "gt" ? a.f64 > bb.f64 : a.f64 >= bb.f64;
        else if (typeof a === "string" && typeof bb === "string") {
          const c = a < bb ? -1 : a > bb ? 1 : 0;
          r = op === "lt" ? c < 0 : op === "lte" ? c <= 0 : op === "gt" ? c > 0 : c >= 0;
        } else throw errType(op, 0, "two numbers or two strings", `${kindOf(a)},${kindOf(bb)}`);
        return r;
      }
      case "eq": case "neq": {
        const args = this.evalArgs(arr);
        this.spend(countNodes(args[0]!) + countNodes(args[1]!));
        const r = eqValues(args[0]!, args[1]!);
        return op === "eq" ? r : !r;
      }
      case "and": case "or": {
        const want = op === "and";
        for (let i = 1; i < arr.length; i++) {
          const v = this.eval(arr[i]!);
          if (this.bool(v, op, i - 1) !== want) return !want;
        }
        return want;
      }
      case "not": return !this.bool(this.eval(at(1)), op, 0);
      case "if": {
        const c = this.bool(this.eval(at(1)), op, 0);
        return this.eval(at(c ? 2 : 3));
      }
      case "let": {
        const head = arr[1];
        const name = typeof head === "string" ? head : "";
        const v = this.eval(at(2));
        const base = this.scope.length;
        this.scope.push([name, v]);
        try { return this.eval(at(3)); } finally { this.scope.length = base; }
      }
      case "get": {
        const first = this.eval(at(1));
        if (typeof first !== "string") throw errType(op, 0, "name string", kindOf(first));
        let cur: JVal | undefined;
        for (let i = this.scope.length - 1; i >= 0; i--) if (this.scope[i]![0] === first) { cur = this.scope[i]![1]; break; }
        if (cur === undefined) cur = this.env.get(first);
        if (cur === undefined) throw errPath(op, `unbound name "${first}"`);
        for (let i = 2; i < arr.length; i++) {
          const k = this.eval(arr[i]!);
          const step = i - 1;
          if (typeof k === "string") {
            if (cur instanceof Map) {
              const hit = cur.get(k);
              if (hit === undefined) return null;
              cur = hit;
            } else return null;
          } else if (isNum(k)) {
            const idx = k.f64;
            if (idx < 0 || idx % 1 !== 0) throw errType(op, step, "nonneg integer index", "number");
            if (Array.isArray(cur)) {
              const hit = cur[idx];
              if (hit === undefined) return null;
              cur = hit;
            } else return null;
          } else throw errType(op, step, "string key or nonneg integer index", kindOf(k));
        }
        return cur;
      }
      case "list": {
        const args = this.evalArgs(arr);
        if (args.length > BOUNDS.maxListLen) throw boundsError(new Bounds("list-len", BOUNDS.maxListLen));
        return args;
      }
      case "len": return { kind: "num", f64: this.list(at(1), op, 0).length, u64: null };
      case "nth": {
        const items = this.list(at(1), op, 0);
        const i = this.eval(at(2));
        const index = isNum(i) && i.f64 >= 0 && i.f64 % 1 === 0 ? i.f64 : null;
        if (index === null) throw errType(op, 1, "nonneg integer", kindOf(i));
        if (index >= items.length) throw errPath(op, `index ${canonical(i)} out of range ${items.length}`);
        return items[index]!;
      }
      case "concat": {
        const args = this.evalArgs(arr);
        let total = 0;
        for (let i = 0; i < args.length; i++) {
          const v = args[i]!;
          if (!Array.isArray(v)) throw errType(op, i, "list", kindOf(v));
          total += v.length;
        }
        this.spend(total);
        if (total > BOUNDS.maxListLen) throw boundsError(new Bounds("list-len", BOUNDS.maxListLen));
        const out: JVal[] = [];
        for (const v of args) out.push(...(v as JVal[]));
        return out;
      }
      case "map": case "filter": {
        const items = this.list(at(1), op, 0);
        const head = arr[2];
        const name = typeof head === "string" ? head : "";
        const body = at(3);
        const out: JVal[] = [];
        let bytes = 2;
        for (let i = 0; i < items.length; i++) {
          this.spend(1);
          const base = this.scope.length;
          this.scope.push([name, items[i]!]);
          let v: JVal;
          try { v = this.eval(body); } finally { this.scope.length = base; }
          if (op === "map") {
            bytes += valueBytes(v, 1) + (out.length === 0 ? 0 : 1);
            if (bytes > BOUNDS.maxValueBytes) throw boundsError(new Bounds("value-bytes", BOUNDS.maxValueBytes));
            out.push(v);
          } else if (this.bool(v, op, i)) {
            bytes += valueBytes(items[i]!, 1) + (out.length === 0 ? 0 : 1);
            if (bytes > BOUNDS.maxValueBytes) throw boundsError(new Bounds("value-bytes", BOUNDS.maxValueBytes));
            out.push(items[i]!);
          }
          if (out.length > BOUNDS.maxListLen) throw boundsError(new Bounds("list-len", BOUNDS.maxListLen));
        }
        return out;
      }
      case "fold": {
        const items = this.list(at(1), op, 0);
        let acc = this.eval(at(2));
        const an = arr[3], it = arr[4];
        const accName = typeof an === "string" ? an : "";
        const itemName = typeof it === "string" ? it : "";
        const body = at(5);
        for (const item of items) {
          this.spend(1);
          const base = this.scope.length;
          this.scope.push([accName, acc], [itemName, item]);
          try { acc = this.eval(body); } finally { this.scope.length = base; }
        }
        return acc;
      }
      case "contains": {
        const items = this.list(at(1), op, 0);
        const v = this.eval(at(2));
        for (const item of items) {
          this.spend(1);
          if (eqValues(item, v)) return true;
        }
        return false;
      }
      case "reverse": return [...this.list(at(1), op, 0)].reverse();
      case "take": case "drop": {
        const items = this.list(at(1), op, 0);
        const i = this.eval(at(2));
        const n = isNum(i) && i.f64 >= 0 && i.f64 % 1 === 0 ? i.f64 : null;
        if (n === null) throw errType(op, 1, "nonneg integer", kindOf(i));
        return op === "take" ? items.slice(0, n) : items.slice(n);
      }
      case "flat": {
        const items = this.list(at(1), op, 0);
        let total = 0;
        for (let i = 0; i < items.length; i++) {
          const v = items[i]!;
          if (!Array.isArray(v)) throw errType(op, i, "list", kindOf(v));
          total += v.length;
        }
        this.spend(total);
        if (total > BOUNDS.maxListLen) throw boundsError(new Bounds("list-len", BOUNDS.maxListLen));
        const out: JVal[] = [];
        for (const v of items) out.push(...(v as JVal[]));
        return out;
      }
      case "unique": {
        const items = this.list(at(1), op, 0);
        const out: JVal[] = [];
        for (const item of items) {
          let dup = false;
          for (const seen of out) {
            this.spend(1);
            if (eqValues(seen, item)) { dup = true; break; }
          }
          if (!dup) out.push(item);
        }
        return out;
      }
      case "sort": {
        const items = this.list(at(1), op, 0);
        this.spend(items.length);
        return [...items].sort(cmpValues);
      }
      case "slen": return { kind: "num", f64: this.string(at(1), op, 0).length, u64: null };
      case "sconcat": {
        const args = this.evalArgs(arr);
        let bytes = 0;
        const parts: string[] = [];
        for (let i = 0; i < args.length; i++) {
          const v = args[i]!;
          if (typeof v !== "string") throw errType(op, i, "string", kindOf(v));
          bytes += utf8(v);
          parts.push(v);
        }
        if (bytes > BOUNDS.maxStringBytes) throw boundsError(new Bounds("string-bytes", BOUNDS.maxStringBytes));
        this.spend(bytes);
        return parts.join("");
      }
      case "upper": case "lower": case "trim": {
        const s = this.string(at(1), op, 0);
        this.spend(utf8(s));
        let out: string;
        if (op === "upper") out = s.replace(/[a-z]/g, c => c.toUpperCase());
        else if (op === "lower") out = s.replace(/[A-Z]/g, c => c.toLowerCase());
        else out = s.replace(/^[ \t\n\r\x0b\x0c]+|[ \t\n\r\x0b\x0c]+$/g, "");
        if (utf8(out) > BOUNDS.maxStringBytes) throw boundsError(new Bounds("string-bytes", BOUNDS.maxStringBytes));
        return out;
      }
      case "split": {
        const s = this.string(at(1), op, 0);
        const sep = this.string(at(2), op, 1);
        if (sep === "") throw errArg(op, "separator must be non-empty");
        this.spend(utf8(s));
        const parts: JVal[] = s.split(sep);
        if (parts.length > BOUNDS.maxListLen) throw boundsError(new Bounds("list-len", BOUNDS.maxListLen));
        this.spend(parts.length);
        return parts;
      }
      case "join": {
        const items = this.list(at(1), op, 0);
        const sep = this.string(at(2), op, 1);
        let bytes = utf8(sep) * Math.max(0, items.length - 1);
        const parts: string[] = [];
        for (let i = 0; i < items.length; i++) {
          const v = items[i]!;
          if (typeof v !== "string") throw errType(op, i, "string", kindOf(v));
          bytes += utf8(v);
          parts.push(v);
        }
        if (bytes > BOUNDS.maxStringBytes) throw boundsError(new Bounds("string-bytes", BOUNDS.maxStringBytes));
        this.spend(bytes);
        return parts.join(sep);
      }
      case "scontains": case "starts": case "ends": {
        const s = this.string(at(1), op, 0);
        const p = this.string(at(2), op, 1);
        this.spend(utf8(s));
        return op === "scontains" ? s.includes(p) : op === "starts" ? s.startsWith(p) : s.endsWith(p);
      }
      case "has": return this.object(at(1), op, 0).has(this.string(at(2), op, 1));
      case "keys": case "values": {
        const o = this.object(at(1), op, 0);
        const keys = [...o.keys()].sort(keyOrder);
        return op === "keys" ? keys : keys.map(k => o.get(k)!);
      }
      case "merge": {
        const args = this.evalArgs(arr);
        const out = new Map<string, JVal>();
        for (let i = 0; i < args.length; i++) {
          const v = args[i]!;
          if (!(v instanceof Map)) throw errType(op, i, "map", kindOf(v));
          this.spend(v.size);
          for (const [k, item] of v) out.set(k, item);
          if (out.size > BOUNDS.maxObjectKeys) throw boundsError(new Bounds("object-keys", BOUNDS.maxObjectKeys));
        }
        return out;
      }
      case "toText": {
        const v = this.eval(at(1));
        const s = canonical(v);
        this.spend(utf8(s));
        if (utf8(s) > BOUNDS.maxStringBytes) throw boundsError(new Bounds("string-bytes", BOUNDS.maxStringBytes));
        return s;
      }
      case "isText": case "isNum": case "isBool": case "isList": case "isMap": case "isNull": {
        const v = this.eval(at(1));
        return op === "isText" ? typeof v === "string" : op === "isNum" ? isNum(v) : op === "isBool" ? typeof v === "boolean"
          : op === "isList" ? Array.isArray(v) : op === "isMap" ? v instanceof Map : v === null;
      }
      case "quote": return at(1);
      default: throw new EvalError("EXPR_OP", op);
    }
  }
}

const num = (f64: number): JNum => ({ kind: "num", f64, u64: null });
export function jnum(v: number): JNum { return num(v); }

/** Full pipeline mirror of `run(program, env, budget)` -> (value|err, spent). */
export function runMirror(program: JVal, env: ReadonlyMap<string, JVal>, budget: number): { value: JVal; fuel: number } | { err: EvalError | OracleReject | Bounds; fuel: number } {
  if (env.size > BOUNDS.maxObjectKeys) return { err: new Bounds("object-keys", BOUNDS.maxObjectKeys), fuel: 0 };
  if (mapBytes(env) > BOUNDS.maxEnvBytes) return { err: new Bounds("env-bytes", BOUNDS.maxEnvBytes), fuel: 0 };
  if (mapDepth(env) > BOUNDS.maxValueDepth) return { err: new Bounds("value-depth", BOUNDS.maxValueDepth), fuel: 0 };
  for (const v of env.values()) {
    try { valueBytes(v, 1); } catch (e) { if (e instanceof Bounds) return { err: e, fuel: 0 }; throw e; }
  }
  try { checkProgram(program, new Set(env.keys())); }
  catch (e) { if (e instanceof Bounds || e instanceof OracleReject) return { err: e, fuel: 0 }; throw e; }
  if (budget > BOUNDS.maxFuel) return { err: new Bounds("fuel budget must be an integer in [0, 1000000]", BOUNDS.maxFuel), fuel: 0 };
  const ev = new Mirror(env, budget);
  try {
    const v = ev.eval(program);
    const spent = budget - ev.left;
    if (canonicalBytes(v) > BOUNDS.maxOutputBytes) return { err: new Bounds("output-bytes", BOUNDS.maxOutputBytes), fuel: spent };
    if (valueDepth(v) > BOUNDS.maxValueDepth) return { err: new Bounds("value-depth", BOUNDS.maxValueDepth), fuel: spent };
    return { value: v, fuel: spent };
  } catch (e) {
    const spent = budget - ev.left;
    if (e instanceof FuelExhausted) return { err: new OracleReject("EXPR_FUEL", "fuel"), fuel: spent };
    if (e instanceof Bounds) return { err: e, fuel: spent };
    if (e instanceof EvalError || e instanceof OracleReject) return { err: e, fuel: spent };
    throw e;
  }
}

function codeOf(err: Bounds | EvalError | OracleReject): string {
  if (err instanceof Bounds) return "EXPR_BOUNDS";
  return err.code;
}

/** Mirrors `eval_json(input)` -> predicted response class + fuel. */
export function predictEval(input: Uint8Array): Prediction {
  const parsed = parseJsonBytes(input);
  if (!parsed.ok) return { ok: false, code: "EXPR_PARSE", fuel: 0 };
  const doc = parsed.value;
  const program = doc instanceof Map ? doc.get("program") : undefined;
  if (program === undefined) return { ok: false, code: "EXPR_PARSE", fuel: 0 };
  const envRaw = doc instanceof Map ? doc.get("env") : undefined;
  const env: ReadonlyMap<string, JVal> = envRaw instanceof Map ? envRaw : new Map();
  const fuelRaw = doc instanceof Map ? doc.get("fuel") : undefined;
  let budget = BOUNDS.defaultFuel;
  if (fuelRaw !== undefined) {
    if (isNum(fuelRaw) && fuelRaw.u64 !== null) budget = Number(fuelRaw.u64);
    else return { ok: false, code: "EXPR_BOUNDS", fuel: 0 };
  }
  const r = runMirror(program, env, budget);
  if ("value" in r) return { ok: true, value: r.value, fuel: r.fuel };
  return { ok: false, code: codeOf(r.err), fuel: r.fuel };
}

/** Mirrors `check_json(input)` -> predicted ok/err code (no fuel field). */
export function predictCheck(input: Uint8Array): { ok: true } | { ok: false; code: string } | { ok: "uncovered" } {
  const parsed = parseJsonBytes(input);
  if (!parsed.ok) return { ok: false, code: "EXPR_PARSE" };
  const doc = parsed.value;
  const program = doc instanceof Map ? doc.get("program") : undefined;
  if (program === undefined) return { ok: false, code: "EXPR_PARSE" };
  const namesRaw = doc instanceof Map ? doc.get("names") : undefined;
  const names = new Set<string>();
  if (Array.isArray(namesRaw)) for (const v of namesRaw) if (typeof v === "string") names.add(v);
  try {
    checkProgram(program, names);
    return { ok: true };
  } catch (e) {
    if (e instanceof Bounds || e instanceof OracleReject) return { ok: false, code: codeOf(e) };
    throw e;
  }
}
