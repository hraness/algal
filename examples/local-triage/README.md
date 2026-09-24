# Local triage

A useful bounded second ALGAL application: keep up to **32 tasks**, edit their
titles and priorities, complete/reopen them, filter the list, and evolve its
ordering, grouping and reopening policy. Schema v2 adds editable categories.
Task facts survive a workflow revision and a real core memory migration.

The host uses `ApplicationService` for conditional durable transitions and
`ApplicationMemoryService` for admitted task claims. ALGAL expression programs
produce the presentation, action availability, updates, claims and migration.
There is no external effect dispatcher or capability grant. The local Bun host
is independently runnable; native/reference parity qualifies the pure programs,
not a claim that this example's TypeScript host is implemented in Rust.

## Run the CLI

From the repository root, with Bun installed:

```sh
bun examples/local-triage/run.ts /tmp/my-triage my-triage init
bun examples/local-triage/run.ts /tmp/my-triage my-triage capture
bun examples/local-triage/run.ts /tmp/my-triage my-triage operation add-first
```

Every response is JSON. `capture` returns a coherent head/revision/memory,
authoritative tasks, typed form/filter/action tree, ordering explanations and
remaining task/state capacity. Pass an optional session JSON file to `capture`
to filter the presentation or render a draft. Filters and draft fields never
write task facts.

Save a command JSON file with the head from `capture` and digest from
`operation`:

```json
{
  "contract": "algal.triage-command.v1",
  "expectedHead": "sha256:<the captured head's 64 hex digits>",
  "operation": "sha256:<the operation's 64 hex digits>",
  "action": {
    "kind": "add",
    "task": {
      "id": "review-proposal",
      "title": "Review the proposed workflow",
      "priority": "high",
      "status": "open",
      "category": "inbox"
    }
  }
}
```

```sh
bun examples/local-triage/run.ts /tmp/my-triage my-triage command command.json
```

Additional actions are:

- `{"kind":"edit","taskId":"review-proposal","title":"Updated title","priority":"normal","category":"inbox"}`
- `{"kind":"complete","taskId":"review-proposal"}`
- `{"kind":"reopen","taskId":"review-proposal"}`

Retrying the identical command returns its original committed head. Reusing an
operation for different content fails. A stale head fails; recapture and review
the intended edit before issuing a new operation. Priority is `high`, `normal`
or `low`; task IDs are stable lowercase identifiers. New tasks start open.
Schema v1 accepts only the `inbox` category.

## Evolve and migrate

Use `propose-evaluate proposal.json` with:

```json
{
  "contract": "algal.triage-proposal.v1",
  "expectedHead": "sha256:<the captured head's 64 hex digits>",
  "schemaVersion": 2,
  "config": { "sort": "title", "group": "category", "allowReopen": true },
  "source": "owner",
  "rationale": "Group work by category while retaining every task."
}
```

The response includes an evaluation reference, independently derived checks,
pure execution receipts, the unchanged authoritative `capture`, and a separate
`preview`. `source:"model"` has the same admission rules as owner input. This
API accepts a bounded proposal from an inference adapter; it never trusts a
model's assertion of improvement and makes no provider call itself.

```sh
bun examples/local-triage/run.ts /tmp/my-triage my-triage adopt EVALUATION_DIGEST OPERATION_DIGEST
```

Adoption rechecks the exact base and evidence. Same-schema revisions preserve
the memory reference. The v1→v2 transition executes
`migrateApplicationMemory`, retains the original snapshot and producing receipt,
and admits migrated claims under the new schema. It adds `category="inbox"`
without changing existing task fields. Downgrades and unchanged proposals are
rejected. Sorting choices are `priority`, `title`, `created`; grouping choices
are `none`, `status`, `priority`, `category` (v2). Text search and case-insensitive
title sorting use the evaluator's documented ASCII case mapping. Created order
means retained insertion order; other equal sort keys use task ID order.

These checks establish bounded compatibility and data preservation. They do
not establish that a workflow improves productivity. An owner still chooses
whether to adopt a compatible candidate.

## Retain drafts across restart

`load-session desktop` loads a named session independently of authoritative
facts. `save-session desktop save.json` takes:

```json
{
  "expectedSession": null,
  "capturedHead": "sha256:<the captured head's 64 hex digits>",
  "session": {
    "contract": "algal.triage-session.v1",
    "filter": "all",
    "query": "",
    "draft": { "taskId": null, "title": "An unsubmitted thought", "priority": "normal", "category": "inbox" },
    "focusedField": "title"
  }
}
```

Subsequent saves provide the returned session reference as `expectedSession`.
An atomic host lease and compare-and-set reject overwriting a newer draft.
State changes mark the retained session `stale`, with an explanation; the draft
is not cleared. A renderer must recapture, reconcile the draft and explicitly
save against the new head. Missing tasks, incompatible category drafts, corrupt
files and stale submission heads fail closed. Session files live separately in
`DIRECTORY/triage-sessions/APPLICATION/SESSION/session.json`; they are not
included in portable exports or forks. The host contract retains focus intent;
renderer focus/IME behavior needs renderer-specific tests.

## Export, fork and merge

```sh
bun examples/local-triage/run.ts /tmp/my-triage my-triage export triage.json
bun examples/local-triage/run.ts /tmp/my-triage my-triage verify triage.json
bun examples/local-triage/run.ts /tmp/my-triage my-triage fork triage.json experiment
bun examples/local-triage/run.ts /tmp/my-triage experiment capture
```

An export contains bounded immutable CAS records and a retained state chain.
Verification reconstructs the lifecycle and replays pure execution receipts,
including migration and fork ancestry. Its claim is content integrity and pure
replay, not authorship or authenticated custody. Keep an expected head outside
the export when comparing against an independently retained identity.

`import triage.json` verifies and stores immutable content, returning a transfer
reference. Identical imports are idempotent. Import does not adopt facts or
create the source application's mutable head. `fork` creates a **new application
identity**, preserves tasks/configuration, and records the source. It copies no
session drafts, operation custody, provider ledger, credentials or dispatch
authority. The new local application has its own host custody and operation
history.

After editing either branch, export/import its transfer and run:

```sh
bun examples/local-triage/run.ts /tmp/my-triage my-triage review-merge CURRENT_HEAD TRANSFER_DIGEST
bun examples/local-triage/run.ts /tmp/my-triage my-triage adopt-merge REVIEW_DIGEST resolutions.json OPERATION_DIGEST
```

Merge uses a retained common ancestor. Independent field edits combine; edits
to the same field produce explicit `{taskId,field,base,local,incoming}` conflicts.
Resolve **every** conflict once with `[{"taskId":"...","field":"title","value":"Owner-selected title"}]`.
No conflict is silently resolved by timestamp or arrival order. Adoption checks
the exact local head and preserves the incoming branch and evidence. Unrelated
histories remain separate and inspectable. Schema versions must match before
merge. This bounded application has no task deletion, so no deletion conflict
rule is implied.

The app exposes remaining space: 32 tasks and 128 lifecycle states per
identity. An export is limited to 1,024 records and 8 MiB; fork ancestry is
limited to eight generations. Bounds fail explicitly without truncating data.
Export/fork into a fresh identity is available when further state capacity is
needed; it does not erase the retained original history.

## Evidence

```sh
bun test examples/local-triage/host.test.ts --timeout 30000
bun examples/local-triage/parity.ts
```

Tests exercise exact-head commands and retries, full task capacity, durable
restart, session conflict/rebase/corruption, independent proposal rejection,
actual core migration and offline replay, portable import, authority-free forks,
field conflicts and explicit merge adoption. Parity compares **19 complete
native/reference receipts** and **38 cross-runtime offline verifications** over
forms, actions, filters, sorting, grouping, claims and migration. Run with
`ALGAL_BIN=/path/to/algal` to select an already-built native CLI.
