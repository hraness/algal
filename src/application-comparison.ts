/** Environment-attributed comparison of several evaluated alternatives for one
 * application entrypoint. Each candidate revision is measured by an ordinary
 * `algal.application-evaluation.v1` produced through the existing serial
 * incumbent-versus-candidate evaluator; this record joins those verdicts, the
 * shared frozen measurement set, and the host-declared environment label into
 * one retained, replayable comparison. The `selected` manifest must carry an
 * accepted verdict — a losing or incomplete alternative is retained evidence,
 * never a selection. The record grants no authority: activation still requires
 * the reproduced accepted evaluation, and restoration still requires the
 * explicit host restoration policy. */
import {
  applicationId, applicationJson, applicationList, applicationObject, applicationRef,
  applicationTag, getApplicationRecord, parseApplicationRevision, putApplicationRecord,
} from "./application-contract";
import {
  parseApplicationEvaluationRequest, verifyApplicationEvaluation,
  type AdaptationRuntime,
} from "./application-adaptation";
import { digestCanonical, type Digest } from "./digest";
import { canonicalize } from "./values";
import type { Store } from "./store";

export type ComparisonVerdict = "accepted" | "rejected" | "incomplete";
export type ApplicationComparisonResult = {
  /** Candidate revision evaluated against the incumbent. */
  revision: Digest;
  /** The manifest that revision selects for the compared entrypoint. */
  manifest: Digest;
  /** The reproduced `algal.application-evaluation.v1` record. */
  evaluation: Digest;
  verdict: ComparisonVerdict;
};
export type ApplicationComparison = {
  contract: "algal.application-comparison.v1";
  application: string;
  parentState: Digest;
  entrypoint: string;
  environment: string;
  cases: Digest;
  scorer: Digest;
  policy: Digest;
  /** Results sorted by candidate revision digest; revisions and manifests unique. */
  results: ApplicationComparisonResult[];
  /** The selected alternative's manifest, or null when nothing was accepted. */
  selected: Digest | null;
};

export const COMPARISON_LIMITS = Object.freeze({ results: 8 });

function parseResult(input: unknown): ApplicationComparisonResult {
  const v = applicationObject(input, ["revision", "manifest", "evaluation", "verdict"]);
  if (v.verdict !== "accepted" && v.verdict !== "rejected" && v.verdict !== "incomplete") throw new Error("Invalid comparison verdict");
  return { revision: applicationRef(v.revision), manifest: applicationRef(v.manifest), evaluation: applicationRef(v.evaluation), verdict: v.verdict };
}

export function parseApplicationComparison(input: unknown): ApplicationComparison {
  const v = applicationObject(input, ["contract", "application", "parentState", "entrypoint", "environment", "cases", "scorer", "policy", "results", "selected"]);
  applicationTag(v.contract, "algal.application-comparison.v1");
  const results = applicationList(v.results, COMPARISON_LIMITS.results, parseResult);
  if (!results.length) throw new Error("Comparison requires at least one result");
  if (results.some((r, i) => i > 0 && r.revision <= results[i - 1]!.revision)) throw new Error("Comparison results must be sorted by revision");
  if (new Set(results.map(r => r.manifest)).size !== results.length) throw new Error("Comparison manifests must be unique");
  if (new Set(results.map(r => r.evaluation)).size !== results.length) throw new Error("Comparison evaluations must be unique");
  const selected = v.selected === null ? null : applicationRef(v.selected);
  if (selected !== null && !results.some(r => r.manifest === selected && r.verdict === "accepted")) throw new Error("Comparison selection requires an accepted result");
  return {
    contract: "algal.application-comparison.v1",
    application: applicationId(v.application), parentState: applicationRef(v.parentState),
    entrypoint: applicationId(v.entrypoint), environment: applicationId(v.environment),
    cases: applicationRef(v.cases), scorer: applicationRef(v.scorer), policy: applicationRef(v.policy),
    results, selected,
  };
}

export type ProduceComparisonInput = {
  application: string;
  parentState: Digest;
  entrypoint: string;
  environment: string;
  /** Evaluation references measured under the same request fields; order is normalized away. */
  evaluations: Digest[];
  /** Manifest digest of the chosen alternative; requires an accepted verdict. */
  selected: Digest | null;
};

/** Recomputes every cited evaluation against the parent state and derives the
 * canonical comparison. Shared fields come from the evidence itself, so the
 * stored record is exactly what verification reproduces. */
async function deriveApplicationComparison(
  store: Store,
  input: { application: string; parentState: Digest; entrypoint: string; environment: string; evaluations: Digest[]; selected: Digest | null },
  runtime: AdaptationRuntime,
): Promise<ApplicationComparison> {
  const application = applicationId(input.application);
  const parentState = applicationRef(input.parentState);
  const entrypoint = applicationId(input.entrypoint);
  const environment = applicationId(input.environment);
  const evaluations = input.evaluations.map(applicationRef);
  if (!evaluations.length || evaluations.length > COMPARISON_LIMITS.results) throw new Error("Comparison evaluation bound exceeded");
  if (new Set(evaluations).size !== evaluations.length) throw new Error("Comparison evaluations must be unique");

  const results: ApplicationComparisonResult[] = [];
  let cases: Digest | null = null, scorer: Digest | null = null, policy: Digest | null = null;
  for (const evaluationRef of evaluations) {
    const checked = await verifyApplicationEvaluation(store, evaluationRef, parentState, runtime);
    const request = await getApplicationRecord(store, checked.evaluation.request, parseApplicationEvaluationRequest);
    if (request.parentState !== parentState || request.environment !== environment) {
      throw new Error("Comparison evaluation is not bound to this parent state and environment");
    }
    const candidate = await getApplicationRecord(store, request.candidateRevision, parseApplicationRevision);
    if (candidate.application !== application) throw new Error("Comparison candidate belongs to another application");
    const entry = candidate.entrypoints.find(e => e.name === entrypoint);
    if (!entry) throw new Error("Comparison entrypoint is not in the candidate revision");
    if (request.entrypoint !== entrypoint) throw new Error("Comparison evaluation measures another entrypoint");
    if (cases === null) { cases = request.cases; scorer = request.scorer; policy = request.policy; }
    else if (request.cases !== cases || request.scorer !== scorer || request.policy !== policy) {
      throw new Error("Comparison evaluations must share cases, scorer, and policy");
    }
    results.push({ revision: request.candidateRevision, manifest: entry.manifest, evaluation: evaluationRef, verdict: checked.verdict.status });
  }
  results.sort((a, b) => (a.revision < b.revision ? -1 : a.revision > b.revision ? 1 : 0));
  if (new Set(results.map(r => r.manifest)).size !== results.length) throw new Error("Comparison manifests must be unique");
  const selected = input.selected === null ? null : applicationRef(input.selected);
  if (selected !== null && !results.some(r => r.manifest === selected && r.verdict === "accepted")) {
    throw new Error("Comparison selection requires an accepted result");
  }
  return {
    contract: "algal.application-comparison.v1", application, parentState, entrypoint, environment,
    cases: cases!, scorer: scorer!, policy: policy!, results, selected,
  };
}

/** Derives and stores the comparison. All evidence is recomputed; a rejected
 * or incomplete verdict is retained but cannot be selected. */
export async function produceApplicationComparison(
  store: Store,
  input: ProduceComparisonInput,
  runtime: AdaptationRuntime,
): Promise<{ comparisonRef: Digest; comparison: ApplicationComparison }> {
  const comparison = await deriveApplicationComparison(store, input, runtime);
  return { comparisonRef: await putApplicationRecord(store, comparison), comparison };
}

/** Replays a stored comparison: every cited evaluation is re-verified against
 * the named parent state and the recomputed record must equal the stored one
 * byte-for-byte. */
export async function verifyApplicationComparison(
  store: Store,
  comparisonRef: Digest,
  expectedParentState: Digest,
  runtime: AdaptationRuntime,
): Promise<ApplicationComparison> {
  const stored = await getApplicationRecord(store, comparisonRef, parseApplicationComparison);
  if (stored.parentState !== applicationRef(expectedParentState)) throw new Error("Comparison parent state is stale");
  const recomputed = await deriveApplicationComparison(store, {
    application: stored.application, parentState: stored.parentState, entrypoint: stored.entrypoint,
    environment: stored.environment, evaluations: stored.results.map(r => r.evaluation), selected: stored.selected,
  }, runtime);
  if (canonicalize(applicationJson(recomputed)) !== canonicalize(applicationJson(stored))) {
    throw new Error("Comparison is not reproducible from its evidence");
  }
  return stored;
}

/** Binding check used by the default host when a transition cites a comparison
 * as evidence: the record must name this application and the commit's parent
 * state. Full evidence replay stays in `verifyApplicationComparison`. */
export function checkComparisonBinding(stored: ApplicationComparison, application: string, parentState: Digest): void {
  if (stored.application !== application || stored.parentState !== parentState) {
    throw new Error("Comparison evidence does not bind this transition");
  }
}

/** Stable identity for a comparison record (content digest). */
export function comparisonDigest(comparison: ApplicationComparison): Digest {
  return digestCanonical(applicationJson(comparison));
}
