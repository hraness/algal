--------------------------- MODULE Publication ---------------------------
EXTENDS Naturals, FiniteSets
CONSTANTS Kind, Mutation, ExistingAncestors
Inodes == {"new", "old", "dependency"}
Content == {"none", "a", "b", "bad"}
Names == {"ancestor1", "ancestor2", "object", "depAncestor1", "depAncestor2", "dependency"}
Retained == Kind \in {"retained", "corrupt"}
InitialOld == IF Kind = "corrupt" THEN "bad" ELSE IF Retained THEN "b" ELSE "none"

VARIABLES pc, visible, durable, bytes, disk, target, diskTarget, ack, depAck, crashed, reopened, outcome
vars == <<pc, visible, durable, bytes, disk, target, diskTarget, ack, depAck, crashed, reopened, outcome>>
Init == /\ pc = "mkdir1"
        /\ visible = (IF ExistingAncestors THEN {"ancestor1", "ancestor2"} ELSE {})
                      \cup (IF Retained THEN {"object"} ELSE {})
        /\ durable = {}
        /\ bytes = [i \in Inodes |-> IF i = "old" THEN InitialOld ELSE "none"]
        /\ disk = [i \in Inodes |-> IF i = "old" /\ Kind = "corrupt" THEN "bad" ELSE "none"]
        /\ target = (IF Retained THEN "old" ELSE "none")
        /\ diskTarget = "none" /\ ack = FALSE /\ depAck = FALSE
        /\ crashed = FALSE /\ reopened = FALSE /\ outcome = "none"
MkdirOne == /\ pc = "mkdir1" /\ visible' = visible \cup {"ancestor1"} /\ pc' = "mkdir2"
            /\ UNCHANGED <<durable, bytes, disk, target, diskTarget, ack, depAck, crashed, reopened, outcome>>
MkdirTwo == /\ pc = "mkdir2" /\ visible' = visible \cup {"ancestor2"}
            /\ pc' = "ancestor2-sync"
            /\ UNCHANGED <<durable, bytes, disk, target, diskTarget, ack, depAck, crashed, reopened, outcome>>
WriteDependency == /\ pc = "dependency-write"
                   /\ bytes' = [bytes EXCEPT !["dependency"] = "a"]
                   /\ visible' = visible \cup {"depAncestor1", "depAncestor2", "dependency"} /\ pc' = "dependency-file-sync"
                   /\ UNCHANGED <<durable, disk, target, diskTarget, ack, depAck, crashed, reopened, outcome>>
SyncDependencyFile == /\ pc = "dependency-file-sync" /\ disk' = [disk EXCEPT !["dependency"] = bytes["dependency"]]
                      /\ pc' = "dependency-dir-sync"
                      /\ UNCHANGED <<visible, durable, bytes, target, diskTarget, ack, depAck, crashed, reopened, outcome>>
SyncDependencyDirectory == /\ pc = "dependency-dir-sync" /\ durable' = durable \cup {"dependency", "depAncestor1", "depAncestor2"}
                           /\ pc' = "dependency-ack"
                           /\ UNCHANGED <<visible, bytes, disk, target, diskTarget, ack, depAck, crashed, reopened, outcome>>
AckDependency == /\ pc = "dependency-ack" /\ depAck' = TRUE /\ pc' = "write"
                 /\ UNCHANGED <<visible, durable, bytes, disk, target, diskTarget, ack, crashed, reopened, outcome>>
WriteTemp == /\ pc = "write" /\ bytes' = [bytes EXCEPT !["new"] = "a"] /\ pc' = "file-sync"
             /\ UNCHANGED <<visible, durable, disk, target, diskTarget, ack, depAck, crashed, reopened, outcome>>
FileSync == /\ pc = "file-sync"
            /\ disk' = (IF Mutation = "skip-file-sync" THEN disk ELSE [disk EXCEPT !["new"] = bytes["new"]])
            /\ pc' = "publish"
            /\ UNCHANGED <<visible, durable, bytes, target, diskTarget, ack, depAck, crashed, reopened, outcome>>
Publish == /\ pc = "publish"
           /\ target' = (IF Retained /\ Mutation # "overwrite-winner" THEN target ELSE "new")
           /\ visible' = visible \cup {"object"}
           /\ pc' = (IF Retained THEN "validate" ELSE "leaf-sync")
           /\ UNCHANGED <<durable, bytes, disk, diskTarget, ack, depAck, crashed, reopened, outcome>>
ValidateRetained == /\ pc = "validate"
                    /\ pc' = (IF bytes[target] = "bad" THEN "error" ELSE "retained-sync")
                    /\ outcome' = (IF bytes[target] = "bad" THEN "rejected" ELSE outcome)
                    /\ UNCHANGED <<visible, durable, bytes, disk, target, diskTarget, ack, depAck, crashed, reopened>>
SyncRetained == /\ pc = "retained-sync"
                /\ disk' = (IF Mutation = "skip-retained-sync" THEN disk ELSE [disk EXCEPT ![target] = bytes[target]])
                /\ pc' = "leaf-sync"
                /\ UNCHANGED <<visible, durable, bytes, target, diskTarget, ack, depAck, crashed, reopened, outcome>>
SyncLeaf == /\ pc = "leaf-sync"
            /\ durable' = (IF Mutation = "skip-leaf-sync" THEN durable ELSE durable \cup {"object"})
            /\ diskTarget' = (IF Mutation = "skip-leaf-sync" THEN diskTarget ELSE target)
            /\ pc' = "ack"
            /\ UNCHANGED <<visible, bytes, disk, target, ack, depAck, crashed, reopened, outcome>>
SyncAncestorTwo == /\ pc = "ancestor2-sync"
                   /\ durable' = (IF Mutation = "skip-ancestor2-sync" THEN durable ELSE durable \cup {"ancestor2"})
                   /\ pc' = "ancestor1-sync"
                   /\ UNCHANGED <<visible, bytes, disk, target, diskTarget, ack, depAck, crashed, reopened, outcome>>
SyncAncestorOne == /\ pc = "ancestor1-sync"
                   /\ durable' = (IF Mutation = "skip-ancestor1-sync" THEN durable ELSE durable \cup {"ancestor1"})
                   /\ pc' = (IF Kind = "head" /\ Mutation # "skip-dependency" THEN "dependency-write" ELSE "write")
                   /\ UNCHANGED <<visible, bytes, disk, target, diskTarget, ack, depAck, crashed, reopened, outcome>>
Ack == /\ pc = "ack" /\ ack' = TRUE /\ outcome' = "success" /\ pc' = "done"
       /\ UNCHANGED <<visible, durable, bytes, disk, target, diskTarget, depAck, crashed, reopened>>
Error == /\ pc \notin {"done", "error", "crashed"} /\ ~crashed
         /\ pc' = "error" /\ outcome' = (IF "object" \in visible THEN "uncertain" ELSE "rejected")
         /\ UNCHANGED <<visible, durable, bytes, disk, target, diskTarget, ack, depAck, crashed, reopened>>
BackgroundContent(i) == /\ ~crashed /\ bytes[i] # disk[i] /\ disk' = [disk EXCEPT ![i] = bytes[i]]
                         /\ UNCHANGED <<pc, visible, durable, bytes, target, diskTarget, ack, depAck, crashed, reopened, outcome>>
BackgroundBinding(n) == /\ ~crashed /\ n \in visible /\ n \notin durable
                         /\ durable' = durable \cup {n}
                         /\ diskTarget' = (IF n = "object" THEN target ELSE diskTarget)
                         /\ UNCHANGED <<pc, visible, bytes, disk, target, ack, depAck, crashed, reopened, outcome>>
Crash == /\ ~crashed /\ crashed' = TRUE /\ pc' = "crashed"
         /\ visible' = durable /\ bytes' = disk /\ target' = diskTarget
         /\ UNCHANGED <<durable, disk, diskTarget, ack, depAck, reopened, outcome>>
Reopen == /\ pc = "crashed" /\ reopened' = TRUE /\ pc' = "done"
          /\ UNCHANGED <<visible, durable, bytes, disk, target, diskTarget, ack, depAck, crashed, outcome>>
Done == /\ pc \in {"done", "error"} /\ UNCHANGED vars
Next == MkdirOne \/ MkdirTwo \/ WriteDependency \/ SyncDependencyFile \/ SyncDependencyDirectory \/ AckDependency
  \/ WriteTemp \/ FileSync \/ Publish \/ ValidateRetained \/ SyncRetained \/ SyncLeaf
  \/ SyncAncestorTwo \/ SyncAncestorOne \/ Ack \/ Error \/ Crash \/ Reopen \/ Done
  \/ (\E i \in Inodes: BackgroundContent(i)) \/ (\E n \in Names: BackgroundBinding(n))
Spec == Init /\ [][Next]_vars

TypeOK == /\ pc \in {"mkdir1", "mkdir2", "dependency-write", "dependency-file-sync", "dependency-dir-sync", "dependency-ack", "write", "file-sync", "publish", "validate", "retained-sync", "leaf-sync", "ancestor2-sync", "ancestor1-sync", "ack", "done", "error", "crashed"}
          /\ visible \subseteq Names /\ durable \subseteq Names /\ bytes \in [Inodes -> Content] /\ disk \in [Inodes -> Content]
          /\ target \in Inodes \cup {"none"} /\ diskTarget \in Inodes \cup {"none"}
          /\ ack \in BOOLEAN /\ depAck \in BOOLEAN /\ crashed \in BOOLEAN /\ reopened \in BOOLEAN
          /\ outcome \in {"none", "success", "uncertain", "rejected"}
Readable == /\ {"ancestor1", "ancestor2", "object"} \subseteq visible
            /\ target \in Inodes /\ bytes[target] \in {"a", "b"}
ReopenedAckReadable == (reopened /\ ack) => Readable
HeadHasDependency == (reopened /\ ack /\ Kind = "head") =>
  (depAck /\ {"depAncestor1", "depAncestor2", "dependency"} \subseteq visible /\ bytes["dependency"] = "a")
WinnerRetained == Retained => target \in {"old", "none"}
CorruptionNotAcknowledged == Kind = "corrupt" => ~ack
NoSilentRepair == Kind = "corrupt" => bytes["old"] = "bad"
ErrorNotSuccess == pc = "error" => ~ack

NeverMkdirOne == [][~MkdirOne]_vars
NeverWriteTemp == [][~WriteTemp]_vars
NeverFileSync == [][~FileSync]_vars
NeverPublish == [][~Publish]_vars
NeverValidateRetained == [][~ValidateRetained]_vars
NeverSyncRetained == [][~SyncRetained]_vars
NeverSyncLeaf == [][~SyncLeaf]_vars
NeverSyncAncestorTwo == [][~SyncAncestorTwo]_vars
NeverSyncAncestorOne == [][~SyncAncestorOne]_vars
NeverAckDependency == [][~AckDependency]_vars
NeverAck == [][~Ack]_vars
NeverError == [][~Error]_vars
NeverCrash == [][~Crash]_vars
NeverReopen == [][~Reopen]_vars
NeverCrashAfterAck == [][~(Crash /\ ack)]_vars
NeverReopenAfterAck == [][~(Reopen /\ ack)]_vars
=============================================================================
