# Registration notes — `verify/differential`

New directory for Phase 08. **No tracked file was modified**; registry
wiring is left to the integrator, which owns `verify/lib/suites.ts`,
`verify/lib/runner.ts` and `verify/properties.json`.

## Files

- `json.ts` — independent strict-JSON byte parser over the `JVal` domain
  (no production imports). Asserts the serde_json admission domain:
  last-wins duplicate keys, surrogate rules, i64/u64/f64 number classes,
  127-deep container limit.
- `canonical.ts` — canonical encoder mirrors: key order (u32 indices sans
  `u32::MAX`, then UTF-16 units), serde_json string escaping, node/depth/
  byte counters, per-node bound checks in production order.
- `oracle.ts` — independent prediction engine for `eval_json`/`check_json`:
  envelope admission, bound pipeline order, op table, fuel accounting.
  `Prediction` is exact (class + canonical bytes + spent fuel) or
  `uncovered`.
- `cases.ts` — the adversarial catalog: raw byte edges, boundary−1/
  boundary/boundary+1 for every declared limit, semantic probes, seeded
  generated programs, check-mode envelopes.
- `gen.ts` — deterministic program/envelope generator; canonical or noisy
  rendering (shuffled keys, whitespace, escape spellings) that preserves
  the admitted value.
- `prng.ts` — xorshift32; explicit seeds only, recorded in every report.
- `engine.ts` — verdict classification and the `wrapperFaithful` gate.
- `wasm.ts` — committed-artifact module loading and the raw ABI call with a
  fresh instance per case.
- `worker.ts` — supervised batch worker (`subprocess` mode).
- `run.ts` — the driver: writes case binaries, runs wasm shards with
  crash-bisection, the native leg, comparison, bounded shrinking, report.
- `adapter.ts` — authority selection (`ALGAL_DIFFERENTIAL_NATIVE_BIN`,
  `ALGAL_DIFFERENTIAL_SEEDS`), the `admitReport` verdict invariant, and
  `retainEvidence` under classification `diagnostic`.
- `differential.test.ts` — lane-local `bun:test` coverage (in-process wasm
  leg; native leg activates when the env var is set).

## Suggested suite wiring

`differential` is already reserved in `PLANNED_SUITES`
(`verify/lib/suites.ts`). Suggested `executeSuite` arm for
`verify/lib/runner.ts`:

```ts
if (suite === "differential") {
  const { runDifferentialSuite } = await import("../differential/adapter");
  return runDifferentialSuite(root);
}
```

`runDifferentialSuite` requires `ALGAL_DIFFERENTIAL_NATIVE_BIN` to name the
frozen `verification_boundary` executable absolutely, runs the default
seed stream `[1, 0x6d2b79f5, 0x9e3779b9, 0xffffffff]` (overridable via
`ALGAL_DIFFERENTIAL_SEEDS`, max 16 seeds), executes the wasm leg under
`runCommand` shard custody, and admits only a report where every case is
`agree`, `uncovered` or `wasm-transport`. Any mismatch or infrastructure
verdict fails the suite after evidence is retained.

## Exact run commands

```sh
bun test verify/differential
ALGAL_DIFFERENTIAL_NATIVE_BIN=$HOME/.local/share/algal-verify/merged/artifacts/verification_boundary \
  bun scripts/verify.ts --suite differential
```

Measured on this tree: 527 cases (4 seeds), 526 `agree`, 1 `wasm-transport`
(the un-allocatable empty input), 0 mismatches, all 527 oracle predictions
exact; ~31 s including 527 supervised native invocations.
