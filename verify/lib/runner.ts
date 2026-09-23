import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { open, realpath } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import type { Readable } from "node:stream";
import { CHILD_ENV, type SupervisorCompletion } from "./command-supervisor";
import { parseRegistry, parseToolchains, validateClaims } from "./claims";
import { hashFile, hashJson, inputBindings, readJson, type FileBinding } from "./files";
import { array, digest, gitHash, natural, record, requireThat, string } from "./schema";
import { READY_SUITES, SUITES } from "./suites";

export { CHILD_ENV } from "./command-supervisor";
/** cleanupObserved witnesses supervisor SIGKILL termination and captured-output
 * EOF after the owned-group stop request, not independent reaping of every
 * descendant. This requires cooperating same-group processes and OS progress;
 * detached/uninterruptible descendants that close outputs are not qualified. */
export type CommandResult = { command: string[]; exitCode: number | null; signal: string | null; timedOut: boolean; outputExceeded: boolean; cleanupObserved: boolean; stdout: string; stderr: string };

/** Static callers choose argv. Registry text is never executed as a shell command. */
export async function runCommand(command: string[], cwd: string, options: { timeoutMs?: number; maxOutputBytes?: number } = {}): Promise<CommandResult> {
  const timeoutMs = options.timeoutMs ?? 90_000;
  const maxOutputBytes = options.maxOutputBytes ?? 2_097_152;
  requireThat(command.length > 0 && command.length <= 64 && command.every(argument => typeof argument === "string" && argument.length <= 4096), "invalid command argv");
  requireThat(Number.isSafeInteger(timeoutMs) && timeoutMs > 0 && timeoutMs <= 120_000, "invalid command deadline");
  requireThat(Number.isSafeInteger(maxOutputBytes) && maxOutputBytes > 0 && maxOutputBytes <= 8_388_608, "invalid output limit");
  requireThat(process.platform !== "win32", "bounded verification command custody requires a POSIX process group");
  return new Promise((resolve, reject) => {
    const supervisor = fileURLToPath(new URL("./command-supervisor.ts", import.meta.url));
    const child = spawn(process.execPath, [supervisor, JSON.stringify(command)], { cwd, env: CHILD_ENV, stdio: ["ignore", "ignore", "pipe", "ipc", "pipe", "pipe"], detached: true });
    // Node's declaration truncates the tuple at fd4; spawn supports extra pipes.
    const descriptors: readonly unknown[] = child.stdio;
    const capturedOut = descriptors[4] as Readable;
    const capturedErr = descriptors[5] as Readable;
    const stdout: Buffer[] = [], stderr: Buffer[] = [];
    let bytes = 0, timedOut = false, outputExceeded = false, stopping = false;
    let stdoutEnded = false, stderrEnded = false;
    let completion: SupervisorCompletion | undefined;
    let failure: Error | undefined;
    let cleanupTimer: ReturnType<typeof setTimeout> | undefined;
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
        child.stderr?.destroy();
        child.unref();
        reject(new Error("command cleanup was not observed within the 2000ms cleanup bound"));
      }, 2_000);
    };
    const maybeComplete = () => { if (completion !== undefined && stdoutEnded && stderrEnded) stop(); };
    const timer = setTimeout(() => { timedOut = true; stop(); }, timeoutMs);
    const receive = (chunks: Buffer[]) => (chunk: Buffer) => {
      bytes += chunk.byteLength;
      if (bytes > maxOutputBytes) { outputExceeded = true; stop(); return; }
      chunks.push(chunk);
    };
    capturedOut.on("data", receive(stdout));
    capturedErr.on("data", receive(stderr));
    capturedOut.on("end", () => { stdoutEnded = true; maybeComplete(); });
    capturedErr.on("end", () => { stderrEnded = true; maybeComplete(); });
    child.stderr!.on("data", (chunk: Buffer) => {
      failure ??= new Error(`command supervisor diagnostic: ${chunk.toString("utf8", 0, 4096)}`);
      stop();
    });
    child.on("message", (value: unknown) => {
      try {
        requireThat(completion === undefined, "duplicate command supervisor completion");
        const message = record(value, ["kind", "exitCode", "signal", "error"], "supervisor completion");
        requireThat(message.kind === "completed", "unknown command supervisor message");
        requireThat(message.exitCode === null || typeof message.exitCode === "number" && Number.isSafeInteger(message.exitCode), "invalid target exit code");
        requireThat(message.signal === null || typeof message.signal === "string", "invalid target signal");
        requireThat(message.error === null || typeof message.error === "string", "invalid target error");
        completion = message as SupervisorCompletion;
        if (completion.error !== null) failure = new Error(completion.error);
        maybeComplete();
      } catch (error) { failure = error instanceof Error ? error : new Error(String(error)); stop(); }
    });
    child.on("error", error => { failure = error; stop(); });
    child.on("exit", () => {
      if (!stopping) { failure ??= new Error("command supervisor exited unexpectedly"); stop(); }
    });
    child.on("close", (exitCode, signal) => {
      clearTimeout(timer);
      clearTimeout(cleanupTimer);
      const cleanupObserved = stopping && stdoutEnded && stderrEnded && exitCode === null && signal === "SIGKILL";
      if (failure !== undefined) { reject(failure); return; }
      if (!cleanupObserved || !timedOut && !outputExceeded && completion === undefined) { reject(new Error("command supervisor cleanup/completion was not observed")); return; }
      try {
        const decoder = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });
        resolve({ command, exitCode: completion?.exitCode ?? null, signal: completion?.signal ?? null, timedOut, outputExceeded, cleanupObserved, stdout: decoder.decode(Buffer.concat(stdout)), stderr: decoder.decode(Buffer.concat(stderr)) });
      } catch { reject(new Error("command output contains invalid UTF-8")); }
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
  if (suite === "runner-selftest") {
    const command = [process.execPath, "test", "--timeout", "20000", "verify/tests"];
    const result = await runCommand(command, root);
    return { tests: admitSelftestOutput(result), commandResult: result, syntheticProofFixtures: true };
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
