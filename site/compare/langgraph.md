---
title: ALGAL vs LangGraph
description: In LangGraph the agent is Python or TypeScript code. In ALGAL it is a typed manifest that can be hashed, diffed, and generated, with runs you can replay offline.
order: 1
---

# ALGAL vs LangGraph

LangGraph is a framework for orchestrating agents in Python or TypeScript. ALGAL is a programming language and a virtual machine. Both handle stateful graphs, human review, and long-running work, but in LangGraph the agent is code in your process, and in ALGAL the program is data that a VM runs. Most of the differences on this page follow from that one choice.

## Code in one, data in the other

In LangGraph, nodes are functions in your process, state flows through channels you wire up, and a checkpointer saves progress.

In ALGAL, the program is a typed, content-addressed manifest (`algal.organism.v1`). A host can inspect, hash, diff, move, or generate it without running any of its code, because it contains no host code. The VM executes it; the manifest never executes anything by itself.

## How they differ

| | LangGraph | ALGAL |
|---|---|---|
| The program is | host-language code (functions, decorators) | typed data: a manifest any runtime can read |
| Model calls | callbacks you write | declared, typed effect cells with budgets |
| Durable waits | `interrupt()`, a checkpointer, and a runner that resumes | suspension defined by the manifest contract; a new process, even the other runtime, verifies and continues |
| Execution record | LangSmith traces, for observability | content-addressed receipts that replay offline without a store or credentials |
| Permissions | whatever your code does | capabilities the host grants; cells cannot create their own |
| Programs producing programs | your code writes code | `spawn` emits a manifest as data; the foundry measures candidates; the host selects |

## Checkpoints and durable execution

LangGraph's documentation lists durable execution among its core features: an agent persists through failures and resumes where it left off. Temporal's [LangGraph plugin announcement](https://temporal.io/blog/temporal-langgraph-plugin-durable-execution) disagrees with that framing. In Temporal's words, "checkpoints are not durable execution": a checkpoint preserves your state, but something else has to notice the crash, choose where to re-enter, and restart the run, and that is an orchestration layer you build or buy.

ALGAL takes a smaller route. A suspended run is itself data. A wait is a declared cell with a limited set of wake capabilities, and its checkpoint records the manifest's digest. A later CLI invocation, which can be a new OS process running the Rust runtime instead of the TypeScript reference runtime, verifies the recorded effects and continues. No orchestrator stays resident, because the receipt and the store hold everything needed to resume.

If you think in terms of durable workflows, an ALGAL run is closer to a portable workflow record that verifies itself than to a workflow engine. See [the process VM doc](/docs/vm/) for the mechanics, or the [durable process spec](/docs/spec/process/).

## What each one records

LangSmith records detailed traces: what the model saw, what it returned, and how long each node took. That is observability, and LangSmith is built for it.

An ALGAL receipt records the event order, each cell's arguments and outputs, and a digest of every effect. That is enough for `algal verify` to replay the run bit-for-bit offline and for `algal diff` to compare two runs. You can hand the file to someone who does not trust you, your infrastructure, or your model provider, and they can check the run themselves. Replay shows that the run matches its record; it does not show that the model was right.

The [interactive diagrams on this site](/tour/) replay recorded event order for the same reason, instead of animating a simulation.

## When to choose LangGraph

- You work in the LangChain ecosystem and want its integrations, retrievers, and tool catalog.
- You want streaming UIs, a visual studio for prototyping agents, managed deployment, and a platform behind it.
- Your agents are prototypes or moderately complex graphs, where in-process execution and a checkpointer are enough.
- You are fine with the graph existing only as code in your repository.

## When to choose ALGAL

- The program itself must be something you can hand to another host, review as data, diff against a prior version, or generate from another program.
- Runs need a record others can check: receipts that replay offline and still verify after the store moves.
- Agent programs need enforced permissions: typed capabilities, budgets, and a host that decides what a program may use.
- You want programs that propose their successors, measured on declared cases, with the lineage recorded on the receipt. [Habitats and selection](/docs/habitats/) describe how.

## Status and limits

ALGAL is a prerelease application VM. Packages are unsigned and not notarized, the ecosystem is young, and there is no managed platform, so you run the binary yourself. LangGraph is a mature framework with a company and a cloud behind it; if you need that today, use it. To see an agent program written as data, [take the tour](/tour/) or [read the spec](/docs/spec/organism/).

*Sources: the [LangGraph overview for Python](https://docs.langchain.com/oss/python/langgraph/overview) and [for JavaScript](https://docs.langchain.com/oss/javascript/langgraph/overview), and Temporal's [LangGraph plugin announcement](https://temporal.io/blog/temporal-langgraph-plugin-durable-execution) (July 16, 2026), checked 2026-09-26.*
