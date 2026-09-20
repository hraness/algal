# Locate a failed child invocation

This pure program intentionally divides by zero in the second item. It makes
no model calls. The first item completes; the third item never starts.

```sh
bun cli.ts run examples/source/projects/ratios/ratios.algal \
  --args examples/source/projects/ratios/ratios.args.json > ratios.receipt.json
# The run exits 1 because the fixture intentionally fails.
bun cli.ts diagnose ratios.receipt.json \
  --source examples/source/projects/ratios/ratios.algal --format text
bun cli.ts diagram examples/source/projects/ratios/ratios.algal \
  --receipt ratios.receipt.json --focus result-each/i1 \
  --format svg --out ratio-failure.svg
bun cli.ts verify ratios.receipt.json examples/source/projects/ratios/ratios.algal
```

The source report points to `ratio.algal` and the division expression, with
the caller in `ratios.algal`. The focused graph displays only the second
child invocation, bound to the original root receipt. Diagnosing a failed run
successfully exits 0; source or receipt mismatches exit nonzero.
