import Algal.Core.BinaryValue
import Init.Data.Rat.Lemmas
import Init.Omega

/- Scratch: fixed minimum-subnormal units recover normalized finite bits.
   No decimal rounding algorithm or shortest renderer is supplied. -/
namespace Algal.Core.NumericInjectivity
open Algal.Core
open Float.Model.UnpackedFloat

abbrev base : Nat := 4503599627370496

def units (e f : Nat) : Nat :=
  (if e = 0 then f else base + f) * 2 ^ (e - 1)

theorem units_same_exponent_lt (e a b : Nat) (h : a < b) : units e a < units e b := by
  have hp : 0 < 2 ^ (e - 1) := Nat.pow_pos (by decide)
  unfold units
  split
  · exact Nat.mul_lt_mul_of_pos_right h hp
  · exact Nat.mul_lt_mul_of_pos_right (by omega) hp

theorem units_earlier_exponent_lt (e d a b : Nat) (ha : a < base) (h : e < d) :
    units e a < units d b := by
  have hd : d ≠ 0 := by omega
  unfold units
  simp only [hd, ↓reduceIte]
  by_cases he : e = 0
  · simp only [he, ↓reduceIte, Nat.zero_sub, Nat.pow_zero, Nat.mul_one]
    have hp : 1 ≤ 2 ^ (d - 1) := Nat.one_le_pow _ _ (by decide)
    have hl := Nat.mul_le_mul_left (base + b) hp
    simp only [Nat.mul_one] at hl
    omega
  · simp only [he, ↓reduceIte]
    have hcoeff : base + a < base * 2 := by omega
    have hsmall := Nat.mul_lt_mul_of_pos_right hcoeff (Nat.pow_pos (by decide : 0 < 2) : 0 < 2 ^ (e - 1))
    have hexp : (e - 1).succ = e := by omega
    have hstep : base * 2 * 2 ^ (e - 1) = base * 2 ^ e := by
      rw [Nat.mul_assoc, Nat.mul_comm 2, ← Nat.pow_succ, hexp]
    rw [hstep] at hsmall
    have hp := Nat.pow_le_pow_right (by decide : 0 < 2) (show e ≤ d - 1 by omega)
    have hmid := Nat.mul_le_mul_left base hp
    have hlarge := Nat.mul_le_mul_right (2 ^ (d - 1)) (show base ≤ base + b by omega)
    exact Nat.lt_of_lt_of_le hsmall (Nat.le_trans hmid hlarge)

theorem units_injective (e d a b : Nat) (ha : a < base) (hb : b < base)
    (h : units e a = units d b) : e = d ∧ a = b := by
  have he : e = d := by
    rcases Nat.lt_trichotomy e d with he | he | he
    · have := units_earlier_exponent_lt e d a b ha he
      omega
    · exact he
    · have := units_earlier_exponent_lt d e b a hb he
      omega
  subst d
  constructor
  · rfl
  · rcases Nat.lt_trichotomy a b with hf | hf | hf
    · have := units_same_exponent_lt e a b hf
      omega
    · exact hf
    · have := units_same_exponent_lt e b a hf
      omega

def bitUnits (bits : UInt64) : Nat := units (Binary64.exponent bits) (BinaryValue.fraction bits)
def signedUnits (bits : UInt64) : Int := (BinaryValue.sign bits).apply (bitUnits bits)

theorem bitUnits_coefficient (bits : UInt64) :
    bitUnits bits = BinaryValue.coefficient bits * 2 ^ (Binary64.exponent bits - 1) := rfl

theorem precision_shift (bits : UInt64) :
    -BinaryValue.power bits + ((Binary64.exponent bits - 1 : Nat) : Int) = 1074 := by
  unfold BinaryValue.power
  split <;> omega

theorem signedUnits_shift (bits : UInt64) :
    signedUnits bits = (BinaryValue.sign bits).apply (BinaryValue.coefficient bits) <<<
      (Binary64.exponent bits - 1) := by
  unfold signedUnits
  rw [bitUnits_coefficient, Int.natCast_mul, Int.natCast_pow, Int.shiftLeft_eq]
  cases BinaryValue.sign bits <;> simp [Sign.apply, Int.neg_mul]

theorem exact_fixed_precision (bits : UInt64) :
    BinaryValue.exact bits = Dyadic.ofIntWithPrec (signedUnits bits) 1074 := by
  rw [signedUnits_shift, ← precision_shift bits, Dyadic.ofIntWithPrec_shiftLeft_add]
  rfl

theorem fixed_precision_injective (a b : Int) (precision : Int)
    (h : Dyadic.ofIntWithPrec a precision = Dyadic.ofIntWithPrec b precision) : a = b := by
  have hr := congrArg Dyadic.toRat h
  simp only [Dyadic.toRat_ofIntWithPrec_eq_mul_two_pow] at hr
  have hc : (2 : Rat) ^ (-precision) ≠ 0 := Rat.ne_of_gt (Rat.zpow_pos (by decide))
  have := congrArg (fun x : Rat => x / (2 : Rat) ^ (-precision)) hr
  simpa only [Rat.mul_div_cancel hc, Rat.intCast_inj] using this

theorem exact_equal_signedUnits (a b : UInt64) (h : BinaryValue.exact a = BinaryValue.exact b) :
    signedUnits a = signedUnits b := by
  rw [exact_fixed_precision, exact_fixed_precision] at h
  exact fixed_precision_injective _ _ _ h

theorem sign_apply_natAbs (s : Sign) (n : Nat) : (s.apply n).natAbs = n := by
  cases s <;> simp [Sign.apply]

theorem exact_equal_bitUnits (a b : UInt64) (h : BinaryValue.exact a = BinaryValue.exact b) :
    bitUnits a = bitUnits b := by
  have same := congrArg Int.natAbs (exact_equal_signedUnits a b h)
  simpa only [signedUnits, sign_apply_natAbs] using same

theorem bitUnits_equal_fields (a b : UInt64) (h : bitUnits a = bitUnits b) :
    Binary64.exponent a = Binary64.exponent b ∧ BinaryValue.fraction a = BinaryValue.fraction b :=
  units_injective _ _ _ _ (BinaryValue.fraction_lt a) (BinaryValue.fraction_lt b) h

theorem sign_equal_signBit (a b : UInt64) (h : BinaryValue.sign a = BinaryValue.sign b) :
    BinaryValue.signBit a = BinaryValue.signBit b := by
  have ha := BinaryValue.signBit_lt a
  have hb := BinaryValue.signBit_lt b
  by_cases sa : BinaryValue.signBit a = 0 <;> by_cases sb : BinaryValue.signBit b = 0
  · omega
  · simp [BinaryValue.sign, sa, sb] at h
  · simp [BinaryValue.sign, sa, sb] at h
  · omega

theorem bits_equal_of_units_sign (a b : UInt64) (hu : bitUnits a = bitUnits b)
    (hs : BinaryValue.sign a = BinaryValue.sign b) : a = b := by
  have fields := bitUnits_equal_fields a b hu
  have signs := sign_equal_signBit a b hs
  apply UInt64.toNat_inj.mp
  rw [BinaryValue.fields_recompose a, BinaryValue.fields_recompose b, fields.1, fields.2, signs]

theorem zero_units_exact_zero (a : UInt64) (h : bitUnits a = 0) : BinaryValue.exact a = 0 := by
  rw [exact_fixed_precision]
  unfold signedUnits
  rw [h]
  cases BinaryValue.sign a <;> rfl

theorem zero_pair_normalizes (a b : UInt64)
    (ha : BinaryValue.exact a = 0) (hb : BinaryValue.exact b = 0) :
    Binary64.normalizeBits a = Binary64.normalizeBits b := by
  have za := (BinaryValue.exact_zero_iff a).mp ha
  have zb := (BinaryValue.exact_zero_iff b).mp hb
  rcases za with za | za <;> rcases zb with zb | zb <;> subst a <;> subst b <;> decide

theorem exact_equal_normalizes (a b : UInt64) (h : BinaryValue.exact a = BinaryValue.exact b) :
    Binary64.normalizeBits a = Binary64.normalizeBits b := by
  have hu := exact_equal_bitUnits a b h
  have hs := exact_equal_signedUnits a b h
  by_cases signSame : BinaryValue.sign a = BinaryValue.sign b
  · exact congrArg Binary64.normalizeBits (bits_equal_of_units_sign a b hu signSame)
  · have zero : bitUnits a = 0 := by
      cases sa : BinaryValue.sign a <;> cases sb : BinaryValue.sign b
      · simp [sa, sb] at signSame
      · simp only [signedUnits, sa, sb, Sign.apply, hu] at hs
        omega
      · simp only [signedUnits, sa, sb, Sign.apply, hu] at hs
        omega
      · simp [sa, sb] at signSame
    exact zero_pair_normalizes a b (zero_units_exact_zero a zero)
      (h.symm.trans (zero_units_exact_zero a zero))

theorem denote_equal_iff_equivalent (a b : Binary64.Number) :
    BinaryValue.denote a = BinaryValue.denote b ↔ Binary64.Equivalent a b := by
  constructor
  · intro h
    have normalized := exact_equal_normalizes a.bits b.bits h
    simpa only [Binary64.Equivalent, Binary64.normalize, Binary64.Number.mk.injEq] using normalized
  · exact BinaryValue.equivalent_denotation a b

theorem rational_equal_iff_equivalent (a b : Binary64.Number) :
    (BinaryValue.denote a).toRat = (BinaryValue.denote b).toRat ↔ Binary64.Equivalent a b := by
  rw [Dyadic.toRat_inj, denote_equal_iff_equivalent]

theorem normalized_denotation_injective (a b : Binary64.Number)
    (ha : Binary64.Normalized a) (hb : Binary64.Normalized b)
    (h : BinaryValue.denote a = BinaryValue.denote b) : a = b :=
  (Binary64.equivalent_normalized_iff a b ha hb).mp ((denote_equal_iff_equivalent a b).mp h)

def positiveZero : Binary64.Number := ⟨0, by decide⟩
def negativeZero : Binary64.Number := ⟨0x8000000000000000, by decide⟩
def one : Binary64.Number := ⟨0x3ff0000000000000, by decide⟩
def two : Binary64.Number := ⟨0x4000000000000000, by decide⟩

theorem signed_zero_equivalence_admitted : BinaryValue.denote positiveZero = BinaryValue.denote negativeZero :=
  (denote_equal_iff_equivalent _ _).mpr (by rfl)

theorem distinct_one_two_denotation_rejected : BinaryValue.denote one ≠ BinaryValue.denote two := by
  intro same
  have impossible := (denote_equal_iff_equivalent one two).mp same
  have different : ¬ Binary64.Equivalent one two := by unfold Binary64.Equivalent; decide
  exact different impossible

end Algal.Core.NumericInjectivity
