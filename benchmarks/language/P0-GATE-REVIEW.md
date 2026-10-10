# P0 contract gate review, 2026-10-10

Checkpoint status before the CI handoff: the listed local fixture repairs pass
their focused tests; the P0 integration gate has not passed. This is a proposal
on `codex/p0-contract-freeze-20261009`, based on
`bc6ddae6e426b2727a3ce7e07158b248bae74309`. At this checkpoint the
worktree was partly staged and partly unstaged; nothing was committed or
published. There was no P0 pull request, independent positive review, or
PR-head `Required` result. P1 and P2 remain blocked. For later publication
and check status, consult the pull request rather than this historical record.

## Repair and evidence scope

- The checked `unknown` corpus now supplies expected identities to the result
  parser. Accepted actor and project cases carry their respective *observed*
  artifact, interface, event, project, and closure digests. Each is parsed as
  a digest and compared with the pinned corpus expectation. The fixture test
  also recomputes these values from the input files. Altered observed digests
  fail. These synthetic values are not observations of a compiler or runtime.
- The ten invalid JSON fixtures emit a failure code with a structured path.
  A byte scanner locates that path in the source file; the test compares the
  emitted code and exact UTF-8 span to the corpus rather than only checking
  that the expected span fits inside the file. Four previously placeholder
  spans now point to the offending token. Missing paths, excessive source
  bytes, depth, and path length fail in tests.
- The smoke result still has 12 cases, 360 synthetic samples, and 24 derived
  aggregates. Its checked corpus names a synthetic machine profile. A real
  scorecard requires a reviewed corpus revision and actual measurements.
  Source bytes and a compiler mapping are not retained, so the source digest
  is a claim, not evidence of origin. No event-loop runtime was changed.

## Local validation on the repaired worktree

- `bun install --frozen-lockfile`, focused contract tests (20 tests, 221
  assertions), `bun run docs:check`, `bun run typecheck`, `bun run lint`, both
  Git diff whitespace checks, `cargo fmt --all -- --check`, `cargo clippy
  --workspace --all-targets --locked -- -D warnings`, and `cargo build
  --locked`: passed. The task-owned Bun install cache was removed after
  installation because `eslint .` scans it as repository source.
- `bun scripts/native-parity.ts`, `bun scripts/process-parity.ts`, `bun
  scripts/store-parity.ts`, and `bun scripts/cli-parity.ts`: passed against
  the built native binary. These compare existing runtime surfaces, not an
  event-loop implementation.
- `bun run check`: timed out at 600 seconds. Its typecheck and lint stages
  passed, but the test stage reported loopback `EADDRINUSE` in
  `src/vendor-cli.test.ts`. The aggregate gate is unresolved.
- `cargo test --workspace --locked`: compiled and ran many tests, then failed
  in the HTTP integration test. A focused run found both tests unable to bind
  a loopback socket (`Operation not permitted`). Git-backed dependencies
  could be fetched with `CARGO_NET_GIT_FETCH_WITH_CLI=true`; the default
  libgit2 fetch failed with SSL handshake `-9808`.
- `bun scripts/application-parity.ts`: timed out at 600 seconds without a
  result. Neither it nor `bun run check` is counted as passed. The optional
  `check:copy` script is not present in this repository.

## Native executor revalidation, 2026-10-10

On the same branch and base commit, `bun install --frozen-lockfile --offline`
passed. The contract fixture test passed (20 tests, 221 assertions), as did
`bun run docs:check` and `bun run typecheck`. The first `bun run lint` failed
only on files inside the task-owned `.cache/bun` populated by the install.
After removing that cache, `bun run lint` passed. No tracked runtime code was
changed during this pass.

A direct Bun listener on `127.0.0.1` with port `0` failed with `EPERM` in this
native executor. This reproduces a loopback permission failure before any
repository server starts. It does not diagnose the earlier `EADDRINUSE` result
as a project defect. This pass did not rerun `bun run check`,
`cargo test --workspace --locked`, or `bun scripts/application-parity.ts`;
focused fixture checks do not replace those gates.

## Independent P0 review revalidation, 2026-10-10

The independent reviewer reran `bun test benchmarks/language/contract.test.ts`
(20 passed, 221 assertions) and `cargo fmt --all -- --check` (passed).
`bun run check` timed out after 600 seconds during `bun test`: typecheck and
lint passed, then `src/vendor-cli.test.ts` reported loopback `EADDRINUSE`. The
aggregate gate is unresolved. Default `cargo test --workspace --locked`,
`cargo clippy --workspace --all-targets --locked -- -D warnings`, and
`cargo build --locked` could not fetch `apple-foundation` through libgit2
(SSL handshake `-9808`). With `CARGO_NET_GIT_FETCH_WITH_CLI=true`, build and
clippy passed; workspace tests failed in `tests/http.rs`. A focused
`cargo test -p algal --test http --locked -- --nocapture` with the same Git
setting failed both tests at the loopback bind (`Operation not permitted`).

Against the newly built native binary, `bun scripts/native-parity.ts` passed
(86 examples and 12 habitat-budget cases), `bun scripts/process-parity.ts`
passed (58 steps), `bun scripts/store-parity.ts` passed (15 steps), and
`bun scripts/cli-parity.ts` passed (65 cases). These are incumbent surfaces,
not event-loop parity. `bun scripts/application-parity.ts` again timed out at
600 seconds with no result. Do not count either timeout as a pass.

The review found a separate contract-fixture gap: `checkEventLoopBytes` calls
`JSON.parse` before its `FixtureError` handling, so malformed JSON or invalid
UTF-8 throws a native exception instead of the documented `EVENT_LOOP_PARSE`
code; the ten invalid files are structurally invalid but syntactically valid.
Normalize that failure and add a deterministic malformed-byte test before
claiming all malformed inputs return stable codes. The one bounded repair in
this review is this evidence update, which makes the independent failures and
missing syntax coverage explicit; it does not repair the parser.

At that review checkpoint, PR-head and merged-main checks were unavailable
without publication; publication was outside that reviewer's bounded task.
Do not integrate this draft or begin P1/P2 until the remaining checks pass and
an independent positive review and PR-head gate are satisfied. This record is
contract-fixture evidence, not performance, source-provenance, event-loop
runtime parity, or cumulative-skill evidence.

## Malformed-byte repair and bounded revalidation, 2026-10-10

The one diagnosed P0 repair cycle normalized malformed JSON and invalid UTF-8
before parsing a behavior. The byte-fixture checker now reports
`EVENT_LOOP_PARSE` with a span over the complete 1 to 16,384 byte source;
non-object JSON roots receive the same span. Empty and oversized files still
fail the source-byte bound without a span. This choice is agent-decided, owner
may revisit. Tests cover malformed syntax, trailing text, invalid and truncated
UTF-8, scalars, a nested non-object root, both source-size failures, and the
accepted fixture. The ten pinned invalid files remain valid JSON and have
unchanged expected diagnostic paths and digests. The earlier independent
review finding about malformed bytes is repaired, but no independent positive
review of these new bytes has occurred.

On `codex/p0-contract-freeze-20261009` at local HEAD `bc6ddae6e426`,
`bun install --frozen-lockfile` passed. The final focused test passed with
21 tests and 233 assertions. `bun run docs:check`, `bun run typecheck`,
`bun run lint`, both Git whitespace checks, and `cargo fmt --all -- --check`
passed. With Git-backed Cargo fetch through the CLI and the rustup toolchain,
`cargo clippy --workspace --all-targets --locked -- -D warnings` and
`cargo build --locked` passed. After that build, native parity passed
(86 examples, 12 habitat-budget cases), process parity passed (58 steps),
store parity passed (15 steps), and CLI parity passed (65 cases). The last
small test edit checked deeply nested non-object roots and did not change the
native runtime or any parity input.

**P0_CONTRACT_GATE_FAILED.** `bun run check` timed out at 600 seconds during
Bun tests after `src/vendor-cli.test.ts` reported loopback `EADDRINUSE`;
its typecheck and lint stages passed. The Cargo workspace test failed in
both HTTP integration tests; a focused `cargo test -p algal --test http
--locked -- --nocapture` diagnosed loopback bind `Operation not permitted`.
`bun scripts/application-parity.ts` timed out at 600 seconds without output.
The stopped commands settled as timeouts and did not add tracked changes.
These are unresolved gates, not passing evidence; no P0 PR-head `Required`
result or independent positive review existed at that checkpoint. Keep P1/P2
blocked. The no-separate-runtime choice remains agent-decided, owner may
revisit; the synthetic smoke timings are not measured performance. No commit,
push, PR, or integration occurred in this repair.

## Delivery handoff checkpoint, 2026-10-10

A later reviewer added non-empty, quote-inclusive spans for empty JSON keys
and values, with a separate `span.test.ts` and a corrected benchmark README.
On the uncommitted draft, `bun test benchmarks/language/span.test.ts
benchmarks/language/contract.test.ts` passed (23 tests, 240 assertions), as
did `bun run docs:check`, `bun run typecheck`, `bun run lint`, and
`git diff HEAD --check`. This does not resolve the full Bun, Cargo HTTP, or
application-parity gates. The local executor cannot bind loopback, so the
authorized delivery handoff may publish a **draft** pull request to run CI
on its exact head. A green `Required` would close the CI gate, not establish
source provenance, measured performance, event-loop runtime parity, broader
coverage, or independent positive review. No auto-merge is authorized by this
failed P0 verification; leave the draft blocked until a new verification
recommends integration.
