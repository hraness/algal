# algal.search.v1

A search report records bounded, validation-guided evolution over organism manifests. Search is a host layer over ordinary generator organisms and `algal.foundry.v1` evidence; it adds no executable manifest primitive or authority.

## Generations

A search runs 1–8 generations. At each generation:

1. The generator organism receives fixed task arguments and, when configured, the prior generation's candidate digests, train and validation scores, work, token usage, and promoted digest.
2. Its declared output is parsed as 1–32 ordinary organism manifests.
3. The previous winner survives and competes with the new proposals. Duplicate manifest digests collapse.
4. Every candidate runs against train and validation cases under the host registry, executors, transports, store, and root manifest budgets.
5. Deterministic foundry ordering promotes one survivor.

Holdout expectations, outputs, scores, and receipts never enter generation evidence or generator feedback. After the final generation, the last winner is evaluated once against holdout cases through `algal.foundry.v1`.

## Evidence

Each generation records its index, generator manifest and receipt digests, proposed manifest digests, complete candidate evidence, and promoted digest. The search report also records the generator digest, final foundry report, an optional `budget`, and a canonical digest over the complete history.

Verification checks bounds and unknown fields, recomputes the report digest, verifies deterministic promotion and survivor continuity, confirms every proposal was evaluated, rejects holdout evidence in generations, resolves every referenced manifest and receipt, and replays generator and candidate runs offline. The final foundry report is independently verified.

A verified search report proves the recorded evolutionary history and selection are internally consistent. It does not establish that the fitness cases are representative, prevent a generator from overfitting visible train or validation evidence, or prove future live effects will match recorded effects.

## Habitat budget

A config may add a [habitat budget](foundry.md#habitat-budget), `"budget": {"work": W, "attempts": A, "runs": R}`. One `algal.habitat-budget.v1` account with activity `search` then covers every run: each generation's generator run and candidate cases, then the final epoch's selection and holdout runs. The first reservation that does not fit stops the search, and `foundry search` writes the exhausted account instead of a report and exits with status `1`. A complete search report carries the account as `budget`; its final foundry report never carries one. Verification also checks that `budget` lists exactly the search's runs in that order, with the last generator run listed once, and that each ceiling and charge matches its manifest and receipt. `foundry search-verify` accepts a report or an exhausted `search` account. Reports without `budget` keep their bytes and digests. A [habitat schedule](foundry.md#habitat-schedules) can run a search beside other activities against one shared account.
