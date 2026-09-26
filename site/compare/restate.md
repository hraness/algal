---
title: ALGAL vs Restate
description: Restate is durable execution in one Rust binary, journaled handlers and all. ALGAL is a language and VM where the program and its receipt are portable data.
order: 4
---

# ALGAL vs Restate

**Restate is a durable execution platform: a single self-contained Rust binary with a replicated log at its core, invoking handlers written in your language. ALGAL is a language and a virtual machine for agent programs.** Both keep long-running work alive across crashes by recording progress instead of trusting a process; they diverge on what the program is and who can inspect the record.

## The shared spine

Both systems make the same architectural bet:

- Execution is replayable because nondeterminism is quarantined at a boundary (Restate: journaled `ctx.run` steps inside durable handlers; ALGAL: typed effect cells on a pure dataflow core).
- Progress survives process death because the record of what happened, not the process, is the source of truth.
- Long waits are first-class: a durable sleep or an awakeable suspends the invocation without holding the handler's compute.

If Temporal's model made sense to you, Restate's will too: it keeps the journal-in-a-service shape but packs the service into one binary with embedded RocksDB storage. ALGAL's [receipts](/tour/#fossils) push the same idea further, out of the service entirely.

## Where they diverge

| | Restate | ALGAL |
|---|---|---|
| The program is | handler code (TypeScript, Python, Go, Java, Kotlin, Ruby, Rust) | typed data: an `algal.organism.v1` manifest |
| The record is | a journal per invocation inside Restate's durable log | a portable receipt file; `algal verify` replays it offline |
| Keyed state | Virtual Objects: per-key state with built-in concurrency control | durable processes and mailboxes in a content-addressed store |
| Nondeterminism | journaled `ctx.run` steps inside your handlers | declared effect cells (agent, decide, tool), typed and budgeted |
| Who runs it | a Restate node or cluster invokes handlers over HTTP | one binary, or two runtimes that hand a run to each other |
| Authority model | whatever your handler code calls | capabilities the host grants; a manifest cannot mint its own |
| Programs as values | services are deployed code | manifests are data: hashed, diffed, emitted by `spawn` |

## The evidence object

Restate's journal lives in the server that ran the invocation, replicated across the nodes you operate. It is a solid operational record, and it stays inside the system that produced it.

An ALGAL receipt is a **file**. It records events, per-cell args and outputs, and effect digests; `algal verify` replays it bit-for-bit with no model, no store, and no credentials, and `algal diff` compares two runs. The journal answers "what did the system do"; the receipt answers "prove it" on a machine that never ran the workload.

## The wait

Restate suspends by recording the wait in its log, and the server keeps the scheduler that fires it. A single node fsyncs to disk before acknowledging; a cluster replicates. Either way, something running Restate must be there to wake the work.

ALGAL's wait is a **capability the manifest declares**. A wait-style cell suspends on a granted mailbox receive; the checkpoint binds the manifest digest; a different process, even the Rust kernel resuming a run the Bun host started, verifies the recorded effects and continues. There is no server between invocations. The [process spec](/docs/spec/process/) has the mechanics.

## Where Restate is the better fit

- Production durable execution today: replicated clusters with geo-replication, object-store snapshots, a managed cloud, or BYOC inside your own account.
- General backend work in your own language: durable RPC, queues, Virtual Objects for keyed entities, handlers on Kubernetes, Lambda, or Cloudflare Workers.
- You want a system others already run hard: Restate's own comparison cites Replit migrating its agent orchestration off Temporal, with thousands of durable steps per execution.

## Where ALGAL is the better fit

- The work is an **agent program**: typed model-effect cells with declared budgets and context views, not arbitrary handlers.
- Evidence must be portable and independently checkable: a receipt that replays offline and survives export.
- The program itself is an artifact: content-addressed, diffable, and emitted by `spawn`, so a host or another program can inspect or generate it.
- You want durable waits without running any service: one binary, a store, a receipt.

## Status and limits

ALGAL is a prerelease application VM: unsigned packages, local stores, and no hosted service, so you operate it yourself. Restate is source-available infrastructure (Business Source License 1.1) with a cloud, a BYOC option, and production deployments. If you need durable execution in production today, use Restate. If you want agent programs that are inspectable, verifiable artifacts, [take the tour](/tour/).

*Sources: [Restate vs Temporal](https://restate.dev/vs/temporal) and the [self-hosted Restate overview](https://docs.restate.dev/server/overview), checked 2026-09-26.*
