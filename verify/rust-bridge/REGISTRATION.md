# Registration notes — verify/rust-bridge

Wiring notes for whoever integrates Phase 12 into the verification runner and
CI. Nothing here is wired up yet; suite names follow the plan's proposals.

## Proposed suite names

| Suite | Invokes | Purpose |
|---|---|---|
| `kani` | `sh verify/rust-bridge/run.sh` | The proof run itself: tool-version assertions, `cargo check`, `cargo test` sanity suite, then `cargo kani` over all eight harnesses. Fails if any harness fails, times out, or reports unreachable expected covers. |
| `rust-bridge` | manifest-level suite wrapping `kani` | The named boundary for "proofs over production Rust" — the crate plus this directory's docs. Suggested so results can be reported once even if a second proof engine (Verus) is added beside Kani later. |
| `bridge-drift` | `git diff --exit-code -- crates/algal/src/canonical.rs` + rerun `kani` | Maintenance experiment (see FEASIBILITY.md): detect that the proved surface changed, re-run proofs, and fail CI if production drifted without a corresponding proof refresh. Encodes "proof over actual production code" — a stale green badge is worse than none. |

## Property mapping (verify/properties.json)

No Phase-12 property IDs exist yet — the ledger has entries for every other
phase. The harnesses partially discharge three existing Phase-09 properties
and one Phase-01 admission property; integrators should attach
`evidence.results` on those entries (and/or add a Phase-12 entry) rather than
duplicate statements:

| Property | Evidence suite | Harness(es) | Partial discharge |
|---|---|---|---|
| `VAL-04` (insertion order / numeric-looking keys) | `kani` | `canonical_array_index_key_order` | proves the index/UTF-16 ordering on production `canonical` for a 7-key object |
| `VAL-05` (digest binds canonical bytes) | `kani` | `check_digest_accepts_canonical_form`, `check_digest_soundness_bounded_input`, `check_digest_soundness_utf8`, `check_digest_rejects_noncanonical_tail`, `check_digest_rejects_wrong_length` | proves the digest-format admission predicate over bounded symbolic `&str` |
| `VAL-01` (canonicalization determinism) | `kani` | `canonical_scalar_leaves_bounded`, `canonical_depth_guard_exact`, `canonical_shallow_tree_bounded` | proves boundedness/absence-of-panic on bounded symbolic inputs — not a full determinism claim |
| `ADM-01` (closed admission) | `kani` | the five `check_digest_*` harnesses | narrows `canonical.rs` from "whole module" to named symbols |

The `bounds.harness` field on each touched property should record the
symbolic domains (e.g. "ASCII `&str` <= 96 B + UTF-8 <= 24 chars";
"Value depth <= 2"; "encode depth exactly 64 vs 65").

## What CI would invoke

```sh
RUSTUP_TOOLCHAIN=1.97.1 \
  PATH="/Users/bg/.rustup/toolchains/1.97.1-aarch64-apple-darwin/bin:$PATH" \
  sh verify/rust-bridge/run.sh
```

- `run.sh` asserts rustc 1.97.1, cargo 1.97.1, `Kani Rust Verifier 0.68.0` and
  `CBMC 6.11.0` before verifying; a wrong tool is an early exit, not a
  silently different proof.
- `CARGO_NET_OFFLINE=true` inside run.sh keeps the build hermetic against the
  shared cargo cache; the seed `verify/rust-bridge/Cargo.lock` is checked in
  next to the harnesses (regenerate offline if it is ever absent).
- `cargo kani` writes only to `verify/rust-bridge/target/` — root
  `Cargo.toml`, root `Cargo.lock`, `crates/`, `src/`, `verify/lib/`,
  `verify/properties.json` are all untouched. `git status` after a run shows
  only this directory.

## Dependency and scale notes for CI capacity planning

- The path dependency on `../../crates/algal` pulls the whole production dep
  graph (reqwest/ring/rusqlite/tokio/…). `cargo check` cold ≈ 35 s,
  `cargo test` cold ≈ 55 s, the first `cargo kani` dep compile ≈ 60 s on this
  machine; subsequent runs reuse `target/kani/` and spend time only in CBMC.
- Kani warned about unreachable unsupported constructs (an aarch64 NEON
  intrinsic, `caller_location`, two foreign functions, one `simd_cast`) inside
  dependency code. None is reachable from the eight harnesses; Kani fails
  rather than approximates if that changes, so the warning is a tripwire, not
  a gap.
- macOS arm64 only for now (matching the pinned rust toolchain's host); the
  proposed Linux pins in TOOLS.md would unlock CI runners.
