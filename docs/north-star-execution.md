# ALGAL north-star execution and portfolio adoption

## Overview

This plan defines the next execution and adoption increment for
[the vision](vision.md), including carrying relevant ALGAL improvements into
every portfolio consumer. It joins state-driven execution, recovery, and
consumer migration without replacing the existing program, application,
process, or evaluation contracts or the [application roadmap](malleable-software-plan.md).

The immediate priority is a tested observe/propose/check/commit loop and an
owned consumer register. A language rewrite, unrestricted evaluation, a new
permanent UI, and automatic production self-modification are outside this plan.
The [lineage comparison](lineage.md#invariant-driven-agent-execution) records
the supplied Geoffrey Huntley image as design input, not implementation evidence.
All implementation phases below are **Not started**.

Source-preserving memory is a separate, related increment. The optional
[progressive reader](../spec/v1/context-history.md) is implemented in Bun and Rust
and leaves existing context behavior unchanged by default. Optional
[recorded summary jobs](../spec/v1/context-history.md#explicit-summary-jobs)
reuse its process journal and work account, with portable offline verification
and conditional publication. Consumer adapters and longitudinal evaluation
remain planned; neither the reader nor the job driver enables them by default.
The [scoped-memory direction](north-star.md#scoped-memory-and-progressive-context)
tracks that work; its reader foundation does not complete C0 through C4 below.

The [contract and resource experiments](north-star.md#initial-contract-and-resource-experiments)
add a follow-on direction: contract/runtime correspondence, mixed resource
requirements, suspendable effects, and measured repayment of procedure-building
costs. They do not silently enlarge C1 or complete any phase below. Each selected
experiment needs a scoped implementation plan; C0 records affected consumers and
C4 can use the resulting evidence. Cloud owns funding and hosting through its
[companion north star](https://github.com/hraness/algal-cloud/blob/main/docs/north-star.md).
Existing application/process mechanisms can support early fixtures without
waiting for the whole actor-language plan.

## Constraints

- Models propose typed programs or transitions. The host owns permissions,
  safety checks, completion predicates, runtime integrity, and activation.
  An ordinary proposal cannot revise those controls.
- Safety invariants hold at every transition. Completion requires the declared
  predicates, required child results, and appropriate effect evidence.
  Model text, a completed interpreter slice, or budget exhaustion alone is
  insufficient. Limits still bound work when completion has not been reached.
- Re-observe after each meaningful transition. Bind a proposal to the observed
  state, inputs, program, permissions, and check versions; reject stale work
  before a new dispatch or publication.
- Preserve current user data, original effects, and uncertain outcomes.
  A rejected pure candidate changes no accepted head. Strategy restoration is
  a forward change; it does not rewind data or external actions. Changes to
  user-data schemas need their own migration and recovery evidence.
- ALGAL owns reusable contracts, replay, composition, and evaluation. xcb owns
  provider credentials, process confinement, account ownership, and proof of
  process exit. Consumers own domain acceptance and external-effect adapters.
- Artifact publication and operational activation are distinct. Preserve each
  repository's checks and relevant live acceptance criteria. Keep risky behavior
  disabled until it has the required evidence; do not make every package release
  depend on unrelated live-provider work.
- Pin supported immutable artifacts or full source revisions independently in
  each consumer. Do not bind repositories to moving `main` branches or local
  sibling paths. Preserve historical programs, receipts, and experiment pins.
- Portable resource requirements and host financial state have different owners.
  ALGAL keeps deterministic work budgets, permission types, and recorded effect
  semantics. Cloud or another host validates source backing, allocation terms,
  tariffs, and external usage. A grant is not permission; a credential is not
  funding. Add a shared record only for a demonstrated gap, with old-version
  replay and Bun/Rust correspondence. A persistent allocation migration is its
  own phase, with ownership mapping, dry run, and restore evidence.
- Hosted consumer pilots reserve hosting independently of provider allowances,
  including deterministic/cached work and retention. Their records name the
  hosting payer, backed allocation, captured customer terms, and recovery
  funding. Cloud's [hosting cost-recovery plan](https://github.com/hraness/algal-cloud/blob/main/docs/hosting-cost-recovery-plan.md)
  owns collection and expense reconciliation. This does not impose Cloud
  pricing on local ALGAL use or make live billing a core publication gate.
- Each rollout has one ALGAL integration owner and one owner per consumer.
  Workers edit disjoint scopes; the integration owner updates this plan's status
  and joins evidence. Only explicitly authorized task-owned delivery proceeds.
- Validation commands below name the child checks. Run broad checks, builds,
  and native work through the installed `host-run` scheduler unless the owning
  repository already schedules them. Keep browser work in its required lane.

## Consumer discovery and adoption register

A bounded discovery on 2026-10-04 inspected Hraness organization code search
and default-branch dependency declarations. It confirmed ALGAL pins in 15
TypeScript consumer repositories and the native xcb repository. These 16
repositories are a lower bound, not a complete or production-qualified census.
A declaration can support runtime work, development, an experiment, or retained
compatibility; its role must be checked before assigning an upgrade.

Public examples include xcb, `@hraness/sys1`, `ghostget-skills`,
`@hraness/algal-lab`, Textbutler, Slopcamera, and Clankdar. Private hosted,
browser, application, and research consumers also belong in the register.
The complete consumer record and private operational evidence belong in the
private portfolio planning repository. `portfolio/algal-consumers.json` is the
proposed register path, not an artifact created by this plan. C0 must name its
repository owner and exact write scope before authoring it.

Discovery covers more than dependency declarations:

| Consumer class | What must be inspected | Adoption evidence |
| --- | --- | --- |
| TypeScript packages and reverse dependents | Manifests, lockfiles, imports, bundles, export contracts, and packages that embed ALGAL indirectly | Typechecking, packed-package/import checks, and consumer-owned behavior tests |
| Native embeddings | Cargo manifests and locks, runtime adapters, receipt codecs, compiled binaries | Native gates, checkpoint/receipt replay, and cross-runtime conformance |
| Browser and hosted adapters | Portable exports, expression WASM, storage adapters, event delivery, deployment identities | Persistence, duplicate/conflict/crash cases, data-preserving migrations, and platform-specific acceptance |
| CLI and installed agent workflows | Executable and skill identities, declared tool calls, program catalogs, installers and managed installed copies | Exact-install command checks, bounded outputs, permissions, and receipts |
| Stored, scheduled, or vendored programs | Manifest and dependency digests, executor profiles, checkpoints, future schedule bindings | Explicit re-admission for future work and replay of historical occurrences without rewriting them |
| Experimental or legacy integrations | Owner, supported role, original source/evidence, and whether any current product still depends on them | New experiment identities or supported compatibility evidence; no rewritten historical results |

For each consumer record, require repository and source revision, exact path,
owner, lifecycle role, dependency route, resolved ALGAL identity, contract and
executor profile, relevant change scope, validation commands, data/effect risks,
rollout and recovery requirements, status, and evidence references. A supported
compatibility hold additionally names its reason, owner, expiry, and next action.
Deduplicate worktrees, caches, and archived fixtures; they are not independent
products. Track managed installations separately from source repositories.

Use explicit statuses: discovered, inspected, not affected with evidence,
planned, validated, delivered, activation verified where required, held, or
blocked. Accounted-for consumers and updated consumers are different counts.
A hold remains adoption work, and an inaccessible or unknown source remains
unknown. Report the census's date, scope, cap, and unresolved sources with every
coverage claim.

## Phases

| Phase | Deliverable | Depends on | Parallelism |
| --- | --- | --- | --- |
| C0 | Owned consumer register and change-impact matrix | None | Discovery can run beside C1; register writes have one owner |
| C1 | State-driven step and recovery conformance | None | Core-only scope; no consumer repins |
| C2 | Native execution and reusable tool integrations | C0, C1 | Disjoint consumer repositories with one integration owner |
| C3 | Remaining product, platform, and installed-consumer updates | C2 | Disjoint consumer scopes in risk-ordered batches |
| C4 | Cross-consumer evaluation and continuing adoption obligations | C2 and two validated consumer workloads | Runs beside remaining C3 migrations; evidence work does not mutate active deployments |

## Phase C0: consumer register and impact matrix

- **Status:** Not started
- **Depends on:** None
- **Objective:** Every reachable portfolio repository and managed integration
  has an inspected ALGAL relationship or an explicit unknown classification.
- **Scope:** The private consumer register, its source-evidence references, and
  this plan's discovery status. The register owner is assigned before writes.
- **Out of scope:** Dependency changes, installation changes, provider state,
  production activation, and mutation of historical evidence.
- **Approach:** Reconcile the portfolio registry with a fresh organization
  repository list. Inspect exact source revisions, nested manifests, locks,
  imports, CLI use, native dependencies, stored programs, and reverse
  dependents. Code search is discovery, not proof that an integration is active
  or that no other consumers exist. Inspect scheduled and installed identities
  only through their owners' approved read paths.
- **Acceptance criteria:** Every inspected integration has the fields above
  and literal validation commands. Every repository is classified; capped
  searches, unavailable private sources, and unknown installed state remain
  visible. Every proposed core change maps to affected consumers and an owner.
- **Validation:** Run the following bounded discovery commands, inspect each
  candidate's source, and retain the source revision and result limits. Reconcile
  the result with the private register; these commands alone cannot close C0.

```sh
gh repo list hraness --limit 200 --json nameWithOwner,isArchived,defaultBranchRef
gh search code algal --owner hraness --filename package.json --limit 100 --json repository,path
gh search code algal --owner hraness --filename Cargo.toml --limit 100 --json repository,path
```

## Phase C1: state-driven step and recovery conformance

- **Status:** Not started
- **Depends on:** None
- **Objective:** A limited step can preserve safety, reject stale work, report
  completion from declared evidence, and resume without repeating uncertain work.
- **Scope:** `src/application*.ts`, `src/process*.ts`, their native counterparts
  in `crates/algal/`, shared fixtures, the relevant `spec/v1/` contracts, and
  application/process parity drivers. Assign narrower file ownership per task.
- **Out of scope:** Provider credential handling, unrestricted host evaluation,
  consumer migrations, a new UI, and a second responsibility runtime.
- **Approach:** Start from expected-head transitions, proposal/evaluation/
  activation, process checkpoints, and forward strategy restoration. Express
  checks using existing contracts where possible. Add a versioned primitive
  only for a demonstrated gap. Recovery choices are limited data tied to the
  failed step, observed version, and permissions, not executable model text.
- **Acceptance criteria:** Named fixtures reject stale proposals and recovery
  choices, changed permissions, self-authorized check changes, false completion,
  and unresolved required children. Pure rejection preserves the head. Crash
  before a dispatch does not invent a result; crash after a possibly executed
  effect preserves uncertainty and never dispatches it again automatically.
  Restart preserves the available recovery choices. Budget exhaustion remains
  distinct from completion. Rust and TypeScript reproduce the same evidence.
- **Validation:** Run focused regressions and the affected parity drivers,
  followed by the repository's aggregate and native gates for changed code.

```sh
bun test src/application.test.ts src/application-restoration.test.ts src/process.test.ts
cargo build --locked
bun scripts/application-parity.ts
bun scripts/process-parity.ts
bun run check
cargo test --workspace --locked
cargo clippy --workspace --all-targets --locked -- -D warnings
cargo fmt --all -- --check
```

## Phase C2: execution and reusable tool integrations

- **Status:** Not started
- **Depends on:** C0, C1
- **Objective:** Native execution and reusable tool packages consume the tested
  contracts before their reverse dependents migrate.
- **Scope:** The xcb native ALGAL dependency, managed-program adapter and tests;
  the inspected tool/catalog/evaluation consumers in C0, including
  `@hraness/sys1`, `ghostget-skills`, and `@hraness/algal-lab` where affected.
  Each task names its own repository, paths, and immutable update target.
- **Out of scope:** A blanket repin to newest source, provider activation,
  historical experiment rewrites, and unrelated Valhalla or Convex migration.
- **Approach:** Follow the source/dependency graph, with native and tool wrappers
  preceding their consumers. In xcb preserve atomic checkpoint/child publication,
  project grants, account ownership, and the no-retry executor profile. Keep
  planner completion separate from domain acceptance. Inspect catalog manifests
  and packed installs as well as API imports; a source repin is insufficient.
- **Acceptance criteria:** Each affected row passes its recorded consumer tests
  on the selected artifact. Existing occurrences replay under their original
  identity. Future controllers require explicit re-admission. No SDK import
  starts a provider or acquires permissions. Unqualified behavior stays disabled.
- **Validation:** For xcb, run the focused protocol and assurance cases below
  and its native managed-program tests, then all gates required by xcb's
  `AGENTS.md`. Other consumers run the literal checks recorded in C0, including
  their packed/install boundary where applicable.

```sh
bun test test/protocol.test.ts test/assurance.test.ts
cargo test -p xcb-runtime --locked managed_program
```

## Phase C3: product, platform, and installed-consumer adoption

- **Status:** Not started
- **Depends on:** C2
- **Objective:** Every affected active consumer uses the compatible contract and
  intended behavior, with product-specific preservation and acceptance evidence.
- **Scope:** All remaining affected C0 rows: direct and transitive products,
  browser/cloud/native adapters, research workflows, CLI callers, managed skill
  installations, and future stored/scheduled program bindings. Each batch has
  exact repository paths, owners, and deployment or installation targets.
- **Out of scope:** Making every product autonomous, widening capabilities,
  replaying old external actions, and overwriting historical evidence.
- **Approach:** Order batches by dependency and data/effect risk. Update adapters,
  manifests, evaluator/check references, and behavior as well as dependency pins.
  Preserve a supported incumbent during rollout. For persistent data, inspect
  the exact target and validate a migration dry run and recovery path before
  effects. Test model-unavailable operation when the product promises it.
- **Acceptance criteria:** Every affected active row is validated and delivered,
  with installation/deployment acceptance where required. Persistence and user
  drafts survive applicable migrations. Duplicate, stale, failed, and uncertain
  effect cases pass through the actual adapter. Unknown sources and holds keep
  C3 partial or blocked; they never count as completed updates. Unaffected and
  historical rows have evidence for that classification.
- **Validation:** Run each row's recorded consumer and repository gates. Add
  browser/offline, workerd, native, packed-package, or live adapter checks only
  for the claims and activation behavior that require them. Bind every result
  to its source, artifact, toolchain, environment, and target.

## Phase C4: cross-consumer evaluation and continuing adoption

- **Status:** Not started
- **Depends on:** C2 and two validated consumer workloads from C2 or C3
- **Objective:** Measure whether retained procedures improve later work in
  different consumers, and make future ALGAL changes own their adoption work.
- **Scope:** Consumer-owned recurring-task studies, the cumulative-skill
  experiment's evidence, the private register, and this plan's completion record.
- **Out of scope:** Quality or cost claims from package updates or synthetic
  protocol checks alone, and automatic production promotion.
- **Approach:** Start with two materially different validated workloads while
  other C3 migrations continue. Compare retained procedures with fixed-agent,
  no-library, fresh-synthesis, and conventional baselines under comparable
  models, tools, information, and total resource vectors. Include procedure
  acquisition, failed trials, evaluation, maintenance, migration, retention,
  and sponsored usage. Keep incompatible units separate. Distinguish actual
  hosting expense, customer hosting charges, earned/collected hosting revenue,
  unconsumed prepaid obligations, and subsidy. Include billing overhead and hold
  tariffs/allocation rules fixed for execution comparisons. Resource-aware
  pilots include a sponsored non-revenue workload rather than assuming all
  backing arrives through customer payments. Freeze the horizon, quality/recovery
  floors, sample/uncertainty method, minimum useful improvement, and stop rule
  before search. Further tuning after confirmation requires a new sealed
  holdout. Follow the
  [cumulative-skill experiment](cumulative-skill-experiment.md); retain failures
  and unknown provider usage. New core changes reopen their impact rows.
- **Acceptance criteria:** Report held-out task success, correction effort,
  total cost, reuse, stale-work rejection, recovery outcomes, and adoption
  coverage with denominators. Evidence identifies the tested integration and
  unverified claims. A Cloud hosting pilot identifies its cost-recovery evidence
  or unresolved status; a good procedure score cannot substitute for collected
  hosting charges or qualified billing activation. Each future contract,
  executor, storage, or workflow change assigns consumer impact and follow-up
  owners before it is called complete.
- **Validation:** Run the study and verification commands recorded for each
  workload, consume the exact C1–C3 conformance evidence, and independently
  review the comparisons. A mechanism-only outcome is a valid result when
  improvement is unestablished; it must be labeled that way.

## Definition of done

Core delivery means the changed artifact passed its source, package, security,
and provenance checks. Portfolio adoption is complete only when the census
scope is reconciled and every affected active consumer has passed its own
checks and applicable installation or activation acceptance. Unknown sources,
failed consumers, and supported holds remain visible unfinished work. Historical
experiments remain replayable under their original identities.

Keep core-delivery, consumer-validation, delivery, activation, and measured
improvement evidence separate. A checked runtime release does not complete a
portfolio migration or establish that cumulative competence has been measured.

## Implementation log
