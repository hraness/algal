# V6 stopped after one calibration seed search failed

The September 28, 2026 calibration produced passing starting programs on two
of three corpora. The third search exhausted its eight generation attempts.
The preregistered gate therefore stopped the study, and none of the nine
confirmatory blocks ran.

V6 tested whether labeled training examples and feedback from a program's
training errors could produce a usable starting program for the
cumulative-skill experiment. The [v5 seed postmortem](cumulative-skill-seed-postmortem.md)
motivated this change: its failed seed searches repeatedly generated programs
with the same classifier instructions, without supplying examples or previous
errors to the writer.

The [protocol](https://github.com/hraness/algal/blob/f8ddcf9dc0fb82e638c0a9405d2b0df289b09274/experiments/cumulative-skill/arms/v6/protocol.json)
was committed before inference at revision
`f8ddcf9dc0fb82e638c0a9405d2b0df289b09274`. It fixes task seeds, the
`grok-4.5` model connection, budgets, execution order, and stopping rules.
The [machine-readable result](cumulative-skill-v6-results-2026-09-28.json)
records the calibration outcomes and costs.

## Calibration results

| Corpus | Seed generations | Passing seed | Fixed tests passed | Fixed tests executed | Correct labels |
|---|---:|---|---:|---:|---:|
| `cal-a` | 5 | Yes | 2/8 | 8 | 75/96 |
| `cal-b` | 1 | Yes | 3/8 | 8 | 80/96 |
| `cal-c` | 8 | No | Not run | Not run | Not measured |

Both evaluated programs left room for improvement: each passed no more than
six of eight tests, satisfying that part of the calibration gate. The
requirement for a passing seed on all three corpora failed.

Seven `cal-a` test executions completed successfully and one ended in a
recorded failure. All eight task records are present. The failed execution
counts as a failed task in the 2/8 result and contributes no correct labels
to the 75/96 count. All eight `cal-b` executions completed successfully.
`cal-c` had no passing seed to evaluate.

These are calibration results for fixed programs. No optimizer learning,
retained-arm comparison, or confirmatory test evaluation took place.

## What the seed writer receives

Each calibration corpus starts a separate search for a program that passes
the first acquisition task's validation batch. The first generation receives
the task definition, the library program, and 24 machine-labeled training
records. A correction receives the latest usable program and its recorded
training output beside the expected training output. If no usable program
exists, the writer generates again from the same examples.

The writer's inputs exclude validation labels, outputs, and scores. Validation
is used to select the first passing candidate, so it is a selection set, not
an independent final test. Training failure does not disqualify a candidate
that passes validation. No human labels, manual corrections, or hand-written
rule for choosing among competing issues are added to the run.

Each search allows eight generations under one shared ceiling of 8,000,000
work units, 64 model-call attempts, and 64 runs. Failed and invalid attempts
remain in both the evidence and the cost. These limits match v5. The task
shape, text difficulty, and scoring threshold also remain unchanged.

## The calibration gate

Three fresh calibration corpora, `cal-a`, `cal-b`, and `cal-c`, each define
eight acquisition tasks, 32 further learning tasks, and eight shifted test
tasks. Calibration runs only the seed search and, when it succeeds, the
fixed seed on those eight tests. Each test contains 12 records. Test results
cannot revise the program.

The gate requires both of the following:

- All three searches must produce a seed that passes validation.
- On at least two corpora, the fixed seed must pass no more than six of
  eight tests, leaving room to measure improvement.

A failed gate stops this study. Another protocol would be needed to change
the data, threshold, or search limit. Calibration and the planned comparison
use distinct task seeds and ancestors, also separate from v5. They still
share the same synthetic family's text templates.

A batch passes when `(4 × full-record agreement + exact-summary indicator) / 5`
reaches 0.9. A different number of result rows from the expected batch scores
zero. For a 12-record batch, passing requires at least 11 exact full records
and an exact summary. Correct-label counts are a separate measure; completing
execution does not itself count as passing.

## The comparison that calibration was intended to permit

The plan defines nine fresh blocks, arranged as three repetitions in each of
three groups. These are repeated draws from one task family. Each block
would start its own seed search and share its exact passing program among
four arms: fixed execution, retained reuse, optimizer revision with supported
format repairs, and the same optimizer without those repairs.

Every arm would receive 40 learning tasks with the same budget ceiling of
40,000,000 work units, 1,024 model-call attempts, and 512 runs. All final
programs would be saved before any confirmatory test execution, then each
would run eight fresh shifted tasks without revision. Arm order rotates by
block, and at most three blocks run concurrently.

The primary comparison is optimizer against fixed. Its descriptive success
rule requires a strict win in at least two of three repetitions in every
group, plus a strict win in total across all nine blocks. The primary arms
and seed search must have complete recorded coverage; failed tasks and failed
seed searches remain in the planned denominators. The other arms are
secondary comparisons. This rule is not a statistical significance test.

## Recorded cost

| Corpus and stage | Work units | Charged executor attempts | Input tokens | Output tokens |
|---|---:|---:|---:|---:|
| `cal-a` seed search | 799,170 | 20 | 116,528 | 12,413 |
| `cal-a` fixed tests | 163,654 | 8 | Unknown | Unknown |
| `cal-b` seed search | 120,545 | 4 | 17,972 | 2,532 |
| `cal-b` fixed tests | 180,588 | 8 | 28,166 | 980 |
| `cal-c` seed search | 1,177,198 | 32 | 198,379 | 20,884 |
| Total | 2,441,155 | 72 | Unknown | Unknown |

The total includes every seed attempt and fixed-program test, including the
failed search and terminal test failure. The runtime recorded 72 admitted
runs and 72 charged executor attempts. One failed `cal-a` test call lacks
token usage, so the complete token totals are unavailable rather than
reported as zero. The other 71 recorded effect occurrences sum to 387,413
input tokens and 37,679 output tokens. These are partial per-admission
subtotals, not provider billing. Provider dollar cost is also unavailable.

The failed `cal-a` test was `shift-03`. Its adapter recorded an aborted
transport with external completion uncertain and no usage, then retained the
task as a failed observation. The run was not retried. A failed local receipt
does not establish whether a provider completed or charged the request.

In `cal-c`, generations three through eight received the same already-correct
training feedback and continued to fail validation. The saved records show no
local effect-cache wrapper, no memo directory, and no `cached: true` effect.
Identical receipt content therefore does not show that provider requests were
deduplicated or billed fewer times.

## What the measurements can establish

The labels follow synthetic generation conventions. Their agreement with
program outputs is not a human judgment about ambiguous support messages.
Training examples give the writer evidence about those conventions, but a
passing candidate alone would not identify the rule it learned or establish
that feedback caused the pass.

V6 uses different fresh task draws from v5. It provides no paired estimate of
training feedback's effect on seed success. The two passing searches do not
establish reliable initialization across this task family.

Each model call can return a different answer, including calls using the same
saved program. Equal budget ceilings do not imply equal spending.

The saved record can establish what ran, how it scored, and what the runtime
charged. Offline receipt replay checks recorded execution separately from
task correctness. A calibration outcome alone cannot establish an optimizer
advantage or reproducibility across the planned nine blocks.
