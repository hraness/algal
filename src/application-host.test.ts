import { afterEach, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdtemp, rm, symlink, writeFile, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { ApplicationService, applicationProcessName, type ApplicationDispatchContext } from "./application";
import { createApplicationPolicyHost } from "./application-host";
import { dispatchApplicationEpisode, reconcileApplicationEpisode } from "./application-episode";
import { ProcessSupervisor } from "./process";
import { ProcessJournal } from "./process-journal";
import { hostWrite } from "./host-state";
import { APPLICATION_MEMORY_NATIVE_LIMITS, ApplicationMemoryService } from "./application-memory";
import { NativeMemoryQueryEngine } from "./application-native-memory";
import { requestExecution } from "./application-investigation";
import { evaluateApplicationRevision } from "./application-adaptation";
import { parseOrganismManifest } from "./contract";
import { parseWorkIntent } from "./application-contract";
import { capabilityHandle } from "./capabilities";
import { digestCanonical } from "./digest";
import { builtinRegistry } from "./registry";
import { FileStore } from "./store";
import type { JsonValue } from "./values";

const directories: string[] = [];
afterEach(async () => { for (const dir of directories.splice(0)) await rm(dir, { recursive: true, force: true }); });
const hash = (value: unknown) => digestCanonical(value as JsonValue);
async function fixture() {
  const dir = await mkdtemp(join(tmpdir(), "algal-policy-admission-")); directories.push(dir);
  const store = new FileStore(dir), put = (v: unknown) => store.putValue(v as JsonValue);
  const schema = await put({ contract: "algal.application-memory-schema.v1", relations: [{ name: "available", arity: 1 }] });
  const program = await put({ contract: "algal.query.v1", rules: [], query: { relation: "available", terms: [{ var: "x" }, { var: "polarity" }] }, limits: APPLICATION_MEMORY_NATIVE_LIMITS });
  const query = await put({ contract: "algal.application-memory-query.v1", id: "applicable", schema, program, procedures: [], polarityColumn: 1, conflict: "single-value" });
  const queries = await put({ contract: "algal.application-memory-queries.v1", queries: [query] });
  const views = await put({ contract: "algal.application-view-spec.v1", title: "Fixture", widgets: ["procedures"] });
  const runtimeProfile = await put({ contract: "algal.application-runtime-profile.v1", runtime: "bun-native-memory", policy: "pure-case-evaluation.v1" });
  const evaluationPolicy = await put({ contract: "algal.application-evaluation-policy.v1", maxCases: 8, maxWork: 1_000_000, maxModelCalls: 0, requireHoldoutPass: true, strictValidationImprovement: true });
  const frontier = await put({ contract: "algal.application-memory-frontier.v1", application: "fixture", previous: null, sequence: 0, mutation: null, status: "settled" });
  const attestation = await put({ contract: "algal.fixture-attestation.v1" });
  const scope = await put({ contract: "algal.application-memory-scope.v1", application: "fixture", environment: "fixture", task: "fixture", frontier, bindings: [], completeFor: [], attestation });
  const memoryBody = { contract: "algal.application-memory.v1", application: "fixture", schema, previous: null, scope, observations: [], hypotheses: [], withdrawn: [] };
  const memory = await put(memoryBody);
  const manifestBody = (answer: unknown, key: string) => parseOrganismManifest({
    contract: "algal.organism.v1", key: `organism:${key}`, name: key,
    interface: { inputs: { q: { cell: "src", port: "value" } }, outputs: { answer: { cell: "out", port: "value" } } },
    cells: [{ id: "src", kind: "input", outputs: { value: "json" } }, { id: "out", kind: "const", outputs: { value: { type: "json", value: answer } } }], edges: [],
  });
  const manifest = await store.putManifest(manifestBody("a", "incumbent"));
  const body = { contract: "algal.application-revision.v1", application: "fixture", parent: null, schema, queries, views, runtimeProfile, evaluationPolicy, capabilityRequirements: [], entrypoints: [{ name: "run", manifest, applicability: query, maxGenerations: 1, capabilities: [], queries: [query] }] };
  const revision = await put(body);
  const policy = { contract: "algal.application-host.v1", application: "fixture", frontier, hostProfile: hash("profile"), episodeAccess: "observe", routes: [{ route: "inbox", recipient: capabilityHandle("mailbox-send", "test"), hostProfile: hash("profile") }], attestation: "algal.fixture-attestation.v1", decoders: [] };
  const host = createApplicationPolicyHost(policy, { channelsDir: join(dir, "channels") });
  const service = new ApplicationService(dir, host);
  const command = { application: "fixture", operation: hash("create"), kind: "create", expectedHead: null, revision, memory, intents: [], evidence: [], causedBy: null };
  return { dir, put, store, body, memoryBody, host, service, command, manifestBody, evaluationPolicy, policy };
}

test("policy commits admit typed memory and refuse a foreign application", async () => {
  const f = await fixture();
  const foreign = await f.put({ ...f.body, application: "foreign" });
  await expect(f.service.create({ ...f.command, application: "foreign", revision: foreign })).rejects.toThrow("another application");
  await expect(f.service.create({ ...f.command, memory: await f.put({ arbitrary: true }) })).rejects.toThrow();
  const state = await f.service.create(f.command);
  expect(state.state.application).toBe("fixture");
  const reset = await f.put({ ...f.memoryBody, hypotheses: [hash("missing")] });
  await expect(f.service.commit({ ...f.command, kind: "memory", operation: hash("reset"), expectedHead: state.digest, memory: reset })).rejects.toThrow();
});

test("direct activation cannot bypass rejected, absent, or forged evaluation", async () => {
  const f = await fixture(), initial = await f.service.create(f.command);
  const manifest = await f.store.putManifest(f.manifestBody("wrong", "candidate"));
  const candidate = await f.put({ ...f.body, parent: f.command.revision, entrypoints: [{ ...f.body.entrypoints[0]!, manifest }] });
  const command = { ...f.command, operation: hash("activate"), kind: "activate", expectedHead: initial.digest, revision: candidate };
  await expect(f.service.commit(command)).rejects.toThrow("evaluation evidence");
  const cases = await f.put({ contract: "algal.application-evaluation-cases.v1", cases: ["train", "validation", "holdout"].map(split => ({ id: split, split, args: { q: split }, expect: { answer: "expected" } })) });
  const scorer = await f.put({ contract: "algal.application-evaluation-scorer.v1", scorer: null });
  const evaluated = await evaluateApplicationRevision(f.store, { contract: "algal.application-evaluation-request.v1", parentState: initial.digest, candidateRevision: candidate, entrypoint: "run", cases, scorer, policy: f.evaluationPolicy }, { fns: builtinRegistry() });
  expect(evaluated.evaluation.verdict.status).toBe("rejected");
  await expect(f.service.commit({ ...command, evidence: [evaluated.evaluationRef] })).rejects.toThrow("reproducibly accepted");
  const forged = await f.put({ ...evaluated.evaluation, verdict: { status: "accepted", selectedManifest: manifest } });
  await expect(f.service.commit({ ...command, evidence: [forged] })).rejects.toThrow("not reproducible");
  expect((await f.service.inspect("fixture"))!.digest).toBe(initial.digest);
});

test("durable channels fail closed on symlinks and do not overwrite other files", async () => {
  const f = await fixture();
  await f.service.create({ ...f.command, intents: [{ kind: "deliver", route: "inbox", message: await f.put("message") }] });
  const target = join(f.dir, "unrelated.json"); await writeFile(target, "private fixture");
  await import("node:fs/promises").then(fs => fs.mkdir(join(f.dir, "channels")));
  await symlink(target, join(f.dir, "channels", "inbox.json"));
  const result = await f.service.dispatchPending("fixture", f.host);
  expect(result[0]!.status).toBe("uncertain");
  expect(await readFile(target, "utf8")).toBe("private fixture");
  await expect(f.host.dispatch({ intent: { application: "foreign" } } as ApplicationDispatchContext)).rejects.toThrow("another application");
});

test("a full bounded channel remains readable for idempotent delivery", async () => {
  const f = await fixture(), message = await f.put("message");
  await f.service.create({ ...f.command, intents: [{ kind: "deliver", route: "inbox", message }] });
  const source = (await f.service.inspect("fixture"))!;
  const intent = source.transition.intents[0]!;
  const work = parseWorkIntent(await f.store.getValue(intent));
  const plan = await f.host.admitDispatch!({ current: source, snapshot: source, intent: work, previousDispatch: null, store: f.store });
  const identity = hash({ contract: "algal.application-dispatch-identity.v1", application: "fixture", intent, plan });
  const outcomes = [{ identity, message }, ...Array.from({ length: 4095 }, (_, i) => ({ identity: hash(i), message }))];
  await import("node:fs/promises").then(fs => fs.mkdir(join(f.dir, "channels")));
  await writeFile(join(f.dir, "channels", "inbox.json"), JSON.stringify({ contract: "algal.host-channel.v2", route: "inbox", outcomes }));
  expect((await f.service.dispatchPending("fixture", f.host))[0]!.status).toBe("settled");
});

test("equal delivery payloads preserve separate dispatch identities and reject legacy custody", async () => {
  const f = await fixture(), message = await f.put("same message");
  const context = (identity: string) => ({ intent: { application: "fixture", kind: "deliver", route: "inbox", message }, dispatch: { identity } } as ApplicationDispatchContext);
  const first = context(hash("delivery-1")), second = context(hash("delivery-2"));
  await f.host.dispatch(first);
  expect(await f.host.reconcile!(second)).toBeUndefined();
  await f.host.dispatch(second); await f.host.dispatch(first);
  const channel = JSON.parse(await readFile(join(f.dir, "channels", "inbox.json"), "utf8"));
  expect(channel.outcomes).toEqual([{ identity: first.dispatch.identity, message }, { identity: second.dispatch.identity, message }]);
  await writeFile(join(f.dir, "channels", "inbox.json"), JSON.stringify({ contract: "algal.host-channel.v1", route: "inbox", outcomes: [message] }));
  const legacy = await readFile(join(f.dir, "channels", "inbox.json"), "utf8");
  await expect(f.host.dispatch(second)).rejects.toThrow("explicit migration required");
  expect(await readFile(join(f.dir, "channels", "inbox.json"), "utf8")).toBe(legacy);
});

async function episodeFixture() {
  const f = await fixture(), snapshot = await f.service.create(f.command);
  const input = await f.put({ src: { value: "probe" } }), intent = hash("episode-intent");
  const binding = { contract: "algal.application-episode.v1", application: "fixture", intent, sourceState: snapshot.digest,
    revision: snapshot.state.revision, memory: snapshot.state.memory, epoch: 0, entrypoint: "run", manifest: f.body.entrypoints[0]!.manifest,
    arguments: input, process: applicationProcessName("fixture", intent), maxGenerations: 1, hostProfile: hash("profile"), access: "observe" };
  const context = { dispatch: { plan: { kind: "episode", binding } } } as ApplicationDispatchContext;
  const manifest = (await f.store.getManifest(binding.manifest))!;
  const processes = new ProcessSupervisor(f.dir, { tools: new Map(), journal: true });
  return { f, binding, context, manifest, processes, args: { src: { value: "probe" } } };
}

test("episode settlement makes its actual receipt and process reachable without another execution", async () => {
  const { f, binding, context, processes } = await episodeFixture();
  const result = await dispatchApplicationEpisode(context, { store: f.store });
  if (result.status !== "settled" || result.result.kind !== "episode" || !result.result.outcome) throw new Error("missing episode outcome");
  const evidence = await f.store.getValue(result.result.outcome) as { binding: string; processState: string; receipt: `sha256:${string}` };
  const receipt = await f.store.getReceipt(evidence.receipt) as { manifestDigest: string; outcome: string };
  expect(evidence.binding).toBe(result.result.binding);
  expect(receipt.manifestDigest).toBe(binding.manifest);
  expect(receipt.outcome).toBe("complete");
  const process = await processes.inspect(binding.process);
  expect(process.process.maxGenerations).toBe(binding.maxGenerations);
  expect(process.digest).toBe(evidence.processState);
  expect(process.process.generation).toBe(1);
  expect(await reconcileApplicationEpisode(context, { store: f.store })).toEqual(result);
  expect(await dispatchApplicationEpisode(context, { store: f.store })).toEqual(result);
  expect((await processes.inspect(binding.process)).digest).toBe(process.digest);
});

test("an episode reuses only a matching process created before acknowledgement", async () => {
  for (const mismatch of [null, "arguments", "budget"] as const) {
    const { f, binding, context, processes, manifest, args } = await episodeFixture();
    const ready = await processes.create(binding.process, manifest, mismatch === "arguments" ? { src: { value: "different" } } : args, mismatch === "budget" ? 2 : binding.maxGenerations);
    if (mismatch) {
      await expect(reconcileApplicationEpisode(context, { store: f.store })).rejects.toThrow("does not match");
      expect((await processes.inspect(binding.process)).digest).toBe(ready.digest);
    } else {
      expect((await reconcileApplicationEpisode(context, { store: f.store })).status).toBe("settled");
      expect((await processes.inspect(binding.process)).process.generation).toBe(1);
    }
  }
});

test("slot programs run once and their completed process is reused without rewriting state", async () => {
  const { f, context, binding } = await episodeFixture();
  const manifest = await f.store.putManifest(parseOrganismManifest({ contract: "algal.organism.v1", key: "organism:episode-slot", name: "Episode slot",
    cells: [{ id: "src", kind: "input", outputs: { value: "json" } }, { id: "sink", kind: "slot", name: "episode-slot", mode: "write" }],
    edges: [{ from: { cell: "src", port: "value" }, to: { cell: "sink", port: "data" } }] }));
  const revision = await f.put({ ...f.body, entrypoints: [{ ...f.body.entrypoints[0]!, manifest }] });
  if (context.dispatch.plan.kind !== "episode") throw new Error("wrong plan");
  context.dispatch.plan.binding = { ...binding, manifest, revision };
  const result = await dispatchApplicationEpisode(context, { store: f.store });
  expect(result.status).toBe("settled");
  expect(await f.store.getSlot("episode-slot")).toBe("probe");
  await f.store.setSlot("episode-slot", "later-value");
  expect(await reconcileApplicationEpisode(context, { store: f.store })).toEqual(result);
  expect(await f.store.getSlot("episode-slot")).toBe("later-value");
});

test("a large valid process receipt settles through a bounded outcome reference", async () => {
  const { f, context, binding } = await episodeFixture();
  const manifest = await f.store.putManifest(parseOrganismManifest({ contract: "algal.organism.v1", key: "organism:large-episode", name: "Large episode",
    cells: Array.from({ length: 6 }, (_, i) => ({ id: `value${i}`, kind: "const", outputs: { value: { type: "text", value: "x".repeat(60_000) } } })), edges: [] }));
  const revision = await f.put({ ...f.body, entrypoints: [{ ...f.body.entrypoints[0]!, manifest }] });
  if (context.dispatch.plan.kind !== "episode") throw new Error("wrong plan");
  context.dispatch.plan.binding = { ...binding, manifest, revision, arguments: await f.put({}) };
  const result = await dispatchApplicationEpisode(context, { store: f.store });
  if (result.status !== "settled" || result.result.kind !== "episode" || !result.result.outcome) throw new Error("large receipt did not settle");
  const outcome = await f.store.getValue(result.result.outcome) as { contract: string; receipt: `sha256:${string}` };
  expect(outcome.contract).toBe("algal.episode-outcome.v2");
  expect(JSON.stringify(outcome).length).toBeLessThan(1024);
  expect(JSON.stringify(await f.store.getReceipt(outcome.receipt)).length).toBeGreaterThan(262_144);
  expect(await reconcileApplicationEpisode(context, { store: f.store })).toEqual(result);
});

test("explicit episode recovery resumes a pure intent but never repeats an unknown write", async () => {
  for (const unknownWrite of [false, true]) {
    const { f, binding, context, processes, manifest, args } = await episodeFixture();
    const ready = await processes.create(binding.process, manifest, args, binding.maxGenerations);
    const intent = { ...ready.process, generation: 1, status: "uncertain", previous: ready.digest, cause: "start" };
    const intentRef = await f.put(intent);
    const journal = await ProcessJournal.create(f.dir, binding.process, intentRef, binding.manifest, 2);
    if (unknownWrite) await journal.before({ requestDigest: hash("request"), executor: "fixture-write", configurationDigest: hash("configuration"), idempotencyKey: hash("effect"), recovery: "never" });
    await hostWrite(join(f.dir, "processes", binding.process, "head.json"), { contract: "algal.process-head.v1", name: binding.process, record: intentRef }, 4096, false);
    expect((await dispatchApplicationEpisode(context, { store: f.store })).status).toBe("blocked");
    expect((await processes.inspect(binding.process)).digest).toBe(intentRef);
    expect((await reconcileApplicationEpisode(context, { store: f.store })).status).toBe(unknownWrite ? "blocked" : "settled");
    const recovered = await processes.inspect(binding.process);
    expect(recovered.process.generation).toBe(1);
    expect(recovered.process.status).toBe(unknownWrite ? "uncertain" : "complete");
    if (unknownWrite) expect(recovered.digest).toBe(intentRef);
  }
});

const nativeExecutable = process.env.ALGAL_MEMORY_NATIVE ?? join(import.meta.dir, "..", "target", "debug", "algal");
test.skipIf(!existsSync(nativeExecutable))("frontier advancement keeps authority while old support becomes stale", async () => {
  const f = await fixture();
  const expectedSha256 = createHash("sha256").update(new Uint8Array(await Bun.file(nativeExecutable).arrayBuffer())).digest("hex");
  const engine = new NativeMemoryQueryEngine({ executable: nativeExecutable, expectedSha256 });
  try {
    const decoder = await f.put({ contract: "algal.test-decoder.v1" });
    const procedure = await f.put({ contract: "algal.application-memory-procedure.v1", id: "probe", schema: f.body.schema,
      manifest: f.body.entrypoints[0]!.manifest, decoder, dependencies: [], prerequisite: null });
    const queryBody = await f.store.getValue(f.body.entrypoints[0]!.applicability) as Record<string, JsonValue>;
    const query = await f.put({ ...queryBody, procedures: [procedure] });
    const queries = await f.put({ contract: "algal.application-memory-queries.v1", queries: [query] });
    const revision = await f.put({ ...f.body, queries, entrypoints: [{ ...f.body.entrypoints[0]!, applicability: query, queries: [query] }] });
    const scopeBody = await f.store.getValue(f.memoryBody.scope) as Record<string, JsonValue>;
    const scope = await f.put({ ...scopeBody, completeFor: [procedure] });
    const policy = { ...f.policy, decoders: [{ decoder, rawContract: "algal.test-raw.v1", receiptContract: "algal.test-receipt.v1", receiptBinding: "names-raw" }] };
    const host = createApplicationPolicyHost(policy, { channelsDir: join(f.dir, "channels"), memoryEngine: engine });
    const memory = new ApplicationMemoryService({ store: f.store, engine, admission: host });
    const raw = await f.put({ contract: "algal.test-raw.v1", claims: [{ relation: "available", tuple: ["tool"], polarity: "supported" }] });
    const receipt = await f.put({ contract: "algal.test-receipt.v1", raw });
    const observationInput = { application: "fixture", scope, procedure, raw, receipt, decoder };
    const observation = await memory.observe(observationInput);
    const originalMemory = await memory.snapshot({ application: "fixture", schema: f.body.schema, previous: null, scope, observations: [observation], hypotheses: [], withdrawn: [] });
    const service = new ApplicationService(f.dir, host);
    const original = await service.create({ ...f.command, revision, memory: originalMemory });
    expect((await memory.query(original.digest, query)).derivation.status).toBe("supported");
    const frontier = await f.put({ contract: "algal.application-memory-frontier.v1", application: "fixture", previous: policy.frontier,
      sequence: 1, mutation: await f.put({ contract: "algal.test-mutation.v1" }), status: "settled" });
    const nextPolicy = { ...policy, frontier };
    const nextHost = createApplicationPolicyHost(nextPolicy, { channelsDir: join(f.dir, "channels"), memoryEngine: engine });
    expect(nextHost.identity).toBe(host.identity);
    expect(nextHost.configurationDigest).not.toBe(host.configurationDigest);
    const next = new ApplicationMemoryService({ store: f.store, engine, admission: nextHost });
    expect((await next.query(original.digest, query)).derivation.status).toBe("stale");
    const nextScope = await f.put({ ...scopeBody, frontier, completeFor: [procedure] });
    const fresh = await next.observe({ ...observationInput, scope: nextScope });
    const nextMemory = await next.snapshot({ application: "fixture", schema: f.body.schema, previous: originalMemory, scope: nextScope, observations: [observation, fresh].sort(), hypotheses: [], withdrawn: [] });
    const advanced = await new ApplicationService(f.dir, nextHost).commit({ ...f.command, kind: "memory", operation: hash("new-frontier"), expectedHead: original.digest, revision, memory: nextMemory });
    expect((await next.query(advanced.digest, query)).derivation.status).toBe("supported");
    for (const changed of [{ ...nextPolicy, attestation: "algal.other-attestation.v1" }, { ...nextPolicy, decoders: [{ ...nextPolicy.decoders[0]!, rawContract: "algal.other-raw.v1" }] }]) {
      const other = createApplicationPolicyHost(changed, { channelsDir: join(f.dir, "channels"), memoryEngine: engine });
      expect(other.identity).not.toBe(nextHost.identity);
      await expect(new ApplicationMemoryService({ store: f.store, engine, admission: other }).query(advanced.digest, query)).rejects.toThrow();
    }
  } finally { await engine.settle(); }
});

test.skipIf(!existsSync(nativeExecutable))("a forged supported derivation cannot authorize an execution", async () => {
  const f = await fixture(), initial = await f.service.create(f.command);
  const expectedSha256 = createHash("sha256").update(new Uint8Array(await Bun.file(nativeExecutable).arrayBuffer())).digest("hex");
  const engine = new NativeMemoryQueryEngine({ executable: nativeExecutable, expectedSha256 });
  const host = createApplicationPolicyHost(f.policy, { channelsDir: join(f.dir, "channels"), memoryEngine: engine });
  const memory = new ApplicationMemoryService({ store: f.store, engine, admission: host });
  const actual = await memory.query(initial.digest, f.body.entrypoints[0]!.applicability);
  expect(actual.derivation.status).toBe("unknown");
  const forged = await f.put({ ...actual.derivation, status: "supported" });
  await expect(requestExecution(new ApplicationService(f.dir, host), { application: "fixture", operation: hash("forged-execution"), expectedHead: initial.digest, expectedMemory: initial.state.memory,
    entrypoint: "run", input: await f.put({src: {value: "probe"}}), derivation: forged })).rejects.toThrow("reproduced supported");
  expect((await f.service.inspect("fixture"))!.digest).toBe(initial.digest);
  await engine.settle();
});

test("an undispatched episode cannot revive a superseded memory snapshot", async () => {
  const f = await fixture(), initial = await f.service.create(f.command);
  const nextMemory = await f.put({ ...f.memoryBody, previous: initial.state.memory });
  const current = await f.service.commit({ ...f.command, kind: "memory", expectedHead: initial.digest, memory: nextMemory, operation: hash("advance-memory") });
  await expect(f.host.admitDispatch!({ current, snapshot: initial, intent: {
    contract: "algal.application-intent.v1", application: "fixture", operation: hash("episode"), ordinal: 0,
    kind: "start-episode", entrypoint: "run", input: await f.put({src: {value: "probe"}}),
  }, previousDispatch: null, store: f.store })).rejects.toThrow("no longer selected");
});
