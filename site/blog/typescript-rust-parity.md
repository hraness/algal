---
title: "How ALGAL keeps its TypeScript and Rust in step"
date: 2026-09-24
eyebrow: Technique
description: "ALGAL runs the same programs through its TypeScript runtime and its Rust runtime on every CI run, and fails if any compared field differs or either one rejects the other's run record."
---

An ALGAL program can start in one runtime and finish in another. The TypeScript runtime, which runs on Bun, can create a process that waits for an approval, and the native Rust runtime can pick it up from the same local store after the first process has exited. That handoff works only if both runtimes mean the same thing by every program, every error, and every record they write. ALGAL keeps them in step by running the same programs through both on every change and failing the build on any difference. Each runtime also has to accept the other's record of the run, so neither one serves as the answer key.

**Status:** Preview. ALGAL is working prerelease software for workflows your own host application controls, and its native packages are unsigned and not notarized.

## Two versions of the same program drift apart

A second implementation is easy to produce now. A model ports a library to a faster language in an afternoon, the tests that came with the original pass, and the port ships. This is vibe-coded slop at its most convincing: it looks finished, it handles the examples, and it disagrees with the original somewhere nobody looked. Anything built on it assumes the two versions are interchangeable, and that assumption has never been checked.

The disagreements are small. One version sorts text slightly differently. One rejects a malformed value that the other quietly accepts. One counts the length of a string with an emoji in it as 2 and the other as 4. Each difference stays invisible until a user moves work from one runtime to the other and gets a different answer, or a record that the second runtime refuses to read.

ALGAL depends on those two versions agreeing. A run's record is meant to be checkable by someone other than the machine that produced it, and a paused process is meant to be resumable elsewhere. If the two runtimes disagree about what a program did, both promises break at once.

## What agreement buys you

The fix is to make disagreement impossible to ship. Keep both implementations, run them side by side on the same inputs, and fail the build on the first field that differs. Then ask each runtime to verify the record the other one wrote. The comparison catches a difference in output, and the cross-check catches a difference in how each runtime reads records back.

With that running on every change, a user can pick either runtime for any program in the test set and get the same outcome, the same values, the same errors, and the same accounting of work. Moving a process from one runtime to the other is an ordinary resume.

## Running every example through both runtimes

ALGAL has a TypeScript reference runtime and a native Rust runtime. The main parity script takes every committed example program, plus programs compiled from ALGAL's readable source language and two multi-file source projects, and runs each one through both. The TypeScript side runs in process. The Rust side runs as the command-line binary built from the same commit, so the test drives the same commands a user runs rather than an internal library call.

Both runtimes get the same compiled program, the same arguments, and the same scripted model responses. No live model or provider is called, so the runtimes are the only thing that can vary between the two runs.

The script then compares a fixed list of fields from the two run records, each written as canonical JSON, a single agreed spelling for every value:

```ts
// Every one of these must match exactly, or the case fails.
const fields = ["manifestDigest", "manifestKey", "args", "outcome",
                "cells", "effects", "events", "work", "failure"];
const differs = fields.filter(f =>
  canonicalize(native[f] ?? null) !== canonicalize(reference[f] ?? null));
```

Those fields include the order of events, the effects the program requested, the work budget each step spent, and, when a run fails, the reason it failed.

### Each runtime checks the other

Once the fields match, the script hands the Rust runtime's run record to the TypeScript verifier and the TypeScript run record to the Rust verifier. Both must accept. It also asks the Rust binary for the program's content digest and requires it to equal the one the TypeScript runtime computed.

If the Rust runtime wrote a record that only Rust could read back, the TypeScript verifier would reject it. If the TypeScript runtime computed a program's identity in a way Rust did not, the digest check would fail. The comparison shows that both runtimes did the same thing, and the cross-check shows that each accepts the other's record of it. [Receipts are the fossil record of an execution](/blog/receipts-fossil-record/) covers how a record is replayed offline; the parity scripts use that same verifier on both sides.

For source projects, the script also packs the project into a portable bundle, calls that bundle through the Rust binary without the source loader, and requires the outputs to match what the TypeScript runtime produced.

## Refusals have to match too

A port that accepts input the original rejects has diverged, even when its answer looks reasonable. A separate parity script covers the JSON schemas that describe what a model is allowed to return. Each case in a fixed list has a schema, a value that should pass, and a value that should fail. Both runtimes must complete on the good value, fail on the bad one, and fail with the same error code. A second set of cases feeds a bad value in as a program input and requires both runtimes to stop with the same type error before any model call is made.

Another script checks that a handled failure costs the same in both runtimes. A step divides by zero, and a recovery step is wired to run when it fails. With a work budget of 10,000 units, both runtimes must run the recovery. With a budget of one unit, both must stop at the failing step with a budget error and never start the recovery. Recovery costs work, and the two runtimes must run out of budget at the same step.

## Where the two languages disagree by default

Two cases in the schema list look pointless: a schema whose property names are an emoji and a private-use character, and one whose property names are `"2"` and `"10"`. They are there because JavaScript and Rust order both pairs differently by default.

JavaScript compares strings by UTF-16 code units. An emoji is stored as two surrogate units that start below the private-use range, so in JavaScript the emoji sorts first. Rust compares strings by bytes or code points, where the emoji comes after. JavaScript objects also list keys that look like array indexes, such as `"2"` and `"10"`, in numeric order before any other key, whatever order they were added in. So `JSON.stringify` on the TypeScript side always writes `"2"` before `"10"`, while a plain string sort puts `"10"` first.

Canonical JSON works only if both runtimes write the same bytes, so ALGAL's Rust side reproduces JavaScript's order on purpose:

```rust
// Index-like keys first, in numeric order; then UTF-16 code-unit order.
fn key_order(a: &str, b: &str) -> Ordering {
    match (array_index(a), array_index(b)) {
        (Some(a), Some(b)) => a.cmp(&b),
        (Some(_), None) => Ordering::Less,
        (None, Some(_)) => Ordering::Greater,
        _ => a.encode_utf16().cmp(b.encode_utf16()),
    }
}
```

ALGAL's expression language makes the same choice: string comparison uses UTF-16 order, and string length counts UTF-16 code units, so an emoji has length 2 in both runtimes. The parity tests hold these rules in place. Without them, a cleanup on either side could switch to that language's natural order and nothing else would notice.

## One evaluator where two would be a liability

The expression language that programs use for arithmetic, conditionals, lists, and string handling has one implementation, written in Rust. The native runtime compiles it in directly, and the TypeScript runtime loads the same code compiled to WebAssembly. The crate's own documentation says the point is that there is no second implementation to keep in step.

Parity testing is worth its cost where two implementations give you an independent check, as they do for record handling, process lifecycles, and verification. For a small pure evaluator, a second copy would add another place to disagree without adding much independent evidence. Sharing one evaluator removes that class of drift, and the parity scripts still exercise it from both hosts.

## The rest of the lifecycle

The main script covers single runs. Sibling scripts apply the same method to the parts of ALGAL that outlive a run:

- **Processes.** Durable processes are created, suspended, resumed, and exported through both runtimes, and every emitted record and digest must match. One leg plants an interrupted creation marker, with its record digest computed on the TypeScript side, into both stores and requires the Rust runtime to accept it, so Rust has to accept a digest it did not compute.
- **Applications.** One durable application lifecycle is replayed through the TypeScript services and the native application commands, and every digest and record must be identical.
- **The store and the command line.** Storage and listing commands, and the public commands including failed and suspended runs, are compared record by record along with their exit status.

The CI workflow's Native VM job builds the Rust binary and runs these scripts, along with sibling parity scripts for inference, compilation, and mailboxes, on Ubuntu and on macOS for every pull request and every push to the main branch.

## Limits

Parity shows that the two runtimes agree. If both implement a rule the same wrong way, every comparison passes. The tests cover only the programs, schemas, and lifecycles in their lists; a program shaped unlike any of them has not been compared. Model calls are scripted, so these checks say nothing about live providers or model quality. The shared expression evaluator gets no second opinion from parity, since both runtimes run the same code. Neither does the application query engine: the TypeScript leg of the application parity script calls the native engine as a subprocess, so that comparison checks the lifecycle around the engine, not two separate engines. The broader argument for ALGAL, and the evidence it still needs, is in [Software that accumulates competence](/blog/software-that-accumulates-competence/). For the same method across other Hraness products, see [Two implementations, one spec](https://hraness.com/reference/correctness/two-implementations-one-spec).
