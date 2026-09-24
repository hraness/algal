# Follow a component to its evidence

The [workbench](https://algal.computer/workbench/) shows one captured application
state: the running component, its revision and signals, the view receipt, retained
history, proposals, inference observations and available commands. Selecting a
node explains which revision field or signal supplies its value. All of those
explanations describe the same captured render.

The public page is a recorded example. It accepts exported captures for inspection
but does not carry owner credentials or publish changes. A content digest identifies
bytes; it is not an author signature. The build creates and replay-verifies the
example without calling a model. Its inference panel retains two previously
recorded Gateway calls; it does not present a replay as a new model invocation.
The original call's actual charge remains unknown. The
[second recorded call](/workbench/model-cost-evidence.json) retained 949 input
and 84 output tokens and a matching Gateway-reported USD 0.001369 debit. Its
candidate was inconclusive under the independent evaluator, and it did not
change the active application.

## Open an owner workspace

From a source checkout with Bun dependencies installed:

```sh
bun run build:site
bun examples/malleable-site/run.ts init ./my-surface
bun examples/malleable-site/run.ts serve ./my-surface
```

Open the URL printed by `serve`. The host listens only on `127.0.0.1`, on an
ephemeral port unless specified. A random process-local token arrives in the URL
fragment; the client removes it from the address bar and sends it in an
authorization header. The server checks the exact host and request origin. Stop
the server to revoke the token. Do not share that owner URL.

The same page now supports owner preview/adoption, ordered demonstration signals,
forward restoration, and model pause/pin controls. A draft remains separate from
application state and is kept when the host refreshes or a stale command fails.
The application head and control digest fence commands from both the UI and CLI.
The command's actor label is an audit description, not caller authentication.

```sh
bun examples/malleable-site/run.ts capture ./my-surface
bun examples/malleable-site/run.ts command ./my-surface command.json
bun examples/malleable-site/run.ts shadow ./my-surface proposal.json
bun examples/malleable-site/run.ts export-workbench ./my-surface evidence.json
```

Captures are bounded read models, not backups. Use the evidence export for
retained lifecycle, journal and execution records. Verify against an independently
retained expected head. Exporting never copies filesystem custody or provider
credentials.

The local journal seals its committed count and head through a content-addressed
anchor and an atomic checkpoint. A prepared entry remains inspectable after an
interruption; recovery may publish only its exact retained bytes and never
resends inference. Missing committed entries fail closed. Older journals remain
readable with an explicit missing-checkpoint gap and acquire a seal on their next
append. Export verification proves pure replay, not filesystem custody.

## Signals and controls

A signal envelope names its admitted source class, stream and sequence, and a
closed audience or release event. The host derives its operation identity from
source, stream and sequence. An exact retry returns the original result; a reused
identity with changed content, sequence gap or unknown earlier sequence fails.
Different producers must still submit against the current application head.
Source labels describe host-admitted provenance; they do not authenticate an
external producer. The browser controls record demonstration signals.

Signal cursors and owner controls are part of versioned application memory.
Restoration selects earlier behavior as a new revision and preserves current
signals. It does not rewind data or dispatch an external effect. Legacy captures
remain readable and explicitly report their missing ordered-source provenance.

Pausing inference prevents a new attempt while allowing an already admitted
attempt to retain its result. Model activation can be paused separately. Pinning
holds the current surface revision while signals and inspection continue. These
are trusted host controls; a proposal cannot change them.

## Proposals and offline checks

The existing `propose` command makes one explicit, budgeted Gateway or loopback
model call. The workbench retains admission and completion, failure or uncertainty
so a restart does not hide an unfinished attempt. An unknown completion never
causes an automatic resend. The underlying ledger's reservation is a host budget
charge, not actual provider billing. Token usage remains unknown when absent.

New Gateway attempts also retain the bounded generation identity separately from
the canonical execution receipt. An owner can retrieve its reported charge:

```sh
bun examples/malleable-site/run.ts gateway-cost ./my-surface ATTEMPT_DIGEST
```

Use the `journalAttempt` digest printed by `propose`. This uses the configured
`AI_GATEWAY_API_KEY` or `VERCEL_OIDC_TOKEN` for one
read-only lookup. It never sends inference again. The journal joins the response
to the generation, request, output, model and token counts before displaying the
reported debit. A missing response stays unknown; earlier attempts without a
generation identity retain their original unknown cost. Gateway debits, host
reservations and a provider's invoice are separate observations. For BYOK, the
reported upstream list price does not establish the provider invoice. See the
[Gateway generation lookup contract](https://vercel.com/docs/ai-gateway/sdks-and-apis/rest-api#look-up-a-generation).

This first accounting path binds valid structured completions. A malformed
response, missing generation ID, interrupted transport or failed observation
write can still incur a charge without enough retained evidence to attribute it.
Those costs remain unknown, never zero; accounting does not authorize another
inference call. Accounting for invalid completions needs a separately defined
response-observation contract.

The independent shadow evaluator renders the incumbent and candidate in four
audience/release contexts and replays their receipts. It checks stable node IDs,
the fixed documentation destination, unchanged signal meaning, compatibility,
and a small host-owned list of prohibited editorial claims. An unchanged proposal
is inconclusive. The list detects only its declared literal patterns; it cannot
establish that arbitrary prose is true or useful.

A pass means the proposal passed these offline guardrails. It does not establish
conversion uplift, general safety or publication eligibility. The report grants
no promotion authority. Human editing, ordinary deterministic operation and
automatic public experimentation remain distinct policies.

Model-qualified activation uses `MarketingWorkbench.execute`, which joins the
completed attempt and passing independent shadow evidence at the captured head.
The lower-level `MarketingHost.activate` remains an explicit trusted-owner API;
it is not a model admission boundary.

## Bounds and remaining work

This example retains at most 64 application states, 16 signal streams and 128
journal entries. It displays remaining capacity and fails closed at its bound;
it never silently prunes source evidence. Each pending inference reserves room
for an uncertain terminal record and its eventual reconciliation, plus a
generation observation for Gateway calls. Charge lookups use only unreserved
capacity. This is a bounded demonstration, not indefinite
production retention.

The [roadmap execution record](malleable-roadmap-progress.md) tracks hosted
lifecycle integration, useful local/native applications, richer migrations,
forks and their separate qualification gates. Public traffic promotion and a
production cloud SLO are not established by this workbench.
