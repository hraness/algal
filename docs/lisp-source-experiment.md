# Lisp-shaped source experiment

Status: scaffolded, 2026-10-06. This experiment is a decision input for the
north-star language direction. It does not change the runtime, manifest
contract, or production source language.

The question is narrow: does a live, Lisp-shaped authoring surface make ALGAL
programs faster for a person or model to change and repair while preserving
ALGAL's bounded semantics, inspectable expansion, cross-runtime parity, and
replayable evidence?

The incumbent is the current `.algal` source language. The treatment is a small
parenthesized language with symbols, literals, `let`, `if`, records, arithmetic,
and hygienic-looking macros. Both must lower to the same `algal.organism.v1`
manifest and the same pure `algal.expr.v1` cells. The treatment must never gain
ambient evaluation, unbounded recursion, hidden effects, or authority through
syntax.

## Protocol

Freeze a task set of at least ten small programs drawn from existing source
examples. For each task, create equivalent incumbent and treatment programs,
then ask the same model or developer to perform the same sequence of bounded
edits, including one deliberate error repair and one semantic change. Record:

- wall time from edit to useful diagnostic;
- source bytes and model token count;
- diagnostic location and repair attempts;
- expansion size and digest;
- compile and check time;
- manifest and receipt digest equality;
- replay verification time;
- whether a reviewer can explain the generated expansion;
- total source plus maintenance cost after the edit sequence.

Use paired tasks and the same machine, toolchain, prompt budget, and fixture
inputs. Report medians and individual task results. A treatment result is
`insufficient evidence` if it compiles fewer than 90% of incumbent tasks, loses
receipt parity, or has fewer than ten paired tasks.

## Decision gate

Adopt a Lisp-shaped source surface only if it improves median verified iteration
time by at least 20%, keeps parity on every accepted task, and does not increase
repair attempts or expansion-review failures by more than 10%. If it improves
only source compactness, keep the current syntax and borrow macros or a live
workbench selectively. If it improves the interactive repair loop but not batch
source metrics, prioritize a debugger/condition interface rather than a new
language. If it fails the gate, record the negative result and keep the current
source direction.

The current runner in `experiments/lisp-source/` is a scaffold. It measures the
first fixture and proves deterministic expansion identity; `runtimeParity` is
intentionally pending until the parser and lowering are implemented.
