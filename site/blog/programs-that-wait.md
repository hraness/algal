---
title: "A program that can wait"
order: 3
date: 2026-09-22
updated: 2026-09-28
description: An ALGAL program can wait days for an approval, then resume in a new process or the other runtime, because the wait is saved as data in the store.
eyebrow: Technique
cardDescription: "An ALGAL program can wait days for an approval, then resume in a new process."
---

# A program that can wait

Agent work spends most of its life waiting. An approval takes a day, a dependency takes a week, and the person who has to answer goes on holiday. A design that keeps a process alive for all of that will eventually lose the process.

ALGAL handles the wait by saving it. An ALGAL program, called an organism, is typed data rather than code, so a paused program is a checkpoint in a store. Any later process on the machine that holds the store can check the checkpoint and continue, including a process running the other ALGAL runtime.

## How durable execution engines wait

Durable execution engines such as [Temporal](https://temporal.io/), Restate, Inngest, and DBOS solved waiting years ago, and they share a design. Workflow code runs under a deterministic replay model, the engine keeps the event history, and signals wake sleeping work.

That design works, and it depends on a server. The history lives in the service, the code lives in your deployment, and the running system is the two together. A Temporal workflow is code, so the worker that replays it must run code that matches the recorded history, and that history lives in the service that ran it. You can export a history and replay it in a test with the SDK's replayer, but only against the workflow code that produced it. The arrangement is sound, and the history serves the system that produced it.

## A saved wait can resume in a new process or the other runtime

A waiting ALGAL program is not a paused thread or a suspended coroutine. It is a checkpoint made of three things in the store: the manifest's digest, the effects the run has recorded so far, and the wake permission the host granted it. The process that created the checkpoint can exit. Days later, any process on the machine that holds the store can verify the checkpoint and continue: a fresh CLI invocation, a host application restarted after a crash, or the other runtime. Moving a waiting process to another machine is not built yet.

That last case is the unusual one. A run can start in the TypeScript reference runtime, which runs on Bun, and resume in the Rust runtime, using the same manifest, store, and receipts. Neither runtime ever held the program as code, so either one can serve the next invocation. The handoff follows from the program being data. [How ALGAL keeps its TypeScript and Rust in step](/blog/typescript-rust-parity/) describes the parity tests that check both runtimes agree, and the program shapes those tests leave uncompared.

## A program wakes with only the permission it was given

In ALGAL, a wait is a permission the program declares, not a point where it pauses and hopes for a callback. A mailbox wait cell names the receive capability the host granted. The checkpoint records that capability, and resuming requires it again. The program cannot give itself a broader way to wake up than the host allowed, and the [mailbox spec](/docs/spec/mailbox/) limits message count and size, deduplicates delivery, and records each consumed message.

So a program can sleep for a month and wake with the same permissions it had when it went to sleep. It gains nothing in the meantime, and it cannot turn data into a new capability.

## Example: a release that waits for approval

The [durable approval](/tour/) example on the tour shows the pattern. A model reviews release evidence and recommends an action. A child organism waits on a mailbox for the host's approval. A pure check then requires both an `approve` decision and a matching release identifier before the program publishes its report to a local mailbox. The example does not deploy anything. The model's part ends at the recommendation. It cannot approve its own output, because approval is a capability the host holds; the manifest can name it but cannot create it.

Each resumed generation keeps the earlier generation's effects as an exact prefix, so the final [receipt](/blog/receipts-fossil-record/) holds the recommendation, the wait, the approval, and the publication, and it replays offline.

## What you give up

Durable execution engines are mature, with clustering, retries at scale, very long waits, and tooling for operating them in production. ALGAL is one binary and a store. You get durable waits without running a service, and in exchange you run the binary and keep the store yourself. [ALGAL vs Temporal](/compare/temporal/) covers when each is the better fit.

In return, a wait is a file-backed record that a new process, or the other runtime, can resume, and its receipt verifies offline wherever you copy it. No server has to remember the program, because the wait is part of the program's own data.
