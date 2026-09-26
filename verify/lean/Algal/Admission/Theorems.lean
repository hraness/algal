import Algal.Admission.Model

set_option autoImplicit false

namespace Algal.Admission

open Algal.Memory

/-! # Assembled theorems — memory admission authority

This file collects the admission-boundary statements of `Model.lean` as
top-level theorems and exercises them on a concrete context: the Phase-11
two-rule transitive-closure derivation (`path(a,c)` from `edge(a,b)` and
`edge(b,c)`) admitted under a named host and engine. Every witness verdict
is produced by the kernel (`decide`); the generic theorems carry the
obligations. -/

/-- **Admission binds the identity tuple**: a claim cannot be admitted under
    two different contexts — the recorded `(snapshot, rules, host, engine)`
    is the unique admitting authority. -/
theorem admission_identity_exact {H E : Type} [DecidableEq H] [DecidableEq E]
    {ctx ctx' : Ctx H E} {c : Claim H E}
    (h : admit ctx c = true) (h' : admit ctx' c = true) : ctx' = ctx :=
  admit_context_unique h h'

/-- **Changed component rejects**: re-admission under a context differing in
    any bound component fails. -/
theorem admission_component_change_rejects {H E : Type} [DecidableEq H] [DecidableEq E]
    {ctx ctx' : Ctx H E} {c : Claim H E}
    (h : admit ctx c = true)
    (hdiff : ctx'.snapshot ≠ ctx.snapshot ∨ ctx'.rules ≠ ctx.rules ∨
             ctx'.host ≠ ctx.host ∨ ctx'.engine ≠ ctx.engine) :
    admit ctx' c = false :=
  admit_component_change_rejects h hdiff

/-- **Authority non-transfer**: a claim carrying host/engine authority is
    rejected under a different host or engine identity. -/
theorem admission_authority_nontransfer {H E : Type} [DecidableEq H] [DecidableEq E]
    {ctx ctx' : Ctx H E} {c : Claim H E}
    (h : admit ctx c = true)
    (hdiff : ctx'.host ≠ ctx.host ∨ ctx'.engine ≠ ctx.engine) :
    admit ctx' c = false :=
  admit_component_change_rejects h (hdiff.elim
    (fun hh => Or.inr (Or.inr (Or.inl hh)))
    (fun he => Or.inr (Or.inr (Or.inr he))))

/-- **Frontier monotonicity**: extending the fact frontier grows
    derivability. -/
theorem admission_frontier_mono {rs : List Rule} {fs fs' : List Fact}
    (hsub : fs ⊆ fs') {t : Tuple} (hd : Derivable rs fs t) :
    Derivable rs fs' t :=
  derivable_mono_facts hsub hd

/-- **Extension re-admits**: the same derivation re-checked against an
    enlarged snapshot stays valid, so the re-bound claim admits. -/
theorem admission_extends {H E : Type} [DecidableEq H] [DecidableEq E] {ctx : Ctx H E}
    {c : Claim H E} {fs' : List Fact}
    (h : admit ctx c = true) (hsub : c.binds.snapshot ⊆ fs') :
    admit {ctx with snapshot := fs'}
      {c with binds := {c.binds with snapshot := fs'}} = true :=
  admit_extends h hsub

/-- **Retraction fails closed**: losing a base row the recorded derivation
    used rejects the re-bound claim. -/
theorem admission_stale_rejects {H E : Type} [DecidableEq H] [DecidableEq E]
    {ctx : Ctx H E} {c : Claim H E} {fs' : List Fact} {d : DerivNode}
    (h : admit ctx c = true) (hd : d ∈ c.derivation)
    (hb : d.rule = none) (hlost : d.conclusion ∉ seed fs') :
    admit {ctx with snapshot := fs'}
      {c with binds := {c.binds with snapshot := fs'}} = false :=
  admit_stale_rejects h hd hb hlost

/-- **Exact-parent binding**: an admitted rule node's premise list resolves
    each body literal positionally to an earlier node's conclusion. -/
theorem admission_parents_exact {H E : Type} [DecidableEq H] [DecidableEq E]
    {ctx : Ctx H E} {c : Claim H E} (h : admit ctx c = true)
    {i : Nat} {d : DerivNode} (hi : c.derivation[i]? = some d)
    {r : Rule} {σ : Subst} (hr : d.rule = some (r, σ)) :
    d.premises.length = r.body.length ∧
    ∀ {k : Nat} {l : Literal} {j : Nat},
      r.body[k]? = some l → d.premises[k]? = some j →
      ∃ dj, c.derivation[j]? = some dj ∧ j < i ∧ instLit σ l = some dj.conclusion :=
  admitted_parents_exact h hi hr

/-- **Premise edit rejects**: replacing a node's recorded premises by a list
    failing the positional check rejects the claim carrying the edited
    derivation. -/
theorem admission_premise_edit_rejects {H E : Type} [DecidableEq H] [DecidableEq E]
    {ctx : Ctx H E} {c : Claim H E} {i : Nat} {d : DerivNode}
    {r : Rule} {σ : Subst} {js' : List Nat}
    (hi : c.derivation[i]? = some d) (hr : d.rule = some (r, σ))
    (hlt : i < c.derivation.length)
    (hbad : premisesOK σ (c.derivation.set i {d with premises := js'}) i r.body js' = false) :
    admit ctx {c with derivation := c.derivation.set i {d with premises := js'}} = false :=
  admit_rejects_premise_edit hi hr hlt hbad

/-- **Admitted answers are derivable**: the gate only admits conclusions the
    Phase-11 semantics derives. -/
theorem admission_sound {H E : Type} [DecidableEq H] [DecidableEq E] {ctx : Ctx H E}
    {c : Claim H E} (h : admit ctx c = true) :
    Derivable c.binds.rules c.binds.snapshot c.answer :=
  admit_sound h

/-! ## Concrete witness

Facts `edge(a,b)`, `edge(b,c)`; rules `path(x,y) :- edge(x,y)` and
`path(x,z) :- edge(x,y), path(y,z)`; the same five-node derivation graph as
the Phase-11 witness, admitted under host `host-α` and engine `engine-1`
with answer `path(a,c)` at step 4. -/

section Witness

def wA : Atom := .text "a"
def wB : Atom := .text "b"
def wC : Atom := .text "c"
def wD : Atom := .text "d"
def relE : Relation := "edge"
def relP : Relation := "path"

def wFAB : Fact := ⟨⟨relE, [wA, wB]⟩, ["obs-1"]⟩
def wFBC : Fact := ⟨⟨relE, [wB, wC]⟩, ["obs-2"]⟩
def wFCD : Fact := ⟨⟨relE, [wC, wD]⟩, ["obs-3"]⟩

def wRBase : Rule :=
  ⟨"r-base", ⟨relP, [.var "x", .var "y"]⟩, [⟨relE, [.var "x", .var "y"]⟩]⟩
def wRStep : Rule :=
  ⟨"r-step", ⟨relP, [.var "x", .var "z"]⟩,
    [⟨relE, [.var "x", .var "y"]⟩, ⟨relP, [.var "y", .var "z"]⟩]⟩

def wRules : List Rule := [wRBase, wRStep]
def wSnap : List Fact := [wFAB, wFBC]

/-- The five-node derivation graph: two base nodes, two direct paths, and
    the transitive step concluding `path(a,c)`. -/
def wD0 : DerivNode := ⟨none, ⟨relE, [wA, wB]⟩, []⟩
def wD1 : DerivNode := ⟨none, ⟨relE, [wB, wC]⟩, []⟩
def wD2 : DerivNode := ⟨some (wRBase, [("x", wA), ("y", wB)]), ⟨relP, [wA, wB]⟩, [0]⟩
def wD3 : DerivNode := ⟨some (wRBase, [("x", wB), ("y", wC)]), ⟨relP, [wB, wC]⟩, [1]⟩
def wD4 : DerivNode := ⟨some (wRStep, [("x", wA), ("y", wB), ("z", wC)]),
  ⟨relP, [wA, wC]⟩, [0, 3]⟩

def wGraph : List DerivNode := [wD0, wD1, wD2, wD3, wD4]

def wCtx : Ctx String String := ⟨wSnap, wRules, "host-α", "engine-1"⟩
def wBinds : Ctx String String := ⟨wSnap, wRules, "host-α", "engine-1"⟩
def wClaim : Claim String String := ⟨wBinds, wGraph, ⟨relP, [wA, wC]⟩, 4⟩

/-- The baseline claim admits: identity tuple matches, rules safe,
    derivation valid, witness step concludes `path(a,c)`. -/
theorem admit_baseline : admit wCtx wClaim = true := by decide

/-- The admitted answer is derivable. -/
theorem admitted_answer_derivable :
    Derivable wClaim.binds.rules wClaim.binds.snapshot wClaim.answer :=
  admit_sound admit_baseline

/-- The same claim under a different snapshot rejects: the recorded
    identity binds `wSnap`, not any frontier with the same derivable set. -/
theorem admit_other_snapshot_rejects :
    admit ⟨wSnap ++ [wFCD], wRules, "host-α", "engine-1"⟩ wClaim = false := by
  decide

/-- The same claim under a different rule set rejects. -/
theorem admit_other_rules_rejects :
    admit ⟨wSnap, [wRBase], "host-α", "engine-1"⟩ wClaim = false := by decide

/-- **Authority non-transfer, host**: the claim admitted under `host-α` is
    rejected under `host-β`. -/
theorem admit_other_host_rejects :
    admit ⟨wSnap, wRules, "host-β", "engine-1"⟩ wClaim = false := by decide

/-- **Authority non-transfer, engine**: the claim admitted under `engine-1`
    is rejected under `engine-2`. -/
theorem admit_other_engine_rejects :
    admit ⟨wSnap, wRules, "host-α", "engine-2"⟩ wClaim = false := by decide

/-- **Frontier extension re-admits**: the re-bound claim under the enlarged
    snapshot `wSnap ++ [wFCD]` is accepted — the derivation never cited the
    extra row, and `valid` consults only seed membership. -/
theorem admit_extended_snapshot :
    admit ⟨wSnap ++ [wFCD], wRules, "host-α", "engine-1"⟩
      {wClaim with binds := {wBinds with snapshot := wSnap ++ [wFCD]}} = true := by
  decide

/-- **Retraction fails closed**: under the reduced snapshot `[wFAB]` the
    base node `wD1` (`edge(b,c)`) has no seed membership, so the re-bound
    claim rejects even though the answer's other support is intact. -/
theorem admit_stale_snapshot_rejects :
    admit ⟨[wFAB], wRules, "host-α", "engine-1"⟩
      {wClaim with binds := {wBinds with snapshot := [wFAB]}} = false := by
  decide

/-- **Permuted premises reject**: `wD4` with premises `[3, 0]` instead of
    `[0, 3]` keeps the conclusion `path(a,c)` but fails the positional check
    — position 0 must instantiate `edge(x,y)`, while node 3 concludes
    `path(b,c)`. -/
def wD4perm : DerivNode := ⟨some (wRStep, [("x", wA), ("y", wB), ("z", wC)]),
  ⟨relP, [wA, wC]⟩, [3, 0]⟩

theorem admit_permuted_premises_reject :
    admit wCtx {wClaim with derivation := [wD0, wD1, wD2, wD3, wD4perm]} = false := by
  decide

/-- **Substituted premises reject**: `wD4` with premise `[0, 2]` — node 2
    concludes `path(a,b)`, not the `path(b,c)` the second body literal
    needs. -/
def wD4sub : DerivNode := ⟨some (wRStep, [("x", wA), ("y", wB), ("z", wC)]),
  ⟨relP, [wA, wC]⟩, [0, 2]⟩

theorem admit_substituted_premise_rejects :
    admit wCtx {wClaim with derivation := [wD0, wD1, wD2, wD3, wD4sub]} = false := by
  decide

/-- **Forward parent rejects**: a step's premise index must point strictly
    backwards; node 2 citing index 5 (a duplicate `edge(a,b)` base node with
    the needed conclusion) still rejects on `j < i`. -/
def wD2fwd : DerivNode := ⟨some (wRBase, [("x", wA), ("y", wB)]), ⟨relP, [wA, wB]⟩, [5]⟩
def wD5dup : DerivNode := ⟨none, ⟨relE, [wA, wB]⟩, []⟩

theorem admit_forward_parent_rejects :
    admit wCtx
      {wClaim with derivation := [wD0, wD1, wD2fwd, wD3, wD4, wD5dup]} = false := by
  decide

/-- **Unrecorded witness step rejects**: the answer must be concluded by the
    recorded step index — citing index 3 (`path(b,c)`) for answer
    `path(a,c)` rejects. -/
theorem admit_wrong_witness_rejects :
    admit wCtx {wClaim with witness := 3} = false := by decide

/-- **Out-of-range witness rejects**. -/
theorem admit_oob_witness_rejects :
    admit wCtx {wClaim with witness := 9} = false := by decide

/-- **Unsafe program rejects at admission**: a rule with an unbound head
    variable carries no admitted answers. -/
def wRUnsafe : Rule := ⟨"r-bad", ⟨relP, [.var "x", .var "z"]⟩, [⟨relE, [.var "x", .var "y"]⟩]⟩

theorem admit_unsafe_program_rejects :
    admit ⟨wSnap, [wRUnsafe], "host-α", "engine-1"⟩
      ⟨⟨wSnap, [wRUnsafe], "host-α", "engine-1"⟩, wGraph, ⟨relP, [wA, wC]⟩, 4⟩ = false := by
  decide

/-- An empty derivation admits nothing: the answer must be produced by a
    recorded step. -/
theorem admit_empty_derivation_rejects :
    admit wCtx {wClaim with derivation := []} = false := by decide

/-- The admitted-answer binding is pinned at the primitive level too: the
    witness claim admits under its own context and rejects under a changed
    host, matching `admission_authority_nontransfer`. -/
theorem admit_witness_nontransfer :
    admit wCtx wClaim = true ∧
    admit ⟨wSnap, wRules, "host-β", "engine-1"⟩ wClaim = false ∧
    admit ⟨wSnap, wRules, "host-α", "engine-2"⟩ wClaim = false := by
  decide

end Witness

end Algal.Admission
