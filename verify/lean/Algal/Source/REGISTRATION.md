# Algal.Source — registration

Lean source-level semantics modules, built on `v4.34.0` and sibling to the
`Algal.Core`/`Algal.Manifest`/`Algal.Run` verified contract surface.

## Modules

| Module | Role |
| --- | --- |
| `Algal.Source.Model` | The source AST (`Expr`: literals, names, records, lists, unary/binary operators, `if`, `match`, `decide`, `generate`, `call`, `each`), source types (`PType`, `SType`), programs, modules and imports, budgets, the checker's static accounting (`hasEffect`, `callsExpr`, `depthExpr`, `analysisModule`/`analysisImports`), and the generated-side prediction types (`CellKind`, `OutlineCell`, `programIdentity` — layout trivia excluded from identity). |
| `Algal.Source.Eval` | The source interpreter: `MISSING`-aware `evalExpr`/`evalCell`, the fuel-bounded tail machine (`evalTail` → `evalCall`/`evalEach` → `eachItems` → opaque `Child` seam → `mkChild` → `runModule`/`runBody`), ordered `Obs` traces, `invocations` (site × module key), steps/agent-calls accounting, typed `Err` codes, canonical record-field order via `Algal.Core.Text.keyOrder` (`canonExpr`/`canonProgram`). |
| `Algal.Source.Theorems` | Model theorems and witnesses, each tagged with its evidence class. |

## Evidence classes in `Theorems.lean`

- **Model theorems** — facts about the Lean semantics alone (skip semantics,
  short-circuiting, selected-arm-only effects, ordered `each`, missing-arg
  skip, budget-before-work, static analysis shapes). They do not claim the
  TypeScript compiler or the graph runtime agrees.
- **Witnesses** — concrete `runProgram` computations closed by `decide`,
  pinning end-to-end accounting (steps, calls, observations, invocations).
- **Helper-link** — `canonExpr` sorts record entries by `Algal.Core.Text`
  `keyOrder`, the same order the contract's canonical JSON uses; the
  Lean-level statement is shared order, not a proof about production.

## What is proved vs. tested vs. open

- **Proved here (about the model only)**: skip without accounting;
  `and`/`or` short-circuit; guarded `if` runs only the selected arm and the
  merge adds no observation; `each` over `[]` invokes nothing; `each`
  invocations are `site-each/i{i}` in ascending order with ordered results
  under an all-ok child; a missing argument misses the composition before
  the organism cell activates; `runModule` rejects `depth > maxDepth` before
  the input cell; `step`/`charge` fail at the bound; decision normalization
  rejects malformed answers; `callsExpr`/`depthExpr` reproduce the checker's
  static bounds including the wrapped parameterless-call extra depth.
- **Tested (`verify/source/differential.test.ts`, 93 bun tests)**: source
  model vs. compiled-manifest execution on the same programs — receipt
  values/failure codes, ordered oracle observations, `each` ordering,
  selected-path call counts, `MISSING` propagation, wrapped parameterless
  calls, repeated imports.
- **Open (not linked)**: nothing here proves the production checker emits
  the same checks, that `source.ts` lowering's generated cells correspond
  to the model's step accounting, or that the runtime's scheduler matches
  `evalTail` ordering. The trigger-wrapper's three generated steps are
  counted in the TypeScript differential, not in this Lean model — the
  Lean `Module` carries no site/guard info for the wrapper decision;
  `OutlineCell`/`programIdentity` state the structural surface a
  refinement link would target.

## Constraints

- No `sorry`, no `native_decide`, no `axiom`.
- `Expr` has no span/location field and `Module` has no source-map field —
  digests and semantics cannot depend on them.
- `child` in `runModule` is an explicit seam (`mkChild` instantiated at
  `runProgram`); depth recursion is fuel-bounded and the `DEPTH_EXCEEDED`
  budget check — not fuel — is what rejects a too-deep run.
