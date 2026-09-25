import Algal.Core.JsonString

/-!
Unambiguous quoted UTF-8 prefix framing for scalar strings. Suffixes are valid
scalar strings encoded as UTF-8, not arbitrary possibly-malformed byte tails.
This proves authored codec laws; it does not assert production parser refinement.
-/
namespace Algal.Core.ByteFraming

open Algal.Core.JsonString

theorem readBytes_quote_suffix (value suffix : String) :
    readBytes (quoteBytes value ++ suffix.toUTF8) = some (value, suffix.toList) := by
  have same : quoteBytes value ++ suffix.toUTF8 = (quote value ++ suffix).toUTF8 := rfl
  rw [same, readBytes, fromUTF8_toUTF8]
  change readQuoted (quote value ++ suffix).toList = _
  simp only [String.toList_append, quote, String.toList_ofList]
  exact readQuoted_quote_suffix _ _

theorem quoted_prefix_framing (a b left right : String)
    (same : quoteBytes a ++ left.toUTF8 = quoteBytes b ++ right.toUTF8) :
    a = b ∧ left = right := by
  have result := congrArg readBytes same
  rw [readBytes_quote_suffix, readBytes_quote_suffix] at result
  have components := Option.some.inj result
  constructor
  · exact (Prod.mk.inj components).1
  · exact String.toList_inj.mp (Prod.mk.inj components).2

theorem quoted_prefix_framing_iff (a b left right : String) :
    quoteBytes a ++ left.toUTF8 = quoteBytes b ++ right.toUTF8 ↔ a = b ∧ left = right := by
  constructor
  · exact quoted_prefix_framing _ _ _ _
  · rintro ⟨rfl, rfl⟩; rfl

theorem embedded_delimiters_and_suffix :
    readBytes (quoteBytes "\"},[\\😀" ++ ",true]".toUTF8) =
      some ("\"},[\\😀", ",true]".toList) := readBytes_quote_suffix _ _


theorem distinct_prefix_splice_rejected :
    quoteBytes "x" ++ "y".toUTF8 ≠ quoteBytes "xy" ++ "".toUTF8 := by
  intro same
  have first := (quoted_prefix_framing "x" "xy" "y" "" same).1
  exact (by decide : ("x" : String) ≠ "xy") first

end Algal.Core.ByteFraming
