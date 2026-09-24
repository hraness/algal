# Malleable application roadmap delivery

Execution record for the owner-authorized continuation of
[the architecture roadmap](malleable-software-plan.md). Started 2026-09-23 from
`95298c62d05487772a83dffa6014cd4b66454d7e`, after the first marketing surface
shipped in [PR #65](https://github.com/hraness/algal/pull/65).

The delivery target is every required stage A–G and its stated exit evidence.
Optional browser-local kernel work is an explicit design decision, not a
prerequisite to claim a browser renderer. Synthetic experiments cannot establish
live conversion improvement. Missing provider measurements remain unknown.
The earlier rejected strategy stays inactive.

The subsequent browser-local continuation now advances the work deferred by
stage G. Its north star is a self-evolving application that can reopen and work
entirely inside the browser, with optional WebGPU inference. See
[the browser workspace](browser-grow.md) for its deliberately bounded first
application and separate persistence, offline, and inference claims.

The next browser-local data application ports the existing task model to
IndexedDB, with saved drafts and evaluated workflow/schema changes. Its
acceptance test is preservation of user tasks through a category migration,
reload, and further editing with networking disabled. The implementation and
test record are tracked alongside [the task workspace guide](browser-tasks.md).

## Dependency and ownership graph

1. **Contract convergence — implemented and reviewed.** Root owns shared contracts, this
   record, integration, final checks and delivery. Read-only audits cover the
   captured-state/signal host, cloud lifecycle, and local application seams.
2. **Signals and workbench.** A durable example-owned captured view joins one
   application head to rendered nodes, input provenance, history, action
   availability and evidence. Signal admission is bounded, identity-aware and
   ordered; controls use the same expected-head admission for humans and agents.
3. **Shadow evolution.** Independently checked proposal constraints and retained
   failure/uncertainty/usage evidence. No automatic public promotion from a
   model's own quality assertion. Join with the workbench before shipping.
4. **Hosted rollout.** Align the cloud host with current application lifecycle;
   bind tenant/revision/evidence, coherent delivery and exposure assignment.
   Validate A/A instrumentation, recovery, kill switch and restoration without
   replaying effects. Reuse existing infrastructure after identity inspection.
5. **Local application and richer evolution.** A useful task-triage application
   with persistent user state, typed forms/actions, native/TUI delivery, local
   inference, migration and explicit fork conflict policy. Exercise network-denied
   operation and a revision change with actual local inference.
6. **Whole-roadmap join.** Review all artifacts and recorded evidence; run required
   aggregate and delivery gates on each changed repository. Keep unfinished or
   externally blocked criteria visible rather than reducing the roadmap to the
   first successful demonstration.

Workers share the assigned checkout for disjoint edits and must preserve other
work. Each worker owns focused validation; root owns aggregate, browser and
production checks. One owner per remote CI/deployment wait. Heavy local commands
use the installed host scheduler. No separate update-plan tool is available;
this document records orchestration state.

## Stage status

| Stage | Evidence | Delivery scope |
| --- | --- | --- |
| A | Qualified portable filesystem/memory lifecycle, 19 native/reference receipts and 38 cross-verifications; same task capture/actions across browser, desktop and TUI; shared session fixtures; actual renderer costs and limitations measured | No missing local exit evidence. Desktop's provisional CUA-inclusive action budget failed; performance remains experimental, with paint latency unisolated |
| B | Qualified static fallback, independent mounts, keyboard continuity, expected-head rejection, preview/adoption and restoration; actual staging preview and owner browser checks pass | Staging qualification; production acceptance checks the deployed capture against the validated build |
| C | Qualified ordered/deduplicated signals, same-capture explanations, persistent controls, journal/history and interrupted-publication/restart behavior | Local owner and public read-only captures share the same bounded read model |
| D | Real Gateway attempts retained; independent pass/fail/inconclusive shadows; guarded adoption; one joined provider-reported USD 0.001369 debit, with the original unknown preserved | Missing/malformed provider billing remains unknown; recorded public fixtures make no inference calls |
| E | Shared lifecycle in actual workerd, immutable core dependency pin, typed client, owner dashboard, A/A instrumentation, inert recovery and forward restoration | The [cloud delivery record](https://github.com/hraness/algal-cloud/blob/codex/application-roadmap/docs/application-roadmap.md) owns exact integration, isolated hosted qualification and dashboard evidence |
| F | Final exact-source Dioxus/Ratatui package: 37 extraction checks, 11 packaged offline checks, actual native typing/select/draft interactions; real network-denied Apple revision change and matching packaged provider binaries | Functional exit qualified for macOS arm64; ad-hoc signed, not notarized; broader platforms and desktop performance are not production-qualified |
| G | Qualified materially different task application, actual v1→v2 migration, workflow changes, typed forms/actions, core lifecycle conformance, pure evidence forks and explicit field conflicts | Full browser-local kernel explicitly deferred, not claimed by the browser renderer |

Core commit `39607174063030eb4793ab65601a41d7d7c918d4` passed the aggregate
gate (984 tests, 19 conditional native skips), seven CI jobs, CodeQL and Vercel.
The final package is bound to that clean source inventory. Provider-cost
evidence and renderer measurements are subsequent source additions; they do not
change the qualified package binaries. Final source checks, independent review,
merge and deployment identities are tracked in [core PR #67](https://github.com/hraness/algal/pull/67)
and [cloud PR #56](https://github.com/hraness/algal-cloud/pull/56). Production
acceptance compares the published capture with the validated build and checks
source inspection, phone layout, no-JavaScript fallback and documentation.

## Tardigrade transfers

Use one captured state for human presentation, agent command descriptions and
explanations. Version derived projections, preserve sufficient source evidence,
and test replay against incremental projection. Fork into a fresh identity with
no copied external dispatch authority. Preserve ALGAL's uncertain-effect
reconciliation; do not adopt automatic retry of an uncertain external action.
These are design transfers, not a new runtime dependency.

Source comparison is pinned to
[Tardigrade 513588b](https://github.com/clavia-labs/tardigrade/commit/513588bb7779ea3d98e94dab35992be0ff5d6ecd).

## Implementation and focused evidence — current continuation

The storage extraction preserves the filesystem application ABI while exposing
`ApplicationCore` and `ApplicationStorage`. The volatile memory adapter and
filesystem adapter share lifecycle conformance fixtures, including interrupted
publication, uncertain dispatch, concurrent namespace limits and quota recovery.
Portable imports avoid eager filesystem dependencies; workerd still requires
`nodejs_compat` and the explicitly injected expression WASM. This is not a claim
that the complete core runs in a browser.

The marketing workbench now has ordered signal envelopes, same-snapshot node
explanations, history, owner controls, bounded inference observations and shadow
checks. A loopback owner server serves the same page as the public read-only
capture. Independent review repaired missing-evidence healing in shadow replay.
Journal/settlement review passed 23 tests and 147 assertions, including a second
review of prepared-file durability. The site build, DOM-only TypeScript and
focused browser-boundary tests have passed. Fifteen real-browser checks passed
for public/owner captures, preview/adoption, controls, stale commands, imports,
phone dark layout, delayed saves/submissions, composition, session restart and
the distinction between a reported charge and historical unknown billing.
Four additional [composition-removal checks](../examples/local-triage-web/composition-qualification.json)
exercise the production browser renderer: removing a composing control waits,
preserves its draft, clears incompatible focus and requires explicit rebase.
These use synthetic composition events and an alternate valid captured fixture;
they do not claim a permitted schema downgrade or physical-IME qualification.
The qualified Vercel staging preview joined the exact capture and application
head. Production acceptance repeats the published capture and browser checks.

The second bounded Gateway call retained generation
`gen_01M384V57X8NE8CXGXFVMT8FPE`, 949 input tokens, 84 output tokens and a
provider-reported debit of USD 0.001369. Cost identity and replay joins passed;
its independent shadow remained inconclusive and the application stayed
unchanged. The sanitized [cost evidence](../examples/malleable-site/model-cost-evidence.json)
is separate from the original attempt, whose unknown bill remains unknown.
Missing or malformed provider billing metadata is never replaced with a budget
reservation or an estimated charge. The measured debit is a provider observation,
not an independently reconciled account invoice.

The task-triage host is implemented with persistent facts, pure forms/actions,
schema migration, explicit fork conflict resolution and separate durable sessions.
Its focused host suite passed 8 tests/81 assertions after independent review
removed missing-evidence healing and cache masking. Nineteen complete
native/reference receipts matched with 38 cross-runtime offline verifications.
The Dioxus desktop and Ratatui builds passed. Browser, desktop and terminal
share semantic capture/command data; five session-identity fixtures cover adding,
changing, moving and removing controls while retaining drafts. Actual native
interaction preserved a task and independent draft across schema upgrade and
explicit rebase. It exposed Dioxus fast-typing loss and initial dropdown errors;
DOM-owned initial field values and explicit draft resets repaired both. Native
regressions exercise real virtual-DOM mutations, and actual final-package typing,
first-mount selection, panel remount, save and draft-reset checks passed.

The final macOS arm64 archive passed 37 fresh-extraction checks and 11 checks
under process-tree network denial. It includes a standalone expression-WASM host,
Dioxus app and Ratatui executable; no checkout or Bun installation is required.
The archive SHA-256 is
`e59b81d33b20af0917da6211510e76d438155af6bc05abaa5f12c3e08707e556`;
its clean source inventory SHA-256 is
`847d467faea41b756893e0620f2dcc6f1541469b7ae372bf0f6da8fcefc8dbb0`.
The offline package qualification checked restart, task retention, owner workflow
evolution, core migration, export replay and a fresh-identity fork. Domain facts
and session drafts remain separate, with explicit stale-head rebase and conflicts.
The profile is bounded to 32 tasks and 128 states; forks copy no mutable custody,
dispatch ledger or external authority. The package is ad-hoc signed, not notarized.

[Renderer measurements](../examples/local-triage/renderers/performance/README.md)
use budgets declared before execution. The embed passed nine checks: 95,438 gzip
bytes, 40.8 ms local cold readiness p95, 0.2 ms synchronous update p95, 772,676
bytes retained JS growth after 1,000 revision swaps and 100 mount cycles, zero DOM
growth and no measured host interference. Packaged host capture and TUI snapshot
p95 were 83.0 ms and 241.7 ms. Desktop readiness was observed within 4,976 ms;
main-process RSS grew 1,622,016 bytes after twenty verified actions. Its
CUA-inclusive action p95 of 2,751 ms **failed** the declared 2,000 ms budget.
A separate host-service action probe measured 916.5 ms p95, but does not isolate
painting or clear that failure. These measurements establish bounded costs and
limitations on one development Mac, not production SLOs. The passive Dioxus Web
spike is not an equivalent interactive comparison; retain the lightweight site
adapter and the experimentally qualified Dioxus desktop.

A real Apple Foundation Models proposal passed under macOS process-tree
`deny network*`. A socket probe returned EPERM. The proposal changed grouping
from status to priority, was independently evaluated and explicitly adopted;
tasks survived restart, export replay and a new-identity fork. The retained native
receipt is `sha256:0a4928fe2318b7ff0eb5dffb18ab63e219e49125444c7b534caa19e7dbba62c4`.
This describes the tested on-device path, not an attestation about the Apple
service or every local model. Apple token usage and actual provider billing are
unknown. Packaged native and Apple bridge hashes match the binaries that produced
the qualified receipt; the packaged offline smoke made no extra inference call.
Apple inference requires supported hardware, macOS 26+, enabled Apple Intelligence
and locally available model assets. Private execution artifacts are retained
outside the repository.

The cloud branch `codex/application-roadmap` integrates the shared lifecycle
through Durable Object SQLite, explicit durability boundaries and the existing
writer queue. Pure owner artifact admission, captured-head delivery, controls,
A/A assignments/exposures and typed clients are implemented. All six dependency
pins use the qualified core commit above. Recovery format extensions preserve
the old optional egress pair and make the new application pair atomic. The
repair aggregate passed 615 Bun tests, 235 application workerd tests, four
assurance workerd tests, nine TLC probes, nine Lean probes and 96 component
harness checks, plus types, client guards, claims and four deployment dry runs.
A memory-only restoration now returns settled conflict without publication;
the qualification explicitly changes a pure layout before restoring it forward.
A local owner dashboard keeps the tenant key out of the browser and rejects
mismatched capture/assessment heads. The companion cloud delivery record retains
subsequent mainline integration and the isolated worker, synthetic A/A, kill,
restoration, archive and dashboard outcomes. Historical A/A evidence recovered
from the interrupted qualification is labelled as replayed from retained backup.

The separate cloud production-assurance program remains separate: this roadmap
does not enable its public activation switch, financial paths, public SLO or
unbounded traffic optimizer. The prepared qualification worker has no provider
or payments bindings. A/A proves instrumentation behavior, never conversion uplift.
