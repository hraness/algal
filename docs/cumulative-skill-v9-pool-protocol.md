# V9-pool protocol: a comparison conditional on seed qualification

V8 failed its calibration gate and ended the development-feedback seed line.
Across v6, v7, and v8, six of 11 fresh seed searches qualified (10 completed,
one interrupted and by protocol not retried), and none of those three studies
ran its optimizer-versus-fixed comparison, because each design required every
planned block to hold a qualified seed before any arm could start. V8's
design required 13 qualifications: four calibration seeds and, inside
`learn`, a fresh search on each of nine confirmatory blocks. At that recorded
rate of 0.545 the chance of 13 in a row is 0.00037; even at 0.9 it is 0.25. That gate could not tell the comparison apart from
the seed procedure.

V9-pool is a new protocol on the study-design axis. It keeps the v8 seed
procedure byte for byte and changes what is compared: a pool of 16 fresh
blocks is seeded in order until six qualify, and the four arms run only on
those six. It does not alter v8 source, task data, results, or claims.

This protocol was frozen before inference at source commit
`dc5fef50122060aecfee9368af2379697bf01cdf`. The September 30, 2026 study
closed with an `insufficient` primary comparison: six seed searches passed,
but five optimizer arms had no final program for frozen evaluation. The
[result report](cumulative-skill-v9-pool.md) records the outcomes. The design,
pre-run estimates, and stopping rules below remain the preregistered plan.

## What changes: the estimand

V5 through v8 kept failed seed searches in the planned denominators. A block
whose search failed counted against the study, and the comparison required
complete coverage of every planned block. V9-pool states a different claim.
Its population is blocks on which the unchanged v8 seed procedure produced a
validation-passing seed. Qualification happens before any arm runs and is
shared by all four arms, so it cannot treat one arm differently. It does
select blocks where the same writer already solved the convention from 24
examples, and the optimizer's reviser is that writer given feedback. The six
recorded fixed baselines on qualified seeds ranged from 1 of 8 to 4 of 8
frozen tasks (v8 `cal-c`, which qualified on generation one while failing
training, passed 1 of 8). The primary set is timing-invariant, the six
lowest-index qualified blocks whatever generation qualified them, so what
selects is the conditioning on qualification, not the index order. A met
rule is therefore a conditional result and plausibly an upper bound.

The protocol's `basis.change` field records this, and records that the
numbers 16, six, and five were derived from the v6 to v8 seed-qualification
rates before any v9-pool optimizer or fixed outcome existed. The
scientific hypothesis is v5's: on blocks with a qualified seed, a revising
optimizer passes strictly more frozen shift tasks than the same seed held
fixed, repeatably.

## Blocks and seeds

Sixteen fresh blocks, `p-01` through `p-16`, each carry one seed task (the
first acquisition task with its 12-record development batch), 40 learning
tasks, and eight shifted frozen tasks of 12 records, built as v8 builds
them. Their task and ancestor seeds are `93000001` through `93000064`,
assigned by formula from the block index, absent from the 167 seeds that v5
through v8 used, and checked against a shared seeds ledger that every
`arms/*/protocol.json` is tested against. Arm order rotates with the block
index. Expected launches are 12.7 to 13.3 at qualification rates of 0.545 to
0.5: 10.9 to 11.7 searches close before the sixth qualification, and the two
searches still in flight at the stop run to termination. So
two or three blocks' generated datasets are expected never to be used.

| Split | Size | Writer visibility | Use |
| --- | ---: | --- | --- |
| `train` | 24 | Records and labels | Initial examples and exact training corrections |
| `development` | 12 | Agreement score only | Graded signal about whether a revision generalizes |
| `validation` | 12 | None | First-passing-candidate gate; untouched by writer requests |
| Frozen tasks | 8 tasks × 12 records | None | Fixed evaluation after learning |

## Seed stage and pool gate

The seed search per block is v8's: eight generations under one shared
ceiling of 8,000,000 work units, 64 model-call attempts, and 64 runs; the
eight-round schedule; development feedback as `{generation, round, score}`
rounded to hundredths; the duplicate-request and repeated-manifest rules;
and first-passing selection on the untouched validation split at the 0.9
threshold. The writer programs are forked verbatim and keep their v8
organism keys, so the writer manifest digest is byte-identical to v8's.

Seed searches launch in protocol order at concurrency 3. No new search
launches once six closed searches have qualified. Every launched search runs
to its own termination, and at most 16 launch. Launches are an index prefix
and the primary set is index-ordered, so membership of the primary set does
not depend on timing. A search qualifies when its summary records
termination `qualified`, a validation batch that passed in full, zero
duplicate writer requests, and a saved manifest and catalog: the same test
v8's arm builder applies. A search closed by `reconcile` counts as launched
and not qualified.

The pool decision is written once to `pool.json` when every launched seed
stage has a result, and hash-checked before any learning call. If 16
searches launched and fewer than six qualified, the status is
`insufficient`: `learn` refuses, `collect` writes the negative result, and no
arm call is made. Otherwise the six lowest-index qualified blocks are the
primary set. Every other launched block keeps its seed evidence and runs no
arm.

The pool size was chosen against three recorded rates: 0.46, six of the 13
fresh searches launched from v5 to v8; 0.50, six of the 12 fresh searches
that completed (also seven of 14 counting the reused v4 corpus); and 0.545,
six of the 11 launched from v6 to v8. The chance that at least six of 16
searches qualify is 0.827, 0.895, and 0.947 at those rates; a pool of 12
would give 0.506, 0.613, and 0.728. The chance of ending insufficient is
0.173, 0.105, and 0.053 at the same rates.

There is no calibration stage and no pre-comparison frozen run of the fixed
seed: the fixed arm's frozen stage measures the seed.

## Interruption

A stage that a runner leaves unfinished is never inferred safe to retry. The
`reconcile` command closes it as `interrupted` with a write-once
reconciliation record, makes no provider call, and never opens a second
store. A reconciled seed is launched and not qualified. A reconciled fixed or
optimizer stage on a primary block makes the primary comparison
insufficient with no replacement block; a reconciled retained or
optimizer-raw stage makes only the secondary comparison incomplete.
`collect` and `replay` complete over reconciled stages, so the record closes
in the driver rather than by hand, as v8's did. A seed search closes from
its latest retained snapshot that verifies against its store; a snapshot the
search wrote at a consistent point that does not verify means the store is
damaged, and no earlier snapshot may close in its place. A search that
closed on its own and was killed before its result was written is recovered
from its terminal snapshot, not reconciled, and a search whose store holds a
later generation's development record or a promoted catalog is never closed
as interrupted before that generation.

## Primary rule

The primary comparison is optimizer against fixed on the six primary blocks.
All four arms start from the block's qualified seed, run the same 40
learning tasks under the v8 ceilings of 40,000,000 work units, 1,024
attempts, and 512 runs per stage, save their heads before any frozen run,
and run the eight frozen tasks with no revision. `collect` decides three
parts:

- Coverage: all six primary blocks have complete fixed and optimizer
  learning stages (40 tasks observed of 40) and frozen stages (eight of
  eight). A reconciled fixed or optimizer stage fails coverage, and the
  status is `insufficient`.
- Wins: the optimizer's frozen pass count strictly exceeds the fixed arm's on
  at least five of the six blocks. Ties are not wins.
- Aggregate: the optimizer's pass count summed over the 48 primary frozen
  tasks strictly exceeds the fixed arm's.

The status is `descriptive-repeatability-rule-met` only when all three hold,
and `not-met` otherwise. Under a no-tie null the chance of at least five
wins in six is 7/64 = 0.109; v8's per-group rule gave 0.125. This is a
descriptive repeatability rule, not a significance test. V8's three groups
of three are dropped: every v8 block had its own four seeds, so groups
carried no shared structure. A task passes when the v6 agreement program
reaches 0.9, which on a 12-record batch needs at least 11 exact records and
an exact summary.

## Secondary and offline analyses

No secondary analysis produces a verdict.

- The retained and optimizer-raw arms are compared with fixed by the same
  win definition on the same six blocks, and their failures are reported
  separately.
- The number of primary blocks whose fixed seed passed at most six of eight
  frozen tasks is reported. In v6 through v8 this headroom count was a gate;
  here it never selects or excludes a block, because the pool blocks are the
  compared blocks and the fixed arm's frozen count is the primary endpoint.
- Qualified and interrupted counts over launched searches.
- Work per passed frozen task per arm and the optimizer-to-fixed work ratio.
  Matched spend, the program's own failure-mode check, is not tested: the
  primary is declared at unequal recorded spend.
- The seed cost of blocks outside the primary set is reported as pool cost
  and never added to an arm's cost.

Offline analyses are computed from stored receipts after `collect`, for every
launched search, with no provider call. Per attempt: exact training rows of
24, training summary exactness, exact validation rows of 12, validation
summary exactness, missed validation record ids, and correct labels on the
training, validation, and development batches. Per search: the maximum
exact validation rows, persistent misses (records missed on every executed
generation), the first generation at or above 11 and at or above 10 exact
rows, and whether the validation batch declares a per-label summary. The
preregistered reading carries the hypothesis of the
[threshold line that is not run](cumulative-skill-v9-lines.md): unqualified
searches split into single-persistent-miss searches that reach 11 of 12
rows and multi-miss searches that do not; in the v7 and v8 archives two of
the three exhausted searches (v7 cal-c and v8 cal-b) reached 11 of 12 and the
interrupted v8 cal-d search did not. The reading is reported and is
never a gate.

## Cost

Every figure is derived from recorded costs, not from ceilings. The seed
searches never approached their ceiling: the largest recorded search used
1,369,452 work units and 40 attempts; every closed search ended by
qualification or the generation limit, the one interrupted search was killed
by a session monitor, and none reached the budget limit.

| Stage | Basis | Work units | Model calls |
|---|---|---:|---:|
| Seed searches, expected | 11 recorded v6 to v8 searches: 8,379,685 work and 258 calls, mean 761,790 and 23.5; 12.7 to 13.3 launches including the two in flight at the stop | 9.6M to 10.2M | 300 to 315 |
| Seed searches, worst case | 16 exhausted searches at the recorded maximum | 21.9M | 640 |
| Learning, six blocks, four arms | the one recorded four-arm block, v5's `v4`: 9,295,912 work and 364 calls per block | 55.8M | 2,184 |
| Frozen, six blocks, four arms | six recorded eight-call fixed frozen stages, mean 174,188 | 4.2M | 192 |
| Learning, upper basis | v8 writer calls cost 46,412 work against v5's about 29,000 per non-task call, so the optimizer arms scale to 5,879,784 and 5,230,016 per block | 80.7M for six blocks including frozen | 2,376 |

The expected total is about 70M to 91M work units and about 2,670 to 2,690
calls; the maximum is about 102.6M and 3,020 calls; the branch in which the
pool fails runs all 16 searches and costs about 12M to 22M and 380 to 640
calls. For scale, the v8
calibration recorded 3,169,604 work units and 100 calls, and the whole v5
study 12,118,751 and 472. At recorded per-call rates the tokens are at least
7.7M in and 0.8M out, and plausibly twice that with v8-style writers. V8 ran
100 calls inside a 30-minute window at concurrency 3, so about 2,680 calls
is at least 13 hours of provider time and likely 15 to 25, because optimizer
writer calls are larger than fixed task runs. Provider dollar cost is
unrecorded in every study and is not inferred here.

The arm figures rest on one v5 block whose writers differ from v8's (no
training examples, a hand hint to the reviser), so even the upper basis may
be low on tokens.

## Line rule

The protocol fixes a line rule before inference, verbatim in
`basis.lineRule`: “If fewer than six of sixteen seed searches qualify, or
the primary rule is not met, the conditional-pool line ends; no larger pool,
smaller primary set, lower win count, redrawn blocks, extra arms, or changed
comparison rule is proposed on this axis.” Every branch ends at `collect`,
and nothing is tuned after outcomes: an insufficient pool, a reconciled
primary stage, a not-met rule, and a met rule each end the line with that
result. A met rule triggers no further repetition under this protocol and
licenses no production activation.

The v8 line rule ends the development-feedback seed line and forbids a
retuned signal, threshold, or generation limit on that axis. V9-pool changes
nothing on that axis: prompts, feedback fields, score definition, round
schedule, generation limit, threshold, splits, and seed budget are carried
verbatim. It runs the frozen v8 procedure as an instrument, because any
four-arm comparison needs a seed and the unchanged v8 procedure is the only
preregistered option; sequential launching, the stop at six, and the cap of
16 keep the expected instrument spend (9.6M to 10.2M work units) at about
the three calibrations combined (9.42M).
The v8 protocol page says its rule bounds spending on one idea to the v7 and
v8 calibrations; the bounded idea is the development signal as a
seed-acquisition improvement, which v9-pool neither tests nor tunes. The
strongest objection is gate-shopping: v6 through v8 preregistered that
failed searches stay in the denominators. V9-pool answers it by stating the
estimand change up front, by giving the outcome-independent reason (the
contrast is undefined without a seed, and the prior gate needed 13
qualifications), and by deriving 16, six, and five from qualification rates
alone.

## Run discipline

Each paid command (`seed`, `learn`, `evaluate`) runs as a detached background
job that writes a log; monitors only tail the log; no session-bounded runner
may own a paid stage. The v8 `cal-d` search was killed by a 30-minute
session monitor during generation seven and, by protocol, not retried; the
same event during a primary block's fixed or optimizer stage would make the
primary insufficient after tens of millions of work units. The driver
refuses any stage beyond 16 seed stages and six blocks times four arms of
learning and frozen stages.

## What a met rule would and would not establish

A met rule would establish that, on fresh draws of the record-triage
synthetic family for which the unchanged v8 seed procedure produced a
validation-passing seed, a revising optimizer passed strictly more of the
eight frozen shift tasks than the same seed held fixed in at least five of
six such blocks and in aggregate over 48 tasks, at recorded and unequal
spend, under a descriptive rule with a no-tie null tail of 0.109.

It would not establish any effect on blocks where seeding fails, where the
contrast is undefined; an unconditional or family-level effect; a
matched-spend win (v5's optimizer used 3.74 times the fixed arm's work);
statistical significance; reliable seed acquisition, on which the v8 outcome
stands; a learned human priority convention; provider dollars; production
benefit; or anything outside one synthetic family. A block where the fixed
seed passes eight of eight cannot be a win, and identical programs gave
different frozen answers in v5, so the rule tolerates one reversal.

A not-met rule with six compared blocks would establish that, at these
budgets and on seedable blocks, revision did not repeatably beat the fixed
seed, which rules out the reading that v5's 8-of-8 against 1-of-8 effect
would have appeared had earlier gates passed. An insufficient pool would
establish only that the instrument's qualification rate fell below the v6
to v8 record, at a bounded cost.

## Implementation

The v9-pool driver is the v8 driver with the calibration and replication
stages replaced. `protocol.json` carries the contract
`algal.study-protocol.v3`; `pool.json` is `algal.study-pool.v1`;
`results.json` is `algal.study-result.v3`; a stage reconciliation record is
`algal.study-stage-reconciliation.v1`, a new id because the v8 archive's
hand-made study-level record carries `algal.study-reconciliation.v1` with a
different key set; the offline analyses are
`algal.study-offline.v1`. The heads and replay records take
`algal.study-heads.v2` and `algal.study-replay.v2` because their rows now say
whether a stage was reconciled. The seed, development-score, freeze, and
stage records keep their v8 contracts because their key sets are unchanged,
and a test compares those key sets against v8. The parser pins the
block seeds to their formula, the 167 previous seeds to the shared
`seeds-ledger.ts`, the budgets, the pool and comparison constants, the v8
basis commit `dc64c02f`, and the line rule. A shared ledger test asserts
that every arm's block seeds are pairwise disjoint, that the ran studies'
seeds equal the consumed list, and that v9-pool's seeds lie inside their
reserved range. The freeze covers the protocol, the v9-pool implementation,
the seeds ledger, task snapshots, route, Bun version, and source hashes, and
is re-checked at every stage. The `status` field reads
`implemented-no-inference` and stays so after a run, as v8's does.
