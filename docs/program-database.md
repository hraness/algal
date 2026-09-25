# The program database

`algal db` builds and answers a program database: a derived, disposable
structural index over an ALGAL store, plus a limited query surface an agent
can compose questions against. The index lives at `program.db` inside the
store directory, next to the semantic index (`semantic.db`). Both are host
tooling. Neither is contract data: deleting `program.db` loses nothing a run
needs, and rebuilding it never changes a manifest, receipt, record, or digest.

The store keeps programs, runs, durable processes, and application history
as content-addressed JSON. The index copies the structural facts into SQLite
relations so questions like "which manifests embed this manifest" or "which
application revisions were never evaluated" become joins instead of file
system walks.

## What the index sees

The builder walks these places under the store directory:

| Place | Records indexed |
| --- | --- |
| `manifests/` | Every `algal.organism.v1` manifest: digest, key, name, cell and edge counts, every cell's kind and declared ports, and organism/each/repeat child-manifest links. |
| `runs/` | Every run receipt: storage digest, manifest digest, outcome, per-cell status and work, recorded work totals, and capability classes found in run arguments or suspended effects' wake lists. |
| `values/` | Every canonical value: digest, contract tag, bytes. `algal.process.v1`, `algal.application-revision.v1`, `algal.application-state.v1`, `algal.application-transition.v1`, and `algal.application-evaluation.v1` records also land in typed relations. |
| `effects/` | Effect memo records: storage key, request digest, executor, output-or-error. |
| `slots/` | Each slot's name and the canonical digest of its current value. |
| `processes/` | Each `head.json` resolved against indexed process records. |
| `applications/` | Each `head.json` resolved against indexed application states, plus `operations/` and `outbox/` records. |
| `mailboxes/` | Each mailbox's `config.json` digest and contract tag. Message files are not indexed; they change under live drivers and are not structural. |
| `capabilities/` | Host-admitted capability records, counted by contract tag. |
| `other` | Top-level entries that are no record place and no derived file, counted by name. |

The index does not see into payloads. Cell port values, memory records,
mailbox messages, and bundled artifacts are content-addressed data the index
counts by kind but does not open into relations.

## Relations

`algal db tables` lists the relations, their columns and types, and the
projections. The main ones:

- `manifests`, `cells`, `cell_ports`, `manifest_children` — program
  structure and static composition edges.
- `receipts`, `receipt_cells`, `receipt_capabilities` — run outcomes, per
  cell status and work, capability classes a run touched.
- `values_index` — every stored value by digest and contract tag.
- `process_records`, `process_capabilities`, `processes` — generation
  history and the head join per process name.
- `applications`, `app_revisions`, `app_entrypoints`, `app_states`,
  `app_transitions`, `app_evaluations`, `app_operations`, `app_dispatches` —
  application history, executable wiring, and dispatch state.
- `slots`, `effects`, `record_kinds`, `skipped` — mutable state, effect
  memos, the record-kind histogram, and the records the build could not
  admit.

## Querying

A query is a JSON object, not SQL. `bun:sqlite` exposes no authorizer hook,
so instead of exposing raw SQL the surface parses a declarative shape and
generates parameterized SQL over whitelisted relations and columns:

```json
{
  "table": "cell_ports",
  "columns": ["cell", "port", "capability"],
  "where": [{ "column": "capability", "op": "eq", "value": "mailbox-receive" }],
  "order": [{ "column": "cell" }],
  "limit": 10
}
```

Unknown keys are rejected. Tables and columns must be relations the index
declares. Operators are `eq`, `ne`, `lt`, `le`, `gt`, `ge`, `in` (1 to 64
values), `like` (text columns), `null`, and `not-null`. Values must match
the column's type: safe integers for integer columns, strings of at most
4,096 bytes for text columns.

Limits: the query document is at most 8,192 canonical bytes and 128 nodes;
at most 32 columns, 32 predicates, 8 order keys; `limit` is 1 to 1,024 rows
(default 64); each row is at most 4,096 bytes and a result at most
1,048,576 bytes. Answers that hit a row or byte cap come back with
`"truncated": true`. Every answer carries `index.digest`, the fingerprint of
the store state the index was built from, so a caller can tell which
snapshot answered.

```sh
algal db query '{"table": "processes", "where": [{"column": "status", "op": "eq", "value": "complete"}]}'
algal db query @questions/failed-runs.json
```

## Projections

Canned joins answer the common questions without a query document:

```sh
algal db callers-of sha256:…            # manifests embedding this manifest digest
algal db revisions-for-executable sha256:…
                                      # application revisions whose entrypoints
                                      # run this manifest, directly or through
                                      # their indexed child closure
algal db receipts-touching-capability mailbox-receive
                                      # receipts that carried the class in
                                      # arguments or a suspended effect's wake list
algal db unevaluated-revisions        # revisions with no indexed evaluation
algal db largest-work                 # receipts by recorded work, largest first
algal db process-status               # head-record counts per process status
algal db kinds                        # the record-kind histogram
```

`--limit <n>` caps projection rows the same way `limit` caps queries.

## Build, staleness, and drift

```sh
algal db build [--dir <path>]
algal db status [--dir <path>]
```

`build` walks the store under explicit limits and writes the new index to a
scratch file that is renamed over `program.db`, so an interrupted build never
leaves a half-written index. The report names the store state indexed: a
deterministic fingerprint digest computed per place from the sorted record
names (and content digests for the mutable slots, heads, and mailbox
configs), plus row counts per relation, the record-kind histogram inputs,
and every skipped record with a short reason.

`status` rescans the same places and compares fingerprints. It exits 1 when
any place's entry count or digest differs — index-versus-store drift — and
prints the per-place `indexed`/`current` comparison. It exits 0 when the
index matches the store, or when no index exists (`"indexed": false`).

The index is point-in-time. Rebuild after the store changes; there is no
incremental refresh today. Mailbox messages, process coordination files, and
dot-prefixed working files are deliberately outside the fingerprint: they
belong to live drivers, not to the record surface the index answers.

Records that fail admission are counted and skipped, never fatal: a file
over its place's byte cap, a file that is not JSON, a JSON record whose
canonical digest does not match its CAS name, a record claiming a known
contract whose fields fail that contract's parser, a name outside the
place's pattern. The first 256 skipped records are listed in the index's
`skipped` relation with a short reason; the report counts any overflow.

## Limits

- Directory entries scanned per place: 65,536.
- Rows materialized per relation: 1,048,576.
- `values/` and `effects/` records read up to 4,194,304 bytes; manifests
  1,048,576; receipts 16,000,000; application sub-records 262,144; heads,
  markers, mailbox configs, and capability records 16,384 bytes; slots
  262,144.
- Query: 8,192 bytes, 128 nodes, 32 columns, 32 predicates, 64 `in` values,
  8 order keys, 1 to 1,024 rows, 4,096 bytes per row, 1,048,576 bytes per
  result.
- The `revisions-for-executable` closure walk is capped at depth 64.
- `algal db` runs on the Bun reference runtime. Native CLI support is a
  proposal, not shipped: the index format (`program.db`, schema
  `algal.program-db.v1`) and the query shape are stable enough to mirror,
  and a native implementation should rebuild rather than parse the file.
