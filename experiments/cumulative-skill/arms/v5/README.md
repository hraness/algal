# v5 autonomous improvement study

This study compares a fixed program, a saved program, and two optimizers on
synthetic record-triage tasks. A deterministic generator supplies the correct
answers. No human labels or corrections enter the experiment.

## Comparison

Each of three corpora supplies eight acquisition tasks and 32 further learning
tasks. To choose a shared starting program, the seed step runs the `retained`
strategy until it produces its first program that passes validation. This step
allows up to eight generation attempts, eight million work units, and 64 runs.
Failed seed attempts remain part of the recorded cost. All four arms then start
from that exact program:

| Arm | Behavior after seeding |
| --- | --- |
| `fixed` | Run the seed directly on every learning task |
| `retained` | Reuse the saved seed and refer to its original passing evaluation |
| `optimizer` | Recheck and revise saved programs, repairing supported format errors in generated programs |
| `optimizer-raw` | Use the same optimizer with those format repairs disabled |

The generator and reviser receive the same task instructions. The reviser also
receives the program and observed feedback it needs to revise. Neither receives
additional advice about how the synthetic records were constructed.

Each learning session has the same ceiling: 40 million ALGAL work units,
1,024 executor attempts, and 512 runs. Work units measure runtime accounting;
they do not measure provider dollars. Equal ceilings can produce different
spending, so the comparison reports total work and quality per unit of work.

After learning, each arm's final program is held fixed. ALGAL's improvement
comparison evaluates these programs on a fresh set of eight shifted tasks.
These tasks and the tasks they were derived from are excluded from learning.
No evaluation result can trigger another revision. Saved evaluation records
identify the program that produced each result; separate learning scores
describe the changing programs used earlier in the session.

## Run

From the repository root, with Bun and a configured executor. These commands
describe the recorded run; choose a new, empty `STUDY_DIR` for another live run.

```sh
export STUDY_DIR=experiments/cumulative-skill/results/v5/live
export EXECUTOR_FLAGS="--base-url https://api.x.ai/v1 --model grok-4.5 --credential-env XAI_API_KEY"

for slug in v4 v5-b v5-c; do
  bash experiments/cumulative-skill/arms/v5/run.sh seed "$slug"
  bash experiments/cumulative-skill/arms/v5/run.sh build "$slug"
  for arm in fixed retained optimizer optimizer-raw; do
    bash experiments/cumulative-skill/arms/v5/run.sh run "$slug" "$arm"
  done
  bash experiments/cumulative-skill/arms/v5/run.sh report "$slug"
  bash experiments/cumulative-skill/arms/v5/run.sh grade "$slug"
done
bash experiments/cumulative-skill/arms/v5/run.sh evidence --eval-heads \
  --route "openai-compatible api.x.ai/v1 grok-4.5"
```

Set `BUN_BIN` to an absolute Bun path when Bun is absent from `PATH`. The
scripted `--responses` and command `--executor-cmd` routes support offline
checks.

Seed and learning stages refuse a second attempt in the same directory,
including after interruption. Inspect the saved attempt before starting any
replacement run. Sessions that exhaust their budget remain part of the results,
and scores include unexecuted tasks in the planned total. A failed seed prevents
that corpus's comparison from starting.

Each corpus has a seed store and four isolated arm stores under
`stores/<slug>/`. Each arm receives a copy of the seed evidence and records its
work separately. Model calls execute independently. Before execution, the driver
records the model connection, Bun version, a hash of the runtime source files,
and exact configuration. It refuses a changed connection or runtime within the
study. ALGAL reports verify each arm separately, including the two variants of
the optimizer.

## Verify offline

```sh
bun experiments/cumulative-skill/arms/v5/replay.ts "$STUDY_DIR/stores/v4/fixed"
bun cli.ts experiment verify "$STUDY_DIR/v4/fixed.report.json" \
  --dir "$STUDY_DIR/stores/v4/fixed"
```

Replay checks recorded execution. The independent grader checks outputs against
the generator's correct answers. Both are needed to interpret the results.

## Limits

Three corpora and one session per arm per corpus provide a small synthetic
comparison using one model and provider connection. They do not establish
improvement on production tasks. Separate model calls can produce different
programs, which limits how precisely this study can attribute differences to
the format repairs. Selection decisions apply only to the experiment and do
not enable production traffic.
