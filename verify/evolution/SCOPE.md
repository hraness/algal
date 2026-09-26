# verify/evolution — scope

Suite id: `evolution-model` (reserved in `verify/lib/suites.ts`; this file does
not register or alter it).

The lane connects logical evidence to selected application state and host
admission for the evolution model — Phase 15 of
`docs/formal-verification-plan.md`. It exercises only production service paths
(`ApplicationCore`, `ApplicationMemoryService`, `createApplicationPolicyHost`,
`evaluateApplicationRevision`/`verifyApplicationEvaluation`, comparison,
selection, proposal, experiment, research, migration, restoration, drain and
view-evidence functions) over an instrumented in-memory CAS
(`MemoryStore`/`MemoryApplicationStorage`).

## What the harness instruments

- `CountingStore` logs every `getValue`/`getReceipt`/`getManifest`/`getEffect`/
  `getSlot` read and every write with a logical tick, so cases can prove a
  verifier re-read exactly the rows it claims (`readCount(digest, since)`).
- `InstrumentedHost` wraps the production `createApplicationPolicyHost` and
  logs `admitCommit`/`admitDispatch`/`currentFrontier` calls.
- `instrumentedCases` wraps the frozen evaluation case set and logs, per case
  id, *name* reads (admission enumerating input names) versus *value* reads
  (executing a case), which is what makes "selection never consumed holdout"
  an observable claim rather than a structural hope.
- `scriptedEngine` is a deterministic first-order `MemoryQueryEngine`
  substitute for the pinned native binary: it answers positive relational
  selection over the provided fact snapshot, records its calls, and lets the
  production memory service mint real `algal.application-memory-derivation.v1`
  records. Native-engine qualification stays in `application-host.test.ts`.
- `sealVerifier` is a deterministic `ApplicationResearchVerifier` plug: the
  surface under test is that the *configured* verifier runs and its identity
  is bound to the immutable policy, not any cryptographic property.

## Claim classification

This lane distinguishes three grades of claim:

- **proved (structural, re-derivation):** properties the production code
  establishes by recomputation — evaluation/report/comparison/selection/
  experiment/migration/restoration records must reproduce byte-for-byte from
  their inputs, receipts must replay, claim sets must derive literally from
  admitted observations, drain dispositions must equal the undispatched
  pending set exactly. Every "rejected" leg below is a proved check exercised
  against a finite forged input.
- **tested (finite):** bounded instances of those properties exercised by the
  cases in `cases.ts` — exact digests, fixtures, and rejection reasons are
  recorded in each case's returned evidence.
- **open:** universal statements the finite suite cannot establish, listed
  below.

## Finite claims tested (`cases.ts`, 18 cases)

Obligation map (the lane's own vocabulary; see `verify/lib/suites.ts` for the
suite id):

- **EVO-02 evaluation conformance.** `evaluation-binds-exact-run-rows`:
  every run row of a stored accepted evaluation is re-read (receipt and
  manifest), and nine report-level forgeries plus three record-level
  forgeries (verdict, compatibility citation, cases citation) all reject.
  `evaluation-predicates-are-conjunctive`: accepted, selected-candidate-
  mismatch, holdout-failed, incomplete-evaluation, regression,
  insufficient-quality, budget-exhausted, incompatible; a case-set that
  exceeds the policy bound rejects both at production *and* on a
  hand-imported record; activation through `ApplicationCore.commit` replays
  the same gates.
- **EVO-03 holdout isolation.** `holdout-never-read-in-selection`:
  instrumented case proxies show zero value reads for the holdout row during
  selection, while substitution of holdout args/expect leaves every
  selection row and the promoted digest byte-identical.
  `generation-is-case-blind`: the proposal generator's receipt binds exactly
  `{src}` — the frozen case set is never read (instrumented store log) and
  the request parser has no `cases` field.
  `search-feedback-excludes-holdout`: generation feedback contains only
  promoted/candidate aggregates — never case ids or holdout outcomes — and
  a forged generation row carrying holdout evidence rejects.
- **EVO-04 selection conformance.** `selection-rechecks-every-environment-row`:
  a two-environment policy replays both comparisons and all four cited
  evaluations (read log); tampering either environment's row rejects the
  whole policy; a stored selection record must recompute.
- **EVO-05 evidence lineage.** `evaluation-binds-exact-run-rows`,
  `activation-binds-exact-parent-and-changed-entrypoints` (stale head,
  foreign parent, partial entrypoint coverage, post-commit staleness,
  operation replay idempotence) and `view-evidence-binds-revision-chain`
  (the retained projection binds exactly the committed transitions and their
  evidence digests).
- **EVO-06 policy and host admission.** `stored-selection-policy-grants-
  nothing` (no opt-in / unserved environment / non-selected manifest legs),
  `migration-requires-pure-program-and-consumed-evidence` (selection policy
  cannot attach to a migrate), `migration-drains-pending-explicitly` (exact
  drain coverage; migrated intent's stale episode source is denied at
  dispatch), `restoration-requires-host-opt-in-and-custody` (policy record
  is inert without the host option; unsettled dispatch blocks restore until
  reconcile), `activation-binds-…`.
- **EVO-07 joins and conformance.** `experiment-joins-exact-evidence`
  (foreign-state evaluation, environment mismatch, dropped proposals,
  wrong comparison, wrong policy, non-canonical record, misclaimed result,
  foreign-application input), `experiment-budget-binds-exact-runs`
  (missing/extra/foreign-account runs all reject the budget join),
  `migration-binds-source-projection` (withdrawn observations do not
  project; forged claims/source/program/receipt reject), `restoration-
  forward-non-widening` (ancestor binding, metadata preservation,
  exactly-one-record), `view-evidence-binds-revision-chain`.
- **EVO-08 sealed research promotion.** `research-requires-pinned-verifier`
  (no verifier, wrong evaluator identity, failing seal, host opt-in both
  ways, cross-profile record inertness, forged verdict, stale parent) and
  `research-binds-corpus-and-attempts` (omitted case, foreign case, attempt
  sequence, receipt reuse, wrong request on the report, forged seal, plus
  all six verdict gates and rejected-verdict activation denial).

## What remains open

- **Universal candidate quality.** The suite evaluates a fixed hand-built
  candidate population against fixed case sets. It establishes nothing about
  arbitrary generated candidates, real model-driven proposers, or case sets
  beyond the fixtures; no inference from finite cases to a universal claim is
  made (Phase 15 explicitly excludes it).
- **Semantic preservation.** Migration conformance here is receipt- and
  claim-shape conformance plus the literal claim projection — it does not
  prove a program preserves user-meaningful semantics. `replay` lanes own
  replay-level claims; semantics beyond replay remain open.
- **Universal host/admission properties.** The denied legs are a finite
  enumeration of forgery classes. Combinations not enumerated, timing
  interleavings under contention, and dispatch custody under crashes are not
  claimed here (see `application-contention.test.ts` and the admission lane).
- **The engine plug.** `scriptedEngine` stands in for the pinned native
  `algal` binary for the episode-admission leg; it is deterministic and
  instrumented but is not the qualified engine. `verify` calls are real,
  results are recorded, and engine identity lands in the derivation.
- **Cost/budget universality.** Budget legs fix specific small bounds; the
  property is that the deterministic check runs, not that the bounds are
  economically meaningful.

## Lane ownership

`verify/evolution/**` only. Neighboring lanes own `verify/source`,
`verify/expr`, `verify/differential`, `verify/fuzz`, `verify/mutation`,
`verify/replay`, `verify/lean/**`, `verify/memory-authority`, and
`verify/admission`.
