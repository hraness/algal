# Lean admission-authority model — scope

Phase 15 (`lean-admission`). This directory models the boundary that turns a
checked derivation into an *admitted answer*: the conjunction of an exact
authority tuple, a safe program, a derivation that passes the Phase-11
checker, and a recorded witness step concluding the answer.

## Files and dependency direction

- `Model.lean` — imports `Algal.Memory.Datalog` only. Defines `Ctx`
  (snapshot, rules, host, engine), `Claim` (bound context, derivation,
  answer, witness index), `progSafe` (Bool range-restriction, mirrored by
  `AllSafe` via `progSafe_spec`), `admit`, and all lemmas.
- `Theorems.lean` — imports `Model.lean`. Assembled headline theorems plus
  the concrete witness program/derivation, all verdicts by kernel `decide`.
- Nothing here is imported by `Algal.lean`; registration is an integrator
  task (see `REGISTRATION.md`).

## What a theorem establishes

Evidence classes follow the `Algal.Expr`/`Algal.Memory` convention:

- **Model theorems** (`admit_spec`, `admit_intro`, `admit_binds_identity`,
  `admit_context_unique`, `admit_component_change_rejects`,
  `admit_host_changed_rejects`, `admit_engine_changed_rejects`,
  `admit_snapshot_changed_rejects`, `admit_rules_changed_rejects`,
  `seed_mono`, `iter_mono_facts`, `derivable_mono_facts`, `nodeValid_mono`,
  `validFrom_mono`, `valid_mono_facts`, `admit_extends`,
  `valid_false_of_nodeInvalid`, `admit_rejects_of_invalid_node`,
  `admit_rejects_of_stale_premise`, `admit_stale_rejects`, `usedPremises`,
  `mem_usedPremises`, `admit_lost_premise_row_rejects`, `premisesOK_length`,
  `premisesOK_at`, `admitted_parents_exact`,
  `nodeValid_false_of_premisesOK`, `admit_rejects_premise_edit`,
  `admit_sound`): proved statements about the model, `#print axioms`
  reports only `propext` and `Quot.sound` (verified on the
  `Theorems.lean` headlines).
- **Concrete witnesses** (`Theorems.lean`, `Witness` section): kernel
  `decide` verdicts on a five-node derivation — baseline admission, per-
  component identity rejection (snapshot, rules, host, engine), frontier
  extension re-admission, stale-snapshot rejection, permuted/substituted/
  forward premise rejection, wrong/out-of-range witness rejection, unsafe
  program rejection, empty-derivation rejection.

## Proved properties (Phase-15 obligations)

- **Exact admission authority.** `admit ctx c = true` forces `c.binds = ctx`
  componentwise (`admit_spec`, `admit_binds_identity`); the admitting
  context is unique (`admit_context_unique`); any single differing
  component rejects (`admit_component_change_rejects`). The bound object is
  the tuple `(snapshot, rules, host, engine)`, not merely the derived fact.
- **Frontier monotonicity.** `fs ⊆ fs'` grows `iter`, `Derivable`, and
  `valid` monotonically (`iter_mono_facts`, `derivable_mono_facts`,
  `valid_mono_facts`); the re-bound claim re-admits under the enlarged
  snapshot (`admit_extends`). Scoped to the positive finite-Datalog model:
  no negation, no truth maintenance, no work accounting.
- **Retraction fails closed.** A derivation containing a base (`none`-rule)
  node whose conclusion left the seed rejects (`admit_rejects_of_stale_premise`);
  the re-bound stale claim rejects (`admit_stale_rejects`); no admitted
  answer survives the loss of any recorded premise row
  (`admit_lost_premise_row_rejects` over `usedPremises`).
- **Authority non-transfer.** `admit ctx c = true` then `ctx'.host ≠
  ctx.host` or `ctx'.engine ≠ ctx.engine` ⇒ `admit ctx' c = false`
  (`admit_host_changed_rejects`, `admit_engine_changed_rejects`), regardless
  of what remains derivable.
- **Exact-parent binding.** An admitted rule node's premise list has the
  rule body's length, and position `k` points strictly backwards to a node
  concluding exactly `instLit σ body[k]` (`admitted_parents_exact` lifting
  `premisesOK_at`). A premise list edited to fail the positional check
  rejects the claim (`admit_rejects_premise_edit`); permuted, substituted,
  and forward-pointing variants are `decide`-witnessed to reject.
- **Soundness.** `admit` ⇒ `Derivable` for the answer (`admit_sound`):
  admission cannot mint underivable facts.

## Honest boundaries and narrowings

- **Premise binding is positional, not node-identity binding.** If two
  different earlier nodes conclude the same tuple, either index satisfies
  `premisesOK`. `admitted_parents_exact` pins the conclusion-at-position
  invariant — the content-level binding the reference checker enforces via
  digests (identical content has identical digest). The Lean index graph
  does not distinguish two same-content nodes; the reference checker does
  not admit them distinctly either.
- **`admit` checks the claim's own recorded snapshot**, and identity
  binding makes it the context's. A claim that lies about the snapshot is
  rejected by the identity check, not by validity.
- **Whole-derivation validity.** `valid` requires every recorded node to be
  valid, so a claim fails even when the retracted row only supported a node
  unreachable from the answer — strictly stronger than "used premise rows"
  and consistent with the reference checker's `dangling-proof` rejection.
- **Host/engine are opaque identities.** `H`/`E` are any `DecidableEq`
  types; the model proves exact binding, not attestation, capabilities, or
  that a real host/engine corresponds.
- **Digests are not modeled.** Snapshot/rule identity is value equality of
  the lists, not SHA-256 of a canonical form; collision-freedom of the
  concrete digest is a separate assumption carried by the executable
  correspondence lane.

## Open / not established

- Refinement of `admit`/`Ctx`/`Claim` to production code
  (`src/application-memory.ts`, `crates/algal/src/memory.rs`). No
  translation or ABI claim.
- Cryptographic digest correctness, canonical serialization, or decode
  correspondence.
- Semantic truth/provenance of the base facts, negation, nonmonotone or
  incremental truth maintenance beyond the positive finite model.
- Live host/engine attestation, provider qualification, or runtime
  authority minting (cf. `Algal.Core.Ports.syntax_does_not_mint_authority`
  for the complementary capability-vs-authority separation).
- Work accounting (`claimed.work`), completeness/`complete` flags, row-set
  or iteration-order conformance — those remain with the Phase-11 model
  and the reference checker, not re-proved here.
