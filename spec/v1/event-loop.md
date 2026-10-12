# algal.event-loop.v1

This document is the proposed portable data contract for a deterministic actor
and event loop. It is the P0 contract gate. It defines values, identities,
limits, transition outcomes, and replay evidence. It does not define a scheduler,
a provider adapter, a filesystem, or a live service. The P1 evaluator must accept
this contract before a source-language or node implementation starts.

The contract reuses `algal.expr.v1` for pure expressions. An expression is data
and is evaluated by the existing contract-owned evaluator. Event-loop values are
canonical JSON. No field in this contract is a wall-clock time, and execution
receipts remain separate from benchmark timing records.

## Vocabulary

| Term | Meaning |
| --- | --- |
| behavior | A named revision of an actor transition set. The root digest identifies the complete bytes that an evaluator uses. |
| behavior revision | A positive integer scoped to a behavior id. A revision is immutable after publication. |
| actor | A logical mailbox and state schema selected by an actor id in a behavior. It is not an operating-system process. |
| event | A typed input value delivered to an actor. An event has a type id, payload, and sequence supplied by its source. |
| message | One delivery of an event to one actor. Its id is derived from the behavior, actor, event, and delivery identity. |
| transition | A deterministic rule selected by an event type and an optional pure guard. |
| state write | An atomic replacement of one declared state field with the result of a pure expression. |
| notification | A new typed event emitted for a target actor. It is data in the trace, not an immediate host call. |
| defer | A pending result keyed by a pure expression. It asks the host to retry or resume without claiming that work completed. |
| escalation | A typed request for the durable path. It is recorded as pending and does not grant a model, tool, network, or filesystem capability. |
| backpressure | The declared response when accepting another mailbox entry would exceed `maxMailboxDepth`. |
| supervisor | A host-owned durable owner of actor instances. It admits behavior revisions, applies mailbox policy, and records pending outcomes; it is not an actor transition or a new evaluator. |
| habitat | A named host or deployment boundary that supplies supervisor storage, capacity, and admission policy. A habitat does not change behavior semantics or grant a behavior any capabilities. |
| source identity | A claimed digest for source bytes. The P0 smoke fixture does not retain source bytes, so it cannot prove origin. |
| runtime identity | The declared implementation and version used to evaluate or measure a record. It belongs to evidence and is not part of behavior semantics. |
| replay | Deterministic re-evaluation of a trace against the pinned behavior revision, with no clock, provider, or ambient host input. |
| trace | An ordered, replayable record of accepted deliveries, transition decisions, state writes, notifications, and pending outcomes. |

## Envelope

The root is a closed object with exactly these keys:

```json
{
  "contract": "algal.event-loop.v1",
  "behavior": {
    "id": "counter",
    "revision": 1,
    "sourceDigest": "sha256:<64 lowercase hex>",
    "digest": "sha256:<64 lowercase hex>"
  },
  "limits": {
    "maxEventBytes": 1024,
    "maxStateBytes": 16384,
    "maxOutputEvents": 8,
    "maxTransitionFuel": 1000,
    "maxMailboxDepth": 64
  },
  "events": [
    {
      "id": "increment",
      "payload": {
        "kind": "record",
        "fields": [{ "name": "amount", "type": "number" }]
      }
    }
  ],
  "actors": [
    {
      "id": "counter",
      "state": {
        "kind": "record",
        "fields": [{ "name": "count", "type": "number", "initial": 0 }]
      },
      "transitions": [
        {
          "id": "increment",
          "on": "increment",
          "when": null,
          "writes": [],
          "outputs": [],
          "result": { "kind": "quiet" }
        }
      ]
    }
  ],
  "digest": "sha256:<64 lowercase hex>"
}
```

`contract` is the exact string shown above. `behavior` is a closed object.
`sourceDigest` declares a SHA-256 for purported UTF-8 source bytes;
it is not a path, proof that those bytes exist, or permission to read them. `limits`, `events`, and
`actors` are closed objects and arrays described below. The root `digest` covers
the canonical root object with its own `digest` key omitted. The behavior
`digest` covers the canonical behavior object with its own `digest` key omitted.
A verifier recomputes both digests before using a value.

Every contract-owned object rejects unknown keys. A payload is not an escape
from this rule: a record payload accepts only fields declared by its event
schema. The `json` field type permits a canonical JSON value inside that field,
subject to the expression value limits and the event and state byte limits,
but it does not permit undeclared record fields. A parser takes the incoming value as `unknown`, checks its shape,
then returns the contract type. It never treats a foreign object as an already
validated record.

## Identity and ordering

All digests use `sha256:` followed by 64 lowercase hexadecimal characters over
canonical UTF-8 JSON. Canonical JSON uses the repository's canonical value
encoder, not host object insertion order. Numbers must be finite and represent
values supported by that encoder.

The following identities are stable and contain no clock value:

1. `behavior.digest` identifies the behavior metadata (`id`, `revision`, and
   `sourceDigest`) without its `digest` member. The root `digest` identifies the
   complete behavior artifact, including limits, event schemas, and transitions.
   The tuple `(behavior.id, behavior.revision, root.digest)` identifies one
   immutable revision. A new source digest or transition changes the root digest,
   even when the revision number is accidentally reused.
2. An event source supplies a non-negative `sequence` within its own source
   stream. An event identity is the digest of `{ "behavior": root.digest,
   "actor": actor.id, "source": source id, "sequence": sequence, "type":
   event type, "payload": payload }`. The source id is inside the digest, so
   two sources can use the same sequence without an identity collision.
   Within one behavior revision and actor, `(source, sequence)` is a stable
   logical-event key: its first admitted canonical `type` and `payload` bind
   that key. Reuse with changed type or payload is an `EVENT_LOOP_ID` conflict,
   not a newly admitted event, even though its full-content digest differs.
3. A message identity is the digest of `{ "event": event identity, "target":
   actor.id, "delivery": delivery identity }`. It identifies a delivery
   attempt, not a second opportunity to settle the same logical event. An exact
   repeat of a bound event is a duplicate even if the host assigns a different
   delivery identity. A duplicate records a no-op decision and does not run a
   transition or emit a notification. The host must retain the event-key binding
   and the settled decision across delivery attempts and restarts.
4. A notification receives a new event identity and a deterministic ordinal in
   its parent transition. The ordinal starts at zero for each transition. A
   notification cannot reuse its parent's message id.
5. State is identified by `(root.digest, actor.id, accepted message prefix)`.
   A state write replaces the declared field atomically. A trace order is the
   accepted message sequence, then transition and output ordinals. Concurrent
   hosts must present the same logical order or produce separate traces; this
   contract does not claim that an arbitrary distributed scheduler is ordered.

A verifier compares identities before values. It rejects reuse of a bound
logical-event key with changed content, a sequence outside the declared integer
range, a notification that is not listed by its parent transition, or a trace
that skips a required parent decision. A conflict is not a duplicate and cannot
commit a transition. Event-vector checks enforce this rule within their bounded
vector; a host and trace verifier must enforce it against retained earlier
entries as well. External effects are at-most-once claims only when their host
adapter supplies a matching idempotency record. This contract does not claim
exactly-once behavior for arbitrary external systems.

## Supervisor and habitat boundaries

An actor is a logical mailbox and state machine. A supervisor owns the durable
lifecycle around one or more actors: it admits an immutable behavior revision,
assigns delivery identities, enforces mailbox and state limits, and records
rejection, deferral, quarantine, and escalation outcomes. Supervisor state is
host evidence and is not silently added to an actor's declared state.

A habitat is the named host boundary in which a supervisor runs. It may provide
storage, capacity, a scheduling policy, and an admission decision. Habitat policy
is not a transition, does not alter event ordering, and cannot turn an escalation
into a model, tool, network, or filesystem permission. A habitat link or provider
adapter belongs to a separate contract. The event-loop evaluator receives only
its declared data and the bounded logical order selected by the host.

## Source and runtime identity

`behavior.sourceDigest` declares a SHA-256 for the exact UTF-8 source bytes
that an authoring tool would supply. The P0 smoke fixture retains no such source
bytes and has no checked source-to-artifact mapping. Its source digest is checked
for syntax and covered by the artifact digest, not verified as provenance. A
source digest is not a compiler digest, runtime digest, quality score, or
permission to read a path. A source map, compiler
version, and source-language diagnostic are separate evidence records keyed by
the behavior revision.

A runtime identity names the implementation and version used for a check, replay,
or benchmark sample. It is recorded in host-side evidence, never inserted into
behavior identity, transition results, or receipts. TypeScript and Rust/WASM
must use the same canonical data contract when they are qualified for parity.
A runtime identity cannot make an otherwise invalid behavior valid.

## Limits object

`limits` is closed and has the following bounds. These are admission bounds, not
performance promises.

| Field | Bound |
| --- | --- |
| `maxEventBytes` | 1 to 65,536 canonical UTF-8 bytes for one complete event record |
| `maxStateBytes` | 1 to 262,144 canonical UTF-8 bytes |
| `maxOutputEvents` | 0 to 64 notifications per transition |
| `maxTransitionFuel` | 1 to 100,000 `algal.expr.v1` fuel units |
| `maxMailboxDepth` | 1 to 1,024 pending messages |
| behavior id, actor id, event id, transition id, field name | 1 to 64 UTF-8 bytes, lower kebab case (`[a-z0-9]+(?:-[a-z0-9]+)*`) |
| behavior revision | 1 to 2,147,483,647 |
| actors | 1 to 64 entries |
| event declarations | 1 to 128 entries |
| transitions per actor | 1 to 256 entries |
| state or event fields | 0 to 64 entries |
| transition writes | 0 to 64 entries |
| transition outputs | 0 to `limits.maxOutputEvents` entries |
| state-write path | exactly one declared field name in v1 |
| expression canonical bytes | at most 16,384, using `algal.expr.v1` bounds |
| nested `json` state or event field | at most 32 value levels (scalar at depth 0), 1,024 items per list, 256 keys per object, 65,536 UTF-8 bytes per string or key, and 262,144 canonical UTF-8 bytes per value |

A `json` field is checked against those `algal.expr.v1` value bounds before
canonicalization, even when its enclosing event or state has a stricter byte
limit. The same check applies to initial state values and delivered payloads. The event and state byte limits are
checked before accepting a message or committing a state. A host must not raise a
limit after parsing a behavior. Every newly added count, list, string, and byte
field needs a focused test at its lower edge, upper edge, and first rejected
value.

## Events and schemas

An event declaration is `{ "id", "payload" }`. `payload` is a record schema with
zero or more fields. Each field is `{ "name", "type" }`; names are unique and
the type is one of `null`, `boolean`, `number`, `string`, or `json`. All declared
fields are required. Record payloads reject missing fields and unknown fields.
The `json` type is the explicit, bounded escape for a value whose internal shape
is owned by a caller. It does not change the event identity rule.

A state schema is the same record shape, except each field also has `initial`.
Initial values are checked against their declared type and the complete canonical
initial state record must fit `maxStateBytes`. State v1 has no implicit fields.
A state field cannot be added, removed, or renamed by a transition.

An `algal.event-loop.events.v1` vector is a closed object with `contract`,
`actor`, `events`, and `digest`. The actor must exist in the checked behavior.
It contains 1 to 256 events. Each event is a closed object with `source`,
`sequence`, `type`, and `payload`. The source uses the 1 to 64 byte id syntax;
its sequence is an integer from 0 to 2,147,483,647. The type must name a
declared event. The payload must have exactly its required, typed schema fields.
The canonical UTF-8 bytes of the *complete event object*, including the
payload, must fit `maxEventBytes`. A repeated `(source, sequence)` within this
actor's vector must have the same canonical type and payload; an identical
repeat is a duplicate, and changed content is `EVENT_LOOP_ID` at the repeated
sequence. The vector digest covers the canonical root without its `digest` key.
A checker verifies the behavior first, then the vector and its digest; it does
not accept an event vector alone.

The event and actor id sets are global within one behavior. An output may name
only a declared event and an existing actor id or the literal target `self`.
`self` resolves to the actor handling the transition. An event declaration can
be present without an output; this permits externally delivered inputs and
future revisions without changing the schema vocabulary.

## Transitions and outcomes

A transition is a closed object with `id`, `on`, `when`, `writes`, `outputs`, and
`result`.

- `id` is unique within its actor. `on` names a declared event.
- `when` is `null` or an `algal.expr.v1` envelope. It sees `{ "state", "event" }`
  and must return a boolean. A literal `get` name outside that pair fails
  admission. The evaluator never calls a host function from a guard.
- Each write is `{ "path", "value" }`. `path` names one declared state field in
  v1, represented as a one-element list. A nested path is rejected in v1; a
  future revision must explicitly define any nested-write semantics. `value` is an
  `algal.expr.v1` envelope over `{ "state", "event" }`.
  Writes are evaluated against the pre-transition state and are committed as one
  record after all expressions pass.
- Each output is `{ "kind": "notify", "target", "event", "payload" }`.
  `payload` is evaluated against `{ "state", "event" }` and checked against the
  destination event schema. Outputs are ordered by their array position and are
  limited by `maxOutputEvents`.
- `result.kind` is one of `continue`, `quiet`, `defer`, or `escalate`.
  `continue` commits writes and outputs. `quiet` commits writes and emits no
  outputs. `defer` has one additional `key` expression and requires empty writes
  and outputs. `escalate` has one additional `request` expression and also
  requires empty writes and outputs. Both pending outcomes are records for the
  durable host path, not host effects performed by the evaluator.

For one event, guards are evaluated in transition id order. The first true guard
wins. A behavior cannot rely on object insertion order. If no guard matches, the
host records `no-transition` and leaves state unchanged. A malformed payload,
unknown event, duplicate event (including a redelivery under a new delivery id),
conflicting event key, fuel exhaustion, or bound failure leaves state unchanged.
The evaluator never partially commits a state write or output.

Backpressure is part of the host protocol, not a hidden transition. A host
accepts at most `maxMailboxDepth` pending messages. It must return one of
`reject`, `defer`, or `quarantine`, with a reason and the message identity. The
choice is recorded in the trace and is not interpreted as a successful event.

## Replay trace

A trace entry is host evidence for the portable evaluator. It contains only
canonical values, logical sequence numbers, digests, transition ids, outcomes,
and bounded state/output summaries. It may contain a receipt digest for a
recorded effect. It must not contain `createdAt`, `updatedAt`, a timestamp,
random host identifiers, a process address, or a provider credential.

A replay verifier loads the behavior, then processes entries in order. It checks
message identity, the retained event-key binding, payload schema, guard and
expression results, fuel, state bytes, output identities, and the recorded
outcome. A replay can prove that the recorded transition is internally
consistent. It cannot prove that a provider returned a truthful answer or that
a future external effect will have the same result.

Trace storage and an eventual event-loop trace wire contract are intentionally
separate from this behavior envelope. P1 may add that record only by reusing
these identity and outcome rules.

## Decision record: no separate runtime

P0 chooses one semantic contract and two possible implementations of that
contract. The existing TypeScript runtime is the reference implementation
boundary. Rust/WASM is a parity implementation boundary. Neither gets a private
actor language, a second scheduler semantic, or a compatibility alias. This keeps
behavior, identity, and replay reviewable before an evaluator or host adapter is
built.

This decision does not qualify either implementation, promise performance, or
permit a live provider. It only rejects a separate event-loop runtime as a P0
deliverable. Future implementations must consume these records and pass the
same fixture and replay checks before they can be considered for integration.

## Errors and versioning

The portable parser reports one stable code for the first failure:

`EVENT_LOOP_PARSE` for a non-object or malformed JSON value,
`EVENT_LOOP_CONTRACT` for the wrong contract string,
`EVENT_LOOP_UNKNOWN_KEY` for an unknown object key,
`EVENT_LOOP_ID` for an invalid or duplicate identity,
`EVENT_LOOP_DIGEST` for a malformed or mismatched digest,
`EVENT_LOOP_BOUNDS` for a count, byte, depth, or fuel limit,
`EVENT_LOOP_SCHEMA` for an invalid field type or initial value,
`EVENT_LOOP_REFERENCE` for an unknown event, actor, state field, or expression
name, and `EVENT_LOOP_SEMANTIC` for an invalid transition outcome.
The P0 byte-fixture checker maps malformed JSON and invalid UTF-8 to
`EVENT_LOOP_PARSE`. Since these and a non-object JSON root have no contract
field path, their diagnostic spans cover the complete source (1 to 16,384
bytes). An empty or larger source fails the byte bound before a span can be
reported.

The contract has no compatibility alias. A future incompatible shape receives a
new `algal.event-loop.v2` identifier. A v1 parser rejects an unknown root key
rather than ignoring it, and a v2 parser must not reinterpret a v1 value without
an explicit migration record.

## Scope of this proposal

This P0 contract freezes the portable vocabulary and the input bounds. It does
not claim a runtime, a compiler, actor supervision, cloud delivery, cumulative
skill, provider quality, or performance improvement. The deterministic corpus in
`benchmarks/language/` is the acceptance fixture for this proposal. P1 can add a
Bun evaluator and a Rust/WASM evaluator only after both consume these exact
records and produce matching canonical digests.
