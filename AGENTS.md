# Contents

- `src/` — the contract (`contract.ts`, `graph.ts`), the scheduler (`run.ts`),
  the effect seam (`effects.ts`), the store (`store.ts`), verification
  (`verify.ts`), Vercel AI Gateway execution (`gateway.ts`), typed external
  tools (`tools.ts`), foundry evaluation and search (`foundry.ts`,
  `search.ts`), benchmark comparison (`bench.ts`, `bench-verify.ts`),
  bundles (`bundle.ts`), transports (`transport.ts`), canonical values and
  digests, and colocated tests.
- `cli.ts` — the Bun CLI (`run`, `check`, `verify`, `inspect`, `explain`,
  `diff`, `foundry`, `bench`, `runs`, `digest`, `store`, `manifests`,
  `manifest`, `slots`, `slot`, `pack`, `unpack`, `example`, `suite`).
- `index.ts` — the package's public surface.
- `examples/` — bundled manifests and scripted responses used by `suite`.
- `spec/v1/organism.md`, `spec/v1/foundry.md`, `spec/v1/search.md`,
  `spec/v1/bench.md` — authoritative contract prose.
- `site/` — the static morphogen.dev source; `build.ts` writes `site/dist`.
- `README.md`, `CONTRIBUTING.md`, `SECURITY.md` — the public contract.

# Guidelines

- Bun 1.3.x, strict TypeScript, zero required runtime dependencies. Shared
  foundations attach through the `Store` and `Executor` seams; do not add a
  package dependency for something the contract can express.
- Parse foreign values from `unknown` and reject unknown keys. Model invalid
  states out rather than checking them late.
- The manifest is data and carries no code. `fn` cells resolve against the
  host registry; agent cells resolve against an executor the host supplies.
- Receipts contain no wall-clock fields. `verify` must replay a run
  bit-for-bit; keep nondeterminism at the executor boundary only.
- Bound every count, byte size, depth, and list. New contract fields need a
  bound and a test.
- Colocate tests with source (`src/*.test.ts`); cover failure modes with a
  deterministic example, not a mock-heavy harness.
- Keep the public surfaces honest: README claims match what `bun run check`
  and the tests actually prove; mark proposals as proposals.
