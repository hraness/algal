# Application state, evidence, and revision boundaries

This contract joins the organism VM, scoped memory, and durable host supervision.
It specifies local cooperating hosts using the retained SQLite custody protocol.
An application is not an operating-system sandbox, distributed consensus group,
or independently authenticated source of observations.

The executable record definitions are the closed parsers in
`src/application-contract.ts`, `application-memory.ts`,
`application-adaptation.ts`, `application-migration.ts`, and
`application-view.ts` and its evidence collector, with corresponding native application modules. Unknown
fields are rejected. Required nullable fields are explicit `null`. Records use
canonical JSON and SHA-256 identities, with no wall-clock timestamps.

## State and transition system

An application has a stable name and one mutable head. The head selects an
immutable state containing a program revision, memory snapshot, sequence, epoch,
previous state, and transition. These references are selected together: readers
must not independently resolve the newest program and newest memory.

Let `H` be the current state digest, `C` a closed command, `K` its operation
identity, and `hash(C)` its request digest. Under retained application custody:

1. An existing operation `K` with a valid retained operation index and the same
   request returns its committed result, even after the head has advanced or
   fresh host admission would deny it. A different request under `K` is rejected.
   If history contains `K` but its index is absent, both exact and changed retries
   are rejected; the service does not reconstruct the reply or commit `K` again.
2. For a new operation, `C.expectedHead` must equal `H` (or `null` for genesis).
3. The lifecycle checks structural transition invariants. The admitted host
   checks typed dependencies, authority, memory, and transition-specific evidence.
   Rejection leaves the selected head unchanged.
4. Immutable intents, transition, state, and operation dependencies are published
   durably before the head advances. Advancing the head is the local selection
   point; an interrupted caller can retry the same operation without inventing
   a new effect namespace.

`create` establishes sequence and epoch zero. A memory or investigation
transition retains the program revision. An investigation transition retains
memory and contains work. A `propose` transition retains revision, memory,
and epoch, carries no intents, and records generated candidates as evidence.
`activate` changes the revision under compatible
schema and interface rules. `migrate` explicitly names a schema change and its
producing migration evidence. Revisions advance epoch; ordinary memory updates
advance sequence while retaining epoch. Previous states are retained.

### Retained application custody

Every mutation, including dispatch and reconciliation, acquires the retained
SQLite owner at `applications/.creation/pending/ID` as its stable primary
identity. This identity does not change when the first head appears. A short
shared lease at `applications/.creation` validates the bounded namespace scan;
it is released before acquiring the per-application owner or calling host
admission. Independent applications can enter host admission concurrently.

After primary acquisition, the service checks the named directory again. An
existing `applications/ID` also requires its permanent SQLite owner before
history, expected-head checks, admission, or dispatch. This secondary owner
preserves exclusion with older writers and preserves refusal of unrecognized
legacy ownership markers. Recognized interrupted v2 markers are archived only
after acquiring the corresponding SQLite transaction. A marker's PID, age, or
pathname alone does not establish that its owner has stopped.

A new named directory is created only after admission and quota reservation
succeed, then its permanent owner is acquired before publishing dependencies
or the head. Both owners remain held through publication; cleanup precedes the
successful public return. A later owner rereads the selected history before
checking its expected head. A prepared directory already occupies an
application slot and may finish at the 32-name limit. Refused admission,
refused quota reservation, and dispatch to an unknown name do not create a
named application directory; retained coordination files under `.creation`
are still subject to the separate conservative scan and allocation bounds.

The repaired exclusion guarantee applies to cooperating upgraded writers
sharing these retained SQLite identities on the supported local filesystem.
The two owners also exclude an upgraded writer from an older writer
holding either original identity. It does not repair the original cutover race
between two concurrently running older writers; upgrade every mutating host
before claiming the fleet-wide guarantee. These live-custody checks do not by
themselves establish power-loss durability or distributed exclusion.

The optional custody-selection diagnostic hook runs after the shared scan is
released and before primary acquisition. It is separate from the four existing
durable fault points (`prepared`, `head-published`, `dispatch-started`, and
`dispatch-settled`), is absent from ordinary hosts and CLIs, and contributes no
data to canonical application records. The eight Bun/native three-caller
schedules exercise this gap through the actual services; they are sampled
implementation evidence, not an exhaustive refinement proof.

## Records and responsibilities

| Record | Purpose |
| --- | --- |
| `algal.application-revision.v1` | Program, schema, query bundle, view specification, runtime/evaluation policies, and entrypoints |
| `algal.application-state.v1` | Atomic program/memory selection and historical predecessor |
| `algal.application-transition.v1` | Command identity, predecessor, selected values, intents, and evidence |
| `algal.application-operation.v1` | Stable operation-to-request-and-result binding |
| `algal.application-intent.v1` | A delivery or episode request retained before dispatch |
| `algal.application-dispatch.v1` | Admitted plan, configuration identity, and dispatch settlement or uncertainty |
| `algal.application-admission-denied.v1` | Bounded dispatch-attempt result identifying the intent, source state, current state, and refusal reason; grants no plan or authority |
| `algal.application-episode.v1` | Exact source state, revision, memory, manifest, input, process, and host profile for one episode |
| `algal.episode-outcome.v2` | Bounded references to the episode binding, durable process state, and actual run receipt |
| `algal.application-memory-observation.v1` | Host-decoded claims and their immutable raw evidence, receipt, procedure, and scope |
| `algal.application-memory-hypothesis.v1` | A proposed claim, kept distinct from admitted observations |
| `algal.application-memory.v1` | Selected observations, withdrawals, hypotheses, schema, scope, predecessor, and optional retained archive |
| `algal.application-memory-archive.v1` | Exact pre-cutover snapshot, application/schema, archive sequence, and previous archive |
| `algal.application-memory-derivation.v1` | Conditional query result bound to captured state, selected facts, program, engine, frontier, and admission |
| `algal.application-evaluation.v1` | Frozen evaluation request, foundry evidence, compatibility, and reproducible acceptance verdict |
| `algal.application-proposal-request.v1` | Frozen generation input: parent state, generator and target entrypoints, arguments, output, and incumbent policy binding |
| `algal.application-proposal.v1` | Generation evidence: request, receipt, status, bounded reasons, and sorted candidate revision references |
| `algal.application-comparison.v1` | Environment-attributed join of several reproduced evaluations for one entrypoint, shared measurement set, and accepted-only selection |
| `algal.application-selection-policy.v1` | Environment-keyed mapping from environment label to a retained comparison and its selected manifest; pure data, no authority |
| `algal.application-research-policy.v1` | Frozen evaluator, harness, corpus, admitted strategy entrypoints, and per-case attempt bound |
| `algal.application-research-corpus.v1` | Closed case set with development and holdout splits and retained task/source references |
| `algal.application-research-request.v1` | Parent state, candidate revision, strategy entrypoint, and policy for one evaluation |
| `algal.application-research-report.v1` | Attempt journal and per-case role outcomes, pass flags, and work/call accounting with distinct receipts |
| `algal.application-research-evaluation.v1` | Request, report, seal, pinned verifier identity, and reproducible acceptance verdict |
| `algal.application-migration.v1` | Source snapshot, both revisions, pure migration program, producing receipt, and emitted claims |
| `algal.application-drain.v1` | Explicit per-intent disposition of the undispatched pending set at a migrate's parent state |
| `algal.application-view.v1` | Bounded historical projection and state-fenced proposed actions |
| `algal.application-view-evidence.v1` | Optional captured query, probe, source, revision, and separately observed work summaries |

A digest establishes content identity. It does not grant authority or prove
that an external observation is true. Merely storing an evaluation record does
not authorize activation. The lifecycle's injectable admission interface is a
trusted host boundary; a custom host that deliberately accepts arbitrary input
does not inherit the default policy host's validation guarantees.

## Default host admission

`algal.application-host.v1` belongs to exactly one application. Its routes,
decoders, frontier, and host profile cannot authorize another application's
commits or deliveries. Entrypoint capability declarations are requirements,
not newly minted capability handles.

At commit admission the default policy host resolves and validates memory,
schema, queries, view/profile/policy records, and compiled entrypoint manifests.
Memory progression preserves the prior snapshot, except for an explicit
schema migration. Admission runs inside the lifecycle's custody interval;
preflight alone is insufficient.

The default host's `algal.host-admission.v2` identity binds all policy fields
except the selected mutation frontier. Advancing the frontier preserves the
authority that admitted historical observations; their old scope still makes
them stale. Changing a decoder, attestation rule, application, route, profile,
or access policy changes admission identity and cannot silently reauthorize
historical observations. Dispatcher configuration binds the complete policy,
including frontier selection.

Activation must replay accepted evaluation evidence bound to the exact parent
state and candidate revision. Evidence must cover each changed entrypoint manifest.
Compatibility prevents widening capability requirements, entrypoint memory
views, or external interfaces. The frozen policy requires strict validation
improvement, no previously passing validation regression, passing holdout, and
bounded work. A foundry winner is insufficient when those criteria fail.

An evaluation request may carry an optional `environment` label attributing
the produced evidence to a deployment context. The label is part of the frozen
request identity, so environment-attributed and unattributed measurements are
distinct records and can never be silently conflated.

The evaluation policy may opt into static program reuse with
`composition: "closed-pure-v1"`. Without this field, evaluation retains the
original rule: each entrypoint contains only `input`, `const`, builtin `fn`
and `expr` cells. Absent fields remain absent from canonical policy bytes.
No other composition value is accepted.

With this mode, evaluation also permits `organism`, `each` and `repeat`
cells whose entire digest-pinned child closure is already in the local store.
Before running either candidate, both complete graphs are compiled and every
descendant is checked, including inactive branches. Every leaf must still be
one of the original pure cell kinds. A transport reference (`via`) is rejected
even when its child is already local; evaluation performs no module fetches
and attaches no external tools. TypeScript requires the unchanged builtin
function registry, and native execution uses its fixed builtin registry.
Graph compilation retains its expanded-instance, cell, edge, byte and depth
limits. Child execution shares the root program's work, step and depth
allowance; a helper does not receive another allowance. Frozen cases,
compatibility, strict improvement and replay requirements remain unchanged.

This mode applies only to evaluation and verification of evaluation evidence.
Proposal generation, generated candidate checks, migration and restoration
keep their existing rules. Generated dependency bundles need a separately
specified, request-bound provenance mechanism before proposals can introduce
composed candidates. Reusable helpers can be installed as explicit immutable
manifests and evaluated under this mode in the meantime.

Sealed research evaluation is an opt-in alternative to foundry evidence for
strategy-only revisions. A revision selects it with the
`sealed-research-evaluation.v1` runtime profile and an evaluation policy that
names a frozen `algal.application-research-policy.v1`; either without the
other is denied, and research mode admits no schema migration. The candidate
revision may change only the manifest of one strategy entrypoint the policy
admits, preserving parent, metadata, authority, and every other field
byte-for-byte; the new manifest must already be retained, stay pure, share
the incumbent's interface signature, and widen no budget. The host requires
an explicitly supplied verifier pinned to the policy's evaluator identity;
verification is bounded local work over the signed report, journal, and
attempt receipts, never provider execution under custody. Deterministic
gates recompute acceptance: every frozen case needs an ordered attempt for
both roles within the policy bound, receipts must be distinct and resolvable,
any uncertainty rejects, holdout must pass, no previously passing case may
regress, development must strictly improve, and per-role work and model calls
stay inside the frozen bounds. Activation replays the same checks against the
exact expected parent state and only an accepted verdict naming the candidate
revision commits; pure-case evaluation evidence cannot activate under a
research profile. The native kernel parses these records but admits no
research verifier: the native policy host refuses research profiles and
research policy fields rather than granting implied authority.

Migration is a pure, bounded transformation of the source observation
projection. Its replay must reproduce the exact arguments and emitted claims.
Withdrawn observations and hypotheses do not become fresh observations merely
by being present in a historical snapshot. A changed schema starts a new memory
chain and retains the old snapshot through explicit migration evidence.

### Explicit drain of undispatched work

An undispatched intent pins the operation, revision, entrypoint, and memory
of the state that created it; a schema change cannot silently reinterpret
that pin. A `migrate` transition whose parent retains undispatched pending
intents must therefore cite exactly one `algal.application-drain.v1` record
in its evidence. The closed record names `application`, the transition's
`parentState`, and a sorted, unique `dispositions` array covering the
complete undispatched set — no missing rows, no extras:

```json
{"contract":"algal.application-drain.v1","application":"inventory","parentState":"sha256:...","dispositions":[{"intent":"sha256:...","status":"abandoned"},{"intent":"sha256:...","status":"migrated"}]}
```

Each disposition is explicit. `migrated` keeps the original intent pending,
with its original source revision and memory; fresh dispatch still requires
admission. In particular, the default host refuses an old episode whose source
revision or memory is no longer selected. A retained delivery may still qualify
under its route policy. `abandoned` drops the intent from every future `pending`
projection and dispatch scan. Abandonment is a projection rule: the
intent record stays immutable in history and CAS as evidence and is never
rewritten or deleted, and an abandoned intent can never be re-drained,
reconciled, or dispatched. A drain cited where the parent has no
undispatched pending work is non-applicable evidence and is rejected, as are
drains that name another application or parent, omit an undispatched intent,
name a dispatched or already abandoned intent, or appear more than once in
the evidence. Settled work is no longer pending; admitted-but-unsettled
dispatches remain governed by the activation barrier and can never be
drained.

`produceApplicationDrain(service, {application, parentState, dispositions})`
stores the record after checking coverage against the recomputed set;
`verifyApplicationDrain(service, drain, expectedState)` re-verifies a stored
record's digest, parent binding, and set equality. The committing core and
the trusted policy host independently recompute the undispatched set and
replay the cited record; retained history replays each drain's binding and
dispositions, so stale or tampered evidence cannot pass inspection.
`undispatchedPending(application, parentState)` exposes the exact drained
set to producers. Native `application drain <input.json>` and
`application verify-drain <input.json>` implement the same surface.

## Memory and incomplete information

The host admits scope completeness for declared procedures and dependency
bindings. The runtime does not infer a complete dependency set from model text.
Frontier changes require applicability to be reconsidered. An uncertain
mutation frontier cannot certify current support. Domain probes must bind their
raw output to the frontier they actually observed; reading a new frontier after
a probe does not make earlier output current.

Queries recompute over the explicitly selected active facts. A canonical first
witness is one positive derivation, not a complete dependency graph. Retraction
cannot be implemented by deleting only conclusions that mention that witness:
alternative support may remain. Historical sources are retained separately
from their current applicability.

Statuses remain distinct: `supported`, `opposed`, `conflicted`, `unknown`,
`stale`, `exhausted`, `failed`, and `cancelled`. Exhaustion is not an empty
successful answer. Unknown is not opposition. A historical supported result
does not authorize execution against a newer state.

### Active memory rollover

An explicit rollover retires observations or hypotheses from the active query
selection while retaining their original snapshots, raw evidence, receipts,
scopes and procedures in CAS. It is not deletion, source authentication,
summarization, or garbage collection. Queries still derive only from the
selected active observations. The caller must retain observations needed for
current applicability, such as a project-ready fact or procedure prerequisite.

A snapshot may carry `archive: Digest`. Existing snapshots omit the field and
keep their exact canonical bytes. Each archive is the closed record:

```json
{"contract":"algal.application-memory-archive.v1","application":"inventory","schema":"sha256:...","sequence":0,"previous":null,"snapshot":"sha256:..."}
```

The digests above abbreviate complete references. `snapshot` names the exact
memory predecessor at cutover; its optional archive must equal `previous`.
Sequences begin at zero and increase by one, with at most 128 archive segments.
Application and schema must match throughout. Every archive and archived
snapshot must resolve. A cutover keeps the prior scope and can only select
subsets of its observations and hypotheses; it must retire at least one item.
Withdrawn observations that remain selected retain their withdrawals. Retired
withdrawals remain in the archived snapshot. An ordinary successor keeps the
archive unchanged, preserves its active predecessor's observations and
withdrawals, and cannot resurrect any retired observation reference. Fresh
source evidence can be admitted as a new observation; merely selecting an old
archived reference cannot make it current again.

`ApplicationMemoryService.rollover({memory, retainObservations,
retainHypotheses})` writes an immutable archive and successor snapshot but
does not select a head. `archiveHistory(memory)` returns bounded cutovers in
newest-first order. `rolloverApplicationMemory(lifecycle, memory, input)` adds
the archive to transition evidence and commits an ordinary `memory` transition
using `application`, `operation`, `expectedHead`, `expectedMemory`,
`retainObservations`, and `retainHypotheses`; optional `evidence` (at most 15)
and `causedBy` retain their usual meanings. Native `application rollover-memory
<input.json>` implements the same bridge. An identical operation retry returns
the original state. A stale head or altered operation is refused. CAS records
created before a refused commit are unselected evidence, never a second head.

Rollover preserves revision, epoch, all lifecycle history, operation identities
and outbox custody. It invokes no dispatcher and does not retry uncertain work.
Fresh episode applicability must be rederived against the new state; explicit
reconciliation still uses the original effect identity and plan.

This extension permits more than 128 cumulative observations under a bounded
active selection. It does **not** remove the separate 4,096-state/retained-intent
limits, the application namespace quotas, or the absence of shared-CAS ownership
accounting and reclamation. Reaching any bound fails closed. Lifecycle
checkpointing and storage reclamation remain separate work; this is not an
indefinite-retention guarantee.

## Dispatch, restart, and inhabitants

The revision's entrypoints are separately named inhabitants with explicit
capability and query subsets. Their manifests carry VM budgets, and episode
bindings pin their exact definitions. Admitting a new revision does not rewrite
an existing episode or silently broaden its authority.

An execution request must carry the exact supported derivation reproduced by
the default policy host under application custody. The Bun host requires an
explicit memory query engine; it never silently substitutes an implementation.
Before a fresh episode starts, the host requires its captured revision and
memory to remain selected at the current head and recomputes applicability.
An unchanged mutation frontier alone cannot revive withdrawn support. Fresh
external writers additionally require the exact source state to remain current.

The outbox records a stable intent before crossing an external boundary.
Dispatch identities bind the application, intent, and admitted plan; the
dispatch record separately pins the dispatcher's configuration. A settled
delivery is not repeated. An interrupted or blocked effect remains visible and
requires explicit reconciliation; absence of a completion record is not
permission to retry a mutation. These are logical delivery guarantees for
cooperating admitted drivers, not universal exactly-once physical effects.

`dispatchPending` returns a union of admitted dispatch records and transient
`algal.application-admission-denied.v1` results. A denial carries
`application`, `intent`, `sourceState`, `currentState`, `status: "denied"`, and a
bounded `reason`. It leaves the intent pending and creates no dispatch plan.
The scan visits at most 128 pending intents. Denied work and retained started,
blocked, or uncertain records do not consume the requested fresh-dispatch
budget, so an older blocked item cannot starve a later eligible item.
Explicit reconciliation preserves the recorded plan, effect identity, and
dispatcher configuration even after memory advances; it does not authorize a
fresh attempt or a changed effect.

Durable host channels use `algal.host-channel.v2` with an `outcomes` array of
`{identity, message}` pairs. Distinct dispatch identities remain distinct even
when their messages match; reconciliation requires the exact recorded pair.
Legacy `algal.host-channel.v1` files lack sufficient identity evidence and are
rejected unchanged pending an explicit migration. They are never reset or
silently treated as receipts for a new dispatch.

### Verifiable inter-application messages

A settled `deliver` dispatch additionally retains `algal.interapp-message.v1`:

```json
{"contract":"algal.interapp-message.v1","application":"inventory","operation":"sha256:...","intent":"sha256:...","route":"proposals","to":"cap:mailbox-send:...","body":{"contract":"algal.application-investigation-request.v1"}}
```

The record binds the sender application, the committing operation, the exact
`algal.application-intent.v1` digest, the declared route, the admitted
`cap:mailbox-send:` recipient handle, and the payload body the intent's
`message` reference resolves to. It is minted inside dispatch settlement only
for a settled delivery whose retained result re-establishes the same message
and idempotency key from CAS. A bound record that would exceed the
application record bound mints nothing; the channel outcome still stands and
verification reports the record absent. Reconciliation remints idempotently.
The result and message records precede outbox settlement publication: a later
quota or publication failure may leave both in CAS while the outbox remains
`started`. Their presence alone does not establish durable settlement.

`verifyInterappMessage` checks the CAS bindings: the named intent must be a
`deliver` intent of this application, operation, and route, and the embedded
body must be digest-identical to the intent's payload.
`verifyInterappDelivery` adds the retained-dispatch bindings: the intent must
occur in validated application history, its dispatch must be the settled
delivery naming the recorded recipient, and the recomputed record must
reproduce the reference. A supplied channel directory must also retain the
matching `{identity, message}` outcome. Successful full delivery verification
establishes the exact retained settlement binding. CAS-only verification does
not establish settlement or the admitted recipient. Neither check establishes
external receipt or current admission of the destination capability; the default
host writes the local route channel and does not invoke destination mailbox send.

Default episode settlement includes an `outcome` digest in its immutable
result. Following the dispatch's `result` and then `outcome` reaches the actual
`algal.episode-outcome.v2` record and its `processState` digest. The record's
`receipt` digest resolves in the run-receipt store, keeping the application
record bounded even for large valid receipts. No program execution is needed.
Legacy v1 outcomes retain their embedded receipt shape unchanged. Legacy or custom trusted episode results may omit this optional field;
consumers requiring execution evidence must reject that absence.

The built-in domain dispatcher creates a durable process in the application's
store custody. Reuse requires the exact process name, manifest, arguments, and
generation budget. A ready process can start after an interrupted creation;
a terminal process supplies its existing receipt after a lost acknowledgement.
Suspended processes require an admitted wake and remain bounded by
`maxGenerations`. Explicit reconciliation may recover an uncertain process
through its bounded journal, which refuses unknown writes. Graphs containing
slots or dynamic spawn remain executable but do not receive journal recovery;
their uncertain processes require adapter reconciliation. A dispatch retry
never invokes recovery implicitly or rewrites the process binding.

One application head serializes state selection. Independent reasoning and
bounded evaluation can occur outside custody, but their results must pass the
expected-head check before selection. Parallel model calls by themselves do
not establish useful concurrency or improved performance.

### Retained CAS-head contention

That single-writer fence also produces durable evidence. A set of commands
raced against one captured expected head is retained as
`algal.application-contention.v1`:

```json
{"contract":"algal.application-contention.v1","parentState":"sha256:...","attempts":[{"command":"sha256:...","status":"committed"},{"command":"sha256:...","status":"rejected","reason":"Stale application head"}],"winner":"sha256:..."}
```

`produceApplicationContention` stores each command under CAS, then commits the
attempts in input order against the live lifecycle. Exactly one must commit;
every loser must take the exact stale-head rejection — any other failure
aborts production without a record. The retained record carries 1–8 attempts
sorted unique by command digest, exactly one `committed` attempt, and a
`winner` naming that attempt's command. Rejection reasons are bounded.

`verifyApplicationContention` re-derives the outcome without executing
commits: the parent state must occur in history, the winner's committed state
must be its direct child carrying the winner command's request digest, and
every recorded rejection must be the failure the lifecycle's own check order
still derives — a committed operation collides before the head check,
otherwise the moved head fences the attempt as stale. A fabricated winner or
an impossible loser fails. The record evidences what the fence decided for
these exact commands; it does not establish physical simultaneity or
linearizability across hosts.

## Retained goals

A revision may attach `goals`, a sorted unique array of at most eight CAS
references. Legacy revisions omit this field; normalization does not insert it.
An explicit empty array remains explicit. Each reference resolves to this closed
record:

```json
{"contract":"algal.application-goal.v1","application":"inventory","id":"discover-inventory","description":"Establish current stock and discover the current tool.","query":"sha256:...","entrypoint":"planner"}
```

The reference shown above abbreviates a complete digest. The application and IDs
use the existing identifier grammar. Description is 1–2,048 UTF-8 bytes with no
NUL. Goal IDs are unique within a revision. The named entrypoint must exist;
the query must occur in both that entrypoint's memory view and the revision's
query bundle, and its typed memory-query record must use the revision's schema.
Lifecycle admission resolves and checks this closure before publication.

A goal names a query objective and the procedure selected when its prerequisite
is established. `supported` means the goal's query is supported by admitted
memory at the captured state. It does not establish successful execution,
real-world task completion, or authority to perform an effect. The host's
explicit policy can use unresolved goals to request investigation and supported
goals to select a procedure; existing applicability and capability admission
still apply. General autonomous goal planning is outside this contract.

Goal evaluation invokes the admitted memory service. A captured goal contains
its full immutable definition and digest, captured state and memory, exact
memory-derivation reference, and the unchanged memory status vocabulary.
Without derivation evidence its status must be `unknown`. Goal projections
reject wrong-kind, cross-application, cross-query, or stale state/memory
derivations. Loading or rendering a captured derivation is structural checking,
not replay or observation authentication. Fresh evaluation rederives the query.

Views optionally contain the revision's complete ordered goal captures. The
`goals` widget displays descriptions, query statuses, and selected entrypoints.
Native `application view` accepts optional `goalDerivations`, mapping goal IDs
to already-produced derivation references. Omitted evidence displays `unknown`;
view construction performs no query or effect. Legacy views without goals keep
their previous canonical representation.

## Views and workbench

A view captures one state and preserves the status vocabulary above. Executable
action records require supported applicability and name the captured state,
procedure, and query result. The receiving host must revalidate their evidence
and current state; a view record grants no authority.

History shows at most the latest 128 entries and explicitly marks truncation.
Truncation never replaces source history. A legacy view that omits `evidence`
keeps that absence and its canonical representation.

### Captured evidence drilldown

`application view` accepts optional `evidence: true` and a sorted, unique
`derivations` list of at most 32 already-produced derivation references.
`derivations` requires `evidence: true`. Evidence collection
loads the captured state's retained records. It does not run a query, replay a
proof, probe a resource, or dispatch work. TypeScript hosts use
`collectApplicationViewEvidence(service, history, derivations)` and pass the
result into `projectApplicationView`.

The optional closed `algal.application-view-evidence.v1` record names the view's
exact `state` and `memory`, and has five arrays:

| Array | Captured content |
| --- | --- |
| `queries` | Selected query and program, status and reason, nullable derivation/result/facts references, source references, declared procedures, and the producer's `claimedVerified` flag |
| `probes` | Declared procedure, manifest, decoder, dependency keys, nullable prerequisite, and nullable manifest step/work/model-call/output-byte budgets |
| `sources` | Observation, scope, procedure, raw record, receipt, decoder, and admission identity |
| `revisions` | Historical state, revision and parent, transition kind, and retained transition evidence such as the accepted evaluation |
| `work` | Intent and original source state/revision/memory, kind, observed dispatch status, investigation request/query/procedures or episode process/binding/result references, and nullable reason |

An organism probe resolves its retained manifest and displays its VM budgets.
A host-backed probe instead resolves its addressed host record and displays
`budgets: null`; collection does not invent VM limits for a host operation.
Declared probe metadata still grants no execution authority.

Every array contains at most 32 rows. Its corresponding Boolean in the required
`truncated` object says whether rows were omitted. A query retains at most 128
source references and 16 declared procedure references; nested records retain
their original contract bounds. Query reasons are at most 256 UTF-8 bytes;
work reasons are at most 1,024. Queries, probes, and sources are ordered by their
content references. Probes and sources keep the first 32; revision rows keep
the latest 32 states, and work keeps the latest 32 intents in state/ordinal
order. The complete view remains subject to its 262,144-byte record bound. A clipped display is not a replacement for the
retained source records.

Supplied derivations must belong to a selected query at the exact captured
application state and memory. A query without supplied evidence displays
`unknown`, not a fabricated success. With evidence present, omitted procedure
applicability is derived from its selected query. Explicit applicability and
query-result references must agree with that evidence; evidence alone creates
no executable action. An unresolved query, its producer's reason,
and its declared probes explain the available investigation path; they are not
a complete logical explanation of every absent premise. Declared probe metadata
does not itself authorize a future effect. Source/proof references and
`claimedVerified` report retained producer data; display construction and HTML
rendering do not independently authenticate observations or replay proofs.

Historical investigation requests retain the state that triggered them, which
may precede the transition publishing the delivery. Existing work retains its
original revision and memory after activation or migration. Dispatch records
are validated and observed separately while collecting a view: immutable state
capture does not make the mutable outbox a globally atomic snapshot. Work status
preserves `pending`, `started`, `settled`, `blocked`, and `uncertain`; rendering
cannot turn missing settlement into successful completion or authorize a retry.

The native `algal application report <view.json>` command validates the closed
view structure and renders a standalone passive HTML workbench on stdout. It
escapes all data, provides local drilldown links for included evidence rows,
and leaves uncaptured content references as text. Its HTML output is bounded to
4 MiB. It performs no dispatch, provider call, or proof replay. Its labels do not claim verification of the truth
of observations.

## Bounds and evidence

| Resource | Maximum |
| --- | --- |
| Application record | 262,144 canonical UTF-8 bytes; depth 24; 16,384 nodes |
| Applications per supervisor | 32 |
| States per application | 4,096 |
| Revision entrypoints / command intents | 32 each |
| Transition evidence references | 16 |
| Pending intents / retained dispatches | 128 / 4,096 |
| Drain dispositions | 128 |
| Fresh dispatch batch / pending scan | 32 / 128 |
| Durable channel outcomes / channel file | 4,096 / 1,048,576 bytes |
| Active memory observations / hypotheses | 128 / 64 |
| Retained memory archive segments | 128 |
| Evaluation cases / work / model calls | 32 / 1,000,000 / 16 |
| Comparison results | 8 |
| Proposal candidates / reasons | 8 / 16 |
| Selection policy rows | 16 |
| Contention attempts / reason bytes | 8 / 1,024 |
| View history / action records | 128 / 32 |
| Evidence queries / probes / sources / revisions / work | 32 rows per array, with separate truncation flags |
| Named application namespace / aggregate allocation | 256 MiB per application / 1 GiB aggregate |
| Quota scan | 10,000 entries per application or coordination directory; 300,000 total; depth 4 |

### Conservative namespace quota

The initial lifecycle uses the design's conservative named-namespace fallback.
It measures every regular file beneath `applications/ID`, including preparation
indexes, outbox records, orphaned temporaries, and retained recovery evidence.
It also accounts for the supervisor and quota coordination directories.
Symlinks, special files, invalid application directory names, and excessive
scan depth or entries reject allocation. Shared `values`, `manifests`, `runs`,
and `effects` CAS objects are **not** attributed by this fallback. This is not
a complete application-owned CAS quota or a general whole-store quota.

Before lifecycle publication, the service acquires shared retained SQLite
custody at `.application-quota` and records a server-derived reservation in
`ledger.json`. Its closed `algal.application-quota.v1` record contains an
`applications` array of at most 32 unique `{application, bytes}` rows, emitted
in name order. Each application's charge is the greater of its previous charge
and measured namespace bytes plus 2 MiB of coordination headroom, then adds
twice the canonical byte size of the values being published. Counting both
temporary and final copies covers a crash during immutable publication. The
aggregate includes measured shared coordination bytes, a further 2 MiB for
each of the supervisor and quota owners, and 16 KiB for ledger publication.
Per-owner headroom covers 256 recovery records of at most 4,096 bytes, four
SQLite files of at most 65,536 bytes, and the live ownership marker.

The ledger is published durably before the reserved operation/head or outbox
writes. A failed or interrupted publication retains its charge; retrying may
consume more capacity. Deleted files never automatically refund a retained
application charge. The short shared quota custody covers reservation and
publication, and is released before live dispatch. Independent application
writers therefore cannot oversubscribe aggregate allocation. An outbox
settlement that cannot allocate leaves the prior started record available for
explicit reconciliation; it does not authorize repeating the effect.

Exhaustion preserves history and evidence. Inspection and readback of an
already committed operation or settled dispatch allocate nothing and remain
available. New publications, including reconciliation that requires a new
record, may be refused. There is no automatic reclamation, quota reset, caller
estimate, or configurable override. Precise shared-CAS ownership accounting
and explicit reclamation require a separate protocol.

The shared lifecycle driver, admission regressions, crash/restart tests, and
CLI command comparisons are executable evidence for these boundaries. They do
not establish general coding gains, independent observations, benchmark
representativeness, provider attestation, distributed linearizability, or
optimal adaptation. Such claims need separately retained evidence and stated
assumptions.


## Explicit pure strategy restoration

`restore` is a forward revision transition, separately authorized from
improvement-driven `activate`. `restoreApplicationRevision(lifecycle, input)`
accepts `{application, operation, expectedHead, targetState, policy, evidence?,
causedBy?}`. The target must be a retained ancestor of the expected state.
The resulting child of the **current** revision copies only that ancestor's
entrypoint manifest references, with at least one actual change. Current
memory, schema, queries, views, runtime/evaluation policy, goals, capabilities,
entrypoint applicability, memory views and generation ceilings remain exact.
The epoch advances; no new intents are permitted. The ordinary unsettled
dispatch barrier, operation replay, expected-head check and custody still apply.
No historical head is installed, and effects or operation identities are never
rewound.

Every changed incumbent and historical manifest must contain only `input`,
`const`, builtin `fn` and `expr` cells. Fixed effectful harness manifests cannot
change. Both compiled interfaces must match exactly. Each normalized manifest
ceiling (`maxSteps`, `maxAgentCalls`, `maxWork`, `maxContextBytes`,
`maxOutputBytes`, `maxDepth`) must be no larger than the current manifest's.
An incompatible historical strategy is rejected, never silently adjusted.
The core lifecycle repeats these structural checks during commit and history
inspection, including when the caller supplies a custom trusted host.

The evidence is exactly one `algal.application-restoration.v1` record with
`application`, `parentState`, `targetState`, `candidateRevision`, and `policy`.
The closed policy record is `{contract:
"algal.application-restoration-policy.v1", application, mode:
"retained-pure-strategy-manifests"}`. The built-in policy host denies restoration
unless the host explicitly supplies this policy through `restorationPolicy` in
`createApplicationPolicyHost`. Native hosts use `set_restoration_policy`; the
CLI uses `application --policy host.json --restoration-policy restore-policy.json
restore input.json`. The policy named by the evidence must equal that host
option. Merely putting a policy into CAS grants no authority. Ordinary pure
case evaluation and activation remain unchanged; restoration never fabricates
an improvement verdict. Retained history and namespace bounds still apply.

## Comparing alternatives

`produceApplicationComparison(store, input, runtime)` joins several
`algal.application-evaluation.v1` records — each produced by the ordinary
serial incumbent-versus-candidate evaluator — into one retained
`algal.application-comparison.v1` record. The input names `{application,
parentState, entrypoint, environment, evaluations, selected}`. Every cited
evaluation is re-verified against the exact parent state, its request must
carry the named `environment` label and entrypoint, and all requests must
share the same `cases`, `scorer`, and `policy` — a comparison never mixes
measurement sets or environments.

Each result row records the candidate `revision`, the `manifest` that revision
selects for the entrypoint, the `evaluation` reference, and the reproduced
`verdict`. Results are sorted by revision digest with unique revisions,
manifests, and evaluations, bounded at 8. `selected` is either null or the
manifest of a row whose reproduced verdict is `accepted`: a rejected or
incomplete alternative is retained evidence, never a selection. The record
itself grants no authority — activation still requires the reproduced accepted
evaluation and its coverage checks, and restoration still requires the
explicit host restoration policy.

`verifyApplicationComparison(store, ref, expectedParentState, runtime)`
replays every cited evaluation and requires the recomputed record to equal the
stored record byte-for-byte. When an `activate`, `migrate`, or `restore`
commit cites a comparison as evidence, the default policy host replays it the
same way against the commit's parent state and additionally requires the
record to name the committing application and that parent state, the compared
entrypoint to exist in the committed revision, and `selected` to be exactly the
manifest the committed revision installs for that entrypoint. A comparison
minted elsewhere, measured against an earlier head, hand-built without its
evaluations, or one that selected nothing or another alternative cannot attach
to a transition that installs a different strategy. The `environment` label is
an application identifier (`^[a-z][a-z0-9._-]{0,63}$`). The native CLI exposes
`application compare input.json` with `{application, parentState, entrypoint,
environment, evaluations, selected}` and `application verify-comparison
input.json` with `{comparison, expectedState}`. This is the beginning of
environment-attributed procedure retention: several strategies measured under
the same frozen set can be kept, compared, and cited, while authority stays
with the ordinary admission checks.

## Generating proposals

`proposeApplicationRevision(lifecycle, input, runtime)` runs a designated
*generator* entrypoint of the incumbent revision case-pure and commits a
`propose` transition. The input names `{application, operation, expectedHead,
generator, target, arguments, output, policy}` plus optional `environment`,
`evidence`, and `causedBy`. The generator and target must both be entrypoints
of the incumbent revision; the generator manifest must contain only `input`,
`const`, builtin `fn` and `expr` cells and must declare an interface whose
`output` names the cell port carrying the emitted manifest list. `arguments`
is the digest of a CAS object keyed by the generator's interface input names,
and `policy` must equal the incumbent revision's `evaluationPolicy`.

The frozen `algal.application-proposal-request.v1` record is stored before
the run, so the generation input survives independently of its outcome. The
retained `algal.application-proposal.v1` records the request, the incumbent
revision, both entrypoints, the generator manifest, and the run receipt under
`status` `"generated"` or `"failed"`. A generated proposal carries sorted,
unique candidates — at most 8 — each `{manifest, revision}` where `revision`
is an ordinary child of the incumbent differing only at the target
entrypoint's manifest. Because a candidate only swaps one manifest reference,
it can never widen schema, capabilities, budgets, or authority. A failed
proposal carries bounded reasons (`generator-<outcome>`, `budget-exhausted`,
`no-candidates`, `candidate-bound`, `invalid-candidate`, `impure-candidate`,
`duplicate-candidate`) and an empty candidate list; a bad candidate fails the
whole proposal — the receipt and reasons are retained evidence, never
silently dropped.

`verifyApplicationProposal(store, ref, expectedParentState, runtime)`
re-derives the verdict from the retained receipt: the receipt must replay
bit-for-bit against the generator manifest and bound arguments, and the
recomputed record must equal the stored record byte-for-byte. Commit and
retained-history inspection repeat the structural binding — exactly one
proposal record naming this application, parent state, and incumbent
revision — without replay, including under custom trusted hosts. A `propose`
transition cannot change revision or memory and cannot carry intents, so a
candidate stays an unselected CAS value until an ordinary `activate` carries
its reproduced accepted evaluation. The native CLI exposes `application
propose input.json` and `application verify-proposal input.json` with
`{proposal, expectedState}`.

## Environment-keyed selection

An `algal.application-selection-policy.v1` record maps an environment label
to the manifest a retained comparison selected for one entrypoint at one
parent state. The closed record names `{contract, application, parentState,
entrypoint, selections}` where `selections` holds 1..16 rows of
`{environment, comparison, manifest}` sorted unique by environment. The
policy is pure data: storing it grants no authority, and it can never attach
to a `migrate` transition.

Authority comes from the host, not the record. `createApplicationPolicyHost`
accepts `selectionEnvironment` — like `restorationPolicy`, it is host
authority outside the admitted `algal.application-host.v1` policy record and
is not part of `algal.host-admission.v2`. Native hosts use
`set_selection_environment`; the CLI uses `application --policy host.json
--selection-environment ENV commit input.json`. A host that never names an
environment denies any commit citing a selection policy.

When an `activate` or `restore` commit cites a selection policy, the policy
host replays it in full: `verifyApplicationSelectionPolicy` re-verifies every
cited comparison against the policy's parent state and requires each
comparison to name the same application and entrypoint, the row's
environment, and to have selected exactly the row's manifest.
`selectApplicationStrategy(store, policyRef, environment,
expectedParentState, runtime)` then resolves the single row for the host's
environment; a policy with no row for that environment denies the commit.
Finally, the committed revision's manifest at the policy's entrypoint must
equal the selected manifest — a policy can only narrow which accepted
alternative is installed, never substitute for the reproduced accepted
evaluation coverage checks. The native CLI exposes `application select
input.json` with `{policy, environment, expectedState}`.

A resolved row can also be retained as an `algal.application-selection.v1`
record naming `{contract, application, parentState, entrypoint, environment,
policy, comparison, manifest, revision}` — closed like every application
record. `produceApplicationSelection(store, {policy, environment,
expectedParentState}, runtime)` replays the policy's row for `environment`,
takes the selected manifest's `accepted` comparison result, and stores the
candidate `revision` that result measured. `verifyApplicationSelection(store,
ref, expectedParentState, runtime)` re-resolves the row and requires the
recomputed record to equal the stored one byte-for-byte. The record is pure
evidence like the policy it cites: it grants no authority and is replayed in
full before any use. The native CLI exposes `application select-record
input.json` with `{policy, environment, expectedParentState}` and
`application verify-selection input.json` with `{selection, expectedState}`.

## Joining promotion evidence

An `algal.application-experiment.v1` record joins the whole promotion
evidence chain — proposals, evaluations, an optional comparison, an optional
selection policy, and an optional retained selection — for one application,
one parent state, one entrypoint, and one environment. The closed record
names `{contract, application, parentState, entrypoint, environment,
proposals, evaluations, comparison, selectionPolicy, selection, result}`,
plus `budget` when the experiment cites a habitat budget account (below):
`proposals` and `evaluations` are sorted-unique reference lists bounded at 8
each with at least one record total; `comparison`, `selectionPolicy`, and
`selection` are nullable references; `result` is `{promoted, revision}` where
`promoted` requires a non-null `revision`, and a `selection` requires a
`selectionPolicy`.

`produceApplicationExperiment(store, input, runtime)` replays every cited
record against the exact parent state before minting — nothing is trusted
from the citation list alone. Each proposal must name this application and
target entrypoint, target this head's incumbent revision, and be anchored to
the parent state or — when the `propose` transition committed first — to its
immediate predecessor; the frozen proposal request must carry the experiment
environment. Each evaluation must name this parent state, entrypoint, and
environment; all evaluation requests share one frozen `cases`/`scorer`/
`policy` set; and when proposals are cited, every measured candidate must be
one a cited proposal emitted. A cited comparison must bind the same fields
and join exactly the cited evaluations — nothing more, nothing less. A cited
selection policy must serve the experiment environment through exactly the
cited comparison. A cited selection must resolve under the cited policy and
comparison and must name a candidate the cited proposals emitted.
`result.revision` names the candidate the evidence selects — the selected
row's revision when a comparison or selection is cited, otherwise an
accepted candidate — and `result.promoted` is the producer's claim that an
activation actually committed it.

Minting an experiment never performs an activation. An experiment that
selected nothing, or selected a candidate that was not promoted, remains
valid retained evidence. `verifyApplicationExperiment(store, ref,
expectedParentState, runtime)` re-verifies the entire chain and requires the
recomputed record to equal the stored one byte-for-byte. When the default
policy host is offered an experiment as `activate`/`migrate`/`restore`
evidence it replays it the same way against the commit's parent state and
additionally requires the record to name the committing application and
that parent state, the experiment's entrypoint to exist in the committed
revision, and `result.revision` to be exactly the committed revision —
an experiment that selected nothing, or another candidate, cannot attach to
a transition installing a different strategy. Experiment evidence is
supplementary: it never substitutes for the reproduced accepted-evaluation
coverage checks, and it cannot attach to a `propose` transition, which
still requires exactly one proposal record. The native CLI exposes
`application experiment input.json` with the join fields and `application
verify-experiment input.json` with `{experiment, expectedState}`.

A host can charge an experiment's evaluations to one
[habitat budget](foundry.md#habitat-budget) account with activity
`experiment`: `evaluateApplicationRevision(store, input, runtime, {account})`
in TypeScript, or `application evaluate input.json --budget <file>` in the
native CLI, where the file holds limits `{work, attempts, runs}` for a new
account or a complete `algal.habitat-budget.v1` record to continue. Every
incumbent, candidate, and holdout run reserves its declared ceiling before
it starts and is charged what its receipt records. The evaluation record, its
foundry report, and their digests are the same with or without an account.
When a reservation does not fit, no evaluation is stored, and the native
command prints the exhausted account and exits with status `1`; otherwise it
adds the updated account to its output as `budget`. A record continues only
while every listed run still matches its manifest and receipt, and an
exhausted record cannot continue.

The experiment may cite the stored account as `budget`, a record digest. The
account must be complete, have activity `experiment`, and charge exactly the
cited evaluations' runs: each evaluation's runs together in report order,
with the evaluations in any order, and every ceiling and charge matching its
manifest and receipt. Charging proposal generation to the account is
proposed. Experiments without `budget` keep their bytes and digests.

## Deterministic lineage

`ApplicationService.lineage(application)` — and `algal application lineage
<name>` on both CLIs — projects validated retained history to one row per
committed state in genesis→head order: `{sequence, kind, operation, revision,
memory, evidence, causedBy}`. The projection is a pure read over the same
bounded `history()` pass — it stores nothing, acquires no admission
authority, and emits `[]` for an absent application — so both runtimes emit
byte-identical JSON for the same application files.
