# Verification and assurance evidence

This directory tracks explicit correctness obligations for Algal. A valid ledger is an inventory, not a proof that the implementation satisfies it. The current work and acceptance criteria are in [the execution plan](../docs/formal-verification-plan.md); the original findings are in [the audit](../docs/formal-verification-audit-2026-09-23.md).

## Commands

Run from the repository root with the pinned Bun version:

```sh
bun scripts/verify.ts --suite claims
bun scripts/verify.ts --suite runner-selftest
bun scripts/verify.ts --suite boundary
bun scripts/verify.ts --suite artifact
bun scripts/verify.ts --suite custody
bun scripts/verify.ts --suite publication
bun scripts/verify.ts --suite traces
bun scripts/verify.ts --suite stateful
bun scripts/verify.ts --suite fault-harness
bun scripts/verify.ts --suite lean-core
bun scripts/verify.ts --suite application-history-slice
bun scripts/verify.ts --suite corpus
bun scripts/verify.ts --suite spawn-conformance
bun scripts/verify.ts --suite all-required
```

`claims` admits the closed metadata schema, unique property identities, complete governed file inventory and current dependency hashes. `runner-selftest` exercises rejection of invalid, empty, skipped, timed-out, stale and vacuous result/configuration metadata. `boundary` runs focused production regressions and native/WASM raw-byte comparisons; first build its native test driver using the [boundary instructions](boundary/README.md). `all-required` runs the implemented infrastructure/regression suites and every activated required suite. A future suite cannot silently become successful merely because its name appears in the ledger. Infrastructure self-tests use synthetic tool output where stated; they do not establish production semantics. Result envelopes still license zero formal claims; regression observations do not upgrade a universal ledger obligation.

No runtime dependency on Lean, Java, TLC or another verifier is introduced. Formal tools are development/CI tools. Their immutable distributions, checksums and compatibility smoke evidence are recorded in `toolchains.json` and the toolchain-smoke report. Missing required tools fail their gate.

The [artifact suite](artifact/README.md) checks the adjacent evaluator manifest,
rebuilds WASM byte-for-byte under the pinned isolated recipe, and compares a
fresh native evaluator with that build. Populate the locked Cargo cache and
install the pinned WASM target first; the gate itself stays offline.

The [custody and publication suites](tla/README.md) execute the bounded models,
reachable action witnesses and intended counterexamples. Custody also requires
all eight actual Bun/native schedules; build the native `application_custody`
test and provide its absolute path through `ALGAL_CUSTODY_TEST_BIN`. Publication
adds the Bun syscall/crash-image regressions; the native helper and admission
tests remain required separately. These are finite checks and sampled runtime
relations; the broad ledger obligations remain unproved.

The application suites `application-model`, `outbox-model`, `quota-model`, and
`authority-model` register separate finite selection, outbox, reservation, and
authority domains. Their [model scope and inventories](tla/README.md) distinguish
model safety from runtime correspondence. `stateful-app` runs named Bun service
histories, portable-core/storage-adapter regressions and native histories. Volatile
memory-adapter owner replacement is distinct from filesystem restart evidence. Set `ALGAL_APPLICATION_TEST_BIN` to the absolute
frozen `application_model` integration-test executable built from the current
source using `cargo test --locked -p algal --test application_model --no-run`.
This is a different artifact from `ALGAL_TRACE_TEST_BIN`. Full application crash
and CLI parity checks remain required separately.

`scheduler-model` checks the independent bounded transition oracle and its
negative controls. `scheduler-conformance` compares that declared fixture slice
with both actual runtimes, including supervised command execution and journal
poisoning. Set `ALGAL_SCHEDULER_NATIVE_BIN` to the absolute frozen native CLI built
from the current source. These are executable model and sampled correspondence
checks, not a scheduler refinement proof. See the [scope](reference/scheduler/SCOPE.md)
and [progress argument](reference/scheduler/PROGRESS.md).

`application-history-slice` generates four fixed histories, compares fresh Bun
and native executions, and checks five deliberate projection mutations with
ordered shrinking. Build the `verification_application_history` native example
and select its absolute path with `ALGAL_APPLICATION_HISTORY_BIN`. Each original
history has 24 commands; the baseline matrix has 16 workers and 384 command
observations. [Scope and limits](reference/application/SCOPE.md) distinguish this
slice from general application correctness and process-crash recovery.

`corpus` compares 115 fixed expression cases across committed WASM, the Bun
wrapper where applicable, and the native `verification_boundary` example.
Set `ALGAL_CORPUS_NATIVE_BIN` to that example's absolute path. The independent
value/error oracle and raw-input cases do not establish full expression
refinement; see the [corpus scope](corpus/SCOPE.md).

`spawn-conformance` checks 17 fixed dynamic-spawn fixtures, 34 runtime
comparisons, 68 baseline receipt replays and four expected mutation rejections.
Select the frozen native CLI with `ALGAL_SPAWN_NATIVE_BIN`, its independently
checked build manifest with `ALGAL_SPAWN_BUILD_MANIFEST`, and that manifest's
`sha256:` digest with `ALGAL_SPAWN_BUILD_MANIFEST_SHA256`. The runner verifies
the selected artifact and build-input hashes; the integration owner must still
establish their build correspondence. [Spawn scope](reference/spawn/SCOPE.md)
records the limits of these finite fixtures.

These three suites copy raw evidence into `verify/results`, save a manifest
bound to the selected authority and recheck the copied bytes before returning
a small result pointer. Diagnostic copies are separate from passing evidence.
This is checked local file retention, without a physical power-loss guarantee.
Runner selftests use separate supervised groups with the same command deadline
to cover the larger archive-reader controls.

The [portable traces](traces/wire.md) replay retained and state-dependent histories
through both actual runtimes, compare exact results with cold persistence reads,
and require publication/checkpoint witnesses. `traces`, `stateful`, and
`fault-harness` require `ALGAL_TRACE_TEST_BIN` pointing to the absolute native
unit-test executable built from the current source with the pinned locked Rust
toolchain. Native stateful execution fixes 64 histories and the seed; its
600-second command budget accommodates real filesystem operations and shrinking.
The general command default remains 90 seconds. Raw successful and failed output
is retained under an owned archive. An artifact hash alone is not build provenance.

The [Lean semantic core](lean/Algal/Core/README.md) checks named model theorems and
every theorem defined by their modules, including generated/private declarations.
It rejects unreviewed transitive axioms with actual negative controls and compares
computed vectors with both production runtimes. Build the
`verification_lean_vectors` native example and set its absolute path in
`ALGAL_LEAN_NATIVE_BIN`. The current pinned Lean distribution is qualified only
on macOS arm64. The adjacent [evidence report](../docs/formal-verification-evidence/phase09-core.md)
states the proof scope, remaining codec/refinement obligations and trusted inputs.

The command runner supports cooperating POSIX process groups. Its live supervisor receives cleanup requests over private IPC and signals its own group. `cleanupObserved` means supervisor SIGKILL termination and parent-side EOF on both relayed standard-output pipes were observed. Successful completion additionally requires the trusted helper's actual target-pipe EOFs, completed forwarding callbacks, and matching per-stream byte counts. The relay applies backpressure and preserves raw bytes. It avoids Bun 1.3.14's observed garbage-collection failure with reused extra pipe descriptors. It does not independently reap every descendant; detached descendants and absent OS progress are outside this contract. A missing cleanup witness fails the command. Wider process-tree qualification belongs to the host assurance phase.

## Reading a property

Each record in [properties.json](properties.json) has a stable ID, owner/reviewer, phase, observable failure, domain, quantifiers, bounds, assumptions, versioned specification and source bindings. `relation` states how the implementation is connected to the model. `licensedClaims` states precisely what public wording the evidence permits; it is empty for unstarted obligations.

The initial `versions` inventory lists identifiers mentioned by the mapped source and specifications, including negative-test identifiers in Rust inline tests. It is not a supported-version whitelist. Exact semantics-version admission is a separate obligation, and the ledger licenses no compatibility claim from this inventory.

Evidence labels are distinct:

| Label | Meaning |
| --- | --- |
| not-started | An obligation without admitted evidence |
| observed | Source inspection or a particular executed example |
| tested | Executed generated, differential or deterministic conformance cases |
| finite-checked | A completed exhaustive search of a named finite domain |
| proved-model | A checked theorem about the stated mathematical model |
| proved-implementation | A checked relation to governed production code |
| qualified | The exact artifact/environment boundary was exercised |

A finite model check never automatically upgrades its associated implementation to proved. Passing a Rust/WASM comparison does not establish independence from shared evaluator bugs. Positive memory derivations assume the selected facts; hashes do not authenticate them. See [assumptions and profiles](assumptions.md).

## Input binding and review

Primary property mappings initially cover whole modules. The separate conservative dependency inventory includes the full governed source/spec/build/workflow surface, including new untracked files. This intentionally invalidates more evidence than a fragile hand-maintained dependency graph. A missing, added or changed governed input fails validation.

When changing governed code:

1. Identify affected obligations and determine whether their statements, assumptions, domains or bounds changed.
2. Add the counterexample/regression or proof obligation before upgrading the evidence claim.
3. Independently review the abstraction and implementation relation; update source bindings only after that review.
4. Re-run affected suites and bind fresh output to exact production, proof/model, runner, toolchain and configuration inputs. Do not refresh hashes to pass off old evidence as new.
5. Run the repository's required final gate on the converged integration candidate.

Finite TLC configurations disclose constraints and overrides. Safety symmetry needs independent review; liveness configurations prohibit symmetry. Required action witnesses prevent constant/no-behavior models from passing as protocol exploration. Lean claims require nonempty theorem inventories and transitive axiom reports; sorry, hidden custom axioms and native-evaluation/compiler axioms are not admitted by default. Negative controls must fail at the intended invariant/theorem, not merely fail to launch a tool.

The core ledger inventories hosted obligations for visibility, but `hosted` is excluded from core release claims until the separately scoped algal-cloud assurance case exists. Physical power-loss and live-provider qualification likewise require their own exact evidence.
