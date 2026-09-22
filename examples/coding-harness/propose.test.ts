import { expect, test } from "bun:test";
import { proposalEvidence } from "./propose";
import { BASELINE_POLICY, policyId } from "./protocol";

test("proposal admits only outcomes of the parent on development tasks", () => {
  const input = {
    split: { benchmark: "fixture", revision: "pinned", devTaskIds: ["dev"], holdoutTaskIds: ["holdout"] },
    parentPolicy: BASELINE_POLICY,
    outcomes: [{ taskId: "dev", repeat: 0, policyId: policyId(BASELINE_POLICY), status: "failure",
      durationMs: 20, paidCostUsd: null, inputTokens: null, outputTokens: null }],
  };
  expect(proposalEvidence(input).evidenceTaskIds).toEqual(["dev"]);
  expect(() => proposalEvidence({ ...input, outcomes: [{ ...input.outcomes[0], taskId: "holdout" }] })).toThrow("development");
  expect(() => proposalEvidence({ ...input, outcomes: [{ ...input.outcomes[0], policyId: "a".repeat(64) }] })).toThrow();
  expect(() => proposalEvidence({ ...input, verifierOutput: "hidden" })).toThrow("Unknown");
});
