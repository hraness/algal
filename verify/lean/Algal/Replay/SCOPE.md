# `Algal.Replay` — precisely scoped replay semantics

Phase 14 deliverable: an independent Lean model of what `verifyReceipt` and
`resumeRun` compute over the deterministic scheduler, its proved properties,
and the exact boundary between what is modelled and what remains open.

**Nothing in this directory claims or establishes that `src/run.ts`,
`src/verify.ts`, `src/effects.ts`, or `src/store-memory.ts` refine this
model.** The correspondence is argued per definition in `Model.lean` and
measured at runtime by `verify/replay/replay-isolation`; the two claims are
different objects.

## Files

| File | Contents |
|---|---|
| `Model.lean` | `Request`/`Response`/`EffectRecord`/`Tape` (occurrence-ordered `serve`), `Cfg` (oracle + tool-fallthrough gate + closed CAS view), `St` (tape + slots), `Directive`/`steps`/`run` (fuel-bounded effect-issuing machine), `Receipt`/`Fields`/`consistent`, `verify`, `diffFields`/`diffReceipts`, `resume`, `dropSuspended`, `closureSatisfied`. |
| `Theorems.lean` | Proved properties; see below. No `sorry`, no `native_decide`. |

## Deliberate abstractions (what equality means here)

- **Digests are canonical objects, not hashes.** A `Request` is its own
  request digest; a receipt's `digest` field is its `Fields` record;
  manifest identity is the `manifest` string. Production binds
  `sha256(canonical(·))`; injectivity of that binding is assumption A-HASH
  in `verify/assumptions.md`, not a theorem here. `consistent r` models the
  only thing verification ever checks — that the digest field re-derives
  the contents — so a mutated receipt whose digest was recomputed still
  *passes* the model's self-consistency check and is caught by the next
  gate (verification), exactly as production does.
- **`Program` abstracts manifest + registries.** It maps reply history to
  the next `Directive`; scheduler determinism is the soundness side
  condition the verifier theorems are stated over.
- **The oracle is the recorded tape.** `serve` mirrors `replayExecutor`:
  per-request-digest FIFO, first occurrence first; a miss is
  `EFFECT_UNBOUND` under `verify` and a live call under `resume`.
- **The mutable store has no ambient channel in `verifyCfg`.** `St.slots` is
  the replay overlay — what the production `replayStore` writes and reads
  without touching its source.

## Proved properties

Every theorem in `Theorems.lean` is tagged `model-proved` or `witness`
(`decide`-checked positive/negative shapes). The load-bearing result:

1. **`steps_replay_reproduces` / `run_replay_reproduces`** — replaying a run
   under the tape of records it produced reproduces the run exactly
   (`RunAgree` over outputs, produced records, cell states), under *any*
   oracle configuration, because every dispatch resolves in the tape.
   Requires the closure view to satisfy the program's digests
   (`closureSatisfied`/`closureSatisfied_congr`).
2. **Sourcing** — `serve_mem`, `dispatch_sourced`, `steps_sourced`,
   `resume_tail_sourced`: every produced record is either a member of the
   initial tape or freshly minted under the admitted oracle; dispatch never
   invents. `serve_occurrence` pins first-occurrence order.
3. **Misses are exact and unbound under no-live** —
   `serve_none_iff`, `dispatch_miss`, `dispatch_miss_unbound`,
   `verifyCfg_dispatch_miss`, `fresh_nolive`: under `verify`'s
   configuration a tape miss is always `EFFECT_UNBOUND`; nothing falls
   through.
4. **Write isolation** — `steps_writes_unsettled`: every slot mutation comes
   from an unsettled write directive; the overlay absorbs it.
5. **Diff is a total comparison** — `diffFields_nil`, `diffReceipts_total`,
   `diffReceipts_self`, `diffFields_detects`: an empty diff is literal
   receipt equality; any field difference names a mismatch.
6. **Verify characterization** — `verify_iff`: `.verified` iff manifest
   binding holds AND the receipt is self-consistent AND the replayed run
   diffs empty. `verify_consistent`, `verify_rejects_manifest`,
   `verify_produced_verifies` follow.
7. **Forgery boundary** — `fabricated_stamp_verifies`,
   `recomputed_history_verifies`: a recomputed history under a *different*
   oracle is a *different receipt*, not a detectable forgery. The verifier
   admits self-consistency only; oracle provenance is not modelled and is
   out of the claim.
8. **Resume gates** — `resume_rejects_manifest`,
   `resume_rejects_inconsistent`, `resume_rejects_unverified`: manifest
   mismatch, self-inconsistency, and failed verification each reject before
   the live tail. `resume_runs_continuable`, `resume_stamps_resumer`,
   `dropSuspended_mem`, `dropSuspended_sublist`: the admitted tail runs
   against the continuable tape (all records minus suspended ones), and the
   resumed receipt is stamped by the resumer.

## What is deliberately not claimed

- **No production refinement.** The TypeScript code is not translated or
  checked against this model; runtime correspondence is the
  `verify/replay/replay-isolation` suite's measured claim only.
- **No hash-injectivity claim.** Digest identity is definitional.
- **No oracle provenance/authenticity.** `recomputed_history_verifies`
  is the explicit counterexample.
- **No slot-write delivery claim across systems** — the model's `St.slots`
  is the overlay; the production claim that `replayStore` never forwards
  writes to the source store is exercised by instrumentation, not proved.
- **No whole-import trust.** The axiom audit (`verify/replay/lean-replay`)
  reviews this module's theorems only; other modules' imports are compiled,
  not audited, here.
