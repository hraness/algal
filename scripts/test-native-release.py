#!/usr/bin/env python3
"""Focused release/install qualification; requires an already-built native binary."""
import argparse
import hashlib
import gzip
import importlib.util
import io
import json
import os
from pathlib import Path
import platform
import subprocess
import tempfile
import tarfile
from types import SimpleNamespace
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
    call([sys.executable, str(ROOT / "scripts/test-release-workflow.py")])
    binary = binary.resolve(strict=True)
    target = {"Darwin": "aarch64-apple-darwin", "Linux": "x86_64-unknown-linux-gnu"}[platform.system()]
    with tempfile.TemporaryDirectory(prefix="algal-release-test-") as temporary:
        directory = Path(temporary)
        archives = directory / "archives"
        diagnostic = json.loads(call([str(binary), "doctor"]).stdout)
        version = diagnostic["version"]
        build = diagnostic["build"]
        assert build["sourceCommit"] == commit
        assert build["rustc"] == rustc_version
        assert build["target"] == target
        overridden = json.loads(call([str(binary), "doctor"], env={**os.environ, "ALGAL_BUILD_COMMIT": "0" * 40, "ALGAL_BUILD_STATE": "clean"}).stdout)["build"]
        assert overridden["sourceCommit"] == build["sourceCommit"]
        assert overridden["sourceState"] == build["sourceState"]
        assert call([str(binary), "--version"]).stdout.strip() == f"algal {version}"
        spec = importlib.util.spec_from_file_location("native_package", ROOT / "scripts/package-native.py")
        packager = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(packager)
        inputs_digest = packager.source_inputs_sha256(ROOT)
        assert build["sourceInputsSha256"] == inputs_digest, "rebuild the binary after changing Rust inputs"
        admission = SimpleNamespace(commit=commit, target=target, rustc_version=rustc_version, allow_dirty=True)
        embedded = packager.validate_build(build, admission, version, inputs_digest)
        for key, value in [("sourceCommit", "0" * 40), ("sourceInputsSha256", "0" * 64),
                           ("sourceState", "unknown"), ("target", "wrong-target"), ("rustc", "wrong-compiler")]:
            try:
                packager.validate_build({**build, key: value}, admission, version, inputs_digest)
                raise AssertionError(f"mismatched embedded {key} accepted")
            except ValueError:
                pass
        if build["sourceState"] == "dirty":
            try:
                packager.validate_build(build, SimpleNamespace(**{**vars(admission), "allow_dirty": False}), version, inputs_digest)
                raise AssertionError("dirty binary accepted for a clean release")
            except ValueError:
                pass
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
        retained = prefix / "bin/.algal-releases" / f"{expected}.json"
        original_metadata = retained.read_bytes()
        metadata = json.loads(original_metadata)
        assert metadata["build"] == embedded
        assert metadata["binarySha256"] == expected
        installed_diagnostic = json.loads(call([str(installed), "doctor"]).stdout)["build"]
        assert installed_diagnostic["release"]["status"] == "matched"
        assert installed_diagnostic["release"]["metadata"]["tag"] == f"v{version}-test"
        assert installed_diagnostic["sourceCommit"] == commit
        call(install, success=False)
        call([*install, "--force"])
        assert retained.read_bytes() == original_metadata
        call(["python3", str(ROOT / "scripts/standalone-native-smoke.py"), str(installed)])
        corrupted = directory / archive.name
        corrupted.write_bytes(archive.read_bytes() + b"tampered")
        call(["sh", str(ROOT / "scripts/install-native.sh"), str(prefix), "--archive", str(corrupted), "--checksum", str(checksum), "--force"], success=False)
        assert hashlib.sha256(installed.read_bytes()).hexdigest() == expected
        assert retained.read_bytes() == original_metadata
        # Sidecars cannot claim signatures, accept foreign fields, or substitute
        # another source commit while retaining the binary's filename/hash.
        for mutation in [{"signed": True}, {"extra": "untrusted"}, {"commit": "0" * 40}]:
            retained.write_text(json.dumps({**metadata, **mutation}))
            rejected = json.loads(call([str(installed), "doctor"]).stdout)["build"]
            assert rejected["release"]["status"] == "rejected"
        retained.write_bytes(original_metadata)

        def changed_archive(label, changed):
            path = directory / f"{label}.tar.gz"
            with tarfile.open(archive) as source, tarfile.open(path, "w:gz") as destination:
                for member in source:
                    data = source.extractfile(member).read()
                    if member.name.endswith("/release.json"):
                        data = json.dumps({**json.loads(data), **changed}).encode()
                        member.size = len(data)
                    destination.addfile(member, io.BytesIO(data))
            proof = path.with_suffix(".gz.sha256")
            proof.write_text(hashlib.sha256(path.read_bytes()).hexdigest() + f"  {path.name}\n")
            return ["sh", str(ROOT / "scripts/install-native.sh"), str(prefix), "--archive", str(path), "--checksum", str(proof), "--force"]

        call(changed_archive("wrong-embedded-commit", {"commit": "0" * 40}), success=False)
        call(changed_archive("stripped-build-identity", {"build": None}), success=False)
        call(changed_archive("conflicting-release-tag", {"tag": f"v{version}-other"}), success=False)
        assert retained.read_bytes() == original_metadata
        assert hashlib.sha256(installed.read_bytes()).hexdigest() == expected
        # Existing metadata and executable survive directory/file symlink attacks.
        retained.unlink()
        elsewhere = directory / "metadata-elsewhere.json"
        elsewhere.write_bytes(original_metadata)
        retained.symlink_to(elsewhere)
        call([*install, "--force"], success=False)
        assert json.loads(call([str(installed), "doctor"]).stdout)["build"]["release"]["status"] == "rejected"
        retained.unlink()
        retained.write_bytes(original_metadata)
        records = retained.parent
        preserved_records = records.with_name("preserved-records")
        records.rename(preserved_records)
        records.symlink_to(preserved_records, target_is_directory=True)
        call([*install, "--force"], success=False)
        records.unlink()
        preserved_records.rename(records)
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
    print(json.dumps({"ok": True, "checks": ["release-source-admission", "embedded-source-input-binding", "unchanged-semver", "package-extracted-smoke", "verified-install", "retained-hash-bound-release-identity", "conflicting-release-identity-refusal", "metadata-symlink-refusal", "untrusted-sidecar-refusal", "overwrite-refusal", "explicit-force", "tampered-checksum-refusal", "existing-binary-preserved", "relative-CARGO_TARGET_DIR", "staging-cleanup", "oversized-PAX-refusal", "bounded-gzip-expansion"]}))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--binary", type=Path, required=True)
    parser.add_argument("--commit", required=True)
    parser.add_argument("--rustc-version", required=True)
    args = parser.parse_args()
    check(args.binary, args.commit, args.rustc_version)
