#!/usr/bin/env python3
"""Focused release/install qualification; requires an already-built native binary."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import platform
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parent.parent


def call(argv, success=True, **kwargs):
    result = subprocess.run(argv, capture_output=True, text=True, timeout=120, **kwargs)
    if (result.returncode == 0) != success:
        raise AssertionError(f"unexpected command result {result.returncode}: {argv}: {result.stdout[-2000:]} {result.stderr[-2000:]}")
    return result


def check(binary, commit, rustc_version):
    binary = binary.resolve(strict=True)
    target = {"Darwin": "aarch64-apple-darwin", "Linux": "x86_64-unknown-linux-gnu"}[platform.system()]
    with tempfile.TemporaryDirectory(prefix="algal-release-test-") as temporary:
        directory = Path(temporary)
        archives = directory / "archives"
        version = json.loads(call([str(binary), "doctor"]).stdout)["version"]
        call(["python3", str(ROOT / "scripts/package-native.py"), "--binary", str(binary), "--target", target,
              "--tag", f"v{version}-test", "--commit", commit, "--rustc-version", rustc_version, "--out", str(archives), "--allow-dirty"])
        archive = next(archives.glob("*.tar.gz"))
        checksum = archive.with_suffix(".gz.sha256")
        prefix = directory / "installed"
        install = ["sh", str(ROOT / "scripts/install-native.sh"), str(prefix), "--archive", str(archive), "--checksum", str(checksum)]
        call(install)
        installed = prefix / "bin/algal"
        expected = hashlib.sha256(binary.read_bytes()).hexdigest()
        assert hashlib.sha256(installed.read_bytes()).hexdigest() == expected
        call(install, success=False)
        call([*install, "--force"])
        call(["python3", str(ROOT / "scripts/standalone-native-smoke.py"), str(installed)])
        corrupted = directory / archive.name
        corrupted.write_bytes(archive.read_bytes() + b"tampered")
        call(["sh", str(ROOT / "scripts/install-native.sh"), str(prefix), "--archive", str(corrupted), "--checksum", str(checksum), "--force"], success=False)
        assert hashlib.sha256(installed.read_bytes()).hexdigest() == expected
        # A fake build command copies the qualified binary, verifying that source
        # install honors a relative CARGO_TARGET_DIR without another compilation.
        fakebin = directory / "fakebin"
        fakebin.mkdir()
        cargo = fakebin / "cargo"
        cargo.write_text("#!/usr/bin/env python3\nimport os,sys,shutil\nfrom pathlib import Path\np=Path(sys.argv[sys.argv.index('--target-dir')+1])/'release'\np.mkdir(parents=True,exist_ok=True)\nshutil.copyfile(os.environ['ALGAL_TEST_BINARY'],p/'algal')\n")
        cargo.chmod(0o755)
        environment = {**os.environ, "PATH": str(fakebin) + os.pathsep + os.environ.get("PATH", ""), "CARGO_TARGET_DIR": "custom-target", "ALGAL_TEST_BINARY": str(binary)}
        call(["sh", str(ROOT / "scripts/install-native.sh"), str(directory / "source-installed")], cwd=directory, env=environment)
        assert (directory / "custom-target/release/algal").is_file()
        assert (directory / "source-installed/bin/algal").is_file()
        assert not list((prefix / "bin").glob(".algal-install.*"))
    print(json.dumps({"ok": True, "checks": ["package-extracted-smoke", "verified-install", "overwrite-refusal", "explicit-force", "tampered-checksum-refusal", "existing-binary-preserved", "relative-CARGO_TARGET_DIR", "staging-cleanup"]}))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--binary", type=Path, required=True)
    parser.add_argument("--commit", required=True)
    parser.add_argument("--rustc-version", required=True)
    args = parser.parse_args()
    check(args.binary, args.commit, args.rustc_version)
