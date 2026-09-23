# Process journal model and source correspondence

The model covers one immutable process intent under its live owner lease, two or
three effect ordinals, finite receipt payloads, and bounded host invocations and
recovery charges. Occurrence identity is the ordinal even when abstract request
digests are equal. The receipt values `red`, `blue`, and `known-error` are fields
of completed records. Replay must return that record's payload, rather than a
value reconstructed from the cursor.

`invocation` means a new host/journal incarnation recovering the same persisted
intent. It is **not** the actual ProcessRecord `generation`: uncertain-process
recovery reuses that record and generation. Composition across two actual process
generations, new intents, receipt publication and final process-head selection
belongs to the separate ProcessProtocol model and is not proved here.

## Source correspondence

| Model actions | Reviewed source boundary |
| --- | --- |
| PrepareIntentCAS, CreateHeader, PublishIntent | Bun `src/process.ts:951` creates the journal before saving the intent; native `crates/algal/src/process.rs:713` persists intent CAS, creates the journal at 716, then selects the head at 726. Either preparation order is modeled, but selecting the process head requires both CAS and header. Unselected orphans cannot dispatch after reopen. |
| Open | `src/process-journal.ts:89` and `crates/algal/src/journal.rs:246` admit header, ordinal heads, records and chains. The model begins from admitted records; malformed classification is abstracted below. |
| AdmitRecovery, PublishRecoveryCharge, ReturnRecoveryCharge | `src/process-journal.ts:150` and `crates/algal/src/journal.rs:381`: unknown writes block before a charge; retained count is checked and the next charge is persisted before the instance becomes recovering. |
| WriteStartCAS, PublishStarted, ReturnStarted | `src/process-journal.ts:164,183` and `crates/algal/src/journal.rs:413,443`: started CAS precedes selected ordinal head, and successful admission precedes dispatch. |
| BindingMatches | `src/process-journal.ts:191` and `crates/algal/src/journal.rs:452`: existing records must match the current binding. An unrecorded ordinal has no inherited binding constraint. |
| WriteCompletedCAS, PublishCompleted, ReturnCompleted, Replay | `src/process-journal.ts:209` and `crates/algal/src/journal.rs:483`: completion retains a concrete receipt; completed records replay without dispatch. Returned ordinal and payload are checked independently. |
| ConcurrentPoison | `src/process-journal.ts:178,203,218`: a concurrent call poisons the instance while the first awaits I/O. The first program counter stays in its await window; writes can finish but post-write health checks prevent dispatch or successful completion. Native synchronous `&mut self` calls exclude this interleaving; the combined model conservatively includes the Bun-specific branch. |
| Fail, Crash, LateApply, LateSettle | `src/run.ts:638` races adapters against the host deadline. A losing adapter can finish externally but cannot publish a journal completion. Its outstanding token and the durable started record survive local failure. |
| Finish | `src/process-journal.ts:222` and `crates/algal/src/journal.rs:522` require the selected prefix to be fully consumed and settled. |

These line references describe the frozen source reviewed during Phase04/05
preparation. Integration must bind the actual bytes and review subsequent changes.
The abstract cursor denotes the active ordinal. Bun advances in `before()` and
retains active tokens; native advances in `after()`. One outstanding journal
operation and its host completion boundary are abstracted, not equal internal
cursor values. Illegal concurrent Bun mutation is a poison event, not a second
complete effect pipeline.

## Persistence, failures and uncertainty

CAS and selected-head publication are separate actions. A crash can leave orphan
CAS; only selected chains license replay. Each durable action assumes Phase02's
qualified publication contract. No filesystem, SQLite or hardware persistence
proof is claimed.

Charge persistence and successful return are separate, with cuts on both sides.
A retained charge can consume capacity even if that invocation never retries an
adapter. `InitialRecoveries` represents admitted earlier charges;
`chargedInvocations` is the ghost history of newly persisted charges. The checked
relation is `recoveries = InitialRecoveries + Cardinality(chargedInvocations)`.
Historical charges do not license a current recovered dispatch: it also needs its
own invocation in that set. The exhausted profile starts at the configured bound.

Concurrent poisoning preserves the await program counter, making both post-write
health checks reachable safety boundaries. Ordinary failure poisons the current
instance. Reopen clears volatile poison and re-admits retained evidence. The
process caller abandons failed recovery invocations; repeated direct calls to
native `Journal::begin_recovery()` on the same failed object are not modeled.

`InitialPending` seeds an already-issued abstract ordinal 1 (production ordinal
0), a historical dispatch token, and two initial states: externally applied or
not yet applied. This is a worst-case subset of unknown completion, not a claim
that every started record dispatched. Ordinary traces cover a crash between
started publication and dispatch. Outstanding tokens survive failure. `LateApply`
can apply an issued effect after the host loses ownership; `LateSettle` can settle
it without a known journal outcome. Neither changes selected records, clears
poison, nor licenses retry. A known error may occur without application, or may be
recorded after application. External settlement is not inferred from local abort.

## Claims and limits

Finite invariants cover dispatch prerequisites, no duplicate dispatch of a write
ordinal, per-invocation recovery charges, retained charge counts, poisoned
dispatch/return exclusion, recorded binding equality, immutable completed records,
head CAS membership, settled prefixes and chain transitions, exact receipt
returns, and external application only for issued tokens. These are claims about
this transition system. Source review and later real-runtime conformance give a
tested correspondence, not a proved refinement relation.

`Corruption` denotes an **already-classified** gap, binding or chain failure. It
tests fail-closed control flow, not parser completeness for hostile bytes, digest
collisions, symlinks, path admission, byte budgets or directory-listing bounds.
Request/configuration digests and idempotency keys are exact finite symbolic
identities. CAS references are exact records plus ordinal, not actual bytes or
cryptographic hashes. Persistent namespaces are immutable/cooperating except for
classified malformed input. OwnerLease exclusion is assumed here and addressed
by the separate lease model and runtime controls.

Source admits recovery bounds 1..8. Small profiles at 1 or 2 represent admitted
configurations; `InitialRecoveries = RecoveryLimit` represents actual exhaustion.
The zero-bound profile is an extra disabled-recovery stress case, not a claim that
the source admits a zero-recovery header. No arbitrary-size result follows from
the finite ordinal, receipt, token and invocation bounds.

Liveness is checked only with explicit weak fairness, no faults/crashes, available
storage and terminating adapter actions. `WF_vars(Step)` assumes host/adapter
scheduling progress. The matching unfair profile produces a stuttering
counterexample. Unknown-write refusal, capacity exhaustion, storage failure,
process loss and unresponsive adapters have no automatic-recovery/global-progress
claim. Late external completion does not establish exactly-once effects.

## Profile admission and remaining correspondence

`profiles.ts` declares separate finite safety and fair-liveness configurations,
important nonstuttering action witnesses and expected unsafe variants. The shared
adapter binds these definitions, model/scope/live-source bytes, pinned tools and
raw logs before admitting a result. No state constraint, symmetry reduction or
operator override is used. Scratch exploration counts are preparation evidence
and are not reused as required integrated suite results.

Started/completion health controls and charge-cut/fresh-binding witnesses are
separate. The repeat-write mutant first violates
`ChainValid` before dispatch; that trace is not an observed duplicate dispatch.
Other mutants remove intent CAS/selection, omit recovery charge, extend a
completed record, clear poison, return another ordinal's receipt, or bypass
binding checks.

Release claims still require independent model review, portable Bun/native histories
for each recovery branch, exact bound controls, governed hashes, closed suite
admission, fresh full runs, and ProcessProtocol's two-generation composition.
Phase02 process-death and Phase04 real task-cancellation evidence remain distinct
from injected-error traces and this abstract model.
