# Building larger programs

ALGAL programs grow through explicit calls to reusable programs. Each child
has named inputs and outputs, a content-derived identity, and execution limits.
The caller supplies its inputs and pays for its work. This makes it possible to
inspect a larger program one part at a time and replace a part through the
application's revision and evaluation process.

This page explains how to organize that code today and the proposed additions
needed for larger libraries. The [vision](vision.md) states the broader goal;
the [lineage](lineage.md#composition-and-durable-change) records relevant
language and architecture precedents.

## Keep source and execution separate

The `.algal` language is an authoring layer. It compiles to the
`algal.organism.v1` manifest, the data representation of an ALGAL program,
called an organism in the specification. Both TypeScript and Rust execute
that representation. Source locations, comments, and compiler information
are available separately for inspection. The native CLI executes compiled
programs; it does not parse source.

A source file contains one program. Relative imports bind names to child
programs, `call` passes named arguments, and `each` applies a child to a list
with an explicit item limit. The compiler checks the declared inputs, rejects
import cycles, and collects the child manifests needed to run the program.
The [source language guide](source-language.md#reuse-a-local-program) describes
these operations and the portable bundle format.

The source language accepts `text` and `json` parameters and results. It checks
known text/JSON mismatches, but a JSON parameter does not describe all its
fields statically. Full manifests offer additional port kinds and a limited
JSON schema subset. Field types, collection constraints, and errors need
explicit validation where the language cannot express them.

## Factor around the work

The [task-planning project](../examples/source/projects/task-planning/README.md)
separates a batch of tasks from planning one task. The single-task program
calls separate scoring, action selection, and presentation programs. Scoring
calls the same pure clamp helper twice. Each call supplies its data; the
helper cannot read another binding from its caller.

This is a useful shape for a larger application:

| Part | Responsibility |
| --- | --- |
| Domain programs | Validate and transform domain data; compute decisions and presentation data from declared inputs. |
| Application update and view | Turn an accepted action into the next state and effect intents; derive visible content and enabled actions from a captured state. |
| Host adapters | Persist data, protect concurrent writes, execute allowed effects, and supply recorded environmental signals. |
| Renderer and session | Manage navigation, drafts, focus, composition, and platform widgets under an explicit save policy. |
| Revision and evaluation | Compare candidate behavior, preserve data, and decide when a successor may become active. |

These responsibilities need not correspond to five files or processes. Keep
related logic together until a reusable concept has a clear input, result,
and failure behavior. Extract a helper when callers share semantics. Similar
markup or a coincidental sequence of steps may still need separate policies.

For example, a scoring helper can be shared by a batch planner and a task
inspector. A draft belongs to its editing session; a task's identity and
completion status belong to the application's durable data. The
[browser task application](browser-tasks.md) uses that distinction to preserve
saved work while the workflow changes. Typing, focus, and ordinary rendering
should remain independent of model availability.

## Define a reusable program's contract

A program's interface is its declared input and output mapping. Good library
documentation also names the meaning of each value, rejected inputs, maximum
collection sizes, work limits, required host functions or capabilities, and
examples of success and failure. Keep these facts beside the program that
implements them.

Named interfaces help callers use a child without listing its internal cells.
They do not imply that every private refactor is compatible with an active
application. Application compatibility compares the manifest's interface
mapping, including its bound cell and port names, as well as resolved types.
Changing an interface's internal binding can therefore require a new compatible
wrapper or another explicitly supported transition even if its public names
stay the same. Source binding renames can also change the executable digest.

Pure expression cells operate only on their input values. Host functions come
from the registry supplied by the host. External tools and models use their
separate effect interfaces. Capability handles carry a specific permission
class; composition cannot widen them to ordinary JSON or create new handles
from constants. A reusable library does not grant the host permissions its
caller lacks. See [port types](../spec/v1/organism.md#port-types).

## Pin the whole dependency set

A compiled parent names its children by digest. A bundle contains the root
and all statically referenced child programs and values needed to carry it to
another store. The same helper can appear at several source locations while
its compiled content is stored once. Calls still execute separately and use
the root's shared budget.

Changing a child produces a new digest and a new parent dependency set. Keep
the earlier set available for the runs that name it. Source text identity,
compiler identity, and executable identity answer different questions:
which text was supplied, which compiler translated it, and which program ran.
Formatting can change the first without changing the last.

`lock` records those identities for a project: each file's source digest and
executable digest, the compiler version and profile, the root and module
digests, and a digest of each module's resolved interface. `lock --verify`
recompiles offline and reports source, executable, compiler, closure, and
interface drift separately, with no network access, install scripts, registry
lookup, or automatic upgrade. A lock can also pin
[evaluation cases](source-language.md#pin-a-project-with-a-lock), which
`lock --verify --evaluate` runs again offline with scripted responses to show
whether a change moved a pinned result, and labels for people over exact
digests, which report drift instead of following a changed program.
Compilation still accepts a closed source map, so browser tooling and
deterministic evaluation do not depend on a filesystem or package server.

The host's function implementations, renderer profile, and effect adapters
also affect compatibility. A program digest is not an identity for arbitrary
host code or evidence that a model's answer is correct. Application revisions
name a runtime profile and capability requirements; recorded effects bind
what the executor returned to the request that produced it.

For stored child programs, application evaluation can opt into
`composition: "closed-pure-v1"` in its evaluation policy. This permits static
`organism`, `each`, and `repeat` composition when every reachable child is
present, matches its digest, and contains only allowed pure operations.
The check rejects hidden effects and transported children. A policy without
this field uses the flat-program rule, preserving verification of historical
evaluation records.

This option applies to evaluation. Proposal generation accepts flat pure
manifests; its generated candidate list does not carry child bundles. A model
cannot use this evaluation option to install dependencies, add capabilities,
or change the evaluator. The [application contract](../spec/v1/application.md)
defines the separate checks for proposals, evaluation, activation, and
migration.

## Build a standard library in layers

ALGAL has expression operations and host registries. A broader curated program
library is proposed. Keep its entries separated by what they require:

| Layer | Examples | What a caller needs to know |
| --- | --- | --- |
| Pure portable operations | Arithmetic, strings, records, lists, and the task planner's reusable clamp program | Input/result shapes, error behavior, value limits, and deterministic work cost. |
| Pure host functions | Built-in `fn` registry operations | Host implementation, signature, work cost, and matching behavior across runtimes. |
| Host effects and capability tools | Mailboxes, allowed storage operations, model execution, and environmental input | Required permissions, adapter identity, idempotency, and recovery after uncertain completion. |
| Application patterns | Finite fan-out, approval and resume, propose/evaluate/select, evidence forks, and migration | State ownership, total budgets, revision dependencies, and failure/recovery behavior. |

Prefer an ordinary reusable program when the existing expression language can
express the operation. Add a primitive when its semantics cannot be expressed
or measured cost justifies it. Portable primitives need matching values,
failures, and work accounting across runtimes. Application patterns can remain
examples built from the normal contracts.

A proposed catalog entry should include its interface, digest, compiler and
runtime requirements, documentation, tests, evaluation conditions, and known
limits. Begin with repository-local programs and demonstrated callers. A
package server or automatic dependency resolution is not required to establish
useful reuse.

The task-planning project has two entries today: the batch planner and a
single-task inspector that reuses the same scoring and clamp programs under
identical executable digests, with failure examples for bad input. That is a
demonstrated second caller, not yet a curated library.

## Scale programs and habitats separately

A habitat is the host environment shared by programs: its store, function and
tool registries, executors, and policies. Within one run, static composition
forms an acyclic graph. `each` and `repeat` provide finite repetition; source
imports cannot form cycles. Root limits cover nested steps, work, model calls,
depth, and value sizes.

Long-lived collaboration belongs in [processes](../spec/v1/process.md),
[mailboxes](../spec/v1/organism.md#capability-mailboxes-and-wakeups), and
[application messages](../spec/v1/application.md#verifiable-inter-application-messages).
A process can suspend and resume; an application can start revision-pinned
episodes and deliver messages. Those mechanisms have their own limits on
generations, pending work, retained records, and storage. An individual pure
helper does not need a separate durable process.

Foundry and search limit candidates, rounds, and cases, but their individual
runs have separate work allowances. They do not provide one shared budget for
an entire habitat's concurrent experiments. Hosts must account for that total
today. A future habitat scheduler should reserve and charge work across runs,
including rejected candidates and recovery, before increasing population size.

Keep code size, expanded execution size, and history size separate when
measuring capacity:

| Resource | Current bound |
| --- | ---: |
| Source project | 16 unique files; 1 MiB total source |
| Source imports | 16 per file; eight levels |
| Source bindings | 24 per program |
| Expanded static compilation | 1,024 manifest instances; 4,096 cells; 16,384 edges; 64 MiB canonical manifest bytes |
| Runtime embedding | Root-declared depth, at most eight |

Repeated static references count toward expanded compilation even when they
name the same digest. A compact dependency graph can otherwise expand into
much more work than its source suggests. The compiler infers maximum executor
attempts and required child depth; these are structural bounds rather than
time or billing estimates. The [source limits](source-language.md#budgets-and-compiler-bounds)
and [runtime compilation limits](../spec/v1/organism.md#compilation-admission-bounds)
describe the checks in detail.

## Inspect where work comes from

Source diagnostics associate failures with the supplied source project,
executable digest, receipt, and caller path. Diagrams expose branches and child
calls. A receipt, the recorded result of a run, can be replayed independently;
source annotations alone do not establish successful execution.

The `dependencies` command reports a source project's files, executable
modules, and every static call with its caller location, so a shared helper
appears once as a module and once per call as an occurrence. It records each
module's resolved interface, declared budgets, and the model effects it
declares directly or through its children, and it can check a bundle against
the recompiled closure. The report is kept outside executable identity and
describes possible structure, not observed work. The source guide describes
[the report](source-language.md#inspect-project-dependencies) and the
[diagnostics for recorded failures](source-language.md#locate-a-recorded-failure).

With `--receipt`, the same command attributes a recorded run to that
structure: invocations, recorded cells, and work per occurrence, with self work
kept separate from inclusive child work so nested calls are not counted twice,
and with never-run occurrences and unattributable paths left visible. Joining
the report with application revisions and evaluation records remains proposed.

## Proposed next steps

1. Measure compilation and execution on realistic reused programs, including
   shared dependencies and rejected oversized graphs. Measure browser history
   verification separately so raising source limits does not conceal slow
   interaction.
2. Join the dependency report with application revisions: evaluation and
   activation links per occurrence, and a bounded estimate of dynamic
   invocations under branches and item limits. Receipt attribution is available.
3. Extract a small pure library from multiple applications. The task planner
   now has a second caller with failure examples; a curated index still needs
   entries from more than one application, plus comparison of library revisions
   on pinned cases and unseen cases before activation.
4. Add richer source record and result types for demonstrated application needs.
   Lower them to checks the runtime enforces; new validation semantics need
   versioned specification and cross-runtime tests.
5. Extend the local lock with vendored remote catalogs that resolve to the
   same offline verification it applies to local projects.

The [cumulative-skill experiment](vision.md#what-would-justify-the-claim)
measures whether keeping and composing procedures improves later work. More
files, library entries, or generated revisions are capacity measures; useful
reuse requires evidence from the work those programs perform.
