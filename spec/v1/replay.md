# algal.replay-comparison.v1 · algal.ordering-scenario.v1 · algal.ordering-report.v1

Because a run replays bit-for-bit, two questions become runtime operations with recorded evidence: what would a revised manifest have done against the same recorded world, and does a mailbox outcome depend on delivery order. Both produce bounded, parseable records. Neither fabricates evidence: a missing input, capability, or effect is recorded, never synthesized.

These contracts ship in the TypeScript runtime. The native CLI accepts the commands and refuses them explicitly (`replay`, `ordering`, `process replay`); a record cannot be misread as another record.

## Replay comparison

`algal replay <receipt.json> --with <manifest.json>` runs a revised manifest against a recorded `algal.run.v1` receipt. `algal process replay <name> --with <manifest.json>` does the same against a durable process's latest recorded run. Recorded effects answer while the revised trace issues the recorded requests — the record, not the live world, is authoritative for every path it covers: recorded effect receipts, transport provenance, and slot reads replay exactly, and no recorded tool request reaches a live tool. After the trace diverges, requests the record cannot answer route to the admitted live executors in declared order, exactly like a fresh run. The revised run executes against a replay overlay of the store and never mutates it.

The comparison record carries the recorded receipt and manifest digests, the supplied revision's digest and — when it admits — its manifest digest, the merged-args digest, and one of three verdicts:

- `identical` — every recorded cell record reproduced digest-for-digest, the effect sequences match, the outcomes match, and the run charged the same work.
- `diverged` — the revision ran and the records differ. `prefix` lists the leading cells reproduced identically, in recorded activation order; `divergence` names the first divergent cell path with each side's status and record digest, or a receipt-level divergence (`effects`, `outcome`, `work`, `failure`). `added` lists cell paths the revision recorded that the original did not.
- `could-not-replay` — the record or host cannot answer what the revision needs. `reason.code` is `manifest-invalid` (the revision does not parse or does not admit under this host — an unadmitted tool, an unknown function, an unresolvable reference), `missing-input` (a wired input port has no recorded or supplied value), or `missing-effect` (the run issued a request the record cannot answer and no admitted executor could). The request digest is recorded when one was emitted.

`--args <file>` merges over the recorded args per cell per port — an override replaces a port value, never a whole cell — so "same world, different input" is a recorded operation too. `--write` persists the revised run's receipt.

The parser enforces verdict coherence: an `identical` verdict contradicts its record when it carries a divergence, an `added` path, a mismatched outcome, or a null revised receipt; `diverged` requires a revised receipt; `could-not-replay` requires its reason. Bounds cap the record at 1 MiB, the prefix and added lists at 256 entries each (truncation is recorded), and every string and path.

## Ordering exploration

`algal ordering <scenario.json>` enumerates bounded delivery-and-dispatch orderings of a durable-process setup and evaluates an invariant over each terminal state. The scenario — `algal.ordering-scenario.v1` — declares named mailboxes (each bounded), named processes (manifest plus args), a bounded list of external sends (`{mailbox, value, key}` with an explicit idempotency key), an `algal.expr.v1` invariant checked statically over the names `{"processes","mailboxes"}`, limits `{orderings, depth, work, attempts, runs}`, and optional scripted executor responses — the only provider answers the exploration admits.

Args carry `mailbox:<name>:<send|receive>` markers where a capability handle would sit; the service derives handles deterministically from the mailbox name, so one scenario file reproduces one report bit-for-bit. A marker naming an undeclared mailbox fails admission. Every process manifest compiles before the search starts — a scenario whose programs cannot run is a usage error, not a report row.

The explorer enumerates depth-first in a fixed order — every unsent declared send by index, then every dispatchable process by name — and replays each action sequence from a fresh environment. A ready process can always dispatch; a suspended process dispatches only when a wake capability's mailbox has a pending delivery. Dispatch runs the manifest on first contact and resumes the checkpointed receipt after a suspension, the supervisor's own semantics. A leaf is a quiescent state (nothing enabled) or the depth bound.

Every dispatch is charged to one `algal.habitat-budget.v1` account — including the prefix re-runs each explored sequence shares — and the closed account is part of the report. The invariant must return a strict boolean over each terminal state's `{"processes":{"name":{"status","generation","receipt"}},"mailboxes":{"name":{"pending","delivered"}}}`.

The report lists each ordering row — its action labels (`send:<index>`, `tick:<process>`), quiescence, the invariant's value, and per-process status, generation, and last receipt digest — plus the `counterexample` index of the first row whose invariant evaluated false, and the `outcome`:

- `complete` — every sequence up to the bounds was tried; no invariant failed.
- `counterexample` — exploration stopped at the first failing ordering; the row is the witness.
- `exhausted` — `exhaustion.reason` names the bound that stopped the search: `orderings` (the declared bound reached with unexplored orderings) or `budget` (a dispatch reservation was refused mid-ordering; the partial row is recorded). Exhaustion is recorded, never silent.

The parser enforces the coherence rules a forged record cannot pass: a counterexample must name a failing row that no earlier row precedes, `complete` carries no counterexample or exhaustion, `exhausted` requires its record, rows may not exceed the declared ordering bound, and action labels must match the `send:`/`tick:` grammar. Bounds cap the scenario and report at 1 MiB each, mailboxes and processes at 8 each, sends at 32, orderings at 64, and depth at 64.
