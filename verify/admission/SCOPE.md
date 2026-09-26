# Admission-context harness — scope

Phase 15 (`lean-admission`). This directory is the executable correspondence
lane for `verify/lean/Algal/Admission`: it pins the accept/reject partition
the Lean model proves, on top of the Phase-11 independent derivation
checker (`verify/reference/memory/checker.ts`).

## What `admitResult` does

`admitResult(ctx, claim)` where

- `ctx` — the authority tuple the Lean model calls `Ctx`: the
  `algal.memory.v1` snapshot document, the `algal.query.v1` program
  document, and opaque `host`/`engine` identity strings;
- `claim` — the bound identity (`AdmissionClaim.snapshot`/`program` as
  canonical SHA-256 digests of the admitted documents, `host`, `engine`)
  plus the `algal.query-result.v1` payload.

Admission requires the claim's four recorded identity components to equal
the context's exactly (`snapshot-identity-mismatch`,
`program-identity-mismatch`, `host-identity-mismatch`,
`engine-identity-mismatch`); only then is the payload delegated to
`checkQueryResult`, which independently re-binds `result.snapshot` /
`result.program` to the same input digests and resolves the proof DAG
against the admitted snapshot (`verify/reference/memory/SCOPE.md`).

## Correspondence pinned by `admit.test.ts`

The fixture mirrors the Lean `Witness` section (same two-fact/two-rule
transitive-closure program). Pinned, one-to-one with the model:

| Lean statement | Executable pin |
| --- | --- |
| `admit_baseline` / `admit_context_unique` | baseline claim accepts |
| `admit_snapshot_changed_rejects` | `snapshot-identity-mismatch` |
| `admit_rules_changed_rejects` | `program-identity-mismatch` |
| `admit_host_changed_rejects` | `host-identity-mismatch` (context- and claim-side) |
| `admit_engine_changed_rejects` | `engine-identity-mismatch` |
| `admission_extends` | inert-relation extension re-admits the re-bound claim |
| `admission_stale_rejects` | retracted premise row → `fact-not-selected`; keeping the stale row rejects even under an honest re-derived result |
| `admission_premise_edit_rejects` | permuted premises → `substitution-mismatch`; substituted premise → `substitution-mismatch` |
| forward-parent rejection witness | fabricated two-node cycle → `proof-cycle` |
| wrong/out-of-range witness | `conclusion-mismatch` / `unknown-proof` |

## Correspondence boundaries

- **Sampled, not proved.** These are deterministic fixture verdicts. The
  Lean side is a proved model statement; this lane demonstrates the same
  partition on representative inputs. No translation or refinement claim.
- **Digest binding is a surrogate.** The model binds `List Fact`/`List Rule`
  by value equality; the harness binds by canonical SHA-256 digest.
  Collision-freedom of `digestDocument` is assumed, not proved.
- **Witness/step binding differs in representation.** The model addresses
  parents by list index with a strict `j < i` check (acyclic by position);
  the checker addresses them by content digest and detects cycles
  separately. The rejections are aligned in outcome, not mechanism.
- **Answer binding differs in granularity.** The model binds one answer
  tuple to one witness index; the checker binds a whole row set to proof
  ids and additionally enforces answer-set completeness and the
  first-canonical-witness policy (`memory` lane obligations MEM-04/05),
  which `Algal.Admission` does not model.
- Host/engine remain opaque strings here too — no attestation, no
  production host admission. Source custody (`allowedSources`/`withdrawn`)
  passes through to the checker unchanged and is not part of the modelled
  tuple.
