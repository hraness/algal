# Phase 06 application protocol checkpoint

The saved evidence below identifies checkpoint `5e334ed` or an earlier snapshot.
The [upstream integration](upstream-1737.md) requires fresh checks for its changed source.

Phase 06 remains in progress: dedicated generated composition histories still
need to extend the existing create/memory/inspect grammar. The final integrated
aggregate and saved-evidence readmission passed all four registered TLC suites:

| Suite | Positive profiles | Reachability witnesses | Unsafe controls | Total runs | Retained receipt |
| --- | ---: | ---: | ---: | ---: | --- |
| Application selection | 32 | 38 | 9 | 79 | [application](../../verify/results/0c28149361fe79b4a0c14de9cbb7fc921bc2f8865ad9ef70b702723fd7e9788f/application-model.json) |
| Outbox | 18 | 33 | 10 | 61 | [outbox](../../verify/results/f1c656961a13a0d695e60f0597334957bbd953dbb6f7221259f2c6e86bf9343c/outbox-model.json) |
| Quota | 12 | 19 | 6 | 37 | [quota](../../verify/results/f62c83ad171358373b4a4b0e38407bb979bd18c439a3bb2d70a7775c0aea2a95/quota-model.json) |
| Authority | 45 | 55 | 19 | 119 | [authority](../../verify/results/590136e312b4f3a9ef99f85e75dce29b1d4ff66c820dd8659d323766cc2ca8c0/authority-model.json) |

All 296 runs were admitted with the original 128-run per-suite ceiling, 30-second
per-command deadline, one TLC worker, 256 MiB Java heap and bounded output.
Successful positive models exhaust their declared finite state graph; witnesses
and unsafe variants must fail at their designated property. Scope, constants,
fairness assumptions, exclusions and source correspondence are in the
[model inventory](../../verify/tla/README.md). These are finite model checks,
not a universal production refinement theorem.

## Executed implementation histories

The integrated [application conformance receipt](../../verify/results/94fe1192a23cb9ab9ff621aecf3256eeccd042fac712f9ff32a034e440a91c78/stateful-app.json)
records 100 Bun tests across ten files and six exact native integration-test selectors. They cover
retained-index retry after head advance and fresh host denial, both prepared
orphan outcomes, migration without newly granted source authority, result/message
CAS publication before quota-refused settlement, later valid reuse of a losing
operation, and reconciliation of a persisted old writer after memory advances.
The last case performs one real owned-file effect and proves the exercised
reconciliation does not repeat it. This is sampled conformance, not physical
exactly-once execution for arbitrary effects.

Specification wording now distinguishes indexed exact retries from missing-index
history refusal; migrated original source bindings from new host authority; and
CAS message validity from reachable settled outbox/channel evidence or external
receipt. Tests own their complete asynchronous body, release diagnostic barriers,
and join pending work before cleanup; failure to establish cleanup retains the
owned namespace.

## Upstream extraction and qualification boundary

Integration of upstream `e588f8bc9b0964e5956f4c62e60c14dfbcef171e` moves lifecycle
logic into `ApplicationCore` and custody/publication into `FileApplicationStorage`.
Independent review found that the extracted upstream filesystem adapter carried
the earlier split-mutex implementation. The reviewed port preserves one stable
pending mutex, compatibility custody for existing namespaces, delayed first
namespace publication after admission/quota, prepared recovery at capacity, and
uncertain acknowledgment for failures across the entire publication/custody
lifetime. Injected stores retain digest verification and typed mismatch errors.

Sixteen added storage-boundary regressions exercise post-publication release
failure, pre-publication known failure, throwing head writes, exact retained retry
and wrong-digest injected stores. The first integrated focused run passed 76 tests
and 551 assertions across eight application files. Subsequent test-ownership
improvements passed focused tests and the final aggregate gate.

The registered application conformance inventory also includes portable-core and
storage-boundary tests. Reusing a live `MemoryApplicationStorage` through a new
core is volatile owner replacement; it does not establish filesystem durability.
Arbitrary injected adapters acquire no proof merely by implementing the interface.
The receipts linked above bind the integrated source; earlier receipts remain
historical and unchanged. [Aggregate readmission](../../verify/results/09c0a05c0829a50fd8b0b3b2686070a316f1c78ab32d5ac56cd053b751162ee3/aggregate-readmission.json)
records exact source, runtime, commands and retained evidence. Independent
acceptance review found the nine finite/sampled criteria covered by the complete
gate set, but no generated Phase 06 history domain yet exercises evolution,
outbox, quota and authority together. Phase completion and licensed
implementation claims remain pending.
