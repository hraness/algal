# `memory-authority` — suite registration

## Suite name

`memory-authority` — exactly as reserved under `PLANNED_SUITES` in
`verify/lib/suites.ts`.

## Run command

```sh
bun test verify/memory-authority
```

The suite is plain `bun:test` (`authority.test.ts` → `cases.ts` →
`harness.ts`); there is no separate runner dependency and no suite-specific
CLI.

## Registry status: intentionally not modified

The suite runner registry is **integrator-owned**. This task does not
edit:

- `verify/lib/suites.ts` — `memory-authority` is already listed in
  `PLANNED_SUITES`; moving it to the active table is the integrator's
  integration step.
- `verify/lib/runner.ts`
- `verify/properties.json` — property coverage bookkeeping is updated by
  the integrator when the suite is registered, not here.

## Intended integration point

`runMemoryAuthority()` in `cases.ts` returns a stable report:

```ts
{
  suite: "memory-authority",
  total: number,                     // 17
  satisfied: number,
  cases: {
    id, property, surface,           // e.g. "MEM-02", "captured-state binding"
    status: "satisfied" | "failed",
    detail?: string,                 // failure detail when failed
    evidence?: Record<string, JsonValue>,
  }[],
}
```

`surface` groups cases under the four Phase-15 headings
(`captured-state binding`, `query-witness binding`, `state/commit fence`,
`admission-host fence` / `engine fence` / `fail-closed boundary`) so the
integrated report can render coverage by authority obligation. The bun
test driver (`authority.test.ts`) already runs each case independently and
asserts the report is complete and satisfied; registration only needs to
call `runMemoryAuthority()` and surface the same JSON.

## Coverage

17 cases. Property IDs referenced: MEM-01, MEM-02, MEM-03, MEM-06, EVO-05,
EVO-06 — the memory snapshot/query, captured-state, proof-binding,
fail-closed, evolution/dispatch, and stale-evidence obligations named in
`docs/formal-verification-plan.md` for this phase. See `SCOPE.md` for the
per-case mapping and the explicit "not proved" list.
