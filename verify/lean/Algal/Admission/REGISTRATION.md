# Registration notes — `verify/lean/Algal/Admission`

Phase 15 of `docs/formal-verification-plan.md` (the `lean-admission` leg).
**No existing tracked file was modified**: `Algal.lean` is untouched (the
aggregate's cold-build bound is 120 s; registration is the integrator's job
via a dedicated suite arm). The modules are reachable by direct import
(`import Algal.Admission.Model`, `import Algal.Admission.Theorems`).

## Modules

- `Model.lean` — `Ctx` (snapshot, rules, host, engine), `Claim` (bound
  context, derivation graph, answer tuple, witness index), `progSafe`,
  `admit`, and every lemma. Depends only on `Algal.Memory.Datalog`.
- `Theorems.lean` — assembled headline theorems (`admission_identity_exact`,
  `admission_component_change_rejects`, `admission_authority_nontransfer`,
  `admission_frontier_mono`, `admission_extends`, `admission_stale_rejects`,
  `admission_parents_exact`, `admission_premise_edit_rejects`,
  `admission_sound`) plus a `decide`-checked witness: the Phase-11
  transitive-closure derivation admitted under `host-α`/`engine-1`, with
  rejection witnesses for per-component identity change, stale snapshot,
  permuted/substituted/forward premises, bad witness index, unsafe program,
  and empty derivation.

## Direct build (pinned runtime, no aggregate)

```sh
cd verify/lean
PATH=/private/tmp/algal-verification-tools/lean-4.34.0-darwin_aarch64/bin:$PATH \
  lake build Algal.Admission.Model
PATH=/private/tmp/algal-verification-tools/lean-4.34.0-darwin_aarch64/bin:$PATH \
  lake build Algal.Admission.Theorems
```

Axiom audit (reports `propext`, `Quot.sound` only — no `sorry`, no
`native_decide`, no custom axioms):

```sh
cd verify/lean
cat > /tmp/admission_audit.lean <<'EOF'
import Algal.Admission.Theorems
open Algal.Admission
#print axioms admission_identity_exact
#print axioms admission_stale_rejects
#print axioms admission_parents_exact
#print axioms admission_sound
EOF
PATH=/private/tmp/algal-verification-tools/lean-4.34.0-darwin_aarch64/bin:$PATH \
  lake env lean /tmp/admission_audit.lean
```

## Suggested suite wiring

`verify/lib/suites.ts` already lists `lean-admission` in `PLANNED_SUITES`.
The integration change set should add it to `READY_SUITES` and mirror the
`lean-expr`/`lean-memory` arm in `verify/lib/runner.ts`:

- modules `["Algal.Admission.Model", "Algal.Admission.Theorems"]` under the
  pinned runtime (`leanRuntime`), same staged env, `--no-cache` builds;
- suggested scope text: "Admission-authority model: exact `(snapshot, rules,
  host, engine)` binding, frontier monotonicity, fails-closed retraction,
  authority non-transfer, exact-parent binding. Model-level claims only; no
  production or digest-refinement claim. Executable correspondence sampled
  by `verify/admission`."

Do **not** add `Algal.Admission.*` imports to `Algal.lean` in this lane.

## Executable correspondence

`verify/admission` holds a TypeScript harness pinning the same accept/reject
partition on the Phase-11 reference checker plus a `(snapshot, program,
host, engine)` binding wrapper. It is sampled fixture correspondence, not a
refinement proof — see `verify/admission/SCOPE.md`.
