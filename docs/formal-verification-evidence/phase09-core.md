# Phase 09 semantic-core milestone

Phase 09 remains in progress. The current milestone checks 224 authored model
theorems across eleven domains, including recursive normalization and an actual
quoted-string UTF-8 byte codec. It does not prove the whole production system or
the complete canonical JSON byte codec correct.

## Executed evidence

The [retained raw receipt](../../verify/results/1b11c082365f4ecb9f07f92152386a0640208595bbbed6d7bddd6c7d6fbf3793/core-model.json)
has SHA256 `1b11c082365f4ecb9f07f92152386a0640208595bbbed6d7bddd6c7d6fbf3793`.
It was independently re-admitted against its exact source and installed runtime
bindings. It records 27 supervised commands, their actual output, exit status and
observed process-group cleanup. Three intended rejection controls exit 1; they
are required failures with matching diagnostics, not ignored build failures.

The adapter stages source into a fresh project and home, builds each module
sequentially with the pinned Lake, then inspects the compiled environment through
`Algal.Audit`. Every registered export must be a theorem declaration, and every
transitive axiom must belong to the reviewed standard set. The actual union was
`propext`, `Classical.choice`, and `Quot.sound`. The 224 declarations, their types
and individual axiom sets are retained in the raw receipt. A separate environment
enumeration audits all 842 theorem constants defined by those exact modules,
including private and generated declarations. It uses defining-module identity,
without namespace or internal-name filtering. The claimed inventory must be a
subset with matching defining modules; these two counts are not interchangeable.

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
and bounded output. The Lean memory option is not a measured OS RSS cap.

The 512 MiB diagnostic attempts failed; no success at that bound is claimed.
An initial broad `import Lean` also exceeded 1024 MiB in the audit extension.
Its imports were narrowed to the actual elaboration, axiom-collection and JSON
modules, and the complete fresh gate then passed. The source proofs were not
weakened to repair those resource failures.

The native example was built with pinned Rust 1.97.1 using
`cargo build --offline --locked -p algal --example verification_lean_vectors`.
Its observed binary SHA256 is
`921483559b5740eac93462b31133722b6381bc7b8f0e3c50eff6e5e534f23180`.
The caller's source/build correspondence remains a separate obligation; a binary
hash alone does not establish it.

## Scope and reproduction

See [the theorem inventory](../../verify/lean/Algal/Core/theorems.json) and
[core scope](../../verify/lean/Algal/Core/README.md) for each domain's statements,
admitted and rejected witnesses, and unmet criteria. General key permutation and
extensional own-map projection are proved, including duplicates and last-wins
histories. Recursive normalization is sound, complete and idempotent with respect
to an independently defined observable equivalence. The structural token codec
is not complete ECMAScript JSON text. The quoted-string fragment now has a real
UTF-8 byte inverse; its strict decoder need not accept every alternative legal
JSON spelling. Full JSON delimiter/number composition, shortest decimal
rendering/parsing, raw input admission and production refinement remain separate
work. Schema/byte-size predicates and sane
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

Earlier 153- and 199-claim receipts remain retained as historical milestones.
Their source bindings were invalidated by later normalization, byte-codec and
adapter changes; they are not substituted for the current gate.
