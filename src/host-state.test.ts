import { afterEach, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { mkdtemp, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { hostLease, hostRead, hostWrite } from "./host-state";
import { boundedBytes } from "./io";
import { asJsonValue } from "./values";

const directories: string[] = [];
const children: Bun.Subprocess[] = [];
afterEach(async () => {
  for (const child of children.splice(0)) { if (child.exitCode === null) child.kill("SIGKILL"); await child.exited; }
  for (const dir of directories.splice(0)) await rm(dir, { recursive: true, force: true });
});
async function directory() {
  const dir = await mkdtemp(join(tmpdir(), "algal-host-state-")); directories.push(dir); return dir;
}
async function ready(stream: ReadableStream<Uint8Array>): Promise<void> {
  const reader = stream.getReader();
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      (async () => {
        let bytes = 0;
        let line = "";
        while (true) {
          const chunk = await reader.read();
          if (chunk.done) throw new Error("lease holder exited before readiness");
          bytes += chunk.value.byteLength;
          if (bytes > 4_096) throw new Error("lease holder readiness exceeded its byte bound");
          line += new TextDecoder().decode(chunk.value);
          if (line.includes("\n")) { expect(line.trim()).toBe("ready"); return; }
        }
      })(),
      new Promise<never>((_, reject) => { timeout = setTimeout(() => reject(new Error("child did not acquire lease")), 5_000); }),
    ]);
  } finally {
    if (timeout !== undefined) clearTimeout(timeout);
    await reader.cancel();
    reader.releaseLock();
  }
}

test("host JSON rejects malformed UTF-8 before immutable or mutable publication", async () => {
  const dir = await directory();
  const path = join(dir, "record.json");
  for (const bytes of [
    Buffer.from([0x22, 0xff, 0x22]),
    Buffer.from([0x7b, 0x22, 0xff, 0x22, 0x3a, 0x31, 0x7d]),
    Buffer.concat([Buffer.from('{"x":"'), Buffer.from([0xed, 0xa0, 0x80]), Buffer.from('","x":1}')]),
  ]) {
    const value = asJsonValue(JSON.parse(bytes.toString("utf8")), "lossy fixture");
    await writeFile(path, bytes);
    await expect(hostRead(path, 4096)).rejects.toThrow();
    await expect(hostWrite(path, value, 4096)).rejects.toThrow();
    await expect(hostWrite(path, value, 4096, false)).rejects.toThrow();
    expect(await readFile(path)).toEqual(bytes);
    expect(await readdir(dir)).toEqual(["record.json"]);
  }
});

test("host JSON preserves normalization, valid U+FFFD and escaped lone surrogates but rejects BOM", async () => {
  const dir = await directory();
  const path = join(dir, "record.json");
  for (const raw of [
    ' \n{"x":0,"x":1e0,"replacement":"�"}\t',
    '"\\ud800"',
    '{"\\ud800":"\\udfff","x":"\\ud800","x":1}',
  ]) {
    const value = asJsonValue(JSON.parse(raw), "JSON fixture");
    await writeFile(path, raw);
    expect(await hostRead(path, 4096)).toEqual(value);
    await hostWrite(path, value, 4096);
    expect(await readFile(path, "utf8")).toBe(raw);
  }
  const bom = Buffer.from('\ufeff"bom"');
  await writeFile(path, bom);
  await expect(hostRead(path, 4096)).rejects.toThrow();
  await expect(hostWrite(path, "bom", 4096, false)).rejects.toThrow();
  expect(await readFile(path)).toEqual(bom);
});

test("real SIGKILL releases SQLite ownership; the next owner retains and reconciles the exact old marker", async () => {
  const dir = await directory();
  const child = Bun.spawn([process.execPath, "--eval", `
    import {hostLease} from ${JSON.stringify(join(import.meta.dir, "host-state.ts"))};
    import {writeSync} from "node:fs";
    await hostLease(${JSON.stringify(dir)}, "actor", async () => {
      const released = new Promise(resolve => {
        process.stdin.once("data", resolve);
        process.stdin.resume();
      });
      // Collect after suspension to prove the stdin callback retains custody.
      setTimeout(() => {
        Bun.gc(true);
        writeSync(1, "ready\\n");
      }, 0);
      await released;
    });
  `], { stdin: "pipe", stdout: "pipe", stderr: "pipe" });
  children.push(child);
  const stderr = boundedBytes(child.stderr, 65_536, "lease holder stderr").then(
    bytes => new TextDecoder().decode(bytes),
    error => {
      if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
      return error instanceof Error ? error : new Error(String(error));
    },
  );
  await ready(child.stdout);
  expect(child.exitCode).toBeNull();
  expect(child.signalCode).toBeNull();
  const oldMarker = await readFile(join(dir, ".lock"), "utf8");
  let called = false;
  await expect(hostLease(dir, "actor", async () => { called = true; })).rejects.toThrow("held by another live operation");
  expect(called).toBe(false);
  expect(await readFile(join(dir, ".lock"), "utf8")).toBe(oldMarker);
  child.kill("SIGKILL"); await child.exited;
  expect(await stderr).toBe("");
  expect(await readFile(join(dir, ".lock"), "utf8")).toBe(oldMarker);
  expect(await hostLease(dir, "actor", async () => "recovered")).toBe("recovered");
  const history = await readdir(join(dir, "owners"));
  expect(history).toHaveLength(1);
  expect(await readFile(join(dir, "owners", history[0]!), "utf8")).toBe(oldMarker);
  expect(await readdir(dir)).toContain(".owner.sqlite");
  expect(await readdir(dir)).not.toContain(".lock");
});

test("legacy and wrong-owner markers fail closed and remain byte-for-byte intact", async () => {
  for (const marker of ['{"pid":2147483647}', JSON.stringify({ contract: "algal.process-owner.v2", process: "other", nonce: "a".repeat(64) })]) {
    const dir = await directory();
    await writeFile(join(dir, ".lock"), marker);
    let called = false;
    await expect(hostLease(dir, "actor", async () => { called = true; })).rejects.toThrow("requires operator reconciliation");
    expect(called).toBe(false);
    expect(await readFile(join(dir, ".lock"), "utf8")).toBe(marker);
  }
});

test("initialized custody needs no bootstrap writes while a reader retains a shared lock", async () => {
  for (const uppercase of [false, true]) {
    const dir = await directory();
    const path = join(dir, ".owner.sqlite");
    if (uppercase) {
      const database = new Database(path);
      database.exec("CREATE TABLE ALGAL_OWNER(contract TEXT PRIMARY KEY); INSERT INTO ALGAL_OWNER VALUES('algal.process-owner.v2');");
      database.close();
    } else await hostLease(dir, "actor", async () => undefined);
    const before = await readFile(path);
    const inode = (await stat(path)).ino;
    const reader = new Database(path);
    try {
      reader.exec("BEGIN; SELECT contract FROM algal_owner;");
      expect(await hostLease(dir, "actor", async () => "admitted")).toBe("admitted");
      expect(await readFile(path)).toEqual(before);
      expect((await stat(path)).ino).toBe(inode);
      expect(await readdir(dir)).not.toContain(".lock");
    } finally { reader.exec("ROLLBACK;"); reader.close(); }
  }
});

test("empty interrupted initialization recovers explicitly without replacing the database", async () => {
  const dir = await directory();
  const path = join(dir, ".owner.sqlite");
  const partial = new Database(path);
  partial.exec("CREATE TABLE algal_owner(contract TEXT PRIMARY KEY);");
  partial.close();
  const inode = (await stat(path)).ino;
  expect(await hostLease(dir, "actor", async () => "recovered")).toBe("recovered");
  expect((await stat(path)).ino).toBe(inode);
  expect(await hostLease(dir, "actor", async () => "reopened")).toBe("reopened");
  expect(await readdir(dir)).not.toContain(".lock");
});

test("incompatible owner schema and contracts remain unchanged without admitting an action", async () => {
  for (const setup of [
    "CREATE VIEW algal_owner AS SELECT 'algal.process-owner.v2' AS contract;",
    "CREATE VIEW ALGAL_OWNER AS SELECT 'algal.process-owner.v2' AS contract;",
    "CREATE TABLE algal_owner(contract TEXT PRIMARY KEY); INSERT INTO algal_owner VALUES('unknown');",
    "CREATE TABLE algal_owner(contract TEXT PRIMARY KEY); INSERT INTO algal_owner VALUES('algal.process-owner.v2'),('unknown');",
    "CREATE TABLE algal_owner(contract TEXT PRIMARY KEY); INSERT INTO algal_owner VALUES(NULL);",
    "CREATE TABLE algal_owner(other TEXT);",
    "CREATE TABLE algal_owner(contract INTEGER PRIMARY KEY);",
    "CREATE TABLE algal_owner(contract TEXT PRIMARY KEY, other TEXT);",
    "CREATE TABLE algal_owner(contract TEXT PRIMARY KEY DEFAULT 'unknown');",
  ]) {
    const dir = await directory();
    const path = join(dir, ".owner.sqlite");
    const database = new Database(path);
    database.exec(setup); database.close();
    const before = await readFile(path);
    let called = false;
    await expect(hostLease(dir, "actor", async () => { called = true; })).rejects.toThrow();
    expect(called).toBe(false);
    expect(await readFile(path)).toEqual(before);
    expect(await readdir(dir)).not.toContain(".lock");
    expect(await readdir(dir)).not.toContain("owners");
  }
});
