import Algal.Core.JsonString
import Algal.Core.Normalize

/-!
Actual UTF-8 layout for finite JSON trees with the proved scalar-string fragment
codec. The unconditional NoNumbers laws cover null, booleans, strings, arrays and
objects, including ordered duplicate histories and canonical own-map projection.

Arbitrary-number results take explicit NumberCodec.LawsOn and leaf-admission
premises. NO production number instance, decimal denotation, JSON number grammar,
shortest renderer or Bun/native implementation refinement is supplied. Those laws
alone can describe encodings outside JSON's numeric language; theorems do not
relabel them as production JSON. The rejectNumbers witness intentionally has no
full-number Laws instance. Raw whitespace and every alternate legal string escape
are outside this emitted-profile parser. Fuel is bounded by input character length,
which is not a machine stack/RSS or production depth/byte admission theorem.
-/
namespace Algal.Core.JsonLayout

open Algal.Core Algal.Core.Json

def numericHead (input : List Char) : Bool :=
  match input with
  | c :: _ => c == '-' || (48 ≤ c.toNat && c.toNat ≤ 57)
  | [] => false

def Following : List Char → Prop
  | [] => True
  | c :: _ => c = ',' ∨ c = ']' ∨ c = '}'

/- Delimiter-aware assumptions still to discharge for a real ECMAScript
number renderer/parser. No implementation is supplied by this interface. -/
structure NumberCodec where
  render : Binary64.Number → List Char
  read : List Char → Option (Binary64.Number × List Char)

structure NumberCodec.LawsOn (codec : NumberCodec) (admitted : Binary64.Number → Prop) : Prop where
  starts : ∀ number, admitted number → ∀ suffix, numericHead (codec.render number ++ suffix) = true
  roundtrip : ∀ number, admitted number → ∀ suffix, Following suffix →
    codec.read (codec.render number ++ suffix) = some (Binary64.normalize number, suffix)
  normalize_render : ∀ number, admitted number → codec.render (Binary64.normalize number) = codec.render number


abbrev NumberCodec.Laws (codec : NumberCodec) := codec.LawsOn (fun _ => True)

mutual
  def AllNumbers (admitted : Binary64.Number → Prop) : Value → Prop
    | .number n => admitted n
    | .array xs => AllItems admitted xs
    | .object fs => AllFields admitted fs
    | _ => True
  def AllItems (admitted : Binary64.Number → Prop) : Items → Prop
    | .nil => True
    | .cons v rest => AllNumbers admitted v ∧ AllItems admitted rest
  def AllFields (admitted : Binary64.Number → Prop) : Fields → Prop
    | .nil => True
    | .cons _ v rest => AllNumbers admitted v ∧ AllFields admitted rest
end

def NoNumbers (value : Value) : Prop := AllNumbers (fun _ => False) value

mutual
  def render (numbers : NumberCodec) : Value → List Char
    | .null => ['n', 'u', 'l', 'l']
    | .bool true => ['t', 'r', 'u', 'e']
    | .bool false => ['f', 'a', 'l', 's', 'e']
    | .number n => numbers.render n
    | .text s => JsonString.quoteChars s
    | .array xs => '[' :: renderItems numbers xs ++ [']']
    | .object fs => '{' :: renderFields numbers fs ++ ['}']
  def renderItems (numbers : NumberCodec) : Items → List Char
    | .nil => []
    | .cons v .nil => render numbers v
    | .cons v rest => render numbers v ++ ',' :: renderItems numbers rest
  def renderFields (numbers : NumberCodec) : Fields → List Char
    | .nil => []
    | .cons key v .nil => JsonString.quoteChars key ++ ':' :: render numbers v
    | .cons key v rest => JsonString.quoteChars key ++ ':' :: render numbers v ++
        ',' :: renderFields numbers rest
end

mutual
  def weight : Value → Nat
    | .array xs => weightItems xs + 1
    | .object fs => weightFields fs + 1
    | _ => 1
  def weightItems : Items → Nat
    | .nil => 1
    | .cons v rest => max (weight v) (weightItems rest) + 1
  def weightFields : Fields → Nat
    | .nil => 1
    | .cons _ v rest => max (weight v) (weightFields rest) + 1
end

mutual
  def readValue (numbers : NumberCodec) : Nat → List Char → Option (Value × List Char)
    | 0, _ => none
    | fuel + 1, input =>
      if numericHead input then
        (numbers.read input).map (fun r => (.number r.1, r.2))
      else match input with
      | 'n' :: 'u' :: 'l' :: 'l' :: suffix => some (.null, suffix)
      | 't' :: 'r' :: 'u' :: 'e' :: suffix => some (.bool true, suffix)
      | 'f' :: 'a' :: 'l' :: 's' :: 'e' :: suffix => some (.bool false, suffix)
      | '"' :: _ => (JsonString.readQuoted input).map (fun r => (.text r.1, r.2))
      | '[' :: rest => (readItems numbers fuel true rest).map (fun r => (.array r.1, r.2))
      | '{' :: rest => (readFields numbers fuel true rest).map (fun r => (.object r.1, r.2))
      | _ => none
  def readItems (numbers : NumberCodec) : Nat → Bool → List Char → Option (Items × List Char)
    | 0, _, _ => none
    | fuel + 1, allowEmpty, input =>
      if allowEmpty = true ∧ input.head? = some ']' then some (.nil, input.tail)
      else do
        let (value, rest) ← readValue numbers fuel input
        match rest with
        | ']' :: suffix => some (.cons value .nil, suffix)
        | ',' :: rest => do
            let (items, suffix) ← readItems numbers fuel false rest
            pure (.cons value items, suffix)
        | _ => none
  def readFields (numbers : NumberCodec) : Nat → Bool → List Char → Option (Fields × List Char)
    | 0, _, _ => none
    | fuel + 1, allowEmpty, input =>
      if allowEmpty = true ∧ input.head? = some '}' then some (.nil, input.tail)
      else do
        let (key, rest) ← JsonString.readQuoted input
        let ':' :: rest := rest | none
        let (value, rest) ← readValue numbers fuel rest
        match rest with
        | '}' :: suffix => some (.cons key value .nil, suffix)
        | ',' :: rest => do
            let (fields, suffix) ← readFields numbers fuel false rest
            pure (.cons key value fields, suffix)
        | _ => none
end

theorem numericHead_not_close (input : List Char) (h : numericHead input = true) :
    input.head? ≠ some ']' := by
  cases input with
  | nil => simp [numericHead] at h
  | cons c rest =>
    intro hc
    have : c = ']' := Option.some.inj hc
    subst c
    simp [numericHead] at h

theorem render_not_close (numbers : NumberCodec) (laws : numbers.LawsOn admitted) (v : Value) (included : AllNumbers admitted v) (suffix : List Char) :
    (render numbers v ++ suffix).head? ≠ some ']' := by
  cases v with
  | number n => exact numericHead_not_close _ (laws.starts n included suffix)
  | bool b => cases b <;> simp [render]
  | null => simp [render]
  | text s => simp [render, JsonString.quoteChars]
  | array xs => simp [render]
  | object fs => simp [render]

mutual
  theorem read_render (numbers : NumberCodec) (laws : numbers.LawsOn admitted) (v : Value) (included : AllNumbers admitted v) (suffix : List Char)
      (boundary : Following suffix) (fuel : Nat) (enough : weight v ≤ fuel) :
      readValue numbers fuel (render numbers v ++ suffix) =
        some (normalizeNumbers v, suffix) := by
    cases fuel with
    | zero => cases v <;> simp [weight] at enough
    | succ fuel =>
      cases v with
      | null => rfl
      | bool b => cases b <;> rfl
      | number n =>
        simp only [render, readValue, laws.starts n included suffix, ite_true, laws.roundtrip n included suffix boundary]
        rfl
      | text s =>
        change (JsonString.readQuoted (JsonString.quoteChars s ++ suffix)).map _ = _
        rw [JsonString.readQuoted_quote_suffix]
        rfl
      | array xs =>
        have bound : weightItems xs ≤ fuel := by simp only [weight] at enough; omega
        simp only [render, List.cons_append, List.append_assoc]
        change (readItems numbers fuel true (renderItems numbers xs ++ ']' :: suffix)).map _ = _
        rw [read_renderItems numbers laws xs included suffix true (by simp) fuel bound]
        rfl
      | object fs =>
        have bound : weightFields fs ≤ fuel := by simp only [weight] at enough; omega
        simp only [render, List.cons_append, List.append_assoc]
        change (readFields numbers fuel true (renderFields numbers fs ++ '}' :: suffix)).map _ = _
        rw [read_renderFields numbers laws fs included suffix true (by simp) fuel bound]
        rfl
  theorem read_renderItems (numbers : NumberCodec) (laws : numbers.LawsOn admitted) (xs : Items) (included : AllItems admitted xs) (suffix : List Char)
      (allowEmpty : Bool) (allowed : xs = .nil → allowEmpty = true)
      (fuel : Nat) (enough : weightItems xs ≤ fuel) :
      readItems numbers fuel allowEmpty (renderItems numbers xs ++ ']' :: suffix) =
        some (normalizeItems xs, suffix) := by
    cases fuel with
    | zero => cases xs <;> simp [weightItems] at enough
    | succ fuel =>
      cases xs with
      | nil => simp [renderItems, normalizeItems, readItems, allowed rfl]
      | cons v rest =>
        have valueIncluded := included.1
        have restIncluded := included.2
        have valueBound : weight v ≤ fuel := by simp only [weightItems] at enough; omega
        have restBound : weightItems rest ≤ fuel := by simp only [weightItems] at enough; omega
        cases rest with
        | nil =>
          rw [renderItems, readItems]
          rw [ite_eq_right (fun h => render_not_close numbers laws v valueIncluded _ h.2)]
          rw [read_render numbers laws v valueIncluded (']' :: suffix) (by simp [Following]) fuel valueBound]
          rfl
        | cons v' rest =>
          rw [renderItems, List.append_assoc, readItems] <;> try (intro h; cases h)
          rw [ite_eq_right (fun h => render_not_close numbers laws v valueIncluded _ h.2)]
          rw [read_render numbers laws v valueIncluded (',' :: renderItems numbers (.cons v' rest) ++ ']' :: suffix)
            (by simp [Following]) fuel valueBound]
          simp only [Bind.bind, Option.bind, List.cons_append]
          rw [read_renderItems numbers laws (.cons v' rest) restIncluded suffix false (by intro h; cases h) fuel restBound]
          rfl
  theorem read_renderFields (numbers : NumberCodec) (laws : numbers.LawsOn admitted) (fs : Fields) (included : AllFields admitted fs) (suffix : List Char)
      (allowEmpty : Bool) (allowed : fs = .nil → allowEmpty = true)
      (fuel : Nat) (enough : weightFields fs ≤ fuel) :
      readFields numbers fuel allowEmpty (renderFields numbers fs ++ '}' :: suffix) =
        some (normalizeFields fs, suffix) := by
    cases fuel with
    | zero => cases fs <;> simp [weightFields] at enough
    | succ fuel =>
      cases fs with
      | nil => simp [renderFields, normalizeFields, readFields, allowed rfl]
      | cons key v rest =>
        have valueIncluded := included.1
        have restIncluded := included.2
        have valueBound : weight v ≤ fuel := by simp only [weightFields] at enough; omega
        have restBound : weightFields rest ≤ fuel := by simp only [weightFields] at enough; omega
        cases rest with
        | nil =>
          rw [renderFields, List.append_assoc, readFields]
          rw [ite_eq_right (by intro h; have : (some '\"' : Option Char) = some '}' := h.2; contradiction)]
          rw [JsonString.readQuoted_quote_suffix]
          simp only [Bind.bind, Option.bind, List.cons_append]
          rw [read_render numbers laws v valueIncluded ('}' :: suffix) (by simp [Following]) fuel valueBound]
          rfl
        | cons key' v' rest =>
          rw [renderFields, List.append_assoc, List.append_assoc, readFields] <;> try (intro h; cases h)
          rw [ite_eq_right (by intro h; have : (some '\"' : Option Char) = some '}' := h.2; contradiction)]
          rw [JsonString.readQuoted_quote_suffix]
          simp only [Bind.bind, Option.bind, List.cons_append]
          rw [read_render numbers laws v valueIncluded (',' :: (renderFields numbers (.cons key' v' rest) ++ '}' :: suffix))
            (by simp [Following]) fuel valueBound]
          simp only
          rw [read_renderFields numbers laws (.cons key' v' rest) restIncluded suffix false (by intro h; cases h) fuel restBound]
          rfl

end

theorem number_render_nonempty (numbers : NumberCodec) (laws : numbers.LawsOn admitted)
    (number : Binary64.Number) (included : admitted number) : 0 < (numbers.render number).length := by
  have h := laws.starts number included []
  cases he : numbers.render number with
  | nil => simp [he, numericHead] at h
  | cons c rest => simp

theorem weight_positive (value : Value) : 0 < weight value := by
  cases value <;> simp [weight]

mutual
  theorem weight_le_render (numbers : NumberCodec) (laws : numbers.LawsOn admitted) (value : Value) (included : AllNumbers admitted value) :
      weight value ≤ (render numbers value).length := by
    cases value with
    | null => simp [weight, render]
    | bool b => cases b <;> simp [weight, render]
    | number n => exact number_render_nonempty numbers laws n included
    | text s => simp [weight, render, JsonString.quoteChars]
    | array xs =>
      have bound := weightItems_le_render numbers laws xs included
      simp only [weight, render, List.length_cons, List.length_append, List.length_nil]
      omega
    | object fs =>
      have bound := weightFields_le_render numbers laws fs included
      simp only [weight, render, List.length_cons, List.length_append, List.length_nil]
      omega
  theorem weightItems_le_render (numbers : NumberCodec) (laws : numbers.LawsOn admitted) (xs : Items) (included : AllItems admitted xs) :
      weightItems xs ≤ (renderItems numbers xs).length + 1 := by
    cases xs with
    | nil => exact Nat.le_refl _
    | cons v rest =>
      have valueBound := weight_le_render numbers laws v included.1
      have restBound := weightItems_le_render numbers laws rest included.2
      have positive := weight_positive v
      cases rest with
      | nil =>
        simp only [weightItems, renderItems]
        omega
      | cons v' rest =>
        simp only [weightItems, renderItems, List.length_append, List.length_cons] at *
        omega
  theorem weightFields_le_render (numbers : NumberCodec) (laws : numbers.LawsOn admitted) (fs : Fields) (included : AllFields admitted fs) :
      weightFields fs ≤ (renderFields numbers fs).length + 1 := by
    cases fs with
    | nil => exact Nat.le_refl _
    | cons key v rest =>
      have valueBound := weight_le_render numbers laws v included.1
      have restBound := weightFields_le_render numbers laws rest included.2
      cases rest with
      | nil =>
        simp only [weightFields, renderFields, List.length_append, List.length_cons]
        omega
      | cons key' v' rest =>
        simp only [weightFields, renderFields, List.length_append, List.length_cons] at *
        omega
end

def readWhole (numbers : NumberCodec) (input : List Char) : Option Value := do
  let (value, suffix) ← readValue numbers input.length input
  if suffix = [] then some value else none

theorem whole_roundtrip (numbers : NumberCodec) (laws : numbers.LawsOn admitted) (value : Value) (included : AllNumbers admitted value) :
    readWhole numbers (render numbers value) = some (normalizeNumbers value) := by
  have parsed := read_render numbers laws value included [] (by trivial)
    (render numbers value).length (weight_le_render numbers laws value included)
  simp only [List.append_nil] at parsed
  rw [readWhole, parsed]
  rfl

def renderBytes (numbers : NumberCodec) (value : Value) : ByteArray :=
  (String.ofList (render numbers value)).toUTF8

def readBytes (numbers : NumberCodec) (bytes : ByteArray) : Option Value := do
  let text ← String.fromUTF8? bytes
  readWhole numbers text.toList

theorem bytes_roundtrip (numbers : NumberCodec) (laws : numbers.LawsOn admitted) (value : Value) (included : AllNumbers admitted value) :
    readBytes numbers (renderBytes numbers value) = some (normalizeNumbers value) := by
  rw [readBytes, renderBytes, JsonString.fromUTF8_toUTF8]
  change readWhole numbers (String.ofList (render numbers value)).toList = _
  rw [String.toList_ofList, whole_roundtrip numbers laws value included]

theorem bytes_equal_implies_normalized (numbers : NumberCodec) (laws : numbers.LawsOn admitted)
    (a b : Value) (includedA : AllNumbers admitted a) (includedB : AllNumbers admitted b) (same : renderBytes numbers a = renderBytes numbers b) :
    normalizeNumbers a = normalizeNumbers b := by
  have parsed := congrArg (readBytes numbers) same
  simpa only [bytes_roundtrip numbers laws a includedA, bytes_roundtrip numbers laws b includedB, Option.some.injEq] using parsed

def bytesToTokens (numbers : NumberCodec) (bytes : ByteArray) : Option (List Token) :=
  (readBytes numbers bytes).map Json.encode

theorem bytes_to_tokens (numbers : NumberCodec) (laws : numbers.LawsOn admitted) (value : Value) (included : AllNumbers admitted value) :
    bytesToTokens numbers (renderBytes numbers value) = some (Json.encode (normalizeNumbers value)) := by
  rw [bytesToTokens, bytes_roundtrip numbers laws value included]
  rfl

theorem bytes_to_structural_decoder (numbers : NumberCodec) (laws : numbers.LawsOn admitted) (value : Value) (included : AllNumbers admitted value) :
    (bytesToTokens numbers (renderBytes numbers value)).bind Json.decode =
      some (normalizeNumbers value) := by
  rw [bytes_to_tokens numbers laws value included]
  exact Json.structural_roundtrip _

theorem noNumberLaws (numbers : NumberCodec) : numbers.LawsOn (fun _ => False) := {
  starts := fun _ impossible _ => impossible.elim
  roundtrip := fun _ impossible _ _ => impossible.elim
  normalize_render := fun _ impossible => impossible.elim }

mutual
  theorem noNumbers_normalized (value : Value) (included : NoNumbers value) :
      normalizeNumbers value = value := by
    cases value with
    | null => rfl
    | bool _ => rfl
    | number _ => exact included.elim
    | text _ => rfl
    | array xs => simp only [normalizeNumbers, noNumberItems_normalized xs included]
    | object fs => simp only [normalizeNumbers, noNumberFields_normalized fs included]
  theorem noNumberItems_normalized (xs : Items) (included : AllItems (fun _ => False) xs) :
      normalizeItems xs = xs := by
    cases xs with
    | nil => rfl
    | cons v rest => simp only [normalizeItems, noNumbers_normalized v included.1,
        noNumberItems_normalized rest included.2]
  theorem noNumberFields_normalized (fs : Fields) (included : AllFields (fun _ => False) fs) :
      normalizeFields fs = fs := by
    cases fs with
    | nil => rfl
    | cons key v rest => simp only [normalizeFields, noNumbers_normalized v included.1,
        noNumberFields_normalized rest included.2]
end

theorem noNumbers_bytes_roundtrip (numbers : NumberCodec) (value : Value) (included : NoNumbers value) :
    readBytes numbers (renderBytes numbers value) = some value := by
  rw [bytes_roundtrip numbers (noNumberLaws numbers) value included,
    noNumbers_normalized value included]

theorem noNumbers_bytes_injective (numbers : NumberCodec) (a b : Value)
    (ha : NoNumbers a) (hb : NoNumbers b) (same : renderBytes numbers a = renderBytes numbers b) : a = b := by
  have parsed := congrArg (readBytes numbers) same
  simpa only [noNumbers_bytes_roundtrip numbers a ha, noNumbers_bytes_roundtrip numbers b hb,
    Option.some.injEq] using parsed

/- This executable stub rejects every number. It is used only to witness the
unconditional number-free fragment. It has no claimed full-number Laws instance. -/
def rejectNumbers : NumberCodec where
  render := fun _ => []
  read := fun _ => none

def nestedStringTree : Value := .object (.cons "__proto__"
  (.array (.cons (.text "\"},[\\😀\n") (.cons (.bool true) (.cons .null .nil))))
  (.cons "x" (.text "first") (.cons "x" (.text "last") .nil)))

theorem nestedStringTree_no_numbers : NoNumbers nestedStringTree := by
  simp [NoNumbers, nestedStringTree, AllNumbers, AllItems, AllFields]

theorem nested_number_free_bytes_roundtrip :
    readBytes rejectNumbers (renderBytes rejectNumbers nestedStringTree) = some nestedStringTree :=
  noNumbers_bytes_roundtrip _ _ nestedStringTree_no_numbers

theorem numeric_stub_has_no_full_laws : ¬ rejectNumbers.Laws := by
  intro laws
  have h := laws.starts ⟨0, by decide⟩ True.intro []
  simp [rejectNumbers, numericHead] at h

theorem bytes_of_chars (numbers : NumberCodec) (input : List Char) :
    readBytes numbers (String.ofList input).toUTF8 = readWhole numbers input := by
  rw [readBytes, JsonString.fromUTF8_toUTF8]
  change readWhole numbers (String.ofList input).toList = _
  rw [String.toList_ofList]

theorem array_trailing_comma_rejected :
    readBytes rejectNumbers (String.ofList ['[','n','u','l','l',',',']']).toUTF8 = none := by
  rw [bytes_of_chars]
  rfl

theorem object_trailing_comma_rejected :
    readBytes rejectNumbers (String.ofList ['{','"','x','"',':','n','u','l','l',',','}']).toUTF8 = none := by
  rw [bytes_of_chars]
  rfl

theorem mismatched_delimiter_rejected :
    readBytes rejectNumbers (String.ofList ['{','"','x','"',':','[','t','r','u','e','}','}']).toUTF8 = none := by
  rw [bytes_of_chars]
  rfl

theorem missing_colon_rejected :
    readBytes rejectNumbers (String.ofList ['{','"','x','"','n','u','l','l','}']).toUTF8 = none := by
  rw [bytes_of_chars]
  rfl

theorem extra_root_rejected :
    readBytes rejectNumbers (String.ofList ['n','u','l','l','t','r','u','e']).toUTF8 = none := by
  rw [bytes_of_chars]
  rfl

theorem number_branch_stub_rejected :
    readBytes rejectNumbers (String.ofList ['[','0',']']).toUTF8 = none := by
  rw [bytes_of_chars]
  rfl



theorem normalizeNumbers_lookup (fields : Fields) (key : String) :
    Normalize.lookupFields (Json.normalizeFields fields) key =
      (Normalize.lookupFields fields key).map normalizeNumbers := by
  cases fields with
  | nil => rfl
  | cons k v rest =>
    simp only [Json.normalizeFields, Normalize.lookupFields_cons, normalizeNumbers_lookup rest key]
    cases Normalize.lookupFields rest key <;> by_cases hk : key = k <;> simp [hk]

mutual
  theorem numberNormalization_sound (value : Value) :
      Normalize.Equivalent value (normalizeNumbers value) := by
    cases value with
    | null => exact .null
    | bool b => exact .bool b
    | number n =>
      exact .number ((Normalize.numberEquivalent_iff_normalize _ _).mpr
        (Binary64.normalize_idempotent n).symm)
    | text s => exact .text s
    | array xs => exact .array (numberNormalizationItems_sound xs)
    | object fs =>
      apply Normalize.Equivalent.object
      intro key
      rw [normalizeNumbers_lookup]
      exact numberNormalizationFields_sound fs key
  theorem numberNormalizationItems_sound (items : Items) :
      Normalize.ItemsEquivalent items (Json.normalizeItems items) := by
    cases items with
    | nil => exact .nil
    | cons v rest => exact .cons (numberNormalization_sound v) (numberNormalizationItems_sound rest)
  theorem numberNormalizationFields_sound (fields : Fields) (key : String) :
      Normalize.OptionsEquivalent (Normalize.lookupFields fields key)
        ((Normalize.lookupFields fields key).map normalizeNumbers) := by
    cases fields with
    | nil => exact .none
    | cons k v rest =>
      rw [Normalize.lookupFields_cons]
      have ih := numberNormalizationFields_sound rest key
      cases h : Normalize.lookupFields rest key with
      | none =>
        by_cases hk : key = k
        · simp only [hk, ite_true, Option.or, Option.map_some]
          exact .some (numberNormalization_sound v)
        · simp only [hk, ite_false, Option.or, Option.map_none]
          exact .none
      | some value => simpa only [h, Option.or, Option.map_some] using ih
end

theorem normalize_after_numberNormalization (value : Value) :
    Normalize.normalize (normalizeNumbers value) = Normalize.normalize value :=
  (Normalize.equivalent_normalize (numberNormalization_sound value)).symm

def canonicalBytes (numbers : NumberCodec) (value : Value) : ByteArray :=
  renderBytes numbers (Normalize.normalize value)

def readCanonicalBytes (numbers : NumberCodec) (bytes : ByteArray) : Option Value :=
  (readBytes numbers bytes).map Normalize.normalize

theorem canonicalBytes_roundtrip (numbers : NumberCodec) (laws : numbers.LawsOn admitted)
    (value : Value) (included : AllNumbers admitted (Normalize.normalize value)) :
    readCanonicalBytes numbers (canonicalBytes numbers value) = some (Normalize.normalize value) := by
  rw [canonicalBytes, readCanonicalBytes, bytes_roundtrip numbers laws _ included]
  simp only [Option.map_some, normalize_after_numberNormalization, Normalize.normalize_idempotent]

theorem canonicalBytes_eq_iff (numbers : NumberCodec) (laws : numbers.LawsOn admitted)
    (a b : Value) (ha : AllNumbers admitted (Normalize.normalize a))
    (hb : AllNumbers admitted (Normalize.normalize b)) :
    canonicalBytes numbers a = canonicalBytes numbers b ↔ Normalize.Equivalent a b := by
  constructor
  · intro same
    have decoded := congrArg (readCanonicalBytes numbers) same
    rw [canonicalBytes_roundtrip numbers laws a ha, canonicalBytes_roundtrip numbers laws b hb] at decoded
    exact (Normalize.equivalent_iff_normalize_eq _ _).mpr (Option.some.inj decoded)
  · intro same
    exact congrArg (renderBytes numbers) (Normalize.equivalent_normalize same)

theorem canonicalBytes_to_tokens (numbers : NumberCodec) (laws : numbers.LawsOn admitted)
    (value : Value) (included : AllNumbers admitted (Normalize.normalize value)) :
    (readCanonicalBytes numbers (canonicalBytes numbers value)).map Json.encode =
      some (Normalize.canonicalTokens value) := by
  rw [canonicalBytes_roundtrip numbers laws _ included]
  rfl

theorem noNumbers_canonicalBytes_roundtrip (numbers : NumberCodec) (value : Value)
    (included : NoNumbers (Normalize.normalize value)) :
    readCanonicalBytes numbers (canonicalBytes numbers value) = some (Normalize.normalize value) := by
  rw [canonicalBytes, readCanonicalBytes, noNumbers_bytes_roundtrip numbers _ included]
  simp only [Option.map_some, Normalize.normalize_idempotent]

theorem noNumbers_canonicalBytes_eq_iff (numbers : NumberCodec) (a b : Value)
    (ha : NoNumbers (Normalize.normalize a)) (hb : NoNumbers (Normalize.normalize b)) :
    canonicalBytes numbers a = canonicalBytes numbers b ↔ Normalize.Equivalent a b := by
  constructor
  · intro same
    have decoded := congrArg (readCanonicalBytes numbers) same
    rw [noNumbers_canonicalBytes_roundtrip numbers a ha, noNumbers_canonicalBytes_roundtrip numbers b hb] at decoded
    exact (Normalize.equivalent_iff_normalize_eq _ _).mpr (Option.some.inj decoded)
  · intro same
    exact congrArg (renderBytes numbers) (Normalize.equivalent_normalize same)

theorem noNumberFields_lookup (fields : Fields) (included : AllFields (fun _ => False) fields)
    (key : String) :
    match Normalize.lookupFields fields key with
    | none => True
    | some value => NoNumbers value := by
  cases fields with
  | nil => trivial
  | cons k v rest =>
    rw [Normalize.lookupFields_cons]
    have ih := noNumberFields_lookup rest included.2 key
    cases h : Normalize.lookupFields rest key with
    | none =>
      by_cases hk : key = k
      · simpa only [NoNumbers, hk, ite_true, Option.or] using included.1
      · simp only [hk, ite_false, Option.or]
    | some value => simpa only [h, Option.or] using ih

theorem noNumberFields_ofList (entries : OwnMap.Entries Value)
    (included : ∀ entry ∈ entries, NoNumbers entry.2) :
    AllFields (fun _ => False) (Normalize.fieldsOfList entries) := by
  induction entries with
  | nil => trivial
  | cons entry rest ih =>
    exact ⟨included entry (by simp), ih (fun entry h => included entry (by simp [h]))⟩

theorem noNumberFields_canonical (fields : Fields) (included : AllFields (fun _ => False) fields) :
    AllFields (fun _ => False) (Normalize.canonicalFields fields) := by
  unfold Normalize.canonicalFields Normalize.canonicalEntries
  apply noNumberFields_ofList
  intro entry member
  obtain ⟨key, _, rfl⟩ := List.mem_map.mp member
  change NoNumbers ((Normalize.lookupFields fields key).getD .null)
  have h := noNumberFields_lookup fields included key
  cases found : Normalize.lookupFields fields key with
  | none => trivial
  | some value => simpa only [found, Option.getD_some] using h

mutual
  theorem noNumbers_normalize (value : Value) (included : NoNumbers value) :
      NoNumbers (Normalize.normalize value) := by
    cases value with
    | null => trivial
    | bool _ => trivial
    | number _ => exact included.elim
    | text _ => trivial
    | array xs => exact noNumberItems_normalize xs included
    | object fs => exact noNumberFields_canonical _ (noNumberFields_normalize fs included)
  theorem noNumberItems_normalize (items : Items) (included : AllItems (fun _ => False) items) :
      AllItems (fun _ => False) (Normalize.normalizeItems items) := by
    cases items with
    | nil => trivial
    | cons v rest => exact ⟨noNumbers_normalize v included.1, noNumberItems_normalize rest included.2⟩
  theorem noNumberFields_normalize (fields : Fields) (included : AllFields (fun _ => False) fields) :
      AllFields (fun _ => False) (Normalize.normalizeFieldValues fields) := by
    cases fields with
    | nil => trivial
    | cons _ v rest => exact ⟨noNumbers_normalize v included.1, noNumberFields_normalize rest included.2⟩
end

theorem numberFree_canonical_roundtrip (numbers : NumberCodec) (value : Value)
    (included : NoNumbers value) :
    readCanonicalBytes numbers (canonicalBytes numbers value) = some (Normalize.normalize value) :=
  noNumbers_canonicalBytes_roundtrip numbers value (noNumbers_normalize value included)

theorem numberFree_canonical_eq_iff (numbers : NumberCodec) (a b : Value)
    (ha : NoNumbers a) (hb : NoNumbers b) :
    canonicalBytes numbers a = canonicalBytes numbers b ↔ Normalize.Equivalent a b :=
  noNumbers_canonicalBytes_eq_iff numbers a b (noNumbers_normalize a ha) (noNumbers_normalize b hb)


theorem nested_number_free_canonical_roundtrip :
    readCanonicalBytes rejectNumbers (canonicalBytes rejectNumbers nestedStringTree) =
      some (Normalize.normalize nestedStringTree) :=
  numberFree_canonical_roundtrip _ _ nestedStringTree_no_numbers

end Algal.Core.JsonLayout
