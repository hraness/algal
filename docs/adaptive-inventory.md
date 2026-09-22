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
run. `ALGAL_BIN` optionally renders the final captured view using `application
report`. Existing output directories are rejected. All fixture mutations and
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

The first host commits an investigation and exits. Its successor observes
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

Two competing writers then attempt to publish an episode against one captured
state. Exactly one succeeds and a stale retry is rejected. Another host executes
the pinned planner and verifies its actual retained receipt; the fixture checks
that its selected tool at B runs. A final host confirms no settled episode is
redelivered. There are four observation probes and two planner episodes.

Inspect `evidence.json` for counts, process identities, and content identities;
`phase-*.json` for each exited host's evidence; `tool-*.json` for the selected
fixture tool checks; `view.json` for the captured application view; and optional
`report.html` for its passive rendering.
The application store retains observations, receipts, evaluation evidence and
revision history. The fixture proves these deterministic mechanisms; it does
not establish commercial inventory accuracy, model learning or general coding
improvement.
