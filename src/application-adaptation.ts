/** Bounded proposal/evaluation/activation admission for application revisions.
 *
 * This module deliberately wraps the existing foundry evaluator. It does not
 * provide a second evaluator and it never publishes an application head.
 * The caller supplies an admitted, case-pure host (builtin functions and no
 * effect executors); lifecycle code can use the final admission as its CAS
 * boundary.
 */
import { manifestToJson, type OrganismManifest } from "./contract";
import {
  applicationId, applicationInt, applicationJson, applicationList, applicationObject,
  applicationRef, applicationTag, getApplicationRecord, parseApplicationRevision,
  parseApplicationState, putApplicationRecord, type ApplicationRevision, type ApplicationState,
} from "./application-contract";
import {
  parseMemoryProcedure, parseMemoryQueries, parseMemoryQuery, parseMemorySchema,
} from "./application-memory";
import { digestCanonical, type Digest } from "./digest";
import { runFoundry, type FoundryCase, type FoundryReport } from "./foundry";
import { verifyFoundryReport } from "./foundry-verify";
import { parseExprScorer, type ExprScorer } from "./expr";
import { isBuiltinRegistry, type FnRegistry } from "./registry";
import { parseRunReceipt } from "./run";
import type { Executor } from "./effects";
import type { Store } from "./store";
import { canonicalize, type JsonObject, type JsonValue } from "./values";

export const APPLICATION_ADAPTATION_CONTRACT = "algal.application-adaptation.v1" as const;

export type EvaluationPolicy = {
  contract: "algal.application-evaluation-policy.v1";
  maxCases: number;
  maxWork: number;
  maxModelCalls: number;
  requireHoldoutPass: true;
  strictValidationImprovement: true;
};

export type EvaluationCaseSet = {
  contract: "algal.application-evaluation-cases.v1";
  cases: FoundryCase[];
};

export type EvaluationScorer = {
  contract: "algal.application-evaluation-scorer.v1";
  scorer: ExprScorer | null;
};

export type ApplicationEvaluationRequest = {
  contract: "algal.application-evaluation-request.v1";
  parentState: Digest;
  candidateRevision: Digest;
  entrypoint: string;
  cases: Digest;
  scorer: Digest;
  policy: Digest;
};

export type CompatibilityResult = {
  contract: "algal.application-compatibility.v1";
  previousRevision: Digest;
  candidateRevision: Digest;
  status: "compatible" | "incompatible";
  reasons: string[];
};

type Verdict =
  | { status: "accepted"; selectedManifest: Digest }
  | { status: "rejected"; reasons: string[] }
  | { status: "incomplete"; reasons: string[] };

export type ApplicationEvaluation = {
  contract: "algal.application-evaluation.v1";
  request: Digest;
  parentState: Digest;
  candidateRevision: Digest;
  cases: Digest;
  scorer: Digest;
  policy: Digest;
  foundryReport: Digest;
  compatibility: Digest;
  verdict: Verdict;
};

export type AdaptationRuntime = {
  fns: FnRegistry;
  executors?: Executor[];
};

const MAX_EVALUATION_CASES = 32;
const MAX_EVALUATION_WORK = 1_000_000;
const MAX_EVALUATION_MODEL_CALLS = 16;

function object(value: unknown, at: string): Record<string, JsonValue> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${at} must be an object`);
  return value as Record<string, JsonValue>;
}
function keys(value: Record<string, JsonValue>, allowed: string[], at: string): void {
  if (Object.keys(value).some(key => !allowed.includes(key))) throw new Error(`${at} has unknown fields`);
  if (allowed.some(key => !(key in value))) throw new Error(`${at} is missing a field`);
}
function digest(value: unknown, at: string): Digest { return applicationRef(value); }
function text(value: unknown, at: string): string {
  if (typeof value !== "string" || value.length === 0 || Buffer.byteLength(value) > 256 || value.includes("\0")) throw new Error(`${at} must be bounded text`);
  return value;
}
function optionalObject(store: Store, ref: Digest): Promise<JsonValue> {
  return store.getValue(ref).then(value => { if (value === undefined) throw new Error(`Missing application record ${ref}`); return applicationJson(value); });
}
function same(a: unknown, b: unknown): boolean {
  return canonicalize(applicationJson(a)) === canonicalize(applicationJson(b));
}

export function parseEvaluationPolicy(input: unknown): EvaluationPolicy {
  const v = applicationObject(input, ["contract", "maxCases", "maxWork", "maxModelCalls", "requireHoldoutPass", "strictValidationImprovement"]);
  applicationTag(v.contract, "algal.application-evaluation-policy.v1");
  if (v.requireHoldoutPass !== true || v.strictValidationImprovement !== true) throw new Error("Adaptation policy cannot weaken acceptance");
  return { contract: "algal.application-evaluation-policy.v1", maxCases: applicationInt(v.maxCases, 3, MAX_EVALUATION_CASES), maxWork: applicationInt(v.maxWork, 1, MAX_EVALUATION_WORK), maxModelCalls: applicationInt(v.maxModelCalls, 0, MAX_EVALUATION_MODEL_CALLS), requireHoldoutPass: true, strictValidationImprovement: true };
}
export function parseEvaluationCases(input: unknown): EvaluationCaseSet {
  const v = applicationObject(input, ["contract", "cases"]); applicationTag(v.contract, "algal.application-evaluation-cases.v1");
  const ids = new Set<string>();
  const cases = applicationList(v.cases, MAX_EVALUATION_CASES, row => {
    const c = applicationObject(row, ["id", "split", "args", "expect"]);
    const id = text(c.id, "case.id"); if (ids.has(id)) throw new Error("Duplicate evaluation case"); ids.add(id);
    if (c.split !== "train" && c.split !== "validation" && c.split !== "holdout") throw new Error("Invalid evaluation split");
    return { id, split: c.split, args: object(c.args, "case.args"), expect: object(c.expect, "case.expect") } as FoundryCase;
  });
  if (!cases.some(c => c.split === "train") || !cases.some(c => c.split === "validation") || !cases.some(c => c.split === "holdout")) throw new Error("Evaluation requires train, validation, and holdout cases");
  return { contract: "algal.application-evaluation-cases.v1", cases };
}
export function parseEvaluationScorer(input: unknown): EvaluationScorer {
  const v = applicationObject(input, ["contract", "scorer"]); applicationTag(v.contract, "algal.application-evaluation-scorer.v1");
  return { contract: "algal.application-evaluation-scorer.v1", scorer: v.scorer === null ? null : parseExprScorer(v.scorer, "evaluation scorer") };
}
export function parseApplicationEvaluationRequest(input: unknown): ApplicationEvaluationRequest {
  const v = applicationObject(input, ["contract", "parentState", "candidateRevision", "entrypoint", "cases", "scorer", "policy"]);
  applicationTag(v.contract, "algal.application-evaluation-request.v1");
  return { contract: "algal.application-evaluation-request.v1", parentState: digest(v.parentState, "request.parentState"), candidateRevision: digest(v.candidateRevision, "request.candidateRevision"), entrypoint: applicationId(v.entrypoint), cases: digest(v.cases, "request.cases"), scorer: digest(v.scorer, "request.scorer"), policy: digest(v.policy, "request.policy") };
}
function parseCompatibility(input: unknown): CompatibilityResult {
  const v = applicationObject(input, ["contract", "previousRevision", "candidateRevision", "status", "reasons"]);
  applicationTag(v.contract, "algal.application-compatibility.v1");
  if (v.status !== "compatible" && v.status !== "incompatible") throw new Error("Invalid compatibility status");
  const reasons = applicationList(v.reasons, 16, value => text(value, "compatibility reason"));
  return { contract: "algal.application-compatibility.v1", previousRevision: digest(v.previousRevision, "compatibility.previousRevision"), candidateRevision: digest(v.candidateRevision, "compatibility.candidateRevision"), status: v.status, reasons };
}
function parseEvaluation(input: unknown): ApplicationEvaluation {
  const v = applicationObject(input, ["contract", "request", "parentState", "candidateRevision", "cases", "scorer", "policy", "foundryReport", "compatibility", "verdict"]);
  applicationTag(v.contract, "algal.application-evaluation.v1");
  const verdict = object(v.verdict, "evaluation.verdict");
  if (verdict.status !== "accepted" && verdict.status !== "rejected" && verdict.status !== "incomplete") throw new Error("Invalid evaluation verdict");
  if (verdict.status === "accepted") {
    keys(verdict, ["status", "selectedManifest"], "evaluation.verdict");
    return { contract: "algal.application-evaluation.v1", request: digest(v.request, "evaluation.request"), parentState: digest(v.parentState, "evaluation.parentState"), candidateRevision: digest(v.candidateRevision, "evaluation.candidateRevision"), cases: digest(v.cases, "evaluation.cases"), scorer: digest(v.scorer, "evaluation.scorer"), policy: digest(v.policy, "evaluation.policy"), foundryReport: digest(v.foundryReport, "evaluation.foundryReport"), compatibility: digest(v.compatibility, "evaluation.compatibility"), verdict: { status: "accepted", selectedManifest: digest(verdict.selectedManifest, "selected manifest") } };
  }
  keys(verdict, ["status", "reasons"], "evaluation.verdict");
  return { contract: "algal.application-evaluation.v1", request: digest(v.request, "evaluation.request"), parentState: digest(v.parentState, "evaluation.parentState"), candidateRevision: digest(v.candidateRevision, "evaluation.candidateRevision"), cases: digest(v.cases, "evaluation.cases"), scorer: digest(v.scorer, "evaluation.scorer"), policy: digest(v.policy, "evaluation.policy"), foundryReport: digest(v.foundryReport, "evaluation.foundryReport"), compatibility: digest(v.compatibility, "evaluation.compatibility"), verdict: { status: verdict.status, reasons: applicationList(verdict.reasons, 16, value => text(value, "evaluation reason")) } };
}

async function loadRevision(store: Store, ref: Digest): Promise<{ revision: ApplicationRevision; manifests: Map<string, OrganismManifest> }> {
  const revision = await getApplicationRecord(store, ref, parseApplicationRevision);
  const schema = parseMemorySchema(await optionalObject(store, revision.schema));
  const queries = parseMemoryQueries(await optionalObject(store, revision.queries));
  for (const queryRef of queries.queries) {
    const query = parseMemoryQuery(await optionalObject(store, queryRef));
    if (query.schema !== revision.schema) throw new Error("Memory query schema does not match revision schema");
    const program = await optionalObject(store, query.program);
    if (object(program, "query program").contract !== "algal.query.v1") throw new Error("Memory query program has wrong kind");
  }
  const manifests = new Map<string, OrganismManifest>();
  for (const entrypoint of revision.entrypoints) {
    if (!queries.queries.includes(entrypoint.applicability)) throw new Error("Entrypoint applicability is not in the query bundle");
    const query = parseMemoryQuery(await optionalObject(store, entrypoint.applicability));
    if (query.schema !== revision.schema) throw new Error("Entrypoint applicability schema mismatch");
    const manifest = await store.getManifest(entrypoint.manifest);
    if (!manifest) throw new Error("Entrypoint manifest is missing or wrong-kind");
    manifests.set(entrypoint.name, manifest);
  }
  await optionalObject(store, revision.views);
  await optionalObject(store, revision.runtimeProfile);
  await optionalObject(store, revision.evaluationPolicy);
  if (!schema.relations.length) throw new Error("Empty memory schema");
  return { revision, manifests };
}

function pureManifest(manifest: OrganismManifest, fns: FnRegistry): void {
  if (!isBuiltinRegistry(fns)) throw new Error("Case-pure evaluation requires the admitted builtin function registry");
  for (const cell of manifest.cells) {
    if (cell.kind !== "input" && cell.kind !== "const" && cell.kind !== "fn" && cell.kind !== "expr") throw new Error(`Case-pure evaluation rejects ${cell.kind} cells`);
  }
}
function entrypoint(revision: ApplicationRevision, name: string): ApplicationRevision["entrypoints"][number] {
  const value = revision.entrypoints.find(item => item.name === name); if (!value) throw new Error(`Unknown application entrypoint ${name}`); return value;
}
function reasonList(...reasons: (string | false)[]): string[] { return [...new Set(reasons.filter((reason): reason is string => typeof reason === "string"))]; }

async function checkCompatibilityLoaded(_store: Store, previous: { revision: ApplicationRevision; manifests: Map<string, OrganismManifest> }, candidate: { revision: ApplicationRevision; manifests: Map<string, OrganismManifest> }): Promise<CompatibilityResult> {
  const reasons: string[] = [];
  if (previous.revision.application !== candidate.revision.application) reasons.push("application-identity");
  for (const key of ["schema", "queries", "views", "runtimeProfile", "evaluationPolicy"] as const) if (previous.revision[key] !== candidate.revision[key]) reasons.push(`changed-${key}`);
  const previousCaps = new Set(previous.revision.capabilityRequirements);
  if (candidate.revision.capabilityRequirements.some(capability => !previousCaps.has(capability))) reasons.push("capability-expansion");
  const oldNames = previous.revision.entrypoints.map(e => e.name), newNames = candidate.revision.entrypoints.map(e => e.name);
  if (!same(oldNames, newNames)) reasons.push("entrypoint-set");
  for (const name of oldNames) {
    const oldEntry = entrypoint(previous.revision, name), newEntry = entrypoint(candidate.revision, name);
    if (oldEntry.maxGenerations !== newEntry.maxGenerations) reasons.push(`changed-${name}-budget`);
    const oldManifest = previous.manifests.get(name), newManifest = candidate.manifests.get(name);
    if (!oldManifest || !newManifest || !same(oldManifest.interface ?? null, newManifest.interface ?? null)) reasons.push(`changed-${name}-interface`);
  }
  return { contract: "algal.application-compatibility.v1", previousRevision: digestCanonical(applicationJson(previous.revision)), candidateRevision: digestCanonical(applicationJson(candidate.revision)), status: reasons.length ? "incompatible" : "compatible", reasons };
}

export async function checkApplicationCompatibility(store: Store, previousRevisionRef: Digest, candidateRevisionRef: Digest): Promise<CompatibilityResult> {
  const previous = await loadRevision(store, applicationRef(previousRevisionRef));
  const candidate = await loadRevision(store, applicationRef(candidateRevisionRef));
  return checkCompatibilityLoaded(store, previous, candidate);
}

async function reportCases(report: FoundryReport, cases: EvaluationCaseSet, incumbent: Digest, candidate: Digest, store: Store): Promise<void> {
  const frozen = new Map(cases.cases.map(c => [c.id, c]));
  const candidateResult = report.candidates.find(c => c.manifestDigest === candidate);
  const incumbentResult = report.candidates.find(c => c.manifestDigest === incumbent);
  if (!candidateResult || !incumbentResult || report.candidates.length !== 2) throw new Error("Foundry report population is not exactly incumbent/candidate");
  const all = [...report.candidates.flatMap(c => c.cases), ...report.holdout.cases];
  if (all.length > 256) throw new Error("Foundry evidence exceeds case bound");
  for (const result of all) {
    const expected = frozen.get(result.id); if (!expected || expected.split !== result.split || !same(expected.args, result.args) || !same(expected.expect, result.expect)) throw new Error(`Foundry case ${result.id} differs from frozen case set`);
  }
  // IDs repeat across candidate populations; each result is checked against
  // the same frozen case definition above.
  const selection = cases.cases.filter(c => c.split !== "holdout");
  const holdout = cases.cases.filter(c => c.split === "holdout");
  for (const result of [incumbentResult, candidateResult]) {
    if (result.cases.length !== selection.length || result.cases.some(c => c.split === "holdout" || !selection.some(f => f.id === c.id))) throw new Error("Foundry candidate case population differs from frozen selection");
    const manifest = await store.getManifest(result.manifestDigest);
    if (!manifest?.interface) throw new Error("Foundry candidate manifest interface missing");
    for (const resultCase of result.cases) {
      const frozenCase = frozen.get(resultCase.id)!;
      const args: Record<string, Record<string, JsonValue>> = Object.create(null) as Record<string, Record<string, JsonValue>>;
      for (const [name, value] of Object.entries(frozenCase.args)) {
        const target = manifest.interface.inputs[name];
        if (!target) throw new Error(`Frozen case input ${name} is not in candidate interface`);
        (args[target.cell] ??= Object.create(null) as Record<string, JsonValue>)[target.port] = value;
      }
      const receiptValue = await store.getReceipt(resultCase.receiptDigest);
      if (!receiptValue) throw new Error("Foundry receipt missing during binding verification");
      if (!same(parseRunReceipt(receiptValue).args, args)) throw new Error(`Foundry receipt args differ for case ${resultCase.id}`);
    }
  }
  if (report.holdout.cases.length !== holdout.length || report.holdout.cases.some(c => c.split !== "holdout" || !holdout.some(f => f.id === c.id))) throw new Error("Foundry holdout differs from frozen holdout");
}

function acceptance(report: FoundryReport, incumbent: Digest, candidate: Digest, policy: EvaluationPolicy, compatibility: CompatibilityResult): Verdict {
  if (compatibility.status !== "compatible") return { status: "rejected", reasons: ["incompatible", ...compatibility.reasons] };
  const old = report.candidates.find(c => c.manifestDigest === incumbent), next = report.candidates.find(c => c.manifestDigest === candidate);
  if (!old || !next || report.promoted !== candidate) return { status: "rejected", reasons: ["selected-candidate-mismatch"] };
  const reasons: string[] = [];
  if (next.validation.passed <= old.validation.passed) reasons.push("no-improvement");
  if (next.cases.some(c => c.split === "validation" && !c.passed && old.cases.some(o => o.id === c.id && o.passed))) reasons.push("regression");
  if (policy.requireHoldoutPass && (report.holdout.total === 0 || report.holdout.passed !== report.holdout.total)) reasons.push("holdout-failed");
  if (next.cases.some(c => c.outcome !== "complete") || report.holdout.cases.some(c => c.outcome !== "complete")) reasons.push("incomplete-evaluation");
  const work = [...report.candidates.flatMap(c => c.cases), ...report.holdout.cases].reduce((n, c) => n + c.work.units, 0);
  if (work > policy.maxWork) reasons.push("budget-exhausted");
  const modelCalls = [...report.candidates.flatMap(c => c.cases), ...report.holdout.cases].reduce((n, c) => n + c.work.agentCalls, 0);
  if (modelCalls > policy.maxModelCalls) reasons.push("budget-exhausted");
  if (next.validation.passed === 0 || old.validation.total !== next.validation.total) reasons.push("insufficient-quality");
  return reasons.length ? { status: "rejected", reasons } : { status: "accepted", selectedManifest: candidate };
}

async function verifyBinding(store: Store, request: ApplicationEvaluationRequest, state: ApplicationState, report: FoundryReport, cases: EvaluationCaseSet, candidate: { revision: ApplicationRevision; manifests: Map<string, OrganismManifest> }, incumbent: { revision: ApplicationRevision; manifests: Map<string, OrganismManifest> }, fns: FnRegistry): Promise<void> {
  if (state.application !== candidate.revision.application || candidate.revision.parent !== state.revision) throw new Error("Parent state does not bind candidate revision");
  const oldEntry = entrypoint(incumbent.revision, request.entrypoint), newEntry = entrypoint(candidate.revision, request.entrypoint);
  pureManifest(incumbent.manifests.get(request.entrypoint)!, fns); pureManifest(candidate.manifests.get(request.entrypoint)!, fns);
  if (!report.candidates.some(c => c.manifestDigest === oldEntry.manifest) || !report.candidates.some(c => c.manifestDigest === newEntry.manifest)) throw new Error("Foundry report population is not the bound incumbent/candidate");
  await reportCases(report, cases, oldEntry.manifest, newEntry.manifest, store);
}

export async function evaluateApplicationRevision(store: Store, input: unknown, runtime: AdaptationRuntime): Promise<{ evaluationRef: Digest; evaluation: ApplicationEvaluation }> {
  const request = parseApplicationEvaluationRequest(input);
  const requestRef = await putApplicationRecord(store, request);
  const state = await getApplicationRecord(store, request.parentState, parseApplicationState);
  const candidate = await loadRevision(store, request.candidateRevision), incumbent = await loadRevision(store, state.revision);
  if (candidate.revision.parent !== state.revision) throw new Error("Candidate revision parent is not the application state revision");
  const policy = parseEvaluationPolicy(await optionalObject(store, request.policy));
  const cases = parseEvaluationCases(await optionalObject(store, request.cases));
  const scorerRecord = parseEvaluationScorer(await optionalObject(store, request.scorer));
  if (cases.cases.length > policy.maxCases) throw new Error("Evaluation case set exceeds policy bound");
  const old = entrypoint(incumbent.revision, request.entrypoint), next = entrypoint(candidate.revision, request.entrypoint);
  pureManifest(incumbent.manifests.get(request.entrypoint)!, runtime.fns); pureManifest(candidate.manifests.get(request.entrypoint)!, runtime.fns);
  const report = await runFoundry({ candidates: [incumbent.manifests.get(request.entrypoint)!, candidate.manifests.get(request.entrypoint)!], cases: cases.cases, fns: runtime.fns, store, executors: runtime.executors ?? [], ...(scorerRecord.scorer ? { scorer: scorerRecord.scorer } : {}) });
  const verified = await verifyFoundryReport(report, store, runtime.fns); if (!verified.ok) throw new Error(`Foundry report failed verification: ${verified.mismatches.join("; ")}`);
  await verifyBinding(store, request, state, report, cases, candidate, incumbent, runtime.fns);
  const compatibility = await checkCompatibilityLoaded(store, incumbent, candidate);
  const compatibilityRef = await putApplicationRecord(store, compatibility);
  const foundryReportRef = await putApplicationRecord(store, report);
  const verdict = acceptance(report, old.manifest, next.manifest, policy, compatibility);
  const evaluation: ApplicationEvaluation = { contract: "algal.application-evaluation.v1", request: requestRef, parentState: request.parentState, candidateRevision: request.candidateRevision, cases: request.cases, scorer: request.scorer, policy: request.policy, foundryReport: foundryReportRef, compatibility: compatibilityRef, verdict };
  const evaluationRef = await putApplicationRecord(store, evaluation);
  return { evaluationRef, evaluation };
}

export async function verifyApplicationEvaluation(store: Store, evaluationRef: Digest, expectedStateRef: Digest, runtime: AdaptationRuntime): Promise<{ evaluation: ApplicationEvaluation; verdict: Verdict; report: FoundryReport }> {
  const evaluation = await getApplicationRecord(store, evaluationRef, parseEvaluation);
  const request = await getApplicationRecord(store, evaluation.request, parseApplicationEvaluationRequest);
  if (request.parentState !== expectedStateRef || evaluation.parentState !== expectedStateRef) throw new Error("Evaluation parent state is stale");
  const state = await getApplicationRecord(store, expectedStateRef, parseApplicationState);
  const candidate = await loadRevision(store, request.candidateRevision), incumbent = await loadRevision(store, state.revision);
  const cases = parseEvaluationCases(await optionalObject(store, request.cases));
  const reportValue = await optionalObject(store, evaluation.foundryReport); const report = reportValue as unknown as FoundryReport;
  const verified = await verifyFoundryReport(report, store, runtime.fns); if (!verified.ok) throw new Error(`Foundry evidence is invalid: ${verified.mismatches.join("; ")}`);
  await verifyBinding(store, request, state, report, cases, candidate, incumbent, runtime.fns);
  const compatibility = await checkCompatibilityLoaded(store, incumbent, candidate);
  const storedCompatibility = await getApplicationRecord(store, evaluation.compatibility, parseCompatibility);
  if (!same(storedCompatibility, compatibility)) throw new Error("Stored compatibility evidence changed");
  const policy = parseEvaluationPolicy(await optionalObject(store, request.policy));
  const old = entrypoint(incumbent.revision, request.entrypoint), next = entrypoint(candidate.revision, request.entrypoint);
  const verdict = acceptance(report, old.manifest, next.manifest, policy, compatibility);
  if (!same(evaluation.verdict, verdict)) throw new Error("Stored acceptance is not reproducible");
  return { evaluation, verdict, report };
}

export async function admitApplicationActivation(store: Store, input: unknown, runtime: AdaptationRuntime): Promise<{ evaluation: ApplicationEvaluation; revision: Digest; state: Digest }> {
  const value = applicationObject(input, ["evaluation", "expectedState", "revision"]);
  const evaluation = digest(value.evaluation, "activation.evaluation"), expectedState = digest(value.expectedState, "activation.expectedState"), revision = digest(value.revision, "activation.revision");
  const checked = await verifyApplicationEvaluation(store, evaluation, expectedState, runtime);
  if (checked.verdict.status !== "accepted" || checked.evaluation.candidateRevision !== revision) throw new Error("Activation requires a reproducibly accepted candidate revision");
  return { evaluation: checked.evaluation, revision, state: expectedState };
}
