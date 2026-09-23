---
title: Self-evolving software needs a selection boundary
order: 1
date: 2026-09-22
description: Darwin-Gödel Machine, Voyager, AlphaEvolve, and TextGrad all converge on the same loop — propose, evaluate, select. The hard part is not getting a model to write programs; it is deciding what gets to run. ALGAL makes that boundary the contract.
---

# Self-evolving software needs a selection boundary

Something quietly converged over the last two years: half a dozen serious research efforts independently arrived at the same architecture for software that improves itself.

- **Darwin-Gödel Machine** ([Sakana AI / UBC, 2025](https://arxiv.org/abs/2505.22954)) — an agent that rewrites its own code, keeps every variant in an archive, and validates each on coding benchmarks. SWE-bench scores climbed from 20% to 50% through self-modification alone.
- **AlphaEvolve** ([DeepMind, 2025](https://deepmind.google/blog/alphaevolve-a-gemini-powered-coding-agent-for-designing-advanced-algorithms/)) — Gemini models propose program variants; automated evaluators score them; an evolutionary database selects parents for the next round. It found a 4×4 matrix-multiplication algorithm that beat Strassen after 56 years.
- **Voyager** ([MineDojo, 2023](https://arxiv.org/abs/2305.16291)) — the Minecraft agent that accumulates a skill library of executable code, each skill admitted only after self-verification against environment feedback.
- **TextGrad** ([Nature, 2025](https://www.nature.com/articles/s41586-025-08661-4)) — textual feedback backpropagated through compound AI systems, optimizing components that include code.
- **DSPy** ([Stanford, 2024](https://proceedings.iclr.cc/paper_files/paper/2024/file/f1cf02ce09757f57c3b93c0db83181e0-Paper-Conference.pdf)) — LM pipelines optimized by teleprompters that propose instructions and score them on a devset.

Different domains, same loop: **a model proposes, an evaluator measures, a selector decides what survives.** The proposer is the easy part — every frontier model can draft plausible programs. The evaluator is engineering. The selector — *what is allowed to run next* — is where these systems differ most, and where almost everything interesting lives.

## The selector is a security boundary wearing a lab coat

Strip away the benchmarks and the selector is answering one question: *does this proposed program get authority?* DGM's archive, AlphaEvolve's database, Voyager's skill library — each is a gate between "a model emitted bytes" and "bytes become behavior."

Most implementations make that gate implicit: a Python process that happens to run whatever scored well. That works in a lab. It is a strange foundation for production, because the gate is exactly where you want the strongest guarantees — and where you get the least.

ALGAL's position is that the selection boundary should be a **contract**, not a convention:

1. **Proposals are data.** A program emits a candidate manifest (`algal.organism.v1`) as an ordinary value — through `spawn`, or by handing a manifest to the host. Proposing costs the proposer nothing and grants the candidate nothing.
2. **Admission is checked.** A candidate compiles through the same contract as hand-written manifests — typed cells, bounded ports, closed budgets, no minted capabilities. Malformed or authority-widening proposals fail at the boundary, not in production.
3. **Measurement is declared.** Foundry evaluates candidates on cases the host declared — the same cases every epoch, so "better" means better on the same ruler.
4. **Selection is host-owned.** Promotion is a host decision recorded on the receipt: which candidate, which digest, which cases it passed. "Proposal is not promotion" is written on the diagram because it is the load-bearing fact.

The loop — propose → admit → measure → select — is what the [civilization doc](/docs/civilization/) calls an epoch. It is the same shape DGM and AlphaEvolve use; the difference is that every stage has a contract and a receipt rather than a Python convention.

## Why the program must be data

There is a deeper requirement hiding under the selection boundary: **the candidates have to be inspectable objects.** You cannot meaningfully gate what you cannot cheaply examine.

DGM patches Python source; its gate is benchmark score plus human review of diffs. That works because the experiment is contained. But "program as arbitrary code" is a bad unit of selection for anything you want to trust incrementally — the diff surface is the whole language.

An ALGAL manifest is a small typed document. Diffing two candidates is diffing data. Admitting one is running a bounded checker, not auditing Turing-complete source. The candidate that cannot express the attack is cheaper to trust than the candidate that expresses everything. This is the same reason the manifest carries no host code at all — the only executable content is bounded `algal.expr.v1` evaluated under fuel by the contract's own evaluator.

It is also what makes a *population* practical: a store of manifests is a store of hashed documents — deduplicated, lineage-tracked, diffable. `algal civ` runs an epoch where an on-device ~3B model proposes plans, a host function compiles them into checked manifests, candidates run train and validation, and the winner promotes. Every step — proposal digests, case outcomes, the promoted manifest — lands on receipts that [verify offline](/tour/#fossils). The fossils are how you audit evolution after the fact.

## What stays honest

Three disclaimers worth repeating, because they are the difference between self-evolving software and a demo:

- **Exhaustion is not convergence.** A foundry epoch that promotes nothing is a valid epoch. The receipts record *that* selection happened and on what evidence — not that the best possible program was found.
- **Replay proves consistency, not improvement.** A verified receipt means the run replays bit-for-bit. Whether the promoted candidate is actually better is a question about the cases — which is why the cases are host-declared and visible.
- **The host remains the host.** Models propose. Hosts admit, measure, and select. A system where the proposer also picks the winner is not self-evolving software; it is an unreviewed code generator with extra steps.

## Where this goes

The research wave is answering "can programs improve themselves?" with an emphatic yes. The next question is the infrastructure question: *what is the substrate where proposed programs are cheap to check, cheap to measure, and safe to select?* A language where the program is data, a VM that treats runs as replayable fossils, and a selection boundary that is a contract rather than a convention — that is the bet ALGAL makes.

Read the machinery: [habitats](/docs/habitats/) · [civilization](/docs/civilization/) · [foundry spec](/docs/spec/foundry/). Or watch a program propose a child on the [tour](/tour/#grow).
