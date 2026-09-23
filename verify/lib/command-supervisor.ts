/** Private execution helper, not a user entry point.
 * Its live process anchors a detached POSIX group until the parent has observed
 * command completion and pipe EOF, or requests failure cleanup. The parent never
 * sends a signal to a remembered PID/PGID. Cooperative descendants must stay in
 * this group; independently detached descendants are outside this contract. */
import { spawn } from "node:child_process";
import { closeSync } from "node:fs";

export const CHILD_ENV = { LANG: "C", LC_ALL: "C", TZ: "UTC", NO_COLOR: "1", FORCE_COLOR: "0" } as const;
export type SupervisorCompletion = { kind: "completed"; exitCode: number | null; signal: string | null; error: string | null };

function stopOwnedGroup(): never {
  // PID 0 identifies this process's current group, not a reusable numeric ID.
  process.kill(0, "SIGKILL");
  throw new Error("SIGKILL unexpectedly returned without terminating the supervisor");
}

function main(): void {
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
  let spawnError: string | null = null;
  let reported = false;
  const completed = (exitCode: number | null, signal: string | null) => {
    if (reported) return;
    reported = true;
    // No supervisor output is buffered. Descendants inherit these same pipe
    // writers, so parent-side EOF witnesses closure beyond the direct target.
    // Bun retains its standard fd1/fd2 internally, so captured command output
    // uses dedicated inherited descriptors that can actually reach pipe EOF.
    closeSync(4);
    closeSync(5);
    const message: SupervisorCompletion = { kind: "completed", exitCode, signal, error: spawnError };
    process.send!(message, error => { if (error) stopOwnedGroup(); });
  };
  try {
    const command: unknown = JSON.parse(process.argv[2] ?? "null");
    if (!Array.isArray(command) || command.length === 0 || command.length > 64 || !command.every(argument => typeof argument === "string" && argument.length <= 4096)) throw new Error("invalid private command argv");
    const child = spawn(command[0] as string, command.slice(1) as string[], { env: CHILD_ENV, stdio: ["ignore", 4, 5], detached: false });
    child.on("error", error => { spawnError = error.message; });
    child.on("close", completed);
  } catch (error) {
    spawnError = error instanceof Error ? error.message : String(error);
    completed(null, null);
  }
}

if (import.meta.main) main();
