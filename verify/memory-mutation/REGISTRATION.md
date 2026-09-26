# Registration notes — `verify/memory-mutation`

This directory is new in Phase 11. **No existing tracked file was modified**;
suite-registry wiring (`verify/lib/suites.ts`, `verify/lib/runner.ts`) is
deliberately left to the parent change set, which owns tracked-file edits.

## Files

- `mutants.ts` — the base derivations, the 53-case mutation catalog, the
  documented survivor boundary, and `runMutationSuite()` returning a stable
  `{suite, basesAccepted, total, caught, cases[]}` report for the runner.
- `mutants.test.ts` — `bun:test` driver: baselines accept, each mutant
  rejects with the declared typed reason (not merely `accept === false`),
  catalog determinism and class coverage, survivors accepted by design.
- `SCOPE.md` — exact mutation classes, their asserted reasons, and what is
  out of scope.

## Exact run command

```sh
bun test verify/memory-mutation
```

60 tests, 53 mutants, all rejected with the asserted typed reason.

## Suggested suite wiring

`verify/lib/suites.ts` already lists `memory-mutation` as a planned suite.
Suggested adapter for `verify/lib/runner.ts`:

```ts
case "memory-mutation": {
  const { runMutationSuite } = await import("../memory-mutation/mutants");
  const report = runMutationSuite();
  return { suite: "memory-mutation", status: report.basesAccepted && report.caught === report.total ? "ok" : "failed",
    detail: `${report.caught}/${report.total} mutants rejected with their typed reason` };
}
```

## Relationship to the other Phase 11 suites

- `lean-memory` — proves `valid` ⇒ derivable over the abstract derivation
  graph. `memory-mutation` supplies the adversarial negative space: each
  discharged premise/order/identity obligation has a mutant that violates it.
- `memory-oracle` (`verify/reference/memory`) — supplies the checker and
  fixture helpers this suite mutates against; it is read, never modified.
- `context-laws` — tests compaction/recall laws on the real runtime; the
  mutation catalog is checker-level only.

## Obligations serviced

- `MEM-01` — `snapshot-membership` and `observation-authority` classes
  exercise fact membership and source custody negatively.
- `MEM-03` — `premise-order`/`premise-count`/`premise-substituted`/`cycle`
  classes exercise the derivation-shape obligations.
- `MEM-04` — `iteration-bound`, `row-set` classes exercise completeness.
- `MEM-05` — `rule-identity` (shadow rule) and `row-order` exercise the
  canonical-witness and canonical-order obligations.

Not serviced: `MEM-02` beyond the checker-level selection model, `MEM-06`,
`MEM-07`, `CTX-01..03`.
