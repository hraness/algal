---
title: "Receipts are the fossil record of an execution"
order: 2
date: 2026-09-22
updated: 2026-09-28
description: An ALGAL receipt replays an agent run bit-for-bit offline, so someone who does not trust you can check what ran. What it records, and what it proves.
eyebrow: Technique
cardDescription: "An ALGAL receipt replays an agent run bit-for-bit offline, so someone who does not trust you can check what ran."
---

# Receipts are the fossil record of an execution

Ask what an agent run did, and the usual answer is that the logs say it worked. That answer asks you to take the system's word for it.

Every ALGAL run instead writes a receipt: a file that someone else can replay offline to check what ran, without your model, your store, or your credentials. A log is a story a process tells about itself. A receipt works more like a fossil, the structure left after the organism is gone, detailed enough that someone who was not there can reconstruct what happened. (In ALGAL an organism is a program: a typed manifest the runtime executes.)

## What a receipt records

A receipt is a content-addressed JSON document. It records:

- the **event order**: `run.start`, then each `cell.commit`, `cell.skip`, `cell.fail`, `cell.suspend`, and `effect` as it happened, then `run.end`;
- the **arguments and outputs of each cell**;
- **effect digests**: the hashed request and the recorded answer for every model call;
- **work accounting**: how much of the declared budget each cell spent;
- the **run's own digest**, which covers all of the above. A program started by another program's `spawn` cell runs nested inside the parent's receipt, and the parent records the child manifest's digest.

That is enough to replay the run. `algal verify` reconstructs it bit-for-bit, with no model calls, no store, and no credentials, and fails if any byte disagrees. `algal diff` compares two runs and reports where they diverged. You can export a receipt, delete the store it came from, and a stranger with the CLI can still check your work.

## Replay turns a claim into something you can check

Records of what a system did differ in whom they ask you to trust:

1. **Logs** are the process's own account, so you trust the process.
2. **Traces**, such as LangSmith or OpenTelemetry, are structured observation, so you trust the pipeline that collected them.
3. **Event history**, as in Temporal, is the orchestrator's record, so you trust the service that kept it.
4. **Replayable receipts** re-execute the same way anywhere, so you do not have to trust the host's account of how the run used its recorded answers.

ALGAL's receipts are the fourth kind. Replay needs the same inputs, the same recorded answers, and the same event order, or the digest does not match. The [diagrams on the tour](/tour/) replay each receipt's recorded event order rather than animating an illustration, so what you see is the run itself.

## Replay proves consistency, not truth

Receipts are easy to oversell, so the limit belongs here. A receipt shows that the recorded model answers, passed through the declared cells, produce the recorded outputs. It does not show that the model was right, that its answers were good, or that the provider actually served the request. A receipt is strong evidence about what ran. It says nothing about whether the result is true of the world.

## Other ALGAL features rest on receipts

Several ALGAL features depend on receipts rather than sitting beside them:

- **Resuming in another process.** A run can wait on an external event, exit, and resume in a new process, even in the other runtime (Rust or TypeScript), because resuming means verifying: the new process checks the recorded effects and continues the declared graph. See the [process spec](/docs/spec/process/).
- **Evidence that travels.** `algal process export` writes a process's evidence as one JSON document with a published size limit, and `algal process verify-evidence` checks it without the original store. The history moves with the work instead of staying in someone's database.
- **Auditable self-modification.** When a program spawns a child, the child manifest's digest goes onto the parent's receipt. When a foundry epoch promotes a candidate, a content-addressed report records the cases and the winner and points to each case's receipt. [Self-evolving software](/blog/self-evolving-software-selection-boundary/) can be audited only because those records exist: proposal digests, measured outcomes, and selection decisions.
- **Diagnosis without a debugger.** The TypeScript CLI's `algal diagnose` maps a failed receipt back to the source location, naming the cell that failed and what was in scope, because the receipt records the run's structure rather than free text.

## Receipts show failures too

A receipt cannot quietly drop an inconvenient fact. If a model call was answered from cache, the receipt says `cached: true`, and replay reproduces the flag. If a tool call failed and the run recovered, the failure is on the receipt. If a run ended `stuck`, that is the recorded outcome. Because failures cannot be hidden, a successful receipt means more.

You can check this on the site. Every diagram on the [tour](/tour/) ships its [receipt](/receipts/reply.receipt.json), and the footer shows how many recorded runs were replay-verified during each build.
