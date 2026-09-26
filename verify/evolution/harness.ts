/**
 * Instrumented harness for the `evolution-model` suite.
 *
 * Every host seam is deterministic and recorded on a logical clock — no wall
 * clock, no provider, no ambient authority:
 *
 * - `countingStore` wraps a `MemoryStore` and records every read/write call
 *   (op + digest) so cases can assert exactly which records a verifier
 *   re-traversed — e.g. that selection-policy verification replays every
 *   environment row's comparison and every cited evaluation's receipts.
 * - `instrumentedPolicyHost` wraps the production `createApplicationPolicyHost`
 *   (`src/application-host.ts`) and records every admission-host call. Host
 *   options (`selectionEnvironment`, `restorationPolicy`, `researchVerifier`,
 *   `memoryEngine`) are per-host, so a case can prove that the same stored
 *   policy records admit or deny purely by host opt-in.
 * - `instrumentedCases` wraps each evaluation case's `args`/`expect` records
 *   in counting proxies, separating value reads (`get`) from the name
 *   enumerations (`ownKeys`) the interface-admission check performs. The
 *   case set is the "pure case environment" the foundry/search population
 *   evaluator consumes; the counters pin whether holdout *values* are ever
 *   read before selection is fixed.
 * - `evolutionFixture` builds the whole CAS record graph (schema → frontier →
 *   procedure → scope → program → query → bundle → revision → memory →
 *   genesis state) on a `MemoryStore`, then commits through
 *   `ApplicationCore` on `MemoryApplicationStorage` under the instrumented
 *   policy host — no filesystem.
 * - `researchFixture` builds the sealed-research variant (`sealed-research-
 *   evaluation.v1` runtime profile, corpus, evaluator identity and a
 *   deterministic hash-seal verifier standing in for signature custody).
 */
import {
  evaluateApplicationRevision, type AdaptationRuntime,
} from "../../src/application-adaptation";
import {
  getApplicationRecord, applicationJson, putApplicationRecord,
  parseApplicationRevision,
} from "../../src/application-contract";
import { ApplicationCore, type ApplicationDispatchContext, type ApplicationSnapshot } from "../../src/application-core";
import { createApplicationPolicyHost } from "../../src/application-host";
import {
  ApplicationMemoryService, APPLICATION_MEMORY_NATIVE_LIMITS,
  type MemoryClaim, type MemoryEngineResult, type MemoryQueryEngine,
} from "../../src/application-memory";
import type { ApplicationRestorationPolicy } from "../../src/application-restoration";
import type { ApplicationResearchVerifier } from "../../src/application-research";
import { MemoryApplicationStorage } from "../../src/application-storage";
import { capabilityHandle } from "../../src/capabilities";
import { manifestToJson, parseOrganismManifest, type OrganismManifest } from "../../src/contract";
import { digestCanonical, type Digest } from "../../src/digest";
import { builtinRegistry } from "../../src/registry";
import { MemoryStore } from "../../src/store-memory";
import type { Store } from "../../src/store-contract";
import { canonicalize, type JsonValue } from "../../src/values";
import type { FoundryCase } from "../../src/foundry";
import type { ApplicationCommand, ApplicationDispatcher } from "../../src/application-core";

export const APPLICATION = "workspace";
export const ref = (value: unknown): Digest => digestCanonical(applicationJson(value));
export const hash = ref;
export const runtime: AdaptationRuntime = { fns: builtinRegistry() };

/* ------------------------------------------------------------------ */
/* Instrumented store                                                  */
/* ------------------------------------------------------------------ */

export interface StoreCall {
  readonly tick: number;
  readonly op:
    | "getManifest" | "putManifest" | "getReceipt" | "putReceipt"
    | "getValue" | "putValue" | "getEffect" | "putEffect"
    | "getSlot" | "setSlot";
  readonly ref: string;
}

export interface CountingStore extends Store {
  readonly calls: StoreCall[];
  /** Read calls against `digest` (getValue/getReceipt/getManifest/getEffect). */
  readsOf(digest: string): StoreCall[];
  /** Count of read calls against `digest` since `since` (a tick). */
  readCount(digest: string, since?: number): number;
}

export function countingStore(inner: Store = new MemoryStore()): CountingStore {
  const calls: StoreCall[] = [];
  let tick = 0;
  const note = (op: StoreCall["op"], ref: string) => { calls.push({ tick: ++tick, op, ref }); };
  const readOps = new Set(["getManifest", "getReceipt", "getValue", "getEffect", "getSlot"]);
  return {
    calls,
    readsOf: (digest: string) => calls.filter(c => c.ref === digest && readOps.has(c.op)),
    readCount: (digest: string, since = -1) => calls.filter(c => c.ref === digest && readOps.has(c.op) && c.tick > since).length,
    getManifest: async (d: Digest) => { note("getManifest", d); return inner.getManifest(d); },
    putManifest: async (m: OrganismManifest) => { const d = await inner.putManifest(m); note("putManifest", d); return d; },
    getReceipt: async (d: Digest) => { note("getReceipt", d); return inner.getReceipt(d); },
    putReceipt: async (r: JsonValue) => { const d = await inner.putReceipt(r); note("putReceipt", d); return d; },
    getValue: async (d: Digest) => { note("getValue", d); return inner.getValue(d); },
    putValue: async (v: JsonValue) => { const d = await inner.putValue(v); note("putValue", d); return d; },
    getEffect: async (d: Digest, executor?: string) => { note("getEffect", d); return inner.getEffect(d, executor); },
    putEffect: async (r: Parameters<Store["putEffect"]>[0], executor?: string) => { const d = await inner.putEffect(r, executor); note("putEffect", d); return d; },
    getSlot: async (name: string) => { note("getSlot", name); return inner.getSlot(name); },
    setSlot: async (name: string, v: JsonValue) => { note("setSlot", name); return inner.setSlot(name, v); },
  };
}

/* ------------------------------------------------------------------ */
/* Instrumented policy host                                            */
/* ------------------------------------------------------------------ */

export interface HostCall {
  readonly tick: number;
  readonly op:
    | "admitCommit" | "admitDispatch" | "currentFrontier"
    | "validateScope" | "decodeObservation" | "dispatch" | "reconcile";
  readonly detail: string;
}

export type HostOptions = {
  selectionEnvironment?: string;
  restorationPolicy?: unknown;
  researchVerifier?: ApplicationResearchVerifier;
  memoryEngine?: MemoryQueryEngine;
};

type BaseHost = ReturnType<typeof createApplicationPolicyHost>;

export interface InstrumentedHost extends BaseHost {
  readonly calls: HostCall[];
}

export function instrumentedPolicyHost(input: unknown, options: HostOptions = {}): InstrumentedHost {
  const calls: HostCall[] = [];
  let tick = 0;
  const inner = createApplicationPolicyHost(input, {
    channelsDir: "/nonexistent-evolution-lane-channels",
    ...(options.selectionEnvironment !== undefined ? { selectionEnvironment: options.selectionEnvironment } : {}),
    ...(options.restorationPolicy !== undefined ? { restorationPolicy: options.restorationPolicy as ApplicationRestorationPolicy } : {}),
    ...(options.researchVerifier !== undefined ? { researchVerifier: options.researchVerifier } : {}),
    ...(options.memoryEngine !== undefined ? { memoryEngine: options.memoryEngine } : {}),
  });
  const host: InstrumentedHost = {
    calls,
    identity: inner.identity,
    configurationDigest: inner.configurationDigest,
    async admitCommit(context) {
      calls.push({ tick: ++tick, op: "admitCommit", detail: `${context.command.kind}@${context.current?.digest ?? "genesis"}` });
      return inner.admitCommit(context);
    },
    async admitDispatch(context) {
      calls.push({ tick: ++tick, op: "admitDispatch", detail: context.intent.kind });
      return inner.admitDispatch!(context);
    },
    async currentFrontier(application: string) {
      calls.push({ tick: ++tick, op: "currentFrontier", detail: application });
      return inner.currentFrontier(application);
    },
    async validateScope(input) {
      calls.push({ tick: ++tick, op: "validateScope", detail: input.scope.task });
      return inner.validateScope(input);
    },
    async decodeObservation(input) {
      calls.push({ tick: ++tick, op: "decodeObservation", detail: input.observation.procedure });
      return inner.decodeObservation(input);
    },
    async dispatch(context: ApplicationDispatchContext) {
      calls.push({ tick: ++tick, op: "dispatch", detail: context.intent.kind });
      return inner.dispatch(context);
    },
    async reconcile(context: ApplicationDispatchContext) {
      calls.push({ tick: ++tick, op: "reconcile", detail: context.intent.kind });
      return inner.reconcile!(context);
    },
  };
  return host;
}

/** Engine stub: most of this lane never queries memory — the admission-only
 * engine the policy host builds internally covers validation; fixture queries
 * use this throwing engine so an accidental engine call is loud, not silent. */
export function stubEngine(): MemoryQueryEngine {
  return {
    identity: ref({ contract: "algal.evolution-stub-engine.v1" }),
    async query(): Promise<MemoryEngineResult> { throw new Error("evolution lane never queries memory"); },
    async verify(): Promise<boolean> { throw new Error("evolution lane never verifies queries"); },
    async settle() {},
  };
}

/** A deterministic, fully in-process `MemoryQueryEngine`: positive relational
 * selection over the provided fact snapshot. It is a fixture engine standing in
 * for the pinned native binary (`NativeMemoryQueryEngine` shells out to a built
 * `algal` executable, which is not part of this lane) — the engine is a
 * host-admitted plug, its identity lands in every derivation record, and the
 * production memory service still wraps its result in the real
 * `algal.application-memory-derivation.v1` custody. */
export function scriptedEngine(): MemoryQueryEngine & { readonly calls: { op: "query" | "verify"; snapshot: Digest }[] } {
  const calls: { op: "query" | "verify"; snapshot: Digest }[] = [];
  const identity = ref({ contract: "algal.evolution-engine.v1" });
  return {
    calls,
    identity,
    async query(snapshotInput: JsonValue, programInput: JsonValue): Promise<MemoryEngineResult> {
      const snapshot = applicationJson(snapshotInput) as { facts: { relation: string; tuple: JsonValue[]; sources: Digest[] }[] };
      const program = applicationJson(programInput) as { query: { relation: string; terms: JsonValue[] } };
      calls.push({ op: "query", snapshot: digestCanonical(snapshot) });
      const relation = program.query.relation;
      const rows = snapshot.facts
        .filter(fact => fact.relation === relation)
        .map(fact => ({ tuple: fact.tuple, proof: digestCanonical(applicationJson({ proof: fact })) }));
      return {
        kind: "complete",
        result: {
          contract: "algal.query-result.v1",
          snapshot: digestCanonical(snapshot), program: digestCanonical(applicationJson(program)),
          complete: true, witnessPolicy: "first-canonical-derivation",
          rows, proofs: rows.map(r => r.proof),
          work: Math.max(1, snapshot.facts.length), rounds: 1,
          baseFacts: snapshot.facts.length, derivedFacts: rows.length,
        },
      };
    },
    async verify(snapshotInput: JsonValue, programInput: JsonValue, resultInput: JsonValue): Promise<boolean> {
      const snapshot = applicationJson(snapshotInput);
      const program = applicationJson(programInput);
      calls.push({ op: "verify", snapshot: digestCanonical(snapshot) });
      const expected = await this.query(snapshotInput, programInput);
      return expected.kind === "complete" && canonicalize(expected.result as unknown as JsonValue) === canonicalize(resultInput);
    },
    async settle() {},
  };
}

/* ------------------------------------------------------------------ */
/* Instrumented case set (the admitted pure case environment)          */
/* ------------------------------------------------------------------ */

export interface CaseReads {
  /** `get` traps fired — a case field's *value* was consumed. */
  readonly valueReads: Record<string, number>;
  /** `ownKeys`/`has` traps fired — name enumeration only (interface admission). */
  readonly nameReads: Record<string, number>;
}

function countingRecord<T extends object>(obj: T, tally: { get: number; names: number }): T {
  const wrap = (value: unknown): unknown => {
    if (value !== null && typeof value === "object") {
      return new Proxy(value as Record<string, unknown>, {
        get: (target, key, recv) => { tally.get++; return Reflect.get(target, key, recv); },
        ownKeys: target => { tally.names++; return Reflect.ownKeys(target); },
        has: (target, key) => { tally.names++; return Reflect.has(target, key); },
      });
    }
    return value;
  };
  return new Proxy(obj, {
    get: (target, key, recv) => { tally.get++; return wrap(Reflect.get(target, key, recv)); },
    ownKeys: target => { tally.names++; return Reflect.ownKeys(target); },
    has: (target, key) => { tally.names++; return Reflect.has(target, key); },
  }) as T;
}

/** Wraps each case's `args` and `expect` records so a case can distinguish
 * "the decision surface read this holdout row's values" from "the admission
 * gate enumerated its declared names". The wrapped cases must not be CAS-
 * stored (MemoryStore structured-clones); they feed foundry/search directly. */
export function instrumentedCases(cases: FoundryCase[]): { cases: FoundryCase[]; reads: CaseReads } {
  const valueReads: Record<string, number> = {};
  const nameReads: Record<string, number> = {};
  const wrapped = cases.map(c => {
    const tally = { get: 0, names: 0 };
    const row: FoundryCase = { id: c.id, split: c.split, args: countingRecord(c.args, tally), expect: countingRecord(c.expect, tally) };
    Object.defineProperty(row, "__tally", { value: tally, enumerable: false });
    return row;
  });
  const reads: CaseReads = {
    get valueReads() {
      const out: Record<string, number> = {};
      for (const row of wrapped) out[row.id] = (row as unknown as { __tally: { get: number } }).__tally.get;
      return out;
    },
    get nameReads() {
      const out: Record<string, number> = {};
      for (const row of wrapped) out[row.id] = (row as unknown as { __tally: { names: number } }).__tally.names;
      return out;
    },
  };
  return { cases: wrapped, reads };
}

/* ------------------------------------------------------------------ */
/* Shared manifest builders                                            */
/* ------------------------------------------------------------------ */

const strategyInterface = {
  inputs: { q: { cell: "src", port: "value" } },
  outputs: { answer: { cell: "out", port: "out" } },
};

/** A pure `expr`-cell strategy with the `q`/`answer` interface. */
export function strategyManifest(key: string, program: JsonValue): JsonValue {
  return manifestToJson(parseOrganismManifest({
    contract: "algal.organism.v1", key: `organism:${key}`, name: key,
    interface: strategyInterface,
    cells: [
      { id: "src", kind: "input", outputs: { value: "json" } },
      { id: "out", kind: "expr", inputs: { value: "json" }, expr: { contract: "algal.expr.v1", program }, output: { kind: "json", schema: { type: "string" } } },
    ],
    edges: [{ from: { cell: "src", port: "value" }, to: { cell: "out", port: "value" } }],
  }));
}

export const INCUMBENT_PROGRAM: JsonValue = "ok";
/** Fixes the `v2` validation case and the `h1` holdout case; passes all. */
export const WINNER_PROGRAM: JsonValue =
  ["if", ["eq", ["get", "value"], "v2"], "v2-ok", ["if", ["eq", ["get", "value"], "h1"], "h1-ok", "ok"]];
/** Fails every case. */
export const LOSER_PROGRAM: JsonValue = "nope";
/** Improves validation (2/2 vs 1/2) but fails the holdout case. */
export const HOLDOUT_FAILURE_PROGRAM: JsonValue =
  ["if", ["eq", ["get", "value"], "v2"], "v2-ok", "ok"];
/** Regresses `v1` (incumbent passed) while fixing `v2`; no improvement. */
export const REGRESSING_PROGRAM: JsonValue =
  ["if", ["eq", ["get", "value"], "v2"], "v2-ok", "nope"];
/** Program error: every case outcome `failed`. */
export const CRASHING_PROGRAM: JsonValue = ["div", 1, 0];

export const INCUMBENT_VALUE = strategyManifest("incumbent", INCUMBENT_PROGRAM);
export const WINNER_VALUE = strategyManifest("winner", WINNER_PROGRAM);
/** A distinct winning program variant — accepted but never the selected row. */
export const WINNER_ALT_VALUE = strategyManifest("winner-alt", WINNER_PROGRAM);
export const LOSER_VALUE = strategyManifest("loser", LOSER_PROGRAM);
export const HOLDOUT_FAILURE_VALUE = strategyManifest("holdout-failure", HOLDOUT_FAILURE_PROGRAM);
export const REGRESSING_VALUE = strategyManifest("regressing", REGRESSING_PROGRAM);
export const CRASHING_VALUE = strategyManifest("crashing", CRASHING_PROGRAM);

/** Proposal/search generator: emits a fixed two-candidate list, ignores seed. */
export function generatorValue(withFeedback: boolean): JsonValue {
  const inputs: Record<string, { cell: string; port: string }> = { seed: { cell: "src", port: "value" } };
  const cells: JsonValue[] = [
    { id: "src", kind: "input", outputs: { value: "json" } },
    {
      id: "gen", kind: "expr", inputs: { seed: "json" },
      expr: { contract: "algal.expr.v1", program: ["list", ["quote", WINNER_VALUE], ["quote", LOSER_VALUE]] },
      output: { kind: "json", schema: { type: "array" } },
    },
  ];
  const edges: JsonValue[] = [{ from: { cell: "src", port: "value" }, to: { cell: "gen", port: "seed" } }];
  if (withFeedback) {
    inputs.feedback = { cell: "fb", port: "value" };
    cells.splice(1, 0, { id: "fb", kind: "input", outputs: { value: "json" } });
  }
  return manifestToJson(parseOrganismManifest({
    contract: "algal.organism.v1", key: `organism:generator${withFeedback ? "-fb" : ""}`, name: "generator",
    interface: { inputs, outputs: { candidates: { cell: "gen", port: "out" } } },
    cells, edges,
  }));
}

export const GENERATOR_VALUE = generatorValue(false);
export const SEARCH_GENERATOR_VALUE = generatorValue(true);

/** Migration program manifest: maps each projected claim to the
 * `supported-tool` relation (renaming `available`), preserving tuple/polarity.
 * The emitted claims literally depend on the source projection. */
export const MIGRATION_VALUE = manifestToJson(parseOrganismManifest({
  contract: "algal.organism.v1", key: "organism:migrate", name: "migrate",
  interface: {
    inputs: { claims: { cell: "claims", port: "value" }, frontier: { cell: "frontier", port: "value" } },
    outputs: { migrated: { cell: "out", port: "out" } },
  },
  cells: [
    { id: "claims", kind: "input", outputs: { value: "json" } },
    { id: "frontier", kind: "input", outputs: { value: "json" } },
    {
      id: "out", kind: "expr", inputs: { claims: "json" },
      expr: {
        contract: "algal.expr.v1",
        program: { claims: ["map", ["get", "claims"], "row", ["merge", ["get", "row", "claim"], ["quote", { relation: "supported-tool" }]]] },
      },
      output: { kind: "json", schema: { type: "object" } },
    },
  ],
  edges: [{ from: { cell: "claims", port: "value" }, to: { cell: "out", port: "claims" } }],
}));

/** An impure migration program (agent cell) — admission must reject it. The
 * `migrated` interface output still binds a real pure port; the agent cell's
 * mere presence is what admission must reject. */
export const IMPURE_MIGRATION_VALUE = manifestToJson(parseOrganismManifest({
  contract: "algal.organism.v1", key: "organism:migrate-agent", name: "migrate-agent",
  interface: {
    inputs: { claims: { cell: "claims", port: "value" }, frontier: { cell: "frontier", port: "value" } },
    outputs: { migrated: { cell: "out", port: "value" } },
  },
  cells: [
    { id: "claims", kind: "input", outputs: { value: "json" } },
    { id: "frontier", kind: "input", outputs: { value: "json" } },
    { id: "out", kind: "const", outputs: { value: { type: "json", value: { claims: [] } } } },
    { id: "side", kind: "agent", prompt: "never executed", output: { kind: "json", schema: { type: "object" } } },
  ],
  edges: [],
}));

/** Migration program emitting a claim the target schema does not declare. */
export const FOREIGN_CLAIM_MIGRATION_VALUE = manifestToJson(parseOrganismManifest({
  contract: "algal.organism.v1", key: "organism:migrate-foreign", name: "migrate-foreign",
  interface: {
    inputs: { claims: { cell: "claims", port: "value" }, frontier: { cell: "frontier", port: "value" } },
    outputs: { migrated: { cell: "out", port: "value" } },
  },
  cells: [
    { id: "claims", kind: "input", outputs: { value: "json" } },
    { id: "frontier", kind: "input", outputs: { value: "json" } },
    { id: "out", kind: "const", outputs: { value: { type: "json", value: { claims: [{ relation: "elsewhere", tuple: ["x"], polarity: "supported" }] } } } },
  ],
  edges: [],
}));

/* ------------------------------------------------------------------ */
/* The pure-case evaluation fixture                                    */
/* ------------------------------------------------------------------ */

export interface EvolutionFixture {
  readonly store: CountingStore;
  readonly storage: MemoryApplicationStorage;
  readonly host: InstrumentedHost;
  readonly lifecycle: ApplicationCore;
  readonly memory: ApplicationMemoryService;
  readonly put: (value: unknown) => Promise<Digest>;
  /** A fresh host/lifecycle/memory service over the same store+storage with
   *  different host options — the "host opt-in" surface. */
  readonly hostFor: (options: HostOptions) => { host: InstrumentedHost; lifecycle: ApplicationCore; memory: ApplicationMemoryService };
  readonly policy: JsonValue;
  readonly schema: Digest; readonly schema2: Digest;
  readonly frontier: Digest; readonly attestation: Digest;
  readonly decoder: Digest; readonly decoder2: Digest;
  readonly procedure: Digest; readonly procedure2: Digest;
  readonly program: Digest; readonly program2: Digest;
  readonly query: Digest; readonly query2: Digest;
  readonly queries: Digest; readonly queries2: Digest;
  readonly views: Digest; readonly runtimeProfile: Digest;
  readonly evaluationPolicy: Digest;
  readonly scope: Digest; readonly scope2: Digest;
  readonly genesisMemory: Digest;
  readonly revision: Digest;
  readonly genesis: ApplicationSnapshot;
  readonly cases: Digest; readonly scorer: Digest;
  readonly casesJson: { contract: string; cases: FoundryCase[] };
  readonly manifests: {
    incumbent: Digest; winner: Digest; winnerAlt: Digest; loser: Digest;
    holdoutFailure: Digest; regressing: Digest; crashing: Digest;
    generator: Digest; searchGenerator: Digest; migration: Digest;
    impureMigration: Digest; foreignClaimMigration: Digest;
  };
  /** `revisionBody(parent, runManifest)` — the candidate revision differing
   *  from the incumbent only at the `run` entrypoint manifest. */
  readonly revisionBody: (parent: Digest, runManifest: Digest, overrides?: Record<string, unknown>) => Record<string, JsonValue>;
  readonly winnerRevision: Digest; readonly loserRevision: Digest;
  readonly winnerAltRevision: Digest; readonly holdoutFailureRevision: Digest;
  readonly regressingRevision: Digest; readonly crashingRevision: Digest;
  /** Schema-2 revision (parent = `revision`) carrying schema-2 memory view. */
  readonly migrationRevision: Digest;
  /** Produce + verify an evaluation through the real service path. */
  readonly evaluate: (candidateRevision: Digest, environment?: string, parentState?: Digest, requestPatch?: Record<string, unknown>) => Promise<{ evaluationRef: Digest; evaluation: import("../../src/application-adaptation").ApplicationEvaluation }>;
  /** Commit a command through the fixture lifecycle. `operation` is required —
   *  the caller chooses the operation identity so replays are deliberate. */
  readonly commit: (command: Partial<Omit<ApplicationCommand, "kind" | "operation">> & { kind: ApplicationCommand["kind"]; operation: Digest }) => Promise<ApplicationSnapshot>;
}

export interface EvolutionFixtureOptions {
  /** Evaluation-policy overrides (bounds stay inside the parser's envelope). */
  policy?: { maxCases?: number; maxWork?: number; maxModelCalls?: number };
  /** A second application name to create (for "foreign application" legs). */
  application?: string;
  /** The genesis `run` entrypoint manifest JSON (default: the incumbent). */
  incumbent?: JsonValue;
}

export async function evolutionFixture(options: EvolutionFixtureOptions = {}): Promise<EvolutionFixture> {
  const store = countingStore();
  const put = (value: unknown) => putApplicationRecord(store, value);
  const app = options.application ?? APPLICATION;

  const schema = await put({ contract: "algal.application-memory-schema.v1", relations: [{ name: "available", arity: 1 }] });
  const schema2 = await put({ contract: "algal.application-memory-schema.v1", relations: [{ name: "supported-tool", arity: 1 }] });
  const frontier = await put({ contract: "algal.application-memory-frontier.v1", application: app, previous: null, sequence: 0, mutation: null, status: "settled" });
  const attestation = await put({ contract: "algal.evolution-attestation.v1" });
  const decoder = await put({ contract: "algal.probe-decoder.v1" });
  const decoder2 = await put({ contract: "algal.migrate-decoder.v1" });
  const probeManifest = await put({ contract: "algal.evolution-probe-manifest.v1" });
  const migrationManifest = await store.putManifest(parseOrganismManifest(MIGRATION_VALUE));
  const procedure = await put({ contract: "algal.application-memory-procedure.v1", id: "probe", schema, manifest: probeManifest, decoder, dependencies: [], prerequisite: null });
  const procedure2 = await put({ contract: "algal.application-memory-procedure.v1", id: "migrate", schema: schema2, manifest: migrationManifest, decoder: decoder2, dependencies: [], prerequisite: null });
  const program = await put({ contract: "algal.query.v1", rules: [], query: { relation: "available", terms: [{ var: "x" }, { var: "polarity" }] }, limits: APPLICATION_MEMORY_NATIVE_LIMITS });
  const query = await put({ contract: "algal.application-memory-query.v1", id: "applicable", schema, program, procedures: [procedure], polarityColumn: 1, conflict: "set-of-values" });
  const queries = await put({ contract: "algal.application-memory-queries.v1", queries: [query] });
  const program2 = await put({ contract: "algal.query.v1", rules: [], query: { relation: "supported-tool", terms: [{ var: "x" }, { var: "polarity" }] }, limits: APPLICATION_MEMORY_NATIVE_LIMITS });
  const query2 = await put({ contract: "algal.application-memory-query.v1", id: "supported", schema: schema2, program: program2, procedures: [procedure2], polarityColumn: 1, conflict: "set-of-values" });
  const queries2 = await put({ contract: "algal.application-memory-queries.v1", queries: [query2] });
  const views = await put({ contract: "algal.application-view-spec.v1", title: "Evolution", widgets: ["procedures"] });
  const runtimeProfile = await put({ contract: "algal.application-runtime-profile.v1", runtime: "bun-native-memory", policy: "pure-case-evaluation.v1" });
  const evaluationPolicy = await put({
    contract: "algal.application-evaluation-policy.v1",
    maxCases: options.policy?.maxCases ?? 8,
    maxWork: options.policy?.maxWork ?? 1_000_000,
    maxModelCalls: options.policy?.maxModelCalls ?? 0,
    requireHoldoutPass: true, strictValidationImprovement: true,
  });
  const scope = await put({ contract: "algal.application-memory-scope.v1", application: app, environment: "fixture", task: "task-1", frontier, bindings: [], completeFor: [procedure], attestation });
  const scope2 = await put({ contract: "algal.application-memory-scope.v1", application: app, environment: "fixture", task: "task-2", frontier, bindings: [], completeFor: [procedure2], attestation });

  const manifests = {
    incumbent: await store.putManifest(parseOrganismManifest(options.incumbent ?? INCUMBENT_VALUE)),
    winner: await store.putManifest(parseOrganismManifest(WINNER_VALUE)),
    winnerAlt: await store.putManifest(parseOrganismManifest(WINNER_ALT_VALUE)),
    loser: await store.putManifest(parseOrganismManifest(LOSER_VALUE)),
    holdoutFailure: await store.putManifest(parseOrganismManifest(HOLDOUT_FAILURE_VALUE)),
    regressing: await store.putManifest(parseOrganismManifest(REGRESSING_VALUE)),
    crashing: await store.putManifest(parseOrganismManifest(CRASHING_VALUE)),
    generator: await store.putManifest(parseOrganismManifest(GENERATOR_VALUE)),
    searchGenerator: await store.putManifest(parseOrganismManifest(SEARCH_GENERATOR_VALUE)),
    migration: migrationManifest,
    impureMigration: await store.putManifest(parseOrganismManifest(IMPURE_MIGRATION_VALUE)),
    foreignClaimMigration: await store.putManifest(parseOrganismManifest(FOREIGN_CLAIM_MIGRATION_VALUE)),
  };

  const entry = (name: string, manifest: Digest, q = query) => ({ name, manifest, applicability: q, maxGenerations: 1, capabilities: [] as string[], queries: [q] });
  const revisionBody = (parent: Digest | null, runManifest: Digest, overrides: Record<string, unknown> = {}): Record<string, JsonValue> => ({
    contract: "algal.application-revision.v1", application: app, parent, schema, queries, views, runtimeProfile, evaluationPolicy,
    capabilityRequirements: [],
    entrypoints: [entry("generate", manifests.generator), entry("run", runManifest)],
    ...overrides,
  }) as Record<string, JsonValue>;
  const revision = await put(revisionBody(null, manifests.incumbent));

  const host = instrumentedPolicyHost(policyInput(app, frontier), {});
  const storage = new MemoryApplicationStorage(store);
  const lifecycle = new ApplicationCore(storage, host);
  const memory = new ApplicationMemoryService({ store, engine: stubEngine(), admission: host });
  const genesisMemory = await memory.snapshot({ application: app, schema, previous: null, scope, observations: [], hypotheses: [], withdrawn: [] });
  const genesis = await lifecycle.create({ application: app, operation: ref({ op: "create", app }), kind: "create", expectedHead: null, revision, memory: genesisMemory, intents: [], evidence: [], causedBy: null });

  const casesJson = {
    contract: "algal.application-evaluation-cases.v1",
    cases: [
      { id: "train-ok", split: "train", args: { q: "t1" }, expect: { answer: "ok" } },
      { id: "val-ok", split: "validation", args: { q: "v1" }, expect: { answer: "ok" } },
      { id: "val-fixed", split: "validation", args: { q: "v2" }, expect: { answer: "v2-ok" } },
      { id: "hold-fixed", split: "holdout", args: { q: "h1" }, expect: { answer: "h1-ok" } },
    ] as FoundryCase[],
  };
  const cases = await put(casesJson);
  const scorer = await put({ contract: "algal.application-evaluation-scorer.v1", scorer: null });

  const child = (runManifest: Digest, overrides: Record<string, unknown> = {}) => put(revisionBody(revision, runManifest, overrides));
  const winnerRevision = await child(manifests.winner);
  const loserRevision = await child(manifests.loser);
  const winnerAltRevision = await child(manifests.winnerAlt);
  const holdoutFailureRevision = await child(manifests.holdoutFailure);
  const regressingRevision = await child(manifests.regressing);
  const crashingRevision = await child(manifests.crashing);
  const migrationRevision = await put({
    ...revisionBody(revision, manifests.incumbent), schema: schema2, queries: queries2,
    entrypoints: [entry("generate", manifests.generator, query2), entry("run", manifests.incumbent, query2)],
  });

  const hostFor = (opts: HostOptions) => {
    const h = instrumentedPolicyHost(policyInput(app, frontier), opts);
    return {
      host: h,
      lifecycle: new ApplicationCore(storage, h),
      memory: new ApplicationMemoryService({ store, engine: opts.memoryEngine ?? stubEngine(), admission: h }),
    };
  };

  return {
    store, storage, host, lifecycle, memory, put, hostFor, policy: policyInput(app, frontier),
    schema, schema2, frontier, attestation, decoder, decoder2, procedure, procedure2,
    program, program2, query, query2, queries, queries2, views, runtimeProfile, evaluationPolicy,
    scope, scope2, genesisMemory, revision, genesis, cases, scorer, casesJson,
    manifests, revisionBody, winnerRevision, loserRevision, winnerAltRevision,
    holdoutFailureRevision, regressingRevision, crashingRevision, migrationRevision,
    evaluate: (candidateRevision, environment, parentState = genesis.digest, requestPatch = {}) =>
      evaluateApplicationRevision(store, {
        contract: "algal.application-evaluation-request.v1", parentState, candidateRevision,
        entrypoint: "run", cases, scorer, policy: evaluationPolicy,
        ...(environment !== undefined ? { environment } : {}),
        ...requestPatch,
      }, runtime),
    commit: command => lifecycle.commit({
      application: app, expectedHead: genesis.digest,
      revision, memory: genesisMemory, intents: [], evidence: [], causedBy: null, ...command,
    }),
  };
}

/** The `algal.application-host.v1` policy input both host variants share. */
export function policyInput(application: string, frontier: Digest): JsonValue {
  const hostProfile = ref({ contract: "algal.evolution-profile.v1" });
  const decoders = [
    { decoder: digestCanonical(applicationJson({ contract: "algal.probe-decoder.v1" })), rawContract: "algal.probe-raw.v1", receiptContract: "algal.probe-receipt.v1", receiptBinding: "names-raw" },
    { decoder: digestCanonical(applicationJson({ contract: "algal.migrate-decoder.v1" })), rawContract: "algal.application-migration.v1", receiptContract: "algal.run.v1", receiptBinding: "names-receipt" },
  ].sort((a, b) => (a.decoder < b.decoder ? -1 : 1));
  return {
    contract: "algal.application-host.v1", application, frontier, hostProfile, episodeAccess: "observe",
    routes: [{ route: "inbox", recipient: capabilityHandle("mailbox-send", { fixture: "evolution" }), hostProfile }],
    attestation: "algal.evolution-attestation.v1", decoders,
  };
}

/** Admit one probe observation through the memory service and fold it into a
 * successor snapshot — real production paths only. */
export async function admitObservation(
  memory: ApplicationMemoryService,
  input: { application: string; scope: Digest; procedure: Digest; decoder: Digest; schema: Digest; raw: unknown; previous: Digest; withdrawn?: Digest[] },
): Promise<{ observation: Digest; raw: Digest; memory: Digest }> {
  const raw = await putApplicationRecord(memory.store, input.raw);
  const receipt = await putApplicationRecord(memory.store, { contract: "algal.probe-receipt.v1", raw });
  const observation = await memory.observe({
    application: input.application, scope: input.scope, procedure: input.procedure, raw, receipt, decoder: input.decoder,
  });
  const prev = await getApplicationRecord(memory.store, input.previous, v => applicationJson(v)) as { observations: Digest[]; withdrawn: Digest[] };
  const next = await memory.snapshot({
    application: input.application, schema: input.schema,
    previous: input.previous, scope: input.scope,
    observations: [...prev.observations, observation].sort(),
    hypotheses: [], withdrawn: input.withdrawn ?? [],
  });
  return { observation, raw, memory: next };
}

/* ------------------------------------------------------------------ */
/* Sealed research fixture                                             */
/* ------------------------------------------------------------------ */

export interface ResearchFixture {
  readonly store: CountingStore;
  readonly storage: MemoryApplicationStorage;
  readonly lifecycle: ApplicationCore;
  readonly host: InstrumentedHost;
  readonly hostFor: (options: HostOptions) => { host: InstrumentedHost; lifecycle: ApplicationCore };
  readonly put: (value: unknown) => Promise<Digest>;
  readonly genesis: ApplicationSnapshot;
  readonly revision: Digest; readonly candidateRevision: Digest;
  readonly beforeManifest: Digest; readonly afterManifest: Digest;
  /** Child revision record fields with `parent`/`entrypoints` overridable. */
  readonly revisionBody: (parent: Digest, manifest: Digest) => Record<string, JsonValue>;
  readonly evaluationPolicy: Digest; readonly researchPolicy: Digest;
  readonly corpus: Digest; readonly evaluator: Digest;
  readonly verifier: ApplicationResearchVerifier;
  readonly request: Digest;
  readonly evidence: (mutate?: (rows: Omit<import("../../src/application-research").ApplicationResearchAttempt, "receipt">[]) => Omit<import("../../src/application-research").ApplicationResearchAttempt, "receipt">[], requestRef?: Digest) => Promise<{ input: { request: Digest; report: Digest; seal: Digest }; report: import("../../src/application-research").ApplicationResearchReport }>;
  readonly rows: Omit<import("../../src/application-research").ApplicationResearchAttempt, "receipt">[];
  readonly sealFor: (payload: { request: Digest; report: Digest; journal: Digest }) => Promise<Digest>;
}

/** Deterministic verifier: the "seal" is a canonical-hash signature — the test
 * surface is that the *configured* verifier runs, not cryptographic custody. */
export function sealVerifier(evaluator: Digest, store: Store): ApplicationResearchVerifier {
  const payloadFor = (request: Digest, report: Digest, journal: Digest) => ({ request, report, journal });
  return {
    identity: evaluator,
    async verify(context) {
      const seal = context.seal as { request?: unknown; report?: unknown; journal?: unknown; signature?: unknown };
      if (seal.request !== hash(context.request) || seal.report !== hash(context.report) || seal.journal !== context.report.attemptJournal) return false;
      const payload = payloadFor(seal.request as Digest, seal.report as Digest, seal.journal as Digest);
      if (seal.signature !== ref({ contract: "algal.evolution-seal.v1", ...payload })) return false;
      const journal = await context.store.getValue(context.report.attemptJournal);
      if (hash(journal) !== hash({ request: payload.request, receipts: context.report.attempts.map(a => a.receipt) })) return false;
      for (const attempt of context.report.attempts) {
        const { receipt, ...accounting } = attempt;
        if (hash(await context.store.getValue(receipt)) !== hash({ request: payload.request, ...accounting })) return false;
      }
      return true;
    },
  };
}

export async function researchFixture(): Promise<ResearchFixture> {
  const store = countingStore();
  const put = (value: unknown) => putApplicationRecord(store, value);
  const app = APPLICATION;
  const evaluator = await put({ contract: "algal.evolution-evaluator.v1" });
  const harness = await put({ contract: "algal.evolution-harness.v1", version: 1 });
  const corpusCases = await Promise.all(["dev-a", "dev-b", "holdout-a", "holdout-b"].map(async id => ({
    id, split: id.startsWith("dev") ? "development" : "holdout",
    task: await put({ id, task: "frozen" }), sources: await put({ id, sources: [] }),
  }))) as { id: string; split: "development" | "holdout"; task: Digest; sources: Digest }[];
  const corpus = await put({ contract: "algal.application-research-corpus.v1", cases: corpusCases });
  const researchPolicy = await put({ contract: "algal.application-research-policy.v1", evaluator, harness, corpus, strategyEntrypoints: ["strategy"], maxAttemptsPerCase: 2 });
  const evaluationPolicy = await put({ contract: "algal.application-evaluation-policy.v1", maxCases: 4, maxWork: 1000, maxModelCalls: 8, requireHoldoutPass: true, strictValidationImprovement: true, research: researchPolicy });

  const schema = await put({ contract: "algal.application-memory-schema.v1", relations: [{ name: "available", arity: 1 }] });
  const program = await put({ contract: "algal.query.v1", rules: [], query: { relation: "available", terms: [{ var: "x" }, { var: "polarity" }] }, limits: APPLICATION_MEMORY_NATIVE_LIMITS });
  const query = await put({ contract: "algal.application-memory-query.v1", id: "ready", schema, program, procedures: [], polarityColumn: 1, conflict: "set-of-values" });
  const queries = await put({ contract: "algal.application-memory-queries.v1", queries: [query] });
  const views = await put({ contract: "algal.application-view-spec.v1", title: "Research", widgets: ["memory"] });
  const runtimeProfile = await put({ contract: "algal.application-runtime-profile.v1", runtime: "bun-native-memory", policy: "sealed-research-evaluation.v1" });
  const frontier = await put({ contract: "algal.application-memory-frontier.v1", application: app, previous: null, sequence: 0, mutation: null, status: "settled" });
  const attestation = await put({ contract: "algal.evolution-attestation.v1" });
  const scope = await put({ contract: "algal.application-memory-scope.v1", application: app, environment: "fixture", task: "research", frontier, bindings: [], completeFor: [], attestation });

  const strategy = (value: string) => parseOrganismManifest({ contract: "algal.organism.v1", key: `organism:strategy-${value}`, name: "Strategy", interface: { inputs: {}, outputs: { strategy: { cell: "out", port: "value" } } }, cells: [{ id: "out", kind: "const", outputs: { value: { type: "json", value } } }], edges: [] });
  const beforeManifest = await store.putManifest(strategy("before"));
  const afterManifest = await store.putManifest(strategy("after"));
  const revisionBody = { contract: "algal.application-revision.v1", application: app, parent: null, schema, queries, views, runtimeProfile, evaluationPolicy, capabilityRequirements: [], entrypoints: [{ name: "strategy", manifest: beforeManifest, applicability: query, maxGenerations: 1, capabilities: [], queries: [query] }] };
  const revision = await put(revisionBody);
  const candidateRevision = await put({ ...revisionBody, parent: revision, entrypoints: [{ ...revisionBody.entrypoints[0]!, manifest: afterManifest }] });

  const hostPolicy = { ...(policyInput(app, frontier) as Record<string, JsonValue>), routes: [] as JsonValue[], decoders: [] as JsonValue[] };
  const host = instrumentedPolicyHost(hostPolicy, { researchVerifier: sealVerifier(evaluator, store) });
  const storage = new MemoryApplicationStorage(store);
  const lifecycle = new ApplicationCore(storage, host);
  const memory = new ApplicationMemoryService({ store, engine: stubEngine(), admission: host });
  const genesisMemory = await memory.snapshot({ application: app, schema, previous: null, scope, observations: [], hypotheses: [], withdrawn: [] });
  const genesis = await lifecycle.create({ application: app, operation: ref({ op: "create", app }), kind: "create", expectedHead: null, revision, memory: genesisMemory, intents: [], evidence: [], causedBy: null });
  const request = await put({ contract: "algal.application-research-request.v1", parentState: genesis.digest, candidateRevision, entrypoint: "strategy", policy: evaluationPolicy });

  const rows: Omit<import("../../src/application-research").ApplicationResearchAttempt, "receipt">[] = corpusCases.flatMap(row =>
    (["incumbent", "candidate"] as const).map(role => ({ caseId: row.id, role, attempt: 1, outcome: "complete" as const, passed: role === "candidate" || row.id !== "dev-b", work: 64, modelCalls: 1 })));

  const sealFor = async (payload: { request: Digest; report: Digest; journal: Digest }) =>
    put({ ...payload, signature: ref({ contract: "algal.evolution-seal.v1", ...payload }) });

  const evidence: ResearchFixture["evidence"] = async (mutate, requestRef = request) => {
    const attemptsRows = mutate ? mutate(rows) : rows;
    const attempts = await Promise.all(attemptsRows.map(async attempt => ({ ...attempt, receipt: await put({ request: requestRef, ...attempt }) })));
    const attemptJournal = await put({ request: requestRef, receipts: attempts.map(a => a.receipt) });
    const report: import("../../src/application-research").ApplicationResearchReport = { contract: "algal.application-research-report.v1", request: requestRef, attemptJournal, attempts };
    const reportRef = await put(report);
    const seal = await sealFor({ request: requestRef, report: reportRef, journal: attemptJournal });
    return { input: { request: requestRef, report: reportRef, seal }, report };
  };

  const hostFor = (opts: HostOptions) => {
    const h = instrumentedPolicyHost(hostPolicy, opts);
    return { host: h, lifecycle: new ApplicationCore(storage, h) };
  };

  return {
    store, storage, lifecycle, host, hostFor, put, genesis, revision, candidateRevision,
    beforeManifest, afterManifest,
    revisionBody: (parent, manifest) => ({
      ...revisionBody, parent, entrypoints: [{ ...revisionBody.entrypoints[0]!, manifest }],
    }),
    evaluationPolicy, researchPolicy, corpus, evaluator, verifier: sealVerifier(evaluator, store),
    request, evidence, rows, sealFor,
  };
}

/** Parse and digest-check a stored application record. */
export async function record<T>(store: Store, digest: Digest, parse: (v: unknown) => T): Promise<T> {
  return getApplicationRecord(store, digest, parse);
}

export { digestCanonical, canonicalize, parseApplicationRevision, type MemoryClaim };
