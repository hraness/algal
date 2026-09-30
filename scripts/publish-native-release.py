#!/usr/bin/env python3
"""Publish qualified native assets through one draft, using stable release IDs."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import tempfile
from urllib.parse import quote


MAX_PAGES = 10
MAX_JSON_BYTES = 4 * 1024 * 1024
MAX_ASSET_BYTES = 100_000_000


def run_gh(arguments, output=None):
    result = subprocess.run(
        ["gh", "api", "--hostname", "github.com", *arguments],
        stdout=output if output is not None else subprocess.PIPE,
        stderr=subprocess.PIPE, timeout=120, check=False,
    )
    if result.returncode:
        raise ValueError("GitHub operation failed; retry with the same qualified artifacts")
    if output is not None:
        return None
    if len(result.stdout) > MAX_JSON_BYTES:
        raise ValueError("GitHub metadata exceeded the response limit")
    return json.loads(result.stdout)


def require_tag(gh, repo, tag, sha):
    record = gh([f"repos/{repo}/git/ref/tags/{quote(tag, safe='')}"])
    current = record.get("object", record)
    seen = set()
    while current.get("type") != "commit":
        value = current.get("sha")
        if current.get("type") != "tag" or not isinstance(value, str) or not re.fullmatch(r"[0-9a-f]{40}", value) or value in seen or len(seen) >= 8:
            raise ValueError("Remote release tag has an unsupported annotation chain")
        seen.add(value)
        record = gh([f"repos/{repo}/git/tags/{value}"])
        current = record.get("object", record)
    if current.get("sha") != sha:
        raise ValueError("Remote release tag moved from the qualified source")


def find_release(gh, repo, tag):
    matches = []
    for page in range(1, MAX_PAGES + 1):
        records = gh([f"repos/{repo}/releases?per_page=100&page={page}"])
        if not isinstance(records, list) or len(records) > 100:
            raise ValueError("Invalid bounded release inventory")
        matches.extend(record for record in records if record.get("tag_name") == tag)
        if len(matches) > 1:
            raise ValueError("Ambiguous release tag inventory")
        if len(records) < 100:
            return matches[0] if matches else None
    raise ValueError("Release inventory exceeds the bounded search; no release was changed")


def positive_id(value):
    if type(value) is not int or value <= 0:
        raise ValueError("Invalid GitHub release or asset ID")
    return value


def expected_assets(directory):
    paths = list(directory.iterdir())
    if len(paths) != 9 or any(path.is_symlink() or not path.is_file() for path in paths):
        raise ValueError("Expected exactly nine regular qualified release assets")
    expected = {}
    for path in paths:
        size = path.stat().st_size
        if not 0 < size <= MAX_ASSET_BYTES:
            raise ValueError("Qualified release asset exceeds its size bound")
        expected[path.name] = (path, size, "sha256:" + hashlib.sha256(path.read_bytes()).hexdigest())
    return expected


def admitted_assets(release, expected, complete):
    rows = release.get("assets")
    if not isinstance(rows, list) or len(rows) > len(expected):
        raise ValueError("Uploaded release asset inventory differs from qualified packages")
    result = {}
    identities = set()
    for row in rows:
        name = row.get("name")
        identity = positive_id(row.get("id"))
        if name not in expected or name in result or identity in identities:
            raise ValueError("Unexpected or duplicate uploaded release asset")
        if row.get("state") != "uploaded" or (row.get("size"), row.get("digest")) != expected[name][1:]:
            raise ValueError("Uploaded release asset bytes differ from qualified packages")
        identities.add(identity)
        result[name] = identity
    if complete and set(result) != set(expected):
        raise ValueError("Published release is missing qualified assets")
    return result


def verify_downloads(gh, repo, assets, expected):
    for name, identity in sorted(assets.items()):
        _, size, digest = expected[name]
        with tempfile.TemporaryFile() as output:
            gh([f"repos/{repo}/releases/assets/{identity}", "--header", "Accept: application/octet-stream"], output=output)
            if output.tell() != size:
                raise ValueError("Downloaded release asset size differs from qualified bytes")
            output.seek(0)
            actual = hashlib.sha256(output.read(size + 1)).hexdigest()
            if "sha256:" + actual != digest:
                raise ValueError("Downloaded release asset digest differs from qualified bytes")


def mutate(gh, endpoint, method, payload):
    with tempfile.NamedTemporaryFile(mode="w", suffix=".json") as source:
        json.dump(payload, source)
        source.flush()
        return gh([endpoint, "--method", method, "--input", source.name])


def publish(directory, notes, title, tag, sha, repo, gh=run_gh):
    if repo != "hraness/algal" or not re.fullmatch(r"v[0-9]+\.[0-9]+\.[0-9]+-vm\.[1-9][0-9]*", tag) or not re.fullmatch(r"[0-9a-f]{40}", sha):
        raise ValueError("Invalid native release identity")
    expected = expected_assets(directory)
    require_tag(gh, repo, tag, sha)
    existing = find_release(gh, repo, tag)
    if existing is not None:
        release_id = positive_id(existing.get("id"))
        release = gh([f"repos/{repo}/releases/{release_id}"])
        if release.get("id") != release_id or release.get("tag_name") != tag:
            raise ValueError("Release ID no longer matches the requested tag")
        draft = release.get("draft")
        if type(draft) is not bool:
            raise ValueError("Invalid release publication state")
        assets = admitted_assets(release, expected, complete=not draft)
        body = release.get("body", "")
        if not isinstance(body, str):
            raise ValueError("Invalid release body")
        if not draft or "<!-- algal.release-page.v1 " in body:
            if release.get("name") != title or body != notes:
                raise ValueError("Release page differs from the qualified rendered notes")
        if not draft:
            if release.get("immutable") is not True or release.get("prerelease") is not True:
                raise ValueError("Already published native release must be an immutable prerelease")
            verify_downloads(gh, repo, assets, expected)
            require_tag(gh, repo, tag, sha)
            return release_id
        verify_downloads(gh, repo, assets, expected)
    else:
        require_tag(gh, repo, tag, sha)
        release = mutate(gh, f"repos/{repo}/releases", "POST", {
            "tag_name": tag, "target_commitish": sha, "name": title, "body": notes,
            "draft": True, "prerelease": True, "make_latest": "false",
        })
        release_id = positive_id(release.get("id"))
        if release.get("tag_name") != tag or release.get("draft") is not True:
            raise ValueError("GitHub did not create the requested draft release")
        assets = admitted_assets(release, expected, complete=False)
    endpoint = f"repos/{repo}/releases/{release_id}"
    if release.get("name") != title or release.get("body") != notes:
        mutate(gh, endpoint, "PATCH", {"name": title, "body": notes})
    for name, (path, _, _) in sorted(expected.items()):
        if name in assets:
            continue
        upload = f"https://uploads.github.com/repos/{repo}/releases/{release_id}/assets?name={quote(name, safe='')}"
        gh([upload, "--method", "POST", "--header", "Content-Type: application/octet-stream", "--input", str(path)])
    release = gh([endpoint])
    if release.get("draft") is not True or release.get("name") != title or release.get("body") != notes:
        raise ValueError("Draft page differs from the qualified rendered notes")
    uploaded = admitted_assets(release, expected, complete=True)
    verify_downloads(gh, repo, uploaded, expected)
    require_tag(gh, repo, tag, sha)
    mutate(gh, endpoint, "PATCH", {"draft": False, "prerelease": True, "make_latest": "false"})
    release = gh([endpoint])
    if release.get("draft") is not False or release.get("immutable") is not True or release.get("prerelease") is not True:
        raise ValueError("Published native release must be an immutable prerelease")
    if release.get("name") != title or release.get("body") != notes:
        raise ValueError("Published release page differs from qualified notes")
    if admitted_assets(release, expected, complete=True) != uploaded:
        raise ValueError("Release asset identities changed during publication")
    return release_id


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--artifacts", type=Path, required=True)
    parser.add_argument("--notes", type=Path, required=True)
    parser.add_argument("--title", required=True)
    args = parser.parse_args()
    try:
        release_id = publish(args.artifacts, args.notes.read_text(), args.title,
                             os.environ["RELEASE_TAG"], os.environ["RELEASE_SHA"], os.environ["GH_REPO"])
    except (OSError, ValueError, KeyError, subprocess.SubprocessError) as error:
        parser.exit(1, f"publish-native-release: {error}\n")
    print(f"Verified immutable native prerelease ID {release_id}")


if __name__ == "__main__":
    main()
