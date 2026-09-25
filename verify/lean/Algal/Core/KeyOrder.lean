import Algal.Core.Text
import Algal.Core.OwnMap
import Init.Data.Nat.ToString
import Init.Data.Order.Ord

/-!
General ordering and finite-map normal forms over the existing Text comparator.
No key subset, unique-input-key premise, or changed comparison is used. The
projection identifies exactly extensional own maps, including last-wins history;
it is not a proof of JSON text rendering or an implementation refinement.
-/
namespace Algal.Core.KeyOrder
open Algal.Core.Text

theorem digit_char_rebuild (c : Char) (h : 48 ≤ c.toNat ∧ c.toNat ≤ 57) :
    Nat.digitChar (c.toNat - 48) = c := by
  apply Char.toNat_inj.mp
  rw [Nat.toNat_digitChar_of_lt_ten (by omega)]
  omega

theorem parseDigits_append_repr (cs : List Char) (acc n : Nat) (ha : 0 < acc)
    (h : parseDigits cs acc = some n) : Nat.toDigits 10 acc ++ cs = Nat.toDigits 10 n := by
  induction cs generalizing acc with
  | nil =>
    simp only [parseDigits, Option.some.injEq] at h
    subst n
    simp
  | cons c cs ih =>
    simp only [parseDigits] at h
    split at h
    next hd =>
      change 48 ≤ c.toNat ∧ c.toNat ≤ 57 at hd
      have hv : c.toNat - 48 < 10 := by omega
      have he : acc * 10 + c.toNat - 48 = 10 * acc + (c.toNat - 48) := by omega
      change parseDigits cs (acc * 10 + c.toNat - 48) = some n at h
      rw [he] at h
      have hn : 0 < 10 * acc + (c.toNat - 48) := by omega
      have ht := ih (10 * acc + (c.toNat - 48)) hn h
      have hp := Nat.toDigits_append_toDigits (b := 10) (n := acc)
        (d := c.toNat - 48) (by decide) ha hv
      rw [Nat.toDigits_of_lt_base hv, digit_char_rebuild c hd] at hp
      calc
        Nat.toDigits 10 acc ++ c :: cs = (Nat.toDigits 10 acc ++ [c]) ++ cs := by simp
        _ = Nat.toDigits 10 (10 * acc + (c.toNat - 48)) ++ cs := by rw [hp]
        _ = Nat.toDigits 10 n := ht
    · contradiction

theorem parseDigits_nonzero_head (c : Char) (cs : List Char) (n : Nat)
    (hz : c ≠ '0') (h : parseDigits (c :: cs) 0 = some n) :
    c :: cs = Nat.toDigits 10 n := by
  simp only [parseDigits] at h
  split at h
  next hd =>
    change 48 ≤ c.toNat ∧ c.toNat ≤ 57 at hd
    have hz' : c.toNat ≠ 48 := by
      intro he
      apply hz
      exact Char.toNat_inj.mp he
    have hp : 0 < c.toNat - 48 := by omega
    have hl : c.toNat - 48 < 10 := by omega
    simp only [Nat.zero_mul, Nat.zero_add] at h
    have hh := parseDigits_append_repr cs (c.toNat - 48) n hp h
    rw [Nat.toDigits_of_lt_base hl, digit_char_rebuild c hd] at hh
    simpa using hh
  · contradiction

theorem arrayIndex_digits (s : String) (n : Nat) (h : arrayIndex s = some n) :
    s.toList = Nat.toDigits 10 n := by
  unfold arrayIndex at h
  split at h
  · contradiction
  next hz =>
    cases h
    simpa using hz
  next c cs hlist hnotzero =>
    split at h
    · contradiction
    next hc =>
      split at h
      · contradiction
      next parsed hp =>
        split at h
        · cases h
          rw [hnotzero]
          exact parseDigits_nonzero_head c cs n hc hp
        · contradiction

theorem arrayIndex_injective (a b : String) (n : Nat)
    (ha : arrayIndex a = some n) (hb : arrayIndex b = some n) : a = b := by
  apply String.toList_injective
  exact (arrayIndex_digits a n ha).trans (arrayIndex_digits b n hb).symm



theorem keyOrder_swap (a b : String) : keyOrder a b = (keyOrder b a).swap := by
  cases ha : arrayIndex a <;> cases hb : arrayIndex b <;>
    simp only [keyOrder, ha, hb]
  · exact Std.OrientedOrd.eq_swap
  · rfl
  · rfl
  · exact Std.OrientedOrd.eq_swap

instance : Std.OrientedCmp keyOrder where
  eq_swap := keyOrder_swap _ _

instance : Std.TransCmp keyOrder where
  isLE_trans {a b c} hab hbc := by
    cases ha : arrayIndex a <;> cases hb : arrayIndex b <;> cases hc : arrayIndex c <;>
      simp only [keyOrder, ha, hb, hc] at *
    all_goals first | exact Std.TransOrd.isLE_trans hab hbc | contradiction | rfl

instance : Std.LawfulEqCmp keyOrder where
  compare_self {a} := by
    cases ha : arrayIndex a <;> simp [keyOrder, ha]
  eq_of_compare {a b} h := by
    cases ha : arrayIndex a <;> cases hb : arrayIndex b <;> simp [keyOrder, ha, hb] at h
    · exact utf16_injective a b h
    · cases h
      exact arrayIndex_injective a b _ ha hb

def keyLE (a b : String) : Prop := (keyOrder a b).isLE = true

theorem keyLE_trans (a b c : String) (hab : keyLE a b) (hbc : keyLE b c) : keyLE a c :=
  Std.TransCmp.isLE_trans hab hbc

theorem keyLE_antisymm (a b : String) (hab : keyLE a b) (hba : keyLE b a) : a = b :=
  Std.LawfulEqCmp.eq_of_compare (Std.OrientedCmp.isLE_antisymm hab hba)

theorem keyLE_total (a b : String) : keyLE a b ∨ keyLE b a := by
  have hs := keyOrder_swap a b
  unfold keyLE
  cases ha : keyOrder a b <;> cases hb : keyOrder b a <;> simp_all

theorem keyOrder_notGT (a b : String) : (keyOrder a b != .gt) = (keyOrder a b).isLE := by
  cases keyOrder a b <;> rfl

theorem insertKey_sorted (key : String) (keys : List String) (hs : keys.Pairwise keyLE) :
    (insertKey key keys).Pairwise keyLE := by
  induction keys with
  | nil => simp [insertKey]
  | cons next rest ih =>
    have hp := List.pairwise_cons.mp hs
    unfold insertKey
    rw [keyOrder_notGT]
    split
    next hle =>
      apply List.pairwise_cons.mpr
      refine ⟨?_, hs⟩
      intro other member
      simp only [List.mem_cons] at member
      cases member with
      | inl he => subst other; exact hle
      | inr hr => exact keyLE_trans key next other hle (hp.1 other hr)
    next hnot =>
      apply List.pairwise_cons.mpr
      refine ⟨?_, ih hp.2⟩
      intro other member
      have hm := (insertKey_preserves_keys key rest).mem_iff.mp member
      simp only [List.mem_cons] at hm
      cases hm with
      | inl he =>
        subst other
        exact (keyLE_total key next).resolve_left hnot
      | inr hr => exact hp.1 other hr

theorem canonicalKeys_sorted (keys : List String) : (canonicalKeys keys).Pairwise keyLE := by
  induction keys with
  | nil => exact .nil
  | cons key rest ih => exact insertKey_sorted key (canonicalKeys rest) ih

theorem canonicalKeys_permutation_invariant (a b : List String) (h : a.Perm b) :
    canonicalKeys a = canonicalKeys b := by
  apply List.Perm.eq_of_pairwise (fun x y _ _ hxy hyx => keyLE_antisymm x y hxy hyx)
    (canonicalKeys_sorted a) (canonicalKeys_sorted b)
  exact (canonicalKeys_preserves_keys a).trans (h.trans (canonicalKeys_preserves_keys b).symm)



theorem canonicalKeys_idempotent (keys : List String) :
    canonicalKeys (canonicalKeys keys) = canonicalKeys keys :=
  canonicalKeys_permutation_invariant _ _ (canonicalKeys_preserves_keys keys)

theorem lookup_isSome_iff {α : Type} (entries : Algal.Core.OwnMap.Entries α) (key : String) :
    (Algal.Core.OwnMap.lookup entries key).isSome = true ↔ key ∈ entries.map Prod.fst := by
  induction entries with
  | nil => simp [Algal.Core.OwnMap.lookup]
  | cons entry rest ih =>
    rcases entry with ⟨name, value⟩
    by_cases h : key = name <;> simp [Algal.Core.OwnMap.lookup, h, ih]

theorem eraseDups_nodup (keys : List String) : keys.eraseDups.Nodup := by
  cases keys with
  | nil => exact .nil
  | cons key rest =>
    rw [List.eraseDups_cons]
    apply List.nodup_cons.mpr
    constructor
    · intro h
      have hh := List.mem_eraseDups.mp h
      simp at hh
    · exact eraseDups_nodup (rest.filter (fun name => !name == key))
termination_by keys.length
 decreasing_by
  have h := List.length_filter_le (p := fun name => !name == key) rest
  simp only [List.length_cons]
  omega

def support {α : Type} (entries : Algal.Core.OwnMap.Entries α) : List String :=
  (entries.map Prod.fst).eraseDups

def canonicalProjection {α : Type} (entries : Algal.Core.OwnMap.Entries α) :
    Algal.Core.OwnMap.Entries (Option α) :=
  (canonicalKeys (support entries)).map (fun key => (key, Algal.Core.OwnMap.lookup entries key))

theorem support_permutation_of_equivalent {α : Type} (a b : Algal.Core.OwnMap.Entries α)
    (h : Algal.Core.OwnMap.Equivalent a b) : (support a).Perm (support b) := by
  apply (List.perm_ext_iff_of_nodup (eraseDups_nodup _) (eraseDups_nodup _)).mpr
  intro key
  simp only [List.mem_eraseDups]
  rw [← lookup_isSome_iff, ← lookup_isSome_iff, h key]

theorem canonicalProjection_eq_of_equivalent {α : Type} (a b : Algal.Core.OwnMap.Entries α)
    (h : Algal.Core.OwnMap.Equivalent a b) : canonicalProjection a = canonicalProjection b := by
  unfold canonicalProjection
  rw [canonicalKeys_permutation_invariant _ _ (support_permutation_of_equivalent a b h)]
  have hf : (fun key => (key, Algal.Core.OwnMap.lookup a key)) =
      (fun key => (key, Algal.Core.OwnMap.lookup b key)) := by
    funext key
    rw [h key]
  rw [hf]

theorem lookup_keyed_map {α : Type} (keys : List String) (f : String → α) (key : String) :
    Algal.Core.OwnMap.lookup (keys.map (fun name => (name, f name))) key =
      if key ∈ keys then some (f key) else none := by
  induction keys with
  | nil => simp [Algal.Core.OwnMap.lookup]
  | cons name rest ih =>
    by_cases h : key = name <;> simp [Algal.Core.OwnMap.lookup, h, ih]

theorem canonicalProjection_lookup {α : Type} (entries : Algal.Core.OwnMap.Entries α) (key : String) :
    (Algal.Core.OwnMap.lookup (canonicalProjection entries) key).join = Algal.Core.OwnMap.lookup entries key := by
  have hm : key ∈ canonicalKeys (support entries) ↔
      (Algal.Core.OwnMap.lookup entries key).isSome = true := by
    rw [(canonicalKeys_preserves_keys (support entries)).mem_iff]
    simp only [support, List.mem_eraseDups, lookup_isSome_iff]
  unfold canonicalProjection
  rw [lookup_keyed_map]
  cases h : Algal.Core.OwnMap.lookup entries key with
  | none => simp_all
  | some value => simp_all

theorem canonicalProjection_eq_iff {α : Type} (a b : Algal.Core.OwnMap.Entries α) :
    canonicalProjection a = canonicalProjection b ↔ Algal.Core.OwnMap.Equivalent a b := by
  constructor
  · intro h key
    rw [← canonicalProjection_lookup a key, ← canonicalProjection_lookup b key, h]
  · exact canonicalProjection_eq_of_equivalent a b

theorem canonicalProjection_distinct_writes_commute {α : Type}
    (entries : Algal.Core.OwnMap.Entries α) (a b : String) (va vb : α) (h : a ≠ b) :
    canonicalProjection (Algal.Core.OwnMap.write (Algal.Core.OwnMap.write entries a va) b vb) =
      canonicalProjection (Algal.Core.OwnMap.write (Algal.Core.OwnMap.write entries b vb) a va) :=
  canonicalProjection_eq_of_equivalent _ _ (Algal.Core.OwnMap.distinct_writes_commute entries a b va vb h)

theorem changed_duplicate_winner_changes_projection :
    canonicalProjection (Algal.Core.OwnMap.fromParsedEntries [("x", 1), ("x", 2)]) ≠
      canonicalProjection (Algal.Core.OwnMap.fromParsedEntries [("x", 2), ("x", 1)]) := by
  intro h
  have hh := (canonicalProjection_eq_iff _ _).mp h "x"
  simp [Algal.Core.OwnMap.fromParsedEntries, Algal.Core.OwnMap.lookup] at hh

theorem reordered_map_witness :
    canonicalProjection (Algal.Core.OwnMap.fromParsedEntries [("x", 1), ("y", 2)]) =
      canonicalProjection (Algal.Core.OwnMap.fromParsedEntries [("y", 2), ("x", 1)]) :=
  canonicalProjection_eq_of_equivalent _ _ Algal.Core.OwnMap.insertion_order_witness

end Algal.Core.KeyOrder
