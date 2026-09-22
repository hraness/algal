"""Offline checks for the memory experiment's independent evidence audit."""
import copy
import importlib.util
from pathlib import Path
import tempfile
import unittest

spec = importlib.util.spec_from_file_location("memory_pilot", Path(__file__).with_name("memory-pilot.py"))
memory_pilot = importlib.util.module_from_spec(spec)
spec.loader.exec_module(memory_pilot)


class MemoryPilotAuditTest(unittest.TestCase):
    def scope(self, task="first"):
        return {"sequenceId": "sequence", "taskId": task, "environmentId": "fixture", "dependencies": {}}

    def source(self, reuse="task"):
        return {"source": {"scope": self.scope(), "reuse": reuse}, "procedure": {"id": "tool", "dependencies": []}}

    def row(self):
        return {"owner": "arm-l", "arm": "logical", "storeDir": "/unused", "scope": self.scope("next"),
                "controller": {"terminalCalls": 0}, "trace": [], "memoryEvidence": {
                    "owner": "arm-l", "sourceRefs": ["retained"], "probes": [], "queries": [], "probeCalls": 0,
                    "initialInvalidatedRefs": ["retained"], "invalidatedRefs": ["retained"],
                    "initialMutationSeen": True, "mutationSeen": True}}

    def test_task_rename_does_not_revalidate_post_mutation_or_legacy_sources(self):
        observed = self.source()
        self.assertTrue(memory_pilot.applicable(observed, self.scope()))
        self.assertFalse(memory_pilot.applicable(observed, self.scope("next")))
        del observed["source"]["reuse"]
        self.assertFalse(memory_pilot.applicable(observed, self.scope("next")))
        self.assertTrue(memory_pilot.applicable(self.source("dependencies"), self.scope("next")))

    def test_audit_carries_invalidations_and_mutation_history_between_tasks(self):
        row = self.row()
        audit = memory_pilot.audit_episode(row, {"retained": self.source()}, set(), {"retained"}, True)
        self.assertEqual(audit["invalidated"], {"retained"})
        self.assertTrue(audit["mutationSeen"])
        for field, value in (("initialInvalidatedRefs", []), ("initialMutationSeen", False),
                             ("invalidatedRefs", []), ("mutationSeen", False)):
            changed = copy.deepcopy(row)
            changed["memoryEvidence"][field] = value
            with self.assertRaisesRegex(ValueError, "mutation|invalidation"):
                memory_pilot.audit_episode(changed, {"retained": self.source()}, set(), {"retained"}, True)

    def test_audit_rejects_history_label_that_revives_an_invalidated_source(self):
        row = self.row()
        row["trace"] = [{"kind": "memory", "action": {"type": "memory.read"}, "result": {
            "status": "read", "observations": [{"sourceRef": "retained", "applicability": "current"}]}}]
        with self.assertRaisesRegex(ValueError, "applicability"):
            memory_pilot.audit_episode(row, {"retained": self.source("dependencies")}, set(), {"retained"}, True)

    def test_summary_preserves_unknown_native_work_in_complete_comparison(self):
        families = [{"id": f"family-{index}"} for index in range(4)]
        freeze_id = "frozen-test-plan"

        def row(arm, family, episode):
            owner = f"{arm}-{family}"
            return {"jobName": f"{owner}-{episode}", "owner": owner, "arm": arm,
                    "family": family, "episode": episode, "freezeId": freeze_id,
                    "status": "failure", "durationMs": 0, "accounting": {"modelCalls": 1},
                    "storeDir": "/unused", "scope": self.scope(), "trace": [],
                    "controller": {"terminalCalls": 0}, "memoryEvidence": {
                        "owner": owner, "sourceRefs": [], "probes": [], "queries": [],
                        "probeCalls": 0, "nativeWork": 0, "nativeWorkIsLowerBound": False}}

        episodes = [row(arm, family["id"], episode) for family in families
                    for episode in (1, 2) for arm in memory_pilot.ARMS]
        seeds = [row("seed", family["id"], 0) for family in families]
        plan = {"freezeId": freeze_id, "manifest": {"families": families},
                "matrix": [{key: value[key] for key in ("jobName", "owner", "arm", "family", "episode")}
                           for value in episodes]}
        with tempfile.TemporaryDirectory() as directory:
            store = Path(directory)
            (store / "records").mkdir()

            def put(value):
                ref = memory_pilot.pilot.digest(value)
                (store / "records" / (ref[7:] + ".json")).write_bytes(memory_pilot.pilot.canonical(value))
                return ref

            snapshot = put({"contract": "algal.memory.v1", "facts": []})
            program = put({"contract": "algal.query.v1", "rules": [],
                           "query": {"relation": "answer", "terms": []}, "limits": {"maxWork": 1}})
            exhausted = next(value for value in episodes if value["arm"] == "logical")
            exhausted["storeDir"] = str(store)
            exhausted["trace"] = [{"kind": "memory", "action": {"type": "memory.query", "procedure": "factor"},
                                   "result": {"status": "exhausted", "snapshotRef": snapshot,
                                              "programRef": program, "reason": "native-query"}}]
            exhausted["memoryEvidence"].update({"nativeCalls": 1, "nativeWorkIsLowerBound": True,
                "queries": [{"procedure": "factor", "scope": self.scope(), "sourceRefs": [],
                             "snapshotRef": snapshot, "programRef": program, "status": "exhausted",
                             "verified": False, "work": None}],
                "outcomes": [{"status": "exhausted"}]})
            report = memory_pilot.summarize(plan, episodes, seeds)

        self.assertTrue(report["complete"])
        self.assertTrue(report["provenanceAudit"]["complete"])
        self.assertEqual(report["scores"]["logical"]["nativeWork"], 0)
        self.assertTrue(report["scores"]["logical"]["nativeWorkIsLowerBound"])
        for arm in ("none", "episodic"):
            self.assertFalse(report["scores"][arm]["nativeWorkIsLowerBound"])

if __name__ == "__main__":
    unittest.main()
