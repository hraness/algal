# Event-loop behavior summary (proposal)

A behavior describes event rules for an actor. The behavior-only summary lets a
checker show possible inputs, writes, notifications, pending outcomes, and
resource limits before any event is delivered. `summarizeEventLoopBehavior` in
TypeScript and `summarize_event_loop_behavior` in Rust accept a behavior value
and an actor id. Neither requires or invents a trace. This is a P1 offline
projection, not a scheduler, provider permission, or execution receipt. See
[the event-loop contract](event-loop.md) for behavior identities and limits.

Both implementations check the root and metadata digests, all event schemas,
all actors' states and transitions, and every expression's shape and static
`algal.expr.v1` program validity with `state` and `event` as available names.
They reject unknown keys, invalid references, malformed expressions, bad
initial state types, and exceeded limits before producing a summary. The
TypeScript implementation takes an inert copy of the input before checking its
digest. The Rust implementation parses JSON before calling the checker. An
invalid unselected actor refuses a summary for the selected actor. Actors are
checked in id order, so reordering the actor list does not change which actor's
failure is reported first. The [trace structure check](event-loop-trace.md)
checks expression envelopes only; it does not use this stronger static program
check as a substitute for replay.

The result is `{digest, summary, summaryDigest}`. `digest` is the checked root
behavior digest. `summaryDigest` is the SHA-256 of the canonical `summary`
object. That digest binds the projection's bytes; it does not prove source
origin, execution, or a host observation. The `summary` object has these fields:

| Field | Meaning and limit |
| --- | --- |
| `actor` | Selected declared actor id, 1 to 64 bytes. |
| `inputEventTypes` | Sorted unique event types named by this actor's transitions, at most 128. |
| `reads.stateFields` | Sorted declared state fields that an expression might read, at most 64. |
| `reads.eventFields` | Sorted `{event, fields}` rows for event payloads that an expression might read, at most 128 rows with at most 64 sorted field names each. |
| `writes` | Sorted declared state fields that a transition can write, at most 64. |
| `emits` | Sorted declared event types that a notification can emit, at most 128. Targets and delivery are not inferred from the event type. |
| `pendingOutcomes` | Sorted subset of `defer` and `escalate`, at most two. A nonempty list means this actor declares a possible suspended host continuation; guard reachability and successful evaluation are not established. |
| `capabilities` | Empty list in this pure v1 behavior. An escalation does not mint a tool or provider capability. |
| `limits` | Checked copy of the five behavior limits: `maxEventBytes` 1 to 65,536; `maxStateBytes` 1 to 262,144; `maxOutputEvents` 0 to 64; `maxTransitionFuel` 1 to 100,000; `maxMailboxDepth` 1 to 1,024. These are declared ceilings, not observed usage. |

Read sets include a declared field if a literal `get` names it. A `get` of a
whole `state` or `event` record, or a computed head or path, conservatively
includes every declared field it might access. Quoted expression data is not
executed and contributes no read. A local binder can shadow `state` or `event`,
so the result may include fields that will not be read at runtime. It must not
omit a possible declared input field. The summary cannot establish whether a
guard matches, an expression returns the required type, a transition finishes
within its fuel allowance, or a host publishes its outputs. Replay checks
recorded execution separately.

The behavior has at most 1,048,576 canonical UTF-8 bytes and 32 nested value
levels, with at most 1,024 list items, 256 object keys, and 65,536 bytes per
string or key. Declared transitions number at most 256 per actor, with at most
64 writes and 64 outputs per transition. Each expression envelope has at most
16,384 canonical bytes and the expression checker enforces its own program
limits. The derived summary is limited to 1,048,576 canonical UTF-8 bytes; its
arrays have the limits in the table. All fields are independent of the trace's
claimed fuel, state bytes, and effects. No wall-clock field is added.

The TypeScript and Rust tests cover valid, malformed, and boundary behavior
values, including unselected actors and computed reads. The offline
`bun scripts/event-loop-behavior-parity.ts` and
`bun scripts/event-loop-behavior-bounds-parity.ts` comparisons check identical
summary bytes, `summaryDigest` values, root digests, and refusal codes across
36 ordinary and four dense boundary vectors. This proposal does not qualify
live host delivery or complete the P1 exit gate.
