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
| `organism` | embedded sub-manifest by `sha256:` digest | inherited from the sub-manifest `interface` |

### agent / classifier fields

```json
{
  "id": "route",
  "kind": "classifier",
  "inputs": { "ticket": "text" },
  "prompt": "Classify the ticket.",
  "view": { "inputs": "*", "note": "optional" },
  "output": { "kind": "choice", "labels": ["bug", "feature"], "onMiss": "bug" },
  "route": { "provider": "…", "model": "…", "preset": "…" },
  "budget": { "maxContextBytes": 65536, "maxOutputBytes": 4096 }
}
```

- `prompt` is literal text ≤ 8192 chars. Templating belongs in an upstream
  `fn` cell.
- `view.inputs` selects which declared inputs enter the effect request context
  (`"*"` or a list of declared names). The context is canonical JSON
  `{inputs, note?}`, byte-bounded before dispatch.
- `output` is `{"kind":"text"}`, `{"kind":"json","schema":{…}}` (a bounded
  schema subset: `type`, `required`, `properties`, depth ≤ 4), or
  `{"kind":"choice","labels":[…],"onMiss"?}`.
- `route` is a hint the executor may honor. It grants nothing by itself.

## Edges

```json
{ "from": { "cell": "route", "port": "out" },
  "to": { "cell": "as-bug", "port": "tag" },
  "guard": { "equals": "bug" } }
```

- A guard is valid only on a `choice` producer, and the label must be in the
  producer's declared labels.
- An input port accepts at most one edge (single assignment).
- Type compatibility: same type; `choice` may feed `text`; `choice` feeds
  `choice` when the consumer's labels cover the producer's; anything feeds
  `json`; `json` feeds only `json`.
- The graph must be acyclic.

## Run semantics

- Cells activate in declared order when every declared input is resolved
  (each incoming edge delivered or dead).
- A cell with declared inputs where every required input resolved empty, or
  where all inputs resolved empty, is **skipped**; its downstream edges die.
- A cell with no declared inputs fires unconditionally.
- Each activation is atomic: outputs commit together or the run fails.
- `organism` cells run their sub-manifest to completion inside the same run,
  depth-bounded (`budgets.maxDepth`, ≤ 8). Inner cells appear in the receipt
  under `outer/inner` paths.
- A run ends `complete`, `failed` (first failure wins, recorded), or `stuck`
  (pending cells remain but none can resolve).

## Work ledger

Modeled units, not wall time: 100 per activation, plus the fn signature's
`cost`, plus 500 + context bytes + output bytes per effect. Bounded by
`budgets.maxWork`; `maxSteps` bounds activations, `maxAgentCalls` bounds
effects, `maxContextBytes`/`maxOutputBytes` bound each effect's I/O.

## Effects

An agent/classifier activation produces an effect request:

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
(`committed | skipped | failed`, outputs, `effectDigest`), the `effects` list
(`requestDigest`, raw `output`, `executor` id, optional usage), the bounded
`events` log, the work ledger, and `failure` detail. `digest` is over the
canonical receipt minus itself.

## Verification

`verify(receipt, manifest)` replays the run with a replay executor that serves
recorded effect outputs by request digest, then compares cells, effects, work,
and outcome. Any divergence is reported by name. The check is offline and
deterministic: receipts fix what the world returned.

## Reserved, not implemented

- Cycles and streaming re-activation (organisms are DAGs in v1).
- Inter-organism messaging during a run.
- Capabilities beyond the executor seam (`agent` cells cannot call back into
  the graph in v1).
- Durable multi-run state beyond the content-addressed store.
