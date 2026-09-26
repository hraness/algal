# Shared program catalog

This catalog lists the pure ALGAL programs that files in more than one project
call, with the digests, interfaces, and callers that a test checks.

Each entry is one `.algal` file in this repository. A project uses it through a
relative import, loaded with a source root wide enough to reach the file, so
every caller runs the same compiled program. A project elsewhere can
[copy an entry](#vendor-an-entry-into-another-project) from this page; there
is no package server, registry lookup, or automatic upgrade.
Inclusion says nothing about whether keeping and composing programs improves
later work. That question is the open
[cumulative-skill experiment](vision.md#what-would-justify-the-claim).

## What an entry has

- **Pure behavior.** It declares `max_agent_calls: 0`, and nothing it calls can
  call a model. Source programs have no syntax for host functions or tools, so
  an entry needs neither.
- **Pinned identity.** Its executable digest, a SHA-256 hash of the compiled
  program, and the digest of its resolved interface match a fresh compile of
  its file. Every calling project compiles that file to the same digests, and
  no other file reachable from a listed entry point compiles to the same
  executable digest.
- **Callers in two projects.** Files in at least two projects call it, and its
  caller list names every file that calls it from the entry points listed
  below.
- **Listed dependencies.** Every program it calls is also an entry.
- **Tests.** Its success and failure cases run in the listed test files.
- **Unseen cases.** It can pin the digest of a case file kept outside the
  repository, which a comparison of a revision must run.
- **Revision status.** Its status gives the digest it was listed at, or the
  digest it was revised from and the record of the
  [comparison](#revise-a-listed-program) that allowed the change.
- **Evidence, when pinned.** An entry can name the records that justify it,
  each as a file under the projects directory pinned with the digest of its
  canonical JSON. The catalog test reads every pinned record: a comparison
  must have passed and must end the entry's listed digest, or move the entry
  to it as a dependent. A record the test cannot read, parse, or justify, or
  a record kind it does not know, is a problem rather than a pass.

`bun test src/library-index.test.ts` recompiles every entry and every calling
project, and fails when a digest, interface, compiler version, dependency, or
caller on this page stops matching the source, or when a digest changes
without a passing comparison record. The same file runs the success and
failure cases described below. The native parity suite runs the entry points
listed below in the TypeScript and Rust runtimes and checks that each
runtime verifies the other's results.

## Calling projects

A project is one directory under `examples/source/projects`. Paths on this
page are relative to that directory, which is also the source root a project
needs to import another project's files. The check builds the
[dependency report](source-language.md#inspect-project-dependencies) of each
entry point below and collects every file that calls a listed program.

| Entry point | Source root | Purpose |
| --- | --- | --- |
| [`task-planning/main.algal`](../examples/source/projects/task-planning/main.algal) | `examples/source/projects/task-planning` | Propose the next action for up to 16 tasks. |
| [`task-planning/inspect_task.algal`](../examples/source/projects/task-planning/inspect_task.algal) | `examples/source/projects/task-planning` | Explain one task's score against a readiness threshold. |
| [`support-queue/main.algal`](../examples/source/projects/support-queue/main.algal) | `examples/source/projects` | Assign up to eight support tickets to a response queue. |
| [`message-log/main.algal`](../examples/source/projects/message-log/main.algal) | `examples/source/projects` | Project a message feed from an event log: edits, retracts, marks, and threads. |
| [`message-log/thread.algal`](../examples/source/projects/message-log/thread.algal) | `examples/source/projects` | View one post's thread members, flags, and last edit. |
| [`ballot-box/main.algal`](../examples/source/projects/ballot-box/main.algal) | `examples/source/projects` | Tally a ballot box after last-wins corrections, with spoiled ballots flagged. |
| [`ballot-box/ballot.algal`](../examples/source/projects/ballot-box/ballot.algal) | `examples/source/projects` | View one ballot's original and current pick and the ballots sharing it. |

The [task planner](../examples/source/projects/task-planning/README.md) has two
entry points in one project. The
[support queue](../examples/source/projects/support-queue/README.md) is a
separate project that imports the planner's files with `../` paths, so it
loads under the wider root:

```sh
bun cli.ts run examples/source/projects/support-queue/main.algal \
  --source-root examples/source/projects \
  --args examples/source/projects/support-queue/main.args.json
bun cli.ts dependencies examples/source/projects/support-queue/main.algal \
  --source-root examples/source/projects --format text
```

Without `--source-root`, loading stops with
`import escapes the source project root`. SDK callers pass the same directory
as `loadSourceProject(entry, { root })`.

Each entry point has a case list beside it, named for the entry point:
[`task-planning/main.evaluation.json`](../examples/source/projects/task-planning/main.evaluation.json),
[`task-planning/inspect_task.evaluation.json`](../examples/source/projects/task-planning/inspect_task.evaluation.json),
[`support-queue/main.evaluation.json`](../examples/source/projects/support-queue/main.evaluation.json),
[`message-log/main.evaluation.json`](../examples/source/projects/message-log/main.evaluation.json),
[`message-log/thread.evaluation.json`](../examples/source/projects/message-log/thread.evaluation.json),
[`ballot-box/main.evaluation.json`](../examples/source/projects/ballot-box/main.evaluation.json),
and [`ballot-box/ballot.evaluation.json`](../examples/source/projects/ballot-box/ballot.evaluation.json).
Each names the entry point's fixture as a case in the format
[`lock --evaluation`](source-language.md#pin-a-project-with-a-lock) reads, with
file paths relative to the entry point's source root. A comparison of a
revised entry runs these cases.

## Programs

Each interface lists inputs and outputs in name order. When the compiled
program checks a JSON value's type, that type follows in parentheses. A called
program's steps, work, and nesting count against its caller's run; a child's
declared budget adds no separate allowance.

### `clamp`

- **Path:** [`task-planning/lib/clamp.algal`](../examples/source/projects/task-planning/lib/clamp.algal)
- **Executable digest:** `sha256:e0023e6a72961ff823b468d357572507305652cd0a5e9a31648550684db0cb3a`
- **Interface digest:** `sha256:29003b41a670ba9a680ccb6f6346b88f2c9d50bd8aa73a8f1570ac00007d88a9`
- **Interface:** inputs `maximum: json`, `minimum: json`, `value: json`; outputs `result: json`.
- **Depends on:** None.
- **Inputs and result:** `value` is the value to constrain, and `minimum` and
  `maximum` are inclusive bounds. The result is `minimum` when `value` is below
  it, `maximum` when `value` is above it, and `value` otherwise.
- **Rejected inputs:** Each comparison needs two numbers or two strings. Any
  other pair, including the `null` of a missing field, fails the run with
  `EXPR_FAILED` at the clamp call. `maximum` is compared only when `value` is
  not below `minimum`. The bounds are not checked for order: when `minimum` is
  greater than `maximum`, the result is `minimum` for a smaller value and
  `maximum` for any other.
- **Limits:** One expression with no lists or loops, so each call takes the same
  number of steps. A caller declares `max_depth` of at least 1. Strings compare
  by UTF-16 code units; every listed caller passes numbers.
- **Callers:** [`task-planning/score_task.algal`](../examples/source/projects/task-planning/score_task.algal)
  (twice), [`task-planning/inspect_task.algal`](../examples/source/projects/task-planning/inspect_task.algal),
  and [`support-queue/triage_ticket.algal`](../examples/source/projects/support-queue/triage_ticket.algal).
- **Tests:** [`src/library-index.test.ts`](../src/library-index.test.ts),
  [`examples/source/projects/task-planning/project.test.ts`](../examples/source/projects/task-planning/project.test.ts),
  and [`examples/source/projects/support-queue/project.test.ts`](../examples/source/projects/support-queue/project.test.ts).
- **Compiler:** `algal.source.profile.v1`, version `1.6.0`.
- **Maintainer:** ALGAL maintainers, through pull requests to [hraness/algal](https://github.com/hraness/algal).
- **Unseen cases:** None pinned.
- **Status:** Listed at `sha256:e0023e6a72961ff823b468d357572507305652cd0a5e9a31648550684db0cb3a`.

### `score_task`

- **Path:** [`task-planning/score_task.algal`](../examples/source/projects/task-planning/score_task.algal)
- **Executable digest:** `sha256:10ee90055c33b6d21956fff7a53e4e34a3f5074c16298dc83d452bedf9c0d0d0`
- **Interface digest:** `sha256:25e5b2ef71f6aebd9f9025930a9c140433d56cc0668b0eebca3d109e954de21a`
- **Interface:** inputs `task: json`, `weights: json`; outputs `result: json` (number).
- **Depends on:** [`task-planning/lib/clamp.algal`](../examples/source/projects/task-planning/lib/clamp.algal), called twice.
- **Inputs and result:** `task` is a record with numeric `urgency` and `impact`
  fields. Other fields are ignored, so a support ticket works as well as a
  task. `weights` is a record with numeric `urgency` and `impact` weights. The
  program clamps urgency and impact to 0 through 5, multiplies each by its
  weight, and returns the sum.
- **Rejected inputs:** A missing or non-numeric `urgency` or `impact` fails the
  run with `EXPR_FAILED` in its clamp call. A missing or non-numeric weight, or
  a product or sum that overflows to infinity, fails the same way in the final
  expression.
- **Limits:** Urgency and impact above 5 count as 5, and below 0 count as 0.
  Weights are not limited, so they set the score's range, and a negative weight
  lowers the score. A caller declares `max_depth` of at least 2: one level for
  this program and one for its clamp calls.
- **Callers:** [`task-planning/plan_task.algal`](../examples/source/projects/task-planning/plan_task.algal),
  [`task-planning/inspect_task.algal`](../examples/source/projects/task-planning/inspect_task.algal),
  and [`support-queue/triage_ticket.algal`](../examples/source/projects/support-queue/triage_ticket.algal).
- **Tests:** [`src/library-index.test.ts`](../src/library-index.test.ts),
  [`examples/source/projects/task-planning/project.test.ts`](../examples/source/projects/task-planning/project.test.ts),
  and [`examples/source/projects/support-queue/project.test.ts`](../examples/source/projects/support-queue/project.test.ts).
- **Compiler:** `algal.source.profile.v1`, version `1.6.0`.
- **Maintainer:** ALGAL maintainers, through pull requests to [hraness/algal](https://github.com/hraness/algal).
- **Unseen cases:** None pinned.
- **Status:** Listed at `sha256:10ee90055c33b6d21956fff7a53e4e34a3f5074c16298dc83d452bedf9c0d0d0`.

### `apply_updates`

- **Path:** [`shared/apply_updates.algal`](../examples/source/projects/shared/apply_updates.algal)
- **Executable digest:** `sha256:331c36296feaa1ed9510ee471fa992c6ea58de0f31ab3b905d907b2c24327623`
- **Interface digest:** `sha256:53fa8f5c0096a6a3fc3334ab17a2989964b700636adcd80affcc9beec1b66e11`
- **Interface:** inputs `entries: json` (array), `updates: json` (array); outputs `result: json` (array).
- **Depends on:** None.
- **Inputs and result:** `entries` is a list of records with a nonempty text
  `id` and a json `value`; `updates` is a list of records with a text
  `target` and a json `value`. The result is one `{id, value, revised}` record
  per entry, in entry order: `value` is the last update naming the id, or the
  entry's own value when none does, and `revised` records whether any update
  targeted the entry, including one that rewrote it with equal content.
- **Rejected inputs:** An `entries` or `updates` item that is not a record of
  the declared shape, including an empty `id`, fails the run with
  `TYPE_MISMATCH` at the corresponding argument. Updates naming no entry are
  ignored.
- **Limits:** Each entry scans the whole update list twice, so a call costs
  `entries` times `updates` comparisons with no early exit. A caller declares
  `max_depth` of at least 1.
- **Callers:** [`ballot-box/ballot.algal`](../examples/source/projects/ballot-box/ballot.algal),
  [`ballot-box/main.algal`](../examples/source/projects/ballot-box/main.algal),
  and [`message-log/main.algal`](../examples/source/projects/message-log/main.algal).
- **Tests:** [`src/library-index.test.ts`](../src/library-index.test.ts),
  [`examples/source/projects/ballot-box/project.test.ts`](../examples/source/projects/ballot-box/project.test.ts),
  and [`examples/source/projects/message-log/project.test.ts`](../examples/source/projects/message-log/project.test.ts).
- **Compiler:** `algal.source.profile.v1`, version `1.6.0`.
- **Maintainer:** ALGAL maintainers, through pull requests to [hraness/algal](https://github.com/hraness/algal).
- **Unseen cases:** None pinned.
- **Status:** Listed at `sha256:331c36296feaa1ed9510ee471fa992c6ea58de0f31ab3b905d907b2c24327623`.

### `flags_for`

- **Path:** [`shared/flags_for.algal`](../examples/source/projects/shared/flags_for.algal)
- **Executable digest:** `sha256:0722d8a0c20edcdef9ad27c000992a288244580357fd7f0156c7af0662600bbf`
- **Interface digest:** `sha256:09fd95e97acf3727298dfa497d96550393f4dede5b292484cefef50266ba2f3c`
- **Interface:** inputs `flags: json` (array), `ids: json` (array); outputs `result: json` (array).
- **Depends on:** None.
- **Inputs and result:** `ids` and `flags` are text lists. The result is one
  `{id, flagged}` record per id, in `ids` order: `flagged` is true when the id
  appears anywhere in `flags`. A caller folds the keyed result into rows of
  its own shape, which is how a one-direction join reads without a zip
  primitive.
- **Rejected inputs:** A non-text item in either list, or a non-list
  argument, fails the run with `TYPE_MISMATCH` at the corresponding argument.
- **Limits:** Each id scans the whole flag list, so a call costs `ids` times
  `flags` comparisons with no early exit. A caller declares `max_depth` of at
  least 1.
- **Callers:** [`ballot-box/main.algal`](../examples/source/projects/ballot-box/main.algal)
  and [`message-log/main.algal`](../examples/source/projects/message-log/main.algal).
- **Tests:** [`src/library-index.test.ts`](../src/library-index.test.ts),
  [`examples/source/projects/ballot-box/project.test.ts`](../examples/source/projects/ballot-box/project.test.ts),
  and [`examples/source/projects/message-log/project.test.ts`](../examples/source/projects/message-log/project.test.ts).
- **Compiler:** `algal.source.profile.v1`, version `1.6.0`.
- **Maintainer:** ALGAL maintainers, through pull requests to [hraness/algal](https://github.com/hraness/algal).
- **Unseen cases:** None pinned.
- **Status:** Listed at `sha256:0722d8a0c20edcdef9ad27c000992a288244580357fd7f0156c7af0662600bbf`.

### `group_by_key`

- **Path:** [`shared/group_by_key.algal`](../examples/source/projects/shared/group_by_key.algal)
- **Executable digest:** `sha256:e2e9a709ff63a2c671f1669baf939d6f89a9a79fc1264e4b1980cd520c620c63`
- **Interface digest:** `sha256:10233bcd8ae7be10ecb9509a1de7fbedd0eb4fc31da1c0f20259b6b3abba32b5`
- **Interface:** inputs `pairs: json` (array); outputs `result: json` (array).
- **Depends on:** None.
- **Inputs and result:** `pairs` is a list of records with a text `key`, a
  nonempty text `id`, and a json `member`. The result is one `{key, members}`
  record per distinct key, in order of first occurrence; `members` holds the
  members of that key's pairs in list order.
- **Rejected inputs:** A pair that is not a record of the declared shape,
  including an empty `id`, fails the run with `TYPE_MISMATCH` at the `pairs`
  argument.
- **Limits:** Every pair scans the whole list twice more, so a call costs a
  quadratic number of comparisons; an empty list returns an empty list.
  Distinct nonempty ids keep a key's group unique; when ids repeat, that
  key's group can appear more than once. A caller declares `max_depth` of at
  least 1.
- **Callers:** [`ballot-box/ballot.algal`](../examples/source/projects/ballot-box/ballot.algal),
  [`ballot-box/main.algal`](../examples/source/projects/ballot-box/main.algal),
  [`message-log/main.algal`](../examples/source/projects/message-log/main.algal),
  and [`message-log/thread.algal`](../examples/source/projects/message-log/thread.algal).
- **Tests:** [`src/library-index.test.ts`](../src/library-index.test.ts),
  [`examples/source/projects/ballot-box/project.test.ts`](../examples/source/projects/ballot-box/project.test.ts),
  and [`examples/source/projects/message-log/project.test.ts`](../examples/source/projects/message-log/project.test.ts).
- **Compiler:** `algal.source.profile.v1`, version `1.6.0`.
- **Maintainer:** ALGAL maintainers, through pull requests to [hraness/algal](https://github.com/hraness/algal).
- **Unseen cases:** None pinned.
- **Status:** Listed at `sha256:e2e9a709ff63a2c671f1669baf939d6f89a9a79fc1264e4b1980cd520c620c63`.

### `includes_text`

- **Path:** [`shared/includes_text.algal`](../examples/source/projects/shared/includes_text.algal)
- **Executable digest:** `sha256:c37ca73b619bf07c68d829f1d43028c5d20fd4d49f8cc7b78d3bf251960e72cc`
- **Interface digest:** `sha256:3f3cfa7c021a4e8efc1cf3d4f3bc28ce1e6432b0d63ceb7a9809103325d2014b`
- **Interface:** inputs `items: json` (array), `value: text`; outputs `result: json` (boolean).
- **Depends on:** None.
- **Inputs and result:** `items` is a text list and `value` a text. The
  result is true when any item equals the value, false otherwise. This is the
  evaluator's `contains` operation written as a program, so callers bound by
  list size rather than a hidden primitive.
- **Rejected inputs:** A non-text item, a non-list `items`, or a non-text
  `value` fails the run with `TYPE_MISMATCH` at the corresponding argument.
- **Limits:** The fold scans the whole list with no early exit, so a call
  takes `items` steps whether or not a match exists. A caller declares
  `max_depth` of at least 1.
- **Callers:** [`ballot-box/ballot.algal`](../examples/source/projects/ballot-box/ballot.algal)
  and [`message-log/thread.algal`](../examples/source/projects/message-log/thread.algal).
- **Tests:** [`src/library-index.test.ts`](../src/library-index.test.ts),
  [`examples/source/projects/ballot-box/project.test.ts`](../examples/source/projects/ballot-box/project.test.ts),
  and [`examples/source/projects/message-log/project.test.ts`](../examples/source/projects/message-log/project.test.ts).
- **Compiler:** `algal.source.profile.v1`, version `1.6.0`.
- **Maintainer:** ALGAL maintainers, through pull requests to [hraness/algal](https://github.com/hraness/algal).
- **Unseen cases:** None pinned.
- **Status:** Listed at `sha256:c37ca73b619bf07c68d829f1d43028c5d20fd4d49f8cc7b78d3bf251960e72cc`.

### `latest_value`

- **Path:** [`shared/latest_value.algal`](../examples/source/projects/shared/latest_value.algal)
- **Executable digest:** `sha256:96a8649f6dff50438c1023c00c91a1622c8a4c87b3d20bd775bbf5ae48b86245`
- **Interface digest:** `sha256:89336fcaa77a538c8976e8ae5efc5ab54fe55718839af143fdb34dc8bbb127b2`
- **Interface:** inputs `fallback: json`, `target: text`, `updates: json` (array); outputs `result: json`.
- **Depends on:** None.
- **Inputs and result:** `updates` is a list of records with a text `target`
  and a json `value`; `target` is a text and `fallback` any json. The result
  is the `value` of the last update naming the target, or `fallback` when no
  update matches, so the caller chooses what "no update" means, including
  `null`.
- **Rejected inputs:** An update that is not a record of the declared shape,
  a non-text `target`, or a non-list `updates` fails the run with
  `TYPE_MISMATCH` at the corresponding argument. An update naming a different
  target is ignored.
- **Limits:** The fold scans the whole list, so a call takes `updates` steps.
  A caller declares `max_depth` of at least 1.
- **Callers:** [`ballot-box/ballot.algal`](../examples/source/projects/ballot-box/ballot.algal)
  and [`message-log/thread.algal`](../examples/source/projects/message-log/thread.algal).
- **Tests:** [`src/library-index.test.ts`](../src/library-index.test.ts),
  [`examples/source/projects/ballot-box/project.test.ts`](../examples/source/projects/ballot-box/project.test.ts),
  and [`examples/source/projects/message-log/project.test.ts`](../examples/source/projects/message-log/project.test.ts).
- **Compiler:** `algal.source.profile.v1`, version `1.6.0`.
- **Maintainer:** ALGAL maintainers, through pull requests to [hraness/algal](https://github.com/hraness/algal).
- **Unseen cases:** None pinned.
- **Status:** Listed at `sha256:96a8649f6dff50438c1023c00c91a1622c8a4c87b3d20bd775bbf5ae48b86245`.

### `lookup_by_key`

- **Path:** [`shared/lookup_by_key.algal`](../examples/source/projects/shared/lookup_by_key.algal)
- **Executable digest:** `sha256:4caa1b42036484d402b79428f8db7ab9803dbdc3ba21ab5f44b2c695cdbb148e`
- **Interface digest:** `sha256:1cc7c1b9dbc60680d8c6c3e8aeb4193f436fc1237ec736232ce80e277b1eb885`
- **Interface:** inputs `fallback: json`, `key: text`, `pairs: json` (array); outputs `result: json`.
- **Depends on:** None.
- **Inputs and result:** `pairs` is a list of records with a text `key`, a
  nonempty text `id`, and a json `member`; `key` is a text and `fallback` any
  json. The result is the `member` of the first pair carrying the key, or
  `fallback` when no pair does. The `id` channel identifies each pair:
  `lookup_by_key` finds the first pair with the key by its id, then answers
  that pair's member.
- **Rejected inputs:** A pair that is not a record of the declared shape,
  including an empty `id`, a non-text `key`, or a non-list `pairs` fails the
  run with `TYPE_MISMATCH` at the corresponding argument.
- **Limits:** Two full scans, so a call costs twice `pairs` steps. When ids
  repeat, the member comes from the last pair carrying the matched id;
  distinct ids keep first-wins exact. A caller declares `max_depth` of at
  least 1.
- **Callers:** [`ballot-box/ballot.algal`](../examples/source/projects/ballot-box/ballot.algal)
  and [`message-log/thread.algal`](../examples/source/projects/message-log/thread.algal).
- **Tests:** [`src/library-index.test.ts`](../src/library-index.test.ts),
  [`examples/source/projects/ballot-box/project.test.ts`](../examples/source/projects/ballot-box/project.test.ts),
  and [`examples/source/projects/message-log/project.test.ts`](../examples/source/projects/message-log/project.test.ts).
- **Compiler:** `algal.source.profile.v1`, version `1.6.0`.
- **Maintainer:** ALGAL maintainers, through pull requests to [hraness/algal](https://github.com/hraness/algal).
- **Unseen cases:** None pinned.
- **Status:** Listed at `sha256:4caa1b42036484d402b79428f8db7ab9803dbdc3ba21ab5f44b2c695cdbb148e`.

## Revise a listed program

An edit that changes a listed program's compiled form changes its executable
digest and the digests of the programs that call it, including other entries;
a comment or formatting edit does not. The task planner's tests show which
digests move when the clamp helper changes, and an earlier bundle still runs
its earlier version. The catalog test accepts a new digest for an entry only
when its status names a passing comparison record, so a change to shared
behavior reaches review with a record of how every calling project's cases
behave under the revision. Each calling project's own tests still decide
whether a change suits that project. A project that needs to notice any change
can record every file and digest it compiles to with
[`lock`](source-language.md#pin-a-project-with-a-lock).

### Compare a revision

Run the comparison in a checkout whose page still lists the current version,
with the proposed file and, when the entry pins one, its unseen case file:

```sh
bun cli.ts library compare clamp clamp-revision.algal \
  --unseen ../clamp.unseen.json \
  --out examples/source/projects/task-planning/lib/clamp.comparison.json
```

`library compare` first checks that the entry's file still compiles to the
digests on this page, so a comparison always starts from the listed version.
It compiles the revision in the file's place, then compiles each other entry
that calls the file and each entry point above that loads it, once with each
version. The revision replaces the file only in memory: the command reads the
page and the projects, and writes only the `--out` file. Each entry point's
case list and the entry's unseen cases run against both versions. Runs use the
built-in functions and each case's scripted responses, and call no model,
tool, or network service. A case that the listed version does not bring to its
expected outcome stops the comparison, because the case no longer describes
the listed program. The SDK offers the same comparison as
`compareLibraryRevision`.

The `algal.library-comparison.v1` record lists the current and revised
executable and interface digests, the unseen file's digest, each calling entry
point's digest before and after, each other entry whose digest moves, and each
case's outcome and output digest under both versions. It has no timestamps, so
the same inputs give the same bytes. The comparison passes when the interface
is unchanged, unseen cases ran, every entry point and dependent entry compiles
and runs with the revision, and every case reaches the same outcome with the
same outputs. Otherwise its verdict names the interface change, the missing
unseen cases, the programs that do not compile, and each case that changed or
could not run, and the command exits with status 1. A changed result fails the comparison even when
the change is intended, because the comparison cannot tell a fix from a
regression, unless the proposer declares it. `--intended declaration.json`
reads a JSON object that lists the exact case identifiers (`set:entry#name`)
expected to change, sorted and unique, with a reason of `corrected`,
`extended`, or `restricted`:

```json
{ "changed": ["pinned:task-planning/main.algal#three-tasks"], "reason": "corrected" }
```

The verdict passes only when the declared list equals the observed changed
list exactly: a declared case that did not move fails the same way as an
observed change left undeclared. The declaration is recorded in the record
under `intended`, so `--verify` needs the same declaration file to match a
record that carries one. A record covers at most 16 entry points, 16 cases
per case list, and 16 unseen cases, and a record file over 512 KiB is refused.
`--format text` prints a summary instead of the record.

### Pin unseen cases

The repository cannot know which inputs a revision's author has seen. Unseen
cases make one part of that question checkable. Before a revision is
proposed, the maintainers write a case file, keep it outside the repository,
and put the digest of its canonical JSON on the entry's "Unseen cases" line in
place of `None pinned.`:

```json
{
  "contract": "algal.library-unseen-cases.v1",
  "cases": [
    {
      "name": "urgency-above-range",
      "entry": "task-planning/inspect_task.algal",
      "args": {
        "input": {
          "task": { "id": "keys", "title": "Rotate keys", "status": "open", "urgency": 9, "impact": 3 },
          "weights": { "urgency": 2, "impact": 1 },
          "threshold": 12
        }
      }
    }
  ]
}
```

Each case names an entry point from the table above, its run arguments in the
format `run --args` reads, optional `responses` in the format
`run --responses` reads, and an optional `outcome` that the listed version must
reach, `complete` by default. A file holds one to 16 cases in at most 64 KiB.
`bun cli.ts library unseen clamp.unseen.json` checks a file and prints the
digest to pin. `library compare` refuses a file whose digest differs from the
page and refuses to run without the file when the entry pins one. When the
entry pins none, the comparison runs only the case lists and cannot pass.

The pin guarantees that a comparison runs the file the page names and no
other, and the page's history shows when that pin landed. It does not
guarantee that the revision's author never saw the file, since the repository
cannot know who read a file kept elsewhere, or that the cases represent how
the program is used. A record also reveals each unseen case's
name, entry point, outcome, and output digest, and a digest of a small output
can be confirmed by guessing the output. Each verdict tells an author whether
a revision passed. Treat a file as seen once a record that ran it is
published, and pin a new file before the next revision. A record keeps the
digest of the file it ran, so a later pin does not invalidate it.

### Change the page

After a passing comparison, make these changes in one pull request:

1. Replace the entry's file with the revision.
2. Add the record under `examples/source/projects`, beside the entry's file.
3. Set the entry's executable digest to the record's revised digest.
4. Set the entry's status to name its previous digest and the record, as in
   the example below.
5. Give each dependent entry that the record lists its new digest, and the
   same status with its own previous digest.

```md
- **Status:** Revised from `sha256:e0023e6a72961ff823b468d357572507305652cd0a5e9a31648550684db0cb3a` after the comparison [`task-planning/lib/clamp.comparison.json`](../examples/source/projects/task-planning/lib/clamp.comparison.json).
```

The catalog test then reads each revised entry's record. The record must
parse, compare that entry or list it as a dependent, start from the digest the
status names, end at the page's digests, and have passed. An entry whose
digest changes while its status still reads "Listed at" the old digest fails
the test. The test does not rerun a record's cases, because that needs the
unseen file and the commit the record starts from. To check a record's
results, run the same comparison on that commit and pass a copy of the record
with `--verify`. The command exits with status 2 and names the fields that
differ when the record does not match a fresh comparison; the SDK's
`verifyLibraryComparison` does the same.

```sh
bun cli.ts library compare clamp clamp-revision.algal --unseen ../clamp.unseen.json \
  --verify ../clamp.comparison.json
```

A status reads "Listed at" when an entry is added, and again if a compiler
change moves its digest while its source stays the same. The test cannot tell
those edits from a revision, so review checks them. Revise one entry per pull
request: a record's digests for dependent entries assume that their own files
did not change.

## Vendor an entry into another project

Another project can copy an entry, with every entry it depends on, into a
directory of its own. Run `vendor` from that project's directory:

```sh
bun cli.ts vendor https://raw.githubusercontent.com/hraness/algal/main/docs/library.md \
  --entry task-planning/score_task.algal --into vendor/algal
```

`vendor` reads this page from an https URL or a local path and follows its
links to the entry's file and to the file of each entry it depends on. Each
file keeps its catalog path inside the new directory, so relative imports
between the files still resolve. The copy is refused unless every file
compiles, from the copied files alone, to the executable and interface digests
listed here. Beside the files, `vendor` writes `algal.vendor.json`, an
`algal.vendor.v1` record of the page's address and SHA-256 digest, the entry,
and each file's source, executable, and interface digests. A program in the
project imports the copy by an ordinary relative path:

```algal
import score_task from "./vendor/algal/task-planning/score_task.algal"
```

For a page at an https URL, `vendor` fetches each file from the page's host and
follows a redirect only within that host; other schemes, including plain http,
are refused. It reads at most 128 KiB for the page and 64 KiB for each of at
most 16 files, and gives each request 15 seconds. `--into` names a directory
that does not exist yet, beneath the current directory, in plain segments of
letters, digits, `.`, `_`, and `-`. `vendor` refuses a path through a symlink,
never replaces a file, and runs nothing it downloads: compiling a program only
reads it.

[`lock`](source-language.md#pin-a-project-with-a-lock) then records where the
copy came from, and `lock --verify` checks offline that the copied files
still match their record and the digests this page listed.

### Check a copy against its catalog

`vendor check` reads the catalog page each copy's record names and reports
what the pin would find now:

```sh
bun cli.ts vendor check main.algal
bun cli.ts vendor check main.algal --from local --format text
```

The report is an `algal.vendor-check.v1` record, one entry per vendored
directory the project imports: the directory, entry, origin, pinned catalog
digest, and record digest, plus the live page digest when a page was read and
a status of `unchanged`, `update-available`, `removed`, or `unreadable`. A
catalog that moved past the copy is `update-available`; a page that no longer
lists the entry is `removed`; a page that cannot be fetched or parsed is
`unreadable` with a one-line reason. Each outcome is a fact in the report:
the command exits 0 on any of them, writes nothing, and fetches only under
the same limits `vendor` uses. `--from` keeps the copies whose record names
one catalog address.

### Apply a revision with vendor update

`vendor update` re-runs the vendoring pipeline for one copy's recorded entry
and origin into a directory that does not exist yet:

```sh
bun cli.ts vendor update vendor/algal --into vendor/algal-2
```

The fresh copy passes the same compile and digest checks as a first vendor.
The result is an `algal.vendor-update.v1` proposal naming the pin the lock
holds (`from`) and the pin a new copy would write (`to`). Applying it is the
project's own choice: point the imports at the new directory, run `lock`
again, and delete the old directory when nothing pins it. The command never
edits a lock, never modifies or removes the pinned copy, and a page that no
longer lists the entry, or lists digests the programs no longer compile to,
refuses before anything is written.

A project can also give catalog addresses names. A file
`algal.registries.json` at the project root holds an `algal.registries.v1`
record, a short list of names to catalog page addresses, and
`vendor --from`, `vendor check --from`, and `lock --registries` read it. The
lock records the names in its optional `registries` field so a lock stays
self-describing; the field is data for `vendor` commands, never part of the
verified pin, and a lock written without it is byte-identical to one written
before the field existed.
