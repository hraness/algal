# Bounded durable protocol models

These are finite abstract protocol checks, not implementation proofs. `run.ts`
executes the pinned TLC 1.7.4 jar (engine 2.19) and task-local pinned Java. No
runtime product dependency is introduced. Raw framed tool output, exact
configuration, command completion, complete runtime-file hashes, model/source
bindings and counterexamples are retained in the returned JSON evidence.

```sh
bun verify/tla/run.ts --suite custody > /private/tmp/algal-custody-evidence.json
bun verify/tla/run.ts --suite publication > /private/tmp/algal-publication-evidence.json
bun verify/tla/run.ts --suite lease
bun verify/tla/run.ts --suite process
bun verify/tla/run.ts --suite mailbox
bun verify/tla/run.ts --suite application
bun verify/tla/run.ts --suite outbox
bun verify/tla/run.ts --suite quota
bun verify/tla/run.ts --suite authority
bun test verify/tla/tlc.test.ts
```

This host requires permitted ephemeral local listener access for TLC. An access
failure is a tool failure, never an invariant counterexample. Java/TLC paths and
executable pins come from `verify/toolchains.json`; only the reviewed static argv
is executed. Each model/configuration is copied to a fresh temporary directory.
Sources and tools must match before and after execution and on later admission.
The source binding conservatively includes the whole governed production, test,
specification and build inventory, plus every imported profile declaration.
`LIVE_SOURCES` records reviewed correspondence; it is not treated as a complete
transitive dependency graph. Binding source bytes does not prove refinement.
`java-runtime.json` contains all 456 runtime file hashes derived directly from
the Temurin archive after checking its SHA256
`3623232f33a9c3baadf304480b2535f9a3cba8a58d42ecbb438ba267315d9998`.
The extracted installation must exactly match that inventory, including
`lib/server/libjvm.dylib` and `lib/modules`; pinning only `bin/java` is insufficient.
Host kernel and system libraries remain explicit trust assumptions.
`qualify-java-runtime.py` reproduces that manifest by reading the checked archive
without extracting it; it never derives expected hashes from the current install.
The stable definition digest excludes result locations, evidence status and the
property registry, preventing a result from hashing itself.

`definitions.ts` is the complete finite inventory: actors, applications, attempts,
capacity, inodes, directory bindings and crash counts. There are no state/action
constraints, overrides, symmetry reductions, recovery checkpoints or depth limits.
Every successful profile requires a nonempty, nonconstant, exhausted state graph,
named invariant coverage, actual temporal completion when enabled, and TLC's
reported **calculated optimistic fingerprint collision estimate** below 1e-6.
That estimate is not guaranteed collision freedom. The parser supports the pinned
format and rejects unknown error/warning frames, truncated logs and mismatched
tool modes/configurations.

Every important action has a separate reachable counterexample to
`NeverAction == [][~Action]_vars`. The action property excludes stuttering by its
semantics; its counterexample must additionally end in the named action with
different complete printed states. Coverage evaluation counters are not used as
transition witnesses. Crash/reopen witnesses for successful publication require
an acknowledged state, not merely a crash from Init. Deliberate protocol mutations
must violate the intended invariant/property and contain a reachable trace; a
nonzero exit, parser failure, timeout or wrong property cannot pass a mutation.
Pinned TLC does not name a failed liveness property, so each liveness configuration
has exactly one temporal property and its exact configuration is bound. TLC runs
with one worker, a fixed seed and `-lncheck final`, so liveness is checked only
after the reachable graph is exhausted; a counterexample from TLC's periodic
partial-graph check is rejected rather than admitted.

## Custody correspondence and limits

`custody/Custody.tla` distinguishes the namespace (`present`) from committed head,
the stable per-application primary lease from the permanent compatibility lease,
expected-head check, host admission, quota reservation, head publication, lease
release and public acknowledgment. Source correspondence is to
`FileApplicationStorage.custody`/native `Service::custody`,
`ApplicationCore.commit`, `FileApplicationStorage.publication`, and
`application-quota` in the source files listed by `LIVE_SOURCES`.
`ApplicationService` is the filesystem facade; the portable `ApplicationStorage`
interface states host obligations without enforcing them for an arbitrary adapter.
The selection
action represents the released global namespace scan and its later acquisition
gap. Old/cutover profiles choose their original identity from committed head
presence; upgraded code rechecks namespace presence under its stable primary.
Existing namespaces acquire compatibility custody before checking/admission;
new namespaces acquire it after admission/quota and before publication. Release
precedes the observed public successful return.

Critical sections require their modeled primary/compatibility custody, and every
created namespace must have a quota charge. A prepared, charged namespace with no
head is an additional initial profile. The three-writer profile covers one attempt each. A separate profile has one old
writer and two upgraded writers; it does not qualify overlapping unfixed old
writers. Two independent applications and capacity 0/1/2 are separate profiles.
Capacity here means the finite quota reservation set, not a proof of the complete
32-name directory enumeration/recovery implementation. Full-capacity runtime
regressions remain required. Safety assumes cooperating canonical path identities
and exclusive leases. It does not prove SQLite/OS locking. Only the separate
no-crash progress profile assumes weak fairness, including eventual host-admission
resolution. No progress under crashes or unresponsive external callbacks is claimed.
Native `OwnerLease::Drop` does not expose cleanup I/O errors. Its SQLite live
authority and bounded retained-marker recovery differ from the mailbox's explicit
release operation; the mailbox clean-lock-after-ACK invariant does not apply to
OwnerLease. See [retained application custody](../../spec/v1/application.md#retained-application-custody).
The mutations restore changing lock identity, omit head checking, release before
publication, serialize independent callbacks globally, or omit fairness.

## Filesystem correspondence and limits

`publication/Publication.tla` tracks volatile and durable inode contents separately
from directory bindings. Two ancestor entries below an explicitly durable anchor
may begin missing or visible but unsynced. File sync records the opened inode;
directory sync records immediate bindings. Background persistence chooses content
and bindings independently. Crash discards volatile state and reopen checks the
durable image. Store publication, retained-winner validation/sync, and mutable head
publication correspond to `FileStore`, native `Store`, and the durable filesystem
helpers. The head's dependency uses a **separate branch** from the selected-head
path. Its dependency-directory sync is an explicit composition assumption: the
complete dependency path is qualified before dependency ACK by the separately
checked Store publication contract. Intermediate dependency barriers are not
expanded here; this is not an atomic whole-store transaction or a proof for
arbitrary dependency graphs.

The model distinguishes fresh publication, a valid retained immutable winner,
corruption, existing but unqualified ancestor bindings, and a selected head with
one dependency. It never repairs retained corruption. Directory qualification
precedes fresh writes and the destination is synced after publication. Repeated
ancestor syncs that do not change the modeled image may stutter. One publisher,
two candidate inodes, one dependency and at most one crash are finite bounds;
concurrent namespace replacement, symlink attacks and arbitrary filesystem behavior
are excluded. Missing file, leaf, either ancestor, retained-winner or dependency
barriers have separate intended counterexamples.

`publication/MailboxPublication.tla` models one received key with an initially
durable payload/path, pending/consumed bindings, and a pathname lock. Consumed
temp content is written and file-synced before `PublishConsumed` links the
consumed binding; its directory is then synced before pending unlink. Pending deletion and
lock release become durable before public acknowledgment. Pending, consumed and
lock persistence are independent; no cross-directory rename crash atomicity is
assumed. A clean initial state cannot reopen with neither pending nor a valid
consumed marker. An acknowledged receive must reopen consumed-only and unlocked.
An initially ambiguous transfer is rejected. Pre-acknowledgment crash residue can
remain ambiguous or locked; it is never automatically reclaimed by this model.
This is not exactly-once delivery, automatic reconciliation, or retroactive safety
for arbitrary legacy claim-only layouts. Mailbox capability/count/retry protocols
remain later model obligations.

Real syscall checkpoints and deterministic runtime schedules provide separate
observed/sampled conformance evidence. They do not make these abstraction maps
proved refinements. Actual power-loss qualification of an exact filesystem and
hardware configuration is a separate obligation.
The filesystem/host contract is documented in
[organism publication](../../spec/v1/organism.md) and
[process custody and mailbox persistence](../../spec/v1/process.md).
Stable mounts, a durable physical root and cooperating writers are assumptions.
Arbitrary imported/legacy dependency graphs are not retroactively qualified.

The pinned output grammar is based on the upstream
[message definitions](https://github.com/tlaplus/tlaplus/blob/v1.7.4/tlatools/org.lamport.tlatools/src/tlc2/output/EC.java)
and [message formatter](https://github.com/tlaplus/tlaplus/blob/v1.7.4/tlatools/org.lamport.tlatools/src/tlc2/output/MP.java).

## Process, journal, mailbox and retained-owner models

The Phase05 inventories compose through reviewed assumptions, with separate
[owner-lease scope](lease/SCOPE.md), [journal scope](process-journal/SCOPE.md),
[process-generation scope](process/SCOPE.md) and [mailbox scope](mailbox/SCOPE.md).
`process` runs both lifecycle and effect-journal modules. Each profile has its own
explicit bounds and safety properties; fair progress configurations are separate.
The joined inventory rejects globally reused profile/mutation IDs and mutations
whose named property is absent from their base. Single-record and multivariable
TLC state formats are both admitted under the same bounded framed-output checks.

The corresponding `process-conformance`, `mailbox-conformance` and
`lease-conformance` suites require an explicit freshly built native libtest
artifact in `ALGAL_TRACE_TEST_BIN`. They execute named native cases and bounded
Bun integration tests, retaining raw outcomes and source/artifact identity. These
are sampled correspondence checks; separate full process/native CLI parity and
repository gates remain required.

## Application selection, outbox, quota and authority

Four separate suites retain the per-suite 128-run bound:

| Suite | Positive profiles | Reachability witnesses | Unsafe controls | Runs |
| --- | ---: | ---: | ---: | ---: |
| `application` | 32 | 38 | 9 | 79 |
| `outbox` | 18 | 33 | 10 | 61 |
| `quota` | 12 | 19 | 6 | 37 |
| `authority` | 45 | 55 | 19 | 119 |

See [selection scope](application/SCOPE.md), [outbox scope](outbox/SCOPE.md),
[quota scope](quota/SCOPE.md), and [authority scope](authority/SCOPE.md).
Selection covers retained request identity, indexed retries, orphan preparation,
head selection, structural transition checks, and uncertain publication.
Outbox covers ordered dispatch, late effects after interruption, reconciliation,
and the activation barrier. Quota covers shared reservation and completed ledger
publication, including deletion without a refund. Authority separates structural
validity, current host admission, capability syntax, and active registration.
Each suite has separate finite safety and fair-progress profiles. Successful
model checks do not establish unbounded liveness, exactly-once external effects,
cryptographic injectivity, or source refinement.

Bun selection and outbox transitions execute in `src/application-core.ts`;
filesystem custody/publication execute in `src/application-filesystem.ts` through
the `src/application-storage.ts` host contract. The default authority host remains
in `src/application-host.ts`. Message parsing, minting and CAS verification live
in `src/application-message-contract.ts`; retained delivery and local-channel
verification remain in `src/application-message.ts`. These source maps preserve
the separate algorithm, storage, host-admission, and message-evidence boundaries.

`MemoryApplicationStorage` provides volatile adapter conformance and simulations.
Replacing a core while retaining the same adapter is not process-exit durability
evidence. Its tests do not qualify filesystem leases, durable publication or
quota scanning, and an injected storage implementation must separately establish
the interface obligations before borrowing their composition assumptions.

`stateful-app` executes the named Bun application, quota, drain, restoration,
contention, inter-application-message and policy-host cases, and six native
service regressions. It requires `ALGAL_APPLICATION_TEST_BIN` to name a freshly
built, frozen `application_model` integration-test executable (from
`cargo test --locked -p algal --test application_model --no-run`). It does not use
the library-test executable accepted by the other protocol suites. Each selected
native name and Bun file must independently execute positive tests. Whole-source
and artifact hashes are checked before and after execution. Full application
crash tests and application CLI parity remain separate required checks.
