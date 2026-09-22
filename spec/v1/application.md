# Application state, evidence, and revision boundaries

This contract joins the organism VM, scoped memory, and durable host supervision.
It specifies local cooperating hosts using the retained SQLite custody protocol.
An application is not an operating-system sandbox, distributed consensus group,
or independently authenticated source of observations.

The executable record definitions are the closed parsers in
`src/application-contract.ts`, `application-memory.ts`,
`application-adaptation.ts`, `application-migration.ts`, and
`application-view.ts`, with corresponding native application modules. Unknown
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
memory and contains work. `activate` changes the revision under compatible
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
| `algal.application-memory.v1` | Selected observations, withdrawals, hypotheses, schema, scope, and predecessor |
| `algal.application-memory-derivation.v1` | Conditional query result bound to captured state, selected facts, program, engine, frontier, and admission |
| `algal.application-evaluation.v1` | Frozen evaluation request, foundry evidence, compatibility, and reproducible acceptance verdict |
| `algal.application-migration.v1` | Source snapshot, both revisions, pure migration program, producing receipt, and emitted claims |
| `algal.application-view.v1` | Bounded historical projection and state-fenced proposed actions |

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
Truncation never replaces source history. The native
`algal application report <view.json>` command renders a standalone passive HTML
workbench on stdout. It validates the supplied view's structure, escapes all
data, and performs no dispatch, provider call, or proof replay. Its labels do
not claim verification of the truth of observations.

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
| Memory observations / hypotheses | 128 / 64 |
| Evaluation cases / work / model calls | 32 / 1,000,000 / 16 |
| View history / action records | 128 / 32 |
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
