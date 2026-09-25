"""Reproduce java-runtime.json from the checksum-verified immutable archive.

Usage: python3 verify/tla/qualify-java-runtime.py /path/to/archive.tar.gz
Writes JSON to stdout, never extracts archives or changes the installation.
"""
import hashlib
import json
from pathlib import Path, PurePosixPath
import sys
import tarfile

SHA256 = "3623232f33a9c3baadf304480b2535f9a3cba8a58d42ecbb438ba267315d9998"
PREFIX = "jdk-21.0.12.1+1/Contents/Home/"
URL = "https://github.com/adoptium/temurin21-binaries/releases/download/jdk-21.0.12.1%2B1/OpenJDK21U-jdk_aarch64_mac_hotspot_21.0.12.1_1.tar.gz"


def digest_stream(stream):
    result = hashlib.sha256()
    for block in iter(lambda: stream.read(1048576), b""):
        result.update(block)
    return result.hexdigest()


if len(sys.argv) != 2:
    raise ValueError("one pinned archive path is required")
archive = Path(sys.argv[1])
if archive.stat().st_size != 200073404:
    raise ValueError("archive byte length differs")
with archive.open("rb") as source:
    if digest_stream(source) != SHA256:
        raise ValueError("archive SHA256 differs")

files = []
with tarfile.open(archive, "r:gz") as contents:
    for member in contents:
        if not member.name.startswith(PREFIX) or member.isdir():
            continue
        relative = member.name[len(PREFIX):]
        if not member.isfile() or member.issym() or member.islnk():
            raise ValueError("nonregular archive member")
        if not relative or ".." in PurePosixPath(relative).parts or relative.startswith("/"):
            raise ValueError("unsafe archive path")
        if member.size > 536870912 or len(files) >= 456:
            raise ValueError("archive member bound")
        with contents.extractfile(member) as source:
            files.append({"path": relative, "sha256": "sha256:" + digest_stream(source)})
files.sort(key=lambda item: item["path"])
if len(files) != 456 or len({item["path"] for item in files}) != 456:
    raise ValueError("archive runtime inventory differs")

print(json.dumps({
    "contract": "algal.verification-java-runtime.v1",
    "version": "21.0.12.1+1",
    "platform": "darwin-arm64",
    "archive": {"url": URL, "bytes": archive.stat().st_size,
                "sha256": "sha256:" + SHA256, "prefix": PREFIX},
    "files": files,
    "assumptions": [
        "Host kernel and system libraries are trusted and not supplied by this archive.",
        "Archive checksum matches the publisher release asset API digest; no release signature was verified.",
    ],
}, indent=2))
