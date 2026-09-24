import Algal.Core.FiniteNeighbors
import Algal.Core.IntervalSearch

/- Efficient exact rational bracketing of nonnegative finite binary64 values.
   This is not nearest rounding, overflow admission or decimal conversion. -/
set_option autoImplicit false
namespace Algal.Core.RationalBracket
open Algal.Core
open Algal.Core.NumericInjectivity Algal.Core.RoundingInterval
open Algal.Core.RoundingEndpoints Algal.Core.FiniteNeighbors Algal.Core.NegativeEndpoints

/-- The first excluded finite nonnegative bit code, used only as a sentinel. -/
def domain : Nat := maxCode + 1

/-- A total helper; indices admitted by the search are below domain and unclamped. -/
def atCode (code : Nat) : Binary64.Number :=
  fromCode (min code maxCode) (Nat.min_le_right _ _)

def codeValue (code : Nat) : Rat := value (atCode code)

theorem atCode_nonnegative (code : Nat) : Nonnegative (atCode code) :=
  fromCode_nonnegative _ _

theorem atCode_bits (code : Nat) (bound : code ≤ maxCode) :
    (atCode code).bits.toNat = code := by
  unfold atCode
  rw [fromCode_toNat, Nat.min_eq_left bound]

theorem atCode_recovers (n : Binary64.Number) (sign : Nonnegative n) :
    atCode n.bits.toNat = n := by
  apply number_eq_of_bits_eq
  apply UInt64.toNat_inj.mp
  exact atCode_bits _ (nonnegative_code_bound n sign)

theorem codeValue_recovers (n : Binary64.Number) (sign : Nonnegative n) :
    codeValue n.bits.toNat = value n := by
  unfold codeValue
  rw [atCode_recovers n sign]

theorem codeValue_order (a b : Nat) (ha : a ≤ maxCode) (hb : b ≤ maxCode) :
    codeValue a ≤ codeValue b ↔ a ≤ b := by
  unfold codeValue
  rw [positive_code_value_le_iff _ _ (atCode_nonnegative _) (atCode_nonnegative _),
    atCode_bits a ha, atCode_bits b hb]

theorem codeValue_strict (a b : Nat) (ha : a ≤ maxCode) (hb : b ≤ maxCode)
    (order : a < b) : codeValue a < codeValue b := by
  apply positive_code_value_lt _ _ (atCode_nonnegative _) (atCode_nonnegative _)
  rw [atCode_bits a ha, atCode_bits b hb]
  exact order

theorem codeValue_zero : codeValue 0 = 0 := rfl

theorem atCode_maximum : atCode maxCode = maximum := by
  apply number_eq_of_bits_eq
  rfl

def below (x : Rat) (code : Nat) : Bool := decide (codeValue code ≤ x)

theorem below_prefix (x : Rat) : IntervalSearch.Prefix (below x) domain := by
  intro a b order within yes
  have hb : b ≤ maxCode := by unfold domain at within; omega
  have ha : a ≤ maxCode := by omega
  have upper : codeValue b ≤ x := of_decide_eq_true yes
  exact decide_eq_true (Rat.le_trans ((codeValue_order a b ha hb).mpr order) upper)

def first (x : Rat) : Nat := IntervalSearch.cut (below x) 0 domain

theorem first_bound (x : Rat) : first x ≤ domain :=
  (IntervalSearch.cut_bounds (below x) 0 domain (Nat.zero_le _)).2

theorem first_partition (x : Rat) :
    (∀ k, k < first x → codeValue k ≤ x) ∧
      (∀ k, first x ≤ k → k < domain → x < codeValue k) := by
  have parts := IntervalSearch.full_partition (below x) domain (below_prefix x)
  constructor
  · intro k before
    exact of_decide_eq_true (parts.1 k before)
  · intro k after within
    exact Rat.not_le.mp (of_decide_eq_false (parts.2 k after within))

theorem first_positive (x : Rat) (nonnegative : 0 ≤ x) : 0 < first x := by
  have yes : below x 0 = true := by
    apply decide_eq_true
    simpa only [codeValue_zero] using nonnegative
  exact (IntervalSearch.true_iff_before_cut (below x) domain 0 (below_prefix x)
    (by decide)).mp yes

def lowerCode (x : Rat) : Nat := first x - 1

theorem lowerCode_bound (x : Rat) : lowerCode x ≤ maxCode := by
  have bound := first_bound x
  unfold lowerCode domain at *
  omega

def lowerNumber (x : Rat) : Binary64.Number := atCode (lowerCode x)

theorem lower_nonnegative (x : Rat) : Nonnegative (lowerNumber x) := atCode_nonnegative _

theorem lower_below (x : Rat) (nonnegative : 0 ≤ x) : value (lowerNumber x) ≤ x := by
  have positive := first_positive x nonnegative
  exact (first_partition x).1 (lowerCode x) (by unfold lowerCode; omega)

theorem lower_greatest (x : Rat) (candidate : Binary64.Number)
    (sign : Nonnegative candidate) (belowInput : value candidate ≤ x) :
    value candidate ≤ value (lowerNumber x) := by
  have codeBound := nonnegative_code_bound candidate sign
  have yes : below x candidate.bits.toNat = true := by
    apply decide_eq_true
    simpa only [codeValue_recovers candidate sign] using belowInput
  have before := (IntervalSearch.true_iff_before_cut (below x) domain candidate.bits.toNat
    (below_prefix x) (by unfold domain; omega)).mp yes
  rw [← codeValue_recovers candidate sign]
  exact (codeValue_order _ _ codeBound (lowerCode_bound x)).mpr (by unfold lowerCode first; omega)

theorem next_adjacent_to_lower (x : Rat) (nonnegative : 0 ≤ x) (inside : first x < domain) :
    Adjacent (lowerNumber x) (atCode (first x)) := by
  have positive := first_positive x nonnegative
  refine ⟨lower_nonnegative x, atCode_nonnegative _, ?_⟩
  change (atCode (first x)).bits.toNat = (atCode (lowerCode x)).bits.toNat + 1
  rw [atCode_bits _ (by unfold domain at inside; omega), atCode_bits _ (lowerCode_bound x)]
  unfold lowerCode
  omega

theorem next_above (x : Rat) (inside : first x < domain) : x < value (atCode (first x)) :=
  (first_partition x).2 (first x) (Nat.le_refl _) inside

theorem sentinel_is_maximum (x : Rat) (sentinel : first x = domain) :
    lowerNumber x = maximum := by
  have code : lowerCode x = maxCode := by unfold lowerCode domain at *; omega
  unfold lowerNumber
  rw [code, atCode_maximum]

structure Bracket where
  lower : Binary64.Number
  upper : Option Binary64.Number
  comparisons : Nat

/-- One binary-search descent; no enumeration of finite values. -/
def bracket (x : Rat) : Bracket :=
  let result := IntervalSearch.search (below x) 0 domain
  { lower := atCode (result.1 - 1)
    upper := if result.1 < domain then some (atCode result.1) else none
    comparisons := result.2 }

theorem bracket_lower (x : Rat) : (bracket x).lower = lowerNumber x := by
  simp only [bracket, IntervalSearch.search_spec, lowerNumber, lowerCode, first]

theorem bracket_upper (x : Rat) :
    (bracket x).upper = if first x < domain then some (atCode (first x)) else none := by
  simp only [bracket, IntervalSearch.search_spec, first]
  rfl

theorem bracket_comparison_bound (x : Rat) : (bracket x).comparisons ≤ 63 := by
  change (IntervalSearch.search (below x) 0 domain).2 ≤ 63
  apply IntervalSearch.search_comparisons_le
  decide

theorem bracket_upper_correct (x : Rat) (nonnegative : 0 ≤ x) :
    match (bracket x).upper with
    | none => (bracket x).lower = maximum
    | some upper => Adjacent (bracket x).lower upper ∧ x < value upper := by
  rw [bracket_upper, bracket_lower]
  by_cases inside : first x < domain
  · rw [ite_eq_left inside]
    exact ⟨next_adjacent_to_lower x nonnegative inside, next_above x inside⟩
  · rw [ite_eq_right inside]
    apply sentinel_is_maximum x
    have bound := first_bound x
    omega

theorem bracket_correct (x : Rat) (nonnegative : 0 ≤ x) :
    Nonnegative (bracket x).lower ∧ value (bracket x).lower ≤ x ∧
      (∀ candidate, Nonnegative candidate → value candidate ≤ x →
        value candidate ≤ value (bracket x).lower) ∧
      (bracket x).comparisons ≤ 63 := by
  rw [bracket_lower]
  exact ⟨lower_nonnegative x, lower_below x nonnegative,
    fun candidate sign admitted => lower_greatest x candidate sign admitted,
    bracket_comparison_bound x⟩


theorem first_at_code (code : Nat) (bound : code ≤ maxCode) :
    first (codeValue code) = code + 1 := by
  apply IntervalSearch.cut_unique _ _ _ (below_prefix _) (by unfold domain; omega)
  · intro k before
    apply decide_eq_true
    exact (codeValue_order k code (by omega) bound).mpr (by omega)
  · intro k after within
    apply decide_eq_false
    intro wrong
    have order := (codeValue_order k code (by unfold domain at within; omega) bound).mp wrong
    omega

theorem lower_at_code (code : Nat) (bound : code ≤ maxCode) :
    lowerNumber (codeValue code) = atCode code := by
  unfold lowerNumber lowerCode
  rw [first_at_code code bound]
  simp

theorem lower_at_number (n : Binary64.Number) (sign : Nonnegative n) :
    lowerNumber (value n) = n := by
  have exactCode := lower_at_code n.bits.toNat (nonnegative_code_bound n sign)
  simpa only [atCode_recovers n sign, codeValue_recovers n sign] using exactCode

theorem first_in_gap (x : Rat) (code : Nat) (inside : code + 1 ≤ maxCode)
    (lower : codeValue code ≤ x) (upper : x < codeValue (code + 1)) :
    first x = code + 1 := by
  apply IntervalSearch.cut_unique _ _ _ (below_prefix x) (by unfold domain; omega)
  · intro k before
    apply decide_eq_true
    exact Rat.le_trans ((codeValue_order k code (by omega) (by omega)).mpr (by omega)) lower
  · intro k after within
    apply decide_eq_false
    intro wrong
    have order := (codeValue_order (code + 1) k inside (by unfold domain at within; omega)).mpr after
    exact (Rat.not_lt.mpr (Rat.le_trans order wrong)) upper

theorem lower_in_gap (x : Rat) (code : Nat) (inside : code + 1 ≤ maxCode)
    (lower : codeValue code ≤ x) (upper : x < codeValue (code + 1)) :
    lowerNumber x = atCode code := by
  unfold lowerNumber lowerCode
  rw [first_in_gap x code inside lower upper]
  simp

theorem sentinel_iff_maximum_below (x : Rat) :
    first x = domain ↔ codeValue maxCode ≤ x := by
  constructor
  · intro sentinel
    exact (first_partition x).1 maxCode (by rw [sentinel]; unfold domain; omega)
  · intro admitted
    have yes : below x maxCode = true := decide_eq_true admitted
    have before := (IntervalSearch.true_iff_before_cut (below x) domain maxCode
      (below_prefix x) (by unfold domain; omega)).mp yes
    have bound := first_bound x
    unfold first domain at *
    omega

theorem zero_lower_witness : (bracket 0).lower = positiveZero := by
  rw [bracket_lower]
  exact lower_at_number positiveZero (by decide)

theorem one_lower_witness : (bracket 1).lower = RoundingInterval.one := by
  rw [bracket_lower]
  exact lower_at_number RoundingInterval.one (by decide)

theorem maximum_lower_witness : (bracket (value maximum)).lower = maximum := by
  rw [bracket_lower]
  exact lower_at_number maximum (by decide)

theorem maximum_has_no_upper_witness : (bracket (value maximum)).upper = none := by
  rw [bracket_upper]
  have sentinel : first (value maximum) = domain := by
    apply (sentinel_iff_maximum_below _).mpr
    rw [codeValue, atCode_maximum]
    exact Rat.le_refl
  rw [sentinel]
  simp

theorem negative_input_lower_promise_rejected :
    ¬ value (bracket (-1)).lower ≤ -1 := by
  have nonnegative := SignedRounding.value_nonnegative (lowerNumber (-1)) (lower_nonnegative (-1))
  rw [bracket_lower]
  grind

end Algal.Core.RationalBracket
