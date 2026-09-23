---
title: "Receipts are the fossil record of an execution"
order: 2
date: 2026-09-22
description: Agent runs are usually logs — prose about what happened that nobody can check. An ALGAL receipt is a content-addressed artifact that replays bit-for-bit offline: execution evidence you can hand to someone who does not trust you.
---

# Receipts are the fossil record of an execution

Ask what an agent run did and the honest answer is usually: *the logs say it worked.* Which is a way of saying the system asserts, and you take its word.

ALGAL's answer is a receipt — and the word choice matters. A log is a narrative a process wrote about itself. A fossil is what remains when the organism is gone: physical evidence, structured enough that someone who was not there can reconstruct what happened.

## What a receipt actually is

Every ALGAL run emits one artifact: a content-addressed JSON document recording

- the **event order** — `run.start`, `cell.commit`, `effect`, `cell.skip`, `run.end`, in sequence;
- **per-cell args and outputs** — the values each cell received and produced;
- **effect digests** — the hashed request and recorded answer for every model call;
- **work accounting** — what each cell spent of the declared budget;
- the **run's own digest** — which binds all of it, and lands on the parent's receipt if the run was spawned.

That is enough structure to **replay**. `algal verify` reconstructs the run bit-for-bit — no model calls, no store, no credentials — and fails if any byte disagrees. `algal diff` compares two runs and reports exactly where they diverged. The receipt is self-sufficient evidence: you can export it, delete the store it came from, and a stranger with the CLI can still check your work.

## Replay verification is the difference between evidence and testimony

There is a spectrum of "what happened" claims:

1. **Logs** — the process says what it did. Trust the process.
2. **Traces** — structured observation (LangSmith, OpenTelemetry). Trust the pipeline that collected it.
3. **Event history** — the orchestrator's record (Temporal's model). Trust the service that kept it.
4. **Replayable receipts** — an artifact that re-executes identically anywhere. Trust is optional.

ALGAL sits at the far end. The receipt does not ask you to believe the host — it asks you to *rerun the physics*: same inputs, same recorded answers, same event order, or the digest does not match. The [interactive diagrams on the tour](/tour/) literally replay the receipt's recorded event order rather than animating an illustration, because the receipt is the ground truth of the demo.

It is worth being precise about the claim, because receipts get oversold: **replay proves consistency, not truth.** A receipt verifies that the recorded effect answers, threaded through the declared cells, produce the recorded outputs. It does not prove the model was right, the answers were good, or that some provider honestly served the request. Receipts are execution evidence — exceptionally strong evidence about *what ran* — not attestations about the world.

## Why this is the load-bearing piece

Receipts are not a logging feature; they are what several other ALGAL properties rest on:

- **Suspension across processes.** A run can wait on an external event, die, and resume in a *new* process — even the other runtime (Rust kernel ↔ TypeScript reference) — because resumption is verification: the new process checks recorded effects and continues the declared graph. [Process spec](/docs/spec/process/).
- **Portable evidence.** `algal process export` packs a run's evidence into a bounded capsule; verification works after the source store moves away. Execution history that travels with the work instead of living in someone's database.
- **Auditable evolution.** When a program spawns a child, the child manifest's digest lands on the parent's receipt; when a foundry epoch promotes a candidate, the cases and the winner land on receipts. [Self-evolving software](/blog/self-evolving-software-selection-boundary/) is only auditable if the fossils exist — proposal digests, measured outcomes, selection decisions.
- **Diagnosis without a debugger.** `algal diagnose` reads a failed receipt back to source location — which cell failed, with what in scope — because the receipt knows the run structurally, not textually.

## The uncomfortable part receipts force

Receipts also keep the system honest in a subtler way: **they make cheating visible.** If a model effect were silently cached, the receipt says `cached: true` — it is a fact of the run, so replay reproduces the flag. If a tool call failed and the run recovered, the failure record is in the receipt. If a run ended `stuck`, that is the outcome on the artifact. A system that cannot hide its own failures is a system whose successes mean more.

The fossils are public on this site — every diagram on the [tour](/tour/) ships its [receipt](/receipts/reply.receipt.json), and the footer counts the runs replay-verified during each build. The evidence is the demo.
