# Registration notes — `verify/mutation`

New directory for Phase 08. **No tracked file was modified**; registry
wiring is left to the integrator, which owns `verify/lib/suites.ts`,
`verify/lib/runner.ts` and `verify/properties.json`.

## Files

- `fixtures.ts` — mints the five evidence topologies through the
  production exporter (`MemoryStore`, `parseProcessRecord`,
  `runOrganism`, `exportProcessEvidence`), including a suspension that
  carries real wake handles.
- `mutants.ts` — the 73-mutant catalog plus `rebind`/`atRecord`/`atHead`/
  `atReceipt`/`atManifest` digest-rebinding primitives and the
  `FIELD_LEDGER` field-coverage inventory.
- `run.ts` — the driver: admission probe (`parseProcessEvidence`) then
  semantic probe (`verifyProcessEvidence`), expectation matching, and the
  `algal.evidence-mutation-report.v1` report.
- `adapter.ts` — `admitMutationReport` (zero mismatched probes is the
  pass predicate), `retainEvidence` under classification `diagnostic`.
- `definition.ts` — the lane's governed-file inventory.
- `mutation.test.ts` — lane-local `bun:test` coverage.
- `SCOPE.md`, `REGISTRATION.md` — this documentation.

## Suggested suite wiring

`evidence-mutation` is already reserved in `PLANNED_SUITES`
(`verify/lib/suites.ts`). Suggested `executeSuite` arm for
`verify/lib/runner.ts`:

```ts
if (suite === "evidence-mutation") {
  const { runMutationSuite } = await import("../mutation/adapter");
  return runMutationSuite(root);
}
```

## Exact run commands

```sh
bun test verify/mutation
bun scripts/verify.ts --suite evidence-mutation
```

Measured on this tree: 5 bases, 73 mutants, 224 probes (91 admission
rejections, 107 semantic rejections, 26 documented survivors), ~1 s. No
environment variables or external artifacts are required — the lane is
fully in-process.
