/** Application parity: replays one durable application lifecycle through the
 * TypeScript services and the native `algal application` CLI, requiring every
 * emitted digest and record to be identical. The TypeScript leg drives the
 * real native query engine as a subprocess, so derivations share the
 * executable-pinned engine identity; the native leg runs the same evaluator
 * in-process under the same identity. Both legs use the same declarative
 * `algal.application-host.v1` policy, so admission, decoding, delivery and
 * episode binding are exercised on both sides.
 *
 *   bun scripts/application-parity.ts            # target/debug/algal
 *   ALGAL_BIN=/path/to/algal bun scripts/application-parity.ts
 *
 * Exit 0 = identical outputs on every step; nonzero prints the first
 * divergence. */
import { createHash } from "node:crypto";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { ApplicationService, type ApplicationDispatch, type ApplicationDispatchAttempt, type ApplicationSnapshot } from "../src/application";
import { applicationJson, parseApplicationRevision } from "../src/application-contract";
import { captureApplicationGoals } from "../src/application-goal";
import { APPLICATION_QUOTA_LIMITS } from "../src/application-quota";
import {
  admitApplicationActivation, checkApplicationCompatibility, evaluateApplicationRevision, verifyApplicationEvaluation,
} from "../src/application-adaptation";
import { createApplicationDomainDispatcher, createApplicationPolicyHost } from "../src/application-host";
import { scheduleInvestigations, requestExecution } from "../src/application-investigation";
import { collectApplicationViewEvidence, parseApplicationView, parseApplicationViewSpec, projectApplicationView, type ApplicationApplicability, type ApplicationView } from "../src/application-view";
import { migrateApplicationMemory } from "../src/application-migration";
import { appendObservation } from "../src/application-observation";
import { restoreApplicationRevision, type ApplicationRestorationPolicy } from "../src/application-restoration";
import { produceApplicationComparison, verifyApplicationComparison } from "../src/application-comparison";
import { proposeApplicationRevision, verifyApplicationProposal } from "../src/application-proposal";
import { selectApplicationStrategy } from "../src/application-selection";
import { rolloverApplicationMemory } from "../src/application-rollover";
import { ApplicationMemoryService, parseMemorySnapshot } from "../src/application-memory";
import { NativeMemoryQueryEngine } from "../src/application-native-memory";
import { capabilityHandle } from "../src/capabilities";
import { builtinRegistry } from "../src/registry";
import { manifestToJson, parseOrganismManifest } from "../src/contract";
import { digestCanonical, type Digest } from "../src/digest";
import { FileStore } from "../src/store";
import { canonicalize, canonicalBytes, type JsonValue } from "../src/values";

const root = resolve(import.meta.dir, "..");
const binary = process.env.ALGAL_BIN ?? join(root, "target/debug/algal");
const binaryHex = createHash("sha256").update(await readFile(binary)).digest("hex");
const temporary = await mkdtemp(join(tmpdir(), "algal-app-parity-"));
const fixtureDir = join(temporary, "fixtures");
await mkdir(fixtureDir, { recursive: true });

const APP = "parity";
const LIMITS = { maxWork: 50_000, maxRounds: 32, maxDerived: 128, maxBindings: 128, maxRows: 16, maxOutputBytes: 262_144 };

// Content-addressed fixture values: digests are known before any store write.
// The incumbent and candidate entrypoint manifests share one interface so the
// evaluation is a genuine revision contest: the incumbent is the literal
// program "ok"; the candidate fixes the "v2"/"h1" inputs while preserving
// every previously passing case.
const evalInterface = { inputs: { q: { cell: "src", port: "value" } }, outputs: { answer: { cell: "out", port: "out" } } };
const evalCells = (program: JsonValue) => [
  { id: "src", kind: "input", outputs: { value: "json" } },
  { id: "out", kind: "expr", inputs: { value: "json" }, expr: { contract: "algal.expr.v1", program }, output: { kind: "json", schema: { type: "string" } } },
];
const evalEdges = [{ from: { cell: "src", port: "value" }, to: { cell: "out", port: "value" } }];
const manifestValue = manifestToJson(parseOrganismManifest({
  contract: "algal.organism.v1", key: "organism:parity", name: "parity",
  interface: evalInterface, cells: evalCells("ok"), edges: evalEdges,
}));
const manifestEvalValue = manifestToJson(parseOrganismManifest({
  contract: "algal.organism.v1", key: "organism:parity-eval", name: "parity-eval",
  interface: evalInterface,
  cells: evalCells(["if", ["eq", ["get", "value"], "v2"], "v2-ok", ["if", ["eq", ["get", "value"], "h1"], "h1-ok", "ok"]]),
  edges: evalEdges,
}));
const manifestEvalRef = digestCanonical(manifestEvalValue);
const values = {
  manifest: manifestValue,
  schema: { contract: "algal.application-memory-schema.v1", relations: [{ name: "available", arity: 1 }] },
  decoder: { contract: "algal.parity-decoder.v1" },
  attestation: { contract: "algal.parity-attestation.v1" },
  hostProfile: { contract: "algal.parity-host-profile.v1" },
  views: { contract: "algal.application-view-spec.v1", title: "Parity", widgets: ["investigations", "memory", "procedures"] },
  runtimeProfile: { contract: "algal.application-runtime-profile.v1", runtime: "bun-native-memory", policy: "pure-case-evaluation.v1" },
  evaluationPolicy: { contract: "algal.application-evaluation-policy.v1", maxCases: 8, maxWork: 1_000_000, maxModelCalls: 0, requireHoldoutPass: true, strictValidationImprovement: true },
  program: { contract: "algal.query.v1", rules: [], query: { relation: "available", terms: [{ var: "x" }, { var: "polarity" }] }, limits: LIMITS },
  frontier: { contract: "algal.application-memory-frontier.v1", application: APP, previous: null, sequence: 0, mutation: null, status: "settled" },
  episodeArgs: { src: { value: "probe" } },
  evalCases: {
    contract: "algal.application-evaluation-cases.v1",
    cases: [
      { id: "train-ok", split: "train", args: { q: "t1" }, expect: { answer: "ok" } },
      { id: "val-ok", split: "validation", args: { q: "v1" }, expect: { answer: "ok" } },
      { id: "val-fixed", split: "validation", args: { q: "v2" }, expect: { answer: "v2-ok" } },
      { id: "hold-fixed", split: "holdout", args: { q: "h1" }, expect: { answer: "h1-ok" } },
    ],
  },
  evalScorer: { contract: "algal.application-evaluation-scorer.v1", scorer: null },
} satisfies Record<string, JsonValue>;
const digests = Object.fromEntries(Object.entries(values).map(([k, v]) => [k, digestCanonical(v)])) as Record<keyof typeof values, Digest>;

const procedure = { contract: "algal.application-memory-procedure.v1", id: "probe", schema: digests.schema, manifest: digests.manifest, decoder: digests.decoder, dependencies: [], prerequisite: null };
const procedureRef = digestCanonical(procedure);
const query = { contract: "algal.application-memory-query.v1", id: "available", schema: digests.schema, program: digests.program, procedures: [procedureRef], polarityColumn: 1, conflict: "single-value" };
const queryRef = digestCanonical(query);
const queries = { contract: "algal.application-memory-queries.v1", queries: [queryRef] };
const queriesRef = digestCanonical(queries);
const revision = {
  contract: "algal.application-revision.v1", application: APP, parent: null,
  schema: digests.schema, queries: queriesRef, views: digests.views,
  runtimeProfile: digests.runtimeProfile, evaluationPolicy: digests.evaluationPolicy,
  capabilityRequirements: [],
  entrypoints: [{ name: "run", manifest: digests.manifest, applicability: queryRef, maxGenerations: 1, capabilities: [], queries: [queryRef] }],
};
const revisionRef = digestCanonical(revision);
const scope = { contract: "algal.application-memory-scope.v1", application: APP, environment: "fixture", task: "task-1", frontier: digests.frontier, bindings: [], completeFor: [procedureRef], attestation: digests.attestation };
const scopeRef = digestCanonical(scope);
const genesisMemory = { application: APP, schema: digests.schema, previous: null, scope: scopeRef, observations: [], hypotheses: [], withdrawn: [] };
const raw = { contract: "algal.parity-raw.v1", claims: [{ relation: "available", tuple: ["tool-a"], polarity: "supported" }] };
const rawRef = digestCanonical(raw);
const receipt = { contract: "algal.parity-receipt.v1", raw: rawRef };
const observationInput = { application: APP, scope: scopeRef, procedure: procedureRef, raw: rawRef, receipt: digestCanonical(receipt), decoder: digests.decoder };

// Activation and migration fixtures: a compatible candidate revision under the
// same schema, then a schema-2 revision bridged by a migration record whose
// claims arrive as an ordinary observation decoded by the policy host.
const decoder2 = { contract: "algal.parity-decoder2.v1" };
const decoder2Ref = digestCanonical(decoder2);
const schema2 = { contract: "algal.application-memory-schema.v1", relations: [{ name: "supported-tool", arity: 1 }] };
const schema2Ref = digestCanonical(schema2);
const manifest2Value = manifestToJson(parseOrganismManifest({
  contract: "algal.organism.v1", key: "organism:parity-migrate", name: "parity-migrate",
  interface: { inputs: { claims: { cell: "claims", port: "value" }, frontier: { cell: "frontier", port: "value" } }, outputs: { migrated: { cell: "out", port: "value" } } },
  cells: [
    { id: "claims", kind: "input", outputs: { value: "json" } },
    { id: "frontier", kind: "input", outputs: { value: "json" } },
    { id: "out", kind: "const", outputs: { value: { type: "json", value: { claims: [{ relation: "supported-tool", tuple: ["tool-a"], polarity: "supported" }] } } } },
  ], edges: [],
}));
const manifest2Ref = digestCanonical(manifest2Value);
// Candidate generation fixtures: a case-pure generator entrypoint emits a
// two-element manifest list — the winner (the evaluated alternative above)
// and a constant loser. Each becomes an ordinary child revision differing
// from the incumbent only at the target entrypoint's manifest.
const manifestLoserValue = manifestToJson(parseOrganismManifest({
  contract: "algal.organism.v1", key: "organism:parity-loser", name: "parity-loser",
  interface: { inputs: { q: { cell: "src", port: "value" } }, outputs: { answer: { cell: "out", port: "value" } } },
  cells: [
    { id: "src", kind: "input", outputs: { value: "json" } },
    { id: "out", kind: "const", outputs: { value: { type: "json", value: "loser" } } },
  ],
  edges: [],
}));
const manifestLoserRef = digestCanonical(manifestLoserValue);
const manifestGenValue = manifestToJson(parseOrganismManifest({
  contract: "algal.organism.v1", key: "organism:parity-generate", name: "parity-generate",
  interface: { inputs: {}, outputs: { candidates: { cell: "out", port: "out" } } },
  cells: [
    { id: "out", kind: "expr", inputs: {}, expr: { contract: "algal.expr.v1", program: ["quote", [manifestEvalValue, manifestLoserValue]] }, output: { kind: "json", schema: { type: "array" } } },
  ],
  edges: [],
}));
const manifestGenRef = digestCanonical(manifestGenValue);
// The generating revision sorts entrypoint names: "generate" before "run".
const revisionGen = {
  ...revision,
  entrypoints: [
    { name: "generate", manifest: manifestGenRef, applicability: queryRef, maxGenerations: 1, capabilities: [], queries: [queryRef] },
    { name: "run", manifest: digests.manifest, applicability: queryRef, maxGenerations: 1, capabilities: [], queries: [queryRef] },
  ],
};
const procedure2 = { contract: "algal.application-memory-procedure.v1", id: "migrate", schema: schema2Ref, manifest: manifest2Ref, decoder: decoder2Ref, dependencies: [], prerequisite: null };
const procedure2Ref = digestCanonical(procedure2);
const scope2 = { contract: "algal.application-memory-scope.v1", application: APP, environment: "fixture", task: "task-1", frontier: digests.frontier, bindings: [], completeFor: [procedure2Ref], attestation: digests.attestation };
const scope2Ref = digestCanonical(scope2);
// The schema-2 revision carries a schema-2 query bundle so the memory view
// stays coherent. The policy host checks this at commit admission.
const program2 = { contract: "algal.query.v1", rules: [], query: { relation: "supported-tool", terms: [{ var: "x" }, { var: "polarity" }] }, limits: LIMITS };
const program2Ref = digestCanonical(program2);
const query2 = { contract: "algal.application-memory-query.v1", id: "supported", schema: schema2Ref, program: program2Ref, procedures: [procedure2Ref], polarityColumn: 1, conflict: "single-value" };
const query2Ref = digestCanonical(query2);
const queries2 = { contract: "algal.application-memory-queries.v1", queries: [query2Ref] };
const queries2Ref = digestCanonical(queries2);
const evalEntrypoints = [{ name: "run", manifest: manifestEvalRef, applicability: queryRef, maxGenerations: 1, capabilities: [], queries: [queryRef] }];
const revision2 = { ...revision, parent: revisionRef, entrypoints: evalEntrypoints };
const revision2Ref = digestCanonical(revision2);
const revision3 = { ...revision2, parent: revision2Ref, schema: schema2Ref, queries: queries2Ref,
  entrypoints: evalEntrypoints.map(entry => ({ ...entry, applicability: query2Ref, queries: [query2Ref] })) };
const revision3Ref = digestCanonical(revision3);
// A query whose polarity column lies beyond its two-term literal: the shared
// admission check must refuse the revision identically on both runtimes.
const queryPolarity = { ...query2, id: "polarity-out-of-range", polarityColumn: 2 };
const queryPolarityRef = digestCanonical(queryPolarity);
const queriesPolarity = { contract: "algal.application-memory-queries.v1", queries: [queryPolarityRef] };
const queriesPolarityRef = digestCanonical(queriesPolarity);
const revisionPolarity = { ...revision3, parent: revision3Ref, queries: queriesPolarityRef,
  entrypoints: revision3.entrypoints.map(entry => ({ ...entry, applicability: queryPolarityRef, queries: [queryPolarityRef] })) };
const revisionPolarityRef = digestCanonical(revisionPolarity);
const mailbox = capabilityHandle("mailbox-send", { fixture: "parity" });
const policy = {
  contract: "algal.application-host.v1", application: APP, frontier: digests.frontier,
  hostProfile: digests.hostProfile, episodeAccess: "observe", attestation: "algal.parity-attestation.v1",
  routes: [{ route: "investigate", recipient: mailbox, hostProfile: digests.hostProfile }],
  decoders: [
    { decoder: digests.decoder, rawContract: "algal.parity-raw.v1", receiptContract: "algal.parity-receipt.v1", receiptBinding: "names-raw" },
    { decoder: decoder2Ref, rawContract: "algal.application-migration.v1", receiptContract: "algal.run.v1", receiptBinding: "names-receipt" },
  ].sort((a, b) => (a.decoder < b.decoder ? -1 : 1)),
};

// The published memory chain is deterministic: the host identity derives from
// the policy, so the stored observation and successor snapshot digests are
// computable before either leg runs.
const { frontier: _frontier, ...policyAuthority } = policy;
const hostIdentity = digestCanonical({ contract: "algal.host-admission.v2", policy: digestCanonical(policyAuthority) });
const genesisMemoryRef = digestCanonical({ contract: "algal.application-memory.v1", ...genesisMemory });
const observation1Record = { contract: "algal.application-memory-observation.v1", ...observationInput, admission: hostIdentity, claims: raw.claims };
const observation1Ref = digestCanonical(observation1Record);
const publishedMemory = { contract: "algal.application-memory.v1", application: APP, schema: digests.schema, previous: genesisMemoryRef, scope: scopeRef, observations: [observation1Ref], hypotheses: [], withdrawn: [] };
const publishedMemoryRef = digestCanonical(publishedMemory);

// Migration evidence is produced by `migrateApplicationMemory` itself: the
// program's real run receipt is embedded in the produced record, which the
// policy host decodes through the "names-receipt" binding. The legs capture
// its outputs instead of precomputing the chain.
const migrateRequest = {
  application: APP, from: publishedMemoryRef, schema: schema2Ref,
  scope: scope2Ref, procedure: procedure2Ref, program: manifest2Ref, decoder: decoder2Ref,
  previousRevision: revision2Ref, candidateRevision: revision3Ref,
};

// Input files shared by both legs.
const files: Record<string, JsonValue> = {
  ...values, manifestEval: manifestEvalValue, manifest2: manifest2Value, procedure, query, queries, revision, scope, genesisMemory, raw, receipt, policy,
  schema2, decoder2, procedure2, scope2, program2, query2, queries2, revision2, revision3, migrateRequest, queryPolarity, queriesPolarity, revisionPolarity,
  observation: observationInput,
};
const fixturePath = new Map<string, string>();
for (const [name, value] of Object.entries(files)) {
  const path = join(fixtureDir, `${name}.json`);
  await writeFile(path, canonicalize(value), "utf8");
  fixturePath.set(name, path);
}
const op = (name: string) => digestCanonical({ contract: "algal.parity-op.v1", name });
const inspectShape = (s: ApplicationSnapshot | null) =>
  s ? { state: s.digest, sequence: s.state.sequence, epoch: s.state.epoch, revision: s.state.revision, memory: s.state.memory, kind: s.transition.kind } : null;

const tsDir = join(temporary, "ts");
const nativeDir = join(temporary, "native");
const engine = new NativeMemoryQueryEngine({ executable: binary, expectedSha256: binaryHex });
const host = createApplicationPolicyHost(policy, { channelsDir: join(tsDir, "channels"), memoryEngine: engine });
const service = new ApplicationService(tsDir, host);
const memory = new ApplicationMemoryService({ store: service.store, engine, admission: host });
// The composed domain dispatcher: policy routes for deliveries, real episode
// execution through the VM — the same contract the native `dispatch` arm runs.
const dispatcher = createApplicationDomainDispatcher(policy, { channelsDir: join(tsDir, "channels"), store: service.store });
const pendingRows = async () => {
  const history = await service.history(APP);
  const rows = await (service as unknown as { pending(h: unknown): Promise<{ intent: string; sourceState: string; dispatch: ApplicationDispatch | null }[]> }).pending(history);
  return { pending: rows.map(p => ({ intent: p.intent, sourceState: p.sourceState, dispatch: p.dispatch })) };
};

let head = "" as Digest;
let genesisHead = "" as Digest;
let memoryRef = "" as Digest;
let derivationRef = "" as Digest;
let initialDerivationRef = "" as Digest;
let finalEvidenceView: ApplicationView | undefined;
let reconcileIntent = "" as Digest;
let wedgeIntent = "" as Digest;
let evaluationRef = "" as Digest;
let comparisonRef = "" as Digest;
let migrationRef = "" as Digest;
let migratedSnapshotRef = "" as Digest;
let migrateCommand: { [key: string]: JsonValue } = {};

/** `fails` legs compare the verdict; a `reason` additionally pins the exact
 * error message emitted by both runtimes for a shared contract check. */
type Step = { name: string; ts: () => Promise<unknown>; native: () => Promise<string[]>; fails?: boolean; reason?: string };
const steps: Step[] = [];
const putStep = (name: string, value: JsonValue, kind: "values" | "manifests" = "values") =>
  steps.push({
    name: `put ${name}`,
    ts: async () => {
      if (kind === "manifests") {
        const m = parseOrganismManifest(value);
        return { ref: await service.store.putManifest(m), bytes: canonicalBytes(manifestToJson(m)) };
      }
      return { ref: await service.store.putValue(value), bytes: canonicalBytes(value) };
    },
    native: async () => ["store", "put", fixturePath.get(name)!, "--kind", kind],
  });
putStep("manifest", manifestValue, "manifests");
putStep("manifestEval", manifestEvalValue, "manifests");
putStep("manifest2", manifest2Value, "manifests");
for (const name of ["schema", "decoder", "attestation", "hostProfile", "views", "runtimeProfile", "evaluationPolicy", "program", "frontier", "episodeArgs", "evalCases", "evalScorer"] as const) putStep(name, values[name]);
for (const [name, value] of Object.entries({ procedure, query, queries, revision, raw, receipt, schema2, decoder2, procedure2, program2, query2, queries2, revision2, revision3, queryPolarity, queriesPolarity, revisionPolarity })) putStep(name, value as JsonValue);

const dynamic = async (name: string, value: JsonValue) => {
  const path = join(fixtureDir, `${name}.json`);
  await writeFile(path, canonicalize(value), "utf8");
  return path;
};
const app = (...args: string[]) => ["application", "--policy", fixturePath.get("policy")!, ...args];
const evidenceView = async (derivations: Digest[] = [], applicability?: Record<string, ApplicationApplicability>): Promise<ApplicationView> => {
  const history = await service.history(APP);
  return projectApplicationView({
    snapshot: history[history.length - 1]!, spec: parseApplicationViewSpec(values.views), history,
    evidence: await collectApplicationViewEvidence(service, history, derivations), ...(applicability ? { applicability } : {}),
  });
};

steps.push(
  {
    name: "put-application-value",
    ts: async () => ({ digest: await service.store.putValue(applicationJson({ contract: "algal.application-parity-put.v1", n: 1 })) }),
    native: async () => app("put", await dynamic("appValue", { contract: "algal.application-parity-put.v1", n: 1 })),
  },
  { name: "scope", ts: async () => ({ scope: await memory.putScope(scope) }), native: async () => app("scope", fixturePath.get("scope")!) },
  {
    name: "snapshot",
    ts: async () => ({ memory: memoryRef = await memory.snapshot(genesisMemory) }),
    native: async () => app("snapshot", fixturePath.get("genesisMemory")!),
  },
  {
    name: "create",
    ts: async () => {
      const s = await service.create({ application: APP, operation: op("create"), kind: "create", expectedHead: null, revision: revisionRef, memory: memoryRef, intents: [], evidence: [], causedBy: null });
      head = s.digest; genesisHead = s.digest;
      return { state: s.digest, transition: s.state.transition, revision: s.state.revision, memory: s.state.memory };
    },
    native: async () => app("create", await dynamic("create", { application: APP, operation: op("create"), kind: "create", expectedHead: null, revision: revisionRef, memory: memoryRef, intents: [], evidence: [], causedBy: null })),
  },
  { name: "inspect", ts: async () => inspectShape(await service.inspect(APP)), native: async () => app("inspect", APP) },
  {
    name: "query-applicability",
    ts: async () => { const r = await memory.query(head, queryRef); derivationRef = r.ref; initialDerivationRef = r.ref; return { derivation: r.ref, status: r.derivation.status }; },
    native: async () => app("query", head, queryRef),
  },
  {
    name: "schedule",
    ts: async () => {
      const r = await scheduleInvestigations(service, memory, { application: APP, operation: op("schedule"), expectedHead: head, expectedMemory: memoryRef, route: "investigate" });
      if (r.snapshot) head = r.snapshot.digest;
      return { snapshot: r.snapshot?.digest ?? null, derivations: r.derivations, requests: r.requests };
    },
    native: async () => app("schedule", await dynamic("schedule", { application: APP, operation: op("schedule"), expectedHead: head, expectedMemory: memoryRef, route: "investigate" })),
  },
  {
    name: "query-unknown-captured-head",
    ts: async () => { const r = await memory.query(head, queryRef); derivationRef = r.ref; return { derivation: r.ref, status: r.derivation.status }; },
    native: async () => app("query", head, queryRef),
  },
  {
    name: "view-evidence-unknown-investigation",
    ts: async () => {
      const view = await evidenceView([derivationRef]), evidence = view.evidence!;
      if (evidence.queries.length !== 1 || evidence.queries[0]!.status !== "unknown" || evidence.queries[0]!.derivation !== derivationRef ||
          evidence.probes.length !== 1 || evidence.probes[0]!.procedure !== procedureRef || evidence.sources.length !== 0 ||
          evidence.work.length !== 1 || evidence.work[0]!.status !== "pending" || evidence.work[0]!.request === null || evidence.work[0]!.query !== queryRef) {
        throw new Error("Unknown evidence view lost its current query, bounded probe, or retained investigation");
      }
      return view;
    },
    native: async () => app("view", await dynamic("view-unknown-evidence", { application: APP, spec: digests.views, evidence: true, derivations: [derivationRef] })),
  },
  { name: "dispatch", ts: async () => ({ dispatches: await service.dispatchPending(APP, dispatcher) }), native: async () => app("dispatch", APP) },
  { name: "pending", ts: pendingRows, native: async () => app("pending", APP) },
  { name: "observe", ts: async () => ({ observation: await memory.observe(observationInput) }), native: async () => app("observe", fixturePath.get("observation")!) },
  {
    name: "publish",
    ts: async () => {
      const r = await appendObservation(service, memory, { application: APP, operation: op("publish"), expectedHead: head, expectedMemory: memoryRef, observation: observationInput });
      head = r.snapshot.digest; memoryRef = r.memory;
      return { snapshot: r.snapshot.digest, observation: r.observation, memory: r.memory };
    },
    native: async () => app("publish", await dynamic("publish", { application: APP, operation: op("publish"), expectedHead: head, expectedMemory: memoryRef, observation: observationInput })),
  },
  // An admitted-but-unsettled dispatch wedges activating transitions, so
  // activation and migration land before the episode intent is dispatched.
  {
    name: "scope-migrated",
    ts: async () => ({ scope: await memory.putScope(scope2) }),
    native: async () => app("scope", fixturePath.get("scope2")!),
  },
  // Evaluated activation: the candidate revision is checked compatible, run
  // through the foundry against the incumbent over the frozen case set, the
  // evaluation re-verified, and the verdict admitted before the activate
  // commit carries the evaluation as evidence.
  {
    name: "compatible",
    ts: async () => ({ compatibility: await checkApplicationCompatibility(service.store, revisionRef, revision2Ref) }),
    native: async () => app("compatible", await dynamic("compatible", { previous: revisionRef, candidate: revision2Ref })),
  },
  {
    name: "evaluate",
    ts: async () => {
      const request = { contract: "algal.application-evaluation-request.v1", parentState: head, candidateRevision: revision2Ref, entrypoint: "run", cases: digests.evalCases, scorer: digests.evalScorer, policy: digests.evaluationPolicy, environment: "parity-harness" };
      const r = await evaluateApplicationRevision(service.store, request, { fns: builtinRegistry() });
      evaluationRef = r.evaluationRef;
      return { evaluation: r.evaluationRef, verdict: r.evaluation.verdict };
    },
    native: async () => app("evaluate", await dynamic("eval-request", { contract: "algal.application-evaluation-request.v1", parentState: head, candidateRevision: revision2Ref, entrypoint: "run", cases: digests.evalCases, scorer: digests.evalScorer, policy: digests.evaluationPolicy, environment: "parity-harness" })),
  },
  {
    name: "verify-evaluation",
    ts: async () => {
      const r = await verifyApplicationEvaluation(service.store, evaluationRef, head, { fns: builtinRegistry() });
      return { ok: true, verdict: r.verdict };
    },
    native: async () => app("verify-evaluation", await dynamic("verify-eval", { evaluation: evaluationRef, expectedState: head })),
  },
  // Environment-attributed comparison: the evaluated alternative is joined
  // into a retained comparison record, re-verified, and cited as activation
  // evidence so the host checks its application/parent-state binding.
  {
    name: "compare",
    ts: async () => {
      const r = await produceApplicationComparison(service.store, { application: APP, parentState: head, entrypoint: "run", environment: "parity-harness", evaluations: [evaluationRef], selected: manifestEvalRef }, { fns: builtinRegistry() });
      comparisonRef = r.comparisonRef;
      return { comparison: r.comparisonRef, selected: r.comparison.selected };
    },
    native: async () => app("compare", await dynamic("compare", { application: APP, parentState: head, entrypoint: "run", environment: "parity-harness", evaluations: [evaluationRef], selected: manifestEvalRef })),
  },
  {
    name: "verify-comparison",
    ts: async () => {
      const r = await verifyApplicationComparison(service.store, comparisonRef, head, { fns: builtinRegistry() });
      return { ok: true, selected: r.selected };
    },
    native: async () => app("verify-comparison", await dynamic("verify-comparison", { comparison: comparisonRef, expectedState: head })),
  },
  {
    name: "admit-activation",
    ts: async () => admitApplicationActivation(service.store, { evaluation: evaluationRef, expectedState: head, revision: revision2Ref }, { fns: builtinRegistry() }),
    native: async () => app("admit-activation", await dynamic("admit", { evaluation: evaluationRef, expectedState: head, revision: revision2Ref })),
  },
  {
    name: "activate",
    ts: async () => {
      const s = await service.commit({ application: APP, operation: op("activate"), kind: "activate", expectedHead: head, revision: revision2Ref, memory: memoryRef, intents: [], evidence: [evaluationRef, comparisonRef].sort(), causedBy: null });
      head = s.digest;
      return { state: s.digest, transition: s.state.transition, revision: s.state.revision, memory: s.state.memory };
    },
    native: async () => app("commit", await dynamic("activate", { application: APP, operation: op("activate"), kind: "activate", expectedHead: head, revision: revision2Ref, memory: memoryRef, intents: [], evidence: [evaluationRef, comparisonRef].sort(), causedBy: null })),
  },
  {
    name: "query-supported",
    ts: async () => { const r = await memory.query(head, queryRef); derivationRef = r.ref; return { derivation: r.ref, status: r.derivation.status }; },
    native: async () => app("query", head, queryRef),
  },
  // The reflection view is a pure projection of the captured head: history
  // must terminate there and the supported `run` procedure's query result is
  // fenced to exactly this state and manifest.
  {
    name: "view",
    ts: async () => projectApplicationView({
      snapshot: (await service.inspect(APP))!,
      spec: parseApplicationViewSpec(values.views),
      history: await service.history(APP),
      applicability: { run: { status: "supported", queryResult: { digest: derivationRef, state: head, procedure: manifestEvalRef } } },
    }),
    native: async () => app("view", await dynamic("view", {
      application: APP, spec: digests.views,
      applicability: { run: { status: "supported", queryResult: { digest: derivationRef, state: head, procedure: manifestEvalRef } } },
    })),
  },
  {
    name: "view-evidence-supported-activation",
    ts: async () => {
      const view = await evidenceView([derivationRef]), evidence = view.evidence!;
      const query = evidence.queries.find(row => row.query === queryRef);
      if (query?.status !== "supported" || !query.claimedVerified || query.result === null || query.facts === null || !query.sourceRefs.includes(observation1Ref) ||
          !evidence.sources.some(row => row.observation === observation1Ref && row.raw === rawRef && row.admission === hostIdentity) ||
          !evidence.revisions.some(row => row.kind === "activate" && row.revision === revision2Ref && row.evidence.includes(evaluationRef)) ||
          !evidence.work.some(row => row.request !== null && row.status === "settled")) {
        throw new Error("Supported evidence view lost proof/source references or accepted revision history");
      }
      return view;
    },
    native: async () => app("view", await dynamic("view-supported-evidence", { application: APP, spec: digests.views, evidence: true, derivations: [derivationRef] })),
  },
  {
    name: "execute",
    ts: async () => {
      const s = await requestExecution(service, { application: APP, operation: op("execute"), expectedHead: head, expectedMemory: memoryRef, entrypoint: "run", input: digests.episodeArgs, derivation: derivationRef });
      head = s.digest;
      return { state: s.digest };
    },
    native: async () => app("execute", await dynamic("execute", { application: APP, operation: op("execute"), expectedHead: head, expectedMemory: memoryRef, entrypoint: "run", input: digests.episodeArgs, derivation: derivationRef })),
  },
  // Migration runs while the episode intent is committed but undispatched —
  // only an admitted-but-unsettled dispatch blocks an activating transition.
  // The producer runs the migration program, stores the record and receipt,
  // and admits the migrated claims as an observation on a fresh chain.
  {
    name: "migrate-memory",
    ts: async () => {
      const r = await migrateApplicationMemory(memory, migrateRequest, { fns: builtinRegistry() });
      migrationRef = r.migration; migratedSnapshotRef = r.snapshot;
      return r;
    },
    native: async () => app("migrate-memory", fixturePath.get("migrateRequest")!),
  },
  {
    name: "migrate",
    ts: async () => {
      const s = await service.commit(migrateCommand);
      head = s.digest; memoryRef = s.state.memory;
      return { state: s.digest, transition: s.state.transition, revision: s.state.revision, memory: s.state.memory };
    },
    native: async () => {
      migrateCommand = { application: APP, operation: op("migrate"), kind: "migrate", expectedHead: head, revision: revision3Ref, memory: migratedSnapshotRef, intents: [], evidence: [migrationRef], causedBy: null };
      return app("commit", await dynamic("migrate", migrateCommand));
    },
  },
  { name: "dispatch-obsolete-episode", ts: async () => ({ dispatches: await service.dispatchPending(APP, dispatcher) }), native: async () => app("dispatch", APP) },
  {
    name: "query-migrated-supported",
    ts: async () => { const r = await memory.query(head, query2Ref); derivationRef = r.ref; return { derivation: r.ref, status: r.derivation.status }; },
    native: async () => app("query", head, query2Ref),
  },
  {
    name: "execute-current-revision",
    ts: async () => {
      const s = await requestExecution(service, { application: APP, operation: op("execute-current"), expectedHead: head, expectedMemory: memoryRef, entrypoint: "run", input: digests.episodeArgs, derivation: derivationRef });
      head = s.digest;
      return { state: s.digest };
    },
    native: async () => app("execute", await dynamic("execute-current", { application: APP, operation: op("execute-current"), expectedHead: head, expectedMemory: memoryRef, entrypoint: "run", input: digests.episodeArgs, derivation: derivationRef })),
  },
  { name: "dispatch-episode", ts: async () => ({ dispatches: await service.dispatchPending(APP, dispatcher) }), native: async () => app("dispatch", APP) },
  {
    name: "reconcile-episode",
    ts: async () => await service.reconcileDispatch(APP, reconcileIntent, dispatcher),
    native: async () => app("reconcile", APP, reconcileIntent),
  },
  // Rejection parity: closed parsers, head fencing, and the unsettled-dispatch
  // wedge must fail identically on both runtimes. `fails` legs compare the
  // verdict only — error text is not part of the contract.
  {
    name: "stale-head",
    fails: true,
    ts: async () => service.commit({ application: APP, operation: op("stale"), kind: "investigate", expectedHead: genesisHead, revision: revision3Ref, memory: memoryRef, intents: [], evidence: [], causedBy: null }),
    native: async () => app("commit", await dynamic("stale", { application: APP, operation: op("stale"), kind: "investigate", expectedHead: genesisHead, revision: revision3Ref, memory: memoryRef, intents: [], evidence: [], causedBy: null })),
  },
  {
    name: "operation-collision",
    fails: true,
    ts: async () => service.commit({ ...migrateCommand, kind: "investigate" }),
    native: async () => app("commit", await dynamic("collision", { ...migrateCommand, kind: "investigate" })),
  },
  {
    name: "malformed-commit",
    fails: true,
    ts: async () => service.commit({ ...migrateCommand, operation: op("malformed"), kind: "investigate", expectedHead: head, bogus: true }),
    native: async () => app("commit", await dynamic("malformed", { ...migrateCommand, operation: op("malformed"), kind: "investigate", expectedHead: head, bogus: true })),
  },
  // A revision selecting a query whose polarity column exceeds its literal's
  // arity is refused by shared admission with one message on both runtimes,
  // before any derivation could index a result row out of bounds.
  {
    name: "activate-polarity-arity",
    fails: true,
    reason: "Query polarity column exceeds its query literal arity",
    ts: async () => service.commit({ application: APP, operation: op("polarity-arity"), kind: "activate", expectedHead: head, revision: revisionPolarityRef, memory: memoryRef, intents: [], evidence: [], causedBy: null }),
    native: async () => app("commit", await dynamic("polarity-arity", { application: APP, operation: op("polarity-arity"), kind: "activate", expectedHead: head, revision: revisionPolarityRef, memory: memoryRef, intents: [], evidence: [], causedBy: null })),
  },
  // The wedge leg: an episode dispatched through the bare policy host is
  // recorded `blocked` — an admitted-but-unsettled dispatch — which blocks
  // activating transitions until explicit settlement. Reconciliation cannot
  // manufacture a settlement (the host returns no outcome), so the dispatch
  // becomes `uncertain` and the wedge stands.
  {
    name: "query-before-wedge",
    ts: async () => { const r = await memory.query(head, query2Ref); derivationRef = r.ref; return { derivation: r.ref, status: r.derivation.status }; },
    native: async () => app("query", head, query2Ref),
  },
  {
    name: "commit-wedge-episode",
    ts: async () => {
      const s = await service.commit({ application: APP, operation: op("wedge-episode"), kind: "investigate", expectedHead: head, revision: revision3Ref, memory: memoryRef, intents: [{ kind: "start-episode", entrypoint: "run", input: digests.episodeArgs }], evidence: [derivationRef], causedBy: null });
      head = s.digest;
      return { state: s.digest, transition: s.state.transition, revision: s.state.revision, memory: s.state.memory };
    },
    native: async () => app("commit", await dynamic("wedge", { application: APP, operation: op("wedge-episode"), kind: "investigate", expectedHead: head, revision: revision3Ref, memory: memoryRef, intents: [{ kind: "start-episode", entrypoint: "run", input: digests.episodeArgs }], evidence: [derivationRef], causedBy: null })),
  },
  {
    name: "dispatch-blocked",
    ts: async () => ({ dispatches: await service.dispatchPending(APP, host) }),
    native: async () => app("dispatch", APP, "--host-only"),
  },
  {
    name: "activate-wedged",
    fails: true,
    ts: async () => service.commit({ application: APP, operation: op("wedged"), kind: "activate", expectedHead: head, revision: revision3Ref, memory: memoryRef, intents: [], evidence: [], causedBy: null }),
    native: async () => app("commit", await dynamic("wedged", { application: APP, operation: op("wedged"), kind: "activate", expectedHead: head, revision: revision3Ref, memory: memoryRef, intents: [], evidence: [], causedBy: null })),
  },
  {
    name: "reconcile-blocked",
    ts: async () => await service.reconcileDispatch(APP, wedgeIntent, host),
    native: async () => app("reconcile", APP, wedgeIntent, "--host-only"),
  },
  // An exact operation replay returns the committed snapshot even after the
  // head has moved — idempotency short-circuits before the stale-head check.
  {
    name: "idempotent-migrate",
    ts: async () => {
      const s = await service.commit(migrateCommand);
      return { state: s.digest, transition: s.state.transition, revision: s.state.revision, memory: s.state.memory };
    },
    native: async () => app("commit", await dynamic("migrate", migrateCommand)),
  },
  { name: "inspect-final", ts: async () => inspectShape(await service.inspect(APP)), native: async () => app("inspect", APP) },
  {
    name: "query-final-evidence",
    ts: async () => { const r = await memory.query(head, query2Ref); derivationRef = r.ref; return { derivation: r.ref, status: r.derivation.status }; },
    native: async () => app("query", head, query2Ref),
  },
  {
    name: "view-evidence-original-work-bindings",
    ts: async () => {
      const view = await evidenceView([derivationRef]), evidence = view.evidence!;
      if (!evidence.work.some(row => row.intent === wedgeIntent && row.status === "uncertain" && row.revision === revision3Ref && row.memory === migratedSnapshotRef) ||
          !evidence.work.some(row => row.intent === reconcileIntent && row.status === "settled" && row.process !== null && row.binding !== null && row.result !== null) ||
          !evidence.work.some(row => row.kind === "start-episode" && row.revision === revision2Ref && row.memory === publishedMemoryRef && row.status === "pending")) {
        throw new Error("Evidence view lost uncertainty, settled process reachability, or an obsolete work item's original bindings");
      }
      finalEvidenceView = view;
      return view;
    },
    native: async () => app("view", await dynamic("view-final-evidence", { application: APP, spec: digests.views, evidence: true, derivations: [derivationRef] })),
  },
);

const runNativeAttempt = async (args: string[], directory = nativeDir) => {
  const proc = Bun.spawn([binary, "--dir", directory, ...args], { stdout: "pipe", stderr: "pipe" });
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; proc.kill("SIGKILL"); }, 30_000);
  try {
    const [stdout, stderr, code] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text(), proc.exited]);
    if (timedOut || proc.signalCode !== null) throw new Error(`Native parity process did not exit normally: timeout ${timedOut}, signal ${proc.signalCode}`);
    return { stdout, stderr, code };
  } finally { clearTimeout(timer); }
};
const runNative = async (args: string[], directory = nativeDir) => {
  const { stdout, stderr, code } = await runNativeAttempt(args, directory);
  if (code !== 0) throw new Error(`native ${args.join(" ")} failed (${code}): ${stderr.trim()}`);
  return JSON.parse(stdout) as unknown;
};

const same = (a: unknown, b: unknown) => canonicalize(a as JsonValue) === canonicalize(b as JsonValue);
let checked = 0;

/** Evidence capture is a read-only, store-backed display boundary. Compare
 * closed report parsers as well as derivation admission so the two runtimes
 * cannot quietly render differently fenced or fabricated records. */
async function checkEvidenceParity(): Promise<void> {
  const view = finalEvidenceView;
  if (!view?.evidence) throw new Error("Missing final evidence fixture");
  const evidence = view.evidence;
  const legacy = { ...view };
  delete legacy.evidence;
  const parsedLegacy = parseApplicationView(legacy);
  if (Object.hasOwn(parsedLegacy, "evidence") || !same(parsedLegacy, legacy)) throw new Error("Legacy evidence absence changed canonical identity");
  const legacyReport = await runNativeAttempt(app("report", await dynamic("legacy-report", legacy as unknown as JsonValue)));
  if (legacyReport.code !== 0) throw new Error(`Legacy report rejected: ${legacyReport.stderr}`);
  checked++;
  const report = await runNativeAttempt(app("report", await dynamic("evidence-report", view as unknown as JsonValue)));
  if (report.code !== 0) throw new Error(`Captured evidence report rejected: ${report.stderr}`);
  checked++;
  const rejectReport = async (name: string, value: unknown) => {
    let rejected = false;
    try { parseApplicationView(value); } catch { rejected = true; }
    const native = await runNativeAttempt(app("report", await dynamic(`evidence-report-${name}`, value as JsonValue)));
    if (!rejected || native.code !== 2) throw new Error(`Evidence report rejection mismatch: ${name}; TS rejected ${rejected}, native exit ${native.code}`);
    checked++;
  };
  const withEvidence = (partial: Record<string, unknown>) => ({ ...view, evidence: { ...evidence, ...partial } });
  await rejectReport("unknown-field", withEvidence({ extra: true }));
  await rejectReport("state-fence", withEvidence({ state: genesisHead }));
  await rejectReport("memory-fence", withEvidence({ memory: genesisMemoryRef }));
  await rejectReport("truncation-closed", withEvidence({ truncated: { ...evidence.truncated, extra: false } }));
  await rejectReport("truncation-type", withEvidence({ truncated: { ...evidence.truncated, work: "false" } }));
  await rejectReport("query-digest", withEvidence({ queries: [{ ...evidence.queries[0]!, query: "sha256:bad" }] }));
  await rejectReport("query-status", withEvidence({ queries: [{ ...evidence.queries[0]!, status: "complete" }] }));
  await rejectReport("query-unproduced-success", withEvidence({ queries: [{ ...evidence.queries[0]!, derivation: null }] }));
  await rejectReport("action-derivation", { ...view, actions: [{ kind: "execute-procedure", expectedState: view.state, procedure: manifestEvalRef, queryResult: initialDerivationRef }] });
  await rejectReport("query-unknown-field", withEvidence({ queries: [{ ...evidence.queries[0]!, extra: true }] }));
  await rejectReport("query-reason-bytes", withEvidence({ queries: [{ ...evidence.queries[0]!, reason: "é".repeat(129) }] }));
  await rejectReport("probe-budgets", withEvidence({ probes: [{ ...evidence.probes[0]!, budgets: { ...evidence.probes[0]!.budgets, maxWork: -1 } }] }));
  await rejectReport("source-unknown-field", withEvidence({ sources: [{ ...evidence.sources[0]!, extra: true }] }));
  await rejectReport("revision-kind", withEvidence({ revisions: [{ ...evidence.revisions[0]!, kind: "unknown" }] }));
  await rejectReport("work-status", withEvidence({ work: [{ ...evidence.work[0]!, status: "complete" }] }));
  for (const key of ["queries", "probes", "sources", "revisions", "work"] as const) {
    if (!evidence[key].length) throw new Error(`Missing evidence ${key} parser fixture`);
    await rejectReport(`${key}-count`, withEvidence({ [key]: Array.from({ length: 33 }, () => evidence[key][0]) }));
  }
  const rejectCapture = async (name: string, derivations: Digest[]) => {
    const rejected = await evidenceView(derivations).then(() => false, () => true);
    const native = await runNativeAttempt(app("view", await dynamic(`evidence-capture-${name}`, { application: APP, spec: digests.views, evidence: true, derivations })));
    if (!rejected || native.code !== 2) throw new Error(`Evidence capture rejection mismatch: ${name}; TS rejected ${rejected}, native exit ${native.code}`);
    checked++;
  };
  await rejectCapture("stale-state", [initialDerivationRef]);
  await rejectCapture("duplicate-ref", [derivationRef, derivationRef]);
  await rejectCapture("missing-record", [op("missing-view-derivation")]);
  const original = await service.store.getValue(derivationRef);
  if (!original || typeof original !== "object" || Array.isArray(original)) throw new Error("Missing derivation fixture");
  const nativeStore = new FileStore(nativeDir);
  for (const [name, replacement] of Object.entries({ application: { application: "foreign" }, memory: { memory: genesisMemoryRef }, query: { query: queryRef }, program: { program: digests.program }, source: { sourceRefs: [observation1Ref] } })) {
    const changed = applicationJson({ ...original, ...replacement });
    const ref = await service.store.putValue(changed);
    if (await nativeStore.putValue(changed) !== ref) throw new Error("Derivation fixture identity differs");
    await rejectCapture(name, [ref]);
  }
  const duplicate = { ...original, reason: "same query, another retained derivation" };
  const duplicateRef = await service.store.putValue(duplicate);
  await nativeStore.putValue(duplicate);
  await rejectCapture("duplicate-query", [derivationRef, duplicateRef].sort());
  const validApplicability = { run: { status: "supported" as const, queryResult: { digest: derivationRef, state: head, procedure: manifestEvalRef } } };
  const validActionView = await evidenceView([derivationRef], validApplicability);
  const nativeActionView = await runNative(app("view", await dynamic("evidence-action-valid", { application: APP, spec: digests.views, evidence: true, derivations: [derivationRef], applicability: validApplicability })));
  if (!same(validActionView, nativeActionView) || validActionView.actions.length !== 1) throw new Error("Evidence-backed explicit action parity failed");
  checked++;
  for (const [name, applicability] of Object.entries({
    "status-disagrees": { run: { status: "unknown" as const } },
    "derivation-disagrees": { run: { status: "supported" as const, queryResult: { digest: initialDerivationRef, state: head, procedure: manifestEvalRef } } },
  })) {
    const rejected = await evidenceView([derivationRef], applicability).then(() => false, () => true);
    const native = await runNativeAttempt(app("view", await dynamic(`evidence-${name}`, applicationJson({ application: APP, spec: digests.views, evidence: true, derivations: [derivationRef], applicability }))));
    if (!rejected || native.code !== 2) throw new Error(`Evidence applicability rejection mismatch: ${name}`);
    checked++;
  }
  // Unsettled records have no result that could accidentally catch a changed
  // episode binding. Recompute the envelope identity to isolate the required
  // comparison against the original committed intent and source snapshot.
  const outboxPaths = [tsDir, nativeDir].map(directory => join(directory, "applications", APP, "outbox", wedgeIntent.slice(7) + ".json"));
  const outboxOriginals = await Promise.all(outboxPaths.map(path => readFile(path, "utf8")));
  for (const [name, replacement] of Object.entries({
    "stale-episode-binding": { revision: revision2Ref, memory: publishedMemoryRef },
    "changed-episode-process": { process: "foreign-process" },
    "changed-episode-input": { arguments: rawRef },
  })) {
    try {
      for (const [index, path] of outboxPaths.entries()) {
        const record = JSON.parse(outboxOriginals[index]!) as ApplicationDispatch;
        if (record.plan.kind !== "episode" || record.status !== "uncertain" || record.result !== null) throw new Error("Invalid unsettled binding fixture");
        record.plan.binding = { ...record.plan.binding, ...replacement };
        record.identity = digestCanonical({ contract: "algal.application-dispatch-identity.v1", application: APP, intent: wedgeIntent, plan: record.plan });
        await writeFile(path, canonicalize(record));
      }
      await rejectCapture(name, [derivationRef]);
    } finally {
      for (const [index, path] of outboxPaths.entries()) await writeFile(path, outboxOriginals[index]!);
    }
  }
  // Change bytes at an already addressed filename only after all successful
  // captures. A structural parse must not replace CAS digest verification.
  for (const directory of [tsDir, nativeDir]) await writeFile(join(directory, "values", derivationRef.slice(7) + ".json"), canonicalize({ ...original, reason: "tampered" }));
  try { await rejectCapture("changed-digest", [derivationRef]); }
  finally {
    for (const directory of [tsDir, nativeDir]) await writeFile(join(directory, "values", derivationRef.slice(7) + ".json"), canonicalize(original));
  }
}

/** Exercise admission boundaries on fresh namespaces with shared immutable
 * fixtures. Synthetic quota charges stand for retained reservations; no large
 * files, live effects, or adjustments to production limits are needed. */
async function checkGoalAndQuotaParity(): Promise<void> {
  const equal = (name: string, left: unknown, right: unknown): void => {
    if (!same(left, right)) throw new Error(`Application boundary parity diverged: ${name}`);
    checked++;
  };
  const pair = async (name: string) => {
    const directories = [join(temporary, name, "ts"), join(temporary, name, "native")];
    for (const directory of directories) {
      await mkdir(directory, { recursive: true });
      for (const kind of ["values", "manifests", "runs"]) {
        await cp(join(tsDir, kind), join(directory, kind), { recursive: true });
      }
    }
    const [typescript, native] = directories as [string, string];
    const admission = createApplicationPolicyHost(policy, { channelsDir: join(typescript, "channels"), memoryEngine: engine });
    const lifecycle = new ApplicationService(typescript, admission);
    const nativeStore = new FileStore(native);
    const put = async (value: JsonValue) => {
      const ref = await lifecycle.store.putValue(value);
      if (await nativeStore.putValue(value) !== ref) throw new Error("Fixture storage identity differs");
      return ref;
    };
    return { typescript, native, lifecycle, nativeStore, admission, put };
  };
  type Pair = Awaited<ReturnType<typeof pair>>;
  const command = (revision: Digest, name: string) => ({ application: APP, operation: op(name), kind: "create", expectedHead: null, revision, memory: genesisMemoryRef, intents: [], evidence: [], causedBy: null });
  const shape = (snapshot: ApplicationSnapshot) => ({ state: snapshot.digest, transition: snapshot.state.transition, revision: snapshot.state.revision, memory: snapshot.state.memory });
  const create = async (p: Pair, revision: Digest, name: string) => {
    const input = command(revision, name);
    const actual = await p.lifecycle.create(input);
    equal(name, shape(actual), await runNative(app("create", await dynamic(name, input)), p.native));
    return actual;
  };
  const reject = async (p: Pair, revision: JsonValue, name: string) => {
    const ref = await p.put(revision), input = command(ref, name);
    const refused = await p.lifecycle.create(input).then(() => false, () => true);
    const native = await runNativeAttempt(app("create", await dynamic(name, input)), p.native);
    if (!refused || native.code !== 2) throw new Error(`Goal admission failed its rejection contract: ${name}; TS rejected ${refused}, native exit ${native.code}`);
    equal(`${name} leaves no head`, await p.lifecycle.inspect(APP), await runNative(app("inspect", APP), p.native));
    checked++;
  };
  // Restoration requires explicit host authority, creates a forward child,
  // preserves current memory and replays exactly on both independent stores.
  {
    const p = await pair("strategy-restoration");
    const original = await create(p, revisionRef, "restoration-create");
    const request = { contract: "algal.application-evaluation-request.v1", parentState: original.digest, candidateRevision: revision2Ref, entrypoint: "run", cases: digests.evalCases, scorer: digests.evalScorer, policy: digests.evaluationPolicy };
    const evaluated = await evaluateApplicationRevision(p.lifecycle.store, request, { fns: builtinRegistry() });
    equal("restoration preceding evaluation", { evaluation: evaluated.evaluationRef, verdict: evaluated.evaluation.verdict }, await runNative(app("evaluate", await dynamic("restoration-evaluate", request)), p.native));
    const activation = { application: APP, operation: op("restoration-activate"), kind: "activate", expectedHead: original.digest, revision: revision2Ref, memory: original.state.memory, intents: [], evidence: [evaluated.evaluationRef], causedBy: null };
    const active = await p.lifecycle.commit(activation);
    equal("restoration preceding activation", shape(active), await runNative(app("commit", await dynamic("restoration-activate", activation)), p.native));
    const authority: ApplicationRestorationPolicy = { contract: "algal.application-restoration-policy.v1", application: APP, mode: "retained-pure-strategy-manifests" };
    const input = { application: APP, operation: op("restoration"), expectedHead: active.digest, targetState: original.digest, policy: await p.put(authority) };
    const authorityFile = await dynamic("restoration-policy", authority);
    const deny = await restoreApplicationRevision(p.lifecycle, input).then(() => false, () => true);
    const denied = await runNativeAttempt(app("restore", await dynamic("restoration-denied", input)), p.native);
    if (!deny || denied.code !== 2) throw new Error("Restoration default-deny differs");
    checked++;
    const lifecycle = new ApplicationService(p.typescript, createApplicationPolicyHost(policy, { channelsDir: join(p.typescript, "channels"), memoryEngine: engine, restorationPolicy: authority }));
    const restored = await restoreApplicationRevision(lifecycle, input);
    const result = { snapshot: restored.snapshot.digest, revision: restored.revision, restoration: restored.restoration };
    equal("restoration forward child", result, await runNative(app("--restoration-policy", authorityFile, "restore", await dynamic("restoration", input)), p.native));
    equal("restoration revision bytes", await lifecycle.store.getValue(restored.revision), await p.nativeStore.getValue(restored.revision));
    equal("restoration evidence bytes", await lifecycle.store.getValue(restored.restoration), await p.nativeStore.getValue(restored.restoration));
    if (restored.snapshot.state.memory !== active.state.memory || restored.snapshot.state.epoch !== active.state.epoch + 1) throw new Error("Restoration replaced memory or rewound its epoch");
    equal("restoration reopen", { state: restored.snapshot.digest, sequence: restored.snapshot.state.sequence, epoch: restored.snapshot.state.epoch, revision: restored.revision, memory: restored.snapshot.state.memory, kind: "restore" }, await runNative(app("inspect", APP), p.native));
    equal("restoration exact replay", { snapshot: (await restoreApplicationRevision(lifecycle, input)).snapshot.digest, revision: restored.revision, restoration: restored.restoration }, await runNative(app("--restoration-policy", authorityFile, "restore", await dynamic("restoration-replay", input)), p.native));
    for (const [name, bad] of [["stale", { ...input, operation: op("restoration-stale") }], ["no-op", { ...input, expectedHead: restored.snapshot.digest, operation: op("restoration-no-op") }], ["not-ancestor", { ...input, expectedHead: restored.snapshot.digest, targetState: restored.snapshot.digest, operation: op("restoration-non-ancestor") }]] as const) {
      const refused = await restoreApplicationRevision(lifecycle, bad).then(() => false, () => true);
      const attempt = await runNativeAttempt(app("--restoration-policy", authorityFile, "restore", await dynamic(`restoration-${name}`, bad)), p.native);
      if (!refused || attempt.code !== 2) throw new Error(`Restoration rejection differs: ${name}`);
      checked++;
    }
  }
  // Case-pure candidate generation and environment-keyed selection: the
  // generator entrypoint emits two candidate manifests, each becomes a child
  // revision differing only at the target manifest, both are evaluated and
  // compared, and a selection policy narrows activation to the environment's
  // accepted alternative. Hosts without a declared environment — or naming
  // an environment the policy does not serve — deny the same commit.
  {
    const p = await pair("generation-selection");
    for (const manifest of [manifestGenValue, manifestLoserValue]) {
      const parsed = parseOrganismManifest(manifest);
      equal("generation manifest storage", await p.lifecycle.store.putManifest(parsed), await p.nativeStore.putManifest(parsed));
    }
    const genRevisionRef = await p.put(revisionGen);
    const argsRef = await p.put({});
    const created = await create(p, genRevisionRef, "generation-create");
    const proposeInput = { application: APP, operation: op("propose"), expectedHead: created.digest, generator: "generate", target: "run", arguments: argsRef, output: "candidates", policy: digests.evaluationPolicy, environment: "parity-harness" };
    const proposed = await proposeApplicationRevision(p.lifecycle, proposeInput, { fns: builtinRegistry() });
    equal("propose", { proposal: proposed.proposal, status: proposed.status, candidates: proposed.candidates }, await runNative(app("propose", await dynamic("generation-propose", proposeInput)), p.native));
    if (proposed.status !== "generated" || proposed.candidates.length !== 2) throw new Error("Generation did not emit two candidates");
    const proposalHead = proposed.snapshot.digest;
    const verifiedProposal = await verifyApplicationProposal(p.lifecycle.store, proposed.proposal, created.digest, { fns: builtinRegistry() });
    equal("verify-proposal", { ok: true, status: verifiedProposal.status, candidates: verifiedProposal.candidates }, await runNative(app("verify-proposal", await dynamic("generation-verify-proposal", { proposal: proposed.proposal, expectedState: created.digest })), p.native));
    const winner = proposed.candidates.find(candidate => candidate.manifest === manifestEvalRef);
    const loser = proposed.candidates.find(candidate => candidate.manifest === manifestLoserRef);
    if (!winner || !loser) throw new Error("Proposal candidates are not the emitted manifests");
    const evalRequest = (candidateRevision: Digest) => ({ contract: "algal.application-evaluation-request.v1", parentState: proposalHead, candidateRevision, entrypoint: "run", cases: digests.evalCases, scorer: digests.evalScorer, policy: digests.evaluationPolicy, environment: "parity-harness" });
    const winnerEval = await evaluateApplicationRevision(p.lifecycle.store, evalRequest(winner.revision), { fns: builtinRegistry() });
    equal("evaluate winner candidate", { evaluation: winnerEval.evaluationRef, verdict: winnerEval.evaluation.verdict }, await runNative(app("evaluate", await dynamic("generation-evaluate-winner", evalRequest(winner.revision))), p.native));
    const loserEval = await evaluateApplicationRevision(p.lifecycle.store, evalRequest(loser.revision), { fns: builtinRegistry() });
    equal("evaluate loser candidate", { evaluation: loserEval.evaluationRef, verdict: loserEval.evaluation.verdict }, await runNative(app("evaluate", await dynamic("generation-evaluate-loser", evalRequest(loser.revision))), p.native));
    const compareInput = { application: APP, parentState: proposalHead, entrypoint: "run", environment: "parity-harness", evaluations: [winnerEval.evaluationRef, loserEval.evaluationRef], selected: manifestEvalRef };
    const compared = await produceApplicationComparison(p.lifecycle.store, compareInput, { fns: builtinRegistry() });
    equal("compare candidates", { comparison: compared.comparisonRef, selected: compared.comparison.selected }, await runNative(app("compare", await dynamic("generation-compare", compareInput)), p.native));
    const selectionPolicyRef = await p.put({ contract: "algal.application-selection-policy.v1", application: APP, parentState: proposalHead, entrypoint: "run", selections: [{ environment: "parity-harness", comparison: compared.comparisonRef, manifest: manifestEvalRef }] });
    const selected = await selectApplicationStrategy(p.lifecycle.store, selectionPolicyRef, "parity-harness", proposalHead, { fns: builtinRegistry() });
    equal("select", { manifest: selected.manifest, comparison: selected.comparison }, await runNative(app("select", await dynamic("generation-select", { policy: selectionPolicyRef, environment: "parity-harness", expectedState: proposalHead })), p.native));
    const activateInput = (name: string) => ({ application: APP, operation: op(name), kind: "activate" as const, expectedHead: proposalHead, revision: winner.revision, memory: created.state.memory, intents: [], evidence: [winnerEval.evaluationRef, compared.comparisonRef, selectionPolicyRef].sort(), causedBy: null });
    const deniedNoEnv = await p.lifecycle.commit(activateInput("selection-no-env")).then(() => false, () => true);
    const deniedNoEnvNative = await runNativeAttempt(app("commit", await dynamic("selection-no-env", activateInput("selection-no-env"))), p.native);
    if (!deniedNoEnv || deniedNoEnvNative.code !== 2) throw new Error("Selection policy on a host without an environment was not denied");
    checked++;
    const wrongEnvLifecycle = new ApplicationService(p.typescript, createApplicationPolicyHost(policy, { channelsDir: join(p.typescript, "channels"), memoryEngine: engine, selectionEnvironment: "other-env" }));
    const deniedWrongEnv = await wrongEnvLifecycle.commit(activateInput("selection-wrong-env")).then(() => false, () => true);
    const deniedWrongEnvNative = await runNativeAttempt(app("--selection-environment", "other-env", "commit", await dynamic("selection-wrong-env", activateInput("selection-wrong-env"))), p.native);
    if (!deniedWrongEnv || deniedWrongEnvNative.code !== 2) throw new Error("Selection policy under an unserved environment was not denied");
    checked++;
    const envLifecycle = new ApplicationService(p.typescript, createApplicationPolicyHost(policy, { channelsDir: join(p.typescript, "channels"), memoryEngine: engine, selectionEnvironment: "parity-harness" }));
    const activated = await envLifecycle.commit(activateInput("selection-activate"));
    equal("selection activate", shape(activated), await runNative(app("--selection-environment", "parity-harness", "commit", await dynamic("selection-activate", activateInput("selection-activate"))), p.native));
    if (activated.state.revision !== winner.revision) throw new Error("Selection activation did not install the selected candidate");
  }
  // Active selection rollover preserves the application, history and native
  // applicability while both runtimes reject forgotten archives/resurrection.
  {
    const p = await pair("memory-rollover"), memory = new ApplicationMemoryService({ store: p.lifecycle.store, engine, admission: p.admission });
    let current = await create(p, revisionRef, "memory-rollover-create");
    const references: Digest[] = [];
    for (let i = 0; i < 2; i++) {
      const raw = await p.put({ contract: "algal.parity-raw.v1", claims: [{ relation: "available", tuple: ["tool-a"], polarity: "supported" }], note: i });
      const receipt = await p.put({ contract: "algal.parity-receipt.v1", raw });
      const input = { application: APP, operation: op(`rollover-publish-${i}`), expectedHead: current.digest, expectedMemory: current.state.memory,
        observation: { ...observationInput, raw, receipt } };
      const result = await appendObservation(p.lifecycle, memory, input);
      equal(`rollover publish ${i}`, { snapshot: result.snapshot.digest, memory: result.memory, observation: result.observation }, await runNative(app("publish", await dynamic(`rollover-publish-${i}`, input)), p.native));
      current = result.snapshot; references.push(result.observation);
    }
    const input = { application: APP, operation: op("memory-rollover"), expectedHead: current.digest, expectedMemory: current.state.memory, retainObservations: [references[0]!], retainHypotheses: [] };
    const rolled = await rolloverApplicationMemory(p.lifecycle, memory, input);
    const result = { snapshot: rolled.snapshot.digest, memory: rolled.memory, archive: rolled.archive };
    equal("rollover commit", result, await runNative(app("rollover-memory", await dynamic("memory-rollover", input)), p.native));
    equal("rollover snapshot bytes", await p.lifecycle.store.getValue(rolled.memory), await p.nativeStore.getValue(rolled.memory));
    equal("rollover archive bytes", await p.lifecycle.store.getValue(rolled.archive), await p.nativeStore.getValue(rolled.archive));
    const derived = await memory.query(rolled.snapshot.digest, queryRef);
    if (derived.derivation.status !== "supported") throw new Error("Rollover lost the retained applicability source");
    equal("rollover applicability", { derivation: derived.ref, status: derived.derivation.status }, await runNative(app("query", rolled.snapshot.digest, queryRef), p.native));
    const { contract: _contract, ...body } = parseMemorySnapshot(await p.lifecycle.store.getValue(rolled.memory));
    const successor = { ...body, previous: rolled.memory };
    const { archive: _archive, ...dropped } = successor;
    for (const [name, bad] of [["archive-loss", dropped], ["resurrection", { ...successor, observations: [...references].sort() }]] as const) {
      const rejected = await memory.snapshot(bad).then(() => false, () => true);
      const attempt = await runNativeAttempt(app("snapshot", await dynamic(`rollover-${name}`, bad)), p.native);
      if (!rejected || attempt.code !== 2) throw new Error(`Memory rollover rejection differs: ${name}`);
      checked++;
    }
    const appendInput = { application: APP, operation: op("rollover-ordinary-append"), expectedHead: rolled.snapshot.digest, expectedMemory: rolled.memory, observation: observationInput };
    const appended = await appendObservation(p.lifecycle, memory, appendInput);
    equal("append carries archive", { snapshot: appended.snapshot.digest, memory: appended.memory, observation: appended.observation }, await runNative(app("publish", await dynamic("rollover-ordinary-append", appendInput)), p.native));
    if (parseMemorySnapshot(await p.lifecycle.store.getValue(appended.memory)).archive !== rolled.archive) throw new Error("Ordinary append lost rollover provenance");
    equal("rollover retry preserves operation", { snapshot: (await rolloverApplicationMemory(p.lifecycle, memory, input)).snapshot.digest, memory: rolled.memory, archive: rolled.archive }, await runNative(app("rollover-memory", await dynamic("memory-rollover-retry", input)), p.native));
  }
  // An admitted identifier may match an inherited Object property: missing
  // evidence must remain unknown, and an own supplied digest must still work.
  const goal = { contract: "algal.application-goal.v1", application: APP, id: "constructor", description: "Find an available tool", query: queryRef, entrypoint: "run" };
  equal("legacy revision absence preserves identity", digestCanonical(parseApplicationRevision(revision)), revisionRef);
  for (const selection of ["absent", "empty", "defined", "max-description"] as const) {
    const p = await pair(`goals-${selection}`), goalRef = await p.put(selection === "max-description" ? { ...goal, description: "é".repeat(1024) } : goal);
    const body = selection === "absent" ? revision : { ...revision, goals: selection === "empty" ? [] : [goalRef] };
    const snapshot = await create(p, await p.put(body), `goals-${selection}`);
    const projection = async (evidence: Record<string, Digest> = {}) => projectApplicationView({ snapshot, spec: parseApplicationViewSpec(values.views), history: await p.lifecycle.history(APP),
      ...(Object.hasOwn(snapshot.revision, "goals") ? { goals: await captureApplicationGoals(p.lifecycle.store, snapshot, evidence) } : {}) });
    equal(`goals-${selection} view`, await projection(), await runNative(app("view", await dynamic(`goals-${selection}-view`, { application: APP, spec: digests.views })), p.native));
    const view = await projection();
    if (Object.hasOwn(view, "goals") !== (selection !== "absent")) throw new Error("Goal absence and explicit selection were conflated");
    if (selection === "defined") {
      const memory = new ApplicationMemoryService({ store: p.lifecycle.store, engine, admission: p.admission });
      const derived = await memory.query(snapshot.digest, queryRef);
      equal("goal derivation", { derivation: derived.ref, status: derived.derivation.status }, await runNative(app("query", snapshot.digest, queryRef), p.native));
      const evidence = { [goal.id]: derived.ref };
      equal("goal captured derivation view", await projection(evidence), await runNative(app("view", await dynamic("goals-evidence-view", { application: APP, spec: digests.views, goalDerivations: evidence })), p.native));
      for (const [name, invalid] of [["unknown-goal", { foreign: derived.ref }], ["foreign-state", { [goal.id]: derivationRef }]] as const) {
        const refused = await projection(invalid).then(() => false, () => true);
        const native = await runNativeAttempt(app("view", await dynamic(`goals-${name}-view`, { application: APP, spec: digests.views, goalDerivations: invalid })), p.native);
        if (!refused || native.code !== 2) throw new Error(`Goal capture failed its rejection contract: ${name}`);
        checked++;
      }
    }
  }
  const hostProbe = await pair("evidence-host-probe");
  const hostProbeRef = await hostProbe.put({ contract: "algal.fixture-host-probe.v1", name: "host-read" });
  const hostProcedureRef = await hostProbe.put({ ...procedure, manifest: hostProbeRef });
  const hostQueryRef = await hostProbe.put({ ...query, procedures: [hostProcedureRef] });
  const hostQueriesRef = await hostProbe.put({ ...queries, queries: [hostQueryRef] });
  const hostRevisionRef = await hostProbe.put({ ...revision, queries: hostQueriesRef, entrypoints: revision.entrypoints.map(entry => ({ ...entry, applicability: hostQueryRef, queries: [hostQueryRef] })) });
  const hostSnapshot = await create(hostProbe, hostRevisionRef, "evidence-host-probe-create");
  const hostHistory = await hostProbe.lifecycle.history(APP);
  const hostView = projectApplicationView({ snapshot: hostSnapshot, spec: parseApplicationViewSpec(values.views), history: hostHistory,
    evidence: await collectApplicationViewEvidence(hostProbe.lifecycle, hostHistory) });
  if (hostView.evidence?.probes[0]?.budgets !== null || hostView.evidence.probes[0].manifest !== hostProbeRef || hostView.actions.length) throw new Error("Host-backed probe invented VM budgets or authority");
  equal("host-backed probe null budgets", hostView, await runNative(app("view", await dynamic("evidence-host-probe-view", { application: APP, spec: digests.views, evidence: true })), hostProbe.native));
  const hostReport = await runNativeAttempt(app("report", await dynamic("evidence-host-probe-report", hostView as unknown as JsonValue)), hostProbe.native);
  if (hostReport.code !== 0) throw new Error(`Host-backed probe report rejected: ${hostReport.stderr}`);
  checked++;

  const malformed = await pair("goals-malformed");
  for (const [name, body] of Object.entries({
    application: { ...goal, application: "foreign" }, query: { ...goal, query: query2Ref }, entrypoint: { ...goal, entrypoint: "missing" },
    "empty-description": { ...goal, description: "" }, "description-bytes": { ...goal, description: "é".repeat(1025) },
    "nul-description": { ...goal, description: "bad\0goal" }, "unknown-field": { ...goal, extra: true }, "malformed-digest": { ...goal, query: "sha256:bad" },
  })) await reject(malformed, { ...revision, goals: [await malformed.put(body)] }, `goal-reject-${name}`);
  const goalRef = await malformed.put(goal), alternate = await malformed.put({ ...goal, description: "Another description" });
  await reject(malformed, { ...revision, goals: [goalRef, alternate].sort() }, "goal-reject-duplicate-id");
  await reject(malformed, { ...revision, goals: [goalRef, goalRef] }, "goal-reject-duplicate-ref");
  await reject(malformed, { ...revision, goals: [goalRef, alternate].sort().reverse() }, "goal-reject-unsorted-refs");
  const tooMany: Digest[] = [];
  for (let i = 0; i < 9; i++) tooMany.push(await malformed.put({ ...goal, id: `goal-${i}` }));
  await reject(malformed, { ...revision, goals: tooMany.sort() }, "goal-reject-count-bound");
  await reject(malformed, { ...revision, goals: [op("missing-goal")] }, "goal-reject-missing-record");
  // Keep the addressed filename while changing its bytes: parser acceptance of
  // the new body must never substitute for checking the requested CAS identity.
  for (const directory of [malformed.typescript, malformed.native]) await writeFile(join(directory, "values", goalRef.slice(7) + ".json"), canonicalize({ ...goal, description: "tampered" }));
  await reject(malformed, { ...revision, goals: [goalRef] }, "goal-reject-changed-digest");

  const ledgerPath = (directory: string) => join(directory, ".application-quota", "ledger.json");
  const ledger = async (directory: string) => JSON.parse(await readFile(ledgerPath(directory), "utf8")) as { contract: string; applications: { application: string; bytes: number }[] };
  const seedLedger = async (p: Pair, applications: { application: string; bytes: number }[]) => {
    for (const directory of [p.typescript, p.native]) {
      await mkdir(join(directory, ".application-quota"), { recursive: true });
      await writeFile(ledgerPath(directory), canonicalize({ contract: "algal.application-quota.v1", applications }));
    }
  };
  const rejectQuota = async (p: Pair, input: JsonValue, name: string, verb = "commit") => {
    const tsError: unknown = await p.lifecycle.commit(input).then(() => null, error => error);
    const native = await runNativeAttempt(app(verb, await dynamic(name, input)), p.native);
    const nativeError = native.code === 2 ? (JSON.parse(native.stderr) as { error?: { code?: string; message?: string } }).error : undefined;
    if (!(tsError instanceof Error) || !("code" in tsError) || tsError.code !== "BUDGET_EXHAUSTED" || !tsError.message.startsWith("Application namespace quota:") ||
        nativeError?.code !== "BUDGET_EXHAUSTED" || !nativeError.message?.startsWith("Application namespace quota:")) {
      throw new Error(`Quota fixture failed its quota-specific rejection contract: ${name}; TS ${String(tsError)}, native exit ${native.code}: ${native.stderr.slice(-1000)}`);
    }
    checked++;
  };
  const quota = await pair("quota-measure");
  const initial = await create(quota, revisionRef, "quota-create");
  equal("quota initial persistent ledger", await ledger(quota.typescript), await ledger(quota.native));
  const charge = (await ledger(quota.typescript)).applications.find(row => row.application === APP)!.bytes;
  const reservation = charge - APPLICATION_QUOTA_LIMITS.ownerHeadroom;
  if (reservation <= 0) throw new Error("Creation omitted its quota reservation");
  // Cross-runtime handoff on the very same files, not two separately created
  // lookalikes: native commits the TS-created namespace, then TS reads/advances.
  const handoff = { ...command(revisionRef, "quota-native-handoff"), kind: "memory", expectedHead: initial.digest };
  await runNative(app("commit", await dynamic("quota-native-handoff", handoff)), quota.typescript);
  const nativeHead = (await quota.lifecycle.inspect(APP))!;
  const beforeTs = (await ledger(quota.typescript)).applications[0]!.bytes;
  const tsHead = await quota.lifecycle.commit({ ...handoff, operation: op("quota-ts-handoff"), expectedHead: nativeHead.digest });
  equal("quota native reads TS handoff", inspectShape(tsHead), await runNative(app("inspect", APP), quota.typescript));
  if ((await ledger(quota.typescript)).applications[0]!.bytes <= beforeTs) throw new Error("Cross-runtime quota charge did not advance");

  const exact = await pair("quota-exact");
  await seedLedger(exact, [{ application: APP, bytes: APPLICATION_QUOTA_LIMITS.applicationBytes - reservation }]);
  const full = await create(exact, revisionRef, "quota-create");
  equal("quota exact limit TS/native ledger", await ledger(exact.typescript), await ledger(exact.native));
  if ((await ledger(exact.typescript)).applications[0]!.bytes !== APPLICATION_QUOTA_LIMITS.applicationBytes) throw new Error("Exact byte boundary was not respected");
  const before = await ledger(exact.typescript);
  const overflow = { ...command(revisionRef, "quota-overflow"), kind: "memory", expectedHead: full.digest };
  await rejectQuota(exact, overflow, "quota-overflow");
  equal("quota rejected TS publication keeps ledger", await ledger(exact.typescript), before);
  equal("quota rejected native publication keeps ledger", await ledger(exact.native), before);
  equal("quota rejected publication keeps head", inspectShape(await exact.lifecycle.inspect(APP)), await runNative(app("inspect", APP), exact.native));
  await create(exact, revisionRef, "quota-create");
  equal("quota exact replay does not charge", await ledger(exact.typescript), before);
  equal("quota exact native replay does not charge", await ledger(exact.native), before);

  const aggregate = await pair("quota-aggregate");
  await seedLedger(aggregate, ["a", "b", "c", "d"].map(application => ({ application, bytes: APPLICATION_QUOTA_LIMITS.applicationBytes })));
  const aggregateBefore = await ledger(aggregate.typescript), denied = command(revisionRef, "quota-aggregate-denied");
  await rejectQuota(aggregate, denied, "quota-aggregate-denied", "create");
  equal("quota aggregate rejection preserves TS ledger", await ledger(aggregate.typescript), aggregateBefore);
  equal("quota aggregate rejection preserves native ledger", await ledger(aggregate.native), aggregateBefore);
}
try {
  for (const step of steps) {
    // Native arguments are functions of the pre-step state; build them before
    // the TypeScript leg mutates head/memoryRef.
    const args = await step.native();
    if (step.fails) {
      const tsError: unknown = await step.ts().then(() => null, error => error ?? new Error("rejected"));
      const { code, stderr } = await runNativeAttempt(args);
      if (tsError === null || code !== 2) {
        console.error(`PARITY DIVERGENCE at "${step.name}": expected rejection — ts ${tsError === null ? "accepted" : "rejected"}, native exit ${code}`);
        process.exit(1);
      }
      if (step.reason !== undefined) {
        const tsMessage = tsError instanceof Error ? tsError.message : String(tsError);
        let nativeMessage: unknown;
        try { nativeMessage = (JSON.parse(stderr) as { error?: { message?: unknown } }).error?.message; } catch { nativeMessage = stderr; }
        if (tsMessage !== step.reason || nativeMessage !== step.reason) {
          console.error(`PARITY DIVERGENCE at "${step.name}": expected reason ${JSON.stringify(step.reason)}\n  ts:     ${JSON.stringify(tsMessage)}\n  native: ${JSON.stringify(nativeMessage)}`);
          process.exit(1);
        }
      }
      checked++;
      continue;
    }
    const tsOut = await step.ts();
    const nativeOut = await runNative(args);
    if (!same(tsOut, nativeOut)) {
      console.error(`PARITY DIVERGENCE at "${step.name}"`);
      console.error(`  ts:     ${canonicalize(tsOut as JsonValue)}`);
      console.error(`  native: ${canonicalize(nativeOut as JsonValue)}`);
      process.exit(1);
    }
    if (step.name === "dispatch-obsolete-episode") {
      const attempts = (tsOut as { dispatches: ApplicationDispatchAttempt[] }).dispatches;
      if (attempts.length !== 1 || attempts[0]?.status !== "denied") throw new Error("obsolete episode was not denied before execution");
    }
    if (step.name === "dispatch-episode") {
      const episode = (tsOut as { dispatches: ApplicationDispatchAttempt[] }).dispatches.find(d => d.status !== "denied" && d.plan.kind === "episode");
      if (!episode) throw new Error("no episode dispatch to reconcile");
      reconcileIntent = episode.intent;
    }
    if (step.name === "dispatch-blocked") {
      const episode = (tsOut as { dispatches: ApplicationDispatchAttempt[] }).dispatches.find(d => d.status !== "denied" && d.plan.kind === "episode");
      if (!episode || episode.status !== "blocked") throw new Error("no blocked episode dispatch");
      wedgeIntent = episode.intent;
    }
    checked++;
  }
  await checkEvidenceParity();
  await checkGoalAndQuotaParity();
} finally {
  await rm(temporary, { recursive: true, force: true });
}
console.log(`application parity: ${checked} steps identical across TypeScript and native`);
