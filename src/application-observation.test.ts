import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ApplicationService } from "./application";
import { appendObservation, type AppendObservationInput } from "./application-observation";
import { getApplicationRecord, putApplicationRecord } from "./application-contract";
import {
  ApplicationMemoryService, parseMemorySnapshot,
  type MemoryAdmissionHost, type MemoryQueryEngine,
} from "./application-memory";
import { parseOrganismManifest } from "./contract";
import { digestCanonical, type Digest } from "./digest";
import type { JsonValue } from "./values";

const dirs: string[] = [];
const ref = (value: unknown) => digestCanonical(value as never);
afterEach(async () => { for (const dir of dirs.splice(0)) await rm(dir, { recursive: true, force: true }); });

async function fixture() {
  const dir = await mkdtemp(join(tmpdir(), "algal-observation-")); dirs.push(dir);
  const service = new ApplicationService(dir, { async admitCommit() {} });
  const store = service.store;
  const schema = await store.putValue({ contract: "algal.application-memory-schema.v1", relations: [{ name: "available", arity: 1 }] });
  const frontier = await putApplicationRecord(store, { contract: "algal.application-memory-frontier.v1", application: "workspace", previous: null, sequence: 0, mutation: null, status: "settled" });
  const admission: MemoryAdmissionHost = {
    identity: ref({ contract: "algal.fixture-admission.v1" }),
    async currentFrontier() { return frontier; },
    async validateScope() {},
    async decodeObservation(input) {
      const raw = input.raw as { contract?: unknown };
      if (raw?.contract !== "algal.fixture-probe-raw.v1") throw new Error("raw evidence failed admission");
      return [{ relation: "available", tuple: ["tool"], polarity: "supported" }];
    },
  };
  // Deterministic engine: one fact-row per matching base tuple, honest digests.
  const engine: MemoryQueryEngine = {
    identity: ref({ contract: "algal.fixture-engine.v1" }),
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
  const memory = new ApplicationMemoryService({ store, engine, admission });
  const manifest = await store.putManifest(parseOrganismManifest({ contract: "algal.organism.v1", key: "organism:observation-fixture", name: "observation fixture", cells: [{ id: "out", kind: "const", outputs: { value: { type: "json", value: "ok" } } }], edges: [] }));
  const decoder = await store.putValue({ contract: "algal.fixture-decoder.v1" });
  const procedure = await store.putValue({ contract: "algal.application-memory-procedure.v1", id: "probe", schema, manifest, decoder, dependencies: [], prerequisite: null });
  const attestation = await store.putValue({ contract: "algal.fixture-attestation.v1" });
  const scope = await store.putValue({ contract: "algal.application-memory-scope.v1", application: "workspace", environment: "fixture", task: "task-1", frontier, bindings: [], completeFor: [procedure], attestation });
  const program = await store.putValue({ contract: "algal.query.v1", rules: [], query: { relation: "available", terms: [{ var: "x" }, { var: "polarity" }] }, limits: { maxWork: 50_000, maxRounds: 32, maxDerived: 128, maxBindings: 128, maxRows: 16, maxOutputBytes: 262_144 } });
  const query = await store.putValue({ contract: "algal.application-memory-query.v1", id: "available", schema, program, procedures: [procedure], polarityColumn: 1, conflict: "single-value" });
  const queries = await store.putValue({ contract: "algal.application-memory-queries.v1", queries: [query] });
  const views = await store.putValue({ contract: "algal.application-view-spec.v1", title: "Workspace", widgets: ["memory", "procedures"] });
  const runtimeProfile = await store.putValue({ contract: "algal.application-runtime-profile.v1", runtime: "bun-native-memory", policy: "pure-case-evaluation.v1" });
  const evaluationPolicy = await store.putValue({ contract: "algal.application-evaluation-policy.v1", maxCases: 8, maxWork: 1_000_000, maxModelCalls: 0, requireHoldoutPass: true, strictValidationImprovement: true });
  const revision = await putApplicationRecord(store, { contract: "algal.application-revision.v1", application: "workspace", parent: null, schema, queries, views, runtimeProfile, evaluationPolicy, capabilityRequirements: [], entrypoints: [{ name: "probe", manifest, applicability: query, maxGenerations: 1 }] });
  const genesisMemory = await memory.snapshot({ application: "workspace", schema, previous: null, scope, observations: [], hypotheses: [], withdrawn: [] });
  const genesis = await service.create({ application: "workspace", operation: ref("genesis"), kind: "create", expectedHead: null, revision, memory: genesisMemory, intents: [], evidence: [], causedBy: null });
  const observation = async (value: number) => ({
    application: "workspace", scope, procedure,
    raw: await store.putValue({ contract: "algal.fixture-probe-raw.v1", value }),
    receipt: await store.putValue({ contract: "algal.fixture-receipt.v1", value }),
    decoder,
  });
  const command = (operation: Digest, observed: Awaited<ReturnType<typeof observation>>): AppendObservationInput => ({
    application: "workspace", operation, expectedHead: genesis.digest, expectedMemory: genesis.state.memory, observation: observed,
  });
  return { service, memory, store, scope, procedure, decoder, query, genesis, observation, command };
}

describe("application observation bridge", () => {
  test("commits one admitted observation into a memory successor state", async () => {
    const f = await fixture();
    const appended = await appendObservation(f.service, f.memory, f.command(ref("observe-1"), await f.observation(3)));
    expect(appended.snapshot.state.sequence).toBe(1);
    expect(appended.snapshot.state.previous).toBe(f.genesis.digest);
    expect(appended.snapshot.transition.kind).toBe("memory");
    expect(appended.snapshot.state.memory).toBe(appended.memory);
    const next = await getApplicationRecord(f.store, appended.memory, parseMemorySnapshot);
    expect(next.previous).toBe(f.genesis.state.memory);
    expect(next.observations).toEqual([appended.observation]);
    expect((await f.service.inspect("workspace"))?.digest).toBe(appended.snapshot.digest);
    expect((await f.service.history("workspace")).map(s => s.state.sequence)).toEqual([0, 1]);
  });

  test("rejects evidence the trusted decoder refuses before any commit", async () => {
    const f = await fixture();
    const raw = await f.store.putValue({ contract: "algal.untrusted-raw.v1", value: 3 });
    const receipt = await f.store.putValue({ contract: "algal.fixture-receipt.v1", value: 3 });
    await expect(appendObservation(f.service, f.memory, {
      application: "workspace", operation: ref("observe-bad"), expectedHead: f.genesis.digest,
      expectedMemory: f.genesis.state.memory,
      observation: { application: "workspace", scope: f.scope, procedure: f.procedure, raw, receipt, decoder: f.decoder },
    })).rejects.toThrow("raw evidence failed admission");
    expect((await f.service.inspect("workspace"))?.digest).toBe(f.genesis.digest);
  });

  test("a stale expectation cannot publish an observation", async () => {
    const f = await fixture();
    const observed = await f.observation(3);
    const first = await appendObservation(f.service, f.memory, f.command(ref("observe-1"), observed));
    await expect(appendObservation(f.service, f.memory, f.command(ref("observe-2"), observed))).rejects.toThrow("Stale application head");
    expect((await f.service.inspect("workspace"))?.digest).toBe(first.snapshot.digest);
  });

  test("an identical retry returns the committed state without a new transition", async () => {
    const f = await fixture();
    const first = await appendObservation(f.service, f.memory, f.command(ref("observe-1"), await f.observation(3)));
    const again = await appendObservation(f.service, f.memory, f.command(ref("observe-1"), await f.observation(3)));
    expect(again.snapshot.digest).toBe(first.snapshot.digest);
    expect(again.memory).toBe(first.memory);
    expect(again.observation).toBe(first.observation);
    expect((await f.service.history("workspace")).length).toBe(2);
  });

  test("applicability flips from unknown to supported on the committing state", async () => {
    const f = await fixture();
    const before = await f.memory.query(f.genesis.digest, f.query);
    expect(before.derivation.status).toBe("unknown");
    expect(before.derivation.capturedState).toBe(f.genesis.digest);
    expect(before.derivation.memory).toBe(f.genesis.state.memory);
    const appended = await appendObservation(f.service, f.memory, f.command(ref("observe-1"), await f.observation(3)));
    const after = await f.memory.query(appended.snapshot.digest, f.query);
    expect(after.derivation.status).toBe("supported");
    expect(after.derivation.capturedState).toBe(appended.snapshot.digest);
    expect(after.derivation.memory).toBe(appended.memory);
    expect(after.derivation.verified).toBe(true);
    expect(after.derivation.sourceRefs).toEqual([appended.observation]);
    // The genesis derivation remains bound to its own historical state.
    const stale = await f.memory.query(f.genesis.digest, f.query);
    expect(stale.derivation.status).toBe("unknown");
  });

  test("a mismatched memory expectation is rejected", async () => {
    const f = await fixture();
    await expect(appendObservation(f.service, f.memory, {
      application: "workspace", operation: ref("observe-mismatch"), expectedHead: f.genesis.digest,
      expectedMemory: ref("other-memory"), observation: await f.observation(3),
    })).rejects.toThrow("does not match the named application state");
  });
});
