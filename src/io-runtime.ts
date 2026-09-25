import { utf8Length } from "./utf8";
/** Bounded streams and explicitly selected command execution. Importing this
 * module does not open files, start processes, or require filesystem APIs. */
import { AlgalError } from "./errors";
import { asJsonValue, canonicalize, type JsonValue } from "./values";

/** Host-only command capability. Keeping its structural type here lets the
 * pure runtime bundle/typecheck in browsers without importing Bun globals. */
type CommandRuntime = {
  spawn(argv: string[], options: { cwd?: string; env?: Record<string, string>; stdin: "pipe"; stdout: "pipe"; stderr: "pipe" }): {
    stdin: { write(text: string): unknown; end(): unknown };
    stdout: ReadableStream<Uint8Array>; stderr: ReadableStream<Uint8Array>;
    exited: Promise<number>; signalCode: string | null;
    kill(signal: "SIGKILL"): unknown;
  };
};

export async function boundedBytes(
  stream: ReadableStream<Uint8Array> | null,
  maxBytes: number,
  label: string,
  signal?: AbortSignal,
): Promise<Uint8Array> {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1 || maxBytes > 67_108_864) {
    throw new AlgalError("PARSE_FAILED", `${label}: invalid byte limit`);
  }
  if (signal?.aborted) throw new AlgalError("BUDGET_EXHAUSTED", `${label} cancelled`);
  if (!stream) return new Uint8Array();
  const reader = stream.getReader();
  const onAbort = () => { void reader.cancel().catch(() => {}); };
  signal?.addEventListener("abort", onAbort, { once: true });
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    for (;;) {
      const next = await reader.read();
      if (signal?.aborted) throw new AlgalError("BUDGET_EXHAUSTED", `${label} cancelled`);
      if (next.done) break;
      length += next.value.byteLength;
      if (length > maxBytes) {
        await reader.cancel().catch(() => {});
        throw new AlgalError("BUDGET_EXHAUSTED", `${label} exceeds ${maxBytes} bytes`);
      }
      chunks.push(next.value);
    }
  } finally {
    signal?.removeEventListener("abort", onAbort);
    reader.releaseLock();
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

export async function commandJson(
  argv: string[],
  value: JsonValue,
  options: { timeoutMs?: number; maxStdoutBytes?: number; cwd?: string; env?: Record<string, string>; signal?: AbortSignal } = {},
): Promise<JsonValue> {
  const timeoutMs = options.timeoutMs ?? 120_000;
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 600_000) {
    throw new AlgalError("PARSE_FAILED", "invalid command timeout");
  }
  const maxStdoutBytes = options.maxStdoutBytes ?? 1_048_576;
  if (!Number.isSafeInteger(maxStdoutBytes) || maxStdoutBytes < 1 || maxStdoutBytes > 67_108_864) {
    throw new AlgalError("PARSE_FAILED", "invalid command output byte limit");
  }
  if (options.signal?.aborted) throw new AlgalError("BUDGET_EXHAUSTED", "command cancelled before launch");
  const payload = canonicalize(value);
  if (utf8Length(payload) > 1_048_576) throw new AlgalError("BUDGET_EXHAUSTED", "command input exceeds 1048576 bytes");
  const controller = new AbortController();
  const signal = options.signal ? AbortSignal.any([options.signal, controller.signal]) : controller.signal;
  const runtime = (globalThis as { Bun?: CommandRuntime }).Bun;
  if (!runtime) throw new AlgalError("CAPABILITY_DENIED", "This host does not provide command execution");
  // `env` replaces the child's environment outright (Bun.spawn semantics);
  // omitting it inherits the host's — the isolated executor always sets it.
  const child = runtime.spawn(argv, {
    ...(options.cwd ? { cwd: options.cwd } : {}),
    ...(options.env ? { env: options.env } : {}),
    stdin: "pipe", stdout: "pipe", stderr: "pipe",
  });
  const stop = () => { child.kill("SIGKILL"); };
  signal.addEventListener("abort", stop, { once: true });
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let responseComplete = false;
  try {
    const output = boundedBytes(child.stdout, maxStdoutBytes, "executor output", signal);
    const diagnostic = boundedBytes(child.stderr, 65_536, "executor diagnostics", signal);
    const input = (async () => {
      try {
        // Both operations may return independent promises when the pipe is
        // backpressured; observing only end() can leak a write rejection.
        await child.stdin.write(payload);
        await child.stdin.end();
        return true;
      } catch (error) {
        // A command may close stdin before asking to suspend. Settle the pipe
        // and let its authoritative exit status decide that outcome.
        if (typeof error === "object" && error !== null && "code" in error && error.code === "EPIPE") return false;
        throw error;
      }
    })();
    const [stdout, , code, inputComplete] = await Promise.all([output, diagnostic, child.exited, input]);
    responseComplete = true;
    if (signal.aborted) throw new AlgalError("BUDGET_EXHAUSTED", "command cancelled or timed out", undefined, {uncertain: true});
    if (child.signalCode) throw new AlgalError("EFFECT_FAILED", "executor terminated by signal; external completion uncertain", undefined, {uncertain: true});
    // exit 75 (EX_TEMPFAIL): the answer is not ready — suspend the run; it
    // may be resumed later. Any other nonzero exit is an ordinary failure.
    if (code === 75) throw new AlgalError("EFFECT_SUSPENDED", "executor asked the host to suspend the run");
    if (code !== 0) throw new AlgalError("EFFECT_FAILED", `executor exited ${code}; diagnostics withheld`);
    if (!inputComplete) throw new AlgalError("EFFECT_FAILED", "executor closed stdin before request delivery");
    let parsed: unknown;
    try { parsed = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(stdout)); }
    catch { throw new AlgalError("EFFECT_UNPARSEABLE", "executor stdout is not JSON"); }
    return asJsonValue(parsed, "executor output");
  } catch (error) {
    // Killing a launched command cannot prove that its external work stopped.
    if (signal.aborted) throw new AlgalError("BUDGET_EXHAUSTED", "command cancelled or timed out", undefined, {uncertain: true});
    if (!responseComplete) throw new AlgalError(
      error instanceof AlgalError ? error.code : "EFFECT_FAILED",
      "executor response unavailable; external completion uncertain",
      undefined, {uncertain: true},
    );
    throw error;
  } finally {
    clearTimeout(timer);
    controller.abort();
    signal.removeEventListener("abort", stop);
    child.kill("SIGKILL");
    await child.exited;
  }
}
