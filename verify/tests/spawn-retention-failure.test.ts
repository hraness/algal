import { expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { requireSuccess, runCommand } from "../lib/runner";

for (const scenario of ["first-worker-failure", "copied-reader-failure"] as const) test(`registered spawn retains only diagnostic evidence after ${scenario}`, async () => {
  const directory = await mkdtemp(join(tmpdir(), "algal-spawn-retention-failure-"));
  try {
    const result = await runCommand([process.execPath, join(import.meta.dir, "fixtures/spawn-framing.ts"), scenario, directory], resolve(import.meta.dir, "../.."), { timeoutMs: 30_000, maxOutputBytes: 65_536 });
    requireSuccess(result); expect(result.stderr).toBe(""); expect(result.stdout.trim().split("\n")).toHaveLength(1);
    const frame = JSON.parse(result.stdout);
    expect(frame).toEqual({ scenario, primaryPreserved: true, publishedSuccess: false, diagnosticManifests: 1, admittedManifests: 0,
      incompleteCopies: 0, commands: scenario === "first-worker-failure" ? 1 : 88,
      readerCalls: scenario === "first-worker-failure" ? 0 : 1, rawFiles: scenario === "first-worker-failure" ? 4 : 406 });
  } finally { await rm(directory, { recursive: true, force: true }); }
}, 35_000);
