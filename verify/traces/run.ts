import { commandFailureRecord, retainFailure } from "../lib/failure";
import { mkdir, mkdtemp, readdir, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { isAbsolute, join, resolve } from "node:path";
import { governedPaths, hashBytes, hashFile, hashJson, readFileBounded, stableJson, type FileBinding } from "../lib/files";
import { array, digest, natural, record, requireThat, string } from "../lib/schema";
import { CommandFailure, requireSuccess, runCommand, type CommandResult } from "../lib/runner";
import { checkTrace, compareTraces, TraceMismatch } from "./check";
import { GENERATOR_VERSION, checkGeneratedHistory } from "./generate";
import { admitNativeCommand, artifactIdentity, readTrace, replayNative, type Artifact } from "./native";
import { LIMITS, parseHistory, type History, type Trace } from "./schema";
import { shrinkHistory } from "./shrink";
import { workerSummary } from "./worker";

const LOCAL_FIXTURES = ["store", "mailbox", "application", "corruption", "uncertainty", "numeric-unicode-keys", "mailbox-uncertainty"] as const;
const NATIVE_FIXTURES = ["retained-cache-corruption", "retained-cache-removal", "hegel-first-wins-negative"] as const;
const RELATION = "bounded real-API histories and sampled trace conformance; no universal implementation refinement or physical power-loss claim";
const REQUIRED_WITNESSES = ["store-put", "store-get", "effect-put", "effect-get", "slot-set", "slot-get", "mailbox-create", "mailbox-send", "mailbox-receive", "mailbox-pending", "mailbox-revoke", "application-create", "application-commit", "application-inspect", "restart", "tamper",
  "error:CAPABILITY_DENIED", "error:DIGEST_MISMATCH", "error:EFFECT_SUSPENDED", "error:IO_FAILED", "error:MAILBOX_FULL", "error:PARSE_FAILED", "error:RECEIPT_MISMATCH",
  "injected-cancel-cut:application", "injected-cancel-cut:fs", "injected-error-cut:application", "injected-error-cut:fs", "cut:application:selected", "cut:application:admitted", "cut:application:prepared", "cut:application:head-published"];
const ADAPTERS = ["verify/lib/files.ts", "verify/lib/schema.ts", "verify/lib/runner.ts", "verify/lib/failure.ts", "verify/lib/command-supervisor.ts"];
type RawBinding = { path: string; sha256: string };
type Row = { id: string; source: string | null; seed: number; commands: number; history: RawBinding; bun: RawBinding; bunCommand: RawBinding; native: RawBinding; command: RawBinding; witnesses: string[] };
export type TraceRun = { contract: "algal.verification-trace-run.v1"; relation: string; generator: string; bounds: typeof LIMITS; definition: { sha256: string; sources: FileBinding[] }; archive: string; runtime: { bun: Artifact; native: Artifact; platform: string; arch: string }; rows: Row[]; histories: number; commands: number; witnesses: string[] };
function fixtureInventory(): { id: string; source: string }[] {
  return [...LOCAL_FIXTURES.map(name => ({ id: `fixture-${name}`, source: `verify/traces/fixtures/${name}.json` })),
    ...NATIVE_FIXTURES.map(name => ({ id: `native-${name}`, source: `crates/algal/tests/fixtures/verification_trace/${name}.json` }))];
}
/** Stable definition never includes this run's result or mutable claim registry. */
export async function traceDefinition(root: string): Promise<TraceRun["definition"]> {
  const paths = (await governedPaths(root)).filter(path => path.startsWith("src/") || path.startsWith("crates/algal/src/") || path.startsWith("crates/algal-expr/src/")
    || path.startsWith("crates/algal/tests/fixtures/verification_trace/") || ["Cargo.toml", "Cargo.lock", "crates/algal/Cargo.toml", "package.json", "bun.lock", "bun.lockb", "tsconfig.json", "spec/v1/organism.md", "spec/v1/application.md", "spec/v1/process.md"].includes(path));
  async function walk(path: string): Promise<void> {
    for (const entry of await readdir(join(root, path), { withFileTypes: true })) {
      const child = `${path}/${entry.name}`;
      if (entry.isDirectory()) await walk(child);
      else { requireThat(entry.isFile(), "nonregular trace definition input"); paths.push(child); }
    }
  }
  await walk("verify/traces");
  paths.push(...ADAPTERS, "crates/algal/Cargo.toml", "crates/algal-expr/Cargo.toml");
  const sources: FileBinding[] = [];
  for (const path of [...new Set(paths)].sort()) sources.push({ path, sha256: await hashFile(root, path) });
  return { sha256: hashJson({ generator: GENERATOR_VERSION, bounds: LIMITS, relation: RELATION, fixtures: fixtureInventory(), requiredWitnesses: REQUIRED_WITNESSES, sources }), sources };
}
async function writeBound(directory: string, path: string, bytes: string): Promise<RawBinding> {
  requireThat(Buffer.byteLength(bytes) <= LIMITS.transcriptBytes, "retained trace artifact byte bound");
  await writeFile(join(directory, path), bytes, { flag: "wx", mode: 0o600 });
  return { path, sha256: hashBytes(bytes) };
}
async function readHistory(root: string, path: string): Promise<History> {
  const bytes = await readFileBounded(root, path, LIMITS.transcriptBytes);
  const text = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes);
  requireThat(!text.startsWith("\ufeff"), "history BOM");
  return parseHistory(JSON.parse(text));
}
export function admitBunCommand(result: CommandResult, mode: "generate" | "replay", history: History, trace: Trace): void {
  requireSuccess(result);
  requireThat(result.stdout === workerSummary(mode, history, trace) + "\n", "Bun trace worker omitted or altered its exact bounded completion record");
}
export async function runBunHistory(root: string, directory: string, input: History | number): Promise<{ history: History; trace: Trace; rawSha256: string }> {
  await mkdir(directory); await mkdir(join(directory, "state"));
  const mode = typeof input === "number" ? "generate" : "replay";
  if (typeof input !== "number") await writeBound(directory, "input.json", stableJson(input) + "\n");
  let result: CommandResult;
  try {
    result = await runCommand([process.execPath, join(root, "verify/traces/worker.ts"), mode, typeof input === "number" ? String(input) : join(directory, "input.json"), directory], root, { timeoutMs: 120_000, maxOutputBytes: LIMITS.transcriptBytes });
    await writeBound(directory, "command.json", stableJson(result) + "\n");
    if (result.exitCode !== 0 && result.cleanupObserved && !result.timedOut && !result.outputExceeded) {
      // A worker failure is not a semantic counterexample merely because its
      // diagnostic says so. Recheck the complete retained raw prefix ourselves.
      try {
        const history = await readHistory(directory, "history.json");
        checkTrace(history, (await readTrace(join(directory, "trace.json"), history)).trace);
      } catch (error) { if (error instanceof TraceMismatch) throw error; }
    }
    requireSuccess(result);
  } catch (error) {
    return await retainFailure(error, error instanceof CommandFailure ? [
      () => writeFile(join(directory, "stdout.bin"), error.rawStdout, { flag: "wx", mode: 0o600 }),
      () => writeFile(join(directory, "stderr.bin"), error.rawStderr, { flag: "wx", mode: 0o600 }),
      () => writeBound(directory, "custody-failure.json", stableJson(commandFailureRecord(error)) + "\n"),
    ] : []);
  }
  const history = await readHistory(directory, "history.json");
  requireThat(typeof input === "number" ? history.seed === input && history.commands.length === LIMITS.commands : stableJson(history) === stableJson(input), "Bun worker replayed a different history");
  const raw = await readTrace(join(directory, "trace.json"), history);
  admitBunCommand(result, mode, history, raw.trace);
  return { history, trace: raw.trace, rawSha256: hashBytes(raw.bytes) };
}
async function pair(root: string, archive: string, id: string, artifact: Artifact, input: History | number): Promise<Row> {
  const directory = join(archive, id);
  await mkdir(directory);
  const bun = await runBunHistory(root, join(directory, "bun"), input), history = bun.history;
  if (typeof input === "number") checkGeneratedHistory(history, bun.trace);
  const historyBinding = await writeBound(archive, `${id}/history.json`, stableJson(history) + "\n");
  const native = await replayNative(root, artifact, history, join(directory, "native"));
  const checked = compareTraces(history, bun.trace, native.trace);
  const witnesses = [...new Set([...checked.left.witnesses, ...checked.right.witnesses])].sort();
  // Completed command custody and semantic checks precede removal of owned
  // mutable state. All replay inputs, raw outputs and diagnostics remain.
  await rm(join(directory, "native/state"), { recursive: true, force: true });
  await rm(join(directory, "bun/state"), { recursive: true, force: true });
  return { id, source: null, seed: history.seed, commands: history.commands.length, history: historyBinding, bun: { path: `${id}/bun/trace.json`, sha256: bun.rawSha256 },
    bunCommand: { path: `${id}/bun/command.json`, sha256: await hashFile(archive, `${id}/bun/command.json`) },
    native: { path: `${id}/native/native.json`, sha256: native.rawSha256 }, command: { path: `${id}/native/command.json`, sha256: await hashFile(archive, `${id}/native/command.json`) }, witnesses };
}
async function retainTraceFailure(root: string, archive: string, artifact: Artifact, history: History, error: unknown, primary: Error): Promise<never> {
  const writers: (() => Promise<unknown>)[] = [() => writeFile(join(archive, "failure.json"), stableJson({ message: error instanceof Error ? error.message : String(error), history, property: error instanceof TraceMismatch ? error.property : null }) + "\n", { flag: "wx", mode: 0o600 })];
  if (error instanceof TraceMismatch) writers.push(async () => {
    let attempt = 0;
    try {
      const result = await shrinkHistory(history, async candidate => { await pair(root, archive, `shrink-${attempt++}`, artifact, candidate); }, 64);
      await writeFile(join(archive, "shrunk.json"), stableJson(result) + "\n", { flag: "wx", mode: 0o600 });
    } catch (shrinkError) {
      return await retainFailure(shrinkError, [() => writeFile(join(archive, "shrink-failure.json"), stableJson({ message: shrinkError instanceof Error ? shrinkError.message : String(shrinkError) }) + "\n", { flag: "wx", mode: 0o600 })]);
    }
  });
  return await retainFailure(primary, writers);
}
/** One owner executes all bounded histories. Hegel's separate native generator
 * is not rerun here. Output remains inspectable outside the repository. */
export async function runTraces(root: string, binary: string, outputDirectory?: string): Promise<TraceRun> {
  requireThat(isAbsolute(binary), "ALGAL_TRACE_TEST_BIN must be an explicit absolute built test artifact");
  if (outputDirectory) requireThat(isAbsolute(outputDirectory), "trace archive must be absolute");
  const archive = outputDirectory ?? await mkdtemp(join(tmpdir(), "algal-trace-run-"));
  if (outputDirectory) await mkdir(archive, { recursive: false });
  const physical = await realpath(archive), definition = await traceDefinition(root);
  const runtime = { bun: await artifactIdentity(process.execPath), native: await artifactIdentity(binary), platform: process.platform, arch: process.arch };
  await writeFile(join(physical, "start.json"), stableJson({ definition, runtime, generator: GENERATOR_VERSION, bounds: LIMITS }) + "\n", { flag: "wx", mode: 0o600 });
  const rows: Row[] = [];
  let current: History | undefined, currentId: string | undefined;
  try {
    for (const fixture of fixtureInventory()) {
      currentId = fixture.id; current = await readHistory(root, fixture.source);
      const row = await pair(root, physical, fixture.id, runtime.native, current); row.source = fixture.source; rows.push(row);
    }
    for (let seed = 1; seed <= LIMITS.histories; seed++) {
      currentId = `generated-${seed}`; current = undefined;
      rows.push(await pair(root, physical, currentId, runtime.native, seed));
    }
    requireThat(stableJson(definition) === stableJson(await traceDefinition(root)), "trace source definition changed during run");
    requireThat(stableJson(runtime.bun) === stableJson(await artifactIdentity(process.execPath)) && stableJson(runtime.native) === stableJson(await artifactIdentity(binary)), "trace runtime artifact changed during run");
    const result: TraceRun = { contract: "algal.verification-trace-run.v1", relation: RELATION, generator: GENERATOR_VERSION, bounds: LIMITS, definition, archive: physical, runtime, rows,
      histories: rows.length, commands: rows.reduce((n, row) => n + row.commands, 0), witnesses: [...new Set(rows.flatMap(row => row.witnesses))].sort() };
    await writeFile(join(physical, "result.json"), stableJson(result) + "\n", { flag: "wx", mode: 0o600 });
    await admitTraceRun(root, result);
    return result;
  } catch (error) {
    if (!current && currentId) try { current = await readHistory(physical, `${currentId}/bun/history.json`); } catch { /* incomplete generation remains infrastructure failure */ }
    const primary = new Error(`trace run rejected; raw evidence retained at ${physical}: ${error instanceof Error ? error.message : String(error)}`, { cause: error });
    if (current) return await retainTraceFailure(root, physical, runtime.native, current, error, primary);
    throw primary;
  }
}

function binding(raw: unknown, expected: string): RawBinding {
  const b = record(raw, ["path", "sha256"], "trace raw binding"); requireThat(b.path === expected, "trace raw artifact path differs");
  return { path: expected, sha256: digest(b.sha256, "trace raw hash") };
}
async function boundBytes(archive: string, bound: RawBinding): Promise<Uint8Array> {
  const bytes = await readFileBounded(archive, bound.path, LIMITS.transcriptBytes);
  requireThat(hashBytes(bytes) === bound.sha256, "raw trace artifact changed"); return bytes;
}
function json(bytes: Uint8Array): unknown {
  const text = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes); requireThat(!text.startsWith("\ufeff"), "raw trace artifact BOM"); return JSON.parse(text);
}
function commandResult(raw: unknown, expected: string[]): CommandResult {
  const c = record(raw, ["command", "exitCode", "signal", "timedOut", "outputExceeded", "cleanupObserved", "stdout", "stderr"], "trace execution");
  requireThat(stableJson(c.command) === stableJson(expected), "trace executed command differs");
  for (const key of ["stdout", "stderr"] as const) requireThat(typeof c[key] === "string" && Buffer.byteLength(c[key]) <= LIMITS.transcriptBytes, `trace ${key} byte/type bound`);
  requireThat(c.exitCode === 0 && c.signal === null && c.timedOut === false && c.outputExceeded === false && c.cleanupObserved === true, "trace command did not complete cleanly");
  return c as CommandResult;
}
/** Re-admission reads current sources/tools and all raw bytes; normalized pass
 * booleans or counts cannot replace a concrete native execution and trace. */
export async function admitTraceRun(root: string, raw: unknown): Promise<void> {
  const r = record(raw, ["contract", "relation", "generator", "bounds", "definition", "archive", "runtime", "rows", "histories", "commands", "witnesses"], "trace run");
  requireThat(r.contract === "algal.verification-trace-run.v1" && r.relation === RELATION && r.generator === GENERATOR_VERSION && stableJson(r.bounds) === stableJson(LIMITS), "trace contract/domain changed");
  requireThat(stableJson(r.definition) === stableJson(await traceDefinition(root)), "trace evidence source definition is stale");
  const archive = string(r.archive, "trace archive", 4096); requireThat(isAbsolute(archive) && await realpath(archive) === archive, "trace archive must name its physical absolute directory");
  const runtime = record(r.runtime, ["bun", "native", "platform", "arch"], "trace runtime");
  requireThat(runtime.platform === process.platform && runtime.arch === process.arch, "trace host profile changed");
  for (const kind of ["bun", "native"] as const) {
    const a = record(runtime[kind], ["path", "sha256", "bytes"], "trace artifact");
    const path = string(a.path, "trace artifact path", 4096); digest(a.sha256, "trace artifact digest"); natural(a.bytes, "trace artifact bytes");
    requireThat(stableJson(a) === stableJson(await artifactIdentity(path)), "trace artifact is stale");
    if (kind === "bun") requireThat(await realpath(process.execPath) === path, "trace admission Bun differs");
  }
  const nativePath = string((runtime.native as Artifact).path, "native artifact path", 4096);
  const bunPath = string((runtime.bun as Artifact).path, "Bun artifact path", 4096);
  const expected = [...fixtureInventory(), ...Array.from({ length: LIMITS.histories }, (_, i) => ({ id: `generated-${i + 1}`, source: null }))];
  const rows = array(r.rows, "trace rows", expected.length, expected.length);
  let commands = 0; const witnesses = new Set<string>();
  for (const [index, value] of rows.entries()) {
    const row = record(value, ["id", "source", "seed", "commands", "history", "bun", "bunCommand", "native", "command", "witnesses"], "trace row"), item = expected[index]!;
    requireThat(row.id === item.id && row.source === item.source, "trace history inventory mismatch");
    const h = parseHistory(json(await boundBytes(archive, binding(row.history, `${item.id}/history.json`))));
    requireThat(row.seed === h.seed && row.commands === h.commands.length, "trace history bounds/count mismatch");
    if (item.source) requireThat(stableJson(h) === stableJson(await readHistory(root, item.source)), "retained fixture changed");
    else requireThat(h.seed === index - fixtureInventory().length + 1 && h.commands.length === LIMITS.commands, "generated seed/length inventory mismatch");
    const bun = json(await boundBytes(archive, binding(row.bun, `${item.id}/bun/trace.json`)));
    const mode = item.source === null ? "generate" : "replay";
    const b = commandResult(json(await boundBytes(archive, binding(row.bunCommand, `${item.id}/bun/command.json`))),
      [bunPath, join(root, "verify/traces/worker.ts"), mode, item.source === null ? String(h.seed) : `${archive}/${item.id}/bun/input.json`, `${archive}/${item.id}/bun`]);
    requireThat(stableJson(await readHistory(archive, `${item.id}/bun/history.json`)) === stableJson(h), "Bun input/history differs from admitted history");
    if (item.source !== null) requireThat(stableJson(await readHistory(archive, `${item.id}/bun/input.json`)) === stableJson(h), "Bun replay input differs");
    const native = json(await boundBytes(archive, binding(row.native, `${item.id}/native/native.json`)));
    const command = json(await boundBytes(archive, binding(row.command, `${item.id}/native/command.json`)));
    const c = commandResult(command, ["/usr/bin/env", `ALGAL_TRACE_INPUT=${archive}/${item.id}/native/history.json`, `ALGAL_TRACE_OUTPUT=${archive}/${item.id}/native/native.json`, `ALGAL_TRACE_ROOT=${archive}/${item.id}/native/state`,
      nativePath, "verification_trace::replay_portable_history", "--exact", "--ignored", "--nocapture"]);
    // The native input is retained separately from the orchestration input.
    requireThat(stableJson(await readHistory(archive, `${item.id}/native/history.json`)) === stableJson(h), "native input differs from admitted history");
    admitNativeCommand(c);
    const checked = compareTraces(h, bun, native);
    admitBunCommand(b, mode, h, checked.left.trace);
    if (mode === "generate") checkGeneratedHistory(h, checked.left.trace);
    const actual = [...new Set([...checked.left.witnesses, ...checked.right.witnesses])].sort();
    requireThat(stableJson(row.witnesses) === stableJson(actual), "trace action witness set differs");
    actual.forEach(w => witnesses.add(w)); commands += h.commands.length;
  }
  requireThat(r.histories === expected.length && r.commands === commands && stableJson(r.witnesses) === stableJson([...witnesses].sort()), "trace aggregate coverage mismatch");
  requireThat(REQUIRED_WITNESSES.every(w => witnesses.has(w)), "trace corpus omitted a required reached action/rejection/checkpoint");
}

if (import.meta.main) {
  const root = resolve(import.meta.dir, "../.."), binary = process.env.ALGAL_TRACE_TEST_BIN;
  requireThat(binary !== undefined, "explicit ALGAL_TRACE_TEST_BIN is required; no native fallback");
  requireThat(process.argv.length <= 3, "usage: ALGAL_TRACE_TEST_BIN=/absolute/test-artifact bun verify/traces/run.ts [new-archive-directory]");
  console.log(stableJson(await runTraces(root, binary, process.argv[2])));
}
