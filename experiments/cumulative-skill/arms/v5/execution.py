"""Bind every paid stage to one executor and runtime without storing secrets."""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
from urllib.parse import urlsplit


def digest(value):
    return "sha256:" + hashlib.sha256(
        json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode()
    ).hexdigest()


def bind(study, attempt, arguments, bun):
    root = Path(__file__).resolve().parents[4]
    source_files = [root / "cli.ts"] + sorted(
        p for p in (root / "src").iterdir()
        if p.is_file() and (p.suffix in {".ts", ".wasm"}) and not p.name.endswith(".test.ts")
    )
    runtime_sources = {
        str(p.relative_to(root)): hashlib.sha256(p.read_bytes()).hexdigest()
        for p in source_files
    }
    public = {}
    for flag, key in [("--base-url", "baseUrl"), ("--model", "model"), ("--credential-env", "credentialEnv")]:
        if flag in arguments:
            index = arguments.index(flag)
            if index + 1 >= len(arguments):
                raise ValueError(f"missing value for {flag}")
            public[key] = arguments[index + 1]
    if "baseUrl" in public:
        parsed = urlsplit(public["baseUrl"])
        if parsed.username or parsed.password or parsed.query or parsed.fragment:
            raise ValueError("use a credential environment variable, not credentials in the endpoint URL")
    route = {
        "contract": "algal.study-execution.v1",
        "executorArgumentsDigest": digest(arguments),
        "executor": public,
        "runtimeSourcesDigest": digest(runtime_sources),
        "bunVersion": subprocess.check_output([bun, "--version"], text=True).strip(),
    }
    study = Path(study)
    identity_path = study / "execution.json"
    encoded = json.dumps(route, sort_keys=True, indent=1) + "\n"
    try:
        # A complete file is atomically published so parallel first arms never
        # observe a partial identity. The first writer defines the comparison.
        temporary = attempt / "execution.json"
        temporary.write_text(encoded)
        os.link(temporary, identity_path)
    except FileExistsError:
        if json.loads(identity_path.read_text()) != route:
            raise ValueError("executor or runtime differs from this study's recorded execution identity")
    sources = {
        p.name: hashlib.sha256(p.read_bytes()).hexdigest()
        for p in sorted(Path(__file__).parent.iterdir())
        if p.is_file() and p.suffix in {".ts", ".json", ".sh", ".py"}
        and not p.name.endswith(".test.ts")
    }
    (attempt / "implementation.json").write_text(json.dumps({
        "sources": sources, "digest": digest(sources),
    }, sort_keys=True, indent=1) + "\n")


if __name__ == "__main__":
    bind(sys.argv[1], Path(sys.argv[2]), json.loads(sys.argv[3]), sys.argv[4])
