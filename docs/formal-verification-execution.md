# Formal verification execution record

## Integration candidate

Execution was authorized on 2026-09-23. Branch: `feat/formal-verification-foundation`, based on freshly fetched `origin/main` at `353a5cac4ea2b2ae40e00bf9c2805606265a5378`. The historical audit remains an exact account of its older snapshot. New application drain, experiment, research, messaging/contention and inference surfaces are being mapped before the claim ledger is admitted.

The audit and plan documents were the only changes carried onto the task branch. No unrelated working changes were present. The separate `algal-worktrees/platonik-dep` worktree is outside this task.

## Current orchestration step

Phases 02 and 03 — application custody, durable publication, finite protocol models and reproducible evaluator artifacts. Phase 01 passed its integrated checkpoint and was committed as 82f672d. The integrator owns the property registry, assumptions, tool pins, shared manifests, CI, generated evaluator artifact and this execution record. Workers own disjoint runtime/test scopes, with independent review after convergence.

## Environment

Bun 1.3.14 and Rust 1.97.1 are installed. The initial Java executable is the macOS stub; Lean is not installed on PATH. Formal toolchains will be task-local and checksum pinned after smoke validation. No global configuration change is part of this task.

No installed `oompa-host-run` or `hra-host-run` was found on PATH or in the documented local command directories. Repository policy requires the scheduler when available; repository-native commands are used while it is absent. No denied scheduler invocation is bypassed. Network access for the exact-main Git fetch required configured automatic approval and succeeded.

## Evidence and delivery

Phase 00 is complete after independent review. No production proof, production model check, release, deployment or merge is claimed by this record. Tool compatibility controls concern toy fixtures only. Per-phase results and exact final delivery evidence will be added as work converges.

### Phase 00

The registry contains 112 individually stated obligations, all twelve original findings, and 515 conservatively governed runtime/spec/build/example inputs. Every production obligation remains pending with zero licensed claims. Source/model/configuration/runner/tool bytes are bound separately from Git labels; stale, absent, skipped, timed-out, empty or vacuous required evidence fails closed. Real production-result adapters remain unavailable until their suites are implemented.

Independent review corrected several domain/assumption mappings and found two runner defects: mixed pass/skip output could be admitted, and an exited process leader could leave inherited pipe writers outside the effective deadline. Both now have regressions. A private IPC supervisor retains group ownership, self-signals group zero and requires observed supervisor exit/output EOF, without claiming independent reaping of arbitrary descendants.

Focused validation: `bun scripts/verify.ts --suite claims --json` and `--suite runner-selftest --json` passed on input digest `sha256:a8874ce79f5924b6a8849c5512b10d179b6218ebe1264d3a00781f7751537031`, with 30 tests and 145 assertions. Strict TypeScript and ESLint over the new runner/library/test files passed. Missing `lean-core` and unknown suite probes exited 1. The reviewer confirmed the repaired lifecycle and negative gates. Subsequent documentation/status annotations change the input snapshot; the integrator runs `all-required` on the annotated tree before Phase 01 edits.

The [toolchain smoke](formal-verification-evidence/toolchain-smoke.md) passed all 13 expected good/bad classifications with pinned local Lean 4.34.0, TLC v1.7.4 and Temurin 21.0.12.1+1. Its raw logs and source hashes are retained. Raw logs preserve exact tool output, including one trailing space; whitespace lint excludes only the retained evidence-log directory. This is tool compatibility evidence, not an Algal theorem.

Integrated Phase 00 gate: `bun scripts/verify.ts --suite all-required --json` exited 0 on `sha256:cbcc4d3f10ef2dc77c0fe5f8c8c759dfdc71e1cb53086d0a7f82b2e6a468bb71`: 112 pending obligations, all 12 findings, 515 governed inputs, 30 passing runner tests, zero licensed/formal production claims. Local raw result: `.algal/verification-results/phase00.json`. This checkpoint does not replace the later repository-wide integration gate.

Phase 00 runtime compatibility baseline: `rustup run 1.97.1 cargo test --locked -p algal-expr` passed all 36 evaluator unit tests (0 failures; no doctests) on the unchanged evaluator source at the integration baseline. A later link probe established that Cargo still selected Homebrew rustc 1.97.1 from PATH, despite `rustup run`; its rlib was incompatible with the rustup compiler of the same version/commit. This initial run is therefore Homebrew-toolchain evidence. Subsequent native/WASM work pins `RUSTC=/Users/bg/.rustup/toolchains/1.97.1-aarch64-apple-darwin/bin/rustc` and the matching `RUSTDOC` explicitly. No Cargo cleanup or global toolchain change was used.

The unchanged evaluator was then rebuilt with the explicit rustup compiler (`env RUSTC=... rustup run 1.97.1 cargo build --locked -p algal-expr`). A fresh temporary Rust probe linked that library and called `eval_json`; the public Bun `evalProgram` probe used the committed WASM. For `nth` on an empty array at index 4294967296, native reported index 4294967296 while WASM reported 4294967295. At 1e308, native reported 18446744073709551615 while WASM reported 4294967295. Both charged fuel 4 and returned EXPR_PATH. F07's target disagreement is now reproduced on both targets, before repair. Temporary source: `/private/tmp/algal-native-target-probe-xkwxcaep/probe.rs`.

GitHub's branch-protection endpoint returned “Branch not protected” for main. CONTRIBUTING.md still requires a pull request, and the repository's Bun/native/adapter CI and independent review remain delivery gates for this work.

### Phase 01

The [boundary evidence record](formal-verification-evidence/phase01-boundaries.md) records the independently reproduced defects, compatibility decisions and focused results. Repairs cover own-key membership, imported case/input binding, canonical input aliases, exact benchmark result coverage, imported evaluation case limits, fatal file decoding, native retained memo winner validation and width-independent expression errors. Existing identifiers/data keys, duplicate-member semantics and explicit local readonly overlays retain their documented behavior. Historical receipts with saturated index errors or ambiguous insertion-ordered aliases can require their original evaluator for historical reproduction.

Independent native and TypeScript reviews approved the final admission/alias/result-population changes. Storage, adaptation, expression and the bounded raw-byte harness received separate reviews. Seven relevant ledger obligations are marked observed with no admitted result, licensed claim or proved implementation relation; the remaining obligations stay pending. Broader foundry population equality and many-port count parity remain unresolved.

Focused native foundry/benchmark/graph/adaptation checks total 35 passing cases; store/file admission 20 and expression 37 also passed. Focused Bun regressions, strict TypeScript, repository ESLint and source whitespace checks passed. The native CLI was rebuilt with explicit Rustup 1.97.1 compiler paths, then compilation and schema parity passed on the converged runtime source with zero provider calls. Clippy required the absolute Rustup cargo-clippy executable plus RUSTUP_TOOLCHAIN=1.97.1; driver selection from the ordinary cargo subcommand remained incompatible despite RUSTC pinning. The final repository gate is still required after all implementation lanes converge.

Integrated Phase 01 gate: `bun scripts/verify.ts --suite all-required --json` exited 0 on `sha256:bd7f5fb1407f7c90912f80ce45933735cda2b80cc2a6af088aeab4b7aeb39e59`: 518 governed inputs, 31 runner selftests, 138 focused production regressions and 30 raw/target comparisons. The ledger has 105 not-started and seven observed obligations, zero licensed/formal claims. Raw result: `.algal/verification-results/phase01.json`. An earlier attempt correctly rejected stale plan hashes; after refresh, one child exited 1 without retained diagnostic detail. Isolated supervised runner and boundary checks then passed. Bounded diagnostic tails were added without changing acceptance, and the integrated gate passed; the unexplained transient is not treated as a proved runner property.

### Phases 02 and 03 in progress

The first-head custody race was reproduced through deterministic real-service
barriers in all eight Bun/native caller assignments before repair. Stable
per-application primary custody plus permanent compatibility custody is now
implemented in both runtimes. Focused capacity, legacy-owner, prepared-genesis
and independent-admission controls pass; the mixed-runtime checkpoint is
awaiting final validation on converged publication helpers.

The publication lane adds explicit ancestor, retained-inode and acknowledgment
barriers, consumed-before-pending mailbox transfer, and durable pathname-lock
release. Its real-I/O checkpoints feed modeled crash images reopened by the
actual readers. Finite TLA+ models and required counterexample mutations are
being checked separately; no physical power-loss or proved-refinement claim is
licensed by those modeled images.

The isolated expression build reproduced WASM bytes exactly across two clean
builds (`sha256:a1c788200feede210cae1b4926c7e2ee5524a814001056d83f2855f77b86eea9`,
253235 bytes). A subsequent controlled build also produced a fresh native
driver and passed all 30 full-response boundary comparisons. Compiler/runtime
closure hashes and raw Cargo output are retained in task-local receipts. The
adjacent artifact manifest deliberately becomes stale when its builder/runner
changes; final evidence must be rebuilt after review and convergence.

Longer actual Java runs exposed a runner pipe-lifecycle defect that short
selftests had missed: target completion could be known while captured EOF was
not observed. The affected runs failed closed. Root added lossless bounded
failure diagnostics and separated supervisor-exit observation from captured
pipe EOF; the focused output-limit counterexample now passes, while repeated
Java qualification is still in progress. No failed or timed-out run is counted
as successful formal evidence.


### Review and verification infrastructure follow-up

Independent Phase03 review required three corrections: bounded supervised WASM
compilation (parent admission now only binds bytes), real copied-source stale
artifact controls including a valid changed module, and separately owned exclusive
random publication temporaries. A further review required retaining build scratch
when process cleanup is unobserved; that path now keeps bounded raw diagnostics.
These source corrections have independent review; renewed build/reproduction
receipts remain pending the runner correction.

The old extra-descriptor runner was reproduced closing reused capture descriptors
when Bun 1.3.14 garbage collection finalized a prior subprocess wrapper. The
24-run denied-listener probe was insufficient qualification. Actual TLC attempts
failed closed, and those attempts do not establish model-suite success. A standard
stream relay is being qualified with exact raw output, forced collection,
inherited writers and actual listener-permitted Java. The 13 model profiles,
58 action witnesses and 20 deliberate mutations have separately passed direct
semantic diagnostics, but those diagnostic runs do not replace the owned runner.

Phase09 has begun independently of the remaining Phase02/03 join. Its initial
scope is explicit finite binary64 normalization, scalar/UTF-16 domains, finite
maps, ports/graphs and accounting. Full ECMAScript shortest-decimal canonical
encoding remains an unmet criterion; a structural codec will not silently stand
in for that claim. The pinned Lean distribution manifest was derived from the
checksum-verified archive (17,711 files). A diagnostic whole-import trust-zero
check at 512 MiB failed its memory bound and is not accepted proof evidence.

### Phase02/03 joined checkpoint

Both operational model suites and their fresh raw-log/source/tool re-admission
passed: 13 finite profiles, 58 action witnesses and 20 intended counterexamples
across 91 runner-owned calls. The exact receipts and bounds are recorded in
`formal-verification-evidence/phase02-models.md`. The current rebuilt native CLI
passed all 250 application parity steps, 62 bundled examples and the mailbox
admission/custody lifecycle. A freshly rebuilt native custody fixture passed all
eight mixed-runtime schedules under the repaired runner. The runner/parser/claim
admission join passed 70 tests and 275 assertions.

The isolated expression build and independent clean check reproduced exactly
`a1c788200feede210cae1b4926c7e2ee5524a814001056d83f2855f77b86eea9`.
Each passed all 30 native/WASM comparisons. Real-file stale-artifact and concurrent
publication controls passed 5 tests/19 assertions; the current shipped WASM passed
17 expression tests/104 assertions. `formal-verification-evidence/phase03-artifact.md`
records exact recipe, source/runtime bindings, reviews and limitations.

Phases02 and03 are complete within these conditional finite/model/artifact scopes.
Universal ledger obligations remain unproved and license zero formal claims.
The final repository aggregate gate and delivery remain required after the
remaining plan converges. Phase04 is the next dependent implementation lane;
Phase09 continues independently.

### Phase04 counterexamples and Phase09 checked milestone

Portable stateful traces reproduced persistent native CAS/effect reads returning
cached values after the backing file was corrupted or removed. The native Store
now reserves its memory maps for explicit memory/overlay writes, and persistent
reads admit disk state. Cloned overlays and source tracing do not inherit an
acknowledged disk write as a stale local snapshot. Focused regressions retain the
original traces and exercise corruption, absence, wrong digest, foreign effect
identity and intentional local overlay shadowing.

The same trace work found missing application dependencies returning INTERNAL
in Bun and PARSE_FAILED in native. Bun now uses PARSE_FAILED for absence and
DIGEST_MISMATCH for a Store returning a foreign record. Every Store result,
including an overriding FileStore subclass, is rehashed; parsing receives that
same admitted copy. Independent review found no intended valid wire-result
change. The focused application contract/message/experiment check passed 18
tests/115 assertions. Real AbortController cancellation of a paused Bun host
admission passed two tests/16 assertions for new and existing applications.
This is separate from error-injection labels; native also exercises actual
Tokio task abort/drop before publication and cold reacquisition.

The independent Lean milestone now passes 224 named environment theorem audits,
an additional complete defining-module audit of 842 theorem constants, seven
executed negative controls and sampled Bun/native vector correspondence.
Fresh source was staged with the complete pinned runtime inventory checked
before and after. Raw evidence re-admission also passed. Exact receipt,
toolchain, trust assumptions and limits are in
`formal-verification-evidence/phase09-core.md`. General key permutation,
extensional finite-map projection, recursive normalization and quoted-string
UTF-8 round-trip/injectivity are proved in the semantic model. All 56 actual
quoted-string vectors match both runtimes. Complete JSON number/delimiter
composition and production refinement remain open. Phase09 remains in progress.

Phase04 is complete within its sampled trace/fault scope. The final source
snapshot passed all 74 histories and 1,628 commands per runtime, with independent
re-admission of the 55 MB raw archive. The trace definition is
`b0a810e4f32e28296afab3b03831e401406ec25fa14432392ff63f539775a67b`.
The separate supervised native stateful suite passed 64 Hegel histories and the
concrete shrinking control; its receipt is
`verify/results/c2f278cb7f4aeb53d060a4ca9c2a44b5df375e7dd5551bd20b49732202fcaff7/stateful.json`.
Fault/cancellation coverage passed nine native selectors and 19 Bun tests:
`verify/results/8c90158ccc9985f433d0b3c9ce4ce975006099fa9c4f1468f93082b41a485103/fault.json`.
Final independent review reproduced forged uncertainty on ordinary rejections
passing the checker. The repaired oracle and its negative controls now reject
that case; all affected qualification runs were refreshed. Earlier receipts are
historical. Exact raw archive/artifact details are in
`formal-verification-evidence/phase04-traces.md`.

Pinned native CLI `ce85c00402384407d4b726e79a8d86b92bd54d5a0237c520046f77670f2462bc`
passed application (250), process (58), and Store (15) parity steps.
The exact evaluator WASM was reproduced after Cargo/runner input refresh.
These milestones do not license universal implementation correctness or replace
the final repository aggregate and delivery gates.

Phase05 is now integrating bounded lease, mailbox, effect-journal and process
models. Independent journal-model review repaired lost recovery-charge
acknowledgments, concurrent poison during awaited persistence, recorded versus
new binding drift, retained receipt identity, invocation versus process-generation
identity, and effects that apply after host death. Its 32 scratch diagnostic
profiles behaved as expected; repository suite admission and implementation
conformance remain pending.
