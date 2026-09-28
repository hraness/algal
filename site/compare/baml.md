---
title: ALGAL vs BAML
description: BAML is a language for typed LLM functions that Python and TypeScript apps call. ALGAL is a language and VM for agent runs that wait, resume after a crash, and replay offline.
order: 6
---

# ALGAL vs BAML

BAML and ALGAL both call themselves languages for agents. BAML is a TypeScript-like language with typed LLM functions, tests, and evals built in, and it generates clients so Python and TypeScript apps can call those functions. ALGAL is a language and VM for agent programs that wait for approval, resume after a crash in a new process, and leave a receipt you can replay offline. Pick BAML for reliable typed model calls inside an app you already have. Pick ALGAL when the run itself has to pause, recover, and be checked later.

## What both do

- Make a model call a typed function. BAML's [homepage](https://www.boundaryml.com/) lists "native LLM functions" alongside runtime types with no `any` and typed errors; ALGAL's agent and decide cells declare typed inputs, outputs, and budgets.
- Check programs against cases you write. BAML ships tests, testsets, and evaluations in the language; ALGAL measures candidate programs on cases you declare before the host keeps one.
- Keep the source readable by people and by coding agents. BAML's [README](https://github.com/BoundaryML/baml) says every feature "is built so agents make fewer mistakes"; ALGAL source compiles to a typed manifest that a host can inspect before anything runs.

## How they differ

| | BAML | ALGAL |
|---|---|---|
| The program is | BAML source with TypeScript-like syntax, unions, generics, and interfaces, called from Python or TypeScript through generated SDKs or run with `baml run` | typed data: an `algal.organism.v1` manifest |
| The history is | a profiler and workflow tooling that record LLM inputs and outputs ([Explore BAML](https://boundaryml.com/explore)); hosted observability is planned for BAML Cloud, which is not available yet ([pricing](https://boundaryml.com/pricing)), and the legacy v0 DSL sends traces to Boundary Studio when you set an API key ([v0 tracing docs](https://docs.boundaryml.com/guide/boundary-cloud/observability/tracking-usage)) | a receipt file that verifies offline, with no server or store |
| Nondeterminism | model calls are native functions with typed results and typed errors, and BAML lists traces and replay as a design goal; its published documentation does not describe replaying a finished run from recorded model answers | declared effect cells (agent, decide, tool), each typed, budgeted, and recorded |
| Long waits | BAML's published documentation does not describe durable waits or resuming a run after a crash; the [codemode demo](https://github.com/BoundaryML/codemode) builds an approval log on top of BAML (see below) | a checkpointed wait on a declared capability that a later process with the store can resume |
| Who runs it | your Python or TypeScript process, or the `baml` CLI | one binary, or two runtimes that can hand a run to each other |
| Permissions | whatever your BAML code and host application call | capabilities the host grants; a manifest cannot create its own |
| Programs as values | BAML functions are source compiled by the BAML toolchain | manifests are data: hashed, diffed, moved between hosts, and emitted by `spawn` |

## Where BAML meets durability

Boundary's [codemode](https://github.com/BoundaryML/codemode) repository is an early demo in which a model writes BAML, the server compiles and runs it in process, and a durable execution log records each connector call. An approval aborts the pass; after approval the same code runs again and earlier calls are answered from the log, and a call that does not match the log raises a replay-divergence error. The log is JSON on disk that survives restarts. The demo shows the pattern is possible in BAML. BAML's published documentation does not describe it as a language feature (checked 2026-09-28).

In ALGAL, the wait is part of the program contract. A wait-style cell suspends on a mailbox receive that the host granted, and the checkpoint records the manifest's digest. A different process, even the Rust runtime resuming a run that the TypeScript runtime on Bun started, verifies the recorded effects and continues. `algal verify` replays the finished receipt with no model, no store, and no credentials. The [process spec](/docs/spec/process/) has the mechanics.

## When to choose BAML

- You want reliable, typed model calls inside a Python or TypeScript app you already have, adopted one function at a time through generated SDKs.
- You want prompt tests and evaluations next to the functions they check, with editor and CLI tooling built for that loop.
- You want a workflow graph, a profiler, and CLI tools such as `baml run` and `baml describe` built for coding agents.
- You want a project with a company behind it and a larger community.

## When to choose ALGAL

- The run has to wait for a person's approval, let the process exit, and resume later without repeating finished model calls.
- Someone other than you needs to check the run, so the record has to replay offline and verify on a machine that never ran the work.
- A host or another program needs to inspect or generate the program itself, so it has to be data with a content address that can be diffed and spawned.
- A program should get only the permissions the host grants it.

## Status and limits

ALGAL is a prerelease application VM: one binary, local stores, unsigned packages, and no hosted service, so you operate it yourself. It cannot guarantee exactly-once external effects across a crash; host tools own their own idempotency. BAML is pre-1.0: its documentation site covers the legacy v0 DSL and describes the new language as in public beta, and its latest stable release is 0.20.1, followed by nightly builds. It is Apache-2.0 licensed, with Boundary and a larger community behind it. If what you need is typed model calls inside an existing app, use BAML. To see ALGAL programs and their recorded runs, [take the tour](/tour/).

*Sources: the [BAML homepage](https://www.boundaryml.com/), [Explore BAML](https://boundaryml.com/explore), [BAML pricing](https://boundaryml.com/pricing), the [BAML README](https://github.com/BoundaryML/baml) and [releases](https://github.com/BoundaryML/baml/releases), the [BAML v0 documentation](https://docs.boundaryml.com/home) and its [tracing page](https://docs.boundaryml.com/guide/boundary-cloud/observability/tracking-usage), and the [codemode demo](https://github.com/BoundaryML/codemode), checked 2026-09-28.*
