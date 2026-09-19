/** Real SIGKILL recovery qualification. Every host action uses a fresh CLI process. */
import { spawn } from "node:child_process";
import { access, appendFile, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { digestCanonical } from "../src/digest";
import { asObject, asString, canonicalize, type JsonObject, type JsonValue } from "../src/values";

const root = resolve(import.meta.dir, "..");
let native = join(root, "target/debug/algal");
let output: string | undefined;
let keep = false;
for (let i = 2; i < process.argv.length; i++) {
  const arg = process.argv[i];
  if (arg === "--native" && process.argv[i + 1]) native = resolve(process.argv[++i]!);
  else if (arg === "--out" && process.argv[i + 1]) output = resolve(process.argv[++i]!);
  else if (arg === "--keep") keep = true;
  else throw new Error("usage: bun scripts/recovery-demo.ts [--native PATH] [--out REPORT.json] [--keep]");
}
const reference = [process.execPath, join(root, "cli.ts")];
const alternate = [native];
const temporary = await mkdtemp(join(tmpdir(), "algal-recovery-demo-"));
const active = new Set<number>();
let invocations = 0;
let success = false;
function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
function killGroup(pid: number): void {
  try { process.kill(-pid, "SIGKILL"); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== "ESRCH") throw error; }
}
function start(runtime: string[], store: string, args: string[]) {
  invocations++;
  const child = spawn(runtime[0]!, [...runtime.slice(1), ...args, "--dir", store], {
    cwd: root, detached: true, stdio: ["ignore", "pipe", "pipe"],
  });
  const pid = child.pid;
  invariant(pid !== undefined, "CLI did not spawn");
  active.add(pid);
  const stdout: Buffer[] = [];
  const stderr: Buffer[] = [];
  let bytes = 0;
  for (const [stream, chunks] of [[child.stdout, stdout], [child.stderr, stderr]] as const) {
    stream.on("data", (chunk: Buffer) => {
      bytes += chunk.length;
      if (bytes > 2_097_152) killGroup(pid);
      else chunks.push(chunk);
    });
  }
  const done = new Promise<{ code: number | null; signal: string | null; stdout: string; stderr: string }>((resolveResult, reject) => {
    child.once("error", reject);
    child.once("close", (code, signal) => {
      active.delete(pid);
      if (bytes > 2_097_152) { reject(new Error("CLI output exceeded qualification bound")); return; }
      resolveResult({ code, signal, stdout: Buffer.concat(stdout).toString(), stderr: Buffer.concat(stderr).toString() });
    });
  });
  const timer = setTimeout(() => killGroup(pid), 20_000);
  void done.finally(() => clearTimeout(timer)).catch(() => {});
  return { child, pid, done };
}
async function invoke(runtime: string[], store: string, args: string[]) {
  return await start(runtime, store, args).done;
}
async function cli(runtime: string[], store: string, args: string[]): Promise<JsonObject> {
  const result = await invoke(runtime, store, args);
  invariant(result.code === 0, `${args.join(" ")}: ${result.stderr || result.stdout}`);
  return asObject(JSON.parse(result.stdout) as unknown, "CLI result");
}
async function json(path: string): Promise<JsonObject> {
  return asObject(JSON.parse(await readFile(path, "utf8")) as unknown, path);
}
async function lines(path: string): Promise<JsonObject[]> {
  try { return (await readFile(path, "utf8")).trim().split("\n").filter(Boolean).map(line => asObject(JSON.parse(line) as unknown, "adapter log")); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return []; throw error; }
}
async function put(path: string, value: JsonValue): Promise<string> {
  await writeFile(path, canonicalize(value)); return path;
}
function shellWord(value: string): string { return "'" + value.replaceAll("'", "'\\''") + "'"; }
async function ready(path: string, run: ReturnType<typeof start>): Promise<void> {
  for (let attempt = 0; attempt < 250; attempt++) {
    try { await access(path); return; }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
    if (run.child.exitCode !== null || run.child.signalCode !== null) {
      const result = await run.done;
      throw new Error(`owner exited before pending effect: ${result.stderr || result.stdout}`);
    }
    await new Promise(resolveWait => setTimeout(resolveWait, 40));
  }
  throw new Error("owner did not enter pending effect within ten seconds");
}
const adapter = join(temporary, "adapter.ts");
await writeFile(adapter, `import {appendFile,access,writeFile} from "node:fs/promises";
import {join} from "node:path";
const [dir,stage]=process.argv.slice(2);
if(!dir||!stage)throw new Error("fixture arguments");
const request=await Bun.stdin.json();
if(!/^sha256:[a-f0-9]{64}$/.test(request.idempotencyKey))throw new Error("missing scoped key");
await appendFile(join(dir,"calls.jsonl"),JSON.stringify({stage,requestDigest:request.requestDigest,idempotencyKey:request.idempotencyKey})+"\\n");
if(stage==="pending") {
 let block=false;try{await access(join(dir,"block"));block=true;}catch(error){if(error.code!=="ENOENT")throw error;}
 if(block){await writeFile(join(dir,"ready"),JSON.stringify({pid:process.pid}));setInterval(()=>{},1000);await new Promise(()=>{});}
}
console.log(JSON.stringify({value:stage==="prefix"?"saved":"recovered"}));
`);
const manifest = await put(join(temporary, "manifest.json"), {
  contract: "algal.organism.v1", key: "organism:recovery-qualification", name: "Recovery qualification",
  cells: [{ id: "a-prefix", kind: "tool", tool: "prefix.v1" }, { id: "b-pending", kind: "tool", tool: "pending.v1" }], edges: [],
});

async function scenario(label: string, first: string[], second: string[], effect: "read" | "write"): Promise<JsonObject> {
  const dir = join(temporary, label); const store = join(dir, "store");
  await mkdir(dir); await writeFile(join(dir, "block"), "pending");
  const command = (stage: string) => "cmd:" + [process.execPath, adapter, dir, stage].map(shellWord).join(" ");
  const signature = { inputs: {}, outputs: { value: "text" }, cost: 1, maxOutputBytes: 1000 };
  const definitions = {
    "prefix.v1": { signature: { ...signature, effect: "write" }, exec: command("prefix") },
    "pending.v1": { signature: { ...signature, effect }, exec: command("pending") },
  };
  const tools = await put(join(dir, "tools.json"), definitions);
  const toolArgs = ["--tools", tools];
  await cli(first, store, ["process", "create", "worker", manifest, ...toolArgs]);
  const owner = start(first, store, ["process", "tick", "worker", "--journal", ...toolArgs]);
  await ready(join(dir, "ready"), owner);
  const uncertain = await cli(second, store, ["process", "inspect", "worker"]);
  const intent = asString(uncertain.digest, "intent", 71);
  invariant(asObject(uncertain.process, "process").status === "uncertain", "pending owner lacks uncertain intent");
  invariant((await lines(join(dir, "calls.jsonl"))).length === 2, "owner did not settle write before pending call");
  const markerBefore = await readFile(join(store, "processes/worker/.lock"), "utf8");
  const liveRecovery = await invoke(second, store, ["process", "recover", "worker", "--expected-intent", intent, ...toolArgs]);
  invariant(liveRecovery.code !== 0 && /locked|busy|held/i.test(liveRecovery.stderr + liveRecovery.stdout), "second runtime failed to exclude live owner");
  invariant(await readFile(join(store, "processes/worker/.lock"), "utf8") === markerBefore, "live owner marker changed");
  killGroup(owner.pid);
  const killed = await owner.done;
  invariant(killed.signal === "SIGKILL", "owner was not killed by SIGKILL");
  invariant((await cli(second, store, ["process", "inspect", "worker"])).digest === intent, "process death advanced head");
  await rm(join(dir, "block"));
  const idle = await cli(second, store, ["process", "schedule", ...toolArgs]);
  invariant(idle.ticks === 0, "scheduler automatically retried an uncertain process");
  const wrongIntent = await invoke(second, store, ["process", "recover", "worker", "--expected-intent", digestCanonical("wrong-intent"), ...toolArgs]);
  invariant(wrongIntent.code !== 0, "wrong intent was accepted");
  let configBlocked = false;
  if (effect === "read") {
    const changedTools = await put(join(dir, "changed-tools.json"), { ...definitions,
      "prefix.v1": { ...definitions["prefix.v1"], signature: { ...definitions["prefix.v1"].signature, cost: 2 } },
    });
    const changed = await invoke(second, store, ["process", "recover", "worker", "--expected-intent", intent, "--tools", changedTools]);
    invariant(changed.code !== 0, `changed host configuration was accepted: ${changed.stdout}`);
    invariant((await cli(second, store, ["process", "inspect", "worker"])).digest === intent, "configuration failure changed the uncertain head");
    invariant((await lines(join(dir, "calls.jsonl"))).length === 2, "configuration failure made a live call");
    configBlocked = true;
    const recovered = await cli(second, store, ["process", "recover", "worker", "--expected-intent", intent, ...toolArgs]);
    const state = asObject(recovered.process, "recovered process");
    invariant(state.status === "complete" && state.generation === 1 && state.previous === intent, "recovery did not complete the same intent/generation");
    const calls = await lines(join(dir, "calls.jsonl"));
    const writes = calls.filter(call => call.stage === "prefix");
    const reads = calls.filter(call => call.stage === "pending");
    invariant(writes.length === 1 && reads.length === 2, "recovery repeated completed write or failed to retry read once");
    invariant(reads[0]!.idempotencyKey === reads[1]!.idempotencyKey, "read retry changed process-scoped key");
    for (const runtime of [first, second]) {
      const verified = await cli(runtime, store, ["process", "verify", "worker", ...toolArgs]);
      invariant(verified.ok === true && verified.generations === 1 && verified.receipts === 1, "offline cross-runtime verification failed");
    }
    invariant((await lines(join(dir, "calls.jsonl"))).length === calls.length, "offline verification invoked adapters");
    const journal = join(store, "processes/worker/journals", intent.slice(7));
    const records: JsonObject[] = [];
    for (const name of (await readdir(join(journal, "entries"))).sort()) {
      const head = await json(join(journal, "entries", name));
      records.push(await json(join(store, "values", `${asString(head.record, "entry digest", 71).slice(7)}.json`)));
    }
    invariant(records.length === 2 && records[0]!.state === "completed" && records[0]!.attempt === 0 && records[1]!.state === "completed" && records[1]!.attempt === 1, "durable effect attempts are incorrect");
    return { label, effect, killedSignal: killed.signal, liveOwnerExcluded: true, wrongIntentBlocked: true, configurationBlocked: configBlocked,
      completedWrites: writes.length, readCalls: reads.length, offlineCalls: 0, offlineRuntimes: 2, generation: state.generation,
      recoveryAttempts: (await readdir(join(journal, "recoveries"))).length, archivedOwners: (await readdir(join(store, "processes/worker/owners"))).length,
      intent, head: recovered.digest!, receipt: state.receipt! };
  }
  for (const runtime of [second, first]) {
    const blocked = await invoke(runtime, store, ["process", "recover", "worker", "--expected-intent", intent, ...toolArgs]);
    invariant(blocked.code !== 0 && /unknown.*(write|completion)|reconciliation/i.test(blocked.stderr + blocked.stdout), "unknown write was not refused");
  }
  invariant((await cli(second, store, ["process", "inspect", "worker"])).digest === intent, "blocked write changed intent");
  invariant((await lines(join(dir, "calls.jsonl"))).length === 2, "unknown-write recovery made another call");
  return { label, effect, killedSignal: killed.signal, liveOwnerExcluded: true, wrongIntentBlocked: true, unknownWriteBlockedInBothRuntimes: true,
    completedWrites: 1, pendingWriteCalls: 1, replayCalls: 0, status: "uncertain", intent };
}

try {
  const cases: JsonObject[] = [];
  cases.push(await scenario("typescript-to-native", reference, alternate, "read"));
  cases.push(await scenario("native-to-typescript", alternate, reference, "read"));
  cases.push(await scenario("typescript-unknown-write", reference, alternate, "write"));
  cases.push(await scenario("native-unknown-write", alternate, reference, "write"));
  const report: JsonObject = { contract: "algal.recovery-demo.v1", ok: true, cliInvocations: invocations,
    realSigkills: 4, successfulCrossRuntimeRecoveries: 2, cases, ...(keep ? { evidenceDirectory: temporary } : {}) };
  if (output) { await mkdir(dirname(output), { recursive: true }); await writeFile(output, canonicalize(report) + "\n"); }
  console.log(JSON.stringify(report, null, 2));
  success = true;
} catch (error) {
  await appendFile(join(temporary, "failure.txt"), String(error) + "\n");
  console.error(`Recovery qualification evidence retained: ${temporary}`);
  throw error;
} finally {
  for (const pid of active) killGroup(pid);
  if (success && !keep) await rm(temporary, { recursive: true, force: true });
}
