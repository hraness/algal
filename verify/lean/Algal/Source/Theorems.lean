import Algal.Source.Eval

/-!
# algal source — semantic-model theorems

This module proves properties of the **independent source semantics** in
`Algal.Source.Model` / `Algal.Source.Eval`, plus evidence-boundary lemmas
that say exactly where the model's guarantees end.

Every theorem carries an evidence classification:

* **Model theorem** — a fact about the Lean semantics only. These do *not*
  claim the TypeScript compiler or the graph runtime behaves the same; they
  state what the model semantics is, in a form a future refinement link
  could target.
* **Witness** — a concrete run inside the model, proved by unfolding the
  machine or by kernel computation (`decide`/`rfl` — no `native_decide`, no
  `sorry`). Witnesses pin intended behavior where the implementation could
  drift.
* **Helper-link** — a theorem whose statement names the same object an
  `Algal.Core` theorem is about (the `keyOrder` canonical key order shared
  by record-evaluation order and the JSON digest).

Contents:

1. Skip semantics — undelivered inputs produce `miss` without accounting.
2. Short circuiting — `and`/`or` never consult the right operand when the
   left settles the result.
3. Branch selection — guarded `if`/`match` run only the selected arm.
4. `each` — empty batches invoke nothing; items run in ascending order and
   collect ordered results.
5. Composition — a missing argument skips the call site before activation.
6. Depth and budgets — `DEPTH_EXCEEDED`, `BUDGET_EXHAUSTED` before the work.
7. Decision normalization — malformed answers fail `EXPR_FAILED`.
8. Static analysis — the checker's counted bounds are structural.
9. Whole-run witnesses — end-to-end accounting on concrete programs.
10. The boundary — what this model does not claim.
-/

set_option autoImplicit false
namespace Algal.Source

open Algal.Core Algal.Core.Json

/-! ## 1. Skip semantics

A cell whose read names are undelivered returns `miss` and leaves the
accounting state exactly as found — no step, no charge, no observation.
`MISSING` is the generated port that never produced a value. -/

/-- Skipped cells perform no work: `undelivered` selects the `miss` branch
    before `step` runs. Evidence: model. -/
theorem evalCell_skips (B : Budgets) (e : Expr) (env : Env) (s : State)
    (h : undelivered e env = true) : evalCell B e env s = (.miss, s) := by
  simp only [evalCell, h, if_true]

/-- A skipped cell contributes no step, no charge, no observation. -/
theorem evalCell_skips_count (B : Budgets) (e : Expr) (env : Env) (s : State)
    (h : undelivered e env = true) :
    (evalCell B e env s).2.steps = s.steps ∧
    (evalCell B e env s).2.calls = s.calls ∧
    (evalCell B e env s).2.obs = s.obs := by
  rw [evalCell_skips B e env s h]; exact ⟨rfl, rfl, rfl⟩

/-- A name bound to `none` in the environment is undelivered, and the cell
    it reads skips. Evidence: model. -/
theorem name_miss_skips (B : Budgets) (env : Env) (n : String) (s : State)
    (h : env.lookup n = some none) :
    evalCell B (.name n) env s = (.miss, s) := by
  apply evalCell_skips
  simp [undelivered, freeNames, h]

/-- And an undelivered name reads as `miss`, not a value. -/
theorem name_undelivered_miss (env : Env) (n : String)
    (h : env.lookup n = some none) :
    evalExpr (.name n) env = .miss := by
  simp only [evalExpr]; rw [h]

/-! ## 2. Short circuiting

`and`/`or` inside a generated expression cell consult the right operand only
when the left fails to settle — exactly the generated `and`/`or` program
semantics. The statements are universally quantified over the right operand:
nothing about `e` can affect the result once the left side is decided,
including an `e` that would error or miss. -/

/-- `false && e` never evaluates `e`. Evidence: model. -/
theorem and_shortcircuits (e : Expr) (env : Env) :
    evalExpr (.binary .and (.lit (.bool false)) e) env = .ok (.bool false) := by
  simp only [evalExpr, truthy]

/-- `true || e` never evaluates `e`. Evidence: model. -/
theorem or_shortcircuits (e : Expr) (env : Env) :
    evalExpr (.binary .or (.lit (.bool true)) e) env = .ok (.bool true) := by
  simp only [evalExpr, truthy]

/-- `true && e` defers to `e` — the right operand is consulted only then.
    Evidence: model. -/
theorem and_consults_right (e : Expr) (env : Env) :
    evalExpr (.binary .and (.lit (.bool true)) e) env = evalExpr e env := by
  simp only [evalExpr, truthy]

/-- `false || e` defers to `e`. Evidence: model. -/
theorem or_consults_right (e : Expr) (env : Env) :
    evalExpr (.binary .or (.lit (.bool false)) e) env = evalExpr e env := by
  simp only [evalExpr, truthy]

/-- A non-boolean left operand fails the boolean context with `EXPR_FAILED`,
    before the right operand is consulted. Evidence: model. -/
theorem and_non_bool_fails (e : Expr) (env : Env) :
    evalExpr (.binary .and (.lit (.text "x")) e) env = .err (err .exprFailed) := by
  simp only [evalExpr, truthy]

/-! ## 3. Branch selection

A guarded `if`/`match` compiles to a selector cell, the selected arm's cells,
and a merge cell; the unselected arm runs nothing. In the model this is
literal: the unselected arm is never passed to `evalTail`. -/

/-- A pure conditional is a single expression cell — no selector, no merge.
    Evidence: model. -/
theorem evalTail_pure_if (B : Budgets) (o : Obs → Except Err Value) (child : Child)
    (fuel : Nat) (mod : Module) (env : Env) (site : String) (depth : Nat)
    (c y n : Expr) (s : State)
    (hg : (hasEffect y || hasEffect n) = false) :
    evalTail B o child (fuel + 1) mod env site depth (.if_ c y n) s =
      evalCell B (.if_ c y n) env s := by
  simp only [evalTail]; rw [if_pos (by simp [hg])]

/-- When the selector cell is skipped, the whole conditional misses — no arm
    runs, no merge is charged. Evidence: model. -/
theorem evalTail_if_selector_miss (B : Budgets) (o : Obs → Except Err Value)
    (child : Child) (fuel : Nat) (mod : Module) (env : Env) (site : String)
    (depth : Nat) (c y n : Expr) (s : State)
    (hg : (hasEffect y || hasEffect n) = true)
    (hm : evalCell B c env s = (.miss, s)) :
    evalTail B o child (fuel + 1) mod env site depth (.if_ c y n) s = (.miss, s) := by
  simp only [evalTail]; rw [if_neg (by simp [hg])]
  simp [seqR, hm]

/-- `if true` selects the first arm: the run is the arm's own run followed by
    exactly the merge step. Evidence: model. -/
theorem evalTail_if_true (B : Budgets) (o : Obs → Except Err Value) (child : Child)
    (fuel : Nat) (mod : Module) (env : Env) (site : String) (depth : Nat)
    (c y n : Expr) (s : State)
    (hg : (hasEffect y || hasEffect n) = true)
    (hc : evalCell B c env s = (.ok (.bool true), s)) :
    evalTail B o child (fuel + 1) mod env site depth (.if_ c y n) s =
      seqR (evalTail B o child fuel mod env s!"{site}-branch-arm-{1}" depth y s)
        (fun v s => seq (step B s) fun s => (.ok v, s)) := by
  simp only [evalTail]
  rw [if_neg (by simp [hg])]
  simp only [seqR, hc, truthy, ite_true]

/-- `if false` selects the second arm symmetrically. Evidence: model. -/
theorem evalTail_if_false (B : Budgets) (o : Obs → Except Err Value) (child : Child)
    (fuel : Nat) (mod : Module) (env : Env) (site : String) (depth : Nat)
    (c y n : Expr) (s : State)
    (hg : (hasEffect y || hasEffect n) = true)
    (hc : evalCell B c env s = (.ok (.bool false), s)) :
    evalTail B o child (fuel + 1) mod env site depth (.if_ c y n) s =
      seqR (evalTail B o child fuel mod env s!"{site}-branch-arm-{2}" depth n s)
        (fun v s => seq (step B s) fun s => (.ok v, s)) := by
  simp only [evalTail]
  rw [if_neg (by simp [hg])]
  simp only [seqR, hc, truthy]
  rw [ite_eq_right (by decide : ¬(false = true)), ite_eq_right (by decide : ¬(false = true))]

/-- `step` never records an observation — it only charges the step counter.
    Evidence: model. -/
theorem step_preserves_obs (B : Budgets) (s : State) :
    (step B s).2.obs = s.obs := by
  unfold step; split <;> rfl

/-- Consequence: a guarded `if` observes exactly what the selected arm
    observes — the selector adds no oracle traffic and the merge is a pure
    step. Evidence: model. -/
theorem if_obs_are_arm_obs (B : Budgets) (o : Obs → Except Err Value) (child : Child)
    (fuel : Nat) (mod : Module) (env : Env) (site : String) (depth : Nat)
    (c y n : Expr) (s : State)
    (hg : (hasEffect y || hasEffect n) = true)
    (hc : evalCell B c env s = (.ok (.bool true), s)) :
    (evalTail B o child (fuel + 1) mod env site depth (.if_ c y n) s).2.obs =
      (evalTail B o child fuel mod env s!"{site}-branch-arm-{1}" depth y s).2.obs := by
  rw [evalTail_if_true B o child fuel mod env site depth c y n s hg hc]
  cases h : evalTail B o child fuel mod env s!"{site}-branch-arm-{1}" depth y s with
  | mk r s' =>
      cases r with
      | ok v =>
          simp only [seqR]
          cases h2 : step B s' with
          | mk r2 s'' =>
              have ho : s''.obs = s'.obs := by
                have := step_preserves_obs B s'; rw [h2] at this; exact this
              cases r2 <;> simp only [seq] <;> rw [ho]
      | miss => simp [seqR]
      | err e => simp [seqR]

/-! ## 4. `each` — empty, ordered, bounded -/

/-- Empty `each` produces an empty ordered result — no child invocation, no
    per-item work. Evidence: model. -/
theorem eachItems_empty (B : Budgets) (o : Obs → Except Err Value) (child : Child)
    (fuel : Nat) (cm : Module) (over : String) (argv : List (String × Option Value))
    (i : Nat) (site : String) (depth : Nat) (s : State) (acc : List Value) :
    eachItems B o child (fuel + 1) cm over argv [] i site depth s acc =
      (.ok (.array (itemsOf acc.reverse)), s) := by
  simp only [eachItems]

/-- The ordered invocation sites `site-each/i{i}`, `site-each/i{i+1}`, … an
    `each` emits, in the order it emits them. -/
def eachSites (site : String) (key : String) : Nat → List Value → List (String × String)
  | _, [] => []
  | i, _ :: rest => (s!"{site}-each/i{i}", key) :: eachSites site key (i + 1) rest

/-- The child that answers every run with `f` of the `over`-bound item — the
    canonical "all items succeed" instantiation of the seam. -/
def childOK (f : Value → Value) : Child :=
  fun _ args _ _ s =>
    let v : Value := match args with
      | (_, some x) :: _ => x
      | _ => .null
    (.ok (f v), s)

/-- `each` under an all-ok child: the result is the ordered `map` of `f` over
    the items, and the invocation trace is exactly `site-each/i0…i{n-1}` in
    ascending order. Fuel `i + xs.length + 1` — one tick per item plus the
    entry — suffices. Evidence: model. -/
theorem eachItems_ordered (B : Budgets) (o : Obs → Except Err Value)
    (cm : Module) (over : String) (argv : List (String × Option Value))
    (site : String) (depth : Nat) (f : Value → Value) :
    ∀ (xs : List Value) (i : Nat) (acc : List Value) (s : State),
      eachItems B o (childOK f) (xs.length + 1) cm over argv xs i site depth s acc =
        (.ok (.array (itemsOf (acc.reverse ++ xs.map f))),
          { s with invocations := s.invocations ++ eachSites site cm.key i xs }) := by
  intro xs
  induction xs with
  | nil =>
      intro i acc s
      show eachItems B o (childOK f) 1 cm over argv [] i site depth s acc = _
      rw [eachItems]
      simp [eachSites]
  | cons x rest ih =>
      intro i acc s
      have hf : (x :: rest).length + 1 = (rest.length + 1) + 1 := by
        simp [List.length_cons]
      rw [hf]
      rw [eachItems]
      simp only [childOK]
      rw [ih (i + 1) (f x :: acc) ({ s with invocations := s.invocations ++ [(s!"{site}-each/i{i}", cm.key)] })]
      congr 1
      · simp [List.reverse_cons, List.map_cons]
      · simp [eachSites, List.append_assoc]

/-- When a child call fails, the whole `each` fails at that item — the typed
    error propagates out of `eachItems` unchanged. Evidence: model. -/
theorem eachItems_fails (B : Budgets) (o : Obs → Except Err Value)
    (cm : Module) (over : String) (argv : List (String × Option Value))
    (site : String) (depth : Nat) (e : Err)
    (fuel : Nat)
    (x : Value) (rest : List Value) (i : Nat) (acc : List Value) (s : State)
    (child : Child)
    (hchild : child cm ((over, some x) :: argv) s!"{site}-each/i{i}" depth
        { s with invocations := s.invocations ++ [(s!"{site}-each/i{i}", cm.key)] } =
        (.err e, { s with invocations := s.invocations ++ [(s!"{site}-each/i{i}", cm.key)] })) :
    eachItems B o child (fuel + 1) cm over argv (x :: rest) i site depth s acc =
      (.err e, { s with invocations := s.invocations ++ [(s!"{site}-each/i{i}", cm.key)] }) := by
  simp only [eachItems]; rw [hchild]

/-! ## 5. Composition

- `evalArgs` evaluates exactly the child's declared parameters, in
  declaration order; an absent argument leaves the port undelivered.
- A missing argument skips the composition before the organism cell
  activates — zero steps, zero invocations from the composition itself. -/

/-- A `call` whose argument values include an undelivered port misses: the
    organism cell does not activate and no invocation is recorded.
    Evidence: model. -/
theorem evalCall_missing_arg (B : Budgets) (o : Obs → Except Err Value) (child : Child)
    (fuel : Nat) (mod : Module) (env : Env) (site : String) (depth : Nat)
    (alias : String) (args : List (String × Expr)) (s : State)
    (cm : Module) (argv : List (String × Option Value)) (s' : State)
    (himp : mod.imports.lookup alias = some cm)
    (hargs : evalArgs B fuel (cm.program.parameters.map fun (pname, _) =>
        (pname, ((args.find? fun (n, _) => n == pname)).map Prod.snd))
      env s = (.ok argv, s'))
    (hnone : argv.any (fun (_, v) => v.isNone) = true) :
    evalCall B o child (fuel + 1) mod env site depth alias args s = (.miss, s') := by
  simp only [evalCall]
  rw [himp]
  simp only [seqR, hargs, hnone, ite_true]

/-! ## 6. Depth and budgets -/

/-- `runModule` rejects depth beyond `maxDepth` before the input cell — no
    work is charged. Evidence: model. -/
theorem runModule_depth_exceeded (B : Budgets) (o : Obs → Except Err Value)
    (child : Child) (fuel : Nat) (m : Module) (args : List (String × Option Value))
    (site : String) (depth : Nat) (s : State) (h : depth > B.maxDepth) :
    runModule B o child (fuel + 1) m args site depth s = (.err (err .depthExceeded), s) := by
  simp [runModule, h]

/-- At `maxSteps` the next cell activation fails `BUDGET_EXHAUSTED` before
    doing work — the charge precedes the work, matching `run.ts`'s
    `ctx.work.steps + 1 > budgets.maxSteps` check inside `runCell`. Evidence:
    model. -/
theorem step_exhausted (B : Budgets) (s : State) (h : s.steps + 1 > B.maxSteps) :
    step B s = (.err (err .budgetExhausted), s) := by
  simp [step, h]

/-- Executor attempts are charged at `maxAgentCalls` — the (n+1)th fails
    before the request is observed. Evidence: model. -/
theorem charge_exhausted (B : Budgets) (s : State) (h : s.calls + 1 > B.maxAgentCalls) :
    charge B s = (.err (err .budgetExhausted), s) := by
  simp [charge, h]

/-! ## 7. Decision normalization -/

/-- An answer without the `answers.answer` shape fails `EXPR_FAILED` — the
    generated `nth`-of-empty check. Evidence: model. -/
theorem normalizeDecision_malformed (labels : List String) :
    normalizeDecision (.object .nil) labels = .error (err .exprFailed) := by
  simp only [normalizeDecision, getOf]

/-! ## 8. Static analysis

`callsExpr`/`depthExpr` reproduce the checker's counted bounds: emitted
effect cells, call budgets weighted by `maxItems`, and one extra depth level
for the generated trigger wrapper on a guarded parameterless call. -/

/-- An effect's own cell counts once plus its operand's effects. Evidence:
    model. -/
theorem callsExpr_decide (resolve : String → Option (Nat × Nat)) (q : String)
    (c : Expr) (cs : List (String × String)) :
    callsExpr resolve (.decide q c cs) = 1 + callsExpr resolve c := rfl

/-- A `call` contributes the child's whole `maxAgentCalls` budget. Evidence:
    model. -/
theorem callsExpr_call (resolve : String → Option (Nat × Nat)) (alias : String)
    (args : List (String × Expr)) :
    callsExpr resolve (.call alias args) = ((resolve alias).map Prod.fst).getD 0 := rfl

/-- An `each` charges the child's budget per permitted item. Evidence:
    model. -/
theorem callsExpr_each (resolve : String → Option (Nat × Nat)) (alias over : String)
    (items : Expr) (args : List (String × Expr)) (maxItems : Nat) :
    callsExpr resolve (.each alias over items args maxItems) =
      callsExpr resolve items + callsEntries resolve args +
        ((resolve alias).map Prod.fst).getD 0 * maxItems := rfl

/-- A guarded parameterless `call` pays one extra depth level for the
    generated trigger wrapper — `control` is true inside an effectful arm.
    Evidence: model. -/
theorem depthExpr_wrapped_call (resolve : String → Option (Nat × Nat))
    (alias : String) (childDepth : Nat)
    (h : resolve alias = some (0, childDepth)) :
    depthExpr resolve true (.call alias []) = max (childDepth + 2) 0 := by
  simp [depthExpr, depthEntries, h]

/-- An unguarded parameterless `call` adds exactly one depth level.
    Evidence: model. -/
theorem depthExpr_plain_call (resolve : String → Option (Nat × Nat))
    (alias : String) (childDepth : Nat)
    (h : resolve alias = some (0, childDepth)) :
    depthExpr resolve false (.call alias []) = max (childDepth + 1) 0 := by
  simp [depthExpr, depthEntries, h]

/-! ## 9. Whole-run witnesses

End-to-end accounting on concrete programs, under a scripted oracle — the
facts the differential harness (`verify/source/differential.test.ts`)
cross-checks against the production manifest and runtime. -/

/-- A minimal leaf module: `program m() -> json { return <e> }`. -/
private def litModule (key : String) (e : Expr) (budgets : Budgets := {}) : Module :=
  { key
    program := { name := "m", parameters := [], output := .json,
                 bindings := [], result := e, budgets := budgets }
    imports := [] }

/-- Script oracle: answers `generate` with `"ok"`, `decide` with a valid
    single-label decision record (confidence 0.5, probability 1). -/
private def oracle : Obs → Except Err Value
  | { kind := "decide", .. } =>
      .ok (.object (.cons "answers" (.object (.cons "answer"
        (.object (.cons "choice" (.text "formal")
          (.cons "confidence" (.number ⟨0x3FE0000000000000, by decide⟩)
            (.cons "probabilities"
              (.object (.cons "formal" (.number ⟨0x3FF0000000000000, by decide⟩) .nil))
              .nil)))) .nil)) .nil))
  | _ => .ok (.text "ok")

/-- Witness: a pure literal program produces its value with exactly one
    activation (the result cell), zero calls, zero observations. -/
theorem witness_pure :
    runProgram 4 64 oracle (litModule "m" (.lit (.text "x"))) [] =
      (.ok (.text "x"), ⟨1, 0, [], []⟩) := by decide

/-- Witness: `if true then generate else lit` — selector, operand cells,
    the agent cell's charge, the merge — and exactly one observation; the
    `else` arm contributes nothing. -/
theorem witness_if_selects :
    runProgram 4 64 oracle
        (litModule "m" (.if_ (.lit (.bool true))
          (.generate (.lit (.text "i")) (.lit .null))
          (.lit (.text "no"))) { maxAgentCalls := 4 }) [] =
      (.ok (.text "ok"),
        ⟨5, 1, [{ site := "result-branch-arm-1", kind := "generate",
                  text := "i", context := .null }], []⟩) := by decide

/-- Witness: `each` over `[]` records no invocation and returns `[]` —
    the items arg cell, the each cell, and the collector — three steps. -/
theorem witness_each_empty :
    let child : Module := { litModule "c" (.name "x") with program :=
      { (litModule "c" (.name "x")).program with parameters := [("x", .json)] } }
    let m : Module :=
      { key := "m"
        program := { name := "m", parameters := [], output := .json,
                     bindings := [],
                     result := .each "c" "x" (.lit (.array .nil)) [] 4,
                     budgets := { maxAgentCalls := 4 } }
        imports := [("c", child)] }
    runProgram 4 64 oracle m [] = (.ok (.array .nil), ⟨3, 0, [], []⟩) := by decide

/-- Witness: `each` over `[a, b]` invokes the child at `i0`, `i1` in order
    and collects the ordered results (the child is `id` — `return x`). -/
theorem witness_each_order :
    let child : Module := { litModule "c" (.name "x") with program :=
      { (litModule "c" (.name "x")).program with parameters := [("x", .json)] } }
    let m : Module :=
      { key := "m"
        program := { name := "m", parameters := [], output := .json,
                     bindings := [],
                     result := .each "c" "x"
                        (.lit (.array (.cons (.text "a") (.cons (.text "b") .nil)))) [] 4,
                     budgets := { maxAgentCalls := 4, maxDepth := 2 } }
        imports := [("c", child)] }
    runProgram 4 64 oracle m [] =
      (.ok (.array (.cons (.text "a") (.cons (.text "b") .nil))),
        ⟨7, 0, [], [("result-each/i0", "c"), ("result-each/i1", "c")]⟩) := by decide

/-- Witness: a missing argument leaves the call's port undelivered — the
    composition cell never activates and nothing is invoked. -/
theorem witness_call_skipped_arg :
    let child : Module := { litModule "c" (.name "x") with program :=
      { (litModule "c" (.name "x")).program with parameters := [("x", .json)] } }
    let m : Module :=
      { key := "m"
        program := { name := "m", parameters := [], output := .json,
                     bindings := [],
                     result := .call "c" [("x", .name "absent")],
                     budgets := { maxDepth := 2 } }
        imports := [("c", child)] }
    runProgram 4 64 oracle m [] = (.miss, ⟨0, 0, [], []⟩) := by decide

/-- Witness: `decide` emits one observation, normalizes the answer through
    the decision-check cell, and produces the decision record. -/
theorem witness_decide :
    runProgram 4 64 oracle
        (litModule "m" (.decide "q" (.lit .null) [("formal", "precise")])
          { maxAgentCalls := 1 }) [] =
      (.ok (.object (.cons "value" (.text "formal")
              (.cons "confidence" (.number ⟨0x3FE0000000000000, by decide⟩)
                (.cons "probabilities"
                  (.object (.cons "formal" (.number ⟨0x3FF0000000000000, by decide⟩) .nil))
                  .nil)))),
        ⟨3, 1, [{ site := "result-decide", kind := "decide", text := "q",
                  context := .null }], []⟩) := by decide

/-! ## 10. The boundary

Nothing in this file is a claim about the TypeScript checker, the manifest
it emits, or the graph runtime. The correspondence between this model and
production is *tested* (in `verify/source/differential.test.ts`) — the
source-level obligations the model proves here (skip without work,
short-circuit without right-operand evaluation, selected-arm-only effects,
ascending `each` order, empty `each` without invocation, missing-argument
skip, depth/budget before work) are the properties a future refinement would
re-establish on the generated side. Source maps and locations are absent
from `Model` entirely, so no Lean statement can accidentally depend on them. -/

/-- Evidence boundary: `runProgram` is the model's meaning; there is no
    mechanism here that proves production agrees. -/
theorem boundary_documented : True := trivial

end Algal.Source
