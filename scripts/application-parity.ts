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
import { ApplicationService, type ApplicationDispatch, type ApplicationSnapshot } from "../src/application";
import { createApplicationPolicyHost } from "../src/application-host";
import { scheduleInvestigations, requestExecution } from "../src/application-investigation";
import { appendObservation } from "../src/application-observation";
import { ApplicationMemoryService } from "../src/application-memory";
import { NativeMemoryQueryEngine } from "../src/application-native-memory";
import { capabilityHandle } from "../src/capabilities";
import { manifestToJson, parseOrganismManifest } from "../src/contract";
import { digestCanonical, type Digest } from "../src/digest";
import { canonicalize, type JsonValue } from "../src/values";

const root = resolve(import.meta.dir, "..");
const binary = process.env.ALGAL_BIN ?? join(root, "target/debug/algal");
const binaryHex = createHash("sha256").update(await readFile(binary)).digest("hex");
const temporary = await mkdtemp(join(tmpdir(), "algal-app-parity-"));
const fixtureDir = join(temporary, "fixtures");
await mkdir(fixtureDir, { recursive: true });

const APP = "parity";
const LIMITS = { maxWork: 50_000, maxRounds: 32, maxDerived: 128, maxBindings: 128, maxRows: 16, maxOutputBytes: 262_144 };

// Content-addressed fixture values: digests are known before any store write.
const manifestValue = manifestToJson(parseOrganismManifest({
  contract: "algal.organism.v1", key: "organism:parity", name: "parity",
  interface: { inputs: { q: { cell: "src", port: "value" } }, outputs: { answer: { cell: "out", port: "value" } } },
  cells: [
    { id: "src", kind: "input", outputs: { value: "json" } },
    { id: "out", kind: "const", outputs: { value: { type: "json", value: "ok" } } },
  ], edges: [],
}));
const values = {
  manifest: manifestValue,
  schema: { contract: "algal.application-memory-schema.v1", relations: [{ name: "available", arity: 1 }] },
  decoder: { contract: "algal.parity-decoder.v1" },
  attestation: { contract: "algal.parity-attestation.v1" },
  hostProfile: { contract: "algal.parity-host-profile.v1" },
  views: { contract: "algal.application-view-spec.v1", title: "Parity", widgets: ["investigations", "memory", "procedures"] },
  runtimeProfile: { contract: "algal.application-runtime-profile.v1", runtime: "parity", policy: "pure-case-evaluation.v1" },
  evaluationPolicy: { contract: "algal.application-evaluation-policy.v1", maxCases: 8, maxWork: 1_000_000, maxModelCalls: 0, requireHoldoutPass: true, strictValidationImprovement: true },
  program: { contract: "algal.query.v1", rules: [], query: { relation: "available", terms: [{ var: "x" }, { var: "polarity" }] }, limits: LIMITS },
  frontier: { contract: "algal.application-memory-frontier.v1", application: APP, previous: null, sequence: 0, mutation: null, status: "settled" },
  episodeArgs: { contract: "algal.parity-episode-args.v1", q: "probe" },
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
const mailbox = capabilityHandle("mailbox-send", { fixture: "parity" });
const policy = {
  contract: "algal.application-host.v1", application: APP, frontier: digests.frontier,
  hostProfile: digests.hostProfile, episodeAccess: "observe", attestation: "algal.parity-attestation.v1",
  routes: [{ route: "investigate", recipient: mailbox, hostProfile: digests.hostProfile }],
  decoders: [{ decoder: digests.decoder, rawContract: "algal.parity-raw.v1", receiptContract: "algal.parity-receipt.v1" }],
};

// Input files shared by both legs.
const files: Record<string, JsonValue> = {
  ...values, procedure, query, queries, revision, scope, genesisMemory, raw, receipt, policy,
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
const host = createApplicationPolicyHost(policy, { channelsDir: join(tsDir, "channels") });
const engine = new NativeMemoryQueryEngine({ executable: binary, expectedSha256: binaryHex });
const service = new ApplicationService(tsDir, host);
const memory = new ApplicationMemoryService({ store: service.store, engine, admission: host });
const pendingRows = async () => {
  const history = await service.history(APP);
  const rows = await (service as unknown as { pending(h: unknown): Promise<{ intent: string; sourceState: string; dispatch: ApplicationDispatch | null }[]> }).pending(history);
  return { pending: rows.map(p => ({ intent: p.intent, sourceState: p.sourceState, dispatch: p.dispatch })) };
};

let head = "" as Digest;
let memoryRef = "" as Digest;
let derivationRef = "" as Digest;
let reconcileIntent = "" as Digest;

type Step = { name: string; ts: () => Promise<unknown>; native: () => Promise<string[]> };
const steps: Step[] = [];
const putStep = (name: string, value: JsonValue, kind: "values" | "manifests" = "values") =>
  steps.push({
    name: `put ${name}`,
    ts: async () => ({ ref: kind === "values" ? await service.store.putValue(value) : await service.store.putManifest(parseOrganismManifest(value)) }),
    native: async () => ["store", "put", fixturePath.get(name)!, "--kind", kind],
  });
putStep("manifest", manifestValue, "manifests");
for (const name of ["schema", "decoder", "attestation", "hostProfile", "views", "runtimeProfile", "evaluationPolicy", "program", "frontier", "episodeArgs"] as const) putStep(name, values[name]);
for (const [name, value] of Object.entries({ procedure, query, queries, revision, raw, receipt })) putStep(name, value as JsonValue);

const dynamic = async (name: string, value: JsonValue) => {
  const path = join(fixtureDir, `${name}.json`);
  await writeFile(path, canonicalize(value), "utf8");
  return path;
};
const app = (...args: string[]) => ["application", "--policy", fixturePath.get("policy")!, ...args];

steps.push(
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
      head = s.digest;
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
  { name: "dispatch", ts: async () => ({ dispatches: await service.dispatchPending(APP, host) }), native: async () => app("dispatch", APP) },
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
  {
    name: "query-supported",
    ts: async () => { const r = await memory.query(head, queryRef); derivationRef = r.ref; return { derivation: r.ref, status: r.derivation.status }; },
    native: async () => app("query", head, queryRef),
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
  { name: "dispatch-episode", ts: async () => ({ dispatches: await service.dispatchPending(APP, host) }), native: async () => app("dispatch", APP) },
  {
    name: "reconcile-episode",
    ts: async () => await service.reconcileDispatch(APP, reconcileIntent, host),
    native: async () => app("reconcile", APP, reconcileIntent),
  },
  { name: "inspect-final", ts: async () => inspectShape(await service.inspect(APP)), native: async () => app("inspect", APP) },
);

const runNative = async (args: string[]) => {
  const proc = Bun.spawn([binary, "--dir", nativeDir, ...args], { stdout: "pipe", stderr: "pipe" });
  const [stdout, stderr, code] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text(), proc.exited]);
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
    const tsOut = await step.ts();
    const nativeOut = await runNative(args);
    if (!same(tsOut, nativeOut)) {
      console.error(`PARITY DIVERGENCE at "${step.name}"`);
      console.error(`  ts:     ${canonicalize(tsOut as JsonValue)}`);
      console.error(`  native: ${canonicalize(nativeOut as JsonValue)}`);
      process.exit(1);
    }
    if (step.name === "dispatch-episode") {
      const blocked = (tsOut as { dispatches: ApplicationDispatch[] }).dispatches.find(d => d.status === "blocked");
      if (!blocked) throw new Error("no blocked dispatch to reconcile");
      reconcileIntent = blocked.intent;
    }
    checked++;
  }
} finally {
  await rm(temporary, { recursive: true, force: true });
}
console.log(`application parity: ${checked} steps identical across TypeScript and native`);
