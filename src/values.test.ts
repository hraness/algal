import { describe, expect, test } from "bun:test";
import { canonicalize, isJsonValue } from "./values";
import { digestCanonical, digestText } from "./digest";

describe("canonicalize", () => {
  test("sorts object keys recursively", () => {
    expect(canonicalize({ b: 1, a: { d: 2, c: 3 } })).toBe(
      '{"a":{"c":3,"d":2},"b":1}',
    );
  });

  test("stable across key insertion order", () => {
    const a = canonicalize({ x: [1, { y: 2, z: 3 }], b: "t" });
    const b = canonicalize({ b: "t", x: [1, { z: 3, y: 2 }] });
    expect(a).toBe(b);
  });

  test("handles unicode and empties", () => {
    expect(canonicalize({ u: "héllo", n: null, e: [] })).toBe(
      '{"e":[],"n":null,"u":"héllo"}',
    );
  });
});

describe("digest", () => {
  test("is deterministic and order-insensitive", () => {
    const a = digestCanonical({ a: 1, b: 2 });
    const b = digestCanonical({ b: 2, a: 1 });
    expect(a).toBe(b);
    expect(a).toMatch(/^sha256:[0-9a-f]{64}$/);
  });

  test("differs on any change", () => {
    expect(digestCanonical({ a: 1 })).not.toBe(digestCanonical({ a: 2 }));
  });

  test("text digests are stable", () => {
    expect(digestText("morphogen")).toBe(digestText("morphogen"));
  });
});

describe("isJsonValue", () => {
  test("rejects non-JSON", () => {
    expect(isJsonValue(undefined)).toBe(false);
    expect(isJsonValue(NaN)).toBe(false);
    expect(isJsonValue(Infinity)).toBe(false);
    expect(isJsonValue(() => 1)).toBe(false);
    expect(isJsonValue({ a: undefined })).toBe(false);
  });
  test("accepts JSON", () => {
    expect(isJsonValue({ a: [1, "x", null, { b: true }] })).toBe(true);
  });
});
