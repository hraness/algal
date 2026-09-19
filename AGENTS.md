# Contents

- `src/` — the contract (`contract.ts`, `graph.ts`), the scheduler (`run.ts`),
  the effect seam (`effects.ts`), the store (`store.ts`), verification
  (`verify.ts`), Vercel AI Gateway execution (`gateway.ts`), typed external
  tools (`tools.ts`), the provider-neutral typed-decision layer
  (`decisions.ts`) with the TypeSafe Jev adapter (`jev.ts`), cross-platform
  credential custody (`credentials.ts`), embeddings (`embeddings.ts`) and
  the derived semantic index plus recall executor (`semantic.ts`), foundry
  evaluation and search (`foundry.ts`, `search.ts`), benchmark comparison (`bench.ts`,
  `bench-verify.ts`), bundles (`bundle.ts`), transports (`transport.ts`),
  the `algal.expr.v1` WASM loader (`expr.ts` + committed `algal_expr.wasm`),
  canonical values and digests, and colocated tests.
- `crates/algal-expr/` — the one expression evaluator (Rust): linked into
  the kernel as an rlib and compiled to `wasm32-unknown-unknown` for Bun.
  `scripts/build-expr-wasm.sh` rebuilds `src/algal_expr.wasm` (needs a
  rustup toolchain with the wasm target; pins `RUSTC` past Homebrew).
- `cli.ts` — the Bun CLI (`run`, `check`, `verify`, `inspect`, `explain`,
  `diff`, `foundry`, `bench`, `runs`, `digest`, `store`, `manifests`,
  `manifest`, `slots`, `slot`, `pack`, `unpack`, `example`, `suite`,
  `index`, `search`, `auth`, `doctor`).
- `index.ts` — the package's public surface.
- `examples/` — bundled manifests and scripted responses used by `suite`.
- `spec/v1/organism.md`, `spec/v1/expr.md`, `spec/v1/foundry.md`,
  `spec/v1/search.md`, `spec/v1/bench.md` — authoritative contract prose.
- `site/` — the static algal.dev source; `build.ts` writes `site/dist`.
- `README.md`, `CONTRIBUTING.md`, `SECURITY.md` — the public contract.

# Guidelines

- Bun 1.3.x, strict TypeScript, zero required runtime dependencies. Shared
  foundations attach through the `Store` and `Executor` seams; do not add a
  package dependency for something the contract can express.
- Parse foreign values from `unknown` and reject unknown keys. Model invalid
  states out rather than checking them late.
- The manifest is data and carries no host code. `fn` cells resolve against
  the host registry; agent cells resolve against an executor the host
  supplies; `expr` cells carry bounded `algal.expr.v1` programs that the
  contract-owned evaluator (`crates/algal-expr`, one implementation for
  both runtimes) interprets under fuel — data, not executables.
- Receipts contain no wall-clock fields. `verify` must replay a run
  bit-for-bit; keep nondeterminism at the executor boundary only.
- Bound every count, byte size, depth, and list. New contract fields need a
  bound and a test.
- Colocate tests with source (`src/*.test.ts`); cover failure modes with a
  deterministic example, not a mock-heavy harness.
- Keep the public surfaces honest: README claims match what `bun run check`
  and the tests actually prove; mark proposals as proposals.

# ALGAL native migration

- The product is ALGAL; all wire identifiers are `algal.*.v1` and manifest
  fixtures use `*.algal.json`. There is no compatibility surface for older
  naming.
- `crates/algal/` is the Rust kernel, native CLI, memory/context primitives,
  and ACP boundary. Keep the TypeScript runtime independently runnable as the
  reference implementation. No implicit native-to-Bun fallback.
- Native checks: `cargo test --workspace --locked`,
  `cargo clippy --workspace --all-targets --locked -- -D warnings`, and
  `cargo fmt --all -- --check`. Use `cargo build --locked` followed by
  `bun scripts/native-parity.ts` to compare all 44 existing examples and verify
  receipts in both directions between TypeScript and Rust.
- The Foundation Models bridge comes from the pinned `apple-foundation`
  crate (`hraness/apple-foundation`); `sh scripts/build-apple.sh` emits its
  embedded source and builds it with Xcode 26 on Apple Silicon, and the
  default `algal-apple` sibling auto-builds on first use.
  `target/debug/algal doctor --apple` checks availability; compilation alone
  is not evidence that inference works.
- xcb is the current repository for AgentMixer. It owns subscription custody
  and settled failover. Never recreate credential copying in ALGAL or treat
  ACP/cwd as OS isolation. Delegated coding tasks are non-cacheable and must
  not be automatically retried after uncertain completion.
- Canonical receipts are execution evidence, not truth or provider attestation.
  Memory query proofs are positive derivations from explicitly selected facts.
  Compaction preserves sources; byte reduction is not a token/billing claim.
