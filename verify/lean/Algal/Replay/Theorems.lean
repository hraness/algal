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
        rw [hs] at h
        simp at h
        obtain ⟨h1, _⟩ := h
        subst h1
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
      exact List.Mem.head _
    · rw [serve_cons_ne _ _ _ heq] at h
      cases hs : serve tl req with
      | none => simp [hs] at h
      | some p =>
        rw [hs] at h
        simp at h
        obtain ⟨h1, h2⟩ := h
        subst h1
        exact List.Mem.tail _ (ih hs)

/-- Service consumes the served occurrence: the remainder is a sublist of
    the tape. (model-proved) -/
theorem serve_sublist : ∀ {t : Tape} {req : Request} {r : EffectRecord} {t' : Tape},
    serve t req = some (r, t') → t' <+ t := by
  intro t
  induction t with
  | nil => intro req r t' h; simp [serve] at h
  | cons hd tl ih =>
    intro req r t' h
    by_cases heq : hd.request = req
    · rw [serve_cons_eq _ _ _ heq] at h; cases h
      exact (List.Sublist.refl tl).cons hd
    · rw [serve_cons_ne _ _ _ heq] at h
      cases hs : serve tl req with
      | none => simp [hs] at h
      | some p =>
        rw [hs] at h
        simp at h
        obtain ⟨_, h2⟩ := h
        subst h2
        exact List.Sublist.cons₂ hd (ih hs)

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
        exact absurd (hall hd (List.Mem.head _)) heq
    · rw [serve_cons_ne _ _ _ heq]
      constructor
      · intro h r hr
        have hnone : serve tl req = none := by
          cases hs : serve tl req with
          | none => rfl
          | some p => rw [hs] at h; simp at h
        cases hr with
        | head => exact heq
        | tail _ hm => exact ih.mp hnone r hm
      · intro hall
        have htl := ih.mpr (fun r hm => hall r (List.Mem.tail _ hm))
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
      simp [occurrences, List.filter, heq]
    · rw [serve_cons_ne _ _ _ heq] at h
      cases hs : serve tl req with
      | none => simp [hs] at h
      | some p =>
        rw [hs] at h
        simp at h
        obtain ⟨h1, h2⟩ := h
        subst h1; subst h2
        have ihh := ih hs
        simp [occurrences, List.filter, heq, ihh]

/-! ## Dispatch: replay precedes any live route -/

/-- A tape hit resolves the dispatch verbatim — the recorded executor,
    usage, cached, retryable, wake and configuration metadata are served
    unmodified and the live oracle is never consulted. (model-proved) -/
theorem dispatch_serve_hit (cfg : Cfg) {t : Tape} {req : Request}
    {r : EffectRecord} {t' : Tape} (h : serve t req = some (r, t')) :
    dispatch cfg t req = (r, t') := by
  simp [dispatch, h]

/-- Every produced record names the request that was issued — whether it was
    served, live-answered, or unbound. (model-proved) -/
theorem dispatch_request (cfg : Cfg) {t : Tape} {req : Request}
    {r : EffectRecord} {t' : Tape} (h : dispatch cfg t req = (r, t')) :
    r.request = req := by
  unfold dispatch at h
  cases hs : serve t req with
  | none =>
    rw [hs] at h
    by_cases htool : req.kind = Kind.tool ∧ cfg.toolArmed ∧ ¬cfg.toolFallthrough
    · rw [if_pos htool] at h; cases h; rfl
    · rw [if_neg htool] at h
      cases hl : cfg.live req with
      | none => rw [hl] at h; cases h; rfl
      | some a => rw [hl] at h; cases h; rfl
  | some hit =>
    rw [hs] at h
    simp at h
    obtain ⟨h1, h2⟩ := h
    subst h1; subst h2
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
  unfold dispatch at h
  cases hs : serve t req with
  | none =>
    rw [hs] at h
    by_cases htool : req.kind = Kind.tool ∧ cfg.toolArmed ∧ ¬cfg.toolFallthrough
    · rw [if_pos htool] at h; cases h
      exact Or.inr (Or.inr ⟨req, rfl⟩)
    · rw [if_neg htool] at h
      cases hl : cfg.live req with
      | none => rw [hl] at h; cases h
        exact Or.inr (Or.inr ⟨req, rfl⟩)
      | some a => rw [hl] at h; cases h
        exact Or.inr (Or.inl ⟨req, a, hl, rfl⟩)
  | some hit =>
    rw [hs] at h
    simp at h
    obtain ⟨h1, h2⟩ := h
    subst h1; subst h2
    exact Or.inl (serve_mem hs)

theorem dispatch_sublist (cfg : Cfg) {t : Tape} {req : Request}
    {r : EffectRecord} {t' : Tape} (h : dispatch cfg t req = (r, t')) :
    t' <+ t := by
  unfold dispatch at h
  cases hs : serve t req with
  | none =>
    rw [hs] at h
    by_cases htool : req.kind = Kind.tool ∧ cfg.toolArmed ∧ ¬cfg.toolFallthrough
    · rw [if_pos htool] at h; cases h; exact List.Sublist.refl t
    · rw [if_neg htool] at h
      cases hl : cfg.live req with
      | none => rw [hl] at h; cases h; exact List.Sublist.refl t
      | some a => rw [hl] at h; cases h; exact List.Sublist.refl t
  | some hit =>
    rw [hs] at h
    simp at h
    obtain ⟨h1, h2⟩ := h
    subst h1; subst h2
    exact serve_sublist hs

/-- Under `noLive` a miss is always the unbound failure record: verification
    performs no live dispatch at all — the model statement of "replaying
    does not dispatch live providers or tools". (model-proved) -/
theorem dispatch_nolive_miss {cfg : Cfg} {t : Tape} {req : Request}
    (hlive : cfg.live = noLive) (htool : cfg.toolArmed ∧ ¬cfg.toolFallthrough → False)
    (h : serve t req = none) :
    dispatch cfg t req = (unboundRecord req, t) := by
  simp [dispatch, h]
  intro h1 h2 h3
  exact absurd ⟨h1, h2, h3⟩ htool

theorem dispatch_nolive_miss' {cfg : Cfg} {t : Tape} {req : Request}
    (hlive : cfg.live = noLive)
    (h : serve t req = none)
    (htool : req.kind = Kind.tool → cfg.toolArmed → ¬cfg.toolFallthrough → False) :
    dispatch cfg t req = (unboundRecord req, t) := by
  simp [dispatch, h]
  by_cases htb : req.kind = Kind.tool ∧ cfg.toolArmed ∧ ¬cfg.toolFallthrough
  · exact absurd htb (fun ⟨h1, h2, h3⟩ => htool h1 h2 h3)
  · rw [if_neg htb]
    simp [hlive, noLive]

/-- A record fresh under `noLive` is the unbound record. (model-proved) -/
theorem fresh_nolive {r : EffectRecord} : Fresh noLive r →
    ∃ req, r = unboundRecord req := by
  intro h
  cases h with
  | inl hl =>
    obtain ⟨req, a, h, _⟩ := hl
    simp [noLive] at h
  | inr hr => exact hr

/-- Two states differing only in the remaining tape. -/
def St.modTape (a b : St) : Prop :=
  a.hist = b.hist ∧ a.slots = b.slots ∧ a.writes = b.writes ∧ a.steps = b.steps

/-- `res'` agrees with `res` modulo its remaining replay tape. -/
def RunAgree (a b : Tape × St × EndMarker) : Prop :=
  a.1 = b.1 ∧ St.modTape a.2.1 b.2.1 ∧ a.2.2 = b.2.2

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
    | done o f => rw [hd] at h; simp at h
    | request req =>
      rw [hd] at h
      cases hdd : dispatch cfg s.tape req with
      | mk rec t₁ =>
        rw [hdd] at h
        cases hrep : rec.reply with
        | suspended =>
          rw [hrep] at h
          simp at h
          subst h
          cases dispatch_sourced cfg hdd with
          | inl hm => exact Or.inl hm
          | inr hf => exact Or.inr hf
        | output v =>
          rw [hrep] at h
          simp at h
          cases h with
          | head =>
            cases dispatch_sourced cfg hdd with
            | inl hm => exact Or.inl hm
            | inr hf => exact Or.inr hf
          | tail _ hm =>
            have ihh := ih cfg p args
              { s with tape := t₁, hist := s.hist ++ [rec.reply], steps := s.steps + 1 } r hm
            cases ihh with
            | inl hmem => exact Or.inl ((dispatch_sublist cfg hdd).mem hmem)
            | inr hf => exact Or.inr hf
        | failure c =>
          rw [hrep] at h
          simp at h
          cases h with
          | head =>
            cases dispatch_sourced cfg hdd with
            | inl hm => exact Or.inl hm
            | inr hf => exact Or.inr hf
          | tail _ hm =>
            have ihh := ih cfg p args
              { s with tape := t₁, hist := s.hist ++ [rec.reply], steps := s.steps + 1 } r hm
            cases ihh with
            | inl hmem => exact Or.inl ((dispatch_sublist cfg hdd).mem hmem)
            | inr hf => exact Or.inr hf
    | readSlot path name =>
      rw [hd] at h
      exact ih cfg p args
        { s with hist := s.hist ++ [resolveSlotRead cfg s.slots path name],
                 steps := s.steps + 1 } r h
    | writeSlot path name data =>
      rw [hd] at h
      exact ih cfg p args _ r h

/-- Writes recorded by the run all come from unsettled write directives — a
    settled prefix write is never re-executed. (model-proved) -/
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
    | done o f => rw [hd] at h; simp at h; exact Or.inl h
    | request req =>
      rw [hd] at h
      cases hdd : dispatch cfg s.tape req with
      | mk rec t₁ =>
        rw [hdd] at h
        cases hrep : rec.reply with
        | suspended => rw [hrep] at h; simp at h; exact Or.inl h
        | output v =>
          rw [hrep] at h
          exact ih cfg p args
            { s with tape := t₁, hist := s.hist ++ [rec.reply], steps := s.steps + 1 } w h
        | failure c =>
          rw [hrep] at h
          exact ih cfg p args
            { s with tape := t₁, hist := s.hist ++ [rec.reply], steps := s.steps + 1 } w h
    | readSlot path name =>
      rw [hd] at h
      exact ih cfg p args
        { s with hist := s.hist ++ [resolveSlotRead cfg s.slots path name],
                 steps := s.steps + 1 } w h
    | writeSlot path name data =>
      rw [hd] at h
      by_cases hset : cfg.settledWrites path
      · rw [if_pos hset] at h
        exact ih cfg p args _ w h
      · rw [if_neg hset] at h
        have ihh := ih cfg p args
          { s with slots := (name, data) :: s.slots,
                   writes := s.writes ++ [(path, name, data)], steps := s.steps + 1 } w h
        cases ihh with
        | inl hmem =>
          cases List.mem_append.mp hmem with
          | inl hold => exact Or.inl hold
          | inr hnew =>
            simp at hnew
            subst hnew
            exact Or.inr hset
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
    simp [steps, RunAgree, St.modTape]
  | succ fuel ih =>
    intro s hslots hsettled
    simp only [steps]
    cases hd : p.decide args s.hist with
    | done o f =>
      simp only [hd]
      simp [RunAgree, St.modTape]
    | request req =>
      simp only [hd]
      cases hdd : dispatch cfg s.tape req with
      | mk rec t₁ =>
        simp only [hdd]
        have hreq : rec.request = req := dispatch_request cfg hdd
        cases hrep : rec.reply with
        | suspended =>
          simp only [hrep]
          -- produced was [rec]; the replay tape's head is rec
          rw [serve_cons_eq _ _ _ hreq]
          simp only [dispatch]
          simp [RunAgree, St.modTape, hrep]
        | output v =>
          simp only [hrep]
          rw [serve_cons_eq _ _ _ hreq]
          simp only [dispatch]
          simp only [hrep]
          -- reduce to the IH on the continuation state
          have ihh := ih { s with tape := t₁, hist := s.hist ++ [rec.reply],
                            steps := s.steps + 1 } hslots hsettled
          simp only [] at ihh
          obtain ⟨e1, e2, e3⟩ := ihh
          refine ⟨?_, ?_, ?_⟩
          · simp [e1]
          · obtain ⟨m1, m2, m3, m4⟩ := e2
            exact ⟨m1, m2, m3, m4⟩
          · exact e3
        | failure c =>
          simp only [hrep]
          rw [serve_cons_eq _ _ _ hreq]
          simp only [dispatch]
          simp only [hrep]
          have ihh := ih { s with tape := t₁, hist := s.hist ++ [rec.reply],
                            steps := s.steps + 1 } hslots hsettled
          obtain ⟨e1, e2, e3⟩ := ihh
          refine ⟨?_, ?_, ?_⟩
          · simp [e1]
          · obtain ⟨m1, m2, m3, m4⟩ := e2
            exact ⟨m1, m2, m3, m4⟩
          · exact e3
    | readSlot path name =>
      simp only [hd]
      have hread : resolveSlotRead cfg' s.slots path name =
          resolveSlotRead cfg s.slots path name :=
        resolveSlotRead_congr (hslots path).symm
      rw [hread]
      exact ih { s with hist := s.hist ++ [resolveSlotRead cfg s.slots path name],
                      steps := s.steps + 1 } hslots hsettled
    | writeSlot path name data =>
      simp only [hd]
      have hset : cfg.settledWrites path = cfg'.settledWrites path := hsettled path
      rw [← hset]
      exact ih _ hslots hsettled
