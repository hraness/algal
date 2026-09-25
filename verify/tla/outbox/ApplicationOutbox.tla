--------------------------- MODULE ApplicationOutbox ---------------------------
EXTENDS Naturals, FiniteSets
CONSTANTS Mutation, Scenario, BatchLimit
Intents == {1,2}
Unsettled == {"started","blocked","uncertain"}
Statuses == Unsettled \cup {"absent","settled"}
Episode == Scenario \in {"stale-episode","writer","same-pair-writer","migrate-episode"}
Writer == Scenario \in {"writer","same-pair-writer"}
Faults == Scenario \in {"faults","settlement-quota","memory-reconcile"}
InitialRetained == IF Scenario \in {"blocked-first","drift-plan","drift-config","memory-reconcile","activation-barrier"} THEN {1} ELSE {}
Reachable == IF Scenario = "orphan" THEN {1} ELSE Intents
VARIABLE s
vars == <<s>>
Init == s = [pc |-> "idle", owner |-> FALSE, mode |-> "fresh", position |-> 1, selected |-> 0,
  scans |-> 0, reconciliations |-> 0, used |-> 0, completedFresh |-> 0, startedThisScan |-> 0,
  status |-> [i \in Intents |-> IF i \in InitialRetained THEN "blocked" ELSE "absent"],
  admitted |-> InitialRetained, plan |-> [i \in Intents |-> IF i \in InitialRetained THEN 1 ELSE 0],
  config |-> [i \in Intents |-> IF i \in InitialRetained THEN 1 ELSE 0],
  freshCalls |-> [i \in Intents |-> 0], reconcileCalls |-> [i \in Intents |-> 0],
  callPlan |-> [i \in Intents |-> 0], callConfig |-> [i \in Intents |-> 0],
  callHead |-> [i \in Intents |-> 0], callRevision |-> [i \in Intents |-> 0], callMemory |-> [i \in Intents |-> 0],
  outstanding |-> InitialRetained, applied |-> {}, resultCAS |-> {}, messages |-> {}, abandoned |-> {},
  head |-> 1, revision |-> 1, memory |-> 1, environmentConfig |-> 1,
  capturedHead |-> 1, capturedRevision |-> 1, capturedMemory |-> 1, capturedConfig |-> 1,
  proposedPlan |-> 0, proposedStatus |-> "uncertain", failed |-> FALSE, crashed |-> FALSE,
  reopened |-> FALSE, advanced |-> FALSE, switched |-> FALSE, badActivation |-> FALSE]
Candidates == (IF Mutation = "orphan-dispatch" THEN Intents ELSE Reachable) \ s.abandoned
Pending(i) == i \in Candidates /\ s.status[i] # "settled"
HostAllows(i) == /\ ~(Scenario = "deny-first" /\ i = 1)
  /\ (~Episode \/ (s.capturedRevision = 1 /\ s.capturedMemory = 1))
  /\ (~Writer \/ s.capturedHead = 1 \/ Mutation = "stale-writer")
HasUnsettled == \E i \in Reachable \ s.abandoned: s.status[i] \in Unsettled
BeginScan == /\ s.pc = "idle" /\ s.scans < 2
  /\ s' = [s EXCEPT !.pc = "scan", !.owner = TRUE, !.mode = "fresh", !.position = 1,
    !.scans = @ + 1, !.used = 0, !.completedFresh = 0, !.startedThisScan = 0,
    !.capturedHead = s.head, !.capturedRevision = s.revision, !.capturedMemory = s.memory, !.capturedConfig = s.environmentConfig]
SkipUnselected == /\ s.pc = "scan" /\ s.position \in Intents /\ ~Pending(s.position)
  /\ s' = [s EXCEPT !.position = @ + 1]
ReturnRetained == /\ s.pc = "scan" /\ s.position \in Intents /\ Pending(s.position) /\ s.status[s.position] \in Unsettled
  /\ s' = [s EXCEPT !.position = @ + 1, !.used = IF Mutation = "charge-retained" THEN @ + 1 ELSE @]
SkipBudget == /\ s.pc = "scan" /\ s.position \in Intents /\ Pending(s.position) /\ s.status[s.position] = "absent" /\ s.used >= BatchLimit
  /\ s' = [s EXCEPT !.position = @ + 1]
SelectFresh == /\ s.pc = "scan" /\ s.position \in Intents /\ Pending(s.position) /\ s.status[s.position] = "absent" /\ s.used < BatchLimit
  /\ s' = [s EXCEPT !.selected = s.position, !.pc = "admit"]
DenyFresh == /\ s.pc = "admit" /\ ~HostAllows(s.selected)
  /\ s' = [s EXCEPT !.pc = "advance", !.used = IF Mutation = "charge-denied" THEN @ + 1 ELSE @]
AdmitFresh == /\ s.pc = "admit" /\ HostAllows(s.selected)
  /\ s' = [s EXCEPT !.proposedPlan = 1, !.pc = IF Mutation = "invoke-before-started" THEN "invoke" ELSE "start"]
PublishStarted == /\ s.pc = "start"
  /\ s' = [s EXCEPT !.status[s.selected] = "started", !.admitted = @ \cup {s.selected},
    !.plan[s.selected] = s.proposedPlan, !.config[s.selected] = s.capturedConfig, !.pc = "invoke"]
InvokeFresh == /\ s.pc = "invoke" /\ s.mode = "fresh"
  /\ s' = [s EXCEPT !.freshCalls[s.selected] = @ + 1, !.startedThisScan = @ + 1,
    !.outstanding = IF s.selected \notin s.applied THEN @ \cup {s.selected} ELSE @,
    !.callPlan[s.selected] = s.proposedPlan, !.callConfig[s.selected] = s.capturedConfig,
    !.callHead[s.selected] = s.capturedHead, !.callRevision[s.selected] = s.capturedRevision, !.callMemory[s.selected] = s.capturedMemory, !.pc = "await"]
PossibleEffect == /\ s.pc = "await" /\ s.selected \in s.outstanding
  /\ s' = [s EXCEPT !.applied = @ \cup {s.selected}, !.outstanding = @ \ {s.selected}]
LateEffect(i) == /\ i \in s.outstanding
  /\ s' = [s EXCEPT !.applied = @ \cup {i}, !.outstanding = @ \ {i}]
AdapterReturn(outcome) == /\ s.pc = "await" /\ outcome \in {"settled","blocked","uncertain"}
  /\ s' = [s EXCEPT !.proposedStatus = outcome, !.pc = IF outcome = "settled" THEN "result" ELSE "settle"]
RetainResult == /\ s.pc = "result"
  /\ s' = [s EXCEPT !.resultCAS = @ \cup {s.selected}, !.pc = "mint"]
MintMessage == /\ s.pc = "mint"
  /\ s' = [s EXCEPT !.messages = IF ~Episode /\ Scenario # "oversize" THEN @ \cup {s.selected} ELSE @, !.pc = "settle"]
PublishOutcome == /\ s.pc = "settle"
  /\ s' = [s EXCEPT !.status[s.selected] = s.proposedStatus,
    !.used = IF s.mode = "fresh" THEN @ + 1 ELSE @,
    !.completedFresh = IF s.mode = "fresh" THEN @ + 1 ELSE @,
    !.pc = IF s.mode = "fresh" THEN "advance" ELSE "release"]
AdvanceScan == /\ s.pc = "advance"
  /\ s' = [s EXCEPT !.position = @ + 1, !.pc = "scan"]
FinishScan == /\ s.pc = "scan" /\ s.position = 3 /\ s' = [s EXCEPT !.pc = "release"]
Release == /\ s.pc = "release" /\ s' = [s EXCEPT !.pc = "idle", !.owner = FALSE]
BeginReconcile(i) == /\ s.pc = "idle" /\ s.reconciliations < 1
  /\ i \in Reachable \ s.abandoned /\ s.status[i] \in Unsettled
  /\ s' = [s EXCEPT !.pc = "reconcile-admit", !.owner = TRUE, !.mode = "reconcile",
    !.reconciliations = @ + 1, !.selected = i, !.capturedConfig = s.environmentConfig,
    !.capturedHead = s.head, !.capturedRevision = s.revision, !.capturedMemory = s.memory,
    !.proposedPlan = IF Scenario = "drift-plan" \/ Mutation = "change-old-plan" THEN 2 ELSE s.plan[i]]
ReconcileAllowed == /\ (s.capturedConfig = s.config[s.selected] \/ Mutation = "change-old-config")
  /\ (s.proposedPlan = s.plan[s.selected] \/ Mutation = "change-old-plan")
DenyReconcile == /\ s.pc = "reconcile-admit" /\ ~ReconcileAllowed /\ s' = [s EXCEPT !.pc = "release"]
InvokeReconcile == /\ s.pc = "reconcile-admit" /\ ReconcileAllowed
  /\ s' = [s EXCEPT !.reconcileCalls[s.selected] = @ + 1,
    !.outstanding = IF s.selected \notin s.applied THEN @ \cup {s.selected} ELSE @,
    !.callPlan[s.selected] = s.proposedPlan, !.callConfig[s.selected] = s.capturedConfig, !.pc = "await"]
Fail == /\ Faults /\ ~s.failed /\ s.pc \in {"start","invoke","result","mint","settle","advance","release"}
  /\ s' = [s EXCEPT !.failed = TRUE, !.pc = "release"]
Crash == /\ Faults /\ ~s.crashed /\ s.owner
  /\ s' = [s EXCEPT !.crashed = TRUE, !.pc = "idle", !.owner = FALSE]
Reopen == /\ s.crashed /\ ~s.reopened /\ s' = [s EXCEPT !.reopened = TRUE]
AdvanceMemory == /\ s.pc = "idle" /\ ~s.advanced /\ Scenario \in {"memory-reconcile","stale-episode","writer"}
  /\ s' = [s EXCEPT !.advanced = TRUE, !.head = 2, !.memory = 2]
AdvanceHead == /\ s.pc = "idle" /\ ~s.advanced /\ Scenario = "same-pair-writer"
  /\ s' = [s EXCEPT !.advanced = TRUE, !.head = 2]
Activate == /\ s.pc = "idle" /\ ~s.advanced /\ Scenario = "activation-barrier"
  /\ (~HasUnsettled \/ Mutation = "ignore-activation-barrier")
  /\ s' = [s EXCEPT !.advanced = TRUE, !.head = 2, !.revision = 2, !.badActivation = HasUnsettled]
Migrate(omit) == /\ s.pc = "idle" /\ ~s.advanced /\ Scenario = "migrate-episode" /\ ~HasUnsettled
  /\ omit \subseteq {i \in Reachable: s.status[i] = "absent"}
  /\ s' = [s EXCEPT !.advanced = TRUE, !.head = 2, !.revision = 2, !.memory = 2, !.abandoned = @ \cup omit]
SwitchConfig == /\ s.pc = "idle" /\ ~s.switched /\ Scenario = "drift-config"
  /\ s' = [s EXCEPT !.switched = TRUE, !.environmentConfig = 2]
ForgetDispatch(i) == /\ Mutation = "forget-dispatch" /\ s.pc = "idle" /\ i \in s.admitted /\ s.status[i] \in Unsettled
  /\ s' = [s EXCEPT !.status[i] = "absent"]
WorkStep == BeginScan \/ SkipUnselected \/ ReturnRetained \/ SkipBudget \/ SelectFresh \/ DenyFresh \/ AdmitFresh \/ PublishStarted
  \/ InvokeFresh \/ PossibleEffect \/ (\E outcome \in {"settled","blocked","uncertain"}: AdapterReturn(outcome))
  \/ RetainResult \/ MintMessage \/ PublishOutcome \/ AdvanceScan \/ FinishScan \/ Release
  \/ (\E i \in Intents: BeginReconcile(i)) \/ DenyReconcile \/ InvokeReconcile \/ Fail \/ Crash
Done == /\ s.pc = "idle" /\ s.scans = 2 /\ UNCHANGED s
Next == WorkStep \/ (\E i \in Intents: LateEffect(i)) \/ Reopen \/ AdvanceMemory \/ AdvanceHead \/ Activate \/ (\E omit \in SUBSET Intents: Migrate(omit)) \/ SwitchConfig \/ (\E i \in Intents: ForgetDispatch(i)) \/ Done
Spec == Init /\ [][Next]_vars
FairSpec == Spec /\ WF_vars(WorkStep)
TypeOK == /\ s.pc \in {"idle","scan","admit","start","invoke","await","result","mint","settle","advance","release","reconcile-admit"}
  /\ s.owner \in BOOLEAN /\ s.mode \in {"fresh","reconcile"} /\ s.position \in 1..3 /\ s.selected \in 0..2
  /\ s.scans \in 0..2 /\ s.reconciliations \in 0..1 /\ s.used \in Nat /\ s.completedFresh \in Nat /\ s.startedThisScan \in Nat
  /\ s.status \in [Intents -> Statuses] /\ s.admitted \subseteq Intents
  /\ s.plan \in [Intents -> 0..2] /\ s.config \in [Intents -> 0..2]
  /\ s.freshCalls \in [Intents -> Nat] /\ s.reconcileCalls \in [Intents -> Nat]
  /\ s.callPlan \in [Intents -> 0..2] /\ s.callConfig \in [Intents -> 0..2]
  /\ s.callHead \in [Intents -> 0..2] /\ s.callRevision \in [Intents -> 0..2] /\ s.callMemory \in [Intents -> 0..2]
  /\ s.head \in 1..2 /\ s.revision \in 1..2 /\ s.memory \in 1..2 /\ s.environmentConfig \in 1..2
  /\ s.capturedHead \in 1..2 /\ s.capturedRevision \in 1..2 /\ s.capturedMemory \in 1..2 /\ s.capturedConfig \in 1..2
  /\ s.proposedPlan \in 0..2 /\ s.proposedStatus \in {"settled","blocked","uncertain"}
  /\ s.failed \in BOOLEAN /\ s.crashed \in BOOLEAN /\ s.reopened \in BOOLEAN /\ s.advanced \in BOOLEAN /\ s.switched \in BOOLEAN /\ s.badActivation \in BOOLEAN
  /\ s.outstanding \subseteq Intents /\ s.applied \subseteq Intents /\ s.resultCAS \subseteq Intents /\ s.messages \subseteq Intents /\ s.abandoned \subseteq Intents
Custody == (s.pc # "idle") = s.owner
InvocationNeedsStarted == \A i \in Intents: s.freshCalls[i] > 0 => i \in s.admitted
OnlyReachableInvokes == \A i \in Intents: s.freshCalls[i] + s.reconcileCalls[i] > 0 => i \in Reachable
FreshSourceMatched == Episode => \A i \in Intents: s.freshCalls[i] > 0 =>
  /\ s.callRevision[i] = 1 /\ s.callMemory[i] = 1 /\ (~Writer \/ s.callHead[i] = 1)
NoFreshRedispatch == \A i \in Intents: s.freshCalls[i] <= 1
AdmissionRetained == \A i \in s.admitted: s.status[i] # "absent"
ReconcilePinned == \A i \in Intents: s.reconcileCalls[i] > 0 => s.callPlan[i] = s.plan[i] /\ s.callConfig[i] = s.config[i]
BudgetCountsFreshOnly == s.used = s.completedFresh
BatchBound == /\ s.used <= BatchLimit /\ s.startedThisScan <= BatchLimit
SettlementHasResult == \A i \in Intents: s.status[i] = "settled" => i \in s.resultCAS
BoundedMessageClaim == s.messages \subseteq s.resultCAS
AbandonUnadmitted == s.abandoned \cap s.admitted = {}
ActivationBarrier == ~s.badActivation
EventuallyScansReturn == <>(s.pc = "idle" /\ s.scans = 2)
NeverPublishStarted == [][~PublishStarted]_vars
NeverInvokeFresh == [][~InvokeFresh]_vars
NeverReturnRetained == [][~ReturnRetained]_vars
NeverDenyFresh == [][~DenyFresh]_vars
NeverPossibleEffect == [][~PossibleEffect]_vars
NeverLateEffectOtherInvocation == [][~(\E i \in Intents: LateEffect(i) /\ s.crashed /\ s.status[i] = "started" /\ s.pc = "await" /\ s.selected # i)]_vars
NeverLateEffectAfterUncertainReturn == [][~(\E i \in Intents: LateEffect(i) /\ s.status[i] = "uncertain" /\ s.pc = "await" /\ s.selected # i)]_vars
NeverRetainResult == [][~RetainResult]_vars
NeverMintMessage == [][~MintMessage]_vars
NeverPublishOutcome == [][~PublishOutcome]_vars
NeverInvokeReconcile == [][~InvokeReconcile]_vars
NeverReconcileAfterMemory == [][~(InvokeReconcile /\ s.capturedMemory = 2)]_vars
NeverDenyReconcile == [][~DenyReconcile]_vars
NeverFailAfterEffect == [][~(Fail /\ s.selected \in s.applied /\ s.status[s.selected] = "started") ]_vars
NeverFailSettlementQuota == [][~(Fail /\ s.pc = "settle" /\ s.proposedStatus = "settled" /\ s.selected \in s.applied /\ s.selected \in s.resultCAS /\ s.status[s.selected] = "started") ]_vars
NeverCrashAfterEffect == [][~(Crash /\ s.pc = "await" /\ s.selected \in s.applied)]_vars
NeverAdvanceMemory == [][~AdvanceMemory]_vars
NeverAdvanceHead == [][~AdvanceHead]_vars
NeverActivate == [][~Activate]_vars
NeverMigrate == [][~(\E omit \in SUBSET Intents: Migrate(omit))]_vars
NeverMigrateRetainingBoth == [][~Migrate({})]_vars
NeverSwitchConfig == [][~SwitchConfig]_vars
=============================================================================
