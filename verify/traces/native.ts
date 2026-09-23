import { constants } from "node:fs";
import { mkdir, open, realpath, writeFile } from "node:fs/promises";
import { basename, dirname, isAbsolute, join } from "node:path";
import { createHash } from "node:crypto";
import { hashBytes, readFileBounded, stableJson } from "../lib/files";
import { CommandFailure, requireSuccess, runCommand, type CommandResult } from "../lib/runner";
import { requireThat } from "../lib/schema";
import { LIMITS, parseTrace, type History, type Trace } from "./schema";

export type Artifact = { path: string; sha256: string; bytes: number };
/** Explicit task-owned build artifact; source/build correspondence is a separate gate. */
export async function artifactIdentity(path: string): Promise<Artifact> {
  requireThat(isAbsolute(path), "native trace artifact must be an explicit absolute path");
  const physical = await realpath(path), fd = await open(physical, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  try {
    const stat = await fd.stat();
    requireThat(stat.isFile() && stat.size > 0 && stat.size <= 536_870_912, "trace executable type/byte bound");
    const hash = createHash("sha256"); let bytes = 0;
    for (;;) {
      const buffer = Buffer.alloc(65_536), { bytesRead } = await fd.read(buffer);
      if (!bytesRead) break;
      bytes += bytesRead; requireThat(bytes <= 536_870_912, "trace executable grew past bound");
      hash.update(buffer.subarray(0, bytesRead));
    }
    return { path: physical, sha256: `sha256:${hash.digest("hex")}`, bytes };
  } finally { await fd.close(); }
}
export async function readTrace(path: string, history: History): Promise<{ bytes: Uint8Array; trace: Trace }> {
  const bytes = await readFileBounded(dirname(path), basename(path), LIMITS.transcriptBytes);
  const text = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes);
  requireThat(!text.startsWith("\ufeff"), "trace output BOM");
  return { bytes, trace: parseTrace(JSON.parse(text), history) };
}
export function admitNativeCommand(result: CommandResult): void {
  requireSuccess(result);
  requireThat(/^\nrunning 1 test\ntest verification_trace::replay_portable_history \.\.\. ok\n\ntest result: ok\. 1 passed; 0 failed; 0 ignored; 0 measured; \d+ filtered out; finished in \d+(?:\.\d+)?s\n\n$/.test(result.stdout),
  "native trace command did not execute exactly its one real fixture");
}
/** Retains bounded raw diagnostics even when process custody or parsing rejects. */
export async function replayNative(root: string, artifact: Artifact, history: History, directory: string): Promise<{ trace: Trace; result: CommandResult; rawSha256: string }> {
  await mkdir(directory, { recursive: false });
  const input = join(directory, "history.json"), output = join(directory, "native.json"), state = join(directory, "state");
  await mkdir(state);
  const source = stableJson(history) + "\n";
  await writeFile(input, source, { flag: "wx", mode: 0o600 });
  requireThat(stableJson(await artifactIdentity(artifact.path)) === stableJson(artifact), "native artifact changed before replay");
  let result: CommandResult;
  try {
    result = await runCommand(["/usr/bin/env", `ALGAL_TRACE_INPUT=${input}`, `ALGAL_TRACE_OUTPUT=${output}`, `ALGAL_TRACE_ROOT=${state}`,
      artifact.path, "verification_trace::replay_portable_history", "--exact", "--ignored", "--nocapture"], root, { timeoutMs: 30_000, maxOutputBytes: 1_048_576 });
    await writeFile(join(directory, "command.json"), stableJson(result) + "\n", { flag: "wx", mode: 0o600 });
    admitNativeCommand(result);
  } catch (error) {
    if (error instanceof CommandFailure) {
      await writeFile(join(directory, "stdout.bin"), error.rawStdout, { flag: "wx", mode: 0o600 });
      await writeFile(join(directory, "stderr.bin"), error.rawStderr, { flag: "wx", mode: 0o600 });
      await writeFile(join(directory, "custody-failure.json"), stableJson({ message: error.message, ...error.observation }) + "\n", { flag: "wx", mode: 0o600 });
    }
    throw error;
  }
  requireThat(stableJson(await artifactIdentity(artifact.path)) === stableJson(artifact), "native artifact changed during replay");
  requireThat(hashBytes(await readFileBounded(directory, "history.json", LIMITS.transcriptBytes)) === hashBytes(source), "history input changed during replay");
  const raw = await readTrace(output, history);
  return { trace: raw.trace, result, rawSha256: hashBytes(raw.bytes) };
}
