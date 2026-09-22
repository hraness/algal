import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ApplicationService, type ApplicationDispatcher } from "./application";
import { applicationJson } from "./application-contract";
import { createApplicationPolicyHost } from "./application-host";
import { ApplicationMemoryService, APPLICATION_MEMORY_NATIVE_LIMITS } from "./application-memory";
import { restoreApplicationRevision, parseApplicationRestorationPolicy, type ApplicationRestorationPolicy } from "./application-restoration";
import { capabilityHandle } from "./capabilities";
import { manifestToJson, parseOrganismManifest } from "./contract";
import { digestCanonical } from "./digest";
const directories: string[] = [];
afterEach(async () => { for (const directory of directories.splice(0)) await rm(directory, { recursive: true, force: true }); });
const hash = (value: unknown) => digestCanonical(applicationJson(value));
const strategy = (value: string) => parseOrganismManifest({ contract: "algal.organism.v1", key: "organism:strategy", name: "Strategy", interface: { inputs: {}, outputs: { strategy: { cell: "out", port: "value" } } }, cells: [{ id: "out", kind: "const", outputs: { value: { type: "json", value } } }], edges: [] });
async function fixture(original = strategy("prior"), latest = strategy("current")) {
  const directory = await mkdtemp(join(tmpdir(), "algal-restoration-")); directories.push(directory);
  // The policy host uses this engine only for episodes; rollover never queries.
  const engine = { identity: hash("unused-rollover-engine"), async query(): Promise<never> { throw new Error("unexpected query"); }, async verify(): Promise<never> { throw new Error("unexpected verify"); }, async settle() {} };
  const bootstrap = new ApplicationService(directory, { async admitCommit() { throw new Error("bootstrap cannot commit"); } });
  const store = bootstrap.store, put = (value: unknown) => store.putValue(applicationJson(value));
  const schema = await put({ contract: "algal.application-memory-schema.v1", relations: [{ name: "available", arity: 1 }] });
  const decoder = await put({ contract: "algal.rollover-decoder.v1" });
  const manifest = await store.putManifest(original);
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
  const restorationPolicy: ApplicationRestorationPolicy = { contract: "algal.application-restoration-policy.v1", application: "workspace", mode: "retained-pure-strategy-manifests" };
  const host = createApplicationPolicyHost(policy, { channelsDir: join(directory, "channels"), memoryEngine: engine, restorationPolicy });
  const service = new ApplicationService(directory, host), memory = new ApplicationMemoryService({ store, engine, admission: host });
  const initialMemory = await memory.snapshot({ application: "workspace", schema, previous: null, scope, observations: [], hypotheses: [], withdrawn: [] });
  const revisionBody = { contract: "algal.application-revision.v1", application: "workspace", parent: null, schema, queries, views, runtimeProfile, evaluationPolicy, capabilityRequirements: [], entrypoints: [{ name: "run", manifest, applicability: query, maxGenerations: 1, capabilities: [], queries: [query] }] };
  const revision = await put(revisionBody);
  const genesis = await service.create({ application: "workspace", operation: hash("create"), kind: "create", expectedHead: null, revision, memory: initialMemory, intents: [], evidence: [], causedBy: null });
  // Set up an admitted later revision with a fixture host; restoration itself
  // always runs through the production policy host and lifecycle checks.
  const fixtureHost = { ...host, async admitCommit() {} };
  const admission = new ApplicationService(directory, fixtureHost);
  const nextViews = await put({ contract: "algal.application-view-spec.v1", title: "Current title", widgets: ["memory"] });
  const currentRevision = await put({ ...revisionBody, parent: revision, views: nextViews, entrypoints: [{ ...revisionBody.entrypoints[0], manifest: await store.putManifest(latest) }] });
  const active = await admission.commit({ application: "workspace", operation: hash("activate"), kind: "activate", expectedHead: genesis.digest, revision: currentRevision, memory: initialMemory, intents: [], evidence: [], causedBy: null });
  const currentMemory = await memory.snapshot({ application: "workspace", schema, previous: initialMemory, scope, observations: [], hypotheses: [], withdrawn: [] });
  const current = await service.commit({ application: "workspace", operation: hash("memory"), kind: "memory", expectedHead: active.digest, revision: currentRevision, memory: currentMemory, intents: [], evidence: [], causedBy: null });
  const policyRef = await put(restorationPolicy);
  const input = { application: "workspace", operation: hash("restore"), expectedHead: current.digest, targetState: genesis.digest, policy: policyRef };
  return { directory, put, store, service, current, genesis, host, policy, restorationPolicy, input, engine };
}

describe("application pure strategy restoration", () => {
  test("moves forward while preserving current memory, metadata, and operation identity", async () => {
    const f = await fixture(), result = await restoreApplicationRevision(f.service, f.input);
    expect(result.snapshot.state.epoch).toBe(f.current.state.epoch + 1);
    expect(result.snapshot.state.memory).toBe(f.current.state.memory);
    expect(result.snapshot.revision).toEqual({ ...f.current.revision, parent: f.current.state.revision, entrypoints: [{ ...f.current.revision.entrypoints[0]!, manifest: f.genesis.revision.entrypoints[0]!.manifest }] });
    expect(result.snapshot.transition.intents).toEqual([]);
    const reopened = new ApplicationService(f.directory, f.host);
    expect((await reopened.inspect("workspace"))!.digest).toBe(result.snapshot.digest);
    expect((await restoreApplicationRevision(reopened, f.input)).snapshot.digest).toBe(result.snapshot.digest);
    await expect(restoreApplicationRevision(reopened, { ...f.input, operation: hash("stale") })).rejects.toThrow("Stale");
  });

  test("CAS policies do not authorize restoration and foreign or unknown host options fail closed", async () => {
    const f = await fixture();
    const denied = new ApplicationService(f.directory, createApplicationPolicyHost(f.policy, { channelsDir: join(f.directory, "channels") }));
    await expect(restoreApplicationRevision(denied, f.input)).rejects.toThrow("denies restoration");
    expect(() => parseApplicationRestorationPolicy({ ...f.restorationPolicy, extra: true })).toThrow();
    expect(() => createApplicationPolicyHost(f.policy, { channelsDir: f.directory, restorationPolicy: { ...f.restorationPolicy, application: "foreign" } })).toThrow("another application");
    const foreign = await f.put({ ...f.restorationPolicy, application: "foreign" });
    await expect(restoreApplicationRevision(f.service, { ...f.input, policy: foreign })).rejects.toThrow("another application");
    expect((await f.service.inspect("workspace"))!.digest).toBe(f.current.digest);
  });

  test("rejects non-ancestors, no-op targets and widened budgets or compiled interfaces", async () => {
    const f = await fixture();
    await expect(restoreApplicationRevision(f.service, { ...f.input, targetState: f.current.digest })).rejects.toThrow("retained ancestor");
    await expect(restoreApplicationRevision(f.service, { ...f.input, targetState: f.current.state.previous! })).rejects.toThrow("must change");
    const original = strategy("prior"), reduced = parseOrganismManifest({ ...manifestToJson(strategy("current")) as object, budgets: { ...original.budgets, maxWork: original.budgets.maxWork - 1 } });
    const budget = await fixture(original, reduced);
    await expect(restoreApplicationRevision(budget.service, budget.input)).rejects.toThrow("widens a manifest budget");
    const changed = parseOrganismManifest({ ...manifestToJson(strategy("current")) as object, interface: { inputs: {}, outputs: { renamed: { cell: "out", port: "value" } } } });
    const iface = await fixture(original, changed);
    await expect(restoreApplicationRevision(iface.service, iface.input)).rejects.toThrow("compiled interface");
    const agent = parseOrganismManifest({ contract: "algal.organism.v1", key: "organism:agent", name: "Agent", cells: [{ id: "out", kind: "agent", prompt: "Never executed", output: { kind: "text" } }], edges: [] });
    const effectful = await fixture(original, agent);
    await expect(restoreApplicationRevision(effectful.service, effectful.input)).rejects.toThrow("pure strategy");
  });

  test("core lifecycle rejects altered metadata, memory, intents and missing evidence under a trusted host", async () => {
    const f = await fixture(), result = await restoreApplicationRevision(f.service, f.input);
    const raw = { application: "workspace", operation: hash("raw"), kind: "restore", expectedHead: result.snapshot.digest, revision: result.revision, memory: result.snapshot.state.memory, intents: [], evidence: [], causedBy: null };
    // A second forward child has a genuine ancestor target, but never gains
    // permission to smuggle metadata or forget the current memory.
    const bypass = new ApplicationService(f.directory, { async admitCommit() {} });
    const revision = await f.put({ ...f.current.revision, parent: result.revision, views: f.genesis.revision.views });
    const evidence = await f.put({ contract: "algal.application-restoration.v1", application: "workspace", parentState: result.snapshot.digest, targetState: f.current.digest, candidateRevision: revision, policy: f.input.policy });
    await expect(bypass.commit({ ...raw, revision, evidence: [evidence] })).rejects.toThrow("metadata and authority");
    await expect(bypass.commit({ ...raw, revision, evidence: [evidence], memory: f.genesis.state.memory })).rejects.toThrow("preserve current memory");
    await expect(bypass.commit({ ...raw, revision, evidence: [evidence], intents: [{ kind: "deliver", route: "document", message: await f.put("message") }] })).rejects.toThrow("create no intents");
    await expect(bypass.commit({ ...raw, revision })).rejects.toThrow("exactly one");
  });

  test("uncertain dispatch remains a restoration barrier without retry or custody loss", async () => {
    const f = await fixture();
    const intent = await f.service.commit({ application: "workspace", operation: hash("deliver"), kind: "investigate", expectedHead: f.current.digest, revision: f.current.state.revision, memory: f.current.state.memory, intents: [{ kind: "deliver", route: "document", message: await f.put("message") }], evidence: [], causedBy: null });
    let calls = 0;
    const dispatcher: ApplicationDispatcher = { configurationDigest: hash("dispatcher"), async dispatch() { calls++; return { status: "uncertain", reason: "lost response" }; } };
    const pending = await f.service.dispatchPending("workspace", dispatcher);
    await expect(restoreApplicationRevision(f.service, { ...f.input, expectedHead: intent.digest })).rejects.toThrow("Unsettled dispatch");
    expect(await f.service.dispatchPending("workspace", dispatcher)).toEqual(pending);
    expect(calls).toBe(1);
  });

  test("reconciles a lost head acknowledgement to the exact forward restoration", async () => {
    const f = await fixture();
    const interrupted = new ApplicationService(f.directory, f.host, { fault(point) { if (point === "head-published") throw new Error("lost acknowledgement"); } });
    await expect(restoreApplicationRevision(interrupted, f.input)).rejects.toThrow("acknowledgment uncertain");
    const reopened = new ApplicationService(f.directory, f.host), result = await restoreApplicationRevision(reopened, f.input);
    expect((await reopened.inspect("workspace"))!.digest).toBe(result.snapshot.digest);
    expect((await reopened.history("workspace")).length).toBe(4);
  });
});
