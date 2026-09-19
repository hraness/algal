# ALGAL

**Programs that grow. More from every model.**

ALGAL — named as a nod to ALGOL, and to algae — is a new take on the agent
graph. Instead of bolting a DSL onto an existing language, ALGAL is a language
and runtime designed for agentic program evolution. A malleable agent harness
is simply a seed ALGAL program in an ALGAL habitat, and a habitat can
self-evolve into a swarm of agents with shared artifacts and tools: an agent
civilization.

Programs are content-addressable, which yields some interesting properties:
programs are values — they can be stored, diffed, spawned as children, and
passed between hosts. Every run emits a receipt that replays bit-for-bit
offline, so results are auditable without provider access. Lineage is a fossil
record in which every proposal, measurement, and promotion is addressed by its
content. And a manifest carries no host code — it can only name what the
host or the contract admits, which makes an untrusted program safe to
execute.

It's early days, but ALGAL programs already squeeze real work out of small
models: an organism built on Qwen Flash plus a ledger tool beat a single
Claude Opus call on a billing-dispute workload (6/6 vs 4/6) at ~20× lower
cost, and an on-device Apple Intelligence model proposed, compiled, and
promoted all four goals of a toy civilization without a single cloud call.

1. **A growing agent harness.** Keep successful behavior as inspectable programs,
   not just longer prompts. Propose new versions, measure them, preserve their
   lineage, and let the host decide which capabilities to admit.
2. **More useful work per model call.** Give small or large models narrow context,
   typed tools, deterministic checks, and explicit escalation. Measure quality,
   cost, and effect calls instead of assuming decomposition always helps.

Status: early. The TypeScript v1 runtime is the compatibility reference; the
native Rust kernel executes all 44 bundled examples with parity, and ACP,
relational memory, and on-device inference are implemented. See
[the design audit](docs/algal-design.md) for current qualification.

## Rename and compatibility

ALGAL was previously Algal. The package is `@hraness/algal` and the command
is `algal`; `algal` remains a compatibility command. Existing
`algal.*.v1` wire identifiers and `.algal.json` fixtures are intentionally
preserved: renaming a product must not silently change a manifest's digest or
invalidate its receipts. New files may use `.algal.json`. New stores default to
`.algal/`; use `--dir .algal` to access an existing store. No old state is
moved, deleted, or implicitly merged. The existing site origin remains
algal.dev until a new domain is configured.

## Two clear value props

### A living agent harness

A successful agent workflow becomes a reusable organism. Organisms can propose
children; the host tests and selects them. A population records programs and
evidence, not consciousness or permission to rewrite its own runtime.

### Squeeze more juice from LLMs

Use structure where structure helps: fetch missing evidence, calculate rather
than guess, validate outputs, and escalate on a measured failure condition.
Vercel AI Gateway and host-supplied executors are implemented. There is no
universal small-model-to-frontier-quality guarantee; compare systems with the
same tools, inputs, and evaluation budget.

The sharpest version of this trick: **ask the model for the smallest
sufficient decision, then let the host own everything else.** In `algal civ`,
the designer organism is `agent(plan) → fn(manifest.compile.v1)` — the model
emits a flat plan like `["fn:format.v1;prefix=Hello, "]` and a deterministic
host fn compiles it into a type-checked manifest. On a Mac with Apple
Intelligence, `algal civ --live --apple` runs the whole civilization epoch
on-device: the model proposed plans, the host compiled, measured, and promoted
all four goals (greet, double, invert, shout), and the population verifies
offline — no cloud, no subscription, fully receipted.

## Why this is a new primitive

ALGAL is a third thing between deterministic programs and open-ended agents:
a bounded, typed, content-addressed probabilistic program. The manifest is a
value; the receipt is evidence; and model judgment is isolated behind explicit
cells with declared contracts and budgets. See [`docs/why-unique.md`](docs/why-unique.md)
for the full comparison with prompts, agent loops, DAG engines, probabilistic
programming, smart contracts, and FaaS.

### Where this could go

Because manifests are values and receipts are evidence, organisms can generate,
store, and propose new organisms. A shared `Store`, `ToolRegistry`, and
`FnRegistry` becomes a habitat: a population of organisms that evolve through
foundry search and host admission. The organism cannot rewrite its own runtime,
but it can *propose* children, functions, and tools; the host decides what to
admit. See [`docs/habitats.md`](docs/habitats.md) for the design sketch,
[`examples/habitat.algal.json`](examples/habitat.algal.json) for a
deterministic working steel thread, `bun examples/habitat/promote.ts --live`
for a live model-driven reproduction loop, and [`docs/civilization.md`](docs/civilization.md)
with `bun scripts/civ.ts --live` for the first runnable civilization loop.

## What is this?

An **organism** is a manifest (`algal.organism.v1`): a set of cells with
declared ports, edges between ports, and budgets over the whole run. A manifest
carries no host code. It names things the host or the contract already admits.

Cell kinds:

- `input` — an entry point. Run args supply its output values.
- `const` — a literal producer. Ports are declared values.
- `fn` — a pure function from the host's registry (`echo.v1`, `tag.v1`,
  `coalesce.v1`, `pick.v1`, `format.v1` ship built in).
- `expr` — a bounded pure `algal.expr.v1` program carried in the manifest
  itself: contract-interpreted, fuel-metered, effect-free. Where `fn` names
  host-registered functions, `expr` is the manifest's own data-transformation
  language — arithmetic, conditionals, lexical `let`s, `get` paths,
  `map`/`filter`/`fold`, strings — evaluated identically by both runtimes
  (one Rust evaluator; native in the kernel, WASM in Bun). Output commits to
  `out`; activation burns 100 + fuel work; verify replays by re-evaluation.
- `tool` — a typed external effect resolved only from the host's tool registry.
  Read/write class, inputs, outputs, work cost, output bytes, timeout, and
  idempotency key are explicit; results and failures are receipted and replayed
  without repeating live IO. Agent cells may request the same admitted tools
  during bounded turns alongside pure function callbacks.
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
- `decide` — a declared map of typed questions (`noul` keep-probabilities,
  `choice` picks, `score` ratings) answered by a *decision provider* — typed
  decisions, never generated text. The output contract is derived from the
  question map (`{"answers":{…}}`), the effect request carries `questions`,
  and the provider must return exactly the declared answers. Decision
  executors serve `decide` and `classifier` cells only — they can never
  generate agent output or approve a gate. Jev (TypeSafe `systemone`) is
  the first such provider, admitted with `--jev`; its key lives in
  `TYPESAFE_API_KEY` or the local vault via `algal auth jev`.
- `recall` — an expression-derived semantic query over a host-owned index,
  recorded as an ordinary effect. `out` carries bounded ranked hits; when the
  first hit names a value-store object, `ref` carries its `sha256:` token
  directly into `load`. Empty recall is successful and leaves ref consumers
  skipped. Optional `rerank:{route,take?}` sends one recorded `noul` relevance
  question per hit to a decision provider such as Jev, then reorders the exact
  source records without summarizing them. The request binds query, `k`, and
  embedder; replay serves the recorded hits and decisions without consulting a
  mutable index.
- `compact` (an `agent` field, requires `tools`) — recorded tool-log
  compaction. When the canonical `toolLog` exceeds `maxLogBytes`, the
  runtime issues a `decide` effect triaging every unpinned entry (keep =
  `noul ≥ 0.5`); the request covers the pre-compaction log and the answers
  record the keep/drop, so replay reproduces the rebuilt log bit-for-bit.
  `compact.route` may send triage to a cheap decision provider while a
  frontier model runs the cell.
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
  `ref` must already resolve — `algal store put` mints one — and a store
  that returns wrong content fails `DIGEST_MISMATCH`.
- `slot` — durable named state across runs: an organism's memory. `read`
  emits the stored value (or a declared `default`; empty-without-default
  fails, routable via `on:"fail"`), `write` stores its `data` input and
  echoes it. Reads are recorded on the receipt and served verbatim on
  replay — a live slot may have moved on since the run being verified.
- Capability mailboxes are standard-library `tool` drivers, not a cell kind.
  `mailbox.send.v1` takes a typed `mailbox-send` cap and message;
  `mailbox.receive.v1` takes the independently revocable `mailbox-receive`
  cap. An empty receive suspends the run; an external send plus `resume`
  wakes it. Sends are idempotent by request digest, successful delivery is
  receipted, and verification never consumes the live mailbox.
- `spawn` — breeding, bounded to one idea. An upstream cell delivers an
  organism *manifest as data* (typically an agent's `json` output); the
  cell parses it through the ordinary contract, admits it to the store,
  and runs it as a nested organism under the spawn path — inner cells land
  on the receipt as `run/echo`, `run/src`, …. `args` maps interface
  inputs; outputs are `data` (the interface outputs) and `digest` (the
  admitted manifest's `sha256:` — provenance). The spawned organism
  inherits the host registry, executors, store, transports, budgets, and
  depth bound: generated manifests are data, never code.

Edges connect a producer port to a consumer port. Ports are typed (`text`,
`json`, `choice`, `ref`, `cap`). A `cap` declares its exact capability class,
feeds only the same class, and cannot be produced by `const` or widened into
`json`; authority enters through host args or trusted host drivers and stays
structural. A `json` port may declare a bounded `schema`
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

Prompt conventions do not compose and cannot be checked. ALGAL moves what
can be checked into the structure — routing, context, budgets, capabilities —
and leaves to the model only what is declared inside a cell boundary. A run is
then something you can replay, diff, and audit rather than a transcript you
have to trust.

## Where it wins

ALGAL wins where the work is **structured, verifiable, and cheaper to split
into many small decisions** than to pack into one long prompt. The fastest wins
are workloads where a single LLM call is missing information or has no way to
check itself:

- **Tool-grounded investigation** — a model call cannot look up a customer
  record, run a calculation, or inspect a ledger; ALGAL routes a typed
  `tool` cell before the judgment, then checks the result deterministically.
- **Multi-decision classifiers over one shared context** — dozens of narrow
  `classifier` cells see only the slices they need, each with a tiny prompt,
  instead of one monolithic completion.
- **Escalation by disagreement** — two cheap lanes plus an `assert.v1` guard
  escalate only when the cheap models disagree; frontier inference is sparse,
  not the default.
- **Verification before promotion** — a generated organism must pass train,
  validation, and holdout cases, and `algal verify` replays every receipt
  bit-for-bit before the organism is promoted.

### Case study: billing-dispute investigation

`examples/invest/` runs six support tickets where the correct decision depends
on a charge ledger. A lone model sees only the ticket; the ALGAL organism
retrieves the ledger through a typed `tool` cell and then classifies.

Live Vercel AI Gateway run:

|| system | passed | effect calls | cost | input tokens | output tokens | Pareto |
|---|---|---:|---:|---:|---:|---|
|| cheap-single (qwen3.5, no evidence) | 4/6 | 6 | $0.00371 | 759 | 14,087 | yes |
|| frontier-single (claude-opus-5, no evidence) | 4/6 | 6 | $0.02625 | 4,214 | 207 | — |
|| **organism-cheap (qwen3.5 + ledger tool)** | **6/6** | **12** | **$0.00131** | **1,210** | **4,716** | **yes** |
|| organism-ensemble (qwen3.5 + qwen3.7 + tool) | 6/6 | 19 | $0.00676 | 3,692 | 6,776 | — |

A Qwen Flash organism with a typed ledger lookup is **100% accurate on this
workload**, while a Claude Opus call without the tool is **67% accurate**.
Opus fails the same evidence-only cases as Qwen does when neither can look up
the charges. The Pareto set keeps both the organism (quality winner) and the
frontier single call (fewest round-trips), so the tradeoff is explicit and
can be chosen per deployment.

## First value

```sh
bun install
bun run cli suite

# or the native runtime
cargo build -p algal
./target/debug/algal suite --dir .algal
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
that survives between runs), and `breed` (an agent emits a manifest as
`json`; `spawn` admits it to CAS and runs it — the child's `echo` output
surfaces through `data`, the admitted digest through `digest`), and `hive`
(an agent emits a *list* of candidate manifests; `each` maps them through
a `spawn` wrapper — a bounded population where `result` collects every
candidate's outputs and `child` collects the admitted digests: lineage on
the receipt, then a `judge` picks one), and `lineage` (a `repeat` cell
runs writer → `spawn` → judge per round, `carry` feeds each score back as
feedback, `until` exits when the judge is satisfied — generations of
generated programs, each digest-pinned under `gen/r<n>/run`), and
`catalog` (a `push.v1` append writes each run's `child` digests into a
durable `bred` slot — a breeding journal that persists across runs), and
`consent` (a generated manifest carries its own `gate` — deny skips the
child's effectful cell entirely, so `run.data` reports the verdict and no
effect was spent), `decide-cell` (typed provider questions), `compact`
(recorded keep/drop triage over a tool log), and `recall` (an expression-derived
query returns two hits, recorded noul decisions rerank them, and the winning
`ref` feeds `load`) — with scripted
responses, then verifies each receipt offline in both runtimes. To run one yourself:

```sh
bun run cli check examples/triage.algal.json
bun run cli run examples/triage.algal.json \
  --args examples/triage.args.json \
  --responses examples/triage.responses.json --write
bun run cli verify .algal/runs/<receipt-digest>.json \
  examples/triage.algal.json
# or omit the manifest — it resolves from the store by the receipt's digest
bun run cli verify .algal/runs/<receipt-digest>.json
# compare two runs: which cells diverged, what each one cost
bun run cli diff .algal/runs/<a>.json .algal/runs/<b>.json
# mint a ref for a payload — then pass the token as a "ref" arg
bun run cli store put payload.json        # → {"ref":"sha256:…"}
bun run cli store get sha256:…            # → the payload
# admit separate send/receive mailbox capabilities
bun run cli mailbox create worker         # → {send:"cap:…", receive:"cap:…"}
bun run cli mailbox send cap:mailbox-send:sha256:… wake.json \
  --idempotency-key sha256:…             # optional: safe command retry
bun run cli resume .algal/runs/<suspended-receipt>.json --write
# a portable closure: the manifest plus everything it embeds and references
bun run cli pack examples/inbox.algal.json --modules examples > bundle.json
bun run cli unpack bundle.json --dir /tmp/elsewhere   # installs, digests verified
```

## Semantic recall over the store

`index` builds a derived hybrid index (embeddings + lexical) over stored
manifests, runs, values, and optional docs — disposable tooling, never
contract data: it changes nothing about digests, receipts, or replay.
`search` ranks chunks by cosine + token overlap and prints snippets. A
`recall` cell makes the same capability available inside an organism through
a recorded effect. Its bounded expression produces the query, `out` exposes
ranked text and provenance, and a top value hit also emits `ref` for direct
`load` resolution. Add `rerank:{route:{provider:"jev"},take:…}` to score each
dynamic hit through the typed decision seam before choosing that top ref; the
original hit records remain intact and the `decide` answers ride the receipt.
Index-backed recall is deliberately not effect-cached; replay comes from the
run receipt, while a new live run can observe a rebuilt index.

```sh
bun run cli index --dir .algal --docs docs
bun run cli search "gateway timeout retry" --dir .algal -k 5
bun run cli run organism-with-recall.json --dir .algal --recall local
# native equivalents use `algal index`, `algal search`, and `algal run --recall`
# `--embedder gateway[:<model>]` and `--recall gateway[:<model>]` opt into
# Vercel AI Gateway embeddings when AI_GATEWAY_API_KEY is set
```

When one organism combines recall with another effect provider, give the
recall cell an explicit route such as `{"provider":"memory"}` and its rerank
policy a decision route such as `{"provider":"judge"}`. The Bun `--executors`
map can admit `"memory":"recall"` and `"judge":"jev"`; native
`algal.host.v1` entries use
`"memory":{"kind":"recall","dir":".algal","embedder":"local"}` and a
separate Jev backend. The derived index implementations use different
disposable storage (SQLite in TypeScript, JSONL natively) but produce the same
local vectors and hybrid ranking.

## Provider credentials

Provider keys never enter manifests, receipts, digests, or logs — they resolve
at the executor boundary only. `auth` vaults them locally cross-platform
(macOS Keychain, libsecret, Windows DPAPI, or a permission-checked file
fallback); the provider env var always works as a CI escape hatch.

```sh
bun run cli auth jev            # vault a TypeSafe Jev key (TYPESAFE_API_KEY)
bun run cli auth jev --status   # where the key resolves from (hint only)
bun run cli doctor --jev        # live one-question check against systemone
```

## Foundry: select organisms by evidence

A foundry evaluates a bounded population against explicit train and validation
cases, promotes one manifest digest, and only then runs that winner on the
holdout split. A case passes only when the organism completes and its interface
outputs canonically equal the expected record. Every candidate manifest and run
receipt is persisted.

Candidates may be named files or manifests emitted as data by a generator
organism. The generator runs under the same executor, registry, store, and
budgets as any other organism; its digest and receipt become the population's
lineage. A generator may itself use `each`, `repeat`, `spawn`, slots, and gates,
so bounded populations, iterative search, durable journals, and approval are
composition rather than privileged foundry code.

```sh
bun run cli foundry examples/generated-foundry.config.json \
  --responses examples/foundry-generator.responses.json \
  --dir .algal --out foundry-report.json
bun run cli foundry inspect foundry-report.json
bun run cli foundry verify foundry-report.json --dir .algal
bun run cli foundry pack foundry-report.json --dir .algal --out bundles
```

A `algal.foundry.config.v1` file declares the generator, cases, and optionally
additional candidate paths:

```json
{
  "contract": "algal.foundry.config.v1",
  "generator": {
    "manifest": "generator.algal.json",
    "args": { "task": "Return the input unchanged." },
    "output": "candidates",
    "field": "candidates"
  },
  "cases": [
    { "id": "train-a", "split": "train", "args": { "q": "a" }, "expect": { "answer": "a" } },
    { "id": "validation-b", "split": "validation", "args": { "q": "b" }, "expect": { "answer": "b" } },
    { "id": "holdout-c", "split": "holdout", "args": { "q": "c" }, "expect": { "answer": "c" } }
  ]
}
```

Paths resolve relative to the config. Promotion prefers validation pass rate,
then train pass rate, then fewer agent calls and work units, with manifest digest
as the final tie-breaker. Non-promoted candidates never run against holdout
cases. A `algal.foundry.v1` report records expectations, outputs, work, token
usage, manifest and receipt digests, generator lineage, and the winner's holdout result.
`foundry verify` checks the report digest, scores, selection, claimed outputs,
and every run receipt by offline replay. `foundry pack` verifies that evidence
before exporting the promoted organism's content-addressed closure.

A bounded search repeats generation and selection while keeping holdout sealed.
The previous winner survives into the next population, and the generator sees
only prior train/validation scores, work, and manifest digests:

```sh
bun run cli foundry search examples/search.config.json \
  --responses examples/evolving-generator.responses.json \
  --dir .algal --out search-report.json
bun run cli foundry search-inspect search-report.json
bun run cli foundry search-verify search-report.json --dir .algal
bun run cli foundry search-pack search-report.json --dir .algal --out bundles
```

`algal.search.v1` bounds a search to eight generations. Every generation
records its generator receipt, proposals, full population evidence, and winner.
Verification replays the complete history, checks survivor continuity and that
every proposal was evaluated, and rejects any holdout evidence in generation
records. Baseline manifests may enter through the config's `candidates` list and
compete with generated organisms from generation zero onward.

## Bench: compare systems on one workload

A bench measures several systems — each an organism plus a host-resolved
executor list — against the same cases. "One cheap call", "one frontier call",
and "a decomposed organism whose frontier call is a guarded escalation branch"
are the same kind of contender. A case passes only when the run completes and
its declared outputs canonically equal `expect`; every case's receipt is
persisted and replayable.

```sh
bun run cli bench examples/bench.config.json --dir .algal --out bench-report.json
bun run cli bench inspect bench-report.json
bun run cli bench verify bench-report.json --dir .algal

# or natively — same config, same report contract
algal bench examples/bench.config.json --dir .algal --out bench-report.json
algal bench inspect bench-report.json
algal bench verify bench-report.json --dir .algal
```

A `algal.bench.config.v1` file names case `args`/`expect` pairs and systems
whose `executors` map names to `gateway:<provider/model>` (Vercel AI Gateway),
`scripted:<file>`, or `cmd:<command>` specs. The Bun CLI also accepts
`jev[:<model>]` and `recall[:<embedder>]`; the native CLI accepts `apple` for
the on-device bridge and admits Jev/recall through `algal.host.v1`. Named entries answer `route.preset` /
`route.provider`; the fallback is the first listed entry (in the native CLI,
the first name alphabetically). The report records per-case results, work,
token usage, per-model effect attribution, and the non-dominated pareto set on
(quality ↑, tokens ↓, effect calls ↓). A `scorer` program replaces exact-match
as the pass claim, and an `axes` list replaces the default pareto criteria —
each axis a bounded `algal.expr.v1` program over the system's aggregate that
must return a finite number (`examples/bench-axes.config.json`).
`examples/bench.config.json` runs it
deterministically; `examples/bench-live.config.json` swaps the scripted lanes
for `alibaba/qwen3.5-flash` and `anthropic/claude-opus-5` through the gateway.

For tool-grounded baselines, pass `--tools <file>`: a registry of named tools
with typed signatures and `scripted:<data>` or `cmd:<shell>` executors. The
billing-dispute case in `examples/invest/bench-invest-live.config.json` uses it
to compare a Qwen organism with a charge-ledger lookup against a Claude Opus
call that can only read the ticket. Add a `prices` map to the bench config
(`examples/invest/bench-invest-priced.config.json`) to put the Pareto in
aicharts.io-denominated dollars.

`check` admits a manifest without running it: parse, graph validation, and
interface resolution only. `explain` prints the compiled signature — every
cell's resolved input/output ports (including ports inherited from embedded
organisms, `repeat`, and `each`) and the guard on every edge. Organisms that
embed others resolve sub-manifests by digest from the store; `--modules <dir>`
loads a directory of `*.algal.json` files first.

To go live, point `--executor-cmd` at any program that reads an effect request
(JSON) on stdin and prints the model's output on stdout, or use
`--gateway-model <provider/model>` for the built-in Vercel AI Gateway executor
(short-lived OIDC or a scoped gateway key from the environment — never the
manifest). ALGAL does not broker provider access; the executor seam is
where provider auth lives. `--executors <file>` takes a JSON map of
name → command, so a cell's `route.provider`/`route.preset` picks its model.

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
- Effect routing is capability-aware and fails closed: every executor
  declares the effect kinds it serves (`agent`, `classifier`, `gate`,
  `decide`, `recall`), an unrouted request binds the first admitting
  executor, and a named route that cannot serve the kind records an
  `EFFECT_UNBOUND` effect. Executors without declarations default to the
  model-generation kinds only — a model adapter never inherits gate,
  decision, or recall authority. Scripted fixtures wildcard any named route
  for deterministic tests; replay resolves by request digest before
  routing, so verification never depends on live admissions.
- An executor may suspend a run: declining a request with `EFFECT_SUSPENDED`
  (or exiting 75 from a command executor) records the attempt, marks the
  cell `suspended`, and ends the run `suspended` — no retry, no fail edge.
  The suspended receipt still verifies bit-for-bit, and `algal resume`
  continues it: recorded effects replay by request digest, the suspended
  request re-issues against the currently admitted executors, and the tail
  executes live — idempotently, so a still-pending executor just suspends
  the process again.
- Mailbox receive uses that same process boundary: an empty admitted mailbox
  suspends, a sender holding the separate `mailbox-send` cap queues a bounded
  wakeup, and resume reissues the exact receive. Message files are immutable,
  send requests are idempotent, receive evidence is retained, and replay never
  mutates the live queue. Revoking either cap fails future uses closed.
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
- The receipt records every committed/skipped/failed/suspended cell (with
  per-cell work attribution), every effect request and response, the event
  log, and the work ledger. `verify` replays the run with recorded receipts
  fixed and reports any divergence; `diff` compares two receipts canonically.
- Manifests and receipts are content-addressed canonical JSON; payloads ride
  the same CAS through `ref` ports. The store is a seam: `MemoryStore` and
  `FileStore` (`.algal/`) ship now; an Oh-backed store implements the
  same ten methods. `pack`/`unpack` move a manifest's whole embedding
  closure — sub-manifests and `const`-referenced payloads — between stores
  as one verified bundle.
- `run --cache-effects` memoizes effects across runs through the store's
  effect index: an identical request digest under the same executor cache
  identity serves the earlier recorded response (marked `cached` on the
  new receipt). Scripted executors bind their whole response table into
  that identity; `command`, delegated-coding, and derived-index recall
  executors never memoize; and only contract-valid, in-budget,
  non-tool-call outputs are stored — errors may be transient. `algal runs`
  lists the receipts
  stored under `--dir`, and `algal manifests` / `manifest <digest>`
  list and print the manifest CAS — including children admitted by
  `spawn`, so a `bred` journal's digests resolve to inspectable programs.

## What not to infer

- A receipt proves the recorded run is self-consistent and replayable. It does
  not prove the world will cooperate next time, that the model was right, or
  that a label was anything but a label.
- `agent` cells carry no ambient authority. Model output is data until it
  binds to a declared contract; an agent can use only capability handles
  delivered through typed inputs and tools declared on that cell. Provider
  access remains behind executors the host owns.
- This is not yet a hosted orchestrator, distributed queue, or multi-agent
  town. Capability mailboxes are bounded local durable messaging; supervision,
  leases, migration, distributed consensus, and automatic wake scheduling are
  later host/runtime layers.

## Plug it into your agent or provider

ALGAL is a library and a CLI; the seams are deliberately narrow so you can
use it from a larger system without giving the system ambient authority.

### From code

```ts
import { builtinRegistry, runOrganism, vercelGatewayExecutor } from "algal";
import { FileStore } from "algal/store"; // or a custom Store

const receipt = await runOrganism({
  manifest: myManifest,
  args: { src: { ticket: "I was charged twice…" } },
  fns: builtinRegistry(),
  store: new FileStore(".algal"),
  executors: [vercelGatewayExecutor({ model: "alibaba/qwen3.5-flash" })],
  tools: myToolRegistry, // typed external effects
});
```

The `Executor` interface is one method: `execute(effect, signal?)` returns the
raw effect output. Any provider, local model, or hard-coded fixture fits by
wrapping that method. `runOrganism` does the scheduling, binding, budget
enforcement, and receipt writing. An executor declares the effect kinds it
serves with `capabilities: { effects: [...] }`; undeclared executors default
to `agent`/`classifier`, and `executorSupports` is the predicate the
scheduler routes by — see the spec's executor matrix for the fail-closed
rules. Two optional refinements: `serves(request)` is a request-aware
admission checked before routing (the replay executor uses it to serve
exactly the request digests it holds, letting `resume` replay a prefix and
run the tail live), and throwing `EFFECT_SUSPENDED` — or exiting 75 from a
command executor — suspends the run into a resumable checkpoint.

### From the CLI with any provider

```sh
# scripted replay fixture
bun run cli run ticket.algal.json --responses ticket.responses.json

# Vercel AI Gateway
bun run cli run ticket.algal.json \
  --gateway-model alibaba/qwen3.5-flash --write

# any command that reads JSON on stdin and writes JSON on stdout
bun run cli run ticket.algal.json \
  --executor-cmd "python -m my_provider_agent"
```

### External tools

Agent cells can request functions from the host registry (`tools: ["pick.v1"]`),
and explicit `tool` cells can call external services. For the CLI, declare the
registry in a `--tools <file>`:

```json
{
  "ledger.charges.v1": {
    "signature": {
      "inputs": { "account": "text" },
      "outputs": { "charges": "json" },
      "effect": "read",
      "cost": 50,
      "maxOutputBytes": 8192
    },
    "exec": "cmd:ledger-cli"
  }
}
```

The command receives `{ inputs, requestDigest, idempotencyKey }` on stdin and
must print a JSON object of output ports. For deterministic testing, use
`"exec": "scripted:<data.json>"`.

The CLI admits `mailbox.send.v1` and `mailbox.receive.v1` as standard tools
without a `--tools` file. Library hosts opt in explicitly with
`mailboxToolRegistry(service)` and may merge registries with
`mergeToolRegistries`; possession of a correctly typed handle is still checked
against the host's active capability records on every call.

### As an agent tool

Pack an organism and register it as an OpenAI or Anthropic function tool:

```sh
algal pack ticket.algal.json --out ./tools
algal tool-def ticket.algal.json > ticket-tool.json
```

Then call it from an agent:

```sh
algal call ./tools/<bundle>.bundle.json \
  --args ticket.args.json \
  --gateway-model alibaba/qwen3.5-flash
```

The result is compact enough for an agent to consume:

```json
{
  "ok": true,
  "outputs": { "out": "billing" },
  "receiptDigest": "sha256:...",
  "manifestDigest": "sha256:..."
}
```

The agent receives the output and a receipt digest it can verify later. See
`docs/agent-tool.md` for a complete example.

### Verification and transport

Receipts are content-addressed canonical JSON; `algal verify` replays them
offline with the recorded effects fixed. `algal pack` exports a manifest
closure — sub-manifests, `const` refs, and linked bundles — so one digest fully
describes a deployable program.

## How claims are checked

`bun run check` runs the typechecker, the linter, the test suite, and the site
build. Tests cover manifest parsing and bounds, graph admission (cycles, type
mismatches, guard validity, single-assignment), scheduler semantics (ordering,
skips, budgets, nesting), the effect seam (digest binding, output binding,
misses), capability-class isolation, mailbox quotas/revocation/idempotency,
suspend/wake/resume, store tamper detection, and verify round trips including
forged-output detection.

## Deeper documentation

- `spec/v1/organism.md` — the manifest, run, and receipt contract.
- `spec/v1/foundry.md` — candidate generation, evidence, promotion, and verification.
- `spec/v1/search.md` — bounded generations, feedback, survivors, and lineage.
- `spec/v1/bench.md` — workload comparison, attribution, and the pareto claim.
- `docs/` — design notes as they land.

## Related work

ALGAL is a Hraness project. It shares conventions with `oh`
(content-addressed canonical records), `platonik` (bounded organisms and
symbolization), `valhalla` (authority boundaries and witness execution), and
`oompa` (execution custody and conservative model routing), but it is
standalone: the store and executor seams are where those foundations attach.

## License

MIT. See `LICENSE`.
