--------------------------- MODULE MailboxProtocol ---------------------------
EXTENDS Naturals, FiniteSets

CONSTANTS Mutation, Scenario, Remaining
Senders == {"s1", "s2"}
Receivers == {"r1", "r2"}
Actors == Senders \cup Receivers \cup {"v"}
Keys == {1, 2}
Payloads == {1, 2}
Rights == {"send", "receive"}
MaxMessages == IF Remaining = 0 THEN 1 ELSE Remaining
Revoking == Scenario \in {"revoke-send", "revoke-receive", "revoke-interruption"}
FailuresEnabled == Scenario \in {"interruption", "revoke-interruption", "orphan-interruption"}
Orphan == Scenario \in {"orphan-claim", "orphan-interruption"}
Damaged == Scenario \in {"ambiguous", "malformed", "conflicting-marker", "missing-claim"}
ActiveActors == CASE Revoking -> {"s1", "r1", "v"}
  [] Scenario \in {"wrong-class", "foreign-authority"} -> {"s1"}
  [] Scenario \in {"death", "interruption", "orphan-claim", "orphan-interruption"} \/ Damaged -> {"s1", "r1", "r2"}
  [] OTHER -> Senders \cup Receivers
Operation(a) == CASE a \in Senders -> "send"
  [] a = "v" -> "revoke"
  [] a = "r2" /\ (Scenario \in {"death", "interruption"} \/ Damaged) -> "ready"
  [] OTHER -> "receive"
Right(a) == IF a \in Senders \/ (a = "v" /\ Scenario # "revoke-receive") THEN "send" ELSE "receive"
RequestKey(a) == IF (a = "s1" /\ ~Orphan) \/ Scenario \in {"retry", "conflict"} THEN 1 ELSE 2
RequestValue(a) == IF a = "s1" \/ Scenario = "retry" THEN 1 ELSE 2
InitialClaims == [k \in Keys |-> IF k = 1 /\ Remaining = 0 /\ Scenario # "missing-claim" THEN 1
  ELSE IF k = 2 /\ Orphan THEN 1 ELSE 0]
InitialPending == [k \in Keys |-> IF k = 1 /\ Remaining = 0 THEN
  (CASE Scenario = "malformed" -> 3 [] Scenario = "conflicting-marker" -> 2 [] OTHER -> 1) ELSE 0]
InitialConsumed == [k \in Keys |-> IF k = 1 /\ Scenario = "ambiguous" THEN 1 ELSE 0]
InitialTracked == {k \in Keys: InitialPending[k] \in Payloads /\ InitialPending[k] = InitialClaims[k]}
Stages == {"resolve", "lock", "check", "send", "claim", "delivery", "enqueue", "receive", "receiveSelected", "consume", "unlink", "revoke", "revoking", "release", "return", "done", "dead"}
Results == {"none", "sent", "received", "ready", "empty", "revoked", "denied", "wrong-class", "busy", "malformed", "conflict", "ambiguous", "full", "suspended", "io", "unknown"}
Successes == {"sent", "received", "ready", "empty", "revoked"}
Critical == {"check", "send", "claim", "delivery", "enqueue", "receive", "receiveSelected", "consume", "unlink", "revoke", "revoking", "release"}

VARIABLE s
vars == <<s>>
Init == s = [
  pc |-> [a \in Actors |-> IF a \in ActiveActors THEN "resolve" ELSE "done"],
  claims |-> InitialClaims, first |-> InitialClaims,
  pending |-> InitialPending, consumed |-> InitialConsumed,
  queued |-> InitialTracked, retired |-> {},
  active |-> [r \in Rights |-> ~(Scenario = "revoked-send" /\ r = "send") /\ ~(Scenario = "revoked-receive" /\ r = "receive")],
  revoked |-> {}, lock |-> "none", residue |-> FALSE,
  selected |-> [a \in Actors |-> 0], outcome |-> [a \in Actors |-> "none"],
  authorized |-> [a \in Actors |-> FALSE], dispatched |-> {}, released |-> {}, returned |-> {},
  attempted |-> {}, uncertain |-> {},
  death |-> FALSE, failed |-> FALSE, reopened |-> FALSE, reconciliation |-> FALSE]

PendingKeys == {k \in Keys: s.pending[k] # 0}
DualKeys == {k \in Keys: s.pending[k] # 0 /\ s.consumed[k] # 0}
FirstPending == IF 1 \in PendingKeys THEN 1 ELSE 2
AuthorityOK(a) == /\ s.active[Right(a)]
  /\ ~(a = "s1" /\ Scenario \in {"wrong-class", "foreign-authority"})
ClaimError(a) == LET k == RequestKey(a) IN
  CASE s.claims[k] = 3 -> "malformed"
    [] s.claims[k] # 0 /\ s.claims[k] # RequestValue(a) -> "conflict"
    [] s.claims[k] = 0 /\ (s.pending[k] # 0 \/ s.consumed[k] # 0) -> "conflict"
    [] s.claims[k] = 0 /\ Cardinality(PendingKeys) >= MaxMessages /\ Mutation # "skip-capacity" -> "full"
    [] OTHER -> "none"
DeliveryError(k) == CASE s.pending[k] = 3 \/ s.consumed[k] = 3 -> "malformed"
  [] (s.pending[k] # 0 /\ s.pending[k] # s.claims[k]) \/ (s.consumed[k] # 0 /\ s.consumed[k] # s.claims[k]) -> "conflict"
  [] k \in DualKeys -> "ambiguous"
  [] OTHER -> "none"
DualError == CASE \E k \in DualKeys: s.claims[k] \notin Payloads \/ s.pending[k] = 3 \/ s.consumed[k] = 3 -> "malformed"
  [] \E k \in DualKeys: s.pending[k] # s.claims[k] \/ s.consumed[k] # s.claims[k] -> "conflict"
  [] DualKeys # {} /\ Mutation # "accept-ambiguous" -> "ambiguous"
  [] OTHER -> "none"
ReceiveError(k) == CASE s.claims[k] \notin Payloads \/ s.pending[k] \notin Payloads -> "malformed"
  [] s.claims[k] # s.pending[k] -> "conflict"
  [] OTHER -> "none"

Resolve(a) == /\ s.pc[a] = "resolve"
  /\ s' = [s EXCEPT !.pc[a] = IF AuthorityOK(a) THEN "lock" ELSE "return",
    !.outcome[a] = IF AuthorityOK(a) THEN "none" ELSE IF a = "s1" /\ Scenario = "wrong-class" THEN "wrong-class" ELSE "denied"]
Acquire(a) == /\ s.pc[a] = "lock" /\ s.lock = "none"
  /\ s' = [s EXCEPT !.lock = IF Mutation = "skip-lock" THEN @ ELSE a, !.pc[a] = "check"]
RejectBusy(a) == /\ s.pc[a] = "lock" /\ s.lock # "none"
  /\ s' = [s EXCEPT !.pc[a] = "return", !.outcome[a] = "busy"]
Recheck(a) == /\ s.pc[a] = "check"
  /\ LET admitted == AuthorityOK(a) \/ Mutation = "skip-locked-authority" IN
    s' = [s EXCEPT
      !.pc[a] = IF admitted THEN (IF Operation(a) = "ready" THEN "receive" ELSE Operation(a)) ELSE "release",
      !.outcome[a] = IF admitted THEN "none" ELSE "denied",
      !.authorized[a] = AuthorityOK(a), !.dispatched = IF admitted THEN @ \cup {a} ELSE @]
RejectSend(a) == /\ a \in Senders /\ s.pc[a] = "send" /\ ClaimError(a) # "none"
  /\ ~(Mutation = "overwrite-claim" /\ s.claims[RequestKey(a)] \in Payloads /\ ClaimError(a) = "conflict")
  /\ s' = [s EXCEPT !.pc[a] = "release", !.outcome[a] = ClaimError(a)]
BeginClaim(a) == /\ a \in Senders /\ s.pc[a] = "send"
  /\ ((s.claims[RequestKey(a)] = 0 /\ ClaimError(a) = "none")
    \/ (Mutation = "overwrite-claim" /\ s.claims[RequestKey(a)] \in Payloads /\ ClaimError(a) = "conflict"))
  /\ s' = [s EXCEPT !.attempted = @ \cup {a}, !.pc[a] = "claim"]
Claim(a) == /\ a \in Senders /\ s.pc[a] = "claim"
  /\ s' = [s EXCEPT !.claims[RequestKey(a)] = RequestValue(a),
    !.first[RequestKey(a)] = IF @ = 0 THEN RequestValue(a) ELSE @, !.pc[a] = "delivery"]
UseClaim(a) == /\ a \in Senders /\ s.pc[a] = "send"
  /\ ClaimError(a) = "none" /\ s.claims[RequestKey(a)] = RequestValue(a)
  /\ s' = [s EXCEPT !.pc[a] = "delivery"]
RejectDelivery(a) == /\ a \in Senders /\ s.pc[a] = "delivery" /\ DeliveryError(RequestKey(a)) # "none"
  /\ s' = [s EXCEPT !.pc[a] = "release", !.outcome[a] = DeliveryError(RequestKey(a))]
RetryPending(a) == /\ a \in Senders /\ s.pc[a] = "delivery"
  /\ DeliveryError(RequestKey(a)) = "none" /\ s.pending[RequestKey(a)] # 0
  /\ s' = [s EXCEPT !.pc[a] = "release", !.outcome[a] = "sent"]
RetryConsumed(a) == /\ a \in Senders /\ s.pc[a] = "delivery"
  /\ DeliveryError(RequestKey(a)) = "none" /\ s.consumed[RequestKey(a)] # 0
  /\ s' = [s EXCEPT !.pc[a] = "release", !.outcome[a] = "sent",
    !.pending[RequestKey(a)] = IF Mutation = "revive-consumed" THEN s.consumed[RequestKey(a)] ELSE @]
RejectFull(a) == /\ a \in Senders /\ s.pc[a] = "delivery" /\ DeliveryError(RequestKey(a)) = "none"
  /\ s.pending[RequestKey(a)] = 0 /\ s.consumed[RequestKey(a)] = 0
  /\ Cardinality(PendingKeys) >= MaxMessages /\ Mutation # "skip-capacity"
  /\ s' = [s EXCEPT !.pc[a] = "release", !.outcome[a] = "full"]
BeginEnqueue(a) == /\ a \in Senders /\ s.pc[a] = "delivery" /\ DeliveryError(RequestKey(a)) = "none"
  /\ s.pending[RequestKey(a)] = 0 /\ s.consumed[RequestKey(a)] = 0
  /\ (Cardinality(PendingKeys) < MaxMessages \/ Mutation = "skip-capacity")
  /\ s' = [s EXCEPT !.attempted = IF Mutation = "skip-mark-enqueue" THEN @ ELSE @ \cup {a}, !.pc[a] = "enqueue"]
Enqueue(a) == /\ a \in Senders /\ s.pc[a] = "enqueue"
  /\ s' = [s EXCEPT !.pending[RequestKey(a)] = s.claims[RequestKey(a)],
    !.queued = @ \cup {RequestKey(a)}, !.pc[a] = "release", !.outcome[a] = "sent"]

RejectReceive(a) == /\ a \in Receivers /\ s.pc[a] = "receive"
  /\ (DualError # "none" \/ (Operation(a) = "receive" /\ PendingKeys # {} /\ ReceiveError(FirstPending) # "none"))
  /\ s' = [s EXCEPT !.pc[a] = "release",
    !.outcome[a] = IF DualError # "none" THEN DualError ELSE ReceiveError(FirstPending)]
Readiness(a) == /\ a \in Receivers /\ Operation(a) = "ready" /\ s.pc[a] = "receive" /\ DualError = "none"
  /\ s' = [s EXCEPT !.pc[a] = "release", !.outcome[a] = IF PendingKeys = {} THEN "empty" ELSE "ready"]
Suspend(a) == /\ a \in Receivers /\ Operation(a) = "receive" /\ s.pc[a] = "receive"
  /\ DualError = "none" /\ PendingKeys = {}
  /\ s' = [s EXCEPT !.pc[a] = "release", !.outcome[a] = "suspended"]
SelectReceive(a) == /\ a \in Receivers /\ Operation(a) = "receive" /\ s.pc[a] = "receive"
  /\ DualError = "none" /\ PendingKeys # {} /\ ReceiveError(FirstPending) = "none"
  /\ s' = [s EXCEPT !.selected[a] = FirstPending, !.pc[a] = "receiveSelected"]
BeginConsume(a) == /\ a \in Receivers /\ s.pc[a] = "receiveSelected"
  /\ s' = [s EXCEPT !.attempted = @ \cup {a},
    !.pc[a] = IF Mutation = "delete-before-consumed" THEN "unlink" ELSE "consume"]
PublishConsumed(a) == /\ a \in Receivers /\ s.pc[a] = "consume"
  /\ s' = [s EXCEPT !.consumed[s.selected[a]] = s.pending[s.selected[a]], !.pc[a] = "unlink"]
UnlinkPending(a) == /\ a \in Receivers /\ s.pc[a] = "unlink"
  /\ s' = [s EXCEPT !.pending[s.selected[a]] = 0, !.retired = @ \cup {s.selected[a]},
    !.pc[a] = "release", !.outcome[a] = "received"]
BeginRevoke(a) == /\ a = "v" /\ s.pc[a] = "revoke"
  /\ s' = [s EXCEPT !.attempted = @ \cup {a}, !.pc[a] = "revoking"]
Revoke(a) == /\ a = "v" /\ s.pc[a] = "revoking"
  /\ s' = [s EXCEPT !.active[Right(a)] = FALSE, !.revoked = @ \cup {Right(a)},
    !.pc[a] = "release", !.outcome[a] = "revoked"]
Release(a) == /\ s.pc[a] = "release" /\ s.lock = a
  /\ s' = [s EXCEPT !.lock = "none", !.released = @ \cup {a}, !.pc[a] = "return"]
Ack(a) == /\ s.pc[a] = "return"
  /\ s' = [s EXCEPT !.returned = @ \cup {a}, !.pc[a] = "done",
    !.uncertain = IF (a \in s.attempted /\ s.outcome[a] \notin Successes /\ Mutation # "settle-uncertain")
      \/ (Mutation = "invent-uncertain" /\ s.outcome[a] = "io") THEN @ \cup {a} ELSE @]

Fail(a) == /\ FailuresEnabled /\ ~s.failed /\ s.lock = a /\ s.pc[a] \in Critical
  /\ s' = [s EXCEPT !.failed = TRUE, !.pc[a] = "release", !.outcome[a] = "io"]
FailRelease(a) == /\ FailuresEnabled /\ ~s.failed /\ s.lock = a /\ s.pc[a] = "release"
  /\ s' = [s EXCEPT !.failed = TRUE, !.lock = "residue", !.residue = TRUE, !.pc[a] = "return", !.outcome[a] = "io"]
FailAfterRelease(a) == /\ FailuresEnabled /\ ~s.failed /\ s.pc[a] = "return" /\ s.outcome[a] \in Successes
  /\ s' = [s EXCEPT !.failed = TRUE, !.outcome[a] = "io"]
Death(a) == /\ Scenario = "death" /\ ~s.death /\ s.pc[a] \notin {"resolve", "done", "dead"}
  /\ s' = [s EXCEPT !.death = TRUE, !.pc[a] = "dead", !.outcome[a] = "unknown",
    !.lock = IF @ = a THEN "residue" ELSE @, !.residue = @ \/ s.lock = a]
Reopen == /\ s.death /\ ~s.reopened /\ s' = [s EXCEPT !.reopened = TRUE]
RequireReconciliation == /\ (s.residue \/ DualKeys # {}) /\ ~s.reconciliation
  /\ s' = [s EXCEPT !.reconciliation = TRUE]
UnsafeReclaim == /\ Mutation = "reclaim-residue" /\ s.lock = "residue"
  /\ s' = [s EXCEPT !.lock = "none"]
Step(a) == Resolve(a) \/ Acquire(a) \/ RejectBusy(a) \/ Recheck(a)
  \/ RejectSend(a) \/ BeginClaim(a) \/ Claim(a) \/ UseClaim(a) \/ RejectDelivery(a) \/ RetryPending(a) \/ RetryConsumed(a) \/ RejectFull(a) \/ BeginEnqueue(a) \/ Enqueue(a)
  \/ RejectReceive(a) \/ Readiness(a) \/ Suspend(a) \/ SelectReceive(a) \/ BeginConsume(a) \/ PublishConsumed(a) \/ UnlinkPending(a)
  \/ BeginRevoke(a) \/ Revoke(a) \/ Release(a) \/ Ack(a) \/ Fail(a) \/ FailRelease(a) \/ FailAfterRelease(a) \/ Death(a)
Done == /\ (\A a \in Actors: s.pc[a] \in {"done", "dead"}) /\ UNCHANGED s
Next == (\E a \in Actors: Step(a)) \/ Reopen \/ RequireReconciliation \/ UnsafeReclaim \/ Done
Spec == Init /\ [][Next]_vars
FairSpec == Spec /\ (\A a \in ActiveActors: WF_vars(Step(a)))

TypeOK == /\ Remaining \in 0..2 /\ MaxMessages \in 1..2
  /\ s.pc \in [Actors -> Stages] /\ s.claims \in [Keys -> 0..3] /\ s.first \in [Keys -> 0..3]
  /\ s.pending \in [Keys -> 0..3] /\ s.consumed \in [Keys -> 0..3]
  /\ s.queued \subseteq Keys /\ s.retired \subseteq Keys /\ s.active \in [Rights -> BOOLEAN] /\ s.revoked \subseteq Rights
  /\ s.lock \in Actors \cup {"none", "residue"} /\ s.residue \in BOOLEAN
  /\ s.selected \in [Actors -> 0..2] /\ s.outcome \in [Actors -> Results]
  /\ s.authorized \in [Actors -> BOOLEAN] /\ s.dispatched \subseteq Actors /\ s.released \subseteq Actors /\ s.returned \subseteq Actors
  /\ s.attempted \subseteq Actors /\ s.uncertain \subseteq Actors
  /\ s.death \in BOOLEAN /\ s.failed \in BOOLEAN /\ s.reopened \in BOOLEAN /\ s.reconciliation \in BOOLEAN
CapacityBound == Cardinality(PendingKeys) <= MaxMessages
ImmutableClaim == \A k \in Keys: s.first[k] # 0 => s.claims[k] = s.first[k]
NoRevival == s.retired \cap PendingKeys = {}
NoUnmarkedLoss == \A k \in s.queued: s.pending[k] # 0 \/ s.consumed[k] # 0
DispatchAuthorized == \A a \in s.dispatched: s.authorized[a]
CriticalCustody == \A a \in Actors: s.pc[a] \in Critical => s.lock = a
RevocationPermanent == \A r \in s.revoked: ~s.active[r]
ResidueBlocks == s.residue => s.lock = "residue"
BadEvidenceRetained == Damaged => /\ s.claims[1] = InitialClaims[1]
  /\ s.pending[1] = InitialPending[1] /\ s.consumed[1] = InitialConsumed[1]
AckReleased == \A a \in s.returned: s.outcome[a] \in Successes => a \in s.released
SendAckEvidence == \A a \in Senders \cap s.returned: s.outcome[a] = "sent" =>
  /\ s.claims[RequestKey(a)] = RequestValue(a)
  /\ s.pending[RequestKey(a)] = RequestValue(a) \/ s.consumed[RequestKey(a)] = RequestValue(a)
ReceiveAckEvidence == \A a \in Receivers \cap s.returned: s.outcome[a] = "received" =>
  /\ s.consumed[s.selected[a]] = s.claims[s.selected[a]] /\ s.pending[s.selected[a]] = 0
AtMostOneReceipt == \A k \in Keys: Cardinality({a \in Receivers \cap s.returned: s.outcome[a] = "received" /\ s.selected[a] = k}) <= 1
MutationBoundaryRecorded == \A a \in Actors: s.pc[a] \in {"claim", "enqueue", "consume", "unlink", "revoking"} => a \in s.attempted
MutationErrorsUncertain == \A a \in s.returned \cap s.attempted: s.outcome[a] \notin Successes => a \in s.uncertain
NoInventedUncertainty == /\ s.uncertain \subseteq s.returned \cap s.attempted
  /\ \A a \in s.uncertain: s.outcome[a] \notin Successes
EventuallyDone == <>(\A a \in ActiveActors: s.pc[a] = "done")
SelectedReceiveReturns == \A a \in Receivers: (s.pc[a] \in {"consume", "unlink"}) ~> (a \in s.returned /\ s.outcome[a] = "received")

NeverResolve == [][~(\E a \in Actors: Resolve(a))]_vars
NeverDenyResolve == [][~(\E a \in Actors: Resolve(a) /\ ~AuthorityOK(a))]_vars
NeverAcquire == [][~(\E a \in Actors: Acquire(a))]_vars
NeverRejectBusy == [][~(\E a \in Actors: RejectBusy(a))]_vars
NeverRecheck == [][~(\E a \in Actors: Recheck(a))]_vars
NeverRejectRevokedUnderLock == [][~(\E a \in Actors: Recheck(a) /\ ~AuthorityOK(a))]_vars
NeverRejectSend == [][~(\E a \in Actors: RejectSend(a))]_vars
NeverRejectConflict == [][~(\E a \in Actors: RejectSend(a) /\ ClaimError(a) = "conflict") ]_vars
NeverClaim == [][~(\E a \in Actors: Claim(a))]_vars
NeverBeginClaim == [][~(\E a \in Actors: BeginClaim(a))]_vars
NeverUseClaim == [][~(\E a \in Actors: UseClaim(a))]_vars
NeverRejectDelivery == [][~(\E a \in Actors: RejectDelivery(a))]_vars
NeverRetryPending == [][~(\E a \in Actors: RetryPending(a))]_vars
NeverRetryConsumed == [][~(\E a \in Actors: RetryConsumed(a))]_vars
NeverRejectFull == [][~(\E a \in Actors: RejectFull(a))]_vars
NeverEnqueue == [][~(\E a \in Actors: Enqueue(a))]_vars
NeverBeginEnqueue == [][~(\E a \in Actors: BeginEnqueue(a))]_vars
NeverTwoPending == [][~(\E a \in Actors: Enqueue(a) /\ Cardinality(PendingKeys) = 1)]_vars
NeverRejectReceive == [][~(\E a \in Actors: RejectReceive(a))]_vars
NeverReadiness == [][~(\E a \in Actors: Readiness(a))]_vars
NeverSuspend == [][~(\E a \in Actors: Suspend(a))]_vars
NeverSelectReceive == [][~(\E a \in Actors: SelectReceive(a))]_vars
NeverBeginConsume == [][~(\E a \in Actors: BeginConsume(a))]_vars
NeverPublishConsumed == [][~(\E a \in Actors: PublishConsumed(a))]_vars
NeverUnlinkPending == [][~(\E a \in Actors: UnlinkPending(a))]_vars
NeverRevoke == [][~(\E a \in Actors: Revoke(a))]_vars
NeverBeginRevoke == [][~(\E a \in Actors: BeginRevoke(a))]_vars
NeverRelease == [][~(\E a \in Actors: Release(a))]_vars
NeverAck == [][~(\E a \in Actors: Ack(a))]_vars
NeverFail == [][~(\E a \in Actors: Fail(a))]_vars
NeverFailRelease == [][~(\E a \in Actors: FailRelease(a))]_vars
NeverFailAfterRelease == [][~(\E a \in Actors: FailAfterRelease(a))]_vars
NeverAckUncertainReceive == [][~(\E a \in Receivers: Ack(a) /\ a \in s.attempted /\ s.outcome[a] = "io" /\ s.pending[s.selected[a]] = 0)]_vars
NeverFailPreMutationReceive == [][~(\E a \in Receivers: Fail(a) /\ s.pc[a] = "receiveSelected" /\ a \notin s.attempted)]_vars
NeverAckUncertainFreshSend == [][~(\E a \in Senders: Ack(a) /\ a \in s.attempted /\ s.outcome[a] = "io" /\ s.claims[RequestKey(a)] = 0)]_vars
NeverFailAfterPublishedSend == [][~(\E a \in Senders: FailAfterRelease(a) /\ a \in s.attempted /\ s.pending[RequestKey(a)] # 0)]_vars
NeverAckUncertainRevoke == [][~(Ack("v") /\ "v" \in s.attempted /\ s.outcome["v"] = "io" /\ ~s.active[Right("v")])]_vars
NeverFailPreMutationRevoke == [][~(Fail("v") /\ s.pc["v"] = "revoke" /\ "v" \notin s.attempted)]_vars
NeverFailPreMutationOrphanSend == [][~(Fail("s1") /\ s.pc["s1"] = "delivery" /\ "s1" \notin s.attempted /\ s.claims[2] = 1)]_vars
NeverAckUncertainOrphanSend == [][~(Ack("s1") /\ "s1" \in s.attempted /\ s.outcome["s1"] = "io" /\ s.pending[2] = 1)]_vars
NeverDeath == [][~(\E a \in Actors: Death(a))]_vars
NeverDeathAfterDequeue == [][~(\E a \in Receivers: Death(a) /\ s.pc[a] = "return" /\ s.outcome[a] = "received") ]_vars
NeverReopen == [][~Reopen]_vars
NeverRequireReconciliation == [][~RequireReconciliation]_vars
=============================================================================
