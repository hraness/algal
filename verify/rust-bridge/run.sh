#!/usr/bin/env bash
# Phase 12 pilot: pinned proof invocation for verify/rust-bridge.
#
# Verifies production functions in crates/algal through a path dependency;
# no production file is modified. Root Cargo.toml/Cargo.lock are never
# touched: this crate is a standalone workspace and writes only its own
# verify/rust-bridge/Cargo.lock.
#
# Tool policy:
#   - cargo/rustc: the repository toolchain, rustc 1.97.1 via rustup.
#   - kani: the machine install of `cargo kani` — currently
#     "Kani Rust Verifier 0.68.0" (kani-compiler = rustc 1.100.0-nightly
#     8925ea358, CBMC 6.11.0). Asserted below; a version mismatch stops the
#     run before any verification claim.
#   - All Kani default checks stay enabled: unwinding assertions, overflow,
#     memory safety, undefined-function detection, reachability (asserts and
#     covers). Nothing passes --no-undefined-function-checks, no stubbing,
#     no --unwinding-assertions removal.
#   - CARGO_NET_OFFLINE=true keeps cargo from touching the network; the
#     committed-adjacent Cargo.lock (regenerate with `cargo generate-lockfile
#     --offline` if absent) plus the shared cargo cache satisfy every dep.
set -euo pipefail
cd "$(dirname "$0")"

export RUSTUP_TOOLCHAIN=1.97.1
export PATH="/Users/bg/.rustup/toolchains/1.97.1-aarch64-apple-darwin/bin:$PATH"
export CARGO_NET_OFFLINE=true

# --- tool assertions -------------------------------------------------------
rustc --version | grep -F "rustc 1.97.1"
cargo --version | grep -F "cargo 1.97.1"
cargo kani --version | grep -F "Kani Rust Verifier 0.68.0"
# kani-compiler rides along inside the cargo-kani distribution.
kani --version | grep -F "CBMC 6.11.0"

# --- cheap gate first: crate compiles and deterministic sanity tests pass --
cargo check --offline
cargo test --offline

# --- the proof run ----------------------------------------------------------
# All eight #[kani::proof] harnesses in src/proofs.rs. No per-harness filter:
# an unknown harness name or a skipped proof is a regression, not success.
# -j 4 parallelizes harness-level CBMC jobs (terse is required by -j); the
# per-harness VERIFICATION lines still name each result and check count.
# -Z stubbing enables the one documented stub (OS entropy read behind
# RandomState in serde_json's IndexMap; see fill_bytes_stub in proofs.rs).
# All default checks stay enabled — including undefined-function checks for
# everything *except* that named, stubbed OS boundary.
cargo kani -j 4 --output-format terse -Z stubbing
