# Coding jobs with exact operation reconciliation

`algal.coding-job.v2` extends the Bun `CodingJobService` with explicit
[operation adapters](coding-operation.md). It provides one submission followed
by optional exact read-only lookup. It does not change the portable VM journal,
the Rust kernel's effect ABI, or the [v1 xcb job contract](coding-job.md).
Existing v1 jobs cannot be migrated, adopted or reconciled through this path.

The service distinguishes external settlement, accepted patch evidence and host
validation. A completed job proves a settled successful adapter outcome with a
retained patch; it does not prove the repair correct or authorize publication.
Adapter settlement is a trusted custody assertion, not independent attestation.

## Explicit immutable admission

`prepareOperation` accepts the closed v1 preparation fields `workspace`,
`expectedHead`, `prompt`, optional `source`, and optional `limits`, replacing the
v1 adapter with the closed operation adapter configuration and requiring a
caller-retained `operationId`. It performs the same clean Git admission, canonical
path/device/inode/Git-directory capture and raw source fingerprint checks as v1.
The store and workspace must be separate directories, neither containing the
other. It never modifies the source workspace to make admission succeed.

The immutable intent contains only:

```text
contract: "algal.coding-job.v2"
workspace, expectedHead, sourceTree, sourceRawDigest, gitDirectory
workspaceIdentity: { device, inode }
prompt, adapter, limits
source?                         # same optional source evidence as v1
operation: { operationId, authorityId, requestDigest }
```

The exact source, prompt and limit schemas remain those of v1. The operation's
authority must equal `adapter.authorityId`. Construct the request payload by
removing intent `contract` and `operation`, retaining every other field, and
adding `contract: "algal.coding-job-request.v2"` and the caller's `operationId`.
The operation `requestDigest` is the canonical SHA-256 digest of this payload.
The final `jobId` is the canonical SHA-256 digest of the complete v2 intent,
including that request digest. This order avoids a circular digest.

Before publishing the job intent, admission durably reserves the authority/key
pair under:

```text
coding-operations/KEY_HEX.json
KEY = digestCanonical({ authorityId, operationId })
```

The closed reservation contains `contract:
"algal.coding-operation-admission.v1"`, `jobId`, `operationId`, `authorityId` and
`requestDigest`. The reservation is immutable; a different job or request cannot
reuse the pair within the store. Every subsequent job read verifies this
reservation against the intent. A crash after reservation but before intent
publication retains that reservation; an identical preparation can finish
publication. It cannot rebind the key to another request.

`intent.json` lives at `coding-jobs/JOB_HEX/intent.json`. Identical preparations
while the same clean admitted source remains present reuse the job identity.
Preparation still checks the current clean source, so it is not an alternative
to reading an already retained job after the worker changes files. Callers must
retain `jobId` and `operationId` and use inspection/reconciliation for that job.

Bounds remain 256 jobs and additionally 256 operation reservations per store,
65,536 prompt bytes, 1,000–600,000 runtime milliseconds, 1,024–1,048,576 output
and patch bytes, and 1–64 changed Git entries. Raw tracked captures permit at
most 16,384 tracked entries, a 1 MiB index scan and 128 MiB of contents. The
operation adapter imposes its own stricter closed schemas and proof bounds.

## Submit once, retain the claim

`run(jobId)` takes the existing job lease and workspace lease. For a prepared
job it rechecks canonical workspace identity, Git directory, HEAD, tree, raw
source digest and clean status. It checks the durable workspace claim, publishes
and syncs that claim naming this job, then publishes and syncs the unchanged
`algal.coding-job-started.v1` launch marker. Only after these steps can it call
`submit` with the admitted binding and complete payload.

An existing launch marker forbids another submission. Subsequent `run` calls
return retained inspection state. Concurrent ownership fails instead of creating
another launcher. The launch marker is never cleared, even if death occurs before
submission. Thus a publication-to-dispatch crash may forgo work; it cannot cause
a silent automatic retry.

The outer host deadline bounds both command and custom SDK transports. A timed
out SDK callback may still be running; cancellation is cooperative. Its uncertain
job retains the durable workspace claim after the OS lease releases. No timeout,
missing response, stopped direct child, old timestamp or missing lookup proves
external settlement.

The initial host result is immutable `result.json`, with contract
`algal.coding-job-result.v2`, `jobId`, status `uncertain`, `completed` or `failed`,
and optional `result` and bounded `reason`. It is published even when submission
returns accepted/unknown evidence or throws. If the host dies first, inspection
derives uncertainty from the launch marker without inventing a result record.

## Retained observations and publication order

Validated outcomes are retained in at most 16 sequential immutable files:

```text
coding-jobs/JOB_HEX/observations/0001.json
...
coding-jobs/JOB_HEX/observations/0016.json
```

Each closed observation contains:

```text
contract: "algal.coding-job-observation.v1"
jobId: digest
previousRef: previous outcome digest, or null for the first observation
outcomeRef: canonical digest of outcome
outcome: complete validated operation outcome
```

Observation files must form an uninterrupted sequence. The embedded outcome
must match its digest and job binding. Each new outcome is checked against every
prior witness for monotonic revision, unchanged acceptance binding and immutable
terminal evidence. Unknown observations cannot erase acceptance history. Identical
repeat evidence reuses its outcome reference and consumes no new observation.

The host validates the response and history and checks the 16-record capacity
before publishing a new observation. It durably reserves the entire observation
before writing its outcome to CAS. After a crash, reconciliation can reuse the
retained terminal outcome and restore the same CAS object. Malformed, stale or
conflicting evidence cannot create a new accepted history record. Capacity
exhaustion retains uncertainty and the claim; it never evicts an older witness.

Valid unknown outcomes are retained and count toward the 16 observations when
their canonical bytes differ. Transport exceptions are not fabricated as
adapter proofs. This contract has no background poller, automatic retry, rolling
history eviction, global 1 GiB store quota, CAS collector or receipt-pinning
subsystem. File/count bounds constrain this path; they are not a whole-store
retention or disk-accounting guarantee. Host operators must preserve retained
state, particularly unresolved claims and operation keys.

## External settlement and patch reservation

A nonterminal outcome produces an uncertain initial result. A valid terminal
outcome supplies external settlement independently of whether patch admission
succeeds. The host attempts the unchanged v1 bounded, stable double-capture of
the resulting workspace, preserving source identity, HEAD/tree/Git directory,
raw tracked bytes/modes and the Git patch checks.

Before publishing patch bytes to CAS, the host reserves one immutable
`settlement.json` containing:

```text
contract: "algal.coding-job-settlement.v1"
jobId: digest
outputRef: terminal outcome digest
terminal: complete algal.coding-job-result.v2 record
patch?: complete algal.coding-patch.v1 artifact
```

The record is bounded by the admitted patch limit plus 8,192 bytes. The host
reuses this exact reservation after a crash instead of capturing a different
patch following later workspace edits. Its embedded patch must match the
terminal patch reference and admitted source bindings. A reserved patch is then
published to CAS under that digest. The original observation and settlement
reservations remain retained.

The host result's closed `result` object contains `session`, `operationId`,
`exitCode`, `outputRef`, and optionally the complete group `patchRef`,
`patchDigest`, `changedFiles`. Both identity fields equal the admitted operation
ID; `session` is compatibility metadata, not a discovered provider session.
`outputRef` identifies the complete operation outcome. Exit code is derived from
the outcome: zero for completed, 130 for cancelled, and one otherwise; it is not
the operation adapter subprocess's exit status. A patch digest equals its CAS
reference. Completed status requires successful external completion and retained
patch evidence.

A settled failed/cancelled operation has failed host status. A successful external
operation whose workspace identity, source, files, bounds or patch capture are
rejected also has failed host status, with a `settled-patch-rejected` reason and
retained external settlement. Files remain untouched. A capture interruption can
therefore reject a patch without making already proven external work uncertain.
No automatic second capture changes a published settlement decision.

A later job can replace a completed/failed job's workspace claim only after the
prior result and its terminal operation evidence validate. Settled patch rejection
allows later clean-workspace admission; it does not validate the rejected patch.
No unresolved claim is deleted or treated as expired. Workspaces changed by a
worker may still require a separate explicit host decision before a new clean
admission can succeed.

## Explicit reconciliation

`reconcile(jobId)` rejects v1 jobs and unsubmitted prepared jobs before invoking
an adapter. It returns an already completed/failed snapshot without lookup. For
an uncertain v2 job it takes the job and workspace leases, requires the retained
claim naming that job, and validates all retained observations.

If the latest observation is already terminal, reconciliation reuses it without
calling the provider. Otherwise it invokes only `observe` with the admitted
binding. It never passes the task payload or calls submit, resume, cancellation,
recovery or session search. One explicit invocation makes at most one lookup;
it is not a poll loop. Missing, expired, unknown, malformed, stale, conflicting,
interrupted or capacity-exhausted evidence does not release the claim or trigger
another submission. Some failures throw to the caller; retained state remains
the authority rather than the command's process exit status.

A validated terminal observation proceeds through the patch settlement path and
publishes one immutable `resolution.json` containing the v2 host result. Its
status cannot be uncertain and it must reference the latest terminal observation.
It may resolve an absent initial result or an initial uncertain result; it cannot
replace a settled initial result. Inspection derives the effective status from
the resolution while preserving `result.json`, the launch marker, observations,
settlement reservation and existing VM receipts.

Crashes between observation reservation, CAS publication, settlement reservation,
patch CAS publication and resolution publication do not authorize resubmission.
Recovery reuses retained proofs and reserved bytes. A failure to establish the
required evidence leaves the job unresolved or rejected, never automatically
retried.

## Inspection, validation and VM behavior

`inspect`, `tools(jobId)` and the repair workflow's observation tool read retained
host files and CAS only. They invoke neither Git nor the adapter, and do not
reconcile implicitly. The four snapshot statuses and the bounded
`coding.job.observe.v1` shape remain unchanged: prepared/uncertain wait;
completed/failed provide a terminal observation.

A completed job can enter existing `RepairWorkflow` host validation.
`verifyWorkspace` compares a fresh complete patch capture to the retained digest
before and after each host-admitted command. Later edits, including raw tracked
changes hidden by Git filters or mode settings, reject validation. Exclusive
host custody is still necessary; this protocol does not constrain unrelated
writers or supply OS isolation. Failed jobs do not gain validation approval from
external settlement alone.

The VM observes the final host state in an ordinary new receipt. Reconciliation
does not rewrite a previous uncertain effect journal, execute a validator again,
change portable receipt formats, or automatically push/merge anything. Offline
VM replay establishes the integrity of its retained execution history; it does
not authenticate an adapter's custody assertion or prove a repair correct.
