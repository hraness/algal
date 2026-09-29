# V7 protocol design after the V6 calibration stop

V6 stopped before its nine-block comparison because one of three seed searches
failed. The failure diagnosis found a specific information gap: in `cal-c`,
the writer's training output had become correct, but generations three through
eight received the same training feedback and no indication that the separate
selection batch still failed. V7 is a new protocol design for that failure.
It does not alter V6 source, task data, results, or claims. No V7 provider call
has occurred.

## Design change

V7 keeps the V6 model route, synthetic record-triage family, scorer threshold,
resource ceilings, four arms, and primary descriptive comparison. Its seed
task has four independent roles:

| Split | Size | Writer visibility | Use |
| --- | ---: | --- | --- |
| `train` | 24 | Records and labels | Initial examples and exact training corrections |
| `development` | 12 | Score only | Bounded signal about whether a revision generalizes |
| `selection` | 12 | None | First-passing-candidate gate; untouched by writer requests |
| Frozen tasks | 8 tasks × 12 records | None | Fixed evaluation after calibration or learning |

The writer receives the task specification, library, training examples,
previous training actual-versus-expected output, the development score
history, the generation number, and a predeclared round mode. It never receives
selection records, labels, outputs, scores, or reports. Development feedback
contains only `passed`, `total`, `generation`, and `round`; it cannot reveal a
record-level correction. The first candidate that passes the untouched
selection split qualifies the seed.

The eight round modes are fixed before inference: contrastive examples,
error analysis, invariant extraction, counterexample search, minimal-rule
rewrite, and three fresh-synthesis rounds. The generation and mode make each
writer request distinct even when the preceding training evidence is
unchanged. A duplicate request digest is retained as a protocol failure and is
never silently retried. A repeated manifest is also retained as a charged
attempt; it can qualify only by independently passing selection.

The development split is a search signal, not a final test. Selection remains
the seed gate, so V7 reports the distinction explicitly and does not call
selection an untouched final evaluation. Frozen tasks remain outside all seed
writer inputs.

## Calibration gate

V7 defines four fresh calibration blocks, `cal-a` through `cal-d`, with fresh
task and ancestor seeds absent from V5 and V6. Every block runs an eight-round
seed search and, when it qualifies, its fixed seed on eight fresh frozen tasks.
The confirmatory study starts only if all four seeds qualify and at least three
fixed seeds pass no more than six of eight frozen tasks. Otherwise the driver
saves every attempt, collects the negative result, and stops. The protocol,
threshold, task seeds, split sizes, round schedule, and budgets cannot change
after seeing calibration outcomes.

If calibration passes, nine fresh confirmatory blocks run in three groups of
three. Each block shares its exact seed among fixed, retained, optimizer, and
optimizer-raw arms. All eligible learning heads are saved before frozen
evaluation. The primary descriptive rule remains a strict optimizer win in at
least two of three blocks in each group and in aggregate. Ties do not win;
secondary-arm failures are reported separately; no program is activated in
production.

## Limits

V7 tests a revised supervised seed-acquisition procedure in one synthetic
template family. It cannot identify a causal effect of development feedback
without a separate randomized ablation. It cannot establish a learned human
priority convention, broad task competence, provider billing, or production
benefit. The calibration gate is a feasibility rule for this sample, and
failure would remain a negative result rather than a reason to revise the
protocol during the run.

The implementation phase must add a versioned task split contract, a bounded
development-score receipt, a writer-request identity that includes the fixed
round mode, duplicate-request accounting, offline verification, and a new
source freeze. Only after those checks pass can a fresh study directory be
initialized and reviewed provider access considered.
