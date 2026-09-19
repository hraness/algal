import { AlgalError } from "./errors";
import { asJsonValue, canonicalize, type JsonValue } from "./values";

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
  options: { timeoutMs?: number; maxStdoutBytes?: number; cwd?: string; signal?: AbortSignal } = {},
): Promise<JsonValue> {
  const timeoutMs = options.timeoutMs ?? 120_000;
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 600_000) {
    throw new AlgalError("PARSE_FAILED", "invalid command timeout");
  }
  if (options.signal?.aborted) throw new AlgalError("BUDGET_EXHAUSTED", "command cancelled before launch");
  const payload = canonicalize(value);
  if (Buffer.byteLength(payload) > 1_048_576) throw new AlgalError("BUDGET_EXHAUSTED", "command input exceeds 1048576 bytes");
  const controller = new AbortController();
  const signal = options.signal ? AbortSignal.any([options.signal, controller.signal]) : controller.signal;
  const child = Bun.spawn(argv, { ...(options.cwd ? { cwd: options.cwd } : {}), stdin: "pipe", stdout: "pipe", stderr: "pipe" });
  const stop = () => { child.kill("SIGKILL"); };
  signal.addEventListener("abort", stop, { once: true });
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const output = boundedBytes(child.stdout, options.maxStdoutBytes ?? 1_048_576, "executor output", signal);
    const diagnostic = boundedBytes(child.stderr, 65_536, "executor diagnostics", signal);
    child.stdin.write(payload);
    child.stdin.end();
    const [stdout, , code] = await Promise.all([output, diagnostic, child.exited]);
    if (signal.aborted) throw new AlgalError("BUDGET_EXHAUSTED", "command cancelled or timed out");
    // exit 75 (EX_TEMPFAIL): the answer is not ready — suspend the run; it
    // may be resumed later. Any other nonzero exit is an ordinary failure.
    if (code === 75) throw new AlgalError("EFFECT_SUSPENDED", "executor asked the host to suspend the run");
    if (code !== 0) throw new AlgalError("EFFECT_FAILED", `executor exited ${code}; diagnostics withheld`);
    let parsed: unknown;
    try { parsed = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(stdout)); }
    catch { throw new AlgalError("EFFECT_UNPARSEABLE", "executor stdout is not JSON"); }
    return asJsonValue(parsed, "executor output");
  } finally {
    clearTimeout(timer);
    controller.abort();
    signal.removeEventListener("abort", stop);
    child.kill("SIGKILL");
    await child.exited;
  }
}
