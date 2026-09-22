"""Offline checks for the memory experiment's independent evidence audit."""
import copy
import importlib.util
from pathlib import Path
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


if __name__ == "__main__":
    unittest.main()
