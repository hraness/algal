# V9-pool comparison evidence

This archive contains the September 30, 2026 conditional-pool study. Six of
14 seed searches passed, and all 24 learning sessions recorded 40 tasks.
Five optimizer arms finished without a saved program eligible for frozen
evaluation, so the primary optimizer-versus-fixed comparison is
`insufficient`. Its only complete block, `p-14`, passed 8/8 tasks with the
optimizer and 2/8 with fixed. The preregistered line closes with this result.

The [report](../../../../../docs/cumulative-skill-v9-pool.md) explains the
missing programs and the unequal coverage and spending. The
[public JSON](../../../../../docs/cumulative-skill-v9-pool-results-2026-09-30.json)
preserves the native export byte for byte.

| Item | Value |
|---|---|
| Archive | `evidence.tar.gz` |
| Archive bytes | 16,383,473 |
| Archive SHA-256 | `01a7c385b8182589d516567ea6eae9ebd2f872888306872786ee41f564996a90` |
| Selected study files | 7,720, totaling 163,212,969 uncompressed bytes |
| Archive metadata | `archive-manifest.json` and `archive-review.json`, in addition to the study files |
| Recorded replay | 2,695 receipt files across 54 stores |
| Fresh extracted replay | Passed all 2,695 receipt files with the frozen source and Bun 1.3.14 |
| Distinct receipt digests | 2,277; 418 receipt files repeat a digest in another store |
| Source commit | `dc5fef50122060aecfee9368af2379697bf01cdf` |
| Bun | 1.3.14 |
| Freeze | `sha256:68015a597e4463b295e7c24ebf854bfb8c137fff9a64e613079887d020752c18` |
| Pool | `sha256:c39c54298ad6672ac5379000fa999dba1bacdd135168e2ff5a77b345b41ff3e9` |
| Saved heads | `sha256:393fc45220e70ef07d58269f492aec57b16dba3979ff4026faba8c3a83479bb3` |
| Selection plan SHA-256 | `a8627d547feafbbeedd61b07184fe4a4a6ebf0e5807f82bd859deca437b54075` |

The archive preserves the protocol, synthetic datasets, seed attempts,
learning and frozen results, program catalogs, failed responses, and
portable manifests, runs, and values. It excludes derived indexes, effect
caches, mutable slots, logs, credentials, and local state. All original
study files keep their bytes. The frozen protocol's pre-run status field is
part of its recorded identity.

The study recorded 2,663 charged executor attempts. Receipt-file counts
include copied seed records in every store that contains them and are a
different measure. Twelve failed effects lack usage; full token totals and
provider charges are unknown. Offline replay checks recorded execution;
the study's scorer measures task correctness.

The archive review is bound to the selected files and their hashes. Codex
`seed_closeout_map` performed an AI content and rights review using an
automated scan of every selected file, source inspection, and representative
content reading. It approved this project-owned synthetic evidence on the
existing reviewed rights basis. Redistribute it with the repository's
[MIT license](../../../../../LICENSE). Hugging Face receives the public
summary, card, manifest, and license; this raw archive stays in GitHub.

## Extract and replay

Use Bun 1.3.14, Python 3, Git, and `tar`. Start in this directory in a clone
of the repository. Create a separate source checkout at the study commit:

```sh
git worktree add --detach /tmp/algal-v9-pool-source dc5fef50122060aecfee9368af2379697bf01cdf
```

Choose another new path if that checkout already exists. Verify the archive
hash, extract it to a new directory, and verify every selected file:

```sh
python3 - <<'PY'
from hashlib import sha256
from pathlib import Path
import json
import subprocess

archive = Path("evidence.tar.gz")
expected = "01a7c385b8182589d516567ea6eae9ebd2f872888306872786ee41f564996a90"
assert sha256(archive.read_bytes()).hexdigest() == expected
output = Path("/tmp/algal-v9-pool-evidence")
output.mkdir(exist_ok=False)
subprocess.run(["tar", "-xzf", str(archive), "-C", str(output)], check=True)
manifest = json.loads((output / "archive-manifest.json").read_bytes())
for entry in manifest["plan"]["files"]:
    data = (output / entry["path"]).read_bytes()
    assert len(data) == entry["bytes"], entry["path"]
    assert sha256(data).hexdigest() == entry["sha256"], entry["path"]
print("Verified", len(manifest["plan"]["files"]), "study files")
PY
```

Choose another new extraction path if needed, and use it in the replay
command. The replayer checks the frozen source and datasets, recomputes the
results, and uses recorded effects without making provider calls:

```sh
bun /tmp/algal-v9-pool-source/experiments/cumulative-skill/arms/v9-pool/replay.ts /tmp/algal-v9-pool-evidence/study
```

A successful replay returns `ok: true`, `checkedReceipts: 2695`, and 54
store rows. It may recreate derived indexes in the extracted copy. Keep the
archive unchanged. The manifest records the packaging tool's SHA-256,
Python and zlib versions, and deterministic USTAR/gzip settings; those
packaging tools are not required for extraction or native replay.
