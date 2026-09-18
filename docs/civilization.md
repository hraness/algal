# ALGAL Civilization

ALGAL is not just a workflow runtime. It is a substrate for a new kind of
programming: **civilization software**. Programs are organisms, organisms are
data, and a host can evolve a population of them by selecting, composing, and
promoting the ones that work.

This document is the convergence of the parallel spikes: agent tools, Pareto
benchmarks, live-model execution, habitats, and self-reproduction. It describes
what a ALGAL civilization is and gives a first runnable host loop.

## The four spikes

Each spike explored a different face of the same primitive:

1. **Agent tool spike** — `algal tool-def` and `algal call` let a larger
   agent use an organism as a typed, receipted tool. The agent stays open-ended;
   the organism takes over once the sub-problem is well-formed.

2. **Pareto benchmark spike** — `algal bench` and `algal bench verify`
   measure systems on cost, tokens, effects, and accuracy. The efficient
   frontier makes the tradeoff explicit instead of pretending one model is best.

3. **Habitat spike** — `examples/habitat/live.morphogen.json` and
   `examples/habitat/promote.ts` show a parent organism designing and spawning a
   child. The child is data; the host is the admission gate.

4. **Live-model spike** — the Vercel AI Gateway executor lets organisms call
   cheap models and record every token. Receipts replay offline, so a live
   civilization can be audited after the fact.

## What a civilization is

A ALGAL civilization is a long-lived loop:

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

## The native loop: `algal civ`

The native CLI runs a measured civilization epoch. It has four demo goals
(`greet`, `double`, `invert`, `shout`), each with bounded train, validation,
and sealed holdout cases. For every goal a *designer organism* proposes a
candidate, the candidate is measured on train and validation, and only winners
are promoted — with proposal provenance, per-case evidence, holdout results,
and a bundle digest recorded in a content-addressed population snapshot.

```sh
# deterministic scripted civilization (no provider needed)
algal civ --dir .algal/civ

# live civilization driven by a host executor
algal civ --live --gateway-model alibaba/qwen3.7-flash --dir .algal/civ

# fully on-device: Apple Intelligence proposes every candidate
algal civ --live --apple --dir .algal/civ

# replay a population snapshot and verify every claim offline
algal civ-verify --dir .algal/civ
```

### Models decide; hosts compile

A whole manifest is too large a surface for a small or on-device model to emit
reliably — free-form generation produces syntax the contract must reject. So
the designer organism is two cells: an `agent` cell that returns a *plan*, and
an `fn` cell running `manifest.compile.v1` that compiles the plan into a
manifest deterministically.

A plan is a JSON array of 1–4 step strings:

```json
["fn:format.v1;prefix=Hello, "]
["fn:double.v1"]
["const:\"fixed answer\""]
```

The grammar is `fn:NAME` optionally followed by `;PORT=VALUE` bindings, or
`const:JSON_LITERAL`. The compiler resolves the chain port per step, emits
const cells for bindings, checks edge types (`json` never narrows to `text`),
and assigns the manifest its content-derived key. Annotations that cannot
affect the compiled program — bindings to unknown or chain ports, bare noise
tokens — are ignored, so a small model's filler does not sink a sound
proposal; malformed intent (`fn:bogus.v9`, missing `=`, invalid literals)
still rejects.

This is the core ALGAL trick: **ask the model for the smallest sufficient
decision, then let the host own everything else** — syntax, typing, budgets,
admission, measurement, and promotion.

### On-device verification

On a Mac with Apple Intelligence enabled, `algal civ --live --apple` runs the
entire epoch against the on-device Foundation Models bridge. The declared plan
schema (`array` of `string`) is translated into a `DynamicGenerationSchema`,
so generation is schema-constrained rather than free-form. In the recorded
run the model proposed all four goals' plans; the compiler dropped harmless
annotations (`"Ada"`, `;input=hello`) and promoted **greet, double, invert,
and shout** — a fully local civilization epoch whose population snapshot
verifies offline.

## The TypeScript loop: `scripts/civ.ts`

`bun scripts/civ.ts [--live]` runs the original TypeScript-side civilization
over `examples/civ/goals.json`, promoting model-designed manifests into
`civ/` bundles. The native `algal civ` is the measured successor: plans
instead of raw manifests, selection instead of blanket promotion, and
`civ-verify` for offline auditing.

After a run, the host can:

- run `algal bench` with the population as competing systems,
- run `algal foundry search` to breed better children,
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
2. **Foundry-driven breeding** — use `algal foundry search` to mutate
   organism topologies and keep the winners.
3. **Peer review** — an organism inspects another organism's receipt before
   voting for promotion.
4. **Tool proposals** — an organism proposes a new `fn` or `tool`; the host
   installs it if a bench shows it improves the frontier.

## The deeper shape

The trippy part: in a ALGAL civilization, **programming becomes ecology**.
The source code is not a static artifact. It is a population of organisms under
selection pressure. The receipts are fossils. The host is the environment. The
model is mutation. The bench is natural selection.

And because everything is content-addressed, you can fork a civilization, replay
its history, compare lineages, and ship a bundle of winners as a single
package.

This is the end product of the spikes: a practical, unique, and weird new way to
write software.
