import {afterEach, expect, test} from "bun:test";
import {mkdtemp, readFile, rm, writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {CodingJobService, type CodingJobSnapshot} from "./coding-jobs";
import {type Digest} from "./digest";
import {ProcessSupervisor} from "./process";
import {RepairWorkflow, type RepairCheck} from "./repair";
import {FileStore} from "./store";
import {codingCommand} from "./xcb";

const directories: string[] = [];
afterEach(async () => {for (const dir of directories.splice(0)) await rm(dir, {recursive: true, force: true});});
async function git(workspace: string, ...args: string[]): Promise<string> {
  const result = await codingCommand(["/usr/bin/git", "-C", workspace, ...args], {cwd: workspace, signal: new AbortController().signal, maxOutputBytes: 8192, cleanGitEnvironment: true});
  if (result.exitCode !== 0) throw new Error("fixture git failed");
  return new TextDecoder().decode(result.stdout).trim();
}
async function scenario(failed = false) {
  const dir = await mkdtemp(join(tmpdir(), "algal-repair-store-")); directories.push(dir);
  const workspace = await mkdtemp(join(tmpdir(), "algal-repair-workspace-")); directories.push(workspace);
  await git(workspace, "init", "--quiet");
  await writeFile(join(workspace, "value.txt"), "before\n");
  await git(workspace, "add", "value.txt");
  await git(workspace, "-c", "user.name=Fixture", "-c", "user.email=fixture@example.invalid", "commit", "--quiet", "-m", "fixture");
  let launches = 0;
  const jobs = new CodingJobService(dir, {transport: async ({intent}) => {
    launches++;
    await writeFile(join(intent.workspace, "value.txt"), "repaired\n");
    return {exitCode: failed ? 2 : 0, envelope: {version: 1, session: "fixture-repair", state: failed ? "failed" : "idle",
      outcome: {terminal: failed ? "failed" : "completed", joined: true, effects: "settled", pending_attention: false, failure: failed ? "unknown" : null}, text: "fixture coding result"}};
  }});
  const job = await jobs.prepare({workspace, expectedHead: await git(workspace, "rev-parse", "HEAD"), prompt: "PRIVATE_JOB_PROMPT", adapter: {executable: process.execPath}});
  const check: RepairCheck = {name: "exact-value", argv: [process.execPath, "-e", `import {readFileSync,appendFileSync} from "node:fs"; if(readFileSync("value.txt","utf8")!=="repaired\\n") process.exit(2); appendFileSync(${JSON.stringify(join(dir,"checks.log"))},"checked\\n"); console.log("validated");`], timeoutMs: 5000, maxOutputBytes: 4096};
  return {dir, workspace, jobs, job, check, launches: () => launches};
}

class OfflineJobs extends CodingJobService {
  override async inspect(_jobId: Digest): Promise<CodingJobSnapshot> {throw new Error("offline verification invoked job inspection");}
  override async verifyWorkspace(_jobId: Digest): Promise<void> {throw new Error("offline verification touched the workspace");}
}

test("repair waits across restart, validates the exact completed patch, and verifies without live work", async () => {
  const {dir, jobs, job, check, launches} = await scenario();
  const workflow = new RepairWorkflow(dir, {jobs});
  const started = await workflow.start("episode", job.jobId, [check]);
  expect(started.process.process.status).toBe("ready");
  expect(await workflow.start("episode", job.jobId, [check])).toEqual(started);
  expect(launches()).toBe(0);
  const waiting = await workflow.tick("episode");
  expect(waiting.process.process.status).toBe("suspended");
  expect(await workflow.tick("episode")).toEqual(waiting);
  expect(launches()).toBe(0);
  const done = await jobs.run(job.jobId);
  expect(done.status).toBe("completed");
  const resumed = await new RepairWorkflow(dir).tick("episode");
  expect(resumed.process.process.status).toBe("complete");
  expect(resumed.process.process.generation).toBe(2);
  expect(resumed.result).toMatchObject({action: "review", jobId: job.jobId, patchRef: done.result!.patchRef, patchDigest: done.result!.patchDigest, remoteWriteAuthorized: false});
  expect(resumed.result!.checks[0]).toMatchObject({name: "exact-value", exitCode: 0, outputBytes: 10});
  const output = await new FileStore(dir).getValue(resumed.result!.checks[0]!.outputRef);
  expect(output).toMatchObject({encoding: "base64", stdout: Buffer.from("validated\n").toString("base64")});
  expect(await readFile(join(dir,"checks.log"), "utf8")).toBe("checked\n");
  const offline = new RepairWorkflow(dir, {jobs: new OfflineJobs(dir)});
  expect(await offline.verify("episode")).toMatchObject({ok: true, generations: 2, receipts: 2});
  expect(await offline.inspect("episode")).toEqual(resumed);
  expect(await offline.tick("episode")).toEqual(resumed);
  expect(await readFile(join(dir,"checks.log"), "utf8")).toBe("checked\n");
  const receipt = await new FileStore(dir).getReceipt(resumed.process.process.receipt!);
  expect(JSON.stringify(receipt)).not.toContain("PRIVATE_JOB_PROMPT");
  expect(launches()).toBe(1);
});

test("a changed completed patch is rejected before any validation command", async () => {
  const {dir, workspace, jobs, job, check} = await scenario();
  await jobs.run(job.jobId);
  await writeFile(join(workspace, "value.txt"), "changed-after-job\n");
  const workflow = new RepairWorkflow(dir, {jobs});
  await workflow.start("changed", job.jobId, [check]);
  const result = await workflow.tick("changed");
  expect(result.result).toMatchObject({action: "rejected", reason: "workspace-changed-before:exact-value", checks: []});
  expect(await Bun.file(join(dir,"checks.log")).exists()).toBe(false);
});

test("validation cannot claim review after changing the admitted patch", async () => {
  const {dir, jobs, job} = await scenario();
  await jobs.run(job.jobId);
  const check: RepairCheck = {name: "mutating-check", argv: [process.execPath, "-e", 'await Bun.write("value.txt", "changed-by-check");'], timeoutMs: 5000, maxOutputBytes: 1024};
  const workflow = new RepairWorkflow(dir, {jobs});
  await workflow.start("mutating", job.jobId, [check]);
  expect((await workflow.tick("mutating")).result).toMatchObject({action: "rejected", reason: "workspace-changed-after:mutating-check"});
});

test("failed checks stop later validation and failed jobs run no checks", async () => {
  const {dir, jobs, job, check} = await scenario();
  await jobs.run(job.jobId);
  const workflow = new RepairWorkflow(dir, {jobs});
  await workflow.start("failed-gate", job.jobId, [{...check, name: "reject", argv: [process.execPath, "-e", "process.exit(3)"]}, check]);
  const result = await workflow.tick("failed-gate");
  expect(result.result).toMatchObject({action: "rejected", reason: "check-failed:reject"});
  expect(result.result!.checks).toHaveLength(1);
  expect(result.result!.checks[0]?.exitCode).toBe(3);
  expect(await Bun.file(join(dir,"checks.log")).exists()).toBe(false);
  const failed = await scenario(true);
  await failed.jobs.run(failed.job.jobId);
  const rejected = new RepairWorkflow(failed.dir, {jobs: failed.jobs});
  await rejected.start("failed-job", failed.job.jobId, [failed.check]);
  expect((await rejected.tick("failed-job")).result).toMatchObject({action: "rejected", reason: "coding-job-failed", checks: []});
  expect(await Bun.file(join(failed.dir,"checks.log")).exists()).toBe(false);
});

test("an interrupted validation command leaves an uncertain process and cannot rerun", async () => {
  const {dir, jobs, job} = await scenario();
  await jobs.run(job.jobId);
  const workflow = new RepairWorkflow(dir, {jobs});
  await workflow.start("interrupted", job.jobId, [{name: "slow", argv: [process.execPath, "-e", "await Bun.sleep(10000);"], timeoutMs: 20, maxOutputBytes: 1024}]);
  await expect(workflow.tick("interrupted")).rejects.toMatchObject({uncertain: true});
  const uncertain = await workflow.inspect("interrupted");
  expect(uncertain.process.process.status).toBe("uncertain");
  expect(uncertain.result).toBeNull();
  const journal = await new ProcessSupervisor(dir).journal("interrupted") as {effects: {record: {state: string; recovery: string}}[]};
  expect(journal.effects.map(item => [item.record.state,item.record.recovery])).toEqual([["completed","read"],["started","never"]]);
  await expect(new RepairWorkflow(dir).tick("interrupted")).rejects.toThrow("uncertain");
  expect((await workflow.inspect("interrupted")).process.digest).toBe(uncertain.process.digest);
});

test("repair configuration is immutable, host-selected, and bounded", async () => {
  const {dir, jobs, job, check} = await scenario();
  const workflow = new RepairWorkflow(dir, {jobs});
  await workflow.start("configured", job.jobId, [check]);
  await expect(workflow.start("configured", job.jobId, [{...check, timeoutMs: 2}])).rejects.toThrow("conflicts");
  for (const checks of [[], [check,check], [{...check, argv: ["bun","test"]}], [{...check, timeoutMs: 600001}], [{...check, maxOutputBytes: 65537}]]) {
    await expect(workflow.start("bad", job.jobId, checks)).rejects.toThrow();
  }
});
