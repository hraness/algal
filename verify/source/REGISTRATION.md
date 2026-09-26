# Registration notes — `verify/source`

New directory for Phase 13. **No tracked file was modified**; registry
wiring is left to the integrator, which owns `verify/lib/suites.ts`,
`verify/lib/runner.ts` and `verify/properties.json`.

## Files

- `model.ts` — the source AST (`Expr`, `Program`, `CheckedModule`),
  `MISSING` as a distinct undelivered-port inhabitant, and the
  `SourceRun` record (outcome, ordered observations, invocation outline,
  steps/calls).
- `parse.ts` — source surface parser (same grammar as production source;
  no span/location fields on `Expr`).
- `check.ts` — name resolution, scope, module/import identity and closure,
  arity/`each`-over checks, static `calls`/`depth` accounting including the
  guarded-parameterless `call` trigger-wrapper level.
- `interp.ts` — the source interpreter: cell-granular steps, `MISSING`
  skip semantics, short-circuit `and`/`or`, selected-arm `if`/`match`,
  `decide`/`generate` as ordered oracle observations, `call`/`each`
  composition (child-parameter-order arg cells, per-item `over` checks,
  ascending `each`, results collector, wrapped parameterless calls).
- `differential.ts` — compile a program through the production compiler
  (`source.ts`), run the manifests through the real scheduler under a
  scripted `Executor`, run the same program through `interp.ts`, and
  compare outcome values or failure codes, ordered observations (site
  shape, kind, text, context), the invocation outline, and steps/calls.
  The projection hides generated internals (decision-check cells, trigger
  controls, branch merges) so generated machinery never appears as source
  semantics.
- `differential.test.ts`, `model.test.ts` — the lane-local `bun:test`
  coverage (differential agreement and source-model reference behavior).

## What is established where

- **Independently modeled** (`verify/source/*`, `verify/lean/Algal/Source/*`):
  the readable-source semantics — binding, scope, imports, `MISSING`
  propagation, guards, `call`/`each`, effects, budgets — specified without
  importing `src/source.ts` as its definition.
- **Proved in Lean** (`Algal.Source.Theorems`): model-level laws — skip
  without work, short-circuit, selected-arm-only observation, ascending
  `each` order, empty `each` without invocation, missing-argument skip,
  depth/budget checks before work — plus whole-run witnesses via `decide`.
- **Tested** (`differential.test.ts`): source model vs. compiled-manifest
  execution on the same programs — the assertions the model-vs-production
  correspondence is claimed on. Passing these tests does *not* establish
  compiler verification.
- **Open**: the mechanical link between `Expr`/`CheckedModule` and the
  emitted manifest's cells/edges, and between `interp.ts`'s step accounting
  and `run.ts`'s scheduler. `expectedCellIds`/`expectedEdges` in
  `Algal.Source.Model` state the structural projection that a refinement
  would target.

## Exact run commands

```sh
bun test verify/source
cd verify/lean && lake build Algal.Source.Model Algal.Source.Eval Algal.Source.Theorems
```

Measured on this tree: 93 `bun test` tests pass across
`model.test.ts` + `differential.test.ts`; the three Lean modules build
clean (no `sorry`, no `native_decide`).
