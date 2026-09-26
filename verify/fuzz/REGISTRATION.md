# Registration notes — `verify/fuzz`

New directory for Phase 08. **No tracked file was modified**; registry
wiring is left to the integrator, which owns `verify/lib/suites.ts`,
`verify/lib/runner.ts` and `verify/properties.json`.

## Files

- `mutate.ts` — the deterministic mutator table: 15 grammar-level mutators
  over the lane's `JVal` domain and 9 raw-byte mutators, all total,
  bounded, and seeded. Mutators return `null` when a precondition fails;
  byte-identical or oversized mutants are declined by the runner.
- `run.ts` — the driver: fixed `seeds × mutators × reps` enumeration,
  in-process WASM execution, `compareCase` verdict classification,
  bounded shrinking with pre/post dedup, optional native replay of
  findings, the `algal.fuzz-smoke-report.v1` report.
- `adapter.ts` — authority selection (`ALGAL_FUZZ_SEEDS`,
  `ALGAL_FUZZ_ITERATIONS`, `ALGAL_FUZZ_NATIVE_BIN`), `admitFuzzReport`
  (the pass predicate: full verdict accounting and zero surviving
  counterexamples), `retainEvidence` under classification `diagnostic`.
- `definition.ts` — the lane's governed-file inventory for the evidence
  record.
- `fuzz.test.ts` — lane-local `bun:test` coverage, including a forced
  synthetic divergence that exercises the find/shrink/dedup path and
  vacuous/zero-finding generator accounting.
- `SCOPE.md`, `REGISTRATION.md` — this documentation.

The lane imports the differential lane's `catalog`, `json`, `canonical`,
`engine`, `oracle`, `wasm`, `shrink` and `prng` modules — the same verdict
axis, so a fuzz finding is the same object a catalog mismatch is.

## Suggested suite wiring

`fuzz-smoke` is already reserved in `PLANNED_SUITES`
(`verify/lib/suites.ts`). Suggested `executeSuite` arm for
`verify/lib/runner.ts`:

```ts
if (suite === "fuzz-smoke") {
  const { runFuzzSuite } = await import("../fuzz/adapter");
  return runFuzzSuite(root);
}
```

## Exact run commands

```sh
bun test verify/fuzz
ALGAL_FUZZ_NATIVE_BIN=$HOME/.local/share/algal-verify/merged/artifacts/verification_boundary \
  bun scripts/verify.ts --suite fuzz-smoke
```

Measured on this tree: default stream `2 seeds × 24 mutators × 8 reps`
executes in ~1 s in-process; findings files are written under
`<archive>/findings/` with the report at `<archive>/report.json`.
