# A malleable marketing component

[Open the living component](/living/). Edit its words or layout, preview the result, change its simulated audience and release signals, and keep or restore a version in your browser workspace.

This is an experimental first slice of a larger application model. Its presentation comes from a bounded ALGAL expression program. The browser runs the committed Rust expression evaluator as WASM; the site build executes the corresponding full manifest and verifies its receipt before emitting the static fallback. The browser does not run the complete durable application host.

## Two places to work

The website is a local preview workspace. Keeping a version changes that browser's example; it does not publish to the shared website or claim an improvement in conversion. Its history and export are bounded preview data, not the durable application's commit journal. Browser storage can be unavailable or cleared.

The companion example under `examples/malleable-site/` uses the existing `ApplicationService` for durable identity, expected-head commits and replayable evidence. Its experimental owner-edit policy admits this closed presentation vocabulary through compatibility and output checks. It does not alter the standard optimization policy or invent a passing quality score for a cosmetic edit. Restoration is a new forward revision and preserves current signals; it does not rewind external effects.

## What is editable

The first vocabulary has a headline, body, action label and split/stack layout. The action destination stays `/docs/`. A pure update expression handles two explicitly simulated signals: audience and release availability. A pure view expression emits a bounded tree of stacks, text and links with stable semantic identities.

Imported proposals are closed data records tied to a base revision. They cannot introduce arbitrary JavaScript, Rust, HTML, URLs, capabilities or expression operators. Text is rendered as text. A recorded model suggestion is labeled as recorded; it is not a live model call and its declared source is not provider attestation.

Inference happens through the companion host using the existing budgeted Gateway or local endpoint backend. Credentials stay with that host. The public page needs no inference credentials, and normal editing/rendering does not call a model.

The committed [recorded proposal](/living/model-proposal.json) came from one
Gateway call to `anthropic/claude-haiku-4.5`, with 949 input and 95 output tokens.
Its host reserved 38,912 micro-USD within a 40,000 micro-USD ceiling; the ledger
does not report actual provider cost. The [execution record](/living/model-evidence.json)
includes its portable manifest, receipt, usage and offline replay result. Its
wording is model output for inspection, including unqualified safety language;
it is not endorsed evidence of safety or improvement.

## Run the durable host

From the repository root, initialize a new directory, inspect its exact head,
and render the current component:

```sh
bun examples/malleable-site/run.ts init /tmp/my-algal-surface
bun examples/malleable-site/run.ts inspect /tmp/my-algal-surface
bun examples/malleable-site/run.ts render /tmp/my-algal-surface
```

Write a `config.json` with the four editable fields, then create and preview a
proposal. Output files must be new paths so an earlier experiment is preserved.

```json
{"headline":"Software I can reshape.","body":"A small, inspectable component with a history of its changes.","ctaLabel":"Read the docs","layout":"stack"}
```

```sh
bun examples/malleable-site/run.ts edit /tmp/my-algal-surface config.json proposal.json
bun examples/malleable-site/run.ts preview /tmp/my-algal-surface proposal.json
```

The preview returns `reference`, a digest bound to the exact application head.
Pass that digest to `activate DIRECTORY PREVIEW_DIGEST OPERATION_LABEL`.
Reuse an operation label only to retry that exact command. `signal DIRECTORY
EXPECTED_HEAD event.json OPERATION_LABEL` admits a typed simulated event such
as `{"kind":"audience","value":"operators"}`. A signal changes the head, so a
preview made before it must be regenerated. `restore DIRECTORY EXPECTED_HEAD
TARGET_STATE OPERATION_LABEL` restores the earlier presentation as a new child
while preserving current signals. The experimental host admits at most 64 states.

`export DIRECTORY evidence.json` writes bounded retained lifecycle evidence.
`verify DIRECTORY evidence.json EXPECTED_HEAD` replays it offline against an
independently retained head; verification uses a temporary store and the supplied
directory is unused. A self-supplied head proves only internal consistency.

## Ask a model for one proposal

`propose DIRECTORY backend.json proposal.json` makes one explicitly budgeted
call, saves a proposal and prints its attempt/receipt/accounting references.
It does not activate it. The backend requires `maxCalls: 1`, no automatic retry,
and a fresh durable ledger directory. A failed call leaves its reserved output
file in place; inspect the error and ledger before deciding on another attempt.

For an already running local OpenAI-compatible endpoint, use:

```json
{"provider":"local","model":"YOUR_INSTALLED_MODEL","baseUrl":"http://127.0.0.1:11434/v1","ledgerPath":"/tmp/my-surface-proposal-ledger","maxCalls":1,"maxRequestBytes":8192,"maxOutputBytes":8192,"timeoutMs":60000,"responseFormat":"json_schema"}
```

The local backend permits only unauthenticated loopback endpoints. Set
`responseFormat` to `json_object` or `prompt` if your server lacks strict schema
support; the host still parses the returned data. This demonstrates the adapter,
not qualification of every local model or a packaged offline application.

For Vercel AI Gateway, keep `AI_GATEWAY_API_KEY` in the host environment and use:

```json
{"provider":"gateway","model":"anthropic/claude-haiku-4.5","gatewayProvider":"anthropic","ledgerPath":"/tmp/my-surface-gateway-ledger","maxCalls":1,"maxCostMicrousd":40000,"maxInputTokens":16384,"maxOutputTokens":1024,"inputMicrousdPerToken":2,"outputMicrousdPerToken":6,"maxRequestBytes":8192,"maxOutputBytes":8192,"timeoutMs":60000}
```

Verify the selected provider's current price against these conservative ceilings
before spending. These are host reservations, not a provider billing guarantee.
Use a provider-side credit cap as well. Never put credentials in browser assets.

## Embed in an existing page

Build with `bun run build:site`. Copy `living.js`, `living.css` and the
`living/` assets from `site/dist` to your site's root. The example module loads
its evaluator from `/living/algal_expr.wasm`; serve WASM as `application/wasm`.
The surrounding stylesheet is optional branding; the semantic tree has no
framework dependency.

```html
<link rel="stylesheet" href="/living.css">
<div id="my-component" class="living-surface">
  <h3>Software that can grow with you.</h3>
  <a href="/docs/">Explore ALGAL</a>
</div>
<script type="module">
  import { loadSurfaceEvaluator, mountSurface } from '/living.js';
  const revision = await fetch('/living/initial.json').then(r => r.json());
  await loadSurfaceEvaluator();
  const component = mountSurface(document.querySelector('#my-component'),
    revision, { audience: 'builders', release: 'preview' });
  // Re-evaluates the same ALGAL view, preserving surviving keyed elements.
  component.update(revision, { audience: 'operators', release: 'available' });
  // component.destroy() restores the original fallback content.
</script>
```

Mount each instance on its own element; node identities are scoped to that
root. Generate the static fallback from the same revision and signals with
`renderSurfaceHtml(evaluateView(revision, signals))` at build time. The
`living-root` ID is reserved for the optional demonstration workbench. The
first vocabulary fixes links to `/docs/`; it is not a general-purpose widget
or navigation contract.

## Evidence and portability

The site build emits the starting [revision](/living/initial.json), [signals](/living/signals.json), [semantic view](/living/view.json), [manifest](/living/manifest.json), [portable bundle](/living/bundle.json) and [replay-verified receipt](/living/receipt.json). These files describe the starting example, not later unexported browser edits.

The renderer spike under `examples/malleable-site/renderers/` consumes the same semantic tree. Its results distinguish a web renderer, a desktop WebView and a terminal presentation. Renderer compatibility does not imply identical pixels, full native widgets or general interactive application portability.

## Scope

The [research and application roadmap](malleable-software-plan.md) explains the broader UI, local inference, cloud hosting and observability direction.

The prototype demonstrates inspectable, editable presentation and bounded revision changes. It does not establish model quality, autonomous marketing gains, live analytics attribution, general schema migration, cloud deployment of application revisions or a full browser VM.

Human edits, deterministic responses to signals and evidence-based optimization are different operations. The existing rejected routing study remains rejected. Broader evolution should add explicit contracts for session continuity, richer component composition, trusted signal sources and calibrated promotion policies before widening this example's authority.
