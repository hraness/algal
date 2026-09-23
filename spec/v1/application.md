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

1. An existing operation `K` with the same request returns its committed result,
   even after the head has advanced. A different request under `K` is rejected.
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
| `algal.application-migration.v1` | Source snapshot, both revisions, pure migration program, producing receipt, and emitted claims |
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

Migration is a pure, bounded transformation of the source observation
projection. Its replay must reproduce the exact arguments and emitted claims.
Withdrawn observations and hypotheses do not become fresh observations merely
by being present in a historical snapshot. A changed schema starts a new memory
chain and retains the old snapshot through explicit migration evidence.

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
| Fresh dispatch batch / pending scan | 32 / 128 |
| Durable channel outcomes / channel file | 4,096 / 1,048,576 bytes |
| Active memory observations / hypotheses | 128 / 64 |
| Retained memory archive segments | 128 |
| Evaluation cases / work / model calls | 32 / 1,000,000 / 16 |
| Comparison results | 8 |
| Proposal candidates / reasons | 8 / 16 |
| Selection policy rows | 16 |
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
