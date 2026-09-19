/** Fresh-process qualification of durable coding jobs and the repair VM. */
import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { boundedBytes } from "../src/io";
import type { CodingJobSnapshot } from "../src/coding-jobs";
import type { RepairReport } from "../src/repair";

const root = resolve(import.meta.dir, "..");
let native: string | undefined, xcb: string | undefined, account: string | undefined, model: string | undefined, output: string | undefined;
let keep = false;
for (let i = 2; i < process.argv.length; i++) {
  const arg = process.argv[i];
  if (arg === "--keep") keep = true;
  else if (["--native", "--xcb", "--account", "--model", "--out"].includes(arg ?? "") && process.argv[i + 1]) {
    const value = process.argv[++i]!;
    if (arg === "--native") native = resolve(value);
    if (arg === "--xcb") xcb = resolve(value);
    if (arg === "--account") account = value;
    if (arg === "--model") model = value;
    if (arg === "--out") output = resolve(value);
  } else throw new Error("usage: bun scripts/repair-demo.ts [--native PATH] [--xcb PATH --account ID --model NAME] [--keep] [--out PATH]");
}
const evidence = await mkdtemp(join(tmpdir(), "algal-repair-demo-"));
const workspace = join(evidence, "workspace"), store = join(evidence, "store");
let invocations = 0, success = false;
function invariant(value: unknown, message: string): asserts value { if (!value) throw new Error(message); }
async function command(argv: string[], cwd = root, timeout = 30_000): Promise<{code: number; stdout: string; stderr: string}> {
  const child = Bun.spawn(argv, {cwd, stdin: "ignore", stdout: "pipe", stderr: "pipe", timeout});
  try {
    const [code, stdout, stderr] = await Promise.all([child.exited, boundedBytes(child.stdout, 1_048_576, "qualification stdout"), boundedBytes(child.stderr, 1_048_576, "qualification stderr")]);
    return {code, stdout: new TextDecoder().decode(stdout), stderr: new TextDecoder().decode(stderr)};
  } finally {child.kill("SIGKILL"); await child.exited;}
}
async function cli<T>(args: string[], timeout = 30_000): Promise<T> {
  invocations++;
  const result = await command([process.execPath, join(root, "cli.ts"), ...args, "--dir", store], root, timeout);
  invariant(result.code === 0, `${args.slice(0, 2).join(" ")}: ${result.stderr || result.stdout}`);
  return JSON.parse(result.stdout);
}
const broken = `export function dueJobs(jobs, now, limit) {
  return jobs.sort((a,b) => a.dueAt-b.dueAt).filter(job => job.dueAt < now).slice(0,limit+1);
}\n`;
const fixed = `export function dueJobs(jobs, now, limit) {
  if (!Number.isInteger(limit) || limit < 0) throw new Error("invalid limit");
  return jobs.filter(job => job.status === "ready" && job.dueAt <= now)
    .sort((a,b) => a.dueAt-b.dueAt || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)).slice(0,limit);
}\n`;
try {
  const algalHead = await command(["git", "rev-parse", "HEAD"]);
  const algalStatus = await command(["git", "status", "--porcelain", "--untracked-files=normal"]);
  invariant(algalHead.code === 0 && algalStatus.code === 0, "Algal source identity unavailable");
  await mkdir(workspace);
  await writeFile(join(workspace, "scheduler.ts"), broken);
  for (const args of [["init", "-q"], ["add", "scheduler.ts"], ["-c", "user.name=Algal qualification", "-c", "user.email=qualification@example.invalid", "commit", "-qm", "Known failing scheduler fixture"]]) {
    const result = await command(["git", ...args], workspace);
    invariant(result.code === 0, "fixture Git setup failed");
  }
  const head = (await command(["git", "rev-parse", "HEAD"], workspace)).stdout.trim();
  const check = join(evidence, "validate.ts");
  await writeFile(check, `import assert from "node:assert/strict";
import {pathToFileURL} from "node:url";
const {dueJobs} = await import(pathToFileURL(process.argv[2]+"/scheduler.ts").href);
const items = [
 {id:"z",dueAt:5,status:"ready"}, {id:"done",dueAt:1,status:"done"},
 {id:"a",dueAt:5,status:"ready"}, {id:"later",dueAt:20,status:"ready"}, {id:"b",dueAt:10,status:"ready"}
];
const copy=structuredClone(items);
assert.deepEqual(dueJobs(items,10,2).map(x=>x.id),["a","z"]);
assert.deepEqual(items,copy,"input must remain unchanged");
assert.deepEqual(dueJobs(items,10,10).map(x=>x.id),["a","z","b"]);
assert.deepEqual(dueJobs(items,10,0),[]);
assert.throws(()=>dueJobs(items,10,-1)); assert.throws(()=>dueJobs(items,10,1.5));
assert.deepEqual(dueJobs([],10,3),[]);
console.log(JSON.stringify({ok:true,assertions:7}));\n`);
  const baseline = await command([process.execPath, check, workspace]);
  invariant(baseline.code !== 0, "repair qualification must begin with a failing check");
  await writeFile(join(evidence, "baseline.json"), JSON.stringify(baseline));
  const calls = join(evidence, "adapter-calls.txt");
  let executable = xcb;
  if (!executable) {
    executable = join(evidence, "fixture-xcb");
    await writeFile(executable, `#!${process.execPath}\nimport {appendFile,writeFile} from "node:fs/promises";
await Bun.stdin.text();
await appendFile(${JSON.stringify(calls)},${JSON.stringify("launch\n")});
await writeFile(${JSON.stringify(join(workspace, "scheduler.ts"))},${JSON.stringify(fixed)});
console.log(JSON.stringify({version:1,session:"fixture-session",state:"idle",outcome:{terminal:"completed",joined:true,effects:"settled",pending_attention:false,failure:null},text:"Fixed scheduler boundary, filtering, ordering, and mutation behavior."}));\n`);
    await chmod(executable, 0o700);
  }
  const config = join(evidence, "job.json");
  await writeFile(config, JSON.stringify({workspace, expectedHead: head,
    prompt: "Repair scheduler.ts in this checkout. dueJobs(jobs, now, limit) must return at most limit jobs with status exactly 'ready' and dueAt <= now, sorted by dueAt ascending then id lexicographically. Do not mutate the input array or its objects. Zero limit returns []; negative or noninteger limits throw. Read and edit only scheduler.ts. Do not create commits or additional files. The host runs independent tests after you finish; you do not need shell execution. Explain your changes briefly.",
    adapter: {executable, ...(account ? {account} : {}), ...(model ? {model} : {})},
    limits: {maxRuntimeMs: 180_000, maxOutputBytes: 262_144, maxPatchBytes: 65_536, maxChangedFiles: 1}}));
  const admitted = await cli<CodingJobSnapshot>(["job", "prepare", config]);
  invariant(admitted.status === "prepared", "job not prepared");
  const checks = join(evidence, "checks.json");
  await writeFile(checks, JSON.stringify([{name: "scheduler-contract", argv: [process.execPath, check, workspace], timeoutMs: 10_000, maxOutputBytes: 4096}]));
  await cli(["repair", "start", "scheduler-repair", "--job", admitted.jobId, "--checks", checks]);
  const waiting = await cli<RepairReport>(["repair", "tick", "scheduler-repair"]);
  invariant(waiting.process.process.status === "suspended", "VM did not suspend before coding work");
  const settled = await cli<CodingJobSnapshot>(["job", "run", admitted.jobId], 200_000);
  invariant(settled.status === "completed" && settled.result?.changedFiles === 1, "coding job did not retain exactly one repaired file");
  const repeated = await cli<CodingJobSnapshot>(["job", "run", admitted.jobId]);
  invariant(JSON.stringify(repeated) === JSON.stringify(settled), "repeated run changed the durable outcome");
  const reviewed = await cli<RepairReport>(["repair", "tick", "scheduler-repair"]);
  invariant(reviewed.process.process.status === "complete" && reviewed.result?.action === "review", "repair VM did not validate its patch");
  invariant(reviewed.result.checks.length === 1 && reviewed.result.checks[0].exitCode === 0, "independent validation did not pass");
  const verified = await cli<{ok: boolean; generations: number}>(["repair", "verify", "scheduler-repair"]);
  invariant(verified.ok === true && verified.generations === 2, "offline VM verification failed");
  const offlineTools = join(evidence, "offline-tools.json");
  await writeFile(offlineTools, JSON.stringify({
    "coding.job.await.v1": {signature: {inputs: {}, outputs: {observation: "json"}, effect: "read", cost: 1, maxOutputBytes: 1024}, exec: "cmd:exit 97"},
    "coding.patch.validate.v1": {signature: {inputs: {observation: "json"}, outputs: {result: "json"}, effect: "write", cost: 100, maxOutputBytes: 8192}, exec: "cmd:exit 97"},
  }));
  let nativeVerification: unknown = null;
  if (native) {
    invocations++;
    const result = await command([native, "process", "verify", "scheduler-repair", "--tools", offlineTools, "--dir", store]);
    invariant(result.code === 0, `native offline verification failed: ${result.stderr || result.stdout}`);
    nativeVerification = JSON.parse(result.stdout);
    invariant((nativeVerification as {ok: boolean}).ok, "native verification was not successful");
  }
  const launchCount = xcb ? null : (await readFile(calls, "utf8")).trim().split("\n").length;
  if (!xcb) invariant(launchCount === 1, "fixture coding job relaunched");
  const report = {contract: "algal.repair-demo.v1", ok: true, liveProvider: Boolean(xcb), fixtureAdapterLaunches: launchCount, cliInvocations: invocations,
    algalSource: {commit: algalHead.stdout.trim(), dirty: Boolean(algalStatus.stdout.trim())},
    baselineFailed: true, jobId: admitted.jobId, session: settled.result.session, sourceHead: head, patchRef: settled.result.patchRef,
    validation: reviewed.result, verification: {bun: verified, rust: nativeVerification}, generations: 2, remoteWrites: 0,
    evidenceDirectory: evidence, limitation: "One controlled local bug; no production PR was modified. Local job completion does not provide automatic recovery of unacknowledged provider work."};
  if (output) await writeFile(output, JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify(report, null, 2));
  success = true;
} finally {
  if (success && !keep) await rm(evidence, {recursive: true, force: true});
  else console.error(`Evidence retained: ${evidence}`);
}
