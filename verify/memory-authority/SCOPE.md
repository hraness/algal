# `memory-authority` — authority boundary verification lane

Phase 15 of `docs/formal-verification-plan.md`. This lane treats the
memory-authority boundary itself as a verified surface: it exercises the
real production composition — `ApplicationMemoryService` over the CAS
`Store`, the production `createApplicationPolicyHost` admission boundary,
`ApplicationCore` lifecycle custody on `MemoryApplicationStorage`, the
view/goal evidence projectors, and the investigation/execution request
path — under instrumented hosts, with the independent derivation checker
(`verify/reference/memory/checker.ts`) as the proof oracle.

Run:

```sh
bun test verify/memory-authority
```

17 cases, 19 tests, fully deterministic, no filesystem, no clock, no
network. Each case builds its fixture through real service paths and
returns `satisfied` only when every embedded assertion holds.

## What the lane verifies

Mapped to the Phase-15 criterion:

**A. A displayed/actionable derivation binds exact captured state** —
`derivation-binds-captured-state`, `stale-evidence-cannot-start-work`,
`dispatch-admission-reproduces-current-evidence`, `displayed-evidence-fences`,
`goal-capture-fences`, `investigation-requests-bind-origin`.

A produced `algal.application-memory-derivation.v1` record binds — as
content digests — the captured state, the selected memory snapshot, the
query and its program, the host's currently-attested frontier, the engine
identity, and the admission-host identity. Rebinding any field yields a
well-formed but different CAS record. Stale evidence is refused twice on
the work path: `requestExecution` re-checks the record's bound fields
against the expected head/memory/query, and host `admitCommit` *reproduces*
the derivation (re-running the engine over the revalidated memory) and
requires the cited ref to be the produced one — so a forged record naming
the right fields still cannot start work. Dispatch admission (`admitDispatch`)
re-runs the applicability query over a replay CAS overlay at dispatch time
and emits a typed, transient `algal.application-admission-denied.v1` record
(`sourceState`, `currentState`, reason) rather than consuming the intent.
View/goal evidence projectors independently re-bind supplied derivations
to the captured state, the revision's queries bundle, and the active
source set — display evidence alone grants no authority.

**B. Proof answers bind the exact snapshot/generation and source rows** —
`proof-binds-exact-snapshot-and-rows`,
`proof-does-not-transfer-across-generations`, `source-selection-is-exact`.

The produced `algal.memory.v1` fact snapshot carries each selected row
with its exact `(observation, scope, procedure)` source triple; the
`algal.query-result.v1` envelope binds both content digests. The
independent checker accepts the produced evidence under the declared
source set and refuses `unselected-source` / `withdrawn-source` /
`snapshot-digest-mismatch` / `program-digest-mismatch` when the bound
objects differ. Across memory generations the snapshot digest changes, so
prior-generation results fail under the new snapshot in both directions,
and the service fails closed (`failed`, nothing retained) when an engine
returns a stale-generation envelope. Only observations inside the query's
explicit `procedures` contribute facts or sources; a withdrawn row
contributes nothing and cannot be cited.

**C. Selection rechecks every environment row and the exact parent; replay
does not widen scope** — `every-row-rechecked-on-replay`,
`exact-parent-lineage`, `no-scope-widening-on-replay`,
`withdrawal-is-not-deletion`.

Snapshot validation re-decodes *every* selected observation through the
host — the instrumented host log counts exactly one `decodeObservation`
per selected row, one `validateScope` per row plus the snapshot's, and one
`currentFrontier` read per query. A stored record whose claims differ from
trusted decoding of its own raw rejects at snapshot and at query replay.
Successor memories must name the exact predecessor and cannot silently
drop rows or withdrawals; committed memory transitions must preserve the
currently-selected snapshot as predecessor; retained-history replay refuses
a hand-written state whose transition request does not normalize.
Replaying under a scope whose environment, `completeFor`, or dependency
binding version differs yields `stale` with zero selected sources — scope
is never widened on replay.

**D. Claims admitted under one host/engine do not transfer; withheld
authority fails closed** — `foreign-admission-rejected`,
`engine-identity-is-authority`, `withheld-authority-fails-closed`,
`engine-dishonesty-fails-closed`.

An observation's `admission` field binds the admitting host's identity; a
host built from a policy with a different attestation contract derives a
different identity, and it refuses the foreign row at snapshot and at
query replay (`Unadmitted observation authority`), refuses A's scope at
the attestation contract fence, and mints its own distinct record over the
same raw. The engine identity is likewise inside the derivation's content:
a host configured to reproduce under engine E2 refuses the E1-produced
record, and rebading the E2 record's engine field reproduces the E1 record
byte-for-byte — there is no borrowed engine authority. Withheld authority
fails closed everywhere: a refused decoder or refused scope validation
rejects the call (no derivation is produced); an uncertain attested
frontier yields `stale`; a scope bound to an uncertain frontier cannot
admit observations; an aborted signal yields `cancelled`; an over-limit
fact set yields `exhausted` with typed reason `fact-limit`; and engine
envelopes that misbind snapshot/program, decline the witness policy, lie
about completeness, smuggle extra rows, or fail verification all map to
`failed` with nothing retained.

## Design notes

- **Determinism.** `MemoryStore` + `MemoryApplicationStorage` are in-memory
  deterministic CAS/storage. Content digests are canonical SHA-256; every
  record is identified by its bytes. The instrumented host records calls on
  a logical tick counter. No wall clock, RNG, filesystem, or network.
- **Boundedness.** All inputs are parsed from `unknown` via the production
  bounded parsers. The fact-limit leg exercises the 128-fact bound; all
  lists/digests pass through `applicationList`/`applicationRef`.
- **Real service paths.** Observations flow through `service.observe`
  (host decode) and `appendObservation` (lifecycle-committed memory
  successors); states through `lifecycle.create`/`commit`; admission through
  `admitCommit`/`admitDispatch`; dispatch through `dispatchPending`;
  evidence through `collectApplicationViewEvidence`,
  `captureApplicationGoals`, `projectApplicationView`; work through
  `requestExecution`/`scheduleInvestigations`. Hand-written records
  (`writeRawState`, `forgeObservation`, `rebindDerivation`) are used only to
  place foreign bytes into CAS — the *checks* under test are always the
  production ones.
- **Instrumented hosts.** `instrumentedPolicyHost` wraps the production
  `createApplicationPolicyHost`, records every admission callback, exposes
  a movable attested-frontier cell (`setFrontier`), and denial toggles
  (`denyScopes`, `denyDecoders`) for fail-closed cases. Host and engine
  identities are parameterized so cases can run two authorities over the
  same records.
- **Independent oracle.** `checkerEngine` evaluates queries via the
  reference checker's own naive fixpoint and verifies via `checkQueryResult`
  with the snapshot's declared source set — production is not the authority
  for positive proof acceptance.

## What is not proved

- This is **verification infrastructure, not a proof of production
  correctness.** The lane demonstrates that the shipped fences reject the
  exercised failures through real APIs; it does not claim exhaustive
  adversarial coverage.
- The checker is an *independent implementation* of the same documented
  semantics, not an independently *proved* semantics; `verify/lean` carries
  the formal side for the memory/query model.
- `stale`-vs-replay frontier movement is tested through a movable cell that
  mirrors the production policy-swap pattern, not through a live provider.
- The `deliver`-route execution path (mailbox) is exercised only up to the
  pending-work boundary — the policy host's channels directory is a
  deliberate nonexistent path.
- Denial toggles model host-side refusal; they are not a model of every
  possible admission failure (e.g., malformed raw payloads are covered by
  `verify/reference/memory` and `verify/memory-mutation`).
- Type/lint health of *other* in-flight lanes (`verify/source`,
  `verify/replay`, `verify/lean`) is tracked by their own tasks — this lane
  does not touch them.
