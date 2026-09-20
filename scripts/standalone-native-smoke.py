#!/usr/bin/env python3
"""Exercise an extracted native CLI without repository files, Bun, or Cargo."""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess
import tempfile


def run(binary, directory, *args, store=True, expected_failure=False, timeout=20, path="/usr/bin:/bin"):
    result = subprocess.run([str(binary), *args, *(["--dir", str(directory / "state")] if store else [])],
                            cwd=directory, capture_output=True, text=True, timeout=timeout,
                            env={"PATH": path, "HOME": str(directory)})
    if expected_failure:
        assert result.returncode != 0, f"native smoke accepted invalid input: {args}"
        return None
    if result.returncode:
        raise RuntimeError(f"native smoke command failed: {args}: {result.stderr[:4096]}")
    if len(result.stdout.encode()) > 1_048_576:
        raise RuntimeError("native smoke output limit exceeded")
    return json.loads(result.stdout)


def execution_files(root):
    """Check retained VM state, excluding derived reports and host review leases."""
    files = sorted(path for path in (root / "store").rglob("*") if path.is_file())
    assert len(files) <= 512, "workbench smoke exceeded its retained file bound"
    assert sum(path.stat().st_size for path in files) <= 16_777_216
    assert all(not path.is_symlink() for path in files)
    return {str(path.relative_to(root)): hashlib.sha256(path.read_bytes()).hexdigest() for path in files}


def publication_count(root):
    return len(list((root / "store" / "mailboxes" / "publications" / "messages").glob("*.json")))


def native_report(root, status):
    report = root / "report.html"
    assert report.is_file() and not report.is_symlink()
    assert report.stat().st_size <= 8_388_608
    html = report.read_text()
    assert html.lower().startswith("<!doctype html>") and "algal.demo-report.v1" in html
    assert "__ALGAL_REPORT_JSON__" not in html
    assert json.loads((root / "report.json").read_text())["status"] == status


def workbench_smoke(binary, directory):
    # Every action is a fresh native process with no executable available on PATH.
    def native(*args, **options):
        return run(binary, directory, "demo", *args, store=False, path="", **options)

    root = directory / "review"
    supplied = {"subject": "Package acceptance evidence", "claim": "requires human review",
                "untrusted": "</script><script>native-smoke-untrusted()</script>"}
    evidence_input = directory / "review-input.json"
    evidence_input.write_text(json.dumps(supplied))
    waiting = native("start", str(root), "--evidence", str(evidence_input))
    assert waiting["contract"] == "algal.demo-report.v1" and waiting["status"] == "waiting"
    assert waiting["stage"] == "suspended" and waiting["evidence"]["value"] == supplied
    assert waiting["counters"] == {"decisions": 1, "proposals": 1, "publications": 0}
    assert waiting["verification"]["ok"] is True
    assert Path(waiting["commands"]["approve"][0]).resolve() == binary
    native_report(root, "waiting")
    assert supplied["untrusted"] not in (root / "report.html").read_text()
    before = execution_files(root)
    for _ in range(2):
        idle = native("inspect", str(root))
        assert idle["status"] == "waiting" and idle["verification"] == waiting["verification"]
        assert idle["counters"] == waiting["counters"]
    assert execution_files(root) == before, "idle inspection advanced retained VM state"

    proposal = waiting["proposal"]["digest"]
    action = "publish-local-report"
    for claimed_proposal, claimed_action in [("sha256:" + "0" * 64, action), (proposal, "publish-elsewhere")]:
        native("approve", str(root), "--proposal", claimed_proposal, "--action", claimed_action,
               expected_failure=True)
        assert not (root / "decision.json").exists() and publication_count(root) == 0
        assert execution_files(root) == before, "rejected approval created a new execution effect"

    approved = native("approve", str(root), "--proposal", proposal, "--action", action)
    assert approved["status"] == "approved" and approved["stage"] == "complete"
    assert approved["counters"] == {"decisions": 1, "proposals": 1, "publications": 1}
    assert approved["approval"]["proposalDigest"] == proposal
    assert publication_count(root) == 1
    assert json.loads((root / "publication.json").read_text()) == waiting["proposal"]["value"]
    native_report(root, "approved")
    settled = execution_files(root)
    repeated = native("approve", str(root), "--proposal", proposal, "--action", action)
    assert repeated["verification"] == approved["verification"] and repeated["counters"] == approved["counters"]
    assert publication_count(root) == 1 and execution_files(root) == settled
    native("deny", str(root), "--proposal", proposal, "--action", action, expected_failure=True)
    assert execution_files(root) == settled, "conflicting decision changed settled execution"

    denied_root = directory / "denied-review"
    denied_start = native("start", str(denied_root))
    denied_proposal = denied_start["proposal"]["digest"]
    denied = native("deny", str(denied_root), "--proposal", denied_proposal, "--action", action)
    assert denied["status"] == "denied" and denied["stage"] == "complete"
    assert denied["counters"]["publications"] == 0 and publication_count(denied_root) == 0
    assert not (denied_root / "publication.json").exists()
    native_report(denied_root, "denied")

    capsule = native("export", str(root))
    capsule_file = directory / "review.evidence.json"
    capsule_file.write_text(json.dumps(capsule))
    root.rename(directory / "retained-review-source")
    offline = directory / "workbench-offline"
    offline.mkdir()
    portable = run(binary, offline, "demo", "verify", str(capsule_file), store=False, path="")
    assert portable["ok"] is True and portable["digest"] == approved["verification"]["digest"]
    assert portable["status"] == "complete" and portable["receipts"] == 2
    capsule["records"][capsule["head"]]["generation"] += 1
    capsule_file.write_text(json.dumps(capsule))
    run(binary, offline, "demo", "verify", str(capsule_file), store=False, path="", expected_failure=True)
    assert not list(offline.iterdir()), "workbench evidence verification created host state"

    proof = native("prove", str(directory / "crash-proof"), timeout=60)
    assert proof["contract"] == "algal.demo-proof.v1" and proof["ok"] is True
    assert proof["approval"]["initialStatus"] == "waiting" and proof["approval"]["status"] == "approved"
    assert proof["approval"]["duplicateApprovalSameHead"] is True and proof["approval"]["publications"] == 1
    assert proof["denial"]["status"] == "denied" and proof["denial"]["publications"] == 0
    assert proof["portable"]["sourceMovedAway"] is True and proof["portable"]["verification"]["ok"] is True
    for field, mode, status, writes in [("readCrash", "read", "complete", 0), ("writeCrash", "write", "uncertain", 1)]:
        case = proof[field]
        assert case["contract"] == "algal.demo-crash-report.v1" and case["mode"] == mode
        assert case["status"] == status and case["ownedChildKilledAndJoined"] is True
        assert case["verification"]["ok"] is True and case["verification"]["status"] == status
        assert case["counters"] == {"prefixPublications": 1, "pendingWritePublications": writes, "scheduledTicks": 0}
        before_effects = case["journalBefore"]["effects"]
        assert len(before_effects) == 2
        assert before_effects[0]["record"]["state"] == "completed"
        assert before_effects[1]["record"]["state"] == "started"
        if mode == "read":
            after_effects = case["journalAfter"]["effects"]
            assert before_effects[0] == after_effects[0], "read recovery repeated its completed prefix"
            assert after_effects[1]["record"]["state"] == "completed" and after_effects[1]["record"]["attempt"] == 1
            assert after_effects[1]["record"]["idempotencyKey"] == before_effects[1]["record"]["idempotencyKey"]
        else:
            assert case["refusal"]["code"] == "RECOVERY_BLOCKED"
            assert case["journalBefore"] == case["journalAfter"]
            assert case["verification"]["digest"] == case["killedIntent"]
    assert not (directory / ".algal").exists(), "standalone demo used implicit host state"
    return {"workbench": True, "exactApproval": True, "duplicateApprovalSameHead": True,
            "denialWithoutPublication": True, "workbenchPortableEvidence": True,
            "ownedReadCrashRecovered": True, "unknownWriteCrashBlocked": True}


def smoke(binary):
    binary = Path(binary).resolve(strict=True)
    with tempfile.TemporaryDirectory(prefix="algal-standalone-") as temporary:
        directory = Path(temporary)
        doctor = run(binary, directory, "doctor")
        assert doctor["native"] is True
        mailbox = run(binary, directory, "mailbox", "create", "inbox", "--max-messages", "4")
        manifest = {"contract": "algal.organism.v1", "key": "organism:standalone-smoke", "name": "Standalone smoke",
                    "cells": [{"id": "input", "kind": "input", "outputs": {"inbox": {"type": "cap", "capability": "mailbox-receive"}}},
                              {"id": "wait", "kind": "tool", "tool": "mailbox.receive.v1"}],
                    "edges": [{"from": {"cell": "input", "port": "inbox"}, "to": {"cell": "wait", "port": "mailbox"}}]}
        for name, value in [("manifest", manifest), ("args", {"input": {"inbox": mailbox["receive"]}}), ("message", {"approved": True})]:
            (directory / f"{name}.json").write_text(json.dumps(value))
        run(binary, directory, "process", "create", "worker", str(directory / "manifest.json"), "--args", str(directory / "args.json"))
        suspended = run(binary, directory, "process", "tick", "worker", "--journal")
        assert suspended["process"]["status"] == "suspended"
        assert run(binary, directory, "process", "schedule")["ticks"] == 0
        run(binary, directory, "mailbox", "send", mailbox["send"], str(directory / "message.json"))
        advanced = run(binary, directory, "process", "schedule", "--journal")
        assert advanced["ticks"] == 1 and advanced["processes"][0]["process"]["status"] == "complete"
        verified = run(binary, directory, "process", "verify", "worker")
        assert verified["ok"] is True and verified["generations"] == 2 and verified["receipts"] == 2
        journal = run(binary, directory, "process", "journal", "worker")
        assert len(journal["effects"]) == 1 and journal["effects"][0]["record"]["state"] == "completed"
        evidence = run(binary, directory, "process", "export", "worker")
        evidence_file = directory / "worker.evidence.json"
        evidence_file.write_text(json.dumps(evidence))
        (directory / "state").rename(directory / "retained-source")
        offline = directory / "offline"
        offline.mkdir()
        portable = run(binary, offline, "process", "verify-evidence", str(evidence_file), store=False)
        assert portable["ok"] is True and portable["digest"] == verified["digest"]
        assert portable["status"] == "complete" and portable["receipts"] == 2
        del evidence["records"][evidence["head"]]
        evidence_file.write_text(json.dumps(evidence))
        run(binary, offline, "process", "verify-evidence", str(evidence_file), store=False, expected_failure=True)
        assert not list(offline.iterdir()), "evidence verification created host state"
        workbench = workbench_smoke(binary, directory)
        return {"ok": True, "nativeVersion": doctor["version"], "generations": 2, "receipts": 2,
                "portableEvidence": True, "tamperedEvidenceRejected": True, "requiresBun": False,
                "requiresCargo": False, **workbench}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("binary", type=Path)
    print(json.dumps(smoke(parser.parse_args().binary), sort_keys=True))
