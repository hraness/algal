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

A config may add `"budget": {"work": W, "attempts": A, "runs": R}` to limit the whole activity, separately from each run's own manifest budgets. One `algal.habitat-budget.v1` account then covers every run the foundry starts, in this order: the generator, each candidate's train and validation cases, then the promoted candidate's holdout cases. Under `foundry search`, one account covers the whole search: each generation's generator run and candidate cases, then the final epoch's selection and holdout runs.

Before a run starts, the account reserves the run's declared ceiling: its root manifest's `maxWork` and `maxAgentCalls`, plus one run. Nested children share the root's allowance and need no reservation of their own. The run starts only when every total stays within its limit after the reservation. When the run ends, the account charges the work units and executor attempts its receipt records, whatever the outcome, and releases the rest of the reservation. A run that fails before it records a receipt (for example when admission of its manifest fails) is not listed: its reservation is released without a charge, the activity reports that error instead of an account, and earlier runs keep their records. Losing candidates, failed runs, failure-edge recovery, and retried provider attempts are charged what they recorded.

The first reservation that does not fit ends the activity. No further run starts, and instead of a report the foundry or search writes the account with `"outcome": "exhausted"` and the refused reservation; both CLIs exit with status `1`. The account makes no score or promotion claim, and completed runs keep their stored receipts. When every run fits, the report carries the account as `budget` with `"outcome": "complete"`. A search report carries its account the same way, and its final foundry report (`result`) never carries one.

The closed record has these fields:

- `activity`: `foundry`, `search`, or `experiment`. `foundry` and `foundry search` write `foundry` and `search` accounts. An `experiment` account comes from the application evaluations a host charges to it; see [joining promotion evidence](application.md#joining-promotion-evidence). A host can drive the same account from TypeScript (`HabitatAccount`) or Rust (`habitat_budget::Account`).
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

Parsing recomputes the arithmetic: each run fit when it started, the totals are the sums of the charges, and `reasons` names exactly the exceeded limits. `foundry verify` accepts either file the command writes. For a report, it also checks that `budget` lists the report's runs in order, that each ceiling matches its manifest, and that each charge matches its receipt. For an exhausted account, it checks the same ceilings and charges and replays every listed run offline. `foundry search-verify` does the same for a search: `budget` must list the search's runs generation by generation and then the final epoch's, with the last generator run listed once, and an account of another activity is reported as a mismatch. `budget` is an optional addition to `algal.foundry.config.v1`, `algal.foundry.v1`, and `algal.search.v1`; configs and reports without it keep their bytes and digests.

A host can continue a complete account in a later process with `HabitatAccount.resume(record, store)` (Rust `Account::resume`). Every listed run must still reconcile with the store: its manifest declares the recorded ceiling, and its receipt records the charge. A record that does not reconcile, or an exhausted one, cannot continue.

The account charges receipt quantities only, and it carries no wall-clock values. It is separate from the application namespace quota, `algal.application-quota.v1`, which records filesystem bytes in a mutable host ledger that is not replayed.

## Habitat schedules

A habitat schedule runs several foundry and search configs against one habitat budget account. The TypeScript CLI runs one with `algal foundry schedule <schedule.json>` and verifies its record with `algal foundry schedule-verify <record.json>`. The native CLI exits with status `2` for both commands and for a schedule record passed to `foundry verify` or `foundry search-verify`.

An `algal.habitat-schedule.config.v1` file is the closed object `{contract, order, budget, activities}`. `order` is `round-robin`. `budget` is `{work, attempts, runs}` with the habitat budget's bounds. `activities` lists `{kind, config}` entries: `kind` is `foundry` or `search`, and `config` is the path of an `algal.foundry.config.v1` file, relative to the schedule. A scheduled config cannot set its own `budget`.

Each activity asks for one run at a time. The scheduler grants a request only when every unfinished activity is waiting for one, and then grants the next activity after the last one it granted, in activity order. Only one activity computes at a time, so the order depends only on the activities' own runs. Each grant reserves the run's declared ceiling and charges what its receipt records, exactly as the habitat budget does. The first reservation that does not fit ends every unfinished activity with the outcome `exhausted`; activities that already finished keep their reports. An activity that fails for another reason stops the schedule, which reports that error instead of a record.

The closed `algal.habitat-schedule.v1` record has these fields:

- `order`: `round-robin`.
- `limits`, `charged`, and `outcome`: the shared account's, as in `algal.habitat-budget.v1`.
- `activities`: `{kind, outcome, report}` for each activity in order. `report` is the digest of the activity's stored foundry or search report, or `null` when the activity is `exhausted`. A report written inside a schedule never carries `budget`.
- `runs`: each charged run in order, as `{activity, manifest, receipt, ceiling, charged}`, where `activity` is the index of the activity it served.
- `refused`: `null`, or the first refused reservation `{activity, manifest, ceiling, reasons}`.

The command prints the record, writes it to `--out` when given, and exits with status `0` when complete and `1` when exhausted. Parsing recomputes the account arithmetic, requires `outcome` to be `exhausted` exactly when an activity is, and recomputes the round-robin order from the number of runs each activity was charged: a finished activity waits for nothing, and the refused activity is the one whose turn came next. `foundry schedule-verify` also verifies each complete activity's report as a foundry or search report, replaying its runs, checks that the report records exactly the runs charged to that activity, checks every ceiling and charge, and replays the runs of exhausted activities offline.

`--journal <dir>` makes a schedule resumable. The directory holds `journal.json`, the closed object `{contract, order, limits}` with contract `algal.habitat-journal.v1`, and `runs/000000.json`, `runs/000001.json`, and so on: one entry `{activity, manifest, receipt, ceiling, charged}` per charged run, written once its receipt is stored and never rewritten. When the directory already holds entries, the schedule starts its activities again from the beginning and serves each journaled run from its stored receipt instead of starting it. An entry must name the granted activity and the requested manifest, its ceiling must match the manifest, its receipt must be stored and record the run's arguments, and its charge must match that receipt. A journal written under another order or other limits, a missing entry, an entry that does not match, or more entries than the schedule requests stops the command with status `2`. After the last journaled run, new runs start and are journaled in turn, so an interrupted schedule continues where its journal ends. A run whose receipt was stored but not journaled runs again. Replaying a complete journal starts no run and prints the same record.

| Field | Bound |
| --- | --- |
| `activities` | 1 to 8 entries |
| `activities[].config` | 1 to 512 characters |
| `runs` | at most `limits.runs` entries; 4,096 at most |
| One journal file | 4,096 bytes |

Scheduling application experiment evaluations, orders other than `round-robin`, and schedules in the native runtime are proposed.

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

Case admission requires every argument name to be an own declared interface
input and the expectation's own key set to equal the declared output key
set. An inherited JavaScript member never supplies a declaration or an
expectation. Producer and imported-report verifier apply the same predicate.
Interface arguments are mapped in canonical name order; if multiple names
target one input port, the last present name in that order supplies its value.
Generator arguments use the same ordering. Object insertion order is not part
of the case semantics.

## Verification

Verification rejects unknown fields and malformed bounds, recomputes the report digest, scores, pass claims, and deterministic promotion, resolves every referenced manifest and receipt, compares recorded outputs, outcome, work, and token usage with each receipt, and replays every run offline. Bundle export is permitted only after successful verification and packs the promoted organism's content-addressed closure.

For scored cases, verification also re-admits the case/interface binding and
compares mapped case arguments with the receipt's actual arguments. Generator
lineage receipts are replayed as generator executions; they are not scored
candidate cases. Historical reports whose conflicting input aliases relied on
insertion order may fail current verification; their bytes are preserved and
the original implementation is needed to reproduce that historical mapping.

A verified report proves that the recorded evidence and selection are internally consistent. It does not prove that cases represent deployment, expectations are correct, the model was truthful, or the promoted organism will receive the same effects on a future live run.
