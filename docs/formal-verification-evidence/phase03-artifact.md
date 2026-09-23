# Phase03 expression artifact evidence

The isolated build and an independent clean reproduction both produced the exact
committed WASM bytes:

`sha256:a1c788200feede210cae1b4926c7e2ee5524a814001056d83f2855f77b86eea9`

The artifact is 253,235 bytes, has no imports, and exposes exactly the reviewed
five exports. Both invocations built a fresh native expression driver and passed
all 30 full-response native/WASM comparisons, including errors and fuel. This is
artifact qualification and sampled semantic agreement, not a compiler or universal
evaluator correctness proof.

## Build identity and admission

The recipe pins Rust 1.97.1, commit
`8bab26f4f68e0e26f0bb7960be334d5b520ea452`, LLVM 22.1.6, Bun 1.3.14 and the
`wasm32-unknown-unknown` target. It builds offline and locked in a fresh target,
home and Cargo source cache. The six compiled registry archives are individually
checksum-bound, unpacked afresh and checked against Cargo's actual compiled
package inventory. The execution report records 16 source/build inputs, 128
compiler/runtime files, extracted dependency digests, actual Bun identity and raw
Cargo output. Compiler, build scripts, linker/system libraries and OS behavior
remain trusted.

The parent admits only source/byte metadata; executable WASM compilation occurs
inside the supervised child. Compilation and target comparison have independent
120-second deadlines, bounded output and required process cleanup. Uncollected
commands retain their scratch namespace and diagnostics. Output publication uses
separate exclusive random temporaries, and interruption between WASM and manifest
publication is detected as stale state by the next check.

This native expression driver builds the package in isolation. The complete
native CLI can unify dependency features; its separate parity result below is
required and is not replaced by the 30-vector comparison.

## Validation and review

```sh
ALGAL_EXPR_TOOLCHAIN=1.97.1 sh scripts/build-expr-wasm.sh
bun verify/artifact/run.ts check
# Both exit 0; exact bytes; 30 native/WASM comparisons each;
# compilation and comparison cleanup observed.

bun test --timeout 20000 verify/tests/artifact.test.ts
# 5 pass, 0 fail, 19 assertions.

bun test --timeout 20000 src/expr.test.ts
# 17 pass, 0 fail, 104 assertions.

ALGAL_BIN=/private/tmp/algal-core-native-JnruYt/debug/algal bun scripts/native-parity.ts
# 62 examples passed with receipt verification in both directions.
```

Negative controls copy the real source closure and edit the actual evaluator,
lockfile, shell entry point and builder files while retaining the prior WASM.
Each edit rejects. Another control appends a valid WASM custom section, validates
the altered module under supervision and confirms rejection against the retained
manifest. Wrong toolchain, missing/handwritten metadata and malformed bytes reject.
Concurrent publication preserves a preexisting temporary and leaves no owned
temporary behind.

Independent source review required and re-reviewed supervised WASM inspection,
real-file stale controls, exclusive temporary ownership and cleanup uncertainty.
The final runner passed 70 integrated admission/parser tests with 275 assertions.
The expression crate's 37 unchanged-source native tests were already passed in
Phase01; this phase adds fresh artifact and complete native CLI qualification.
Repository aggregate and release gates remain separate, required final work.

## Retained receipts

- [Isolated build](../../verify/results/36a23d0e9acfe6b8f2597b6332b7f6fe629ca65afe7c25fbd0ec2b66a042fc8f/expression-build.json), content SHA256 `36a23d0e9acfe6b8f2597b6332b7f6fe629ca65afe7c25fbd0ec2b66a042fc8f`.
- [Independent exact-byte reproduction](../../verify/results/d614a5c66a1716a73fe8e8d2e36555850a75f327a26ee3dbb4c974a32cd751fe/expression-reproduce.json), content SHA256 `d614a5c66a1716a73fe8e8d2e36555850a75f327a26ee3dbb4c974a32cd751fe`.

The local receipts qualify macOS arm64 only. The new Linux/macOS CI matrix must
independently reproduce the artifact before either CI environment is claimed as
qualified. There is no normalized-byte fallback and no universal ledger promotion.
