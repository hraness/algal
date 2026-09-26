# verify/source — scope

An independent semantic model of Algal's readable source language,
distinct from the production compiler (`src/source.ts`) and the graph
runtime (`src/run.ts`). The model exists so the maintained assurance case
has a *source-level* meaning to compare generated-graph behavior against:
"source programs mean what their generated graphs do" is only checkable if
the source side is specified independently.

## Contents

| File | Role |
| --- | --- |
| `model.ts` | The source AST and its honest types (`Expr`, `Program`, `CheckedModule`), `MISSING` as a distinct inhabitant (an undelivered generated port, not `undefined`/`null`), the run record (`SourceRun`: outcome value or typed failure, ordered observations, ordered invocation sites × module keys, step/call accounting). |
| `parse.ts` | The source surface parser — same grammar as production's source syntax; produces an `Expr` tree with no span/location fields. |
| `check.ts` | The source checker — name resolution, lexical scope, module/import identity and closure, arity and `each`-over checks, the static `calls`/`depth` accounting that mirrors the checker's own budget computation (including the extra depth level for a guarded parameterless `call`'s generated trigger wrapper). |
| `interp.ts` | The source interpreter — cell-granular `step`s (`evalCell`), `MISSING` propagation (an undelivered input skips the whole cell), short-circuit `and`/`or`, selected-arm-only `if`/`match`, `decide`/`generate` as ordered oracle observations, `call`/`each` composition with exact argument order and `each` items in ascending order, per-item `over`-port checks, the results-collector step, wrapped parameterless calls (trigger cell + wrapper input + wrapper call), depth and budget failures before work. |
| `differential.ts` | Compile+run: lowers a source program with the production compiler into manifests, executes them through the real scheduler under a scripted `Executor`, runs the same program through `interp.ts`, and compares outcomes — value or typed failure, ordered observations (site shape, kind, text, context), invocation outline, steps/calls, `each` ordering. |
| `differential.test.ts` | The comparison suite: guards, nested matches, `each` (empty, ordered, bounded), `call` (parameterless, guarded-parameterless/trigger, missing-arg skip, nested depth), dynamic type failures, repeated imports. |
| `model.test.ts` | Reference tests for the source model itself — parse/check/interp behavior independent of production. |

## What this is not

- **Not a verifier for the compiler.** The differential checks agreement on
  the tested programs; it does not prove `source.ts` lowering correct, and
  nothing here links `Expr` to the emitted manifest's cells mechanically.
- **Not the runtime.** `interp.ts` does not schedule the generated graph;
  `differential.ts` runs the real scheduler to compare.
- **Not a claim about source maps.** `Expr`/`Module` carry no location or
  source-map data; source maps remain outside executable identity and
  digests by construction here.
- **Not a claim about generated internals.** The comparison projects
  manifests through an outline that hides compiler-generated cells (the
  decision-check expression, the parameterless-call trigger, the branch
  merges) so generated controls never appear as source-level semantics.

## Boundaries encoded in the model

- `MISSING` ≠ `undefined`: an absent binding or undelivered port is a
  separate value that propagates "skip" semantics, so unselected branches
  provably contribute no work.
- `call`/`each` arguments are evaluated in child-parameter declaration
  order inside generated arg cells; an exact-arity check happens at check
  time, a missing input produces `MISSING` (skip) at run time.
- `each` items run in ascending index order at `site-each/i{i}` and the
  collected outputs preserve that order; `[]` invokes the child zero times.
- `decide` answers normalize through the decision-check shape (declared
  choice, confidence in `[0,1]`, in-range probabilities for every label)
  before driving a branch.
- A parameterless `call` inside an effectful arm charges three extra
  generated steps (trigger cell, wrapper `input`, wrapper `call`) and one
  extra depth level — the model counts them in `steps`/`depth` even though
  no source semantics observe them.
- Repeated imports share the module by digest (`imports` keys module
  identity), while nesting still increments depth.

## Relationship to `verify/lean/Algal/Source`

The Lean model (`Algal.Source.Model`, `Algal.Source.Eval`,
`Algal.Source.Theorems`) formalizes this same semantics. The Lean side
proves model-level laws (skip without work, short-circuit, ordered `each`,
empty `each`, missing-arg skip, budget-before-work, static-bounds shape) and
end-to-end witnesses. The two models differ where noted:

- Lean `evalCall` does not charge the trigger wrapper's three steps (the
  Lean `Module` carries no site/guard info for the wrapper decision) — the
  TypeScript model and the differential tests do.
- Lean `canonProgram` canonicalizes record-field order at module entry;
  `interp.ts` sorts entries at record evaluation. Observable order is the
  same.

What is *proved* is stated in `verify/lean/Algal/Source/REGISTRATION.md`;
what is *tested* is the differential suite; the translation/linkage between
them remains an open obligation.
