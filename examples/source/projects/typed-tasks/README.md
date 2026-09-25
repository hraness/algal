# Typed task scores

This example scores up to 8 tasks with declared record types. It makes no
model calls. The score is an illustrative policy, not a measured productivity
improvement.

| Program | Responsibility |
| --- | --- |
| `scores.algal` | Apply the scorer to a list of tasks with shared weights. |
| `score.algal` | Declare the `Task`, `Weights`, and `Score` records and score one task. |

`score.algal` states what a task must contain:

```algal
record Task {
  id: text,
  title: text,
  urgency: number,
  impact: number,
  status: text,
  notes: text?,
}
```

Each record compiles to a JSON schema on the program's interface. Both
runtimes check each task against `Task` before that task is scored, the
weights against `Weights` when the run starts, and each result against
`Score` before it is returned. The [source language guide](../../../../docs/source-language.md#record-types)
describes the syntax and the exact checks.

From the repository root:

```sh
bun cli.ts check examples/source/projects/typed-tasks/scores.algal
bun cli.ts run examples/source/projects/typed-tasks/scores.algal \
  --args examples/source/projects/typed-tasks/scores.args.json
bun cli.ts run examples/source/projects/typed-tasks/scores.algal \
  --args examples/source/projects/typed-tasks/scores.malformed.args.json > rejected.receipt.json
# This run exits 1: the second task's urgency is text.
bun cli.ts diagnose rejected.receipt.json \
  --source examples/source/projects/typed-tasks/scores.algal --format text
bun cli.ts verify rejected.receipt.json examples/source/projects/typed-tasks/scores.algal
```

The valid fixture produces totals `13`, `4`, and `15`. Only the first task is
ready: it is open and its total is at least `10`. The second task's optional
`notes` field is accepted.

The malformed fixture scores the first task, then fails the `each` cell with
`TYPE_MISMATCH` and the message `expected number` before the second task's run
starts. The third task never runs. `diagnose` points at the `each` expression
in `scores.algal`, and `verify` replays the failed run. The message names the
failed check, not the field.

The records do not check number ranges, allowed status values, or whether an
`id` is unique, and they accept fields that a record does not declare. The
host must check such domain rules before using the scores in an application.
A null `notes` value is rejected: an optional field may be omitted, but when
present it must be text.

Tests cover the valid run and a portable bundle replay, the rejected task, a
missing field, a null optional field, a non-list, a ninth task, malformed
weights, a compile-time rejection of mistyped weights, and lock interface
drift when a record changes. The native parity suite runs the valid and
malformed fixtures in Rust and requires identical receipts.
