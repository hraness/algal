# Independent memory derivation checker

`checker.ts` decides acceptance of a claimed `algal.query-result.v1` envelope
against an exact `algal.memory.v1` fact snapshot and `algal.query.v1` program,
without running the production engine (`crates/algal/src/memory.rs`). The
production `verify` is `canonical(query(…)) == canonical(result)` — a rerun of
the same implementation — which cannot detect a semantic bug it reproduces.
This checker is a second, deliberately simpler implementation plus a
proof-DAG resolution that production does not perform.

## What a checked row establishes

`checkQueryResult({snapshot, program, claimed, selection})` returns
`{accept: true}` only when all of the following hold:

- **Identity.** `claimed.snapshot`/`claimed.program` equal this checker's
  recomputed canonical SHA-256 digests of the admitted inputs.
- **Admission.** Snapshot, program, and result match the contract shapes and
  bounds in `memory.rs` (fact count 2048, rules 64, body 1..8, terms ≤ 8,
  atoms are JSON primitives with canonical text ≤ 1024 bytes, 1..16 digest
  sources per fact, range-restricted rules with unique ids, one shared arity
  table across facts/rules/query, per-key limit ceilings, row/proof-count and
  output-byte bounds).
- **DAG resolution.** Every row's proof resolves through `claimed.proofs` to
  a finite derivation: fact leaves are digest-bound members of the *selected*
  snapshot carrying that member's own source list; rule nodes are
  digest-bound program rules whose premise derivations reconstruct a unique
  substitution instantiating the head to the inferred conclusion. Reordered
  or fabricated premises, constant/variable conflicts, unknown premises,
  wrong premise counts, cycles reachable from a row, and proof nodes
  unreachable from all rows each reject with a distinct reason.
- **Source custody.** With `selection.allowedSources`/`selection.withdrawn`
  supplied, every terminal fact node's recorded sources must stay inside the
  admitted set and disjoint from the withdrawn set — the checker-level model
  of stale or withdrawn observation support. Which facts enter the snapshot
  remains the application layer's decision; this checker sees only the
  snapshot as presented.
- **Exact answer set.** An independent naive evaluator (nested-loop joins,
  no hash index, no production work ledger) computes the fixpoint under the
  same semantic bounds (`maxRounds`, `maxDerived`, `maxBindings`, `maxRows`).
  Claimed rows must be exactly the answer rows of that fixpoint — missing and
  extra rows reject — and must be in canonical byte order. `baseFacts`,
  `derivedFacts`, and `rounds` must agree with the recomputed values.
- **First-canonical witness.** Each row's proof id must equal the first
  derivation under the documented enumeration order (facts by content digest,
  rules by id, candidate tuples by canonical `[relation, tuple]` byte order,
  bindings left-to-right, first-wins). A valid but later witness rejects as
  `witness-not-canonical-first` — this is policy conformance, distinct from
  derivation soundness.

## Deliberate independence notes

- The reference evaluator's join is a plain nested loop; production's hash
  index only narrows the scan. Both compute the same set; the checker's value
  is that a production join bug produces a divergence here.
- The checker's work accounting is *not* modeled: `claimed.work` is
  range-checked (≤ `maxWork`) but not recomputed. The five semantic bounds
  that determine completeness are mirrored exactly. If the reference
  evaluation exhausts any of them, the verdict is
  `completeness-not-established` — exhaustion never yields an accepted
  truncated or empty answer.
- Proof ids are content digests, so a cyclic support structure cannot exist
  on a fully digest-consistent map. The resolution-order cycle check is
  therefore defense in depth for arbitrary admitted maps; the fixture suite
  exercises it with unattainable-but-admitted key assignments, and the Lean
  model proves rejection for cycles in the index-based graph abstraction.

## Codec assumptions

The checker re-implements canonical serialization (u32-index keys
numerically first, then UTF-16 order; `JSON.stringify` scalar/escape rules;
SHA-256 via `node:crypto`). The test pins byte agreement with
`src/digest.ts`/`src/values.ts` on representative values including fractional
numbers, `-0`, exponent notation, and non-ASCII strings. Admitted strings
exclude lone surrogates. The admitted number domain is the JS binary64
domain: the native engine's serde_json integer/float distinction (1 vs 1.0)
is unobservable at this layer and is covered by native tests instead.

## Out of scope (per the plan)

Truth or provenance of the base facts themselves, negation-as-failure,
unrestricted Prolog, alternate-support truth maintenance, and the
application-level claims that a snapshot was selected correctly
(`src/application-memory.ts` scope/frontier/withdrawal admission). The
checker also does not verify that `claimed.work` matches production's exact
charge count. Companion Lean model: `verify/lean/Algal/Memory`.
