import { describe, expect, test } from "bun:test";
import {
  BASELINE_POLICY, DEFAULT_CANDIDATE_POLICIES,
  parseCandidateProposal, parseExperimentSplit, parseHarnessPolicy, parseTrialOutcome,
  policyId, selectAndFreezePolicy, selectContext, summarizeHoldout, summarizeOutcomes,
  type ExperimentSplit, type HarnessPolicy, type TrialOutcome,
} from "./protocol";

const split: ExperimentSplit = {
  benchmark: "pilot-fixture", revision: "pinned-revision",
  devTaskIds: ["dev-b", "dev-a"], holdoutTaskIds: ["holdout-b", "holdout-a"],
};
const alternate = DEFAULT_CANDIDATE_POLICIES[1]!;

function outcome(policy: HarnessPolicy, taskId: string, status: TrialOutcome["status"] = "success", repeat = 0): TrialOutcome {
  return { taskId, repeat, policyId: policyId(policy), status, durationMs: 100, paidCostUsd: null, inputTokens: null, outputTokens: null };
}

function candidate(policy: HarnessPolicy, status: TrialOutcome["status"] = "success") {
  return { policy, outcomes: split.devTaskIds.map((id) => outcome(policy, id, status)) };
}

describe("coding harness policy", () => {
  test("canonical identity survives object-key order but changes with behavior", () => {
    const reordered = { recoveryPolicy: "diagnose-once", testPolicy: "focused-first", context: { mode: "full" }, version: 1 };
    expect(policyId(parseHarnessPolicy(reordered))).toBe(policyId(BASELINE_POLICY));
    expect(policyId(alternate)).not.toBe(policyId(BASELINE_POLICY));
  });

  test("rejects executable/unknown fields and malformed or unbounded policies", () => {
    expect(() => parseHarnessPolicy({ ...BASELINE_POLICY, code: "return true" })).toThrow("unknown keys");
    expect(() => parseHarnessPolicy({ ...BASELINE_POLICY, context: { mode: "full", maxMessages: 4 } })).toThrow("unknown keys");
    for (const maxMessages of [1, 129, 4.5, Infinity, "12"]) {
      expect(() => parseHarnessPolicy({ ...BASELINE_POLICY, context: { mode: "recent-with-first", maxMessages } })).toThrow();
    }
    expect(() => parseHarnessPolicy({ ...BASELINE_POLICY, recoveryPolicy: "run-anything" })).toThrow();
    expect(() => parseHarnessPolicy(null)).toThrow();
  });

  test("context projection keeps original instruction and latest observations", () => {
    const policy = { ...BASELINE_POLICY, context: { mode: "recent-with-first" as const, maxMessages: 3 } };
    const messages = ["instruction", "old-action", "old-output", "new-action", "new-output"];
    expect(selectContext(messages, policy)).toEqual(["instruction", "new-action", "new-output"]);
    expect(selectContext(messages, BASELINE_POLICY)).toEqual(messages);
    expect(selectContext([], policy)).toEqual([]);
    expect(() => selectContext(Array.from({ length: 129 }, (_, i) => i), policy)).toThrow("128 messages");
  });
});

describe("development/holdout separation", () => {
  test("canonical split rejects duplicate and overlapping task identities", () => {
    expect(parseExperimentSplit(split).devTaskIds).toEqual(["dev-a", "dev-b"]);
    expect(() => parseExperimentSplit({ ...split, devTaskIds: ["dev-a", "dev-a"] })).toThrow("unique");
    expect(() => parseExperimentSplit({ ...split, holdoutTaskIds: ["dev-a"] })).toThrow("overlap");
    expect(() => parseExperimentSplit({ ...split, devTaskIds: [] })).toThrow("nonempty");
    expect(() => parseExperimentSplit({ ...split, other: [] })).toThrow("unknown keys");
  });

  test("candidate proposal accepts only bounded policies with development evidence", () => {
    const proposal = { policy: alternate, parentPolicyId: policyId(BASELINE_POLICY), evidenceTaskIds: ["dev-b"] };
    expect(parseCandidateProposal(proposal, split).policy).toEqual(alternate);
    expect(() => parseCandidateProposal({ ...proposal, evidenceTaskIds: ["holdout-a"] }, split)).toThrow("development tasks only");
    expect(() => parseCandidateProposal({ ...proposal, evidenceTaskIds: ["unknown"] }, split)).toThrow("development tasks only");
    expect(() => parseCandidateProposal({ ...proposal, rationale: "arbitrary prompt injection" }, split)).toThrow("unknown keys");
    expect(() => parseCandidateProposal({ ...proposal, parentPolicyId: "untracked" }, split)).toThrow("sha256");
  });

  test("selection freezes development winner and counts all search expenditure", () => {
    const baseline = candidate(BASELINE_POLICY, "failure");
    const winner = candidate(alternate);
    baseline.outcomes[0]!.paidCostUsd = 0.5;
    const frozen = selectAndFreezePolicy({
      split, candidates: [baseline, winner],
      searchOverhead: [{ durationMs: 50, paidCostUsd: 0.25, inputTokens: 20, outputTokens: 10 }],
    });
    expect(frozen.policyId).toBe(policyId(alternate));
    expect(Object.isFrozen(frozen.policy)).toBe(true);
    expect(Object.isFrozen(frozen.policy.context)).toBe(true);
    expect(frozen.searchUsage.records).toBe(5);
    expect(frozen.searchUsage.totalDurationMs).toBe(450);
    expect(frozen.searchUsage.knownPaidCostUsd).toBe(0.75);
    expect(frozen.searchUsage.totalPaidCostUsd).toBeNull();
    expect(frozen.searchUsage.unknownCostRecords).toBe(3);
    expect(frozen.searchUsage.totalInputTokens).toBeNull();
    const reversed = selectAndFreezePolicy({ split, candidates: [winner, baseline] });
    expect(reversed.policyId).toBe(frozen.policyId);
    expect(reversed.developmentEvidenceId).toBe(frozen.developmentEvidenceId);
  });

  test("rejects selection using holdout, wrong policy, missing cases, unequal repeats or no grades", () => {
    const bad = candidate(BASELINE_POLICY);
    bad.outcomes[0] = outcome(BASELINE_POLICY, "holdout-a");
    expect(() => selectAndFreezePolicy({ split, candidates: [bad] })).toThrow("development tasks only");
    bad.outcomes[0] = outcome(alternate, "dev-b");
    expect(() => selectAndFreezePolicy({ split, candidates: [bad] })).toThrow("candidate identity");
    expect(() => selectAndFreezePolicy({ split, candidates: [{ policy: BASELINE_POLICY, outcomes: [outcome(BASELINE_POLICY, "dev-a")] }] })).toThrow("missing development");
    const extra = candidate(alternate);
    extra.outcomes.push(outcome(alternate, "dev-a", "success", 1));
    expect(() => selectAndFreezePolicy({ split, candidates: [candidate(BASELINE_POLICY), extra] })).toThrow("matrices differ");
    expect(() => selectAndFreezePolicy({ split, candidates: [extra] })).toThrow("consecutive repeats");
    expect(() => selectAndFreezePolicy({ split, candidates: [candidate(BASELINE_POLICY, "uncertain")] })).toThrow("insufficient");
  });

  test("holdout requires frozen policy, unchanged split and complete balanced task matrix", () => {
    const frozen = selectAndFreezePolicy({ split, candidates: [candidate(BASELINE_POLICY)] });
    const heldout = split.holdoutTaskIds.map((id) => outcome(BASELINE_POLICY, id));
    expect(summarizeHoldout(split, frozen, heldout).successRate).toBe(1);
    expect(() => summarizeHoldout(split, frozen, [outcome(BASELINE_POLICY, "dev-a")])).toThrow("held-out tasks");
    expect(() => summarizeHoldout(split, frozen, [outcome(alternate, "holdout-a")])).toThrow("frozen policy");
    expect(() => summarizeHoldout(split, { ...frozen, policy: alternate }, heldout)).toThrow("identity changed");
    expect(() => summarizeHoldout({ ...split, revision: "different" }, frozen, heldout)).toThrow("identity changed");
    expect(() => summarizeHoldout(split, frozen, heldout.slice(1))).toThrow("missing tasks");
    expect(() => summarizeHoldout(split, frozen, [...heldout, outcome(BASELINE_POLICY, "holdout-a", "success", 1)])).toThrow("consecutive repeats");
  });
});

describe("experiment evidence accounting", () => {
  test("invalid and uncertain outcomes stay visible and never inflate success rate", () => {
    const values = ["success", "failure", "invalid", "uncertain"].map((status, repeat) => outcome(BASELINE_POLICY, "dev-a", status as TrialOutcome["status"], repeat));
    const summary = summarizeOutcomes(values);
    expect(summary.successRate).toBe(0.25);
    expect(summary.gradedSuccessRate).toBe(0.5);
    expect(summary.invalid).toBe(1);
    expect(summary.uncertain).toBe(1);
    expect(summary.usage.totalPaidCostUsd).toBeNull();
    expect(summary.usage.knownPaidCostUsd).toBe(0);
    expect(summary.usage.unknownCostRecords).toBe(4);
    expect(summary.usage.totalInputTokens).toBeNull();
    expect(summarizeOutcomes([]).successRate).toBeNull();
  });

  test("malformed or duplicate outcomes are rejected before scoring", () => {
    const valid = outcome(BASELINE_POLICY, "dev-a");
    expect(() => summarizeOutcomes([valid, valid])).toThrow("duplicate");
    for (const fields of [
      { status: "probably" }, { repeat: -1 }, { repeat: 32 }, { durationMs: -1 },
      { paidCostUsd: NaN }, { paidCostUsd: -1 }, { inputTokens: 1.5 },
      { outputTokens: "unknown" }, { policyId: "baseline" }, { judgeNotes: "success" },
    ]) expect(() => parseTrialOutcome({ ...valid, ...fields })).toThrow();
    const { paidCostUsd: _omitted, ...missing } = valid;
    expect(() => parseTrialOutcome(missing)).toThrow("missing required");
  });
});
