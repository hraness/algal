#!/usr/bin/env python3
"""Bind immutable release artifacts to their producing jobs, including retries."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import resource
import stat
import subprocess
import tempfile
import zipfile

MAX_BYTES = 128 * 1024 * 1024
TARGETS = {
    "LINUX_X64": "x86_64-unknown-linux-gnu",
    "LINUX_ARM64": "aarch64-unknown-linux-gnu",
    "MACOS": "aarch64-apple-darwin",
}


def require(condition, message):
    if not condition:
        raise ValueError(message)


def verify_metadata(value, producer, artifact_id, digest):
    require(re.fullmatch(r"[1-9][0-9]{0,19}", artifact_id)
            and re.fullmatch(r"[0-9a-f]{64}", digest), "missing exact producer identity")
    run_id, attempt, sha = (os.environ.get(key, "") for key in
                            ("GITHUB_RUN_ID", "GITHUB_RUN_ATTEMPT", "GITHUB_SHA"))
    require(re.fullmatch(r"[1-9][0-9]{0,19}", run_id)
            and re.fullmatch(r"[1-9][0-9]{0,9}", attempt)
            and re.fullmatch(r"[0-9a-f]{40}", sha), "invalid workflow identity")
    require(isinstance(value, dict), "invalid artifact metadata")
    require(type(value.get("id")) is int and str(value["id"]) == artifact_id
            and value.get("digest") == "sha256:" + digest, "artifact differs from producer identity")
    name = value.get("name")
    match = re.fullmatch(re.escape(producer) + r"-([1-9][0-9]{0,9})", name) if isinstance(name, str) else None
    # A failed consumer can reuse its successful producer from an earlier
    # attempt. Its exact ID/digest remain authoritative, never a name search.
    require(match is not None and int(match[1]) <= int(attempt), "artifact producer attempt mismatch")
    require(value.get("expired") is False and type(value.get("size_in_bytes")) is int
            and 0 < value["size_in_bytes"] <= MAX_BYTES, "artifact expired or oversized")
    run = value.get("workflow_run")
    require(isinstance(run, dict) and type(run.get("id")) is int
            and str(run["id"]) == run_id and run.get("head_sha") == sha, "artifact run/source mismatch")


def metadata_file(path):
    with Path(path).open("rb") as source:
        data = source.read(65_537)
    require(len(data) <= 65_536, "artifact metadata exceeds byte limit")
    return json.loads(data)


def download(endpoint, path, maximum):
    # Stop a malformed response before it can fill the runner's disk.
    def limit_output():
        resource.setrlimit(resource.RLIMIT_FSIZE, (maximum, maximum))

    with Path(path).open("xb") as output:
        result = subprocess.run(["gh", "api", "--hostname", "github.com", endpoint],
                                stdout=output, stderr=subprocess.DEVNULL, timeout=180,
                                preexec_fn=limit_output, check=False)
    require(result.returncode == 0 and Path(path).stat().st_size <= maximum, "artifact download failed or oversized")


def unpack_native(path, digest, tag, target, destination):
    require(Path(path).stat().st_size <= MAX_BYTES, "artifact ZIP exceeds byte limit")
    require(hashlib.sha256(Path(path).read_bytes()).hexdigest() == digest, "artifact ZIP digest mismatch")
    prefix = f"algal-{tag}-{target}"
    names = {prefix + ".tar.gz": MAX_BYTES, prefix + ".tar.gz.sha256": 512,
             prefix + ".release.json": 65_536}
    with zipfile.ZipFile(path) as source:
        entries = source.infolist()
        require(len(entries) == len(names) and {entry.filename for entry in entries} == set(names),
                "artifact ZIP inventory mismatch")
        for entry in entries:
            require(stat.S_IFMT(entry.external_attr >> 16) in (0, stat.S_IFREG)
                    and not entry.flag_bits & 1 and 0 < entry.file_size <= names[entry.filename],
                    "unsafe artifact ZIP entry")
        for entry in entries:
            with source.open(entry) as stream:
                data = stream.read(names[entry.filename] + 1)
            require(len(data) == entry.file_size, "artifact ZIP entry byte limit")
            with (destination / entry.filename).open("xb") as output:
                output.write(data)


def fetch_native(destination):
    require(os.environ.get("GITHUB_REPOSITORY") == "hraness/algal", "unexpected repository")
    tag = os.environ.get("RELEASE_TAG", "")
    require(len(tag) <= 256 and re.fullmatch(r"v[0-9]+\.[0-9]+\.[0-9]+(?:-[a-zA-Z0-9.-]+)?", tag),
            "invalid release tag")
    destination.mkdir()
    with tempfile.TemporaryDirectory(dir=os.environ["RUNNER_TEMP"], prefix="algal-native-") as temporary:
        root = Path(temporary)
        for key, target in TARGETS.items():
            artifact_id, digest = (os.environ.get(key + suffix, "") for suffix in
                                   ("_ARTIFACT_ID", "_ARTIFACT_DIGEST"))
            require(re.fullmatch(r"[1-9][0-9]{0,19}", artifact_id)
                    and re.fullmatch(r"[0-9a-f]{64}", digest), "missing native producer identity")
            endpoint = f"repos/hraness/algal/actions/artifacts/{artifact_id}"
            metadata, archive = root / (key + ".json"), root / (key + ".zip")
            download(endpoint, metadata, 65_536)
            verify_metadata(metadata_file(metadata), "native-" + target, artifact_id, digest)
            download(endpoint + "/zip", archive, MAX_BYTES)
            unpack_native(archive, digest, tag, target, destination)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    verify = commands.add_parser("verify-metadata")
    for name in ("path", "producer", "artifact_id", "digest"):
        verify.add_argument(name)
    fetch = commands.add_parser("fetch-native")
    fetch.add_argument("destination", type=Path)
    args = parser.parse_args()
    if args.command == "verify-metadata":
        verify_metadata(metadata_file(args.path), args.producer, args.artifact_id, args.digest)
    else:
        fetch_native(args.destination)


if __name__ == "__main__":
    main()
