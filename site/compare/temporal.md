---
title: ALGAL vs Temporal
description: Temporal is a durable execution platform for backend workflows. ALGAL is a language and VM for bounded agent programs whose programs — and their run receipts — are portable, verifiable data.
order: 3
---

# ALGAL vs Temporal

**Temporal is a durable execution engine. ALGAL is a language and virtual machine for agent programs.** They share a deep conviction — deterministic replay around nondeterministic effects, execution that survives process death — and then diverge on almost everything else. This comparison matters because people evaluate them with the same question: *"will my long-running work survive?"*

## The shared spine

Both systems make the same architectural bet:

- Execution is replayable because nondeterminism is quarantined at a boundary (Temporal: activities + workflow determinism; ALGAL: typed effect cells on a pure dataflow core).
- Progress survives process death because the record of what happened — not the process — is the source of truth.
- Human-scale waits are first-class: a run can wait for a signal indefinitely without holding a thread.

If you already buy Temporal's model, ALGAL's [receipts](/tour/#fossils) will feel familiar — the event order is the truth, and re-execution must match it.

## Where they diverge

| | Temporal | ALGAL |
|---|---|---|
| The program is | workflow code (TypeScript, Go, Java, Python…) | typed data — `algal.organism.v1` manifest |
| The history is | event history held by the Temporal service | a portable receipt file — verify offline, no server, no store |
| Nondeterminism | activities, side effects, timers — anything nondeterministic must leave the workflow | declared effect cells: agent, decide, tool — typed, budgeted, recorded |
| Long waits | signals + async handlers in a running service | suspension is a checkpointed capability wait; any later process resumes it |
| Who runs it | workers registered to a cluster | a single binary — or two runtimes that can hand a run to each other |
| Authority model | whatever your code calls | host-admitted capabilities a manifest cannot mint |
| Programs as values | workflows can start child workflows | manifests are data: hashed, diffed, transported, and emitted by `spawn` |

## The evidence object

Temporal's event history lives in the service that ran the workflow. It is excellent — and it is *yours*, on your infra.

An ALGAL receipt is a **file**. It records events, per-cell args and outputs, and effect digests; `algal verify` replays it bit-for-bit with no model, no store, no credentials, and `algal diff` compares two runs. You can export a process, delete the original store, and a stranger can still verify what happened. That portability is the difference between *operational history* and *portable evidence*.

## The wait

Temporal suspends by keeping workflow state in its service and delivering signals to it. It works beautifully — at the cost of running the service.

ALGAL's wait is a **capability the manifest declares**. A `wait`-style cell suspends on an admitted mailbox receive; the checkpoint binds the manifest digest; a *different* process — even the Rust kernel resuming a run the Bun host started — verifies recorded effects and continues. There is no orchestrator process to keep alive between invocations. The [process spec](/docs/spec/process/) has the mechanics.

## Where Temporal is the better fit

- General backend orchestration at scale: payments, pipelines, sagas — Temporal is battle-tested infrastructure with SDKs in every major language.
- Your work is ordinary deterministic code around service calls; model calls are incidental.
- You want a mature operational platform with a company behind it.

## Where ALGAL is the better fit

- The workflow is an **agent program**: typed model-effect cells with declared budgets and context views, not arbitrary code.
- Evidence must be portable and independently verifiable — a receipt that survives export, offline replay, and host change.
- The program itself is an artifact — content-addressed, spawnable, diffable — because something (a host, a habitat, another program) needs to inspect or generate it.
- You want durable waits without running an orchestration service: one binary, a store, a receipt.

## The honest caveat

Temporal is mature, funded, and runs production fleets. ALGAL is a prerelease application VM: single binary, local stores, unsigned packages, no hosted service — by design, but it means *you* operate it. If you need production-grade general orchestration today, use Temporal (and note they are honest that agent frameworks still need an orchestrator — see their [LangGraph plugin](https://temporal.io/blog/temporal-langgraph-plugin-durable-execution)). If you need agent programs that are inspectable, portable evidence-bearing artifacts, [take the tour](/tour/).
