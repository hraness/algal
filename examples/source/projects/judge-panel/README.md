# A judge panel over nested `each` and `decide`

This example fans a small set of cases out to per-alternative decisions: each
case maps to a child run that scores and safety-checks every alternative. It
is the impure counterpart of the shared pure collection programs — `decide`
makes model calls, so nothing here is, or can be, a catalog entry. It shows
the shape a reusable judgment workflow takes once the pure projection work
is done upstream.

| Program | Responsibility |
| --- | --- |
| `main.algal` | `each` over at most two cases, one child run per case. |
| `judge_case.algal` | `each` over at most four alternatives, sharing the case brief as decision context. |
| `judge_alternative.algal` | Two `decide` questions per alternative: a labeled `score` for quality and a `noul` keep probability for safety, reduced to a verdict record. |

```sh
bun cli.ts run examples/source/projects/judge-panel/main.algal \
  --source-root examples/source/projects \
  --args examples/source/projects/judge-panel/main.args.json \
  --responses examples/source/projects/judge-panel/main.responses.json
```

The scripted responses serve every decide cell in execution order:
`b1-quality-decide` then `b2-keep-decide` for each alternative of each case,
sequentially. A score answer must carry a numeric `score`, a `confidence` in
0 through 1, and a probability for every declared label; a keep answer must
carry a `noul` probability in range. A malformed answer fails inside the
generated decision check before the verdict record is built.

The `Case` record holds an `id`, a `brief` text used as shared context, and
its `alternatives`. Each `Verdict` records the alternative id, the score and
confidence, the keep probability, and a `flagged` boolean derived from
`keep >= 0.5` — policy, not a correctness guarantee. A third case, a fifth
alternative, or a malformed case record fails the run rather than being
dropped.
