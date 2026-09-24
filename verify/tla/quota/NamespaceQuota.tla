---------------------------- MODULE NamespaceQuota ----------------------------
EXTENDS Naturals, FiniteSets
CONSTANTS Mutation, Scenario, PerBound, AggregateBound, NameBound
Apps == {"a", "b"}
Actors == {"a1", "a2", "b1"}
App(a) == IF a = "b1" THEN "b" ELSE "a"
Bytes(a) == IF a = "a2" THEN 2 ELSE 1
Headroom == 1
LedgerSpare == 1
Common == IF Scenario = "common" THEN 2 ELSE 0
Reservation(a) == (IF Mutation = "single-copy" THEN 1 ELSE 2) * Bytes(a)
Max(x,y) == IF x >= y THEN x ELSE y
InitialActual == [app \in Apps |-> IF app = "a" /\ Scenario \in {"measured", "legacy"} THEN 2 ELSE 0]
InitialLedger == [app \in Apps |-> IF app = "a" /\ Scenario = "measured" THEN 3 ELSE 0]
InitialNames == IF Scenario \in {"measured", "zero-row"} THEN {"a"} ELSE {}
InitialPresent == IF Scenario \in {"measured", "legacy"} THEN {"a"} ELSE {}
Stages == {"acquire", "wait", "scan", "admit", "reserve", "publish", "release", "return", "done", "dead"}
Critical == {"scan", "admit", "reserve", "publish", "release"}
Faults == Scenario = "failure"
VARIABLE s
vars == <<s>>
Init == s = [pc |-> [a \in Actors |-> "acquire"], lock |-> "none",
  ledger |-> InitialLedger, names |-> InitialNames,
  high |-> InitialLedger, everNames |-> InitialNames,
  actual |-> InitialActual, present |-> InitialPresent,
  candidate |-> [a \in Actors |-> InitialLedger], candidateNames |-> [a \in Actors |-> {}],
  approved |-> {}, reserved |-> {}, wrote |-> {}, returned |-> {}, denied |-> {},
  result |-> [a \in Actors |-> "none"], removed |-> {},
  accounted |-> Scenario # "legacy", failed |-> FALSE, crashed |-> FALSE, reopened |-> FALSE]
Acquirable(a) == s.pc[a] = (IF Mutation = "stale-snapshot" THEN "wait" ELSE "acquire")
Acquire(a) == /\ Acquirable(a) /\ s.lock = "none"
  /\ s' = [s EXCEPT !.lock = a, !.pc[a] = IF Mutation = "stale-snapshot" THEN "admit" ELSE "scan"]
RejectBusy(a) == /\ Acquirable(a) /\ s.lock # "none"
  /\ s' = [s EXCEPT !.pc[a] = "return", !.result[a] = "denied", !.denied = @ \cup {a}]
Scannable(a) == IF Mutation = "stale-snapshot" THEN s.pc[a] = "acquire" ELSE s.pc[a] = "scan" /\ s.lock = a
Scan(a) == /\ Scannable(a)
  /\ LET measured == [app \in Apps |-> IF app \in s.present THEN Max(s.ledger[app], s.actual[app] + Headroom) ELSE s.ledger[app]]
     IN s' = [s EXCEPT
       !.candidate[a] = [measured EXCEPT ![App(a)] = Max(@, Headroom) + Reservation(a)],
       !.candidateNames[a] = s.names \cup s.present \cup {App(a)},
       !.pc[a] = IF Mutation = "stale-snapshot" THEN "wait" ELSE "admit"]
WithinBounds(a) == /\ Cardinality(s.candidateNames[a]) <= NameBound
  /\ \A app \in Apps: s.candidate[a][app] <= PerBound
  /\ (s.candidate[a]["a"] + s.candidate[a]["b"] + Common + 2 * Headroom + LedgerSpare <= AggregateBound \/ Mutation = "skip-aggregate")
Admit(a) == /\ s.pc[a] = "admit" /\ WithinBounds(a)
  /\ s' = [s EXCEPT !.approved = @ \cup {a}, !.pc[a] = IF Mutation = "skip-reservation" THEN "publish" ELSE "reserve"]
RejectBounds(a) == /\ s.pc[a] = "admit" /\ ~WithinBounds(a)
  /\ s' = [s EXCEPT !.pc[a] = "release", !.result[a] = "denied", !.denied = @ \cup {a}]
Reserve(a) == /\ s.pc[a] = "reserve"
  /\ s' = [s EXCEPT !.ledger = s.candidate[a], !.names = s.candidateNames[a],
    !.high = [app \in Apps |-> Max(s.high[app], s.candidate[a][app])], !.everNames = @ \cup s.candidateNames[a],
    !.reserved = @ \cup {a}, !.accounted = TRUE, !.pc[a] = "publish"]
PublishCopies(a,copies) == /\ s.pc[a] = "publish" /\ copies \in 1..2
  /\ s' = [s EXCEPT !.actual[App(a)] = @ + copies * Bytes(a), !.present = @ \cup {App(a)},
    !.wrote = @ \cup {a}, !.pc[a] = "release", !.result[a] = "published"]
Release(a) == /\ s.pc[a] = "release" /\ s.lock = a
  /\ s' = [s EXCEPT !.lock = "none", !.pc[a] = "return"]
Ack(a) == /\ s.pc[a] = "return"
  /\ s' = [s EXCEPT !.returned = @ \cup {a}, !.pc[a] = "done"]
Fail(a) == /\ Faults /\ ~s.failed /\ s.pc[a] \in Critical /\ s.lock = a
  /\ s' = [s EXCEPT !.failed = TRUE, !.pc[a] = "release", !.result[a] = "io",
    !.ledger[App(a)] = IF Mutation = "refund-failure" /\ a \in s.reserved THEN @ - Reservation(a) ELSE @]
Crash(a) == /\ Faults /\ ~s.crashed /\ s.pc[a] \in Critical /\ s.lock = a
  /\ s' = [s EXCEPT !.crashed = TRUE, !.pc[a] = "dead", !.lock = "none", !.result[a] = "unknown"]
Reopen == /\ s.crashed /\ ~s.reopened /\ s' = [s EXCEPT !.reopened = TRUE]
RemoveFiles(app) == /\ Scenario = "delete" /\ app \in s.present /\ app \notin s.removed
  /\ (\E a \in s.wrote: App(a) = app /\ s.pc[a] = "done")
  /\ (\A a \in Actors: App(a) = app => s.pc[a] \notin Critical)
  /\ s' = [s EXCEPT !.actual[app] = 0, !.removed = @ \cup {app}]
Step(a) == Acquire(a) \/ RejectBusy(a) \/ Scan(a) \/ Admit(a) \/ RejectBounds(a) \/ Reserve(a)
  \/ (\E copies \in 1..2: PublishCopies(a,copies)) \/ Release(a) \/ Ack(a) \/ Fail(a) \/ Crash(a)
Done == /\ \A a \in Actors: s.pc[a] \in {"done", "dead"}
  /\ UNCHANGED s
Next == (\E a \in Actors: Step(a)) \/ Reopen \/ (\E app \in Apps: RemoveFiles(app)) \/ Done
Spec == Init /\ [][Next]_vars
FairSpec == Spec /\ (\A a \in Actors: WF_vars(Step(a)))
TypeOK == /\ s.pc \in [Actors -> Stages] /\ s.lock \in Actors \cup {"none"}
  /\ s.ledger \in [Apps -> Nat] /\ s.high \in [Apps -> Nat] /\ s.actual \in [Apps -> Nat]
  /\ s.names \subseteq Apps /\ s.everNames \subseteq Apps /\ s.present \subseteq Apps
  /\ s.candidate \in [Actors -> [Apps -> Nat]] /\ s.candidateNames \in [Actors -> SUBSET Apps]
  /\ s.approved \subseteq Actors /\ s.reserved \subseteq Actors /\ s.wrote \subseteq Actors /\ s.returned \subseteq Actors /\ s.denied \subseteq Actors
  /\ s.result \in [Actors -> {"none", "published", "denied", "io", "unknown"}] /\ s.removed \subseteq Apps
  /\ s.accounted \in BOOLEAN /\ s.failed \in BOOLEAN /\ s.crashed \in BOOLEAN /\ s.reopened \in BOOLEAN
QuotaCustody == \A a \in Actors: s.pc[a] \in Critical => s.lock = a
NoLostReservation == /\ s.everNames \subseteq s.names /\ \A app \in Apps: s.ledger[app] >= s.high[app]
PublicationsReserved == s.wrote \subseteq s.reserved
GrantBeforeReservation == s.reserved \subseteq s.approved
QuotaBound == s.accounted => /\ Cardinality(s.names) <= NameBound
  /\ (\A app \in Apps: s.ledger[app] <= PerBound)
  /\ s.ledger["a"] + s.ledger["b"] + Common + 2 * Headroom + LedgerSpare <= AggregateBound
PhysicalCovered == s.accounted => \A app \in s.present: s.actual[app] + Headroom <= s.ledger[app]
DeniedHasNoPublication == s.denied \cap s.wrote = {}
EventuallyDone == <>(\A a \in Actors: s.pc[a] = "done")
NeverAcquire == [][~(\E a \in Actors: Acquire(a))]_vars
NeverRejectBusy == [][~(\E a \in Actors: RejectBusy(a))]_vars
NeverScan == [][~(\E a \in Actors: Scan(a))]_vars
NeverReserve == [][~(\E a \in Actors: Reserve(a))]_vars
NeverPublishCopies == [][~(\E a \in Actors, copies \in 1..2: PublishCopies(a,copies))]_vars
NeverPublishOneCopy == [][~(\E a \in Actors: PublishCopies(a,1))]_vars
NeverPublishBothCopies == [][~(\E a \in Actors: PublishCopies(a,2))]_vars
NeverRejectBounds == [][~(\E a \in Actors: RejectBounds(a))]_vars
NeverFailAfterReserve == [][~(\E a \in Actors: Fail(a) /\ a \in s.reserved)]_vars
NeverCrashAfterReserve == [][~(\E a \in Actors: Crash(a) /\ a \in s.reserved)]_vars
NeverReopen == [][~Reopen]_vars
NeverReserveAfterDelete == [][~(\E a \in Actors: Reserve(a) /\ App(a) \in s.removed)]_vars
NeverRemoveFiles == [][~(\E app \in Apps: RemoveFiles(app))]_vars
=============================================================================
