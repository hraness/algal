# Process generations, selected intents and outcome publication

`ProcessProtocol.tla` is the journal-enabled process lifecycle model. Its finite
profiles, exact invariants, fair progress obligation, nonstuttering witnesses and
unsafe controls are declared in `profiles.ts`. This model complements the effect
journal and retained-owner lease models through explicit assumed contracts.

## Source correspondence and reviewed ordering

1. `AdmitRecovery` now refuses a persistent unknown write before charging or
   entering the runtime. `charges` records the target/call/unknown state at the
   charge boundary; `UnknownUncharged` catches bypass independently of a later
   journal-finish refusal. This matches Bun `process-journal.ts:154` and native
   `journal.rs:385` before their charge writes.
2. A crash or I/O failure while an incomplete journal is running can retain an
   unknown write. The transition allows either lost-write uncertainty or a safe
   cut, rather than deriving safety from absence of `CompleteJournal`. Already
   completed journal evidence stays completed. Detailed external dispatch,
   application and late adapter completion remain the journal model's contract.
3. Checkpoint verification is conditional on a real previous receipt. Initial
   ready generation zero has none; a new tick after a settled suspended outcome
   uses that outcome's receipt. Recovery uses the same prior receipt retained in
   the uncertain intent. This matches Bun `process.ts:788,804,928` and native
   `process.rs:762`. `CheckpointOK = FALSE` consequently still permits the initial
   no-checkpoint generation but prevents the next resumed generation.
4. Host and checkpoint admission now have separate recorded predicates and
   specifically attributable unsafe variants. They remain grouped in one abstract
   action because source check order differs, while both must precede publication
   and runtime entry. Manifest compilation and valid host classification are
   summarized by the admitted host input; parser completeness is separate.
5. Explicit recovery of a settled head rejects and consumes a bounded public-call
   attempt, including after a lost successful return. Recovery of an uncertain
   head with a stale expected identity retains its separate rejecting boundary.
6. Added meaningful witnesses for running crash/I/O uncertainty, rejection before
   unknown-write charge, replay of completed journals, next generation after lost
   outcome return, no-checkpoint first dispatch, checkpoint/host refusal, stale
   intent refusal and settled-head recovery refusal.

The native registered `HostExecutor` boundary is included in the reviewed source
inventory through `effects.rs`, `runtime.rs` and `host_executor.rs`; the Bun
executor and extracted journal interfaces are included through `effects.ts` and
`runtime-journal-contract.ts`. Registered configuration and matching checkpoint
identity checks refine the intended host/checkpoint admission boundary only by
source review. A host failure without an effect receipt aborts runtime entry's
execution instead of becoming a guest failure; uncertain post-callback identity
drift retains the unresolved journal. Known admitted error receipts still allow
ordinary guest failure routing. The detailed Binding/Dispatch/KnownFailure/Poison
correspondence and trusted callback limits are recorded in the adjacent
`process-journal/SCOPE.md`; no new model coverage or callback preemption is claimed.

## Boundaries and remaining limits

- `Dispatch` means entry into the runtime, **not a new external effect**. Recovery
  may enter the runtime while all completed effects replay. The separately checked
  journal protocol licenses started records, read retries, per-invocation recovery
  charges and exact ordinal receipts. The correspondence is reviewed composition,
  not a proved refinement theorem.
- Generations are actual process-record generations here; each has one fixed
  symbolic intent identity, predecessor/cause and configured outcome. Expected
  identity symbols map injectively to that finite admitted intent set. Different
  candidate causes/arguments/configurations at the same generation are outside
  this fixed-input profile, so generation numerals are not an implementation
  replacement for digest equality.
- Profiles make one to three public calls across at most two generations, with
  at most one crash and one injected I/O failure. The model begins after valid
  process creation. Creation markers, manifest/receipt byte parsing, wake/cause
  scheduling, arbitrary process counts and shared-owner contention remain separate.
- Immutable CAS/header preparation may occur in either order, reflecting Bun and
  native source order. Selected intent requires both. Receipt publication precedes
  outcome CAS and selected outcome head. Each write composes the Phase02 publication
  contract and assumes cooperating namespaces, not atomic whole-store hardware
  persistence.
- Recovery budget internals are delegated to ProcessJournal. With at most three
  calls, a first tick leaves at most two recovery calls, within the configured
  default bound. Increasing Calls requires adding an explicit remaining-charge
  abstraction or narrowing the admitted scenario. Do not present this model alone
  as a proof of recovery-budget accounting.
- `Outcome` is fixed per profile. Separate suspended/complete/failed/stuck profiles
  cover lifecycle classifications, not all changing outcomes or run-receipt content.
- Weak fairness is required only for the fault-free progress profile. Eventual
  completion means the finite calls settle, potentially rejecting; it does not
  imply every call dispatches, every process is fairly scheduled or an uncertain
  external write is automatically reconciled.

## Evidence and reproduction

The registered adapter binds this model, profiles, scope, reviewed source bytes,
configuration and pinned Java/TLC runtime. It exhausts each finite positive
profile, checks the separate temporal property to completion, and requires the
intended property and actual transition identity for each negative/witness run.
No state/action constraint, symmetry, simulation or operator override is used.
`bun verify/tla/run.ts --suite process` runs both ProcessProtocol and ProcessJournal.
Source correspondence remains reviewed and sampled, not mechanically proved.
The final admitted source/runtime receipt is recorded in the execution evidence;
scratch diagnostics are preparation and cannot replace a required fresh gate.
