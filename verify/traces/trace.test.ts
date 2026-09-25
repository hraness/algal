import { expect, test } from "bun:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { replayBun } from "./bun";
import { checkTrace, TraceMismatch } from "./check";
import { generateBun, checkGeneratedHistory } from "./generate";
import { parseHistory, parseTrace, type Action, type History } from "./schema";
import { shrinkHistory } from "./shrink";
import { productDigest, productJson } from "./product";
import { hashJson, stableJson } from "../lib/files";
import { admitNativeCommand } from "./native";
import type { CommandResult } from "../lib/runner";
import { runBunHistory } from "./run";

async function fixture(name: string): Promise<History> { return parseHistory(JSON.parse(await readFile(join(import.meta.dir, "fixtures", `${name}.json`), "utf8"))); }
for (const name of ["store", "mailbox", "application", "corruption", "uncertainty", "numeric-unicode-keys", "mailbox-uncertainty"]) test(`real Bun portable history: ${name}`, async () => {
  const history = await fixture(name), trace = await replayBun(history), admitted = checkTrace(history, trace);
  expect(admitted.abstractions.length).toBe(history.commands.length);
  expect(admitted.witnesses.length).toBeGreaterThan(0);
  if (name === "uncertainty") {
    expect(trace.steps[5]!.outcome).toMatchObject({ status: "error", uncertain: true });
    expect(admitted.abstractions[1]!.classification).toBe("uncertain");
  }
}, 20_000);

test("product encoding keeps integer-index ordering distinct from trace metadata", () => {
  const numeric = { "2": "a", "10": "b" };
  expect(productJson(numeric)).toBe('{"2":"a","10":"b"}');
  expect(stableJson(numeric)).toBe('{"10":"b","2":"a"}');
  expect(productDigest(numeric)).not.toBe(hashJson(numeric));
  expect(productJson({ "\uffff": 1, "😀": 2 })).toBe('{"😀":2,"￿":1}');
  expect(productJson({ "4294967295": 3, "01": 4, "4294967294": 2, "0": 1 })).toBe('{"0":1,"4294967294":2,"01":4,"4294967295":3}');
});

test("native replay requires its exact completed test and observed process custody", () => {
  const result: CommandResult = { command: [], exitCode: 0, signal: null, timedOut: false, outputExceeded: false, cleanupObserved: true,
    stdout: "\nrunning 1 test\ntest verification_trace::replay_portable_history ... ok\n\ntest result: ok. 1 passed; 0 failed; 0 ignored; 0 measured; 123 filtered out; finished in 0.01s\n\n", stderr: "" };
  expect(() => admitNativeCommand(result)).not.toThrow();
  for (const change of [{ stdout: "test result: ok. 0 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s" }, { stdout: result.stdout.slice(0, 70) }, { stdout: `${result.stdout}another injected success\n` }, { exitCode: 1 }, { signal: "SIGKILL" }, { timedOut: true }, { outputExceeded: true }, { cleanupObserved: false }])
    expect(() => admitNativeCommand({ ...result, ...change })).toThrow();
});

test("bounded Bun workers retain concrete generated and replayed evidence", async () => {
  const directory = await mkdtemp(join(tmpdir(), "algal-trace-worker-test-"));
  let complete = false;
  try {
    const root = resolve(import.meta.dir, "../.."), generated = await runBunHistory(root, join(directory, "generated"), 1);
    checkGeneratedHistory(generated.history, generated.trace);
    const replay = await runBunHistory(root, join(directory, "replayed"), generated.history);
    expect(checkTrace(replay.history, replay.trace).abstractions.length).toBe(24);
    expect(replay.history).toEqual(generated.history);
    complete = true;
  } finally { if (complete) await rm(directory, { recursive: true, force: true }); }
}, 20_000);

test("trace admission rejects malformed populations, unbound histories and raw producer assertions", async () => {
  const history = await fixture("store"), trace = await replayBun(history);
  for (const mutate of [
    (t: typeof trace) => { t.steps.pop(); },
    (t: typeof trace) => { t.initial.observations.pop(); },
    (t: typeof trace) => { t.historyDigest = `sha256:${"0".repeat(64)}`; },
    (t: typeof trace) => { t.steps[0]!.outcome = { status: "ok", value: `sha256:${"0".repeat(64)}` }; },
    (t: typeof trace) => { t.steps[0]!.events = t.steps[0]!.events.filter(e => e.kind !== "fs" || e.step !== "file-sync"); },
    (t: typeof trace) => { t.steps[0]!.events = t.steps[0]!.events.filter(e => e.kind !== "fs" || e.step !== "dir-sync" || e.path !== "."); },
    (t: typeof trace) => { t.steps[0]!.events = t.steps[0]!.events.filter(e => e.kind !== "fs" || e.step !== "dir-sync" || e.path !== "values"); },
    (t: typeof trace) => { t.steps[0]!.events.push({ kind: "fs", step: "dir-sync", phase: "before", path: "unknown-managed-directory", target: null, inode: "i999" }); },
  ]) { const bad = structuredClone(trace); mutate(bad); expect(() => checkTrace(history, bad)).toThrow(); }
  expect(() => parseHistory({ ...history, commands: [] })).toThrow();
  expect(() => parseTrace({ ...trace, skip: true }, history)).toThrow();
  expect(() => parseHistory({ ...history, commands: [{ id: 0, action: { kind: "store-put", value: "\ud800" }, fault: null }] })).toThrow();
});

test("successful Store, mailbox and application operations cannot erase all I/O evidence", async () => {
  const covered = new Set<string>();
  for (const name of ["store", "mailbox", "application"]) {
    const history = await fixture(name), trace = await replayBun(history);
    for (const command of history.commands) {
      const row = trace.steps[command.id]!;
      if (row.outcome.status !== "ok" || row.events.length === 0) continue;
      const bad = structuredClone(trace); bad.steps[command.id]!.events = [];
      expect(() => checkTrace(history, bad)).toThrow(); covered.add(command.action.kind);
    }
  }
  expect([...covered].sort()).toEqual(["application-commit", "application-create", "effect-put", "mailbox-create", "mailbox-pending", "mailbox-receive", "mailbox-revoke", "mailbox-send", "slot-set", "store-put"]);
});

test("fresh bootstrap and independently read head/history binding are mandatory", async () => {
  const history = await fixture("application"), trace = await replayBun(history);
  const bootstrap = structuredClone(trace);
  bootstrap.initial.observations.find(o => o.target.kind === "application-memory" && o.target.memory === 0)!.outcome = { status: "ok", value: { found: false, value: null } };
  Object.assign(bootstrap.initial.files.find(o => o.target.kind === "application-memory" && o.target.memory === 0)!, { exists: false, bytes: 0, sha256: null });
  expect(() => checkTrace(history, bootstrap)).toThrow("initial-bootstrap");
  const detached = structuredClone(trace);
  detached.steps[0]!.after.observations.find(o => o.target.kind === "application-history" && o.target.app === 0)!.outcome = { status: "ok", value: [] };
  expect(() => checkTrace(history, detached)).toThrow("application-head-history-binding");
});

test("state-dependent generation executes and checks every real step", async () => {
  const a = await generateBun(0x12345678, 16), b = await generateBun(0x12345678, 16);
  expect(a.history).toEqual(b.history);
  expect(a.trace.steps.length).toBe(16);
  expect(checkTrace(a.history, await replayBun(a.history)).abstractions.length).toBe(16);
  expect(() => checkGeneratedHistory(a.history, a.trace)).not.toThrow();
  expect(() => checkGeneratedHistory({ ...a.history, seed: 99 }, a.trace)).toThrow("generator-history-binding");
}, 20_000);

test("fault checking preserves real error/uncertainty and constrains unrelated state", async () => {
  const history = await fixture("uncertainty"), trace = await replayBun(history);
  for (const mutate of [
    (t: typeof trace) => { if (t.steps[0]!.outcome.status === "error") t.steps[0]!.outcome.code = "INTERNAL"; },
    (t: typeof trace) => { if (t.steps[0]!.outcome.status === "error") t.steps[0]!.outcome.uncertain = true; },
    (t: typeof trace) => { if (t.steps[5]!.outcome.status === "error") t.steps[5]!.outcome.uncertain = false; },
    (t: typeof trace) => {
      const after = t.steps[0]!.after;
      after.observations.find(o => o.target.kind === "value" && o.target.value === "red")!.outcome = { status: "ok", value: { found: true, value: "red" } };
      Object.assign(after.files.find(o => o.target.kind === "value" && o.target.value === "red")!, { exists: true, bytes: 5, sha256: productDigest("red") });
    },
  ]) { const bad = structuredClone(trace); mutate(bad); expect(() => checkTrace(history, bad)).toThrow(); }
});

test("ordinary modeled rejections cannot invent API uncertainty", async () => {
  const covered = new Set<string>();
  for (const name of ["application", "mailbox"]) {
    const history = await fixture(name), trace = await replayBun(history);
    expect(() => checkTrace(history, trace)).not.toThrow();
    for (const command of history.commands) {
      const row = trace.steps[command.id]!;
      if (command.fault !== null || row.outcome.status !== "error") continue;
      expect(row.outcome.uncertain).toBe(false);
      const bad = structuredClone(trace), outcome = bad.steps[command.id]!.outcome;
      if (outcome.status !== "error") throw new Error("cloned rejection changed its tag");
      outcome.uncertain = true;
      expect(() => { checkTrace(history, bad); }).toThrow("nonfault-api-uncertainty");
      covered.add(row.outcome.code);
    }
  }
  for (const code of ["RECEIPT_MISMATCH", "MAILBOX_FULL", "CAPABILITY_DENIED"]) expect(covered.has(code)).toBe(true);
});

test("mailbox fault traces bind uncertainty to mutation attempts, including release failures", async () => {
  for (const operation of ["send", "receive", "revoke", "retry", "pending"] as const) {
    const actions: Action[] = [{ kind: "mailbox-create", box: 0, capacity: 1 }];
    if (operation !== "send" && operation !== "revoke") actions.push({ kind: "mailbox-send", box: 0, key: 0, value: "red" });
    actions.push(operation === "send" || operation === "retry" ? { kind: "mailbox-send", box: 0, key: 0, value: "red" }
      : operation === "revoke" ? { kind: "mailbox-revoke", box: 0, right: "send" }
      : { kind: operation === "receive" ? "mailbox-receive" : "mailbox-pending", box: 0 });
    const baseline = parseHistory({ contract: "algal.verification-history.v1", seed: 0, commands: actions.map((action, id) => ({ id, action, fault: null })) });
    const original = await replayBun(baseline), id = actions.length - 1;
    checkTrace(baseline, original);
    for (const cut of ["admission", "publication", "release"] as const) {
      if (cut === "publication" && (operation === "retry" || operation === "pending")) continue;
      const step = cut === "admission" ? "create-lock" : cut === "publication" ? "dir-sync" : "unlink-lock";
      const path = operation === "revoke" ? "capabilities" : `mailboxes/trace-box-0/${operation === "send" ? "messages" : "consumed"}`;
      let occurrence = 0, reached = false;
      for (const event of original.steps[id]!.events) {
        if (event.kind !== "fs" || event.step !== step || event.phase !== "before") continue;
        occurrence++;
        if (cut !== "publication" || event.path === path) { reached = true; break; }
      }
      expect(reached).toBe(true);
      const history = structuredClone(baseline);
      history.commands[id]!.fault = { site: "fs", step, phase: "before", occurrence, mode: "error" };
      const trace = await replayBun(history), outcome = trace.steps[id]!.outcome;
      checkTrace(history, trace);
      expect(outcome).toMatchObject({ status: "error", code: "IO_FAILED", uncertain: cut !== "admission" && operation !== "retry" && operation !== "pending" });
      const bad = structuredClone(trace), error = bad.steps[id]!.outcome;
      if (error.status !== "error") throw new Error("mailbox fault did not reject");
      error.uncertain = !error.uncertain;
      expect(() => checkTrace(history, bad)).toThrow("fault-api-uncertainty");
    }
  }
}, 20_000);

test("shrinker preserves semantic failure and rejects tool/parse failures as shrinks", async () => {
  const history = await fixture("store");
  const result = await shrinkHistory(history, async candidate => {
    const trace = await replayBun(candidate);
    // Deliberate checker-boundary mutation: forge one actual get result only
    // when its preceding real put established that value. This is a test of
    // shrink machinery, not evidence that production returned the forged data.
    const row = candidate.commands.find(c => c.action.kind === "store-get" && candidate.commands.some(p => p.id < c.id && p.action.kind === "store-put"));
    if (!row) throw new Error("candidate no longer reaches the injected semantic fault");
    trace.steps[row.id]!.outcome = { status: "ok", value: { found: true, value: "wrong" } };
    checkTrace(candidate, trace);
  }, 32);
  expect(result.property).toBe("read-after-state-change");
  expect(result.finalCommands).toBe(2);
  expect(result.attempts).toBeGreaterThan(0);
  await expect(shrinkHistory(history, async () => { throw new Error("tool crash"); })).rejects.toThrow("tool crash");
  expect(new TraceMismatch("named", 0, "test").property).toBe("named");
}, 20_000);
