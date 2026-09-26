import { expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { loadSourceProject } from "../../../../src/source-project";
import type { SourceCompilation } from "../../../../src/source";
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
const load = (base: string) => loadSourceProject(`${import.meta.dir}/${base}.algal`, { root: projects });

test("the ballot box tallies current picks and views one ballot with the shared collection programs", async () => {
  const main = await load("main");
  expect(main.entry).toBe("ballot-box/main.algal");
  expect(main.analysis).toEqual({ maxAgentCalls: 0, requiredDepth: 1 });
  const tally = await execute(main, await fixture("main"));
  expect(tally.outcome).toBe("complete");
  expect(tally.work.agentCalls).toBe(0);
  expect(tally.cells.result!.outputs!.out).toEqual({
    ballots: [
      { id: "b1", pick: "yes", corrected: false, spoiled: false },
      { id: "b2", pick: "yes", corrected: true, spoiled: false },
      { id: "b3", pick: "no", corrected: false, spoiled: true },
    ],
    tally: [{ pick: "yes", count: 2 }, { pick: "no", count: 1 }],
  });
  const ballot = await load("ballot");
  const view = await execute(ballot, await fixture("ballot"));
  expect(view.outcome).toBe("complete");
  expect(view.cells.result!.outputs!.out).toEqual({
    ballot: "b2", known: true, original: "no", pick: "yes",
    corrected: true, spoiled: false, with: ["b1", "b2"],
  });
  // An id that is neither a ballot nor a change target reports the fallbacks.
  const unknown = await execute(ballot, { input: { ...(await fixture("ballot")).input!, ballot: "b7" } });
  expect(unknown.cells.result!.outputs!.out).toEqual({
    ballot: "b7", known: false, original: "", pick: "", corrected: false, spoiled: false, with: [],
  });
});

test("the ballot box replays from its portable closure", async () => {
  const main = await load("main"), args = await fixture("main");
  const store = await install(main), receipt = await execute(main, args, store);
  const bundle = await packOrganism(main.manifest, store), portable = new MemoryStore();
  await unpackBundle(bundle, portable);
  expect(Object.keys(bundle.manifests)).toHaveLength(4);
  for (const key of ["shared/apply_updates.algal", "shared/flags_for.algal", "shared/group_by_key.algal"]) {
    expect(Object.hasOwn(bundle.manifests, main.project.units[key]!.manifestDigest)).toBe(true);
  }
  expect(await execute(main, args, portable)).toEqual(receipt);
  expect((await verifyReceipt(receipt as unknown as JsonValue, manifestToJson(main.manifest), portable, builtinRegistry())).ok).toBe(true);
});

test("malformed ballots and changes fail where the schema receives them", async () => {
  const main = await load("main"), args = await fixture("main");
  const ballot = (args.input!.ballots as JsonValue[])[0] as Record<string, JsonValue>;
  const withInput = (patch: Record<string, JsonValue>): Args => ({ input: { ...args.input!, ...patch } });
  const cases: [string, Args, ErrorCode, string][] = [
    ["an empty ballot id", withInput({ ballots: [{ ...ballot, id: "" }] }), "TYPE_MISMATCH", "input"],
    ["a ballot without a pick", withInput({ ballots: [{ id: "b9" }] }), "TYPE_MISMATCH", "input"],
    ["a change missing its target", withInput({ changes: [{ value: "yes" }] }), "TYPE_MISMATCH", "input"],
    // Picks group by text, so a non-text change value fails at the tally's
    // group_by_key call rather than casting to a key.
    ["a non-text change value", withInput({ changes: [{ target: "b1", value: 42 }] }), "TYPE_MISMATCH", "b3-tally"],
  ];
  for (const [label, input, code, path] of cases) {
    const receipt = await execute(main, input);
    expect({ label, outcome: receipt.outcome, code: receipt.failure?.code, path: receipt.failure?.path }).toEqual({ label, outcome: "failed", code, path });
    expect(receipt.cells.result?.outputs).toBeUndefined();
  }
  // The same non-text change fails inside ballot.algal's own tally call.
  const view = await load("ballot"), viewArgs = await fixture("ballot");
  const rejected = await execute(view, { input: { ...viewArgs.input!, changes: [{ target: "b1", value: 42 }] } });
  expect({ outcome: rejected.outcome, code: rejected.failure?.code, path: rejected.failure?.path })
    .toEqual({ outcome: "failed", code: "TYPE_MISMATCH", path: "b5-tally" });
});
