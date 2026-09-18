# Why ALGAL is a new primitive

Most existing abstractions fall into one of two buckets:

1. **Deterministic programs** — code, configs, workflows, smart contracts.
2. **Open-ended agents** — LLM agents, chatbots, copilots.

ALGAL is a third thing: a **bounded, typed, content-addressed probabilistic program**.

## What a ALGAL organism is

An organism is not a script. It is a finite, strongly-typed graph where:

- Every cell has declared input and output ports.
- Every edge is a typed wire with optional guards.
- Most cells are deterministic host functions.
- Some cells are bounded agent calls with a prompt, a context view, an output contract, and a budget.
- Model output is data. It is bound to a port before it re-enters the graph.
- The whole graph is a value. It hashes, transports, and verifies.
- A run emits a content-addressed receipt that can be replayed offline without the original provider.
- Failure is explicit and routable, not an exception the caller discovers.

That combination is what makes it a new primitive, not just a nicer prompt chain.

## How it differs from neighboring abstractions

| Abstraction | What it does | Why ALGAL is different |
|---|---|---|
| **Prompt engineering** | Hand-tunes a string for a model | A manifest is a graph, not a prompt. The model only sees a bounded view of the graph. |
| **LLM agent loop (ReAct, etc.)** | Open-ended reasoning with tools | The organism loop is bounded, typed, and hashable. It can be *inside* an agent, not a replacement for it. |
| **Workflow / DAG engine** | Orchestrates deterministic steps | Effects are first-class, receipted, and replayable. Model calls are cells, not opaque black boxes. |
| **Probabilistic programming** | Samples and conditions | No sampler is in the language. Non-determinism is isolated to the executor. The graph itself is deterministic given receipts. |
| **Smart contract / zkVM** | Verifies computation by proof | ALGAL does not prove correctness. It proves *what was run and what was returned*, with everything content-addressed and replayable. |
| **Function as a Service** | Runs code on demand | A ALGAL organism is content-addressed, provider-agnostic, and emits a receipt. It is a verifiable function, not just a callable endpoint. |
| **Cellular automata** | Repeated local rules on a grid | ALGAL is a typed, heterogeneous, DAG-executed graph, not a grid. But it keeps the CA spirit: local, bounded, explicit state transitions. |

## What the primitive enables

### 1. Programs as values

A manifest is a pure JSON document. Its canonical digest is its identity. You can:

- Hash it.
- Ship it.
- Cache it.
- Compose it into another organism.
- Generate candidates in a foundry and select by Pareto.
- Register it as an agent tool.

### 2. Receipts as evidence

Every run produces a receipt that records every cell, every edge, every effect request, and every effect response. The receipt is also content-addressed. You can:

- Replay it offline and get the same digest.
- Diff two receipts to find the exact cell where they diverge.
- Transport it to a third party who can verify it without trusting you or the original provider.

### 3. Boundaries by construction

Budgets and types are in the manifest, not the runtime's head. The runtime enforces:

- maxSteps, maxAgentCalls, maxWork, maxDepth
- maxContextBytes, maxOutputBytes
- declared tool lists and turn budgets
- exact output contracts
- no ambient authority for agent cells

This makes it safe to execute organisms you did not write.

### 4. Generation and selection

Because an organism is a value, a program can generate, evaluate, and select organisms:

- `algal foundry` breeds candidates on a train set and promotes the Pareto winner.
- `algal search` evolves populations over generations with lineage tracking.
- The promoted organism is itself a value that can be packed, shipped, and called.

## Where it is not the right tool

ALGAL is not for open-ended conversation, exploratory research, or tasks where the structure itself is unknown. It is for subproblems where the shape of the work can be declared: classification, routing, extraction, verification, multi-step forms, code review gates, and tool-grounded investigations.

## Why the name "organism"

An organism is alive in a very bounded sense: it ingests inputs, performs work through typed cells, emits a waste-free receipt, and can reproduce (generate and evolve variants). But it has no open-ended autonomy, no persistent self-interest, and no ambient access to the world. It is a value that behaves, not an agent that wants.
