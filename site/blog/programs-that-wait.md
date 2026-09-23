---
title: "A program that can wait"
order: 3
date: 2026-09-22
description: Durable execution engines keep workflow state in a service and replay code around it. ALGAL takes the stranger route — the program is data, so a wait is a checkpointed capability a brand-new process can resume, even in a different runtime.
---

# A program that can wait

The most consequential feature in agent systems is boring on paper: **waiting.** An approval takes a day. A dependency takes a week. A human takes a holiday. Any architecture where the answer is "keep a process alive" is an architecture that fails on a schedule.

The durable-execution world solved this years ago — [Temporal](https://temporal.io/), Restate, Inngest, DBOS — with a common shape: workflow code runs under a deterministic replay model, the engine keeps the event history, and signals wake sleeping work. It works. It is also, in a specific sense, *server-shaped*: the history lives in the service, the code lives in your deployment, and the marriage of the two is the running system.

ALGAL solves the same problem by going somewhere stranger: **the program is data, so the wait is data too.**

## A wait you can hand to another machine

An ALGAL program waiting on an approval is not a paused thread or a suspended coroutine — it is a checkpoint: the manifest digest, the run's recorded effects, and the wake capability it was admitted, all in the store. The process that created it can exit entirely. Days later, *any* process with the store — a fresh CLI invocation, a different host, and critically **the other runtime** — can verify the checkpoint and continue.

That last clause is the weird one worth sitting with: a run can start on the TypeScript reference runtime and resume inside the Rust kernel. Same manifest, same store, same receipts — the program was never code on either side, so the runtime is an implementation detail of each individual invocation. Cross-runtime handoff is not a compatibility trick; it falls out of the program being data.

Compare with the durable-execution shape: a Temporal workflow is code — the SDK that reads it must match the code that wrote it, and the event history lives in the cluster that ran it. Perfectly serviceable inside the service boundary; the boundary is the point.

## The wait is a capability, not a suspension point

There is a second difference, smaller but sharper. In ALGAL a wait is not "pause here and hope something calls back" — it is a **declared capability dependency**. A mailbox wait cell names the receive capability the host admitted; the checkpoint binds it; resumption requires it again. The organism cannot mint a broader wake than the host granted, and the [mailbox spec](/docs/spec/mailbox/) bounds delivery, consumption, and idempotence so a woken run replays exactly once.

This is what "host-owned authority" means concretely: a program may sleep for a month, but it wakes up with *exactly* the powers it was given — no ambient authority accumulated in the meantime, no handles minted out of data.

## What the waiting looks like

The tour's [durable approval](/tour/) example is the canonical shape: a model reviews release evidence and proposes a recommendation; a child organism waits on a mailbox for the host's approval; a pure check requires both an `approve` decision and a matching release identifier before publication becomes eligible. The model's role ends at the recommendation — it cannot approve its own output, because approval is a capability the host holds and the manifest can only name, never mint.

And when the run is done, the whole thing — the proposal, the wait, the approval, the publication — is one [receipt](/blog/receipts-fossil-record/) that replays offline.

## The honest trade

The durable-execution engines are mature: clustering, retries at scale, decades of wait, battle-tested operability. ALGAL is a single binary and a store — durable waits without a service to run, at the cost of *you* running the binary and keeping the store. For the full picture of where the fit is, see [ALGAL vs Temporal](/compare/temporal/).

What you get for the strangeness: waits that are portable artifacts, resumable by a different process and a different runtime, with evidence that verifies wherever the receipt lands. The program does not wait because a server remembers it. It waits because the waiting itself is part of the program — and the program is data, so it cannot die of neglect.
