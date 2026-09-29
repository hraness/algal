---
title: Self-evolving software needs a selection boundary
order: 1
date: 2026-09-22
description: Darwin-Gödel Machine, AlphaEvolve, and Voyager share one loop: propose, evaluate, select. ALGAL makes the select step a checked contract.
eyebrow: Essay
cardTitle: "Self-evolving code needs a selection boundary"
cardDescription: "Darwin-Gödel Machine, AlphaEvolve, and Voyager share one loop: propose, evaluate, select."
---

# Self-evolving software needs a selection boundary

Research on software that improves itself has settled on one loop: a model proposes a program, an evaluator measures it, and a selector decides which version runs next. Getting a model to write candidates is now the easy part. The hard part is the selector, because it decides which generated code gets to act. ALGAL's design makes that decision a checked contract, recorded on a receipt, instead of whatever the surrounding script happens to do.

## Five systems built on the same loop

Since 2023, several research efforts arrived at this architecture separately:

- **Darwin-Gödel Machine** ([Sakana AI / UBC, 2025](https://arxiv.org/abs/2505.22954)): an agent that rewrites its own code, keeps each variant that still compiles and can edit code in an archive, and scores the variants on coding benchmarks. Its SWE-bench score rose from 20% to 50% through self-modification alone.
- **AlphaEvolve** ([DeepMind, 2025](https://deepmind.google/blog/alphaevolve-a-gemini-powered-coding-agent-for-designing-advanced-algorithms/)): Gemini models propose program variants, automated evaluators score them, and an evolutionary database picks parents for the next round. It found a 4×4 matrix-multiplication algorithm that beat Strassen's, 56 years after Strassen's result.
- **Voyager** ([MineDojo, 2023](https://arxiv.org/abs/2305.16291)): a Minecraft agent that builds a library of skills written as executable code, keeping each skill only after its own self-verification step, a GPT-4 critic reading the game state, judges that the skill succeeded.
- **TextGrad** ([Nature, 2025](https://www.nature.com/articles/s41586-025-08661-4)): textual feedback propagated backward through compound AI systems to optimize their components, including code.
- **DSPy** ([Stanford, 2024](https://proceedings.iclr.cc/paper_files/paper/2024/file/f1cf02ce09757f57c3b93c0db83181e0-Paper-Conference.pdf)): language-model pipelines optimized by teleprompters that propose instructions and score them on a development set.

The domains differ, and the loop is the same: a model proposes, an evaluator measures, a selector decides what survives. Every frontier model can draft plausible programs, and building an evaluator is ordinary engineering. The selector is where these systems differ most.

## The selector decides what gets to act

Set the benchmarks aside and the selector answers one question: does this proposed program become what the system runs from now on? DGM's archive, AlphaEvolve's database, and Voyager's skill library each sit between "a model emitted some code" and "that code now does things."

Most implementations leave that step implicit, as a Python process that runs whatever scored well. That is fine in a lab. In production it puts the least protection at the point that needs the most.

ALGAL makes each step of the loop part of the contract:

1. **Proposals are data.** A program emits a candidate manifest (`algal.organism.v1`, the format of an ALGAL program, called an organism) as an ordinary value, either through `spawn` or by handing it to the host. Proposing costs the proposer nothing and gives the candidate nothing.
2. **Candidates are checked before they run.** A candidate goes through the same checks as a hand-written manifest: typed cells, size-limited ports, closed budgets, and no self-created capabilities. A malformed proposal, or one that asks for more permission, is rejected before it runs.
3. **Measurement uses declared cases.** The foundry evaluates candidates on cases the host declared, the same cases every epoch, so "better" is measured the same way each time.
4. **The host selects.** Promotion follows the selection rule the host configured, and a content-addressed report records it: which candidate, which digest, and the result of each case, with each case's run receipt. The tour's diagram is labeled "Proposal is not promotion" for this reason.

The [civilization doc](/docs/civilization/) calls one pass through propose, check, measure, and select an epoch. DGM and AlphaEvolve use the same shape; in ALGAL each stage has a contract and a receipt.

## Candidates have to be cheap to inspect

The selector also needs candidates it can examine cheaply, and you cannot check what you cannot inspect.

DGM patches Python source. A variant enters its archive if it compiles and can still edit code, benchmark scores steer which variants become parents, and people monitor the sandboxed experiment rather than approving each diff. That works because the experiment is contained. For anything you want to trust a step at a time, arbitrary code is a poor unit of selection, because a diff can touch anything the language can express.

An ALGAL manifest is a small typed document. Comparing two candidates means comparing data, and checking one means running a checker with fixed limits rather than auditing general-purpose source. A candidate that cannot express an attack is cheaper to trust than one that can express anything. For the same reason the manifest carries no host code: its only executable content is `algal.expr.v1` expressions, run under a fuel limit by the contract's own evaluator.

Programs as data also make a population practical. A store of manifests is a store of hashed documents that can be deduplicated, traced through their lineage, and compared. `algal civ` runs one such epoch: a designer program proposes a plan for each goal, a host function compiles it into a checked manifest, the candidate runs on training and validation cases, and only candidates that pass every one are promoted. Proposal digests, case outcomes, and the promoted manifests are recorded in a population snapshot that `algal civ-verify` replays offline, so the evolution can be audited afterward. In one local run on a Mac, which is not published as replayable evidence, an on-device model of about 3B parameters was the designer.

## What the receipts do not show

- **An epoch that promotes nothing is still a valid epoch.** The receipts record that selection happened and on what evidence, not that the best possible program was found.
- **Replay proves consistency, not improvement.** A verified receipt means the run replays bit-for-bit. Whether the promoted candidate is actually better depends on the cases, which is why the host declares them and they are visible.
- **The host still decides.** Models propose; hosts check, measure, and select. If the proposer also picks the winner, the system is an unreviewed code generator, not self-evolving software.

## The open question is the substrate

The research so far shows that programs can improve themselves. The next question is where proposed programs should live so that they are cheap to check, cheap to measure, and safe to select. ALGAL's bet is a language where the program is data, a VM whose runs replay from receipts, and a selection step that is a contract.

Read how it works: [habitats](/docs/habitats/), [civilization](/docs/civilization/), and the [foundry spec](/docs/spec/foundry/). Or watch a program propose a child on the [tour](/tour/#grow).
