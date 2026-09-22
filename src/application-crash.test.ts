import { afterEach, expect, test } from "bun:test";
import { randomBytes } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const directories: string[] = [];
const children: Bun.Subprocess[] = [];
const helper = join(import.meta.dir, "fixtures", "application-crash-child.ts");
afterEach(async () => {
  for (const child of children.splice(0)) { if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL"); await child.exited; }
  for (const directory of directories.splice(0)) await rm(directory, { recursive: true, force: true });
});
async function bounded(stream: ReadableStream<Uint8Array>): Promise<string> {
  const chunks: Uint8Array[] = []; let size = 0;
  for await (const chunk of stream) { size += chunk.length; if (size > 65536) throw new Error("Crash child output exceeded bound"); chunks.push(chunk); }
  return Buffer.concat(chunks).toString("utf8");
}
async function run(directory: string, mode: string, point: string, token: string, kill: boolean): Promise<number> {
  const child = Bun.spawn([process.execPath, helper, directory, mode, point, token], { stdin: "ignore", stdout: "pipe", stderr: "pipe" });
  children.push(child);
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => { timeout = setTimeout(() => { child.kill("SIGKILL"); reject(new Error(`Crash fixture timed out at ${mode}:${point}`)); }, 10000); });
  const stderr = bounded(child.stderr);
  try {
    if (kill) {
      const reader = child.stdout.getReader(); let bytes = "";
      try {
        while (!bytes.includes("\n")) {
          const chunk = await Promise.race([reader.read(), deadline]);
          if (chunk.done) throw new Error(`Child exited before its barrier: ${await stderr}`);
          bytes += new TextDecoder().decode(chunk.value); if (bytes.length > 2048) throw new Error("Crash barrier exceeded bound");
        }
        const barrier = JSON.parse(bytes.trim());
        expect(barrier).toEqual({ token, point, pid: child.pid });
      } finally { reader.releaseLock(); }
      // Kill the owned child handle only after its exact unpredictable token.
      child.kill("SIGKILL"); await Promise.race([child.exited, deadline]);
      expect(child.signalCode).toBe("SIGKILL"); expect(await stderr).toBe("");
    } else {
      const [output, errors, code] = await Promise.race([Promise.all([bounded(child.stdout), stderr, child.exited]), deadline]);
      expect(errors).toBe(""); expect(code).toBe(0);
      expect(JSON.parse(output)).toEqual({ ok: true, token, point, pid: child.pid });
    }
    return child.pid;
  } finally {
    clearTimeout(timeout);
    if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
    await child.exited;
  }
}

for (const point of ["prepared", "head-published", "dispatch-started", "effect-applied", "dispatch-settled"]) {
  test(`application survives real SIGKILL at ${point}`, async () => {
    const directory = await mkdtemp(join(tmpdir(), "algal-app-crash-")); directories.push(directory);
    const token = randomBytes(24).toString("hex");
    const setup = await run(directory, "setup", point, token, false);
    const killed = await run(directory, "crash", point, token, true);
    const reopened = await run(directory, "verify", point, token, false);
    expect(new Set([setup, killed, reopened]).size).toBe(3);
  }, 30000);
}
