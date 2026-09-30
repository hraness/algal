#!/usr/bin/env python3
"""Offline tests for the release page renderer and the workflow step that publishes it."""
import hashlib
import gzip
import io
import tarfile
import importlib.util
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import textwrap
import unittest

sys.dont_write_bytecode = True

ROOT = Path(__file__).resolve().parent.parent
SPEC = importlib.util.spec_from_file_location("release_notes", ROOT / "scripts/release-notes.py")
notes = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(notes)
WORKFLOW = (ROOT / ".github/workflows/release.yml").read_text()
PUBLISH = textwrap.dedent(WORKFLOW.split(
    "      - name: Publish only verified prerelease assets\n", 1,
)[1].split("        run: |\n", 1)[1])

TAG = "v0.3.0-vm.1"
COMMIT = "a" * 40
CHANGELOG = f"""# Changelog

Intro text.

## Unreleased

- Something not yet released.

## {TAG} - 2026-10-01

Mailboxes now reject oversized messages before delivery, and the installer
refuses symlinked prefixes.

- `algal mailbox send` rejects a message larger than 64 KiB before it is
  delivered.
- The installer refuses a symlinked installation prefix.

## v0.2.0-vm.9 - 2026-09-20

Older release.

- Older change.
"""


def manifests(directory, tag=TAG, commit=COMMIT, *, archives=True, mac_binary=b"signed fixture"):
    directory.mkdir(parents=True, exist_ok=True)
    for target in notes.TARGETS:
        name = f"algal-{tag}-{target}.tar.gz"
        metadata = {
            "contract": "algal.native-release.v1", "tag": tag, "commit": commit, "sourceState": "clean",
            "target": target, "signed": target == "aarch64-apple-darwin",
            "binarySha256": hashlib.sha256(b"signed fixture").hexdigest(),
        }
        data = f"archive for {target}\n".encode()
        if target == "aarch64-apple-darwin":
            stream = io.BytesIO()
            with tarfile.open(fileobj=stream, mode="w:", format=tarfile.USTAR_FORMAT) as archive:
                for member_name in ("bin/algal", "LICENSE", "release.json", "smoke.py"):
                    payload = mac_binary if member_name == "bin/algal" else b"fixture"
                    if member_name == "release.json":
                        payload = json.dumps(metadata).encode()
                    member = tarfile.TarInfo(f"algal-{tag}-{target}/{member_name}")
                    member.size = len(payload)
                    archive.addfile(member, io.BytesIO(payload))
            data = gzip.compress(stream.getvalue(), mtime=0)
        digest = hashlib.sha256(data).hexdigest()
        if archives:
            (directory / name).write_bytes(data)
            (directory / f"{name}.sha256").write_text(f"{digest}  {name}\n")
        (directory / f"algal-{tag}-{target}.release.json").write_text(json.dumps({
            **metadata, "archive": name, "archiveSha256": digest,
        }, sort_keys=True, indent=2) + "\n")
    return directory


class ChangelogSection(unittest.TestCase):
    def test_section_is_copied_with_wrapped_lines_joined(self):
        summary, changes = notes.changelog_section(CHANGELOG, TAG)
        self.assertEqual(summary, "Mailboxes now reject oversized messages before delivery, and the installer "
                                  "refuses symlinked prefixes.")
        self.assertEqual(changes, "- `algal mailbox send` rejects a message larger than 64 KiB before it is delivered.\n"
                                  "- The installer refuses a symlinked installation prefix.")

    def test_heading_forms(self):
        for heading in [f"## {TAG}", f"## {TAG[1:]}", f"## {TAG[1:]} - 2026-10-01"]:
            with self.subTest(heading=heading):
                text = f"{heading}\n\nSummary.\n\n- Change.\n"
                self.assertEqual(notes.changelog_section(text, TAG), ("Summary.", "- Change."))

    def test_missing_section_fails(self):
        with self.assertRaisesRegex(notes.ReleaseNotesError, "no `## v0.3.0-vm.2` section"):
            notes.changelog_section(CHANGELOG, "v0.3.0-vm.2")
        # A longer tag sharing a prefix is not a match.
        with self.assertRaisesRegex(notes.ReleaseNotesError, "no `## v0.3.0-vm` section"):
            notes.changelog_section(CHANGELOG, "v0.3.0-vm")

    def test_empty_section_fails(self):
        with self.assertRaisesRegex(notes.ReleaseNotesError, "is empty"):
            notes.changelog_section(f"## {TAG}\n\n\n## v0.2.0\n\nOld.\n\n- Old.\n", TAG)

    def test_unreleased_section_fails(self):
        for text in [f"## {TAG} (Unreleased)\n\nSummary.\n\n- Change.\n",
                     f"## {TAG} - Unreleased\n\nSummary.\n\n- Change.\n",
                     f"## {TAG}\n\nUnreleased.\n\n- Change.\n"]:
            with self.subTest(text=text):
                with self.assertRaisesRegex(notes.ReleaseNotesError, "Unreleased"):
                    notes.changelog_section(text, TAG)

    def test_section_needs_summary_and_bullets(self):
        with self.assertRaisesRegex(notes.ReleaseNotesError, "no change bullets"):
            notes.changelog_section(f"## {TAG}\n\nSummary only.\n", TAG)
        with self.assertRaisesRegex(notes.ReleaseNotesError, "no summary"):
            notes.changelog_section(f"## {TAG}\n\n- Change only.\n", TAG)
        with self.assertRaisesRegex(notes.ReleaseNotesError, "after its change bullets"):
            notes.changelog_section(f"## {TAG}\n\nSummary.\n\n- Change.\n\nTrailing prose.\n", TAG)

    def test_duplicate_section_fails(self):
        with self.assertRaisesRegex(notes.ReleaseNotesError, "more than one"):
            notes.changelog_section(f"## {TAG}\n\nA.\n\n- A.\n\n## {TAG[1:]}\n\nB.\n\n- B.\n", TAG)

    def test_repository_changelog_has_current_release_section(self):
        tags = subprocess.run(["git", "tag", "--list", "v*", "--sort=-creatordate"], cwd=ROOT,
                              capture_output=True, text=True, timeout=10).stdout.split()
        changelog = (ROOT / "CHANGELOG.md").read_text()
        for tag in tags[:1] or ["v0.2.0-vm.9"]:
            summary, changes = notes.changelog_section(changelog, tag)
            self.assertTrue(summary and changes.startswith("- "))


class RenderedBody(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix="algal-release-notes-")
        self.directory = manifests(Path(self.temporary.name))
        self.identity = notes.load_manifests(self.directory, TAG, COMMIT)

    def tearDown(self):
        self.temporary.cleanup()

    def test_body_shape(self):
        body = notes.render_body(CHANGELOG, self.identity)
        self.assertTrue(body.startswith("Mailboxes now reject oversized messages"))
        headings = [line for line in body.split("\n") if line.startswith("#")]
        self.assertEqual(headings, ["## Changes", "## Install", "## Verify"])
        self.assertIn(f"git clone --depth 1 --branch {TAG} https://github.com/hraness/algal", body)
        for target in notes.TARGETS:
            self.assertIn(f"gh release download {TAG} --repo hraness/algal --pattern 'algal-{TAG}-{target}.tar.gz*'", body)
        self.assertIn(f"- Source commit: `{COMMIT}`", body)
        self.assertIn(f"https://github.com/hraness/algal/blob/{TAG}/docs/native-release.md", body)
        self.assertNotIn("latest", body)
        for banned in ["What's Changed", "What’s Changed", "Full Changelog", "Generated with",
                       "Automated release", "Canonical GitHub release for", "Unreleased"]:
            self.assertNotIn(banned, body)
        self.assertTrue(body.endswith(" -->"))
        self.assertEqual(body.count("<!--"), 1)
        self.assertEqual(notes.render_body(CHANGELOG, self.identity), body)

    def test_identity_parses_from_the_end(self):
        body = notes.render_body(CHANGELOG, self.identity)
        parsed_notes, identity = notes.parse_identity(body)
        self.assertEqual(identity, self.identity)
        self.assertEqual(parsed_notes, notes.render_notes(CHANGELOG, self.identity))
        self.assertEqual(notes.verify_body(body, CHANGELOG, self.identity), self.identity)
        # An identity-shaped comment earlier in the notes does not shadow the trailing one.
        decoy = notes.render_identity({**self.identity, "commit": "b" * 40})
        _, identity = notes.parse_identity(decoy + "\n\n" + body)
        self.assertEqual(identity["commit"], COMMIT)

    def test_tampered_notes_are_detected(self):
        body = notes.render_body(CHANGELOG, self.identity)
        for tampered in [body.replace("64 KiB", "128 KiB"), "Edited by hand.\n\n" + body,
                         body.replace("## Verify", "## Verify\n\nExtra line.")]:
            with self.subTest(tampered=tampered[:40]):
                with self.assertRaisesRegex(notes.ReleaseNotesError, "differ"):
                    notes.verify_body(tampered, CHANGELOG, self.identity)

    def test_malformed_or_moved_identity_is_rejected(self):
        body = notes.render_body(CHANGELOG, self.identity)
        other = notes.load_manifests(manifests(Path(self.temporary.name) / "other", commit="c" * 40), TAG, "c" * 40)
        cases = {
            "does not end": body + "\n",
            "no identity": body.rsplit("<!--", 1)[0] + "<!-- other -->",
            "not JSON": body.rsplit("<!--", 1)[0] + notes.IDENTITY_MARKER + "{" + notes.IDENTITY_END,
            "fields rejected": body.rsplit("<!--", 1)[0] + notes.IDENTITY_MARKER + '{"tag":"x"}' + notes.IDENTITY_END,
            "canonical": body.replace('{"archives"', '{ "archives"'),
            "does not match": notes.render_body(CHANGELOG, other),
        }
        for message, candidate in cases.items():
            with self.subTest(message=message):
                with self.assertRaisesRegex(notes.ReleaseNotesError, message):
                    notes.verify_body(candidate, CHANGELOG, self.identity)

    def test_manifest_identity_is_checked(self):
        with self.assertRaisesRegex(notes.ReleaseNotesError, "identity mismatch"):
            notes.load_manifests(self.directory, TAG, "d" * 40)
        with self.assertRaisesRegex(notes.ReleaseNotesError, "one release manifest per supported target"):
            notes.load_manifests(Path(self.temporary.name) / "empty", TAG, COMMIT)


FAKE_GH = f"#!{sys.executable}\n" + (ROOT / "scripts/fixtures/native-release-gh.py").read_text()


class PublishStep(unittest.TestCase):
    """Runs the workflow's actual publish script against an offline gh."""

    @staticmethod
    def mutations(calls):
        return [call for call in calls if call[0] == "api" and "--method" in call]

    def run_publish(self, changelog=CHANGELOG, release=None, mangle=False, mac_binary=b"signed fixture", bad_asset=False, extra_env=None):
        with tempfile.TemporaryDirectory(prefix="algal-release-publish-") as temporary:
            tree = Path(temporary)
            (tree / "scripts").mkdir()
            shutil.copy(ROOT / "scripts/release-notes.py", tree / "scripts/release-notes.py")
            shutil.copy(ROOT / "scripts/unpack-native.py", tree / "scripts/unpack-native.py")
            shutil.copy(ROOT / "scripts/publish-native-release.py", tree / "scripts/publish-native-release.py")
            (tree / "CHANGELOG.md").write_text(changelog)
            manifests(tree / "artifacts", mac_binary=mac_binary)
            (tree / "runner").mkdir()
            (tree / "bin").mkdir()
            (tree / "bin/gh").write_text(FAKE_GH)
            (tree / "bin/gh").chmod(0o755)
            state = tree / "state.json"
            state.write_text(json.dumps({"release": release}))
            log = tree / "gh.log"
            log.write_text("")
            environment = {**os.environ, "PATH": f"{tree / 'bin'}{os.pathsep}{os.environ['PATH']}",
                           "SIGNED_BINARY_SHA256": hashlib.sha256(b"signed fixture").hexdigest(),
                           "RELEASE_TAG": TAG, "RELEASE_SHA": COMMIT, "GH_REPO": "hraness/algal",
                           "GH_TOKEN": "offline-fixture", "RUNNER_TEMP": str(tree / "runner"),
                           "FAKE_GH_STATE": str(state), "FAKE_GH_LOG": str(log)}
            environment.update(extra_env or {})
            if mangle:
                environment["FAKE_GH_MANGLE"] = "1"
            if bad_asset:
                environment["FAKE_GH_BAD_ASSET"] = "1"
            result = subprocess.run(["bash", "-c", PUBLISH], cwd=tree, env=environment,
                                    capture_output=True, text=True, timeout=60)
            calls = [json.loads(line) for line in log.read_text().splitlines()]
            return result, json.loads(state.read_text())["release"], calls

    def test_changed_mac_payload_cannot_publish_under_forged_manifest_hash(self):
        result, release, calls = self.run_publish(mac_binary=b"substituted after signing")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("signed bytes mismatch", result.stderr)
        self.assertIsNone(release)
        self.assertEqual(calls, [])

    def test_new_release_gets_title_and_rendered_body(self):
        result, release, calls = self.run_publish()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(release["name"], f"ALGAL {TAG}")
        self.assertTrue(release["body"].startswith("Mailboxes now reject oversized messages"))
        self.assertTrue(release["body"].endswith(" -->"))
        self.assertEqual(len(release["assets"]), 3 * len(notes.TARGETS))
        self.assertTrue(any(call[3] == "repos/hraness/algal/releases" and "POST" in call for call in self.mutations(calls)))
        self.assertTrue(release["immutable"])
        self.assertFalse(release["isDraft"])
        uploaded = max(i for i, call in enumerate(calls) if call[0] == "api" and call[3].startswith("https://uploads.github.com/"))
        published = next(i for i, call in enumerate(calls) if call[0] == "fixture-patch" and call[1].get("draft") is False)
        self.assertLess(uploaded, published)
        self.assertTrue(any(call[:3] == ["api", "--hostname", "github.com"] and call[3] == "repos/hraness/algal/releases/42"
                            for call in calls[uploaded + 1:published]))
        self.assertFalse(any(call[0] == "api" and "/releases/tags/" in call[3] for call in calls))

    def test_uploaded_digest_mismatch_keeps_the_release_draft(self):
        result, release, calls = self.run_publish(bad_asset=True)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("asset bytes differ", result.stderr)
        self.assertTrue(release["isDraft"])
        self.assertFalse(any(call[0] == "fixture-patch" and call[1].get("draft") is False for call in calls))

    def test_missing_or_unreleased_section_fails_before_any_release_call(self):
        for changelog in [CHANGELOG.replace(f"## {TAG} - 2026-10-01", "## v9.9.9"),
                          CHANGELOG.replace(f"## {TAG} - 2026-10-01", f"## {TAG} (Unreleased)")]:
            with self.subTest(changelog=changelog[40:80]):
                result, release, calls = self.run_publish(changelog)
                self.assertNotEqual(result.returncode, 0)
                self.assertIn("release-notes:", result.stderr)
                self.assertIsNone(release)
                self.assertFalse([call for call in calls if call[0] == "release"])

    def test_owner_draft_without_identity_gets_rendered_page(self):
        draft = {"isDraft": True, "isPrerelease": False, "name": "draft", "body": "Draft notes.", "assets": []}
        result, release, _ = self.run_publish(release=draft)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(release["name"], f"ALGAL {TAG}")
        self.assertTrue(release["body"].endswith(" -->"))

    def test_retry_with_matching_page_uploads(self):
        first, release, _ = self.run_publish()
        self.assertEqual(first.returncode, 0, first.stderr)
        result, release, calls = self.run_publish(release={**release, "isDraft": True, "immutable": False, "assets": [], "assetProofs": {}})
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertFalse(any(call[3] == "repos/hraness/algal/releases" for call in self.mutations(calls)))
        patches = [call[1] for call in calls if call[0] == "fixture-patch"]
        self.assertEqual(patches, [{"draft": False, "prerelease": True, "make_latest": "false"}])

    def test_hand_edited_page_is_refused(self):
        first, release, _ = self.run_publish()
        self.assertEqual(first.returncode, 0, first.stderr)
        edited = {**release, "isDraft": True, "immutable": False, "assets": [], "body": release["body"].replace("64 KiB", "32 KiB")}
        result, after, calls = self.run_publish(release=edited)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("differ", result.stderr)
        self.assertEqual(after["assets"], [])
        self.assertFalse(self.mutations(calls))

    def test_body_changed_after_publication_fails_the_run(self):
        result, _, _ = self.run_publish(mangle=True)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("differ", result.stderr)

    def test_stable_release_is_never_mutated(self):
        stable = {"isDraft": False, "isPrerelease": False, "name": "x", "body": "x", "assets": []}
        result, release, calls = self.run_publish(release=stable)
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(release, stable)
        self.assertFalse(self.mutations(calls))

    def test_published_prerelease_is_never_mutated(self):
        for immutable in (False, True):
            with self.subTest(immutable=immutable):
                published = {"isDraft": False, "isPrerelease": True, "immutable": immutable, "name": "x", "body": "x", "assets": []}
                result, release, calls = self.run_publish(release=published)
                self.assertNotEqual(result.returncode, 0)
                self.assertEqual(release, published)
                self.assertFalse(self.mutations(calls))

    def test_partial_draft_preserves_existing_assets_and_uploads_only_missing(self):
        first, release, _ = self.run_publish()
        self.assertEqual(first.returncode, 0, first.stderr)
        retained = release["assets"][:2]
        draft = {**release, "isDraft": True, "immutable": False, "assets": retained,
                 "assetProofs": {name: release["assetProofs"][name] for name in retained},
                 "payloads": {name: release["payloads"][name] for name in retained}}
        result, published, calls = self.run_publish(release=draft)
        self.assertEqual(result.returncode, 0, result.stderr)
        uploads = [call for call in self.mutations(calls) if call[3].startswith("https://uploads.github.com/")]
        self.assertEqual(len(uploads), 7)
        for name in retained:
            self.assertEqual(published["assetProofs"][name], release["assetProofs"][name])

    def test_matching_published_release_is_read_only_after_uncertain_response(self):
        first, release, _ = self.run_publish(extra_env={"FAKE_GH_PUBLISH_UNCERTAIN": "1"})
        self.assertNotEqual(first.returncode, 0)
        self.assertTrue(release["immutable"])
        second, after, calls = self.run_publish(release=release)
        self.assertEqual(second.returncode, 0, second.stderr)
        self.assertEqual(after, release)
        self.assertFalse(self.mutations(calls))

    def test_conflicting_existing_asset_is_preserved_without_mutation(self):
        first, release, _ = self.run_publish()
        self.assertEqual(first.returncode, 0, first.stderr)
        release["isDraft"] = True
        release["immutable"] = False
        release["assetProofs"][release["assets"][0]]["digest"] = "sha256:" + "0" * 64
        result, after, calls = self.run_publish(release=release)
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(after, release)
        self.assertFalse(self.mutations(calls))

    def test_download_digest_mismatch_keeps_the_release_draft(self):
        result, release, calls = self.run_publish(extra_env={"FAKE_GH_BAD_DOWNLOAD": "1"})
        self.assertNotEqual(result.returncode, 0)
        self.assertTrue(release["isDraft"])
        self.assertFalse(any(call[0] == "fixture-patch" and call[1].get("draft") is False for call in calls))

    def test_release_inventory_has_a_finite_page_bound(self):
        result, release, calls = self.run_publish(extra_env={"FAKE_GH_FULL_PAGES": "1"})
        self.assertNotEqual(result.returncode, 0)
        self.assertIsNone(release)
        self.assertEqual(sum(call[0] == "api" and "/releases?" in call[3] for call in calls), 10)
        self.assertFalse(self.mutations(calls))


if __name__ == "__main__":
    unittest.main()
