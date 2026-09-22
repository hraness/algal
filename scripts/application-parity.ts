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
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { ApplicationService, type ApplicationDispatch, type ApplicationDispatchAttempt, type ApplicationSnapshot } from "../src/application";
import { applicationJson } from "../src/application-contract";
import {
  admitApplicationActivation, checkApplicationCompatibility, evaluateApplicationRevision, verifyApplicationEvaluation,
} from "../src/application-adaptation";
import { createApplicationDomainDispatcher, createApplicationPolicyHost } from "../src/application-host";
import { scheduleInvestigations, requestExecution } from "../src/application-investigation";
import { parseApplicationViewSpec, projectApplicationView } from "../src/application-view";
import { migrateApplicationMemory } from "../src/application-migration";
import { appendObservation } from "../src/application-observation";
import { ApplicationMemoryService } from "../src/application-memory";
import { NativeMemoryQueryEngine } from "../src/application-native-memory";
import { capabilityHandle } from "../src/capabilities";
import { builtinRegistry } from "../src/registry";
import { manifestToJson, parseOrganismManifest } from "../src/contract";
import { digestCanonical, type Digest } from "../src/digest";
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
  schema2, decoder2, procedure2, scope2, program2, query2, queries2, revision2, revision3, migrateRequest,
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
let reconcileIntent = "" as Digest;
let wedgeIntent = "" as Digest;
let evaluationRef = "" as Digest;
let migrationRef = "" as Digest;
let migratedSnapshotRef = "" as Digest;
let migrateCommand: { [key: string]: JsonValue } = {};

type Step = { name: string; ts: () => Promise<unknown>; native: () => Promise<string[]>; fails?: boolean };
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
for (const [name, value] of Object.entries({ procedure, query, queries, revision, raw, receipt, schema2, decoder2, procedure2, program2, query2, queries2, revision2, revision3 })) putStep(name, value as JsonValue);

const dynamic = async (name: string, value: JsonValue) => {
  const path = join(fixtureDir, `${name}.json`);
  await writeFile(path, canonicalize(value), "utf8");
  return path;
};
const app = (...args: string[]) => ["application", "--policy", fixturePath.get("policy")!, ...args];

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
    ts: async () => { const r = await memory.query(head, queryRef); derivationRef = r.ref; return { derivation: r.ref, status: r.derivation.status }; },
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
      const request = { contract: "algal.application-evaluation-request.v1", parentState: head, candidateRevision: revision2Ref, entrypoint: "run", cases: digests.evalCases, scorer: digests.evalScorer, policy: digests.evaluationPolicy };
      const r = await evaluateApplicationRevision(service.store, request, { fns: builtinRegistry() });
      evaluationRef = r.evaluationRef;
      return { evaluation: r.evaluationRef, verdict: r.evaluation.verdict };
    },
    native: async () => app("evaluate", await dynamic("eval-request", { contract: "algal.application-evaluation-request.v1", parentState: head, candidateRevision: revision2Ref, entrypoint: "run", cases: digests.evalCases, scorer: digests.evalScorer, policy: digests.evaluationPolicy })),
  },
  {
    name: "verify-evaluation",
    ts: async () => {
      const r = await verifyApplicationEvaluation(service.store, evaluationRef, head, { fns: builtinRegistry() });
      return { ok: true, verdict: r.verdict };
    },
    native: async () => app("verify-evaluation", await dynamic("verify-eval", { evaluation: evaluationRef, expectedState: head })),
  },
  {
    name: "admit-activation",
    ts: async () => admitApplicationActivation(service.store, { evaluation: evaluationRef, expectedState: head, revision: revision2Ref }, { fns: builtinRegistry() }),
    native: async () => app("admit-activation", await dynamic("admit", { evaluation: evaluationRef, expectedState: head, revision: revision2Ref })),
  },
  {
    name: "activate",
    ts: async () => {
      const s = await service.commit({ application: APP, operation: op("activate"), kind: "activate", expectedHead: head, revision: revision2Ref, memory: memoryRef, intents: [], evidence: [evaluationRef], causedBy: null });
      head = s.digest;
      return { state: s.digest, transition: s.state.transition, revision: s.state.revision, memory: s.state.memory };
    },
    native: async () => app("commit", await dynamic("activate", { application: APP, operation: op("activate"), kind: "activate", expectedHead: head, revision: revision2Ref, memory: memoryRef, intents: [], evidence: [evaluationRef], causedBy: null })),
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
);

const runNativeAttempt = async (args: string[]) => {
  const proc = Bun.spawn([binary, "--dir", nativeDir, ...args], { stdout: "pipe", stderr: "pipe" });
  const [stdout, stderr, code] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text(), proc.exited]);
  return { stdout, stderr, code };
};
const runNative = async (args: string[]) => {
  const { stdout, stderr, code } = await runNativeAttempt(args);
  if (code !== 0) throw new Error(`native ${args.join(" ")} failed (${code}): ${stderr.trim()}`);
  return JSON.parse(stdout) as unknown;
};

const same = (a: unknown, b: unknown) => canonicalize(a as JsonValue) === canonicalize(b as JsonValue);
let checked = 0;
try {
  for (const step of steps) {
    // Native arguments are functions of the pre-step state; build them before
    // the TypeScript leg mutates head/memoryRef.
    const args = await step.native();
    if (step.fails) {
      const tsRejected = await step.ts().then(() => false, () => true);
      const { code } = await runNativeAttempt(args);
      if (!tsRejected || code === 0) {
        console.error(`PARITY DIVERGENCE at "${step.name}": expected rejection — ts ${tsRejected ? "rejected" : "accepted"}, native exit ${code}`);
        process.exit(1);
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
} finally {
  await rm(temporary, { recursive: true, force: true });
}
console.log(`application parity: ${checked} steps identical across TypeScript and native`);
