# verify/evolution — registration

Suite id: `evolution-model`. Already reserved in `verify/lib/suites.ts`
(`"evolution-model"`); this directory does not modify the registry.

## Run

```sh
bun test verify/evolution
```

Everything runs in-process against `MemoryStore` +
`MemoryApplicationStorage`; no subprocesses, no native binary, no network.
A full pass is a few seconds.

## Files

- `harness.ts` — instrumented `CountingStore`, instrumented
  `createApplicationPolicyHost` wrapper, `evolutionFixture` (pure-case path:
  incumbent/winner/loser/holdout-failure strategies, proposal/search
  generators, migration program, schema-1→schema-2 memory chain, restoration
  lineage), `researchFixture` (sealed research path with deterministic
  verifier), `instrumentedCases` (per-case name-vs-value read log),
  `scriptedEngine` (in-process `MemoryQueryEngine` plug), `admitObservation`
  (observation→snapshot production path), digest/record helpers.
- `cases.ts` — the 18-case catalog; every case returns structured evidence
  and asserts exact rejection reasons on the negative legs.
- `evolution.test.ts` — Bun driver; one test per case plus a catalog
  integrity check; prints a stable per-case report.
- `SCOPE.md` — claim classification: what is proved structurally, what is
  tested finitely, what stays open.
- `REGISTRATION.md` — this file.

## Dependencies and boundaries

Cases import only from `../../src/*` (production modules) and `./harness`.
No file outside `verify/evolution/**` is added or edited. Other lanes own
their directories; this lane does not touch them.

## Report shape

Each case reports its id, the obligation tags it covers (EVO-02…EVO-08), the
production surface exercised, and its structured evidence object
(`rejected` maps label → exact rejection message on forgery legs).
