# v5 live study

This study compared four ways to reuse or revise a generated program on
synthetic record-triage tasks. Only corpus v4 produced a starter that passed
seed validation. Both v5-b and v5-c stopped after eight unsuccessful seed
generations, and their failures and costs are preserved.

The final programs produced these results on eight new synthetic holdouts:

| Arm | Passed |
|---|---:|
| Fixed starter | 1/8 |
| Retained catalog | 2/8 |
| Optimizer | 8/8 |
| Optimizer without format repairs | 7/8 |

The overall study verdict is **insufficient** because the comparison requires
three completed corpora. One completed corpus does not establish a general
improvement. Ground truth comes from the deterministic synthetic task generator;
there was no human grading or production dataset. All promotion records specify
shadow evaluation with zero traffic.

The whole study used 12,118,751 recorded work units and 472 charged runs/model
calls, including unsuccessful seeding, learning, and frozen evaluation. It
records 1,641,157 input tokens and 173,158 output tokens, with no missing usage
fields. These are recorded runtime measurements, not dollar costs. The total
counts the shared seed once; each arm's standalone cost includes its own copy
of that seed cost.

The recorded route is `https://api.x.ai/v1`, model `grok-4.5`, with Bun `1.3.14`.
Invocation records and content hashes do not provide provider attestation or an
independent review of model quality.

See the [experiment report](../../../../../docs/cumulative-skill-experiment.md)
for the protocol, learning results, and limits.

## Archive contents

`evidence.tar.gz` preserves the live-relative directory structure, including all
eight execution stores, the derived evidence store, exact attempt/configuration
bindings, execution and implementation fingerprints, session records, original
reports and scores, the frozen input/result, replay reports, and the final
evidence index. Original bound JSON bytes are unchanged.

The archive contains 1,157 files: 1,145 JSON files and 12 exit/session markers.
Of these, 1,070 are content-addressed objects. Its files total 26,997,323 bytes
before compression; the gzip archive is 2,440,445 bytes.

SHA-256:

```text
49287fe09064bca09b99198082745cbb21f855da070022495f454f34308c2616
```

The archive excludes derived SQLite indexes, logs, local ignore rules, and
authentication or provider account state. The reviewed file selection contains
no local home paths, populated credential fields, credential-token patterns,
private keys, or email addresses. Stored requests and outputs concern the
synthetic study. The separate Hugging Face export contains only its explicitly
listed public summaries.

Members are sorted by relative path and stored as regular files in USTAR
format, with mode `0644`, zero owner/group IDs, empty owner/group names, and
timestamp zero. Gzip uses level 9, an empty filename, and timestamp zero. Two
builds produced identical bytes, and every extracted file matched its original
SHA-256.

## Reproduce offline

Run these commands from the repository checkout containing this archive, with
Bun `1.3.14` installed. No provider credentials are needed.

```sh
(
set -eu
archive=experiments/cumulative-skill/results/v5/live/evidence.tar.gz
study_dir="$(mktemp -d "${TMPDIR:-/tmp}/algal-v5-live.XXXXXX")"
printf '%s  %s\n' \
  49287fe09064bca09b99198082745cbb21f855da070022495f454f34308c2616 \
  "$archive" | shasum -a 256 -c
tar -xzf "$archive" -C "$study_dir"

for store in \
  v4/seed v4/fixed v4/retained v4/optimizer v4/optimizer-raw v4/frozen \
  v5-b/seed v5-c/seed
do
  bun experiments/cumulative-skill/arms/v5/replay.ts "$study_dir/stores/$store"
done

bun experiments/cumulative-skill/arms/v5/evidence.ts "$study_dir" \
  --route 'openai-compatible api.x.ai/v1 grok-4.5'
)
```

Replay uses the recorded effects. The final command recomputes grades, checks
the archived native reports and frozen results, and rebuilds the evidence
index. The `--route` value preserves the original descriptive label. It does
not select an executor. The command does not start another evaluation;
`--eval-heads` is omitted. Preserve the original attempt bindings and report
JSON. Derived SQLite indexes are unnecessary for this procedure.

Offline regeneration from a fresh extraction reproduced the exact index bytes
and this content address:

```text
sha256:7f8ef20e0e5b1048c0fa8c94cd69c568ad8986c9acc5bd036db982c4cdac2e6f
```

All receipt replays passed with zero mismatches:

| Store | Receipt files checked |
|---|---:|
| v4/seed | 4 |
| v4/fixed | 44 |
| v4/retained | 44 |
| v4/optimizer | 132 |
| v4/optimizer-raw | 120 |
| v4/frozen | 35 |
| v5-b/seed | 24 |
| v5-c/seed | 18 |
| Total across stores | 421 |

These counts are distinct within each store. Copied seed receipts appear in
multiple stores, and identical charged runs can share one receipt, so the sum
is neither the number of globally unique receipts nor the 472 charged runs.
Replay establishes consistency with recorded execution; task success comes
from the separate synthetic-truth grading.

<!-- Copy record: drafted by Codex agent fix_v5_evidence; archive and README reviewed by Codex agent review_v5_evidence. -->
