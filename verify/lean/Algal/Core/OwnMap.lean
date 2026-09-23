import Init

/-! Finite own-property maps. There is no prototype or inherited lookup. -/
namespace Algal.Core.OwnMap

abbrev Entries (α : Type) := List (String × α)

def lookup {α : Type} : Entries α → String → Option α
  | [], _ => none
  | (name, value) :: rest, key => if key = name then some value else lookup rest key

def write {α : Type} (entries : Entries α) (key : String) (value : α) : Entries α :=
  (key, value) :: entries

/-- Raw parsed object entries arrive left-to-right; the last duplicate wins. -/
def fromParsedEntries {α : Type} (entries : Entries α) : Entries α := entries.reverse

def Equivalent {α : Type} (a b : Entries α) : Prop := ∀ key, lookup a key = lookup b key

theorem lookup_write_same {α : Type} (entries : Entries α) (key : String) (value : α) :
    lookup (write entries key value) key = some value := by simp [lookup, write]

theorem lookup_write_other {α : Type} (entries : Entries α) (key other : String)
    (value : α) (h : other ≠ key) : lookup (write entries key value) other = lookup entries other := by
  simp [lookup, write, h]

theorem overwrite_last_wins {α : Type} (entries : Entries α) (key : String) (a b : α) :
    Equivalent (write (write entries key a) key b) (write entries key b) := by
  intro query
  by_cases h : query = key <;> simp [lookup, write, h]

theorem distinct_writes_commute {α : Type} (entries : Entries α)
    (a b : String) (va vb : α) (h : a ≠ b) :
    Equivalent (write (write entries a va) b vb) (write (write entries b vb) a va) := by
  intro query
  by_cases ha : query = a
  · subst query
    simp [lookup, write, h]
  · by_cases hb : query = b <;> simp [lookup, write, ha, hb, Ne.symm h]

theorem lookup_defined_only_if_declared {α : Type} (entries : Entries α)
    (key : String) (value : α) (h : lookup entries key = some value) :
    key ∈ entries.map Prod.fst := by
  induction entries with
  | nil => simp [lookup] at h
  | cons entry rest ih =>
    rcases entry with ⟨name, item⟩
    simp only [lookup] at h
    split at h
    · simp_all
    · simp only [List.map_cons, List.mem_cons]
      exact Or.inr (ih h)

theorem lookup_absent_if_undeclared {α : Type} (entries : Entries α) (key : String)
    (h : key ∉ entries.map Prod.fst) : lookup entries key = none := by
  cases he : lookup entries key with
  | none => rfl
  | some value => exact False.elim (h (lookup_defined_only_if_declared entries key value he))

theorem parsed_duplicate_witness :
    lookup (fromParsedEntries [("x", 1), ("x", 2)]) "x" = some 2 := by decide

theorem insertion_order_witness :
    Equivalent (fromParsedEntries [("x", 1), ("y", 2)])
      (fromParsedEntries [("y", 2), ("x", 1)]) := by
  exact distinct_writes_commute [] "x" "y" 1 2 (by decide)

theorem inherited_name_absent : lookup ([] : Entries Nat) "toString" = none := rfl
theorem proto_name_is_an_own_key : lookup [("__proto__", 7)] "__proto__" = some 7 := by decide
theorem absent_is_not_present_none :
    lookup ([] : Entries (Option Nat)) "x" ≠ lookup [("x", none)] "x" := by decide

end Algal.Core.OwnMap
