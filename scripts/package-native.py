#!/usr/bin/env python3
"""Build a bounded native release archive and verify the extracted binary."""
import argparse
import gzip
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import re
import subprocess
import tarfile
import tempfile
import sys

sys.dont_write_bytecode = True

ROOT = Path(__file__).resolve().parent.parent
TARGETS = {"x86_64-unknown-linux-gnu": ("linux", "x86_64", "Ubuntu 24.04 / glibc 2.39 or newer"),
           "aarch64-apple-darwin": ("darwin", "arm64", "macOS 14 or newer; unsigned/not notarized")}


def package(args):
    import platform
    if not re.fullmatch(r"v[0-9]+\.[0-9]+\.[0-9]+(?:-[a-zA-Z0-9.-]+)?", args.tag):
        raise ValueError("release tag must be a version tag")
    if not re.fullmatch(r"[0-9a-f]{40}", args.commit):
        raise ValueError("commit must be a complete lowercase Git SHA")
    commit = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip()
    if commit != args.commit:
        raise ValueError("commit does not match the checked-out source")
    dirty = bool(subprocess.check_output(["git", "status", "--porcelain", "--untracked-files=normal"], cwd=ROOT, text=True))
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
    smoke = module.smoke(binary)
    version = smoke["nativeVersion"]
    if args.tag[1:].split("-", 1)[0] != version:
        raise ValueError("release tag base does not match the binary version")
    prefix = f"algal-{args.tag}-{args.target}"
    with binary.open("rb") as source:
        binary_data = source.read(100_000_001)
    if len(binary_data) > 100_000_000:
        raise ValueError("native binary byte limit")
    metadata = {"contract": "algal.native-release.v1", "tag": args.tag, "version": version,
                "commit": args.commit, "sourceState": "dirty-test-fixture" if dirty else "clean",
                "target": args.target, "rustc": args.rustc_version,
                "minimumPlatform": support, "binarySha256": hashlib.sha256(binary_data).hexdigest(),
                "signed": False, "smoke": smoke}
    files = {"bin/algal": (binary_data, 0o755), "LICENSE": ((ROOT / "LICENSE").read_bytes(), 0o644),
             "release.json": ((json.dumps(metadata, sort_keys=True, separators=(",", ":")) + "\n").encode(), 0o644),
             "smoke.py": ((ROOT / "scripts/standalone-native-smoke.py").read_bytes(), 0o755)}
    args.out.mkdir(parents=True, exist_ok=True)
    archive = args.out / f"{prefix}.tar.gz"
    if archive.exists():
        raise ValueError("refusing to overwrite an existing release archive")
    with tempfile.TemporaryDirectory(prefix="algal-package-") as temporary:
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
