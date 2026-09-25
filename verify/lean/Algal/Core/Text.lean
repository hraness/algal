import Init

/-!
Strings here contain Unicode scalar values, including combining characters;
there is no NFC normalization. Legacy Bun strings with lone surrogates are not
in this portable domain. Key comparison uses UTF-16 units, not Lean's scalar
string order. Decimal index classification follows JS OwnPropertyKeys.
-/
namespace Algal.Core.Text

def utf16Char (c : Char) : List Nat :=
  if c.toNat < 0x10000 then [c.toNat]
  else [0xd800 + (c.toNat - 0x10000) / 1024, 0xdc00 + (c.toNat - 0x10000) % 1024]

def utf16 (s : String) : List Nat := s.toList.flatMap utf16Char

theorem scalar_range (c : Char) :
    c.toNat < 0xd800 ∨ (0xdfff < c.toNat ∧ c.toNat < 0x110000) := by
  simpa only [isValidChar, UInt32.lt_iff_toNat_lt, Char.toNat] using c.valid

theorem utf16Char_length (c : Char) :
    (utf16Char c).length = 1 ∨ (utf16Char c).length = 2 := by
  unfold utf16Char
  split <;> simp

theorem utf16Char_unit_bound (c : Char) (u : Nat) (h : u ∈ utf16Char c) :
    u < 65536 := by
  have hc := scalar_range c
  unfold utf16Char at h
  split at h
  · simp only [List.mem_singleton] at h
    omega
  · simp only [List.mem_cons, List.not_mem_nil, or_false] at h
    omega

def decodeChar : List Nat → Option (Char × List Nat)
  | [] => none
  | n :: ns =>
    if n < 0xd800 ∨ (0xdfff < n ∧ n < 0x10000) then some (Char.ofNat n, ns)
    else match ns with
      | [] => none
      | m :: ms =>
        if 0xd800 ≤ n ∧ n < 0xdc00 ∧ 0xdc00 ≤ m ∧ m < 0xe000 then
          some (Char.ofNat (0x10000 + (n - 0xd800) * 1024 + (m - 0xdc00)), ms)
        else none

theorem decodeChar_utf16Char (c : Char) (rest : List Nat) :
    decodeChar (utf16Char c ++ rest) = some (c, rest) := by
  have hc := scalar_range c
  unfold utf16Char
  split
  next h =>
    have hb : c.toNat < 0xd800 ∨ (0xdfff < c.toNat ∧ c.toNat < 0x10000) := by omega
    simp [decodeChar, hb, Char.ofNat_toNat]
  next h =>
    have hi : ¬(0xd800 + (c.toNat - 0x10000) / 1024 < 0xd800 ∨
        (0xdfff < 0xd800 + (c.toNat - 0x10000) / 1024 ∧
          0xd800 + (c.toNat - 0x10000) / 1024 < 0x10000)) := by omega
    have hp : 0xd800 ≤ 0xd800 + (c.toNat - 0x10000) / 1024 ∧
        0xd800 + (c.toNat - 0x10000) / 1024 < 0xdc00 ∧
        0xdc00 ≤ 0xdc00 + (c.toNat - 0x10000) % 1024 ∧
        0xdc00 + (c.toNat - 0x10000) % 1024 < 0xe000 := by omega
    have he : 0x10000 + (c.toNat - 0x10000) / 1024 * 1024 +
        (c.toNat - 0x10000) % 1024 = c.toNat := by omega
    simp [decodeChar, hi, hp, he, Char.ofNat_toNat]

theorem utf16Char_injective (a b : Char) (h : utf16Char a = utf16Char b) : a = b := by
  have ha := decodeChar_utf16Char a []
  have hb := decodeChar_utf16Char b []
  rw [h] at ha
  have he := ha.symm.trans hb
  exact (Prod.mk.inj (Option.some.inj he)).1

def decodeChars : Nat → List Nat → Option (List Char)
  | 0, [] => some []
  | 0, _ :: _ => none
  | fuel + 1, units =>
    match units with
    | [] => some []
    | _ :: _ => do
      let (c, rest) ← decodeChar units
      let cs ← decodeChars fuel rest
      pure (c :: cs)

theorem decodeChars_utf16 (cs : List Char) (extra : Nat) :
    decodeChars (cs.length + extra) (cs.flatMap utf16Char) = some cs := by
  induction cs with
  | nil => cases extra <;> rfl
  | cons c cs ih =>
    have hn : utf16Char c ++ cs.flatMap utf16Char ≠ [] := by
      unfold utf16Char
      split <;> simp
    rw [List.length_cons, Nat.add_right_comm, List.flatMap_cons]
    unfold decodeChars
    split
    · contradiction
    · rw [decodeChar_utf16Char]
      simp [ih]

theorem utf16_injective (a b : String) (h : utf16 a = utf16 b) : a = b := by
  have ha := decodeChars_utf16 a.toList b.toList.length
  have hb := decodeChars_utf16 b.toList a.toList.length
  unfold utf16 at h
  rw [h, Nat.add_comm] at ha
  exact String.toList_injective (Option.some.inj (ha.symm.trans hb))

def parseDigits : List Char → Nat → Option Nat
  | [], n => some n
  | c :: cs, n =>
    if '0'.toNat ≤ c.toNat ∧ c.toNat ≤ '9'.toNat then
      parseDigits cs (n * 10 + c.toNat - '0'.toNat)
    else none

def arrayIndex (s : String) : Option Nat :=
  match s.toList with
  | [] => none
  | ['0'] => some 0
  | c :: cs =>
    if c = '0' then none
    else match parseDigits (c :: cs) 0 with
      | none => none
      | some n => if n < 4294967295 then some n else none

def keyOrder (a b : String) : Ordering :=
  match arrayIndex a, arrayIndex b with
  | some i, some j => compare i j
  | some _, none => .lt
  | none, some _ => .gt
  | none, none => compare (utf16 a) (utf16 b)

def insertKey (key : String) : List String → List String
  | [] => [key]
  | next :: rest =>
    if keyOrder key next != .gt then key :: next :: rest
    else next :: insertKey key rest

def canonicalKeys : List String → List String
  | [] => []
  | key :: rest => insertKey key (canonicalKeys rest)

theorem insertKey_preserves_keys (key : String) (keys : List String) :
    (insertKey key keys).Perm (key :: keys) := by
  induction keys with
  | nil => exact .refl _
  | cons next rest ih =>
    unfold insertKey
    split
    · exact .refl _
    · exact (ih.cons next).trans (.swap _ _ _)

theorem canonicalKeys_preserves_keys (keys : List String) :
    (canonicalKeys keys).Perm keys := by
  induction keys with
  | nil => exact .refl _
  | cons key rest ih =>
    exact (insertKey_preserves_keys key (canonicalKeys rest)).trans (ih.cons key)

theorem scalar_surrogate_rejected : ¬ Char.isValidCharNat 0xd800 := by decide
theorem utf16_supplementary_witness : utf16 "😀" = [0xd83d, 0xde00] := by decide
theorem no_nfc_identification : utf16 "é" ≠ utf16 "é" := by decide
theorem scalar_order_is_not_utf16_order : keyOrder "😀" "" = .lt := by decide
theorem index_maximum_admitted : arrayIndex "4294967294" = some 4294967294 := by decide
theorem index_overflow_rejected : arrayIndex "4294967295" = none := by decide
theorem index_leading_zero_rejected : arrayIndex "01" = none := by decide
theorem index_plus_rejected : arrayIndex "+1" = none := by decide
theorem index_negative_zero_rejected : arrayIndex "-0" = none := by decide
theorem canonical_key_order_witness :
    canonicalKeys ["z", "10", "01", "2", "😀", ""] =
      ["2", "10", "01", "z", "😀", ""] := by decide

end Algal.Core.Text
