# Consumer protocol audit

A dependency update does not show that an ALGAL consumer uses a new behavior or
preserves its earlier work. This inventory starts the [P8 audit](north-star.md#p8-consumer-protocol-audit)
with the consumers named in that plan. It is an inspection queue, not a record of
consumer adoption.

## Source-local evidence

At ALGAL source revision `bc6ddae6e426b2727a3ce7e07158b248bae74309`
(2026-10-11), the [north-star plan](north-star.md#p8-consumer-protocol-audit)
names the ten consumers below. The proposed probes come from that plan's
[consumer pilots](north-star.md#p12-representative-consumer-pilots),
[hosted adapter](north-star.md#p9-hosted-habitat-adapter), and
[skills migration](north-star.md#p10-skills-and-provider-migration). They are
questions to check in consumer source, not claims about installed integrations.
No consumer repository was inspected for this record.

| Consumer named by the plan | First source or fixture question | Inspection status |
| --- | --- | --- |
| `algal-cloud` | Does the hosted adapter preserve operation identity across duplicate delivery and uncertain dispatch? | Not inspected |
| `algal-lab` | Which candidate and holdout records consume ALGAL evaluation contracts? | Not inspected |
| `ghostget-skills` | Where does a procedure stop before a provider effect with an uncertain result? | Not inspected |
| `clankdar` | Which challenge-issuance fixture checks the event and its receipt? | Not inspected |
| `iconplace` | Which browser-local composition fixture runs without model access? | Not inspected |
| `midiplace` | Which planning fixture separates its typed plan from realization? | Not inspected |
| `spongev2` | Which durable conversation fixture covers suspension and recovery? | Not inspected |
| `textbutler` | Which durable conversation fixture covers suspension and recovery? | Not inspected |
| `bio` | Which research fixture uses a sealed evaluator? | Not inspected |
| `sloptrade` | Which ALGAL entry point is used, if any, in a current workload? | Not inspected |

ALGAL's [package exports](../package.json) identify possible entry points but
say nothing about which ones a consumer imports. In
[`ApplicationCore`](../src/application-core.ts), a host must supply
`admitCommit`; dispatch needs a separate `admitDispatch` method, and an
uncertain dispatch has a separate `reconcileDispatch` path. Local
[application tests](../src/application-core.test.ts) and
[crash tests](../src/application-crash.test.ts) exercise this ALGAL-side code.
The [application parity driver](../scripts/application-parity.ts) compares
ALGAL's Bun and Rust implementations, not a consumer's provider or storage.

The local [application host adapter guide](application-host-adapters.md) gives
one conditional check for hosts using `ApplicationCore`: the embedding host
supplies policy, persistent storage, and reconciliation for uncertain dispatch.
It does not establish that any consumer in the table uses that API. The
[north-star execution plan](north-star-execution.md#consumer-discovery-and-adoption-register)
reports a historical, lower-bound dependency search. A dependency declaration
alone does not establish an active integration, and this source-local queue is
not the private portfolio register described there.

## What each consumer inspection must establish

For each inspected source revision, record its repository and owner, resolved
ALGAL version and dependency route, contracts actually used, local runtime,
provider-effect boundary, evaluator, durable state, scheduler, receipt format,
and migration risk. Name a representative fixture and its literal validation
command, plus the behavior, data, permissions, and recovery that remain the
consumer's responsibility. Record stored or installed programs separately from
the source dependency. Use an explicit unknown when a field cannot be verified.

## Status and limits

P8 is incomplete: all ten named consumers lack an inspected source revision,
assigned owner, and verified fixture in this record. For every row, the
resolved ALGAL version, contracts used, local runtime, provider boundary,
evaluator, durable state, scheduler, receipt format, migration risk, and
installed-program status remain unverified; unknown does not mean unused. The
[next inspection](north-star-execution.md#phase-c0-consumer-register-and-impact-matrix)
needs authorized access to each consumer's source and its own validation. This
page neither changes consumer code nor authorizes a migration or live effect.

Agent-decided, owner may revisit: use the source-local queue without treating it
as a complete portfolio census. The private register and its owner remain a
separate C0 decision.
