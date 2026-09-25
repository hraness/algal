import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { open, realpath } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { CHILD_ENV, childEnv, type SupervisorCompletion, type SupervisorDrain } from "./command-supervisor";
import { parseRegistry, parseToolchains, validateClaims } from "./claims";
import { hashFile, hashJson, inputBindings, readJson, type FileBinding } from "./files";
import { array, digest, gitHash, natural, record, requireThat, string } from "./schema";
import { READY_SUITES, SUITES } from "./suites";

export { CHILD_ENV } from "./command-supervisor";
/** cleanupObserved witnesses supervisor SIGKILL termination and its relayed
 * output EOF after the owned-group stop request, not independent reaping of every
 * descendant. Successful completion additionally requires the trusted helper's
 * actual target EOFs, completed forwarding writes, and matching byte counts.
 * This requires cooperating same-group processes and OS progress;
 * detached/uninterruptible descendants that close outputs are not qualified. */
export type CommandResult = { command: string[]; exitCode: number | null; signal: string | null; timedOut: boolean; outputExceeded: boolean; cleanupObserved: boolean; stdout: string; stderr: string };

/** Failed custody is never an admitted result. Preserve bounded raw diagnostics
 * separately so a tool adapter can retain the failure without inventing UTF-8
 * or discarding the output that explains it. */
export class CommandFailure extends Error {
  constructor(message: string, readonly rawStdout: Uint8Array, readonly rawStderr: Uint8Array,
    readonly observation: { command: string[]; completion: SupervisorCompletion | undefined; drained: SupervisorDrain | undefined; receivedBytes: { stdout: number; stderr: number }; supervisorExit: { exitCode: number | null; signal: string | null } | undefined; timedOut: boolean; outputExceeded: boolean; stdoutEnded: boolean; stderrEnded: boolean }) {
    super(message);
    this.name = "CommandFailure";
  }
}

/** Static callers choose argv. Registry text is never executed as a shell command. */
export async function runCommand(command: string[], cwd: string, options: { timeoutMs?: number; maxOutputBytes?: number } = {}): Promise<CommandResult> {
  const timeoutMs = options.timeoutMs ?? 90_000;
  const maxOutputBytes = options.maxOutputBytes ?? 2_097_152;
  requireThat(command.length > 0 && command.length <= 64 && command.every(argument => typeof argument === "string" && argument.length <= 4096), "invalid command argv");
  // The native64 real-I/O stateful suite takes several minutes, including
  // shrinking controls. Callers still choose a finite explicit deadline; small
  // proof/model commands retain their own stricter limits.
  requireThat(Number.isSafeInteger(timeoutMs) && timeoutMs > 0 && timeoutMs <= 600_000, "invalid command deadline");
  requireThat(Number.isSafeInteger(maxOutputBytes) && maxOutputBytes > 0 && maxOutputBytes <= 8_388_608, "invalid output limit");
  requireThat(process.platform !== "win32", "bounded verification command custody requires a POSIX process group");
  return new Promise((resolve, reject) => {
    const supervisor = fileURLToPath(new URL("./command-supervisor.ts", import.meta.url));
    const child = spawn(process.execPath, [supervisor, JSON.stringify(command)], { cwd, env: childEnv(), stdio: ["ignore", "pipe", "pipe", "ipc"], detached: true });
    const capturedOut = child.stdout!, capturedErr = child.stderr!;
    const stdout: Buffer[] = [], stderr: Buffer[] = [];
    let bytes = 0, timedOut = false, outputExceeded = false, stopping = false;
    let stdoutEnded = false, stderrEnded = false;
    let completion: SupervisorCompletion | undefined;
    let drained: SupervisorDrain | undefined;
    const receivedBytes = { stdout: 0, stderr: 0 };
    let failure: Error | undefined;
    let cleanupTimer: ReturnType<typeof setTimeout> | undefined;
    let supervisorExit: { exitCode: number | null; signal: string | null } | undefined;
    let settled = false;
    const rejectCaptured = (message: string) => {
      if (settled) return;
      settled = true;
      reject(new CommandFailure(message, Buffer.concat(stdout), Buffer.concat(stderr),
        { command, completion, drained, receivedBytes: { ...receivedBytes }, supervisorExit, timedOut, outputExceeded, stdoutEnded, stderrEnded }));
    };
    const stop = () => {
      if (stopping) return;
      stopping = true;
      // A private channel addresses the live anchor without a PID-reuse race.
      if (child.connected) child.send("stop", error => { if (error) failure ??= error; });
      else failure ??= new Error("command supervisor control channel disconnected before cleanup");
      cleanupTimer = setTimeout(() => {
        // Do not call local pipe destruction a cleanup witness. Fail boundedly
        // if cooperative group closure cannot be observed, including escaped
        // descendants retaining pipe writers. Disconnect requests self-cleanup.
        if (child.connected) child.disconnect();
        clearTimeout(timer);
        capturedOut.destroy();
        capturedErr.destroy();
        child.unref();
        rejectCaptured("command cleanup was not observed within the 2000ms cleanup bound");
      }, 2_000);
    };
    const maybeSettle = () => {
      // Child exit and each parent-side EOF are independent required witnesses.
      if (settled || supervisorExit === undefined || !stdoutEnded || !stderrEnded) return;
      clearTimeout(timer);
      clearTimeout(cleanupTimer);
      const { exitCode, signal } = supervisorExit;
      const cleanupObserved = stopping && exitCode === null && signal === "SIGKILL";
      if (failure !== undefined) { rejectCaptured(failure.message); return; }
      if (!cleanupObserved || !timedOut && !outputExceeded && (completion === undefined || drained === undefined)) {
        rejectCaptured(`command supervisor cleanup/completion was not observed: ${JSON.stringify({ stopping, stdoutEnded, stderrEnded, exitCode, signal, timedOut, outputExceeded, completion, drained })}`); return;
      }
      if (!timedOut && !outputExceeded && (drained?.stdoutBytes !== receivedBytes.stdout || drained?.stderrBytes !== receivedBytes.stderr)) {
        rejectCaptured("command supervisor relay byte counts differ from captured output"); return;
      }
      try {
        const decoder = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });
        const result = { command, exitCode: completion?.exitCode ?? null, signal: completion?.signal ?? null, timedOut, outputExceeded, cleanupObserved, stdout: decoder.decode(Buffer.concat(stdout)), stderr: decoder.decode(Buffer.concat(stderr)) };
        settled = true;
        resolve(result);
      } catch { rejectCaptured("command output contains invalid UTF-8"); }
    };
    const maybeComplete = () => {
      // The anchor retains its own standard writers until stop. Its drained
      // message witnesses target EOF and completed forwarding, not parent EOF.
      if (completion !== undefined && drained !== undefined) stop();
      maybeSettle();
    };
    const timer = setTimeout(() => { timedOut = true; stop(); }, timeoutMs);
    const receive = (chunks: Buffer[], stream: "stdout" | "stderr") => (chunk: Buffer) => {
      const available = Math.max(0, maxOutputBytes - bytes);
      bytes += chunk.byteLength;
      receivedBytes[stream] += chunk.byteLength;
      if (available > 0) chunks.push(chunk.subarray(0, available));
      if (bytes > maxOutputBytes) { outputExceeded = true; stop(); return; }
    };
    capturedOut.on("data", receive(stdout, "stdout"));
    capturedErr.on("data", receive(stderr, "stderr"));
    capturedOut.on("end", () => { stdoutEnded = true; maybeComplete(); });
    capturedErr.on("end", () => { stderrEnded = true; maybeComplete(); });
    for (const stream of [capturedOut, capturedErr]) stream.on("error", error => { failure ??= error; stop(); });
    child.on("message", (value: unknown) => {
      try {
        const kind = value && typeof value === "object" && "kind" in value ? value.kind : undefined;
        if (kind === "failed") {
          const message = record(value, ["kind", "error"], "supervisor failure");
          failure = new Error(string(message.error, "supervisor error", 4096)); stop(); return;
        }
        if (kind === "drained") {
          requireThat(completion !== undefined && drained === undefined, "out-of-order or duplicate supervisor drain");
          const message = record(value, ["kind", "stdoutBytes", "stderrBytes"], "supervisor drain");
          drained = { kind: "drained", stdoutBytes: natural(message.stdoutBytes, "supervisor stdout bytes"), stderrBytes: natural(message.stderrBytes, "supervisor stderr bytes") };
          requireThat(Number.isSafeInteger(drained.stdoutBytes + drained.stderrBytes), "supervisor combined byte count overflow");
          maybeComplete(); return;
        }
        requireThat(completion === undefined, "duplicate command supervisor completion");
        const message = record(value, ["kind", "exitCode", "signal", "error"], "supervisor completion");
        requireThat(message.kind === "completed", "unknown command supervisor message");
        requireThat(message.exitCode === null || typeof message.exitCode === "number" && Number.isSafeInteger(message.exitCode), "invalid target exit code");
        requireThat(message.signal === null || typeof message.signal === "string", "invalid target signal");
        requireThat(message.error === null || typeof message.error === "string" && message.error.length <= 4096, "invalid target error");
        completion = message as SupervisorCompletion;
        if (completion.error !== null) { failure = new Error(completion.error); stop(); }
        maybeComplete();
      } catch (error) { failure = error instanceof Error ? error : new Error(String(error)); stop(); }
    });
    child.on("error", error => { failure = error; stop(); });
    child.on("exit", () => {
      if (!stopping) { failure ??= new Error("command supervisor exited unexpectedly"); stop(); }
    });
    child.on("close", (exitCode, signal) => {
      supervisorExit = { exitCode, signal };
      maybeSettle();
    });
  });
}

export function requireSuccess(result: CommandResult): void {
  requireThat(result.exitCode === 0 && result.signal === null && result.cleanupObserved && !result.timedOut && !result.outputExceeded, `command failed: exit=${result.exitCode}, signal=${result.signal}, timeout=${result.timedOut}, outputExceeded=${result.outputExceeded}, cleanupObserved=${result.cleanupObserved}; diagnostic tails=${JSON.stringify({ stdout: result.stdout.slice(-8192), stderr: result.stderr.slice(-8192) })}`);
}

export type RunBinding = {
  commit: string; tree: string; inputs: FileBinding[]; inputDigest: string;
  runtime: { path: string; sha256: string; version: string; platform: string; arch: string };
  environment: typeof CHILD_ENV;
};

/** Hash the exact runtime file rather than trusting an executable's version label. */
async function runtimeIdentity(): Promise<RunBinding["runtime"]> {
  const path = await realpath(process.execPath);
  const file = await open(path, "r");
  try {
    const info = await file.stat();
    requireThat(info.isFile() && info.size > 0 && info.size <= 536_870_912, "runtime artifact size/type bound");
    const hash = createHash("sha256");
    let total = 0;
    for (;;) {
      const chunk = Buffer.alloc(65_536);
      const { bytesRead } = await file.read(chunk);
      if (bytesRead === 0) break;
      total += bytesRead;
      requireThat(total <= 536_870_912, "runtime grew past byte bound");
      hash.update(chunk.subarray(0, bytesRead));
    }
    return { path, sha256: `sha256:${hash.digest("hex")}`, version: Bun.version, platform: process.platform, arch: process.arch };
  } finally { await file.close(); }
}

export async function captureBinding(root: string): Promise<RunBinding> {
  const git = Bun.which("git");
  requireThat(git !== null, "git executable is unavailable");
  const revision = await runCommand([git, "rev-parse", "HEAD", "HEAD^{tree}"], root, { timeoutMs: 10_000, maxOutputBytes: 4096 });
  requireSuccess(revision);
  const lines = revision.stdout.trim().split("\n");
  requireThat(lines.length === 2, "unparseable Git identity");
  const inputs = await inputBindings(root);
  // Include per-property references outside the conservative source roots too.
  const registry = parseRegistry(await readJson(root, "verify/properties.json"));
  const extra = registry.properties.flatMap(property => [...property.sources, ...property.specs]);
  for (const { path } of extra) if (!inputs.some(input => input.path === path)) inputs.push({ path, sha256: await hashFile(root, path) });
  inputs.sort((a, b) => a.path < b.path ? -1 : a.path === b.path ? 0 : 1);
  const runtime = await runtimeIdentity();
  const bun = parseToolchains(await readJson(root, "verify/toolchains.json")).tools.find(tool => tool.id === "bun");
  requireThat(bun?.status === "available" && bun.version === runtime.version && (bun.sha256 === null || bun.sha256 === runtime.sha256), "executed Bun artifact/version does not match toolchain admission");
  return { commit: gitHash(lines[0], "executed commit"), tree: gitHash(lines[1], "executed tree"), inputs, inputDigest: hashJson(inputs), runtime, environment: CHILD_ENV };
}

export function requireSameBinding(before: RunBinding, after: RunBinding): void {
  requireThat(hashJson(before) === hashJson(after), "verification inputs, runtime or Git identity changed during execution");
}

export type InfrastructureResult = {
  contract: "algal.verification-result.v1"; suite: string; status: "passed";
  evidenceClass: "infrastructure-only"; formalClaims: 0;
  binding: RunBinding; details: unknown;
};

/** This envelope licenses infrastructure success only, never a production proof. */
export function admitInfrastructureResult(value: unknown, suite: string, current: RunBinding): void {
  const item = record(value, ["contract", "suite", "status", "evidenceClass", "formalClaims", "binding", "details"], "verification result");
  requireThat(item.contract === "algal.verification-result.v1" && item.suite === suite && (SUITES.get(suite) === "ready" || suite === "all-required"), "unknown or mismatched result suite");
  requireThat(item.status === "passed" && item.evidenceClass === "infrastructure-only" && item.formalClaims === 0, "result does not establish infrastructure-only success");
  const binding = record(item.binding, ["commit", "tree", "inputs", "inputDigest", "runtime", "environment"], "result binding");
  gitHash(binding.commit, "bound commit"); gitHash(binding.tree, "bound tree");
  digest(binding.inputDigest, "bound inputs digest");
  const inputs = array(binding.inputs, "bound inputs", 1, 20_000).map(value => {
    const input = record(value, ["path", "sha256"], "bound input");
    return { path: string(input.path, "bound path", 1024), sha256: digest(input.sha256, "bound file digest") };
  });
  requireThat(hashJson(inputs) === binding.inputDigest && hashJson(binding) === hashJson(current), "stale or altered verification result binding");
}

export function admitSelftestOutput(result: CommandResult): number {
  requireSuccess(result);
  const text = result.stdout + "\n" + result.stderr;
  const pass = [...text.matchAll(/^\s*(\d+) pass\s*$/gm)];
  const fail = [...text.matchAll(/^\s*(\d+) fail\s*$/gm)];
  requireThat(pass.length === 1 && fail.length === 1 && Number(pass[0]![1]) > 0 && Number(fail[0]![1]) === 0, "missing or unparseable successful Bun selftest summary");
  requireThat(!/^\s*[1-9]\d* (?:skip(?:ped)?|todo)\b/im.test(text) && !/^\s*\((?:skip(?:ped)?|todo)\)/im.test(text), "required selftests were skipped or left todo");
  const count = Number(pass[0]![1]);
  natural(count, "selftest count");
  const ran = [...text.matchAll(/^Ran (\d+) tests? across \d+ files?\./gm)];
  requireThat(ran.length === 1 && Number(ran[0]![1]) === count, "inconsistent or missing Bun executed-test count");
  return count;
}

async function executeSuite(root: string, suite: string): Promise<unknown> {
  if (suite === "claims") return validateClaims(root);
  if (suite === "corpus") {
    const { runCorpus, nativeProfile } = await import("../corpus/adapter");
    return runCorpus(root, nativeProfile(process.env.ALGAL_CORPUS_NATIVE_BIN));
  }
  if (suite === "spawn-conformance") {
    const { runSpawnConformance } = await import("../reference/spawn/run");
    return runSpawnConformance(root);
  }
  if (suite === "application-history-slice") {
    const { runApplicationHistorySlice } = await import("../reference/application/adapter");
    return runApplicationHistorySlice(root, process.env.ALGAL_APPLICATION_HISTORY_BIN);
  }
  if (suite === "scheduler-model" || suite === "scheduler-conformance") {
    const { runSchedulerModel, runSchedulerConformance } = await import("../reference/scheduler/run");
    return suite === "scheduler-model" ? runSchedulerModel(root) : runSchedulerConformance(root);
  }
  if (suite === "lean-core") {
    const { runLeanCore, recheckLeanCoreEvidence } = await import("../lean/run");
    const binary = process.env.ALGAL_LEAN_NATIVE_BIN;
    requireThat(binary !== undefined, "lean-core requires explicit ALGAL_LEAN_NATIVE_BIN");
    const evidence = await runLeanCore(root, binary);
    return { admitted: await recheckLeanCoreEvidence(root, evidence), evidence };
  }
  if (suite === "traces" || suite === "stateful" || suite === "fault-harness") {
    const binary = process.env.ALGAL_TRACE_TEST_BIN;
    requireThat(binary !== undefined, `${suite} requires explicit ALGAL_TRACE_TEST_BIN`);
    if (suite === "traces") {
      const { runTraces } = await import("../traces/run");
      return runTraces(root, binary);
    }
    const { runNativeVerification } = await import("../stateful/run");
    return runNativeVerification(root, suite, binary);
  }
  if (suite === "artifact") {
    const { runArtifact } = await import("../artifact/run");
    return runArtifact(root);
  }
  if (suite === "process-conformance" || suite === "mailbox-conformance" || suite === "lease-conformance" || suite === "stateful-app") {
    const { runProtocolConformance } = await import("../protocols/run");
    const protocol = suite === "process-conformance" ? "process" : suite === "mailbox-conformance" ? "mailbox" : suite === "stateful-app" ? "application" : "lease";
    const variable = suite === "stateful-app" ? "ALGAL_APPLICATION_TEST_BIN" : "ALGAL_TRACE_TEST_BIN";
    const binary = process.env[variable];
    requireThat(binary !== undefined, `${suite} requires explicit ${variable}`);
    return runProtocolConformance(root, protocol, binary);
  }
  if (suite === "process-model" || suite === "mailbox-model" || suite === "lease-model" || suite === "application-model" || suite === "outbox-model" || suite === "quota-model" || suite === "authority-model") {
    const { runTlcSuite, recheckTlcSuiteEvidence } = await import("./tlc");
    const protocol = suite === "process-model" ? "process" : suite === "mailbox-model" ? "mailbox" : suite === "lease-model" ? "lease" : suite === "application-model" ? "application" : suite === "outbox-model" ? "outbox" : suite === "quota-model" ? "quota" : "authority";
    const evidence = await runTlcSuite(root, protocol);
    return { model: await recheckTlcSuiteEvidence(root, evidence, protocol), evidence };
  }
  if (suite === "custody" || suite === "publication") {
    const { runTlcSuite, recheckTlcSuiteEvidence } = await import("./tlc");
    const evidence = await runTlcSuite(root, suite);
    const model = await recheckTlcSuiteEvidence(root, evidence, suite);
    if (suite === "custody") {
      const { runCustodyRuntime } = await import("../custody/runtime");
      return { model, evidence, runtime: await runCustodyRuntime(root) };
    }
    const command = [process.execPath, "test", "--timeout", "20000", "src/durable-fs.test.ts", "src/store.test.ts", "src/host-state.test.ts", "src/mailbox.test.ts"];
    const result = await runCommand(command, root);
    return { model, evidence, tests: admitSelftestOutput(result), commandResult: result,
      scope: "Bounded abstract publication checks plus sampled Bun syscall/crash-image conformance. Pinned native helper, cache, file-admission and mailbox-admission tests remain separately required; no filesystem refinement or physical power-loss claim." };
  }
  if (suite === "runner-selftest") {
    const command = [process.execPath, "test", "--timeout", "20000", "verify/tests", "verify/tla/tlc.test.ts"];
    const result = await runCommand(command, root);
    const historyGroups = [
      { name: "bounds-and-callbacks", expectedTests: 12, command: [process.execPath, "test", "--timeout", "20000", "verify/reference/application/schema.test.ts", "verify/reference/application/archive.test.ts", "verify/reference/application/bounded.test.ts", "verify/reference/application/fixture-custody.test.ts"] },
      { name: "argv-and-authority", expectedTests: 6, command: [process.execPath, "test", "--timeout", "20000", "verify/reference/application/readmit.test.ts", "--test-name-pattern", "^(?:raw command admission |both selected and recorded argv |current-source admission |authority paths reject )"] },
      { name: "archive-envelopes", expectedTests: 14, command: [process.execPath, "test", "--timeout", "20000", "verify/reference/application/readmit.test.ts", "--test-name-pattern", "^full synthetic archive rejects (?:unknown\\ summary\\ field|summary\\ outcome\\ count|summary\\ byte\\ accounting|definition\\ identity|source\\ inventory\\ mutation\\ with\\ rehashed\\ raw\\ record|forged\\ inert\\ argv|unobserved\\ cleanup|signal\\ status|stdout\\ framing|extra\\ stdout\\ envelope\\ field|generated\\ profile/header\\ mismatch|retained\\ history\\ input\\ differs\\ from\\ generated\\ packet|Bun\\ packet\\ authorized\\ history\\ differs|recomputed\\ positive\\ witness\\ omitted) after admitted baseline$"] },
      { name: "archive-semantics", expectedTests: 14, command: [process.execPath, "test", "--timeout", "20000", "verify/reference/application/readmit.test.ts", "--test-name-pattern", "^full synthetic archive rejects (?:native\\ output\\ runtime\\ identity|native\\ uncertain\\ acknowledgment\\ cleared|durable\\ started\\ callback\\ evidence\\ removed|callback\\ effect\\ bytes\\ forged|owned\\ physical\\ effect\\ inventory\\ changed|native\\ input\\ header\\ identity|closed\\ raw\\ trace\\ fields|changed\\ shrink\\ property|changed\\ ordered\\ shrink\\ input|real\\ baseline\\ mismatch\\ cannot\\ masquerade\\ as\\ intended\\ projection\\ mutant|unknown\\ raw\\ archive\\ entry|missing\\ raw\\ archive\\ entry|raw\\ symlink\\ cannot\\ stand\\ in\\ for\\ evidence|duplicate\\-key\\ canonical\\ metadata) after admitted baseline$"] },
    ];
    const historySelftests = [];
    for (const group of historyGroups) {
      const commandResult = await runCommand(group.command, root);
      const tests = admitSelftestOutput(commandResult);
      requireThat(tests === group.expectedTests, `application history selftest group ${group.name} incomplete`);
      historySelftests.push({ name: group.name, tests, commandResult });
    }
    const componentSelftests = [];
    for (const directory of ["verify/corpus", "verify/reference/spawn", "verify/lib"]) {
      const commandResult = await runCommand([process.execPath, "test", "--timeout", "20000", directory], root);
      componentSelftests.push({ directory, tests: admitSelftestOutput(commandResult), commandResult });
    }
    return { tests: admitSelftestOutput(result) + [...historySelftests, ...componentSelftests].reduce((count, item) => count + item.tests, 0), commandResult: result, historySelftests, componentSelftests, syntheticProofFixtures: true };
  }
  if (suite === "boundary") {
    const command = [process.execPath, "test", "--timeout", "20000", "src/graph-admission.test.ts", "src/registry.test.ts", "src/effects-own-keys.test.ts", "src/decisions.test.ts", "src/foundry.test.ts", "src/bench.test.ts", "src/application-adaptation.test.ts", "src/store.test.ts", "src/host-state.test.ts", "src/values.test.ts", "src/expr.test.ts"];
    const result = await runCommand(command, root);
    const tests = admitSelftestOutput(result);
    // The outer supervisor also bounds synchronous WASM compilation/evaluation.
    const targetResult = await runCommand([process.execPath, "verify/boundary/run.ts"], root);
    requireSuccess(targetResult);
    const { admitBoundarySummary } = await import("../boundary/run");
    const targets: unknown = JSON.parse(targetResult.stdout);
    admitBoundarySummary(targets);
    return { tests, commandResult: result, targets, targetCommandResult: targetResult,
      scope: "Focused production regression tests and sampled target agreement; no exhaustive property or implementation proof. Native graph/store/adaptation tests remain required Cargo gates." };
  }
  throw new Error(`${suite}: no execution adapter (Not started)`);
}

export async function runSuite(root: string, suite: string): Promise<InfrastructureResult> {
  requireThat(suite === "all-required" || SUITES.has(suite), `unknown verification suite ${suite}`);
  requireThat(suite === "all-required" || SUITES.get(suite) === "ready", `${suite}: Not started; no passing result is available`);
  const before = await captureBinding(root);
  let details: unknown;
  if (suite === "all-required") {
    // Parse/claims admission rejects any required claim without its real adapter.
    const claims = await executeSuite(root, "claims");
    const registry = parseRegistry(await readJson(root, "verify/properties.json"));
    const suites = new Set<string>([...READY_SUITES.filter(name => name !== "claims"), ...registry.properties.filter(property => property.evidence.required).map(property => property.evidence.suite!)]);
    const results: Record<string, unknown> = { claims };
    for (const name of suites) results[name] = await executeSuite(root, name);
    details = { results, releaseClaimCount: registry.properties.filter(property => property.evidence.required).length, pendingProperties: registry.properties.filter(property => property.evidence.status === "not-started").length };
  } else details = await executeSuite(root, suite);
  requireSameBinding(before, await captureBinding(root));
  return { contract: "algal.verification-result.v1", suite, status: "passed", evidenceClass: "infrastructure-only", formalClaims: 0, binding: before, details };
}
