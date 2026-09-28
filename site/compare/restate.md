---
title: ALGAL vs Restate
description: Restate journals durable handlers inside one Rust server binary. ALGAL writes each run to a receipt file that verifies offline, with no server to keep running.
order: 4
---

# ALGAL vs Restate

Restate is a durable execution platform: a single self-contained Rust binary, built around a replicated log, that invokes handlers written in your own language. ALGAL is a language and a virtual machine for agent programs. Both keep long-running work alive across crashes by recording progress instead of trusting a process. Use Restate for production durable execution today. Use ALGAL when the program must be data and the run record must verify away from the server.

## What both systems do

- Make execution replayable by confining nondeterminism to a boundary. Restate journals `ctx.run` steps inside durable handlers; ALGAL uses typed effect cells around a pure dataflow core.
- Treat the record of what happened, rather than the process, as the source of truth, so progress survives the process dying.
- Support long waits directly: a durable sleep or an awakeable suspends the invocation without holding the handler's compute.

If Temporal's model made sense to you, Restate's will too. It keeps the shape of a journal inside a service, but packs the service into one binary with embedded RocksDB storage. ALGAL's [receipts](/tour/#fossils) move the record out of the service entirely.

## How they differ

| | Restate | ALGAL |
|---|---|---|
| The program is | handler code (TypeScript, Python, Go, Java, Kotlin, Ruby, Rust) | typed data: an `algal.organism.v1` manifest |
| The record is | a journal per invocation inside Restate's durable log | a portable receipt file; `algal verify` replays it offline |
| Keyed state | Virtual Objects: per-key state with built-in concurrency control | durable processes and mailboxes in a content-addressed store |
| Nondeterminism | journaled `ctx.run` steps inside your handlers | declared effect cells (agent, decide, tool), typed and budgeted |
| Who runs it | a Restate node or cluster invokes handlers over HTTP | one binary, or two runtimes that hand a run to each other |
| Permissions | whatever your handler code calls | capabilities the host grants; a manifest cannot create its own |
| Programs as values | services are deployed code | manifests are data: hashed, diffed, and emitted by `spawn` |

## Where the record lives

Restate's journal lives in the server that ran the invocation, replicated across the nodes you operate. It is a solid operational record, and it stays inside the system that produced it.

An ALGAL receipt is a file. It records the events, each cell's arguments and outputs, and a digest of every effect. `algal verify` replays it bit-for-bit with no model, no store, and no credentials, and `algal diff` compares two runs. Restate's journal tells you what the system did; an ALGAL receipt lets a machine that never ran the workload check it.

## How a run waits

Restate suspends an invocation by recording the wait in its log, and the server keeps the scheduler that fires it. A single node fsyncs to disk before acknowledging, and a cluster replicates. Either way, a running Restate server has to be there to wake the work.

In ALGAL, a wait is a capability the manifest declares. A wait-style cell suspends on a mailbox receive the host granted, and the checkpoint records the manifest's digest. A different process, even the Rust runtime resuming a run that the TypeScript runtime on Bun started, verifies the recorded effects and continues. No server runs between invocations. The [process spec](/docs/spec/process/) has the mechanics.

## When to choose Restate

- You need durable execution in production today: replicated clusters with geo-replication, object-store snapshots, a managed cloud, or BYOC (bring your own cloud) inside your own account.
- You are building general backend work in your own language: durable RPC, queues, Virtual Objects for keyed entities, and handlers on Kubernetes, Lambda, or Cloudflare Workers.
- You want a system others already run hard. Restate's comparison page says Replit moved its agent orchestration from Temporal to Restate, with thousands of durable steps per execution.

## When to choose ALGAL

- The work is an agent program: typed model calls with declared budgets and declared context, rather than arbitrary handlers.
- Someone else needs to check the run, so the record has to replay offline and survive export.
- The program itself needs to be inspected or generated: content-addressed, diffable, and emitted by `spawn`, so a host or another program can read or write it.
- You want durable waits without running any service: one binary, a store, and a receipt.

## Status and limits

ALGAL is a prerelease application VM: unsigned packages, local stores, and no hosted service, so you operate it yourself. Restate is source-available infrastructure (Business Source License 1.1) with a cloud, a BYOC option, and production deployments. If you need durable execution in production today, use Restate. To see agent programs you can inspect and verify, [take the tour](/tour/).

*Sources: [Restate vs Temporal](https://restate.dev/vs/temporal) and the [self-hosted Restate overview](https://docs.restate.dev/server/overview), checked 2026-09-26.*
