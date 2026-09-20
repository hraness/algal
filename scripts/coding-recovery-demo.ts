/** Lost-acknowledgement recovery through an explicit durable operation adapter. */
import { mkdir, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { boundedBytes } from "../src/io";
import type { CodingJobSnapshot } from "../src/coding-jobs";
import type { RepairReport } from "../src/repair";

const root = resolve(import.meta.dir, "..");
let native: string | undefined, output: string | undefined, keep = false;
for (let i = 2; i < process.argv.length; i++) {
  const flag = process.argv[i];
  if (flag === "--keep") keep = true;
  else if ((flag === "--native" || flag === "--out") && process.argv[i + 1]) {
    const value = resolve(process.argv[++i]!);
    if (flag === "--native") native = value; else output = value;
  } else throw new Error("usage: bun scripts/coding-recovery-demo.ts [--native PATH] [--keep] [--out PATH]");
}
const evidence = await realpath(await mkdtemp(join(tmpdir(), "algal-coding-recovery-")));
const workspace = join(evidence, "workspace"), store = join(evidence, "store"), ledger = join(evidence, "ledger");
let calls = 0, success = false;
let caller: ReturnType<typeof Bun.spawn> | undefined;
function invariant(value: unknown, message: string): asserts value { if (!value) throw new Error(message); }
function launch(argv: string[], cwd = root) {
  const child = Bun.spawn(argv, {cwd, stdin: "ignore", stdout: "pipe", stderr: "pipe", timeout: 20_000});
  const result = Promise.all([child.exited, boundedBytes(child.stdout, 1_048_576, "demo stdout"), boundedBytes(child.stderr, 65_536, "demo stderr")])
    .then(([code, stdout, stderr]) => ({code, stdout: new TextDecoder().decode(stdout), stderr: new TextDecoder().decode(stderr)}));
  return {child, result};
}
async function command(argv: string[], cwd = root) {
  const execution = launch(argv, cwd);
  try { return await execution.result; }
  finally { execution.child.kill("SIGKILL"); await execution.child.exited; }
}
async function cli<T>(args: string[], expectedCode = 0): Promise<T> {
  calls++;
  const result = await command([process.execPath, join(root, "cli.ts"), ...args, "--dir", store]);
  invariant(result.code === expectedCode, `${args.slice(0, 2).join(" ")}: ${result.stderr || result.stdout}`);
  return JSON.parse(result.stdout) as T;
}
async function waitUntil(predicate: () => Promise<boolean>, label: string): Promise<void> {
  const deadline = performance.now() + 10_000;
  while (performance.now() < deadline) {
    if (await predicate()) return;
    await Bun.sleep(20);
  }
  throw new Error(`bounded wait failed: ${label}`);
}
const broken = "export function dueJobs(jobs, now, limit) { return jobs.sort((a,b)=>a.dueAt-b.dueAt).filter(j=>j.dueAt<now).slice(0,limit+1); }\n";
const fixed = "export function dueJobs(jobs, now, limit) { if(!Number.isInteger(limit)||limit<0)throw Error('limit'); return jobs.filter(j=>j.status==='ready'&&j.dueAt<=now).sort((a,b)=>a.dueAt-b.dueAt||(a.id<b.id?-1:a.id>b.id?1:0)).slice(0,limit); }\n";
try {
  const source = await command(["git", "rev-parse", "HEAD"]);
  const status = await command(["git", "status", "--porcelain", "--untracked-files=normal"]);
  invariant(source.code === 0 && status.code === 0, "source identity unavailable");
  await mkdir(workspace); await mkdir(ledger);
  await writeFile(join(workspace, "scheduler.ts"), broken);
  for (const args of [["init", "-q"], ["add", "scheduler.ts"], ["-c", "user.name=Recovery fixture", "-c", "user.email=fixture@example.invalid", "commit", "-qm", "Known failing scheduler"]]) {
    invariant((await command(["git", ...args], workspace)).code === 0, "fixture Git setup failed");
  }
  const expectedHead = (await command(["git", "rev-parse", "HEAD"], workspace)).stdout.trim();
  const check = join(evidence, "acceptance.ts");
  await writeFile(check, `import assert from "node:assert/strict";
import {appendFile} from "node:fs/promises";
const {dueJobs}=await import(${JSON.stringify(join(workspace, "scheduler.ts"))});
const jobs=[{id:"z",dueAt:5,status:"ready"},{id:"done",dueAt:1,status:"done"},{id:"a",dueAt:5,status:"ready"},{id:"b",dueAt:10,status:"ready"},{id:"later",dueAt:20,status:"ready"}];
const original=structuredClone(jobs);
assert.deepEqual(dueJobs(jobs,10,2).map(j=>j.id),["a","z"]);
assert.deepEqual(jobs,original);
assert.deepEqual(dueJobs(jobs,10,10).map(j=>j.id),["a","z","b"]);
assert.deepEqual(dueJobs(jobs,10,0),[]);
assert.throws(()=>dueJobs(jobs,10,-1)); assert.throws(()=>dueJobs(jobs,10,1.5)); assert.deepEqual(dueJobs([],10,3),[]);
await appendFile(${JSON.stringify(join(evidence, "validation-count.txt"))},"validated\\n");
console.log(JSON.stringify({ok:true,assertions:7}));\n`);
  const baseline = await command([process.execPath, check]);
  invariant(baseline.code !== 0, "fixture must fail before repair");
  await writeFile(join(evidence, "baseline.json"), JSON.stringify(baseline));
  const authorityId = `fixture-${crypto.randomUUID()}`;
  const adapter = join(evidence, "adapter.ts");
  // This fixture ledger is an admitted test authority, not a live coding provider.
  // Its terminal publication precedes a bounded response delay; no task writes
  // remain after publication. Killing the caller loses only the acknowledgement.
  await writeFile(adapter, `import {mkdir,readFile,writeFile} from "node:fs/promises";
import {join} from "node:path";
import {parseCodingOperationRequest,parseCodingOperationOutcome} from ${JSON.stringify(join(root, "src/coding-operations.ts"))};
import {digestCanonical,digestText} from ${JSON.stringify(join(root, "src/digest.ts"))};
import {hostWrite} from ${JSON.stringify(join(root, "src/host-state.ts"))};
const ledger=${JSON.stringify(ledger)}, workspace=${JSON.stringify(workspace)};
const request=parseCodingOperationRequest(JSON.parse(await Bun.stdin.text()));
if(request.action!==process.argv.at(-1)||request.binding.authorityId!==${JSON.stringify(authorityId)})throw Error("wrong fixture authority/action");
const unknown=()=>({contract:"algal.coding-operation.v1",...request.binding,revision:0,state:"unknown",reason:"missing"});
const retained=async()=>{try{return JSON.parse(await readFile(join(ledger,"terminal.json"),"utf8"));}catch(e){if(e.code!=="ENOENT")throw e;return null;}};
let outcome=await retained();
if(outcome){parseCodingOperationOutcome(outcome,request.binding);console.log(JSON.stringify(outcome));process.exit(0);}
if(request.action==="observe"){console.log(JSON.stringify(unknown()));process.exit(0);}
if(request.payload.workspace!==workspace||request.payload.expectedHead!==${JSON.stringify(expectedHead)})throw Error("wrong fixture source");
try{await mkdir(join(ledger,"admitted"));}catch(e){if(e.code!=="EEXIST")throw e;console.log(JSON.stringify(unknown()));process.exit(0);}
await hostWrite(join(ledger,"binding.json"),request.binding,4096);
await hostWrite(join(ledger,"launches.json"),{admissions:1},4096);
await writeFile(join(workspace,"scheduler.ts"),${JSON.stringify(fixed)});
const text="Repaired scheduler filtering, boundaries, ordering and input preservation.";
outcome={contract:"algal.coding-operation.v1",...request.binding,revision:2,state:"terminal",acceptanceRef:digestCanonical({contract:"fixture.acceptance.v1",...request.binding}),outcome:"completed",settlement:"all-admitted-work-settled",result:{text,digest:digestText(text),length:Buffer.byteLength(text)}};
parseCodingOperationOutcome(outcome,request.binding);
await hostWrite(join(ledger,"terminal.json"),outcome,16384);
await hostWrite(join(ledger,"ready.json"),{pid:process.pid},4096);
await Bun.sleep(1000);
try{console.log(JSON.stringify(outcome));}catch{}\n`);
  const config = join(evidence, "operation.json");
  await writeFile(config, JSON.stringify({workspace, expectedHead, operationId: "scheduler-repair", prompt: "Repair scheduler.ts; do not commit or push.",
    adapter: {protocol: "algal.coding-operation.v1", authorityId, executable: process.execPath, argvPrefix: [adapter]},
    limits: {maxRuntimeMs: 15_000, maxOutputBytes: 16_384, maxPatchBytes: 65_536, maxChangedFiles: 1}}));
  const prepared = await cli<CodingJobSnapshot>(["job", "prepare-operation", config]);
  const duplicate = await cli<CodingJobSnapshot>(["job", "prepare-operation", config]);
  invariant(prepared.jobId === duplicate.jobId, "preparation did not retain operation identity");
  const checks = join(evidence, "checks.json");
  await writeFile(checks, JSON.stringify([{name: "scheduler-contract", argv: [process.execPath, check], timeoutMs: 10_000, maxOutputBytes: 4096}]));
  await cli(["repair", "start", "lost-ack-repair", "--job", prepared.jobId, "--checks", checks]);
  const waiting = await cli<RepairReport>(["repair", "tick", "lost-ack-repair"]);
  invariant(waiting.process.process.status === "suspended", "repair did not suspend");
  calls++;
  const execution = launch([process.execPath, join(root, "cli.ts"), "job", "run", prepared.jobId, "--dir", store]);
  caller = execution.child;
  // Attach rejection handling immediately while waiting for durable publication.
  let earlyExit: {code: number; stdout: string; stderr: string} | undefined;
  const captured = execution.result.then(value => { earlyExit = value; return {value}; }, error => ({error}));
  let adapterPid = 0;
  await waitUntil(async () => {
    if (earlyExit) throw new Error(`caller exited before durable publication: ${JSON.stringify(earlyExit)}`);
    try { adapterPid = (JSON.parse(await readFile(join(ledger, "ready.json"), "utf8")) as {pid: number}).pid; return true; }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; return false; }
  }, "adapter durable terminal record");
  caller.kill("SIGKILL");
  const killed = await captured;
  invariant("value" in killed && killed.value.code !== 0, "caller did not die before acknowledgement");
  await waitUntil(async () => {
    try { process.kill(adapterPid, 0); return false; }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== "ESRCH") throw error; return true; }
  }, "bounded fixture adapter exit");
  const uncertain = await cli<CodingJobSnapshot>(["job", "inspect", prepared.jobId]);
  invariant(uncertain.status === "uncertain", "caller death did not retain uncertainty");
  const started = await readFile(join(store, "coding-jobs", prepared.jobId.slice(7), "started.json"));
  const repeated = await cli<CodingJobSnapshot>(["job", "run", prepared.jobId], 1);
  invariant(repeated.status === "uncertain", "repeat run reissued or reconciled work");
  const resolved = await cli<CodingJobSnapshot>(["job", "reconcile", prepared.jobId]);
  invariant(resolved.status === "completed" && resolved.result?.changedFiles === 1, "exact retained operation did not reconcile");
  const again = await cli<CodingJobSnapshot>(["job", "reconcile", prepared.jobId]);
  invariant(JSON.stringify(again) === JSON.stringify(resolved), "repeat reconciliation changed the terminal result");
  invariant(Buffer.compare(started, await readFile(join(store, "coding-jobs", prepared.jobId.slice(7), "started.json"))) === 0, "launch evidence was rewritten");
  const review = await cli<RepairReport>(["repair", "tick", "lost-ack-repair"]);
  invariant(review.result?.action === "review" && review.process.process.status === "complete", "repair validation did not complete");
  await cli(["repair", "tick", "lost-ack-repair"]);
  const bun = await cli<{ok: boolean; digest: string; generations: number; receipts: number}>(["repair", "verify", "lost-ack-repair"]);
  const tools = join(evidence, "offline-tools.json");
  await writeFile(tools, JSON.stringify({
    "coding.job.await.v1": {signature: {inputs: {}, outputs: {observation: "json"}, effect: "read", cost: 1, maxOutputBytes: 1024}, exec: "cmd:exit 97"},
    "coding.patch.validate.v1": {signature: {inputs: {observation: "json"}, outputs: {result: "json"}, effect: "write", cost: 100, maxOutputBytes: 8192}, exec: "cmd:exit 97"},
  }));
  let rust: typeof bun | null = null;
  if (native) {
    const result = await command([native, "process", "verify", "lost-ack-repair", "--tools", tools, "--dir", store]);
    invariant(result.code === 0, "native replay failed"); rust = JSON.parse(result.stdout) as typeof bun;
    invariant(rust.ok && rust.digest === bun.digest && rust.generations === bun.generations && rust.receipts === bun.receipts, "cross-runtime replay diverged");
  }
  const admissions = (JSON.parse(await readFile(join(ledger, "launches.json"), "utf8")) as {admissions: number}).admissions;
  const validations = (await readFile(join(evidence, "validation-count.txt"), "utf8")).trim().split("\n").length;
  invariant(admissions === 1 && validations === 1 && bun.ok && bun.generations === 2, "recovery duplicated work or failed verification");
  const report = {contract: "algal.coding-recovery-demo.v1", ok: true, liveProvider: false,
    algalSource: {commit: source.stdout.trim(), dirty: Boolean(status.stdout.trim())},
    scenario: "SIGKILL caller after durable adapter terminal publication and before acknowledgement; explicit read-only reconciliation",
    jobId: prepared.jobId, sourceHead: expectedHead, baselineFailed: true, callerKilled: "SIGKILL", uncertaintyObserved: true,
    launchMarkerPreserved: true, adapterAdmissions: admissions, validationInvocations: validations, cliInvocations: calls,
    result: review.result, verification: {bun, rust}, remoteWrites: 0, evidenceDirectory: evidence,
    limitation: "Controlled durable adapter contract qualification. Existing xcb v1 jobs remain unreconcilable; no live-provider settlement guarantee is inferred."};
  if (output) await writeFile(output, JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify(report, null, 2)); success = true;
} finally {
  if (caller) { caller.kill("SIGKILL"); await caller.exited; }
  if (success && !keep) await rm(evidence, {recursive: true, force: true});
  else console.error(`Evidence retained: ${evidence}`);
}
