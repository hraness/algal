# morphogen.organism.v1

The organism manifest contract. A manifest is data: it can be checked,
canonicalized, hashed, and embedded. It can never carry code.

## Manifest

```json
{
  "contract": "morphogen.organism.v1",
  "key": "organism:triage",
  "name": "Ticket triage",
  "note": "optional bounded text",
  "budgets": { "maxSteps": 64, "maxAgentCalls": 4, "maxWork": 100000 },
  "interface": {
    "inputs": { "ticket": { "cell": "ticket", "port": "text" } },
    "outputs": { "summary": { "cell": "result", "port": "value" } }
  },
  "cells": [ ... ],
  "edges": [ ... ]
}
```

| field | rule |
| --- | --- |
| `contract` | literal `morphogen.organism.v1` |
| `key` | `organism:<kebab-key>`, ≤ 64 chars |
| `name` | ≤ 120 chars |
| `note` | optional, ≤ 2000 chars |
| `budgets` | optional; see bounds table |
| `interface` | optional; required for embedding as an `organism` cell |
| `cells` | ≤ 64, unique kebab ids |
| `edges` | ≤ 256 |

## Cells

| kind | role | ports |
| --- | --- | --- |
| `input` | entry point; run args supply values | declared `outputs` |
| `const` | literal producer | `outputs` entries carry `type` + `value` |
| `fn` | pure registered function | inherited from the host registry signature |
| `agent` | bounded model call | declared `inputs`; one output port `out` |
| `classifier` | agent restricted to `choice` output | same as agent |
| `gate` | approval point — a `choice` effect routed to a human/policy, not a model | same as agent; no `tools`/`shadow` |
| `organism` | embedded sub-manifest by `sha256:` digest | inherited from the sub-manifest `interface` |
| `repeat` | bounded re-run of a digest-embedded sub-manifest | inherited from the sub-manifest `interface` |
| `each` | map a delivered list through a digest-embedded sub-manifest | `over` accepts one `json` edge carrying the list; other interface inputs pass through; interface outputs become lists |
| `store` | writes a payload into the content-addressed store | input `data` (`json`), output `ref` (`ref`) |
| `load` | resolves a `ref` token back to its payload | input `ref` (`ref`), output `data` (`json`) |
| `slot` | durable named state across runs | read: output `data` (`json`); write: input+output `data` |
| `spawn` | admit and run a manifest delivered as data | inputs `manifest` (`json`), `args` (`json`, optional); outputs `data` (`json`), `digest` (`text`) |

`organism`, `repeat`, and `each` cells may declare `via`: a transport name
(a safe id) the host maps to a bundle source — a directory of
`<hex>.bundle.json` files or an HTTP(S) base URL serving the same. When the
referenced manifest is absent from the local store, the transport supplies
a `morphogen.bundle.v1` closure; `unpack` installs it with every claimed
digest rehashed, then resolution retries locally. The cell's receipt record
carries `via` — the transport name that served the closure. Local hits
never consult transports, so `via` is a fallback, not a preference; a
missing transport or missing bundle fails closed (`STORE_MISS`), and a
wrong-rooted or tampered bundle fails `DIGEST_MISMATCH`. Trust is the
digest itself: a transport can only deliver content the manifest already
named — execution stays local, metered, and receipted either way.

### Port types

Every port declares one of:

- `text` — a string
- `json` — any JSON value; an optional `schema` field narrows it to a
  bounded subset (`{"type","required","properties"}` — the same shape as
  agent json output contracts, depth ≤ 4). The declaring cell owns the
  check: a produced value violating an output schema fails at commit; a
  delivered value violating an input schema fails the consumer's activation
  — either way routable through `on:"fail"`.
- `choice` — a string from declared `labels`
- `ref` — a `sha256:` digest token naming a payload in the store

A `ref` is a pointer, not a value: the payload never rides the edge, so it
never enters receipts, agent contexts, or request digests — only the token
does. `store`, `load`, `slot`, and `spawn` cells are the only cells whose
ports are fixed by the contract. A `ref` token admitted
through `input` args or a `const` port must already resolve in the store —
the caller mints tokens by writing the payload first; no cell can invent a
dangling pointer.

### agent / classifier / gate fields

```json
{
  "id": "route",
  "kind": "classifier",
  "inputs": { "ticket": "text" },
  "prompt": "Classify the ticket.",
  "view": { "inputs": "*", "note": "optional", "cells": ["prep"] },
  "output": { "kind": "choice", "labels": ["bug", "feature"], "onMiss": "bug" },
  "route": { "provider": "…", "model": "…", "preset": "…" },
  "tools": ["pick.v1"],
  "shadow": { "take": "bug" },
  "retry": { "attempts": 3 },
  "budget": {
    "maxContextBytes": 65536,
    "maxOutputBytes": 4096,
    "maxTurns": 8,
    "maxEffectMs": 30000
  }
}
```

- `prompt` is literal text ≤ 8192 chars. Templating belongs in an upstream
  `fn` cell.
- `view.inputs` selects which declared inputs enter the effect request context
  (`"*"` or a list of declared names). The context is canonical JSON
  `{inputs, note?, cells?, turn, toolLog?}`, byte-bounded before dispatch.
- `view.cells` (optional, ≤ 16 unique entries) names ancestor cells of the
  same organism scope. Each entry is a cell id `"prep"` or a slice
  `{"cell":"prep","ports":["value"]}` limiting which output ports enter the
  context. Their committed records — `{status, outputs?}`, or `null` if
  absent — appear under `context.cells.<id>`. Admission rejects unknown ids,
  non-ancestors, and ports the ancestor does not declare, so every record
  exists before the viewer activates. This is how an agent reads beyond its
  own inputs: the graph declares the slice.
- `view.graph` (optional boolean) requires `view.cells`. When true, the
  context carries `graph.edges` — the manifest edges among the named cells
  plus edges from them to the viewer, each `{from, to, guard?}` with
  dotted `cell.port` endpoints. An agent can see how the records it reads
  were wired, never the wiring of cells it cannot name.
- `output` is `{"kind":"text"}`, `{"kind":"json","schema":{…}}` (a bounded
  schema subset: `type`, `required`, `properties`, depth ≤ 4), or
  `{"kind":"choice","labels":[…],"onMiss"?}`.
- `route` is a hint the executor may honor. It grants nothing by itself.
  `route.provider` and `route.preset` select among host-supplied executors by
  id (`<name>` or `provider:<name>` / `preset:<name>`); the first executor is
  the default when no route matches.
- `shadow` (classifier only) declares an audition: `{"take":"<label>"}` runs
  the effect and binds the output normally, but commits `take` instead. The
  model's bound output is recorded on the cell receipt as `shadowOut`. This
  is how a new classifier earns authority — receipts accumulate shadow
  decisions for review before `shadow` is removed. `take` must be a declared
  label.
- `tools` (optional, ≤ 16) declares which registry fns the executor may call
  back. An executor response of the reserved shape
  `{"tool":"<ref>","inputs":{…}}` where `<ref>` is in `tools` is not bound as
  output: the host runs the fn, appends `{fn, inputs, output}` to
  `context.toolLog`, and re-issues the request. The loop is bounded by
  `budget.maxTurns` (1–16, default 8 when `tools` is present, else 1); each
  turn is a separate effect request and counts against `maxAgentCalls`. A
  `{tool, inputs}` response naming a ref outside `tools` is ordinary output.
  Tool calls that omit a required fn input fail the cell.
- `budget.maxEffectMs` (1–600 000) bounds each effect call wall-clock. On
  expiry the call records `{code:"BUDGET_EXHAUSTED"}` like any other failed
  effect — `retry` re-issues, `on:"fail"` routes, replay reproduces it.
  Receipts never record the clock itself: the bound is enforcement, not data.
- `retry` (optional, agent/classifier/gate) is `{"attempts": 2..8}`. A failed
  effect — executor error, over-bound output, or contract-violating
  response — is recorded with its request digest and the *same* request
  re-issued, up to `attempts` per turn. Every attempt counts against
  `maxAgentCalls` and the work ledger; exhaustion fails the cell (routable
  through `on:"fail"`). Since attempts share a request digest, the receipt's
  effects list is ordered: replay serves them in order and reproduces the
  run bit-for-bit.

### repeat cells

```json
{
  "id": "loop",
  "kind": "repeat",
  "manifest": "sha256:…",
  "maxRounds": 4,
  "carry": { "draft": "draft" },
  "until": { "output": "verdict", "equals": "ship" }
}
```

- `manifest` is the `sha256:` digest of a sub-manifest that declares an
  `interface`. The repeat cell's ports are inherited from that interface.
- `maxRounds` is 1–16. Round *n*'s cells record under `loop/r<n>/…` paths.
- `carry` maps interface output name → interface input name. After each round
  the named outputs feed the next round's inputs. A carried input port is
  optional on the repeat cell (round 0 may run without it); edge-fed values
  supply round 0, carried values override them in later rounds.
- `until` is an early-exit condition: stop after a round whose interface
  output `until.output` equals `until.equals` (canonical equality; if the
  output is `choice`, `equals` must be a declared label). With
  `until.field`, the output must be `json` and the round stops when the
  delivered record's named field strictly equals `equals`. It is **not** an
  assertion — exhausting `maxRounds` commits the last round's outputs, and
  downstream `guard`s decide what to do with them.
- The cell record carries `rounds` when more than one round ran. All run
  budgets — steps, agent calls, work — are root-owned across every round.

### store / load cells

```json
{ "id": "pin", "kind": "store" }
{ "id": "get", "kind": "load" }
```

- `store` takes one `json` input `data`, writes it into the store, and
  emits `ref` — the canonical digest of the payload. A payload over
  `maxBlobBytes` (262 144 canonical bytes) fails the cell.
- `load` takes one `ref` input `ref`, resolves it, and emits the payload on
  `data` (`json`). A token that does not resolve fails the cell
  (`INPUT_MISSING`); a store that returns content hashing to a different
  digest fails it too (`DIGEST_MISMATCH` — FileStore verifies on read).
- Both are deterministic cells: they emit no effect, and replaying a run
  re-runs them against the same store. `store` writes are idempotent —
  same payload, same digest.

### slot cells

```json
{ "id": "mem", "kind": "slot", "name": "count", "mode": "read", "default": 0 }
{ "id": "sink", "kind": "slot", "name": "count", "mode": "write" }
```

- `slot` cells are durable, mutable state: a named cell in the store that
  persists across runs — an organism's memory. `name` is a safe id in one
  flat space shared by every organism on the store; two manifests naming
  the same slot share it on purpose.
- `mode: "read"` takes no inputs and emits `data` (`json`): the stored
  value, or the declared `default` when the slot is empty, or a cell
  failure (`INPUT_MISSING`) when neither exists — routable via `on:"fail"`.
  `default` is rejected on write-mode cells and bounded by `maxValueBytes`.
- `mode: "write"` takes one `json` input `data`, stores it, and echoes it
  on `data` — so a write can sit mid-chain and order a downstream read by
  edge. Payloads are bounded by `maxBlobBytes`.
- Reads are nondeterministic input: the served value is recorded on the
  cell receipt (`slot: {name, mode}` plus the usual `outputs`), and
  `verify` serves the recorded outcome — a live slot may have been
  overwritten since, and a recorded read failure replays too. Writes are
  deterministic and idempotent under replay (same value, same slot).
- Within one run, a read sees whatever the store holds at its activation:
  wire a read behind a write with an edge to order them, or accept
  schedule order.

### spawn cells

```json
{ "id": "run", "kind": "spawn" }
```

- `spawn` is breeding bounded to one idea: an upstream cell (typically an
  agent emitting `json`) delivers an organism *manifest as data* on the
  `manifest` port. The cell parses it through the ordinary organism
  contract — the same parser, bounds, and rejection of unknown keys as a
  manifest on disk — admits it to the store, compiles it, and runs it as a
  nested organism under the spawning cell's path (`run/src`, `run/echo`, …).
- `args` (optional `json`) is a record keyed by the spawned manifest's
  `interface.inputs` names — the same mapping a caller supplies at run
  time. Absent `args` means `{}`.
- `data` emits the spawned organism's `interface.outputs` as a record;
  `digest` emits the admitted manifest's `sha256:` — provenance for what
  ran, resolvable in the store afterward.
- The spawned organism inherits everything about its root run: the
  function registry, the executor list, store, transports, and — since
  inner cells run on the same context — the root budgets and `maxDepth`.
  A spawned manifest can itself contain `spawn` cells; each nesting level
  consumes one depth step, so recursion is bounded.
- A manifest delivered on `manifest` is data, not code: it cannot name a
  function outside the host registry, an executor the host did not
  supply, or exceed any contract bound. An invalid manifest fails the cell
  through the normal contract errors (`PARSE_FAILED` et al), routable via
  `on:"fail"`.
- Spawned work is deterministic on replay: the manifest input rides an
  edge (a `const`, a recorded effect output, or a `load`ed payload), inner
  effects and slot reads replay from the receipt, and `putManifest` is
  idempotent — `verify` reproduces the run bit-for-bit.
- Manifests larger than `maxValueBytes` cannot ride an edge — `store` the
  manifest JSON first and deliver it through `load` → `data` → `manifest`.

### each cells

```json
{
  "id": "map",
  "kind": "each",
  "manifest": "sha256:…",
  "over": "q",
  "maxItems": 8
}
```

- `manifest` is the `sha256:` digest of a sub-manifest that declares an
  `interface`. `over` names an interface input; the each cell's `over` port
  accepts a single `json` edge whose delivered value must be a list.
- The sub-manifest runs once per element — item *n*'s cells record under
  `map/i<n>/…` — with `over` bound to the element (checked against the inner
  input port's declared type) and the cell's other inputs passed through.
- `maxItems` is 1–64; a delivered list longer than `maxItems` fails the cell
  (`BUDGET_EXHAUSTED`).
- Each interface output becomes a list port (`many` producer) collecting the
  per-item values in item order; items whose inner output skipped contribute
  nothing. A `many` producer feeding a `many` consumer flattens element-wise;
  feeding a scalar consumer it binds only when the consumer is `json`.
- The cell record carries `items` (the element count). All run budgets are
  root-owned across every item.

## Edges

```json
{ "from": { "cell": "route", "port": "out" },
  "to": { "cell": "as-bug", "port": "tag" },
  "guard": { "equals": "bug" } }
```

- A guard is valid only on a `choice` or `json` producer. Bare
  `{"equals": "bug"}` guards a `choice` producer and the label must be in
  the producer's declared labels. `{"field": "severity", "equals": "high"}`
  guards a `json` producer: the edge delivers only when the value is an
  object whose named field strictly equals `equals`. A non-object value or a
  missing field never matches — the edge is dead, not an error.
- An input port accepts at most one edge (single assignment) unless it
  declares `"many": true`. A `many` port collects every delivered edge in
  manifest edge order into a list. A guarded edge into a `many` port
  contributes only when its guard fires — that is conditional fan-in. `many`
  is valid on input ports only (agent/classifier/gate `inputs`, registry fn
  signature inputs); a required `many` port needs at least one delivery or the
  cell skips, and an optional one arrives as `[]`.
- Type compatibility: same type; `choice` may feed `text`; `choice` feeds
  `choice` when the consumer's labels cover the producer's; anything feeds
  `json`; `json` feeds only `json`. `ref` feeds only `ref` — a token is not
  the payload, so it cannot widen into `json`. For `many` ports the rules
  apply per element.
- `"on": "fail"` marks a failure edge: it fires when the producer's
  activation *fails* and delivers the failure record `{"code","message"}`
  to the consumer, which must be a `json` port. `guard` is not valid on a
  fail edge, a port may not mix normal and fail edges, and the producer's
  port is still named though the delivered value is the record. A cell that
  fails with at least one fail edge outbound is **handled**: the run
  continues. A cell that fails with none fails the run — failure is fatal
  unless the structure declares otherwise. A skipped producer is not a
  failure; its fail edges die with the rest.
- The graph must be acyclic.

## Run semantics

- Cells activate in declared order when every declared input is resolved
  (each incoming edge delivered or dead).
- A cell with declared inputs where every required input resolved empty, or
  where all inputs resolved empty, is **skipped**; its downstream edges die.
- A cell with no declared inputs fires unconditionally.
- Each activation is atomic: outputs commit together or the run fails.
- `organism` cells run their sub-manifest to completion inside the same run,
  depth-bounded by the **root** manifest's `budgets.maxDepth` (≤ 8). All run
  budgets — steps, agent calls, work, byte bounds — are owned by the root
  manifest and shared across nested levels. Inner cells appear in the receipt
  under `outer/inner` paths. A manifest can never contain its own digest, so
  embedding graphs are acyclic by construction.
- `repeat` cells run their sub-manifest up to `maxRounds` times, each round
  recording under `loop/r<n>/…`; `each` cells run theirs once per list
  element under `map/i<n>/…`. Iteration and fan-out are the only re-entry
  v1 admits: the edge graph itself stays acyclic.
- `store`/`load` activations charge the payload's canonical byte size to the
  work ledger and bound it by `maxBlobBytes`. `ref` tokens compose across
  `organism`/`repeat`/`each` boundaries — every nested run shares the root
  store, so a token minted at any depth resolves at any other.
- No port ever carries a value over `maxValueBytes` (262 144 canonical
  bytes) — produced outputs are bounded at commit and collected inputs
  (including whole `many` lists) at delivery. Anything larger must go
  through CAS: a `store` cell emits a ~71-byte `ref` token that rides the
  edge instead.
- A cell whose activation throws records `status: "failed"` with the
  failure detail. With no `on:"fail"` edge outbound, the run fails (first
  unhandled failure wins). With one, the run continues — the failure record
  is data routed by structure. This composes through `organism`, `repeat`,
  and `each`: an inner unhandled failure fails the enclosing cell, which
  may itself be caught at the outer level.
- A run ends `complete`, `failed` (first unhandled failure wins, recorded),
  or `stuck` (pending cells remain but none can resolve).

## Work ledger

Modeled units, not wall time: 100 per activation, plus the fn signature's
`cost`, plus 500 + context bytes + output bytes per effect. Bounded by
`budgets.maxWork`; `maxSteps` bounds activations, `maxAgentCalls` bounds
effects, `maxContextBytes`/`maxOutputBytes` bound each effect's I/O.
Each cell record carries the work attributed to it — for `organism`,
`repeat`, and `each` cells that is the whole subtree's units, while inner
cells keep their own records.

## Effects

An agent/classifier/gate activation produces an effect request:

```json
{ "contract": "morphogen.effect.v1", "cellId": "route", "kind": "classifier",
  "prompt": "…", "context": {"inputs": {…}}, "output": {…},
  "budget": {…}, "route": {…} }
```

`sha256` over the canonical request is the binding between request and receipt.
The executor sees exactly these bytes; nothing else crosses the boundary.
Executor output is bound to the declared `output` contract before it can feed
edges. A miss on a `choice` output resolves to `onMiss` or fails the run.

## Receipts — morphogen.run.v1

A receipt records `manifestDigest`, `args`, `outcome`, per-cell records
(`committed | skipped | failed`, outputs, `failure` detail, `effectDigest`,
`toolCalls`, `shadowOut`, `rounds`, `items`, per-cell `work`), the
`effects` list (`requestDigest`, then `output` *or* `error` — a failed
effect records `{code, message}` so replay reproduces it — `executor` id,
optional usage, `cached` when the response was served from a prior run's
record rather than executed), the bounded `events` log, the work ledger,
and run-level `failure` detail. `digest` is over the canonical receipt
minus itself.

## Verification

`verify(receipt, manifest)` replays the run with a replay executor that serves
recorded effect outputs by request digest — in record order when a digest
repeats under `retry` — then compares cells, effects, work, and outcome. Any
divergence is reported by name. The check is offline and deterministic:
receipts fix what the world returned.

### Effect memoization

The store keeps an effect index keyed by request digest — a memo table, not
CAS: the first recorded *successful* receipt wins and cannot be overwritten.
An executor wrapped in `cachedExecutor(inner, store)` consults the index
before calling `inner`; a hit returns the recorded `output` and the new run's
receipt records it with `cached: true`, so "this response came from a prior
run" stays a fact of the record. Errors are never memoized — a recorded
failure may be transient and must not determinize into permanence. A memoized
effect still occupies its budgeted slot (agent calls, context and output
bytes), still binds to the declared output contract, and still replays
bit-for-bit: replay reproduces the `cached` flag from the record.

## Bundles — morphogen.bundle.v1

A bundle is a portable closure: `{"contract","root","manifests","values"}`.
`pack` walks the root manifest's embedding graph (`organism`/`repeat`/`each`
cells) and every payload named by a `const` `ref` port, collecting each into
a digest-keyed map. `unpack` installs the closure into a store — every entry
re-hashes against its claimed key (`DIGEST_MISMATCH` on tamper) and the root
must be among the manifests. A bundle is data with no code: the unpacked
organism runs exactly as if its modules had been loaded individually.

## Reserved, not implemented

- Cycles and streaming re-activation (organisms are DAGs in v1).
- Inter-organism messaging during a run.
- Durable multi-run state beyond the content-addressed store.
