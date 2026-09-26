/-!
Finite positive range-restricted Datalog: the semantic model for
`algal.memory.v1` fact snapshots and `algal.query.v1` programs
(`docs/formal-verification-plan.md`, Phase 11).

The model is deliberately independent of the production evaluator. It fixes:

- a finite atom domain (`Atom`) with strict structural equality;
- rules with named heads and positive bodies; `Safe` is range-restriction
  (every head variable occurs in the body);
- substitutions as association lists with an extension order (`Subst.le`)
  and the correctness lemmas connecting matching and instantiation;
- an executable least-fixpoint iterator (`seed`/`round`/`fire`/`joinBody`/
  `insertAll`);
- the declarative derivability relation `Derivable`, shown equivalent to
  membership in the stabilized iteration `reach` — whose bound is the size
  of the finite tuple universe — hence decidable under `AllSafe` and
  `ArityConsistent`;
- derivation trees (`Deriv`) and their validity predicate `Valid`, with
  `valid_sound`: a tree whose premises instantiate its rule body concludes
  inside the fixpoint.

The proof-graph resolution checker lives in `Checker.lean`; the first-witness
construction and assembled release theorems live in `Theorems.lean`. Digest
bindings, JSON encoding, and byte budgets are the reference checker's
concern (`verify/reference/memory`), not this model's.
-/
set_option autoImplicit false

namespace Algal.Memory

/-- Primitive value domain: JSON scalars only. -/
inductive Atom where
  | null
  | bool : Bool → Atom
  | int : Int → Atom
  | text : String → Atom
  deriving DecidableEq, Repr

abbrev Var := String
abbrev Relation := String

inductive Term where
  | atom : Atom → Term
  | var : Var → Term
  deriving DecidableEq, Repr

def Term.atomOf : Term → Option Atom
  | .atom a => some a
  | .var _ => none

structure Literal where
  relation : Relation
  terms : List Term
  deriving DecidableEq, Repr

/-- A ground literal: relation name plus evaluated argument list. -/
structure Tuple where
  relation : Relation
  args : List Atom
  deriving DecidableEq, Repr

structure Fact where
  tuple : Tuple
  sources : List String
  deriving DecidableEq, Repr

/-- The literal that a base fact instantiates. -/
def Fact.lit (f : Fact) : Literal := ⟨f.tuple.relation, f.tuple.args.map Term.atom⟩

structure Rule where
  id : String
  head : Literal
  body : List Literal
  deriving DecidableEq, Repr

/-- Substitutions are association lists; first match wins. -/
abbrev Subst := List (Var × Atom)

def lookup : Subst → Var → Option Atom
  | [], _ => none
  | (name, value) :: rest, key => if key = name then some value else lookup rest key

theorem lookup_self (rest : Subst) (v : Var) (a : Atom) :
    lookup ((v, a) :: rest) v = some a := by
  simp [lookup]

theorem lookup_other (rest : Subst) (v w : Var) (a : Atom) (h : w ≠ v) :
    lookup ((v, a) :: rest) w = lookup rest w := by
  simp [lookup, h]

theorem lookup_mem {σ : Subst} {v : Var} {a : Atom} :
    lookup σ v = some a → (v, a) ∈ σ := by
  induction σ with
  | nil => intro h; simp [lookup] at h
  | cons p rest ih =>
    intro h
    simp only [lookup] at h
    by_cases hv : v = p.1
    · simp [hv] at h
      exact List.mem_cons.mpr (Or.inl (Prod.ext_iff.mpr ⟨hv, h.symm⟩))
    · simp [hv] at h
      exact List.mem_cons_of_mem _ (ih h)

/-- `Subst.le σ τ`: every binding of `σ` is also a binding of `τ`. -/
def Subst.le (σ τ : Subst) : Prop :=
  ∀ v a, lookup σ v = some a → lookup τ v = some a

theorem substLe_refl (σ : Subst) : Subst.le σ σ := fun _ _ h => h

theorem substLe_trans {σ τ ρ : Subst} (h₁ : Subst.le σ τ) (h₂ : Subst.le τ ρ) :
    Subst.le σ ρ := fun v a h => h₂ v a (h₁ v a h)

theorem substLe_nil (σ : Subst) : Subst.le [] σ := fun _ _ h => by simp [lookup] at h

theorem substLe_insert {σ : Subst} {v : Var} (h : lookup σ v = none) (a : Atom) :
    Subst.le σ ((v, a) :: σ) := by
  intro w b hw
  simp only [lookup]
  by_cases hwv : w = v
  · subst hwv
    rw [hw] at h
    exact absurd h (by simp)
  · simp [hwv]; exact hw

theorem substLe_isSome {σ τ : Subst} (hle : Subst.le σ τ) {v : Var} :
    (lookup σ v).isSome = true → (lookup τ v).isSome = true := by
  cases hv : lookup σ v with
  | none => simp
  | some a =>
    intro _
    rw [hle v a hv]
    rfl

/-- Instantiate one term under a substitution. -/
def instTerm (σ : Subst) : Term → Option Atom
  | .atom a => some a
  | .var v => lookup σ v

theorem instTerm_le {σ τ : Subst} (hle : Subst.le σ τ) {t : Term} {a : Atom} :
    instTerm σ t = some a → instTerm τ t = some a := by
  intro h
  cases t with
  | atom c => exact h
  | var v => exact hle v a h

/-- Option-valued map: every element must transform. -/
def mapOpt {α β : Type} (f : α → Option β) : List α → Option (List β)
  | [] => some []
  | x :: xs =>
    match f x with
    | none => none
    | some y =>
      match mapOpt f xs with
      | none => none
      | some ys => some (y :: ys)

theorem mapOpt_length {α β : Type} {f : α → Option β} {xs : List α} {ys : List β} :
    mapOpt f xs = some ys → xs.length = ys.length := by
  induction xs generalizing ys with
  | nil => intro h; simp [mapOpt] at h; subst h; rfl
  | cons x xs ih =>
    intro h
    simp only [mapOpt] at h
    cases hx : f x with
    | none => rw [hx] at h; simp at h
    | some y =>
      rw [hx] at h
      cases hr : mapOpt f xs with
      | none => rw [hr] at h; simp at h
      | some ys' =>
        rw [hr] at h; simp at h
        subst h
        have := ih hr
        simp [this]

theorem mapOpt_some {α β : Type} {f : α → Option β} {xs : List α} {ys : List β} :
    mapOpt f xs = some ys → ∀ x ∈ xs, (f x).isSome = true := by
  induction xs generalizing ys with
  | nil => intro _ x hx; simp at hx
  | cons x xs ih =>
    intro h x' hx'
    simp only [mapOpt] at h
    cases hx : f x with
    | none => rw [hx] at h; simp at h
    | some y =>
      rw [hx] at h
      cases hr : mapOpt f xs with
      | none => rw [hr] at h; simp at h
      | some ys' =>
        rw [hr] at h
        simp only [List.mem_cons] at hx'
        cases hx' with
        | inl heq => subst heq; rw [hx]; rfl
        | inr hmem => exact ih hr x' hmem

theorem mapOpt_mem {α β : Type} {f : α → Option β} {xs : List α} {ys : List β} :
    mapOpt f xs = some ys → ∀ y ∈ ys, ∃ x ∈ xs, f x = some y := by
  induction xs generalizing ys with
  | nil => intro h; simp [mapOpt] at h; subst h; intro y hy; simp at hy
  | cons x xs ih =>
    intro h y hy
    simp only [mapOpt] at h
    cases hx : f x with
    | none => rw [hx] at h; simp at h
    | some y₀ =>
      rw [hx] at h
      cases hr : mapOpt f xs with
      | none => rw [hr] at h; simp at h
      | some ys' =>
        rw [hr] at h; simp at h
        subst h
        simp only [List.mem_cons] at hy
        cases hy with
        | inl heq => exact ⟨x, List.mem_cons_self, heq ▸ hx⟩
        | inr hmem =>
          obtain ⟨x', hx'm, hx'f⟩ := ih hr y hmem
          exact ⟨x', List.mem_cons_of_mem _ hx'm, hx'f⟩

/-- `f` applied elementwise yields the corresponding result at each zip pair. -/
theorem mapOpt_zip {α β : Type} {f : α → Option β} {xs : List α} {ys : List β} :
    mapOpt f xs = some ys → ∀ p ∈ ys.zip xs, f p.2 = some p.1 := by
  induction xs generalizing ys with
  | nil => intro h; simp [mapOpt] at h; subst h; intro p hp; simp at hp
  | cons x xs ih =>
    intro h p hp
    simp only [mapOpt] at h
    cases hx : f x with
    | none => rw [hx] at h; simp at h
    | some y =>
      rw [hx] at h
      cases hr : mapOpt f xs with
      | none => rw [hr] at h; simp at h
      | some ys' =>
        rw [hr] at h; simp at h
        subst h
        have hzip : List.zip (y :: ys') (x :: xs) = (y, x) :: List.zip ys' xs := rfl
        rw [hzip] at hp
        cases hp with
        | head =>
          exact hx
        | tail _ hmem => exact ih hr p hmem

def instArgs (σ : Subst) (ts : List Term) : Option (List Atom) :=
  mapOpt (instTerm σ) ts

def instLit (σ : Subst) (l : Literal) : Option Tuple :=
  match instArgs σ l.terms with
  | some args => some ⟨l.relation, args⟩
  | none => none

theorem instArgs_le {σ τ : Subst} (hle : Subst.le σ τ) {ts : List Term} {as : List Atom} :
    instArgs σ ts = some as → instArgs τ ts = some as := by
  induction ts generalizing as with
  | nil => intro h; exact h
  | cons t ts ih =>
    intro h
    simp only [instArgs, mapOpt] at h
    cases ht : instTerm σ t with
    | none => rw [ht] at h; simp at h
    | some a =>
      rw [ht] at h
      cases hr : mapOpt (instTerm σ) ts with
      | none => rw [hr] at h; simp at h
      | some rest =>
        rw [hr] at h; simp at h
        subst h
        have h₁ := instTerm_le hle ht
        have h₂ : mapOpt (instTerm τ) ts = some rest := ih (as := rest) hr
        simp only [instArgs, mapOpt]
        rw [h₁, h₂]

theorem instLit_le {σ τ : Subst} (hle : Subst.le σ τ) {l : Literal} {t : Tuple} :
    instLit σ l = some t → instLit τ l = some t := by
  intro h
  simp only [instLit] at h ⊢
  cases ha : instArgs σ l.terms with
  | none => rw [ha] at h; simp at h
  | some args =>
    rw [ha] at h; simp at h
    subst h
    rw [instArgs_le hle ha]

theorem instArgs_length {σ : Subst} {ts : List Term} {as : List Atom} :
    instArgs σ ts = some as → ts.length = as.length := mapOpt_length

def termVars : Term → List Var
  | .atom _ => []
  | .var v => [v]

def litVars (l : Literal) : List Var := l.terms.flatMap termVars

def bodyVars (r : Rule) : List Var := r.body.flatMap litVars

/-- Range restriction: every head variable occurs in the body. -/
def Safe (r : Rule) : Prop := ∀ v ∈ litVars r.head, v ∈ bodyVars r

def AllSafe (prog : List Rule) : Prop := ∀ r ∈ prog, Safe r

/-- `mapOpt` succeeds when every target variable is bound. -/
theorem instArgs_of_covered {σ : Subst} {ts : List Term} :
    (∀ v ∈ ts.flatMap termVars, (lookup σ v).isSome = true) → (instArgs σ ts).isSome = true := by
  induction ts with
  | nil => intro _; rfl
  | cons t ts ih =>
    intro h
    have ht : (instTerm σ t).isSome = true := by
      cases t with
      | atom a => rfl
      | var v =>
        apply h v
        simp only [List.flatMap_cons, List.mem_append]
        exact Or.inl (by simp [termVars])
    have hrest : ∀ v ∈ ts.flatMap termVars, (lookup σ v).isSome = true := by
      intro v hv
      apply h v
      simp only [List.flatMap_cons, List.mem_append]
      exact Or.inr hv
    have hih := ih hrest
    simp only [instArgs, mapOpt]
    cases hti : instTerm σ t with
    | none =>
      rw [hti] at ht
      simp at ht
    | some a =>
      rw [Option.isSome_iff_exists] at hih
      obtain ⟨rest, hrest'⟩ := hih
      have hrest'' : mapOpt (instTerm σ) ts = some rest := hrest'
      rw [hrest'']
      rfl

/-- Extend `σ` so `t` takes value `a`, or fail on conflict. -/
def matchTerm (σ : Subst) (t : Term) (a : Atom) : Option Subst :=
  match t with
  | .atom c => if c = a then some σ else none
  | .var v =>
    match lookup σ v with
    | some b => if b = a then some σ else none
    | none => some ((v, a) :: σ)

theorem matchTerm_extends {σ σ' : Subst} {t : Term} {a : Atom} :
    matchTerm σ t a = some σ' → Subst.le σ σ' := by
  intro h
  cases t with
  | atom c =>
    simp only [matchTerm] at h
    by_cases hc : c = a
    · simp [hc] at h; subst h; exact substLe_refl _
    · simp [hc] at h
  | var v =>
    simp only [matchTerm] at h
    cases hg : lookup σ v with
    | none =>
      rw [hg] at h; simp at h
      subst h
      exact substLe_insert hg a
    | some b =>
      rw [hg] at h
      by_cases hb : b = a
      · simp [hb] at h; subst h; exact substLe_refl _
      · simp [hb] at h

theorem matchTerm_correct {σ σ' : Subst} {t : Term} {a : Atom} :
    matchTerm σ t a = some σ' → instTerm σ' t = some a := by
  intro h
  cases t with
  | atom c =>
    simp only [matchTerm] at h
    by_cases hc : c = a
    · simp [hc] at h; subst h; simp [instTerm, hc]
    · simp [hc] at h
  | var v =>
    simp only [matchTerm] at h
    cases hg : lookup σ v with
    | none =>
      rw [hg] at h; simp at h; subst h
      simp [instTerm, lookup_self]
    | some b =>
      rw [hg] at h
      by_cases hb : b = a
      · simp [hb] at h; subst h
        simp [instTerm, hg, hb]
      · simp [hb] at h

theorem matchTerm_complete {σ τ : Subst} (hle : Subst.le σ τ) {t : Term} {a : Atom} :
    instTerm τ t = some a → ∃ σ', matchTerm σ t a = some σ' ∧ Subst.le σ' τ := by
  intro h
  cases t with
  | atom c =>
    simp [instTerm] at h
    subst h
    exact ⟨σ, by simp [matchTerm], hle⟩
  | var v =>
    simp only [instTerm] at h
    cases hg : lookup σ v with
    | none =>
      refine ⟨(v, a) :: σ, ?_, ?_⟩
      · simp [matchTerm, hg]
      · intro w b hw
        simp only [lookup] at hw
        by_cases hwv : w = v
        · subst hwv; simp at hw; subst hw; exact h
        · simp [hwv] at hw; exact hle w b hw
    | some b =>
      have hb : b = a := by
        have := hle v b hg
        rw [this] at h
        exact Option.some.inj h
      subst hb
      exact ⟨σ, by simp [matchTerm, hg], hle⟩

/-- Extend `σ` so the term list takes the argument list `as`. -/
def matchArgs (σ : Subst) : List Term → List Atom → Option Subst
  | [], [] => some σ
  | t :: ts, a :: as =>
    match matchTerm σ t a with
    | none => none
    | some σ' => matchArgs σ' ts as
  | _, _ => none

theorem matchArgs_extends {σ σ' : Subst} {ts : List Term} {as : List Atom} :
    matchArgs σ ts as = some σ' → Subst.le σ σ' := by
  induction ts generalizing σ as with
  | nil =>
    intro h
    cases as with
    | nil => simp [matchArgs] at h; subst h; exact substLe_refl _
    | cons a as => simp [matchArgs] at h
  | cons t ts ih =>
    intro h
    cases as with
    | nil => simp [matchArgs] at h
    | cons a as =>
      simp only [matchArgs] at h
      cases hm : matchTerm σ t a with
      | none => rw [hm] at h; simp at h
      | some σ₁ =>
        rw [hm] at h
        exact substLe_trans (matchTerm_extends hm) (ih h)

theorem matchArgs_correct {σ σ' : Subst} {ts : List Term} {as : List Atom} :
    matchArgs σ ts as = some σ' → instArgs σ' ts = some as := by
  induction ts generalizing σ as with
  | nil =>
    intro h
    cases as with
    | nil => simp [matchArgs] at h; subst h; rfl
    | cons a as => simp [matchArgs] at h
  | cons t ts ih =>
    intro h
    cases as with
    | nil => simp [matchArgs] at h
    | cons a as =>
      simp only [matchArgs] at h
      cases hm : matchTerm σ t a with
      | none => rw [hm] at h; simp at h
      | some σ₁ =>
        rw [hm] at h
        have h₁ := matchTerm_correct hm
        have hle : Subst.le σ₁ σ' := matchArgs_extends h
        have h₂ := instTerm_le hle h₁
        have h₃ : mapOpt (instTerm σ') ts = some as := ih h
        simp only [instArgs, mapOpt]
        rw [h₂, h₃]

theorem matchArgs_covers {σ σ' : Subst} {ts : List Term} {as : List Atom} :
    matchArgs σ ts as = some σ' →
    ∀ v ∈ ts.flatMap termVars, (lookup σ' v).isSome = true := by
  induction ts generalizing σ as with
  | nil =>
    intro h
    cases as with
    | nil => intro v hv; simp at hv
    | cons a as => simp [matchArgs] at h
  | cons t ts ih =>
    intro h v hv
    cases as with
    | nil => simp [matchArgs] at h
    | cons a as =>
      simp only [matchArgs] at h
      cases hm : matchTerm σ t a with
      | none => rw [hm] at h; simp at h
      | some σ₁ =>
        rw [hm] at h
        have hle := matchArgs_extends h
        simp only [List.flatMap_cons, List.mem_append] at hv
        cases hv with
        | inl hin =>
          cases t with
          | atom c => simp [termVars] at hin
          | var w =>
            simp only [termVars, List.mem_singleton] at hin
            subst hin
            have hbound : (lookup σ₁ v).isSome = true := by
              simp only [matchTerm] at hm
              cases hg : lookup σ v with
              | none =>
                rw [hg] at hm; simp at hm; subst hm
                rw [lookup_self]
                rfl
              | some b =>
                rw [hg] at hm
                by_cases hb : b = a
                · simp [hb] at hm; subst hm
                  rw [hg]
                  rfl
                · simp [hb] at hm
            exact substLe_isSome hle hbound
        | inr hin => exact ih h v hin

theorem matchArgs_complete {σ τ : Subst} (hle : Subst.le σ τ) {ts : List Term} {as : List Atom} :
    instArgs τ ts = some as → ∃ σ', matchArgs σ ts as = some σ' ∧ Subst.le σ' τ := by
  induction ts generalizing σ as with
  | nil =>
    intro h
    cases as with
    | nil => exact ⟨σ, rfl, hle⟩
    | cons a as => simp [instArgs, mapOpt] at h
  | cons t ts ih =>
    intro h
    cases as with
    | nil =>
      simp only [instArgs, mapOpt] at h
      cases ht : instTerm τ t with
      | none => rw [ht] at h; simp at h
      | some a =>
        rw [ht] at h
        cases hr : mapOpt (instTerm τ) ts with
        | none => rw [hr] at h; simp at h
        | some rest => rw [hr] at h; simp at h
    | cons a as =>
      simp only [instArgs, mapOpt] at h
      cases ht : instTerm τ t with
      | none => rw [ht] at h; simp at h
      | some a' =>
        rw [ht] at h
        cases hr : mapOpt (instTerm τ) ts with
        | none => rw [hr] at h; simp at h
        | some rest =>
          rw [hr] at h; simp at h
          obtain ⟨rfl, rfl⟩ := h
          obtain ⟨σ₁, hm₁, hle₁⟩ := matchTerm_complete hle ht
          obtain ⟨σ', hm₂, hle₂⟩ := ih hle₁ hr
          exact ⟨σ', by simp only [matchArgs]; rw [hm₁]; exact hm₂, hle₂⟩

/-- Every binding in the result was already bound or comes from `as`. -/
theorem matchTerm_entries {σ σ' : Subst} {t : Term} {a : Atom} :
    matchTerm σ t a = some σ' → ∀ p ∈ σ', p ∈ σ ∨ p.2 = a := by
  intro h p hp
  cases t with
  | atom c =>
    simp only [matchTerm] at h
    by_cases hc : c = a
    · simp [hc] at h; subst h; exact Or.inl hp
    · simp [hc] at h
  | var v =>
    simp only [matchTerm] at h
    cases hg : lookup σ v with
    | none =>
      rw [hg] at h; simp at h; subst h
      cases hp with
      | head => exact Or.inr rfl
      | tail _ hmem => exact Or.inl hmem
    | some b =>
      rw [hg] at h
      by_cases hb : b = a
      · simp [hb] at h; subst h; exact Or.inl hp
      · simp [hb] at h

theorem matchArgs_entries {σ σ' : Subst} {ts : List Term} {as : List Atom} :
    matchArgs σ ts as = some σ' → ∀ p ∈ σ', p ∈ σ ∨ p.2 ∈ as := by
  induction ts generalizing σ as with
  | nil =>
    intro h
    cases as with
    | nil => simp [matchArgs] at h; subst h; intro p hp; exact Or.inl hp
    | cons a as => simp [matchArgs] at h
  | cons t ts ih =>
    intro h p hp
    cases as with
    | nil => simp [matchArgs] at h
    | cons a as =>
      simp only [matchArgs] at h
      cases hm : matchTerm σ t a with
      | none => rw [hm] at h; simp at h
      | some σ₁ =>
        rw [hm] at h
        have := ih h p hp
        cases this with
        | inl hin =>
          have := matchTerm_entries hm p hin
          cases this with
          | inl hmem => exact Or.inl hmem
          | inr hval => exact Or.inr (List.mem_cons.mpr (Or.inl hval))
        | inr hval => exact Or.inr (List.mem_cons_of_mem _ hval)

/-- Match a literal against a tuple (relation must agree). -/
def matchLit (σ : Subst) (l : Literal) (t : Tuple) : Option Subst :=
  if l.relation = t.relation then matchArgs σ l.terms t.args else none

theorem matchLit_extends {σ σ' : Subst} {l : Literal} {t : Tuple} :
    matchLit σ l t = some σ' → Subst.le σ σ' := by
  intro h
  simp only [matchLit] at h
  by_cases hr : l.relation = t.relation
  · simp [hr] at h; exact matchArgs_extends h
  · simp [hr] at h

theorem matchLit_correct {σ σ' : Subst} {l : Literal} {t : Tuple} :
    matchLit σ l t = some σ' → instLit σ' l = some t := by
  intro h
  simp only [matchLit] at h
  by_cases hr : l.relation = t.relation
  · simp [hr] at h
    cases t with
    | mk rel args =>
      have hargs : instArgs σ' l.terms = some args := matchArgs_correct h
      have hinst : instLit σ' l = some ⟨l.relation, args⟩ := by simp [instLit, hargs]
      rw [hinst]
      simp only [Option.some.injEq, Tuple.mk.injEq]
      exact ⟨hr, trivial⟩
  · simp [hr] at h

theorem matchLit_covers {σ σ' : Subst} {l : Literal} {t : Tuple} :
    matchLit σ l t = some σ' → ∀ v ∈ litVars l, (lookup σ' v).isSome = true := by
  intro h v hv
  simp only [matchLit] at h
  by_cases hr : l.relation = t.relation
  · simp [hr] at h
    exact matchArgs_covers h v hv
  · simp [hr] at h

theorem matchLit_complete {σ τ : Subst} (hle : Subst.le σ τ) {l : Literal} {t : Tuple} :
    instLit τ l = some t → ∃ σ', matchLit σ l t = some σ' ∧ Subst.le σ' τ := by
  intro h
  simp only [instLit] at h
  cases ha : instArgs τ l.terms with
  | none => rw [ha] at h; simp at h
  | some args =>
    rw [ha] at h; simp at h
    have : t = ⟨l.relation, args⟩ := h.symm
    subst this
    obtain ⟨σ', hm, hle'⟩ := matchArgs_complete hle ha
    exact ⟨σ', by simp only [matchLit]; simp [hm], hle'⟩

/-- New bindings mention only atoms drawn from the candidate tuples. -/
theorem matchLit_entries {σ σ' : Subst} {l : Literal} {t : Tuple} :
    matchLit σ l t = some σ' → ∀ p ∈ σ', p ∈ σ ∨ p.2 ∈ t.args := by
  intro h p hp
  simp only [matchLit] at h
  by_cases hr : l.relation = t.relation
  · simp [hr] at h
    exact matchArgs_entries h p hp
  · simp [hr] at h

/-- All substitutions that satisfy literal `l` against candidate tuples `ts`. -/
def joinLit (σ : Subst) (l : Literal) (ts : List Tuple) : List Subst :=
  ts.filterMap (matchLit σ l)

/-- Left-to-right join of a body against a candidate tuple list. -/
def joinBody (σ : Subst) (ls : List Literal) (ts : List Tuple) : List Subst :=
  match ls with
  | [] => [σ]
  | l :: ls' => (joinLit σ l ts).flatMap (fun σ' => joinBody σ' ls' ts)

theorem joinBody_extends {σ σ' : Subst} {ls : List Literal} {ts : List Tuple} :
    σ' ∈ joinBody σ ls ts → Subst.le σ σ' := by
  induction ls generalizing σ with
  | nil => intro h; simp [joinBody] at h; subst h; exact substLe_refl _
  | cons l ls ih =>
    intro h
    simp only [joinBody] at h
    obtain ⟨σ₁, hσ₁, hσ'⟩ := List.mem_flatMap.mp h
    have hσ₁' : σ₁ ∈ ts.filterMap (matchLit σ l) := hσ₁
    obtain ⟨t, ht, hmatch⟩ := List.mem_filterMap.mp hσ₁'
    exact substLe_trans (matchLit_extends hmatch) (ih hσ')

theorem joinBody_sound {σ σ' : Subst} {ls : List Literal} {ts : List Tuple} :
    σ' ∈ joinBody σ ls ts → ∀ l' ∈ ls, ∃ t ∈ ts, instLit σ' l' = some t := by
  induction ls generalizing σ with
  | nil => intro _ l' hl'; simp at hl'
  | cons l ls ih =>
    intro h l' hl'
    simp only [joinBody] at h
    obtain ⟨σ₁, hσ₁, hσ'⟩ := List.mem_flatMap.mp h
    have hσ₁' : σ₁ ∈ ts.filterMap (matchLit σ l) := hσ₁
    obtain ⟨t, ht, hmatch⟩ := List.mem_filterMap.mp hσ₁'
    have hle : Subst.le σ₁ σ' := joinBody_extends hσ'
    simp only [List.mem_cons] at hl'
    cases hl' with
    | inl heq =>
      subst heq
      exact ⟨t, ht, instLit_le hle (matchLit_correct hmatch)⟩
    | inr hmem => exact ih hσ' l' hmem

theorem joinBody_covers {σ σ' : Subst} {ls : List Literal} {ts : List Tuple} :
    σ' ∈ joinBody σ ls ts → ∀ v ∈ ls.flatMap litVars, (lookup σ' v).isSome = true := by
  induction ls generalizing σ with
  | nil => intro _ v hv; simp at hv
  | cons l ls ih =>
    intro h v hv
    simp only [joinBody] at h
    obtain ⟨σ₁, hσ₁, hσ'⟩ := List.mem_flatMap.mp h
    have hσ₁' : σ₁ ∈ ts.filterMap (matchLit σ l) := hσ₁
    obtain ⟨t, ht, hmatch⟩ := List.mem_filterMap.mp hσ₁'
    have hle : Subst.le σ₁ σ' := joinBody_extends hσ'
    simp only [List.flatMap_cons, List.mem_append] at hv
    cases hv with
    | inl hin => exact substLe_isSome hle (matchLit_covers hmatch v hin)
    | inr hin => exact ih hσ' v hin

theorem joinBody_values {σ σ' : Subst} {ls : List Literal} {ts : List Tuple} :
    σ' ∈ joinBody σ ls ts → ∀ p ∈ σ', p ∈ σ ∨ p.2 ∈ ts.flatMap Tuple.args := by
  induction ls generalizing σ with
  | nil => intro h p hp; simp [joinBody] at h; subst h; exact Or.inl hp
  | cons l ls ih =>
    intro h p hp
    simp only [joinBody] at h
    obtain ⟨σ₁, hσ₁, hσ'⟩ := List.mem_flatMap.mp h
    have hσ₁' : σ₁ ∈ ts.filterMap (matchLit σ l) := hσ₁
    obtain ⟨t, ht, hmatch⟩ := List.mem_filterMap.mp hσ₁'
    have := ih hσ' p hp
    cases this with
    | inr hval =>
      exact Or.inr hval
    | inl hin =>
      have := matchLit_entries hmatch p hin
      cases this with
      | inl hmem => exact Or.inl hmem
      | inr harg =>
        exact Or.inr (List.mem_flatMap.mpr ⟨t, ht, harg⟩)

theorem joinBody_complete {σ τ : Subst} (hle : Subst.le σ τ) {ls : List Literal} {ts : List Tuple} :
    (∀ l ∈ ls, ∃ t ∈ ts, instLit τ l = some t) →
    ∃ σ' ∈ joinBody σ ls ts, Subst.le σ' τ := by
  induction ls generalizing σ with
  | nil => intro _; exact ⟨σ, by simp [joinBody], hle⟩
  | cons l ls ih =>
    intro h
    obtain ⟨t, ht, hin⟩ := h l (by simp)
    obtain ⟨σ₁, hm₁, hle₁⟩ := matchLit_complete hle hin
    obtain ⟨σ', hmem, hle₂⟩ := ih (σ := σ₁) hle₁ (fun l' hl' => h l' (List.mem_cons_of_mem _ hl'))
    refine ⟨σ', ?_, hle₂⟩
    simp only [joinBody]
    have h₁ : σ₁ ∈ ts.filterMap (matchLit σ l) := List.mem_filterMap.mpr ⟨t, ht, hm₁⟩
    exact List.mem_flatMap.mpr ⟨σ₁, h₁, hmem⟩

/-- Tuples produced by one rule firing against `ts`. -/
def fire (r : Rule) (ts : List Tuple) : List Tuple :=
  (joinBody [] r.body ts).filterMap (instLit · r.head)

theorem fire_mem {r : Rule} {ts : List Tuple} {t : Tuple} :
    t ∈ fire r ts → ∃ σ ∈ joinBody [] r.body ts, instLit σ r.head = some t := by
  intro h
  have h' : t ∈ (joinBody [] r.body ts).filterMap (fun σ => instLit σ r.head) := h
  exact List.mem_filterMap.mp h'

theorem fire_of {r : Rule} {ts : List Tuple} {t : Tuple} {σ : Subst} :
    σ ∈ joinBody [] r.body ts → instLit σ r.head = some t → t ∈ fire r ts := by
  intro h₁ h₂
  have : t ∈ (joinBody [] r.body ts).filterMap (fun σ => instLit σ r.head) :=
    List.mem_filterMap.mpr ⟨σ, h₁, h₂⟩
  exact this

/-- If `τ` witnesses every body literal and grounds the head, the head tuple fires. -/
theorem fire_complete {r : Rule} (hsafe : Safe r) {τ : Subst} {ts : List Tuple} {t : Tuple}
    (hbody : ∀ l ∈ r.body, ∃ u ∈ ts, instLit τ l = some u)
    (hhead : instLit τ r.head = some t) :
    t ∈ fire r ts := by
  obtain ⟨σ', hmem, hle⟩ := joinBody_complete (substLe_nil τ) hbody
  have hcover : ∀ v ∈ bodyVars r, (lookup σ' v).isSome = true := joinBody_covers hmem
  have hground : (instArgs σ' r.head.terms).isSome = true := by
    apply instArgs_of_covered
    intro v hv
    exact hcover v (hsafe v hv)
  cases hi : instLit σ' r.head with
  | none =>
    simp only [instLit] at hi
    cases ha : instArgs σ' r.head.terms with
    | some args => rw [ha] at hi; simp at hi
    | none =>
      rw [ha] at hi
      simp [ha] at hground
  | some u =>
    have hu0 : instLit τ r.head = some u := instLit_le hle hi
    have hu : u = t := Option.some.inj (hu0.symm.trans hhead)
    subst hu
    exact fire_of hmem hi

/-- Append new elements not already present, preserving order. -/
def insertAll {α : Type} [DecidableEq α] (known : List α) : List α → List α
  | [] => known
  | t :: rest => if t ∈ known then insertAll known rest else insertAll (known ++ [t]) rest

theorem mem_insertAll {α : Type} [DecidableEq α] {k n : List α} {x : α} :
    x ∈ insertAll k n ↔ x ∈ k ∨ x ∈ n := by
  induction n generalizing k with
  | nil => simp [insertAll]
  | cons t rest ih =>
    simp only [insertAll]
    by_cases ht : t ∈ k
    · rw [ite_eq_left ht, ih]
      constructor
      · rintro (hk | hr)
        · exact Or.inl hk
        · exact Or.inr (List.Mem.tail t hr)
      · rintro (hk | hr)
        · exact Or.inl hk
        · cases hr with
          | head => exact Or.inl ht
          | tail _ hmem => exact Or.inr hmem
    · rw [ite_eq_right ht, ih]
      constructor
      · rintro (hk | hr)
        · cases List.mem_append.mp hk with
          | inl hk => exact Or.inl hk
          | inr hs =>
            cases hs with
            | head => exact Or.inr List.mem_cons_self
            | tail _ hnil => cases hnil
        · exact Or.inr (List.Mem.tail t hr)
      · rintro (hk | hr)
        · exact Or.inl (List.mem_append_left [t] hk)
        · cases hr with
          | head => exact Or.inl (List.mem_append_right k List.mem_cons_self)
          | tail _ hmem => exact Or.inr hmem

/-- `insertAll` appends a fresh-element suffix. -/
theorem insertAll_app {α : Type} [DecidableEq α] (k : List α) :
    ∀ {n : List α}, ∃ extra : List α,
      insertAll k n = k ++ extra ∧ extra.Nodup ∧ ∀ t ∈ extra, t ∈ n ∧ t ∉ k := by
  intro n
  induction n generalizing k with
  | nil => exact ⟨[], by simp [insertAll], by simp, fun t ht => by simp at ht⟩
  | cons t rest ih =>
    simp only [insertAll]
    by_cases ht : t ∈ k
    · rw [ite_eq_left ht]
      obtain ⟨e, heq, hnd, hmem⟩ := ih k
      exact ⟨e, heq, hnd, fun x hx =>
        let ⟨h1, h2⟩ := hmem x hx
        ⟨List.Mem.tail t h1, h2⟩⟩
    · rw [ite_eq_right ht]
      obtain ⟨e, heq, hnd, hmem⟩ := ih (k ++ [t])
      refine ⟨t :: e, ?_, ?_, ?_⟩
      · rw [heq]
        simp [List.append_assoc]
      · rw [List.nodup_cons]
        refine ⟨?_, hnd⟩
        intro hte
        obtain ⟨_, h2⟩ := hmem t hte
        exact h2 (List.mem_append_right k List.mem_cons_self)
      · intro x hx
        cases hx with
        | head => exact ⟨List.Mem.head rest, ht⟩
        | tail _ hxe =>
          obtain ⟨h1, h2⟩ := hmem x hxe
          refine ⟨List.Mem.tail t h1, ?_⟩
          intro hxk
          exact h2 (List.mem_append_left [t] hxk)

theorem nodup_append {α : Type} {k e : List α} :
    k.Nodup → e.Nodup → (∀ x ∈ e, x ∉ k) → (k ++ e).Nodup := by
  induction k with
  | nil => intro _ hen _; simpa using hen
  | cons a as ih =>
    intro hkn hen hd
    rw [List.nodup_cons] at hkn
    obtain ⟨hak, has⟩ := hkn
    rw [List.cons_append, List.nodup_cons]
    refine ⟨?_, ih has hen ?_⟩
    · intro hmem
      rw [List.mem_append] at hmem
      cases hmem with
      | inl hmas => exact hak hmas
      | inr hmae => exact absurd (List.Mem.head as) (hd a hmae)
    · intro x hx hxa
      exact hd x hx (List.Mem.tail a hxa)

theorem insertAll_nodup {α : Type} [DecidableEq α] {k n : List α} (hk : k.Nodup) :
    (insertAll k n).Nodup := by
  obtain ⟨e, heq, hnd, hmem⟩ := insertAll_app k (n := n)
  rw [heq]
  exact nodup_append hk hnd (fun x hx hxk => (hmem x hx).2 hxk)

/-- Erase the first occurrence. -/
def eraseFirst {α : Type} [DecidableEq α] (a : α) : List α → List α
  | [] => []
  | x :: xs => if x = a then xs else x :: eraseFirst a xs

theorem mem_eraseFirst_ne {α : Type} [DecidableEq α] {a b : α} (h : b ≠ a) {l : List α} :
    b ∈ eraseFirst a l ↔ b ∈ l := by
  induction l with
  | nil => simp [eraseFirst]
  | cons x xs ih =>
    simp only [eraseFirst]
    by_cases hx : x = a
    · subst hx
      simp
      intro heq
      exact absurd heq h
    · simp [hx]
      rw [ih]

theorem length_eraseFirst_mem {α : Type} [DecidableEq α] {a : α} {l : List α} :
    a ∈ l → (eraseFirst a l).length = l.length - 1 := by
  induction l with
  | nil => intro h; cases h
  | cons x xs ih =>
    intro h
    simp only [eraseFirst]
    by_cases hx : x = a
    · subst hx
      simp
    · rw [ite_eq_right hx]
      cases h with
      | head => exact absurd rfl hx
      | tail _ hmem =>
        rw [List.length_cons, List.length_cons, ih hmem]
        have hxs : 1 ≤ xs.length := by
          cases xs with
          | nil => cases hmem
          | cons _ _ => simp
        omega

/-- No-duplicates plus subset bounds the length. -/
theorem nodup_subset_length_le {α : Type} [DecidableEq α] {l m : List α} :
    l.Nodup → l ⊆ m → l.length ≤ m.length := by
  induction l generalizing m with
  | nil => intro _ _; simp
  | cons a as ih =>
    intro hnd hsub
    rw [List.nodup_cons] at hnd
    obtain ⟨haa, has⟩ := hnd
    have ha : a ∈ m := hsub List.mem_cons_self
    have hsub' : as ⊆ eraseFirst a m := by
      intro x hx
      have hxm : x ∈ m := hsub (List.Mem.tail a hx)
      have hxa : x ≠ a := fun he => haa (he ▸ hx)
      exact (mem_eraseFirst_ne hxa).mpr hxm
    have hlen := ih has hsub'
    rw [length_eraseFirst_mem ha] at hlen
    have hm1 : 1 ≤ m.length := by
      cases m with
      | nil => cases ha
      | cons _ _ => simp
    rw [List.length_cons]
    omega

/-- Base facts as tuples. -/
def seed (fs : List Fact) : List Tuple := fs.map Fact.tuple

theorem mem_seed {fs : List Fact} {t : Tuple} :
    t ∈ seed fs → ∃ f ∈ fs, f.tuple = t := by
  intro h
  have h' : t ∈ fs.map Fact.tuple := h
  obtain ⟨f, hf, hft⟩ := List.mem_map.mp h'
  exact ⟨f, hf, hft⟩

/-- One rule-application round over the current tuple list. -/
def round (rs : List Rule) (ts : List Tuple) : List Tuple :=
  insertAll ts (rs.flatMap (fun r => fire r ts))

theorem mem_round {rs : List Rule} {ts : List Tuple} {t : Tuple} :
    t ∈ round rs ts → t ∈ ts ∨ ∃ r ∈ rs, t ∈ fire r ts := by
  intro h
  have := (mem_insertAll).mp h
  cases this with
  | inl hts => exact Or.inl hts
  | inr hnew =>
    obtain ⟨r, hr, hf⟩ := List.mem_flatMap.mp hnew
    exact Or.inr ⟨r, hr, hf⟩

theorem mem_round_self {rs : List Rule} {ts : List Tuple} {t : Tuple} :
    t ∈ ts → t ∈ round rs ts := by
  intro h
  exact (mem_insertAll).mpr (Or.inl h)

theorem round_of_fire {rs : List Rule} {ts : List Tuple} {r : Rule} {t : Tuple} :
    r ∈ rs → t ∈ fire r ts → t ∈ round rs ts := by
  intro hr ht
  exact (mem_insertAll).mpr (Or.inr (List.mem_flatMap.mpr ⟨r, hr, ht⟩))

/-- Bounded iteration of `round`: `iter rs fs n` is `round` applied `n` times to `seed fs`. -/
def iter (rs : List Rule) (fs : List Fact) : Nat → List Tuple
  | 0 => seed fs
  | n + 1 => round rs (iter rs fs n)

theorem iter_mono {rs : List Rule} {fs : List Fact} (n : Nat) :
    ∀ t ∈ iter rs fs n, t ∈ iter rs fs (n + 1) := by
  intro t h
  exact mem_round_self h

theorem iter_prefix {rs : List Rule} {fs : List Fact} {m n : Nat} (h : m ≤ n) :
    ∀ t ∈ iter rs fs m, t ∈ iter rs fs n := by
  induction n with
  | zero =>
    intro t ht
    have : m = 0 := Nat.eq_zero_of_le_zero h
    subst this
    exact ht
  | succ n ihn =>
    intro t ht
    cases Nat.lt_or_eq_of_le h with
    | inl hlt =>
      exact iter_mono n t (ihn (Nat.lt_succ_iff.mp hlt) t ht)
    | inr heq =>
      subst heq
      exact ht

theorem iter_nodup {rs : List Rule} {fs : List Fact} (hn : (seed fs).Nodup) (n : Nat) :
    (iter rs fs n).Nodup := by
  induction n with
  | zero =>
    simpa [iter] using hn
  | succ n ih =>
    simp only [iter]
    exact insertAll_nodup ih


/-- The declarative semantics: `t` is derivable from `fs` under `rs` iff it
    appears at some finite iteration depth. -/
def Derivable (rs : List Rule) (fs : List Fact) (t : Tuple) : Prop :=
  ∃ n, t ∈ iter rs fs n

theorem derivable_base {rs : List Rule} {fs : List Fact} {t : Tuple} :
    t ∈ seed fs → Derivable rs fs t := fun h => ⟨0, h⟩

/-- The number of premises of a rule is bounded by the body length, so we can
    take a uniform iteration level covering every premise. -/
theorem body_iter_bound {rs : List Rule} {fs : List Fact} {σ : Subst} {Y : List Tuple}
    (hbound : ∀ u ∈ Y, Derivable rs fs u)
    {body : List Literal} :
    (∀ l ∈ body, ∃ u ∈ Y, instLit σ l = some u) →
    ∃ N, ∀ l ∈ body, ∃ u ∈ iter rs fs N, instLit σ l = some u := by
  induction body with
  | nil => intro _; exact ⟨0, fun l hl => by cases hl⟩
  | cons l body ih =>
    intro h
    obtain ⟨u, huY, hul⟩ := h l List.mem_cons_self
    obtain ⟨n₁, hun₁⟩ := hbound u huY
    obtain ⟨N₂, hN₂⟩ := ih (fun l' hl' => h l' (List.Mem.tail l hl'))
    refine ⟨Nat.max n₁ N₂, ?_⟩
    intro l' hl'
    cases hl' with
    | head =>
      exact ⟨u, iter_prefix (Nat.le_max_left _ _) u hun₁, hul⟩
    | tail _ hmem =>
      obtain ⟨u', huN, hul'⟩ := hN₂ l' hmem
      exact ⟨u', iter_prefix (Nat.le_max_right _ _) u' huN, hul'⟩

/-- The step case of the declarative semantics: a rule application whose
    premises are all derivable produces a derivable tuple. -/
theorem derivable_step {rs : List Rule} (hsafe : ∀ r ∈ rs, Safe r) {fs : List Fact}
    {r : Rule} {σ : Subst} {t : Tuple} :
    r ∈ rs →
    (∀ l ∈ r.body, ∃ u, instLit σ l = some u ∧ Derivable rs fs u) →
    instLit σ r.head = some t →
    Derivable rs fs t := by
  intro hr hbody hinst
  -- first obtain candidate tuples for the premises inside `iter` somewhere
  have hbody' : ∀ l ∈ r.body, ∃ u, (∃ n, u ∈ iter rs fs n) ∧ instLit σ l = some u := by
    intro l hl
    obtain ⟨u, hul, hd⟩ := hbody l hl
    exact ⟨u, hd, hul⟩
  -- bound the premise levels
  have : ∃ N, ∀ l ∈ r.body, ∃ u ∈ iter rs fs N, instLit σ l = some u := by
    -- fold the per-premise existentials to a max
    have := hbody'
    generalize r.body = body at this ⊢
    induction body with
    | nil => exact ⟨0, fun l hl => by cases hl⟩
    | cons l body ih =>
      obtain ⟨u, ⟨n₁, hun₁⟩, hul⟩ := this l List.mem_cons_self
      obtain ⟨N₂, hN₂⟩ := ih (fun l' hl' => this l' (List.Mem.tail l hl'))
      refine ⟨Nat.max n₁ N₂, ?_⟩
      intro l' hl'
      cases hl' with
      | head =>
        exact ⟨u, iter_prefix (Nat.le_max_left _ _) u hun₁, hul⟩
      | tail _ hmem =>
        obtain ⟨u', huN, hul'⟩ := hN₂ l' hmem
        exact ⟨u', iter_prefix (Nat.le_max_right _ _) u' huN, hul'⟩
  obtain ⟨N, hN⟩ := this
  exact ⟨N + 1, round_of_fire hr (fire_complete (hsafe r hr) hN hinst)⟩



/-- Every literal occurrence in a program: base-fact literals plus rule heads
    and bodies. -/
def literals (rs : List Rule) (fs : List Fact) : List Literal :=
  fs.map Fact.lit ++ rs.flatMap (fun r => r.head :: r.body)

/-- Atoms appearing as constant terms of a literal. -/
def litAtoms (l : Literal) : List Atom := l.terms.filterMap Term.atomOf

/-- All constant atoms mentioned anywhere in the program. -/
def domain (rs : List Rule) (fs : List Fact) : List Atom :=
  (literals rs fs).flatMap litAtoms

/-- All lists of length `n` over `xs`. -/
def powList {α : Type} [DecidableEq α] (xs : List α) : Nat → List (List α)
  | 0 => [[]]
  | n + 1 => xs.flatMap fun a => (powList xs n).map (a :: ·)

theorem mem_powList {α : Type} [DecidableEq α] {xs : List α} {ys : List α} {n : Nat} :
    ys ∈ powList xs n → (ys.length = n ∧ ∀ a ∈ ys, a ∈ xs) := by
  induction n generalizing ys with
  | zero =>
    intro h
    cases h with
    | head => exact ⟨rfl, fun a ha => by cases ha⟩
    | tail _ hnil => cases hnil
  | succ n ih =>
    intro h
    simp only [powList] at h
    obtain ⟨a, ha, hmem⟩ := List.mem_flatMap.mp h
    obtain ⟨ys', hys', hmap⟩ := List.mem_map.mp hmem
    subst hmap
    obtain ⟨hl, hm⟩ := ih hys'
    refine ⟨by simp [hl], ?_⟩
    intro b hb
    cases hb with
    | head => exact ha
    | tail _ hb => exact hm b hb

theorem mem_powList_complete {α : Type} [DecidableEq α] {xs : List α} {ys : List α} {n : Nat} :
    ys.length = n → (∀ a ∈ ys, a ∈ xs) → ys ∈ powList xs n := by
  induction n generalizing ys with
  | zero =>
    intro hl _
    cases ys with
    | nil => simp [powList]
    | cons _ _ => simp at hl
  | succ n ih =>
    intro hl hm
    cases ys with
    | nil => simp at hl
    | cons a as =>
      simp only [powList]
      apply List.mem_flatMap.mpr
      refine ⟨a, hm a List.mem_cons_self, ?_⟩
      apply List.mem_map.mpr
      exact ⟨as, ih (by simp at hl; exact hl) (fun b hb => hm b (List.Mem.tail a hb)), rfl⟩

/-- The finite tuple universe: every tuple whose relation occurs in the program
    and whose arguments all come from `domain`. -/
def univ (rs : List Rule) (fs : List Fact) : List Tuple :=
  (literals rs fs).flatMap fun l =>
    (powList (domain rs fs) l.terms.length).map (fun args => ⟨l.relation, args⟩)

theorem atom_mem_domain {rs : List Rule} {fs : List Fact} {l : Literal}
    (hl : l ∈ literals rs fs) {a : Atom} :
    Term.atom a ∈ l.terms → a ∈ domain rs fs := by
  intro h
  apply List.mem_flatMap.mpr
  exact ⟨l, hl, List.mem_filterMap.mpr ⟨Term.atom a, h, rfl⟩⟩

/-- Membership in `univ`: existence of a program literal with the tuple's
    relation, of matching arity, plus domain membership of the args. -/
theorem mem_univ {rs : List Rule} {fs : List Fact} {t : Tuple}
    {l : Literal} (hl : l ∈ literals rs fs)
    (hrel : l.relation = t.relation) (harity : l.terms.length = t.args.length)
    (hdom : ∀ a ∈ t.args, a ∈ domain rs fs) :
    t ∈ univ rs fs := by
  simp only [univ]
  apply List.mem_flatMap.mpr
  refine ⟨l, hl, ?_⟩
  apply List.mem_map.mpr
  refine ⟨t.args, mem_powList_complete harity.symm hdom, ?_⟩
  cases t with
  | mk rel args =>
    simp only [Tuple.mk.injEq]
    exact ⟨hrel, trivial⟩

/-- Inversion for `univ`: argument membership implies domain membership. -/
theorem univ_dom {rs : List Rule} {fs : List Fact} {t : Tuple}
    (h : t ∈ univ rs fs) : ∀ a ∈ t.args, a ∈ domain rs fs := by
  intro a ha
  simp only [univ] at h
  obtain ⟨l, _hl, hmem⟩ := List.mem_flatMap.mp h
  obtain ⟨args', hargs', hmap⟩ := List.mem_map.mp hmem
  obtain ⟨_, hdom⟩ := mem_powList hargs'
  cases t with
  | mk rel args =>
    -- hmap : ⟨l.relation, args'⟩ = ⟨rel, args⟩ → args = args'
    simp only [Tuple.mk.injEq] at hmap
    obtain ⟨_, rfl⟩ := hmap
    exact hdom a ha

/-- `instLit` preserves the relation name. -/
theorem instLit_rel {σ : Subst} {l : Literal} {t : Tuple} :
    instLit σ l = some t → l.relation = t.relation := by
  intro h
  simp only [instLit] at h
  cases ha : instArgs σ l.terms with
  | none => rw [ha] at h; simp at h
  | some as =>
    rw [ha] at h
    have h' : some ⟨l.relation, as⟩ = some t := h
    simp only [Option.some.injEq] at h'
    subst h'
    rfl

/-- Instantiated tuple arity equals literal arity. -/
theorem instLit_len {σ : Subst} {l : Literal} {t : Tuple} :
    instLit σ l = some t → t.args.length = l.terms.length := by
  intro h
  simp only [instLit] at h
  cases ha : instArgs σ l.terms with
  | none => rw [ha] at h; simp at h
  | some as =>
    rw [ha] at h
    have h' : some ⟨l.relation, as⟩ = some t := h
    simp only [Option.some.injEq] at h'
    subst h'
    have ha' : mapOpt (instTerm σ) l.terms = some as := ha
    exact (mapOpt_length ha').symm

/-- Decompose `instLit` into its `instArgs` component. -/
theorem instLit_instArgs {σ : Subst} {l : Literal} {t : Tuple} :
    instLit σ l = some t → ∃ as, instArgs σ l.terms = some as ∧ t = ⟨l.relation, as⟩ := by
  intro h
  simp only [instLit] at h
  cases ha : instArgs σ l.terms with
  | none => rw [ha] at h; simp at h
  | some as =>
    rw [ha] at h
    have h' : some ⟨l.relation, as⟩ = some t := h
    simp only [Option.some.injEq] at h'
    exact ⟨as, rfl, h'.symm⟩

/-- `joinBody` is monotone in the candidate list. -/
theorem joinBody_mono {σ : Subst} {ls : List Literal} {ts ts' : List Tuple}
    (hsub : ts ⊆ ts') :
    ∀ σ' ∈ joinBody σ ls ts, σ' ∈ joinBody σ ls ts' := by
  induction ls generalizing σ with
  | nil =>
    intro σ' h
    simp only [joinBody] at h ⊢
    exact h
  | cons l ls ih =>
    intro σ' h
    simp only [joinBody] at h ⊢
    obtain ⟨σ₁, hσ₁, hσ'⟩ := List.mem_flatMap.mp h
    have hσ₁' : σ₁ ∈ ts.filterMap (matchLit σ l) := hσ₁
    obtain ⟨t, ht, hm⟩ := List.mem_filterMap.mp hσ₁'
    have hmem : σ₁ ∈ ts'.filterMap (matchLit σ l) :=
      List.mem_filterMap.mpr ⟨t, hsub ht, hm⟩
    exact List.mem_flatMap.mpr ⟨σ₁, hmem, ih _ hσ'⟩

/-- Every argument of an instantiated term list is either an atom term or the
    image of a variable under the substitution. -/
theorem instArgs_mem {σ : Subst} {ts : List Term} {as : List Atom} :
    instArgs σ ts = some as → ∀ a ∈ as,
      (Term.atom a ∈ ts) ∨ (∃ v, Term.var v ∈ ts ∧ lookup σ v = some a) := by
  intro h a ha
  obtain ⟨t, ht, hin⟩ := mapOpt_mem h a ha
  cases t with
  | atom c =>
    simp only [instTerm] at hin
    have : c = a := Option.some.inj hin
    subst this
    exact Or.inl ht
  | var v =>
    simp only [instTerm] at hin
    exact Or.inr ⟨v, ht, hin⟩

/-- Substitution values produced by a body join come from candidate args. -/
theorem joinBody_values_nil {ls : List Literal} {ts : List Tuple} {σ' : Subst}
    (h : σ' ∈ joinBody [] ls ts) : ∀ p ∈ σ', p.2 ∈ ts.flatMap Tuple.args := by
  intro p hp
  rcases joinBody_values h p hp with hin | hval
  · cases hin
  · exact hval

/-- `fire` is monotone in the candidate list. -/
theorem fire_mono {ts ts' : List Tuple} (hsub : ts ⊆ ts') {r : Rule} :
    ∀ t ∈ fire r ts, t ∈ fire r ts' := by
  intro t ht
  obtain ⟨σ, hσ, hinst⟩ := fire_mem ht
  exact fire_of (joinBody_mono hsub _ hσ) hinst

/-- `round` is monotone in the candidate list. -/
theorem round_mono {ts ts' : List Tuple} (hsub : ts ⊆ ts') {rs : List Rule} :
    ∀ t ∈ round rs ts, t ∈ round rs ts' := by
  intro t ht
  rcases mem_round ht with hts | ⟨r, hr, hf⟩
  · exact mem_round_self (hsub hts)
  · exact round_of_fire hr (fire_mono hsub t hf)

/-- Well-formedness of the iteration: every enumerated tuple lies in `univ`. -/
theorem iter_wf {rs : List Rule} {fs : List Fact} (n : Nat) :
    ∀ t ∈ iter rs fs n, t ∈ univ rs fs := by
  induction n with
  | zero =>
    intro t ht
    obtain ⟨f, hf, hft⟩ := mem_seed ht
    subst hft
    apply mem_univ (l := Fact.lit f)
    · exact List.mem_append_left _ (List.mem_map.mpr ⟨f, hf, rfl⟩)
    · rfl
    · simp [Fact.lit]
    · intro a ha
      apply atom_mem_domain (List.mem_append_left _ (List.mem_map.mpr ⟨f, hf, rfl⟩))
      exact List.mem_map.mpr ⟨a, ha, rfl⟩
  | succ n ih =>
    intro t ht
    rcases mem_round ht with hts | ⟨r, hr, hf⟩
    · exact ih t hts
    · obtain ⟨σ, hσ, hinst⟩ := fire_mem hf
      apply mem_univ (l := r.head)
      · exact List.mem_append_right _
          (List.mem_flatMap.mpr ⟨r, hr, List.Mem.head _⟩)
      · exact instLit_rel hinst
      · exact (instLit_len hinst).symm
      · intro a ha
        obtain ⟨args, hargs, hteq⟩ := instLit_instArgs hinst
        subst hteq
        -- ha : a ∈ (⟨r.head.relation, args⟩).args  = a ∈ args
        rcases instArgs_mem hargs a ha with hatom | ⟨v, hv, hlk⟩
        · exact atom_mem_domain
            (List.mem_append_right _
              (List.mem_flatMap.mpr ⟨r, hr, List.Mem.head _⟩)) hatom
        · obtain ⟨u, hu, hau⟩ := List.mem_flatMap.mp
              (joinBody_values_nil hσ ⟨v, a⟩ (lookup_mem hlk))
          exact univ_dom (ih u hu) a hau

/-- If `iter` is not set-stable at `n`, some fresh tuple appears. -/
theorem exists_fresh {α : Type} [DecidableEq α] {as bs : List α} :
    ¬ (as ⊆ bs) → ∃ x ∈ as, x ∉ bs := by
  intro h
  induction as with
  | nil => exact absurd (fun x hx => by cases hx) h
  | cons a as ih =>
    by_cases ha : a ∈ bs
    · have : ¬ (as ⊆ bs) := fun h' =>
        h (fun x hx => Or.elim (List.mem_cons.mp hx) (fun he => he.symm ▸ ha) (fun hm => h' hm))
      obtain ⟨x, hx, hxb⟩ := ih this
      exact ⟨x, List.Mem.tail a hx, hxb⟩
    · exact ⟨a, List.mem_cons_self, ha⟩

/-- A strict subset of a nodup list has strictly smaller length. -/
theorem length_lt_of_subset_fresh {α : Type} [DecidableEq α] {as bs : List α}
    (ha : as.Nodup) (hsub : as ⊆ bs) (hx : ∃ x ∈ bs, x ∉ as) :
    as.length < bs.length := by
  obtain ⟨x, hxb, hxa⟩ := hx
  have h1 : as ⊆ eraseFirst x bs := by
    intro y hy
    exact (mem_eraseFirst_ne (fun (he : y = x) => hxa (he ▸ hy))).mpr (hsub hy)
  have h2 := nodup_subset_length_le ha h1
  rw [length_eraseFirst_mem hxb] at h2
  have hbs : 1 ≤ bs.length := by
    cases bs with
    | nil => cases hxb
    | cons _ _ => exact Nat.succ_le_succ (Nat.zero_le _)
  omega

/-- If a round produces no new tuples, all later iterations stay inside. -/
theorem iter_set_stable {rs : List Rule} {fs : List Fact} {n : Nat}
    (h : iter rs fs (n+1) ⊆ iter rs fs n) :
    ∀ k, iter rs fs (n+k) ⊆ iter rs fs n := by
  intro k
  induction k with
  | zero => intro t ht; exact ht
  | succ k ih =>
    intro t ht
    rw [Nat.add_succ] at ht
    have ht' : t ∈ round rs (iter rs fs (n+k)) := ht
    exact h (round_mono ih t ht')

theorem iter_stable_upto {rs : List Rule} {fs : List Fact} {n : Nat}
    (h : iter rs fs (n+1) ⊆ iter rs fs n) :
    ∀ m, n ≤ m → iter rs fs m ⊆ iter rs fs n := by
  intro m hnm
  have hkm := iter_set_stable h (m - n)
  rw [show n + (m - n) = m by omega] at hkm
  exact hkm

/-- While the iteration has not closed, its length strictly grows; so within
    `univ.length` steps either a fixpoint is reached or the bound is hit. -/
theorem iter_stable_before {rs : List Rule} {fs : List Fact} (hn : (seed fs).Nodup)
    (_hwf : ∀ n, iter rs fs n ⊆ univ rs fs) :
    ∀ n, n ≤ (univ rs fs).length →
      (∃ m, m < n ∧ iter rs fs (m+1) ⊆ iter rs fs m) ∨ n ≤ (iter rs fs n).length := by
  intro n
  induction n with
  | zero => intro _; exact Or.inr (Nat.zero_le _)
  | succ n ih =>
    intro hle
    rcases ih (Nat.le_of_succ_le hle) with h | hlen
    · exact Or.inl (h.imp fun m h' => ⟨Nat.lt_succ_of_lt h'.1, h'.2⟩)
    · by_cases hsub : iter rs fs (n+1) ⊆ iter rs fs n
      · exact Or.inl ⟨n, Nat.lt_succ_self _, hsub⟩
      · right
        obtain ⟨x, hx, hxn⟩ := exists_fresh hsub
        have hlt := length_lt_of_subset_fresh (iter_nodup hn n)
          (fun t ht => iter_mono n t ht) ⟨x, hx, hxn⟩
        omega

/-- The iteration is set-stable no later than at `univ.length`. -/
theorem iter_set_stable_exists {rs : List Rule} {fs : List Fact} (hn : (seed fs).Nodup)
    (hwf : ∀ n, iter rs fs n ⊆ univ rs fs) :
    ∃ n ≤ (univ rs fs).length, iter rs fs (n+1) ⊆ iter rs fs n := by
  rcases iter_stable_before hn hwf (univ rs fs).length (Nat.le_refl _) with h | hlen
  · obtain ⟨m, hmn, hsub⟩ := h
    exact ⟨m, Nat.le_trans (Nat.le_of_lt hmn) (Nat.le_refl _), hsub⟩
  · refine ⟨(univ rs fs).length, Nat.le_refl _, ?_⟩
    intro t ht
    have ht' : t ∈ univ rs fs := hwf _ ht
    have hle := nodup_subset_length_le (iter_nodup hn (univ rs fs).length)
      (hwf (univ rs fs).length)
    have hcover : univ rs fs ⊆ iter rs fs (univ rs fs).length := by
      intro x hxu
      by_cases hx' : x ∈ iter rs fs (univ rs fs).length
      · exact hx'
      · exfalso
        have hlt := length_lt_of_subset_fresh (iter_nodup hn (univ rs fs).length)
          (hwf (univ rs fs).length) ⟨x, hxu, hx'⟩
        omega
    exact hcover ht'

/-- The representative least fixed point: iterate up to `univ.length`. -/
def reach (rs : List Rule) (fs : List Fact) : List Tuple :=
  iter rs fs (univ rs fs).length

/-- Every iteration level is contained in `reach` as a set. -/
theorem iter_subset_reach {rs : List Rule} {fs : List Fact} (hn : (seed fs).Nodup) :
    ∀ n, iter rs fs n ⊆ reach rs fs := by
  obtain ⟨m, hmU, hstable⟩ := iter_set_stable_exists hn (fun n t ht => iter_wf n t ht)
  intro n t ht
  by_cases hnm : n ≤ m
  · exact iter_prefix (Nat.le_trans hnm hmU) t ht
  · have hnm' : m < n := Nat.lt_of_not_le hnm
    have h := iter_stable_upto hstable n (Nat.le_of_lt hnm') ht
    exact iter_prefix hmU t h

/-- Soundness and completeness of `reach` for derivability. -/
theorem derivable_iff_mem_reach {rs : List Rule} {fs : List Fact} (hn : (seed fs).Nodup)
    {t : Tuple} :
    Derivable rs fs t ↔ t ∈ reach rs fs := by
  constructor
  · intro ⟨n, h⟩
    exact iter_subset_reach hn n h
  · intro h
    exact ⟨_, h⟩

/-- Decidability of derivability inside the universe. -/
def derivable_decidable {rs : List Rule} {fs : List Fact} (hn : (seed fs).Nodup)
    (t : Tuple) : Decidable (Derivable rs fs t) := by
  rw [derivable_iff_mem_reach hn]
  exact inferInstance

/-- One-step decomposition of the iterator. -/
theorem iter_succ_mem {rs : List Rule} {fs : List Fact} {n : Nat} {t : Tuple} :
    t ∈ iter rs fs (n+1) →
      t ∈ iter rs fs n ∨
        ∃ r ∈ rs, ∃ σ, σ ∈ joinBody [] r.body (iter rs fs n) ∧
          instLit σ r.head = some t := by
  intro h
  rcases mem_round h with hts | ⟨r, hr, hf⟩
  · exact Or.inl hts
  · obtain ⟨σ, hσ, hinst⟩ := fire_mem hf
    exact Or.inr ⟨r, hr, σ, hσ, hinst⟩

/-- Characterization: a derivable tuple is either a seed fact or the conclusion
    of a rule application over derivable premises. -/
theorem derivable_unfold {rs : List Rule} {fs : List Fact} {t : Tuple} :
    Derivable rs fs t →
      t ∈ seed fs ∨
        ∃ r ∈ rs, ∃ σ, instLit σ r.head = some t ∧
          ∀ l ∈ r.body, ∃ u, instLit σ l = some u ∧ Derivable rs fs u := by
  intro hd
  obtain ⟨n, h⟩ := hd
  induction n generalizing t with
  | zero => exact Or.inl h
  | succ n ih =>
    rcases iter_succ_mem h with hprev | ⟨r, hr, σ, hσ, hinst⟩
    · exact ih hprev
    · refine Or.inr ⟨r, hr, σ, hinst, ?_⟩
      intro l hl
      obtain ⟨u, hut, hui⟩ := joinBody_sound hσ l hl
      exact ⟨u, hui, ⟨n, hut⟩⟩


/-! ## Derivation checker

A derivation graph is a list of *nodes* whose premises reference earlier nodes
by position — an acyclic-by-construction finite DAG.  `valid` is the executable
checker: it is defined independently of `iter`, and `valid_sound` proves that
every conclusion a valid graph asserts is derivable. -/

/-- One node of a derivation graph: either a base fact (`rule = none`) or a
    rule application whose premises are indices of earlier nodes. -/
structure DerivNode where
  rule : Option (Rule × Subst)
  conclusion : Tuple
  premises : List Nat
  deriving DecidableEq

/-- Pairwise premise check: literal `l` must be satisfied by the conclusion of
    node `ds[j]` with `j < i` (indices point strictly backwards, so the graph is
    acyclic by construction). -/
def premisesOK (σ : Subst) (ds : List DerivNode) (i : Nat) :
    List Literal → List Nat → Bool
  | [], [] => true
  | l :: ls, j :: js =>
      (match ds[j]? with
       | some dj => decide (instLit σ l = some dj.conclusion) && decide (j < i)
       | none => false) && premisesOK σ ds i ls js
  | _, _ => false

/-- Single-node validity. -/
def nodeValid (rs : List Rule) (fs : List Fact) (ds : List DerivNode)
    (i : Nat) (d : DerivNode) : Bool :=
  match d.rule with
  | none => decide (d.premises = [] ∧ d.conclusion ∈ seed fs)
  | some (r, σ) =>
      decide (r ∈ rs) &&
      decide (instLit σ r.head = some d.conclusion) &&
      premisesOK σ ds i r.body d.premises

/-- Check nodes `cur` starting at index `i`. -/
def validFrom (rs : List Rule) (fs : List Fact) (ds : List DerivNode) :
    Nat → List DerivNode → Bool
  | _, [] => true
  | i, d :: rest => nodeValid rs fs ds i d && validFrom rs fs ds (i+1) rest

/-- The full checker: every node valid in the whole list. -/
def valid (rs : List Rule) (fs : List Fact) (ds : List DerivNode) : Bool :=
  validFrom rs fs ds 0 ds

/-- Positional reading of `validFrom`. -/
theorem validFrom_at {rs : List Rule} {fs : List Fact} {ds : List DerivNode} :
    ∀ {i} {cur}, validFrom rs fs ds i cur = true →
      ∀ {j : Nat} {d : DerivNode}, cur[j]? = some d →
        nodeValid rs fs ds (i + j) d = true := by
  intro i cur h
  induction cur generalizing i with
  | nil => intro j d hj; cases j <;> simp at hj
  | cons d0 rest ih =>
    intro j d hj
    simp only [validFrom, Bool.and_eq_true] at h
    obtain ⟨hd0, hrest⟩ := h
    cases j with
    | zero =>
      rw [List.getElem?_cons_zero] at hj
      have hd0eq : d0 = d := Option.some_inj.mp hj
      subst hd0eq
      exact hd0
    | succ j =>
      have hj' : rest[j]? = some d := hj
      have hthis := ih hrest hj'
      rw [show i + (j+1) = (i+1) + j by omega]
      exact hthis

/-- Index of a member: every list element is `xs[i]` for some `i`. -/
theorem mem_getElem {α : Type} {x : α} {xs : List α} :
    x ∈ xs → ∃ i : Nat, xs[i]? = some x := by
  intro h
  induction xs with
  | nil => cases h
  | cons a as ih =>
    cases h with
    | head => exact ⟨0, rfl⟩
    | tail _ hm =>
      obtain ⟨i, hi⟩ := ih hm
      exact ⟨i+1, hi⟩

/-- Soundness of the premise check: each checked literal is satisfied by the
    conclusion of an earlier valid node. -/
theorem premisesOK_derivable {σ : Subst} {ds : List DerivNode} {i : Nat}
    {rs : List Rule} {fs : List Fact}
    (hd : ∀ j, j < i → ∀ dj : DerivNode, ds[j]? = some dj → Derivable rs fs dj.conclusion) :
    ∀ {ls : List Literal} {js : List Nat},
      premisesOK σ ds i ls js = true →
      ∀ l ∈ ls, ∃ u, instLit σ l = some u ∧ Derivable rs fs u := by
  intro ls
  induction ls with
  | nil => intro js _ l hl; cases hl
  | cons l ls ih =>
    intro js h l' hl'
    cases js with
    | nil => simp [premisesOK] at h
    | cons j js =>
      simp only [premisesOK] at h
      cases hdq : ds[j]? with
      | none => rw [hdq] at h; simp at h
      | some dj =>
        rw [hdq] at h
        simp only [Bool.and_eq_true, decide_eq_true_eq] at h
        obtain ⟨⟨hinst, hjlt⟩, hrest⟩ := h
        cases hl' with
        | head =>
          exact ⟨dj.conclusion, hinst, hd j hjlt dj hdq⟩
        | tail _ hm => exact ih hrest _ hm

/-- Correctness of the checker: every conclusion of every node in a valid
    derivation graph is derivable. -/
theorem valid_sound {rs : List Rule} {fs : List Fact} (hsafe : ∀ r ∈ rs, Safe r)
    {ds : List DerivNode} (hv : valid rs fs ds = true) :
    ∀ {d : DerivNode}, d ∈ ds → Derivable rs fs d.conclusion := by
  intro d hd
  obtain ⟨i, hi⟩ := mem_getElem hd
  have key : ∀ n : Nat, ∀ j : Nat, j < n → ∀ dj : DerivNode, ds[j]? = some dj →
      Derivable rs fs dj.conclusion := by
    intro n
    induction n with
    | zero => intro j hj _ _; cases hj
    | succ n ihn =>
      intro j hj dj hdj
      by_cases hjn : j < n
      · exact ihn j hjn dj hdj
      · have hje : j = n := by omega
        subst hje
        have hnv : nodeValid rs fs ds j dj = true := by
          have hv' := validFrom_at hv hdj
          rw [Nat.zero_add] at hv'
          exact hv'
        cases hdr : dj.rule with
        | none =>
          simp only [nodeValid, hdr] at hnv
          obtain ⟨_, hbase⟩ := of_decide_eq_true hnv
          exact derivable_base hbase
        | some p =>
          obtain ⟨r, σ⟩ := p
          simp only [nodeValid, hdr] at hnv
          simp only [Bool.and_eq_true, decide_eq_true_eq] at hnv
          obtain ⟨⟨hr, hinst⟩, hpok⟩ := hnv
          have hbody : ∀ l ∈ r.body, ∃ u, instLit σ l = some u ∧ Derivable rs fs u :=
            premisesOK_derivable (fun j' hj' dj' hd' => ihn j' hj' dj' hd') hpok
          exact derivable_step hsafe hr hbody hinst
  obtain ⟨hilt, _⟩ := List.getElem?_eq_some_iff.mp hi
  exact key ds.length i hilt d hi
