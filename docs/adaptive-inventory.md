# Adaptive inventory application

This executable example applies ALGAL's application lifecycle to inventory
observations and replenishment decisions. It uses actual bounded file probes,
the native query engine and replay verification. Proposals are authored
deterministic programs. No model call, purchase or external inventory write is
performed.

Build the native CLI, then give the scenario a new directory:

```sh
cargo build --locked
ALGAL_MEMORY_NATIVE="$PWD/target/debug/algal" \
ALGAL_BIN="$PWD/target/debug/algal" \
bun examples/adaptive-inventory/run.ts /tmp/algal-inventory-example
```

`ALGAL_MEMORY_NATIVE` is required and its executable is pinned by SHA-256 for the
run. `ALGAL_BIN` optionally renders the initial unresolved and final captured views
using `application report`. Existing output directories are rejected. All fixture mutations and
retained application state live beneath the supplied new directory.

Three inhabitants have separate manifest budgets and authority declarations:

| Inhabitant | Work budget | Authority | Result |
| --- | ---: | --- | --- |
| Investigator | 2,000 | `inventory-read` | Select the admitted stock and tool-configuration probes |
| Planner | 4,000 | None | Resolve the configured tool and produce a replenishment decision |
| Proposer | 3,000 | `inventory-propose` | Produce an authored candidate manifest |

The host enforces the investigation/proposal route declarations. Every manifest
has a zero model-call budget. These are independent program identities and
durable deliveries within one application, not separate operating-system
sandboxes or a claim of measured multi-agent performance.

The active revision retains a goal to establish current stock and discover the
current tool before selecting a recommendation. Its typed query joins both
observations. Unknown and stale goal statuses drive investigation; a supported
goal selects the planner entrypoint. The evidence records the sequence
`unknown → supported → stale → supported → supported`, and the final view
retains the exact goal definition, state, memory, and derivation reference.
Support establishes current evidence, not that inventory was replenished.

Eight separate Bun host processes execute the scenario. The parent waits for
each host to exit successfully before starting its successor; it does not own
an application service. The native query executable is pinned across every
invocation. This demonstrates actual exit/reopen continuity, not abrupt
termination at every filesystem publication boundary.

The first host commits an investigation, captures a fresh query at that exact
head, and exits. Its view retains the unresolved query, declared host probes
and their dependencies, and pending investigation request. Its successor observes
`inventory.json` and `toolchain.json`, joins the two admitted observations in a
native query, and executes the incumbent planner. Its selected fixture tool at
`tools/inventory-a` is run and checked. The fixture then moves that executable
to `tools/inventory-b`, updates its configuration, and changes stock. A new host
confirms the old evidence is stale and schedules fresh investigation.

After rediscovery, an authored proposal produces a planner that reads the
declared current tool location. Evaluation freezes two train, three validation,
and two holdout cases. Both candidates execute train and validation; only the
winner executes holdout, for twelve retained case executions. The candidate
must improve validation without regressing an incumbent pass, then pass the
holdout. Activation occurs in another host invocation against the exact parent.

Every settled `deliver` dispatch also retains `algal.interapp-message.v1`:
the sender application, committing operation, exact work intent, route,
admitted recipient handle, and payload body. Each host recomputes the minted
record's identity from the retained dispatch and re-verifies the whole
binding against CAS and validated history before recording its digest in the
phase evidence.

Three competing writers then attempt to publish an episode against one
captured state. The head fence admits exactly one; the durable
`algal.application-contention.v1` record keeps all three command digests
sorted, the committed winner, and both losers' reproducible
`Stale application head` reasons, and the host re-verifies the record
structurally without re-executing. Another host executes the pinned planner
and verifies its actual retained receipt; the fixture checks that its
selected tool at B runs. A final host confirms no settled episode is
redelivered. There are four observation probes and two planner episodes.

Inspect `evidence.json` for counts, process identities, and content
identities — including the verified `algal.interapp-message.v1` digest and
the contention record digest, winner, and loser reasons;
`phase-*.json` for each exited host's evidence; `tool-*.json` for the selected
fixture tool checks; `view-unknown.json` for the initial unresolved capture;
`view.json` for the final supported capture; and optional `report-unknown.html`
and `report.html` for their passive renderings. `evidence.json` retains both
view identities and the corresponding report paths.

The final drilldown links current observations to their scopes, raw records,
receipts, decoders, and admission identities; it retains query facts/result/source
references, declared probes, accepted revision evaluation references,
and episode bindings and settlement. Organism probes display their VM budgets;
these host-backed inventory probes display a null VM budget. Each evidence category is capped at 32
rows with its own truncation flag. Immutable state references are captured
together, while work statuses are separately observed dispatch records. The
rendered report does not query, replay, authenticate observations, or dispatch.
Its unknown and supported labels describe the selected evidence, not external
inventory completion.

The application store retains observations, receipts, evaluation evidence,
message bindings, the measured contention record, and revision history. The
fixture proves these deterministic mechanisms; it does not establish
commercial inventory accuracy, model learning or general coding
improvement.
