import Std

/- A finite index search, separate from binary64 or decimal conversion. -/
set_option autoImplicit false
namespace Algal.Core.IntervalSearch

/-- First false position in [lo, hi), with hi as sentinel. -/
def cut (p : Nat → Bool) (lo hi : Nat) : Nat :=
  if h : lo < hi then
    let mid := lo + (hi - lo) / 2
    if p mid then cut p (mid + 1) hi else cut p lo mid
  else lo
termination_by hi - lo
decreasing_by all_goals omega

/-- p is true on a prefix of the finite index domain. -/
def Prefix (p : Nat → Bool) (bound : Nat) : Prop :=
  ∀ a b, a ≤ b → b < bound → p b = true → p a = true

theorem cut_bounds (p : Nat → Bool) (lo hi : Nat) (h : lo ≤ hi) :
    lo ≤ cut p lo hi ∧ cut p lo hi ≤ hi := by
  unfold cut
  split
  · rename_i hn
    dsimp only
    split
    · have ih :=  cut_bounds p (lo + (hi - lo) / 2 + 1) hi (by omega)
      omega
    · have ih :=  cut_bounds p lo (lo + (hi - lo) / 2) (by omega)
      omega
  · omega
termination_by hi - lo

theorem cut_partition (p : Nat → Bool) (bound lo hi : Nat)
    (range : lo ≤ hi ∧ hi ≤ bound) (ordered : Prefix p bound)
    (lower : ∀ k, k < lo → p k = true)
    (upper : ∀ k, hi ≤ k → k < bound → p k = false) :
    (∀ k, k < cut p lo hi → p k = true) ∧
      (∀ k, cut p lo hi ≤ k → k < bound → p k = false) := by
  unfold cut
  split
  · rename_i hn
    dsimp only
    split
    · rename_i hp
      apply cut_partition p bound (lo + (hi - lo) / 2 + 1) hi
      · omega
      · exact ordered
      · intro k hk
        exact ordered k (lo + (hi - lo) / 2) (by omega) (by omega) hp
      · exact upper
    · rename_i hp
      apply cut_partition p bound lo (lo + (hi - lo) / 2)
      · omega
      · exact ordered
      · exact lower
      · intro k hk hb
        cases hpk : p k with
        | false => rfl
        | true =>
          have hpm := ordered (lo + (hi - lo) / 2) k hk hb hpk
          contradiction
  · have same : lo = hi := by omega
    exact ⟨lower, by simpa only [same] using upper⟩
termination_by hi - lo


/-- One predicate probe for each nonempty interval in the same branch recurrence.
    This counts abstract comparisons, not machine instructions or allocation. -/
def comparisons (p : Nat → Bool) (lo hi : Nat) : Nat :=
  if h : lo < hi then
    let mid := lo + (hi - lo) / 2
    1 + if p mid then comparisons p (mid + 1) hi else comparisons p lo mid
  else 0
termination_by hi - lo
decreasing_by all_goals omega

/-- Both possible recursive intervals contain at most half the current indices. -/
theorem recursive_halving (lo hi : Nat) (nonempty : lo < hi) :
    hi - (lo + (hi - lo) / 2 + 1) ≤ (hi - lo) / 2 ∧
      (lo + (hi - lo) / 2) - lo = (hi - lo) / 2 := by
  omega

/-- A power-of-two comparison bound; it does not require monotonicity. -/
theorem comparisons_le (p : Nat → Bool) (lo hi depth : Nat)
    (length : hi - lo < 2 ^ depth) : comparisons p lo hi ≤ depth := by
  induction depth generalizing lo hi with
  | zero =>
    simp only [Nat.pow_zero] at length
    have empty : ¬ lo < hi := by omega
    simp [comparisons, empty]
  | succ depth ih =>
    unfold comparisons
    split
    · rename_i nonempty
      dsimp only
      have half : (hi - lo) / 2 < 2 ^ depth := by
        rw [Nat.pow_succ] at length
        omega
      have sizes := recursive_halving lo hi nonempty
      split
      · have smaller := ih (lo + (hi - lo) / 2 + 1) hi (by omega)
        omega
      · have smaller := ih lo (lo + (hi - lo) / 2) (by omega)
        omega
    · omega

theorem full_partition (p : Nat → Bool) (bound : Nat) (ordered : Prefix p bound) :
    (∀ k, k < cut p 0 bound → p k = true) ∧
      (∀ k, cut p 0 bound ≤ k → k < bound → p k = false) := by
  exact cut_partition p bound 0 bound ⟨Nat.zero_le _, Nat.le_refl _⟩ ordered
    (by intro k hk; omega) (by intro k hk hb; omega)

theorem true_iff_before_cut (p : Nat → Bool) (bound k : Nat)
    (ordered : Prefix p bound) (within : k < bound) :
    p k = true ↔ k < cut p 0 bound := by
  have parts := full_partition p bound ordered
  constructor
  · intro yes
    by_cases inside : k < cut p 0 bound
    · exact inside
    · have no := parts.2 k (by omega) within
      simp_all
  · exact parts.1 k

theorem cut_unique (p : Nat → Bool) (bound candidate : Nat)
    (ordered : Prefix p bound) (within : candidate ≤ bound)
    (before : ∀ k, k < candidate → p k = true)
    (after : ∀ k, candidate ≤ k → k < bound → p k = false) :
    cut p 0 bound = candidate := by
  have limits := cut_bounds p 0 bound (Nat.zero_le _)
  have parts := full_partition p bound ordered
  by_cases same : cut p 0 bound = candidate
  · exact same
  · by_cases left : cut p 0 bound < candidate
    · have yes := before (cut p 0 bound) left
      have no := parts.2 (cut p 0 bound) (Nat.le_refl _) (by omega)
      simp_all
    · have yes := parts.1 candidate (by omega)
      have no := after candidate (Nat.le_refl _) (by omega)
      simp_all

theorem threshold_prefix (threshold bound : Nat) :
    Prefix (fun k => decide (k < threshold)) bound := by
  intro a b order within yes
  have hb : b < threshold := of_decide_eq_true yes
  exact decide_eq_true (by omega)

theorem threshold_cut (threshold bound : Nat) :
    cut (fun k => decide (k < threshold)) 0 bound = min threshold bound := by
  apply cut_unique _ _ _ (threshold_prefix threshold bound) (Nat.min_le_right _ _)
  · intro k before
    exact decide_eq_true (by omega)
  · intro k after within
    apply decide_eq_false
    omega

theorem empty_sentinel : cut (fun _ => true) 7 7 = 7 := by simp [cut]

theorem all_false_start : cut (fun _ => false) 0 16 = 0 := by simp [cut]

theorem all_true_sentinel : cut (fun _ => true) 0 16 = 16 := by simp [cut]

theorem interior_witness : cut (fun k => decide (k < 42)) 0 100 = 42 := by rw [threshold_cut]; decide

theorem large_domain_witness :
    cut (fun k => decide (k < 42)) 0 (2 ^ 63) = 42 := by rw [threshold_cut]; decide

theorem large_domain_comparison_bound (p : Nat → Bool) :
    comparisons p 0 (2 ^ 63) ≤ 64 := by
  apply comparisons_le
  decide

theorem no_comparison_when_empty : comparisons (fun _ => true) 7 7 = 0 := by simp [comparisons]

theorem one_comparison_singleton : comparisons (fun _ => false) 0 1 = 1 := by simp [comparisons]

theorem power_of_two_needs_extra_comparison :
    comparisons (fun _ => false) 0 16 = 5 := by simp [comparisons]

theorem below_power_of_two_depth (p : Nat → Bool) :
    comparisons p 0 (2 ^ 63 - 1) ≤ 63 := by
  apply comparisons_le
  decide

theorem singleton_zero_budget_rejected : ¬ comparisons (fun _ => false) 0 1 ≤ 0 := by simp [comparisons]

theorem nonprefix_partition_rejected :
    ¬ Prefix (fun k => decide (k = 1)) 2 := by
  intro ordered
  have impossible := ordered 0 1 (by decide) (by decide) (by decide)
  contradiction

theorem nonprefix_search_is_not_first_false :
    cut (fun k => decide (k = 1)) 0 2 = 2 ∧ (decide (0 = 1) : Bool) = false := by simp [cut]


/-- Executable result and comparison count from a single binary-search descent. -/
def search (p : Nat → Bool) (lo hi : Nat) : Nat × Nat :=
  if h : lo < hi then
    let mid := lo + (hi - lo) / 2
    if p mid then
      let child := search p (mid + 1) hi
      (child.1, 1 + child.2)
    else
      let child := search p lo mid
      (child.1, 1 + child.2)
  else (lo, 0)
termination_by hi - lo
decreasing_by all_goals omega

theorem search_spec (p : Nat → Bool) (lo hi : Nat) :
    search p lo hi = (cut p lo hi, comparisons p lo hi) := by
  unfold search cut comparisons
  split
  · dsimp only
    split
    · rw [search_spec p (lo + (hi - lo) / 2 + 1) hi]
    · rw [search_spec p lo (lo + (hi - lo) / 2)]
  · rfl
termination_by hi - lo

theorem search_comparisons_le (p : Nat → Bool) (lo hi depth : Nat)
    (length : hi - lo < 2 ^ depth) : (search p lo hi).2 ≤ depth := by
  rw [search_spec]
  exact comparisons_le p lo hi depth length

theorem search_correct (p : Nat → Bool) (bound depth : Nat)
    (ordered : Prefix p bound) (length : bound < 2 ^ depth) :
    (search p 0 bound).1 ≤ bound ∧
      (∀ k, k < (search p 0 bound).1 → p k = true) ∧
      (∀ k, (search p 0 bound).1 ≤ k → k < bound → p k = false) ∧
      (search p 0 bound).2 ≤ depth := by
  rw [search_spec]
  exact ⟨(cut_bounds p 0 bound (Nat.zero_le _)).2,
    (full_partition p bound ordered).1, (full_partition p bound ordered).2,
    comparisons_le p 0 bound depth (by simpa using length)⟩

end Algal.Core.IntervalSearch
