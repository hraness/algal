# algal.organism.v1

The organism manifest contract. A manifest is data: it can be checked,
canonicalized, hashed, and embedded. It never carries host code — the
only programs it may carry are bounded, contract-owned ones
(`algal.expr.v1`), interpreted under fuel by the contract's evaluator
rather than the host language.

## Manifest

```json
{
  "contract": "algal.organism.v1",
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
| `contract` | literal `algal.organism.v1` |
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
| `tool` | host-admitted typed external effect | inherited from the host tool signature |
| `expr` | bounded pure `algal.expr.v1` program carried in the manifest | declared `inputs`; one output port `out` |
| `agent` | bounded model call | declared `inputs`; one output port `out` |
| `classifier` | agent restricted to `choice` output | same as agent |
| `gate` | approval point — a `choice` effect routed to a human/policy, not a model | same as agent; no `tools`/`shadow` |
| `decide` | declared typed questions answered by a decision provider | declared `inputs`; one output port `out` — the answers record |
| `recall` | bounded semantic query answered by a host-derived index | declared `inputs`; `out` is the ranked-hit record; `ref` is the top hit's loadable value ref when present |
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
a `algal.bundle.v1` closure; `unpack` installs it with every claimed
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
- `cap` — an opaque `cap:<class>:sha256:<digest>` handle. It must use the
  object form `{ "type":"cap", "capability":"<safe-class>" }`; producer
  and consumer classes must match exactly.

A `ref` is a pointer, not a value: the payload never rides the edge, so it
never enters receipts, agent contexts, or request digests — only the token
does. `recall`, `store`, `load`, `slot`, and `spawn` cells are the cells whose
ports are fixed by the contract. A `ref` token admitted
through `input` args or a `const` port must already resolve in the store —
the caller mints tokens by writing the payload first; no cell can invent a
dangling pointer.

A `cap` is authority, not payload. It feeds only a `cap` port declaring the
same class — never `json`, even though handles serialize as strings. `const`
cells cannot produce capabilities; roots receive them through host-supplied
input args, trusted host functions/tools may return them, and organism
interfaces may delegate them without widening their class. The handle is an
opaque local identifier, not a provider credential: the host must still hold
an active admission record and may revoke it independently.

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
  JSON output may be an object, array, string, number, integer, boolean, or
  null when the schema declares that type. An omitted `type` defaults to
  `object`. The VM checks `required` and declared `properties` recursively
  within the existing schema-depth bound. Declared properties are checked in
  UTF-8 lexicographic key order so failure evidence is independent of source
  key order. Other keywords, including
  `additionalProperties`, `maxLength`, `items`, and `enum`, are retained
  provider hints; they are not VM-enforced constraints or replay guarantees.
- `route` is a hint the executor may honor. It grants nothing by itself.
  `route.provider` and `route.preset` select among host-supplied executors by
  id (`<name>` or `provider:<name>` / `preset:<name>`). Selection is
  capability-aware and fails closed — see **Executors** under Effects.
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
- `compact` (optional, agent only, requires `tools`) is
  `{"maxLogBytes": 1..262144, "keepRecent"?: 0..8, "route"?: Route, "mode"?: "elide"}` — a
  recorded tool-log compaction policy. When the canonical `toolLog` exceeds
  `maxLogBytes` at the start of a turn, the runtime issues a `decide` effect
  asking one `noul` keep-question per unpinned entry (`keepRecent` pins the
  log's tail). Entries whose `noul` scores below 0.5 leave the log verbatim;
  kept entries and the pinned tail are byte-identical. The triage is an
  ordinary effect: its request covers the pre-compaction log, its answers
  record every keep/drop, it counts against `maxAgentCalls`, and replay
  reproduces the rebuilt log bit-for-bit. `compact.route` may route the
  triage to a different provider than the cell — a cheap decision backend
  can compact while a frontier model runs the agent. A compaction effect
  failure is recorded like any other and fails the cell.
- `compact.mode?: "elide"` opts into deterministic result-body projection instead
  of a `decide` effect. Omitting `mode` preserves the policy above and its receipt
  identity. `route` is invalid with `mode: "elide"`. Before each agent call, if
  either the canonical tool log exceeds `maxLogBytes` or the complete context
  exceeds `maxContextBytes`, replace old, unpinned result bodies oldest-first
  with `{contract:"algal.tool-output-ref.v1", source:Digest, bytes:Integer}`. The
  digest and byte count bind the original canonical result; the marker is not a
  summary or evidence of its contents. Only use a marker when it is smaller.
  Existing markers remain unchanged. Stop when both budgets fit or eligible
  bodies are exhausted. `maxLogBytes` is a soft reduction target: fn names,
  inputs, order, current inputs, notes, other cell views, and the recent tail
  remain exact. The ordinary complete-context bound still fails closed if
  protected material cannot fit. This mode makes no extra model call and does
  not change stored effects or the complete `cells[path].toolCalls` log. Each
  turn derives a fresh projection from that source log; replay reconstructs the
  same view. Pure tool results remain reproducible from their recorded calls;
  external tool results remain in their effect receipts. No recall tool or
  semantic summary is introduced. Byte savings do not establish token, cost,
  or task-quality improvements. See `examples/compact-elide.algal.json`.
- `budget.maxEffectMs` (1–600 000) supplies a per-effect timeout enforced
  at the host executor boundary. Receipts never record the clock itself.
  A settled timeout records `{code:"BUDGET_EXHAUSTED"}`; retry requires an
  executor that permits it. A timeout does not prove an operation never ran.
  Unknown completion in a journaled process leaves an uncertain intent and
  blocks settlement; it does not manufacture a failed receipt or authorize
  another dispatch. For the native Apple adapter, one I/O deadline covers
  stdin delivery and response waiting after bridge startup. Process startup
  is outside that bound, and concurrent calls using the same configured
  bridge path fail before submission instead of queueing.
- `retry` (optional, agent/classifier/gate) is `{"attempts": 2..8}`. A settled
  failed effect — executor error, over-bound output, or contract-violating
  response — is recorded with its request digest. When the executor permits
  retry, the *same* request is re-issued up to `attempts` per turn. A
  `retryable:false` effect ends that retry loop. The native Apple adapter
  never automatically retries an effect or downgrades its schema by issuing
  another generation. Every attempt counts against
  `maxAgentCalls` and the work ledger; exhaustion fails the cell (routable
  through `on:"fail"`). Since attempts share a request digest, the receipt's
  effects list is ordered: replay serves them in order and reproduces the
  run bit-for-bit.

### decide cells

```json
{
  "id": "probe",
  "kind": "decide",
  "inputs": { "proposal": "json" },
  "prompt": "optional framing for the provider",
  "questions": {
    "keep": { "type": "noul", "instructions": "Is this proposal still relevant?" },
    "lane": {
      "type": "choice",
      "instructions": "Pick the closest lane.",
      "criteria": { "bug": null, "feature": null, "chore": null }
    },
    "risk": { "type": "score", "instructions": "Rate breakage risk." }
  },
  "view": { "inputs": "*" },
  "route": { "provider": "jev" },
  "budget": { "maxContextBytes": 65536 },
  "retry": { "attempts": 2 }
}
```

A `decide` cell declares a bounded question map (≤ 64 names, each
`noul`/`choice`/`score` with `instructions` ≤ 4096 bytes and optional
`criteria`). It declares **no** output contract — the contract is derived
from the question map, an `{"answers": {<name>: <answer-by-type>}}` record:

- `noul` answers `{noul: number}` — a keep/relevance probability.
- `choice` answers `{choice: "<criterion>", confidence, probabilities}`.
- `score` answers `{score: number, confidence, probabilities}`.

The cell activates like an agent with one turn and no tools: the effect
request carries `questions` alongside `context`, and a *decision provider*
answers them — typed decisions, never generated text. The provider must
return exactly the declared answers: a missing, extra, or malformed answer
fails the output contract like any other violation. A `decide` request
routes to decision executors (`route.provider`/`preset`); a model executor
that only generates text must reject it, and a decision executor must
reject `agent` and `gate` requests — approval stays human/policy-routed.
`classifier` cells are the model-served single-choice equivalent: a
decision provider serves them by synthesizing one `choice` question from
the declared labels.

`budget.maxTurns` is fixed at 1 for `decide`; other budget fields, `view`,
`route`, and `retry` behave as on agent cells.

### recall cells

```json
{
  "id": "memory",
  "kind": "recall",
  "inputs": { "topic": "text" },
  "query": {
    "contract": "algal.expr.v1",
    "program": ["sconcat", ["get", "topic"], " failure recovery"]
  },
  "k": 8,
  "embedder": "local",
  "route": { "provider": "recall" },
  "rerank": { "route": { "provider": "jev" }, "take": 4 },
  "budget": { "maxContextBytes": 65536, "maxOutputBytes": 65536 },
  "retry": { "attempts": 2 }
}
```

A `recall` cell evaluates `query.program` against its delivered inputs under
ordinary expression fuel. Static checking admits only declared input names.
The result must be non-empty text of at most 4096 UTF-8 bytes. `k` defaults
to 8 and is bounded to 1–32. `embedder` defaults to `local` and may be
`local`, `gateway`, or `gateway:<model>`; it names the vector space the host
recall executor must query. `route`, `retry`, `maxContextBytes`,
`maxOutputBytes`, and `maxEffectMs` have their ordinary effect meanings;
`maxTurns` is not accepted.

`rerank` is optional and must declare an independent route containing
`provider` or `preset`; this keeps semantic-index access and model decisions
under separate host authority. `take` optionally truncates the reranked result
to 1–`k` hits and otherwise all hits remain. When the index returns at least
two hits, the runtime issues a second, ordinary `kind:"decide"` effect with one
`noul` relevance question per hit over `context:{query,hits}`. Hits sort by
answer descending with original rank as the deterministic tie-break. The
runtime never rewrites a hit: retained records are byte-for-byte source values,
only reordered and optionally truncated. Zero- and one-hit results need no
rerank effect.

The resulting `kind:"recall"` request carries
`recall:{query,k,embedder}`. A provider returns exactly one `hits` list with
at most `k` records in ranked order. Each record is
`{id,source,seq,score,text,ref?}`: `id` is the chunk digest, `score` is finite,
`text` is capped at 2048 UTF-8 bytes, and `ref`—when present—must be the exact
`sha256:` token named by its `value:` source. Unknown fields and malformed
records fail `EFFECT_UNPARSEABLE`.

The full `{hits:[…]}` record commits on `out`. If the first ranked hit has a
`ref`, the same token also commits on `ref`; otherwise that port is absent and
its downstream edge dies. Thus `recall.ref → load.ref` resolves full CAS
payloads. With `rerank`, `out` and `ref` reflect the decision-ranked result;
without it, they reflect index order. An empty hit list is a successful result
whose `ref` consumers skip. A rerank call counts independently against
`maxAgentCalls` and work, uses the cell's retry/effect bounds, and records every
relevance score in the effect receipt so replay reconstructs the same order.

The semantic index is host-owned, derived, and mutable—not manifest or receipt
data. A live run records the returned hits as an ordinary effect, and replay
serves that exact response without reopening the index. Index-backed recall
executors are not cross-run memoized: an identical query may legitimately see
a newer derived index. The receipt proves which request received which hits;
it does not attest the index's current contents.

### expr cells

```json
{
  "id": "rate",
  "kind": "expr",
  "inputs": { "ticket": "json", "base": "json" },
  "expr": {
    "contract": "algal.expr.v1",
    "program": [
      "let", "amt", ["get", "ticket", "amount"],
      ["if", ["gt", ["mul", ["get", "amt"], ["get", "base"]], 1000],
        "high", "std"]
    ]
  },
  "output": { "kind": "choice", "labels": ["high", "std"] }
}
```

Where `fn` cells compose functions the host registry owns, `expr` cells
carry the program itself — a bounded pure `algal.expr.v1` program
(spec/v1/expr.md) evaluated against the delivered `inputs`. The result
commits to the single port `out` under the `output` contract (same shape
as agent output; `onMiss` is rejected — a program returns exact values).
Static checking at parse covers op names, arity, bounds, and literal
`get` names against the declared input ports. Activation burns 100 + fuel
work units (`budgets`-bounded; the per-activation fuel ceiling is
`BOUNDS.maxExprFuel`) and produces an ordinary cell commit — no effect
request, no executor — so verification replays the program by
re-evaluation.

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

### Capability mailboxes and wakeups

Mailboxes are host standard-library tools over the generic `tool` cell — not a
new cell kind:

```json
{ "id":"in", "kind":"input",
  "outputs":{"inbox":{"type":"cap","capability":"mailbox-receive"}} }
{ "id":"wait", "kind":"tool", "tool":"mailbox.receive.v1" }
```

The host admits two typed drivers:

- `mailbox.send.v1`: inputs `mailbox` (`mailbox-send` cap), `message` (`json`);
  output `id` (`text`). The id is the digest of mailbox, idempotency key, and
  message. A repeated tool request is one delivery, never a duplicate.
- `mailbox.receive.v1`: input `mailbox` (`mailbox-receive` cap); outputs `id`
  and `message`. Pending messages are selected in deterministic delivery-key
  digest order. Receive mutates the mailbox, so both drivers declare effect
  `write`.

`algal mailbox create <name>` admits a mailbox and prints independent send and
receive handles plus its bounds. Pending count is 1–1024 (default 64); canonical
message bytes are 1–250,000 (default 65,536). `mailbox revoke` disables one
handle without changing the other. Capability records, immutable message
claims, and pending/consumed delivery markers live under the host's `--dir`;
bundles and manifests never contain those admissions.

An empty receive throws `EFFECT_SUSPENDED`. The tool attempt records
`retryable:false`, the cell/run suspend normally, and the `algal mailbox send`
command supplies an external wakeup from a send cap and JSON value. A caller
may pass `--idempotency-key sha256:…` to make retries the same delivery;
without it each invocation mints a fresh delivery key. The `algal resume`
command filters the suspended dequeue attempt, replays any
completed prefix tool effects, and reissues that exact receive request live.
Its successful effect receipt records the delivered message id and value.
`verify` serves that receipt and never opens or consumes the live mailbox.
Immutable message claims and consumed markers are retained as host recovery
evidence; mailbox storage accounting and garbage collection remain host
lifecycle responsibilities.

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
- Composition covers the rest of the breeding loop without new mechanism:
  an `each` cell over a spawn-wrapper runs a bounded *population* (the
  `child` digests collect as lineage); a `repeat` cell carrying a judge's
  score back into the writer's input runs bounded *generations* (each
  round's child records under `loop/r<n>/run`); and a generated manifest
  may itself declare a `gate` — generated programs can carry their own
  approval points.

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

- A guard is one of three shapes. Bare `{"equals": "bug"}` guards a
  `choice` producer and the label must be in the producer's declared
  labels. `{"field": "severity", "equals": "high"}` guards a `json`
  producer: the edge delivers only when the value is an object whose named
  field strictly equals `equals`. A non-object value or a missing field
  never matches — the edge is dead, not an error. `{"expr": {…}}` carries
  an `algal.expr.v1` program evaluated over `{"value": delivered}` on any
  producer type — routing logic as data. It must return a boolean; a
  thrown or non-boolean guard is a manifest bug and the run hard-fails
  `GUARD_INVALID` (a dead edge is the only way a guard says "no"). Guard
  fuel is metered into run work like any other burn.
- An input port accepts at most one edge (single assignment) unless it
  declares `"many": true`. A `many` port collects every delivered edge in
  manifest edge order into a list. A guarded edge into a `many` port
  contributes only when its guard fires — that is conditional fan-in. `many`
  is valid on input ports only (agent/classifier/gate `inputs`, registry fn
  signature inputs); a required `many` port needs at least one delivery or the
  cell skips, and an optional one arrives as `[]`.
- Type compatibility: same type; `choice` may feed `text`; `choice` feeds
  `choice` when the consumer's labels cover the producer's; anything except
  `ref`/`cap` feeds `json`; `json` feeds only `json`. `ref` feeds only `ref` —
  a token is not the payload, so it cannot widen into `json`. `cap` feeds only
  `cap` with the exact same capability class — authority cannot widen into
  `json` or another class. For `many` ports the rules apply per element.
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
  `stuck` (pending cells remain but none can resolve), or `suspended` (an
  effect asked the host to pause the process; see
  [Suspension and resume](#suspension-and-resume)).

## Work ledger

Modeled units, not wall time: 100 per activation, plus the fn signature's
`cost`, plus 500 + context bytes + output bytes per effect. Bounded by
`budgets.maxWork`; `maxSteps` bounds activations, `maxAgentCalls` bounds
effects, `maxContextBytes`/`maxOutputBytes` bound each effect's I/O.
Each cell record carries the work attributed to it — for `organism`,
`repeat`, and `each` cells that is the whole subtree's units, while inner
cells keep their own records.

## Effects

An agent/classifier/gate/decide/recall activation produces an effect request:

```json
{ "contract": "algal.effect.v1", "cellId": "route", "kind": "classifier",
  "prompt": "…", "context": {"inputs": {…}}, "output": {…},
  "budget": {…}, "route": {…}, "questions": {…}, "recall": {…} }
```

A host `tool` call uses `algal.tool-effect.v1` instead:
`{contract,path,tool,effect,inputs}`. Its canonical digest is the idempotency
key passed to the driver, and its output/error is stored in the same ordered
run `effects` list under `executor:"tool:<name>"`. Strict verification serves
that record; resume may replay a completed tool prefix and route only a missing
or suspended tool request live.

`questions` is present on `decide` requests only — the declared question
map the provider must answer. Internal compaction and recall-rerank requests
carry it too; `kind` stays `decide` while `cellId` names the owning agent or
recall cell. `recall` is present on `kind:"recall"` requests
only and binds the evaluated query, hit cap, and embedder spec.

`sha256` over the canonical request is the binding between request and receipt.
The executor sees exactly these bytes; nothing else crosses the boundary.
Executor output is bound to the declared `output` contract before it can feed
edges. A miss on a `choice` output resolves to `onMiss` or fails the run.

### Executors

Executors are host-supplied; the manifest is data and cannot name host code.
Every executor declares `capabilities.effects` — the effect kinds it is
admitted to serve. Undeclared executors default to `agent`/`classifier`
only: a legacy adapter never silently gains approval, decision, or index
authority.

Selection is capability-aware in both directions:

- An unrouted request binds the first executor admitting its kind.
- `route.provider`/`route.preset` names an executor by id; a named executor
  that does not admit the kind fails closed — it is never substituted.
- A route miss — no admitted executor carries that id — may be served by a
  `routeWildcard` executor. That is the scripted-fixture seam: it simulates
  any named route so manifests stay exercisable under deterministic tests.
  Live executors are never wildcards.
- With no candidate, the run records an ordinary failed effect:
  `executor:"unbound"`, `error.code:"EFFECT_UNBOUND"`, `retryable:false`.
  It is receipt data and replays like any other recorded failure.

The built-in matrix: model executors serve `agent`/`classifier`; decision
executors serve `classifier`/`decide`; index executors serve `recall`;
gate approval requires an executor the host explicitly admitted for `gate`;
command executors are host-written adapters admitted for every kind;
scripted fixtures serve every kind and wildcard routes.

A replay executor is not a route: verification resolves recorded effects by
request digest before capability selection, so offline replay never depends
on which executors the host currently admits. An executor may also declare
`serves(request)` — a request-aware admission checked before capability
routing. The replay executor uses it to serve exactly the request digests
its receipt list holds; on a miss the request falls through to ordinary
live routing, which is what makes `resume` able to replay a recorded prefix
and execute the tail live in one pass.

## Receipts — algal.run.v1

A receipt records `manifestDigest`, `args`, `outcome`, per-cell records
(`committed | skipped | failed | suspended`, outputs, `failure` detail,
`effectDigest`,
`toolCalls`, `shadowOut`, `rounds`, `items`, per-cell `work`), the
`effects` list (`requestDigest`, then `output` *or* `error` — a failed
effect records `{code, message}` so replay reproduces it — `executor` id,
optional usage, `cached` when the response was served from a prior run's
record rather than executed, `retryable:false` when re-issue is forbidden,
and `configurationDigest` for the admitted backend configuration), the bounded
`events` log, the work ledger,
and run-level `failure` detail. `digest` is over the canonical receipt
minus itself.

## Verification

`verify(receipt, manifest)` replays the run with a replay executor that serves
recorded effect outputs by request digest — in record order when a digest
repeats under `retry` — then compares cells, effects, work, and outcome. Any
divergence is reported by name. The check is offline and deterministic:
receipts fix what the world returned.

### Suspension and resume

An executor or host tool may decline a request with `EFFECT_SUSPENDED` — the
answer is not ready (a gate awaiting a decision, a delegated task still
pending, or an empty mailbox). Suspension is not failure and not an answer:

- The attempt is recorded like any effect — `error.code:"EFFECT_SUSPENDED"`,
  `retryable:false` — then the run stops cleanly: the cell records
  `status:"suspended"`, a `cell.suspend` event is emitted, and the run ends
  `suspended`. Suspension bypasses `retry` (the request is never re-issued
  within the run) and does not fire `on:"fail"` edges (nothing failed).
- The suspended receipt is a valid checkpoint: `verify` replays it
  bit-for-bit because replay reproduces the suspension rather than an answer.
- `resumeRun(checkpoint, manifest, store, executors, …)` — `algal resume` —
  continues the run. Completed effects replay by request digest exactly as
  verify does; suspended-effect records are dropped from the replay set so
  the same request re-issues live; everything else — the suspended request,
  its cell, and the unexecuted tail — routes to the currently admitted live
  executors. Replay resolves by digest, so an agent cell suspended mid-loop
  replays its recorded turns and goes live only at the pending one. Resuming
  with an executor that still suspends produces another suspended checkpoint,
  so resume is safely repeatable.
- Command executors signal suspension with exit code 75 (`EX_TEMPFAIL`);
  any other nonzero exit is an ordinary `EFFECT_FAILED`.

The bounded named supervisor, dispatch intents, mailbox wake scheduling, and
cross-runtime filesystem ABI are specified in [algal.process.v1](process.md).
A recorded suspension is resumable; an interrupted dispatch with uncertain
external completion must be reconciled before any retry.

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
bit-for-bit: replay reproduces the `cached` flag from the record. Derived-index
recall executors opt out of this memo table because the same query may observe
newly indexed sources; their per-run effect receipt remains replayable.

## Bundles — algal.bundle.v1

A bundle is a portable closure: `{"contract","root","manifests","values"}`.
`pack` walks the root manifest's embedding graph (`organism`/`repeat`/`each`
cells) and every payload named by a `const` `ref` port, collecting each into
a digest-keyed map. `unpack` installs the closure into a store — every entry
re-hashes against its claimed key (`DIGEST_MISMATCH` on tamper) and the root
must be among the manifests. A bundle is data with no host code: the
unpacked organism runs exactly as if its modules had been loaded
individually.

## Reserved, not implemented

- Cycles and streaming re-activation (organisms are DAGs in v1).
- Distributed process supervision and network mailbox transport.

## Schema-validation compatibility

Bun now enforces the same recursive `type`, `required`, and `properties`
subset as the native runtime. Previously, Bun accepted some outputs with a
wrong root type or missing/incorrect nested fields. It also rejected valid
primitive or integer JSON outputs that native accepted. The correction does
not turn unsupported provider hints into runtime constraints.

This changes replay for receipts affected by those bugs: an invalid output
formerly accepted may now fail verification, and a formerly rejected valid
output may replay as success. Preserve the original receipt and its matching
runtime when analyzing historical execution; do not rewrite retained evidence
to make it pass. Schema failure messages and property-validation order now
match native too, so newly created successful and failed receipts can replay
across both runtimes. Older Bun schema-failure receipts may therefore require
the original runtime even when their rejection was valid. Native failures with
multiple invalid properties may also need their original runtime and source
key order; native now checks properties in a deterministic order. This
correction does not relax exact replay or ignore diagnostic differences.
