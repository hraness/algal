# Executors

Agent, classifier, and gate cells never reach a provider directly. Each
activation emits a `morphogen.effect.v1` request; the host's executor answers
it. Morphogen owns the schedule, the bounds, and the receipt — the executor
owns provider access and anything the provider does.

## The wire shape

With `--executor-cmd`, Morphogen runs the command per request: canonical
request JSON on stdin, the output JSON on stdout, nonzero exit or unparseable
stdout fails the cell.

```json
{
  "contract": "morphogen.effect.v1",
  "cellId": "plan",
  "kind": "agent",
  "prompt": "Draft a short implementation plan…",
  "context": {
    "inputs": { "brief": "…" },
    "cells": { "prep": { "status": "committed", "outputs": { "value": "…" } } },
    "turn": 0
  },
  "output": { "kind": "json", "schema": { "type": "object" } },
  "budget": { "maxContextBytes": 65536, "maxOutputBytes": 4096 },
  "route": { "preset": "plan-standard" }
}
```

`kind` is `agent`, `classifier`, or `gate`. A gate is an approval point —
route those requests to a human or a policy check, not a model. `route` is a
hint carried through verbatim; honoring it is the executor's business.

`context.cells` appears only when the cell's `view.cells` declares ancestor
cells; each entry is the ancestor's committed record (`status`, `outputs?`)
or `null`. A sliced entry `{"cell":"prep","ports":["value"]}` sends only the
named outputs. When the view also declares `graph: true`, the context
carries `graph.edges` — the wiring among the named cells and into this one,
as `{from, to, guard?}` with `cell.port` endpoints. Both are part of the
bounded, canonical request — the same bytes the digest signs.

The response binds to `output` before it can feed edges:

- `{"kind":"text"}` → stdout must be a JSON string
- `{"kind":"json","schema":{…}}` → a JSON object satisfying the bounded schema
- `{"kind":"choice","labels":[…],"onMiss"?}` → a declared label, else `onMiss`,
  else the cell fails

## Tool calls

When a cell declares `tools`, the executor may answer with the reserved shape:

```json
{ "tool": "pick.v1", "inputs": { "record": {…}, "field": "author" } }
```

Morphogen runs the named fn, appends the call and its result to
`context.toolLog`, and re-issues the request with `context.turn` incremented.
The loop ends when the response binds to `output` or `budget.maxTurns` is
exhausted. A `{tool,inputs}` naming a ref outside `tools` is ordinary output,
not a call.

## Multiple executors

`--executors execs.json` maps names to commands:

```json
{
  "plan-standard": "claude -p --output-format json --model claude-opus-4-1 < /dev/stdin…",
  "classify-small": "claude -p --model claude-haiku-4-5 …",
  "human": "./scripts/ask-the-operator.sh"
}
```

A cell's `route.provider` or `route.preset` selects by name (a `provider:` or
`preset:` prefix on the id also matches). The first executor in the list —
`--responses`, then `--executor-cmd`, then `--executors` entries — is the
default when no route matches.

## Rules of thumb

- Keep secrets in the command's environment or config, never in manifests.
- The request is the whole job: prompt, view-selected context, output
  contract, budgets. Do not read other files to answer it.
- Print only the output value on stdout — logs go to stderr.
- Respect `budget.maxOutputBytes`; oversized output fails the cell.
- Errors count: a thrown effect is recorded on the receipt as
  `{requestDigest, error: {code, message}}` so replay reproduces the same
  failure — and an `on:"fail"` edge in the manifest can route that record
  to a recovery cell.
- Expect re-issue under `retry`: a cell that declares `retry.attempts` sends
  the *same* request — same digest — again after a failure, up to the bound.
  Each attempt is a separate call, separately metered, separately recorded.
- For replay (`verify`), Morphogen serves recorded outputs — and recorded
  errors — by request digest itself, in record order; executors are not
  involved.
