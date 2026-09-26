import Algal.Source.Model
import Algal.Core.KeyOrder

/-!
# algal source — semantic model: the bounded interpreter

This module defines the source-level interpreter as a provably total Lean
function; theorem-facing facts live in `Algal.Source.Theorems`. It is a
semantic model of `verify/source/interp.ts` — which itself models the
generated-graph semantics a checked `.algal` program lowers into.

## Machine shape

Evaluation is structural recursion over the program's expressions and
binding list. Module re-entry (`call`/`each`) is the only non-structural
edge, so it goes through an explicit **child seam**: `Child` is a function
`Module → args → site → depth → State → Res Value × State`, instantiated by
`mkChild`, a depth-fuelled recursion — `mkChild (fuel + 1)` hands inner calls
`mkChild fuel`. Fuel here models the run's depth bound; every witness sets
`fuel > maxDepth` so the budget check, never the fuel, is what rejects.

## What the machine counts

`State` records the observable trace a source program produces:

* `steps` — generated-cell activations (expression, selector, merge,
  decision-check, agent, decide, arg cells, composition cells, collectors);
* `calls` — executor attempts charged to `maxAgentCalls` (one per issued
  effect request);
* `obs` — the ordered list of effect observations the oracle answered;
* `invocations` — the ordered `(site, key)` list of child runs entered.

A cell whose wired inputs were never produced is *skipped*: it returns
`miss`, adds no step, no charge, no observation — `MISSING` is the undelivered
port the generated scheduler would leave unfilled. Skipping is by name
reachability (`undelivered`): every name an expression reads is a wired input
of its generated cell, so one undelivered name skips the cell regardless of
operator order.

## Deliberate exclusions

* `algal.expr.v1` program bodies inside generated cells are modelled by the
  expression layer here (a structural subset), not by `Algal.Expr` — the
  operator table stays at what the source grammar emits (`get`, arithmetic,
  comparisons, `sconcat`, `and`/`or`).
* Byte budgets (`maxWork`, `maxContextBytes`, `maxOutputBytes`) exist in
  `Budgets` and are enforced in the TypeScript model; this model omits the
  byte computations — counted steps and calls are the theorems' subject.
* Source locations/maps are absent by construction.
-/

set_option autoImplicit false
namespace Algal.Source

open Algal.Core Algal.Core.Json

/-! ## Errors, observations, state -/

inductive Code where
  | typeMismatch | exprFailed | budgetExhausted | depthExceeded
  | effectFailed | effectUnparseable | internal
  deriving DecidableEq, Repr

structure Err where code : Code deriving DecidableEq, Repr

def err (code : Code) : Err := { code }

/-- The source-level observation an oracle sees — the payload the generated
    `decide`/`agent` cell would dispatch. -/
structure Obs where
  site : String
  kind : String          -- "decide" | "generate"
  text : String          -- the decide question or the resolved instruction
  context : Value
  deriving DecidableEq

inductive Res (α : Type) where
  | ok (value : α) | miss | err (e : Err)
  deriving DecidableEq

/-- The run's accounting state: ordered, append-only. -/
structure State where
  steps : Nat := 0
  calls : Nat := 0
  obs : List Obs := []
  invocations : List (String × String) := []
  deriving DecidableEq

/-- An undelivered value (the generated port never produced one). -/
abbrev Env := List (String × Option Value)

/-- The child-invocation seam: enters a module's run at a call/each edge —
    `mkChild` instantiates it. -/
abbrev Child := Module → List (String × Option Value) → String → Nat → State → Res Value × State

/-! ## The pure layer -/

/-- `value.kind` names for the typed-error paths. -/
def kindOf : Value → String
  | .null => "null" | .bool _ => "boolean" | .number _ => "number"
  | .text _ => "string" | .array _ => "list" | .object _ => "object"

/-- `get` on an object: a missing key yields `null`, matching the generated
    `get` program's semantics. -/
def getField : Value → String → Except Err Value
  | .object fields, key =>
      let rec look : Fields → Except Err Value
        | .nil => .ok .null
        | .cons k v rest => if k == key then .ok v else look rest
      look fields
  | .null, _ => .ok .null
  | _, _ => .error (err .exprFailed)

/-- Truthiness for `and`/`or`/`if`: a non-boolean in a boolean context is an
    `EXPR_FAILED` dynamic failure. -/
def truthy : Value → Except Err Bool
  | .bool b => .ok b
  | _ => .error (err .exprFailed)

/-- Number admission: float bits that stay finite — the model stands in for
    the contract's `EXPR_NUM`/bounded-value admission. -/
def numOfFloat (f : Float) : Except Err Value :=
  match Binary64.admit f.toBits with
  | some n => .ok (.number n)
  | none => .error (err .exprFailed)

def itemsOf : List Value → Items
  | [] => .nil | v :: rest => .cons v (itemsOf rest)
def fieldsOf : List (String × Value) → Fields
  | [] => .nil | (k, v) :: rest => .cons k v (fieldsOf rest)

/-- The generated `sconcat`/arithmetic/comparison ops — the operator surface
    the source checker emits into `expr` cells. -/
def evalBin (op : BinOp) (l r : Value) : Except Err Value :=
  match op with
  | .eq => .ok (.bool (l == r))
  | .neq => .ok (.bool (l != r))
  | .sconcat => match l, r with
      | .text a, .text b => .ok (.text (a ++ b))
      | _, _ => .error (err .exprFailed)
  | .lt | .le | .gt | .ge => match l, r with
      | .number a, .number b =>
          let af := Float.ofBits a.bits
          let bf := Float.ofBits b.bits
          .ok (.bool (match op with | .lt => af < bf | .le => af ≤ bf | .gt => af > bf | _ => af ≥ bf))
      | _, _ => .error (err .exprFailed)
  | .add | .sub | .mul | .div | .mod => match l, r with
      | .number a, .number b =>
          let af := Float.ofBits a.bits
          let bf := Float.ofBits b.bits
          if (op == .div || op == .mod) && bf == 0 then .error (err .exprFailed)
          else numOfFloat (match op with
              | .add => af + bf
              | .sub => af - bf
              | .mul => af * bf
              | .div => af / bf
              | _ =>
                  let q := af / bf
                  af - bf * (if q ≥ 0 then q.floor else (-q.floor)))
      | _, _ => .error (err .exprFailed)
  | .and | .or => .error (err .exprFailed)  -- handled with short-circuit above

/-- Insert one record entry into canonical key order (`Algal.Core.Text`'s
    `keyOrder` — array-index-first UTF-8 order), keeping duplicates. -/
def insertEntry (e : String × Expr) : List (String × Expr) → List (String × Expr)
  | [] => [e]
  | x :: rest =>
      if Algal.Core.Text.keyOrder e.1 x.1 != Ordering.gt then e :: x :: rest
      else x :: insertEntry e rest

mutual
/-- Canonicalize an expression's record entries (recursively): generated
    `expr` programs evaluate object-literal fields in canonical key order. -/
def canonExpr : Expr → Expr
  | .lit v => .lit v
  | .name n => .name n
  | .field v f => .field (canonExpr v) f
  | .probability v l => .probability (canonExpr v) (canonExpr l)
  | .unary op v => .unary op (canonExpr v)
  | .binary op l r => .binary op (canonExpr l) (canonExpr r)
  | .record entries => .record (canonSort (canonFields entries))
  | .list items => .list (canonList items)
  | .if_ c y n => .if_ (canonExpr c) (canonExpr y) (canonExpr n)
  | .match_ v arms => .match_ (canonExpr v) (canonFields arms)
  | .decide q c cs => .decide q (canonExpr c) cs
  | .generate i c => .generate (canonExpr i) (canonExpr c)
  | .call alias args => .call alias (canonFields args)
  | .each alias over items args m => .each alias over (canonExpr items) (canonFields args) m
def canonFields : List (String × Expr) → List (String × Expr)
  | [] => []
  | (k, e) :: rest => (k, canonExpr e) :: canonFields rest
def canonList : List Expr → List Expr
  | [] => []
  | e :: rest => canonExpr e :: canonList rest
def canonSort : List (String × Expr) → List (String × Expr)
  | [] => []
  | e :: rest => insertEntry e (canonSort rest)
end

/-- Canonicalize a program's record fields — the checker-level normalization
    that fixes generated evaluation order. -/
def canonProgram (p : Program) : Program :=
  { p with bindings := p.bindings.map fun (n, e) => (n, canonExpr e),
           result := canonExpr p.result }

mutual
/-- Pure-position evaluation: the expression layer inside generated cells —
    operands, arguments, selectors, merge inputs. Produces `miss` when a
    wired input was never delivered; errors are typed (`EXPR_FAILED`,
    `TYPE_MISMATCH`). `and`/`or` short-circuit before the right operand is
    consulted; `if`/`match` evaluate only the selected arm. -/
def evalExpr : Expr → Env → Res Value
  | .lit v, _ => .ok v
  | .name n, env =>
      match env.lookup n with
      | some (some v) => .ok v
      | some none => .miss
      | none => .err (err .exprFailed)
  | .field value name, env =>
      match evalExpr value env with
      | .ok v => (match getField v name with | .ok r => .ok r | .error e => .err e)
      | other => other
  | .probability value label, env =>
      match evalExpr label env with
      | .ok (.text l) =>
          (match evalExpr value env with
            | .ok v =>
                (match getField v "probabilities" with
                  | .ok ps => (match getField ps l with | .ok r => .ok r | .error e => .err e)
                  | .error e => .err e)
            | other => other)
      | .ok _ => .err (err .exprFailed)
      | other => other
  | .unary op value, env =>
      match evalExpr value env with
      | .ok v =>
          (match op with
            | .not => (match truthy v with | .ok b => .ok (.bool !b) | .error e => .err e)
            | .neg => match v with
                | .number n => (match numOfFloat (-(Float.ofBits n.bits)) with
                    | .ok r => .ok r | .error e => .err e)
                | _ => .err (err .exprFailed))
      | other => other
  | .binary op left right, env =>
      match op with
      | .and =>
          (match evalExpr left env with
            | .ok v =>
                (match truthy v with
                  | .ok false => .ok (.bool false)
                  | .ok true => evalExpr right env
                  | .error e => .err e)
            | other => other)
      | .or =>
          (match evalExpr left env with
            | .ok v =>
                (match truthy v with
                  | .ok true => .ok (.bool true)
                  | .ok false => evalExpr right env
                  | .error e => .err e)
            | other => other)
      | _ =>
          match evalExpr left env with
          | .ok l =>
              (match evalExpr right env with
                | .ok r => (match evalBin op l r with | .ok v => .ok v | .error e => .err e)
                | other => other)
          | other => other
  | .record entries, env =>
      match evalRecordEntries entries env with
      | .ok fields => .ok (.object (fieldsOf fields))
      | .miss => .miss
      | .err e => .err e
  | .list items, env =>
      match evalItems items env with
      | .ok vals => .ok (.array (itemsOf vals))
      | .miss => .miss
      | .err e => .err e
  | .if_ c y n, env =>
      match evalExpr c env with
      | .ok v =>
          (match truthy v with
            | .ok true => evalExpr y env
            | .ok false => evalExpr n env
            | .error e => .err e)
      | other => other
  | .match_ value arms, env =>
      match evalExpr value env with
      | .ok (.text label) => evalArms label arms env
      | .ok _ => .err (err .typeMismatch)
      | other => other
  | .decide .., _ => .err (err .exprFailed)
  | .generate .., _ => .err (err .exprFailed)
  | .call .., _ => .err (err .exprFailed)
  | .each .., _ => .err (err .exprFailed)

def evalArms : String → List (String × Expr) → Env → Res Value
  | _, [], _ => .err (err .typeMismatch)   -- foreign label: the selector's
                                         -- declared choice rejects it first
  | label, (l, a) :: rest, env =>
      if l == label then evalExpr a env else evalArms label rest env

def evalRecordEntries : List (String × Expr) → Env → Res (List (String × Value))
  | [], _ => .ok []
  | (key, e) :: rest, env =>
      match evalExpr e env with
      | .ok v => (match evalRecordEntries rest env with
          | .ok fields => .ok ((key, v) :: fields)
          | other => other)
      | .miss => .miss
      | .err e => .err e

def evalItems : List Expr → Env → Res (List Value)
  | [], _ => .ok []
  | e :: rest, env =>
      match evalExpr e env with
      | .ok v => (match evalItems rest env with
          | .ok vals => .ok (v :: vals)
          | other => other)
      | .miss => .miss
      | .err e => .err e
end

/-! ## Effectful tail positions -/

mutual
/-- Every name a source expression reads — the wired inputs of its generated
    cell. One undelivered input skips the whole cell. -/
def freeNames : Expr → List String
  | .lit _ => []
  | .name n => [n]
  | .field v _ => freeNames v
  | .probability v l => freeNames v ++ freeNames l
  | .unary _ v => freeNames v
  | .binary _ l r => freeNames l ++ freeNames r
  | .record es => freeNamesEntries es
  | .list items => freeNamesItems items
  | .if_ c y n => freeNames c ++ freeNames y ++ freeNames n
  | .match_ v arms => freeNames v ++ freeNamesEntries arms
  | .decide _ c _ => freeNames c
  | .generate i c => freeNames i ++ freeNames c
  | .call _ args => freeNamesEntries args
  | .each _ _ items args _ => freeNames items ++ freeNamesEntries args
def freeNamesEntries : List (String × Expr) → List String
  | [] => []
  | (_, e) :: rest => freeNames e ++ freeNamesEntries rest
def freeNamesItems : List Expr → List String
  | [] => []
  | e :: rest => freeNames e ++ freeNamesItems rest
end

/-- True when at least one name the cell reads was never delivered — the
    generated cell's skip condition. -/
def undelivered (e : Expr) (env : Env) : Bool :=
  (freeNames e).any fun n => match env.lookup n with | some (some _) => false | _ => true

/-- One generated-cell activation against `maxSteps`. -/
def step (budgets : Budgets) (s : State) : Res Unit × State :=
  if s.steps + 1 > budgets.maxSteps then (.err (err .budgetExhausted), s) else (.ok (), { s with steps := s.steps + 1 })

/-- One executor attempt against `maxAgentCalls`. -/
def charge (budgets : Budgets) (s : State) : Res Unit × State :=
  if s.calls + 1 > budgets.maxAgentCalls then (.err (err .budgetExhausted), s) else (.ok (), { s with calls := s.calls + 1 })

/-- A cell activation: skip on undelivered inputs; otherwise charge one step
    and evaluate the expression body. -/
def evalCell (budgets : Budgets) (e : Expr) (env : Env) (s : State) : Res Value × State :=
  if undelivered e env then (.miss, s)
  else match step budgets s with
    | (.err er, s) => (.err er, s)
    | (.ok _, s) => (evalExpr e env, s)
    | (.miss, s) => (.miss, s)

/-- An effect operand: a bare name wires to its producer directly (no cell);
    anything else evaluates inside its own generated cell. -/
def evalOperand (budgets : Budgets) (e : Expr) (env : Env) (s : State) : Res Value × State :=
  match e with
  | .name _ => (evalExpr e env, s)
  | _ => evalCell budgets e env s

/-- A decision record lookup — the generated decision-check cell's
    normalization reads `answers.answer.{choice,confidence,probabilities}`. -/
def getOf : Fields → String → Option Value
  | .nil, _ => none
  | .cons k v rest, key => if k == key then some v else getOf rest key

def asFloat : Value → Option Float
  | .number n => some (Float.ofBits n.bits)
  | _ => none

/-- The generated `decision-check` cell: the oracle's raw answer must carry a
    declared choice, a confidence in [0,1], and an in-range probability for
    every declared label. Malformed metadata fails `EXPR_FAILED`, as the
    generated `nth`-of-empty program does. -/
def normalizeDecision (raw : Value) (labels : List String) : Except Err Value :=
  match raw with
  | .object fields =>
      match getOf fields "answers" with
      | some (.object answers) =>
          (match getOf answers "answer" with
            | some (.object a) =>
                let choice := getOf a "choice"
                let confidence := getOf a "confidence"
                let probs := getOf a "probabilities"
                let probOk := labels.all fun label =>
                  match probs with
                  | some (.object ps) =>
                      (match getOf ps label with
                        | some v => (asFloat v).map (fun p => 0 ≤ p && p ≤ 1) |>.getD false
                        | none => false)
                  | _ => false
                let ok := (match choice with | some (.text c) => labels.contains c | _ => false)
                    && probOk
                    && ((match confidence with | some v => asFloat v | none => none).map (fun c => 0 ≤ c && c ≤ 1)).getD false
                if !ok then .error (err .exprFailed)
                else
                  let choice' := match choice with | some (.text c) => c | _ => ""
                  let conf := match confidence with | some (.number n) => n | _ => ⟨0, by decide⟩
                  let probFields := labels.map fun label =>
                    let pv := match probs with
                      | some (.object ps) => (getOf ps label).getD .null
                      | _ => .null
                    (label, pv)
                  .ok (.object (fieldsOf [("value", .text choice'), ("confidence", .number conf), ("probabilities", .object (fieldsOf probFields))]))
            | _ => .error (err .exprFailed))
      | _ => .error (err .exprFailed)
  | _ => .error (err .exprFailed)

def listOf : Items → List Value
  | .nil => [] | .cons v rest => v :: listOf rest

/-- The port declaration classes a checked parameter carries: `text`,
    `boolean`, and `json` (which carries any JSON under a declared schema —
    the schema check lives in the TypeScript model's `checkValue`). -/
def portAccepts : PType → Value → Bool
  | .text, .text _ => true
  | .boolean, .bool _ => true
  | .json, _ => true
  | .text, _ | .boolean, _ => false



/-- Sequential composition over the accounting state: pass the updated state
    on `ok`, propagate `miss`/`err` unchanged. -/
def seq {α : Type} (r : Res Unit × State) (k : State → Res α × State) : Res α × State :=
  match r with
  | (.ok _, s) => k s
  | (.err e, s) => (.err e, s)
  | (.miss, s) => (.miss, s)

/-- Value-producing sequential composition. -/
def seqR {α β : Type} (r : Res α × State) (k : α → State → Res β × State) : Res β × State :=
  match r with
  | (.ok v, s) => k v s
  | (.err e, s) => (.err e, s)
  | (.miss, s) => (.miss, s)

/-- Evaluate the declared parameter arguments in order; a missing argument
    cell leaves the port undelivered (`none`). -/
def evalArgs (budgets : Budgets) (fuel : Nat)
    (ordered : List (String × Option Expr)) (env : Env) (s : State) : Res (List (String × Option Value)) × State :=
  match fuel with
  | 0 => (.err (err .internal), s)
  | fuel + 1 =>
    match ordered with
    | [] => (.ok [], s)
    | (pname, none) :: rest =>
        seqR (evalArgs budgets fuel rest env s) fun xs s => (.ok ((pname, none) :: xs), s)
    | (pname, some e) :: rest =>
        match evalCell budgets e env s with
        | (.err e, s) => (.err e, s)
        | (.miss, s) => seqR (evalArgs budgets fuel rest env s) fun xs s => (.ok ((pname, none) :: xs), s)
        | (.ok v, s) => seqR (evalArgs budgets fuel rest env s) fun xs s => (.ok ((pname, some v) :: xs), s)


/-- The per-item loop: invoke the child at `site/i{i}` for each item in
    ascending order; collect the ordered outputs. A missing item result
    contributes nothing (the downstream merge produces fewer inputs). -/
def eachItems (budgets : Budgets) (oracle : Obs → Except Err Value) (child : Child) (fuel : Nat)
    (cm : Module) (over : String) (argv : List (String × Option Value))
    (xs : List Value) (i : Nat) (site : String) (depth : Nat) (s : State) (acc : List Value) : Res Value × State :=
  match fuel with
  | 0 => (.err (err .internal), s)
  | fuel + 1 =>
    match xs with
    | [] => (.ok (.array (itemsOf acc.reverse)), s)
    | x :: rest =>
        let s := { s with invocations := s.invocations ++ [(s!"{site}-each/i{i}", cm.key)] }
        match child cm ((over, some x) :: argv) s!"{site}-each/i{i}" depth s with
        | (.err e, s) => (.err e, s)
        | (.miss, s) => eachItems budgets oracle child fuel cm over argv rest (i + 1) site depth s acc
        | (.ok v, s) => eachItems budgets oracle child fuel cm over argv rest (i + 1) site depth s (v :: acc)


/-- `call`: exact named arguments evaluated in child-parameter order inside
    arg cells; a missing one skips the whole call. The organism cell is
    charged a step, the child runs at `depth + 1`, and the invocation is
    recorded at `site` — a guarded parameterless call additionally passes
    through the generated trigger wrapper (counted in `analysisModule`, not
    observable here). -/
def evalCall (budgets : Budgets) (oracle : Obs → Except Err Value) (child : Child)
    (fuel : Nat) (mod : Module) (env : Env) (site : String) (depth : Nat)
    (alias : String) (args : List (String × Expr)) (s : State) : Res Value × State :=
  match fuel with
  | 0 => (.err (err .internal), s)
  | fuel + 1 =>
    match mod.imports.lookup alias with
    | none => (.err (err .internal), s)   -- unreachable on a checked module
    | some cm =>
        let ordered := cm.program.parameters.map fun (pname, _) =>
          (pname, (args.find? fun (n, _) => n == pname).map Prod.snd)
        seqR (evalArgs budgets fuel ordered env s) fun argv s =>
          if argv.any (fun (_, v) => v.isNone) then (.miss, s)
          else seq (step budgets s) fun s =>         -- the organism cell
            let s := { s with invocations := s.invocations ++ [(site, cm.key)] }
            child cm argv site (depth + 1) s


/-- `each`: the `over` input carries the whole list as one `json` value;
    items run at `site/i{i}` in ascending order; the ordered outputs collect
    into a list. An empty list invokes the child zero times. -/
def evalEach (budgets : Budgets) (oracle : Obs → Except Err Value) (child : Child)
    (fuel : Nat) (mod : Module) (env : Env) (site : String) (depth : Nat)
    (alias : String) (over : String) (items : Expr) (args : List (String × Expr)) (maxItems : Nat)
    (s : State) : Res Value × State :=
  match fuel with
  | 0 => (.err (err .internal), s)
  | fuel + 1 =>
    match mod.imports.lookup alias with
    | none => (.err (err .internal), s)
    | some cm =>
        seqR (evalCell budgets items env s) fun packed s =>
          match packed with
          | .array xs =>
              let list := listOf xs
              if list.length > maxItems then (.err (err .budgetExhausted), s)
              else
                let ordered := (cm.program.parameters.filter (·.1 != over)).map fun (pname, _) =>
                  (pname, (args.find? fun (n, _) => n == pname).map Prod.snd)
                seqR (evalArgs budgets fuel ordered env s) fun argv s =>
                  if argv.any (fun (_, v) => v.isNone) then (.miss, s)
                  else seq (step budgets s) fun s =>      -- the each cell
                    seqR (eachItems budgets oracle child fuel cm over argv list 0 site (depth + 1) s [])
                      fun v s => seq (step budgets s) fun s => (.ok v, s)  -- the results collector
          | _ => (.err (err .typeMismatch), s)


/-- The tail-position evaluator: binding, `return`, and branch-arm
    expressions — the places effects are admitted. `site` is the generated
    cell's path position (`b1-x`, `result`, `result-branch-arm-2`, `…/i3`).
    `fuel` is the scheduler-tick bound: every group call spends one tick, so
    `fuel > steps × (maxDepth + 2)` is sufficient — exhaustion lands on
    `internal`, never a semantic result. -/
def evalTail (budgets : Budgets) (oracle : Obs → Except Err Value) (child : Child)
    (fuel : Nat) (mod : Module) (env : Env) (site : String) (depth : Nat) (e : Expr) (s : State) : Res Value × State :=
  match fuel with
  | 0 => (.err (err .internal), s)
  | fuel + 1 =>
    match e with
    | .if_ c y n =>
        -- A pure conditional is one expression cell; a guarded one is a
        -- selector, the selected arm's cells, and a merge cell.
        if !(hasEffect y || hasEffect n) then evalCell budgets (.if_ c y n) env s
        else seqR (evalCell budgets c env s) fun v s =>
          match truthy v with
          | .error er => (.err er, s)
          | .ok b =>
              let idx := if b then 1 else 2
              let arm := if b then y else n
              seqR (evalTail budgets oracle child fuel mod env s!"{site}-branch-arm-{idx}" depth arm s) fun v s =>
                seq (step budgets s) fun s => (.ok v, s)   -- merge
    | .match_ v arms =>
        if !(arms.any (fun (_, a) => hasEffect a)) then evalCell budgets (.match_ v arms) env s
        else seqR (evalCell budgets v env s) fun dv s =>
          match dv with
          | .text label =>
              -- A foreign label fails the selector's declared choice output
              -- before any arm's guard can fire.
              match arms.findIdx? (fun (l, _) => l == label) with
              | none => (.err (err .typeMismatch), s)
              | some idx =>
                  match arms[idx]? with
                  | none => (.err (err .typeMismatch), s)
                  | some (_, arm) =>
                      seqR (evalTail budgets oracle child fuel mod env s!"{site}-branch-arm-{idx + 1}" depth arm s) fun v s =>
                        seq (step budgets s) fun s => (.ok v, s)
          | _ => (.err (err .typeMismatch), s)
    | .decide question context criteria =>
        seqR (evalOperand budgets context env s) fun c s =>
        seq (step budgets s) fun s =>                    -- the decide cell
        seq (charge budgets s) fun s =>
          let obs : Obs := { site := s!"{site}-decide", kind := "decide", text := question, context := c }
          let s := { s with obs := s.obs ++ [obs] }
          match oracle obs with
          | .error er => (.err er, s)
          | .ok raw =>
              match normalizeDecision raw (criteria.map Prod.fst) with
              | .error er => (.err er, s)
              | .ok d => seq (step budgets s) fun s => (.ok d, s)   -- decision-check
    | .generate instruction context =>
        seqR (evalOperand budgets instruction env s) fun i s =>
        seqR (evalOperand budgets context env s) fun c s =>
        seq (step budgets s) fun s =>                    -- the agent cell
          match i with
          | .text t =>
              seq (charge budgets s) fun s =>
                let obs : Obs := { site, kind := "generate", text := t, context := c }
                let s := { s with obs := s.obs ++ [obs] }
                match oracle obs with
                | .error er => (.err er, s)
                | .ok raw =>
                    match raw with
                    | .text _ => (.ok raw, s)
                    | _ => (.err (err .effectUnparseable), s)
          | _ => (.err (err .typeMismatch), s)
    | .call alias args => evalCall budgets oracle child fuel mod env site depth alias args s
    | .each alias over items args maxItems =>
        evalEach budgets oracle child fuel mod env site depth alias over items args maxItems s
    | e => evalCell budgets e env s


/-- Evaluate bindings in source order into the environment. -/
def evalBinds (budgets : Budgets) (oracle : Obs → Except Err Value) (child : Child) (fuel : Nat)
    (m : Module) (env : Env) (depth : Nat) (bs : List (String × Expr)) (i : Nat) (s : State) : Res Env × State :=
  match fuel with
  | 0 => (.err (err .internal), s)
  | fuel + 1 =>
    match bs with
    | [] => (.ok env, s)
    | (name, e) :: rest =>
        match evalTail budgets oracle child fuel m env s!"b{i + 1}-{name}" depth e s with
        | (.ok v, s) => evalBinds budgets oracle child fuel m (env ++ [(name, some v)]) depth rest (i + 1) s
        | (.miss, s) => evalBinds budgets oracle child fuel m (env ++ [(name, none)]) depth rest (i + 1) s
        | (.err e, s) => (.err e, s)


/-- The module body after the input cell: supplied arguments check their
    declared ports (`TYPE_MISMATCH` on a mismatch), then bindings in order,
    then the result against the output port. -/
def runBody (budgets : Budgets) (oracle : Obs → Except Err Value) (child : Child) (fuel : Nat)
    (m : Module) (args : List (String × Option Value)) (scope : String) (depth : Nat) (s : State) : Res Value × State :=
  match fuel with
  | 0 => (.err (err .internal), s)
  | fuel + 1 =>
    let program := canonProgram m.program
    let params := program.parameters
    let checked := params.all fun (pname, ptype) =>
      match args.lookup pname with
      | some (some v) => portAccepts ptype v
      | _ => true
    if !checked then (.err (err .typeMismatch), s)
    else
      let env := params.map fun (pname, _) => (pname, (args.lookup pname).getD none)
      match evalBinds budgets oracle child fuel m env depth program.bindings 0 s with
      | (.miss, s) => (.err (err .internal), s)
      | (.err e, s) => (.err e, s)
      | (.ok env, s) =>
          match evalTail budgets oracle child fuel m env s!"{scope}result" depth program.result s with
          | (.ok v, s) => if portAccepts program.output v then (.ok v, s) else (.err (err .typeMismatch), s)
          | (.miss, s) => (.miss, s)
          | (.err e, s) => (.err e, s)


/-- Module entry: the input cell activates when parameters exist; absent
    arguments leave ports undelivered; present ones check the declared port
    (a mismatched supplied value is `TYPE_MISMATCH`); bindings run in order;
    the result checks the output port. `site` prefixes every cell path this
    module emits — the root run passes the empty prefix. -/
def runModule (budgets : Budgets) (oracle : Obs → Except Err Value) (child : Child) (fuel : Nat)
    (m : Module) (args : List (String × Option Value)) (site : String) (depth : Nat) (s : State) : Res Value × State :=
  match fuel with
  | 0 => (.err (err .internal), s)
  | fuel + 1 =>
    if depth > budgets.maxDepth then (.err (err .depthExceeded), s)
    else
      let scope := if site.isEmpty then "" else s!"{site}/"
      let entered := if m.program.parameters.isEmpty then (.ok (), s) else step budgets s
      seq entered fun s => runBody budgets oracle child fuel m args scope depth s


/-- The child seam, depth-fuelled: `mkChild (fuel+1)` runs a module whose own
    calls invoke `mkChild fuel`. `fuel` must exceed `budgets.maxDepth` so the
    DEPTH_EXCEEDED budget check — never the fuel — is what rejects. -/
def mkChild (budgets : Budgets) (oracle : Obs → Except Err Value) (tick : Nat) (fuel : Nat) : Child :=
  match fuel with
  | 0 => fun _ _ _ _ s => (.err (err .internal), s)
  | fuel + 1 => fun m args site depth s =>
      runModule budgets oracle (mkChild budgets oracle tick fuel) tick m args site depth s

/-- Top-level entry: run a module at depth 1 (production's root `runInto`)
    under its declared budgets. `fuel` bounds depth re-entry; `tick` bounds
    total scheduler ticks — a checked program needs at most
    `maxSteps × (maxDepth + 2)` ticks, but callers pass what fits. -/
def runProgram (fuel tick : Nat) (oracle : Obs → Except Err Value) (m : Module)
    (args : List (String × Option Value)) : Res Value × State :=
  runModule m.program.budgets oracle (mkChild m.program.budgets oracle tick fuel) tick m args "" 1 {}
end Algal.Source
