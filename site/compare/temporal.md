---
title: ALGAL vs Temporal
description: Temporal keeps each workflow's history in its service. ALGAL writes every run to a receipt file that anyone can replay offline with algal verify.
order: 3
---

# ALGAL vs Temporal

Temporal is a durable execution engine: you write workflows as code in one of its SDKs, and the Temporal Service stores each workflow's event history so the run survives a crash. ALGAL is a language and virtual machine for agent programs. An ALGAL program is typed data rather than code, and each run leaves a receipt file that someone else can verify offline. Use Temporal for production backend orchestration. Use ALGAL when someone else must verify the run from a file, or when another program must inspect or generate the workflow itself.

## What both systems do

- Keep nondeterminism at a boundary so a run can be replayed. Temporal moves it into activities and requires deterministic workflow code; ALGAL confines it to typed effect cells around a pure dataflow core.
- Treat the record of what happened, rather than the running process, as the source of truth, so progress survives the process dying.
- Let a run wait for a signal indefinitely without holding a thread.

ALGAL's [receipts](/tour/#fossils) rest on the same idea as Temporal's history: the recorded event order is the truth, and re-execution must match it.

## How they differ

| | Temporal | ALGAL |
|---|---|---|
| The program is | workflow code (TypeScript, Go, Java, Python, and others) | typed data: an `algal.organism.v1` manifest |
| The history is | event history held by the Temporal service | a receipt file that verifies offline, with no server or store |
| Nondeterminism | activities, side effects, and timers; anything nondeterministic must leave the workflow | declared effect cells (agent, decide, tool), each typed, budgeted, and recorded |
| Long waits | signals and async handlers in a running service | a checkpointed wait on a declared capability that any later process can resume |
| Who runs it | workers registered to a cluster | one binary, or two runtimes that can hand a run to each other |
| Permissions | whatever your code calls | capabilities the host grants; a manifest cannot create its own |
| Programs as values | workflows can start child workflows | manifests are data: hashed, diffed, moved between hosts, and emitted by `spawn` |

## Where the history lives

Temporal's event history lives in the service that ran the workflow, on infrastructure you or Temporal operate. It is a durable, detailed record, and it serves the system that produced it.

An ALGAL receipt is a file. It records the event order, each cell's arguments and outputs, and a digest of every effect. `algal verify` replays it bit-for-bit with no model, no store, and no credentials, and `algal diff` compares two runs. You can export a process, delete the original store, and someone who never ran the work can still check what happened.

## How a run waits

Temporal keeps workflow state in its service and delivers signals to it, so the service has to be running when the wait ends.

In ALGAL, a wait is a capability the manifest declares. A wait-style cell suspends on a mailbox receive that the host granted, and the checkpoint records the manifest's digest. A different process, even the Rust runtime resuming a run that the TypeScript runtime on Bun started, verifies the recorded effects and continues. No orchestrator process stays alive between invocations. The [process spec](/docs/spec/process/) has the mechanics.

## When to choose Temporal

- You need general backend orchestration at scale, such as payments, pipelines, and sagas. Temporal is proven in production and has SDKs in the major languages.
- Your work is ordinary deterministic code around service calls, and model calls are incidental.
- You want a mature operational platform with a company behind it.

## When to choose ALGAL

- The workflow is an agent program: typed model calls with declared budgets and declared context, rather than arbitrary code.
- Someone other than you needs to check the run, so the record has to survive export, replay offline, and verify on a different host.
- A host or another program needs to inspect or generate the program itself, so it has to be data with a content address that can be diffed and spawned.
- You want durable waits without running an orchestration service: one binary, a store, and a receipt.

## Status and limits

Temporal is mature, funded, and runs production fleets. ALGAL is a prerelease application VM: one binary, local stores, unsigned packages, and no hosted service, so you operate it yourself. If you need production orchestration today, use Temporal. Temporal also argues that agent frameworks still need an orchestrator underneath, and ships a [LangGraph plugin](https://temporal.io/blog/temporal-langgraph-plugin-durable-execution) for that. To see ALGAL programs and their recorded runs, [take the tour](/tour/).

*Sources: [Temporal event history](https://docs.temporal.io/workflow-execution/event), [Temporal workflow message passing](https://docs.temporal.io/encyclopedia/workflow-message-passing), and the [Temporal LangGraph plugin announcement](https://temporal.io/blog/temporal-langgraph-plugin-durable-execution) (July 16, 2026), checked 2026-09-26.*
