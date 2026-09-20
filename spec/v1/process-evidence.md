# algal.process-evidence.v1

A portable, bounded snapshot of one process's immutable execution history.
An exporter captures a fixed head, validates its chain and completed receipts,
and records the source-store dependencies needed for replay. Verification uses
only this JSON document in memory. It never installs a process or host state.

## Wire format

The object has exactly these fields (digest maps are abbreviated):

```json
{
  "contract": "algal.process-evidence.v1",
  "head": "sha256:<process-record digest>",
  "records": {"sha256:<digest>": {"contract": "algal.process.v1"}},
  "receipts": {"sha256:<storage digest>": {"contract": "algal.run.v1"}},
  "program": {
    "contract": "algal.bundle.v1",
    "root": "sha256:<root manifest digest>",
    "manifests": {},
    "values": {}
  },
  "tools": {},
  "missing": {"manifests": [], "values": []}
}
```

`records` contains the head and every predecessor, including dispatch intents.
`receipts` keys hash the entire receipt JSON, including its intrinsic `digest`
field; they are not the intrinsic receipt digests. Every advertised object key
must match its canonical SHA-256 digest. Receipt intrinsic digests are also
checked. The head must exist and name `program.root` as its manifest.

`program.manifests` and `program.values` contain dependencies observed while
checking this history, including nested programs and runtime value references.
The program uses the bundle envelope, but export does not infer its closure by
scanning arbitrary digest-shaped strings. For example, a string called
`patchRef` inside a JSON tool output is not automatically a value dependency.
This document is therefore not a backup of host patch artifacts or external
provider ledgers.

`missing` records actual source lookups that returned no object, allowing a
recorded failure to replay without confusing omitted evidence with an observed
absence. Each list is sorted and unique; positive and missing entries in one
namespace cannot overlap. A read of an undeclared dependency rejects verification,
even if the runtime converts that read failure into a matching failed receipt.
Replay-generated objects live in an ephemeral overlay and are not source claims.

`tools` maps names to closed tool signatures: `inputs`, `outputs`, `effect`,
`cost`, and `maxOutputBytes`. It contains no executable, callback, credentials,
or host configuration digest. Only builtin pure functions are supported.
Replay consumes recorded tool and model effects; no live adapter is admitted.
Unused but valid bounded manifests and values may be present. The receipt map
must contain exactly the receipts referenced by the validated process chain;
unused receipts are rejected.

## Bounds and verification

| Item | Maximum |
| --- | ---: |
| Canonical document bytes | 67,108,864 |
| JSON depth / nodes | 64 / 1,000,000 |
| Process records / receipts | 129 / 64 |
| Program manifests / values | 512 / 512 |
| Missing entries per namespace | 512 |
| Tool signatures | 64 |
| Individual process record bytes | 512,000 |
| Individual receipt bytes | 16,000,000 |
| Individual manifest bytes | 1,048,576 |

The CLI also bounds the input file to the document byte limit. Structure bounds
are checked before recursive hashing; existing manifest, process, argument,
receipt, and graph limits still apply. Export enforces capture bounds and
verifies the assembled document before returning it. Concurrent process progress
does not change the captured immutable head.

Both runtimes return the same report for the same document:

```json
{
  "ok": true,
  "digest": "sha256:<head>",
  "status": "complete",
  "generations": 2,
  "receipts": 2,
  "evidenceDigest": "sha256:<entire document>"
}
```

`ok` means chain consistency and completed-generation replay succeeded. It does
not mean the process completed successfully: ready, suspended, failed, stuck,
and uncertain heads preserve their status. An uncertain head gains no authority
to retry, reconcile, or resume from successful evidence verification.

## Commands and trust boundary

```sh
algal process export review --dir .algal > review.evidence.json
algal process verify-evidence review.evidence.json
```

For custom tools, export accepts `--tools declarations.json`, with entries
`{"signature": {...}, "exec": "optional existing configuration"}`. Only the
signature is loaded; scripted response files and commands are not opened or
bound. `verify-evidence` accepts no host flags and uses no store directory.

Evidence preserves recorded inputs, outputs, and capability handle strings.
Review it before sharing; export is not redaction. Hashes prove internal
consistency, not provenance, provider truth, or who produced the record. An
attacker can construct a different consistent history with a different digest.
Use an independently trusted head or document digest when identity matters.

The format excludes mutable heads, mailboxes, delivery cursors, operation
claims, journals, leases, cache indexes, and slots. It grants no execution
custody and has no activation/import command. Copying a runnable process with
its write identities would require a separate custody-transfer protocol.
