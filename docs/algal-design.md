# ALGAL: language, harness, habitat

ALGAL is the new product name for Algal, with a nod to ALGOL. The useful
unifying object is a **program with bounded authority and retained evidence**.
An organism is the program; a coding-agent session is one host application;
a habitat is a host that evaluates and admits a population of programs.

## Two promises, three layers

1. **Programs that grow:** capture useful agent behavior, compose it, generate
   variants, evaluate them, and retain the winning versions and their lineage.
2. **More from every model:** narrow the inference problem, provide evidence,
   perform deterministic work outside the model, and measure the resulting
   quality/cost frontier. This is not a universal efficiency guarantee.

| Layer | Owns | Must not own |
| --- | --- | --- |
| Language/kernel | Typed cells, scheduling, bounded computation, content identity, deterministic replay | Credentials, arbitrary executable code in manifests |
| Harness | Goals, context projections, memory snapshots, tool admission, ACP sessions | Silent approval, unrestricted retries of uncertain mutations |
| Habitat | Population policy, measured evaluation, lineage, promotion | Self-granted authority or automatic runtime replacement |
| xcb routing boundary | Provider-native processes, subscription custody, quota-aware handoff | ALGAL program semantics or truth of recalled claims |

## Audit baseline

Inspected the v1 contract/parser, graph admission, scheduler, effect seam,
store, bundles, verification, foundry/search, benchmark surfaces, CLI, examples,
and public documentation. Baseline: 157 tests, typecheck, lint, and site build
passed. Passing those tests does not establish the broader claims below.

| Finding | Consequence | Required correction |
| --- | --- | --- |
| Cache keyed only by effect request | Different providers/models can share an answer | Bind cache identity to the admitted executor configuration |
| Canonical object accumulation uses `{}` | `__proto__` can disappear from canonical JSON | Preserve all own keys; add adversarial canonicalization tests |
| Process and HTTP bytes checked after buffering | Claimed byte bounds are not memory bounds | Bound streams while reading, drain stderr, propagate cancellation |
| Replay uses the supplied mutable store | Verification can rewrite current slots | Replay in an isolated overlay; do not repeat mutable effects |
| MemoryStore returns live object references | A caller can mutate content after hashing it | Snapshot values on write and read |
| File-store path helpers trust caller strings | SDK callers can escape intended namespaces | Validate digests and slot names at the store boundary |
| Bundle installation writes before validating all claims | Rejected bundles can partially install | Validate the complete bounded bundle before any write |
| Civilization script clears its working state and promotes every digest | No durable measured evolution or robust rejection evidence | Append verified, bounded population snapshots with explicit evaluation |
| Apple Intelligence named without an adapter | Documentation implies nonexistent native support | Implement an actual Foundation Models bridge with availability diagnostics |
| Receipts described as proofs of correctness/authenticity | Replay is confused with truth or attestation | State exactly what replay verifies; no cryptographic attestation claim |
| Coding-agent subprocess treated like a pure model call | Retries/cache can repeat or hide workspace effects | Classify mutating executors and delegate lifecycle/custody to the agent owner |
| Package `./manifest` export points to a missing file | Public import is broken | Export the actual contract module |

This is an engineering audit, not a security certification. Versioned contracts
remain subject to adversarial testing. A host-supplied function, tool, or coding
agent can perform only the operations its host actually constrains; a manifest
being data is not an OS sandbox.

## Research references and decisions

### Oh and Wordcell: authority versus projections

[Oh](https://oh.computer) separates a statement from an assertion of that
statement and from the evidence supporting it. Its canonical records and
operation log are authoritative; search indexes and Datalog are derived.
[Wordcell](https://github.com/hraness/wordcell) keeps Markdown and Git as the
record, with bounded graph proofs tied to an exact source revision.

ALGAL should not replace either system or silently import private vaults.
Native memory follows the same boundary: content-addressed observations with
source references, plus a snapshot naming which observations are in scope.
A rule/query is also data. Evaluation returns rows and supporting fact/rule
identities for that exact snapshot. Retrieval relevance is not acceptance.

Use **positive, range-restricted Datalog**, not unrestricted Prolog: finite
relations, no function symbols, no cuts, no arbitrary I/O, no negation-as-failure.
Bound facts, arity, rules, joins, rounds, derived tuples, proof nodes, and output
bytes. Exhaustion must not masquerade as an empty or complete answer. A missing
fact is unknown, not false. Correction creates a new snapshot; old runs retain
the old one. This makes memory usable as deterministic program input.

### Gobstopper: compaction is a view

[Gobstopper](https://github.com/hraness/gobstopper) preserves pre/post states
in a content-addressed vault. Its live-session control belongs to the provider
session owner; transcript surgery is an idle/resume-boundary operation.

ALGAL's native counterpart should compact **its own context**, not rewrite
Codex/Claude/Devin transcripts. Preserve exact source records, keep pinned task
constraints and recent turns, replace eligible old payloads with digest links,
and record the selection policy and before/after byte counts. Failure to meet
a budget is explicit. No invented summary and no claimed token savings from
byte counts. A model-generated summary can later be an ordinary evaluated cell,
not a privileged lossy write to memory.

### AgentMixer and xcb: one custody owner

At audit time `hraness/agentmixer` redirects to
[hraness/xcb](https://github.com/hraness/xcb). xcb retains the published
`@hraness/agentmixer` compatibility package; its native Rust kernel already owns
account leases, provider qualification, usage, bounded continuation, and
quota-triggered handoff. There are not two independent current products to
split blindly.

Use **ACP v1** for client/agent communication. ALGAL can be an ACP agent to an
editor/multiplexer, and an ACP client to a host-selected coding agent. ACP is
not provider authentication and is not a sandbox. Devin documents `devin acp`;
Codex/Claude integrations may use compatible adapters or xcb's qualified native
path rather than assuming their CLIs speak ACP directly.

Do not copy subscription tokens into ALGAL manifests or switch accounts by
copying credential stores. xcb decides whether a route is qualified, fresh,
available, and fully settled. ALGAL must not retry a coding mutation after a
timeout. Unknown completion/cleanup remains unknown. Keep generic model calls
and delegated coding tasks distinct even when both produce effect receipts.

### Hosted and on-device models

Retain Vercel AI Gateway's fixed origin and credential behavior. Add a separate
OpenAI-compatible adapter with a host-configured base URL, model, credential
environment name, structured-output mode, and timeout/byte caps. Never honor a
model-supplied endpoint. Require HTTPS except explicitly local loopback HTTP,
reject redirects and URL credentials, and do not print upstream error bodies.
OpenRouter is a preset for that adapter, not a new authentication mechanism.

Apple Intelligence means Apple's **Foundation Models** framework on supported
macOS/Apple Silicon, not an invented hosted model identifier. A small Swift
bridge is appropriate even with a Rust kernel: check availability, use guided
generation where supported, return JSON, and let the same output binder enforce
the declared contract. Never silently fall back to a cloud provider.

The implemented bridge (`hraness/apple-foundation`, pinned by tag) translates a bounded
JSON Schema into `DynamicGenerationSchema` — strings, numbers, integers,
booleans, arrays, objects, enums, optional properties, bounded depth and
property counts — so declared output contracts constrain decoding rather than
merely validate after the fact. Schemas it cannot translate fall back to
bounded free-text generation and ordinary contract validation. It enforces
context and output byte budgets, rejects gate requests (approval is a host
decision, not a model call), and never calls external tools.

### Models decide; hosts compile

The civilization work surfaced a general principle: **ask the model for the
smallest sufficient decision, and let the host own everything else.** Emitting
a whole manifest is too much surface for a small or on-device model — free-form
generation produces syntax the contract must reject, and every rejection wastes
the call. The native `algal civ` loop instead gives the designer two cells:

1. an `agent` cell whose contract is a small *plan* — a JSON array of 1–4 step
   strings like `["fn:format.v1;prefix=Hello, "]` or `["const:\"x\""]`, and
2. an `fn` cell running `manifest.compile.v1`, which compiles the plan into a
   manifest deterministically: resolves each step's chain port, emits const
   cells for bindings, checks edge types, and assigns the content-derived key.

The model picks verbs and literals; the host owns grammar, typing, graph shape,
budgets, admission, measurement, and promotion. The compiler ignores
annotations that cannot affect the compiled program (bindings to unknown or
chain ports, bare non-step tokens) while still rejecting malformed intent —
an unknown `fn:` name, a missing `=`, an invalid literal, an empty or
over-length plan. With schema-constrained decoding on the Apple bridge, this
surface is small enough that an on-device model proposed plans that compiled,
passed their cases, and promoted for all four demo goals.

## Rust migration and compatibility

Port incrementally behind tests. Keep the independently runnable TypeScript
reference until the Rust path covers the complete existing contract. Compare
canonical identities, graph behavior, outputs, failures, and replay, not merely
whether both commands exit zero. Unsupported native features must fail
explicitly, never execute a weakened interpretation or silently invoke Bun.

Existing `algal.*.v1` identifiers and legacy fixture filenames are durable
wire coordinates, not branding mistakes. Do not rewrite old CAS objects to
rename them. The public command/package/site become ALGAL; `.algal` is the new
store default, and `--dir .algal` remains explicit access to old state.
The site keeps its configured origin until a new domain is actually provisioned.

## Implementation status during this migration

- Implemented baseline: the TypeScript v1 language, effects, replay,
  foundry/search, benchmarks, and bundles.
- Rename: public package/CLI/docs moved to ALGAL; legacy wire data retained.
- Audit regressions fixed and covered: executor-bound effect caching,
  prototype-safe canonicalization and maps, bounded stream/HTTP reads,
  isolated replay, snapshot-on-write/read memory values, path-validated file
  store, all-or-nothing bundle install, no blind retry of mutating executors,
  and fail-closed replay of missing tool receipts.
- Native Rust path: canonical identity, manifest parsing, the scheduler
  (nested organisms, bounded loops, tool calls, spawn, replay), memory/context
  primitives, the CLI, `bun scripts/native-parity.ts` parity across the
  bundled examples, and `bun scripts/application-parity.ts` parity for the
  durable application lifecycle (revisions, commits including activation and
  schema-migration transitions, intents, dispatch, reconciliation, memory
  scopes/observations/derivations, and the `algal.application-host.v1` policy
  host).
- VM kernel layers: fail-closed effect capabilities, suspended/resumable runs,
  exact-class `cap` ports, and bounded durable mailbox drivers with independent
  send/receive rights, revocation, and replay-safe wakeups are implemented in
  both runtimes.
- ACP: ALGAL is both an ACP agent (sessions, permissions, timeouts, buffered
  pre-session updates) and an ACP client to a host-selected coding agent; a
  live Devin ACP task completed with an offline-verifiable receipt.
- Providers: scripted, hosted HTTP, OpenAI-compatible, and Vercel AI Gateway
  executors; xcb owns coding-agent custody (`xcb --json --cwd ABS run` returns
  a settled terminal envelope). The durable repair host retains patches and
  validates them with fixed host commands; see [repair](repair.md).
- Apple: the Swift bridge compiles with Xcode 26, `algal doctor --apple`
  checks availability, and schema-constrained generation ran a full on-device
  civilization epoch that promoted all four demo goals.
- Civilization: `algal civ`/`civ-verify` run measured epochs — plan proposals,
  host compilation, train/validation selection, sealed holdout, provenance and
  evidence in a verifiable population snapshot.
- Not claimed: unrestricted autonomous civilizations, self-rewriting runtime,
  multi-owner consensus, universal frontier-quality small models, cryptographic
  proof of external actions, or production qualification of every agent adapter.
  The Vercel Gateway credential returned HTTP 401 at last check and needs a
  routine refresh before that route re-qualifies live.
