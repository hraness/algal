# assurance — Phase 17 release assurance lane

This lane keeps the property ledger's evidence bookkeeping honest as the tree
changes. It defines the bounded `algal.assurance-manifest.v1` contract
(`manifest.ts`), validates the committed manifest (`manifest.json`) against the
parsed ledger and the live tree, and checksum-verifies the toolchain pins
(`toolchains.ts`).

## What the manifest records

One claim per ledger property, in ledger order, carrying:

- `id` — the `AAA-NN` property identity;
- `evidence` — the evidence class, drawn from the same `EVIDENCE_STATES`
  lattice as `verify/lib/claims.ts` (`not-started`, `observed`, `tested`,
  `finite-checked`, `proved-model`, `proved-implementation`, `qualified`). The
  schema admits the whole lattice; consistency then enforces the class each
  suite can actually produce;
- `suite` — the named suite backing the claim, or `null`;
- `required` — the ledger's required-evidence flag, mirrored;
- `results` — content-addressed bindings
  (`verify/results/<sha256>/manifest.json` with the digest bound into the
  claim), so a claim cites exact retained bytes, not a filename;
- `inputs` — the governing input set: the property's ledger `sources` ∪
  `specs` path/digest bindings.

Top level, the manifest binds `verify/properties.json`,
`verify/toolchains.json`, `verify/toolchain-distributions.json` and the whole
governed + verification input set (`inputDigest` = `hashJson` over
`inputBindings` minus the manifest file itself — the single documented
self-reference exclusion, since a file cannot bind its own future bytes).

## Honesty checks

`checkManifestConsistency` is a pure check: the manifest must mirror the
parsed ledger exactly (same properties, same order, same class, suite, required
flag and result paths) and every claim's governing input set must equal the
property's ledger bindings. Ready evidence (`tested` and above, or `required`)
must name a **READY** suite from `verify/lib/suites.ts`, cite at least one
result, and state exactly the class `suiteEvidenceClass` assigns to that
suite — the same ceiling the ledger enforces, so a suite whose scope is
model-level (`lean-*` → `proved-model`) cannot back `proved-implementation`,
and no in-band suite can back `qualified`. Pending and observed claims may
name planned suites but cannot cite results.

`checkManifestEvidence` re-reads the tree: the three recorded digests and the
full input digest must match the current files, every governing input must
still hash to its recorded value, and every claimed result must resolve to a
retained `algal.retained-evidence.v1` container whose recorded suite matches
the claim and whose classification is `admitted`. Resolution is deep:
`readRetainedEvidence` re-inventories the retained raw bytes and byte-compares
the reconstructed manifest, so a tampered or truncated archive fails — not
merely a missing path.

`runAssurance` additionally requires the committed manifest to equal
`deriveManifest` output in canonical form, so the manifest is a function of
the ledger and the tree rather than an independently editable claim.

## Toolchain pins

`checkToolchains` parses both toolchain contracts (closed, bounded) and for
every `available` tool with a `sha256` pin hashes every absolute-path element
of the recorded command; the pin must match at least one provisioned artifact.
A pin that names no provisioned file is reported `not-provisioned` in the
report — recorded, never silently verified. `bun` has no file pin by design:
its check binds `process.execPath` bytes and `Bun.version`, the same identity
the runner records in every result binding. `rust` resolves `rustup` and reads
`rustup toolchain list` (a read-only probe that cannot install anything) to
confirm the pinned toolchain is provisioned. `planned` tools must carry no
pin. Distributions must name an available tool at the same version.

## Limits

- The manifest is bookkeeping: it records the ledger's own evidence state and
  pins it to the tree. It proves no property and does not re-run any suite.
- Mirrors the ledger: a claim cannot exceed the ledger status, but the check
  also cannot catch a ledger that is itself dishonest about *unclaimed* gaps.
- Result resolution proves the retained bytes match their manifest; admission
  semantics (`readmit`) are the producing suite's contract, replayed here with
  a null readmission — integrity, not re-qualification.
- Toolchain pins verify bytes, not publisher signatures; distributions record
  where the bytes came from. `git` is invoked by the runner but is not a
  pinned tool. Probes never install or mutate toolchains.
- Hosts without the provisioned verification tools report
  `not-provisioned` for the affected pins rather than failing; suites that
  require those tools still fail on their own.
