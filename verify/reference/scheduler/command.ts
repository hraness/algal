/** Static test provider, launched only as a descendant of a supervised worker.
 * No shell, arbitrary program, inherited mode, or foreign signal target. */
import { appendFile } from "node:fs/promises";
import { isAbsolute, join } from "node:path";
import { requireThat } from "../../lib/schema";
import { boundedBytes } from "../../../src/io";

if (import.meta.main) {
  const [directory, mode] = process.argv.slice(2);
  requireThat(process.argv.length === 4 && directory !== undefined && isAbsolute(directory)
    && ["output", "suspend", "settled", "signal"].includes(mode ?? ""), "static scheduler provider arguments");
  const bytes = await boundedBytes(Bun.stdin.stream(), 1_048_576, "scheduler provider request");
  const request: unknown = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  requireThat(request !== null && typeof request === "object" && "cellId" in request && typeof request.cellId === "string", "provider request cell");
  await appendFile(join(directory, "calls.jsonl"), JSON.stringify(request) + "\n", { mode: 0o600 });
  if (request.cellId !== "primary") { process.stdout.write('"fallback"'); process.exit(0); }
  if (mode === "signal") {
    // POSIX raise targets this current process only. The parent supervisor
    // retains custody of its group and observes the complete output boundary.
    process.kill(process.pid, "SIGTERM");
    await new Promise<never>(() => {});
  }
  if (mode === "suspend") process.exit(75);
  if (mode === "settled") process.exit(7);
  process.stdout.write('"ok"');
}
