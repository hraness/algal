# Networked ALGAL habitats

ALGAL becomes a civilization substrate when a program can receive durable
inputs, make bounded judgments, retain evidence, and ask another governed
habitat to do the same. A civilization is therefore a federation of habitats,
not one enlarged virtual machine.

## One habitat

A habitat owns six things:

1. **Ingress.** Webhooks, schedules, operator submissions, CAS references, and
   mailbox deliveries become typed input records.
2. **Execution.** Organisms are immutable manifests. Inhabitants are durable
   processes pinned to a manifest digest. A supervisor wakes them, bounds work,
   and preserves checkpoints.
3. **Judgment.** Agent, classifier, and decide cells are ordinary effect
   boundaries. Their prompts, models, schemas, and usage are recorded in the
   process evidence; their answers do not become authority by themselves.
4. **State.** CAS values and receipts are immutable. Slots are the explicitly
   mutable state surface. Mailboxes are bounded durable queues.
5. **Effects.** Tools, delegated egress, messages, and remote invocations are
   admitted by capabilities and retain an idempotency identity.
6. **Evidence.** A receipt, invocation, message, or evolution record can be
   exported and verified without contacting the original provider.

An input may wake one process or a bounded local population. A process may
send a message to another local mailbox, call a local organism, or invoke a
remote Habitat Link operation. It cannot obtain an ambient URL, a global
process name, or another habitat's mutable slot.

## Two planes

The **data plane** carries work: `habitat-message.v1` and
`habitat-invocation.v1`. Its guarantees are admission, replay identity,
bounded capacity, and explicit uncertainty. A result says what the target
durably recorded; it does not claim that an outside service was truthful.

The **control plane** carries governance: signed habitat descriptors,
audience-bound grants, key rotation and revocation epochs, interface and
manifest advertisements, federation invitations, evidence bundles, and
evolution proposals. Control records are content-addressed and independently
verifiable. A descriptor is a routing hint, never an authorization.

The current cloud steel thread uses the tenant key as the control-plane
credential. The next profile replaces it with a detached grant whose audience,
operation, target digest, schemas, budgets, expiry, nonce, and revocation epoch
are all signed. This keeps the wire contract stable while the deployment trust
model matures.

## Habitat Link lifecycle

1. The caller validates a closed envelope and stores an outbox intent keyed by
   `operationId`.
2. The transport submits the envelope. A timeout or lost response leaves the
   intent `uncertain`; the caller reconciles by the same id.
3. The target authenticates the peer, validates the grant and target manifest,
   persists the invocation row, reserves local capacity, and returns
   `accepted`.
4. A local process runs the exact manifest and arguments. A result is written to
   the reply mailbox or made available to the status endpoint.
5. The caller verifies the result digest, receipt lineage, and target identity,
   then resumes its own process.

`accepted`, `started`, and `settled` are separate observations. A retry with
the same operation and canonical bytes is a read of the retained admission. A
changed body under the same identity is a conflict. A partition never turns an
unknown external write into a safe retry.

Messages use the same mailbox machinery. The receiver may have durably accepted
a message while no process has read it. Delivery state is never confused with
comprehension, agreement, or a successful social outcome.

## Transport profiles

| Profile | Job | Authority it does not provide |
|---|---|---|
| HTTP | Default `algal.cloud` ingress, browsers, ordinary services, polling/SSE | durable semantics, grant validation, or exactly-once effects by itself |
| Iroh/QUIC | Direct peer paths, NAT traversal, relay fallback, native ALPN | mailbox policy, replay, metering, or evidence |
| Valhalla room | MLS-protected proposals, review, rendezvous, and offline envelopes | low-latency scheduling or execution authority |
| MCP adapter | Expose one organism or habitat to an agent host | ALGAL process durability and capability attenuation |
| A2A adapter | Translate task-level agent interoperability | ALGAL receipts, evolution policy, and replay |

All profiles carry the same canonical records. HTTP `202` and Iroh stream
acknowledgements mean durable admission only. SSE, WebSockets, relays, and
room forwarding are delivery optimizations around the same records.

## Civilizations

A civilization is formed by explicit federation edges. Each edge has an
issuer, audience, target habitat, operation class, interface digest, schemas,
budgets, hop/fan-out limits, expiry, replay policy, and revocation epoch.
Signed invitations establish an edge; a catalog can make invitations easier to
find but cannot make an unknown habitat trusted. Discovery should begin with
pairwise invitations and eventually add a hosted `algal.cloud` catalog that
stores signed descriptors, health observations, and policy labels without
becoming a global scheduler.

Remote references are origin-qualified. Fetching a CAS object from another
habitat is a separate capability and never follows an arbitrary URL. Large
bundles move by digest and are verified before admission. Shared mutable CAS,
transparent remote `spawn`, distributed transactions, and a global process
registry are intentionally absent.

## Evolution

Evolution crosses habitat boundaries as evidence bundles:

- manifest closure and interface digest;
- requested capability classes and resource profile;
- training/evaluation corpus digests and holdout policy;
- receipts, measured usage, and lineage;
- publisher signature and parent revision.

The receiving habitat performs its own parse, replay, evaluation, and promotion
decision. A valid publisher signature proves provenance, not fitness or safety.
Communication itself is an experimental variable: a lab can compare isolated,
message-only, and fully federated conditions while retaining the same evidence
contract.

## Economics and operations

The first budget is admission-time: maximum work, model calls, bytes, hops,
fan-out, and wall time. A later settlement profile can attach metering records
to the same invocation digest. Payments, quotas, and resource markets remain
host policies; they cannot silently widen a capability or rewrite a receipt.

Operators see outbox age, acceptance latency, suspended work, uncertainty,
capacity refusals, grant expiry, and receipt verification failures. A healthy
peer is not necessarily an honest peer. An evidence viewer must distinguish
transport success, host assertion, replayable local facts, and externally
verified facts.

## Implementation path

1. **Steel thread (implemented).** Closed records and digest identity in ALGAL;
   HTTP invocation admission/status in `algal-cloud`; opt-in bounded Iroh
   framing in Valhalla.
2. **Durable remote messages.** Add a receiver acceptance record and sender
   outbox reconciliation, then test duplicate, lost-ack, revocation, and
   accepted-versus-read cases across two local habitats.
3. **Grant profile.** Add signed descriptors, audience-bound capabilities,
   rotation, revocation epochs, and origin-qualified CAS fetches.
4. **Native peer path.** Run the same invocation state machine over the Iroh
   ALPN on direct, forced-relay, reconnect, and outage journeys.
5. **Social bridge.** Carry signed proposals and offline delivery through a
   Valhalla room without making the room an execution authority.
6. **Evolution exchange.** Transfer bundles plus receipts, evaluate locally,
   and promote only under receiving-habitat policy.
7. **Catalog and settlement.** Add optional discovery, quotas, and metering
   after the two-habitat evidence path is boring and reliable.

The first public demonstration should be two habitats: a cloud planner invokes
a local specialist, the specialist suspends on a mailbox, resumes after a
delivery, returns a typed CAS result and receipt, and the planner verifies that
receipt offline. A revised specialist then arrives as an evidence bundle and is
held out or promoted by the receiving habitat.

