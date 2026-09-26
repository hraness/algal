# Cumulative-skill experiment

This page pre-registers the experiment described in
[the vision](vision.md#what-would-justify-the-claim): whether keeping and
composing earlier procedures makes the system better at later work than
equally resourced alternatives. It is a design record, not a result; nothing
here claims the outcome.

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

A fifth arm, a single fixed pipeline tuned on training cases (the
conventional-workflow-with-optimizer comparison), is proposed but deferred
unless its marginal cost is small.

## Measures (pre-registered)

- **Held-out success**: pass rate on the unseen and shift phases at matched
  cumulative account spend, using cases the task-generation never exposed.
- **Cost per success**: total account work and executor attempts divided by
  held-out passes, per arm.
- **Reuse contribution** (retained arm): which promoted catalog entries were
  run by later tasks, computed by joining catalog and revision records to
  run receipts in the program database, not by reading narratives.
- **Human correction effort**: interventions recorded during the study.
  A task entry may declare `corrections` records (a kind label and a note,
  at most 32 per task) that the run record carries and the report sums per
  arm; the design targets zero and reports deviations.

## Pre-registered failure-mode checks

- **Evaluation rewards the wrong thing.** Graders are deterministic; held-out
  tasks come from a separately seeded generation, never visible to any arm.
  For every promoted procedure the study reports the validation-versus-held-out
  pass-rate gap as an overfitting signal.
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
  program index, and recomputes the measures above. The report records
  counts and digests; conclusions are prose beside it, scoped to what the
  record shows. `experiment inspect` renders the same record as a table.
- Independent evaluation: `algal experiment verify` re-derives every
  reported aggregate from the cited session, account, catalog, and task
  records, re-opens each promotion's stored evaluation, and flags stored
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

| arm | tasks | held-out | work | runs | catalog |
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

| arm | tasks | held-out | work | runs | catalog |
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

| arm | tasks | held-out | work | runs | catalog |
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
- The kept procedure's held-out record is unchanged: validation 1/1,
  held-out 40/40 across all hits.
- The policy comparison is a measured result: the same arm, corpus, and
  executor priced at 3.44M work under per-hit re-evaluation versus 0.997M
  under cite-on-hit — a 3.5x swing controlled by one declared arm option.

## Status and limits

This is the first comparative study of the project's central claim. Its
task family is deliberately controlled rather than drawn from production
work; a positive result would justify a larger production-family study, and
a negative result would be evidence about the current machinery, not a proof
that retention cannot help. The study measures what it records: it cannot
show that generated procedures generalize beyond this family.
