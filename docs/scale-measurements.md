# Scale measurements

These measurements show how compile, bundle, and run costs grow as ALGAL
programs reuse helpers, and the size at which compilation refuses them.

A source project compiles to manifests, the JSON programs that both runtimes
execute. A manifest names each child program by digest, so a bundle stores a
shared helper once however many places call it. Every call still counts
before a run: one compilation may expand to at most 1,024 manifest instances,
4,096 cells, 16,384 edges, and 64 MiB of manifest JSON, counting each call
occurrence again. [Building larger programs](scaling-programs.md#scale-programs-and-habitats-separately)
lists these limits beside the source limits. Browser task history is measured
separately, because its verification cost grows with saved history rather
than with program size.

## What the numbers show

The tables report capacity and cost: how far each program grows before a limit
refuses it, and what compiling, packing, and running it took on one machine.
They say nothing about whether reusing programs improves later work; that is
the open [cumulative-skill experiment](vision.md#what-would-justify-the-claim).
The generated programs are synthetic shapes built to reach one limit each, not
applications.

## Reproduce the measurements

From the repository root, with a release build of the native CLI:

```sh
cargo build --release --locked -p algal
ALGAL_BIN=target/release/algal bun scripts/measure-source-scaling.ts \
  --markdown --out source-scaling.json
bun scripts/measure-history-scaling.ts --tasks 32 --title-length 120 \
  --out history.json
```

Each script writes a JSON record with every repetition and prints a table.
Without `ALGAL_BIN`, the native times are omitted. The counts in the first
three tables below do not depend on the machine, and
`bun test scripts/source-scaling.test.ts` fails when one of them stops matching
a fresh compile and run.

## Example projects

Each example project entry point, compiled from its source files and run with
its committed fixture:

- **Files** and **Source bytes**: the source files the loader reads.
- **Modules**: distinct compiled manifests, which is what a bundle stores.
- **Call sites**: `call` and `each` expressions in the source.
- **Instances**, **Cells**, **Edges**, and **Manifest bytes**: what the check
  before a run counts, with every call occurrence counted again.
- **Bundle bytes**: the canonical bundle, which stores each module once.
- **Attempts**: the compiler's upper bound on model executor attempts.
- **Depth**: the call depth the root program must allow.
- **Steps**, **Work**, and **Run**: the reference run's activated cells, work
  units, and `complete` or its error code.

| Program | Files | Source bytes | Modules | Call sites | Instances | Cells | Edges | Manifest bytes | Bundle bytes | Attempts | Depth | Steps | Work | Run |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| `task-planning/main` | 6 | 1,818 | 6 | 6 | 7 | 34 | 42 | 13,109 | 12,497 | 0 | 3 | 92 | 9,994 | complete |
| `task-planning/inspect_task` | 3 | 1,324 | 3 | 4 | 5 | 25 | 34 | 10,446 | 8,410 | 0 | 2 | 25 | 2,671 | complete |
| `support-queue/main` | 4 | 1,734 | 4 | 5 | 6 | 32 | 43 | 13,236 | 11,275 | 0 | 3 | 84 | 8,964 | complete |
| `typed-tasks/scores` | 2 | 1,002 | 2 | 1 | 2 | 8 | 9 | 3,858 | 4,145 | 0 | 1 | 14 | 1,603 | complete |
| `inbox/inbox` | 2 | 517 | 2 | 2 | 3 | 17 | 17 | 5,751 | 4,484 | 4 | 1 | 25 | 5,408 | complete |
| `ratios/ratios` | 2 | 334 | 2 | 1 | 2 | 7 | 5 | 2,237 | 2,524 | 0 | 1 | 8 | 837 | `EXPR_FAILED` |

The task planner's clamp helper is two of its seven instances and one of its
six modules, so its bundle is smaller than the manifest bytes the check counts.
An `each` call counts as one instance however many items it runs, so the
planner's run activates 92 cells for three tasks while the check counts 34.
`ratios` fails on purpose: its second item divides by zero.

## Programs that share helpers

The measurement script also generates projects that call shared helpers from
more and more places. It grows each one through 1, 2, 4, and more units until
something refuses it, then bisects to the exact boundary. The table shows one
unit and the largest size that compiles; the JSON record has every step.

- `table-fan-in`: each unit is a section that calls a stage 12 times, and the
  stage reads 8 shared lookup tables that take no parameters. A table costs
  one cell, so this shape reaches the instance limit first.
- `planner-fan-in`: each unit is a batch of 16 calls to the task planner's
  `plan_task`, whose five files are copied unchanged. It reaches the cell
  limit.
- `dense-scorecard`: each unit calls a scorecard 4 times, and each of the
  scorecard's 18 metrics reads all 12 of its inputs. It reaches the edge limit.
- `record-orders`: each unit is 4 desks of 3 calls to a check with 16 `Order`
  parameters, where `Order` has 32 fields of a 32-field `Line` record. Each
  record parameter's port carries the record's 47,846-byte schema, so the
  check's 3,795-byte source file compiles to a 770,939-byte manifest, and this
  shape reaches the byte limit.
- `import-chain`: each file calls the next. It reaches the limit of eight
  import levels.
- `compact-dag`: each file calls the next 24 times.
- `drafts`: each unit is 8 calls to a helper that makes one model call. A root
  program may declare at most 64 executor attempts.

| Program | Size | Files | Source bytes | Modules | Call sites | Instances | Cells | Edges | Manifest bytes | Bundle bytes | Attempts | Depth | Steps | Work | Run |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| `table-fan-in` | 1 | 11 | 2,943 | 11 | 21 | 110 | 246 | 147 | 88,077 | 17,462 | 0 | 3 | 246 | 25,560 | complete |
| `table-fan-in` | 9 | 11 | 3,511 | 11 | 29 | 982 | 2,198 | 1,323 | 788,253 | 23,022 | 0 | 3 | 1,024 | 106,382 | `BUDGET_EXHAUSTED` |
| `planner-fan-in` | 1 | 7 | 3,307 | 7 | 22 | 98 | 519 | 677 | 202,266 | 30,864 | 0 | 4 | 519 | 55,697 | complete |
| `planner-fan-in` | 7 | 7 | 3,793 | 7 | 28 | 680 | 3,621 | 4,739 | 1,412,148 | 37,500 | 0 | 4 | 1,024 | 109,810 | `BUDGET_EXHAUSTED` |
| `dense-scorecard` | 1 | 3 | 3,510 | 3 | 5 | 6 | 138 | 1,039 | 166,985 | 59,434 | 0 | 2 | 138 | 19,664 | complete |
| `dense-scorecard` | 15 | 3 | 4,410 | 3 | 19 | 76 | 2,042 | 15,585 | 2,497,143 | 68,952 | 0 | 2 | 1,024 | 146,349 | `BUDGET_EXHAUSTED` |
| `record-orders` | 1 | 4 | 5,271 | 4 | 8 | 18 | 310 | 711 | 9,341,738 | 797,340 | 0 | 3 | 310 | 414,602 | complete |
| `record-orders` | 7 | 4 | 5,649 | 4 | 14 | 120 | 2,158 | 4,977 | 65,388,878 | 801,432 | 0 | 3 | 1,024 | 1,349,157 | `BUDGET_EXHAUSTED` |
| `import-chain` | 1 | 1 | 92 | 1 | 0 | 1 | 2 | 1 | 672 | 884 | 0 | 0 | 2 | 207 | complete |
| `import-chain` | 9 | 9 | 1,474 | 9 | 8 | 9 | 26 | 17 | 8,155 | 8,967 | 0 | 8 | 26 | 2,663 | complete |
| `compact-dag` | 1 | 1 | 93 | 1 | 0 | 1 | 2 | 1 | 674 | 886 | 0 | 0 | 2 | 207 | complete |
| `compact-dag` | 3 | 3 | 3,561 | 3 | 48 | 601 | 2,402 | 2,376 | 822,502 | 35,781 | 0 | 2 | 1,024 | 106,877 | `BUDGET_EXHAUSTED` |
| `drafts` | 1 | 3 | 1,052 | 3 | 9 | 10 | 54 | 51 | 17,625 | 8,516 | 8 | 2 | 54 | 10,540 | complete |
| `drafts` | 8 | 3 | 1,501 | 3 | 16 | 73 | 418 | 408 | 137,200 | 13,291 | 64 | 2 | 418 | 82,968 | complete |

A run activates at most 1,024 cells, while the check accepts up to 4,096. Every
row with 1,024 steps passed the check and then stopped at that step limit with
`BUDGET_EXHAUSTED`; of the largest sizes that compile, only `import-chain` and
`drafts` run to completion.

## Where compilation stops

One unit past each boundary, compilation refuses the project. The check stops
as soon as one count would pass its limit, before it resolves the rest of the
expansion. **Instances checked** is how many manifest instances it accepted
before refusing; **Full expansion** is the instance count of the complete
expansion, computed once per distinct module without building it.

| Program | Size | Limit | Message | Instances checked | Full expansion |
| --- | ---: | --- | --- | ---: | ---: |
| `table-fan-in` | 10 | 1,024 instances | `expanded compilation count budget exceeded` | 1,024 | 1,091 |
| `planner-fan-in` | 8 | 4,096 cells | `expanded compilation count budget exceeded` | 766 | 777 |
| `dense-scorecard` | 16 | 16,384 edges | `expanded compilation count budget exceeded` | 79 | 81 |
| `record-orders` | 8 | 64 MiB of manifest JSON | `expanded compilation manifest byte budget exceeded` | 124 | 137 |
| `import-chain` | 10 | 8 import levels | `import depth exceeds 8: link_10.algal` | none | not compiled |
| `compact-dag` | 4 | 4,096 cells | `expanded compilation count budget exceeded` | 1,003 | 14,425 |
| `compact-dag` | 9 | 4,096 cells | `expanded compilation count budget exceeded` | 944 | 114,861,197,401 |
| `drafts` | 9 | 64 executor attempts | `72 explicit effects exceed max_agent_calls 64; the budget counts executor attempts, including retries` | none | not compiled |

Nine `compact-dag` files, 13,851 bytes of source, would expand to more than
114 billion instances; the check refuses them after accepting 944. The same
message covers the instance, cell, and edge limits, so the **Limit** column
names the count that crossed. `import-chain` and `drafts` stop earlier, in the
source loader and the source compiler, before any manifest exists. The static
depth limit of 64 cannot be reached from source, because source imports stop
at eight levels.
