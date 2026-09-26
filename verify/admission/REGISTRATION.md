# Registration notes — `verify/admission`

Phase 15 of `docs/formal-verification-plan.md` (the `lean-admission` leg).
**No existing tracked file was modified**; nothing is wired into the suite
registry — registration is the integrator's job.

## Files

- `admit.ts` — `admitResult(ctx, claim): AdmitVerdict`. Binds the
  `(snapshot, program, host, engine)` identity tuple exactly, then delegates
  the `algal.query-result.v1` payload to `checkQueryResult`
  (`verify/reference/memory/checker.ts`).
- `admit.test.ts` — `bun:test` fixtures mirroring the Lean `Witness`
  program; 16 tests pinning baseline acceptance, per-component identity
  rejection, frontier extension/retraction, and premise binding.
- `SCOPE.md` — correspondence claim and its boundaries.

## Exact command

```sh
bun test verify/admission
```

## Suggested suite wiring

`verify/lib/suites.ts` already lists `lean-admission` in `PLANNED_SUITES`.
Suggested mapping for the integration change set:

- `lean-admission` — Lean modules arm, mirroring `lean-memory`:
  `lake build Algal.Admission.Model Algal.Admission.Theorems` under the
  pinned runtime (see `verify/lean/Algal/Admission/REGISTRATION.md`); the
  sampled executable correspondence is this directory's `bun test
  verify/admission` — either as part of the same suite arm or a separate
  `admission-correspondence` arm at the integrator's discretion.
- `memory-authority`, `policy-mutation` — sibling Phase-15 lanes; this
  harness does not service them.
