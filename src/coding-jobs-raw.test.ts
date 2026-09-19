import {afterEach, describe, expect, test} from "bun:test";
import {appendFile, chmod, mkdir, mkdtemp, rm, writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {CodingJobService, type CodingJobOptions} from "./coding-jobs";
import {FileStore} from "./store";
import {asObject} from "./values";

const directories: string[] = [];
afterEach(async () => {for (const dir of directories.splice(0)) await rm(dir, {recursive: true, force: true});});
async function git(workspace: string, ...args: string[]): Promise<string> {
  const child = Bun.spawn(["git", "-c", "user.name=Raw fixture", "-c", "user.email=fixture@example.invalid", "-c", "commit.gpgsign=false", "-c", "core.hooksPath=/dev/null", "-C", workspace, ...args], {
    env: {...process.env, GIT_CONFIG_NOSYSTEM: "1", GIT_CONFIG_GLOBAL: "/dev/null"}, stdout: "pipe", stderr: "pipe",
  });
  const [out, error, code] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited]);
  if (code !== 0) throw new Error(`fixture Git failed: ${error}`);
  return out.trim();
}
async function fixture() {
  const dir = await mkdtemp(join(tmpdir(), "algal-coding-raw-")); directories.push(dir);
  const workspace = join(dir, "workspace"), root = join(dir, "store"); await mkdir(workspace);
  await git(workspace, "init", "--quiet");
  await git(workspace, "config", "filter.strip.clean", "sed '/^PRIVATE/d'");
  await writeFile(join(workspace, ".gitattributes"), "*.txt filter=strip\n");
  await writeFile(join(workspace, "answer.txt"), "before\n");
  await writeFile(join(workspace, "unchanged.txt"), "stable\n");
  await git(workspace, "add", "."); await git(workspace, "commit", "--quiet", "-m", "fixture");
  const options: CodingJobOptions = {workspace, expectedHead: await git(workspace, "rev-parse", "HEAD"), prompt: "Synthetic raw-content repair", adapter: {executable: process.execPath}, limits: {maxRuntimeMs: 1000}};
  return {workspace, root, options};
}
function completed() {return {exitCode: 0, envelope: {version: 1, session: "s_fixture", state: "idle", outcome: {terminal: "completed", joined: true, effects: "settled", pending_attention: false, failure: null}, text: "Fixture complete"}};}

describe("coding jobs bind raw tracked workspace content", () => {
  test("a clean filter cannot conceal admitted-source drift before launch", async () => {
    const f = await fixture(); let launches = 0;
    const host = new CodingJobService(f.root, {transport: async () => {launches++; return completed();}});
    const job = await host.prepare(f.options);
    await appendFile(join(f.workspace, "unchanged.txt"), "PRIVATE drift after admission\n");
    // Refresh stat metadata through the clean filter without changing the index blob.
    await git(f.workspace, "add", "unchanged.txt");
    expect(await git(f.workspace, "status", "--porcelain")).toBe("");
    await expect(host.run(job.jobId)).rejects.toMatchObject({code: "DIGEST_MISMATCH"});
    expect(launches).toBe(0);
    expect((await host.inspect(job.jobId)).status).toBe("prepared");
  });

  test("verification covers raw bytes of unchanged tracked files, despite identical Git patch", async () => {
    const f = await fixture();
    const host = new CodingJobService(f.root, {transport: async () => {await writeFile(join(f.workspace, "answer.txt"), "after\n"); return completed();}});
    const job = await host.prepare(f.options), result = await host.run(job.jobId);
    expect(result.status).toBe("completed");
    const artifact = asObject(await new FileStore(f.root).getValue(result.result!.patchRef!), "patch");
    expect(artifact.workspaceRawDigest).toMatch(/^sha256:[a-f0-9]{64}$/);
    await host.verifyWorkspace(job.jobId);
    const before = await git(f.workspace, "diff", "--binary", "--full-index", "HEAD");
    await appendFile(join(f.workspace, "unchanged.txt"), "PRIVATE unchecked mutation\n");
    expect(await git(f.workspace, "diff", "--binary", "--full-index", "HEAD")).toBe(before);
    await expect(host.verifyWorkspace(job.jobId)).rejects.toMatchObject({code: "DIGEST_MISMATCH"});
  });

  test("verification rejects tracked executable-mode drift even when local Git ignores file mode", async () => {
    const f = await fixture(); await git(f.workspace, "config", "core.fileMode", "false");
    const host = new CodingJobService(f.root, {transport: async () => completed()});
    const job = await host.prepare(f.options); expect((await host.run(job.jobId)).status).toBe("completed");
    await chmod(join(f.workspace, "unchanged.txt"), 0o755);
    expect(await git(f.workspace, "status", "--porcelain")).toBe("");
    await expect(host.verifyWorkspace(job.jobId)).rejects.toMatchObject({code: "DIGEST_MISMATCH"});
  });
});
