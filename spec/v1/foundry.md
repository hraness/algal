# algal.foundry.v1

A foundry report is content-addressed evidence for selecting one bounded organism population. It records no wall-clock values and contains no executable code.

## Selection

A foundry run admits 1–32 distinct candidate manifests and 1–256 uniquely named cases. Every candidate declares an interface compatible with every case. Cases have three splits:

- `train` — visible examples used by the generator or search strategy.
- `validation` — evidence used to select a candidate.
- `holdout` — run exactly once against the promoted candidate; never run against the rest of the population.

A case passes only when its run completes and the scorer accepts. The default scorer is exact match: the candidate's canonical interface output record must equal `expect`. A `algal.foundry.config.v1` may instead carry `"scorer"` — an `algal.expr.v1` program evaluated over `{"args", "expect", "outputs"}` that must return a boolean. A thrown or non-boolean scorer is a config bug and fails `SCORER_INVALID`; a dead edge is the only way a guard says no, and likewise a scorer that crashes says nothing — the run fails. Promotion orders candidates by validation pass rate, train pass rate, ascending agent calls, ascending work units, then manifest digest.

## Candidate generation

A host may supply candidate files or run a generator organism. The generator must declare an interface output containing a non-empty list of `algal.organism.v1` values, directly or under a configured object field. Every value passes through the ordinary manifest parser. Invalid, duplicate, or over-bound populations fail before evaluation.

The generator is an ordinary organism. It may compose `repeat`, `each`, `spawn`, slots, gates, and nested organisms to implement bounded generations, populations, lineage journals, or approval. The foundry grants it no additional functions, executors, capabilities, or budgets.

## Habitat budget

A config may add `"budget": {"work": W, "attempts": A, "runs": R}` to limit the whole activity, separately from each run's own manifest budgets. One `algal.habitat-budget.v1` account then covers every run the foundry starts, in this order: the generator, each candidate's train and validation cases, then the promoted candidate's holdout cases.

Before a run starts, the account reserves the run's declared ceiling: its root manifest's `maxWork` and `maxAgentCalls`, plus one run. Nested children share the root's allowance and need no reservation of their own. The run starts only when every total stays within its limit after the reservation. When the run ends, the account charges the work units and executor attempts its receipt records, whatever the outcome, and releases the rest of the reservation. Losing candidates, failed runs, failure-edge recovery, and retried provider attempts are charged what they recorded.

The first reservation that does not fit ends the activity. No further run starts, and instead of a report the foundry writes the account with `"outcome": "exhausted"` and the refused reservation; both CLIs exit with status `1`. The account makes no score or promotion claim, and completed runs keep their stored receipts. When every run fits, the report carries the account as `budget` with `"outcome": "complete"`. `foundry search` rejects a config with `budget`.

The closed record has these fields:

- `activity`: `foundry`, `search`, or `experiment`. The foundry command is the only built-in producer; a host can drive the same account from TypeScript (`HabitatAccount`) or Rust (`habitat_budget::Account`).
- `limits`: `{work, attempts, runs}`.
- `runs`: each started run in order, as `{manifest, receipt, ceiling, charged}`, where `ceiling` and `charged` are `{work, attempts}`.
- `charged`: `{work, attempts, runs}`, the sums over `runs`.
- `outcome`: `complete` or `exhausted`.
- `refused`: `null` for a complete account; otherwise `{manifest, ceiling, reasons}`, where `reasons` lists each limit the ceiling would exceed, from `attempts`, `runs`, and `work`, in that order.

| Field | Bound |
| --- | --- |
| `limits.runs` | 1 to 4,096; `runs` holds at most `limits.runs` entries |
| `limits.work` | 1 to 409,600,000,000 |
| `limits.attempts` | 0 to 262,144 |
| `ceiling.work`, `ceiling.attempts` | 1 to 100,000,000 and 0 to 64, the manifest `maxWork` and `maxAgentCalls` limits |
| `charged.work` of one run | 0 to 4,294,967,295 |
| `charged.attempts` of one run | 0 to that run's `ceiling.attempts` |

The runtime checks `maxWork` after each activation, so a run's recorded work can exceed its ceiling by the cost of the activation that crossed it. The account charges the recorded amount; `charged.work` can therefore exceed `limits.work` by that amount, and every later reservation is refused. Executor attempts never exceed their ceiling.

Parsing recomputes the arithmetic: each run fit when it started, the totals are the sums of the charges, and `reasons` names exactly the exceeded limits. `foundry verify` accepts either file the command writes. For a report, it also checks that `budget` lists the report's runs in order, that each ceiling matches its manifest, and that each charge matches its receipt. For an exhausted account, it checks the same ceilings and charges and replays every listed run offline. `budget` is an optional addition to `algal.foundry.config.v1` and `algal.foundry.v1`; configs and reports without it keep their bytes and digests.

The account charges receipt quantities only, and it carries no wall-clock values. It is separate from the application namespace quota, `algal.application-quota.v1`, which records filesystem bytes in a mutable host ledger that is not replayed.

## Report

A report contains:

- `candidates` — manifest identity, train and validation scores, aggregate work, and case evidence;
- `promoted` — the deterministic winner's manifest digest;
- `holdout` — case evidence for the promoted manifest only;
- `scorer` — optional `algal.expr.v1` scorer the pass claims were made under;
- `lineage` — optional generator manifest and run-receipt digests;
- `budget`: the complete habitat budget account, when the config sets one;
- `digest` — the canonical digest of every preceding report field.

Each case records its split, interface args, expected and actual interface outputs, outcome, pass claim, work, aggregate input/output token usage, and stored run-receipt digest. Candidate records aggregate work and usage across selection cases. Candidate manifests, generator manifests, and all referenced run receipts live in the host store.

## Verification

Verification rejects unknown fields and malformed bounds, recomputes the report digest, scores, pass claims, and deterministic promotion, resolves every referenced manifest and receipt, compares recorded outputs, outcome, work, and token usage with each receipt, and replays every run offline. Bundle export is permitted only after successful verification and packs the promoted organism's content-addressed closure.

A verified report proves that the recorded evidence and selection are internally consistent. It does not prove that cases represent deployment, expectations are correct, the model was truthful, or the promoted organism will receive the same effects on a future live run.
