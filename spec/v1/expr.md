# algal.expr.v1

The bounded pure expression contract. An expr program is manifest *data*:
canonical JSON that a contract-owned evaluator interprets under a fuel
meter — never host code, never an effect, never ambient authority. One
implementation (`crates/algal-expr`, Rust) serves every runtime: linked
natively into the kernel, compiled to `wasm32-unknown-unknown` for Bun.
Two targets of one evaluator, so identical semantics hold by construction.

## Envelope

```json
{ "contract": "algal.expr.v1", "program": ["add", 1, 2] }
```

`program` is any JSON value. A scalar (null, boolean, number, string)
self-evaluates. An array is an operation call: `arr[0]` must be a string
naming an op, `arr[1..]` are its arguments. There is no other syntax —
canonical JSON is the grammar, so a program is digestable and mergeable
like any other manifest data.

**Literal arrays must be quoted**: `["list", 1, 2]` evaluates each
argument and collects the results (`[1,2]`), while `[1,2]` alone is a
call to op `1` and fails. `["quote", [1,2]]` returns the array verbatim.
This is the language's single real footgun — always quote data-shaped
arrays.

## Evaluation model

Evaluation is a tree walk over the program. Every node either produces a
JSON value or fails with a typed error; there is no mutation, no
recursion (no op can reference a program), and no I/O. Termination is
enforced twice over: the grammar admits no unbounded loop, and the fuel
meter bounds total work including intermediate value sizes.

Two name scopes exist. The **env** scope holds the caller-supplied record
— for `expr` cells, the delivered input-port values. The **lexical**
scope holds binders introduced by `let`, `map`, `filter`, and `fold`.
`["get", "name", ...path]` reads a name: the first argument evaluates to
a name string, looked up lexical-first then env; subsequent arguments
evaluate to path steps (string keys into objects, nonnegative integer
indexes into arrays). An unbound name is `EXPR_PATH`; a missing key, an
out-of-range index, or a step into a non-container returns `null`
(the `pick.v1` miss precedent — paths degrade gracefully, names do not).

Static checking runs before evaluation: program bounds, op table, arity,
binder names, and that every *literal* `get` name resolves to a declared
name or an enclosing binder — a typo'd port fails admission, not the run.
Computed first arguments (`["get", ["sconcat", "a", "b"]]`) remain legal
and fail only at evaluation.

## Types

Strict, always. Numbers are the JSON number domain (IEEE-754 double);
`if`, `and`, `or`, `not`, and `filter` require booleans — no truthiness.
Cross-type `eq`/`neq` is `false`/`true`, never an error. There is no
coercion anywhere: a number is not a string is not a boolean.

## Operations

`min..max` is arity; `*` is variadic. Binders name literal strings.

| op | arity | semantics |
| --- | --- | --- |
| `add` `mul` | 1..* | numeric sum / product; non-finite result fails |
| `sub` `div` `mod` | 2 | numeric; `div` is float division (`7/2 → 3.5`); `mod` is truncated remainder (dividend's sign); zero divisor fails |
| `neg` | 1 | numeric negation |
| `lt` `lte` `gt` `gte` | 2 | two numbers (numeric order) or two strings (UTF-16 code-unit order — the canonical key order) |
| `eq` `neq` | 2 | structural equality: key-order-insensitive, `1 ≡ 1.0`, `-0 ≡ 0`; cross-type false |
| `and` `or` | 1..* | strict-boolean, short-circuit |
| `not` | 1 | strict-boolean negation |
| `if` | 3 | `[if, cond, then, else]`; cond must be boolean; only the taken branch evaluates |
| `let` | 3 | `[let, "name", value, body]` — binds `name` in body |
| `get` | 1..* | `[get, name-expr, ...path]` — see scopes; miss → `null`, unbound name → error |
| `list` | 0..* | collect evaluated arguments into an array |
| `len` | 1 | array length |
| `nth` | 2 | `[nth, list, index]` — out of range is an error |
| `concat` | 1..* | concatenate arrays |
| `map` | 3 | `[map, list, "name", body]` — body per element, binder `name` |
| `filter` | 3 | same shape; keeps elements whose body is `true` (strict bool) |
| `fold` | 5 | `[fold, list, init, "acc", "item", body]` — left fold |
| `contains` | 2 | `[contains, list, value]` — `eq` membership |
| `slen` | 1 | string length in UTF-16 code units (JS `.length`) |
| `sconcat` | 1..* | concatenate strings |
| `upper` `lower` `trim` | 1 | ASCII-only case and whitespace (` \t\n\r\v\f`) transforms — deliberately not Unicode-aware |
| `split` | 2 | `[split, string, sep]` — nonempty separator; literal split |
| `join` | 2 | `[join, list, sep]` — elements must be strings |
| `scontains` | 2 | substring test |
| `isText` `isNum` `isBool` `isList` `isMap` `isNull` | 1 | type predicates |
| `quote` | 1 | return the argument verbatim — data, not a call |

Division or modulo by zero is `EXPR_DIV_ZERO`; a non-finite arithmetic
result (overflow, `0/0`) is `EXPR_NUM`.

## Bounds and fuel

| bound | value |
| --- | --- |
| program canonical bytes | 16,384 |
| program nodes | 512 |
| program depth | 16 |
| env canonical bytes | 262,144 |
| value depth (env and result) | 32 |
| array length | 1,024 |
| object keys | 256 |
| string bytes | 65,536 |
| output canonical bytes | 65,536 |
| variable name length | 64 |
| fuel ceiling | 1,000,000 |

Fuel is a deterministic work meter: each evaluated node spends its op's
base cost (1 for control and predicates, 2 for most, 2 + argc for `get`)
plus the canonical byte length of values it materially produces
(`sconcat`/`join`/`split`/`upper`/`trim`/`concat` spend their output
size; `map`/`filter`/`fold`/`contains` spend 1 per element; `eq` spends
operand node counts). Same program + env ⇒ same value or
error *and* the same burn. `run` takes a caller fuel budget ≤ the
ceiling; exhaustion is `EXPR_FUEL`. In an organism, an `expr` cell
activation burns 100 + fuel work units and the activation budget is
`BOUNDS.maxExprFuel` (100,000).

## Errors

All failures are `{code, ...details}` where code is one of:

`EXPR_PARSE` (malformed program), `EXPR_OP` (unknown op — static),
`EXPR_ARITY`, `EXPR_TYPE`, `EXPR_PATH` (unbound name), `EXPR_ARG`,
`EXPR_NUM`, `EXPR_DIV_ZERO`, `EXPR_BOUNDS` (a bound was exceeded),
`EXPR_FUEL`. Check-time failures carry the same codes; nothing about an
error depends on the host.

## The `expr` cell

```json
{
  "id": "rate", "kind": "expr",
  "inputs": { "ticket": "json", "base": "json" },
  "expr": { "contract": "algal.expr.v1", "program": [ ... ] },
  "output": { "kind": "choice", "labels": ["high", "std"] }
}
```

Declares consumer `inputs` (each becomes an env name), the envelope, and
an output contract identical to agent cells bound to the single port
`out`. `output.onMiss` is rejected — programs return exact values.
Activation evaluates the program against the delivered inputs, commits
`out` under the output contract, burns `100 + fuel`, and records an
ordinary cell commit: no effect request, no executor, replayed by
re-evaluation under `verify`. Evaluation failures fail the cell as
`EXPR_FAILED` (`EXPR_FUEL` surfaces as `BUDGET_EXHAUSTED`); output-contract
violations fail `TYPE_MISMATCH` like any producer.
