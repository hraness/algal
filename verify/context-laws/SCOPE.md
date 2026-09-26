# Context laws

Algebraic/property laws of `context.compact` and memory recall, exercised
against the real production paths — never a re-model:

- `elideToolContext` (`src/tool-context.ts`) — the deterministic projection
  the run loop applies for `mode: "elide"` policies.
- `runOrganism` (`src/run.ts`) — the recorded `decide`-effect compaction
  path: the pre-compaction log is covered by a typed-decision request whose
  digest binds the request, the answers splice the log, and the whole
  sequence is a receipt that `verifyReceipt` replays bit-for-bit.
- `indexStore` / `searchIndex` / `indexSearcher` (`src/semantic.ts`) and
  `recallExecutor` / `bindRecallOutput` (`src/semantic-contract.ts`) — the
  derived semantic index and the recall effect seam.
- `ApplicationMemoryService` (`src/application-memory.ts`) over
  `MemoryStore` (`src/store-memory.ts`) — observe → snapshot → query →
  derivation, with all host authority behind the instrumented
  `probeAdmissionHost` in `harness.ts` and the query engine implemented by
  the *independent* derivation checker (`verify/reference/memory`) so engine
  evidence composes with `checkQueryResult` instead of with itself.

## Laws asserted (17 cases)

**Elide projection (pure, generated domain — 5 contexts × bounded
keepRecent/maxLogBytes/maxContextBytes grids):**

- `elide-idempotent` — `E(E(c)) = E(c)` on canonical form for every
  (context, policy, budget) combination. An already-projected marker is
  never re-projected.
- `elide-source-binding` — every stub carries `source ===
  digestCanonical(sourceOutput)` and `bytes === canonicalBytes(sourceOutput)`
  at the same index; `fn`/`inputs`/order never move; entries not replaced
  are byte-identical; the input context is never mutated.
- `elide-budget-monotone` — the stubbed index set is antitone in each of
  `maxLogBytes`, `keepRecent`, `maxContextBytes`: more room or a longer pin
  never forces more projection.
- `elide-nonexpanding` — `canonicalBytes(E(c)) ≤ canonicalBytes(c)`; a stub
  is used only when strictly smaller than the body it replaces.

**Recorded decide-effect compaction (full `runOrganism` + `verifyReceipt`):**

- `decide-keep-exact` — kept set is exactly `{i: noul_i ≥ 0.5}`, entries
  byte-identical, and the receipt replays.
- `decide-pinned-tail` — `keepRecent` pins the tail out of triage; a
  drop-everything answer still leaves the pinned entry verbatim.
- `decide-preimage-bound` — the recorded decide request's digest binds the
  *pre-compaction* log: the effect that authorizes the projection covers
  exactly the source entries, so the compacted record can never claim the
  masked bodies were never there. Reconstructed request → identical
  `requestDigest`.
- `decide-monotone` — kept sets are monotone in the answer vector
  (∅ ⊆ {a} ⊆ {a,b}).
- `decide-fail-closed` — when the protected/projected context exceeds
  `maxContextBytes`, the cell fails `BUDGET_EXHAUSTED` before the triage
  effect or another model call issues; the failed run still replays.
- `decide-replay-deterministic` — identical inputs produce identical receipt
  digests.
- `elide-run-retains-source` — end-to-end elide mode: the receipt carries
  the *full* source log while the served model context is digest-bound to
  the projection (rebuilt request → identical `requestDigest`); replay ok.

**Recall (derived semantic index + recall executor):**

- `recall-deterministic` — repeated queries, a re-index (`embedded: 0`,
  `reused === chunks`), and a byte-identical second store all return the
  same hit list (`id`, `source`, `seq`, `score`, `text`); the relevant
  document ranks first.
- `recall-fail-closed` — a searcher serving a foreign embedder spec, a hit
  list longer than `k`, or a hit whose `ref` doesn't re-derive from its
  `value:` source each reject with a typed error (`EFFECT_UNBOUND` /
  `EFFECT_UNPARSEABLE` / throw).

**Memory query/proof/check plumbing (`ApplicationMemoryService` on
`MemoryStore`, instrumented host, checker-backed engine):**

- `memory-status-map` — `unknown` (empty), `supported`, `conflicted`
  (supported + opposed for the same tuple), `opposed`, `stale` (host frontier
  advanced past the scope's bound frontier), and `withdrawn` (admitted then
  withdrawn) each map exactly; `sourceRefs ⊆ admitted − withdrawn` always.
- `memory-deterministic` — identical state+query twice gives identical
  derivation refs and identical host-call counts on the injected clock.
- `memory-authority-fail-closed` — an observation record whose stored claims
  differ from the host's trusted decoding rejects at snapshot admission
  ("differs from trusted source decoding"); a record carrying a foreign
  admission identity rejects ("Unadmitted observation authority"). A compact
  record or a digest marker never conjures authority.
- `memory-engine-failure-closed` — a derivation the independent checker
  cannot verify maps to `failed`/`verified=false`/`result=null`; an engine
  that cannot reach the fixpoint maps to `exhausted` with its reason carried;
  an aborted query maps to `cancelled`.
- `memory-evidence-checks-out` — a `supported` derivation's stored snapshot,
  program and `algal.query-result.v1` envelope re-verify under the
  independent checker; `sourceRefs` equal exactly the admitted observation.

## Exclusions

- No live providers: the "provider" in every run-level case is
  `scriptedExecutor`; the host is the in-process instrumented one; the
  semantic index uses the deterministic local embedder.
- `MemoryStore` is the in-memory store — durability/parity of `FileStore`
  and the SQL store is separate evidence.
- This suite does not re-prove the derivation semantics; the mutation
  catalog (`verify/memory-mutation`) and the Lean model own that. Here the
  checker is a component under composition.
- `memory.rollover`/migration (MEM-07) is out of scope — separate suite.
- Application lifecycle commit/dispatch (`src/application.ts`) is exercised
  only through the record writes the service performs; the CAS-coupled
  lifecycle transition path is the application-conformance surface.
- `elide-budget-monotone`/`elide-idempotent` quantify over a bounded
  generated domain (5 contexts × 27 policy/budget points), not all inputs —
  the properties are deterministic projections of the implementation's
  loop, not a symbolic proof.
- The byte budget is a bound, not a token/cost claim (CTX-03 wording): tests
  assert source identity and byte bounds, never token counts.

## Command

```sh
bun test verify/context-laws
```
