// Shared fixture for the dependency report's application join: a small pure
// source project and an application whose history creates, evaluates,
// activates, and cites evaluation evidence for revisions built from it.
// Commits use a permissive trusted host so tests can also record evidence
// that the default policy host would refuse; the join must not trust it.
import { evaluateApplicationRevision } from "../application-adaptation";
import { produceApplicationComparison } from "../application-comparison";
import { applicationJson, type EpisodeBinding, type WorkIntent } from "../application-contract";
import {
  applicationProcessName,
  type ApplicationCore, type ApplicationDispatchContext, type ApplicationDispatchOutcome,
  type ApplicationDispatchPlan, type ApplicationSnapshot,
} from "../application-core";
import { APPLICATION_MEMORY_NATIVE_LIMITS } from "../application-memory";
import { manifestToJson, parseOrganismManifest } from "../contract";
import { digestCanonical, type Digest } from "../digest";
import { builtinRegistry } from "../registry";
import { runOrganism } from "../run";
import { compileSource } from "../source";
import type { Store } from "../store-contract";
import { asObject, type JsonValue } from "../values";

export const APPLICATION = "grades";
export const labelSource = `program label(score: json) -> json {
  budget { max_agent_calls: 0 }
  return if score > 2 { 1 } else { 0 }
}
`;
/** The report's entry: one call to the shared label helper. */
export const gradeSource = `import label from "./lib/label.algal"

program grade(q: json) -> json {
  budget { max_agent_calls: 0, max_depth: 1 }
  let graded = call label using { score: q.score }
  return graded
}
`;
export const gradeModules = { "lib/label.algal": labelSource };
const incumbentSource = `program grade(q: json) -> json {
  budget { max_agent_calls: 0 }
  return q.fallback
}
`;
const rivalSource = `import label from "./lib/label.algal"

program grade(q: json) -> json {
  budget { max_agent_calls: 0, max_depth: 1 }
  let graded = call label using { score: q.fallback }
  return graded
}
`;
const runtime = { fns: builtinRegistry() };
/** A trusted host that admits every structurally valid commit. */
export const permissive = { async admitCommit(): Promise<void> {} };
export const hash = (value: unknown): Digest => digestCanonical(applicationJson(value));
const auditManifest = parseOrganismManifest({
  contract: "algal.organism.v1", key: "organism:audit", name: "audit",
  interface: { inputs: { q: { cell: "src", port: "value" } }, outputs: { answer: { cell: "out", port: "out" } } },
  cells: [
    { id: "src", kind: "input", outputs: { value: "json" } },
    { id: "out", kind: "expr", inputs: { value: "json" }, expr: { contract: "algal.expr.v1", program: "ok" }, output: { kind: "json", schema: { type: "string" } } },
  ],
  edges: [{ from: { cell: "src", port: "value" }, to: { cell: "out", port: "value" } }],
});

/** Build the application in `core`'s store. History: state 0 creates R0
 * (flat entrypoints only), state 1 activates R1 (the report's root) with its
 * accepted evaluation, state 2 is a memory transition citing a comparison of
 * R2's rejected evaluation, an unbound forgery, an evaluation of a state
 * outside this history, and an unrelated note. */
export async function buildGradesApplication(core: ApplicationCore) {
  const store = core.store;
  const put = (value: unknown): Promise<Digest> => store.putValue(applicationJson(value));
  const grade = compileSource(gradeSource, { modules: gradeModules });
  const incumbent = compileSource(incumbentSource);
  const rival = compileSource(rivalSource, { modules: gradeModules });
  for (const compilation of [grade, incumbent, rival]) {
    for (const module of compilation.modules) await store.putManifest(module);
    await store.putManifest(compilation.manifest);
  }
  const audit = await store.putManifest(auditManifest);
  const label = grade.modules.find(module => module.name === "label");
  if (label === undefined) throw new Error("fixture label module is missing");
  const manifests = { grade: grade.sourceMap.manifestDigest, incumbent: incumbent.sourceMap.manifestDigest, rival: rival.sourceMap.manifestDigest, audit, label: digestCanonical(manifestToJson(label)) };

  const schema = await put({ contract: "algal.application-memory-schema.v1", relations: [{ name: "graded", arity: 1 }] });
  const program = await put({ contract: "algal.query.v1", rules: [], query: { relation: "graded", terms: [{ var: "x" }, { var: "polarity" }] }, limits: APPLICATION_MEMORY_NATIVE_LIMITS });
  const query = await put({ contract: "algal.application-memory-query.v1", id: "applicable", schema, program, procedures: [], polarityColumn: 1, conflict: "single-value" });
  const queries = await put({ contract: "algal.application-memory-queries.v1", queries: [query] });
  const views = await put({ contract: "algal.application-view-spec.v1", title: "Grades", widgets: ["procedures"] });
  const runtimeProfile = await put({ contract: "algal.application-runtime-profile.v1", runtime: "bun-native-memory", policy: "pure-case-evaluation.v1" });
  const evaluationPolicy = await put({ contract: "algal.application-evaluation-policy.v1", maxCases: 8, maxWork: 1_000_000, maxModelCalls: 0, requireHoldoutPass: true, strictValidationImprovement: true, composition: "closed-pure-v1" });
  const frontier = await put({ contract: "algal.application-memory-frontier.v1", application: APPLICATION, previous: null, sequence: 0, mutation: null, status: "settled" });
  const attestation = await put({ contract: "algal.fixture-attestation.v1" });
  const scope = await put({ contract: "algal.application-memory-scope.v1", application: APPLICATION, environment: "fixture", task: "grades", frontier, bindings: [], completeFor: [], attestation });
  const memory = await put({ contract: "algal.application-memory.v1", application: APPLICATION, schema, previous: null, scope, observations: [], hypotheses: [], withdrawn: [] });
  const entry = (name: string, manifest: Digest) => ({ name, manifest, applicability: query, maxGenerations: 1, capabilities: [], queries: [query] });
  const revisionBody = (parent: Digest | null, entrypoints: ReturnType<typeof entry>[]) => ({
    contract: "algal.application-revision.v1", application: APPLICATION, parent, schema, queries, views, runtimeProfile, evaluationPolicy, capabilityRequirements: [], entrypoints,
  });
  const cases = await put({ contract: "algal.application-evaluation-cases.v1", cases: [
    { id: "train-high", split: "train", args: { q: { score: 5, fallback: 1 } }, expect: { result: 1 } },
    { id: "validation-low", split: "validation", args: { q: { score: 1, fallback: 0 } }, expect: { result: 0 } },
    { id: "validation-edge", split: "validation", args: { q: { score: 3, fallback: 0 } }, expect: { result: 1 } },
    { id: "holdout-high", split: "holdout", args: { q: { score: 4, fallback: 0 } }, expect: { result: 1 } },
  ] });
  const scorer = await put({ contract: "algal.application-evaluation-scorer.v1", scorer: null });
  const request = (parentState: Digest, candidateRevision: Digest) => ({ contract: "algal.application-evaluation-request.v1", parentState, candidateRevision, entrypoint: "run", cases, scorer, policy: evaluationPolicy, environment: "lab" });
  let operations = 0;
  const commit = (kind: "create" | "activate" | "memory", expectedHead: Digest | null, revision: Digest, evidence: Digest[]): Promise<ApplicationSnapshot> =>
    core.commit({ application: APPLICATION, operation: hash({ fixture: "operation", sequence: operations++ }), kind, expectedHead, revision, memory, intents: [], evidence: [...evidence].sort(), causedBy: null });

  const r0 = await put(revisionBody(null, [entry("audit", audit), entry("run", manifests.incumbent)]));
  const genesis = await commit("create", null, r0, []);
  const r1 = await put(revisionBody(r0, [entry("audit", audit), entry("run", manifests.grade)]));
  const accepted = await evaluateApplicationRevision(store, request(genesis.digest, r1), runtime);
  if (accepted.evaluation.verdict.status !== "accepted") throw new Error(`fixture evaluation was ${accepted.evaluation.verdict.status}`);
  const activated = await commit("activate", genesis.digest, r1, [accepted.evaluationRef]);
  const r2 = await put(revisionBody(r1, [entry("audit", audit), entry("run", manifests.rival)]));
  const rejected = await evaluateApplicationRevision(store, request(activated.digest, r2), runtime);
  if (rejected.evaluation.verdict.status !== "rejected") throw new Error(`fixture evaluation was ${rejected.evaluation.verdict.status}`);
  const comparison = await produceApplicationComparison(store, { application: APPLICATION, parentState: activated.digest, entrypoint: "run", environment: "lab", evaluations: [rejected.evaluationRef], selected: null }, runtime);
  // A forgery that no longer binds its own request, and a self-consistent
  // evaluation of a state this application never committed.
  const unbound = await put({ ...accepted.evaluation, candidateRevision: r2 });
  const foreignState = hash({ contract: "algal.fixture-foreign-state.v1" });
  const foreignRequest = await put({ ...request(genesis.digest, r1), parentState: foreignState });
  const foreign = await put({ ...accepted.evaluation, request: foreignRequest, parentState: foreignState });
  const note = await put({ contract: "algal.fixture-note.v1", text: "context only" });
  const noted = await commit("memory", activated.digest, r1, [comparison.comparisonRef, unbound, foreign, note]);
  return {
    core, store, put, commit, entry, revisionBody, request, manifests, memory, evaluationPolicy, cases, scorer,
    states: { genesis, activated, noted }, revisions: { r0, r1, r2 },
    evaluations: { accepted: accepted.evaluationRef, rejected: rejected.evaluationRef, unbound, foreign, acceptedRecord: accepted.evaluation },
    evidence: { comparison: comparison.comparisonRef, note },
  };
}
export type GradesApplication = Awaited<ReturnType<typeof buildGradesApplication>>;

const EPISODE_HOST_PROFILE = hash({ fixture: "episode host profile" });
/** The episode binding a faithful dispatcher admits for a `start-episode`
 * intent committed in `snapshot` — exactly the fields dispatch admission pins. */
export function episodeBinding(snapshot: ApplicationSnapshot, intent: Digest, entrypoint: string, input: Digest): EpisodeBinding {
  const entry = snapshot.revision.entrypoints.find(e => e.name === entrypoint);
  if (entry === undefined) throw new Error(`no entrypoint ${entrypoint}`);
  return {
    contract: "algal.application-episode.v1", application: APPLICATION, intent, sourceState: snapshot.digest,
    revision: snapshot.state.revision, memory: snapshot.state.memory, epoch: snapshot.state.epoch,
    entrypoint: entry.name, manifest: entry.manifest, arguments: input,
    process: applicationProcessName(APPLICATION, intent), maxGenerations: entry.maxGenerations,
    hostProfile: EPISODE_HOST_PROFILE, access: "observe",
  };
}
/** An admission that admits every commit and plans each `start-episode`
 * intent with exactly the binding `episodeBinding` computes. */
export const episodeAdmission = {
  async admitCommit(): Promise<void> {},
  async admitDispatch({ snapshot, intent }: { snapshot: ApplicationSnapshot; intent: WorkIntent }): Promise<ApplicationDispatchPlan> {
    if (intent.kind !== "start-episode") throw new Error("fixture admits only start-episode intents");
    const ref = digestCanonical(applicationJson(intent));
    return { kind: "episode", binding: episodeBinding(snapshot, ref, intent.entrypoint, intent.input) };
  },
};
/** Commit one memory transition carrying `start-episode` intents at the current head. */
export async function commitEpisodes(fixture: GradesApplication, intents: readonly { readonly entrypoint?: string; readonly input: Digest }[]): Promise<ApplicationSnapshot> {
  const head = (await fixture.core.inspect(APPLICATION))!;
  return fixture.core.commit({
    application: APPLICATION, operation: hash({ fixture: "episode intents", head: head.digest, count: intents.length }),
    kind: "memory", expectedHead: head.digest, revision: head.state.revision, memory: head.state.memory,
    intents: intents.map(intent => ({ kind: "start-episode" as const, entrypoint: intent.entrypoint ?? "run", input: intent.input })),
    evidence: [], causedBy: null,
  });
}
/** Settle one episode dispatch the way `dispatchApplicationEpisode` records
 * it: run the bound manifest, retain the run receipt, and settle with an
 * `algal.episode-outcome.v2` record naming it. The dispatcher is the host
 * seam; the dependency join only reads the retained records. */
export async function settleEpisode(context: ApplicationDispatchContext, store: Store): Promise<ApplicationDispatchOutcome> {
  const plan = context.dispatch.plan;
  if (plan.kind !== "episode") throw new Error("expected an episode plan");
  const binding = plan.binding;
  const manifest = await store.getManifest(binding.manifest);
  if (manifest === undefined) throw new Error("episode manifest missing");
  const args = asObject(await store.getValue(binding.arguments), "episode arguments") as Record<string, Record<string, JsonValue>>;
  const receipt = await runOrganism({ manifest, args, store, fns: builtinRegistry(), executors: [] });
  const receiptRef = await store.putReceipt(receipt as unknown as JsonValue);
  const bindingRef = hash(binding);
  const outcome = await store.putValue(applicationJson({
    contract: "algal.episode-outcome.v2", binding: bindingRef,
    processState: hash({ fixture: "process state", receipt: receiptRef }), receipt: receiptRef,
  }));
  return { status: "settled", result: { kind: "episode", binding: bindingRef, process: binding.process, outcome } };
}
/** Dispatch every pending intent once, settling each with `dispatch` (a real
 * episode run by default). */
export async function settlePendingEpisodes(fixture: GradesApplication, dispatch?: (context: ApplicationDispatchContext) => Promise<ApplicationDispatchOutcome>) {
  return fixture.core.dispatchPending(APPLICATION, {
    configurationDigest: hash({ fixture: "episode dispatcher" }),
    dispatch: dispatch ?? (context => settleEpisode(context, fixture.store)),
  });
}
/** A fabricated evaluation that binds its request, parent, and policy without
 * any foundry run; the join reports it as recorded because it never replays. */
export async function fabricateEvaluation(fixture: GradesApplication, parentState: Digest, candidateRevision: Digest, salt: JsonValue = null): Promise<Digest> {
  const request = await fixture.put(fixture.request(parentState, candidateRevision));
  return fixture.put({
    contract: "algal.application-evaluation.v1", request, parentState, candidateRevision, cases: fixture.cases, scorer: fixture.scorer, policy: fixture.evaluationPolicy,
    foundryReport: hash({ fabricated: "report", salt }), compatibility: hash({ fabricated: "compatibility", salt }), verdict: { status: "accepted", selectedManifest: hash({ fabricated: "manifest", salt }) },
  });
}
