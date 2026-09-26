# Local mailbox admission and retained delivery

Both runtimes use the existing `algal.mailbox.v1`, capability, message and
delivery records. Mailboxes retain immutable message claims and move pending
delivery markers into `consumed` when receiving. This local filesystem service
is not an OS isolation boundary or a distributed message broker.

## Creation custody

All mailbox creation uses a shared host lease at `STORE/.mailbox-admission/`.
The directory is outside `STORE/mailboxes/`, so its retained custody evidence
is never enumerated as a mailbox. Its owner label is `mailbox-admission`.
It uses the same [SQLite custody ABI](process-journal.md#admission-and-custody) as
process dispatch: retained `.owner.sqlite`, a SQLite `BEGIN IMMEDIATE`
transaction, and a versioned `algal.process-owner.v2` `.lock` marker.
The name of that shared host marker contract does not create an application
process or a process dispatch intent.

The creator holds custody while checking an existing configuration, counting
admitted mailboxes, generating capability records, and publishing a new
configuration. At most 1,024 mailbox configurations may be admitted. Existing
mailboxes succeed only when both requested bounds exactly match the stored
`maxMessages` and `maxMessageBytes`, including an immutable-publication race.
A capacity rejection publishes no new mailbox directory or capability record.

Contention returns `IO_FAILED` immediately. It does not wait or silently retry.
Normal release removes the marker while retaining the database inode; process
death releases the SQLite transaction. A subsequent owner archives a matching
abandoned marker only after acquiring SQLite custody. Unknown legacy markers
remain blocked. Creation custody never acquires the ordinary per-mailbox
send/receive lock, so there is no nested mailbox lock acquisition.

All writers sharing a store must implement this admission ABI. Older versions
that create mailboxes without the admission lease must not run concurrently
with these writers. This change does not automatically reconcile interrupted
mailbox sends or receives or remove their legacy fail-closed locks.

## Receive bounds

Before moving a pending marker, the receiver verifies the message claim,
delivery digest, mailbox identity, idempotency filename and canonical UTF-8
payload byte count. A payload larger than the mailbox's admitted
`maxMessageBytes` returns `BUDGET_EXHAUSTED`, even if its digest is internally
consistent. The claim and pending marker remain unchanged, and no consumed
marker is written. An exact-limit payload is accepted. Integrity hashes do
not substitute for the admitted byte limit.

Host-state JSON reads in both runtimes reject final symlinks and open with
nonblocking descriptor admission before checking regular-file type and size.
The artifact ceiling is 67,108,864 bytes; existing smaller payload and
configuration limits still apply. A FIFO cannot hold a mailbox operation
waiting for a writer, and rejection does not consume a pending delivery.

## IndexedDB drivers

Browser hosts run the same wire records through the `mailbox-idb.ts` and
`host-events-idb.ts` drivers. Rows are canonical-JSON envelopes carrying a
content digest, keyed so messages, pending and consumed delivery markers,
capability records, event admissions, and delivery markers all resolve by
digest. Every atomic transition commits inside one readwrite transaction that
requests the strict durability hint and fails closed when the engine cannot
report it; IndexedDB serializes readwrite transactions across connections and
tabs, which replaces the file driver's admission lease and per-mailbox locks.
A crashed tab's in-flight write simply never commits.

The drivers keep this document's observable contract exactly: the same
record contracts and digests, idempotent `send` by idempotency key,
immutable-conflict `DIGEST_MISMATCH`, pending-marker delivery dedupe,
consumed-marker evidence, capability admission checks, mailbox and event
bounds, `EFFECT_SUSPENDED` on an empty receive, and host-event intent before
acknowledgement with replay on retry. Quota errors surface as
`BUDGET_EXHAUSTED`; other engine failures surface as `IO_FAILED` with
retained data left untouched. Browser eviction, user-cleared site data, and
device loss still require the host to keep independent export or replay
evidence.
