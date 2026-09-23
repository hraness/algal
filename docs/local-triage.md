# A local application you can change

Local triage is a second ALGAL application with persistent tasks, typed forms,
filtering, grouping, ordering and an editable reopening policy. The same captured
state and typed commands drive its browser, Dioxus desktop and Ratatui terminal
presentations. Schema v2 adds task categories through a replayable memory migration.

## Open it

From a source checkout with Bun installed:

```sh
bun examples/local-triage/run.ts ./my-triage my-triage init
bun examples/local-triage/run.ts ./my-triage my-triage serve
```

Open the printed loopback URL. Its short-lived fragment token authorizes owner
commands for that serving process. The browser removes the token from the address
bar; the server checks the exact host and origin. Task state is stored in the
selected local directory. Stop the server to revoke access.

The macOS arm64 package contains `ALGAL Triage.app`, `bin/triage-tui` and a
standalone `bin/triage-host`. The host embeds Bun and the exact ALGAL expression
WASM, so running an extracted package needs neither a checkout nor an installed
Bun. Build it with `bun examples/local-triage/package.ts`; the repository's
host scheduling rules apply to native builds. Packaging refuses to overwrite
an existing artifact directory. The package manifest records byte hashes.

The desktop adapter uses the system WebView. The local artifact is ad-hoc signed,
not notarized; other desktop operating systems and mobile distribution are not
qualified by this package. See the [renderer guide](../examples/local-triage/renderers/README.md)
for keyboard controls, build commands and the exact supported profiles.

## Tasks, drafts and revisions

Task facts live in `ApplicationMemoryService`. Pure ALGAL expressions produce
view trees, action availability, updates, observations and the v1→v2 migration.
The host bounds each identity to 32 tasks and 128 retained lifecycle states.
It fails at those limits and never silently prunes evidence.

Drafts, filters and focus belong to the editing session. Saving a draft does not
change a task. Commands carry the displayed application head and a durable
operation identity. An identical retry returns its original result; stale or
conflicting commands fail. A changed schema or editing identity preserves the
draft and requires explicit review/rebase. Composition fences defer replacement
while a user is entering text through an IME.

A workflow proposal previews a new ordering, grouping, reopening rule or schema.
The evaluator independently checks the known cases and retains execution receipts.
Adoption rechecks the captured base and retained evidence. Verification refuses
missing records instead of recreating them. A policy change preserves tasks;
a schema upgrade retains the source snapshot and migration receipt.

## On-device proposals

An Apple-enabled package bundles explicitly selected `algal-native` and
`algal-apple` binaries. On a supported Mac with Apple Intelligence enabled and
its model available, enter a request in the desktop's workflow panel and select
**Generate one Apple proposal**. The result is evaluated and previewed. Adoption
is a separate action. Typing does not invoke inference.

The adapter admits one call, records binary identities and the manifest before
execution, retains the native receipt, and checks its selected bridge and replay.
A failed or interrupted attempt remains visible and cannot be silently resent.
It has no cloud fallback. Session drafts and task titles are not model inputs;
the context includes the bounded workflow, task priority/status/category and
owner instruction. Receipts are execution evidence, not provider attestation.
Apple token usage and provider billing remain unavailable.

The roadmap qualification performed a real Apple proposal and an explicit
revision change with process-tree network access denied. Task data survived
restart, export verification and a new-identity fork. This qualifies the tested
on-device path; it is not a claim that every local model or host is supported.
Gateway and explicit loopback Chat Completions adapters remain available in the
broader ALGAL runtime and marketing proposer.

## Portable evidence and forks

The CLI and native interfaces export bounded pure evidence. An import retains
that evidence without taking over an application. Forking creates a fresh
identity, preserves source facts and behavior, and does not copy credentials,
mutable custody, dispatch authority or session drafts. Effect-capable manifests
and external-effect receipts are refused by this transfer profile.

Divergent forks produce an inspectable merge review. Conflicting fields require
explicit resolutions and adoption against the current head. There is no silent
last-writer-wins merge. These are owner-mediated local forks, not a multiplayer
network synchronization service. The [complete CLI guide](../examples/local-triage/README.md)
contains proposal, migration, export/import and merge examples.
