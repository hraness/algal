# Executors

Agent, classifier, and gate cells never reach a provider directly. Each
activation emits a `morphogen.effect.v1` request; the host's executor answers
it. ALGAL owns the schedule, the bounds, and the receipt — the executor
owns provider access and anything the provider does.

## The wire shape

With `--executor-cmd`, ALGAL runs the command per request: canonical
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

ALGAL runs the named fn, appends the call and its result to
`context.toolLog`, and re-issues the request with `context.turn` incremented.
The loop ends when the response binds to `output` or `budget.maxTurns` is
exhausted. A `{tool,inputs}` naming a ref outside `tools` is ordinary output,
not a call.

## Vercel AI Gateway

`--gateway-model <provider/model>` runs cells through Vercel AI Gateway's
structured Chat Completions API. Authentication comes only from
`AI_GATEWAY_API_KEY` or the short-lived `VERCEL_OIDC_TOKEN` supplied by a linked
Vercel project. The credential never enters a request, receipt, digest, or log.

```sh
bun run cli run examples/gateway-smoke.morphogen.json \
  --args examples/gateway-smoke.args.json \
  --gateway-model alibaba/qwen3.5-flash --write
```

The adapter fixes the Gateway origin, rejects redirects, bounds response bytes,
requests a strict `{ "value": ... }` JSON object, includes the declared output
contract in model-visible context, and returns the bound value to ALGAL.
Provider model identity and input/output token usage are captured after the call
on the ordinary effect receipt, so foundry reports can compare real usage and
offline replay preserves it exactly.

Two distinct failures to expect: `401` means the credential is stale — mint a
fresh OIDC token with `vercel env pull` on the linked project, or create a key
with `vercel ai-gateway api-keys create`. `402` means authentication succeeded
but the team has a zero credit balance — the gateway requires positive credits
even for BYOK, and topping up is a dashboard action.

## OpenAI-compatible endpoints

The native CLI also speaks to any OpenAI-compatible Chat Completions endpoint
through `--openai-model`, `--openai-base-url`, and a credential environment
variable — OpenRouter and a self-hosted server are presets of the same
adapter, not new auth. The endpoint is host-configured, never taken from a
model response; HTTPS is required except for explicit loopback, redirects and
URL credentials are rejected, and upstream error bodies are not echoed.

## Apple Intelligence

`algal run --apple` (and `algal civ --live --apple`) routes cells to Apple's
on-device Foundation Models framework through the Swift bridge in
`native/apple/`. `algal doctor --apple` checks availability; building the
bridge is not proof the model is present.

The bridge translates a declared `output.schema` into a
`DynamicGenerationSchema` — strings, numbers, integers, booleans, arrays,
objects, enums, optional properties, within bounded depth and property counts —
so generation is schema-constrained rather than free-form. A schema it cannot
translate falls back to bounded free-text generation and the same contract
validation. It enforces context and output byte budgets, rejects `gate`
requests (approval belongs to a human/policy executor, not a model), and never
falls back to a cloud provider. Inference runs on-device and produces ordinary,
offline-verifiable receipts.

## Coding agents (ACP and xcb)

For delegated coding work, ALGAL is an ACP client to a host-selected agent and
an ACP agent to a host editor; see `crates/algal/src/acp.rs`. ACP carries
sessions, prompts, permission requests, and updates — it is not authentication
and not a sandbox. A coding-agent executor is *mutating*: it is not memoized
and a timed-out or unsettled task is a recorded failure, never silently
retried.

Account custody, provider qualification, and subscription failover belong to
xcb. `xcb algal` invokes a host-selected ALGAL bundle with bounded JSON input
and returns receipt references; ALGAL never copies credentials or reimplements
account switching.

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
- Expect cancellation: a cell's `budget.maxEffectMs` bounds each call. The
  runner races the call to the bound and kills an over-long commandExecutor
  process — a timeout is a recorded `BUDGET_EXHAUSTED` effect error, so
  `retry` and `on:"fail"` handle it like any other failure.
- For replay (`verify`), ALGAL serves recorded outputs — and recorded
  errors — by request digest itself, in record order; executors are not
  involved.
- For memoization (`run --cache-effects`), `cachedExecutor` consults the
  store's effect index before calling the wrapped executor: an identical
  request digest serves the earlier recorded success without executing.
  Only successes are memoized — a recorded error may be transient — and
  the first record for a digest wins. A hit is recorded on the new run's
  receipt as `cached: true`, so reuse stays auditable.

## Tool registries

`tool` cells and agent-requested tools both resolve against the host's
`ToolRegistry` — the same typed, receipted boundary, supplied by the host and
never declared inside a manifest.

For the CLI, `--tools <file>` loads a registry:

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

`exec` is either `scripted:<data.json>` — a canonical-inputs → outputs map —
or `cmd:<shell>` — a shell command that receives `{ inputs, requestDigest,
idempotencyKey }` on stdin and must print a JSON object of output ports on
stdout. The signature's `maxOutputBytes` is enforced on the command's stdout;
timeouts are enforced by a 30-second hard bound; nonzero exit is a structured
failure. This keeps external IO outside the manifest while still recording it
per-activation.

Programmatically, a `ToolRegistry` is a `Map<string, { signature, tool }>`:

```ts
import type { Tool, ToolRegistry } from "morphogen";

const tools: ToolRegistry = new Map([[
  "ledger.charges.v1",
  {
    signature: {
      inputs: { account: { type: "text" } },
      outputs: { charges: { type: "json" } },
      effect: "read",
      cost: 50,
      maxOutputBytes: 8192,
    },
    tool: async (inputs) => ({ charges: await myLedger.lookup(inputs.account) }),
  },
]]);
```

The tool receives the canonical inputs and a `ToolContext` carrying the
`requestDigest`, `idempotencyKey`, and an optional `AbortSignal`. Pass it to
`runOrganism` or `runBenchmark` through the `tools` option.
