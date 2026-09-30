# V7 seed search with bounded development feedback

This directory holds the v7 protocol and its driver. It contains no task
snapshot, study freeze, provider receipt, or live result. No v7 provider
call has occurred.

V6's `cal-c` search reached generation eight after its training output became
correct, while the writer continued to receive the same training feedback and
had no signal that selection still failed. V7 changes the seed process in a
new protocol rather than modifying v6: the seed task carries a separate
development batch, the writer receives only a bounded development score
history, each generation names a predeclared round mode, and the selection
split's records, labels, outputs, scores, and reports never enter writer
requests.

The task family, scorer threshold, route, model, resource ceilings, four-arm
comparison, and descriptive primary rule remain the v6 values. V7 uses four
fresh calibration blocks and proceeds only when every seed qualifies and at
least three fixed seeds leave headroom on eight fresh frozen tasks. If that
gate fails, the result is collected and replayed as a negative calibration;
the protocol is not tuned after seeing outcomes.

## Files

- `protocol.json` and `protocol.ts`: the preregistered plan, parsed exactly.
  `seedTask` generates the first acquisition task with its development batch;
  its train, validation, and holdout batches are byte-identical to the
  learning task's.
- `generators.ts`: the v7 writer programs. Inputs add `generation`, `round`,
  and `development` (a list of `{generation, round, passed, total}`).
- `seed.ts`: the seed search and its offline verification. A failed candidate
  is scored once on the development batch under the remaining seed budget;
  the result is an `algal.study-development-score.v1` record. Every attempt
  records its writer request identity, a duplicate-request flag that ends the
  search as a protocol failure, and a repeated-manifest flag.
- `build.ts`, `guards.ts`, `results.ts`, `run.ts`, `replay.ts`: the study
  driver, forked from v6 with the v7 seed, four calibration blocks, and the
  three-block headroom rule. The freeze covers `src/`, the v5 evidence
  helpers, v6, v7, and the pipeline library.

## Running a study

`bun experiments/cumulative-skill/arms/v7/run.ts init <dir>` freezes the
committed source, protocol, and generated tasks. `calibrate`, `learn`,
`evaluate`, and `collect` follow the v6 stage discipline: one owner per paid
stage, no inferred retries, and an incomplete attempt stops progress until it
is reconciled. `replay.ts` verifies a closed study offline. Every stage needs
`XAI_API_KEY`; no credential is read before `init` has frozen the study.
