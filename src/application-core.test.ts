import { afterEach, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ApplicationCore, type ApplicationAdmission, type ApplicationCommand, type ApplicationDispatchContext, type ApplicationFaultPoint } from "./application-core";
import { FileApplicationStorage } from "./application-filesystem";
import { MemoryApplicationStorage, type ApplicationStorage } from "./application-storage";
import { applicationJson } from "./application-contract";
import { produceApplicationDrain } from "./application-drain";
import { APPLICATION_MEMORY_NATIVE_LIMITS } from "./application-memory";
import { proposeApplicationRevision, verifyApplicationProposal } from "./application-proposal";
import { restoreApplicationRevision } from "./application-restoration";
import { capabilityHandle } from "./capabilities";
import { manifestToJson, parseOrganismManifest } from "./contract";
import { digestCanonical } from "./digest";
import { builtinRegistry } from "./registry";

const directories: string[] = [];
afterEach(async () => { for (const directory of directories.splice(0)) await rm(directory, { recursive: true, force: true }); });
const hash = (value: unknown) => digestCanonical(applicationJson(value));
const admission: ApplicationAdmission = {
  async admitCommit() {},
  async admitDispatch() { return { kind: "delivery", recipient: capabilityHandle("mailbox-send", { portable: true }), hostProfile: hash("profile") }; },
};
async function storage(kind: "memory" | "filesystem"): Promise<ApplicationStorage> {
  if (kind === "memory") return new MemoryApplicationStorage();
  const directory = await mkdtemp(join(tmpdir(), "algal-core-")); directories.push(directory);
  return new FileApplicationStorage(directory);
}
async function fixture(adapter: ApplicationStorage) {
  const service = new ApplicationCore(adapter, admission), store = adapter.store;
  const manifest = await store.putManifest(parseOrganismManifest({ contract: "algal.organism.v1", key: "organism:portable-app", name: "Portable application", cells: [{ id: "out", kind: "const", outputs: { value: { type: "json", value: "ok" } } }], edges: [] }));
  const record = await store.putValue({ fixture: "portable" });
  const revisionValue = { contract: "algal.application-revision.v1", application: "portable", parent: null, schema: record, queries: record, views: record, runtimeProfile: record, evaluationPolicy: record, capabilityRequirements: [], entrypoints: [{ name: "run", manifest, applicability: record, maxGenerations: 1, capabilities: [], queries: [record] }] };
  const revision = await store.putValue(revisionValue), memory = await store.putValue({ facts: [] });
  const command: ApplicationCommand = { application: "portable", operation: hash("create"), kind: "create", expectedHead: null, revision, memory, intents: [], evidence: [], causedBy: null };
  return { service, command, revisionValue };
}

test("injected and filesystem hosts preserve identical commands, heads, idempotence and recovery", async () => {
  const traces = [];
  for (const kind of ["memory", "filesystem"] as const) {
    const adapter = await storage(kind), { service, command, revisionValue } = await fixture(adapter);
    const first = await service.create(command);
    const nextCommand: ApplicationCommand = { ...command, kind: "memory", operation: hash("memory"), expectedHead: first.digest, memory: await adapter.store.putValue({ facts: ["next"] }) };
    const second = await service.commit(nextCommand);
    expect(await service.create(command)).toEqual(first);
    await expect(service.commit({ ...nextCommand, memory: command.memory })).rejects.toThrow("Operation already claims another request");
    await expect(service.commit({ ...nextCommand, operation: hash("stale") })).rejects.toThrow("Stale application head");
    expect((await service.inspect("portable"))!.digest).toBe(second.digest);

    const message = await adapter.store.putValue({ body: "one logical delivery" });
    const preparedCommand: ApplicationCommand = { ...nextCommand, kind: "investigate", operation: hash("prepared"), expectedHead: second.digest, intents: [{ kind: "deliver", route: "inbox", message }] };
    const interrupted = new ApplicationCore(adapter, admission, { fault(point) { if (point === "prepared") throw new Error("interrupted preparation"); } });
    await expect(interrupted.commit(preparedCommand)).rejects.toThrow("interrupted preparation");
    expect((await service.inspect("portable"))!.digest).toBe(second.digest);
    let dispatches = 0, reconciliations = 0;
    const dispatcher = {
      configurationDigest: hash("dispatcher"),
      async dispatch() { dispatches++; throw new Error("lost provider acknowledgement"); },
      async reconcile(context: ApplicationDispatchContext) {
        reconciliations++;
        return { status: "settled", result: { kind: "delivery", message, idempotencyKey: context.dispatch.identity } };
      },
    };
    expect(await service.dispatchPending("portable", dispatcher)).toEqual([]);
    const restarted = new ApplicationCore(adapter, admission);
    const third = await restarted.commit(preparedCommand);
    const [uncertain] = await restarted.dispatchPending("portable", dispatcher);
    expect(uncertain?.status).toBe("uncertain");
    if (!uncertain || uncertain.status === "denied") throw new Error("Fixture dispatch was not admitted");
    expect(dispatches).toBe(1);
    expect(await new ApplicationCore(adapter, admission).dispatchPending("portable", dispatcher)).toEqual([uncertain!]);
    expect(dispatches).toBe(1);
    const candidate = await adapter.store.putValue({ ...revisionValue, parent: command.revision });
    await expect(restarted.commit({ ...preparedCommand, kind: "activate", operation: hash("activation-blocked"), expectedHead: third.digest, revision: candidate, intents: [] })).rejects.toThrow("Unsettled dispatch blocks activation");
    await expect(restarted.reconcileDispatch("portable", uncertain!.intent, { ...dispatcher, configurationDigest: hash("wrong-dispatcher") })).rejects.toThrow("Dispatcher configuration changed");
    expect(reconciliations).toBe(0);

    const lostAckCommand: ApplicationCommand = { ...nextCommand, operation: hash("head-ack"), expectedHead: third.digest };
    const lostAck = new ApplicationCore(adapter, admission, { fault(point) { if (point === "head-published") throw new Error("lost head acknowledgement"); } });
    await expect(lostAck.commit(lostAckCommand)).rejects.toMatchObject({ code: "IO_FAILED", uncertain: true });
    const finalOwner = new ApplicationCore(adapter, admission);
    const fourth = (await finalOwner.inspect("portable"))!;
    expect(fourth.state.sequence).toBe(3);
    expect(await finalOwner.commit(lostAckCommand)).toEqual(fourth);
    const settled = await finalOwner.reconcileDispatch("portable", uncertain!.intent, dispatcher);
    expect(settled.status).toBe("settled");
    expect(settled.identity).toBe(uncertain!.identity);
    expect(settled.sourceState).toBe(third.digest);
    expect(dispatches).toBe(1); expect(reconciliations).toBe(1);
    expect(await finalOwner.dispatchPending("portable", dispatcher)).toEqual([]);
    expect(await finalOwner.reconcileDispatch("portable", settled.intent, dispatcher)).toEqual(settled);
    expect(reconciliations).toBe(1);
    traces.push({ history: await finalOwner.history("portable"), lineage: await finalOwner.lineage("portable"), uncertain, settled });
  }
  expect(traces[0]).toEqual(traces[1]);
});

for (const kind of ["memory", "filesystem"] as const) {
  for (const point of ["dispatch-started", "dispatch-settled"] as const satisfies ApplicationFaultPoint[]) {
    test(`${kind} preserves ${point} across owner interruption without automatic repeat`, async () => {
      const adapter = await storage(kind), { command } = await fixture(adapter);
      const message = await adapter.store.putValue({ message: "retained" });
      const service = new ApplicationCore(adapter, admission, { fault(at) { if (at === point) throw new Error(point); } });
      const state = await service.create({ ...command, intents: [{ kind: "deliver", route: "inbox", message }] });
      let calls = 0;
      const settle = async (context: ApplicationDispatchContext) => ({ status: "settled", result: { kind: "delivery", message, idempotencyKey: context.dispatch.identity } });
      const dispatcher = { configurationDigest: hash("fault-dispatcher"), async dispatch(context: ApplicationDispatchContext) { calls++; return settle(context); }, reconcile: settle };
      await expect(service.dispatchPending("portable", dispatcher)).rejects.toThrow(point);
      const restarted = new ApplicationCore(adapter, admission);
      const records = await restarted.dispatchPending("portable", dispatcher);
      expect(calls).toBe(point === "dispatch-started" ? 0 : 1);
      if (point === "dispatch-started") expect(records[0]?.status).toBe("started");
      else expect(records).toEqual([]);
      expect((await restarted.reconcileDispatch("portable", state.transition.intents[0]!, dispatcher)).status).toBe("settled");
      expect(calls).toBe(point === "dispatch-started" ? 0 : 1);
    });
  }
}

test("injected storage serializes competing owners and leaves denied namespaces unreserved", async () => {
  const adapter = new MemoryApplicationStorage(), { command } = await fixture(adapter);
  const denied = new ApplicationCore(adapter, { async admitCommit() { throw new Error("denied"); } });
  await expect(denied.create(command)).rejects.toThrow("denied");
  expect(await adapter.readHead("portable")).toBeUndefined();
  expect(await adapter.operationCount("portable")).toBe(0);
  let admissions = 0;
  const admit = { async admitCommit() { admissions++; await Promise.resolve(); } };
  const one = new ApplicationCore(adapter, admit), two = new ApplicationCore(adapter, admit);
  const [a, b] = await Promise.all([one.create(command), two.create(command)]);
  expect(a).toEqual(b); expect(admissions).toBe(1);
  const commands = ["one", "two"].map(label => ({ ...command, kind: "memory", expectedHead: a.digest, operation: hash(label) }));
  const results = await Promise.allSettled([one.commit(commands[0]), two.commit(commands[1])]);
  expect(results.filter(result => result.status === "fulfilled")).toHaveLength(1);
  expect((await one.history("portable")).length).toBe(2);
});

test("portable hosts retain identical proposal, restoration, migration and drain semantics", async () => {
  const traces = [];
  for (const kind of ["memory", "filesystem"] as const) {
    const adapter = await storage(kind), { service, command, revisionValue } = await fixture(adapter), store = adapter.store;
    const put = (value: unknown) => store.putValue(applicationJson(value));
    const schema = await put({ contract: "algal.application-memory-schema.v1", relations: [{ name: "available", arity: 1 }] });
    const program = await put({ contract: "algal.query.v1", rules: [], query: { relation: "available", terms: [{ var: "value" }, { var: "polarity" }] }, limits: APPLICATION_MEMORY_NATIVE_LIMITS });
    const query = await put({ contract: "algal.application-memory-query.v1", id: "ready", schema, program, procedures: [], polarityColumn: 1, conflict: "single-value" });
    const queries = await put({ contract: "algal.application-memory-queries.v1", queries: [query] });
    const evaluationPolicy = await put({ contract: "algal.application-evaluation-policy.v1", maxCases: 3, maxWork: 100_000, maxModelCalls: 0, requireHoldoutPass: true, strictValidationImprovement: true });
    const strategy = (value: string) => parseOrganismManifest({ contract: "algal.organism.v1", key: "organism:portable-strategy", name: "Strategy", interface: { inputs: {}, outputs: { value: { cell: "out", port: "value" } } }, cells: [{ id: "out", kind: "const", outputs: { value: { type: "json", value } } }], edges: [] });
    const incumbent = await store.putManifest(strategy("before"));
    const generator = await store.putManifest(parseOrganismManifest({ contract: "algal.organism.v1", key: "organism:portable-generator", name: "Generator", interface: { inputs: {}, outputs: { candidates: { cell: "out", port: "value" } } }, cells: [{ id: "out", kind: "const", outputs: { value: { type: "json", value: [manifestToJson(strategy("after"))] } } }], edges: [] }));
    const entry = (name: string, manifest: typeof incumbent) => ({ name, manifest, applicability: query, maxGenerations: 1, capabilities: [], queries: [query] });
    const revision = await put({ ...revisionValue, schema, queries, evaluationPolicy, entrypoints: [entry("generate", generator), entry("run", incumbent)] });
    const initial = await service.create({ ...command, revision });
    const proposal = await proposeApplicationRevision(service, { application: "portable", operation: hash("proposal"), expectedHead: initial.digest, generator: "generate", target: "run", arguments: await put({}), output: "candidates", policy: evaluationPolicy }, { fns: builtinRegistry() });
    expect(proposal.status).toBe("generated");
    await verifyApplicationProposal(store, proposal.proposal, initial.digest, { fns: builtinRegistry() });
    expect(proposal.snapshot.state.revision).toBe(revision);
    // Fixture admission isolates structural lifecycle conformance; production
    // evaluation/activation authority remains the admitting host's obligation.
    const active = await service.commit({ ...command, kind: "activate", operation: hash("activate"), expectedHead: proposal.snapshot.digest, revision: proposal.candidates[0]!.revision });
    const restore = await restoreApplicationRevision(service, { application: "portable", operation: hash("restore"), expectedHead: active.digest, targetState: initial.digest, policy: await put({ contract: "algal.application-restoration-policy.v1", application: "portable", mode: "retained-pure-strategy-manifests" }) });
    expect(restore.snapshot.state.memory).toBe(initial.state.memory);
    expect(restore.snapshot.revision.entrypoints.find(value => value.name === "run")!.manifest).toBe(incumbent);
    const message = await put({ fixture: "drain" });
    const work = await service.commit({ ...command, kind: "investigate", operation: hash("pending-work"), expectedHead: restore.snapshot.digest, revision: restore.revision, intents: ["first", "second"].map(route => ({ kind: "deliver", route, message })) });
    const nextSchema = await put({ contract: "algal.application-memory-schema.v1", relations: [{ name: "moved", arity: 1 }] });
    const candidate = await put({ ...work.revision, parent: work.state.revision, schema: nextSchema });
    const migration = await put({ contract: "algal.application-migration.v1", application: "portable", from: work.state.memory, previousRevision: work.state.revision, candidateRevision: candidate, program: incumbent, receipt: incumbent, claims: [] });
    const observation = await put({ contract: "algal.application-memory-observation.v1", application: "portable", scope: nextSchema, procedure: nextSchema, raw: migration, receipt: nextSchema, decoder: nextSchema, admission: nextSchema, claims: [] });
    const memory = await put({ contract: "algal.application-memory.v1", application: "portable", schema: nextSchema, previous: null, scope: nextSchema, observations: [observation], hypotheses: [], withdrawn: [] });
    const migrate: ApplicationCommand = { ...command, kind: "migrate", operation: hash("migrate"), expectedHead: work.digest, revision: candidate, memory, evidence: [migration] };
    await expect(service.commit(migrate)).rejects.toThrow("Pending intents require explicit drain");
    const [abandoned, carried] = work.transition.intents;
    const drain = await produceApplicationDrain(service, { application: "portable", parentState: work.digest, dispositions: [{ intent: abandoned!, status: "abandoned" }, { intent: carried!, status: "migrated" }] });
    const migrated = await service.commit({ ...migrate, evidence: [migration, drain].sort() });
    expect((await service.undispatchedPending("portable", migrated.digest)).map(value => value.intent)).toEqual([carried!]);
    const settled = await service.dispatchPending("portable", { configurationDigest: hash("drain-dispatcher"), async dispatch(context) { return { status: "settled", result: { kind: "delivery", message, idempotencyKey: context.dispatch.identity } }; } });
    expect(settled).toHaveLength(1);
    expect(settled[0]!.intent).toBe(carried!);
    traces.push({ proposal, restore, drain, settled, history: await new ApplicationCore(adapter, admission).history("portable") });
  }
  expect(traces[0]).toEqual(traces[1]);
});

test("portable application bundle has no eager filesystem or SQLite dependency", async () => {
  const forbidden: string[] = [];
  const result = await Bun.build({
    entrypoints: [join(import.meta.dir, "application-core.ts"), join(import.meta.dir, "application-storage.ts")],
    target: "browser", external: ["node:crypto"],
    plugins: [{ name: "no-host-filesystem", setup(build) {
      build.onResolve({ filter: /^(?:node:fs(?:\/.*)?|bun:sqlite)$/ }, args => {
        forbidden.push(`${args.importer}: ${args.path}`);
        throw new Error("Portable application imported " + args.path);
      });
    } }],
  });
  expect(forbidden).toEqual([]);
  expect(result.success).toBe(true);
  expect(result.outputs.length).toBeGreaterThan(0);
});

test("injected namespace publication fences competing first writers at capacity", async () => {
  const adapter = new MemoryApplicationStorage(), { command, revisionValue } = await fixture(adapter);
  const create = async (application: string): Promise<ApplicationCommand> => ({ ...command, application, operation: hash(application), revision: await adapter.store.putValue({ ...revisionValue, application }) });
  const ordinary = new ApplicationCore(adapter, admission);
  for (let index = 0; index < 31; index++) await ordinary.create(await create(`existing-${index}`));
  let entered = 0, release!: () => void;
  const admitted = new Promise<void>(resolve => { release = resolve; });
  const barrier: ApplicationAdmission = { async admitCommit() { if (++entered === 2) release(); await admitted; } };
  const a = await create("last-a"), b = await create("last-b");
  const results = await Promise.allSettled([new ApplicationCore(adapter, barrier).create(a), new ApplicationCore(adapter, barrier).create(b)]);
  expect(entered).toBe(2);
  expect(results.filter(result => result.status === "fulfilled")).toHaveLength(1);
  expect(results.filter(result => result.status === "rejected")).toHaveLength(1);
  expect([await adapter.readHead("last-a"), await adapter.readHead("last-b")].filter(value => value !== undefined)).toHaveLength(1);
  const loser = results[0]!.status === "rejected" ? "last-a" : "last-b";
  expect(await adapter.operationCount(loser)).toBe(0);
});

test("prepared genesis retains namespace allocation yet can recover at capacity", async () => {
  const adapter = new MemoryApplicationStorage(), { command, revisionValue } = await fixture(adapter);
  const interrupted = new ApplicationCore(adapter, admission, { fault(point) { if (point === "prepared") throw new Error("prepared genesis interruption"); } });
  await expect(interrupted.create(command)).rejects.toThrow("prepared genesis interruption");
  expect(await adapter.readHead(command.application)).toBeUndefined();
  expect(await adapter.operationCount(command.application)).toBe(1);
  const service = new ApplicationCore(adapter, admission);
  for (let index = 0; index < 31; index++) {
    const application = `other-${index}`;
    await service.create({ ...command, application, operation: hash(application), revision: await adapter.store.putValue({ ...revisionValue, application }) });
  }
  await expect(service.create({ ...command, application: "overflow", operation: hash("overflow"), revision: await adapter.store.putValue({ ...revisionValue, application: "overflow" }) })).rejects.toThrow("exhausted");
  const recovered = await service.create(command);
  expect(recovered.state.sequence).toBe(0);
  expect(await service.create(command)).toEqual(recovered);
});
