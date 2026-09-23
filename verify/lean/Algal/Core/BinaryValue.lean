import Algal.Core.Binary64
import Init.Data.Dyadic
import Init.Data.Float.Model.Unpacked.Pack.Lemmas
import Init.Omega

/-!
Exact finite-binary64 dyadic/rational denotation, connected to the pinned Lean
binary64 unpack model. `exact` is an unchecked raw-field formula; semantic input
admission is carried by `denote : Binary64.Number → Dyadic`. The formula alone
does not admit infinities or NaNs. No decimal rounding, shortest rendering,
denotation injectivity converse, or production refinement is claimed.
-/
namespace Algal.Core.BinaryValue
open Algal.Core
open Float.Model
open Float.Model.UnpackedFloat

def fraction (bits : UInt64) : Nat := bits.toNat % 4503599627370496
def signBit (bits : UInt64) : Nat := bits.toNat / 9223372036854775808
def sign (bits : UInt64) : Sign := if signBit bits = 0 then .positive else .negative
def coefficient (bits : UInt64) : Nat :=
  if Binary64.exponent bits = 0 then fraction bits else 4503599627370496 + fraction bits
def power (bits : UInt64) : Int :=
  if Binary64.exponent bits = 0 then -1074 else (Binary64.exponent bits : Int) - 1075
def exact (bits : UInt64) : Dyadic :=
  Dyadic.ofIntWithPrec ((sign bits).apply (coefficient bits)) (-power bits)

def unpackedExact : UnpackedFloat → Option Dyadic
  | .zero _ => some 0
  | .finite s m e _ => some (Dyadic.ofIntWithPrec (s.apply m) (-e))
  | .infinity _ => none
  | .notANumber => none

theorem fraction_lt (bits : UInt64) : fraction bits < 4503599627370496 :=
  Nat.mod_lt _ (by decide)

theorem signBit_lt (bits : UInt64) : signBit bits < 2 := by
  have h := bits.toNat_lt
  unfold signBit
  omega

theorem fields_recompose (bits : UInt64) :
    bits.toNat = signBit bits * 9223372036854775808 +
      Binary64.exponent bits * 4503599627370496 + fraction bits := by
  have h := bits.toNat_lt
  unfold signBit Binary64.exponent fraction
  omega

theorem model_fraction (bits : UInt64) :
    (UnpackedFloat.unpackMantissa (spec := .binary64) bits.toBitVec).toNat = fraction bits := by
  simp [UnpackedFloat.unpackMantissa, BitVec.extractLsb'_toNat, fraction]

theorem model_exponent (bits : UInt64) :
    (UnpackedFloat.unpackExponent (spec := .binary64) bits.toBitVec).toNat = Binary64.exponent bits := by
  simp [UnpackedFloat.unpackExponent, BitVec.extractLsb'_toNat, Nat.shiftRight_eq_div_pow,
    Binary64.exponent]

theorem model_signBit (bits : UInt64) :
    (UnpackedFloat.unpackSign (spec := .binary64) bits.toBitVec).toNat = signBit bits := by
  have h := signBit_lt bits
  unfold signBit at h
  simpa [UnpackedFloat.unpackSign, BitVec.extractLsb'_toNat, Nat.shiftRight_eq_div_pow,
    signBit] using Nat.mod_eq_of_lt h

theorem model_sign (bits : UInt64) :
    Sign.ofBitVec (UnpackedFloat.unpackSign (spec := .binary64) bits.toBitVec) = sign bits := by
  have h := model_signBit bits
  have hz : UnpackedFloat.unpackSign (spec := .binary64) bits.toBitVec = 0#1 ↔ signBit bits = 0 := by
    rw [← BitVec.toNat_inj]
    simpa using congrArg (fun n => n = 0) h
  simp [Sign.ofBitVec, sign, hz]

theorem model_denotation (number : Binary64.Number) :
    unpackedExact (UnpackedFloat.unpack .binary64 number.bits.toBitVec) = some (exact number.bits) := by
  have exponent_eq := model_exponent number.bits
  have fraction_eq := model_fraction number.bits
  have finite := number.finite
  have exponent_finite :
      UnpackedFloat.unpackExponent (spec := .binary64) number.bits.toBitVec ≠ -1#11 := by
    intro h
    have := congrArg BitVec.toNat h
    rw [exponent_eq] at this
    change Binary64.exponent number.bits = 2047 at this
    unfold Binary64.Finite at finite
    omega
  have exponent_zero :
      UnpackedFloat.unpackExponent (spec := .binary64) number.bits.toBitVec = 0#11 ↔
        Binary64.exponent number.bits = 0 := by
    rw [← BitVec.toNat_inj]
    simpa using congrArg (fun n => n = 0) exponent_eq
  have fraction_zero :
      UnpackedFloat.unpackMantissa (spec := .binary64) number.bits.toBitVec = 0#52 ↔
        fraction number.bits = 0 := by
    rw [← BitVec.toNat_inj]
    simpa using congrArg (fun n => n = 0) fraction_eq
  have normal_sig :
      (1#1 ++ UnpackedFloat.unpackMantissa (spec := .binary64) number.bits.toBitVec).toNat =
        4503599627370496 + fraction number.bits := by
    rw [BitVec.toNat_append, ← Nat.shiftLeft_add_eq_or_of_lt]
    · simp [Nat.shiftLeft_eq, fraction_eq]
    · exact BitVec.toNat_lt_twoPow_of_le (Nat.le_refl _)
  unfold UnpackedFloat.unpack
  simp only [exponent_finite, ↓reduceIte, exponent_zero]
  by_cases he : Binary64.exponent number.bits = 0
  · simp only [he, ↓reduceIte]
    by_cases hm : fraction number.bits = 0
    · cases hs : sign number.bits <;> simp [fraction_zero, hm, unpackedExact, exact, coefficient, power, he, hs,
        Sign.apply, Dyadic.ofIntWithPrec_zero]
    · simp [fraction_zero, hm, unpackedExact, exact, coefficient, power, he,
        exponent_eq, fraction_eq, model_sign, Format.exponentBias]
  · simp [he, unpackedExact, exact, coefficient, power, exponent_eq, normal_sig,
      model_sign, Format.exponentBias]


theorem model_nonfinite_rejected (bits : UInt64) (notFinite : ¬ Binary64.Finite bits) :
    unpackedExact (UnpackedFloat.unpack .binary64 bits.toBitVec) = none := by
  have expBound : Binary64.exponent bits < 2048 := Nat.mod_lt _ (by decide)
  have expTop : Binary64.exponent bits = 2047 := by unfold Binary64.Finite at notFinite; omega
  have expVec : UnpackedFloat.unpackExponent (spec := .binary64) bits.toBitVec = -1#11 := by
    apply BitVec.toNat_inj.mp
    rw [model_exponent, expTop]
    rfl
  unfold UnpackedFloat.unpack
  simp only [expVec, ↓reduceIte]
  split <;> rfl

def denote (number : Binary64.Number) : Dyadic := exact number.bits

theorem coefficient_lt (bits : UInt64) : coefficient bits < 9007199254740992 := by
  have h := fraction_lt bits
  unfold coefficient
  split <;> omega

theorem normal_coefficient_lower (bits : UInt64) (h : Binary64.exponent bits ≠ 0) :
    4503599627370496 ≤ coefficient bits := by
  simp [coefficient, h]

theorem power_bounds (number : Binary64.Number) : -1074 ≤ power number.bits ∧ power number.bits ≤ 971 := by
  have finite := number.finite
  unfold Binary64.Finite at finite
  unfold power
  split <;> omega

theorem exact_subnormal (bits : UInt64) (h : Binary64.exponent bits = 0) :
    exact bits = Dyadic.ofIntWithPrec ((sign bits).apply (fraction bits)) 1074 := by
  simp [exact, coefficient, power, h]

theorem exact_normal (bits : UInt64) (h : Binary64.exponent bits ≠ 0) :
    exact bits = Dyadic.ofIntWithPrec
      ((sign bits).apply (4503599627370496 + fraction bits))
      (1075 - (Binary64.exponent bits : Int)) := by
  simp [exact, coefficient, power, h, Int.neg_sub]

theorem exact_rational (number : Binary64.Number) :
    (denote number).toRat = (((sign number.bits).apply (coefficient number.bits) : Int) : Rat) *
      (2 : Rat) ^ power number.bits := by
  simp [denote, exact, Dyadic.toRat_ofIntWithPrec_eq_mul_two_pow]

theorem subnormal_rational (number : Binary64.Number) (h : Binary64.exponent number.bits = 0) :
    (denote number).toRat = mkRat ((sign number.bits).apply (fraction number.bits)) (2 ^ 1074) := by
  rw [denote, exact_subnormal _ h, Dyadic.toRat_ofIntWithPrec_eq_mkRat]
  simp only [Int.reduceNeg, Int.reduceToNat, Int.shiftLeft_zero, Nat.one_shiftLeft]

theorem sign_apply_zero_iff (s : Sign) (m : Nat) : s.apply m = 0 ↔ m = 0 := by
  cases s <;> simp [Sign.apply]

theorem dyadic_zero_iff (m e : Int) : Dyadic.ofIntWithPrec m e = 0 ↔ m = 0 := by
  unfold Dyadic.ofIntWithPrec
  split <;> simp_all [Dyadic.zero_eq]

theorem coefficient_zero_iff (bits : UInt64) :
    coefficient bits = 0 ↔ Binary64.exponent bits = 0 ∧ fraction bits = 0 := by
  unfold coefficient
  split <;> omega

theorem zero_fields_iff (bits : UInt64) :
    Binary64.exponent bits = 0 ∧ fraction bits = 0 ↔ bits = 0 ∨ bits = Binary64.negativeZero := by
  constructor
  · intro h
    have rep := fields_recompose bits
    have sign_bound := signBit_lt bits
    have alternatives : signBit bits = 0 ∨ signBit bits = 1 := by omega
    rcases alternatives with hs | hs
    · left
      apply UInt64.toNat_inj.mp
      change bits.toNat = 0
      omega
    · right
      apply UInt64.toNat_inj.mp
      change bits.toNat = 9223372036854775808
      omega
  · intro h
    rcases h with h | h <;> subst bits <;> decide

theorem exact_zero_iff (bits : UInt64) : exact bits = 0 ↔ bits = 0 ∨ bits = Binary64.negativeZero := by
  rw [exact, dyadic_zero_iff, sign_apply_zero_iff, coefficient_zero_iff, zero_fields_iff]

theorem exact_positive_zero : exact 0 = 0 := (exact_zero_iff _).mpr (Or.inl rfl)
theorem exact_negative_zero : exact Binary64.negativeZero = 0 := (exact_zero_iff _).mpr (Or.inr rfl)

theorem normalization_preserves_denotation (number : Binary64.Number) :
    denote (Binary64.normalize number) = denote number := by
  by_cases hz : number.bits = Binary64.negativeZero
  · simp [denote, Binary64.normalize, Binary64.normalizeBits, hz, exact_positive_zero, exact_negative_zero]
  · simp [denote, Binary64.normalize, Binary64.normalizeBits, hz]

theorem equivalent_denotation (a b : Binary64.Number) (h : Binary64.Equivalent a b) :
    denote a = denote b := by
  rw [← normalization_preserves_denotation a, ← normalization_preserves_denotation b]
  exact congrArg denote h

theorem minimum_subnormal_value : exact 1 = Dyadic.ofIntWithPrec 1 1074 := rfl
theorem negative_minimum_subnormal_value :
    exact 0x8000000000000001 = Dyadic.ofIntWithPrec (-1) 1074 := rfl

theorem minimum_normal_value : exact 0x0010000000000000 = Dyadic.ofIntWithPrec 4503599627370496 1074 := rfl
theorem one_value : exact 0x3ff0000000000000 = 1 := rfl
theorem negative_one_value : exact 0xbff0000000000000 = -1 := rfl

theorem maximum_finite_value :
    exact 0x7fefffffffffffff = Dyadic.ofIntWithPrec 9007199254740991 (-971) := rfl

theorem zeros_same_value_distinct_bits : exact 0 = exact Binary64.negativeZero ∧
    (0 : UInt64) ≠ Binary64.negativeZero := by
  exact ⟨exact_positive_zero.trans exact_negative_zero.symm, by decide⟩

end Algal.Core.BinaryValue
