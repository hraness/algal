/** Environment-keyed selection among compared alternatives. An
 * `algal.application-selection-policy.v1` record is pure data: for one
 * entrypoint at one parent state it maps an environment label to a retained
 * comparison and the manifest that comparison selected. Authority stays
 * with the host's `selectionEnvironment` option — a policy in CAS grants
 * nothing, and under a host that names an environment it can only narrow
 * which accepted alternative may be installed. Every row is replayed through
 * `verifyApplicationComparison`, so a selection is never trusted on its own. */
import {
  applicationId, applicationList, applicationObject, applicationRef, applicationTag, getApplicationRecord,
} from "./application-contract";
import type { AdaptationRuntime } from "./application-adaptation";
import { verifyApplicationComparison, type ApplicationComparison } from "./application-comparison";
import type { Digest } from "./digest";
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
