/// <reference lib="dom" />
/// <reference lib="dom.asynciterable" />
/** Self-tests for the fake IndexedDB harness in `idb-fake.ts`. */
import { describe, expect, test } from "bun:test";
import {
  FakeDatabase,
  FakeIDBKeyRange,
  FakeOpenRequest,
  installFakeIdb,
} from "./idb-fake";

type AnyTxn = ReturnType<FakeDatabase["transaction"]>;
function idbReq(req: { onsuccess: (() => void) | null; onerror: (() => void) | null; result: unknown; error: Error | null }): Promise<unknown> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
function txnDone(txn: AnyTxn): Promise<void> {
  return new Promise((resolve, reject) => {
    txn.oncomplete = () => resolve();
    txn.onabort = () => reject(txn.error ?? new Error("aborted"));
  });
}

describe("fake IndexedDB harness", () => {
  test("open creates schema and shares data across connections", async () => {
    const factory = installFakeIdb();
    const open1 = factory.open("db1", 1) as FakeOpenRequest;
    open1.onupgradeneeded = () => open1.result!.createObjectStore("rows");
    const db1 = (await idbReq(open1)) as FakeDatabase;
    const open2 = factory.open("db1", 1) as FakeOpenRequest;
    const db2 = (await idbReq(open2)) as FakeDatabase;
    expect(db2).toBe(db1);
    expect(db2.objectStoreNames.contains("rows")).toBe(true);
  });
  test("put/get roundtrip commits on transaction completion", async () => {
    const factory = installFakeIdb();
    const open = factory.open("db2", 1) as FakeOpenRequest;
    open.onupgradeneeded = () => open.result!.createObjectStore("rows");
    const db = (await idbReq(open)) as FakeDatabase;
    const txn = db.transaction(["rows"], "readwrite", { durability: "strict" }) as AnyTxn;
    expect(txn.durability).toBe("strict");
    txn.objectStore("rows").put({ v: 1 }, "k1");
    await txnDone(txn);
    const read = db.transaction(["rows"], "readonly") as AnyTxn;
    expect(await idbReq(read.objectStore("rows").get("k1" as IDBValidKey))).toEqual({ v: 1 });
  });
  test("getAllKeys honors prefix ranges and sort order", async () => {
    const factory = installFakeIdb();
    const open = factory.open("db3", 1) as FakeOpenRequest;
    open.onupgradeneeded = () => open.result!.createObjectStore("rows");
    const db = (await idbReq(open)) as FakeDatabase;
    const txn = db.transaction(["rows"], "readwrite") as AnyTxn;
    txn.objectStore("rows").put(1, "mb/b2");
    txn.objectStore("rows").put(2, "mb/a1");
    txn.objectStore("rows").put(3, "other/c3");
    await txnDone(txn);
    const read = db.transaction(["rows"], "readonly") as AnyTxn;
    const keys = (await idbReq(
      read.objectStore("rows").getAllKeys(FakeIDBKeyRange.bound("mb/", "mb/\uffff")),
    )) as string[];
    expect(keys).toEqual(["mb/a1", "mb/b2"]);
  });
  test("readwrite transactions serialize; abort discards writes", async () => {
    const factory = installFakeIdb();
    const open = factory.open("db4", 1) as FakeOpenRequest;
    open.onupgradeneeded = () => open.result!.createObjectStore("rows");
    const db = (await idbReq(open)) as FakeDatabase;
    const order: string[] = [];
    const t1 = db.transaction(["rows"], "readwrite") as AnyTxn;
    const t2 = db.transaction(["rows"], "readwrite") as AnyTxn;
    const p1 = new Promise<void>((resolve) => {
      t1.oncomplete = () => { order.push("t1"); resolve(); };
    });
    t1.objectStore("rows").put("a", "k");
    // t2 must not run until t1 settles.
    const req2 = t2.objectStore("rows").put("b", "k");
    const p2 = new Promise<void>((resolve) => {
      t2.oncomplete = () => { order.push("t2"); resolve(); };
    });
    req2.onsuccess = () => order.push("req2");
    await Promise.all([p1, p2]);
    expect(order.indexOf("t1")).toBeLessThan(order.indexOf("req2"));
    const dead = db.transaction(["rows"], "readwrite") as AnyTxn;
    dead.objectStore("rows").put("lost", "k");
    dead.abort();
    await new Promise<void>((resolve) => { dead.onabort = () => resolve(); });
    const read = db.transaction(["rows"], "readonly") as AnyTxn;
    expect(await idbReq(read.objectStore("rows").get("k" as IDBValidKey))).toBe("b");
  });
  test("transaction finishes only after issued requests settle", async () => {
    const factory = installFakeIdb();
    const open = factory.open("db5", 1) as FakeOpenRequest;
    open.onupgradeneeded = () => open.result!.createObjectStore("rows");
    const db = (await idbReq(open)) as FakeDatabase;
    const txn = db.transaction(["rows"], "readwrite") as AnyTxn;
    const seen: string[] = [];
    const done = new Promise<void>((resolve) => { txn.oncomplete = () => resolve(); });
    await (async () => {
      await idbReq(txn.objectStore("rows").put(1, "a"));
      seen.push("after-put");
      await idbReq(txn.objectStore("rows").get("a" as IDBValidKey));
      seen.push("after-get");
    })();
    await done;
    expect(seen).toEqual(["after-put", "after-get"]);
  });
});
