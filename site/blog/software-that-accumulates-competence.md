---
title: "Software that accumulates competence"
order: 0
date: 2026-09-23
description: ALGAL bets that a computer can keep tested procedures, combine them, and get better at later work. The thesis, how to test it, and what would settle it.
---

# Software that accumulates competence

ALGAL bets that a computer can accumulate tested ways of acting, so that doing useful work leaves it with a better, reusable way to do the next piece of work. That is a narrower claim than "AI writes software", which every frontier model can already do in draft form. It is also not established: ALGAL has the mechanisms, and this post ends with the experiment that would show whether they work. The [vision page](/docs/vision/) has the full argument.

## Two ways to think about software

In the familiar model, a person or an AI acting as a programmer writes an implementation. The implementation is the product. Improving it is a separate development activity that starts again from the source.

In the model ALGAL explores, the product includes an organized process for discovering, evaluating, retaining, and recombining better implementations. The implementation running today is one selected result of that process, not the final definition of the system.

The unit of software changes too: a reusable procedure, evidence about when it works, and a process for improving it.

Picture a system asked to investigate recurring billing complaints. At first a general agent works through each case from scratch. Over time, evaluation settles on a procedure: pull the transaction records, separate missing evidence from contradictory evidence, compute discrepancies with arithmetic, and escalate only the ambiguous cases. The valuable output is not the answer to one complaint. It is the method. A later procedure calls it inside a larger investigation. A successor improves its retrieval. Another keeps its accuracy with fewer model calls. The system has turned completed work into durable capability.

## Four design properties that make the bet testable

ALGAL is a language and an application VM, not a new processor or an operating system. The bet is about the programming environment and how software changes over time, and four design properties make it concrete enough to test.

**Reasoning can become reusable structure.** An ALGAL program, called an organism, is typed data with declared limits, an identity derived from its content, and a declared interface. One program calls another by digest. After an AI works out how to reconcile two awkward data sources, the thing worth keeping is not the transcript or a summary. It is an executable reconciliation procedure that can be tested on new inputs, inspected, called, and revised on its own.

**The representation is built to be generated.** Manifests carry no host code. They hold a size-limited graph of typed cells and, where needed, short expressions that the contract's own evaluator runs under a fuel limit. Hand-written and model-generated procedures enter through the same checks. The model proposes inside a structured space; the compiler and runtime enforce the contract. The design question ALGAL is organized around is what representation makes software easy enough to generate and constrained enough to evaluate and operate.

**AI supplies judgment; ordinary computation supplies discipline.** A model call is a typed cell that declares the context it may see, the output shape it must return, and its budget. Everything around it is dataflow. The rule is to use a model where a judgment must be inferred, and ordinary code where the procedure can be written down. The hoped-for consequence, which is a hypothesis and not a measured result, is a system that grows more capable while spending less unconstrained reasoning on familiar work.

**Evidence and permission are part of the mechanism.** The foundry ties candidate identities, per-case results, resource accounting, selection, and verification together, and keeps holdout cases apart from selection cases. A program cannot promote itself or grant itself capabilities. The host decides, and the foundry's report records the decision. A system cannot accumulate improvements reliably unless it can say what changed, what was tested, what happened, and who allowed it. Recording where each change came from, and checking it before it runs, is what keeps accumulated change under control.

## Composition is the result that would matter

A population that keeps generating slightly different workflows is an optimizer, and possibly an expensive one. The larger possibility is cumulative construction: a useful method becomes a building block, and the block makes more complex methods easier to discover. A reliable record comparison becomes part of a discrepancy detector, which becomes part of a reconciliation process, which becomes part of monitoring. The question is whether each acquisition lowers the cost of the next.

Generation produces possibilities. Selection filters them. Composition is what could let competence compound. ALGAL has mechanisms for all three. It has not shown that cumulative construction emerges from them, and that gap is where the research lives.

## What would settle it

A program that generates another program is not evidence. The decisive result would show that accumulated procedures make the system better at later work than equally resourced alternatives. Choose a family of substantial recurring tasks. Let the system acquire procedures on an initial set. Introduce unseen related tasks. Compare against a strong fixed agent, an agent that synthesizes fresh solutions without a library, and a workflow with an optimizer, under the same models, tools, and budgets. Run the one ablation that matters: the same system with and without access to what it accumulated. Count the cost of search, evaluation, and library maintenance, not only execution.

Today's demos run the mechanisms on small goals with scripted or deterministic proposals. They show that the machinery works, not that software evolves on its own.

## Where the idea comes from

This is not a new way to think about computers so much as an extension of an old one. Lisp made code into data. Emacs made the environment programmable from within. Smalltalk made the environment a medium for thought. Urbit explored persistent computational territory. Engelbart asked how tools improve the making of tools. ALGAL asks whether an AI can use such an environment to evolve its own methods under evidence, and whether the result stays understandable and changeable by the person who owns it. The [lineage page](/docs/lineage/) traces each connection and the research results the bet builds on.

Read the thesis in full on the [vision page](/docs/vision/), then the mechanisms: [habitats](/docs/habitats/), [civilization](/docs/civilization/), and [programmable applications](/docs/programmable-applications/).
