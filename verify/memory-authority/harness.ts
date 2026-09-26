/**
 * Instrumented authority harness for the `memory-authority` suite.
 *
 * Every seam is deterministic — no wall clock, no provider, no filesystem:
 *
 * - `checkerEngine` is a `MemoryQueryEngine` over the independent derivation
 *   checker (`verify/reference/memory`): `query` runs the checker's naive
 *   least-fixpoint evaluator and emits the exact `algal.query-result.v1`
 *   envelope; `verify` re-runs `checkQueryResult` with the snapshot's declared
 *   sources as the admitted selection. Engine evidence therefore composes
 *   with the independent oracle instead of with itself. The engine identity
 *   is a parameter so cases can pin that authority does not transfer across
 *   engines.
 * - `instrumentedPolicyHost` wraps the *production* policy host
 *   (`createApplicationPolicyHost`, `src/application-host.ts`) with a recorded
 *   call log and a movable attested-frontier cell. Moving the frontier is
 *   exactly what the native fixture does by swapping `policy.frontier`: the
 *   frontier is excluded from the admission identity but included in the
 *   dispatcher configuration, and this wrapper reproduces both fields
 *   faithfully (`identity` stays, `configurationDigest` tracks the served
 *   policy record).
 * - `authorityFixture` builds the whole CAS record graph — schema, settled
 *   frontier, attestation, procedures, decoder policies, scope, programs,
 *   queries, view spec, runtime profile, evaluation policy, compiled
 *   entrypoint manifest, revision with a goal, genesis memory and state —
 *   through the real service paths on `MemoryApplicationStorage` +
 *   `ApplicationCore`. Observations flow through `service.observe` and the
 *   committed-state bridge `appendObservation`; memory successors through
 *   `service.snapshot` + `lifecycle.commit`.
 */
import {
  admitProgram, admitSnapshot, checkQueryResult, digestDocument, internals,
  type Input as CheckerInput, type Json,
} from "../reference/memory/checker";
import {
  ApplicationMemoryService, APPLICATION_MEMORY_NATIVE_LIMITS,
  parseMemorySnapshot,
  type MemoryAdmissionHost, type MemoryClaim, type MemoryDerivation,
  type MemoryEngineResult, type MemoryQueryEngine, type MemorySnapshot,
} from "../../src/application-memory";
import {
  applicationJson, getApplicationRecord, putApplicationRecord,
  parseApplicationRevision, parseApplicationState,
  type ApplicationRevision,
} from "../../src/application-contract";
import { ApplicationCore, type ApplicationSnapshot } from "../../src/application-core";
import { MemoryApplicationStorage } from "../../src/application-storage";
import {
  createApplicationPolicyHost, parseApplicationHostPolicy,
  type ApplicationHostPolicy,
} from "../../src/application-host";
import type { ApplicationAdmission, ApplicationDispatcher } from "../../src/application";
import { appendObservation } from "../../src/application-observation";
import { capabilityHandle } from "../../src/capabilities";
import { parseOrganismManifest } from "../../src/contract";
import { digestCanonical, type Digest } from "../../src/digest";
import { MemoryStore } from "../../src/store-memory";
import type { Store } from "../../src/store-contract";
import type { JsonValue } from "../../src/values";

export const ref = (value: unknown): Digest => digestCanonical(applicationJson(value));
const json = applicationJson;

/** Logical clock over host callbacks — injected, monotone, replayable. */
export interface HostCall {
  readonly tick: number;
  readonly op:
    | "admitCommit" | "admitDispatch" | "currentFrontier" | "validateScope"
    | "decodeObservation" | "dispatch" | "reconcile";
  readonly detail: string;
}

export interface InstrumentedPolicyHost
  extends ApplicationAdmission, MemoryAdmissionHost, ApplicationDispatcher {
  /** Host calls on a logical clock, in order. */
  readonly calls: HostCall[];
  /** The frontier this host currently attests; `setFrontier` moves it and
   *  `configurationDigest` follows, exactly like swapping `policy.frontier`
   *  in `createApplicationPolicyHost`. `identity` is unchanged because the
   *  admission identity excludes the frontier field. */
  setFrontier(frontier: Digest): void;
  /** Denial knobs for fail-closed cases: refuse one decoder digest or all
   *  scope validation. These wrap the unchanged production logic the way a
   *  stricter policy or an unavailable decoder would. */
  readonly denyDecoders: Set<Digest>;
  denyScopes: boolean;
  /** The parsed admitted policy (`parseApplicationHostPolicy`). */
  readonly policyRecord: ApplicationHostPolicy;
}

/** Wrap the production policy host; the returned object carries the host's
 *  own identity and authority, just observed. `memoryEngine` is required so
 *  the episode-admission reproduction path is exercised, never stubbed. */
export function instrumentedPolicyHost(input: unknown, options: {
  memoryEngine: MemoryQueryEngine;
  frontierOverride?: Digest;
}): InstrumentedPolicyHost {
  const inner = createApplicationPolicyHost(input, {
    channelsDir: "/nonexistent-algal-authority-lane",
    memoryEngine: options.memoryEngine,
  });
  const policyRecord = parseApplicationHostPolicy(input);
  const calls: HostCall[] = [];
  let tick = 0;
  let frontier: Digest = options.frontierOverride ?? policyRecord.frontier;
  const host: InstrumentedPolicyHost = {
    identity: inner.identity,
    calls,
    denyDecoders: new Set(),
    denyScopes: false,
    policyRecord,
    get configurationDigest() {
      return digestCanonical(json({
        contract: "algal.host-dispatcher.v1",
        policy: digestCanonical(json({ ...(input as Record<string, JsonValue>), frontier })),
      }));
    },
    setFrontier(next) { frontier = next; },
    async admitCommit(context) {
      calls.push({ tick: ++tick, op: "admitCommit", detail: `${context.command.kind}:${context.command.application}` });
      return inner.admitCommit(context);
    },
    async admitDispatch(context) {
      calls.push({ tick: ++tick, op: "admitDispatch", detail: `${context.intent.kind}:${context.intent.application}` });
      return inner.admitDispatch!(context);
    },
    async currentFrontier(application) {
      calls.push({ tick: ++tick, op: "currentFrontier", detail: application });
      return frontier;
    },
    async validateScope(input) {
      calls.push({ tick: ++tick, op: "validateScope", detail: `${input.scope.application}/${input.scope.environment}/${input.scope.task}` });
      if (host.denyScopes) throw new Error("Authority withheld: scope validation refused");
      return inner.validateScope(input);
    },
    async decodeObservation(input): Promise<MemoryClaim[]> {
      calls.push({ tick: ++tick, op: "decodeObservation", detail: input.observation.procedure });
      if (host.denyDecoders.has(input.observation.decoder)) {
        throw new Error("Authority withheld: decoder refused");
      }
      return inner.decodeObservation(input);
    },
    async dispatch(context) {
      calls.push({ tick: ++tick, op: "dispatch", detail: context.intent.kind });
      return inner.dispatch(context);
    },
    async reconcile(context) {
      calls.push({ tick: ++tick, op: "reconcile", detail: context.intent.kind });
      return inner.reconcile!(context);
    },
  };
  return host;
}

/** Deterministic work figure inside the 0..50_000 derivation bound — this
 *  engine does not pretend to reproduce the native work ledger. */
function engineWork(rounds: number, derived: number, rows: number): number {
  return rounds * 100 + derived * 10 + rows;
}

/** A `MemoryQueryEngine` whose evaluation and verification are the
 *  independent checker — production plays no part. `verify` binds each
 *  fact's declared sources as the admitted selection. */
export function checkerEngine(identity?: JsonValue): MemoryQueryEngine {
  return {
    identity: digestCanonical(
      json(identity ?? { contract: "algal.memory-authority-engine.v1" }),
    ),
    async query(snapshot: JsonValue, program: JsonValue): Promise<MemoryEngineResult> {
      const snap = admitSnapshot(snapshot);
      const prog = admitProgram(program);
      const out = internals.evaluate(snap.facts, prog.rules, prog.query, prog.limits);
      if (!out.ok) {
        return { kind: "incomplete", status: "exhausted", reason: out.reason ?? "exhausted", work: null };
      }
      const rows = [...out.rows.values()].map(r => ({ tuple: r.tuple, proof: r.proof }));
      const result: JsonValue = json({
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

/** Re-check a stored derivation's retained evidence with the independent
 *  checker — mirroring production `checkDerivation`, which declares the
 *  fact rows' own source triples as the admitted selection. Snapshot,
 *  program and `algal.query-result.v1` envelope are re-read from CAS; the
 *  checker's own digest recomputation binds the claim to those records. */
export async function checkStoredDerivation(store: Store, derivation: MemoryDerivation): Promise<boolean> {
  if (derivation.result === null || derivation.snapshot === null) return false;
  const snapshot = await store.getValue(derivation.snapshot);
  const program = await store.getValue(derivation.program);
  const result = await store.getValue(derivation.result);
  if (snapshot === undefined || program === undefined || result === undefined) return false;
  const declaredSources = [...new Set(admitSnapshot(snapshot).facts.flatMap(f => f.sources))].sort();
  return checkQueryResult({
    snapshot: snapshot as never, program: program as never,
    claimed: result as never, selection: { allowedSources: declaredSources },
  }).accept === true;
}

export interface AuthorityFixture {
  readonly store: MemoryStore;
  readonly storage: MemoryApplicationStorage;
  readonly host: InstrumentedPolicyHost;
  readonly engine: MemoryQueryEngine;
  readonly lifecycle: ApplicationCore;
  readonly memory: ApplicationMemoryService;
  readonly schema: Digest;
  readonly frontier0: Digest;
  readonly attestation: Digest;
  readonly decoder: Digest;
  readonly decoder2: Digest;
  readonly procedure: Digest;      // id "probe", no dependencies
  readonly procedureDeps: Digest;  // id "probe-deps", dependencies ["tool"]
  readonly procedure2: Digest;     // id "audit", own decoder, never selected by `query`
  readonly toolV1: Digest;         // records a `tool` binding version may name
  readonly toolV2: Digest;
  readonly scope: Digest;          // env "fixture", frontier0, no bindings, completeFor [probe]
  readonly program: Digest;
  readonly program2: Digest;       // one-hop rule program over the same facts
  readonly query: Digest;          // id "applicable", procedures [probe]
  readonly query2: Digest;         // id "reachable", rule program, procedures [probe]
  readonly queries: Digest;
  readonly revision: Digest;
  readonly revisionRecord: ApplicationRevision;
  readonly manifest: Digest;
  readonly goal: Digest;
  readonly genesisMemory: Digest;
  readonly genesis: ApplicationSnapshot;
  readonly policyInput: JsonValue;
  /** Fresh instrumented host over the same policy with `frontier` swapped —
   *  the production pattern (admission identity preserved, dispatcher
   *  configuration rebound). Services are rebuilt over the shared storage. */
  hostAt(frontier: Digest): {
    host: InstrumentedPolicyHost;
    lifecycle: ApplicationCore;
    memory: ApplicationMemoryService;
  };
  /** Admit one raw observation through `service.observe` (the host decode
   *  path) and return its record reference — no snapshot/state writes. */
  admit(tool: string, polarity?: "supported" | "opposed", over?: {
    scope?: Digest; procedure?: Digest; decoder?: Digest; raw?: JsonValue;
  }): Promise<Digest>;
  /** Full bridge: observe + successor snapshot + committed `memory`
   *  transition via `appendObservation` — returns the new head snapshot. */
  observe(tool: string, polarity: "supported" | "opposed", head: ApplicationSnapshot, tag: string): Promise<{
    observation: Digest; memory: Digest; snapshot: ApplicationSnapshot;
  }>;
  /** Direct write of an observation-shaped record, bypassing `observe()` —
   *  the stored claims stand or fall on the record's own bytes at replay. */
  forgeObservation(claims: MemoryClaim[], over?: {
    scope?: Digest; procedure?: Digest; decoder?: Digest;
    admission?: Digest; raw?: Digest; receipt?: Digest;
  }): Promise<Digest>;
  /** Write the next frontier record (settled by default); does NOT move a host. */
  frontierAfter(previous: Digest, opts?: { status?: "settled" | "uncertain"; application?: string }): Promise<Digest>;
  /** Read the state record's memory snapshot + revision. */
  readState(stateRef: Digest): Promise<{ memory: MemorySnapshot; revision: ApplicationRevision }>;
}

const ENVIRONMENT = "fixture";
const APPLICATION = "workspace";

export async function authorityFixture(options: {
  engine?: MemoryQueryEngine;
  attestation?: string;
} = {}): Promise<AuthorityFixture> {
  const store = new MemoryStore();
  const storage = new MemoryApplicationStorage(store);
  const engine = options.engine ?? checkerEngine();

  const put = (v: unknown): Promise<Digest> => putApplicationRecord(store, v);
  const schema = await put({
    contract: "algal.application-memory-schema.v1",
    relations: [{ name: "available", arity: 1 }, { name: "endorsed", arity: 1 }],
  });
  const frontier0 = await put({
    contract: "algal.application-memory-frontier.v1",
    application: APPLICATION, previous: null, sequence: 0, mutation: null, status: "settled",
  });
  const attestationContract = options.attestation ?? "algal.probe-attestation.v1";
  const attestation = await put({ contract: attestationContract });
  const manifest = await store.putManifest(parseOrganismManifest({
    contract: "algal.organism.v1", key: "organism:memory-authority", name: "Authority probe",
    cells: [
      { id: "src", kind: "input", outputs: { value: "json" } },
      { id: "out", kind: "const", outputs: { value: { type: "json", value: { answer: "ok" } } } },
    ],
    edges: [],
  }));
  const decoder = await put({ contract: "algal.probe-decoder.v1" });
  const decoder2 = await put({ contract: "algal.probe-decoder.v1", lane: "second" });
  const procedure = await put({
    contract: "algal.application-memory-procedure.v1",
    id: "probe", schema, manifest, decoder, dependencies: [], prerequisite: null,
  });
  const toolV1 = await put({ contract: "algal.probe-tool.v1", version: 1 });
  const toolV2 = await put({ contract: "algal.probe-tool.v1", version: 2 });
  const procedureDeps = await put({
    contract: "algal.application-memory-procedure.v1",
    id: "probe-deps", schema, manifest, decoder, dependencies: ["tool"], prerequisite: null,
  });
  const procedure2 = await put({
    contract: "algal.application-memory-procedure.v1",
    id: "audit", schema, manifest, decoder: decoder2, dependencies: [], prerequisite: null,
  });
  const program = await put({
    contract: "algal.query.v1",
    rules: [],
    query: { relation: "available", terms: [{ var: "x" }, { var: "polarity" }] },
    limits: { ...APPLICATION_MEMORY_NATIVE_LIMITS },
  });
  // One-hop rule program: derives reachable(x,p) from available(x,p) — the
  // produced proof DAG carries a rule node over the fact leaf.
  const program2 = await put({
    contract: "algal.query.v1",
    rules: [{
      id: "lift",
      head: { relation: "reachable", terms: [{ var: "x" }, { var: "p" }] },
      body: [{ relation: "available", terms: [{ var: "x" }, { var: "p" }] }],
    }],
    query: { relation: "reachable", terms: [{ var: "x" }, { var: "p" }] },
    limits: { ...APPLICATION_MEMORY_NATIVE_LIMITS },
  });
  const query = await put({
    contract: "algal.application-memory-query.v1",
    id: "applicable", schema, program, procedures: [procedure],
    polarityColumn: 1, conflict: "set-of-values",
  });
  const query2 = await put({
    contract: "algal.application-memory-query.v1",
    id: "reachable", schema, program: program2, procedures: [procedure],
    polarityColumn: 1, conflict: "single-value",
  });
  const queries = await put({
    contract: "algal.application-memory-queries.v1",
    queries: [query, query2].sort(),
  });
  const views = await put({
    contract: "algal.application-view-spec.v1", title: "Authority",
    widgets: ["goals", "procedures"],
  });
  const runtimeProfile = await put({
    contract: "algal.application-runtime-profile.v1",
    runtime: "bun-native-memory", policy: "pure-case-evaluation.v1",
  });
  const evaluationPolicy = await put({
    contract: "algal.application-evaluation-policy.v1",
    maxCases: 8, maxWork: 1_000_000, maxModelCalls: 0,
    requireHoldoutPass: true, strictValidationImprovement: true,
  });
  const goal = await put({
    contract: "algal.application-goal.v1",
    application: APPLICATION, id: "g-applicable",
    description: "Establish current availability.", query, entrypoint: "run",
  });
  const profile = ref({ contract: "algal.probe-profile.v1" });
  const decoderRows = [
    { decoder, rawContract: "algal.probe-raw.v1", receiptContract: "algal.probe-receipt.v1", receiptBinding: "names-raw" },
    { decoder: decoder2, rawContract: "algal.probe-raw.v1", receiptContract: "algal.probe-receipt.v1", receiptBinding: "names-raw" },
  ].sort((a, b) => a.decoder < b.decoder ? -1 : 1) as JsonValue[];
  const policyInput = json({
    contract: "algal.application-host.v1",
    application: APPLICATION, frontier: frontier0, hostProfile: profile,
    episodeAccess: "observe",
    routes: [{ route: "inbox", recipient: capabilityHandle("mailbox-send", "authority-probe"), hostProfile: profile }],
    attestation: attestationContract,
    decoders: decoderRows,
  });
  const host = instrumentedPolicyHost(policyInput, { memoryEngine: engine });
  const memory = new ApplicationMemoryService({ store, engine, admission: host });
  const lifecycle = new ApplicationCore(storage, host);

  const scope = await memory.putScope({
    contract: "algal.application-memory-scope.v1",
    application: APPLICATION, environment: ENVIRONMENT, task: "task-1",
    frontier: frontier0, bindings: [], completeFor: [procedure], attestation,
  });
  const revisionBody = {
    contract: "algal.application-revision.v1",
    application: APPLICATION, parent: null, schema, queries, views,
    runtimeProfile, evaluationPolicy, capabilityRequirements: [],
    goals: [goal],
    entrypoints: [{
      name: "run", manifest, applicability: query, maxGenerations: 1,
      capabilities: [], queries: [query, query2].sort(),
    }],
  };
  const revision = await put(revisionBody);
  const revisionRecord = parseApplicationRevision(await store.getValue(revision));
  const genesisMemory = await memory.snapshot({
    application: APPLICATION, schema, previous: null, scope,
    observations: [], hypotheses: [], withdrawn: [],
  });
  const genesis = await lifecycle.create({
    application: APPLICATION, operation: ref("op-genesis"), kind: "create",
    expectedHead: null, revision, memory: genesisMemory, intents: [], evidence: [], causedBy: null,
  });

  return {
    store, storage, host, engine, lifecycle, memory,
    schema, frontier0, attestation, decoder, decoder2,
    procedure, procedureDeps, procedure2, toolV1, toolV2,
    scope, program, program2, query, query2, queries,
    revision, revisionRecord, manifest, goal, genesisMemory, genesis, policyInput,

    hostAt(nextFrontier) {
      const moved = instrumentedPolicyHost(
        { ...(policyInput as Record<string, JsonValue>), frontier: nextFrontier },
        { memoryEngine: engine },
      );
      return {
        host: moved,
        lifecycle: new ApplicationCore(storage, moved),
        memory: new ApplicationMemoryService({ store, engine, admission: moved }),
      };
    },

    async admit(tool, polarity = "supported", over = {}) {
      const raw = await put(over.raw ?? {
        contract: "algal.probe-raw.v1", tool,
        claims: [{ relation: "available", tuple: [tool], polarity }],
      });
      const receipt = await put({ contract: "algal.probe-receipt.v1", raw });
      return memory.observe({
        application: APPLICATION,
        scope: over.scope ?? scope,
        procedure: over.procedure ?? procedure,
        raw, receipt,
        decoder: over.decoder ?? decoder,
      });
    },

    async observe(tool, polarity, head, tag) {
      const raw = await put({
        contract: "algal.probe-raw.v1", tool,
        claims: [{ relation: "available", tuple: [tool], polarity }],
      });
      const receipt = await put({ contract: "algal.probe-receipt.v1", raw });
      const out = await appendObservation(lifecycle, memory, {
        application: APPLICATION, operation: ref(`op-${tag}`),
        expectedHead: head.digest, expectedMemory: head.state.memory,
        observation: { application: APPLICATION, scope, procedure, raw, receipt, decoder },
      });
      return { observation: out.observation, memory: out.memory, snapshot: out.snapshot };
    },

    async forgeObservation(claims, over = {}) {
      const raw = over.raw ?? await put({
        contract: "algal.probe-raw.v1", tool: "forged",
        claims: [{ relation: "available", tuple: ["forged"], polarity: "supported" }],
      });
      const receipt = over.receipt ?? await put({ contract: "algal.probe-receipt.v1", raw });
      return put({
        contract: "algal.application-memory-observation.v1",
        application: APPLICATION,
        scope: over.scope ?? scope,
        procedure: over.procedure ?? procedure,
        raw, receipt,
        decoder: over.decoder ?? decoder,
        admission: over.admission ?? host.identity,
        claims,
      });
    },

    async frontierAfter(previous, opts = {}) {
      const prior = await getApplicationRecord(store, previous, (v) => v) as {
        application: string; sequence: number;
      };
      return put({
        contract: "algal.application-memory-frontier.v1",
        application: opts.application ?? prior.application,
        previous, sequence: prior.sequence + 1,
        mutation: await put({ contract: "algal.probe-mutation.v1", from: previous }),
        status: opts.status ?? "settled",
      });
    },

    async readState(stateRef) {
      const state = parseApplicationState(await store.getValue(stateRef));
      const memoryRecord = await getApplicationRecord(store, state.memory, parseMemorySnapshot);
      const revisionRecordInner = parseApplicationRevision(await store.getValue(state.revision));
      return { memory: memoryRecord, revision: revisionRecordInner };
    },
  };
}

/** Write an `algal.application-state.v1` + transition pair directly (NOT
 *  through `lifecycle.commit`) so a case can hand the service a captured
 *  state the lifecycle never produced — the derivation must bind it, and
 *  consumers must refuse to act on it anyway. */
export async function writeRawState(fx: AuthorityFixture, input: {
  memory: Digest; previous: Digest | null; sequence: number;
  revision?: Digest; kind?: string; operation?: string;
}): Promise<Digest> {
  const tag = input.operation ?? `raw-${input.sequence}`;
  const transition = await putApplicationRecord(fx.store, {
    contract: "algal.application-transition.v1",
    application: APPLICATION, operation: ref(`op-${tag}`),
    request: ref(`req-${tag}`),
    kind: input.kind ?? "memory", previous: input.previous,
    revision: input.revision ?? fx.revision, memory: input.memory,
    intents: [], evidence: [], causedBy: null,
  });
  return putApplicationRecord(fx.store, {
    contract: "algal.application-state.v1",
    application: APPLICATION, sequence: input.sequence, epoch: 0,
    revision: input.revision ?? fx.revision, memory: input.memory,
    previous: input.previous, transition,
  });
}

export type { Digest };
