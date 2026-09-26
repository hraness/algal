# Memory mutation controls

`mutants.ts` is a systematic semantic-mutation catalog over derivations that
the independent checker (`verify/reference/memory/checker.ts`) accepts. Every
case applies one targeted mutation — never raw byte corruption — and asserts
the *typed* rejection reason. A random corruption could pass vacuously with
`malformed-input` without exercising the intended invariant, so each mutant
is constructed to land on a specific contract clause, and every baseline is
re-established as accepted before the mutants run.

## Baselines

- `chain` — two-hop `depends` chain under `direct` + `transitive` rules;
  queried rows `affects("app", target)` with a shared-premise proof DAG.
- `chain-shadow` — same derivation with `zz-shadow` declared (an identical
  body that sorts after `direct`), so the suite can prove the checker binds
  rule identity, not just the resolved conclusion.
- `dag` — shared-premise `path` DAG under `hop` + `cat`.
- `multi-source` — one fact carrying two admissible source digests.

## Mutation classes (53 cases)

| class | what mutates | rejection asserted |
|---|---|---|
| `premise-order` | rule-node premise list flipped | `substitution-mismatch` (premise resolves to the wrong relation/tuple under the accumulated substitution) |
| `premise-count` | premise dropped or appended | `premise-count-mismatch` |
| `premise-substituted` | premise replaced by a *valid* node resolving elsewhere | `substitution-mismatch`, or `conclusion-mismatch` when the swap still resolves but to a different tuple |
| `conclusion-substituted` | row tuple or the row's proof binding | `conclusion-mismatch` |
| `rule-identity` | rule digest swapped | `rule-not-in-program` (foreign), `premise-count-mismatch` (different-body rule), `witness-not-canonical-first` (same-shape rule sorting later) |
| `snapshot-membership` | fact leaf absent from the selected snapshot, fact rebound to a new source list, member dropped | `fact-not-selected` |
| `observation-authority` | withdrawn source, source outside `allowedSources`, partial withdrawal, sources list tampered or reordered on the node | `withdrawn-source`, `unselected-source`, `fact-source-binding` |
| `proof-identity` | forged map key (reachable or not), unknown proof ref, unreachable seeded node | `proof-id-not-content-digest`, `unknown-proof`, `dangling-proof` |
| `cycle` | self-loop, 2-node, 3-node, cycle behind an honest prefix | `proof-cycle` |
| `iteration-bound` | claimed `rounds`/`derivedFacts`/`baseFacts` ±1 | `result-binding` |
| | program `maxRounds`/`maxDerived`/`maxBindings`/`maxRows` below the honest fixpoint (claimed counters kept inside the mutated limits so rejection comes from evaluation, not admission) | `completeness-not-established` |
| | `work` above the declared ceiling | `malformed-input` |
| `row-set` | row dropped (with and without orphaned proof nodes), duplicate row, row order, row violating the query constant, wrong-arity row | `missing-row`, `dangling-proof`, `row-order`, `row-not-matching-query` |
| `envelope-identity` | claimed snapshot/program digest rebound | `snapshot-digest-mismatch`, `program-digest-mismatch` |

## Known accepted mutation (the survivor boundary)

`SURVIVOR_CASES` records one mutation the contract intentionally accepts:
`claimed.work` is range-checked against `maxWork` but never recomputed (see
`verify/reference/memory/SCOPE.md` — the checker does not model production
work accounting). A different in-range `work` must still verify. This is
documented rather than hidden so a future checker that starts recomputing
work surfaces the change here, not in a passing test.

## Exclusions

- Not a second checker: this suite only mutates inputs and asserts the
  existing checker's typed verdicts. It adds no evaluation machinery.
- `unexpected-row` is unreachable by construction: a row that survives
  admission and resolution has already been proven to resolve to itself, so
  it is necessarily in the recomputed fixpoint; the check stays as
  depth-defense. The class is listed in the checker scope, not reproduced
  here.
- `selection` is a checker-level model of source custody; it does not
  establish application-layer frontier/scope admission (that composition is
  `verify/context-laws`).
- Nothing here says anything about production memory internals
  (`crates/algal/src/memory.rs`, `src/application-memory.ts`); the link to
  production is separately asserted by `context-laws` at the service level.

## Command

```sh
bun test verify/memory-mutation
```
