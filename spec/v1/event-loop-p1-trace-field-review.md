# Event-loop P1 trace-field review supplement

Status: proposed offline shape-parser evidence, 2026-10-15. This supplements the [P1 field matrix](event-loop-p1-matrix.md); its `?` cells are conservative until the matrix is reconciled and independently reviewed. Agent-decided, owner may revisit: test the remaining trace cells using isolated controls, while keeping host-dependent claims outside shape-parser evidence. This is not a runtime, host-effect, or publication claim.

`scripts/event-loop-trace-field-vectors.ts` produces 44 redigested mutations, each paired with its own accepted prefix. `scripts/event-loop-trace-fields-parity.ts` sends the same 88 records to the TypeScript and Rust trace summary parsers and compares acceptance, refusal codes, claimed-count summaries, and canonical digests. `src/event-loop-trace-fields.test.ts` checks root hashes, controls, isolated extra keys, identities, and named limits. The added keys are siblings of the named fields, not extra list items. Each extra-key mutation deletes cleanly back to its accepted control.

| Matrix `?` cells covered by the first 28 mutations | Probe | Shape-parser result |
| --- | --- | --- |
| Trace `limits`, `entries`: Extra | One unknown sibling key at the root for each | `EVENT_LOOP_UNKNOWN_KEY` |
| Trace `entries[*].decision`: Extra | Unknown sibling on the accepted entry | `EVENT_LOOP_UNKNOWN_KEY` |
| Trace `decision.kind`, `transition`, `outcome`, `stateDigest`, `outputs`, `effects`, `resources`: Extra | One distinct unknown sibling key per accepted-decision field | `EVENT_LOOP_UNKNOWN_KEY` |
| Trace `decision.effects.requested`, `settled`, `receipts`: Extra | One distinct unknown sibling key per effect-summary field | `EVENT_LOOP_UNKNOWN_KEY` |
| Trace `decision.resources.fuel`, `stateBytes`, `outputEvents`: Extra | One distinct unknown sibling key per resource-summary field | `EVENT_LOOP_UNKNOWN_KEY` |
| Trace `decision.policy`, `reason` (backpressure): Extra | One distinct unknown sibling key per backpressure field | `EVENT_LOOP_UNKNOWN_KEY` |
| Trace `actor`, `decision.transition`, `decision.reason` (backpressure): Limit edge | 64-byte ASCII ID accepted; 65-byte ID refused | `EVENT_LOOP_ID` at first excess |
| Trace `decision.outputs`: Limit edge | Declared maximum and output count both 64; 64 hashes accepted, 65 refused | `EVENT_LOOP_BOUNDS` at first excess |

The root `actor` extra-key probe repeats evidence for an already marked R cell. The root `actor` edge rehashes the event and message identities before checking the valid record. The accepted `transition` edge is shape only: no behavior declaring that 64-byte transition is joined. The accepted 64-output case is a claimed trace summary, not 64 executed notifications.

| Nine remaining trace `?` cells addressed by 16 more mutations | Probe and accepted control | Shape-parser result |
| --- | --- | --- |
| `limits`: Malformed | Accepted limits object; replace with `null` | `EVENT_LOOP_PARSE` |
| `entries[*].payload`: Limit edge | Set `maxEventBytes` to 128, then reidentify 128-byte ASCII and UTF-8 canonical `{source,sequence,type,payload}` envelopes separately; append one ASCII payload byte and reidentify each | Both 128-byte shapes accepted; both 129-byte shapes give `EVENT_LOOP_BOUNDS` |
| `entries[*].decision`: Malformed | Accepted decision object; replace with `null` | `EVENT_LOOP_PARSE` |
| `decision.effects`: Malformed | Accepted summary object; replace with `null` | `EVENT_LOOP_PARSE` |
| `decision.effects.requested`: Limit edge | Pure accepted control requests zero; request 1, 64, or 65 | 1 and 64 give `EVENT_LOOP_SEMANTIC`; 65 gives `EVENT_LOOP_BOUNDS` |
| `decision.effects.settled`: Limit edge | Pure accepted control settles zero; settle 1 or 65 without a request | Both give `EVENT_LOOP_BOUNDS` |
| `decision.effects.receipts`: Limit edge | Pure accepted control has an empty list; add 1 or 65 valid digest strings without settled effects | Both give `EVENT_LOOP_BOUNDS` |
| `decision.resources`: Malformed | Accepted summary object; replace with `null` | `EVENT_LOOP_PARSE` |
| `decision.reason` (backpressure): Malformed | Accepted full-mailbox prefix; replace the ID with `null` | `EVENT_LOOP_ID` |

The payload probes check the declared event envelope byte limit, including a two-byte UTF-8 character, not the independent 65,536-byte JSON string limit; their added `padding` key is not accepted by the pinned behavior's event schema. The effect boundary for a pure transition is zero: these cases cannot prove a nonzero settled effect or a host receipt, and the 65-count refusals do not by themselves isolate the internal 64-count bound from the zero-request rule. Backpressure reason comes from the caller; the fixture does not observe a host mailbox. All records are JSON and contain no wall-clock field.

The base matrix had 59 `?` cells (28 behavior, 31 trace) before the first supplement. The first 28 vectors covered 22 trace cells, and the next 16 address the other nine trace cells at the stated shape-only scope. **The 28 behavior cells remain unproved.** The base matrix still shows its earlier 37-cell status pending reconciliation of this supplement; do not treat its `?` marks as closed in that file. P1 remains blocked pending those behavior cases, applicable aggregate checks, and independent final-tree review.
