#!/usr/bin/env python3
"""Verify a local release archive and extract only its admitted executable."""
import argparse
import hashlib
import gzip
import io
import json
import os
from pathlib import Path
import platform
import re
import tarfile
import stat


MAX_TAR_BYTES = 101_000_000
MAX_METADATA_BYTES = 16_384


def regular_bytes(path, limit):
    flags = os.O_RDONLY | os.O_NONBLOCK | getattr(os, "O_NOFOLLOW", 0)
    descriptor = os.open(path, flags)
    with os.fdopen(descriptor, "rb") as source:
        metadata = os.fstat(source.fileno())
        if not stat.S_ISREG(metadata.st_mode) or metadata.st_size > limit:
            raise ValueError("bounded regular file required")
        data = source.read(limit + 1)
    if len(data) > limit:
        raise ValueError("file byte limit")
    return data


def real_directory(path):
    if not stat.S_ISDIR(path.lstat().st_mode):
        raise ValueError("real directory required")


def publish_metadata(binary, directory):
    """Publish an immutable hash-keyed record before changing the executable."""
    real_directory(binary.parent)
    records = binary.parent / ".algal-releases"
    if not records.exists() and not records.is_symlink():
        return  # Legacy archives and source installs have no package record.
    real_directory(records)
    digest = hashlib.sha256(regular_bytes(binary, 100_000_000)).hexdigest()
    source = records / f"{digest}.json"
    data = regular_bytes(source, MAX_METADATA_BYTES)
    metadata = json.loads(data)
    if metadata.get("binarySha256") != digest:
        raise ValueError("installation metadata binary mismatch")
    doctor = json.loads(regular_bytes(binary.parent / "doctor.json", MAX_METADATA_BYTES))
    build = metadata.get("build")
    actual = doctor.get("build", {})
    if build is not None or actual.get("contract") == "algal.native-build.v1":
        attribution = {key: metadata[key] for key in ["tag", "commit", "version", "target", "sourceState", "binarySha256", "signed"]}
        if (not isinstance(build, dict)
                or actual.get("release", {}).get("status") != "matched"
                or actual["release"].get("metadata") != attribution
                or {key: actual.get(key) for key in build} != build):
            raise ValueError("installation metadata does not match executable build identity")
    real_directory(directory.parent)
    try:
        directory.mkdir(mode=0o755)
    except FileExistsError:
        pass
    real_directory(directory)
    destination = directory / source.name
    if destination.exists() or destination.is_symlink():
        if regular_bytes(destination, MAX_METADATA_BYTES) != data:
            raise ValueError("conflicting release metadata for the same executable digest")
        return
    # Link complete bytes into place, without replacing an existing record.
    # The staging directory and destination share the installation filesystem.
    try:
        os.link(source, destination, follow_symlinks=False)
    except FileExistsError:
        if regular_bytes(destination, MAX_METADATA_BYTES) != data:
            raise ValueError("conflicting release metadata for the same executable digest")

def bounded_tar(archive_data):
    # Bound expansion before tarfile interprets PAX/GNU extension lengths.
    # Member iteration alone is too late: tarfile consumes those internally.
    data = io.BytesIO()
    with gzip.GzipFile(fileobj=io.BytesIO(archive_data), mode="rb") as compressed:
        while True:
            block = compressed.read(min(65_536, MAX_TAR_BYTES + 1 - data.tell()))
            if not block:
                break
            data.write(block)
            if data.tell() > MAX_TAR_BYTES:
                raise ValueError("release expanded archive byte limit")
    data.seek(0)
    return data

def unpack(archive, checksum, out, retain_metadata=False):
    with archive.open("rb") as source:
        archive_data = source.read(100_000_001)
    with checksum.open("rb") as source:
        checksum_data = source.read(4097)
    if len(archive_data) > 100_000_000 or len(checksum_data) > 4096:
        raise ValueError("release input byte limit")
    expected = checksum_data.decode("utf-8").strip().split()
    if len(expected) != 2 or not re.fullmatch(r"[a-f0-9]{64}", expected[0]) or expected[1] != archive.name:
        raise ValueError("checksum file must identify exactly this archive")
    if hashlib.sha256(archive_data).hexdigest() != expected[0]:
        raise ValueError("release checksum mismatch")
    target = {("Linux", "x86_64"): "x86_64-unknown-linux-gnu", ("Darwin", "arm64"): "aarch64-apple-darwin"}.get((platform.system(), platform.machine()))
    if target is None:
        raise ValueError("unsupported native platform")
    with bounded_tar(archive_data) as expanded, tarfile.open(fileobj=expanded, mode="r:") as tar:
        members = []
        for member in tar:
            if len(members) >= 4 or not member.isfile() or not 0 <= member.size <= 100_000_000:
                raise ValueError("unexpected release archive entry")
            members.append(member)
        if len(members) != 4:
            raise ValueError("release archive must contain four files")
        prefix = members[0].name.split("/", 1)[0]
        names = {member.name for member in members}
        if names != {f"{prefix}/{name}" for name in ["LICENSE", "release.json", "smoke.py", "bin/algal"]}:
            raise ValueError("unexpected release archive paths")
        metadata_member = tar.getmember(f"{prefix}/release.json")
        if metadata_member.size > MAX_METADATA_BYTES:
            raise ValueError("release metadata byte limit")
        metadata_data = tar.extractfile(metadata_member).read(MAX_METADATA_BYTES + 1)
        metadata = json.loads(metadata_data)
        if metadata.get("contract") != "algal.native-release.v1" or metadata.get("target") != target:
            raise ValueError("release contract or platform mismatch")
        if not re.fullmatch(r"[0-9a-f]{40}", metadata.get("commit", "")):
            raise ValueError("release commit missing")
        data = tar.extractfile(f"{prefix}/bin/algal").read(100_000_001)
        if len(data) > 100_000_000 or hashlib.sha256(data).hexdigest() != metadata.get("binarySha256"):
            raise ValueError("release binary digest mismatch")
        with out.open("xb") as destination:
            destination.write(data)
        out.chmod(0o755)
        if retain_metadata:
            records = out.parent / ".algal-releases"
            records.mkdir(mode=0o755)
            real_directory(records)
            with (records / f"{metadata['binarySha256']}.json").open("xb") as destination:
                destination.write(metadata_data)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--archive", type=Path)
    parser.add_argument("--checksum", type=Path)
    parser.add_argument("--out", type=Path)
    parser.add_argument("--retain-metadata", action="store_true")
    parser.add_argument("--publish-metadata-from", type=Path)
    parser.add_argument("--metadata-dir", type=Path)
    args = parser.parse_args()
    if args.publish_metadata_from is not None:
        if args.metadata_dir is None or any([args.archive, args.checksum, args.out, args.retain_metadata]):
            parser.error("metadata publication requires only --publish-metadata-from and --metadata-dir")
        publish_metadata(args.publish_metadata_from, args.metadata_dir)
    else:
        if not all([args.archive, args.checksum, args.out]) or args.metadata_dir is not None:
            parser.error("extraction requires --archive, --checksum, and --out")
        unpack(args.archive, args.checksum, args.out, args.retain_metadata)
