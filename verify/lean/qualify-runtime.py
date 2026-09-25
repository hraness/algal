"""Derive runtime.json from the pinned Lean distribution, never the installation.

Requires Python 3.14 tarfile Zstandard support. Reads the archive without extracting
or executing anything. Usage: python3 verify/lean/qualify-runtime.py ARCHIVE
"""
import hashlib
import json
from pathlib import Path, PurePosixPath
import sys
import tarfile

SHA256 = "69f263fa6e21bbc2466bbfb1affcd92479ee2714c883a07de548e099a5922932"
PREFIX = "lean-4.34.0-darwin_aarch64/"
URL = "https://github.com/leanprover/lean4/releases/download/v4.34.0/lean-4.34.0-darwin_aarch64.tar.zst"
ARCHIVE_BYTES = 561666156
FILE_COUNT = 17711
TOTAL_BYTES = 2860122955


def digest_stream(stream):
    result = hashlib.sha256()
    for block in iter(lambda: stream.read(1048576), b""):
        result.update(block)
    return result.hexdigest()


if len(sys.argv) != 2:
    raise ValueError("one pinned archive path is required")
archive = Path(sys.argv[1])
if archive.stat().st_size != ARCHIVE_BYTES:
    raise ValueError("archive byte length differs")
with archive.open("rb") as source:
    if digest_stream(source) != SHA256:
        raise ValueError("archive SHA256 differs")

files = []
total = 0
with tarfile.open(archive, "r:zst") as contents:
    for member in contents:
        if member.isdir():
            continue
        if not member.name.startswith(PREFIX) or not member.isfile():
            raise ValueError("unexpected archive member")
        relative = member.name[len(PREFIX):]
        if not relative or ".." in PurePosixPath(relative).parts or relative.startswith("/"):
            raise ValueError("unsafe archive path")
        total += member.size
        if member.size > 536870912 or total > TOTAL_BYTES or len(files) >= FILE_COUNT:
            raise ValueError("runtime inventory bound")
        with contents.extractfile(member) as source:
            files.append({"path": relative, "sha256": "sha256:" + digest_stream(source)})
files.sort(key=lambda item: item["path"])
if len(files) != FILE_COUNT or len({item["path"] for item in files}) != FILE_COUNT or total != TOTAL_BYTES:
    raise ValueError("runtime inventory differs")

print(json.dumps({
    "contract": "algal.verification-lean-runtime.v1",
    "version": "4.34.0",
    "commit": "293d5d0c0c3f3dded4688b3ccd6a33939ac5102b",
    "platform": "darwin-arm64",
    "archive": {"url": URL, "bytes": ARCHIVE_BYTES, "sha256": "sha256:" + SHA256, "prefix": PREFIX},
    "files": files,
    "assumptions": [
        "Lean kernel, imported standard library, elaborator and runtime are trusted at this pinned distribution identity.",
        "Host kernel and system libraries are outside the archive and remain trusted.",
        "The archive checksum matched the official release asset API digest; no release signature was verified.",
    ],
}, indent=2))
