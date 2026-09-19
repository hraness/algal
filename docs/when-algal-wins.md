# When ALGAL is useful

ALGAL is useful when a workflow has stable structure around a few uncertain
judgments: gather evidence, ask a narrow question, check the result, wait for
authority, then act. Its program format makes that structure inspectable;
its receipts allow later replay; its process supervisor preserves progress
between CLI invocations.

## Demonstrated: decisions that survive a wait

Run the [process VM example](vm.md):

```sh
bun scripts/vm-demo.ts --keep --out vm-report.json
```

The fixture reviews a release report, writes a proposal, waits for approval,
and publishes a local mailbox message only when the host approves the same
release. It tests two independent actors and a separate pair with identical
arguments. An optional native executable adds cross-runtime handoff.

The report measures two decision-adapter invocations for the two main actors,
compared with four for the same workflow restarted from entry without a
checkpoint. Recorded proposals do not repeat; idle scheduling and offline
verification make zero decision calls. The approved actor publishes once and
the denied actor publishes zero times.

This is a concrete benefit for release reviews, approval queues, and similar
work where redoing the reasoning after a pause would waste work or change a
previously reviewed proposal. The example uses scripted decisions and local
mailboxes. It does not measure live model quality, production reliability,
provider cost, or superiority over another system with durable checkpoints.

## Evidence before judgment

`examples/invest/` contains a six-ticket billing investigation fixture. The
correct label depends on a charge ledger. One graph classifies the ticket
alone; another first retrieves the ledger through a typed tool. The fixture
is useful for testing evidence routing, output equality, tool receipts, and
benchmark verification.

```sh
bun cli.ts bench examples/invest/bench-invest.config.json \
  --tools examples/invest/bench-invest.tools.json --dir .algal \
  --out invest-report.json
bun cli.ts bench verify invest-report.json \
  --tools examples/invest/bench-invest.tools.json --dir .algal
```

The default configuration uses scripted responses. It cannot establish that
one live provider is more accurate or cheaper than another. A comparison
where one system receives the ledger and another does not primarily measures
evidence access. For a provider or workflow quality claim, give every system
the same evidence and tool access, evaluate a representative held-out workload,
and retain the report, price inputs, and receipts from the live run.

`bench-invest-live.config.json` is a starting configuration for an explicitly
authorized live experiment. Provider availability and prices must be checked
at that time. Reported tokens and configured rates can support a cost estimate;
fixture effect counts alone cannot support a dollar estimate.

## Other suitable shapes

- **Many small judgments over bounded context.** Define each cell's input
  view and route typed results into deterministic checks. Measure whether the
  decomposition helps; more cells can also add latency and cost.
- **Conditional escalation.** Route disagreement or failed validation into a
  stronger decision path. Measure both ordinary and escalated cases against
  the same task criteria.
- **Program generation and selection.** Generate candidates as manifests,
  admit them through the same type and budget checks, and retain evaluation
  and promotion evidence. Keep evaluation inputs and host authority outside
  the generated program's control.
- **Offline inspection after execution.** Preserve the manifest closure and
  receipts when reviewers need to reproduce graph execution without repeating
  external calls. The replay checks consistency, not external truth.

## When the extra machinery is unnecessary

A single unstructured request with no durable state, tools, or inspection
requirement usually needs no graph runtime. An existing durable workflow
system may already meet the task's recovery and approval needs. ALGAL adds
value when its data-only program representation, explicit model boundaries,
and shared execution/evidence contracts are useful to the application.

Before treating a local demonstration as production qualification, supply the
missing host pieces for the intended deployment: capability admission,
external-effect reconciliation, storage operations, and isolation where needed.
Those responsibilities do not disappear when a receipt verifies.
