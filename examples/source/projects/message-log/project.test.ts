import { expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { loadSourceProject } from "../../../../src/source-project";
import type { SourceCompilation } from "../../../../src/source";
import { createSourceDependencyReport } from "../../../../src/source-dependencies";
import { createSourceLock } from "../../../../src/source-lock";
import { MemoryStore } from "../../../../src/store-memory";
import { builtinRegistry } from "../../../../src/registry";
import { runOrganism } from "../../../../src/run";
import { verifyReceipt } from "../../../../src/verify";
import { manifestToJson } from "../../../../src/contract";
import type { ErrorCode } from "../../../../src/errors";
import { packOrganism, unpackBundle } from "../../../../src/bundle";
import type { JsonValue } from "../../../../src/values";

type Args = Record<string, Record<string, JsonValue>>;
const projects = `${import.meta.dir}/..`;
const SHARED = [
  "shared/apply_updates.algal",
  "shared/flags_for.algal",
  "shared/group_by_key.algal",
  "shared/includes_text.algal",
  "shared/latest_value.algal",
  "shared/lookup_by_key.algal",
] as const;
async function install(compilation: SourceCompilation) {
  const store = new MemoryStore();
  for (const module of compilation.modules) await store.putManifest(module);
  await store.putManifest(compilation.manifest);
  return store;
}
async function execute(compilation: SourceCompilation, args: Args, store?: MemoryStore) {
  return runOrganism({ manifest: compilation.manifest, args, store: store ?? await install(compilation), fns: builtinRegistry(), executors: [] });
}
const fixture = async (base: string) => JSON.parse(await readFile(`${import.meta.dir}/${base}.args.json`, "utf8")) as Args;
const withEvents = (args: Args, events: JsonValue): Args => ({ input: { ...args.input!, events } });

test("the message log projects a feed and a thread view with the shared collection programs", async () => {
  const main = await loadSourceProject(`${import.meta.dir}/main.algal`, { root: projects });
  expect(main.entry).toBe("message-log/main.algal");
  expect(Object.keys(main.sources).sort()).toEqual([
    "message-log/main.algal", "shared/apply_updates.algal", "shared/flags_for.algal", "shared/group_by_key.algal",
  ]);
  expect(main.analysis).toEqual({ maxAgentCalls: 0, requiredDepth: 1 });
  const feed = await execute(main, await fixture("main"));
  expect(feed.outcome).toBe("complete");
  expect(feed.work.agentCalls).toBe(0);
  expect(feed.cells.result!.outputs!.out).toEqual({
    rows: [
      { id: "p1", author: "alice", body: "edited twice", revised: true, gone: false, marked: true, own: true },
      { id: "p2", author: "bob", body: null, revised: false, gone: true, marked: false, own: false },
      { id: "p3", author: "alice", body: "third note", revised: false, gone: false, marked: true, own: true },
    ],
    threads: [{ key: "t1", members: ["p1", "p2"] }],
  });
  const thread = await loadSourceProject(`${import.meta.dir}/thread.algal`, { root: projects });
  expect(Object.keys(thread.sources).sort()).toEqual([
    "message-log/thread.algal", "shared/group_by_key.algal", "shared/includes_text.algal",
    "shared/latest_value.algal", "shared/lookup_by_key.algal",
  ]);
  const view = await execute(thread, await fixture("thread"));
  expect(view.outcome).toBe("complete");
  expect(view.cells.result!.outputs!.out).toEqual({
    members: ["p1", "p2"], gone: false, marked: true, body: "edited twice",
  });
});

test("the shared entries keep identical source, executable, and interface digests in both calling projects", async () => {
  const main = await loadSourceProject(`${import.meta.dir}/main.algal`, { root: projects });
  const thread = await loadSourceProject(`${import.meta.dir}/thread.algal`, { root: projects });
  const box = await loadSourceProject(`${projects}/ballot-box/main.algal`, { root: projects });
  const ballot = await loadSourceProject(`${projects}/ballot-box/ballot.algal`, { root: projects });
  const locks = await Promise.all([main, thread, box, ballot].map(project => createSourceLock(project.source, project.compilerOptions)));
  const units = locks.flatMap(lock => lock.units);
  for (const key of SHARED) {
    const digests = new Set(units.filter(unit => unit.source === key).map(unit => unit.manifestDigest));
    expect(digests.size).toBe(1);
    const [digest] = digests;
    const interfaces = new Set(locks.flatMap(lock => lock.interfaces[digest!] ?? []));
    expect(interfaces.size).toBe(1);
  }
  const report = await createSourceDependencyReport(main.source, { sourceOptions: main.compilerOptions });
  expect(report.modules.every(module => module.effects.transitive.length === 0)).toBe(true);
  const callers = (entry: string) => report.occurrences
    .filter(occurrence => occurrence.source === entry).map(occurrence => occurrence.caller?.origin?.source);
  expect(callers("shared/apply_updates.algal")).toEqual(["message-log/main.algal"]);
  expect(callers("shared/flags_for.algal")).toEqual(["message-log/main.algal", "message-log/main.algal"]);
  expect(callers("shared/group_by_key.algal")).toEqual(["message-log/main.algal"]);
});

test("the message log replays from its portable closure", async () => {
  const main = await loadSourceProject(`${import.meta.dir}/main.algal`, { root: projects });
  const args = await fixture("main");
  const store = await install(main), receipt = await execute(main, args, store);
  const bundle = await packOrganism(main.manifest, store), portable = new MemoryStore();
  await unpackBundle(bundle, portable);
  expect(Object.keys(bundle.manifests)).toHaveLength(4);
  for (const key of SHARED.slice(0, 3)) expect(Object.hasOwn(bundle.manifests, main.project.units[key]!.manifestDigest)).toBe(true);
  expect(await execute(main, args, portable)).toEqual(receipt);
  expect((await verifyReceipt(receipt as unknown as JsonValue, manifestToJson(main.manifest), portable, builtinRegistry())).ok).toBe(true);
});

test("malformed events fail at the events parameter, naming the violated rule", async () => {
  const main = await loadSourceProject(`${import.meta.dir}/main.algal`, { root: projects });
  const args = await fixture("main");
  const event = (args.input!.events as JsonValue[])[0] as Record<string, JsonValue>;
  const cases: [string, Args, ErrorCode, string][] = [
    ["an unknown kind", withEvents(args, [{ ...event, kind: "reply" }]), "TYPE_MISMATCH", "input"],
    ["an empty id", withEvents(args, [{ ...event, id: "" }]), "TYPE_MISMATCH", "input"],
    ["a missing field", withEvents(args, [{ id: "x", kind: "post" }]), "TYPE_MISMATCH", "input"],
    ["a non-list log", withEvents(args, "no"), "TYPE_MISMATCH", "input"],
    ["a non-text person", { input: { ...args.input!, person: 7 } }, "TYPE_MISMATCH", "input"],
  ];
  for (const [label, input, code, path] of cases) {
    const receipt = await execute(main, input);
    expect({ label, outcome: receipt.outcome, code: receipt.failure?.code, path: receipt.failure?.path }).toEqual({ label, outcome: "failed", code, path });
    expect(receipt.cells.result?.outputs).toBeUndefined();
  }
});
