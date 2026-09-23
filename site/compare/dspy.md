---
title: ALGAL vs DSPy
description: DSPy optimizes LM pipelines — prompts and demonstrations inside a fixed program shape. ALGAL is a language and VM where whole programs are the searchable artifact — proposed, measured, and selected under host authority.
order: 2
---

# ALGAL vs DSPy

**DSPy is the closest thing in the landscape to what ALGAL is about, and it is still a different layer.** DSPy treats LM pipelines as programs that can be *optimized* — a compiler (MIPROv2 and friends) searches instruction and few-shot candidates against a metric. ALGAL treats the program itself as data that can be *proposed, measured, and selected* — and gives that loop a runtime, a type system, receipts, and a host-owned selection boundary.

## Two kinds of "programs that improve"

DSPy's optimization space is **prompt-space inside a fixed skeleton**: you write the module graph by hand (`ChainOfThought`, `Retrieve`, custom modules), and the optimizer searches instructions and demonstrations for the call sites. The program's *shape* is yours; its *parameters* are learned.

ALGAL's evolution space is **program-space**: a `spawn` cell or a host fn emits an entire manifest — new cells, new wiring, new budgets — as ordinary data. The [foundry](/docs/spec/foundry/) measures candidates on declared cases, and the host promotes. In the recorded `algal civ` epoch, an on-device ~3B model proposed plans, a host compiled them into checked manifests, candidates passed train and validation gates, and the winner promoted — a selection cycle that never left the machine and left lineage on every receipt.

Put differently: DSPy answers *"given this pipeline, what prompts make it score best?"* ALGAL answers *"what pipeline should exist?"* — while keeping the authority to answer that second question explicitly with the host.

## Where they differ

| | DSPy | ALGAL |
|---|---|---|
| What gets optimized | prompts + demonstrations inside your module graph | whole program structure (cells, edges, budgets) |
| The artifact produced | tuned LM calls, typically re-embedded in Python | a content-addressed manifest — typed data, digest-identified |
| Evaluation | metric over a devset, at compile time | declared cases at runtime; foundry epochs with recorded lineage |
| Evidence | program state after `compile` | replay-verified receipts for every run and candidate |
| Execution substrate | your Python process + LM provider | a VM with two implementations (Rust kernel, TypeScript reference) |
| Authority boundary | metric + your code | contract-checked admission, capability classes, budgets — host selects |

## The shared insight

Both projects reject the same thing: hand-tuned prompt strings as the unit of work. DSPy made LM calls composable modules; ALGAL makes the whole program a typed, hashable value. If you believe programs should be *measured objects* rather than artisanal text, the two are philosophically adjacent — DSPy optimizes the calls, ALGAL makes the program itself a candidate.

It is also fair to say the combination is coherent: a DSPy-style optimizer could propose *contexts* for ALGAL cells, while ALGAL's foundry searches program structure. They operate on different parts of the same loop.

## Where DSPy is the better fit

- You have a metric and a devset and want better prompts fast — this is exactly what DSPy is for, and it is very good at it.
- Your pipeline shape is settled; what varies is how you ask the model.
- You want a Python library with a large research community ([paper](https://proceedings.iclr.cc/paper_files/paper/2024/file/f1cf02ce09757f57c3b93c0db83181e0-Paper-Conference.pdf), MIPROv2, GEPA) behind it.

## Where ALGAL is the better fit

- The unit of search is the program — its cells, wiring, and budgets — not just its prompts.
- Candidates and winners need to be *artifacts*: hashed, stored, replayed, diffed, verified offline.
- Selection must be a governed boundary — what runs is what a host admitted after measurement, with the lineage on the receipt. See [habitats and civilization](/docs/habitats/).
- You want evolution that runs where the program runs — including a ~3B on-device model — not a separate compile-time service.

## The honest caveat

ALGAL's evolution loop is young. It demonstrates measured, host-selected program search end-to-end — [the civilization doc](/docs/civilization/) is candid about exhaustion and what the receipts do and don't prove — but it is not yet the optimization workhorse DSPy is. If your problem is prompt quality on a fixed pipeline, use DSPy. If your question is whether programs can safely propose and select *themselves*, that is the question ALGAL exists to answer.
