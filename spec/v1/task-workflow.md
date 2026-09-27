# Task workflow and evaluated task contracts

These contracts compose `algal.task.v1`, the task optimizer, foundry reports,
run receipts and the habitat account. They introduce no executor or capability
authority. Foreign values are copied as bounded JSON before parsing; unknown
keys, accessors and non-JSON values fail.

## Workflow config

`algal.task-workflow.v1` contains `task`, `cases`, `strategy`, `limits`, optional
`scorer` and feedback-only `reviser`. Tasks, cases, limits and revisers use the
existing task optimizer parsers. Scorers use `parseExprScorer`. Configs normalize
before execution. Training examples must exactly match the train split.

Config bounds: 4 MiB JSON, depth 48, 262144 nodes, 512 entries per collection,
1 MiB per string. Nested task and case limits apply independently. Counts stay
within optimizer limits (16 candidates, 8 rounds, 8 portfolio members) and the
habitat account's maximum 4096 runs.

## Workflow archive

`algal.task-workflow-archive.v1` has exactly `contract`, `config`, `report`,
`manifests`, `receipts` and `digest`. Both maps use canonical SHA-256 digests as
keys. `manifests` contains precisely the distinct manifests in `report.budget`
runs plus any refused manifest; `receipts` contains precisely the distinct
admitted receipts. Missing and extra entries fail. No effect cache is exported.

The digest covers every field except `digest`. Parsing verifies content hashes,
normalization, closed structural report fields and exact map closure. It does
not establish report semantics. Report bounds: 16 MiB, depth 64, 1048576 nodes,
4096 collection entries, 1 MiB strings. Archive bounds: 64 MiB, depth 72,
4194304 nodes, 8192 collection entries, 1 MiB strings. Files exceeding these
limits are rejected, never silently truncated into a different campaign.

`verifyTaskWorkflowArchive(unknown)` creates a fresh memory store. It supplies
only the archive's recorded effects to `optimizeTask`, in full admission order,
with an ordered queue for repeated request digests. The reconstructed report
must equal the original in canonical form, including revisions, candidate
scores, portfolio ordering, frozen selection, holdout and the complete account.
Every reconstructed receipt and manifest must equal its archived value. All
accounted receipts are also individually replayed and their costs checked.
Partial runs and rejected proposals receive the same treatment as winners.

The verifier accepts no provider, executor, transport or tool argument. Runtime
wire versions other than the current `RUNTIME_VERSION` fail explicitly;
verification never falls back to live execution. This verifies faithful
recorded execution. It does not establish model quality, label truth, provider
qualification, financial settlement or permission to adopt a result.

## Evaluated task artifact

`algal.evaluated-task.v1` has exactly:

- `contract` and `baseTaskDigest` for the normalized caller-owned base task.
- The normalized selected `task`, `taskDigest` and `manifestDigest`.
- `bundle`, an `algal.bundle.v1` containing exactly the compiled selected task
  manifest and no values or other manifests.
- `evaluation`: `reportDigest`, `datasetDigest`, and `strategy` (fixed, labeled
  or feedback).
- `digest`, the canonical digest of all other fields.

Bounds: 2 MiB JSON, depth 48, 131072 nodes, 512 entries per collection, 1 MiB
strings. Existing task bounds apply. `parseEvaluatedTaskArtifact` recompiles the
task and verifies exact digests and bundle content. It rejects normalization
changes that would discard unsigned fields or supply omitted defaults.

`assertEvaluatedTaskCompatible(artifact, hostBaseTask)` checks the artifact's
base digest against the host argument. It permits only instructions and
examples to differ. Every other normalized task field stays identical.

`buildEvaluatedTaskArtifact({baseTask,report,store})` requires a complete report,
a selected task matching the portfolio and final report, and its exact manifest
in the store. This builder and the artifact parser do not independently verify
evaluation. Evaluation digests are references. Before adoption, a consumer must
verify the corresponding archive and bind its base, selected task, report,
dataset and strategy under a host-owned metric and selection policy. Import
never activates a service, changes a provider or grants authority.
