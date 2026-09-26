# Proposed tool pins — verify/rust-bridge

Status: **proposal**. Records the pins this pilot actually ran against, in the
shape of `verify/toolchains.json`. It does not modify `toolchains.json`; an
integrator merges these entries after deciding whether the machine install or
an immutable-distribution install is canonical.

## Observed on this machine (what produced the results in FEASIBILITY.md)

```json
{
  "id": "kani",
  "version": "0.68.0",
  "status": "observed",
  "command": ["cargo", "kani"],
  "components": {
    "cargo-kani": {
      "path": "/Users/bg/.cargo/bin/cargo-kani",
      "sha256": "sha256:9526909b71a6f5b655d0aa8e5ac70c81647efc103262908abf7a24ca243019fd"
    },
    "kani (standalone driver)": {
      "path": "/Users/bg/.cargo/bin/kani",
      "sha256": "sha256:f33b8b87e573b7dba0e794049c4cd78a07e298db5097e5c3ee3cb0e616c7b8da"
    },
    "kani-compiler": {
      "path": "~/.kani/kani-0.68.0/bin/kani-compiler",
      "sha256": "sha256:88c115b843454b7b16b53955b31c6bc81c0168e7bfc6fbf97d9b688e53c67154",
      "reports": "rustc 1.100.0-nightly (8925ea358 2026-08-20)"
    },
    "cbmc": {
      "path": "~/.kani/kani-0.68.0/bin/cbmc",
      "sha256": "sha256:db1a99dc5187df6f67be351555aa7951d10f37700eccc7ea726d441594675e77",
      "reports": "CBMC 6.11.0"
    },
    "bundled rust toolchain": "nightly-2026-08-21-aarch64-apple-darwin"
  },
  "notes": "cargo-installed distribution under ~/.kani/kani-0.68.0. The proof run uses kani-compiler's own rustc (1.100.0-nightly), not the repo rustc 1.97.1; the repo rustc still drives `cargo`/`cargo check`. The Valhalla precedent version happens to be what is installed here — that is a coincidence to record, not a compatibility guarantee."
}
```

## Immutable-distribution proposal (for toolchains.json admission)

```json
{
  "id": "kani",
  "version": "0.68.0",
  "status": "proposed",
  "command": ["<task-local>/kani-0.68.0/bin/cargo-kani", "kani"],
  "source": "https://github.com/model-checking/kani/releases/tag/kani-0.68.0",
  "artifact": "kani-0.68.0-aarch64-apple-darwin.tar.gz",
  "sha256": "TO BIND AT ADMISSION — download artifact, record archive sha256",
  "notes": "Pinned release tarball, verified by sha256 before first use, unpacked under the task-local tools dir like jdk/lean. Upstream publishes per-platform tarballs plus a `kani-verifier` crates.io source package; prefer the release tarball so the recorded hash covers kani-compiler, CBMC 6.11.0 and the bundled nightly-2026-08-21 sysroot together."
}
```

```json
{
  "id": "charon",
  "version": "unselected — proposed next",
  "status": "not-installed",
  "source": "https://github.com/AeneasVerif/charon/releases",
  "notes": "Charon must pair with an Aeneas release that accepts its output schema; pick the Aeneas-pinned Charon version, not the latest. MacOS arm64 binaries are published for recent releases; otherwise build from the pinned commit and record the source hash."
}
```

```json
{
  "id": "aeneas",
  "version": "unselected — proposed next",
  "status": "not-installed",
  "source": "https://github.com/AeneasVerif/aeneas/releases",
  "notes": "Produces Lean 4 code from Charon's ULLBC/LLBC output. Pin must target the repository's Lean 4.34.0 (see verify/lean/lean-toolchain) — Aeneas emits code for a specific lean toolchain + stdlib (batteries/aesop) version; the tuple (charon, aeneas, lean) must be selected as one unit. No translation trust is admitted by installing it."
}
```

## Trust surface recorded for the integrator

- `kani-compiler` is a rustc 1.100.0-nightly fork; verified code is compiled by
  *it*, so the proof's correctness trusts kani-compiler + CBMC + kissat, the
  same shape of trust as the pinned rustc trusting LLVM for `cargo test`.
- `ring`/`aws-lc`-class C/asm dependencies are *in the crate graph* of `algal`
  but outside every harness's reachable set; Kani reports them as unsupported
  constructs and would fail — not silently skip — if a harness reached one.
- Git dependency `apple-foundation` resolves through the shared cargo cache at
  the locked commit `18f82c61338623a95310a829d589cdf0a067ccd4`; under
  `CARGO_NET_OFFLINE=true` + the committed lockfile no network is touched.
