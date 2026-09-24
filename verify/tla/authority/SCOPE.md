# ApplicationAuthority scratch model

This finite model checks four related boundary families with explicit positive,
denial, and unsafe-control profiles. It is not a proof of arbitrary trusted host,
executor, dispatcher, parser, memory engine, cryptography, or source refinement.
Two application labels, two capability classes, three handle identities (two
send and one receive), two state/revision/memory/frontier symbols, two callback
attempts and two channel identities bound the abstraction. Family-specific
initial inputs/actions avoid an unexplained Cartesian product; no symmetry,
constraints, or overrides prune a family. Cross-family composition needs real
conformance cases and shared invariants, not just local model completion.

Bun core validation now executes in `src/application-core.ts`; the default host
remains in `src/application-host.ts`. Message parsing, minting and CAS checks live
in `src/application-message-contract.ts`, while retained delivery/local-channel
checks remain in `src/application-message.ts`. The `ApplicationStorage` interface
is a host assumption, not an authority grant or proof of arbitrary storage;
volatile memory-adapter conformance does not qualify filesystem custody.

## Dispatch admission

Core plan validation binds the episode's captured application/intent/source,
revision/memory/epoch, entrypoint/manifest/arguments, process and budget. Access
and host profile remain admitted host decisions, not derived from model output.
A fresh writer additionally needs source-head equality. A custom trusted host
may admit a stale observer; the model positively witnesses that allowed core
behavior. It does not borrow the default host's additional guarantees.

The default host checks policy application, requires the current revision and
memory for fresh episodes, and requires reproduced supported/verified
applicability. These are modeled input statuses from a trusted query boundary,
not a proof that any arbitrary query engine establishes truth. Same-pair but
new-head observation can pass; a fresh writer is still refused by the core.
A migrated original episode stays denied when its captured pair is no longer
selected. The `observe` label is an execution policy value, not OS isolation or
proof that arbitrary executor code has no side effects.

Explicit reconciliation returns and checks the original plan. It need not
reproduce fresh applicability or match current memory/revision; configuration
must still be the exact old configuration. Within each profile all policy fields
except frontier are fixed, so frontier 1/2 symbolically distinguishes dispatcher
configuration hashes while the host admission identity is unchanged. This is
based on `createApplicationPolicyHost` excluding frontier only from admission
identity. Hash collisions and arbitrary host claims are outside the model.
Two calls stand for a fresh admission followed by explicit reconciliation (or
two explicit reconciliation attempts for a retained initial record). Local
outbox persistence, late physical effects and failures are in ApplicationOutbox;
`Invoke` composes an already retained started record here. No physical exactly-
once or actual task-completion claim follows from these call logs.

## Capability and declaration boundaries

`AcceptCap` abstracts the independent exact-class parser, exact typed graph edge,
and permitted producer checks. A cap string parsed from a foreign value is only
syntax. `ResolveMailbox` separately composes the real driver's current registered,
unrevoked admission check. Three symbolic handles cover valid send, unregistered
send, and receive-class cases. The active current-configuration relation is an
input to that registry boundary; owner custody/revocation races and on-disk
record validation compose from the mailbox model and tests.

Const cells cannot mint cap ports and agent outputs have the bounded data-only
grammar; a JSON/reference edge does not become a cap edge. These statements
model the relevant contract/graph checks, not every byte-level parser branch or
all nested organism paths. The class-widening unsafe control explicitly omits
both exact parser class and typed-edge checks, because one surviving guard can
still reject the mismatch. Other controls isolate graph widening, const source,
registry absence and revocation.

Revision/entrypoint requirements are declarations, not minted handles. Core
requirement narrowing and entry-within-revision are distinct from the default
host's activate/migrate per-entry capability and unchanged-budget check. The
custom-host profile positively permits per-entry movement within already
admitted revision requirements. It grants no new registry handle. Restoration's
separate evidence/policy behavior is outside this revision-family check.
`ReceiveModelData` can add arbitrary symbolic data claims but cannot change the
registry. An explicit unsafe control makes those claims into grants. Denial
means no new authority is granted by the action, not erasure of existing rights.

## Message evidence and local channels

Message inputs have typed CAS-bound sender/operation/intent/route/body facts.
The model tests recipient parsing, CAS verification versus retained delivery
verification, and optional channel identity matching. It does not reproduce the
full CAS parser/hash verifier. CAS-level verification can pass for an orphan or
unsettled work item and for a different same-class recipient. Full delivery
verification additionally requires reachable history, settled dispatch, and the
recipient from the reproduced retained plan. The corresponding control that
accepts a forged recipient abstracts bypassing both plan-recipient equality and
full record reproduction; either surviving implementation check can refuse it.

Even full delivery evidence may verify while the recipient handle is currently
unregistered or revoked; explicit witnesses preserve that limited guarantee.
`verifyInterappDelivery` never resolves the destination's mailbox registry.
The policy-host delivery writes the local route channel, not a destination
mailbox send. No model action here converts receipt/evidence into destination
admission, proof of an external receiver, human intent, or external truth.

Optional channel verification requires the exact identity/message pair. Two
identities carrying the same payload stay distinct. `AddChannelIdentity`
abstracts completed serialized channel publication under its retained lease;
partial publication/power loss and the production 4096-row/byte bounds are
separate obligations. Payload-only deduplication or evidence matching are
unsafe controls and must fail identity-bound invariants.

The progress profile uses weak fairness of a finite admission/callback loop
and promises return including denial, not external success. All 118 full static diagnostics passed: 45 positive profiles, 54 exact action
witnesses, and 19 intended unsafe controls. Positive fairness completed and the
unfair control produced its expected temporal loop. Raw batch evidence is
`/private/tmp/algal-phase06-authority-diagnostics.log`, with exact per-run output
directories in each JSON row. Root independently approved this declared finite scope. Registered qualification
and real conformance remain pending. No
registered operational evidence or whole-system proof is claimed.

## Registered inventory

The registered candidate retains every scratch witness and unsafe control. Profiles
without an important action now also require a reachable action witness. Multiple
witnesses of the same action are separate profiles to preserve the existing strict
inventory rule. No checker limit, property, mutation or raw-output admission is
weakened. Fresh repository qualification and real conformance remain required.
