import Algal.Core.Binary64
import Algal.Core.Json

/-!
# algal source — semantic model: programs, bounds, static analysis

This module fixes the data model for the checked source semantics in
`Algal.Source.Eval` and `Algal.Source.Theorems`. It is a *semantic model* of
the readable `.algal` source language (`verify/source/model.ts`,
`verify/source/parse.ts`, `verify/source/check.ts`) — proved under the Lean
kernel. **It is not a proof that the production compiler or runtime
implements the same behavior**; that correspondence is differential-tested
in `verify/source/differential.ts` and documented in `SCOPE.md`.

* Programs are expressions over literals, names, field paths, bounded
  operators, `if`/`match`, the effects `decide`/`generate`, and composition
  forms `call`/`each`.
* `MISSING` models the undelivered-port semantics of the generated graph: a
  cell whose wired input was never produced is skipped, and the skip
  propagates. Source evaluation therefore produces `Option`-style results —
  `miss` — rather than inventing a value.
* `call` arguments are *exact named arguments*: the argument record's key
  set must equal the child's parameter list. `each` binds the `over`
  parameter per item, in ascending index order.
* Compiler-generated controls (`source-control-*` guard inputs, trigger
  shims, wrappers) are compile artifacts; they appear in no type here. The
  source semantics observes only selected-path effects and accounting.
* The static analysis `analysisModule` reproduces the checker's counted
  bounds: `maxAgentCalls` counts emitted effect cells plus child budgets
  weighted by `maxItems`; `requiredDepth` counts the child-depth edge plus
  one for the generated trigger wrapper on guarded parameterless calls.
-/

set_option autoImplicit false
namespace Algal.Source

open Algal.Core Algal.Core.Json

/-! ## Bounded surface -/

def maxSourceBytes : Nat := 65536
def maxTokens : Nat := 8192
def maxNodes : Nat := 1024
def maxExprDepth : Nat := 16
def maxBindings : Nat := 24
def maxParameters : Nat := 16
def maxNameLength : Nat := 40
def maxCollectionItems : Nat := 64
def maxFiles : Nat := 16
def maxImports : Nat := 16
def maxProjectBytes : Nat := 1048576
def maxImportDepth : Nat := 8
def maxRecords : Nat := 16
def maxRecordFields : Nat := 32
def maxSchemaLevels : Nat := 8
def maxSchemaDepth : Nat := 4
def maxCells : Nat := 256
def maxEdges : Nat := 512
def maxEachItems : Nat := 64
def maxChoiceLabels : Nat := 32
def contractMaxDepth : Nat := 8

/-- Runtime budget defaults (the source profile `algal.source.profile.v1`). -/
structure Budgets where
  maxSteps : Nat := 256
  maxAgentCalls : Nat := 0
  maxWork : Nat := 1000000
  maxContextBytes : Nat := 65536
  maxOutputBytes : Nat := 65536
  maxDepth : Nat := 4
  deriving DecidableEq

/-- The parameter/interface types the lowered manifest carries. Shaped types
    (records, lists) arrive at the boundary as `json` ports whose declared
    schema is checked against the value; this model keeps the check at the
    level of the three port classes it distinguishes. -/
inductive PType where | text | json | boolean deriving DecidableEq, Repr

/-! ## Expressions -/

inductive UnOp where | not | neg deriving DecidableEq, Repr
inductive BinOp where
  | add | sub | mul | div | mod
  | eq | neq | lt | le | gt | ge
  | and | or | sconcat
  deriving DecidableEq, Repr

inductive Expr where
  | lit (value : Value)
  | name (n : String)
  | field (value : Expr) (name : String)
  | probability (value label : Expr)
  | unary (op : UnOp) (value : Expr)
  | binary (op : BinOp) (left right : Expr)
  | record (entries : List (String × Expr))
  | list (items : List Expr)
  | if_ (condition yes no : Expr)
  | match_ (value : Expr) (arms : List (String × Expr))
  | decide (question : String) (context : Expr) (criteria : List (String × String))
  | generate (instruction context : Expr)
  | call (alias : String) (args : List (String × Expr))
  | each (alias over : String) (items : Expr) (args : List (String × Expr)) (maxItems : Nat)

/-! ## Programs and modules -/

structure Program where
  name : String
  parameters : List (String × PType)
  output : PType
  bindings : List (String × Expr)
  result : Expr
  budgets : Budgets

/-- A checked module: its program plus the resolved import closure by alias.
    Import graphs are acyclic (checked at load), so modules form a finite
    tree when expanded by identity. -/
structure Module where
  key : String
  program : Program
  imports : List (String × Module)

/-! ## Effectfulness (positions where the lowering permits cells) -/

mutual
/-- True when `e` contains an effect or composition form — such expressions
    are only legal as whole bindings, return, or branch arms. -/
def hasEffect : Expr → Bool
  | .decide .. | .generate .. | .call .. | .each .. => true
  | .lit .. | .name .. => false
  | .field value _ => hasEffect value
  | .probability value label => hasEffect value || hasEffect label
  | .unary _ value => hasEffect value
  | .binary _ left right => hasEffect left || hasEffect right
  | .record entries => hasEffectEntries entries
  | .list items => hasEffectList items
  | .if_ c y n => hasEffect c || hasEffect y || hasEffect n
  | .match_ v arms => hasEffect v || hasEffectEntries arms
def hasEffectEntries : List (String × Expr) → Bool
  | [] => false
  | (_, e) :: rest => hasEffect e || hasEffectEntries rest
def hasEffectList : List Expr → Bool
  | [] => false
  | e :: rest => hasEffect e || hasEffectList rest
end

/-! ## Static analysis

`calls` counts every emitted effect cell — both arms of a guarded `if`
count, because the budget bound is over the emitted graph, not the selected
path. `depth` accounts the maximum call-chain depth, with one extra level
for the generated trigger wrapper on a guarded parameterless call. -/

mutual
/-- Effect-cell and call-site accounting for one expression. `resolve`
    gives an alias's `(maxAgentCalls, requiredDepth)` analysis. -/
def callsExpr (resolve : String → Option (Nat × Nat)) : Expr → Nat
  | .lit .. | .name .. => 0
  | .field v _ => callsExpr resolve v
  | .probability v l => callsExpr resolve v + callsExpr resolve l
  | .unary _ v => callsExpr resolve v
  | .binary _ l r => callsExpr resolve l + callsExpr resolve r
  | .record es => callsEntries resolve es
  | .list is => callsItems resolve is
  | .if_ c y n => callsExpr resolve c + callsExpr resolve y + callsExpr resolve n
  | .match_ v arms => callsExpr resolve v + callsEntries resolve arms
  | .decide _ c _ => 1 + callsExpr resolve c
  | .generate i c => 1 + callsExpr resolve i + callsExpr resolve c
  | .call alias _ => ((resolve alias).map Prod.fst).getD 0
  | .each alias _ items args maxItems =>
      callsExpr resolve items + callsEntries resolve args
        + ((resolve alias).map Prod.fst).getD 0 * maxItems
def callsEntries (resolve : String → Option (Nat × Nat)) : List (String × Expr) → Nat
  | [] => 0
  | (_, e) :: rest => callsExpr resolve e + callsEntries resolve rest
def callsItems (resolve : String → Option (Nat × Nat)) : List Expr → Nat
  | [] => 0
  | e :: rest => callsExpr resolve e + callsItems resolve rest
end

mutual
/-- Selected-path depth accounting: each composition edge adds one, plus one
    for the trigger wrapper a guarded parameterless `call` emits. `control`
    is true inside an effectful arm (a source-control wire gates it). -/
def depthExpr (resolve : String → Option (Nat × Nat)) (control : Bool) : Expr → Nat
  | .lit .. | .name .. => 0
  | .field v _ => depthExpr resolve control v
  | .probability v l => max (depthExpr resolve control v) (depthExpr resolve control l)
  | .unary _ v => depthExpr resolve control v
  | .binary _ l r => max (depthExpr resolve control l) (depthExpr resolve control r)
  | .record es => depthEntries resolve control es
  | .list is => depthItems resolve control is
  | .if_ c y n =>
      let c' := hasEffect c || hasEffect y || hasEffect n
      max (depthExpr resolve control c)
        (max (depthExpr resolve c' y) (depthExpr resolve c' n))
  | .match_ v arms =>
      let c' := hasEffect v || hasEffectEntries arms
      max (depthExpr resolve control v) (depthEntries resolve c' arms)
  | .decide _ c _ => depthExpr resolve control c
  | .generate i c => max (depthExpr resolve control i) (depthExpr resolve control c)
  | .call alias args =>
      let edge := ((resolve alias).map Prod.snd).getD 0 + 1 + (if control && args.isEmpty then 1 else 0)
      max edge (depthEntries resolve control args)
  | .each alias _ items args _ =>
      max (((resolve alias).map Prod.snd).getD 0 + 1)
        (max (depthExpr resolve control items) (depthEntries resolve control args))
def depthEntries (resolve : String → Option (Nat × Nat)) (control : Bool) : List (String × Expr) → Nat
  | [] => 0
  | (_, e) :: rest => max (depthExpr resolve control e) (depthEntries resolve control rest)
def depthItems (resolve : String → Option (Nat × Nat)) (control : Bool) : List Expr → Nat
  | [] => 0
  | e :: rest => max (depthExpr resolve control e) (depthItems resolve control rest)
end

/-- Per-module analysis: the sum over bindings and result for calls, and the
    maximum for depth. Aliases resolve through the import table. -/
def analysisProgram (resolve : String → Option (Nat × Nat)) (p : Program) : Nat × Nat :=
  let calls := (p.bindings.map fun (_, e) => callsExpr resolve e).sum + callsExpr resolve p.result
  let depth := max (depthExpr resolve false p.result)
    ((p.bindings.map fun (_, e) => depthExpr resolve false e).foldr max 0)
  (calls, depth)

mutual
/-- Module-level analysis resolves `call`/`each` aliases against the checked
    child analyses (children analyzed first — the import tree is finite and
    acyclic). -/
def analysisModule : Module → Nat × Nat
  | { program, imports, .. } =>
      analysisProgram (fun alias => (analysisImports imports).lookup alias) program
def analysisImports : List (String × Module) → List (String × (Nat × Nat))
  | [] => []
  | (alias, child) :: rest => (alias, analysisModule child) :: analysisImports rest
end


/-! ## The generated-side structures the checker predicts -/

/-- The lowered cell kinds the checker can emit (a source profile subset of
    the organism contract). -/
inductive CellKind where | input | expr | decide | agent | organism | each deriving DecidableEq, Repr

/-- One predicted generated cell: id, kind, ordered input names, and the
    presence of a `source-control-N` guard input. -/
structure OutlineCell where
  id : String
  kind : CellKind
  inputs : List String := []
  guarded : Bool := false
  deriving Repr

/-- The semantic identity of a source program under compilation: program
    name, interface shape, budgets, and the binding/result structure. Two
    sources differing only in layout trivia (whitespace, comments, spans)
    share an identity — the manifest digest must not see them. -/
def programIdentity (p : Program) : List (String × Expr) × Expr := (p.bindings, p.result)

end Algal.Source
