---
title: "A program that can wait"
order: 3
date: 2026-09-22
description: An ALGAL program can wait days for an approval, then resume in a new process or the other runtime, because the wait is saved as data in the store.
eyebrow: Technique
cardDescription: "It waits days for an approval, then resumes."
updated: 2026-10-01
---

# A program that can wait

Agent programs often wait on external events: an approval, a dependency or a reply. The wait may outlast the process that started it. Saving enough state to resume makes that wait independent of one process staying alive.

ALGAL handles the wait by saving it. An ALGAL program, called an organism, has a typed manifest. The runtime saves its progress as a checkpoint in a store. A later process can check the checkpoint and continue when it has the same local store and required host capabilities. It can even use the other ALGAL runtime.

## What must survive a restart

Consider a release review that waits for someone to answer. Saving only the prompt leaves the next process guessing: which release was reviewed, which model answer was accepted, and which approval should wake the work?

The restart needs the program's identity, its completed effects and the permission to receive the answer. Keeping those as checked data lets a later process reconstruct the completed work before it continues. It also makes a duplicate or unrelated answer something the program can reject explicitly.

## A saved wait can resume in a new process or the other runtime

A waiting ALGAL program is not a paused thread or a suspended coroutine. It is a checkpoint made of three things in the store: the manifest's digest, the effects the run has recorded so far, and the wake permission the host granted it. The process that created the checkpoint can exit. Days later, a process with that store and the required capabilities can verify the checkpoint and continue: a fresh CLI invocation, a host application restarted after a crash, or the other runtime. Copying a receipt does not transfer the saved process, its store or its host permissions to another machine.

That last case is the unusual one. A run can start in the TypeScript reference runtime, which runs on Bun, and resume in the Rust runtime, using the same manifest, store, and receipts. The manifest and checkpoint identify the work without preserving a live language-level continuation. Either runtime can reconstruct that state for the next invocation. [Comparing runtimes with differential tests](/blog/typescript-rust-parity/) describes the parity tests that check both runtimes agree, and the program shapes those tests leave uncompared.

## A program wakes with only the permission it was given

In ALGAL, a wait is a permission the program declares, not a point where it pauses and hopes for a callback. A mailbox wait cell names the receive capability the host granted. The checkpoint records that capability, and resuming requires it again. The program cannot give itself a broader way to wake up than the host allowed, and the [mailbox spec](/docs/spec/mailbox/) limits message count and size, deduplicates delivery, and records each consumed message.

So a program can sleep for a month and wake with the same permissions it had when it went to sleep. It gains nothing in the meantime, and it cannot turn data into a new capability.

## Example: a release that waits for approval

The [durable approval](/tour/) example on the tour shows the pattern. A model reviews release evidence and recommends an action. A child organism waits on a mailbox for the host's approval. A pure check then requires both an `approve` decision and a matching release identifier before the program publishes its report to a local mailbox. The example does not deploy anything. The model's part ends at the recommendation. It cannot approve its own output, because approval is a capability the host holds; the manifest can name it but cannot create it.

Each resumed generation keeps the earlier generation's effects as an exact prefix, so the final [receipt](/blog/receipts-fossil-record/) holds the recommendation, the wait, the approval, and the publication, and it replays offline.

## Who keeps the work running

ALGAL gives the host a saved wait it can verify and resume. You still have to keep the store, run the process again and supply the capabilities it needs. A checkpoint does not schedule its own wake-up or operate a service for you.

Choose a managed workflow service when you need that service's operations and deployment model. Choose a local ALGAL process when the host should own the store and execution. [ALGAL vs Temporal](/compare/temporal/) compares those responsibilities in more detail.
