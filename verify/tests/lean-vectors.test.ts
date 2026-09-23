import { expect, test } from "bun:test";
import { resolve } from "node:path";
import { compareBunStringVectors, compareBunVectors, compareNativeStringVectors, compareNativeVectors } from "../lean/vectors";

const fixture = await Bun.file(resolve(import.meta.dir, "../lean/fixtures/core-vectors.json")).json();

test("actual diagnostic Lean vectors match Bun production canonicalization and own-field reads", () => {
  const expected = compareBunVectors(fixture);
  expect(expected.canonicalNumbers).toEqual(["0", "0", "5e-324", "1.7976931348623157e+308", "1", "-1", null, null, null]);
  expect(expected.ownMap).toContainEqual({ key: "present-null", present: true, value: null });
  compareNativeVectors(expected, expected);
});

test("changed Lean finite/zero/UTF16/index/order/own-field semantics fail sampled correspondence", () => {
  for (const alter of [
    (v: typeof fixture) => { v.binary64[6].admitted = true; },
    (v: typeof fixture) => { v.binary64[1].normalizedBits = "9223372036854775808"; },
    (v: typeof fixture) => { v.texts[2].utf16 = [128512]; },
    (v: typeof fixture) => { v.keyIndices[4].arrayIndex = 1; },
    (v: typeof fixture) => { v.orderedKeys.reverse(); },
    (v: typeof fixture) => { v.ownMap[2] = { key: "present-null", present: false }; },
    (v: typeof fixture) => { v.ownMap[4] = { key: "toString", present: true, value: 1 }; },
    (v: typeof fixture) => { v.binary64 = v.binary64.map(() => v.binary64[0]); },
    (v: typeof fixture) => { v.texts = v.texts.map(() => v.texts[0]); },
    (v: typeof fixture) => { v.keyIndices = v.keyIndices.map((_: unknown, i: number) => ({ key: `k${i}`, arrayIndex: null })); v.orderedKeys = v.keyIndices.map((x: { key: string }) => x.key).sort(); },
    (v: typeof fixture) => { v.ownMap = v.ownMap.map(() => ({ key: "missing", present: false })); },
  ]) {
    const changed = structuredClone(fixture); alter(changed);
    expect(() => compareBunVectors(changed)).toThrow();
  }
  const expected = compareBunVectors(fixture);
  expect(() => compareNativeVectors({ ...expected, canonicalNumbers: [] }, expected)).toThrow();
  expect(() => compareNativeVectors({ ...expected, extra: true }, expected)).toThrow();
});

test("actual Lean quoted-string bytes match Bun and reject vacuous or altered vectors", async () => {
  const report = await Bun.file(resolve(import.meta.dir, "../lean/fixtures/string-vectors.json")).json();
  const expected = compareBunStringVectors(report);
  expect(expected.strings).toHaveLength(56);
  expect(expected.strings[0]).toEqual({ text: "\u0000", bytes: [34, 92, 117, 48, 48, 48, 48, 34] });
  compareNativeStringVectors(expected, expected);
  for (const change of [
    (r: typeof report) => { r.strings = r.strings.map(() => r.strings[0]); },
    (r: typeof report) => { r.strings.reverse(); },
    (r: typeof report) => { r.strings.pop(); },
    (r: typeof report) => { r.strings[0].bytes = [34, 0, 34]; },
    (r: typeof report) => { r.strings[0].bytes[0] = 256; },
    (r: typeof report) => { r.strings[0].extra = true; },
    (r: typeof report) => { r.extra = true; },
  ]) {
    const changed = structuredClone(report); change(changed);
    expect(() => compareBunStringVectors(changed)).toThrow();
    expect(() => compareNativeStringVectors({ ...changed, contract: expected.contract }, expected)).toThrow();
  }
});
