# Registration notes for the integrator

## Suggested suite name

`host-conformance` — matches the planned-suite slot already present in
`verify/lib/suites.ts` (`PLANNED_SUITES`). This slice does not modify
`verify/lib/**`; the suite stays `not-started` until the integrator registers
it.

## How to run

```sh
bun test verify/host/
```

`conformance.test.ts` drives all 40 `HOST_VIOLATION_CASES` entries plus the
catalog-level report invariant. `runHostConformance()` (in
`conformance.ts`) returns the stable report object if a suite runner wants
structured output instead of bun-test output:

```ts
import { runHostConformance } from "../verify/host/conformance";
const report = await runHostConformance(); // {suite, total, conformant, cases[]}
```

## HST property IDs touched

The foundation touches the general host obligations in `verify/properties.json`:

- **HST-01** — bounded admission, exact signatures, sane costs:
  HC-EX-01/02/03, HC-TL-01/02/03, HC-TR-02, HC-MA-01, HC-IO-01, HC-SE-01,
  HC-DA-01, HC-CR-01
- **HST-02** — cancellation is intent, not completion evidence:
  HC-EX-05, HC-TL-04, HC-IO-02, HC-HE-04
- **HST-03** — uncertain completion, no unsafe automatic retry:
  HC-EX-06, HC-TL-04, HC-HE-05
- **HST-04** — credential custody / diagnostic exclusion from receipts:
  HC-EX-08, HC-CR-01 (partially — vault backends and provider-side custody are
  live-only)
- **HST-07** — host-event clock eligibility, delivery markers, idempotent
  mailbox delivery: HC-HE-01..06
- **HST-13** — native host executors obey the same contract: covered at the
  shared `Executor`/`commandJson` contract level only; the command-executor
  subprocess behaviors themselves are `live-only`

`verify/properties.json` is **not modified** in this task — statuses remain as
the ledger has them. If the integrator wants a record, the `HST-01/02/03/04/07`
entries can be cited as `tested` (deterministic fixture evidence) — nothing
here supports `qualified` or `proved-*`.

## Later-batch property coverage

HST-05 (coding operations), HST-06 (executable identity), HST-08..HST-12,
HST-14..HST-16 (adapter-specific: gateway/Jev/xcb/ACP/credentials/shepherd/
semantic/retrieval/coding-jobs/repair/GitHub/browser/application) are not
covered by this foundation — see `SCOPE.md` for the deferred-adapter table.

## Evidence status and limits

- 40/40 cases conformant under `bun test verify/host/` (Bun 1.3.14).
- `bunx tsc --noEmit`: zero errors in `verify/host/**`. Sibling untracked
  work-in-progress under `verify/receipt/`, `verify/reference/memory/`, and
  `verify/rust-bridge/` carries its own type errors — unrelated to this slice.
- Fixtures use `MemoryStore`, `MemoryMailboxService`, `FileStore`/`HostEventService`
  over `mkdtemp` scratch dirs, and injected clocks. No subprocess, no network,
  no real credentials.
- The obligation list in `contract.md` marks what is `live-only` — no fixture
  here claims to qualify a live adapter.
