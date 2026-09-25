import Algal.Core.JsonString
import Lean.Data.Json

open Algal.Core.JsonString

/-! Sampled standalone oracle; not imported by Core.All. Input identities must
be checked independently by the adapter before accepting correspondence. -/
namespace Algal.Core.StringVectors

def casesToCheck : List String :=
  (List.range 32).map (fun n => String.singleton (Char.ofNat n)) ++
  ["", "\"", "\\", "/", "\x7f", "\u0080", "\u07ff", "\u0800",
    "\ud7ff", "\ue000", "\uffff", "𐀀", "􏿿", "\u2028", "\u2029", "\ufeff",
    "\ufffd", "é", "é", "😀", "plain", "a\"b\\c\n", "[{:}]", "/\x00😀"]

end Algal.Core.StringVectors

def main : IO Unit := do
  let rows := Algal.Core.StringVectors.casesToCheck.map fun value => Lean.Json.mkObj [
    ("text", Lean.toJson value),
    ("bytes", Lean.toJson ((quoteBytes value).data.toList.map UInt8.toNat))]
  IO.println (Lean.Json.mkObj [("contract", Lean.toJson "algal.lean-string-vectors.v1"),
    ("strings", Lean.toJson rows)]).compress
