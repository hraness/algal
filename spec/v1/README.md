# ALGAL v1 contract index

This page is the shared index for the versioned wire contracts in `spec/v1/`.
A contract name is an exact `algal.*.v1` identifier. The P0 fixture parser
checks foreign values as `unknown`, rejects unknown contract keys, and checks
the documented limits exercised by its tests. It is not a runtime parser or a
replay implementation.

## North-star P0 contracts

| Contract | Record and review surface | Status | Next owner |
| --- | --- | --- | --- |
| `algal.event-loop.v1` | [event-loop behavior](./event-loop.md) and [valid and invalid fixtures](../../benchmarks/language/) | P0 proposal | P1 evaluator |
| `algal.event-loop.events.v1` | [event vector fixture](../../benchmarks/language/actors/echo.events.json) | P0 proposal | P1 evaluator |
| `algal.language-benchmark.v1` | [benchmark result contract](../../benchmarks/language/README.md) and result fixture | P0 proposal | P2 harness |
| `algal.language-benchmark.corpus.v1` | [baseline corpus manifest](../../benchmarks/language/corpus.json) | P0 proposal | P2 harness |
| `algal.language-project.v1` | [project closure fixture](../../benchmarks/language/projects/echo.project.json) | P0 proposal | P2 harness |

The fixture parser and its deterministic checks live beside the fixtures in
[`benchmarks/language/contract.test.ts`](../../benchmarks/language/contract.test.ts).
They prove the contract shape and fixture identities only. They do not claim a
compiler, runtime performance, language quality, or cumulative-skill result.

## Shared identity vocabulary

| Identity | Scope | Must not be substituted for |
| --- | --- | --- |
| behavior revision tuple | `(behavior.id, behavior.revision, root.digest)`; the root covers the complete evaluator input | source or runtime identity |
| behavior metadata digest | id, revision, and source digest only | full behavior artifact digest |
| source digest | declared SHA-256 of exact UTF-8 source bytes | behavior semantics or compiler identity |
| artifact digest | canonical behavior record consumed by an evaluator | raw source bytes |
| runtime identity | declared Bun or Rust/WASM execution input in benchmark evidence | behavior artifact digest |
| result digest | canonical benchmark result including samples and environment | execution receipt |
| replay identity | message, transition, state, and output identities in a trace | wall-clock timing |

The P0 smoke actor has no pinned source file. Its `sourceDigest` is checked for
digest syntax and covered by the artifact digest, but its claimed source bytes
cannot be verified from this corpus. Source-to-artifact provenance requires a
future compiler fixture with retained source bytes and a checked mapping.

Digests use `sha256:` followed by 64 lowercase hexadecimal characters. Receipts
and replay records contain no wall-clock fields. Benchmark durations belong only
to host-side evidence and are bounded integer nanoseconds.

## Dependency and scope decision

P0 proposes records and evidence boundaries. P1 may implement the portable
transition evaluator only after the event-loop contract is reviewed. P2 may
measure the existing check and replay path only after the corpus and protocol
are accepted. P1 and P2 are separate work lanes and remain blocked by this
proposal until the P0 gate is integrated.

The P0 decision rejects a separate event-loop runtime. TypeScript is the
intended reference boundary and Rust/WASM is the parity target. Neither
implementation consumes this proposed event-loop record yet. Future
implementations must consume the same `algal.event-loop.v1` data and canonical
identity rules; a future host, supervisor, or habitat adapter must not fork
semantics or introduce a second wire contract. This is an architecture decision,
not evidence that either runtime has been qualified.
