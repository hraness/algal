"""Serial, opt-in live Harbor pilot. The default invocation only writes a plan.

Run under the repository/host scheduler and the admitted Docker wrapper. This
module never starts Docker, changes its configuration, or retries a trial.
"""
from __future__ import annotations

import argparse
import hashlib
import importlib.metadata
import json
import math
import os
from pathlib import Path
import signal
import subprocess
import sys
import time
import tomllib
from typing import Any

HERE = Path(__file__).resolve().parent
MAX_JSON_BYTES = 8 * 1024 * 1024
BASELINE = {"version": 1, "context": {"mode": "full"}, "testPolicy": "focused-first", "recoveryPolicy": "diagnose-once"}
MANUAL_CANDIDATE = {**BASELINE, "context": {"mode": "recent-with-first", "maxMessages": 3}}
BRIDGE = """
import {parseHarnessPolicy,parseCandidateProposal,policyId,selectAndFreezePolicy,summarizeOutcomes,summarizeHoldout} from './protocol.ts';
const input=JSON.parse(await Bun.stdin.text());
let value;
if(input.op==='policy'){const policy=parseHarnessPolicy(input.policy);value={policy,policyId:policyId(policy)};}
else if(input.op==='freeze') value=selectAndFreezePolicy(input.input);
else if(input.op==='summary') value=summarizeOutcomes(input.outcomes);
else if(input.op==='holdout') value=summarizeHoldout(input.split,input.frozen,input.outcomes);
else if(input.op==='proposal') value=parseCandidateProposal(input.proposal,input.split);
else throw new Error('Unknown protocol operation');
console.log(JSON.stringify(value));
"""


def canonical(value: Any) -> bytes:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False, allow_nan=False).encode()


def digest(value: Any) -> str:
    return "sha256:" + hashlib.sha256(canonical(value)).hexdigest()


def read_json(path: Path) -> Any:
    if path.stat().st_size > MAX_JSON_BYTES:
        raise ValueError(f"JSON evidence exceeds {MAX_JSON_BYTES} bytes: {path}")
    return json.loads(path.read_text(), parse_constant=lambda _: (_ for _ in ()).throw(ValueError("nonfinite JSON")))


def write_json(path: Path, value: Any, *, immutable: bool = False) -> None:
    data = canonical(value) + b"\n"
    if len(data) > MAX_JSON_BYTES:
        raise ValueError("JSON evidence exceeds byte limit")
    path.parent.mkdir(parents=True, exist_ok=True)
    if immutable and path.exists():
        if path.read_bytes() != data:
            raise ValueError(f"Refusing to overwrite different evidence: {path}")
        return
    with path.open("xb" if immutable else "wb") as stream:
        stream.write(data)


def protocol(bun: str, value: dict[str, Any]) -> Any:
    result = subprocess.run([bun, "-e", BRIDGE], input=canonical(value), stdout=subprocess.PIPE,
                            stderr=subprocess.PIPE, cwd=HERE, timeout=30, check=False)
    if result.returncode:
        raise ValueError("Protocol admission failed: " + result.stderr.decode(errors="replace")[-1500:])
    if len(result.stdout) > MAX_JSON_BYTES:
        raise ValueError("Protocol output exceeds bound")
    return json.loads(result.stdout)


def validate_staged_task(task_root: Path, task: dict[str, Any]) -> Path:
    path = (task_root / task["id"]).resolve()
    if path.parent != task_root.resolve() or not (path / "task.toml").is_file():
        raise ValueError(f"Missing exact staged task: {task['id']}")
    instruction = path / "instruction.md"
    if instruction.stat().st_size != task["instructionBytes"] or hashlib.sha256(instruction.read_bytes()).hexdigest() != task["instructionSha256"]:
        raise ValueError(f"Staged task instruction differs from benchmark pin: {task['id']}")
    return path


def runtime_fingerprint(repo_root: Path) -> dict[str, Any]:
    """Bind actual reference-runtime bytes, including dirty files and WASM."""
    paths = sorted([repo_root / "index.ts", *(path for path in (repo_root / "src").rglob("*") if path.is_file())])
    if len(paths) > 4096 or not (repo_root / "index.ts").is_file() or not (repo_root / "src" / "algal_expr.wasm").is_file():
        raise ValueError("Missing or oversized ALGAL runtime source set")
    total_bytes = 0
    hashes = {}
    for path in paths:
        total_bytes += path.stat().st_size
        if total_bytes > 64 * 1024 * 1024:
            raise ValueError("ALGAL runtime exceeds source fingerprint byte bound")
        with path.open("rb") as stream:
            data = stream.read(64 * 1024 * 1024 + 1)
        if len(data) != path.stat().st_size or len(data) > 64 * 1024 * 1024:
            raise ValueError("ALGAL runtime source changed or exceeded bound during fingerprint")
        hashes[path.relative_to(repo_root).as_posix()] = hashlib.sha256(data).hexdigest()
    return {"digest": digest(hashes), "files": len(hashes), "bytes": total_bytes}


def docker_json(docker: str, arguments: list[str]) -> Any:
    result = subprocess.run([docker, *arguments], stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                            timeout=30, check=False)
    if result.returncode != 0:
        raise ValueError("Read-only Docker image/version admission failed; runner never pulls or builds images")
    if len(result.stdout) > 1024 * 1024:
        raise ValueError("Docker metadata exceeds admission byte bound")
    return json.loads(result.stdout)


def validate_image_metadata(raw: Any, task: dict[str, Any]) -> dict[str, Any]:
    if not isinstance(raw, dict):
        raise ValueError("Docker image metadata must be an object")
    repository = task["image"].rsplit(":", 1)[0]
    expected = repository + "@" + task["imageDigest"]
    repo_digests = raw.get("RepoDigests")
    platform = str(raw.get("Os", "")) + "/" + str(raw.get("Architecture", ""))
    if raw.get("Variant"):
        platform += "/" + str(raw["Variant"])
    if (not isinstance(repo_digests, list) or len(repo_digests) > 128 or
            not all(isinstance(value, str) and len(value) <= 512 for value in repo_digests) or expected not in repo_digests):
        raise ValueError(f"Cached image digest differs from frozen benchmark: {task['id']}")
    if platform != task["imagePlatform"]:
        raise ValueError(f"Cached image platform differs from frozen benchmark: {task['id']}")
    image_id = raw.get("Id")
    if not isinstance(image_id, str) or not image_id.startswith("sha256:") or len(image_id) != 71:
        raise ValueError("Docker image lacks a content identity")
    return {"taskId": task["id"], "expectedRepoDigest": expected, "imageId": image_id,
            "platform": platform, "repoDigests": sorted(repo_digests)}


def inspect_task_environment(docker: str, task_root: Path, task: dict[str, Any]) -> dict[str, Any]:
    path = validate_staged_task(task_root, task)
    config = tomllib.loads((path / "task.toml").read_text())
    image = config.get("environment", {}).get("docker_image")
    repository = task["image"].rsplit(":", 1)[0]
    pinned_reference = repository + "@" + task["imageDigest"]
    if image not in (task["image"], pinned_reference):
        raise ValueError("Staged task image reference differs from frozen benchmark")
    raw = docker_json(docker, ["image", "inspect", "--format", "{{json .}}", image])
    admitted = validate_image_metadata(raw, task)
    versions = docker_json(docker, ["version", "--format", "{{json .}}"])
    recorded_versions = {}
    for role in ("Client", "Server"):
        value = versions.get(role) if isinstance(versions, dict) else None
        if not isinstance(value, dict) or not isinstance(value.get("Version"), str) or not 1 <= len(value["Version"]) <= 128:
            raise ValueError("Docker client/server version evidence is missing")
        recorded_versions[role.lower()] = value["Version"]
    return {"schema": "algal.coding-harness.environment.v1", **admitted, "requestedImage": image,
            "dockerVersions": recorded_versions, "checkedAtUnix": time.time()}


def settings(args: argparse.Namespace, benchmark: dict[str, Any]) -> dict[str, Any]:
    if importlib.metadata.version("harbor") != benchmark["harbor"]["version"]:
        raise ValueError("Installed Harbor version differs from benchmark pin")
    files = sorted(path.name for pattern in ("*.ts", "*.py") for path in HERE.glob(pattern) if path.is_file())
    task_files = {}
    for task in benchmark["tasks"]:
        root = validate_staged_task(args.task_root, task)
        # Hash opaque task bytes, including the verifier, without exposing their
        # contents to the coding agent. This catches staging changes between arms.
        files_in_task = sorted(path for path in root.rglob("*") if path.is_file())
        if len(files_in_task) > 512 or sum(path.stat().st_size for path in files_in_task) > 32 * 1024 * 1024:
            raise ValueError("Staged task exceeds bounded source fingerprint limits")
        task_files[task["id"]] = digest({str(path.relative_to(root)): hashlib.sha256(path.read_bytes()).hexdigest() for path in files_in_task})
    return {
        "benchmarkId": digest(benchmark), "model": args.model, "account": args.account,
        "xcbExecutableSha256": hashlib.sha256(Path(args.xcb_executable).read_bytes()).hexdigest(),
        "maxModelAttempts": args.max_model_attempts, "modelTimeoutMs": 120000,
        "terminalTimeoutMs": 120000, "maxTerminalOutputBytes": 8192,
        "environment": "docker", "harborVersion": benchmark["harbor"]["version"],
        "pythonVersion": sys.version.split()[0],
        "bunVersion": subprocess.check_output([args.bun, "--version"], text=True).strip(),
        "sourceSha256": {name: hashlib.sha256((HERE / name).read_bytes()).hexdigest() for name in files},
        "algalRuntime": runtime_fingerprint(HERE.parent.parent),
        "stagedTaskDigests": task_files,
        "paidInferenceCapUsd": 20, "billing": "existing-subscription", "paidApiFallback": False,
        "modelVersionLimitation": "Configured selector; immutable upstream model weights are unavailable.",
    }


def row_plan(arm: str, engine: str, task_id: str, policy: dict[str, Any], policy_id: str) -> dict[str, Any]:
    return {"arm": arm, "engine": engine, "taskId": task_id, "repeat": 0,
            "policy": policy, "policyId": policy_id,
            "jobName": f"{arm}--{task_id}--{policy_id[7:19]}"}


def build_matrix(mode: str, benchmark: dict[str, Any], baseline: dict[str, Any], candidate: dict[str, Any], frozen: dict[str, Any] | None, smoke_task: str = "regex-log") -> list[dict[str, Any]]:
    dev = benchmark["split"]["devTaskIds"]
    holdout = benchmark["split"]["holdoutTaskIds"]
    rows = []
    if mode == "calibration":
        if len(dev) != 2:
            raise ValueError("Calibration requires exactly two development tasks")
        arms = [("calibration-algal", "algal", baseline)]
        tasks = dev
    elif mode == "smoke":
        if smoke_task not in dev:
            raise ValueError("Smoke task must belong to the pinned development split")
        arms = [("smoke-algal", "algal", baseline)]
        tasks = [smoke_task]
    elif mode == "paired-dev":
        arms = [("baseline-fixed", "baseline", baseline), ("algal-fixed", "algal", baseline)]
        tasks = dev
    elif mode == "candidate-dev":
        arms = [("algal-candidate", "algal", candidate)]
        tasks = dev
    elif mode == "heldout":
        if frozen is None:
            raise ValueError("Heldout execution requires a previously frozen selection")
        arms = [("baseline-fixed", "baseline", baseline), ("algal-fixed", "algal", baseline),
                ("algal-selected", "algal", frozen["selection"])]
        tasks = holdout
    else:
        raise ValueError("Unknown matrix mode")
    # Pair engines within each task; runs and task containers remain serial.
    for task_id in tasks:
        for arm, engine, item in arms:
            rows.append(row_plan(arm, engine, task_id, item["policy"], item["policyId"]))
    return rows


def controller_environment(args: argparse.Namespace, row: dict[str, Any]) -> dict[str, str]:
    controller = {
        "mode": row["engine"], "policy": row["policy"],
        "xcb": {"executable": args.xcb_executable, "account": args.account, "model": args.model,
                "maxCalls": args.max_model_attempts, "timeoutMs": 120000},
        "maxModelAttempts": args.max_model_attempts, "modelTimeoutMs": 120000,
        "terminalTimeoutMs": 120000, "maxTerminalOutputBytes": 8192,
    }
    return {"ALGAL_HARNESS_BUN": args.bun, "ALGAL_HARNESS_CLI": str(HERE / "cli.ts"),
            "ALGAL_HARNESS_CONFIG_JSON": canonical(controller).decode()}


def job_config(args: argparse.Namespace, row: dict[str, Any], task_path: Path) -> dict[str, Any]:
    return {
        "job_name": row["jobName"], "jobs_dir": str(args.output_dir / "jobs"),
        "n_attempts": 1, "n_concurrent_trials": 1, "quiet": True,
        "retry": {"max_retries": 0}, "environment": {"type": "docker", "delete": True},
        # Harbor forwards AgentConfig.env to task execution. Host routing belongs
        # only in the Harbor/controller process environment, never in this field.
        "agents": [{"import_path": "harbor_adapter:AlgalHarborAgent", "model_name": args.model}],
        "tasks": [{"path": str(task_path)}], "verifier": {"disable": False},
    }


def classify_trial(raw: Any, row: dict[str, Any]) -> tuple[str, str]:
    """Only Harbor's independent scalar verifier reward can confer success."""
    if not isinstance(raw, dict) or raw.get("task_name") != row["taskId"]:
        return "invalid", "missing-or-mismatched-task-result"
    if raw.get("exception_info") is not None:
        return "invalid", "harbor-exception"
    metadata = (raw.get("agent_result") or {}).get("metadata") or {}
    receipt = metadata.get("algal_harness") or {}
    result = receipt.get("controllerResult") or {}
    if receipt.get("status") != "controller_completed" or result.get("policyId") != row["policyId"] or result.get("mode") != row["engine"]:
        return "invalid", "missing-or-mismatched-controller-evidence"
    if result.get("termination") not in ("finished", "budget-exhausted"):
        return "invalid", "unresolved-controller-termination"
    if row["engine"] == "algal" and (result.get("verification") or {}).get("ok") is not True:
        return "invalid", "receipt-verification-failed"
    accounting = result.get("accounting") or {}
    if accounting.get("billing") != "existing-subscription" or accounting.get("incrementalPaidApiSpendUsd") != 0:
        return "invalid", "unexpected-backend-accounting"
    rewards = (raw.get("verifier_result") or {}).get("rewards")
    if not isinstance(rewards, dict) or set(rewards) != {"reward"}:
        return "invalid", "missing-or-unsupported-verifier-reward"
    reward = rewards["reward"]
    if type(reward) not in (float, int) or not math.isfinite(reward) or reward not in (0, 1):
        return "invalid", "malformed-verifier-reward"
    return ("success" if reward == 1 else "failure"), "independent-verifier"


def collect_trial(job_dir: Path, row: dict[str, Any], duration_ms: int, exit_code: int) -> dict[str, Any]:
    paths = sorted(job_dir.glob("*/result.json"))
    try:
        raw = read_json(paths[0]) if len(paths) == 1 else None
        status, reason = classify_trial(raw, row)
    except (ValueError, TypeError, AttributeError, OSError):
        status, reason = "invalid", "malformed-or-unreadable-trial-evidence"
    if exit_code != 0:
        status, reason = "invalid", "harbor-command-failed"
    return {
        **row, "statusReason": reason, "harborExitCode": exit_code,
        "harborResultPath": str(paths[0]) if len(paths) == 1 else None,
        "outcome": {"taskId": row["taskId"], "repeat": row["repeat"], "policyId": row["policyId"],
                    "status": status, "durationMs": duration_ms, "paidCostUsd": None,
                    "inputTokens": None, "outputTokens": None},
    }


def run_episode(args: argparse.Namespace, row: dict[str, Any], config_path: Path, environment_receipt: dict[str, Any]) -> dict[str, Any]:
    launch = args.output_dir / "launches" / (row["jobName"] + ".json")
    launch.parent.mkdir(parents=True, exist_ok=True)
    # Exclusive creation refuses retries even when a prior outcome is unknown.
    host_controller = controller_environment(args, row)
    write_json(args.output_dir / "environments" / (row["jobName"] + ".json"), environment_receipt, immutable=True)
    with launch.open("x") as stream:
        json.dump({"startedAtUnix": time.time(), "configSha256": hashlib.sha256(config_path.read_bytes()).hexdigest(),
                   "hostControllerEnvironmentId": digest(host_controller), "environmentReceiptId": digest(environment_receipt)}, stream)
    env = {**{key: value for key, value in os.environ.items() if not key.startswith("ALGAL_HARNESS_")},
           **host_controller, "PYTHONPATH": str(HERE), "TMPDIR": str(args.output_dir / "tmp")}
    Path(env["TMPDIR"]).mkdir(exist_ok=True)
    started = time.monotonic()
    log_path = args.output_dir / "launches" / (row["jobName"] + ".log")
    with log_path.open("wb") as log:
        child = subprocess.Popen([args.harbor, "run", "--config", str(config_path)], stdout=log, stderr=subprocess.STDOUT, cwd=HERE, env=env)
        old = {sig: signal.getsignal(sig) for sig in (signal.SIGINT, signal.SIGTERM)}
        cancelled = False
        def stop(signum: int, _frame: Any) -> None:
            nonlocal cancelled
            cancelled = True
            if child.poll() is None:
                child.send_signal(signum)
        for sig in old:
            signal.signal(sig, stop)
        try:
            code = child.wait()  # Harbor/controller own bounded cancellation and settlement.
        finally:
            for sig, previous in old.items():
                signal.signal(sig, previous)
    result = collect_trial(args.output_dir / "jobs" / row["jobName"], row, round((time.monotonic() - started) * 1000), code)
    result["environmentReceiptId"] = digest(environment_receipt)
    if cancelled:
        result["outcome"]["status"] = "invalid"
        result["statusReason"] = "cancelled-no-retry"
    write_json(args.output_dir / "episodes" / (row["jobName"] + ".json"), result, immutable=True)
    return result


def freeze(args: argparse.Namespace, benchmark: dict[str, Any], current: dict[str, Any]) -> dict[str, Any]:
    reports = [read_json(args.output_dir / "reports" / f"{name}.json") for name in ("paired-dev", "candidate-dev")]
    if any(report.get("settingsId") != digest(current) or report.get("complete") is not True for report in reports):
        raise ValueError("Freeze requires complete development reports with unchanged settings")
    rows = [row for report in reports for row in report["episodes"]]
    candidates = []
    for arm in ("algal-fixed", "algal-candidate"):
        group = [row for row in rows if row["arm"] == arm]
        if not group or len({row["policyId"] for row in group}) != 1:
            raise ValueError("Missing or inconsistent development candidate")
        candidates.append({"policy": group[0]["policy"], "outcomes": [row["outcome"] for row in group]})
    if candidates[0]["policy"] == candidates[1]["policy"]:
        raise ValueError("Candidate must differ from fixed baseline")
    overhead = []
    proposal_id = None
    if args.proposal_record:
        record = read_json(args.proposal_record)
        if (record.get("schema") != "algal.coding-harness.proposal.v1" or
                record.get("status") != "admitted" or record.get("source") != "model-generated"):
            raise ValueError("Freeze requires an admitted model-generated proposal record")
        proposal = protocol(args.bun, {"op": "proposal", "proposal": record["proposal"], "split": benchmark["split"]})
        if proposal["policy"] != candidates[1]["policy"]:
            raise ValueError("Proposal policy differs from evaluated candidate")
        parent = protocol(args.bun, {"op": "policy", "policy": candidates[0]["policy"]})
        evidence = record.get("evidence")
        split = {**benchmark["split"], "devTaskIds": sorted(benchmark["split"]["devTaskIds"]), "holdoutTaskIds": sorted(benchmark["split"]["holdoutTaskIds"])}
        expected_evidence = {"split": split, "parentPolicy": parent["policy"], "parentPolicyId": parent["policyId"],
                             "outcomes": candidates[0]["outcomes"], "evidenceTaskIds": split["devTaskIds"]}
        if not isinstance(evidence, dict) or set(evidence) != set(expected_evidence):
            raise ValueError("Proposal evidence does not bind the evaluated baseline development report")
        actual_evidence = {**evidence, "outcomes": sorted(evidence["outcomes"], key=canonical)}
        expected_evidence["outcomes"] = sorted(expected_evidence["outcomes"], key=canonical)
        if (canonical(actual_evidence) != canonical(expected_evidence) or proposal["parentPolicyId"] != parent["policyId"] or
                proposal["evidenceTaskIds"] != split["devTaskIds"]):
            raise ValueError("Proposal ancestry or evidence differs from the evaluated baseline development report")
        accounting = record.get("accounting")
        if (not isinstance(accounting, dict) or accounting.get("billing") != "existing-subscription" or
                accounting.get("incrementalPaidApiSpendUsd") != 0 or type(accounting.get("calls")) is not int or accounting["calls"] != 1 or
                type(accounting.get("completedCalls")) is not int or accounting["completedCalls"] != 1 or accounting.get("model") != current["model"] or
                accounting.get("executableDigest") != current["xcbExecutableSha256"] or
                not isinstance(accounting.get("requestIds"), list) or len(accounting["requestIds"]) != 1 or
                not isinstance(accounting["requestIds"][0], str) or not accounting["requestIds"][0]):
            raise ValueError("Proposal accounting must bind one completed call on the experiment backend")
        if (any(accounting.get(field) is not None for field in ("costUsd", "inputTokens", "outputTokens")) or
                any(record["usage"].get(field) is not None for field in ("paidCostUsd", "inputTokens", "outputTokens"))):
            raise ValueError("Unreported subscription usage must remain unknown")
        overhead.append(record["usage"])
        proposal_id = digest(record)
    selected = protocol(args.bun, {"op": "freeze", "input": {"split": benchmark["split"], "candidates": candidates, "searchOverhead": overhead}})
    record = {"schema": "algal.coding-harness.frozen-pilot.v1", "settingsId": digest(current),
              "settings": current, "selection": selected,
              "candidateOrigin": "model-proposal" if proposal_id else "manual-policy", "proposalRecordId": proposal_id,
              "developmentReports": {name: digest(report) for name, report in zip(("paired-dev", "candidate-dev"), reports)},
              "createdAtUnix": time.time(), "claim": "Development selection only; no demonstrated held-out improvement."}
    target = args.frozen or args.output_dir / "frozen.json"
    if target.exists():
        raise ValueError("Frozen file already exists; never overwrite a prior selection")
    write_json(target, record, immutable=True)
    return {"frozenPath": str(target), "policyId": selected["policyId"], "searchUsage": selected["searchUsage"]}


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("mode", choices=["smoke", "calibration", "paired-dev", "candidate-dev", "freeze", "heldout"])
    parser.add_argument("--benchmark-file", type=Path, default=HERE / "benchmark-pilot.json")
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--task-root", type=Path, required=True)
    parser.add_argument("--execute", action="store_true", help="Run serial live trials; omitted means plan only")
    parser.add_argument("--candidate-policy", "--policy", dest="candidate_policy", type=Path)
    parser.add_argument("--proposal-record", type=Path, help="Proposal record whose usage is included in search cost at freeze")
    parser.add_argument("--frozen", type=Path)
    parser.add_argument("--account", default=os.environ.get("ALGAL_HARNESS_ACCOUNT"))
    parser.add_argument("--model", default="claude/sonnet/low", choices=["claude/sonnet/low"])
    parser.add_argument("--xcb-executable", default="/Users/benguo/.local/bin/xcb")
    parser.add_argument("--bun", default="/Users/benguo/.bun/bin/bun")
    parser.add_argument("--harbor", default=str(Path(sys.executable).with_name("harbor")))
    parser.add_argument("--docker", default="docker", help="Read-only image/version inspection CLI inside the admitted Docker wrapper")
    parser.add_argument("--max-model-attempts", type=int, default=4, choices=range(1, 17))
    parser.add_argument("--smoke-task", default="regex-log", help="One development task for smoke (cached regex-log by default)")
    args = parser.parse_args(argv)
    if not args.account:
        parser.error("--account or ALGAL_HARNESS_ACCOUNT is required")
    args.output_dir = args.output_dir.resolve()
    args.task_root = args.task_root.resolve()
    if args.frozen:
        args.frozen = args.frozen.resolve()
    benchmark = read_json(args.benchmark_file)
    if args.mode == "calibration" and args.max_model_attempts != 8:
        parser.error("Calibration uses exactly eight attempts per task")
    current = settings(args, benchmark)
    if args.mode == "freeze":
        if not args.execute:
            print(json.dumps({"action": "freeze", "execute": False, "requires": ["paired-dev.json", "candidate-dev.json"]}))
            return
        print(json.dumps(freeze(args, benchmark, current)))
        return
    baseline = protocol(args.bun, {"op": "policy", "policy": BASELINE})
    candidate = protocol(args.bun, {"op": "policy", "policy": read_json(args.candidate_policy) if args.candidate_policy else MANUAL_CANDIDATE})
    frozen = None
    if args.mode == "heldout":
        frozen = read_json(args.frozen or args.output_dir / "frozen.json")
        if frozen.get("schema") != "algal.coding-harness.frozen-pilot.v1" or frozen.get("settingsId") != digest(current):
            raise ValueError("Heldout requires a frozen selection with unchanged experiment settings")
        admitted = protocol(args.bun, {"op": "policy", "policy": frozen["selection"]["policy"]})
        if admitted["policyId"] != frozen["selection"]["policyId"]:
            raise ValueError("Frozen policy identity changed")
        split = {**benchmark["split"], "devTaskIds": sorted(benchmark["split"]["devTaskIds"]), "holdoutTaskIds": sorted(benchmark["split"]["holdoutTaskIds"])}
        if frozen["selection"].get("splitId") != digest(split):
            raise ValueError("Frozen benchmark split changed")
    rows = build_matrix(args.mode, benchmark, baseline, candidate, frozen, args.smoke_task)
    task_lookup = {task["id"]: task for task in benchmark["tasks"]}
    args.output_dir.mkdir(parents=True, exist_ok=True)
    for row in rows:
        task = validate_staged_task(args.task_root, task_lookup[row["taskId"]])
        config = job_config(args, row, task)
        # Parse the actual pinned Harbor schema without starting environments.
        from harbor.models.job.config import JobConfig
        JobConfig.model_validate(config)
        write_json(args.output_dir / "configs" / (row["jobName"] + ".json"), config, immutable=True)
    plan = {"schema": "algal.coding-harness.plan.v1", "mode": args.mode, "settingsId": digest(current),
            "settings": current, "candidateOrigin": "explicit-policy" if args.candidate_policy else "manual-policy", "episodes": rows,
            "maxTotalModelCalls": len(rows) * args.max_model_attempts,
            "paidInferenceCapUsd": 20, "incrementalPaidApiSpendUsd": 0,
            "frozenId": digest(frozen) if frozen else None}
    write_json(args.output_dir / "plans" / f"{args.mode}.json", plan, immutable=True)
    if not args.execute:
        print(json.dumps({"plan": str(args.output_dir / "plans" / f"{args.mode}.json"), "trials": len(rows), "maxModelCalls": plan["maxTotalModelCalls"], "executed": False}))
        return
    lock = args.output_dir / ".runner-lock"
    with lock.open("x") as stream:
        stream.write(str(os.getpid()))
    report = {"schema": "algal.coding-harness.report.v1", "mode": args.mode, "settingsId": digest(current), "settings": current,
              "planId": digest(plan), "complete": False, "episodes": [], "summaries": {},
              "billing": "existing-subscription", "incrementalPaidApiSpendUsd": 0, "paidInferenceCapUsd": 20}
    report_path = args.output_dir / "reports" / f"{args.mode}.json"
    try:
        # Admit every image before spending inference on any matrix row. This
        # never pulls, builds, starts, or modifies Docker resources.
        admitted_environments = {task_id: inspect_task_environment(args.docker, args.task_root, task_lookup[task_id])
                                 for task_id in dict.fromkeys(row["taskId"] for row in rows)}
        for row in rows:
            episode = run_episode(args, row, args.output_dir / "configs" / (row["jobName"] + ".json"), admitted_environments[row["taskId"]])
            report["episodes"].append(episode)
            write_json(report_path, report)
            print(json.dumps({"arm": row["arm"], "taskId": row["taskId"], "status": episode["outcome"]["status"], "reason": episode["statusReason"]}), flush=True)
            if episode["outcome"]["status"] == "invalid":
                break  # Diagnose environment/transport failures before more inference.
        for arm in {row["arm"] for row in report["episodes"]}:
            outcomes = [row["outcome"] for row in report["episodes"] if row["arm"] == arm]
            report["summaries"][arm] = protocol(args.bun, {"op": "summary", "outcomes": outcomes})
        report["complete"] = len(report["episodes"]) == len(rows)
        if frozen and report["complete"]:
            selected = [row["outcome"] for row in report["episodes"] if row["arm"] == "algal-selected"]
            report["selectedHoldout"] = protocol(args.bun, {"op": "holdout", "split": benchmark["split"], "frozen": frozen["selection"], "outcomes": selected})
        write_json(report_path, report)
    finally:
        lock.unlink()
    print(json.dumps({"report": str(report_path), "complete": report["complete"]}))


if __name__ == "__main__":
    main()
