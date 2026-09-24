# Formal verification execution record

## Integration candidate

Execution was authorized on 2026-09-23. Branch: `feat/formal-verification-foundation`, based on freshly fetched `origin/main` at `353a5cac4ea2b2ae40e00bf9c2805606265a5378`. The historical audit remains an exact account of its older snapshot. The fully checked checkpoint `5e334ed` was pushed in [PR 70](https://github.com/hraness/algal/pull/70). The working integration includes the browser/native foundation and the later upstream merge at `3f81f0ab65961959cbbbf32e6fdc7f908c201483`; the ledger now contains 120 obligations, with HST-16 recording reviewed browser/resource qualification controls. Earlier evidence remains bound to its original source. [Upstream integration record](formal-verification-evidence/upstream-1737.md).

The audit and plan documents were the only changes carried onto the task branch. No unrelated working changes were present. The separate `algal-worktrees/platonik-dep` worktree is outside this task.

## Current orchestration step

Phases 06–09 — application and scheduler models, adversarial closure tests and Lean semantic foundations. Phase 05's integrated protocol checkpoint and 432-theorem Core milestone were committed as f461dd2. The integrator owns the property registry, assumptions, tool pins, shared manifests, CI, generated evaluator artifact and this execution record. Workers own disjoint runtime/test scopes, with independent review after convergence.

## Environment

Bun 1.3.14 and Rust 1.97.1 are installed. The PATH Java executable is the macOS stub and Lean is not on PATH; qualified, checksum-pinned Java/TLC and Lean distributions are installed in task-local scratch directories. No global configuration change is part of this task.

No installed `oompa-host-run` or `hra-host-run` was found on PATH or in the documented local command directories. Repository policy requires the scheduler when available; repository-native commands are used while it is absent. No denied scheduler invocation is bypassed. Network access for the exact-main Git fetch required configured automatic approval and succeeded.

## Evidence and delivery

Phases 00–05 are committed after independent review. Later records include source-bound finite protocol models, mathematical model theorems and sampled runtime correspondence. No whole-production proof, checked implementation refinement, remote merge, release or deployment is claimed. Exact final delivery evidence is recorded only after the corresponding gates pass.

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

Phase 09 has begun independently of the remaining Phase02/03 join. Its initial
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
Phase 09 continues independently.

### Phase04 counterexamples and Phase 09 checked milestone

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
composition and production refinement remain open. Phase 09 remains in progress.

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

Phase 05 is now integrating bounded lease, mailbox, effect-journal and process
models. Independent journal-model review repaired lost recovery-charge
acknowledgments, concurrent poison during awaited persistence, recorded versus
new binding drift, retained receipt identity, invocation versus process-generation
identity, and effects that apply after host death. Its 32 scratch diagnostic
profiles behaved as expected; repository suite admission and implementation
conformance remain pending.

### Phase 05 uncertainty counterexample and conformance admission

The new real mailbox/supervisor boundary regression reproduced a composition
defect in both runtimes. After receive published a consumed marker and removed
pending, a failure returning from lock release was reported as settled. A
journaled process consequently completed that error entry, dispatched an
on-fail write, and published a completed process receipt. The retained Bun red
run is `/private/tmp/algal-mailbox-journal-red.log`; the native red run is
`/private/tmp/algal-mailbox-journal-native-red.log`. This is executed evidence,
not just a counterexample in an abstract model.

The repair marks failures after a mutation attempt uncertain while preserving
their wire error. Readiness and exact retained retries do not acquire uncertainty
merely by taking the lock. The operation remains non-idempotent receive; no
automatic retry or retained caller-result identity is added. Source integration,
native regression completion and refreshed trace/model qualification now pass;
the admitted receipts are in `formal-verification-evidence/phase05-protocols.md`.

Independent conformance-runner review also reproduced Bun ignoring a missing
test filename when another file passes. The adapter now hashes each declared
file explicitly and requires a separate positive supervised test result for
each. Executed missing-file, empty-file, duplicate and empty-inventory controls
pass, as do the four new journal correspondence cases. The journal barrier tests
collect the owned operation in `finally` before removing its state.

### Phase 08 preliminary closure counterexample

A bounded five-case probe now reproduces F09's depth-composition gap in Bun:
an input value nested in 61 or 62 arrays passes run admission and produces a
`complete` receipt, but that receipt fails `parseRunReceipt` and FileStore
admission at their depth limit of 64. Values nested 59 or 60 arrays round-trip;
63 is rejected at run-argument admission. Each receipt is less than a few KiB;
this is structural amplification rather than a large-data experiment. Raw rows
are `/private/tmp/algal-phase08-depth-probe.jsonl`, with retained receipts in
the archive recorded there. The production repair remains pending; this does
not yet complete any Phase 08 acceptance criterion.

The native CLI counterpart accepts depths 59/60 and returns a typed
`BUDGET_EXHAUSTED` at 61/62/63; its final receipt hashing enforces depth 64.
Raw command evidence is `/private/tmp/algal-phase08-native-depth-probe.jsonl`
and `/private/tmp/algal-phase08-native-depth-ISiOyk`. This confirms a Bun/native
producer mismatch; it does not establish effect preservation after an oversized
effectful run. The Phase 07 40-case byte-budget probe also now includes actual
native execution and nested children: recall can widen root limits in both
runtimes, while native ordinary agent cells correctly clamp and Bun does not.

A second six-case corpus probe reproduces a node-count closure failure in both
runtimes. Four independently admitted input arrays totaling 499,960 scalar
elements produce receipts accepted by both consumers. At 500,000 and 520,000
elements, arguments still fit the 1 MiB input limit and individual values fit
their port limits, but duplication into cell outputs produces a `complete`
receipt rejected by `parseRunReceipt` and Bun FileStore's million-node bound.
The native CLI also returns these oversized receipts successfully. Raw commands
and receipts are retained at `/private/tmp/algal-phase08-node-closure-7E4G0O`,
with summary `/private/tmp/algal-phase08-node-closure-probe.jsonl`. This extends
the producer/consumer defect beyond depth and beyond the Bun runtime. Effectful
closure and a conservative production repair remain open.
Native `verify` independently accepts the smaller receipt and rejects both
larger receipts with `PARSE_FAILED`; those exact command results are recorded in
`/private/tmp/algal-phase08-native-node-consumers.jsonl`.

Independent review found a coupled journal boundary. A real Bun journaled
process with an admitted write tool returning 100,001 or 130,000 zeroes performs
one retained scalar write, then fails its tick with the process still uncertain.
Its journal head nevertheless selects a completed effect record exceeding
`hostRead`'s 100,000-node limit. Fresh journal open, inspection and recovery then
reject that record. The 49,900-element control completes and reopens. Original
heads, records and the scalar counter remain retained; evidence is
`/private/tmp/algal-receipt-closure-review/journal-readback-evidence.json`.
A final run-receipt guard alone cannot repair this gap: completed journal
publication must first guarantee readback, preserving started evidence on
unrepresentable completion. Native correspondence was subsequently reproduced
with the same three sizes and a real command tool; see the continuation below.

### Phase 09 numeric meaning and syntax milestone

The fresh complete core gate and separate re-admission now pass 372 named
theorems across 15 domains, 1,268 defining-module theorem audits, seven rejection
controls and 31 supervised commands. The new 93 numeric theorems were independently
reviewed and rebuilt before integration. They establish exact finite binary64
dyadic/rational values and concrete ASCII numeral syntax with decimal rational
meaning. Decimal-to-binary rounding, shortest rendering, a production NumberCodec
instance and implementation refinement remain open. The exact receipt and trust
limits are recorded in `formal-verification-evidence/phase09-core.md`.

### Phase 05 protocol checkpoint and Phase 06 continuation

Phase 05 is complete within the declared finite-model and sampled-conformance
scope. Five admitted TLC suites, including the refreshed earlier custody and
publication suites, passed 76 positive configurations, 229 transition witnesses
and 60 intended unsafe controls. All saved raw results passed independent
re-admission. Protocol correspondence passed 69 Bun tests and 23 exact native
selectors. The refreshed trace gate passed all 74 histories and 1,628 commands
per runtime; the native Hegel, shrink and fault controls also passed. Current
receipts and scope are in `formal-verification-evidence/phase05-protocols.md`.

The full native workspace suite passed 347 tests, with three explicit helper
ignores, and strict workspace clippy passed. Bun's first full run exposed one
outdated error-identity assertion following the mailbox uncertainty change; it
now checks preserved wire fields, uncertainty and the unmodified original error.
Eight sandbox-denied loopback tests passed with local listener access. A later
concurrent aggregate hit two existing filesystem-test deadlines; both passed
isolated reruns without changing limits. The complete quiet aggregate then
passed 1,128 tests with 20 conditional skips, zero failures and 8,450 assertions,
plus type checking, lint, documentation and site build. Its exact log is
`/var/folders/k3/s4y7dlcj4mz2j1kbg428r5bw0000gn/T/system-one-EAh4nx/check.log`.
A Phase 06 review also identified test-cleanup paths
that can remove owned state before an awaited operation has joined after failure;
that harness follow-up remains open.

Phase 06 has source-mapped quota and outbox candidates under independent review.
Outbox review identified missing late application of an invoked adapter after
host death; the candidate is being repaired before registered admission. Selection
and authority models and real service correspondence remain outstanding.

The subsequent full Lean gate and separate readmission now pass 432 authored
theorems across 17 domains, all 1,414 defining-module theorems, seven controls
and 33 supervised commands. The 60 new theorems prove finite denotation
injectivity modulo signed zero and exact interior rounding intervals. The
independent review added nine boundary/non-vacuity witnesses and rejected wrong
precision and parity variants. Negative rounding candidates, zero/overflow
centers, decimal conversion, shortest rendering and source refinement remain
open. `formal-verification-evidence/phase09-core.md` identifies the current
receipt; earlier checkpoints are historical evidence.

### Phase 07 byte-budget repair and Phase 08 closure continuation

The root byte limits now clamp agent and recall cell overrides in Bun and
recall overrides in native. Native ordinary agents already enforced that clamp.
Focused regressions cover 56 cases per runtime: flat/nested, context/output,
default/narrow/equal/widened/positive/exact/one-below limits, request identity,
actual dispatch, ordered effects, charged work and offline receipt replay.
All 56 Bun cases and the native 56-case matrix passed. The independent scheduler
oracle then agreed with both actual runtimes on all 72 scratch fixtures,
including the two formerly failing Bun byte-limit cases. The adapter now requires
agreement for every case; no expected discrepancy is waived. Exact scratch
summary: `/private/tmp/algal-phase07-scheduler/oracle-conformance-I16Bfv/summary.json`.
Its newly built, copied native CLI is
`/private/tmp/algal-phase07-frozen-artifacts-njcn5w5l/algal`, SHA-256
`8a150a77c592173d7a265bd54482c0ef6956ce43b8c5b40fb0a24cc1fde7b9ca`.
This remains diagnostic conformance over a disclosed subset, not the registered
Phase 07 gate or a refinement proof. Subsequent closure edits require refreshed
source-bound qualification.

The journal readback defect was independently reproduced in native as well as
Bun. A real stable-configured write tool increments an owned scalar counter once
and returns a byte-admitted array. With 100,001 or 130,000 elements, both runtimes
published completed journal records that their 100,000-node host reader refused.
Fresh journal inspection and exact-intent recovery could not read the record;
no second effect or terminal process receipt was produced. The 49,900-element
control completed and reopened. At 75,000 elements the completed journal remained
readable, but the stricter aggregate process receipt could not fit. Recovery
replayed the recorded result without repeating the write. These are separate
admission boundaries. Exact retained reports are
`/private/tmp/algal-receipt-closure-review/native-journal-readback-evidence.json`,
`journal-readback-evidence.json`, `native-journal-intermediate-evidence.json`
and `journal-intermediate-evidence.json` in the same directory.

The minimum repair is implemented and independently reviewed: validate prospective journal records before
immutable record/head publication, preserve readable started evidence on refused
completion, and propagate post-dispatch host uncertainty without routing guest
fallbacks. Independently, run finalization now applies the reader's complete
resource and schema profile before hashing/return, including a fixed-length
digest field. Oversized produced receipts raise BUDGET_EXHAUSTED; foreign
structural admission retains PARSE_FAILED. Bun regressions cover depth 59/60
readback and replay, depth 61/62 refusal, duplicated node amplification, exact
one-million-node admission and the next node's rejection, plus failed/suspended
receipt roundtrips. The six-file focused Bun runtime suite passed 183 tests and
1,277 assertions; log:
`/var/folders/k3/s4y7dlcj4mz2j1kbg428r5bw0000gn/T/system-one-zGNsAx/check.log`.
Native closure validation passed the four final-receipt cases, the 56-case root-byte matrix, the real command/journal integration case, and six unique journal/cache/replay/mailbox cases. The combined Bun receipt/journal closure set passed 35 tests and 162 assertions before the final cache-provenance extension. Source review approved both runtimes within the documented scope; aggregate qualification remains required.

Final return admission alone does not reserve receipt capacity before effects,
preserve every ordinary-run prefix when finalization fails, guarantee process
settlement, or make every valid receipt/history exportable inside a larger
bundle. Those stronger capacity-accounting and wrapper obligations remain open;
no counts, bytes or evidence are silently dropped and no limit is widened.


### Phase 06 registration and final cache-boundary repairs

Four registered application models preserve the independently reviewed scratch
semantics: selection (32 positive / 38 reachability / 9 unsafe controls), outbox
(18 / 33 / 10), quota (12 / 19 / 6), and authority (45 / 55 / 19). The total is
296 runs, split into four suites below the existing 128-run bound. Registration
review checked exact model bytes, every original constant/property/control, the
additional progress witnesses, and the split duplicate-action witness. Actual
registered TLC execution is still required. The adapter now conservatively
binds the whole governed source inventory and every imported profile declaration;
its new test detects both added transitive sources and changes in another suite's
imported inventory while excluding generated evidence.

Application source histories now cover retained-index retry after head advancement
and fresh denial, prepared-orphan resumption versus stale refusal, migration
without newly granted episode authority, and real channel/result/message
publication before quota-refused settlement. The initial seven-file Bun set
passed 58 cases / 331 assertions; the new native integration artifact passed
four entrypoints, including both orphan branches. Test cleanup releases barriers
and joins owned work before deleting its namespace; a bounded failed join retains
that namespace. Additional persisted writer and later contention-identity cases
are still being joined before the source freeze. Specification corrections
state the retained-index condition, original migrated source, and the distinction
between CAS message validity and reachable settled delivery evidence.

Final cache review reproduced two additional Bun defects: a prefetched cache hit
followed by a live failed miss could hide completion uncertainty, and a returned
live result whose cache encoding failed could be replaced by a settled INTERNAL
error. Per-invocation host-only dispatch tracking now distinguishes lookup and
metadata failures, actual execution, current cached results, and explicit replay.
Post-result cache encoding/publication failures preserve their original diagnostic
and uncertainty. No receipt fields were added. The four-file focused regression
set passed 157 tests / 647 assertions; full log:
`/var/folders/k3/s4y7dlcj4mz2j1kbg428r5bw0000gn/T/system-one-9jmgLD/check.log`.
Independent review is retained at
`/private/tmp/algal-closure-final-review/REVIEW.md`.
Root separately reviewed the repair. Arbitrary hostile host getters/proxies or
false cached declarations remain outside this guarantee.

The scheduler candidate now agrees across the independent oracle, Bun and native
on 89 cases; actual command-adapter comparisons pass 14 fixtures in both runtimes.
The registered adapter and independent review subsequently passed; retained model and 206-comparison receipts are described in [Phase 07 evidence](formal-verification-evidence/phase07-scheduler.md). The pre-integration 519-theorem Lean checkpoint audited 1,554 module theorems, 35 supervised commands and seven controls, then passed independent readmission. That receipt remains historical with its original bindings; the fresh integrated Lean checkpoint is recorded below.


### Upstream integration and next qualification

The four Phase 06 suites completed 296 registered TLC runs: 107 positive profiles, 145 reachability witnesses and 44 unsafe controls. Each suite passed independent readmission against 575 governed/model/adapter inputs. [Phase 06 evidence](formal-verification-evidence/phase06-application.md) retains all four receipts and 74 Bun/six native application conformance results.

A narrow explicit fetch of main found `e588f8bc9b0964e5956f4c62e60c14dfbcef171e`. All 83 task-owned modified/untracked files were copied with per-file digests and a binary diff to `/private/tmp/algal-before-e588-xfxh4les`; stash `f5e0dd161920b15683146aa5386a43912c745915` remains retained. The merge preserves every saved file; only intended import/message-prose changes differ. Independent source comparison approved 15 foundation files, and the reviewed three-file application port preserves the custody/uncertainty repairs across upstream extraction. No remote integration is yet claimed.

Focused application qualification passed 76 tests/551 assertions. New provider-observation journal tests passed four cases/39 assertions: direct and cached observation failure leave readable started evidence, successful observations cache/replay without a second provider call, and a late callback cannot settle after an effect deadline. These use injected local responses and make no live-provider claim. Test review repairs ensure owned asynchronous bodies and supervised CLI descendants are collected before deleting roots.

Bun bundle unpack/call now use bounded regular-file and fatal UTF-8 admission. Their latest focused ingress gate passed two tests/166 assertions, including exact 64 MiB admission, overbound refusal, regular symlinks, FIFO/device rejection, overwritten duplicate members containing malformed UTF-8, BOM/truncation, no rejected-record publication and no adapter dispatch. Explicit canonical-byte vectors passed for non-BMP, combining, controls/escapes and lone-surrogate strings after upstream switched byte counting to TextEncoder.

The independently reviewed 45-theorem negative-endpoint candidate is integrated under the required `Algal.Core` namespace. Fresh qualification passed for 564 named theorems across 20 modules, the complete 1,616-theorem module environment, 36 supervised commands and seven negative controls. The actual raw receipt was persisted, reloaded and independently readmitted: [Phase 09 evidence](formal-verification-evidence/phase09-core.md), receipt `382155e754e36a00273713d70c6fb5c8c1225edb44d8aaf1696c579e1f36d49a`. Its 81 source bindings have digest `4ffa8ec2ba85460907ff9cd2e4552a4a1309aab5a56a674730dc20235a8a329f`. Lean 4.34.0 binds 17,711 installed files; the freshly built frozen native vector artifact has SHA256 `5e2e3d55a14631cfe2ef3b693358284b95c24d1ec4c7a8e470dc9af76d820d56`. Limits remain one thread, 1024 MiB Lean memory, 120 seconds and 2 MiB output per command. This is a semantic-model checkpoint with sampled Bun/native correspondence, not whole-production refinement. The subsequent directory-allocation scope correction in the bound organism specification makes this 564-theorem receipt historical for the changed tree. The required aggregate gate will rerun Lean after source convergence; no historical hashes are rewritten.

Bundle producer/consumer closure and directory consumer-admission repairs are
implemented and independently reviewed; [Phase 08 evidence](formal-verification-evidence/phase08-closure.md)
records the remaining allocation and wrapper obligations. Bun's eager directory
enumeration remains an explicit open gap, with a separate
[qualified-primitive decision plan](formal-verification-evidence/directory-enumeration-decision.md).

The native integration gate passed format, clippy with warnings denied, all 376
workspace tests (three owned child entrypoints are ignored by the ordinary
harness), and debug/release builds with pinned Rust 1.97.1. The initial sandboxed
HTTP fixture bind was denied; the approved loopback rerun passed. The real
release binary then passed 17 package/install checks and 18 deterministic Apple
fixture cases without inference. The coding-harness Python gate passed 42 tests
with CPython 3.12 and the repository-pinned Harbor 0.23.0 in a task-local environment.
Logs: `/private/tmp/algal-native-integrated-gates-loopback.log` and
`/private/tmp/algal-final-python-gates.log`.

The first full Bun check passed typecheck/lint and 1,386 tests, with 20 optional
skips and one new module-fixture child deadline failure. Seventeen skipped cases
require the native memory binary and are covered by the separate CI fixture
commands; two require live providers and one is Linux-only. The latter three
remain unqualified by this local Mac run. The
reviewed test-only repair uses shallow owned temporary roots, bounded parallel
fixture reads and repeated-content hardlinks; it preserves every physical/logical
boundary, real CLI/storage call, retained-evidence assertion, and 10-second child
deadline. All eight directory tests then passed 232 assertions in 11.32 seconds;
the 511/512/513 cases each took approximately two seconds. The required full Bun
rerun passed 1,387 tests and 11,163 assertions in 451.73 seconds, retaining those
20 explicit skips, followed by seven executable diagram checks and the 52-page
site build. Raw log:
`/var/folders/k3/s4y7dlcj4mz2j1kbg428r5bw0000gn/T/system-one-RZRtx2/check.log`.
Independent integration review found no new source blocker. All 20 parity and
native-backed fixture commands subsequently passed, including all 62 bundled
examples, the durable application/process lifecycles and three loopback inference
formats. The [parity report](formal-verification-evidence/integration-parity.json)
binds exact commands, outputs, 504 source files and the frozen executable; no
live-provider qualification is inferred.

The final 23-suite formal aggregate passed and its saved evidence passed independent
readmission: [retained report](../verify/results/09c0a05c0829a50fd8b0b3b2686070a316f1c78ab32d5ac56cd053b751162ee3/aggregate-readmission.json).
It binds input digest `f5ac4d4ca8a19fcaed62fd6663913554591e202d48372bf28289f2a649a362cb`
and 661 TLC runs (183 positive profiles, 374 action witnesses, 104 unsafe controls),
564 named Lean/1,616 module theorems with seven controls, 206 scheduler comparisons,
and 100 Bun/six native application conformance tests. The extractor retains all
suite payloads and embeds the scheduler raw archive; its per-suite readmission
levels distinguish full raw checks from aggregate-bound retention.

The [integration checkpoint](formal-verification-evidence/integration-checkpoint.json)
and [independent review](formal-verification-evidence/integration-review.md) preserve
the local qualification. [Phase 06 acceptance review](formal-verification-evidence/phase06-acceptance-review.md)
confirms dedicated generated composition histories remain missing. Phases 06–09
therefore remain in progress. No remote integration is yet claimed.

### Upstream1737 checked checkpoint

The merged working source and repairs passed the repository and native checks,
20 runtime comparison commands, 15 Chromium checks and independent Node/V8
portable-helper comparisons. The complete 23-suite formal aggregate returned a
passing result for 924 file bindings at
`sha256:cecc01647a3fdfa5451af94f10f37035d7e6c1826c9f8752e41c9da1fc075772`.
Independent raw rechecking passed all 661 TLC calls, 564 authored Lean theorems
(1,616 module theorems),seven rejected Lean controls and 206 scheduler comparisons.
[Checkpoint evidence and limits](formal-verification-evidence/upstream-1737.md)
include the raw records. The ledger retains 119 obligations, 103 not started and
16 observed, with zero licensed production proof claims.

Main subsequently advanced through the portable task workspace and site changes
to `3f81f0ab65961959cbbbf32e6fdc7f908c201483`. Those changes and reviewed
application-history, spawn, expression-corpus and Lean bracket candidates are the
next integration batch. Their final aggregate and repository CI are pending.
