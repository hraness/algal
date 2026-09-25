----------------------------- MODULE Custody -----------------------------
EXTENDS Naturals, FiniteSets

CONSTANTS Mutation, Independent, Legacy, Capacity, Prepared
Actors == IF Independent THEN {"one", "two"} ELSE {"creator", "late", "live"}
Apps == IF Independent THEN Actors ELSE {"main"}
Heads == Actors \cup {"none"}
App(a) == IF Independent THEN a ELSE "main"
Expected(a) == IF Independent \/ a = "creator" THEN "none" ELSE "creator"
Old(a) == Legacy /\ a = "live"
Primary(app) == IF Mutation = "global" THEN "global" ELSE app
Locks == Apps \cup {"global"}

VARIABLES head, present, pc, selected, primary, legacy, charged, published, acked
vars == <<head, present, pc, selected, primary, legacy, charged, published, acked>>
Init == /\ head = [app \in Apps |-> "none"]
        /\ present = IF Prepared THEN Apps ELSE {}
        /\ pc = [a \in Actors |-> "select"]
        /\ selected = [a \in Actors |-> "primary"]
        /\ primary = [l \in Locks |-> "none"]
        /\ legacy = [app \in Apps |-> "none"]
        /\ charged = IF Prepared THEN Apps ELSE {}
        /\ published = {} /\ acked = {}

Select(a) ==
  /\ pc[a] = "select"
  /\ selected' = [selected EXCEPT ![a] =
       IF (Old(a) \/ Mutation = "cutover") /\ head[App(a)] # "none"
       THEN "legacy" ELSE "primary"]
  /\ pc' = [pc EXCEPT ![a] = "acquire"]
  /\ UNCHANGED <<head, present, primary, legacy, charged, published, acked>>
AcquirePrimary(a) ==
  /\ pc[a] = "acquire" /\ selected[a] = "primary"
  /\ primary[Primary(App(a))] = "none"
  /\ primary' = [primary EXCEPT ![Primary(App(a))] = a]
  /\ pc' = [pc EXCEPT ![a] = "namespace"]
  /\ UNCHANGED <<head, present, selected, legacy, charged, published, acked>>
RejectPrimary(a) ==
  /\ pc[a] = "acquire" /\ selected[a] = "primary"
  /\ primary[Primary(App(a))] # "none"
  /\ pc' = [pc EXCEPT ![a] = "done"]
  /\ UNCHANGED <<head, present, selected, primary, legacy, charged, published, acked>>
RecheckNamespace(a) ==
  /\ pc[a] = "namespace"
  /\ pc' = [pc EXCEPT ![a] =
       IF App(a) \in present /\ ~Old(a) /\ Mutation # "cutover"
       THEN "legacy-existing" ELSE "check"]
  /\ UNCHANGED <<head, present, selected, primary, legacy, charged, published, acked>>
AcquireLegacy(a) ==
  /\ (pc[a] = "acquire" /\ selected[a] = "legacy")
      \/ pc[a] \in {"legacy-existing", "legacy-new"}
  /\ legacy[App(a)] = "none"
  /\ legacy' = [legacy EXCEPT ![App(a)] = a]
  /\ present' = present \cup {App(a)}
  /\ pc' = [pc EXCEPT ![a] = IF pc[a] = "legacy-new" THEN "publish" ELSE "check"]
  /\ UNCHANGED <<head, selected, primary, charged, published, acked>>
RejectLegacy(a) ==
  /\ (pc[a] = "acquire" /\ selected[a] = "legacy")
      \/ pc[a] \in {"legacy-existing", "legacy-new"}
  /\ legacy[App(a)] # "none"
  /\ pc' = [pc EXCEPT ![a] = "release-error"]
  /\ UNCHANGED <<head, present, selected, primary, legacy, charged, published, acked>>
Check(a) ==
  /\ pc[a] = "check"
  /\ pc' = [pc EXCEPT ![a] =
       IF Mutation = "skip-check" \/ head[App(a)] = Expected(a)
       THEN "admit" ELSE "release-error"]
  /\ UNCHANGED <<head, present, selected, primary, legacy, charged, published, acked>>
Admit(a) ==
  /\ pc[a] = "admit"
  /\ pc' = [pc EXCEPT ![a] = "reserve"]
  /\ UNCHANGED <<head, present, selected, primary, legacy, charged, published, acked>>
Deny(a) ==
  /\ pc[a] = "admit"
  /\ pc' = [pc EXCEPT ![a] = "release-error"]
  /\ UNCHANGED <<head, present, selected, primary, legacy, charged, published, acked>>
Reserve(a) ==
  /\ pc[a] = "reserve"
  /\ App(a) \in charged \/ Cardinality(charged) < Capacity
  /\ charged' = charged \cup {App(a)}
  /\ present' = IF Old(a) \/ Mutation = "cutover" THEN present \cup {App(a)} ELSE present
  /\ pc' = [pc EXCEPT ![a] =
       IF Old(a) \/ Mutation = "cutover" \/ legacy[App(a)] = a
       THEN "publish" ELSE "legacy-new"]
  /\ UNCHANGED <<head, selected, primary, legacy, published, acked>>
RejectCapacity(a) ==
  /\ pc[a] = "reserve" /\ App(a) \notin charged /\ Cardinality(charged) >= Capacity
  /\ pc' = [pc EXCEPT ![a] = "release-error"]
  /\ UNCHANGED <<head, present, selected, primary, legacy, charged, published, acked>>
Publish(a) ==
  /\ pc[a] = "publish"
  /\ head' = [head EXCEPT ![App(a)] = a]
  /\ published' = published \cup {[app |-> App(a), parent |-> Expected(a), child |-> a]}
  /\ pc' = [pc EXCEPT ![a] = "release-ok"]
  /\ UNCHANGED <<present, selected, primary, legacy, charged, acked>>
ReleaseEarly(a) ==
  /\ Mutation = "early-release" /\ pc[a] = "publish"
  /\ primary[Primary(App(a))] = a \/ legacy[App(a)] = a
  /\ primary' = [l \in Locks |-> IF primary[l] = a THEN "none" ELSE primary[l]]
  /\ legacy' = [app \in Apps |-> IF legacy[app] = a THEN "none" ELSE legacy[app]]
  /\ UNCHANGED <<head, present, pc, selected, charged, published, acked>>
Release(a) ==
  /\ pc[a] \in {"release-ok", "release-error"}
  /\ primary' = [l \in Locks |-> IF primary[l] = a THEN "none" ELSE primary[l]]
  /\ legacy' = [app \in Apps |-> IF legacy[app] = a THEN "none" ELSE legacy[app]]
  /\ pc' = [pc EXCEPT ![a] = IF pc[a] = "release-ok" THEN "ack" ELSE "done"]
  /\ UNCHANGED <<head, present, selected, charged, published, acked>>
Ack(a) ==
  /\ pc[a] = "ack"
  /\ acked' = acked \cup {a}
  /\ pc' = [pc EXCEPT ![a] = "done"]
  /\ UNCHANGED <<head, present, selected, primary, legacy, charged, published>>
ActorStep(a) == Select(a) \/ AcquirePrimary(a) \/ RejectPrimary(a) \/ RecheckNamespace(a)
  \/ AcquireLegacy(a) \/ RejectLegacy(a) \/ Check(a) \/ Admit(a) \/ Deny(a)
  \/ Reserve(a) \/ RejectCapacity(a) \/ Publish(a) \/ ReleaseEarly(a) \/ Release(a) \/ Ack(a)
Done == /\ \A a \in Actors: pc[a] = "done" /\ UNCHANGED vars
Next == (\E a \in Actors: ActorStep(a)) \/ Done
Spec == Init /\ [][Next]_vars
FairSpec == Spec /\ (\A a \in Actors: WF_vars(ActorStep(a)))

TypeOK == /\ head \in [Apps -> Heads] /\ present \subseteq Apps
          /\ pc \in [Actors -> {"select", "acquire", "namespace", "legacy-existing", "legacy-new", "check", "admit", "reserve", "publish", "release-ok", "release-error", "ack", "done"}]
          /\ selected \in [Actors -> {"primary", "legacy"}]
          /\ primary \in [Locks -> Heads] /\ legacy \in [Apps -> Heads]
          /\ charged \subseteq Apps /\ acked \subseteq Actors
          /\ published \subseteq [app: Apps, parent: Heads, child: Actors]
NoSibling == \A app \in Apps: \A p \in Heads:
  Cardinality({e \in published: e.app = app /\ e.parent = p}) <= 1
AckWasPublished == \A a \in acked: \E e \in published: e.child = a
CapacityBound == Cardinality(charged) <= Capacity
NamespaceCharged == present \subseteq charged
CriticalSectionCustody == \A a \in Actors:
  pc[a] \in {"check", "admit", "reserve", "publish"} =>
    IF Old(a) \/ Mutation = "cutover"
    THEN IF selected[a] = "primary" THEN primary[Primary(App(a))] = a ELSE legacy[App(a)] = a
    ELSE /\ primary[Primary(App(a))] = a
         /\ (App(a) \in present => legacy[App(a)] = a)
IndependentEnabled == Independent => (\A a,b \in Actors:
  (a # b /\ pc[a] = "admit" /\ pc[b] = "acquire") => ENABLED AcquirePrimary(b))
EventuallyDone == <>(\A a \in Actors: pc[a] = "done")

NeverSelect == [][~(\E a \in Actors: Select(a))]_vars
NeverAcquirePrimary == [][~(\E a \in Actors: AcquirePrimary(a))]_vars
NeverAcquireLegacy == [][~(\E a \in Actors: AcquireLegacy(a))]_vars
NeverCheck == [][~(\E a \in Actors: Check(a))]_vars
NeverAdmit == [][~(\E a \in Actors: Admit(a))]_vars
NeverDeny == [][~(\E a \in Actors: Deny(a))]_vars
NeverReserve == [][~(\E a \in Actors: Reserve(a))]_vars
NeverRejectCapacity == [][~(\E a \in Actors: RejectCapacity(a))]_vars
NeverPublish == [][~(\E a \in Actors: Publish(a))]_vars
NeverRelease == [][~(\E a \in Actors: Release(a))]_vars
NeverAck == [][~(\E a \in Actors: Ack(a))]_vars
=============================================================================
