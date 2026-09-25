/** Offline bounded admission: archive data never selects a subprocess or external path. */
import { isAbsolute, join } from "node:path";
import { hashBytes, hashJson, readFileBounded, stableJson } from "../../lib/files";
import { record, relativePath, requireThat } from "../../lib/schema";
import { artifactIdentity, type Artifact } from "../../traces/native";
import { parseCanonical, requireInventory, type Retained } from "./archive";
import { CaptureBudget, LIMITS, utf8Size } from "./bounded";
import { requireBaseline } from "./baseline";
import { admitBun, admitCommand, admitNative, requireSharedAgreement } from "./commands";
import { MUTANTS, mutate } from "./controls";
import { historyDefinition, SOURCE_FILES } from "./definition";
import { checkGenerated, requireCoverage } from "./generate";
import { ATTEMPT_FILES, CASE_FILES, MATRIX, RELATION } from "./matrix";
import { checkTrace, validateHistoryDomain } from "./oracle";
import { parseHistory, parseTrace, type History, type Trace } from "./schema";
import { shrink } from "./shrink";

export type Authority = { definitionDigest: string; artifacts: { bun: Artifact; native: Artifact }; referenceDirectory: string; recordedArchive: string };
export type Admission = { contract: "algal.application-history-slice-readmission.v1"; status: "admitted"; sourceStatus: "historical-externally-pinned" | "current-source-rehashed"; formalClaims: 0; definitionDigest: string; summarySha256: string; histories: 4; baselineWorkers: 16; baselineCommandObservations: 384; mutants: 5; targetWorkers: number; capturedOutputBytes: number; archiveBytes: number; retained: Retained[] };
const equal = (a: unknown, b: unknown, why: string) => requireThat(stableJson(a) === stableJson(b), `Application history readmission: ${why}`);
function noControls(path: string): boolean { for (let i = 0; i < path.length; i++) if (path.charCodeAt(i) < 32) return false; return true; }
function absolute(path: unknown): asserts path is string {
  requireThat(typeof path === "string" && path.length <= 4096 && utf8Size(path) <= 4096 && isAbsolute(path) && noControls(path), "authorized absolute history path");
}
function authorize(value: Authority): Authority {
  record(value, ["definitionDigest", "artifacts", "referenceDirectory", "recordedArchive"], "history authority");
  requireThat(/^sha256:[0-9a-f]{64}$/.test(value.definitionDigest), "history definition digest");
  absolute(value.referenceDirectory); absolute(value.recordedArchive);
  record(value.artifacts, ["bun", "native"], "history artifacts");
  for (const artifact of Object.values(value.artifacts)) {
    record(artifact, ["path", "sha256", "bytes"], "history artifact"); absolute(artifact.path);
    requireThat(/^sha256:[0-9a-f]{64}$/.test(artifact.sha256) && Number.isSafeInteger(artifact.bytes) && artifact.bytes > 0 && artifact.bytes <= 536_870_912, "history artifact shape");
  }
  return structuredClone(value);
}
/** Historical consistency under independent caller identity; no current-source claim. */
export async function readmitHistorical(archive: string, selected: Authority): Promise<Admission> {
  absolute(archive); const authority = authorize(selected), budget = new CaptureBudget(), retained: Retained[] = [];
  const summaryBytes = await readFileBounded(archive, "result.json", LIMITS.recordBytes);
  const summary = record(parseCanonical(summaryBytes), ["contract", "status", "formalClaims", "relation", "definitionDigest", "artifacts", "referenceDirectory", "recordedArchive", "limits", "cases", "controls", "targetWorkers", "capturedOutputBytes", "archiveBytesBeforeSummary", "retained"], "history result");
  equal(summary.contract, "algal.application-history-slice-result.v1", "result contract");
  equal(summary.status, "passed", "result status"); equal(summary.formalClaims, 0, "formal claim scope"); equal(summary.relation, RELATION, "relation scope");
  for (const key of ["definitionDigest", "artifacts", "referenceDirectory", "recordedArchive"] as const) equal(summary[key], authority[key], `authorized ${key}`);
  equal(summary.limits, LIMITS, "resource contract");
  requireThat(Array.isArray(summary.cases) && summary.cases.length === MATRIX.length && Array.isArray(summary.controls) && summary.controls.length === MUTANTS.length, "history complete fixed matrix");
  const counts = summary.controls.map((raw, index) => {
    const row = record(raw, ["mutant", "workers", "result"], "history control row"); equal(row.mutant, MUTANTS[index], "control identity/order");
    requireThat(Number.isSafeInteger(row.workers) && Number(row.workers) >= 2 && Number(row.workers) <= LIMITS.shrinkAttempts + 2, "shrink worker count"); return Number(row.workers);
  });
  const paths = ["start.json", "result.json", ...MATRIX.flatMap((_, i) => CASE_FILES.map(name => `case-${i}/${name}`)),
    ...MUTANTS.flatMap((_, i) => [`control-${i}/result.json`, ...Array.from({ length: counts[i]! }, (_, n) => ATTEMPT_FILES.map(name => `control-${i}/attempt-${n}/${name}`)).flat()])];
  await requireInventory(archive, paths);
  async function bytes(path: string, max: number = LIMITS.recordBytes): Promise<Uint8Array> {
    const raw = await readFileBounded(archive, path, Math.min(max, budget.remainingRecordLimit()));
    budget.reserveFile(raw.byteLength); retained.push({ path, sha256: hashBytes(raw), bytes: raw.byteLength }); return raw;
  }
  async function json(path: string, max: number = LIMITS.recordBytes): Promise<unknown> { return parseCanonical(await bytes(path, max)); }
  const start = record(await json("start.json"), ["contract", "authority", "definition", "matrix", "mutants", "limits"], "history start");
  equal(start.contract, "algal.application-history-slice-start.v1", "start contract"); equal(start.authority, authority, "start authority"); equal(start.matrix, MATRIX, "fixed matrix"); equal(start.mutants, MUTANTS, "fixed mutants"); equal(start.limits, LIMITS, "start limits");
  const definition = record(start.definition, ["repository", "reference"], "history definition");
  for (const [key, list] of Object.entries(definition)) {
    requireThat(Array.isArray(list) && list.length > 0 && list.length <= 20_000, "history source inventory count");
    const names: string[] = [];
    for (const item of list) {
      const row = record(item, ["path", "sha256"], "history source binding");
      requireThat(typeof row.path === "string" && typeof row.sha256 === "string" && /^sha256:[0-9a-f]{64}$/.test(row.sha256), "history source binding shape"); relativePath(row.path, "history source path"); names.push(row.path);
    }
    requireThat(new Set(names).size === names.length, "history source path duplicates");
    equal(names, key === "reference" ? SOURCE_FILES : [...names].sort(), "history source inventory order");
  }
  equal(hashJson(definition), authority.definitionDigest, "externally pinned source definition");
  async function command(path: string, argv: string[]): Promise<string> {
    const limit = budget.beginCommand(), stdout = admitCommand(await json(path), argv, limit);
    budget.capture(utf8Size(stdout)); return stdout;
  }
  let first: { history: History; trace: Trace } | undefined;
  const caseRows: unknown[] = [];
  for (const [index, selectedCase] of MATRIX.entries()) {
    const prefix = `case-${index}`, directory = join(authority.recordedArchive, prefix), worker = join(authority.referenceDirectory, "worker.ts");
    const generateOutput = await command(`${prefix}/generate.command.json`, [authority.artifacts.bun.path, worker, "generate", `${selectedCase.seed}:${selectedCase.profile}`, join(directory, "generated.json"), join(directory, "generate-root")]);
    const generated = admitBun(await json(`${prefix}/generated.json`, LIMITS.packetBytes), generateOutput, { mode: "generate", ...selectedCase });
    const history = parseHistory(await json(`${prefix}/history.json`, LIMITS.historyBytes)); equal(history, generated.history, "exact generated history input");
    const replayOutput = await command(`${prefix}/bun.command.json`, [authority.artifacts.bun.path, worker, "replay", join(directory, "history.json"), join(directory, "bun.json"), join(directory, "bun-root")]);
    const replayed = admitBun(await json(`${prefix}/bun.json`, LIMITS.packetBytes), replayOutput, { mode: "replay", history });
    const natives: Trace[] = [];
    for (const label of ["native-a", "native-b"]) {
      const stdout = await command(`${prefix}/${label}.command.json`, [authority.artifacts.native.path, "replay", join(directory, "history.json"), join(directory, `${label}.json`), join(directory, `${label}-root`)]);
      const raw = await bytes(`${prefix}/${label}.json`, LIMITS.packetBytes), trace = admitNative(history, parseCanonical(raw), stdout, raw.byteLength);
      checkGenerated(history, trace); requireCoverage(checkTrace(history, trace).witnesses, history.profile); natives.push(trace);
    }
    requireSharedAgreement([generated.trace, replayed.trace, ...natives]);
    const expected = { ...selectedCase, commands: LIMITS.historyCommands, witnesses: generated.witnesses, workers: 4 };
    equal(await json(`${prefix}/result.json`), expected, "case reconstructed result"); caseRows.push(expected);
    if (index === 0) first = { history, trace: natives[0]! };
  }
  requireThat(first !== undefined, "nonempty history matrix");
  const controlRows: unknown[] = [];
  for (const [index, mutant] of MUTANTS.entries()) {
    let consumed = 0;
    const result = await shrink(first.history, async history => {
      validateHistoryDomain(history, first!.trace.fixtures);
      const trace = await requireBaseline(async () => {
        requireThat(consumed < counts[index]!, "missing ordered shrink attempt");
        const prefix = `control-${index}/attempt-${consumed++}`, directory = join(authority.recordedArchive, prefix);
        equal(await json(`${prefix}/history.json`, LIMITS.historyBytes), history, "algorithm-selected shrink input");
        const stdout = await command(`${prefix}/native.command.json`, [authority.artifacts.native.path, "replay", join(directory, "history.json"), join(directory, "native.json"), join(directory, "native-root")]);
        const raw = await bytes(`${prefix}/native.json`, LIMITS.packetBytes);
        return admitNative(history, parseCanonical(raw), stdout, raw.byteLength);
      });
      checkTrace(history, parseTrace(mutate(history, trace, mutant), history));
    }, LIMITS.shrinkAttempts);
    requireThat(consumed === counts[index], "unused/extra shrink attempt");
    equal(await json(`control-${index}/result.json`), { mutant, ...result }, "recomputed semantic shrink result");
    controlRows.push({ mutant, workers: consumed, result });
  }
  equal(summary.cases, caseRows, "complete case rows"); equal(summary.controls, controlRows, "complete shrink rows");
  equal(summary.targetWorkers, budget.targetCommands, "target count"); equal(summary.capturedOutputBytes, budget.capturedOutputBytes, "capture accounting");
  equal(summary.archiveBytesBeforeSummary, budget.archiveBytes, "archive byte accounting"); equal(summary.retained, retained, "exact retained inventory");
  budget.reserveFile(summaryBytes.byteLength); retained.push({ path: "result.json", sha256: hashBytes(summaryBytes), bytes: summaryBytes.byteLength });
  for (const item of retained) {
    const raw = await readFileBounded(archive, item.path, Math.max(1, item.bytes));
    requireThat(raw.byteLength === item.bytes && hashBytes(raw) === item.sha256, "raw archive changed during admission");
  }
  await requireInventory(archive, paths);
  return { contract: "algal.application-history-slice-readmission.v1", status: "admitted", sourceStatus: "historical-externally-pinned", formalClaims: 0, definitionDigest: authority.definitionDigest, summarySha256: hashBytes(summaryBytes), histories: 4, baselineWorkers: 16, baselineCommandObservations: 384, mutants: 5, targetWorkers: budget.targetCommands, capturedOutputBytes: budget.capturedOutputBytes, archiveBytes: budget.archiveBytes, retained };
}
export async function readmitCurrent(archive: string, selected: Authority, source: { repositoryRoot: string; referenceRoot: string }): Promise<Admission> {
  absolute(source.repositoryRoot); absolute(source.referenceRoot); const authority = authorize(selected);
  async function rehash(): Promise<void> {
    equal(hashJson(await historyDefinition(source.repositoryRoot, source.referenceRoot)), authority.definitionDigest, "current source closure");
    for (const artifact of Object.values(authority.artifacts)) equal(await artifactIdentity(artifact.path), artifact, "current executable bytes");
  }
  await rehash(); const result = await readmitHistorical(archive, authority); await rehash();
  return { ...result, sourceStatus: "current-source-rehashed" };
}
