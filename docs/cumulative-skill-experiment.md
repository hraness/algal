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
   or deliberately revise a kept procedure.
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
- **Human correction effort**: interventions recorded during the study;
  the design targets zero and reports deviations.

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
  cross-verified by the native runtime where covered. The run records do
  not yet carry a human-correction signal, so that pre-registered measure
  is deferred rather than reported as zero.

## Status and limits

This is the first comparative study of the project's central claim. Its
task family is deliberately controlled rather than drawn from production
work; a positive result would justify a larger production-family study, and
a negative result would be evidence about the current machinery, not a proof
that retention cannot help. The study measures what it records: it cannot
show that generated procedures generalize beyond this family.

### Task-corpus revision (v2)

The first committed corpus labeled records by the template that
generated them; three template bodies carried truth that disagreed with
the taxonomy's declared semantics ("a charge I do not recognize" under
billing-inquiry, "the API returns errors" under integration-help). A
decision-model audit of all 960 records found 35 disagreements with
declared truth, 23 of them high-confidence, concentrated on exactly
those two boundaries — enough to cap the promotion gate on four
acquisition tasks regardless of classifier quality. The corpus was
repaired so template text matches its truth label's semantics, then
regenerated deterministically from the same family configs; the revised
corpus audits at 956/960 agreement with zero high-confidence contests.
Reports cite task digests, so each run binds the corpus revision it
executed.
