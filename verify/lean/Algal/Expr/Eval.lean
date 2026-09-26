import Algal.Expr.Model

/-!
# algal.expr.v1 — semantic model: the bounded evaluator

This module defines a fuel-metered interpreter for the `algal.expr.v1`
grammar as a *provably total* Lean function; theorem-facing facts live in
`Algal.Expr.Theorems`. It is a semantic model, not a production-code
refinement.

## Machine shape

Evaluation is structural recursion over the program tree. A `Work` item is a
defunctionalized machine state: `node` evaluates a program node, and the
remaining constructors are the loops that call back into `node` (argument
lists, object fields, `and`/`or` chains, `get` paths, `map`/`filter`/`fold`
iterations). Termination is proved by the lexicographic measure
`(program-subtree weight, pending-data length)`: every recursive program
position is a proper subterm, and every data loop strictly consumes its
pending list.

## Fuel accounting

`machine` does not carry a fuel counter. It records the ordered charge
*trace* (`R.charges`) that production's `Fuel.spend` produces, and `replay`
walks the trace against a budget — the first charge whose cumulative total
exceeds the budget is the reported `EXPR_FUEL` failure, with `cost`/`left`
exactly as production records them. This factors fuel underflow, monotonicity
and exact accounting into ordinary list facts; the interpreter itself needs
no fuel to terminate (the grammar is finite), fuel only bounds admitted work.

Modelled charge sites, in production order: per-node base costs (1 for
scalars/object literals; `baseCost` for op calls), `eq`/`neq` node counts,
`concat`/`flat` element totals, `map`/`filter`/`fold`/`contains`/`unique`
per-item or per-comparison units, `sconcat`/`join`/casing/`trim`/`split`/
`scontains`/`starts`/`ends` byte counts, and `merge` key counts. Bounds
(`EXPR_BOUNDS`) are checked at the same points production checks them —
before the charge, before the retained allocation.

## Deliberate exclusions

* `mod` — needs exact truncated-remainder (`fmod`), which the Lean `Float`
  surface does not provide and `x - trunc(x/y)·y` does not implement
  bit-exactly.
* `sort`, `toText` — both need the canonical byte rendering of arbitrary
  numbers, which is an open Phase-09 item.
* The static `check` pass (op-table/arity/binder-shape/literal-`get` scope
  resolution) — the model reports the same codes dynamically; see `SCOPE.md`.
-/

set_option autoImplicit false
namespace Algal.Expr

open Algal.Core
open Json

/-! ## The evaluation monad: result × ordered charge trace -/

/-- `R α` = `Except ExprErr α` plus the ordered list of charges spent so far.
    Errors carry the trace consumed before the failure (production reports
    `fuel` as the amount burned, which is the trace sum). -/
structure R (α : Type) where
  result : Except ExprErr α
  charges : List Nat := []

instance instMonadR : Monad R where
  pure a := ⟨.ok a, []⟩
  map f o := match o.result with
    | .ok v => ⟨.ok (f v), o.charges⟩
    | .error e => ⟨.error e, o.charges⟩
  seq fs xs := match fs.result with
    | .error e => ⟨.error e, fs.charges⟩
    | .ok f =>
      let r := xs ()
      match r.result with
      | .error e => ⟨.error e, fs.charges ++ r.charges⟩
      | .ok v => ⟨.ok (f v), fs.charges ++ r.charges⟩
  bind o f := match o.result with
    | .error e => ⟨.error e, o.charges⟩
    | .ok v => let r := f v; ⟨r.result, o.charges ++ r.charges⟩

/-- `bind` unfolds for rewriting (equation form used by simp in
    `Algal.Expr.Theorems`). -/
theorem R_bind_eq {α β : Type} (o : R α) (f : α → R β) :
    (o >>= f) = match o.result with
      | .error e => ⟨.error e, o.charges⟩
      | .ok v => ⟨(f v).result, o.charges ++ (f v).charges⟩ := rfl

theorem R_pure_eq {α : Type} (a : α) : (pure a : R α) = ⟨.ok a, []⟩ := rfl

/-- Record a charge (the log entry production's `Fuel.spend(cost)` makes). -/
def charge (c : Nat) : R Unit := ⟨.ok (), [c]⟩

/-- Fail with a typed error; `charges` stays whatever was spent before. -/
def fail {α : Type} (e : ExprErr) : R α := ⟨.error e, []⟩

/-- Fail keeping an accumulated trace. -/
def failWith {α : Type} (e : ExprErr) (cs : List Nat) : R α := ⟨.error e, cs⟩

/-- Succeed with a precomputed trace. -/
def charged {α : Type} (v : α) (cs : List Nat) : R α := ⟨.ok v, cs⟩

/-- Lift a pure `Except` (bounds checks, pure folders) into `R`. -/
def liftE {α : Type} (e : Except ExprErr α) : R α := ⟨e, []⟩

/-- The post-check production applies to every `eval` result
    (`value_bytes(&result, 0)`): bounds on the produced value itself. -/
def postCheck (o : R Value) : R Value := do
  let v ← o
  match checkValue v with
  | .ok _ => pure v
  | .error e => fail e

/-! ## Extraction helpers (typed-error paths, no charges) -/

def asNum (op : String) (arg : Nat) : Value → R Float
  | .number n => pure (numFloat n)
  | v => fail (errType op arg "number" (kindOf v))

def asBool (op : String) (arg : Nat) : Value → R Bool
  | .bool b => pure b
  | v => fail (errType op arg "bool" (kindOf v))

def asList (op : String) (arg : Nat) : Value → R Items
  | .array items => pure items
  | v => fail (errType op arg "list" (kindOf v))

def asMap (op : String) (arg : Nat) : Value → R Fields
  | .object fs => pure fs
  | v => fail (errType op arg "map" (kindOf v))

def asStr (op : String) (arg : Nat) : Value → R String
  | .text s => pure s
  | v => fail (errType op arg "string" (kindOf v))

/-- Nonneg-integral index admission (`n >= 0.0 && n.fract() == 0.0` on the
    number, `EXPR_TYPE` otherwise — including non-number input). -/
def asIndex (op : String) (arg : Nat) (v : Value) : R Float :=
  match v with
  | .number n =>
    let f := numFloat n
    if 0 ≤ f ∧ Float.beq (f - Float.floor f) 0 then pure f
    else fail (errType op arg "nonneg integer" (kindOf v))
  | _ => fail (errType op arg "nonneg integer" (kindOf v))

/-- Emit an admitted binary64 result or `EXPR_NUM` (the `!r.is_finite()`
    path). -/
def emitNum (op : String) (f : Float) : R Value :=
  match admitNum f with
  | some n => pure (.number n)
  | none => fail (errNum op)

/-- A literal binder name: `arr.get(i).and_then(Value::as_str).unwrap_or("")`
    — the name arg is NOT evaluated (the static pass owns identifier shape). -/
def binderName : Value → String
  | .text s => s
  | _ => ""

/-- `"{lo}..{hi}"` / `"{lo}.."` arity text, mirroring production. -/
def arityWant (lo : Nat) : Option Nat → String
  | none => s!"{lo}.."
  | some hi => s!"{lo}..{hi}"

def checkArity (op : String) (args : Items) (lo : Nat) (hi : Option Nat) : R Unit :=
  let argc := itemsLength args
  if lo ≤ argc ∧ argc ≤ hi.getD argc then pure ()
  else fail (errArity op (arityWant lo hi) argc)

/-- `base_cost`: per-node charge before dispatch. -/
def baseCost (op : String) (argc : Nat) : Nat :=
  match op with
  | "and" | "or" | "not" | "if" | "let" | "quote" | "list" => 1
  | "isText" | "isNum" | "isBool" | "isList" | "isMap" | "isNull" => 1
  | "get" => 2 + argc
  | _ => 2

/-! ## Pure accumulating passes (charge traces are data) -/

/-- `add`/`mul`/`min`/`max` tail: fold `f` over already-evaluated items with
    per-item `EXPR_TYPE` at the argument index. -/
def numFold (op : String) (f : Float → Float → Float) (acc : Float) (items : Items) (i : Nat) :
    Except ExprErr Float :=
  match items with
  | .nil => .ok acc
  | .cons v rest =>
    match v with
    | .number n => numFold op f (f acc (numFloat n)) rest (i + 1)
    | _ => .error (errType op i "number" (kindOf v))

/-- `min`/`max` seed the fold from the first argument (`args[0]`), then fold
    the rest — matching the per-arg type-error indices of production. -/
def minMaxFold (op : String) (f : Float → Float → Float) (items : Items) : Except ExprErr Float :=
  match items with
  | .nil => .error (err .type)
  | .cons v rest =>
    match v with
    | .number n => numFold op f (numFloat n) rest 1
    | _ => .error (errType op 0 "number" (kindOf v))

/-- `contains`: one charge per element inspected until a hit. -/
def containsLoop (v : Value) : Items → Bool × List Nat
  | .nil => (false, [])
  | .cons x rest =>
    if eqv x v then (true, [1])
    else let (r, l) := containsLoop v rest; (r, 1 :: l)

/-- `unique` inner loop: one charge per comparison against retained items,
    inspected in first-seen order (`for seen in &out`), stopping at the hit —
    the hit itself is charged. -/
def uniqueSeen (x : Value) : Items → Bool × List Nat
  | .nil => (false, [])
  | .cons s rest =>
    if eqv s x then (true, [1])
    else let (d, l) := uniqueSeen x rest; (d, 1 :: l)

/-- `unique` outer loop: `out` keeps retained items in first-seen order so the
    comparison order — and therefore the charge count — matches production
    exactly. -/
def uniqueLoop : Items → Items → Items × List Nat
  | .nil, out => (out, [])
  | .cons x rest, out =>
    let (dup, l₁) := uniqueSeen x out
    if dup then
      let (r, l₂) := uniqueLoop rest out
      (r, l₁ ++ l₂)
    else
      let (r, l₂) := uniqueLoop rest (itemsAppend out (.cons x .nil))
      (r, l₁ ++ l₂)

/-- `flat`/`concat` first pass: every item must be a list; sums the element
    count. Errors at the argument index, before any charge. -/
def listCount (op : String) (items : Items) (i : Nat) (total : Nat) : Except ExprErr Nat :=
  match items with
  | .nil => .ok total
  | .cons v rest =>
    match v with
    | .array xs => listCount op rest (i + 1) (total + itemsLength xs)
    | _ => .error (errType op i "list" (kindOf v))

/-- Second pass for `flat`/`concat`: append each inner list in order. -/
def listsOnto (acc : Items) : Items → Items
  | .nil => acc
  | .cons (.array xs) rest => listsOnto (itemsAppend acc xs) rest
  | .cons _ rest => listsOnto acc rest

/-- `sconcat`/`join` element pass: all items must be strings. -/
def strFold (op : String) (items : Items) (i : Nat) : Except ExprErr (List String) :=
  match items with
  | .nil => .ok []
  | .cons v rest =>
    match v with
    | .text s => (strFold op rest (i + 1)).map (s :: ·)
    | _ => .error (errType op i "string" (kindOf v))

/-- `String::join`: `sep` between adjacent parts. -/
def joinStrs (sep : String) : List String → String
  | [] => ""
  | s :: rest => rest.foldl (fun acc p => acc ++ sep ++ p) s

/-- `merge` loop: per-argument key-count charge, rightmost-wins extension, and
    the unique-key bound after each extension. `acc` is the merged field list
    in write order (earlier args first). On a bounds error the just-spent
    charge is already in the trace, matching production order. -/
def mergeLoop (op : String) (args : Items) (acc : Fields) (i : Nat) :
    Except ExprErr Fields × List Nat :=
  match args with
  | .nil => (.ok acc, [])
  | .cons v rest =>
    match v with
    | .object fs =>
      let merged := Normalize.fieldsOfList
        (Normalize.fieldsToList acc ++ Normalize.fieldsToList fs)
      let c := fieldsLength fs
      if maxObjectKeys < (fieldNames merged).eraseDups.length then
        (.error (errBounds "object-keys" maxObjectKeys), [c])
      else
        let (r, l) := mergeLoop op rest merged (i + 1)
        (r, c :: l)
    | _ => (.error (errType op i "map" (kindOf v)), [])

/-! ## The machine -/

/-- Defunctionalized machine states. `node` evaluates a program node; the
    loop states evaluate pending program subtrees (`args`, `objFields`,
    `bools`, `getPath` hold `Items`/`Fields` subtrees of the node) or iterate
    evaluated data under a fixed body (`mapFilt`, `fold`). -/
inductive Work where
  | node (v : Value)
  | args (pending : Items) (acc : Items) (bytes : Nat)
  | objFields (pending : Fields) (acc : Fields) (bytes : Nat)
  | bools (want : Bool) (op : String) (pending : Items) (idx : Nat)
  | getPath (op : String) (cur : Value) (pending : Items) (step : Nat)
  | mapFilt (isMap : Bool) (op : String) (name : String) (body : Value)
      (pending : Items) (acc : Items) (bytes : Nat) (idx : Nat)
  | fold (accName itemName : String) (body : Value) (acc : Value)
      (pending : Items)
  deriving DecidableEq

mutual
  /-- Termination measure, program side: 1 per node. Every recursive program
      position is a proper subterm. -/
  def valueMeasure : Value → Nat
    | .null | .bool _ | .number _ | .text _ => 1
    | .array xs => 1 + itemsMeasure xs
    | .object fs => 1 + fieldsMeasure fs
  def itemsMeasure : Items → Nat
    | .nil => 1
    | .cons v rest => 1 + valueMeasure v + itemsMeasure rest
  def fieldsMeasure : Fields → Nat
    | .nil => 1
    | .cons _ v rest => 1 + valueMeasure v + fieldsMeasure rest
end

/-- `(program-subtree weight, pending-data length)` lexicographic measure.
    `args`/`bools`/`getPath` pending lists are program subtrees; `mapFilt`/
    `fold` pendings are evaluated data, so only their length counts. -/
def workMeasure : Work → Nat × Nat
  | .node v => (valueMeasure v, 0)
  | .args p _ _ => (itemsMeasure p, 0)
  | .objFields p _ _ => (fieldsMeasure p, 0)
  | .bools _ _ p _ => (itemsMeasure p, 0)
  | .getPath _ _ p _ => (itemsMeasure p, 0)
  | .mapFilt _ _ _ body p _ _ _ => (valueMeasure body, itemsLength p)
  | .fold _ _ body _ p => (valueMeasure body, itemsLength p)

theorem fieldsMeasure_insertFieldByte (key : String) (v : Value) :
    ∀ fs : Fields,
      fieldsMeasure (insertFieldByte key v fs) = valueMeasure v + fieldsMeasure fs + 1
  | .nil => by simp [insertFieldByte, fieldsMeasure]; omega
  | .cons k2 v2 rest => by
      simp only [insertFieldByte]
      split
      · simp only [fieldsMeasure]; rw [fieldsMeasure_insertFieldByte key v rest]; omega
      · simp only [fieldsMeasure]; omega

theorem fieldsMeasure_sortFieldsByte :
    ∀ fs : Fields, fieldsMeasure (sortFieldsByte fs) = fieldsMeasure fs
  | .nil => rfl
  | .cons k v rest => by
      simp only [sortFieldsByte, fieldsMeasure_insertFieldByte, fieldsMeasure,
        fieldsMeasure_sortFieldsByte rest]
      omega

/-- The bounded evaluator: `machine env σ w` returns the value-or-typed-error
    result plus the ordered charge trace. Deterministic and total — proofs in
    `Algal.Expr.Theorems`. -/
def machine (env : Env) (scope : Scope) (w : Work) : R Value :=
  match w with
  | .node (.object fs) =>
    postCheck (do
      _ ← charge 1
      if maxObjectKeys < fieldsLength fs then
        fail (errBounds "object-keys" maxObjectKeys)
      else
        machine env scope (.objFields (sortFieldsByte fs) .nil 2))
  | .node (.array (.cons (.text op) rest)) =>
    postCheck (do
      _ ← charge (baseCost op (itemsLength rest))
      match op with
      | "add" | "mul" => do
        _ ← checkArity op rest 1 none
        let r ← machine env scope (.args rest .nil 2)
        match r with
        | .array items =>
          let z : Float := if op = "add" then 0 else 1
          let f : Float → Float → Float := if op = "add" then (· + ·) else (· * ·)
          let acc ← liftE (numFold op f z items 0)
          emitNum op acc
        | _ => fail (err .type)
      | "sub" | "div" =>
        match rest with
        | .cons a (.cons b .nil) => do
          let x ← machine env scope (.node a)
          let xn ← asNum op 0 x
          let y ← machine env scope (.node b)
          let yn ← asNum op 1 y
          if op = "div" ∧ Float.beq yn 0 then
            fail (errWith .divZero [("op", .text op)])
          else emitNum op (if op = "div" then xn / yn else xn - yn)
        | _ => fail (errArity op "2..2" (itemsLength rest))
      | "neg" =>
        match rest with
        | .cons a .nil => do
          let v ← machine env scope (.node a)
          let x ← asNum op 0 v
          emitNum op (-x)
        | _ => fail (errArity op "1..1" (itemsLength rest))
      | "min" | "max" => do
        _ ← checkArity op rest 1 none
        let r ← machine env scope (.args rest .nil 2)
        match r with
        | .array items =>
          let f : Float → Float → Float := if op = "min" then fmin else fmax
          let best ← liftE (minMaxFold op f items)
          emitNum op best
        | _ => fail (err .type)
      | "abs" | "floor" | "ceil" | "round" =>
        match rest with
        | .cons a .nil => do
          let v ← machine env scope (.node a)
          let n ← asNum op 0 v
          emitNum op (match op with
            | "abs" => Float.abs n
            | "floor" => Float.floor n
            | "ceil" => Float.ceil n
            | _ => jsRound n)
        | _ => fail (errArity op "1..1" (itemsLength rest))
      | "clamp" =>
        match rest with
        | .cons a (.cons b (.cons c .nil)) => do
          let x ← machine env scope (.node a)
          let xn ← asNum op 0 x
          let y ← machine env scope (.node b)
          let yn ← asNum op 1 y
          let z ← machine env scope (.node c)
          let zn ← asNum op 2 z
          if zn < yn then
            fail (errArg op "clamp lo must be <= hi")
          else emitNum op (fmin (fmax xn yn) zn)
        | _ => fail (errArity op "3..3" (itemsLength rest))
      | "lt" | "lte" | "gt" | "gte" => do
        _ ← checkArity op rest 2 (some 2)
        let r ← machine env scope (.args rest .nil 2)
        match r with
        | .array (.cons a (.cons b .nil)) =>
          match a, b with
          | .number x, .number y =>
            let xf := numFloat x
            let yf := numFloat y
            pure (.bool (match op with
              | "lt" => decide (xf < yf)
              | "lte" => decide (xf ≤ yf)
              | "gt" => decide (yf < xf)
              | _ => decide (yf ≤ xf)))
          | .text x, .text y =>
            pure (.bool (match utf16compare x y with
              | .lt => op = "lt" ∨ op = "lte"
              | .eq => op = "lte" ∨ op = "gte"
              | .gt => op = "gt" ∨ op = "gte"))
          | _, _ =>
            fail (errType op 0 "two numbers or two strings" s!"{kindOf a},{kindOf b}")
        | _ => fail (err .type)
      | "eq" | "neq" => do
        _ ← checkArity op rest 2 (some 2)
        let r ← machine env scope (.args rest .nil 2)
        match r with
        | .array (.cons a (.cons b .nil)) => do
          _ ← charge (countNodes a + countNodes b)
          pure (.bool (if op = "eq" then eqv a b else !eqv a b))
        | _ => fail (err .type)
      | "and" | "or" =>
        if itemsLength rest = 0 then fail (errArity op "1.." 0)
        else machine env scope (.bools (decide (op = "and")) op rest 0)
      | "not" =>
        match rest with
        | .cons a .nil => do
          let v ← machine env scope (.node a)
          let b ← asBool op 0 v
          pure (.bool (!b))
        | _ => fail (errArity op "1..1" (itemsLength rest))
      | "if" =>
        match rest with
        | .cons c (.cons t (.cons e .nil)) => do
          let cv ← machine env scope (.node c)
          let b ← asBool op 0 cv
          if b then machine env scope (.node t) else machine env scope (.node e)
        | _ => fail (errArity op "3..3" (itemsLength rest))
      | "let" =>
        match rest with
        | .cons nE (.cons vE (.cons bE .nil)) => do
          let name := binderName nE
          let v ← machine env scope (.node vE)
          machine env ((name, v) :: scope) (.node bE)
        | _ => fail (errArity op "3..3" (itemsLength rest))
      | "get" =>
        match rest with
        | .cons headE pathRest => do
          let first ← machine env scope (.node headE)
          match first with
          | .text name =>
            match lookupName env scope name with
            | none => fail (errPathWhat op s!"unbound name \"{name}\"")
            | some cur => machine env scope (.getPath op cur pathRest 1)
          | _ => fail (errType op 0 "name string" (kindOf first))
        | .nil => fail (errArity op "1.." 0)
      | "list" => do
        let r ← machine env scope (.args rest .nil 2)
        match r with
        | .array items =>
          if maxListLen < itemsLength items then
            fail (errBounds "list-len" maxListLen)
          else pure r
        | _ => fail (err .type)
      | "len" =>
        match rest with
        | .cons a .nil => do
          let v ← machine env scope (.node a)
          let items ← asList op 0 v
          pure (.number (numberOfNat (itemsLength items)))
        | _ => fail (errArity op "1..1" (itemsLength rest))
      | "nth" =>
        match rest with
        | .cons a (.cons iE .nil) => do
          let v ← machine env scope (.node a)
          let items ← asList op 0 v
          let iv ← machine env scope (.node iE)
          let index ← asIndex op 1 iv
          if Float.ofNat (itemsLength items) ≤ index then
            fail (errNthRange op index (itemsLength items))
          else match itemsGetF items index with
            | none => fail (errNthRange op index (itemsLength items))
            | some got => pure got
        | _ => fail (errArity op "2..2" (itemsLength rest))
      | "concat" => do
        _ ← checkArity op rest 1 none
        let r ← machine env scope (.args rest .nil 2)
        match r with
        | .array items => do
          let total ← liftE (listCount op items 0 0)
          _ ← charge total
          if maxListLen < total then fail (errBounds "list-len" maxListLen)
          else pure (.array (listsOnto .nil items))
        | _ => fail (err .type)
      | "map" | "filter" =>
        match rest with
        | .cons xsE (.cons nE (.cons body .nil)) => do
          let v ← machine env scope (.node xsE)
          let items ← asList op 0 v
          let name := binderName nE
          machine env scope (.mapFilt (op = "map") op name body items .nil 2 0)
        | _ => fail (errArity op "3..3" (itemsLength rest))
      | "fold" =>
        match rest with
        | .cons xsE (.cons initE (.cons accE (.cons itemE (.cons body .nil)))) => do
          let v ← machine env scope (.node xsE)
          let items ← asList op 0 v
          let init ← machine env scope (.node initE)
          machine env scope
            (.fold (binderName accE) (binderName itemE) body init items)
        | _ => fail (errArity op "5..5" (itemsLength rest))
      | "contains" =>
        match rest with
        | .cons a (.cons nE .nil) => do
          let v ← machine env scope (.node a)
          let items ← asList op 0 v
          let needle ← machine env scope (.node nE)
          let (found, log) := containsLoop needle items
          charged (.bool found) log
        | _ => fail (errArity op "2..2" (itemsLength rest))
      | "reverse" =>
        match rest with
        | .cons a .nil => do
          let v ← machine env scope (.node a)
          let items ← asList op 0 v
          pure (.array (itemsReverse items))
        | _ => fail (errArity op "1..1" (itemsLength rest))
      | "take" | "drop" =>
        match rest with
        | .cons a (.cons nE .nil) => do
          let v ← machine env scope (.node a)
          let items ← asList op 0 v
          let nv ← machine env scope (.node nE)
          let n ← asIndex op 1 nv
          pure (.array (if op = "take" then itemsTakeF items n else itemsDropF items n))
        | _ => fail (errArity op "2..2" (itemsLength rest))
      | "flat" =>
        match rest with
        | .cons a .nil => do
          let v ← machine env scope (.node a)
          let items ← asList op 0 v
          let total ← liftE (listCount op items 0 0)
          _ ← charge total
          if maxListLen < total then fail (errBounds "list-len" maxListLen)
          else pure (.array (listsOnto .nil items))
        | _ => fail (errArity op "1..1" (itemsLength rest))
      | "unique" =>
        match rest with
        | .cons a .nil => do
          let v ← machine env scope (.node a)
          let items ← asList op 0 v
          let (out, log) := uniqueLoop items .nil
          charged (.array out) log
        | _ => fail (errArity op "1..1" (itemsLength rest))
      | "slen" =>
        match rest with
        | .cons a .nil => do
          let v ← machine env scope (.node a)
          let s ← asStr op 0 v
          pure (.number (numberOfNat (Text.utf16 s).length))
        | _ => fail (errArity op "1..1" (itemsLength rest))
      | "sconcat" => do
        _ ← checkArity op rest 1 none
        let r ← machine env scope (.args rest .nil 2)
        match r with
        | .array items => do
          let parts ← liftE (strFold op items 0)
          let bytes := parts.foldl (fun acc s => acc + s.utf8ByteSize) 0
          if maxStringBytes < bytes then fail (errBounds "string-bytes" maxStringBytes)
          else do
            _ ← charge bytes
            pure (.text (parts.foldl (· ++ ·) ""))
        | _ => fail (err .type)
      | "upper" | "lower" | "trim" =>
        match rest with
        | .cons a .nil => do
          let v ← machine env scope (.node a)
          let s ← asStr op 0 v
          _ ← charge s.utf8ByteSize
          let out := match op with
            | "upper" => upperStr s
            | "lower" => lowerStr s
            | _ => trimStr s
          if maxStringBytes < out.utf8ByteSize then
            fail (errBounds "string-bytes" maxStringBytes)
          else pure (.text out)
        | _ => fail (errArity op "1..1" (itemsLength rest))
      | "split" =>
        match rest with
        | .cons a (.cons sepE .nil) => do
          let sv ← machine env scope (.node a)
          let s ← asStr op 0 sv
          let pv ← machine env scope (.node sepE)
          let sep ← asStr op 1 pv
          if hsep : sep.toList = [] then
            fail (errArg op "separator must be non-empty")
          else do
            _ ← charge s.utf8ByteSize
            let parts := splitChars s.toList sep.toList hsep
            if maxListLen < parts.length then
              fail (errBounds "list-len" maxListLen)
            else do
              _ ← charge parts.length
              pure (.array (itemsFromList (parts.map (fun p => .text (String.ofList p)))))
        | _ => fail (errArity op "2..2" (itemsLength rest))
      | "join" =>
        match rest with
        | .cons a (.cons sepE .nil) => do
          let sv ← machine env scope (.node a)
          let items ← asList op 0 sv
          let pv ← machine env scope (.node sepE)
          let sep ← asStr op 1 pv
          let parts ← liftE (strFold op items 0)
          let bytes := sep.utf8ByteSize * (parts.length - 1) +
            parts.foldl (fun acc s => acc + s.utf8ByteSize) 0
          if maxStringBytes < bytes then fail (errBounds "string-bytes" maxStringBytes)
          else do
            _ ← charge bytes
            pure (.text (joinStrs sep parts))
        | _ => fail (errArity op "2..2" (itemsLength rest))
      | "scontains" =>
        match rest with
        | .cons a (.cons subE .nil) => do
          let sv ← machine env scope (.node a)
          let s ← asStr op 0 sv
          let bv ← machine env scope (.node subE)
          let sub ← asStr op 1 bv
          _ ← charge s.utf8ByteSize
          pure (.bool (charInfix s.toList sub.toList))
        | _ => fail (errArity op "2..2" (itemsLength rest))
      | "starts" | "ends" =>
        match rest with
        | .cons a (.cons pE .nil) => do
          let sv ← machine env scope (.node a)
          let s ← asStr op 0 sv
          let bv ← machine env scope (.node pE)
          let p ← asStr op 1 bv
          _ ← charge s.utf8ByteSize
          pure (.bool (if op = "starts" then p.toList.isPrefixOf s.toList
            else p.toList.isSuffixOf s.toList))
        | _ => fail (errArity op "2..2" (itemsLength rest))
      | "has" =>
        match rest with
        | .cons a (.cons kE .nil) => do
          let ov ← machine env scope (.node a)
          let fs ← asMap op 0 ov
          let kv ← machine env scope (.node kE)
          let k ← asStr op 1 kv
          pure (.bool (fhas fs k))
        | _ => fail (errArity op "2..2" (itemsLength rest))
      | "keys" | "values" =>
        match rest with
        | .cons a .nil => do
          let ov ← machine env scope (.node a)
          let fs ← asMap op 0 ov
          let names := Text.canonicalKeys (fieldNames fs)
          if op = "keys" then
            pure (.array (itemsFromList (names.map .text)))
          else
            pure (.array (itemsFromList (names.map (fun k => (fget fs k).getD .null))))
        | _ => fail (errArity op "1..1" (itemsLength rest))
      | "merge" => do
        _ ← checkArity op rest 1 none
        let r ← machine env scope (.args rest .nil 2)
        match r with
        | .array items =>
          let (res, log) := mergeLoop op items .nil 0
          match res with
          | .ok fs => charged (.object (Normalize.canonicalFields fs)) log
          | .error e => failWith e log
        | _ => fail (err .type)
      | "isText" | "isNum" | "isBool" | "isList" | "isMap" | "isNull" =>
        match rest with
        | .cons a .nil => do
          let v ← machine env scope (.node a)
          pure (.bool (match v with
            | .text _ => decide (op = "isText")
            | .number _ => decide (op = "isNum")
            | .bool _ => decide (op = "isBool")
            | .array _ => decide (op = "isList")
            | .object _ => decide (op = "isMap")
            | .null => decide (op = "isNull")))
        | _ => fail (errArity op "1..1" (itemsLength rest))
      | "sort" | "toText" | "mod" => fail (errUnmodeled op)
      | _ => fail (errOp op))
  | .node (.array .nil) =>
    fail (errWith .parse [("what", .text "op head must be a string")])
  | .node (.array (.cons head _)) =>
    fail (errWith .parse [("what", .text "op head must be a string"),
      ("got", .text (kindOf head))])
  | .node v =>
    postCheck (do _ ← charge 1; pure v)
  | .args .nil acc _ => pure (.array (itemsReverse acc))
  | .args (.cons a rest) acc bytes => do
    let v ← machine env scope (.node a)
    let vb ← liftE (valueBytes v 0)
    let nb ← liftE (addValueBytes bytes (vb + (match acc with | .nil => 0 | _ => 1)))
    machine env scope (.args rest (.cons v acc) nb)
  | .objFields .nil acc _ => pure (.object (canonicalizeAcc acc))
  | .objFields (.cons k expr rest) acc bytes => do
    let v ← machine env scope (.node expr)
    let sepCost : Nat := match acc with | .nil => 0 | _ => 1
    let b1 ← liftE (addValueBytes bytes (stringBytes k + 1 + sepCost))
    let vb ← liftE (valueBytes v 1)
    let b2 ← liftE (addValueBytes b1 vb)
    machine env scope (.objFields rest (.cons k v acc) b2)
  | .bools want _ .nil _ => pure (.bool want)
  | .bools want op (.cons a rest) idx => do
    let v ← machine env scope (.node a)
    match v with
    | .bool b =>
      if b = want then machine env scope (.bools want op rest (idx + 1))
      else pure (.bool b)
    | _ => fail (errType op idx "bool" (kindOf v))
  | .getPath _ cur .nil _ => pure cur
  | .getPath op cur (.cons stepE rest) step => do
    let k ← machine env scope (.node stepE)
    match k with
    | .text key =>
      match cur with
      | .object fs =>
        match fget fs key with
        | none => pure .null
        | some v' => machine env scope (.getPath op v' rest (step + 1))
      | _ => pure .null
    | .number n =>
      let f := numFloat n
      if f < 0 ∨ ¬Float.beq (f - Float.floor f) 0 then
        fail (errType op step "nonneg integer index" "number")
      else match cur with
        | .array items =>
          match itemsGetF items f with
          | none => pure .null
          | some v' => machine env scope (.getPath op v' rest (step + 1))
        | _ => pure .null
    | _ => fail (errType op step "string key or nonneg integer index" (kindOf k))
  | .mapFilt _ _ _ _ .nil acc _ _ => pure (.array (itemsReverse acc))
  | .mapFilt isMap op name body (.cons x xs) acc bytes idx => do
    _ ← charge 1
    let v ← machine env ((name, x) :: scope) (.node body)
    if isMap then do
      let vb ← liftE (valueBytes v 1)
      let nb ← liftE (addValueBytes bytes (vb + (match acc with | .nil => 0 | _ => 1)))
      if maxListLen < itemsLength (.cons v acc) then
        fail (errBounds "list-len" maxListLen)
      else machine env scope (.mapFilt isMap op name body xs (.cons v acc) nb (idx + 1))
    else match v with
      | .bool true => do
        let vb ← liftE (valueBytes x 1)
        let nb ← liftE (addValueBytes bytes (vb + (match acc with | .nil => 0 | _ => 1)))
        if maxListLen < itemsLength (.cons x acc) then
          fail (errBounds "list-len" maxListLen)
        else machine env scope (.mapFilt isMap op name body xs (.cons x acc) nb (idx + 1))
      | .bool false => machine env scope (.mapFilt isMap op name body xs acc bytes (idx + 1))
      | _ => fail (errType op idx "bool" (kindOf v))
  | .fold _ _ _ acc .nil => pure acc
  | .fold accName itemName body acc (.cons x xs) => do
    _ ← charge 1
    let acc' ← machine env ((itemName, x) :: (accName, acc) :: scope) (.node body)
    machine env scope (.fold accName itemName body acc' xs)
termination_by workMeasure w
decreasing_by
  all_goals
    (simp only [workMeasure]
     first
      | (apply Prod.Lex.left
         simp only [fieldsMeasure_sortFieldsByte, valueMeasure,
           itemsMeasure, fieldsMeasure, itemsLength]
         omega)
      | (apply Prod.Lex.right
         simp only [fieldsMeasure_sortFieldsByte, valueMeasure,
           itemsMeasure, fieldsMeasure, itemsLength]
         omega))

/-- Evaluate a whole program under the caller environment and an empty
    lexical scope. Returns the value-or-typed-error result and the ordered
    charge trace. -/
def eval (env : Env) (program : Value) : R Value :=
  machine env [] (.node program)

/-! ## Fuel replay -/

/-- A charge that could not be afforded: `cost` was demanded with `left`
    remaining — the first crossing of the budget. -/
structure FuelFailure where
  cost : Nat
  left : Nat
  deriving DecidableEq

/-- Walk the charge trace against `left` remaining fuel. Returns `Ok` the
    remainder after all charges, or the first crossing as a `FuelFailure`. -/
def replay : Nat → List Nat → Except FuelFailure Nat
  | left, [] => .ok left
  | left, c :: rest =>
    if c ≤ left then replay (left - c) rest else .error ⟨c, left⟩

/-- The fuel error production constructs on a spend failure. -/
def fuelErr (f : FuelFailure) : ExprErr :=
  errWith .fuel [("cost", numVal f.cost), ("left", numVal f.left)]

/-- `run` for `eval`: replay the trace against `budget`; on success apply the
    `run`-level output checks (`value_bytes` post-checks were already applied
    per node inside `machine`). -/
def evalFuelled (env : Env) (program : Value) (budget : Nat) :
    Except (ExprErr × Nat) (Value × Nat) :=
  if maxFuel < budget then
    .error (errBounds "fuel budget must be an integer in [0, 1000000]" maxFuel, 0)
  else
    let o := eval env program
    let used (left : Nat) : Nat := budget - left
    match o.result, replay budget o.charges with
    | _, .error f => .error (fuelErr f, used f.left)
    | .error e, .ok left => .error (e, used left)
    | .ok v, .ok left =>
      let used_ := used left
      if maxOutputBytes < valueByteCount v then
        .error (errBounds "output-bytes" maxOutputBytes, used_)
      else if maxValueDepth < valueDepth v then
        .error (errBounds "value-depth" maxValueDepth, used_)
      else .ok (v, used_)

/-- Per-entry bounded check of env values (`value_bytes(v, 1)` per entry), in
    entry order — the first failure wins, matching the fold over `env` in
    production's `run`. -/
def checkEnvValues : Env → Except ExprErr Unit
  | [] => .ok ()
  | (_, v) :: rest => do
    let _ ← valueBytes v 1
    checkEnvValues rest

/-- Full program-envelope entry, mirroring production `run`: env checks,
    program bound checks, then fuelled evaluation. The error value carries
    the fuel actually burned (production's `fuel` field). The static `check`
    pass is not modelled — see the module doc. -/
def run (program : Value) (env : Env) (budget : Nat) :
    Except (ExprErr × Nat) (Value × Nat) :=
  if maxObjectKeys < env.length then
    .error (errBounds "object-keys" maxObjectKeys, 0)
  else if maxEnvBytes < envBytes env then
    .error (errBounds "env-bytes" maxEnvBytes, 0)
  else if maxValueDepth < envDepth env then
    .error (errBounds "value-depth" maxValueDepth, 0)
  else match checkEnvValues env with
    | .error e => .error (e, 0)
    | .ok _ =>
      if maxProgramBytes < valueByteCount program then
        .error (errBounds "program-bytes" maxProgramBytes, 0)
      else if maxProgramNodes < countNodes program then
        .error (errBounds "program-nodes" maxProgramNodes, 0)
      else if maxProgramDepth < valueDepth program + 1 then
        .error (errBounds "program-depth" maxProgramDepth, 0)
      else evalFuelled env program budget

end Algal.Expr
