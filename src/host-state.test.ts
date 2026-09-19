import { afterEach, expect, test } from "bun:test";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { hostLease } from "./host-state";

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
    const chunk = await Promise.race([
      reader.read(),
      new Promise<never>((_, reject) => { timeout = setTimeout(() => reject(new Error("child did not acquire lease")), 5_000); }),
    ]);
    expect(new TextDecoder().decode(chunk.value)).toContain("ready");
  } finally { if (timeout !== undefined) clearTimeout(timeout); reader.releaseLock(); }
}

test("real SIGKILL releases SQLite ownership; the next owner retains and reconciles the exact old marker", async () => {
  const dir = await directory();
  const child = Bun.spawn([process.execPath, "--eval", `
    import {hostLease} from ${JSON.stringify(join(import.meta.dir, "host-state.ts"))};
    await hostLease(${JSON.stringify(dir)}, "actor", async () => {
      console.log("ready"); setInterval(() => {}, 1000); await new Promise(() => {});
    });
  `], { stdin: "ignore", stdout: "pipe", stderr: "pipe" });
  children.push(child);
  await ready(child.stdout);
  const oldMarker = await readFile(join(dir, ".lock"), "utf8");
  let called = false;
  await expect(hostLease(dir, "actor", async () => { called = true; })).rejects.toThrow("held by another live operation");
  expect(called).toBe(false);
  expect(await readFile(join(dir, ".lock"), "utf8")).toBe(oldMarker);
  child.kill("SIGKILL"); await child.exited;
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
