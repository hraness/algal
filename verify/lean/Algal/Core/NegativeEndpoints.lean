import Algal.Core.RoundingEndpoints

/- Exact finite-candidate rational geometry. Sign reflection is proved over
   admitted binary64 bit patterns; no decimal conversion or universal round/pack
   correspondence is assumed. -/
namespace Algal.Core.NegativeEndpoints
open Algal.Core
open Algal.Core.NumericInjectivity Algal.Core.RoundingInterval
open Algal.Core.SignedRounding Algal.Core.RoundingEndpoints

def Nearest (center : Binary64.Number) (x : Rat) : Prop :=
  ∀ candidate : Binary64.Number, (x - value center).abs ≤ (x - value candidate).abs

def StrictNearest (center : Binary64.Number) (x : Rat) : Prop :=
  ∀ candidate : Binary64.Number, candidate.bits ≠ center.bits →
    (x - value center).abs < (x - value candidate).abs

theorem number_eq_of_bits_eq (a b : Binary64.Number) (h : a.bits = b.bits) : a = b := by
  cases a; cases b
  simp_all only

theorem reflected_bits_differ (candidate center : Binary64.Number) :
    (negate candidate).bits ≠ center.bits ↔ candidate.bits ≠ (negate center).bits := by
  constructor
  · intro h same
    have eqNumber := number_eq_of_bits_eq candidate (negate center) same
    have reflected := congrArg negate eqNumber
    rw [negate_involution] at reflected
    exact h (congrArg Binary64.Number.bits reflected)
  · intro h same
    have eqNumber := number_eq_of_bits_eq (negate candidate) center same
    have reflected := congrArg negate eqNumber
    rw [negate_involution] at reflected
    exact h (congrArg Binary64.Number.bits reflected)

theorem reflected_distance (center : Binary64.Number) (x : Rat) :
    (-x - value (negate center)).abs = (x - value center).abs := by
  rw [negate_value]
  exact distance_reflection x _

theorem nearest_reflection (center : Binary64.Number) (x : Rat) :
    Nearest (negate center) (-x) ↔ Nearest center x := by
  constructor
  · intro h candidate
    have reflected := h (negate candidate)
    simpa only [reflected_distance] using reflected
  · intro h candidate
    have reflected := h (negate candidate)
    have same := reflected_distance (negate candidate) x
    rw [negate_involution] at same
    rw [reflected_distance, same]
    exact reflected

theorem strict_nearest_reflection (center : Binary64.Number) (x : Rat) :
    StrictNearest (negate center) (-x) ↔ StrictNearest center x := by
  constructor
  · intro h candidate different
    have reflectedDifferent : (negate candidate).bits ≠ (negate center).bits := by
      intro same
      exact different (congrArg Binary64.Number.bits
        (negate_injective candidate center (number_eq_of_bits_eq _ _ same)))
    have reflected := h (negate candidate) reflectedDifferent
    simpa only [reflected_distance] using reflected
  · intro h candidate different
    have reflected := h (negate candidate) ((reflected_bits_differ candidate center).mpr different)
    have same := reflected_distance (negate candidate) x
    rw [negate_involution] at same
    rw [reflected_distance, same]
    exact reflected

theorem strict_nearest_implies_nearest (center : Binary64.Number) (x : Rat)
    (h : StrictNearest center x) : Nearest center x := by
  intro candidate
  by_cases same : candidate.bits = center.bits
  · have eqNumber := number_eq_of_bits_eq candidate center same
    rw [eqNumber]
    exact Rat.le_refl
  · exact Rat.le_of_lt (h candidate same)

def maximumLower : Rat := midpoint (value beforeMaximum) (value maximum)

theorem maximum_strict_nearest_of_lower (x : Rat) (h : maximumLower < x) :
    StrictNearest maximum x := by
  intro candidate different
  have nonnegPrevious := value_nonnegative beforeMaximum (by decide)
  have mid := midpoint_between _ _ (adjacent_values_lt _ _ maximum_previous_adjacent)
  have previousLtX : value beforeMaximum < x := Std.lt_trans mid.1 h
  have nearestPrevious :=
    (midpoint_right_strict _ _ x (adjacent_values_lt _ _ maximum_previous_adjacent)).mpr h
  by_cases hc : Nonnegative candidate
  · exact Std.lt_of_lt_of_le nearestPrevious
      (distance_outside_left _ _ _ (below_maximum_previous_bound candidate hc different) previousLtX)
  · have candidateBound := Rat.le_trans (value_nonpositive candidate hc) nonnegPrevious
    exact Std.lt_of_lt_of_le nearestPrevious (distance_outside_left _ _ _ candidateBound previousLtX)

theorem maximum_strict_nearest_iff (x : Rat) :
    StrictNearest maximum x ↔ maximumLower < x := by
  constructor
  · intro h
    exact (midpoint_right_strict _ _ x (adjacent_values_lt _ _ maximum_previous_adjacent)).mp
      (h beforeMaximum (by decide))
  · exact maximum_strict_nearest_of_lower x

theorem negative_maximum_nearest_iff (x : Rat) :
    Nearest (negate maximum) x ↔ x ≤ -maximumLower := by
  have reflected := nearest_reflection maximum (-x)
  rw [Rat.neg_neg] at reflected
  rw [reflected, Nearest, maximum_nearest_iff]
  unfold maximumLower
  grind

theorem negative_maximum_strict_nearest_iff (x : Rat) :
    StrictNearest (negate maximum) x ↔ x < -maximumLower := by
  have reflected := strict_nearest_reflection maximum (-x)
  rw [Rat.neg_neg] at reflected
  rw [reflected, maximum_strict_nearest_iff]
  grind

theorem negative_maximum_cell_bounds (x : Rat) :
    NegativeMaximumCell x ↔ -overflowBoundary < x ∧ x < -maximumLower := by
  unfold NegativeMaximumCell MaximumCell maximumLower
  grind

theorem negative_maximum_cell_strict_all_finite (candidate : Binary64.Number) (x : Rat)
    (different : candidate.bits ≠ (negate maximum).bits) (h : NegativeMaximumCell x) :
    (x - value (negate maximum)).abs < (x - value candidate).abs :=
  ((negative_maximum_strict_nearest_iff x).mpr ((negative_maximum_cell_bounds x).mp h).2)
    candidate different

theorem negative_maximum_center_strict_nearest :
    StrictNearest (negate maximum) (value (negate maximum)) :=
  (negative_maximum_strict_nearest_iff _).mpr
    ((negative_maximum_cell_bounds _).mp negative_maximum_in_own_cell).2

theorem negative_maximum_lower_tie_nearest : Nearest (negate maximum) (-maximumLower) :=
  (negative_maximum_nearest_iff _).mpr Rat.le_refl

theorem negative_maximum_lower_tie_not_strict : ¬ StrictNearest (negate maximum) (-maximumLower) := by
  rw [negative_maximum_strict_nearest_iff]
  exact Rat.lt_irrefl

theorem negative_maximum_lower_tie_excluded : ¬ NegativeMaximumCell (-maximumLower) := by
  rw [negative_maximum_cell_bounds]
  intro h
  exact Rat.lt_irrefl h.2

theorem negative_maximum_lower_tie_equal_distance :
    (-maximumLower - value (negate maximum)).abs =
      (-maximumLower - value (negate beforeMaximum)).abs := by
  rw [reflected_distance, reflected_distance]
  exact (midpoint_equal_distances _ _).symm

theorem maximum_lower_below_overflow : maximumLower < overflowBoundary := by
  exact Std.lt_trans
    (midpoint_between _ _ (adjacent_values_lt _ _ maximum_previous_adjacent)).2
    (midpoint_between _ _ maximum_below_virtual).1

theorem negative_overflow_strict_nearest (x : Rat) (h : NegativeOverflow x) :
    StrictNearest (negate maximum) x := by
  apply (negative_maximum_strict_nearest_iff x).mpr
  have gap := maximum_lower_below_overflow
  unfold NegativeOverflow at h
  grind

theorem negative_overflow_tie_strict_nearest : StrictNearest (negate maximum) (-overflowBoundary) :=
  negative_overflow_strict_nearest _ negative_overflow_tie_is_overflow

theorem negative_virtual_next_not_finite (n : Binary64.Number) : value n ≠ -virtualNext := by
  intro same
  have reflected : value (negate n) = virtualNext := by rw [negate_value, same, Rat.neg_neg]
  exact virtual_next_not_finite (negate n) reflected

theorem negative_virtual_next_strict_nearest : StrictNearest (negate maximum) (-virtualNext) := by
  apply negative_overflow_strict_nearest
  have h := (midpoint_between _ _ maximum_below_virtual).2
  unfold NegativeOverflow overflowBoundary
  grind

theorem negative_overflow_tie_virtual_equal_distance :
    (-overflowBoundary - value (negate maximum)).abs =
      (-overflowBoundary - -virtualNext).abs := by
  rw [reflected_distance, distance_reflection]
  exact overflow_tie_virtual_equal_distance

theorem maximum_cell_iff_strict_and_not_overflow (x : Rat) :
    MaximumCell x ↔ StrictNearest maximum x ∧ ¬ PositiveOverflow x := by
  rw [maximum_strict_nearest_iff]
  unfold MaximumCell maximumLower PositiveOverflow
  grind

theorem negative_maximum_cell_iff_strict_and_not_overflow (x : Rat) :
    NegativeMaximumCell x ↔ StrictNearest (negate maximum) x ∧ ¬ NegativeOverflow x := by
  rw [negative_maximum_cell_bounds, negative_maximum_strict_nearest_iff]
  unfold NegativeOverflow
  grind

def ClosedInterior (previous center next : Binary64.Number) (x : Rat) : Prop :=
  midpoint (value previous) (value center) ≤ x ∧ x ≤ midpoint (value center) (value next)

def OpenInterior (previous center next : Binary64.Number) (x : Rat) : Prop :=
  midpoint (value previous) (value center) < x ∧ x < midpoint (value center) (value next)

theorem adjacent_bits_differ (a b : Binary64.Number) (h : Adjacent a b) : a.bits ≠ b.bits := by
  intro same
  have sameCode := congrArg UInt64.toNat same
  have nextCode := h.nextCode
  omega

theorem closed_interior_nearest (previous center next : Binary64.Number) (x : Rat)
    (left : Adjacent previous center) (right : Adjacent center next)
    (h : ClosedInterior previous center next x) : Nearest center x := by
  have nearestPrevious := (midpoint_right_distance _ _ x (adjacent_values_lt _ _ left)).mpr h.1
  have nearestNext := (midpoint_left_distance _ _ x (adjacent_values_lt _ _ right)).mpr h.2
  have previousLtX := Std.lt_of_lt_of_le (midpoint_between _ _ (adjacent_values_lt _ _ left)).1 h.1
  have xLtNext := Std.lt_of_le_of_lt h.2 (midpoint_between _ _ (adjacent_values_lt _ _ right)).2
  intro candidate
  by_cases hc : Nonnegative candidate
  · rcases Nat.lt_trichotomy candidate.bits.toNat center.bits.toNat with below | same | above
    · have nextCode := left.nextCode
      have bound : candidate.bits.toNat ≤ previous.bits.toNat := by omega
      have values := (positive_code_value_le_iff _ _ hc left.leftNonnegative).mpr bound
      exact Rat.le_trans nearestPrevious (distance_outside_left _ _ _ values previousLtX)
    · have eqNumber := number_eq_of_bits_eq candidate center (UInt64.toNat_inj.mp same)
      rw [eqNumber]
      exact Rat.le_refl
    · have nextCode := right.nextCode
      have bound : next.bits.toNat ≤ candidate.bits.toNat := by omega
      have values := (positive_code_value_le_iff _ _ right.rightNonnegative hc).mpr bound
      exact Rat.le_trans nearestNext (distance_outside_right _ _ _ values xLtNext)
  · have values := Rat.le_trans (value_nonpositive candidate hc)
      (value_nonnegative previous left.leftNonnegative)
    exact Rat.le_trans nearestPrevious (distance_outside_left _ _ _ values previousLtX)

theorem interior_nearest_iff (previous center next : Binary64.Number) (x : Rat)
    (left : Adjacent previous center) (right : Adjacent center next) :
    Nearest center x ↔ ClosedInterior previous center next x := by
  constructor
  · intro h
    exact ⟨(midpoint_right_distance _ _ x (adjacent_values_lt _ _ left)).mp (h previous),
      (midpoint_left_distance _ _ x (adjacent_values_lt _ _ right)).mp (h next)⟩
  · exact closed_interior_nearest previous center next x left right

theorem open_interior_strict_nearest (previous center next : Binary64.Number) (x : Rat)
    (left : Adjacent previous center) (right : Adjacent center next)
    (h : OpenInterior previous center next x) : StrictNearest center x := by
  have nearestPrevious := (midpoint_right_strict _ _ x (adjacent_values_lt _ _ left)).mpr h.1
  have nearestNext := (midpoint_left_strict _ _ x (adjacent_values_lt _ _ right)).mpr h.2
  have previousLtX := Std.lt_trans (midpoint_between _ _ (adjacent_values_lt _ _ left)).1 h.1
  have xLtNext := Std.lt_trans h.2 (midpoint_between _ _ (adjacent_values_lt _ _ right)).2
  intro candidate different
  by_cases hc : Nonnegative candidate
  · rcases Nat.lt_trichotomy candidate.bits.toNat center.bits.toNat with below | same | above
    · have nextCode := left.nextCode
      have bound : candidate.bits.toNat ≤ previous.bits.toNat := by omega
      have values := (positive_code_value_le_iff _ _ hc left.leftNonnegative).mpr bound
      exact Std.lt_of_lt_of_le nearestPrevious (distance_outside_left _ _ _ values previousLtX)
    · exact False.elim (different (UInt64.toNat_inj.mp same))
    · have nextCode := right.nextCode
      have bound : next.bits.toNat ≤ candidate.bits.toNat := by omega
      have values := (positive_code_value_le_iff _ _ right.rightNonnegative hc).mpr bound
      exact Std.lt_of_lt_of_le nearestNext (distance_outside_right _ _ _ values xLtNext)
  · have values := Rat.le_trans (value_nonpositive candidate hc)
      (value_nonnegative previous left.leftNonnegative)
    exact Std.lt_of_lt_of_le nearestPrevious (distance_outside_left _ _ _ values previousLtX)

theorem interior_strict_nearest_iff (previous center next : Binary64.Number) (x : Rat)
    (left : Adjacent previous center) (right : Adjacent center next) :
    StrictNearest center x ↔ OpenInterior previous center next x := by
  constructor
  · intro h
    exact ⟨(midpoint_right_strict _ _ x (adjacent_values_lt _ _ left)).mp
      (h previous (adjacent_bits_differ previous center left)),
      (midpoint_left_strict _ _ x (adjacent_values_lt _ _ right)).mp
      (h next (Ne.symm (adjacent_bits_differ center next right)))⟩
  · exact open_interior_strict_nearest previous center next x left right

theorem closed_interior_reflection (previous center next : Binary64.Number) (x : Rat) :
    ClosedInterior (negate next) (negate center) (negate previous) (-x) ↔
      ClosedInterior previous center next x := by
  simp only [ClosedInterior, negate_value, midpoint_reflection]
  grind

theorem open_interior_reflection (previous center next : Binary64.Number) (x : Rat) :
    OpenInterior (negate next) (negate center) (negate previous) (-x) ↔
      OpenInterior previous center next x := by
  simp only [OpenInterior, negate_value, midpoint_reflection]
  grind

theorem reflected_interior_nearest_iff (previous center next : Binary64.Number) (x : Rat)
    (left : Adjacent previous center) (right : Adjacent center next) :
    Nearest (negate center) x ↔ ClosedInterior (negate next) (negate center) (negate previous) x := by
  calc
    _ ↔ Nearest center (-x) := by simpa only [Rat.neg_neg] using nearest_reflection center (-x)
    _ ↔ ClosedInterior previous center next (-x) := interior_nearest_iff _ _ _ _ left right
    _ ↔ _ := by simpa only [Rat.neg_neg] using (closed_interior_reflection previous center next (-x)).symm

theorem reflected_interior_strict_nearest_iff (previous center next : Binary64.Number) (x : Rat)
    (left : Adjacent previous center) (right : Adjacent center next) :
    StrictNearest (negate center) x ↔ OpenInterior (negate next) (negate center) (negate previous) x := by
  calc
    _ ↔ StrictNearest center (-x) := by simpa only [Rat.neg_neg] using strict_nearest_reflection center (-x)
    _ ↔ OpenInterior previous center next (-x) := interior_strict_nearest_iff _ _ _ _ left right
    _ ↔ _ := by simpa only [Rat.neg_neg] using (open_interior_reflection previous center next (-x)).symm

theorem interior_cell_iff_nearest_by_parity (previous center next : Binary64.Number) (x : Rat)
    (left : Adjacent previous center) (right : Adjacent center next) :
    Cell previous center next x ↔
      if Even center then Nearest center x else StrictNearest center x := by
  rw [interior_nearest_iff _ _ _ _ left right, interior_strict_nearest_iff _ _ _ _ left right]
  rfl

theorem reflected_cell_iff_nearest_by_parity (previous center next : Binary64.Number) (x : Rat)
    (left : Adjacent previous center) (right : Adjacent center next) :
    Cell (negate next) (negate center) (negate previous) x ↔
      if Even (negate center) then Nearest (negate center) x else StrictNearest (negate center) x := by
  rw [reflected_interior_nearest_iff _ _ _ _ left right,
    reflected_interior_strict_nearest_iff _ _ _ _ left right]
  rfl

theorem negative_zero_nearest_iff (x : Rat) : Nearest negativeZero x ↔ ZeroCell x := by
  rw [zero_cell_iff_global_nearest]
  simp only [Nearest, positive_zero_value, negative_zero_value]

theorem positive_zero_never_strict (x : Rat) : ¬ StrictNearest positiveZero x := by
  intro h
  have impossible := h negativeZero (by decide)
  rw [positive_zero_value, negative_zero_value] at impossible
  exact Rat.lt_irrefl impossible

theorem negative_zero_never_strict (x : Rat) : ¬ StrictNearest negativeZero x := by
  intro h
  have impossible := h positiveZero (by decide)
  rw [positive_zero_value, negative_zero_value] at impossible
  exact Rat.lt_irrefl impossible

theorem negative_one_lower_midpoint_nearest :
    Nearest (negate Algal.Core.RoundingInterval.one)
      (-midpoint (value Algal.Core.RoundingInterval.one) (value afterOne)) := by
  apply (nearest_reflection _ _).mpr
  apply (interior_nearest_iff _ _ _ _ one_left_adjacent one_right_adjacent).mpr
  have lower := (midpoint_between _ _ (adjacent_values_lt _ _ one_left_adjacent)).2
  have upper := (midpoint_between _ _ (adjacent_values_lt _ _ one_right_adjacent)).1
  exact ⟨Rat.le_of_lt (Std.lt_trans lower upper), Rat.le_refl⟩

theorem negative_one_lower_midpoint_not_strict :
    ¬ StrictNearest (negate Algal.Core.RoundingInterval.one)
      (-midpoint (value Algal.Core.RoundingInterval.one) (value afterOne)) := by
  rw [strict_nearest_reflection, interior_strict_nearest_iff _ _ _ _ one_left_adjacent one_right_adjacent]
  intro h
  exact Rat.lt_irrefl h.2

theorem negative_odd_midpoint_nearest_but_cell_excluded :
    Nearest (negate afterOne) (-midpoint (value Algal.Core.RoundingInterval.one) (value afterOne)) ∧
    ¬ Cell (negate afterAfterOne) (negate afterOne) (negate Algal.Core.RoundingInterval.one)
      (-midpoint (value Algal.Core.RoundingInterval.one) (value afterOne)) := by
  constructor
  · apply (nearest_reflection _ _).mpr
    apply (interior_nearest_iff _ _ _ _ one_right_adjacent after_one_right_adjacent).mpr
    have lower := (midpoint_between _ _ (adjacent_values_lt _ _ one_right_adjacent)).2
    have upper := (midpoint_between _ _ (adjacent_values_lt _ _ after_one_right_adjacent)).1
    exact ⟨Rat.le_refl, Rat.le_of_lt (Std.lt_trans lower upper)⟩
  · rw [cell_reflection]
    exact odd_lower_midpoint_rejected

theorem negative_maximum_lower_tie_has_distinct_competitor :
    ∃ candidate : Binary64.Number, candidate.bits ≠ (negate maximum).bits ∧
      (-maximumLower - value (negate maximum)).abs = (-maximumLower - value candidate).abs := by
  exact ⟨negate beforeMaximum, by decide, negative_maximum_lower_tie_equal_distance⟩

theorem signed_zero_distinct_nearest_at_zero :
    positiveZero.bits ≠ negativeZero.bits ∧ Nearest positiveZero 0 ∧ Nearest negativeZero 0 := by
  exact ⟨by decide, (zero_cell_iff_global_nearest 0).mp zero_in_zero_cell,
    (negative_zero_nearest_iff 0).mpr zero_in_zero_cell⟩

theorem negative_overflow_boundary_finite_geometry_and_model_refusal :
    StrictNearest (negate maximum) (-overflowBoundary) ∧
    ¬ NegativeMaximumCell (-overflowBoundary) ∧
    Binary64.admit (modelRoundedBits .negative 18014398509481983 970) = none :=
  ⟨negative_overflow_tie_strict_nearest, negative_overflow_tie_excluded_from_finite_cell,
    overflow_model_refused .negative⟩

end Algal.Core.NegativeEndpoints
