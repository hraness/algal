# ALGAL as an agent tool

An ALGAL organism is a content-addressed, replayable subroutine. Pack it once, and any caller can use it as a typed tool: an OpenAI or Anthropic model, a coding agent, or a shell script. The caller gets back a compact result it can verify.

## Why

- **Manifests are the contract.** Inputs, outputs, budgets, and failure paths are declared before the run starts.
- **Receipts are the evidence.** Every tool call produces a `receiptDigest` that can be replayed offline without the original provider.
- **Bundles are the transport.** `algal pack` collects the organism and every embedded sub-manifest into one closure.

## Pack

```sh
algal pack examples/triage.algal.json --out ./tools
```

This writes `./tools/<root-hex>.bundle.json`. The bundle is self-contained and digest-verified.

## Register the tool

Generate an OpenAI or Anthropic tool definition from the manifest's interface:

```sh
algal tool-def examples/triage.algal.json
algal tool-def examples/triage.algal.json --format anthropic
```

OpenAI output:

```json
{
  "type": "function",
  "function": {
    "name": "triage",
    "description": "A classifier cell routes a support ticket; the structure carries the routing decision.",
    "parameters": {
      "$schema": "http://json-schema.org/draft-07/schema#",
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "ticket": { "type": "string" }
      },
      "required": ["ticket"]
    }
  }
}
```

Register that definition with the agent. When the agent decides to call the tool, it will be asked for a JSON object like `{"ticket": "..."}`.

## Call

The agent invokes `algal call --interface` with the bundled organism and the
named arguments described by `tool-def`. This mode requires a declared
interface, rejects missing or undeclared arguments, and returns only its named
outputs. Pass `--args -` to read the arguments from stdin:

```sh
echo '{"ticket":"I cannot log in after the update"}' | \
  algal call ./tools/<bundle>.bundle.json --interface \
  --args - \
  --responses examples/triage.responses.json
```

Or write the args to a file:

```sh
echo '{"ticket":"I cannot log in after the update"}' > /tmp/triage.args.json
algal call ./tools/<bundle>.bundle.json --interface \
  --args /tmp/triage.args.json \
  --responses examples/triage.responses.json
```

The output is compact, so the agent does not need to parse the full receipt:

```json
{
  "ok": true,
  "outputs": {
    "summary": "BUG: I cannot log in after the update"
  },
  "receiptDigest": "sha256:...",
  "manifestDigest": "sha256:..."
}
```

Without `--interface`, `call` keeps the same cell-keyed argument shape as `run`
(for example, `{"ticket":{"text":"..."}}`) and returns every committed cell
output. The mode is explicit; JSON argument shapes are never guessed.

## Wiring into a coding agent

A coding agent can use an ALGAL tool for any stable, repeatable, inspectable subproblem:

- `summarize-diff` — read a git diff and classify intent (refactor, fix, feature).
- `test-patch` — run the test command and return `pass`, `fail`, or `escalate`.
- `investigate-billing` — the `examples/invest/` organism with ledger lookup.
- `extract-api-changes` — parse source files and report breaking changes.

The outer agent keeps doing open-ended planning, user interaction, and retries. The organism owns the bounded, typed step and returns evidence the agent can trust or escalate.

## Failure handling

If the organism fails or gets stuck, `ok` is `false` and `error` contains the code and message. The agent can retry with different arguments, escalate to a frontier model, or ask the user. The full receipt is still written to the `--dir` store (default `.algal/`) so the failure can be inspected offline.
