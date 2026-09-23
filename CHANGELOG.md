# Changelog

Entries are seeded from the GitHub release notes for each tag
(`gh release view <tag>`); the release page remains the authoritative record,
including archive checksums and qualified source commits. Native semver stays
`0.2.0` across the `v0.2.0-vm.N` prereleases; the embedded build identity and
the installed package record distinguish them. The receipt `runtime.version`
wire constant (`0.1.0`) is independent of these package versions.

## Unreleased

- Launch polish: the TypeScript package is `@hraness/algal` 0.2.0 and states
  that it is Bun-only; test files and fixtures are excluded from the npm
  tarball; repository, homepage, and bug-tracker metadata added.
- Both CLIs reject `--gateway-model` without a credential before running and
  explain `EFFECT_UNBOUND` failures on stderr (requested route, admitted
  executors) without changing receipt bytes.
- `suite` resolves bundled transports relative to the examples directory's
  parent in both runtimes; the native CLI names the missing examples path.
- Native CLI: one-line help on every subcommand and option, input errors
  name the path, `.algal` source files point at `bun cli.ts compile`.
- Both CLIs warn on stderr when a credential falls back to the plaintext file
  store; exit codes follow one rule (0 success, 1 negative result, 2 could
  not run); the Bun CLI names an unknown command.
- Docs: SDK imports use `@hraness/algal`, site anchors link `/tour/`,
  SECURITY.md is advisory-only and names executor/tool config as trusted
  input, and this changelog exists.
- Milestone-6 verification: the adaptive-inventory example's test now asserts
  the documented evidence counts, host-process identities, per-inhabitant
  zero model-call budgets, emitted artifact names, passive report markers,
  evidence truncation flags, and the SHA-256 executable pin; the npm tarball
  also excludes colocated test files under `examples/`; the README's
  `algal application` subcommand list now includes `propose`,
  `verify-proposal`, and `select`; the programmable-applications milestone
  record marks the packaged surfaces, native workbench, and second
  application as existing.

## v0.2.0-vm.9 — 2026-09-20

ALGAL VM9: bounded execution and shared design.

- Recursive compilation shares limits across child occurrences: 1,024 manifest
  instances, 4,096 cells, 16,384 edges, 64 MiB normalized manifest bytes.
- Handled failures consume work before recovery effects can execute, matching
  the native runtime.
- Local transport/process inputs reject non-regular files before reading; the
  Bun HTTP transport bounds streamed bytes and body lifetime with strict UTF-8
  admission.
- Initialized host leases avoid redundant bootstrap writes before taking
  custody in both runtimes; incompatible database state is rejected.
- The site adopts the shared Hraness design system.

## v0.2.0-vm.8 — 2026-09-20

Stricter admission, safer retained-state reads, race-safe mailbox creation,
and less repeated evidence serialization.

- Malformed schema declarations are rejected before dispatch; the 1 MiB
  manifest limit applies to raw and normalized documents.
- FIFOs, devices, and symlinked retained state are refused without hanging.
- Mailbox names, exact bounds, and the 1,024-mailbox capacity are admitted
  under shared Bun/native custody; oversized retained messages are rejected
  before a delivery is consumed.
- Source-level compile errors and runtime diagnostics carry exact file spans,
  import frames, structured JSON reports, and nested execution diagrams.
- Opt-in deterministic context elision bounds what the next model call
  receives while retaining complete tool evidence (a byte policy, not a token
  or billing guarantee).
- Upgrade boundary: concurrent mailbox creators sharing a store must all
  implement this release's admission ABI.

## v0.2.0-vm.7 — 2026-09-20

Retain a real on-device model decision, stop for human review, and finish
later with the model disconnected.

- Private change brief: an optional graph asks Apple Foundation Models for a
  bounded summary and holds the exact result for approval or denial.
- One dispatch per Apple effect; a lost response remains uncertain.
- Bun and native enforce the same recursive schema subset and choose failure
  diagnostics in deterministic property order.
- A blocked process retains the original executor error in its diagnostic
  without manufacturing a settled receipt.

## v0.2.0-vm.6 — 2026-09-20

Native workbench and crash laboratory.

- `algal demo start ./my-review` produces `report.html` with the exact
  approval or denial command; no Bun, Cargo, checkout, credentials, or web
  server needed to run it.
- `algal demo prove ./crash-laboratory` kills and joins its own VM child at a
  durable journal barrier; reads recover without repeating the completed
  prefix write, uncertain writes stay blocked.
- Portable evidence export and verification without the source store.
- `doctor` reports build identity; packaging rejects stale binaries.

## v0.2.0-vm.5 — 2026-09-20

Portable process evidence: a process history can be checked on another
machine from one bounded JSON file with the standalone native executable.
Verification admits no live adapter and creates no runnable process.

## v0.2.0-vm.4 — 2026-09-20

Explicit recovery of a coding result whose acknowledgement was lost:
`job prepare-operation` and `job reconcile`, immutable bounded observations,
and read-only reconciliation that never resubmits the coding task. Includes
selected-branch generation and source-annotated execution diagrams.

## v0.2.0-vm.3 — 2026-09-19

Coding repair as a durable, inspectable VM workload, plus installable native
process-kernel packages for Ubuntu 24.04 x86_64 and macOS 14+ Apple silicon.
Dispatched deadlines, interrupted responses, and unknown coding outcomes
remain uncertain; no automatic push, merge, or provider retry.

## v0.2.0-vm.2 — 2026-09-19

Explicit crash recovery across Bun and the Rust VM (ordered effect journals,
exact-intent recovery, SQLite custody that survives process death) and a
read-only PR/CI shepherd. Fixes an early-stdin-close race in both runtimes.
Source only; no packages published.

## v0.2.0-vm.1 — 2026-09-19

Source preview of the ALGAL process VM: bounded typed agent programs that
persist their identity and history, exit, and resume from verified
checkpoints in either runtime, with a cross-runtime release-review
demonstration. Source only.
