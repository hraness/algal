import { expect } from "bun:test";
import { access, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ApplicationService, type ApplicationDispatcher } from "./application";
import { produceApplicationDrain } from "./application-drain";
import { createApplicationPolicyHost, readApplicationChannel } from "./application-host";
import { verifyInterappDelivery, verifyInterappMessage } from "./application-message";
import { capabilityHandle } from "./capabilities";
import { parseOrganismManifest } from "./contract";
import { digestCanonical, type Digest } from "./digest";
import { ApplicationTestScope, applicationTests } from "./fixtures/application-test-scope";
import { hostRead, hostWrite } from "./host-state";
import type { JsonValue } from "./values";

const { test, resources } = applicationTests();
const hash = (value: unknown) => digestCanonical(value as JsonValue);
async function fixture(fault?: (point: string) => void) {
  const dir = resources().directory(await mkdtemp(join(tmpdir(), "algal-application-model-")));
  const channelsDir = join(dir, "channels");
  const recipient = capabilityHandle("mailbox-send", { fixture: "model" });
  const policy = { contract: "algal.application-host.v1", application: "model", frontier: hash("frontier"), hostProfile: hash("profile"), episodeAccess: "observe", routes: [{ route: "inbox", recipient, hostProfile: hash("profile") }], attestation: null, decoders: [] };
  const host = createApplicationPolicyHost(policy, { channelsDir });
  // Lifecycle fixtures use trusted commit admission; dispatch always uses the
  // production policy host. No fixture query result grants episode authority.
  const service = new ApplicationService(dir, { ...host, async admitCommit() {} }, fault ? { fault } : {});
  const put = (value: unknown) => service.store.putValue(value as JsonValue);
  const manifest = await service.store.putManifest(parseOrganismManifest({ contract: "algal.organism.v1", key: "organism:application-model", name: "Application model", cells: [{ id: "out", kind: "const", outputs: { value: { type: "json", value: "ok" } } }], edges: [] }));
  const schema = await put({ contract: "algal.application-memory-schema.v1", relations: [{ name: "ready", arity: 1 }] });
  const query = await put({ contract: "algal.fixture-query.v1" });
  const body = { contract: "algal.application-revision.v1", application: "model", parent: null, schema, queries: query, views: query, runtimeProfile: query, evaluationPolicy: query, capabilityRequirements: [], entrypoints: [{ name: "run", manifest, applicability: query, maxGenerations: 1, capabilities: [], queries: [query] }] };
  const revision = await put(body), memory = await put({ contract: "algal.fixture-memory.v1", facts: [] });
  const command = { application: "model", operation: hash("create"), kind: "create", expectedHead: null, revision, memory, intents: [], evidence: [], causedBy: null };
  return { dir, channelsDir, recipient, service, host, put, body, command };
}

test("an indexed exact retry returns its historical result after head advance and new host denial", async () => {
  const f = await fixture(), initial = await f.service.create(f.command);
  const next = await f.service.commit({ ...f.command, operation: hash("advance"), kind: "memory", expectedHead: initial.digest, memory: await f.put({ facts: ["new"] }) });
  let admissions = 0;
  const denied = new ApplicationService(f.dir, { async admitCommit() { admissions++; throw new Error("fresh commit denied"); } });
  expect((await denied.create(f.command)).digest).toBe(initial.digest);
  await expect(denied.create({ ...f.command, memory: next.state.memory })).rejects.toThrow("another request");
  await expect(denied.commit({ ...f.command, operation: hash("fresh"), kind: "memory", expectedHead: next.digest, memory: next.state.memory })).rejects.toThrow("fresh commit denied");
  expect(admissions).toBe(1);
  expect((await denied.inspect("model"))!.digest).toBe(next.digest);
  expect((await denied.history("model")).map(row => row.digest)).toEqual([initial.digest, next.digest]);
});

for (const advance of [false, true]) test(`prepared orphan ${advance ? "cannot resume after head advance" : "resumes only under the original selected head"}`, async () => {
  let armed = false;
  const f = await fixture(point => { if (point === "prepared" && armed) { armed = false; throw new Error("prepared cut"); } });
  const initial = await f.service.create(f.command), message = await f.put("orphan");
  const command = { ...f.command, operation: hash("prepared"), kind: "investigate", expectedHead: initial.digest, intents: [{ kind: "deliver", route: "inbox", message }] };
  armed = true;
  await expect(f.service.commit(command)).rejects.toThrow("prepared cut");
  const operationPath = join(f.dir, "applications", "model", "operations", command.operation.slice(7) + ".json");
  const preparedBytes = await readFile(operationPath, "utf8"), prepared = JSON.parse(preparedBytes) as { state: Digest };
  expect((await f.service.inspect("model"))!.digest).toBe(initial.digest);
  expect(await f.service.dispatchPending("model", f.host)).toEqual([]);
  expect(await readApplicationChannel(f.channelsDir, "inbox")).toEqual([]);
  if (advance) {
    const newer = await f.service.commit({ ...f.command, operation: hash("winner"), kind: "memory", expectedHead: initial.digest, memory: await f.put({ facts: ["new"] }) });
    await expect(f.service.commit(command)).rejects.toThrow("Stale application head");
    expect((await f.service.inspect("model"))!.digest).toBe(newer.digest);
    expect(await f.service.dispatchPending("model", f.host)).toEqual([]);
  } else {
    expect((await f.service.commit(command)).digest).toBe(prepared.state);
    expect((await f.service.dispatchPending("model", f.host)).map(row => row.status)).toEqual(["settled"]);
    expect((await readApplicationChannel(f.channelsDir, "inbox")).length).toBe(1);
  }
  expect(await readFile(operationPath, "utf8")).toBe(preparedBytes);
  expect((await f.service.history("model")).length).toBe(2);
});

test("migration retains an original episode without granting default-host dispatch authority", async () => {
  const f = await fixture(), input = await f.put({});
  const source = await f.service.create({ ...f.command, intents: [{ kind: "start-episode", entrypoint: "run", input }] });
  const intent = source.transition.intents[0]!, originalIntent = await f.service.store.getValue(intent);
  const schema = await f.put({ contract: "algal.application-memory-schema.v1", relations: [{ name: "moved", arity: 1 }] });
  const candidate = await f.put({ ...f.body, parent: source.state.revision, schema });
  const migration = await f.put({ contract: "algal.application-migration.v1", application: "model", from: source.state.memory, previousRevision: source.state.revision, candidateRevision: candidate, program: f.body.entrypoints[0]!.manifest, receipt: f.body.entrypoints[0]!.manifest, claims: [] });
  const observation = await f.put({ contract: "algal.application-memory-observation.v1", application: "model", scope: schema, procedure: schema, raw: migration, receipt: schema, decoder: schema, admission: schema, claims: [] });
  const memory = await f.put({ contract: "algal.application-memory.v1", application: "model", schema, previous: null, scope: schema, observations: [observation], hypotheses: [], withdrawn: [] });
  const drain = await produceApplicationDrain(f.service, { application: "model", parentState: source.digest, dispositions: [{ intent, status: "migrated" }] });
  const selected = await f.service.commit({ ...f.command, operation: hash("migrate"), kind: "migrate", expectedHead: source.digest, revision: candidate, memory, evidence: [migration, drain].sort() });
  let dispatches = 0;
  const dispatcher: ApplicationDispatcher = { configurationDigest: f.host.configurationDigest, async dispatch() { dispatches++; throw new Error("must not dispatch"); } };
  expect(await f.service.dispatchPending("model", dispatcher)).toEqual([{ contract: "algal.application-admission-denied.v1", application: "model", intent, currentState: selected.digest, sourceState: source.digest, status: "denied", reason: "Episode source memory or revision is no longer selected" }]);
  expect(dispatches).toBe(0);
  expect((await f.service.undispatchedPending("model", selected.digest)).map(row => row.intent)).toEqual([intent]);
  expect(await f.service.store.getValue(intent)).toEqual(originalIntent);
  expect((await f.service.inspect("model"))!.digest).toBe(selected.digest);
});

test("channel effect, result CAS and interapp mint survive failed outbox settlement without redispatch", async () => {
  const f = await fixture(), body = { payload: "durable" }, message = await f.put(body);
  const source = await f.service.create({ ...f.command, intents: [{ kind: "deliver", route: "inbox", message }] });
  const intent = source.transition.intents[0]!, outbox = join(f.dir, "applications", "model", "outbox", intent.slice(7) + ".json");
  let dispatches = 0, reconciliations = 0;
  const dispatcher: ApplicationDispatcher = { configurationDigest: f.host.configurationDigest,
    async dispatch(context) {
      dispatches++;
      const outcome = await f.host.dispatch(context);
      await hostWrite(join(f.dir, ".application-quota", "ledger.json"), { contract: "algal.application-quota.v1", applications: [{ application: "model", bytes: 256 * 1024 * 1024 }] }, 8192, false);
      return outcome;
    },
    async reconcile(context) { reconciliations++; return f.host.reconcile!(context); },
  };
  await expect(f.service.dispatchPending("model", dispatcher)).rejects.toThrow("per-application");
  const started = await hostRead(outbox, 262144) as { status: string; identity: Digest }, retained = await readFile(outbox, "utf8");
  expect(started.status).toBe("started");
  const outcomes = [{ identity: started.identity, message }];
  expect(await readApplicationChannel(f.channelsDir, "inbox")).toEqual(outcomes);
  const result = { kind: "delivery", message, idempotencyKey: started.identity };
  expect(await f.service.store.getValue(hash(result))).toEqual(result);
  const record = { contract: "algal.interapp-message.v1" as const, application: "model", operation: f.command.operation, intent, route: "inbox", to: f.recipient, body };
  expect(await verifyInterappMessage(f.service.store, hash(record))).toEqual(record);
  await expect(verifyInterappDelivery(f.service, hash(record), { channelsDir: f.channelsDir })).rejects.toThrow("did not settle");
  expect((await f.service.dispatchPending("model", dispatcher)).map(row => row.status)).toEqual(["started"]);
  await expect(f.service.reconcileDispatch("model", intent, { ...dispatcher, configurationDigest: hash("changed") })).rejects.toThrow("configuration changed");
  expect(reconciliations).toBe(0);
  await expect(f.service.reconcileDispatch("model", intent, dispatcher)).rejects.toThrow("per-application");
  expect(dispatches).toBe(1);
  expect(reconciliations).toBe(1);
  expect(await readApplicationChannel(f.channelsDir, "inbox")).toEqual(outcomes);
  expect(await readFile(outbox, "utf8")).toBe(retained);
  expect((await f.service.inspect("model"))!.digest).toBe(source.digest);
});

test("application cleanup joins rejected owned work and publication before removing its directory", async () => {
  const scope = new ApplicationTestScope(), dir = scope.directory(await mkdtemp(join(tmpdir(), "algal-owned-cleanup-")));
  const barrier = scope.barrier();
  let published = false;
  const operation = scope.own((async () => { await barrier.wait; await writeFile(join(dir, "late"), "completed"); published = true; throw new Error("simulated assertion failure"); })());
  // This is the teardown path used after an assertion failure or Bun timeout.
  await scope.cleanup();
  await expect(operation).rejects.toThrow("simulated assertion failure");
  expect(published).toBe(true);
  await expect(access(dir)).rejects.toThrow();
});

test("a bounded unsuccessful cleanup join retains the namespace until its owner finishes", async () => {
  const scope = new ApplicationTestScope(10), dir = resources().directory(scope.directory(await mkdtemp(join(tmpdir(), "algal-retained-cleanup-"))));
  let release!: () => void;
  const blocked = new Promise<void>(done => { release = done; });
  const operation = resources().own(scope.own((async () => { await blocked; await writeFile(join(dir, "late"), "completed"); })()));
  try {
    await expect(scope.cleanup()).rejects.toThrow("retained");
    await access(dir);
    expect(() => scope.checkActive()).toThrow("teardown has started");
  } finally { release(); await operation; }
  expect(await readFile(join(dir, "late"), "utf8")).toBe("completed");
  await rm(dir, { recursive: true, force: true });
});
