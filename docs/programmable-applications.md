> WIP checkpoint: application contracts and design are initial implementation work.
> The lifecycle, memory services, declarative `algal.application-host.v1`
> policy, the evaluation/migration producers, the reflection-view projection
> and the domain episode dispatcher now run on both runtimes —
> `bun scripts/application-parity.ts` replays one shared case (create →
> investigate → delivery → observe → evaluate → verify → admit → activate →
> derive → view → episode binding → migrate-memory → migrate → episode
> dispatch → reconcile) and requires identical digests and records across 61
> steps, including the foundry evaluation report, run receipts, the produced
> migration record, the fenced view projection and the settled episode
> outcome. Rejection legs pin identical verdicts for stale heads, operation
> collisions, malformed commands and activation wedged by an unsettled
> dispatch, plus an exact operation replay past a moved head. Kernel
> guarantees stay gated on wider shared coverage.
> The harness memory pilot is paused and unqualified. See the checkpoint section below.

# ALGAL: programmable organisms

Build program, 2026-09-20. This expands the coding-harness memory spike into a
reusable application architecture. The harness remains the first demanding user
of that architecture and a continuing evaluation surface.

## Product thesis

An ALGAL application should maintain a persistent, inspectable account of what
exists, what it has observed, what it currently believes, what it can do, and why
its selected behavior applies. Its procedures, schemas, queries, views, goals,
experiments, and history should be addressable data. It should acquire experience,
revise its conclusions, propose changes to itself, evaluate those changes, and
activate compatible revisions while preserving identity and effect history.

The intended outcome is accumulated executable competence outside a frozen model.
Models supply interpretation and proposals; deterministic programs handle routine
execution, dependency checks, storage, propagation, admission, and accounting.

The shared representation preserves distinct types. An observation differs from
a hypothesis, a derivation differs from an execution receipt, and a declaration
of required authority cannot grant that authority.

## Existing foundation

The current repository already contains canonical content-addressed values,
typed organism graphs, bounded expression programs, admitted tool effects,
native positive Datalog queries and witnesses, foundry evaluation/search, named
durable processes, checkpoints, conservative journals, mailboxes, durable host
events, and passive evidence workbenches. These mechanisms are the substrate.

The missing abstraction is a coherent application lifecycle joining these
objects. Existing process definitions are immutable. Existing mutable slots do
not provide compare-and-swap activation. Foundry chooses a best candidate even
when every candidate fails; winning is therefore insufficient for activation.
The existing first-witness query proof is not a complete truth-maintenance graph.

## Architectural shape

```text
                       application identity
                               |
                     one atomic state head
                               |
             +-----------------+-----------------+
             |                 |                 |
       program revision   memory revision   durable intents
             |                 |                 |
  procedures/schema/views  sources/claims    investigations
             |             scopes/proofs     episode bindings
             +-----------------+-----------------+
                               |
                  existing process/effect VM
                               |
                  host-admitted capabilities
```

Separate the application program revision from memory updates. One application
state captures both references atomically, so a view or newly admitted episode
cannot combine unrelated latest versions.

An application revision names procedure bindings, their executable manifests,
query/rule and schema versions, view definitions, its parent, and the evaluation policy. Accepted
evaluation/compatibility evidence belongs to the activation transition, avoiding
a content-addressing cycle. An application state names that revision,
the current memory snapshot, predecessor state, and committed transition intents.
Stable names identify applications and concepts; digests identify immutable
versions. Large object bodies live in the existing store.

The first record family is closed and bounded: observations, hypotheses,
procedures, queries, derivations, schemas, views, goals, investigation requests,
candidate revisions, evaluations, activation transitions, and episode bindings.
Do not introduce unrestricted executable host text as a record type.

## Parallel implementation tracks

| Track | Responsibility | First join criterion |
| --- | --- | --- |
| Shared contracts and parity | Exact typed objects, identities, references, bounds, compatibility and authority rules | Closed parsers, golden examples, malformed-reference/type rejection; reference/native parity before a new kernel contract graduates |
| Memory and dependencies | Source admission, scoped projections, corrections, alternative support, pure queries, explicit uncertainty | Correction invalidates current applicability without erasing history; full recomputation remains the reference |
| Application lifecycle | Durable head, expected-parent commits, revision activation, writer fencing, process bindings | Crash-safe publication; stale activation rejected; old episodes retain original definitions |
| Investigation and execution | Unknown/stale premises become durable bounded work intents; explicit probes create observations | Commit-to-wakeup crash recovery has no lost or duplicate logical work; uncertain effects remain uncertain |
| Adaptation and evaluation | Propose, compare with incumbent, verify, reject regressions, retain alternatives, activate | All-failing winner cannot activate; evaluation binds parent state, cases, capabilities, and exact candidate |
| Views and reflection | Pure declarative views of procedures, applicability, proofs, history, proposed actions, running work | A visible explanation and the action's applicability resolve the same captured application state |
| Harness and experiments | Coding application integration, semantic tests, live calibration, longitudinal comparisons, cost accounting | Reproducible scenarios and honest benefit/regression measurements; no hidden labels enter memory |

Run independent owners concurrently against a root-owned contract. Use all
available worker slots and launch the next bounded work as slots free. The
current task supports three simultaneous workers plus the integrator, so the
seven tracks run in overlapping waves rather than spawning beyond that limit.
Each writer owns explicit files. Shared exports, CLI wiring, schemas, and final
validation have one integration owner. Parallel implementation is separate from
any later runtime parallelism inside ALGAL applications.

## First integrated milestone

Build a development-workspace organism with this real, inspectable sequence:

1. An application has an executable procedure, a goal, an applicability query,
   declared dependencies, and a data-defined diagnostic view.
2. Its query is unresolved. The view explains the missing premise and shows a
   bounded investigation intent naming an admitted probe.
3. The investigator obtains an actual observation through a sandbox boundary.
   The application commits the observation and a new memory state.
4. A derivation now enables the procedure. The UI and dispatcher cite the same
   state and evidence. The procedure executes and records its result.
5. Changed evidence makes the old applicability stale or opposed. Dependent new
   work is disabled or reconsidered, an investigation is scheduled, and the old
   successful experience remains inspectable in its historical scope.
6. The host exits and restarts. The same state, unresolved work, and completed
   effects reconstruct without repeating completed writes or model decisions.
7. A candidate discovery procedure is evaluated against the incumbent and
   retained alternatives. A compatible accepted revision becomes active for new
   work through an expected-head transition. Existing processes remain pinned.

The demonstration uses deterministic cases and recorded adapters first. Real
model proposal and coding evaluation follow on the same interfaces, using the
existing backend and the standing $20 incremental paid-inference cap.

## Non-negotiable operational rules

- Publish immutable dependencies and durable intents before advancing one head.
  Compare the expected head under the same retained host lease. Never use an
  unconditional mutable slot as an application transaction.
- Persist revision-derived event identities before delivery. Replaying outbox
  dispatch must be idempotent; application restart must not lose an investigation.
- Memory writes and candidate activation require an expected state or epoch.
  Old processes may finish into their own immutable branches but cannot silently
  publish into a newer application state.
- An upgrade does not rewrite an existing process definition, clear uncertainty,
  or create a new effect namespace to evade reconciliation. Initially compatible
  upgrades preserve external interfaces and memory schema and do not widen
  capability requirements. Explicit schema/process migration is a later protocol.
- Sources and hypotheses remain distinct. Host decoders admit observations.
  The runtime cannot infer a complete dependency set from a plausible explanation
  or from one canonical proof witness.
- Queries remain pure. Investigations are explicit, bounded effects. Unsupported,
  opposed, conflicted, stale, unknown, exhausted, and failed computations remain
  distinguishable.
- Bound objects, histories, active work, retained storage, native query work,
  model attempts, and visible data. Report actual acquisition/evaluation overhead.
- A revision rollback changes future selection; it does not undo external effects.

## Subsequent milestones

1. **Reusable substrate and continuity:** implement the shared records, memory
   snapshots, atomic application state, and defining restart/upgrade demonstration.
2. **Programmable investigation:** express investigation strategy and retrieval
   policy as ordinary ALGAL programs; compare several procedures and retain
   environment-specific alternatives.
3. **Evaluated adaptation:** real proposal generation, bounded experiments,
   explicit non-regression criteria, reproducible lineage, and revision promotion.
   Add a structured-facts-without-inference ablation before attributing benefits
   specifically to Datalog.
4. **Schema and interface evolution:** declarative migration programs evaluated
   against retained snapshots; compatible activation of code, schema, queries,
   views, and memory. Explicitly migrate or drain pending work.
5. **Multiple inhabitants:** independent components with distinct capabilities,
   budgets, memory views, and durable communication; measure useful concurrency
   and contention rather than assuming more agents imply better outcomes.
6. **Broader applications:** package the qualified runtime surfaces and a usable
   workbench, and demonstrate a
   second application with a different memory/effect domain.

Reference/native parity is a gate throughout this program. An exploratory host
application may initially use Bun and a native query adapter, but it must be
labeled accordingly. Stable kernel guarantees cannot be advertised on both
runtimes before both implementations pass the shared cases.

The kernel remains focused on identity, admission, execution, custody, resources,
and revision boundaries. Domain concepts, exploration policies, candidate
generation, and most evaluation logic should themselves be ALGAL programs.

## Checkpoint retained from the harness spike

The harness JSON-action/budget/context repairs pass 31 focused tests. The native
memory adapter passed 18 focused tests before the direction change. Its runner
and the post-terminal cross-task observation scope repair remain unfinished;
they must not be treated as a qualified evaluation pipeline.

At the user's pause, one calibration trial was cancelled and retained as invalid,
without retry. Seven backend calls completed, with zero incremental paid API
spend. The second calibration task and controlled comparison did not run. The VM
stopped and its original configuration was restored. No solving or memory benefit
is claimed from that interrupted calibration.

## Research grounding

The propagator model motivates accumulating partial information and retaining
premise-dependent alternatives ([Radul and Sussman](https://groups.csail.mit.edu/mac/users/gjs/propagators/)).
Self-adjusting computation motivates explicit dependency tracking and updating
affected computations ([Acar](https://www.umut-acar.org/self-adjusting-computation)).
Proof-tree inspection offers a concrete model for explanation tied to derivation
([Souffle provenance](https://souffle-lang.github.io/provenance)). These are design
inputs; the application lifecycle and proposed integration remain ALGAL work to
implement and test.
