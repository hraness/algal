---
title: ALGAL vs DSPy
description: DSPy tunes the prompts and weights inside a pipeline you design. ALGAL treats the whole program as data that can be proposed, measured, and selected.
order: 2
---

# ALGAL vs DSPy

Of the tools compared on this site, DSPy is closest to what ALGAL is for, and it works at a different layer. DSPy treats language-model pipelines as programs to optimize: optimizers such as MIPROv2 search instruction and few-shot candidates against a metric, and DSPy can also tune model weights. ALGAL treats the program itself as data that can be proposed, measured, and selected, and it gives that loop a runtime, a type system, receipts, and a rule that only the host decides which program runs.

## Tuning a pipeline versus choosing one

DSPy searches the prompts inside a fixed structure. You write the module graph by hand (`ChainOfThought`, `Retrieve`, custom modules), and the optimizer searches instructions and demonstrations for each call site. You choose the program's shape; DSPy learns its parameters.

ALGAL searches over programs. A `spawn` cell or a host function emits an entire manifest, with new cells, new wiring, and new budgets, as ordinary data. The [foundry](/docs/spec/foundry/) measures candidates on declared cases, and the host promotes the winner. In one local run of `algal civ` on a Mac, an on-device model of about 3B parameters proposed plans, a host function compiled them into checked manifests, and the candidates that passed their train and validation cases were promoted, without anything leaving the machine. That run is not published as replayable evidence.

DSPy answers "given this pipeline, which prompts make it score best?" ALGAL asks "which pipeline should exist?", and keeps the answer to that second question with the host.

## How they differ

| | DSPy | ALGAL |
|---|---|---|
| What gets optimized | prompts and demonstrations inside your module graph, or model weights | whole program structure (cells, edges, budgets) |
| What you get | tuned language-model calls, usually re-embedded in Python | a content-addressed manifest: typed data identified by its digest |
| Evaluation | a metric over a devset, at compile time | declared cases at run time; foundry epochs with recorded lineage |
| Record of the result | program state after `compile` | receipts, verified by replay, for every run and candidate |
| Where it runs | your Python process and your model provider | a VM with two implementations (a Rust kernel and a TypeScript reference) |
| Who decides what runs | your metric and your code | the host, after contract checks, capability classes, and budgets |

## What they share

Both projects move away from hand-tuned prompt strings as the unit of work. DSPy made model calls composable modules; ALGAL makes the whole program a typed value with a hash. DSPy optimizes the calls, and ALGAL makes the program itself a candidate.

The two could also work together. A DSPy-style optimizer could propose the context for ALGAL cells while ALGAL's foundry searches program structure, since they operate on different parts of the same loop.

## When to choose DSPy

- You have a metric and a devset and want better prompts quickly. That is DSPy's core use.
- Your pipeline's shape is settled, and what varies is how you ask the model.
- You want a Python library with a large research community behind it ([paper](https://proceedings.iclr.cc/paper_files/paper/2024/file/f1cf02ce09757f57c3b93c0db83181e0-Paper-Conference.pdf), MIPROv2, GEPA).

## When to choose ALGAL

- You want to search over the program itself, its cells, wiring, and budgets, and not only its prompts.
- Candidates and winners need to be stored as files you can hash, replay, diff, and verify offline.
- Only a program the host accepted after measurement should run, with its lineage on the receipt. See [habitats and civilization](/docs/habitats/).
- You want the search to run where the program runs, including with an on-device model of about 3B parameters, rather than as a separate compile step.

## Status and limits

ALGAL's evolution loop is young. It runs measured program search end to end with the host choosing the winner, and [the civilization doc](/docs/civilization/) describes how an epoch runs and what its receipts record. It is not yet the optimization workhorse DSPy is. If your problem is prompt quality on a fixed pipeline, use DSPy. ALGAL exists to test whether programs can safely propose and select their own successors.

*Sources: the [DSPy paper](https://proceedings.iclr.cc/paper_files/paper/2024/file/f1cf02ce09757f57c3b93c0db83181e0-Paper-Conference.pdf) (ICLR 2024) and the [DSPy README](https://github.com/stanfordnlp/dspy), checked 2026-09-26.*
