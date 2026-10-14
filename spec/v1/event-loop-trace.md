# Event-loop trace record (proposal)

An `algal.event-loop.trace.v1` record describes ordered deliveries for one actor
under one behavior digest. This P1 proposal defines a portable shape and
identity check and a separate structural join to a pinned behavior, not an
execution evaluator. Replay guards and expressions before using a trace as
execution evidence. See [the event-loop proposal](event-loop.md) for those
rules.

The root is a closed object with `contract`, `behavior`, `actor`, `limits`,
`entries`, and `digest`. `behavior` is the checked behavior's root digest;
`actor` is a declared actor id. `limits` copies all five fields from that
behavior. The shape parser checks their P0 ranges, but only the structural join
compares them to the behavior. `entries` has 1 to 256 entries. The complete trace
has at most 1,048,576 canonical UTF-8 bytes. `digest` is SHA-256 of the
canonical root with `digest` omitted. All objects reject undeclared keys.
Identifiers use lower kebab case and 1 to 64 UTF-8 bytes. Digests use
`sha256:` followed by 64 lowercase hex characters.

Each entry has exactly `source`, `sequence`, `type`, `payload`, `delivery`,
`eventDigest`, `messageDigest`, `depthBefore`, and `decision`. `source`, `type`,
and `delivery` are identifiers. `sequence` is an integer from 0 to
2,147,483,647. `payload` is JSON subject to the expression value limits: at
most 32 nested value levels (scalar at depth zero), 1,024 list items, 256
object keys, 65,536 UTF-8 bytes per string or key, and 262,144 canonical UTF-8
bytes. The canonical complete event `{source, sequence, type, payload}` must
fit `limits.maxEventBytes` (1 to 65,536 bytes). Only the structural join checks
that `payload` matches the declared event schema.

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
  `transition` names a declared transition for the input event, or is `null` if
  selection did not finish. For a non-null identifier, the structural join
  checks the event declaration and rejects a selected id when an earlier
  unconditional transition id for that event must win. It does not evaluate
  preceding guards or establish that the failure occurred. This decision
  claims no committed state, output, or effect. `stateDigest` is the unchanged
  state digest; if an earlier accepted decision recorded a state digest in this
  trace, the shape parser checks equality. Before the first committed decision,
  the structural join compares the claimed state digest and byte size with the
  selected actor's declared initial state. A redelivery of the failed event is
  a duplicate, not a second evaluation.
- `{kind: "accepted", transition, outcome, stateDigest, outputs, effects,
  resources}` requires an unbound key and a depth below `maxMailboxDepth`.
  `outcome` is `continue`, `quiet`, `defer`, `escalate`, or `no-transition`.
  `transition` is an identifier except for `no-transition`, which requires
  `null`. `stateDigest` is a digest. `outputs` is a list of 0 to
  `limits.maxOutputEvents` (at most 64) digests. Quiet and pending outcomes and
  `no-transition` cannot list outputs. When an earlier accepted decision
  recorded a state digest, pending and unmatched outcomes must keep it. Before
  the first committed decision, the structural join requires pending and
  unmatched outcomes to keep the declared initial state's digest and byte size.
  An accepted `continue` or `quiet` rule with no state writes must keep the
  previous state digest and byte size, starting from that initial state.

Agent-decided, owner may revisit: an accepted `defer` or `escalate` decision
may also include `pending`, the evaluated key or request JSON value. It is
allowed only for these two outcomes, with at most 16,384 canonical UTF-8 bytes,
32 value levels, 1,024 list items, 256 object keys, and 65,536 UTF-8 bytes per
string or key. The shape parser keeps missing witnesses admissible for older
shape-only records; **replay refuses a pending outcome without a witness**.
Replay compares the value and evaluator fuel, including a present `null` value.
A matched witness is a proposed request, not evidence of host execution.

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

## Structural join to a behavior

`verifyEventLoopTraceStructure` and `verify_event_loop_trace_structure` first
validate the trace shape. They take the behavior value separately, check its
root and metadata digests, confirm the actor and all five copied limits, and
check the event payload against its closed, typed record schema. They check
transition ids against the event handled by each rule, rule out a named
accepted or failed selection after an earlier unconditional transition id,
match accepted outcomes and declared notification *counts*, and reject
`no-transition` when an unconditional transition exists. Until the first
`continue` or `quiet` commits a state, failed, deferred, escalated, and
unmatched decisions must identify the declared initial state and its canonical
byte length. An accepted `continue` or `quiet` rule with no state writes must
also keep the previous state digest and byte size, even after another rule
commits. They check the declared state and transitions of **every actor**,
including unselected actors: field types and initial values, references,
result kinds, expression envelopes, and list and byte limits. A behavior value
has at most 1,048,576 canonical UTF-8 bytes, 32 nested value levels, 1,024
elements per list, 256 keys per object, and 65,536 UTF-8 bytes per string or key.
The behavior's event list has 1 to 128 entries, actors 1 to 64, transitions per
actor 1 to 256, and fields and writes at most 64. Each declared expression
envelope has at most 16,384 canonical UTF-8 bytes. The join checks only
envelope shape, not expression grammar or evaluation.

The returned six-field static summary counts declared events, transitions,
state writes, notifications, deferrals, and escalations for the selected actor
(events are behavior-wide). Those counts come from the behavior, not the trace
or a host. At most 128, 256, 16,384, 16,384, 256, and 256 respectively can
be returned. The join does not check guard truth, evaluate writes, check state
digests for transitions with writes or output digests, prove fuel use, or perform
host effects. It is not a full P0 behavior admission checker or a replay
verifier. In particular, matching notification counts do not establish that
the listed output digests identify the declared notifications. The separate
parity fixture derives a re-digested `reset` entry that falsely claims the
`increment` transition and notification; both structural joins reject it
although the shape parsers accept its digest.

## Decision record: initial state before the first commit

Agent-decided, owner may revisit: the P1 structural join starts each complete
trace at the selected actor's declared initial state. Before the first
`continue` or `quiet`, no failed, pending, or unmatched decision can change that
state. A later committed transition can change it; the shape parser then checks
the unchanged-state decisions against the last accepted state. This decision
rejects re-digested first entries that invent a different state or byte count,
without treating a claimed fuel count or a transition result as measured. A
future partial-trace format would need a separately checked starting state.
TypeScript and Rust tests and shared structural vectors specify the initial
state and forged first-entry claims. This does not close the output-identity or
expression-replay gaps in the structural join; the separate replay checker
covers the currently supported successful, failed and pending decisions.

## Decision record: transitions without state writes

Agent-decided, owner may revisit: a selected `continue` or `quiet` rule with
no writes cannot change the prior state. The structural join compares its
claimed digest and byte size to the previous committed state, or to the
actor's initial state if none has committed. The TypeScript and Rust tests and
six shared structural vectors specify both cases. A rule with writes still
needs expression replay to establish the resulting state.

## Decision record: named failed selections

Agent-decided, owner may revisit: the P1 structural join rejects a named failed
selection if an earlier unconditional rule for that event wins by transition
id. This is a declaration-only invariant of the P0 ordering contract even if
evaluation later fails; leaving it unchecked admits a known-impossible trace
without requiring guard replay to notice it. A null failed selection may stop
before choosing a rule. Earlier guarded rules, expression results and whether
any reported failure happened require separate expression replay; the
structural join does not check them. The single-entry failed-selection rejection
and the null/later-id acceptances are checked by TypeScript and Rust tests and
structural parity vectors. This decision does not qualify the whole P1 contract
or loosen the requirement for replay before relying on a trace as execution
evidence.

## Derived summary

After shape validation, `summarizeEventLoopTrace` in TypeScript and
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
The structural parity script also compares pinned behavior joins and a false
`reset` decision. Neither the shape parser nor the structural join schedules
actors, performs host calls, replays expressions, verifies notification
identities, or proves a resource count. The separate [event-loop replay
checker](event-loop-replay.md) checks expressions, notification identities,
resource claims and supplied pending values for the offline vectors. Host
delivery and effect-adapter idempotency records remain outside these checks.
This proposal does not complete the P1 gate.
