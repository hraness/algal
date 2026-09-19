import { expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { CodingJobService } from "./coding-jobs";
import { boundedBytes } from "./io";
import { RepairWorkflow, type RepairReport } from "./repair";
import { codingCommand } from "./xcb";

async function git(workspace: string, ...args: string[]): Promise<string> {
  const result = await codingCommand(["/usr/bin/git", "-C", workspace, ...args], {
    cwd: workspace, signal: new AbortController().signal,
    maxOutputBytes: 8192, cleanGitEnvironment: true,
  });
  if (result.exitCode !== 0) throw new Error("fixture Git command failed");
  return new TextDecoder().decode(result.stdout).trim();
}

async function tick(dir: string): Promise<{code: number; report: RepairReport}> {
  const child = Bun.spawn([process.execPath, resolve(import.meta.dir, "../cli.ts"),
    "repair", "tick", "episode", "--dir", dir], {
    stdin: "ignore", stdout: "pipe", stderr: "pipe", timeout: 15_000,
  });
  try {
    const [code, stdout, stderr] = await Promise.all([
      child.exited, boundedBytes(child.stdout, 262_144, "CLI output"),
      boundedBytes(child.stderr, 16_384, "CLI diagnostics"),
    ]);
    expect(new TextDecoder().decode(stderr)).toBe("");
    return {code, report: JSON.parse(new TextDecoder().decode(stdout)) as RepairReport};
  } finally {
    child.kill("SIGKILL");
    await child.exited;
  }
}

test("repair CLI distinguishes prepared waiting from an uncertain external job without advancing the VM", async () => {
  const root = await mkdtemp(join(tmpdir(), "algal-repair-cli-"));
  try {
    const workspace = join(root, "workspace"), dir = join(root, "store");
    await mkdir(workspace);
    await git(workspace, "init", "--quiet");
    await writeFile(join(workspace, "value.txt"), "before\n");
    await git(workspace, "add", "value.txt");
    await git(workspace, "-c", "user.name=Fixture", "-c", "user.email=fixture@example.invalid",
      "commit", "--quiet", "-m", "fixture");
    let launches = 0;
    const jobs = new CodingJobService(dir, {transport: async () => {
      launches++;
      throw new Error("synthetic lost acknowledgement; no provider invoked");
    }});
    const job = await jobs.prepare({workspace, expectedHead: await git(workspace, "rev-parse", "HEAD"),
      prompt: "Synthetic CLI qualification", adapter: {executable: process.execPath}});
    await new RepairWorkflow(dir, {jobs}).start("episode", job.jobId, [{name: "must-not-run",
      argv: [process.execPath, "-e", "process.exit(99)"], timeoutMs: 1000, maxOutputBytes: 1024}]);
    const waiting = await tick(dir);
    expect(waiting.code).toBe(0);
    expect(waiting.report.process.process.status).toBe("suspended");
    expect(launches).toBe(0);
    expect((await jobs.run(job.jobId)).status).toBe("uncertain");
    const blocked = await tick(dir);
    expect(blocked.code).toBe(1);
    expect(blocked.report).toEqual(waiting.report);
    expect(blocked.report.result).toBeNull();
    expect(launches).toBe(1);
  } finally {
    await rm(root, {recursive: true, force: true});
  }
}, 30_000);
