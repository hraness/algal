import Algal.Memory.Datalog

namespace Algal.Memory

/-! # Assembled theorems — memory derivation checker

This file collects the main correctness statements of `Datalog.lean` as
top-level theorems, and exercises them on a concrete program: two `edge`
base facts and the standard two-rule transitive closure producing `path`
tuples.  A five-node derivation graph is shown to be `valid`, and hence its
conclusions are `Derivable`; conversely derivability is decidable inside the
finite tuple universe via `reach`. -/

/-- **Semantics soundness**: every tuple enumerated by the bounded iterator is
    derivable. -/
theorem iter_sound_assembled {rs : List Rule} {fs : List Fact} (n : Nat)
    {t : Tuple} (h : t ∈ iter rs fs n) : Derivable rs fs t := ⟨n, h⟩

/-- **Semantics completeness**: under seed tuple distinctness, derivability is
    exactly membership in the representative fixpoint `reach`. -/
theorem derivable_iff_reach {rs : List Rule} {fs : List Fact}
    (hn : (seed fs).Nodup) {t : Tuple} :
    Derivable rs fs t ↔ t ∈ reach rs fs :=
  derivable_iff_mem_reach hn

/-- **Boundedness of the model**: every enumerated tuple lies in the finite
    universe `univ`. -/
theorem iter_bounded {rs : List Rule} {fs : List Fact} (n : Nat) {t : Tuple} :
    t ∈ iter rs fs n → t ∈ univ rs fs :=
  iter_wf n t

/-- **Termination**: the iteration reaches a set-fixpoint within
    `univ.length` rounds. -/
theorem iter_terminates {rs : List Rule} {fs : List Fact}
    (hn : (seed fs).Nodup) :
    ∃ n ≤ (univ rs fs).length, iter rs fs (n+1) ⊆ iter rs fs n :=
  iter_set_stable_exists hn (fun n t ht => iter_wf n t ht)

/-- **Decidability of derivability** (in `Derivable`, via `reach`). -/
def derivable_is_decidable {rs : List Rule} {fs : List Fact}
    (hn : (seed fs).Nodup) (t : Tuple) : Decidable (Derivable rs fs t) :=
  derivable_decidable hn t

/-- **Checker soundness**: a valid derivation graph only asserts derivable
    conclusions. -/
theorem checker_sound {rs : List Rule} {fs : List Fact}
    (hsafe : ∀ r ∈ rs, Safe r) {ds : List DerivNode}
    (hv : valid rs fs ds = true) :
    ∀ {d : DerivNode}, d ∈ ds → Derivable rs fs d.conclusion :=
  valid_sound hsafe hv

/-- **Evaluation semantics characterization**: derivable tuples are exactly the
    seed facts plus one-step rule applications over derivable premises. -/
theorem derivable_characterization {rs : List Rule} {fs : List Fact} {t : Tuple} :
    Derivable rs fs t →
      t ∈ seed fs ∨
        ∃ r ∈ rs, ∃ σ, instLit σ r.head = some t ∧
          ∀ l ∈ r.body, ∃ u, instLit σ l = some u ∧ Derivable rs fs u :=
  derivable_unfold

/-! ## Concrete witness: transitive closure of a two-edge chain

Facts: `edge(a,b)`, `edge(b,c)`.  Rules:
  * `r_base : path(x,y) :- edge(x,y)`
  * `r_step : path(x,z) :- edge(x,y), path(y,z)`

Then `path(a,c)` is derivable, witnessed by an explicit five-node graph. -/

section Witness

/-- Atoms for the example. -/
def AtA : Atom := .text "a"
def AtB : Atom := .text "b"
def AtC : Atom := .text "c"
def RelEdge : Relation := "edge"
def RelPath : Relation := "path"

/-- Base facts with provenance labels. -/
def fAB : Fact := ⟨⟨RelEdge, [AtA, AtB]⟩, ["seed-1"]⟩
def fBC : Fact := ⟨⟨RelEdge, [AtB, AtC]⟩, ["seed-2"]⟩

/-- `path(x,y) :- edge(x,y)`. -/
def rBase : Rule :=
  ⟨"r-base", ⟨RelPath, [.var "x", .var "y"]⟩, [⟨RelEdge, [.var "x", .var "y"]⟩]⟩

/-- `path(x,z) :- edge(x,y), path(y,z)`. -/
def rStep : Rule :=
  ⟨"r-step", ⟨RelPath, [.var "x", .var "z"]⟩,
    [⟨RelEdge, [.var "x", .var "y"]⟩, ⟨RelPath, [.var "y", .var "z"]⟩]⟩

def prog : List Rule := [rBase, rStep]
def facts : List Fact := [fAB, fBC]

/-- Both rules are safe: every head variable occurs in the body. -/
theorem prog_safe : ∀ r ∈ prog, Safe r := by
  intro r hr
  simp only [prog, List.mem_cons, List.not_mem_nil, or_false] at hr
  rcases hr with rfl | rfl
  · intro v hv
    have hveq : v = "x" ∨ v = "y" := by
      simpa [rBase, litVars, termVars] using hv
    rcases hveq with rfl | rfl
    · show "x" ∈ bodyVars rBase
      simp [rBase, bodyVars, litVars, termVars]
    · show "y" ∈ bodyVars rBase
      simp [rBase, bodyVars, litVars, termVars]
  · intro v hv
    have hveq : v = "x" ∨ v = "z" := by
      simpa [rStep, litVars, termVars] using hv
    rcases hveq with rfl | rfl
    · show "x" ∈ bodyVars rStep
      simp [rStep, bodyVars, litVars, termVars]
    · show "z" ∈ bodyVars rStep
      simp [rStep, bodyVars, litVars, termVars]

/-- The five-node derivation graph:
    `n0`,`n1` base; `n2`,`n3` direct paths; `n4` the transitive step. -/
def n0 : DerivNode := ⟨none, ⟨RelEdge, [AtA, AtB]⟩, []⟩
def n1 : DerivNode := ⟨none, ⟨RelEdge, [AtB, AtC]⟩, []⟩
def n2 : DerivNode := ⟨some (rBase, [("x", AtA), ("y", AtB)]), ⟨RelPath, [AtA, AtB]⟩, [0]⟩
def n3 : DerivNode := ⟨some (rBase, [("x", AtB), ("y", AtC)]), ⟨RelPath, [AtB, AtC]⟩, [1]⟩
def n4 : DerivNode := ⟨some (rStep, [("x", AtA), ("y", AtB), ("z", AtC)]), ⟨RelPath, [AtA, AtC]⟩, [0, 3]⟩

def graph : List DerivNode := [n0, n1, n2, n3, n4]

/-- The checker accepts the graph. -/
theorem graph_valid : valid prog facts graph = true := by
  decide

/-- `path(a,c)` is derivable from `facts` under `prog` (witnessed by `n4`). -/
theorem path_ac_derivable : Derivable prog facts ⟨RelPath, [AtA, AtC]⟩ :=
  valid_sound prog_safe graph_valid (d := n4) (by decide)

/-- `path(a,c)` appears in the fixpoint. -/
theorem path_ac_reach : ⟨RelPath, [AtA, AtC]⟩ ∈ reach prog facts :=
  (derivable_iff_mem_reach (by decide)).mp path_ac_derivable

/-- A node claiming `path(a,c)` as a *base* fact is rejected. -/
theorem base_claim_rejected :
    valid prog facts [⟨none, ⟨RelPath, [AtA, AtC]⟩, []⟩] = false := by
  decide

/-- A rule node whose premise index points forwards is rejected. -/
theorem forward_reference_rejected :
    valid prog facts [⟨some (rBase, [("x", AtA), ("y", AtB)]), ⟨RelPath, [AtA, AtB]⟩, [1]⟩,
      ⟨none, ⟨RelEdge, [AtA, AtB]⟩, []⟩] = false := by
  decide

/-- A rule node whose substitution does not match the premise conclusion is
    rejected. -/
theorem mismatched_premise_rejected :
    valid prog facts
      [⟨none, ⟨RelEdge, [AtB, AtC]⟩, []⟩,
       ⟨some (rBase, [("x", AtA), ("y", AtB)]), ⟨RelPath, [AtA, AtB]⟩, [0]⟩] = false := by
  decide

/-- The seed tuples of the example are distinct, so `reach` decides
    derivability exactly. -/
theorem facts_nodup : (seed facts).Nodup := by
  decide

/-- Decidability in action: `path(a,c)` derivability is decidable. -/
def path_ac_decidable : Decidable (Derivable prog facts ⟨RelPath, [AtA, AtC]⟩) :=
  derivable_decidable facts_nodup ⟨RelPath, [AtA, AtC]⟩

/-- The decision procedure applied to `path(a,c)` reduces to a proof of
    derivability — it answers `isTrue`. -/
theorem path_ac_isTrue : Derivable prog facts ⟨RelPath, [AtA, AtC]⟩ := path_ac_derivable

end Witness

end Algal.Memory
