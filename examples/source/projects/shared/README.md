# Shared pure programs

This directory holds the generic pure programs of the
[shared program catalog](../../../../docs/library.md). Each file is one
digest-pinned catalog entry that projects import with `../shared/` paths, so
every caller runs the same compiled program rather than a copy.

All of them declare `max_agent_calls: 0` and make no model calls. They work
on small ordered list shapes — text lists, `{target, value}` updates, and
`{key, id, member}` pairs — that recur wherever a project folds an event or
record stream into a view: last-wins edits, membership flags, keyed lookups,
first-occurrence grouping. The contracts are deliberately generic; product
projects keep their own event records and do the mapping.

| Program | Responsibility |
| --- | --- |
| `includes_text.algal` | Membership scan over a text list. |
| `latest_value.algal` | Value of the last update naming a target, or a fallback. |
| `lookup_by_key.algal` | Member of the first pair carrying a key, or a fallback. |
| `apply_updates.algal` | Apply last-wins updates to a whole entry list, flagging revised rows. |
| `flags_for.algal` | One membership flag per id, for caller-side joins. |
| `group_by_key.algal` | Group pair members by key in first-occurrence order. |

`Pair`-shaped inputs carry a distinct nonempty `id` per element. Entries use
the id channel to tell occurrences apart; the catalog page states what
repeated ids mean for each program.

The [message log](../message-log/README.md) and
[ballot box](../ballot-box/README.md) projects call every entry here, under
the shared source root `examples/source/projects`.
