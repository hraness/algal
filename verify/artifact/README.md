# Expression artifact identity

The artifact gate rebuilds `src/algal_expr.wasm` from a reviewed recipe and
requires exact byte equality. It also builds a fresh native expression driver
and compares the full output of the 30 boundary vectors against the freshly
built WASM, including errors, fuel, rounding, Unicode and malformed raw bytes.
This qualifies those artifacts and examples; it does not prove the evaluator
or compiler correct for every input.

This native driver builds the expression package in isolation. The complete
native CLI can unify additional dependency features, so its separately required
native parity gate remains necessary; this pair does not substitute for it.

Install Rust 1.97.1 with its `wasm32-unknown-unknown` target, Bun 1.3.14 and the
ordinary native linker. Populate the locked dependency cache once:

```sh
cargo fetch --locked
ALGAL_EXPR_TOOLCHAIN=1.97.1 sh scripts/build-expr-wasm.sh
bun verify/artifact/run.ts check
# Once the current ledger is refreshed after review:
bun scripts/verify.ts --suite artifact --json
```

`build` updates the WASM and its adjacent closed manifest. `check` first rejects
a stale source, lockfile, builder, recipe or artifact binding, then performs an
independent clean build and exact comparison. Initial binding admission hashes
bytes without compiling them; WASM compilation and export inspection occur only
inside the supervised build child. A conflicting
`ALGAL_EXPR_TOOLCHAIN` rejects; there is no automatic fallback. These are
development tools, with no additional runtime package dependency.

Each invocation owns a fresh temporary workspace, target directory, home and
Cargo source cache. It copies the original workspace/lockfile/manifests and
complete expression crate. The unbuilt native workspace member has an empty
library source solely to retain locked workspace resolution. The compiler is
invoked by absolute path with a fixed environment, offline, locked, with
incremental compilation disabled and temporary/toolchain paths remapped.
User Cargo configuration and compiler wrapper/flag environment variables are
not inherited. No existing target artifact is reused.

The six compiled registry archives are copied and checked against exact
checksums before Cargo unpacks them into the fresh source cache. The gate
checks Cargo's actual compiled package inventory and successful completion,
retains raw Cargo JSON, and records the extracted source digests. Ambient
index/git metadata can resolve the unbuilt workspace member; it is not
executed as part of the expression package. Dependency build scripts, Cargo's
archive admission and the pinned compiler are trusted build components.

The receipt records and rechecks the compiler executable, Cargo, rustdoc,
compiler runtime libraries, host and WASM standard libraries and bundled
linker files, plus the actual Bun builder binary and version. The host compiler identity remains in the execution receipt;
the committed manifest records the portable recipe and artifact identity.
System libraries, native linker/SDK behavior and the operating system remain
assumptions. Hashes identify files; they do not establish compiler soundness
or publisher attestation.

Compilation and target comparison have separate 120-second process-group
deadlines, bounded output and observed cleanup requirements. A timeout or
missing cleanup witness fails. The owned temporary directory is removed after
observed process cleanup; uncollected runs retain their namespace and bounded
diagnostics because a writer may still be live. An interrupted update can leave a stale adjacent manifest;
subsequent checking rejects that state. Each output uses a separately owned,
exclusive random temporary before rename; concurrent calls cannot share a
temporary or remove a preexisting entry.

The Linux and macOS CI jobs must independently reproduce the same bytes and
retain their execution receipts. Local macOS results alone do not qualify
Linux. No normalized-byte fallback is permitted.
