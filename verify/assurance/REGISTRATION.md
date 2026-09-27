# assurance — suite registration

Suite name: **`assurance`**

Phase 17 release-assurance lane. Admits the committed
`algal.assurance-manifest.v1` (`manifest.json`), checks it mirrors the parsed
property ledger one claim per property, resolves every claimed result to
admitted content-addressed retained evidence under `verify/results/`,
re-inventories the retained bytes, and checksum-verifies the toolchain pins in
`verify/toolchains.json` against provisioned artifacts plus the executed Bun
runtime. Cross-checks `verify/toolchain-distributions.json` versions against
the pin set.

## Files added

All files are new; **no existing tracked files were modified** and nothing
outside `verify/assurance/` was touched. No commits were made.

- `manifest.ts` — the `algal.assurance-manifest.v1` types and closed bounded
  parser, `checkManifestConsistency` (pure ledger mirror + suite evidence
  ceiling via `suiteEvidenceClass`), `checkManifestEvidence` (digest
  freshness, per-input currency, retained-result resolution through
  `readRetainedEvidence`), and `deriveManifest` (honest derivation from the
  live ledger and tree).
- `toolchains.ts` — `parseDistributions` for
  `algal.verification-toolchain-distributions.v1` and `checkToolchains`:
  streaming SHA-256 of pinned command artifacts, Bun `execPath`/`Bun.version`
  binding identical to the runner's runtime identity, a read-only
  `rustup toolchain list` probe for the Rust pin, planned-tool pin rejection,
  and distribution/pin cross-checks.
- `run.ts` — `runAssurance(root)` suite entry point (runner-ready; returns
  counts, per-class status histogram, toolchain report and scope string).
- `generate.ts` — `bun verify/assurance/generate.ts` rewrites `manifest.json`
  from the live ledger and tree. Any bound input change intentionally
  invalidates the manifest.
- `manifest.json` — the committed manifest for the current tree.
- `assurance.test.ts` — schema admission, lattice completeness (all seven
  evidence classes parse; consistency rejects claims above a suite's class),
  ledger-mirror drift, READY-suite and retained-result requirements,
  retained-evidence resolution negatives (wrong suite, diagnostic
  classification, tampered raw bytes, renamed container, stale digests),
  toolchain pin checks, and live-ledger validation.
- `SCOPE.md` — scope, honesty model and limits.
- `REGISTRATION.md` — this file.

## Command

```sh
bun test verify/assurance
```

## Registration

The suite is self-contained beyond `bun:test`, `node:crypto`/`node:fs` and
`verify/lib` imports. `assurance` is listed under `PLANNED_SUITES` in
`verify/lib/suites.ts`; wiring it into `runSuite` dispatch is a separate
one-line runner change so this lane does not edit tracked files.

The manifest binds the exact governed/verification input set; after any
governed change regenerate it with `bun verify/assurance/generate.ts` and
re-run the lane.
