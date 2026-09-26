# A ballot box built on the shared collection programs

This example tallies a ballot box: each ballot has an original pick,
corrections rewrite picks last-wins, spoiled ballots are flagged, and the
tally groups current picks in first-occurrence order. It makes no model
calls. It is a second, unrelated project that imports the same
[shared program catalog](../../../../docs/library.md) entries as the
[message log](../message-log/README.md), showing that the collection
contracts carry no product shape.

| Program | Responsibility |
| --- | --- |
| `main.algal` | Tally the box: every ballot's current pick, corrected and spoiled flags, and the counts per pick. |
| `ballot.algal` | View one ballot: whether it is on the roll, its original and current picks, its flags, and the ballots sharing its pick. |
| `../shared/apply_updates.algal` | Shared: apply last-wins corrections to ballot picks. |
| `../shared/flags_for.algal` | Shared: flag spoiled ballots. |
| `../shared/group_by_key.algal` | Shared: group ballots by current pick. |
| `../shared/includes_text.algal` | Shared: spoiled-list membership for one ballot. |
| `../shared/latest_value.algal` | Shared: last correction naming one ballot. |
| `../shared/lookup_by_key.algal` | Shared: one ballot's original pick and its pick's member list. |

The imports leave this directory, so every command passes the parent
directory as the source root. From the repository root:

```sh
bun cli.ts run examples/source/projects/ballot-box/main.algal \
  --source-root examples/source/projects \
  --args examples/source/projects/ballot-box/main.args.json
bun cli.ts run examples/source/projects/ballot-box/ballot.algal \
  --source-root examples/source/projects \
  --args examples/source/projects/ballot-box/ballot.args.json
```

The `Ballot` record requires a nonempty `id` and `pick`; a `Change` carries
a `target` and a json `value`. Picks group by text, so a change whose value
is not text fails the tally at the `group_by_key` call rather than casting.
A change naming no ballot is ignored; two changes to one ballot apply the
last one. The fixture's three ballots see `b2` corrected `no` to `yes` and
`b3` spoiled, so the tally answers `yes: 2, no: 1` and `ballot.algal`
answers `b2`'s original `no`, current `yes`, and the `b1`, `b2` pair that
shares it.

Tests cover the successful tally and single-ballot view, the shared digests,
malformed ballots and changes, and the non-text change failure. The native
parity suite runs both entry points in Rust from their bundles.
