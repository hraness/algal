# Morphogen Civilization

Morphogen is not just a workflow runtime. It is a substrate for a new kind of
programming: **civilization software**. Programs are organisms, organisms are
data, and a host can evolve a population of them by selecting, composing, and
promoting the ones that work.

This document is the convergence of the parallel spikes: agent tools, Pareto
benchmarks, live-model execution, habitats, and self-reproduction. It describes
what a Morphogen civilization is and gives a first runnable host loop.

## The four spikes

Each spike explored a different face of the same primitive:

1. **Agent tool spike** — `morphogen tool-def` and `morphogen call` let a larger
   agent use an organism as a typed, receipted tool. The agent stays open-ended;
   the organism takes over once the sub-problem is well-formed.

2. **Pareto benchmark spike** — `morphogen bench` and `morphogen bench verify`
   measure systems on cost, tokens, effects, and accuracy. The efficient
   frontier makes the tradeoff explicit instead of pretending one model is best.

3. **Habitat spike** — `examples/habitat/live.morphogen.json` and
   `examples/habitat/promote.ts` show a parent organism designing and spawning a
   child. The child is data; the host is the admission gate.

4. **Live-model spike** — the Vercel AI Gateway executor lets organisms call
   cheap models and record every token. Receipts replay offline, so a live
   civilization can be audited after the fact.

## What a civilization is

A Morphogen civilization is a long-lived loop:

```
goals  →  parent organism  →  proposed child  →  spawn  →  promote
                    ↑                                  ↓
                    └──────  population of winners  ←──┘
```

- **Goals** are environmental pressures: workloads, user requests, benchmarks.
- **Parent organisms** propose children by generating manifests (with models or
  by search).
- **Spawn** admits and runs the child under the parent's budgets.
- **Promote** adds the child to the population if it is valid and useful.
- **Selection** is whatever the host wants: bench Pareto, user approval,
  foundry search, or another organism.

The key invariant: the organism cannot rewrite the runtime, install tools, or
force its own promotion. It can only *propose*. The host owns admission.

## The first loop: `scripts/civ.ts`

`scripts/civ.ts` runs a tiny civilization. It reads a list of goals, runs the
live habitat organism for each one, and promotes every valid child to a bundle
in `civ/`. The fallback child acts as a safety net; with `--live` the model
mutates the children.

```sh
# scripted fallback civilization (deterministic, safe, fast)
bun scripts/civ.ts

# live-model civilization (each goal becomes a real child organism)
bun scripts/civ.ts --live
```

After a run, `civ/population.json` lists the digests and `civ/` contains the
packs. The host can now:

- run `morphogen bench` with the population as competing systems,
- run `morphogen foundry search` to breed better children,
- register a promoted child as a tool in a larger agent,
- keep the receipts as a fossil record.

## Why this matters

A single LLM call is a one-shot guess. A civilization of organisms is a
search-and-selection process over typed, bounded, verifiable candidates.

- **Cheaper**: most work is done by small models and deterministic cells.
- **Safer**: every organism is data, every run is a receipt, every effect is
  budgeted.
- **Evolvable**: new organisms are proposed and promoted against measured
  objectives, not vibes.
- **Composable**: a promoted organism can become a tool inside another organism
  or another agent loop.

## Near-future selection mechanisms

The loop currently uses the host's promote policy. The next layers are:

1. **Bench-driven selection** — run the candidates on a Pareto workload and
   promote only non-dominated ones.
2. **Foundry-driven breeding** — use `morphogen foundry search` to mutate
   organism topologies and keep the winners.
3. **Peer review** — an organism inspects another organism's receipt before
   voting for promotion.
4. **Tool proposals** — an organism proposes a new `fn` or `tool`; the host
   installs it if a bench shows it improves the frontier.

## The deeper shape

The trippy part: in a Morphogen civilization, **programming becomes ecology**.
The source code is not a static artifact. It is a population of organisms under
selection pressure. The receipts are fossils. The host is the environment. The
model is mutation. The bench is natural selection.

And because everything is content-addressed, you can fork a civilization, replay
its history, compare lineages, and ship a bundle of winners as a single
package.

This is the end product of the spikes: a practical, unique, and weird new way to
write software.
