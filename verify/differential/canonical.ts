/**
 * verify/differential/canonical.ts — independent canonical encoder and the
 * evaluator's structural measures over the oracle's JVal domain. Mirrors the
 * documented canonical contract used by crates/algal-expr (`canonical`,
 * `key_order`, `count_nodes`, `value_depth`, `value_bytes`,
 * `canonical_map_bytes`, `map_depth`) without importing production code.
 *
 * Key order (canonical output): canonical u32 array-index keys numerically
 * first, then all other keys in UTF-16 code-unit order — the same order JS
 * `JSON.stringify` emits through own-property ordering.
 *
 * Iteration order (BTreeMap / serde_json `Map` without preserve_order):
 * lexicographic UTF-8 bytes — equivalent to scalar-code-point order. The two
 * orders disagree on pairs like U+FFFF vs U+10000; both appear here.
 */

import type { JVal } from "./json";

const enc = new TextEncoder();

/** u32 array-index rule: canonical decimal spelling, value < 2^32-1. */
export function arrayIndex(key: string): number | null {
  if (!/^(?:0|[1-9][0-9]*)$/.test(key) || key.length > 10) return null;
  const n = Number(key);
  return Number.isInteger(n) && n >= 0 && n <= 0xfffffffe && String(n) === key ? n : null;
}

/** UTF-16 code-unit comparison — identical to JS `<` on strings. */
export function utf16Compare(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** UTF-8 byte (scalar code point) comparison — serde BTreeMap order. */
export function utf8Compare(a: string, b: string): number {
  const x = enc.encode(a), y = enc.encode(b);
  const n = Math.min(x.length, y.length);
  for (let i = 0; i < n; i++) if (x[i] !== y[i]) return x[i]! - y[i]!;
  return x.length - y.length;
}

/** Canonical key order: u32 indices numerically first, then UTF-16 units. */
export function keyOrder(a: string, b: string): number {
  const x = arrayIndex(a), y = arrayIndex(b);
  if (x !== null && y !== null) return x - y;
  if (x !== null) return -1;
  if (y !== null) return 1;
  return utf16Compare(a, b);
}

/** serde_json::to_string escaping: `"` `\` and <0x20 (shorthand escapes for
 * \b\t\n\f\r, lowercase \u00XX otherwise). Everything else raw. Only valid
 * over scalar strings — the parser never admits lone surrogates. */
export function stringLiteral(s: string): string {
  let out = '"';
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c === 0x22) out += '\\"';
    else if (c === 0x5c) out += "\\\\";
    else if (c === 0x08) out += "\\b";
    else if (c === 0x09) out += "\\t";
    else if (c === 0x0a) out += "\\n";
    else if (c === 0x0c) out += "\\f";
    else if (c === 0x0d) out += "\\r";
    else if (c < 0x20) out += `\\u${c.toString(16).padStart(4, "0")}`;
    else out += s[i]!;
  }
  return out + '"';
}

function numText(v: { f64: number }): string {
  // Finite binary64 only; JSON.stringify produces the ECMAScript shortest
  // round-trip spelling, which is the documented canonical number form.
  const s = JSON.stringify(v.f64);
  if (s === undefined) throw new Error("canonical number domain");
  return s;
}

function writeCanonical(value: JVal, out: string[]): void {
  if (value === null) out.push("null");
  else if (typeof value === "boolean") out.push(value ? "true" : "false");
  else if (typeof value === "string") out.push(stringLiteral(value));
  else if (typeof value === "object" && "f64" in value) out.push(numText(value));
  else if (Array.isArray(value)) {
    out.push("[");
    for (let i = 0; i < value.length; i++) {
      if (i) out.push(",");
      writeCanonical(value[i]!, out);
    }
    out.push("]");
  } else {
    const keys = [...value.keys()].sort(keyOrder);
    out.push("{");
    for (let i = 0; i < keys.length; i++) {
      if (i) out.push(",");
      out.push(stringLiteral(keys[i]!), ":");
      writeCanonical(value.get(keys[i]!)!, out);
    }
    out.push("}");
  }
}

export function canonical(value: JVal): string {
  const out: string[] = [];
  writeCanonical(value, out);
  return out.join("");
}

export function canonicalBytes(value: JVal): number {
  return enc.encode(canonical(value)).byteLength;
}

export function isNum(value: JVal): value is { kind: "num"; f64: number; u64: bigint | null } {
  return value !== null && typeof value === "object" && !Array.isArray(value) && !(value instanceof Map);
}

export function countNodes(value: JVal): number {
  if (Array.isArray(value)) return 1 + value.reduce((n, v) => n + countNodes(v), 0);
  if (value instanceof Map) {
    let n = 1;
    for (const v of value.values()) n += countNodes(v);
    return n;
  }
  return 1;
}

export function valueDepth(value: JVal): number {
  if (Array.isArray(value)) return 1 + value.reduce((d, v) => Math.max(d, valueDepth(v)), 0);
  if (value instanceof Map) {
    let d = 0;
    for (const v of value.values()) d = Math.max(d, valueDepth(v));
    return 1 + d;
  }
  return 0;
}

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
  defaultFuel: 10_000,
} as const;

export class Bounds extends Error {
  constructor(readonly what: string, readonly max: number) { super(`${what} > ${max}`); this.name = "Bounds"; }
}

function utf8(s: string): number {
  return enc.encode(s).byteLength;
}

/** Mirrors `value_bytes(value, depth)` — recursive accumulation with the
 * same mid-walk and per-node checks, including per-key string sizes. */
export function valueBytes(value: JVal, depth: number): number {
  if (depth > BOUNDS.maxValueDepth) throw new Bounds("value-depth", BOUNDS.maxValueDepth);
  let bytes: number;
  const add = (total: number, n: number): number => {
    total += n;
    if (total > BOUNDS.maxValueBytes) throw new Bounds("value-bytes", BOUNDS.maxValueBytes);
    return total;
  };
  if (typeof value === "string") {
    if (utf8(value) > BOUNDS.maxStringBytes) throw new Bounds("string-bytes", BOUNDS.maxStringBytes);
    bytes = canonicalBytes(value);
  } else if (Array.isArray(value)) {
    if (value.length > BOUNDS.maxListLen) throw new Bounds("list-len", BOUNDS.maxListLen);
    bytes = 2 + Math.max(0, value.length - 1);
    for (const item of value) bytes = add(bytes, valueBytes(item, depth + 1));
  } else if (value instanceof Map) {
    if (value.size > BOUNDS.maxObjectKeys) throw new Bounds("object-keys", BOUNDS.maxObjectKeys);
    bytes = 2 + Math.max(0, value.size - 1);
    for (const [key, item] of value) {
      if (utf8(key) > BOUNDS.maxStringBytes) throw new Bounds("string-bytes", BOUNDS.maxStringBytes);
      bytes = add(bytes, canonicalBytes(key) + 1);
      bytes = add(bytes, valueBytes(item, depth + 1));
    }
  } else bytes = canonicalBytes(value);
  if (bytes > BOUNDS.maxValueBytes) throw new Bounds("value-bytes", BOUNDS.maxValueBytes);
  return bytes;
}

export function mapDepth(map: ReadonlyMap<string, JVal>): number {
  let d = 0;
  for (const v of map.values()) d = Math.max(d, valueDepth(v));
  return 1 + d;
}

export function mapBytes(map: ReadonlyMap<string, JVal>): number {
  const keys = [...map.keys()].sort(keyOrder);
  const out: string[] = ["{"];
  for (let i = 0; i < keys.length; i++) {
    if (i) out.push(",");
    out.push(stringLiteral(keys[i]!), ":");
    writeCanonical(map.get(keys[i]!)!, out);
  }
  out.push("}");
  return enc.encode(out.join("")).byteLength;
}
