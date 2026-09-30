"""Offline GitHub fixture for the actual native publication workflow."""
import base64
import hashlib
import json
import os
from pathlib import Path
import sys
from urllib.parse import parse_qs, urlsplit

state_path = Path(os.environ["FAKE_GH_STATE"])
state = json.loads(state_path.read_text())
argv = sys.argv[1:]
with open(os.environ["FAKE_GH_LOG"], "a") as log:
    log.write(json.dumps(argv) + "\n")


def option(name, default=None):
    return argv[argv.index(name) + 1] if name in argv else default


def response(release):
    if release is None:
        sys.exit(1)
    rows = list(release.get("assetProofs", {}).values())
    if os.environ.get("FAKE_GH_BAD_ASSET") and rows:
        rows[0] = {**rows[0], "digest": "sha256:" + "0" * 64}
    return {"id": 42, "tag_name": os.environ["RELEASE_TAG"],
            "draft": release["isDraft"], "prerelease": release["isPrerelease"],
            "immutable": release.get("immutable", False), "name": release["name"],
            "body": release["body"], "assets": rows}


if argv[:3] != ["api", "--hostname", "github.com"]:
    sys.exit("unexpected gh command")
endpoint = argv[3]
method = option("--method", "GET")
release = state.get("release")
uncertain = False
if "/git/ref/tags/" in endpoint or "/git/tags/" in endpoint:
    result = {"sha": os.environ["RELEASE_SHA"], "type": "commit"}
elif "/releases/tags/" in endpoint:
    sys.exit("draft lookup by tag returned404")
elif "/releases?" in endpoint:
    if os.environ.get("FAKE_GH_FULL_PAGES"):
        result = [{"id": index + 1000, "tag_name": f"v0.0.0-vm.{index+1}"} for index in range(100)]
    else:
        result = [response(release)] if release is not None else []
elif "/releases/assets/" in endpoint:
    identity = int(endpoint.rsplit("/", 1)[1])
    row = next(row for row in release["assetProofs"].values() if row["id"] == identity)
    data = base64.b64decode(release["payloads"][row["name"]])
    sys.stdout.buffer.write(b"wrong" if os.environ.get("FAKE_GH_BAD_DOWNLOAD") else data)
    sys.exit(0)
elif endpoint.startswith("https://uploads.github.com/"):
    if release is None or not release["isDraft"] or release.get("immutable"):
        sys.exit("upload requires a draft")
    name = parse_qs(urlsplit(endpoint).query)["name"][0]
    if name in release["assets"]:
        sys.exit("asset exists")
    data = Path(option("--input")).read_bytes()
    identity = release.get("nextAssetId", 100)
    release["nextAssetId"] = identity + 1
    proof = {"id": identity, "name": name, "size": len(data), "state": "uploaded",
             "digest": "sha256:" + hashlib.sha256(data).hexdigest()}
    release.setdefault("assetProofs", {})[name] = proof
    release.setdefault("payloads", {})[name] = base64.b64encode(data).decode()
    release["assets"].append(name)
    result = proof
elif endpoint.endswith("/releases") and method == "POST":
    if release is not None:
        sys.exit("release exists")
    payload = json.loads(Path(option("--input")).read_text())
    release = {"isDraft": payload["draft"], "isPrerelease": payload["prerelease"],
               "immutable": False, "assets": [], "name": payload["name"], "body": payload["body"]}
    if os.environ.get("FAKE_GH_MANGLE"):
        release["body"] = release["body"].replace("64 KiB", "65 KiB")
    result = response(release)
elif endpoint.endswith("/releases/42"):
    if method == "PATCH":
        if release.get("immutable"):
            sys.exit("published release is immutable")
        payload = json.loads(Path(option("--input")).read_text())
        for name in ("name", "body"):
            if name in payload:
                release[name] = payload[name]
        if os.environ.get("FAKE_GH_MANGLE"):
            release["body"] = release["body"].replace("64 KiB", "65 KiB")
        if payload.get("draft") is False:
            release["isDraft"] = False
            release["isPrerelease"] = payload["prerelease"]
            release["immutable"] = True
            uncertain = bool(os.environ.get("FAKE_GH_PUBLISH_UNCERTAIN"))
        # The log retains the actual payload because the temporary input file expires.
        with open(os.environ["FAKE_GH_LOG"], "a") as log:
            log.write(json.dumps(["fixture-patch", payload]) + "\n")
    result = response(release)
else:
    sys.exit("unexpected GitHub endpoint")
state["release"] = release
state_path.write_text(json.dumps(state))
if uncertain:
    sys.exit("publication response lost after server accepted it")
print(json.dumps(result))
