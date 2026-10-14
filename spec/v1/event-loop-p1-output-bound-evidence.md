# Event-loop output size: P1 counterexample

At draft PR #278 head `34e418764aebf7f1d3409b555373a4cb44f0be51`, TypeScript structural verification and replay accepted a notification whose payload alone is 143 canonical UTF-8 bytes under `maxEventBytes: 128`. The delivered input event is 76 bytes. The proposed [event-loop contract](event-loop.md) limits a complete event record to `maxEventBytes`; an output becomes a typed event. Adding an event identity to a payload that already exceeds the limit cannot make it fit. This is an offline replay counterexample, not evidence that a host delivered the output. The probe below applies to that **pre-repair head**, not the repaired working tree.

## Reproduce on the pre-repair PR head

This note was first prepared on a separate evidence branch from `origin/main` and later copied into the P1 PR worktree. Use a separate checkout of the exact pre-repair PR commit above, not the current repaired worktree. After `bun install --frozen-lockfile`, run the following in that checkout's root. The probe uses the checked-in behavior and trace, changes one selected output expression, and recomputes the behavior, event, message, notification, and trace digests. No fixture is written.

```sh
bun -e '
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { canonicalize } from "./src/values.ts";
import { verifyEventLoopTraceStructure } from "./src/event-loop-structure.ts";
import { eventLoopNotificationDigest, replayEventLoopTrace } from "./src/event-loop-replay.ts";

const hash = (value) => `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;
const redigest = (value) => {
  const { digest, ...body } = value;
  value.digest = hash(body);
};
const behavior = JSON.parse(readFileSync("benchmarks/language/actors/echo.json", "utf8"));
const trace = JSON.parse(readFileSync("scripts/fixtures/event-loop-contract.json", "utf8")).base;
behavior.limits.maxEventBytes = trace.limits.maxEventBytes = 128;
behavior.events.find((event) => event.id === "incremented").payload.fields[0].type = "string";
behavior.actors[0].transitions[0].outputs[0].payload.program = { amount: "x".repeat(130) };
redigest(behavior);
trace.behavior = behavior.digest;
trace.entries = trace.entries.slice(0, 1);
const entry = trace.entries[0];
entry.eventDigest = hash({ behavior: trace.behavior, actor: trace.actor,
  source: entry.source, sequence: entry.sequence, type: entry.type, payload: entry.payload });
entry.messageDigest = hash({ event: entry.eventDigest, target: trace.actor, delivery: entry.delivery });
entry.decision.outputs = [eventLoopNotificationDigest(entry.messageDigest, "increment", 0,
  "counter", "incremented", { amount: "x".repeat(130) })];
entry.decision.resources.fuel = 25;
redigest(trace);
const inputBytes = Buffer.byteLength(canonicalize({ source: entry.source,
  sequence: entry.sequence, type: entry.type, payload: entry.payload }), "utf8");
const outputPayloadBytes = Buffer.byteLength(canonicalize({ amount: "x".repeat(130) }), "utf8");
const structure = verifyEventLoopTraceStructure(trace, behavior);
const replay = replayEventLoopTrace(trace, behavior);
assert.equal(behavior.digest, "sha256:3469526a37046f44fdce2c8d41d64341cc6398c0fe1a6b61b96f08450566f7ba");
assert.equal(inputBytes, 76);
assert.equal(outputPayloadBytes, 143);
assert.equal(structure.digest, replay.digest);
assert.equal(replay.digest, "sha256:0d41bf883df424c29736c020868b12a4beefc60162a254ea8189e44f246521a6");
assert.equal(replay.summary.accepted, 1);
console.log(JSON.stringify({ inputBytes, outputPayloadBytes, limit: 128,
  traceDigest: replay.digest, accepted: replay.summary.accepted }));
'
```

The observed output on that commit was:

```json
{"inputBytes":76,"outputPayloadBytes":143,"limit":128,"traceDigest":"sha256:0d41bf883df424c29736c020868b12a4beefc60162a254ea8189e44f246521a6","accepted":1}
```

The root digest hashes the canonical behavior without its `digest` member; the metadata digest stays unchanged. Event identity hashes `{behavior, actor, source, sequence, type, payload}`; message identity hashes `{event, target, delivery}`. The notification helper binds the parent message, transition, ordinal, target, type, and payload. These are the implementation's identity functions, not alternative identifiers. A previously built Rust `event_loop_replay_parity` example returned the same replay digest and accepted count for this row; that observation is not a fresh Rust build or cross-runtime fixture result for this probe.

At that pre-repair commit, `src/event-loop-replay.ts` checked the evaluated output payload against its schema and derived an identity, but did not check `maxEventBytes`. Its failed-decision path likewise checked the schema without checking the bytes. `crates/algal/src/event_loop_replay.rs` mirrored those omissions. The input parser checked the byte limit on `{source, sequence, type, payload}`. The proposed repair applies the decision below in both runtimes and in the contract; the separate output vectors test an empty fixture payload, exact fitting limits, and first excess with shared replay refusal codes and digests. Preserve atomic failure: a rejected output must not commit preceding writes or notifications.

## Agent decision for P1 repair (2026-10-14)

Agent-decided, owner may revisit: measure an emitted notification as the canonical UTF-8 JSON of exactly `{parent, transition, ordinal, target, type, payload}`, using the existing `eventLoopNotificationDigest` object with **resolved** `target`, the actual evaluated `payload`, and **no** derived `digest` member. Count `Buffer.byteLength(canonicalize(record), "utf8")` (Rust: the same canonical encoder's UTF-8 length). Require that count to be at most the pinned behavior's `maxEventBytes` before deriving the notification identity or committing any writes/outputs. Do not count only the payload or an unevaluated expression. A later host delivery independently checks its complete `{source, sequence, type, payload}` event against the same limit and applies the retained event-key/dedup rules.

If a typed output is over the limit, the first failed evaluation operation yields the deterministic failed-decision reason **`output-overflow`**, mirroring `state-overflow`; a schema mismatch remains `output-invalid` and expression/fuel failures retain their earlier precedence. The failed trace has the unchanged state digest/byte count, zero outputs and zero committed effects, and records the actually consumed fuel. Both structural parsers admit `output-overflow` as a failed reason. Replay of a claimed successful oversize output refuses with `EVENT_LOOP_BOUNDS`; replay of a mismatched failed claim refuses with `EVENT_LOOP_SEMANTIC`. Apply the size check to the successful and failed-claim replay paths in both TypeScript and Rust, with canonical digest and failure-reason parity. A successful trace must not silently convert into a failure: it requires a new redigested failed-decision trace.

Rationale: this is the already digested notification identity envelope, so no new synthetic source/sequence or scheduler-dependent assignment is invented. Including the parent, ordinal and resolved target prevents an output payload from passing a smaller, incomplete byte test. It is conservative: even the smallest legal envelope with a SHA-256 parent, one-character transition/target/type, ordinal zero, and empty payload occupies 150 canonical bytes; thus `maxEventBytes: 128` permits inputs but no notifications. This is an explicit tradeoff, not a claim that a 128-byte input is undeliverable. A host that later assigns an event source and sequence must still check its delivered event. Cover the envelope's 150-byte floor, an exact fitting limit, the first byte over it, the allowed 65,536-byte limit, and a refusal immediately beyond the chosen limit; keep matched TypeScript/Rust vector digests. This decision selects a portable refusal contract for the existing draft, not host delivery or final-tree qualification.

## Status and limits

This record covers one output-size gap, not the P1 field matrix. On the pre-repair PR head, `spec/v1/event-loop-p1-trace-field-review.md` accounts for 22 of the matrix's original 59 question-mark cells, leaving 37: 28 behavior cells and nine trace cells. The nine trace cells concern malformed `limits`, the `entries[*].payload` limit, malformed `entries[*].decision`, malformed `decision.effects`, limit edges for its `requested`, `settled`, and `receipts` fields, malformed `decision.resources`, and malformed backpressure `decision.reason`. Those statuses are based on shape-parser probes; they do not prove execution or mailbox capacity. The existing 27-vector replay parity script on that head did not include this output-size probe.

The earlier evidence checkout reproduced the TypeScript result above after `bun install --frozen-lockfile`. Focused tests on the pre-repair head passed 60 event-loop Bun tests, selected Rust event-loop tests, and 27 replay parity vectors, but none covered this case. Aggregate gates, a fresh Rust build of this probe, independent final-tree review, and final-head checks were not obtained for that evidence branch. The later local P1 repair added cross-runtime output vectors, but the remaining 37 matrix cells and independent final-tree review are not closed by this document. Keep PR #278 draft and auto-merge off until the remaining cells are addressed and the final pushed head passes its gates.
