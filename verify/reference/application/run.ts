/** Bounded initial execution producer; returned metadata is not admission authority. */
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { hashJson, stableJson } from "../../lib/files";
import { CommandFailure, runCommand } from "../../lib/runner";
import { artifactIdentity } from "../../traces/native";
import { ArchiveWriter, parseCanonical } from "./archive";
import { encodeRecord, LIMITS, utf8Size } from "./bounded";
import { requireBaseline } from "./baseline";
import { admitBun, admitCommand, admitNative, requireCommandArgv, requireSharedAgreement } from "./commands";
import { MUTANTS, mutate } from "./controls";
import { historyDefinition } from "./definition";
import { checkGenerated, requireCoverage } from "./generate";
import { MATRIX, RELATION } from "./matrix";
import { checkTrace, validateHistoryDomain } from "./oracle";
import { requireRetainedInput } from "./packet";
import type { Authority } from "./readmit";
import { retainFailure } from "./retention";
import { parseTrace, type History, type Trace } from "./schema";
import { shrink } from "./shrink";

export async function runHistorySlice(root: string, archive: string, authority: Authority): Promise<void> {
  if (authority.referenceDirectory !== import.meta.dir || authority.recordedArchive !== archive) throw new Error("History producer selected identity differs");
  const definition = await historyDefinition(root, import.meta.dir);
  if (hashJson(definition) !== authority.definitionDigest) throw new Error("History source changed before execution");
  for (const artifact of Object.values(authority.artifacts)) if (stableJson(await artifactIdentity(artifact.path)) !== stableJson(artifact)) throw new Error("History artifact changed before execution");
  const writer = await ArchiveWriter.open(archive);
  async function command(path: string, argv: string[]): Promise<string> {
    requireCommandArgv(argv, "selected before launch");
    const maxOutputBytes = writer.budget.beginCommand();
    let result;
    try { result = await runCommand(argv, root, { timeoutMs: LIMITS.workerMs, maxOutputBytes }); }
    catch (error) {
      if (error instanceof CommandFailure) await retainFailure(error, [
        async () => { writer.budget.capture(error.rawStdout.byteLength + error.rawStderr.byteLength); },
        () => writer.json(`${path}.custody.json`, error.observation),
        () => writer.bytes(`${path}.stdout.bin`, error.rawStdout),
        () => writer.bytes(`${path}.stderr.bin`, error.rawStderr),
      ]);
      throw error;
    }
    let stdout: string;
    try {
      stdout = admitCommand(result, argv, maxOutputBytes);
      writer.budget.capture(utf8Size(result.stdout) + utf8Size(result.stderr));
    } catch (error) { return retainFailure(error, [() => writer.json(path, result)]); }
    await writer.json(path, result); return stdout;
  }
  async function native(history: History, prefix: string, label: string, input: string): Promise<Trace> {
    const output = `${prefix}/${label}.json`, ownedRoot = join(archive, prefix, `${label}-root`), inputPath = join(archive, input), inputBytes = stableJson(history) + "\n";
    await requireRetainedInput(inputPath, inputBytes);
    if (stableJson(await artifactIdentity(authority.artifacts.native.path)) !== stableJson(authority.artifacts.native)) throw new Error("Native history artifact drift");
    await mkdir(ownedRoot);
    const stdout = await command(`${prefix}/${label}.command.json`, [authority.artifacts.native.path, "replay", inputPath, join(archive, output), ownedRoot]);
    const packet = await writer.adopt(output), trace = admitNative(history, parseCanonical(packet.bytes), stdout, packet.bytes.byteLength);
    await requireRetainedInput(inputPath, inputBytes);
    if (stableJson(await artifactIdentity(authority.artifacts.native.path)) !== stableJson(authority.artifacts.native)) throw new Error("Native history artifact drift");
    await rm(ownedRoot, { recursive: true }); return trace;
  }
  try {
    await writer.json("start.json", { contract: "algal.application-history-slice-start.v1", authority, definition, matrix: MATRIX, mutants: MUTANTS, limits: LIMITS });
    const cases: unknown[] = []; let first: { history: History; trace: Trace } | undefined;
    for (const [index, selected] of MATRIX.entries()) {
      const prefix = `case-${index}`, directory = join(archive, prefix), worker = join(import.meta.dir, "worker.ts");
      await writer.directory(prefix); const generateRoot = join(directory, "generate-root"); await mkdir(generateRoot);
      const generatedStdout = await command(`${prefix}/generate.command.json`, [authority.artifacts.bun.path, worker, "generate", `${selected.seed}:${selected.profile}`, join(directory, "generated.json"), generateRoot]);
      const generatedRaw = await writer.adopt(`${prefix}/generated.json`), generated = admitBun(parseCanonical(generatedRaw.bytes), generatedStdout, { mode: "generate", ...selected });
      await rm(generateRoot, { recursive: true });
      const history = generated.history, input = `${prefix}/history.json`, inputBytes = encodeRecord(history, LIMITS.historyBytes);
      await writer.bytes(input, inputBytes);
      const bunRoot = join(directory, "bun-root"); await mkdir(bunRoot);
      const bunStdout = await command(`${prefix}/bun.command.json`, [authority.artifacts.bun.path, worker, "replay", join(archive, input), join(directory, "bun.json"), bunRoot]);
      const bunRaw = await writer.adopt(`${prefix}/bun.json`), replayed = admitBun(parseCanonical(bunRaw.bytes), bunStdout, { mode: "replay", history });
      await requireRetainedInput(join(archive, input), inputBytes); await rm(bunRoot, { recursive: true });
      const a = await native(history, prefix, "native-a", input), b = await native(history, prefix, "native-b", input);
      for (const trace of [a, b]) { checkGenerated(history, trace); requireCoverage(checkTrace(history, trace).witnesses, history.profile); }
      requireSharedAgreement([generated.trace, replayed.trace, a, b]);
      const row = { ...selected, commands: LIMITS.historyCommands, witnesses: generated.witnesses, workers: 4 };
      await writer.json(`${prefix}/result.json`, row); cases.push(row);
      if (index === 0) first = { history, trace: a };
    }
    if (!first) throw new Error("History first fixture absent");
    const controls: unknown[] = [];
    for (const [index, mutant] of MUTANTS.entries()) {
      const prefix = `control-${index}`; await writer.directory(prefix); let workers = 0;
      const result = await shrink(first.history, async history => {
        validateHistoryDomain(history, first!.trace.fixtures);
        if (workers >= LIMITS.shrinkAttempts + 2) throw new Error("History shrink worker bound");
        const trace = await requireBaseline(async () => {
          const attempt = `${prefix}/attempt-${workers++}`, input = `${attempt}/history.json`;
          await writer.directory(attempt); await writer.bytes(input, encodeRecord(history, LIMITS.historyBytes));
          return native(history, attempt, "native", input);
        });
        checkTrace(history, parseTrace(mutate(history, trace, mutant), history));
      }, LIMITS.shrinkAttempts);
      await writer.json(`${prefix}/result.json`, { mutant, ...result }); controls.push({ mutant, workers, result });
    }
    if (hashJson(await historyDefinition(root, import.meta.dir)) !== authority.definitionDigest) throw new Error("History source changed during execution");
    for (const artifact of Object.values(authority.artifacts)) if (stableJson(await artifactIdentity(artifact.path)) !== stableJson(artifact)) throw new Error("History artifact changed during execution");
    await writer.stable();
    await writer.json("result.json", { contract: "algal.application-history-slice-result.v1", status: "passed", formalClaims: 0, relation: RELATION, ...authority, limits: LIMITS, cases, controls, targetWorkers: writer.budget.targetCommands, capturedOutputBytes: writer.budget.capturedOutputBytes, archiveBytesBeforeSummary: writer.budget.archiveBytes, retained: [...writer.retained] });
    await writer.stable();
  } catch (error) {
    await retainFailure(error, [() => writeFile(join(archive, "failure.json"), encodeRecord({ contract: "algal.application-history-slice-failure.v1", status: "failed", description: String(error).slice(0, 2048), targetWorkers: writer.budget.targetCommands, capturedOutputBytes: writer.budget.capturedOutputBytes, archiveBytes: writer.budget.archiveBytes }, LIMITS.failureBytes), { flag: "wx", mode: 0o600 })]);
  }
}
