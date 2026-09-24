# Run an evolving component in your browser

**Preview.** Open the [browser workspace](https://algal.computer/grow/) to change
a marketing component's content and layout, inspect a suggestion, and save the
version you choose. Its history stays in your browser. You can use it without an
application server, account, provider key, or cloud inference.

IndexedDB stores application records, Web Locks coordinate writes across tabs,
and the Rust expression evaluator runs as WebAssembly. The renderer displays a
limited set of component elements. The browser, renderer, storage adapter, and
evaluation policy are trusted host software that the component cannot rewrite.

## Try a change

1. Open the workspace.
2. Choose an audience and release stage.
3. Select **Save context**.
4. Select **Suggest a local change** to generate a suggestion from local rules.
5. Inspect the proposed content, fit score, and checks across four contexts.
6. Select **Use this version** when the suggestion passes. It becomes visible
   after the browser adapter saves the new application state.
7. Reload to reopen the same application.

You can restore earlier behavior as a new history step while keeping the current
signals. Export saves a portable copy of the history; import opens a verified
copy in a fresh workspace.

Each workspace has its own URL. **Create workspace** creates an application
at its starting version and preserves earlier records. Use Back or a bookmarked
workspace URL to return. Start another workspace when an experiment reaches its
history or candidate limit.

Automatic mode makes one attempt using local rules after you save context.
It adopts the suggestion only if it passes the checks and strictly improves the
fit score. The mode starts off in every tab. Pause and pin controls are saved
with the application. Inference does not run in the background.

The fixed content and layout policy scores how well a suggestion matches your
chosen audience and release stage. This score measures only those criteria;
conversion, factual accuracy, general writing quality, and accessibility across
arbitrary content are outside its scope. The model cannot change the score or
bypass the independent checks across contexts.

## Use on-device inference

**Download & load local AI** loads a pinned model in a dedicated WebGPU worker,
which runs inference separately from the page. Model files total about 203 MiB,
plus runtime, transfer, and temporary/cache overhead. The button is unavailable
when the browser lacks the required GPU features. Ordinary application use does
not download the model.

The model can suggest the same content and layout fields as the local rules.
The application checks its output before offering it for adoption. A suggestion
may parse successfully and still fail the checks or fail to improve the fit
score. Stop or timeout terminates the worker. Another attempt requires you to
load it again; uncertain attempts are never retried automatically.

See [browser inference](browser-inference.md) for model versions, compatibility,
file-integrity checks, and results from the tested browser and device. Model
caching and shader compilation are separate from saving application history.

## Save and reopen offline

IndexedDB stores the application history. It saves content-addressed records
(records identified by hash), prepared operations, and the pointer to the current
state in separate steps. Web Locks keep one writer in control during asynchronous
checks and writes. The adapter requests strict transaction durability, a browser
hint that cannot guarantee protection against device failure. Commands based on
an older state and conflicting operation identities are rejected before they
can overwrite another tab's work.

localStorage remembers only the selected workspace. The
[/living/ editor](https://algal.computer/living/) uses separate preview storage;
its previews are not migrated into application history.

A service worker scoped to `/grow/` caches the application page, evaluator,
fonts, and scripts. The build pins each file's bytes. An incomplete or mismatched
update cannot replace the installed version. **Save for offline use** checks
these files and requests persistent browser storage. The interface reports
whether the browser granted that request. Other website routes require a
connection.

Offline readiness covers the application and local rules. AI also needs its
model and optional worker file cached, GPU support, and sufficient resources;
downloading the model alone does not establish readiness. Browser storage may
be cleared or evicted, and private sessions may be temporary. Keep an export
for data you care about.

## History and recovery

The application saves program versions, memory, execution records, candidate
evaluations, and the evidence linking each adoption to its starting state. A
workspace holds at most 64 states and 16 candidate evaluations. Signals and
control changes also consume states. Missing or corrupt dependencies stop the
operation; later execution cannot silently replace the missing records.

Before an imported workspace is selected, its export is checked against the
saved current state and replayed. Exports establish content integrity and pure
replay. They carry no author signature or permission to perform external actions.
Import creates a fresh database and preserves the current one. If ordinary
opening fails, recovery export saves raw records for diagnosis. Those records
have not passed the application-export checks. Storage quota errors appear in
the interface and leave previously saved state intact.

## Development and browser tests

For local development, run `bun run check`, then serve `site/dist` on localhost.
A secure context, IndexedDB, and Web Locks are required to change application
state. WebLLM is a build dependency; the ALGAL CLI has zero required runtime
dependencies. Browser records use the same canonical SHA-256 identities as Bun
and the native runtime.

`scripts/browser-grow-qualification.mjs` tests IndexedDB and Web Locks,
interrupted writes, immutable operation identities, corrupt records, competing
tabs, import, restoration, and reload/adoption with networking disabled. CI
installs its pinned Chromium and runs the local-rule workflow. Set
`ALGAL_PLAYWRIGHT_MODULE` and `ALGAL_BROWSER_EXECUTABLE` to installed tools;
`ALGAL_BROWSER_EVIDENCE` selects the test profile and results directory.
`ALGAL_GPU_QUALIFY=1` also downloads the pinned model, generates a suggestion,
and reloads the cached model with networking disabled.

The [browser inference test record](browser-inference.md#status-and-limits)
lists the tested device, browser, and offline model results.
