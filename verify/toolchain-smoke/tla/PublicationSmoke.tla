-------------------------- MODULE PublicationSmoke --------------------------
EXTENDS TLC

CONSTANTS UnsafePublish, BlockPublish
VARIABLES prepared, committed

vars == <<prepared, committed>>

Init == /\ prepared = FALSE
        /\ committed = FALSE

Prepare == /\ ~prepared
           /\ ~committed
           /\ prepared' = TRUE
           /\ UNCHANGED committed

Publish == /\ ~committed
           /\ ~BlockPublish
           /\ (prepared \/ UnsafePublish)
           /\ committed' = TRUE
           /\ UNCHANGED prepared

Wait == UNCHANGED vars
Next == Prepare \/ Publish \/ Wait

Spec == Init /\ [][Next]_vars /\ WF_vars(Prepare) /\ WF_vars(Publish)

TypeOK == /\ prepared \in BOOLEAN
          /\ committed \in BOOLEAN
PreparedBeforeCommit == committed => prepared
EventuallyCommitted == <>committed

\* These intentionally false invariants produce concrete reachability traces.
NeverPrepared == ~prepared
NeverCommitted == ~committed
=============================================================================
