import Algal.Core.Binary64
import Algal.Core.Json
import Algal.Core.JsonString
import Algal.Core.KeyOrder
import Algal.Core.Normalize
import Algal.Core.NumericInjectivity
import Algal.Core.OwnMap
import Algal.Core.Text

/-!
# algal.expr.v1 — semantic model: values, scopes, errors, bounds

This module fixes the data model for the checked interpreter semantics in
`Algal.Expr.Eval` and `Algal.Expr.Theorems`. It is a *semantic model* of
`crates/algal-expr/src/lib.rs` and `spec/v1/expr.md`, proved under the Lean
kernel. **It is not a proof that the Rust or WASM artifact implements the same
function** — that correspondence is downstream work (see `SCOPE.md`).

* Programs are `Json.Value` trees, exactly the grammar production accepts:
  scalars self-evaluate, arrays are op calls whose head must be a text op
  name, and object literals evaluate each field's value expression.
* Values are `Json.Value` trees; the number payload is the Phase-09 finite
  `Binary64.Number` domain, so non-finite numbers are unrepresentable.
* Evaluation order is the production order (left to right over the argument
  list). Object-literal field expressions are evaluated in UTF-8 byte order
  of the key, matching `serde_json::Map` iteration on platforms where the map
  is a `BTreeMap`.
* The typed-error domain is the closed `EXPR_*` set plus one model-only
  marker, `ErrCode.unmodeled`, which flags programs whose operator is in the
  contract but outside the modelled subset (`sort`, `toText`, `mod`).
  `unmodeled` is never produced by production; it exists so the model cannot
  silently misrepresent an unmodelled operator as a real error or a value.
* Byte accounting: `stringBytes` is the escaped canonical string length and
  is faithful to production's `canonical_bytes` on strings (the ECMAScript
  escape profile implemented by `JsonString` matches serde_json's profile on
  this alphabet). `valueBytes` counts a number as `numberByteBound` (24),
  an upper bound on the shortest decimal rendering; every other byte count is
  structural. Equality of the model's number byte count to production's exact
  `ryu-js` rendering is explicitly *not* claimed.
-/

set_option autoImplicit false
namespace Algal.Expr

open Algal.Core
open Json

/-! ## Typed errors -/

/-- The closed `EXPR_*` code domain, plus the model-only `.unmodeled` marker.
    `unmodeled` flags a *contract* operator that lies outside the covered
    subset; it is not a production code. -/
inductive ErrCode where
  | parse | op | arity | type | path | arg | num | divZero | bounds | fuel | unmodeled
  deriving DecidableEq, Repr

/-- A typed evaluation error: a closed code plus structured details. Detail
    *values* are model-native (`Value`), so where production formats numbers
    into message strings the model keeps them as data; the error *code* is the
    contract surface and is modelled exactly. -/
structure ExprErr where
  code : ErrCode
  details : List (String × Value) := []
  deriving DecidableEq

def err (code : ErrCode) : ExprErr := { code }

def errWith (code : ErrCode) (details : List (String × Value)) : ExprErr := { code, details }

/-- The zero number used as an unreachable fallback when a `Float → Number`
    admission cannot fail but the type requires a total function. -/
def zeroNumber : Binary64.Number := ⟨0, by decide⟩

/-- A natural number as a finite binary64 model number. The `none` branch is
    unreachable in practice (`Float.ofNat n` is finite for every `n`); it is a
    total-function fallback, not a semantic case. -/
def numberOfNat (n : Nat) : Binary64.Number :=
  (Binary64.admit (Float.ofNat n).toBits).getD zeroNumber

def numVal (n : Nat) : Value := .number (numberOfNat n)

def errType (op : String) (arg : Nat) (want got : String) : ExprErr :=
  errWith .type [("op", .text op), ("arg", numVal arg), ("want", .text want), ("got", .text got)]

def errArity (op : String) (want : String) (got : Nat) : ExprErr :=
  errWith .arity [("op", .text op), ("want", .text want), ("got", numVal got)]

def errBounds (what : String) (max : Nat) : ExprErr :=
  errWith .bounds [("what", .text what), ("max", numVal max)]

def errFuel (cost left : Nat) : ExprErr :=
  errWith .fuel [("cost", numVal cost), ("left", numVal left)]

def errPathWhat (op : String) (what : String) : ExprErr :=
  errWith .path [("op", .text op), ("what", .text what)]

/-- `nth` out-of-range. Production renders the index into a message string via
    the canonical number renderer; the model keeps the index and length as
    structured values instead. -/
def numValOfBits (bits : UInt64) : Value :=
  .number ((Binary64.admit bits).getD zeroNumber)

def errNthRange (op : String) (index : Float) (len : Nat) : ExprErr :=
  errWith .path [("op", .text op), ("what", .text "index out of range"),
    ("indexBits", numValOfBits index.toBits), ("length", numVal len)]

def errOp (op : String) : ExprErr :=
  errWith .op [("op", .text op)]

def errArg (op : String) (what : String) : ExprErr :=
  errWith .arg [("op", .text op), ("what", .text what)]

def errNum (op : String) : ExprErr :=
  errWith .num [("op", .text op)]

/-- `unmodeled` marker: op is in the contract but outside the covered subset. -/
def errUnmodeled (op : String) : ExprErr :=
  errWith .unmodeled [("op", .text op)]

/-- The kind string, mirroring `kind_of`. -/
def kindOf : Value → String
  | .null => "null"
  | .bool _ => "bool"
  | .number _ => "number"
  | .text _ => "text"
  | .array _ => "list"
  | .object _ => "map"

/-! ## Contract bounds (mirroring the `MAX_*` constants) -/

def maxProgramBytes : Nat := 16384
def maxProgramNodes : Nat := 512
def maxProgramDepth : Nat := 16
def maxEnvBytes : Nat := 262144
def maxValueDepth : Nat := 32
def maxListLen : Nat := 1024
def maxObjectKeys : Nat := 256
def maxStringBytes : Nat := 65536
def maxOutputBytes : Nat := 65536
def maxValueBytes : Nat := 262144
def maxVarLen : Nat := 64
def maxFuel : Nat := 1000000

/-! ## Environment and lexical scope -/

/-- Caller environment: an association list of unique keys, modelled as
    `OwnMap` entries. Key uniqueness is an admission premise (production takes
    a `serde_json::Map`). -/
abbrev Env := OwnMap.Entries Value

/-- Lexical scope: innermost binding is the list head, matching production's
    `scope.vars.push`/`truncate` discipline where lookup searches innermost
    first. -/
abbrev Scope := OwnMap.Entries Value

/-- Lexical scope wins over the caller environment. -/
def lookupName (env : Env) (scope : Scope) (name : String) : Option Value :=
  (OwnMap.lookup scope name).or (OwnMap.lookup env name)

/-- Push a binder. Production: `scope.vars.push((name, value))`. -/
def pushScope (scope : Scope) (name : String) (value : Value) : Scope := (name, value) :: scope

/-- Drop the `n` innermost binders; models `scope.vars.truncate(base)` where
    `base = vars.len() - n`. -/
def dropScope (scope : Scope) (n : Nat) : Scope := scope.drop n

theorem lookupName_scope_hit (env : Env) (scope : Scope) (name : String) (v : Value)
    (h : OwnMap.lookup scope name = some v) :
    lookupName env scope name = some v := by
  simp [lookupName, h]

theorem lookupName_scope_miss (env : Env) (scope : Scope) (name : String)
    (h : OwnMap.lookup scope name = none) :
    lookupName env scope name = OwnMap.lookup env name := by
  simp [lookupName, h]

/-- An innermost binder shadows every same-named outer binding. -/
theorem pushScope_shadows (env : Env) (scope : Scope) (name : String) (v : Value) :
    lookupName env (pushScope scope name v) name = some v := by
  simp [pushScope, lookupName, OwnMap.lookup]

/-- Popping the pushed binder restores the outer scope exactly — the model
    analogue of `truncate(base)` after `let`/`map`/`filter`/`fold`. -/
theorem dropScope_push (scope : Scope) (name : String) (v : Value) :
    dropScope (pushScope scope name v) 1 = scope := rfl

theorem dropScope_push_two (scope : Scope) (n₁ n₂ : String) (v₁ v₂ : Value) :
    dropScope (pushScope (pushScope scope n₂ v₂) n₁ v₁) 2 = scope := rfl

/-! ## Items/Fields helpers -/

def itemsLength : Items → Nat
  | .nil => 0
  | .cons _ rest => 1 + itemsLength rest

def itemsToList : Items → List Value := Normalize.itemsToList

def itemsFromList : List Value → Items
  | [] => .nil
  | v :: rest => .cons v (itemsFromList rest)

def itemsReverseAux : Items → Items → Items
  | .nil, acc => acc
  | .cons v rest, acc => itemsReverseAux rest (.cons v acc)

def itemsReverse (items : Items) : Items := itemsReverseAux items .nil

def itemsAppend : Items → Items → Items
  | .nil, b => b
  | .cons v rest, b => .cons v (itemsAppend rest b)

/-- Zero-based indexed read, used for op argument positions. -/
def itemsGet : Items → Nat → Option Value
  | .nil, _ => none
  | .cons v rest, i => if i = 0 then some v else itemsGet rest (i - 1)

/-- Float-indexed read over list items: the loop walks the list while
    decrementing the (nonneg integral) index, which makes a usize narrowing
    unnecessary — this is exactly the contract's check-before-narrow intent. -/
def itemsGetF : Items → Float → Option Value
  | .nil, _ => none
  | .cons v rest, i => if i ≤ 0 then some v else itemsGetF rest (i - 1)

/-- `take` with a nonneg integral float bound; `n` exceeding the list takes
    the whole list (production saturates `as usize`; the walk is equivalent). -/
def itemsTakeF : Items → Float → Items
  | .nil, _ => .nil
  | .cons v rest, n => if n ≤ 0 then .nil else .cons v (itemsTakeF rest (n - 1))

def itemsDropF : Items → Float → Items
  | .nil, _ => .nil
  | .cons v rest, n => if n ≤ 0 then .cons v rest else itemsDropF rest (n - 1)

def fieldsLength : Fields → Nat
  | .nil => 0
  | .cons _ _ rest => 1 + fieldsLength rest

def fieldsReverseAux : Fields → Fields → Fields
  | .nil, acc => acc
  | .cons k v rest, acc => fieldsReverseAux rest (.cons k v acc)

def fieldsReverse (fields : Fields) : Fields := fieldsReverseAux fields .nil

def fieldNames (fields : Fields) : List String :=
  (Normalize.fieldsToList fields).map Prod.fst

/-- Last-wins field lookup (parse semantics): `Normalize.lookupFields`. -/
def fget (fields : Fields) (key : String) : Option Value :=
  Normalize.lookupFields fields key

/-- Key membership, the `has` primitive. -/
def fhas (fields : Fields) (key : String) : Bool := (fget fields key).isSome

/-- Sort object-literal field expressions by key in UTF-8 byte order —
    the iteration order of `serde_json::Map` (`BTreeMap`). `Ord String` on
    Lean strings compares UTF-8 bytes, which is scalar order on valid UTF-8. -/
def insertFieldByte (key : String) (v : Value) : Fields → Fields
  | .nil => .cons key v .nil
  | .cons k2 v2 rest =>
    if compare key k2 = .gt then .cons k2 v2 (insertFieldByte key v rest)
    else .cons key v (.cons k2 v2 rest)

def sortFieldsByte : Fields → Fields
  | .nil => .nil
  | .cons k v rest => insertFieldByte k v (sortFieldsByte rest)

/-- Canonicalize evaluated object fields: canonical key order, last-wins on
    duplicate keys, exactly `Normalize.canonicalFields` on the write-ordered
    list. `acc` is the reversed (cons-accumulated) processing list. -/
def canonicalizeAcc (acc : Fields) : Fields :=
  Normalize.canonicalFields (fieldsReverse acc)

/-! ## Numeric bridge and value measures -/

/-- Model number → Lean `Float` (IEEE-754 binary64). -/
def numFloat (n : Binary64.Number) : Float := Float.ofBits n.bits

/-- Admit a computed `Float` back to the finite domain: `none` exactly when
    the bits are non-finite — the model's `!result.is_finite()` check. -/
def admitNum (f : Float) : Option Binary64.Number := Binary64.admit f.toBits

/-- Negative-zero test via `1/x < 0` (the reciprocal of `-0` is `-∞`).
    Called only when the operands are IEEE-equal (`a == b`), where `0`
    means either zero bit-pattern. -/
def negZeroF (f : Float) : Bool := decide (1.0 / f < 0)

/-- `fmin`/`fmax`: IEEE-754 `minNum`/`maxNum` as Rust's `f64::min`/`f64::max`
    implement them — on distinct values the strict order decides; on the
    IEEE-equal pair `{+0, -0}` minNum yields `-0` and maxNum `+0` (zeros
    compare equal under `<`, so the sign decides the tie).
    Rust's `f64::min`/`f64::max` implement `minNum`/`maxNum`: `min(0, -0)`
    is `-0` and `max(0, -0)` is `+0` for either argument order — the model
    reproduces that tie rule, not a first-operand fallback. -/
def fmin (a b : Float) : Float :=
  if a < b then a else if b < a then b
  else if negZeroF a ∨ negZeroF b then -0.0 else a
def fmax (a b : Float) : Float :=
  if a < b then b else if b < a then a
  else if negZeroF a ∧ negZeroF b then a else if Float.beq a 0 then 0.0 else a

/-- JS-`Math.round` semantics as implemented by production: floor, then bump
    when the fraction is at least 0.5 (`round(-2.5) = -2`). -/
def jsRound (n : Float) : Float :=
  let f := Float.floor n
  if n - f < 0.5 then f else f + 1.0

-- Node count, mirroring `count_nodes` (1 per scalar, 1 + children).
mutual
  def countNodes : Value → Nat
    | .null | .bool _ | .number _ | .text _ => 1
    | .array xs => 1 + countItemsNodes xs
    | .object fs => 1 + countFieldsNodes fs
  def countItemsNodes : Items → Nat
    | .nil => 0
    | .cons v rest => countNodes v + countItemsNodes rest
  def countFieldsNodes : Fields → Nat
    | .nil => 0
    | .cons _ v rest => countNodes v + countFieldsNodes rest
end

mutual
  def valueDepth : Value → Nat
    | .null | .bool _ | .number _ | .text _ => 0
    | .array xs => 1 + itemsDepth xs
    | .object fs => 1 + fieldsDepth fs
  def itemsDepth : Items → Nat
    | .nil => 0
    | .cons v rest => max (valueDepth v) (itemsDepth rest)
  def fieldsDepth : Fields → Nat
    | .nil => 0
    | .cons _ v rest => max (valueDepth v) (fieldsDepth rest)
end

/-- Escaped canonical byte length of a string, faithful to
    `serde_json::to_string(s).len()` on the ECMAScript escape profile. -/
def stringBytes (s : String) : Nat := (JsonString.quote s).utf8ByteSize

/-- Upper bound on the shortest canonical decimal rendering of a finite
    binary64 value (the model's stand-in for the unproved numeric renderer). -/
def numberByteBound : Nat := 24

-- Pure byte counter for bounds that are reported but never fail internally
-- (`canonical_map_bytes` shape).
mutual
  def valueByteCount : Value → Nat
    | .null => 4
    | .bool b => if b then 4 else 5
    | .number _ => numberByteBound
    | .text s => stringBytes s
    | .array xs => 2 + (itemsLength xs - 1) + itemsByteCount xs
    | .object fs => 2 + (fieldsLength fs - 1) + fieldsByteCount fs
  def itemsByteCount : Items → Nat
    | .nil => 0
    | .cons v rest => valueByteCount v + itemsByteCount rest
  def fieldsByteCount : Fields → Nat
    | .nil => 0
    | .cons k v rest => stringBytes k + 1 + valueByteCount v + fieldsByteCount rest
end

/-- `add_value_bytes`: saturating-less cumulative byte bound (EXPR_BOUNDS). -/
def addValueBytes (total extra : Nat) : Except ExprErr Nat :=
  if maxValueBytes < total + extra then .error (errBounds "value-bytes" maxValueBytes)
  else .ok (total + extra)

-- `value_bytes(value, depth)`: bounded canonical-byte walker. String byte
-- lengths are exact (`stringBytes`); numbers count `numberByteBound` (24),
-- an upper bound on production's shortest rendering — so `EXPR_BOUNDS`
-- decisions on number payload are conservative in the model.
mutual
  def valueBytes (v : Value) (depth : Nat) : Except ExprErr Nat :=
    if maxValueDepth < depth then .error (errBounds "value-depth" maxValueDepth)
    else match v with
      | .null => .ok 4
      | .bool b => .ok (if b then 4 else 5)
      | .number _ => .ok numberByteBound
      | .text s =>
        if maxStringBytes < s.utf8ByteSize then .error (errBounds "string-bytes" maxStringBytes)
        else .ok (stringBytes s)
      | .array xs =>
        if maxListLen < itemsLength xs then .error (errBounds "list-len" maxListLen)
        else do
          let acc ← bytesItems (depth + 1) (2 + itemsLength xs - 1) xs
          if maxValueBytes < acc then .error (errBounds "value-bytes" maxValueBytes) else .ok acc
      | .object fs =>
        if maxObjectKeys < fieldsLength fs then .error (errBounds "object-keys" maxObjectKeys)
        else do
          let acc ← bytesFields (depth + 1) (2 + fieldsLength fs - 1) fs
          if maxValueBytes < acc then .error (errBounds "value-bytes" maxValueBytes) else .ok acc
  def bytesItems (depth acc : Nat) : Items → Except ExprErr Nat
    | .nil => .ok acc
    | .cons v rest => do
      let n ← valueBytes v depth
      let acc ← addValueBytes acc n
      bytesItems depth acc rest
  def bytesFields (depth acc : Nat) : Fields → Except ExprErr Nat
    | .nil => .ok acc
    | .cons k v rest => do
      if maxStringBytes < k.utf8ByteSize then .error (errBounds "string-bytes" maxStringBytes)
      else do
        let acc ← addValueBytes acc (stringBytes k + 1)
        let n ← valueBytes v depth
        let acc ← addValueBytes acc n
        bytesFields depth acc rest
end

/-- The post-evaluation check production applies to every node result. -/
def checkValue (v : Value) : Except ExprErr Nat := valueBytes v 0

/-- Cumulative env byte measure, mirroring `canonical_map_bytes`. -/
def envBytes (env : Env) : Nat :=
  2 + (env.length - 1) +
    env.foldl (fun acc kv => acc + stringBytes kv.1 + 1 + valueByteCount kv.2) 0

def envDepth (env : Env) : Nat :=
  1 + env.foldl (fun acc kv => max acc (valueDepth kv.2)) 0

/-! ## Semantic equality and ordering -/

/-- Numeric equality: `Binary64.Equivalent` = normalize-equality, which is
    IEEE `==` on finite values (signed zeros identified, everything else by
    exact value — proved link: `NumericInjectivity.denote_equal_iff_equivalent`). -/
def numEq (a b : Binary64.Number) : Bool :=
  decide (Binary64.normalize a = Binary64.normalize b)

/-- Structural value equality as key-order-insensitive semantic equality:
    canonical normalization identifies signed zeros, reorders object keys,
    and keeps last-wins own keys. On the admitted domain (unique keys,
    finite numbers) this is exactly production's `eq_values`. -/
def eqv (a b : Value) : Bool := decide (Normalize.normalize a = Normalize.normalize b)

/-- String comparison by UTF-16 code units — the contract's string order. -/
def utf16compare (a b : String) : Ordering := compare (Text.utf16 a) (Text.utf16 b)

/-! ## ASCII string operations (contract rules, not Unicode case) -/

/-- The production trim set: space, tab, LF, CR, VT, FF. -/
def isTrimChar (c : Char) : Bool :=
  c.toNat = 32 ∨ c.toNat = 9 ∨ c.toNat = 10 ∨ c.toNat = 13 ∨ c.toNat = 11 ∨ c.toNat = 12

/-- ASCII-only uppercasing — deliberately not Unicode case mapping. -/
def asciiUpperChar (c : Char) : Char :=
  if 97 ≤ c.toNat ∧ c.toNat ≤ 122 then Char.ofNat (c.toNat - 32) else c

def asciiLowerChar (c : Char) : Char :=
  if 65 ≤ c.toNat ∧ c.toNat ≤ 90 then Char.ofNat (c.toNat + 32) else c

def upperStr (s : String) : String := String.ofList (s.toList.map asciiUpperChar)
def lowerStr (s : String) : String := String.ofList (s.toList.map asciiLowerChar)

def trimStr (s : String) : String :=
  String.ofList (List.reverse (List.dropWhile isTrimChar
    (List.reverse (List.dropWhile isTrimChar s.toList))))

/-- Literal substring containment over characters (UTF-8 substring search and
    char-list search agree on valid UTF-8). `[]` is contained everywhere. -/
def charInfix (hay needle : List Char) : Bool :=
  if needle.isPrefixOf hay then true
  else match hay with
    | [] => needle.isEmpty
    | _ :: rest => charInfix rest needle

/-- Rust `str::split(&str)` piece semantics: adjacent separators yield empty
    pieces and a trailing separator yields a trailing empty piece. `sep` must
    be nonempty — the caller's EXPR_ARG admission rule. -/
def splitGo (sep : List Char) (hne : sep ≠ []) (rem cur : List Char) : List (List Char) :=
  if h : sep.isPrefixOf rem then
    have hlt : (rem.drop sep.length).length < rem.length := by
      obtain ⟨t, ht⟩ := (List.isPrefixOf_iff_prefix.mp h)
      subst ht
      rw [List.drop_left, List.length_append]
      have hpos : 0 < sep.length := Nat.pos_of_ne_zero (fun z => hne (List.length_eq_zero_iff.mp z))
      omega
    cur :: splitGo sep hne (rem.drop sep.length) []
  else match rem with
    | [] => [cur]
    | c :: cs => splitGo sep hne cs (cur ++ [c])
termination_by rem.length
decreasing_by
  all_goals first
    | assumption
    | (simp only [List.length_cons]; omega)

def splitChars (s sep : List Char) (hne : sep ≠ []) : List (List Char) :=
  splitGo sep hne s []

end Algal.Expr
