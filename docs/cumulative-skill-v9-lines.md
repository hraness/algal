# Three candidate v9 lines and the choice of the pool

After v8 ended the development-feedback seed line on September 29, 2026,
three candidate protocols were designed from the v8 record alone. Each names
the same v8 basis commit `dc64c02f` and the same 167 previously used seeds,
and each was given its own reserved seed range. The same day the decision
was to implement one of them, the conditional pool, and to record the other
two as proposals with the reasons they are not run. All three reserved
ranges stay in the shared seeds ledger so no later protocol reuses them by
accident. None of the three has made a provider call.

| Line | Axis | Change from v8 | Reserved seeds | Status |
|---|---|---|---|---|
| threshold | seed qualification measure | Removes the development batch, returns the writer to training-only feedback, and adds a second qualification tier: after eight generations without a strict pass, the candidate with the most exact validation rows qualifies when it has at least 11 of 12 | `91000001` to `91000084` (52, plus 32 for spare blocks) | Proposal, not run |
| diagnostic | seed writer feedback | Replaces each development history entry's score with bounded class-confusion counts (expected class, emitted class, count) beside the score, row count, and summary flag | `92000001` to `92000052` | Proposal, not run |
| pool | study design | Seed procedure v8 verbatim; 16 fresh blocks seeded in order until six qualify; the four arms run on the six lowest-index qualified blocks | `93000001` to `93000064` | Implemented, not frozen |

The [v9-pool protocol](cumulative-skill-v9-pool-protocol.md) records the
implemented line. This page records the other two and the retrodiction that
bears on all three.

## The threshold line

The line's hypothesis is that the seed gate's tolerance depends on a random
property of the validation batch rather than on the writer. The agreement
score passes at 11 of 12 exact rows only when the summary is also exact, and
the family declares a per-label summary on about half of all batches; on
such a batch one wrong label changes a declared count, so the gate is a
12-of-12 rule. The archives show that split: all 13 candidates that reached
11 of 12 rows on a per-label batch failed the gate, and both 11-of-12
candidates on other batches passed (v6 `cal-b` generation one, v8 `cal-c`
generation one). A second tier that accepts at least 11 exact rows after
eight failed generations would make the tolerance the same on every draw.
Its own retrodiction predicts that the tier converts two of the five
archived failures (v7 `cal-c`, v8 `cal-b`) and none of the three multi-miss
failures, raising the per-search qualification rate from 6 of 11 to about 8
of 11 and giving its four-of-four calibration gate a pass chance of about
0.28.

It is not run because the comparison it exists to enable stays almost
unreachable. After a gate pass the v8 design still needs nine further
confirmatory seeds, a chance of about 0.06 at 8 of 11, so the comparison
becomes runnable with probability about 0.017 without spare blocks. The
expected outcome is a calibration-only report after about 3.7M work units
and 114 calls, followed, on a gate pass, by an insufficient comparison after
about 6.9M more. Adding six spare confirmatory blocks would raise the
coverage chance to about 0.91, at a whole-study cost near 100M work units.
The line's tier-two hypothesis, that unqualified searches split into
single-persistent-miss searches at 11 of 12 and multi-miss searches that
stay below it, can be tested at zero provider cost on the stored seed
receipts of the pool line, whose seed stage is the v8 procedure on up to 16
fresh draws. The v9-pool protocol therefore carries that hypothesis as a
preregistered offline analysis, and any decision to run the threshold line
with spares waits on that reading.

## The diagnostic line

The line's hypothesis is that the writer needs to know which class
boundaries its procedure gets wrong. The v8 score is a function of exact
rows and the summary bit only, so equal scores hide different confusions. On
v8 `cal-b` the same development confusion persisted on all eight generations
and the single validation blocker persisted on all eight, while training
output was exact from generation four on, so the writer had no record-level
location anywhere. The line would give it aggregate (expected class, emitted
class, count) pairs from the development batch, never records, ids, text,
outputs, or summaries, and would measure offline whether named pairs were
repaired on the next generation, against an archived no-diagnostic repair
rate of 19 of 73 transitions (0.26).

It is not run for three reasons. First, the archive argues against its
direct mechanism: in all 37 generation pairs from v7 and v8 with both
batches scored, the exact pair that blocked validation never appeared among
that generation's development confusions (0 of 37), so only class-boundary
generalization could convert a repair into a validation pass. Second, its
gate is v8's unchanged four-of-four rule, whose chance under the recorded
rate of six qualifications in 13 fresh searches from v5 to v8 is about 0.045
(seven of 14 counting the reused v4 corpus, about 0.06; the line's own
design used six of 14 and 0.034), and this would be the fifth calibration at
that gate after v5, v6, v7, and v8. Third,
it is on the axis the v8 line rule closed: it reads the same development
batch through the same writer input, the v8 protocol page reads that rule
as bounding spending on the idea to the v7 and v8 calibrations, and the
line's own design states that if that reading governs it is not to be run.
No dated decision to override that reading was recorded. The no-diagnostic
baseline the line would need comes from the pool line's development records
without further spend.

## Retrodiction: exact validation rows per generation in v7 and v8

The table was computed offline on September 29, 2026 from the v7 and v8 seed
stores' selection reports, with row equality as the study grader defines it.
A batch score of `(4 × exact rows / 12 + exact summary) / 5` passes at 0.9,
so passing needs 12 of 12, or 11 of 12 with an exact summary.

| Search | Generations | Most exact validation rows | Pattern |
|---|---:|---|---|
| v7 `cal-a` | 6 | 12 (qualified at generation six) | 10, 10, 11, 11 on the scored earlier generations |
| v7 `cal-b` | 8 | 9 | mostly 6 of 12 with an exact summary; far from passing |
| v7 `cal-c` | 8 | 11 | 11, 11, 10, 10; the summary wrong each time |
| v7 `cal-d` | 2 | 12 (qualified at generation two) | |
| v8 `cal-a` | 2 | 12 (qualified at generation two) | generation one was 11 of 12 |
| v8 `cal-b` | 8 | 11 | every one of eight generations exactly 11 of 12 with a wrong summary: one label away, eight times |
| v8 `cal-c` | 1 | 11 (qualified at generation one) | 11 of 12 with an exact summary scores 0.933; 11 passes when the wrong label does not touch the summary |
| v8 `cal-d` | 6 of 8, then interrupted | 8 | 7 to 8 of 12; far from passing although the development score reached 0.80 |

Four observations follow from the table.

- Exact rows equal correct labels on every case: the only error mode is the
  class label, and decision, queue, and priority follow the label.
- A pure row rule at 11 of 12 would have qualified v7 `cal-c` (generation
  two) and v8 `cal-b` (generation one) but not v7 `cal-b` or v8 `cal-d`, so
  v7 would have been three of four and v8 three of four. A threshold change
  alone does not make an all-four gate pass; searches split into a
  one-away kind and a far kind.
- The threshold line and the conditional-pool line are therefore
  complementary rather than independent: the pool's seed stage samples the
  same split on fresh draws.
- A single wrong label usually breaks the summary, not always: v8 `cal-c`,
  and v7 `cal-b` on generations one to three, six, and eight, had an exact
  summary with wrong rows.

## Limits

These are design records. The threshold and diagnostic figures are those
lines' own estimates from the v6 to v8 archives, which pool three writer
regimes (no rounds, a pass indicator, a graded score); no archived search
ran either line's writer, so the rates are borrowed rather than measured.
The pool line's protocol is implemented and not frozen. Whether its
comparison runs depends on its seed stage, and its
[protocol page](cumulative-skill-v9-pool-protocol.md) states what a result
would and would not establish.
