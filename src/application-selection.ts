/** Environment-keyed selection among compared alternatives. An
 * `algal.application-selection-policy.v1` record is pure data: for one
 * entrypoint at one parent state it maps an environment label to a retained
 * comparison and the manifest that comparison selected. Authority stays
 * with the host's `selectionEnvironment` option — a policy in CAS grants
 * nothing, and under a host that names an environment it can only narrow
 * which accepted alternative may be installed. Every row is replayed through
 * `verifyApplicationComparison`, so a selection is never trusted on its own. */
import {
  applicationId, applicationJson, applicationList, applicationObject, applicationRef, applicationTag, getApplicationRecord, putApplicationRecord,
} from "./application-contract";
import type { AdaptationRuntime } from "./application-adaptation";
import { verifyApplicationComparison, type ApplicationComparison } from "./application-comparison";
import type { Digest } from "./digest";
import { canonicalize } from "./values";
import type { Store } from "./store";

export const SELECTION_LIMITS = Object.freeze({ selections: 16 });

export type ApplicationSelectionRow = { environment: string; comparison: Digest; manifest: Digest };
export type ApplicationSelectionPolicy = {
  contract: "algal.application-selection-policy.v1";
  application: string;
  /** Comparisons are only verifiable against their parent state. */
  parentState: Digest;
  entrypoint: string;
  /** 1..16 rows sorted unique by environment. */
  selections: ApplicationSelectionRow[];
};
export type ApplicationSelection = { policy: ApplicationSelectionPolicy; row: ApplicationSelectionRow; comparison: ApplicationComparison; manifest: Digest };

export function parseApplicationSelectionPolicy(input: unknown): ApplicationSelectionPolicy {
  const v = applicationObject(input, ["contract", "application", "parentState", "entrypoint", "selections"]);
  applicationTag(v.contract, "algal.application-selection-policy.v1");
  const selections = applicationList(v.selections, SELECTION_LIMITS.selections, row => {
    const r = applicationObject(row, ["environment", "comparison", "manifest"]);
    return { environment: applicationId(r.environment), comparison: applicationRef(r.comparison), manifest: applicationRef(r.manifest) };
  });
  if (!selections.length) throw new Error("Selection policy requires at least one row");
  if (selections.some((row, i) => i > 0 && row.environment <= selections[i - 1]!.environment)) throw new Error("Selection rows must be sorted and unique by environment");
  return { contract: "algal.application-selection-policy.v1", application: applicationId(v.application), parentState: applicationRef(v.parentState), entrypoint: applicationId(v.entrypoint), selections };
}

/** Replays every row: the cited comparison must verify against the policy's
 * parent state, name the same application, entrypoint and environment, and
 * have selected exactly the row's manifest. */
export async function verifyApplicationSelectionPolicy(store: Store, policyRef: Digest, expectedParentState: Digest, runtime: AdaptationRuntime): Promise<{ policy: ApplicationSelectionPolicy; comparisons: Map<string, ApplicationComparison> }> {
  const policy = await getApplicationRecord(store, policyRef, parseApplicationSelectionPolicy);
  if (policy.parentState !== applicationRef(expectedParentState)) throw new Error("Selection policy parent state is stale");
  const comparisons = new Map<string, ApplicationComparison>();
  for (const row of policy.selections) {
    const comparison = await verifyApplicationComparison(store, row.comparison, policy.parentState, runtime);
    if (comparison.application !== policy.application || comparison.entrypoint !== policy.entrypoint || comparison.environment !== row.environment) throw new Error("Selection row comparison does not bind this policy");
    if (comparison.selected === null || comparison.selected !== row.manifest) throw new Error("Selection row does not name the comparison's selected manifest");
    comparisons.set(row.environment, comparison);
  }
  return { policy, comparisons };
}

/** Resolves the strategy a verified policy selects for one environment. */
export async function selectApplicationStrategy(store: Store, policyRef: Digest, environment: string, expectedParentState: Digest, runtime: AdaptationRuntime): Promise<ApplicationSelection> {
  const label = applicationId(environment);
  const { policy, comparisons } = await verifyApplicationSelectionPolicy(store, policyRef, expectedParentState, runtime);
  const row = policy.selections.find(item => item.environment === label);
  if (!row) throw new Error("Selection policy has no row for this environment");
  return { policy, row, comparison: comparisons.get(label)!, manifest: row.manifest };
}

/** `algal.application-selection.v1` — the retained resolution of one policy
 * row: under this policy and environment the named comparison selected this
 * manifest, installed by this candidate revision. Pure evidence like the
 * policy it cites: it carries no authority and is replayed in full before any
 * use. */
export type ApplicationSelectionRecord = {
  contract: "algal.application-selection.v1";
  application: string;
  parentState: Digest;
  entrypoint: string;
  environment: string;
  /** The `algal.application-selection-policy.v1` this resolution names. */
  policy: Digest;
  /** The row's comparison, which must have selected `manifest`. */
  comparison: Digest;
  manifest: Digest;
  /** The comparison result row's candidate revision for `manifest`. */
  revision: Digest;
};

export function parseApplicationSelectionRecord(input: unknown): ApplicationSelectionRecord {
  const v = applicationObject(input, ["contract", "application", "parentState", "entrypoint", "environment", "policy", "comparison", "manifest", "revision"]);
  applicationTag(v.contract, "algal.application-selection.v1");
  return {
    contract: "algal.application-selection.v1", application: applicationId(v.application),
    parentState: applicationRef(v.parentState), entrypoint: applicationId(v.entrypoint), environment: applicationId(v.environment),
    policy: applicationRef(v.policy), comparison: applicationRef(v.comparison), manifest: applicationRef(v.manifest), revision: applicationRef(v.revision),
  };
}

type ProduceSelectionInput = { policy: Digest; environment: string; expectedParentState: Digest };

/** Recomputes the policy's row for `environment` and derives the canonical
 * selection record: the selected manifest's accepted result row supplies the
 * winning candidate revision. */
async function deriveApplicationSelection(store: Store, input: ProduceSelectionInput, runtime: AdaptationRuntime): Promise<ApplicationSelectionRecord> {
  const policyRef = applicationRef(input.policy);
  const environment = applicationId(input.environment);
  const parentState = applicationRef(input.expectedParentState);
  const { policy, row, comparison } = await selectApplicationStrategy(store, policyRef, environment, parentState, runtime);
  const result = comparison.results.find(item => item.manifest === row.manifest && item.verdict === "accepted");
  if (!result) throw new Error("Selection policy does not resolve an accepted candidate");
  return {
    contract: "algal.application-selection.v1", application: policy.application, parentState: policy.parentState,
    entrypoint: policy.entrypoint, environment, policy: policyRef, comparison: row.comparison, manifest: row.manifest, revision: result.revision,
  };
}

/** Derives and stores the resolved selection record. */
export async function produceApplicationSelection(store: Store, input: ProduceSelectionInput, runtime: AdaptationRuntime): Promise<{ selectionRef: Digest; selection: ApplicationSelectionRecord }> {
  const selection = await deriveApplicationSelection(store, input, runtime);
  return { selectionRef: await putApplicationRecord(store, selection), selection };
}

/** Replays a stored selection: the cited policy must verify against the named
 * parent state and the recomputed record must equal the stored one
 * byte-for-byte. */
export async function verifyApplicationSelection(store: Store, selectionRef: Digest, expectedParentState: Digest, runtime: AdaptationRuntime): Promise<ApplicationSelectionRecord> {
  const stored = await getApplicationRecord(store, selectionRef, parseApplicationSelectionRecord);
  if (stored.parentState !== applicationRef(expectedParentState)) throw new Error("Selection parent state is stale");
  const recomputed = await deriveApplicationSelection(store, { policy: stored.policy, environment: stored.environment, expectedParentState: stored.parentState }, runtime);
  if (canonicalize(applicationJson(recomputed)) !== canonicalize(applicationJson(stored))) {
    throw new Error("Selection is not reproducible from its evidence");
  }
  return stored;
}
