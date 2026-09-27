# v4 exploratory optimizer study

The 2026-09-27 study compared a retained program with an optimizer on 48
synthetic record-triage tasks. The optimizer produced more correct outputs
and used 2.96 times as much recorded work. Its reviser also had an extra
instruction about the corpus's opening sentences. This is an exploratory
online-feedback comparison, not an isolated or matched-spend test of revision.

See [the study](../../../../docs/cumulative-skill-experiment.md#v4-optimizer-study--2026-09-27)
for results and limitations. `report.json` records execution and accounting;
`retained.scores.json` and `optimizer.scores.json` grade original task outputs.
Legacy report fields `tasksPassed` and `heldOutPassed` mean completed runs.

## Reproduce offline

From the repository root, with Bun installed:

```sh
mkdir -p /tmp/algal-v4-study/store /tmp/algal-v4-study/configs
tar -xzf experiments/cumulative-skill/results/v4/evidence.tar.gz -C /tmp/algal-v4-study/store
bun experiments/cumulative-skill/arms/v4/build.ts /tmp/algal-v4-study/configs
bun experiments/cumulative-skill/arms/v4/replay.ts /tmp/algal-v4-study/store
bun cli.ts experiment report experiments/cumulative-skill/results/v4/report.config.json --dir /tmp/algal-v4-study/store --out /tmp/algal-v4-study/report.json
bun cli.ts experiment verify /tmp/algal-v4-study/report.json --dir /tmp/algal-v4-study/store
bun experiments/cumulative-skill/arms/v4/grade.ts /tmp/algal-v4-study/store /tmp/algal-v4-study/configs/retained.config.json sha256:fa3ab8234c60e74e12987bcfe25e3351843a27fa6dba4a5fe90556cd1e7dc646
bun experiments/cumulative-skill/arms/v4/grade.ts /tmp/algal-v4-study/store /tmp/algal-v4-study/configs/optimizer.config.json sha256:b60a56122ff843e0cd9a7d34b5309be3b7fc391906081af14701dd01a4fcfdb7
```

These commands use recorded effects and require no provider credentials.
The report's index digest describes the local store index; rebuild the report
after extracting the archive. Run the replay before interpreting a verified
report as replay evidence.

## Evidence and provenance

- Retained session: `sha256:fa3ab8234c60e74e12987bcfe25e3351843a27fa6dba4a5fe90556cd1e7dc646`.
- Optimizer session: `sha256:b60a56122ff843e0cd9a7d34b5309be3b7fc391906081af14701dd01a4fcfdb7`.
- Archive SHA-256: `d69708349cd80b2371d5a4b088358e8ec08f454082630af10d41ab9c33ea7c28`.
- Archive: 333 content-addressed JSON objects, including 138 distinct run
  receipts. It excludes the derived SQLite index, transcripts, credentials,
  and abandoned runs. Repeated deterministic evaluation receipts account for
  the difference between distinct receipts and 171 charged run admissions.
- The builder embeds the exact generator and reviser manifests used in the
  runs. It reproduces the original resolved configurations, including the
  asymmetric prompts; it does not retrofit a matched control.
- Both live commands selected `https://api.x.ai/v1`, model `grok-4.5`.
  This provenance comes from the recorded invocation, not provider
  attestation. The receipts retain requests and returned effects for replay.
- The executions preceded the verification and failure-path repairs in this
  change. Replay checks those historical executions on the repaired runtime;
  it does not claim new live qualification of the repaired failure paths.

A causal follow-up needs the same starting program and task information for
both arms, symmetric prompting, a declared feedback policy, and comparisons
at matched spending across repeated seeds. A production-derived task family
remains a separate generalization test.
