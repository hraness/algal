import Algal.Core.RationalBracket

/-!
Constructive nearest-even selection for nonnegative rational magnitudes over the
finite binary64 domain.  The selector searches the finite code domain once,
then chooses one of the returned adjacent values by exact midpoint comparison.
Overflow admission, decimal parsing/rendering, and machine refinement remain
outside this module.
-/
set_option autoImplicit false
namespace Algal.Core.RationalSelector

open Algal.Core
open Algal.Core.RationalBracket
open Algal.Core.RoundingInterval
open Algal.Core.RoundingEndpoints
open Algal.Core.NegativeEndpoints
open Algal.Core.FiniteNeighbors
open Algal.Core.SignedRounding
open Algal.Core.NumericInjectivity
open Float.Model.UnpackedFloat

def chooseInterior (lower upper : Binary64.Number) (x : Rat) : Binary64.Number :=
  let middle := midpoint (value lower) (value upper)
  if middle < x then upper
  else if x < middle then lower
  else if Even lower then lower else upper

def selectNonnegative (x : Rat) : Binary64.Number :=
  let b := bracket x
  match b.upper with
  | none => b.lower
  | some upper => chooseInterior b.lower upper x

def signedInput (s : Sign) (magnitude : Rat) : Rat :=
  match s with
  | .positive => magnitude
  | .negative => -magnitude

def selectSigned (s : Sign) (magnitude : Rat) : Binary64.Number :=
  match s with
  | .positive => selectNonnegative magnitude
  | .negative => negate (selectNonnegative magnitude)

theorem chooseInterior_lower_of_lt (lower upper : Binary64.Number) (x : Rat)
    (h : x < midpoint (value lower) (value upper)) :
    chooseInterior lower upper x = lower := by
  simp [chooseInterior, h, Rat.not_lt.mpr (Rat.le_of_lt h)]

theorem chooseInterior_upper_of_gt (lower upper : Binary64.Number) (x : Rat)
    (h : midpoint (value lower) (value upper) < x) :
    chooseInterior lower upper x = upper := by
  simp [chooseInterior, h]

theorem chooseInterior_lower_at_even (lower upper : Binary64.Number) (x : Rat)
    (h : x = midpoint (value lower) (value upper)) (even : Even lower) :
    chooseInterior lower upper x = lower := by
  simp [chooseInterior, h, even]

theorem chooseInterior_upper_at_odd (lower upper : Binary64.Number) (x : Rat)
    (h : x = midpoint (value lower) (value upper)) (odd : ¬ Even lower) :
    chooseInterior lower upper x = upper := by
  simp [chooseInterior, h, odd]

theorem selected_nonnegative (x : Rat) (h : 0 ≤ x) :
    Nonnegative (selectNonnegative x) := by
  unfold selectNonnegative
  by_cases hu : (bracket x).upper = none
  · simp [hu]
    exact (bracket_correct x h).1
  · cases upper : (bracket x).upper with
    | none => contradiction
    | some u =>
      simp only [upper] at hu ⊢
      have adjacent : Adjacent (bracket x).lower u ∧ x < value u := by
        simpa [upper] using (bracket_upper_correct x h)
      by_cases hm : midpoint (value (bracket x).lower) (value u) < x
      · rw [chooseInterior_upper_of_gt _ _ _ hm]
        exact adjacent.1.rightNonnegative
      · by_cases hl : x < midpoint (value (bracket x).lower) (value u)
        · rw [chooseInterior_lower_of_lt _ _ _ hl]
          exact (bracket_correct x h).1
        · have heq : x = midpoint (value (bracket x).lower) (value u) := by
            exact Rat.le_antisymm (Rat.not_lt.mp hm) (Rat.not_lt.mp hl)
          by_cases he : Even (bracket x).lower
          · rw [chooseInterior_lower_at_even _ _ _ heq he]
            exact (bracket_correct x h).1
          · rw [chooseInterior_upper_at_odd _ _ _ heq he]
            exact adjacent.1.rightNonnegative

theorem lower_strict_nearest_of_lt_mid (lower upper : Binary64.Number) (x : Rat)
    (lowerNonnegative : Nonnegative lower) (positive : 0 < lower.bits.toNat)
    (adjacent : Adjacent lower upper) (lowerAt : value lower ≤ x)
    (upperMid : x < midpoint (value lower) (value upper)) :
    StrictNearest lower x := by
  let previous := previous lower lowerNonnegative
  have left : Adjacent previous lower := previous_adjacent lower lowerNonnegative positive
  apply (interior_strict_nearest_iff previous lower upper x left adjacent).mpr
  refine ⟨?_, upperMid⟩
  exact Std.lt_of_lt_of_le
    (midpoint_between (value previous) (value lower)
      (adjacent_values_lt _ _ left)).2 lowerAt

theorem upper_strict_nearest_of_gt_mid (lower upper : Binary64.Number) (x : Rat)
    (upperNonnegative : Nonnegative upper) (below : upper.bits.toNat < maxCode)
    (adjacent : Adjacent lower upper) (upperAbove : x < value upper)
    (lowerMid : midpoint (value lower) (value upper) < x) :
    StrictNearest upper x := by
  let nextValue := next upper below
  have right : Adjacent upper nextValue := next_adjacent upper upperNonnegative below
  apply (interior_strict_nearest_iff lower upper nextValue x adjacent right).mpr
  refine ⟨lowerMid, ?_⟩
  exact Std.lt_trans upperAbove
    (midpoint_between (value upper) (value nextValue)
      (adjacent_values_lt _ _ right)).1

theorem maximum_nearest_of_at_le (x : Rat) (atLeast : value maximum ≤ x) :
    Nearest maximum x := by
  unfold Nearest
  apply maximum_nearest_iff x |>.mpr
  exact Rat.le_trans
    (Rat.le_of_lt (midpoint_between (value beforeMaximum) (value maximum)
      (adjacent_values_lt _ _ maximum_previous_adjacent)).2) atLeast

theorem upper_is_maximum_or_below (upper : Binary64.Number)
    (upperNonnegative : Nonnegative upper) :
    upper = maximum ∨ upper.bits.toNat < maxCode := by
  by_cases same : upper.bits.toNat = maxCode
  · left
    apply number_eq_of_bits_eq
    apply UInt64.toNat_inj.mp
    simpa [maximum, maxCode] using same
  · right
    have bound := nonnegative_code_bound upper upperNonnegative
    omega

theorem chooseInterior_cases (lower upper : Binary64.Number) (x : Rat) :
    (chooseInterior lower upper x = lower ∧ x ≤ midpoint (value lower) (value upper)) ∨
    (chooseInterior lower upper x = upper ∧ midpoint (value lower) (value upper) ≤ x) := by
  unfold chooseInterior
  dsimp only
  by_cases above : midpoint (value lower) (value upper) < x
  · simp only [above, ↓reduceIte]
    exact Or.inr ⟨True.intro, Rat.le_of_lt above⟩
  · simp only [above, ↓reduceIte]
    by_cases below : x < midpoint (value lower) (value upper)
    · simp only [below, ↓reduceIte]
      exact Or.inl ⟨True.intro, Rat.le_of_lt below⟩
    · simp only [below, ↓reduceIte]
      by_cases even : Even lower
      · simp only [even, ↓reduceIte]
        exact Or.inl ⟨True.intro, Rat.not_lt.mp above⟩
      · simp only [even, ↓reduceIte]
        exact Or.inr ⟨True.intro, Rat.not_lt.mp below⟩

theorem distance_outside_left_closed (candidate anchor x : Rat)
    (order : candidate ≤ anchor) (lower : anchor ≤ x) :
    (x - anchor).abs ≤ (x - candidate).abs := by
  unfold Rat.abs
  split <;> split <;> grind

theorem chooseInterior_nearest (lower upper : Binary64.Number) (x : Rat)
    (adjacent : Adjacent lower upper) (lowerAt : value lower ≤ x)
    (upperAbove : x < value upper) : Nearest (chooseInterior lower upper x) x := by
  have near : (x - value (chooseInterior lower upper x)).abs ≤ (x - value lower).abs ∧
      (x - value (chooseInterior lower upper x)).abs ≤ (x - value upper).abs := by
    rcases chooseInterior_cases lower upper x with left | right
    · rw [left.1]
      exact ⟨Rat.le_refl,
        (midpoint_left_distance _ _ _ (adjacent_values_lt _ _ adjacent)).mpr left.2⟩
    · rw [right.1]
      exact ⟨(midpoint_right_distance _ _ _ (adjacent_values_lt _ _ adjacent)).mpr right.2,
        Rat.le_refl⟩
  intro candidate
  by_cases sign : Nonnegative candidate
  · rcases adjacent_no_intermediate lower upper candidate adjacent sign with before | after
    · exact Rat.le_trans near.1 (distance_outside_left_closed _ _ _ before lowerAt)
    · exact Rat.le_trans near.2 (distance_outside_right _ _ _ after upperAbove)
  · have before := Rat.le_trans (value_nonpositive candidate sign)
      (value_nonnegative lower adjacent.leftNonnegative)
    exact Rat.le_trans near.1 (distance_outside_left_closed _ _ _ before lowerAt)

theorem select_nearest_nonnegative (x : Rat) (nonnegative : 0 ≤ x) :
    Nearest (selectNonnegative x) x := by
  have lowerAt := (bracket_correct x nonnegative).2.1
  have bracketInfo := bracket_upper_correct x nonnegative
  cases upperEq : (bracket x).upper with
  | none =>
    simp only [upperEq] at bracketInfo
    simpa only [selectNonnegative, upperEq, bracketInfo] using
      maximum_nearest_of_at_le x (by simpa only [bracketInfo] using lowerAt)
  | some upper =>
    simp only [upperEq] at bracketInfo
    simpa only [selectNonnegative, upperEq] using
      chooseInterior_nearest _ _ _ bracketInfo.1 lowerAt bracketInfo.2

theorem selectSigned_nearest (s : Sign) (magnitude : Rat) (nonnegative : 0 ≤ magnitude) :
    Nearest (selectSigned s magnitude) (signedInput s magnitude) := by
  cases s with
  | positive =>
      exact select_nearest_nonnegative magnitude nonnegative
  | negative =>
      exact (nearest_reflection (selectNonnegative magnitude) magnitude).mpr
        (select_nearest_nonnegative magnitude nonnegative)

theorem chooseInterior_midpoint_even (lower upper : Binary64.Number)
    (adjacent : Adjacent lower upper) :
    Even (chooseInterior lower upper (midpoint (value lower) (value upper))) := by
  by_cases even : Even lower
  · rw [chooseInterior_lower_at_even _ _ _ rfl even]
    exact even
  · rw [chooseInterior_upper_at_odd _ _ _ rfl even]
    by_cases upperEven : Even upper
    · exact upperEven
    · exact False.elim (even ((adjacent_even_toggle _ _ adjacent).mpr upperEven))

theorem bracket_at_adjacent_gap (lower upper : Binary64.Number) (x : Rat)
    (adjacent : Adjacent lower upper) (lowerAt : value lower ≤ x)
    (upperAbove : x < value upper) :
    (bracket x).lower = lower ∧ (bracket x).upper = some upper := by
  have lowerBound := nonnegative_code_bound lower adjacent.leftNonnegative
  have upperBound := nonnegative_code_bound upper adjacent.rightNonnegative
  have code := adjacent.nextCode
  have lowerValue : codeValue lower.bits.toNat ≤ x := by
    simpa only [codeValue_recovers lower adjacent.leftNonnegative] using lowerAt
  have upperValue : x < codeValue (lower.bits.toNat + 1) := by
    simpa only [← code, codeValue_recovers upper adjacent.rightNonnegative] using upperAbove
  have cut := first_in_gap x lower.bits.toNat (by omega) lowerValue upperValue
  constructor
  · rw [bracket_lower, lower_in_gap x lower.bits.toNat (by omega) lowerValue upperValue,
      atCode_recovers lower adjacent.leftNonnegative]
  · rw [bracket_upper, cut]
    have inside : lower.bits.toNat + 1 < domain := by unfold domain; omega
    rw [ite_eq_left inside, ← code, atCode_recovers upper adjacent.rightNonnegative]

theorem select_at_adjacent_gap (lower upper : Binary64.Number) (x : Rat)
    (adjacent : Adjacent lower upper) (lowerAt : value lower ≤ x)
    (upperAbove : x < value upper) :
    selectNonnegative x = chooseInterior lower upper x := by
  have parts := bracket_at_adjacent_gap lower upper x adjacent lowerAt upperAbove
  simp only [selectNonnegative, parts.1, parts.2]

theorem select_at_midpoint (lower upper : Binary64.Number) (adjacent : Adjacent lower upper) :
    selectNonnegative (midpoint (value lower) (value upper)) =
      if Even lower then lower else upper := by
  have between := midpoint_between _ _ (adjacent_values_lt _ _ adjacent)
  rw [select_at_adjacent_gap _ _ _ adjacent (Rat.le_of_lt between.1) between.2]
  simp only [chooseInterior, Rat.lt_irrefl, ↓reduceIte]

theorem selected_midpoint_even (lower upper : Binary64.Number) (adjacent : Adjacent lower upper) :
    Even (selectNonnegative (midpoint (value lower) (value upper))) := by
  have between := midpoint_between _ _ (adjacent_values_lt _ _ adjacent)
  rw [select_at_adjacent_gap _ _ _ adjacent (Rat.le_of_lt between.1) between.2]
  exact chooseInterior_midpoint_even lower upper adjacent

theorem select_at_number (number : Binary64.Number) (sign : Nonnegative number) :
    selectNonnegative (value number) = number := by
  have nonnegative := value_nonnegative number sign
  have lower : (bracket (value number)).lower = number := by
    rw [bracket_lower, lower_at_number number sign]
  have upper := bracket_upper_correct (value number) nonnegative
  cases upperEq : (bracket (value number)).upper with
  | none => simp only [selectNonnegative, upperEq, lower]
  | some u =>
    simp only [upperEq, lower] at upper
    simp only [selectNonnegative, upperEq, lower]
    exact chooseInterior_lower_of_lt _ _ _ (midpoint_between _ _ (adjacent_values_lt _ _ upper.1)).1

theorem select_at_or_above_maximum (x : Rat) (above : value maximum ≤ x) :
    selectNonnegative x = maximum := by
  have sentinel : first x = domain := by
    apply (sentinel_iff_maximum_below x).mpr
    simpa only [codeValue, atCode_maximum] using above
  have lower : (bracket x).lower = maximum := by
    rw [bracket_lower, sentinel_is_maximum x sentinel]
  have upper : (bracket x).upper = none := by
    rw [bracket_upper, sentinel]
    simp only [Nat.lt_irrefl, ↓reduceIte]
  simp only [selectNonnegative, lower, upper]

theorem zero_selected : selectNonnegative 0 = positiveZero :=
  select_at_number positiveZero (by decide)

theorem one_selected : selectNonnegative 1 = RoundingInterval.one :=
  select_at_number RoundingInterval.one (by decide)

theorem underflow_tie_selected : selectNonnegative underflowBoundary = positiveZero := by
  change selectNonnegative (midpoint (value positiveZero) (value minimumSubnormal)) = positiveZero
  rw [select_at_midpoint _ _ zero_minimum_adjacent, ite_eq_left zero_even]

theorem subnormal_normal_tie_selected :
    selectNonnegative (midpoint (value maximumSubnormal) (value minimumNormal)) = minimumNormal := by
  rw [select_at_midpoint _ _ subnormal_normal_adjacent]
  decide

theorem before_one_tie_selected :
    selectNonnegative (midpoint (value beforeOne) (value RoundingInterval.one)) = RoundingInterval.one := by
  rw [select_at_midpoint _ _ one_left_adjacent]
  decide

theorem after_one_tie_selected :
    selectNonnegative (midpoint (value RoundingInterval.one) (value afterOne)) = RoundingInterval.one := by
  rw [select_at_midpoint _ _ one_right_adjacent, ite_eq_left one_even]

theorem maximum_lower_tie_selected :
    selectNonnegative (midpoint (value beforeMaximum) (value maximum)) = beforeMaximum := by
  rw [select_at_midpoint _ _ maximum_previous_adjacent]
  decide

theorem overflow_tie_selects_finite_maximum : selectNonnegative overflowBoundary = maximum := by
  apply select_at_or_above_maximum
  exact Rat.le_of_lt (midpoint_between _ _ maximum_below_virtual).1

theorem finite_selection_does_not_admit_overflow :
    selectNonnegative overflowBoundary = maximum ∧ PositiveOverflow overflowBoundary ∧
      ¬ MaximumCell overflowBoundary :=
  ⟨overflow_tie_selects_finite_maximum, overflow_tie_is_overflow,
    overflow_tie_excluded_from_finite_cell⟩

theorem explicit_signed_zeros :
    selectSigned .positive 0 = positiveZero ∧ selectSigned .negative 0 = negativeZero := by
  simp only [selectSigned, zero_selected]
  exact ⟨True.intro, signed_zero_negation.1⟩

theorem chooseInterior_odd_side (lower upper : Binary64.Number) (x : Rat)
    (adjacent : Adjacent lower upper) (odd : ¬ Even (chooseInterior lower upper x)) :
    (chooseInterior lower upper x = lower ∧ x < midpoint (value lower) (value upper)) ∨
    (chooseInterior lower upper x = upper ∧ midpoint (value lower) (value upper) < x) := by
  by_cases above : midpoint (value lower) (value upper) < x
  · exact Or.inr ⟨chooseInterior_upper_of_gt _ _ _ above, above⟩
  · by_cases below : x < midpoint (value lower) (value upper)
    · exact Or.inl ⟨chooseInterior_lower_of_lt _ _ _ below, below⟩
    · have tie : x = midpoint (value lower) (value upper) :=
        Rat.le_antisymm (Rat.not_lt.mp above) (Rat.not_lt.mp below)
      rw [tie] at odd
      exact False.elim (odd (chooseInterior_midpoint_even lower upper adjacent))

theorem upper_strict_nearest (lower upper : Binary64.Number) (x : Rat)
    (adjacent : Adjacent lower upper) (upperAbove : x < value upper)
    (lowerMid : midpoint (value lower) (value upper) < x) : StrictNearest upper x := by
  rcases upper_is_maximum_or_below upper adjacent.rightNonnegative with maximumEq | below
  · have lowerEq : lower = beforeMaximum := by
      apply number_eq_of_bits_eq
      apply UInt64.toNat_inj.mp
      have step := adjacent.nextCode
      rw [maximumEq] at step
      change 9218868437227405311 = lower.bits.toNat + 1 at step
      change lower.bits.toNat = 9218868437227405310
      omega
    rw [maximumEq]
    apply (maximum_strict_nearest_iff x).mpr
    simpa only [maximumLower, lowerEq, maximumEq] using lowerMid
  · exact upper_strict_nearest_of_gt_mid lower upper x adjacent.rightNonnegative below
      adjacent upperAbove lowerMid

theorem select_odd_strict_nearest (x : Rat) (nonnegative : 0 ≤ x)
    (odd : ¬ Even (selectNonnegative x)) : StrictNearest (selectNonnegative x) x := by
  have lowerAt := (bracket_correct x nonnegative).2.1
  have bracketInfo := bracket_upper_correct x nonnegative
  cases upperEq : (bracket x).upper with
  | none =>
    simp only [upperEq] at bracketInfo
    have selected : selectNonnegative x = maximum := by
      simp only [selectNonnegative, upperEq, bracketInfo]
    rw [selected]
    apply (maximum_strict_nearest_iff x).mpr
    exact Std.lt_of_lt_of_le
      (show maximumLower < value maximum from
        (midpoint_between _ _ (adjacent_values_lt _ _ maximum_previous_adjacent)).2)
      (by simpa only [bracketInfo] using lowerAt)
  | some upper =>
    simp only [upperEq] at bracketInfo
    have selected : selectNonnegative x = chooseInterior (bracket x).lower upper x := by
      simp only [selectNonnegative, upperEq]
    rw [selected] at odd ⊢
    rcases chooseInterior_odd_side _ _ _ bracketInfo.1 odd with left | right
    · have lowerOdd : ¬ Even (bracket x).lower := by simpa only [left.1] using odd
      have positive : 0 < (bracket x).lower.bits.toNat := by
        unfold Even at lowerOdd
        omega
      rw [left.1]
      exact lower_strict_nearest_of_lt_mid _ _ _ bracketInfo.1.leftNonnegative positive
        bracketInfo.1 lowerAt left.2
    · rw [right.1]
      exact upper_strict_nearest _ _ _ bracketInfo.1 bracketInfo.2 right.2

theorem selectSigned_odd_strict_nearest (s : Sign) (magnitude : Rat)
    (nonnegative : 0 ≤ magnitude) (odd : ¬ Even (selectSigned s magnitude)) :
    StrictNearest (selectSigned s magnitude) (signedInput s magnitude) := by
  cases s with
  | positive => exact select_odd_strict_nearest magnitude nonnegative odd
  | negative =>
      apply (strict_nearest_reflection (selectNonnegative magnitude) magnitude).mpr
      apply select_odd_strict_nearest magnitude nonnegative
      intro even
      exact odd ((negate_even _).mpr even)

theorem selectSigned_tie_even (s : Sign) (magnitude : Rat) (nonnegative : 0 ≤ magnitude)
    (candidate : Binary64.Number) (different : candidate.bits ≠ (selectSigned s magnitude).bits)
    (equalDistance : (signedInput s magnitude - value (selectSigned s magnitude)).abs =
      (signedInput s magnitude - value candidate).abs) : Even (selectSigned s magnitude) := by
  by_cases even : Even (selectSigned s magnitude)
  · exact even
  · have strict := selectSigned_odd_strict_nearest s magnitude nonnegative even candidate different
    rw [equalDistance] at strict
    exact False.elim (Rat.lt_irrefl strict)

theorem bracket_search_comparison_bound (x : Rat) : (bracket x).comparisons ≤ 63 :=
  bracket_comparison_bound x

end Algal.Core.RationalSelector
