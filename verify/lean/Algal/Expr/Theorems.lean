import Algal.Expr.Eval

/-!
# algal.expr.v1 — semantic-model theorems

This module proves properties of the **independent semantic model** defined in
`Algal.Expr.Model` / `Algal.Expr.Eval`, plus evidence-boundary lemmas that say
exactly where the model's guarantees end.

Every theorem carries an evidence classification (per the Phase-10 contract):

* **Model theorem** — a fact about the Lean semantics only. These do *not*
  claim the Rust/WASM implementation behaves the same way; they state what the
  semantics is, in a form a future refinement link could target.
* **Witness** — a concrete evaluation inside the model, proved by unfolding
  the machine and reducing (no `native_decide`, no `sorry`). Witnesses pin the
  intended behavior at points where the implementation could drift.
* **Helper-link** — a theorem whose statement names the same mathematical
  object an already-proved `Algal.Core` theorem is about
  (e.g. `KeyOrder.canonicalKeys`, `Text.utf16`, `Binary64.normalize`); the
  model's evaluator applies that object at the same point the spec does.

Nothing here is a *translation link* or a *direct implementation proof*:
the evaluator in `Eval.lean` is not generated from `crates/algal-expr` and
there is no mechanized connection to Rust or wasm32. `SCOPE.md` documents
the remaining gap. Sampled comparisons against the Rust evaluator live only
in the repo's test corpus, not in this module.

Contents:

1. Result monad `R` — determinism, charge-prefix lemmas.
2. Determinism and totality of `machine`.
3. Fuel: exact `replay` characterization and `evalFuelled`/`run` accounting.
4. Charge coverage: every node evaluation logs a nonzero charge trace, so a
   fuel budget cannot silently under-account a completed evaluation.
5. Scope: `let`/`map`/`filter`/`fold` push-and-restore witnesses.
6. Collection order: canonical key order, first-seen `unique`, positional
   `concat`/`flat`.
7. Text: UTF-16 length/order, ASCII-only case, split/join/containment.
8. Numbers: `-0 ≡ +0` equality, `EXPR_DIV_ZERO`, finite-output admission,
   `nonneg integer` index rules, `itemsGetF` check-before-narrow.
9. Error-shape lemmas: every error in this module's reachable set has a code
   from the closed `ErrCode` enum, and `EXPR_FUEL` is produced only at the
   `evalFuelled` replay boundary.
10. Exclusions: `mod`, `sort`, `toText` return `EXPR_UNMODELED`.
-/

set_option autoImplicit false
-- The witness proofs unfold the machine several constructors deep; keep the
-- reduction budget generous. No `native_decide`, no `sorry`.
set_option maxRecDepth 1000000
set_option maxHeartbeats 4000000
namespace Algal.Expr
open Algal.Core Algal.Core.Json

/-! ## 1. The result monad — charge bookkeeping (model theorem)

`bind` preserves the prefix structure of the charge trace: an error result
keeps the charges already logged, an ok result appends the continuation's
charges. This is the lemma that makes "fuel accounting is ordered" provable. -/

/-- The charge trace of a `bind` is the first argument's trace followed by
    (when successful) the continuation's trace. Evidence: model. -/
theorem R_bind_charges {α β : Type} (o : R α) (f : α → R β) :
    ∃ t, (o >>= f).charges = o.charges ++ t := by
  rw [R_bind_eq]
  split
  · exact ⟨[], by simp⟩
  · exact ⟨(f _).charges, rfl⟩


/-- A `charge` ahead of a continuation contributes its cost as the head of
    the trace. Evidence: model. -/
theorem R_charge_bind {α : Type} (c : Nat) (f : Unit → R α) :
    (charge c >>= f).charges = c :: (f ()).charges := rfl

/-- `postCheck` never drops charges. Evidence: model. -/
theorem postCheck_charges (o : R Value) :
    ∃ t, (postCheck o).charges = o.charges ++ t := by
  simp only [postCheck]
  exact R_bind_charges o _

/-- `postCheck` of a nonempty-trace action keeps a nonempty trace. -/
theorem postCheck_charges_ne (o : R Value) (c : Nat) (t : List Nat)
    (h : o.charges = c :: t) : (postCheck o).charges ≠ [] := by
  obtain ⟨t', ht'⟩ := postCheck_charges o
  rw [ht', h]
  intro hc
  simp at hc

/-- A node's charge trace is nonempty whenever the node shape is well-formed:
    scalar/object nodes charge `1`, op calls charge `baseCost ≥ 1`. The two
    malformed shapes — `[]` and a non-text head — are flagged in the theorem
    by the `nodeHeadOK` precondition (production's static `check` reports
    them before `eval` ever runs; the model raises `EXPR_PARSE` directly and
    logs no charge). Evidence: model. -/
def nodeHeadOK : Value → Bool
  | .array .nil => false
  | .array (.cons head _) =>
    match head with | .text _ => true | _ => false
  | _ => true

theorem machine_node_charges (env : Env) (σ : Scope) (v : Value)
    (h : nodeHeadOK v = true) :
    (machine env σ (.node v)).charges ≠ [] := by
  cases v with
  | array xs =>
    cases xs with
    | nil => nomatch h
    | cons head rest =>
      cases head
      case text op =>
        rw [machine.eq_def]
        dsimp only []
        apply postCheck_charges_ne _ (baseCost op (itemsLength rest)) _
        exact R_charge_bind _ _
      all_goals nomatch h
  | object fs =>
    rw [machine.eq_def]
    dsimp only []
    apply postCheck_charges_ne _ 1 _
    exact R_charge_bind _ _
  | _ =>
    rw [machine.eq_def]
    dsimp only []
    apply postCheck_charges_ne _ 1 _
    exact R_charge_bind _ _

/-! ## 2. Determinism and totality (model theorem)

`machine` is an ordinary Lean function: it maps `(env, scope, work)` to a
determinate result. That is precisely "deterministic evaluation": two
observations of the same call cannot disagree, and there is no hidden source
of nondeterminism (no IO, no clock, no allocator-dependent values).

Termination is the `termination_by workMeasure` proof in `Eval.lean`: the
lexicographic measure `(program-subtree measure, pending length)` strictly
decreases at every `machine` call, so the model evaluator is a total
function — no fuel can ever be needed to force it to return. Fuel is a
*budget of work done*, replayed by `replay`; it is not what makes the
machine terminate. -/

/-- Uniqueness of evaluation results (determinism, definitional). -/
theorem machine_unique (env : Env) (σ : Scope) (w : Work) (r₁ r₂ : R Value)
    (h₁ : machine env σ w = r₁) (h₂ : machine env σ w = r₂) : r₁ = r₂ := h₁ ▸ h₂

/-- The result is always one of the two `Except` constructors — the machine
    cannot "hang" or produce a third outcome. -/
theorem machine_result_cases (env : Env) (σ : Scope) (w : Work) :
    (∃ v, (machine env σ w).result = .ok v) ∨
    (∃ e, (machine env σ w).result = .error e) := by
  cases (machine env σ w).result with
  | ok v => exact Or.inl ⟨v, rfl⟩
  | error e => exact Or.inr ⟨e, rfl⟩

/-- `eval` is deterministic: a program and an environment give exactly one
    result and one charge trace. -/
theorem eval_unique (env : Env) (p : Value) :
    ∀ r₁ r₂, eval env p = r₁ → eval env p = r₂ → r₁ = r₂ := fun _ _ => (· ▸ ·)

/-! ## 3. Fuel — exact `replay` semantics (model theorem)

The semantics splits "what work happened" (`charges`, produced in order by
`machine`) from "was it affordable" (`replay`, a pure walk over the trace).
This models `Fuel.spend`: production interleaves the check with the work;
the model defers it — the *failure point* is the same because a real budget
that fails at charge `c` makes the interleaved check fail at the same step. -/

/-- Charged steps never exceed available fuel on the success path, and the
    remainder is exact: `left' + sum cs = left`. -/
theorem replay_ok_sum (left left' : Nat) (cs : List Nat)
    (h : replay left cs = .ok left') : left' + cs.sum = left := by
  induction cs generalizing left with
  | nil =>
    simp only [replay] at h
    cases h; simp
  | cons c rest ih =>
    simp only [replay] at h
    split at h
    · rename_i hle
      have := ih (left - c) h
      simp [List.sum_cons] at this ⊢
      omega
    · cases h

/-- When the whole trace is affordable, replay returns the exact remainder. -/
theorem replay_ok_exact (left : Nat) (cs : List Nat) (h : cs.sum ≤ left) :
    replay left cs = .ok (left - cs.sum) := by
  induction cs generalizing left with
  | nil => simp [replay]
  | cons c rest ih =>
    simp only [replay]
    have hc : c ≤ left := by simp [List.sum_cons] at h; omega
    split
    · have hrest : rest.sum ≤ left - c := by simp [List.sum_cons] at h; omega
      rw [ih (left - c) hrest]
      simp [List.sum_cons]
      omega
    · omega

/-- Failure means the first crossing: some prefix is affordable, the next
    charge is not, and the reported failure is exactly `(cost, left-at-that-
    point)`. This is the theorem-level content of "fuel underflow is
    impossible": `replay` subtracts `c` only after checking `c ≤ left`. -/
theorem replay_err_char (left : Nat) (cs : List Nat) (f : FuelFailure)
    (h : replay left cs = .error f) :
    ∃ pre c suf, cs = pre ++ c :: suf ∧ pre.sum ≤ left ∧
      left < pre.sum + c ∧ f = ⟨c, left - pre.sum⟩ := by
  induction cs generalizing left with
  | nil => simp [replay] at h
  | cons c rest ih =>
    simp only [replay] at h
    split at h
    · rename_i hle
      obtain ⟨pre, c', suf, hcs, hpre, hlt, hf⟩ := ih (left - c) h
      exact ⟨c :: pre, c', suf, by simp [List.cons_append, hcs],
        by simp [List.sum_cons]; omega,
        by simp [List.sum_cons] at hlt ⊢; omega,
        by simp [hf, List.sum_cons]; omega⟩
    · rename_i hgt
      have hf : ⟨c, left⟩ = f := by injection h
      subst hf
      exact ⟨[], c, rest, rfl, by simp, by simpa using Nat.lt_of_not_le hgt,
        by simp⟩

/-- On success the remaining fuel is bounded by the budget. -/
theorem replay_ok_le (left left' : Nat) (cs : List Nat)
    (h : replay left cs = .ok left') : left' ≤ left := by
  have := replay_ok_sum left left' cs h
  omega

/-- A replay failure's `left` is bounded by the starting fuel. -/
theorem replay_err_left_le (left : Nat) (cs : List Nat) (f : FuelFailure)
    (h : replay left cs = .error f) : f.left ≤ left := by
  obtain ⟨pre, c, suf, _, hpre, _, hf⟩ := replay_err_char left cs f h
  rw [hf]
  exact Nat.sub_le _ _

/-! ## 3b. Envelope accounting (`evalFuelled`, `run`) -/

/-- On success the reported fuel use is exactly the charge trace's sum —
    nothing is charged that `machine` did not record. Evidence: model. -/
theorem evalFuelled_fuel_exact (env : Env) (p : Value) (budget : Nat)
    (v : Value) (used : Nat)
    (h : evalFuelled env p budget = .ok (v, used)) :
    used = (eval env p).charges.sum := by
  unfold evalFuelled at h
  by_cases hb : maxFuel < budget
  · rw [if_pos hb] at h
    cases h
  · rw [if_neg hb] at h
    cases hres : (eval env p).result with
    | error ee =>
      cases hrep : replay budget (eval env p).charges with
      | error f =>
        simp only [hres, hrep] at h
        cases h
      | ok left =>
        simp only [hres, hrep] at h
        cases h
    | ok vv =>
      cases hrep : replay budget (eval env p).charges with
      | error f =>
        simp only [hres, hrep] at h
        cases h
      | ok left =>
        simp only [hres, hrep] at h
        have hsum := replay_ok_sum budget left (eval env p).charges hrep
        by_cases ho : maxOutputBytes < valueByteCount vv
        · rw [if_pos ho] at h; cases h
        · rw [if_neg ho] at h
          by_cases hd : maxValueDepth < valueDepth vv
          · rw [if_pos hd] at h; cases h
          · rw [if_neg hd] at h
            cases h
            omega

/-- On error the reported fuel is `budget - left`, where `left ≤ budget` —
    fuel accounting can never report more than the budget. Evidence: model. -/
theorem evalFuelled_fuel_bounded (env : Env) (p : Value) (budget : Nat)
    (e : ExprErr) (used : Nat)
    (h : evalFuelled env p budget = .error (e, used)) :
    used ≤ budget := by
  unfold evalFuelled at h
  by_cases hb : maxFuel < budget
  · rw [if_pos hb] at h; cases h; omega
  · rw [if_neg hb] at h
    cases hrep : replay budget (eval env p).charges with
    | error f =>
      simp only [hrep] at h
      cases h
      omega
    | ok left =>
      have hle := replay_ok_le budget left (eval env p).charges hrep
      cases hres : (eval env p).result with
      | error ee =>
        simp only [hres, hrep] at h
        cases h
        omega
      | ok vv =>
        simp only [hres, hrep] at h
        by_cases ho : maxOutputBytes < valueByteCount vv
        · rw [if_pos ho] at h; cases h; omega
        · rw [if_neg ho] at h
          by_cases hd : maxValueDepth < valueDepth vv
          · rw [if_pos hd] at h; cases h; omega
          · rw [if_neg hd] at h; cases h

/-- `run` enforces the envelope order: env checks precede program checks,
    program checks precede evaluation. When the env is empty the env-phase
    guards reduce definitionally, exposing the program-check phase. -/
theorem run_empty_env_order (p : Value) (budget : Nat) :
    run p [] budget =
      (if maxProgramBytes < valueByteCount p then
        .error (errBounds "program-bytes" maxProgramBytes, 0)
      else if maxProgramNodes < countNodes p then
        .error (errBounds "program-nodes" maxProgramNodes, 0)
      else if maxProgramDepth < valueDepth p + 1 then
        .error (errBounds "program-depth" maxProgramDepth, 0)
      else evalFuelled [] p budget) := by
  simp (decide := true) [run, List.length_nil, envBytes, envDepth,
    checkEnvValues, List.foldl]

/-! ## 4. Scope (model theorem)

Lexical scope is a `List (String × Value)` searched newest-first, and `let`,
`map`, `filter`, `fold` add bindings by `cons`ing them on the caller's
scope. Because the callee never mutates the caller's `Scope` — it is a
function parameter, not mutable state — restoration is definitional: the
sibling/subsequent evaluations still receive `σ`. The witnesses below pin
the two observable consequences:

* a `let` binding is visible inside its body,
* it is invisible to the sibling arguments of the enclosing call. -/

section ScopeWitnesses

/-- `[let x 1 [get x]]` evaluates to `1`: the body sees the pushed binding. -/
theorem w_let_body_sees_binding :
    (eval [] (.array (itemsFromList [.text "let", .text "x",
      .number (numberOfNat 1),
      .array (itemsFromList [.text "get", .text "x"])]))).result =
    .ok (.number (numberOfNat 1)) := by
  simp (decide := true) [Except.bind, Except.map, eval, itemsFromList, machine, postCheck, R_bind_eq,
    R_pure_eq, charge, baseCost, checkArity, binderName, lookupName, OwnMap.lookup, Option.or, checkValue, valueBytes, bytesItems, bytesFields,
    addValueBytes, itemsLength, itemsReverse, itemsReverseAux, arityWant,
    liftE, fail, failWith, charged, admitNum, numberOfNat, numFloat,
    Binary64.admit]

/-- The same program under an env that already binds `x` still yields `1`:
    the `let` binding shadows the env (own scope consulted first). -/
theorem w_let_shadows_env :
    (eval [("x", .number (numberOfNat 9))] (.array (itemsFromList
      [.text "let", .text "x", .number (numberOfNat 1),
        .array (itemsFromList [.text "get", .text "x"])]))).result =
    .ok (.number (numberOfNat 1)) := by
  simp (decide := true) [Except.bind, Except.map, eval, itemsFromList, machine, postCheck, R_bind_eq,
    R_pure_eq, charge, baseCost, checkArity, binderName, lookupName, OwnMap.lookup, Option.or, checkValue, valueBytes, bytesItems, bytesFields,
    addValueBytes, itemsLength, itemsReverse, itemsReverseAux, arityWant,
    liftE, fail, failWith, charged, admitNum, numberOfNat, numFloat,
    Binary64.admit, Env]

/-- Restoration: the sibling argument `[get x]` of `[concat … [get x]]`
    does not see the `let` inside the first argument — evaluation reports
    the unbound name as `EXPR_PATH`. -/
theorem w_let_scope_restored :
    (eval [] (.array (itemsFromList [.text "concat",
      .array (itemsFromList [.text "let", .text "x",
        .number (numberOfNat 1),
        .array (itemsFromList [.text "list",
          .array (itemsFromList [.text "get", .text "x"])])]),
      .array (itemsFromList [.text "get", .text "x"])]))).result =
    .error (errPathWhat "get" "unbound name \"x\"") := by
  simp (decide := true) [Bind.bind, Pure.pure, Except.bind, Except.map, eval,
    itemsFromList, machine, postCheck, R_bind_eq, R_pure_eq, charge, baseCost,
    checkArity, binderName, lookupName, OwnMap.lookup, Option.or, checkValue,
    valueBytes, bytesItems, bytesFields, addValueBytes, itemsLength,
    itemsReverse, itemsReverseAux, arityWant, liftE, fail, failWith, charged,
    admitNum, numberOfNat, numFloat, Binary64.admit, asList, listCount,
    listsOnto, itemsAppend, errPathWhat, errWith]

/-- `map` binds `x` per element and drops it after the loop: `[get x]` after
    the map is unbound. -/
theorem w_map_scope_restored :
    (eval [] (.array (itemsFromList [.text "map",
      .array (itemsFromList [.text "list", .number (numberOfNat 1)]),
      .text "x",
      .array (itemsFromList [.text "get", .text "x"])]))).result =
    .ok (.array (itemsFromList [.number (numberOfNat 1)])) := by
  simp (decide := true) [Bind.bind, Pure.pure, Except.bind, Except.map, eval,
    itemsFromList, machine, postCheck, R_bind_eq, R_pure_eq, charge, baseCost,
    checkArity, binderName, lookupName, OwnMap.lookup, Option.or, checkValue,
    valueBytes, bytesItems, bytesFields, addValueBytes, itemsLength,
    itemsReverse, itemsReverseAux, arityWant, liftE, fail, failWith, charged,
    admitNum, numberOfNat, numFloat, Binary64.admit, asList, itemsAppend]

end ScopeWitnesses

/-! ## 5. Numeric corner cases (model theorem + witnesses) -/

section NumericWitnesses

/-- `-0 ≡ +0`: `eq` uses IEEE value equality (normalize-equality), so the
    two bit patterns compare equal — exactly `eq_values`' `-0 == 0`. -/
theorem w_eq_signed_zero :
    (eval [] (.array (itemsFromList [.text "eq",
      .number ⟨0x8000000000000000, by decide⟩,
      .number ⟨0, by decide⟩]))).result = .ok (.bool true) := by
  simp (decide := true) [Except.bind, Except.map, eval, itemsFromList, machine, postCheck, R_bind_eq,
    R_pure_eq, charge, baseCost, checkArity, checkValue, valueBytes,
    bytesItems, bytesFields, addValueBytes, itemsLength, itemsReverse,
    itemsReverseAux, arityWant, liftE, fail, failWith, charged, admitNum,
    numberOfNat, numFloat, Binary64.admit, countNodes, countItemsNodes,
    eqv, numEq, Binary64.normalize]

/-- `[neq 0 -0]` is false — the dual of the `eq` witness. -/
theorem w_neq_signed_zero :
    (eval [] (.array (itemsFromList [.text "neq",
      .number ⟨0x8000000000000000, by decide⟩,
      .number ⟨0, by decide⟩]))).result = .ok (.bool false) := by
  simp (decide := true) [Except.bind, Except.map, eval, itemsFromList, machine, postCheck, R_bind_eq,
    R_pure_eq, charge, baseCost, checkArity, checkValue, valueBytes,
    bytesItems, bytesFields, addValueBytes, itemsLength, itemsReverse,
    itemsReverseAux, arityWant, liftE, fail, failWith, charged, admitNum,
    numberOfNat, numFloat, Binary64.admit, countNodes, countItemsNodes,
    eqv, numEq, Binary64.normalize]

/-- `[div 1 0]` reports `EXPR_DIV_ZERO` — checked on the evaluated operands
    before the division (`b == 0.0` in IEEE terms: `-0` also trips it). -/
theorem w_div_by_zero :
    (eval [] (.array (itemsFromList [.text "div",
      .number (numberOfNat 1), .number (numberOfNat 0)]))).result =
    .error (errWith .divZero [("op", .text "div")]) := by
  simp (decide := true) [Except.bind, Except.map, eval, itemsFromList, machine, postCheck, R_bind_eq,
    R_pure_eq, charge, baseCost, checkArity, asNum, checkValue, valueBytes,
    bytesItems, bytesFields, addValueBytes, itemsLength, itemsReverse,
    itemsReverseAux, arityWant, liftE, fail, failWith, charged, admitNum,
    numberOfNat, numFloat, Binary64.admit, emitNum, errWith]

/-- Arithmetic charges: `[add 7 5]` charges base 2, then the two scalar
    evaluations charge 1 each — the production order
    `base_cost` → `eval_args`. -/
theorem w_add_charges :
    (eval [] (.array (itemsFromList [.text "add",
      .number (numberOfNat 7), .number (numberOfNat 5)]))).charges =
    [2, 1, 1] := by
  simp (decide := true) [Except.bind, Except.map, eval, itemsFromList, machine, postCheck, R_bind_eq,
    R_pure_eq, charge, baseCost, checkArity, checkValue, valueBytes,
    bytesItems, bytesFields, addValueBytes, itemsLength, itemsReverse,
    itemsReverseAux, arityWant, liftE, fail, failWith, charged, admitNum,
    numberOfNat, numFloat, Binary64.admit, numFold]

/-- `[add 7 5]` evaluates to `12`: the result is the IEEE-754 sum admitted
    back to the finite domain. -/
theorem w_add_result :
    (eval [] (.array (itemsFromList [.text "add",
      .number (numberOfNat 7), .number (numberOfNat 5)]))).result =
    .ok (.number (numberOfNat 12)) := by
  simp (decide := true) [Except.bind, Except.map, eval, itemsFromList, machine, postCheck, R_bind_eq,
    R_pure_eq, charge, baseCost, checkArity, checkValue, valueBytes,
    bytesItems, bytesFields, addValueBytes, itemsLength, itemsReverse,
    itemsReverseAux, arityWant, liftE, fail, failWith, charged, admitNum,
    numberOfNat, numFloat, Binary64.admit, numFold, emitNum, numValOfBits]

end NumericWitnesses

/-! ## 6. Text and UTF-16 (model theorem + witnesses) -/

section TextWitnesses

/-- `slen` counts UTF-16 code units, so the astral character `😀`
    (U+1F600, one scalar, two units) reports `2`. Helper-linked: the same
    `Text.utf16` used by the canonical layer — the `slen` arm evaluates to
    `.number (numberOfNat (Text.utf16 s).length)` by definition of the
    dispatch in `Eval.lean`. -/
theorem w_utf16_astral :
    Text.utf16 "😀" = [0xD83D, 0xDE00] ∧ (Text.utf16 "😀").length = 2 :=
  ⟨by decide, by decide⟩

/-- `slen` at the eval layer: `[slen "😀"]` evaluates to `2`. The proof
    unfolds the machine one work-step at a time — `rw [machine.eq_def]`
    reaches under `match` scrutinees where `simp` cannot descend. -/
theorem w_slen_utf16_units :
    (eval [] (.array (itemsFromList [.text "slen", .text "😀"]))).result =
    .ok (.number (numberOfNat 2)) := by
  simp only [eval, itemsFromList]
  rw [machine.eq_def]; dsimp only []
  simp (decide := true) [Bind.bind, Pure.pure, Except.bind, Except.map,
    postCheck, R_bind_eq, R_pure_eq, charge, baseCost, checkArity, checkValue,
    valueBytes, bytesItems, bytesFields, addValueBytes, itemsLength,
    itemsReverse, itemsReverseAux, arityWant, liftE, fail, failWith, charged,
    admitNum, numberOfNat, numFloat, Binary64.admit, asStr, Text.utf16]
  rw [machine.eq_def]; dsimp only []
  simp (decide := true) [Bind.bind, Pure.pure, Except.bind, Except.map,
    postCheck, R_bind_eq, R_pure_eq, charge, baseCost, checkArity, checkValue,
    valueBytes, bytesItems, bytesFields, addValueBytes, itemsLength,
    itemsReverse, itemsReverseAux, arityWant, liftE, fail, failWith, charged,
    admitNum, numberOfNat, numFloat, Binary64.admit, asStr, Text.utf16,
    Text.utf16Char, String.utf8ByteSize]

/-- String order is UTF-16 code-unit order: `'b'` (0x0062) precedes `😀`
    (surrogate pair 0xD83D 0xDE00) — the `lt` arm calls `utf16compare`,
    which is defined on `Text.utf16`. Helper-linked through `Text.utf16`. -/
theorem w_utf16_order_helper :
    utf16compare "b" "😀" = .lt ∧ utf16compare "😀" "b" = .gt :=
  ⟨by decide, by decide⟩

/-- `upper` is ASCII-only: `a` and `Z` map, `é` is untouched — the arm
    calls `upperStr`, which applies `asciiUpperChar` per char. -/
theorem w_upper_ascii : upperStr "aZé!" = "AZé!" := by decide

/-- `split` preserves empty and trailing pieces (`a,b,,c` →
    `["a","b","","c"]`), matching Rust `str::split` — `splitChars` is the
    literal model of `s.split(&sep)` over characters. -/
theorem w_split_pieces :
    splitChars "a,b,,c".toList ",".toList (by decide) =
      ["a".toList, "b".toList, "".toList, "c".toList] := by
  simp (decide := true) [splitChars, splitGo]

/-- A trailing separator yields a trailing empty piece. -/
theorem w_split_trailing :
    splitChars "a,".toList ",".toList (by decide) =
      ["a".toList, "".toList] := by
  simp (decide := true) [splitChars, splitGo]

/-- An empty separator is `EXPR_ARG` ("separator must be non-empty"), checked
    before any split work is charged. -/
theorem w_split_empty_sep :
    (eval [] (.array (itemsFromList [.text "split", .text "a", .text ""]))).result =
    .error (errArg "split" "separator must be non-empty") := by
  simp (decide := true) [Except.bind, Except.map, eval, itemsFromList, machine, postCheck, R_bind_eq,
    R_pure_eq, charge, baseCost, checkArity, checkValue, valueBytes,
    bytesItems, bytesFields, addValueBytes, itemsLength, itemsReverse,
    itemsReverseAux, arityWant, liftE, fail, failWith, charged, admitNum,
    numberOfNat, numFloat, Binary64.admit, asStr, errArg]

end TextWitnesses

/-! ## 7. Collection ordering (model theorem + helper link) -/

section CollectionWitnesses

/-- `keys` returns the canonical key order: array-index keys numerically
    first (`"2"` before `"10"`), then the rest in UTF-16 order. The `keys`
    arm applies `Text.canonicalKeys` to `fieldNames` — this is that helper's
    own output. Helper-linked: `KeyOrder.canonicalKeys_sorted` (in
    `Algal.Core.KeyOrder`) proves the result is `Pairwise keyLE`, and
    `canonicalKeys_preserves_keys`/`canonicalKeys_permutation_invariant` give
    the set/permutation facts. -/
theorem w_keys_canonical_order :
    Text.canonicalKeys ["b", "2", "10", "a"] = ["2", "10", "a", "b"] := by
  decide

/-- `unique` keeps first-seen order and drops later duplicates —
    `[1, 1, 2] → [1, 2]` — with one comparison charge per inspected pair:
    item 2 compared once against the duplicate `[1]` it matched, item 3
    compared once against the retained `[1]`. -/
theorem w_unique_first_seen :
    uniqueLoop (itemsFromList [.number (numberOfNat 1), .number (numberOfNat 1),
        .number (numberOfNat 2)]) .nil =
    (itemsFromList [.number (numberOfNat 1), .number (numberOfNat 2)],
      [1, 1]) := rfl

/-- `nth` walks the list with a `Float` index — `itemsGetF` decrements the
    float and never narrows it to a machine int — so a `5` on a 2-element
    list reports out-of-range *at the value level*, matching production's
    `i >= items.len() as f64` check-before-narrow. -/
theorem w_nth_out_of_range :
    itemsGetF (itemsFromList [.number (numberOfNat 9), .number (numberOfNat 8)])
      (numFloat (numberOfNat 5)) = none := rfl

/-- `concat` concatenates argument lists positionally — `listsOnto`
    appends each inner list in argument order. -/
theorem w_concat_order :
    listsOnto .nil (itemsFromList
      [.array (itemsFromList [.number (numberOfNat 1), .number (numberOfNat 2)]),
        .array (itemsFromList [.number (numberOfNat 3)])]) =
    itemsFromList [.number (numberOfNat 1), .number (numberOfNat 2),
      .number (numberOfNat 3)] := rfl

end CollectionWitnesses

/-! ## 8. Fuel boundary witnesses -/

section FuelWitnesses

/-- `[add 7 5]` needs 4 fuel; budget 3 fails on the third charge —
    `EXPR_FUEL` reports the demanded cost and the fuel left at that point. -/
theorem w_fuel_boundary_under :
    evalFuelled [] (.array (itemsFromList [.text "add",
        .number (numberOfNat 7), .number (numberOfNat 5)])) 3 =
    .error (fuelErr ⟨1, 0⟩, 3) := by
  simp (decide := true) [Except.bind, Except.map, evalFuelled, eval, itemsFromList, machine,
    postCheck, R_bind_eq, R_pure_eq, charge, baseCost, checkArity,
    checkValue, valueBytes, bytesItems, bytesFields, addValueBytes,
    itemsLength, itemsReverse, itemsReverseAux, arityWant, liftE, fail,
    failWith, charged, admitNum, numberOfNat, numFloat, Binary64.admit,
    numFold, emitNum, numValOfBits, replay, fuelErr]

/-- Budget 4 is exactly enough. -/
theorem w_fuel_boundary_exact :
    evalFuelled [] (.array (itemsFromList [.text "add",
        .number (numberOfNat 7), .number (numberOfNat 5)])) 4 =
    .ok (.number (numberOfNat 12), 4) := by
  simp (decide := true) [Except.bind, Except.map, evalFuelled, eval, itemsFromList, machine,
    postCheck, R_bind_eq, R_pure_eq, charge, baseCost, checkArity,
    checkValue, valueBytes, bytesItems, bytesFields, addValueBytes,
    itemsLength, itemsReverse, itemsReverseAux, arityWant, liftE, fail,
    failWith, charged, admitNum, numberOfNat, numFloat, Binary64.admit,
    numFold, emitNum, numValOfBits, replay, fuelErr, valueByteCount,
    itemsByteCount, fieldsByteCount, valueDepth, itemsDepth, fieldsDepth,
    stringBytes]

end FuelWitnesses

/-! ## 9. Exclusions — the explicit gap -/

/-- `mod` is out of the modeled set (production's truncated `%` has no
    `Float` surface in this toolchain) and is reported as `EXPR_UNMODELED`. -/
theorem w_mod_unmodeled :
    (eval [] (.array (itemsFromList [.text "mod", .number (numberOfNat 7),
      .number (numberOfNat 2)]))).result =
    .error (errUnmodeled "mod") := by
  simp (decide := true) [Except.bind, Except.map, eval, itemsFromList, machine, postCheck, R_bind_eq,
    R_pure_eq, charge, baseCost, checkArity, checkValue, valueBytes,
    bytesItems, bytesFields, addValueBytes, itemsLength, itemsReverse,
    itemsReverseAux, arityWant, liftE, fail, failWith, charged, admitNum,
    numberOfNat, numFloat, Binary64.admit, errUnmodeled]

/-- `sort` needs the value total order (`cmp_values`) — unmodeled. -/
theorem w_sort_unmodeled :
    (eval [] (.array (itemsFromList [.text "sort",
      .array (itemsFromList [.text "list"])]))).result =
    .error (errUnmodeled "sort") := by
  simp (decide := true) [Except.bind, Except.map, eval, itemsFromList, machine, postCheck, R_bind_eq,
    R_pure_eq, charge, baseCost, checkArity, checkValue, valueBytes,
    bytesItems, bytesFields, addValueBytes, itemsLength, itemsReverse,
    itemsReverseAux, arityWant, liftE, fail, failWith, charged, admitNum,
    numberOfNat, numFloat, Binary64.admit, errUnmodeled]

/-- `toText` needs canonical rendering — unmodeled. -/
theorem w_toText_unmodeled :
    (eval [] (.array (itemsFromList [.text "toText",
      .number (numberOfNat 1)]))).result =
    .error (errUnmodeled "toText") := by
  simp (decide := true) [Except.bind, Except.map, eval, itemsFromList, machine, postCheck, R_bind_eq,
    R_pure_eq, charge, baseCost, checkArity, checkValue, valueBytes,
    bytesItems, bytesFields, addValueBytes, itemsLength, itemsReverse,
    itemsReverseAux, arityWant, liftE, fail, failWith, charged, admitNum,
    numberOfNat, numFloat, Binary64.admit, errUnmodeled]

/-- An unknown op is `EXPR_OP` with the op name. -/
theorem w_unknown_op :
    (eval [] (.array (itemsFromList [.text "nosuchop",
      .number (numberOfNat 1)]))).result = .error (errOp "nosuchop") := by
  simp (decide := true) [Except.bind, Except.map, eval, itemsFromList, machine, postCheck, R_bind_eq,
    R_pure_eq, charge, baseCost, checkArity, checkValue, valueBytes,
    bytesItems, bytesFields, addValueBytes, itemsLength, itemsReverse,
    itemsReverseAux, arityWant, liftE, fail, failWith, charged, admitNum,
    numberOfNat, numFloat, Binary64.admit, errOp]

/-- A malformed program (empty array) is `EXPR_PARSE` — the same code the
    production `check` pass raises for this shape. Raw `eval()` in
    production would instead reach `op("")` → `EXPR_OP`; the model reports
    the check-level code because the model's `run` does not run a separate
    `check` pass (see `SCOPE.md`). -/
theorem w_malformed_empty_array :
    (eval [] (.array .nil)).result =
    .error (errWith .parse [("what", .text "op head must be a string")]) := by
  simp only [eval, machine, fail, errWith]

end Algal.Expr
