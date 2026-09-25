/** Offline admission only. Never executes targets and never reads a path chosen by archive metadata. */
import { join } from "node:path";
import { readdir } from "node:fs/promises";
import { artifactIdentity, type Artifact } from "../traces/native";
import { hashBytes, hashJson, readFileBounded, stableJson } from "../lib/files";
import { catalog, SEEDS } from "./generate";
import { expected, inputBytes, LIMITS, parseCase, VERSION, type Case } from "./schema";
import { admitWorker, compare, requireAbsolutePath as absolute, requireCommandArgv, utf8Size } from "./run";
import { Mismatch } from "./shrink";

import { corpusDefinition, SOURCE_FILES } from "./definition";
const RELATION = "finite independent value/error oracle and sampled expression target/wrapper agreement; build provenance separately required";
const decoder = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });
type Dict = Record<string, unknown>;
type Profile = "local" | "native" | "full";
type Artifacts = { bun: Artifact; committed: Artifact; native: Artifact | null; rebuilt: Artifact | null };
export type Authority = {
  definitionDigest: string;
  artifacts: Artifacts;
  candidateDirectory: string;
  recordedArchive: string;
  options: { profile: Profile; native?: string; rebuilt?: string; replay?: string };
  replayCase?: Case;
};
export type Admission = { contract: "algal.corpus-readmission.v1"; status: "admitted"; sourceStatus: "historical-externally-pinned" | "current-source-rehashed";
  formalClaims: 0; definitionDigest: string; summarySha256: string; caseCount: number; invocations: number; observations: number; capturedOutputBytes: number; archiveBytes: number; retainedFiles: number };
function require_(condition: unknown, why: string): asserts condition { if (!condition) throw new Error(`Corpus readmission: ${why}`); }
function object(value: unknown, keys: string[], label: string): Dict {
  require_(value !== null && typeof value === "object" && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype, `${label} object`);
  require_(Object.keys(value).sort().join("\0") === [...keys].sort().join("\0"), `${label} closed fields`);
  return value as Dict;
}
function equal(actual: unknown, wanted: unknown, label: string): void { require_(stableJson(actual) === stableJson(wanted), `${label} differs`); }
function sha(value: unknown): asserts value is string { require_(typeof value === "string" && /^sha256:[0-9a-f]{64}$/.test(value), "digest shape"); }
function noControls(value: string): boolean { for (let i = 0; i < value.length; i++) if (value.charCodeAt(i) < 32) return false; return true; }
function relative(value: unknown): asserts value is string {
  require_(typeof value === "string" && value.length > 0 && value.length <= 4096 && !value.includes("\\") && noControls(value)
    && value.split("/").every(part => part !== "" && part !== "." && part !== ".."), "relative path");
}
function bindings(value: unknown, candidate: boolean): void {
  require_(Array.isArray(value) && value.length > 0 && value.length <= 20_000, "source binding count");
  const paths: string[] = [];
  for (const item of value) { const row = object(item, ["path", "sha256"], "source binding"); relative(row.path); sha(row.sha256); paths.push(row.path); }
  require_(new Set(paths).size === paths.length, "duplicate source binding");
  if (candidate) equal(paths, SOURCE_FILES, "candidate source inventory");
  else equal(paths, [...paths].sort(), "repository source order");
}
function artifacts(value: unknown): asserts value is Artifacts {
  const all = object(value, ["bun", "committed", "native", "rebuilt"], "artifacts");
  for (const name of ["bun", "committed", "native", "rebuilt"]) {
    if ((name === "native" || name === "rebuilt") && all[name] === null) continue;
    const item = object(all[name], ["path", "sha256", "bytes"], "artifact"); absolute(item.path); sha(item.sha256);
    require_(Number.isSafeInteger(item.bytes) && Number(item.bytes) > 0 && Number(item.bytes) <= (name.endsWith("built") || name === "committed" ? 16_777_216 : 536_870_912), "artifact byte bound");
  }
}
function authority(input: Authority): Authority {
  object(input, ["definitionDigest", "artifacts", "candidateDirectory", "recordedArchive", "options", ...(Object.hasOwn(input, "replayCase") ? ["replayCase"] : [])], "authority");
  sha(input.definitionDigest); artifacts(input.artifacts); absolute(input.candidateDirectory); absolute(input.recordedArchive);
  const o = input.options;
  object(o, ["profile", ...(Object.hasOwn(o, "native") ? ["native"] : []), ...(Object.hasOwn(o, "rebuilt") ? ["rebuilt"] : []), ...(Object.hasOwn(o, "replay") ? ["replay"] : [])], "options");
  require_(["local", "native", "full"].includes(o.profile), "profile");
  require_((o.profile === "local") === (input.artifacts.native === null) && (o.profile === "full") === (input.artifacts.rebuilt !== null), "profile target inventory");
  if (input.artifacts.native) { absolute(o.native); equal(o.native, input.artifacts.native.path, "authorized native path"); } else require_(o.native === undefined, "unexpected native option");
  if (input.artifacts.rebuilt) { absolute(o.rebuilt); equal(o.rebuilt, input.artifacts.rebuilt.path, "authorized rebuilt path"); } else require_(o.rebuilt === undefined, "unexpected rebuilt option");
  if (Object.hasOwn(input, "replayCase")) { parseCase(input.replayCase); absolute(o.replay); }
  else require_(o.replay === undefined, "replay requires independently authorized concrete case");
  return structuredClone(input);
}
/** Historical byte/identity consistency under caller authority. This does not rehash today's source tree. */
export async function readmitHistorical(archiveRoot: string, authorized: Authority): Promise<Admission> {
  absolute(archiveRoot);
  const a = authority(authorized), cases = a.replayCase ? [parseCase(a.replayCase)] : catalog();
  // Exact two-level inventory; Bun's directory-name prefetch is a documented
  // runtime allocation premise, not an allocation bound supplied by this loop.
  async function inventory(): Promise<void> {
    const rootEntries = await readdir(archiveRoot, { withFileTypes: true });
    require_(rootEntries.length === cases.length + 2, "unexpected physical archive entries");
    const directories = new Set(cases.map((_, index) => `case-${index}`));
    for (const entry of rootEntries) {
      if (entry.name === "start.json" || entry.name === "result.json") require_(entry.isFile(), "nonregular archive metadata");
      else require_(directories.has(entry.name) && entry.isDirectory(), "unknown/nonregular archive directory");
    }
    const names = ["case.json", "input.bin", "result.json", "committed-wasm.command.json", ...(a.artifacts.native ? ["native.command.json"] : []), ...(a.artifacts.rebuilt ? ["rebuilt-wasm.command.json"] : [])].sort();
    for (const directory of directories) {
      const entries = await readdir(join(archiveRoot, directory), { withFileTypes: true });
      require_(entries.length === names.length && entries.every(entry => entry.isFile()), "unexpected/nonregular case entries");
      equal(entries.map(entry => entry.name).sort(), names, "exact physical case inventory");
    }
  }
  await inventory();
  let archiveBytes = 0, capturedOutputBytes = 0, invocations = 0, observations = 0;
  const retained: { path: string; sha256: string }[] = [];
  async function bytes(path: string, max: number = LIMITS.recordBytes, retain = true): Promise<Uint8Array> {
    relative(path);
    const remaining = LIMITS.archiveBytes - LIMITS.failureBytes - archiveBytes;
    require_(remaining > 0 && retained.length + 1 < LIMITS.retainedFiles, "archive aggregate capacity");
    const value = await readFileBounded(archiveRoot, path, Math.min(max, remaining));
    archiveBytes += value.byteLength;
    if (retain) retained.push({ path, sha256: hashBytes(value) });
    return value;
  }
  async function json(path: string, retain = true): Promise<{ value: unknown; bytes: Uint8Array }> {
    const raw = await bytes(path, LIMITS.recordBytes, retain), text = decoder.decode(raw);
    require_(!text.startsWith("\ufeff"), "metadata BOM");
    const value: unknown = JSON.parse(text);
    require_(stableJson(value) + "\n" === text, "noncanonical/duplicate metadata encoding");
    return { value, bytes: raw };
  }
  const summaryRaw = await json("result.json", false), summary = object(summaryRaw.value, ["contract", "profile", "status", "formalClaims", "relation", "definitionDigest", "artifacts", "inventoryDigest", "caseCount", "grammarCount", "rawCount", "invocations", "archive", "archiveBytesBeforeSummary", "capturedOutputBytes", "limits", "rows", "retained"], "summary");
  require_(summary.contract === "algal.corpus-expression-result.v1" && summary.status === "passed" && summary.formalClaims === 0 && summary.relation === RELATION, "summary claim/status");
  equal(summary.profile, a.options.profile, "summary profile"); equal(summary.definitionDigest, a.definitionDigest, "expected source identity");
  equal(summary.artifacts, a.artifacts, "expected artifacts"); equal(summary.archive, a.recordedArchive, "recorded stage"); equal(summary.limits, LIMITS, "resource limits");
  equal(summary.inventoryDigest, hashJson(cases), "expected inventory digest");
  require_(Array.isArray(summary.rows) && summary.rows.length === cases.length && Array.isArray(summary.retained) && summary.retained.length < LIMITS.retainedFiles, "summary bounded inventory");
  const start = object((await json("start.json")).value, ["contract", "version", "seeds", "limits", "options", "definition", "artifact", "cases"], "start");
  equal(start.contract, "algal.corpus-run-start.v1", "start contract"); equal(start.version, VERSION, "generator version"); equal(start.seeds, SEEDS, "seeds");
  equal(start.limits, LIMITS, "start limits"); equal(start.options, a.options, "authorized options"); equal(start.artifact, a.artifacts, "start artifacts"); equal(start.cases, cases, "regenerated cases");
  const definition = object(start.definition, ["repository", "candidate"], "definition"); bindings(definition.repository, false); bindings(definition.candidate, true);
  equal(hashJson(definition), a.definitionDigest, "externally pinned definition");
  async function command(path: string, argv: string[]): Promise<string> {
    requireCommandArgv(argv, "expected");
    const prefixBytes = archiveBytes - summaryRaw.bytes.byteLength;
    require_(prefixBytes + LIMITS.recordBytes <= LIMITS.archiveBytes - LIMITS.failureBytes && retained.length + 3 < LIMITS.retainedFiles, "command archive reservation");
    const capacity = Math.min(LIMITS.outputBytes, LIMITS.aggregateOutputBytes - capturedOutputBytes);
    require_(capacity > 0, "command capture capacity");
    const row = object((await json(path)).value, ["command", "exitCode", "signal", "timedOut", "outputExceeded", "cleanupObserved", "stdout", "stderr"], "command");
    requireCommandArgv(row.command, "recorded");
    equal(row.command, argv, "authorized command argv");
    require_(row.exitCode === 0 && row.signal === null && row.timedOut === false && row.outputExceeded === false && row.cleanupObserved === true, "failed command cannot be admitted");
    require_(typeof row.stdout === "string" && row.stderr === "", "command output/diagnostics");
    const captured = utf8Size(row.stdout);
    require_(captured <= capacity, "command output exceeds remaining capture allowance");
    capturedOutputBytes += captured; invocations++;
    require_(row.stdout.endsWith("\n"), "terminal output framing");
    return row.stdout;
  }
  const rows: unknown[] = [];
  for (let index = 0; index < cases.length; index++) {
    const c = cases[index]!, label = `case-${index}`, stage = join(a.recordedArchive, label), input = inputBytes(c);
    equal((await json(`${label}/case.json`)).value, c, "concrete case");
    const raw = await bytes(`${label}/input.bin`, LIMITS.inputBytes);
    require_(raw.byteLength === input.byteLength && hashBytes(raw) === hashBytes(input), "exact regenerated input bytes");
    const outputs: Record<string, string> = {};
    for (const [target, artifact, mode] of [["committed-wasm", a.artifacts.committed, "both"], ...(a.artifacts.rebuilt ? [["rebuilt-wasm", a.artifacts.rebuilt, "raw"]] : [])] as const) {
      const binary = artifact as Artifact;
      const output = await command(`${label}/${target}.command.json`, [a.artifacts.bun.path, join(a.candidateDirectory, "worker.ts"), join(stage, "case.json"), binary.path, mode as string]);
      const value: unknown = JSON.parse(output);
      require_(JSON.stringify(value) + "\n" === output, "worker exact one-line framing");
      const admitted = admitWorker(c, value, binary.sha256, mode === "both", target as string);
      outputs[target as string] = admitted.raw; observations++;
      if (mode === "both" && c.domain === "grammar") { outputs["bun-wrapper"] = JSON.stringify(admitted.bun); observations++; }
    }
    if (a.artifacts.native) {
      const output = await command(`${label}/native.command.json`, [a.artifacts.native.path, "eval", join(stage, "input.bin")]);
      outputs.native = output.slice(0, -1); compare(c, outputs.native, "native"); observations++;
    }
    for (const target of ["native", "rebuilt-wasm"]) if (outputs[target] !== undefined && outputs[target] !== outputs["committed-wasm"])
      throw new Mismatch("full-byte-response", c.id, target, "full raw result/fuel bytes differ from committed WASM");
    const result = await json(`${label}/result.json`);
    equal(result.value, { id: c.id, domain: c.domain, inputSha256: hashBytes(input), expected: expected(c), targets: Object.keys(outputs), outputs }, "independently reconstructed case result");
    rows.push({ id: c.id, domain: c.domain, inputSha256: hashBytes(input), result: { path: `${label}/result.json`, sha256: hashBytes(result.bytes) } });
  }
  equal(summary.rows, rows, "complete ordered rows"); equal(summary.retained, retained, "complete ordered raw inventory");
  equal(summary.caseCount, cases.length, "case count"); equal(summary.grammarCount, cases.filter(c => c.domain === "grammar").length, "grammar count");
  equal(summary.rawCount, cases.filter(c => c.domain === "raw").length, "raw count"); equal(summary.invocations, invocations, "command count");
  equal(summary.capturedOutputBytes, capturedOutputBytes, "capture accounting"); equal(summary.archiveBytesBeforeSummary, archiveBytes - summaryRaw.bytes.byteLength, "archive byte accounting");
  await inventory();
  return { contract: "algal.corpus-readmission.v1", status: "admitted", sourceStatus: "historical-externally-pinned", formalClaims: 0, definitionDigest: a.definitionDigest,
    summarySha256: hashBytes(summaryRaw.bytes), caseCount: cases.length, invocations, observations, capturedOutputBytes, archiveBytes, retainedFiles: retained.length + 1 };
}
/** Current applicability adds source and artifact rehashes before/after offline inspection.
 * Only caller-selected roots and artifacts are read; archive paths are never followed. */
export async function readmitCurrent(archiveRoot: string, authorized: Authority, source: { repositoryRoot: string; candidateRoot: string }): Promise<Admission> {
  absolute(source.repositoryRoot); absolute(source.candidateRoot);
  const a = authority(authorized);
  async function rehash() {
    const definition = await corpusDefinition(source.repositoryRoot, source.candidateRoot);
    equal(hashJson(definition), a.definitionDigest, "current source closure");
    for (const item of Object.values(a.artifacts)) if (item) equal(await artifactIdentity(item.path), item, "current artifact bytes");
  }
  await rehash();
  const result = await readmitHistorical(archiveRoot, a);
  await rehash();
  return { ...result, sourceStatus: "current-source-rehashed" };
}
