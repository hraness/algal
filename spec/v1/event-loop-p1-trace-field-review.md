# Event-loop P1 trace-field review supplement

Status: proposed offline shape-parser evidence, 2026-10-14. This supplements the [P1 field matrix](event-loop-p1-matrix.md), whose `?` cells remain conservative until the full matrix is reconciled. Agent-decided, owner may revisit: add isolated controls before changing the matrix's field statuses. This is not a runtime, host-effect, or publication claim.

`scripts/event-loop-trace-field-vectors.ts` produces 28 redigested mutations, each paired with its own accepted prefix. `scripts/event-loop-trace-fields-parity.ts` sends the same 56 records to the TypeScript and Rust trace summary parsers and compares acceptance, refusal codes, full claimed-count summaries, and canonical digests. `src/event-loop-trace-fields.test.ts` checks the root hashes, controls, isolated extra keys, actor reidentification, and the named byte/list edges. The added keys are siblings of the named fields, not extra list items. Each extra-key mutation deletes cleanly back to its accepted control.

| Matrix `?` cells with new evidence | Probe | Shape-parser result |
| --- | --- | --- |
| Trace `limits`, `entries`: Extra | One unknown sibling key at the root for each | `EVENT_LOOP_UNKNOWN_KEY` |
| Trace `entries[*].decision`: Extra | Unknown sibling on the accepted entry | `EVENT_LOOP_UNKNOWN_KEY` |
| Trace `decision.kind`, `transition`, `outcome`, `stateDigest`, `outputs`, `effects`, `resources`: Extra | One distinct unknown sibling key per accepted-decision field | `EVENT_LOOP_UNKNOWN_KEY` |
| Trace `decision.effects.requested`, `settled`, `receipts`: Extra | One distinct unknown sibling key per effect-summary field | `EVENT_LOOP_UNKNOWN_KEY` |
| Trace `decision.resources.fuel`, `stateBytes`, `outputEvents`: Extra | One distinct unknown sibling key per resource-summary field | `EVENT_LOOP_UNKNOWN_KEY` |
| Trace `decision.policy`, `reason` (backpressure): Extra | One distinct unknown sibling key per backpressure field | `EVENT_LOOP_UNKNOWN_KEY` |
| Trace `actor`, `decision.transition`, `decision.reason` (backpressure): Limit edge | 64-byte ASCII ID accepted; 65-byte ID refused | `EVENT_LOOP_ID` at first excess |
| Trace `decision.outputs`: Limit edge | Declared maximum and output count both 64; 64 hashes accepted, 65 refused | `EVENT_LOOP_BOUNDS` at first excess |

The root `actor` extra-key probe repeats evidence for an already marked R cell; it is not a newly covered `?`. The root `actor` edge rehashes the event and message identities before checking the valid record. The accepted `transition` edge is **shape only**: no behavior declaring that 64-byte transition is joined. The accepted 64-output case is a claimed trace summary, not 64 executed notifications. Backpressure reason is supplied by the caller; the fixture does not observe a host mailbox. All records are JSON and contain no wall-clock field.

The base matrix had 59 `?` cells (28 behavior, 31 trace) when this supplement was made. Eighteen of the 19 extra-key probes, plus four limit-edge pairs, address 22 previously unproved trace cells. **37 remain unproved**: all 28 behavior cells, plus trace `limits` malformed, `entries[*].payload` limit, `entries[*].decision` malformed, `decision.effects` malformed, `decision.effects.requested`/`settled`/`receipts` limit edges, `decision.resources` malformed, and backpressure `decision.reason` malformed. Each must be proved or justified as inapplicable before the matrix can close. One sibling-key refusal does not show that arbitrary field combinations, a real behavior transition, or host effects are valid. P1 remains blocked pending those cases, applicable aggregate checks, and independent final-tree review.
