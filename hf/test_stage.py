"""Offline export-boundary regressions, using synthetic files only."""
import hashlib
import json
from pathlib import Path
import tempfile
import unittest

from stage import validate


class ExportBoundary(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        (self.root / 'hf').mkdir()
        (self.root / 'docs').mkdir(parents=True)
        (self.root / 'hf/README.md').write_text('# Synthetic test card\n')
        self.source = self.root / 'docs/coding-harness-pilot-evidence.json'
        self.source.write_text('{"synthetic":true}\n')
        self.manifest = {
            'schema': 'hraness-hf-export-v1', 'repo_type': 'dataset',
            'repo_id': 'hranesscom/algal-experiments',
            'files': [{'source': 'docs/coding-harness-pilot-evidence.json',
                       'destination': 'studies/coding-harness-pilot-2026-09-20/results.json',
                       'sha256': hashlib.sha256(self.source.read_bytes()).hexdigest()}],
        }

    def write_manifest(self):
        (self.root / 'hf/manifest.json').write_text(json.dumps(self.manifest))

    def test_preserves_exact_bytes(self):
        self.write_manifest()
        _, checked, _ = validate(self.root)
        self.assertEqual(checked, [('studies/coding-harness-pilot-2026-09-20/results.json', self.source.read_bytes())])

    def test_rejects_changed_artifact(self):
        self.write_manifest()
        self.source.write_text('{"changed":true}')
        with self.assertRaises(ValueError):
            validate(self.root)

    def test_rejects_traversal_and_unknown_source(self):
        for source in ['site/data/../../private.json', 'private.json']:
            with self.subTest(source=source):
                self.manifest['files'][0]['source'] = source
                self.manifest['files'][0]['destination'] = 'data/' + source
                self.write_manifest()
                with self.assertRaises(ValueError):
                    validate(self.root)

    def test_rejects_symlink(self):
        self.source.unlink()
        self.source.symlink_to(self.root / 'hf/README.md')
        self.write_manifest()
        with self.assertRaises(ValueError):
            validate(self.root)

    def test_rejects_wrong_path_and_unknown_fields(self):
        self.manifest['files'][0]['destination'] = '../escape'
        self.write_manifest()
        with self.assertRaises(ValueError):
            validate(self.root)
        self.manifest['unknown'] = True
        self.write_manifest()
        with self.assertRaises(ValueError):
            validate(self.root)

    def test_rejects_duplicate_and_wrong_destination(self):
        self.manifest['files'] *= 2
        self.write_manifest()
        with self.assertRaises(ValueError):
            validate(self.root)
        self.manifest['files'] = self.manifest['files'][:1]
        self.manifest['repo_id'] = 'other/dataset'
        self.write_manifest()
        with self.assertRaises(ValueError):
            validate(self.root)


if __name__ == '__main__':
    unittest.main()
