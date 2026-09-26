# `Algal.Expr` — registration

How this module relates to the rest of the verification tree, and what is
(intentionally) not wired up.

## Module map

```
Algal.Expr.Model      — values, errors, bounds, scope/env, text & number
                        helpers, canonical-byte accounting
Algal.Expr.Eval       — result monad R, Work machine, per-op dispatch,
                        replay / evalFuelled / run
Algal.Expr.Theorems   — proved properties + evidence-tagged witnesses
Algal.Expr.SCOPE.md   — scope, exclusions, evidence classes
Algal.Expr.REGISTRATION.md — this file
```

Imports (existing, unchanged): `Algal.Core.Json`, `Algal.Core.Binary64`,
`Algal.Core.Text`, `Algal.Core.OwnMap`, `Algal.Core.Accounting`,
`Algal.Core.BinaryValue`, `Algal.Core.KeyOrder`,
`Algal.Core.Text.Normalize` (via `Algal.Core`).

The library target (`Algal`) is a separate root; `Algal.Expr` is not imported
into it — the Expr module is built on demand:

```sh
cd verify/lean
~/.elan/bin/lake build Algal.Expr.Model Algal.Expr.Eval Algal.Expr.Theorems
```

`Algal.lean`, `Algal/Core/All.lean`, `theorems.json`, `run.ts`, and every
other tracked file are untouched.

## Dependency direction

```
Theorems ──imports──► Eval ──imports──► Model ──imports──► Algal.Core.*
```

No file outside `verify/lean/Algal/Expr/**` imports `Algal.Expr` — there is
no downstream consumer, so the module cannot leak into the release surface
accidentally.

## What a future linkage step would need

To move a property from *model* to *linked through translation* or *direct
proof*, the missing pieces are, in dependency order:

1. A machine-readable description of the Rust dispatch in
   `crates/algal-expr/src/lib.rs` (or a generated Lean counterpart) and a
   refinement relation `Value → Expr.Value → Prop`.
2. Proof that `machine` simulates that relation step-for-step — the
   charge-order and error-code arguments in `Theorems.lean` are written to be
   the obligations of that simulation.
3. For WASM: a model of `wasm32` `f64` semantics and an `add_finalize` /
   rounding argument — `numFloat`/`admitNum` already isolate where the
   finite-domain admission happens.

None of that is present; the claims here stay inside the model.

## Where the theorems are tagged

Each theorem's docstring names its evidence class in prose; `SCOPE.md`
tabulates the registry. Adding a theorem without a classification violates
this module's contract.

## How to exercise the model

The evaluator is ordinary Lean — `#eval (eval [] program)` works wherever a
representation is printable. The committed witness theorems are the
supported corpus; they pin observable behavior (result + charge trace +
error code + fuel boundary) for the operations listed in `SCOPE.md`.
