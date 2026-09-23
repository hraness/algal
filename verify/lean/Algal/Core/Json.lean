import Algal.Core.Binary64
import Algal.Core.OwnMap
import Algal.Core.Text

/-!
Portable finite JSON trees and a proved *structural token* codec. Tokens carry
scalar strings and raw binary64 bits, not UTF-8 JSON lexemes. The decoder really
checks finite bits and stack shape. Its round-trip/injectivity theorems are NOT
the outstanding ECMAScript decimal/escaping/object-sorting byte-codec theorem.
Object entry order and duplicates remain explicit at this layer; OwnMap models
their parsed last-wins interpretation separately.
-/
namespace Algal.Core.Json

mutual
  inductive Value where
    | null
    | bool (value : Bool)
    | number (value : Binary64.Number)
    | text (value : String)
    | array (values : Items)
    | object (fields : Fields)
    deriving DecidableEq
  inductive Items where
    | nil
    | cons (value : Value) (rest : Items)
    deriving DecidableEq
  inductive Fields where
    | nil
    | cons (key : String) (value : Value) (rest : Fields)
    deriving DecidableEq
end

mutual
  def normalizeNumbers : Value → Value
    | .null => .null
    | .bool b => .bool b
    | .number n => .number (Binary64.normalize n)
    | .text s => .text s
    | .array xs => .array (normalizeItems xs)
    | .object fs => .object (normalizeFields fs)
  def normalizeItems : Items → Items
    | .nil => .nil
    | .cons v rest => .cons (normalizeNumbers v) (normalizeItems rest)
  def normalizeFields : Fields → Fields
    | .nil => .nil
    | .cons key value rest => .cons key (normalizeNumbers value) (normalizeFields rest)
end

mutual
  theorem normalizeNumbers_idempotent (v : Value) :
      normalizeNumbers (normalizeNumbers v) = normalizeNumbers v := by
    cases v with
    | null => rfl
    | bool _ => rfl
    | number _ => simp [normalizeNumbers, Binary64.normalize_idempotent]
    | text _ => rfl
    | array xs => simp [normalizeNumbers, normalizeItems_idempotent xs]
    | object fs => simp [normalizeNumbers, normalizeFields_idempotent fs]
  theorem normalizeItems_idempotent (xs : Items) :
      normalizeItems (normalizeItems xs) = normalizeItems xs := by
    cases xs with
    | nil => rfl
    | cons v rest => simp [normalizeItems, normalizeNumbers_idempotent v, normalizeItems_idempotent rest]
  theorem normalizeFields_idempotent (fs : Fields) :
      normalizeFields (normalizeFields fs) = normalizeFields fs := by
    cases fs with
    | nil => rfl
    | cons key v rest => simp [normalizeFields, normalizeNumbers_idempotent v, normalizeFields_idempotent rest]
end

inductive Token where
  | null | bool (value : Bool) | number (bits : UInt64) | text (value : String)
  | nilItems | consItems | array
  | nilFields | consFields (key : String) | object
  deriving DecidableEq

inductive Frame where
  | value (value : Value)
  | items (items : Items)
  | fields (fields : Fields)
  deriving DecidableEq

def step (stack : List Frame) : Token → Option (List Frame)
  | .null => some (.value .null :: stack)
  | .bool b => some (.value (.bool b) :: stack)
  | .number bits => do
    let number ← Binary64.admit bits
    pure (.value (.number number) :: stack)
  | .text s => some (.value (.text s) :: stack)
  | .nilItems => some (.items .nil :: stack)
  | .consItems => match stack with
    | .items rest :: .value v :: stack => some (.items (.cons v rest) :: stack)
    | _ => none
  | .array => match stack with
    | .items xs :: stack => some (.value (.array xs) :: stack)
    | _ => none
  | .nilFields => some (.fields .nil :: stack)
  | .consFields key => match stack with
    | .fields rest :: .value v :: stack => some (.fields (.cons key v rest) :: stack)
    | _ => none
  | .object => match stack with
    | .fields fs :: stack => some (.value (.object fs) :: stack)
    | _ => none

def execute (tokens : List Token) (state : Option (List Frame)) : Option (List Frame) :=
  tokens.foldl (fun state token => state.bind (fun stack => step stack token)) state

theorem execute_append (a b : List Token) (state : Option (List Frame)) :
    execute (a ++ b) state = execute b (execute a state) := List.foldl_append

mutual
  def encode : Value → List Token
    | .null => [.null]
    | .bool b => [.bool b]
    | .number n => [.number n.bits]
    | .text s => [.text s]
    | .array xs => encodeItems xs ++ [.array]
    | .object fs => encodeFields fs ++ [.object]
  def encodeItems : Items → List Token
    | .nil => [.nilItems]
    | .cons v rest => encode v ++ encodeItems rest ++ [.consItems]
  def encodeFields : Fields → List Token
    | .nil => [.nilFields]
    | .cons key v rest => encode v ++ encodeFields rest ++ [.consFields key]
end

mutual
  theorem execute_encode (v : Value) (stack : List Frame) :
      execute (encode v) (some stack) = some (.value v :: stack) := by
    cases v with
    | null => rfl
    | bool _ => rfl
    | number n => simp [encode, execute, step, Binary64.admit_number]
    | text _ => rfl
    | array xs => rw [encode, execute_append, execute_encodeItems]; rfl
    | object fs => rw [encode, execute_append, execute_encodeFields]; rfl
  theorem execute_encodeItems (xs : Items) (stack : List Frame) :
      execute (encodeItems xs) (some stack) = some (.items xs :: stack) := by
    cases xs with
    | nil => rfl
    | cons v rest =>
      rw [encodeItems, execute_append, execute_append, execute_encode, execute_encodeItems]
      rfl
  theorem execute_encodeFields (fs : Fields) (stack : List Frame) :
      execute (encodeFields fs) (some stack) = some (.fields fs :: stack) := by
    cases fs with
    | nil => rfl
    | cons key v rest =>
      rw [encodeFields, execute_append, execute_append, execute_encode, execute_encodeFields]
      rfl
end

def decode (tokens : List Token) : Option Value :=
  match execute tokens (some []) with
  | some [.value value] => some value
  | _ => none

theorem structural_roundtrip (v : Value) : decode (encode v) = some v := by
  rw [decode, execute_encode]

theorem structural_encoding_injective (a b : Value) (h : encode a = encode b) : a = b := by
  have h' := congrArg decode h
  simpa only [structural_roundtrip, Option.some.injEq] using h'

theorem structural_roundtrip_modulo_number_normalization (v : Value) :
    decode (encode (normalizeNumbers v)) = some (normalizeNumbers v) := structural_roundtrip _

theorem normalized_structural_encoding_eq_iff (a b : Value) :
    encode (normalizeNumbers a) = encode (normalizeNumbers b) ↔
      normalizeNumbers a = normalizeNumbers b := by
  constructor
  · exact structural_encoding_injective _ _
  · exact congrArg encode

theorem malformed_stack_rejected : decode [.null, .consItems, .array] = none := by decide
theorem nonfinite_token_rejected : decode [.number 0x7ff0000000000000] = none := by decide
theorem extra_value_rejected : decode [.null, .null] = none := by decide
theorem array_order_is_significant :
    encode (.array (.cons (.bool true) (.cons (.bool false) .nil))) ≠
      encode (.array (.cons (.bool false) (.cons (.bool true) .nil))) := by decide
theorem nested_structural_witness :
    decode [.text "😀", .bool true, .nilItems, .consItems, .array,
      .nilFields, .consFields "2", .consFields "__proto__", .object] =
      some (.object (.cons "__proto__" (.text "😀")
        (.cons "2" (.array (.cons (.bool true) .nil)) .nil))) := by decide

end Algal.Core.Json
