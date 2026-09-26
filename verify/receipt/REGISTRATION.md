# receipt-closure — integrator notes

## What this directory contains

| File | Contents |
| --- | --- |
| `bounds.ts` | Pure, dependency-free mirror of the receipt resource predicate (`checkReceiptResources`, src/run.ts:1864-1906) and field caps (`parseReceiptFields`), plus `decideRunClosure` — the three-way closure decision over a measured run summary. No imports; every constant cites its source line. |
| `closure.test.ts` | `bun:test` coverage: bound-record parity with `RECEIPT_BOUNDS`, walker semantics (node/depth/byte counting, sparse/inherited/non-enumerable array positions, non-JSON rejection), accept/reject parity against `parseRunReceipt` including the exact 1,000,000-node boundary, and the full `decideRunClosure` matrix — mintable, bounded failure, boundary, multi-bound, field-inadmissible and malformed inputs. |
| `fixtures.ts` | Static measured summaries: `record-orders` size 1 (real minted receipt, measured) and size 7 (the F09 bounded failure, reproduced through `measuredRun`), boundary fixtures, and the mintable-but-process-unstorable gap case. No runtime spawning. |
| `closure.md` | The obligation statement, the complete bound map with enforcement points, the measured counterexample, and the residual gaps. |

## Suggested suite

**`receipt-closure`** — already listed in `PLANNED_SUITES`
(verify/lib/suites.ts:5) and named in the Phase-14 validation line
(docs/formal-verification-plan.md:377).

To activate it in the runner, the integrator owns three edits outside this
directory's scope:

1. `verify/lib/suites.ts` — move `"receipt-closure"` from `PLANNED_SUITES` to
   `READY_SUITES`.
2. `verify/lib/runner.ts` — add an `executeSuite` arm. The suite is
   self-contained Bun tests; the existing pattern applies:

   ```ts
   if (suite === "receipt-closure") {
     const command = [process.execPath, "test", "--timeout", "20000", "verify/receipt"];
     const result = await runCommand(command, root);
     return { tests: admitSelftestOutput(result), commandResult: result,
       scope: "Static closure-decision and bound-mirror checks over measured summaries; no exhaustive or producer-instrumented claim." };
   }
   ```

   (The parity block inside `closure.test.ts` imports `parseRunReceipt` and
   `RECEIPT_BOUNDS` from `src/run.ts` — pure parsing, no run execution.)

3. `verify/properties.json` — the `bounds` field of RCP-05 already names
   "receipt bytes/nodes/depth per parser"; consider recording this suite's
   result in `evidence.results` when the suite lands.

## Property coverage

- **RCP-05** (phase 14, severity high, findings F09) — *"Every supported
  produced receipt/bundle is consumable within parser bounds or execution
  returns a bounded typed failure preserving effect uncertainty."* This is
  the primary target: the `receipt-closure` leg of that obligation is now
  stated as a checkable predicate (`decideRunClosure`) with boundary and
  counterexample coverage. Current evidence is `suite: "replay-isolation"`,
  `status: "observed"`. This suite can be recorded as additional finite
  evidence under `receipt-closure`; it does not upgrade the claim — the
  universal quantifier over all permitted executions, producer-instrumented
  measurement coverage, and the native mirror remain open (see
  `closure.md` §residual-gaps and RCP-05's `unresolved` list, which this
  work corroborates: the mintable-vs-process-custody gap is exercised by a
  real measured receipt, `RECORD_ORDERS_1`).
- **Adjacent, not directly evidenced:** ADM-03 (count/byte/node/depth
  admission before retained use — the receipt envelope is one instance),
  RCP-01/RCP-02 (field comparison/version binding — assumed, not exercised),
  and the bundle/evidence legs of RCP-05's own statement (bundle bytes and
  process-evidence envelopes are mapped in `closure.md` but not separately
  exercised here).

## Command

```sh
bun test verify/receipt/
```

Fast and deterministic: all inputs are static fixtures; the heaviest case
constructs one ~1,000,000-element array for the parser boundary parity.
