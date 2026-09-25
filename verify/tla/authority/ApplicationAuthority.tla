----------------------- MODULE ApplicationAuthority -----------------------
EXTENDS Naturals, FiniteSets, Sequences
CONSTANTS Scenario, Mutation
Apps == {"a","b"}
Handles == {1,2,3}
Class(h) == IF h = 3 THEN "receive" ELSE "send"
CapCases == {"cap-exact","cap-class","cap-json","cap-ref","cap-const","cap-agent","cap-unregistered","cap-revoked","cap-evidence"}
MessageCases == {"message-orphan","message-pending","message-valid","message-recipient","message-wrong-class","message-channel","message-channel-mismatch","message-two-identities","message-unregistered-destination","message-revoked-destination"}
RevisionCases == {"revision-base","revision-entry-widen","revision-budget","revision-custom-widen","revision-requirement-widen"}
CapFamily == Scenario \in CapCases
MessageFamily == Scenario \in MessageCases
RevisionFamily == Scenario \in RevisionCases
DispatchFamily == ~(CapFamily \/ MessageFamily \/ RevisionFamily)
Custom == Scenario \in {"custom-stale-observe","custom-stale-writer","custom-plan-drift","reconcile-plan","revision-custom-widen"}
PolicyApp == IF Scenario = "wrong-policy" THEN "b" ELSE "a"
Delivery == Scenario \in {"delivery","route-denial"}
Access == IF Scenario \in {"writer","same-pair-writer","custom-stale-writer"} THEN "write" ELSE "observe"
Supported == Scenario # "unsupported"
Verified == Scenario # "unverified"
InitialRecord == Scenario \in {"reconcile-old","reconcile-plan","frontier-reconcile"}
InitiallyStale == Scenario \in {"default-stale-observe","custom-stale-observe","custom-stale-writer","migrated-episode","reconcile-old"}
BasePlan == [kind |-> IF Delivery THEN "delivery" ELSE "episode", application |-> "a", intent |-> 1,
 source |-> 1, revision |-> 1, memory |-> 1, epoch |-> 1, entry |-> 1, manifest |-> 1,
 arguments |-> 1, process |-> 1, budget |-> 1, access |-> Access, hostProfile |-> 1, recipient |-> 1]
CapHandle == IF Scenario = "cap-class" THEN 3 ELSE IF Scenario = "cap-unregistered" THEN 2 ELSE 1
Port == IF Scenario = "cap-class" THEN "cap-receive" ELSE IF Scenario \in {"cap-json","cap-agent"} THEN "json" ELSE IF Scenario = "cap-ref" THEN "ref" ELSE "cap-send"
Producer == IF Scenario = "cap-const" THEN "const" ELSE IF Scenario = "cap-agent" THEN "agent" ELSE "host"
AdmittedRecipient == IF Scenario = "message-unregistered-destination" THEN 2 ELSE 1
RecordTo == IF Scenario = "message-recipient" THEN 2 ELSE IF Scenario = "message-wrong-class" THEN 3 ELSE AdmittedRecipient
Reachable == Scenario # "message-orphan"
Settled == Scenario \notin {"message-orphan","message-pending"}
WithChannel == Scenario \in {"message-channel","message-channel-mismatch","message-two-identities"}
OldRequirements == IF Scenario = "revision-requirement-widen" THEN {"send"} ELSE {"send","receive"}
NewRequirements == {"send","receive"}
NewEntry == IF Scenario \in {"revision-entry-widen","revision-custom-widen"} THEN {"receive"} ELSE {"send"}
NewBudget == IF Scenario = "revision-budget" THEN 2 ELSE 1
VARIABLE s
vars == <<s>>
Init == s = [pc |-> IF CapFamily THEN "cap-check" ELSE IF MessageFamily THEN "message-parse" ELSE IF RevisionFamily THEN "revision-check" ELSE "idle",
 attempts |-> 0, mode |-> "fresh", record |-> InitialRecord, oldPlan |-> BasePlan, oldConfig |-> 1,
 draft |-> BasePlan, hostAccepted |-> FALSE, calls |-> <<>>, denials |-> {},
 head |-> IF InitiallyStale \/ Scenario \in {"same-pair-observe","same-pair-writer"} THEN 2 ELSE 1,
 revision |-> IF Scenario = "migrated-episode" THEN 2 ELSE 1,
 memory |-> IF InitiallyStale THEN 2 ELSE 1, frontier |-> 1,
 capturedHead |-> 1, capturedRevision |-> 1, capturedMemory |-> 1, capturedConfig |-> 1,
 advanced |-> FALSE, switched |-> FALSE,
 dataSeen |-> FALSE, dataClaims |-> {}, registry |-> {1}, revoked |-> IF Scenario \in {"cap-revoked","message-revoked-destination"} THEN {1} ELSE {},
 capAccepted |-> FALSE, used |-> {}, revisionAccepted |-> FALSE, requirements |-> OldRequirements, entryCaps |-> {"send"}, budget |-> 1,
 parsed |-> FALSE, casVerified |-> FALSE, deliveryVerified |-> FALSE, messageRejected |-> FALSE,
 channel |-> IF Scenario = "message-channel" THEN {<<1,1>>} ELSE IF Scenario = "message-channel-mismatch" THEN {<<2,1>>} ELSE {}, channelAcks |-> {}]
ReceiveModelData == /\ ~s.dataSeen
 /\ s' = [s EXCEPT !.dataSeen = TRUE, !.dataClaims = {2,3}, !.registry = IF Mutation = "evidence-mints" THEN @ \cup {2,3} ELSE @]
Begin == /\ DispatchFamily /\ s.pc = "idle" /\ s.attempts < 2
 /\ s' = [s EXCEPT !.pc = "admit", !.attempts = @ + 1, !.mode = IF s.record THEN "reconcile" ELSE "fresh",
   !.hostAccepted = FALSE, !.capturedHead = s.head, !.capturedRevision = s.revision, !.capturedMemory = s.memory, !.capturedConfig = s.frontier]
DefaultAllows == /\ PolicyApp = "a"
 /\ (IF s.mode = "reconcile" THEN TRUE ELSE IF Delivery THEN Scenario # "route-denial" ELSE
       ((s.capturedRevision = 1 /\ s.capturedMemory = 1) \/ Mutation = "skip-default-selected"))
 /\ (s.mode = "reconcile" \/ Delivery \/ (Supported /\ Verified))
HostAllows == /\ Scenario \notin {"host-denial","no-callback"}
 /\ (Custom \/ DefaultAllows)
ProposedPlan == IF s.mode = "reconcile" THEN
   IF Scenario = "reconcile-plan" THEN [s.oldPlan EXCEPT !.hostProfile = 2] ELSE s.oldPlan
 ELSE IF Scenario = "custom-plan-drift" THEN [BasePlan EXCEPT !.memory = 2] ELSE BasePlan
HostAdmit == /\ s.pc = "admit" /\ (HostAllows \/ Mutation = "ignore-host-denial")
 /\ s' = [s EXCEPT !.draft = ProposedPlan, !.hostAccepted = HostAllows, !.pc = "validate"]
HostDeny == /\ s.pc = "admit" /\ ~HostAllows /\ Mutation # "ignore-host-denial"
 /\ s' = [s EXCEPT !.denials = @ \cup {s.attempts}, !.pc = "return"]
SourceBinding(p) == IF Delivery THEN p.kind = "delivery" /\ Class(p.recipient) = "send" ELSE
 /\ p.kind = "episode" /\ p.application = "a" /\ p.intent = 1 /\ p.source = 1
 /\ p.revision = 1 /\ p.memory = 1 /\ p.epoch = 1 /\ p.entry = 1 /\ p.manifest = 1
 /\ p.arguments = 1 /\ p.process = 1 /\ p.budget = 1
CoreAllows == /\ (SourceBinding(s.draft) \/ Mutation = "skip-source-binding")
 /\ (s.mode # "reconcile" \/ s.draft = s.oldPlan \/ Mutation = "change-old-plan")
 /\ (s.mode # "reconcile" \/ s.capturedConfig = s.oldConfig \/ Mutation = "change-old-config")
 /\ (s.mode # "fresh" \/ Delivery \/ s.draft.access # "write" \/ s.capturedHead = 1 \/ Mutation = "stale-writer")
CoreAdmit == /\ s.pc = "validate" /\ CoreAllows /\ s' = [s EXCEPT !.pc = "invoke"]
CoreDeny == /\ s.pc = "validate" /\ ~CoreAllows
 /\ s' = [s EXCEPT !.denials = @ \cup {s.attempts}, !.pc = "return"]
Invoke == /\ s.pc = "invoke"
 /\ s' = [s EXCEPT !.record = TRUE, !.oldPlan = IF s.mode = "fresh" THEN s.draft ELSE @,
 !.oldConfig = IF s.mode = "fresh" THEN s.capturedConfig ELSE @,
 !.calls = Append(@,[attempt |-> s.attempts, mode |-> s.mode, plan |-> s.draft, original |-> s.oldPlan,
   config |-> s.capturedConfig, originalConfig |-> s.oldConfig, head |-> s.capturedHead, revision |-> s.capturedRevision,
   memory |-> s.capturedMemory, hostAccepted |-> s.hostAccepted]), !.pc = "return"]
Return == /\ s.pc = "return" /\ s' = [s EXCEPT !.pc = "idle"]
AdvanceMemory == /\ DispatchFamily /\ s.pc = "idle" /\ ~s.advanced /\ Scenario = "advance-reconcile"
 /\ s' = [s EXCEPT !.advanced = TRUE, !.head = 2, !.memory = 2]
SwitchFrontier == /\ DispatchFamily /\ s.pc = "idle" /\ ~s.switched /\ Scenario = "frontier-reconcile"
 /\ s' = [s EXCEPT !.switched = TRUE, !.frontier = 2]
CapSyntax == Class(CapHandle) = "send" \/ Mutation = "allow-class-widen"
CapEdge == Port = "cap-send" \/ Mutation \in {"allow-class-widen","allow-edge-widen"}
CapSource == Producer = "host" \/ Mutation = "allow-data-source"
AcceptCap == /\ s.pc = "cap-check" /\ CapSyntax /\ CapEdge /\ CapSource
 /\ s' = [s EXCEPT !.capAccepted = TRUE, !.pc = "cap-resolve"]
DenyCap == /\ s.pc = "cap-check" /\ ~(CapSyntax /\ CapEdge /\ CapSource)
 /\ s' = [s EXCEPT !.pc = "done"]
RegistryAllows == /\ (CapHandle \in s.registry \/ Mutation = "skip-registry")
 /\ (CapHandle \notin s.revoked \/ Mutation = "skip-revocation")
ResolveMailbox == /\ s.pc = "cap-resolve" /\ RegistryAllows
 /\ s' = [s EXCEPT !.used = @ \cup {CapHandle}, !.pc = "done"]
DenyResolution == /\ s.pc = "cap-resolve" /\ ~RegistryAllows /\ s' = [s EXCEPT !.pc = "done"]
RevisionAllows == /\ (NewRequirements \subseteq OldRequirements \/ Mutation = "widen-requirements")
 /\ NewEntry \subseteq NewRequirements
 /\ (Custom \/ ((NewEntry \subseteq {"send"} /\ NewBudget = 1) \/ Mutation = "widen-entry"))
AcceptRevision == /\ s.pc = "revision-check" /\ RevisionAllows
 /\ s' = [s EXCEPT !.revisionAccepted = TRUE, !.requirements = NewRequirements, !.entryCaps = NewEntry, !.budget = NewBudget, !.pc = "done"]
DenyRevision == /\ s.pc = "revision-check" /\ ~RevisionAllows /\ s' = [s EXCEPT !.pc = "done"]
ParseMessage == /\ s.pc = "message-parse" /\ Class(RecordTo) = "send"
 /\ s' = [s EXCEPT !.parsed = TRUE, !.pc = "message-cas"]
DenyMessageClass == /\ s.pc = "message-parse" /\ Class(RecordTo) # "send"
 /\ s' = [s EXCEPT !.messageRejected = TRUE, !.pc = "done"]
VerifyMessageCAS == /\ s.pc = "message-cas"
 /\ s' = [s EXCEPT !.casVerified = TRUE, !.pc = "message-delivery"]
ChannelMatches == IF Mutation = "payload-only-channel" THEN \E row \in s.channel: row[2] = 1 ELSE <<1,1>> \in s.channel
DeliveryAllows == /\ ((Reachable /\ Settled) \/ Mutation = "trust-cas")
 /\ (RecordTo = AdmittedRecipient \/ Mutation = "trust-cas-recipient")
 /\ (~WithChannel \/ ChannelMatches)
VerifyDelivery == /\ s.pc = "message-delivery" /\ DeliveryAllows
 /\ s' = [s EXCEPT !.deliveryVerified = TRUE, !.pc = "done"]
DenyDelivery == /\ s.pc = "message-delivery" /\ ~DeliveryAllows
 /\ s' = [s EXCEPT !.messageRejected = TRUE, !.pc = "done"]
AddChannelIdentity(i) == /\ Scenario = "message-two-identities" /\ i \in {1,2} /\ i \notin s.channelAcks
 /\ s' = [s EXCEPT !.channel = IF Mutation = "dedupe-payload" /\ (\E row \in s.channel: row[2] = 1) THEN @ ELSE @ \cup {<<i,1>>}, !.channelAcks = @ \cup {i}]
Work == Begin \/ HostAdmit \/ HostDeny \/ CoreAdmit \/ CoreDeny \/ Invoke \/ Return
 \/ AcceptCap \/ DenyCap \/ ResolveMailbox \/ DenyResolution \/ AcceptRevision \/ DenyRevision
 \/ ParseMessage \/ DenyMessageClass \/ VerifyMessageCAS \/ VerifyDelivery \/ DenyDelivery
Done == /\ (s.pc = "done" \/ (DispatchFamily /\ s.pc = "idle" /\ s.attempts = 2)) /\ UNCHANGED s
Next == Work \/ ReceiveModelData \/ AdvanceMemory \/ SwitchFrontier \/ (\E i \in {1,2}: AddChannelIdentity(i)) \/ Done
Spec == Init /\ [][Next]_vars
FairSpec == Spec /\ WF_vars(Work)
TypeOK == /\ s.pc \in {"idle","admit","validate","invoke","return","cap-check","cap-resolve","revision-check","message-parse","message-cas","message-delivery","done"}
 /\ s.attempts \in 0..2 /\ s.mode \in {"fresh","reconcile"} /\ Len(s.calls) \in 0..2
 /\ s.registry \subseteq Handles /\ s.revoked \subseteq Handles /\ s.used \subseteq Handles /\ s.frontier \in {1,2}
DataCannotMint == s.registry = {1}
HostDenialPreserved == \A i \in 1..Len(s.calls): s.calls[i].hostAccepted /\ s.calls[i].attempt \notin s.denials
CapturedSource == \A i \in 1..Len(s.calls): SourceBinding(s.calls[i].plan)
FreshWriterCurrent == \A i \in 1..Len(s.calls): s.calls[i].mode = "fresh" /\ ~Delivery /\ s.calls[i].plan.access = "write" => s.calls[i].head = 1
DefaultSelection == ~Custom => \A i \in 1..Len(s.calls): s.calls[i].mode = "fresh" /\ ~Delivery => s.calls[i].revision = 1 /\ s.calls[i].memory = 1 /\ Supported /\ Verified
DefaultNamespace == ~Custom => \A i \in 1..Len(s.calls): PolicyApp = "a"
ReconcilePinned == \A i \in 1..Len(s.calls): s.calls[i].mode = "reconcile" => s.calls[i].plan = s.calls[i].original /\ s.calls[i].config = s.calls[i].originalConfig
ExactCapabilityClass == s.capAccepted => Class(CapHandle) = "send"
ExactCapabilityEdge == s.capAccepted => Port = "cap-send"
NoDataCapabilitySource == s.capAccepted => Producer = "host"
ActiveRegistryRequired == s.used \subseteq s.registry \ s.revoked
RequirementNarrowing == s.requirements \subseteq OldRequirements
DefaultEntryNarrowing == ~Custom => s.entryCaps \subseteq {"send"} /\ s.budget = 1
MessageClass == s.parsed => Class(RecordTo) = "send"
DeliveryEvidenceBound == s.deliveryVerified => s.casVerified /\ Reachable /\ Settled /\ RecordTo = AdmittedRecipient
ChannelEvidenceBound == s.deliveryVerified /\ WithChannel => <<1,1>> \in s.channel
ChannelIdentityRetained == \A i \in s.channelAcks: <<i,1>> \in s.channel
EventuallyReturned == <>(s.pc = "idle" /\ s.attempts = 2)
NeverInvoke == [][~Invoke]_vars
NeverHostDeny == [][~HostDeny]_vars
NeverCoreDeny == [][~CoreDeny]_vars
NeverCustomStaleObserve == [][~(Invoke /\ s.mode = "fresh" /\ s.capturedMemory = 2 /\ Custom /\ s.draft.access = "observe")]_vars
NeverReconcileOldMemory == [][~(Invoke /\ s.mode = "reconcile" /\ s.capturedMemory = 2 /\ s.draft.memory = 1)]_vars
NeverSwitchFrontier == [][~SwitchFrontier]_vars
NeverAdvanceMemory == [][~AdvanceMemory]_vars
NeverAcceptCap == [][~AcceptCap]_vars
NeverDenyCap == [][~DenyCap]_vars
NeverResolveMailbox == [][~ResolveMailbox]_vars
NeverDenyResolution == [][~DenyResolution]_vars
NeverReceiveModelData == [][~ReceiveModelData]_vars
NeverAcceptRevision == [][~AcceptRevision]_vars
NeverDenyRevision == [][~DenyRevision]_vars
NeverParseMessage == [][~ParseMessage]_vars
NeverDenyMessageClass == [][~DenyMessageClass]_vars
NeverCASWithoutSettlement == [][~(VerifyMessageCAS /\ ~Settled)]_vars
NeverCASForgedRecipient == [][~(VerifyMessageCAS /\ RecordTo = 2)]_vars
NeverVerifyDelivery == [][~VerifyDelivery]_vars
NeverDenyDelivery == [][~DenyDelivery]_vars
NeverDeliveryUnregistered == [][~(VerifyDelivery /\ RecordTo \notin s.registry)]_vars
NeverDeliveryRevoked == [][~(VerifyDelivery /\ RecordTo \in s.revoked)]_vars
NeverBothIdentities == [][~(\E i \in {1,2}: AddChannelIdentity(i) /\ s.channelAcks # {})]_vars
=============================================================================
