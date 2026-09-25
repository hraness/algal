# Readable ALGAL source

The Bun CLI and SDK compile `.algal` source into the existing
`algal.organism.v1` manifest. Compilation makes no model calls, executes no
host code, and requires no provider credentials. Both runtimes execute the
compiled JSON. The native CLI does not parse source or fall back to Bun.

```sh
bun cli.ts compile examples/source/reply.algal --out reply.algal.json --source-map reply.map.json
bun cli.ts check examples/source/reply.algal
bun cli.ts run examples/source/reply.algal \
  --args examples/source/reply.args.json \
  --responses examples/source/reply.responses.json > reply.receipt.json
bun cli.ts verify reply.receipt.json examples/source/reply.algal
bun cli.ts diagram examples/source/reply.algal --format svg --out reply.svg
```

The committed replies are scripted fixtures demonstrating execution, not
measurements of model quality. Configure the normal executor options for live
work. A decision provider must serve `decide`; a generation provider must serve
`agent`. One provider need not support both. The normal executor admission
rules remain in force.

## Check bounds and compiler errors

`check` loads the local source closure, compiles it, and checks the resulting
graph without calling an executor. Its JSON result includes a `source` object.
For the [inbox project](../examples/source/projects/inbox/inbox.algal):

```json
{
  "entry": "inbox.algal",
  "files": 2,
  "maxAgentCalls": 4,
  "requiredDepth": 1
}
```

`files` counts source files in the loaded project. `maxAgentCalls` is the
compiler's transitive maximum executor attempts: it adds sequential work,
takes the largest mutually exclusive arm, and multiplies a child's bound by
`max_items`. `requiredDepth` counts nested child levels below the root. These
are inferred structural bounds, not the declared budget, a bill estimate, or
a timing prediction. A run may use less work; the root runtime budget still
governs all nested execution.

Source loading and compilation errors preserve `error` and `message` in the
default JSON response and add a structured `diagnostic`. Use
`--diagnostic-format text` for a readable file location, source excerpt, and
import chain, or `--diagnostic-format json` for a machine-readable report.
This flag applies wherever the Bun CLI loads source, including `check`,
`compile`, `run`, and `diagram`. It changes `SourceError` presentation;
other CLI errors retain their normal JSON format.

The SDK's `createSourceErrorReport(error)` builds an `algal.source-error.v1`
report from a `SourceError`; `renderSourceError(report)` produces the text
view. The report retains the source path, span, source digest when text is
available, and import locations. Excerpts are limited to three lines and 120
display columns per line, with at most eight import frames. Non-ASCII and
control characters are visibly escaped with corresponding caret positions.
Missing or unreadable source produces an explicit excerpt-unavailable reason.
The report does not include the full original source or create an execution
receipt.

The intentionally invalid [authoring example](../examples/source/errors/unknown-binding/main.algal)
imports `helpers/draft.algal`, which refers to `emial` instead of `email`:

```sh
# Both commands fail before execution; no provider credentials are needed.
bun cli.ts check examples/source/errors/unknown-binding/main.algal --diagnostic-format text
bun cli.ts check examples/source/errors/unknown-binding/main.algal --diagnostic-format json
```

The compiler locates the unknown binding in the helper and retains the import
site in `main.algal`. Correcting `emial` to `email` repairs this example. The
[site demonstration](https://algal.computer/tour/#authoring-error) generates its report
from the actual failing compilation at build time.

Compiler errors happen before a program can run. For a recorded runtime
failure, use `diagnose receipt.json --source program.algal`; source diagnostics
inspect receipt evidence, while `verify` separately replays execution.

## A small, explicit first version

```algal
program welcome(name: text) -> text {
  budget { max_agent_calls: 0 }
  let message = "Hello, " + name
  return message
}
```

A file contains exactly one program, optionally preceded by local imports and
[record declarations](#record-types). Programs have named `text`, `json`, or
record inputs and a `text`, `json`, or record result. A required budget declaration precedes
immutable `let` bindings and one `return`. Semicolons after bindings and return
are optional. Lists, records, choice declarations, and match arms use commas,
with optional trailing commas. Strings use JSON escaping. `//` and `/* */`
comments are supported.

Program names use lowercase letters, digits, and underscores. Binding and
parameter identifiers may contain ASCII letters, digits, and underscores and
cannot begin with a digit. Reserved keywords and prototype-related names are
rejected. Parameter names become lowercase kebab-case interface/port names;
colliding normalized names are rejected. For example, `order_data` is supplied
as `{"input":{"order-data":{...}}}`. The emitted manifest's interface is the
authoritative argument mapping. A parameterless program has no input cell.

### Pure expressions

Supported expressions include literals, records, lists, field selection,
parentheses, arithmetic (`+ - * / %`), Boolean logic (`! && ||`), comparisons,
and `if … { … } else { … }`. `+` concatenates two statically known text
values or adds numeric values. There is no implicit coercion or truthiness.
JSON fields have dynamic types; strict expression operators check them during
execution. A missing JSON field returns null under the existing expression
contract; it does not imply a successful lookup.

```algal
program quote(order: json) -> json {
  budget { max_agent_calls: 0 }
  let subtotal = order.quantity * order.unit_price
  let shipping = if subtotal >= 50 { 0 } else { 5 }
  return { subtotal: subtotal, shipping: shipping, total: subtotal + shipping }
}
```

Pure expressions lower to fuel-bounded `algal.expr.v1` cells. There are no
assignments, ambient variable reads, arbitrary function calls, host-language
evaluation, unbounded recursion, or implicit network operations.

### Decisions and exhaustive matching

```algal
let intent = decide "What does this email need?" using email
  as choice {
    help: "Help with a problem",
    sales: "Information before buying",
    other: "Anything else"
  }

let task = match intent.value {
  help => "Draft a helpful support reply.",
  sales => "Draft a concise sales reply.",
  other => "Draft a clarifying question."
}
```

`decide` creates one typed-choice effect with the declared context. The
source-level decision exposes `value`, `confidence`, `probabilities`, and
`probability(label)`. Its backing port is JSON; it is not a new core port type.
A generated pure adapter checks the selected label and the numeric range of
confidence and every declared label's probability. Invalid data fails in the
adapter before a dependent branch or generation can run. The adapter retains
declared-label probabilities; it does not assert calibration or establish
that they describe reality. It does not impose an additional sum-to-one rule.

`match` requires a closed choice and exactly one arm per declared label. The
selection itself makes no model call. Pure `if` and `match` expressions stay
inside one pure cell; they can select an instruction for a later effect.

```algal
let task = if intent.probability(intent.value) < 0.80 {
  "Draft a question that clarifies what the sender needs."
} else {
  "Draft a helpful reply."
}
return generate task using email
```

The example threshold is policy, not a correctness guarantee. Selected-label
probability and provider confidence are separate values. An `other` category
is also distinct from uncertainty. See [uncertain.algal](../examples/source/uncertain.algal)
and its scripted fixture for a complete example.

### Run only the selected branch

`if` and `match` arms can also contain `generate`, `decide`, `call`, `each`, or another branch.
Each arm is one expression. Conditions, match discriminants, and effect
operands remain pure.

```algal
return match intent.value {
  help => generate "Draft a helpful support reply." using email,
  sales => generate "Draft a concise sales reply." using email,
  other => "Needs a human review."
}
```

The [complete route program](../examples/source/route.algal) uses at most two
executor attempts: one decision, then one generation on the help or sales
path. The other path returns its fixed text after the decision alone.

```sh
bun cli.ts run examples/source/route.algal \
  --args examples/source/route.args.json \
  --responses examples/source/route.responses.help.json > route.receipt.json
bun cli.ts diagram examples/source/route.algal \
  --receipt route.receipt.json --format svg --out route.svg
```

Effectful branches lower to ordinary guarded dependencies and a checked
single-result merge. Every cell in an inactive arm is skipped, including pure
instruction/context calculations, so inactive arithmetic cannot fail the
selected path. Compiler control inputs never enter a model's declared view.
Both arms must agree on text versus JSON. Decision values retain their closed
choice refinement across an effectful merge only when every arm validates the
same label set. All arms remain visible in the manifest and execution receipt.

Effects inside arbitrary arithmetic, records, conditions, or another effect's
context are rejected. Put them in a whole binding, return, or branch arm.

### Generation and context

`generate instruction using context` returns text. The instruction must be
text, and both operands must be pure values. It lowers to an agent cell with
only `instruction` and `context` inputs in its view. The versioned prompt is:

> Algal source generation envelope v1. Follow the instruction in inputs.instruction. Use only inputs.context as task context. Return the requested text.

This envelope is part of the compiled artifact. Changing it changes program
identity. The model receives no other local binding or capability implicitly.
Normal host admission and provider behavior still apply; a prompt is not an
OS sandbox. `decide` and `generate` occupy a whole binding, return expression,
or branch arm. All declared effects remain in the graph, including unused
bindings and inactive arms. Inactive arms are skipped at execution.

## Record types

A record type names the fields a JSON value must have. Declare records after
the imports and before the program, then use a record name as a parameter or
result type. From the [typed task scorer](../examples/source/projects/typed-tasks/README.md):

```algal
record Task {
  id: text,
  title: text,
  urgency: number,
  impact: number,
  status: text,
  notes: text?,
}
record Weights { urgency: number, impact: number }
record Score { id: text, title: text, total: number, ready: boolean }

program score(task: Task, weights: Weights) -> Score {
  budget { max_agent_calls: 0 }

  let total = task.urgency * weights.urgency + task.impact * weights.impact
  return {
    id: task.id,
    title: task.title,
    total: total,
    ready: task.status == "open" && total >= 10,
  }
}
```

Each field has a type: `text`, `number`, `boolean`, `json`, or a record
declared earlier in the same file. A `?` after the type makes the field
optional. Fields use commas, with an optional trailing comma. Record names
start with an uppercase letter and contain only ASCII letters and digits;
field names follow the binding rules. A field name is the JSON key as
written, without the kebab-case conversion that parameter names receive.
Records belong to their file. To pass a record to another program, declare a
record with the fields it needs in each file; the compiler compares records
field by field, not by name.

### What a record compiles to

A record parameter or result becomes an ordinary `json` port with a `schema`
in the manifest's existing JSON schema subset. `Task` compiles to:

```json
{
  "type": "object",
  "required": ["id", "impact", "status", "title", "urgency"],
  "properties": {
    "id": { "type": "string" },
    "title": { "type": "string" },
    "urgency": { "type": "number" },
    "impact": { "type": "number" },
    "status": { "type": "string" },
    "notes": { "type": "string" }
  }
}
```

`required` is sorted, so reordering fields does not change the compiled
program. A `json` field is listed in `required` only, and an optional `json`
field adds nothing. Records add no manifest field, port kind, or schema
keyword; the compiled program uses only what both runtimes already accept.

### What is checked

Both runtimes check a record value where it enters or leaves a program,
before any cell that uses it runs:

- A root program's record parameter is checked when the run starts. A
  malformed value fails the `input` cell.
- A record argument to `call`, or a shared `using` argument of `each`, is
  checked when it reaches that cell, which then fails.
- Each `each` item is checked against the child's record parameter before
  that item's run starts. A malformed item fails the `each` cell; earlier
  items' cells remain in the receipt, and later items do not run.
- A record result is checked before the program returns it. When a called
  program returns a different schema, the compiler adds one pass-through cell
  that declares the caller's record.

A value passes when it is a JSON object, every field without `?` is present,
and every declared field that is present has its type, recursively for nested
records. A failure is `TYPE_MISMATCH` with a message such as `expected
object`, `expected number`, or `missing required field`. The message does not
name the field.

The runtime does not check:

- Undeclared fields. They are accepted and passed through unchanged.
- The value of a `json` field, beyond its presence when required.
- Number ranges, whole numbers, text length or format, or allowed values.
- List items. There is no list-of-records type; declare the list as `json`
  and use `each` with a record parameter to check every item.

An optional field may be omitted, but a present field must have its type, so
`"notes": null` is rejected.

The compiler also rejects mismatches it can prove from the source: selecting
an undeclared field, arithmetic on a `text` field, a record literal or record
value that lacks a required field or has a field of the wrong type, and a
record literal with a field the record does not declare. A `json` value is
accepted and checked at run time. Selecting an optional field gives a `json`
value, because the field may be absent.

### Record limits

A file declares at most 16 records, each with 1 to 32 fields, and a record
name has at most 40 characters. A field can name only a record declared
earlier, so records cannot refer to themselves or form a cycle. Each compiled
schema must fit the manifest's schema depth limit of 4. In practice, a record
used as a field type may contain only `json` fields; deeper nesting is
rejected at the declaration.

## Reuse a local program

A source project keeps each reusable program in its own `.algal` file. Imports
bind local names to compiled children; calls pass an explicit record matching
the child's declared inputs. A child sees those inputs, not the caller's other
bindings.

[`draft.algal`](../examples/source/projects/inbox/draft.algal):

```algal
program draft(email: text, tone: text) -> text {
  budget { max_agent_calls: 1 }
  return generate "Draft a reply using the requested tone."
    using { email: email, tone: tone }
}
```

[`inbox.algal`](../examples/source/projects/inbox/inbox.algal):

```algal
import draft from "./draft.algal"

program inbox(sample: text, emails: json) -> json {
  budget { max_agent_calls: 4 }

  let preview = call draft using {
    email: sample, tone: "helpful"
  }
  let replies = each draft over email in emails
    using { tone: "helpful" } max_items 3

  return { preview: preview, replies: replies }
}
```

`call draft using {...}` produces the child's single result. `each draft over
email in emails using {...} max_items 3` supplies each list item to the child's
`email` input and supplies the other inputs from the `using` record. The item
input must not also appear in `using`. The argument record after `using` must
be written as a record literal; a variable holding a record is not accepted in
this position. Its field values and the collection expression are pure. Missing
or unknown child inputs and statically incompatible types are rejected during
compilation. Dynamic JSON values flowing into text inputs, including collection
items, are checked against the child interface at runtime.

`each` returns an ordered JSON list of child results. An empty input returns
`[]` without child execution. A list longer than `max_items` fails rather than
silently truncating it. The current runtime executes items sequentially;
`each` is bounded reuse, not a concurrency or speed guarantee. `call` and
`each` can occupy a whole binding, return, or branch arm. They cannot hide
inside a record, arithmetic expression, or another effect's context.

The sample uses one preview call plus three possible child calls: its inferred
maximum is four executor attempts. The empty-list fixture uses only the preview
attempt. Each imported program must fit its own declared allowance, and the
root must cover its transitive inferred maximum. The compiler adds bindings,
takes the maximum across mutually exclusive arms, includes a called child's
inferred bound, and multiplies that bound by `max_items` for a collection.
The runtime root budget remains the shared allowance across nested work;
declaring a child budget does not allocate an additional pool. Required nesting
depth is checked against the source budget as well.

### Load, run, and carry the closure

The Bun CLI loads imports automatically:

```sh
bun cli.ts check examples/source/projects/inbox/inbox.algal
bun cli.ts compile examples/source/projects/inbox/inbox.algal \
  --out inbox.algal.json --bundle-out inbox.bundle.json
bun cli.ts run examples/source/projects/inbox/inbox.algal \
  --args examples/source/projects/inbox/inbox.args.json \
  --responses examples/source/projects/inbox/inbox.responses.json > inbox.receipt.json
bun cli.ts verify inbox.receipt.json examples/source/projects/inbox/inbox.algal
bun cli.ts diagram examples/source/projects/inbox/inbox.algal --format svg --out inbox.svg
```

A root manifest references children by digest; it does not embed their content.
`--bundle-out` includes the full reachable compiled closure in the existing
`algal.bundle.v1` format. Both runtimes can use that closure after unpacking it
into their stores. A source map alone is not a module bundle.

For the native CLI, unpack the bundle and run the compiled root with the same
cell-keyed argument and scripted-response files:

```sh
algal unpack inbox.bundle.json --dir inbox-store
algal run inbox.algal.json --dir inbox-store \
  --args examples/source/projects/inbox/inbox.args.json \
  --responses examples/source/projects/inbox/inbox.responses.json
```

The native CLI executes the JSON and stored child manifests; it does not load
or parse the `.algal` source files. For a named program call, pass
`--interface` explicitly:

```sh
printf '%s\n' '{"sample":"Can you help me?","emails":[]}' > inbox.interface-args.json
algal call inbox.bundle.json --interface --dir inbox-store \
  --args inbox.interface-args.json \
  --responses examples/source/projects/inbox/inbox.empty.responses.json
```

This accepts exactly the program's named parameters and returns its named
interface outputs. Without `--interface`, `call` uses the same cell-keyed
arguments as `run` and returns all committed cell outputs. A JSON-valued named
parameter remains opaque data; argument shapes do not select the mode.

For SDK code, `loadSourceProject(path)` reads the local project and returns
`manifest`, `sourceMap`, `modules`, `analysis`, the original entry `source`, and
`compilerOptions`. Store every returned module before admitting, running, or
packing the root:

```ts
const project = await loadSourceProject(entryPath);
for (const child of project.modules) await store.putManifest(child);
const compiled = await compileOrganism(project.manifest, fns, store);
const bundle = await packOrganism(project.manifest, store);
const diagram = createProgramDiagram(project.manifest, {
  source: project.source,
  sourceOptions: project.compilerOptions,
  ports: compiled.ports,
});
```

`modules` is a child-first, digest-deduplicated array of manifests; it excludes
the root and includes generated wrappers when needed. `analysis.maxAgentCalls`
and `analysis.requiredDepth` report the compiler's inferred requirements.
The pure compiler also accepts `compileSource(source, {entry, modules})`, where
`entry` and the source-module keys are normalized project-relative paths.
Here `options.modules` maps those paths to source strings; the returned
`compilation.modules` is the array of compiled manifests described above. The
pure compiler never reads the filesystem itself. The loader supplies that
closed source set.

In a browser bundle, import `compileSource` from `@hraness/algal/source` and
`createSourceErrorReport` and `renderSourceError` from
`@hraness/algal/source-errors`, and pass every imported file in
`options.modules`. `loadSourceProject` reads files and is exported only from
the package root. The compiler checks each expression it emits with the
WebAssembly evaluator, so instantiate `@hraness/algal/algal_expr.wasm` and pass
its exports to `setExprExports` from `@hraness/algal/expr` before the first
compile.

### Local resolution has a boundary

Imports name relative `.algal` files. The default project root is the entry
file's directory. Use `loadSourceProject(path, {root})` or the CLI's
`--source-root` to admit a wider local directory; `../` traversal must remain
inside that explicit root. Import resolution rejects symlinks beneath the
canonical root, cycles, missing modules, absolute paths, and remote/package
imports. Loading source performs no network requests or module-host execution.

The loader bounds a project to 16 unique source files, 16 imports per file,
65,536 UTF-8 bytes per file, 1 MiB of source in total, and eight import levels.
The normal per-file syntax, manifest, expression, and execution bounds still
apply. A reused dependency is compiled once per normalized source path, then the
manifest closure is deduplicated by content digest. Calling a child multiple
times still consumes work for each execution.

### Structure a larger project

The [six-file task planner](../examples/source/projects/task-planning/README.md)
separates orchestration, scoring, action policy, and display data. Its score
program calls one numeric helper twice. Tests show which dependent program
digests change when that helper changes, and verify that an earlier bundle
still runs with its original behavior. It uses no model or tool calls.

See [building larger programs](scaling-programs.md) for module boundaries,
library design, application evaluation, and the current project limits.

### Inspect project dependencies

`dependencies` reports a project's static structure without running it:

```sh
bun cli.ts dependencies examples/source/projects/task-planning/main.algal --format text
bun cli.ts compile examples/source/projects/task-planning/main.algal \
  --bundle-out task-plan.bundle.json
bun cli.ts dependencies examples/source/projects/task-planning/main.algal \
  --bundle task-plan.bundle.json
# Default output is JSON; --out writes an independent report artifact.
```

The `algal.source-dependencies.v1` report keeps three lists separate. Source
files are the imported files, each with its source digest, executable digest,
and whether the entry reaches it through a call. Modules are the distinct
executable digests in the entry's static closure, including the entry, with
the resolved interface, declared budgets, and the model-effect kinds each one
declares directly or through its children. Occurrences are the expanded static
calls, including the entry, each with a path of composition cell IDs and the
caller's file, line, and column. A helper called twice is one module and two
occurrences. An `each` child is one occurrence with its item limit recorded.
Generated control wrappers appear as modules and occurrences marked generated.
The task planner reports 6 source files, 6 modules (5 dependencies),
7 occurrences, 6 composition edges, and a maximum depth of 3.

The report describes possible structure, not observed execution, permission,
availability, or cost. It contains file names, cell IDs, spans, interface
names, budgets, and digests. It omits source text, prompts, literals,
comments, and compiler annotations. With `--bundle`, the artifact must carry
the recompiled root and every reachable child under matching digests. A
missing or altered child fails the check instead of being filled in from
source; valid extra entries are counted as unreachable. A report is limited to
8 MiB, bundle input to 64 MiB, and the expanded occurrence count to the
compiler's 1,024-instance limit.

```ts
const project = await loadSourceProject(entryPath);
const report = await createSourceDependencyReport(project.source, { sourceOptions: project.compilerOptions });
console.log(renderSourceDependencies(report));
```

Only a report built by `createSourceDependencyReport` can be rendered. A
serialized or edited copy is data, not compiler evidence.

With `--receipt`, the report also attributes a recorded run to its static
structure:

```sh
bun cli.ts run examples/source/projects/task-planning/main.algal \
  --args examples/source/projects/task-planning/main.args.json > task-plan.receipt.json
bun cli.ts dependencies examples/source/projects/task-planning/main.algal \
  --receipt task-plan.receipt.json --format text
```

The receipt is copied under the receipt parser's limits, and its self-digest
and root manifest must match the recompiled source. Each recorded cell is then
attributed to the occurrence that owns it by walking the static tree, so an
`each` item counts as one invocation of the child occurrence. For every
occurrence the report gives the number of invocations, recorded cells by
status, recorded `generate` and `decide` cells that were not skipped, and work
in two forms: self work covers the occurrence's own cells, and inclusive work
adds every child occurrence. For a receipt the runtime produced, self work
sums to the receipt's total work, so nested calls are never counted twice; the
report checks that sum and three other consistency rules and marks the join
`reconciled` or lists the rule that failed. An occurrence that never ran, such
as an inactive branch, stays listed with zero invocations. Recorded paths that
no occurrence can own are counted as unattributed rather than guessed. This
join is digest-bound association, not replay; use `verify` for replay.

#### Bound how often each call runs

`--estimate` adds, for every occurrence and module, how many times it can run
during one run of the entry:

```sh
bun cli.ts dependencies examples/source/projects/task-planning/main.algal \
  --estimate --format text
```

`max` multiplies the item limits of every enclosing `each`. Each of the
planner's two clamp calls can run at most 16 times, so the clamp module can
run at most 32 times. `min` is 1 for a call that runs on every completed run
that supplies each declared input, and 0 for a call under a branch arm or an
`each`. A call that follows an `if` or `match` at the same level keeps a
minimum of 1, because exactly one arm runs. A product above 65,536, the most
cells one receipt can hold, is reported as 65,536 and marked `saturated`.
These are limits on possible work derived from the program's structure, not
measurements, prices, or predictions. With `--receipt` as well, each
occurrence also shows its recorded invocations, and `exceeded` lists every
occurrence recorded more often than its maximum. Such a receipt contains an
`each` item that the program does not allow; the execution join above leaves
those cells unattributed.

#### Link modules to application revisions

`--application <name>` links the report to one application's history in the
store that `--dir` names (default `.algal`). The command reads that history
and commits nothing:

```sh
bun cli.ts dependencies main.algal --application inventory --dir .algal --format text
```

A revision entrypoint is linked when its recorded static closure contains a
report module's executable digest: the entrypoint's manifest is that module,
or names it as a child by digest, directly or through other manifests in the
store. Each linked entrypoint appears once in `application.entrypoints`, with
the transition that activated its revision (`create`, `activate`, `migrate`,
or `restore`), whether the application's head selects it, whether its closure
contains the report's root, and the evaluation records that measured it.
Evaluation records come from transition evidence, directly or through a cited
comparison or experiment. A revision known only from an evaluation record is
listed as never activated. Each module and occurrence lists the indices of the
entrypoints that contain its digest.

Links use digests only: an entrypoint or program that shares a name with a
report module links nothing unless the digests are equal. Verdicts are shown as
recorded, because the join does not replay evaluations; replay one with
`verifyApplicationEvaluation` before relying on it. Records that cannot be read
or parsed, and evaluations that do not match their own request or parent
state, are counted as unreadable. Revisions and evaluations that share no
digest with the report, and evaluations of another application or of a state
outside the history, are counted as unmatched. A revision whose closure names
a manifest that is missing from the store or chosen at run time, and that
contains no report module, is counted as unresolved. The join reads at most
4,096 records beyond the history and refuses more. It keeps the latest 64
entrypoints and 16 evaluation records per entrypoint and counts the rest as
omitted. `--out` cannot write inside the application store.

In the SDK, pass `estimate: true`, and pass `application: { name, reader }`
with an `ApplicationService` or `ApplicationCore` as the reader.

### Pin a project with a lock

`lock` writes an `algal.source-lock.v1` record that binds the project to the
exact closure it compiles to, and `--verify` recompiles the project offline
and reports every difference:

```sh
bun cli.ts lock examples/source/projects/task-planning/main.algal --out task-plan.lock.json
bun cli.ts lock examples/source/projects/task-planning/main.algal \
  --verify task-plan.lock.json --format text
# Exit 0 when the source still compiles to the locked closure, 1 on drift,
# 2 when the project no longer compiles or the lock is malformed.
```

The lock records the entry key, the compiler version and profile, every
imported file with its source digest and executable digest, the root digest,
the sorted module closure, the inferred attempt and depth bounds, and a digest
of each module's resolved interface. It supplies no source or manifests and
changes no executable identity. Verification lists drift in a fixed order and
by kind: a formatting-only edit shows as source drift with no executable
drift, a changed helper shows the file digests and closure digests that moved,
a renamed parameter shows interface drift for that file, and a different
compiler version string shows as compiler drift. The drift bound is above the
largest possible list, so nothing is cut off. File keys are relative to the
source root, so verify with the same `--source-root` used to write the lock.
Lock data is copied under its own limits (16 units, 60 modules, 128 KiB) and
parsed strictly before comparison; the lock digest covers the parsed
canonical JSON, not the file bytes. The lock does not fetch, install, or
upgrade anything.

A lock can also pin evaluation cases: run inputs, with scripted responses
when the program calls a model, and the results they must keep producing.

```sh
bun cli.ts lock examples/source/projects/task-planning/main.algal \
  --evaluation examples/source/projects/task-planning/main.evaluation.json \
  --out task-plan.lock.json
bun cli.ts lock examples/source/projects/task-planning/main.algal \
  --verify task-plan.lock.json --evaluate --format text
```

The case list is a JSON array. Each case has a `name`, an `args` file in the
format `run --args` reads, an optional `responses` file in the format
`run --responses` reads, and an optional expected `outcome`, which defaults
to `complete`. Case files are named relative to the source root and read like
source files: no `..` segments or symlinks, regular files only, at most
64 KiB each. Writing the lock runs each case in memory and records the digest
of each file's canonical JSON, the run's outcome, and a digest of the
program's declared outputs, the `outputs` object that `call --interface`
prints. A case whose run ends with a different outcome than it expects is
refused, so a failing case is pinned only when it expects `failed`.

`--evaluate` runs every pinned case again against the recompiled program. It
answers model and decision steps only from the pinned responses, calls no
tools or network services, and writes nothing to the store. It reports
`evaluation` drift for each case whose input file, response file, outcome, or
output digest changed, and for a different runtime version. A case file that
is missing, unreadable, or malformed stops verification with exit code 2.
Without `--evaluate`, no case runs and the output marks the cases as not
replayed. A helper rewrite that keeps every pinned output shows digest drift
with no evaluation drift; a behavior change also moves the output digest.
Evaluation drift covers only the pinned inputs and the recorded responses: it
shows whether the program still turns them into the same results, not how a
live model or provider would answer.

`--versions labels.json` adds labels for people: a JSON object that maps each
label to an executable digest in the closure, such as a unit's
`manifestDigest` in the lock. Digests are what execute. Verification never
moves a label to a new digest; when a labeled digest leaves the recompiled
closure, it reports `version` drift, and relabeling means writing a new lock.
A lock pins at most 16 cases and 16 labels. Case names and labels have at
most 64 characters: ASCII letters, digits, `.`, `_`, and `-`, starting with a
letter or digit.

Verification lists drift in this order: entry, compiler, source, unit, root,
closure, interface, analysis, version, and evaluation. Vendored remote
catalogs, which would resolve to the same offline verification, are proposed
and not built.

The same project's second entry, `inspect_task.algal`, reuses the scoring and
clamp programs. Its report lists 3 source files and 5 occurrences, and its
`score_task` and `clamp` modules carry the same digests as the planner's, so
reuse across entries is visible as shared executable identity rather than as
a copied file.

## Budgets and compiler bounds

`max_agent_calls` must be explicitly declared, including zero for pure work.
The compiler adds the effect bounds of bindings and return, taking the maximum
across mutually exclusive arms and including the transitive bounds of calls
and bounded collections. It rejects a program whose resulting bound
exceeds the budget. This is conservative: it does not assume that conditions
in separate branches are correlated.
The runtime enforces its normal limits; exactly using the budget is allowed,
while admitting another attempt fails with `BUDGET_EXHAUSTED`.

| Source budget | Manifest field | Default |
| --- | --- | ---: |
| `max_agent_calls` | `maxAgentCalls` | Required |
| `max_steps` | `maxSteps` | 256 |
| `max_work` | `maxWork` | 1,000,000 |
| `max_context_bytes` | `maxContextBytes` | 65,536 |
| `max_output_bytes` | `maxOutputBytes` | 65,536 |
| `max_depth` | `maxDepth` | 4 |

The core agent-call counter includes executor attempts such as gates and
recall, not just inference, and excludes the separate tool path. This front
end currently emits decisions and generation with the ordinary one-attempt
default. It adds no automatic retries.

Source limits: 65,536 UTF-8 bytes, 8,192 tokens, 1,024 expression nodes,
16 levels of source nesting, 24 bindings, 16 parameters, 40-character names,
16 choice labels, 64 entries per collection, 16 records per file, and 32
fields per record. The lowered program must
also satisfy the existing manifest and expression bounds. A deeply nested
expression may reach a core bound before a source maximum. Errors identify a
source line and column; failures during final manifest validation reference
the enclosing program. Each pure activation uses the existing 100,000-fuel
limit. The compiler/profile constants expose the exact current defaults.

## Identity, mapping, and ordering

```ts
import { compileSource, createProgramDiagram, renderSvg } from "@hraness/algal";

const { manifest, sourceMap } = compileSource(source);
const svg = renderSvg(createProgramDiagram(manifest, { source }));
```

`SOURCE_PROFILE.compilerVersion` identifies the compiler; its profile is
`algal.source.profile.v1`.
Source maps contain source and manifest digests, compiler/profile identity,
source spans, and bounded source annotations for each generated cell.
Annotations preserve binding names and describe parsed operations, decisions,
and branch arms. Locations and presentation metadata
remain outside the manifest. Formatting/comments change the source digest
but not the compiled manifest digest. Binding renames and changes to compiler
lowering can change identity. Source-map offsets count JavaScript UTF-16 code
units; line/column positions are one-based.

Bindings create data dependencies. The graph does not imply a concurrent
wall-clock schedule, and textual adjacency is not a durable ordering edge.
This initial language has no external write/tool syntax; future effect
sequencing must lower to explicit dependencies. Use full manifests for such
work today.

Compilation parses and checks the source and resulting manifest. `compile`
also runs graph admission. SDK callers should use `compileOrganism`, `check`,
or ordinary execution admission before running the result. No source map is
necessary to run or verify the emitted JSON.

Passing original source to the diagram API recompiles it and requires the
executable digest to match before using source annotations. For compiled JSON,
the equivalent CLI option is `diagram manifest.json --source program.algal`.
Persisted source-map labels alone are not trusted as evidence of source meaning.

## Locate a recorded failure

`diagnose` reads a receipt and the original source project without running a
model, replaying effects, or changing the receipt:

```sh
bun cli.ts diagnose ratios.receipt.json \
  --source examples/source/projects/ratios/ratios.algal --format text
# Default output is JSON; --out writes an independent diagnostic artifact.
```

The `algal.source-diagnostics.v1` report identifies the root manifest,
supplied entry source, and original receipt, plus one terminal issue when present.
Each resolved location also includes its own file's source digest.
A failure points to its exact execution path and source expression, with up
to eight caller frames. A suspension is reported as a suspension. A complete
run has no terminal issue, even if it handled earlier cell failures. The
recorded failure message is clipped to 512 characters; each source excerpt
is at most three lines and 320 characters. The report does not expand inputs,
model contexts, or effect payloads. Failure messages and source text retain
their recorded contents and may themselves contain sensitive text.

```ts
const project = await loadSourceProject(entryPath);
const report = diagnoseSource(receipt, project.source, project.compilerOptions);
console.log(renderSourceDiagnostics(report));
```

The original sources are recompiled. A mismatched root executable or receipt
self-digest is rejected; persisted source-map labels are never trusted.
The report says `digest-bound`: this establishes association and integrity,
not successful replay or provider attestation. Use `verify` for replay.
Formatting-only source changes can keep the same executable digest while
moving line numbers; source digests identify the supplied text revision.
Unresolvable or absent failure paths remain explicitly unavailable, rather
than being assigned a guessed source location. Displayed paths are capped at
1,024 characters with `pathTruncated` set when clipping occurs. Successful diagnosis exits 0
even when the inspected run failed; invalid arguments or artifacts exit
nonzero.

Compilation also returns `project`, a deterministic source index containing
the entry key, per-file source maps, and structured call origins. Calls record
the actual imported file even when two files compile to the same manifest
digest. Generated wrappers are represented explicitly. For lower-level
inspection, `createSourceTrace(source, options)` constructs an immutable
compiler-derived context; `resolveSourcePath(context, path, "cell")` or
`"invocation"` follows manifest call boundaries and bounded item indices.
Serialized or modified tracing contexts are not accepted as source evidence.

## Scope

Local subprogram calls and bounded `each` are available in source. Bounded
`repeat`, tools, capabilities, durable waits, and program evolution remain
available through the full manifest runtime without source syntax. There is no general decompiler, visual editor, or
executable statechart frontend. Existing manifests and receipts are unchanged.
The source language can grow over the same contract as its next constructs
earn a precise lowering and cross-runtime evidence.
