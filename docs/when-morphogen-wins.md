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

The live Vercel AI Gateway run is priced from aicharts.io / AI//COST and
OpenRouter/Alibaba rate cards (USD per 1M tokens):

|| system | passed | effect calls | cost | input tokens | output tokens | Pareto |
|---|---|---:|---:|---:|---:|---|
|| cheap-single (qwen3.5, no evidence) | 4/6 | 6 | $0.00371 | 759 | 14,087 | yes |
|| frontier-single (claude-opus-5, no evidence) | 4/6 | 6 | $0.02625 | 4,214 | 207 | — |
|| **organism-cheap (qwen3.5 + ledger tool)** | **6/6** | **12** | **$0.00131** | **1,210** | **4,716** | **yes** |
|| organism-ensemble (qwen3.5 + qwen3.7 + tool) | 6/6 | 19 | $0.00676 | 3,692 | 6,776 | — |

Price card:

```json
{
  "alibaba/qwen3.5-flash": { "input": 0.065, "output": 0.26 },
  "alibaba/qwen3.7-flash": { "input": 0.03, "output": 0.13 },
  "anthropic/claude-opus-5": { "input": 5.00, "output": 25.00 }
}
```

The Qwen Flash organism reaches **100% accuracy** for **$0.00131** because it
retrieves the ledger. Claude Opus 5 without the ledger reaches only **67%** for
**$0.02625** — 20× more expensive and still wrong on the same evidence-only
cases. The single-Qwen baseline is also **67%**, but it costs **2.8× as much**
as the organism and gets the same cases wrong. The Pareto set keeps the
organism (best quality and best cost) and the single Qwen (fewest round-trips);
the frontier model is not on the efficient frontier at all.

## What the numbers mean

- **passed** is a strict canonical equality against the expected output. A
  classifier that emits the right label but with the wrong capitalization is a
  miss — Morphogen does not silently normalize outputs.
- **effect calls** counts every model call and tool call. The organism's extra
  calls are the tool lookups and the model decisions that use them.
- **tokens in/out** are what the provider reported; scripted runs report zero,
  which is why the Pareto set also considers effect-call count.
- **cost** is `tokensIn * inputPrice + tokensOut * outputPrice` per attribution
  key, in USD. It is optional and comes from a `prices` map in the bench
  config. Because it is derived from reported tokens, it is also checked during
  `morphogen bench verify` when the price card is in the report.
- **Pareto** means no other system is at least as good on all three axes
  (quality ↑, cost signal ↓, effect calls ↓) and strictly better on one. It is
  a claim that survives `morphogen bench verify`.

## What to do next

1. Run `bun run cli suite` to see the bundled deterministic examples.
2. Run `bun run cli bench examples/invest/bench-invest.config.json \
   --tools examples/invest/bench-invest.tools.json \
   --dir .morphogen --out invest-report.json` to see the same workload
   replayed deterministically.
3. Add the `prices` map to `examples/invest/bench-invest-priced.config.json`
   (or use `examples/invest/bench-invest-live.config.json` for the live
   gateway version) to reproduce the cost Pareto.
