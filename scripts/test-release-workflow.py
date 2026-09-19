#!/usr/bin/env python3
"""Offline qualification of the release workflow's actual source admission step."""
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import tempfile
import textwrap
import unittest

ROOT = Path(__file__).resolve().parent.parent
WORKFLOW = (ROOT / ".github/workflows/release.yml").read_text()
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

    def admit(self, tag="v0.2.0-vm.3", *, checkout=None, event=None, ci=None, success=True):
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
                **self.environment, "RELEASE_TAG": tag, "RELEASE_SHA": event,
                "GH_TOKEN": "offline-fixture", "GH_REPO": "fixture/release",
                "EXPECTED_CI_SHA": checkout, "CI_RESPONSE": json.dumps(runs if ci is None else ci),
            }, capture_output=True, text=True, timeout=10)
            self.assertEqual(result.returncode == 0, success, result.stderr)
            self.assertEqual(self.git("rev-parse", "HEAD", cwd=tree), checkout)
            self.assertEqual((tree / "identity").read_bytes(), identity)
            return (tree / "ci-called").exists()

    def test_default_checkouts_are_not_selected_by_inputs_or_job_outputs(self):
        checkouts = re.findall(r"(?m)^      - uses: actions/checkout@v4\n((?:[ ]{8,}[^\n]*\n)*)", WORKFLOW)
        self.assertEqual(len(checkouts), 2)
        for checkout in checkouts:
            self.assertNotRegex(checkout, r"(?m)^\s+ref:")
            self.assertIn("persist-credentials: false", checkout)
        self.assertNotIn("needs.qualify.outputs", WORKFLOW)
        bindings = re.findall(r"(?m)^\s+RELEASE_SHA: (.*)$", WORKFLOW)
        self.assertEqual(bindings, ["${{ github.sha }}"] * 4)

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


if __name__ == "__main__":
    unittest.main()
