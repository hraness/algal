import { expect, test } from "bun:test";
import { IndexedDbApplicationStorage } from "./application-browser-storage";

test("browser storage rejects ambiguous database names and unknown options", async () => {
  for (const name of ["", "../other", "x".repeat(97), "owner/database", "UPPERCASE"]) {
    await expect(IndexedDbApplicationStorage.open({ name })).rejects.toThrow("database name");
    await expect(IndexedDbApplicationStorage.exportRaw({ name })).rejects.toThrow("database name");
  }
  await expect(IndexedDbApplicationStorage.open({ name: "safe", reset: true } as { name: string })).rejects.toThrow("options");
});

test.skipIf(typeof globalThis.indexedDB !== "undefined")("browser storage fails closed on hosts without IndexedDB; no volatile fallback", async () => {
  await expect(IndexedDbApplicationStorage.open()).rejects.toThrow("IndexedDB and Web Locks are required");
  await expect(IndexedDbApplicationStorage.exportRaw()).rejects.toThrow("IndexedDB is unavailable");
});

// Exercise the actual pure recovery admission path. These controls do not
// substitute for IndexedDB/Web Locks qualification in a real browser.
const recovery = (value: unknown): unknown => (IndexedDbApplicationStorage as unknown as {
  raw(name: string, snapshot: { keys: string[]; values: unknown[]; metadataKeys: string[]; metadataValues: unknown[] }): unknown;
}).raw("audit", { keys: ["retained"], values: [value], metadataKeys: [], metadataValues: [] });

test("raw recovery rejects sparse arrays and extra properties without inventing null values", () => {
  const sparse = structuredClone(new Array(1));
  expect(() => recovery(sparse)).toThrow("sparse");
  expect(Object.hasOwn(sparse, 0)).toBe(false);
  const extra = structuredClone(Object.assign(["kept"], { evidence: "would be lost" }));
  expect(() => recovery(extra)).toThrow("non-JSON properties");
  expect(extra.evidence).toBe("would be lost");
});

test("raw recovery charges array positions before allocating or reading children", () => {
  let reads = 0;
  const tooMany = new Array(1_000_001);
  Object.defineProperty(tooMany, "0", { enumerable: true, get() { reads++; return "foreign"; } });
  expect(() => recovery(tooMany)).toThrow("structure");
  expect(reads).toBe(0);
  expect(() => recovery([undefined])).toThrow("non-JSON value");
});

test("raw recovery preserves JSON strings including surrogate escapes and own proto keys", () => {
  const value = JSON.parse('{"__proto__":"retained","text":"\\ud800\\n\\u0000😀é","rows":[null,true,false,1.5]}') as unknown;
  const recovered = recovery(value) as { rows: { value: unknown }[] };
  expect(JSON.stringify(recovered.rows[0]!.value)).toBe(JSON.stringify(value));
});

test("raw recovery enforces compact JSON byte boundary before encoding the export", () => {
  const limit = 33_554_432;
  const overhead = new TextEncoder().encode(JSON.stringify(recovery(""))).length;
  const at = "a".repeat(limit - overhead);
  expect(() => recovery(at.slice(1))).not.toThrow();
  expect(() => recovery(at)).not.toThrow();
  expect(() => recovery(at + "a")).toThrow("byte limit");
  const escapes = "\0".repeat(Math.floor((limit - overhead) / 6)) + "a".repeat((limit - overhead) % 6);
  expect(() => recovery(escapes)).not.toThrow();
  expect(() => recovery(escapes + "a")).toThrow("byte limit");
});


test("raw recovery refuses negative zero instead of normalizing retained metadata", () => {
  const negativeZero = structuredClone(-0);
  expect(Object.is(negativeZero, -0)).toBe(true);
  expect(() => recovery({ retained: negativeZero })).toThrow("non-JSON value");
  expect(() => recovery({ retained: 0 })).not.toThrow();
});
