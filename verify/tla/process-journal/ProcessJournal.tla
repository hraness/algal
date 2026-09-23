-------------------------- MODULE ProcessJournal --------------------------
EXTENDS Naturals, Sequences, FiniteSets
CONSTANTS Count, RecoveryLimit, Invocations, ReadOnly, Faults, Mutation,
          InitialPending, InitialRecoveries, Drift, Corruption
Occurrences == 1..Count
Receipts == {"red", "blue", "known-error"}
Kind(i) == IF ReadOnly \/ i % 2 = 0 THEN "read" ELSE "write"
Record(state, attempt, prior, receipt, configuration) ==
  [state |-> state, attempt |-> attempt, prior |-> prior,
   receipt |-> receipt, configuration |-> configuration]
Empty == Record("empty", 0, 0, "none", "none")
InitialHead(i) == IF InitialPending /\ i = 1
                  THEN Record("started", 0, 0, "none", "old") ELSE Empty
InitialChain(i) == IF InitialPending /\ i = 1 THEN <<InitialHead(i)>> ELSE <<>>
InitialToken == [ordinal |-> 1, attempt |-> 0, invocation |-> 0]
Tokens == [ordinal: Occurrences, attempt: 0..(RecoveryLimit+1), invocation: 0..Invocations]
Records == [state: {"empty", "started", "completed"}, attempt: 0..(RecoveryLimit+1),
            prior: 0..(2*(RecoveryLimit+1)), receipt: Receipts \cup {"none"},
            configuration: {"none", "old", "new"}]
VARIABLES s, dispatches, returns
vars == <<s, dispatches, returns>>
CurrentConfiguration == IF Drift /\ s.recovering THEN "new" ELSE "old"
CurrentToken == [ordinal |-> s.cursor, attempt |-> s.head[s.cursor].attempt,
                 invocation |-> s.invocation]
OwnsAdapter(t) == IF s.pc \in {"inflight", "outcome"} THEN t = CurrentToken ELSE FALSE
Init == \E alreadyApplied \in (IF InitialPending THEN BOOLEAN ELSE {FALSE}):
  /\ s = [pc |-> IF InitialPending THEN "open" ELSE "prepare",
           intent |-> InitialPending, selected |-> InitialPending, header |-> InitialPending,
           invocation |-> 1, cursor |-> 1, recoveries |-> InitialRecoveries, chargedInvocations |-> {},
           recovering |-> FALSE, poisoned |-> FALSE, poisonSeen |-> FALSE,
           head |-> [i \in Occurrences |-> InitialHead(i)],
           chain |-> [i \in Occurrences |-> InitialChain(i)],
           cas |-> { [ordinal |-> i, record |-> InitialHead(i)] :
                       i \in {j \in Occurrences : InitialHead(j).state # "empty"} },
           candidate |-> Empty, currentReceipt |-> "none",
           outstanding |-> IF InitialPending THEN {InitialToken} ELSE {},
           applied |-> IF alreadyApplied THEN {InitialToken} ELSE {},
           bad |-> "none", finished |-> FALSE]
  /\ dispatches = IF InitialPending
       THEN <<[ordinal |-> 1, attempt |-> 0, invocation |-> 0,
               intent |-> TRUE, selected |-> TRUE, header |-> TRUE, started |-> TRUE,
               charged |-> TRUE, poisonSeen |-> FALSE, binding |-> TRUE]>> ELSE <<>>
  /\ returns = <<>>

PrepareIntentCAS ==
  /\ s.pc = "prepare" /\ ~s.intent
  /\ s' = [s EXCEPT !.intent = TRUE]
  /\ UNCHANGED <<dispatches, returns>>
CreateHeader ==
  /\ s.pc = "prepare" /\ ~s.header
  /\ s' = [s EXCEPT !.header = TRUE]
  /\ UNCHANGED <<dispatches, returns>>
PublishIntent ==
  /\ s.pc = "prepare" /\ s.header
  /\ (s.intent \/ Mutation = "skip-intent")
  /\ s' = [s EXCEPT !.selected = Mutation # "skip-selected-intent", !.pc = "before"]
  /\ UNCHANGED <<dispatches, returns>>
BindingMatches == s.head[s.cursor].state = "empty" \/
                  s.head[s.cursor].configuration = CurrentConfiguration
Before ==
  /\ s.pc = "before" /\ s.cursor \in Occurrences /\ ~s.poisoned
  /\ s' = [s EXCEPT !.pc =
       IF ~BindingMatches /\ Mutation # "skip-binding-check" THEN "poison"
       ELSE IF s.head[s.cursor].state = "completed" /\ Mutation # "repeat-completed"
            THEN "replay"
       ELSE IF s.head[s.cursor].state # "empty" /\
               (~s.recovering \/ (Kind(s.cursor) # "read" /\ Mutation # "repeat-write"))
            THEN "poison"
       ELSE "start-cas",
       !.candidate = Record("started",
         IF s.head[s.cursor].state = "empty" THEN 0 ELSE s.head[s.cursor].attempt + 1,
         Len(s.chain[s.cursor]), "none", CurrentConfiguration)]
  /\ UNCHANGED <<dispatches, returns>>
WriteStartCAS ==
  /\ s.pc = "start-cas"
  /\ s' = [s EXCEPT !.cas = @ \cup {[ordinal |-> s.cursor, record |-> s.candidate]},
                    !.pc = "start-head"]
  /\ UNCHANGED <<dispatches, returns>>
PublishStarted ==
  /\ s.pc = "start-head"
  /\ s' = [s EXCEPT !.head[s.cursor] = s.candidate,
                    !.chain[s.cursor] = Append(@, s.candidate), !.pc = "start-return"]
  /\ UNCHANGED <<dispatches, returns>>
ReturnStarted ==
  /\ s.pc = "start-return"
  /\ s' = [s EXCEPT !.pc = IF s.poisoned /\ Mutation \notin {"skip-postwrite-health", "skip-start-health"}
                           THEN "poisoned" ELSE "dispatch"]
  /\ UNCHANGED <<dispatches, returns>>
Dispatch ==
  /\ s.pc = "dispatch"
  /\ dispatches' = Append(dispatches,
      [ordinal |-> s.cursor, attempt |-> s.head[s.cursor].attempt,
       invocation |-> s.invocation, intent |-> s.intent, selected |-> s.selected,
       header |-> s.header, started |-> s.head[s.cursor].state = "started",
       charged |-> s.head[s.cursor].attempt <= s.recoveries /\
          (~s.recovering \/ s.invocation \in s.chargedInvocations),
       poisonSeen |-> s.poisonSeen, binding |-> BindingMatches])
  /\ s' = [s EXCEPT !.pc = "inflight", !.outstanding = @ \cup {CurrentToken}]
  /\ UNCHANGED returns
Apply ==
  /\ s.pc = "inflight"
  /\ s' = [s EXCEPT !.applied = @ \cup {CurrentToken}, !.pc = "outcome"]
  /\ UNCHANGED <<dispatches, returns>>
KnownResult(receipt) ==
  /\ s.pc = "outcome" /\ receipt \in Receipts
  /\ s' = [s EXCEPT !.candidate = Record("completed", s.head[s.cursor].attempt,
                        Len(s.chain[s.cursor]), receipt, s.head[s.cursor].configuration),
                    !.currentReceipt = receipt, !.pc = "complete-cas",
                    !.outstanding = @ \ {CurrentToken}]
  /\ UNCHANGED <<dispatches, returns>>
KnownFailure ==
  /\ s.pc = "inflight"
  /\ s' = [s EXCEPT !.candidate = Record("completed", s.head[s.cursor].attempt,
                        Len(s.chain[s.cursor]), "known-error", s.head[s.cursor].configuration),
                    !.currentReceipt = "known-error", !.pc = "complete-cas",
                    !.outstanding = @ \ {CurrentToken}]
  /\ UNCHANGED <<dispatches, returns>>
WriteCompletedCAS ==
  /\ s.pc = "complete-cas"
  /\ s' = [s EXCEPT !.cas = @ \cup {[ordinal |-> s.cursor, record |-> s.candidate]},
                    !.pc = "complete-head"]
  /\ UNCHANGED <<dispatches, returns>>
PublishCompleted ==
  /\ s.pc = "complete-head"
  /\ s' = [s EXCEPT !.head[s.cursor] = s.candidate,
                    !.chain[s.cursor] = Append(@, s.candidate), !.pc = "complete-return"]
  /\ UNCHANGED <<dispatches, returns>>
ReturnCompleted ==
  /\ s.pc = "complete-return"
  /\ IF s.poisoned /\ Mutation \notin {"skip-postwrite-health", "skip-completion-health"}
     THEN /\ s' = [s EXCEPT !.pc = "poisoned"] /\ UNCHANGED returns
     ELSE /\ returns' = Append(returns,
                 [ordinal |-> s.cursor, invocation |-> s.invocation, replay |-> FALSE,
                  value |-> s.currentReceipt, record |-> s.head[s.cursor],
                  poisonSeen |-> s.poisonSeen, binding |-> BindingMatches])
          /\ s' = [s EXCEPT !.cursor = @ + 1, !.pc = "before"]
  /\ UNCHANGED dispatches
Replay ==
  /\ s.pc = "replay"
  /\ returns' = Append(returns,
      [ordinal |-> s.cursor, invocation |-> s.invocation, replay |-> TRUE,
       value |-> IF Mutation = "replay-other-ordinal" /\ s.cursor > 1
                 THEN s.head[1].receipt ELSE s.head[s.cursor].receipt,
       record |-> s.head[s.cursor], poisonSeen |-> s.poisonSeen, binding |-> BindingMatches])
  /\ s' = [s EXCEPT !.cursor = @ + 1, !.pc = "before"]
  /\ UNCHANGED dispatches
Finish ==
  /\ s.pc = "before" /\ s.cursor = Count + 1
  /\ ~s.poisoned /\ \A i \in Occurrences : s.head[i].state = "completed"
  /\ s' = [s EXCEPT !.pc = "done", !.finished = TRUE]
  /\ UNCHANGED <<dispatches, returns>>
Poison ==
  /\ s.pc = "poison"
  /\ s' = [s EXCEPT !.poisoned = TRUE, !.poisonSeen = TRUE, !.pc = "poisoned"]
  /\ UNCHANGED <<dispatches, returns>>
ConcurrentPoison ==
  /\ Faults /\ ~s.poisoned
  /\ s.pc \in {"start-cas", "start-head", "start-return", "complete-cas",
                "complete-head", "complete-return", "recovery-charge", "recovery-return"}
  /\ s' = [s EXCEPT !.poisoned = TRUE, !.poisonSeen = TRUE]
  /\ UNCHANGED <<dispatches, returns>>
Fail ==
  /\ Faults
  /\ s.pc \in {"start-cas", "start-head", "start-return", "inflight", "outcome",
                "complete-cas", "complete-head", "complete-return",
                "recovery-charge", "recovery-return"}
  /\ s' = [s EXCEPT !.poisoned = TRUE, !.poisonSeen = TRUE, !.pc = "poisoned"]
  /\ UNCHANGED <<dispatches, returns>>
ClearPoison ==
  /\ Mutation = "clear-poison" /\ s.pc = "poisoned"
  /\ s.cursor \in Occurrences /\ s.head[s.cursor].state = "started"
  /\ s' = [s EXCEPT !.poisoned = FALSE, !.pc = "dispatch"]
  /\ UNCHANGED <<dispatches, returns>>
Crash ==
  /\ Faults /\ s.invocation < Invocations
  /\ s.pc \notin {"done", "blocked", "crashed"}
  /\ s' = [s EXCEPT !.pc = "crashed", !.invocation = @ + 1,
                    !.cursor = 1, !.recovering = FALSE,
                    !.poisoned = FALSE, !.poisonSeen = FALSE, !.candidate = Empty,
                    !.currentReceipt = "none", !.bad = Corruption]
  /\ UNCHANGED <<dispatches, returns>>
Reopen ==
  /\ s.pc = "crashed"
  /\ s' = [s EXCEPT !.pc = "open"]
  /\ UNCHANGED <<dispatches, returns>>
Open ==
  /\ s.pc = "open"
  /\ s' = [s EXCEPT !.pc =
       IF ~s.intent \/ ~s.selected \/ ~s.header \/ s.bad # "none" THEN "blocked" ELSE "recovery"]
  /\ UNCHANGED <<dispatches, returns>>
AdmitRecovery ==
  /\ s.pc = "recovery"
  /\ s' = [s EXCEPT !.pc =
       IF (\E i \in Occurrences : s.head[i].state = "started" /\ Kind(i) = "write")
             /\ Mutation # "repeat-write"
          THEN "blocked"
       ELSE IF s.recoveries >= RecoveryLimit THEN "blocked" ELSE "recovery-charge"]
  /\ UNCHANGED <<dispatches, returns>>
PublishRecoveryCharge ==
  /\ s.pc = "recovery-charge"
  /\ s' = [s EXCEPT !.recoveries = IF Mutation = "skip-charge" THEN @ ELSE @ + 1,
                    !.chargedInvocations = IF Mutation = "skip-charge" THEN @ ELSE @ \cup {s.invocation},
                    !.pc = "recovery-return"]
  /\ UNCHANGED <<dispatches, returns>>
ReturnRecoveryCharge ==
  /\ s.pc = "recovery-return"
  /\ s' = [s EXCEPT !.recovering = ~s.poisoned,
                    !.pc = IF s.poisoned THEN "poisoned" ELSE "before"]
  /\ UNCHANGED <<dispatches, returns>>
ApplyOutstanding(t) ==
  /\ t \in s.outstanding /\ t \notin s.applied /\ ~OwnsAdapter(t)
  /\ s' = [s EXCEPT !.applied = @ \cup {t}]
  /\ UNCHANGED <<dispatches, returns>>
SettleOutstanding(t) ==
  /\ t \in s.outstanding /\ ~OwnsAdapter(t)
  /\ s' = [s EXCEPT !.outstanding = @ \ {t}]
  /\ UNCHANGED <<dispatches, returns>>
LateApply == \E t \in s.outstanding: ApplyOutstanding(t)
LateSettle == \E t \in s.outstanding: SettleOutstanding(t)
Step == PrepareIntentCAS \/ CreateHeader \/ PublishIntent \/ Before \/ WriteStartCAS
     \/ PublishStarted \/ ReturnStarted \/ Dispatch \/ Apply
     \/ (\E receipt \in Receipts: KnownResult(receipt)) \/ KnownFailure
     \/ WriteCompletedCAS \/ PublishCompleted \/ ReturnCompleted \/ Replay
     \/ Finish \/ Poison \/ Reopen \/ Open \/ AdmitRecovery
     \/ PublishRecoveryCharge \/ ReturnRecoveryCharge
Done == /\ s.pc \in {"done", "blocked", "poisoned"} /\ UNCHANGED vars
Next == Step \/ Fail \/ ConcurrentPoison \/ ClearPoison \/ Crash \/ Done
        \/ LateApply \/ LateSettle
Spec == Init /\ [][Next]_vars
FairSpec == Spec /\ WF_vars(Step)

TypeOK ==
  /\ s.invocation \in 1..Invocations /\ s.cursor \in 1..(Count+1)
  /\ InitialRecoveries \in 0..RecoveryLimit
  /\ s.recoveries \in InitialRecoveries..RecoveryLimit /\ s.chargedInvocations \subseteq 1..Invocations
  /\ s.intent \in BOOLEAN /\ s.selected \in BOOLEAN /\ s.header \in BOOLEAN
  /\ s.recovering \in BOOLEAN /\ s.poisoned \in BOOLEAN /\ s.poisonSeen \in BOOLEAN
  /\ s.finished \in BOOLEAN /\ s.bad \in {"none", "gap", "binding", "chain"}
  /\ s.pc \in {"prepare", "before", "start-cas", "start-head", "start-return",
     "dispatch", "inflight", "outcome", "complete-cas", "complete-head",
     "complete-return", "replay", "done", "poison", "poisoned", "blocked",
     "crashed", "open", "recovery", "recovery-charge", "recovery-return"}
  /\ s.head \in [Occurrences -> Records] /\ s.candidate \in Records
  /\ DOMAIN s.chain = Occurrences
  /\ \A i \in Occurrences : s.chain[i] \in Seq(Records) /\ Len(s.chain[i]) <= 2*(RecoveryLimit+1)
  /\ s.cas \subseteq [ordinal: Occurrences, record: Records]
  /\ s.currentReceipt \in Receipts \cup {"none"}
  /\ s.applied \subseteq Tokens /\ s.outstanding \subseteq Tokens
  /\ Len(dispatches) <= Count*(RecoveryLimit+1) /\ Len(returns) <= Count*Invocations
DispatchHasIntent == \A n \in 1..Len(dispatches) :
  dispatches[n].intent /\ dispatches[n].selected /\ dispatches[n].header /\ dispatches[n].started
NoRepeatedWrite == \A i \in Occurrences : Kind(i) = "write" =>
  Cardinality({n \in 1..Len(dispatches) : dispatches[n].ordinal = i}) <= 1
RecoveryCharged == \A n \in 1..Len(dispatches) : dispatches[n].charged
RecoveryChargesRetained == s.recoveries = InitialRecoveries + Cardinality(s.chargedInvocations)
PoisonBlocks == \A n \in 1..Len(dispatches) : ~dispatches[n].poisonSeen
PoisonReturnsBlocked == \A n \in 1..Len(returns) : ~returns[n].poisonSeen
BindingPreserved == /\ \A n \in 1..Len(dispatches) : dispatches[n].binding
                    /\ \A n \in 1..Len(returns) : returns[n].binding
CompletedImmutable == \A i \in Occurrences : \A n \in 1..Len(s.chain[i]) :
  s.chain[i][n].state = "completed" => n = Len(s.chain[i])
HeadHasCAS == \A i \in Occurrences : s.head[i].state # "empty" =>
  [ordinal |-> i, record |-> s.head[i]] \in s.cas
PrefixSettled == \A i \in Occurrences : s.head[i].state # "empty" =>
  \A j \in 1..(i-1) : s.head[j].state = "completed"
ChainValid == \A i \in Occurrences : \A n \in 1..Len(s.chain[i]) :
  /\ s.chain[i][n].prior = n-1
  /\ (s.chain[i][n].state = "completed") = (s.chain[i][n].receipt \in Receipts)
  /\ IF n = 1 THEN s.chain[i][n].state = "started" /\ s.chain[i][n].attempt = 0
     ELSE /\ s.chain[i][n-1].state = "started"
          /\ s.chain[i][n].configuration = s.chain[i][n-1].configuration
          /\ IF s.chain[i][n].state = "completed"
             THEN s.chain[i][n].attempt = s.chain[i][n-1].attempt
             ELSE Kind(i) = "read" /\ s.chain[i][n].attempt = s.chain[i][n-1].attempt+1
OccurrenceReturns == \A n \in 1..Len(returns) :
  /\ returns[n].record.state = "completed"
  /\ returns[n].value = returns[n].record.receipt
  /\ [ordinal |-> returns[n].ordinal, record |-> returns[n].record] \in s.cas
  /\ \A m \in 1..(n-1) : returns[m].invocation = returns[n].invocation =>
       returns[m].ordinal < returns[n].ordinal
ExternalApplicationWasDispatched == \A t \in s.applied \cup s.outstanding:
  \E n \in 1..Len(dispatches): /\ dispatches[n].ordinal = t.ordinal
                              /\ dispatches[n].attempt = t.attempt
                              /\ dispatches[n].invocation = t.invocation
ClosedOnMalformed == s.bad # "none" => s.pc \in {"crashed", "open", "blocked"}
FinishConsumesPrefix == s.finished =>
  /\ s.cursor = Count+1 /\ \A i \in Occurrences : s.head[i].state = "completed"
EventuallyDone == <>s.finished

NeverPrepareIntentCAS == [][~PrepareIntentCAS]_vars
NeverCreateHeader == [][~CreateHeader]_vars
NeverPublishIntent == [][~PublishIntent]_vars
NeverBefore == [][~Before]_vars
NeverWriteStartCAS == [][~WriteStartCAS]_vars
NeverPublishStarted == [][~PublishStarted]_vars
NeverReturnStarted == [][~ReturnStarted]_vars
NeverDispatch == [][~Dispatch]_vars
NeverApply == [][~Apply]_vars
NeverKnownResult == [][~(\E receipt \in Receipts: KnownResult(receipt))]_vars
NeverKnownFailure == [][~KnownFailure]_vars
NeverWriteCompletedCAS == [][~WriteCompletedCAS]_vars
NeverPublishCompleted == [][~PublishCompleted]_vars
NeverReturnCompleted == [][~ReturnCompleted]_vars
NeverReplay == [][~Replay]_vars
NeverPoison == [][~Poison]_vars
NeverConcurrentPoison == [][~ConcurrentPoison]_vars
NeverFail == [][~Fail]_vars
NeverCrash == [][~Crash]_vars
NeverReopen == [][~Reopen]_vars
NeverOpen == [][~Open]_vars
NeverAdmitRecovery == [][~AdmitRecovery]_vars
NeverPublishRecoveryCharge == [][~PublishRecoveryCharge]_vars
NeverReturnRecoveryCharge == [][~ReturnRecoveryCharge]_vars
NeverCrashAfterCharge == [][~(Crash /\ s.pc = "recovery-return" /\
                             s.invocation \in s.chargedInvocations)]_vars
NeverFailAfterCharge == [][~(Fail /\ s.pc = "recovery-return" /\
                            s.invocation \in s.chargedInvocations)]_vars
NeverFreshBindingDispatch == [][~(Dispatch /\ s.head[s.cursor].configuration = "new" /\
                                 s.head[s.cursor].attempt = 0)]_vars
NeverLateApply == [][~LateApply]_vars
NeverLateApplyAfterCrash == [][~(\E t \in s.outstanding:
  ApplyOutstanding(t) /\ t.invocation < s.invocation)]_vars
NeverLateSettle == [][~LateSettle]_vars
NeverFinish == [][~Finish]_vars
=============================================================================
