/** Admission of evaluator-sealed research evidence. This module never calls
 * providers or publishes a head. A pinned, explicitly supplied host verifier
 * establishes provenance; deterministic gates compute the acceptance verdict. */
import {
  applicationId, applicationInt, applicationJson, applicationList, applicationObject,
  applicationRef, applicationTag, getApplicationRecord, parseApplicationRevision,
  parseApplicationState, putApplicationRecord, type ApplicationRevision,
} from "./application-contract";
import { parseEvaluationPolicy, type EvaluationPolicy } from "./application-adaptation";
import { parseApplicationRuntimeProfile } from "./application-view";
import { digestCanonical, type Digest } from "./digest";
import { compileOrganism, interfaceSignature } from "./graph";
import { builtinRegistry } from "./registry";
import { replayStore, type Store } from "./store";
import type { JsonValue } from "./values";

export type ApplicationResearchPolicy = {
  contract: "algal.application-research-policy.v1";
  evaluator: Digest; harness: Digest; corpus: Digest;
  strategyEntrypoints: string[]; maxAttemptsPerCase: number;
};
export type ApplicationResearchCorpus = {
  contract: "algal.application-research-corpus.v1";
  cases: { id: string; split: "development" | "holdout"; task: Digest; sources: Digest }[];
};
export type ApplicationResearchRequest = {
  contract: "algal.application-research-request.v1";
  parentState: Digest; candidateRevision: Digest; entrypoint: string; policy: Digest;
};
export type ApplicationResearchAttempt = {
  caseId: string; role: "incumbent" | "candidate"; attempt: number;
  outcome: "complete" | "failed" | "uncertain"; passed: boolean;
  work: number; modelCalls: number; receipt: Digest;
};
export type ApplicationResearchReport = {
  contract: "algal.application-research-report.v1";
  request: Digest; attemptJournal: Digest; attempts: ApplicationResearchAttempt[];
};
export type ApplicationResearchVerdict = { status: "accepted"; selectedManifest: Digest } | { status: "rejected"; reasons: string[] };
export type ApplicationResearchEvaluation = {
  contract: "algal.application-research-evaluation.v1";
  request: Digest; report: Digest; seal: Digest; verifier: Digest; verdict: ApplicationResearchVerdict;
};
export type ApplicationResearchVerifierContext = {
  evaluationPolicy: EvaluationPolicy; researchPolicy: ApplicationResearchPolicy;
  request: ApplicationResearchRequest; report: ApplicationResearchReport; seal: JsonValue;
  incumbentRevision: ApplicationRevision; candidateRevision: ApplicationRevision;
  store: Pick<Store, "getValue" | "getReceipt" | "getManifest">;
};
export interface ApplicationResearchVerifier {
  /** Host-admitted evaluator authority, matched against the immutable policy. */
  identity: Digest;
  /** Verify the exact report/journal/receipts and signature, account for every
   * attempt, and establish that heldout feedback never reached the proposer.
   * Must be bounded local verification, never provider execution under custody. */
  verify(context: ApplicationResearchVerifierContext): Promise<boolean>;
}
const MAX_CASES = 128, MAX_ATTEMPTS = 8, MAX_WORK = 1_000_000_000, MAX_CALLS = 1_000_000;
const hash = (value: unknown) => digestCanonical(applicationJson(value));

export function parseApplicationResearchPolicy(input: unknown): ApplicationResearchPolicy {
  const v = applicationObject(input, ["contract", "evaluator", "harness", "corpus", "strategyEntrypoints", "maxAttemptsPerCase"]);
  applicationTag(v.contract, "algal.application-research-policy.v1");
  const strategyEntrypoints = applicationList(v.strategyEntrypoints, 8, applicationId);
  if (!strategyEntrypoints.length || strategyEntrypoints.some((name, i) => i > 0 && name <= strategyEntrypoints[i - 1]!)) throw new Error("Research strategy entrypoints must be nonempty, sorted and unique");
  return { contract: "algal.application-research-policy.v1", evaluator: applicationRef(v.evaluator), harness: applicationRef(v.harness), corpus: applicationRef(v.corpus), strategyEntrypoints, maxAttemptsPerCase: applicationInt(v.maxAttemptsPerCase, 1, MAX_ATTEMPTS) };
}
export function parseApplicationResearchCorpus(input: unknown): ApplicationResearchCorpus {
  const v = applicationObject(input, ["contract", "cases"]);
  applicationTag(v.contract, "algal.application-research-corpus.v1");
  const ids = new Set<string>();
  const cases = applicationList(v.cases, MAX_CASES, row => {
    const c = applicationObject(row, ["id", "split", "task", "sources"]), id = applicationId(c.id);
    if (ids.has(id)) throw new Error("Duplicate research case");
    ids.add(id);
    if (c.split !== "development" && c.split !== "holdout") throw new Error("Invalid research split");
    return { id, split: c.split, task: applicationRef(c.task), sources: applicationRef(c.sources) } as ApplicationResearchCorpus["cases"][number];
  });
  if (!cases.some(row => row.split === "development") || !cases.some(row => row.split === "holdout")) throw new Error("Research requires development and holdout cases");
  return { contract: "algal.application-research-corpus.v1", cases };
}
export function parseApplicationResearchRequest(input: unknown): ApplicationResearchRequest {
  const v = applicationObject(input, ["contract", "parentState", "candidateRevision", "entrypoint", "policy"]);
  applicationTag(v.contract, "algal.application-research-request.v1");
  return { contract: "algal.application-research-request.v1", parentState: applicationRef(v.parentState), candidateRevision: applicationRef(v.candidateRevision), entrypoint: applicationId(v.entrypoint), policy: applicationRef(v.policy) };
}
export function parseApplicationResearchReport(input: unknown): ApplicationResearchReport {
  const v = applicationObject(input, ["contract", "request", "attemptJournal", "attempts"]);
  applicationTag(v.contract, "algal.application-research-report.v1");
  const attempts = applicationList(v.attempts, MAX_CASES * 2 * MAX_ATTEMPTS, row => {
    const a = applicationObject(row, ["caseId", "role", "attempt", "outcome", "passed", "work", "modelCalls", "receipt"]);
    if (a.role !== "incumbent" && a.role !== "candidate") throw new Error("Invalid research role");
    if (a.outcome !== "complete" && a.outcome !== "failed" && a.outcome !== "uncertain") throw new Error("Invalid research outcome");
    if (typeof a.passed !== "boolean" || (a.outcome !== "complete" && a.passed)) throw new Error("Only a completed research attempt can pass");
    return { caseId: applicationId(a.caseId), role: a.role, attempt: applicationInt(a.attempt, 1, MAX_ATTEMPTS), outcome: a.outcome, passed: a.passed, work: applicationInt(a.work, 0, MAX_WORK), modelCalls: applicationInt(a.modelCalls, 0, MAX_CALLS), receipt: applicationRef(a.receipt) } as ApplicationResearchAttempt;
  });
  return { contract: "algal.application-research-report.v1", request: applicationRef(v.request), attemptJournal: applicationRef(v.attemptJournal), attempts };
}
export function parseApplicationResearchEvaluation(input: unknown): ApplicationResearchEvaluation {
  const v = applicationObject(input, ["contract", "request", "report", "seal", "verifier", "verdict"]);
  applicationTag(v.contract, "algal.application-research-evaluation.v1");
  const raw = applicationJson(v.verdict);
  let verdict: ApplicationResearchVerdict;
  if (raw && typeof raw === "object" && !Array.isArray(raw) && raw.status === "accepted") {
    const accepted = applicationObject(raw, ["status", "selectedManifest"]);
    verdict = { status: "accepted", selectedManifest: applicationRef(accepted.selectedManifest) };
  } else {
    const rejected = applicationObject(raw, ["status", "reasons"]); applicationTag(rejected.status, "rejected");
    const reasons = applicationList(rejected.reasons, 16, applicationId);
    if (!reasons.length || reasons.some((reason, i) => i > 0 && reason <= reasons[i - 1]!)) throw new Error("Research rejection reasons must be nonempty, sorted and unique");
    verdict = { status: "rejected", reasons };
  }
  return { contract: "algal.application-research-evaluation.v1", request: applicationRef(v.request), report: applicationRef(v.report), seal: applicationRef(v.seal), verifier: applicationRef(v.verifier), verdict };
}

async function strategy(store: Store, request: ApplicationResearchRequest, researchPolicy: ApplicationResearchPolicy) {
  const state = await getApplicationRecord(store, request.parentState, parseApplicationState);
  const incumbentRevision = await getApplicationRecord(store, state.revision, parseApplicationRevision);
  const candidateRevision = await getApplicationRecord(store, request.candidateRevision, parseApplicationRevision);
  if (!researchPolicy.strategyEntrypoints.includes(request.entrypoint)) throw new Error("Research policy does not admit this strategy entrypoint");
  const old = incumbentRevision.entrypoints.find(entry => entry.name === request.entrypoint), next = candidateRevision.entrypoints.find(entry => entry.name === request.entrypoint);
  if (state.application !== incumbentRevision.application || !old || !next || old.manifest === next.manifest) throw new Error("Research requires a changed strategy");
  const expected = { ...incumbentRevision, parent: state.revision, entrypoints: incumbentRevision.entrypoints.map(entry => entry.name === request.entrypoint ? { ...entry, manifest: next.manifest } : entry) };
  if (hash(expected) !== hash(candidateRevision)) throw new Error("Research may change only one strategy manifest and must preserve current metadata and authority");
  if (request.policy !== incumbentRevision.evaluationPolicy) throw new Error("Research policy differs from the immutable revision policy");
  const profile = await getApplicationRecord(store, incumbentRevision.runtimeProfile, parseApplicationRuntimeProfile);
  if (profile.policy !== "sealed-research-evaluation.v1") throw new Error("Research requires an explicit sealed research runtime profile");
  const incumbent = await store.getManifest(old.manifest), candidate = await store.getManifest(next.manifest);
  if (!incumbent || !candidate) throw new Error("Research strategy manifest is missing");
  for (const manifest of [incumbent, candidate]) if (manifest.cells.some(cell => !["input", "const", "fn", "expr"].includes(cell.kind))) throw new Error("Research can only change pure strategy manifests");
  for (const key of ["maxSteps", "maxAgentCalls", "maxWork", "maxContextBytes", "maxOutputBytes", "maxDepth"] as const) if (candidate.budgets[key] > incumbent.budgets[key]) throw new Error("Research widens a strategy budget");
  const readOnly = replayStore(store), registry = builtinRegistry();
  const left = await compileOrganism(incumbent, registry, readOnly), right = await compileOrganism(candidate, registry, readOnly);
  if (hash(interfaceSignature(left)) !== hash(interfaceSignature(right))) throw new Error("Research changes the strategy interface");
  return { incumbentRevision, candidateRevision, selectedManifest: next.manifest };
}

async function checkedEvaluation(store: Store, input: unknown, options: { verifier: ApplicationResearchVerifier }): Promise<ApplicationResearchEvaluation> {
  const v = applicationObject(input, ["request", "report", "seal"]);
  const requestRef = applicationRef(v.request), reportRef = applicationRef(v.report), sealRef = applicationRef(v.seal);
  if (!options.verifier || typeof options.verifier.verify !== "function") throw new Error("Research requires an explicit trusted verifier");
  const identity = applicationRef(options.verifier.identity), verify = options.verifier.verify.bind(options.verifier);
  const request = await getApplicationRecord(store, requestRef, parseApplicationResearchRequest);
  const evaluationPolicy = await getApplicationRecord(store, request.policy, parseEvaluationPolicy);
  if (!evaluationPolicy.research) throw new Error("Research is not enabled by the revision policy");
  const researchPolicy = await getApplicationRecord(store, evaluationPolicy.research, parseApplicationResearchPolicy);
  if (researchPolicy.evaluator !== identity) throw new Error("Research verifier differs from the pinned evaluator");
  const corpus = await getApplicationRecord(store, researchPolicy.corpus, parseApplicationResearchCorpus);
  if (corpus.cases.length > evaluationPolicy.maxCases) throw new Error("Research exceeds the frozen case budget");
  for (const reference of [researchPolicy.evaluator, researchPolicy.harness, ...corpus.cases.flatMap(row => [row.task, row.sources])]) await getApplicationRecord(store, reference, applicationJson);
  const { incumbentRevision, candidateRevision, selectedManifest } = await strategy(store, request, researchPolicy);
  const report = await getApplicationRecord(store, reportRef, parseApplicationResearchReport), seal = await getApplicationRecord(store, sealRef, applicationJson);
  if (report.request !== requestRef) throw new Error("Research report names another request");
  await getApplicationRecord(store, report.attemptJournal, applicationJson);
  const groups = new Map<string, ApplicationResearchAttempt[]>(), receipts = new Set<Digest>(), reasons = new Set<string>();
  const resources = { incumbent: { work: 0, modelCalls: 0 }, candidate: { work: 0, modelCalls: 0 } };
  for (const attempt of report.attempts) {
    if (!corpus.cases.some(row => row.id === attempt.caseId)) throw new Error("Research attempt is outside the frozen corpus");
    const key = `${attempt.caseId}:${attempt.role}`, group = groups.get(key) ?? [];
    if (attempt.attempt !== group.length + 1 || attempt.attempt > researchPolicy.maxAttemptsPerCase) throw new Error("Research attempt sequence or budget differs from policy");
    if (receipts.has(attempt.receipt)) throw new Error("Research attempts must have distinct bound receipts");
    receipts.add(attempt.receipt);
    await getApplicationRecord(store, attempt.receipt, applicationJson);
    group.push(attempt); groups.set(key, group);
    resources[attempt.role].work += attempt.work; resources[attempt.role].modelCalls += attempt.modelCalls;
    if (attempt.outcome === "uncertain") reasons.add("uncertain-attempt");
  }
  let oldPasses = 0, newPasses = 0;
  for (const row of corpus.cases) {
    const old = groups.get(`${row.id}:incumbent`)?.at(-1), next = groups.get(`${row.id}:candidate`)?.at(-1);
    if (!old || !next) throw new Error("Research report omits a frozen role or case");
    if (old.outcome !== "complete" || next.outcome !== "complete") reasons.add("incomplete-case");
    if (old.passed && !next.passed) reasons.add("case-regression");
    if (row.split === "development") { oldPasses += Number(old.passed); newPasses += Number(next.passed); }
    else if (!next.passed) reasons.add("holdout-failure");
  }
  if (newPasses <= oldPasses) reasons.add("no-strict-development-improvement");
  for (const resource of Object.values(resources)) {
    if (resource.work > evaluationPolicy.maxWork) reasons.add("work-budget");
    if (resource.modelCalls > evaluationPolicy.maxModelCalls) reasons.add("model-call-budget");
  }
  const readOnly = replayStore(store);
  const reader: ApplicationResearchVerifierContext["store"] = Object.freeze({ getValue: readOnly.getValue.bind(readOnly), getReceipt: readOnly.getReceipt.bind(readOnly), getManifest: readOnly.getManifest.bind(readOnly) });
  const context = { ...structuredClone({ evaluationPolicy, researchPolicy, request, report, seal, incumbentRevision, candidateRevision }), store: reader };
  if (await verify(context) !== true) throw new Error("Research seal or evaluator evidence did not verify");
  return { contract: "algal.application-research-evaluation.v1", request: requestRef, report: reportRef, seal: sealRef, verifier: identity, verdict: reasons.size ? { status: "rejected", reasons: [...reasons].sort() } : { status: "accepted", selectedManifest } };
}

export async function admitApplicationResearchEvaluation(store: Store, input: { request: Digest; report: Digest; seal: Digest }, options: { verifier: ApplicationResearchVerifier }): Promise<{ evaluationRef: Digest; evaluation: ApplicationResearchEvaluation }> {
  const evaluation = await checkedEvaluation(store, input, options);
  return { evaluationRef: await putApplicationRecord(store, evaluation), evaluation };
}
export async function verifyApplicationResearchEvaluation(store: Store, evaluationRef: Digest, expectedState: Digest, options: { verifier: ApplicationResearchVerifier }): Promise<{ evaluation: ApplicationResearchEvaluation; verdict: ApplicationResearchVerdict }> {
  const stored = await getApplicationRecord(store, evaluationRef, parseApplicationResearchEvaluation);
  const request = await getApplicationRecord(store, stored.request, parseApplicationResearchRequest);
  if (request.parentState !== applicationRef(expectedState)) throw new Error("Research evaluation is stale");
  const evaluation = await checkedEvaluation(store, { request: stored.request, report: stored.report, seal: stored.seal }, options);
  if (hash(evaluation) !== hash(stored)) throw new Error("Stored research acceptance is not reproducible");
  return { evaluation, verdict: evaluation.verdict };
}
export async function admitApplicationResearchActivation(store: Store, input: { evaluation: Digest; expectedState: Digest; revision: Digest }, options: { verifier: ApplicationResearchVerifier }): Promise<{ evaluation: ApplicationResearchEvaluation; revision: Digest; state: Digest }> {
  const v = applicationObject(input, ["evaluation", "expectedState", "revision"]);
  const expectedState = applicationRef(v.expectedState), revision = applicationRef(v.revision);
  const checked = await verifyApplicationResearchEvaluation(store, applicationRef(v.evaluation), expectedState, options);
  const request = await getApplicationRecord(store, checked.evaluation.request, parseApplicationResearchRequest);
  if (checked.verdict.status !== "accepted" || request.candidateRevision !== revision) throw new Error("Research activation requires a reproducibly accepted candidate revision");
  return { evaluation: checked.evaluation, revision, state: expectedState };
}
