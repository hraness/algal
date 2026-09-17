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
  output contract, an optional route, declared tool callbacks, and byte, turn,
  and wall-clock (`budget.maxEffectMs`) budgets — a hung executor becomes a
  recorded, routable failure instead of a hung run.
- `classifier` — an agent cell restricted to a closed set of labels, with an
  optional `onMiss` fallback. Its output drives `guard`ed edges, which is how
  routing decisions live in the structure instead of in prose. A classifier
  may run in `shadow` mode: the model's decision is recorded on the receipt
  while a declared label stays authoritative — audition before promotion.
- `gate` — an approval point: a `choice` cell whose effect request carries
  `kind:"gate"` so executors route it to a human or a policy check instead of
  a model. Approval stays visible in the structure and on the receipt.
- `organism` — a sealed sub-manifest referenced by digest. The outer graph sees
  only its declared interface ports. This is symbolization: a compound that is
  versioned, inspectable, and not a free primitive. `via` names a transport
  the host configures (`--transports` maps names to bundle directories or
  HTTP(S) base URLs): on a local miss, the closure arrives as a verified
  bundle — remote resolution, local execution, and the receipt records which
  transport served it.
- `repeat` — bounded iteration over a digest-embedded sub-manifest: up to
  `maxRounds` rounds, with `carry` mapping interface outputs back into the
  next round's inputs and an optional `until` early-exit on an interface
  output. The evaluator-optimizer pattern as structure — the graph stays a
  DAG while the automaton gets ticks.
- `each` — a delivered list fans out: the sub-manifest runs once per element
  (`over` binds the element), and each interface output collects into a list
  port. Map is a cell; combined with `many` inputs the graph expresses
  fan-out → compute → collect without a loop construct in sight.
- `store` / `load` — the only data IO cells. `store` writes a `json` payload
  into the content-addressed store and emits a `ref` port — a `sha256:` token.
  `load` resolves the token back to the payload. No port ever carries more
  than `maxValueBytes` (256 KiB canonical), so bulk data *must* flow through
  CAS — only digests ride edges, receipts, and contexts. A caller-supplied
  `ref` must already resolve — `morphogen store put` mints one — and a store
  that returns wrong content fails `DIGEST_MISMATCH`.
- `slot` — durable named state across runs: an organism's memory. `read`
  emits the stored value (or a declared `default`; empty-without-default
  fails, routable via `on:"fail"`), `write` stores its `data` input and
  echoes it. Reads are recorded on the receipt and served verbatim on
  replay — a live slot may have moved on since the run being verified.

Edges connect a producer port to a consumer port. Ports are typed (`text`,
`json`, `choice`, `ref`), and a `json` port may declare a bounded `schema`
(`{"type","required","properties"}`, depth ≤ 4) — a delivered record that
violates it fails the consumer's activation, routable through `on:"fail"`.
Guarded edges fire only when the produced choice equals the
guard label — or, on a `json` producer, when `guard.field` of the delivered
record strictly equals `guard.equals`, so routing can depend on a structured
field without a classifier in between. An edge declared `"on": "fail"`
fires when its producer's activation *fails* and delivers the failure
record `{code, message}` to a `json` consumer — recovery cells are
structure, and a cell with no fail edge still fails the run closed. Input
ports are single-assignment unless declared `many`, in which case every
delivered edge collects into a list — fan-in, including conditional fan-in
through guards. The graph must be acyclic.

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
(agent plan → classifier review → guarded branches), `inbox` (the triage
organism embedded as one cell), `lookup` (an agent reading a record through a
`pick.v1` tool call), `refine` (a `repeat` evaluator-optimizer loop),
`panel` (three reviewers fanning into one synthesizer's `many` input),
`escalate` (field guards routing a ticket record on `severity` — no
classifier), `recover` (a classifier miss fails; an `on:"fail"` edge hands
the record to a fallback cell), and
`swarm` (an `each` cell mapping a question list through a sub-manifest), and
`stash` (a document pinned to CAS by a `store` cell — only the `ref` token
reaches the `load` cell that resolves it), and `intake` (a schema'd input
port rejecting a malformed ticket, the failure record routed to a `repair`
cell through `on:"fail"`), `flaky` (a classifier scripted to emit a bad
label, then a good one — `retry` re-issues the same signed request and the
receipt records both attempts under one digest), and `remote` (an organism
cell whose sub-manifest exists only in a bundle directory — `via` fetches,
verifies, and runs it), and `approve` (a `gate` cell's decision is a required,
guard-fed input — the merge cell only activates on "approve"), and `guard`
(an `assert.v1` invariant fails on a mismatched value — the `on:"fail"` edge
hands the record to a `hold` cell), and `counter` (a `slot` cell reads a
durable count, `inc.v1` bumps it, a write-mode `slot` stores it back — state
that survives between runs) — with
scripted responses, then verifies each receipt offline. To run one yourself:

```sh
bun run cli check examples/triage.morphogen.json
bun run cli run examples/triage.morphogen.json \
  --args examples/triage.args.json \
  --responses examples/triage.responses.json --write
bun run cli verify .morphogen/runs/<receipt-digest>.json \
  examples/triage.morphogen.json
# or omit the manifest — it resolves from the store by the receipt's digest
bun run cli verify .morphogen/runs/<receipt-digest>.json
# compare two runs: which cells diverged, what each one cost
bun run cli diff .morphogen/runs/<a>.json .morphogen/runs/<b>.json
# mint a ref for a payload — then pass the token as a "ref" arg
bun run cli store put payload.json        # → {"ref":"sha256:…"}
bun run cli store get sha256:…            # → the payload
# a portable closure: the manifest plus everything it embeds and references
bun run cli pack examples/inbox.morphogen.json --modules examples > bundle.json
bun run cli unpack bundle.json --dir /tmp/elsewhere   # installs, digests verified
```

`check` admits a manifest without running it: parse, graph validation, and
interface resolution only. `explain` prints the compiled signature — every
cell's resolved input/output ports (including ports inherited from embedded
organisms, `repeat`, and `each`) and the guard on every edge. Organisms that
embed others resolve sub-manifests by digest from the store; `--modules <dir>`
loads a directory of `*.morphogen.json` files first.

To go live, point `--executor-cmd` at any program that reads an effect request
(JSON) on stdin and prints the model's output on stdout. Morphogen does not
broker provider access; the executor seam is where provider auth lives.
`--executors <file>` takes a JSON map of name → command, so a cell's
`route.provider`/`route.preset` picks its model.

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
- Effect cells may declare `retry: {"attempts": n}` (≤8): a failed effect —
  executor error or contract violation — is recorded with its request digest
  and the same request re-issued. Every attempt is metered and replayed in
  order; exhaustion fails the cell, routable through `on:"fail"`.
- An agent cell's context is declared, not ambient: `view.inputs` selects its
  edge-fed inputs, and `view.cells` names ancestor cells whose committed
  records join the request under `context.cells` — optionally sliced to named
  ports. Admission rejects non-ancestors and undeclared ports, so an agent
  can never read a cell that hasn't run — the graph decides what the model
  sees.
- An agent cell may declare `tools`: a bounded list of registry fns the
  executor may call back mid-activation. A `{"tool","inputs"}` response runs
  the fn, appends to the request's `toolLog`, and re-issues the request —
  bounded by `budget.maxTurns` and counted against `maxAgentCalls`. This is
  how agents call functions inside the automaton without ambient authority.
- The receipt records every committed/skipped/failed cell (with per-cell
  work attribution), every effect request and response, the event log, and
  the work ledger. `verify` replays the run with recorded receipts fixed and
  reports any divergence; `diff` compares two receipts canonically.
- Manifests and receipts are content-addressed canonical JSON; payloads ride
  the same CAS through `ref` ports. The store is a seam: `MemoryStore` and
  `FileStore` (`.morphogen/`) ship now; an Oh-backed store implements the
  same ten methods. `pack`/`unpack` move a manifest's whole embedding
  closure — sub-manifests and `const`-referenced payloads — between stores
  as one verified bundle.
- `run --cache-effects` memoizes effects across runs through the store's
  effect index: an identical request digest serves the earlier recorded
  response (marked `cached` on the new receipt). Only successes memoize —
  recorded errors may be transient. `morphogen runs` lists the receipts
  stored under `--dir`.

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
