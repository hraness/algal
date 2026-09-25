import Algal.Core.NegativeEndpoints

/- Construct actual finite neighbors for every admitted binary64 magnitude.
   This supplies hypotheses to the existing interval geometry; it does not
   select a center for an arbitrary rational or implement decimal conversion. -/
set_option autoImplicit false
namespace Algal.Core.FiniteNeighbors
open Algal.Core
open Algal.Core.NumericInjectivity
open Algal.Core.RoundingInterval Algal.Core.SignedRounding
open Algal.Core.RoundingEndpoints Algal.Core.NegativeEndpoints

def maxCode : Nat := 9218868437227405311

theorem finite_of_bounded_code (code : Nat) (bound : code ≤ maxCode) :
    Binary64.Finite (UInt64.ofNat code) := by
  unfold Binary64.Finite Binary64.exponent
  change code % 18446744073709551616 / 4503599627370496 % 2048 < 2047
  have small : code < 18446744073709551616 := by unfold maxCode at bound; omega
  rw [Nat.mod_eq_of_lt small]
  unfold maxCode at bound
  omega

def fromCode (code : Nat) (bound : code ≤ maxCode) : Binary64.Number :=
  ⟨UInt64.ofNat code, finite_of_bounded_code code bound⟩

theorem fromCode_toNat (code : Nat) (bound : code ≤ maxCode) :
    (fromCode code bound).bits.toNat = code := by
  change code % 18446744073709551616 = code
  apply Nat.mod_eq_of_lt
  unfold maxCode at bound
  omega

theorem fromCode_nonnegative (code : Nat) (bound : code ≤ maxCode) :
    Nonnegative (fromCode code bound) := by
  unfold Nonnegative BinaryValue.signBit
  rw [fromCode_toNat]
  unfold maxCode at bound
  omega

theorem nonnegative_code_bound (n : Binary64.Number) (sign : Nonnegative n) :
    n.bits.toNat ≤ maxCode := by
  exact maximum_code_bound n sign

def previous (n : Binary64.Number) (sign : Nonnegative n) : Binary64.Number :=
  fromCode (n.bits.toNat - 1) (Nat.le_trans (Nat.sub_le _ _) (nonnegative_code_bound n sign))

def next (n : Binary64.Number) (below : n.bits.toNat < maxCode) : Binary64.Number :=
  fromCode (n.bits.toNat + 1) (by omega)

theorem previous_adjacent (n : Binary64.Number) (sign : Nonnegative n)
    (positive : 0 < n.bits.toNat) : Adjacent (previous n sign) n := by
  refine ⟨fromCode_nonnegative _ _, sign, ?_⟩
  unfold previous
  rw [fromCode_toNat]
  omega

theorem next_adjacent (n : Binary64.Number) (sign : Nonnegative n)
    (below : n.bits.toNat < maxCode) : Adjacent n (next n below) := by
  exact ⟨sign, fromCode_nonnegative _ _, fromCode_toNat _ _⟩

inductive PositiveView (n : Binary64.Number) : Type where
  | zero : n = positiveZero → PositiveView n
  | maximum : n = RoundingEndpoints.maximum → PositiveView n
  | interior (previous next : Binary64.Number) :
      Adjacent previous n → Adjacent n next → PositiveView n

/-- Total executable classification; neighbor existence is constructed from bit codes. -/
def positiveView (n : Binary64.Number) (sign : Nonnegative n) : PositiveView n := by
  by_cases zero : n.bits.toNat = 0
  · exact .zero (number_eq_of_bits_eq _ _ (UInt64.toNat_inj.mp zero))
  · by_cases top : n.bits.toNat = maxCode
    · exact .maximum (number_eq_of_bits_eq _ _ (UInt64.toNat_inj.mp top))
    · have positive : 0 < n.bits.toNat := by omega
      have bound := nonnegative_code_bound n sign
      have below : n.bits.toNat < maxCode := by omega
      exact .interior (previous n sign) (next n below)
        (previous_adjacent n sign positive) (next_adjacent n sign below)

theorem positive_classification (n : Binary64.Number) (sign : Nonnegative n) :
    n = positiveZero ∨ n = maximum ∨
      ∃ previous next, Adjacent previous n ∧ Adjacent n next := by
  cases positiveView n sign with
  | zero h => exact Or.inl h
  | maximum h => exact Or.inr (Or.inl h)
  | interior p q hp hq => exact Or.inr (Or.inr ⟨p, q, hp, hq⟩)

inductive SignedView (n : Binary64.Number) : Type where
  | nonnegative : Nonnegative n → PositiveView n → SignedView n
  | negative : (¬ Nonnegative n) → PositiveView (negate n) → SignedView n

def signedView (n : Binary64.Number) : SignedView n :=
  if sign : Nonnegative n then .nonnegative sign (positiveView n sign)
  else .negative sign (positiveView (negate n) ((negate_nonnegative_iff n).mpr sign))

theorem constructed_interior_cell (n : Binary64.Number) (sign : Nonnegative n)
    (positive : 0 < n.bits.toNat) (below : n.bits.toNat < maxCode) (x : Rat) :
    Cell (previous n sign) n (next n below) x ↔
      if Even n then Nearest n x else StrictNearest n x :=
  interior_cell_iff_nearest_by_parity _ _ _ x
    (previous_adjacent n sign positive) (next_adjacent n sign below)

theorem constructed_negative_cell (n : Binary64.Number) (sign : Nonnegative n)
    (positive : 0 < n.bits.toNat) (below : n.bits.toNat < maxCode) (x : Rat) :
    Cell (negate (next n below)) (negate n) (negate (previous n sign)) x ↔
      if Even (negate n) then Nearest (negate n) x else StrictNearest (negate n) x :=
  reflected_cell_iff_nearest_by_parity _ _ _ x
    (previous_adjacent n sign positive) (next_adjacent n sign below)

theorem zero_has_no_nonnegative_predecessor (candidate : Binary64.Number) :
    ¬ Adjacent candidate positiveZero := by
  intro adjacent
  have impossible := adjacent.nextCode
  change 0 = candidate.bits.toNat + 1 at impossible
  omega

theorem maximum_has_no_nonnegative_successor (candidate : Binary64.Number) :
    ¬ Adjacent maximum candidate := by
  intro adjacent
  have bound := nonnegative_code_bound candidate adjacent.rightNonnegative
  have step := adjacent.nextCode
  change candidate.bits.toNat = maxCode + 1 at step
  omega

theorem fromCode_recovers_nonnegative (n : Binary64.Number) (sign : Nonnegative n) :
    fromCode n.bits.toNat (nonnegative_code_bound n sign) = n := by
  apply number_eq_of_bits_eq
  apply UInt64.toNat_inj.mp
  exact fromCode_toNat _ _

theorem negative_classification (n : Binary64.Number) (sign : ¬ Nonnegative n) :
    n = negativeZero ∨ n = negate maximum ∨
      ∃ previous next, Adjacent previous (negate n) ∧ Adjacent (negate n) next := by
  rcases positive_classification (negate n) ((negate_nonnegative_iff n).mpr sign) with zero | top | interior
  · left
    have reflected := congrArg negate zero
    simpa only [negate_involution, signed_zero_negation.1] using reflected
  · right; left
    have reflected := congrArg negate top
    simpa only [negate_involution] using reflected
  · exact Or.inr (Or.inr interior)

theorem constructed_neighbors_have_no_positive_gap (n candidate : Binary64.Number)
    (sign : Nonnegative n) (other : Nonnegative candidate)
    (positive : 0 < n.bits.toNat) (below : n.bits.toNat < maxCode) :
    (value candidate ≤ value (previous n sign) ∨ value n ≤ value candidate) ∧
      (value candidate ≤ value n ∨ value (next n below) ≤ value candidate) := by
  exact ⟨adjacent_no_intermediate _ _ _ (previous_adjacent n sign positive) other,
    adjacent_no_intermediate _ _ _ (next_adjacent n sign below) other⟩

/-- Observable bit-code view for small executable witnesses. Endpoints have no
    two-finite-neighbor result; negative neighbors are reflected and reversed. -/
def neighborCodes (n : Binary64.Number) : Option (Nat × Nat) :=
  match signedView n with
  | .nonnegative _ (.interior previous next _ _) => some (previous.bits.toNat, next.bits.toNat)
  | .negative _ (.interior previous next _ _) => some ((negate next).bits.toNat, (negate previous).bits.toNat)
  | _ => none

theorem minimum_subnormal_neighbor_codes :
    neighborCodes minimumSubnormal = some (0, 2) := by decide

theorem minimum_normal_neighbor_codes :
    neighborCodes ⟨0x0010000000000000, by decide⟩ =
      some (0x000fffffffffffff, 0x0010000000000001) := by decide

theorem one_neighbor_codes :
    neighborCodes RoundingInterval.one = some (0x3fefffffffffffff, 0x3ff0000000000001) := by decide

theorem negative_minimum_neighbor_codes :
    neighborCodes (negate minimumSubnormal) = some (0x8000000000000002, 0x8000000000000000) := by decide

theorem negative_one_neighbor_codes :
    neighborCodes (negate RoundingInterval.one) = some (0xbff0000000000001, 0xbfefffffffffffff) := by decide

theorem both_zero_endpoints :
    neighborCodes positiveZero = none ∧ neighborCodes negativeZero = none := by decide

theorem both_maximum_endpoints :
    neighborCodes maximum = none ∧ neighborCodes (negate maximum) = none := by decide

theorem infinity_code_not_in_domain : ¬ (0x7ff0000000000000 ≤ maxCode) := by decide

theorem minimum_constructed_cell_rejects_underflow_tie :
    ¬ Cell (previous minimumSubnormal (by decide)) minimumSubnormal
      (next minimumSubnormal (by decide)) underflowBoundary := by
  exact minimum_underflow_tie_excluded

end Algal.Core.FiniteNeighbors
