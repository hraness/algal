# ALGAL: language, harness, habitat

ALGAL is the new product name for Morphogen, with a nod to ALGOL. The useful
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

## Rust migration and compatibility

Port incrementally behind tests. Keep the independently runnable TypeScript
reference until the Rust path covers the complete existing contract. Compare
canonical identities, graph behavior, outputs, failures, and replay, not merely
whether both commands exit zero. Unsupported native features must fail
explicitly, never execute a weakened interpretation or silently invoke Bun.

Existing `morphogen.*.v1` identifiers and legacy fixture filenames are durable
wire coordinates, not branding mistakes. Do not rewrite old CAS objects to
rename them. The public command/package/site become ALGAL; `.algal` is the new
store default, and `--dir .morphogen` remains explicit access to old state.
The site keeps its configured origin until a new domain is actually provisioned.

## Implementation status during this migration

- Implemented baseline: the TypeScript v1 language, effects, replay,
  foundry/search, benchmarks, and bundles.
- Rename: public package/CLI/docs moving to ALGAL; legacy wire data retained.
- In progress: audit regressions, native Rust path, ACP/routing seam,
  hosted-provider generalization, Apple bridge, memory/context primitives,
  measured civilization selection, and end-to-end qualification.
- Not claimed: unrestricted autonomous civilizations, self-rewriting runtime,
  multi-owner consensus, universal frontier-quality small models, cryptographic
  proof of external actions, or production qualification of every agent adapter.
