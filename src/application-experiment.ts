/** Bounded experiment evidence: one closed record joining the full
 * adaptation evidence chain — proposals, evaluations, an optional comparison,
 * an optional selection policy, and an optional retained selection — for one
 * application, one parent state, one entrypoint, and one environment.
 *
 * Every cited record is replayed in full against the exact parent state before
 * minting and again on verification, so the experiment is a reproducible join,
 * never a hand-assembled citation list. `result` is retained metadata about
 * what the chain resolved to: `revision` names the winning candidate revision
 * the evidence selects (or null), and `promoted` is the producer's claim that
 * an activation actually committed it. Minting an experiment never performs an
 * activation — an experiment that selected nothing, or selected a candidate
 * that was not promoted, remains valid retained evidence. The record grants no
 * authority: activation still requires the reproduced accepted-evaluation
 * coverage and the host's own selection/restoration checks. When the default
 * host is offered an experiment as `activate`/`migrate`/`restore` evidence it
 * replays it like comparison evidence and requires `result.revision` to be the
 * committed revision. */
import {
  applicationId, applicationJson, applicationObject, applicationRef, applicationRefs,
  applicationTag, getApplicationRecord, nullableApplicationRef, parseApplicationRevision,
  parseApplicationState, putApplicationRecord,
} from "./application-contract";
import {
  parseApplicationEvaluationRequest, verifyApplicationEvaluation, type AdaptationRuntime,
} from "./application-adaptation";
import { verifyApplicationComparison, type ApplicationComparison } from "./application-comparison";
import { parseApplicationProposal, parseProposalRequest, verifyApplicationProposal } from "./application-proposal";
import { verifyApplicationSelection, verifyApplicationSelectionPolicy } from "./application-selection";
import { digestCanonical, type Digest } from "./digest";
import { canonicalize } from "./values";
import type { Store } from "./store";

export const EXPERIMENT_LIMITS = Object.freeze({ proposals: 8, evaluations: 8 });

export type ApplicationExperimentResult = {
  /** The producer's claim that an activation committed `revision`. */
  promoted: boolean;
  /** The winning candidate revision, or null when the chain selected none. */
  revision: Digest | null;
};
export type ApplicationExperiment = {
  contract: "algal.application-experiment.v1";
  application: string;
  parentState: Digest;
  entrypoint: string;
  environment: string;
  /** `algal.application-proposal.v1` references, sorted unique, at most 8. */
  proposals: Digest[];
  /** `algal.application-evaluation.v1` references, sorted unique, at most 8. */
  evaluations: Digest[];
  /** At most one `algal.application-comparison.v1`, joining exactly `evaluations`. */
  comparison: Digest | null;
  /** At most one `algal.application-selection-policy.v1` serving `environment`. */
  selectionPolicy: Digest | null;
  /** At most one `algal.application-selection.v1` under `selectionPolicy`. */
  selection: Digest | null;
  result: ApplicationExperimentResult;
};

export function parseApplicationExperiment(input: unknown): ApplicationExperiment {
  const v = applicationObject(input, ["contract", "application", "parentState", "entrypoint", "environment", "proposals", "evaluations", "comparison", "selectionPolicy", "selection", "result"]);
  applicationTag(v.contract, "algal.application-experiment.v1");
  const proposals = applicationRefs(v.proposals, EXPERIMENT_LIMITS.proposals);
  const evaluations = applicationRefs(v.evaluations, EXPERIMENT_LIMITS.evaluations);
  if (proposals.length + evaluations.length === 0) throw new Error("Experiment requires at least one evidence record");
  const comparison = nullableApplicationRef(v.comparison);
  const selectionPolicy = nullableApplicationRef(v.selectionPolicy);
  const selection = nullableApplicationRef(v.selection);
  if (selection !== null && selectionPolicy === null) throw new Error("Experiment selection requires a selection policy");
  const r = applicationObject(v.result, ["promoted", "revision"]);
  if (typeof r.promoted !== "boolean") throw new Error("Invalid experiment promotion flag");
  const result: ApplicationExperimentResult = { promoted: r.promoted, revision: nullableApplicationRef(r.revision) };
  if (result.promoted && result.revision === null) throw new Error("Experiment promotion requires a revision");
  return {
    contract: "algal.application-experiment.v1",
    application: applicationId(v.application), parentState: applicationRef(v.parentState),
    entrypoint: applicationId(v.entrypoint), environment: applicationId(v.environment),
    proposals, evaluations, comparison, selectionPolicy, selection, result,
  };
}

export type ProduceExperimentInput = {
  application: string;
  parentState: Digest;
  entrypoint: string;
  environment: string;
  proposals: Digest[];
  evaluations: Digest[];
  comparison: Digest | null;
  selectionPolicy: Digest | null;
  selection: Digest | null;
  result: ApplicationExperimentResult;
};

/** Replays every cited record against the parent state and derives the
 * canonical experiment. All join semantics live here, so the stored record is
 * exactly what verification reproduces. */
async function deriveApplicationExperiment(store: Store, input: ProduceExperimentInput, runtime: AdaptationRuntime): Promise<ApplicationExperiment> {
  const application = applicationId(input.application);
  const parentState = applicationRef(input.parentState);
  const entrypoint = applicationId(input.entrypoint);
  const environment = applicationId(input.environment);
  const proposals = input.proposals.map(applicationRef);
  const evaluations = input.evaluations.map(applicationRef);
  if (proposals.length > EXPERIMENT_LIMITS.proposals || evaluations.length > EXPERIMENT_LIMITS.evaluations) throw new Error("Experiment evidence bound exceeded");
  if (new Set(proposals).size !== proposals.length || new Set(evaluations).size !== evaluations.length) throw new Error("Experiment evidence must be unique");
  if (proposals.length + evaluations.length === 0) throw new Error("Experiment requires at least one evidence record");
  const comparison = input.comparison === null ? null : applicationRef(input.comparison);
  const selectionPolicy = input.selectionPolicy === null ? null : applicationRef(input.selectionPolicy);
  const selection = input.selection === null ? null : applicationRef(input.selection);
  if (selection !== null && selectionPolicy === null) throw new Error("Experiment selection requires a selection policy");
  if (input.result.promoted !== true && input.result.promoted !== false) throw new Error("Invalid experiment promotion flag");
  const resultRevision = input.result.revision === null ? null : applicationRef(input.result.revision);
  if (input.result.promoted && resultRevision === null) throw new Error("Experiment promotion requires a revision");

  // The parent state names the application; nothing may join across
  // applications or heads.
  const state = await getApplicationRecord(store, parentState, parseApplicationState);
  if (state.application !== application) throw new Error("Experiment parent state belongs to another application");

  // Proposals replay bit-for-bit: each must name this application and target
  // entrypoint, target this head's incumbent revision, and be anchored to this
  // parent state or — when the `propose` transition committed first — to its
  // immediate predecessor. The frozen request must carry the experiment
  // environment. Their candidates bound what may be selected.
  const proposalCandidates = new Set<Digest>();
  for (const reference of proposals) {
    const proposal = await getApplicationRecord(store, reference, parseApplicationProposal);
    if (proposal.application !== application || proposal.target !== entrypoint ||
        proposal.revision !== state.revision ||
        (proposal.parentState !== parentState && proposal.parentState !== state.previous)) {
      throw new Error("Experiment proposal does not bind this experiment");
    }
    await verifyApplicationProposal(store, reference, proposal.parentState, runtime);
    const request = await getApplicationRecord(store, proposal.request, parseProposalRequest);
    if (request.environment !== environment) throw new Error("Experiment proposal is not bound to this environment");
    for (const candidate of proposal.candidates) proposalCandidates.add(candidate.revision);
  }

  // Evaluations replay bit-for-bit: each request must carry this parent
  // state, entrypoint, and environment, all requests share the frozen
  // measurement set, and a measured candidate must come from a cited proposal
  // when proposals are part of the chain.
  const acceptedCandidates = new Set<Digest>();
  let shared: { cases: Digest; scorer: Digest; policy: Digest } | null = null;
  for (const reference of evaluations) {
    const checked = await verifyApplicationEvaluation(store, reference, parentState, runtime);
    const request = await getApplicationRecord(store, checked.evaluation.request, parseApplicationEvaluationRequest);
    if (request.parentState !== parentState || request.environment !== environment) {
      throw new Error("Experiment evaluation is not bound to this parent state and environment");
    }
    if (request.entrypoint !== entrypoint) throw new Error("Experiment evaluation measures another entrypoint");
    const candidate = await getApplicationRecord(store, request.candidateRevision, parseApplicationRevision);
    if (candidate.application !== application) throw new Error("Experiment candidate belongs to another application");
    if (proposals.length && !proposalCandidates.has(request.candidateRevision)) {
      throw new Error("Experiment evaluation measures no proposed candidate");
    }
    if (shared === null) shared = { cases: request.cases, scorer: request.scorer, policy: request.policy };
    else if (request.cases !== shared.cases || request.scorer !== shared.scorer || request.policy !== shared.policy) {
      throw new Error("Experiment evaluations must share cases, scorer, and policy");
    }
    if (checked.verdict.status === "accepted") acceptedCandidates.add(request.candidateRevision);
  }

  // An optional comparison must bind this experiment and join exactly the
  // cited evaluations — nothing more, nothing less.
  let compared: ApplicationComparison | null = null;
  let selectedRevision: Digest | null = null;
  if (comparison !== null) {
    compared = await verifyApplicationComparison(store, comparison, parentState, runtime);
    if (compared.application !== application || compared.entrypoint !== entrypoint || compared.environment !== environment) {
      throw new Error("Experiment comparison does not bind this experiment");
    }
    const joined = compared.results.map(row => row.evaluation).sort();
    const cited = [...evaluations].sort();
    if (joined.length !== cited.length || joined.some((ref, i) => ref !== cited[i])) {
      throw new Error("Experiment comparison does not join exactly the cited evaluations");
    }
    if (compared.selected !== null) selectedRevision = compared.results.find(row => row.manifest === compared!.selected)!.revision;
  }

  // An optional selection policy must bind this experiment and serve its
  // environment through exactly the cited comparison.
  if (selectionPolicy !== null) {
    const { policy } = await verifyApplicationSelectionPolicy(store, selectionPolicy, parentState, runtime);
    if (policy.application !== application || policy.entrypoint !== entrypoint) {
      throw new Error("Experiment selection policy does not bind this experiment");
    }
    const row = policy.selections.find(item => item.environment === environment);
    if (!row) throw new Error("Experiment selection policy does not serve this environment");
    if (comparison === null || row.comparison !== comparison) {
      throw new Error("Experiment selection policy names a different comparison");
    }
  }

  // An optional retained selection must resolve under the cited policy and
  // comparison and pick a candidate the cited proposals emitted.
  if (selection !== null) {
    const resolved = await verifyApplicationSelection(store, selection, parentState, runtime);
    if (resolved.application !== application || resolved.entrypoint !== entrypoint || resolved.environment !== environment) {
      throw new Error("Experiment selection does not bind this experiment");
    }
    if (resolved.policy !== selectionPolicy || resolved.comparison !== comparison) {
      throw new Error("Experiment selection is not under the cited policy and comparison");
    }
    if (!proposalCandidates.has(resolved.revision)) {
      throw new Error("Experiment selection is not among the cited proposals");
    }
    selectedRevision = resolved.revision;
  }

  // `result.revision` names the candidate the evidence selects. `promoted`
  // records that an activation actually committed — a claim retained with the
  // join, not an effect the experiment performs.
  if (resultRevision !== null) {
    if (selection !== null || compared !== null) {
      if (resultRevision !== selectedRevision) throw new Error("Experiment result is not the selected candidate");
    } else if (!acceptedCandidates.has(resultRevision)) {
      throw new Error("Experiment result names no accepted candidate");
    }
  }
  return {
    contract: "algal.application-experiment.v1", application, parentState, entrypoint, environment,
    proposals: [...proposals].sort(), evaluations: [...evaluations].sort(),
    comparison, selectionPolicy, selection,
    result: { promoted: input.result.promoted, revision: resultRevision },
  };
}

/** Derives and stores the experiment record. Producing the record is an
 * evidence join; it never activates the selected revision itself. */
export async function produceApplicationExperiment(
  store: Store,
  input: ProduceExperimentInput,
  runtime: AdaptationRuntime,
): Promise<{ experimentRef: Digest; experiment: ApplicationExperiment }> {
  const experiment = await deriveApplicationExperiment(store, input, runtime);
  return { experimentRef: await putApplicationRecord(store, experiment), experiment };
}

/** Replays a stored experiment: every cited record is re-verified against the
 * named parent state and the recomputed record must equal the stored one
 * byte-for-byte. */
export async function verifyApplicationExperiment(
  store: Store,
  experimentRef: Digest,
  expectedParentState: Digest,
  runtime: AdaptationRuntime,
): Promise<ApplicationExperiment> {
  const stored = await getApplicationRecord(store, experimentRef, parseApplicationExperiment);
  if (stored.parentState !== applicationRef(expectedParentState)) throw new Error("Experiment parent state is stale");
  const recomputed = await deriveApplicationExperiment(store, {
    application: stored.application, parentState: stored.parentState, entrypoint: stored.entrypoint,
    environment: stored.environment, proposals: stored.proposals, evaluations: stored.evaluations,
    comparison: stored.comparison, selectionPolicy: stored.selectionPolicy, selection: stored.selection,
    result: stored.result,
  }, runtime);
  if (canonicalize(applicationJson(recomputed)) !== canonicalize(applicationJson(stored))) {
    throw new Error("Experiment is not reproducible from its evidence");
  }
  return stored;
}

/** Binding check used by the default host when a revision-changing transition
 * cites an experiment: the record must name this application and the commit's
 * parent state, its entrypoint must exist in the committed revision, and its
 * `result.revision` must be exactly the committed revision — an experiment
 * that selected nothing, or another candidate, cannot attach to a transition
 * installing a different strategy. Full evidence replay is
 * `verifyApplicationExperiment`, which the default host runs first. */
export function checkExperimentBinding(
  stored: ApplicationExperiment,
  application: string,
  parentState: Digest,
  committed?: { digest: Digest; entrypoints: readonly { name: string; manifest: Digest }[] },
): void {
  if (stored.application !== application || stored.parentState !== parentState) {
    throw new Error("Experiment evidence does not bind this transition");
  }
  if (committed) {
    if (!committed.entrypoints.some(entry => entry.name === stored.entrypoint)) {
      throw new Error("Experiment entrypoint is not in the committed revision");
    }
    if (stored.result.revision === null || stored.result.revision !== committed.digest) {
      throw new Error("Experiment result does not name the committed revision");
    }
  }
}

/** Stable identity for an experiment record (content digest). */
export function experimentDigest(experiment: ApplicationExperiment): Digest {
  return digestCanonical(applicationJson(experiment));
}
