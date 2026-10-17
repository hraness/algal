# Event-loop P1 behavior field review

The 28 formerly open behavior cells in the [P1 field matrix](event-loop-p1-matrix.md) have one isolated control and one changed record apiece. The tests check behavior-only summaries before any delivery and a structural trace join against the same behavior. TypeScript and Rust agree on their acceptance, refusal codes, and returned digests for these records. The matrix now marks this parser and structural evidence at its actual scope; it does not establish execution.

Agent-decided, owner may revisit: an extra key belongs to its containing object, so five distinct extra keys in `limits` test the same object rule, not five independent limit parsers. An enum has no numeric maximum; its negative case here is one accepted member and one invalid member. The `sourceDigest` check validates syntax, not source bytes.

| Former matrix cell | Isolated change and refusal |
| --- | --- |
| `behavior.revision`, `behavior.sourceDigest`, `behavior.digest` extra | Each metadata sibling key is added separately. `EVENT_LOOP_UNKNOWN_KEY`. |
| `behavior.sourceDigest` edge | 64 to 65 lowercase hex digits after `sha256:`. `EVENT_LOOP_DIGEST`. |
| Five `limits.*` extra cells | One new sibling key per limit in a separate record. `EVENT_LOOP_UNKNOWN_KEY`. The trace keeps the control limits so its own parser cannot mask the behavior refusal. |
| `events[*].id` extra | New sibling key on an unused event. `EVENT_LOOP_UNKNOWN_KEY`. |
| `events[*].payload.kind`, `events[*].payload.fields[*].type` negative | `record` to `tuple` and `string` to `bytes` in an unused event. `EVENT_LOOP_SCHEMA`. |
| `actors[*].id` extra | New sibling key on an unselected actor. `EVENT_LOOP_UNKNOWN_KEY`. |
| `actors[*].state.kind` negative and malformed | `record` to `tuple`, then `record` to a number, in separate records. `EVENT_LOOP_SCHEMA`. |
| `actors[*].state.fields[*].name` extra | New sibling key on an unselected state field. `EVENT_LOOP_UNKNOWN_KEY`. |
| `actors[*].state.fields[*].type` negative | `number` to `bytes` on an unselected actor. `EVENT_LOOP_SCHEMA`. |
| `actors[*].state.fields[*].initial` edge | A string of 65,536 UTF-8 bytes accepts; 65,537 refuses with `EVENT_LOOP_BOUNDS`. The whole state also has a separate byte limit. |
| `actors[*].transitions[*].on` edge | A referenced event id at 64 bytes accepts; 65 bytes refuses with `EVENT_LOOP_ID`. |
| `actors[*].transitions[*].outputs[*].kind` negative | `notify` to `send` on an unselected output. `EVENT_LOOP_SEMANTIC`. |
| `actors[*].transitions[*].outputs[*].target` edge | A declared actor id at 64 bytes accepts; 65 bytes refuses with `EVENT_LOOP_ID`. |
| `actors[*].transitions[*].outputs[*].event` edge | A declared event id at 64 bytes accepts; 65 bytes refuses with `EVENT_LOOP_ID`. |
| `actors[*].transitions[*].outputs[*].payload` edge | An expression envelope of 16,384 UTF-8 bytes accepts; 16,385 refuses with `EVENT_LOOP_BOUNDS`. |
| `actors[*].transitions[*].result.key` and `.request` extra | A defer or escalate result gains one unknown sibling key. `EVENT_LOOP_UNKNOWN_KEY`. |
| `actors[*].transitions[*].result.key` and `.request` edge | Each pending expression accepts at 16,384 envelope bytes and refuses at 16,385 with `EVENT_LOOP_BOUNDS`. |
| Root `digest` missing | The root key is removed without inventing a digest. `EVENT_LOOP_PARSE`. The trace remains bound to its accepted control. |

Each control adds an actor that the trace does not select and an event that the trace does not deliver, with fresh root and trace digests. The [vector generator](../../scripts/event-loop-behavior-field-vectors.ts) checks its 28-cell inventory. The [colocated test](../../src/event-loop-behavior-field-matrix.test.ts) checks both entry points against accepted controls. The [parity script](../../scripts/event-loop-behavior-fields-parity.ts) compares 28 control/damage pairs (56 records) in both runtimes at both entry points, splitting native requests below the 64-record and 4 MiB input limits.

## Selected-actor replay evidence

A separate [delivery vector set](../../scripts/event-loop-delivery-field-vectors.ts) selects an `observer` actor copied from the original `counter` actor and replays one claimed `increment` event for it. Each of the six pairs has a redigested behavior and trace on both sides. The control replays; a changed, valid behavior passes the behavior-only summary and structural trace join but fails replay in both runtimes. The [colocated test](../../src/event-loop-delivery-fields.test.ts) checks the preceding steps; the [replay parity script](../../scripts/event-loop-delivery-fields-parity.ts) compares the resulting digest or refusal code for 12 records.

| Selected actor field | Replayed control and changed program or value |
| --- | --- |
| `state.fields[*].initial` | Start with `count: 0` and claim `count: 1`; a new initial `count: 1` changes the computed final state to `count: 2`. |
| `transitions[*].when` | The true guard selects `increment`; a false literal cannot select the claimed transition. |
| `transitions[*].writes[*].value` | Adding two instead of one changes the computed final state. |
| `transitions[*].outputs[*].payload` | A literal `{amount: 2}` changes the notification digest; the changed trace claims its measured fuel but still claims the original notification payload. |
| `transitions[*].result.key` | A defer rule returns `ticket`; changing its expression to `other` contradicts the pending witness. |
| `transitions[*].result.request` | An escalate rule returns `{action: "review"}`; changing its expression to `{action: "reject"}` contradicts the pending witness. |

## Status and limits

The original 28 cells now carry static parser or structural-join evidence in the matrix. The six additional pairs check selected-actor replay for the listed field values only. Neither set observes event delivery or host publication; an undelivered sibling's expression is not evaluated. The matrix retains three pure-effect limit cells as open; other field combinations, exact-tree aggregate checks, and affirmative independent review also remain open. Keep draft PR #278 unmerged.

## Local verification snapshot, 2026-10-15

Agent-decided, owner may revisit: preserve this increment on the existing draft branch `codex/p1-portable-event-loop-contract-20261012`, not a competing branch from `origin/main`. HEAD is `d64d3c14bf8513a02beb6b607230d024d830004b`; seven evidence files, including the three delivery replay files, remain untracked and are not on that published head. No commit, push, merge, or PR comment was made for this snapshot.

After `bun install --frozen-lockfile`, the two field tests passed (403 assertions). The new delivery parity script matched six control/mutation pairs (12 records), and all ten existing event-loop parity scripts passed. `cargo test -p algal --locked event_loop`, TypeScript typecheck, lint, docs check, Cargo Clippy, format, build, and native parity passed with the cached offline Rust toolchain. `git diff origin/main...HEAD --check` passed for tracked changes only; it does not inspect the seven untracked files.

The aggregate gates remain unresolved: `bun run check` timed out at 600 seconds in its test stage after a `Bun.serve` loopback `EADDRINUSE` failure in `src/vendor-cli.test.ts`; cached-offline `cargo test --workspace --locked` failed in `crates/algal/tests/http.rs`, where both tests could not bind loopback (`PermissionDenied`, `Operation not permitted`). A focused run of those two HTTP tests reproduced the binding failure. These are not passing aggregate results, and final-tree Required plus independent review have not run. P1 remains blocked and #278 remains draft.
