# V9-pool comparison on blocks with a passing seed

This directory holds the v9-pool protocol and its driver. It contains no task
snapshot, study freeze, provider receipt, or live result. No v9-pool provider
call has occurred, and the protocol is not frozen: everything here is a
proposal until `init` freezes it.

V8 ended the development-feedback seed line. Two of its four fresh seed
searches qualified, one exhausted eight generations, one was interrupted, and
its gate required all four. V9-pool keeps the v8 seed procedure byte for byte
and changes the study design instead. Sixteen fresh blocks, `p-01` through
`p-16`, are seeded in protocol order, three at a time, until six closed
searches have qualified; the four arms then run only on the six lowest-index
qualified blocks. The claim under test is conditional on seed qualification,
an event that happens before any arm runs and is shared by all four arms. If
fewer than six of the 16 searches qualify, no arm runs and the study ends as
insufficient.

The task family, scorer threshold, route, model, resource ceilings, round
schedule, four arms, and writer inputs are the v8 values. The
[protocol document](../../../../docs/cumulative-skill-v9-pool-protocol.md)
records the design, the primary rule, the line rule, and the cost derivation.

## Files

- `protocol.json` and `protocol.ts`: the preregistered plan, parsed exactly.
  The parser pins the 16 blocks to seeds `93000001` through `93000064` by
  formula, checks the 167 previously used seeds against the shared ledger,
  and exports the pool and comparison constants the driver enforces.
- `../../seeds-ledger.ts`: the seeds every study from v5 through v8 used, the
  three family configuration seeds, and the ranges reserved for the three v9
  candidate lines. Its test checks every `arms/*/protocol.json` against it.
- `generators.ts`: the v8 writer programs, forked verbatim. The organism keys
  keep their `-v8` suffix so the writer manifest digest is byte-identical to
  v8's.
- `seed.ts`: the v8 seed search and its offline verification, bound to the
  v9-pool protocol digest. Development scoring, the round schedule, the
  budgets, and first-pass selection on the untouched validation split are
  unchanged.
- `build.ts`, `guards.ts`, `results.ts`, `run.ts`, `replay.ts`: the study
  driver. `results.ts` computes the pool decision, the primary rule, the
  secondary analyses, and the offline receipt analyses. The freeze covers
  `src/`, the v5 evidence helpers, v6, this directory, the seeds ledger, and
  the pipeline library; v8 is not imported at runtime.
- `export.ts`: writes the public result summary from a collected study, with
  no model inputs or outputs.

## Running a study

`bun experiments/cumulative-skill/arms/v9-pool/run.ts init <dir>` freezes the
committed source, protocol, seeds ledger, and generated tasks. The live store
for a run is `experiments/cumulative-skill/results/v9-pool/live`. The paid
stages follow in order:

- `seed <dir>` launches the seed searches in protocol order at concurrency 3
  and launches no new search once six closed searches have qualified. Every
  launched search runs to its own termination; at most 16 launch. When every
  launched seed stage has a result, the command writes `pool.json` once.
  Re-running it on a complete pool does nothing; on a partial pool it resumes
  launching and never opens a second store for a block that has one.
- `reconcile <dir> <block> <stage>` closes an unfinished seed or arm stage as
  `interrupted` with a write-once `algal.study-stage-reconciliation.v1`
  record and makes no provider call. A seed closes from the latest retained
  snapshot that verifies against its store (the driver's thrown-error
  snapshot is skipped when the error left it unverifiable), and inspection
  during collect and replay refuses a record that names an earlier snapshot while a later one
  verifies. A reconciled seed counts as launched and not qualified. A reconciled
  fixed or optimizer stage on a primary block makes the primary comparison
  insufficient; no block replaces it. Two kills are recovered rather than
  reconciled: a search killed after its terminal snapshot and before its
  result gets that snapshot as its result and no record, so it inspects as
  its own closing, and a close killed between the record and the result is
  finished from the same evidence, which must agree with the record.
- `learn <dir>` refuses unless `pool.json` reads `qualified`, then runs the
  four arms' learning sessions on the six primary blocks. `evaluate <dir>`
  saves every head and runs the frozen stages. `collect <dir>` writes
  `results.json` with the decision and the secondary and offline analyses.

`replay.ts` verifies a closed study offline and `export.ts` writes the public
summary; both complete over reconciled stages. The stage discipline is v6's:
one owner per paid stage, no inferred retries, and an unfinished attempt
stops progress until `reconcile` closes it. The driver refuses any stage
beyond 16 seed stages and six blocks times four arms of learning and frozen
stages. Every paid stage needs `XAI_API_KEY`; no credential is read before
`init` has frozen the study.

## Run discipline

Each paid command runs as a detached background job that writes a log, and
monitors only tail that log. No session-bounded runner may own a paid stage:
the v8 `cal-d` search was killed by a thirty-minute session monitor during
generation seven and, by protocol, not retried. At most three provider
requests are in flight at once, and about 2,680 expected calls (the seed
stage counts the two searches still in flight when the sixth qualification
closes) take at least 13 hours of provider time.
