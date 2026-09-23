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
