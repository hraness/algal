#!/usr/bin/env python3
"""Offline qualification of the release workflow's actual source admission step."""
import json
import hashlib
import importlib.util
import io
import os
from pathlib import Path
import re
import subprocess
import sys
import tempfile
import textwrap
import unittest
from unittest.mock import patch
import zipfile

ROOT = Path(__file__).resolve().parent.parent
WORKFLOW = (ROOT / ".github/workflows/release.yml").read_text()
SPEC = importlib.util.spec_from_file_location("artifacts", ROOT / "scripts/release-artifacts.py")
artifacts = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(artifacts)
ADMISSION = textwrap.dedent(WORKFLOW.split(
    "      - name: Require exact tag and successful main CI\n", 1,
)[1].split("        run: |\n", 1)[1].split("\n  build:\n", 1)[0])


class ReleaseSourceAdmission(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temporary = tempfile.TemporaryDirectory(prefix="algal-release-guard-")
        cls.root = Path(cls.temporary.name)
        cls.environment = {
            **os.environ, "GIT_CONFIG_NOSYSTEM": "1", "GIT_CONFIG_GLOBAL": os.devnull,
            "GIT_AUTHOR_NAME": "Release fixture", "GIT_AUTHOR_EMAIL": "fixture@example.invalid",
            "GIT_COMMITTER_NAME": "Release fixture", "GIT_COMMITTER_EMAIL": "fixture@example.invalid",
        }
        cls.source = cls.root / "source"
        cls.source.mkdir()
        cls.git("init", "-q", "-b", "main", cwd=cls.source)
        (cls.source / "identity").write_text("old qualified source\n")
        cls.git("add", "identity", cwd=cls.source)
        cls.git("commit", "-qm", "old source", cwd=cls.source)
        cls.old = cls.git("rev-parse", "HEAD", cwd=cls.source)
        cls.git("tag", "-a", "v0.1.0-vm.1", "-m", "old release", cwd=cls.source)
        (cls.source / "identity").write_text("current qualified source\n")
        cls.git("commit", "-qam", "current source", cwd=cls.source)
        cls.current = cls.git("rev-parse", "HEAD", cwd=cls.source)
        cls.git("tag", "v0.2.0-vm.3", cwd=cls.source)
        cls.git("tag", "-a", "v0.2.0-vm.4", "-m", "annotated release", cwd=cls.source)
        fakebin = cls.root / "bin"
        fakebin.mkdir()
        gh = fakebin / "gh"
        gh.write_text(f"#!{sys.executable}\n" + '''import json, os, pathlib, sys
expected = ["run", "list", "--workflow", "ci.yml", "--commit", os.environ["EXPECTED_CI_SHA"], "--branch", "main", "--event", "push", "--limit", "1", "--json", "headSha,headBranch,status,conclusion"]
if sys.argv[1:] != expected:
    raise SystemExit("unexpected API command in offline fixture")
pathlib.Path("ci-called").write_text("yes")
print(os.environ["CI_RESPONSE"])
''')
        gh.chmod(0o755)
        cls.environment["PATH"] = str(fakebin) + os.pathsep + cls.environment["PATH"]

    @classmethod
    def tearDownClass(cls):
        cls.temporary.cleanup()

    @classmethod
    def git(cls, *arguments, cwd):
        return subprocess.run(["git", *arguments], cwd=cwd, env=cls.environment,
                              check=True, capture_output=True, text=True, timeout=10).stdout.strip()

    def admit(self, tag="v0.2.0-vm.3", *, checkout=None, event=None, ci=None, workflow_ref=None, success=True):
        checkout = checkout or self.current
        event = event or checkout
        with tempfile.TemporaryDirectory(dir=self.root) as directory:
            tree = Path(directory)
            self.git("clone", "-q", "--no-local", str(self.source), str(tree / "checkout"), cwd=tree)
            tree /= "checkout"
            self.git("checkout", "-q", "--detach", checkout, cwd=tree)
            identity = (tree / "identity").read_bytes()
            runs = [{"headSha": checkout, "headBranch": "main", "status": "completed", "conclusion": "success"}]
            result = subprocess.run(["bash", "-c", ADMISSION], cwd=tree, env={
                **self.environment, "RELEASE_TAG": tag, "RELEASE_SHA": event, "WORKFLOW_REF": workflow_ref or "refs/tags/" + tag,
                "GH_TOKEN": "offline-fixture", "GH_REPO": "fixture/release",
                "EXPECTED_CI_SHA": checkout, "CI_RESPONSE": json.dumps(runs if ci is None else ci),
            }, capture_output=True, text=True, timeout=10)
            self.assertEqual(result.returncode == 0, success, result.stderr)
            self.assertEqual(self.git("rev-parse", "HEAD", cwd=tree), checkout)
            self.assertEqual((tree / "identity").read_bytes(), identity)
            return (tree / "ci-called").exists()

    def test_default_checkouts_are_not_selected_by_inputs_or_job_outputs(self):
        checkouts = re.findall(r"(?m)^      - uses: actions/checkout@[^\s]+[^\n]*\n((?:[ ]{8,}[^\n]*\n)*)", WORKFLOW)
        self.assertEqual(len(checkouts), 6)
        for checkout in checkouts:
            self.assertNotRegex(checkout, r"(?m)^\s+ref:")
            self.assertIn("persist-credentials: false", checkout)
        self.assertNotIn("needs.qualify.outputs", WORKFLOW)
        bindings = re.findall(r"(?m)^\s+RELEASE_SHA: (.*)$", WORKFLOW)
        self.assertEqual(bindings, ["${{ github.sha }}"] * 4)

    def test_matching_commit_on_main_cannot_enter_signing_environment(self):
        self.assertFalse(self.admit(workflow_ref="refs/heads/main", success=False))
        self.assertFalse(self.admit(workflow_ref="refs/tags/v0.2.0-vm.4", success=False))

    def test_signer_never_builds_or_executes_payload(self):
        job = WORKFLOW.split("\n  macos_sign:", 1)[1].split("\n  macos_package:", 1)[0]
        self.assertIn("environment: hraness-apple-release", job)
        self.assertNotIn("cargo", job)
        self.assertNotIn("package-native.py", job)
        self.assertIn("cleanup", job)
        self.assertIn("if: always()", job)
        self.assertIn("scripts/release-artifacts.py verify-metadata", job)
        self.assertIn("ARTIFACT_DIGEST", job)
        package = WORKFLOW.split("\n  macos_package:", 1)[1].split("\n  publish:", 1)[0]
        self.assertNotIn("secrets.", package)
        self.assertIn("SIGNED_BINARY_SHA256", package)

    def test_release_python_imports_do_not_dirty_the_source_checkout(self):
        # Exercise the release workflow's environment instead of ignoring caches
        # in the clean-source packaging check.
        setting = re.search(r'(?m)^  PYTHONDONTWRITEBYTECODE: "([^"\n]+)"$', WORKFLOW)
        self.assertIsNotNone(setting)
        with tempfile.TemporaryDirectory(prefix="algal-release-import-") as directory:
            root = Path(directory)
            (root / "qualification_helper.py").write_text("VALUE = 42\n")
            result = subprocess.run([sys.executable, "-c", "import qualification_helper"],
                                    cwd=root, env={**os.environ, "PYTHONDONTWRITEBYTECODE": setting[1]},
                                    capture_output=True, text=True, timeout=10)
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertEqual(sorted(path.name for path in root.iterdir()), ["qualification_helper.py"])

    def test_current_lightweight_tag(self):
        self.assertTrue(self.admit())

    def test_current_annotated_tag(self):
        self.assertTrue(self.admit("v0.2.0-vm.4"))

    def test_old_release_works_when_dispatched_at_its_own_commit(self):
        self.assertTrue(self.admit("v0.1.0-vm.1", checkout=self.old))

    def test_tag_input_cannot_replace_event_source(self):
        self.assertFalse(self.admit("v0.1.0-vm.1", success=False))

    def test_checkout_must_match_workflow_event(self):
        self.assertFalse(self.admit(event=self.old, success=False))

    def test_invalid_or_excessive_tag_is_rejected_before_git_or_ci(self):
        for tag in ["main", "--upload-pack=invalid", "v0.2.0-" + "x" * 256]:
            with self.subTest(tag=tag):
                self.assertFalse(self.admit(tag, success=False))

    def test_missing_failed_or_wrong_commit_ci_cannot_admit_source(self):
        for runs in [[], [{"headSha": self.current, "headBranch": "main", "status": "completed", "conclusion": "failure"}],
                     [{"headSha": self.old, "headBranch": "main", "status": "completed", "conclusion": "success"}],
                     [{"headSha": self.current, "headBranch": "feature", "status": "completed", "conclusion": "success"}],
                     [{"headSha": self.current, "headBranch": "main", "status": "in_progress", "conclusion": None}]]:
            with self.subTest(runs=runs):
                self.assertTrue(self.admit(ci=runs, success=False))


class ArtifactRetryTests(unittest.TestCase):
    def setUp(self):
        active = patch.dict(os.environ, {
            "GITHUB_REPOSITORY": "hraness/algal", "GITHUB_RUN_ID": "1234",
            "GITHUB_RUN_ATTEMPT": "2", "GITHUB_SHA": "a" * 40,
            "RELEASE_TAG": "v0.2.0-vm.12",
        })
        active.start()
        self.addCleanup(active.stop)

    def metadata(self, producer="algal-unsigned", attempt="1", artifact_id=42, digest="b" * 64):
        return {"id": artifact_id, "digest": "sha256:" + digest, "name": producer + "-" + attempt,
                "expired": False, "size_in_bytes": 100,
                "workflow_run": {"id": 1234, "head_sha": "a" * 40}}

    def test_prior_and_current_producers_are_accepted(self):
        for producer in ["algal-unsigned", "algal-signed", *["native-" + target for target in artifacts.TARGETS.values()]]:
            for attempt in ("1", "2"):
                with self.subTest(producer=producer, attempt=attempt):
                    artifacts.verify_metadata(self.metadata(producer, attempt), producer, "42", "b" * 64)

    def test_future_malformed_or_wrong_producers_are_rejected(self):
        for name in ("algal-unsigned-3", "algal-unsigned-0", "algal-unsigned-01", "algal-unsigned--1",
                     "algal-unsigned-2-extra", "algal-signed-1", "algal-unsigned-" + "9" * 100, None):
            value = self.metadata()
            value["name"] = name
            with self.subTest(name=name), self.assertRaises(ValueError):
                artifacts.verify_metadata(value, "algal-unsigned", "42", "b" * 64)

    def test_retry_does_not_relax_artifact_identity(self):
        changes = [
            {"id": 43}, {"id": "42"}, {"digest": "sha256:" + "c" * 64}, {"expired": True},
            {"size_in_bytes": 0}, {"size_in_bytes": artifacts.MAX_BYTES + 1}, {"size_in_bytes": True},
            {"workflow_run": {"id": 1235, "head_sha": "a" * 40}},
            {"workflow_run": {"id": 1234, "head_sha": "c" * 40}}, {"workflow_run": None},
        ]
        for change in changes:
            with self.subTest(change=change), self.assertRaises(ValueError):
                artifacts.verify_metadata({**self.metadata(), **change}, "algal-unsigned", "42", "b" * 64)

    def bundle(self, target, extra=None):
        content = io.BytesIO()
        prefix = "algal-v0.2.0-vm.12-" + target
        with zipfile.ZipFile(content, "w") as archive:
            archive.writestr(prefix + ".tar.gz", b"opaque-native-payload")
            archive.writestr(prefix + ".tar.gz.sha256", b"checksum")
            archive.writestr(prefix + ".release.json", b"{}")
            if extra:
                archive.writestr(extra, b"not-allowed")
        return content.getvalue()

    def test_mixed_attempt_matrix_downloads_exact_producer_bytes(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            fakebin = root / "bin"
            fakebin.mkdir()
            environment = {"RUNNER_TEMP": temporary, "PATH": str(fakebin) + os.pathsep + os.environ["PATH"],
                           "FIXTURE_ROOT": temporary}
            for index, (key, target) in enumerate(artifacts.TARGETS.items(), 1):
                data = self.bundle(target)
                digest = hashlib.sha256(data).hexdigest()
                environment[key + "_ARTIFACT_ID"] = str(index)
                environment[key + "_ARTIFACT_DIGEST"] = digest
                (root / f"{index}.zip").write_bytes(data)
                (root / f"{index}.json").write_text(json.dumps(self.metadata("native-" + target, str(2 if index == 2 else 1), index, digest)))
            gh = fakebin / "gh"
            gh.write_text(f"#!{sys.executable}\n" + '''import os, pathlib, re, sys
root = pathlib.Path(os.environ["FIXTURE_ROOT"])
assert sys.argv[1:4] == ["api", "--hostname", "github.com"]
match = re.fullmatch(r"repos/hraness/algal/actions/artifacts/([1-3])(/zip)?", sys.argv[4])
assert match, "Only exact producer IDs may be requested"
sys.stdout.buffer.write((root / (match[1] + (".zip" if match[2] else ".json"))).read_bytes())
''')
            gh.chmod(0o755)
            with patch.dict(os.environ, environment):
                artifacts.fetch_native(root / "artifacts")
                self.assertEqual(len(list((root / "artifacts").iterdir())), 9)
                environment["LINUX_X64_ARTIFACT_DIGEST"] = "0" * 64
                with patch.dict(os.environ, environment), self.assertRaisesRegex(ValueError, "producer identity"):
                    artifacts.fetch_native(root / "wrong-digest")

    def test_archive_digest_inventory_and_overwrite_are_enforced(self):
        target = "x86_64-unknown-linux-gnu"
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            archive = root / "input.zip"
            archive.write_bytes(self.bundle(target))
            digest = hashlib.sha256(archive.read_bytes()).hexdigest()
            with self.assertRaisesRegex(ValueError, "digest mismatch"):
                artifacts.unpack_native(archive, "0" * 64, os.environ["RELEASE_TAG"], target, root)
            artifacts.unpack_native(archive, digest, os.environ["RELEASE_TAG"], target, root)
            with self.assertRaises(FileExistsError):
                artifacts.unpack_native(archive, digest, os.environ["RELEASE_TAG"], target, root)
            archive.write_bytes(self.bundle(target, "../escape"))
            with self.assertRaisesRegex(ValueError, "inventory mismatch"):
                artifacts.unpack_native(archive, hashlib.sha256(archive.read_bytes()).hexdigest(), os.environ["RELEASE_TAG"], target, root)

    def test_download_stops_at_the_disk_byte_limit(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            fakebin = root / "bin"
            fakebin.mkdir()
            gh = fakebin / "gh"
            gh.write_text(f"#!{sys.executable}\nimport sys\nsys.stdout.buffer.write(b'x' * 1024)\n")
            gh.chmod(0o755)
            with patch.dict(os.environ, {"PATH": str(fakebin) + os.pathsep + os.environ["PATH"]}):
                with self.assertRaisesRegex(ValueError, "download failed or oversized"):
                    artifacts.download("offline-fixture", root / "download", 32)
            self.assertEqual((root / "download").stat().st_size, 32)

    def test_workflow_carries_distinct_producer_outputs_and_attempt_names(self):
        self.assertNotIn("pattern:", WORKFLOW)
        self.assertNotIn("actions/download-artifact", WORKFLOW)
        self.assertNotIn("--arg name", WORKFLOW)
        for key in ("linux_x64", "linux_arm64"):
            self.assertIn(f"{key}_artifact_id: ${{{{ steps.producer.outputs.{key}_artifact_id }}}}", WORKFLOW)
            self.assertIn(f"{key.upper()}_ARTIFACT_DIGEST: ${{{{ needs.build.outputs.{key}_artifact_digest }}}}", WORKFLOW)
        self.assertIn("MACOS_ARTIFACT_DIGEST: ${{ needs.macos_package.outputs.artifact_digest }}", WORKFLOW)
        self.assertIn("name: native-${{ matrix.target }}-${{ github.run_attempt }}", WORKFLOW)
        self.assertIn("name: native-aarch64-apple-darwin-${{ github.run_attempt }}", WORKFLOW)


if __name__ == "__main__":
    unittest.main()
