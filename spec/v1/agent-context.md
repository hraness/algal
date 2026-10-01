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
