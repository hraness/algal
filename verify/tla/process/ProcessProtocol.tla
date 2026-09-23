-------------------------- MODULE ProcessProtocol --------------------------
EXTENDS Naturals, Sequences, FiniteSets
CONSTANTS Generations, Calls, Faults, CheckpointOK, HostOK, Outcome, Mutation
Gs == 1..Generations
Heads == [generation: 0..Generations, status: {"ready", "uncertain", "suspended", "complete", "failed", "stuck"}]
HeadRecord(g, status) == [generation |-> g, status |-> status]
InitialHead == HeadRecord(0, "ready")
VARIABLES s, dispatches, publications, acknowledgments
vars == <<s, dispatches, publications, acknowledgments>>
Init ==
  /\ s = [pc |-> "idle", calls |-> 0, crashes |-> 0, faults |-> 0,
           head |-> InitialHead, history |-> <<InitialHead>>,
           headers |-> {}, intents |-> {}, receipts |-> {}, outcomes |-> {},
           prior |-> [g \in Gs |-> InitialHead],
           unknown |-> {}, completed |-> {}, mode |-> "none", target |-> 0,
           expected |-> 0, base |-> InitialHead, verified |-> FALSE,
           charged |-> FALSE, finished |-> FALSE, rejections |-> {},
           hostVerified |-> FALSE, checkpointVerified |-> FALSE, charges |-> <<>>]
  /\ dispatches = <<>> /\ publications = <<>> /\ acknowledgments = <<>>

TickAllowed == s.head.status \in {"ready", "suspended"} /\ s.head.generation < Generations
StartTick ==
  /\ s.pc = "idle" /\ s.calls < Calls
  /\ TickAllowed \/ (Mutation = "blind-tick" /\ s.head.status = "uncertain" /\ s.head.generation < Generations)
  /\ s' = [s EXCEPT !.pc = "verify", !.calls = @ + 1, !.mode = "tick",
           !.target = s.head.generation + 1, !.base = s.head, !.expected = 0,
           !.verified = FALSE, !.hostVerified = FALSE, !.checkpointVerified = FALSE,
           !.charged = FALSE, !.finished = FALSE]
  /\ UNCHANGED <<dispatches, publications, acknowledgments>>
RejectTick ==
  /\ s.pc = "idle" /\ s.calls < Calls /\ ~TickAllowed
  /\ s' = [s EXCEPT !.calls = @ + 1, !.rejections = @ \cup {"tick"}]
  /\ UNCHANGED <<dispatches, publications, acknowledgments>>
StartRecovery(expected) ==
  /\ s.pc = "idle" /\ s.calls < Calls /\ s.head.status = "uncertain"
  /\ expected \in 0..Generations
  /\ s' = [s EXCEPT !.pc = "recover-check", !.calls = @ + 1, !.mode = "recover",
           !.target = s.head.generation, !.expected = expected, !.base = s.head,
           !.verified = FALSE, !.hostVerified = FALSE, !.checkpointVerified = FALSE,
           !.charged = FALSE, !.finished = FALSE]
  /\ UNCHANGED <<dispatches, publications, acknowledgments>>
RejectRecovery ==
  /\ s.pc = "idle" /\ s.calls < Calls /\ s.head.status # "uncertain"
  /\ s' = [s EXCEPT !.calls = @ + 1, !.rejections = @ \cup {"recover"}]
  /\ UNCHANGED <<dispatches, publications, acknowledgments>>
CheckRecovery ==
  /\ s.pc = "recover-check"
  /\ s' = [s EXCEPT !.pc = IF s.expected = s.target \/ Mutation = "stale-recovery" THEN "verify" ELSE "reject"]
  /\ UNCHANGED <<dispatches, publications, acknowledgments>>
CheckpointGeneration == IF s.mode = "recover" THEN s.prior[s.target].generation ELSE s.base.generation
CheckpointAdmitted == CheckpointGeneration = 0 \/ CheckpointOK
HostPasses == HostOK \/ Mutation \in {"skip-verification", "skip-host"}
CheckpointPasses == CheckpointAdmitted \/ Mutation \in {"skip-verification", "skip-checkpoint"}
VerifyInputs ==
  /\ s.pc = "verify"
  /\ s' = [s EXCEPT !.verified = CheckpointAdmitted /\ HostOK,
           !.hostVerified = HostOK, !.checkpointVerified = CheckpointAdmitted,
           !.pc = IF HostPasses /\ CheckpointPasses
                   THEN IF s.mode = "tick" THEN "prepare" ELSE "recover-admit"
                   ELSE "reject"]
  /\ UNCHANGED <<dispatches, publications, acknowledgments>>
PrepareIntentCAS ==
  /\ s.pc = "prepare" /\ s.target \notin s.intents
  /\ s' = [s EXCEPT !.intents = @ \cup {s.target}, !.prior[s.target] = s.base]
  /\ UNCHANGED <<dispatches, publications, acknowledgments>>
CreateHeader ==
  /\ s.pc = "prepare" /\ s.target \notin s.headers
  /\ s' = [s EXCEPT !.headers = @ \cup {s.target}]
  /\ UNCHANGED <<dispatches, publications, acknowledgments>>
PublishIntent ==
  /\ s.pc = "prepare" /\ s.target \in s.intents
  /\ s.target \in s.headers \/ Mutation = "skip-header"
  /\ s' = [s EXCEPT !.head = HeadRecord(s.target, "uncertain"),
           !.history = Append(@, HeadRecord(s.target, "uncertain")), !.pc = "execute"]
  /\ UNCHANGED <<dispatches, publications, acknowledgments>>
AdmitRecovery ==
  /\ s.pc = "recover-admit" /\ s.target \in s.headers
  /\ IF s.target \in s.unknown /\ Mutation # "retry-unknown-write"
     THEN s' = [s EXCEPT !.pc = "reject"]
     ELSE s' = [s EXCEPT !.charged = TRUE, !.pc = "execute",
               !.charges = Append(@, [target |-> s.target, call |-> s.calls,
                                      unknown |-> s.target \in s.unknown])]
  /\ UNCHANGED <<dispatches, publications, acknowledgments>>
Dispatch ==
  /\ s.pc = "execute" \/ (Mutation = "skip-selected" /\ s.pc = "prepare" /\ s.target \in s.intents /\ s.target \in s.headers)
  /\ dispatches' = Append(dispatches,
        [target |-> s.target, head |-> s.head, header |-> s.target \in s.headers,
         verified |-> s.verified, hostVerified |-> s.hostVerified,
         checkpointVerified |-> s.checkpointVerified, checkpoint |-> CheckpointGeneration,
         mode |-> s.mode, expected |-> s.expected,
         charged |-> s.charged, unknown |-> s.target \in s.unknown])
  /\ s' = [s EXCEPT !.pc = "running"]
  /\ UNCHANGED <<publications, acknowledgments>>
CompleteJournal ==
  /\ s.pc = "running" /\ s.target \notin s.unknown
  /\ s' = [s EXCEPT !.completed = @ \cup {s.target}, !.pc = "finish"]
  /\ UNCHANGED <<dispatches, publications, acknowledgments>>
UnknownWrite ==
  /\ Faults /\ s.pc = "running" /\ s.target \notin s.completed
  /\ s' = [s EXCEPT !.unknown = @ \cup {s.target}, !.pc = "finish"]
  /\ UNCHANGED <<dispatches, publications, acknowledgments>>
ReplayBlocked ==
  /\ s.pc = "running" /\ s.target \in s.unknown
  /\ s' = [s EXCEPT !.pc = "finish"]
  /\ UNCHANGED <<dispatches, publications, acknowledgments>>
FinishJournal ==
  /\ s.pc = "finish"
  /\ s' = [s EXCEPT !.finished = s.target \in s.completed /\ s.target \notin s.unknown,
           !.pc = IF (s.target \in s.completed /\ s.target \notin s.unknown) \/ Mutation = "skip-settlement"
                   THEN "receipt" ELSE "reject"]
  /\ UNCHANGED <<dispatches, publications, acknowledgments>>
PublishReceipt ==
  /\ s.pc = "receipt"
  /\ s' = [s EXCEPT !.receipts = @ \cup {s.target}, !.pc = "outcome"]
  /\ publications' = Append(publications, [target |-> s.target, finished |-> s.finished])
  /\ UNCHANGED <<dispatches, acknowledgments>>
PersistOutcome ==
  /\ s.pc = "outcome" \/ (Mutation = "skip-receipt" /\ s.pc = "receipt")
  /\ s' = [s EXCEPT !.outcomes = @ \cup {s.target}, !.pc = "publish"]
  /\ UNCHANGED <<dispatches, publications, acknowledgments>>
PublishOutcome ==
  /\ s.pc = "publish"
  /\ s' = [s EXCEPT !.head = HeadRecord(s.target, Outcome),
           !.history = Append(@, HeadRecord(s.target, Outcome)), !.pc = "return"]
  /\ UNCHANGED <<dispatches, publications, acknowledgments>>
Return ==
  /\ s.pc = "return"
  /\ acknowledgments' = Append(acknowledgments, s.head)
  /\ s' = [s EXCEPT !.pc = "idle"]
  /\ UNCHANGED <<dispatches, publications>>
Reject ==
  /\ s.pc = "reject"
  /\ s' = [s EXCEPT !.pc = "idle", !.rejections = @ \cup {s.mode}]
  /\ UNCHANGED <<dispatches, publications, acknowledgments>>
Crash ==
  /\ Faults /\ s.pc \notin {"idle", "done"} /\ s.crashes = 0
  /\ \E lostWrite \in BOOLEAN:
       s' = [s EXCEPT !.pc = "idle", !.crashes = @ + 1,
             !.unknown = IF lostWrite /\ s.pc = "running" /\ s.target \notin s.completed
                         THEN @ \cup {s.target} ELSE @]
  /\ UNCHANGED <<dispatches, publications, acknowledgments>>
IOFailure ==
  /\ Faults /\ s.pc \notin {"idle", "done"} /\ s.faults = 0
  /\ \E lostWrite \in BOOLEAN:
       s' = [s EXCEPT !.pc = "idle", !.faults = @ + 1,
             !.unknown = IF lostWrite /\ s.pc = "running" /\ s.target \notin s.completed
                         THEN @ \cup {s.target} ELSE @]
  /\ UNCHANGED <<dispatches, publications, acknowledgments>>
Done ==
  /\ s.pc = "idle" /\ s.calls = Calls
  /\ s' = [s EXCEPT !.pc = "done"]
  /\ UNCHANGED <<dispatches, publications, acknowledgments>>
Halt == s.pc = "done" /\ UNCHANGED vars
Next == Halt \/ StartTick \/ RejectTick \/ RejectRecovery \/ (\E e \in 0..Generations: StartRecovery(e)) \/
        CheckRecovery \/ VerifyInputs \/ PrepareIntentCAS \/ CreateHeader \/
        PublishIntent \/ AdmitRecovery \/ Dispatch \/ CompleteJournal \/ UnknownWrite \/
        ReplayBlocked \/ FinishJournal \/ PublishReceipt \/ PersistOutcome \/
        PublishOutcome \/ Return \/ Reject \/ Crash \/ IOFailure \/ Done
Spec == Init /\ [][Next]_vars
FairSpec == Spec /\ WF_vars(Next)

TypeOK ==
  /\ s.pc \in {"idle", "done", "verify", "recover-check", "prepare", "recover-admit", "execute", "running", "finish", "receipt", "outcome", "publish", "return", "reject"}
  /\ s.head \in Heads /\ s.base \in Heads /\ s.history \in Seq(Heads)
  /\ s.calls \in 0..Calls /\ s.crashes \in 0..1 /\ s.faults \in 0..1
  /\ s.target \in 0..Generations /\ s.expected \in 0..Generations
  /\ s.headers \subseteq Gs /\ s.intents \subseteq Gs /\ s.receipts \subseteq Gs /\ s.outcomes \subseteq Gs
  /\ s.unknown \subseteq Gs /\ s.completed \subseteq Gs
  /\ s.prior \in [Gs -> Heads] /\ s.verified \in BOOLEAN /\ s.charged \in BOOLEAN /\ s.finished \in BOOLEAN
  /\ s.hostVerified \in BOOLEAN /\ s.checkpointVerified \in BOOLEAN
  /\ s.mode \in {"none", "tick", "recover"} /\ s.rejections \subseteq {"tick", "recover"}
  /\ s.charges \in Seq([target: Gs, call: 1..Calls, unknown: BOOLEAN])
  /\ Len(s.charges) <= Calls /\ Len(dispatches) <= Calls /\ Len(publications) <= Calls
  /\ Len(acknowledgments) <= Calls /\ Len(s.history) <= 1+2*Generations
SelectedIntentHasHeader == s.head.status = "uncertain" => s.head.generation \in s.headers \cap s.intents
DispatchHasSelectedIntent == \A i \in 1..Len(dispatches):
  /\ dispatches[i].head = HeadRecord(dispatches[i].target, "uncertain") /\ dispatches[i].header
InputAdmission == \A i \in 1..Len(dispatches): dispatches[i].verified
HostAdmission == \A i \in 1..Len(dispatches): dispatches[i].hostVerified
CheckpointAdmission == \A i \in 1..Len(dispatches): dispatches[i].checkpointVerified
UnknownUncharged == \A i \in 1..Len(s.charges): ~s.charges[i].unknown
UnknownNotDispatched == \A i \in 1..Len(dispatches):
  dispatches[i].mode = "recover" => ~dispatches[i].unknown
ExactRecovery == \A i \in 1..Len(dispatches): dispatches[i].mode = "recover" =>
  dispatches[i].expected = dispatches[i].target /\ dispatches[i].charged
ReceiptSettled == \A i \in 1..Len(publications): publications[i].finished
SelectedOutcomeClosed == s.head.status \notin {"ready", "uncertain"} =>
  s.head.generation \in s.outcomes \cap s.receipts \cap s.completed /\ s.head.generation \notin s.unknown
LinearGeneration == \A i \in 2..Len(s.history):
  LET before == s.history[i-1] after == s.history[i] IN
    IF after.status = "uncertain" THEN
      before.status \in {"ready", "suspended"} /\ after.generation = before.generation + 1 /\ s.prior[after.generation] = before
    ELSE before.status = "uncertain" /\ after.generation = before.generation
AckClosed == \A i \in 1..Len(acknowledgments):
  acknowledgments[i].generation \in s.outcomes \cap s.receipts \cap s.completed
UnknownPreserved == s.unknown \cap s.completed = {}
EventuallyDone == <>(s.pc = "done")
NeverPrepareIntentCAS == [][~PrepareIntentCAS]_vars
NeverVerifyInputs == [][~VerifyInputs]_vars
NeverCheckRecovery == [][~CheckRecovery]_vars
NeverCreateHeader == [][~CreateHeader]_vars
NeverPublishIntent == [][~PublishIntent]_vars
NeverAdmitRecovery == [][~AdmitRecovery]_vars
NeverDispatch == [][~Dispatch]_vars
NeverCompleteJournal == [][~CompleteJournal]_vars
NeverUnknownWrite == [][~UnknownWrite]_vars
NeverFinishJournal == [][~FinishJournal]_vars
NeverPublishReceipt == [][~PublishReceipt]_vars
NeverPersistOutcome == [][~PersistOutcome]_vars
NeverPublishOutcome == [][~PublishOutcome]_vars
NeverReturn == [][~Return]_vars
NeverCrashAfterOutcome == [][~(Crash /\ s.pc = "return")]_vars
NeverCrashWithUnknownWrite == [][~(Crash /\ s.pc = "running" /\
                                 s.target \notin s.unknown /\ s.target \in s'.unknown)]_vars
NeverIOFailureWithUnknownWrite == [][~(IOFailure /\ s.pc = "running" /\
                                     s.target \notin s.unknown /\ s.target \in s'.unknown)]_vars
NeverIOFailureAfterReceipt == [][~(IOFailure /\ s.pc = "outcome")]_vars
NeverRejectUnknownRecovery == [][~(AdmitRecovery /\ s.target \in s.unknown)]_vars
NeverRecoverCompletedJournal == [][~(Dispatch /\ s.mode = "recover" /\ s.target \in s.completed)]_vars
NeverLostReturnNextGeneration == [][~(PublishIntent /\ s.target = 2 /\
                                     Len(acknowledgments) = 0)]_vars
NeverReject == [][~Reject]_vars
NeverSecondGeneration == [][~(PublishIntent /\ s.target = 2)]_vars
NeverFreshWithoutCheckpoint == [][~(Dispatch /\ CheckpointGeneration = 0)]_vars
NeverCheckpointRejection == [][~(VerifyInputs /\ CheckpointGeneration > 0 /\ ~CheckpointOK)]_vars
NeverHostRejection == [][~(VerifyInputs /\ ~HostOK)]_vars
NeverStaleRecoveryRejection == [][~(CheckRecovery /\ s.expected # s.target)]_vars
NeverRejectTick == [][~RejectTick]_vars
NeverRejectRecoveryAfterOutcome == [][~(RejectRecovery /\ s.head.generation > 0)]_vars
NeverDone == [][~Done]_vars
=============================================================================
