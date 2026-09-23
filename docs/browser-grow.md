# A growing application inside the browser

The [browser workspace](https://algal.computer/grow/) is the next small step
toward self-evolving web applications: capture context, propose a bounded change,
independently check it, adopt it against an exact application head, and preserve
the history. The first application is a marketing component embedded in the
existing website.

Its application lifecycle runs locally. IndexedDB holds its records, Web Locks
coordinate writers across tabs, and the existing Rust expression evaluator runs
as WebAssembly. The renderer mounts a bounded semantic view. No application
server, account, provider key, or cloud inference is needed for this workflow.
The surrounding browser, renderer, storage adapter, and evaluation policy remain
trusted host software; the component cannot rewrite them.

## Try the loop

1. Open the workspace and capture an audience or release-stage signal.
2. Select **Suggest a local change**. The baseline proposer uses local rules.
3. Inspect its proposed content, declared fit score, and four-context checks.
4. Select **Use this version** when the candidate passes. The new version becomes
   visible only after its state is durably published by the browser adapter.
5. Reload to reopen the same application. Restore an earlier behavior as a new
   history step, keeping the current signals.
6. Export the history, or import a verified export into a fresh local workspace.

Each workspace has its own URL. **Start a new workspace** creates a separate
application at its starting revision; earlier records remain intact. Use Back
or a bookmarked workspace URL to return. This is also the way to begin another
experiment after reaching the retained history or candidate limit.

An optional automatic mode performs one local-rule attempt after each explicit
signal capture and adopts only a strictly improving, passing candidate. It
starts off in every tab. Pausing or pinning the application is part of its
durable owner controls. There is no background inference loop.

The objective is deliberately small: match the declared audience and release
stage using a fixed, inspectable content/layout policy. Its score is a heuristic
for that objective. It is not a measurement of conversions, factual correctness,
accessibility across arbitrary content, or general writing quality. Model
assertions cannot change the score or waive the independent shadow checks.

## Optional on-device inference

**Download & load local AI** explicitly loads a pinned small model in a dedicated
WebGPU worker. Initial model assets total approximately 203 MiB, excluding
runtime, transfer, and temporary/cache overhead. The button is unavailable when
the browser cannot supply the required GPU features. Ordinary application use
does not download the model.

The model proposes the same closed content/layout schema used by the rule-based
proposer. Its output is untrusted. A parseable suggestion may still fail the
independent guardrails or fail to improve the declared fit score. Stopping or
timing out an attempt terminates its worker; another attempt requires an
explicit load. No uncertain attempt is automatically resent.

See [browser inference](browser-inference.md) for pinned artifact identities,
current compatibility constraints, sources, and integrity limits. Model caching
and shader compilation are separate from application persistence.

## Persistence and offline reopening

The authoritative application uses IndexedDB, not localStorage. Each CAS record,
operation preparation, and head publication retains the existing lifecycle's
separate durability boundary. Web Locks hold custody across asynchronous
admission and publication. The adapter requests strict transaction durability;
this is a browser hint, not a promise against device failure. Stale commands and
conflicting operation identities fail rather than overwriting a newer tab.

localStorage remembers only the selected workspace identity. The earlier
[/living/ editor](https://algal.computer/living/) keeps its separate preview
storage and is not silently migrated into application history.

A narrowly scoped service worker caches a versioned `/grow/` application shell,
its evaluator, fonts, and scripts. The build pins the bytes of every shell asset;
an incomplete or mismatched update cannot replace the installed version.
**Save for offline use** checks that shell and requests persistent browser
storage. The interface reports whether the request was granted. Other website
routes are not promised offline.

Shell readiness qualifies the local-rule workflow. AI additionally needs the
model cache, optional worker asset, GPU support, and sufficient resources. A
successful download is not itself proof of offline inference. Browser storage
may be evicted or cleared, and private sessions may be temporary. Keep a portable
export for data you care about.

## Evidence and recovery

The application retains content-addressed revisions, memory, execution receipts,
candidate evaluations and exact-head adoption evidence. Its bounds are 64 states
and 16 candidate evaluations;
signals and control changes also consume states. A missing or corrupt retained
dependency fails closed rather than being regenerated from a later execution.

An export is checked against its captured head and replayed before a fresh
workspace is selected. It conveys content integrity and pure replay, not an
author signature or permission to perform external effects. Import never
replaces the current database. Recovery export preserves raw stored records
when ordinary opening fails; it is diagnostic data, not a verified application
bundle. Quota errors leave earlier committed state intact and are shown to the
user.

## Development and qualification

From the repository, run `bun run check`, then serve `site/dist` on localhost.
Secure contexts, IndexedDB, and Web Locks are required for mutation. Build-only
WebLLM dependencies are isolated from the zero-required-dependency ALGAL CLI.
The browser lifecycle uses the same canonical SHA-256 identities as Bun and the
native runtime.

`scripts/browser-grow-qualification.mjs` exercises real IndexedDB and Web Locks,
interrupted publication, immutable operation identities, corrupt evidence,
cross-tab contention, import, restoration and network-denied reload/adoption.
CI installs its pinned Chromium and runs the deterministic local-rule path.
Set `ALGAL_PLAYWRIGHT_MODULE` and `ALGAL_BROWSER_EXECUTABLE` to installed tools;
`ALGAL_BROWSER_EVIDENCE` selects its task-owned profile and evidence directory.
The opt-in `ALGAL_GPU_QUALIFY=1` run additionally downloads the pinned model,
performs actual inference, then reloads the model with networking disabled.

The delivery record will distinguish automated lifecycle checks, actual browser
offline/concurrency tests, and real GPU inference. Compilation, mocked model
answers, and a present `navigator.gpu` are not GPU inference qualification.
