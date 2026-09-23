/** Pinned, bounded native CLI transport. It never implements logical inference. */
import { createHash } from "node:crypto";
import { constants } from "node:fs";
import { mkdtemp, open, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { isAbsolute, join } from "node:path";
import { applicationInt, applicationJson, applicationObject, applicationRef, applicationTag } from "./application-contract";
import { digestCanonical, type Digest } from "./digest";
import { APPLICATION_MEMORY_NATIVE_LIMITS, parseMemoryNativeProgram, type MemoryEngineResult, type MemoryQueryEngine } from "./application-memory";
import { canonicalize, type JsonValue } from "./values";

export type NativeMemoryOptions = { executable: string; expectedSha256: string; timeoutMs?: number; temporaryRoot?: string };
function parseSnapshot(input: unknown): JsonValue {
  const value = applicationObject(input, ["contract", "facts"]); applicationTag(value.contract, "algal.memory.v1");
  if (!Array.isArray(value.facts) || value.facts.length > 128) throw new Error("Native memory fact bound exceeded");
  // Rust performs the complete fact/schema validation. No unbounded bytes reach it.
  return value;
}
/** Identity of the inode whose bytes were last hashed; any change forces a rehash. */
type ExecutableIdentity = { dev: number; ino: number; size: number; mtimeMs: number; ctimeMs: number };

export class NativeMemoryQueryEngine implements MemoryQueryEngine {
  readonly identity: Digest;
  private readonly executable: string;
  private readonly expectedSha256: string;
  private readonly timeoutMs: number;
  private readonly temporaryRoot: string;
  private readonly pending = new Set<Promise<unknown>>();
  private verifiedExecutable: ExecutableIdentity | undefined;
  constructor(input: NativeMemoryOptions) {
    const keys = Object.keys(input);
    if (keys.some(k => !["executable", "expectedSha256", "timeoutMs", "temporaryRoot"].includes(k))) throw new Error("Unknown native memory option");
    if (typeof input.executable !== "string" || !isAbsolute(input.executable) || input.executable.includes("\0")) throw new Error("Native memory executable must be absolute");
    if (!/^[a-f0-9]{64}$/.test(input.expectedSha256)) throw new Error("Native memory executable digest required");
    this.executable = input.executable; this.expectedSha256 = input.expectedSha256;
    this.timeoutMs = applicationInt(input.timeoutMs ?? 10_000, 1, 10_000);
    this.temporaryRoot = input.temporaryRoot ?? tmpdir();
    if (!isAbsolute(this.temporaryRoot)) throw new Error("Native memory temporary root must be absolute");
    this.identity = digestCanonical({ contract: "algal.application-native-memory.v1", executableSha256: this.expectedSha256, protocol: "algal.query.v1", timeoutMs: this.timeoutMs, limits: APPLICATION_MEMORY_NATIVE_LIMITS });
  }
  private track<T>(operation: Promise<T>): Promise<T> {
    this.pending.add(operation); void operation.then(() => this.pending.delete(operation), () => this.pending.delete(operation)); return operation;
  }
  async settle(): Promise<void> { await Promise.allSettled([...this.pending]); }
  /** Hash the executable once per identity: the descriptor is stat'ed and read
   * together, so a swapped binary (new inode, size, or timestamps) is rehashed
   * and a pinned digest mismatch still fails closed. */
  private async verifyExecutable(): Promise<void> {
    const file = await open(this.executable, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
    try {
      const stat = await file.stat();
      if (!stat.isFile() || stat.size > 128 * 1024 * 1024) throw new Error("Native memory executable must be a bounded regular file");
      const identity: ExecutableIdentity = { dev: stat.dev, ino: stat.ino, size: stat.size, mtimeMs: stat.mtimeMs, ctimeMs: stat.ctimeMs };
      const seen = this.verifiedExecutable;
      if (seen && seen.dev === identity.dev && seen.ino === identity.ino && seen.size === identity.size && seen.mtimeMs === identity.mtimeMs && seen.ctimeMs === identity.ctimeMs) return;
      this.verifiedExecutable = undefined;
      if (createHash("sha256").update(await file.readFile()).digest("hex") !== this.expectedSha256) throw new Error("Pinned native memory executable changed");
      this.verifiedExecutable = identity;
    } finally { await file.close(); }
  }
  private async invoke(command: "query" | "verify", snapshot: JsonValue, program: JsonValue, result: JsonValue | undefined, signal?: AbortSignal): Promise<{ output?: JsonValue; failure?: MemoryEngineResult }> {
    if (signal?.aborted) return { failure: { kind: "incomplete", status: "cancelled", reason: "cancelled-before-dispatch", work: null } };
    await this.verifyExecutable();
    if (signal?.aborted) return { failure: { kind: "incomplete", status: "cancelled", reason: "cancelled-before-dispatch", work: null } };
    const dir = await mkdtemp(join(this.temporaryRoot, "algal-native-memory-"));
    try {
      await writeFile(join(dir, "snapshot.json"), canonicalize(snapshot), { flag: "wx", mode: 0o600 });
      await writeFile(join(dir, "program.json"), canonicalize(program), { flag: "wx", mode: 0o600 });
      const args = [this.executable, "memory", command, join(dir, "snapshot.json"), join(dir, "program.json")];
      if (result !== undefined) { await writeFile(join(dir, "result.json"), canonicalize(result), { flag: "wx", mode: 0o600 }); args.push(join(dir, "result.json")); }
      if (signal?.aborted) return { failure: { kind: "incomplete", status: "cancelled", reason: "cancelled-before-dispatch", work: null } };
      const child = Bun.spawn(args, { stdin: "ignore", stdout: "pipe", stderr: "pipe" });
      let stopReason: "cancelled" | "timeout" | "output-limit" | undefined;
      let force: ReturnType<typeof setTimeout> | undefined;
      const stop = (reason: typeof stopReason) => {
        stopReason ??= reason;
        if (child.exitCode === null) child.kill("SIGTERM");
        force ??= setTimeout(() => { if (child.exitCode === null) child.kill("SIGKILL"); }, 250);
      };
      const abort = () => stop("cancelled"), timer = setTimeout(() => stop("timeout"), this.timeoutMs);
      signal?.addEventListener("abort", abort, { once: true }); if (signal?.aborted) abort();
      const drain = async (stream: ReadableStream<Uint8Array>, bound: number): Promise<string> => {
        const chunks: Uint8Array[] = []; let total = 0;
        for await (const chunk of stream) {
          total += chunk.length;
          if (total > bound) stop("output-limit"); else chunks.push(chunk);
        }
        return new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks));
      };
      try {
        const reads = [drain(child.stdout, 262_144), drain(child.stderr, 8192)] as const;
        const settled = await Promise.allSettled([...reads, child.exited]);
        if (settled.some(r => r.status === "rejected")) throw new Error("Native memory stream or process failed");
        const stdout = (settled[0] as PromiseFulfilledResult<string>).value;
        const stderr = (settled[1] as PromiseFulfilledResult<string>).value;
        const code = (settled[2] as PromiseFulfilledResult<number>).value;
        if (stopReason) return { failure: { kind: "incomplete", status: stopReason === "cancelled" ? "cancelled" : stopReason === "output-limit" ? "exhausted" : "failed", reason: `native-${stopReason}`, work: null } };
        if (code !== 0) {
          let exhausted = false;
          try { const report = JSON.parse(stderr) as { error?: { code?: string } }; exhausted = report.error?.code === "BUDGET_EXHAUSTED"; } catch { /* malformed diagnostics remain a failure */ }
          return { failure: { kind: "incomplete", status: exhausted ? "exhausted" : "failed", reason: exhausted ? "native-budget-exhausted" : "native-query-failed", work: null } };
        }
        return { output: applicationJson(JSON.parse(stdout) as unknown) };
      } finally {
        clearTimeout(timer); if (force) clearTimeout(force); signal?.removeEventListener("abort", abort);
        if (child.exitCode === null) { child.kill("SIGKILL"); await child.exited; }
      }
    } finally { await rm(dir, { recursive: true, force: true }); }
  }
  query(snapshotInput: JsonValue, programInput: JsonValue, signal?: AbortSignal): Promise<MemoryEngineResult> {
    const snapshot = parseSnapshot(snapshotInput), program = parseMemoryNativeProgram(programInput);
    return this.track((async () => {
      const call = await this.invoke("query", snapshot, program, undefined, signal);
      if (call.failure) return call.failure;
      const result = applicationObject(call.output, ["contract", "snapshot", "program", "complete", "witnessPolicy", "rows", "proofs", "work", "rounds", "baseFacts", "derivedFacts"]);
      applicationTag(result.contract, "algal.query-result.v1");
      if (result.snapshot !== digestCanonical(snapshot) || result.program !== digestCanonical(program) || result.complete !== true || result.witnessPolicy !== "first-canonical-derivation") throw new Error("Native query identity mismatch");
      applicationInt(result.work, 0, 50_000); applicationRef(result.snapshot); applicationRef(result.program);
      if (!Array.isArray(result.rows) || result.rows.length > 16) throw new Error("Native query result row bound exceeded");
      return { kind: "complete", result };
    })());
  }
  verify(snapshotInput: JsonValue, programInput: JsonValue, resultInput: JsonValue, signal?: AbortSignal): Promise<boolean> {
    const snapshot = parseSnapshot(snapshotInput), program = parseMemoryNativeProgram(programInput), result = applicationJson(resultInput);
    return this.track((async () => {
      const call = await this.invoke("verify", snapshot, program, result, signal);
      if (call.failure) return false;
      return applicationObject(call.output, ["ok"]).ok === true;
    })());
  }
}
