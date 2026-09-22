import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ApplicationService, type ApplicationDispatcher } from "./application";
import { getApplicationRecord, applicationJson } from "./application-contract";
import { createApplicationPolicyHost } from "./application-host";
import { ApplicationMemoryService, parseMemoryArchive, parseMemoryObservation, parseMemorySnapshot, APPLICATION_MEMORY_NATIVE_LIMITS, APPLICATION_MEMORY_ARCHIVE_LIMIT } from "./application-memory";
import { appendObservation } from "./application-observation";
import { rolloverApplicationMemory } from "./application-rollover";
import { capabilityHandle } from "./capabilities";
import { parseOrganismManifest } from "./contract";
import { digestCanonical, type Digest } from "./digest";

const directories: string[] = [];
afterEach(async () => { for (const directory of directories.splice(0)) await rm(directory, { recursive: true, force: true }); });
const hash = (value: unknown) => digestCanonical(applicationJson(value));

async function fixture(count = 4) {
  const directory = await mkdtemp(join(tmpdir(), "algal-rollover-")); directories.push(directory);
  // The policy host uses this engine only for episodes; rollover never queries.
  const engine = { identity: hash("unused-rollover-engine"), async query(): Promise<never> { throw new Error("unexpected query"); }, async verify(): Promise<never> { throw new Error("unexpected verify"); }, async settle() {} };
  const bootstrap = new ApplicationService(directory, { async admitCommit() { throw new Error("bootstrap cannot commit"); } });
  const store = bootstrap.store, put = (value: unknown) => store.putValue(applicationJson(value));
  const schema = await put({ contract: "algal.application-memory-schema.v1", relations: [{ name: "available", arity: 1 }] });
  const decoder = await put({ contract: "algal.rollover-decoder.v1" });
  const manifest = await store.putManifest(parseOrganismManifest({ contract: "algal.organism.v1", key: "organism:rollover", name: "rollover", cells: [{ id: "out", kind: "const", outputs: { value: { type: "json", value: "ready" } } }], edges: [] }));
  const procedure = await put({ contract: "algal.application-memory-procedure.v1", id: "ready", schema, manifest, decoder, dependencies: [], prerequisite: null });
  const program = await put({ contract: "algal.query.v1", rules: [], query: { relation: "available", terms: [{ var: "value" }, { var: "polarity" }] }, limits: APPLICATION_MEMORY_NATIVE_LIMITS });
  const query = await put({ contract: "algal.application-memory-query.v1", id: "ready", schema, program, procedures: [procedure], polarityColumn: 1, conflict: "set-of-values" });
  const queries = await put({ contract: "algal.application-memory-queries.v1", queries: [query] });
  const views = await put({ contract: "algal.application-view-spec.v1", title: "Rollover", widgets: ["memory"] });
  const runtimeProfile = await put({ contract: "algal.application-runtime-profile.v1", runtime: "bun-native-memory", policy: "pure-case-evaluation.v1" });
  const evaluationPolicy = await put({ contract: "algal.application-evaluation-policy.v1", maxCases: 3, maxWork: 1000, maxModelCalls: 0, requireHoldoutPass: true, strictValidationImprovement: true });
  const frontier = await put({ contract: "algal.application-memory-frontier.v1", application: "workspace", previous: null, sequence: 0, mutation: null, status: "settled" });
  const attestation = await put({ contract: "algal.rollover-attestation.v1" });
  const scope = await put({ contract: "algal.application-memory-scope.v1", application: "workspace", environment: "fixture", task: "rollover", frontier, bindings: [], completeFor: [procedure], attestation });
  const policy = { contract: "algal.application-host.v1", application: "workspace", frontier, hostProfile: hash("profile"), episodeAccess: "observe", routes: [{ route: "document", recipient: capabilityHandle("mailbox-send", "fixture"), hostProfile: hash("profile") }], attestation: "algal.rollover-attestation.v1", decoders: [{ decoder, rawContract: "algal.rollover-raw.v1", receiptContract: "algal.rollover-receipt.v1", receiptBinding: "names-raw" }] };
  const host = createApplicationPolicyHost(policy, { channelsDir: join(directory, "channels"), memoryEngine: engine });
  const service = new ApplicationService(directory, host), memory = new ApplicationMemoryService({ store, engine, admission: host });
  const observationInput = async (n: number) => {
    const raw = await put({ contract: "algal.rollover-raw.v1", claims: [{ relation: "available", tuple: [n === 0 ? "project-ready" : `note-${n}`], polarity: "supported" }] });
    return { application: "workspace", scope, procedure, decoder, raw, receipt: await put({ contract: "algal.rollover-receipt.v1", raw }) };
  };
  const observations: Digest[] = [];
  for (let n = 0; n < count; n++) observations.push(await memory.observe(await observationInput(n)));
  const withdrawn = observations.slice(1, 3).sort();
  const initialMemory = await memory.snapshot({ application: "workspace", schema, previous: null, scope, observations: [...observations].sort(), hypotheses: [], withdrawn });
  const revision = await put({ contract: "algal.application-revision.v1", application: "workspace", parent: null, schema, queries, views, runtimeProfile, evaluationPolicy, capabilityRequirements: [], entrypoints: [{ name: "run", manifest, applicability: query, maxGenerations: 1, capabilities: [], queries: [query] }] });
  const genesis = await service.create({ application: "workspace", operation: hash("create"), kind: "create", expectedHead: null, revision, memory: initialMemory, intents: [], evidence: [], causedBy: null });
  const input = { application: "workspace", operation: hash("rollover"), expectedHead: genesis.digest, expectedMemory: initialMemory, retainObservations: observations.slice(0, 2).sort(), retainHypotheses: [] };
  return { directory, store, put, service, memory, host, genesis, observations, input, observationInput };
}

describe("application active-memory rollover", () => {
  test("admits more than 128 cumulative observations while preserving source bytes and selected prerequisites", async () => {
    const f = await fixture(128), observed = await f.observationInput(129);
    await expect(appendObservation(f.service, f.memory, { application: "workspace", operation: hash("full"), expectedHead: f.genesis.digest, expectedMemory: f.genesis.state.memory, observation: observed })).rejects.toThrow("bound");
    const rolled = await rolloverApplicationMemory(f.service, f.memory, f.input);
    const appended = await appendObservation(f.service, f.memory, { application: "workspace", operation: hash("append-129"), expectedHead: rolled.snapshot.digest, expectedMemory: rolled.memory, observation: observed });
    const active = await getApplicationRecord(f.store, appended.memory, parseMemorySnapshot);
    expect(active.archive).toBe(rolled.archive);
    expect(active.observations).toContain(f.observations[0]!);
    expect(active.withdrawn).toEqual([f.observations[1]!]);
    expect(active.observations.length).toBe(3);
    const history = await f.memory.archiveHistory(appended.memory);
    expect(history.length).toBe(1);
    expect(history[0]!.archive.snapshot).toBe(f.genesis.state.memory);
    expect(history[0]!.snapshot.observations).toEqual([...f.observations].sort());
    const retainedSources = await Promise.all(f.observations.map(async reference => {
      const observation = await getApplicationRecord(f.store, reference, parseMemoryObservation);
      return [await f.store.getValue(observation.raw), await f.store.getValue(observation.receipt)];
    }));
    expect(retainedSources.flat().every(value => value !== undefined)).toBe(true);
    expect((await new ApplicationService(f.directory, f.host).inspect("workspace"))!.digest).toBe(appended.snapshot.digest);
    expect((await rolloverApplicationMemory(f.service, f.memory, f.input)).snapshot.digest).toBe(rolled.snapshot.digest);
    await expect(rolloverApplicationMemory(f.service, f.memory, { ...f.input, retainObservations: [f.observations[0]!] })).rejects.toThrow("another request");
  });

  test("rejects silent pruning, archive loss, foreign cutovers and retired observation resurrection", async () => {
    const f = await fixture(), rolled = await rolloverApplicationMemory(f.service, f.memory, f.input);
    const prior = await getApplicationRecord(f.store, rolled.memory, parseMemorySnapshot);
    const { contract: _contract, ...body } = prior;
    const successor = { ...body, previous: rolled.memory };
    await expect(f.memory.snapshot({ ...successor, observations: [f.observations[0]!], withdrawn: [] })).rejects.toThrow("silently disappear");
    const { archive: _archive, ...dropped } = successor;
    await expect(f.memory.snapshot(dropped)).rejects.toThrow("exact predecessor");
    await expect(f.memory.snapshot({ ...successor, observations: [...prior.observations, f.observations[2]!].sort() })).rejects.toThrow("resurrected");
    const originalArchive = await getApplicationRecord(f.store, rolled.archive, parseMemoryArchive);
    const foreign = await f.put({ ...originalArchive, application: "foreign" });
    await expect(f.memory.snapshot({ ...successor, archive: foreign })).rejects.toThrow("application/schema");
    await expect(f.memory.snapshot({ ...successor, archive: hash("missing-archive") })).rejects.toThrow("Missing");
    await expect(f.memory.rollover({ memory: rolled.memory, retainObservations: [f.observations[0]!, f.observations[3]!].sort(), retainHypotheses: [] })).rejects.toThrow("only retain");
    await expect(f.memory.rollover({ memory: rolled.memory, retainObservations: prior.observations, retainHypotheses: [] })).rejects.toThrow("must retire");
    expect(() => parseMemoryArchive({ ...originalArchive, sequence: APPLICATION_MEMORY_ARCHIVE_LIMIT })).toThrow();
    expect(() => parseMemorySnapshot({ ...prior, archive: null })).toThrow();
    expect(() => parseMemoryArchive({ ...originalArchive, extra: true })).toThrow();
  });

  test("cutover withdrawals remain selected and archives cannot be reset by a second rollover", async () => {
    const f = await fixture(), first = await rolloverApplicationMemory(f.service, f.memory, f.input);
    const prior = await getApplicationRecord(f.store, first.memory, parseMemorySnapshot);
    const archive = await f.put({ contract: "algal.application-memory-archive.v1", application: "workspace", schema: prior.schema, sequence: 1, previous: first.archive, snapshot: first.memory });
    await expect(f.memory.snapshot({ application: prior.application, schema: prior.schema, scope: prior.scope, previous: first.memory, observations: [f.observations[1]!], withdrawn: [], hypotheses: [], archive })).rejects.toThrow("selected withdrawals");
    const second = await f.memory.rollover({ memory: first.memory, retainObservations: [f.observations[0]!], retainHypotheses: [] });
    expect((await f.memory.archiveHistory(second.memory)).map(entry => entry.archive.sequence)).toEqual([1, 0]);
    const badArchive = await f.put({ contract: "algal.application-memory-archive.v1", application: "workspace", schema: prior.schema, sequence: 0, previous: null, snapshot: first.memory });
    await expect(f.memory.snapshot({ application: prior.application, schema: prior.schema, scope: prior.scope, previous: first.memory, observations: [f.observations[0]!], withdrawn: [], hypotheses: [], archive: badArchive })).rejects.toThrow("lineage");
    await expect(rolloverApplicationMemory(f.service, f.memory, { ...f.input, operation: hash("stale") })).rejects.toThrow("Stale");
  });

  test("rollover preserves an uncertain dispatch and never invokes or retries it", async () => {
    const f = await fixture(), message = await f.put({ contract: "algal.document-request.v1" });
    const intentState = await f.service.commit({ application: "workspace", operation: hash("deliver"), kind: "investigate", expectedHead: f.genesis.digest, revision: f.genesis.state.revision, memory: f.genesis.state.memory, intents: [{ kind: "deliver", route: "document", message }], evidence: [], causedBy: null });
    let calls = 0;
    const dispatcher: ApplicationDispatcher = { configurationDigest: hash("uncertain-dispatcher"), async dispatch() { calls++; return { status: "uncertain", reason: "acknowledgment lost" }; } };
    const [dispatch] = await f.service.dispatchPending("workspace", dispatcher);
    const rolled = await rolloverApplicationMemory(f.service, f.memory, { ...f.input, expectedHead: intentState.digest });
    expect(rolled.snapshot.state.revision).toBe(intentState.state.revision);
    expect(rolled.snapshot.state.epoch).toBe(intentState.state.epoch);
    expect(rolled.snapshot.transition.intents).toEqual([]);
    expect((await f.service.dispatchPending("workspace", dispatcher))[0]).toEqual(dispatch);
    expect(calls).toBe(1);
  });

  test("a lost head acknowledgment reopens and replays the same rollover without another transition", async () => {
    const f = await fixture();
    const interrupted = new ApplicationService(f.directory, f.host, { fault(point) { if (point === "head-published") throw new Error("acknowledgment lost"); } });
    await expect(rolloverApplicationMemory(interrupted, f.memory, f.input)).rejects.toThrow("acknowledgment uncertain");
    const reopened = new ApplicationService(f.directory, f.host), selected = await reopened.inspect("workspace");
    const recovered = await rolloverApplicationMemory(reopened, f.memory, f.input);
    expect(recovered.snapshot.digest).toBe(selected!.digest);
    expect((await reopened.history("workspace")).length).toBe(2);
    expect((await f.memory.archiveHistory(recovered.memory)).length).toBe(1);
  });
});
