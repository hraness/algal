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
| `Text` | Unicode scalar strings encoded into UTF-16 code units. Character and string decoders round-trip; encoding is injective; every unit is below 65536. The executable JS index classifier and key sorter cover numeric-index-first/UTF-16 order; sorting preserves the multiset of keys. |
| `OwnMap` | Finite own-property maps. Last writes win, writes to distinct keys commute extensionally, successful lookup implies a declared own key, and absence differs from a present value representing null. No prototype lookup exists. |
| `KeyOrder` | The unchanged key comparator is total, transitive and antisymmetric for all scalar strings. Actual key sorting is invariant under any list permutation. A sorted finite-map projection identifies exactly equal final own bindings, including duplicate histories; distinct writes commute, while changing a duplicate winner changes the projection. |
| `Json` | Finite trees with finite binary64 numbers, scalar strings and explicit array/object spines. Number normalization is recursively idempotent. A flat postfix structural token stream has a real stack decoder: roundtrip, injectivity, rejection of malformed/nonfinite streams and preservation of array order are proved. |
| `Normalize` | Recursive number, array and own-object normalization. An independent inductive relation compares constructors, signed-zero bits, array positions and recursive last-wins object lookup. Normalization is sound, idempotent and complete for that relation; canonical structural tokens round-trip modulo it and identify exactly equivalent trees. Output object keys are sorted and unique; absence remains distinct from present null. |
| `JsonString` | Actual quoted UTF-8 string bytes. The authored encoder uses the seven ECMAScript short escapes, lowercase control escapes and direct UTF-8 for remaining scalars. Its fragment decoder preserves arbitrary character suffixes; its whole-input byte decoder round-trips every scalar string; byte encoding is injective. Malformed UTF-8 and delimiter rejection have explicit witnesses. |
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
trees. Encoding is injective on normalized trees. This closes recursive semantic
composition; composition with a real JSON byte codec remains unproved.

The remaining full byte codec must implement and prove finite binary64 decimal
rendering and decimal parsing, including shortest output, exponent thresholds,
rounding ties, subnormals, maximum finite values and zero normalization. Lean's
opaque `Float.toString`, `floor`, or `round` cannot supply those proofs. Container framing, raw duplicate parsing, depth/byte rejection and composition
with the semantic normalizer also need proofs. Whitespace and
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

The final worker check compiles all semantic modules, `All`, and `Axioms` in a fresh
temporary import tree with explicit `--threads=1 --memory=1024 --json`; all exited
zero with no warnings or errors. Vectors also ran successfully under that bound.
A preceding 512 MiB attempt failed with kernel memory exhaustion, including after
narrowing unused imports. That failure is retained, not counted as a passing
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
