# algal.process.v1

The local durable supervisor contract shared by the TypeScript and Rust CLIs.
It wraps an `algal.organism.v1` execution in a named, generation-bounded process.
This is a filesystem ABI and lifecycle contract, not OS isolation or a
network-distributed execution protocol. The [VM guide](../../docs/vm.md)
contains a runnable example and qualification limits.

## Records and storage

A process record has exactly these required fields:

```json
{
  "contract": "algal.process.v1",
  "name": "review",
  "manifestDigest": "sha256:<64 lowercase hex digits>",
  "args": {"input-cell": {"port": "value"}},
  "maxGenerations": 4,
  "generation": 0,
  "status": "ready",
  "wake": []
}
```

The only optional fields are `previous` (process-record digest), `receipt`
(receipt-storage digest), and `cause` (`"start"`, `"manual"`, or a capability
handle). Unknown fields are rejected; absent optional fields are omitted,
not encoded as null. `name` is 1–64 characters matching
`^[a-z][a-z0-9-]*$`. Argument keys name declared input cells and their ports;
creation checks supplied values against those ports. The immutable process
definition is `(name, manifestDigest, args, maxGenerations)`.

A record's storage identity is the SHA-256 digest of its canonical JSON. The
store places it at `values/<digest without sha256:>.json`. `previous` links
each later record to its immediate predecessor, including dispatch intents.
The latest record is referenced by `processes/<name>/head.json`, containing
exactly:

```json
{
  "contract": "algal.process-head.v1",
  "name": "review",
  "record": "sha256:<64 lowercase hex digits>"
}
```

The head name and record name must match the requested process name. Root
manifests live in `manifests/`; referenced child manifests use the same store.
`receipt` addresses the full receipt JSON at `runs/<digest without sha256:>.json`.
Its storage digest includes the intrinsic receipt `digest` field, so the
storage reference and intrinsic execution digest are distinct identities.

Process names have lifetime uniqueness within a retained store. Creation
fails when the name's directory already exists, even after completion or an
interrupted initial creation. There is no reset, replacement, or delete
command in this contract. Retaining a process name also retains its effect
idempotency namespace.

## Bounds

| Item | Maximum |
| --- | ---: |
| Named processes per store | 1,024 |
| Generations per process | 64 |
| Scheduler ticks per invocation | 1,024 |
| Wake capabilities per record/effect | 16 |
| Canonical argument bytes | 250,000 |
| Canonical process-record bytes | 512,000 |
| Canonical root manifest bytes | 1,048,576 |
| Canonical receipt bytes | 16,000,000 |
| Head file bytes | 4,096 |
| JSON traversal depth | 64 |
| JSON traversal nodes | 100,000 |
| Record-chain length, including intents and origin | 129 |

`maxGenerations` is in 1–64 (CLI default 16), and `generation` is in
0–`maxGenerations`. Each dispatch attempt consumes one generation; successful
completion does not consume a second one. The scheduler's `maxTicks` is in
1–1,024 (default 16). Underlying graph, port, expression, and mailbox bounds
also apply. These per-object/count limits do not establish a store-wide disk
quota or a retention policy.

## State machine

| State | Required invariants and permitted next action |
| --- | --- |
| `ready` | Generation zero; no `previous`, `receipt`, or `cause`; empty wake list. May dispatch. |
| `uncertain` | Persisted dispatch intent. Generation increments by one from `ready` or `suspended`; carries the prior receipt and wake list. Cannot redispatch through tick/schedule. An admitted journal allows explicit exact-intent recovery. |
| `suspended` | Completed generation receipt has outcome `suspended`. May dispatch while budget remains. Wake list may be empty. |
| `complete`, `failed`, `stuck` | Terminal receipt with the matching outcome; empty wake list. Cannot redispatch. |

Every noninitial record has `previous` and `cause`. Every outcome record
(`suspended`, `complete`, `failed`, `stuck`) has `receipt`. The record following
an intent keeps its generation, immutable definition, and cause; it links to
that intent, binds its receipt to the same manifest/arguments, and copies the
receipt's outcome and wake evidence.

The first dispatch cause is `start`. Explicit suspended `tick` uses `manual`.
Automatic resume names a capability from the preceding wake list and checks
that its mailbox currently has a pending message. Wake lists are sorted,
unique handles derived from `EFFECT_SUSPENDED` effects. The scheduler currently
recognizes pending `mailbox-receive` capabilities; it is not a timer or a
provider-status poller.

`schedule` visits process names in sorted order, at most once each, until its
tick budget is spent. It dispatches `ready` processes and wake-ready suspended
processes. Uncertain and terminal records are skipped. Waiting without a ready
message leaves the record unchanged and invokes no executor. Explicit `tick`
can retry a suspension without a ready message and consumes a generation.

## Continuation and tool idempotency

Before resuming, the supervisor verifies the checkpoint. Recorded completed
effects replay before live work. The new receipt must preserve the prior
receipt's non-suspended effect sequence as an exact prefix, including metadata,
and preserve every prior `committed` or `skipped` cell record. The suspended
effect itself is retried through the currently admitted host. History
validation rejects a later generation that changes this completed prefix,
even when its receipt could replay in isolation.

A process-scoped tool invocation receives this idempotency key:

```text
SHA256(canonicalJSON({
  "contract": "algal.process-effect.v1",
  "process": processName,
  "requestDigest": originalToolIdempotencyKey
}))
```

The original key is the runtime's tool-request digest. Scoping changes the
key delivered to the host tool, not the recorded request identity or graph
inputs. Different process names therefore preserve separate write identities
even for byte-identical manifests and arguments. Repeated generations of one
process retain the same identity for the same tool request. This does not add
exactly-once guarantees to arbitrary host effects; mutable tools remain
responsible for implementing the key and reconciling uncertainty.

## Publication, locking, and failure

`processes/.lock` serializes process creation and remains a fail-closed legacy
interlock. Per-process dispatch now holds an OS-released SQLite transaction on
the retained `.owner.sqlite` file plus a versioned `.lock` interlock. A new
owner archives a matching abandoned v2 marker only after acquiring the SQLite
transaction. Unknown legacy markers remain blocked. The supervisor never infers
external completion from elapsed time or automatically reissues an uncertain
effect. See the [journal and custody ABI](process-journal.md) for exact records,
bounds, publication ordering, and explicit recovery semantics.

The supervisor validates digest-addressed records before use. Its durable
publication path writes complete objects before publishing references and
syncs the affected files/directories. A head is replaced atomically only after
its referenced record exists. Symlinked supervisor paths and digest leaves
are rejected. These checks assume a trusted host filesystem; they do not
isolate concurrent malicious writers or authenticate a store owner.

Process heads and record objects are read only after the opened descriptor
passes regular-file and byte admission. On Unix, FIFOs and devices cannot
block these reads while waiting for a writer. Invalid UTF-8 and leading BOM
bytes are rejected before process interpretation; failed admission leaves
the retained path untouched.

## CLI output and offline verification

`create`, `inspect`, and `tick` return `{digest, process}`. `list` returns
`{processes:[{digest,process},...]}` in name order. `schedule` returns
`{ticks,processes:[{digest,process},...]}` containing the processes it advanced.
`verify` succeeds with `{ok:true,generations,receipts,digest}`; `receipts`
counts completed receipt generations, including repeated identical receipt
objects, while `generations` includes an outstanding uncertain dispatch.

Inspection validates the local record chain and receipt bindings. Verification
also replays every completed receipt generation using its manifest closure and
admitted function/tool signatures. It supplies no live executor or transport;
missing local evidence fails verification rather than fetching or repeating
external work. Recorded tools replay from receipts without live mutation.
A matching verification establishes internal execution consistency, not
external truth, provider attestation, approval signatures, rollback protection,
or proof that a particular external effect occurred.
