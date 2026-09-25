#!/usr/bin/env python3
"""Run bounded tool compatibility controls; this does not verify ALGAL code."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import signal
import shutil
import subprocess
import sys
from datetime import datetime, timezone


def sha256(path: Path) -> str:
    with path.open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--java", type=Path, required=True)
    parser.add_argument("--tlc-jar", type=Path, required=True)
    parser.add_argument("--lean-bin", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    java = args.java.resolve(strict=True)
    jar = args.tlc_jar.resolve(strict=True)
    lean_bin = args.lean_bin.resolve(strict=True)
    lean = (lean_bin / "lean").resolve(strict=True)
    lake = (lean_bin / "lake").resolve(strict=True)
    source = Path(__file__).resolve().parent
    output = args.output.resolve()
    # Never erase or overwrite a prior evidence run.
    output.mkdir(parents=True, exist_ok=False)
    env = dict(os.environ)
    env["PATH"] = str(lean_bin) + os.pathsep + env.get("PATH", "")
    # Ambient Lean library overrides would invalidate the intended local build.
    for name in (
        "LEAN_PATH", "LEAN_SRC_PATH", "LEAN_SYSROOT", "LAKE_PACKAGES_DIR",
        "JAVA_TOOL_OPTIONS", "_JAVA_OPTIONS", "JDK_JAVA_OPTIONS",
    ):
        env.pop(name, None)

    records: list[dict] = []

    def run(name: str, argv: list[str], cwd: Path, check, expected: str) -> tuple[bool, str]:
        try:
            process = subprocess.Popen(
                argv, cwd=cwd, env=env, text=True,
                stdout=subprocess.PIPE, stderr=subprocess.PIPE, start_new_session=True,
            )
            try:
                stdout, stderr = process.communicate(timeout=45)
            except subprocess.TimeoutExpired:
                # This exact process group was created above for this case.
                try:
                    os.killpg(process.pid, signal.SIGKILL)
                except ProcessLookupError:
                    pass
                stdout, stderr = process.communicate()
                raise subprocess.TimeoutExpired(argv, 45, stdout, stderr)
            raw = stdout + stderr
            code = process.returncode
            passed = check(code, raw)
            outcome = "expected-result" if passed else "unexpected-result"
        except subprocess.TimeoutExpired as failure:
            raw = "TIMEOUT: " + str(failure) + "\n" + (failure.stdout or "") + (failure.stderr or "")
            code = None
            passed = False
            outcome = "timeout"
        log = output / f"{name}.log"
        log.write_text(raw)
        records.append({
            "name": name, "argv": argv, "cwd": str(cwd), "expected": expected,
            "exit_code": code, "outcome": outcome, "passed": passed,
            "log": log.name, "log_sha256": sha256(log),
        })
        print(f"{name}: {outcome} (exit {code})", flush=True)
        return passed, raw

    run("java-version", [str(java), "-version"], output,
        lambda code, raw: code == 0 and '21.0.12.1' in raw,
        "Temurin JDK 21.0.12.1 reports its version")
    run("lean-version", [str(lean), "--version"], output,
        lambda code, raw: code == 0 and "version 4.34.0" in raw,
        "Lean 4.34.0 reports its version")
    run("lake-version", [str(lake), "--version"], output,
        lambda code, raw: code == 0 and "Lean version 4.34.0" in raw,
        "Bundled Lake reports Lean 4.34.0")

    def tlc_check(kind: str):
        if kind == "good":
            return lambda code, raw: (
                code == 0
                and "TLC2 Version 2.19" in raw
                and "Model checking completed. No error has been found." in raw
                and "3 distinct states found" in raw
                and "0 states left on queue" in raw
                and "Finished checking temporal properties" in raw
                and all(re.search(rf"<{name} line [^\n]+>: 1:1", raw)
                        for name in ("Init", "Prepare", "Publish"))
            )
        invariant = {
            "bad-safety": "PreparedBeforeCommit",
            "witness-prepare": "NeverPrepared",
            "witness-publish": "NeverCommitted",
        }.get(kind)
        if invariant:
            return lambda code, raw: (
                code == 12
                and f"Invariant {invariant} is violated" in raw
                and "State 2:" in raw
                and "The behavior up to this point is" in raw
            )
        return lambda code, raw: (
            code == 13
            and "Temporal properties were violated" in raw
            and "Stuttering" in raw
            and "committed = FALSE" in raw
        )

    for kind in ("good", "bad-safety", "bad-liveness", "witness-prepare", "witness-publish"):
        case = output / f"tlc-{kind}"
        shutil.copytree(source / "tla", case)
        task_jvm_home = case / "jvm-home"
        (task_jvm_home / ".tlaplus").mkdir(parents=True)
        # The pinned TLC reads this file; no host telemetry preference is used.
        (task_jvm_home / ".tlaplus" / "esc.txt").write_text("NO_STATISTICS\n")
        (case / "tmp").mkdir()
        argv = [
            str(java), "-XX:+UseParallelGC", "-Xmx256m",
            f"-Duser.home={task_jvm_home}", f"-Djava.io.tmpdir={case / 'tmp'}",
            "-cp", str(jar), "tlc2.TLC",
            "-workers", "1", "-coverage", "1", "-seed", "1", "-fp", "0",
            "-metadir", str(case / "states"), "-config", f"{kind}.cfg", "PublicationSmoke",
        ]
        run(f"tlc-{kind}", argv, case, tlc_check(kind), {
            "good": "complete finite safety+liveness check, three states, empty queue",
            "bad-safety": "PreparedBeforeCommit invariant violation with a counterexample",
            "bad-liveness": "temporal violation with an uncommitted stuttering behavior",
            "witness-prepare": "NeverPrepared violation witnesses the Prepare action",
            "witness-publish": "NeverCommitted violation witnesses the Publish action",
        }[kind])

    project = output / "lean-project"
    shutil.copytree(source / "lean", project)
    built, _ = run("lean-build", [str(lake), "build"], project,
        lambda code, raw: code == 0 and "Build completed successfully" in raw,
        "Lake builds the toy library without external package dependencies")
    if built:
        theorem_names = (
            "ToolchainSmoke.admittedSuccessorBound",
            "ToolchainSmoke.fullCapacityRejects",
            "ToolchainSmoke.initialWitness",
        )
        def clean_axioms(code: int, raw: str) -> bool:
            return code == 0 and all(
                f"'{name}' does not depend on any axioms" in raw for name in theorem_names
            )
        run("lean-axioms", [str(lake), "env", "lean", "Smoke.lean"], project,
            clean_axioms, "all three named toy theorems report no transitive axioms")
        run("lean-wrong-proof", [str(lake), "env", "lean", "WrongProof.lean"], project,
            lambda code, raw: code > 0 and "is false" in raw and "1 < 1" in raw,
            "Lean rejects a false theorem through semantic proof checking")
        run("lean-hidden-axiom", [str(lake), "env", "lean", "HiddenAxiom.lean"], project,
            lambda code, raw: code == 0 and re.search(
                r"'ToolchainSmoke\.indirectFalse' depends on axioms:.*ToolchainSmoke\.uncheckedFalse",
                raw, re.S) is not None,
            "Lean accepts the declared axiom; transitive audit exposes forbidden uncheckedFalse")
        run("lean-hidden-sorry", [str(lake), "env", "lean", "HiddenSorry.lean"], project,
            lambda code, raw: code == 0 and re.search(
                r"'ToolchainSmoke\.indirectUnfinished' depends on axioms:.*sorryAx",
                raw, re.S) is not None,
            "Lean accepts a placeholder; transitive audit exposes forbidden sorryAx")

    success = len(records) == 13 and all(record["passed"] for record in records)
    receipt = {
        "schema": "algal.verification-toolchain-smoke.v1",
        "scope": "tool compatibility and negative controls only; no ALGAL production proof",
        "observed_at": datetime.now(timezone.utc).isoformat(),
        "passed": success,
        "source_sha256": {str(p.relative_to(source)): sha256(p)
                          for p in sorted([source / "run.py", *(source / "tla").glob("*"),
                                           *(source / "lean").glob("*")]) if p.is_file()},
        "tool_binary_sha256": {str(p): sha256(p) for p in (java, jar, lean, lake)},
        "results": records,
    }
    (output / "receipt.json").write_text(json.dumps(receipt, indent=2) + "\n")
    print(f"receipt: {output / 'receipt.json'}", flush=True)
    return 0 if success else 1


if __name__ == "__main__":
    sys.exit(main())
