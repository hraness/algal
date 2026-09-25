# Executors

Agent, classifier, and gate cells never reach a provider directly. Each
activation emits a `algal.effect.v1` request; the host's executor answers
it. ALGAL owns the schedule, the bounds, and the receipt — the executor
owns provider access and anything the provider does.

## The wire shape

With `--executor-cmd`, ALGAL runs the command per request: canonical
request JSON on stdin, the output JSON on stdout, nonzero exit or unparseable
stdout fails the cell.

```json
{
  "contract": "algal.effect.v1",
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
bun run cli run examples/gateway-smoke.algal.json \
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

Both the Bun and native CLIs speak to OpenAI-compatible Chat Completions endpoints
through `--model`, `--base-url`, and optional `--credential-env`. This supports
hosted services and local servers such as Ollama, LM Studio, or llama.cpp when
they expose the compatible API. Select a model already installed on your server:

```sh
# Local server; no API credential is sent unless explicitly configured.
bun run cli run examples/gateway-smoke.algal.json \
  --args examples/gateway-smoke.args.json \
  --base-url http://127.0.0.1:11434/v1 --model qwen3:8b --write
# The native equivalent starts with `algal run` and uses the same flags.
```

The endpoint is host-configured, never taken from a model response. HTTPS is
required except for explicit loopback; redirects, URL credentials, query strings,
and fragments are rejected, and upstream error bodies are not echoed. Set
`--credential-env MY_PROVIDER_KEY` when the endpoint requires authentication;
the adapter reads only that variable and never inherits Gateway credentials.
Do not combine `--base-url` with another default provider selector.

The default `--response-format json_schema` requests a strict `{ "value": ... }`
wrapper. Use `json_object` for a server without schema support, or `prompt` when
it accepts neither structured-output mode. All modes still require the same exact
wrapper and ALGAL validates the value against the cell's output contract.
Truncated completions fail; there is no automatic mode fallback. Responses and
calls are bounded, cancellation remains uncertain after dispatch, and provider
identity plus reported token usage are recorded for offline replay.

Library hosts use `openAICompatibleExecutor({ baseUrl, model, credentialEnv?,
responseFormat?, timeoutMs?, maxResponseBytes? })` from `@hraness/algal`.
`--recall local` selects deterministic trigram embeddings, not a local language
model; model generation uses the endpoint options above.

## Apple Intelligence

The native CLI's `algal run --apple` (and `algal civ --live --apple`) routes cells to Apple's
on-device Foundation Models framework through the shared `apple-foundation`
bridge (`hraness/apple-foundation`, pinned by tag). `algal doctor --apple`
checks availability; building the bridge is not proof the model is present.
The default sibling binary auto-builds via `swiftc` when missing or stale;
explicit `--apple-bridge`/`ALGAL_APPLE_BRIDGE` paths are used as-is.

The bridge translates a declared `output.schema` into a
`DynamicGenerationSchema` — strings, numbers, integers, booleans, arrays,
objects, enums, optional properties, within bounded depth and property counts —
so generation is schema-constrained rather than free-form. An unsupported schema
fails the call. The adapter never retries unguided, and cell retries cannot
resend the generation. It enforces context and output byte budgets, rejects `gate`
requests (approval belongs to a human/policy executor, not a model), and never
falls back to a cloud provider. One persistent bridge process serializes
generation per configured path — requests queue in-process instead of
respawning per effect — and inference produces ordinary, offline-verifiable
receipts. This adapter is native-only; the Bun runtime does not implicitly launch
the native CLI or select a cloud fallback.

## Coding agents (ACP and xcb)

For delegated coding work, ALGAL is an ACP client to a host-selected agent and
an ACP agent to a host editor; see `crates/algal/src/acp.rs`. ACP carries
sessions, prompts, permission requests, and updates — it is not authentication
and not a sandbox. A coding-agent executor is *mutating*: it is not memoized
and a timed-out or unsettled task remains uncertain, never silently
retried.

Account custody, provider qualification, and subscription failover belong to
xcb. The foreground adapter invokes `xcb --json --cwd ABS run`, passes a
bounded prompt on stdin, and requires a joined, settled terminal envelope. ALGAL
never copies credentials or reimplements account switching. The [durable repair
host](repair.md) binds that attempt to a clean source revision, retains its patch,
and validates it through independently admitted commands.

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

## Isolated command execution

`--executor-cmd` children normally inherit the host's whole environment and
working directory, and only the runner's wall-clock timeout bounds them.
`--executor-profile isolated` replaces that ambient posture with a declared
one for every command executor in the invocation (`--executor-cmd`, shell
commands in `--executors` maps, and `cmd:` bench specs):

- The child's environment is exactly the declared set: `PATH`, `LANG`, and
  `HOME` (the declared directory) by default, plus `--executor-env` entries.
  `NAME` inherits the host's value at call time; `NAME=value` fixes a
  declared value. Credentials belong on the `NAME` form: inherited values
  stay out of argv and out of the recorded identity, while fixed values are
  digested verbatim.
- The child starts in `--executor-cwd` (default `.`). This fixes where it
  starts; it is not a filesystem sandbox.
- A fixed wrapper script applies declared `ulimit` bounds before `exec`, so
  the OS enforces them rather than the runner racing them: `cpuSeconds`
  (RLIMIT_CPU), `fileSizeBlocks` (`ulimit -f` units; 512-byte POSIX blocks,
  1024 under bash-style shells), `openFiles`, `processes` (an RLIMIT_NPROC
  count charged per real uid), `addressSpaceKiB` (`ulimit -v`), `stackKiB`,
  and `noCore` (refuses core dumps). The default set is
  `cpuSeconds=60,noCore`; `--executor-limits` restates the whole set, and
  `none` clears it.

A limit the platform cannot apply is refused at admission instead of being
silently skipped: macOS cannot set an address-space bound at all, so
declaring `addressSpaceKiB` there fails the command line. The same honesty
applies inside the receipts. The recorded executor identity
(`configurationDigest`) covers the environment allowlist, the working
directory, every declared limit, each limit's enforcement status, and the
platform that status was determined for, so a weaker posture can never
share a stronger profile's identity.

Failure shapes match the plain command executor: a limit-killed child exits
by signal (`EFFECT_FAILED`, marked uncertain), a timeout records
`BUDGET_EXHAUSTED`, and a suspension exit still suspends. Verification
replays the recorded outcome offline without respawning the command.
Library hosts use `isolatedCommandExecutor(command, { isolation, ... })`
and `resolveIsolation` from `@hraness/algal`.

This profile is Bun-runtime only; a matching native backend is proposed,
not implemented. Running untrusted pure-compute tools inside a WASM
sandbox, the same boundary `algal.expr.v1` cells already use, is a related
proposal that is also not implemented. Tool-registry `cmd:` execs are not
covered by `--executor-profile`; they keep the ambient environment
described under "Tool registries".

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
import type { Tool, ToolRegistry } from "@hraness/algal";

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
