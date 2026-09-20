#!/usr/bin/env python3
"""Build a bounded native release archive and verify the extracted binary."""
import argparse
import gzip
import hashlib
import importlib.util
import io
import json
import os
from pathlib import Path
import re
import selectors
import subprocess
import tarfile
import tempfile
import sys
import time

sys.dont_write_bytecode = True

ROOT = Path(__file__).resolve().parent.parent
TARGETS = {"x86_64-unknown-linux-gnu": ("linux", "x86_64", "Ubuntu 24.04 / glibc 2.39 or newer"),
           "aarch64-apple-darwin": ("darwin", "arm64", "macOS 14 or newer; unsigned/not notarized")}
BUILD_FIELDS = {"contract", "version", "sourceCommit", "sourceState", "sourceInputsSha256",
                "target", "rustc", "exactTagsAtBuild"}


def bounded_output(argv, limit, timeout=20):
    deadline = time.monotonic() + timeout
    environment = os.environ.copy()
    if argv[0] == "git":
        for name in ["GIT_DIR", "GIT_WORK_TREE", "GIT_INDEX_FILE", "GIT_COMMON_DIR"]:
            environment.pop(name, None)
    child = subprocess.Popen(argv, cwd=ROOT, stdin=subprocess.DEVNULL,
                             stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, env=environment)
    output = bytearray()
    try:
        with selectors.DefaultSelector() as selector:
            selector.register(child.stdout, selectors.EVENT_READ)
            while True:
                remaining = deadline - time.monotonic()
                if remaining <= 0 or not selector.select(remaining):
                    raise ValueError("package command deadline exceeded")
                block = os.read(child.stdout.fileno(), min(65_536, limit + 1 - len(output)))
                if not block:
                    break
                output.extend(block)
                if len(output) > limit:
                    raise ValueError("package command output byte limit")
        if child.wait(timeout=max(0.001, deadline - time.monotonic())) != 0:
            raise ValueError("package command failed")
        return bytes(output)
    finally:
        if child.poll() is None:
            child.kill()
            child.wait()
        child.stdout.close()


def source_inputs_sha256(root):
    """Match build.rs's bounded, length-delimited Rust source inventory."""
    files = []
    def visit(path):
        if path.is_symlink():
            raise ValueError("native build inputs must not contain symlinks")
        if path.is_dir():
            for entry in sorted(path.iterdir()):
                visit(entry)
        elif path.is_file():
            if len(files) >= 4096 or "\n" in path.relative_to(root).as_posix():
                raise ValueError("native build input inventory limit")
            files.append(path)
        else:
            raise ValueError("native build input must be a regular file")
    for name in ["Cargo.toml", "Cargo.lock", "crates", ".cargo"]:
        path = root / name
        if path.exists() or path.is_symlink():
            visit(path)
        elif name != ".cargo":
            raise ValueError("native build input missing")
    digest = hashlib.sha256(b"algal.native-source-inputs.v1\0")
    total = 0
    for path in sorted(files):
        name = path.relative_to(root).as_posix().encode()
        with path.open("rb") as source:
            data = source.read(67_108_865 - total)
        total += len(data)
        if total > 67_108_864:
            raise ValueError("native build input byte limit")
        digest.update(len(name).to_bytes(8, "big"))
        digest.update(name)
        digest.update(len(data).to_bytes(8, "big"))
        digest.update(data)
    return digest.hexdigest()


def validate_build(build, args, version, source_digest):
    if not isinstance(build, dict) or not BUILD_FIELDS.issubset(build):
        raise ValueError("binary has no embedded build identity; rebuild it before packaging")
    build = {key: build[key] for key in BUILD_FIELDS}
    if (build["contract"] != "algal.native-build.v1" or build["version"] != version
            or build["sourceCommit"] != args.commit or build["target"] != args.target
            or build["rustc"] != args.rustc_version or build["sourceInputsSha256"] != source_digest):
        raise ValueError("binary build identity does not match the admitted source, target, or compiler")
    if build["sourceState"] not in {"clean", "dirty"}:
        raise ValueError("binary source state is unknown")
    if build["sourceState"] != "clean" and not args.allow_dirty:
        raise ValueError("release packaging requires a binary built from clean source")
    return build


def package(args):
    import platform
    if not re.fullmatch(r"v[0-9]+\.[0-9]+\.[0-9]+(?:-[a-zA-Z0-9.-]+)?", args.tag):
        raise ValueError("release tag must be a version tag")
    if not re.fullmatch(r"[0-9a-f]{40}", args.commit):
        raise ValueError("commit must be a complete lowercase Git SHA")
    commit = bounded_output(["git", "rev-parse", "HEAD"], 128).decode().strip()
    if commit != args.commit:
        raise ValueError("commit does not match the checked-out source")
    dirty = bool(bounded_output(["git", "--no-optional-locks", "status", "--porcelain", "--untracked-files=normal"], 1_048_576))
    if dirty and not args.allow_dirty:
        raise ValueError("release packaging requires a clean source checkout")
    expected_os, expected_arch, support = TARGETS[args.target]
    if sys.platform != expected_os or platform.machine().lower() != expected_arch:
        raise ValueError("package target does not match the host running its native qualification")
    binary = args.binary.resolve(strict=True)
    if not binary.is_file() or binary.stat().st_size > 100_000_000:
        raise ValueError("native binary file/size rejected")
    spec = importlib.util.spec_from_file_location("native_smoke", ROOT / "scripts/standalone-native-smoke.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    prefix = f"algal-{args.tag}-{args.target}"
    with binary.open("rb") as source:
        binary_data = source.read(100_000_001)
    if len(binary_data) > 100_000_000:
        raise ValueError("native binary byte limit")
    source_digest = source_inputs_sha256(ROOT)
    args.out.mkdir(parents=True, exist_ok=True)
    archive = args.out / f"{prefix}.tar.gz"
    if archive.exists():
        raise ValueError("refusing to overwrite an existing release archive")
    with tempfile.TemporaryDirectory(prefix="algal-package-") as temporary:
        # Qualify a frozen copy of the exact bytes that enter the archive. A
        # concurrent Cargo build cannot substitute a different executable.
        frozen = Path(temporary) / "algal"
        frozen.write_bytes(binary_data)
        frozen.chmod(0o755)
        report = json.loads(bounded_output([str(frozen), "doctor"], 16_384))
        version = report["version"]
        build = validate_build(report.get("build"), args, version, source_digest)
        if args.tag[1:].split("-", 1)[0] != version:
            raise ValueError("release tag base does not match the binary version")
        smoke = module.smoke(frozen)
        if smoke["nativeVersion"] != version:
            raise ValueError("binary diagnostic and smoke versions disagree")
        metadata = {"contract": "algal.native-release.v1", "tag": args.tag, "version": version,
                    "commit": args.commit, "sourceState": "dirty-test-fixture" if dirty or build["sourceState"] != "clean" else "clean",
                    "target": args.target, "rustc": args.rustc_version, "build": build,
                    "minimumPlatform": support, "binarySha256": hashlib.sha256(binary_data).hexdigest(),
                    "signed": False, "smoke": smoke}
        metadata_bytes = (json.dumps(metadata, sort_keys=True, separators=(",", ":")) + "\n").encode()
        if len(metadata_bytes) > 16_384:
            raise ValueError("release metadata byte limit")
        files = {"bin/algal": (binary_data, 0o755), "LICENSE": ((ROOT / "LICENSE").read_bytes(), 0o644),
                 "release.json": (metadata_bytes, 0o644),
                 "smoke.py": ((ROOT / "scripts/standalone-native-smoke.py").read_bytes(), 0o755)}
        pending = Path(temporary) / archive.name
        with pending.open("wb") as raw, gzip.GzipFile(filename="", mode="wb", fileobj=raw, mtime=0) as compressed, tarfile.open(fileobj=compressed, mode="w") as tar:
            for name, (data, mode) in sorted(files.items()):
                info = tarfile.TarInfo(f"{prefix}/{name}")
                info.size = len(data)
                info.mode = mode
                info.mtime = 0
                tar.addfile(info, io.BytesIO(data))
        extracted = Path(temporary) / "extract"
        with tarfile.open(pending) as tar:
            tar.extractall(extracted, filter="data")
        module.smoke(extracted / prefix / "bin/algal")
        if source_inputs_sha256(ROOT) != source_digest:
            raise ValueError("native source inputs changed during package qualification")
        # Publish without clobbering a concurrently-created artifact.
        with archive.open("xb") as destination:
            destination.write(pending.read_bytes())
    checksum = hashlib.sha256(archive.read_bytes()).hexdigest()
    checksum_file = archive.with_suffix(archive.suffix + ".sha256")
    with checksum_file.open("x") as destination:
        destination.write(f"{checksum}  {archive.name}\n")
    metadata_file = args.out / f"{prefix}.release.json"
    with metadata_file.open("x") as destination:
        json.dump({**metadata, "archive": archive.name, "archiveSha256": checksum}, destination, sort_keys=True, indent=2)
        destination.write("\n")
    print(json.dumps({"archive": str(archive), "checksum": checksum, "metadata": str(metadata_file), "smoke": smoke}, sort_keys=True))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--binary", type=Path, required=True)
    parser.add_argument("--target", choices=TARGETS, required=True)
    parser.add_argument("--tag", required=True)
    parser.add_argument("--commit", required=True)
    parser.add_argument("--rustc-version", required=True)
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--allow-dirty", action="store_true", help="For temporary qualification fixtures only; records dirty source state")
    package(parser.parse_args())
