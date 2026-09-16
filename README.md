# morphogen

Typed, replayable workflow organisms. A workflow is a finite, typed graph where
the structure carries the decisions: deterministic cells do most of the work,
and bounded agent cells handle the parts that need judgment. Every run emits a
content-addressed receipt that a verifier can replay offline.

Status: early. The v1 contract, scheduler, effect seam, nested organisms, and
offline verification are implemented and tested. Hosted habitats, multi-owner
messaging, and workflow breeding are deliberately deferred.

## What is this?

An **organism** is a manifest (`morphogen.organism.v1`): a set of cells with
declared ports, edges between ports, and budgets over the whole run. A manifest
carries no executable code. It names things the host already admits.

Cell kinds:

- `input` — an entry point. Run args supply its output values.
- `const` — a literal producer. Ports are declared values.
- `fn` — a pure function from the host's registry (`echo.v1`, `tag.v1`,
  `coalesce.v1`, `pick.v1`, `format.v1` ship built in).
- `agent` — a bounded model call: a declared context view, a prompt, a typed
  output contract, an optional route, and byte budgets.
- `classifier` — an agent cell restricted to a closed set of labels, with an
  optional `onMiss` fallback. Its output drives `guard`ed edges, which is how
  routing decisions live in the structure instead of in prose.
- `organism` — a sealed sub-manifest referenced by digest. The outer graph sees
  only its declared interface ports. This is symbolization: a compound that is
  versioned, inspectable, and not a free primitive.

Edges connect a producer port to a consumer port. Ports are typed (`text`,
`json`, `choice`); guarded edges fire only when the produced choice equals the
guard label. Input ports are single-assignment. The graph must be acyclic.

## Why does it exist?

Prompt conventions do not compose and cannot be checked. Morphogen moves what
can be checked into the structure — routing, context, budgets, capabilities —
and leaves to the model only what is declared inside a cell boundary. A run is
then something you can replay, diff, and audit rather than a transcript you
have to trust.

## First value

```sh
bun install
bun run cli suite
```

`suite` runs every bundled example — `triage` (classifier routing), `pipeline`
(agent plan → classifier review → guarded branches), and `inbox` (the triage
organism embedded as one cell) — with scripted responses, then verifies each
receipt offline. To run one yourself:

```sh
bun run cli check examples/triage.morphogen.json
bun run cli run examples/triage.morphogen.json \
  --args examples/triage.args.json \
  --responses examples/triage.responses.json --write
bun run cli verify .morphogen/runs/<receipt-digest>.json \
  examples/triage.morphogen.json
```

`check` admits a manifest without running it: parse, graph validation, and
interface resolution only. Organisms that embed others resolve sub-manifests
by digest from the store; `--modules <dir>` loads a directory of
`*.morphogen.json` files first.

To go live, point `--executor-cmd` at any program that reads an effect request
(JSON) on stdin and prints the model's output on stdout. Morphogen does not
broker provider access; the executor seam is where provider auth lives.

## How does it behave?

- The scheduler sweeps cells in declared order. A cell activates when all its
  declared inputs are resolved; dead guarded edges skip the cells they feed,
  and skips propagate.
- Each activation is atomic and metered against run budgets (`maxSteps`,
  `maxAgentCalls`, `maxWork`, context/output byte bounds).
- Agent and classifier cells emit effect requests; the executor returns raw
  output, which is bound to the declared output contract before it can feed
  downstream edges. A classifier that misses its label set fails closed unless
  `onMiss` is declared.
- The receipt records every committed/skipped/failed cell, every effect
  request and response, the event log, and the work ledger. `verify` replays
  the run with recorded receipts fixed and reports any divergence.
- Manifests and receipts are content-addressed canonical JSON. The store is a
  seam: `MemoryStore` and `FileStore` (`.morphogen/`) ship now; an Oh-backed
  store implements the same four methods.

## What not to infer

- A receipt proves the recorded run is self-consistent and replayable. It does
  not prove the world will cooperate next time, that the model was right, or
  that a label was anything but a label.
- `agent` cells carry no authority. Model output is data until it binds to a
  declared contract; capabilities and provider access live at the executor,
  which the host owns.
- This is not a hosted orchestrator, a durable job queue, or a multi-agent
  town. Those are later layers; the contract is designed not to need them yet.

## How claims are checked

`bun run check` runs the typechecker, the linter, the test suite, and the site
build. Tests cover manifest parsing and bounds, graph admission (cycles, type
mismatches, guard validity, single-assignment), scheduler semantics (ordering,
skips, budgets, nesting), the effect seam (digest binding, output binding,
misses), store tamper detection, and verify round trips including forged-output
detection.

## Deeper documentation

- `spec/v1/organism.md` — the manifest, run, and receipt contract.
- `docs/` — design notes as they land.

## Related work

Morphogen is a Hraness project. It shares conventions with `oh`
(content-addressed canonical records), `platonik` (bounded organisms and
symbolization), `valhalla` (authority boundaries and witness execution), and
`oompa` (execution custody and conservative model routing), but it is
standalone: the store and executor seams are where those foundations attach.

## License

MIT. See `LICENSE`.
