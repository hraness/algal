# OwnerLease model and source correspondence

`OwnerLease.tla` models two or three callers sharing one retained owner database
inode and a separate versioned owner marker. It tracks database bootstrap and
contract admission, SQLite transaction ownership, recognized/foreign markers,
bounded archives, callback admission, cleanup, process death and explicit reopen.
Profiles and expected counterexamples are declared in `profiles.ts`.

The model establishes finite protocol checks under stated assumptions. Reviewed
source correspondence is not a proved implementation refinement, SQLite proof,
filesystem crash-consistency proof or guarantee about hostile namespace changes.

## Transition mapping

| Model actions | Source boundary |
| --- | --- |
| Open, Inspect | `src/host-state.ts:105` and `crates/algal/src/lease.rs:280`: physical directory admission, retained database open and owner-table/contract inspection. Path checks and SQL parsing are abstracted to admitted database states. |
| CreateSchema, InitializeContract, BootstrapBusy | `src/host-state.ts:120` and `crates/algal/src/lease.rs:312`: missing tables can be created and an empty compatible table initialized. Contention before custody can reject every cold starter. |
| Acquire, RejectContention, Validate | `src/host-state.ts:132` and `crates/algal/src/lease.rs:327`: zero-timeout `BEGIN IMMEDIATE`, then contract revalidation under custody. The transaction belongs to the opened inode, not a deletable marker pathname. |
| ReadMarker, AdmitMarker, RejectMarker | `src/host-state.ts:136` and `crates/algal/src/lease.rs:333`: a retained marker must have the exact current contract, process and nonce shape. Unknown/legacy data is refused and retained. |
| Archive, RejectArchive, ClearOld | `src/host-state.ts:144` and `crates/algal/src/lease.rs:349`: check the archive bound, preserve recognized prior evidence, then remove the old marker. An equal existing archive is accepted even at capacity; conflicting retained bytes reject. |
| Publish, Enter | `src/host-state.ts:150,176` and `crates/algal/src/lease.rs:367`: publish a fresh marker before returning custody or invoking the protected callback. |
| Finish, FinishError, DropMarker, DropFailure, Release, Return | `src/host-state.ts:176` and `crates/algal/src/lease.rs:379`: hold the SQLite transaction through callback/marker cleanup, then release it. Bun propagates cleanup errors. Native Drop ignores marker-unlink errors, so successful return does not establish an absent marker. |
| Crash, Reopen | An owned process death releases its live SQLite transaction but can retain marker evidence. Explicit subsequent invocation reopens the same inode and must admit that evidence again. No age/PID-based authority inference is modeled. |

`ready` means the source-admitted owner table and exactly one recognized contract
row. It does not imply that every populated database has the canonical bootstrap
column layout: the source's detailed column check applies to an empty bootstrap
table. `foreign-schema` and `foreign-contract` are already-classified rejected
states, not a complete SQL or hostile-byte admission model.

Fresh nonce tokens are distinct by assumption. Concrete random-source quality and
collisions, file byte limits, symlinks, schema-parser completeness, directory
listing limits and SQLite's implementation lie outside this transition system.
`ReplaceInode` is intentionally unsafe and appears only in its negative control.
The normal protocol permanently retains the same database inode. Two inode
symbols make replacement's split-custody counterexample expressible.

## Durability and cleanup

Archive/marker publication and unlink actions assume the qualified Phase02
durable filesystem contract. Their internal syscalls and power-loss images are
not repeated here. I/O errors may occur around these actions, preserving visible
partial state; process death releases only live exclusion. The model does not
infer absent markers or external settlement from successful native cleanup.

Recognized prior markers are archived before removal. Unknown markers survive
refusal. Conflicting archive contents cannot become an equal prior marker. Small
archive capacities 0/1/2 exercise the ordering rules; production's capacity 256
has dedicated source-level controls in `src/host-lease-model.test.ts` and native
`lease::tests::model_*`: 255→256 admission, new-257 refusal, equal/conflicting
retained archives, and cleanup cuts. The separate conformance suite must execute
these controls; finite model checking does not replace them. Capacity zero is an abstract
stress boundary, not a selectable public owner-lease configuration.

At most one modeled process crash occurs, and an actor can explicitly reopen at
most once. This does not prove arbitrary restart sequences. Shared-lease bounded
polling (`hostLease` retry / `acquire_shared`) is not modeled: these profiles cover
one acquisition attempt, followed only by the declared crash/reopen path. No
automatic uncertain-operation retry is introduced.

## Safety, witnesses and conditional progress

Safety checks callback exclusion, transaction custody through the critical
section, archive-before-clear, foreign-marker retention, the archive bound,
foreign-contract refusal, marker-before-callback and callback-before-success.
Every important declared action requires a separate reachable nonstuttering
counterexample to its `Never...` witness property; evaluation counters alone do
not establish reachability.

Unsafe variants replace the retained inode, skip the transaction, clear evidence
before archiving, erase foreign markers, ignore archive capacity, or accept a
foreign contract. Each must fail its specifically named property. The unfair
liveness control must produce a completed temporal counterexample.

The two fair profiles assume an initialized ready database, available storage,
terminating callbacks, no injected faults/crashes, and weak fairness of each
actor's steps. One checks that every bounded call settles, including rejection;
the other checks that some caller reaches the callback. Neither promises every
contender wins, every cold starter progresses, or unbounded scheduler fairness.

The registered adapter must bind model, profile, scope, live sources, runtime and
raw logs before evidence can support a claim. Scratch exploration counts are
preparation evidence and are not reused as the required integrated suite result.
