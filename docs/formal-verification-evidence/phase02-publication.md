# Phase02 publication evidence

This report covers the publication lane on top of `82f672d6e43fcc8d6757a78161b8d2dd2c96c1f9`.
It records focused implementation evidence, not a completed formal proof or a
replacement for the integrator's final repository gate. Application custody
and its mixed-runtime process tests have a separate owner and report.

## Implementation relation

`src/durable-fs.ts` and `crates/algal/src/durable_fs.rs` surround actual mkdir,
write, file sync, link, rename, directory sync and unlink operations with
before/after checkpoints. An after event follows a successful operation; a
failed link with an existing winner emits no successful link event. Tests can
fail a checkpoint but cannot make the helper skip I/O or report fake success.
The Bun probe is async-local and absent from the package entry point; the
native probe exists only in test builds. Events do not enter product receipts.

Fresh publication establishes the absolute physical ancestor chain before
installing a synced temporary, then synchronizes the changed destination
directory. Existing visible ancestors receive the same barriers. Retained
immutable winners are parsed and identity-checked while their descriptor is
open, then that exact inode and the required ancestor bindings are synced.
Store, host-state and mailbox retain their respective admission rules.

Mailbox receive synchronizes an immutable consumed record before removing
pending evidence. It then syncs pending deletion and explicitly releases and
syncs its own lock before returning. Matching dual markers fail closed in
receive, readiness and send retry; conflicting or malformed evidence rejects.
No marker is automatically selected or removed during reconciliation. Missing
admitted directories reject rather than being recreated. Lock release is
disarmed before unlink so a later failure cannot delete a successor's lock.

## Source/model differences and assumptions

- The crash-image reducers in `src/durable-fs.test.ts` and native
  `durable_fs::tests` maintain separate volatile/durable directory bindings
  and inode contents. They consume observed successful production I/O, use a
  declared durable fixture root, reconstruct a fresh tree, and reopen the
  actual Store, host-state or Mailbox reader. The reducer is an executable
  model; it is not a power-loss simulator or a theorem about OS behavior.
- File and directory sync semantics, stable filesystem roots/mount mappings,
  cooperating writers and immutable namespace ownership remain assumptions.
  Ancestor aliases are resolved; managed roots/namespaces retain caller guards.
  Arbitrary imported or legacy dependency graphs are not retroactively
  qualified by reading a record or updating a head.
- Negative controls remove a required barrier class, including all repeated
  syncs for a necessary directory binding. They do not claim that every
  individual redundant sync is essential. Controls cover file contents,
  retained winning inode, each ancestor binding, destination publication,
  mutable replacement, consumed publication, pending deletion and lock release.
- Receive interruption prefixes include four deterministic independent
  background-binding schedules (neither, pending, consumed, both). Every
  prefix retains at least one delivery witness; duplicate or locked images
  reject, and completed images retain consumed evidence with no pending/lock.
  This bounded corpus is not an exhaustive filesystem refinement proof.
- Native `OwnerLease::Drop` still ignores marker cleanup failures. SQLite
  provides live authority release; a retained recognized v2 marker requires
  validation and bounded archival by a later holder. The mailbox's explicit
  clean-lock acknowledgment property does not apply to `OwnerLease`.
- An error after publication remains uncertain. Owned temporary cleanup
  cannot undo the published record or remove another caller's file. Retained
  mailbox lock residue is never automatically cleared.

The authoritative contract is in `spec/v1/organism.md` (Local filesystem
publication and Capability mailboxes) and `spec/v1/process.md` (Publication,
locking, and failure). TLA model checks and their source abstraction mappings
are separate evidence; this report does not promote ledger obligations.

## Red and green evidence

Before the repair, three Bun tests for matching pending/consumed markers
failed because receive, readiness and retry resolved successfully. The native
`dual_delivery_markers_fail_closed_without_reconciling_evidence` test failed
because receive returned the message. The repaired tests reject and preserve
both records, then reject a conflicting consumed identity without mutation.

During integration, a new missing-layout test reproduced silent recreation
through the shared publisher in both runtimes. An explicit existing-layout
guard repaired it. The existing native FIFO test caught a changed rejection
code; the Store now preserves its established `BUDGET_EXHAUSTED` admission
before the generic publisher, without replacing the special file.

Final focused commands and results:

```sh
bun test src/durable-fs.test.ts src/store.test.ts src/host-state.test.ts src/mailbox.test.ts --timeout 20000
# exit 0: 42 pass, 0 fail, 525 assertions

env RUSTC=/Users/bg/.rustup/toolchains/1.97.1-aarch64-apple-darwin/bin/rustc \
  RUSTDOC=/Users/bg/.rustup/toolchains/1.97.1-aarch64-apple-darwin/bin/rustdoc \
  CARGO_TARGET_DIR=/private/tmp/algal-phase02-publication-target \
  rustup run 1.97.1 cargo test -p algal --locked --test cache --test file_admission --test mailbox_admission
# exit 0: cache 11, file_admission 9, mailbox_admission 11

env RUSTC=/Users/bg/.rustup/toolchains/1.97.1-aarch64-apple-darwin/bin/rustc \
  RUSTDOC=/Users/bg/.rustup/toolchains/1.97.1-aarch64-apple-darwin/bin/rustdoc \
  CARGO_TARGET_DIR=/private/tmp/algal-phase02-publication-target \
  rustup run 1.97.1 cargo test -p algal --locked --lib durable_fs::tests
# exit 0: 7 passed; other library tests deliberately filtered

env PATH=/Users/bg/.rustup/toolchains/1.97.1-aarch64-apple-darwin/bin:/usr/bin:/bin:/usr/sbin:/sbin \
  RUSTC=/Users/bg/.rustup/toolchains/1.97.1-aarch64-apple-darwin/bin/rustc \
  RUSTDOC=/Users/bg/.rustup/toolchains/1.97.1-aarch64-apple-darwin/bin/rustdoc \
  CARGO_TARGET_DIR=/private/tmp/algal-phase02-publication-target \
  /Users/bg/.rustup/toolchains/1.97.1-aarch64-apple-darwin/bin/cargo-clippy clippy \
  -p algal --locked --lib --test cache --test file_admission --test mailbox_admission -- -D warnings
# exit 0
```

The first Clippy invocation through Cargo resolved Homebrew's `cargo-clippy`
despite explicit `RUSTC`, producing an incompatible-compiler error. The final
command uses the installed absolute pinned Clippy executable and pinned PATH;
no shared target was cleaned or altered to suppress the failure.

Strict focused TypeScript compilation and ESLint passed for all eight owned
Bun source/test files. `rustfmt --edition 2024 --config skip_children=true
--check` passed for the six owned native files. Owned `git diff --check`
passed. Native targets are isolated under `/private/tmp`; no broad build or
aggregate repository gate was run by this worker.

Raw local logs are retained as `/private/tmp/algal-phase02-publication-bun.log`,
`algal-phase02-publication-native-final.log`,
`algal-phase02-publication-images-final.log`, and
`algal-phase02-publication-clippy-final.log`. A task-local JSON inventory binds
their hashes and the owned input files; it is a worker report, not a licensed
proof receipt or a replacement for final exact-tree integration evidence.
