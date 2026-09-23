> Implementation and qualification are tracked separately. The durable application
> lifecycle, memory services, policy host, evaluation and migration, captured views,
> and episode dispatcher have reference/native implementations. The shared
> application and CLI parity drivers gate their common behavior. The
> [completion review](2026-09-22-review.md) records the design-to-evidence map,
> adversarial repairs, and remaining research limitations; the
> [adaptive inventory application](adaptive-inventory.md) exercises a second domain.
> Live coding/memory qualification resumes only after deterministic gates, under
> a small, explicitly budgeted paid-inference allowance. No model-quality benefit is
> inferred from deterministic fixtures or the earlier cancelled pilot.

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

The application lifecycle joins these objects through one expected-head commit.
Process definitions stay immutable; activation selects a new revision for future
work. Foundry ranking alone is insufficient: the application host replays bound
evaluation evidence and rejects failed or regressing candidates. The existing
first-witness query proof is not a complete truth-maintenance graph.

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

The tracks were built by independent owners against a root-owned contract,
in overlapping waves bounded by the available workers. Each writer owned
explicit files; shared exports, CLI wiring, schemas, and final validation had
one integration owner. That build-time parallelism is separate from any later
runtime parallelism inside ALGAL applications.

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
   environment-specific alternatives. The compare-and-retain half now exists:
   `algal.application-comparison.v1` joins several reproduced evaluations for
   one entrypoint under an explicit `environment` label on the evaluation
   request, keeps losing or incomplete alternatives as evidence, and allows
   selection only from accepted verdicts. Both runtimes produce and verify the
   record identically, and the default host fences cited comparisons to the
   committing application and parent state. The generation half now exists too:
   a `propose` transition runs a case-pure generator entrypoint of the incumbent
   revision and retains `algal.application-proposal.v1` — bounded, replayable
   evidence whose candidates are ordinary child revisions differing only at the
   target manifest, so generation can never widen authority. Environment-keyed
   selection exists as well: `algal.application-selection-policy.v1` maps an
   environment label to a retained comparison's selected manifest, and the host
   option `selectionEnvironment` — outside `algal.host-admission.v2` — decides
   whether a cited policy may narrow activation to that environment's accepted
   alternative. No model-quality benefit is claimed for generated candidates.
3. **Evaluated adaptation:** real proposal generation, bounded experiments,
   explicit non-regression criteria, reproducible lineage, and revision promotion.
   The bounded-evidence half now exists: `algal.application-experiment.v1`
   joins the whole promotion chain — proposals, evaluations, comparison,
   selection policy, and retained selection — for one application, parent
   state, entrypoint, and environment, replayed in full before minting and
   again when the default host replays it as supplementary activation
   evidence. An experiment grants no authority and never substitutes for the
   accepted-evaluation coverage checks; an experiment that selected nothing,
   or selected a candidate that was not promoted, remains valid retained
   evidence. `algal.application-selection.v1` retains one resolved policy row
   as a closed record, and `application lineage` — `service.lineage` on the
   reference side — projects validated history to one row per committed state
   in genesis→head order, byte-identical on both runtimes. The
   structured-facts-without-inference ablation exists as a deterministic
   parity fixture: the same applicability query is derived over two memory
   chains that differ by exactly one structured fact — the retained
   observation claim — so the derivation flips between `unknown` and
   `supported` with no inference anywhere. It demonstrates that the join
   distinguishes fact presence; it claims nothing about fitness or efficacy.
   Model-driven proposal, explicit non-regression criteria, and any
   Datalog-specific benefit attribution remain open.
4. **Schema and interface evolution:** declarative migration programs evaluated
   against retained snapshots; compatible activation of code, schema, queries,
   views, and memory. Explicit drain of undispatched work now exists:
   `algal.application-drain.v1` names every undispatched pending intent at a
   migrate's parent state with an explicit `migrated`/`abandoned` disposition,
   replayed identically by both runtimes and the policy host. Abandonment is
   content-addressed evidence — intent records stay immutable — and a migrate
   that ignores undispatched pending work commits nothing.
5. **Multiple inhabitants:** independent components with distinct capabilities,
   budgets, memory views, and durable communication; measure useful concurrency
   and contention rather than assuming more agents imply better outcomes.
   The verifiable-delivery half now exists: a settled `deliver` dispatch
   retains `algal.interapp-message.v1`, binding sender application, committing
   operation, exact work intent, route, admitted `cap:mailbox-send:` recipient,
   and payload body; `verifyInterappDelivery` replays those bindings against
   CAS, validated history, the retained settled dispatch, and the durable
   channel outcome. The measured-contention half exists too:
   `algal.application-contention.v1` retains a raced command set against one
   expected head — every command digest, the single committed winner, and the
   losers' reproducible stale-head reasons — and
   `verifyApplicationContention` re-derives the fence's verdict structurally
   without re-executing. Both records are produced and verified identically
   on the reference and native runtimes, and the adaptive-inventory example
   carries them as measured evidence.
6. **Broader applications:** package the qualified runtime surfaces and a usable
   workbench, and demonstrate a
   second application with a different memory/effect domain.
   The packaged surfaces now exist: `@hraness/algal` 0.2.0 ships the Bun CLI,
   SDK, bundled examples, and specification with test files excluded from the
   tarball, while the standalone native executable carries the same `algal`
   commands. The usable workbench exists as the
   [native workbench](native-workbench.md): `algal demo start` retains a fixture
   proposal in a durable workbench whose passive `report.html` emits the exact
   approve/deny commands, and `algal demo prove` exercises approval, denial,
   detached evidence verification, and two owned crash recoveries. The second
   application exists as the [adaptive inventory](adaptive-inventory.md)
   executable example: three inhabitants with distinct budgets and authority,
   file-probe observations and discovered tool executables rather than coding
   effects, an evaluated planner revision activated across eight real host
   processes. Both demonstrations use deterministic fixtures; no commercial
   inventory accuracy or model-learning benefit is claimed.

Reference/native parity is a gate throughout this program. An exploratory host
application may initially use Bun and a native query adapter, but it must be
labeled accordingly. Stable kernel guarantees cannot be advertised on both
runtimes before both implementations pass the shared cases.

The kernel remains focused on identity, admission, execution, custody, resources,
and revision boundaries. Domain concepts, exploration policies, candidate
generation, and most evaluation logic should themselves be ALGAL programs.

## Checkpoint retained from the harness spike

The continuation repaired the runner and persisted mutation/observation scope
across terminal boundaries, task changes, and reconstruction. Deterministic
regressions now cover those boundaries, proposal/receipt binding, storage
corruption, and probe/frontier changes. Final validation and any subsequent live
measurements belong in the completion review; earlier focused counts describe
the checkpoint, not the current tree.

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
inputs, not proof that ALGAL inherits their formal guarantees. The implemented
contracts and tested claims are described in the completion review.
