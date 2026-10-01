# Agent context records

These records store exact text for an application-controlled agent context.
They use the existing JSON content-addressed `Store`. TypeScript and Rust
share the [interoperability fixture](../../scripts/fixtures/agent-context.json).
The [usage guide](../../docs/agent-context.md) covers host integration.

An entry is `{schema: "algal.agent-context-entry.v1", kind, label, text}`.
`kind` is `instruction`, `input`, `observation`, or `output`. All strings
must be valid Unicode. `label` is limited to 128 UTF-8 bytes and `text` to
1,048,576 bytes. Unknown fields are rejected.

A snapshot is `{schema: "algal.agent-context.v1", entries}`. Each ordered
entry is `{digest, bytes}`, where `digest` identifies an entry record and
`bytes` is its UTF-8 text length. Empty snapshots are valid. There are at
most 1,024 entries and 8,388,608 total text bytes. Both the hash and byte
length are checked when loading an entry.

A reference is `{schema: "algal.agent-context-ref.v1", snapshot, capability}`.
`snapshot` is the snapshot hash. The capability class is `agent-context` and
its descriptor is `{schema: "algal.agent-context-grant.v1", snapshot,
indices, limits}`. `indices` is a unique, strictly increasing list of
zero-based source indices. `limits` contains `maxReadBytes`, `maxScanBytes`,
and `maxSearchResults`, positive integers capped at 65,536, 8,388,608, and
128 respectively.

Handles identify host-registered permissions. A serialized descriptor or
handle cannot create permission. A host stores at most 256 distinct grants
for one trusted principal. Delegation requires a subset of the parent's
indices and limits no larger than the parent's. Applications reconstruct
grants after restart only from their trusted ownership records.

Reads return the entry's kind, label, and original text. Slices use a start-inclusive, end-exclusive UTF-8
byte interval and reject positions inside a multi-byte code point. Search
accepts a nonempty literal of at most 4,096 UTF-8 bytes, scans permitted
entries in order, and returns non-overlapping match intervals. It does not
scan an entry that would exceed its remaining scan allowance. It reports
`complete: false` when a scan or match limit stops the operation, including
when the match count reaches its limit on the final possible match.

Snapshot and entry hashes use the ordinary ALGAL canonical JSON digest.
Records have no clock fields. The host keeps source records unchanged when
making a smaller prompt or a delegated view. Storage retention and total
quotas belong to the host. Reads check the values returned by the store against
their hashes and recorded byte lengths. Missing or changed returned values fail.
The storage adapter controls persistence and caching; this interface does not
independently reread the backing filesystem when an adapter serves cached data.

## Runtime local context

An agent or classifier cell can declare `agent.context.local.v1`. Both runtimes
provide its reserved read-only signature: `{query: json} -> {result: json}`,
cost 100, and maximum encoded output 65,536 bytes. Host implementations cannot
replace it. A standalone tool cell receives an inert declaration and cannot
read another cell's context.

Before each model turn, the runtime captures the original instruction, the
cell's filtered input map, its explicitly selected ancestor ports when present,
and each original result in its own tool history. Each is an ordered entry;
ancestor and tool records use canonical JSON text. Hidden inputs and other
cells' unselected outputs are excluded. Prompt compaction does not alter the
original history. Capture charges the canonical JSON byte lengths of all entry
texts against the existing work budget before writing a snapshot or dispatching
that agent turn. Any preceding compaction decision remains separately charged
under the existing model-call and work limits.

The read configuration grants at most 4,096 text bytes per read or slice and
16 search matches. Queries cannot supply references, paths, or new grants.
The local protocol validates foreign JSON before reading; object-key checks
use UTF-16 lexical order so errors replay identically across runtimes. The
existing host-bound `agent.context.query.v1` keeps its original parsing behavior.

The local tool configuration digest is the canonical digest of
`{contract: "algal.agent-context-local-tool.v1", query}`, where `query` is the
digest of `{contract: "algal.agent-context-tool.v1", reference}`. Each turn
therefore binds its exact source selection for journal recovery. The runtime
reconstructs the snapshot from the filtered view and verified earlier effects
during replay; a declaration adds no permission to the host's tool inventory.
