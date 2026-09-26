/**
 * verify/differential/json.ts — independent strict JSON decoder over raw
 * bytes, mirroring the serde_json `Value` admission domain used by the
 * expression evaluator boundary (`eval_json` / `check_json`). It imports no
 * production code: every accepted/rejected input is decided here so the
 * harness can flag production drift.
 *
 * Asserted domain constants (pinned by fixtures, see SCOPE.md):
 *  - Input is raw bytes; text must be valid UTF-8 scalar data. Overlong
 *    encodings, surrogate-range encodings (ED A0..BF), code points above
 *    U+10FFFF, truncated sequences and stray continuation bytes reject.
 *  - Grammar is strict RFC 8259: ws is exactly {0x20,0x09,0x0A,0x0D}; no BOM;
 *    no trailing data; no comments/trailing commas; object keys are strings.
 *  - Duplicate object keys keep the LAST value (document order discarded).
 *  - Raw control bytes <0x20 inside strings reject; 0x7F and scalar non-ASCII
 *    are data. `\uXXXX` escapes require a complete surrogate pair for
 *    D800..DBFF and reject DC00..DFFF leads; every other escape letter rejects.
 *  - Numbers: `-?(0|[1-9]d*)(.d+)?([eE][+-]?d+)?`. Integer spellings resolve
 *    to i64 (negative) or u64 (non-negative) when in range, else fall back to
 *    binary64; fraction/exponent spellings are binary64. Non-finite binary64
 *    (overflow) rejects; underflow rounds to 0 or a subnormal.
 *  - Container nesting depth <= 127 (serde_json's default recursion limit
 *    trips entering the 128th level; pinned by corpus probes).
 */

export type JNum = {
  readonly kind: "num";
  /** binary64 value — what `as_f64` and canonical output see. */
  readonly f64: number;
  /** Integer-spelled value fitting u64 ([0, 2^64-1]), else null. `fuel` uses this. */
  readonly u64: bigint | null;
};
export type JVal =
  | null
  | boolean
  | string
  | JNum
  | JVal[]
  | ReadonlyMap<string, JVal>;

export const JSON_CONTAINER_DEPTH_MAX = 127;

export class JsonReject extends Error {
  constructor(
    message: string,
    readonly position: number,
  ) {
    super(message);
    this.name = "JsonReject";
  }
}

const I64_MIN = -(1n << 63n);
const U64_MAX = (1n << 64n) - 1n;

class Parser {
  pos = 0;
  constructor(readonly bytes: Uint8Array) {}
  peek(): number {
    return this.pos < this.bytes.length ? this.bytes[this.pos]! : -1;
  }
  fail(why: string): never {
    throw new JsonReject(why, this.pos);
  }
  ws(): void {
    for (;;) {
      const c = this.peek();
      if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) this.pos++;
      else return;
    }
  }
  utf8(): number {
    const b = this.bytes;
    const c0 = b[this.pos]!;
    let size: number, code: number, min: number;
    if (c0 < 0x80) return c0;
    if (c0 >= 0xc2 && c0 <= 0xdf) { size = 2; code = c0 & 0x1f; min = 0x80; }
    else if (c0 >= 0xe0 && c0 <= 0xef) { size = 3; code = c0 & 0x0f; min = 0x800; }
    else if (c0 >= 0xf0 && c0 <= 0xf4) { size = 4; code = c0 & 0x07; min = 0x10000; }
    else this.fail("invalid UTF-8 lead byte");
    if (this.pos + size > b.length) this.fail("truncated UTF-8 sequence");
    for (let i = 1; i < size; i++) {
      const cx = b[this.pos + i]!;
      if (cx < 0x80 || cx > 0xbf) this.fail("invalid UTF-8 continuation byte");
      code = (code << 6) | (cx & 0x3f);
    }
    if (code < min) this.fail("overlong UTF-8 encoding");
    if (code >= 0xd800 && code <= 0xdfff) this.fail("UTF-8 encoded surrogate");
    if (code > 0x10ffff) this.fail("code point above U+10FFFF");
    this.pos += size;
    return code;
  }
  hex4(): number {
    if (this.pos + 4 > this.bytes.length) this.fail("truncated \\u escape");
    let code = 0;
    for (let i = 0; i < 4; i++) {
      const c = this.bytes[this.pos + i]!;
      const d = c >= 48 && c <= 57 ? c - 48 : c >= 65 && c <= 70 ? c - 55 : c >= 97 && c <= 102 ? c - 87 : -1;
      if (d < 0) this.fail("invalid \\u escape digit");
      code = code * 16 + d;
    }
    this.pos += 4;
    return code;
  }
  string(): string {
    // Caller consumed the opening quote.
    const out: string[] = [];
    for (;;) {
      const c = this.peek();
      if (c < 0) this.fail("unterminated string");
      if (c === 0x22) { this.pos++; return out.join(""); }
      if (c === 0x5c) {
        this.pos++;
        const e = this.peek();
        if (e < 0) this.fail("unterminated escape");
        this.pos++;
        switch (e) {
          case 0x22: out.push('"'); break;
          case 0x5c: out.push("\\"); break;
          case 0x2f: out.push("/"); break;
          case 0x62: out.push("\b"); break;
          case 0x66: out.push("\f"); break;
          case 0x6e: out.push("\n"); break;
          case 0x72: out.push("\r"); break;
          case 0x74: out.push("\t"); break;
          case 0x75: {
            const unit = this.hex4();
            if (unit >= 0xd800 && unit <= 0xdbff) {
              if (this.peek() !== 0x5c || this.bytes[this.pos + 1] !== 0x75) {
                this.fail("lone high surrogate escape");
              }
              this.pos += 2;
              const low = this.hex4();
              if (low < 0xdc00 || low > 0xdfff) this.fail("high surrogate without low pair");
              out.push(String.fromCodePoint(0x10000 + ((unit - 0xd800) << 10) + (low - 0xdc00)));
            } else if (unit >= 0xdc00 && unit <= 0xdfff) {
              this.fail("lone low surrogate escape");
            } else {
              out.push(String.fromCharCode(unit));
            }
            break;
          }
          default: this.fail("invalid string escape");
        }
        continue;
      }
      if (c < 0x20) this.fail("raw control byte in string");
      if (c < 0x80) { out.push(String.fromCharCode(c)); this.pos++; continue; }
      out.push(String.fromCodePoint(this.utf8()));
    }
  }
  number(): JNum {
    const start = this.pos, b = this.bytes;
    const digit = (i: number) => i < b.length && b[i]! >= 0x30 && b[i]! <= 0x39;
    if (this.peek() === 0x2d) this.pos++;
    if (this.peek() === 0x30) this.pos++;
    else if (digit(this.pos)) {
      while (digit(this.pos)) this.pos++;
    } else this.fail("invalid number: leading digits");
    if (this.peek() === 0x2e) {
      this.pos++;
      if (!digit(this.pos)) this.fail("invalid number: fraction digits required");
      while (digit(this.pos)) this.pos++;
    }
    const e = this.peek();
    if (e === 0x65 || e === 0x45) {
      this.pos++;
      const sign = this.peek();
      if (sign === 0x2b || sign === 0x2d) this.pos++;
      if (!digit(this.pos)) this.fail("invalid number: exponent digits required");
      while (digit(this.pos)) this.pos++;
    }
    const text = new TextDecoder("ascii").decode(b.subarray(start, this.pos));
    const float = /[.eE]/.test(text);
    if (!float) {
      const neg = text.startsWith("-");
      const magnitude = BigInt(neg ? text.slice(1) : text);
      if (neg) {
        const v = -magnitude;
        if (v >= I64_MIN) return { kind: "num", f64: Number(text), u64: null };
      } else if (magnitude <= U64_MAX) {
        return { kind: "num", f64: Number(text), u64: magnitude };
      }
    }
    const f64 = Number(text);
    if (!Number.isFinite(f64)) this.fail("number out of binary64 range");
    return { kind: "num", f64, u64: null };
  }
  value(depth: number): JVal {
    const c = this.peek();
    if (c < 0) this.fail("unexpected end of input");
    switch (c) {
      case 0x7b: {
        // A container at `depth` would be container number depth+1; the
        // asserted domain admits at most 127 (the 128th level rejects).
        if (depth >= JSON_CONTAINER_DEPTH_MAX) this.fail("container nesting exceeds the admitted depth limit");
        this.pos++;
        const map = new Map<string, JVal>();
        this.ws();
        if (this.peek() === 0x7d) { this.pos++; return map; }
        for (;;) {
          this.ws();
          if (this.peek() !== 0x22) this.fail("object key must be a string");
          this.pos++;
          const key = this.string();
          this.ws();
          if (this.peek() !== 0x3a) this.fail("expected ':' after object key");
          this.pos++;
          this.ws();
          map.set(key, this.value(depth + 1));
          this.ws();
          const next = this.peek();
          if (next === 0x2c) { this.pos++; continue; }
          if (next === 0x7d) { this.pos++; return map; }
          this.fail("expected ',' or '}' in object");
        }
      }
      case 0x5b: {
        if (depth >= JSON_CONTAINER_DEPTH_MAX) this.fail("container nesting exceeds the admitted depth limit");
        this.pos++;
        const arr: JVal[] = [];
        this.ws();
        if (this.peek() === 0x5d) { this.pos++; return arr; }
        for (;;) {
          this.ws();
          arr.push(this.value(depth + 1));
          this.ws();
          const next = this.peek();
          if (next === 0x2c) { this.pos++; continue; }
          if (next === 0x5d) { this.pos++; return arr; }
          this.fail("expected ',' or ']' in array");
        }
      }
      case 0x22: this.pos++; return this.string();
      case 0x74: this.literal("true"); return true;
      case 0x66: this.literal("false"); return false;
      case 0x6e: this.literal("null"); return null;
      default:
        if (c === 0x2d || (c >= 0x30 && c <= 0x39)) return this.number();
        this.fail("unexpected byte in value position");
    }
  }
  literal(word: string): void {
    for (const ch of word) {
      if (this.peek() !== ch.charCodeAt(0)) this.fail("invalid literal");
      this.pos++;
    }
  }
}

/** Converts a JS-parsed JSON value (objects as plain records, numbers as
 * binary64) into the JVal domain. Rejects non-finite numbers, unsafe
 * integer/number exotic types and lone surrogates — the caller only feeds
 * values that already came through a JSON parse of admitted text. */
export function fromJs(v: unknown): JVal {
  if (v === null || typeof v === "boolean" || typeof v === "string") return v as JVal;
  if (typeof v === "number") {
    if (!Number.isFinite(v)) throw new JsonReject("non-finite JS number", 0);
    return { kind: "num", f64: v, u64: Number.isSafeInteger(v) && v >= 0 ? BigInt(v) : null };
  }
  if (Array.isArray(v)) return v.map(fromJs);
  if (typeof v === "object") {
    const map = new Map<string, JVal>();
    for (const [k, item] of Object.entries(v as Record<string, unknown>)) map.set(k, fromJs(item));
    return map;
  }
  throw new JsonReject("unsupported JS value", 0);
}

/** Returns the admitted value tree or a typed rejection. Never throws
 * outside `JsonReject`. */
export function parseJsonBytes(bytes: Uint8Array): { ok: true; value: JVal } | { ok: false; error: JsonReject } {
  try {
    const p = new Parser(bytes);
    p.ws();
    const value = p.value(0);
    p.ws();
    if (p.pos !== bytes.length) p.fail("trailing bytes after document");
    return { ok: true, value };
  } catch (error) {
    if (error instanceof JsonReject) return { ok: false, error };
    throw error;
  }
}
