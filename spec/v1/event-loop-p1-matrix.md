# Event-loop P1 field review

This evidence record maps the proposed `algal.event-loop.v1` behavior and `algal.event-loop.trace.v1` trace to offline fixtures. A behavior is a data record describing an actor's event rules; a trace is a claimed sequence of decisions. A passing digest check is not full behavior validation. The TypeScript implementation is in `src/event-loop-*`; the Rust mirror is in `crates/algal/src/event_loop*`. This is not a release or execution claim.

The tables use **B** for a value in an accepted fixture, **R** for a directly tested refusal, **E** for a tested maximum and first excess, and **?** for no field-specific test identified. A B covers only the fixture's value. “Extra” means an unknown sibling key, not an extra list item. Paths use `*` for a list item; they are not JSON Pointer syntax. The shape fixture is `scripts/fixtures/event-loop-contract.json`; the behavior is `benchmarks/language/actors/echo.json`. Tests include `src/event-loop-{behavior,behavior-bounds,contract,field-vectors,pending,replay,structure,structure-bounds,structure-counterexamples,summary,sibling}.test.ts`, `crates/algal/tests/event_loop_{behavior,behavior_bounds,fields,metadata}.rs`, and their Rust equivalents. Replay evidence uses `src/event-loop-replay.test.ts`, not the shape-only fixture.

## Behavior fields

| Field | Fixture | Missing | Extra | Limit edge | Malformed or conflict | Evidence and limit |
| --- | --- | --- | --- | --- | --- | --- |
| `contract` | B | ? | R | n/a | R | Structural join rejects the wrong contract or root extra key. |
| `behavior.id` | B | R | R | E | R | Redigested metadata and trace check 64-byte id, 65-byte id, and invalid syntax; an extra metadata key refuses. |
| `behavior.revision` | B | R | ? | E | R | Redigested metadata and trace check 2,147,483,647, first excess, zero, and a changed revision with a stale metadata digest. |
| `behavior.sourceDigest` | B | R | ? | ? | R | Syntax checked with an invalid digest after both enclosing digests are recomputed; no source bytes retained. |
| `behavior.digest` | B | R | ? | n/a | R | Missing or stale metadata digest refused with a valid redigested trace. Hash of metadata, not provenance. |
| `limits.maxEventBytes` | B | ? | ? | E | R | Behavior summary checks maximum and first excess; trace limit and one oversize event have edge tests. |
| `limits.maxStateBytes` | B | ? | ? | E | R | Every actor's initial state checked; trace limit has edge tests. |
| `limits.maxOutputEvents` | B | ? | ? | E | R | Zero-output summary fixture; selected actor's output list checked at 64 and 65. |
| `limits.maxTransitionFuel` | B | ? | ? | E | R | Summary accepts minimum and maximum and rejects first excess; replay evaluates the selected actor. |
| `limits.maxMailboxDepth` | B | ? | ? | E | R | Summary accepts minimum and maximum and rejects first excess; host capacity is not observed. |
| `events[*].id` | B | ? | ? | ? | R | Unknown event references and repeated IDs refuse; a repeated ID wins over a malformed duplicate schema in both runtimes. Event list checks 1, 128, and 129. |
| `events[*].payload.kind` | B | R | R | ? | ? | Missing kind or extra schema key in an unused event declaration refuses. |
| `events[*].payload.fields[*].name` | B | R | R | E | R | Missing name or extra field key refuses; summary checks 64 fields and first excess. |
| `events[*].payload.fields[*].type` | B | ? | R | ? | R | The unused event's `bytes` type refuses; trace rejects a wrong value type. |
| `actors[*].id` | B | ? | ? | ? | R | Selected actor lookup and repeated IDs refuse; actor list checks 1, 64, and 65. |
| `actors[*].state.kind` | B | R | R | ? | ? | Missing kind or extra state schema key in a sibling refuses. |
| `actors[*].state.fields[*].name` | B | ? | ? | E | R | Selected and unselected actor fields check 64 and 65; every actor refuses unknown write paths. |
| `actors[*].state.fields[*].type` | B | ? | R | ? | R | Sibling invalid field type is refused; initial values are type checked for all actors. |
| `actors[*].state.fields[*].initial` | B | R | R | ? | R | Missing initial or extra field key refuses; selected and unselected actors' initial states have a total byte limit. |
| `actors[*].transitions[*].id` | B | ? | R | E | R | Selected actor checks 256 and 257 rules and wrong selection; sibling empty rule list and extra transition key refuse. |
| `actors[*].transitions[*].on` | B | R | R | ? | R | Missing `on` or extra transition key refuses; unknown event reference refuses in a sibling. |
| `actors[*].transitions[*].when` | B | ? | R | E | R | Guard selection and expression byte bound tested; behavior summary statically checks every actor's expression program. |
| `actors[*].transitions[*].writes[*].path` | B | ? | R | E | R | Zero- and two-field paths refuse; 64/65 writes, duplicate path, undeclared field, and extra write key checked. |
| `actors[*].transitions[*].writes[*].value` | B | R | R | E | R | Missing value or extra write key refuses; selected-actor replay checks evaluated value. Summary checks all actors' program syntax, not returned value types. |
| `actors[*].transitions[*].outputs[*].kind` | B | ? | R | ? | R | Only `notify` is permitted; an extra output key refuses. |
| `actors[*].transitions[*].outputs[*].target` | B | ? | R | ? | R | Only `self` or a declared actor ID is permitted, including in a sibling; extra output key refuses. |
| `actors[*].transitions[*].outputs[*].event` | B | ? | R | ? | R | Only a declared event ID is permitted; extra output key refuses. |
| `actors[*].transitions[*].outputs[*].payload` | B | R | R | ? | R | Missing payload or extra output key refuses. Selected output type is replayed; summary checks every actor's program syntax only. |
| `actors[*].transitions[*].result.kind` | B | R | R | n/a | R | Missing kind or extra result key refuses; pending rules cannot write or emit, including in a sibling. |
| `actors[*].transitions[*].result.key` | B | ? | ? | ? | R | Defer expression and its pending witness use dedicated tests. |
| `actors[*].transitions[*].result.request` | B | ? | ? | ? | R | Escalate expression and its pending witness use dedicated tests. |
| `digest` | B | ? | R | n/a | R | Rehashed mutations of selected, unselected, metadata and unused event declarations reach structural checks. |

An earlier structural join checked transitions, state schemas, and initial values only for the actor named by the trace. A second actor with `state.fields[0].type = "invalid"` and `transitions = []` could be appended, both digests recomputed, and the unchanged actor trace accepted. The TypeScript and Rust joins now check every actor's declarations. The sibling parity script covers 47 redigested vectors: a valid sibling, competing-order malformed siblings, missing, extra, malformed and boundary cases on unselected actor fields and one unused event schema, and 13 behavior metadata cases. An “extra” in a field's row means an unknown key in that field or its immediately containing rule or output, not that every key combination was tested. Agent-decided, owner may revisit: after validating the selected actor, both structural joins visit unselected actors by id, so `a-fault` gives `EVENT_LOOP_BOUNDS` first in either list order. These tests close the covered structural acceptance and refusal-code gaps. The trace and root digests do not prove execution or host publication.

## Trace fields

| Field | Fixture | Missing | Extra | Limit edge | Malformed or conflict | Evidence and limit |
| --- | --- | --- | --- | --- | --- | --- |
| `contract` | B | ? | R | n/a | R | Wrong version and an extra root key refused; other missing fields remain open. |
| `behavior` | B | ? | R | n/a | R | Must match the root behavior digest in the structural join. |
| `actor` | B | R | R | ? | R | Missing actor and extra root key refuse; unknown actor refused after re-identification. |
| `limits.maxEventBytes` | B | R | R | E | R | Missing and extra limit keys refuse; limit's edges and an event one byte too large tested. |
| `limits.maxStateBytes` | B | ? | R | E | R | Extra limit key refuses; limit's edges and claimed state bytes tested. |
| `limits.maxOutputEvents` | B | ? | R | E | R | Extra limit key refuses; limit's edges and mismatched output count tested. |
| `limits.maxTransitionFuel` | B | ? | R | E | R | Extra limit key refuses; limit's edges and failed or accepted fuel claim tested. |
| `limits.maxMailboxDepth` | B | ? | R | E | R | Extra limit key refuses; limit's edges and full/non-full decisions tested. |
| `entries` | B | ? | ? | E | R | One through 256; empty and 257 refused. |
| `entries[*].source` | B | R | R | E | R | Isolated accepted entry: 64-character id, 65-character id, uppercase, missing and unknown entry key; source changes event identity. |
| `entries[*].sequence` | B | R | R | E | R | Isolated accepted entry: maximum 2,147,483,647, first excess, fractional value and missing; overflow and conflicting reuse refused. |
| `entries[*].type` | B | R | R | E | R | Isolated accepted entry: 64-character id, first excess, uppercase, missing and unknown entry key; type changes event identity. |
| `entries[*].payload` | B | ? | R | ? | R | Cycles, non-finite numbers, sparse lists, changed content, and wrong typed field refused; unknown entry key refuses. |
| `entries[*].delivery` | B | R | R | E | R | Isolated accepted entry: 64-character id, first excess, uppercase, missing and unknown entry key. Changing delivery preserves event digest but changes message digest. |
| `entries[*].eventDigest` | B | ? | R | n/a | R | Recomputed from behavior, actor, source, sequence, type, and payload; unknown entry key refuses. |
| `entries[*].messageDigest` | B | ? | R | n/a | R | Recomputed from event digest, actor target, and delivery; unknown entry key refuses. |
| `entries[*].depthBefore` | B | ? | R | E | R | Full-mailbox acceptance and premature backpressure refused; unknown entry key refuses. |
| `entries[*].decision.kind` | B | ? | ? | n/a | R | Accepted, duplicate, backpressure, failed; duplicate needs an earlier bound key. |
| `decision.transition` | B | ? | ? | ? | R | Missing declaration and preempted unconditional rule refused. |
| `decision.outcome` | B | ? | ? | n/a | R | Outcome/rule mismatch and changed pending state refused. |
| `decision.pending` | B | R | R | E | R | Required by replay for pending outcomes; shape parser permits omission. Null is a value, not absence. |
| `decision.stateDigest` | B | ? | ? | n/a | R | Initial, unchanged, and replayed state checks. |
| `decision.outputs` | B | ? | ? | ? | R | Replay checks identity; structural join alone accepts a substituted output digest. |
| `decision.effects.requested` | B | ? | ? | ? | R | Must be zero for the pure evaluator. |
| `decision.effects.settled` | B | ? | ? | ? | R | Must be zero; settled receipts cannot exceed requests. |
| `decision.effects.receipts` | B | ? | ? | ? | R | An unclaimed receipt refuses. No host effect is proved. |
| `decision.resources.fuel` | B | ? | ? | E | R | Bounded claim; replay checks evaluated fuel. |
| `decision.resources.stateBytes` | B | ? | ? | E | R | Same state digest fixes byte size; replay checks canonical state bytes. |
| `decision.resources.outputEvents` | B | ? | ? | E | R | Must equal claimed output count; failed decision must claim zero. |
| `decision.reason` (failed) | B | ? | R | n/a | R | Four deterministic reasons are replayed; invented failure refuses. |
| `decision.policy` (backpressure) | B | ? | ? | n/a | R | Reject, defer, or quarantine only; the host policy choice is not replayed. |
| `decision.reason` (backpressure) | B | ? | ? | ? | ? | ID checked; external mailbox fullness is not observed. |
| `digest` | B | ? | R | n/a | R | Hashes the complete claimed trace; a hash is not an execution receipt. |

The added trace-shape vectors isolate a single accepted entry, so a later duplicate cannot conceal an identity-field error. All three valid 64-character identifier mutations and the maximum sequence are reidentified and redigested. Twenty-one new vectors cover field-specific missing, malformed, maximum and first-excess cases, plus one unknown entry key, one unknown limit key, one missing limit, one unknown root key, and one missing actor. The colocated test also distinguishes event identity from delivery identity. Bun and Rust compare the same acceptance, refusal codes, and canonical digests. These are shape-parser checks, not behavioral replay, and do not imply that a different declared event type exists in the pinned behavior.

## Status and limits

Agent-decided, owner may revisit: retain the behavior/trace distinction and use the [north-star limits](../../docs/north-star.md) as the acceptance criterion. The [behavior-only summary](event-loop-behavior-summary.md) checks the entire behavior before any trace and reports possible reads, writes, emitted event types, pending outcomes, no granted capabilities, and the five declared limits for one selected actor. Its read sets conservatively include all declared fields for computed accesses; its static expression check does not establish runtime types, guard truth, fuel use, host effects, or publication. `staticSummary` is still returned only after a trace is supplied, and `summarizeEventLoopTrace` totals trace claims instead of analyzing the behavior. Neither trace operation establishes host backpressure, provider completion, timing, or useful work.

The open cells need field-specific valid, missing, extra, maximum, first-excess, and malformed fixtures, including nonselected actors. Add them to shared vectors and compare TypeScript and Rust acceptance, refusal codes, and canonical digests before lifting P1's blocked status. Required checks on a pull request head and older focused results do not replace exact-tree gates or an independent review.

## Local verification snapshot, 2026-10-14

The first snapshot covered uncommitted changes on `codex/p1-portable-event-loop-contract-20261012` at `447aac7e7f0d7327c74ab6375b2ad479617f6672`, including three modified and six untracked files. It was not a clean commit or a check of PR #278's new head. Agent-decided, owner may revisit: preserve these P1 edits on their existing draft branch rather than move or discard them to satisfy a generic fresh-from-main branch instruction. The behavior-only summary continued on that branch. Its Rust module needs a `lib.rs` registration; #70 also touches that shared file, so coordinate before integration. No commit, push, merge, or publication was performed in the first snapshot.

After `bun install --frozen-lockfile`, all 45 original focused Bun tests passed. A fresh default Cargo home initially failed to fetch pinned `apple-foundation` with SSL handshake `-9808`. The existing workspace cache (`CARGO_HOME=$PWD/.cache/cargo`, `CARGO_NET_OFFLINE=true`, rustup's Cargo on `PATH`) resolved that dependency without changing the lockfile: `cargo test -p algal --locked event_loop` passed, as did four event-loop parity scripts (37 trace, 27 structure, 27 replay, and 47 sibling vectors). Clippy, format, build, native parity (86 examples and 12 habitat-budget cases), docs check, and `git diff --check` passed. `bun run check:copy` is not defined.

The first aggregate gates did not pass. `bun run check` reached typecheck, lint, and the test stage, then hit its 600-second command limit; the visible output included `src/vendor-cli.test.ts` failing to bind `Bun.serve` (`EADDRINUSE`). A focused vendor test repeated that failure. `cargo test --workspace --locked` stopped in `crates/algal/tests/http.rs`: both tests could not bind a loopback listener (`PermissionDenied`, `Operation not permitted`). These sandbox-only limits are not P1 code failures and cannot be counted as passing aggregate results. The subsequent behavior-only implementation passed its focused TypeScript and Rust tests, TypeScript typecheck and lint, Clippy, and 36 shared behavior vectors plus four dense boundary vectors with matching summaries, digests, and refusal codes. Exact-tree aggregate gates, uncovered field cases, and affirmative independent review remain open. Keep P1 blocked and #278 draft and unmerged.
