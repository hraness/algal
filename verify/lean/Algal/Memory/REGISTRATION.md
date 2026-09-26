# Registration notes — `verify/lean/Algal/Memory`

Phase 11 of `docs/formal-verification-plan.md`. **No existing tracked file was
modified**; the modules are reachable by direct import (`import
Algal.Memory.Datalog`, `import Algal.Memory.Theorems`) and can be added to the
`Algal` root import list by the integration change set.

## Modules

- `Datalog.lean` — the semantic model and the checker.
  - `Atom`, `Var`, `Term`, `Literal`, `Tuple`, `Fact`, `Rule`, `Subst`,
    `lookup`, `instTerm`, `instArgs`, `instLit`, `matchTerm`, `matchLit`,
    `matchArgs` — terms, tuples, literals, rules, substitutions, matching.
  - `litVars`, `bodyVars`, `covers`, `Safe` — the range-restriction
    (safety) predicate: every head variable occurs in the body.
  - `joinLit`, `joinBody`, `fire`, `round`, `iter` — the naive
    least-fixpoint evaluator.
  - `Derivable rs fs t := ∃ n, t ∈ iter rs fs n` — the declarative semantics;
    `derivable_base`, `derivable_step`, `derivable_unfold` give the
    base/step characterization.
  - `literals`, `litAtoms`, `domain`, `powList`, `univ` — the finite tuple
    universe; `iter_wf` bounds every iteration inside it;
    `iter_set_stable_exists` proves stabilization within `univ.length`
    rounds; `reach := iter rs fs (univ rs fs).length` is the representative
    fixpoint with `derivable_iff_mem_reach : Derivable ↔ ∈ reach` and
    `derivable_decidable : Decidable (Derivable …)`.
  - `DerivNode`, `premisesOK`, `nodeValid`, `validFrom`, `valid` — the
    derivation-graph checker (index-addressed DAG, premises point strictly
    backwards); `premisesOK_derivable`, `validFrom_at`, `mem_getElem`,
    `valid_sound` prove its correctness.
- `Theorems.lean` — assembled headline theorems plus a concrete witness:
  two `edge` facts, two `path` rules, a five-node `DerivNode` graph
  computing `path(a,c)`, accepted by `valid` and hence `Derivable`;
  `base_claim_rejected`, `forward_reference_rejected`,
  `mismatched_premise_rejected` exercise the checker's negative verdicts.

## Headline statements

- `iter_wf : ∀ t ∈ iter rs fs n, t ∈ univ rs fs` — boundedness.
- `iter_set_stable_exists : (seed fs).Nodup → ∃ n ≤ |univ|, iter (n+1) ⊆ iter n`
  — termination.
- `derivable_iff_mem_reach : (seed fs).Nodup → Derivable t ↔ t ∈ reach` —
  soundness and completeness of the finite semantics.
- `derivable_unfold : Derivable t → t ∈ seed ∨ ∃ r σ, head-instantiation ∧
  (∀ l ∈ body, ∃ u, instLit σ l = u ∧ Derivable u)` — the meaning of a
  derivation.
- `valid_sound : (∀ r ∈ rs, Safe r) → valid rs fs ds = true →
  ∀ d ∈ ds, Derivable rs fs d.conclusion` — the checker's safety theorem.

## Axioms and claims

`#print axioms` on the headline theorems reports only `propext`,
`Classical.choice`, `Quot.sound` — the canonical Lean axioms. No `sorry`, no
custom axioms, no `native_decide` in the formal model (the test witnesses use
kernel `decide`).

Scope: this is a mathematical model of bounded positive Datalog with
range-restricted rules, plus an independently specified checker proved sound
against it. It does not claim that `crates/algal/src/memory.rs` or
`src/application-memory.ts` refine these definitions; such refinement is a
separately reviewable claim. Correspondence evidence at the executable level
is the reference checker in `verify/reference/memory` (see its `SCOPE.md`).
