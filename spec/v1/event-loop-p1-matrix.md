# Event-loop P1 field review

This record maps the proposed `algal.event-loop.v1` behavior and `algal.event-loop.trace.v1` trace to offline fixtures. A behavior describes an actor's event rules; a trace claims decisions. The TypeScript implementation is in `src/event-loop-*`; the Rust mirror is in `crates/algal/src/event_loop*`. Matching digests and refusal codes establish the stated parser, structural, or replay checks, not event delivery or host publication.

Each table cell has a scope: **B** is an accepted fixture, **R** a directly tested refusal, **E** an accepted limit and first excess, **E₀** the accepted zero or empty v1 invariant and first nonzero refusal, **n/a** no independent numeric limit, and **?** an untested edge at the scope named in the cell. New evidence is marked **Rₛ/Eₛ** for shape-only parsing, **Rⱼ/Eⱼ** for a behavior-only parse plus structural join, or **Rᵣ** for replay. An unmarked R/E is the earlier test at the scope described in its row. An extra key is a sibling of the named field, not an extra list item or a distinct field parser. Paths with `*` name a list item, not a JSON Pointer. The shape fixture is `scripts/fixtures/event-loop-contract.json`; the behavior is `benchmarks/language/actors/echo.json`. The [behavior-field review](event-loop-p1-behavior-field-review.md), [trace-field review](event-loop-p1-trace-field-review.md), and [pure-effect evidence](event-loop-p1-pure-effect-evidence.md) give vector names, controls, and limitations. **Agent-decided, owner may revisit:** reconcile the table at the evidence's actual scope; do not equate shape acceptance with delivery or replay.

## Behavior fields

The new Rⱼ/Eⱼ probes have individually accepted controls, redigested behavior and trace roots, and matching TypeScript/Rust behavior-only and structural-join results. Their added actor is not selected and their added event is not delivered. Only the six separately identified selected-actor cases run through replay; these do not validate every field combination.

| Field | Fixture | Missing | Extra | Limit edge | Malformed or conflict | Evidence and limit |
| --- | --- | --- | --- | --- | --- | --- |
| `contract` | B | R | R | n/a | R | Redigested omission and wrong version refuse. |
| `behavior.id` | B | R | R | E | R | ID accepts 64 bytes, refuses 65 and invalid syntax. |
| `behavior.revision` | B | R | Rⱼ | E | R | Maximum 2,147,483,647 and first excess; stale metadata digest refuses. |
| `behavior.sourceDigest` | B | R | Rⱼ | Eⱼ | R | A `sha256:` digest with 64 lowercase hex characters accepts; one with 65 refuses. No source bytes are checked. |
| `behavior.digest` | B | R | Rⱼ | n/a | R | Missing or stale metadata digest refuses; hash is not provenance. |
| `limits.maxEventBytes` | B | R | Rⱼ | E | R | Shared limits-object extra probe; event byte and declared-limit edges. |
| `limits.maxStateBytes` | B | R | Rⱼ | E | R | Shared limits-object extra probe; initial states checked for all actors. |
| `limits.maxOutputEvents` | B | R | Rⱼ | E | R | Shared limits-object extra probe; selected actor's 64/65 outputs. |
| `limits.maxTransitionFuel` | B | R | Rⱼ | E | R | Shared limits-object extra probe; static summary limit and selected replay. |
| `limits.maxMailboxDepth` | B | R | Rⱼ | E | R | Shared limits-object extra probe; host capacity not observed. |
| `events[*].id` | B | R | Rⱼ | E | R | Unused event accepts 64-byte ID, refuses 65, missing ID, and duplicates; list accepts 128, refuses 129. |
| `events[*].payload.kind` | B | R | R | n/a | R | Unused event refuses `tuple` in place of `record`. |
| `events[*].payload.fields[*].name` | B | R | R | E | R | Unused field accepts 64-byte name, refuses 65; list accepts 64, refuses 65. |
| `events[*].payload.fields[*].type` | B | R | R | n/a | R | Unused field refuses `bytes`; wrong delivered value type also refuses. |
| `actors[*].id` | B | R | Rⱼ | E | R | Unselected actor ID accepts 64 bytes, refuses 65; actor list accepts 64, refuses 65. |
| `actors[*].state.kind` | B | R | R | n/a | Rⱼ | Unselected state refuses `tuple` and numeric kind. |
| `actors[*].state.fields[*].name` | B | R | Rⱼ | E | R | Unselected field and selected field accept 64-byte names, refuse 65. |
| `actors[*].state.fields[*].type` | B | R | R | n/a | R | Unselected state refuses `bytes`; initial values checked for all actors. |
| `actors[*].state.fields[*].initial` | B | R | R | Eⱼ | R | A 65,536-byte string accepts, 65,537 refuses; whole state also has a byte limit. Selected-actor changed initial value separately refuses on replay. |
| `actors[*].transitions[*].id` | B | R | R | E | R | Unselected omission refuses; selected actor accepts 256 rules, refuses 257. |
| `actors[*].transitions[*].on` | B | R | R | Eⱼ | R | An unselected rule referencing a declared 64-byte event ID accepts; 65 refuses. |
| `actors[*].transitions[*].when` | B | R | R | E | R | Static check visits all actors; changed selected guard separately refuses on replay. |
| `actors[*].transitions[*].writes[*].path` | B | R | R | E | R | Zero/two-field, duplicate, and unknown paths refuse; 64 writes accept, 65 refuse. |
| `actors[*].transitions[*].writes[*].value` | B | R | R | E | R | Static syntax check does not establish returned types; selected changed value separately refuses on replay. |
| `actors[*].transitions[*].outputs[*].kind` | B | R | R | n/a | R | Unselected output refuses `send`; only `notify` is permitted. |
| `actors[*].transitions[*].outputs[*].target` | B | R | R | Eⱼ | R | Declared 64-byte actor ID accepts, 65 refuses on an unselected output. |
| `actors[*].transitions[*].outputs[*].event` | B | R | R | Eⱼ | R | Declared 64-byte event ID accepts, 65 refuses on an unselected output. |
| `actors[*].transitions[*].outputs[*].payload` | B | R | R | Eⱼ | R | Expression envelope accepts 16,384 bytes, refuses 16,385; selected changed payload separately refuses on replay. |
| `actors[*].transitions[*].result.kind` | B | R | R | n/a | R | Pending rules cannot write or emit, including on a sibling actor. |
| `actors[*].transitions[*].result.key` | B | R | Rⱼ | Eⱼ | R | Unselected defer expression accepts 16,384 bytes, refuses 16,385; changed selected key separately refuses on replay. |
| `actors[*].transitions[*].result.request` | B | R | Rⱼ | Eⱼ | R | Unselected escalate expression accepts 16,384 bytes, refuses 16,385; changed selected request separately refuses on replay. |
| `digest` | B | Rⱼ | R | n/a | R | A missing root digest refuses without a fabricated replacement; other mutations have fresh root digests. |

The structural join once checked declarations only for the actor named by the trace. A second actor with an invalid field type and no transitions could pass after both digests were refreshed. Both joins now check every actor's declarations. Sibling vectors exercise selected-actor and unselected-actor declaration refusals, but static inspection of an unselected expression is not its execution. The [behavior-only summary](event-loop-behavior-summary.md) reports possible reads, writes, emitted event types, pending outcomes, no granted capabilities, and five declared limits before a trace is supplied. It conservatively includes all declared fields for computed reads. It does not establish runtime values, host effects, or useful work.

## Trace fields

Rₛ/Eₛ marks parser or claimed-summary evidence only. The [trace-field vector set](../../scripts/event-loop-trace-field-vectors.ts) uses a single accepted entry for the accepted-decision mutations, redigests each root, and reidentifies events when changing actor or payload. The 64-output control is a claimed list, not executed notifications. Pure effects have a reachable zero edge only: the separate [pure-effect vectors](../../scripts/event-loop-pure-effect-vectors.ts) test that v1 invariant at shape, structural-join, and replay scope, not a nonzero effect maximum.

| Field | Fixture | Missing | Extra | Limit edge | Malformed or conflict | Evidence and limit |
| --- | --- | --- | --- | --- | --- | --- |
| `contract` | B | R | R | n/a | R | Wrong version refuses. |
| `behavior` | B | R | R | n/a | R | Structural join requires behavior digest to match the root. |
| `actor` | B | R | R | Eₛ | R | 64-byte actor ID accepted by shape parser after reidentification; 65 refused; unknown actor refused by join. |
| `limits` | B | R | Rₛ | n/a | Rₛ | Null limit object refuses before individual keys are read. |
| `limits.maxEventBytes` | B | R | R | E | R | Event envelope byte limit checked independently of payload schema. |
| `limits.maxStateBytes` | B | R | R | E | R | Claimed state byte edges checked. |
| `limits.maxOutputEvents` | B | R | R | E | R | Claimed count checked; output identities need replay. |
| `limits.maxTransitionFuel` | B | R | R | E | R | Claimed fuel checked; evaluation needs replay. |
| `limits.maxMailboxDepth` | B | R | R | E | R | Claimed depth checked; no host mailbox observed. |
| `entries` | B | R | Rₛ | E | R | One through 256 accepted; empty and 257 refused. |
| `entries[*].source` | B | R | R | E | R | Reidentified 64-byte ID accepts, 65 refuses. |
| `entries[*].sequence` | B | R | R | E | R | Maximum 2,147,483,647 accepts; first excess and conflicting reuse refuse. |
| `entries[*].type` | B | R | R | E | R | Reidentified 64-byte ID accepts, 65 refuses. |
| `entries[*].payload` | B | R | R | Eₛ | R | Reidentified 128-byte ASCII and UTF-8 envelopes accept, 129 refuse; extra `padding` is not in the behavior schema. |
| `entries[*].delivery` | B | R | R | E | R | 64-byte ID accepts, 65 refuses; delivery changes message but not event identity. |
| `entries[*].eventDigest` | B | R | R | n/a | R | Hash binds behavior, actor, source, sequence, type, and payload. |
| `entries[*].messageDigest` | B | R | R | n/a | R | Hash binds event digest, actor target, and delivery. |
| `entries[*].depthBefore` | B | R | R | E | R | Claimed full depth and premature backpressure refuse where inconsistent. |
| `entries[*].decision` | B | R | Rₛ | n/a | Rₛ | Null decision refuses before kind is read. |
| `decision.kind` | B | R | Rₛ | n/a | R | Accepted and duplicate prefixes refuse missing kind. |
| `decision.transition` | B | R | Rₛ | Eₛ | R | Shape parser accepts 64-byte ID, refuses 65; no joined declaration of that 64-byte rule. |
| `decision.outcome` | B | R | Rₛ | n/a | R | Selected rule and pending state checked by replay. |
| `decision.pending` | B | R | R | E | R | Replay requires pending witness; shape parser permits omission. |
| `decision.stateDigest` | B | R | Rₛ | n/a | R | Initial and evaluated state checked by replay. |
| `decision.outputs` | B | R | Rₛ | Eₛ | R | Claimed 64-hash list accepts, 65 refuses; substituted output digest requires replay to reject. |
| `decision.effects` | B | R | Rₛ | n/a | Rₛ | Null summary refuses; pure transition claims no host completion. |
| `decision.effects.requested` | B | R | Rₛ | E₀ | R | Zero accepts; 1 and 64 refuse as semantic, 65 as bounds, at shape, join and replay scope. No nonzero request is valid in v1. |
| `decision.effects.settled` | B | R | Rₛ | E₀ | R | Zero accepts; 1 and 65 refuse against zero requests, at shape, join and replay scope. No nonzero settlement is valid in v1. |
| `decision.effects.receipts` | B | R | Rₛ | E₀ | R | Empty list accepts; one and 65 digests refuse against zero settled, at shape, join and replay scope. No host receipt is established. |
| `decision.resources` | B | R | Rₛ | n/a | Rₛ | Null summary refuses before individual fields are read. |
| `decision.resources.fuel` | B | R | Rₛ | E | R | Replay checks evaluated fuel. |
| `decision.resources.stateBytes` | B | R | Rₛ | E | R | Replay checks canonical state bytes. |
| `decision.resources.outputEvents` | B | R | Rₛ | E | R | Count must match outputs or zero on failure. |
| `decision.reason` (failed) | B | R | R | n/a | R | Four deterministic reasons replayed; invented failure refuses. |
| `decision.policy` (backpressure) | B | R | Rₛ | n/a | R | Only reject, defer, or quarantine; host policy choice not replayed. |
| `decision.reason` (backpressure) | B | R | Rₛ | Eₛ | Rₛ | 64-byte ID accepts, 65 and null refuse; external mailbox fullness is not observed. |
| `digest` | B | R | R | n/a | R | Hash of the claimed trace, not an execution receipt. |

## Status and limits

The prior table had 59 question marks: 28 behavior and 31 trace. The 28 behavior probes cover their named cells at behavior-only and structural-join scope. The 44 trace probes address 28 cells at shape-parser scope, including enum and malformed cases for which a numeric limit is not applicable. The later pure-effect vectors address the final three as **zero-only v1 invariants**, not nonzero numerical maxima. No change in the shape parser or runtime follows from changing this evidence table. The [delivery vectors](../../scripts/event-loop-delivery-field-vectors.ts) replay six selected-actor changes in both runtimes; they do not execute unselected actors or deliver their unused event. `summarizeEventLoopTrace` totals claims rather than analyzing the behavior, and `staticSummary` on a trace is returned only after the trace is supplied. Neither operation proves backpressure from a real mailbox, nonzero settled effects, provider completion, timing, or publication.

The offline parity scripts compare acceptance, refusal codes, and canonical digests for their paired records, not arbitrary field combinations. A nonzero successful effect would require new contract and host semantics beyond this pure v1 evaluator; it is not a missing P1 fixture. P1 still needs the completed-tree gates and independent review before changing draft PR #278's status. No passing check on an older published head covers untracked local files.

## Local verification snapshot, 2026-10-15

The existing draft branch `codex/p1-portable-event-loop-contract-20261012` is retained rather than creating a competing fresh-from-main branch while local P1 evidence is untracked. Before this reconciliation, the three field tests passed (five tests, 728 assertions), and all 11 event-loop parity scripts passed against the cached offline Rust build. These checks cover the local tree, not the published PR head. Earlier `bun run check` and `cargo test --workspace --locked` did not pass in this environment because loopback-binding failures interrupted their test stages; the exact-tree aggregate gates, final-head Required, and affirmative independent review remain unresolved. Agent-decided, owner may revisit: keep P1 blocked and #278 draft and unmerged.
