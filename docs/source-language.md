# Readable Algal source

The Bun CLI and SDK compile `.algal` source into the existing
`algal.organism.v1` manifest. Compilation makes no model calls, executes no
host code, and requires no provider credentials. Both runtimes execute the
compiled JSON. The native CLI does not parse source or fall back to Bun.

```sh
bun cli.ts compile examples/source/reply.algal --out reply.algal.json --source-map reply.map.json
bun cli.ts check examples/source/reply.algal
bun cli.ts run examples/source/reply.algal \
  --args examples/source/reply.args.json \
  --responses examples/source/reply.responses.json > reply.receipt.json
bun cli.ts verify reply.receipt.json examples/source/reply.algal
bun cli.ts diagram examples/source/reply.algal --format svg --out reply.svg
```

The committed replies are scripted fixtures demonstrating execution, not
measurements of model quality. Configure the normal executor options for live
work. A decision provider must serve `decide`; a generation provider must serve
`agent`. One provider need not support both. The normal executor admission
rules remain in force.

## A small, explicit first version

```algal
program welcome(name: text) -> text {
  budget { max_agent_calls: 0 }
  let message = "Hello, " + name
  return message
}
```

A file contains exactly one program. Programs have named `text` or `json`
inputs and a `text` or `json` result. A required budget declaration precedes
immutable `let` bindings and one `return`. Semicolons after bindings and return
are optional. Lists, records, choice declarations, and match arms use commas,
with optional trailing commas. Strings use JSON escaping. `//` and `/* */`
comments are supported.

Program names use lowercase letters, digits, and underscores. Binding and
parameter identifiers may contain ASCII letters, digits, and underscores and
cannot begin with a digit. Reserved keywords and prototype-related names are
rejected. Parameter names become lowercase kebab-case interface/port names;
colliding normalized names are rejected. For example, `order_data` is supplied
as `{"input":{"order-data":{...}}}`. The emitted manifest's interface is the
authoritative argument mapping. A parameterless program has no input cell.

### Pure expressions

Supported expressions include literals, records, lists, field selection,
parentheses, arithmetic (`+ - * / %`), Boolean logic (`! && ||`), comparisons,
and `if … { … } else { … }`. `+` concatenates two statically known text
values or adds numeric values. There is no implicit coercion or truthiness.
JSON fields have dynamic types; strict expression operators check them during
execution. A missing JSON field returns null under the existing expression
contract; it does not imply a successful lookup.

```algal
program quote(order: json) -> json {
  budget { max_agent_calls: 0 }
  let subtotal = order.quantity * order.unit_price
  let shipping = if subtotal >= 50 { 0 } else { 5 }
  return { subtotal: subtotal, shipping: shipping, total: subtotal + shipping }
}
```

Pure expressions lower to fuel-bounded `algal.expr.v1` cells. There are no
assignments, ambient variable reads, arbitrary function calls, host-language
evaluation, unbounded recursion, or implicit network operations.

### Decisions and exhaustive matching

```algal
let intent = decide "What does this email need?" using email
  as choice {
    help: "Help with a problem",
    sales: "Information before buying",
    other: "Anything else"
  }

let task = match intent.value {
  help => "Draft a helpful support reply.",
  sales => "Draft a concise sales reply.",
  other => "Draft a clarifying question."
}
```

`decide` creates one typed-choice effect with the declared context. The
source-level decision exposes `value`, `confidence`, `probabilities`, and
`probability(label)`. Its backing port is JSON; it is not a new core port type.
A generated pure adapter checks the selected label and the numeric range of
confidence and every declared label's probability. Invalid data fails in the
adapter before a dependent branch or generation can run. The adapter retains
declared-label probabilities; it does not assert calibration or establish
that they describe reality. It does not impose an additional sum-to-one rule.

`match` requires a closed choice and exactly one arm per declared label. The
selection itself makes no model call. Pure `if` and `match` expressions stay
inside one pure cell; they can select an instruction for a later effect.

```algal
let task = if intent.probability(intent.value) < 0.80 {
  "Draft a question that clarifies what the sender needs."
} else {
  "Draft a helpful reply."
}
return generate task using email
```

The example threshold is policy, not a correctness guarantee. Selected-label
probability and provider confidence are separate values. An `other` category
is also distinct from uncertainty. See [uncertain.algal](../examples/source/uncertain.algal)
and its scripted fixture for a complete example.

### Run only the selected branch

`if` and `match` arms can also contain `generate`, `decide`, or another branch.
Each arm is one expression. Conditions, match discriminants, and effect
operands remain pure.

```algal
return match intent.value {
  help => generate "Draft a helpful support reply." using email,
  sales => generate "Draft a concise sales reply." using email,
  other => "Needs a human review."
}
```

The [complete route program](../examples/source/route.algal) uses at most two
executor attempts: one decision, then one generation on the help or sales
path. The other path returns its fixed text after the decision alone.

```sh
bun cli.ts run examples/source/route.algal \
  --args examples/source/route.args.json \
  --responses examples/source/route.responses.help.json > route.receipt.json
bun cli.ts diagram examples/source/route.algal \
  --receipt route.receipt.json --format svg --out route.svg
```

Effectful branches lower to ordinary guarded dependencies and a checked
single-result merge. Every cell in an inactive arm is skipped, including pure
instruction/context calculations, so inactive arithmetic cannot fail the
selected path. Compiler control inputs never enter a model's declared view.
Both arms must agree on text versus JSON. Decision values retain their closed
choice refinement across an effectful merge only when every arm validates the
same label set. All arms remain visible in the manifest and execution receipt.

Effects inside arbitrary arithmetic, records, conditions, or another effect's
context are rejected. Put them in a whole binding, return, or branch arm.

### Generation and context

`generate instruction using context` returns text. The instruction must be
text, and both operands must be pure values. It lowers to an agent cell with
only `instruction` and `context` inputs in its view. The versioned prompt is:

> Algal source generation envelope v1. Follow the instruction in inputs.instruction. Use only inputs.context as task context. Return the requested text.

This envelope is part of the compiled artifact. Changing it changes program
identity. The model receives no other local binding or capability implicitly.
Normal host admission and provider behavior still apply; a prompt is not an
OS sandbox. `decide` and `generate` occupy a whole binding, return expression,
or branch arm. All declared effects remain in the graph, including unused
bindings and inactive arms. Inactive arms are skipped at execution.

## Budgets and compiler bounds

`max_agent_calls` must be explicitly declared, including zero for pure work.
The compiler adds the effect bounds of bindings and return, taking the maximum
across mutually exclusive arms. It rejects a program whose resulting bound
exceeds the budget. This is conservative: it does not assume that conditions
in separate branches are correlated.
The runtime enforces its normal limits; exactly using the budget is allowed,
while admitting another attempt fails with `BUDGET_EXHAUSTED`.

| Source budget | Manifest field | Default |
| --- | --- | ---: |
| `max_agent_calls` | `maxAgentCalls` | Required |
| `max_steps` | `maxSteps` | 256 |
| `max_work` | `maxWork` | 1,000,000 |
| `max_context_bytes` | `maxContextBytes` | 65,536 |
| `max_output_bytes` | `maxOutputBytes` | 65,536 |
| `max_depth` | `maxDepth` | 4 |

The core agent-call counter includes executor attempts such as gates and
recall, not just inference, and excludes the separate tool path. This front
end currently emits decisions and generation with the ordinary one-attempt
default. It adds no automatic retries.

Source limits: 65,536 UTF-8 bytes, 8,192 tokens, 1,024 expression nodes,
16 levels of source nesting, 24 bindings, 16 parameters, 40-character names,
16 choice labels, and 64 entries per collection. The lowered program must
also satisfy the existing manifest and expression bounds. A deeply nested
expression may reach a core bound before a source maximum. Errors identify a
source line and column; failures during final manifest validation reference
the enclosing program. Each pure activation uses the existing 100,000-fuel
limit. The compiler/profile constants expose the exact current defaults.

## Identity, mapping, and ordering

```ts
import { compileSource, createProgramDiagram, renderSvg } from "@hraness/algal";

const { manifest, sourceMap } = compileSource(source);
const svg = renderSvg(createProgramDiagram(manifest, { source }));
```

The compiler's version is `1.1.0`; its profile is `algal.source.profile.v1`.
Source maps contain source and manifest digests, compiler/profile identity,
source spans, and bounded source annotations for each generated cell.
Annotations preserve binding names and describe parsed operations, decisions,
and branch arms. Locations and presentation metadata
remain outside the manifest. Formatting/comments change the source digest
but not the compiled manifest digest. Binding renames and changes to compiler
lowering can change identity. Source-map offsets count JavaScript UTF-16 code
units; line/column positions are one-based.

Bindings create data dependencies. The graph does not imply a concurrent
wall-clock schedule, and textual adjacency is not a durable ordering edge.
This initial language has no external write/tool syntax; future effect
sequencing must lower to explicit dependencies. Use full manifests for such
work today.

Compilation parses and checks the source and resulting manifest. `compile`
also runs graph admission. SDK callers should use `compileOrganism`, `check`,
or ordinary execution admission before running the result. No source map is
necessary to run or verify the emitted JSON.

Passing original source to the diagram API recompiles it and requires the
executable digest to match before using source annotations. For compiled JSON,
the equivalent CLI option is `diagram manifest.json --source program.algal`.
Persisted source-map labels alone are not trusted as evidence of source meaning.

## Scope

Subprogram calls, bounded `repeat`/`each`, tools, capabilities, durable waits,
and program evolution are supported by the full manifest runtime but do not
yet have source syntax. There is no general decompiler, visual editor, or
executable statechart frontend. Existing manifests and receipts are unchanged.
The source language can grow over the same contract as its next constructs
earn a precise lowering and cross-runtime evidence.
