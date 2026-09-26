# `Algal.Expr` — precisely scoped interpreter semantics

Phase 10 deliverable: an independent semantic model of `algal.expr.v1` in
Lean 4 (`verify/lean/Algal/Expr/**`), its proved properties, and the exact
boundary between what is modelled and what remains open.

**Nothing in this directory claims or establishes that the Rust/WASM
implementation equals this model.** The model is an independently written
evaluator; it was cross-checked against `crates/algal-expr/src/lib.rs` and
`spec/v1/expr.md` by inspection only.

## Files

| File | Contents |
|---|---|
| `Model.lean` | Values, errors (`ErrCode`/`ExprErr`), bounds, scope/env, canonical-byte accounting (`valueBytes` family), UTF-16 string order, ASCII case/trim/split/contains, `minNum`/`maxNum`/`jsRound`, `asIndex` (nonneg-integral `Float`), `itemsGetF/TakeF/DropF`. |
| `Eval.lean` | The result monad `R` (value-or-error + ordered charge trace), the defunctionalized `Work` machine, per-op dispatch, `replay`/`evalFuelled`/`run`. |
| `Theorems.lean` | Proved properties; see below. |

## What the model does and does not claim

### Modelled operations

All dispatch families of the production evaluator except the three explicit
exclusions below:

* arithmetic `add`/`sub`/`mul`/`div`/`neg`/`min`/`max`/`abs`/`floor`/`ceil`/`round`/`clamp` (IEEE-754 `binary64` via `numFloat`/`admitNum`; division checks `b == 0.0` in IEEE order, so `-0` is a divisor error just like `+0`);
* comparison `eq`/`neq`/`lt`/`lte`/`gt`/`gte` (nodes-fold charge, UTF-16 text order);
* logic `and`/`or`/`not`/`if` (early exit, `EXPR_BOOL`-style typing via `asBool`);
* binding `let`/`get` (newest-first scope; env consulted after scope);
* collections `list`/`len`/`nth`/`concat`/`map`/`filter`/`fold`/`contains`/`reverse`/`take`/`drop`/`flat`/`unique`/`keys`/`values`/`merge`/`has`;
* strings `slen`/`sconcat`/`upper`/`lower`/`trim`/`split`/`join`/`scontains`/`starts`/`ends`;
* predicates `isText`/`isNum`/`isBool`/`isList`/`isMap`/`isNull`;
* `quote` (payload returned unevaluated, still post-checked).

### Explicit exclusions

* **`mod`** — `EXPR_UNMODELED`. Production's `mod` is `f64 %` truncated
  semantics; the Lean `Float` surface here does not include it.
* **`sort`** — `EXPR_UNMODELED`. Needs the value total order `cmp_values`.
* **`toText`** — `EXPR_UNMODELED`. Needs the canonical serializer.
* **The static `check` pass** — not modelled. Production `run` runs `check`
  before `eval`; the model's `run` folds the check's observable bounds
  (program bytes/nodes/depth) into the envelope and raises `EXPR_ARITY` at
  dispatch sites. Consequence: for programs the static checker would reject,
  the model and raw production `eval()` can differ on the *code*
  (e.g. `[sub 5]` — raw eval pads the missing arg to `null` and reports
  `EXPR_TYPE`, `check` reports `EXPR_ARITY`); at `run`-level both report the
  arity error because production `run` always checks first. This is the
  documented eval-vs-run asymmetry, not a defect.
* **Number rendering** — `numberByteBound = 24` is an upper bound on the
  shortest canonical decimal rendering, so `EXPR_BOUNDS` decisions on number
  payload are conservative; exact rendering (and `toText`'s dependence on it)
  is unproved.
* **ABI / target evidence** — none asserted. The Lean model and the Rust/WASM
  evaluator share no compiled artifact; no theorem here transfers between
  them.

### Named-model decisions (documented in-code)

* `fmin`/`fmax` use IEEE `minNum`/`maxNum` (`min(0,-0) = -0`,
  `max(0,-0) = +0`), which is what Rust's `f64::min`/`f64::max` implement.
* `eval_args` charges `value_bytes(v,0) + separator` exactly as production.
* `unique` charges one fuel per `seen` comparison in first-seen order,
  including the hit that stops the scan.
* `scope` restoration is definitional (function parameter), matching
  production's `truncate(base)` discipline.

## Evidence classification

Every theorem in `Theorems.lean` is tagged. Summary:

* **Model theorem** — `machine_unique`, `machine_result_cases`,
  `machine_node_charges`, `R_bind_charges`, `R_charge_bind`,
  `postCheck_charges`, `postCheck_charges_ne`, `replay_ok_sum`,
  `replay_ok_exact`, `replay_err_char`, `replay_ok_le`,
  `replay_err_left_le`, `evalFuelled_fuel_exact`, `evalFuelled_fuel_bounded`,
  `run_empty_env_order`, `lookupName_scope_hit`, `lookupName_scope_miss`,
  `pushScope_shadows`, `dropScope_push`, `dropScope_push_two` (Model),
  `RnonFuel_*` plumbing (Eval).
* **Witness** (proved inside the model, no `native_decide`) — eval-level:
  `w_let_*`, `w_map_scope_restored`, `w_eq_signed_zero`, `w_neq_signed_zero`,
  `w_div_by_zero`, `w_add_*`, `w_slen_utf16_units`, `w_fuel_boundary_*`,
  `w_*_unmodeled`, `w_unknown_op`, `w_malformed_empty_array`.
  Helper-level (the evaluator's own text/collection functions, closed by
  `decide`/`rfl`/`simp`): `w_utf16_astral`, `w_utf16_order_helper`,
  `w_upper_ascii`, `w_split_pieces`, `w_split_trailing`,
  `w_keys_canonical_order`, `w_unique_first_seen`, `w_nth_out_of_range`,
  `w_concat_order`.
* **Helper-linked** — `w_keys_canonical_order` is `Text.canonicalKeys`
  (whose `KeyOrder.canonicalKeys_sorted`/`canonicalKeys_preserves_keys` are
  proved in `Algal.Core`); `w_utf16_astral`/`w_utf16_order_helper` use
  `Text.utf16` (`Text.utf16_injective`, `Text.utf16Char_length` proved
  upstream); `eqv`/`numEq` build on `Binary64.normalize` (normalize-equality
  = IEEE value equality on the admitted finite domain is the contract; the
  injectivity side is established upstream).
* **Linked through translation / direct proof** — none. There is no
  mechanized link to Rust or wasm32.
* **Sampled comparison** — the Lean witnesses above re-derive behaviors also
  exercised by the Rust corpus (charge `[2,1,1]` for `[add 7 5]`, UTF-16
  length of astral characters, `-0 == +0`, etc.); the corpus is test-only and
  is not part of this module's evidence.

## Proved properties (what "correct" means here)

1. **Determinism** — `machine_unique`, `machine_result_cases`: evaluation is
   a function; every call produces `ok` or `error`, never a third outcome.
2. **Termination without fuel** — the evaluator is a total Lean function:
   `machine` terminates by `termination_by workMeasure` (lexicographic
   program-subtree × pending-length). Fuel is not what makes evaluation
   terminate.
3. **No fuel underflow** — `replay` subtracts `c` only after `c ≤ left`
   (`replay_err_char` proves the first-crossing invariant: a failed replay
   reports exactly `(cost, left)` at the first unaffordable charge);
   `evalFuelled_fuel_bounded`: reported `used ≤ budget` on every path.
4. **Fuel is exact, not approximate** — `evalFuelled_fuel_exact`: a
   successful run reports `used = charges.sum`; `replay_ok_sum`: any
   surviving replay satisfies `left' + sum = left`.
5. **Charge coverage** — `machine_node_charges`: every well-formed node
   evaluation logs at least one charge (`baseCost`/`1` head), so a completed
   evaluation cannot silently bypass the budget.
6. **Scope restoration** — `w_let_scope_restored`, `w_map_scope_restored`
   witnesses plus `pushScope_shadows`/`dropScope_push`/`dropScope_push_two`
   (Model): bindings are newest-first, sibling evaluations see the outer
   scope unchanged.
7. **Growth checks before allocation** — each arm checks its bound
   (`checkArity`, `asNum`, `listCount`, `strFold`, `mergeLoop`,
   `valueBytes`-family, `checkValue` post-checks) before emitting; the
   witnesses exercise `list-len`/`object-keys`/`value-bytes`/`string-bytes`/
   `value-depth`/`program-*`/`fuel-budget` envelope order in `run`.
8. **Collection ordering** — `w_keys_canonical_order` (canonical key order:
   array-index keys numerically first, then UTF-16 — the `Text.canonicalKeys`
   output the `keys` arm emits), `w_unique_first_seen` (first-seen retention
   on `uniqueLoop`), `w_concat_order` (positional append on `listsOnto`),
   `w_nth_out_of_range` (`itemsGetF` walks a `Float` index — the check
   precedes any narrowing).
9. **UTF-16** — `w_slen_utf16_units` (`slen "😀" = 2` at eval level) and
   `w_utf16_astral` (`Text.utf16 "😀" = [0xD83D, 0xDE00]`),
   `w_utf16_order_helper` (`"b" < "😀"` by surrogate order via
   `utf16compare`).
10. **ASCII case** — `w_upper_ascii` (`upperStr "aZé!" = "AZé!"` — ASCII
    only, é untouched); `isTrimChar`/`trimStr`/`asciiUpperChar`/
    `asciiLowerChar` are the contract's ASCII/6-char trim set, not Unicode.
11. **Numeric corner cases** — `w_eq_signed_zero`, `w_neq_signed_zero`,
    `w_div_by_zero`, `fmin`/`fmax`/`jsRound` definitions with their
    signed-zero ties documented.
12. **Explicit exclusions** — `w_mod_unmodeled`, `w_sort_unmodeled`,
    `w_toText_unmodeled`; unknown op gives `EXPR_OP` (`w_unknown_op`);
    malformed node shape gives `EXPR_PARSE` (`w_malformed_empty_array`).

## Known unproved gaps (deliberate)

* `machine`'s reachable error codes exclude `EXPR_FUEL` *by construction*
  (every error site is a literal non-fuel constructor or a propagated helper
  error, and `fuelErr` is only invoked in `evalFuelled`); a full
  `machine.induct` proof of `∀ e, (machine env σ w).result = .error e →
  e.code ≠ .fuel` is not written out — the induction principle exists and the
  helper lemmas `RnonFuel_*` are the intended machinery. This is an
  in-the-model invariant; it is listed here rather than silently assumed.
* The model and production agree on *order* of charges by inspection of both
  sources; there is no per-program bisimulation proof. `eval`-level arity
  checks vs production `check` are documented above.
* Number rendering (`numberByteBound` vs exact shortest rendering) is a
  conservative bound, not exact — so `EXPR_BOUNDS` on number payload is a
  conservative overapproximation and is flagged where it occurs.
* `Replay`/`evalFuelled` model a *single* budget; there is no separate
  WASM/JS ABI claim, no shared object, and no statement that another runtime
  agrees.

## Verification commands

```sh
cd verify/lean
~/.elan/bin/lake env lean Algal/Expr/Model.lean
~/.elan/bin/lake env lean Algal/Expr/Eval.lean
~/.elan/bin/lake env lean Algal/Expr/Theorems.lean
```

All three compile under the pinned `leanprover/lean4:v4.34.0` toolchain.
No `sorry`, no custom axioms, no `native_decide` (all reduction is kernel
`simp`/`decide`-in-`simp`/`rfl`-level).
