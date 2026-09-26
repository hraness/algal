# Registration notes — `verify/context-laws`

This directory is new in Phase 11. **No existing tracked file was modified**;
suite-registry wiring (`verify/lib/suites.ts`, `verify/lib/runner.ts`) is
deliberately left to the parent change set, which owns tracked-file edits.

## Files

- `harness.ts` — the instrumented host: `probeAdmissionHost` (a
  `MemoryAdmissionHost` whose calls are recorded on a logical clock and whose
  current frontier is a cell the test moves), `checkerEngine` (a
  `MemoryQueryEngine` implemented over `verify/reference/memory`'s
  `internals.evaluate` + `checkQueryResult`), and `memoryFixture` building the
  full CAS record graph — schema, settled frontier, procedure, scope,
  program, query, bundle, revision, memory snapshot, application state — on a
  `MemoryStore`.
- `laws.ts` — the 17-case `LAW_CASES` catalog plus `runContextLaws()` which
  returns a stable `{suite, total, satisfied, cases[]}` report for the
  runner. Filesystem use is confined to `mkdtemp` scratch dirs (for the
  `bun:sqlite` semantic index); `cleanupContextLaws()` removes them.
- `laws.test.ts` — `bun:test` driver: catalog determinism/uniqueness, each
  law's `ok` + evidence detail, and the aggregate report.

## Exact run command

```sh
bun test verify/context-laws
```

20 tests, 17 laws, all satisfied. ~0.5s; no network, no live providers, no
wall clock.

## Suggested suite wiring

`verify/lib/suites.ts` already lists `context-laws` as a planned suite.
Suggested adapter for `verify/lib/runner.ts`:

```ts
case "context-laws": {
  const { runContextLaws } = await import("../context-laws/laws");
  const report = await runContextLaws();
  return { suite: "context-laws", status: report.satisfied === report.total ? "ok" : "failed",
    detail: `${report.satisfied}/${report.total} context laws satisfied` };
}
```

## Relationship to the other Phase 11 suites

- `memory-oracle` — supplies the checker that backs `checkerEngine`, so a
  service-produced derivation is verified by the independent implementation
  it claims conformance to.
- `memory-mutation` — exercises the same checker's negative space; this
  suite exercises the *production* surfaces the checker models.
- `lean-memory` — the abstract soundness result; here the composition under
  failure (tampered evidence → `failed`, never `supported`).

## Obligations serviced

- `CTX-01` — `decide-keep-exact`, `decide-pinned-tail`,
  `decide-preimage-bound`, `decide-monotone`, `decide-fail-closed`,
  `decide-replay-deterministic`, `elide-run-retains-source`.
- `CTX-02` — `recall-deterministic`, `recall-fail-closed`,
  `elide-source-binding`, `decide-preimage-bound`,
  `elide-run-retains-source`.
- `CTX-03` — `elide-idempotent`, `elide-source-binding`,
  `elide-budget-monotone`, `elide-nonexpanding`.
- `MEM-01`, `MEM-02` — `memory-authority-fail-closed`, `memory-status-map`
  (stale/withdrawn admission states).
- `MEM-03`, `MEM-04` — `memory-evidence-checks-out`,
  `memory-engine-failure-closed` (exhaustion never claims completeness).
- `MEM-05` — `memory-deterministic`, `decide-replay-deterministic`,
  `recall-deterministic`.
- `MEM-06` — `memory-status-map`, `memory-authority-fail-closed`,
  `memory-engine-failure-closed` (conservative distinct statuses).

Not serviced: `MEM-07` (rollover/migration — separate suite), application
lifecycle CAS commit semantics, `FileStore`/`sql` durability parity.
