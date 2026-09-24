import Algal.Core.SignedRounding
import Init.Data.Float.Model.Unpacked.Round

/- Zero/underflow and maximum-finite/overflow endpoint foundations.
   Exact rational geometry and pinned model witnesses; no decimal converter. -/
namespace Algal.Core.RoundingEndpoints
open Algal.Core
open Algal.Core.NumericInjectivity Algal.Core.RoundingInterval
open Algal.Core.SignedRounding
open Float.Model Float.Model.UnpackedFloat

def minimumSubnormal : Binary64.Number := ⟨1, by decide⟩
def afterMinimumSubnormal : Binary64.Number := ⟨2, by decide⟩
def beforeMaximum : Binary64.Number := ⟨0x7feffffffffffffe, by decide⟩
def maximum : Binary64.Number := ⟨0x7fefffffffffffff, by decide⟩

theorem zero_minimum_adjacent : Adjacent positiveZero minimumSubnormal :=
  ⟨by decide, by decide, by decide⟩
theorem minimum_next_adjacent : Adjacent minimumSubnormal afterMinimumSubnormal :=
  ⟨by decide, by decide, by decide⟩
theorem maximum_previous_adjacent : Adjacent beforeMaximum maximum :=
  ⟨by decide, by decide, by decide⟩

theorem zero_even : Even positiveZero := by decide
theorem minimum_odd : ¬ Even minimumSubnormal := by decide
theorem maximum_odd : ¬ Even maximum := by decide

theorem positive_zero_value : value positiveZero = 0 := rfl
theorem negative_zero_value : value negativeZero = 0 := rfl

theorem minimum_value_positive : 0 < value minimumSubnormal := by
  have h := adjacent_values_lt _ _ zero_minimum_adjacent
  simpa only [positive_zero_value] using h

def underflowBoundary : Rat := midpoint 0 (value minimumSubnormal)
def ZeroCell (x : Rat) : Prop := -underflowBoundary ≤ x ∧ x ≤ underflowBoundary

theorem underflow_boundary_positive : 0 < underflowBoundary :=
  (midpoint_between _ _ minimum_value_positive).1

theorem zero_cell_symmetric (x : Rat) : ZeroCell (-x) ↔ ZeroCell x := by
  unfold ZeroCell
  grind

theorem zero_in_zero_cell : ZeroCell 0 := by
  have h := underflow_boundary_positive
  unfold ZeroCell
  grind

theorem zero_boundary_included : ZeroCell underflowBoundary ∧ ZeroCell (-underflowBoundary) := by
  have h := underflow_boundary_positive
  unfold ZeroCell
  grind

theorem underflow_tie_equal_distance :
    (underflowBoundary - value positiveZero).abs =
      (underflowBoundary - value minimumSubnormal).abs := by
  rw [positive_zero_value]
  exact midpoint_equal_distances 0 _

theorem minimum_underflow_tie_excluded :
    ¬ Cell positiveZero minimumSubnormal afterMinimumSubnormal underflowBoundary := by
  simp only [Cell, minimum_odd, ↓reduceIte, positive_zero_value]
  intro h
  exact Rat.lt_irrefl h.1

theorem least_positive_candidate (candidate : Binary64.Number) (hc : Nonnegative candidate)
    (h : candidate.bits ≠ positiveZero.bits) : value minimumSubnormal ≤ value candidate := by
  apply (positive_code_value_le_iff _ _ (by decide) hc).mpr
  have positive : 0 < candidate.bits.toNat := by
    have hn : candidate.bits.toNat ≠ 0 := by
      intro hz
      have eqbits : candidate.bits = positiveZero.bits := UInt64.toNat_inj.mp hz
      exact h eqbits
    omega
  change 1 ≤ _
  omega

theorem zero_cell_nearest_nonnegative (candidate : Binary64.Number) (x : Rat)
    (hc : Nonnegative candidate) (h : ZeroCell x) :
    (x - value positiveZero).abs ≤ (x - value candidate).abs := by
  by_cases hz : candidate.bits = positiveZero.bits
  · have hv : value candidate = value positiveZero := by unfold value BinaryValue.denote; rw [hz]
    rw [hv]
    exact Rat.le_refl
  · have lower := least_positive_candidate candidate hc hz
    have hx := h.2
    have mid := midpoint_between 0 (value minimumSubnormal) minimum_value_positive
    have nearMin : (x - 0).abs ≤ (x - value minimumSubnormal).abs :=
      (midpoint_left_distance 0 _ x minimum_value_positive).mpr hx
    rw [positive_zero_value]
    exact Rat.le_trans nearMin
      (distance_outside_right _ _ _ lower (Std.lt_of_le_of_lt hx mid.2))

theorem zero_cell_global_nearest (candidate : Binary64.Number) (x : Rat) (h : ZeroCell x) :
    (x - value positiveZero).abs ≤ (x - value candidate).abs := by
  by_cases hc : Nonnegative candidate
  · exact zero_cell_nearest_nonnegative candidate x hc h
  · have nearest := zero_cell_nearest_nonnegative (negate candidate) (-x)
      ((negate_nonnegative_iff candidate).mpr hc) ((zero_cell_symmetric x).mpr h)
    rw [negate_value, positive_zero_value] at nearest
    rw [positive_zero_value]
    have dz := distance_reflection x 0
    have dc := distance_reflection x (value candidate)
    simpa only [Rat.neg_zero] using dz.symm ▸ (dc ▸ nearest)

theorem zero_cell_iff_global_nearest (x : Rat) :
    ZeroCell x ↔ ∀ candidate : Binary64.Number,
      (x - value positiveZero).abs ≤ (x - value candidate).abs := by
  constructor
  · intro h candidate
    exact zero_cell_global_nearest candidate x h
  · intro h
    have hp := h minimumSubnormal
    have hn := h (negate minimumSubnormal)
    rw [positive_zero_value] at hp hn
    rw [negate_value] at hn
    have upper := (midpoint_left_distance 0 _ x minimum_value_positive).mp hp
    have negativeMin : -value minimumSubnormal < 0 := by have := minimum_value_positive; grind
    have lower := (midpoint_right_distance (-value minimumSubnormal) 0 x negativeMin).mp hn
    have reflected : midpoint (-value minimumSubnormal) 0 = -underflowBoundary := by
      simpa only [Rat.neg_zero, underflowBoundary] using midpoint_reflection 0 (value minimumSubnormal)
    rw [reflected] at lower
    exact ⟨lower, upper⟩

theorem signed_zero_same_cell (x : Rat) (h : ZeroCell x) (candidate : Binary64.Number) :
    (x - value negativeZero).abs ≤ (x - value candidate).abs := by
  rw [negative_zero_value, ← positive_zero_value]
  exact zero_cell_global_nearest candidate x h

def zeroFor : Sign → Binary64.Number
  | .positive => positiveZero
  | .negative => negativeZero

theorem zeroFor_value (s : Sign) : value (zeroFor s) = 0 := by cases s <;> rfl

theorem zeroFor_sign (s : Sign) : BinaryValue.sign (zeroFor s).bits = s := by cases s <;> rfl

theorem zeroFor_normalized (s : Sign) : Binary64.normalize (zeroFor s) = positiveZero := by
  cases s <;> rfl

def virtualNext : Rat := (Dyadic.ofIntWithPrec 1 (-1024)).toRat
def overflowBoundary : Rat := midpoint (value maximum) virtualNext
/-- Maximum finite is odd, so neither its lower midpoint nor the overflow tie belongs to it. -/
def MaximumCell (x : Rat) : Prop :=
  midpoint (value beforeMaximum) (value maximum) < x ∧ x < overflowBoundary

def PositiveOverflow (x : Rat) : Prop := overflowBoundary ≤ x

theorem maximum_code_bound (n : Binary64.Number) (h : Nonnegative n) :
    n.bits.toNat ≤ maximum.bits.toNat := by
  have rep := BinaryValue.fields_recompose n.bits
  have frac := BinaryValue.fraction_lt n.bits
  have finite := n.finite
  unfold Nonnegative at h
  unfold Binary64.Finite at finite
  change n.bits.toNat ≤ 9218868437227405311
  omega

theorem maximum_value_bound (n : Binary64.Number) (h : Nonnegative n) :
    value n ≤ value maximum :=
  (positive_code_value_le_iff _ _ h (by decide)).mpr (maximum_code_bound n h)

theorem below_maximum_previous_bound (n : Binary64.Number) (h : Nonnegative n)
    (different : n.bits ≠ maximum.bits) : value n ≤ value beforeMaximum := by
  apply (positive_code_value_le_iff _ _ h (by decide)).mpr
  have top := maximum_code_bound n h
  have unequal : n.bits.toNat ≠ maximum.bits.toNat := by
    intro hn; exact different (UInt64.toNat_inj.mp hn)
  have adj := maximum_previous_adjacent.nextCode
  omega

set_option maxRecDepth 4096 in
set_option exponentiation.threshold 2048 in
theorem maximum_gap_and_virtual_value :
    value maximum - value beforeMaximum = (Dyadic.ofIntWithPrec 1 (-971)).toRat ∧
    virtualNext - value maximum = (Dyadic.ofIntWithPrec 1 (-971)).toRat := by
  simp only [Rat.sub_def]
  decide

theorem maximum_below_virtual : value maximum < virtualNext := by
  have gap := maximum_gap_and_virtual_value.2
  have pos : 0 < (Dyadic.ofIntWithPrec 1 (-971)).toRat := by
    rw [Dyadic.toRat_ofIntWithPrec_eq_mul_two_pow]
    simp only [Int.reduceNeg, Rat.intCast_one, Rat.one_mul]
    exact Rat.zpow_pos (by decide)
  grind

theorem maximum_in_own_cell : MaximumCell (value maximum) := by
  exact ⟨(midpoint_between _ _ (adjacent_values_lt _ _ maximum_previous_adjacent)).2,
    (midpoint_between _ _ maximum_below_virtual).1⟩

theorem maximum_lower_tie_excluded :
    ¬ MaximumCell (midpoint (value beforeMaximum) (value maximum)) := by
  intro h
  exact Rat.lt_irrefl h.1

theorem overflow_tie_excluded_from_finite_cell : ¬ MaximumCell overflowBoundary := by
  intro h
  exact Rat.lt_irrefl h.2

theorem overflow_tie_is_overflow : PositiveOverflow overflowBoundary := Rat.le_refl

theorem overflow_disjoint_maximum (x : Rat) (h : MaximumCell x) : ¬ PositiveOverflow x := by
  unfold PositiveOverflow
  exact Rat.not_le.mpr h.2

/-- This finite-only nearest result intentionally has no overflow upper bound. -/
theorem maximum_nearest_nonnegative (candidate : Binary64.Number) (x : Rat)
    (hc : Nonnegative candidate)
    (h : midpoint (value beforeMaximum) (value maximum) ≤ x) :
    (x - value maximum).abs ≤ (x - value candidate).abs := by
  by_cases same : candidate.bits = maximum.bits
  · have hv : value candidate = value maximum := by unfold value BinaryValue.denote; rw [same]
    rw [hv]
    exact Rat.le_refl
  · have candidateBound := below_maximum_previous_bound candidate hc same
    have nearPrevious := (midpoint_right_distance _ _ x (adjacent_values_lt _ _ maximum_previous_adjacent)).mpr h
    have mid := midpoint_between _ _ (adjacent_values_lt _ _ maximum_previous_adjacent)
    exact Rat.le_trans nearPrevious
      (distance_outside_left _ _ _ candidateBound (Std.lt_of_lt_of_le mid.1 h))

theorem maximum_nearest_all_finite (candidate : Binary64.Number) (x : Rat)
    (h : midpoint (value beforeMaximum) (value maximum) ≤ x) :
    (x - value maximum).abs ≤ (x - value candidate).abs := by
  by_cases hc : Nonnegative candidate
  · exact maximum_nearest_nonnegative candidate x hc h
  · have nearZero := maximum_nearest_nonnegative positiveZero x (by decide) h
    have nonnegPrevious := value_nonnegative beforeMaximum (by decide)
    have mid := midpoint_between _ _ (adjacent_values_lt _ _ maximum_previous_adjacent)
    have hx : 0 ≤ x := Rat.le_trans nonnegPrevious (Rat.le_trans (Rat.le_of_lt mid.1) h)
    rw [positive_zero_value] at nearZero
    exact Rat.le_trans nearZero (cross_sign_zero_nearest x _ hx (value_nonpositive candidate hc))

theorem maximum_nearest_iff (x : Rat) :
    (∀ candidate : Binary64.Number, (x - value maximum).abs ≤ (x - value candidate).abs) ↔
      midpoint (value beforeMaximum) (value maximum) ≤ x := by
  constructor
  · intro h
    exact (midpoint_right_distance _ _ x (adjacent_values_lt _ _ maximum_previous_adjacent)).mp
      (h beforeMaximum)
  · intro h candidate
    exact maximum_nearest_all_finite candidate x h

theorem maximum_cell_strict_all_finite (candidate : Binary64.Number) (x : Rat)
    (different : candidate.bits ≠ maximum.bits) (h : MaximumCell x) :
    (x - value maximum).abs < (x - value candidate).abs := by
  have nonnegPrevious := value_nonnegative beforeMaximum (by decide)
  have mid := midpoint_between _ _ (adjacent_values_lt _ _ maximum_previous_adjacent)
  have previousLtX : value beforeMaximum < x := Std.lt_trans mid.1 h.1
  have nearestPrevious := (midpoint_right_strict _ _ x (adjacent_values_lt _ _ maximum_previous_adjacent)).mpr h.1
  by_cases hc : Nonnegative candidate
  · exact Std.lt_of_lt_of_le nearestPrevious
      (distance_outside_left _ _ _ (below_maximum_previous_bound candidate hc different) previousLtX)
  · have negative := value_nonpositive candidate hc
    have candidateBound := Rat.le_trans negative nonnegPrevious
    exact Std.lt_of_lt_of_le nearestPrevious (distance_outside_left _ _ _ candidateBound previousLtX)

def NegativeMaximumCell (x : Rat) : Prop := MaximumCell (-x)
def NegativeOverflow (x : Rat) : Prop := x ≤ -overflowBoundary

theorem negative_overflow_reflection (x : Rat) : NegativeOverflow x ↔ PositiveOverflow (-x) := by
  unfold NegativeOverflow PositiveOverflow
  grind

theorem negative_maximum_cell_nearest (candidate : Binary64.Number) (x : Rat)
    (h : NegativeMaximumCell x) :
    (x - value (negate maximum)).abs ≤ (x - value candidate).abs := by
  have nearest := maximum_nearest_all_finite (negate candidate) (-x) (Rat.le_of_lt (show midpoint (value beforeMaximum) (value maximum) < -x from h.1))
  rw [negate_value] at nearest ⊢
  have dc := distance_reflection x (value candidate)
  have dm := distance_reflection x (-value maximum)
  calc
    _ = (-x - value maximum).abs := by simpa only [Rat.neg_neg] using dm.symm
    _ ≤ (-x - -value candidate).abs := nearest
    _ = (x - value candidate).abs := dc

theorem negative_maximum_in_own_cell : NegativeMaximumCell (value (negate maximum)) := by
  unfold NegativeMaximumCell
  rw [negate_value, Rat.neg_neg]
  exact maximum_in_own_cell

theorem virtual_next_not_finite (n : Binary64.Number) : value n ≠ virtualNext := by
  have maxNonnegative := value_nonnegative maximum (by decide)
  have bound : value n ≤ value maximum := by
    by_cases hn : Nonnegative n
    · exact maximum_value_bound n hn
    · exact Rat.le_trans (value_nonpositive n hn) maxNonnegative
  intro he
  rw [he] at bound
  exact (Rat.not_le.mpr maximum_below_virtual) bound

theorem overflow_tie_virtual_equal_distance :
    (overflowBoundary - value maximum).abs = (overflowBoundary - virtualNext).abs :=
  midpoint_equal_distances _ _

theorem overflow_tie_still_nearest_finite (candidate : Binary64.Number) :
    (overflowBoundary - value maximum).abs ≤ (overflowBoundary - value candidate).abs := by
  have lower := (midpoint_between _ _ (adjacent_values_lt _ _ maximum_previous_adjacent)).2
  have upper := (midpoint_between _ _ maximum_below_virtual).1
  exact maximum_nearest_all_finite candidate _ (Rat.le_of_lt (Std.lt_trans lower upper))

/-- The observable boundary keeps an overflow distinct from an admitted Number. -/
inductive BoundaryResult where
  | finite (number : Binary64.Number)
  | overflow (sign : Sign)

def BoundaryResult.admitted : BoundaryResult → Option Binary64.Number
  | .finite n => some n
  | .overflow _ => none

def BoundaryResult.bits : BoundaryResult → UInt64
  | .finite n => n.bits
  | .overflow .positive => 0x7ff0000000000000
  | .overflow .negative => 0xfff0000000000000

theorem boundary_result_admission (result : BoundaryResult) :
    Binary64.admit result.bits = result.admitted := by
  cases result with
  | finite n => exact Binary64.admit_number n
  | overflow s => cases s <;> decide

/-- Applies the pinned Lean rounding and packing model to an exact signed dyadic input. -/
def modelRoundedBits (s : Sign) (mantissa : Nat) (exponent : Int) : UInt64 :=
  UInt64.ofNat (UnpackedFloat.pack .binary64 (UnpackedFloat.round .binary64 s mantissa exponent)).toNat

theorem underflow_tie_model (s : Sign) : modelRoundedBits s 1 (-1075) = (zeroFor s).bits := by
  cases s <;> decide

theorem underflow_below_tie_model (s : Sign) : modelRoundedBits s 1 (-1076) = (zeroFor s).bits := by
  cases s <;> decide

theorem underflow_above_tie_model :
    modelRoundedBits .positive 3 (-1076) = minimumSubnormal.bits ∧
    modelRoundedBits .negative 3 (-1076) = (negate minimumSubnormal).bits := by decide

theorem underflow_tie_admitted (s : Sign) :
    Binary64.admit (modelRoundedBits s 1 (-1075)) = some (zeroFor s) := by
  rw [underflow_tie_model]
  exact Binary64.admit_number _

theorem underflow_tie_normalizes (s : Sign) : Binary64.normalize (zeroFor s) = positiveZero :=
  zeroFor_normalized s

theorem maximum_exact_model : modelRoundedBits .positive 9007199254740991 971 = maximum.bits := by decide

theorem overflow_below_tie_model : modelRoundedBits .positive 36028797018963965 969 = maximum.bits := by decide

theorem negative_overflow_below_tie_model :
    modelRoundedBits .negative 36028797018963965 969 = (negate maximum).bits := by decide

theorem overflow_tie_model (s : Sign) :
    modelRoundedBits s 18014398509481983 970 = (BoundaryResult.overflow s).bits := by
  cases s <;> decide

theorem overflow_above_tie_model (s : Sign) :
    modelRoundedBits s 36028797018963967 969 = (BoundaryResult.overflow s).bits := by
  cases s <;> decide

theorem overflow_model_refused (s : Sign) :
    Binary64.admit (modelRoundedBits s 18014398509481983 970) = none := by
  rw [overflow_tie_model, boundary_result_admission]
  rfl

set_option maxRecDepth 4096 in
set_option exponentiation.threshold 2048 in
theorem underflow_boundary_exact : underflowBoundary = (Dyadic.ofIntWithPrec 1 1075).toRat := by
  unfold underflowBoundary midpoint
  simp only [Rat.div_def, Rat.add_def, Rat.mul_def, Rat.inv_def]
  decide

set_option maxRecDepth 4096 in
set_option exponentiation.threshold 2048 in
theorem overflow_boundary_exact : overflowBoundary = (Dyadic.ofIntWithPrec 18014398509481983 (-970)).toRat := by
  unfold overflowBoundary midpoint
  simp only [Rat.div_def, Rat.add_def, Rat.mul_def, Rat.inv_def]
  decide

set_option maxRecDepth 4096 in
set_option exponentiation.threshold 2048 in
theorem underflow_witness_input_order :
    (Dyadic.ofIntWithPrec 1 1076).toRat < underflowBoundary ∧
    underflowBoundary < (Dyadic.ofIntWithPrec 3 1076).toRat := by
  rw [underflow_boundary_exact]
  decide

set_option maxRecDepth 4096 in
set_option exponentiation.threshold 2048 in
theorem overflow_witness_input_order :
    (Dyadic.ofIntWithPrec 36028797018963965 (-969)).toRat < overflowBoundary ∧
    overflowBoundary < (Dyadic.ofIntWithPrec 36028797018963967 (-969)).toRat := by
  rw [overflow_boundary_exact]
  decide

theorem negative_overflow_tie_is_overflow : NegativeOverflow (-overflowBoundary) := Rat.le_refl

theorem negative_overflow_tie_excluded_from_finite_cell :
    ¬ NegativeMaximumCell (-overflowBoundary) := by
  unfold NegativeMaximumCell
  rw [Rat.neg_neg]
  exact overflow_tie_excluded_from_finite_cell

theorem negative_underflow_tie_equal_distance :
    (-underflowBoundary - value negativeZero).abs =
      (-underflowBoundary - value (negate minimumSubnormal)).abs := by
  rw [negative_zero_value, negate_value]
  have hz := distance_reflection underflowBoundary 0
  rw [Rat.neg_zero] at hz
  rw [hz, distance_reflection]
  simpa only [positive_zero_value] using underflow_tie_equal_distance

theorem negative_minimum_underflow_tie_excluded :
    ¬ Cell (negate afterMinimumSubnormal) (negate minimumSubnormal) (negate positiveZero)
      (-underflowBoundary) := by
  rw [cell_reflection]
  exact minimum_underflow_tie_excluded

end Algal.Core.RoundingEndpoints
