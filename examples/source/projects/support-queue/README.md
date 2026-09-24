# A support queue built from the task planner's programs

This example assigns each of up to eight support tickets to a response queue
from its urgency, impact, and age. It makes no model calls. It is a separate
project that imports two programs from the
[task planner](../task-planning/README.md): the scoring program and the clamp
helper, both listed in the [shared program catalog](../../../../docs/library.md).
Queue names and thresholds are illustrative policy, not measured support
outcomes.

| Program | Responsibility |
| --- | --- |
| `main.algal` | Apply the ticket program to a list of at most eight tickets, sharing one execution budget. |
| `triage_ticket.algal` | Score one ticket, compute the hours left in the response window, and choose a queue. |
| `../task-planning/score_task.algal` | Shared: weight urgency and impact, each clamped to 0 through 5. |
| `../task-planning/lib/clamp.algal` | Shared: constrain a value to inclusive bounds. |

The imports leave this directory, so every command passes the parent directory
as the source root. Without `--source-root`, loading stops with
`import escapes the source project root`. From the repository root:

```sh
bun cli.ts check examples/source/projects/support-queue/main.algal \
  --source-root examples/source/projects
bun cli.ts run examples/source/projects/support-queue/main.algal \
  --source-root examples/source/projects \
  --args examples/source/projects/support-queue/main.args.json > support-queue.receipt.json
bun cli.ts verify support-queue.receipt.json examples/source/projects/support-queue/main.algal \
  --source-root examples/source/projects
bun cli.ts dependencies examples/source/projects/support-queue/main.algal \
  --source-root examples/source/projects --format text
bun cli.ts lock examples/source/projects/support-queue/main.algal \
  --source-root examples/source/projects --out support-queue.lock.json
```

Source keys are relative to the source root, such as
`task-planning/lib/clamp.algal`. The dependency report lists 4 source files,
4 modules (3 dependencies), and 6 occurrences. The clamp helper appears three
times: twice through scoring and once in `triage_ticket.algal`. The scoring and
clamp programs have the same source and executable digests as in the task
planner, so both projects run the same compiled programs rather than copies.
Verify the lock with the same `--source-root` used to write it.

The fixture uses a 24-hour window and weights of 2 for urgency and 1 for
impact. The three tickets score `14`, `6`, and `3`, with `23`, `21`, and `0`
hours left, so they go to the `urgent`, `standard`, and `overdue` queues. A
ticket with no hours left is `overdue`; otherwise a score of at least 10 is
`urgent`. The clamp keeps hours left between 0 and the window, so a ticket open
longer than the window has 0 hours left rather than a negative count. The
fixture's empty response map is for cross-runtime test tooling; this program
does not need an executor.

The source language checks only that `tickets`, `weights`, and `window` are
JSON values. A ninth ticket fails the run instead of being dropped. A ticket
without `hours_open`, a non-numeric urgency, or a non-numeric window fails the
run at the expression that receives the value, and the tests check each
failure's location. The host must check fields such as ticket IDs and allowed
windows before acting on a queue assignment.

Tests cover the successful run, the shared digests and lock, portable bundle
replay, the eight-ticket limit, and the rejected inputs above. The native
parity suite runs the compiled project in Rust from its bundle, and each
runtime verifies the other's recorded run.
