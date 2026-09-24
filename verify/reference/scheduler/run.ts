/** Qualification adapter. Semantics remain in the production-import-free oracle. */
import { mkdir, mkdtemp, readdir, realpath, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { isAbsolute, join } from "node:path";
import { manifestToJson } from "../../../src/contract";
import { FileStore } from "../../../src/store";
import { governedPaths, hashBytes, hashFile, hashJson, readFileBounded, stableJson, type FileBinding } from "../../lib/files";
import { CommandFailure, admitSelftestOutput, requireSuccess, runCommand, type CommandResult } from "../../lib/runner";
import { requireThat } from "../../lib/schema";
import { artifactIdentity } from "../../traces/native";
import { actual, expected, materialize } from "./adapter";
import { fixtures } from "./fixtures";
import { DEFAULT, foreign, foreignFixtures } from "./foreign";
import { canonical, execute, type State, type Tape } from "./oracle";
import { commandConfiguration, EXECUTOR, workerSummary } from "./worker";

const BASE = "verify/reference/scheduler";
const BOUNDS = { ordinary: 89, foreign: 14, outputBytes: 8_388_608, workerMs: 120_000, nativeMs: 30_000 } as const;
const RELATION = "Independent finite-fixture small-step oracle and executed Bun/native conformance; no universal source refinement, provider truth, physical power-loss or general progress theorem";
type Raw = { path: string; sha256: string };
type Row = { id: string; runtime: "bun" | "native"; outcome: State["outcome"]; files: Raw[] };
export type SchedulerDefinition = { sha256: string; sources: FileBinding[] };
export async function schedulerDefinition(root: string): Promise<SchedulerDefinition> {
  const paths = await governedPaths(root);
  const entries = await readdir(join(root, BASE), { withFileTypes: true });
  for (const entry of entries) { requireThat(entry.isFile(), "scheduler definition requires a flat regular-file inventory"); paths.push(`${BASE}/${entry.name}`); }
  for (const entry of await readdir(join(root, "verify/lib"), { withFileTypes: true })) { requireThat(entry.isFile(), "scheduler verifier helper input must be regular"); paths.push(`verify/lib/${entry.name}`); }
  paths.push("verify/lib/files.ts", "verify/lib/schema.ts", "verify/lib/runner.ts", "verify/lib/command-supervisor.ts", "verify/lib/suites.ts", "verify/traces/native.ts");
  const sources = await Promise.all([...new Set(paths)].sort().map(async path => ({ path, sha256: await hashFile(root, path) })));
  return { sha256: hashJson({ relation: RELATION, bounds: BOUNDS, ordinary: fixtures().map(f => f.id), foreign: foreignFixtures().map(f => f.id), sources }), sources };
}
export function admitProjection(want: unknown, got: unknown): void {
  requireThat(stableJson(want) === stableJson(got), "scheduler oracle/implementation projection differs");
}
export function admitWorker(result: CommandResult, argv: string[], id: string, output: unknown): void {
  requireSuccess(result); requireThat(stableJson(result.command) === stableJson(argv), "scheduler worker command differs");
  requireThat(result.stdout === workerSummary(id, output) + "\n" && result.stderr === "", "scheduler worker omitted or altered its exact result binding");
}
export function admitNative(result: CommandResult, argv: string[], exitCodes: number[]): void {
  requireThat(stableJson(result.command) === stableJson(argv) && exitCodes.includes(result.exitCode ?? -1)
    && result.signal === null && !result.timedOut && !result.outputExceeded && result.cleanupObserved, "scheduler native command boundary differs");
}
async function json(directory: string, path: string): Promise<unknown> {
  const bytes = await readFileBounded(directory, path, BOUNDS.outputBytes);
  const text = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes); requireThat(!text.startsWith("\ufeff"), "scheduler raw BOM"); return JSON.parse(text);
}
function object(raw: unknown, label: string): Record<string, unknown> {
  requireThat(raw !== null && typeof raw === "object" && !Array.isArray(raw), label); return raw as Record<string, unknown>;
}
function effectRequest(state: State) {
  const request = state.frames.at(-1)?.request; requireThat(request !== undefined, "oracle pending request"); return request;
}
function poison(state: State, raw: unknown, runtime: "bun" | "native", configurationDigest: string): void {
  const result = object(raw, "poison result"), head = object(result.head, "poison head"), process = object(head.process, "poison process");
  requireThat(state.outcome === "journal-error" && state.effects.length === 0 && Object.keys(state.cells).length === 0, "oracle poison projection");
  requireThat(process.status === "uncertain" && process.receipt === undefined, "poison published process outcome");
  const journal = object(result.journal, "poison journal"); requireThat(Array.isArray(journal.effects) && journal.effects.length === 1, "poison journal length");
  const record = object(object(journal.effects[0], "journal row").record, "journal record"), header = object(journal.header, "journal header");
  requireThat(header.intent === head.digest && record.intent === head.digest && header.manifestDigest === process.manifestDigest && process.generation === 1 && record.attempt === 0 && record.previous === undefined, "poison selected intent binding");
  requireThat(record.state === "started" && record.recovery === "never" && record.receipt === undefined && record.ordinal === 0
    && record.executor === EXECUTOR && record.configurationDigest === configurationDigest && record.requestDigest === hashBytes(canonical(effectRequest(state))), "poison retained binding/settlement");
  admitProjection(result.head, result.reopened);
  const response = foreign("signal", runtime, true); requireThat(response.kind === "poison", "poison response kind");
  const error = { code: "EFFECT_FAILED", message: response.message, ...(runtime === "bun" ? { uncertain: true } : {}) };
  admitProjection(result.error, error);
  admitProjection(result.recovery, runtime === "bun"
    ? { code: "IO_FAILED", message: "effect 0 has unknown completion; adapter reconciliation is required" }
    : { code: "RECOVERY_BLOCKED", message: "unknown external write requires adapter reconciliation" });
}

/** No ambient binary fallback or build: callers must select a frozen CLI explicitly. */
export async function runSchedulerConformance(root: string, binary = process.env.ALGAL_SCHEDULER_NATIVE_BIN): Promise<unknown> {
  requireThat(binary !== undefined && isAbsolute(binary), "ALGAL_SCHEDULER_NATIVE_BIN must name an explicit absolute frozen CLI artifact");
  const archive = await realpath(await mkdtemp(join(tmpdir(), "algal-scheduler-conformance-")));
  const before = await schedulerDefinition(root), artifacts = { bun: await artifactIdentity(process.execPath), native: await artifactIdentity(binary) };
  const rows: Row[] = [];
  async function retain(path: string, value: unknown): Promise<Raw> {
    const text = stableJson(value) + "\n"; requireThat(Buffer.byteLength(text) <= BOUNDS.outputBytes, "scheduler retained artifact byte bound");
    await writeFile(join(archive, path), text, { flag: "wx", mode: 0o600 }); return { path, sha256: hashBytes(text) };
  }
  async function bind(path: string): Promise<Raw> { return { path, sha256: hashBytes(await readFileBounded(archive, path, BOUNDS.outputBytes)) }; }
  async function command(path: string, argv: string[], timeoutMs: number) {
    try {
      const result = await runCommand(argv, root, { timeoutMs, maxOutputBytes: BOUNDS.outputBytes }); await retain(path, result); return result;
    } catch (error) {
      if (error instanceof CommandFailure) {
        await writeFile(join(archive, path + ".stdout.bin"), error.rawStdout, { flag: "wx", mode: 0o600 });
        await writeFile(join(archive, path + ".stderr.bin"), error.rawStderr, { flag: "wx", mode: 0o600 });
        await retain(path + ".custody-failure.json", { message: error.message, observation: error.observation });
      }
      throw error;
    }
  }
  await retain("start.json", { definition: before, artifacts, relation: RELATION, bounds: BOUNDS });
  try {
    const ordinary = fixtures(), boundary = foreignFixtures();
    requireThat(ordinary.length === BOUNDS.ordinary && boundary.length === BOUNDS.foreign
      && new Set(ordinary.map(f => f.id)).size === ordinary.length && new Set(boundary.map(f => f.id)).size === boundary.length, "scheduler static case inventory");
    for (const fixture of ordinary) {
      const id = `ordinary-${fixture.id}`, directory = join(archive, id); await mkdir(directory);
      const state = execute(fixture.program, fixture.args, fixture.budget, fixture.tape), want = expected(state);
      const common = [await retain(`${id}/fixture.json`, fixture), await retain(`${id}/oracle.json`, { projection: want, trace: state.trace, guardCounts: state.guardCounts })];
      const bunArgv = [artifacts.bun.path, join(root, BASE, "worker.ts"), "ordinary", fixture.id, directory];
      const bun = await command(`${id}/bun.command.json`, bunArgv, BOUNDS.workerMs), receipt = await json(directory, "result.json");
      admitWorker(bun, bunArgv, fixture.id, receipt); admitProjection(want, actual(receipt));
      const inputs = await Promise.all(["manifest.json", "responses.json", "args.json"].map(p => bind(`${id}/${p}`)));
      rows.push({ id: fixture.id, runtime: "bun", outcome: state.outcome, files: [...common, ...inputs, await bind(`${id}/bun.command.json`), await bind(`${id}/result.json`)] });
      const nativeArgv = [artifacts.native.path, "run", join(directory, "manifest.json"), "--responses", join(directory, "responses.json"), "--args", join(directory, "args.json"), "--dir", join(directory, "state")];
      const native = await command(`${id}/native.command.json`, nativeArgv, BOUNDS.nativeMs); admitNative(native, nativeArgv, [state.outcome === "complete" ? 0 : 1]); requireThat(native.stderr === "", "native receipt diagnostics");
      const nativeReceipt: unknown = JSON.parse(native.stdout); admitProjection(want, actual(nativeReceipt));
      rows.push({ id: fixture.id, runtime: "native", outcome: state.outcome, files: [...common, ...inputs, await bind(`${id}/native.command.json`), await retain(`${id}/native.receipt.json`, nativeReceipt)] });
      for (const input of inputs) requireThat((await bind(input.path)).sha256 === input.sha256, "scheduler shared native input changed");
    }
    for (const fixture of boundary) {
      for (const runtime of ["bun", "native"] as const) {
        const id = `foreign-${fixture.id}-${runtime}`, directory = join(archive, id); await mkdir(directory);
        const configuration = commandConfiguration(directory, fixture.mode, artifacts.bun.path), configurationDigest = hashJson(configuration);
        const tape: Tape = [{ cell: "primary", response: foreign(fixture.mode, runtime, fixture.journal) }, { cell: "later", response: { kind: "output", value: "fallback", retryable: false } }];
        const state = execute(fixture.program, {}, DEFAULT, tape), files = [await retain(`${id}/fixture.json`, fixture), await retain(`${id}/oracle.json`, { projection: expected(state, { executor: EXECUTOR, configurationDigest, retryable: false }), trace: state.trace, guardCounts: state.guardCounts, ...(state.outcome === "journal-error" ? { pendingRequest: effectRequest(state) } : {}) }), await retain(`${id}/configuration.json`, configuration)];
        let result: unknown;
        if (runtime === "bun") {
          const argv = [artifacts.bun.path, join(root, BASE, "worker.ts"), "foreign", fixture.id, directory];
          const executed = await command(`${id}/worker.command.json`, argv, BOUNDS.workerMs); result = await json(directory, "result.json");
          admitWorker(executed, argv, fixture.id, result); files.push(await bind(`${id}/worker.command.json`), await bind(`${id}/result.json`), await bind(`${id}/manifest.json`));
        } else {
          const store = new FileStore(join(directory, "state")), manifest = await materialize(fixture.program, store, DEFAULT);
          files.push(await retain(`${id}/manifest.json`, manifestToJson(manifest)), await retain(`${id}/host.json`, { contract: "algal.host.v1", executors: { [EXECUTOR]: configuration } }));
          const invoke = async (name: string, args: string[], codes: number[]) => {
            const argv = [artifacts.native.path, ...args, "--dir", store.dir], out = await command(`${id}/${name}.command.json`, argv, BOUNDS.nativeMs);
            admitNative(out, argv, codes); files.push(await bind(`${id}/${name}.command.json`)); return out;
          };
          const host = ["--host", join(directory, "host.json")];
          if (!fixture.journal) {
            const out = await invoke("run", ["run", join(directory, "manifest.json"), ...host], [state.outcome === "complete" ? 0 : 1]); requireThat(out.stderr === "", "native foreign diagnostics"); result = JSON.parse(out.stdout);
          } else {
            const created = await invoke("create", ["process", "create", "worker", join(directory, "manifest.json")], [0]); requireThat(created.stderr === "", "native create diagnostics");
            const tick = await invoke("tick", ["process", "tick", "worker", "--journal", ...host], [2]); requireThat(tick.stdout === "", "native poison returned output");
            const failure = object(JSON.parse(tick.stderr), "native poison wire error"); requireThat(failure.ok === false && Object.keys(failure).length === 2, "native poison error envelope");
            const inspected = await invoke("inspect", ["process", "inspect", "worker"], [0]), described = await invoke("journal", ["process", "journal", "worker"], [0]); requireThat(inspected.stderr === "" && described.stderr === "", "native retained state diagnostics");
            const head = object(JSON.parse(inspected.stdout), "native process head"); requireThat(typeof head.digest === "string", "native process digest");
            const recovery = await invoke("recover", ["process", "recover", "worker", "--expected-intent", head.digest, ...host], [2]); requireThat(recovery.stdout === "", "native recovery returned output");
            const refused = object(JSON.parse(recovery.stderr), "native recovery wire error"); requireThat(refused.ok === false && Object.keys(refused).length === 2, "native recovery error envelope");
            const reopened = await invoke("reopened", ["process", "inspect", "worker"], [0]); requireThat(reopened.stderr === "", "native reopen diagnostics");
            result = { head, journal: JSON.parse(described.stdout), error: failure.error, recovery: refused.error, reopened: JSON.parse(reopened.stdout) };
          }
          files.push(await retain(`${id}/result.json`, result));
        }
        if (fixture.journal) poison(state, result, runtime, configurationDigest);
        else admitProjection(expected(state, { executor: EXECUTOR, configurationDigest, retryable: false }), actual(result));
        const callBytes = await readFileBounded(directory, "calls.jsonl", 1_048_576), calls = new TextDecoder("utf-8", { fatal: true }).decode(callBytes).trim().split("\n").map(line => JSON.parse(line) as unknown);
        const requests = state.effects.map(e => e.request); if (state.outcome === "journal-error") requests.push(effectRequest(state)); admitProjection(requests, calls);
        files.push(await bind(`${id}/calls.jsonl`)); rows.push({ id: fixture.id, runtime, outcome: state.outcome, files });
      }
    }
    requireThat(stableJson(before) === stableJson(await schedulerDefinition(root)), "scheduler source definition changed during run");
    requireThat(stableJson(artifacts) === stableJson({ bun: await artifactIdentity(process.execPath), native: await artifactIdentity(binary) }), "scheduler executable changed during run");
    for (const row of rows) for (const file of row.files) requireThat((await bind(file.path)).sha256 === file.sha256, "retained scheduler evidence changed during execution");
    const result = { contract: "algal.scheduler-conformance.v1", relation: RELATION, definition: before, artifacts, bounds: BOUNDS, archive, ordinaryFixtures: ordinary.length, foreignFixtures: boundary.length, comparisons: rows.length, rows };
    await retain("result.json", result); return result;
  } catch (error) {
    await retain("failure.json", { message: error instanceof Error ? error.message : String(error), rows });
    throw new Error(`scheduler conformance rejected; raw evidence at ${archive}: ${error instanceof Error ? error.message : String(error)}`, { cause: error });
  }
}

/** Executable semantic controls, never labelled a machine-checked source proof. */
export async function runSchedulerModel(root: string): Promise<unknown> {
  const definition = await schedulerDefinition(root), bun = await artifactIdentity(process.execPath), archive = await mkdtemp(join(tmpdir(), "algal-scheduler-oracle-"));
  const argv = [bun.path, "test", join(root, BASE, "oracle.test.ts"), join(root, BASE, "adapter.test.ts")];
  let result: CommandResult;
  try { result = await runCommand(argv, root, { timeoutMs: 180_000, maxOutputBytes: BOUNDS.outputBytes }); }
  catch (error) {
    if (error instanceof CommandFailure) {
      await writeFile(join(archive, "stdout.bin"), error.rawStdout); await writeFile(join(archive, "stderr.bin"), error.rawStderr);
      await writeFile(join(archive, "failure.json"), stableJson(error.observation) + "\n");
    }
    throw error;
  }
  await writeFile(join(archive, "command.json"), stableJson(result) + "\n", { flag: "wx", mode: 0o600 });
  const tests = admitSelftestOutput(result);
  requireThat(tests === 23, "scheduler semantic/control test inventory differs");
  requireThat(stableJson(definition) === stableJson(await schedulerDefinition(root)) && stableJson(bun) === stableJson(await artifactIdentity(process.execPath)), "scheduler model definition/runtime changed");
  return { contract: "algal.scheduler-oracle.v1", relation: RELATION, definition, bun, archive, tests, command: result };
}
