---
title: ALGAL vs Inngest
description: Inngest checkpoints TypeScript, Python, and Go functions and bills per step. ALGAL runs agent programs from a local binary with no per-step meter.
order: 5
---

# ALGAL vs Inngest

Inngest is durable execution as a service. Your code stays ordinary TypeScript, Python, or Go, `step.run()` checkpoints each unit of work, and Inngest Cloud drives the run. ALGAL is a language and a virtual machine for agent programs. Both answer the question of what survives a crash halfway through a long job, and they differ on where the run lives, what it costs, and what record it leaves.

## What both systems do

- Avoid re-running finished work. `step.run()` memoizes a step's result so a retry resumes from the last checkpoint; ALGAL records each effect cell's arguments and output on a receipt.
- Let a run wait without holding compute. `step.sleep()` parks a run for up to a year (seven days on the free plan); an ALGAL wait is a checkpointed suspension that lets the process exit entirely.

## How they differ

| | Inngest | ALGAL |
|---|---|---|
| The program is | host-language functions with `step.*` calls | typed data: an `algal.organism.v1` manifest |
| Where the run lives | your compute, orchestrated by Inngest Cloud or a self-hosted server that keeps run state | one binary and a store on your machine |
| The record is | run state and traces inside the platform, kept for as long as your plan allows | a receipt file that replays bit-for-bit offline and does not expire |
| Nondeterminism | whatever code you wrap in `step.run()` | declared effect cells (agent, decide, tool), typed and budgeted |
| Permissions | whatever your code calls | capabilities the host grants; a manifest cannot create its own |
| The meter | cloud executions: one per run plus one per step | no meter; the binary is free and open source |

## What an execution costs

Inngest Cloud bills by execution, and the unit is small: a run counts once, then each `step.run()` inside it counts again, so a five-step function uses six executions. The free plan includes 50,000 executions a month, and Pro starts at $99 a month with 1 million included. Fine-grained steps are what make Inngest's retries precise, and they are also what it charges for.

ALGAL has no meter because there is no service. You run the binary and keep the store, and the remaining costs, such as disk and model accounts, are ones you already pay.

## Platform limits

Inngest documents these limits: a step can sleep for up to one year, each step times out after two hours, a function can have at most 1,000 steps, and total run state is capped at 32MiB. The limits exist because the run's state lives in the service. Self-hosting is supported as a single binary with SQLite persistence, though Inngest notes that its support team does not guarantee direct support for self-hosted instances.

An ALGAL wait has no plan ceiling because there is no plan. The suspension is a checkpointed capability in your store, and it ends when its declared wake arrives. ALGAL's limits come from the manifest contract instead: maximum list lengths, byte sizes, and budgets on cells.

## When to choose Inngest

- You want durable execution with no infrastructure to run: a dev server, a managed cloud, tracing and observability, and a free tier to start on.
- Your code is ordinary TypeScript, Python, or Go and should stay that way; steps wrap what you already have.
- You want a vendor to operate the platform your runs depend on.

## When to choose ALGAL

- The program itself must be something you can hash, diff, review as data, or generate from another program through `spawn`.
- Someone else needs to check the run: receipts verify offline with no store, no credentials, and no account, on machines that never ran the original.
- A program should get only the permissions you grant: capabilities from the host, budgets on cells, and no way to create permissions from data.
- You want waits with no platform ceiling and no per-step meter: a binary and a store you own.

## Status and limits

ALGAL is a prerelease application VM: unsigned packages, local stores, and no hosted service, so you operate it yourself. Inngest is a production platform with documented limits and published pricing. If you need managed durable execution today, use Inngest. To see an agent program written as data, [take the tour](/tour/) or [read the spec](/docs/spec/organism/).

*Sources: [Inngest pricing](https://inngest.com/pricing), [Inngest steps](https://www.inngest.com/docs/learn/inngest-steps), the [usage limits reference](https://www.inngest.com/docs/usage-limits/inngest), and [self-hosting](https://www.inngest.com/docs/self-hosting), checked 2026-09-26.*
