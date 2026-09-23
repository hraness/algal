import Algal.Core.BinaryValue
import Init.Data.Nat.ToString
import Init.Data.Rat.Lemmas
import Init.Omega

/-!
Concrete ASCII JSON numeral syntax with exact rational decimal values. `readWhole`
checks a complete numeral token; `readPrefix` can leave an arbitrary suffix and
is not a complete JSON document admission boundary. Spelling is retained, so
syntax injectivity does not assert rational-value injectivity. Structural
termination does not establish runtime resource bounds; digit/exponent admission,
binary64 conversion, rounding, shortestness, and production refinement remain open.
-/
namespace Algal.Core.DecimalSyntax

abbrev Digit := Fin 10
def digitChar (d : Digit) : Char := Nat.digitChar d.val

def readDigit (c : Char) : Option Digit :=
  if h : 48 ≤ c.toNat ∧ c.toNat ≤ 57 then some ⟨c.toNat - 48, by omega⟩ else none

theorem readDigit_char (d : Digit) : readDigit (digitChar d) = some d := by
  have h := d.isLt
  have hc : (digitChar d).toNat = d.val + 48 := by simpa [digitChar, Nat.add_comm] using Nat.toNat_digitChar_of_lt_ten h
  unfold readDigit
  simp only [hc]
  split
  · congr 1
  · omega

theorem char_readDigit (c : Char) (d : Digit) (h : readDigit c = some d) : digitChar d = c := by
  unfold readDigit at h
  split at h
  next hc =>
    cases h
    apply Char.toNat_inj.mp
    unfold digitChar
    rw [Nat.toNat_digitChar_of_lt_ten]
    · change 48 + (c.toNat - 48) = c.toNat
      omega
    · omega
  · contradiction

def takeDigits : List Char → List Digit × List Char
  | [] => ([], [])
  | c :: cs => match readDigit c with
    | none => ([], c :: cs)
    | some d => let (ds, rest) := takeDigits cs; (d :: ds, rest)

def Stopped : List Char → Prop
  | [] => True
  | c :: _ => readDigit c = none

theorem takeDigits_stopped (rest : List Char) (h : Stopped rest) : takeDigits rest = ([], rest) := by
  cases rest with
  | nil => rfl
  | cons c cs => change readDigit c = none at h; simp only [takeDigits, h]

theorem takeDigits_render (digits : List Digit) (rest : List Char) (h : Stopped rest) :
    takeDigits (digits.map digitChar ++ rest) = (digits, rest) := by
  induction digits with
  | nil => exact takeDigits_stopped rest h
  | cons d ds ih => simp [takeDigits, readDigit_char, ih]

theorem takeDigits_reconstruct (input : List Char) :
    (takeDigits input).1.map digitChar ++ (takeDigits input).2 = input := by
  induction input with
  | nil => rfl
  | cons c cs ih =>
    cases h : readDigit c with
    | none => simp [takeDigits, h]
    | some d =>
      simp [takeDigits, h, char_readDigit c d h, ih]

theorem takeDigits_remainder_stopped (input : List Char) : Stopped (takeDigits input).2 := by
  induction input with
  | nil => trivial
  | cons c cs ih =>
    cases h : readDigit c with
    | none => simp [takeDigits, Stopped, h]
    | some d => simpa [takeDigits, h] using ih

structure Digits where
  first : Digit
  rest : List Digit
  deriving DecidableEq

def Digits.list (ds : Digits) : List Digit := ds.first :: ds.rest
def Digits.chars (ds : Digits) : List Char := ds.list.map digitChar

def readDigits (input : List Char) : Option (Digits × List Char) :=
  let (ds, rest) := takeDigits input
  match ds with
  | [] => none
  | d :: ds => some (⟨d, ds⟩, rest)

theorem readDigits_render (ds : Digits) (rest : List Char) (h : Stopped rest) :
    readDigits (ds.chars ++ rest) = some (ds, rest) := by
  unfold readDigits Digits.chars
  rw [takeDigits_render _ _ h]
  cases ds
  rfl

structure IntegerPart where
  digits : Digits
  noLeadingZero : digits.first.val = 0 → digits.rest = []
  deriving DecidableEq

def readInteger (input : List Char) : Option (IntegerPart × List Char) := do
  let (ds, rest) ← readDigits input
  if h : ds.first.val = 0 → ds.rest = [] then some (⟨ds, h⟩, rest) else none

theorem readInteger_render (part : IntegerPart) (rest : List Char) (h : Stopped rest) :
    readInteger (part.digits.chars ++ rest) = some (part, rest) := by
  unfold readInteger
  rw [readDigits_render _ _ h]
  change (if h : part.digits.first.val = 0 → part.digits.rest = [] then
    some (⟨part.digits, h⟩, rest) else none) = some (part, rest)
  rw [dite_eq_left part.noLeadingZero]

inductive ExponentSign where
  | absent | plus | minus
  deriving DecidableEq

def ExponentSign.chars : ExponentSign → List Char
  | .absent => []
  | .plus => ['+']
  | .minus => ['-']

structure ExponentPart where
  upper : Bool
  sign : ExponentSign
  digits : Digits
  deriving DecidableEq

def ExponentPart.chars (part : ExponentPart) : List Char :=
  (if part.upper then 'E' else 'e') :: part.sign.chars ++ part.digits.chars

def readExponentSign : List Char → ExponentSign × List Char
  | '+' :: rest => (.plus, rest)
  | '-' :: rest => (.minus, rest)
  | rest => (.absent, rest)

def readExponentTail (upper : Bool) (input : List Char) : Option (ExponentPart × List Char) := do
  let (s, afterSign) := readExponentSign input
  let (ds, rest) ← readDigits afterSign
  some (⟨upper, s, ds⟩, rest)

def readExponent : List Char → Option (Option ExponentPart × List Char)
  | 'e' :: rest => do
    let (part, rest) ← readExponentTail false rest
    some (some part, rest)
  | 'E' :: rest => do
    let (part, rest) ← readExponentTail true rest
    some (some part, rest)
  | rest => some (none, rest)

def fractionChars : Option Digits → List Char
  | none => []
  | some ds => '.' :: ds.chars

def exponentChars : Option ExponentPart → List Char
  | none => []
  | some part => part.chars

def readFraction : List Char → Option (Option Digits × List Char)
  | '.' :: rest => do
    let (ds, rest) ← readDigits rest
    some (some ds, rest)
  | rest => some (none, rest)

structure Numeral where
  negative : Bool
  integer : IntegerPart
  fraction : Option Digits
  exponent : Option ExponentPart
  deriving DecidableEq

def renderUnsigned (n : Numeral) : List Char :=
  n.integer.digits.chars ++ fractionChars n.fraction ++ exponentChars n.exponent

def render (n : Numeral) : List Char :=
  (if n.negative then ['-'] else []) ++ renderUnsigned n

def readUnsigned (negative : Bool) (input : List Char) : Option (Numeral × List Char) := do
  let (integer, rest) ← readInteger input
  let (fraction, rest) ← readFraction rest
  let (exponent, rest) ← readExponent rest
  some (⟨negative, integer, fraction, exponent⟩, rest)

def readPrefix : List Char → Option (Numeral × List Char)
  | '-' :: rest => readUnsigned true rest
  | rest => readUnsigned false rest

def readWhole (input : List Char) : Option Numeral := do
  let (number, rest) ← readPrefix input
  if rest = [] then some number else none


def Terminal : List Char → Prop
  | [] => True
  | c :: _ => c = ',' ∨ c = ']' ∨ c = '}'

theorem terminal_stopped (rest : List Char) (h : Terminal rest) : Stopped rest := by
  cases rest with
  | nil => trivial
  | cons c cs =>
    rcases h with h | h | h <;> subst c <;> rfl

theorem digit_ne_marker (d : Digit) (marker : Char) (h : readDigit marker = none) :
    digitChar d ≠ marker := by
  intro equal
  have hd := readDigit_char d
  rw [equal, h] at hd
  contradiction

theorem readExponentSign_digit (d : Digit) (rest : List Char) :
    readExponentSign (digitChar d :: rest) = (.absent, digitChar d :: rest) := by
  have hp : digitChar d ≠ '+' := digit_ne_marker d '+' (by rfl)
  have hm : digitChar d ≠ '-' := digit_ne_marker d '-' (by rfl)
  simp [readExponentSign, hp, hm]

theorem readExponentSign_render (s : ExponentSign) (ds : Digits) (rest : List Char) :
    readExponentSign (s.chars ++ ds.chars ++ rest) = (s, ds.chars ++ rest) := by
  cases s with
  | absent => exact readExponentSign_digit _ _
  | plus => rfl
  | minus => rfl

theorem readExponentTail_render (part : ExponentPart) (rest : List Char) (h : Stopped rest) :
    readExponentTail part.upper (part.sign.chars ++ part.digits.chars ++ rest) = some (part, rest) := by
  unfold readExponentTail
  rw [readExponentSign_render]
  dsimp only
  rw [readDigits_render _ _ h]
  rfl

theorem readExponent_terminal (rest : List Char) (h : Terminal rest) :
    readExponent rest = some (none, rest) := by
  cases rest with
  | nil => rfl
  | cons c cs => rcases h with h | h | h <;> subst c <;> rfl

theorem readExponent_render (part : Option ExponentPart) (rest : List Char) (h : Terminal rest) :
    readExponent (exponentChars part ++ rest) = some (part, rest) := by
  cases part with
  | none => exact readExponent_terminal rest h
  | some part =>
    cases part with
    | mk upper sign ds =>
      cases upper with
      | false =>
        have ht := readExponentTail_render ⟨false, sign, ds⟩ rest (terminal_stopped rest h)
        simp only [List.append_assoc] at ht
        simp [exponentChars, ExponentPart.chars, readExponent, ht]
      | true =>
        have ht := readExponentTail_render ⟨true, sign, ds⟩ rest (terminal_stopped rest h)
        simp only [List.append_assoc] at ht
        simp [exponentChars, ExponentPart.chars, readExponent, ht]

theorem exponentChars_stopped (part : Option ExponentPart) (rest : List Char) (h : Terminal rest) :
    Stopped (exponentChars part ++ rest) := by
  cases part with
  | none => exact terminal_stopped rest h
  | some part => cases hp : part.upper <;> simp [exponentChars, ExponentPart.chars, hp, Stopped, readDigit]

theorem readFraction_exponent (part : Option ExponentPart) (rest : List Char) (h : Terminal rest) :
    readFraction (exponentChars part ++ rest) = some (none, exponentChars part ++ rest) := by
  cases part with
  | none =>
    cases rest with
    | nil => rfl
    | cons c cs => rcases h with h | h | h <;> subst c <;> rfl
  | some part => cases hp : part.upper <;> simp [exponentChars, ExponentPart.chars, hp, readFraction]

theorem readFraction_render (fraction : Option Digits) (exponent : Option ExponentPart)
    (rest : List Char) (h : Terminal rest) :
    readFraction (fractionChars fraction ++ exponentChars exponent ++ rest) =
      some (fraction, exponentChars exponent ++ rest) := by
  cases fraction with
  | none => exact readFraction_exponent exponent rest h
  | some ds =>
    simp only [fractionChars, List.cons_append, List.append_assoc, readFraction]
    rw [readDigits_render _ _ (exponentChars_stopped exponent rest h)]
    rfl

theorem fractionChars_stopped (fraction : Option Digits) (exponent : Option ExponentPart)
    (rest : List Char) (h : Terminal rest) :
    Stopped (fractionChars fraction ++ exponentChars exponent ++ rest) := by
  cases fraction with
  | none => exact exponentChars_stopped exponent rest h
  | some ds => rfl

theorem readUnsigned_render (n : Numeral) (rest : List Char) (h : Terminal rest) :
    readUnsigned n.negative (renderUnsigned n ++ rest) = some (n, rest) := by
  have intRead := readInteger_render n.integer _ (fractionChars_stopped n.fraction n.exponent rest h)
  have fractionRead := readFraction_render n.fraction n.exponent rest h
  simp only [List.append_assoc] at intRead fractionRead
  unfold readUnsigned renderUnsigned
  simp only [List.append_assoc]
  rw [intRead]
  simp only [bind, Option.bind]
  rw [fractionRead]
  dsimp only
  rw [readExponent_render _ rest h]

theorem readPrefix_unsigned (n : Numeral) (rest : List Char) :
    readPrefix (renderUnsigned n ++ rest) = readUnsigned false (renderUnsigned n ++ rest) := by
  have hd : digitChar n.integer.digits.first ≠ '-' := digit_ne_marker _ '-' (by rfl)
  simp [readPrefix, renderUnsigned, Digits.chars, Digits.list, hd]

theorem readPrefix_render (n : Numeral) (rest : List Char) (h : Terminal rest) :
    readPrefix (render n ++ rest) = some (n, rest) := by
  unfold render
  cases hn : n.negative with
  | false =>
    simp only [Bool.false_eq_true, ↓reduceIte, List.nil_append]
    rw [readPrefix_unsigned, ← hn]
    exact readUnsigned_render n rest h
  | true =>
    simp only [↓reduceIte, List.cons_append, List.nil_append, readPrefix]
    rw [← hn]
    exact readUnsigned_render n rest h

theorem readWhole_render (n : Numeral) : readWhole (render n) = some n := by
  have h := readPrefix_render n [] (by trivial)
  simp only [List.append_nil] at h
  simp [readWhole, h]

theorem render_injective (a b : Numeral) (h : render a = render b) : a = b := by
  have parsed := congrArg readWhole h
  rw [readWhole_render, readWhole_render] at parsed
  exact Option.some.inj parsed



theorem readDigits_sound (input : List Char) (ds : Digits) (rest : List Char)
    (h : readDigits input = some (ds, rest)) : ds.chars ++ rest = input := by
  have reconstruction := takeDigits_reconstruct input
  unfold readDigits at h
  cases ht : takeDigits input with
  | mk digits suffix =>
    rw [ht] at h reconstruction
    cases digits with
    | nil => contradiction
    | cons d tail =>
      cases h
      exact reconstruction

theorem readInteger_sound (input : List Char) (part : IntegerPart) (rest : List Char)
    (h : readInteger input = some (part, rest)) : part.digits.chars ++ rest = input := by
  unfold readInteger at h
  obtain ⟨⟨ds, suffix⟩, hd, h⟩ := Option.bind_eq_some_iff.mp h
  dsimp only at h
  split at h
  · cases h
    exact readDigits_sound input ds rest hd
  · contradiction

theorem readExponentSign_sound (input : List Char) :
    (readExponentSign input).1.chars ++ (readExponentSign input).2 = input := by
  unfold readExponentSign
  split <;> rfl

theorem readExponentTail_sound (upper : Bool) (input : List Char) (part : ExponentPart)
    (rest : List Char) (h : readExponentTail upper input = some (part, rest)) :
    part.upper = upper ∧ part.sign.chars ++ part.digits.chars ++ rest = input := by
  have hs := readExponentSign_sound input
  unfold readExponentTail at h
  cases hp : readExponentSign input with
  | mk sign suffix =>
    rw [hp] at h hs
    dsimp only at h hs
    obtain ⟨⟨ds, tail⟩, hd, h⟩ := Option.bind_eq_some_iff.mp h
    cases h
    constructor
    · rfl
    · rw [List.append_assoc, readDigits_sound suffix ds _ hd]
      exact hs

theorem readExponent_sound (input : List Char) (part : Option ExponentPart) (rest : List Char)
    (h : readExponent input = some (part, rest)) : exponentChars part ++ rest = input := by
  unfold readExponent at h
  split at h
  next suffix =>
    obtain ⟨⟨e, tail⟩, he, h⟩ := Option.bind_eq_some_iff.mp h
    cases h
    obtain ⟨hu, hs⟩ := readExponentTail_sound false suffix e rest he
    simp only [exponentChars, ExponentPart.chars, hu, Bool.false_eq_true, ↓reduceIte, List.cons_append]
    rw [hs]
  next suffix =>
    obtain ⟨⟨e, tail⟩, he, h⟩ := Option.bind_eq_some_iff.mp h
    cases h
    obtain ⟨hu, hs⟩ := readExponentTail_sound true suffix e rest he
    simp only [exponentChars, ExponentPart.chars, hu, ↓reduceIte, List.cons_append]
    rw [hs]
  next suffix _ _ =>
    cases h
    rfl

theorem readFraction_sound (input : List Char) (part : Option Digits) (rest : List Char)
    (h : readFraction input = some (part, rest)) : fractionChars part ++ rest = input := by
  unfold readFraction at h
  split at h
  next suffix =>
    obtain ⟨⟨ds, tail⟩, hd, h⟩ := Option.bind_eq_some_iff.mp h
    cases h
    simp only [fractionChars, List.cons_append]
    rw [readDigits_sound suffix ds _ hd]
  next suffix _ =>
    cases h
    rfl

theorem readUnsigned_sound (negative : Bool) (input : List Char) (n : Numeral) (rest : List Char)
    (h : readUnsigned negative input = some (n, rest)) :
    n.negative = negative ∧ renderUnsigned n ++ rest = input := by
  unfold readUnsigned at h
  obtain ⟨⟨integer, tail₁⟩, hi, h⟩ := Option.bind_eq_some_iff.mp h
  obtain ⟨⟨fraction, tail₂⟩, hf, h⟩ := Option.bind_eq_some_iff.mp h
  obtain ⟨⟨exponent, tail₃⟩, he, h⟩ := Option.bind_eq_some_iff.mp h
  cases h
  constructor
  · rfl
  · simp only [renderUnsigned, List.append_assoc]
    rw [readExponent_sound tail₂ exponent rest he,
      readFraction_sound tail₁ fraction tail₂ hf,
      readInteger_sound input integer tail₁ hi]

theorem readPrefix_sound (input : List Char) (n : Numeral) (rest : List Char)
    (h : readPrefix input = some (n, rest)) : render n ++ rest = input := by
  unfold readPrefix at h
  split at h
  next suffix =>
    obtain ⟨hn, hs⟩ := readUnsigned_sound true suffix n rest h
    simp only [render, hn, ↓reduceIte, List.cons_append, List.nil_append]
    rw [hs]
  next suffix _ =>
    obtain ⟨hn, hs⟩ := readUnsigned_sound false input n rest h
    simpa only [render, hn, Bool.false_eq_true, ↓reduceIte, List.nil_append] using hs

theorem readWhole_sound (input : List Char) (n : Numeral) (h : readWhole input = some n) :
    render n = input := by
  unfold readWhole at h
  obtain ⟨⟨parsed, rest⟩, hp, h⟩ := Option.bind_eq_some_iff.mp h
  dsimp only at h
  split at h
  next empty =>
    cases h
    have hs := readPrefix_sound input n rest hp
    simpa [empty] using hs
  · contradiction

theorem readWhole_iff (input : List Char) (n : Numeral) :
    readWhole input = some n ↔ render n = input := by
  constructor
  · exact readWhole_sound input n
  · intro h
    rw [← h]
    exact readWhole_render n


def digitsValue : List Digit → Nat
  | [] => 0
  | d :: ds => d.val * 10 ^ ds.length + digitsValue ds

def fractionDigits (n : Numeral) : List Digit := n.fraction.map Digits.list |>.getD []
def coefficient (n : Numeral) : Nat := digitsValue (n.integer.digits.list ++ fractionDigits n)
def exponentValue : Option ExponentPart → Int
  | none => 0
  | some e =>
    match e.sign with
    | .minus => -(digitsValue e.digits.list : Int)
    | _ => digitsValue e.digits.list

def power (n : Numeral) : Int := exponentValue n.exponent - (fractionDigits n).length
def signedCoefficient (n : Numeral) : Int :=
  if n.negative then -(coefficient n : Int) else coefficient n

def denote (n : Numeral) : Rat := (signedCoefficient n : Rat) * (10 : Rat) ^ power n

theorem digitsValue_append (a b : List Digit) :
    digitsValue (a ++ b) = digitsValue a * 10 ^ b.length + digitsValue b := by
  induction a with
  | nil => simp [digitsValue]
  | cons d ds ih =>
    simp only [List.cons_append, digitsValue, List.length_append, Nat.pow_add, ih]
    simp [Nat.add_mul, Nat.mul_assoc, Nat.add_assoc]


theorem coefficient_decomposition (n : Numeral) :
    coefficient n = digitsValue n.integer.digits.list * 10 ^ (fractionDigits n).length +
      digitsValue (fractionDigits n) := digitsValue_append _ _

theorem digitsValue_bound (ds : List Digit) : digitsValue ds < 10 ^ ds.length := by
  induction ds with
  | nil => simp [digitsValue]
  | cons d ds ih =>
    have hd := d.isLt
    simp only [digitsValue, List.length_cons, Nat.pow_succ]
    have hmul := Nat.mul_le_mul_right (10 ^ ds.length) (show d.val ≤ 9 by omega)
    omega

theorem scale_rational (c e : Int) :
    (c : Rat) * (10 : Rat) ^ e = mkRat (c * (10 : Int) ^ e.toNat) (10 ^ (-e).toNat) := by
  cases e with
  | ofNat n =>
    simp [Rat.zpow_natCast, Rat.mkRat_one, Rat.intCast_mul, Rat.intCast_pow]
  | negSucc n =>
    change (c : Rat) * ((10 : Rat) ^ (n + 1))⁻¹ =
      mkRat (c * (10 : Int) ^ (Int.negSucc n).toNat) (10 ^ (-(Int.negSucc n)).toNat)
    simp [Rat.mkRat_eq_div, Rat.div_def, Rat.natCast_pow]

theorem denote_rational (n : Numeral) :
    denote n = mkRat (signedCoefficient n * (10 : Int) ^ (power n).toNat)
      (10 ^ (-(power n)).toNat) := scale_rational _ _

theorem denominator_positive (n : Numeral) : 0 < 10 ^ (-(power n)).toNat :=
  Nat.pow_pos (by decide)

theorem denote_roundtrip (n : Numeral) :
    (readWhole (render n)).map denote = some (denote n) := by rw [readWhole_render]; rfl

def zeroDigits : Digits := ⟨⟨0, by decide⟩, []⟩
def oneDigits : Digits := ⟨⟨1, by decide⟩, []⟩
def zeroInteger : IntegerPart := ⟨zeroDigits, by intro; rfl⟩
def tenth : Numeral := ⟨false, zeroInteger, some oneDigits, none⟩
def negativeZero : Numeral := ⟨true, zeroInteger, none, none⟩
def positiveZero : Numeral := ⟨false, zeroInteger, none, none⟩

theorem tenth_lexeme : render tenth = ['0', '.', '1'] := rfl
theorem tenth_parse : readWhole ['0', '.', '1'] = some tenth := readWhole_render tenth
theorem tenth_exact_value : denote tenth = mkRat 1 10 := by rw [denote_rational]; decide

theorem signed_zeros_same_rational : denote negativeZero = denote positiveZero := by
  rw [denote_rational, denote_rational]
  rfl
theorem signed_zeros_distinct_syntax : render negativeZero ≠ render positiveZero := by decide

theorem decimal_tenth_not_exact_binary64_tenth :
    denote tenth ≠ (Algal.Core.BinaryValue.exact 0x3fb999999999999a).toRat := by
  rw [tenth_exact_value]
  decide

theorem reject_empty : readWhole [] = none := rfl
theorem reject_leading_plus : readWhole ['+', '1'] = none := rfl
theorem reject_leading_zero : readWhole ['0', '1'] = none := rfl
theorem reject_negative_leading_zero : readWhole ['-', '0', '1'] = none := rfl
theorem reject_empty_fraction : readWhole ['1', '.'] = none := rfl
theorem reject_empty_exponent : readWhole ['1', 'e'] = none := rfl
theorem reject_empty_signed_exponent : readWhole ['1', 'e', '+'] = none := rfl
theorem reject_nan : readWhole ['N', 'a', 'N'] = none := rfl
theorem reject_infinity : readWhole ['I', 'n', 'f', 'i', 'n', 'i', 't', 'y'] = none := rfl
theorem reject_hexadecimal : readWhole ['0', 'x', '1'] = none := rfl
theorem reject_fullwidth_digits : readWhole ['１', '２'] = none := rfl
theorem reject_trailing_junk : readWhole ['1', 't', 'r', 'u', 'e'] = none := rfl

/- Numeral grammar is deliberately independent from finite-binary64 admission. -/
theorem enormous_exponent_syntax_admitted :
    (readWhole ['1', 'e', '3', '0', '9']).isSome = true := rfl

theorem negative_exponent_syntax_admitted :
    (readWhole ['-', '0', '.', '0', '1', '2', 'E', '-', '0', '3']).isSome = true := rfl

end Algal.Core.DecimalSyntax
