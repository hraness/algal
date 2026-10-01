# Read earlier agent context

An agent can retrieve an original instruction or an earlier observation after
its working prompt has been shortened. ALGAL stores the text under a content
hash and lets the application choose which entries that agent may read. A
child can receive a smaller selection with smaller read limits.

The TypeScript module works in browsers and Bun. Rust applications use
`algal::agent_context`. Both implementations use the same stored records,
reference identities, UTF-8 offsets, and search results. This interface is a
library API; it does not add a CLI command.

## Capture and read

```ts
import { AgentContextHost, putAgentContext } from "@hraness/algal/agent-context";
import { MemoryStore } from "@hraness/algal/store-memory";
import { queryAgentContext } from "@hraness/algal/agent-context-tools";

const store = new MemoryStore();
const source = await putAgentContext(store, [
  { kind: "instruction", label: "request", text: "Keep the public API unchanged." },
  { kind: "observation", label: "test output", text: "One test failed.\n" },
]);
const host = new AgentContextHost(store);
const reference = await host.grant(source, [0, 1], { maxReadBytes: 4096 });
const reader = host.bind(reference);
const child = await reader.delegate([0], { maxReadBytes: 1024 });
const original = await queryAgentContext(child, { op: "read", index: 0 });
// original.text === "Keep the public API unchanged."
```

Keep `host` in application code. Give model tools only a bound reader or
closures over that reader. A reference identifies a selection; knowing its
hash does not permit reading it. Each host represents one permission scope.
Do not share a host between unrelated users, contacts, or tasks.

Use a persistent `Store` when the text must survive a restart. Restore
permission from the application's trusted task or user record before calling
`grant` again. An arbitrary reference in model output cannot establish that
permission. The application controls storage quotas and retention; the
per-snapshot limits do not limit total store growth.

## Query from an agent

`queryAgentContext(reader, query)` accepts four operations:

| Operation | Fields | Result |
| --- | --- | --- |
| `inspect` | Optional `offset` and `limit` | A page of permitted entry indices, labels, types, hashes, and sizes |
| `read` | `index` | The entry's type, label, and original text |
| `slice` | `index`, `startByte`, `endByte` | Text between UTF-8 byte boundaries |
| `search` | `query`, optional `maxResults` and `maxScanBytes` | Literal match positions and whether the search covered all permitted text |

Queries reject unknown fields. They cannot supply another snapshot,
capability, file path, or user. Search scans entries in source order and
returns non-overlapping matches. A limited search reports `complete: false`;
an empty result then does not establish that the text is absent.

The query adapter lists 16 entries per page by default, with a maximum of 64.
Its search query is limited to 1,024 UTF-16 code units within the adapter's
JSON input limits. The underlying reader accepts up to 4,096 UTF-8 bytes.

For an ALGAL program, attach `agentContextToolRegistry(reader)` to its
ordinary tools and declare `agent.context.query.v1` in the agent cell's tool
list. Its input is `{query: ...}` and its output is `{result: ...}`. The
program's normal call, work, turn, and journal limits apply. Other agent
frameworks can call `queryAgentContext` through their existing tool interface.
Their host must account for each follow-up model call.

For models that return a structured selection in one call,
`agentContextSelectionToolRegistry(reader)` provides
`agent.context.select.v1`. Its input is `{selection: {indices: [...]}}`.
It accepts at most four unique indices and returns at most 65,536 JSON bytes
of selected entries, plus the snapshot identity. It cannot increase the
reader's permission or per-entry read limit.

`agentContextReplayToolRegistry()` provides signatures for offline
`verifyReceipt` and budget verification. Its functions refuse live reads;
replay uses the recorded tool results. Verifying a receipt checks execution,
not the truth of the stored observation.

## Read a cell's original view

Declare `agent.context.local.v1` in an agent or classifier cell's `tools` list
to use the runtime-managed reader. Compilation recognizes its reserved
signature without a host callback. A standalone tool cell cannot use it.

At each model turn the runtime saves the original cell prompt, exact inputs
selected by `cell.view`, selected ancestor outputs, and successful local tool
results before compaction. Entry 0 is the instruction and entry 1 the permitted
inputs. Selected ancestors, when present, follow at entry 2; tool records
follow in order. `inspect` provides the current labels and indices.

```json
{"tool":"agent.context.local.v1","inputs":{"query":{"op":"read","index":1}}}
```

The query operations match the host-supplied reader above, with a 4,096-byte
read or slice limit and at most 16 search matches. This name cannot replace or
widen an application's `agent.context.query.v1` grant. The runtime rejects
caller-defined functions and mismatched tool signatures under the reserved
name, and never executes a supplied implementation under that name.

Capturing each turn's exact text costs its canonical encoded byte count from
`maxWork`. Queries use the existing turn, model-call, context, output, and
effect limits. A shortened tool log does not erase the saved original, and
resumption reconstructs the same reader from the verified prior effects. The
tool's configuration digest binds the immutable source selection. Source
capture still uses the application's store quota and retention policy.

Only cells that declare this tool receive the added query instructions or
source-capture work. Existing cells and host tool inventories keep their
previous behavior and portable evidence identities. No model performance
improvement is claimed by these execution and replay tests.

## Use training traces during revision

`buildContextTaskReviser` from `@hraness/algal/task-optimizer` extends the
guarded task reviser with one context-selection call and one read step before
the revision call. Supply it to `optimizeTask` with strategy `feedback`.
The supplied run budget must allow at least two model calls and four steps.
Both calls draw from the optimizer's existing total allowance.

The selector sees a catalog of the current task instructions and the selected
training cases' inputs and execution records. Long records are split into
contiguous pieces of at most 8,192 UTF-8 bytes. Labels identify their byte
ranges. The reviser receives the selected original text alongside the
training feedback. Validation and final audit records are excluded.

This helper proposes instruction changes. The optimizer's patch interface also
supports permitted training examples when supplied by a custom reviser.
The task's tools, permissions, budgets, and evaluator remain controlled by the
application. Failed reads and rejected proposals remain recorded work; the
previous candidate remains available. Selection freezes before final audit.

## Limits

Each snapshot contains at most 1,024 entries and 8 MiB of source text. One
entry contains at most 1 MiB, and its label at most 128 UTF-8 bytes. A reader
returns at most 64 KiB of source text per read and at most 128 search matches;
applications can reduce these limits. JSON escaping and tool envelopes have
separate output limits. Request a smaller slice when the encoded result is
too large. A host holds at most 256 distinct grants.

The interface preserves text captured by the application. It cannot recover
text discarded before capture, establish that an observation is true, or
turn retrieved text into additional permissions. It does not provide an OS
sandbox, automatic agent recursion, or a fresh budget for delegated work.

The design draws on programmable inputs and history in the
[*Harness as a Language* preprint](https://arxiv.org/html/2609.26891v1).
Tests cover stored identity, read permissions, Unicode, replay, and resource
limits. They do not establish improved model performance. Consumer comparison
experiments should keep the model, available information, feedback exposure,
and total allowance comparable, then evaluate frozen changes on fresh cases.
