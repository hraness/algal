# Software that accumulates competence

ALGAL is built on one bet: a computer can accumulate tested ways of acting,
not only produce new answers or new code. A model proposes a bounded,
executable procedure. The procedure is checked, measured on declared cases,
kept with its evidence, composed into larger procedures, and revised under
explicit rules. Useful work should leave the computer with a more capable,
reusable way of doing the next piece of work.

This page states that bet, names the mechanisms in ALGAL that make it
testable, describes what it could make possible, and says what evidence would
be needed before anyone calls it proven. The
[lineage page](lineage.md) places the idea among the systems it resembles.

## Two models of software

In the familiar model, a person or an AI acting as a programmer writes an
implementation. The implementation is the product. Improving it is a separate
development activity that starts again from the source.

In the model ALGAL explores, the product includes an organized process for
discovering, evaluating, retaining, and recombining better implementations.
The implementation running today is one selected result of that process, not
the final definition of the system.

That changes the unit of software. The interesting unit is no longer a
program that does a thing. It is a reusable procedure, together with evidence
about when it works and a process for improving it.

Consider a system asked to investigate recurring billing complaints. At first
a general agent works through each case from scratch. Through evaluation, the
system settles on a procedure: retrieve the relevant transaction records,
separate missing evidence from contradictory evidence, calculate discrepancies
with ordinary arithmetic, and escalate only the ambiguous cases. The important
output is not the answer to one complaint. It is the method. The method
becomes a component. A later procedure calls it inside a larger investigation.
A successor improves its evidence retrieval. Another keeps its accuracy while
making fewer model calls. The system is no longer only completing tasks. It is
turning completed work into durable operational capability.

## Four properties that make the bet testable

ALGAL is an application virtual machine and a language, not a new kind of
processor or an operating system. The ambition lives at the level of the
programming environment and the software lifecycle. Four properties of the
design give the bet a concrete form.

### Successful reasoning can become reusable structure

An ALGAL program, called an organism, is typed data with declared limits. It
has a content-derived identity and a declared interface, so one program can
call another by digest. A larger, open-ended agent can use an organism as a
typed tool once a sub-problem is well formed.

After an AI spends real effort working out how to reconcile two awkward data
sources, there are several things a system could keep: the conversation, a
prose summary, the reconciled output, or an executable reconciliation
procedure. Only the last one can be tested against new inputs, inspected,
called by another program, and revised independently of the conversation that
produced it. Discovering a method and executing an established method become
different activities.

The hard step is converting exploratory work into procedures that transfer.
Saving a transcript does not do that. Packaging an overfit script and calling
it a skill does not either. When the conversion works, competence grows
outside the model's weights, and a fixed model can take part in an environment
that keeps getting more capable.

### The representation is designed to be generated and transformed

A program representation decides which changes are easy to propose, inspect,
compare, and constrain. ALGAL manifests carry no host-language code. They
contain a bounded graph of typed cells and, where needed, bounded expressions
that the contract's own evaluator runs under a fuel limit. The civilization
loop narrows generation further: the model proposes a short plan, and a
deterministic host compiler builds the manifest from it.

Hand-written and model-generated procedures enter the system as the same kind
of object, through the same checks. The model proposes inside a structured
space while the compiler and runtime enforce the contract. A narrower
representation excludes some solutions, and it does not make program synthesis
easy. It does pose the design question ALGAL is organized around: what
representation makes useful software easy enough to generate and constrained
enough to evaluate and operate? Progress here may come less from a new search
algorithm than from the right medium for search.

### AI supplies judgment; ordinary computation supplies discipline

ALGAL separates model effects from pure computation. A model call is a typed
cell that declares the context it may see, the output shape it must return,
and its budget. Routing, matching, arithmetic, and validation are ordinary
dataflow around it. The rule is to use a model where a judgment must be
inferred and explicit computation where a procedure can be specified.

In a mature system, evaluation might show that a particular model call is
unnecessary. A calculation replaces it. A small classifier handles the common
cases while a more capable model handles the hard ones. A free-form decision
becomes a deterministic rule once its scope is understood. The system becomes
more capable while spending less unconstrained reasoning on familiar work.
That is a hypothesis about the design, not a measured ALGAL result. It also
names the economic condition for repeated workloads: expensive exploration has
to produce cheaper later execution, at the same accuracy, by enough to repay
the search and maintenance cost.

### Evidence and permission are part of the mechanism

The foundry, ALGAL's selection contract, does more than collect candidate
outputs. It ties candidate identities, per-case results, resource accounting,
selection, and verification together. Selection cases and holdout cases are
kept apart, and the previous winner carries into the next generation.

ALGAL also separates proposing a successor from permitting its use. A program
cannot promote itself or install new capabilities. The host makes those
decisions and records them. A system cannot accumulate improvements reliably
unless it can tell what changed, what was tested, what happened, and who
permitted the change. Provenance and admission are not enterprise features
added after the interesting part. They are the conditions that make cumulative
change governable.

A replayable receipt establishes that the recorded execution is internally
consistent. It does not establish the truth of an external claim or the
correctness of the evaluator, and interpreting a bounded manifest does not
isolate the host's tools. The idea is structured experimentation with retained
evidence and controlled adoption, not self-modification without limits.

## The interesting outcome is cumulative construction

A population that keeps generating slightly different workflows is not
transformative on its own. It could be an expensive optimizer that never
produces lasting value.

The larger possibility is cumulative construction: a useful method becomes a
building block, and that building block makes more complex methods easier to
discover. A reliable way to compare two records becomes part of a discrepancy
detector. The detector becomes part of a reconciliation process. The process
becomes part of an operational monitoring system. The question that matters is
whether each successful acquisition lowers the cost of the next one.

Generation produces possibilities. Selection filters them. Composition is what
could let the resulting competence compound. ALGAL's habitat design describes
populations of programs that invoke one another and contribute new candidates.
The existence of those mechanisms does not establish that useful cumulative
construction will emerge from them. That distinction marks the research
opportunity.

It also exposes a problem with keeping only today's best performer. A weaker
candidate may be tomorrow's useful component. The Darwin Gödel Machine authors
report cases where weaker ancestors were the stepping stones to stronger
descendants, which argues for diversity and reusable components over a single
winner.

## What this could make possible

These are extrapolations. ALGAL has not demonstrated them.

**A personal computer that learns procedures, not only preferences.** A
personalized assistant remembers that you prefer a format. A procedural
computer also keeps a tested method for producing that format from your
sources, with the checks and approval points you set. Preparing a recurring
project review becomes an inspectable procedure: gather the accepted inputs,
reconcile changed figures, flag missing evidence, build the draft, stop before
publication. The difference is between remembering what you like and holding a
reliable method for helping you do it, which you can inspect, revise, and
revoke.

**Business software whose procedures adapt without silently changing their
rules.** An internal system meets a changed input format or an unfamiliar
exception. Instead of failing, or letting an unconstrained agent improvise in
production, it proposes a revised procedure, evaluates it against past and new
cases, and submits it for controlled activation. ALGAL's
[application contract](../spec/v1/application.md) already distinguishes memory
changes, candidate proposals, procedure activation, and schema migration. The
objectives and permissions of such a system must not drift along with its
implementation. Finding a better way to do the approved task is different from
redefining what counts as success.

**A shared library of executable expertise.** A reusable procedure travels
with its exact version, interface, required capabilities, evaluation
conditions, and recorded evidence. That is more informative than a prompt and
more operational than a written explanation. One team's method becomes another
team's starting point, and variants specialize for different workloads instead
of competing to be the one best procedure. ALGAL's manifests and evidence
contracts are components of that possibility. A public ecosystem, portable
trust, and automatic cross-domain transfer do not exist yet.

Across all three, the shift is the same: software development becomes partly
the design of environments in which procedures are discovered, tested,
retained, and governed. Human engineering does not disappear. More of its
effort moves toward defining interfaces, constraints, evaluators, and the
conditions for accepting change.

## What would justify the claim

A demo in which a program generates another program is too weak. The
decisive evidence would show that accumulated procedures make the system
better at later work than equally resourced alternatives.

The current evidence should be read carefully. The civilization demo's
built-in goals are small tasks such as greeting, doubling, inversion, and
capitalization. The [adaptive inventory](adaptive-inventory.md) application
exercises a richer lifecycle with authored deterministic proposals and no model
calls. Both demonstrate mechanisms. Neither is evidence of broad autonomous
software evolution.

The experiment to run is a cumulative-skill test:

1. Choose a family of substantial, recurring tasks.
2. Let the system acquire procedures on an initial set.
3. Introduce related but unseen tasks and environmental changes.
4. Compare against a strong fixed agent, an agent that synthesizes fresh
   solutions without a retained library, and a conventional workflow with an
   optimizer, all with the same models, information, tools, and comparable
   total budgets.
5. Run the most important ablation: the same system with and without access
   to its accumulated procedures.
6. Measure success on held-out work, total cost per successful task, human
   correction effort, and whether earlier components contribute to later
   capabilities. Count the cost of generating candidates, running evaluations,
   and maintaining the library, not only the final execution cost.

For repeated tasks the condition is that future execution savings exceed the
combined search, evaluation, and maintenance cost, at comparable quality and
acceptable risk.

Three failure modes deserve specific investigation:

- **Evaluation rewards the wrong thing.** A candidate can beat its competitors
  and still be bad, and a test suite can be internally consistent while poorly
  representing deployment. The [search contract](../spec/v1/search.md) states
  that verification does not establish representative cases or prevent
  overfitting to visible evidence.
- **Reuse creates complexity rather than competence.** A growing library can
  become hard to search, fill with duplicates, and accumulate incompatible
  assumptions. Two components that pass their own tests may not compose.
- **Apparent learning is extra spending.** A system with more attempts, better
  tools, or privileged evidence has not shown a better architecture.

A compelling result would read: under a fixed model and a controlled budget,
retaining and composing earlier procedures measurably improves performance on
later unseen tasks, and the improvement survives independent evaluation.

## Status and limits

ALGAL has a distinctive synthesis: one data-only program and evidence
contract joins generation, admission, execution, selection, and offline
verification across a Rust kernel and a TypeScript runtime. That synthesis is
defensible as a description of the architecture. Two stronger claims are not
established: that ALGAL is the first system to combine these capabilities, and
that it is a better foundation for adaptive software than the alternatives.
The second is an empirical proposition that needs the comparative evidence
described above. The first is not needed for the second to matter.

The [lineage page](lineage.md) lists the traditions and research results
this work builds on, and [What distinguishes ALGAL](why-unique.md) gives the
concrete comparison with neighboring systems. The
[habitats](habitats.md), [civilization](civilization.md), and
[programmable applications](programmable-applications.md) pages describe the
mechanisms that exist today and what each one has and has not shown.

[The thread through hraness](https://hraness.com/writing/the-thread-through-hraness),
an essay on hraness.com, places this bet among the other Hraness projects,
which share the same commitments to owned material, recorded work, and
explicit permission.
