import Algal.Core.Json
import Algal.Core.KeyOrder

/-!
Recursive semantic normalization of the existing finite JSON trees. The
inductive observable relation below is independent of the normalizer: numbers
identify only signed zeros, arrays compare positionally, and objects compare
recursive last-wins own lookup. Strings remain exact Unicode scalar sequences.

This composes proved key ordering and the structural token codec. It does not
render JSON, UTF-8 or decimal text, prove raw parser admission, or establish a
production implementation refinement. In particular an overwritten raw string
token must still satisfy the portable scalar-domain precondition before this
already-admitted tree model applies.
-/
namespace Algal.Core.Normalize
open Json

def fieldsToList : Fields → OwnMap.Entries Value
  | .nil => []
  | .cons k v rest => (k, v) :: fieldsToList rest

def fieldsOfList : OwnMap.Entries Value → Fields
  | [] => .nil
  | (k, v) :: rest => .cons k v (fieldsOfList rest)

def itemsToList : Items → List Value
  | .nil => []
  | .cons value rest => value :: itemsToList rest

theorem fieldsToList_ofList (entries : OwnMap.Entries Value) :
    fieldsToList (fieldsOfList entries) = entries := by
  induction entries with
  | nil => rfl
  | cons entry rest ih => cases entry; simp [fieldsOfList, fieldsToList, ih]

theorem fieldsOfList_toList (fields : Fields) :
    fieldsOfList (fieldsToList fields) = fields := by
  cases fields with
  | nil => rfl
  | cons k v rest => simp [fieldsOfList, fieldsToList, fieldsOfList_toList rest]

def lookupFields (fields : Fields) (key : String) : Option Value :=
  OwnMap.lookup (fieldsToList fields).reverse key

theorem lookup_append {α : Type} (a b : OwnMap.Entries α) (key : String) :
    OwnMap.lookup (a ++ b) key = (OwnMap.lookup a key).or (OwnMap.lookup b key) := by
  induction a with
  | nil => rfl
  | cons entry rest ih =>
    rcases entry with ⟨k,v⟩
    by_cases h : key = k <;> simp [OwnMap.lookup, h, ih]

theorem lookupFields_cons (k : String) (v : Value) (rest : Fields) (key : String) :
    lookupFields (.cons k v rest) key =
      (lookupFields rest key).or (if key = k then some v else none) := by
  simp [lookupFields, fieldsToList, lookup_append, OwnMap.lookup]

theorem lookup_map {α β : Type} (f : α → β) (entries : OwnMap.Entries α) (key : String) :
    OwnMap.lookup (entries.map (fun kv => (kv.1, f kv.2))) key =
      (OwnMap.lookup entries key).map f := by
  induction entries with
  | nil => rfl
  | cons entry rest ih =>
    rcases entry with ⟨k,v⟩
    by_cases h : key = k <;> simp [OwnMap.lookup, h, ih]

def canonicalEntries {α : Type} (fallback : α) (entries : OwnMap.Entries α) : OwnMap.Entries α :=
  (Text.canonicalKeys (KeyOrder.support entries)).map
    (fun key => (key, (OwnMap.lookup entries key).getD fallback))

/- Every selected key is in support, so the total-function fallback is never
observable. The lookup law below preserves absence and present null separately. -/

theorem canonicalEntries_lookup {α : Type} (fallback : α) (entries : OwnMap.Entries α) (key : String) :
    OwnMap.lookup (canonicalEntries fallback entries) key = OwnMap.lookup entries key := by
  have hm : key ∈ Text.canonicalKeys (KeyOrder.support entries) ↔
      (OwnMap.lookup entries key).isSome = true := by
    rw [(Text.canonicalKeys_preserves_keys (KeyOrder.support entries)).mem_iff]
    simp only [KeyOrder.support, List.mem_eraseDups, KeyOrder.lookup_isSome_iff]
  unfold canonicalEntries
  rw [KeyOrder.lookup_keyed_map]
  cases h : OwnMap.lookup entries key <;> simp_all

theorem canonicalEntries_eq_of_equivalent {α : Type} (fallback : α) (a b : OwnMap.Entries α)
    (h : OwnMap.Equivalent a b) : canonicalEntries fallback a = canonicalEntries fallback b := by
  unfold canonicalEntries
  rw [KeyOrder.canonicalKeys_permutation_invariant _ _
    (KeyOrder.support_permutation_of_equivalent a b h)]
  congr 1
  funext key
  rw [h key]

theorem canonicalEntries_fallback_irrelevant {α : Type} (first second : α) (entries : OwnMap.Entries α) :
    canonicalEntries first entries = canonicalEntries second entries := by
  unfold canonicalEntries
  apply List.map_congr_left
  intro key member
  have hm := (Text.canonicalKeys_preserves_keys (KeyOrder.support entries)).mem_iff.mp member
  have hp : (OwnMap.lookup entries key).isSome = true := by
    apply (KeyOrder.lookup_isSome_iff _ _).mpr
    exact List.mem_eraseDups.mp hm
  cases h : OwnMap.lookup entries key <;> simp_all

theorem canonicalEntries_keys {α : Type} (fallback : α) (entries : OwnMap.Entries α) :
    (canonicalEntries fallback entries).map Prod.fst = Text.canonicalKeys (KeyOrder.support entries) := by
  simp [canonicalEntries, List.map_map, Function.comp_def]

theorem canonicalEntries_nodup {α : Type} (fallback : α) (entries : OwnMap.Entries α) :
    ((canonicalEntries fallback entries).map Prod.fst).Nodup := by
  rw [canonicalEntries_keys]
  exact (Text.canonicalKeys_preserves_keys _).nodup_iff.mpr (KeyOrder.eraseDups_nodup _)

theorem canonicalEntries_sorted {α : Type} (fallback : α) (entries : OwnMap.Entries α) :
    ((canonicalEntries fallback entries).map Prod.fst).Pairwise KeyOrder.keyLE := by
  rw [canonicalEntries_keys]
  exact KeyOrder.canonicalKeys_sorted _

theorem lookup_reverse_unique {α : Type} (entries : OwnMap.Entries α)
    (unique : (entries.map Prod.fst).Nodup) (key : String) :
    OwnMap.lookup entries.reverse key = OwnMap.lookup entries key := by
  induction entries with
  | nil => rfl
  | cons entry rest ih =>
    rcases entry with ⟨k,v⟩
    have hu := List.nodup_cons.mp unique
    rw [List.reverse_cons, lookup_append, ih hu.2]
    by_cases h : key = k
    · subst key
      have absent := OwnMap.lookup_absent_if_undeclared rest k hu.1
      simp [OwnMap.lookup, absent]
    · simp [OwnMap.lookup, h]

def canonicalFields (fields : Fields) : Fields :=
  fieldsOfList (canonicalEntries .null (fieldsToList fields).reverse)

theorem canonicalFields_lookup (fields : Fields) (key : String) :
    lookupFields (canonicalFields fields) key = lookupFields fields key := by
  unfold lookupFields canonicalFields
  rw [fieldsToList_ofList, lookup_reverse_unique _ (canonicalEntries_nodup _ _),
    canonicalEntries_lookup]

theorem canonicalFields_eq_of_lookup (a b : Fields)
    (h : ∀ key, lookupFields a key = lookupFields b key) :
    canonicalFields a = canonicalFields b := by
  unfold canonicalFields
  rw [canonicalEntries_eq_of_equivalent .null _ _ h]

theorem canonicalFields_nodup (fields : Fields) :
    ((fieldsToList (canonicalFields fields)).map Prod.fst).Nodup := by
  simp only [canonicalFields, fieldsToList_ofList]
  exact canonicalEntries_nodup _ _

theorem canonicalFields_sorted (fields : Fields) :
    ((fieldsToList (canonicalFields fields)).map Prod.fst).Pairwise KeyOrder.keyLE := by
  simp only [canonicalFields, fieldsToList_ofList]
  exact canonicalEntries_sorted _ _

mutual
  def normalize : Value → Value
    | .null => .null
    | .bool b => .bool b
    | .number n => .number (Binary64.normalize n)
    | .text s => .text s
    | .array xs => .array (normalizeItems xs)
    | .object fs => .object (canonicalFields (normalizeFieldValues fs))
  def normalizeItems : Items → Items
    | .nil => .nil
    | .cons v rest => .cons (normalize v) (normalizeItems rest)
  def normalizeFieldValues : Fields → Fields
    | .nil => .nil
    | .cons key v rest => .cons key (normalize v) (normalizeFieldValues rest)
end

theorem normalizeItems_toList (items : Items) :
    itemsToList (normalizeItems items) = (itemsToList items).map normalize := by
  cases items with
  | nil => rfl
  | cons value rest => simp [normalizeItems, itemsToList, normalizeItems_toList rest]

theorem normalizeItems_length (items : Items) :
    (itemsToList (normalizeItems items)).length = (itemsToList items).length := by
  rw [normalizeItems_toList, List.length_map]

theorem normalizeFieldValues_lookup (fields : Fields) (key : String) :
    lookupFields (normalizeFieldValues fields) key = (lookupFields fields key).map normalize := by
  cases fields with
  | nil => rfl
  | cons k v rest =>
    simp only [normalizeFieldValues, lookupFields_cons, normalizeFieldValues_lookup rest key]
    cases lookupFields rest key <;> by_cases hk : key = k <;> simp [hk]

theorem normalize_object_lookup (fields : Fields) (key : String) :
    lookupFields (canonicalFields (normalizeFieldValues fields)) key =
      (lookupFields fields key).map normalize := by
  rw [canonicalFields_lookup, normalizeFieldValues_lookup]

def BothZero (a b : Binary64.Number) : Prop :=
  (a.bits = 0 ∨ a.bits = Binary64.negativeZero) ∧
  (b.bits = 0 ∨ b.bits = Binary64.negativeZero)

def NumberEquivalent (a b : Binary64.Number) : Prop := a.bits = b.bits ∨ BothZero a b

mutual
  inductive Equivalent : Value → Value → Prop where
    | null : Equivalent .null .null
    | bool (b : Bool) : Equivalent (.bool b) (.bool b)
    | number {a b : Binary64.Number} : NumberEquivalent a b → Equivalent (.number a) (.number b)
    | text (s : String) : Equivalent (.text s) (.text s)
    | array {a b : Items} : ItemsEquivalent a b → Equivalent (.array a) (.array b)
    | object {a b : Fields} :
        (∀ key, OptionsEquivalent (lookupFields a key) (lookupFields b key)) →
          Equivalent (.object a) (.object b)
  inductive ItemsEquivalent : Items → Items → Prop where
    | nil : ItemsEquivalent .nil .nil
    | cons {a b : Value} {as bs : Items} :
        Equivalent a b → ItemsEquivalent as bs → ItemsEquivalent (.cons a as) (.cons b bs)
  inductive OptionsEquivalent : Option Value → Option Value → Prop where
    | none : OptionsEquivalent none none
    | some {a b : Value} : Equivalent a b → OptionsEquivalent (some a) (some b)
end

theorem numberEquivalent_iff_normalize (a b : Binary64.Number) :
    NumberEquivalent a b ↔ Binary64.normalize a = Binary64.normalize b := by
  rcases a with ⟨a, ha⟩
  rcases b with ⟨b, hb⟩
  have hz : (0 : UInt64) ≠ Binary64.negativeZero := by decide
  by_cases hza : a = Binary64.negativeZero <;>
    by_cases hzb : b = Binary64.negativeZero <;>
      simp_all [NumberEquivalent, BothZero, Binary64.normalize, Binary64.normalizeBits, eq_comm]

theorem equivalent_normalize {a b : Value} (h : Equivalent a b) : normalize a = normalize b := by
  induction h using Equivalent.rec
      (motive_2 := fun a b _ => normalizeItems a = normalizeItems b)
      (motive_3 := fun a b _ => a.map normalize = b.map normalize) with
  | null => rfl
  | bool _ => rfl
  | number h => exact congrArg Value.number ((numberEquivalent_iff_normalize _ _).mp h)
  | text _ => rfl
  | array _ ih => exact congrArg Value.array ih
  | object _ ih =>
    apply congrArg Value.object
    apply canonicalFields_eq_of_lookup
    intro key
    rw [normalizeFieldValues_lookup, normalizeFieldValues_lookup]
    exact ih key
  | nil => rfl
  | cons _ _ ihv ihr => simp [normalizeItems, ihv, ihr]
  | none => rfl
  | some _ ih => simp [ih]

theorem equivalent_symm {a b : Value} (h : Equivalent a b) : Equivalent b a := by
  induction h using Equivalent.rec
      (motive_2 := fun a b _ => ItemsEquivalent b a)
      (motive_3 := fun a b _ => OptionsEquivalent b a) with
  | null => exact .null
  | bool b => exact .bool b
  | number h =>
    exact .number ((numberEquivalent_iff_normalize _ _).mpr
      ((numberEquivalent_iff_normalize _ _).mp h).symm)
  | text s => exact .text s
  | array _ ih => exact .array ih
  | object _ ih => exact .object ih
  | nil => exact .nil
  | cons _ _ ihv ihr => exact .cons ihv ihr
  | none => exact .none
  | some _ ih => exact .some ih

theorem equivalent_trans {a b : Value} (hab : Equivalent a b) :
    ∀ {c}, Equivalent b c → Equivalent a c := by
  induction hab using Equivalent.rec
      (motive_2 := fun a b _ => ∀ {c}, ItemsEquivalent b c → ItemsEquivalent a c)
      (motive_3 := fun a b _ => ∀ {c}, OptionsEquivalent b c → OptionsEquivalent a c) with
  | null => intro _ h; cases h; exact .null
  | bool b => intro _ h; cases h; exact .bool b
  | number hab =>
    intro _ hbc
    cases hbc with
    | number hbc =>
      exact .number ((numberEquivalent_iff_normalize _ _).mpr
        (((numberEquivalent_iff_normalize _ _).mp hab).trans
          ((numberEquivalent_iff_normalize _ _).mp hbc)))
  | text s => intro _ h; cases h; exact .text s
  | array _ ih => intro _ h; cases h with | array h => exact .array (ih h)
  | object _ ih =>
    intro _ h
    cases h with
    | object h => exact .object (fun key => ih key (h key))
  | nil h => exact h
  | cons _ _ ihv ihr h => cases h with | cons hv hr => exact .cons (ihv hv) (ihr hr)
  | none h => exact h
  | some _ ih h => cases h with | some h => exact .some (ih h)

mutual
  theorem normalize_sound (value : Value) : Equivalent value (normalize value) := by
    cases value with
    | null => exact .null
    | bool b => exact .bool b
    | number n =>
      exact .number ((numberEquivalent_iff_normalize _ _).mpr (Binary64.normalize_idempotent n).symm)
    | text s => exact .text s
    | array xs => exact .array (normalizeItems_sound xs)
    | object fs =>
      apply Equivalent.object
      intro key
      rw [normalize_object_lookup]
      exact normalizeFieldValues_sound fs key
  theorem normalizeItems_sound (items : Items) : ItemsEquivalent items (normalizeItems items) := by
    cases items with
    | nil => exact .nil
    | cons v rest => exact .cons (normalize_sound v) (normalizeItems_sound rest)
  theorem normalizeFieldValues_sound (fields : Fields) (key : String) :
      OptionsEquivalent (lookupFields fields key) ((lookupFields fields key).map normalize) := by
    cases fields with
    | nil => exact .none
    | cons k v rest =>
      rw [lookupFields_cons]
      have ih := normalizeFieldValues_sound rest key
      cases h : lookupFields rest key with
      | none =>
        by_cases hk : key = k
        · simp only [hk, ite_true, Option.or, Option.map_some]
          exact .some (normalize_sound v)
        · simp only [hk, ite_false, Option.or, Option.map_none]
          exact .none
      | some value => simpa only [h, Option.or, Option.map_some] using ih
end

theorem normalize_idempotent (value : Value) : normalize (normalize value) = normalize value :=
  (equivalent_normalize (normalize_sound value)).symm

theorem equivalent_iff_normalize_eq (a b : Value) :
    Equivalent a b ↔ normalize a = normalize b := by
  constructor
  · exact equivalent_normalize
  · intro h
    apply equivalent_trans (normalize_sound a)
    rw [h]
    exact equivalent_symm (normalize_sound b)

theorem equivalent_refl (value : Value) : Equivalent value value :=
  (equivalent_iff_normalize_eq _ _).mpr rfl

def canonicalTokens (value : Value) : List Token := Json.encode (normalize value)

theorem canonicalTokens_roundtrip (value : Value) :
    Json.decode (canonicalTokens value) = some (normalize value) := Json.structural_roundtrip _

theorem canonicalTokens_eq_iff (a b : Value) : canonicalTokens a = canonicalTokens b ↔ Equivalent a b := by
  constructor
  · intro h
    exact (equivalent_iff_normalize_eq _ _).mpr (Json.structural_encoding_injective _ _ h)
  · intro h
    exact congrArg Json.encode (equivalent_normalize h)

theorem canonicalTokens_normalize (value : Value) : canonicalTokens (normalize value) = canonicalTokens value := by
  simp [canonicalTokens, normalize_idempotent]

theorem decoded_canonicalTokens_equivalent (value : Value) :
    ∃ decoded, Json.decode (canonicalTokens value) = some decoded ∧ Equivalent value decoded :=
  ⟨normalize value, canonicalTokens_roundtrip value, normalize_sound value⟩

theorem canonicalTokens_injective_on_normalized (a b : Value)
    (ha : normalize a = a) (hb : normalize b = b) :
    canonicalTokens a = canonicalTokens b ↔ a = b := by
  rw [canonicalTokens_eq_iff, equivalent_iff_normalize_eq, ha, hb]

def positiveZero : Value := .number ⟨0, by decide⟩
def negativeZero : Value := .number ⟨Binary64.negativeZero, by decide⟩

def nestedHistory : Value := .object
  (.cons "x" (.bool false)
    (.cons "2" (.text "😀")
      (.cons "x" (.array (.cons negativeZero
        (.cons (.object (.cons "z" .null (.cons "a" (.bool true) .nil))) .nil))) .nil)))

def nestedCanonical : Value := .object
  (.cons "2" (.text "😀")
    (.cons "x" (.array (.cons positiveZero
      (.cons (.object (.cons "a" (.bool true) (.cons "z" .null .nil))) .nil))) .nil))

theorem nested_normalization_witness : normalize nestedHistory = nestedCanonical := by decide

theorem nested_equivalence_witness : Equivalent nestedHistory nestedCanonical := by
  apply (equivalent_iff_normalize_eq _ _).mpr
  rw [← nested_normalization_witness, normalize_idempotent]

theorem signed_zero_normalization_witness : normalize negativeZero = positiveZero := by decide

theorem overwritten_duplicate_ignored :
    normalize (.object (.cons "x" (.bool false) (.cons "x" (.bool true) .nil))) =
      normalize (.object (.cons "x" (.bool true) .nil)) := by decide

theorem reordered_distinct_keys_witness :
    normalize (.object (.cons "x" (.bool false) (.cons "2" (.bool true) .nil))) =
      normalize (.object (.cons "2" (.bool true) (.cons "x" (.bool false) .nil))) := by decide

theorem changed_duplicate_winner_rejected :
    ¬ Equivalent (.object (.cons "x" (.bool false) (.cons "x" (.bool true) .nil)))
      (.object (.cons "x" (.bool true) (.cons "x" (.bool false) .nil))) := by
  rw [equivalent_iff_normalize_eq]
  decide

theorem array_permutation_rejected :
    ¬ Equivalent (.array (.cons (.bool true) (.cons (.bool false) .nil)))
      (.array (.cons (.bool false) (.cons (.bool true) .nil))) := by
  rw [equivalent_iff_normalize_eq]
  decide

theorem absent_and_present_null_rejected :
    ¬ Equivalent (.object .nil) (.object (.cons "x" .null .nil)) := by
  rw [equivalent_iff_normalize_eq]
  decide

theorem inherited_name_stays_absent :
    lookupFields (canonicalFields .nil) "toString" = none := by decide

theorem proto_is_retained_own_key :
    lookupFields (canonicalFields (.cons "__proto__" .null .nil)) "__proto__" = some .null := by decide

theorem unicode_normalization_not_applied : ¬ Equivalent (.text "é") (.text "é") := by
  rw [equivalent_iff_normalize_eq]
  decide

end Algal.Core.Normalize
