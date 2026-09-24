# Shared program catalog

This catalog lists the pure ALGAL programs that files in more than one project
call, with the digests, interfaces, and callers that a test checks.

Each entry is one `.algal` file in this repository. A project uses it through a
relative import, loaded with a source root wide enough to reach the file, so
every caller runs the same compiled program. The catalog is repository-local:
there is no package server, registry lookup, download, or automatic upgrade.
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
  no other file in a calling project compiles to the same executable digest.
- **Callers in two projects.** Files in at least two projects call it, and its
  caller list names every file that calls it from the entry points listed
  below.
- **Listed dependencies.** Every program it calls is also an entry.
- **Tests.** Its success and failure cases run in the listed test files.

`bun test src/library-index.test.ts` recompiles every entry and every calling
project, and fails when a digest, interface, compiler version, dependency, or
caller on this page stops matching the source. The same file runs the success
and failure cases described below. The native parity suite runs the three
entry points listed below in the TypeScript and Rust runtimes and checks that
each runtime verifies the other's results.

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
- **Compiler:** `algal.source.profile.v1`, version `1.3.0`.
- **Maintainer:** ALGAL maintainers, through pull requests to [hraness/algal](https://github.com/hraness/algal).
- **Status:** Listed, first revision.

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
- **Compiler:** `algal.source.profile.v1`, version `1.3.0`.
- **Maintainer:** ALGAL maintainers, through pull requests to [hraness/algal](https://github.com/hraness/algal).
- **Status:** Listed, first revision.

## Change a listed program

An edit that changes a listed program's compiled form changes its executable
digest and the digests of the programs that call it; a comment or formatting
edit does not. The task planner's tests show which digests move when the clamp
helper changes, and an earlier bundle still runs its earlier version. The
catalog test fails until this page carries the new digests, so a change to
shared behavior appears in review as a change to this page. Each calling
project's own tests decide whether the new behavior suits that project. A
project that needs to notice any change can record every file and digest it
compiles to with [`lock`](source-language.md#pin-a-project-with-a-lock).

Comparing a revised entry with its current version on each caller's recorded
cases and on unseen cases, before a project adopts it, is proposed in
[building larger programs](scaling-programs.md#proposed-next-steps).
