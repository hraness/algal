# Event-loop trace record (proposal)

An `algal.event-loop.trace.v1` record describes ordered deliveries for one actor
under one behavior digest. This P1 proposal defines a portable **shape and
identity check**, not an evaluator. You must check the behavior and delivered
event schemas separately and replay transitions before using this record as
execution evidence. See [the event-loop proposal](event-loop.md) for those
rules.

The root is a closed object with `contract`, `behavior`, `actor`, `limits`,
`entries`, and `digest`. `behavior` is the checked behavior's root digest;
`actor` is a declared actor id. `limits` copies all five fields from that
behavior. The parser checks their P0 ranges, but does not independently check
that the behavior exists or that the copied limits match it. `entries` has 1 to
256 entries. The complete trace has at most 1,048,576 canonical UTF-8 bytes.
`digest` is SHA-256 of the canonical root with `digest` omitted. All objects
reject undeclared keys. Identifiers use lower kebab case and 1 to 64 UTF-8
bytes. Digests use `sha256:` followed by 64 lowercase hex characters.

Each entry has exactly `source`, `sequence`, `type`, `payload`, `delivery`,
`eventDigest`, `messageDigest`, `depthBefore`, and `decision`. `source`, `type`,
and `delivery` are identifiers. `sequence` is an integer from 0 to
2,147,483,647. `payload` is JSON subject to the expression value limits: at
most 32 nested value levels (scalar at depth zero), 1,024 list items, 256
object keys, 65,536 UTF-8 bytes per string or key, and 262,144 canonical UTF-8
bytes. The canonical complete event `{source, sequence, type, payload}` must
fit `limits.maxEventBytes` (1 to 65,536 bytes). These shape checks do not
establish that `payload` matches the event declaration.

`eventDigest` is the digest of `{behavior, actor, source, sequence, type,
payload}`. `messageDigest` is the digest of `{event: eventDigest, target: actor,
delivery}`. `depthBefore` is an integer from zero through `maxMailboxDepth`
(1 to 1,024). The first accepted or failed entry binds `(source, sequence)` to
its canonical `type` and `payload`. Later entries with that key and changed
content fail with `EVENT_LOOP_ID`, even if their own digests are correct. A
backpressure entry does not bind the key.

The closed `decision` object has one of these shapes:

- `{kind: "duplicate"}` requires an earlier accepted or failed entry with the
  same key and content. It has no transition or effect fields.
- `{kind: "backpressure", policy, reason}` requires an unbound key and
  `depthBefore` equal to `maxMailboxDepth`. `policy` is `reject`, `defer`, or
  `quarantine`. `reason` is an identifier. This is not a successful delivery.
- `{kind: "failed", reason, transition, stateDigest, resources}` requires an
  unbound key and a depth below `maxMailboxDepth`. `reason` is one of
  `fuel-exhausted`, `expression-error`, `state-overflow`, or `output-invalid`.
  `transition` is an identifier for the selected transition, or `null` if
  selection did not finish; only a behavior-aware verifier can check that the
  identifier names a declared transition. The record claims that evaluation
  failed without committing state, outputs, or effects. `stateDigest` is the
  unchanged state digest; if an earlier accepted decision recorded a state
  digest in this trace, the parser checks equality. A redelivery of the failed
  event is a duplicate, not a second evaluation. The parser does not establish
  that the failure occurred.
- `{kind: "accepted", transition, outcome, stateDigest, outputs, effects,
  resources}` requires an unbound key and a depth below `maxMailboxDepth`.
  `outcome` is `continue`, `quiet`, `defer`, `escalate`, or `no-transition`.
  `transition` is an identifier except for `no-transition`, which requires
  `null`. `stateDigest` is a digest. `outputs` is a list of 0 to
  `limits.maxOutputEvents` (at most 64) digests. Quiet and pending outcomes and
  `no-transition` cannot list outputs. When an earlier accepted decision
  recorded a state digest, pending and unmatched outcomes must keep it.

`effects` is a closed summary `{requested, settled, receipts}`. Both counts
are integers from 0 to 64; `settled` cannot exceed `requested`, and `receipts`
contains exactly `settled` digests. Deferred, escalated, and unmatched
transitions have zero requested effects. `resources` is a closed summary
`{fuel, stateBytes, outputEvents}` with integer ranges 0 to
`limits.maxTransitionFuel` (at most 100,000), 0 to `limits.maxStateBytes` (at
most 262,144), and 0 to `limits.maxOutputEvents` (at most 64).
`outputEvents` equals `outputs.length` for an accepted decision and is zero
for a failed decision. These are recorded claims, not measurements or proof
of an external side effect; a receipt digest alone cannot establish that a
provider returned a truthful answer.

The parser rejects invalid shapes with the `EVENT_LOOP_*` codes from the
[event-loop contract](event-loop.md#errors-and-versioning), including
`EVENT_LOOP_SEMANTIC` for inconsistent decisions. The fixed offline fixture in
`scripts/fixtures/event-loop-contract.json` checks both implementations with
the same valid and invalid trace values. Neither implementation schedules
actors, performs host calls, checks state transitions, verifies notifications,
or proves an effect or resource count. A future replay verifier must join
this trace to a checked behavior, retained earlier bindings, and an effect
adapter's idempotency records. This proposal does not complete the P1 gate.
