# Phase 09 semantic-core milestone

The saved evidence below identifies checkpoint `5e334ed` or an earlier snapshot.
The [upstream integration](upstream-1737.md) requires fresh checks for its changed source.

Phase 09 remains in progress. The final integrated aggregate checked 564 authored model
theorems across twenty domains, including recursive normalization, an actual
quoted-string UTF-8 byte codec, recursive container layout and number-free
canonical byte laws, exact finite binary64 values and ASCII decimal syntax,
finite denotation injectivity, signed interior rounding intervals, and separate
zero/maximum-finite endpoint laws, negative-maximum nearest/strict-nearest
characterizations and conditional signed interior midpoint converses.
It does not prove the whole production system or the
complete canonical JSON byte codec correct.

The final aggregate reran Lean after the directory-allocation scope correction
and independently readmitted the saved raw evidence against the resulting
source and runtime bindings. Earlier checkpoints remain unchanged historical evidence.

## Executed evidence

The [retained raw receipt](../../verify/results/7c0f6d560186b866e93b04c6e53321d6334dd83aad108d1f568b082b313e211c/core-model.json)
has canonical metadata digest `7c0f6d560186b866e93b04c6e53321d6334dd83aad108d1f568b082b313e211c`
and file SHA256 `d32be90ff2bb19539c47b12ff1a45bd23d9ecfa4dfefbd39859e38bca42b5aaf`.
The fresh run was persisted, reloaded from disk and independently re-admitted
against its exact source and installed runtime bindings. It records 36 supervised
commands, their actual output, exit status and
observed process-group cleanup. Three intended rejection controls exit 1; they
are required failures with matching diagnostics, not ignored build failures.

The adapter stages source into a fresh project and home, builds each module
sequentially with the pinned Lake, then inspects the compiled environment through
`Algal.Audit`. Every registered export must be a theorem declaration, and every
transitive axiom must belong to the reviewed standard set. The actual union was
`propext`, `Classical.choice`, and `Quot.sound`. The 564 declarations, their types
and individual axiom sets are retained in the raw receipt. A separate environment
enumeration audits all 1,616 theorem constants defined by those exact modules,
including private and generated declarations. It uses defining-module identity,
without namespace or internal-name filtering. The claimed inventory must be a
subset with matching defining modules; these two counts are not interchangeable.

This integrated snapshot includes upstream `e588f8bc9b0964e5956f4c62e60c14dfbcef171e`
and the reviewed `Algal.Core.NegativeEndpoints` module. Its 81 source bindings
have digest `b378d7c202a6a8353f9d2ce3eb0fcba49bd1b79d86ec2bf2769581f8773f1ba9`;
the complete runtime binding has digest
`fdabd374eeba65c2255acbe692b25ef6bb9d6f0c2690eb8ac41b05ede555fff9`.
Both are checked before and after execution and again during raw readmission.
This receipt includes the corrected directory-scope prose. It does not replace
the separate repository, native, parity or integration gates.

Seven actually executed controls reject: an imported indirect custom axiom,
`sorry`, `native_decide`, a proposition declared as a definition, an invalid proof
of `False`, a missing theorem, and a custom axiom in a module theorem outside the
claimed inventory. Lean 4.34 emits the native control's scoped
axiom as `AlgalControl.native._native.native_decide.ax_1_1`; it is not admitted.
The parser additionally rejects missing/duplicated records, diagnostics, changed
vector inputs, inconsistent output framing and incomplete process custody.
The intentional `sorry` control disables its friendly warning so rejection must
come from the actual transitive `sorryAx`, not warning detection. A strengthened
control-attribution attempt exposed that masking and correctly failed; its
diagnostics remain at the owned `algal-lean-core-fLdJsg` stage. Production modules
do not receive that option. Every axiom control now requires its specific
unreviewed-axiom diagnostic.

The executable model emits nine binary64 patterns, eight scalar-Unicode strings,
17 key/index cases, their canonical ordering, and five own-field lookups. Exact
input identities are required; replacing difficult cases with repeated trivial
ones fails. Computed results match Bun's production value/canonicalization APIs
and a separately built native driver using the production canonical encoder.
This is sampled correspondence. The original model vector output is 2278 bytes,
SHA256 `1f8578b34dfb4faaa2c8da8678af28107304ed48f40cfd57b4b50427e4367156`.

A separate computed report checks 56 exact quoted-string byte vectors against
both production encoders: all 32 controls, quoting/backslash, UTF-8 width and
surrogate boundaries, supplementary scalars, embedded BOM, combining characters
and mixed strings. Its raw SHA256 is
`1be15375dfe46a52de44f0c1b5416e265e6ebb665c5a24f494b15e9247f1d44a`.
The general Lean laws prove round-trip and injectivity for the modeled scalar
string codec; the 56 runtime comparisons remain sampled implementation evidence.

## Qualified tools and limits

Lean 4.34.0 commit `293d5d0c0c3f3dded4688b3ccd6a33939ac5102b` and its
Lake are qualified here on macOS arm64. The immutable distribution inventory
binds 17,711 files, including imported standard-library `.olean` files, totaling
2,860,122,955 bytes. The adapter checks the complete installed inventory before
and after execution. It uses one compiler process at a time, one Lean thread,
the configured Lean memory limit of 1024 MiB, a 120-second deadline per command,
and a 2,097,152-byte output ceiling per command. The Lean memory option is not a
measured OS RSS cap. All limits were unchanged for the 564-theorem run.

The 512 MiB diagnostic attempts failed; no success at that bound is claimed.
An initial broad `import Lean` also exceeded 1024 MiB in the audit extension.
Its imports were narrowed to the actual elaboration, axiom-collection and JSON
modules, and the complete fresh gate then passed. The source proofs were not
weakened to repair those resource failures.

The native example was freshly built by the integration owner with pinned Rust
1.97.1 and offline locked Cargo inputs, then copied to the frozen artifact
`/private/tmp/algal-integrated-artifacts-bgoo5c2a/verification_lean_vectors`.
Its 1,637,000 bytes have SHA256
`5e2e3d55a14631cfe2ef3b693358284b95c24d1ec4c7a8e470dc9af76d820d56`.
The adjacent build manifest binds 98 native input files, exact `rustc -vV` output
and `/private/tmp/algal-integrated-native-artifacts-build.log`; all 98 source
hashes and the frozen artifact bytes were independently matched before admission.
The manifest SHA256 is
`3a1e7a655b6f1c87e9a0ffd57c5e056518b56c104d938ff56f5333611d91709c`.
Build provenance remains separate from the binary hash. The final command and
readmission summaries are retained in the [aggregate readmission](../../verify/results/09c0a05c0829a50fd8b0b3b2686070a316f1c78ab32d5ac56cd053b751162ee3/aggregate-readmission.json).

## Scope and reproduction

See [the theorem inventory](../../verify/lean/Algal/Core/theorems.json) and
[core scope](../../verify/lean/Algal/Core/README.md) for each domain's statements,
admitted and rejected witnesses, and unmet criteria. General key permutation and
extensional own-map projection are proved, including duplicates and last-wins
histories. Recursive normalization is sound, complete and idempotent with respect
to an independently defined observable equivalence. The structural token codec
is not complete ECMAScript JSON text. The quoted-string fragment now has a real
UTF-8 byte inverse; its strict decoder need not accept every alternative legal
JSON spelling. ByteFraming proves prefix consumption over actual UTF-8 bytes.
JsonLayout composes actual array/object delimiters, quoted keys and scalar
strings; unconditional round-trip and canonical-equivalence theorems cover all
number-free trees. The arbitrary-number theorems have an explicit unfulfilled
NumberCodec law premise. Those laws alone do not establish decimal grammar,
numeric denotation or shortest spelling. BinaryValue separately proves the exact
signed dyadic/rational denotation of every admitted finite bit pattern, connected
to the pinned Lean binary64 unpack model, with nonfinite rejection and signed-zero
normalization. NumericInjectivity proves the converse for every finite value:
equal exact dyadic or rational values have exactly equal normalized bits,
including negative values and both signed zeros. RoundingInterval proves exact
midpoint-nearest laws for sign-bit-zero interior finite values with two actual
finite neighbors. Independent review rebuilt both new modules, checked nine
extra boundary witnesses, and rejected wrong precision and parity variants.
SignedRounding now extends those interior comparisons to all finite candidates,
including negative values and both zero encodings, through actual bit reflection,
exact rational negation and parity preservation. RoundingEndpoints separately
characterizes the closed symmetric zero cell at plus/minus 2^-1075, with zero
sign supplied explicitly. Maximum finite has a virtual successor 2^1024 that no
finite value denotes. Its open finite endpoint cell differs from nearest-finite
geometry: maximum finite remains nearest beyond the overflow threshold.
Concrete signed dyadic witnesses exercise the pinned round/pack functions below,
at and above underflow/overflow. Independent review checked 18 extra boundary
theorems and eight cleanly rejected false propositions. These results do not
provide a total rational selector, complete partition or universal round/pack
correspondence. NegativeEndpoints adds 45 named theorems: negative maximum's
nearest and strict-nearest half-lines quantify over all finite candidates, while
its finite cell separately excludes overflow. The interior midpoint converses
retain actual adjacent-neighbor hypotheses; they do not construct those neighbors
or select a center for every input. Sign reflection extends the converses to
negative centers. Strict competitors have different bits, so neither signed zero
is strictly nearest because the other zero denotes the same rational value.
The concrete overflow refusal witness is not an all-input rounding theorem.
DecimalSyntax separately gives an executable ASCII numeral parser,
spelling-preserving grammar round-trip and exact decimal rational meaning. These
do not yet connect decimal conversion to binary64 rounding or shortest rendering.
A production number instance, raw input
admission and production refinement remain separate work. Schema/byte-size predicates and sane
host costs remain explicit premises. Hash collision resistance, real host
authority, physical persistence and external effects are outside this core.

Build the native example with the pinned toolchain and a task-owned target, then
set its absolute path in `ALGAL_LEAN_NATIVE_BIN` and run
`bun verify/lean/run.ts`. `recheckLeanCoreEvidence` re-admits the saved command
outputs against current source, tool, input and binary identities. Evidence goes
stale when any bound input changes. Re-admission is not a substitute for a fresh
required integration or release gate. Imported standard-library artifacts,
the Lean kernel and audit extension, the OS and cooperating local checkout/tool
installation are trusted. Whole-import `--trust=0` qualification is absent.

## Historical checkpoints

The earlier [564-theorem checkpoint](../../verify/results/382155e754e36a00273713d70c6fb5c8c1225edb44d8aaf1696c579e1f36d49a/core-model.json)
preceded the directory-scope specification correction. Its 81 bindings have digest
`4ffa8ec2ba85460907ff9cd2e4552a4a1309aab5a56a674730dc20235a8a329f`;
it remains historical and is superseded for the integrated source by the final
aggregate receipt above.

The [519-theorem pre-integration receipt](../../verify/results/00fb3e5aa904a7b3e28e118776b13666d7d00ee6d923f573686996c193076547/core-model.json)
remains retained with its original source bindings: nineteen modules, 1,554
whole-module theorem constants, 35 supervised commands and seven controls.
It used native vector artifact SHA256
`6fbf5df1c1d663a71b511f33be116bc2de889b27931633486f0dc0f9d5d7c1f8`.
It was admitted for that earlier snapshot and does not qualify the integrated
tree. Earlier 153-, 199-, 224-, 279-, 372- and 432-claim receipts also remain
historical milestones; none substitutes for a fresh required gate after its
source bindings change.

The [684-theorem checkpoint on `1a75837`](../../verify/results/f7ea56a1c69c8f494fa7855e8b361075db12a9c661c84d2bb5aa05d5861ff8ff/core-model.json)
is the first aggregate receipt for the integrated `FiniteNeighbors`,
`IntervalSearch`, `RationalBracket` and 37-theorem `RationalSelector` modules,
which bring `Algal.Core` to 24 modules (1,862 module theorems,
seven rejected controls, native vector artifact `6d9f5a78e9d30397b29699cc49f003d659c75381f3cd4e44986e83fe5e4508d5`). It
supersedes the 564-theorem receipt for the integrated source.
