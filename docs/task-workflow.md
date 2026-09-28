# Evaluate and export a task

A task workflow compares instruction and example changes under explicit run,
work and attempt limits. It records every admitted run, including rejected
proposals and partial evaluations. Validation selects the winner before the
final holdout audit. A replay verifies those recorded decisions; the host still
owns labels, model selection, admission and rollback.

Start with the deterministic fixture:

```sh
bun -e 'import {evaluatedTaskFixture} from "./examples/task-workflow/fixture"; const f = await evaluatedTaskFixture(); await Bun.write("task-config.json", JSON.stringify(f.config));'
printf '{"task":"reply"}\n' > task-responses.json
bun cli.ts task evaluate task-config.json --responses task-responses.json --out fixed.json
bun cli.ts task optimize task-config.json --responses task-responses.json --out optimized.json
bun cli.ts task compare fixed.json optimized.json
bun cli.ts task inspect optimized.json
bun cli.ts task replay optimized.json
bun cli.ts task export optimized.json --out selected-task.json
```

The fixture measures transport and replay mechanics. Its scripted answers do
not measure a model's usefulness. The example's output filenames must be new;
commands refuse to overwrite existing archives or artifacts.

`evaluate` runs the fixed strategy. `optimize` uses the config's fixed, labeled
or feedback strategy. Both accept the existing host executor and store flags,
such as `--responses`, `--executor-cmd`, `--gateway-model`, or the paired
`--base-url` and `--model`. Provider settings and credentials are not config or
artifact fields. Use a host-owned finite provider budget in addition to the
workflow's logical limits.

A config has contract `algal.task-workflow.v1`, a normalized `task`, explicit
`cases` with train/validation/holdout splits, `strategy`, and optimizer `limits`.
An optional `scorer` is a bounded `algal.expr.v1` expression over args, outputs
and expect. A feedback config also supplies a restricted data-only `reviser`.
Task examples must exactly match training cases; a source or identical inputs
cannot cross splits. A custom scorer defines the measured metric and does not
make labels reliable.

Archives contain config, report, and the exact manifests and receipts named by
the full accounting record, including a refused manifest when exhausted.
Archives can contain private task inputs and model outputs. Keep them in the
same data boundary as the source dataset. No provider credentials belong in an
archive. The CLI creates output files with mode 0600.

`inspect` and `compare` parse and check digests without replaying effects. Their
output says `parsed-only`. Comparisons flag differences in the dataset, base
task or scorer as noncomparable and show changed instructions and examples.
`replay` reconstructs the optimizer, report and every run offline. It accepts
no provider or host executor flags. `export` requires successful replay and a
completed selection before writing a portable task artifact.

An exhausted workflow saves its partial archive and exits 1. It remains
replayable but cannot export a selected task. Unexpected host errors leave a
bounded failure record at the requested output path and retain previously
written receipts in the configured store. Such a failure record is not a
completed workflow archive.

## Host integration

```ts
import {
  verifyTaskWorkflowArchive,
} from "@hraness/algal/task-workflow";
import {
  parseEvaluatedTaskArtifact,
  assertEvaluatedTaskCompatible,
} from "@hraness/algal/task-artifact";

const verified = await verifyTaskWorkflowArchive(importedArchive);
const artifact = parseEvaluatedTaskArtifact(importedArtifact);
const compiled = assertEvaluatedTaskCompatible(artifact, hostBaseTask);
if (artifact.evaluation.reportDigest !== verified.report.digest ||
    artifact.evaluation.datasetDigest !== verified.report.datasetDigest ||
    artifact.evaluation.strategy !== verified.report.strategy ||
    artifact.taskDigest !== verified.report.selected?.taskDigest ||
    artifact.manifestDigest !== verified.report.selected?.manifestDigest) {
  throw new Error("Artifact does not match the verified evaluation");
}
// Apply the host's dataset, metric and selection policy before any adoption.
// Provider selection and execution use the host's existing adapters.
```

The archive's config task must also equal the host's base task. Verify this
binding with `compileTask(verified.archive.config.task).taskDigest` against
`compileTask(hostBaseTask).taskDigest`. Imported artifacts only permit changes
to instructions and examples. Input/output schemas, names, routes, budgets and
deadlines remain fixed. Neither parsing nor successful replay authorizes a
promotion. Keep the prior host-selected task available for rollback.

The executable API fixture at `examples/task-workflow/fixture.ts` exports
`evaluatedTaskFixture()`, returning `{ config, archive, artifact, report, store,
baseTask }`. The public contracts and limits are in
[the task workflow specification](../spec/v1/task-workflow.md).
