import { expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { requireSuccess, runCommand } from "../lib/runner";

const controls = [
  ["generator", "clean"], ["generator", "history-blocked"], ["generator", "trace-blocked"], ["generator", "both-blocked"],
  ["generator", "finish-failed"], ["generator", "create-failed"],
  ["worker", "clean"], ["worker", "history-blocked"], ["worker", "trace-blocked"], ["worker", "both-blocked"],
  ["worker", "trace-missing"], ["worker", "ordinary-failure"], ["worker", "success"], ["chain", "both-blocked"],
] as const;
for (const [phase, mode] of controls) test(`actual ${phase} failure catch: ${mode}`, async () => {
  const directory = await mkdtemp(join(tmpdir(), "algal-generation-failure-control-"));
  try {
    const result = await runCommand([process.execPath, join(import.meta.dir, "fixtures/generation-failure.ts"), phase, mode, directory], resolve(import.meta.dir, "../.."), { timeoutMs: 10_000, maxOutputBytes: 65_536 });
    requireSuccess(result);
    expect(result.stderr).toBe("");
    expect(result.stdout).toBe(JSON.stringify({ contract: "algal.generation-failure-control.v1", phase, mode, ok: true }) + "\n");
  } finally { await rm(directory, { recursive: true, force: true }); }
}, 15_000);
