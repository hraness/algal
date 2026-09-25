------------------------ MODULE MailboxPublication ------------------------
EXTENDS Naturals
CONSTANTS Mutation, Initial
Names == {"pending", "consumed", "lock"}
VARIABLES pc, visible, durable, temp, content, diskContent, ack, crashed, reopened
vars == <<pc, visible, durable, temp, content, diskContent, ack, crashed, reopened>>
Init == /\ pc = "lock"
        /\ visible = (IF Initial = "clean" THEN {"pending"} ELSE {"pending", "consumed"})
        /\ durable = visible
        /\ temp = FALSE /\ content = (Initial # "clean") /\ diskContent = content
        /\ ack = FALSE /\ crashed = FALSE /\ reopened = FALSE
AcquireLock == /\ pc = "lock" /\ visible' = visible \cup {"lock"} /\ pc' = "inspect"
               /\ UNCHANGED <<durable, temp, content, diskContent, ack, crashed, reopened>>
Inspect == /\ pc = "inspect"
           /\ pc' = (IF Initial = "clean" THEN "write"
                    ELSE IF Mutation = "accept-ambiguous" THEN "unlock" ELSE "error")
           /\ UNCHANGED <<visible, durable, temp, content, diskContent, ack, crashed, reopened>>
WriteTemp == /\ pc = "write" /\ temp' = TRUE /\ content' = TRUE
                 /\ pc' = (IF Mutation = "delete-first" THEN "unlink-pending" ELSE "file-sync")
                 /\ UNCHANGED <<visible, durable, diskContent, ack, crashed, reopened>>
FileSync == /\ pc = "file-sync"
            /\ diskContent' = (IF Mutation = "skip-file-sync" THEN diskContent ELSE content)
            /\ pc' = "publish-consumed"
            /\ UNCHANGED <<visible, durable, temp, content, ack, crashed, reopened>>
PublishConsumed == /\ pc = "publish-consumed" /\ temp
                   /\ visible' = visible \cup {"consumed"} /\ pc' = "consumed-sync"
                   /\ UNCHANGED <<durable, temp, content, diskContent, ack, crashed, reopened>>
SyncConsumed == /\ pc = "consumed-sync"
                /\ durable' = (IF Mutation = "skip-consumed-sync" THEN durable ELSE durable \cup {"consumed"})
                /\ pc' = "unlink-pending"
                /\ UNCHANGED <<visible, temp, content, diskContent, ack, crashed, reopened>>
UnlinkPending == /\ pc = "unlink-pending" /\ visible' = visible \ {"pending"} /\ pc' = "pending-sync"
                 /\ UNCHANGED <<durable, temp, content, diskContent, ack, crashed, reopened>>
SyncPending == /\ pc = "pending-sync"
               /\ durable' = (IF Mutation = "skip-pending-sync" THEN durable ELSE durable \ {"pending"})
               /\ pc' = "unlock"
               /\ UNCHANGED <<visible, temp, content, diskContent, ack, crashed, reopened>>
UnlinkLock == /\ pc = "unlock" /\ visible' = visible \ {"lock"} /\ pc' = "lock-sync"
              /\ UNCHANGED <<durable, temp, content, diskContent, ack, crashed, reopened>>
SyncLock == /\ pc = "lock-sync"
            /\ durable' = (IF Mutation = "skip-lock-sync" THEN durable ELSE durable \ {"lock"})
            /\ pc' = "ack"
            /\ UNCHANGED <<visible, temp, content, diskContent, ack, crashed, reopened>>
Ack == /\ pc = "ack" /\ ack' = TRUE /\ pc' = "done"
       /\ UNCHANGED <<visible, durable, temp, content, diskContent, crashed, reopened>>
Error == /\ pc \notin {"error", "done", "crashed"} /\ ~crashed /\ pc' = "error"
         /\ UNCHANGED <<visible, durable, temp, content, diskContent, ack, crashed, reopened>>
BackgroundBinding(n) == /\ ~crashed /\ (n \in visible) # (n \in durable)
                         /\ durable' = (IF n \in visible THEN durable \cup {n} ELSE durable \ {n})
                         /\ UNCHANGED <<pc, visible, temp, content, diskContent, ack, crashed, reopened>>
BackgroundContent == /\ ~crashed /\ content # diskContent /\ diskContent' = content
                     /\ UNCHANGED <<pc, visible, durable, temp, content, ack, crashed, reopened>>
Crash == /\ ~crashed /\ crashed' = TRUE /\ pc' = "crashed"
         /\ visible' = durable /\ content' = diskContent /\ temp' = FALSE
         /\ UNCHANGED <<durable, diskContent, ack, reopened>>
Reopen == /\ pc = "crashed" /\ reopened' = TRUE /\ pc' = "done"
          /\ UNCHANGED <<visible, durable, temp, content, diskContent, ack, crashed>>
Done == /\ pc \in {"done", "error"} /\ UNCHANGED vars
Next == AcquireLock \/ Inspect \/ WriteTemp \/ FileSync \/ PublishConsumed \/ SyncConsumed \/ UnlinkPending
  \/ SyncPending \/ UnlinkLock \/ SyncLock \/ Ack \/ Error \/ BackgroundContent
  \/ (\E n \in Names: BackgroundBinding(n)) \/ Crash \/ Reopen \/ Done
Spec == Init /\ [][Next]_vars

TypeOK == /\ pc \in {"lock", "inspect", "write", "file-sync", "publish-consumed", "consumed-sync", "unlink-pending", "pending-sync", "unlock", "lock-sync", "ack", "done", "error", "crashed"}
          /\ visible \subseteq Names /\ durable \subseteq Names
          /\ temp \in BOOLEAN /\ content \in BOOLEAN /\ diskContent \in BOOLEAN /\ ack \in BOOLEAN /\ crashed \in BOOLEAN /\ reopened \in BOOLEAN
NoUnmarkedLoss == (Initial = "clean" /\ reopened) =>
  ("pending" \in visible \/ ("consumed" \in visible /\ content))
AckCleanReopen == (ack /\ reopened) =>
  ("pending" \notin visible /\ "consumed" \in visible /\ content /\ "lock" \notin visible)
AmbiguousNotAck == Initial # "clean" => ~ack

NeverAcquireLock == [][~AcquireLock]_vars
NeverInspect == [][~Inspect]_vars
NeverWriteTemp == [][~WriteTemp]_vars
NeverFileSync == [][~FileSync]_vars
NeverPublishConsumed == [][~PublishConsumed]_vars
NeverSyncConsumed == [][~SyncConsumed]_vars
NeverUnlinkPending == [][~UnlinkPending]_vars
NeverSyncPending == [][~SyncPending]_vars
NeverUnlinkLock == [][~UnlinkLock]_vars
NeverSyncLock == [][~SyncLock]_vars
NeverAck == [][~Ack]_vars
NeverCrash == [][~Crash]_vars
NeverReopen == [][~Reopen]_vars
NeverCrashAfterAck == [][~(Crash /\ ack)]_vars
NeverReopenAfterAck == [][~(Reopen /\ ack)]_vars
=============================================================================
