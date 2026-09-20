# Coding-harness pilot

This example tests whether ALGAL can represent and replay a coding harness whose
bounded policy can be searched. It is an experimental scaffold, not evidence of
a benchmark improvement, a production coding agent, or a need for a new VM.
Live reports must name the exact benchmark revision, selected tasks, backend,
limits, trials, exclusions, and remaining uncertainties.

The initial compatibility pilot pins Harbor **0.23.0**, commit
`1e5c5c6db929a10a140d05e606882c671ae20729`, and Terminal-Bench **2.0**, commit
`69671fbaac6d67a7ef0dfec016cc38a64ef7a77c`. Its development tasks are
`polyglot-c-py` and `regex-log`; held-out tasks are `cancel-async-tasks` and
`build-cython-ext`. This is an older four-task integration pilot, not a current
leaderboard submission or a statistically meaningful performance study. The
Harbor Python adapter invokes `examples/coding-harness/cli.ts` for each episode.

## The comparison

The conventional baseline and ALGAL harness expose the same model input, terminal
action schema, policy, tools, and per-task limits. The conventional path uses a
small host loop. The ALGAL path uses an `agent` cell: ALGAL owns the sequence of
model requests and terminal effects. The inference adapter performs one model
request at a time; it must not delegate the whole task to another coding agent.

1. Compare equivalent fixed policies in both engines. First use a deterministic
   scripted model to establish action/context parity and ALGAL receipt replay.
   A live comparison then measures integration behavior and overhead.
2. On development tasks only, evaluate a bounded set of ALGAL policies or admit
   generated policy proposals. Include every proposal and unsuccessful candidate
   in the search-cost ledger.
3. Freeze the selected policy's identity before evaluating holdout tasks. Report
   held-out outcomes even if the result is worse than baseline.
4. If a useful improvement emerges, port the selected policy to the conventional
   harness. Comparing equal-budget search in both representations is a subsequent
   experiment, needed before attributing discovery advantages to ALGAL.

Changing the loop engine while fixing policy tests execution parity. Changing
the policy tests the policy. Neither comparison alone proves a new language or
VM was necessary.

## The bounded search space

[`protocol.ts`](../examples/coding-harness/protocol.ts) admits data-only policies:

```json
{
  "version": 1,
  "context": { "mode": "full" },
  "testPolicy": "focused-first",
  "recoveryPolicy": "diagnose-once"
}
```

| Field | Admitted values | Meaning |
| --- | --- | --- |
| `context` | `{ "mode": "full" }` or `{ "mode": "recent-with-first", "maxMessages": 2..128 }` | Preserve the full bounded trace, or the original instruction plus its latest messages. |
| `testPolicy` | `focused-first`, `test-after-edit` | A fixed instruction about running visible workspace tests. |
| `recoveryPolicy` | `diagnose-once`, `retry-with-context` | A fixed instruction about using failed-command observations. |

Unknown keys, executable proposals, arbitrary prompts, and out-of-range parameters
are rejected. `policyId` hashes the canonical admitted policy. The prompt version,
runtime version, model, terminal adapter, and resource bounds must be pinned
separately; a policy digest alone does not identify an entire experiment.

Test/recovery labels currently select instructions. They do not enforce a test
state machine, prove that the model followed the instruction, or grant access to
hidden grading tests. Context projection is an explicit shared host helper. It
preserves at most 128 messages; the harness separately bounds message bytes and
model attempts. Both engines enforce ALGAL's 262,144-byte canonical full-context
limit before projection, including JSON escaping. Recent context may discard earlier diagnostic detail: that is a
behavioral tradeoff being tested.

`DEFAULT_CANDIDATE_POLICIES` supplies a small hand-authored starting set. Selecting
among these is bounded policy search, not autonomous program evolution. A generated
proposal must pass `parseCandidateProposal` and name only development evidence.
Actual proposal generation and its inference usage must be recorded by the runner.

## Split, grading, and selection contract

`parseExperimentSplit` requires a benchmark name and revision plus nonempty,
disjoint, unique development and holdout task IDs. Each side permits at most 256
tasks. Split ordering is canonicalized. Task-ID checks cannot detect semantically
equivalent tasks, leaked solutions in prompts, or pretraining exposure; the
experiment owner must review the selected tasks and artifacts for those concerns.

Independent grading runs after the agent stops and remains outside its context.
A finish action is not a success grade. The runner records each trial as:

- `success`: independent grading completed and passed.
- `failure`: independent grading completed and did not pass.
- `invalid`: the run or evaluator was not valid enough to grade.
- `uncertain`: completion or external effects cannot be established.

Do not silently retry uncertain runs or turn invalid results into successes.
Report the failure category with separate diagnostic artifacts. `TrialOutcome`
contains only the bounded scoring fields; logs and sensitive provider information
do not belong in it.

`selectAndFreezePolicy` accepts at most 16 unique policies, complete equal
development trial matrices, and zero-based consecutive repeat IDs up to 31. It
rejects holdout outcomes, wrong policy identities, duplicates, and entirely
ungraded evidence. It selects by development successes, then fewer invalid or
uncertain outcomes, then policy digest for a deterministic tie break. Cost and
wall time are reported, but are not tie breakers in this initial rule. Ties on
small samples carry no implication of quality improvement.

The resulting frozen record binds the selected policy, split, development
evidence, selection rule, and search usage. `summarizeHoldout` checks the same
policy/split identity and a complete held-out trial matrix. It only reports
outcomes; it cannot reselect a winner. Keep the frozen artifact before holdout
launch rather than constructing it after looking at results. The protocol guards
local data flow, not the behavior of an operator or external model that already
saw held-out answers.

The primary success rate counts **all attempted trials** in its denominator.
The report also exposes a graded-only success rate and separate invalid/uncertain
counts. This makes infrastructure exclusions visible. Empty samples have a null
rate. A two-development/two-holdout smoke run can establish integration behavior;
it cannot support a robust performance claim.

## Budget and accounting

The first pilot is authorized to spend at most **$20 in incremental paid
inference**, using the existing backend. Host configuration owns that cap, model
and account selection, maximum calls, timeouts, and terminal authority. Evolved
policies cannot raise them.

The initial XCB path uses an existing subscription account and forbids fallback
to a paid API. Its attribution of dollar cost and token usage is unreported, so
`paidCostUsd`, `inputTokens`, and `outputTokens` remain `null` when unavailable.
An adapter may separately record zero incremental paid API spend when it used
only that existing subscription; this is not a claim of zero model cost or zero
subscription consumption.

The configured model selector is `claude/sonnet/low`. XCB qualification binds
the executable and evidence digests, but does not expose immutable upstream
model weights. Preserve that selector and available qualification identity in
each report; describe this as a fixed configured backend, not a fully pinned
model-version comparison.

`summarizeUsage` reports known cost, the number of unknown-cost records, and a null
total whenever attribution is incomplete. Search usage automatically sums **all
candidates' development trials**, plus all supplied proposal/search-overhead
records. Holdout and deployment-use costs are separate. Durations are summed work
time, not elapsed wall time for concurrent jobs. Experiment reports may have
wall-clock fields; canonical ALGAL execution receipts do not.

The protocol accounts for cost; it is not a spending gate. Any future metered
backend must enforce a shared reservation ledger with a defensible per-call
upper bound before dispatch and reconcile actual charges afterwards. Do not
treat unknown cost as spare budget or add a paid fallback to this pilot.

## Evidence and limitations

Run the deterministic protocol checks with:

```sh
bun test examples/coding-harness/protocol.test.ts
```

They cover admission bounds, identity stability, leakage rejection, candidate
matrix fairness, frozen holdout evaluation, malformed evidence, uncertain results,
and inclusion of failed-search costs. The harness tests cover executable behavior
and receipt replay separately. A replayable receipt establishes recorded
execution, not independent correctness or provider attestation.

Terminal commands require a host-admitted isolated task environment. A `cwd`
setting or ALGAL manifest is not OS confinement. Never run model-generated
commands against a host checkout merely because a task path was configured.
The benchmark runner owns filesystem/process isolation and hidden grading.

Persistent cross-task memory is intentionally a later experiment. First compare
the same frozen harness with and without such memory, separating code changes
from recalled experience. Memory-schema migration and equal-budget program
search in a conventional implementation remain untested.

See the [improvement ledger](coding-harness-improvements.md) for concrete ALGAL
questions exposed by this experiment.

## Serial Harbor runner

[`pilot.py`](../examples/coding-harness/pilot.py) uses the pinned Harbor CLI and
validates its actual `JobConfig` schema. Run it with the Harbor virtual
environment's Python. Stage the four original tasks under `TASK_ROOT/<task-id>`
first; the runner checks their instruction hashes and fingerprints the opaque
task files, including graders, without putting those contents in model context.
It does not download tasks or start Docker. The integration owner must run live
commands through the admitted host scheduler and Docker wrapper, with task and
job directories inside the mounted staging root.

Example plan command (substitute admitted absolute paths and the existing account):

```sh
python examples/coding-harness/pilot.py smoke \
  --task-root /absolute/staging/tasks \
  --output-dir /absolute/staging/pilot \
  --account EXISTING_SUBSCRIPTION_ACCOUNT
```

Every mode defaults to **plan only**. Add `--execute` to launch work or to write
the frozen selection. `--max-model-attempts` defaults to **4**, fixed across arms.
Use the same arguments and output directory for the following sequence:

| Mode | Operation |
| --- | --- |
| `smoke` | One ALGAL development episode to qualify integration. Defaults to the cached `regex-log` image; `--smoke-task` may select either development task. |
| `paired-dev` | Baseline and fixed ALGAL on both development tasks, four serial trials. |
| `candidate-dev` | Candidate ALGAL on both development tasks, two serial trials. |
| `freeze` | Select from complete ALGAL development reports and write `frozen.json`; no inference. |
| `heldout` | Baseline, fixed ALGAL, and selected ALGAL on both held-out tasks, six serial trials. Requires frozen identity and unchanged settings. |

The runner's default candidate is a manually selected `recent-with-first` policy
with `maxMessages: 2`, so it can change observations within the tiny four-attempt
pilot. `--policy /absolute/policy.json` supplies an admitted alternative. When the
candidate came from a model proposal, pass `--proposal-record /absolute/record.json`
to `freeze`; its admitted development-only proposal must match the evaluated
policy, and its usage is included in search cost. The proposal record must contain
`proposal: {policy, parentPolicyId, evidenceTaskIds}` and a protocol `usage` record.
Other provenance fields are retained through the proposal record's digest.

`propose.ts` makes one model call and retains even failed or rejected proposals:

```sh
bun examples/coding-harness/propose.ts \
  /absolute/development-evidence.json /absolute/proposal-record.json \
  /absolute/xcb EXACT_ACCOUNT claude/sonnet/low
```

Its input has exactly `split`, `parentPolicy`, and `outcomes`; take outcomes only
from the `algal-fixed` rows in `reports/paired-dev.json`. Extract the admitted
record's `proposal.policy` into the file supplied to `candidate-dev --policy`.
The proposer receives only these development outcomes and the parent policy. It
has no terminal tools and sees no task files or held-out results. A rejected
proposal is retained and never automatically retried.
Freezing also requires an admitted model-generated record, the evaluated baseline
as parent, exact development outcomes from the `algal-fixed` report, and one
completed proposal call on the experiment's configured backend. Changed ancestry,
evidence, backend accounting, or fabricated zero attribution is rejected.

All trial attempts and controller/backend limits are recorded. The runner uses
fresh Harbor trials, one concurrent trial, one attempt, no automatic retries,
and the original verifier. It recognizes only independent scalar `reward` values
0 or 1 as grades. Missing, malformed, mismatched, exceptional, or unresolved
evidence becomes `invalid`; the remaining matrix stops for diagnosis. A completed
controller or a finish action never overrides grading.

Plans/configuration and per-episode evidence are immutable. A launch marker
prevents silently re-running a started job, including an unknown outcome. An
experiment-directory lock prevents concurrent matrix launches. Use a new output
directory for a deliberately new experiment after changing code, task bytes,
backend configuration, or limits; retain the original incomplete evidence.

The runner fingerprints the configured XCB executable, relevant controller source,
staged task bytes, Bun/Python/Harbor versions, and limits. Freezing and holdout
execution reject changed settings. Reports separate each arm's usage; the frozen
search total includes both ALGAL candidates plus the supplied proposal cost.
The conventional comparison and smoke costs remain in their respective reports
and should also be included when reporting total experimental expenditure.

Host inference routing is passed only to the parent Harbor/controller process.
It is excluded from Harbor's agent `env` configuration, which Harbor would
otherwise copy into task execution. Controller evidence stays in a host-only
sibling of the mounted agent-log directory.

The initial schedule has one repeat per task and a fixed serial order. It is an
integration and feasibility check. Larger follow-up comparisons should predeclare
additional repeats and counterbalance run order before inspecting holdout results.

Runner-only deterministic checks:

```sh
python -m unittest discover -s examples/coding-harness -p test_pilot.py -v
```
