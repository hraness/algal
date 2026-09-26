# Registration notes — `verify/expr`

The two suite names are already reserved in `PLANNED_SUITES`
(`verify/lib/suites.ts:3`): **`expr-conformance`** and **`expr-abi`**.
The lane-local `bun:test` suites are the executable evidence; the
`verify/lib/runner.ts` `executeSuite` wiring is left to the integrator, as
with `differential`.

## Suites and what they gate on

* `expr-conformance` — `verify/expr/conformance.test.ts`.
  Semantic agreement across the committed WASM module, the
  `verification_boundary` native driver, the `src/expr.ts` Bun wrapper, and
  the independent `model.ts` mirror of the Lean semantics. Admission
  intent: every catalog case must satisfy wasm≡native byte equality, its
  pinned wire expectation, its model disposition (`"agree"` may only stand
  on `three-way` cases — `admitCase` throws otherwise), and wrapper
  fidelity. The suite also enforces catalog integrity (determinism,
  nonvacuity, per-op and per-error-code coverage floors), the fuel sweep,
  and the `verification_lean_vectors` canonical cross-check.
* `expr-abi` — `verify/expr/abi.test.ts`.
  Boundary evidence only — no semantics claims. Module admission and exact
  export surface, allocator/memory contract (incl. `algal_alloc(0) → null`
  and `fn(p, 0) → 0` for the inexpressible zero-length request), packed
  return decoding, envelope admission over raw bytes, seeded mutations
  failing closed, fuel pass-through, the native driver's input bound, and
  the `algal check` CLI lane (rejections report on stderr, nonzero exit).

Both suites bind the native artifacts by sha256 before use and re-pin the
boundary driver identity per invocation; artifacts resolve from
`~/.local/share/algal-verify/merged/artifacts/` with overrides
`ALGAL_EXPR_VERIFICATION_BOUNDARY_BIN`,
`ALGAL_EXPR_VERIFICATION_LEAN_VECTORS_BIN`, `ALGAL_EXPR_ALGAL_BIN`.

## Suggested suite wiring

`expr-conformance` and `expr-abi` are reserved in `PLANNED_SUITES`
(`verify/lib/suites.ts`). Suggested `executeSuite` arms for
`verify/lib/runner.ts` run the lane-local bun:test files under the
runner's command supervision (the same shape the other test-file suites
use), e.g. a supervised `bun test verify/expr/conformance.test.ts` /
`bun test verify/expr/abi.test.ts` whose exit code is the verdict, with the
artifact env vars forwarded through `childEnv`.

## Exact run commands

```sh
bun test verify/expr/                          # both suites (43 tests)
bun test verify/expr/conformance.test.ts       # expr-conformance
bun test verify/expr/abi.test.ts               # expr-abi
```

Measured on this tree: 43 tests pass, 0 fail, 2405 assertions, ~40 s.
Coverage: catalog 234 cases — 84 seeded (6 seeds × 14), 89 corner, 37
boundary, 13 reject, 8 unmodeled, 3 gap; 206 three-way agreements, 28
explicit model pins; ABI 44 eval-envelope + 8 check-envelope authored byte
cases and 60 seeded mutations, all wasm≡native; every declared bound swept
at boundary−1/boundary/boundary+1; all 56 modelled ops and the full closed
`EXPR_*` code set exercised (asserted by the catalog-integrity tests).
