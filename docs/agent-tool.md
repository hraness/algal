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

The `--format anthropic` form puts the same name and description beside an
`input_schema` object. The Bun reference CLI (`bun cli.ts tool-def`) also adds
a `"$schema"` line to the schema; the native release omits it.

Register that definition with the agent. When the agent decides to call the tool, it will be asked for a JSON object like `{"ticket": "..."}`.

### Check the definition before you register it

The Claude API defines a client tool with a `name` that must match
`^[a-zA-Z0-9_-]{1,128}$`, a `description`, and an `input_schema` that is a
JSON Schema object ([define tools](https://platform.claude.com/docs/en/agents-and-tools/tool-use/define-tools),
checked 4 October 2026). This `jq` check prints `true` when the generated
definition has all three:

```sh
algal tool-def examples/triage.algal.json --format anthropic \
  | jq -e '(.name | test("^[a-zA-Z0-9_-]{1,128}$")) and (.description | type == "string") and (.input_schema.type == "object")'
```

The check runs locally and sends nothing to an API.

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

- `summarize-diff`: read a git diff and classify intent (refactor, fix, feature).
- `test-patch`: run the test command and return `pass`, `fail`, or `escalate`.
- `investigate-billing`: the `examples/invest/` organism with ledger lookup.
- `extract-api-changes`: parse source files and report breaking changes.

The outer agent keeps doing open-ended planning, user interaction, and retries. The organism runs the typed step within its declared budgets and returns evidence the agent can trust or escalate.

## Call it from Claude Code or Codex

Claude Code and Codex run `algal` through their shell tools, so the program
needs no tool registration there. Put the command and the argument names from
`tool-def` in the project's instructions (`CLAUDE.md` for Claude Code,
`AGENTS.md` for Codex), for example:

```text
To triage a support ticket, run
echo '{"ticket":"<ticket text>"}' | algal call ./tools/<bundle>.bundle.json --interface --args - --responses examples/triage.responses.json
and report outputs.summary and receiptDigest.
```

The scripted `--responses` file keeps this example offline and repeatable. A
program that asks a model names its executor instead, such as
`--gateway-model <provider/model>`.

**Claude Code.** To run the command without a prompt, add an allow rule to
`.claude/settings.json`:

```json
{
  "permissions": {
    "allow": ["Bash(algal call *)"]
  }
}
```

The rule matches commands that start with `algal call`. Claude Code treats
`echo` as read-only, so the piped form above also runs without a prompt. The
rule syntax follows [Claude Code permissions](https://code.claude.com/docs/en/permissions),
checked 4 October 2026.

**Codex.** Codex runs the command in its sandbox. With workspace write access,
such as the `:workspace` permission profile, `algal call` writes its receipt
under `.algal/` in the project, and the `on-request` approval policy lets it
run without asking. With read-only access it fails with `IO_FAILED`, because it
cannot write the store. Codex keeps network access off for commands by default,
so an executor that reaches a model over the network, such as `--gateway-model`,
needs network access or your approval. The sandbox and approval rules follow
[Codex permissions](https://developers.openai.com/codex/permissions) and
[agent approvals and security](https://developers.openai.com/codex/agent-approvals-security),
checked 4 October 2026.

These results were checked on 4 October 2026 with the native `v0.2.0-vm.14`
release on macOS: the scripted call returned `ok: true`, and the same call
under `codex sandbox` (Codex CLI 0.160.0) succeeded with the `:workspace`
profile and failed with `IO_FAILED` under `:read-only`. Claude Code was not
run, and no agent session made the call.

## Verify the result later

`call` stores the receipt in the `--dir` store (default `.algal/`) as
`runs/<receipt-digest-hex>.json`, named by the hex part of `receiptDigest`.
Replay it offline with the recorded effects fixed:

```sh
algal verify .algal/runs/<receipt-digest-hex>.json
```

A matching replay prints `"ok": true` and an empty `mismatches` list. That
shows the recorded run is internally consistent; it does not check whether the
answer is right.

## Failure handling

If the organism fails or gets stuck, `ok` is `false` and `error` contains the code and message. The agent can retry with different arguments, escalate to a frontier model, or ask the user. The full receipt is still written to the `--dir` store (default `.algal/`) so the failure can be inspected offline.
