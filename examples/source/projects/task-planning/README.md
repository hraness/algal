# A task planner built from reusable programs

This example computes a proposed next action for up to 16 tasks without changing
their facts. It makes no model calls. Scores and recommendations are illustrative
policies, not measured productivity improvements.

| Program | Responsibility |
| --- | --- |
| `main.algal` | Apply the planner to a limited list, sharing one execution budget. |
| `plan_task.algal` | Pass explicit task inputs between scoring, policy, and presentation. |
| `score_task.algal` | Combine urgency and impact using supplied weights. |
| `choose_action.algal` | Choose a recommendation from status and score. |
| `present_task.algal` | Produce display data without reading storage or rendering HTML. |
| `lib/clamp.algal` | Constrain a numeric value to caller-supplied, ordered numeric bounds. |

The score program calls the same clamp helper twice. Compilation includes one
copy of that helper in the portable dependency set. Both calls still execute
and consume work. Changing the helper changes the score program, task planner,
and root digests; the policy and presentation programs keep their identities.
An earlier bundle retains its earlier behavior.

From the repository root:

```sh
bun cli.ts check examples/source/projects/task-planning/main.algal
bun cli.ts run examples/source/projects/task-planning/main.algal \
  --args examples/source/projects/task-planning/main.args.json > task-plan.receipt.json
bun cli.ts verify task-plan.receipt.json examples/source/projects/task-planning/main.algal
bun cli.ts compile examples/source/projects/task-planning/main.algal \
  --out task-plan.algal.json --bundle-out task-plan.bundle.json
```

The three supplied tasks produce scores `13`, `4`, and `15`, and recommendations
`work next`, `review later`, and `archive`. The original task records remain in
the output. The fixture's empty response map is for cross-runtime test tooling;
this program does not need an executor.

The source language currently checks `text` and `json` program parameters.
Its strict numeric operators reject a nonnumeric urgency, impact, or weight
when used; this example does not define a general task-record schema. The host
must check domain constraints such as allowed statuses and weight ranges before
using recommendations in an application. The helper assumes its lower bound
does not exceed its upper bound.

Tests cover the complete portable dependency set, offline receipt verification,
shared-helper change propagation, old-version replay, the 16-task limit,
malformed numeric inputs, and exhaustion of the shared root step allowance.
The native parity suite runs the compiled example in Rust and cross-verifies
both runtimes' receipts.

See [building larger programs](../../../../docs/scaling-programs.md) for how
these module boundaries fit application state, effects, evaluation, and a
future curated library. This example is independent of the browser task
workspace; it does not change that workspace's ranking policy.
