# Mailbox protocol model and source correspondence

`MailboxProtocol.tla` explores one admitted mailbox with two ordered delivery-key
symbols, two admitted payload symbols, up to two senders, two receive-capability
holders and one revoker. It separates initial capability resolution, pathname
lock acquisition, resolution under that lock, claim/marker publication, lock
release and the caller observing a return. It models receive without a retained
caller operation/result identity, matching the existing public contract.

This is finite protocol evidence conditional on the stated assumptions. It is
not a proved implementation refinement, cryptographic proof, filesystem power-loss
qualification, or exactly-once delivery guarantee.

## Source correspondence

| Model actions/state | Concrete boundary |
| --- | --- |
| `Resolve`, `Acquire`, `RejectBusy`, `Recheck` | Bun `FileMailboxService.resolve`, `withMailboxLock` and each locked operation in `src/mailbox.ts`; native `resolve`, `lock`, `with_lock` and locked operations in `crates/algal/src/mailbox.rs`. Both resolve before acquisition and again while holding the exclusive pathname lock. A competing owner causes a rejecting return, not an internal retry queue. |
| `BeginRevoke`, `Revoke` | Bun `revokeLocked` and native `revoke`: mark a mutation attempt immediately before replacing the revoked capability record while holding the same mailbox lock. The begin action may be followed by an error before any replacement completes. A call resolved earlier must still pass `Recheck`. An already admitted operation may complete before a later revocation; revocation does not retroactively invalidate its return. |
| `BeginClaim`, `Claim`, `UseClaim`, `RejectSend` | `sendLocked` / `send_locked`: a key claims exactly one message envelope, with mailbox/key/payload identity checked on retained bytes. An absent claim with an existing delivery marker rejects. Fresh claims check capacity before recording the mutation attempt and publishing. Retained reads and equal retries do not record a fresh mutation attempt. |
| `RetryPending`, `RetryConsumed`, `RejectDelivery`, `RejectFull`, `BeginEnqueue`, `Enqueue` | The retained-marker branch and second capacity check in send. A consumed retry retains its identity without creating pending state. A retained claim without either marker still needs capacity before recording a mutation attempt and enqueueing. |
| `Readiness`, `Suspend`, `RejectReceive`, `SelectReceive` | `hasPending` / `has_pending`, `unambiguousPending` / `unambiguous_pending`, and receive. Keys 1 and 2 stand for ascending digest order, not user key numerals. Readiness checks ambiguous transfers; it does not fully validate every standalone pending payload. The malformed-pending profile can therefore report readiness while a receive rejects. Readiness is not a promise of successful delivery. |
| `SelectReceive`, `BeginConsume`, `PublishConsumed`, `UnlinkPending` | Receive selects and validates a message, then revalidates/syncs the retained claim before `BeginConsume` records the mutation attempt. `receiveSelected` therefore admits a selected-message read/barrier failure without classifying this invocation as a mutation attempt. Receive then publishes and syncs the immutable consumed marker before unlinking and syncing pending. These are distinct protocol steps. |
| `Release`, `Ack` | The explicit mailbox lock release and directory barrier complete before a successful public return in both runtimes. `Ack` also records rejecting returns and propagates the operation-local mutation-attempt flag to their host-only uncertainty classification; only `Successes` license success assertions. This is distinct from native OwnerLease's best-effort Drop cleanup. |
| `Fail`, `FailRelease`, `FailAfterRelease` | Bounded injected I/O failure at completed protocol-step boundaries. Partial publication survives; a release failure can retain an authoritative lock. An error after release can leave a completed transfer without a successful caller receipt. Concrete within-helper syscall cuts remain separate Phase02/04 evidence. |
| `Death`, `Reopen` | One actor dies before observing its call's return; its live pathname lock, if any, becomes residue. Restart reads the same retained filesystem image. This is process death at modeled boundaries, not machine power loss. Other actors may encounter that residue and fail. |
| `RequireReconciliation` | A diagnostic classification of retained lock or dual markers. It does not change files, reclaim ownership or implement a repair API. There is no normal `Reconcile` action. `UnsafeReclaim` exists only as a mutation. |

Wrong-class authority is a separate `wrong-class` result (the concrete parsers
use `TYPE_MISMATCH`); revoked/foreign admissions are `denied`. Other result labels
are bounded protocol categories, not a model of every possible parser diagnostic.
The admitted mailbox directory layout and configuration already exist. Creation,
random handle generation, malformed configuration/schema parsing, oversized
messages, arbitrary directory entries and hostile namespace replacement are
outside this transition system.

## Publication composition and uncertainty

Claim, consumed/pending marker, revoked-record and lock-release actions assume
the completed publication barriers from Phase02, including same-opened-inode
validation/sync for retained winners and complete directory binding syncs.
`MailboxPublication.tla` separately explores the volatile/durable syscall states.
Their composition is reviewed correspondence, not a proved refinement theorem.
This model does not silently assume cross-directory rename crash atomicity.

The two data symbols are distinct admitted canonical message identities; actual
bytes, hash collision resistance and parser completeness remain assumptions or
separate obligations. A `3` marker is an explicitly classified malformed initial
record. Conflicting and missing-claim profiles likewise start from named bad
states. The normal protocol preserves that evidence rather than repairing it.

`queued` tracks valid initially pending messages and messages this model actually
enqueues. `NoUnmarkedLoss` concerns those tracked messages. An orphan immutable
claim is not evidence that enqueue happened. Arbitrary legacy claim-only layouts
cannot be retrospectively classified as unsent or consumed. The orphan-claim
profile shows current send behavior and does not reconstruct that lost history.

`retired` records completed pending removal. `NoRevival` forbids its keys returning
to pending. Pending and consumed may temporarily coexist between publication and
removal; equality does not authorize another caller to choose a winner. An
interruption can leave dual markers or a retained lock, which rejects subsequent
operations. No failure path erases uncertainty to make a progress theorem pass.

The death-after-dequeue witness requires an actual reachable transition from a
receiver that has removed pending and released its lock but has not observed its
return. Thus absence of a successful receive receipt does not imply no dequeue.
The model permits at most one successful receive return per key in its finite
current-protocol history; it does not promise one such return exists, identify a
retry of receive, or prove exactly-once external handling of the payload.
`attempted` records entry to the first potentially mutating publication helper,
not proof that its write took effect. It is set before a fresh immutable claim,
a new pending marker (including an orphan-claim retry), a consumed marker, or a
revoked capability-record replacement. Failures after this boundary, including
lock-release or return failures after a completed transfer, must be returned with
host-only `uncertain:true`. `MutationErrorsUncertain` checks that implication.
`MutationBoundaryRecorded` independently checks that the first publication stage
cannot be entered without that flag; the earlier `receiveSelected` stage is
excluded. `NoInventedUncertainty` requires that the model only labels rejecting
returns from an invocation that crossed its mutation boundary. It does not infer whether
the individual publication actually took effect.

The pre-mutation paths include readiness, retained equal-send retries, known
full/empty/invalid/revoked rejection and selected-message retained-read failure.
The model does not assign fresh uncertainty to those invocations. In particular,
an ambiguous initial layout can be rejected with `uncertain:false` because this
invocation attempted no mutation; that flag does not prove that a prior call did
not dequeue. Errors retain their wire code/message in the implementation; the
model's coarse result categories do not prove every diagnostic conversion. An
already uncertain lower-layer error is preserved by the implementation, but no
independently supplied uncertainty flag is an input to this transition system.

The real Bun/native journal conformance fixtures separately cover the composed
boundary: a receive that consumed a message and then lost its return poisons the
journal, retains the started write, suppresses its fallback and blocks blind
recovery. This mailbox-only model has no journal, receipt-generation or fallback
state; passing its uncertainty properties is not itself proof of that composition.

## Finite profiles and progress

`profiles.ts` is the static inventory. All main capacity/retry profiles have two
senders and two receivers, each making at most one call. Equal/conflicting retries
use the second sender. Targeted revocation profiles have one sender, one receiver
and one revoker; damage/death and non-revocation failure profiles have one sender
and two receive-capability holders (the second performs readiness where declared). The separate
revocation-interruption profile has one sender, one receiver and one revoker.
No unbounded call or restart sequence is implied. Scenarios select explicit bounded inputs and
enabled actors. Full and empty interruption profiles cover consumed transfers and
fresh-send attempts, while orphan-claim interruption independently covers the
pending-publication boundary without a fresh claim setting the flag first. The
revocation-interruption profile covers replacement failures. Each enables at most
one injected failure. No TLC state/action constraint, symmetry or operator
override prunes the generated graph.

`Remaining = 0` means an actual capacity-one mailbox initially containing one
pending message. It is not an illegal production `maxMessages:0` configuration.
The other capacity profiles start empty with actual capacity one or two. Receiving
can free a slot. The production upper count/byte bounds need separate boundary
tests; no arbitrary-capacity result follows from these finite profiles.

The two liveness profiles use weak fairness of each active actor's protocol step,
available storage, and the profiles' absence of enabled faults, process death and
revocation. `EventuallyDone` says every bounded call returns, including contention,
capacity, empty-mailbox or other rejection. `SelectedReceiveReturns` says a
receiver already admitted at the transfer stage eventually returns its message.
Its antecedent has a separate reachable nonstuttering witness. Neither property
promises every receiver obtains a message, schedules new retries, or resolves
retained locks. There is no liveness claim for unresolved reconciliation states.

Each declared action requires a reachable nonstuttering trace violating its
`Never...` property. Intended unsafe variants revive a consumed message, skip the
locked authority check, overwrite a claim, ignore capacity, delete pending before
consumed publication, omit the lock, reclaim residue, accept ambiguous transfer,
remove fairness, settle a mutation error, invent uncertainty for an invocation
that attempted no mutation, or omit the orphan-enqueue mutation marker. Each must
fail its declared invariant/temporal property. Explicit witnesses also reach a selected receive before its mutation boundary,
a send failure before claim publication, a lost return after pending publication,
an orphan enqueue without a new claim, and revoke errors before and after
replacement. Unexpected failures, tool crashes and incomplete exploration do not
qualify.

## Evidence admission

`diagnose.ts` is a bounded, diagnostic-only runner for static profiles and controls.
It retains model/config bytes, raw output, command custody and semantic parser
results in an owned temporary directory. It checks executable/JAR pins but is not
a substitute for the registered suite's complete qualified Java-runtime closure,
source-definition binding, complete run inventory and raw-log readmission.

Phase04 retained mailbox histories and the real Bun/native stateful corpus are
separate sampled consistency evidence, linked through their exact frozen source
and raw archives. Within-helper faults and actual owned-process death remain
separate from this finite upper protocol model. No source refinement is inferred
merely because both kinds of evidence pass. Final operational counts and hashes
belong to the admitted shared-suite result, not this scope document.
