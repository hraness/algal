#!/usr/bin/env python3
"""Exercise an extracted native CLI without repository files, Bun, or Cargo."""
import argparse
import json
from pathlib import Path
import subprocess
import tempfile


def run(binary, directory, *args, store=True, expected_failure=False):
    result = subprocess.run([str(binary), *args, *(["--dir", str(directory / "state")] if store else [])],
                            cwd=directory, capture_output=True, text=True, timeout=20,
                            env={"PATH": "/usr/bin:/bin", "HOME": str(directory)})
    if expected_failure:
        assert result.returncode != 0, "native smoke accepted invalid evidence"
        return None
    if result.returncode:
        raise RuntimeError(f"native smoke command failed: {args}: {result.stderr[:4096]}")
    if len(result.stdout.encode()) > 1_048_576:
        raise RuntimeError("native smoke output limit exceeded")
    return json.loads(result.stdout)


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
        return {"ok": True, "nativeVersion": doctor["version"], "generations": 2, "receipts": 2,
                "portableEvidence": True, "tamperedEvidenceRejected": True, "requiresBun": False, "requiresCargo": False}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("binary", type=Path)
    print(json.dumps(smoke(parser.parse_args().binary), sort_keys=True))
