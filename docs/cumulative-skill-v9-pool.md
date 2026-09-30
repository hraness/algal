# V9-pool finished with five optimizer test stages missing

The September 30, 2026 conditional-pool study ended with an `insufficient`
primary comparison. Six of 14 seed searches produced passing starting
programs, and all four arms recorded their 40 learning tasks on those six
blocks. Five optimizer arms then had no active saved program to test. Only
`p-14` completed the optimizer-versus-fixed comparison, with eight frozen
tasks passed by the optimizer and two by fixed.

The preregistered rule required complete primary coverage, an optimizer win
over fixed on at least five of six blocks, and strictly more passes in
aggregate. Missing five optimizer test stages prevents a verdict. The
conditional-pool line closes with this result under its stopping rule.

The [public result](cumulative-skill-v9-pool-results-2026-09-30.json) preserves
the block outcomes, costs, transport failures, and offline analyses. The
[protocol](cumulative-skill-v9-pool-protocol.md) records the design fixed
before inference.

## What the pool selected

V9-pool kept the v8 seed procedure and changed the study design. It allowed
up to 16 fresh synthetic record-triage blocks, with three searches running
at a time, and stopped launching once six completed searches had passed
validation. A seed is the starting program shared by all four arms of a
block. The six lowest-index passing searches formed the primary set.

Searches `p-01` through `p-14` ran. Six passed, eight reached the
eight-generation limit without passing, and none was interrupted. There
were no extra passing blocks outside the primary set; `p-15` and `p-16`
were unused. The observed seed pass rate was 6/14, or 42.9%. The 80 seed
writer requests were distinct, although 14 generations repeated an earlier
program. One generation, `p-02` generation four, produced an invalid
program with a recorded `PARSE_FAILED` error.

Each search used 24 labeled training records, 12 validation records, and
a separate 12-record development batch. The writer received training
examples and corrections plus a history of rounded development scores;
validation records and answers stayed outside its requests. Each search
allowed eight generations, 8,000,000 work units, and 64 executor attempts
and runs.

Each block supplied eight acquisition tasks, 32 later learning tasks, and
eight frozen tasks drawn from a shifted distribution. Each learning and
frozen execution batch contained 12 records. A frozen task passed at an
agreement score of at least 0.9: at least 11 exact records and an exact
summary. Frozen evaluation used each arm's final saved program with
revision disabled.

## Frozen results and primary coverage

Every numeric result below is a pass count out of eight planned frozen
tasks for that block. “Not run” means the arm had no active final program;
it is not a measured score of zero.

| Block | Seed generations | Fixed | Optimizer | Retained | Optimizer-raw | Primary comparison |
|---|---:|---:|---:|---:|---:|---|
| `p-03` | 3 | 0 | Not run | 0 | Not run | Incomplete |
| `p-08` | 2 | 2 | Not run | 4 | Not run | Incomplete |
| `p-09` | 5 | 3 | Not run | 3 | 7 | Incomplete |
| `p-10` | 3 | 1 | Not run | 1 | 4 | Incomplete |
| `p-12` | 2 | 0 | Not run | 1 | 6 | Incomplete |
| `p-14` | 1 | 2 | 8 | 2 | Not run | Optimizer win |

The primary contrast is **optimizer versus fixed**. All six fixed stages
recorded eight frozen tasks; one of the 48 task attempts failed in
transport. The optimizer recorded only eight frozen tasks, all on `p-14`.
Its eight observed passes and fixed's eight passes therefore do not form a
tie: five of the planned six comparisons are absent. The recorded tally is
one win, zero ties, zero losses, and five incomplete blocks.

The rule required at least five strict block wins and a strict aggregate
advantage across 48 planned tasks per arm. Its no-tie reference probability
was 7/64, or 0.109; it was a descriptive repeatability rule. Coverage failed
before that rule could yield a result. All six fixed arms passed at most
six of eight tasks, so all six had the preregistered measure of room for
improvement. That count did not select or exclude any block.

## Why completed learning left eight arms without a final program

All 24 learning sessions have outcome `complete`, with 40 task records
each. A final program, called a *head* in the records, is a separate
property. The catalog lists programs saved for reuse; retiring an entry
makes it ineligible for reuse. The driver chooses the most recent entry
that has not been retired. Every entry in each of the eight affected
catalogs was retired, so their heads were null and the driver skipped their
frozen stages.

The optimizer retires a saved program when its learning output fails the
declared scorer, when its execution fails, or when re-evaluation fails.
Retirement happens before a replacement is accepted. A replacement must
parse as a program and pass the arm's validation cases to enter the
catalog. Later tasks can continue generating and running programs without
leaving any program eligible for the final test.

In all eight affected arms, the last retirement was triggered by a learning
scorer miss, recorded as `missed-expectation`. The following replacement
attempts explain why no active program remained:

| Block | Arm | Last retirement, learning task | Replacement outcome |
|---|---|---|---|
| `p-03` | Optimizer | 2, `acquisition-02` | Failed validation |
| `p-03` | Optimizer-raw | 2, `acquisition-02` | Failed validation |
| `p-08` | Optimizer | 40, `unseen-32` | Failed validation |
| `p-08` | Optimizer-raw | 3, `acquisition-03` | Failed validation |
| `p-09` | Optimizer | 7, `acquisition-07` | Reviser execution failed; `EFFECT_FAILED` |
| `p-10` | Optimizer | 25, `unseen-17` | Failed validation |
| `p-12` | Optimizer | 39, `unseen-31` | Emitted prompt exceeded 8,192 characters; `PARSE_FAILED` |
| `p-14` | Optimizer-raw | 40, `unseen-32` | Failed validation |

No later candidate entered those catalogs. Two arms lost their last active
program on the final learning task itself. These missing heads were not
interrupted sessions or exhausted study budgets: no stage was reconciled,
and every learning session finished with 40 records. Individual task runs
could still fail or be invalid. Of 240 learning task records per arm, the
completed execution counts were 237 for fixed, 240 for retained, 238 for
optimizer, and 236 for optimizer-raw. Completion and passing the task's
scorer are separate measurements. The public JSON's generic coverage
limitation mentions exhausted or short stages; the records here identify
skipped frozen stages after head loss.

The mechanism is visible in the frozen source:
[head selection](https://github.com/hraness/algal/blob/dc5fef50122060aecfee9368af2379697bf01cdf/experiments/cumulative-skill/arms/v9-pool/results.ts#L338),
[retirement before revision](https://github.com/hraness/algal/blob/dc5fef50122060aecfee9368af2379697bf01cdf/src/experiment-run.ts#L1086),
and [skipping null heads](https://github.com/hraness/algal/blob/dc5fef50122060aecfee9368af2379697bf01cdf/experiments/cumulative-skill/arms/v9-pool/run.ts#L325).
The saved learning sessions point to the final catalogs and task records
that identify each retirement and replacement above.

## Secondary arms

Retained, which keeps a passing program without the optimizer's revision
policy, recorded all 48 frozen tasks and passed 11. It beat fixed on two
blocks and tied on four. Its final program was the original seed on every
block, the same program used by fixed. The different pass counts came from
separate executions of those saved programs.

Optimizer-raw uses the optimizer policy with the small deterministic
repairs to generated program structure disabled. It passed 17 of the 24
frozen tasks it ran, with three wins over fixed on the three covered blocks.
Its heads were absent on `p-03`, `p-08`, and `p-14`, leaving half its planned
frozen tasks unrun. These secondary outcomes have no preregistered verdict
and do not replace the missing primary comparisons.

## Offline reading of seed failures

The preregistered offline analysis examined every launched seed search. It
asked whether searches that failed to qualify separated into one persistent
validation error reaching 11 exact rows and multiple persistent errors
that stayed below 11. A persistent error is a record missed on every scored
generation of that search.

| Unqualified search | Best exact validation rows | Persistent misses | First generation reaching 11 |
|---|---:|---:|---:|
| `p-01` | 10/12 | 2 | None |
| `p-02` | 11/12 | 0 | 3 |
| `p-04` | 10/12 | 0 | None |
| `p-05` | 10/12 | 1 | None |
| `p-06` | 10/12 | 1 | None |
| `p-07` | 11/12 | 1 | 4 |
| `p-11` | 8/12 | 2 | None |
| `p-13` | 10/12 | 0 | None |

Only `p-07` fit the single-persistent-miss category. `p-01` and `p-11`
fit the multiple-miss category; the other five searches fit neither.
The predicted two-category split therefore did not describe most failures.
Two of eight failed searches reached 11 exact rows, compared with two of
three exhausted searches in the archived v7/v8 reading. The unchanged
JSON's `offline.reading` retains an erroneous historical denominator of
five; the protocol records three exhausted searches and separately counts
the interrupted v8 `cal-d` search. Both v9 failures that reached 11 had a
per-label summary requirement. Four successful v9
seeds passed at 11 exact rows with an exact summary; the other two passed
at 12.

The public result preserves per-generation exact rows, summary agreement,
correct labels, missed validation record identifiers, and first attainment
of 10 and 11 exact rows. The 73 recorded development scores ranged from
0.40 to 1.00; 13 reached at least 0.9 without qualifying that candidate on
validation. These measurements were computed from stored execution records
and did not change selection or launch another search. The separate
[threshold and diagnostic proposals](cumulative-skill-v9-lines.md) remain
unrun.

## Recorded work and failures

The study recorded 70,064,208 runtime work units and 2,663 charged executor
attempts. These include failed and repeated attempts. Work units are an
execution-accounting measure; provider dollar charges were not recorded.
The shared seed pool cost is reported separately from every arm's learning
and frozen work. Each learning or frozen stage had ceilings of 40,000,000
work units, 1,024 executor attempts, and 512 runs.

| Scope | Work units | Charged executor attempts | Effects missing usage | Work per frozen pass, rounded |
|---|---:|---:|---:|---:|
| Seed pool | 12,853,842 | 390 | 0 | Not applicable |
| Fixed | 6,051,098 | 288 | 4 | 756,387 |
| Retained | 6,100,263 | 288 | 0 | 554,569 |
| Optimizer | 23,403,677 | 872 | 5 | 2,925,460 |
| Optimizer-raw | 21,655,328 | 825 | 3 | 1,273,843 |
| Total | 70,064,208 | 2,663 | 12 | Not applicable |

The optimizer used 3.87 times fixed's recorded learning and frozen work,
excluding the shared pool. Its cost includes learning on all six blocks
while its pass count covers only one block's frozen tests. The work-per-pass
figures preserve that incomplete coverage; they are not comparisons at
equal spending.

Twelve recorded transport failures had missing usage and uncertain external
completion: three in learning-fixed, five in learning-optimizer, three in
learning-optimizer-raw, and one in frozen-fixed. Ten carried
`BUDGET_EXHAUSTED` and two carried `EFFECT_FAILED`. Those local error codes
do not establish the exact abort cause or whether the provider completed or
billed the requests. They were not retried and remain failed cases, distinct
from scored wrong answers.

Full input and output token totals are null because of those missing usage
records. The seed pool recorded 2,235,839 input and 231,882 output tokens;
retained recorded 1,013,400 input and 35,568 output tokens. The separate
receipt-file subtotal is 12,627,917 input and 1,420,679 output tokens from
2,683 recorded effects with usage. It counts seed records again wherever
they were copied into a learning store and omits effects without usage,
so it cannot replace the full charged-attempt totals.

## Source and recorded replay

The study used `grok-4.5` through `https://api.x.ai/v1`, Bun 1.3.14, and
source commit
[`dc5fef50122060aecfee9368af2379697bf01cdf`](https://github.com/hraness/algal/tree/dc5fef50122060aecfee9368af2379697bf01cdf).
The preregistered protocol file keeps its `implemented-no-inference` status
as part of its frozen identity; the public result records the completed
study's outcome.

| Record | SHA-256 |
|---|---|
| Freeze | `68015a597e4463b295e7c24ebf854bfb8c137fff9a64e613079887d020752c18` |
| Protocol | `649801de88e1dce839c5dc1d3cc36e19c06e30bc44924cd6fb13109ae91bc2c5` |
| Datasets | `3e05bfc2836625dc8057888091816e823c06742ee35743ecd115fe8166e683a2` |
| Native results | `b7b70b7279c6738d882a40c29a797b19913a6c635dea4b05d1522fea2c866e0d` |
| Native replay | `6e20d7131f5845e526041621b405883a235893dfb3d94a7f00d36da1f4a9388c` |
| Public JSON file | `3966a7b4109bd3db43ed25ec62cfacdd526b3c0d8fca61387115ad81b8673f7d` |

The recorded offline replay passed for 2,695 receipt files across 54 stores.
A receipt is a saved execution record. The replay count includes copied
seed records in each store and differs from the 2,663 charged attempts.
Replay checks recorded execution; task correctness is measured separately
by the declared scorer.

For the packaged files and extraction checks, see the
[evidence archive](../experiments/cumulative-skill/results/v9-pool/comparison-2026-09-30/README.md).

## Limits

The comparison was conditional on the seed procedure first producing a
passing program. That selection plausibly favors the optimizer, since the
same writer had already solved the block's convention from examples. All
blocks were fresh draws from one synthetic template family, with generated
labels and grading rules. They do not represent independent task domains
or human-adjudicated support messages. Validation was used repeatedly to
select seeds and later saved programs; the frozen shifted tasks were the
final test.

Five missing primary stages leave the repeatability claim unresolved, and
the measured spending was unequal. The protocol provides no production
activation or further repetition on this axis. Its result preserves a
specific failure of the learning policy: a run can finish its task list
after retiring every program eligible for final evaluation.
