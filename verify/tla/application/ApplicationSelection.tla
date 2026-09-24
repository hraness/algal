------------------------ MODULE ApplicationSelection ------------------------
EXTENDS Naturals, FiniteSets, Sequences
CONSTANTS Scenario, Kind, Mutation, StateLimit
NoValue == [absent |-> TRUE]
Apps == {"a","b"}
Actors == {1,2,3}
Operations == {0,1,2,3}
Activating(k) == k \in {"activate","migrate","restore"}
Faults == Scenario \in {"faults","orphan","quota-denial"}
App(a) == IF Scenario = "namespace" /\ a = 2 THEN "b" ELSE "a"
Operation(a) == IF a = 2 /\ Scenario \in {"retry","retry-host-denial","conflict","orphan","missing-index","reuse-missing"} THEN 1 ELSE a
SeedId(app) == IF app = "a" THEN 1 ELSE 2
Seed(app) == [application |-> app, operation |-> 0, kind |-> "create", previous |-> 0,
 revision |-> 1, memory |-> 1, sequence |-> 0, epoch |-> 0, intents |-> {}, request |-> NoValue]
Revision(r) == IF r = 1 THEN [parent |-> 0, runtime |-> 1, caps |-> {1}, entries |-> {1}, schema |-> 1]
 ELSE [parent |-> 1, runtime |-> IF Scenario = "bad-runtime" THEN 2 ELSE 1,
 caps |-> IF Scenario = "widen-cap" THEN {1,2} ELSE {1},
 entries |-> IF Scenario = "drop-entry" THEN {} ELSE {1},
 schema |-> IF Scenario = "schema-change" THEN 2 ELSE 1]
VARIABLE s
vars == <<s>>
Node(i) == IF i = 0 THEN Seed("a") ELSE s.nodes[i]
Init == s = [nodes |-> <<Seed("a"),Seed("b")>>, owner |-> [app \in Apps |-> 0],
 history |-> [app \in Apps |-> <<SeedId(app)>>], head |-> [app \in Apps |-> SeedId(app)],
 selectedRevision |-> [app \in Apps |-> 1], selectedMemory |-> [app \in Apps |-> 1],
 cas |-> {1,2}, grants |-> {1,2},
 index |-> [app \in Apps |-> [op \in Operations |-> IF op = 0 THEN SeedId(app) ELSE 0]],
 pc |-> [a \in Actors |-> "idle"], command |-> [a \in Actors |-> NoValue], candidate |-> [a \in Actors |-> 0],
 reply |-> [a \in Actors |-> 0], outcome |-> [a \in Actors |-> "none"],
 attempted |-> [a \in Actors |-> FALSE], uncertain |-> [a \in Actors |-> FALSE],
 admitted |-> {}, orphan |-> 0, failed |-> FALSE, crashed |-> FALSE, reopened |-> FALSE, removed |-> FALSE]
Committed(app) == {s.history[app][n]: n \in 1..Len(s.history[app])}
HasOperation(app, op) == \E x \in Committed(app): Node(x).operation = op
Ready(a) == /\ s.pc[a] = "idle"
 /\ (a # 2 \/ Scenario \notin {"retry","retry-host-denial","conflict","orphan","missing-index"} \/ s.command[1] # NoValue)
 /\ (a # 2 \/ Scenario \notin {"missing-index","reuse-missing"} \/ s.removed)
 /\ (Scenario \notin {"missing-index","reuse-missing"} \/ a = 1 \/ HasOperation("a",1))
 /\ (Scenario \notin {"chain","schema-change","bad-runtime","widen-cap","drop-entry","bad-special","bad-evidence","stale-evidence","migration-after-propose","host-denial"}
     \/ (IF a = 1 THEN TRUE ELSE s.pc[a-1] = "done"))
Command(a) == LET app == App(a)
 cur == Node(s.head[app])
 kind == IF Scenario = "migration-after-propose" THEN IF a = 1 THEN "propose" ELSE "migrate" ELSE Kind
 rev == IF Activating(kind) THEN 2 ELSE 1
 mem == IF kind \in {"memory","activate","migrate"} THEN 2 ELSE 1
 ins == IF kind = "investigate" THEN {1} ELSE {}
 IN [application |-> app, operation |-> Operation(a), kind |-> kind, expected |-> s.head[app],
 revision |-> rev,
 memory |-> IF Scenario = "conflict" /\ a = 2 THEN 1 ELSE IF Scenario = "bad-special" THEN 2 ELSE mem,
 intents |-> IF Scenario = "bad-special" /\ Kind \in {"propose","restore"} THEN {1} ELSE IF Scenario = "bad-special" /\ Kind = "investigate" THEN {} ELSE ins,
 evidence |-> [parent |-> IF Scenario \in {"bad-evidence","stale-evidence","migration-after-propose"} THEN SeedId(app) ELSE s.head[app],
  sourceMemory |-> cur.memory, sourceRevision |-> cur.revision, targetRevision |-> rev,
  targetMemory |-> mem, targetSchema |-> Revision(rev).schema,
  admitted |-> Scenario # "bad-evidence", consumed |-> Scenario # "bad-evidence"]]
HostAllows(a) == Scenario # "host-denial" /\ ~(Scenario = "retry-host-denial" /\ a = 2)
Submit(a) == /\ Ready(a)
 /\ s' = [s EXCEPT !.pc[a] = "submitted", !.command[a] =
   IF a = 2 /\ Scenario \in {"retry","retry-host-denial","orphan","missing-index"} THEN s.command[1] ELSE Command(a)]
Acquire(a) == /\ s.pc[a] = "submitted" /\ s.owner[App(a)] = 0
 /\ s' = [s EXCEPT !.owner[App(a)] = a, !.pc[a] = "inspect"]
Prepared(a) == s.index[App(a)][Operation(a)]
ExactRetry(a) == /\ s.pc[a] = "inspect" /\ Prepared(a) # 0
 /\ Prepared(a) \in Committed(App(a))
 /\ (Node(Prepared(a)).request = s.command[a] \/ Mutation = "ignore-retry-request")
 /\ s' = [s EXCEPT !.reply[a] = Prepared(a), !.pc[a] = "release"]
IndexConflict(a) == /\ s.pc[a] = "inspect" /\ Prepared(a) # 0
 /\ Node(Prepared(a)).request # s.command[a] /\ Mutation # "ignore-retry-request"
MissingDuplicate(a) == /\ s.pc[a] = "inspect"
 /\ (Prepared(a) = 0 \/ Prepared(a) \notin Committed(App(a)))
 /\ HasOperation(App(a), Operation(a)) /\ Mutation # "skip-history-identity"
CanContinue(a) == /\ s.pc[a] = "inspect"
 /\ (IF Prepared(a) = 0 THEN TRUE ELSE Prepared(a) \notin Committed(App(a)) /\ Node(Prepared(a)).request = s.command[a])
 /\ (~HasOperation(App(a), Operation(a)) \/ Mutation = "skip-history-identity")
HeadAllowed(a) == s.head[App(a)] = s.command[a].expected \/ Mutation \in {"skip-first-head","skip-both-head"}
Build(a) == /\ CanContinue(a) /\ HeadAllowed(a) /\ Len(s.history[App(a)]) < StateLimit
 /\ LET c == s.command[a]
        cur == Node(s.head[App(a)])
        node == [application |-> c.application, operation |-> c.operation, kind |-> c.kind,
         previous |-> c.expected, revision |-> c.revision, memory |-> c.memory,
         sequence |-> Len(s.history[App(a)]), epoch |-> cur.epoch + (IF Activating(c.kind) THEN 1 ELSE 0),
         intents |-> c.intents, request |-> c]
        matches == {i \in 1..Len(s.nodes): s.nodes[i] = node}
        id == IF matches = {} THEN Len(s.nodes)+1 ELSE CHOOSE i \in matches: TRUE
    IN s' = [s EXCEPT !.nodes = IF matches = {} THEN Append(@,node) ELSE @, !.candidate[a] = id, !.pc[a] = "step"]
StepAllowed(a) == LET n == Node(s.candidate[a])
 cur == Node(s.head[App(a)])
 r == Revision(n.revision)
 old == Revision(cur.revision)
 IN /\ n.application = cur.application /\ n.kind # "create"
 /\ (n.previous = s.head[App(a)] \/ Mutation = "skip-both-head")
 /\ n.sequence = cur.sequence + 1
 /\ n.epoch = cur.epoch + (IF Activating(n.kind) THEN 1 ELSE 0)
 /\ (IF Activating(n.kind) THEN
       /\ n.revision # cur.revision /\ r.parent = cur.revision /\ r.runtime = old.runtime
       /\ (r.caps \subseteq old.caps \/ Mutation = "widen-cap") /\ old.entries \subseteq r.entries
       /\ (n.kind # "activate" \/ r.schema = old.schema)
     ELSE n.revision = cur.revision)
 /\ (n.kind \notin {"restore","propose"} \/ (n.memory = cur.memory /\ n.intents = {}))
 /\ (n.kind # "investigate" \/ (n.memory = cur.memory /\ n.intents # {}))
 /\ (n.kind \notin {"restore","propose"} \/
       ((n.request.evidence.parent = s.head[App(a)] \/ Mutation = "unbound-evidence") /\ n.request.evidence.admitted))
 /\ (n.kind # "migrate" \/ (n.request.evidence.sourceMemory = cur.memory /\ n.request.evidence.sourceRevision = cur.revision
       /\ n.request.evidence.targetRevision = n.revision /\ n.request.evidence.targetMemory = n.memory
       /\ n.request.evidence.targetSchema = r.schema /\ n.request.evidence.admitted /\ n.request.evidence.consumed))
CheckStep(a) == /\ s.pc[a] = "step" /\ StepAllowed(a)
 /\ s' = [s EXCEPT !.pc[a] = "prepared-check"]
CheckPrepared(a) == /\ s.pc[a] = "prepared-check" /\ (Prepared(a) = 0 \/ Prepared(a) = s.candidate[a])
 /\ s' = [s EXCEPT !.pc[a] = "admit"]
Admit(a) == /\ s.pc[a] = "admit" /\ HostAllows(a)
 /\ s' = [s EXCEPT !.admitted = @ \cup {s.candidate[a]}, !.pc[a] = "quota"]
Reserve(a) == /\ s.pc[a] = "quota"
 /\ s' = [s EXCEPT !.grants = @ \cup {s.candidate[a]}, !.pc[a] = IF Mutation = "skip-dependencies" THEN "index" ELSE "cas"]
PublishDependencies(a) == /\ s.pc[a] = "cas"
 /\ s' = [s EXCEPT !.cas = @ \cup {s.candidate[a]}, !.pc[a] = "index"]
PrepareIndex(a) == /\ s.pc[a] = "index"
 /\ s' = [s EXCEPT !.index[App(a)][Operation(a)] = s.candidate[a], !.pc[a] = "begin-head"]
BeginHead(a) == /\ s.pc[a] = "begin-head"
 /\ s' = [s EXCEPT !.attempted[a] = TRUE, !.pc[a] = "select"]
SelectHead(a) == /\ s.pc[a] = "select"
 /\ LET app == App(a)
        n == s.candidate[a]
    IN s' = [s EXCEPT !.head[app] = n, !.history[app] = Append(@, n),
      !.selectedRevision[app] = Node(n).revision,
      !.selectedMemory[app] = IF Mutation = "torn-selection" THEN @ ELSE Node(n).memory,
      !.reply[a] = n, !.pc[a] = "release"]
Release(a) == /\ s.pc[a] = "release"
 /\ s' = [s EXCEPT !.owner[App(a)] = 0, !.pc[a] = "ack"]
Acknowledge(a) == /\ s.pc[a] = "ack"
 /\ s' = [s EXCEPT !.pc[a] = "done", !.outcome[a] = "success"]
ReleaseError(a) == /\ s.pc[a] = "release-error"
 /\ s' = [s EXCEPT !.owner[App(a)] = 0, !.pc[a] = "done"]
Fail(a) == /\ Faults /\ ~s.failed
 /\ s.pc[a] \in {"inspect","step","prepared-check","admit","quota","cas","index","begin-head","select","release"}
 /\ (Scenario # "quota-denial" \/ s.pc[a] = "quota")
 /\ s' = [s EXCEPT !.failed = TRUE, !.outcome[a] = "error", !.reply[a] = 0,
   !.uncertain[a] = s.attempted[a] /\ Mutation # "settle-uncertain", !.pc[a] = "release-error"]
Crash(a) == /\ Faults /\ ~s.crashed /\ s.owner[App(a)] = a
 /\ (Scenario # "orphan" \/ s.pc[a] = "begin-head")
 /\ s' = [s EXCEPT !.crashed = TRUE, !.orphan = IF s.pc[a] = "begin-head" THEN s.candidate[a] ELSE 0, !.owner[App(a)] = 0, !.pc[a] = "done", !.outcome[a] = "crashed", !.uncertain[a] = FALSE, !.reply[a] = 0]
Reopen == /\ s.crashed /\ ~s.reopened /\ s' = [s EXCEPT !.reopened = TRUE]
RemoveIndex == /\ Scenario \in {"missing-index","reuse-missing"} /\ ~s.removed
 /\ s.owner["a"] = 0 /\ HasOperation("a",1) /\ s.index["a"][1] # 0
 /\ s' = [s EXCEPT !.removed = TRUE, !.index["a"][1] = 0]
RejectReason(a) == IndexConflict(a) \/ MissingDuplicate(a) \/ (CanContinue(a) /\ (~HeadAllowed(a) \/ Len(s.history[App(a)]) >= StateLimit)) \/ (s.pc[a] = "step" /\ ~StepAllowed(a)) \/ (s.pc[a] = "admit" /\ ~HostAllows(a)) \/ (s.pc[a] = "prepared-check" /\ Prepared(a) # 0 /\ Prepared(a) # s.candidate[a])
Reject(a) == /\ RejectReason(a)
 /\ s' = [s EXCEPT !.outcome[a] = "error", !.pc[a] = "release-error"]
Work(a) == Submit(a) \/ Acquire(a) \/ ExactRetry(a) \/ Reject(a) \/ Build(a) \/ CheckStep(a) \/ CheckPrepared(a)
 \/ Admit(a) \/ Reserve(a) \/ PublishDependencies(a) \/ PrepareIndex(a) \/ BeginHead(a) \/ SelectHead(a)
 \/ Release(a) \/ Acknowledge(a) \/ ReleaseError(a)
Done == /\ (\A a \in Actors: s.pc[a] = "done") /\ UNCHANGED s
Next == (\E a \in Actors: Work(a) \/ Fail(a) \/ Crash(a)) \/ Reopen \/ RemoveIndex \/ Done
Spec == Init /\ [][Next]_vars
FairSpec == Spec /\ \A a \in Actors: WF_vars(Work(a))
TypeOK == /\ Len(s.nodes) \in 2..5 /\ s.candidate \in [Actors -> 0..Len(s.nodes)] /\ s.reply \in [Actors -> 0..Len(s.nodes)]
 /\ s.owner \in [Apps -> 0..3] /\ s.attempted \in [Actors -> BOOLEAN] /\ s.uncertain \in [Actors -> BOOLEAN]
 /\ \A app \in Apps: /\ Len(s.history[app]) \in 1..StateLimit
  /\ s.selectedRevision[app] \in {1,2} /\ s.selectedMemory[app] \in {1,2}
 /\ \A a \in Actors: /\ s.pc[a] \in {"idle","submitted","inspect","step","prepared-check","admit","quota","cas","index","begin-head","select","release","ack","release-error","done"}
  /\ s.outcome[a] \in {"none","success","error","crashed"}
ContentIdentity == \A i,j \in 1..Len(s.nodes): (s.nodes[i] = s.nodes[j]) = (i = j)
Custody == \A a \in Actors: s.pc[a] \notin {"idle","submitted","ack","done"} => s.owner[App(a)] = a
CommittedPrefix == \A app \in Apps: \A n \in 2..Len(s.history[app]): Node(s.history[app][n]).previous = s.history[app][n-1]
IdentityUnique == \A app \in Apps: Cardinality({Node(n).operation: n \in Committed(app)}) = Len(s.history[app])
NamespaceIsolation == \A app \in Apps: \A n \in Committed(app): Node(n).application = app
SelectionAtomic == \A app \in Apps: /\ s.head[app] = s.history[app][Len(s.history[app])]
 /\ s.selectedRevision[app] = Node(s.head[app]).revision /\ s.selectedMemory[app] = Node(s.head[app]).memory
DependenciesBeforeHead == \A app \in Apps: Committed(app) \subseteq s.cas
QuotaBeforeHead == \A app \in Apps: Committed(app) \subseteq s.grants
HostBeforeHead == \A app \in Apps: Committed(app) \ {SeedId(app)} \subseteq s.admitted
SequenceEpoch == \A app \in Apps: \A n \in 2..Len(s.history[app]):
 LET now == Node(s.history[app][n]) prior == Node(s.history[app][n-1])
 IN now.sequence = prior.sequence + 1 /\ now.epoch = prior.epoch + (IF Activating(now.kind) THEN 1 ELSE 0)
CompatibleSelection == \A app \in Apps: \A n \in 2..Len(s.history[app]):
 LET now == Node(s.history[app][n]) prior == Node(s.history[app][n-1])
     r == Revision(now.revision) old == Revision(prior.revision)
 IN IF Activating(now.kind) THEN /\ now.revision # prior.revision /\ r.parent = prior.revision
      /\ r.runtime = old.runtime /\ r.caps \subseteq old.caps /\ old.entries \subseteq r.entries
      /\ (now.kind # "activate" \/ r.schema = old.schema)
    ELSE now.revision = prior.revision
SpecialKinds == \A app \in Apps: \A n \in 2..Len(s.history[app]):
 LET now == Node(s.history[app][n]) prior == Node(s.history[app][n-1])
 IN /\ (now.kind \notin {"restore","propose"} \/ (now.memory = prior.memory /\ now.intents = {}))
    /\ (now.kind # "investigate" \/ (now.memory = prior.memory /\ now.intents # {}))
RequestBinding == \A app \in Apps: \A id \in Committed(app) \ {SeedId(app)}:
 LET n == Node(id) IN /\ n.request.application = n.application /\ n.request.operation = n.operation /\ n.request.kind = n.kind
 /\ n.request.expected = n.previous /\ n.request.revision = n.revision /\ n.request.memory = n.memory /\ n.request.intents = n.intents
EvidenceBound == \A app \in Apps: \A id \in Committed(app) \ {SeedId(app)}:
 LET n == Node(id) IN /\ (n.kind \in {"restore","propose"} => n.request.evidence.parent = n.previous /\ n.request.evidence.admitted)
 /\ (n.kind = "migrate" => n.request.evidence.sourceMemory = Node(n.previous).memory /\ n.request.evidence.sourceRevision = Node(n.previous).revision /\ n.request.evidence.targetRevision = n.revision /\ n.request.evidence.targetMemory = n.memory /\ n.request.evidence.targetSchema = Revision(n.revision).schema /\ n.request.evidence.admitted /\ n.request.evidence.consumed)
ReturnBinding == \A a \in Actors: s.outcome[a] = "success" =>
 /\ s.reply[a] \in Committed(App(a)) /\ Node(s.reply[a]).request = s.command[a]
MutationErrorsUncertain == \A a \in Actors: s.outcome[a] = "error" /\ s.attempted[a] => s.uncertain[a]
NoInventedUncertainty == \A a \in Actors: s.uncertain[a] => s.outcome[a] = "error" /\ s.attempted[a]
EventuallyReturned == <>(\A a \in Actors: s.pc[a] = "done")
NeverPublishDependencies == [][~(\E a \in Actors: PublishDependencies(a))]_vars
NeverPrepareIndex == [][~(\E a \in Actors: PrepareIndex(a))]_vars
NeverSelectHead == [][~(\E a \in Actors: SelectHead(a))]_vars
NeverRetryOldHead == [][~(\E a \in Actors: ExactRetry(a) /\ Prepared(a) # s.head[App(a)])]_vars
NeverRetryDeniedHost == [][~(\E a \in Actors: ExactRetry(a) /\ ~HostAllows(a))]_vars
NeverRejectConflict == [][~(\E a \in Actors: Reject(a) /\ IndexConflict(a))]_vars
NeverRejectMissingIndex == [][~(\E a \in Actors: Reject(a) /\ s.removed /\ MissingDuplicate(a))]_vars
NeverRejectSecondHead == [][~(\E a \in Actors: Reject(a) /\ s.pc[a] = "step" /\ Node(s.candidate[a]).previous # s.head[App(a)])]_vars
NeverFailAfterSelection == [][~(\E a \in Actors: Fail(a) /\ s.pc[a] = "release" /\ s.attempted[a] /\ s.reply[a] = s.candidate[a])]_vars
NeverFailBeforeSelection == [][~(\E a \in Actors: Fail(a) /\ s.pc[a] = "select")]_vars
NeverCrashPrepared == [][~(\E a \in Actors: Crash(a) /\ s.pc[a] = "begin-head")]_vars
NeverFinishOrphan == [][~(\E a \in Actors: SelectHead(a) /\ s.crashed /\ a = 2 /\ s.orphan = s.candidate[a])]_vars
NeverRejectOrphan == [][~(\E a \in Actors: Reject(a) /\ s.crashed /\ s.orphan = Prepared(a) /\ Prepared(a) # 0 /\ Prepared(a) \notin Committed(App(a)) /\ ~HeadAllowed(a))]_vars
NeverParallelNamespaces == [][~(\E a \in Actors: Acquire(a) /\ \E app \in Apps \ {App(a)}: s.owner[app] # 0)]_vars
NeverRemoveIndex == [][~RemoveIndex]_vars
NeverReopen == [][~Reopen]_vars
NeverDenyHost == [][~(\E a \in Actors: Reject(a) /\ s.pc[a] = "admit")]_vars
NeverRejectStep == [][~(\E a \in Actors: Reject(a) /\ s.pc[a] = "step")]_vars
NeverMigrateAfterSamePair == [][~(\E a \in Actors: SelectHead(a) /\ Node(s.candidate[a]).kind = "migrate" /\ s.command[a].evidence.parent # s.head[App(a)])]_vars
NeverDenyQuota == [][~(\E a \in Actors: Fail(a) /\ s.pc[a] = "quota")]_vars
=============================================================================
