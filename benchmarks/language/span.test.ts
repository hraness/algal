import { expect, test } from "bun:test";
import { locateJsonSpan } from "./span";

const bytes = (source: string): Uint8Array => new TextEncoder().encode(source);

test("empty JSON keys and values have non-empty byte spans", () => {
  const source = bytes('{"": "", "nested": {"": ""}}');
  expect(locateJsonSpan(source, [""], true)).toEqual({ start: 1, end: 3 });
  expect(locateJsonSpan(source, [""])).toEqual({ start: 5, end: 7 });
  expect(locateJsonSpan(source, ["nested", ""], true)).toEqual({ start: 20, end: 22 });
  expect(locateJsonSpan(source, ["nested", ""])).toEqual({ start: 24, end: 26 });
  expect(locateJsonSpan(bytes('""'), [])).toEqual({ start: 0, end: 2 });
});

test("non-empty string spans remain inside their quotes in UTF-8 bytes", () => {
  expect(locateJsonSpan(bytes('{"é":"x"}'), ["é"], true)).toEqual({ start: 2, end: 4 });
  expect(locateJsonSpan(bytes('{"é":"x"}'), ["é"])).toEqual({ start: 7, end: 8 });
});
