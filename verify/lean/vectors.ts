import { asJsonValue, canonicalize, isJsonValue, optField, type JsonObject } from "../../src/values";
import { array, boolean, record, requireThat, string, strings } from "../lib/schema";
import { hashJson } from "../lib/files";

export type NativeVectorResult = {
  contract: "algal.lean-native-vectors.v1"; canonicalNumbers: (string | null)[];
  canonicalTexts: string[]; canonicalKeys: string; ownMap: unknown[];
};
const BITS = [
  ["positive-zero", 0n], ["negative-zero", 0x8000000000000000n], ["minimum-subnormal", 1n],
  ["maximum-finite", 0x7fefffffffffffffn], ["positive-one", 0x3ff0000000000000n], ["negative-one", 0xbff0000000000000n],
  ["positive-infinity", 0x7ff0000000000000n], ["negative-infinity", 0xfff0000000000000n], ["quiet-nan", 0x7ff8000000000001n],
] as const;
const TEXTS = ["", "A", "😀", "é", "é", "", "�", "\"\\\n"];
const KEYS = ["0", "1", "2", "10", "01", "-0", "+1", "4294967294", "4294967295", "4294967296", "", "toString", "__proto__", "é", "é", "😀", ""];
const OWN_KEYS = ["x", "__proto__", "present-null", "missing", "toString"];

/** A finite correspondence check. This is not a proof of either byte codec. */
export function compareBunVectors(value: unknown): NativeVectorResult {
  const report = record(value, ["contract", "binary64", "texts", "keyIndices", "orderedKeys", "ownMap"], "Lean vectors");
  requireThat(report.contract === "algal.lean-core-vectors.v1", "unknown Lean vectors");
  const canonicalNumbers = array(report.binary64, "binary64 vectors", 9, 9).map((value, index) => {
    const vector = record(value, ["label", "bits", "finite", "admitted", "normalizedBits"], "binary64 vector");
    string(vector.label, "binary64 label", 64);
    const bitsText = string(vector.bits, "binary64 bits", 20), normalized = string(vector.normalizedBits, "normalized bits", 20);
    requireThat(vector.label === BITS[index]![0] && bitsText === BITS[index]![1].toString(), "reviewed binary64 vector input changed or duplicated");
    requireThat(/^(0|[1-9][0-9]*)$/.test(bitsText) && /^(0|[1-9][0-9]*)$/.test(normalized), "invalid binary64 integer encoding");
    const bits = BigInt(bitsText); requireThat(bits < 1n << 64n && BigInt(normalized) < 1n << 64n, "binary64 width");
    const buffer = new DataView(new ArrayBuffer(8)); buffer.setBigUint64(0, bits);
    const number = buffer.getFloat64(0), finite = Number.isFinite(number);
    requireThat(boolean(vector.finite, "finite") === finite && boolean(vector.admitted, "admitted") === isJsonValue(number), "Lean/Bun finite admission differs");
    if (!finite) { requireThat(normalized === bitsText, "rejected binary64 normalization changed bits"); return null; }
    const text = canonicalize(asJsonValue(number, "Lean vector"));
    buffer.setFloat64(0, JSON.parse(text) as number);
    requireThat(buffer.getBigUint64(0).toString() === normalized, "Lean/Bun canonical numeric roundtrip differs");
    return text;
  });
  const canonicalTexts = array(report.texts, "text vectors", 8, 8).map((value, index) => {
    const vector = record(value, ["text", "utf16"], "text vector");
    requireThat(typeof vector.text === "string" && vector.text.length <= 256, "invalid vector text");
    requireThat(vector.text === TEXTS[index], "reviewed text vector input changed or duplicated");
    const units = Array.from({ length: vector.text.length }, (_, i) => (vector.text as string).charCodeAt(i));
    requireThat(hashJson(vector.utf16) === hashJson(units), "Lean/Bun UTF16 differs");
    return canonicalize(vector.text);
  });
  const keys = array(report.keyIndices, "key vectors", 17, 17).map((value, index) => {
    const vector = record(value, ["key", "arrayIndex"], "key vector");
    requireThat(typeof vector.key === "string" && vector.key.length <= 256, "invalid key text");
    requireThat(vector.key === KEYS[index], "reviewed key vector input changed or duplicated");
    const n = Number(vector.key);
    const arrayIndex = Number.isInteger(n) && n >= 0 && n < 4_294_967_295 && String(n) === vector.key ? n : null;
    requireThat(vector.arrayIndex === arrayIndex, "Lean/Bun array index classification differs");
    return vector.key;
  });
  requireThat(new Set(keys).size === keys.length, "duplicate vector keys");
  const object = Object.fromEntries(keys.map(key => [key, null]));
  const canonicalKeys = canonicalize(object);
  // strings() intentionally forbids empty strings; JSON keys permit them.
  const ordered = array(report.orderedKeys, "ordered keys", keys.length, keys.length);
  requireThat(hashJson(ordered) === hashJson(Object.keys(JSON.parse(canonicalKeys) as JsonObject)), "Lean/Bun canonical key order differs");
  const parsed = JSON.parse('{"__proto__":7,"x":1,"x":2,"present-null":null}') as JsonObject;
  const ownMap = array(report.ownMap, "own-map vectors", 5, 5).map((value, index) => {
    requireThat(value !== null && typeof value === "object" && !Array.isArray(value), "own-map vector object required");
    const vector = record(value, Object.hasOwn(value, "value") ? ["key", "present", "value"] : ["key", "present"], "own-map vector");
    const key = string(vector.key, "own-map key", 256), actual = optField(parsed, key);
    requireThat(key === OWN_KEYS[index], "reviewed own-map vector input changed or duplicated");
    const result = actual === undefined ? { key, present: false } : { key, present: true, value: actual };
    requireThat(hashJson(vector) === hashJson(result), "Lean/Bun own-map behavior differs");
    return result;
  });
  return { contract: "algal.lean-native-vectors.v1", canonicalNumbers, canonicalTexts, canonicalKeys, ownMap };
}

export function compareNativeVectors(value: unknown, expected: NativeVectorResult): void {
  const actual = record(value, ["contract", "canonicalNumbers", "canonicalTexts", "canonicalKeys", "ownMap"], "native Lean vectors");
  requireThat(actual.contract === expected.contract, "unknown native Lean vectors");
  strings(actual.canonicalTexts, "native canonical texts", 8, 8);
  requireThat(hashJson(actual) === hashJson(expected), "Lean/Bun/native sampled correspondence differs");
}

const STRING_INPUTS = [...Array.from({ length: 32 }, (_, n) => String.fromCharCode(n)),
  "", "\"", "\\", "/", "\u007f", "\u0080", "\u07ff", "\u0800", "\ud7ff", "\ue000", "\uffff",
  "\u{10000}", "\u{10ffff}", "\u2028", "\u2029", "\ufeff", "\ufffd", "é", "é", "😀", "plain",
  "a\"b\\c\n", "[{:}]", "/\u0000😀"];
type StringRow = { text: string; bytes: number[] };
export type NativeStringResult = { contract: "algal.lean-native-string-vectors.v1"; strings: StringRow[] };

function stringRows(value: unknown, contract: string): StringRow[] {
  const report = record(value, ["contract", "strings"], "Lean string vectors");
  requireThat(report.contract === contract, "unknown Lean string vector contract");
  return array(report.strings, "string byte vectors", STRING_INPUTS.length, STRING_INPUTS.length).map((value, index) => {
    const row = record(value, ["text", "bytes"], "string byte vector");
    requireThat(typeof row.text === "string" && row.text === STRING_INPUTS[index], "reviewed string vector input changed or duplicated");
    const bytes = array(row.bytes, "quoted UTF8 bytes", 2, 256).map(value => {
      requireThat(typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 255, "invalid quoted UTF8 byte");
      return value;
    });
    return { text: row.text, bytes };
  });
}

export function compareBunStringVectors(value: unknown): NativeStringResult {
  const rows = stringRows(value, "algal.lean-string-vectors.v1");
  const expected = rows.map(row => ({ text: row.text, bytes: [...new TextEncoder().encode(canonicalize(row.text))] }));
  requireThat(hashJson(rows) === hashJson(expected), "Lean/Bun canonical quoted UTF8 bytes differ");
  return { contract: "algal.lean-native-string-vectors.v1", strings: expected };
}

export function compareNativeStringVectors(value: unknown, expected: NativeStringResult): void {
  const rows = stringRows(value, expected.contract);
  requireThat(hashJson(rows) === hashJson(expected.strings), "Lean/Bun/native canonical quoted UTF8 bytes differ");
}
