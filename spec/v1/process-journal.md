# Process recovery journal

The optional `algal.process-journal.v1` sidecar adds recovery within one
`algal.process.v1` dispatch. It does not change process records, ordinary run
receipts, or the rule that `tick`/`schedule` never reissue uncertain work.
Recovery is explicit and names the exact current uncertain intent digest.

## Admission and custody

`process tick NAME --journal [--max-recoveries 2]` admits a journal before
publishing dispatch intent. `schedule --journal` does the same for each new
dispatch. Recovery requires the original tools and executor configuration:

```sh
algal process inspect NAME --dir STORE
algal process journal NAME --dir STORE
algal process recover NAME --expected-intent sha256:… --tools TOOLS --dir STORE
```

The journal header is created and synced before the uncertain head becomes
visible. It lives at `processes/NAME/journals/INTENT_HEX/header.json`:

```json
{"contract":"algal.process-journal.v1","process":"NAME","intent":"sha256:…","manifestDigest":"sha256:…","maxEntries":4096,"maxRecoveries":2}
```

Recovery admits built-in pure functions and a locally available static manifest
closure. It rejects slot cells, dynamic spawn, and changed/custom function
registries before dispatch: those could otherwise change execution during
reconstruction. Tool and provider configuration identities are host assertions;
they must change when adapter semantics or configuration change. They are not
binary attestation or credential hashes. CLI tool bindings include the original
signature/exec specification and resolved working directory; scripted tools also
bind their loaded response data. Cached providers use a stable admission identity
independent of cache-hit receipt metadata. Changes to arbitrary command binaries
still require the host to version its adapter specification.

Both runtimes hold a SQLite `BEGIN IMMEDIATE` transaction on the retained file
`processes/NAME/.owner.sqlite` for the entire dispatch or recovery. The OS
releases this mutex on process death. The file is never removed to take a lease.
The schema is `algal_owner(contract TEXT PRIMARY KEY)`, containing only
`algal.process-owner.v2`; journal mode is DELETE, synchronous FULL, busy timeout
zero. Database and sidecar leaves must be regular, non-symlink files at most
65,536 bytes.

An interlock at `.lock` has exactly `{contract:"algal.process-owner.v2",
process:NAME,nonce:64_lowercase_hex}`. After acquiring the SQLite transaction,
a matching abandoned marker is archived under `owners/NONCE.json` (maximum
256) before replacement. Unknown or old lock formats require operator
reconciliation. No PID, clock age, or failed heartbeat authorizes takeover.
Process creation holds the same retained SQLite custody protocol in
`.process-creation/`, with owner name `process-creation`. While held, it also
occupies `processes/.lock` with
`{contract:"algal.process-creation-owner.v1",nonce:64_lowercase_hex}` so older
runtimes cannot bypass creation exclusion. Only after acquiring SQLite custody
may a recognized abandoned creation marker be archived under
`.process-creation/creation-owners/NONCE.json` (maximum 256) and replaced.
Legacy plaintext or unknown markers remain untouched and require operator
reconciliation. The per-process `.creating.json` marker described in
[process.md](process.md) separately proves which exact initial record may resume.

## Ordered effects

Each actual live provider or tool attempt receives an ordinal. Effects replayed
from an earlier completed generation are excluded. Identical request digests
at different ordinals remain separate attempts.

`entries/000000.json` contains
`{contract:"algal.process-effect-head.v1",record:RECORD_DIGEST}`. Its referenced
CAS record in `values/` contains:

```json
{"contract":"algal.process-effect-record.v1","intent":"sha256:…","ordinal":0,"requestDigest":"sha256:…","executor":"tool:example.v1","configurationDigest":"sha256:…","idempotencyKey":"sha256:…","recovery":"never","state":"started","attempt":0}
```

The initial record has no `previous` or `receipt`. Before calling the adapter,
the runtime durably publishes this record and its entry head. Completion adds
`previous` pointing to that started record and the full original effect
`receipt`, retaining the same attempt and binding. Recorded usage, errors,
retryability, wake capabilities, cache attribution, and configuration metadata
are preserved. A present receipt configuration digest must match its binding.

Only the final ordinal may be unsettled. All effects execute in order, and
journal failure poisons the dispatch before further live calls or publication
of an ordinary process outcome. A later completion cannot replace an earlier
completed result.

The process-scoped idempotency key is the digest of
`{contract:"algal.process-effect.v1",process:NAME,requestDigest:REQUEST_DIGEST}`.
Tools receive this key; its presence does not establish that the adapter honors
idempotency. The executor field identifies the admitted route, which can differ
from an underlying backend's receipt executor label.

## Explicit recovery

`recover` validates the process chain, previous completed receipt, journal CAS
chain, static closure, and exact intent. It records a bounded attempt at
`recoveries/000001.json`:
`{contract:"algal.process-recovery-attempt.v1",intent:INTENT,attempt:1}`.

It then reconstructs the interrupted dispatch, validating each recorded
request and configuration binding before that ordinal can execute. A binding
mismatch fails reconstruction and consumes the admitted recovery attempt.
Completed journal entries replay their full receipts without contacting their
adapters. An unsettled host-declared
read may publish a new started record with `attempt + 1` and `previous` pointing
to the earlier started record. The recovery budget is consumed before execution.
Providers and write tools use `recovery:"never"`; any unsettled such entry blocks
recovery before a new attempt is admitted. A known settled error or suspension is a
completed receipt. A dispatched adapter deadline, lost transport response, or
other explicitly uncertain completion leaves the started entry unresolved,
poisons the dispatch, and prevents fallback effects or process outcome
publication. Aborting a promise or killing the immediate subprocess does not
prove that external writes stopped. Host-only uncertainty markers are not wire
fields; nonjournal receipts record these failures as nonretryable. Deadlines
also cover compaction calls, and cancellation is rechecked after asynchronous
metadata admission immediately before dispatch.

The reconstructed execution must consume the entire recorded prefix with the
same bindings and settle every new effect. Only then may it publish the normal
outcome linked to the same intent and generation. A crash before effect intent
admits fresh suffix work; a crash after completion reuses the saved result.
An external success followed by a crash before receipt publication remains
unknown and is never guessed successful or blindly retried.

## Bounds and limits

Maximums are 4,096 entries, 1,048,576 canonical bytes per effect record,
16,777,216 cumulative reachable journal-record bytes, and 1–8 recovery attempts
(default 2). Entry and recovery filenames are contiguous six-digit ordinals.
Only recognized regular `.tmp-48_lowercase_hex` publication residue is ignored
during bounded directory enumeration; it is retained, not interpreted or deleted.
Published bytes, references, bindings, and transitions are validated on reopen.

This provides consistent replay and a conservative restart boundary on a trusted
local filesystem. It provides neither exactly-once arbitrary remote writes nor
external job reconciliation. Unknown writes need an adapter-specific completion
query or operator evidence; no generic resolution command is supplied. Receipt
verification remains offline and proves internal consistency, not external truth.
