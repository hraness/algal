# Context history records

These additive records identify a captured history, its permitted audience,
and summaries that help a reader navigate it. Original text remains in
[`algal.agent-context-entry.v1`](agent-context.md) records and their ordered
`algal.agent-context.v1` snapshots. A history contains references and metadata,
not another store of source bodies. A displayed summary is a reading aid,
not a logical premise or an accepted application observation.

The contract lives in `src/context-history-contract.ts` and
`crates/algal/src/context_history_contract.rs`. Both implementations use the
[shared synthetic vectors](../../scripts/fixtures/context-history.json).
The vectors identify canonical records and include malformed, resource-limit,
current-source-selection, and scope-revocation refusals.

## Status and limits

Phase 1 supplies parsers, identity helpers, and pure cross-record and
host-side refusal validation. It supplies no reader, selector, storage driver,
permission registry, revocation engine, scheduler, inference, or summary
publication operation. The host obligations below are required for a Phase 2
reader, not enforcement performed by a Phase 1 parser.

Existing context records, capability classes, receipts, application schemas,
and capacities are unchanged. Application memory keeps its 128 observation
slots, 64 hypothesis slots, and 128 archive-link limit. These records cannot
enter `MemoryObservation.claims`, accept an archived observation as current,
change a task grant, extend retention, or bypass normal source admission.

## Values and limits

Every key shown in a shape is required. Unknown keys are rejected at every
object level. Nullable fields must be present as `null` when unused. Arrays
are ordered; they are not sorted by content hash. Digests use
`sha256:` followed by 64 lowercase hexadecimal digits. In the shapes below,
`D` means such a digest and `Id` means an application identifier matching
`[a-z][a-z0-9._-]{0,63}`.

All strings must contain valid Unicode. Text is preserved without Unicode
normalization, including a leading byte-order mark and control characters.
Limits measure UTF-8 bytes. Canonical identity uses ordinary ALGAL canonical
JSON, not the input's whitespace or key order. Integral JSON numbers such as
`1.0` and zero written as `-0` normalize to the same canonical number. Integers
must be nonnegative, safe, and within their field's limit; coercion is refused.

Foreign TypeScript values pass through `boundedJsonSnapshot` before parsing.
Sparse arrays, getters, non-enumerable properties, symbols, custom prototypes,
`toJSON`, cycles, and non-JSON values are rejected rather than executed or
silently discarded. This is a data check, not isolation from same-realm Proxy
traps. Native callers supply parsed `serde_json::Value`; invalid Unicode is
refused by JSON decoding before these parsers run.

| Resource | Maximum |
| --- | ---: |
| Leaves per captured epoch | 1,024 |
| Original entry text | 1,048,576 bytes |
| Original source text per captured epoch | 8,388,608 bytes |
| Original label | 128 bytes |
| Internal summary nodes | 1,023 |
| All tree nodes, including leaves | 2,047 |
| Binary range depth, `log2(end - start)` | 10 |
| Epoch identities in one host-selected history chain | 128, numbered 0 through 127 |
| Logical positions in that chain | 131,072 |
| Generation and access-revision counter | 0 through 4,095 |
| History metadata, canonical JSON | 2,097,152 bytes |
| A leaf descriptor or node descriptor, canonical JSON | 2,048 bytes |
| Summary body text | 16,384 bytes |
| Summary record, canonical JSON | 32,768 bytes |
| Job request / result, canonical JSON | 4,096 / 2,048 bytes |
| Generation index, canonical JSON | 262,144 bytes |
| Cursor, canonical JSON | 2,048 bytes |
| View, canonical JSON, including cursor and counters | 65,536 bytes |
| Items per view | 128 |
| Grant or current-access descriptor, canonical JSON | 16,384 bytes |
| Capability reference, canonical JSON | 512 bytes |
| Queued requests | 1,023 |
| Queue record, canonical JSON | 131,072 bytes |
| Queue record plus every queued request, canonical JSON | 524,288 bytes |
| Jobs in one maintenance batch | 32 |
| Total planned queue/rebuild work | 67,108,864 units |

A record's initial JSON check also limits container depth to 8, values to
16,384, members of any object or array to 2,047, and escaped string contents
to 393,216 bytes. Record-specific checks then apply the smaller limits above.
The original snapshot proof keeps its existing 262,144-byte ceiling. An
original entry proof allows at most `6 * 1,048,576 + 2,048` encoded bytes,
so legal control-character text does not reduce the existing text capacity.
The larger history metadata ceiling likewise accommodates 1,024 maximally
escaped 128-byte labels without enlarging the source allowance.

Raw text fitting its limit is insufficient when its encoded record exceeds
another limit. Quotes, backslashes, escapes, keys, digests, punctuation,
counters, and continuations count. In particular a 6,000-byte NUL summary
body exceeds the 32,768-byte encoded summary limit. Queue accounting includes
both the reference frame and request records. Count ceilings do not promise
that all records fit a smaller byte or work allowance.

## Capture and original references

```text
Scope = {application: Id, realm: Id, workspace: Id, task: Id, audience: Id}
Leaf = {position: integer, event: D, sourceIndex: integer, entry: D,
        bytes: integer, kind: "instruction" | "input" | "observation" | "output",
        label: string}
History = {schema: "algal.context-history.v1", scope: Scope, head: D,
           snapshot: D, epoch: integer, firstPosition: integer, leaves: Leaf[]}
```

`head` identifies the captured authoritative owner head. `snapshot` identifies
an unchanged exact-context snapshot. `sourceIndex` addresses that snapshot;
`entry` addresses the unchanged original entry body. `event` identifies the
owner's source event separately from its content. Distinct events may have
identical original bodies. Repeating an event or snapshot index in one history
is invalid. Reusing an entry digest with different byte length, kind, or label
is also invalid.

`position` is the host-established chronological position in the scoped,
selected history, not the digest's sort position or a file modification time.
Positions form the consecutive interval beginning at `firstPosition`, and
`firstPosition + leaves.length <= 131072`. A nonempty position is at most
131071; an empty epoch may begin at 131072. Snapshot indices need not follow
chronological order. The owner must prove the mapping from its logical event
order to this selected catalog; a parser cannot authenticate that mapping.

The scope, audience, selection, chronology, captured head, snapshot, and epoch
all contribute to the history digest. A different audience requires a different
history identity even when original body digests are identical. Empty and
single-leaf histories are valid.

`validateContextHistorySources(history, snapshot, entries)` receives original
stored entry records in **leaf order**, not snapshot order. It checks the
snapshot's digest, bounds and exact keys, each leaf's snapshot index and byte
length, and each original body's digest, UTF-8 text length, kind and label.
It does not fetch or write a record. Passing that check proves content
consistency, not current permission or the truth of a source statement.

A host may select separately limited epochs through its existing owner APIs.
It must check chain scope, chronology, non-overlap, event uniqueness across
epochs, the 128-epoch ceiling, and its storage and retention quotas. The
per-epoch snapshot ceiling stays at 1,024 entries and 8 MiB; this contract does
not turn an epoch chain into a larger active-memory snapshot. An epoch index
alone is not proof of an owner chain. A missing epoch must be reported as
unavailable, never presented as an empty or complete history.

## Source ranges have no publication dependency

```text
Node = {schema: "algal.context-history-node.v1", history: D,
        start: integer, end: integer, sources: D}
```

Ranges address **epoch-relative leaf offsets**, with an inclusive start and
exclusive end. They contain a positive power-of-two number of leaves, start
at a multiple of that number, and end no later than the captured leaf count.
A one-leaf node names an original leaf. An internal node's children are the
two aligned halves. There are `N - popcount(N)` internal nodes in a captured
prefix of `N` leaves, not 2,047 internal nodes. Total descriptor capacity is
`2 * N - popcount(N)`, at most 2,047.

For parsed history `H`, let `h = digestCanonical(H)`. A node's `sources` is:

```text
digestCanonical({schema: "algal.context-history-sources.v1", history: h,
                 leaves: H.leaves[start:end]})
```

This domain-separated value is an identity calculation over existing metadata,
not a new stored source-body format. `contextHistoryNode(H, start, end)` returns
this descriptor. `validateContextHistoryNode` checks the history and ordered
source-set identity. Node and source-set identity contain no summary, request,
result, generation, prompt, or publication reference. Creating or rebuilding
a summary cannot change a node digest. This prevents a job-to-range-to-job
identity cycle.

## Summaries, requests, and results

```text
Lineage = {history: D, node: D, sources: D, children: D[],
           prompt: D, policy: D, summarizer: D}
Summary = {schema: "algal.context-history-summary.v1", ...Lineage, body: string}
JobLimits = {maxSourceBytes: integer, maxInputBytes: integer,
             maxOutputBytes: integer, maxWork: integer, maxModelCalls: integer}
Request = {schema: "algal.context-history-summary-request.v1", ...Lineage,
           generation: integer, limits: JobLimits}
Usage = {inputBytes: integer, outputBytes: integer, work: integer,
         modelCalls: integer}
Result = {schema: "algal.context-history-summary-result.v1", request: D,
          status: "complete" | "failed" | "cancelled" | "uncertain" | "budget-exhausted",
          summary: D | null, receipt: D | null, usage: Usage,
          reason: null | "failed" | "cancelled" | "uncertain" | "budget-exhausted"}
```

A summary covers an internal node. `children` is either empty, meaning the
job uses originals, or contains exactly two distinct ordered child-summary
digests. Child summaries must cover the aligned halves, use the same captured
history and recipe, and retain their complete original source coverage.
Two-leaf blocks use originals; leaf-summary records are refused. Every
accepted dependency descends to a smaller internal range, so a validated
complete dependency set cannot contain a cycle.

`prompt`, `policy`, and `summarizer` identify explicit versioned host-selected
inputs. They do not select provider permissions or execute code. Summary
identity contains the exact body and lineage, but no request or result digest.
Request identity adds generation and finite job limits. Result identity adds
execution evidence and usage. These three identities are separate; publishing
a result neither rewrites a summary nor changes a range. Changing a source,
child body, prompt, policy, or summarizer changes the relevant derived identity.

Job limits are positive, capped at 65,536 original-source bytes, 131,072 encoded
input bytes, 32,768 encoded output bytes, 16,777,216 work units and one model
call. Reported usage may be zero and may not exceed the request. Direct jobs
check their original-text allowance. Child jobs check the canonical child-array
input size. The Phase 3 host must also limit and charge the **actual complete**
model input, including its prompt and original-record JSON escaping; Phase 1
cannot infer that encoded input from raw leaf byte lengths. Reading originals
for quality checks consumes the same source and work allowances.

A complete result requires a summary digest, an execution receipt digest and
`reason: null`. Its `outputBytes` equals the entire canonical summary record's
size, not only the body's raw length. An incomplete result has no summary and
its reason equals its status; its receipt may be absent as `null`. `uncertain`
requires one reported model call and is not a retry instruction. Receipts have
no wall-clock fields. A receipt reference is execution evidence, not provider
attestation or proof of summary quality. Actual receipt/request bindings,
idempotent completion, conditional publication and uncertain-effect recovery
belong to Phase 3 through the existing effect and work-account interfaces.

## Generation and work queue

```text
Generation = {schema: "algal.context-history-generation.v1", history: D,
              generation: integer, prompt: D, policy: D, summarizer: D,
              summaries: {node: D, summary: D}[]}
Queue = {schema: "algal.context-history-queue.v1", history: D,
         generation: integer, requests: D[], batchSize: integer, work: integer}
```

Generation entries have unique node and summary digests. They contain only
internal nodes and match the captured history, recipe and ordered child
lineage. `validateContextHistoryGeneration` joins the index to supplied node
and summary records, including all published dependencies. A publication index
is a disposable selection of derivatives, not source authority.

A queue has unique request digests and at most one request per source node.
Its planned `work` is the sum of each request's `limits.maxWork`, capped at
67,108,864. Canonical queue bytes plus all request records may not exceed
524,288. `batchSize` is 1 through 32; an empty queue has zero planned work.
`validateContextHistoryQueue` joins request identity, history, generation,
cardinality, bytes and cumulative planned work. Each request must separately
pass its source/child lineage checks before a Phase 3 host enqueues it.

These ceilings do not allocate new execution credit. Actual successful,
failed and maintenance work must debit the existing host work account.
Cancellation, a new generation or a resumed queue cannot reset that account.
No read triggers queue processing or compulsory inference.

## Views and captured continuations

```text
ReadLimits = {maxReadBytes: integer, maxScanBytes: integer,
              maxOutputBytes: integer, maxNodes: integer, maxWork: integer,
              maxSearchResults: integer}
Binding = {history: D, head: D, audience: Id, generation: D,
           policy: D, budget: D, selection: D}
Cursor = {schema: "algal.context-history-cursor.v1", binding: Binding,
          offset: integer}
Item = {kind: "exact", node: D, start: integer, end: integer, text: string}
     | {kind: "summary", node: D, start: integer, end: integer,
        summary: D, text: string}
     | {kind: "pending", node: D, start: integer, end: integer,
        reason: "missing-summary"}
     | {kind: "unavailable", node: D, start: integer, end: integer,
        reason: "source-unavailable" | "retention-expired" | "source-not-selected" | "revoked"}
View = {schema: "algal.context-history-view.v1", binding: Binding,
        limits: ReadLimits, start: integer, end: integer, items: Item[],
        status: "complete" | "incomplete" | "unavailable" | "budget-exhausted",
        reason: string | null, cursor: Cursor | null,
        usage: {readBytes: integer, scanBytes: integer, nodeVisits: integer,
                work: integer}}
```

Read limits are positive, capped respectively at 65,536, 8,388,608, 65,536,
2,047, 67,108,864 and 128. Reading and retention are different policies.
`budget` is the digest of the exact `ReadLimits`. `selection` identifies the
host's complete view-selection request, including any query, protected inputs,
recent-detail choice and relevance policy. Phase 2 must retain and check that
request; a digest alone cannot authenticate or reconstruct it.

`generation` identifies the captured generation record, not only its counter.
`head`, history selection, audience, generation, policy, request and budget
remain fixed across pages. A cursor contains no view digest, and the generation
contains no cursor, avoiding another identity cycle. The output cursor's
offset equals the page end. An input cursor's offset equals the next page
start, and its entire binding must match. Appending sources or rebuilding
summaries creates another identity; it cannot silently redirect a continuation.

Items form a gap-free, non-overlapping cover of the page's declared range.
Exact items contain an entire single original leaf, verified against its V1
entry digest and metadata. Summary items contain the exact published summary
body. An original too large for a page remains addressable through the Phase 2
exact reader and its slices; it is not silently truncated into an exact item.
Protected and relevance selections must account for the union once, splitting
ranges or referring to the same displayed item instead of duplicating bodies.
Reported read bytes cover at least every displayed body, node visits cover at
least every displayed item, and work covers at least those visits. The host
must additionally charge actual retrieval, scanning and validation work.

The reason sets are closed:

- `complete`: `null`; no pending/unavailable items or continuation, and the page
  reaches the captured tail. An empty complete history has an empty cover.
- `incomplete`: `page-limit`, `missing-summary`, `source-unavailable` or
  `cancelled`. A partial prefix retains a continuation.
- `unavailable`: `source-unavailable`, `retention-expired`, `source-not-selected`
  or `revoked`; no readable bodies. It does not claim omitted sources were read.
- `budget-exhausted`: `read-limit`, `scan-limit`, `output-limit`, `work-limit`
  or `protected-overflow`. An empty cover and a non-advancing cursor can be a
  diagnostic, never an instruction to loop under the same insufficient budget.

The full encoded view, including its limits, counters and cursor, must fit
`maxOutputBytes`. If even a diagnostic cannot fit, return a bounded
`BUDGET_EXHAUSTED` error outside the view rather than an oversized page.
`validateContextHistoryView` checks content and continuation consistency using
a supplied subset of generation records and its complete child dependencies.
It need not load unrelated summaries. This check does **not** authorize a read.

## Required host permission contract for Phase 2

```text
Grant = {schema: "algal.context-history-grant.v1", history: D, scope: Scope,
         indices: integer[], limits: ReadLimits}
Reference = {schema: "algal.context-history-ref.v1", history: D,
             capability: opaque context-history handle}
CurrentAccess = {schema: "algal.context-history-access.v1", history: D,
                 scope: Scope, head: D, snapshot: D, revision: integer,
                 indices: integer[], state: "active" | "revoked" | "unavailable"}
```

Indices are unique, increasing original snapshot indices, each below 1,024.
A grant's indices must belong to the captured catalog. Grant and current access
must bind the same history, complete scope including audience, captured head
and snapshot. `contextHistoryRef(grant)` constructs
`cap:context-history:<digestCanonical(grant)>`; it constructs an identifier,
**not a permission**. Existing `agent-context` handles are not interchangeable.

A Phase 2 host must provide these trusted operations, whatever names its API
uses:

1. Resolve the reference against the authenticated principal's admitted grant
   registry. Never restore or register permission from a serialized descriptor,
   handle, history, receipt or content hash alone. Keep registry counts finite
   under the existing host permission limits.
2. Resolve current source selection and retention from the authoritative
   application/realm/workspace/task owner. `CurrentAccess.head` is the captured
   prefix whose validity is being checked, not an assertion that it is the
   latest owner head. A later append can leave that prefix valid. `revision`
   identifies a finite host policy revision, not a clock or an access lease.
3. Check current revocation and selection before fetching or disclosing any
   original, summary, cached body **or metadata**. Recheck after asynchronous
   reads before disclosing data when permissions can change during the read.
   A node requires every contributing source in both the admitted grant and
   the current selection. A broad cached summary cannot be narrowed by filtering
   its citations. Whole-history inspection requires the entire catalog.
4. Limit the requested read budget to every admitted grant limit. Use
   `validateContextHistoryDelegation(grant, {...grant, limits: requested})`
   or equivalent pure checks. Delegation may narrow indices and limits but may
   not change history or any scope field, including audience. A different
   audience needs fresh owner admission and a different history identity.
5. Check the current derivative selection/invalidation policy separately from
   structural lineage. Corrections, withdrawal, retention expiry, working-space
   purge or revoked permission must invalidate affected derivatives and their
   ancestors. A captured generation does not keep an invalid derivative usable.
   Preserve the captured cursor binding and return pending/unavailable content
   or a diagnostic; do not expose the stale body or substitute a newer head.
6. Keep exact source reads separate from current logical-fact selection.
   Historical text can describe a withdrawn or corrected observation without
   making it current evidence. Only the existing application admission and
   decoder interfaces can accept claims. Summaries may guide a source-bound
   proposal but cannot mint observations, premises, tools or wider grants.

`validateContextHistoryAccess(history, reference, grant, current, node?)`
performs pure descriptor matching and all-descendant source-selection refusal.
Omitting `node` checks whole-history metadata permission. A revoked or
unavailable current selection denies both cached summary and metadata access;
the shared refusal vectors exercise both. The caller must obtain the grant
and current selection from the trusted operations above. Supplying a fabricated
`state: "active"` value to this pure function cannot replace those operations.
The function does not perform host I/O, enforce live revocation, authenticate
a principal, decide derivative freshness or grant new authority.

Permission failure must not reveal denied labels, source identities, summary
bodies or cached metadata. An unavailable-range item is permitted only when
its range metadata is independently authorized; otherwise return a generic
scope denial. Immutable stored originals and replay receipts do not promise
physical erasure. The host retains ownership of access, retention and recovery.

`validateContextHistoryViewAccess(history, generation, view, nodes, summaries,
authorization, inputCursor?)` joins structural view validation to the current
permission descriptors. `authorization` has exactly `reference`, `grant`,
`access`, and `request` fields; `request` is the digest of the host's saved read
request. Every displayed node, including pending and unavailable metadata,
must pass current descendant-selection checks, and all view limits must fit
the grant. Phase 2 readers must perform this join before serving a page.

`contextHistorySelection(grant, access, request)` hashes the canonical preimage
`{schema: "algal.context-history-selection.v1", grant: digestCanonical(grant),
access: digestCanonical(access), request}`. The resulting digest must equal
`view.binding.selection`. Changed access revisions, grants, or saved requests
therefore cannot reuse an earlier page binding. Hosts must resolve these inputs
from their registry and owner policy; this pure join does not authenticate them.

## Parser and validation API

TypeScript exports `ContextHistory*` types, `CONTEXT_HISTORY_BOUNDS`,
`CONTEXT_HISTORY_READ_CEILINGS`, `CONTEXT_HISTORY_JOB_CEILINGS`, and:

```text
parseContextHistoryRecord(unknown) -> ContextHistoryRecord
parseContextHistoryLeaf(unknown) -> ContextHistoryLeaf
parseContextHistory(unknown) -> ContextHistory
parseContextHistoryNode(unknown) -> ContextHistoryNode
parseContextHistorySummary(unknown) -> ContextHistorySummary
parseContextHistorySummaryRequest(unknown) -> ContextHistorySummaryRequest
parseContextHistorySummaryResult(unknown) -> ContextHistorySummaryResult
parseContextHistoryGeneration(unknown) -> ContextHistoryGeneration
parseContextHistoryCursor(unknown) -> ContextHistoryCursor
parseContextHistoryView(unknown) -> ContextHistoryView
parseContextHistoryGrant(unknown) -> ContextHistoryGrant
parseContextHistoryAccess(unknown) -> ContextHistoryAccess
parseContextHistoryRef(unknown) -> ContextHistoryRef
parseContextHistoryQueue(unknown) -> ContextHistoryQueue
contextHistoryDigest(unknown) -> Digest
contextHistoryNode(history: unknown, start: number, end: number) -> ContextHistoryNode
contextHistoryRef(grant: unknown) -> ContextHistoryRef
validateContextHistorySources(history, snapshot, originalEntries) -> void
validateContextHistoryNode(history, node) -> void
validateContextHistorySummary(history, node, summary, childSummaries) -> void
validateContextHistorySummaryRequest(history, node, request, childSummaries) -> void
validateContextHistorySummaryResult(request, result, summaryOrNull) -> void
validateContextHistoryGeneration(history, generation, nodes, summaries) -> void
validateContextHistoryView(history, generation, view, nodes, summaries, inputCursor?) -> void
contextHistorySelection(grant, access, requestDigest) -> Digest
validateContextHistoryViewAccess(history, generation, view, nodes, summaries, authorization, inputCursor?) -> void
validateContextHistoryQueue(history, queue, requests) -> void
validateContextHistoryAccess(history, reference, grant, current, node?) -> void
validateContextHistoryDelegation(parentGrant, childGrant) -> void
```

All validation inputs are `unknown`, including arrays, and are copied and
checked before use. Failure throws; there are no writes or effects. A source
proof supplies complete original records. A summary/request lineage check
supplies its direct children. A generation check supplies every indexed summary
and descendant; a view check may supply only the displayed summaries and their
complete dependencies. Node and summary arrays are capped at 2,047 and 1,023,
and duplicate records are refused.

Native exports the same names in snake case and the corresponding `MAX_*`
constants and ceiling tables. Inputs are `&Value`; validation returns
`Result<()>`. Capture, leaf, node and reference parsers return
`ContextHistory`, `ContextHistoryLeaf`, `ContextHistoryNode` and
`ContextHistoryRef` respectively. Other parsers return a fresh, checked,
normalized `Value`. Identity returns `Result<String>`, and node construction
uses `usize` offsets. Optional node/cursor/summary parameters use
`Option<&Value>`; an incomplete result supplies `None` rather than a summary.
Call these parsers at foreign-value boundaries instead of using derived
`Deserialize` alone, which cannot establish bounds, identity or permission.

The module is additive. Package exports, contract indexes, runtime integration
and delivery checks remain separate integration work. The focused validation
is `bun test src/context-history-contract.test.ts`,
`cargo test --locked -p algal --lib context_history_contract`, and
`cargo fmt --all -- --check`; run native commands through the host scheduler
when installed. Canonical replay establishes record identity and execution
consistency, not reader accuracy, provider truth, or a token/billing reduction.
