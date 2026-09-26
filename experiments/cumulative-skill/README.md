# Cumulative-skill experiment: record triage

This directory holds the generated fixtures and reference pipeline for the
`record-triage` task family in the cumulative-skill study. The study asks
whether an agent that retains and composes earlier procedures does better on
later tasks under controlled budgets. Each task here is a bounded,
closed `algal.experiment-task.v1` document: data, not code.

A task describes one record-triage environment. Records arrive in batches;
each record must be assigned a class from the declared taxonomy and a
decision derived by applying the declared rules in order. Judgment (which
class a record's text implies) is the part a pipeline supplies; rule
application and summary aggregation are deterministic and fully specified
by the task, so every grader can replay the expected output exactly.

## Layout

```
configs/                  algal.experiment-family.v1 generator configs
  acquisition.family.json   seed 20260925, 8 tasks
  unseen.family.json        seed 987654, 8 tasks
  shift.family.json         seed 77013, 4 tasks evolved from acquisition
tasks/<phase>/            generated algal.experiment-task.v1 files + index.json
pipeline/
  record-triage.algal.json       reference pipeline (agent + expr cells)
  record-triage.responses.json   scripted classify responses for the
                                 acquisition batches, keyed by request digest
```

## Task spec: `algal.experiment-task.v1`

A task spec is a closed object with exactly these keys. Unknown keys at any
level are rejected, and every value is parsed from `unknown` with bounds.

| Key | Contents |
| --- | --- |
| `contract` | the string `algal.experiment-task.v1` |
| `taskId` | bounded kebab-case id (max 64 chars) |
| `phase` | `acquisition`, `unseen`, or `shift` |
| `family` | `{id, seed, index, config, revisedFrom?}`; `id` is `record-triage`, `seed`/`index`/`config` carry generation provenance, and `revisedFrom` appears on shift tasks |
| `taxonomy` | `{classes: [{id, about}]}`; at most 32 classes |
| `recordSchema` | `{fields: [...]}`; declares the `id` field plus typed fields (`text`, `int`, `choice`, `bool`) |
| `rules` | at most 16 `{id, when, then}` rules, applied in order |
| `outputFormat` | `{fields: {decision, priority, queue}, summaries}`; each field lists its allowed labels |
| `inputs` | 1 to 8 batches `{id, split, records, expect}`; `train`, `validation`, and `holdout` are all required; at most 64 records per batch |
| `grader` | `{kind: "exact"}` or `{kind: "scorer", scorer, passAt}` where `scorer` is a checked `algal.expr.v1` program over `{args, expect, outputs}` |
| `digest` | `sha256:` of the canonical spec body; reparsing verifies it |

### Rule semantics

`when` is a closed map over a fixed slot vocabulary: `label` (the record's
assigned class), the numeric slots `severity`, `amount`, `prior-contacts`,
`account-age-days`, `wait-minutes`, `satisfaction-score`, the categorical
slots `channel`, `tier`, `region`, `device`, `locale`, and the boolean slots
`outage`, `verified`. Non-label slots require a record field of the same
name and matching kind in `recordSchema`.

- A numeric slot takes `{min?, max?, eq?}` over integers.
- A categorical or `label` slot takes `{in: [...]}`, membership over labels.
- A boolean slot takes a literal `true` or `false`.
- A rule matches when every declared slot condition holds.
- Matching rules apply in list order; each merges its `then` fields over
  the accumulated decision, so later matches win per field.
- The first rule must have an empty `when` and a complete `then`, so every
  record receives a total decision.

### Expected output

Each batch carries `expect.out = {results, summary}`. `results` lists one
`{recordId, label, decision, priority, queue}` per record in input order.
`summary` lists the declared summaries (`total`, `perLabel`, `perDecision`,
`perPriority`, `perQueue`) as `{name, counts: [{key, count}]}` entries.
`algal experiment check <task.json>` reparses the spec and replays every
expected output from the declared labels; generation never trusts the
values it wrote.

## Generation: `algal.experiment-family.v1`

The generator is host-side tooling in `src/experiment-family.ts`. A config
names a seed, a phase, a task count, per-split record counts, and a `shape`
(ranges for classes, optional fields, rules, label pools, and summaries,
plus the grader mix and scorer threshold). `algal experiment tasks
<config.json>` emits the `algal.experiment-set.v1` index; `--out <dir>`
also writes the task files. Identical config and seed produce identical
canonical bytes; the set index records the config digest, per-task digests,
and a set digest.

Shift configs add `evolve`: the generator replays the base environment
from `evolve.fromSeed`, expands the schema from a reserved field pool,
swaps `reviseClasses` taxonomy entries for unseen classes, and applies
`jitterRules` threshold or membership edits. Expected outputs are
recomputed, and each shift task records `family.revisedFrom`.

## The reference pipeline

`pipeline/record-triage.algal.json` is the reference implementation of the
pipeline contract: interface inputs `records` and `spec`, interface output
`out`. One `agent` cell (`classify`) maps each record id to its taxonomy
class from the record text alone; the `apply` and `summarize` `expr` cells
implement the declared rule semantics and summary aggregation
deterministically; `pack` assembles `{results, summary}`.

`pipeline/record-triage.responses.json` scripts `classify` for every
acquisition batch, keyed by `algal.effect.v1` request digest, so the
committed cases replay offline:

```
bun cli.ts run experiments/cumulative-skill/pipeline/record-triage.algal.json \
  --args <case-args.json> \
  --responses experiments/cumulative-skill/pipeline/record-triage.responses.json
```

Case args come from `algal experiment cases <task.json> --out cases.json`;
each case's `args` maps interface input names to values, and the run
expects them nested under the input cell (`in.records`, `in.spec`).
`src/experiment-pipeline.test.ts` runs every acquisition case through the
manifest under the scripted executor and asserts the declared grader
passes.

## Grading

`algal experiment grade <task.json> <case> <outputs.json>` evaluates one
run's interface outputs against the task's grader and emits an
`algal.experiment-grade.v1` record (`--out` writes it). Exact graders
require canonical equality with `expect`; scorer tasks run the declared
`algal.expr.v1` program and require `score >= passAt`.
`algal experiment grade-verify <task.json> <grade.json>` rechecks a grade
record's digest and fields.

## Bounds and determinism

The parser enforces `EXPERIMENT_TASK_BOUNDS` in `src/experiment-task.ts`:
64 records per batch, 32 classes, 16 rules, 8 `when` slots per rule,
bounded ids, labels, text, and record bytes, and a 1 MiB spec file. No
wall-clock fields appear anywhere in specs, grades, or sets; every draw
runs through a seeded PRNG so a set regenerates bit-for-bit from its
config.

## For sibling streams

- Arm runners read a task's `inputs` as cases via `taskCases` (or
  `algal experiment cases`) and grade outputs with `gradeExperimentCase`.
- Catalog and reporting streams consume `index.json` (`algal.experiment-set.v1`)
  for the task list, digests, seed, and config digest.
- Regenerate a set with `algal experiment tasks configs/<name>.family.json
  --out tasks/<phase>/`; the emitted `index.json` matches the committed
  files when the config is unchanged.
