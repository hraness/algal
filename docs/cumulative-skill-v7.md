# V7 stopped after two calibration seed searches failed

The September 29, 2026 calibration produced passing starting programs on two
of four corpora. The other two searches exhausted their eight generation
attempts. The preregistered gate therefore stopped the study, and none of
the nine confirmatory blocks ran.

V7 tested whether a bounded development score and a fixed schedule of
revision modes could give the seed writer a usable signal after its training
output became correct. The [v6 report](cumulative-skill-v6.md) motivated this
change: v6's failed search kept receiving the same already-correct training
feedback while validation continued to fail, with no signal that anything
was wrong.

The [protocol](https://github.com/hraness/algal/blob/741f19ec9f0e82bb8d87a89ff39eeee6e82d01e3/experiments/cumulative-skill/arms/v7/protocol.json)
was committed before inference and frozen at revision
`741f19ec9f0e82bb8d87a89ff39eeee6e82d01e3`. It fixes task seeds, the
`grok-4.5` model connection, budgets, the round schedule, execution order,
and stopping rules. The [machine-readable result](cumulative-skill-v7-results-2026-09-29.json)
records the calibration outcomes and costs. The preregistered file keeps its
pre-run `status` field; changing it after the run would alter the frozen
protocol identity.

## Calibration results

| Corpus | Seed generations | Passing seed | Fixed tests passed | Fixed tests executed | Correct labels |
|---|---:|---|---:|---:|---:|
| `cal-a` | 6 | Yes | 4/8 | 8 | 88/96 |
| `cal-b` | 8 | No | Not run | Not run | Not measured |
| `cal-c` | 8 | No | Not run | Not run | Not measured |
| `cal-d` | 2 | Yes | 4/8 | 8 | 89/96 |

Both evaluated programs left room for improvement, each passing four of
eight tests. The gate required headroom on at least three corpora and a
passing seed on all four; with only two evaluated seeds, both rules failed.
All sixteen fixed test executions completed.

These are calibration results for fixed programs. No optimizer learning,
retained-arm comparison, or confirmatory test evaluation took place.

## What the development signal showed

Each generation that produced an executable candidate but failed selection
ran that candidate once on a separate 12-record development batch, and later
writer requests received the batch pass indicator with its generation and
round mode. Twenty-two candidates were scored this way. Every one failed the
development batch. The score history the writer received was therefore
constant at zero on every corpus, and the two searches that qualified did so
on a generation whose validation pass came without any earlier development
pass.

| Corpus | Generation | Round mode | Training | Validation | Development |
|---|---:|---|---|---|---|
| `cal-a` | 1–5 | contrastive → minimal-rule-rewrite | 1 of 5 passed | Failed | Failed |
| `cal-a` | 6 | fresh-synthesis | Passed | Passed | Not run |
| `cal-b` | 1–8 | full schedule | 6 of 8 passed | Failed | Failed |
| `cal-c` | 1–8 | full schedule | 4 of 8 passed | Failed | Failed |
| `cal-d` | 1 | contrastive-examples | Failed | Failed | Failed |
| `cal-d` | 2 | error-analysis | Passed | Passed | Not run |

The predeclared round modes did what they were designed to do at the request
level: all 24 writer requests were distinct, and no duplicate request
occurred. They did not prevent convergence at the program level. On `cal-b`,
generations seven and eight re-emitted a program already produced earlier in
the search; on `cal-c`, all eight programs were distinct. A repeated program
is retained as evidence and still scored.

The batch-level pass indicator at the 0.9 threshold is a coarse signal: a
12-record batch passes only with at least 11 exact records and an exact
summary. This study cannot separate two explanations for the constant zero:
that the candidates were far from passing on the development batch, or that
the indicator hides progress that a finer score would have shown. Neither
explanation is a reason to revise the protocol after seeing outcomes.

## What the seed writer receives

Each calibration corpus starts a separate search for a program that passes
the first acquisition task's validation batch. The first generation receives
the task definition, the library program, 24 machine-labeled training
records, the generation number, the round mode, and an empty score history.
A correction receives the latest usable program and its recorded training
output beside the expected training output, plus the generation, round mode,
and score history. If no usable program exists, the writer generates again
from the same examples.

The writer's inputs exclude validation and development records, labels,
outputs, and reports. Validation is used to select the first passing
candidate, so it is a selection set, not an independent final test. Training
failure does not disqualify a candidate that passes validation. No human
labels, manual corrections, or hand-written rule for choosing among competing
issues are added to the run.

Each search allows eight generations under one shared ceiling of 8,000,000
work units, 64 model-call attempts, and 64 runs, which the development runs
share. These limits match v5 and v6. The task shape, text difficulty, and
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

A failed gate stops this study. Another protocol would be needed to change
the data, threshold, signal, or search limit. Calibration and the planned
comparison use distinct task seeds and ancestors, also separate from v5 and
v6. They still share the same synthetic family's text templates.

A batch passes when `(4 × full-record agreement + exact-summary indicator) / 5`
reaches 0.9. A different number of result rows from the expected batch scores
zero. Correct-label counts are a separate measure; completing execution does
not itself count as passing.

## The comparison that calibration was intended to permit

The plan defines nine fresh blocks, arranged as three repetitions in each of
three groups, with the same four arms, budgets, rotation, concurrency, and
descriptive primary rule as v6: optimizer against fixed, requiring a strict
win in at least two of three repetitions in every group plus a strict win in
total, with complete recorded coverage of all nine blocks and both primary
arms. This rule is not a statistical significance test.

## Recorded cost

| Corpus and stage | Work units | Charged executor attempts | Input tokens | Output tokens |
|---|---:|---:|---:|---:|
| `cal-a` seed search | 937,813 | 29 | Unknown | Unknown |
| `cal-a` fixed tests | 183,959 | 8 | 29,623 | 986 |
| `cal-b` seed search | 1,051,207 | 40 | 227,174 | 23,627 |
| `cal-c` seed search | 1,177,632 | 40 | 226,132 | 22,894 |
| `cal-d` seed search | 291,041 | 9 | 51,781 | 6,239 |
| `cal-d` fixed tests | 172,401 | 8 | 34,186 | 966 |
| Total | 3,814,053 | 134 | Unknown | Unknown |

The total includes every seed attempt, development run, and fixed-program
test, including the two failed searches. The runtime recorded 134 admitted
runs and 134 charged executor attempts. Token figures above are the
runtime's per-admission accounting, which counts a copied seed receipt in
every stage that contains it. One failed `cal-a` seed call lacks token
usage, so the complete token totals are unavailable rather than reported as
zero. Counting each of the 115 receipt files once, the 114 effect
occurrences with usage sum to 653,407 input tokens and 68,741 output tokens.
These are partial subtotals, not provider billing. Provider dollar cost is
also unavailable.

The failed `cal-a` call was the validation run of generation four's
candidate. Its adapter recorded a failed transport with external completion
uncertain and no usage, then retained the case as a failed validation. The
run was not retried, and that candidate was still scored on the development
batch. A failed local receipt does not establish whether a provider
completed or charged the request; it does mean generation four's validation
miss on `cal-a` is a transport failure rather than a scored miss.

## What the measurements can establish

The labels follow synthetic generation conventions. Their agreement with
program outputs is not a human judgment about ambiguous support messages.
Training examples give the writer evidence about those conventions, but a
passing candidate alone would not identify the rule it learned or establish
that feedback caused the pass.

V7 uses different fresh task draws from v6. It provides no paired estimate of
the development signal's effect on seed success. Two passing searches out of
four, one of which needed six generations, do not establish reliable
initialization across this task family, and a signal that never varied
cannot show whether the writer would have used it.

Each model call can return a different answer, including calls using the same
saved program. Equal budget ceilings do not imply equal spending.

The saved record can establish what ran, how it scored, what the writer was
sent, and what the runtime charged. Offline receipt replay checks recorded
execution separately from task correctness. A calibration outcome alone
cannot establish an optimizer advantage or reproducibility across the
planned nine blocks.
