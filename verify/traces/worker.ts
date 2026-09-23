/** Exact bounded worker entry; parent owns process custody and evidence admission. */
import { writeFile } from "node:fs/promises";
import { isAbsolute, join } from "node:path";
import { hashBytes, hashJson, readFileBounded, stableJson } from "../lib/files";
import { requireThat } from "../lib/schema";
import { replayBun } from "./bun";
import { generateBun, GenerationFailure } from "./generate";
import { LIMITS, parseHistory, type History, type Trace } from "./schema";

export function workerSummary(mode: "generate" | "replay", history: History, trace: Trace): string {
  return stableJson({ contract: "algal.verification-trace-worker.v1", mode, historyDigest: hashJson(history), traceDigest: hashBytes(stableJson(trace) + "\n"), commands: history.commands.length });
}
if (import.meta.main) {
  const [mode, input, directory] = process.argv.slice(2);
  requireThat(process.argv.length === 5 && (mode === "generate" || mode === "replay") && directory !== undefined && isAbsolute(directory), "trace worker expects generate SEED or replay HISTORY under one absolute output directory");
  let history: History, trace: Trace;
  try {
    if (mode === "generate") {
      requireThat(input !== undefined && /^(?:[1-9]\d*)$/.test(input) && Number(input) <= LIMITS.histories, "generated seed inventory bound");
      ({ history, trace } = await generateBun(Number(input), LIMITS.commands, join(directory, "state")));
    } else {
      requireThat(input === join(directory, "input.json"), "replay input must be the owned worker input");
      const bytes = await readFileBounded(directory, "input.json", LIMITS.transcriptBytes);
      const text = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes); requireThat(!text.startsWith("\ufeff"), "history BOM");
      history = parseHistory(JSON.parse(text)); trace = await replayBun(history, join(directory, "state"));
    }
    await writeFile(join(directory, "history.json"), stableJson(history) + "\n", { flag: "wx", mode: 0o600 });
    await writeFile(join(directory, "trace.json"), stableJson(trace) + "\n", { flag: "wx", mode: 0o600 });
    console.log(workerSummary(mode, history, trace));
  } catch (error) {
    if (error instanceof GenerationFailure) {
      // Preserve the concrete, possibly failing prefix. The parent only calls
      // it a semantic counterexample if independent raw-trace checking agrees.
      await writeFile(join(directory, "history.json"), stableJson(error.history) + "\n", { flag: "wx", mode: 0o600 });
      try { await writeFile(join(directory, "trace.json"), await readFileBounded(error.directory, "failure-trace.json", LIMITS.transcriptBytes), { flag: "wx", mode: 0o600 }); } catch { /* incomplete runs remain failures */ }
    }
    throw error;
  }
}
