/** Reproducible VM lifecycle demo. Every CLI call is a fresh OS process. */
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { digestCanonical } from "../src/digest";
import { asObject, asString as boundedString, canonicalize, type JsonObject, type JsonValue } from "../src/values";

const root = resolve(import.meta.dir, "..");
const fixtures = join(root, "examples/vm");
const manifest = join(fixtures, "release-review.algal.json");
const argv = process.argv.slice(2);
let native: string | undefined;
let output: string | undefined;
let keep = false;
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === "--native" && argv[i + 1]) native = resolve(argv[++i]!);
  else if (argv[i] === "--out" && argv[i + 1]) output = resolve(argv[++i]!);
  else if (argv[i] === "--keep") keep = true;
  else throw new Error("usage: bun scripts/vm-demo.ts [--native PATH] [--out REPORT.json] [--keep]");
}
const temporary = await mkdtemp(join(tmpdir(), "algal-vm-demo-"));
const reference = [process.execPath, join(root, "cli.ts")];
const alternate = native ? [native] : reference;
let cliInvocations = 0;
function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
function shellWord(value: string): string {
  return "'" + value.replaceAll("'", "'\\''") + "'";
}
async function invoke(runtime: string[], store: string, args: string[]) {
  cliInvocations++;
  const proc = Bun.spawn([...runtime, ...args, "--dir", store], {
    cwd: root, stdout: "pipe", stderr: "pipe",
  });
  const timer = setTimeout(() => proc.kill(), 30_000);
  try {
    const [stdout, stderr, code] = await Promise.all([
      new Response(proc.stdout).text(), new Response(proc.stderr).text(), proc.exited,
    ]);
    invariant(Buffer.byteLength(stdout) < 2_097_152, "CLI output exceeds demo bound");
    return { code, stdout, stderr };
  } finally {
    clearTimeout(timer);
  }
}
async function cli(runtime: string[], store: string, args: string[]): Promise<JsonObject> {
  const result = await invoke(runtime, store, args);
  invariant(result.code === 0, `${args.join(" ")}: ${result.stderr || result.stdout}`);
  return asObject(JSON.parse(result.stdout) as unknown, "CLI result");
}
async function put(name: string, value: JsonValue): Promise<string> {
  const path = join(temporary, name);
  await writeFile(path, canonicalize(value));
  return path;
}
function asString(value: unknown, label: string): string { return boundedString(value, label, 4096); }
function snapshot(value: JsonObject) {
  return { digest: asString(value.digest, "snapshot.digest"), process: asObject(value.process, "snapshot.process") };
}
async function callCount(path: string): Promise<number> {
  try { return (await readFile(path, "utf8")).split("\n").filter(Boolean).length; }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return 0;
    throw error;
  }
}
async function receipt(store: string, state: ReturnType<typeof snapshot>): Promise<JsonObject> {
  const digest = asString(state.process.receipt, "process.receipt");
  invariant(/^sha256:[a-f0-9]{64}$/.test(digest), "malformed receipt reference");
  return asObject(JSON.parse(await readFile(join(store, "runs", `${digest.slice(7)}.json`), "utf8")) as unknown, "receipt");
}
async function drain(runtime: string[], store: string, receive: string): Promise<JsonObject[]> {
  const messages: JsonObject[] = [];
  for (let i = 0; i < 8; i++) {
    const result = await invoke(runtime, store, ["mailbox", "receive", receive]);
    if (result.code !== 0) {
      invariant((result.stderr + result.stdout).includes("EFFECT_SUSPENDED"), "mailbox drain failed unexpectedly");
      return messages;
    }
    messages.push(asObject(JSON.parse(result.stdout) as unknown, "delivery"));
  }
  throw new Error("mailbox exceeds the demo message bound");
}
const evidence = asObject(JSON.parse(await readFile(join(fixtures, "evidence.json"), "utf8")) as unknown, "evidence");
async function actor(runtime: string[], store: string, name: string) {
  const mailboxes: Record<string, JsonObject> = {};
  for (const kind of ["proposals", "approvals", "publications"]) {
    mailboxes[kind] = await cli(runtime, store, ["mailbox", "create", `${name}-${kind}`, "--max-messages", "8", "--max-message-bytes", "4096"]);
  }
  const proposals = mailboxes.proposals!;
  const approvals = mailboxes.approvals!;
  const publications = mailboxes.publications!;
  const args = await put(`${name}-${store.endsWith("baseline") ? "baseline" : "process"}.args.json`, {
    input: { evidence, proposals: proposals.send!, approvals: approvals.receive!, publications: publications.send! },
  });
  return { name, args, proposals, approvals, publications };
}
type Actor = Awaited<ReturnType<typeof actor>>;
async function wake(runtime: string[], store: string, subject: Actor, decision: "approve" | "deny") {
  const message = { release: evidence.release!, decision, action: "publish_release_report" };
  const file = await put(`${subject.name}-${decision}.json`, message);
  const key = digestCanonical({ contract: "algal.vm-demo-wake.v1", actor: subject.name, decision });
  const args = ["mailbox", "send", asString(subject.approvals.send, "send capability"), file, "--idempotency-key", key];
  const first = await cli(runtime, store, args);
  const duplicate = await cli(runtime, store, args);
  invariant(first.id === duplicate.id, "duplicate wake produced another delivery");
  return first.id!;
}
function executor(log: string): string[] {
  return ["--executor-cmd", [process.execPath, join(fixtures, "decision-adapter.ts"), log].map(shellWord).join(" ")];
}

try {
  const store = join(temporary, "process");
  const log = join(temporary, "process-calls.jsonl");
  const alpha = await actor(reference, store, "alpha");
  const beta = await actor(alternate, store, "beta");
  const initial: Record<string, ReturnType<typeof snapshot>> = {};
  for (const [subject, runtime] of [[alpha, reference], [beta, alternate]] as const) {
    const created = snapshot(await cli(runtime, store, ["process", "create", subject.name, manifest, "--args", subject.args, "--modules", fixtures, "--max-generations", "4"]));
    invariant(created.process.status === "ready" && created.process.generation === 0, "actor did not start ready");
    const suspended = snapshot(await cli(runtime, store, ["process", "tick", subject.name, ...executor(log)]));
    invariant(suspended.process.status === "suspended" && suspended.process.generation === 1, "initial tick did not suspend");
    initial[subject.name] = suspended;
    invariant((await drain(runtime, store, asString(subject.publications.receive, "publications"))).length === 0, "publication happened before approval");
  }
  invariant(await callCount(log) === 2, "each actor must make exactly one initial decision");
  const beforeIdle = await callCount(log);
  const idle = await cli(alternate, store, ["process", "schedule", "--max-ticks", "8", ...executor(log)]);
  const idleCalls = await callCount(log) - beforeIdle;
  invariant(idle.ticks === 0 && idleCalls === 0, "idle scheduler performed work");
  const idleAlpha = snapshot(await cli(alternate, store, ["process", "inspect", "alpha"]));
  invariant(idleAlpha.digest === initial.alpha!.digest, "idle poll changed the checkpoint");
  await wake(reference, store, alpha, "approve");
  const alphaRun = await cli(alternate, store, ["process", "schedule", "--max-ticks", "8", ...executor(log)]);
  invariant(alphaRun.ticks === 1, "one wake must schedule one process");
  const betaStillWaiting = snapshot(await cli(reference, store, ["process", "inspect", "beta"]));
  invariant(betaStillWaiting.digest === initial.beta!.digest, "alpha's wake advanced beta");
  await wake(alternate, store, beta, "deny");
  const betaRun = await cli(reference, store, ["process", "schedule", "--max-ticks", "8", ...executor(log)]);
  invariant(betaRun.ticks === 1, "beta wake must schedule exactly one process");
  const decisionsAfterResume = await callCount(log);
  invariant(decisionsAfterResume === 2, "resume repeated a recorded decision");
  const terminalIdle = await cli(alternate, store, ["process", "schedule", "--max-ticks", "8", ...executor(log)]);
  invariant(terminalIdle.ticks === 0, "completed process was rescheduled");

  const actors: JsonObject[] = [];
  let verifiedReceipts = 0;
  for (const subject of [alpha, beta]) {
    const final = snapshot(await cli(alternate, store, ["process", "inspect", subject.name]));
    invariant(final.process.status === "complete" && final.process.generation === 2, "actor did not complete on generation two");
    const oldReceipt = await receipt(store, initial[subject.name]!);
    const newReceipt = await receipt(store, final);
    const oldCells = asObject(oldReceipt.cells, "old cells");
    const newCells = asObject(newReceipt.cells, "new cells");
    for (const cell of ["recommend", "propose"]) {
      invariant(canonicalize(oldCells[cell]!) === canonicalize(newCells[cell]!), `${cell} changed during replay`);
    }
    const proposals = await drain(alternate, store, asString(subject.proposals.receive, "proposals"));
    const publications = await drain(alternate, store, asString(subject.publications.receive, "publications"));
    const extraApprovals = await drain(alternate, store, asString(subject.approvals.receive, "approvals"));
    invariant(proposals.length === 1, "recorded write was repeated");
    invariant(publications.length === (subject.name === "alpha" ? 1 : 0), "approval policy was not enforced");
    invariant(extraApprovals.length === 0, "duplicate wake left another approval queued");
    const beforeVerify = await callCount(log);
    const verified = await cli(reference, store, ["process", "verify", subject.name]);
    invariant(verified.ok === true && verified.receipts === 2, "offline verification missed a receipt generation");
    verifiedReceipts += Number(verified.receipts);
    if (native) {
      const nativeVerified = await cli(alternate, store, ["process", "verify", subject.name]);
      invariant(nativeVerified.ok === true && nativeVerified.receipts === 2, "native offline verification failed");
    }
    invariant(await callCount(log) === beforeVerify, "verification invoked the command adapter");
    actors.push({ name: subject.name, status: final.process.status, generations: final.process.generation,
      proposals: proposals.length, publications: publications.length, receipt: final.process.receipt!,
      head: final.digest, verifiedReceipts: verified.receipts!, publication: publications[0]?.message ?? null });
  }

  // The exact same args include the same send and receive capabilities.
  // Process identity must scope writes; one queued message still has one consumer.
  const twinsStore = join(temporary, "twins");
  const twinsLog = join(temporary, "twins-calls.jsonl");
  const shared = await actor(reference, twinsStore, "shared");
  for (const [name, runtime] of [["twin-a", reference], ["twin-b", alternate]] as const) {
    await cli(runtime, twinsStore, ["process", "create", name, manifest, "--args", shared.args, "--modules", fixtures, "--max-generations", "4"]);
    const first = snapshot(await cli(runtime, twinsStore, ["process", "tick", name, ...executor(twinsLog)]));
    invariant(first.process.status === "suspended", "identical-args actor did not suspend");
  }
  const twinProposals = await drain(reference, twinsStore, asString(shared.proposals.receive, "shared proposals"));
  invariant(twinProposals.length === 2 && twinProposals[0]!.id !== twinProposals[1]!.id, "identical args collapsed two actors into one write");
  await wake(reference, twinsStore, shared, "approve");
  const twinsScheduled = await cli(alternate, twinsStore, ["process", "schedule", "--max-ticks", "8", ...executor(twinsLog)]);
  invariant(twinsScheduled.ticks === 1, "one shared message must wake exactly one actor");
  const twinA = snapshot(await cli(reference, twinsStore, ["process", "inspect", "twin-a"]));
  const twinB = snapshot(await cli(reference, twinsStore, ["process", "inspect", "twin-b"]));
  invariant(twinA.process.status === "complete" && twinB.process.status === "suspended", "shared mailbox scheduling lost actor independence");
  invariant(await callCount(twinsLog) === 2, "twin resume repeated a decision");
  for (const name of ["twin-a", "twin-b"]) {
    const verified = await cli(reference, twinsStore, ["process", "verify", name]);
    invariant(verified.ok === true, "identical-args process receipt failed offline verification");
  }
  const sameArgsIndependence: JsonObject = { actors: 2, identicalArgs: true, crossRuntime: Boolean(native), distinctProposalDeliveries: twinProposals.length,
    sharedWakeSchedulerTicks: twinsScheduled.ticks!, completed: 1, suspended: 1, decisionInvocations: await callCount(twinsLog) };

  // Measured baseline: discard the execution checkpoint and re-run the same
  // manifest from entry after waking. Mailbox drivers remain idempotent.
  const baselineStore = join(temporary, "baseline");
  const baselineLog = join(temporary, "baseline-calls.jsonl");
  for (const name of ["alpha", "beta"]) {
    const subject = await actor(reference, baselineStore, name);
    const args = ["run", manifest, "--modules", fixtures, "--args", subject.args, ...executor(baselineLog)];
    const first = await invoke(reference, baselineStore, args);
    const firstReceipt = asObject(JSON.parse(first.stdout) as unknown, "baseline initial receipt");
    invariant(firstReceipt.outcome === "suspended", "baseline did not reach the same wait");
    await wake(reference, baselineStore, subject, name === "alpha" ? "approve" : "deny");
    const finalReceipt = await cli(reference, baselineStore, args);
    invariant(finalReceipt.outcome === "complete", "baseline did not complete");
    const proposals = await drain(reference, baselineStore, asString(subject.proposals.receive, "baseline proposals"));
    const publications = await drain(reference, baselineStore, asString(subject.publications.receive, "baseline publications"));
    invariant(proposals.length === 1 && publications.length === (name === "alpha" ? 1 : 0), "baseline outputs differ");
  }
  const baselineCalls = await callCount(baselineLog);
  invariant(baselineCalls === 4, "baseline must measure two fresh decisions per actor");
  const report: JsonObject = {
    contract: "algal.vm-demo.v1", ok: true,
    fixture: "scripted local command adapter; no paid model calls, token or dollar claims",
    scenario: "Release report proposal, process exit, external approval, selective resume, publication",
    runtimes: native ? ["typescript", "rust"] : ["typescript"],
    crossRuntimeHandoffs: native ? 3 : 0,
    process: { actors: 2, decisionInvocations: decisionsAfterResume, resumedDecisionInvocations: 0,
      idleSchedulerTicks: idle.ticks!, idleDecisionInvocations: idleCalls,
      duplicateWakeDeliveriesSuppressed: 2, offlineVerifiedReceipts: verifiedReceipts, verificationDecisionInvocations: 0 },
    baseline: { description: "Same manifest and evidence, checkpoint discarded before restart; idempotent mailbox driver retained", decisionInvocations: baselineCalls },
    avoidedDecisionInvocations: baselineCalls - decisionsAfterResume,
    avoidedDecisionFraction: (baselineCalls - decisionsAfterResume) / baselineCalls,
    actors, sameArgsIndependence, cliInvocations,
    artifacts: keep ? temporary : null,
    limitations: ["Fixture demonstrates execution behavior, not live model judgment or paid cost savings.",
      "Actors share the manifest and evidence but have separate host-admitted mailbox capabilities.",
      "Host filesystem and command adapters are trusted; this is not OS isolation.",
      "Uncertain effects require reconciliation; arbitrary external effects are not exactly once."],
  };
  const json = JSON.stringify(report, null, 2) + "\n";
  if (output) await writeFile(output, json);
  process.stdout.write(json);
} finally {
  if (!keep) await rm(temporary, { recursive: true, force: true });
}
