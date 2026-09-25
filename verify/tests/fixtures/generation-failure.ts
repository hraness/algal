/** Isolated diagnostic controls. Synthetic runtime rows are never admitted as execution evidence. */
import { mock } from "bun:test";
import { strict as assert } from "node:assert";
import { lstat, mkdir, readFile, writeFile } from "node:fs/promises";
import { isAbsolute, join, resolve } from "node:path";
import { hashJson, stableJson } from "../../lib/files";
import type { Command, History, Snapshot, Trace } from "../../traces/schema";

const [phase, mode, rawDirectory] = process.argv.slice(2);
assert(process.argv.length === 5 && ["generator", "worker", "chain"].includes(phase ?? "") && rawDirectory !== undefined && isAbsolute(rawDirectory), "closed control arguments");
const directory: string = rawDirectory, state = join(directory, "state");
await mkdir(state);
const primary = new Error("controlled original runtime failure"), finishFailure = new Error("controlled incomplete trace failure");
const historyBlocked = mode === "history-blocked" || mode === "both-blocked", traceBlocked = mode === "trace-blocked" || mode === "both-blocked";
const initial: Snapshot = { observations: ([0, 1] as const).flatMap(n => [
  { target: { kind: "mailbox-config" as const, box: n }, outcome: { status: "ok" as const, value: { found: false, value: null } } },
  { target: { kind: "application-history" as const, app: n }, outcome: { status: "ok" as const, value: null } },
  { target: { kind: "application-memory" as const, memory: n }, outcome: { status: "ok" as const, value: { found: false, value: null } } },
]), files: [] };
const syntheticTrace = (history: History): Trace => ({ contract: "algal.verification-trace.v1", runtime: "bun", historyDigest: hashJson(history), initial, steps: [], authorities: [] });
let creates = 0, steps = 0, finishes = 0, observedHistory: History | undefined, observedCommand: Command | undefined;
mock.module(resolve(import.meta.dir, "../../traces/bun.ts"), () => ({
  BunTraceRuntime: { create: async (root: string) => {
    assert.equal(root, state); creates++;
    if (phase !== "worker") {
      if (historyBlocked) await mkdir(join(state, "failure-history.json"));
      if (traceBlocked) await mkdir(join(state, "failure-trace.json"));
    }
    if (mode === "create-failed") throw primary;
    return {
      snapshot: async () => initial,
      step: async (command: Command) => { steps++; observedCommand = command; throw primary; },
      finish: (history: History) => { finishes++; observedHistory = history; if (mode === "finish-failed") throw finishFailure; return syntheticTrace(history); },
    };
  } },
  replayBun: async () => { throw new Error("replay must not execute in this control"); },
}));
const generatorPath = resolve(import.meta.dir, "../../traces/generate.ts"), generator = await import("../../traces/generate");
const { GenerationFailure, generateBun } = generator;
let caught: unknown, forwarded: InstanceType<typeof GenerationFailure> | undefined;
const originalHistory: History = { contract: "algal.verification-history.v1", seed: 1, commands: [{ id: 0, action: { kind: "restart" }, fault: null }] };
if (phase === "generator") {
  try { await generateBun(1, 1, state); } catch (error) { caught = error; }
} else {
  if (historyBlocked) await writeFile(join(directory, "history.json"), "prior history evidence", { flag: "wx" });
  if (traceBlocked) await writeFile(join(directory, "trace.json"), "prior trace evidence", { flag: "wx" });
  if (phase === "worker" && mode !== "trace-missing" && mode !== "ordinary-failure" && mode !== "success") await writeFile(join(state, "failure-trace.json"), stableJson(syntheticTrace(originalHistory)) + "\n", { flag: "wx" });
  const failure = new GenerationFailure(originalHistory, state, primary);
  mock.module(generatorPath, () => ({ ...generator, generateBun: async (seed: number, length: number, ownedRoot: string) => {
    assert.equal(seed, 1); assert.equal(ownedRoot, state);
    if (phase === "chain") {
      try { return await generateBun(seed, length, ownedRoot); } catch (error) { assert(error instanceof GenerationFailure); forwarded = error; throw error; }
    }
    if (mode === "success") return { history: originalHistory, trace: syntheticTrace(originalHistory), witnesses: [] };
    if (mode === "ordinary-failure") throw primary;
    forwarded = failure; throw failure;
  } }));
  const { runTraceWorker, workerSummary } = await import("../../traces/worker");
  const logs: unknown[][] = [], originalLog = console.log;
  console.log = (...args: unknown[]) => { logs.push(args); };
  try { await runTraceWorker(["generate", "1", directory]); } catch (error) { caught = error; } finally { console.log = originalLog; }
  assert.equal(logs.length, mode === "success" ? 1 : 0, "failure must never print a completion summary");
  if (mode === "success") {
    assert.equal(caught, undefined); assert.deepEqual(logs, [[workerSummary("generate", originalHistory, syntheticTrace(originalHistory))]]);
    assert.equal(await readFile(join(directory, "history.json"), "utf8"), stableJson(originalHistory) + "\n");
    assert.equal(await readFile(join(directory, "trace.json"), "utf8"), stableJson(syntheticTrace(originalHistory)) + "\n");
  } else if (mode === "ordinary-failure") {
    assert.equal(caught, primary);
    for (const path of ["history.json", "trace.json"]) await assert.rejects(lstat(join(directory, path)), { code: "ENOENT" });
  } else assert.equal(caught, forwarded, "worker must rethrow the exact GenerationFailure instance");
}
if (mode !== "success" && mode !== "ordinary-failure") {
  assert(caught instanceof GenerationFailure, "diagnostic retention must preserve GenerationFailure classification");
  assert.equal(caught.cause, primary, "direct cause must remain the original runtime failure");
  assert.equal(caught.directory, state); assert.match(caught.message, /controlled original runtime failure/); assert(caught.message.includes(state));
  const diagnostics: { path: string; cause: unknown }[] = caught.diagnosticFailures;
  assert(Array.isArray(diagnostics), "secondary failures must be exposed explicitly");
  const expectedPaths: string[] = [];
  if (phase !== "worker") {
    assert.equal(creates, 1); assert.equal(steps, mode === "create-failed" ? 0 : 1); assert.equal(finishes, mode === "create-failed" ? 0 : 1);
    assert.equal(caught.history.seed, 1); assert.equal(caught.history.commands.length, mode === "create-failed" ? 0 : 1);
    if (mode !== "create-failed") { assert.equal(caught.history, observedHistory); assert.equal(caught.history.commands[0], observedCommand); }
    if (historyBlocked) { expectedPaths.push(join(state, "failure-history.json")); assert((await lstat(join(state, "failure-history.json"))).isDirectory()); }
    else assert.equal(await readFile(join(state, "failure-history.json"), "utf8"), JSON.stringify(caught.history, null, 2));
    if (traceBlocked || mode === "finish-failed") expectedPaths.push(join(state, "failure-trace.json"));
    if (traceBlocked) assert((await lstat(join(state, "failure-trace.json"))).isDirectory());
    else if (mode !== "finish-failed" && mode !== "create-failed") assert.equal(await readFile(join(state, "failure-trace.json"), "utf8"), JSON.stringify(syntheticTrace(caught.history)));
    else await assert.rejects(lstat(join(state, "failure-trace.json")), { code: "ENOENT" });
    if (mode === "finish-failed") assert.equal(diagnostics.at(-1)?.cause, finishFailure);
  } else { assert.equal(creates, 0); assert.equal(caught.history, originalHistory); }
  if (phase !== "generator") {
    if (historyBlocked) { expectedPaths.push(join(directory, "history.json")); assert.equal(await readFile(join(directory, "history.json"), "utf8"), "prior history evidence"); }
    else assert.equal(await readFile(join(directory, "history.json"), "utf8"), stableJson(caught.history) + "\n");
    if (traceBlocked || mode === "trace-missing") expectedPaths.push(join(directory, "trace.json"));
    if (traceBlocked) assert.equal(await readFile(join(directory, "trace.json"), "utf8"), "prior trace evidence");
    else if (mode !== "trace-missing") assert.deepEqual(await readFile(join(directory, "trace.json")), await readFile(join(state, "failure-trace.json")));
    else await assert.rejects(lstat(join(directory, "trace.json")), { code: "ENOENT" });
  }
  assert.deepEqual(diagnostics.map(item => item.path), expectedPaths, "retain each failed destination in attempt order");
  for (const item of diagnostics) assert(item.cause instanceof Error, "retain actual secondary causes");
}
console.log(JSON.stringify({ contract: "algal.generation-failure-control.v1", phase, mode, ok: true }));
