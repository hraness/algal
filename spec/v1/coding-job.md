# Foreground coding jobs

This document specifies the unchanged v1 xcb host contract. The additive
[v2 operation-job contract](coding-job-v2.md) applies only to explicitly admitted
operation adapters; it cannot migrate or reconcile an existing v1 job.

`CodingJobService` is a Bun host service, separate from the portable process
journal. It admits one foreground xcb invocation against one exact clean Git
workspace. Preparing, running, and observing a job are distinct operations. A
coding job does not provide OS confinement; provider permissions, account custody,
and confinement remain the host's and xcb's responsibility.

## Immutable admission

`prepare` requires an absolute repository-root workspace, the expected full Git
HEAD, a host-selected absolute xcb executable, and a bounded prompt. It records
canonical workspace path, device/inode identity, Git directory, source tree,
`sourceRawDigest` of raw tracked contents and permission modes,
optional exact PR source evidence, account/model selection, and limits under
`coding-jobs/JOB_HEX/intent.json`. `jobId` is the canonical SHA-256 digest of that
`algal.coding-job.v1` intent. A repeated identical preparation reuses its identity;
a dirty workspace is never overwritten to make preparation succeed. The state
store must be outside the workspace and the workspace outside the store.

The optional source binds repository, pull number, head/base/test-merge SHAs,
base branch, and evidence CAS reference. Its head must equal `expectedHead`.
Source evidence is supplied by the trusted host, not independently authenticated
by this service. The executable path and routing configuration are admitted
configuration, not a claim that executable bytes or provider behavior are trusted.

Bounds are 256 retained jobs per store, 65,536 prompt bytes, 1,000–600,000 runtime
milliseconds, 1,024–1,048,576 output and patch bytes, and 1–64 changed files. The
Git index scan permits at most 16,384 tracked entries / 1 MiB. Raw tracked
content hashing streams at most 128 MiB per capture. Hidden or unmerged
index entries fail admission. Host metadata has explicit file-size limits;
stdout and stderr are drained concurrently with stdin delivery and process exit.
Diagnostics are bounded at 65,536 bytes and withheld from the result.

## One launch, explicit uncertainty

`run(jobId)` takes an OS-released host lease for the job and its workspace,
rechecks the clean admitted workspace and its raw fingerprint, and publishes and
syncs a durable `algal.coding-workspace-claim.v1` containing the canonical workspace
and job ID at `coding-workspaces/WORKSPACE_DIGEST/claim.json`. It then publishes and
syncs:

```json
{"contract":"algal.coding-job-started.v1","jobId":"sha256:…"}
```

Only then may it invoke exactly one `xcb --json --cwd ABS run` with optional
host-selected `--account` and `--model`, passing the prompt on stdin. This is a
foreground worker: there is no detached daemon or claim that a background
process survives logout. Concurrent ownership fails rather than creating another
launcher. The durable workspace claim survives lease release and owner death.
An unresolved claim blocks other job preparation, launches and repair validation.
Only a validated settled terminal result allows a later job to replace the claim;
unknown claims are never automatically cleared. The same prepared job may finish
the claim-before-launch-marker publication gap. A later invocation with an
existing launch marker only observes state.
The marker is never cleared, including when a launch failed before obtaining any
provider response. Therefore a crash in the publication-to-launch gap can forgo
work; it cannot silently duplicate work.

`inspect` reports `prepared`, `uncertain`, `completed`, or `failed`. A launch
marker without a validated terminal record is `uncertain`, even while the owner
is live. It does not infer liveness from PID, age, silence, or lease availability.
Timeout, cancellation, malformed output, lost acknowledgement, unjoined provider
work, or unavailable patch evidence also retain uncertainty. Cancellation before
launch makes no launch marker. Killing and joining the immediate subprocess does
not prove remote work or all provider descendants stopped.

A successful xcb envelope must have version 1, a bounded session ID, `idle` state,
zero process exit, `completed` terminal, joined work, no pending attention or
failure, and effects `none` or `settled`. Explicit settled unsuccessful outcomes
are `failed`. The full validated envelope is stored in the content-addressed
store; the terminal record binds that reference and session to the job.
No automatic retry, title search, session-list lookup, or `xcb recover` mutation
is used to manufacture a lost result. The installed xcb CLI exposes no caller-keyed
idempotent launch or durable result lookup contract. New work requires a new
host-admitted intent after separate reconciliation; the old job remains retained.

## Patch evidence and validation

After a settled response, the host requires unchanged workspace identity,
repository identity, HEAD, and source tree. It captures a bounded binary,
full-index Git diff against the admitted HEAD, plus nonignored untracked regular
files as base64 content with executable modes. Changed symlinks, submodules,
unsafe paths, oversized output, and excessive file counts fail closed. Two
matching captures are required. The `algal.coding-patch.v1` artifact binds the
source commit/tree, source raw fingerprint, resulting `workspaceRawDigest`, status
digest, file count, and complete retained Git patch. The raw fingerprint covers
all tracked files, including files absent from Git diff, so clean filters, EOL
normalization, and ignored file-mode configuration cannot hide raw tracked drift.
Tracked symlink targets are hashed without following them; tracked submodules and
special files are refused. This hash is an integrity binding, not a raw filesystem
snapshot export.
It explicitly records that ignored files are excluded. This is a Git change
proposal, not a filesystem snapshot or sandbox attestation.

The service never stages, commits, resets, checks out, creates worktrees, deletes
workspace files, pushes, or publishes. Agent-written files remain for inspection
on failure. `completed` means a settled coding invocation and retained patch;
it does not mean tests passed, the repair is correct, or publication was approved.
Host validation can use `verifyWorkspace(jobId)` before and after each bounded
validation command. That operation compares a fresh full capture to the retained
patch digest and fails on drift. It cannot exclude independent concurrent writers;
the embedding host must provide exclusive workspace custody during validation.

## VM observation

`tools(jobId)` binds `coding.job.observe.v1` to one host-admitted job. The tool
has no inputs and is read-only. It returns a bounded canonical `observation`
containing job identity, expected source head, status and artifact references,
plus text `done` (`done` for completed/failed, `continue` otherwise). The prompt,
account data, diagnostics, and host clocks are not inserted into observations.
The configuration digest binds the tool, state root and job ID.

Inspection and VM observation read retained files and CAS values only; they never
invoke xcb, Git, or validation commands. The embedding workflow may suspend while
prepared/uncertain and resume after a later foreground worker has produced a
terminal result. Uncertainty has no automatic reconciliation transition in this
contract. Existing VM journal rules remain unchanged.
