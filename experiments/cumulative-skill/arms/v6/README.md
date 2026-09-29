# V6 seed correction and repeated comparison

This protocol tests whether revising a saved program improves later synthetic
record-triage work. It first checks that training examples and training feedback
can produce usable starting programs. The [committed plan](protocol.json)
fixes the data seeds, model connection, budgets, order, and stopping rules
before any model call. V5 remains a separate, unchanged study.

## Calibration

Three fresh calibration corpora each contain eight acquisition tasks, 32
further learning tasks, and eight shifted test tasks. Calibration uses only
the seed search and the fixed seed's eight test executions. It does not run
the learning arms.

Each seed search allows eight generation attempts. The first generation
receives the first acquisition task's specification and 24 labeled training
records. Later corrections receive the previous usable program and its
recorded training output beside the expected training output. When no usable
program exists, another fresh generation receives the same training examples.
Validation labels and outputs never enter these correction requests. The
first program passing validation becomes the seed, including when its
training score falls short. All failed attempts remain recorded and charged.

The comparison proceeds only if all three calibration searches produce a
passing seed and the fixed seed passes at most six of eight test tasks on at
least two calibration corpora. This leaves room for improvement on the
calibration sample. A failed check stops this protocol; changing it requires
a separately recorded study.

## Repeated comparison

The confirmatory comparison has nine blocks in three predefined groups,
`a`, `b`, and `c`, with three repetitions per group. Each block uses fresh
task seeds, starts a new seed search, and makes separate model calls. These
are repeated draws from one synthetic family, rather than three distinct
task families. Every block contains eight acquisition tasks, 32 further
learning tasks, and eight shifted test tasks.

All four arms in a block receive its exact passing seed:

| Arm | Learning behavior |
|---|---|
| `fixed` | Executes the seed throughout |
| `retained` | Reuses the saved seed and its original passing evaluation |
| `optimizer` | Rechecks and revises saved programs, with supported format repairs |
| `optimizer-raw` | Uses the same optimizer with those format repairs disabled |

All generators and revisers receive the same initial training examples.
Revisers also receive the saved program and observed learning feedback.
Learning task specifications remain identical to the specifications supplied
to the programs. The task shape, text difficulty, and agreement scorer are
unchanged from v5.

At most three blocks run concurrently. The arm order rotates by confirmatory
block and is listed explicitly in the plan. Every eligible learning arm must
finish and every final program must be saved before any confirmatory test
execution begins. Each saved program then runs the eight shifted tasks
without further revision, in its block's recorded arm order. No program is
activated for production traffic.

Calibration and confirmatory blocks have distinct task seeds and ancestors,
also distinct from v5. Tests are generated from ancestors absent from
learning. The corpora share the family's text templates; separate task
lineages do not imply independent wording.

## Scores and costs

A task passes when `(4 × full-record agreement + exact-summary indicator) / 5`
reaches 0.9. An output with a different number of result rows from its
expected batch scores zero. For the 12-record validation and test batches,
passing requires at least 11 matching complete records and an exact summary.
Learning label accuracy and final task pass rates are reported separately.

The primary comparison is `optimizer` against `fixed`. Success requires a
strictly higher final pass count in at least two of three repetitions in each
group, plus a strictly higher total across all nine blocks. A tied repetition
does not count as a win. Failed seeds stay among the planned blocks, and
the seed, fixed arm, and optimizer must have complete recorded coverage in
all nine blocks. Observed execution failures count as failed tasks;
incomplete primary evidence leaves the overall conclusion insufficient.
Failures in the other arms are reported separately. Those arms and cost
comparisons are descriptive; this rule is not a statistical significance test.

| Stage | Work-unit ceiling | Executor-attempt ceiling | Run ceiling |
|---|---:|---:|---:|
| Shared seed search per block | 8,000,000 | 64 | 64 |
| Learning per arm | 40,000,000 | 1,024 | 512 |
| Frozen evaluation per arm | 40,000,000 | 1,024 | 512 |

Seed retries share one ceiling. Each arm's total includes the full cost of
its block's shared seed, its learning, and its final evaluation. Whole-study
cost counts each seed once, preserves failed searches, and reports
calibration separately. Work, model calls, and recorded tokens measure
execution accounting. Provider dollar cost needs separate billing evidence.

## Recorded execution

The driver saves the protocol, generated task snapshots, source hashes,
committed source revision, Bun version, and model connection before inference.
Every stage records its input before starting and keeps its attempt directory
after success, failure, or interruption. An incomplete attempt must be
reconciled before another call; missing output does not authorize a retry.

The connection is fixed to `https://api.x.ai/v1`, model `grok-4.5`, with the
credential read from `XAI_API_KEY`. Offline verification reconstructs scores
from the generated truth and stored outputs, checks accounts and attempt
bindings, and checks the recorded model connection. Receipt replay is a
separate execution check; it does not measure task quality.

Commit the reviewed source before freezing a study. Set `STUDY_DIR` to a new,
unused directory, then run these commands from the repository root:

```sh
STUDY_DIR=/absolute/path/to/new-study
bun experiments/cumulative-skill/arms/v6/run.ts init "$STUDY_DIR"
bun experiments/cumulative-skill/arms/v6/run.ts calibrate "$STUDY_DIR"
bun experiments/cumulative-skill/arms/v6/run.ts learn "$STUDY_DIR"
bun experiments/cumulative-skill/arms/v6/run.ts evaluate "$STUDY_DIR"
bun experiments/cumulative-skill/arms/v6/run.ts collect "$STUDY_DIR"
bun experiments/cumulative-skill/arms/v6/replay.ts "$STUDY_DIR"
```

The driver permits learning only after calibration passes. If calibration
stops the study, run `collect` and `replay` to check the completed calibration
record. These last two commands make no provider calls.

## Limits

This protocol measures one model connection on one synthetic task family.
Its labels follow synthetic generation conventions that the program can
infer from examples. The text does not uniquely determine those conventions.
Model calls can vary even for identical saved programs, so separate optimizer
runs do not isolate the causal effect of format repair. The calibration gate
checks this sample's feasibility and available room for improvement; it does
not guarantee either on the nine confirmatory blocks.
