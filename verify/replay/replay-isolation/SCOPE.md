# `replay-isolation` — instrumented replay boundary evidence

Phase 14 runtime suite: proves, by instrumented capture, that production
replay (`verifyReceipt`/`resumeRun` in `src/verify.ts`) does not reach the
live channels it claims to exclude, and marks exactly where the claim
stops.

Each scenario runs in a supervised `bun fixture.ts <scenario> <dir>`
subprocess through `runCommand` (deadline + output bound + group cleanup).
The fixture instruments four seams — `Store` (every method counted,
`manifestReads` and `slotWrites` named), `Executor` (`execute`,
`executeEffect`, `receiptFor`, `serves`, `journalConfigurationFor` each
counted), `ToolRegistry` (invocations counted), `Transport` (`getBundle`
arguments recorded). The fixture writes `report.json` into an evidence dir
that the test retains via `retainEvidence` and re-reads offline via
`readRetainedEvidence`; the stdout capture is one bounded JSON line.

All manifests, responses, and tampering are fixed constants — there is no
nondeterminism to seed.

## Scenarios

| Scenario | Property evidenced |
|---|---|
| `verify-isolation` | `verifyReceipt` leaves every source-store channel at zero (all ten `Store` methods, including every mutator); the recorded `tool` is never re-invoked; under the scheduler arm (`runOrganism` with `replayExecutor` + an admissible live executor + full replay options), the live executor's counters stay at zero and the rerun receipt is byte-identical. |
| `tool-miss` | A receipt whose tool effect record was stripped diverges (`verify.ok = false`, named mismatches) rather than falling through to the live tool — `replayToolFallthrough` absent means no fallthrough, observed at zero tool invocations. |
| `resume-prefix` | A suspended checkpoint verifies, then `resumeRun` replays the recorded prefix (step1's effect served from tape, settled slot write suppressed, `setSlot`/`getSlot` at zero on the live store) and dispatches exactly the unreached tail (`tail.execute = 1`, `receiptFor = 1`, nothing else); resumed receipt keeps the prefix request digest. |
| `resume-tampered-digest` | `resumeRun` rejects a checkpoint whose digest field disagrees with its contents (`DIGEST_MISMATCH`) before the tail executor is touched. |
| `resume-tampered-content` | A digest-*consistent* forged checkpoint (recomputed `receiptDigest` over altered cell outputs) passes the self-check and is refused by prefix verification (`RECEIPT_MISMATCH`) — still before any live dispatch; store mutations stay at zero. |
| `closure` | Portable dependency closure: (a) a digest-referenced sub-manifest resolves locally and the declared `via` transport is never consulted; record and verify manifest reads name only the declared digest. (b) A `via`-declared miss fetches the digest-verified bundle through the named transport exactly once and records `via` on the receipt cell. (c) The same miss with an empty transport rejects `STORE_MISS` naming the exact digest. (d) A manifest *without* `via` rejects `STORE_MISS` with the same digest while an ambient transport registered under the same name is never consulted. |
| `oracle-replacement` | The same manifest under a different oracle produces a different digest; both receipts verify against their own evidence; `diffReceipts` names the divergence. Oracle replacement is different execution evidence, not detectable forgery. |

## What is claimed

- For the exercised fixtures, replay produces receipts byte-identical to
  the recorded run while every instrumented live/mutable channel reports
  zero.
- Resume order: manifest binding → receipt self-consistency → prefix
  verification → live tail admission, each gate observed to fire.
- Closed dependency resolution reads only declared digests, via declared
  channels, with exact missing-digest rejection.

## What is not claimed

- No claim for manifests or states outside the seven fixtures.
- No claim that arbitrary callback code is safe — the instrumentation
  measures the shipped seams, it does not sandbox a hostile executor.
- No oracle provenance claim — `oracle-replacement` is the documented
  boundary (matching `Algal.Replay.recomputed_history_verifies`).
- No proof that `replayStore`'s overlay discipline holds under adversarial
  `Store` implementations — the counters measure the seam contract.
- No Lean-model correspondence claim — that direction is proved in
  `verify/lean/Algal/Replay`; this suite is the runtime measurement.
