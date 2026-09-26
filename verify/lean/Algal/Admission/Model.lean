import Algal.Memory.Datalog

/-!
Admission authority for memory evidence — semantic model.

Phase 15 of `docs/formal-verification-plan.md` (the `lean-admission` leg):
the boundary that turns a checked derivation into an admitted answer. The
model composes with the Phase-11 memory model (`Algal.Memory.Datalog`):

- `Ctx` — the authority tuple an answer is admitted under: the selected fact
  snapshot, the admitted rule set, and the opaque admission host and engine
  identities `H`/`E` (any types with decidable equality; the model does not
  fix their representation).
- `Claim` — an admitted-answer record: the identity tuple it binds
  (`binds`), the full recorded derivation graph, the answer tuple, and the
  index of the step concluding it (`witness`).
- `admit` — the executable gate. It requires: the recorded identity tuple to
  equal the admitting context exactly; the rule set to be range-restricted
  (`progSafe`, mirroring program admission); the whole recorded derivation
  to pass the Phase-11 checker (`valid`); and the recorded witness step to
  conclude the claimed answer.

The theorems establish the Phase-15 admission obligations at model level:

- `admit_binds_identity`, `admit_context_unique`,
  `admit_component_change_rejects` — admission binds the identity tuple, not
  merely the derived fact: re-admission under a context that differs in any
  bound component rejects.
- `derivable_mono_facts`, `valid_mono_facts`, `admit_extends` — extending
  the fact frontier monotonically grows derivability and preserves the
  validity of a recorded derivation, so the re-bound claim admits.
- `admit_stale_rejects`, `admit_lost_premise_row_rejects` — retraction fails
  closed: no admitted answer survives the loss of a premise row its recorded
  derivation used.
- `admit_host_changed_rejects`, `admit_engine_changed_rejects` — host and
  engine authority do not transfer across a changed identity.
- `admitted_parents_exact`, `admit_rejects_premise_edit` — validity binds
  the recorded parent/step indices positionally; an edited premise list that
  no longer resolves its body literals rejects the claim.

Nothing here claims that a production host or checker refines this model;
the executable-level correspondence is sampled by `verify/admission`.

No `sorry`, no custom axioms, no `native_decide`; all executable content is
kernel-reducible (`decide` and `simp`-level computation only).
-/

set_option autoImplicit false

namespace Algal.Admission

open Algal.Memory

/-- The authority tuple an answer is admitted under. `host` and `engine` are
    the identities of the admission host and the executing engine; they are
    bound exactly and never interpreted. -/
structure Ctx (H E : Type) where
  snapshot : List Fact
  rules : List Rule
  host : H
  engine : E

/-- An admitted-answer record: the exact context tuple it binds, the full
    recorded derivation, the answer tuple, and the index of the step that
    concludes it. -/
structure Claim (H E : Type) where
  binds : Ctx H E
  derivation : List DerivNode
  answer : Tuple
  witness : Nat

/-- Range restriction as a Bool gate, mirroring program admission: every
    head variable occurs in the body. -/
def progSafe (rs : List Rule) : Bool :=
  rs.all fun r => (litVars r.head).all fun v => (bodyVars r).contains v

/-- The Bool safety gate is exactly `AllSafe`. -/
theorem progSafe_spec (rs : List Rule) : progSafe rs = true ↔ AllSafe rs := by
  simp only [progSafe, AllSafe, Safe, List.all_eq_true, List.contains_iff_mem]

/-- The admission check: the claim's recorded identity must equal the
    context componentwise; the rule set must be safe; the whole recorded
    derivation must be valid under the claim's own snapshot; and the
    recorded witness step must conclude the answer. -/
def admit {H E : Type} [DecidableEq H] [DecidableEq E] (ctx : Ctx H E) (c : Claim H E) : Bool :=
  decide (c.binds.snapshot = ctx.snapshot) &&
  decide (c.binds.rules = ctx.rules) &&
  decide (c.binds.host = ctx.host) &&
  decide (c.binds.engine = ctx.engine) &&
  progSafe c.binds.rules &&
  valid c.binds.rules c.binds.snapshot c.derivation &&
  (match c.derivation[c.witness]? with
   | some d => decide (d.conclusion = c.answer)
   | none => false)

/-- Elimination form of `admit`: every admitted claim decomposes into the
    identity binding, the safety fact, the validity verdict, and the
    concluding witness step. -/
theorem admit_spec {H E : Type} [DecidableEq H] [DecidableEq E] {ctx : Ctx H E} {c : Claim H E}
    (h : admit ctx c = true) :
    c.binds.snapshot = ctx.snapshot ∧ c.binds.rules = ctx.rules ∧
    c.binds.host = ctx.host ∧ c.binds.engine = ctx.engine ∧
    AllSafe c.binds.rules ∧
    valid c.binds.rules c.binds.snapshot c.derivation = true ∧
    ∃ d, c.derivation[c.witness]? = some d ∧ d.conclusion = c.answer := by
  simp only [admit, Bool.and_eq_true, decide_eq_true_eq] at h
  obtain ⟨⟨⟨⟨⟨⟨hss, hrs⟩, hh⟩, he⟩, hsafe⟩, hv⟩, hwit⟩ := h
  cases hw : c.derivation[c.witness]? with
  | none => rw [hw] at hwit; simp at hwit
  | some d =>
    rw [hw] at hwit
    exact ⟨hss, hrs, hh, he, (progSafe_spec _).mp hsafe, hv,
      ⟨d, rfl, of_decide_eq_true hwit⟩⟩

/-- Introduction form of `admit`: the seven obligations are also
    sufficient. -/
theorem admit_intro {H E : Type} [DecidableEq H] [DecidableEq E] {ctx : Ctx H E} {c : Claim H E}
    (hss : c.binds.snapshot = ctx.snapshot) (hrs : c.binds.rules = ctx.rules)
    (hh : c.binds.host = ctx.host) (he : c.binds.engine = ctx.engine)
    (hsafe : AllSafe c.binds.rules)
    (hv : valid c.binds.rules c.binds.snapshot c.derivation = true)
    (hwd : ∃ d, c.derivation[c.witness]? = some d ∧ d.conclusion = c.answer) :
    admit ctx c = true := by
  obtain ⟨d, hmem, hconc⟩ := hwd
  simp only [admit, Bool.and_eq_true, decide_eq_true_eq]
  exact ⟨⟨⟨⟨⟨⟨hss, hrs⟩, hh⟩, he⟩, (progSafe_spec _).mpr hsafe⟩, hv⟩,
    by rw [hmem]; exact decide_eq_true hconc⟩

/-- Context equality is componentwise. -/
theorem Ctx.eq_of_fields {H E : Type} {a b : Ctx H E}
    (hs : a.snapshot = b.snapshot) (hr : a.rules = b.rules)
    (hh : a.host = b.host) (he : a.engine = b.engine) : a = b := by
  cases a; cases b; simp_all

/-- Admission binds the identity tuple: the recorded context is the
    admitting context. -/
theorem admit_binds_identity {H E : Type} [DecidableEq H] [DecidableEq E] {ctx : Ctx H E}
    {c : Claim H E} (h : admit ctx c = true) : c.binds = ctx := by
  obtain ⟨hss, hrs, hh, he, _⟩ := admit_spec h
  exact Ctx.eq_of_fields hss hrs hh he

/-- A claim admits under at most one context: the bound identity is
    unique. Equivalently, admission binds the tuple `(snapshot, rules, host,
    engine)`, not merely the derived fact. -/
theorem admit_context_unique {H E : Type} [DecidableEq H] [DecidableEq E] {ctx ctx' : Ctx H E}
    {c : Claim H E} (h : admit ctx c = true) (h' : admit ctx' c = true) :
    ctx' = ctx :=
  (admit_binds_identity h').symm.trans (admit_binds_identity h)

/-- Every admitted answer is derivable: `admit` lifts `valid_sound` through
    the gate, with safety discharged by `progSafe`. -/
theorem admit_sound {H E : Type} [DecidableEq H] [DecidableEq E] {ctx : Ctx H E} {c : Claim H E}
    (h : admit ctx c = true) : Derivable c.binds.rules c.binds.snapshot c.answer := by
  obtain ⟨_, _, _, _, hsafe, hv, d, hw, hconc⟩ := admit_spec h
  rw [← hconc]
  exact valid_sound hsafe hv (List.mem_of_getElem? hw)

/-! ### Identity binding: per-component rejection

Each of the four bound components is checked separately; a mismatch on any
one of them rejects the whole claim. -/

theorem admit_wrong_snapshot_rejects {H E : Type} [DecidableEq H] [DecidableEq E]
    {ctx : Ctx H E} {c : Claim H E} (hne : c.binds.snapshot ≠ ctx.snapshot) :
    admit ctx c = false := by
  have hd : decide (c.binds.snapshot = ctx.snapshot) = false := decide_eq_false hne
  simp [admit, hd]

theorem admit_wrong_rules_rejects {H E : Type} [DecidableEq H] [DecidableEq E]
    {ctx : Ctx H E} {c : Claim H E} (hne : c.binds.rules ≠ ctx.rules) :
    admit ctx c = false := by
  have hd : decide (c.binds.rules = ctx.rules) = false := decide_eq_false hne
  simp [admit, hd]

theorem admit_wrong_host_rejects {H E : Type} [DecidableEq H] [DecidableEq E]
    {ctx : Ctx H E} {c : Claim H E} (hne : c.binds.host ≠ ctx.host) :
    admit ctx c = false := by
  have hd : decide (c.binds.host = ctx.host) = false := decide_eq_false hne
  simp [admit, hd]

theorem admit_wrong_engine_rejects {H E : Type} [DecidableEq H] [DecidableEq E]
    {ctx : Ctx H E} {c : Claim H E} (hne : c.binds.engine ≠ ctx.engine) :
    admit ctx c = false := by
  have hd : decide (c.binds.engine = ctx.engine) = false := decide_eq_false hne
  simp [admit, hd]

/-- **Admission authority is exact**: an answer admitted under
    `(snapshot, rules, host, engine)` cannot be re-admitted when any bound
    component differs. -/
theorem admit_component_change_rejects {H E : Type} [DecidableEq H] [DecidableEq E]
    {ctx ctx' : Ctx H E} {c : Claim H E}
    (h : admit ctx c = true)
    (hdiff : ctx'.snapshot ≠ ctx.snapshot ∨ ctx'.rules ≠ ctx.rules ∨
             ctx'.host ≠ ctx.host ∨ ctx'.engine ≠ ctx.engine) :
    admit ctx' c = false := by
  obtain ⟨hss, hrs, hh, he, _⟩ := admit_spec h
  rcases hdiff with h1 | h2 | h3 | h4
  · exact admit_wrong_snapshot_rejects fun hc => h1 (hc.symm.trans hss)
  · exact admit_wrong_rules_rejects fun hc => h2 (hc.symm.trans hrs)
  · exact admit_wrong_host_rejects fun hc => h3 (hc.symm.trans hh)
  · exact admit_wrong_engine_rejects fun hc => h4 (hc.symm.trans he)

/-- **Authority non-transfer — host**: a claim admitted under one host is
    rejected under a different host identity. -/
theorem admit_host_changed_rejects {H E : Type} [DecidableEq H] [DecidableEq E]
    {ctx ctx' : Ctx H E} {c : Claim H E}
    (h : admit ctx c = true) (hne : ctx'.host ≠ ctx.host) :
    admit ctx' c = false :=
  admit_component_change_rejects h (Or.inr (Or.inr (Or.inl hne)))

/-- **Authority non-transfer — engine**: a claim admitted under one engine
    is rejected under a different engine identity. -/
theorem admit_engine_changed_rejects {H E : Type} [DecidableEq H] [DecidableEq E]
    {ctx ctx' : Ctx H E} {c : Claim H E}
    (h : admit ctx c = true) (hne : ctx'.engine ≠ ctx.engine) :
    admit ctx' c = false :=
  admit_component_change_rejects h (Or.inr (Or.inr (Or.inr hne)))

/-- Re-admission under a changed snapshot rejects. -/
theorem admit_snapshot_changed_rejects {H E : Type} [DecidableEq H] [DecidableEq E]
    {ctx ctx' : Ctx H E} {c : Claim H E}
    (h : admit ctx c = true) (hne : ctx'.snapshot ≠ ctx.snapshot) :
    admit ctx' c = false :=
  admit_component_change_rejects h (Or.inl hne)

/-- Re-admission under a changed rule set rejects. -/
theorem admit_rules_changed_rejects {H E : Type} [DecidableEq H] [DecidableEq E]
    {ctx ctx' : Ctx H E} {c : Claim H E}
    (h : admit ctx c = true) (hne : ctx'.rules ≠ ctx.rules) :
    admit ctx' c = false :=
  admit_component_change_rejects h (Or.inr (Or.inl hne))

/-! ### Frontier monotonicity

Extending the fact frontier grows `Derivable` and preserves `valid`: the
checker consults the snapshot only through `seed` membership of base
nodes. -/

/-- `seed` is monotone in the fact list. -/
theorem seed_mono {fs fs' : List Fact} (h : fs ⊆ fs') : seed fs ⊆ seed fs' := by
  intro t ht
  obtain ⟨f, hf, hft⟩ := mem_seed ht
  exact List.mem_map.mpr ⟨f, h hf, hft⟩

/-- The bounded iterator is monotone in the fact list. -/
theorem iter_mono_facts {rs : List Rule} {fs fs' : List Fact} (h : fs ⊆ fs') :
    ∀ n t, t ∈ iter rs fs n → t ∈ iter rs fs' n := by
  intro n
  induction n with
  | zero => exact fun t ht => seed_mono h ht
  | succ n ih => intro t ht; exact round_mono ih t ht

/-- **Frontier monotonicity (derivability)**: extending the fact frontier
    grows the derivable set. -/
theorem derivable_mono_facts {rs : List Rule} {fs fs' : List Fact} (h : fs ⊆ fs')
    {t : Tuple} (hd : Derivable rs fs t) : Derivable rs fs' t := by
  obtain ⟨n, hn⟩ := hd
  exact ⟨n, iter_mono_facts h n t hn⟩

/-- Single-node validity is monotone in the snapshot: base nodes keep their
    seed membership, rule nodes do not consult it. -/
theorem nodeValid_mono {rs : List Rule} {fs fs' : List Fact} (hsub : fs ⊆ fs')
    {ds : List DerivNode} {i : Nat} {d : DerivNode}
    (h : nodeValid rs fs ds i d = true) : nodeValid rs fs' ds i d = true := by
  cases hdr : d.rule with
  | none =>
    simp only [nodeValid, hdr, decide_eq_true_eq] at h
    simp only [nodeValid, hdr, decide_eq_true_eq]
    exact ⟨h.1, seed_mono hsub h.2⟩
  | some p =>
    simp only [nodeValid, hdr] at h ⊢
    exact h

/-- `validFrom` is monotone in the snapshot. -/
theorem validFrom_mono {rs : List Rule} {fs fs' : List Fact} (hsub : fs ⊆ fs')
    {ds : List DerivNode} :
    ∀ {i} {cur : List DerivNode}, validFrom rs fs ds i cur = true →
      validFrom rs fs' ds i cur = true := by
  intro i cur
  induction cur generalizing i with
  | nil => intro h; exact h
  | cons d rest ih =>
    intro h
    simp only [validFrom, Bool.and_eq_true] at h ⊢
    exact ⟨nodeValid_mono hsub h.1, ih h.2⟩

/-- **Frontier monotonicity (checker)**: a derivation valid under a snapshot
    stays valid under an enlarged one. -/
theorem valid_mono_facts {rs : List Rule} {fs fs' : List Fact} (hsub : fs ⊆ fs')
    {ds : List DerivNode} (h : valid rs fs ds = true) : valid rs fs' ds = true :=
  validFrom_mono hsub h

/-- **Frontier monotonicity (admission)**: re-binding an admitted claim to
    an enlarged snapshot — and re-admitting under the matching context —
    accepts. The identity tuple changes on both sides together; the
    recorded derivation and answer carry over. -/
theorem admit_extends {H E : Type} [DecidableEq H] [DecidableEq E] {ctx : Ctx H E} {c : Claim H E}
    {fs' : List Fact} (h : admit ctx c = true) (hsub : c.binds.snapshot ⊆ fs') :
    admit {ctx with snapshot := fs'}
      {c with binds := {c.binds with snapshot := fs'}} = true := by
  obtain ⟨_, hrs, hh, he, hsafe, hv, d, hwd, hconc⟩ := admit_spec h
  exact admit_intro rfl hrs hh he hsafe (valid_mono_facts hsub hv) ⟨d, hwd, hconc⟩

/-! ### Stale frontiers fail closed

`valid` requires *every* recorded node — so a claim whose recorded
derivation uses a retracted base row cannot re-admit. -/

/-- One invalid member node kills whole-graph validity — the contrapositive
    of `validFrom_at`. -/
theorem valid_false_of_nodeInvalid {rs : List Rule} {fs : List Fact}
    {ds : List DerivNode} {i : Nat} {d : DerivNode}
    (hi : ds[i]? = some d) (hn : nodeValid rs fs ds i d = false) :
    valid rs fs ds = false := by
  cases hv : valid rs fs ds with
  | false => rfl
  | true =>
    have hnv : nodeValid rs fs ds i d = true := by
      have h' := validFrom_at hv hi
      rwa [Nat.zero_add] at h'
    rw [hnv] at hn
    cases hn

/-- Any claim whose recorded derivation contains an invalid node is
    rejected, whatever the context. -/
theorem admit_rejects_of_invalid_node {H E : Type} [DecidableEq H] [DecidableEq E]
    {ctx : Ctx H E} {c : Claim H E} {i : Nat} {d : DerivNode}
    (hi : c.derivation[i]? = some d)
    (hn : nodeValid c.binds.rules c.binds.snapshot c.derivation i d = false) :
    admit ctx c = false := by
  have hv : valid c.binds.rules c.binds.snapshot c.derivation = false :=
    valid_false_of_nodeInvalid hi hn
  simp [admit, hv]

/-- A claim whose recorded derivation contains a base node (`rule = none`)
    whose conclusion has left the seed is rejected, whatever the context:
    base nodes are the frontier premises a derivation rests on. -/
theorem admit_rejects_of_stale_premise {H E : Type} [DecidableEq H] [DecidableEq E]
    {ctx : Ctx H E} {c : Claim H E} {d : DerivNode}
    (hd : d ∈ c.derivation) (hb : d.rule = none)
    (hlost : d.conclusion ∉ seed c.binds.snapshot) : admit ctx c = false := by
  obtain ⟨i, hi⟩ := mem_getElem hd
  have hnv : nodeValid c.binds.rules c.binds.snapshot c.derivation i d = false := by
    have hd' : decide (d.premises = [] ∧ d.conclusion ∈ seed c.binds.snapshot) = false := by
      cases hq : decide (d.premises = [] ∧ d.conclusion ∈ seed c.binds.snapshot) with
      | false => rfl
      | true => exact absurd (of_decide_eq_true hq).2 hlost
    simp only [nodeValid, hb, hd']
  exact admit_rejects_of_invalid_node hi hnv

/-- **Fails closed on a stale snapshot**: an answer admitted under `ctx` has
    no continuation under a frontier that lost a base row its recorded
    derivation used — the re-bound claim rejects. -/
theorem admit_stale_rejects {H E : Type} [DecidableEq H] [DecidableEq E] {ctx : Ctx H E}
    {c : Claim H E} {fs' : List Fact} {d : DerivNode}
    (_h : admit ctx c = true) (hd : d ∈ c.derivation)
    (hb : d.rule = none) (hlost : d.conclusion ∉ seed fs') :
    admit {ctx with snapshot := fs'}
      {c with binds := {c.binds with snapshot := fs'}} = false :=
  admit_rejects_of_stale_premise hd hb hlost

/-- The frontier rows a recorded derivation rests on: the conclusions of its
    base (`none`-rule) nodes. -/
def usedPremises (ds : List DerivNode) : List Tuple :=
  ds.filterMap fun d => match d.rule with | none => some d.conclusion | some _ => none

theorem mem_usedPremises {ds : List DerivNode} {t : Tuple} :
    t ∈ usedPremises ds ↔ ∃ d ∈ ds, d.rule = none ∧ d.conclusion = t := by
  simp only [usedPremises, List.mem_filterMap]
  constructor
  · rintro ⟨d, hd, hm⟩
    cases hdr : d.rule with
    | none =>
      rw [hdr] at hm
      simp at hm
      exact ⟨d, hd, hdr, hm⟩
    | some p => rw [hdr] at hm; simp at hm
  · rintro ⟨d, hd, hdr, hconcl⟩
    exact ⟨d, hd, by simp [hdr, hconcl]⟩

/-- **Fails closed, used-row form**: no admitted answer survives the loss of
    any premise row its recorded derivation used. -/
theorem admit_lost_premise_row_rejects {H E : Type} [DecidableEq H] [DecidableEq E]
    {ctx : Ctx H E} {c : Claim H E} {t : Tuple}
    (hused : t ∈ usedPremises c.derivation) (hlost : t ∉ seed c.binds.snapshot) :
    admit ctx c = false := by
  obtain ⟨d, hd, hb, hconcl⟩ := mem_usedPremises.mp hused
  exact admit_rejects_of_stale_premise hd hb (hconcl ▸ hlost)

/-! ### Exact-parent binding

A rule node's premise list is checked positionally against the rule body:
index `k` of `premises` must point strictly backwards to a node whose
conclusion instantiates body literal `k`. -/

/-- The premise check forces the premise list to have the body's length. -/
theorem premisesOK_length {σ : Subst} {ds : List DerivNode} {i : Nat} :
    ∀ {ls : List Literal} {js : List Nat},
      premisesOK σ ds i ls js = true → ls.length = js.length := by
  intro ls
  induction ls with
  | nil =>
    intro js h
    cases js with
    | nil => rfl
    | cons _ _ => simp [premisesOK] at h
  | cons l ls' ih =>
    intro js h
    cases js with
    | nil => simp [premisesOK] at h
    | cons j js' =>
      simp only [premisesOK] at h
      cases hdq : ds[j]? with
      | none => rw [hdq] at h; simp at h
      | some dj =>
        rw [hdq] at h
        simp only [Bool.and_eq_true] at h
        obtain ⟨_, hrest⟩ := h
        rw [List.length_cons, List.length_cons, ih hrest]

/-- The premise check is positional and exact: at every position the
    recorded index resolves to an earlier node whose conclusion is the
    instantiated body literal. -/
theorem premisesOK_at {σ : Subst} {ds : List DerivNode} {i : Nat} :
    ∀ {ls : List Literal} {js : List Nat} {k : Nat} {l : Literal} {j : Nat},
      premisesOK σ ds i ls js = true →
      ls[k]? = some l → js[k]? = some j →
      ∃ dj, ds[j]? = some dj ∧ j < i ∧ instLit σ l = some dj.conclusion := by
  intro ls
  induction ls with
  | nil => intro js k l j h hl _hj; cases k <;> simp at hl
  | cons l0 ls' ih =>
    intro js k l j h hl hj
    cases js with
    | nil => cases k <;> simp at hj
    | cons j0 js' =>
      simp only [premisesOK] at h
      cases hdq : ds[j0]? with
      | none => rw [hdq] at h; simp at h
      | some dj0 =>
        rw [hdq] at h
        simp only [Bool.and_eq_true, decide_eq_true_eq] at h
        obtain ⟨⟨hinst, hji⟩, hrest⟩ := h
        cases k with
        | zero =>
          rw [List.getElem?_cons_zero] at hl hj
          have hl0 : l0 = l := Option.some.inj hl
          have hj0 : j0 = j := Option.some.inj hj
          subst hj0
          subst hl0
          exact ⟨dj0, hdq, hji, hinst⟩
        | succ k' => exact ih hrest hl hj

/-- **Exact-parent binding (admitted direction)**: every rule node of an
    admitted derivation has a premise list of the body's length, whose
    `k`-th entry points strictly earlier to a node concluding the
    instantiated `k`-th body literal. -/
theorem admitted_parents_exact {H E : Type} [DecidableEq H] [DecidableEq E] {ctx : Ctx H E}
    {c : Claim H E} (h : admit ctx c = true)
    {i : Nat} {d : DerivNode} (hi : c.derivation[i]? = some d)
    {r : Rule} {σ : Subst} (hr : d.rule = some (r, σ)) :
    d.premises.length = r.body.length ∧
    ∀ {k : Nat} {l : Literal} {j : Nat},
      r.body[k]? = some l → d.premises[k]? = some j →
      ∃ dj, c.derivation[j]? = some dj ∧ j < i ∧ instLit σ l = some dj.conclusion := by
  obtain ⟨_, _, _, _, _, hv, _⟩ := admit_spec h
  have hnv : nodeValid c.binds.rules c.binds.snapshot c.derivation i d = true := by
    have h' := validFrom_at hv hi
    rwa [Nat.zero_add] at h'
  simp only [nodeValid, hr, Bool.and_eq_true, decide_eq_true_eq] at hnv
  obtain ⟨⟨_, _⟩, hpok⟩ := hnv
  refine ⟨(premisesOK_length hpok).symm, ?_⟩
  intro k l j hl hj
  exact premisesOK_at hpok hl hj

/-- A failed positional premise check invalidates the node. -/
theorem nodeValid_false_of_premisesOK {rs : List Rule} {fs : List Fact}
    {ds : List DerivNode} {i : Nat} {d : DerivNode} {r : Rule} {σ : Subst}
    (hr : d.rule = some (r, σ))
    (hbad : premisesOK σ ds i r.body d.premises = false) :
    nodeValid rs fs ds i d = false := by
  simp only [nodeValid, hr]
  rw [hbad]
  simp

/-- **Exact-parent binding (rejection direction)**: substituting the
    recorded premise list of a derivation node by one that fails the
    positional check rejects the whole claim — a permuted or substituted
    parent cannot keep the node's conclusion admitted. -/
theorem admit_rejects_premise_edit {H E : Type} [DecidableEq H] [DecidableEq E]
    {ctx : Ctx H E} {c : Claim H E} {i : Nat} {d : DerivNode}
    {r : Rule} {σ : Subst} {js' : List Nat}
    (_hi : c.derivation[i]? = some d) (hr : d.rule = some (r, σ))
    (hlt : i < c.derivation.length)
    (hbad : premisesOK σ (c.derivation.set i {d with premises := js'}) i r.body js' = false) :
    admit ctx {c with derivation := c.derivation.set i {d with premises := js'}} = false := by
  refine admit_rejects_of_invalid_node (i := i)
    (d := {d with premises := js'}) ?_ ?_
  · exact List.getElem?_set_self hlt
  · have hbad' : premisesOK σ (c.derivation.set i {d with premises := js'}) i
        r.body {d with premises := js'}.premises = false := hbad
    exact nodeValid_false_of_premisesOK (d := {d with premises := js'}) hr hbad'

end Algal.Admission
