import Algal.Core.NumericInjectivity
import Init.Grind
import Init.Grind.Ordered.Rat

/- Scratch: exact rational midpoint cells for nonnegative interior finite values.
   No decimal conversion, signed/overflow boundary completion or shortestness. -/
namespace Algal.Core.RoundingInterval
open Algal.Core
open Algal.Core.NumericInjectivity
open Float.Model.UnpackedFloat

def value (n : Binary64.Number) : Rat := (BinaryValue.denote n).toRat
def Nonnegative (n : Binary64.Number) : Prop := BinaryValue.signBit n.bits = 0
instance (n : Binary64.Number) : Decidable (Nonnegative n) := inferInstanceAs (Decidable (_ = _))

theorem value_fixed_units (n : Binary64.Number) (h : Nonnegative n) :
    value n = (bitUnits n.bits : Rat) * (2 : Rat) ^ (-1074 : Int) := by
  unfold value BinaryValue.denote
  rw [exact_fixed_precision, Dyadic.toRat_ofIntWithPrec_eq_mul_two_pow]
  unfold Nonnegative at h
  unfold signedUnits BinaryValue.sign
  rw [ite_eq_left h]
  rfl

theorem positive_code_units_lt (a b : Binary64.Number) (ha : Nonnegative a) (hb : Nonnegative b)
    (h : a.bits.toNat < b.bits.toNat) : bitUnits a.bits < bitUnits b.bits := by
  have ra := BinaryValue.fields_recompose a.bits
  have rb := BinaryValue.fields_recompose b.bits
  have fa := BinaryValue.fraction_lt a.bits
  have fb := BinaryValue.fraction_lt b.bits
  unfold Nonnegative at ha hb
  rw [ha] at ra
  rw [hb] at rb
  have ordered : Binary64.exponent a.bits < Binary64.exponent b.bits ∨
      Binary64.exponent a.bits = Binary64.exponent b.bits ∧ BinaryValue.fraction a.bits < BinaryValue.fraction b.bits := by
    omega
  rcases ordered with exponent | ⟨exponent, fraction⟩
  · exact units_earlier_exponent_lt _ _ _ _ fa exponent
  · unfold bitUnits
    rw [exponent]
    exact units_same_exponent_lt _ _ _ fraction

theorem positive_code_value_lt (a b : Binary64.Number) (ha : Nonnegative a) (hb : Nonnegative b)
    (h : a.bits.toNat < b.bits.toNat) : value a < value b := by
  rw [value_fixed_units a ha, value_fixed_units b hb]
  exact Rat.mul_lt_mul_of_pos_right
    (Rat.natCast_lt_natCast.mpr (positive_code_units_lt a b ha hb h))
    (Rat.zpow_pos (by decide))

theorem positive_code_value_le_iff (a b : Binary64.Number) (ha : Nonnegative a) (hb : Nonnegative b) :
    value a ≤ value b ↔ a.bits.toNat ≤ b.bits.toNat := by
  constructor
  · intro hv
    by_cases h : a.bits.toNat ≤ b.bits.toNat
    · exact h
    · have hc : b.bits.toNat < a.bits.toNat := by omega
      have wrong := positive_code_value_lt b a hb ha hc
      exact False.elim ((Rat.not_lt.mpr hv) wrong)
  · intro h
    rcases Nat.lt_or_eq_of_le h with h | h
    · exact Rat.le_of_lt (positive_code_value_lt a b ha hb h)
    · have eqbits := UInt64.toNat_inj.mp h
      unfold value BinaryValue.denote
      rw [eqbits]
      exact Rat.le_refl

structure Adjacent (a b : Binary64.Number) : Prop where
  leftNonnegative : Nonnegative a
  rightNonnegative : Nonnegative b
  nextCode : b.bits.toNat = a.bits.toNat + 1

theorem adjacent_values_lt (a b : Binary64.Number) (h : Adjacent a b) : value a < value b :=
  positive_code_value_lt a b h.leftNonnegative h.rightNonnegative (by have := h.nextCode; omega)

theorem adjacent_no_intermediate (a b c : Binary64.Number) (h : Adjacent a b) (hc : Nonnegative c) :
    value c ≤ value a ∨ value b ≤ value c := by
  rw [positive_code_value_le_iff c a hc h.leftNonnegative,
    positive_code_value_le_iff b c h.rightNonnegative hc]
  have := h.nextCode
  omega

def midpoint (a b : Rat) : Rat := (a + b) / 2

theorem midpoint_between (a b : Rat) (h : a < b) : a < midpoint a b ∧ midpoint a b < b := by
  unfold midpoint
  grind

theorem midpoint_left_distance (a b x : Rat) (h : a < b) :
    (x - a).abs ≤ (x - b).abs ↔ x ≤ midpoint a b := by
  unfold midpoint Rat.abs
  split <;> split <;> grind

theorem midpoint_right_distance (a b x : Rat) (h : a < b) :
    (x - b).abs ≤ (x - a).abs ↔ midpoint a b ≤ x := by
  unfold midpoint Rat.abs
  split <;> split <;> grind

theorem midpoint_left_strict (a b x : Rat) (h : a < b) :
    (x - a).abs < (x - b).abs ↔ x < midpoint a b := by
  unfold midpoint Rat.abs
  split <;> split <;> grind

theorem midpoint_right_strict (a b x : Rat) (h : a < b) :
    (x - b).abs < (x - a).abs ↔ midpoint a b < x := by
  unfold midpoint Rat.abs
  split <;> split <;> grind

theorem midpoint_equal_distances (a b : Rat) :
    (midpoint a b - a).abs = (midpoint a b - b).abs := by
  unfold midpoint Rat.abs
  split <;> split <;> grind

def Even (n : Binary64.Number) : Prop := n.bits.toNat % 2 = 0
instance (n : Binary64.Number) : Decidable (Even n) := inferInstanceAs (Decidable (_ = _))

theorem coefficient_parity (bits : UInt64) :
    BinaryValue.coefficient bits % 2 = bits.toNat % 2 := by
  unfold BinaryValue.coefficient BinaryValue.fraction
  split <;> omega

theorem adjacent_even_toggle (a b : Binary64.Number) (h : Adjacent a b) : Even a ↔ ¬ Even b := by
  have := h.nextCode
  unfold Even
  omega

theorem model_tie_keeps_even (n : Binary64.Number) (h : Even n) :
    Accuracy.roundToNearestEven (BinaryValue.coefficient n.bits) (.inexact .eq) =
      BinaryValue.coefficient n.bits := by
  simp only [Accuracy.roundToNearestEven, coefficient_parity]
  change _ + n.bits.toNat % 2 = _
  unfold Even at h
  omega

theorem model_tie_moves_odd (n : Binary64.Number) (h : ¬ Even n) :
    Accuracy.roundToNearestEven (BinaryValue.coefficient n.bits) (.inexact .eq) =
      BinaryValue.coefficient n.bits + 1 := by
  simp only [Accuracy.roundToNearestEven, coefficient_parity]
  unfold Even at h
  omega

def Cell (previous center next : Binary64.Number) (x : Rat) : Prop :=
  if Even center then midpoint (value previous) (value center) ≤ x ∧ x ≤ midpoint (value center) (value next)
  else midpoint (value previous) (value center) < x ∧ x < midpoint (value center) (value next)

theorem cell_neighbor_nearest (previous center next : Binary64.Number) (x : Rat)
    (left : Adjacent previous center) (right : Adjacent center next) (h : Cell previous center next x) :
    (x - value center).abs ≤ (x - value previous).abs ∧
      (x - value center).abs ≤ (x - value next).abs := by
  rw [midpoint_right_distance _ _ _ (adjacent_values_lt _ _ left),
    midpoint_left_distance _ _ _ (adjacent_values_lt _ _ right)]
  unfold Cell at h
  split at h
  · exact h
  · exact ⟨Rat.le_of_lt h.1, Rat.le_of_lt h.2⟩

theorem odd_cell_neighbor_strict (previous center next : Binary64.Number) (x : Rat)
    (left : Adjacent previous center) (right : Adjacent center next)
    (odd : ¬ Even center) (h : Cell previous center next x) :
    (x - value center).abs < (x - value previous).abs ∧
      (x - value center).abs < (x - value next).abs := by
  rw [midpoint_right_strict _ _ _ (adjacent_values_lt _ _ left),
    midpoint_left_strict _ _ _ (adjacent_values_lt _ _ right)]
  simpa only [Cell, odd, ↓reduceIte] using h

theorem cell_midpoint_bounds (previous center next : Binary64.Number) (x : Rat)
    (h : Cell previous center next x) :
    midpoint (value previous) (value center) ≤ x ∧ x ≤ midpoint (value center) (value next) := by
  unfold Cell at h
  split at h
  · exact h
  · exact ⟨Rat.le_of_lt h.1, Rat.le_of_lt h.2⟩

theorem distance_outside_left (candidate anchor x : Rat) (h : candidate ≤ anchor) (hx : anchor < x) :
    (x - anchor).abs ≤ (x - candidate).abs := by
  unfold Rat.abs
  split <;> split <;> grind

theorem distance_outside_right (candidate anchor x : Rat) (h : anchor ≤ candidate) (hx : x < anchor) :
    (x - anchor).abs ≤ (x - candidate).abs := by
  unfold Rat.abs
  split <;> split <;> grind

theorem cell_global_nearest_nonnegative (previous center next candidate : Binary64.Number) (x : Rat)
    (left : Adjacent previous center) (right : Adjacent center next) (hc : Nonnegative candidate)
    (h : Cell previous center next x) :
    (x - value center).abs ≤ (x - value candidate).abs := by
  have nearest := cell_neighbor_nearest previous center next x left right h
  have bounds := cell_midpoint_bounds previous center next x h
  have lower := midpoint_between (value previous) (value center) (adjacent_values_lt _ _ left)
  have upper := midpoint_between (value center) (value next) (adjacent_values_lt _ _ right)
  rcases Nat.lt_trichotomy candidate.bits.toNat center.bits.toNat with below | same | above
  · have nextCode := left.nextCode
    have codeBound : candidate.bits.toNat ≤ previous.bits.toNat := by omega
    have valueBound := (positive_code_value_le_iff _ _ hc left.leftNonnegative).mpr codeBound
    exact Rat.le_trans nearest.1 (distance_outside_left _ _ _ valueBound (Std.lt_of_lt_of_le lower.1 bounds.1))
  · have eqbits := UInt64.toNat_inj.mp same
    unfold value BinaryValue.denote
    rw [eqbits]
    exact Rat.le_refl
  · have nextCode := right.nextCode
    have codeBound : next.bits.toNat ≤ candidate.bits.toNat := by omega
    have valueBound := (positive_code_value_le_iff _ _ right.rightNonnegative hc).mpr codeBound
    exact Rat.le_trans nearest.2 (distance_outside_right _ _ _ valueBound (Std.lt_of_le_of_lt bounds.2 upper.2))

theorem odd_cell_global_strict_nonnegative (previous center next candidate : Binary64.Number) (x : Rat)
    (left : Adjacent previous center) (right : Adjacent center next) (hc : Nonnegative candidate)
    (different : candidate.bits ≠ center.bits) (odd : ¬ Even center) (h : Cell previous center next x) :
    (x - value center).abs < (x - value candidate).abs := by
  have nearest := odd_cell_neighbor_strict previous center next x left right odd h
  have bounds := cell_midpoint_bounds previous center next x h
  have lower := midpoint_between (value previous) (value center) (adjacent_values_lt _ _ left)
  have upper := midpoint_between (value center) (value next) (adjacent_values_lt _ _ right)
  rcases Nat.lt_trichotomy candidate.bits.toNat center.bits.toNat with below | same | above
  · have nextCode := left.nextCode
    have codeBound : candidate.bits.toNat ≤ previous.bits.toNat := by omega
    have valueBound := (positive_code_value_le_iff _ _ hc left.leftNonnegative).mpr codeBound
    exact Std.lt_of_lt_of_le nearest.1 (distance_outside_left _ _ _ valueBound (Std.lt_of_lt_of_le lower.1 bounds.1))
  · exact False.elim (different (UInt64.toNat_inj.mp same))
  · have nextCode := right.nextCode
    have codeBound : next.bits.toNat ≤ candidate.bits.toNat := by omega
    have valueBound := (positive_code_value_le_iff _ _ right.rightNonnegative hc).mpr codeBound
    exact Std.lt_of_lt_of_le nearest.2 (distance_outside_right _ _ _ valueBound (Std.lt_of_le_of_lt bounds.2 upper.2))

theorem center_in_own_cell (previous center next : Binary64.Number)
    (left : Adjacent previous center) (right : Adjacent center next) :
    Cell previous center next (value center) := by
  have lower := midpoint_between (value previous) (value center) (adjacent_values_lt _ _ left)
  have upper := midpoint_between (value center) (value next) (adjacent_values_lt _ _ right)
  unfold Cell
  split
  · exact ⟨Rat.le_of_lt lower.2, Rat.le_of_lt upper.1⟩
  · exact ⟨lower.2, upper.1⟩

def beforeOne : Binary64.Number := ⟨0x3fefffffffffffff, by decide⟩
def one : Binary64.Number := ⟨0x3ff0000000000000, by decide⟩
def afterOne : Binary64.Number := ⟨0x3ff0000000000001, by decide⟩
def afterAfterOne : Binary64.Number := ⟨0x3ff0000000000002, by decide⟩

theorem one_left_adjacent : Adjacent beforeOne one := ⟨by decide, by decide, by decide⟩
theorem one_right_adjacent : Adjacent one afterOne := ⟨by decide, by decide, by decide⟩
theorem after_one_right_adjacent : Adjacent afterOne afterAfterOne := ⟨by decide, by decide, by decide⟩
theorem one_even : Even one := by decide
theorem after_one_odd : ¬ Even afterOne := by decide

theorem one_actual_value : value one = 1 := rfl

theorem one_self_in_cell : Cell beforeOne one afterOne 1 := by
  rw [← one_actual_value]
  exact center_in_own_cell _ _ _ one_left_adjacent one_right_adjacent

theorem one_lower_midpoint_included : Cell beforeOne one afterOne (midpoint (value beforeOne) (value one)) := by
  have lower := midpoint_between _ _ (adjacent_values_lt _ _ one_left_adjacent)
  have upper := midpoint_between _ _ (adjacent_values_lt _ _ one_right_adjacent)
  simp only [Cell, one_even, ↓reduceIte]
  exact ⟨Rat.le_refl, Rat.le_of_lt (Std.lt_trans lower.2 upper.1)⟩

theorem odd_lower_midpoint_rejected :
    ¬ Cell one afterOne afterAfterOne (midpoint (value one) (value afterOne)) := by
  simp only [Cell, after_one_odd, ↓reduceIte]
  intro h
  exact Rat.lt_irrefl h.1

theorem one_neighbor_gaps_asymmetric :
    value one - value beforeOne = (Dyadic.ofIntWithPrec 1 53).toRat ∧
    value afterOne - value one = (Dyadic.ofIntWithPrec 1 52).toRat := by
  simp only [Rat.sub_def]
  decide

def maximumSubnormal : Binary64.Number := ⟨0x000fffffffffffff, by decide⟩
def minimumNormal : Binary64.Number := ⟨0x0010000000000000, by decide⟩
def afterMinimumNormal : Binary64.Number := ⟨0x0010000000000001, by decide⟩

theorem subnormal_normal_adjacent : Adjacent maximumSubnormal minimumNormal :=
  ⟨by decide, by decide, by decide⟩

theorem minimum_normal_next_adjacent : Adjacent minimumNormal afterMinimumNormal :=
  ⟨by decide, by decide, by decide⟩

theorem minimum_normal_even : Even minimumNormal := by decide

set_option maxRecDepth 4096 in
set_option exponentiation.threshold 2048 in
theorem subnormal_normal_gaps_equal :
    value minimumNormal - value maximumSubnormal = (Dyadic.ofIntWithPrec 1 1074).toRat ∧
    value afterMinimumNormal - value minimumNormal = (Dyadic.ofIntWithPrec 1 1074).toRat := by
  simp only [Rat.sub_def]
  decide

end Algal.Core.RoundingInterval
