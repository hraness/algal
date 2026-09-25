import { admitExpr, denote, type Expr, type Projection } from "./oracle";
export const LIMITS = { cases: 128, inputBytes: 16_384, outputBytes: 1_048_576, aggregateOutputBytes: 16_777_216,
  archiveBytes: 33_554_432, failureBytes: 65_536, recordBytes: 8_388_608, retainedFiles: 2048,
  workerMs: 10_000, shrinkAttempts: 32, shrinkMs: 60_000 } as const;
export const VERSION = "algal.corpus-expression.xorshift32.v1";
export type GrammarCase = { contract: "algal.corpus-case.v1"; id: string; domain: "grammar"; program: Expr };
export type RawCase = { contract: "algal.corpus-case.v1"; id: string; domain: "raw"; hex: string; expectation: "invalid-utf8" | "catalog"; catalog: string };
export type Case = GrammarCase | RawCase;
export type RawDefinition = { bytes: Uint8Array; expected: Projection };
const enc = new TextEncoder();
const parse = { ok: false, code: "EXPR_PARSE" } as const;
const request = (program: string, fuel = 10_000) => enc.encode(`{"program":${program},"env":{},"fuel":${fuel}}`);
export function rawCatalog(): Record<string, RawDefinition> {
  return {
    "invalid-utf8": { bytes: Uint8Array.from([...enc.encode('{"program":"'), 0xff, ...enc.encode('"}')]), expected: parse },
    "truncated-utf8": { bytes: Uint8Array.from([...enc.encode('{"program":"'), 0xe2, 0x82]), expected: parse },
    "surrogate-utf8": { bytes: Uint8Array.from([...enc.encode('{"program":"'), 0xed, 0xa0, 0x80, ...enc.encode('"}')]), expected: parse },
    bom: { bytes: Uint8Array.from([0xef, 0xbb, 0xbf, ...request("true")]), expected: parse },
    "lone-high": { bytes: request('"\\ud800"'), expected: parse },
    "lone-low": { bytes: request('"\\udfff"'), expected: parse },
    "overwritten-lone": { bytes: enc.encode('{"program":"\\ud800","program":true,"env":{}}'), expected: parse },
    "duplicate-last-wins": { bytes: enc.encode('{"program":false,"program":true,"env":{}}'), expected: { ok: true, value: true } },
    "minus-zero": { bytes: request("-0"), expected: { ok: true, value: 0 } },
    "minimum-subnormal": { bytes: request("5e-324"), expected: { ok: true, value: Number.MIN_VALUE } },
    "maximum-finite": { bytes: request("1.7976931348623157e308"), expected: { ok: true, value: Number.MAX_VALUE } },
    overflow: { bytes: request("1e309"), expected: parse },
    "integer-rounding": { bytes: request("9007199254740993"), expected: { ok: true, value: 9007199254740992 } },
    "exponent-one": { bytes: request("1e+0"), expected: { ok: true, value: 1 } },
    "escaped-pair": { bytes: request('"\\ud83d\\ude00"'), expected: { ok: true, value: "😀" } },
    "truncated-json": { bytes: enc.encode('{"program":true'), expected: parse },
    "fuel-zero": { bytes: request("true", 0), expected: { ok: false, code: "EXPR_FUEL" } },
    "fuel-one": { bytes: request("true", 1), expected: { ok: true, value: true } },
    "fuel-two": { bytes: request("true", 2), expected: { ok: true, value: true } },
  };
}
function require_(x: unknown, why: string): asserts x { if (!x) throw new Error(why); }
export const hex = (bytes: Uint8Array): string => Buffer.from(bytes).toString("hex");
export function fromHex(value: unknown): Uint8Array {
  require_(typeof value === "string" && value.length > 0 && value.length <= LIMITS.inputBytes * 2 && /^(?:[a-f0-9]{2})+$/.test(value), "raw byte encoding");
  return Buffer.from(value, "hex");
}
export function parseCase(raw: unknown): Case {
  require_(raw !== null && typeof raw === "object" && !Array.isArray(raw) && Object.getPrototypeOf(raw) === Object.prototype, "case object");
  const x = raw as Record<string, unknown>;
  require_(x.contract === "algal.corpus-case.v1" && typeof x.id === "string" && /^[a-z0-9][a-z0-9-]{0,95}$/.test(x.id), "case identity");
  if (x.domain === "grammar") {
    require_(Object.keys(x).sort().join() === "contract,domain,id,program", "grammar closed fields");
    const program = admitExpr(x.program);
    const out: GrammarCase = { contract: x.contract, id: x.id, domain: "grammar", program };
    require_(inputBytes(out).length <= LIMITS.inputBytes, "grammar byte bound"); return out;
  }
  require_(x.domain === "raw" && Object.keys(x).sort().join() === "catalog,contract,domain,expectation,hex,id", "raw closed fields");
  const bytes = fromHex(x.hex);
  require_(typeof x.catalog === "string", "raw catalog identity");
  if (x.expectation === "catalog") {
    const all = rawCatalog(); require_(Object.hasOwn(all, x.catalog), "unknown raw catalog case");
    require_(hex(bytes) === hex(all[x.catalog]!.bytes), "raw catalog bytes changed");
  } else {
    require_(x.expectation === "invalid-utf8" && x.catalog === "", "unknown raw expectation");
    let invalid = false; try { new TextDecoder("utf-8", { fatal: true }).decode(bytes); } catch { invalid = true; }
    require_(invalid, "invalid-UTF8 oracle premise missing");
  }
  return { contract: x.contract, id: x.id, domain: "raw", hex: x.hex as string, expectation: x.expectation, catalog: x.catalog };
}
export function inputBytes(c: Case): Uint8Array {
  return c.domain === "grammar" ? enc.encode(JSON.stringify({ program: c.program, env: {}, fuel: 10_000 })) : fromHex(c.hex);
}
export function expected(c: Case): Projection {
  return c.domain === "grammar" ? denote(c.program) : c.expectation === "invalid-utf8" ? parse : rawCatalog()[c.catalog]!.expected;
}
