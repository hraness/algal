/** Integrated milestone: the documented application loop end to end —
 * unresolved applicability → investigate intent → sandbox probe → observation
 * commit → supported procedure → episode dispatch → frontier mutation → stale →
 * restart continuity → scoped re-investigation → evaluated activation. */
import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  ApplicationService, applicationProcessName,
  type ApplicationAdmission, type ApplicationDispatchContext, type ApplicationSnapshot,
} from "./application";
import { applicationJson, putApplicationRecord } from "./application-contract";
import { appendObservation } from "./application-observation";
import {
  ApplicationMemoryService,
  type MemoryAdmissionHost, type MemoryQueryEngine,
} from "./application-memory";
import {
  admitApplicationActivation, evaluateApplicationRevision,
} from "./application-adaptation";
import { projectApplicationView, type ApplicationApplicability, type ApplicationViewSpec } from "./application-view";
import { capabilityHandle } from "./capabilities";
import { parseOrganismManifest } from "./contract";
import { digestCanonical, type Digest } from "./digest";
import { builtinRegistry } from "./registry";
import type { JsonValue } from "./values";

const dirs: string[] = [];
const ref = (value: unknown) => digestCanonical(value as never);
afterEach(async () => { for (const dir of dirs.splice(0)) await rm(dir, { recursive: true, force: true }); });

const constant = (answer: string, key: string) => parseOrganismManifest({
  contract: "algal.organism.v1", key: `organism:${key}`, name: key,
  interface: { inputs: { q: { cell: "src", port: "value" } }, outputs: { answer: { cell: "out", port: "value" } } },
  cells: [
    { id: "src", kind: "input", outputs: { value: "json" } },
    { id: "out", kind: "const", outputs: { value: { type: "json", value: answer } } },
  ], edges: [],
});
const echo = parseOrganismManifest({
  contract: "algal.organism.v1", key: "organism:echo-milestone", name: "echo milestone",
  interface: { inputs: { q: { cell: "src", port: "value" } }, outputs: { answer: { cell: "out", port: "value" } } },
  cells: [{ id: "src", kind: "input", outputs: { value: "json" } }, { id: "out", kind: "fn", fn: "echo.v1" }],
  edges: [{ from: { cell: "src", port: "value" }, to: { cell: "out", port: "value" } }],
});

type Pair = { service: ApplicationService; memory: ApplicationMemoryService };

async function fixture() {
  const dir = await mkdtemp(join(tmpdir(), "algal-milestone-")); dirs.push(dir);
  // The trusted admission host owns the mutation frontier; a real host would
  // advance it when observed dependencies change. The box lets the test mutate.
  const box: { frontier: Digest } = { frontier: ref("uninitialized") };
  const admission: MemoryAdmissionHost = {
    identity: ref({ contract: "algal.milestone-admission.v1" }),
    async currentFrontier() { return box.frontier; },
    async validateScope() {},
    async decodeObservation(input) {
      const raw = input.raw as { contract?: unknown; tool?: unknown };
      if (raw?.contract !== "algal.probe-observation.v1" || typeof raw.tool !== "string") throw new Error("raw evidence failed admission");
      return [{ relation: "available", tuple: [raw.tool], polarity: "supported" }];
    },
  };
  const engine: MemoryQueryEngine = {
    identity: ref({ contract: "algal.milestone-engine.v1" }),
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
  const manifest = await store.putManifest(constant("a", "incumbent-milestone"));
  const decoder = await store.putValue({ contract: "algal.milestone-decoder.v1" });
  const procedure = await store.putValue({ contract: "algal.application-memory-procedure.v1", id: "probe", schema, manifest, decoder, dependencies: [], prerequisite: null });
  const attestation = await store.putValue({ contract: "algal.milestone-attestation.v1" });
  const scopeFor = (frontier: Digest) => store.putValue({ contract: "algal.application-memory-scope.v1", application: "workspace", environment: "fixture", task: "task-1", frontier, bindings: [], completeFor: [procedure], attestation });
  const scope = await scopeFor(box.frontier);
  const program = await store.putValue({ contract: "algal.query.v1", rules: [], query: { relation: "available", terms: [{ var: "x" }, { var: "polarity" }] }, limits: { maxWork: 50_000, maxRounds: 32, maxDerived: 128, maxBindings: 128, maxRows: 16, maxOutputBytes: 262_144 } });
  const query = await store.putValue({ contract: "algal.application-memory-query.v1", id: "available", schema, program, procedures: [procedure], polarityColumn: 1, conflict: "single-value" });
  const queries = await store.putValue({ contract: "algal.application-memory-queries.v1", queries: [query] });
  const viewSpec: ApplicationViewSpec = { contract: "algal.application-view-spec.v1", title: "Workspace", widgets: ["investigations", "memory", "procedures"] };
  const views = await store.putValue(viewSpec);
  const runtimeProfile = await store.putValue({ contract: "algal.application-runtime-profile.v1", runtime: "bun-native-memory", policy: "pure-case-evaluation.v1" });
  const evaluationPolicy = await store.putValue({ contract: "algal.application-evaluation-policy.v1", maxCases: 8, maxWork: 1_000_000, maxModelCalls: 0, requireHoldoutPass: true, strictValidationImprovement: true });
  const revisionBody = (parent: Digest | null, entryManifest: Digest) => ({ contract: "algal.application-revision.v1", application: "workspace", parent, schema, queries, views, runtimeProfile, evaluationPolicy, capabilityRequirements: [], entrypoints: [{ name: "run", manifest: entryManifest, applicability: query, maxGenerations: 1 }] });
  const revision = await putApplicationRecord(store, revisionBody(null, manifest));
  const genesisMemory = await memory.snapshot({ application: "workspace", schema, previous: null, scope, observations: [], hypotheses: [], withdrawn: [] });
  const genesis = await service.create({ application: "workspace", operation: ref("genesis"), kind: "create", expectedHead: null, revision, memory: genesisMemory, intents: [], evidence: [], causedBy: null });

  // The dispatcher is the outbox boundary: delivering a "probes" message hands
  // the request to the sandboxed investigator, whose raw evidence lands in CAS.
  const rawByRequest = new Map<Digest, Digest>();
  const dispatcher = {
    configurationDigest: ref("milestone-dispatcher.v1"),
    async dispatch(context: ApplicationDispatchContext) {
      const work = context.intent;
      if (work.kind === "deliver") {
        const req = await store.getValue(work.message) as { nonce?: JsonValue };
        rawByRequest.set(work.message, await store.putValue({ contract: "algal.probe-observation.v1", tool: "algal", nonce: req?.nonce ?? null }));
        return { status: "settled" as const, result: { kind: "delivery" as const, message: work.message, idempotencyKey: context.dispatch.identity } };
      }
      const plan = context.dispatch.plan;
      if (plan.kind !== "episode") throw new Error("expected episode plan");
      return { status: "settled" as const, result: { kind: "episode" as const, binding: ref(plan.binding), process: plan.binding.process } };
    },
  };
  const investigate = (pair: Pair, operation: Digest, expected: ApplicationSnapshot, request: Digest, evidence: Digest[] = []) =>
    pair.service.commit({ application: "workspace", operation, kind: "investigate", expectedHead: expected.digest, revision: expected.state.revision, memory: expected.state.memory, intents: [{ kind: "deliver", route: "probes", message: request }], evidence, causedBy: null });
  const probe = async (pair: Pair, operation: Digest, expected: ApplicationSnapshot, request: Digest, observationScope: Digest) => {
    const raw = rawByRequest.get(request); if (!raw) throw new Error("probe did not run");
    return appendObservation(pair.service, pair.memory, {
      application: "workspace", operation, expectedHead: expected.digest, expectedMemory: expected.state.memory,
      observation: {
        application: "workspace", scope: observationScope, procedure,
        raw, receipt: await store.putValue({ contract: "algal.probe-receipt.v1", raw }), decoder,
      },
    });
  };
  const view = (snapshot: ApplicationSnapshot, applicability: Record<string, ApplicationApplicability>) =>
    projectApplicationView({ snapshot, spec: viewSpec, applicability });
  const bumpFrontier = async () => {
    const mutation = await store.putValue({ contract: "algal.milestone-mutation.v1", changed: "toolchain" });
    box.frontier = await putApplicationRecord(store, { contract: "algal.application-memory-frontier.v1", application: "workspace", previous: box.frontier, sequence: 1, mutation, status: "settled" });
    return scopeFor(box.frontier);
  };
  const restart = (): Pair => {
    const reopened = new ApplicationService(dir, appAdmission);
    return { service: reopened, memory: new ApplicationMemoryService({ store: reopened.store, engine, admission }) };
  };
  return { dir, service, memory, store, scope, scopeFor, procedure, decoder, query, revision, revisionBody, genesis, viewSpec, investigate, dispatcher, probe, bumpFrontier, restart, view, evaluationPolicy };
}

describe("integrated application milestone", () => {
  test("walks the documented sequence: investigate → observe → execute → stale → restart → activate", async () => {
    const f = await fixture();
    const { service, memory, query } = f;
    const pair: Pair = { service, memory };

    // 1–2. Applicability is unresolved; the view explains it and an
    // investigation intent is committed against the captured state.
    const q0 = await memory.query(f.genesis.digest, query);
    expect(q0.derivation.status).toBe("unknown");
    const v0 = f.view(f.genesis, { run: { status: "unknown" } });
    expect(v0.procedures[0]).toMatchObject({ name: "run", applicability: "unknown" });
    expect(v0.actions).toEqual([]);
    const request1 = await f.store.putValue({ contract: "algal.probe-request.v1", procedure: f.procedure, nonce: "investigate-1" });
    const s1 = await f.investigate(pair, ref("op-investigate-1"), f.genesis, request1);
    expect(s1.transition.kind).toBe("investigate");
    expect(s1.state.memory).toBe(f.genesis.state.memory);
    const v1 = f.view(s1, { run: { status: "unknown" } });
    expect(v1.investigations.map(i => i.expectedState)).toEqual([s1.digest]);

    // 3. The dispatcher delivers the request; the sandboxed investigator
    // produces raw evidence and the observation commits a new state.
    const [d1] = await service.dispatchPending("workspace", f.dispatcher);
    if (!d1) throw new Error("probe request was not dispatched");
    expect(d1.status).toBe("settled");
    const s2 = await f.probe(pair, ref("op-observe-1"), s1, request1, f.scope);
    expect(s2.snapshot.state.sequence).toBe(2);

    // 4. A derivation now supports the procedure; the view emits a fenced
    // execute action and the dispatcher settles the episode.
    const q1 = await memory.query(s2.snapshot.digest, query);
    expect(q1.derivation.status).toBe("supported");
    const v2 = f.view(s2.snapshot, { run: { status: "supported", queryResult: { digest: q1.ref, state: s2.snapshot.digest, procedure: s2.snapshot.revision.entrypoints[0]!.manifest } } });
    expect(v2.actions.find(a => a.kind === "execute-procedure")).toMatchObject({ expectedState: s2.snapshot.digest });
    const runInput = await f.store.putValue({ contract: "algal.run-input.v1", task: "task-1" });
    const s3 = await service.commit({ application: "workspace", operation: ref("op-execute-1"), kind: "investigate", expectedHead: s2.snapshot.digest, revision: s2.snapshot.state.revision, memory: s2.snapshot.state.memory, intents: [{ kind: "start-episode", entrypoint: "run", input: runInput }], evidence: [q1.ref], causedBy: null });
    const [d2] = await service.dispatchPending("workspace", f.dispatcher);
    if (!d2 || d2.plan.kind !== "episode") throw new Error("expected episode dispatch");
    expect(d2.status).toBe("settled");
    expect(d2.plan.binding).toMatchObject({ entrypoint: "run", sourceState: s3.digest, epoch: 0 });

    // 5. A dependency mutation advances the frontier; support goes stale.
    const scopeB = await f.bumpFrontier();
    const q2 = await memory.query(s3.digest, query);
    expect(q2.derivation.status).toBe("stale");

    // 6. Restart reconstructs the head and full lineage; settled dispatches
    // never repeat, and the stale result still explains its captured state.
    const pair2 = f.restart();
    expect((await pair2.service.inspect("workspace"))?.digest).toBe(s3.digest);
    expect((await pair2.service.history("workspace")).map(s => s.state.sequence)).toEqual([0, 1, 2, 3]);
    expect(await pair2.service.dispatchPending("workspace", f.dispatcher)).toEqual([]);
    expect((await pair2.memory.query(s3.digest, query)).derivation.status).toBe("stale");

    // A scoped re-investigation on the new frontier converges the loop again:
    // the same commit path admits a fresh observation under the new scope.
    const request2 = await f.store.putValue({ contract: "algal.probe-request.v1", procedure: f.procedure, nonce: "investigate-2" });
    const s4 = await f.investigate(pair2, ref("op-investigate-2"), s3, request2, [q2.ref]);
    const [d3] = await pair2.service.dispatchPending("workspace", f.dispatcher);
    if (!d3) throw new Error("re-investigation was not dispatched");
    expect(d3.status).toBe("settled");
    const s5 = await f.probe(pair2, ref("op-observe-2"), s4, request2, scopeB);
    expect((await pair2.memory.query(s5.snapshot.digest, query)).derivation.status).toBe("supported");

    // 7. A candidate revision is evaluated against the incumbent, admitted by
    // the trusted gate, and activated through an expected-head transition.
    const echoManifest = await f.store.putManifest(echo);
    const candidate = await putApplicationRecord(f.store, f.revisionBody(s5.snapshot.state.revision, echoManifest));
    const cases = await f.store.putValue({ contract: "algal.application-evaluation-cases.v1", cases: [
      { id: "train-a", split: "train", args: { q: "a" }, expect: { answer: "a" } },
      { id: "validation-b", split: "validation", args: { q: "b" }, expect: { answer: "b" } },
      { id: "holdout-c", split: "holdout", args: { q: "c" }, expect: { answer: "c" } },
    ] });
    const scorer = await f.store.putValue({ contract: "algal.application-evaluation-scorer.v1", scorer: null });
    const runtime = { fns: builtinRegistry(), executors: [] };
    const evaluated = await evaluateApplicationRevision(f.store, { contract: "algal.application-evaluation-request.v1", parentState: s5.snapshot.digest, candidateRevision: candidate, entrypoint: "run", cases, scorer, policy: f.evaluationPolicy }, runtime);
    expect(evaluated.evaluation.verdict.status).toBe("accepted");
    const admitted = await admitApplicationActivation(f.store, { evaluation: evaluated.evaluationRef, expectedState: s5.snapshot.digest, revision: candidate }, runtime);
    expect(admitted.revision).toBe(candidate);
    const s6 = await pair2.service.commit({ application: "workspace", operation: ref("op-activate-1"), kind: "activate", expectedHead: s5.snapshot.digest, revision: candidate, memory: s5.snapshot.state.memory, intents: [], evidence: [evaluated.evaluationRef], causedBy: null });
    expect(s6.state.epoch).toBe(1);
    expect(s6.state.revision).toBe(candidate);
    expect((await pair2.service.inspect("workspace"))?.digest).toBe(s6.digest);
    expect((await pair2.service.history("workspace")).map(s => s.transition.kind)).toEqual(["create", "investigate", "memory", "investigate", "investigate", "memory", "activate"]);
  });

  test("an undispatched intent survives restart and dispatches exactly once", async () => {
    const f = await fixture();
    const request = await f.store.putValue({ contract: "algal.probe-request.v1", procedure: f.procedure, nonce: "survive" });
    const s1 = await f.investigate({ service: f.service, memory: f.memory }, ref("op-survive"), f.genesis, request);
    const reopened = f.restart();
    let calls = 0;
    const counting = { configurationDigest: f.dispatcher.configurationDigest, async dispatch(ctx: ApplicationDispatchContext) { calls++; return f.dispatcher.dispatch(ctx); } };
    const [record] = await reopened.service.dispatchPending("workspace", counting);
    if (!record) throw new Error("pending intent was lost across restart");
    expect(calls).toBe(1);
    expect(record.status).toBe("settled");
    expect(record.sourceState).toBe(s1.digest);
    expect(await reopened.service.dispatchPending("workspace", counting)).toEqual([]);
  });
});
