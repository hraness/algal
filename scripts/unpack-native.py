#!/usr/bin/env python3
"""Verify a local release archive and extract only its admitted executable."""
import argparse
import hashlib
import gzip
import io
import json
from pathlib import Path
import platform
import re
import tarfile


MAX_TAR_BYTES = 101_000_000

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

def unpack(archive, checksum, out):
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
        if metadata_member.size > 16384:
            raise ValueError("release metadata byte limit")
        metadata = json.load(tar.extractfile(metadata_member))
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


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--archive", type=Path, required=True)
    parser.add_argument("--checksum", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    unpack(args.archive, args.checksum, args.out)
