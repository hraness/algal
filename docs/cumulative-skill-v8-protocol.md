# V8 protocol: a graded development score

V7 stopped at its calibration gate. Its diagnosis is narrower than V6's: the
writer did receive a development signal, but that signal never varied. All 22
candidates scored on the development batch failed the 0.9 threshold, so every
score history was a list of zeros, and the searches on `cal-b` and `cal-c`
reached generation eight without a selection pass. A pass indicator at a
threshold no candidate reached carries no information about which revisions
moved closer to it. V8 is a new protocol for that failure. It does not alter
V7 source, task data, results, or claims.

## Design change

V8 changes one input. The development feedback entry for a scored candidate
is `{generation, round, score}`, where `score` is the value of the same
agreement program whose 0.9 threshold defines the pass gate, rounded to
hundredths: `(4 × full-record agreement + exact-summary indicator) / 5`. A
candidate with nine of twelve records right and a wrong summary reports
0.6; the pass indicator reported 0 for it and for a candidate with nothing
right. An incomplete or refused run reports 0.

Everything else is V7: the four seed roles, the eight-round schedule and its
modes, the duplicate-request and repeated-manifest rules, first-passing
selection on the untouched `validation` split, budgets, model route, task
family and shape, and the calibration gate. The writer still never receives
development or selection records, labels, outputs, summaries, or reports.
The score is a single bounded number per generation; it cannot identify
which record was wrong.

| Split | Size | Writer visibility | Use |
| --- | ---: | --- | --- |
| `train` | 24 | Records and labels | Initial examples and exact training corrections |
| `development` | 12 | Agreement score only | Graded signal about whether a revision generalizes |
| `selection` | 12 | None | First-passing-candidate gate; untouched by writer requests |
| Frozen tasks | 8 tasks × 12 records | None | Fixed evaluation after calibration or learning |

## Calibration gate and line rule

V8 defines four fresh calibration blocks with task and ancestor seeds absent
from V5, V6, and V7. The confirmatory study starts only if all four seeds
qualify and at least three fixed seeds pass no more than six of eight frozen
tasks. Otherwise the driver saves every attempt, collects the negative
result, and stops.

The protocol also fixes a line rule before inference: if this calibration
fails, the development-feedback seed line ends. A further protocol on this
axis would need a new hypothesis, not a retuned signal, threshold, or
generation limit. This bounds spending on one idea to the V7 and V8
calibrations.

## What a result can and cannot show

If the gate passes, the nine-block comparison runs as planned in V7, and the
V8 calibration establishes only that a graded signal coexisted with four
qualifying searches in this sample. V7 and V8 draw different tasks, so their
seed outcomes are not a paired estimate of the signal change; a randomized
ablation would be needed for a causal claim. If the gate fails, the two
calibrations together show that neither a pass indicator nor a graded
agreement score produced reliable seed acquisition in this synthetic family
at the 0.9 threshold, which is a negative result about the procedure, not a
measurement of any learning arm.

The study cannot establish a learned human priority convention, broad task
competence, provider billing, or production benefit.

## Implementation

The v8 driver is the v7 driver with the development record changed:
`algal.study-development-score.v2` carries `score` in place of `passed` and
`total`, the writer's `development` input lists `{generation, round, score}`,
and offline verification recomputes each score from the stored receipt with
the agreement program and rejects a score that differs by a hundredth. The
protocol parser pins the feedback fields, the V7 basis commit, and the line
rule. Task and ancestor seeds `81000001`–`81000052` are checked against the
115 seeds used by V5, V6, and V7.

The study was frozen from source commit `dc64c02f` and calibrated on
September 29, 2026. The gate failed: one seed search exhausted eight
generations, two fixed seeds showed headroom, and the fourth search was
interrupted by the launching session during generation seven and not
retried. The graded score varied (0.33 to 0.80) but no scored candidate
reached the threshold. Under the line rule the development-feedback seed
line ends. The [v8 report](cumulative-skill-v8.md) records the outcome; the
preregistered `protocol.json` is unchanged, including its pre-run `status`
field.
