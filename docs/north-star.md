# ALGAL north star: a portable runtime for evolving habitats

Status: proposed architecture and delivery plan, 2026-10-01.

This document is the planning authority for the next ALGAL runtime direction. It
turns the existing vision of software that accumulates competence into a set of
language, runtime, cloud, consumer and developer-product goals that can be
measured and independently verified. It is intentionally more specific than
`docs/vision.md`, while preserving that document's distinction between shipped
mechanisms and the still-open cumulative-skill hypothesis.

## Executive summary

ALGAL should become **a portable, evidence-carrying actor runtime for evolving
software habitats and established agent ecologies**.

The BEAM analogy is useful at the runtime boundary. ALGAL should borrow
lightweight processes, mailboxes, supervision, failure isolation, scheduling,
distribution and behavior upgrades. It should not copy the BEAM VM wholesale or
make model calls part of the process scheduler's hot path.

ALGAL's distinct contribution is the layer BEAM does not provide: a program is
content-addressed data; effects are typed and bounded; completed work leaves a
receipt; uncertain effects stop for reconciliation; and behavior changes are
proposals evaluated against an incumbent under an explicit policy before
activation. A habitat is therefore both an actor system and a controlled
population of behavior revisions.

The implementation should stay small:

1. One portable deterministic core for values, expressions, event transitions,
   manifests, receipts and verification.
2. One actor/event contract layered over the existing process, mailbox, host-event
   and application contracts.
3. One fast source subset for deterministic event loops.
4. One durable slow path for tools, providers and model escalation.
5. Hosts and products around that contract: Bun, Rust, WASM, Cloudflare Durable
   Objects, browser storage, XCB, Ghostget and consumer applications.

The primary product metric is **verified iteration time**: how quickly a developer
can edit a small program, receive useful diagnostics, compile it, run a bounded
fixture, and verify the resulting evidence offline. Runtime speed matters, but
it is subordinate to a language that is cheap to change and a result that is
cheap to trust.

The first implementation milestone is not a distributed BEAM replacement. It is
a small actor/event laboratory that demonstrates the same behavior in the Bun
reference runtime, the Rust kernel and a hosted habitat, with exact traces and
measured authoring and execution costs.

The long-term unit of progress is an ecology, not an agent count. An organism
is a bounded executable procedure; an agent is a durable process using one or
more organisms; a habitat supplies storage, scheduling, capabilities, evidence
and permission; an ecology is the population of organisms and processes that
coordinate and improve inside that habitat; and a civilization is a federation
of separately governed habitats. The runtime plan proves the substrate one
layer at a time. It does not claim that current demos establish cumulative
general intelligence.

## What ALGAL is and is not

ALGAL is a language, portable execution contract, durable process runtime and
evolution evidence system. It is not an operating-system sandbox, a provider
credential manager, a general-purpose distributed database, or a promise that a
verified receipt is true in the outside world.

The language has two surfaces:

- **Fast loops** are typed, deterministic event handlers with bounded state,
  `notify`, `quiet`, `defer`, timers and explicit idempotency. They compile and
  verify without providers.
- **Durable organisms** are the existing ALGAL programs that can call tools,
  suspend on mailboxes, invoke models, resume after a crash, and retain
  replayable evidence.

The fast surface may explicitly escalate to the durable surface:

```text
inbound event -> fast loop -> agent.request -> durable process -> typed result -> resume
```

An agent is a slow effect selected by the program. It is not the actor runtime.

The same boundary applies at ecology scale. An ecology may contain many agents,
but its continuity comes from shared contracts, retained evidence, scoped
memory, role interfaces, supervision and explicit activation policy. More
processes do not by themselves constitute a more capable ecology.

## Design principles

### Borrow BEAM semantics, not BEAM implementation

The useful BEAM ideas are lightweight independent processes, mailboxes,
supervision, isolation, location-aware messaging and behavior upgrades. ALGAL
should implement these over durable records and bounded interpreters, not assume
that a process is an always-resident native thread.

An ALGAL actor can be reconstructed from its behavior digest, state snapshot,
mailbox and retained effect history. A crash is a state transition with explicit
recovery evidence. The runtime must never infer that an external write did not
happen merely because a host process disappeared.

### Make the fast path boring

A fast loop should be easy to inspect and difficult to misuse. It should have no
ambient time, randomness, network, provider, filesystem or arbitrary host code.
All such inputs enter through declared event or capability ports. Pure control
flow uses the existing bounded expression evaluator.

### Make effects visible in the type and receipt

A program's effect surface is part of its interface. A checker should be able to
answer, before execution:

- which inputs and state fields are read;
- which state keys can be written;
- which event types can be emitted;
- which capabilities can be used;
- whether an effect can suspend;
- what maximum work, bytes, depth and event fan-out are allowed.

### Make evolution a deployment protocol

A model may propose a behavior revision. It cannot change its own evaluator,
capabilities, budget, activation policy or evidence requirements. Activation is a
host decision recorded with the incumbent, candidate, dataset, evaluator and
runtime identities.

### Optimize for incremental work

A source edit should invalidate only the affected syntax, type, dependency and
verification units. The first implementation may conservatively recompile a
whole source closure, but the contracts should preserve file and node digests so
incremental compilation and checking can be added without changing program
identity.

### Keep one semantic core and many adapters

Bun is the iteration reference. Rust is the native kernel. WASM is a portability
artifact. Cloudflare is a hosted habitat. Browsers, terminals, desktop apps and
local bridges are hosts. None should define a separate language semantics.

## A compact semantic model

A habitat contains actors. An actor is a named behavior and state machine:

```text
actor = {
  name,
  behavior_digest,
  state_schema,
  state_snapshot,
  mailbox_capabilities,
  supervisor,
  generation,
  pending_effects,
  status
}
```

A fast behavior has this conceptual type:

```text
step : (Behavior, State, Event) -> Transition

Transition = {
  state_writes,
  notifications,
  deferrals,
  acknowledgements,
  escalations
}
```

A transition is pure until the host commits its declared writes and event
publications. An escalation creates a durable ALGAL process request. The request
contains the actor, event digest, behavior digest, context projection, expected
result type, idempotency key and budgets.

A habitat supervises actors and owns the admission boundary for events, state,
capabilities, effects and behavior upgrades. A node hosts one or more habitats.
A cloud platform hosts nodes; it does not change the language contract.

## Language proposal

The first fast-loop source syntax should be intentionally small:

```algal
actor issue_router(event: IssueEvent) {
  let key = event.repository + ":" + event.issue
  let prior = state.get key

  if event.action == "closed" {
    state.put key { status: "closed" }
    return quiet
  }

  if prior.status == "known" {
    return notify "issue-updated" with { key: key }
  }

  return defer "needs-classification"
}
```

The first grammar should support:

- actor declarations with typed event inputs;
- records, lists, choices and bounded expressions;
- `state.get` and `state.put` over declared key/value schemas;
- `notify`, `quiet` and `defer` outcomes;
- a bounded `every` timer declaration;
- explicit event identity and deduplication fields;
- `escalate` or `agent.request` as the only bridge to the durable path;
- imports of pure helpers;
- static limits for event bytes, state bytes, output events and expression fuel.

It should not initially support:

- general recursion;
- arbitrary user functions in the host process;
- implicit shared mutable state;
- transparent distributed references;
- model calls inside pure expressions;
- general schema inference;
- user-authored native extensions;
- eBPF as the semantic source language.

The fast syntax should lower to a new `algal.event-loop.v1` data contract. The
contract should reuse `algal.expr.v1` for pure expressions and the existing
canonical value, digest, capability and receipt machinery.

## Runtime architecture

### Portable core

The core owns parsing, canonicalization, bounds, expression evaluation, event
transition evaluation, state-write validation, effect identities and receipt
verification. It must have no filesystem, process, network, clock or provider
imports.

The current Rust `crates/algal-expr` evaluator and committed WASM artifact are
the starting point. The event-loop evaluator should be a second small core
module, not a rewrite of the complete Bun runtime.

### Local node

The local node owns actor registries, mailboxes, supervision trees, timers,
state adapters, event ingress and scheduling. It should have a native Rust
implementation and a Bun adapter for fast development.

A local node must be useful without a model provider. The deterministic fixture
node is the first performance target; provider and tool bridges are optional
adapters.

### Habitat supervisor

The supervisor owns:

- actor lifecycle and generation history;
- restart, pause, quarantine and stop policy;
- mailbox and event backpressure;
- timer registration and bounded catch-up;
- behavior revision pinning and migration;
- habitat-wide work and inference budgets;
- evidence export and verification;
- operator controls.

The current process scheduler is the seed implementation. The current host-event
service is the durable ingress/outbox seed. The current application lifecycle is
the seed for behavior revision and migration.

### Cloud habitat

`algal-cloud` should remain a hosted host, not a second ALGAL implementation.
Its Durable Object is a serialized habitat node. The cloud protocol should expose
actor deployment, event ingress, mailbox delivery, scheduling, state/CAS,
metering, evidence export and behavior activation through the same contracts as
the local node.

The existing broker remains an executor boundary. XCB and Ghostget remain
credential-owning provider/tool systems. The habitat never receives upstream
provider credentials.

### Scoped memory and progressive context

Memory direction updated 2026-10-04. An agent should resume with a small view of
its permitted history and recover original evidence when an older decision
matters. The reference is [OptMem's source/cache split and progressive detail](lineage.md#source-preserving-memory),
not its machine-wide identity or mandatory compression loop.

ALGAL already has two distinct mechanisms: [exact agent-context snapshots](agent-context.md)
with host-selected read grants, and application memory with admitted observations,
current applicability checks, withdrawals, and archived selections. The optional
[progressive reader](../spec/v1/context-history.md) adds different levels of detail
over the same captured sources in Bun and Rust, with current-permission and
source-availability checks. It does not replace those mechanisms with a second
memory store or change existing runtime context by default.

The reading contract provides:

- a captured source head, explicit audience/selection, and logical event order;
- protected task constraints and unresolved items, recent exact entries, older
  summary ranges, and a query-relevant overlay within one encoded context budget;
- expansion to children and original leaves, plus bounded exact source search
  independent of summary quality;
- continuations tied to the source and summary generations, so concurrent appends
  or cache rebuilds cannot shift an earlier page;
- explicit incomplete, unavailable, pending, and insufficient-budget outcomes;
- pending ranges after derivative invalidation, while historical originals remain
  separate from current facts. Recorded correction and summary repair work is
  the next implementation step.

Source digests identify bytes, not permission. A summary is readable only when
all contributing sources remain inside the reader's grant. A broad summary cannot
be delegated to a narrower child by hiding its citations. Current authorization,
source availability, and logical applicability remain separate checks.

Summary creation is planned as a separate agent effect, not a scheduler
operation or a side effect of reading. Its job identity includes the source/child digests, scope,
policy, and summarizer configuration. Record its output and work in the existing
process/effect machinery; replay reuses the recorded result. Queue depth, merge
bursts, rebuild work, and aggregate inference all need limits. A missing summary
must permit a bounded raw view or expose a pending range without compulsory
model work before the user's task can proceed.

A summary is a navigation aid, not an admitted logical observation or proof of
world state. Protect original user intent, retain the original admitted text, and
measure recursive-summary omissions against those originals. Reading allowance
and storage retention are separate policies. Hierarchical views do not enlarge
application memory, archive, context-snapshot, or process capacity limits.

The deterministic foundation has scripted summaries, Bun/Rust vectors, scoped
exact reads, and captured-prefix continuations. Recorded maintenance and the
rollover/correction consumer fixture remain to be built. They do not wait for
the actor language, cloud habitat, or federation work. Oh can
adapt the reading rules over its own store without an ALGAL runtime dependency;
xcb remains the provider/process owner, and Sponge remains the research-policy
owner. Consumers adopt immutable artifacts independently.

Measure startup and expansion bytes/latency, exact source recovery, stale-belief
persistence, correction effort, maintenance backlog, and total work on later unseen
tasks. Compare recent raw, lexical, tree-only, and query-directed views under the
same reader and total allowance, including summary creation and failures. Default
activation requires fresh quality/correction evidence and a tested rollback;
source recovery and a smaller prompt alone do not establish cumulative competence
or provider savings.

## The live-world dimension

The supplied `world` sketch adds an important dimension to the BEAM comparison:
a live, distributed, capability-oriented object space with a small Lisp-like core.
Its useful ideas are stable object identity, inspectable and mutable running code,
capability references that work locally or remotely, one eventual-send operation,
and semantic operations for people, editors and agents.

ALGAL should incorporate these ideas at the habitat boundary, with stricter
durability rules:

- A behavior, actor, state object or evaluator is addressed by a stable digest or
  named capability, not by an accidental process address.
- Inspection is a first-class read model. It shows the current behavior, state,
  mailbox, pending effects, supervisor status and evidence links from one
  captured habitat snapshot.
- Mutation is a semantic operation: propose, preview, migrate, activate, pause,
  resume or fork. It is never an arbitrary write to a live object.
- Eventual send is the common local and remote message operation. The local and
  remote paths share an envelope, idempotency identity, capability check and
  settled/uncertain outcome.
- A live edit creates a candidate revision and preserves the running incumbent
  until compatibility, migration and activation policy permit the change.
- Humans, editors and agents use the same typed operations. Their authority and
  presentation can differ, but they do not get separate mutation semantics.

This gives ALGAL a useful three-way synthesis:

| Source of inspiration | What ALGAL takes | What ALGAL adds or constrains |
|---|---|---|
| BEAM/OTP | processes, mailboxes, supervision, distribution, upgrades | durable evidence, bounded resources and explicit uncertain effects |
| Live World/Lisp environment | stable identity, live inspection, semantic mutation, capability eventual-send | revision heads, migrations, replay and host-admitted authority |
| ALGAL today | manifests, receipts, replay, habitats, foundry and application lifecycle | a single actor/event model that joins them |

The first implementation should not attempt a universal live object database. A
small actor registry plus content-addressed behavior and state projections is
enough to prove the model.

## Inspiration from current programming-language research

The research scan used PLDB on 2026-10-01, which indexes 33,580 programming
languages papers from POPL, PLDI, ICFP, OOPSLA and related venues. The relevant
clusters were effect handlers, incremental computation, actor-based distributed
systems, program synthesis, gradual typing and language-server tooling.

The useful lessons are narrow:

- **Effect handlers:** represent model calls, timers, mail delivery and host
  operations as explicit effects with host-selected handlers. ALGAL already has
  typed effect cells and capability ports; an event-loop syntax should preserve
  that separation rather than introduce hidden callbacks. PLDB surfaced recent
  work including *Zero-Overhead Lexical Effect Handlers* (OOPSLA 2025) and
  *Lexical Effect Handlers* (OOPSLA 2024). The practical takeaway is to make
  effect scope local and visible so the compiler can optimize pure paths.
- **Incremental computation:** a handler should update only the state and
  downstream work affected by an event. PLDB surfaced *Stateful Differential
  Operators for Incremental Computing* (POPL 2026), *Incremental Computing by
  Differential Execution* (ECOOP 2025), and earlier work on incremental type
  checking and compilation. The practical takeaway is to retain dependency
  identities now, even if the first checker is conservative.
- **Actors and distributed state:** PLDB surfaced geo-distributed actor systems
  and *Portals: An Extension of Dataflow Streaming for Stateful Serverless*
  (OOPSLA 2022). The practical takeaway is to make message identity,
  backpressure, locality and state ownership explicit. Do not claim exactly-once
  behavior for arbitrary external effects.
- **Program synthesis:** the synthesis literature reinforces the value of a
  restricted search space, typed intermediate representation, counterexamples
  and independent evaluators. This supports ALGAL's manifest-as-data and foundry
  design; it argues against allowing a model to emit arbitrary host code.
- **Gradual typing:** typed boundaries around JSON and model output are useful,
  but a dynamic escape hatch must remain bounded and visibly checked. ALGAL's
  strict `unknown` parsing and schema versions are preferable to a language-wide
  unsound convenience mode.
- **Language servers:** developer productivity depends on fast, local,
  incremental diagnostics rather than only final compiler speed. ALGAL should
  ship a machine-readable diagnostic protocol and editor-facing check command
  before it grows a large syntax.

These references inform the plan. They do not require adopting a research
language, a general effect calculus, a global incremental compiler or a new
runtime dependency.

## North-star scorecard

All numbers below are targets for a pinned benchmark corpus on a declared
machine. They are not claims about the current release. Every target must be
recorded with commit, toolchain, platform, corpus digest, warm/cold state and
sample count. Report median and p95; do not report a best single run.

### Developer loop targets

The reference corpus is 100 small event-loop programs, 20 deliberately invalid
programs, 10 multi-file projects and 10 actor fixtures. Each source file is
≤16 KiB; each project closure is ≤256 KiB.

| Operation | Target | Measurement |
|---|---:|---|
| Parse one file, warm | ≤10 ms p95 | source bytes to syntax tree |
| Parse one file, cold | ≤100 ms p95 | fresh process to syntax tree |
| Check one file, warm | ≤25 ms p95 | source to typed diagnostics |
| Check one 10-file project, warm | ≤100 ms p95 | closure to diagnostics |
| Incremental check after one local edit | ≤50 ms p95 | edit to updated diagnostics |
| Compile one actor, warm | ≤50 ms p95 | source to canonical manifest |
| Compile one 10-file project, warm | ≤200 ms p95 | source closure to manifest |
| Recompile after one local edit | ≤100 ms p95 | changed file to new manifest |
| Produce diagnostic at cursor | ≤100 ms p95 | edit to structured diagnostic |
| Format one file | ≤25 ms p95 | source to canonical text |
| Build portable bundle, 10 files | ≤500 ms p95 | source closure to bundle |
| Verify one receipt | ≤50 ms p95 | receipt and manifest to verdict |
| Verify 100 receipts | ≤1 s p95 | archive to verdict |
| Verify a 10-actor fixture | ≤2 s p95 | event/effect archive to verdict |
| Start local deterministic node | ≤250 ms p95 warm | process to ready endpoint |
| First local event | ≤50 ms p95 warm | admitted event to settled trace |

The first release gate is not “all targets pass.” It is a benchmark harness that
produces stable measurements and prevents regressions greater than 20% without a
recorded decision.

### Runtime targets

The deterministic fixture uses 1 KiB events, a 16 KiB state record and no model
or network effects.

| Operation | Initial target | Stretch target |
|---|---:|---:|
| Pure event transition | ≤1 ms p95 | ≤100 µs p95 |
| State read/write commit | ≤5 ms p95 | ≤1 ms p95 |
| Local mailbox send | ≤5 ms p95 | ≤1 ms p95 |
| Duplicate delivery decision | ≤2 ms p95 | ≤500 µs p95 |
| 1,000-event sequential replay | ≤1 s | ≤250 ms |
| 10,000-event sequential replay | ≤10 s | ≤2.5 s |
| Idle actor memory | ≤64 KiB | ≤16 KiB |
| 1,000 suspended actors, deterministic | ≤128 MiB | ≤64 MiB |
| Supervisor restart decision | ≤10 ms p95 | ≤2 ms p95 |
| Event fan-out per transition | statically bounded | statically bounded |

These are local engineering targets. They are not hosted SLOs until qualified by
`algal-cloud` under its own capacity and failure gates.

## Ecology progression

The runtime scorecard is the first layer of a longer progression. Each layer
has a separate proof obligation; completing a lower layer does not establish
the next one.

| Horizon | Goal | Entry and exit evidence |
| --- | --- | --- |
| Habitat substrate | Durable organisms, processes, effects, receipts, revision and activation policy | Existing contract, parity, replay and recovery evidence; current demos remain mechanism evidence |
| Single-habitat ecology | Reusable roles, procedure composition, retained alternatives, shared scoped memory and population-level budgets | Held-out cumulative-construction result under equal total resources, plus replacement and recovery fixtures |
| Federated habitats | Durable messages and invocations, signed grants, local evaluation, evidence exchange and explicit revocation | Two habitats complete a typed handoff, offline receipt verification and receiving-side promotion decision |
| Established ecologies | Institutional continuity, portable practices, resilient replacement, human inspection and measurable reduction in repeated work | Longitudinal workload evidence that includes maintenance, correction, evaluation and governance costs |

The current language and actor/event plan primarily addresses the habitat
substrate. The consumer, lab and Habitat Link lanes provide the path toward the
next two horizons. The final horizon remains a research program, not a shipped
capability claim.

### Evidence and safety targets

- 100% of fast-loop programs compile without provider credentials.
- 100% of deterministic fixtures verify offline.
- Bun/Rust traces match byte-for-byte for the reference corpus.
- Every effect has a stable request identity and replay policy.
- Every invalid fixture fails before a live effect is admitted.
- Duplicate event delivery never creates a second settled transition.
- An interrupted uncertain external effect is never automatically redispatched.
- A behavior upgrade cannot alter its own capability, evaluator or activation
  policy.
- A failed, inconclusive or rejected candidate remains in the evidence archive.

### Developer productivity metrics

The runtime scorecard is necessary but insufficient. Track these metrics over
real ALGAL changes and consumer contributions:

- **Time to first green:** checkout to a passing local check on a fresh machine.
- **Edit-to-feedback time:** source edit to actionable diagnostic.
- **Change-to-receipt time:** source edit to a deterministic fixture receipt.
- **Change-to-proof time:** source edit to offline verification.
- **Verification ratio:** verification time divided by execution time for
  deterministic fixtures.
- **Failure localization:** fraction of invalid fixtures whose first diagnostic
  points to the correct file, span and contract field.
- **Repair iterations:** median edits required to move an invalid fixture to a
  passing check.
- **Generated-program acceptance:** fraction of model-proposed programs that
  pass structural admission without host edits.
- **Semantic rejection quality:** fraction of structurally valid but semantically
  bad candidates rejected by the declared evaluator.
- **Source closure cost:** files, bytes and milliseconds invalidated by one edit.
- **Consumer integration time:** hours from dependency pin to a first verified
  domain fixture in a consumer repository.
- **Runtime duplication:** number of independent schedulers, receipt formats or
  capability implementations maintained outside ALGAL.
- **Evidence completeness:** percentage of consumer runs with source, runtime,
  evaluator, capability and receipt identities recorded.
- **Upgrade friction:** time and number of manual migration steps for a behavior
  revision.
- **Recovery friction:** time from process interruption to a reconciled state.

The first baseline should be collected from `algal`, `algal-cloud`,
`ghostget-skills`, `clankdar`, `algal-lab`, `iconplace`, `midiplace`, `spongev2`
and `textbutler`. Do not compare different workloads as if they were one
language benchmark; report each workload and an aggregate only when normalized.

## Measurement implementation

Create a `benchmarks/language/` fixture suite in `algal` with:

```text
benchmarks/language/
  corpus.json
  invalid/
  projects/
  actors/
  scripts/measure.ts
  scripts/measure-native.ts
  scripts/measure-verify.ts
  README.md
```

The corpus manifest must pin:

- source file digests;
- expected check outcome;
- expected manifest and interface digests;
- expected diagnostic code and span for invalid cases;
- event fixture digests;
- toolchain and runtime identities;
- machine and OS profile;
- warm/cold protocol;
- sample count and outlier policy.

The result contract should be `algal.language-benchmark.v1`. It must contain
raw per-sample timing summaries, not only aggregates, plus the exact corpus,
source, compiler, runtime and environment identities. It is measurement evidence,
not a claim of language quality.

The CI policy should run a small smoke corpus on every core change and the full
corpus on a scheduled or release gate. A regression >20% requires one of:

- a repair that restores the target;
- an updated target with a recorded reason and new baseline;
- an explicit scope decision that keeps the operation experimental.

Do not make wall-clock timing fields part of execution receipts. Benchmark timing
belongs in host-side evidence records.

## Dependency graph for implementation

The plan is deliberately organized around frozen contracts and disjoint lanes.
Shared contracts are always owned by the integration lane.

```text
P0 architecture and benchmark contract
 ├── P1 portable event-loop contract
 │    ├── P3 Bun evaluator
 │    ├── P4 Rust/WASM evaluator
 │    └── P5 source compiler and diagnostics
 ├── P2 measurement harness
 │    ├── P6 local node and supervisor
 │    └── P7 developer tooling / LSP adapter
 └── P8 consumer protocol audit
      ├── P9 algal-cloud habitat adapter
      ├── P10 Ghostget and skill migration
      ├── P11 lab/evaluation integration
      └── P12 representative consumer pilots

P3 + P4 + P5 + P6 + P7 -> J1 local semantic join
J1 + P9 -> J2 hosted habitat join
J1 + P10 + P11 + P12 -> J3 consumer join
J2 + J3 + benchmark corpus -> J4 release gate
```

### P0: architecture and benchmark contract

Owner: ALGAL integration owner. Paths: this document, `spec/v1/`,
`benchmarks/language/README.md`, shared contract index.

Deliverables:

- `algal.event-loop.v1` contract;
- actor, supervisor, habitat and behavior-revision vocabulary;
- benchmark result contract;
- source-to-runtime identity rules;
- decision record rejecting a separate runtime implementation;
- baseline corpus and measurement protocol.

Exit gate: contracts parse strictly, reject unknown fields, carry bounds for
every count and byte field, and have at least one valid and five invalid
fixtures. No implementation lane starts before this gate.

### P1: portable event-loop contract

Owner: core contract lane. Paths: `src/event-loop-*`, `spec/v1/event-loop.md`,
`src/*test.ts`, mirrored Rust contract files and fixtures.

Deliverables:

- typed event, transition, state-write, notification, deferral and escalation
  records;
- event identity and deduplication rules;
- explicit backpressure and failure outcomes;
- replayable event trace;
- static effect and resource summaries.

Exit gate: TypeScript and Rust parse the same vectors and produce identical
canonical digests. This lane does not add scheduling or providers.

### P2: measurement harness

Owner: benchmark lane. Paths: `benchmarks/language/**`, `src/bench-language*`.

Deliverables:

- warm/cold timing runner;
- corpus loader and digest checker;
- Bun/native comparison;
- p50/p95 summaries and raw sample retention;
- regression threshold checker;
- human-readable report and machine-readable evidence.

Exit gate: the harness measures today's existing compiler/check/verify/run path
before the new event-loop implementation exists. The baseline is a prerequisite
for claiming improvement.

### P3: Bun evaluator

Owner: TypeScript runtime lane. Paths: `src/event-loop-runtime.ts`,
`src/event-loop-replay.ts`, focused tests.

Deliverables:

- deterministic transition evaluator;
- in-memory state adapter;
- event trace recorder;
- replay verifier;
- fixture runner.

Exit gate: all deterministic fixtures pass, invalid transitions fail before
publication, and the benchmark harness emits a valid result.

### P4: Rust/WASM evaluator

Owner: native lane. Paths: `crates/algal/src/event_loop/`,
`crates/algal/tests/`, `crates/algal-expr/` only when necessary, parity scripts.

Deliverables:

- Rust evaluator over the shared contract;
- WASM export for browser/embedded use;
- TypeScript-to-Rust and Rust-to-TypeScript trace parity;
- native benchmark adapter.

Exit gate: `cargo test --workspace --locked`, clippy, fmt, native parity and
language benchmark parity pass. No implicit Bun fallback is allowed.

### P5: source compiler and diagnostics

Owner: source-language lane. Paths: `src/source-*`, `docs/source-language.md`,
`examples/source/actors/`, colocated tests.

Deliverables:

- minimal actor/event-loop grammar;
- source map and span diagnostics;
- static effect/resource summary;
- formatter support;
- compile/check/diagram CLI support;
- invalid authoring examples.

Exit gate: a developer can create, check, compile, run and verify one actor
without credentials. Diagnostic fixtures identify the correct source location.

### P6: local node and supervisor

Owner: runtime operations lane. Paths: `src/node-*`, `src/supervisor-*`,
`spec/v1/supervisor.md`, process/mailbox integration fixtures.

Deliverables:

- actor registry and lifecycle;
- restart/pause/quarantine/stop policy;
- mailbox routing and bounded timers;
- event ingress adapter;
- actor inspection;
- deterministic restart tests;
- explicit uncertain-effect behavior.

Exit gate: kill/restart, duplicate delivery, mailbox full, timer catch-up,
uncertain effect and behavior pinning fixtures pass without a provider.

### P7: developer tooling

Owner: tooling lane. Paths: `src/lsp-*` or `tools/lsp-*`, CLI diagnostics,
editor protocol documentation.

Deliverables:

- check-on-save protocol;
- source span diagnostics;
- dependency and invalidation information;
- go-to-definition for imported pure programs;
- compile/check timings in developer output;
- no required editor dependency for CLI use.

Exit gate: a scripted edit loop demonstrates edit-to-diagnostic and
edit-to-verified-receipt measurements under the target budgets.

### P8: consumer protocol audit

Owner: integration owner. Paths: `docs/consumer-matrix.md`, no consumer code
changes until the matrix is reviewed.

For each consumer, record the ALGAL version, contracts used, local runtime,
provider boundary, evaluator, durable state, scheduler, receipts and migration
risk. The first audit covers `algal-cloud`, `algal-lab`, `ghostget-skills`,
`clankdar`, `iconplace`, `midiplace`, `spongev2`, `textbutler`, `bio` and
`sloptrade`.

Exit gate: every consumer has one owner, one representative fixture and one
explicit statement of what remains consumer-owned.

### P9: hosted habitat adapter

Owner: `algal-cloud` lane. Paths: `apps/habitat`, `packages/protocol`,
`packages/store-client`, hosted verification fixtures.

Deliverables:

- actor/event-loop protocol routes;
- Durable Object implementation over the shared contract;
- alarm/scheduler integration;
- metering and evidence export;
- local/native/hosted trace comparison;
- capacity and latency qualification separated from functional proof.

Exit gate: deployed or workerd-qualified habitat accepts an event, runs the
same deterministic actor, deduplicates a replay, exports evidence and verifies
it independently. No hosted SLO is claimed from local measurements.

### P10: skills and provider migration

Owner: Ghostget/XCB integration lane. Paths are consumer repositories, never
provider credential code in `algal`.

Deliverables:

- representative Ghostget procedures expressed as actor/event or durable
  organism programs;
- explicit provider effect boundaries;
- no automatic retry of uncertain provider writes;
- replay fixtures with sealed responses;
- XCB ownership of subscription and provider custody.

Exit gate: a procedure can run locally, suspend on provider work, resume and
verify offline without copying provider credentials into ALGAL.

For bounded development inference, use the private Oh memory-lab transport
described in [inference development](inference-development.md). Its direct API
profile uses `VERTEX_API_KEY` or `GEMINI_API_KEY` for Gemini and `XAI_API_KEY`
for xAI, with one explicit budget ledger shared by qualification, readers and
judges. The profile contains environment-variable names and private input
paths, never credential values. Future ALGAL agents must use the transport's
freeze, reservation, no-retry and uncertain-outcome rules; a documentation or
architecture change does not authorize a live call. Consumer pilots continue
to use XCB or Ghostget for provider subscription and credential custody.

### P11: lab and evolution integration

Owner: `algal-lab` / foundry lane. Paths: `src/foundry*`, `src/search*`,
`experiments/`, `algal-lab` integration fixtures.

Deliverables:

- actor behavior candidates as foundry inputs;
- incumbent/candidate/holdout comparison;
- habitat budget accounting;
- failed and inconclusive candidate retention;
- activation evidence bound to behavior and evaluator digests.

Exit gate: a candidate behavior can be proposed, checked, evaluated, rejected
or activated without changing its own policy or evaluator.

### P12: representative consumer pilots

Owners: one per consumer, coordinated through the integration owner.

The first pilots should be:

- `iconplace`: browser-local deterministic composition loop with optional local
  model escalation;
- `midiplace`: typed planning plus deterministic realization and replay;
- `textbutler` or `spongev2`: durable conversational/research actor with provider
  suspension;
- `clankdar`: event-driven challenge issuance and receipt verification;
- `bio` / `algal-lab`: controlled research campaign actor with sealed evaluator.

Each pilot must use the public contract and SDK. It must not import internal
runtime modules or create a second scheduler.

Exit gate: each pilot has one end-to-end fixture, one offline verification path,
one failure/recovery case and a recorded integration-time measurement.

## Join gates and parallelization rules

The contract phase is serial. Once P0 and P1 are frozen, P2 through P5 can run in
parallel because their files and acceptance criteria are separate. P6 depends on
P1 but can run alongside P3–P5. P7 depends on compiler diagnostics but can start
against the diagnostic contract once P0 freezes. P8 is read-only and can run in
parallel with all implementation lanes.

J1 is the first hard join. It requires:

- Bun and Rust transition parity;
- compiler output accepted by both runtimes;
- event trace replay;
- benchmark result emitted;
- invalid fixtures failing consistently.

Only after J1 may hosted or consumer lanes claim the new contract. J2 and J3
must complete separately. J4 requires both joins, a fresh benchmark run, a
review of open limitations and a clean source identity.

Shared files stay with the integration owner: `index.ts`, package manifests,
lockfiles, CLI dispatch, public copy, protocol indexes, benchmark corpus index,
release records and aggregate CI workflows. Parallel lanes should add colocated
fixtures and modules, then submit an integration note instead of editing shared
barrels.

## Simplicity decisions

The plan intentionally rejects several attractive but expensive paths.

- Do not build a new VM before the event-loop contract and trace semantics exist.
- Do not make eBPF the source language or portability requirement.
- Do not introduce a general actor language with arbitrary concurrency primitives
  in the first release.
- Do not add a second durable store abstraction when `Store`, slots, mailboxes,
  host events and application storage already cover the required seams.
- Do not put model inference in the hot scheduler.
- Do not promise transparent global process migration before explicit handoff and
  evidence portability work.
- Do not make timing claims from execution receipts.
- Do not make a language-server feature a prerequisite for CLI use.
- Do not let consumer repositories fork process, mailbox, scheduler or receipt
  semantics.

The elegance test for a proposed feature is whether it can be explained as one
of four things: a pure transition, a typed effect, a durable actor state change,
or an evolution decision. If it needs a fifth hidden state machine, it belongs in
a host adapter or should be rejected.

## Risks and falsifiers

The architecture should be revised if any of these fail:

- The fast subset cannot reach useful edit/check/verify targets without making
  the language substantially more complex.
- Rust, Bun, WASM and hosted traces diverge often enough that one semantic core
  is not practical.
- Durable actor records cost more than the consumer workloads can tolerate.
- Supervision semantics cannot distinguish retryable provider failures from
  uncertain external effects.
- Incremental invalidation adds more complexity than it removes from the
  measured developer loop.
- Consumer pilots still need private scheduler or receipt implementations.
- Behavior evolution improves benchmark scores but makes production diagnosis,
  migration or rollback harder.

A failed target is useful evidence. It should produce a changed target,
architectural simplification or explicit non-goal, not silent benchmark removal.

## Robustness, coverage, and hill-climbing strategy

The architecture above needs an explicit assurance contract for the cases where
an actor, host, provider, or candidate behavior is under pressure. This section
turns the north star into a testable improvement discipline. It supplements the
runtime scorecard and phase exit gates; it does not turn current mechanisms or
demos into evidence of cumulative capability.

### Three execution lanes

A mature ALGAL workload has three speeds:

1. **Hot path:** deterministic routing, validation, and bounded state updates run
   for every event.
2. **Warm path:** durable queues, timers, retries, typed decisions, and
   replayable effects handle work that needs continuity.
3. **Cold path:** a model is requested for ambiguity, novelty, repair, or a
   proposed procedure change.

The model is an explicit effect requested by a program. It is not the default
scheduler or control plane. Familiar work should stay on tested organisms, and
every escalation should retain the context, budget, result, and evidence needed
to replay or reconcile it.

### Robustness is part of capability

These are product invariants, not optional test features:

| Invariant family | Required behavior |
| --- | --- |
| Representation and bounds | Every input, count, depth, byte size, expression, and effect has a declared limit. Unknown fields and invalid states fail before mutation. |
| Deterministic execution | Pure cells produce the same result in Bun and Rust. Receipts replay bit for bit; nondeterminism enters only through recorded executor results. |
| Authority and effects | A manifest cannot mint a capability, widen a port, or approve its own successor. Host effects are typed, idempotent where possible, and explicit about uncertain completion. |
| Durable lifecycle | Queue delivery, suspension, retry, timer, journal, restart, and recovery preserve the committed prefix and never silently repeat an uncertain effect. |
| Evaluation integrity | Development, selection, holdout, and frozen cases remain disjoint. Candidate cost, failures, inconclusive results, and maintenance work are retained. |
| Portability | The reference runtime, native kernel, expression WASM target, and supported adapters agree on canonical values, rejection behavior, and evidence. |

### Test coverage contract

Every change to a contract or runtime seam adds the smallest fixture set that
proves both its behavior and its refusal behavior:

- each field has valid, missing, unknown, maximum, over-limit, and malformed
  cases;
- each state transition has success, rejection, duplicate, retry,
  interruption, reopen, and uncertain-effect cases where that transition can
  occur;
- each invariant has a generated or model-checked test plus one deliberately
  broken mutation that the test must catch;
- each pure or serialization-heavy seam has metamorphic properties and a
  coverage-guided fuzz corpus. Every minimized crash, hang, or unexpected
  acceptance becomes a deterministic regression fixture;
- each effect adapter has idempotency, timeout, partial-output, and restart
  coverage;
- each portable artifact has reference, native, and WASM or cross-process
  differential checks where the target exists; and
- every promoted procedure has a held-out task family, a negative control, and
  a record of its candidate and evaluation budget.

The evidence ladder is ordered by feedback time:

1. static checks, format, type, and contract validation;
2. deterministic unit and example tests;
3. property, metamorphic, coverage-guided fuzz, and bounded state-machine tests
   over generated inputs and event orderings;
4. differential replay across runtimes and canonical serialization checks;
5. mutation tests for invariants, authority boundaries, and recovery paths;
6. fault injection for crashes, duplicate or reordered delivery, provider
   timeouts, and partial writes; and
7. held-out capability evaluation, independent verification, and bounded soak
   or live qualification on the supported host.

The fast tiers run on every change. The expensive tiers run when their inputs
change and before promotion. A timeout, missing coverage, or unexplained flaky
result is unresolved, not a pass. Retain the minimized failing input, exact
source and toolchain identity, and the receipt needed to replay it.

### Lexicographic hill climbing

Each improvement is a small, reviewable experiment against a frozen incumbent.
The proposer may change only the declared scope. It cannot change the
evaluator, limits, permissions, holdout, or promotion rule as part of the same
candidate.

1. **State a falsifiable hypothesis.** Name the workload, expected benefit,
   risk, budget, and invariant that could disprove it.
2. **Freeze the comparison.** Pin the incumbent digest, model and tool
   versions, task splits, random seeds, environment, and total work budget.
3. **Generate bounded variants.** Prefer a small change to routing, procedure
   composition, representation, or resource policy. Keep weaker ancestors when
   they expose useful components or diversity.
4. **Run hard gates.** Reject candidates that fail parsing, bounds, authority,
   replay, parity, invariant, mutation, or fault checks. No quality score can
   compensate for a safety or evidence failure.
5. **Evaluate in stages.** Use development cases for search, a frozen selection
   set for promotion, and an untouched holdout for confirmation. Include a
   no-change control and a fresh-synthesis control with comparable budgets.
6. **Score eligible candidates.** First require every hard gate. Then compare
   held-out quality and worst-slice quality, followed by fault survival and
   recovery, total cost and latency, and finally artifact size and maintenance
   complexity. Reject a candidate that wins on average by creating a severe tail
   regression.
7. **Retain the lineage.** Store the candidate, receipt, tests, costs, failures,
   inconclusive cases, and counterexamples. Keep a small diverse archive rather
   than only the current winner.
8. **Promote and observe.** Activate only through host policy, canary live
   effects, compare retained holdout behavior, and make rollback a tested
   transition. Feed observed failures into the next hypothesis.

The improvement value is positive only when later savings and quality gains
repay candidate generation, evaluation, maintenance, and operational risk.
Repeatedly selecting a higher score on the same visible cases is search, not
evidence of cumulative capability.

The objective is lexicographic: preserve authority, privacy, durability, and
protocol invariants first; improve successful work under adversarial schedules
second; reduce latency, memory, and storage third; and reduce code and
operating complexity fourth. No average score overrides a hard gate.

### Maturity gates

| Gate | Evidence required |
| --- | --- |
| Contract | Versioned input/output, identity, bounds, effects, and rejection fixtures |
| Replay | Deterministic receipt and restart recovery from the committed prefix |
| Parity | Cross-runtime or cross-target canonical and failure behavior |
| Adversarial | Generated schedules, mutation controls, malformed inputs, and fault injection |
| Capability | Independent held-out improvement at comparable total budget |
| Operation | Bounded soak, resource measurements, rollback, and an owner-visible recovery path |

The current system is strongest at contract, replay, and evidence layers. The
north-star work should deepen adversarial and capability layers before widening
the language or adding a faster backend. A JIT or eBPF experiment stays behind
the same event-loop contract and cannot be a correctness shortcut.

## Delivery records

This plan should be accompanied by:

- `docs/architecture.md` linking the north star and current status;
- `docs/consumer-matrix.md` for repository ownership and adoption;
- `spec/v1/event-loop.md` and `spec/v1/supervisor.md` once contracts freeze;
- `benchmarks/language/README.md` and `algal.language-benchmark.v1` once the
  measurement harness lands;
- a roadmap progress record with phase status, exact checks and open limits;
- one final aggregate report that names the branch, commit, benchmark result,
  parity result, hosted qualification and consumer fixtures.

The plan is complete only when the metrics are measured, not when the document
exists. The document is the shared map that makes those measurements and their
implementation lanes reviewable.

## Research record

The PLDB index and search result pages consulted for this plan are public indexes,
not claims that ALGAL implements the cited systems:

- [PLDB: effect handlers](https://pldb.kirancodes.me/?q=effect+handlers)
- [PLDB: incremental computation](https://pldb.kirancodes.me/?q=incremental+computation)
- [PLDB: actor model and distributed systems](https://pldb.kirancodes.me/?q=actor+model+distributed+systems)
- [PLDB: program synthesis](https://pldb.kirancodes.me/?q=program+synthesis)
- [PLDB: gradual typing](https://pldb.kirancodes.me/?q=gradual+typing)
- [PLDB: incremental compilers](https://pldb.kirancodes.me/?q=incremental+compiler)
- [PLDB: language servers](https://pldb.kirancodes.me/?q=language+server)

The current ALGAL implementation and roadmap sources that constrain this plan
are [the vision](vision.md), [the malleable software plan](malleable-software-plan.md),
[the roadmap delivery record](malleable-roadmap-progress.md),
[the organism contract](../spec/v1/organism.md),
[the process contract](../spec/v1/process.md), and the hosted
[algal-cloud architecture](https://github.com/hraness/algal-cloud/blob/main/docs/architecture.md).
