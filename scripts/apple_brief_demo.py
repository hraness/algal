#!/usr/bin/env python3
"""Optional Python orchestration; all VM execution is the selected native ALGAL.

Only start --apple-bridge admits inference. Every later command has no executor.
This is a bounded local qualification/demo harness, not a service or sandbox.
"""
import argparse
import contextlib
import fcntl
import hashlib
import html
import json
import os
from pathlib import Path
import re
import secrets
import selectors
import signal
import shlex
import stat
import subprocess
import sys
import time

HERE = Path(__file__).resolve().parent.parent / "examples" / "vm" / "private-brief"
NAME = "private-brief"
ACTION = "publish-local-report"
CONTRACT = "algal.private-brief-demo.v1"
MAX_JSON = 2 * 1024 * 1024
MAX_CAPSULE = 64 * 1024 * 1024
MANIFESTS = ("private-brief.algal.json", "private-brief-wait.algal.json")
DIGEST = re.compile(r"sha256:[0-9a-f]{64}\Z")
PREFLIGHT_ID = re.compile(r"algal-preflight-[0-9a-f]{32}\Z")
PREFLIGHT_BYTES = 4096
PREFLIGHT_MS = 3000


def require(condition, message):
    if not condition:
        raise ValueError(message)


def key_order(key):
    index = key.isascii() and key.isdigit() and str(int(key)) == key and int(key) < 4294967295
    return (0, int(key)) if index else (1, key.encode("utf-16-be"))


def canonical(value):
    # Demo data excludes floats. This exactly matches ALGAL for its admitted data.
    if isinstance(value, dict):
        return "{" + ",".join(json.dumps(k, ensure_ascii=False) + ":" + canonical(value[k]) for k in sorted(value, key=key_order)) + "}"
    if isinstance(value, list):
        return "[" + ",".join(canonical(v) for v in value) + "]"
    require(not isinstance(value, float), "floating-point values are outside this demo's data contract")
    return json.dumps(value, ensure_ascii=False, separators=(",", ":"), allow_nan=False)


def digest(value):
    return "sha256:" + hashlib.sha256(canonical(value).encode()).hexdigest()


def strict_pairs(pairs):
    result = {}
    for key, value in pairs:
        require(key not in result, "duplicate JSON key")
        result[key] = value
    return result


def parse(data):
    return json.loads(data, object_pairs_hook=strict_pairs, parse_constant=lambda _: (_ for _ in ()).throw(ValueError("non-finite JSON")))


def read_bytes(path, limit):
    fd = os.open(path, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK)
    with os.fdopen(fd, "rb") as handle:
        meta = os.fstat(handle.fileno())
        require(stat.S_ISREG(meta.st_mode) and meta.st_size <= limit, "file type or byte bound: " + str(path))
        data = handle.read(limit + 1)
    require(len(data) <= limit, "file grew beyond byte bound")
    return data


def read_json(path, limit=MAX_JSON):
    return parse(read_bytes(path, limit))


def identity(path):
    meta = os.lstat(path)
    require(stat.S_ISDIR(meta.st_mode) and not stat.S_ISLNK(meta.st_mode), "expected real directory: " + str(path))
    return {"device": str(meta.st_dev), "inode": str(meta.st_ino)}


def physical(path):
    path = Path(path).absolute()
    require(".." not in path.parts and len(str(path).encode()) <= 4096, "root path bounds")
    return path.parent.resolve(strict=True) / path.name


def sync_dir(path):
    fd = os.open(path, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW)
    try:
        os.fsync(fd)
    finally:
        os.close(fd)


def write_json(path, value, replace=False):
    write_artifact(path, canonical(value).encode(), replace)


def write_artifact(path, data, replace=False):
    require(len(data) <= MAX_CAPSULE, "artifact byte bound")
    identity(path.parent)
    if path.exists() or path.is_symlink():
        previous = read_bytes(path, MAX_CAPSULE)
        if previous == data:
            return
        require(replace, "immutable artifact differs: " + str(path))
    temporary = path.parent / (".brief-" + secrets.token_hex(12))
    fd = os.open(temporary, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600)
    try:
        with os.fdopen(fd, "wb") as handle:
            handle.write(data)
            handle.flush()
            os.fsync(handle.fileno())
        if replace:
            os.replace(temporary, path)
        else:
            os.link(temporary, path)
        sync_dir(path.parent)
    finally:
        temporary.unlink(missing_ok=True)


def optional(path):
    try:
        return read_json(path)
    except FileNotFoundError:
        require(not path.is_symlink(), "dangling artifact symlink")
        return None


def binary(path):
    path = Path(path).resolve(strict=True)
    require(os.access(path, os.X_OK), "binary is not executable")
    data = read_bytes(path, 100 * 1024 * 1024)
    return {"path": str(path), "sha256": hashlib.sha256(data).hexdigest()}


def check_probe_response(response, request_id):
    require(isinstance(response, dict) and set(response) == {"id", "ok", "error"}
            and response.get("id") == request_id and response.get("ok") is False
            and response.get("error") == {"code": "invalidRequest"},
            "bridge preflight requires the exact echoed-id invalidRequest response")


def check_preflight(record, bridge):
    require(isinstance(record, dict) and set(record) == {"contract", "bridge", "request", "response", "stdout", "stderr", "deadlineMs", "stdinHeldOpenUntilResponse", "exitCode", "inferenceAttempted"}, "bridge preflight evidence fields")
    require(record["contract"] == "algal.private-brief-bridge-preflight.v1" and record["bridge"] == bridge,
            "bridge preflight evidence identity")
    require(isinstance(bridge, dict) and set(bridge) == {"path", "sha256"}
            and isinstance(bridge["path"], str) and 1 <= len(bridge["path"].encode()) <= 4096
            and isinstance(bridge["sha256"], str) and re.fullmatch(r"[0-9a-f]{64}", bridge["sha256"]),
            "bridge preflight binary identity")
    request = record["request"]
    require(isinstance(request, dict) and set(request) == {"id", "prompt"}
            and isinstance(request["id"], str) and PREFLIGHT_ID.fullmatch(request["id"])
            and request["prompt"] == "", "bridge preflight request must have an empty prompt")
    check_probe_response(record["response"], request["id"])
    require(all(isinstance(record[key], str) and len(record[key].encode()) <= PREFLIGHT_BYTES for key in ("stdout", "stderr")), "bridge preflight raw output bounds")
    require(record["stdout"].endswith("\n") and record["stdout"].count("\n") == 1
            and parse(record["stdout"]) == record["response"], "bridge preflight raw response mismatch")
    require(type(record["deadlineMs"]) is int and 1 <= record["deadlineMs"] <= 10000
            and record["stdinHeldOpenUntilResponse"] is True
            and type(record["exitCode"]) is int and record["exitCode"] == 0
            and record["inferenceAttempted"] is False, "bridge preflight completion bounds")
    require(len(canonical(record).encode()) <= 16384, "bridge preflight evidence byte bound")
    return record


def bridge_preflight(bridge, timeout_ms=PREFLIGHT_MS):
    """Prove NDJSON framing with a request rejected before model access.

    In the pinned Swift source, generate(parseRequest(raw)) evaluates the parser
    first; an empty prompt throws invalidRequest before availability or session
    construction. Keep stdin open until its echoed-id error arrives, so the
    retired EOF-framed bridge cannot pass. This is not an inference test.
    """
    require(type(timeout_ms) is int and 1 <= timeout_ms <= 10000, "bridge preflight deadline")
    require(binary(bridge["path"]) == bridge, "bridge changed before protocol preflight")
    request = {"id": "algal-preflight-" + secrets.token_hex(16), "prompt": ""}
    wire = (canonical(request) + "\n").encode()
    child = subprocess.Popen([bridge["path"]], stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                             stderr=subprocess.PIPE, start_new_session=True)
    selector = None
    chunks = {"stdout": bytearray(), "stderr": bytearray()}
    deadline = time.monotonic() + timeout_ms / 1000
    written = 0
    response = None
    try:
        selector = selectors.DefaultSelector()
        for name, event in (("stdin", selectors.EVENT_WRITE), ("stdout", selectors.EVENT_READ), ("stderr", selectors.EVENT_READ)):
            stream = getattr(child, name)
            os.set_blocking(stream.fileno(), False)
            selector.register(stream, event, name)
        while selector.get_map():
            require(time.monotonic() < deadline, "bridge protocol preflight deadline; no workflow inference was admitted")
            for key, _ in selector.select(min(.05, max(0, deadline - time.monotonic()))):
                if key.data == "stdin":
                    written += os.write(key.fd, wire[written:])
                    if written == len(wire):
                        selector.unregister(key.fileobj)
                    continue
                data = os.read(key.fd, PREFLIGHT_BYTES + 1)
                if not data:
                    selector.unregister(key.fileobj)
                    continue
                chunks[key.data].extend(data)
                require(len(chunks[key.data]) <= PREFLIGHT_BYTES, "bridge preflight output exceeded bound")
                if key.data == "stdout" and response is None and b"\n" in chunks["stdout"]:
                    require(written == len(wire), "bridge replied before the complete probe was sent")
                    response = parse(bytes(chunks["stdout"]).split(b"\n", 1)[0])
                    check_probe_response(response, request["id"])
                    # Only now give the bridge EOF and wait for a clean exit.
                    child.stdin.close()
        require(response is not None, "bridge preflight ended without an echoed response")
        code = child.wait(timeout=max(.001, deadline - time.monotonic()))
        require(code == 0, "bridge preflight did not exit successfully")
        require(binary(bridge["path"]) == bridge, "bridge changed during protocol preflight")
        record = {"contract": "algal.private-brief-bridge-preflight.v1", "bridge": bridge,
                  "request": request, "response": response,
                  "stdout": bytes(chunks["stdout"]).decode(), "stderr": bytes(chunks["stderr"]).decode(),
                  "deadlineMs": timeout_ms, "stdinHeldOpenUntilResponse": True,
                  "exitCode": code, "inferenceAttempted": False}
        return check_preflight(record, bridge)
    finally:
        if selector is not None:
            selector.close()
        if child.poll() is None:
            try:
                os.killpg(child.pid, signal.SIGKILL)
            except ProcessLookupError:
                pass
        child.wait(timeout=5)
        for stream in (child.stdin, child.stdout, child.stderr):
            stream.close()


def run(argv, limit=MAX_JSON, timeout=20):
    """Bound both output streams while draining; kill/join only our child group."""
    child = subprocess.Popen([str(v) for v in argv], stdin=subprocess.DEVNULL, stdout=subprocess.PIPE, stderr=subprocess.PIPE, start_new_session=True)
    chunks = {"stdout": bytearray(), "stderr": bytearray()}
    selector = selectors.DefaultSelector()
    for name in chunks:
        stream = getattr(child, name)
        os.set_blocking(stream.fileno(), False)
        selector.register(stream, selectors.EVENT_READ, name)
    deadline = time.monotonic() + timeout
    try:
        while selector.get_map():
            require(time.monotonic() < deadline, "native command deadline; outcome may be uncertain, do not retry start")
            for key, _ in selector.select(min(.1, max(0, deadline - time.monotonic()))):
                data = os.read(key.fd, 65536)
                if not data:
                    selector.unregister(key.fileobj)
                    continue
                chunks[key.data].extend(data)
                require(len(chunks[key.data]) <= (limit if key.data == "stdout" else 65536), "native output exceeded bound")
        code = child.wait(timeout=max(.1, deadline - time.monotonic()))
        require(code == 0, "native command failed; retained state must be inspected, not retried: " + chunks["stderr"].decode(errors="replace")[:2048])
        return parse(chunks["stdout"])
    finally:
        selector.close()
        if child.poll() is None:
            try:
                os.killpg(child.pid, signal.SIGKILL)
            except ProcessLookupError:
                pass
        child.wait(timeout=5)
        child.stdout.close()
        child.stderr.close()


def call(definition, root, *args, limit=MAX_JSON, timeout=20):
    current = binary(definition["native"]["path"])
    require(current == definition["native"], "selected native binary changed")
    return run([current["path"], *args, "--dir", root / "store"], limit, timeout)


def bounded_evidence(value):
    require(isinstance(value, dict), "evidence must be a JSON object")
    original = value
    stack = [(value, 0)]
    nodes = 0
    while stack:
        value, depth = stack.pop()
        nodes += 1
        require(nodes <= 128 and depth <= 8, "evidence structural bound")
        if isinstance(value, dict):
            stack.extend((v, depth + 1) for v in value.values())
        elif isinstance(value, list):
            stack.extend((v, depth + 1) for v in value)
        else:
            require(value is None or isinstance(value, (str, bool)) or (type(value) is int and abs(value) <= 9007199254740991), "evidence supports text, booleans, null, and safe integers")
    require(len(canonical(original).encode()) <= 2048, "evidence exceeds 2048 bytes")


def definition(root):
    d = read_json(root / "definition.json", 32768)
    fields = {"contract", "root", "identity", "native", "mode", "bridge", "workflow", "evidence", "args", "manifestDigest", "programs", "mailboxes"}
    require(set(d) in (fields, fields | {"bridgePreflightDigest"}), "definition fields")
    require(d["contract"] == CONTRACT and d["root"] == str(root) and d["identity"] == identity(root), "root incarnation changed")
    require(d["native"] == binary(d["native"]["path"]), "native binary changed")
    require(d["mode"] in ("apple", "fixture"), "execution mode")
    if "bridgePreflightDigest" in d:
        require(d["mode"] == "apple", "only Apple workflows have a bridge preflight")
        probe = check_preflight(read_json(root / "bridge-preflight.json", 16384), d["bridge"])
        require(d["bridgePreflightDigest"] == digest(probe), "bridge preflight digest changed")
    bounded_evidence(d["evidence"])
    require(d["workflow"] == {"id": d["workflow"]["id"], "root": str(root), **d["identity"], "process": NAME}, "workflow identity changed")
    require(re.fullmatch(r"[0-9a-f]{48}", d["workflow"]["id"]), "workflow token")
    identity(root / "programs")
    identity(root / "store")
    for name in MANIFESTS:
        require(read_json(root / "programs" / name) == d["programs"][name] == read_json(HERE / name), "saved program changed")
    require(call(d, root, "digest", root / "programs" / MANIFESTS[0])["digest"] == d["manifestDigest"], "process is not the fixed saved program")
    actual_mailboxes = call(d, root, "mailbox", "list")["mailboxes"]
    require(len(actual_mailboxes) == 3 and {m["name"]: m for m in actual_mailboxes} == d["mailboxes"], "mailbox admissions changed")
    require(d["args"] == {"input": {"workflow": d["workflow"], "evidence": d["evidence"], "proposals": d["mailboxes"]["proposals"]["send"], "approvals": d["mailboxes"]["approvals"]["receive"], "publications": d["mailboxes"]["publications"]["send"]}}, "process arguments changed")
    state = call(d, root, "process", "inspect", NAME)
    p = state["process"]
    require(p["name"] == NAME and p["args"] == d["args"] and p["manifestDigest"] == d["manifestDigest"] and p["maxGenerations"] == 4, "process definition changed")
    return d


@contextlib.contextmanager
def locked(root):
    before = identity(root)
    fd = os.open(root / ".owner.lock", os.O_RDWR | os.O_CREAT | os.O_NOFOLLOW | os.O_NONBLOCK, 0o600)
    try:
        require(stat.S_ISREG(os.fstat(fd).st_mode), "lock is not a regular file")
        fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
        require(before == identity(root), "root changed before lease")
        yield
    finally:
        os.close(fd)


def inspect(root, d):
    # Export verifies one fixed snapshot and is credential/executor free.
    capsule = call(d, root, "process", "export", NAME, limit=MAX_CAPSULE)
    head = capsule["head"]
    p = capsule["records"][head]
    require(p["args"] == d["args"] and p["manifestDigest"] == d["manifestDigest"] and p["name"] == NAME, "export definition mismatch")
    started = optional(root / "started.json")
    expected_started = {"contract": "algal.private-brief-start.v1", "mode": d["mode"], "workflow": d["workflow"], "noAutomaticRetry": True}
    require(started is None or started == expected_started, "started marker changed")
    report = {"contract": "algal.private-brief-report.v1", "mode": d["mode"], "root": str(root), "head": head, "status": p["status"], "generation": p["generation"], "verification": "native fixed-snapshot export verified", "evaluationAttempted": started is not None, "inferenceAttempted": d["mode"] == "apple" and started is not None, "qualified": False, "proposal": None, "proposalDigest": None, "proposalId": None, "publication": False}
    if p.get("receipt") is None:
        return report, capsule
    receipt = capsule["receipts"][p["receipt"]]
    cells = receipt["cells"]
    recommend = cells.get("recommend", {})
    if recommend.get("status") != "committed":
        return report, capsule
    analysis = recommend["outputs"]["out"]
    require(isinstance(analysis, dict) and set(analysis) == {"summary", "reviewFocus"}, "generated analysis fields")
    require(all(isinstance(v, str) and 1 <= len(v.encode()) <= 768 for v in analysis.values()) and len(canonical(analysis).encode()) <= 1024, "generated analysis string bounds")
    effects = [e for e in receipt["effects"] if e["requestDigest"] == recommend["effectDigest"]]
    require(len(effects) == 1 and effects[0].get("output") == analysis and "error" not in effects[0] and not effects[0].get("cached", False), "analysis does not match one retained uncached effect")
    effect = effects[0]
    require(started == expected_started, "retained analysis lacks its exact started marker")
    if d["mode"] == "apple":
        require(effect["executor"] == "apple:system" and effect["usage"]["model"] == "apple/system" and effect["configurationDigest"] == digest({"kind": "apple", "bridge": d["bridge"]["path"]}), "retained effect is not the admitted Apple backend")
    else:
        require(effect["executor"] == "scripted", "fixture executor mismatch")
    expected = {"contract": "algal.private-brief-proposal.v1", "workflow": d["workflow"], "action": {"kind": ACTION, "target": "publication.json"}, "evidence": d["evidence"], "analysis": analysis}
    require(cells["envelope"]["outputs"]["out"] == expected, "proposal differs from generated analysis and host binding")
    proposal_id = cells["propose"]["outputs"]["id"]
    require(DIGEST.fullmatch(proposal_id), "proposal delivery id")
    decision = optional(root / "decision.json")
    if cells.get("wait/receive", {}).get("status") == "committed":
        require(cells["wait/receive"]["outputs"]["message"] == decision, "approval message differs from retained decision")
    publication = cells.get("publish", {}).get("status") == "committed"
    if publication:
        require(decision == {"decision": "approve", "action": ACTION, "workflow": d["workflow"], "proposalId": proposal_id, "proposal": expected} and cells["authorize"]["outputs"]["out"] == expected, "publication is not exactly approved")
    projected = optional(root / "publication.json")
    require(projected is None or (publication and projected == expected), "local publication projection mismatch")
    report.update(proposal=expected, proposalDigest=digest(expected), proposalId=proposal_id, publication=publication, retainedEffect={"requestDigest": effect["requestDigest"], "executor": effect["executor"], "configurationDigest": effect.get("configurationDigest"), "usage": effect.get("usage")})
    qualified = optional(root / "qualified.json")
    if qualified is not None:
        initial = [(key, value) for key, value in capsule["records"].items() if value["generation"] == 1 and value["status"] == "suspended"]
        require(len(initial) == 1, "qualified initial suspended generation is missing")
        initial_head, initial_record = initial[0]
        require(qualified == qualification(d, report, initial_head, initial_record["receipt"]), "successful-start qualification changed")
        report["qualified"] = True
    return report, capsule


def qualification(d, report, initial_head, initial_receipt):
    result = {"contract": "algal.private-brief-qualified.v1", "mode": d["mode"], "workflow": d["workflow"], "native": d["native"], "bridge": d["bridge"], "initialHead": initial_head, "initialReceipt": initial_receipt, "proposalDigest": report["proposalDigest"], "proposalId": report["proposalId"], "effect": report["retainedEffect"]}
    if d["mode"] == "apple":
        require(isinstance(d.get("bridgePreflightDigest"), str) and DIGEST.fullmatch(d["bridgePreflightDigest"]), "Apple qualification requires retained bridge protocol evidence")
        result["bridgePreflightDigest"] = d["bridgePreflightDigest"]
    return result


def render_report(report, d):
    esc = lambda value: html.escape(str(value), quote=True)
    waiting = report["qualified"] and report["status"] == "suspended"
    state = "Waiting for your review" if waiting else ("Published locally" if report["publication"] else ("Denied" if report["status"] == "complete" else "Retained state: " + report["status"]))
    origin = "Apple on-device inference" if report["mode"] == "apple" and report["qualified"] else ("Deterministic response fixture" if report["mode"] == "fixture" else "Unqualified Apple attempt")
    proposal = report["proposal"] or {}
    analysis = proposal.get("analysis", {})
    pretty = lambda value: esc(json.dumps(value, ensure_ascii=False, indent=2))
    commands = ""
    if waiting:
        for decision in ("approve", "deny"):
            argv = [sys.executable, str(Path(__file__).resolve()), decision, report["root"], "--proposal", report["proposalDigest"], "--action", ACTION]
            commands += "<h3>" + decision.capitalize() + " this exact proposal</h3><pre>" + esc(shlex.join(argv)) + "</pre>"
    else:
        commands = "<p>No decision command is offered for this state. Inspect the retained result; do not retry uncertain inference.</p>"
    inspect_argv = [d["native"]["path"], "process", "inspect", NAME, "--dir", str(Path(report["root"]) / "store")]
    body = f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'none'; connect-src 'none'; img-src 'none'; base-uri 'none'; form-action 'none'"><title>Private change brief · ALGAL</title><style>
*{{box-sizing:border-box}}body{{margin:0;background:#f1f4ed;color:#193e35;font:16px/1.6 -apple-system,BlinkMacSystemFont,Segoe UI,sans-serif}}main{{max-width:1040px;margin:auto;padding:54px 28px}}header{{border-bottom:1px solid #ccd7cd;padding-bottom:28px}}small{{text-transform:uppercase;letter-spacing:.12em;font-size:11px}}h1{{font:normal 52px/1.06 Georgia,serif;letter-spacing:-1.6px;max-width:750px}}h2{{font:normal 29px Georgia,serif;margin-top:0}}h3{{font-size:14px}}p{{max-width:780px}}.pill{{display:inline-block;background:#daeaa9;padding:6px 12px;border-radius:5px;font-size:12px}}.grid{{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin:28px 0}}section{{background:#fffef7;border:1px solid #d5dfd1;border-radius:10px;padding:25px;min-width:0;margin-top:20px}}.grid section{{margin:0}}pre{{white-space:pre-wrap;overflow-wrap:anywhere;font:12px/1.7 ui-monospace,SFMono-Regular,Consolas,monospace;background:#edf2e7;padding:16px;border-radius:6px}}a{{color:#245e4b}}.note{{font-size:13px;color:#596f62}}.digest{{font:11px/1.6 ui-monospace,SFMono-Regular,monospace;overflow-wrap:anywhere}}@media(max-width:720px){{.grid{{grid-template-columns:1fr}}h1{{font-size:39px}}main{{padding:30px 18px}}}}@media print{{body{{background:white}}section{{break-inside:avoid}}}}
</style></head><body><main><header><small>ALGAL / Private change brief</small><h1>{"The draft is retained." if report.get("proposal") is not None else "The process state is retained."}<br>You control the next step.</h1><span class="pill">{esc(state)}</span><p>{esc(origin)} · Native VM execution · Local publication only</p><p class="note">This page is a saved view of a verified native process snapshot. It makes no network requests and executes no commands. Generated prose needs human review; execution receipts do not establish factual truth.</p></header><div class="grid"><section><h2>The proposed brief</h2><h3>Summary</h3><p>{esc(analysis.get('summary', 'No qualified draft is available.'))}</p><h3>Review focus</h3><p>{esc(analysis.get('reviewFocus', 'Inspect the retained process state.'))}</p></section><section><h2>Its authority is fixed</h2><p>Approval can publish this exact report to the local outbox and <code>publication.json</code>. It cannot deploy, send email, or change another workflow.</p><p class="note">The model sees supplied evidence. Host-owned workflow identity, action, input evidence, full proposal, and delivery identity are checked again before publication.</p><h3>Exact proposal digest</h3><p class="digest">{esc(report['proposalDigest'])}</p></section></div><section><h2>Your decision</h2>{commands}<p class="note">These are commands to review and run yourself. Continuation has no model executor. The same approval is idempotent; a conflicting choice is refused.</p></section><section><h2>Supplied evidence</h2><pre>{pretty(proposal.get('evidence', d['evidence']))}</pre><p class="note">These are inputs supplied to the model, not new checks performed by the model.</p></section><section><h2>Inspect the retained execution</h2><pre>{esc(shlex.join(inspect_argv))}</pre><h3>Process head</h3><p class="digest">{esc(report['head'])}</p><h3>Recorded model effect</h3><pre>{pretty(report.get('retainedEffect'))}</pre><p class="note">Qualification: {esc(report['qualified'])}. A qualified Apple result binds one recorded inference to the selected local bridge. This is local execution evidence, not provider or hardware attestation.</p><p><a href="report.json">Read the complete report JSON</a></p></section></main></body></html>'''
    data = body.encode()
    require(len(data) <= MAX_JSON, "report HTML byte bound")
    return data


def save_report(root, report, d):
    rendered = render_report(report, d)
    write_json(root / "report.json", report, replace=True)
    write_artifact(root / "report.html", rendered, replace=True)


def start(args):
    root = physical(args.root)
    evidence = read_json(Path(args.evidence or HERE / "evidence.json"), 2048)
    bounded_evidence(evidence)
    native = binary(args.native)
    bridge = binary(args.apple_bridge) if args.apple_bridge else None
    responses = read_json(Path(args.responses), 2048) if args.responses else None
    os.mkdir(root, 0o700)  # Existing or partially initialized roots are preserved.
    sync_dir(root.parent)
    with locked(root):
        preflight = None
        if bridge:
            try:
                preflight = bridge_preflight(bridge)
                write_json(root / "bridge-preflight.json", preflight)
            except Exception as error:
                write_json(root / "preflight-error.json", {"contract": "algal.private-brief-preflight-failure.v1", "bridge": bridge, "inferenceAttempted": False, "error": str(error)[:2048]})
                raise
        os.mkdir(root / "programs", 0o700)
        programs = {name: read_json(HERE / name, 65536) for name in MANIFESTS}
        for name, value in programs.items():
            write_json(root / "programs" / name, value)
        d = {"contract": CONTRACT, "root": str(root), "identity": identity(root), "native": native, "mode": "apple" if bridge else "fixture", "bridge": bridge, "workflow": {"id": secrets.token_hex(24), "root": str(root), **identity(root), "process": NAME}, "evidence": evidence, "programs": programs}
        if preflight is not None:
            d["bridgePreflightDigest"] = digest(preflight)
        wait_digest = call(d, root, "digest", root / "programs" / MANIFESTS[1])["digest"]
        require(programs[MANIFESTS[0]]["cells"][4]["manifest"] == wait_digest, "fixture child digest needs qualification")
        d["manifestDigest"] = call(d, root, "digest", root / "programs" / MANIFESTS[0])["digest"]
        d["mailboxes"] = {name: call(d, root, "mailbox", "create", name, "--max-messages", "4", "--max-message-bytes", "8192") for name in ("proposals", "approvals", "publications")}
        d["args"] = {"input": {"workflow": d["workflow"], "evidence": evidence, "proposals": d["mailboxes"]["proposals"]["send"], "approvals": d["mailboxes"]["approvals"]["receive"], "publications": d["mailboxes"]["publications"]["send"]}}
        write_json(root / "args.json", d["args"])
        write_json(root / "definition.json", d)
        if responses is not None:
            write_json(root / "responses.json", responses)
        call(d, root, "process", "create", NAME, root / "programs" / MANIFESTS[0], "--args", root / "args.json", "--modules", root / "programs", "--max-generations", "4")
        # Durable marker precedes the sole inference-capable invocation.
        write_json(root / "started.json", {"contract": "algal.private-brief-start.v1", "mode": d["mode"], "workflow": d["workflow"], "noAutomaticRetry": True})
        executor = ["--apple", "--apple-bridge", bridge["path"]] if bridge else ["--responses", root / "responses.json"]
        try:
            if bridge:
                require(binary(bridge["path"]) == bridge, "selected Apple bridge changed before dispatch")
            call(d, root, "process", "tick", NAME, "--journal", *executor, timeout=90)
            if bridge:
                require(binary(bridge["path"]) == bridge, "selected Apple bridge changed during inference qualification")
        except Exception as error:
            write_json(root / "start-error.json", {"error": str(error)[:2048], "outcome": "inspect retained process; do not retry inference"})
            raise
        report, capsule = inspect(root, definition(root))
        require(report["status"] == "suspended" and report["generation"] == 1 and report["proposal"] is not None and not report["publication"], "start did not stop at held approval")
        write_json(root / "qualified.json", qualification(d, report, report["head"], capsule["records"][report["head"]]["receipt"]))
        report["qualified"] = True
        save_report(root, report, d)
        return report


def action(args):
    root = physical(args.root)
    with locked(root):
        d = definition(root)
        report, capsule = inspect(root, d)
        if args.command in ("approve", "deny"):
            require(report["qualified"], "retained inference is unqualified; approval and automatic retry are forbidden")
            require(args.action == ACTION and args.proposal == report["proposalDigest"] and report["proposal"] is not None, "supplied action or exact proposal digest mismatch")
            require(report["status"] in ("suspended", "complete"), "process is not settled at an approval boundary; automatic recovery is forbidden")
            decision = {"decision": args.command, "action": ACTION, "workflow": d["workflow"], "proposalId": report["proposalId"], "proposal": report["proposal"]}
            previous = optional(root / "decision.json")
            require(previous is None or previous == decision, "conflicting immutable decision")
            if report["status"] == "complete":
                require(previous == decision, "terminal process has no matching retained decision")
            else:
                write_json(root / "decision.json", decision)
                call(d, root, "mailbox", "send", d["mailboxes"]["approvals"]["send"], root / "decision.json", "--idempotency-key", report["proposalId"])
                # NO Apple, responses, host config, executor command, or cache.
                call(d, root, "process", "tick", NAME, "--journal")
                report, capsule = inspect(root, definition(root))
                require(report["status"] == "complete" and report["generation"] == 2, "resumption did not complete")
                require(report["publication"] == (args.command == "approve"), "approval branch mismatch")
            if report["publication"]:
                write_json(root / "publication.json", report["proposal"])
        if args.command == "export":
            write_json(root / "evidence.algal.json", capsule, replace=True)
            report["exportVerification"] = run([d["native"]["path"], "process", "verify-evidence", root / "evidence.algal.json"], limit=MAX_JSON)
        save_report(root, report, d)
        return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    begin = commands.add_parser("start")
    begin.add_argument("root")
    begin.add_argument("--native", required=True)
    begin.add_argument("--evidence")
    mode = begin.add_mutually_exclusive_group(required=True)
    mode.add_argument("--apple-bridge")
    mode.add_argument("--responses")
    for name in ("inspect", "export", "approve", "deny"):
        command = commands.add_parser(name)
        command.add_argument("root")
        if name in ("approve", "deny"):
            command.add_argument("--proposal", required=True)
            command.add_argument("--action", required=True)
    args = parser.parse_args()
    print(canonical(start(args) if args.command == "start" else action(args)))


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(json.dumps({"ok": False, "error": str(error)[:2048]}), file=sys.stderr)
        sys.exit(1)
