# morphogen.bench.v1

A bench report records one workload measured by several systems. A system is an admitted organism manifest plus a host-resolved executor list — so "one cheap call", "one frontier call", and "a decomposed organism with a guarded escalation branch" are all the same kind of contender. Bench adds no manifest primitive and no authority; it is a measurement layer over ordinary runs.

## Systems and cases

A bench runs 1–8 systems against 1–256 cases. Every system manifest declares an interface; case `args` cover the interface's named inputs and `expect` covers every named output — so all systems see identical inputs and are scored on identical outputs. A case passes when the run completes and its declared outputs canonically equal `expect`; there is no judge and no leniency.

Each case result records outcome, declared outputs, expectations, run receipt digest, effect-call count, work, token usage, and per-model attribution (calls and tokens grouped by the effect's recorded model, or by executor id when none was reported — tools and scripted executors attribute to themselves).

## Evidence and pareto

The report embeds the complete case list (so verification needs no external config), a workload digest over it, every system's aggregate passed/total, effect calls, work, usage, and attribution, and the non-dominated system set on (passed ↑, total tokens ↓): a system is dominated when another is at least as good on both axes and strictly better on one. Ties break deterministically.

Verification parses strictly, recomputes the report and workload digests, rechecks every pass claim and aggregate, recomputes the pareto set, confirms each case's recorded receipt ran the claimed manifest with the claimed args, and replays every receipt offline. Tampering fails even when the report digest is recomputed, because claims must match receipted runs.

A verified bench report proves the recorded comparison is internally consistent. It does not prove the workload is representative, that token counts imply dollars (prices are host inputs, not evidence), or that future live effects will match recorded effects.
