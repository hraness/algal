# Cumulative-skill experiment

This page records the experiment described in
[the vision](vision.md#what-would-justify-the-claim): whether keeping and
composing earlier procedures makes the system better at later work than
equally resourced alternatives. It preserves the original design and reports
the exploratory studies below. The broader claim remains open.

## Claim under test

Under a fixed model and a controlled budget, retaining and composing earlier
procedures measurably improves performance on later unseen tasks, and the
improvement survives independent evaluation.

## Task family

Compositional record-triage pipelines. One task is a declared spec plus a
bounded batch of input records:

- The spec names an issue taxonomy, a record schema, decision rules
  (thresholds, escalation criteria), and an output format.
- Input records are bounded JSON values drawn from the spec's schema.
- A conforming program classifies each record, applies the declared rules,
  and emits structured outputs (labels, decisions, summaries) that a
  deterministic grader scores. Judgment steps run as `agent` cells;
  deterministic steps run as `fn`/`expr` cells. Grading compares structured
  outputs exactly or through a declared `algal.expr.v1` scorer. No model
  judges the result.

Tasks are generated from a seeded family specification, so the task list is
reproducible and auditable. Three phases, disjoint by construction:

1. **Acquisition** (8 tasks): the system works the initial set and may keep
   procedures it develops.
2. **Unseen** (8 tasks): related but unseen tasks: new taxonomies, record
   shapes, and rule sets drawn from the same family generator under a
   different seed.
3. **Shift** (4 tasks): the environment moves. The taxonomy is revised,
   the record schema gains fields, and thresholds change. Procedures that
   only memorize the old environment should fail; procedures that captured
   the family's structure should adapt cheaply.

Per-phase task counts bound the first study's cost. A failure of the harness
is not a failure of the hypothesis; the study records both.

## Arms

Every arm runs the same tasks, through the same executor configuration and
tool surface, against its own `algal.habitat-budget.v1` account with the
same ceilings. The account charges generation, evaluation, promotion, and
task runs alike, so cost comparisons include maintenance, not only
execution.

1. **retained**: before each task the harness consults the project catalog
   for a procedure whose recorded interface and cases fit the task family
   signature; a hit runs the vendored manifest. After each task, passing
   programs may be promoted into the catalog through the ordinary foundry
   path (train/validation cases, holdout untouched). A later task may reuse
   or deliberately revise a kept procedure. By default the promote hook
   re-evaluates the executed manifest after every task, hits included —
   recurring qualification of a kept procedure is charged like its first
   evaluation. The arm option `citeKeptEvaluation` changes that: a task
   that ran an already-kept manifest re-cites the entry's stored promotion
   evidence (`evaluated: false` in the run record) and the hit charges the
   task run alone, so retention can amortize over a horizon. A second arm
   option, `normalizeEmitted`, applies bounded deterministic repairs to a
   generator emission that fails the manifest parse — the observed classes
   are a `view.inputs` list holding `"*"` (replaced by the contract's
   wildcard string) and a stray `id` on an `expr` descriptor (dropped);
   applied repair kinds are recorded on the run record's
   `generator.normalized`, so repaired validity stays distinguishable from
   emitted validity.
2. **ablation**: identical machinery, catalog consultation disabled. Every
   task generates and evaluates fresh under the same budgets. This arm is
   the load-bearing comparison: the same system without access to what it
   kept.
3. **fresh**: a single agent call generates a complete manifest per task
   directly, with no evaluation loop and no library. The common
   write-code-on-demand baseline.
4. **fixed**: one hand-authored manifest, written to be strong across the
   family, runs every task. The non-adaptive upper bound.
5. **optimizer**: the retained consult-and-promote path plus revision and
   demotion. A consulted entry cites its stored promotion evidence inside
   a `requalifyAfter` task window; past the window the hit re-qualifies on
   the declared cases — a pass refreshes the window, a failure retires the
   entry. A hit that fails outright, or whose outputs miss the task's
   declared `expect` (under the arm's scorer, or canonical equality),
   retires the entry on the evidence record's digest. Every trigger runs
   the declared `reviser` generator with the task spec, the kept manifest,
   and the stored evidence record; its emitted manifest is evaluated on
   the same cases, and a passing revision joins the catalog carrying
   `supersedes` back to the retired index. Revision repairs the catalog,
   not the task that tripped it; the episode lands on the run record's
   `revise` field and aggregates to `revisionsTotal`/`demotionsTotal`.

A further arm, a single fixed pipeline tuned on training cases (the
conventional-workflow-with-optimizer comparison), is proposed but deferred
unless its marginal cost is small.

## Measures (pre-registered)

- **Held-out success**: pass rate on the unseen and shift phases at matched
  cumulative account spend, using cases the task-generation never exposed.
- **Cost per success**: total account work and executor attempts divided by
  held-out graded passes, per arm. The report's legacy `tasksPassed` and
  `heldOutPassed` fields count completed executions. They do not grade the
  output; correctness requires comparing outputs with expectations.
- **Reuse contribution** (retained arm): which promoted catalog entries were
  run by later tasks, computed by joining catalog and revision records to
  run receipts in the program database, not by reading narratives.
- **Human correction effort**: interventions recorded during the study.
  A task entry may declare `corrections` records (a kind label and a note,
  at most 32 per task) that the run record carries and the report sums per
  arm; the design targets zero and reports deviations.

## Pre-registered failure-mode checks

- **Evaluation rewards the wrong thing.** Graders are deterministic; held-out
  tasks come from a separately seeded generation. In an online optimizer
  study, a task's expectation becomes feedback after its original execution
  is scored. Later tasks therefore measure adaptation with feedback, not a
  frozen program evaluated on a sealed test set.
  An overfitting check requires validation and held-out correctness measured
  by the same grader. The legacy report's `holdoutGaps` combines validation
  correctness with held-out completion, so it cannot establish that gap.
- **Reuse creates complexity rather than competence.** The study counts
  catalog consultations that missed, vendored procedures that failed
  admission on reuse, and kept entries never run again.
- **Apparent learning is extra spending.** Arms compare at matched total
  budget; generation, evaluation, and promotion runs charge to the same
  account as task runs. An arm that wins only by spending more does not win.

## Method

- Every run is recorded: `algal experiment <config.json>` runs one arm over
  its task set and writes an `algal.experiment-session.v1` record naming
  the arm's `algal.habitat-budget.v1` account, its
  `algal.experiment-catalog.v1` kept-procedure list, and one
  `algal.experiment-run.v1` record per task in session order. Receipts,
  accounts, catalogs, and reports live in the store. `algal replay`
  reproduces any arm's run bit-for-bit.
- Harness validation runs use scripted executors (deterministic, free); the
  reported study uses one declared live executor configuration across all
  arms.
- `algal experiment report <config.json>` rolls the study's sessions into a
  bounded `algal.skill-experiment.v1` report: the config cites each arm's
  session record, and the rollup re-reads the account, catalog, and task
  records the session names, reconciles the account against stored receipts
  and manifests, joins kept manifests to later task receipts through the
  program index, and recomputes execution, accounting, and reuse counts. The report records
  counts and digests; conclusions are prose beside it, scoped to what the
  record shows. `experiment inspect` renders the same record as a table.
- Independent evaluation: `algal experiment verify` re-derives every
  execution aggregate from the cited session, account, catalog, and task
  records, checks revision and demotion evidence and each promotion's stored
  evaluation, and flags stored
  task records a session does not cite; manifest runs can be
  cross-verified by the native runtime where covered. Run records carry
  the optional `corrections` list and the report counts it per arm, but
  the arm runner produces none itself: it records only corrections an
  operator declares on a task entry, so a live human-in-the-loop measure
  still waits on a producer that records interventions.

## Studies run

### v2 · 20 tasks (8 acquisition / 8 unseen / 4 shift)

Verified report `sha256:6fdc8942991eff306886c90b039802fdc49ac8cbceef6f4f27f51a0c404e1c99`
(80 records, zero mismatches, zero uncited), one live executor
configuration across arms (xAI `grok-4.5`).

| arm | completed tasks | held-out completed | work | runs | catalog |
|-----|-------|----------|------|------|---------|
| fixed | 20/20 | 12/12 | 411,360 | 20 | - |
| retained | 16/20 | 10/12 | 1,203,751 | 59 | 20 (18 hit, 2 miss), 1 promotion |
| ablation | 18/20 | 11/12 | 611,418 | 38 | - |
| fresh | 17/20 | 10/12 | 586,858 | 37 | - |

Post-hoc held-out grading (receipt outputs vs expected): fixed mean 0.978,
retained 10/10 graded runs at 1.000, ablation 0.976, fresh 0.973. The
promoted manifest was reused on 18 later tasks and scored 1.000 on every
held-out run it completed. Two retained shift tasks were lost to transient
provider transport failures, not capability failures.

### v3 · 48 tasks (8 acquisition / 32 unseen / 8 shift)

Corpus revision v3: same deterministic family generator, repaired semantic
templates (billing inquiry reworded as questions, dispute phrasing moved to
billing-dispute, integration help reworded as setup questions, error-report
phrasing moved to bug-report). Unseen extended to the parser maximum of 32;
shift extended to 8. Jev audit of the repaired templates: 956/960 record
agreement, zero high-confidence contests.

Verified report `sha256:117af73c0dee47f3472237fad40b9ec1cccf1a604fe2a18445616428d7ae24ba`
(192 records, zero mismatches, zero uncited), same live executor
configuration (xAI `grok-4.5`).

| arm | completed tasks | held-out completed | work | runs | catalog |
|-----|-------|----------|------|------|---------|
| fixed | 48/48 | 40/40 | 933,716 | 48 | - |
| retained | 48/48 | 40/40 | 3,444,384 | 145 | 48 (47 hit, 1 miss), 1 promotion |
| ablation | 38/48 | 30/40 | 1,304,446 | 86 | - |
| fresh | 47/48 | 39/40 | 1,486,118 | 95 | - |

Post-hoc held-out grading: fixed 46/48 exact (mean 0.992), retained 46/48
(0.992), fresh 45/47 (0.991), ablation 36/38 (0.989). Three residual record
disagreements, identical across arms.

Findings:

- Retention engaged unseeded: the first acquisition task's generated
  manifest passed the promotion gate and was reused on all 47 later tasks,
  including all 8 shift tasks, with zero invalid and zero failed runs. The
  kept procedure matched the fixed pipeline on held-out quality.
- No cost crossover: the retained arm cost 3.7x fixed and 2.6x ablation in
  work. The promotion hook re-evaluates the executed manifest on every
  task, catalog hits included — each hit pays a task run (~19.5k units)
  plus train and validation case evaluations (~40k units), roughly double
  ablation's per-task generation-plus-execution. Under this recurring
  qualification design the retained arm is strictly more expensive per hit
  at every horizon; reuse saves generation spend but the saved fee is
  smaller than the re-evaluation it still pays.
- Generator validity remains a failure mode: ablation lost 10/48 tasks
  (21%) to manifests that failed admission, fresh lost 1/48 (2%). The
  hardened generator emits schema-declared outputs with retry, but
  admission failures still land on the generative arms' scoreboard.
- Held-out quality saturates on the repaired corpus: all arms grade near
  0.99 mean, so correctness no longer discriminates between pipelines in
  this family.

### v3 · 48 tasks, `citeKeptEvaluation` on (cite-on-hit)

The re-evaluation finding above isolated the cost driver: the promote hook
re-evaluates the executed manifest on every task, catalog hits included.
The arm option `citeKeptEvaluation` makes hits re-cite the kept entry's
stored promotion evidence instead (`evaluated: false` on the run record),
so a hit charges the task run alone.

Verified report `sha256:57f4917c126dfd463ed6ef80725989651386fc63d7dba69f4836de10032bf756`
(192 records, zero mismatches), same corpus and executor (xAI `grok-4.5`),
the fixed, ablation, and fresh sessions re-cited unchanged.

| arm | completed tasks | held-out completed | work | runs | catalog |
|-----|-------|----------|------|------|---------|
| fixed | 48/48 | 40/40 | 933,716 | 48 | - |
| retained | 48/48 | 40/40 | 997,334 | 51 | 48 (47 hit, 1 miss), 1 promotion |
| ablation | 38/48 | 30/40 | 1,304,446 | 86 | - |
| fresh | 47/48 | 39/40 | 1,486,118 | 95 | - |

Findings:

- The cost crossover exists: the retained arm ran 24% less work than
  ablation and only 6.8% more than the non-adaptive fixed pipeline, with
  identical held-out completion. A hit costs one task run (~19.5k units);
  acquisition (one generation plus one evaluation) amortized over 47 hits.
- Retention also hedged generation failure: the kept manifest ran all 47
  later tasks without a single invalid run, while ablation lost 10/48
  tasks (21%) to manifests that failed admission.
- The kept procedure passed validation 1/1 and completed 40/40 held-out
  tasks across its hits. These counts measure different outcomes.
- The policy comparison is a measured result: the same arm, corpus, and
  executor priced at 3.44M work under per-hit re-evaluation versus 0.997M
  under cite-on-hit — a 3.5x swing controlled by one declared arm option.

### Follow-on measurements (v3 corpus)

- Invalid-manifest diagnosis: every one of the 11 invalid generative runs
  was one of two emission classes — `view.inputs: ["*"]` (10x) and a stray
  `id` on an `expr` descriptor (1x). Both are now covered by the opt-in
  `normalizeEmitted` arm field, which records applied repairs on
  `generator.normalized`.
- Jev classify probe: the full 2,304-record corpus was classified with
  per-record typed decisions (Jev `choice` questions carrying each task's
  taxonomy as criteria). Agreement with the declared truth: 2,292/2,304
  (99.48%) — matching the grok batch classify's holdout score exactly
  (573/576), on every split. One genuinely contested record remains
  (a webhook-delivery error between bug-report and integration-help,
  flagged at `pExpected` 0.15). Per-record decisions at ~$0.001 each are
  a cheaper classify substrate.
- Jev classify arm (pipeline `record-triage-jev`): the `labelsExpr`
  contract change makes the per-record variant expressible — an `each`
  cell maps records through a child classifier whose choice set resolves
  from the task spec, route-pinned to `provider: "jev"`, and a fold
  recombines the emitted {recordId, label} pairs for the shared
  apply/summarize/pack stages. The fixed arm over all 48 tasks' holdout
  batches (session `3f19d913`, report `759c686f`, verified clean):
  576 classifier effects — one per record — 573/576 labels correct
  (matching the batch classify's score; the misses land on the family's
  ambiguous class boundaries — billing-dispute vs billing-inquiry,
  bug-report vs integration-help/data-export — not on different record
  subsets), and 45/48 tasks fully exact. Work: 2,795,714 units vs the
  batch arm's 933,716 — the per-record arm costs ~3x in work units (12
  effect calls per task) while spending ~$0.60 total; the trade is
  per-record provenance, no batch JSON repair, and a classify bound that
  no longer scales with context.
- Corrections machinery exercised end-to-end at CLI level: declared
  task corrections land on run records, aggregate to `correctionsTotal`,
  and re-derive under `experiment verify`. The live studies themselves
  recorded zero corrections — no operator interventions were injected.

### v4 · 48 tasks (8 acquisition / 32 unseen / 8 shift), harder text

Corpus revision v4: same deterministic generator and phase structure,
wider taxonomies (10-14 classes, up from 6-10), deeper rule tables
(6-10, up from 5-9), and a new optional `shape.difficulty` block on the
family config with four text knobs: `hintLeak` (distractor-sentence
rate), `noiseSentences` (extra body sentences drawn from rival classes),
`confusable` (leaks that draw a full body sentence from the class's
confusable pair partner instead of a tell-tale hint phrase), and
`subjectMislead` (subjects naming a rival class while the body carries
the truth). Absent `difficulty` regenerates the v3 tasks byte-for-byte;
every knob's first PRNG draw is guarded by the knob being non-default.
Rival draws come from the task's own taxonomy, so every injected sentence
is signal for a label the classifier can actually pick.

A bounded Jev probe (6 unseen tasks per corpus, 72 holdout records each)
scored 97.2% on v3 and 72.2% on v4. The misses land on the declared
confusable pairs (billing-inquiry vs billing-dispute, login-problem vs
account-access, privacy-request vs data-export). The drop is specific to
that classifier: a batch pipeline on grok-4.5 that reads the full task spec
labels most v4 records correctly, so v4 separates weaker classifiers from
stronger ones rather than making every record hard.

#### v4 optimizer study · 2026-09-27

Two exploratory runs used the same 48 tasks, configured xAI `grok-4.5`,
and account ceilings of 40,000,000 work units, 1,024 attempts, and 512
runs. One arm kept its first passing program and cited its promotion
evaluation on later hits. The optimizer rechecked entries after two tasks
and revised them after a missed expectation.

The table grades each task's original output, before any revision. It
combines the 32 unseen and 8 shift tasks, each with 12 records.

| Measure | Retained, cite-on-hit | Optimizer |
|---|---:|---:|
| Completed unseen and shift tasks | 40/40 | 40/40 |
| Correct labels | 385/480 (80.2%) | 466/480 (97.1%) |
| Correct full records, including decisions | 385/480 (80.2%) | 466/480 (97.1%) |
| Entire output exactly correct | 4/40 | 30/40 |
| Passed the declared agreement scorer (threshold 0.9) | 8/40 | 33/40 |
| Total work, including acquisition and maintenance | 1,084,705 | 3,214,973 |
| Accounted run admissions | 51 | 120 |
| Revisions / demotions | 0 / 0 | 9 / 9 |

The optimizer's nine revisions all passed promotion evaluation. Its 47
catalog hits include 21 rechecks and 26 citations of existing evaluation
evidence. Promotion used the first acquisition task's train and validation
batches; the foundry excluded its holdout batch. The original task output
was never replaced by a revised answer in this table.

This comparison does not isolate the effect of revision. The reviser was
given an extra instruction to prefer the opening request when text mixes
classes, matching how the synthetic corpus appends distractions. The
retained generator lacked that hint, and the arms generated different
initial programs. The harness graded each completed catalog hit and supplied
the expectation to the reviser when that hit failed the scorer, including
during unseen and shift phases. This is an online feedback evaluation.
It used 2.96 times as much
recorded work. The one run per arm supports neither a matched-spend win nor
an estimate of variability across runs.

The [v4 evidence package](https://github.com/hraness/algal/tree/main/experiments/cumulative-skill/results/v4)
contains the two sessions, portable configuration builder, offline output
grader, and compressed store. All 138 distinct execution receipts replay
with recorded model responses; the 171 charged run admissions include
repeated deterministic receipts. Report verification rechecks accounting
and optimizer history. Output grading separately checks correctness.
Neither check attests the provider's identity or makes model responses
repeatable in a new live run.

## Status and limits

These studies demonstrate saved-program reuse, revision, demotion, and
offline replay in a synthetic family. They leave the claim of better unseen
work at matched spending open. The earlier statement that every
pre-registered measure had passed overstated the evidence: completion was
counted as success, and equal budget ceilings did not imply equal spending.

The v3 cite-on-hit run used less recorded work than its ablation while
completing more tasks. Its nearly saturated corpus provided little room to
measure improved correctness. The v4 optimizer comparison above measures
an accuracy difference, but also changes instructions and spends more.
Neither study establishes production generalization. Zero declared
corrections means no task-level interventions were recorded; it does not
measure the work spent designing prompts and the corpus.
