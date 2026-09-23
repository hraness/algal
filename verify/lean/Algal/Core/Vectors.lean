import Algal.Core.Binary64
import Algal.Core.Text
import Algal.Core.OwnMap
import Lean.Data.Json

/-!
Executable diagnostic vectors from the authored functions. This `main` is a
sampled oracle, not a theorem or an ECMAScript decimal JSON codec. UInt64 bits
are emitted as decimal *strings* so the JSON consumer cannot round them.
-/
namespace Algal.Core.Vectors
open Lean

def maybeNat : Option Nat → Json
  | none => .null
  | some n => toJson n

def bitVector (label : String) (bits : UInt64) : Json := Json.mkObj [
  ("label", .str label),
  ("bits", .str (toString bits.toNat)),
  ("finite", .bool (decide (Binary64.Finite bits))),
  ("admitted", .bool (Binary64.admit bits).isSome),
  ("normalizedBits", .str (toString (Binary64.normalizeBits bits).toNat))
]

def textVector (text : String) : Json := Json.mkObj [
  ("text", .str text),
  ("utf16", toJson (Text.utf16 text))
]

def keyVector (key : String) : Json := Json.mkObj [
  ("key", .str key),
  ("arrayIndex", maybeNat (Text.arrayIndex key))
]

def ownValue (name : String) (entries : OwnMap.Entries (Option Nat)) : Json :=
  match OwnMap.lookup entries name with
  | none => Json.mkObj [("key", .str name), ("present", .bool false)]
  | some value => Json.mkObj [("key", .str name), ("present", .bool true), ("value", maybeNat value)]

def keys : List String :=
  ["0", "1", "2", "10", "01", "-0", "+1", "4294967294", "4294967295", "4294967296",
    "", "toString", "__proto__", "é", "é", "😀", ""]

def parsedEntries : OwnMap.Entries (Option Nat) :=
  [("__proto__", some 7), ("x", some 1), ("x", some 2), ("present-null", none)]

def report : Json := Json.mkObj [
  ("contract", .str "algal.lean-core-vectors.v1"),
  ("binary64", .arr ([
    bitVector "positive-zero" 0,
    bitVector "negative-zero" 0x8000000000000000,
    bitVector "minimum-subnormal" 1,
    bitVector "maximum-finite" 0x7fefffffffffffff,
    bitVector "positive-one" 0x3ff0000000000000,
    bitVector "negative-one" 0xbff0000000000000,
    bitVector "positive-infinity" 0x7ff0000000000000,
    bitVector "negative-infinity" 0xfff0000000000000,
    bitVector "quiet-nan" 0x7ff8000000000001
  ].toArray)),
  ("texts", .arr (["", "A", "😀", "é", "é", "", "�", "\"\\\n"].map textVector).toArray),
  ("keyIndices", .arr (keys.map keyVector).toArray),
  ("orderedKeys", toJson (Text.canonicalKeys keys)),
  ("ownMap", .arr (["x", "__proto__", "present-null", "missing", "toString"].map
    (fun name => ownValue name (OwnMap.fromParsedEntries parsedEntries))).toArray)
]

end Algal.Core.Vectors

def main : IO Unit := IO.println Algal.Core.Vectors.report.compress
