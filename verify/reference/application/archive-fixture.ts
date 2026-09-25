/** Explicitly synthetic archive fixture. No process, runtime API, or provider executes.
 * Traces come from the independent finite projection, so this validates the
 * evidence reader's rejection boundaries, never production conformance. */
import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { hashBytes, hashJson, stableJson } from "../../lib/files";
import { artifactIdentity } from "../../traces/native";
import { ArchiveWriter } from "./archive";
import { encodeRecord, LIMITS, utf8Size } from "./bounded";
import { MUTANTS, mutate } from "./controls";
import { historyDefinition, SOURCE_FILES } from "./definition";
import { Generator } from "./generate";
import { MATRIX, RELATION } from "./matrix";
import { checkTrace, Projection, validateHistoryDomain } from "./oracle";
import type { Authority } from "./readmit";
import { parseHistory, parseTrace, type History, type Trace } from "./schema";
import { shrink } from "./shrink";
import { SYNTHETIC_FIXTURES } from "./synthetic-fixtures";

export function syntheticTrace(history: History, runtime: Trace["runtime"]): Trace {
  const model = new Projection(SYNTHETIC_FIXTURES, runtime), initial = model.snapshot();
  const steps = history.commands.map(command => model.predictedStep(command));
  const trace = parseTrace({ contract: "algal.application-trace.v1", runtime, historyDigest: hashJson(history), fixtures: SYNTHETIC_FIXTURES, initial, steps }, history);
  checkTrace(history, trace); return trace;
}
export function syntheticGenerated(selected: typeof MATRIX[number]): { history: History; trace: Trace; witnesses: string[] } {
  const generator = new Generator(selected.seed, selected.profile), model = new Projection(SYNTHETIC_FIXTURES), initial = model.snapshot();
  const history: History = { contract: "algal.application-history.v1", generator: "state-selected-v1", ...selected, commands: [] }, steps = [];
  for (let id = 0; id < LIMITS.historyCommands; id++) {
    const command = generator.next(id, model.snapshot(), SYNTHETIC_FIXTURES.memories), row = model.predictedStep(command);
    history.commands.push(command); steps.push(row); generator.observe(command, row);
  }
  parseHistory(history);
  const trace = parseTrace({ contract: "algal.application-trace.v1", runtime: "bun", historyDigest: hashJson(history), fixtures: SYNTHETIC_FIXTURES, initial, steps }, history);
  return { history, trace, ...checkTrace(history, trace) };
}
/** Owns only caller-created fixture children; even the executable is a never-run canary. */
export async function syntheticArchive(root: string): Promise<{ archive: string; authority: Authority; source: { repositoryRoot: string; referenceRoot: string }; marker: string }> {
  const archive = join(root, "archive"), repositoryRoot = join(root, "repository"), referenceRoot = join(repositoryRoot, "verify/reference/application"), marker = join(root, "EXECUTED");
  await mkdir(archive); await mkdir(referenceRoot, { recursive: true }); await mkdir(join(repositoryRoot, "scripts")); await mkdir(join(repositoryRoot, "src"));
  await writeFile(join(repositoryRoot, "scripts/verify.ts"), "// Synthetic source-identity fixture. Never executed.\n");
  await writeFile(join(repositoryRoot, "src/synthetic.ts"), "export const synthetic = true;\n");
  for (const path of SOURCE_FILES) await writeFile(join(referenceRoot, path), await readFile(join(import.meta.dir, path)));
  const executable = join(root, "never-execute.sh"), quote = (s: string) => "'" + s.replaceAll("'", "'\\''") + "'";
  await writeFile(executable, "#!/bin/sh\n: > " + quote(marker) + "\n", { mode: 0o700 }); await chmod(executable, 0o700);
  const artifact = await artifactIdentity(executable), definition = await historyDefinition(repositoryRoot, referenceRoot);
  const authority: Authority = { definitionDigest: hashJson(definition), artifacts: { bun: artifact, native: artifact }, referenceDirectory: referenceRoot, recordedArchive: archive };
  const writer = await ArchiveWriter.open(archive);
  async function command(path: string, argv: string[], header: unknown): Promise<void> {
    const limit = writer.budget.beginCommand(), stdout = JSON.stringify(header) + "\n";
    if (utf8Size(stdout) > limit) throw new Error("Synthetic command exceeds capture budget");
    writer.budget.capture(utf8Size(stdout));
    await writer.json(path, { command: argv, exitCode: 0, signal: null, timedOut: false, outputExceeded: false, cleanupObserved: true, stdout, stderr: "" });
  }
  async function native(history: History, prefix: string, label: string, input: string): Promise<Trace> {
    const trace = syntheticTrace(history, "native"), bytes = encodeRecord(trace, LIMITS.packetBytes), historyBytes = stableJson(history) + "\n";
    await command(`${prefix}/${label}.command.json`, [artifact.path, "replay", join(archive, input), join(archive, prefix, `${label}.json`), join(archive, prefix, `${label}-root`)], { contract: "algal.native-history-worker.v1", historyInputSha256: hashBytes(historyBytes), historyInputBytes: utf8Size(historyBytes), commands: history.commands.length, traceBytes: utf8Size(bytes) });
    await writer.bytes(`${prefix}/${label}.json`, bytes); return trace;
  }
  await writer.json("start.json", { contract: "algal.application-history-slice-start.v1", authority, definition, matrix: MATRIX, mutants: MUTANTS, limits: LIMITS });
  const cases = []; let first: { history: History; trace: Trace } | undefined;
  for (const [index, selected] of MATRIX.entries()) {
    const prefix = `case-${index}`, directory = join(archive, prefix), generated = syntheticGenerated(selected), worker = join(referenceRoot, "worker.ts"); await writer.directory(prefix);
    await command(`${prefix}/generate.command.json`, [artifact.path, worker, "generate", `${selected.seed}:${selected.profile}`, join(directory, "generated.json"), join(directory, "generate-root")], { mode: "generate", ...selected, commands: generated.history.commands.length, witnesses: generated.witnesses.length });
    await writer.json(`${prefix}/generated.json`, generated); await writer.bytes(`${prefix}/history.json`, encodeRecord(generated.history, LIMITS.historyBytes));
    await command(`${prefix}/bun.command.json`, [artifact.path, worker, "replay", join(directory, "history.json"), join(directory, "bun.json"), join(directory, "bun-root")], { mode: "replay", commands: generated.history.commands.length, witnesses: generated.witnesses.length });
    await writer.json(`${prefix}/bun.json`, { ...generated, trace: syntheticTrace(generated.history, "bun") });
    const trace = await native(generated.history, prefix, "native-a", `${prefix}/history.json`); await native(generated.history, prefix, "native-b", `${prefix}/history.json`);
    const row = { ...selected, commands: LIMITS.historyCommands, witnesses: generated.witnesses, workers: 4 }; await writer.json(`${prefix}/result.json`, row); cases.push(row);
    if (index === 0) first = { history: generated.history, trace };
  }
  if (!first) throw new Error("Synthetic first history absent");
  const controls = [];
  for (const [index, mutant] of MUTANTS.entries()) {
    const prefix = `control-${index}`; await writer.directory(prefix); let workers = 0;
    const result = await shrink(first.history, async history => {
      validateHistoryDomain(history, first!.trace.fixtures);
      const attempt = `${prefix}/attempt-${workers++}`, input = `${attempt}/history.json`; await writer.directory(attempt);
      await writer.bytes(input, encodeRecord(history, LIMITS.historyBytes)); const trace = await native(history, attempt, "native", input);
      checkTrace(history, parseTrace(mutate(history, trace, mutant), history));
    }, LIMITS.shrinkAttempts);
    await writer.json(`${prefix}/result.json`, { mutant, ...result }); controls.push({ mutant, workers, result });
  }
  await writer.json("result.json", { contract: "algal.application-history-slice-result.v1", status: "passed", formalClaims: 0, relation: RELATION, ...authority, limits: LIMITS, cases, controls, targetWorkers: writer.budget.targetCommands, capturedOutputBytes: writer.budget.capturedOutputBytes, archiveBytesBeforeSummary: writer.budget.archiveBytes, retained: [...writer.retained] });
  await writer.stable(); return { archive, authority, source: { repositoryRoot, referenceRoot }, marker };
}
