/**
 * Deterministic fixture for the `policy-mutation` suite.
 *
 * A `LiteWorld` is a fully committed application world minted under ONE
 * `algal.application-host.v1` policy on `MemoryApplicationStorage` +
 * `ApplicationCore`: genesis, two admitted observations (`sB`, `sC`), a
 * committed deliver intent (`sD`, left pending), and the supported
 * applicability derivations at `sB`/`sC`. Mutants that change admission
 * identity cannot reuse the base world's stored evidence — stored
 * observations carry `admission = host.identity` — so probes that must
 * observe the mutant's own admitted universe rebuild a parallel world under
 * the mutant policy (`ownWorld`).
 *
 * `policyFixture` extends the lite world with the evidence lanes the host
 * contract delegates to:
 *
 * - real accepted pure-case evaluations (`evaluateApplicationRevision`) for
 *   two candidate revisions, a real comparison (`produceApplicationComparison`)
 *   and a real selection policy record — all bound to the same parent state;
 * - a committed `activate` (`sA`) whose ancestor carries a different
 *   manifest, making `verifyApplicationRestoration` reachable with genuine
 *   evidence;
 * - the `sealed-research-evaluation.v1` record chain (policy, corpus,
 *   request, report, seal) plus an evaluation produced and verified by an
 *   explicit `ApplicationResearchVerifier`, so verifier-identity narrowing
 *   runs on real records.
 *
 * `checkerEngine` is the independent derivation oracle from the `reference`
 * lane (`verify/reference/memory/checker`): `query` runs its least-fixpoint
 * evaluator and emits the `algal.query-result.v1` envelope; `verify` re-runs
 * `checkQueryResult` with the snapshot's declared sources. Production plays
 * no part in deriving or verifying. `engineB` shares the checker under a
 * distinct identity for engine-swap mutations.
 *
 * No wall clock, no randomness, no provider. The only filesystem use is a
 * fresh `mkdtemp` channel directory per probe run — `dispatch()`/`reconcile()`
 * need a real path because durable channel custody is part of the contract
 * under test (`readApplicationChannel`, `src/application-host.ts`).
 */
import { mkdtemp } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  admitProgram, admitSnapshot, checkQueryResult, digestDocument, internals,
  type Input as CheckerInput, type Json,
} from "../reference/memory/checker";
import {
  ApplicationMemoryService, APPLICATION_MEMORY_NATIVE_LIMITS,
  type MemoryAdmissionHost, type MemoryQueryEngine, type MemoryEngineResult,
} from "../../src/application-memory";
import {
  applicationJson, getApplicationRecord, putApplicationRecord,
  parseApplicationRevision, parseWorkIntent,
  type ApplicationRevision, type WorkIntent,
} from "../../src/application-contract";
import {
  ApplicationCore, parseApplicationCommand,
  type ApplicationAdmission, type ApplicationCommand, type ApplicationDispatcher,
  type ApplicationSnapshot,
} from "../../src/application-core";
import { MemoryApplicationStorage } from "../../src/application-storage";
import {
  createApplicationPolicyHost, parseApplicationHostPolicy,
  type ApplicationHostPolicy,
} from "../../src/application-host";
import { parseApplicationRestorationPolicy } from "../../src/application-restoration";
import {
  admitApplicationResearchEvaluation,
  type ApplicationResearchVerifier,
} from "../../src/application-research";
import { evaluateApplicationRevision } from "../../src/application-adaptation";
import { produceApplicationComparison } from "../../src/application-comparison";
import { appendObservation } from "../../src/application-observation";
import { capabilityHandle } from "../../src/capabilities";
import { parseOrganismManifest } from "../../src/contract";
import { builtinRegistry } from "../../src/registry";
import { digestCanonical, type Digest } from "../../src/digest";
import { MemoryStore } from "../../src/store-memory";
import type { JsonValue } from "../../src/values";

export const ref = (value: unknown): Digest => digestCanonical(applicationJson(value));
const json = applicationJson;
export const APPLICATION = "workspace";
export const ENVIRONMENT = "fixture-env";
export const FOREIGN_APPLICATION = "other-app";

/** Deterministic work figure inside the 0..50_000 derivation bound. */
function engineWork(rounds: number, derived: number, rows: number): number {
  return rounds * 100 + derived * 10 + rows;
}

/** A `MemoryQueryEngine` whose evaluation and verification are the
 *  independent checker. `identity` is a parameter: a second engine with a
 *  distinct identity is an honest oracle with distinct authority. */
export function checkerEngine(identity: JsonValue): MemoryQueryEngine {
  return {
    identity: digestCanonical(json(identity)),
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

export const ENGINE_A = { contract: "algal.policy-mutation-engine.v1", lane: "primary" };
export const ENGINE_B = { contract: "algal.policy-mutation-engine.v1", lane: "secondary" };

/** The host type as the portable contract sees it: the factory's declared
 *  return is the file-backed `ApplicationAdmission` specialization, but the
 *  object satisfies the portable `Store`-typed interface — the same object
 *  `ApplicationCore` invokes with its own `Store`. */
export type PolicyHost = ApplicationAdmission & MemoryAdmissionHost & ApplicationDispatcher;

export interface HostOptions {
  channelsDir: string;
  memoryEngine?: MemoryQueryEngine;
  restorationPolicy?: unknown;
  selectionEnvironment?: string;
  researchVerifier?: ApplicationResearchVerifier;
}

/** Build the production policy host — the exact surface under mutation. */
export function hostFor(policy: unknown, options: HostOptions): PolicyHost {
  return createApplicationPolicyHost(policy, options as never) as unknown as PolicyHost;
}

export async function freshChannelsDir(): Promise<string> {
  return mkdtemp(join(tmpdir(), "algal-policy-mutation-"));
}

export const manifestBody = (answer: unknown, key: string) => ({
  contract: "algal.organism.v1", key: `organism:${key}`, name: key,
  interface: { inputs: { q: { cell: "src", port: "value" } }, outputs: { answer: { cell: "out", port: "value" } } },
  cells: [
    { id: "src", kind: "input", outputs: { value: "json" } },
    { id: "out", kind: "const", outputs: { value: { type: "json", value: answer } } },
  ],
  edges: [],
});

export const PROFILE_DIGEST = ref({ contract: "algal.probe-profile.v1" });
export const FOREIGN_PROFILE = ref({ contract: "algal.probe-profile.v1", lane: "foreign" });

/** Base policy record for `algal.application-host.v1`, as a plain JSON
 *  value (mutants clone and edit this). `decoders` carries both binding
 *  modes; `attestation` is pinned so the scope attestation check is live. */
export function basePolicyInput(r: {
  frontier: Digest; decoder: Digest; decoder2: Digest;
}): JsonValue {
  const decoders = [
    { decoder: r.decoder, rawContract: "algal.probe-raw.v1", receiptContract: "algal.probe-receipt.v1", receiptBinding: "names-raw" },
    { decoder: r.decoder2, rawContract: "algal.probe-raw-receipted.v1", receiptContract: "algal.probe-receipt.v1", receiptBinding: "names-receipt" },
  ].sort((a, b) => (a.decoder < b.decoder ? -1 : 1));
  return json({
    contract: "algal.application-host.v1",
    application: APPLICATION,
    frontier: r.frontier,
    hostProfile: PROFILE_DIGEST,
    episodeAccess: "observe",
    routes: [
      { route: "inbox", recipient: capabilityHandle("mailbox-send", "policy-mutation"), hostProfile: PROFILE_DIGEST },
    ],
    attestation: "algal.probe-attestation.v1",
    decoders,
  });
}

/** Record digests shared by every world (contents are policy-independent). */
export interface WorldRecords {
  schema: Digest;
  schemaForeign: Digest;
  frontier0: Digest;
  frontier1: Digest;                 // settled successor (attested move target)
  frontierMalformed: Digest;         // stored unparsed: sequence 0 with a predecessor
  attestation: Digest;               // contract "algal.probe-attestation.v1"
  attestationForeign: Digest;        // contract "algal.foreign-attestation.v1"
  attestationForeignRecord: JsonValue;
  decoder: Digest;                   // names-raw binding
  decoder2: Digest;                  // names-receipt binding
  decoderForeign: Digest;            // never admitted by the policy
  procedure: Digest;
  procedureForeign: Digest;          // a second admitted procedure (unused by scopes)
  scope: Digest;                     // completeFor [procedure], attestation
  program: Digest;
  query: Digest;
  queries: Digest;
  views: Digest;
  runtimeProfile: Digest;
  evaluationPolicy: Digest;
  manifest: Digest;                  // incumbent entrypoint manifest (M1)
  revision: Digest;                  // rev1
  revisionParsed: ApplicationRevision;
  revision2: Digest;                 // candidate installing M2
  revision3: Digest;                 // candidate installing M3
  revision2Parsed: ApplicationRevision;
  revision3Parsed: ApplicationRevision;
  revisionForeignManifest: Digest;   // entrypoint manifest never stored
  revisionWidenGenerations: Digest;  // maxGenerations 1 → 2
  revisionWidenCapabilities: Digest; // adds an entrypoint capability
  revisionWidenGenerationsParsed: ApplicationRevision;
  revisionWidenCapabilitiesParsed: ApplicationRevision;
  revisionForeignManifestParsed: ApplicationRevision;
  manifest2: Digest;
  manifest3: Digest;
  genesisMemory: Digest;
  memoryBadPredecessor: Digest;      // previous points at another snapshot
  memoryForeignSchema: Digest;       // schema2 — incompatible with the revision
  scope2: Digest;
  raw: Digest;
  receipt: Digest;
  raw2: Digest;                      // names-receipt raw (carries `receipt`)
  receipt2: Digest;
  rawForeignContract: Digest;
  receiptForeignContract: Digest;
  receiptStaleRaw: Digest;           // names a different raw digest
  rawClaimsBound: Digest;            // 33 claims — over the claims bound
  message: Digest;
  input: Digest;
}

async function putRecords(store: MemoryStore): Promise<WorldRecords> {
  const put = (v: unknown): Promise<Digest> => putApplicationRecord(store, v);
  const schema = await put({
    contract: "algal.application-memory-schema.v1",
    relations: [{ name: "available", arity: 1 }],
  });
  const schemaForeign = await put({
    contract: "algal.application-memory-schema.v1",
    relations: [{ name: "foreign", arity: 1 }],
  });
  const frontier0 = await put({
    contract: "algal.application-memory-frontier.v1",
    application: APPLICATION, previous: null, sequence: 0, mutation: null, status: "settled",
  });
  const frontier1 = await put({
    contract: "algal.application-memory-frontier.v1",
    application: APPLICATION, previous: frontier0, sequence: 1,
    mutation: await put({ contract: "algal.probe-mutation.v1" }), status: "settled",
  });
  // Stored unparsed (CAS admits any JSON); the frontier parser rejects its
  // lineage the moment a scope validation reads it.
  const frontierMalformed = await put({
    contract: "algal.application-memory-frontier.v1",
    application: APPLICATION, previous: frontier0, sequence: 0, mutation: null, status: "settled",
  });
  const attestation = await put({ contract: "algal.probe-attestation.v1" });
  const attestationForeign = await put({ contract: "algal.foreign-attestation.v1" });
  const manifest = await store.putManifest(parseOrganismManifest(manifestBody("incumbent", "incumbent")));
  const manifest2 = await store.putManifest(parseOrganismManifest(manifestBody("expected", "candidate")));
  const manifest3 = await store.putManifest(parseOrganismManifest(manifestBody("expected", "candidate-alt")));
  const decoder = await put({ contract: "algal.probe-decoder.v1" });
  const decoder2 = await put({ contract: "algal.probe-decoder.v1", lane: "receipted" });
  const decoderForeign = await put({ contract: "algal.probe-decoder.v1", lane: "foreign" });
  const procedure = await put({
    contract: "algal.application-memory-procedure.v1",
    id: "probe", schema, manifest, decoder, dependencies: [], prerequisite: null,
  });
  const procedureForeign = await put({
    contract: "algal.application-memory-procedure.v1",
    id: "audit", schema, manifest, decoder: decoder2, dependencies: [], prerequisite: null,
  });
  const program = await put({
    contract: "algal.query.v1", rules: [],
    query: { relation: "available", terms: [{ var: "x" }, { var: "polarity" }] },
    limits: { ...APPLICATION_MEMORY_NATIVE_LIMITS },
  });
  const query = await put({
    contract: "algal.application-memory-query.v1",
    id: "applicable", schema, program, procedures: [procedure],
    polarityColumn: 1, conflict: "set-of-values",
  });
  const queries = await put({ contract: "algal.application-memory-queries.v1", queries: [query] });
  const views = await put({
    contract: "algal.application-view-spec.v1", title: "Mutation", widgets: ["procedures"],
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
  const revisionBody = {
    contract: "algal.application-revision.v1",
    application: APPLICATION, parent: null, schema, queries, views,
    runtimeProfile, evaluationPolicy, capabilityRequirements: [],
    entrypoints: [{
      name: "run", manifest, applicability: query, maxGenerations: 1,
      capabilities: [] as string[], queries: [query],
    }],
  };
  const revision = await put(revisionBody);
  const revision2 = await put({
    ...revisionBody, parent: revision,
    entrypoints: [{ ...revisionBody.entrypoints[0]!, manifest: manifest2 }],
  });
  const revision3 = await put({
    ...revisionBody, parent: revision,
    entrypoints: [{ ...revisionBody.entrypoints[0]!, manifest: manifest3 }],
  });
  const foreignManifest = ref({ contract: "algal.probe-foreign-manifest.v1" });
  const revisionForeignManifest = await put({
    ...revisionBody,
    entrypoints: [{ ...revisionBody.entrypoints[0]!, manifest: foreignManifest }],
  });
  const revisionWidenGenerations = await put({
    ...revisionBody, parent: revision,
    entrypoints: [{ ...revisionBody.entrypoints[0]!, manifest: manifest2, maxGenerations: 2 }],
  });
  const revisionWidenCapabilities = await put({
    ...revisionBody, parent: revision,
    capabilityRequirements: ["cap-extra"],
    entrypoints: [{ ...revisionBody.entrypoints[0]!, manifest: manifest2, capabilities: ["cap-extra"] }],
  });
  const scopeHelper = async (memorySvc: ApplicationMemoryService, over: Record<string, unknown> = {}) => memorySvc.putScope({
    contract: "algal.application-memory-scope.v1",
    application: APPLICATION, environment: ENVIRONMENT, task: "task-1",
    frontier: frontier0, bindings: [], completeFor: [procedure], attestation,
    ...over,
  });
  // A seed host+service over the base policy validates and stores the scope
  // and genesis memory — their contents are identical under any policy that
  // still admits them.
  const seedPolicy = basePolicyInput({ frontier: frontier0, decoder, decoder2 });
  const seedHost = hostFor(seedPolicy, { channelsDir: await freshChannelsDir(), memoryEngine: checkerEngine(ENGINE_A) });
  const memorySeed = new ApplicationMemoryService({ store, engine: checkerEngine(ENGINE_A), admission: seedHost });
  const scope = await scopeHelper(memorySeed);
  const scope2 = await scopeHelper(memorySeed, { task: "task-2" });
  const genesisMemory = await memorySeed.snapshot({
    application: APPLICATION, schema, previous: null, scope,
    observations: [], hypotheses: [], withdrawn: [],
  });
  const memoryOther = await memorySeed.snapshot({
    application: APPLICATION, schema, previous: null, scope: scope2,
    observations: [], hypotheses: [], withdrawn: [],
  });
  const memoryBadPredecessor = await memorySeed.snapshot({
    application: APPLICATION, schema, previous: memoryOther, scope,
    observations: [], hypotheses: [], withdrawn: [],
  });
  const memoryForeignSchema = await memorySeed.snapshot({
    application: APPLICATION, schema: schemaForeign, previous: null, scope,
    observations: [], hypotheses: [], withdrawn: [],
  });
  const raw = await put({
    contract: "algal.probe-raw.v1", tool: "probe",
    claims: [{ relation: "available", tuple: ["tool-a"], polarity: "supported" }],
  });
  const receipt = await put({ contract: "algal.probe-receipt.v1", raw });
  const receipt2 = await put({ contract: "algal.probe-receipt.v1", lane: "receipted" });
  const raw2 = await put({
    contract: "algal.probe-raw-receipted.v1", receipt: receipt2,
    claims: [{ relation: "available", tuple: ["tool-b"], polarity: "supported" }],
  });
  const rawForeignContract = await put({ contract: "algal.foreign-raw.v1", claims: [] });
  const receiptForeignContract = await put({ contract: "algal.foreign-receipt.v1", raw });
  const receiptStaleRaw = await put({ contract: "algal.probe-receipt.v1", raw: raw2 });
  const rawClaimsBound = await put({
    contract: "algal.probe-raw.v1",
    claims: Array.from({ length: 33 }, (_, i) => ({ relation: "available", tuple: [`t${i}`], polarity: "supported" })),
  });
  const message = await put({ contract: "algal.probe-message.v1", body: "hello" });
  const input = await put({ src: { value: "probe" } });
  const parsedRevisions = (await Promise.all([
    store.getValue(revision), store.getValue(revision2), store.getValue(revision3),
    store.getValue(revisionForeignManifest), store.getValue(revisionWidenGenerations), store.getValue(revisionWidenCapabilities),
  ])).map(v => parseApplicationRevision(v));
  const revisionParsed = parsedRevisions[0]!, revision2Parsed = parsedRevisions[1]!, revision3Parsed = parsedRevisions[2]!;
  const revisionForeignManifestParsed = parsedRevisions[3]!, revisionWidenGenerationsParsed = parsedRevisions[4]!, revisionWidenCapabilitiesParsed = parsedRevisions[5]!;
  return {
    schema, schemaForeign, frontier0, frontier1, frontierMalformed,
    attestation, attestationForeign,
    attestationForeignRecord: json({ contract: "algal.foreign-attestation.v1" }),
    decoder, decoder2, decoderForeign, procedure, procedureForeign, scope,
    program, query, queries, views, runtimeProfile, evaluationPolicy,
    manifest, manifest2, manifest3,
    revision, revisionParsed, revision2, revision2Parsed, revision3, revision3Parsed,
    revisionForeignManifest, revisionForeignManifestParsed,
    revisionWidenGenerations, revisionWidenGenerationsParsed,
    revisionWidenCapabilities, revisionWidenCapabilitiesParsed,
    genesisMemory, memoryBadPredecessor, memoryForeignSchema, scope2,
    raw, receipt, raw2, receipt2, rawForeignContract, receiptForeignContract,
    receiptStaleRaw, rawClaimsBound, message, input,
  };
}

export interface LiteWorld {
  store: MemoryStore;
  storage: MemoryApplicationStorage;
  engine: MemoryQueryEngine;
  host: PolicyHost;
  lifecycle: ApplicationCore;
  memory: ApplicationMemoryService;
  policy: ApplicationHostPolicy;
  policyInput: JsonValue;
  records: WorldRecords;
  genesis: ApplicationSnapshot;
  sB: ApplicationSnapshot;           // one observation committed (rev1)
  sC: ApplicationSnapshot;           // two observations committed (rev1)
  sD: ApplicationSnapshot;           // deliver intent committed, still pending
  derivationB: Digest;
  derivationC: Digest;
  intentDeliver: Digest;             // stored work-intent digest inside sD
  intentDeliverWork: WorkIntent;
  intentEpisode: Digest;             // stored episode intent inside sD (blocked on dispatch)
  intentEpisodeWork: WorkIntent;
}

/** Mint a complete lite world under `policyInput`/`options`. Every record
 *  and committed state is produced through the real service paths under the
 *  mutant's own host when one is supplied, so admitted observations carry
 *  that host's identity. */
export async function worldFixture(policyInput?: unknown, options: Partial<HostOptions> = {}): Promise<LiteWorld> {
  const store = new MemoryStore();
  const storage = new MemoryApplicationStorage(store);
  const engine = options.memoryEngine ?? checkerEngine(ENGINE_A);
  const records = await putRecords(store);
  const policy = policyInput ?? basePolicyInput({
    frontier: records.frontier0, decoder: records.decoder, decoder2: records.decoder2,
  });
  const host = hostFor(policy, { channelsDir: options.channelsDir ?? await freshChannelsDir(), ...options });
  const memory = new ApplicationMemoryService({ store, engine, admission: host });
  const lifecycle = new ApplicationCore(storage, host);
  const genesis = await lifecycle.create({
    application: APPLICATION, operation: ref("op-genesis"), kind: "create",
    expectedHead: null, revision: records.revision, memory: records.genesisMemory,
    intents: [], evidence: [], causedBy: null,
  });
  const observe = async (tool: string, head: ApplicationSnapshot, tag: string) => {
    const raw = await putApplicationRecord(store, {
      contract: "algal.probe-raw.v1", tool,
      claims: [{ relation: "available", tuple: [tool], polarity: "supported" }],
    });
    const receipt = await putApplicationRecord(store, { contract: "algal.probe-receipt.v1", raw });
    return appendObservation(lifecycle, memory, {
      application: APPLICATION, operation: ref(`op-${tag}`),
      expectedHead: head.digest, expectedMemory: head.state.memory,
      observation: { application: APPLICATION, scope: records.scope, procedure: records.procedure, raw, receipt, decoder: records.decoder },
    });
  };
  const sB = (await observe("tool-a", genesis, "obs-b")).snapshot;
  const sC = (await observe("tool-b", sB, "obs-c")).snapshot;
  // The applicability derivation at sC is minted BEFORE the intent commit so
  // the episode intent's admission can cite it (commit admission reproduces
  // the derivation and requires it in evidence).
  const derivationB = (await memory.query(sB.digest, records.query)).ref;
  const derivationC = (await memory.query(sC.digest, records.query)).ref;
  const sD = await lifecycle.commit({
    application: APPLICATION, operation: ref("op-intents"), kind: "investigate",
    expectedHead: sC.digest, revision: sC.state.revision, memory: sC.state.memory,
    intents: [
      { kind: "deliver", route: "inbox", message: records.message },
      { kind: "start-episode", entrypoint: "run", input: records.input },
    ],
    evidence: [derivationC], causedBy: null,
  });
  const intentWorks = new Map(await Promise.all(sD.transition.intents.map(async d =>
    [d, parseWorkIntent(await store.getValue(d))] as const)));
  const intentDeliver = [...intentWorks].find(([, w]) => w.kind === "deliver")![0];
  const intentDeliverWork = intentWorks.get(intentDeliver)!;
  const intentEpisode = [...intentWorks].find(([, w]) => w.kind === "start-episode")![0];
  const intentEpisodeWork = parseWorkIntent(json({
    contract: "algal.application-intent.v1", application: APPLICATION,
    operation: ref("op-episode"), ordinal: 0,
    kind: "start-episode", entrypoint: "run", input: records.input,
  }));
  return {
    store, storage, engine, host, lifecycle, memory,
    policy: parseApplicationHostPolicy(policy), policyInput: json(policy),
    records, genesis, sB, sC, sD, derivationB, derivationC,
    intentDeliver, intentDeliverWork, intentEpisode, intentEpisodeWork,
  };
}

export interface ResearchLane {
  stateRef: Digest;
  revisionRef: Digest;
  revisionParsed: ApplicationRevision;
  candidateRef: Digest;
  candidateParsed: ApplicationRevision;
  requestRef: Digest;
  reportRef: Digest;
  sealRef: Digest;
  evaluationRef: Digest;
  verifierV: ApplicationResearchVerifier;
  verifierV2: ApplicationResearchVerifier;
  verifierLiar: ApplicationResearchVerifier;
}

export interface PolicyFixture {
  lite: LiteWorld;
  baseIdentity: Digest;
  baseConfiguration: Digest;
  engineA: MemoryQueryEngine;
  engineB: MemoryQueryEngine;        // same honest checker, distinct identity
  cases: Digest;
  scorer: Digest;
  evalM2: Digest;                    // accepted evaluation: revision2 at sD
  evalM3: Digest;                    // accepted evaluation: revision3 at sD
  comparison: Digest;
  selectionPolicy: Digest;           // env fixture-env → manifest2
  selectionPolicyB: Digest;          // second policy row for "exactly one"
  selectionPolicyForeign: Digest;    // application "other-app"
  selectionPolicyStale: Digest;      // parentState genesis — stale under sD
  sA: ApplicationSnapshot;           // committed activate (rev2/M2)
  restorationPolicy: ReturnType<typeof parseApplicationRestorationPolicy>;
  restorationPolicyRecord: Digest;
  restorationPolicyForeign: unknown; // parsed policy record, other application
  restorationRecord: Digest;
  restorationRecordStaleParent: Digest;
  revisionRestored: Digest;          // rev3r — rev2 fields, run → M1
  revisionRestoredParsed: ApplicationRevision;
  revisionForeignPolicy: Digest;     // rev2 fields under a different evaluation policy
  revisionForeignPolicyParsed: ApplicationRevision;
  forgedEvaluation: Digest;          // internally consistent eval citing the foreign-policy revision
  drainForeign: Digest;
  drainCoverage: Digest;
  dispatchRecordDelivery: JsonValue; // a well-formed recorded delivery plan for replays
  research: ResearchLane;
}

/** The full fixture: the lite world plus evaluation/selection/restoration/
 *  research evidence produced through the real production seams. */
export async function policyFixture(): Promise<PolicyFixture> {
  const engineA = checkerEngine(ENGINE_A);
  const engineB = checkerEngine(ENGINE_B);
  const lite = await worldFixture(undefined, { memoryEngine: engineA });
  const { store, records } = lite;
  const put = (v: unknown): Promise<Digest> => putApplicationRecord(store, v);
  const runtime = { fns: builtinRegistry() };

  // Two accepted pure-case evaluations bound to sD, and a comparison that
  // selected the first candidate's manifest.
  const cases = await put({
    contract: "algal.application-evaluation-cases.v1",
    cases: ["train", "validation", "holdout"].map(split => ({
      id: split, split, args: { q: split }, expect: { answer: "expected" },
    })),
  });
  const scorer = await put({ contract: "algal.application-evaluation-scorer.v1", scorer: null });
  const evalM2 = (await evaluateApplicationRevision(store, {
    contract: "algal.application-evaluation-request.v1",
    parentState: lite.sD.digest, candidateRevision: records.revision2,
    entrypoint: "run", cases, scorer, policy: records.evaluationPolicy,
    environment: ENVIRONMENT,
  }, runtime)).evaluationRef;
  const evalM3 = (await evaluateApplicationRevision(store, {
    contract: "algal.application-evaluation-request.v1",
    parentState: lite.sD.digest, candidateRevision: records.revision3,
    entrypoint: "run", cases, scorer, policy: records.evaluationPolicy,
    environment: ENVIRONMENT,
  }, runtime)).evaluationRef;
  const comparison = (await produceApplicationComparison(store, {
    application: APPLICATION, parentState: lite.sD.digest, entrypoint: "run",
    environment: ENVIRONMENT, evaluations: [evalM2, evalM3].sort(), selected: records.manifest2,
  }, runtime)).comparisonRef;
  const selectionBody = (over: Record<string, unknown>) => ({
    contract: "algal.application-selection-policy.v1",
    application: APPLICATION, parentState: lite.sD.digest, entrypoint: "run",
    selections: [{ environment: ENVIRONMENT, comparison, manifest: records.manifest2 }],
    ...over,
  });
  const selectionPolicy = await put(selectionBody({}));
  const selectionPolicyB = await put(selectionBody({ selections: [{ environment: "other-env", comparison, manifest: records.manifest2 }] }));
  const selectionPolicyForeign = await put(selectionBody({ application: FOREIGN_APPLICATION }));
  const selectionPolicyStale = await put(selectionBody({ parentState: lite.genesis.digest }));

  // Committed activation: the head now runs revision2/manifest2; the
  // genesis ancestor carries manifest — a real restore target.
  const sA = await lite.lifecycle.commit({
    application: APPLICATION, operation: ref("op-activate"), kind: "activate",
    expectedHead: lite.sD.digest, revision: records.revision2, memory: lite.sD.state.memory,
    intents: [], evidence: [evalM2], causedBy: null,
  });

  // Restoration lane: the candidate the production restorer would mint —
  // current revision fields with the target's strategy manifest restored.
  const restoredBody = {
    ...json(await store.getValue(records.revision2)) as Record<string, JsonValue>,
    parent: records.revision2,
    entrypoints: records.revision2Parsed.entrypoints.map(e => ({
      name: e.name, manifest: records.manifest, applicability: e.applicability,
      maxGenerations: e.maxGenerations, capabilities: [...e.capabilities], queries: [...e.queries],
    })),
  };
  const revisionRestored = await put(restoredBody);
  const revisionRestoredParsed = parseApplicationRevision(await store.getValue(revisionRestored));
  const restorationPolicyRecord = await put({
    contract: "algal.application-restoration-policy.v1",
    application: APPLICATION, mode: "retained-pure-strategy-manifests",
  });
  const restorationPolicy = parseApplicationRestorationPolicy(await store.getValue(restorationPolicyRecord));
  const restorationPolicyForeign = parseApplicationRestorationPolicy(json({
    contract: "algal.application-restoration-policy.v1",
    application: FOREIGN_APPLICATION, mode: "retained-pure-strategy-manifests",
  }));
  const restorationBody = (over: Record<string, unknown>) => ({
    contract: "algal.application-restoration.v1",
    application: APPLICATION, parentState: sA.digest, targetState: lite.genesis.digest,
    candidateRevision: revisionRestored, policy: restorationPolicyRecord,
    ...over,
  });
  const restorationRecord = await put(restorationBody({}));
  const restorationRecordStaleParent = await put(restorationBody({ parentState: lite.sC.digest }));

  // Drain records for the migrate leg (foreign application + a disposition
  // that does not cover the real pending set).
  // A mismatched-policy-reference lane: the forged pair is internally
  // consistent (evaluation.request hashes back to the request record) but
  // the request's policy is not the candidate revision's policy.
  const evaluationPolicyAlt = await put({
    contract: "algal.application-evaluation-policy.v1",
    maxCases: 4, maxWork: 1_000_000, maxModelCalls: 0,
    requireHoldoutPass: true, strictValidationImprovement: true,
  });
  const revisionForeignPolicyBody = {
    ...(json(await store.getValue(records.revision2)) as Record<string, JsonValue>),
    evaluationPolicy: evaluationPolicyAlt,
  };
  const revisionForeignPolicy = await put(revisionForeignPolicyBody);
  const revisionForeignPolicyParsed = parseApplicationRevision(await store.getValue(revisionForeignPolicy));
  const evalM2Record = json(await store.getValue(evalM2)) as Record<string, JsonValue>;
  const forgedRequest = await put({
    contract: "algal.application-evaluation-request.v1",
    parentState: lite.sD.digest, candidateRevision: revisionForeignPolicy,
    entrypoint: "run", cases, scorer, policy: records.evaluationPolicy,
    environment: ENVIRONMENT,
  });
  const forgedEvaluation = await put({
    contract: "algal.application-evaluation.v1",
    request: forgedRequest, parentState: lite.sD.digest,
    candidateRevision: revisionForeignPolicy, cases, scorer,
    policy: records.evaluationPolicy,
    foundryReport: evalM2Record["foundryReport"], compatibility: evalM2Record["compatibility"],
    verdict: evalM2Record["verdict"],
  });
  const drainForeign = await put({
    contract: "algal.application-drain.v1",
    application: FOREIGN_APPLICATION, parentState: lite.sD.digest, dispositions: [],
  });
  const drainCoverage = await put({
    contract: "algal.application-drain.v1",
    application: APPLICATION, parentState: lite.sD.digest,
    dispositions: [{ intent: ref({ contract: "algal.probe-foreign-intent.v1" }), status: "abandoned" }],
  });
  const dispatchPlan = {
    kind: "delivery" as const,
    recipient: capabilityHandle("mailbox-send", "policy-mutation"),
    hostProfile: PROFILE_DIGEST,
  };
  const dispatchRecordDelivery = json({
    contract: "algal.application-dispatch.v1",
    application: APPLICATION,
    intent: lite.intentDeliver,
    sourceState: lite.sD.digest,
    configurationDigest: lite.host.configurationDigest,
    identity: ref({
      contract: "algal.application-dispatch-identity.v1",
      application: APPLICATION, intent: lite.intentDeliver, plan: dispatchPlan,
    }),
    plan: dispatchPlan, status: "started", result: null, reason: null,
  });

  // Sealed research lane: pinned evaluator identity V, real corpus/report
  // records, evaluation admitted under the configured verifier.
  const verifierV: ApplicationResearchVerifier = {
    identity: ref({ contract: "algal.probe-verifier.v1" }),
    verify: async () => true,
  };
  const verifierV2: ApplicationResearchVerifier = {
    identity: ref({ contract: "algal.probe-verifier.v1", lane: "foreign" }),
    verify: async () => true,
  };
  const verifierLiar: ApplicationResearchVerifier = {
    identity: verifierV.identity,
    verify: async () => false,
  };
  const taskA = await put({ contract: "algal.probe-task.v1", n: 1 });
  const taskB = await put({ contract: "algal.probe-task.v1", n: 2 });
  const srcA = await put({ contract: "algal.probe-sources.v1", n: 1 });
  const srcB = await put({ contract: "algal.probe-sources.v1", n: 2 });
  // The evaluator digest is the verifier's identity; both verifier records
  // exist in CAS because the admission gate reads `research.evaluator`.
  await put({ contract: "algal.probe-verifier.v1" });
  await put({ contract: "algal.probe-verifier.v1", lane: "foreign" });
  const corpus = await put({
    contract: "algal.application-research-corpus.v1",
    cases: [
      { id: "dev", split: "development", task: taskA, sources: srcA },
      { id: "hold", split: "holdout", task: taskB, sources: srcB },
    ],
  });
  const harness = await put({ contract: "algal.probe-harness.v1" });
  // The pinned evaluator digest is the verifier's identity; the evaluator
  // record itself must exist in CAS for the admission checks that read it.
  const researchPolicyV = await put({
    contract: "algal.application-research-policy.v1",
    evaluator: verifierV.identity, harness, corpus,
    strategyEntrypoints: ["run"], maxAttemptsPerCase: 4,
  });
  const evalPolicyResearch = await put({
    contract: "algal.application-evaluation-policy.v1",
    maxCases: 8, maxWork: 1_000_000, maxModelCalls: 0,
    requireHoldoutPass: true, strictValidationImprovement: true,
    research: researchPolicyV,
  });
  const researchProfile = await put({
    contract: "algal.application-runtime-profile.v1",
    runtime: "bun-native-memory", policy: "sealed-research-evaluation.v1",
  });
  const researchRevisionBody = {
    contract: "algal.application-revision.v1",
    application: APPLICATION, parent: null, schema: records.schema,
    queries: records.queries, views: records.views,
    runtimeProfile: researchProfile, evaluationPolicy: evalPolicyResearch,
    capabilityRequirements: [] as string[],
    entrypoints: [{
      name: "run", manifest: records.manifest, applicability: records.query,
      maxGenerations: 1, capabilities: [] as string[], queries: [records.query],
    }],
  };
  const researchRevisionRef = await put(researchRevisionBody);
  const researchRevisionParsed = parseApplicationRevision(await store.getValue(researchRevisionRef));
  const researchCandidateBody = {
    ...researchRevisionBody, parent: researchRevisionRef,
    entrypoints: [{ ...researchRevisionBody.entrypoints[0]!, manifest: records.manifest3 }],
  };
  const researchCandidateRef = await put(researchCandidateBody);
  const researchCandidateParsed = parseApplicationRevision(await store.getValue(researchCandidateRef));
  const researchStateRef = await put({
    contract: "algal.application-state.v1",
    application: APPLICATION, sequence: 9, epoch: 1,
    revision: researchRevisionRef, memory: records.genesisMemory,
    previous: lite.sD.digest, transition: lite.sD.state.transition,
  });
  const requestRef = await put({
    contract: "algal.application-research-request.v1",
    parentState: researchStateRef, candidateRevision: researchCandidateRef,
    entrypoint: "run", policy: evalPolicyResearch,
  });
  const attempt = (caseId: string, role: string, receipt: Digest, passed: boolean) =>
    ({ caseId, role, attempt: 1, outcome: "complete" as const, passed, work: 1, modelCalls: 0, receipt });
  const receiptRows = await Promise.all([1, 2, 3, 4].map(n => put({ contract: "algal.probe-attempt.v1", n })));
  const reportRef = await put({
    contract: "algal.application-research-report.v1",
    request: requestRef, attemptJournal: await put({ contract: "algal.probe-journal.v1" }),
    attempts: [
      attempt("dev", "incumbent", receiptRows[0]!, false),
      attempt("dev", "candidate", receiptRows[1]!, true),
      attempt("hold", "incumbent", receiptRows[2]!, true),
      attempt("hold", "candidate", receiptRows[3]!, true),
    ],
  });
  const sealRef = await put({ contract: "algal.probe-seal.v1" });
  const researchEval = await admitApplicationResearchEvaluation(store, {
    request: requestRef, report: reportRef, seal: sealRef,
  }, { verifier: verifierV });

  return {
    lite,
    baseIdentity: lite.host.identity,
    baseConfiguration: lite.host.configurationDigest,
    engineA, engineB,
    cases, scorer, evalM2, evalM3, comparison,
    selectionPolicy, selectionPolicyB, selectionPolicyForeign, selectionPolicyStale,
    sA,
    restorationPolicy, restorationPolicyRecord, restorationPolicyForeign,
    restorationRecord, restorationRecordStaleParent,
    revisionRestored, revisionRestoredParsed,
    revisionForeignPolicy, revisionForeignPolicyParsed, forgedEvaluation,
    drainForeign, drainCoverage, dispatchRecordDelivery,
    research: {
      stateRef: researchStateRef, revisionRef: researchRevisionRef,
      revisionParsed: researchRevisionParsed,
      candidateRef: researchCandidateRef, candidateParsed: researchCandidateParsed,
      requestRef, reportRef, sealRef,
      evaluationRef: researchEval.evaluationRef,
      verifierV, verifierV2, verifierLiar,
    },
  };
}

export type { Digest, JsonValue };
export { parseApplicationCommand, parseApplicationHostPolicy, getApplicationRecord };
export type { ApplicationCommand };
