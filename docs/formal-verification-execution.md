# Formal verification execution record

## Integration candidate

Execution was authorized on 2026-09-23. Branch: `feat/formal-verification-foundation`, based on freshly fetched `origin/main` at `353a5cac4ea2b2ae40e00bf9c2805606265a5378`. The historical audit remains an exact account of its older snapshot. New application drain, experiment, research, messaging/contention and inference surfaces are being mapped before the claim ledger is admitted.

The audit and plan documents were the only changes carried onto the task branch. No unrelated working changes were present. The separate `algal-worktrees/platonik-dep` worktree is outside this task.

## Current orchestration step

Phase 01 — repair known admission, policy, decoding, retained-cache and target counterexamples. The integrator owns the property registry, assumptions, tool pins, shared manifests, CI, generated evaluator artifact and this execution record. Workers own disjoint runtime/test scopes, with independent review after convergence.

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
