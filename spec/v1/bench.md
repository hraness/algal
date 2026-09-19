# algal.bench.v1

A bench report records one workload measured by several systems. A system is an admitted organism manifest plus a host-resolved executor list — so "one cheap call", "one frontier call", and "a decomposed organism with a guarded escalation branch" are all the same kind of contender. Bench adds no manifest primitive and no authority; it is a measurement layer over ordinary runs.

## Systems and cases

A bench runs 1–8 systems against 1–256 cases. Every system manifest declares an interface; case `args` cover the interface's named inputs and `expect` covers every named output — so all systems see identical inputs and are scored on identical outputs. A case passes when the run completes and its declared outputs canonically equal `expect`; there is no judge and no leniency.

The config may instead carry a `scorer` — an `algal.expr.v1` program evaluated per case over `{"args","expect","outputs"}` that must return a boolean and replaces exact-match as the pass claim (the same bounded predicate the foundry selects under — "within tolerance", "any of these labels", "echoes the input" are all config data, not host hooks). A scorer that throws or returns a non-boolean fails the run `SCORER_INVALID` rather than silently flunking the case. When a scorer is present it is recorded in the report and covered by the report digest; verification replays each claim under the recorded program.

Each case result records outcome, declared outputs, expectations, run receipt digest, effect-call count, work, token usage, and per-model attribution (calls and tokens grouped by the effect's recorded model, or by executor id when none was reported — tools and scripted executors attribute to themselves).

## Evidence and pareto

The report embeds the complete case list (so verification needs no external config), a workload digest over it, every system's aggregate passed/total, effect calls, work, usage, and attribution, and the non-dominated system set on the default triple (passed ↑, cost signal ↓, effect calls ↓ — the cost signal is the dollar `cost` when a price card was supplied, otherwise total token count): a system is dominated when another is at least as good on every axis and strictly better on one. Ties break deterministically by the axes in order, then system id.

## Axes

The config may instead carry `axes` — a bounded non-empty list of at most 8 Pareto criteria, each `{"name","dir","expr"}`: a bounded id-style name, a direction (`"up"` means greater is better, `"down"` means lower is better), and an `algal.expr.v1` program. An axis program evaluates once per system over that system's aggregate record `{"id","manifestKey","manifestDigest","passed","total","effectCalls","work","usage","attribution"}` — the system result minus its case list — and must return a finite number. Literal `get` names are statically checked against exactly those fields at admission; an unbound name, a throwing program, or a nonnumeric result fails `AXIS_INVALID`.

When axes are present they replace the default triple entirely. Each computed value is recorded on the system as `axisValues`, the axis definitions are recorded on the report, and the pareto claim is computed over the recorded values — all covered by the report digest. Verification re-evaluates every axis program against every recorded aggregate, compares each recomputed value against its recorded `axisValues` entry, and recomputes dominance under the recorded directions; a report that records `axisValues` without declaring `axes`, or omits them when `axes` is present, fails to parse.

Verification parses strictly, recomputes the report and workload digests, rechecks every pass claim — under the recorded scorer when one is present — and aggregate, recomputes the pareto set, confirms each case's recorded receipt ran the claimed manifest with the claimed args, and replays every receipt offline. Tampering fails even when the report digest is recomputed, because claims must match receipted runs.

A verified bench report proves the recorded comparison is internally consistent. It does not prove the workload is representative, that token counts imply dollars (prices are host inputs, not evidence), or that future live effects will match recorded effects.
