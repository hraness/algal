import { expect, test } from "bun:test";
import { compareUtf8, truncateUtf8, utf8Bytes, utf8Length } from "./utf8";

test("portable UTF-8 length and receipt diagnostic ordering match byte semantics", () => {
  const values = ["", "ASCII\0", "é", "東京", "😀", "\ue000", "\ud800", "\udfff", "\ud800x\udfff", "\ufeffBOM", "🙂".repeat(1024)];
  // Bun 1.3.14 byteLength undercounts lone surrogates; actual UTF-8 encoding,
  // Node and TextEncoder all use the three-byte replacement character.
  for (const value of values) { expect(utf8Length(value)).toBe(Buffer.from(value).length); expect(utf8Length(value)).toBe(new TextEncoder().encode(value).length); }
  for (const a of values) for (const b of values) expect(Math.sign(compareUtf8(a, b))).toBe(Math.sign(Buffer.compare(Buffer.from(a), Buffer.from(b))));
  expect(["😀", "\ue000"].sort(compareUtf8)).toEqual(["\ue000", "😀"]);
  for (const size of [1023, 1024, 2047, 2048, 4095]) for (const suffix of ["é", "東京", "😀", "\ud800"]) {
    const value = "a".repeat(size) + suffix;
    expect(utf8Bytes(value)).toEqual(new Uint8Array(Buffer.from(value)));
    expect(utf8Length(value)).toBe(Buffer.from(value).length);
  }
});

test("UTF-8 truncation retains scalar boundaries, BOM and malformed replacement", () => {
  for (const value of ["ASCII", "é東京😀", "\ufeffBOM", "x\ud800y\udfff", "😀😀", "a".repeat(2047) + "é"]) {
    const bytes = Buffer.from(value);
    for (let limit = 0; limit <= bytes.length + 1; limit++) {
      let end = Math.min(limit, bytes.length);
      while (end < bytes.length && end > 0 && (bytes[end]! & 0xc0) === 0x80) end--;
      expect(truncateUtf8(value, limit)).toBe(bytes.subarray(0, end).toString("utf8"));
      expect(utf8Length(truncateUtf8(value, limit))).toBeLessThanOrEqual(limit);
    }
  }
  expect(truncateUtf8("\ufeff", 3)).toBe("\ufeff");
  expect(() => truncateUtf8("test", -1)).toThrow("cap");
});
