# Registration notes — `verify/reference/memory`

This directory is new in Phase 11. **No existing tracked file was modified**;
integration is pending and belongs to the parent change set.

## Files

- `checker.ts` — independent derivation checker. Entry point:
  `checkQueryResult(input: unknown): Verdict`. Pure, deterministic, no
  production imports; `node:crypto` only for SHA-256 content digests.
- `fixtures.ts` — 25 named fixtures: accepted derivations (transitive chain,
  constant-in-body, repeated-variable, shared-premise DAG, canonical
  duplicate-fact seed, empty answer, omitted limits) and rejected claims
  (fabricated premise, self/two-node cycles, fact outside snapshot,
  fact/source binding, withdrawn/unselected sources, substitution conflict,
  conclusion mismatch, foreign rule, premise count, forged proof id,
  dangling proof, unknown proof, digest mismatch, row order, row-vs-query,
  missing row, non-canonical witness, derived/rounds bound exhaustion,
  proof-map bound, admission failures, envelope mismatches).
- `checker.test.ts` — `bun:test` suite; also pins this checker's canonical
  form and digests against `src/digest.ts` (test-only import) so codec drift
  cannot pass silently.
- `SCOPE.md` — exact establishment and exclusions.

## Suggested suite wiring (`verify/lib/suites.ts`, `scripts/verify.ts`)

`verify/lib/suites.ts` already lists the Phase 11 suite ids. Suggested
mapping for this checker:

- `memory-oracle`: run `bun test verify/reference/memory/checker.test.ts`
  (or an equivalent runner entry) and report pass/fail counts plus the
  fixture inventory.
- `memory-mutation`: reserved for receipt-level mutation controls. A natural
  entry: replay each fixture through `checkQueryResult` with mutated rows,
  proofs, snapshot or program fields and assert rejection — the existing
  negative fixtures are the starting inventory.
- `lean-memory`: pair with `verify/lean/Algal/Memory` once those modules are
  registered (see `verify/lean/Algal/Memory/REGISTRATION.md`).
- `context-laws`: separate Phase 11 workstream for `crates/algal/src/
  context.rs` compaction/projection laws; not covered by this checker.

## Suggested `properties.json` wiring

Obligations this checker directly services:

- `MEM-01` (base facts ⊆ selected snapshot with matching source identity):
  `fact-not-selected`, `fact-source-binding` rejections plus accepted
  derivations.
- `MEM-03` (acyclic rule applications, substitution consistency):
  `proof-cycle`, `substitution-mismatch`, `premise-count-mismatch`,
  `conclusion-mismatch`, `dangling-proof`, `proof-id-not-content-digest`
  rejections plus the Lean `resolve`-soundness theorems.
- `MEM-04` (complete result reaches the relevant least fixed point):
  `missing-row`, `unexpected-row`, `completeness-not-established`,
  `result-binding` rejections and the accepted fixtures' exact answer sets.
- `MEM-05` (first-canonical-witness determinism):
  `witness-not-canonical-first`, `row-order` rejections; the canonical
  enumeration order is documented in `checker.ts` and `SCOPE.md`.

Partially serviced:

- `MEM-02` (stale/withdrawn evidence): only the checker-level model —
  `selection.allowedSources`/`withdrawn` source-whitelist checks. The
  application-layer frontier/scope binding is separate work.

Not serviced: `MEM-06`, `MEM-07` (application evidence semantics, rollover),
`CTX-01..03` (context laws — `context-laws` suite).

Each obligation's `bounds.harness` can note: finite admitted domain — atoms
are JSON primitives (strings, finite binary64 numbers, booleans, null);
facts ≤ 2048, rules ≤ 64, body ≤ 8 literals, terms ≤ 8, sources ≤ 16, proof
nodes ≤ 8192; declared per-key limits.
