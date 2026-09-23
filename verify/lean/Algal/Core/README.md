# Lean semantic core

This is a checked semantic foundation, with **no production correctness claim**.
It is a partial implementation of Phase 09. The full canonical JSON byte-codec
acceptance criterion remains unmet. `theorems.json` lists every authored theorem,
its domain, witnesses, source correspondence candidates and unresolved criteria.
`All.lean` is the library entry point; `Axioms.lean` is a diagnostic listing, and
`Vectors.lean` and `StringVectors.lean` are separate executable sampled oracles.

## What is proved

| Module | Domain and proved laws |
| --- | --- |
| `Binary64` | Actual 64-bit patterns with exponent below 2047. Admission rejects infinities and NaNs. Serialization normalization changes only the negative-zero pattern, preserves finiteness, is idempotent, and identifies no distinct normalized numbers. An addition witness reduces Lean's binary64 model in the kernel. |
| `BinaryValue` | Exact dyadic and rational denotation of every finite binary64 value, related to the pinned Lean unpack model. Field decomposition, normal/subnormal scaling, coefficient/exponent bounds, nonfinite rejection, signed-zero equality and zero-normalization preservation are proved. No decimal rounding or production arithmetic theorem is supplied. |
| `NumericInjectivity` | Equal exact dyadic or rational denotation is equivalent to independently defined normalized-bit equality for every finite binary64 value, including negative values. Normalized finite denotation is injective; only the two zero patterns are identified. |
| `RoundingInterval` | Exact rational midpoint cells for sign-bit-zero interior finite values with two adjacent finite neighbors. Every cell member is nearest to its center among all sign-bit-zero finite candidates; odd centers are strictly nearest. Code order, adjacency, midpoint distances and coefficient parity are proved. This domain includes +0 as a candidate and excludes -0 and negative candidates. |
| `DecimalSyntax` | Concrete ASCII numeral grammar retaining signs, digits, exponent case and spelling. Whole-token parsing accepts exactly a rendered numeral; spelling is injective. Decimal coefficient/exponent placement has exact rational semantics. This is neither finite-binary64 admission nor a shortest renderer. |
| `Text` | Unicode scalar strings encoded into UTF-16 code units. Character and string decoders round-trip; encoding is injective; every unit is below 65536. The executable JS index classifier and key sorter cover numeric-index-first/UTF-16 order; sorting preserves the multiset of keys. |
| `OwnMap` | Finite own-property maps. Last writes win, writes to distinct keys commute extensionally, successful lookup implies a declared own key, and absence differs from a present value representing null. No prototype lookup exists. |
| `KeyOrder` | The unchanged key comparator is total, transitive and antisymmetric for all scalar strings. Actual key sorting is invariant under any list permutation. A sorted finite-map projection identifies exactly equal final own bindings, including duplicate histories; distinct writes commute, while changing a duplicate winner changes the projection. |
| `Json` | Finite trees with finite binary64 numbers, scalar strings and explicit array/object spines. Number normalization is recursively idempotent. A flat postfix structural token stream has a real stack decoder: roundtrip, injectivity, rejection of malformed/nonfinite streams and preservation of array order are proved. |
| `Normalize` | Recursive number, array and own-object normalization. An independent inductive relation compares constructors, signed-zero bits, array positions and recursive last-wins object lookup. Normalization is sound, idempotent and complete for that relation; canonical structural tokens round-trip modulo it and identify exactly equivalent trees. Output object keys are sorted and unique; absence remains distinct from present null. |
| `JsonString` | Actual quoted UTF-8 string bytes. The authored encoder uses the seven ECMAScript short escapes, lowercase control escapes and direct UTF-8 for remaining scalars. Its fragment decoder preserves arbitrary character suffixes; its whole-input byte decoder round-trips every scalar string; byte encoding is injective. Malformed UTF-8 and delimiter rejection have explicit witnesses. |
| `ByteFraming` | Quoted UTF-8 prefixes followed by valid scalar UTF-8 suffixes. The decoder retains the exact suffix. Equal framed byte sequences imply equal strings and equal suffixes; changing the split cannot hide a different quoted value. |
| `JsonLayout` | Actual UTF-8 punctuation, string, array and object layout with a recursive parser. Input character length supplies sufficient parsing fuel for emitted trees. Every finite tree without numbers round-trips and has injective bytes without a number-codec assumption. Canonical bytes identify exactly the independent recursive equivalence relation on that fragment. The corresponding arbitrary-number results require explicit, still-uninstantiated number codec laws. |
| `Ports` | Signature compatibility, ref/capability separation, exact capability classes, many/scalar routing, actual ASCII digest/handle syntax, and checked assignment preserving partial typed states. Runtime schema acceptance and canonical-byte size are explicit parameters. |
| `Graph` | A finite flat graph certificate checker with own declared endpoints, ordinary unlifted child interfaces and a rank certificate. Acceptance implies acyclicity, scalar inbound occurrence count at most one, no mixture of normal/failure inputs, and exact capability classes on normal edges. |
| `Accounting` | Exact natural-number work with explicit sane callback costs. Step/call checks precede increment; work checks follow charging. The post-charge bound is `L + maximumChunk`, given the preceding and chunk bounds. Charged failures retain cost. An unsigned-64 no-wrap lemma has an explicit sum bound. |
| `Oracle` | A fixed ordered tape binds exact occurrence, structural request and reply. Successful replay consumes exactly one matching head record; changed identities and reordered tapes reject. Success, failure and suspension are distinct constructors. |

Every domain includes admitted and rejected witnesses. Counterexample witnesses
also reject tempting stronger statements: signed zeros have different bits,
Unicode normalization is not applied, scalar order differs from UTF-16 order,
compatible signatures need not satisfy a consumer schema or closed choice labels,
a syntactically valid capability does not mint authority, and work may exceed its
limit at the observed post-charge failure boundary.

## Canonicalization boundary

`Json.encode` emits **structural tokens, not JSON text or UTF-8 bytes**. Its number
token carries binary64 bits; string tokens carry scalar strings. Object entries
remain ordered and duplicate-capable. `normalizeNumbers` normalizes only number
zeros. `OwnMap.fromParsedEntries` separately supplies last-duplicate-wins lookup.
No theorem equates tokens or object spines with a production JSON document.

`Text.canonicalKeys_preserves_keys` alone proves a permutation. `KeyOrder` also
proves numeric-index injectivity, comparator totality/transitivity/antisymmetry,
actual sorting uniqueness under every input permutation, and exact extensional
finite-map projection. It uses the existing comparator and unrestricted scalar
keys. Duplicate histories need not have unique keys: equal final own bindings
produce the same sorted projection, while changing which duplicate wins can
change that projection. This projection carries lookup results, not JSON bytes.

`Normalize` composes this ordering with recursive normalization of the existing
`Json.Value`. It interprets field histories left to right with last duplicates
winning, recursively normalizes values, emits sorted unique own keys, and maps
array elements in their original positions. Its equivalence relation is defined
independently through constructors and observable lookup, rather than equality
of normalized output. Numbers have equal bits or are both signed-zero patterns;
strings compare exactly; arrays have corresponding values in the same positions;
objects have corresponding last-wins own values at every key. The main theorem
proves that this relation holds exactly when normalized trees are equal.

The normalizer's total lookup fallback is proved irrelevant because it selects
only keys present in the map. It cannot turn an absent field into present null.
The existing token codec now has a composed roundtrip modulo this independent
relation, and its canonical token streams are equal exactly for equivalent
trees. Encoding is injective on normalized trees. `JsonLayout` now composes those
semantics with actual punctuation/string bytes on the no-number fragment and
conditionally on explicit number laws for arbitrary finite trees. A complete
production JSON byte-codec theorem remains unproved.

`BinaryValue` now supplies exact numeric meaning for the admitted bits. A finite
normal value has a 53-bit coefficient including its hidden bit; a subnormal uses
the stored fraction and exponent -1074. Its field formula agrees with Lean's
pinned binary64 unpack model and has an exact rational interpretation. Both zero
patterns denote zero, and serialization zero normalization preserves denotation.
Every exponent-2047 pattern is rejected by the model denotation, covering all
infinities and NaNs. The helper `exact : UInt64 → Dyadic` itself is an unchecked
field formula; semantic admission belongs to `denote : Binary64.Number → Dyadic`.
`NumericInjectivity` proves the converse as well: two admitted finite values have
equal exact dyadic or rational denotation exactly when their normalized bits
agree. This includes negative values. It recovers exponent/fraction fields from
strictly ordered blocks of integer multiples of the minimum subnormal, then
recovers sign except at zero. These units are unbounded mathematical integers,
not a claim that a production UInt64 accumulator can hold them. On normalized
finite numbers, the denotation is injective.

`RoundingInterval` provides a separate interval foundation. Its `Nonnegative`
predicate means **sign bit zero**, including +0 and excluding -0 even though -0
has rational value zero. Actual bit-code order agrees with rational value order
on this domain, and consecutive finite codes have no intervening candidate.
The exact rational midpoint characterizes distance comparisons between two
values. A cell uses the actual predecessor and successor values, so unequal gaps
around a power-of-two boundary are retained rather than assumed equal.

The interval theorem requires an interior center and two actual finite neighbors.
For any cell member, the center is no farther away than every sign-bit-zero
finite candidate; an odd center is strictly closer than every different such
candidate. Cells include midpoint endpoints for even centers and exclude them
for odd centers. A parity lemma connects the code's low bit to the coefficient in
Lean's `Accuracy.roundToNearestEven`. This proves the already-classified tie
branch, not residual classification, carry normalization or packing. Concrete
witnesses check endpoint inclusion/exclusion, the asymmetric gaps around one,
and the equal gaps across the subnormal/normal boundary.

Positive zero can be a predecessor. The successor-code premises do not permit a
zero center without a predecessor or a maximum-finite center without a finite
successor. Negative candidates, -0, signed-zero center treatment, overflow
endpoints, and universal rational-to-center selection remain outside these
interval results. No interval-coverage converse, executable decimal conversion,
shortest decimal renderer, or production refinement follows from them.

`DecimalSyntax` independently defines the actual ASCII JSON numeral grammar:
optional minus, a nonempty integer without extra leading zeros, an optional
nonempty fraction, and an optional signed exponent. It retains exponent case,
explicit plus signs, and all permitted fractional/exponent zeros. Its whole-token
parser accepts exactly a rendered `Numeral`, with exact spelling preservation.
The parsed coefficient and decimal exponent denote a rational value with a
positive denominator. Distinct spellings can have the same value; syntax
injectivity is not rational-value injectivity. An explicit theorem distinguishes
exact decimal 0.1 from the exact rational value of its rounded binary64 encoding.

`readPrefix` can leave an arbitrary suffix, including malformed trailing content;
`readWhole` requires complete token consumption. The inverse with a suffix uses
only EOF or the canonical container delimiters. Whitespace and UTF-8 document
composition remain outside this numeral module. Syntax admission intentionally
accepts `1e309`; finite-binary64 conversion is a separate obligation. The parser
terminates structurally on finite lists, but no digit/exponent, stack, time or
allocation bound is claimed. Computing exact powers of ten on unbounded foreign
input would need independent admission and resource limits. Neither numeric
module supplies `NumberCodec.LawsOn` or a production parser/printer instance.

The remaining full byte codec must implement and prove finite binary64 decimal
rendering and decimal parsing, including shortest output, exponent thresholds,
rounding ties, subnormals, maximum finite values and zero normalization. Lean's
opaque `Float.toString`, `floor`, or `round` cannot supply those proofs. General
raw-parser admission, depth/byte rejection and the production relation still
need proofs. Whitespace and
duplicate normalization are not a license to repair malformed source bytes.

The portable raw-document domain must require Unicode scalar values in **every
string token, including overwritten duplicate values and keys**. Lean `String`
already contains scalar values, but this core does not prove the raw parser
establishes that precondition. Legacy Bun data with escaped lone surrogates is a
separate retained compatibility domain. No NFC normalization occurs. Scalar count,
UTF-16 units, UTF-8 bytes, canonical bytes, depth and nodes are distinct metrics.

`JsonString` closes the quoted-string encoding slice with actual bytes. It emits
`\b`, `\t`, `\n`, `\f`, `\r`, escaped quotation marks and backslashes, lowercase
`\u00xx` for the other ASCII controls, and direct UTF-8 for remaining scalar
values. This is the scalar-domain mapping in
[ECMAScript QuoteJSONString](https://tc39.es/ecma262/multipage/structured-data.html#sec-quotejsonstring).
It uses Lean's actual UTF-8 representation and pinned library proofs. Lean's
`Lean.Json.escape` has different spellings for some controls and is not reused.

The fragment decoder is intentionally incomplete for general JSON input: it does
not parse every legal `\uXXXX`, surrogate-pair or solidus escape spelling. Its
proved prefix theorem consumes an emitted quoted string and preserves an
arbitrary scalar-character suffix. Whole-byte roundtrip and injectivity hold for
all scalar strings. Malformed, overlong and surrogate UTF-8, leading BOM, literal
controls, bad escapes, missing quotes and trailing content have rejected
witnesses; these witnesses are not a universal malformed-input classification.
Embedded U+FEFF remains content. Full raw-parser admission remains separate.

`ByteFraming` lifts string prefix consumption to concatenated UTF-8 byte arrays.
Its suffix is a valid scalar `String` encoded as UTF-8. It does not assert that
the whole-input UTF-8 decoder accepts an arbitrary malformed trailing byte array.
The inverse proves both the quoted value and its valid suffix are uniquely
determined by the full framed bytes.

`JsonLayout` renders and parses null, booleans, the proved string fragments,
ordered arrays and ordered object histories using actual `[]{}:,` punctuation.
The parser rejects missing colons, mismatched closing delimiters, trailing commas
and extra root values. Strings go through `JsonString`; bytes first go through
`String.fromUTF8?`. It consumes its own emitted profile, not every legal whitespace
or alternate string-escape spelling. Its recursive fuel decreases at every
call. The rendered character-length bound proves that `readWhole`, which chooses
the input's character length as fuel, can parse every emitted tree in its domain.
This is not a theorem about machine stack depth, allocation or production limits.

The unconditional `NoNumbers` theorem ranges over all finite trees containing no
number constructor, including every value in an ordered duplicate history. It
round-trips actual UTF-8 bytes and proves injectivity without assuming any number
codec laws. The executable `rejectNumbers` witness rejects the numeric branch;
a separate theorem proves that it cannot satisfy the full-number laws. Nested
escaped strings, duplicate fields and delimiter failures have concrete witnesses.

For trees with numbers, `NumberCodec` only supplies operations. `LawsOn` is an
explicit proposition parameter: admitted numeric leaves must render with a
numeric initial character, parse back to normalized bits before a legal delimiter
or EOF, and render identically after zero normalization. Arbitrary-suffix inverse
is deliberately absent: `1` followed by `0` is the number token `10`. The admitted
leaf predicate is recorded in the theorem type. No production instance of these
laws has been proved. The laws alone establish neither JSON numeral grammar nor
decimal denotation or shortest spelling; an exotic codec could satisfy them.
Such a codec is not used as a substitute for a production number proof.

`canonicalBytes` first applies the existing recursive `Normalize.normalize`.
Conditional on the number laws for that normalized tree, byte equality is
equivalent to the independently defined `Normalize.Equivalent`, and decoding
produces the canonical structural token stream. The same canonical roundtrip and
equivalence law is unconditional for `NoNumbers` trees. Preservation of that
predicate by recursive normalization, including sorted last-wins field selection,
is proved. Raw object-history injectivity and canonical own-map equivalence are
distinct statements; duplicate histories can share canonical bytes.

The pinned native renderer is `ryu-js` 1.0.2. `BinaryValue` and `DecimalSyntax`
provide exact dyadic/decimal meanings and numeral grammar. `NumericInjectivity`
characterizes equality of all finite values, and `RoundingInterval` handles
sign-bit-zero interior midpoint cells. The remaining numeric proof must complete
signed and zero/overflow boundary treatment, prove actual decimal conversion
selects the correct cell, and establish shortest coefficient selection, tables,
machine arithmetic, and the selected formatting and tie policy. Generic ECMAScript conformance alone is
insufficient to establish one unique byte spelling: the closest/even tie rule is
guidance in [Number::toString](https://tc39.es/ecma262/multipage/ecmascript-data-types-and-values.html#sec-numeric-types-number-tostring).
The selected Bun/native implementations and that numeric policy need their own
reviewed correspondence evidence.

Native `serde_json` integers can first round to binary64 through `as_f64`; that
conversion is outside `Binary64.Number`, whose input already consists of bits.
No SHA-256 injectivity theorem is asserted. Collision resistance remains an
external named assumption when digests identify canonical bytes.

## Representation, authority and bounds

The graph checker is an independent certificate checker, not a translation or
proof of `compile()`. It checks only the recorded structural obligations. It does
not replace the manifest parser's field, ID, size or hierarchy checks, prove the
compiler emits a rank certificate, or cover lifted `map`/`repeat`/`loop` interfaces.
The exact child-interface relation is only for ordinary unlifted composition.
Theorems range over finite lists; this is not an allocator, stack or RSS bound.

Port compatibility is weaker than runtime validation. Even choice-to-choice
compatibility can accept an open producer feeding a closed consumer. The runtime
schema checker therefore remains in `accepts`. `SchemaCheck` and `ByteSize` are
explicit functions whose correspondence to production remains unproved; no
uninterpreted function is relabeled as the real JSON codec. The byte threshold
262144 matches the current port value bound. Optional ports are partial-state
bindings; `assign` does not establish that all required inputs arrived, outputs
are complete, or scheduler progress occurs. Native `check_value` additionally
limits many lists to 4096 items; Bun currently applies its byte bound without the
same list-count test. This unresolved resource parity is outside these lemmas.

Ref syntax does not prove the CAS target exists. Capability syntax/class equality
does not prove the host granted a handle. `authorized` is a separate explicit
grant-membership predicate, without a theorem deriving it from syntax. Failure
edges deliver failure records and intentionally do not satisfy the normal-edge
capability-preservation premise. Effect tapes model structural request equality;
they are not yet a proven projection of canonical request-digest or journal data.
They prove no provider truth, attestation, exactly-once side effects or liveness.

Accounting assumes nonnegative integer charges and an exact integer/machine-width
envelope. `admitCost` takes an `Int`; fractional, NaN or infinite host values are
outside that input domain, rather than proven rejected by a production parser.
Tool signatures have production admission, while arbitrary host `FnRegistry`
costs do not. Total JS sums must stay in the exact safe-integer envelope and native
sums below the target `usize` maximum. The `UInt64` lemma covers that width only;
the generic JS binary64 addition bridge and 32-bit native bridge are unproved.
The entire activation/retry/nested-call maximum charge still needs derivation.
Modeled work is not elapsed time, token use, provider billing or physical resources.

## Evidence and trusted inputs

The pinned toolchain is Lean 4.34.0. Only its standard library is imported. The
integrator owns toolchain archive/runtime-closure identity, fresh staged builds,
resource/process supervision and proof admission. Normal Lean checking verifies
new proof terms while trusting the pinned imported library. A diagnostic
whole-import `--trust=0 --memory=512` attempt failed its kernel memory limit; it
does not establish whole-import rechecking and is not silently replaced by a
claim that normal mode did so.

The worker's direct compile and diagnostic axiom listing checked all authored
theorems. The listing reported only `propext`, `Classical.choice` and `Quot.sound`,
with no warnings or errors. The binary64 addition witness uses those three
standard axioms and no native reduction axiom. No `sorry`, authored axiom,
`native_decide` or external solver certificate is part of the theorem sources.
These observations are not the release gate: the integrator independently
inspects theorem constants and collects their transitive axioms from the actual
environment, checks the inventory, and fails closed on stale or missing evidence.

The preceding complete 372-theorem foundation gate passed before this numeric
extension. The source inventory now contains 432 authored theorems across 17
domains. The 60-theorem injectivity/interval candidate had fresh source builds,
independent review, and actual axiom collection over all 146 theorem declarations
in its two modules, including private and compiler-generated declarations. Nine
additional independent boundary witnesses passed; altered precision and reversed
endpoint-parity controls failed as expected. Namespace integration receives a
fresh focused build and axiom audit. These focused checks do not replace the
integrator's complete gate and independent evidence re-admission for the resulting
source tree, including vectors and the repository's admission controls.

The exact subnormal boundary witness uses theorem-local `maxRecDepth=4096` and
`exponentiation.threshold=2048` to reduce its bounded 1074-bit rational expression.
It retains the global `--threads=1 --memory=1024 --json` command settings and time
bound. The midpoint algebra uses kernel-checked `grind` proof terms and the pinned
standard library's rational ordered-ring instance. A preceding 512 MiB attempt failed
with kernel memory exhaustion, including after narrowing unused imports. That failure is retained, not counted as a passing
resource qualification. This bound concerns Lean's configured memory check; it
is not an independent operating-system RSS or whole-process-tree memory theorem.

`Vectors.lean` computes its report from the authored binary64, text and own-map
functions. Invoke the pinned Lean with `--run Algal/Core/Vectors.lean` from the
staged project after building the library. It emits one JSON report with contract
`algal.lean-core-vectors.v1`; bit patterns are decimal strings to avoid JSON
numeric rounding. It covers finite/rejected patterns, signed zero, supplementary
and combining strings, index boundaries, key order, duplicates, own special keys,
absent fields and present null. The output is sampled executable oracle evidence;
its JSON serialization is not used to prove the canonical codec. Independent
Bun/native comparisons and exact source/runtime bindings are owned by the adapter.

`StringVectors.lean` emits contract `algal.lean-string-vectors.v1` with a `strings`
array of `{text, bytes}` records computed by `JsonString.quoteBytes`. Its 56
ordered inputs include all ASCII controls, escape delimiters, UTF-8 width
boundaries through U+10FFFF, supplementary and combining characters, U+FEFF and
mixed strings. The adapter must independently bind those input identities and
compare exact output bytes. Neither successful samples nor the model's inverse
theorem alone prove correspondence to Bun or native string serialization.

Full Phase09 closure requires the missing codec/composition proofs and appropriate
production correspondence evidence, or a separately reviewed change to the plan.
The current inventory keeps those criteria unmet.
