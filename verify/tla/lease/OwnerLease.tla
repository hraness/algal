--------------------------- MODULE OwnerLease ---------------------------
EXTENDS Naturals, FiniteSets

CONSTANTS ActorCount, Capacity, InitialDb, InitialMarker, InitialArchive,
          Runtime, Faults, Reopens, Mutation

Actors == IF ActorCount = 3 THEN {"one", "two", "three"} ELSE {"one", "two"}
Inodes == {"retained", "replacement"}
Nonces == Actors \cup (IF Reopens = 0 THEN {} ELSE {"one-again", "two-again", "three-again"}) \cup {"stale", "spare"}
Markers == Nonces \cup {"none", "foreign"}
DbStates == {"missing", "empty", "ready", "foreign-schema", "foreign-contract"}
Pcs == {"new", "inspect", "schema", "contract", "acquire", "validate",
        "read", "marker", "archive", "clear", "publish", "admit", "body",
        "drop", "release", "return", "done", "dead"}
Results == {"pending", "body-ok", "error", "cleanup-error", "ok", "crashed"}
InitialArchives == CASE InitialArchive \in {"equal", "conflict"} -> {"stale"}
                       [] InitialArchive = "full" -> {"spare"}
                       [] OTHER -> {}

VARIABLES s, crashes
vars == <<s, crashes>>
Token(a) == IF s.attempt[a] = 0 THEN a ELSE
             CASE a = "one" -> "one-again" [] a = "two" -> "two-again" [] OTHER -> "three-again"
Held(a) == s.connection[a] \in Inodes /\ s.owner[s.connection[a]] = a
EqualArchive(t) == t \in s.archives /\ ~(t = "stale" /\ InitialArchive = "conflict")
Init == /\ s = [pathInode |-> "retained",
             db |-> [i \in Inodes |-> IF i = "retained" THEN InitialDb ELSE "ready"],
             owner |-> [i \in Inodes |-> "none"],
             connection |-> [a \in Actors |-> "none"],
             pc |-> [a \in Actors |-> "new"],
             attempt |-> [a \in Actors |-> 0],
             result |-> [a \in Actors |-> "pending"],
             old |-> [a \in Actors |-> "none"],
             marker |-> InitialMarker, archives |-> InitialArchives,
             cleared |-> {}, published |-> {}, entered |-> {}, acked |-> {},
             badAdmission |-> FALSE]
        /\ crashes = 0

Open(a) ==
  /\ s.pc[a] = "new"
  /\ s' = [s EXCEPT !.connection[a] = s.pathInode, !.pc[a] = "inspect"]
  /\ UNCHANGED crashes
Inspect(a) ==
  /\ s.pc[a] = "inspect"
  /\ s' = [s EXCEPT !.pc[a] = CASE s.db[s.connection[a]] = "missing" -> "schema"
                              [] s.db[s.connection[a]] = "empty" -> "contract"
                              [] s.db[s.connection[a]] = "ready" \/ Mutation = "accept-foreign-contract" -> "acquire"
                              [] OTHER -> "release",
                   !.result[a] = IF s.db[s.connection[a]] \in {"foreign-schema", "foreign-contract"}
                                    /\ Mutation # "accept-foreign-contract"
                                 THEN "error" ELSE @]
  /\ UNCHANGED crashes
CreateSchema(a) ==
  /\ s.pc[a] = "schema"
  /\ s' = [s EXCEPT !.db[s.connection[a]] = IF @ = "missing" THEN "empty" ELSE @,
                   !.pc[a] = "inspect"]
  /\ UNCHANGED crashes
InitializeContract(a) ==
  /\ s.pc[a] = "contract"
  /\ s' = [s EXCEPT !.db[s.connection[a]] = IF @ = "empty" THEN "ready" ELSE @,
                   !.pc[a] = "acquire"]
  /\ UNCHANGED crashes
BootstrapBusy(a) ==
  /\ s.pc[a] \in {"schema", "contract"}
  /\ s' = [s EXCEPT !.pc[a] = "release", !.result[a] = "error"]
  /\ UNCHANGED crashes
Acquire(a) ==
  /\ s.pc[a] = "acquire"
  /\ s.owner[s.connection[a]] = "none" \/ Mutation = "skip-mutex"
  /\ s' = [s EXCEPT !.owner[s.connection[a]] = IF Mutation = "skip-mutex" THEN @ ELSE a,
                   !.pc[a] = "validate"]
  /\ UNCHANGED crashes
RejectContention(a) ==
  /\ s.pc[a] = "acquire" /\ s.owner[s.connection[a]] # "none"
  /\ s' = [s EXCEPT !.pc[a] = "release", !.result[a] = "error"]
  /\ UNCHANGED crashes
Validate(a) ==
  /\ s.pc[a] = "validate"
  /\ s' = [s EXCEPT !.pc[a] = IF s.db[s.connection[a]] = "ready" \/ Mutation = "accept-foreign-contract"
                              THEN "read" ELSE "release",
                   !.result[a] = IF s.db[s.connection[a]] = "ready" \/ Mutation = "accept-foreign-contract"
                                  THEN @ ELSE "error"]
  /\ UNCHANGED crashes
ReadMarker(a) ==
  /\ s.pc[a] = "read"
  /\ s' = [s EXCEPT !.old[a] = s.marker, !.pc[a] = "marker"]
  /\ UNCHANGED crashes
AdmitMarker(a) ==
  /\ s.pc[a] = "marker" /\ s.old[a] # "foreign"
  /\ s' = [s EXCEPT !.pc[a] = IF s.old[a] = "none" THEN "publish" ELSE "archive"]
  /\ UNCHANGED crashes
RejectMarker(a) ==
  /\ s.pc[a] = "marker" /\ s.old[a] = "foreign" /\ Mutation # "erase-foreign-marker"
  /\ s' = [s EXCEPT !.pc[a] = "release", !.result[a] = "error"]
  /\ UNCHANGED crashes
EraseForeign(a) ==
  /\ s.pc[a] = "marker" /\ s.old[a] = "foreign" /\ Mutation = "erase-foreign-marker"
  /\ s' = [s EXCEPT !.pc[a] = "clear"]
  /\ UNCHANGED crashes
Archive(a) ==
  /\ s.pc[a] = "archive"
  /\ EqualArchive(s.old[a]) \/ (s.old[a] \notin s.archives /\
       (Cardinality(s.archives) < Capacity \/ Mutation = "ignore-archive-bound"))
  /\ s' = [s EXCEPT !.archives = @ \cup {s.old[a]}, !.pc[a] = "clear"]
  /\ UNCHANGED crashes
RejectArchive(a) ==
  /\ s.pc[a] = "archive"
  /\ ~EqualArchive(s.old[a])
  /\ s.old[a] \in s.archives \/ Cardinality(s.archives) >= Capacity
  /\ s' = [s EXCEPT !.pc[a] = "release", !.result[a] = "error"]
  /\ UNCHANGED crashes
SkipArchive(a) ==
  /\ s.pc[a] = "archive" /\ Mutation = "unlink-before-archive"
  /\ s' = [s EXCEPT !.pc[a] = "clear"]
  /\ UNCHANGED crashes
ClearOld(a) ==
  /\ s.pc[a] = "clear"
  /\ s' = [s EXCEPT !.marker = "none", !.cleared = @ \cup {s.old[a]}, !.pc[a] = "publish"]
  /\ UNCHANGED crashes
Publish(a) ==
  /\ s.pc[a] = "publish" /\ s.marker = "none"
  /\ s' = [s EXCEPT !.marker = Token(a), !.published = @ \cup {Token(a)}, !.pc[a] = "admit"]
  /\ UNCHANGED crashes
RejectPublication(a) ==
  /\ s.pc[a] = "publish" /\ s.marker # "none"
  /\ s' = [s EXCEPT !.pc[a] = "release", !.result[a] = "error"]
  /\ UNCHANGED crashes
Enter(a) ==
  /\ s.pc[a] = "admit"
  /\ s' = [s EXCEPT !.entered = @ \cup {Token(a)}, !.pc[a] = "body",
                   !.badAdmission = @ \/ s.db[s.connection[a]] # "ready"]
  /\ UNCHANGED crashes
Finish(a) ==
  /\ s.pc[a] = "body"
  /\ s' = [s EXCEPT !.pc[a] = "drop", !.result[a] = "body-ok"]
  /\ UNCHANGED crashes
FinishError(a) ==
  /\ Faults /\ s.pc[a] = "body"
  /\ s' = [s EXCEPT !.pc[a] = "drop", !.result[a] = "error"]
  /\ UNCHANGED crashes
DropMarker(a) ==
  /\ s.pc[a] = "drop" /\ s.marker = Token(a)
  /\ s' = [s EXCEPT !.marker = "none", !.pc[a] = "release"]
  /\ UNCHANGED crashes
DropFailure(a) ==
  /\ s.pc[a] = "drop" /\ (Faults \/ s.marker # Token(a))
  /\ s' = [s EXCEPT !.pc[a] = "release",
                   !.result[a] = IF Runtime = "bun" THEN "cleanup-error" ELSE @]
  /\ UNCHANGED crashes
Release(a) ==
  /\ s.pc[a] = "release"
  /\ s' = [s EXCEPT !.owner = [i \in Inodes |-> IF s.owner[i] = a THEN "none" ELSE s.owner[i]],
                   !.pc[a] = IF s.result[a] = "body-ok" THEN "return" ELSE "done"]
  /\ UNCHANGED crashes
Return(a) ==
  /\ s.pc[a] = "return"
  /\ s' = [s EXCEPT !.pc[a] = "done", !.result[a] = "ok", !.acked = @ \cup {Token(a)}]
  /\ UNCHANGED crashes
IoError(a) ==
  /\ Faults /\ s.pc[a] \in {"inspect", "schema", "contract", "acquire", "validate",
                              "read", "marker", "archive", "clear", "publish", "admit"}
  /\ s' = [s EXCEPT !.pc[a] = "release", !.result[a] = "error"]
  /\ UNCHANGED crashes
Crash(a) ==
  /\ Faults /\ crashes < 1 /\ s.pc[a] \notin {"new", "done", "dead"}
  /\ s' = [s EXCEPT !.owner = [i \in Inodes |-> IF s.owner[i] = a THEN "none" ELSE s.owner[i]],
                   !.pc[a] = "dead", !.result[a] = "crashed"]
  /\ crashes' = crashes + 1
Reopen(a) ==
  /\ s.pc[a] = "dead" /\ s.attempt[a] < Reopens
  /\ s' = [s EXCEPT !.pc[a] = "new", !.attempt[a] = @ + 1,
                   !.result[a] = "pending", !.connection[a] = "none", !.old[a] = "none"]
  /\ UNCHANGED crashes
ReplaceInode ==
  /\ Mutation = "replace-inode" /\ s.pathInode = "retained"
  /\ s.owner["retained"] # "none"
  /\ s' = [s EXCEPT !.pathInode = "replacement"]
  /\ UNCHANGED crashes

ActorStep(a) == Open(a) \/ Inspect(a) \/ CreateSchema(a) \/ InitializeContract(a)
  \/ BootstrapBusy(a) \/ Acquire(a) \/ RejectContention(a) \/ Validate(a)
  \/ ReadMarker(a) \/ AdmitMarker(a) \/ RejectMarker(a) \/ EraseForeign(a)
  \/ Archive(a) \/ RejectArchive(a) \/ SkipArchive(a) \/ ClearOld(a)
  \/ Publish(a) \/ RejectPublication(a) \/ Enter(a) \/ Finish(a) \/ FinishError(a)
  \/ DropMarker(a) \/ DropFailure(a) \/ Release(a) \/ Return(a) \/ IoError(a)
  \/ Crash(a) \/ Reopen(a)
Done == /\ \A a \in Actors: s.pc[a] \in {"done", "dead"} /\ UNCHANGED vars
Next == (\E a \in Actors: ActorStep(a)) \/ ReplaceInode \/ Done
Spec == Init /\ [][Next]_vars
FairSpec == Spec /\ (\A a \in Actors: WF_vars(ActorStep(a)))

TypeOK == /\ s.pathInode \in Inodes /\ s.db \in [Inodes -> DbStates]
          /\ s.owner \in [Inodes -> Actors \cup {"none"}]
          /\ s.connection \in [Actors -> Inodes \cup {"none"}]
          /\ s.pc \in [Actors -> Pcs] /\ s.attempt \in [Actors -> 0..Reopens]
          /\ s.result \in [Actors -> Results] /\ s.old \in [Actors -> Markers]
          /\ s.marker \in Markers /\ s.archives \subseteq Nonces
          /\ s.cleared \subseteq Nonces \cup {"foreign"}
          /\ s.published \subseteq Nonces /\ s.entered \subseteq Nonces
          /\ s.acked \subseteq Nonces /\ s.badAdmission \in BOOLEAN /\ crashes \in 0..1
NoConcurrentCallbacks == Cardinality({a \in Actors: s.pc[a] \in {"body", "drop"}}) <= 1
CriticalSectionCustody == \A a \in Actors:
  s.pc[a] \in {"validate", "read", "marker", "archive", "clear", "publish", "admit", "body", "drop"}
  => Held(a)
RecognizedEvidencePreserved == (s.cleared \ {"foreign"}) \subseteq s.archives
ForeignMarkerRetained == InitialMarker = "foreign" => s.marker = "foreign"
ArchiveBound == Cardinality(s.archives) <= Capacity
ForeignContractRefused == ~s.badAdmission
CallbackWasPublished == s.entered \subseteq s.published
AcknowledgmentWasAdmitted == s.acked \subseteq s.entered
EventuallySettled == <>(\A a \in Actors: s.pc[a] \in {"done", "dead"})
EventuallyAdmitted == <>(s.entered # {})

NeverOpen == [][~(\E a \in Actors: Open(a))]_vars
NeverInspect == [][~(\E a \in Actors: Inspect(a))]_vars
NeverCreateSchema == [][~(\E a \in Actors: CreateSchema(a))]_vars
NeverInitializeContract == [][~(\E a \in Actors: InitializeContract(a))]_vars
NeverBootstrapBusy == [][~(\E a \in Actors: BootstrapBusy(a))]_vars
NeverAcquire == [][~(\E a \in Actors: Acquire(a))]_vars
NeverRejectContention == [][~(\E a \in Actors: RejectContention(a))]_vars
NeverValidate == [][~(\E a \in Actors: Validate(a))]_vars
NeverReadMarker == [][~(\E a \in Actors: ReadMarker(a))]_vars
NeverAdmitMarker == [][~(\E a \in Actors: AdmitMarker(a))]_vars
NeverRejectMarker == [][~(\E a \in Actors: RejectMarker(a))]_vars
NeverArchive == [][~(\E a \in Actors: Archive(a))]_vars
NeverRejectArchive == [][~(\E a \in Actors: RejectArchive(a))]_vars
NeverClearOld == [][~(\E a \in Actors: ClearOld(a))]_vars
NeverPublish == [][~(\E a \in Actors: Publish(a))]_vars
NeverEnter == [][~(\E a \in Actors: Enter(a))]_vars
NeverFinish == [][~(\E a \in Actors: Finish(a))]_vars
NeverFinishError == [][~(\E a \in Actors: FinishError(a))]_vars
NeverDropMarker == [][~(\E a \in Actors: DropMarker(a))]_vars
NeverDropFailure == [][~(\E a \in Actors: DropFailure(a))]_vars
NeverRelease == [][~(\E a \in Actors: Release(a))]_vars
NeverReturn == [][~(\E a \in Actors: Return(a))]_vars
NeverIoError == [][~(\E a \in Actors: IoError(a))]_vars
NeverCrash == [][~(\E a \in Actors: Crash(a))]_vars
NeverReopen == [][~(\E a \in Actors: Reopen(a))]_vars
=============================================================================
