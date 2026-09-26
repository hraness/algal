# policy-mutation — suite registration

Suite name: **`policy-mutation`**

Phase 15 application-host policy lane. Mutates every decision-relevant
field of the production `algal.application-host.v1` policy host plus the
host options and consumed context rows, and asserts typed outcomes per
probe (construction reject / decision reject / admitted-change / widening
flip / declared survivor / identity effect).

## Files added

All files are new; **no existing tracked files were modified** and nothing
outside `verify/policy-mutation/` was touched. No commits were made.

- `harness.ts` — deterministic world + fixture: `checkerEngine` (the
  `verify/reference/memory/checker` oracle as a `MemoryQueryEngine`, two
  identities), `worldFixture` (genesis → observations → intents commit,
  pending deliver+episode, supported derivations) and `policyFixture`
  (accepted evaluations, comparison, selection policies, committed
  activation, restoration lane, sealed-research lane with explicit
  verifier).
- `mutants.ts` — the mutation catalog (143 mutants across envelope,
  identifier, reference, order, allowlist, authority, attestation, binding,
  stale, command, intent, evidence, channel, engine, scope, reconciliation,
  canonicalization classes), the `ProbeEnv`/`MutantExpect`/`ProbeOutcome`
  types, and `FIELD_LEDGER` mapping every security-relevant field to its
  covering mutants or an excluded-status rationale.
- `run.ts` — 24 probes over the production surface (`identity`,
  `current-frontier`, `commit-{create,create-research,memory,deliver,
  episode,activate,activate-selection,restore,migrate}`, `admit-{deliver,
  deliver-alerts,episode}`, `validate-scope`, `scope-mint`,
  `validate-memory`, `decode-{raw,receipted}`, `exec-{deliver,episode,
  reconcile}`, `dispatch-pending`, `dispatch-reconcile`, `research-verify`,
  `research-activate`) plus `runPolicyMutation()`, which replays baseline
  vs. mutant (and a base-policy control for flips), enforces declared
  identity effects, and emits the `algal.policy-mutation-report.v1` report.
- `policy-mutation.test.ts` — baseline admission table, catalog well-
  formedness (unique ids, probe resolution, survivor-rationale and
  world-isolation invariants, full ledger coverage), zero-failure report,
  typed denial record, identity effect, byte-identical determinism.
- `SCOPE.md` — correspondence, boundaries, survivors, limits.
- `REGISTRATION.md` — this file.

## Command

```sh
bun test verify/policy-mutation
```

## Registration

The suite is self-contained and dependency-free beyond `bun:test` and
`src/`/existing `verify/` imports; run it directly by path as above, or add
`verify/policy-mutation` to any umbrella runner that enumerates `verify/*`
lanes. It shares the `memory-authority` convention of wrapping the
production host rather than replacing it; it intentionally does not reuse
that lane's harness so the two suites stay independent.

Current result: 143 mutants — 131 killed, 12 declared survivors (all
documented), 0 failures; 8 tests, ~4 s.
