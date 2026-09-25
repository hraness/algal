# Boundary regressions

`bun scripts/verify.ts --suite boundary --json` runs the focused Bun
admission regressions and compares actual native and committed-WASM
expression byte entry points. Build the native test driver first with the
repository's pinned Rust toolchain:

```sh
RUSTC="$(rustup which --toolchain 1.97.1 rustc)" \
RUSTDOC="$(rustup which --toolchain 1.97.1 rustdoc)" \
rustup run 1.97.1 cargo build --locked -p algal-expr --example verification_boundary
```

The driver accepts bounded fixture files, invokes the production
`eval_json`/`check_json` functions and has no replacement evaluator. The
Bun comparison passes identical raw bytes into the WASM ABI without first
parsing or decoding them. It requires byte-identical full responses and
independent expected results for wide indices, rounding and string values;
malformed raw inputs must reject in both targets. Temporary files and
children belong to this invocation only. Input files must remain unchanged.

Output retains each input hash and full result plus both artifact hashes.
This is finite regression evidence. Artifact hashes identify the binaries
tested, but do not by themselves prove source provenance; the separate
artifact gate owns that link. The result envelope cannot promote a ledger
property to a theorem. Missing native artifacts, skipped tests, malformed
summaries, mismatched output, deadline or output exhaustion fail the suite.

The native graph, adaptation and storage regressions are also required in
the phase and repository Cargo gates. This suite does not substitute Bun
tests for native tests or claim uniform acceptance of legacy Bun-only
escaped lone surrogates. That compatibility boundary is documented in
`spec/v1/organism.md`.
