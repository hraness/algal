/** Bounded, host-evaluated application research; models have no write authority. */
import { generateKeyPairSync, sign, verify, createPublicKey } from "node:crypto";
import { mkdir, open, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { ApplicationService } from "../../src/application";
import { applicationJson, applicationObject, applicationRef } from "../../src/application-contract";
import { createApplicationPolicyHost } from "../../src/application-host";
import { ApplicationMemoryService, APPLICATION_MEMORY_NATIVE_LIMITS, type MemoryQueryEngine } from "../../src/application-memory";
import { admitApplicationResearchEvaluation, verifyApplicationResearchEvaluation, type ApplicationResearchAttempt, type ApplicationResearchVerifier } from "../../src/application-research";
import { manifestToJson, parseOrganismManifest, type OrganismManifest } from "../../src/contract";
import { digestCanonical, type Digest } from "../../src/digest";
import type { Executor } from "../../src/effects";
import { hostRead, hostWrite } from "../../src/host-state";
import { builtinRegistry } from "../../src/registry";
import { parseRunReceipt, runOrganism, type RunReceipt } from "../../src/run";
import { FileStore, type Store } from "../../src/store";
import { verifyReceipt } from "../../src/verify";
import { canonicalize, type JsonValue } from "../../src/values";
import { ROUTE_CASES, type RouteCase } from "./corpus";

const json = applicationJson;
export const hash = (value: unknown): Digest => digestCanonical(json(value));
function ensure(value: unknown, message: string): asserts value { if (!value) throw new Error(message); }
const equal = (a: unknown, b: unknown) => hash(a) === hash(b);
export type Mode = "structured-facts" | "derived-answers";
type Role = "incumbent" | "candidate";
const APP = "route-research";
const BOUNDS = { maxContextBytes: 16384, maxOutputBytes: 2048, maxEffectMs: 120000 };
export const ANSWER_PROMPT = "Using only the directed warehouse routes in data.edges, return every location reachable from data.start by one or more directed edges. Follow edges in their stated direction. Include the start only if a directed cycle reaches it. Ignore disconnected locations. Return a sorted unique array of location names, with no explanation. If data.derivedAnswers is supplied, it is the locally verified positive Datalog closure over exactly these same source edges; it supplies no additional source facts.";
const PROPOSAL_PROMPT = "Propose one bounded pure context strategy for answering directed warehouse-route reachability questions. You see development cases only. Choose structured-facts or derived-answers. Both retain identical structured source facts, answer instructions, model and limits; derived-answers additionally supplies verified positive Datalog query answers over those facts. Select the strategy you expect to preserve answer quality. Return only {mode,rationale}; no code, authority, policy changes, new facts, or new instructions.";

export type StudyPlan = {
  contract: "algal.route-study-plan.v1"; study: "synthetic-routes-v1";
  provenance: "live" | "fixture"; model: string; engine: Digest; executorConfiguration: Digest;
  corpus: Digest; harness: Digest; maxCalls: 17; maxAttemptsPerCase: 1;
  maxCostMicrousd: number; reserveMicrousdPerCall: number;
  criteria: string[];
};
const CRITERIA = ["exact-sorted-unique-answer", "no-per-case-quality-regression", "strict-development-improvement", "all-holdouts-pass", "no-uncertain-or-incomplete-attempts", "all-attempt-resource-accounting", "proposal-frozen-before-evaluation", "same-source-same-prompt-paired-ablation"];

export function answerManifest(): OrganismManifest {
  return parseOrganismManifest({ contract: "algal.organism.v1", key: "organism:route-answer", name: "Route answer", budgets: { maxSteps: 4, maxAgentCalls: 1, maxWork: 100000 },
    interface: { inputs: { data: { cell: "source", port: "data" } }, outputs: { answer: { cell: "model", port: "out" } } },
    cells: [{ id: "source", kind: "input", outputs: { data: "json" } }, { id: "model", kind: "agent", inputs: { data: "json" }, prompt: ANSWER_PROMPT, view: { inputs: ["data"] }, output: { kind: "json", schema: { type: "array", items: { type: "string", maxLength: 32 }, maxItems: 16 } }, budget: BOUNDS }],
    edges: [{ from: { cell: "source", port: "data" }, to: { cell: "model", port: "data" } }] });
}
export function proposalManifest(): OrganismManifest {
  const base = manifestToJson(answerManifest()) as Record<string, JsonValue>;
  return parseOrganismManifest({ ...base, key: "organism:route-proposal", name: "Development-only proposal",
    cells: [{ id: "source", kind: "input", outputs: { data: "json" } }, { id: "model", kind: "agent", inputs: { data: "json" }, prompt: PROPOSAL_PROMPT, view: { inputs: ["data"] }, output: { kind: "json", schema: { type: "object", additionalProperties: false, required: ["mode", "rationale"], properties: { mode: { type: "string", enum: ["structured-facts", "derived-answers"] }, rationale: { type: "string", maxLength: 768 } } } }, budget: BOUNDS }] });
}
export function strategyManifest(mode: Mode): OrganismManifest {
  return parseOrganismManifest({ contract: "algal.organism.v1", key: "organism:route-strategy", name: "Pure route context strategy", interface: { inputs: {}, outputs: { strategy: { cell: "out", port: "value" } } }, cells: [{ id: "out", kind: "const", outputs: { value: { type: "json", value: { mode } } } }], edges: [] });
}
function harness() { return { contract: "algal.route-study-harness.v1", version: 1, answer: manifestToJson(answerManifest()), proposer: manifestToJson(proposalManifest()), modes: ["structured-facts", "derived-answers"], criteria: CRITERIA, limits: APPLICATION_MEMORY_NATIVE_LIMITS }; }
export function makePlan(input: Pick<StudyPlan, "provenance" | "model" | "engine" | "executorConfiguration" | "maxCostMicrousd" | "reserveMicrousdPerCall">): StudyPlan {
  ensure(input.provenance === "live" || input.provenance === "fixture", "Unknown study provenance");
  ensure(typeof input.model === "string" && /^[a-z0-9][a-z0-9._/-]{0,127}$/i.test(input.model), "Invalid model identity");
  applicationRef(input.engine); applicationRef(input.executorConfiguration);
  for (const n of [input.maxCostMicrousd, input.reserveMicrousdPerCall]) ensure(Number.isSafeInteger(n) && n > 0 && n <= 20_000_000, "Budget must be 1..20,000,000 microUSD");
  ensure(input.maxCostMicrousd >= 17 * input.reserveMicrousdPerCall, "Budget cannot cover every planned reservation");
  return { contract: "algal.route-study-plan.v1", study: "synthetic-routes-v1", ...input, corpus: hash(ROUTE_CASES), harness: hash(harness()), maxCalls: 17, maxAttemptsPerCase: 1, criteria: [...CRITERIA] };
}
function parsePlan(value: unknown): StudyPlan {
  const v = applicationObject(value, ["contract", "study", "provenance", "model", "engine", "executorConfiguration", "corpus", "harness", "maxCalls", "maxAttemptsPerCase", "maxCostMicrousd", "reserveMicrousdPerCall", "criteria"]);
  const plan = makePlan({ provenance: v.provenance as StudyPlan["provenance"], model: v.model as string, engine: applicationRef(v.engine), executorConfiguration: applicationRef(v.executorConfiguration), maxCostMicrousd: v.maxCostMicrousd as number, reserveMicrousdPerCall: v.reserveMicrousdPerCall as number });
  ensure(equal(value, plan), "Frozen plan differs from this study implementation");
  return plan;
}
export async function prepareStudy(root: string, plan: StudyPlan): Promise<Digest> {
  parsePlan(plan);
  await mkdir(root, { mode: 0o700 });
  await writeFile(join(root, "plan.json"), canonicalize(json(plan)) + "\n", { flag: "wx", mode: 0o600 });
  return hash(plan);
}
export async function readPlan(root: string): Promise<StudyPlan> { return parsePlan(await hostRead(join(root, "plan.json"), 16384)); }
export function developmentInput(): JsonValue { return json({ development: ROUTE_CASES.filter(row => row.split === "development"), choices: ["structured-facts", "derived-answers"] }); }
export function queryInput(row: RouteCase): { snapshot: JsonValue; program: JsonValue } {
  const snapshot = json({ contract: "algal.memory.v1", facts: row.edges.map(tuple => ({ relation: "edge", tuple, sources: [hash({ id: row.id, edges: row.edges })] })) });
  const variable = (name: string) => ({ var: name });
  const literal = (relation: string, terms: unknown[]) => ({ relation, terms });
  const program = json({ contract: "algal.query.v1", rules: [
    { id: "direct", head: literal("reachable", [variable("x"), variable("y")]), body: [literal("edge", [variable("x"), variable("y")])] },
    { id: "transitive", head: literal("reachable", [variable("x"), variable("z")]), body: [literal("reachable", [variable("x"), variable("y")]), literal("edge", [variable("y"), variable("z")])] },
  ], query: literal("reachable", [row.start, variable("target")]), limits: APPLICATION_MEMORY_NATIVE_LIMITS });
  return { snapshot, program };
}
function derivedAnswers(result: JsonValue): JsonValue {
  const v = applicationObject(result, ["contract", "snapshot", "program", "complete", "witnessPolicy", "rows", "proofs", "work", "rounds", "baseFacts", "derivedFacts"]);
  ensure(v.contract === "algal.query-result.v1" && v.complete === true && Array.isArray(v.rows) && v.rows.length <= 16, "Incomplete or invalid Datalog result");
  return v.rows.map(value => { const row = applicationObject(value, ["tuple", "proof"]); applicationRef(row.proof); ensure(Array.isArray(row.tuple) && row.tuple.length === 2 && row.tuple.every(v => typeof v === "string"), "Invalid route answer tuple"); return row.tuple[1]!; }).sort();
}
export function answerInput(row: RouteCase, role: Role, result: JsonValue): JsonValue {
  return json({ id: row.id, start: row.start, edges: row.edges, ...(role === "candidate" ? { derivedAnswers: derivedAnswers(result) } : {}) });
}
export function exactAnswer(output: unknown, expected: string[]): boolean { return Array.isArray(output) && equal(output, expected); }
function proposedMode(receipt: RunReceipt): Mode | null {
  if (receipt.outcome !== "complete") return null;
  try { const value = applicationObject(receipt.cells.model?.outputs?.out, ["mode", "rationale"]); ensure(typeof value.rationale === "string" && value.rationale.length <= 768, "Invalid rationale"); return value.mode === "derived-answers" || value.mode === "structured-facts" ? value.mode : null; } catch { return null; }
}
type QueryEvidence = { caseId: string; snapshot: Digest; program: Digest; result: Digest };
type AnswerEvidence = { caseId: string; role: Role; run: Digest };
type Journal = { contract: "algal.route-study-journal.v1"; plan: Digest; proposal: Digest; freeze: Digest; queries: QueryEvidence[]; answers: AnswerEvidence[]; events: JsonValue[]; accounting: Digest };
export type StudySummary = { contract: "algal.route-study-result.v1"; plan: Digest; evaluator: Digest; journal: Digest; proposalMode: Mode | null; evaluation: Digest | null; verdict: string; reasons: string[]; parentState: Digest; finalState: Digest; activated: boolean; quality: { incumbent: number; candidate: number; cases: number }; provenance: "fixture" | "live"; accounting: Digest; pendingAnswers: number; seal: Digest };

async function value(store: Pick<Store, "getValue">, ref: Digest): Promise<JsonValue> { const v = await store.getValue(ref); ensure(v !== undefined, "Missing retained value"); return v; }
async function receipt(store: Store, ref: Digest, expectedManifest: OrganismManifest, expectedInput: JsonValue, plan: StudyPlan): Promise<RunReceipt> {
  const raw = await value(store, ref), run = parseRunReceipt(raw);
  ensure(equal(run.args, { source: { data: expectedInput } }), "Receipt input differs from frozen protocol");
  ensure((await verifyReceipt(raw, manifestToJson(expectedManifest), store)).ok, "Study run receipt failed offline replay");
  ensure(run.effects.length <= 1 && run.work.agentCalls <= 1, "Unexpected retry or extra model call");
  ensure(run.effects.every(effect => effect.configurationDigest === plan.executorConfiguration), "Effect used another executor configuration");
  return run;
}
function attempt(row: RouteCase, role: Role, run: RunReceipt, runRef: Digest, proposal: RunReceipt, nativeWork: number): ApplicationResearchAttempt {
  const chargeProposal = role === "candidate" && row.id === ROUTE_CASES[0]!.id;
  // Every failed dispatch is conservatively uncertain; no automatic retry or
  // silent omission. Candidate accounting includes the one proposal call.
  return { caseId: row.id, role, attempt: 1, outcome: run.outcome === "complete" ? "complete" : "uncertain", passed: run.outcome === "complete" && exactAnswer(run.cells.model?.outputs?.out, row.expected), work: run.work.units + (role === "candidate" ? nativeWork : 0) + (chargeProposal ? proposal.work.units : 0), modelCalls: run.work.agentCalls + (chargeProposal ? proposal.work.agentCalls : 0), receipt: runRef };
}
function meter(runs: RunReceipt[]) {
  return { calls: runs.reduce((n, row) => n + row.work.agentCalls, 0), tokensIn: runs.reduce((n, row) => n + row.effects.reduce((sum, effect) => sum + (effect.usage?.tokensIn ?? 0), 0), 0), tokensOut: runs.reduce((n, row) => n + row.effects.reduce((sum, effect) => sum + (effect.usage?.tokensOut ?? 0), 0), 0), missingUsage: runs.reduce((n, row) => n + row.effects.filter(effect => effect.usage?.tokensIn === undefined || effect.usage?.tokensOut === undefined).length, 0) };
}

/** Verifier authority comes from the caller's pinned fingerprint, never from
 * the model, journal, public key, or a successful deterministic replay. */
export function studyVerifier(store: Store, engine: MemoryQueryEngine, trustedEvaluator: Digest): ApplicationResearchVerifier {
  return { identity: trustedEvaluator, async verify(context) {
    try {
      const evaluator = applicationObject(await value(store, trustedEvaluator), ["contract", "publicKey", "plan"]);
      ensure(evaluator.contract === "algal.route-study-evaluator.v1" && typeof evaluator.publicKey === "string", "Invalid evaluator");
      const plan = parsePlan(await value(store, applicationRef(evaluator.plan)));
      ensure(plan.engine === engine.identity, "Native engine identity differs from plan");
      const seal = applicationObject(context.seal, ["request", "report", "journal", "signature"]);
      const payload = { request: hash(context.request), report: hash(context.report), journal: context.report.attemptJournal };
      ensure(equal({ request: seal.request, report: seal.report, journal: seal.journal }, payload) && typeof seal.signature === "string", "Wrong seal binding");
      const key = createPublicKey({ key: Buffer.from(evaluator.publicKey, "base64"), format: "der", type: "spki" });
      ensure(verify(null, Buffer.from(canonicalize(payload)), key, Buffer.from(seal.signature, "base64")), "Invalid evaluator signature");
      const checked = await checkJournal(store, engine, context.report.attemptJournal, plan);
      ensure(checked.mode === "derived-answers", "Proposal did not select the changed strategy");
      ensure(equal(checked.attempts, context.report.attempts), "Report omits or rewrites attempts");
      ensure(context.researchPolicy.harness === plan.harness, "Harness differs from frozen plan");
      const corpus = await value(store, context.researchPolicy.corpus);
      ensure(equal(corpus, corpusRecord()), "Research corpus differs from authored frozen cases");
      const incumbent = context.incumbentRevision.entrypoints.find(entry => entry.name === "strategy"), candidate = context.candidateRevision.entrypoints.find(entry => entry.name === "strategy");
      ensure(incumbent?.manifest === hash(manifestToJson(strategyManifest("structured-facts"))) && candidate?.manifest === hash(manifestToJson(strategyManifest("derived-answers"))), "Strategy was not compiled from admitted proposal");
      return true;
    } catch { return false; }
  } };
}

async function checkJournal(store: Store, engine: MemoryQueryEngine, reference: Digest, plan: StudyPlan) {
  const raw = await value(store, reference);
  applicationObject(raw, ["contract", "plan", "proposal", "freeze", "queries", "answers", "events", "accounting"]);
  const journal = raw as unknown as Journal;
  ensure(journal.contract === "algal.route-study-journal.v1" && journal.plan === hash(plan), "Wrong journal plan");
  ensure(Array.isArray(journal.queries) && Array.isArray(journal.answers) && journal.answers.length <= 16 && journal.queries.length === Math.ceil(journal.answers.length / 2), "Incomplete or extra attempts");
  const proposal = await receipt(store, journal.proposal, proposalManifest(), developmentInput(), plan), mode = proposedMode(proposal);
  ensure(equal(await value(store, journal.freeze), { contract: "algal.route-study-freeze.v1", plan: hash(plan), proposal: journal.proposal, mode, candidate: mode === "derived-answers" ? hash(manifestToJson(strategyManifest(mode))) : null }), "Proposal freeze mismatch");
  const expectedEvents: JsonValue[] = [json({ kind: "proposal-intent", plan: hash(plan) }), json({ kind: "proposal-result", receipt: journal.proposal }), json({ kind: "freeze", record: journal.freeze })];
  const attempts: ApplicationResearchAttempt[] = [], runs = [proposal];
  for (let index = 0; index < journal.queries.length; index++) {
    const row = ROUTE_CASES[index]!, query = journal.queries[index]!, expected = queryInput(row);
    ensure(query.caseId === row.id && query.snapshot === hash(expected.snapshot) && query.program === hash(expected.program), "Query sources differ from frozen case");
    const result = await value(store, query.result);
    ensure(equal(await value(store, query.snapshot), expected.snapshot) && equal(await value(store, query.program), expected.program) && await engine.verify(expected.snapshot, expected.program, result), "Datalog witness did not verify");
    ensure(exactAnswer(derivedAnswers(result), row.expected), "Authored oracle disagrees with native query");
    for (const [offset, role] of (["incumbent", "candidate"] as const).entries()) {
      const answer = journal.answers[index * 2 + offset]!;
      if (!answer) break;
      ensure(answer.caseId === row.id && answer.role === role, "Attempt order differs from frozen paired protocol");
      const input = answerInput(row, role, result), run = await receipt(store, answer.run, answerManifest(), input, plan);
      expectedEvents.push(json({ kind: "answer-intent", caseId: row.id, role, input: hash(input), freeze: journal.freeze }), json({ kind: "answer-result", caseId: row.id, role, receipt: answer.run }));
      const work = (result as { work: number }).work; ensure(Number.isSafeInteger(work) && work >= 0 && work <= 50_000, "Invalid native work");
      attempts.push(attempt(row, role, run, answer.run, proposal, work)); runs.push(run);
    }
  }
  ensure(equal(journal.events, expectedEvents), "Missing, reordered, or hidden attempted calls");
  const accounting = applicationObject(await value(store, journal.accounting), ["contract", "meter", "provider", "maxCostMicrousd", "reserveMicrousdPerCall", "costMeaning"]);
  ensure(equal(accounting.meter, meter(runs)) && accounting.maxCostMicrousd === plan.maxCostMicrousd && accounting.reserveMicrousdPerCall === plan.reserveMicrousdPerCall && accounting.costMeaning === "reservation-ceiling-not-settled-provider-charge", "Accounting mismatch");
  if (plan.provenance === "live") {
    const provider = applicationObject(accounting.provider, ["schema", "configurationDigest", "calls", "completedCalls", "reservedMicrousd", "inputTokens", "outputTokens", "costUsd", "billing", "stopped", "records"]);
    ensure(provider.schema === "algal.inference-accounting.v1" && provider.configurationDigest === plan.executorConfiguration && Array.isArray(provider.records) && provider.records.length <= 17, "Provider ledger configuration differs from plan");
    const effects = runs.flatMap(run => run.effects);
    ensure(provider.records.length === effects.length || (provider.records.length === effects.length - 1 && effects.at(-1)?.error), "Ledger omits attempted calls");
    let completed = 0;
    const inputCounts: (number | null)[] = [], outputCounts: (number | null)[] = [];
    for (const [index, raw] of provider.records.entries()) {
      const record = applicationObject(raw, ["sequence", "requestDigest", "status", "reservedMicrousd", "tokensIn", "tokensOut", "outputDigest"]), effect = effects[index]!;
      ensure(record.sequence === index + 1 && record.requestDigest === effect.requestDigest && record.reservedMicrousd === plan.reserveMicrousdPerCall, "Ledger request or reservation differs from receipt");
      for (const count of [record.tokensIn, record.tokensOut]) ensure(count === null || (typeof count === "number" && Number.isSafeInteger(count) && count >= 0 && count <= 1_000_000_000), "Invalid ledger token count");
      inputCounts.push(record.tokensIn as number | null); outputCounts.push(record.tokensOut as number | null);
      if (record.status === "completed") { completed++; ensure(effect.output !== undefined && record.outputDigest === hash(effect.output) && record.tokensIn === effect.usage?.tokensIn && record.tokensOut === effect.usage?.tokensOut, "Settled ledger differs from effect output/usage"); }
      else ensure(index === provider.records.length - 1 && (record.status === "unknown" || record.status === "reserved") && record.outputDigest === null && effect.error !== undefined, "Invalid unsettled ledger entry");
    }
    const total = (counts: (number | null)[]): number | null => counts.includes(null) ? null : counts.reduce<number>((sum, count) => sum + count!, 0);
    ensure(provider.inputTokens === total(inputCounts) && provider.outputTokens === total(outputCounts), "Ledger aggregate token usage differs");
    ensure(provider.calls === provider.records.length && provider.completedCalls === completed && provider.reservedMicrousd === provider.records.length * plan.reserveMicrousdPerCall && (provider.reservedMicrousd as number) <= plan.maxCostMicrousd && provider.stopped === (completed !== provider.records.length) && provider.costUsd === null && provider.billing === "host-reserved", "Ledger aggregate accounting differs");
  }
  const incomplete = journal.answers.length < 16;
  ensure(!incomplete || runs.at(-1)?.outcome !== "complete", "Incomplete journal has no failed terminal attempt");
  ensure(runs.slice(0, -1).every(run => run.outcome === "complete"), "Study dispatched after an uncertain completion");
  return { attempts, mode, journal, incomplete };
}

function corpusRecord() {
  return { contract: "algal.application-research-corpus.v1", cases: ROUTE_CASES.map(row => ({ id: row.id, split: row.split, task: hash({ id: row.id, start: row.start, expected: row.expected }), sources: hash({ edges: row.edges }) })) };
}

export async function runStudy(root: string, options: { executor: Executor; engine: MemoryQueryEngine; accounting: () => Promise<JsonValue> }): Promise<StudySummary> {
  const plan = await readPlan(root); ensure(plan.engine === options.engine.identity, "Engine differs from frozen plan");
  ensure(options.executor.cacheIdentity === plan.executorConfiguration, "Executor differs from frozen plan");
  // wx refuses a second run, including after a crash with uncertain inference.
  const log = await open(join(root, "run-intent.json"), "wx", 0o600);
  await log.write(canonicalize({ plan: hash(plan) })); await log.sync();
  const events: JsonValue[] = [];
  const record = async (event: unknown) => { events.push(json(event)); await hostWrite(join(root, "attempts.json"), json(events), 65536, false); };
  const serviceRoot = join(root, "application");
  const bootstrap = new ApplicationService(serviceRoot, { async admitCommit() { throw new Error("Bootstrap cannot mutate application"); } }), store = bootstrap.store;
  const put = (v: unknown) => store.putValue(json(v));
  try {
    await put(plan); await put(harness());
    const keys = generateKeyPairSync("ed25519");
    const evaluator = await put({ contract: "algal.route-study-evaluator.v1", publicKey: keys.publicKey.export({ format: "der", type: "spki" }).toString("base64"), plan: hash(plan) });
    await writeFile(join(root, "trusted-evaluator.json"), canonicalize({ evaluator, plan: hash(plan) }) + "\n", { flag: "wx", mode: 0o600 });
    const verifier = studyVerifier(store, options.engine, evaluator);
    for (const row of ROUTE_CASES) { await put({ id: row.id, start: row.start, expected: row.expected }); await put({ edges: row.edges }); }
    const corpus = await put(corpusRecord());
    const research = await put({ contract: "algal.application-research-policy.v1", evaluator, harness: plan.harness, corpus, strategyEntrypoints: ["strategy"], maxAttemptsPerCase: 1 });
    const evaluationPolicy = await put({ contract: "algal.application-evaluation-policy.v1", maxCases: 8, maxWork: 1_000_000, maxModelCalls: 9, requireHoldoutPass: true, strictValidationImprovement: true, research });
    const schema = await put({ contract: "algal.application-memory-schema.v1", relations: [{ name: "available", arity: 1 }] });
    const program = await put({ contract: "algal.query.v1", rules: [], query: { relation: "available", terms: [{ var: "x" }, { var: "polarity" }] }, limits: APPLICATION_MEMORY_NATIVE_LIMITS });
    const query = await put({ contract: "algal.application-memory-query.v1", id: "ready", schema, program, procedures: [], polarityColumn: 1, conflict: "set-of-values" });
    const queries = await put({ contract: "algal.application-memory-queries.v1", queries: [query] });
    const views = await put({ contract: "algal.application-view-spec.v1", title: "Controlled route study", widgets: ["memory"] });
    const runtimeProfile = await put({ contract: "algal.application-runtime-profile.v1", runtime: "bun-native-memory", policy: "sealed-research-evaluation.v1" });
    const frontier = await put({ contract: "algal.application-memory-frontier.v1", application: APP, previous: null, sequence: 0, mutation: null, status: "settled" });
    const scope = await put({ contract: "algal.application-memory-scope.v1", application: APP, environment: "controlled-synthetic-study", task: "routes", frontier, bindings: [], completeFor: [], attestation: await put("host-authored-synthetic-corpus") });
    const policy = { contract: "algal.application-host.v1", application: APP, frontier, hostProfile: plan.harness, episodeAccess: "observe", routes: [], attestation: null, decoders: [] };
    const host = createApplicationPolicyHost(policy, { channelsDir: join(serviceRoot, "channels"), researchVerifier: verifier });
    const service = new ApplicationService(serviceRoot, host), memory = new ApplicationMemoryService({ store, engine: options.engine, admission: host });
    const memoryRef = await memory.snapshot({ application: APP, schema, previous: null, scope, observations: [], hypotheses: [], withdrawn: [] });
    const incumbent = await store.putManifest(strategyManifest("structured-facts"));
    const revisionBody = { contract: "algal.application-revision.v1", application: APP, parent: null, schema, queries, views, runtimeProfile, evaluationPolicy, capabilityRequirements: [], entrypoints: [{ name: "strategy", manifest: incumbent, applicability: query, maxGenerations: 1, capabilities: [], queries: [query] }] };
    const revision = await put(revisionBody);
    const genesis = await service.create({ application: APP, operation: hash({ plan: hash(plan), operation: "create" }), kind: "create", expectedHead: null, revision, memory: memoryRef, intents: [], evidence: [], causedBy: null });
    const execute = async (manifest: OrganismManifest, input: JsonValue) => { await store.putManifest(manifest); const run = await runOrganism({ manifest, args: { source: { data: input } }, fns: builtinRegistry(), store, executors: [options.executor] }); return { run, ref: await put(run) }; };
    await record({ kind: "proposal-intent", plan: hash(plan) });
    const proposal = await execute(proposalManifest(), developmentInput());
    await record({ kind: "proposal-result", receipt: proposal.ref });
    const mode = proposedMode(proposal.run), candidateManifest = await store.putManifest(strategyManifest("derived-answers"));
    const freeze = await put({ contract: "algal.route-study-freeze.v1", plan: hash(plan), proposal: proposal.ref, mode, candidate: mode === "derived-answers" ? candidateManifest : null });
    await record({ kind: "freeze", record: freeze });
    const candidateRevision = await put({ ...revisionBody, parent: revision, entrypoints: [{ ...revisionBody.entrypoints[0], manifest: candidateManifest }] });
    const queryEvidence: QueryEvidence[] = [], answers: AnswerEvidence[] = [], attempts: ApplicationResearchAttempt[] = [], runs = [proposal.run];
    evaluation: for (const row of ROUTE_CASES) {
      if (runs.at(-1)!.outcome !== "complete") break;
      const input = queryInput(row), derived = await options.engine.query(input.snapshot, input.program);
      ensure(derived.kind === "complete" && await options.engine.verify(input.snapshot, input.program, derived.result), "Datalog derivation failed; no unchecked treatment dispatched");
      ensure(exactAnswer(derivedAnswers(derived.result), row.expected), "Native query disagrees with authored oracle");
      queryEvidence.push({ caseId: row.id, snapshot: await put(input.snapshot), program: await put(input.program), result: await put(derived.result) });
      for (const role of ["incumbent", "candidate"] as const) {
        const context = answerInput(row, role, derived.result);
        await record({ kind: "answer-intent", caseId: row.id, role, input: hash(context), freeze });
        const executed = await execute(answerManifest(), context);
        await record({ kind: "answer-result", caseId: row.id, role, receipt: executed.ref });
        answers.push({ caseId: row.id, role, run: executed.ref }); runs.push(executed.run);
        attempts.push(attempt(row, role, executed.run, executed.ref, proposal.run, (derived.result as { work: number }).work));
        if (executed.run.outcome !== "complete") break evaluation;
      }
    }
    const accounting = await put({ contract: "algal.route-study-accounting.v1", meter: meter(runs), provider: await options.accounting(), maxCostMicrousd: plan.maxCostMicrousd, reserveMicrousdPerCall: plan.reserveMicrousdPerCall, costMeaning: "reservation-ceiling-not-settled-provider-charge" });
    const journal = await put({ contract: "algal.route-study-journal.v1", plan: hash(plan), proposal: proposal.ref, freeze, queries: queryEvidence, answers, events, accounting } satisfies Journal);
    await checkJournal(store, options.engine, journal, plan);
    let evaluation: Digest | null = null, verdict = "proposal-not-admitted", reasons = ["proposal-did-not-select-changed-strategy"], finalState = genesis.digest, activated = false;
    if (answers.length < 16) { verdict = "incomplete"; reasons = ["uncertain-attempt", "pending-unattempted-cases"]; }
    else if (mode === "derived-answers") {
      const request = await put({ contract: "algal.application-research-request.v1", parentState: genesis.digest, candidateRevision, entrypoint: "strategy", policy: evaluationPolicy });
      const report = await put({ contract: "algal.application-research-report.v1", request, attemptJournal: journal, attempts });
      const payload = { request, report, journal };
      const seal = await put({ ...payload, signature: sign(null, Buffer.from(canonicalize(payload)), keys.privateKey).toString("base64") });
      const admitted = await admitApplicationResearchEvaluation(store, { request, report, seal }, { verifier });
      evaluation = admitted.evaluationRef; verdict = admitted.evaluation.verdict.status; reasons = admitted.evaluation.verdict.status === "rejected" ? admitted.evaluation.verdict.reasons : [];
      if (admitted.evaluation.verdict.status === "accepted") {
        const current = await service.commit({ application: APP, operation: hash({ plan: hash(plan), operation: "activate" }), kind: "activate", expectedHead: genesis.digest, revision: candidateRevision, memory: memoryRef, intents: [], evidence: [evaluation], causedBy: null });
        finalState = current.digest; activated = true;
        const selected = await store.getManifest(current.revision.entrypoints[0]!.manifest); ensure(selected, "Selected strategy missing");
        const executed = await runOrganism({ manifest: selected, fns: builtinRegistry(), store, executors: [] });
        ensure(equal(executed.cells.out?.outputs?.value, { mode: "derived-answers" }), "Activated strategy did not execute");
        await put(executed);
      }
    }
    const body = { contract: "algal.route-study-result.v1" as const, plan: hash(plan), evaluator, journal, proposalMode: mode, evaluation, verdict, reasons, parentState: genesis.digest, finalState, activated, quality: { incumbent: attempts.filter(a => a.role === "incumbent" && a.passed).length, candidate: attempts.filter(a => a.role === "candidate" && a.passed).length, cases: ROUTE_CASES.length }, provenance: plan.provenance, accounting, pendingAnswers: 16 - answers.length };
    const payload = { plan: hash(plan), evaluator, journal, result: hash(body) };
    const seal = await put({ ...payload, signature: sign(null, Buffer.from(canonicalize(payload)), keys.privateKey).toString("base64") });
    const summary: StudySummary = { ...body, seal };
    await writeFile(join(root, "result.json"), canonicalize(json(summary)) + "\n", { flag: "wx", mode: 0o600 });
    return summary;
  } finally { await log.close(); await options.engine.settle(); }
}

/** Read-only model replay. A native local proof verifier is still required. */
export async function verifyStudy(root: string, options: { engine: MemoryQueryEngine; trustedEvaluator: Digest }): Promise<StudySummary> {
  const plan = await readPlan(root), store = new FileStore(join(root, "application"));
  ensure(plan.engine === options.engine.identity, "Engine differs from frozen plan");
  const raw = await hostRead(join(root, "result.json"), 16384);
  applicationObject(raw, ["contract", "plan", "evaluator", "journal", "proposalMode", "evaluation", "verdict", "reasons", "parentState", "finalState", "activated", "quality", "provenance", "accounting", "pendingAnswers", "seal"]);
  const summary = raw as unknown as StudySummary;
  ensure(summary.contract === "algal.route-study-result.v1" && summary.evaluator === options.trustedEvaluator && summary.plan === hash(plan), "Result identity differs from trusted run");
  const evaluator = applicationObject(await value(store, summary.evaluator), ["contract", "publicKey", "plan"]);
  ensure(evaluator.contract === "algal.route-study-evaluator.v1" && evaluator.plan === summary.plan && typeof evaluator.publicKey === "string", "Trusted evaluator differs from plan");
  const { seal: sealRef, ...body } = summary, payload = { plan: summary.plan, evaluator: summary.evaluator, journal: summary.journal, result: hash(body) };
  const seal = applicationObject(await value(store, sealRef), ["plan", "evaluator", "journal", "result", "signature"]);
  ensure(equal({ plan: seal.plan, evaluator: seal.evaluator, journal: seal.journal, result: seal.result }, payload) && typeof seal.signature === "string" && verify(null, Buffer.from(canonicalize(payload)), createPublicKey({ key: Buffer.from(evaluator.publicKey, "base64"), format: "der", type: "spki" }), Buffer.from(seal.signature, "base64")), "Final result seal did not verify");
  const checked = await checkJournal(store, options.engine, summary.journal, plan);
  ensure(equal(checked.journal.events, await hostRead(join(root, "attempts.json"), 65536)), "Durable attempt log differs from sealed journal");
  ensure(summary.proposalMode === checked.mode && summary.provenance === plan.provenance && summary.accounting === checked.journal.accounting, "Summary metadata differs from evidence");
  ensure(equal(summary.quality, { incumbent: checked.attempts.filter(a => a.role === "incumbent" && a.passed).length, candidate: checked.attempts.filter(a => a.role === "candidate" && a.passed).length, cases: ROUTE_CASES.length }), "Summary quality differs from exact scorer");
  ensure(summary.pendingAnswers === 16 - checked.journal.answers.length, "Pending count differs from attempted prefix");
  let candidate: Digest | null = null;
  if (summary.evaluation) {
    const checkedEvaluation = await verifyApplicationResearchEvaluation(store, summary.evaluation, summary.parentState, { verifier: studyVerifier(store, options.engine, options.trustedEvaluator) });
    ensure(summary.verdict === checkedEvaluation.verdict.status && equal(summary.reasons, checkedEvaluation.verdict.status === "rejected" ? checkedEvaluation.verdict.reasons : []) && summary.activated === (checkedEvaluation.verdict.status === "accepted"), "Summary verdict differs from admission");
    const request = await value(store, checkedEvaluation.evaluation.request) as { candidateRevision: Digest }; candidate = request.candidateRevision;
  } else ensure(!summary.activated && (checked.incomplete ? summary.verdict === "incomplete" && equal(summary.reasons, ["uncertain-attempt", "pending-unattempted-cases"]) : checked.mode !== "derived-answers" && summary.verdict === "proposal-not-admitted" && equal(summary.reasons, ["proposal-did-not-select-changed-strategy"])), "Missing required evaluation");
  const readOnlyService = new ApplicationService(join(root, "application"), { async admitCommit() { throw new Error("Replay cannot publish"); } });
  const head = await readOnlyService.inspect(APP); ensure(head?.digest === summary.finalState && (summary.activated || summary.finalState === summary.parentState), "Application head differs from summary");
  ensure(!summary.activated || head.state.revision === candidate, "Activated revision differs from evaluated candidate");
  return summary;
}
