# Declare, evaluate, and improve a task

A task declares inputs, one output, instructions, and execution limits. ALGAL
compiles it into an ordinary `algal.organism.v1` program. You can run that program
with an existing executor, compare changes on labeled cases, and keep the chosen
program with its execution records.

Run the credential-free example from a source checkout:

```sh
bun examples/task-optimization.ts
```

The example uses a deterministic ticket router. Its scores check the workflow;
they do not measure model quality. Replace the executor only when you intend to
make live model calls.

## Define and run

```ts
import { compileTask, runTask, MemoryStore } from "@hraness/algal";

const { task, manifest } = compileTask({
  contract: "algal.task.v1",
  key: "organism:ticket-router",
  name: "Ticket routing",
  inputs: { message: { type: "text" } },
  output: { name: "team", contract: {
    kind: "choice", labels: ["billing", "support"],
  } },
  instructions: "Route invoice questions to billing and product failures to support.",
  budgets: { maxSteps: 4, maxAgentCalls: 1, maxWork: 100_000, maxContextBytes: 32_768, maxOutputBytes: 8192, maxDepth: 1 },
  effectBudget: { maxEffectMs: 30_000 },
});

// executor is a host-configured ALGAL Executor.
const run = await runTask({
  task, args: { message: "My invoice is incorrect" },
  store: new MemoryStore(), executors: [executor],
});
```

`manifest` is the deployable program. `run` includes its execution record and
digest. Extra input fields are rejected, which helps keep labels and evaluation
metadata out of model context. Task inputs cannot carry capabilities. Compilation
normalizes an explicit effect deadline; the default is 60 seconds. An executor
must honor cancellation to stop its remote work. A timeout does not prove that a
remote effect did not happen.

The supported package paths are `@hraness/algal/task`,
`@hraness/algal/task-parameters`, and `@hraness/algal/task-optimizer`. They also
export through the main package entry point.

## Compare changes

`optimizeTask` provides three strategies:

- `fixed` evaluates the task as supplied.
- `labeled` also evaluates a task containing up to `maxExamples` training cases.
- `feedback` adds proposed instruction or example revisions. The default
  `buildTaskReviser` proposes instruction changes using concrete training outputs.

Every case supplies `id`, `sourceId`, `split`, `args`, and `expect`. A source may
occur in only one split. Identical inputs cannot cross split boundaries. Supplied
examples must exactly match training cases; validation and holdout examples cannot
be inserted as demonstrations.

Training results inform revisions. Validation results select the winner and a
limited set of complementary candidates. The winner is frozen before the holdout
is evaluated. The final foundry pass also reruns the frozen winner's training and
validation cases; those extra calls are included in the cost report and cannot
change the selected program.

Set limits for candidates, revision rounds, demonstrations, portfolio size, total
runs, work, and model attempts. Failed proposals and losing candidates consume
that allowance. An exhausted report retains partial records and has no selected
program. These are execution limits, not a dollar-denominated provider budget.

The report includes each task, candidate results, rejected revisions, the selected
manifest, the final holdout result, and the complete habitat budget. Keep the
report and its store together to replay the recorded runs. The task authoring and
optimizer report formats do not add an instruction to the VM or change its wire
contract.

## Change parameters and retain a prior version

`taskParameters(task)` returns stable IDs and digests for `task.instructions` and
`task.examples`. `applyTaskParameterPatch` requires the task digest and each old
value's digest. It validates the whole replacement before returning a new task;
an invalid second change cannot partially apply the first.

The patch interface cannot change the schema, route, budgets, effect deadlines,
capabilities, or tool implementations. Treat a proposal as data and evaluate it
before choosing it. Keep the previous task and compiled manifest so rollback is
an explicit host choice. Saving a winning task does not activate a live service.

## What the result establishes

Execution replay checks how a recorded program ran. It does not establish that a
judge was correct, that a public fixture represents production traffic, or that
retained examples generalize. Report invalid outputs separately, include failed
attempts in cost, and keep an untouched source-disjoint audit set. Compare any
retained guidance against a fixed task under the same model and limits.
