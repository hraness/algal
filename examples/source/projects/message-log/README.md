# A message feed projected from an event log

This example projects a message feed from an ordered event log, the same
shape a chat room view takes: posts carry bodies, edits rewrite a post's
body, retracts tombstone it, marks flag it, and threads group posts by a
shared key. It makes no model calls. Every collection behavior comes from
the [shared program catalog](../../../../docs/library.md) under
`../shared/`, so the project keeps only its event record and the mapping
between shapes.

| Program | Responsibility |
| --- | --- |
| `main.algal` | Project the whole feed: rows with current body, author, and flags, plus thread groups. |
| `thread.algal` | View one post: its thread's members, its flags, and its last edit. |
| `../shared/apply_updates.algal` | Shared: apply last-wins edits to post bodies. |
| `../shared/flags_for.algal` | Shared: flag retracted and marked posts. |
| `../shared/group_by_key.algal` | Shared: group post ids by thread key. |
| `../shared/includes_text.algal` | Shared: membership scan for one post's flags. |
| `../shared/latest_value.algal` | Shared: last edit naming one post. |
| `../shared/lookup_by_key.algal` | Shared: one thread's member list. |

The imports leave this directory, so every command passes the parent
directory as the source root. From the repository root:

```sh
bun cli.ts run examples/source/projects/message-log/main.algal \
  --source-root examples/source/projects \
  --args examples/source/projects/message-log/main.args.json
bun cli.ts run examples/source/projects/message-log/thread.algal \
  --source-root examples/source/projects \
  --args examples/source/projects/message-log/thread.args.json
bun cli.ts dependencies examples/source/projects/message-log/main.algal \
  --source-root examples/source/projects --format text
```

The `Event` record fixes the message schema the feed reads: a nonempty `id`,
a `kind` in `["edit", "mark", "post", "retract"]`, an `author`, a `clock`
the projection trusts for ordering, a `target` and `thread` that carry `""`
when unused, and a json `body`. The projection is body-agnostic: a post's
body is the row payload and an edit's body its replacement, passed through
as json; a retracted row keeps its id with a `null` body. An event that
violates the record, including an unknown kind or an empty id, fails the run
at the `events` parameter rather than being skipped.

The fixture has three posts (two threaded under `t1`), two edits to `p1` of
which the last wins, one edit naming no post, one retract of `p2`, and marks
on `p1` and `p3`, viewed as `alice`. `main.algal` answers rows
`p1`/`p2`/`p3` — `p2` with a null body — and thread group `t1` with members
`p1` and `p2`. `thread.algal` answers `t1`'s members, `p1`'s flags, and its
current body `edited twice`.

Tests cover the successful projections, the shared digests, malformed
events, and the failure locations of wrong-typed payloads. The native
parity suite runs both entry points in Rust from their bundles.
