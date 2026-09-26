# Fuzz lane scope — `verify/fuzz` (suite `fuzz-smoke`)

Bounded deterministic seeded fuzzing over the `algal.expr.v1` byte
boundary, against the committed `src/algal_expr.wasm` and the differential
lane's independent mirror oracle.

## Engines (`mutate.ts`)

- **grammar-\*** (15 mutators) — parse the seed envelope into the lane's
  `JVal` domain and edit the value tree: op swaps across the full 62-op
  table, numeric perturbation onto subnormal/extreme/safe-integer edges,
  string perturbation onto prototype/index/non-BMP edges, arg drop/dup/
  type-flip, subtree splice, wrap-op (bounded to stay inside the parser
  depth limit), env set/drop/confuse, fuel field edits including
  float-typed and negative spellings, names-list edits, depth pushes,
  program-literal replacement. Mutants re-encode through the canonical
  encoder so they remain admitted JSON.
- **byte-\*** (9 mutators) — raw-byte edits on the encoded envelope: bit
  flips, byte insert/delete/truncate, segment duplication, invalid-UTF-8
  and escape-sequence injection, container-depth pushes across the
  127-boundary, and cross-case segment splicing. Mutants may be
  unparseable — that is their purpose.

## Method (`run.ts`)

`seeds × mutators × reps` — a fixed enumerable product (default
`2 × 24 × 8 = 384` executions), never a time-bounded loop. Each execution
runs the mutant through the committed WASM in-process and classifies the
response against the independent oracle via `compareCase`, on the same
verdict axis as the differential lane: `agree`, `divergence`
(mismatch-oracle), `crash` (trap or malformed response), `uncovered`,
`wasm-transport`.

Findings (`divergence`/`crash`) are minimized with the bounded shrinker
(`FUZZ_LIMITS.shrinkAttempts`/`shrinkMs`), deduplicated by divergence
signature before shrinking and by minimized-input digest after, capped at
64 retained counterexamples, and reconfirmed. When
`ALGAL_FUZZ_NATIVE_BIN` names the frozen `verification_boundary` binary,
each unique minimized counterexample is replayed under `runCommand`
custody to attribute the divergence to wasm-vs-native or
targets-vs-oracle.

## Reporting honesty

The report separates: executed vs. declined mutants, per-mutator
produced/findings, `zeroFindingMutators` (produced but found nothing),
`vacuousMutators` (never produced — a vacuous generator is named, never
hidden), op-head and error-code coverage, and unique minimized
counterexamples with sha256 digests and archive-relative byte files.

**Iteration counts, coverage, runtime and line coverage are observations,
not proof.** The evidence record is `diagnostic`. A suite pass requires
zero surviving counterexamples — but that is agreement evidence on a
bounded sample, never a correctness claim.

## Exclusions

No claim about inputs beyond `FUZZ_LIMITS.inputBytes`, mutation chains
beyond two steps, or evaluators outside the committed WASM artifact (the
native leg replays only findings). No timing/oracle side channels. No
exhaustiveness.

## Run

```sh
bun test verify/fuzz
bun scripts/verify.ts --suite fuzz-smoke   # after integrator wiring
```
