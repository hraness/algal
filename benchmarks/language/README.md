# ALGAL language benchmark contract

This directory is the P0 baseline for the proposed event-loop contract. It
pins input bytes, expected structural outcomes, identity rules, and a
repeatable timing protocol. It does not contain a compiler, a scheduler, a
provider call, or a language-quality claim. The measured result record is
`algal.language-benchmark.v1`; the checked corpus manifest is
`algal.language-benchmark.corpus.v1`.

The shared contract index is [`spec/v1/README.md`](../../spec/v1/README.md).
The result parser fixture is `results/smoke.json`; the colocated test parses it
from `unknown` alongside the checked corpus, recomputes both digests, joins every
case identity and expectation to that corpus, and checks raw samples against
summaries.

The event-loop shape is specified in [`spec/v1/event-loop.md`](../../spec/v1/event-loop.md).
The fixture test parses foreign JSON as `unknown`, rejects unknown keys, checks
all fixture digests, and exercises the listed failure codes:

```sh
bun test benchmarks/language/contract.test.ts benchmarks/language/span.test.ts
```

## Baseline layout

```text
benchmarks/language/
  README.md
  corpus.json
  contract.test.ts
  span.ts
  span.test.ts
  actors/
    echo.json
    echo.events.json
  projects/
    echo.project.json
  invalid/
    *.json
  results/
    smoke.json
```

`actors/echo.json` is the one valid `algal.event-loop.v1` behavior fixture.
`actors/echo.events.json` is its deterministic input vector. The project fixture
pins both files as one closure. The ten invalid behavior fixtures each record a
specific parser failure. Colocated tests also mutate copies of the valid
fixtures to test digest, payload, byte-limit, and transition rejections. The
fixture count is deliberately small for the P0 contract gate. It is not the 100-program corpus target in the north-star plan.

## Architecture vocabulary

The event-loop contract defines an actor as a logical mailbox and state machine.
A supervisor is the host-owned durable owner that admits a behavior revision,
assigns delivery identities, enforces limits, and records pending outcomes. A
habitat is the named host or deployment boundary that supplies supervisor
storage, capacity, and admission policy. Neither term introduces a second
scheduler semantic or a provider permission.

A behavior revision is identified by its behavior id, revision number, and
root artifact digest. The nested behavior digest covers metadata only. A source
digest claims an identity for exact UTF-8 bytes. The smoke actor retains no source
file, so this corpus cannot verify that claim. A runtime identity identifies the implementation used for a check or measurement. A replay identity
covers the message, transition, state, and output identities. These identities
remain separate from benchmark durations and execution receipts.

## Corpus manifest

`corpus.json` is a closed
`algal.language-benchmark.corpus.v1` record:

```json
{
  "contract": "algal.language-benchmark.corpus.v1",
  "kind": "corpus",
  "id": "language-smoke",
  "revision": 1,
  "identities": {
    "encoding": "utf-8",
    "digest": "sha256-canonical-json",
    "compiler": { "id": "algal-event-loop-contract", "version": "proposal" },
    "runtimes": ["bun", "rust"],
    "machine": { "os": "fixture", "arch": "fixture", "cpu": "synthetic-contract-fixture" }
  },
  "protocol": {
    "warmupSamples": 3,
    "measuredSamples": 15,
    "phases": ["cold", "warm"],
    "order": "path",
    "quantile": "nearest-rank",
    "outliers": "none",
    "regressionPercent": 20
  },
  "fixtures": {
    "actors": [],
    "projects": [],
    "invalid": []
  },
  "digest": "sha256:<64 lowercase hex>"
}
```

The root digest covers the canonical root without `digest`. The `identities`
record says which identity vocabulary a result must use. `proposal` is a
contract status, not a compiler version that can qualify a runtime. The
`machine` profile is explicitly synthetic in this corpus. It is checked against
the result environment, not presented as a measured computer.

Each actor fixture entry is:

```json
{
  "id": "counter-actor",
  "path": "actors/echo.json",
  "kind": "actor",
  "sha256": "sha256:<raw UTF-8 file digest>",
  "expected": {
    "check": "accepted",
    "artifactDigest": "sha256:<event-loop root digest>",
    "interfaceDigest": "sha256:<event and actor schema digest>",
    "eventPath": "actors/echo.events.json",
    "eventSha256": "sha256:<raw event-vector digest>",
    "eventDigest": "sha256:<event-vector root digest>"
  }
}
```

A project entry uses the same `id`, `path`, `kind`, and `sha256` fields. Its
`expected` object contains `check: "accepted"`, `projectDigest`, and
`closureDigest`. `projectDigest` covers the project record without `digest`.
`closureDigest` covers the canonical ordered `files` array. Every project path
is relative, uses `/`, and is at most 512 UTF-8 bytes.

An invalid entry has `kind: "invalid"` and this expected object:

```json
{
  "check": "rejected",
  "code": "EVENT_LOOP_UNKNOWN_KEY",
  "span": { "start": 0, "end": 1 }
}
```

The span is a byte range in the named file, with `0 <= start < end <= 16,384`.
For a nonempty string value or unknown property name it covers the UTF-8 bytes
inside the quotes; an empty string has no interior bytes, so its span includes
both quote bytes. For a number it covers the number token. The fixture checker
emits a failure code and a structured JSON path. `span.ts` locates that path in
the source bytes, and the test compares the emitted code and span with the corpus.
It fails if a structural failure has no path. Malformed JSON and invalid
UTF-8 have no structured token to locate: the checker reports `EVENT_LOOP_PARSE`
with the span covering the complete source file. A valid JSON root that is
not an object also receives a complete-source span. An empty file or a file
above 16,384 bytes fails the input bound before a span can be reported. The ten pinned invalid
fixtures are valid JSON; the malformed-byte cases are tested in memory.
Changing a pinned fixture diagnostic requires a corpus revision.

## Identity rules

All identity strings use `sha256:` and 64 lowercase hexadecimal characters.
Canonical digests use the repository's sorted-key canonical JSON encoder and
UTF-8 bytes.

- `sha256` on a fixture entry hashes the exact file bytes, including no path or
  line-ending normalization.
- `artifactDigest` is the `algal.event-loop.v1` root digest.
- `interfaceDigest` is the digest of a canonical object containing the behavior's
  event declarations and actor ids plus state schemas. It excludes transition
  expressions and initial event values.
- `eventDigest` is the `algal.event-loop.events.v1` root digest.
- `projectDigest` and `closureDigest` follow the project rules above.
- `corpus.json` has a digest over its manifest and expected identities, without
  its own digest field.
- A language-benchmark result has a digest over all fields before its digest,
  including raw samples and environment identities.

A source digest declares bytes, but without retained source bytes and a checked
source-to-artifact mapping the smoke fixture cannot establish provenance. It does
not identify a compiler, imply semantic quality, or grant source-file access.
An artifact digest identifies the canonical data consumed by a future checker. These identities must not be
substituted for one another.

## Measurement protocol

P2 may produce a measured result only from a clean checkout whose
`corpusDigest` matches `corpus.json`. It must use a separately reviewed corpus
revision with an actual pinned OS, architecture, and CPU profile. The `fixture`
profile and durations in this smoke record are synthetic test data, not a real
baseline.

1. Load the corpus and verify every raw fixture digest before running it.
2. Run cases in lexicographic `path` order. A case has one declared operation:
   actor check, project check, or invalid check.
3. For each case, discard exactly three warmup samples. Record fifteen measured
   samples in each of the `cold` and `warm` phases. A cold sample starts a fresh
   process. A warm sample reuses one process and does not reuse a result. Compare
   the checker output with the expected diagnostic or digest on every sample
   before recording its outcome. The case observation is the common output for
   those samples; a disagreement rejects the measurement.
4. Record only elapsed duration in integer nanoseconds. Do not record start or
   end timestamps, host clock readings, process ids, or execution receipts in a
   benchmark result.
5. Retain every sample. Compute p50 and p95 with nearest-rank over the fifteen
   samples in each phase. `outliers: "none"` means no sample is removed.
6. Report a regression only when the comparison uses the same case ids, corpus
   digest, toolchain identity, runtime identity, machine profile, phase, and
   sample count. The 20 percent value is a review threshold, not a claim about
   current performance.

A result is measurement evidence. It does not establish that the language is
fast, that an event-loop program is representative, that Bun and Rust have
matching semantics, or that a later runtime improves cumulative skill.

## `algal.language-benchmark.v1` result

A result is a closed object with these root fields:

```json
{
  "contract": "algal.language-benchmark.v1",
  "kind": "result",
  "corpusDigest": "sha256:<corpus digest>",
  "protocol": {
    "warmupSamples": 3,
    "measuredSamples": 15,
    "phases": ["cold", "warm"],
    "order": "path",
    "quantile": "nearest-rank",
    "outliers": "none"
  },
  "toolchain": {
    "compiler": "algal-event-loop-contract@proposal",
    "runtime": "bun@1.3.14",
    "native": "rust@<version>"
  },
  "environment": {
    "os": "fixture",
    "arch": "fixture",
    "cpu": "synthetic-contract-fixture"
  },
  "cases": [],
  "aggregate": [],
  "digest": "sha256:<64 lowercase hex>"
}
```

`protocol` repeats the checked corpus protocol except `regressionPercent`,
which is a comparison policy rather than a property of one run. The compiler
identity, runtime names, and exact machine profile must also match the checked
corpus. `toolchain` and `environment` identify the execution inputs. They are bounded descriptive
strings, not credentials.

Each `cases` entry contains:

```json
{
  "id": "counter-actor",
  "kind": "actor",
  "sourceDigest": "sha256:<fixture raw-byte digest>",
  "expected": "accepted",
  "observed": {
    "artifactDigest": "sha256:<checked artifact digest>",
    "interfaceDigest": "sha256:<checked interface digest>",
    "eventDigest": "sha256:<checked event-vector digest>"
  },
  "samples": [
    { "phase": "cold", "index": 0, "durationNs": 1000, "outcome": "accepted" }
  ],
  "summary": {
    "cold": { "count": 15, "p50Ns": 1000, "p95Ns": 1200 },
    "warm": { "count": 15, "p50Ns": 400, "p95Ns": 500 }
  }
}
```

An accepted actor case has `observed` with `artifactDigest`, `interfaceDigest`,
and `eventDigest`. An accepted project case has `observed` with `projectDigest`
and `closureDigest`. These checked outputs must equal the corpus expectations.
The synthetic smoke result copies the values computed from its fixtures; it is
not a measured run of a compiler or runtime. An invalid case uses `expected:
"rejected"`, `code`, and `span` at the case level. The case object is closed:
accepted cases have no diagnostic fields, and rejected cases have no
`observed` field. A sample outcome must equal the case's expected outcome. Each phase has exactly one sample for every
index from zero through `measuredSamples - 1`.

`aggregate` contains one entry per case and phase with `count`, `p50Ns`, and
`p95Ns`; it is derived data and is checked against the retained samples. The
result must contain exactly one case per corpus fixture and every sample,
not only its aggregates. The parser rejects invented or missing cases, changed
raw-byte digests, kinds, expected outcomes, observed accepted-case digests,
diagnostic codes or spans, a different corpus digest, and mismatched protocol, compiler, runtime names, or
machine profile. A joined digest is not proof of source provenance or measured
performance.

## Decision record: no separate runtime

The baseline measures contract checks and replay evidence, not a new language
runtime. TypeScript is the reference implementation boundary and Rust/WASM is a
parity boundary. Both must consume the same event-loop records and produce the
same canonical identities before a runtime comparison is meaningful. The
benchmark result records runtime identity so a comparison cannot silently mix
implementations, but it does not select or publish a runtime.

This is a P0 architecture decision. A scheduler, supervisor, habitat adapter,
compiler, and provider integration remain later lanes. The smoke corpus is
review evidence for strict parsing and measurement shape, not evidence of speed,
semantic parity, or cumulative skill.

## Bounds and strict parsing

The corpus and result parsers reject unknown keys at every contract-owned object.
They parse all external input as `unknown` and validate before returning a typed
record. Event payloads match declared schemas and include source and
sequence in their byte limit. Expression programs remain foreign values governed by their own
contract. Caller-owned `json` state and event fields still enforce the expression
value limits before their enclosing state and event byte budgets are checked.

| Value | Bound |
| --- | --- |
| corpus id, case id, operation, toolchain and environment string | 1 to 128 UTF-8 bytes |
| corpus fixtures | 1 to 256 total entries; at most 128 invalid entries |
| source file | 1 to 16,384 bytes |
| project closure | 1 to 262,144 bytes and at most 64 files |
| nested `json` field | at most 32 value levels (scalar at depth 0), 1,024 items per list, 256 keys per object, 65,536 UTF-8 bytes per string or key, and 262,144 canonical UTF-8 bytes per value |
| corpus paths | 1 to 512 UTF-8 bytes |
| warmup samples | 0 to 100, with three in this baseline |
| measured samples per phase | 1 to 1,000, with fifteen in this baseline |
| phases | exactly `cold`, `warm` in this baseline, at most 2 |
| elapsed duration | 0 to 86,400,000,000,000 nanoseconds |
| cases and their summaries | at most 256 entries |
| aggregate entries | at most 512, exactly two per case |
| pinned machine profile | `os`, `arch`, and `cpu`: 1 to 128 UTF-8 bytes each |
| result digest and every referenced digest | `sha256:` plus 64 lowercase hex characters |

The parser rejects a zero measured sample count, an unknown phase, a duration over
one day, a mismatched sample count, an invalid quantile, an unknown diagnostic
field, a duplicate id, or a result whose digest does not recompute. These checks
are deterministic and do not depend on the host clock.
