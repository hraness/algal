# Differential lane scope — `verify/differential`

Sampled agreement across four legs on inputs beyond the fixed corpus:

- **committed WASM** — `src/algal_expr.wasm` called through the raw
  `algal_eval`/`algal_check` byte ABI, one fresh instance per case, either
  in-process (`inline`) or under `runCommand` custody in shards
  (`subprocess`, the registered path). A trap is a finding; a zero-byte
  input is classified `wasm-transport` because `algal_alloc(0)` cannot carry
  it — recorded, never silently retried.
- **native binary** — an explicitly supplied `verification_boundary`
  executable (`<eval|check> <file>`), one supervised process per case with a
  deadline and output bound.
- **Bun wrapper** — `evalProgram`/`checkProgram` from `src/expr.ts`, applied
  only to cases flagged `wrapper` whose `fuel` token round-trips through
  `JSON.stringify` unchanged (`wrapperFaithful`). A float-spelled or
  negative fuel would re-encode to different bytes, so those cases skip the
  leg rather than bless a transcription artifact.
- **independent oracle** — `json.ts`/`canonical.ts`/`oracle.ts` mirror the
  evaluator contract on this lane's own `JVal` domain and import no
  production evaluation code: strict RFC 8259 admission over raw bytes
  (invalid UTF-8, overlongs, surrogate encodings, lone `\uXXXX` surrogates,
  control bytes, trailing data, duplicate keys last-wins, 127-deep
  container limit), the serde number domain (i64/u64-typed integer
  spellings, f64 fraction/exponent spellings, non-finite rejection,
  subnormal underflow), canonical key order (u32 indices excluding
  `u32::MAX` numerically first, then UTF-16 code units), the mirrored bound
  pipeline and op table with fuel accounting.

## Catalog (`cases.ts`)

`raw-*` byte-level edges, `bound-*` boundary−1/boundary/boundary+1 for every
envelope and value limit (program bytes/nodes/depth, env keys/bytes/depth,
list length, string bytes, output bytes, value bytes, binder length, fuel),
`sem-*` semantic probes (UTF-16 vs UTF-8 iteration divergence, get-path
index edges, duplicate/prototype keys, `-0`, subnormals, safe-integer
edges), `gen-*` seeded generated programs over the full mirrored op table
with deliberate defect injection, and `chk-*` check-mode envelopes.

## Comparison (`engine.ts`)

Verdicts partition every case exactly once: `agree`, `mismatch-oracle`,
`mismatch-targets`, `mismatch-wrapper`, `wasm-transport`, `infra-failure`,
`uncovered` (the mirror declines a prediction; cross-target comparison
still runs). An oracle-exact agreement compares class and canonical value
bytes; target legs compare full response bytes. Mismatches are shrunk with
the bounded deterministic shrinker (`shrink.ts`) under an attempt/deadline
budget, and the reduced input is reconfirmed before it is recorded.

## What this lane does not claim

Finite sampled agreement, not equivalence. It proves no refinement, no
build provenance for the supplied native artifact, no coverage of any
production path outside the `algal.expr.v1` byte boundary, and no claim
about hosts that reach the evaluator through other transports. `uncovered`
predictions and `wasm-transport` admissions are reported, not smoothed
over. The evidence record is classified `diagnostic` — a report, not an
admission claim.

## Run

```sh
bun test verify/differential
ALGAL_DIFFERENTIAL_NATIVE_BIN=/abs/verification_boundary bun scripts/verify.ts --suite differential
```
