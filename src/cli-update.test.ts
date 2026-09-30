import { expect, test } from "bun:test";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

test("Bun update reports its manual workflow without creating a store or install state", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "algal-source-update-"));
  try {
    const command = Bun.spawn([process.execPath, join(import.meta.dir, "../cli.ts"), "update", "status", "--json"], {cwd, stdout: "pipe", stderr: "pipe"});
    const report = await new Response(command.stdout).json() as Record<string, unknown>;
    expect(await command.exited).toBe(0);
    expect(report.status).toBe("unsupported");
    expect(report.supported).toBe(false);
    expect(report.instructions).toContain("stays on Bun");
    expect(await readdir(cwd)).toEqual([]);
  } finally { await rm(cwd, {recursive: true, force: true}); }
});
