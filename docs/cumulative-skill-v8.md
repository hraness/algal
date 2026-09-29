# V8 failed its calibration gate and ended the development-feedback line

The September 29, 2026 calibration produced passing starting programs on two
of four corpora. A third search exhausted its eight generation attempts. The
fourth was interrupted by the session that launched it during generation
seven, after the writer call completed and before the candidate ran, and the
protocol forbids retrying it. The gate had already failed on the three
complete blocks: one seed did not qualify, and only two blocks showed
headroom. None of the nine confirmatory blocks ran, and under the
preregistered line rule the development-feedback seed line ends here.

V8 tested one change to v7: the seed writer received the development batch's
agreement score, rounded to hundredths, instead of its pass indicator. The
[v7 report](cumulative-skill-v7.md) motivated this: every v7 development
score was zero, so the writer's score history never varied and could not
show which revisions moved closer to passing.

The [protocol](https://github.com/hraness/algal/blob/dc64c02f9274ae92f5475cc9a9a2a4f2c8e4fd57/experiments/cumulative-skill/arms/v8/protocol.json)
was committed before inference and frozen at revision
`dc64c02f9274ae92f5475cc9a9a2a4f2c8e4fd57`. It fixes task seeds, the
`grok-4.5` model connection, budgets, the round schedule, execution order,
stopping rules, and the line rule. The [machine-readable
result](cumulative-skill-v8-results-2026-09-29.json) records the
calibration outcomes, the interruption, and costs. The preregistered file
keeps its pre-run `status` field; changing it after the run would alter the
frozen protocol identity.

## Calibration results

| Corpus | Seed generations | Passing seed | Fixed tests passed | Fixed tests executed | Correct labels |
|---|---:|---|---:|---:|---:|
| `cal-a` | 2 | Yes | 3/8 | 8 | 89/96 |
| `cal-b` | 8 | No | Not run | Not run | Not measured |
| `cal-c` | 1 | Yes | 1/8 | 8 | 78/96 |
| `cal-d` | 6 completed, 7th interrupted | Unknown | Not run | Not run | Not measured |

Both evaluated programs left room for improvement. The gate required
headroom on at least three corpora and a passing seed on all four. With
`cal-b` exhausted and only two evaluated seeds, both rules failed on the
complete blocks alone; the missing fourth block is a further failing reason,
not the deciding one. All sixteen fixed test executions completed.

These are calibration results for fixed programs. No optimizer learning,
retained-arm comparison, or confirmatory test evaluation took place.

## What the graded signal showed

Each generation that produced an executable candidate but failed selection
ran that candidate once on a separate 12-record development batch, and later
writer requests received its agreement score with its generation and round
mode. Fifteen candidates were scored this way. Their scores ranged from 0.33
to 0.80, and no score history was constant: on `cal-b` the score rose from
0.53 to 0.73 by generation four and then drifted to 0.60; on `cal-d` it rose
from 0.33 to 0.80 by generation five and held there. This is the signal v7
could not deliver. It did not convert into a selection pass on either
search. No scored candidate reached 0.9 on its development batch, and the
two searches that qualified did so on a generation with no development
score of its own.

| Corpus | Generation | Round mode | Training | Validation | Development score |
|---|---:|---|---|---|---|
| `cal-a` | 1 | contrastive-examples | Failed | Failed | 0.53 |
| `cal-a` | 2 | error-analysis | Passed | Passed | Not run |
| `cal-b` | 1–3 | contrastive → invariant-extraction | Failed | Failed | 0.53, 0.53, 0.47 |
| `cal-b` | 4–8 | counterexample-search → fresh-synthesis | Passed | Failed | 0.73, 0.67, 0.67, 0.67, 0.60 |
| `cal-c` | 1 | contrastive-examples | Failed | Passed | Not run |
| `cal-d` | 1 | contrastive-examples | Passed | Failed | 0.33 |
| `cal-d` | 2–3 | error-analysis, invariant-extraction | Failed | Failed | 0.47, 0.40 |
| `cal-d` | 4–6 | counterexample-search → fresh-synthesis | Passed | Failed | 0.73, 0.80, 0.80 |
| `cal-d` | 7 | fresh-synthesis | Writer completed; candidate never ran | | |

All 17 completed writer requests were distinct, and no duplicate request
occurred. On `cal-b`, generation seven re-emitted the program from
generation six, which the driver retained and scored again; the other
programs were distinct. Training passed on every `cal-b` generation from
four onward and every `cal-d` generation from four onward while validation
kept failing, which is the situation the development signal was designed to
address. The writer had a rising score and used it to hold rather than to
improve.

Two calibrations under this line now show that neither a pass indicator nor
a graded agreement score produced reliable seed acquisition in this
synthetic family at the 0.9 threshold. That is a negative result about the
procedure, not a measurement of any learning arm. The line rule was fixed
before inference; it ends the axis rather than inviting a retuned signal,
threshold, or generation limit.

## The interruption

The calibration ran under a session monitor whose 30-minute deadline killed
the host process at about 13:52 local time, an operator error in the session
that launched it, not a protocol or provider event. The last recorded write
is the generation-seven writer receipt on `cal-d` at 13:52:02. The driver
records `interrupted` only when an error is thrown, so the retained `cal-d`
snapshot reads `in-progress` with generation seven in flight. The protocol
forbids inferring a retry from missing output, and the stage guard refuses a
second seed store, so the block stays incomplete.

A reconciliation record, saved beside the driver's artifacts and packaged in
the evidence archive, replaces the collection the driver could not produce.
It reproduces the three complete rows through the frozen driver's own
inspection code, verifies the `cal-d` binding, snapshot chain, account,
route, and receipts, checks that the six completed `cal-d` attempts pass the
driver's seed verification treated as a six-generation summary, computes the
gate decision over the complete blocks, and replays all 84 receipt files
with the same verifier the driver's replay uses. The record is
deterministic; the extracted archive reproduces it exactly.

## What the seed writer receives

Each calibration corpus starts a separate search for a program that passes
the first acquisition task's validation batch. The first generation receives
the task definition, the library program, 24 machine-labeled training
records, the generation number, the round mode, and an empty score history.
A correction receives the latest usable program and its recorded training
output beside the expected training output, plus the generation, round mode,
and score history of `{generation, round, score}` entries. If no usable
program exists, the writer generates again from the same examples.

The writer's inputs exclude validation and development records, labels,
outputs, and reports. Validation is used to select the first passing
candidate, so it is a selection set, not an independent final test. Training
failure does not disqualify a candidate that passes validation. No human
labels, manual corrections, or hand-written rule for choosing among competing
issues are added to the run.

Each search allows eight generations under one shared ceiling of 8,000,000
work units, 64 model-call attempts, and 64 runs, which the development runs
share. These limits match v5 through v7. The task shape, text difficulty, and
scoring threshold also remain unchanged.

## The calibration gate

Four fresh calibration corpora, `cal-a` through `cal-d`, each define eight
acquisition tasks, 32 further learning tasks, and eight shifted test tasks.
The seed task is the first acquisition task with a fourth, development batch
of 12 records; its training, validation, and holdout batches are
byte-identical to the learning task's. Calibration runs only the seed search
and, when it succeeds, the fixed seed on the eight tests. Test results cannot
revise the program.

The gate requires both of the following:

- All four searches must produce a seed that passes validation.
- On at least three corpora, the fixed seed must pass no more than six of
  eight tests, leaving room to measure improvement.

A failed gate stops this study and, by the line rule, the development-feedback
seed line. Calibration and the planned comparison use distinct task seeds and
ancestors, also separate from v5, v6, and v7. They still share the same
synthetic family's text templates.

A batch passes when `(4 × full-record agreement + exact-summary indicator) / 5`
reaches 0.9. A different number of result rows from the expected batch scores
zero. The development score is that same value before thresholding.
Correct-label counts are a separate measure; completing execution does not
itself count as passing.

## The comparison that calibration was intended to permit

The plan defines nine fresh blocks, arranged as three repetitions in each of
three groups, with the same four arms, budgets, rotation, concurrency, and
descriptive primary rule as v6 and v7: optimizer against fixed, requiring a
strict win in at least two of three repetitions in every group plus a strict
win in total, with complete recorded coverage of all nine blocks and both
primary arms. This rule is not a statistical significance test.

## Recorded cost

| Corpus and stage | Work units | Charged executor attempts | Input tokens | Output tokens |
|---|---:|---:|---:|---:|
| `cal-a` seed search | 329,240 | 9 | 49,744 | 5,944 |
| `cal-a` fixed tests | 180,292 | 8 | 31,139 | 971 |
| `cal-b` seed search | 1,369,452 | 40 | 236,230 | 23,237 |
| `cal-c` seed search | 114,734 | 4 | 19,630 | 2,749 |
| `cal-c` fixed tests | 164,233 | 8 | 29,489 | 981 |
| `cal-d` seed search, six generations | 965,241 | 30 | 157,637 | 16,130 |
| `cal-d` generation-seven writer call | 46,412 | 1 | 12,304 | 2,046 |
| Total | 3,169,604 | 100 | 536,173 | 52,058 |

The total includes every seed attempt, development run, and fixed-program
test, including the failed search and the interrupted one. The first six
rows are the runtime's per-admission accounting, which counts a copied seed
receipt in every stage that contains it. The generation-seven writer call on
`cal-d` is recorded only as a receipt: no attempt or account references it,
so the reconciliation adds it from the receipt's own work and usage. Every
effect recorded usage. Counting each of the 84 receipt files once, the
effects sum to 465,290 input tokens and 48,752 output tokens. These are
runtime figures, not provider billing. Provider dollar cost is unavailable.

## What the measurements can establish

The labels follow synthetic generation conventions. Their agreement with
program outputs is not a human judgment about ambiguous support messages.
Training examples give the writer evidence about those conventions, but a
passing candidate alone would not identify the rule it learned or establish
that feedback caused the pass.

V8 uses different fresh task draws from v7. It provides no paired estimate of
the graded score's effect on seed success. Two passing searches out of four,
one failed search, and one unfinished search do not establish reliable
initialization across this task family. A score that rose and then held
below the threshold shows the writer received information; it does not show
what the writer did with it.

Each model call can return a different answer, including calls using the same
saved program. Equal budget ceilings do not imply equal spending.

The saved record can establish what ran, how it scored, what the writer was
sent, what the runtime charged, and where the run stopped. Offline receipt
replay checks recorded execution separately from task correctness. A
calibration outcome alone cannot establish an optimizer advantage or
reproducibility across the planned nine blocks.
