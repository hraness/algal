# Morphogen as an agent tool

A Morphogen organism is a content-addressed, replayable subroutine. Pack it once and any agent—OpenAI, Anthropic, a coding agent, or a shell script—can call it as a typed tool and receive a compact, verifiable result.

## Why

- **Manifests are the contract.** Inputs, outputs, budgets, and failure paths are declared before the run starts.
- **Receipts are the evidence.** Every tool call produces a `receiptDigest` that can be replayed offline without the original provider.
- **Bundles are the transport.** `morphogen pack` collects the organism and every embedded sub-manifest into one closure.

## Pack

```sh
morphogen pack examples/triage.morphogen.json --out ./tools
```

This writes `./tools/<root-hex>.bundle.json`. The bundle is self-contained and digest-verified.

## Register the tool

Generate an OpenAI or Anthropic tool definition from the manifest's interface:

```sh
morphogen tool-def examples/triage.morphogen.json
morphogen tool-def examples/triage.morphogen.json --format anthropic
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

The agent invokes `morphogen call` with the bundled organism and the tool arguments. Pass `--args -` to read the arguments from stdin:

```sh
echo '{"ticket":{"text":"I cannot log in after the update"}}' | \
  morphogen call ./tools/<bundle>.bundle.json \
  --args - \
  --responses examples/triage.responses.json
```

Or write the args to a file:

```sh
echo '{"ticket":{"text":"I cannot log in after the update"}}' > /tmp/triage.args.json
morphogen call ./tools/<bundle>.bundle.json \
  --args /tmp/triage.args.json \
  --responses examples/triage.responses.json
```

The output is compact, so the agent does not need to parse the full receipt:

```json
{
  "ok": true,
  "outputs": {
    "route": { "out": "bug" },
    "result": { "value": "BUG: I cannot log in after the update" }
  },
  "receiptDigest": "sha256:...",
  "manifestDigest": "sha256:..."
}
```

## Wiring into a coding agent

A coding agent can use a Morphogen tool for any stable, repeatable, inspectable subproblem:

- `summarize-diff` — read a git diff and classify intent (refactor, fix, feature).
- `test-patch` — run the test command and return `pass`, `fail`, or `escalate`.
- `investigate-billing` — the `examples/invest/` organism with ledger lookup.
- `extract-api-changes` — parse source files and report breaking changes.

The outer agent keeps doing open-ended planning, user interaction, and retries. The organism owns the bounded, typed step and returns evidence the agent can trust or escalate.

## Failure handling

If the organism fails or gets stuck, `ok` is `false` and `error` contains the code and message. The agent can retry with different arguments, escalate to a frontier model, or ask the user. The full receipt is still written to the `--dir` store (default `.morphogen/`) so the failure can be inspected offline.
