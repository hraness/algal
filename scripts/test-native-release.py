#!/usr/bin/env python3
"""Focused release/install qualification; requires an already-built native binary."""
import argparse
import hashlib
import gzip
import importlib.util
import json
import os
from pathlib import Path
import platform
import subprocess
import tempfile
import tarfile
from unittest.mock import patch
import sys

sys.dont_write_bytecode = True

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
        # A valid checksum does not make adversarial archive headers safe. A
        # PAX extension is interpreted internally before yielded member checks.
        spec = importlib.util.spec_from_file_location("native_unpack", ROOT / "scripts/unpack-native.py")
        unpacker = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(unpacker)
        extension = tarfile.TarInfo("extended")
        extension.type = tarfile.XHDTYPE
        extension.size = 100_000_001
        malicious = directory / "pax.tar.gz"
        malicious.write_bytes(gzip.compress(extension.tobuf()))
        malicious_checksum = directory / "pax.tar.gz.sha256"
        malicious_checksum.write_text(hashlib.sha256(malicious.read_bytes()).hexdigest() + "  pax.tar.gz\n")
        call(["sh", str(ROOT / "scripts/install-native.sh"), str(prefix), "--archive", str(malicious), "--checksum", str(malicious_checksum), "--force"], success=False)
        assert hashlib.sha256(installed.read_bytes()).hexdigest() == expected
        # Exercise the actual streaming bound cheaply instead of allocating a
        # hundred-megabyte bomb in every qualification run.
        with patch.object(unpacker, "MAX_TAR_BYTES", 1024):
            try:
                unpacker.bounded_tar(gzip.compress(b"x" * 1025))
                raise AssertionError("expanded archive bound was not enforced")
            except ValueError as error:
                assert "expanded archive byte limit" in str(error)
        # Every gzip read remains bounded even for a huge declared PAX body.
        original_read = gzip.GzipFile.read
        def guarded_read(self, size=-1):
            assert 0 <= size <= 65_536
            return original_read(self, size)
        with patch.object(gzip.GzipFile, "read", guarded_read):
            try:
                unpacker.unpack(malicious, malicious_checksum, directory / "must-not-exist")
                raise AssertionError("malformed PAX archive accepted")
            except (ValueError, tarfile.ReadError):
                pass
        assert not (directory / "must-not-exist").exists()
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
    print(json.dumps({"ok": True, "checks": ["package-extracted-smoke", "verified-install", "overwrite-refusal", "explicit-force", "tampered-checksum-refusal", "existing-binary-preserved", "relative-CARGO_TARGET_DIR", "staging-cleanup", "oversized-PAX-refusal", "bounded-gzip-expansion"]}))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--binary", type=Path, required=True)
    parser.add_argument("--commit", required=True)
    parser.add_argument("--rustc-version", required=True)
    args = parser.parse_args()
    check(args.binary, args.commit, args.rustc_version)
