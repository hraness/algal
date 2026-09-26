import Algal.Replay.Model

/-!
# Replay, verification and resume — proved properties

Evidence classes for every theorem:

* **model-proved**: a theorem of the `Algal.Replay` model — evidence that the
  *modelled* semantics has the property. The correspondence to
  `src/run.ts`/`src/verify.ts`/`src/effects.ts`/`src/store-memory.ts` is the
  argument of `Model.lean`'s docstrings and the readback tests in
  `verify/replay/`; nothing here is a refinement proof.
* **witness**: a concrete computation (`decide`-checked) that an admitted or
  rejected shape exists — positive and negative examples of the modelled
  rules.

The load-bearing theorem is `steps_replay_reproduces`: replaying a run under
its own produced effect tape reproduces the run exactly — under *any* live
oracle, because every dispatch resolves in the tape. That is the whole
meaning of "verification" here: a verifying receipt is a self-consistent
receipt — rerunning the manifest against its recorded oracle mints it again.
Provenance of the oracle's answers is deliberately out of the claim.
-/

set_option autoImplicit false
namespace Algal.Replay

open Algal.Core.Json (Value)
open Algal.Core.OwnMap (lookup)
open List (Sublist)

/-! ## Tape mechanics: occurrence-ordered service -/

@[simp] theorem serve_nil (req : Request) : serve [] req = none := rfl

theorem serve_cons_eq (r : EffectRecord) (rest : Tape) (req : Request)
    (h : r.request = req) : serve (r :: rest) req = some (r, rest) := by
  simp [serve, h]

theorem serve_cons_ne (r : EffectRecord) (rest : Tape) (req : Request)
    (h : r.request ≠ req) :
    serve (r :: rest) req = (serve rest req).map (fun p => (p.1, r :: p.2)) := by
  simp [serve, h]

/-- A served record answers the issued request — binding by request
    digest. (model-proved) -/
theorem serve_request : ∀ {t : Tape} {req : Request} {r : EffectRecord} {t' : Tape},
    serve t req = some (r, t') → r.request = req := by
  intro t
  induction t with
  | nil => intro req r t' h; simp [serve] at h
  | cons hd tl ih =>
    intro req r t' h
    by_cases heq : hd.request = req
    · rw [serve_cons_eq _ _ _ heq] at h; cases h; exact heq
    · rw [serve_cons_ne _ _ _ heq] at h
      cases hs : serve tl req with
      | none => simp [hs] at h
      | some p =>
        obtain ⟨pr, pt⟩ := p
        rw [hs] at h
        simp only [Option.map_some] at h
        cases h
        exact ih hs

/-- Replay can only answer with recorded evidence: a served record is a
    member of the tape it was served from. (model-proved) -/
theorem serve_mem : ∀ {t : Tape} {req : Request} {r : EffectRecord} {t' : Tape},
    serve t req = some (r, t') → r ∈ t := by
  intro t
  induction t with
  | nil => intro req r t' h; simp [serve] at h
  | cons hd tl ih =>
    intro req r t' h
    by_cases heq : hd.request = req
    · rw [serve_cons_eq _ _ _ heq] at h; cases h
      exact List.mem_cons.mpr (Or.inl rfl)
    · rw [serve_cons_ne _ _ _ heq] at h
      cases hs : serve tl req with
      | none => simp [hs] at h
      | some p =>
        obtain ⟨pr, pt⟩ := p
        rw [hs] at h
        simp only [Option.map_some] at h
        cases h
        exact List.mem_cons.mpr (Or.inr (ih hs))

/-- Service consumes the served occurrence: the remainder is a sublist of
    the tape. (model-proved) -/
theorem serve_sublist : ∀ {t : Tape} {req : Request} {r : EffectRecord} {t' : Tape},
    serve t req = some (r, t') → Sublist t' t := by
  intro t
  induction t with
  | nil => intro req r t' h; simp [serve] at h
  | cons hd tl ih =>
    intro req r t' h
    by_cases heq : hd.request = req
    · rw [serve_cons_eq _ _ _ heq] at h; cases h
      exact List.sublist_cons_self hd tl
    · rw [serve_cons_ne _ _ _ heq] at h
      cases hs : serve tl req with
      | none => simp [hs] at h
      | some p =>
        obtain ⟨pr, pt⟩ := p
        rw [hs] at h
        simp only [Option.map_some] at h
        cases h
        exact Sublist.cons_cons hd (ih hs)

/-- The miss set is exact: nothing on the tape carries this request digest.
    (model-proved) -/
theorem serve_none_iff : ∀ {t : Tape} {req : Request},
    serve t req = none ↔ ∀ r ∈ t, r.request ≠ req := by
  intro t
  induction t with
  | nil =>
    intro req
    constructor
    · intro _ _ hm; cases hm
    · intro _; rfl
  | cons hd tl ih =>
    intro req
    by_cases heq : hd.request = req
    · rw [serve_cons_eq _ _ _ heq]
      constructor
      · intro h; cases h
      · intro hall
        exact absurd heq (hall hd (List.mem_cons.mpr (Or.inl rfl)))
    · rw [serve_cons_ne _ _ _ heq]
      constructor
      · intro h r hr hreq
        have hnone : serve tl req = none := by
          cases hs : serve tl req with
          | none => rfl
          | some p => rw [hs] at h; simp at h
        cases List.mem_cons.mp hr with
        | inl he => exact heq (he ▸ hreq)
        | inr hm => exact (ih.mp hnone) r hm hreq
      · intro hall
        have htl := ih.mpr (fun r hm => hall r (List.mem_cons.mpr (Or.inr hm)))
        rw [htl]
        rfl

/-- Occurrence order: service returns the first recorded occurrence for this
    request and the remainder preserves the rest in order — the "repeated
    requests tracked by occurrence" property. (model-proved) -/
theorem serve_occurrence : ∀ {t : Tape} {req : Request} {r : EffectRecord} {t' : Tape},
    serve t req = some (r, t') →
      occurrences t req = r :: occurrences t' req := by
  intro t
  induction t with
  | nil => intro req r t' h; simp [serve] at h
  | cons hd tl ih =>
    intro req r t' h
    by_cases heq : hd.request = req
    · rw [serve_cons_eq _ _ _ heq] at h
      cases h
      simp [occurrences, heq]
    · rw [serve_cons_ne _ _ _ heq] at h
      cases hs : serve tl req with
      | none => simp [hs] at h
      | some p =>
        obtain ⟨pr, pt⟩ := p
        rw [hs] at h
        simp only [Option.map_some] at h
        cases h
        have ihh := ih hs
        have hdrop : occurrences (hd :: pt) req = occurrences pt req := by
          simp [occurrences, heq]
        have hdrop' : occurrences (hd :: tl) req = occurrences tl req := by
          simp [occurrences, heq]
        rw [hdrop', hdrop]
        exact ihh

/-! ## Dispatch: replay precedes any live route -/

/-- A tape hit resolves the dispatch verbatim — the recorded executor,
    usage, cached, retryable, wake and configuration metadata are served
    unmodified and the live oracle is never consulted. (model-proved) -/
theorem dispatch_serve_hit (cfg : Cfg) {t : Tape} {req : Request}
    {r : EffectRecord} {t' : Tape} (h : serve t req = some (r, t')) :
    dispatch cfg t req = (r, t') := by
  simp [dispatch, h]

/-- Equational form for the miss case: the armed no-fallthrough tool gate,
    then the live oracle, then the `unbound` arm. -/
theorem dispatch_miss {cfg : Cfg} {t : Tape} {req : Request}
    (h : serve t req = none) :
    dispatch cfg t req =
      (if req.kind = .tool ∧ cfg.toolArmed ∧ ¬ cfg.toolFallthrough then
         (unboundRecord req, t)
       else
         match cfg.live req with
         | some (reply, mta) => (⟨req, reply, mta⟩, t)
         | none => (unboundRecord req, t)) := by
  unfold dispatch
  rw [h]
  rfl

/-- Every produced record names the request that was issued — whether it was
    served, live-answered, or unbound. (model-proved) -/
theorem dispatch_request (cfg : Cfg) {t : Tape} {req : Request}
    {r : EffectRecord} {t' : Tape} (h : dispatch cfg t req = (r, t')) :
    r.request = req := by
  cases hs : serve t req with
  | none =>
    rw [dispatch_miss hs] at h
    split at h
    · cases h; rfl
    · cases hl : cfg.live req with
      | none =>
        rw [hl] at h; cases h; rfl
      | some a =>
        rw [hl] at h; dsimp only at h; cases h; rfl
  | some hit =>
    rw [dispatch_serve_hit cfg hs] at h
    cases h
    exact serve_request hs

/-- A record the dispatch can mint without a tape hit: a live-oracle answer
    carrying the issued request, or the `unbound` failure record. -/
def Fresh (live : Live) (r : EffectRecord) : Prop :=
  (∃ req a, live req = some a ∧ r = ⟨req, a.1, a.2⟩) ∨
  (∃ req, r = unboundRecord req)

/-- Dispatch never invents: a produced record is either a member of the tape
    it was served from, or a fresh live/unbound record. (model-proved) -/
theorem dispatch_sourced (cfg : Cfg) {t : Tape} {req : Request}
    {r : EffectRecord} {t' : Tape} (h : dispatch cfg t req = (r, t')) :
    r ∈ t ∨ Fresh cfg.live r := by
  cases hs : serve t req with
  | none =>
    rw [dispatch_miss hs] at h
    split at h
    · cases h
      exact Or.inr (Or.inr ⟨req, rfl⟩)
    · cases hl : cfg.live req with
      | none =>
        rw [hl] at h; dsimp only at h; cases h
        exact Or.inr (Or.inr ⟨req, rfl⟩)
      | some a =>
        rw [hl] at h; dsimp only at h; cases h
        exact Or.inr (Or.inl ⟨req, a, hl, rfl⟩)
  | some hit =>
    rw [dispatch_serve_hit cfg hs] at h
    cases h
    exact Or.inl (serve_mem hs)

/-- Dispatch only consumes tape: the remaining tape is a sublist.
    (model-proved) -/
theorem dispatch_sublist (cfg : Cfg) {t : Tape} {req : Request}
    {r : EffectRecord} {t' : Tape} (h : dispatch cfg t req = (r, t')) :
    Sublist t' t := by
  cases hs : serve t req with
  | none =>
    rw [dispatch_miss hs] at h
    split at h
    · cases h; exact Sublist.refl t
    · cases hl : cfg.live req with
      | none =>
        rw [hl] at h; dsimp only at h; cases h; exact Sublist.refl t
      | some a =>
        rw [hl] at h; dsimp only at h; cases h; exact Sublist.refl t
  | some hit =>
    rw [dispatch_serve_hit cfg hs] at h
    cases h
    exact serve_sublist hs

/-- Under any configuration with no live oracle a tape miss is always the
    unbound failure record — the armed no-fallthrough tool gate and the
    `noLive` arm both settle `EFFECT_UNBOUND`. Verification's whole dispatch
    is this case: replaying never reaches a provider or tool.
    (model-proved) -/
theorem dispatch_miss_unbound {cfg : Cfg} {t : Tape} {req : Request}
    (h : serve t req = none) (hlive : cfg.live req = none) :
    dispatch cfg t req = (unboundRecord req, t) := by
  rw [dispatch_miss h]
  split
  · rfl
  · rw [hlive]

/-- `verify`'s configuration admits no live dispatch. (model-proved) -/
theorem verifyCfg_dispatch_miss (r : Receipt) (store : CasView)
    {t : Tape} {req : Request} (h : serve t req = none) :
    dispatch (verifyCfg r store) t req = (unboundRecord req, t) :=
  dispatch_miss_unbound h rfl

/-- A record fresh under `noLive` is the unbound record. (model-proved) -/
theorem fresh_nolive {r : EffectRecord} : Fresh noLive r →
    ∃ req, r = unboundRecord req := by
  intro h
  cases h with
  | inl hl =>
    obtain ⟨req, a, h, _⟩ := hl
    simp [noLive] at h
  | inr hr => exact hr

/-! ## Run agreement modulo the remaining tape -/

/-- Two run triples agree modulo the remaining replay tape: produced lists,
    histories, overlays, write logs, step counts and end markers all equal.
    The tape position itself is unconstrained. -/
def RunAgree (a b : Tape × St × EndMarker) : Prop :=
  a.1 = b.1 ∧ a.2.1.hist = b.2.1.hist ∧ a.2.1.slots = b.2.1.slots ∧
    a.2.1.writes = b.2.1.writes ∧ a.2.1.steps = b.2.1.steps ∧ a.2.2 = b.2.2

/-! ## Run-level sourcing: the produced tape is closed -/

/-- Every produced effect was either served from the initial tape or minted
    fresh by the admitted live oracle (or unbound). Replay never invents a
    record; the produced history is sourced. (model-proved) -/
theorem steps_sourced : ∀ (fuel : Nat) (cfg : Cfg) (p : Program) (args : Value)
    (s : St) (r : EffectRecord),
    r ∈ (steps cfg p args fuel s).1 → r ∈ s.tape ∨ Fresh cfg.live r := by
  intro fuel
  induction fuel with
  | zero =>
    intro cfg p args s r h
    simp [steps] at h
  | succ fuel ih =>
    intro cfg p args s r h
    simp only [steps] at h
    cases hd : p.decide args s.hist with
    | done o f =>
      rw [hd] at h; dsimp only at h; simp at h
    | request req =>
      rw [hd] at h; dsimp only at h
      cases hdd : dispatch cfg s.tape req with
      | mk rec t₁ =>
        rw [hdd] at h; dsimp only at h
        cases hrep : rec.reply with
        | output v =>
          rw [hrep] at h; dsimp only at h
          cases List.mem_cons.mp h with
          | inl he =>
            cases he
            exact dispatch_sourced cfg hdd
          | inr hm =>
            have ihh := ih cfg p args _ r hm
            cases ihh with
            | inl hmem =>
              exact Or.inl (List.Sublist.mem hmem (dispatch_sublist cfg hdd))
            | inr hf => exact Or.inr hf
        | failure c =>
          rw [hrep] at h; dsimp only at h
          cases List.mem_cons.mp h with
          | inl he =>
            cases he
            exact dispatch_sourced cfg hdd
          | inr hm =>
            have ihh := ih cfg p args _ r hm
            cases ihh with
            | inl hmem =>
              exact Or.inl (List.Sublist.mem hmem (dispatch_sublist cfg hdd))
            | inr hf => exact Or.inr hf
        | suspended =>
          rw [hrep] at h; dsimp only at h
          have he : r = rec := List.mem_singleton.mp h
          cases he
          exact dispatch_sourced cfg hdd
    | readSlot path name =>
      rw [hd] at h; dsimp only at h
      have ihh := ih cfg p args _ r h
      cases ihh with
      | inl hmem => exact Or.inl hmem
      | inr hf => exact Or.inr hf
    | writeSlot path name data =>
      rw [hd] at h; dsimp only at h
      split at h
      · rename_i hpos
        have ihh := ih cfg p args _ r h
        cases ihh with
        | inl hmem => exact Or.inl hmem
        | inr hf => exact Or.inr hf
      · rename_i hneg
        have ihh := ih cfg p args _ r h
        cases ihh with
        | inl hmem => exact Or.inl hmem
        | inr hf => exact Or.inr hf

/-- Every slot mutation the run performed came from an unsettled write
    directive — a settled prefix write is never re-executed.
    (model-proved) -/
theorem steps_writes_unsettled : ∀ (fuel : Nat) (cfg : Cfg) (p : Program)
    (args : Value) (s : St) (w : String × String × Value),
    w ∈ (steps cfg p args fuel s).2.1.writes →
      w ∈ s.writes ∨ cfg.settledWrites w.1 = false := by
  intro fuel
  induction fuel with
  | zero =>
    intro cfg p args s w h
    simp [steps] at h
    exact Or.inl h
  | succ fuel ih =>
    intro cfg p args s w h
    simp only [steps] at h
    cases hd : p.decide args s.hist with
    | done o f =>
      rw [hd] at h; dsimp only at h; exact Or.inl h
    | request req =>
      rw [hd] at h; dsimp only at h
      cases hdd : dispatch cfg s.tape req with
      | mk rec t₁ =>
        rw [hdd] at h; dsimp only at h
        cases hrep : rec.reply with
        | output v =>
          rw [hrep] at h; dsimp only at h
          have ihh := ih cfg p args _ w h
          exact ihh
        | failure c =>
          rw [hrep] at h; dsimp only at h
          have ihh := ih cfg p args _ w h
          exact ihh
        | suspended =>
          rw [hrep] at h; dsimp only at h
          exact Or.inl h
    | readSlot path name =>
      rw [hd] at h; dsimp only at h
      have ihh := ih cfg p args _ w h
      exact ihh
    | writeSlot path name data =>
      rw [hd] at h; dsimp only at h
      split at h
      · rename_i hpos
        have ihh := ih cfg p args _ w h
        exact ihh
      · rename_i hneg
        have ihh := ih cfg p args _ w h
        cases ihh with
        | inl hmem =>
          cases List.mem_append.mp hmem with
          | inl hold => exact Or.inl hold
          | inr hnew =>
            have hw : w = (path, name, data) := List.mem_singleton.mp hnew
            cases hw
            exact Or.inr (Bool.eq_false_iff.mpr hneg)
        | inr hf => exact Or.inr hf

/-! ## The central theorem: replay under its own effects reproduces the run -/

theorem resolveSlotRead_congr {cfg cfg' : Cfg} {table : SlotTable}
    {path name : String}
    (h : cfg.slots path = cfg'.slots path) :
    resolveSlotRead cfg table path name = resolveSlotRead cfg' table path name := by
  simp [resolveSlotRead, h]

/-- Replaying a run under the tape of records it produced reproduces that run
    exactly — under *any* configuration whose recorded slot answers and
    settled-write marks agree. The replayed dispatch always finds the next
    produced occurrence at the tape head, so the live oracle is never
    consulted: this is what makes verification offline, and what limits its
    meaning to self-consistency. (model-proved) -/
theorem steps_replay_reproduces
    (cfg cfg' : Cfg) (p : Program) (args : Value) :
    ∀ (fuel : Nat) (s : St),
    (∀ path, cfg.slots path = cfg'.slots path) →
    (∀ path, cfg.settledWrites path = cfg'.settledWrites path) →
    RunAgree (steps cfg' p args fuel { s with tape := (steps cfg p args fuel s).1 })
             (steps cfg p args fuel s) := by
  intro fuel
  induction fuel with
  | zero =>
    intro s _ _
    exact ⟨rfl, rfl, rfl, rfl, rfl, rfl⟩
  | succ fuel ih =>
    intro s hslots hsettled
    simp only [steps]
    cases hd : p.decide args s.hist with
    | done o f =>
      dsimp only
      exact ⟨rfl, rfl, rfl, rfl, rfl, rfl⟩
    | request req =>
      dsimp only
      cases hdd : dispatch cfg s.tape req with
      | mk rec t₁ =>
        dsimp only
        have hreq : rec.request = req := dispatch_request cfg hdd
        cases hrep : rec.reply with
        | output v =>
          dsimp only
          rw [dispatch_serve_hit cfg' (serve_cons_eq rec _ req hreq)]
          dsimp only
          rw [hrep]
          dsimp only
          cases hsub : steps cfg p args fuel { s with tape := t₁, hist := s.hist ++ [.output v], steps := s.steps + 1 } with
          | mk L stE =>
            cases stE with
            | mk st₁ e₁ =>
              dsimp only
              have ihh := ih { s with tape := t₁, hist := s.hist ++ [.output v], steps := s.steps + 1 } hslots hsettled
              rw [hsub] at ihh
              dsimp only at ihh
              obtain ⟨i1, i2, i3, i4, i5, i6⟩ := ihh
              exact ⟨congrArg (fun l => rec :: l) i1, i2, i3, i4, i5, i6⟩
        | failure c =>
          dsimp only
          rw [dispatch_serve_hit cfg' (serve_cons_eq rec _ req hreq)]
          dsimp only
          rw [hrep]
          dsimp only
          cases hsub : steps cfg p args fuel { s with tape := t₁, hist := s.hist ++ [.failure c], steps := s.steps + 1 } with
          | mk L stE =>
            cases stE with
            | mk st₁ e₁ =>
              dsimp only
              have ihh := ih { s with tape := t₁, hist := s.hist ++ [.failure c], steps := s.steps + 1 } hslots hsettled
              rw [hsub] at ihh
              dsimp only at ihh
              obtain ⟨i1, i2, i3, i4, i5, i6⟩ := ihh
              exact ⟨congrArg (fun l => rec :: l) i1, i2, i3, i4, i5, i6⟩
        | suspended =>
          dsimp only
          rw [dispatch_serve_hit cfg' (serve_cons_eq rec [] req hreq)]
          dsimp only
          rw [hrep]
          dsimp only
          exact ⟨rfl, rfl, rfl, rfl, rfl, rfl⟩
    | readSlot path name =>
      dsimp only
      have hread : resolveSlotRead cfg' s.slots path name =
          resolveSlotRead cfg s.slots path name :=
        resolveSlotRead_congr (hslots path).symm
      rw [hread]
      exact ih { s with hist := s.hist ++ [resolveSlotRead cfg s.slots path name], steps := s.steps + 1 } hslots hsettled
    | writeSlot path name data =>
      dsimp only
      rw [hsettled path]
      cases hb : cfg'.settledWrites path
      · exact ih { s with slots := (name, data) :: s.slots, writes := s.writes ++ [(path, name, data)], hist := s.hist ++ [.output data], steps := s.steps + 1 } hslots hsettled
      · exact ih { s with hist := s.hist ++ [.output data], steps := s.steps + 1 } hslots hsettled

/-! ## Lift to runs and receipts -/

/-- `closureSatisfied` depends on the closed `cas` view only. -/
theorem closureSatisfied_congr {p : Program} {cfg cfg' : Cfg}
    (h : cfg.cas = cfg'.cas) :
    closureSatisfied cfg p = closureSatisfied cfg' p := by
  simp [closureSatisfied, h]

/-- Run-level reproduction: under an equal closure view, recorded slot
    answers and settled-write marks, replaying a produced tape reproduces the
    run — produced list, history, writes, end marker, step count.

    *Narrowed from the original draft*: the replayed run must start from the
    same slot overlay (`init`) as the recorded run. An unrecorded slot read
    resolves against the overlay (`resolveSlotRead`'s `none` arm), so
    replaying over a different overlay can diverge — the draft's `init = []`
    regardless of the original overlay was false. For verification the
    original overlay is always empty, so nothing is lost. (model-proved) -/
theorem run_replay_reproduces {cfg : Cfg} {p : Program} {args : Value}
    {tape : Tape} {init : SlotTable} {res : RunResult} {cfg' : Cfg}
    (hrun : run cfg p args tape init = .ok res)
    (hcas : cfg.cas = cfg'.cas)
    (hslots : ∀ path, cfg.slots path = cfg'.slots path)
    (hsettled : ∀ path, cfg.settledWrites path = cfg'.settledWrites path) :
    run cfg' p args res.produced init = .ok res := by
  unfold run at hrun
  cases hst₀ : steps cfg p args p.maxCalls { tape := tape, slots := init } with
  | mk prod₀ stE₀ =>
    cases stE₀ with
    | mk st₀ e₀ =>
      rw [hst₀] at hrun
      dsimp only at hrun
      split at hrun
      · rename_i hcl
        unfold run
        cases hst : steps cfg' p args p.maxCalls { tape := res.produced, slots := init } with
        | mk prod' stE =>
          cases stE with
          | mk st' e' =>
            dsimp only
            split
            · rename_i hcl'
              cases hrun
              refine congrArg Except.ok ?_
              have ihh := steps_replay_reproduces cfg cfg' p args p.maxCalls
                { tape := tape, slots := init } hslots hsettled
              rw [hst₀] at ihh
              have ihh2 : RunAgree (steps cfg' p args p.maxCalls
                  { tape := prod₀, slots := init }) (prod₀, st₀, e₀) := ihh
              have hsymm : steps cfg' p args p.maxCalls
                  { tape := prod₀, slots := init } = (prod', st', e') := hst
              rw [hsymm] at ihh2
              obtain ⟨i1, i2, _i3, i4, i5, i6⟩ := ihh2
              dsimp only at i1 i2 i4 i5 i6
              simp only [RunResult.mk.injEq]
              exact ⟨i1, i2, i4, i6, i5⟩
            · rename_i hcon
              exact absurd (closureSatisfied_congr hcas ▸ hcl) hcon
      · rename_i hcon
        cases hrun

/-! ## Field comparison totality -/

/-- An admitted-field list that is empty forces the `if` condition — i.e. the
    compared values were equal. -/
theorem ite_nil_left {c : Prop} [Decidable c] {m : Mismatch} :
    (if c then ([] : List Mismatch) else [m]) = [] → c := by
  intro h
  by_cases hc : c
  · exact hc
  · rw [ite_eq_right hc] at h
    exact absurd h (List.cons_ne_nil _ _)

/-- `diffFields` is a complete comparison of the admitted fields: an empty
    diff means the fields were identical. (model-proved) -/
theorem diffFields_nil {a b : Fields} (h : diffFields a b = []) : a = b := by
  unfold diffFields at h
  simp only [List.append_eq_nil_iff] at h
  -- simp only produces a left-nested conjunction; peel from the right.
  have hman := ite_nil_left h.2
  have hkey := ite_nil_left h.1.2
  have hrun := ite_nil_left h.1.1.2
  have harg := ite_nil_left h.1.1.1.2
  have hfai := ite_nil_left h.1.1.1.1.2
  have hwrk := ite_nil_left h.1.1.1.1.1.2
  have hevt := ite_nil_left h.1.1.1.1.1.1.2
  have heff := ite_nil_left h.1.1.1.1.1.1.1.2
  have hcel := ite_nil_left h.1.1.1.1.1.1.1.1.2
  have hout := ite_nil_left h.1.1.1.1.1.1.1.1.1
  cases a; cases b
  simp only [Fields.mk.injEq]
  exact ⟨hrun, hman, hkey, harg, hout, hcel, heff, hevt, hwrk, hfai⟩

/-- `diffReceipts` is total: an empty diff is literal receipt equality —
    every admitted field compared, digest included. (model-proved) -/
theorem diffReceipts_total {a b : Receipt} (h : diffReceipts a b = []) : a = b := by
  unfold diffReceipts at h
  cases hn : diffFields a.fields b.fields with
  | nil =>
    rw [hn] at h
    have h' : (if a.digest = b.digest then ([] : List Mismatch) else [.digest]) = [] := h
    have hdig : a.digest = b.digest := ite_nil_left h'
    have hf := diffFields_nil hn
    cases a; cases b
    simp only [Receipt.mk.injEq]
    exact ⟨hf, hdig⟩
  | cons m ms =>
    rw [hn] at h
    have h' : m :: ms = [] := h
    cases h'

/-- Reflexive receipts diff to the empty list. -/
theorem diffReceipts_self (a : Receipt) : diffReceipts a a = [] := by
  simp [diffReceipts, diffFields]

/-- Any field difference produces a named mismatch — no admitted field
    escapes comparison. (model-proved) -/
theorem diffFields_detects {a b : Fields} (h : a ≠ b) : diffFields a b ≠ [] :=
  fun he => h (diffFields_nil he)

/-! ## Verification: a verifying receipt is a self-consistent replay -/

/-- Characterization: `verify r p store = .verified` iff the receipt's
    manifest matches, the recorded tape is replayable under `noLive`, and
    the receipt is *exactly* the rerun minted with the receipt's own
    runtime stamp. Soundness and completeness of the produced history in
    one statement — the receipt cannot contain anything the replay did not
    produce, and cannot omit anything it did. (model-proved) -/
theorem verify_iff (r : Receipt) (p : Program) (store : CasView) :
    verify r p store = .verified ↔
      r.fields.manifest = p.manifest ∧
      ∃ res, run (verifyCfg r store) p r.fields.args r.fields.effects = .ok res ∧
             r = mint p r.fields.args res r.fields.runtime := by
  unfold verify
  by_cases hm : r.fields.manifest = p.manifest
  · rw [ite_eq_right (show ¬(r.fields.manifest ≠ p.manifest) from fun h => h hm)]
    cases hr : run (verifyCfg r store) p r.fields.args r.fields.effects with
    | error e =>
      dsimp only
      constructor
      · intro hv; cases hv
      · intro ⟨_, res', hrun', _⟩
        cases hrun'
    | ok res =>
      dsimp only
      constructor
      · intro hv
        refine ⟨hm, res, rfl, ?_⟩
        split at hv
        · rename_i hd'
          exact diffReceipts_total (List.isEmpty_iff.mp hd')
        · cases hv
      · intro ⟨_, res', hrun', hr'⟩
        cases hrun'
        rw [← hr']
        rw [diffReceipts_self]
        split
        · rfl
        · rename_i hcon
          exact absurd rfl hcon
  · rw [ite_eq_left hm]
    constructor
    · intro hv; cases hv
    · intro ⟨hcontra, _⟩
      exact absurd hcontra hm

/-- A verifying receipt is digest-consistent — and conversely, verify makes
    the `consistent` check redundant for admission (it is only needed where
    no rerun happens, e.g. tooling that trusts the receipt as data). -/
theorem verify_consistent (r : Receipt) (p : Program) (store : CasView)
    (h : verify r p store = .verified) : consistent r := by
  rw [verify_iff] at h
  obtain ⟨_, res, _, hr⟩ := h
  show r.digest = r.fields
  rw [hr]
  rfl

/-- Manifest mismatch is rejected before any replay work. (model-proved) -/
theorem verify_rejects_manifest (r : Receipt) (p : Program) (store : CasView)
    (h : r.fields.manifest ≠ p.manifest) :
    verify r p store = .mismatch [.manifestDigest] := by
  unfold verify
  rw [ite_eq_left h]

/-- Completeness: the minted receipt of a genuine run always verifies, given
    the same closed `cas`, the recorded slot answers the run saw, and a run
    that was not resumed (no settled writes). Any `stamp` — including a
    fabricated one — is admitted: the stamp is a claim carried by the
    receipt, never evidence about the executor. (model-proved) -/
theorem verify_produced_verifies
    {cfg : Cfg} {p : Program} {args : Value} {tape : Tape}
    {res : RunResult} {store : CasView} {stamp : Stamp}
    (hrun : run cfg p args tape [] = .ok res)
    (hcas : cfg.cas = store)
    (hslots : ∀ path, cfg.slots path = replaySlotsOf (p.cellsOf args res.hist) path)
    (hsettled : ∀ path, cfg.settledWrites path = false) :
    verify (mint p args res stamp) p store = .verified := by
  rw [verify_iff]
  refine ⟨rfl, res, ?_, rfl⟩
  exact run_replay_reproduces hrun hcas hslots hsettled

/-- The stamped-runtime claim is forgeable: a receipt minted from a genuine
    run but stamped with an arbitrary claimed runtime still verifies.
    `runtime` is receipt *input*, not derived provenance. (model-proved) -/
theorem fabricated_stamp_verifies
    {cfg : Cfg} {p : Program} {args : Value} {tape : Tape}
    {res : RunResult} {store : CasView}
    (hrun : run cfg p args tape [] = .ok res)
    (hcas : cfg.cas = store)
    (hslots : ∀ path, cfg.slots path = replaySlotsOf (p.cellsOf args res.hist) path)
    (hsettled : ∀ path, cfg.settledWrites path = false)
    (claimed : Stamp) :
    verify (mint p args res claimed) p store = .verified :=
  verify_produced_verifies hrun hcas hslots hsettled

/-- A history recomputed under a *different* oracle (different live answers)
    also verifies — verification tests self-consistency, not which oracle
    produced the tape. (model-proved) -/
theorem recomputed_history_verifies
    {cfg₂ : Cfg} {p : Program} {args : Value}
    {res₂ : RunResult} {store : CasView}
    (hrun : run cfg₂ p args [] [] = .ok res₂)
    (hcas : cfg₂.cas = store)
    (hslots : ∀ path, cfg₂.slots path = replaySlotsOf (p.cellsOf args res₂.hist) path)
    (hsettled : ∀ path, cfg₂.settledWrites path = false) :
    verify (mint p args res₂ ⟨"algal", "any-version"⟩) p store = .verified :=
  verify_produced_verifies hrun hcas hslots hsettled

/-! ## Resume -/

/-- `resume` gates on the same checks as production: the checkpoint's
    manifest binding first, then digest self-consistency, then full
    verification — all before any live dispatch. (model-proved) -/
theorem resume_rejects_manifest {r : Receipt} {p : Program} {store : CasView}
    {live : Live} {stamp : Stamp}
    (h : r.fields.manifest ≠ p.manifest) :
    resume r p store live stamp = .error .digestMismatch := by
  unfold resume
  rw [ite_eq_left h]

theorem resume_rejects_inconsistent {r : Receipt} {p : Program} {store : CasView}
    {live : Live} {stamp : Stamp} (h : r.digest ≠ r.fields) :
    resume r p store live stamp = .error .digestMismatch := by
  unfold resume
  by_cases hm : r.fields.manifest = p.manifest
  · rw [ite_eq_right (show ¬(r.fields.manifest ≠ p.manifest) from fun x => x hm)]
    rw [ite_eq_left h]
  · rw [ite_eq_left hm]

theorem resume_rejects_unverified {r : Receipt} {p : Program} {store : CasView}
    {live : Live} {stamp : Stamp}
    (hm : r.fields.manifest = p.manifest) (hcon : consistent r)
    (hv : verify r p store ≠ .verified) :
    ∃ e, resume r p store live stamp = .error e := by
  unfold resume
  rw [ite_eq_right (show ¬(r.fields.manifest ≠ p.manifest) from fun x => x hm)]
  rw [ite_eq_right (show ¬(r.digest ≠ r.fields) from fun x => x hcon)]
  cases hv' : verify r p store with
  | verified => exact absurd hv' hv
  | mismatch l => exact ⟨.receiptMismatch, rfl⟩
  | rejected e => exact ⟨.receiptMismatch, rfl⟩

/-- On the success path, `resume` runs the manifest against the
    continuable tape — the recorded effects minus the suspended records —
    under the checkpoint's slot answers and settled-write marks, and mints
    a fresh receipt carrying the *resuming* runtime's stamp.
    (model-proved) -/
theorem resume_runs_continuable {r r' : Receipt} {p : Program} {store : CasView}
    {live : Live} {stamp : Stamp}
    (hr : resume r p store live stamp = .ok r') :
    ∃ res, run (resumeCfg r store live) p r.fields.args
              (dropSuspended r.fields.effects) = .ok res ∧
           r' = mint p r.fields.args res stamp := by
  unfold resume at hr
  by_cases hm : r.fields.manifest = p.manifest
  · rw [ite_eq_right (show ¬(r.fields.manifest ≠ p.manifest) from fun x => x hm)] at hr
    by_cases hcon : r.digest = r.fields
    · rw [ite_eq_right (show ¬(r.digest ≠ r.fields) from fun x => x hcon)] at hr
      cases hv : verify r p store with
      | verified =>
        rw [hv] at hr
        dsimp only at hr
        cases hrun : run (resumeCfg r store live) p r.fields.args
            (dropSuspended r.fields.effects) with
        | error e => rw [hrun] at hr; dsimp only at hr; cases hr
        | ok res =>
          rw [hrun] at hr; dsimp only at hr; cases hr
          exact ⟨res, rfl, rfl⟩
      | mismatch l => rw [hv] at hr; dsimp only at hr; cases hr
      | rejected e => rw [hv] at hr; dsimp only at hr; cases hr
    · rw [ite_eq_left hcon] at hr; cases hr
  · rw [ite_eq_left hm] at hr; cases hr

/-- A resumed run's produced effects are sourced: each is a non-suspended
    recorded prefix effect or a fresh live answer. The settled prefix
    effects are replayed, never re-dispatched. (model-proved) -/
theorem resume_tail_sourced {r r' : Receipt} {p : Program} {store : CasView}
    {live : Live} {stamp : Stamp} {e : EffectRecord}
    (hr : resume r p store live stamp = .ok r')
    (he : e ∈ r'.fields.effects) :
    e ∈ dropSuspended r.fields.effects ∨ Fresh live e := by
  obtain ⟨res, hrun, hr'⟩ := resume_runs_continuable hr
  rw [hr'] at he
  have hmem : e ∈ res.produced := he
  unfold run at hrun
  split at hrun
  · rename_i hcl
    dsimp only at hrun
    cases hrun
    have hs := steps_sourced p.maxCalls (resumeCfg r store live) p r.fields.args
      { tape := dropSuspended r.fields.effects, slots := [] } e hmem
    cases hs with
    | inl hm => exact Or.inl hm
    | inr hf => exact Or.inr hf
  · rename_i hcon
    cases hrun

/-- Suspended records are the only records dropped from the resume tape:
    they carry no settled external effect. (model-proved) -/
theorem dropSuspended_mem {r : EffectRecord} {t : Tape}
    (h : r ∈ dropSuspended t) : r ∈ t ∧ r.reply ≠ .suspended := by
  unfold dropSuspended at h
  obtain ⟨hin, hnot⟩ := List.mem_filter.mp h
  refine ⟨hin, ?_⟩
  cases hr : r.reply with
  | suspended => simp [hr] at hnot
  | output v => simp
  | failure c => simp

theorem dropSuspended_sublist (t : Tape) : Sublist (dropSuspended t) t := by
  unfold dropSuspended
  exact List.filter_sublist

/-- The resumed receipt's runtime field is the resumer's stamp — the
    checkpoint's runtime claim does not propagate. (model-proved) -/
theorem resume_stamps_resumer {r r' : Receipt} {p : Program} {store : CasView}
    {live : Live} {stamp : Stamp}
    (hr : resume r p store live stamp = .ok r') :
    r'.fields.runtime = stamp := by
  obtain ⟨res, _, hr'⟩ := resume_runs_continuable hr
  rw [hr']
  rfl

end Algal.Replay
