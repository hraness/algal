# `replay-isolation` — registration

How this suite relates to the verification tree.

## Suite map

```
verify/replay/replay-isolation/
  fixture.ts        — supervised scenario runner (instrumented seams)
  isolation.test.ts — runCommand custody + retained-evidence readback
  SCOPE.md          — exercised properties and exclusions
  REGISTRATION.md   — this file
```

Listed in `verify/lib/suites.ts` `PLANNED_SUITES` as `"replay-isolation"`.
It is not wired into `verify/run.ts` (no archive adapter yet); it runs as
`bun test verify/replay/replay-isolation` like the receipt-closure suite.

## Harness machinery used

- `runCommand` + `requireSuccess` — every scenario executes in a supervised
  fresh process; stdout is asserted to be exactly one bounded JSON line.
- `retainEvidence` / `readRetainedEvidence` — the fixture's `report.json`
  is retained under `algal.retained-evidence.v1` and re-admitted from the
  copied physical root; the readback must equal the original admission.
- Bounded limits — `commandMs`, `maxOutputBytes`, and evidence limits are
  fixed constants in `isolation.test.ts`.

## Dependencies on production surfaces

| File | Used as |
|---|---|
| `src/verify.ts` | `verifyReceipt`, `resumeRun`, `diffReceipts` — the surfaces under test |
| `src/run.ts` | `runOrganism`, `receiptDigest`, `canonicalizeReceipt` |
| `src/effects.ts` | `replayExecutor`, `scriptedExecutor`, `Executor` shape |
| `src/store-memory.ts` | `MemoryStore`, `replayStore` |
| `src/bundle.ts` | `packOrganism` for the `via` closure fixture |
| `src/transport-contract.ts` | `Transport` seam |
| `src/tools.ts` | `ToolRegistry` seam |
| `src/contract.ts` | `parseOrganismManifest`, `manifestToJson` |

Production files are imported read-only; no fixture writes to source.

## Companion

`verify/replay/lean-replay` runs the Lean-side build + axiom audit. The
proved statement `Algal.Replay.steps_replay_reproduces` is the model-side
counterpart of this suite's `verify-isolation` property; the file itself
documents that the model is not a refinement proof.
