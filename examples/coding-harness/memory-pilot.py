"""Controlled memory comparison: prepare, acquire seeds, run, report.

All live commands require the admitted host scheduler/Docker wrapper. Seeds use
scripted actions only. The 24 scored episodes have six model attempts each.
"""
from __future__ import annotations

import argparse
import hashlib
import importlib.metadata
import json
import os
from pathlib import Path
import re
import shutil
import signal
import subprocess
import sys
import time
from typing import Any

import pilot

HERE = Path(__file__).resolve().parent
FIXTURES = HERE / "memory-fixtures"
ROOT = "/app/memory-lab"
RELATIVE_ROOT = "memory-lab"
CHECKER_SCRIPT = "#!/bin/sh\nexec python3 /app/memory-lab/visible_test.py\n"
ARMS = ("none", "episodic", "logical")
PROCEDURES = [
    {"id": "factor", "description": "Read the project's current numeric transformation factor.", "operation": {"kind": "read-json-field", "path": RELATIVE_ROOT + "/config.json", "field": "factor"}, "dependencies": ["config"]},
    {"id": "checker", "description": "Resolve the optional memory-check visible-test tool in the declared toolchain.", "operation": {"kind": "resolve-tool", "tool": "memory-check"}, "dependencies": ["toolchain"]},
    {"id": "program", "description": "Fingerprint the application source; this is a file identity, not a passing-test claim.", "operation": {"kind": "fingerprint-file", "path": RELATIVE_ROOT + "/app.py"}, "dependencies": ["program"]},
]
METRICS = {
    "schema": "algal.coding-harness.memory-metrics.v1", "maxCalls": 144,
    "primary": ["independent-solves", "stale-or-unsupported-admissions"],
    "probeIdentity": "procedure identity plus complete declared dependency digests and environment identity",
    "repeatProbe": "a typed probe repeats earlier same-arm/authorized-seed procedure and dependency identity",
    "terminalRepeat": "exact command string repeated after nonzero exit; no claim about intervening filesystem changes",
    "unclassifiedTerminal": "not counted as avoided probes or inferred stale reasoning",
    "gate": {"logicalStaleUnsupportedAdmissions": 0, "logicalSolvesAtLeastEpisodic": True, "benefitedEpisodePairs": 2},
    "unknown": "unknown, conflict, stale, exhausted, and error statuses remain separate; missing audit evidence blocks promotion",
}


def fixture_payload(family: dict[str, Any], episode: int) -> dict[str, Any]:
    spec = family["seed"] if episode == 0 else family["episodes"][episode - 1]
    offset = 0 if episode == 0 else spec["offset"]
    initial = ('import json, sys\n\ndef transform(n):\n    return {"value": n, "checker": "unconfigured"}\n\n'
               'if __name__ == "__main__":\n    print(json.dumps(transform(int(sys.argv[1]))))\n')
    if family["id"] == "direct-change":
        initial = f"# Authored application revision {episode}\n" + initial
    visible = (
        'import json, pathlib, shutil, subprocess, sys\n'
        f'root=pathlib.Path({ROOT!r})\nfactor=json.loads((root/"config.json").read_text())["factor"]\n'
        'checker="memory-check" if shutil.which("memory-check") else "python3"\n'
        'for n in (-2,0,3):\n'
        '    got=json.loads(subprocess.check_output([sys.executable,str(root/"app.py"),str(n)],timeout=5))\n'
        f'    assert got=={{"value":n*factor+{offset},"checker":checker}},(n,got)\n'
        'print("visible checks passed")\n'
    )
    return {"checker": spec["checker"], "files": {
        "app.py": initial,
        "config.json": json.dumps({"factor": spec["factor"]}, sort_keys=True) + "\n",
        "toolchain.txt": f'version={spec["toolchain"]};memory-check={str(spec["checker"]).lower()}\n',
        "README.md": f"Documentation revision {episode}. This file is not a factor/checker dependency.\n",
        "visible_test.py": visible,
    }}


def task_id(family: str, episode: int) -> str:
    return "memory-" + family + ("-seed" if episode == 0 else f"-e{episode}")


def scope_for(manifest: dict[str, Any], family: dict[str, Any], episode: int, payload: dict[str, Any]) -> dict[str, Any]:
    return {"sequenceId": "memory-" + family["id"], "taskId": task_id(family["id"], episode),
            "environmentId": "env-" + manifest["imageDigest"][7:39],
            "dependencies": {key: {"path": RELATIVE_ROOT + "/" + name,
                                    "digest": hashlib.sha256(payload["files"][name].encode()).hexdigest()}
                             for key, name in (("config", "config.json"), ("toolchain", "toolchain.txt"), ("program", "app.py"))}}


def hidden_grader(spec: dict[str, Any], episode: int, payload: dict[str, Any]) -> str:
    if episode == 0:
        return "print('seed acquisition fixture; no performance grade')\n"
    expected_checker = "memory-check" if spec["checker"] else "python3"
    immutable = {name: hashlib.sha256(payload["files"][name].encode()).hexdigest() for name in ("config.json", "toolchain.txt")}
    checker_sha = hashlib.sha256(CHECKER_SCRIPT.encode()).hexdigest()
    checker_check = (f"assert checker.is_file() and os.access(checker,os.X_OK) and hashlib.sha256(checker.read_bytes()).hexdigest()=={checker_sha!r}\n"
                     "assert shutil.which('memory-check')==str(checker),'tool lookup changed'\n" if spec["checker"] else
                     "assert not checker.exists() and shutil.which('memory-check') is None,'absent tool changed'\n")
    return ("import hashlib, json, os, pathlib, shutil, subprocess, sys\n"
            "checker=pathlib.Path('/usr/local/bin/memory-check')\n" + checker_check +
            f"for name, digest in {immutable!r}.items():\n"
            f"    assert hashlib.sha256((pathlib.Path({ROOT!r})/name).read_bytes()).hexdigest()==digest,'immutable fixture changed'\n"
            "for n in (-13,-1,0,1,4,17):\n"
            f"    got=json.loads(subprocess.check_output([sys.executable,{ROOT + '/app.py'!r},str(n)],timeout=5))\n"
            f"    assert got=={{'value':n*{spec['factor']}+{spec['offset']},'checker':{expected_checker!r}}},'incorrect API output'\n"
            "print('independent authored checks passed')\n")


def stage_task(root: Path, manifest: dict[str, Any], family: dict[str, Any], episode: int) -> dict[str, Any]:
    ident = task_id(family["id"], episode)
    payload = fixture_payload(family, episode)
    spec = family["seed"] if episode == 0 else family["episodes"][episode - 1]
    instruction = ("Acquire the declared memory probes, then finish." if episode == 0 else
                   f"Repair {ROOT}/app.py. Its CLI takes one integer n and must print exactly one JSON object with keys value and checker. "
                   f"value must equal n times the CURRENT factor in {ROOT}/config.json, plus {spec['offset']}. "
                   "checker must be 'memory-check' if that command is currently available, otherwise 'python3'. "
                   "Use the current workspace, not an old configuration. Only edit app.py; preserve config.json, toolchain.txt, visible_test.py, "
                   "and the installed toolchain (including the presence, bytes, and executability of /usr/local/bin/memory-check). "
                   f"Visible checks are python3 {ROOT}/visible_test.py; memory-check runs the same checks when available. "
                   "Memory procedures factor, checker, and program are available. The program procedure returns a fingerprint, not a test verdict.\n")
    pinned_image = manifest["image"].rsplit(":", 1)[0] + "@" + manifest["imageDigest"]
    task = root / "tasks" / ident
    files = {
        "instruction.md": instruction,
        "task.toml": f'version = "1.0"\n[agent]\ntimeout_sec = 900.0\n[verifier]\ntimeout_sec = 60.0\n[environment]\ndocker_image = "{pinned_image}"\ncpus = 1\nmemory = "512M"\nstorage = "1G"\n',
        "environment/Dockerfile": f"FROM {pinned_image}\n",
        "fixture.json": pilot.canonical(payload).decode() + "\n",
        "tests/test_outputs.py": hidden_grader(spec, episode, payload),
        "tests/test.sh": "#!/bin/bash\nset -u\nmkdir -p /logs/verifier\nif python3 /tests/test_outputs.py; then echo 1 > /logs/verifier/reward.txt; else echo 0 > /logs/verifier/reward.txt; fi\n",
    }
    for name, content in files.items():
        path = task / name
        path.parent.mkdir(parents=True, exist_ok=True)
        data = content.encode()
        if path.exists() and path.read_bytes() != data:
            raise ValueError("Refusing changed staged fixture: " + str(path))
        if not path.exists():
            path.write_bytes(data)
    return {"id": ident, "family": family["id"], "episode": episode, "image": manifest["image"],
            "imageDigest": manifest["imageDigest"], "imagePlatform": manifest["imagePlatform"],
            "instructionBytes": len(instruction.encode()), "instructionSha256": hashlib.sha256(instruction.encode()).hexdigest(),
            "fixtureSha256": hashlib.sha256(files["fixture.json"].encode()).hexdigest(),
            "taskDigest": pilot.digest({name: hashlib.sha256(content.encode()).hexdigest() for name, content in files.items()}),
            "scope": scope_for(manifest, family, episode, payload), "maxWork": spec.get("maxWork", 50000)}


def matrix(tasks: list[dict[str, Any]], families: list[dict[str, Any]]) -> list[dict[str, Any]]:
    by_id = {item["id"]: item for item in tasks}
    rows = []
    for index, family in enumerate(families):
        order = ARMS[index % 3:] + ARMS[:index % 3]
        for episode in (1, 2):
            for arm in order:
                item = by_id[task_id(family["id"], episode)]
                rows.append({"taskId": item["id"], "family": family["id"], "episode": episode,
                             "arm": arm, "owner": arm + "-" + family["id"], "jobName": arm + "--" + item["id"]})
    return rows


def source_settings(args: argparse.Namespace, manifest: dict[str, Any]) -> dict[str, Any]:
    if importlib.metadata.version("harbor") != "0.23.0":
        raise ValueError("This runner requires Harbor 0.23.0")
    native = hashlib.sha256(Path(args.native_executable).read_bytes()).hexdigest()
    if native != args.native_sha256:
        raise ValueError("Pinned native executable digest mismatch")
    sources = sorted(path for path in HERE.iterdir() if path.suffix in (".ts", ".py") and ".test." not in path.name and not path.name.startswith("test_"))
    source_hashes = {path.name: hashlib.sha256(path.read_bytes()).hexdigest() for path in sources}
    return {"manifestId": pilot.digest(manifest), "metricsId": pilot.digest(METRICS), "nativeSha256": native,
            "sourceId": pilot.digest(source_hashes), "sourceSha256": source_hashes,
            "runtime": pilot.runtime_fingerprint(HERE.parent.parent), "model": args.model, "account": args.account,
            "xcbSha256": hashlib.sha256(Path(args.xcb_executable).read_bytes()).hexdigest(), "maxCallsPerEpisode": 6,
            "maxCallsTotal": 144, "maxMemoryOperations": 4, "maxMemoryVisibleBytes": 8192,
            "paidInferenceCapUsd": 20, "paidApiFallback": False, "harborVersion": "0.23.0"}


def prepare(args: argparse.Namespace) -> dict[str, Any]:
    manifest = pilot.read_json(FIXTURES / "manifest.json")
    tasks = [stage_task(args.output_dir, manifest, family, episode) for family in manifest["families"] for episode in (0, 1, 2)]
    plan = {"schema": "algal.coding-harness.memory-plan.v1", "settings": source_settings(args, manifest),
            "manifest": manifest, "metrics": METRICS, "tasks": tasks, "matrix": matrix(tasks, manifest["families"])}
    plan["settingsId"] = pilot.digest(plan["settings"])
    plan["freezeId"] = pilot.digest(plan)
    pilot.write_json(args.output_dir / "plan.json", plan, immutable=True)
    return plan


def load_plan(args: argparse.Namespace) -> dict[str, Any]:
    plan = pilot.read_json(args.output_dir / "plan.json")
    if plan["freezeId"] != pilot.digest({key: value for key, value in plan.items() if key != "freezeId"}):
        raise ValueError("Frozen memory plan changed")
    if plan["settings"] != source_settings(args, plan["manifest"]):
        raise ValueError("Memory experiment source/backend settings changed")
    # Reproducing staging cannot silently change a snapshot after an earlier arm.
    for family in plan["manifest"]["families"]:
        for episode in (0, 1, 2):
            current = stage_task(args.output_dir, plan["manifest"], family, episode)
            if current not in plan["tasks"]:
                raise ValueError("Staged task identity changed")
    return plan


def copy_seed_records(seed_store: Path, arm_store: Path) -> dict[str, int]:
    paths = sorted((seed_store / "records").glob("*.json"))
    if len(paths) > 512 or sum(path.stat().st_size for path in paths) > 16 * 1024 * 1024:
        raise ValueError("Seed record set exceeds copy bounds")
    target = arm_store / "records"
    target.mkdir(parents=True, exist_ok=True)
    total = 0
    for path in paths:
        data = path.read_bytes()
        name = path.stem
        if len(name) != 64 or hashlib.sha256(pilot.canonical(json.loads(data))).hexdigest() != name:
            raise ValueError("Seed record content identity failed")
        destination = target / path.name
        if destination.exists() and destination.read_bytes() != data:
            raise ValueError("Seed copy would overwrite different evidence")
        if not destination.exists():
            destination.write_bytes(data)
        total += len(data)
    return {"records": len(paths), "bytes": total}


def memory_config(args: argparse.Namespace, plan: dict[str, Any], row: dict[str, Any], seed: dict[str, Any] | None) -> dict[str, Any]:
    task = next(task for task in plan["tasks"] if task["id"] == row["taskId"])
    store = args.output_dir / "private" / row["owner"] / "store"
    refs = []
    if seed is not None and row["arm"] != "none":
        refs = seed["memoryEvidence"]["sourceRefs"]
        if row["episode"] == 1:
            copy_seed_records(Path(seed["storeDir"]), store)
    return {"mode": "logical" if row["arm"] == "seed" else row["arm"], "owner": row["owner"], "storeDir": str(store),
            "nativeExecutable": args.native_executable, "expectedNativeSha256": args.native_sha256,
            "scope": task["scope"], "procedures": PROCEDURES, "seedRefs": refs,
            "maxOperations": 4, "maxVisibleBytes": 8192, "maxWork": task["maxWork"]}


def calibration_gate(path: Path | None, plan: dict[str, Any]) -> str:
    if path is None:
        raise ValueError("Live comparison requires --calibration-report")
    report = pilot.read_json(path)
    settings = report.get("settings", {})
    current = plan["settings"]
    if (report.get("schema") != "algal.coding-harness.report.v1" or report.get("mode") != "calibration" or
            report.get("settingsId") != pilot.digest(settings) or settings.get("maxModelAttempts") != 8 or
            settings.get("model") != current["model"] or settings.get("account") != current["account"] or
            settings.get("xcbExecutableSha256") != current["xcbSha256"] or settings.get("algalRuntime") != current["runtime"] or
            settings.get("paidApiFallback") is not False or settings.get("billing") != "existing-subscription"):
        raise ValueError("Calibration source/backend settings are absent or mismatched")
    for name in ("harness.ts", "protocol.ts", "cli.ts", "xcb.ts", "harbor_adapter.py", "memory.ts", "memory-contract.ts", "memory-records.ts"):
        if settings.get("sourceSha256", {}).get(name) != current["sourceSha256"][name]:
            raise ValueError("Calibration shared execution source changed: " + name)
    episodes = report.get("episodes")
    if report.get("complete") is not True or not isinstance(episodes, list) or len(episodes) != 2:
        raise ValueError("Calibration must contain exactly two completed development trials")
    statuses = [item.get("outcome", {}).get("status") for item in episodes]
    if "success" not in statuses or any(status not in ("success", "failure") for status in statuses):
        raise ValueError("Calibration gate failed: require a solve and no invalid/unknown trials")
    if len({item.get("taskId") for item in episodes}) != 2:
        raise ValueError("Calibration requires two distinct tasks")
    for episode in episodes:
        if (episode.get("engine") != "algal" or episode.get("policy") != pilot.BASELINE or
                episode.get("statusReason") != "independent-verifier" or episode.get("harborExitCode") != 0):
            raise ValueError("Calibration is not the fixed full-context ALGAL control")
        raw = pilot.read_json(Path(episode["harborResultPath"]))
        status, reason = pilot.classify_trial(raw, episode)
        if status != episode["outcome"]["status"] or reason != "independent-verifier":
            raise ValueError("Calibration outcome does not match Harbor evidence")
    return pilot.digest(report)


def run_one(args: argparse.Namespace, plan: dict[str, Any], row: dict[str, Any], seed: dict[str, Any] | None, environment_receipt: dict[str, Any]) -> dict[str, Any]:
    from harbor.models.job.config import JobConfig
    task = next(task for task in plan["tasks"] if task["id"] == row["taskId"])
    family = next(family for family in plan["manifest"]["families"] if family["id"] == row["family"])
    config = memory_config(args, plan, row, seed)
    controller: dict[str, Any] = {"mode": "algal", "policy": pilot.BASELINE, "memory": config,
        "maxModelAttempts": 6, "maxTerminalOutputBytes": 8192, "terminalTimeoutMs": 120000, "modelTimeoutMs": 120000}
    if row["arm"] == "seed":
        controller["scriptedResponses"] = [{"type": "memory.probe", "procedure": procedure} for procedure in family["seedProcedures"]] + [{"type": "finish", "summary": "Seed probes acquired."}]
    else:
        controller["xcb"] = {"executable": args.xcb_executable, "account": args.account, "model": args.model, "maxCalls": 6, "timeoutMs": 120000}
    path = args.output_dir / "tasks" / task["id"]
    job = {"job_name": row["jobName"], "jobs_dir": str(args.output_dir / "jobs"), "n_attempts": 1, "n_concurrent_trials": 1,
           "retry": {"max_retries": 0}, "quiet": True, "environment": {"type": "docker", "delete": True}, "verifier": {"disable": False},
           "agents": [{"import_path": "memory_pilot_agent:MemoryPilotAgent", "model_name": "scripted-fixture" if row["arm"] == "seed" else args.model,
                       "kwargs": {"fixture_path": str(path / "fixture.json"), "fixture_sha256": task["fixtureSha256"]}}], "tasks": [{"path": str(path)}]}
    JobConfig.model_validate(job)
    job_file = args.output_dir / "configs" / (row["jobName"] + ".json")
    pilot.write_json(job_file, job, immutable=True)
    launch = args.output_dir / "launches" / (row["jobName"] + ".json")
    launch.parent.mkdir(parents=True, exist_ok=True)
    with launch.open("x") as stream:
        json.dump({"settingsId": plan["settingsId"], "controllerId": pilot.digest(controller), "environment": environment_receipt}, stream)
    env = {**{key: value for key, value in os.environ.items() if not key.startswith("ALGAL_HARNESS_")}, "PYTHONPATH": str(HERE),
           "TMPDIR": str(args.output_dir / "tmp"), "ALGAL_HARNESS_BUN": args.bun, "ALGAL_HARNESS_CLI": str(HERE / "cli.ts"),
           "ALGAL_HARNESS_CONFIG_JSON": pilot.canonical(controller).decode()}
    Path(env["TMPDIR"]).mkdir(exist_ok=True)
    started = time.monotonic()
    with launch.with_suffix(".log").open("wb") as log:
        child = subprocess.Popen([args.harbor, "run", "--config", str(job_file)], cwd=HERE, env=env, stdout=log, stderr=subprocess.STDOUT)
        handlers = {sig: signal.getsignal(sig) for sig in (signal.SIGINT, signal.SIGTERM)}
        cancelled = False
        def stop(signum: int, _frame: Any) -> None:
            nonlocal cancelled
            cancelled = True
            if child.poll() is None:
                child.send_signal(signum)
        for sig in handlers:
            signal.signal(sig, stop)
        try:
            code = child.wait()
        finally:
            for sig, handler in handlers.items():
                signal.signal(sig, handler)
    result_files = list((args.output_dir / "jobs" / row["jobName"]).glob("*/result.json"))
    raw = pilot.read_json(result_files[0]) if len(result_files) == 1 else {}
    metadata = (raw.get("agent_result") or {}).get("metadata") or {}
    backend = (metadata.get("algal_harness") or {}).get("controllerResult") or {}
    evidence = backend.get("memory")
    if not isinstance(evidence, dict) and isinstance(backend.get("artifactDir"), str):
        evidence_file = Path(backend["artifactDir"]) / "memory-evidence.json"
        if evidence_file.is_file():
            evidence = pilot.read_json(evidence_file)
    valid = (not cancelled and code == 0 and not raw.get("exception_info") and raw.get("task_name") == row["taskId"] and
             backend.get("termination") in ("finished", "budget-exhausted") and (backend.get("verification") or {}).get("ok") is True and isinstance(evidence, dict))
    accounting = backend.get("accounting") or {}
    if not accounting and len(result_files) == 1:
        accounting_file = result_files[0].parent / "algal-host" / "algal" / "accounting.json"
        if accounting_file.is_file():
            accounting = pilot.read_json(accounting_file)
    calls = 0 if row["arm"] == "seed" and accounting.get("billing") == "scripted-fixture" else accounting.get("calls")
    setup = metadata.get("memory_fixture_setup") or {}
    valid = valid and setup.get("verified") is True and setup.get("fixtureSha256") == task["fixtureSha256"]
    valid = valid and backend.get("mode") == "algal" and evidence.get("owner") == row["owner"] and evidence.get("mode") == config["mode"]
    if row["arm"] == "seed":
        valid = valid and accounting.get("billing") == "scripted-fixture" and accounting.get("costUsd") == 0
    else:
        valid = valid and type(calls) is int and 1 <= calls <= 6 and calls == backend.get("modelAttempts")
        valid = valid and accounting.get("billing") == "existing-subscription" and accounting.get("model") == args.model
        valid = valid and accounting.get("costUsd") is None and accounting.get("incrementalPaidApiSpendUsd") == 0
    rewards = (raw.get("verifier_result") or {}).get("rewards")
    reward = rewards.get("reward") if isinstance(rewards, dict) else None
    status = ("success" if reward == 1 else "failure") if valid and type(reward) in (int, float) and reward in (0, 1) else "invalid"
    artifact = Path(backend["artifactDir"]) / "result.json" if isinstance(backend.get("artifactDir"), str) else None
    full = pilot.read_json(artifact) if artifact and artifact.is_file() else {}
    result = {**row, "freezeId": plan["freezeId"], "status": status, "durationMs": round((time.monotonic()-started)*1000), "memoryEvidence": evidence,
              "storeDir": config["storeDir"], "scope": task["scope"], "controller": backend, "trace": full.get("trace", []),
              "setup": metadata.get("memory_fixture_setup"), "harborResultPath": str(result_files[0]) if len(result_files) == 1 else None,
              "accounting": {"modelCalls": calls,
                             "inputTokens": None, "outputTokens": None, "paidCostUsd": None, "incrementalPaidApiSpendUsd": 0}}
    pilot.write_json(args.output_dir / "episodes" / (row["jobName"] + ".json"), result, immutable=True)
    return result


def memory_record(store: Path, ref: str) -> dict[str, Any]:
    if not isinstance(ref, str) or not re.fullmatch(r"sha256:[a-f0-9]{64}", ref):
        raise ValueError("Malformed memory record reference")
    path = store / "records" / (ref[7:] + ".json")
    if path.is_symlink() or path.stat().st_size > 262144:
        raise ValueError("Memory record file failed bound/type check")
    data = path.read_bytes()
    value = json.loads(data)
    if not isinstance(value, dict) or "sha256:" + hashlib.sha256(data).hexdigest() != ref or pilot.canonical(value) != data:
        raise ValueError("Memory record content identity failed")
    return value


def observation(store: Path, ref: str) -> dict[str, Any]:
    source = memory_record(store, ref)
    if source.get("contract") != "algal.harness-observation.v1" or source.get("decoder") != "algal.harness-probe.v1":
        raise ValueError("Not a decoded probe observation")
    definition = memory_record(store, source["procedureRef"])
    procedure = definition.get("procedure")
    if definition.get("contract") != "algal.harness-procedure.v1" or procedure not in PROCEDURES:
        raise ValueError("Source used an undeclared procedure")
    raw = memory_record(store, source["rawRef"])
    result = raw.get("result", {})
    if raw.get("contract") != "algal.harness-probe-raw.v1" or result.get("exitCode") != 0 or result.get("stderr") != "":
        raise ValueError("Probe was not a successful observation")
    lines = result["stdout"].split("\n")
    if lines.pop(0) != "algal-probe-v1" or lines.pop() != "":
        raise ValueError("Probe frame missing")
    for name, dependency in sorted(source["scope"]["dependencies"].items()):
        if lines.pop(0) != name + "\t" + dependency["digest"]:
            raise ValueError("Source dependency frame differs")
    if len(lines) != 1 or not re.fullmatch(r"result\t[01]\t(?:[a-f0-9]{2})*", lines[0]):
        raise ValueError("Invalid probe payload frame")
    _, present, encoded = lines[0].split("\t")
    payload = bytes.fromhex(encoded).decode("utf-8")
    if len(bytes.fromhex(encoded)) > 2048 or (present == "0" and payload):
        raise ValueError("Probe payload bound/presence mismatch")
    value: Any = None
    if present == "1":
        value = payload
        if procedure["operation"]["kind"] == "read-json-field":
            value = json.loads(payload)
            for key in procedure["operation"]["field"].split("."):
                if not isinstance(value, dict) or key not in value:
                    present, value = "0", None
                    break
                value = value[key]
    if isinstance(value, (dict, list)):
        raise ValueError("Expected scalar observation")
    return {"ref": ref, "source": source, "procedure": procedure, "raw": raw,
            "polarity": "supported" if present == "1" else "opposed", "value": value}


def applicable(row: dict[str, Any], scope: dict[str, Any]) -> bool:
    old = row["source"]["scope"]
    return (old["sequenceId"] == scope["sequenceId"] and old["environmentId"] == scope["environmentId"] and
            (row["source"].get("reuse", "task") == "dependencies" or old["taskId"] == scope["taskId"]) and
            all(old["dependencies"].get(name) == scope["dependencies"].get(name) for name in row["procedure"]["dependencies"]))


def probe_identity(row: dict[str, Any]) -> str:
    source = row["source"]
    return pilot.digest({"procedureRef": source["procedureRef"], "environmentId": source["scope"]["environmentId"],
                         "dependencies": {name: source["scope"]["dependencies"][name] for name in row["procedure"]["dependencies"]}})


def verify_visible_witness(shown: dict[str, Any], full: dict[str, Any]) -> None:
    """Expand each indexed witness node and compare with its stored native proof."""
    if shown.get("contract") != "algal.harness-compact-witness.v1":
        raise ValueError("Missing compact witness contract")
    ids = sorted(full["proofs"])
    nodes, references = shown["nodes"], shown["references"]
    if len(nodes) != len(ids):
        raise ValueError("Witness node count changed")
    def index(values: list[Any], at: Any) -> Any:
        if type(at) is not int or not 0 <= at < len(values):
            raise ValueError("Witness index out of bounds")
        return values[at]
    for ident, node in zip(ids, nodes):
        if not isinstance(node, list) or len(node) != 3:
            raise ValueError("Invalid witness node")
        if node[0] == "fact":
            expanded = {"kind": "fact", "fact": index(references, node[1]), "sources": [index(references, at) for at in node[2]]}
        elif node[0] == "rule":
            expanded = {"kind": "rule", "rule": index(references, node[1]), "premises": [index(ids, at) for at in node[2]]}
        else:
            raise ValueError("Invalid witness node kind")
        if expanded != full["proofs"][ident]:
            raise ValueError("Model-visible witness differs from stored native proof")
    expanded_rows = [{"tuple": row["tuple"], "proof": index(ids, row["proof"])} for row in shown["rows"]]
    if expanded_rows != full["rows"] or any(shown.get(key) != full.get(key) for key in ("complete", "witnessPolicy", "work", "rounds")):
        raise ValueError("Model-visible witness result metadata differs")


def audit_episode(row: dict[str, Any], inherited: dict[str, Any], repeat_identities: set[str],
                  inherited_invalidated: set[str] | None = None, inherited_mutation: bool = False) -> dict[str, Any]:
    """Independent data audit; native verification is separately required by the adapter.

    Only typed memory answers are admissions. Arbitrary terminal text is never
    interpreted as a conclusion, and exact failed command retries are reported
    without claiming their filesystem context remained unchanged.
    """
    evidence = row.get("memoryEvidence") or {}
    if evidence.get("owner") != row["owner"] or not isinstance(row.get("trace"), list):
        raise ValueError("Missing memory owner/trace evidence")
    store, scope = Path(row["storeDir"]), row["scope"]
    current = {} if row["arm"] == "none" else dict(inherited)
    invalidated = set(inherited_invalidated or ())
    mutation_seen = inherited_mutation
    if (set(evidence.get("initialInvalidatedRefs", [])) != invalidated or
            evidence.get("initialMutationSeen", False) is not mutation_seen):
        raise ValueError("Episode discarded inherited mutation or invalidation evidence")
    repeated, terminal_calls, failed_repeats, admissions, stale, query_calls = 0, 0, 0, 0, 0, 0
    failed_commands: set[str] = set()
    probes, query_index, probe_index, latest_probe_terminal = evidence.get("probes", []), 0, 0, None
    queries = evidence.get("queries", [])
    for event in row["trace"]:
        if event.get("kind") == "terminal":
            terminal_calls += 1
            if event.get("source") == "memory.probe":
                latest_probe_terminal = event
            else:
                mutation_seen = True
                invalidated.update(current)
                command = event["command"]
                failed_repeats += command in failed_commands
                if event["result"]["exitCode"] != 0:
                    failed_commands.add(command)
            continue
        if event.get("kind") != "memory":
            continue
        action, output = event["action"], event["result"]
        query_calls += action["type"] == "memory.query"
        if action["type"] == "memory.probe" and latest_probe_terminal is not None:
            probe = probes[probe_index]
            probe_index += 1
            if probe["status"] == "error":
                latest_probe_terminal = None
                continue
            observed = observation(store, probe["sourceRef"])
            if ((output.get("status") != "exhausted" and probe["sourceRef"] != output.get("sourceRef")) or observed["source"]["owner"] != row["owner"] or
                    observed["procedure"]["id"] != action["procedure"] or observed["source"]["scope"] != probe["scope"] or
                    probe["polarity"] != observed["polarity"] or probe["value"] != observed["value"] or
                    latest_probe_terminal is None or latest_probe_terminal["command"] != observed["raw"]["command"] or
                    latest_probe_terminal["result"] != observed["raw"]["result"]):
                raise ValueError("Probe evidence differs from actual typed terminal result")
            scope = probe["scope"]
            if any(scope[key] != row["scope"][key] for key in ("sequenceId", "taskId", "environmentId")):
                raise ValueError("Probe changed scope authority")
            if observed["source"].get("reuse") != ("task" if mutation_seen else "dependencies"):
                raise ValueError("Observation reuse escaped its mutation scope")
            identity = probe_identity(observed)
            repeated += identity in repeat_identities
            repeat_identities.add(identity)
            current[probe["sourceRef"]] = observed
            latest_probe_terminal = None
        if output.get("status") in ("read", "episodic"):
            for item in output.get("observations", []):
                observed = current.get(item["sourceRef"])
                if observed is None:
                    raise ValueError("History exposed an unauthorized source")
                expected_label = "current" if item["sourceRef"] not in invalidated and applicable(observed, scope) else "stale"
                if item.get("applicability") != expected_label:
                    raise ValueError("History applicability label differs from current dependencies")
        if action["type"] == "memory.query" and output.get("status") in ("supported", "opposed", "conflicted", "stale", "unknown") and not output.get("snapshotRef"):
            raise ValueError("Query admitted a conclusion without source/proof identity")
        if action["type"] == "memory.query" and (output.get("snapshotRef") or
                (output.get("reason") == "memory-visible-byte-limit" and query_index < len(queries) and row["arm"] != "episodic")):
            query = queries[query_index]
            query_index += 1
            if query["scope"] != scope or (output.get("snapshotRef") and query["snapshotRef"] != output["snapshotRef"]) or query["procedure"] != action["procedure"]:
                raise ValueError("Query ordering/scope mismatch")
            expected = {ref for ref, source in current.items() if ref not in invalidated and applicable(source, scope)}
            actual = set(query["sourceRefs"])
            if actual != expected:
                stale += len(actual - expected)
                raise ValueError("Query active-source set differs from applicable authorized observations")
            snapshot = memory_record(store, query["snapshotRef"])
            memory_record(store, query["programRef"])
            if query["status"] in ("exhausted", "error"):
                if query.get("answers") or query.get("verified") is not False or output.get("status") not in (query["status"], "exhausted"):
                    raise ValueError("Unresolved query admitted answers")
                continue
            result = memory_record(store, query["resultRef"])
            if query.get("verified") is not True or result.get("complete") is not True or query["answers"] != [answer["tuple"] for answer in result["rows"]]:
                raise ValueError("Missing complete verified query result")
            snapshot_current = {fact["tuple"][0] for fact in snapshot["facts"] if fact["relation"] == "source-current"}
            if snapshot_current != expected:
                raise ValueError("Query snapshot omitted or added applicable sources")
            supports = [answer for answer in query["answers"] if answer[1] == "supported"]
            opposes = [answer for answer in query["answers"] if answer[1] == "opposed"]
            has_history = any(source["procedure"]["id"] == action["procedure"] for source in current.values())
            derived = ("conflicted" if (supports and opposes) or len({pilot.digest(answer[2]) for answer in supports}) > 1 else
                       "supported" if supports else "opposed" if opposes else "stale" if has_history else "unknown")
            if query["status"] != derived or output.get("status") not in (derived, "exhausted"):
                raise ValueError("Query conclusion differs from proof answers")
            for answer in query["answers"]:
                admissions += output.get("status") != "exhausted"
                if not any(source["procedure"]["id"] == answer[0] == action["procedure"] and source["polarity"] == answer[1] and source["value"] == answer[2]
                           for ref, source in current.items() if ref in expected):
                    stale += 1
            if output.get("status") != "exhausted":
                shown = output.get("result") or {}
                if (output.get("resultRef") != query["resultRef"] or shown.get("complete") is not True or
                        [answer["tuple"] for answer in shown.get("rows", [])] != query["answers"]):
                    raise ValueError("Model-visible answers differ from stored result")
                verify_visible_witness(shown, result)
    if query_index != len(queries) or probe_index != len(probes) or set(evidence.get("sourceRefs", [])) != set(current):
        raise ValueError("Unmatched memory events or unauthorized historical sources")
    if terminal_calls != row["controller"]["terminalCalls"] or len(probes) != evidence.get("probeCalls"):
        raise ValueError("Terminal/probe accounting mismatch")
    if set(evidence.get("invalidatedRefs", [])) != invalidated or evidence.get("mutationSeen", False) is not mutation_seen:
        raise ValueError("Final mutation evidence differs from the terminal trace")
    return {"sources": current, "invalidated": invalidated, "mutationSeen": mutation_seen,
            "repeatedProbes": repeated, "terminalCalls": terminal_calls,
            "queryCalls": query_calls, "failedCommandRepeats": failed_repeats, "admissions": admissions, "staleUnsupportedAdmissions": stale}


def summarize(plan: dict[str, Any], episodes: list[dict[str, Any]], seeds: list[dict[str, Any]]) -> dict[str, Any]:
    scores, audits, errors, seed_sources = {}, {}, [], {}
    expected_rows = {row["jobName"]: row for row in plan["matrix"]}
    actual_rows = {row["jobName"]: row for row in episodes}
    if len(actual_rows) != len(episodes) or any(key not in expected_rows for key in actual_rows):
        raise ValueError("Duplicate or out-of-matrix episode")
    for seed in seeds:
        try:
            if seed["status"] == "invalid" or seed["freezeId"] != plan["freezeId"]:
                raise ValueError("Invalid or mismatched seed")
            seed_sources[seed["family"]] = audit_episode(seed, {}, set())["sources"]
        except (ValueError, KeyError, IndexError, TypeError, OSError) as exc:
            errors.append({"job": seed["jobName"], "error": str(exc)})
    histories: dict[str, dict[str, Any]] = {}
    identities: dict[str, set[str]] = {}
    invalidations: dict[str, set[str]] = {}
    mutations: dict[str, bool] = {}
    for spec in plan["matrix"]:
        row = actual_rows.get(spec["jobName"])
        if row is None:
            continue
        try:
            if any(row.get(key) != value for key, value in spec.items()) or row.get("freezeId") != plan["freezeId"]:
                raise ValueError("Episode identity differs from frozen matrix")
            owner = row["owner"]
            initial = {} if row["arm"] == "none" else seed_sources[row["family"]]
            history = histories.get(owner, initial)
            repeat = identities.setdefault(owner, {probe_identity(source) for source in initial.values()})
            audit = audit_episode(row, history, repeat, invalidations.get(owner), mutations.get(owner, False))
            audits[row["jobName"]] = {key: value for key, value in audit.items() if key not in ("sources", "invalidated", "mutationSeen")}
            histories[owner] = audit["sources"]
            invalidations[owner] = audit["invalidated"]
            mutations[owner] = audit["mutationSeen"]
        except (ValueError, KeyError, IndexError, TypeError, OSError) as exc:
            errors.append({"job": row["jobName"], "error": str(exc)})
    for arm in ARMS:
        rows = [row for row in episodes if row["arm"] == arm]
        statuses: dict[str, int] = {}
        for row in rows:
            for outcome in (row.get("memoryEvidence") or {}).get("outcomes", []):
                status = outcome.get("status", "missing")
                statuses[status] = statuses.get(status, 0) + 1
        scores[arm] = {"attempted": len(rows), "solves": sum(row["status"] == "success" for row in rows),
                       "invalid": sum(row["status"] == "invalid" for row in rows), "memoryStatuses": statuses,
                       **{key: sum((row.get("memoryEvidence") or {}).get(key, 0) for row in rows)
                          for key in ("probeCalls", "operations", "visibleBytes", "nativeCalls", "nativeWork")},
                       "nativeWorkIsLowerBound": any((row.get("memoryEvidence") or {}).get("nativeWorkIsLowerBound", False)
                                                    for row in rows),
                       **{key: sum(audits.get(row["jobName"], {}).get(key, 0) for row in rows)
                          for key in ("repeatedProbes", "terminalCalls", "failedCommandRepeats", "admissions", "staleUnsupportedAdmissions", "queryCalls")},
                       "durationMs": sum(row["durationMs"] for row in rows),
                       "setupDurationMs": sum((row.get("setup") or {}).get("durationMs", 0) for row in rows),
                       "modelCalls": sum(row["accounting"]["modelCalls"] for row in rows if type(row["accounting"].get("modelCalls")) is int)}
    by_pair = {(row["family"], row["episode"], row["arm"]): row for row in episodes}
    benefits = []
    for family in plan["manifest"]["families"]:
        for episode in (1, 2):
            logical = by_pair.get((family["id"], episode, "logical"))
            episodic = by_pair.get((family["id"], episode, "episodic"))
            if logical and episodic and logical["status"] == "success" and all(row["jobName"] in audits for row in (logical, episodic)):
                if episodic["status"] == "failure" or audits[logical["jobName"]]["repeatedProbes"] < audits[episodic["jobName"]]["repeatedProbes"]:
                    benefits.append({"family": family["id"], "episode": episode})
    calls = [row["accounting"].get("modelCalls") for row in episodes]
    known_calls = all(type(value) is int and 1 <= value <= 6 for value in calls)
    total_calls = sum(calls) if known_calls else None
    complete = (len(episodes) == 24 and len(seed_sources) == 4 and not errors and known_calls and
                all(row["status"] in ("success", "failure") for row in episodes))
    gate = (complete and scores["logical"]["staleUnsupportedAdmissions"] == 0 and
            scores["logical"]["solves"] >= scores["episodic"]["solves"] and len(benefits) >= 2)
    return {"schema": "algal.coding-harness.memory-report.v1", "freezeId": plan["freezeId"], "complete": complete,
            "scores": scores, "benefitedEpisodePairs": benefits, "episodeAudits": audits,
            "provenanceAudit": {"complete": not errors and len(audits) == len(episodes) and len(seed_sources) == 4, "errors": errors}, "gatePassed": gate,
            "seedAcquisition": {"episodes": len(seeds), "modelCalls": 0, "durationMs": sum(row["durationMs"] for row in seeds),
                                "probeCalls": sum((row.get("memoryEvidence") or {}).get("probeCalls", 0) for row in seeds)},
            "totalModelCalls": total_calls, "knownModelCallsLowerBound": sum(value for value in calls if type(value) is int),
            "unknownCallEpisodes": sum(type(value) is not int for value in calls),
            "maxModelCalls": 144, "costUsd": None, "incrementalPaidApiSpendUsd": 0,
            "limitations": ["No inference about stale reasoning inside arbitrary shell commands.",
                            "Unknown upstream token and dollar attribution; wall time includes sandbox setup and grading."],
            "claim": "Controlled authored-scenario comparison; no general coding-agent or Datalog-specific claim."}


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=("prepare", "seed", "run", "report"))
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--native-executable", required=True)
    parser.add_argument("--native-sha256", required=True)
    parser.add_argument("--account", default=os.environ.get("ALGAL_HARNESS_ACCOUNT"))
    parser.add_argument("--model", default="claude/sonnet/low", choices=("claude/sonnet/low",))
    parser.add_argument("--xcb-executable", default=shutil.which("xcb"))
    parser.add_argument("--bun", default=os.environ.get("ALGAL_HARNESS_BUN") or shutil.which("bun"))
    parser.add_argument("--harbor", default=str(Path(sys.executable).with_name("harbor")))
    parser.add_argument("--docker", default="docker")
    parser.add_argument("--calibration-report", type=Path)
    args = parser.parse_args(argv)
    if not args.bun or not args.xcb_executable or not args.account:
        parser.error("Explicit Bun/XCB paths and subscription account are required")
    args.output_dir = args.output_dir.resolve()
    args.native_executable = str(Path(args.native_executable).resolve())
    args.output_dir.mkdir(parents=True, exist_ok=True)
    if args.command == "prepare":
        plan = prepare(args)
        print(json.dumps({"plan": str(args.output_dir / "plan.json"), "freezeId": plan["freezeId"], "episodes": 24, "maxCalls": 144}))
        return
    plan = load_plan(args)
    if args.command == "report":
        rows = [pilot.read_json(path) for path in sorted((args.output_dir / "episodes").glob("*.json")) if not path.name.startswith("seed--")]
        seeds = [pilot.read_json(path) for path in sorted((args.output_dir / "episodes").glob("seed--*.json"))]
        result = summarize(plan, rows, seeds)
        pilot.write_json(args.output_dir / "report.json", result)
        print(json.dumps(result))
        return
    if args.command == "run":
        calibration_id = calibration_gate(args.calibration_report, plan)
        pilot.write_json(args.output_dir / "calibration-admission.json", {"reportId": calibration_id}, immutable=True)
    lock = args.output_dir / ".runner-lock"
    with lock.open("x") as stream:
        stream.write(str(os.getpid()))
    try:
        if args.command == "seed":
            rows = [{"arm": "seed", "family": family["id"], "episode": 0, "owner": "seed-" + family["id"],
                     "taskId": task_id(family["id"], 0), "jobName": "seed--" + family["id"]} for family in plan["manifest"]["families"]]
        else:
            rows = plan["matrix"]
        tasks = {task["id"]: task for task in plan["tasks"]}
        environment = pilot.inspect_task_environment(args.docker, args.output_dir / "tasks", tasks[rows[0]["taskId"]])
        for row in rows:
            seed = None if row["arm"] == "seed" else pilot.read_json(args.output_dir / "episodes" / ("seed--" + row["family"] + ".json"))
            if seed and seed["status"] == "invalid":
                raise ValueError("Seed acquisition did not complete")
            result = run_one(args, plan, row, seed, environment)
            print(json.dumps({"job": row["jobName"], "status": result["status"]}), flush=True)
            if result["status"] == "invalid":
                raise RuntimeError("Invalid episode; stop without retry or further inference")
    finally:
        lock.unlink()


if __name__ == "__main__":
    main()
