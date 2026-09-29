# V8 seed search with a graded development score

This directory holds the v8 protocol and its driver. It contains no task
snapshot, study freeze, provider receipt, or live result. No v8 provider
call has occurred.

V7 gave the seed writer a development batch pass indicator. In its
calibration every one of the 22 scored batches failed the 0.9 threshold, so
the history the writer received was constant at zero on all four corpora and
two searches reached generation eight. V8 changes one thing: the writer
receives the development batch's agreement value in [0,1], rounded to
hundredths, instead of the pass indicator. A partially correct revision is
then distinguishable from a wrong one. Records, labels, outputs, and
summaries of the development batch still never enter a request, and the
selection split remains untouched.

The task family, scorer threshold, route, model, resource ceilings, round
schedule, four-arm comparison, calibration gate, and descriptive primary
rule remain the v7 values. V8 uses four fresh calibration blocks with seeds
absent from v5, v6, and v7. If the gate fails, the result is collected and
replayed as a negative calibration, the protocol is not tuned, and the
development-feedback seed line ends.

## Files

- `protocol.json` and `protocol.ts`: the preregistered plan, parsed exactly.
  `seedTask` generates the first acquisition task with its development batch;
  its train, validation, and holdout batches are byte-identical to the
  learning task's. `DEVELOPMENT_AGREEMENT` is the v6 agreement program whose
  0.9 threshold defines the pass gate.
- `generators.ts`: the v8 writer programs. Inputs add `generation`, `round`,
  and `development` (a list of `{generation, round, score}`).
- `seed.ts`: the seed search and its offline verification. A failed candidate
  is scored once on the development batch under the remaining seed budget;
  the result is an `algal.study-development-score.v2` record carrying the
  rounded agreement value (0 for an incomplete or refused run). Every attempt
  records its writer request identity, a duplicate-request flag that ends the
  search as a protocol failure, and a repeated-manifest flag.
- `build.ts`, `guards.ts`, `results.ts`, `run.ts`, `replay.ts`: the study
  driver, forked from v7 unchanged apart from identities. The freeze covers
  `src/`, the v5 evidence helpers, v6, v8, and the pipeline library.

## Running a study

`bun experiments/cumulative-skill/arms/v8/run.ts init <dir>` freezes the
committed source, protocol, and generated tasks. `calibrate`, `learn`,
`evaluate`, and `collect` follow the v6 stage discipline: one owner per paid
stage, no inferred retries, and an incomplete attempt stops progress until it
is reconciled. `replay.ts` verifies a closed study offline. Every stage needs
`XAI_API_KEY`; no credential is read before `init` has frozen the study.
