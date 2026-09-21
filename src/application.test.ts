import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ApplicationService, applicationProcessName, type ApplicationAdmission, type ApplicationDispatchContext } from "./application";
import { digestCanonical, type Digest } from "./digest";
import { capabilityHandle } from "./capabilities";
import { parseOrganismManifest } from "./contract";

const dirs: string[] = [];
type DispatchAdmissionContext = Parameters<NonNullable<ApplicationAdmission["admitDispatch"]>>[0];
const ref = (v: unknown) => digestCanonical(v as never);
async function fixture(options: {fault?: (point: "prepared" | "head-published" | "dispatch-started" | "dispatch-settled") => void} = {}) {
  const dir = await mkdtemp(join(tmpdir(), "algal-application-")); dirs.push(dir);
  const service = new ApplicationService(dir, {
    async admitCommit() {},
    async admitDispatch() { return {kind: "delivery" as const, recipient: capabilityHandle("mailbox-send", {fixture: true}), hostProfile: ref("profile")}; },
  }, options);
  const manifest = parseOrganismManifest({
    contract: "algal.organism.v1", key: "organism:application-fixture", name: "Application fixture",
    cells: [{id: "out", kind: "const", outputs: {value: {type: "json", value: "ok"}}}], edges: [],
  });
  const manifestRef = await service.store.putManifest(manifest);
  const schema = await service.store.putValue({contract: "algal.schema.fixture.v1"});
  const queries = await service.store.putValue({contract: "algal.queries.fixture.v1"});
  const views = await service.store.putValue({contract: "algal.views.fixture.v1"});
  const runtime = await service.store.putValue({contract: "algal.runtime.fixture.v1"});
  const policy = await service.store.putValue({contract: "algal.policy.fixture.v1"});
  const applicability = await service.store.putValue({contract: "algal.query.fixture.v1"});
  const revision = {contract: "algal.application-revision.v1", application: "fixture", parent: null, schema, queries, views, runtimeProfile: runtime, evaluationPolicy: policy, capabilityRequirements: [], entrypoints: [{name: "run", manifest: manifestRef, applicability, maxGenerations: 1}]};
  const revisionRef = await service.store.putValue(revision);
  const memory = await service.store.putValue({contract: "algal.memory.fixture.v1", facts: []});
  return {service, revisionRef, memory};
}
afterEach(async () => { for (const dir of dirs.splice(0)) await rm(dir, {recursive: true, force: true}); });

describe("experimental application lifecycle", () => {
  test("publishes a genesis state and makes the exact operation idempotent", async () => {
    const {service, revisionRef, memory} = await fixture();
    const command = {application: "fixture", operation: ref("create-1"), kind: "create", expectedHead: null, revision: revisionRef, memory, intents: [], evidence: [], causedBy: null};
    const first = await service.create(command), second = await service.create(command);
    expect(second.digest).toBe(first.digest);
    expect((await service.history("fixture")).map(row => row.state.sequence)).toEqual([0]);
    expect((await service.inspect("fixture"))?.state.epoch).toBe(0);
  });
  test("rejects a stale writer and preserves the current head", async () => {
    const {service, revisionRef, memory} = await fixture();
    const first = await service.create({application: "fixture", operation: ref("create-2"), kind: "create", expectedHead: null, revision: revisionRef, memory, intents: [], evidence: [], causedBy: null});
    const nextMemory = await service.store.putValue({contract: "algal.memory.fixture.v1", facts: ["new"]});
    const advance = await service.commit({application: "fixture", operation: ref("memory-1"), kind: "memory", expectedHead: first.digest, revision: revisionRef, memory: nextMemory, intents: [], evidence: [], causedBy: null});
    await expect(service.commit({application: "fixture", operation: ref("stale"), kind: "memory", expectedHead: first.digest, revision: revisionRef, memory, intents: [], evidence: [], causedBy: null})).rejects.toThrow("Stale application head");
    expect((await service.inspect("fixture"))?.digest).toBe(advance.digest);
  });
  test("retains an uncertain head publication for exact operation reconciliation", async () => {
    const {service, revisionRef, memory} = await fixture({fault: point => { if (point === "head-published") throw new Error("simulated lost acknowledgement"); }});
    const command = {application: "fixture", operation: ref("uncertain-1"), kind: "create", expectedHead: null, revision: revisionRef, memory, intents: [], evidence: [], causedBy: null};
    await expect(service.create(command)).rejects.toMatchObject({uncertain: true});
    const committed = await service.inspect("fixture");
    expect(committed?.state.sequence).toBe(0);
    // The same operation is read back from the durable head; no second state is created.
    expect((await service.create(command)).digest).toBe(committed!.digest);
  });

  test("persists intents before the head and never dispatches an orphan after a prepared crash", async () => {
    let failPrepared = false;
    const {service, revisionRef, memory} = await fixture({fault: point => {
      if (point === "prepared" && failPrepared) { failPrepared = false; throw new Error("prepared crash"); }
    }});
    const genesis = {application: "fixture", operation: ref("create-delivery"), kind: "create", expectedHead: null, revision: revisionRef, memory, intents: [], evidence: [], causedBy: null};
    // The fault is consumed by the following transition, leaving its objects unreachable.
    await service.create(genesis);
    failPrepared = true;
    const message = await service.store.putValue({contract: "algal.message.fixture.v1", value: "hello"});
    const command: Record<string, unknown> = {application: "fixture", operation: ref("delivery-1"), kind: "investigate", expectedHead: null, revision: revisionRef, memory,
      intents: [{kind: "deliver", route: "inbox", message}], evidence: [], causedBy: null};
    command.expectedHead = (await service.inspect("fixture"))!.digest;
    await expect(service.commit(command)).rejects.toThrow("prepared crash");
    expect((await service.inspect("fixture"))?.state.sequence).toBe(0);
    let calls = 0;
    const dispatcher = {configurationDigest: ref("dispatcher-v1"), async dispatch() { calls++; return {status: "settled", result: {kind: "delivery", message: ref("mailbox-message"), idempotencyKey: ref("unused")}}; }};
    // A prepared transition is not reachable from a head and therefore cannot run.
    expect(await service.dispatchPending("fixture", dispatcher)).toEqual([]);
    expect(calls).toBe(0);
  });

  test("settles one delivery and does not duplicate it after restart", async () => {
    const {service, revisionRef, memory} = await fixture();
    await service.create({application: "fixture", operation: ref("create-delivery"), kind: "create", expectedHead: null, revision: revisionRef, memory, intents: [], evidence: [], causedBy: null});
    const message = await service.store.putValue({contract: "algal.message.fixture.v1", value: "hello"});
    await service.commit({application: "fixture", operation: ref("delivery-2"), kind: "investigate", expectedHead: (await service.inspect("fixture"))!.digest, revision: revisionRef, memory, intents: [{kind: "deliver", route: "inbox", message}], evidence: [], causedBy: null});
    let calls = 0;
    const dispatcher = {configurationDigest: ref("dispatcher-v2"), async dispatch(context: ApplicationDispatchContext) {
      calls++;
      if (context.intent.kind !== "deliver") throw new Error("expected delivery intent");
      return {status: "settled", result: {kind: "delivery", message: context.intent.message, idempotencyKey: context.dispatch.identity}};
    }};
    const first = await service.dispatchPending("fixture", dispatcher);
    expect(first[0]?.status).toBe("settled");
    expect(calls).toBe(1);
    expect(await service.dispatchPending("fixture", dispatcher)).toEqual([]);
    expect(calls).toBe(1);
  });

  test("rejects a delivery settlement for a different message", async () => {
    const {service, revisionRef, memory} = await fixture();
    await service.create({application: "fixture", operation: ref("create-message-binding"), kind: "create", expectedHead: null, revision: revisionRef, memory, intents: [], evidence: [], causedBy: null});
    const message = await service.store.putValue({contract: "algal.message.fixture.v1", value: "bound"});
    await service.commit({application: "fixture", operation: ref("delivery-message-binding"), kind: "investigate", expectedHead: (await service.inspect("fixture"))!.digest, revision: revisionRef, memory, intents: [{kind: "deliver", route: "inbox", message}], evidence: [], causedBy: null});
    const dispatcher = {configurationDigest: ref("dispatcher-message-binding"), async dispatch(context: {dispatch: {identity: Digest}}) {
      return {status: "settled", result: {kind: "delivery", message: ref("wrong-message"), idempotencyKey: context.dispatch.identity}};
    }};
    const [record] = await service.dispatchPending("fixture", dispatcher);
    expect(record?.status).toBe("uncertain");
  });

  test("rejects arbitrary success output and requires explicit reconciliation for uncertainty", async () => {
    const {service, revisionRef, memory} = await fixture();
    await service.create({application: "fixture", operation: ref("create-uncertain"), kind: "create", expectedHead: null, revision: revisionRef, memory, intents: [], evidence: [], causedBy: null});
    const message = await service.store.putValue({contract: "algal.message.fixture.v1", value: "opaque"});
    await service.commit({application: "fixture", operation: ref("delivery-uncertain"), kind: "investigate", expectedHead: (await service.inspect("fixture"))!.digest, revision: revisionRef, memory, intents: [{kind: "deliver", route: "inbox", message}], evidence: [], causedBy: null});
    const dispatcher = {configurationDigest: ref("dispatcher-v3"), async dispatch() { return {status: "settled", result: {ok: true}}; }};
    const [record] = await service.dispatchPending("fixture", dispatcher);
    expect(record?.status).toBe("uncertain");
    await expect(service.reconcileDispatch("fixture", record!.intent, dispatcher)).rejects.toThrow("Explicit dispatcher reconciliation");
  });

  test("does not let an old external-writer episode cross a memory fence", async () => {
    const {service, revisionRef, memory} = await fixture();
    const first = await service.create({application: "fixture", operation: ref("create-writer"), kind: "create", expectedHead: null, revision: revisionRef, memory, intents: [], evidence: [], causedBy: null});
    const input = await service.store.putValue({contract: "algal.input.fixture.v1"});
    await service.commit({application: "fixture", operation: ref("episode-writer"), kind: "investigate", expectedHead: first.digest, revision: revisionRef, memory,
      intents: [{kind: "start-episode", entrypoint: "run", input}], evidence: [], causedBy: null});
    const newerMemory = await service.store.putValue({contract: "algal.memory.fixture.v1", facts: ["new"]});
    const current = (await service.inspect("fixture"))!;
    await service.commit({application: "fixture", operation: ref("memory-writer"), kind: "memory", expectedHead: current.digest, revision: revisionRef, memory: newerMemory, intents: [], evidence: [], causedBy: null});
    const history = await service.history("fixture");
    const oldEpisode = history[1]!;
    const intent = oldEpisode.transition.intents[0]!;
    const revisionValue = await service.store.getValue(revisionRef) as {entrypoints: {manifest: Digest}[]};
    const dispatcher = {configurationDigest: ref("dispatcher-v4"), async dispatch() { return {status: "settled", result: {kind: "episode", binding: ref("x"), process: "x"}}; }};
    const admitting = new ApplicationService(service.dir, {
      async admitCommit() {},
      async admitDispatch(context: DispatchAdmissionContext) {
        return {kind: "episode" as const, binding: {contract: "algal.application-episode.v1" as const, application: "fixture", intent, sourceState: context.snapshot.digest, revision: revisionRef, memory, epoch: 0, entrypoint: "run", manifest: revisionValue.entrypoints[0]!.manifest, arguments: input, process: applicationProcessName("fixture", intent), maxGenerations: 1, hostProfile: ref("profile"), access: "external-write" as const}};
      },
    });
    // This service has a fresh admission object but the same durable state; the binding is intentionally stale.
    await expect(admitting.dispatchPending("fixture", dispatcher)).rejects.toThrow("Stale episode cannot acquire");
  });
});
