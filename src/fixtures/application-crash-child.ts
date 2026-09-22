import assert from "node:assert/strict";
import { open, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { ApplicationService, type ApplicationAdmission, type ApplicationCommand, type ApplicationDispatchContext, type ApplicationFaultPoint } from "../application";
import { capabilityHandle } from "../capabilities";
import { parseOrganismManifest } from "../contract";
import { digestCanonical, type Digest } from "../digest";
import { canonicalize, type JsonValue } from "../values";

const [directory, mode, point, token] = process.argv.slice(2);
assert(directory && mode && point && token && /^[a-f0-9]{48}$/.test(token));
const hash = (value: unknown) => digestCanonical(value as JsonValue);
const admission: ApplicationAdmission = {
  async admitCommit() {},
  async admitDispatch() { return { kind: "delivery", recipient: capabilityHandle("mailbox-send", { fixture: "crash" }), hostProfile: hash("crash-profile") }; },
};
type Scenario = { genesis: Digest; before: Digest; after: Digest; command: ApplicationCommand };
const checkpoint = join(directory, "scenario.json"), effect = join(directory, "fixture-effect.txt");
async function barrier(actual: string): Promise<void> {
  if (mode !== "crash" || actual !== point) return;
  await Bun.write(Bun.stdout, JSON.stringify({ token, point, pid: process.pid }) + "\n");
  // The parent owns this exact process and only kills after the token barrier.
  setInterval(() => {}, 1000);
  await new Promise<never>(() => {});
}
const service = new ApplicationService(directory, admission, { fault: (actual: ApplicationFaultPoint) => barrier(actual) });
async function effects(): Promise<string[]> {
  try { return (await readFile(effect, "utf8")).trimEnd().split("\n"); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return []; throw error; }
}
function result(context: ApplicationDispatchContext) {
  assert.equal(context.intent.kind, "deliver");
  if (context.intent.kind !== "deliver") throw new Error("Expected fixture delivery");
  return { status: "settled", result: { kind: "delivery", message: context.intent.message, idempotencyKey: context.dispatch.identity } };
}
const dispatcher = {
  configurationDigest: hash("crash-dispatcher"),
  async dispatch(context: ApplicationDispatchContext) {
    const file = await open(effect, "a", 0o600);
    try { await file.writeFile(context.dispatch.identity + "\n"); await file.sync(); } finally { await file.close(); }
    await barrier("effect-applied");
    return result(context);
  },
  async reconcile(context: ApplicationDispatchContext) {
    const writes = await effects();
    if (writes.length === 1 && writes[0] === context.dispatch.identity) return result(context);
    return { status: "blocked", reason: "Fixture has no exact completed effect evidence" };
  },
};

if (mode === "setup") {
  const manifest = await service.store.putManifest(parseOrganismManifest({
    contract: "algal.organism.v1", key: "organism:application-crash", name: "Crash fixture",
    cells: [{ id: "out", kind: "const", outputs: { value: { type: "json", value: "ok" } } }], edges: [],
  }));
  const schema = await service.store.putValue({ contract: "algal.schema.fixture.v1" });
  const queries = await service.store.putValue({ contract: "algal.queries.fixture.v1" });
  const views = await service.store.putValue({ contract: "algal.views.fixture.v1" });
  const runtimeProfile = await service.store.putValue({ contract: "algal.runtime.fixture.v1" });
  const evaluationPolicy = await service.store.putValue({ contract: "algal.policy.fixture.v1" });
  const applicability = await service.store.putValue({ contract: "algal.query.fixture.v1" });
  const revision = await service.store.putValue({ contract: "algal.application-revision.v1", application: "fixture", parent: null, schema, queries, views, runtimeProfile, evaluationPolicy, capabilityRequirements: [], entrypoints: [{ name: "run", manifest, applicability, maxGenerations: 1, capabilities: [], queries: [applicability] }] });
  const before = await service.store.putValue({ contract: "algal.memory.fixture.v1", facts: ["before"] });
  const after = await service.store.putValue({ contract: "algal.memory.fixture.v1", facts: ["after"] });
  const initial = await service.create({ application: "fixture", operation: hash("genesis"), kind: "create", expectedHead: null, revision, memory: before, intents: [], evidence: [], causedBy: null });
  const message = await service.store.putValue({ contract: "algal.message.fixture.v1", value: "local-write" });
  const command: ApplicationCommand = { application: "fixture", operation: hash("advance"), kind: "memory", expectedHead: initial.digest, revision, memory: after, intents: [{ kind: "deliver", route: "sink", message }], evidence: [], causedBy: null };
  await writeFile(checkpoint, canonicalize({ genesis: initial.digest, before, after, command } as unknown as JsonValue), { flag: "wx" });
} else {
  const scenario = JSON.parse(await readFile(checkpoint, "utf8")) as Scenario;
  if (mode === "crash") {
    await service.commit(scenario.command);
    await service.dispatchPending("fixture", dispatcher);
    throw new Error("Requested crash barrier was not reached");
  }
  assert.equal(mode, "verify");
  const history = await service.history("fixture"), head = history.at(-1)!;
  const prepared = point === "prepared";
  assert.equal(history.length, prepared ? 1 : 2);
  assert.equal(head.state.memory, prepared ? scenario.before : scenario.after);
  assert.equal(head.state.sequence, prepared ? 0 : 1);
  assert.equal(head.state.previous, prepared ? null : scenario.genesis);
  // Resolve the entire fixture's committed dependency tuple, including intents.
  for (const snapshot of history) {
    for (const ref of [snapshot.state.revision, snapshot.state.memory, snapshot.state.transition, ...snapshot.transition.intents,
      snapshot.revision.schema, snapshot.revision.queries, snapshot.revision.views, snapshot.revision.runtimeProfile, snapshot.revision.evaluationPolicy,
      ...snapshot.revision.entrypoints.flatMap(e => [e.applicability, ...e.queries])]) assert.notEqual(await service.store.getValue(ref), undefined);
    for (const entry of snapshot.revision.entrypoints) assert.notEqual(await service.store.getManifest(entry.manifest), undefined);
  }
  const beforeDispatch = (await effects()).length;
  assert.equal(beforeDispatch, ["effect-applied", "dispatch-settled"].includes(point) ? 1 : 0);
  const pending = await service.dispatchPending("fixture", dispatcher);
  if (prepared) {
    assert.deepEqual(pending, []); assert.equal((await effects()).length, 0);
  } else if (point === "dispatch-started" || point === "effect-applied") {
    assert.equal(pending.length, 1); assert.equal(pending[0]!.status, "started");
    assert.equal((await effects()).length, beforeDispatch);
    assert.deepEqual(await service.dispatchPending("fixture", dispatcher), pending);
    assert.equal((await effects()).length, beforeDispatch);
    const settled = await service.reconcileDispatch("fixture", head.transition.intents[0]!, dispatcher);
    assert.equal(settled.status, point === "effect-applied" ? "settled" : "blocked");
    assert.equal((await effects()).length, beforeDispatch);
  } else {
    assert.equal(pending.length, point === "head-published" ? 1 : 0);
  }
  // Prepared publication can be finished exactly; already-published operations
  // return their original state without a second state or external effect.
  const recovered = await service.commit(scenario.command);
  assert.equal((await service.history("fixture")).length, 2);
  if (!prepared) assert.equal(recovered.digest, head.digest);
  await service.dispatchPending("fixture", dispatcher);
  await service.dispatchPending("fixture", dispatcher);
  assert.equal((await effects()).length, point === "dispatch-started" ? 0 : 1);
}
console.log(JSON.stringify({ ok: true, token, point, pid: process.pid }));
