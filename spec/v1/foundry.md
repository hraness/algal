# morphogen.foundry.v1

A foundry report is content-addressed evidence for selecting one bounded organism population. It records no wall-clock values and contains no executable code.

## Selection

A foundry run admits 1–32 distinct candidate manifests and 1–256 uniquely named cases. Every candidate declares an interface compatible with every case. Cases have three splits:

- `train` — visible examples used by the generator or search strategy.
- `validation` — evidence used to select a candidate.
- `holdout` — run exactly once against the promoted candidate; never run against the rest of the population.

A case passes only when its run completes and the candidate's canonical interface output record equals `expect`. Promotion orders candidates by validation pass rate, train pass rate, ascending agent calls, ascending work units, then manifest digest.

## Candidate generation

A host may supply candidate files or run a generator organism. The generator must declare an interface output containing a non-empty list of `morphogen.organism.v1` values, directly or under a configured object field. Every value passes through the ordinary manifest parser. Invalid, duplicate, or over-bound populations fail before evaluation.

The generator is an ordinary organism. It may compose `repeat`, `each`, `spawn`, slots, gates, and nested organisms to implement bounded generations, populations, lineage journals, or approval. The foundry grants it no additional functions, executors, capabilities, or budgets.

## Report

A report contains:

- `candidates` — manifest identity, train and validation scores, aggregate work, and case evidence;
- `promoted` — the deterministic winner's manifest digest;
- `holdout` — case evidence for the promoted manifest only;
- `lineage` — optional generator manifest and run-receipt digests;
- `digest` — the canonical digest of every preceding report field.

Each case records its split, expected and actual interface outputs, outcome, pass claim, work, and stored run-receipt digest. Candidate manifests, generator manifests, and all referenced run receipts live in the host store.

## Verification

Verification rejects unknown fields and malformed bounds, recomputes the report digest, scores, pass claims, and deterministic promotion, resolves every referenced manifest and receipt, compares recorded outputs, outcome, and work with each receipt, and replays every run offline. Bundle export is permitted only after successful verification and packs the promoted organism's content-addressed closure.

A verified report proves that the recorded evidence and selection are internally consistent. It does not prove that cases represent deployment, expectations are correct, the model was truthful, or the promoted organism will receive the same effects on a future live run.
