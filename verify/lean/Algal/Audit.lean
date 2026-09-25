import Lean.Elab.Command
import Lean.Elab.ElabRules
import Lean.Util.CollectAxioms
import Lean.Data.Json

/-!
The executable evidence adapter invokes this command for every inventoried
theorem. It reads the elaborated environment and transitive dependencies; it
does not accept an authored summary of a declaration's kind or axioms.
This audit implementation and the pinned Lean runtime remain trusted tools.
-/
open Lean Elab Command

elab "audit_theorem " id:ident : command => do
  let name ← resolveGlobalConstNoOverload id
  let info ← getConstInfo name
  let .thmInfo declaration := info
    | throwError "audit requires a theorem declaration: {name}"
  let axioms ← collectAxioms name
  let type ← liftTermElabM <| Meta.ppExpr declaration.type
  let result := Json.mkObj [
    ("contract", toJson "algal.lean-theorem-audit.v1"),
    ("name", toJson name.toString),
    ("declarationKind", toJson "theorem"),
    ("type", toJson type.pretty),
    ("transitiveAxioms", toJson ((axioms.qsort Name.lt).map Name.toString))]
  logInfo m!"{result.compress}"

/- Audit every theorem defined by the selected imported modules, including
private and compiler-generated declarations. Names are not filtered by a
namespace or internal-detail heuristic. The caller separately checks that the
claimed inventory is a subset; the two counts have different meanings. -/
elab "audit_modules " modules:ident,+ : command => do
  let reviewedModules := modules.getElems.map (·.getId)
  let env ← getEnv
  for module in reviewedModules do
    unless env.header.moduleNames.contains module do
      throwError "audit module is not imported: {module}"
  let mut names := #[]
  for (name, info) in env.constants.toList do
    if let .thmInfo _ := info then
      if let some idx := env.getModuleIdxFor? name then
        if reviewedModules.contains env.header.moduleNames[idx.toNat]! then
          names := names.push name
  names := names.qsort Name.lt
  let mut rows := #[]
  for name in names do
    let some idx := env.getModuleIdxFor? name | throwError "missing theorem module"
    let axioms ← collectAxioms name
    rows := rows.push <| Json.mkObj [
      ("name", toJson name.toString),
      ("module", toJson env.header.moduleNames[idx.toNat]!.toString),
      ("internalDetail", toJson name.isInternalDetail),
      ("transitiveAxioms", toJson ((axioms.qsort Name.lt).map Name.toString))]
  logInfo m!"{(Json.mkObj [("contract", toJson "algal.lean-module-theorems.v1"),
    ("modules", toJson (reviewedModules.map Name.toString)), ("theorems", toJson rows)]).compress}"
