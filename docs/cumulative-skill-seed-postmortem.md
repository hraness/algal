# Why two v5 seed searches failed

Both failed seed searches in the [v5 study](cumulative-skill-experiment.md)
produced valid, runnable programs. Their classification outputs disagreed with
the synthetic generator's answers. All 16 candidates completed execution; none
passed its validation batch within the eight-generation limit.

This analysis uses the saved September 28, 2026 executions. It made no new
provider calls and left the published v5 results unchanged.

| Corpus | Generations | Training labels correct | Validation labels correct | Scored batches passed |
| --- | ---: | ---: | ---: | ---: |
| v5-b | 8 | 156/192 | 82/96 | 0/16 |
| v5-c | 8 | 167/192 | 58/96 | 0/16 |

The training and validation counts refer to promotion evaluations. Each attempt
also ran an initial training batch, which contributes to cost. These repeated
evaluations of the same batches are not independent test samples.

## The failures occurred in classification

The saved candidates applied the task's rules and computed summaries correctly
for the labels they returned. Their label errors then changed the expected
results and summaries. Two raw manifests needed the supported repair to their
input-view declaration; both repaired programs completed normally.

The scorer requires the expected number of output rows and computes
`(4 × exact-row fraction + exact-summary indicator) / 5`, with a passing
threshold of 0.9. An incorrect summary caps the score at 0.8. Every scored batch
in these two seed searches had an incorrect summary. Both seed tasks include a
count for each label, so even one wrong label changes that summary. On their
12-record validation batches, passing therefore requires all 12 labels to be
correct.

The [seed driver](../experiments/cumulative-skill/arms/v5/seed.ts) started each
attempt with an empty catalog. Its generator received the task definition and
library program, without training examples or a previous attempt's errors.
Across all 16 candidates, the classifier prompt and deterministic processing
programs remained the same as the library's. Repeating generation changed
metadata and some budgets, but supplied no new information for correcting the
classifier.

## The synthetic labels have a narrow meaning

The record generator chooses a target issue, renders it first in the body, and
may append other issues or use a misleading subject. Those competing requests
are not marked as background context. The classifier's generic instruction to
choose the best match from the subject and body does not state that priority
convention.

For example, one saved validation message used the subject “What do you store
about me” while its body asked about missing API documentation. The generator
labeled it `documentation`; the classifier returned `privacy-request`.
Another described an API failure followed by an account-access problem. The
generator labeled the first issue, while the classifier chose the second.

These are disagreements with the generator's convention. They are not
human-reviewed judgments about ambiguous support messages. The traces show
the instructions, responses, and scores; they do not establish how the model
reasoned internally.

## Recorded cost

| Corpus | Work units | Model calls | Input tokens | Output tokens |
| --- | ---: | ---: | ---: | ---: |
| v5-b | 1,041,145 | 32 | 110,784 | 15,473 |
| v5-c | 785,959 | 32 | 106,480 | 15,368 |
| Total | 1,827,104 | 64 | 217,264 | 30,841 |

Every recorded call includes token usage. Work units are runtime accounting,
and token counts are recorded executor usage; provider dollar cost remains
unavailable. Content-identical execution records are counted once per admitted
run, without assuming provider caching.

## The next experiment

The [v6 protocol](../experiments/cumulative-skill/arms/v6/README.md) tests whether
training examples and feedback from previous training errors can produce a
passing seed. Validation answers remain outside the writer's inputs, and the
existing task distribution, scoring threshold, and seed-search limits remain
fixed. The writer is asked to infer a reusable procedure from training examples
and recorded training feedback; the experiment does not insert the generator's
priority convention into the prompt by hand.

Three separate calibration corpora determine whether the new seed process
passes validation on these tasks and leaves enough failing tasks for later
improvement to be measured.
The preregistered rule either permits the nine-block study or stops it. A seed
that already solves nearly every calibration task would leave little room for
an optimizer to improve.

V6 stopped at that gate because one seed search exhausted its eight attempts.
The [V7 protocol design](../experiments/cumulative-skill/arms/v7/README.md)
keeps the V6 family and scorer while adding a bounded development signal,
predeclared revision modes, and a separate untouched selection split. No V7
provider call has occurred.
