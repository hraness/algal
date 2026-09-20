#!/usr/bin/env python3
"""Deterministic native qualification only. Never selects Apple or any account."""
import argparse
from argparse import Namespace
import json
import os
from pathlib import Path
import sys
import time

sys.dont_write_bytecode = True
import apple_brief_demo as demo


def qualify_preflight(base, native, checks):
    """Only task-owned Python protocol fixtures run here; no Apple framework."""
    probes = base / "bridge-fixtures"
    os.mkdir(probes, 0o700)

    def bridge(name, body):
        script = probes / (name + ".py")
        source = "#!" + sys.executable + "\nimport json, os, sys, time\nfrom pathlib import Path\n"
        source += "Path(__file__ + '.pid').write_text(str(os.getpid()))\n"
        source += body
        script.write_text(source)
        script.chmod(0o700)
        return demo.binary(script)

    read = "request = json.loads(sys.stdin.readline())\nassert set(request) == {'id', 'prompt'} and request['prompt'] == ''\nPath(__file__ + '.request').write_text(json.dumps(request))\n"
    reply = "print(json.dumps({'id': request['id'], 'ok': False, 'error': {'code': 'invalidRequest'}}), flush=True)\n"

    def joined(selected):
        pid = int(Path(selected["path"] + ".pid").read_text())
        try:
            os.waitpid(pid, os.WNOHANG)
        except ChildProcessError:
            return
        raise AssertionError("bridge child was not joined")

    def rejects(selected, message, timeout_ms=1500):
        before = time.monotonic()
        try:
            demo.bridge_preflight(selected, timeout_ms=timeout_ms)
        except ValueError as error:
            assert message in str(error), str(error)
        else:
            raise AssertionError("invalid bridge passed preflight")
        assert time.monotonic() - before < 8
        joined(selected)

    correct = bridge("protocol-correct", read + reply + "assert sys.stdin.read() == ''\n")
    first = demo.bridge_preflight(correct, timeout_ms=1500)
    joined(correct)
    second = demo.bridge_preflight(correct, timeout_ms=1500)
    joined(correct)
    assert first["request"]["id"] != second["request"]["id"]
    assert first["stdinHeldOpenUntilResponse"] and not first["inferenceAttempted"]
    assert demo.parse(first["stdout"]) == first["response"] and first["stderr"] == ""
    assert first["bridge"] == correct and first["exitCode"] == 0
    demo.write_json(probes / "successful-preflight.json", first)
    altered = json.loads(json.dumps(first))
    altered["bridge"]["sha256"] = "0" * 64
    try:
        demo.check_preflight(altered, correct)
    except ValueError:
        pass
    else:
        raise AssertionError("foreign bridge accepted in retained preflight")
    checks.append("held-stdin protocol preflight retains exact raw response, fresh request ID, and bridge hash")

    silent = bridge("no-response", read + "time.sleep(60)\n")
    rejects(silent, "deadline")
    checks.append("nonresponding bridge reaches bounded deadline and its exact child is killed and joined")
    wrong = bridge("wrong-id", read + "request['id'] = 'wrong'\n" + reply + "time.sleep(60)\n")
    rejects(wrong, "echoed-id")
    checks.append("wrong response ID rejects before any workflow admission")
    wrong_error = bridge("wrong-error", read + "print(json.dumps({'id': request['id'], 'ok': False, 'error': {'code': 'generationFailed'}}), flush=True)\ntime.sleep(60)\n")
    rejects(wrong_error, "invalidRequest")
    oversized = bridge("oversized", read + "print('x' * 4097, flush=True)\ntime.sleep(60)\n")
    rejects(oversized, "output exceeded")
    extra = bridge("extra-response", read + reply + reply + "assert sys.stdin.read() == ''\n")
    rejects(extra, "raw response mismatch")
    hangs = bridge("response-without-exit", read + reply + "sys.stdin.read()\ntime.sleep(60)\n")
    rejects(hangs, "deadline")
    checks.append("wrong protocol error, oversized or extra output, and missing clean exit all reject")

    stale = bridge("retired-eof", "request = json.loads(sys.stdin.read())\n" + reply)
    root = base / "preflight-rejected"
    args = Namespace(root=str(root), native=native, evidence=None, apple_bridge=stale["path"], responses=None)
    try:
        demo.start(args)
    except ValueError as error:
        assert "deadline" in str(error)
    else:
        raise AssertionError("retired EOF bridge was admitted")
    joined(stale)
    assert {p.name for p in root.iterdir()} == {".owner.lock", "preflight-error.json"}
    failure = demo.read_json(root / "preflight-error.json")
    assert failure["bridge"] == stale and failure["inferenceAttempted"] is False
    try:
        demo.start(args)
    except FileExistsError:
        pass
    else:
        raise AssertionError("partially initialized root was reused")
    assert demo.read_json(root / "preflight-error.json") == failure
    checks.append("retired EOF bridge leaves no inference marker, definition, process, or successful qualification; root remains preserved")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--native", required=True)
    parser.add_argument("--out", required=True)
    args = parser.parse_args()
    base = demo.physical(args.out)
    os.mkdir(base, 0o700)
    checks = []
    qualify_preflight(base, args.native, checks)

    def begin(name):
        root = base / name
        report = demo.start(Namespace(root=str(root), native=args.native, evidence=None, apple_bridge=None, responses=str(demo.HERE / "responses.json")))
        assert report["mode"] == "fixture" and report["status"] == "suspended" and not report["publication"]
        return root, report

    def act(root, command, report, proposal=None, action=demo.ACTION):
        return demo.action(Namespace(root=str(root), command=command, proposal=proposal or report["proposalDigest"], action=action))

    def rejects(fn):
        try:
            fn()
        except (ValueError, FileExistsError, FileNotFoundError, OSError):
            return
        raise AssertionError("operation unexpectedly succeeded")

    root, pending = begin("approved")
    assert pending["qualified"] and not pending["inferenceAttempted"]
    (root / "qualified.json").rename(root / "qualified-held.json")
    assert not act(root, "inspect", pending)["qualified"]
    rejects(lambda: act(root, "approve", pending))
    assert not (root / "decision.json").exists()
    (root / "qualified-held.json").rename(root / "qualified.json")
    checks.append("missing successful-start qualification cannot authorize retained inference")
    d = demo.definition(root)
    assert b"script-src 'none'" in demo.read_bytes(root / "report.html", demo.MAX_JSON)
    hostile = json.loads(json.dumps(pending))
    hostile["proposal"]["analysis"]["summary"] = '</p><script>alert("x")</script><img src=x>'
    rendered = demo.render_report(hostile, d)
    assert b"<script>" not in rendered and b"<img " not in rendered and b"&lt;script&gt;" in rendered
    checks.append("passive report escapes generated text and forbids scripts/network")
    first = demo.call(d, root, "process", "export", demo.NAME, limit=demo.MAX_CAPSULE)
    first_receipt = first["receipts"][first["records"][first["head"]]["receipt"]]
    rejects(lambda: act(root, "approve", pending, "sha256:" + "0" * 64))
    rejects(lambda: act(root, "approve", pending, action="send-email"))
    assert not (root / "decision.json").exists()
    checks.append("wrong operator proposal/action rejects before decision or wake")
    settled = act(root, "approve", pending)
    assert settled["status"] == "complete" and settled["publication"]
    assert demo.read_json(root / "publication.json") == pending["proposal"]
    second = demo.call(d, root, "process", "export", demo.NAME, limit=demo.MAX_CAPSULE)
    second_receipt = second["receipts"][second["records"][second["head"]]["receipt"]]
    for cell in ("recommend", "envelope", "propose"):
        assert first_receipt["cells"][cell] == second_receipt["cells"][cell]
    assert len([e for e in second_receipt["effects"] if e["requestDigest"] == first_receipt["cells"]["recommend"]["effectDigest"]]) == 1
    checks.append("executor-free resume retains exact original analysis/proposal effect")
    repeated = act(root, "approve", pending)
    assert repeated["head"] == settled["head"]
    rejects(lambda: act(root, "deny", pending))
    (root / "publication.json").unlink()
    assert act(root, "approve", pending)["head"] == settled["head"]
    assert demo.read_json(root / "publication.json") == pending["proposal"]
    checks.append("same approval is idempotent; conflicting denial refused; projection restored")
    rejects(lambda: demo.start(Namespace(root=str(root), native=args.native, evidence=None, apple_bridge=None, responses=str(demo.HERE / "responses.json"))))
    checks.append("existing started root cannot silently rerun inference")
    capsule_report = act(root, "export", pending)
    assert capsule_report["exportVerification"]["ok"]
    capsule = demo.read_json(root / "evidence.algal.json", demo.MAX_CAPSULE)
    demo.write_json(base / "portable.algal.json", capsule)
    (root / "store").rename(root / "store-detached")
    verified = demo.run([args.native, "process", "verify-evidence", base / "portable.algal.json"])
    assert verified["ok"] and verified["digest"] == settled["head"]
    del capsule["records"][capsule["head"]]
    demo.write_json(base / "tampered.algal.json", capsule)
    rejects(lambda: demo.run([args.native, "process", "verify-evidence", base / "tampered.algal.json"]))
    checks.append("portable native verification works without source store and rejects missing head")

    denied_root, denied_pending = begin("denied")
    denied = act(denied_root, "deny", denied_pending)
    assert denied["status"] == "complete" and not denied["publication"]
    assert not (denied_root / "publication.json").exists()
    checks.append("denial completes with no local publication")

    for wrong in ("proposal", "workflow", "proposalId", "action"):
        bad_root, report = begin("wrong-" + wrong)
        d = demo.definition(bad_root)
        decision = {"decision": "approve", "action": demo.ACTION, "workflow": d["workflow"], "proposalId": report["proposalId"], "proposal": report["proposal"]}
        decision = json.loads(json.dumps(decision))
        if wrong == "proposal":
            decision["proposal"]["analysis"]["summary"] += " CHANGED"
        elif wrong == "workflow":
            decision["workflow"]["id"] = "0" * 48
        elif wrong == "proposalId":
            decision["proposalId"] = "sha256:" + "0" * 64
        else:
            decision["action"] = "send-email"
        demo.write_json(bad_root / "forged.json", decision)
        demo.call(d, bad_root, "mailbox", "send", d["mailboxes"]["approvals"]["send"], bad_root / "forged.json", "--idempotency-key", report["proposalId"])
        outcome = demo.call(d, bad_root, "process", "tick", demo.NAME, "--journal")
        assert outcome["process"]["status"] == "complete"
        capsule = demo.call(d, bad_root, "process", "export", demo.NAME, limit=demo.MAX_CAPSULE)
        receipt = capsule["receipts"][capsule["records"][capsule["head"]]["receipt"]]
        assert receipt["cells"]["publish"]["status"] == "skipped"
        checks.append("graph itself rejects mismatched " + wrong)

    # Parser and path custody are tested without another VM invocation.
    rejects(lambda: demo.parse(b'{"a":1,"a":2}'))
    rejects(lambda: demo.bounded_evidence({"bad": 1.25}))
    rejects(lambda: demo.bounded_evidence({"large": "x" * 2048}))
    outside = base / "untouched.json"
    demo.write_json(outside, {"sentinel": True})
    (denied_root / "publication.json").symlink_to(outside)
    rejects(lambda: act(denied_root, "inspect", denied_pending))
    assert demo.read_json(outside) == {"sentinel": True}
    checks.append("duplicate/oversized/float evidence and artifact symlink rejected")
    report = {"ok": True, "mode": "deterministic-only", "inferenceAttempted": False, "native": demo.binary(args.native), "checks": checks, "cases": len(checks)}
    demo.write_json(base / "qualification.json", report)
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
