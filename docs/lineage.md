# Where ALGAL comes from

ALGAL belongs to a tradition of computing as a medium you can reshape from
within, rather than a set of finished applications you operate. Lisp, Emacs,
Smalltalk, and Urbit approach that idea from different directions. ALGAL adds
a question none of them asked: what happens when generating, evaluating, and
retaining new procedures becomes part of the environment, with an AI as a
disciplined participant.

This page is a reference for that lineage and for the research results the
[vision](vision.md) depends on. The resemblances are convergent, not a claim
that ALGAL's design was derived from each source. Sources were consulted on
2026-09-23.

## Four traditions and one addition

| Tradition | What it established | What ALGAL takes from it |
| --- | --- | --- |
| Lisp | Programs and data share one manipulable symbolic representation. | A program is a value: an ALGAL manifest can be inspected, hashed, composed, generated, and checked before it runs. |
| Emacs | The working environment is programmable from inside itself. | Using the computer and changing it belong to the same activity. A procedure a program proposes can become part of the environment. |
| Smalltalk and Alan Kay | Computing is a live medium for modeling and thought, not an application launcher. | Toolmaking should be an ordinary part of using the computer, and the result must stay understandable and changeable by its user. |
| Urbit | A personal computational world with stable identity, persistent state, and deterministic replay. | Accumulated procedures need somewhere durable to live. Recorded effects let orchestration replay without repeating them. |
| Engelbart | Bootstrapping: use the tools you build to improve your ability to build better tools. | Useful work should produce better procedures, and better procedures should make later toolmaking more effective. |

The two additions that separate ALGAL from a familiar live environment are
AI-driven proposal generation with evaluation, and explicit evidence, testing,
rollback, and permission boundaries. Without them the system is a
programmable environment. With them it becomes an environment where an AI can
propose changes to its own tools, representations, and procedures while
remaining accountable to tests, observations, and constraints. That is managed
computational evolution, not unrestricted self-modifying code.

A compressed statement of the lineage:

> Lisp made code into data.
> Emacs made the environment programmable from within.
> Smalltalk made the environment a medium for thought.
> Urbit explored persistent computational territory.
> ALGAL asks whether an AI can use such an environment to evolve its own
> methods under evidence.

## Lisp: instructions become material the system can work with

John McCarthy's 1960 paper
[Recursive Functions of Symbolic Expressions and Their Computation by Machine](https://www-formal.stanford.edu/jmc/recursive.html)
represents functions as symbolic expressions and defines an evaluator that
operates on them. The consequence that matters here is not the notation. It is
that a program can construct and transform a representation of another
program. McCarthy also framed Lisp as infrastructure for experiments with the
Advice Taker, so the pairing of AI with programs-as-data is as old as the
language.

ALGAL's manifests have the related property. They are data the host can
inspect, hash, compose, generate, and check for admission. The extension ALGAL
explores is not programs manipulating programs. It is programs proposing
alternatives that an evaluation process can select among. ALGAL is not an
unrestricted reflective Lisp environment: an organism, the spec's name for an
ALGAL program, cannot rewrite its own manifest or the runtime. It proposes
successors that the host may admit. Lisp supplies a precedent for the
material; ALGAL supplies a discipline for generating and selecting things made
from it.

## Emacs: using the tool and extending it are one activity

Emacs has a Lisp interpreter at its core. You add commands in Emacs Lisp and
evaluate expressions inside the working environment, as the
[Emacs Lisp reference manual](https://www.gnu.org/software/emacs/manual/html_node/elisp/)
describes. You do not leave the tool to extend what it does. A repetitive task
becomes a command, the command becomes part of your daily environment, and
later you modify or combine it. The boundary between user and toolmaker is
permeable.

Emacs assumes a human programmer remains the primary agent of change. ALGAL
asks what happens when an AI becomes a disciplined co-maintainer of the
environment. A hypothetical interaction, not a shipped ALGAL interface: you
demonstrate how you prepare a project review, the system proposes a reusable
procedure, you inspect its inputs and approval points, test it against past
examples, and keep it. Later it proposes a revision that handles an exception
you hit. The lasting result is a new capability in your environment, not a
helpful conversation.

The important word is helps. Letting an AI inject arbitrary code into a
fully programmable environment does not produce reliable adaptation. ALGAL's bounded
programs, explicit effects, and host-owned permissions address how proposed
extensions enter the system and what they may do. An Emacs-style interface
could sit on top of an ALGAL-style execution and evaluation layer.

## Alan Kay and Smalltalk: the computer as a personal medium

In [Personal Dynamic Media](https://www.newmediareader.com/book_samples/nmr-26-kay.pdf)
(1977), Alan Kay and Adele Goldberg described a metamedium: a medium that can
support other media, including ones its designers did not anticipate. Among
its goals was a system that would "allow ordinary users to casually and easily
describe their desires for a specific tool." Kay's
[The Early History of Smalltalk](https://dl.acm.org/doi/10.1145/155360.155364)
(1993) records the biological influence on Smalltalk's objects: recursively
composable behavioral units that communicate through messages and hide their
internal machinery.

AI offers a new route across the gap between having an intention and holding
an executable tool. Generating the first version is only part of crossing that
gap. Understanding it, correcting it, testing it, and keeping it useful are the
rest. The ambition this suggests is stronger than asking an AI to build an
app: make toolmaking an ordinary part of using the computer.

Two cautions apply. Kay's cell analogy concerns how to organize a complex
system from interacting parts. ALGAL's evolutionary proposal concerns
generating alternative programs and choosing which to keep. The ideas fit
together, but ALGAL's graph cells are not Smalltalk objects under another
name. And there is a test any successor to this tradition has to pass: does
the AI make the environment more understandable and changeable by its user, or
does it produce an opaque system only the AI knows how to operate? A person
should be able to ask what a procedure is, what it accesses, why this version
was selected, and how to change, compare, or undo it. That is a design
requirement at the center of ALGAL, not a dashboard added afterward.

## Urbit: a coherent, persistent computational world

[Urbit](https://docs.urbit.org/) aims at a personal server operating system
running in a virtual machine. Its Arvo kernel treats state as a deterministic
function of a recorded event log, with Hoon and Nock as the language and
execution layers. The attraction is that your computer becomes an ongoing
computational world with continuity, rather than a temporary arrangement of
running processes.

That matters to ALGAL because accumulated procedures need somewhere to live. A
system that discovers a useful method but loses its identity, dependencies,
state, or history has not accumulated much. There is a concrete architectural
resemblance: ALGAL records model and tool effects so that orchestration can be
reconstructed without invoking them again, and its programs and execution
records move between its two runtimes.

Deterministic replay does not make AI reasoning deterministic. In ALGAL a
model response is an external result that is recorded. Replay reuses that
result. Asking the model again is a new event that may produce something
different. That is how nondeterministic judgment coexists with a reproducible
execution history. The scope also differs: Urbit is an operating system
project, and ALGAL is an application VM. Urbit asks how a computational world
stays coherent. ALGAL asks how a computational world changes without losing
coherence.

## Engelbart: bootstrapping

Douglas Engelbart's 1962 report
[Augmenting Human Intellect: A Conceptual Framework](https://www.dougengelbart.org/content/view/138)
describes bootstrapping: use the tools you build to improve your ability to
build better tools. His emphasis was on human and collective capability,
including the practices around the technology, not autonomous machine
self-modification.

Applied to ALGAL, the loop is: useful work produces better procedures, better
procedures improve the ability to do useful work, and perhaps the ability to
develop further procedures. The last step is the strong one. A system that
generates a new script is ordinary. A system whose retained methods make later
toolmaking more effective is a much stronger proposition, and a hypothesis to
demonstrate rather than a consequence of making programs self-referential.

## Research precedents

The claim that nobody has thought of evolving AI programs would not survive
scrutiny. These results establish that several of the necessary mechanisms
can work, which rules out an overly broad originality claim and makes the
larger vision more credible at the same time.

| Precedent | What it established |
| --- | --- |
| [Genetic programming](https://mitpress.mit.edu/9780262111706/genetic-programming/) (Koza, 1992) | Searching for executable programs by evolutionary methods has a long history. |
| [DreamCoder](https://arxiv.org/abs/2006.08381) (Ellis et al., 2020) | A system can learn reusable program abstractions and build later concepts from earlier ones. |
| [DSPy](https://arxiv.org/abs/2310.03714) (Khattab et al., 2023) and [GEPA](https://arxiv.org/abs/2507.19457) (Agrawal et al., 2025) | Modular language-model programs can be optimized against examples and evaluation metrics. |
| [Automated Design of Agentic Systems](https://arxiv.org/abs/2408.08435) (Hu et al., 2024) and the [Darwin Gödel Machine](https://arxiv.org/abs/2505.22954) (Zhang et al., 2025) | Agents can generate and evaluate new agent implementations, using archives of earlier designs to guide further improvement. Weaker ancestors were sometimes the stepping stones to stronger descendants. |
| [AlphaEvolve](https://deepmind.google/blog/alphaevolve-a-gemini-powered-coding-agent-for-designing-advanced-algorithms/) (DeepMind, 2025) | Model-guided evolutionary program search can produce useful algorithmic improvements, including ones deployed in computing infrastructure. |
| [Temporal](https://docs.temporal.io/workflows) and [LangGraph](https://docs.langchain.com/oss/python/langgraph/persistence) | Durable execution, retained histories, checkpointing, and human-interruption workflows are established capabilities. |

The novelty question is therefore architectural rather than algorithmic:
whether ALGAL organizes these mechanisms around a common abstraction that
makes building evolvable software qualitatively easier. The project's position is
that the same small program and evidence contracts join evolution, execution,
and offline verification across its TypeScript and Rust runtimes, and that a
comparable design could be built on other workflow systems. The
[comparison page](why-unique.md) gives the concrete differences, and the
[vision](vision.md) states what evidence would settle the question.
