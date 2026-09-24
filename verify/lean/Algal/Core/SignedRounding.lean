import Algal.Core.RoundingInterval

/- Finite binary64 sign reflection. This reflects actual finite bit patterns
and exact rational values, without changing Binary64.Number admission. -/
namespace Algal.Core.SignedRounding
open Algal.Core
open Algal.Core.NumericInjectivity Algal.Core.RoundingInterval
open Float.Model.UnpackedFloat

def half : Nat := 9223372036854775808

def negateBits (bits : UInt64) : UInt64 :=
  UInt64.ofNat (if BinaryValue.signBit bits = 0 then bits.toNat + half else bits.toNat - half)

theorem negateBits_toNat (bits : UInt64) :
    (negateBits bits).toNat =
      if BinaryValue.signBit bits = 0 then bits.toNat + half else bits.toNat - half := by
  have hb := bits.toNat_lt
  unfold negateBits
  change (if BinaryValue.signBit bits = 0 then bits.toNat + half else bits.toNat - half) % 18446744073709551616 = _
  apply Nat.mod_eq_of_lt
  unfold BinaryValue.signBit half
  split <;> omega

theorem negateBits_fields (bits : UInt64) :
    Binary64.exponent (negateBits bits) = Binary64.exponent bits ∧
    BinaryValue.fraction (negateBits bits) = BinaryValue.fraction bits ∧
    BinaryValue.signBit (negateBits bits) = 1 - BinaryValue.signBit bits := by
  have hb := bits.toNat_lt
  simp only [Binary64.exponent, BinaryValue.fraction, BinaryValue.signBit, negateBits_toNat]
  unfold BinaryValue.signBit half
  split <;> omega

theorem negateBits_finite (n : Binary64.Number) : Binary64.Finite (negateBits n.bits) := by
  unfold Binary64.Finite
  rw [(negateBits_fields n.bits).1]
  exact n.finite

def negate (n : Binary64.Number) : Binary64.Number := ⟨negateBits n.bits, negateBits_finite n⟩

theorem negate_involution (n : Binary64.Number) : negate (negate n) = n := by
  have hb := n.bits.toNat_lt
  have hs := (negateBits_fields n.bits).2.2
  have hn := negateBits_toNat n.bits
  have hnn := negateBits_toNat (negateBits n.bits)
  have same : (negateBits (negateBits n.bits)).toNat = n.bits.toNat := by
    rw [hs, hn] at hnn
    unfold BinaryValue.signBit half at *
    split at hnn <;> split at hnn <;> omega
  cases n
  simpa only [negate, Binary64.Number.mk.injEq] using UInt64.toNat_inj.mp same

theorem negate_injective (a b : Binary64.Number) (h : negate a = negate b) : a = b := by
  have hh := congrArg negate h
  simpa only [negate_involution] using hh

theorem negate_sign (n : Binary64.Number) :
    BinaryValue.sign (negate n).bits =
      match BinaryValue.sign n.bits with | .positive => .negative | .negative => .positive := by
  have h := (negateBits_fields n.bits).2.2
  have bound := BinaryValue.signBit_lt n.bits
  by_cases hz : BinaryValue.signBit n.bits = 0
  · simp [negate, BinaryValue.sign, h, hz]
  · have ho : BinaryValue.signBit n.bits = 1 := by omega
    simp [negate, BinaryValue.sign, h, ho]

theorem negate_value (n : Binary64.Number) : value (negate n) = -value n := by
  have fields := negateBits_fields n.bits
  simp only [value, BinaryValue.exact_rational]
  have coefficient : BinaryValue.coefficient (negate n).bits = BinaryValue.coefficient n.bits := by
    simp [negate, BinaryValue.coefficient, fields.1, fields.2.1]
  have power : BinaryValue.power (negate n).bits = BinaryValue.power n.bits := by
    simp [negate, BinaryValue.power, fields.1]
  rw [coefficient, power, negate_sign]
  cases BinaryValue.sign n.bits <;> simp [Sign.apply] <;> grind

theorem negate_even (n : Binary64.Number) : Even (negate n) ↔ Even n := by
  have hb := n.bits.toNat_lt
  unfold Even negate
  simp only
  rw [negateBits_toNat]
  unfold half BinaryValue.signBit
  split <;> omega

theorem negate_nonnegative_iff (n : Binary64.Number) :
    Nonnegative (negate n) ↔ ¬ Nonnegative n := by
  have h := (negateBits_fields n.bits).2.2
  have bound := BinaryValue.signBit_lt n.bits
  unfold Nonnegative negate
  simp only
  rw [h]
  omega

theorem value_nonnegative (n : Binary64.Number) (h : Nonnegative n) : 0 ≤ value n := by
  rw [value_fixed_units n h]
  exact Rat.mul_nonneg Rat.natCast_nonneg (Rat.le_of_lt (Rat.zpow_pos (by decide)))

theorem value_nonpositive (n : Binary64.Number) (h : ¬ Nonnegative n) : value n ≤ 0 := by
  have hn := value_nonnegative (negate n) ((negate_nonnegative_iff n).mpr h)
  rw [negate_value] at hn
  grind

theorem distance_reflection (x y : Rat) : (-x - -y).abs = (x - y).abs := by
  unfold Rat.abs
  split <;> split <;> grind

theorem midpoint_reflection (x y : Rat) : midpoint (-y) (-x) = -midpoint x y := by
  unfold midpoint
  grind

theorem cell_reflection (previous center next : Binary64.Number) (x : Rat) :
    Cell (negate next) (negate center) (negate previous) (-x) ↔ Cell previous center next x := by
  simp only [Cell, negate_even, negate_value, midpoint_reflection]
  split <;> grind

theorem signed_zero_negation : negate positiveZero = negativeZero ∧ negate negativeZero = positiveZero := by
  decide

theorem negative_one_reflection : value (negate Algal.Core.RoundingInterval.one) = -1 := by
  rw [negate_value, one_actual_value]

theorem cross_sign_zero_nearest (x y : Rat) (hx : 0 ≤ x) (hy : y ≤ 0) :
    (x - 0).abs ≤ (x - y).abs := by
  unfold Rat.abs
  split <;> split <;> grind

theorem cell_input_positive (previous center next : Binary64.Number) (x : Rat)
    (left : Adjacent previous center) (h : Cell previous center next x) : 0 < x := by
  have hp := value_nonnegative previous left.leftNonnegative
  have hm := midpoint_between _ _ (adjacent_values_lt _ _ left)
  have hb := cell_midpoint_bounds previous center next x h
  exact Std.lt_of_le_of_lt hp (Std.lt_of_lt_of_le hm.1 hb.1)

theorem cell_global_nearest (previous center next candidate : Binary64.Number) (x : Rat)
    (left : Adjacent previous center) (right : Adjacent center next)
    (h : Cell previous center next x) :
    (x - value center).abs ≤ (x - value candidate).abs := by
  by_cases hc : Nonnegative candidate
  · exact cell_global_nearest_nonnegative _ _ _ _ _ left right hc h
  · have nearestZero := cell_global_nearest_nonnegative previous center next positiveZero x left right
      (by decide) h
    have hx := cell_input_positive previous center next x left h
    have hy := value_nonpositive candidate hc
    have hz : value positiveZero = 0 := rfl
    rw [hz] at nearestZero
    exact Rat.le_trans nearestZero (cross_sign_zero_nearest x _ (Rat.le_of_lt hx) hy)

theorem odd_cell_global_strict (previous center next candidate : Binary64.Number) (x : Rat)
    (left : Adjacent previous center) (right : Adjacent center next)
    (different : candidate.bits ≠ center.bits) (odd : ¬ Even center)
    (h : Cell previous center next x) :
    (x - value center).abs < (x - value candidate).abs := by
  by_cases hc : Nonnegative candidate
  · exact odd_cell_global_strict_nonnegative _ _ _ _ _ left right hc different odd h
  · have centerPositiveCode : 0 < center.bits.toNat := by have := left.nextCode; omega
    have differentZero : positiveZero.bits ≠ center.bits := by
      intro he; have hn := congrArg UInt64.toNat he; change 0 = _ at hn; omega
    have nearestZero := odd_cell_global_strict_nonnegative previous center next positiveZero x left right
      (by decide) differentZero odd h
    have hx := cell_input_positive previous center next x left h
    have hy := value_nonpositive candidate hc
    have hz : value positiveZero = 0 := rfl
    rw [hz] at nearestZero
    exact Std.lt_of_lt_of_le nearestZero (cross_sign_zero_nearest x _ (Rat.le_of_lt hx) hy)

theorem reflected_cell_global_nearest (previous center next candidate : Binary64.Number) (x : Rat)
    (left : Adjacent previous center) (right : Adjacent center next)
    (h : Cell (negate next) (negate center) (negate previous) (-x)) :
    (-x - value (negate center)).abs ≤ (-x - value candidate).abs := by
  have hc := (cell_reflection previous center next x).mp h
  have nearest := cell_global_nearest previous center next (negate candidate) x left right hc
  rw [negate_value] at nearest ⊢
  have d := distance_reflection x (-value candidate)
  have dcenter := distance_reflection x (value center)
  calc
    _ = (x - value center).abs := dcenter
    _ ≤ (x - -value candidate).abs := nearest
    _ = (-x - value candidate).abs := by simpa only [Rat.neg_neg] using d.symm

theorem reflected_odd_cell_global_strict (previous center next candidate : Binary64.Number) (x : Rat)
    (left : Adjacent previous center) (right : Adjacent center next)
    (different : candidate.bits ≠ (negate center).bits) (odd : ¬ Even center)
    (h : Cell (negate next) (negate center) (negate previous) (-x)) :
    (-x - value (negate center)).abs < (-x - value candidate).abs := by
  have hc := (cell_reflection previous center next x).mp h
  have differentReflected : (negate candidate).bits ≠ center.bits := by
    intro same
    have eqNumber : negate candidate = center := by
      cases hcan : negate candidate; cases hcenter : center
      simp_all only
    have eqNegative := congrArg negate eqNumber
    rw [negate_involution] at eqNegative
    exact different (congrArg Binary64.Number.bits eqNegative)
  have nearest := odd_cell_global_strict previous center next (negate candidate) x left right
    differentReflected odd hc
  rw [negate_value] at nearest ⊢
  calc
    _ = (x - value center).abs := distance_reflection x _
    _ < (x - -value candidate).abs := nearest
    _ = (-x - value candidate).abs := by
      simpa only [Rat.neg_neg] using (distance_reflection x (-value candidate)).symm

theorem reflected_center_in_own_cell (previous center next : Binary64.Number)
    (left : Adjacent previous center) (right : Adjacent center next) :
    Cell (negate next) (negate center) (negate previous) (value (negate center)) := by
  rw [negate_value, cell_reflection]
  exact center_in_own_cell _ _ _ left right

theorem sign_reflection_identity_rejected :
    negate Algal.Core.RoundingInterval.one ≠ Algal.Core.RoundingInterval.one := by decide

end Algal.Core.SignedRounding
