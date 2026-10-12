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

`effects` is a closed summary `{requested, settled, receipts}`. In this v1
proposal, both counts must be zero and `receipts` must be empty. P0 transitions
are pure: a notification is data, while deferral and escalation are pending
requests, not completed host calls. A nonzero request with otherwise valid
bounds fails with `EVENT_LOOP_SEMANTIC`. The general count checks still reject
numbers outside 0 to 64, `settled` above `requested`, and a `receipts` list
whose length differs from `settled`. No trace entry may claim that a fast
transition performed an external effect.

`resources` is a closed summary `{fuel, stateBytes, outputEvents}` with integer
ranges 0 to `limits.maxTransitionFuel` (at most 100,000), 0 to
`limits.maxStateBytes` (at most 262,144), and 0 to
`limits.maxOutputEvents` (at most 64). `outputEvents` equals `outputs.length`
for an accepted decision and is zero for a failed decision. The same
`stateDigest` must have the same `stateBytes` throughout the trace, including
when it reappears after a different state. The parser keeps at most 256 such
bindings, one per entry. Failed, pending, and unmatched decisions also check
the latest accepted state when there is one. These checks compare recorded
claims; they do not establish that a digest or size describes an actual state.
Fuel and state-size figures are claims, not measurements; a trace digest does
not establish the truth of a host observation.

## Derived summary

After validation, `summarizeEventLoopTrace` in TypeScript and
`summarize_event_loop_trace` in Rust return the trace digest and the same
14-field derived summary. The decision counts `accepted`, `duplicate`,
`backpressure`, and `failed` add up to the 1 to 256 entries. The accepted
outcome counts `continued`, `quiet`, `deferred`, `escalated`, and `unmatched`
add up to `accepted`. `fuelClaimed` sums the accepted and failed resource
claims (0 to 25,600,000). `peakStateBytesClaimed` is the maximum accepted or
failed state-size claim (0 to 262,144). `notificationsClaimed` sums their
output-event claims (0 to 16,384). `effectsRequestedClaimed` and
`effectsSettledClaimed` sum accepted effect counts; both are zero in this
pure-transition proposal. Backpressure with `policy: "defer"` counts under
`backpressure`, not `deferred`, which counts accepted transitions. A duplicate
or backpressure decision contributes no resource claim. The derived object is
not part of the hashed trace and has no wall-clock or provider fields. These
are static counts of checked claims, not measured usage or evidence that a
transition or external effect occurred.

The parser rejects invalid shapes with the `EVENT_LOOP_*` codes from the
[event-loop contract](event-loop.md#errors-and-versioning), including
`EVENT_LOOP_SEMANTIC` for inconsistent decisions. The fixed offline fixture in
`scripts/fixtures/event-loop-contract.json` and a derived nonadjacent-state
vector check both implementations with the same valid and invalid trace values.
Neither implementation schedules actors, performs host calls, checks state
transitions, verifies notifications, or proves a resource count. A future
replay verifier must join this trace to a checked behavior, retained earlier
bindings, and an effect adapter's idempotency records. This proposal does not
complete the P1 gate.
