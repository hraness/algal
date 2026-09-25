# Phase02 application custody and command-runner evidence

This report records focused implementation evidence on top of
`82f672d6e43fcc8d6757a78161b8d2dd2c96c1f9`. It is not the final integration
receipt, a production proof, or a replacement for the repository gate. The
publication helpers and TLA model checks have separate reports and owners.

## Application custody relation

Both services now acquire the retained SQLite owner at
`applications/.creation/pending/ID` for every mutation. The shared namespace
scan ends before this acquisition and before host admission. The named
directory is checked again under primary custody. Existing directories also
require their permanent owner before history or admission; a new directory
and permanent owner are delayed until admission and quota reservation pass.
Both identities remain held through publication. Cleanup precedes public
return, and each later writer checks the selected history under custody.

The change preserves permanent legacy-owner refusal and recognized v2 marker
archival, independent application admissions, failed-creation capacity, and
the 32-name limit. A prepared directory already occupies a slot and can finish
at that limit. Bun errors after a head-write attempt, including lease cleanup
failure, remain explicitly uncertain and reconcile through the exact operation.
Native `OwnerLease::Drop` still ignores cleanup errors; this lane does not
claim an equivalent native cleanup-error reporting guarantee.

The selection hook is outside the short shared lease and before primary
acquisition. It is separate from the existing four durable fault points and
does not enter canonical data. The deterministic schedule is: late writer
selects an absent namespace and pauses; creator publishes H0 and returns; live
writer checks H0 and pauses in admission; late writer resumes; live writer
finishes. Before the repair, both distinct H0 children returned success in all
eight Bun/native assignments. Afterward the late writer encounters live
custody, the live writer publishes once, reopened history is linear, the late
retry is stale, and the live retry is idempotent.

The fleet guarantee requires upgraded cooperating mutating hosts. Taking both
identities excludes one upgraded writer from an older holder; it does not
repair a race between two unfixed older binaries. SQLite, the local filesystem,
OS progress, and trusted host admission remain assumptions. These schedules
are sampled source/model correspondence, not exhaustive refinement or
power-loss qualification.

## Custody red and green commands

The pre-repair command `bun test --timeout 20000
src/application-custody.test.ts` failed its single three-caller test because
the late writer returned success. The same matrix command below exited 1 with
all eight profiles reporting acknowledged siblings. Its native fixture SHA256
was `403dec2ce7a6745fa5a5637a9ab39109c9728dae3345e050c72170676fe835ea`;
the retained red report is `/private/tmp/algal-custody-matrix-red.json`.

Final focused Bun commands:

```sh
bun test --timeout 20000 src/application-custody.test.ts
# exit 0: 6 pass, 31 assertions
bun test --timeout 20000 src/application-crash.test.ts
# exit 0: 5 real SIGKILL cases, 50 assertions
```

The existing lifecycle compatibility run was
`bun test --timeout 20000 src/application-custody.test.ts
src/application.test.ts`: 19 passed and 150 assertions, comprising the 18
existing lifecycle tests and the initial custody regression. The five later
boundary controls are included in the separate final six-test result above.

All native commands below used this exact environment and executable prefix:

```sh
env PATH=/Users/bg/.rustup/toolchains/1.97.1-aarch64-apple-darwin/bin:/usr/bin:/bin \
  RUSTUP_TOOLCHAIN=1.97.1 \
  RUSTC=/Users/bg/.rustup/toolchains/1.97.1-aarch64-apple-darwin/bin/rustc \
  RUSTDOC=/Users/bg/.rustup/toolchains/1.97.1-aarch64-apple-darwin/bin/rustdoc \
  CARGO_TARGET_DIR=/private/tmp/algal-core-native-JnruYt \
  /Users/bg/.rustup/toolchains/1.97.1-aarch64-apple-darwin/bin/cargo
```

The command suffixes and results were:

```sh
test --locked -p algal --lib application::tests -- --nocapture
# exit 0: 17 passed, including full32/33, 40 rejected/unknown names,
# prepared-at-capacity, permanent old owner/legacy markers, parallel admission
test --locked -p algal --test application_crash
# exit 0: 1 parent test exercising 5 real SIGKILL cuts; 1 child fixture ignored
test --locked -p algal --test application_custody --no-run --message-format=json
# exit 0; compiler-artifact.executable identifies the actual native fixture
```

Clippy used the same environment with the absolute executable
`/Users/bg/.rustup/toolchains/1.97.1-aarch64-apple-darwin/bin/cargo-clippy`
and suffix `clippy --locked -p algal --lib --test application_custody
--test application_crash -- -D warnings`: exit 0. This bypasses accidental
Homebrew subcommand resolution without changing the pinned toolchain or
cleaning a shared target.

The final matrix command was:

```sh
env ALGAL_CUSTODY_TEST_BIN=/private/tmp/algal-core-native-JnruYt/debug/deps/application_custody-ab819ce9827f64e1 \
  bun scripts/application-custody-parity.ts > /private/tmp/algal-custody-matrix-green.json
# exit 0: all 8 exact runtime combinations passed
```

The fixture SHA256 was
`64b82d0cc22d9c22494601c88e0cb4369b0499b8e3934f133d66a29f7bf31642`.
All profiles selected initial
`sha256:ab76e89610719d9d38dbaad157d1bba84de9c4b175fe19d967a9dc6efbb8e5b1`
and final
`sha256:fee3057720be7c71cbfb248df81b85a154d2f69a03d3a501968519b679a8b9e3`.
The native test is an intentionally ignored child entry point; running its
Cargo target without the mandatory matrix is not custody evidence. The driver
requires the native artifact, owns each direct fixture child, bounds output
and waits, collects exit and both output EOFs, and only then removes its
temporary directory. Fixtures spawn no descendants.

Owned strict TypeScript compilation, ESLint, rustfmt and `git diff --check`
passed. The custody matrix exercised the converged publication helpers. Later
mailbox missing-layout and native Store special-file rejection fixes do not
change these valid-file paths; the integrator owns fresh aggregate evidence.

## Command-runner counterexample and repair

Actual repeated TLC runs exposed output loss after a target had exited. An
initial independent exit/EOF settlement repair fixed premature rejection of
late end events, but repeated Java still failed. A smaller diagnostic removed
Java entirely: two sequential shell commands delayed their output, and
`Bun.gc(true)` ran while the second command's descriptors were live. On Bun
1.3.14, garbage collection of the earlier subprocess closed the new capture
descriptors after their numeric values had been reused.

The retained `/private/tmp/algal-runner-probe-core/events-fds.jsonl` records:

| Observation | fd 8 | fd 10 |
| --- | --- | --- |
| First command before/after GC | same live socket inode 2341184 | same live socket inode 2341185 |
| Second command before GC | live socket inode 2341229 | live socket inode 2341230 |
| Second command after GC | `EBADF` | `EBADF` |

The second target still reported exit 13, but neither captured data nor EOF
arrived. Keeping old wrappers alive made 12 diagnostic iterations pass; the
repair does not retain wrappers indefinitely. Using the native `Bun.spawn`
extra-descriptor API with socket wrappers reproduced the same reuse failure.
A denied-listener Java probe once passed 24 times and was explicitly rejected
as sufficient qualification when permitted actual TLC later failed.

The runner now uses standard stdout/stderr pipes only. Its trusted supervisor
observes the target's direct exit separately, relays raw chunks with one
awaited write callback per stream, then reports drained output only after both
actual target EOFs and all forwarding callbacks. Descendants retaining target
writers prevent that drain observation. The parent requires a closed,
nonduplicated drain message with safe integer byte counts. Normal cleanup
begins only after direct-exit and drain observations; admission additionally
requires supervisor SIGKILL termination, both parent output EOFs, and exact
per-stream byte-count agreement. Deadline/output overflow remain failures.
Errors use private IPC, and malformed UTF-8 remains a bounded raw-byte failure.

`cleanupObserved` is not independent reaping of every descendant. Same-group
cooperation and OS progress remain required; detached or uninterruptible
descendants are outside this contract. The source helper is part of the
trusted observation boundary. Its target EOF assertion is not a theorem about
the runtime, and the runner retains the separate parent OS witnesses.

Final runner commands/results:

```sh
bun test --timeout 20000 verify/tests/runner.test.ts
# exit 0: 11 pass, 100 assertions
# includes 12 forced-GC inherited-writer iterations, exact 4 MiB dual-stream
# output, timeouts, excess output, late descendants and malformed raw bytes
bun /private/tmp/algal-runner-probe-core/production-java.ts \
  > /private/tmp/algal-runner-probe-core/production-java.jsonl
# exit 0: 24 actual Java/TLC invocations with a permitted local listener,
# forced GC during each; each target exit13, ~18.7 KiB complete stdout,
# empty stderr, matching relay counts, observed cleanup, parent exited normally
```

The Java probe imports the production `runCommand`, creates a fresh copy of
the custody zero-capacity/RejectCapacity model/config per invocation, and uses
the pinned Java21/TLC1.7.4 distribution. Exit13 is the intended action-property
counterexample, not a successful safety theorem. The model owner separately
runs and admits complete suite evidence. Earlier scratch relay tests passed
the existing 9 tests/57 assertions and two additional tests/26 assertions;
the final production tests above supersede that prototype evidence.

Strict focused compilation ran with `--noEmit --strict
--noUncheckedIndexedAccess --exactOptionalPropertyTypes --noImplicitReturns
--noFallthroughCasesInSwitch --skipLibCheck --isolatedModules --module ESNext
--moduleResolution bundler --target ES2022 --lib ES2022 --types bun` over
`verify/lib/runner.ts`, `verify/lib/command-supervisor.ts`, and
`verify/tests/runner.test.ts`; it passed. Focused ESLint and diff checks passed.
Independent source review approved the custody implementation, bounded driver,
specification, and final relay. No worker commit was made.
