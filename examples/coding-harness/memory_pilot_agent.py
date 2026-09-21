"""Host-only authored-fixture setup, followed by the existing Harbor boundary."""
from __future__ import annotations

import base64
import hashlib
import json
from pathlib import Path
import shlex
import time
from typing import Any

from harbor_adapter import AlgalHarborAgent, execute_terminal

ROOT = "/app/memory-lab"
SETUP = r'''
import base64, hashlib, json, os, pathlib, sys
assert os.getcwd() == '/app', 'fixture image must start in /app'
fixture=json.loads(base64.b64decode(sys.argv[1]))
root=pathlib.Path('/app/memory-lab')
root.mkdir(parents=True,exist_ok=True)
for name,text in fixture['files'].items():
    path=root/name
    path.parent.mkdir(parents=True,exist_ok=True)
    path.write_text(text,encoding='utf-8')
checker=pathlib.Path('/usr/local/bin/memory-check')
if checker.exists() or checker.is_symlink(): checker.unlink()
if fixture['checker']:
    checker.write_text('#!/bin/sh\nexec python3 /app/memory-lab/visible_test.py\n')
    checker.chmod(0o755)
actual={name:hashlib.sha256((root/name).read_bytes()).hexdigest() for name in fixture['files']}
print(json.dumps({'files':actual,'checker':checker.exists()},sort_keys=True))
'''


def parse_fixture(path: Path, expected_digest: str) -> dict[str, Any]:
    data = path.read_bytes()
    if len(data) > 65536 or hashlib.sha256(data).hexdigest() != expected_digest:
        raise ValueError("Authored fixture identity or bound failed")
    fixture = json.loads(data)
    if not isinstance(fixture, dict) or set(fixture) != {"files", "checker"} or type(fixture["checker"]) is not bool:
        raise ValueError("Invalid authored fixture")
    files = fixture["files"]
    if not isinstance(files, dict) or not 1 <= len(files) <= 16:
        raise ValueError("Invalid fixture file set")
    for name, value in files.items():
        if (not isinstance(name, str) or name.startswith("/") or ".." in Path(name).parts or
                not isinstance(value, str) or len(value.encode()) > 16384):
            raise ValueError("Invalid fixture file")
    return fixture


class MemoryPilotAgent(AlgalHarborAgent):
    def __init__(self, *args: Any, fixture_path: str, fixture_sha256: str, **kwargs: Any) -> None:
        self.fixture_path = Path(fixture_path)
        self.fixture_sha256 = fixture_sha256
        self.fixture_setup: dict[str, Any] = {}
        super().__init__(*args, **kwargs)

    async def setup(self, environment: Any) -> None:
        fixture = parse_fixture(self.fixture_path, self.fixture_sha256)
        encoded = base64.b64encode(json.dumps(fixture, separators=(",", ":")).encode()).decode()
        started = time.monotonic()
        result = await execute_terminal(environment, 0, {
            "command": "python3 -c " + shlex.quote(SETUP) + " " + shlex.quote(encoded),
            "maxOutputBytes": 8192, "timeoutMs": 30000,
        })
        output = result["result"]
        if output["exitCode"] != 0 or result.get("timedOut") or result.get("interrupted"):
            raise RuntimeError("Authored fixture setup failed")
        expected = {"files": {name: hashlib.sha256(value.encode()).hexdigest() for name, value in fixture["files"].items()}, "checker": fixture["checker"]}
        if json.loads(output["stdout"]) != expected:
            raise RuntimeError("Authored fixture setup did not reproduce expected files")
        self.fixture_setup = {"fixtureSha256": self.fixture_sha256, "durationMs": round((time.monotonic()-started)*1000), "verified": True}

    async def run(self, instruction: str, environment: Any, context: Any) -> None:
        context.metadata = {**(context.metadata or {}), "memory_fixture_setup": self.fixture_setup}
        await super().run(instruction, environment, context)
