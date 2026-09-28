import { expect, test } from "bun:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { evaluatedTaskFixture } from "../examples/task-workflow/fixture";
import { assertEvaluatedTaskCompatible, parseEvaluatedTaskArtifact } from "./task-artifact";
import { parseTaskWorkflowArchive } from "./task-workflow";

const root = resolve(import.meta.dir, "..");
async function cli(args: string[]) {
  const child = Bun.spawn([process.execPath, join(root, "cli.ts"), "task", ...args], { cwd: root, stdout: "pipe", stderr: "pipe" });
  const [code, stdout, stderr] = await Promise.all([child.exited, new Response(child.stdout).text(), new Response(child.stderr).text()]);
  return { code, stdout, stderr };
}
test("CLI evaluates, optimizes, compares, exports and replays portable campaigns", async () => {
  const directory = await mkdtemp(join(tmpdir(), "algal-task-workflow-"));
  try {
    const fixture = await evaluatedTaskFixture();
    const config = join(directory, "config.json");
    const responses = join(directory, "responses.json");
    const fixed = join(directory, "fixed.json");
    const optimized = join(directory, "optimized.json");
    const artifact = join(directory, "artifact.json");
    await writeFile(config, JSON.stringify(fixture.config));
    await writeFile(responses, JSON.stringify({ task: "reply" }));
    for (const [command, output] of [["evaluate", fixed], ["optimize", optimized]]) {
      const result = await cli([command!, config, "--responses", responses, "--dir", join(directory, "store"), "--out", output!]);
      expect(result.code, result.stderr).toBe(0);
      expect(JSON.parse(result.stdout).verification).toBe("parsed-only");
    }
    const original = await readFile(fixed, "utf8");
    expect(parseTaskWorkflowArchive(JSON.parse(original)).report.strategy).toBe("fixed");
    expect((await cli(["evaluate", config, "--responses", responses, "--dir", join(directory, "store"), "--out", fixed])).code).not.toBe(0);
    expect(await readFile(fixed, "utf8")).toBe(original);
    // The archive carries everything needed after the original store is gone.
    await rm(join(directory, "store"), { recursive: true, force: true });
    expect(JSON.parse((await cli(["inspect", optimized])).stdout).verification).toBe("parsed-only");
    expect(JSON.parse((await cli(["compare", fixed, optimized])).stdout).comparable).toBe(true);
    const replay = await cli(["replay", optimized]);
    expect(replay.code, replay.stderr).toBe(0);
    expect(JSON.parse(replay.stdout).verification).toBe("replayed");
    expect((await cli(["replay", optimized, "--executor-cmd", "false"])).code).not.toBe(0);
    const exported = await cli(["export", optimized, "--out", artifact]);
    expect(exported.code, exported.stderr).toBe(0);
    expect(assertEvaluatedTaskCompatible(parseEvaluatedTaskArtifact(JSON.parse(await readFile(artifact, "utf8"))), fixture.baseTask).manifestDigest).toBe(fixture.artifact.manifestDigest);
  } finally { await rm(directory, { recursive: true, force: true }); }
}, 30_000);

test("CLI saves a bounded exhausted archive and returns failure", async () => {
  const directory = await mkdtemp(join(tmpdir(), "algal-task-exhausted-"));
  try {
    const fixture = await evaluatedTaskFixture();
    const exhaustedConfig = structuredClone(fixture.config);
    exhaustedConfig.limits.budget.runs = 1;
    const config = join(directory, "config.json");
    const output = join(directory, "exhausted.json");
    const responses = join(directory, "responses.json");
    await writeFile(config, JSON.stringify(exhaustedConfig));
    await writeFile(responses, JSON.stringify({ task: "reply" }));
    const result = await cli(["optimize", config, "--responses", responses, "--dir", join(directory, "store"), "--out", output]);
    expect(result.code, result.stderr).toBe(1);
    expect(parseTaskWorkflowArchive(JSON.parse(await readFile(output, "utf8"))).report.budget.runs).toHaveLength(1);
    expect((await cli(["replay", output])).code).toBe(0);
    expect((await cli(["export", output, "--out", join(directory, "artifact.json")])).code).not.toBe(0);
    // The exhausted configuration must not lower the shared fixture's budget
    // for later tests. Exercise that later consumer in this same test so the
    // regression is independent of platform-specific test discovery order.
    const next = await evaluatedTaskFixture();
    expect(next.report.status).toBe("complete");
    expect(next.config.limits.budget.runs).toBe(20);
    expect(next.report.budget.runs).toHaveLength(7);
  } finally { await rm(directory, { recursive: true, force: true }); }
}, 30_000);
