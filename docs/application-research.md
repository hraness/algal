# Controlled application research

`examples/application-research/` is an executable, bounded study of a small
synthetic warehouse-route domain. It exercises model proposal generation,
same-source inference ablation, independent scoring, sealed application
evaluation, conditional activation, and offline receipt replay. It is a new
study. The earlier Harbor coding calibration remains closed; this experiment
does not repair or replace that result and makes no coding-performance claim.

The model proposes one of two host-authored pure context strategies. It cannot
write code, edit the scorer, change authority or budgets, or choose new cases.
The proposer receives four development cases, including their expected answers.
It never receives holdout cases, answers, or feedback. Its single proposal is
recorded and frozen before any paired evaluation begins. There is no second
proposal, tuning after holdout, retry, winner search, or excluded failed attempt.

Eight cases are fixed in `corpus.ts`: four development and four holdout cases.
The control receives structured directed edges. The treatment receives the
**same edges** plus the positive query answers derived from them by the pinned
native Datalog engine. The engine verifies each derivation before dispatch.
Both arms use the same model selector, executor configuration, prompt, output
schema, and limits. The added query answer field is their only input difference.
The scorer's expected answers never enter either answer call. The order is
fixed: control then treatment per case, development before holdout. This small
unrandomized study has no population-level or statistical-significance claim.

Exact quality means the complete sorted, unique list of reachable locations.
A candidate can activate only if all of these conditions hold:

- The model selected the changed `derived-answers` strategy.
- Every completed control pass remains a candidate pass, case by case.
- Candidate development passes strictly exceed control development passes.
- Every candidate holdout case passes.
- No attempted call is incomplete or uncertain, all frozen cases are present,
  and all work/call budgets pass, including the proposal's cost.
- The explicitly pinned host evaluator verifies the exact journal, source
  bindings, native proofs, run receipts, and signed evidence.

A perfect tie is rejected for lack of strict development improvement. A
regression or uncertainty is rejected. A declined proposal is retained and
cannot activate; the fixed ablation still runs unless a call fails. On the first
failed call, dispatch stops and the result records how many answer slots remain
unattempted. A crash preserves the durable intent and reservation; the same
directory cannot run again. Retain that incomplete evidence and reconcile it
instead of retrying inference automatically.

The application host owns publication. The `sealed-research-evaluation.v1`
profile admits only a reproducibly accepted revision, preserves memory and
authority, and checks the expected parent state. An accepted revision is
activated and its pure strategy executes without another model call. A rejected
or incomplete run leaves the incumbent selected. Replay checks the final
revision against the evaluated candidate.

## Run protocol

Use Bun and an already built native `algal` executable. Set `AI_GATEWAY_API_KEY`
or `VERCEL_OIDC_TOKEN` through the host's private credential environment. Never
write a provider credential into plans, manifests, evidence, or command output.

The CLI currently admits the reviewed tuple
`anthropic/claude-haiku-4.5` through Gateway's `anthropic` provider only. Its
frozen upper bounds are 32,768 input tokens and 2,048 output tokens per call,
with host price ceilings of 2 and 6 microUSD per token respectively. The
per-call reservation is 77,824 microUSD, and the complete 17-call study reserves
at most **$1.323008**. The default local allowance is $1.50. The host must verify
these price ceilings remain adequate before a new run and maintain a separate
provider-side credit cap. Reservations are conservative ceilings, not settled
provider charges.

Planning performs zero inference. It creates an immutable zero-call ledger at
`NEW_DIRECTORY.inference-ledger`, then writes the plan into `NEW_DIRECTORY`.
The plan binds the corpus, harness, native engine, exact executor/budget
configuration digest, selected model, limits, and acceptance criteria.

```sh
ALGAL_MEMORY_NATIVE=/absolute/path/to/algal bun examples/application-research/run.ts \
  plan /absolute/path/to/NEW_DIRECTORY \
  --gateway-model anthropic/claude-haiku-4.5 --max-cost-microusd 1500000

# Inspect and retain NEW_DIRECTORY/plan.json before dispatch.
ALGAL_MEMORY_NATIVE=/absolute/path/to/algal bun examples/application-research/run.ts \
  run /absolute/path/to/NEW_DIRECTORY
```

The `run` command has no model, budget, or case overrides. It reopens the exact
unused ledger. It records `trusted-evaluator.json` before inference; retain its
fingerprint as the trust anchor. Each reservation is durable before dispatch,
never refunded, and tied to its effect request. An unknown completion stops the
ledger. Later runs cannot silently reset or bypass its spent allowance.

Every outcome has a signed final result, including rejected, declined, and
incomplete runs. The signature establishes the local evaluator's provenance,
not provider attestation or model truth. Credentials and the ephemeral signing
private key are not retained in the study artifacts. The public fingerprint
alone does not grant verifier authority; supply the fingerprint retained from
the trusted run explicitly when replaying:

```sh
ALGAL_MEMORY_NATIVE=/absolute/path/to/the-same-pinned-algal \
  bun examples/application-research/run.ts verify /absolute/path/to/NEW_DIRECTORY \
  --trusted-evaluator sha256:THE_RETAINED_EVALUATOR_FINGERPRINT
```

Verification performs no inference or application publication. It replays all
model receipts, verifies native query proofs, checks development-only proposer
input and the proposal freeze, recomputes exact scores, verifies the sealed
research verdict, checks application identity/revision, and reconciles every
reserved provider request, settled output and reported token count. Keep both
the study directory and its sibling ledger. `result.json` gives the outcome;
`attempts.json` retains the durable ordered intents and results; the application
store retains all content-addressed inputs, outputs, query proofs, proposal,
accounting, signatures, and application history.

## Evidence limits and tests

`query-fixtures.json` contains eight native query results captured from a pinned
binary. The fixture executor emits authored answers in tests. Neither is model
quality evidence. Tests cover positive activation, perfect-score rejection,
per-case regression, proposal decline/failure, uncertainty stopping, pending
slots, immutable executor configuration, complete cost accounting, same-source
inputs, bounded foreign files, signature tampering, durable-log reordering, and
offline replay. The mock ledger tests exercise the live accounting verifier
without contacting a provider.

```sh
bun test examples/application-research/study.test.ts
```

Only a separately retained live run measures this selected model on these
eight cases. Report that result even when it is negative or inconclusive.
Token counts, runtime work units, reserved spend, and provider charges are
different quantities; the evidence does not convert one into another or infer
cost savings from deterministic byte reduction.

## Live result: 2026-09-23

The first frozen 17-call study completed on commit `0c59180` with
`anthropic/claude-haiku-4.5`. Structured facts scored **6/8** exact answers;
the same facts plus verified Datalog answers scored **5/8**. No quality benefit
was demonstrated. These eight fixed-order synthetic cases support no general
performance conclusion.

The model selected `derived-answers`, but its rationale exceeded the frozen
768-character limit. Proposal admission rejected it; the independently frozen
ablation still completed. No research evaluation or revision activation was
admitted, and the incumbent application state remained unchanged. Neither the
proposal nor any answer was retried or tuned after seeing these results.

All 17 calls settled, with 7,521 reported input tokens and 450 output tokens.
The $1.323008 reservation ceiling remained intact. Gateway reported **$0.010081**
for the task key, covering this study and one separate classification smoke
call (18 calls total). Both runtimes verified the smoke receipt; study replay
verified its signatures, native proofs, all model receipts, scores, and ledger
without provider calls. Apple Intelligence also completed a separate on-device
classification whose receipt verified in both runtimes.

The [compact result record](application-research-results-2026-09-23.json)
retains case outputs, identities, counts, and limitations. Full signed evidence,
the pinned native executable, and provider accounting remain in the local task
artifacts; credentials are kept separately. The earlier failed Harbor coding
calibration remains closed and unchanged.
