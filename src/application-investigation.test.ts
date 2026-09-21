/** Checked scheduling: unsupported applicability becomes a durable
 * investigation request on a declared route; a verified supported derivation
 * becomes an episode intent. Both flow through the ordinary commit path, so
 * stale expectations reject and identical retries replay. */
import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  ApplicationService, applicationProcessName,
  type ApplicationAdmission, type ApplicationDispatchContext, type ApplicationSnapshot,
} from "./application";
import { applicationJson, getApplicationRecord, putApplicationRecord } from "./application-contract";
import {
  parseInvestigationRequest, requestExecution, scheduleInvestigations,
} from "./application-investigation";
import { appendObservation } from "./application-observation";
import {
  ApplicationMemoryService,
  type MemoryAdmissionHost, type MemoryQueryEngine,
} from "./application-memory";
import { capabilityHandle } from "./capabilities";
import { parseOrganismManifest } from "./contract";
import { digestCanonical, type Digest } from "./digest";
import type { JsonValue } from "./values";

const dirs: string[] = [];
const ref = (value: unknown) => digestCanonical(value as never);
afterEach(async () => { for (const dir of dirs.splice(0)) await rm(dir, { recursive: true, force: true }); });

async function fixture() {
  const dir = await mkdtemp(join(tmpdir(), "algal-investigation-")); dirs.push(dir);
  const box: { frontier: Digest } = { frontier: ref("uninitialized") };
  const admission: MemoryAdmissionHost = {
    identity: ref({ contract: "algal.schedule-admission.v1" }),
    async currentFrontier() { return box.frontier; },
    async validateScope() {},
    async decodeObservation(input) {
      const raw = input.raw as { contract?: unknown; tool?: unknown };
      if (raw?.contract !== "algal.probe-observation.v1" || typeof raw.tool !== "string") throw new Error("raw evidence failed admission");
      return [{ relation: "available", tuple: [raw.tool], polarity: "supported" }];
    },
  };
  const engine: MemoryQueryEngine = {
    identity: ref({ contract: "algal.schedule-engine.v1" }),
    async query(snapshot, program) {
      const snap = snapshot as { facts?: { relation: string; tuple: JsonValue[]; sources: string[] }[] };
      const prog = program as { query: { relation: string } };
      const proofs: Record<string, JsonValue> = {}, rows: JsonValue[] = [];
      for (const fact of snap.facts ?? []) {
        if (fact.relation !== prog.query.relation) continue;
        const proof = { kind: "fact", fact: ref(fact), sources: fact.sources };
        const id = ref(proof); proofs[id] = proof as never;
        rows.push({ tuple: fact.tuple, proof: id });
      }
      return { kind: "complete", result: { contract: "algal.query-result.v1", snapshot: ref(snapshot), program: ref(program), complete: true, witnessPolicy: "first-canonical-derivation", rows, proofs, work: 1, rounds: 1, baseFacts: (snap.facts ?? []).length, derivedFacts: 0 } as never };
    },
    async verify() { return true; },
    async settle() {},
  };
  const appAdmission: ApplicationAdmission = {
    async admitCommit() {},
    async admitDispatch({ snapshot, intent }) {
      if (intent.kind === "deliver") return { kind: "delivery" as const, recipient: capabilityHandle("mailbox-send", { fixture: true }), hostProfile: ref("profile") };
      const entry = snapshot.revision.entrypoints.find(e => e.name === intent.entrypoint);
      if (!entry) throw new Error("Unknown episode entrypoint");
      const intentRef = digestCanonical(applicationJson(intent));
      return { kind: "episode" as const, binding: {
        contract: "algal.application-episode.v1" as const, application: intent.application, intent: intentRef,
        sourceState: snapshot.digest, revision: snapshot.state.revision, memory: snapshot.state.memory,
        epoch: snapshot.state.epoch, entrypoint: entry.name, manifest: entry.manifest, arguments: intent.input,
        process: applicationProcessName(intent.application, intentRef), maxGenerations: entry.maxGenerations,
        hostProfile: ref("profile"), access: "observe" as const,
      } };
    },
  };
  const service = new ApplicationService(dir, appAdmission);
  const store = service.store;
  const memory = new ApplicationMemoryService({ store, engine, admission });

  const schema = await store.putValue({ contract: "algal.application-memory-schema.v1", relations: [{ name: "available", arity: 1 }] });
  box.frontier = await putApplicationRecord(store, { contract: "algal.application-memory-frontier.v1", application: "workspace", previous: null, sequence: 0, mutation: null, status: "settled" });
  const manifest = await store.putManifest(parseOrganismManifest({ contract: "algal.organism.v1", key: "organism:schedule-fixture", name: "schedule fixture", cells: [{ id: "out", kind: "const", outputs: { value: { type: "json", value: "ok" } } }], edges: [] }));
  const decoder = await store.putValue({ contract: "algal.schedule-decoder.v1" });
  const procedure = await store.putValue({ contract: "algal.application-memory-procedure.v1", id: "probe", schema, manifest, decoder, dependencies: [], prerequisite: null });
  const attestation = await store.putValue({ contract: "algal.schedule-attestation.v1" });
  const scope = await store.putValue({ contract: "algal.application-memory-scope.v1", application: "workspace", environment: "fixture", task: "task-1", frontier: box.frontier, bindings: [], completeFor: [procedure], attestation });
  const program = await store.putValue({ contract: "algal.query.v1", rules: [], query: { relation: "available", terms: [{ var: "x" }, { var: "polarity" }] }, limits: { maxWork: 50_000, maxRounds: 32, maxDerived: 128, maxBindings: 128, maxRows: 16, maxOutputBytes: 262_144 } });
  const query = await store.putValue({ contract: "algal.application-memory-query.v1", id: "available", schema, program, procedures: [procedure], polarityColumn: 1, conflict: "single-value" });
  const queries = await store.putValue({ contract: "algal.application-memory-queries.v1", queries: [query] });
  const views = await store.putValue({ contract: "algal.application-view-spec.v1", title: "Workspace", widgets: ["investigations", "memory", "procedures"] });
  const runtimeProfile = await store.putValue({ contract: "algal.application-runtime-profile.v1", runtime: "bun-native-memory", policy: "pure-case-evaluation.v1" });
  const evaluationPolicy = await store.putValue({ contract: "algal.application-evaluation-policy.v1", maxCases: 8, maxWork: 1_000_000, maxModelCalls: 0, requireHoldoutPass: true, strictValidationImprovement: true });
  const revision = await putApplicationRecord(store, { contract: "algal.application-revision.v1", application: "workspace", parent: null, schema, queries, views, runtimeProfile, evaluationPolicy, capabilityRequirements: [], entrypoints: [{ name: "run", manifest, applicability: query, maxGenerations: 1, capabilities: [], queries: [query] }] });
  const genesisMemory = await memory.snapshot({ application: "workspace", schema, previous: null, scope, observations: [], hypotheses: [], withdrawn: [] });
  const genesis = await service.create({ application: "workspace", operation: ref("genesis"), kind: "create", expectedHead: null, revision, memory: genesisMemory, intents: [], evidence: [], causedBy: null });

  const observe = async (operation: Digest, expected: ApplicationSnapshot, value: number) => appendObservation(service, memory, {
    application: "workspace", operation, expectedHead: expected.digest, expectedMemory: expected.state.memory,
    observation: {
      application: "workspace", scope, procedure,
      raw: await store.putValue({ contract: "algal.probe-observation.v1", tool: "algal", value }),
      receipt: await store.putValue({ contract: "algal.probe-receipt.v1", value }), decoder,
    },
  });
  const schedule = (operation: Digest, expected: ApplicationSnapshot, entrypoints?: string[]) =>
    scheduleInvestigations(service, memory, { application: "workspace", operation, expectedHead: expected.digest, expectedMemory: expected.state.memory, route: "probes", ...(entrypoints === undefined ? {} : { entrypoints }) });
  const execute = (operation: Digest, expected: ApplicationSnapshot, derivation: Digest, input: Digest) =>
    requestExecution(service, { application: "workspace", operation, expectedHead: expected.digest, expectedMemory: expected.state.memory, entrypoint: "run", input, derivation });
  const dispatcher = {
    configurationDigest: ref("schedule-dispatcher.v1"),
    async dispatch(context: ApplicationDispatchContext) {
      const work = context.intent;
      if (work.kind === "deliver") return { status: "settled" as const, result: { kind: "delivery" as const, message: work.message, idempotencyKey: context.dispatch.identity } };
      const plan = context.dispatch.plan;
      if (plan.kind !== "episode") throw new Error("expected episode plan");
      return { status: "settled" as const, result: { kind: "episode" as const, binding: ref(plan.binding), process: plan.binding.process } };
    },
  };
  return { service, memory, store, scope, procedure, decoder, query, genesis, observe, schedule, execute, dispatcher };
}

describe("application investigation scheduling", () => {
  test("commits a durable investigation request for an unsupported entrypoint", async () => {
    const f = await fixture();
    const scheduled = await f.schedule(ref("op-schedule-1"), f.genesis);
    expect(scheduled.derivations).toEqual([{ entrypoint: "run", query: f.query, derivation: expect.any(String), status: "unknown" }]);
    expect(scheduled.requests.length).toBe(1);
    const snapshot = scheduled.snapshot;
    if (!snapshot) throw new Error("expected an investigate commit");
    expect(snapshot.transition.kind).toBe("investigate");
    expect(snapshot.state.sequence).toBe(1);
    expect(snapshot.state.memory).toBe(f.genesis.state.memory);
    expect(snapshot.transition.intents.length).toBe(1);
    const request = await getApplicationRecord(f.store, scheduled.requests[0]!, parseInvestigationRequest);
    expect(request).toMatchObject({
      application: "workspace", state: f.genesis.digest, memory: f.genesis.state.memory,
      entrypoint: "run", query: f.query, procedures: [f.procedure], derivation: scheduled.derivations[0]!.derivation,
    });
    const [dispatched] = await f.service.dispatchPending("workspace", f.dispatcher);
    if (!dispatched) throw new Error("investigation intent was not dispatched");
    expect(dispatched.plan.kind).toBe("delivery");
  });

  test("an identical retry replays the committed scheduling", async () => {
    const f = await fixture();
    const first = await f.schedule(ref("op-schedule-1"), f.genesis);
    const again = await f.schedule(ref("op-schedule-1"), f.genesis);
    expect(again.snapshot?.digest).toBe(first.snapshot?.digest);
    expect(again.requests).toEqual(first.requests);
    expect((await f.service.history("workspace")).length).toBe(2);
  });

  test("a stale expectation cannot schedule an investigation", async () => {
    const f = await fixture();
    const first = await f.schedule(ref("op-schedule-1"), f.genesis);
    await expect(f.schedule(ref("op-schedule-2"), f.genesis)).rejects.toThrow("Stale application head");
    expect((await f.service.inspect("workspace"))?.digest).toBe(first.snapshot?.digest);
  });

  test("supported entrypoints commit nothing", async () => {
    const f = await fixture();
    const appended = await f.observe(ref("op-observe-1"), f.genesis, 1);
    const scheduled = await f.schedule(ref("op-schedule-1"), appended.snapshot);
    expect(scheduled.snapshot).toBeNull();
    expect(scheduled.requests).toEqual([]);
    expect(scheduled.derivations[0]!.status).toBe("supported");
    expect((await f.service.inspect("workspace"))?.digest).toBe(appended.snapshot.digest);
  });

  test("an unknown entrypoint name is rejected", async () => {
    const f = await fixture();
    await expect(f.schedule(ref("op-schedule-x"), f.genesis, ["nope"])).rejects.toThrow("unknown entrypoint");
  });
});

describe("application execution requests", () => {
  const supported = async (f: Awaited<ReturnType<typeof fixture>>) => {
    const appended = await f.observe(ref("op-observe-1"), f.genesis, 1);
    const derivation = await f.memory.query(appended.snapshot.digest, f.query);
    expect(derivation.derivation.status).toBe("supported");
    return { appended, derivation };
  };

  test("commits an episode intent bound to the supported derivation", async () => {
    const f = await fixture();
    const { appended, derivation } = await supported(f);
    const input = await f.store.putValue({ contract: "algal.episode-input.v1", q: "run it" });
    const snapshot = await f.execute(ref("op-exec-1"), appended.snapshot, derivation.ref, input);
    expect(snapshot.transition.kind).toBe("investigate");
    expect(snapshot.transition.intents.length).toBe(1);
    const [dispatched] = await f.service.dispatchPending("workspace", f.dispatcher);
    if (!dispatched) throw new Error("episode intent was not dispatched");
    expect(dispatched.plan.kind).toBe("episode");
  });

  test("an identical retry replays the committed execution request", async () => {
    const f = await fixture();
    const { appended, derivation } = await supported(f);
    const input = await f.store.putValue({ contract: "algal.episode-input.v1", q: "run it" });
    const first = await f.execute(ref("op-exec-1"), appended.snapshot, derivation.ref, input);
    const again = await f.execute(ref("op-exec-1"), appended.snapshot, derivation.ref, input);
    expect(again.digest).toBe(first.digest);
    expect((await f.service.history("workspace")).length).toBe(3);
  });

  test("an unresolved derivation cannot start an episode", async () => {
    const f = await fixture();
    const unresolved = await f.memory.query(f.genesis.digest, f.query);
    expect(unresolved.derivation.status).toBe("unknown");
    const input = await f.store.putValue({ contract: "algal.episode-input.v1", q: "run it" });
    await expect(f.execute(ref("op-exec-bad"), f.genesis, unresolved.ref, input)).rejects.toThrow("verified supported applicability derivation");
    expect((await f.service.inspect("workspace"))?.digest).toBe(f.genesis.digest);
  });

  test("a supported derivation bound to another state cannot start an episode", async () => {
    const f = await fixture();
    const { appended, derivation } = await supported(f);
    const second = await f.observe(ref("op-observe-2"), appended.snapshot, 2);
    const input = await f.store.putValue({ contract: "algal.episode-input.v1", q: "run it" });
    await expect(f.execute(ref("op-exec-stale"), second.snapshot, derivation.ref, input)).rejects.toThrow("verified supported applicability derivation");
    expect((await f.service.inspect("workspace"))?.digest).toBe(second.snapshot.digest);
  });

  test("a mismatched memory expectation is rejected", async () => {
    const f = await fixture();
    const { appended, derivation } = await supported(f);
    const input = await f.store.putValue({ contract: "algal.episode-input.v1", q: "run it" });
    await expect(requestExecution(f.service, {
      application: "workspace", operation: ref("op-exec-mm"), expectedHead: appended.snapshot.digest,
      expectedMemory: ref("other-memory"), entrypoint: "run", input, derivation: derivation.ref,
    })).rejects.toThrow("does not match the named application state");
  });
});
