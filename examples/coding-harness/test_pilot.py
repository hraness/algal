import argparse
import copy
import json
from pathlib import Path
import tempfile
import unittest

import pilot


class PilotTest(unittest.TestCase):
    def setUp(self):
        self.benchmark = pilot.read_json(pilot.HERE / "benchmark-pilot.json")
        self.baseline = {"policy": pilot.BASELINE, "policyId": "sha256:" + "a" * 64}
        self.candidate = {"policy": pilot.MANUAL_CANDIDATE, "policyId": "sha256:" + "b" * 64}
        self.row = pilot.row_plan("algal-fixed", "algal", "polyglot-c-py", self.baseline["policy"], self.baseline["policyId"])

    def result(self, reward=1):
        return {"task_name": self.row["taskId"], "exception_info": None,
                "agent_result": {"metadata": {"algal_harness": {
                    "status": "controller_completed", "controllerResult": {
                        "mode": "algal", "policyId": self.row["policyId"], "termination": "finished",
                        "verification": {"ok": True},
                        "accounting": {"billing": "existing-subscription", "incrementalPaidApiSpendUsd": 0}}}}},
                "verifier_result": {"rewards": {"reward": reward}}}

    def test_matrix_is_serial_sized_and_uses_only_the_declared_split(self):
        for mode, count in (("smoke", 1), ("paired-dev", 4), ("candidate-dev", 2)):
            rows = pilot.build_matrix(mode, self.benchmark, self.baseline, self.candidate, None)
            self.assertEqual(len(rows), count)
            self.assertTrue(all(row["taskId"] in self.benchmark["split"]["devTaskIds"] for row in rows))
        self.assertEqual(pilot.build_matrix("smoke", self.benchmark, self.baseline, self.candidate, None)[0]["taskId"], "regex-log")
        self.assertEqual(pilot.build_matrix("smoke", self.benchmark, self.baseline, self.candidate, None, "polyglot-c-py")[0]["taskId"], "polyglot-c-py")
        with self.assertRaisesRegex(ValueError, "development split"):
            pilot.build_matrix("smoke", self.benchmark, self.baseline, self.candidate, None, "cancel-async-tasks")
        with self.assertRaisesRegex(ValueError, "previously frozen"):
            pilot.build_matrix("heldout", self.benchmark, self.baseline, self.candidate, None)
        rows = pilot.build_matrix("heldout", self.benchmark, self.baseline, self.candidate, {"selection": self.candidate})
        self.assertEqual(len(rows), 6)
        self.assertTrue(all(row["taskId"] in self.benchmark["split"]["holdoutTaskIds"] for row in rows))

    def test_finish_never_overrides_independent_verifier(self):
        self.assertEqual(pilot.classify_trial(self.result(0), self.row)[0], "failure")
        self.assertEqual(pilot.classify_trial(self.result(1), self.row)[0], "success")
        result = self.result()
        result["verifier_result"] = None
        self.assertEqual(pilot.classify_trial(result, self.row)[0], "invalid")

    def test_uncertainty_or_bad_receipts_stay_invalid_even_with_passing_reward(self):
        for field, value in (("termination", "failed"), ("policyId", "other"), ("verification", {"ok": False})):
            result = self.result()
            result["agent_result"]["metadata"]["algal_harness"]["controllerResult"][field] = value
            self.assertEqual(pilot.classify_trial(result, self.row)[0], "invalid")
        result = self.result()
        result["exception_info"] = {"exception_type": "AgentTimeoutError"}
        self.assertEqual(pilot.classify_trial(result, self.row)[0], "invalid")

    def test_malformed_reward_never_passes(self):
        for reward in (True, "1", float("nan"), 0.5, None):
            self.assertEqual(pilot.classify_trial(self.result(reward), self.row)[0], "invalid")

    def test_collection_preserves_unknown_cost_and_invalid_missing_results(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            value = pilot.collect_trial(root, self.row, 50, 0)
            self.assertEqual(value["outcome"]["status"], "invalid")
            self.assertIsNone(value["outcome"]["paidCostUsd"])
            (root / "trial").mkdir()
            (root / "trial" / "result.json").write_text(json.dumps(self.result()))
            self.assertEqual(pilot.collect_trial(root, self.row, 60, 0)["outcome"]["status"], "success")
            self.assertEqual(pilot.collect_trial(root, self.row, 60, 1)["outcome"]["status"], "invalid")
            (root / "trial" / "result.json").write_text("broken")
            self.assertEqual(pilot.collect_trial(root, self.row, 60, 0)["outcome"]["status"], "invalid")

    def test_harbor_job_has_one_trial_no_retry_and_original_verifier(self):
        args = argparse.Namespace(output_dir=Path("/staging/jobs"), xcb_executable="/admitted/xcb", account="fixture",
                                  model="claude/sonnet/low", max_model_attempts=4, bun="/admitted/bun")
        config = pilot.job_config(args, self.row, Path("/staging/tasks/polyglot-c-py"))
        self.assertEqual(config["n_concurrent_trials"], 1)
        self.assertEqual(config["n_attempts"], 1)
        self.assertEqual(config["retry"], {"max_retries": 0})
        self.assertFalse(config["verifier"]["disable"])
        self.assertEqual(config["environment"]["type"], "docker")
        self.assertNotIn("mounts", config["environment"])
        self.assertNotIn("env", config["agents"][0])
        self.assertNotIn("ALGAL_HARNESS", json.dumps(config))
        self.assertNotIn("/admitted/xcb", json.dumps(config))
        host = pilot.controller_environment(args, self.row)
        self.assertEqual(json.loads(host["ALGAL_HARNESS_CONFIG_JSON"])["xcb"]["account"], "fixture")
        from harbor.models.job.config import JobConfig
        JobConfig.model_validate(config)

    def test_freeze_charges_proposal_and_all_candidates_and_rejects_overwrite(self):
        bun = "/Users/benguo/.bun/bin/bun"
        baseline = pilot.protocol(bun, {"op": "policy", "policy": pilot.BASELINE})
        candidate = pilot.protocol(bun, {"op": "policy", "policy": pilot.MANUAL_CANDIDATE})
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            current = {"fixed": "settings", "model": "claude/sonnet/low", "xcbExecutableSha256": "c" * 64}
            def report(arm, selected, status):
                rows = []
                for task in self.benchmark["split"]["devTaskIds"]:
                    row = pilot.row_plan(arm, "algal", task, selected["policy"], selected["policyId"])
                    row["outcome"] = {"taskId": task, "repeat": 0, "policyId": selected["policyId"], "status": status,
                                      "durationMs": 100, "paidCostUsd": None, "inputTokens": None, "outputTokens": None}
                    rows.append(row)
                return {"settingsId": pilot.digest(current), "complete": True, "episodes": rows}
            baseline_report = report("algal-fixed", baseline, "failure")
            pilot.write_json(root / "reports" / "paired-dev.json", baseline_report)
            pilot.write_json(root / "reports" / "candidate-dev.json", report("algal-candidate", candidate, "success"))
            proposal_path = root / "proposal.json"
            split = {**self.benchmark["split"], "devTaskIds": sorted(self.benchmark["split"]["devTaskIds"]),
                     "holdoutTaskIds": sorted(self.benchmark["split"]["holdoutTaskIds"])}
            proposal_record = {"schema": "algal.coding-harness.proposal.v1", "status": "admitted", "source": "model-generated",
                               "proposal": {"policy": candidate["policy"], "parentPolicyId": baseline["policyId"], "evidenceTaskIds": split["devTaskIds"]},
                               "evidence": {"split": split, "parentPolicy": baseline["policy"], "parentPolicyId": baseline["policyId"],
                                            "outcomes": [row["outcome"] for row in baseline_report["episodes"]], "evidenceTaskIds": split["devTaskIds"]},
                               "usage": {"durationMs": 75, "paidCostUsd": None, "inputTokens": None, "outputTokens": None},
                               "accounting": {"billing": "existing-subscription", "incrementalPaidApiSpendUsd": 0,
                                              "calls": 1, "completedCalls": 1, "model": current["model"], "executableDigest": current["xcbExecutableSha256"],
                                              "requestIds": ["fixture-request"], "costUsd": None, "inputTokens": None, "outputTokens": None}}
            pilot.write_json(proposal_path, proposal_record)
            args = argparse.Namespace(output_dir=root, bun=bun, frozen=None, proposal_record=proposal_path)
            for mutate in (
                lambda value: value.update(status="rejected"),
                lambda value: value["proposal"].update(parentPolicyId=candidate["policyId"]),
                lambda value: value["evidence"]["outcomes"][0].update(status="success"),
                lambda value: value["evidence"]["split"].update(revision="another"),
                lambda value: value["accounting"].update(executableDigest="d" * 64),
                lambda value: value["usage"].update(paidCostUsd=0),
            ):
                altered = copy.deepcopy(proposal_record)
                mutate(altered)
                pilot.write_json(proposal_path, altered)
                with self.assertRaises(ValueError):
                    pilot.freeze(args, self.benchmark, current)
                self.assertFalse((root / "frozen.json").exists())
            pilot.write_json(proposal_path, proposal_record)
            result = pilot.freeze(args, self.benchmark, current)
            self.assertEqual(result["policyId"], candidate["policyId"])
            self.assertEqual(result["searchUsage"]["records"], 5)
            self.assertEqual(result["searchUsage"]["totalDurationMs"], 475)
            self.assertIsNone(result["searchUsage"]["totalPaidCostUsd"])
            with self.assertRaisesRegex(ValueError, "already exists"):
                pilot.freeze(args, self.benchmark, current)
            bad = copy.deepcopy(current)
            bad["fixed"] = "changed"
            with self.assertRaisesRegex(ValueError, "unchanged settings"):
                pilot.freeze(args, self.benchmark, bad)


if __name__ == "__main__":
    unittest.main()
