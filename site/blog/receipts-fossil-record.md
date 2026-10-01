---
title: "What a replayable receipt proves"
order: 2
date: 2026-09-22
description: An ALGAL receipt lets another person replay a recorded run offline and check how its inputs and saved answers produced its outputs.
eyebrow: Technique
cardDescription: "An ALGAL receipt replays an agent run offline."
updated: 2026-10-01
---

# What a replayable receipt proves

A release report says “approve.” To understand that answer, you need to know which evidence the program used, which answer the model returned and which rule turned that answer into the report.

An ALGAL receipt packages those inputs, recorded effects and execution steps into a file that another person can replay offline. Verification checks whether the supplied record is internally consistent. It needs no live model, original store or credentials. In ALGAL, an organism is a program: a typed manifest the runtime executes.

## What a receipt records

A receipt is a content-addressed JSON document. It records:

- the **event order**: `run.start`, then each `cell.commit`, `cell.skip`, `cell.fail`, `cell.suspend`, and `effect` as it happened, then `run.end`;
- the **arguments and outputs of each cell**;
- **effect digests**: the hashed request and the recorded answer for every model call;
- **work accounting**: how much of the declared budget each cell spent;
- the **run's own digest**, which covers all of the above. A program started by another program's `spawn` cell runs nested inside the parent's receipt, and the parent records the child manifest's digest.

That is enough to replay the run. `algal verify` reconstructs it bit-for-bit, with no model calls, no store, and no credentials, and fails when the reconstructed record disagrees. `algal diff` compares two runs and reports where they diverged. You can export a receipt, delete the store it came from, and another person with the CLI can still check the recorded execution.

## Follow an answer through the program

In the release example, replay uses the model answer saved in the receipt. It runs the declared checks again and reconstructs the report. If the record says the model recommended “reject” but claims that a check requiring “approve” passed, verification fails.

This makes the receipt useful for investigating a result or comparing two runs. `algal diff` can locate where they diverged, while the [tour's diagrams](/tour/) show each recorded step in order. Logs and traces can supply context around the run; the receipt supplies the data needed for this particular replay.

## Replay proves consistency, not truth

A receipt shows that the recorded model answers, passed through the declared cells, produce the recorded outputs. It does not show that the model was right, that its answers were good, or that the provider actually served the request. It also cannot establish that every real attempt was recorded. Checking a supplied execution record and independently verifying the events outside it are separate jobs.

## Other ALGAL features rest on receipts

Several ALGAL features depend on receipts rather than sitting beside them:

- **Resuming in another process.** A run can wait on an external event, exit, and resume in a new process, even in the other runtime (Rust or TypeScript), because resuming means verifying: the new process checks the recorded effects and continues the declared graph. See the [process spec](/docs/spec/process/).
- **Evidence that travels.** `algal process export` writes a process's evidence as one JSON document with a published size limit, and `algal process verify-evidence` checks it without the original store. The history moves with the work instead of staying in someone's database.
- **Auditable self-modification.** When a program spawns a child, the child manifest's digest goes onto the parent's receipt. When a foundry epoch promotes a candidate, a content-addressed report records the cases and the winner and points to each case's receipt. [Self-evolving software](/blog/self-evolving-software-selection-boundary/) can be audited only because those records exist: proposal digests, measured outcomes, and selection decisions.
- **Diagnosis without a debugger.** The TypeScript CLI's `algal diagnose` maps a failed receipt back to the source location, naming the cell that failed and what was in scope, because the receipt records the run's structure rather than free text.

## Receipts show failures too

Within a supplied receipt, replay checks the recorded event order and outcome. A recorded cache hit carries `cached: true`; a recorded recovery includes the failed step; a run that ended `stuck` keeps that outcome. Removing one of those steps while leaving dependent records unchanged breaks verification.

A producer can still withhold an entire failed run or supply fabricated external answers. Publish the complete evaluation set and corroborating evidence when the question is how often a system succeeds, rather than whether one receipt is consistent.

Download the [tour’s example receipt](/receipts/reply.receipt.json), check it with `algal verify`, and compare its recorded steps with the [tour diagram](/tour/).
