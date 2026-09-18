# When Morphogen wins

Morphogen is a programming model, not a model model. It wins when the work
has structure that a prompt alone cannot capture — routing, typed inputs,
external evidence, budget enforcement, and the need to prove what happened.

## The short version

Use Morphogen when you want to:

- compare several ways to solve the same workflow on the same workload,
- keep the model from seeing data it should not see,
- make the model call tools and record what the tool returned,
- replay a run later and prove it produced the same result,
- evolve the workflow topology while keeping the holdout blind.

Do not use it as a drop-in replacement for every chat completion. A single
unstructured question with no routing, no tool, and no audit requirement is
cheaper as a single call.

## Where structure pays off

### 1. Tool-grounded decisions

If the right answer depends on data the model does not carry — a customer
record, a ledger, a calculation, a lookup — put a `tool` cell in the graph
before the judgment. The model receives only the tool's output, typed and
bounded; the receipt records the exact inputs and outputs; the run can be
replayed without repeating the live call.

### 2. Many narrow judgments over one context

A long prompt that asks for many things at once is expensive and fragile. A
Morphogen organism can split the work into many `classifier` cells, each with a
declared view, and route the outputs through `guard`ed edges. The graph decides
what the next cell sees, not the model.

### 3. Disagreement as an escalation trigger

Two cheap model lanes plus an `assert.v1` cell can detect when they disagree.
Only disagreement fires the frontier `classifier`. This is the structural fix for
"use cheap models most of the time and frontier models only when it matters."

### 4. Verification before promotion

A `foundry` or `foundry search` report evaluates organisms against train,
validation, and holdout cases. Every case receipt is content-addressed and can
be replayed offline. You can prove that the promoted organism came from the
measured evidence and never saw the holdout during search.

## Case study: billing-dispute investigation

`examples/invest/` is a six-case workload where each ticket needs a decision:
`refund`, `escalate`, or `monitor`. The correct decision depends on the
account's charge ledger — which the model cannot see unless a tool retrieves it.

The live Vercel AI Gateway run (Qwen 3.5 Flash and Claude Opus 5) shows where
structure beats a single larger call:

| system | passed | effect calls | input tokens | output tokens | Pareto |
|---|---|---|---|---|---|
| cheap-single (qwen3.5, no evidence) | 4/6 | 6 | 759 | 10,366 | — |
| frontier-single (claude-opus-5, no evidence) | 4/6 | 6 | 4,214 | 207 | yes |
| **organism-cheap (qwen3.5 + ledger tool)** | **6/6** | **12** | **1,210** | **5,364** | **yes** |
| organism-ensemble (qwen3.5 + qwen3.7 + tool) | 6/6 | 18 | 2,840 | 7,584 | — |

The Qwen Flash organism reaches **100% accuracy** because it retrieves the
ledger. Claude Opus 5 without the ledger reaches only **67%** — and fails the
same two evidence-only cases that Qwen fails when it also lacks the data. The
model brand is not the deciding factor; the structure is.

The Pareto frontier keeps both the organism (highest quality, still cheaper
input tokens than Opus) and the frontier single call (fewest round-trips), so
the choice between them is explicit.

## What the numbers mean

- **passed** is a strict canonical equality against the expected output. A
  classifier that emits the right label but with the wrong capitalization is a
  miss — Morphogen does not silently normalize outputs.
- **effect calls** counts every model call and tool call. The organism's extra
  calls are the tool lookups and the model decisions that use them.
- **tokens in/out** are what the provider reported; scripted runs report zero,
  which is why the Pareto set also considers effect-call count.
- **Pareto** means no other system is at least as good on all three axes
  (quality ↑, tokens ↓, calls ↓) and strictly better on one. It is a claim that
  survives `morphogen bench verify`.

## What to do next

1. Run `bun run cli suite` to see the bundled deterministic examples.
2. Run `bun run cli bench examples/invest/bench-invest.config.json \
   --tools examples/invest/bench-invest.tools.json \
   --dir .morphogen --out invest-report.json` to see the same workload
   replayed deterministically.
3. Replace the `gateway:` specs in `examples/invest/bench-invest-live.config.json`
   and run it with `AI_GATEWAY_API_KEY` or a linked Vercel project to reproduce
   the live result.
