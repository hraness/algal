# Contributing

ALGAL is early and the contract is deliberately small. Contributions are
welcome; the bar is that the contract stays checkable. Read the
[vision](docs/vision.md) for what the contract is for.

## Setup

Requires Bun ≥ 1.3 (`bun install`).

## Checks

```sh
bun run check
```

Runs the typechecker, linter, test suite, and site build. Focused tests while
editing: `bun test src/run.test.ts`.

## Rules of the house

- Parse every foreign value from `unknown`; reject unknown keys.
- Keep the manifest free of host code. New behavior lands as registry fns,
  contract fields, bounded contract-interpreted programs (`algal.expr.v1`
  cells — data the shared evaluator runs under fuel), or executor adapters —
  never eval, never string-loaded code.
- No wall-clock values in receipts. Runs must replay bit-for-bit with fixed
  effect receipts.
- Bound everything: counts, bytes, depth, labels, prompts.
- Keep model output as data. Nothing an executor returns may become authority.
- Open a pull request; do not force-push.

## Bugs and security

Use GitHub issues for bugs. For security reports, see `SECURITY.md`.
