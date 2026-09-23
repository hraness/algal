import Init
import Init.Data.String.Lemmas.Basic

/-!
Actual quoted-string UTF-8 bytes for the portable Unicode scalar domain. The
encoder uses the seven ECMAScript short escapes, lowercase hexadecimal escapes
for remaining ASCII controls, and direct UTF-8 for other scalar values. No NFC
normalization occurs. The decoder recognizes this emitted fragment profile; it
is not a complete parser for every legal JSON Unicode/solidus escape spelling.

The byte roundtrip/injectivity and suffix framing are proved for these authored
functions. Correspondence to Bun JSON.stringify and native serde_json remains
reviewed source linkage and sampled vectors, not an implementation refinement.
Lean's actual UTF-8 representation and pinned standard-library proofs are used.
-/
namespace Algal.Core.JsonString

def escapeChar (c : Char) : List Char :=
  if c = '"' then ['\\', '"']
  else if c = '\\' then ['\\', '\\']
  else if c = '\x08' then ['\\', 'b']
  else if c = '\t' then ['\\', 't']
  else if c = '\n' then ['\\', 'n']
  else if c = '\x0c' then ['\\', 'f']
  else if c = '\r' then ['\\', 'r']
  else if c.toNat < 32 then ['\\', 'u', '0', '0', Nat.digitChar (c.toNat / 16), Nat.digitChar (c.toNat % 16)]
  else [c]

def hexDigit? (c : Char) : Option Nat :=
  if 48 ≤ c.toNat ∧ c.toNat ≤ 57 then some (c.toNat - 48)
  else if 97 ≤ c.toNat ∧ c.toNat ≤ 102 then some (c.toNat - 87)
  else none

def decodeEscape : List Char → Option (Char × List Char)
  | '"' :: rest => some ('"', rest)
  | '\\' :: rest => some ('\\', rest)
  | 'b' :: rest => some ('\x08', rest)
  | 't' :: rest => some ('\t', rest)
  | 'n' :: rest => some ('\n', rest)
  | 'f' :: rest => some ('\x0c', rest)
  | 'r' :: rest => some ('\r', rest)
  | 'u' :: '0' :: '0' :: high :: low :: rest => do
      let high ← hexDigit? high
      let low ← hexDigit? low
      let n := high * 16 + low
      if n < 32 then some (Char.ofNat n, rest) else none
  | _ => none

def readUnit : List Char → Option (Char × List Char)
  | '\\' :: rest => decodeEscape rest
  | c :: rest => if c = '"' ∨ c.toNat < 32 then none else some (c, rest)
  | [] => none

theorem hexControl_roundtrip (n : Fin 32) (rest : List Char) :
    decodeEscape (['u', '0', '0', Nat.digitChar (n.val / 16), Nat.digitChar (n.val % 16)] ++ rest) =
      some (Char.ofNat n.val, rest) := by
  have h : ∀ n : Fin 32,
      hexDigit? (Nat.digitChar (n.val / 16)) = some (n.val / 16) ∧
      hexDigit? (Nat.digitChar (n.val % 16)) = some (n.val % 16) := by decide
  have hv : n.val / 16 * 16 + n.val % 16 = n.val := by omega
  simp [decodeEscape, (h n).1, (h n).2, hv, n.isLt]

theorem readUnit_escapeChar (c : Char) (rest : List Char) :
    readUnit (escapeChar c ++ rest) = some (c, rest) := by
  unfold escapeChar
  split
  next h => subst c; rfl
  split
  next h => subst c; rfl
  split
  next h => subst c; rfl
  split
  next h => subst c; rfl
  split
  next h => subst c; rfl
  split
  next h => subst c; rfl
  split
  next h => subst c; rfl
  split
  next hc =>
    change decodeEscape (['u', '0', '0', Nat.digitChar (c.toNat / 16), Nat.digitChar (c.toNat % 16)] ++ rest) = _
    simpa using hexControl_roundtrip ⟨c.toNat, hc⟩ rest
  next hc => simp_all [readUnit]

def escapedBody (chars : List Char) : List Char := chars.flatMap escapeChar

def quoteChars (value : String) : List Char := '"' :: escapedBody value.toList ++ ['"']

def quote (value : String) : String := String.ofList (quoteChars value)

def quoteBytes (value : String) : ByteArray := (quote value).toUTF8

def scan : Nat → List Char → Option (List Char × List Char)
  | 0, _ => none
  | fuel + 1, input =>
    if input.head? = some '"' then some ([], input.tail)
    else do
      let (char, rest) ← readUnit input
      let (chars, suffix) ← scan fuel rest
      pure (char :: chars, suffix)

theorem escapeChar_head (c : Char) (rest : List Char) :
    (escapeChar c ++ rest).head? ≠ some '"' := by
  unfold escapeChar
  split
  · simp
  split
  · simp
  split
  · simp
  split
  · simp
  split
  · simp
  split
  · simp
  split
  · simp
  split
  · simp
  · simp_all

theorem scan_escapeChar (c : Char) (rest : List Char) (fuel : Nat) :
    scan (fuel + 1) (escapeChar c ++ rest) =
      (scan fuel rest).map (fun result => (c :: result.1, result.2)) := by
  simp only [scan, escapeChar_head c rest, ite_false, readUnit_escapeChar]
  dsimp
  cases scan fuel rest <;> rfl

theorem scan_escapedBody (chars rest : List Char) (fuel : Nat) (enough : chars.length < fuel) :
    scan fuel (escapedBody chars ++ '"' :: rest) = some (chars, rest) := by
  induction chars generalizing fuel with
  | nil =>
    cases fuel with
    | zero => simp at enough
    | succ fuel => rfl
  | cons c chars ih =>
    cases fuel with
    | zero => simp at enough
    | succ fuel =>
      have enough' : chars.length < fuel := by simp only [List.length_cons] at enough; omega
      simp only [escapedBody, List.flatMap_cons, List.append_assoc]
      rw [scan_escapeChar]
      change (scan fuel (escapedBody chars ++ '"' :: rest)).map _ = _
      rw [ih fuel enough']
      rfl

theorem escapeChar_length (c : Char) : 0 < (escapeChar c).length := by
  unfold escapeChar
  split
  · simp
  split
  · simp
  split
  · simp
  split
  · simp
  split
  · simp
  split
  · simp
  split
  · simp
  split
  · simp
  · simp

theorem escapedBody_length (chars : List Char) : chars.length ≤ (escapedBody chars).length := by
  induction chars with
  | nil => simp [escapedBody]
  | cons c rest ih =>
    simp only [escapedBody, List.flatMap_cons, List.length_append, List.length_cons]
    have hc := escapeChar_length c
    change rest.length ≤ (rest.flatMap escapeChar).length at ih
    omega

def readQuoted : List Char → Option (String × List Char)
  | '"' :: rest => (scan rest.length rest).map (fun result => (String.ofList result.1, result.2))
  | _ => none

theorem readQuoted_quote_suffix (value : String) (rest : List Char) :
    readQuoted (quoteChars value ++ rest) = some (value, rest) := by
  unfold quoteChars
  simp only [List.cons_append, List.append_assoc, readQuoted]
  rw [scan_escapedBody]
  · simp
  · simp only [List.length_append, List.length_cons]
    have h := escapedBody_length value.toList
    omega

def readBytes (bytes : ByteArray) : Option (String × List Char) := do
  let text ← String.fromUTF8? bytes
  readQuoted text.toList

def decodeBytes (bytes : ByteArray) : Option String := do
  let (value, rest) ← readBytes bytes
  if rest = [] then some value else none

theorem fromUTF8_toUTF8 (value : String) : String.fromUTF8? value.toUTF8 = some value := by
  cases value with
  | ofByteArray bytes valid => simp [String.fromUTF8?, String.fromUTF8, String.toUTF8, valid]

theorem quoteBytes_utf8 (value : String) : String.fromUTF8? (quoteBytes value) = some (quote value) :=
  fromUTF8_toUTF8 _

theorem quotedBytes_roundtrip (value : String) : readBytes (quoteBytes value) = some (value, []) := by
  simp only [readBytes, quoteBytes_utf8, quote]
  simpa using readQuoted_quote_suffix value []

theorem quotedBytes_injective (a b : String) (h : quoteBytes a = quoteBytes b) : a = b := by
  have same := congrArg readBytes h
  simpa only [quotedBytes_roundtrip, Option.some.injEq, Prod.mk.injEq, and_true] using same

theorem decodeBytes_roundtrip (value : String) : decodeBytes (quoteBytes value) = some value := by
  simp [decodeBytes, quotedBytes_roundtrip]

theorem standard_controls_witness :
    quote "\x08\t\n\x0c\r\"\\\x00\x1f" = "\"\\b\\t\\n\\f\\r\\\"\\\\\\u0000\\u001f\"" := by decide

theorem supplementary_utf8_witness : (quoteBytes "😀").data.toList = [34, 240, 159, 152, 128, 34] := by decide

theorem malformed_utf8_rejected : decodeBytes ⟨#[34, 255, 34]⟩ = none := by decide
theorem overlong_utf8_rejected : decodeBytes ⟨#[34, 192, 128, 34]⟩ = none := by decide
theorem surrogate_utf8_rejected : decodeBytes ⟨#[34, 237, 160, 128, 34]⟩ = none := by decide
theorem leading_bom_rejected : decodeBytes ⟨#[239, 187, 191, 34, 34]⟩ = none := by decide
theorem embedded_bom_retained : decodeBytes (quoteBytes "\uFEFF") = some "\uFEFF" := decodeBytes_roundtrip _
theorem literal_control_rejected : decodeBytes ⟨#[34, 10, 34]⟩ = none := by decide
theorem escaped_quote_is_content : decodeBytes ⟨#[34, 92, 34, 34]⟩ = some "\"" := by decide
theorem trailing_content_rejected : decodeBytes ⟨#[34, 34, 120]⟩ = none := by decide
theorem missing_end_quote_rejected : decodeBytes ⟨#[34, 120]⟩ = none := by decide
theorem invalid_escape_rejected : decodeBytes ⟨#[34, 92, 120, 34]⟩ = none := by decide


end Algal.Core.JsonString
