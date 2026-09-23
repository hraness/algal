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

| Stage | Current evidence | Remaining acceptance |
| --- | --- | --- |
| A | Portable application core with filesystem/memory conformance; 19 local-triage native/reference receipts and 38 cross-verifications; shared session fixtures and renderer profiles | Final integration and exact-artifact native interaction checks |
| B | Previously shipped embed/fallback/independent mounts; owner preview, adoption and forward restoration; current browser flow passes | Current production delivery verification |
| C | Ordered/deduplicated signals; same-capture explanations; persistent controls, inference journal and history; interrupted publication and restart tests | Final integration delivery |
| D | Retained real Gateway attempt, independently replayed pass/fail/inconclusive shadows; failure/uncertainty visibility; guarded model adoption | Final public fixture/build and delivery; actual provider billing remains unavailable |
| E | Shared lifecycle in actual workerd; 11 runtime tests, owner front-door test, 12 recovery tests, 17 recovery-client tests; typed client and owner dashboard | Exact core dependency pin, aggregate gate, isolated hosted A/A/recovery and dashboard qualification |
| F | Dioxus/Ratatui package; 36 extraction checks; real Apple proposal and revision change under process-tree network denial; persistent facts and drafts | Native rapid-typing/initial-selection repair, final package, and final packaged offline check |
| G | Second task application; actual v1→v2 migration, workflow changes, typed task widget profile, pure evidence forks and explicit merge conflicts | Final whole-roadmap join; browser-local full kernel is deferred, not a requirement of the browser renderer |

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
Journal/settlement review passed 21 tests and 139 assertions, including a second
review of prepared-file durability. The site build, DOM-only TypeScript and
focused browser-boundary tests have passed. Fourteen real-browser checks passed
for public/owner captures, preview/adoption, controls, stale commands, imports,
phone dark layout, delayed saves/submissions, composition and session restart.
Production delivery remains pending.

The task-triage host is implemented with persistent facts, pure forms/actions,
schema migration, explicit fork conflict resolution and separate durable sessions.
Its focused host suite passed 8 tests/81 assertions after independent review
removed missing-evidence healing and cache masking. Nineteen complete
native/reference receipts matched with 38 cross-runtime offline verifications.
The first Dioxus desktop and Ratatui build passed. Browser, desktop and terminal
share semantic capture/command data; five session-identity fixtures cover adding,
changing, moving and removing controls while retaining drafts. The first extracted package passed 36 checks. Actual native interaction preserved
a task and an independent draft across a schema upgrade and explicit rebase.
It found fast-typing loss and initial dropdown mismatches in Dioxus; those are
being repaired before the final package and native interaction acceptance.

A real Apple Foundation Models proposal passed under macOS process-tree
`deny network*`. A socket probe returned EPERM. The proposal changed grouping
from status to priority, was independently evaluated and explicitly adopted;
tasks survived restart, export replay and a new-identity fork. The retained native
receipt is `sha256:0a4928fe2318b7ff0eb5dffb18ab63e219e49125444c7b534caa19e7dbba62c4`.
This describes the tested on-device path, not an attestation about the Apple
service or every local model. Token usage and actual provider billing are unknown.
Private execution artifacts are retained outside the repository.

The cloud branch `codex/application-roadmap` integrates the shared lifecycle
through Durable Object SQLite, explicit durability boundaries and the existing
writer queue. Pure owner artifact admission, captured-head delivery, controls,
A/A assignments/exposures and typed clients are implemented. Its focused actual
workerd suite passed 11 tests; cloud TypeScript passed. Recovery format extensions
preserve the old optional egress pair and make the new application pair atomic.
Recovery passed 12 actual workerd tests and 17 client tests; the owner front-door
test passed tenant isolation, typed commands and inert recovery. Final dependency
pinning, the aggregate gate and bounded live qualification remain pending. A local owner dashboard keeps the tenant key out
of the browser and rejects mismatched capture/assessment heads.

The separate cloud production-assurance program remains separate: this roadmap
does not enable its public activation switch, financial paths, public SLO or
unbounded traffic optimizer. The prepared qualification worker has no provider
or payments bindings. A/A proves instrumentation behavior, never conversion uplift.
