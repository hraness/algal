/** Private execution helper, not a user entry point.
 * Its live process anchors a detached POSIX group until the parent has observed
 * target exit, relayed output EOF, or requests failure cleanup. The parent never
 * sends a signal to a remembered PID/PGID. Cooperative descendants must stay in
 * this group; independently detached descendants are outside this contract. */
import { spawn } from "node:child_process";
import type { Readable, Writable } from "node:stream";

export const CHILD_ENV = { LANG: "C", LC_ALL: "C", TZ: "UTC", NO_COLOR: "1", FORCE_COLOR: "0" } as const;
export type SupervisorCompletion = { kind: "completed"; exitCode: number | null; signal: string | null; error: string | null };
export type SupervisorDrain = { kind: "drained"; stdoutBytes: number; stderrBytes: number };
export type SupervisorFailure = { kind: "failed"; error: string };

function stopOwnedGroup(): never {
  // PID 0 identifies this process's current group, not a reusable numeric ID.
  process.kill(0, "SIGKILL");
  throw new Error("SIGKILL unexpectedly returned without terminating the supervisor");
}

/** Await each write callback before reading another chunk. Only one chunk per
 * stream is in flight; no unbounded relay queue or text decoding is involved. */
async function relay(input: Readable, output: Writable): Promise<number> {
  let bytes = 0;
  for await (const chunk of input) {
    if (!Buffer.isBuffer(chunk)) throw new Error("nonbinary supervisor relay chunk");
    bytes += chunk.byteLength;
    if (!Number.isSafeInteger(bytes)) throw new Error("supervisor relay byte count overflow");
    await new Promise<void>((resolve, reject) => output.write(chunk, error => error ? reject(error) : resolve()));
  }
  return bytes;
}

async function main(): Promise<void> {
  if (process.platform === "win32" || typeof process.send !== "function") throw new Error("a private IPC channel and POSIX process group are required");
  process.on("disconnect", stopOwnedGroup);
  process.on("message", (value: unknown) => {
    if (value === "stop") stopOwnedGroup();
    // Malformed private control is a failed run, never authority to continue.
    stopOwnedGroup();
  });
  // Keep the anchor alive even after the target exits and its descriptors close.
  const hold = setInterval(() => {}, 1_000);
  hold.ref();
  const send = (message: SupervisorCompletion | SupervisorDrain | SupervisorFailure) => {
    process.send!(message, error => { if (error) stopOwnedGroup(); });
  };
  let spawnError: string | null = null;
  let reported = false;
  const completed = (exitCode: number | null, signal: string | null) => {
    if (reported) return;
    reported = true;
    send({ kind: "completed", exitCode, signal, error: spawnError });
  };
  try {
    const command: unknown = JSON.parse(process.argv[2] ?? "null");
    if (!Array.isArray(command) || command.length === 0 || command.length > 64 || !command.every(argument => typeof argument === "string" && argument.length <= 4096)) throw new Error("invalid private command argv");
    // Extra Bun pipe descriptors can be closed again by a collected earlier
    // subprocess after their numeric descriptors have been reused. Standard
    // streams retain explicit ownership throughout this lossless relay.
    const child = spawn(command[0] as string, command.slice(1) as string[], { env: CHILD_ENV, stdio: ["ignore", "pipe", "pipe"], detached: false });
    child.on("error", error => { spawnError = error.message.slice(0, 4096); });
    // A leader can exit while descendants still hold the target pipe writers.
    // Report that status without treating it as drained output or cleanup.
    child.on("exit", completed);
    const closed = new Promise<void>(resolve => child.on("close", (exitCode, signal) => { completed(exitCode, signal); resolve(); }));
    const [, stdoutBytes, stderrBytes] = await Promise.all([
      closed, relay(child.stdout, process.stdout), relay(child.stderr, process.stderr),
    ]);
    // Both target EOFs and every forwarding write callback have completed.
    // The parent may now stop this anchor, then independently observe its own
    // output EOFs and SIGKILL termination. All errors use the private channel.
    send({ kind: "drained", stdoutBytes, stderrBytes });
  } catch (error) {
    send({ kind: "failed", error: String(error instanceof Error ? error.message : error).slice(0, 4096) });
  }
}

if (import.meta.main) await main();
