/**
 * Instrumented host for the context-laws suite.
 *
 * Every host seam is deterministic and recorded on a logical clock — no wall
 * clock, no provider, no ambient authority:
 *
 * - `probeAdmissionHost` is a `MemoryAdmissionHost` that records each call,
 *   serves the current frontier from an explicit cell the test moves, and
 *   decodes only `algal.probe-observation.v1` records into `available` claims
 *   whose polarity comes from the record itself. Anything else fails closed.
 * - `checkerEngine` is a `MemoryQueryEngine` implemented over the independent
 *   derivation checker (`verify/reference/memory`): `query` runs the
 *   checker's naive least-fixpoint evaluator and emits the exact
 *   `algal.query-result.v1` envelope; `verify` re-runs `checkQueryResult`
 *   with the snapshot's declared sources as the admitted selection. Engine
 *   output that the checker cannot reproduce can therefore never verify.
 * - `memoryFixture` builds the whole CAS record graph (schema → frontier →
 *   procedure → scope → program → query → bundle → revision → memory →
 *   state) on a `MemoryStore`, so the `ApplicationMemoryService` query path
 *   is exercised end-to-end in memory.
 */
import {
  admitProgram, admitSnapshot, checkQueryResult, digestDocument,
  internals, type Input as CheckerInput, type Json,
} from "../reference/memory/checker";
import {
  ApplicationMemoryService,
  type MemoryAdmissionHost, type MemoryClaim, type MemoryDerivation,
  type MemoryEngineResult, type MemoryQueryEngine, type MemorySnapshot,
} from "../../src/application-memory";
import {
  applicationJson, getApplicationRecord, putApplicationRecord,
} from "../../src/application-contract";
import { digestCanonical, type Digest } from "../../src/digest";
import { MemoryStore } from "../../src/store-memory";
import type { Store } from "../../src/store-contract";
import type { JsonValue } from "../../src/values";

export const ref = (value: unknown): Digest => digestCanonical(value as never);

/** Logical clock over host callbacks — injected, monotone, replayable. */
export interface HostCall {
  readonly tick: number;
  readonly op: "currentFrontier" | "validateScope" | "decodeObservation";
  readonly detail: string;
}

export interface ProbeAdmissionHost extends MemoryAdmissionHost {
  /** The frontier the host currently attests; tests move this to make
   *  previously-admitted scopes stale. */
  current: Digest;
  readonly calls: HostCall[];
}

export function probeAdmissionHost(): ProbeAdmissionHost {
  const calls: HostCall[] = [];
  let tick = 0;
  const host: ProbeAdmissionHost = {
    identity: ref({ contract: "algal.context-laws-admission.v1" }),
    current: ref("frontier-unset"),
    calls,
    async currentFrontier(application: string) {
      calls.push({ tick: ++tick, op: "currentFrontier", detail: application });
      return host.current;
    },
    async validateScope(input) {
      calls.push({ tick: ++tick, op: "validateScope", detail: input.scope.task });
      // fixture admits every well-formed scope; authority failures are
      // exercised by constructing records the host would not produce.
    },
    async decodeObservation(input): Promise<MemoryClaim[]> {
      calls.push({ tick: ++tick, op: "decodeObservation", detail: input.observation.procedure });
      const raw = input.raw as { contract?: unknown; tool?: unknown; verdict?: unknown };
      if (raw?.contract !== "algal.probe-observation.v1" || typeof raw.tool !== "string") {
        throw new Error("raw evidence failed admission");
      }
      const polarity = raw.verdict === "opposed" ? "opposed" : "supported";
      return [{ relation: "available", tuple: [raw.tool], polarity }];
    },
  };
  return host;
}

/** Deterministic work figure inside the 0..50_000 derivation bound — the
 *  engine does not pretend to reproduce the native ledger. */
function engineWork(rounds: number, derived: number, rows: number): number {
  return rounds * 100 + derived * 10 + rows;
}

/** A `MemoryQueryEngine` whose evaluation and verification are the
 *  independent checker — production plays no part. `verify` additionally
 *  binds each fact's declared sources as the admitted selection. */
export function checkerEngine(): MemoryQueryEngine {
  return {
    identity: ref({ contract: "algal.context-laws-engine.v1" }),
    async query(snapshot: JsonValue, program: JsonValue): Promise<MemoryEngineResult> {
      const snap = admitSnapshot(snapshot);
      const prog = admitProgram(program);
      const out = internals.evaluate(snap.facts, prog.rules, prog.query, prog.limits);
      if (!out.ok) {
        return { kind: "incomplete", status: "exhausted", reason: out.reason ?? "exhausted", work: null };
      }
      const rows = [...out.rows.values()].map(r => ({ tuple: r.tuple, proof: r.proof }));
      const result: JsonValue = applicationJson({
        contract: "algal.query-result.v1",
        snapshot: digestDocument(snapshot as unknown as Json),
        program: digestDocument(program as unknown as Json),
        complete: true,
        witnessPolicy: "first-canonical-derivation",
        rows,
        proofs: out.proofNodes,
        work: engineWork(out.rounds, out.derivedFacts, rows.length),
        rounds: out.rounds,
        baseFacts: out.baseFacts,
        derivedFacts: out.derivedFacts,
      });
      return { kind: "complete", result };
    },
    async verify(snapshot: JsonValue, program: JsonValue, result: JsonValue): Promise<boolean> {
      const snap = admitSnapshot(snapshot);
      const selection = {
        allowedSources: [...new Set(snap.facts.flatMap(f => f.sources))].sort(),
      };
      const input: CheckerInput = {
        snapshot: snapshot as never, program: program as never,
        claimed: result as never, selection,
      };
      return checkQueryResult(input).accept === true;
    },
    async settle() {},
  };
}

export interface MemoryFixture {
  readonly store: Store;
  readonly service: ApplicationMemoryService;
  readonly host: ProbeAdmissionHost;
  readonly engine: MemoryQueryEngine;
  readonly schema: Digest;
  readonly frontier0: Digest;
  readonly procedure: Digest;
  readonly decoder: Digest;
  readonly scope: Digest;
  readonly program: Digest;
  readonly query: Digest;
  readonly revision: Digest;
  readonly genesisMemory: Digest;
  readonly genesisState: Digest;
  /** Admit one probe observation and fold it into a successor memory +
   *  state record pair through the real service paths. */
  observe(tool: string, verdict: "supported" | "opposed", previous: { memory: Digest; state: Digest; sequence: number }): Promise<{ observation: Digest; memory: Digest; state: Digest }>;
  /** Write a *raw* observation record directly, bypassing `observe()` — used
   *  to construct evidence whose stored claims do not match host decoding. */
  forgeObservation(claims: MemoryClaim[], admission?: Digest): Promise<Digest>;
  /** Advance the host's attested frontier to a settled successor. */
  advanceFrontier(): Promise<Digest>;
  /** Re-run the independent checker over a stored derivation's evidence. */
  checkDerivation(derivation: MemoryDerivation): Promise<boolean>;
}

export async function memoryFixture(store: Store = new MemoryStore()): Promise<MemoryFixture> {
  const host = probeAdmissionHost();
  const engine = checkerEngine();
  const service = new ApplicationMemoryService({ store, engine, admission: host });

  const schema = await store.putValue({
    contract: "algal.application-memory-schema.v1",
    relations: [{ name: "available", arity: 1 }],
  });
  host.current = await putApplicationRecord(store, {
    contract: "algal.application-memory-frontier.v1",
    application: "workspace", previous: null, sequence: 0, mutation: null, status: "settled",
  });
  const frontier0 = host.current;
  const manifest = await store.putValue({ contract: "algal.context-laws-manifest.v1" });
  const decoder = await store.putValue({ contract: "algal.context-laws-decoder.v1" });
  const procedure = await store.putValue({
    contract: "algal.application-memory-procedure.v1",
    id: "probe", schema, manifest, decoder, dependencies: [], prerequisite: null,
  });
  const attestation = await store.putValue({ contract: "algal.context-laws-attestation.v1" });
  const scope = await service.putScope({
    contract: "algal.application-memory-scope.v1",
    application: "workspace", environment: "fixture", task: "task-1",
    frontier: frontier0, bindings: [], completeFor: [procedure], attestation,
  });
  const program = await store.putValue({
    contract: "algal.query.v1",
    rules: [],
    query: { relation: "available", terms: [{ var: "x" }, { var: "polarity" }] },
    limits: { maxWork: 50_000, maxRounds: 32, maxDerived: 128, maxBindings: 128, maxRows: 16, maxOutputBytes: 262_144 },
  });
  const query = await store.putValue({
    contract: "algal.application-memory-query.v1",
    id: "available", schema, program, procedures: [procedure],
    polarityColumn: 1, conflict: "single-value",
  });
  const queries = await store.putValue({
    contract: "algal.application-memory-queries.v1", queries: [query],
  });
  const views = await store.putValue({ contract: "algal.context-laws-views.v1" });
  const runtimeProfile = await store.putValue({ contract: "algal.context-laws-runtime.v1" });
  const evaluationPolicy = await store.putValue({ contract: "algal.context-laws-policy.v1" });
  const revision = await putApplicationRecord(store, {
    contract: "algal.application-revision.v1",
    application: "workspace", parent: null, schema, queries, views,
    runtimeProfile, evaluationPolicy, capabilityRequirements: [],
    entrypoints: [{ name: "run", manifest, applicability: query, maxGenerations: 1, capabilities: [], queries: [query] }],
  });
  const genesisMemory = await service.snapshot({
    application: "workspace", schema, previous: null, scope,
    observations: [], hypotheses: [], withdrawn: [],
  });
  const genesisTransition = await putApplicationRecord(store, {
    contract: "algal.application-transition.v1",
    application: "workspace", operation: ref("op-genesis"), request: ref("req-genesis"),
    kind: "create", previous: null, revision, memory: genesisMemory,
    intents: [], evidence: [], causedBy: null,
  });
  const genesisState = await putApplicationRecord(store, {
    contract: "algal.application-state.v1",
    application: "workspace", sequence: 0, epoch: 0, revision,
    memory: genesisMemory, previous: null, transition: genesisTransition,
  });

  async function stateRecord(sequence: number, memory: Digest, previous: Digest | null, tag: string): Promise<Digest> {
    const transition = await putApplicationRecord(store, {
      contract: "algal.application-transition.v1",
      application: "workspace", operation: ref(`op-${tag}`), request: ref(`req-${tag}`),
      kind: "memory", previous, revision, memory,
      intents: [], evidence: [], causedBy: null,
    });
    return putApplicationRecord(store, {
      contract: "algal.application-state.v1",
      application: "workspace", sequence, epoch: 0, revision,
      memory, previous, transition,
    });
  }

  return {
    store, service, host, engine, schema, frontier0, procedure, decoder,
    scope, program, query, revision, genesisMemory, genesisState,

    async observe(tool, verdict, previous) {
      const raw = await store.putValue({
        contract: "algal.probe-observation.v1", tool, verdict,
      });
      const receipt = await store.putValue({ contract: "algal.probe-receipt.v1", tool, verdict });
      const observation = await service.observe({
        application: "workspace", scope, procedure, raw, receipt, decoder,
      });
      const prior = await getApplicationRecord(store, previous.memory, (v) => v) as MemorySnapshot;
      const memory = await service.snapshot({
        application: "workspace", schema, previous: previous.memory, scope,
        observations: [...prior.observations, observation].sort(),
        hypotheses: prior.hypotheses, withdrawn: prior.withdrawn,
      });
      const state = await stateRecord(previous.sequence + 1, memory, previous.state, `obs-${tool}`);
      return { observation, memory, state };
    },

    async forgeObservation(claims, admission) {
      const raw = await store.putValue({ contract: "algal.probe-observation.v1", tool: "forged", verdict: "supported" });
      const receipt = await store.putValue({ contract: "algal.probe-receipt.v1", tool: "forged" });
      const record = {
        contract: "algal.application-memory-observation.v1",
        application: "workspace", scope, procedure, raw, receipt, decoder,
        admission: admission ?? host.identity,
        claims,
      };
      return putApplicationRecord(store, record);
    },

    async advanceFrontier() {
      const mutation = await store.putValue({ contract: "algal.context-laws-mutation.v1" });
      host.current = await putApplicationRecord(store, {
        contract: "algal.application-memory-frontier.v1",
        application: "workspace", previous: host.current,
        sequence: (await getApplicationRecord(store, host.current, (v) => v) as { sequence: number }).sequence + 1,
        mutation, status: "settled",
      });
      return host.current;
    },

    async checkDerivation(derivation) {
      if (derivation.result === null || derivation.snapshot === null) return false;
      const snapshot = await store.getValue(derivation.snapshot);
      const program = await store.getValue(derivation.program);
      const result = await store.getValue(derivation.result);
      if (snapshot === undefined || program === undefined || result === undefined) return false;
      return checkQueryResult({
        snapshot: snapshot as never, program: program as never,
        claimed: result as never, selection: {},
      }).accept === true;
    },
  };
}
