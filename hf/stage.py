#!/usr/bin/env python3
"""Validate and stage an explicit public artifact allowlist; never contacts the Hub."""
import argparse
import hashlib
import json
from pathlib import Path, PurePosixPath
import subprocess


REPO_ID = "hranesscom/algal-experiments"
SOURCE_DESTINATIONS = {
    "docs/coding-harness-pilot-evidence.json": "studies/coding-harness-pilot-2026-09-20/results.json",
    "docs/application-research-results-2026-09-23.json": "studies/application-research-2026-09-23/results.json",
    "LICENSE": "LICENSE",
}

def digest(data):
    return hashlib.sha256(data).hexdigest()


def checked_path(root, name):
    path = PurePosixPath(name)
    if not name or path.is_absolute() or any(x in ('.', '..') for x in name.split('/')) or '\\' in name:
        raise ValueError('unsafe relative path')
    target = root.joinpath(*path.parts)
    if any(root.joinpath(*path.parts[:n]).is_symlink() for n in range(1, len(path.parts) + 1)):
        raise ValueError('symlinks are not exportable')
    if not target.is_file() or not target.resolve().is_relative_to(root.resolve()):
        raise ValueError('missing or escaped artifact')
    return target


def validate(root):
    manifest = json.loads((root / 'hf/manifest.json').read_text())
    if not isinstance(manifest, dict) or set(manifest) - {'schema', 'repo_id', 'repo_type', 'license', 'source_repository', 'scope', 'files', 'rights_status'}:
        raise ValueError('unknown manifest fields')
    if manifest['schema'] != 'hraness-hf-export-v1' or manifest['repo_type'] != 'dataset':
        raise ValueError('unsupported manifest')
    if manifest['repo_id'] != REPO_ID:
        raise ValueError('wrong Hub destination')
    rows = manifest['files']
    if not isinstance(rows, list) or not 1 <= len(rows) <= 1000:
        raise ValueError('empty export')
    outputs = {'README.md', 'export-manifest.json'}
    sources = set()
    checked = []
    for row in rows:
        if not isinstance(row, dict) or set(row) != {'source', 'destination', 'sha256'}:
            raise ValueError('unknown artifact fields')
        if not all(isinstance(value, str) for value in row.values()):
            raise ValueError('artifact values must be strings')
        source, destination = row['source'], row['destination']
        if source not in SOURCE_DESTINATIONS or source in sources:
            raise ValueError('source outside public allowlist or duplicated')
        if destination != SOURCE_DESTINATIONS[source]:
            raise ValueError('destination must preserve the public artifact path')
        if destination in outputs:
            raise ValueError('duplicate destination')
        outputs.add(destination)
        sources.add(source)
        artifact = checked_path(root, source)
        if artifact.stat().st_size > 20_000_000:
            raise ValueError('public summary exceeds byte limit')
        data = artifact.read_bytes()
        if digest(data) != row['sha256']:
            raise ValueError('artifact checksum changed: ' + source)
        if source.endswith('.json'):
            json.loads(data)
        elif source != 'LICENSE' and not source.endswith('.md'):
            raise ValueError('only reviewed public JSON and Markdown are supported')
        checked.append((destination, data))
    card = checked_path(root, 'hf/README.md').read_bytes()
    return manifest, checked, card


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, help='new, nonexistent staging directory outside the repository')
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[1]
    manifest, checked, card = validate(root)
    if args.output:
        output = args.output.absolute()
        if output.resolve().is_relative_to(root) or output.exists() or output.is_symlink():
            raise ValueError('output must be new and outside the repository')
        # Stage only a committed, reproducible source tree. Review before committing.
        status = subprocess.check_output(['git', 'status', '--porcelain', '--untracked-files=all'], cwd=root)
        if status:
            raise ValueError('commit reviewed changes before staging')
        commit = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=root, text=True).strip()
        export = dict(manifest, source_commit=commit, card_sha256=digest(card))
        output.mkdir(parents=True, exist_ok=False)
        for name, data in [('README.md', card), *checked]:
            target = output / name
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(data)
        (output / 'export-manifest.json').write_text(json.dumps(export, indent=2, sort_keys=True) + '\n')
    print(json.dumps({'repo_id': manifest['repo_id'], 'artifacts': len(checked), 'status': 'staged' if args.output else 'valid', 'publication': 'requires separate authorization and rights review'}))


if __name__ == '__main__':
    main()
