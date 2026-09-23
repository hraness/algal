import Init
import Init.Data.Float

/-!
The portable number domain is an IEEE-754 binary64 bit pattern with a finite
exponent. This is not an abstract real-number model. Serialization identifies
the two zeros; execution need not. No decimal printer/parser theorem is assumed.
-/
namespace Algal.Core.Binary64

def negativeZero : UInt64 := 0x8000000000000000

def exponent (bits : UInt64) : Nat := bits.toNat / 4503599627370496 % 2048

def Finite (bits : UInt64) : Prop := exponent bits < 2047

instance (bits : UInt64) : Decidable (Finite bits) := inferInstanceAs (Decidable (_ < _))

structure Number where
  bits : UInt64
  finite : Finite bits
  deriving DecidableEq

def admit (bits : UInt64) : Option Number :=
  if h : Finite bits then some ⟨bits, h⟩ else none

theorem admit_number (number : Number) : admit number.bits = some number := by
  cases number with
  | mk bits finite => simp [admit, finite]

def normalizeBits (bits : UInt64) : UInt64 :=
  if bits = negativeZero then 0 else bits

theorem normalizeBits_idempotent (bits : UInt64) :
    normalizeBits (normalizeBits bits) = normalizeBits bits := by
  by_cases h : bits = negativeZero
  · subst bits
    decide
  · simp [normalizeBits, h]

theorem normalizeBits_finite (bits : UInt64) (h : Finite bits) :
    Finite (normalizeBits bits) := by
  by_cases hz : bits = negativeZero
  · subst bits
    decide
  · simpa [normalizeBits, hz] using h

theorem normalizeBits_not_negativeZero (bits : UInt64) :
    normalizeBits bits ≠ negativeZero := by
  by_cases h : bits = negativeZero
  · subst bits
    decide
  · simp [normalizeBits, h]

def normalize (number : Number) : Number :=
  ⟨normalizeBits number.bits, normalizeBits_finite number.bits number.finite⟩

def Equivalent (a b : Number) : Prop := normalize a = normalize b

def Normalized (number : Number) : Prop := number.bits ≠ negativeZero

theorem normalize_idempotent (number : Number) :
    normalize (normalize number) = normalize number := by
  cases number
  simp only [normalize, normalizeBits_idempotent]

theorem normalize_eq_self (number : Number) (h : Normalized number) :
    normalize number = number := by
  cases number
  simp_all [normalize, Normalized, normalizeBits]

theorem equivalent_normalized_iff (a b : Number)
    (ha : Normalized a) (hb : Normalized b) : Equivalent a b ↔ a = b := by
  simp [Equivalent, normalize_eq_self a ha, normalize_eq_self b hb]

theorem normalizeBits_changes_only_negativeZero (bits : UInt64) :
    normalizeBits bits ≠ bits ↔ bits = negativeZero := by
  by_cases h : bits = negativeZero
  · subst bits
    decide
  · simp [normalizeBits, h]

theorem admit_none_iff (bits : UInt64) : admit bits = none ↔ ¬ Finite bits := by
  unfold admit
  split <;> simp_all

theorem admitted_bits (bits : UInt64) (number : Number)
    (h : admit bits = some number) : number.bits = bits := by
  unfold admit at h
  split at h
  · cases h
    rfl
  · contradiction

-- Kernel-reduced witnesses, not native_decide or an external float oracle.
theorem signed_zero_equivalent : normalizeBits negativeZero = normalizeBits 0 := by decide
theorem signed_zero_bits_differ : negativeZero ≠ (0 : UInt64) := by decide
theorem minimum_subnormal_admitted : Finite 1 := by decide
theorem maximum_finite_admitted : Finite 0x7fefffffffffffff := by decide
theorem positive_infinity_rejected : admit 0x7ff0000000000000 = none := by decide
theorem negative_infinity_rejected : admit 0xfff0000000000000 = none := by decide
theorem nan_rejected : admit 0x7ff8000000000001 = none := by decide
theorem model_addition_witness :
    ((Float.ofBits 0x3ff0000000000000) + (Float.ofBits 0x3ff0000000000000)).toBits =
      (0x4000000000000000 : UInt64) := by decide

end Algal.Core.Binary64
