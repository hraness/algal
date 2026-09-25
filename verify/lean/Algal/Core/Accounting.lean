import Algal.Core.Binary64

/-!
Modeled work uses exact nonnegative integers. These theorems explicitly require
sane callback costs and a machine/JS exact-integer envelope. They do not prove
that arbitrary host FnRegistry numbers meet those premises. A work limit is
checked AFTER a charge group, unlike the pre-increment step/call checks.
-/
namespace Algal.Core.Accounting

def maximumExactInteger : Nat := 9007199254740991

structure Cost where
  units : Nat
  sane : units ≤ maximumExactInteger
  deriving DecidableEq

def admitCost (units : Int) : Option Cost :=
  if h : 0 ≤ units ∧ units ≤ maximumExactInteger then
    some ⟨units.toNat, by omega⟩
  else none

inductive BudgetError where
  | exhausted
  deriving DecidableEq

def preIncrement (spent limit : Nat) : Except BudgetError Nat :=
  if spent + 1 ≤ limit then .ok (spent + 1) else .error .exhausted

theorem preIncrement_success_bound (spent limit next : Nat)
    (h : preIncrement spent limit = .ok next) : next = spent + 1 ∧ next ≤ limit := by
  unfold preIncrement at h
  split at h
  · cases h
    exact ⟨rfl, by assumption⟩
  · contradiction

theorem preIncrement_at_limit_rejected (limit : Nat) :
    preIncrement limit limit = .error .exhausted := by simp [preIncrement]

theorem preIncrement_below_limit_admitted (spent limit : Nat) (h : spent < limit) :
    preIncrement spent limit = .ok (spent + 1) := by
  have hs : spent + 1 ≤ limit := by omega
  simp [preIncrement, hs]

structure ChargeResult where
  spent : Nat
  exhausted : Bool
  deriving DecidableEq

def postCharge (spent charge limit : Nat) : ChargeResult :=
  ⟨spent + charge, decide (limit < spent + charge)⟩

theorem postCharge_monotone (spent charge limit : Nat) :
    spent ≤ (postCharge spent charge limit).spent := by simp [postCharge]

theorem postCharge_envelope (spent charge limit maximumChunk : Nat)
    (hb : spent ≤ limit) (hc : charge ≤ maximumChunk) :
    (postCharge spent charge limit).spent ≤ limit + maximumChunk := by
  simp only [postCharge]
  omega

theorem postCharge_success_bound (spent charge limit : Nat)
    (h : (postCharge spent charge limit).exhausted = false) :
    (postCharge spent charge limit).spent ≤ limit := by
  simp only [postCharge, decide_eq_false_iff_not] at h
  simp only [postCharge]
  omega

theorem postCharge_failure_retains_charge (spent charge limit : Nat)
    (h : limit < spent + charge) :
    (postCharge spent charge limit).exhausted = true ∧
      (postCharge spent charge limit).spent = spent + charge := by
  simp [postCharge, h]

theorem strict_limit_is_not_an_invariant :
    (postCharge 10 7 10).spent = 17 ∧ (postCharge 10 7 10).exhausted = true := by decide

def activationCharge : Nat := 100
def effectBaseCharge : Nat := 500

/-- The fn cost is charged before invoking the callback, including its error. -/
def chargeBeforeResult {ε α : Type} (spent : Nat) (cost : Cost) (result : Except ε α) :
    Nat × Except ε α := (spent + cost.units, result)

theorem callback_failure_keeps_cost {ε α : Type} (spent : Nat) (cost : Cost) (error : ε) :
    chargeBeforeResult spent cost (.error error : Except ε α) =
      (spent + cost.units, .error error) := rfl

/-- A direct tool signature/output charge occurs only after a successful output. -/
def directToolResultCharge {ε α : Type} (cost : Cost) (outputBytes : Nat) : Except ε α → Nat
  | .error _ => 0
  | .ok _ => cost.units + outputBytes

theorem direct_tool_failure_no_success_charge {ε α : Type}
    (cost : Cost) (bytes : Nat) (error : ε) :
    directToolResultCharge cost bytes (.error error : Except ε α) = 0 := rfl

/-- The effect base/context charge precedes the executor result. -/
def effectAttemptCharge (contextBytes : Nat) : Nat := effectBaseCharge + contextBytes

theorem effect_attempt_base_bound (contextBytes : Nat) :
    effectBaseCharge ≤ effectAttemptCharge contextBytes := by simp [effectAttemptCharge]

theorem charged_group_envelope (before limit callback context output fuel : Nat)
    (h : before ≤ limit) :
    before + activationCharge + callback + effectBaseCharge + context + output + fuel ≤
      limit + (activationCharge + callback + effectBaseCharge + context + output + fuel) := by omega

/-- No unsigned wrap occurs under this explicit native-width precondition. -/
theorem uint64_add_without_wrap (a b : UInt64) (h : a.toNat + b.toNat < 2 ^ 64) :
    (a + b).toNat = a.toNat + b.toNat := by
  rw [UInt64.toNat_add, Nat.mod_eq_of_lt h]

theorem exact_integer_envelope_fits_uint64 (a b : Nat)
    (h : a + b ≤ maximumExactInteger) : a + b < 2 ^ 64 := by
  unfold maximumExactInteger at h
  omega

theorem admitted_cost_nonnegative (units : Int) (cost : Cost)
    (h : admitCost units = some cost) : 0 ≤ units ∧ cost.units = units.toNat := by
  unfold admitCost at h
  split at h
  · cases h
    exact ⟨by omega, rfl⟩
  · contradiction

theorem negative_callback_cost_rejected : admitCost (-1) = none := by decide
theorem excessive_callback_cost_rejected : admitCost 9007199254740992 = none := by decide
theorem zero_callback_cost_admitted : (admitCost 0).isSome = true := by decide
theorem typical_callback_cost_admitted : (admitCost 10).isSome = true := by decide

end Algal.Core.Accounting
