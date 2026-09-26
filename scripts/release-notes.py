#!/usr/bin/env python3
"""Render and verify the GitHub Release page for one native prerelease tag.

The page follows RELEASES.md in hraness/.github: a summary and `## Changes`
copied from the tag's CHANGELOG.md section, generated `## Install` and
`## Verify` sections, and a trailing `algal.release-page.v1` identity comment
as the final bytes of the body. The notes and the identity come only from
CHANGELOG.md and the qualified `*.release.json` package manifests.
"""
import argparse
import json
from pathlib import Path
import re
import sys

sys.dont_write_bytecode = True

PRODUCT = "ALGAL"
REPOSITORY = "hraness/algal"
IDENTITY_CONTRACT = "algal.release-page.v1"
IDENTITY_MARKER = f"<!-- {IDENTITY_CONTRACT} "
IDENTITY_END = " -->"
MAX_CHANGELOG_BYTES = 1_048_576
MAX_BODY_BYTES = 100_000
MAX_MANIFEST_BYTES = 65_536
TAG_PATTERN = re.compile(r"v[0-9]+\.[0-9]+\.[0-9]+(?:-[a-zA-Z0-9.-]+)?")
SHA_PATTERN = re.compile(r"[0-9a-f]{40}")
DIGEST_PATTERN = re.compile(r"[0-9a-f]{64}")
# Target order on the page and the platform each archive is tested on.
TARGETS = {
    "aarch64-apple-darwin": "macOS 14 or newer on Apple silicon (unsigned and not notarized)",
    "x86_64-unknown-linux-gnu": "Ubuntu 24.04 x86_64, glibc 2.39 or newer",
}


class ReleaseNotesError(ValueError):
    pass


def check_tag(tag):
    if len(tag) > 256 or not TAG_PATTERN.fullmatch(tag):
        raise ReleaseNotesError(f"invalid release tag: {tag!r}")
    return tag


def changelog_section(changelog, tag):
    """Return (summary, changes) from the `## <version>` section for tag."""
    check_tag(tag)
    if len(changelog.encode()) > MAX_CHANGELOG_BYTES:
        raise ReleaseNotesError("CHANGELOG.md exceeds the size limit")
    version = re.escape(tag[1:])
    heading = re.compile(rf"## v?{version}(?: - [0-9]{{4}}-[0-9]{{2}}-[0-9]{{2}})?")
    loose = re.compile(rf"## v?{version}(?![0-9A-Za-z.-])")
    lines = changelog.split("\n")
    starts = [index for index, line in enumerate(lines) if heading.fullmatch(line)]
    if not starts:
        near = [line for line in lines if loose.match(line)]
        if any("unreleased" in line.lower() for line in near):
            raise ReleaseNotesError(f"CHANGELOG.md section for {tag} still says Unreleased")
        raise ReleaseNotesError(f"CHANGELOG.md has no `## {tag}` section")
    if len(starts) > 1:
        raise ReleaseNotesError(f"CHANGELOG.md has more than one section for {tag}")
    body = []
    for line in lines[starts[0] + 1:]:
        if line.startswith("## ") or line.startswith("# "):
            break
        body.append(line)
    text = "\n".join(body).strip("\n")
    if not text.strip():
        raise ReleaseNotesError(f"CHANGELOG.md section for {tag} is empty")
    if re.search(r"(?i)\bunreleased\b", text):
        raise ReleaseNotesError(f"CHANGELOG.md section for {tag} still says Unreleased")
    section = text.split("\n")
    first_bullet = next((index for index, line in enumerate(section) if line.startswith("- ")), None)
    if first_bullet is None:
        raise ReleaseNotesError(f"CHANGELOG.md section for {tag} has no change bullets")
    # GitHub renders every newline in a release body as a line break, so the
    # page joins the changelog's wrapped lines into one line per paragraph
    # and one line per bullet.
    paragraphs, current = [], []
    for line in section[:first_bullet]:
        if line.strip():
            current.append(line.strip())
        elif current:
            paragraphs.append(" ".join(current))
            current = []
    if current:
        paragraphs.append(" ".join(current))
    if not paragraphs:
        raise ReleaseNotesError(f"CHANGELOG.md section for {tag} has no summary paragraph")
    bullets = []
    for line in section[first_bullet:]:
        if line.startswith("- ") and line[2:].strip():
            bullets.append(line.rstrip())
        elif line.startswith("  ") and line.strip():
            bullets[-1] += " " + line.strip()
        elif line.strip():
            raise ReleaseNotesError(f"CHANGELOG.md section for {tag} has text after its change bullets")
    return "\n\n".join(paragraphs), "\n".join(bullets)


def load_manifests(directory, tag, commit):
    """Read the qualified package manifests into the identity record."""
    check_tag(tag)
    if not SHA_PATTERN.fullmatch(commit):
        raise ReleaseNotesError("source commit must be a full lowercase SHA-1")
    archives = []
    for path in sorted(Path(directory).glob("*.release.json")):
        if path.is_symlink() or not path.is_file() or path.stat().st_size > MAX_MANIFEST_BYTES:
            raise ReleaseNotesError(f"release manifest rejected: {path.name}")
        value = json.loads(path.read_text())
        if not isinstance(value, dict):
            raise ReleaseNotesError(f"release manifest is not an object: {path.name}")
        target, archive, digest = value.get("target"), value.get("archive"), value.get("archiveSha256")
        if value.get("tag") != tag or value.get("commit") != commit or value.get("sourceState") != "clean":
            raise ReleaseNotesError(f"release manifest identity mismatch: {path.name}")
        if target not in TARGETS or archive != f"algal-{tag}-{target}.tar.gz" or not isinstance(digest, str) \
                or not DIGEST_PATTERN.fullmatch(digest):
            raise ReleaseNotesError(f"release manifest archive fields rejected: {path.name}")
        archives.append({"archive": archive, "archiveSha256": digest, "target": target})
    if sorted(item["target"] for item in archives) != sorted(TARGETS):
        raise ReleaseNotesError("expected exactly one release manifest per supported target")
    archives.sort(key=lambda item: list(TARGETS).index(item["target"]))
    return {"archives": archives, "commit": commit, "contract": IDENTITY_CONTRACT, "tag": tag}


def install_section(identity):
    tag = identity["tag"]
    lines = [
        "## Install",
        "",
        "Download the archive for your platform with its checksum, then install it with the "
        f"installer from the `{tag}` source. The installer needs Python 3 and checks the archive "
        "checksum and the binary digest before it installs anything. The installed `algal` needs "
        "no Bun, Cargo, or checkout.",
        "",
        "```sh",
        f"git clone --depth 1 --branch {tag} https://github.com/{REPOSITORY} algal-{tag}",
        "```",
    ]
    for item in identity["archives"]:
        archive = item["archive"]
        lines += [
            "",
            f"{TARGETS[item['target']]}:",
            "",
            "```sh",
            f"gh release download {tag} --repo {REPOSITORY} --pattern '{archive}*'",
            f"sh algal-{tag}/scripts/install-native.sh \"$HOME/.local\" \\",
            f"  --archive ./{archive} \\",
            f"  --checksum ./{archive}.sha256",
            "\"$HOME/.local/bin/algal\" doctor",
            "```",
        ]
    return "\n".join(lines)


def verify_section(identity):
    tag = identity["tag"]
    lines = [
        "## Verify",
        "",
        "Each archive has a `.tar.gz.sha256` checksum asset and a `.release.json` record that "
        "names its tag, source commit, target, and archive SHA-256.",
        "",
        f"- Source commit: `{identity['commit']}`",
    ]
    lines += [f"- `{item['archive']}`: SHA-256 `{item['archiveSha256']}`" for item in identity["archives"]]
    lines += [
        "",
        "Checksums detect corruption and substitution against a checksum you trust; they are not "
        f"a publisher signature. The [release guide](https://github.com/{REPOSITORY}/blob/{tag}/docs/native-release.md) "
        "describes each check and how to run the packaged smoke test.",
    ]
    return "\n".join(lines)


def render_notes(changelog, identity):
    summary, changes = changelog_section(changelog, identity["tag"])
    return f"{summary}\n\n## Changes\n\n{changes}\n\n{install_section(identity)}\n\n{verify_section(identity)}\n"


def render_identity(identity):
    return IDENTITY_MARKER + json.dumps(identity, sort_keys=True, separators=(",", ":")) + IDENTITY_END


def render_body(changelog, identity):
    body = render_notes(changelog, identity) + "\n" + render_identity(identity)
    if len(body.encode()) > MAX_BODY_BYTES:
        raise ReleaseNotesError("rendered release body exceeds the size limit")
    return body


def parse_identity(body):
    """Split a release body into (notes, identity) at the trailing identity comment."""
    if len(body.encode()) > MAX_BODY_BYTES:
        raise ReleaseNotesError("release body exceeds the size limit")
    if not body.endswith("-->"):
        raise ReleaseNotesError("release body does not end with the identity comment")
    start = body.rfind(IDENTITY_MARKER)
    if start < 0:
        raise ReleaseNotesError("release body has no identity comment")
    comment = body[start:]
    payload = comment[len(IDENTITY_MARKER):-len(IDENTITY_END)]
    if not comment.endswith(IDENTITY_END) or "-->" in payload:
        raise ReleaseNotesError("identity comment is malformed")
    try:
        identity = json.loads(payload)
    except json.JSONDecodeError:
        raise ReleaseNotesError("identity comment is not JSON") from None
    if not isinstance(identity, dict) or sorted(identity) != ["archives", "commit", "contract", "tag"] \
            or identity["contract"] != IDENTITY_CONTRACT or not isinstance(identity["archives"], list):
        raise ReleaseNotesError("identity comment fields rejected")
    if not isinstance(identity["tag"], str) or not isinstance(identity["commit"], str) \
            or not SHA_PATTERN.fullmatch(identity["commit"]):
        raise ReleaseNotesError("identity comment fields rejected")
    check_tag(identity["tag"])
    for item in identity["archives"]:
        if not isinstance(item, dict) or sorted(item) != ["archive", "archiveSha256", "target"]:
            raise ReleaseNotesError("identity archive fields rejected")
    if payload != json.dumps(identity, sort_keys=True, separators=(",", ":")):
        raise ReleaseNotesError("identity comment is not canonical JSON")
    if not body[:start].endswith("\n\n"):
        raise ReleaseNotesError("identity comment must follow the notes after one blank line")
    return body[:start - 1], identity


def verify_body(body, changelog, identity):
    """Fail unless body is exactly the rendered page for this identity."""
    notes, found = parse_identity(body)
    if found != identity:
        raise ReleaseNotesError("release identity does not match the qualified packages")
    if notes != render_notes(changelog, identity):
        raise ReleaseNotesError("release notes differ from the rendered CHANGELOG.md section")
    return found


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__.split("\n", 1)[0])
    parser.add_argument("command", choices=["render", "verify", "title"])
    parser.add_argument("--tag", required=True)
    parser.add_argument("--commit")
    parser.add_argument("--changelog", type=Path, default=Path("CHANGELOG.md"))
    parser.add_argument("--manifests", type=Path, help="directory holding the *.release.json manifests")
    parser.add_argument("--body", type=Path, help="verify: file holding the published body")
    parser.add_argument("--out", type=Path, help="render: write the body here instead of stdout")
    args = parser.parse_args(argv)
    try:
        if args.command == "title":
            print(f"{PRODUCT} {check_tag(args.tag)}")
            return 0
        if args.commit is None or args.manifests is None:
            parser.error("render and verify need --commit and --manifests")
        changelog = args.changelog.read_bytes().decode()
        identity = load_manifests(args.manifests, args.tag, args.commit)
        if args.command == "render":
            body = render_body(changelog, identity)
            if args.out:
                args.out.write_bytes(body.encode())
            else:
                sys.stdout.write(body)
        else:
            if args.body is None:
                parser.error("verify needs --body")
            verify_body(args.body.read_bytes().decode(), changelog, identity)
    except (ReleaseNotesError, OSError, UnicodeDecodeError, json.JSONDecodeError) as error:
        print(f"release-notes: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
