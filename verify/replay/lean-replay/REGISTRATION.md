# `lean-replay` — registration

How this suite relates to the verification tree.

## Suite map

```
verify/replay/lean-replay/
  lean.test.ts    — staged build + theorem/module axiom audit
  SCOPE.md        — exercised properties and exclusions
  REGISTRATION.md — this file
```

Listed in `verify/lib/suites.ts` `PLANNED_SUITES` as `"lean-replay"`. It is
not wired into `verify/run.ts`; it runs as
`bun test verify/replay/lean-replay`. The heavier full-profile path in
`verify/lean/run.ts` remains the Lean tree's registered entry; this suite
scopes to the replay modules only.

## Machinery used

- `leanRuntime` (`verify/lean/runtime.ts`) — the pinned Lean 4 toolchain
  binding (binary digests + full distribution manifest hash).
- `runCommand` + `requireSuccess` — supervised `lake`/`lean` invocations
  with `env -i`, fixed `PATH`/`LANG`/`LC_ALL`/`TZ`, 120 s deadline, 2 MiB
  output bound.
- `parseTheoremAudit` / `parseModuleAudit` (`verify/lean/output.ts`) — the
  single-line JSON audit parsers; missing theorems, non-theorem
  declarations, and off-list axioms all reject.
- `hashFile` — bound the staged inputs at copy time.

## Dependencies

- `verify/lean/Algal/Replay/{Model,Theorems}.lean` — the audited modules.
- `verify/lean/Algal/Audit.lean` — `audit_theorem`/`audit_modules`.
- `verify/toolchains.json` — the pinned `lean`/`lake` binaries.

## Companion

`verify/replay/replay-isolation` holds the runtime side of the same
properties against `src/verify.ts`; the two are deliberately independent
claims.
