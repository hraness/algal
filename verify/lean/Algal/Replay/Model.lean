import Algal.Core.Json
import Algal.Core.OwnMap

/-!
# Replay, verification and resume — semantic model

Phase 14 of `docs/formal-verification-plan.md`: an independent model of what
`verifyReceipt` and `resumeRun` (src/verify.ts) compute over the deterministic
scheduler (`runOrganism`, src/run.ts). This is a *model*: no claim that the
production implementation refines it. The statement-level correspondences are
documented per definition.

## Deliberate abstractions

* **Digests are the canonical objects themselves.** `Request` is its own
  request digest, a manifest's identity is its `manifest` string, and a
  receipt's `digest` field is its whole `Fields` record. Production binds
  `sha256(canonical(·))`; injectivity of that binding is the hash assumption
  (A-HASH in `verify/properties.json`), not a theorem of this model. What is
  modelled exactly is *self-consistency*: `consistent r` says the digest
  field re-derives the contents, which is precisely what rehashing a mutated
  receipt restores.
* **Programs abstract the manifest + admitted fn/tool registry.** A `Program`
  maps the reply history to the next `Directive` (issue an effect request,
  read a slot, write a slot, or finish). Determinism of the scheduler —
  same history, same directive — is the soundness side condition the
  verifier theorem is stated relative to: in the model it is definitional.
* **The oracle is the recorded effect tape.** `serve` mirrors
  `replayExecutor` (src/effects.ts:219-269): per-request-digest FIFO, first
  recorded occurrence first; a miss is `EFFECT_UNBOUND` under `verify` and a
  live-oracle call under `resume`. Tool requests miss to `EFFECT_UNBOUND`
  whenever the tool-replay channel is armed without fallthrough
  (src/run.ts:1186-1189,1531-1534).
* **The mutable store has no ambient channel.** `St.slots` is the replay
  overlay: `replayStore`'s `getSlot`/`setSlot`/`getEffect`/`putEffect` touch
  only the overlay (src/store-memory.ts:75-95), so the model has no
  source-slot field at all. `Cfg.cas` is the one read channel that falls
  through — content-addressed manifests/values, the closed portable
  dependency set. `Cfg.slots` (a per-path answer table) is `replaySlots`:
  the recorded value, the recorded miss, or nothing recorded.
* **The runtime stamp is mint input.** `mint` takes `stamp` as a parameter,
  as `runOrganism` takes `replayRuntime` (src/run.ts:265). Nothing derives
  it from the executing implementation — the model cannot even express the
  derivation, which is the point: the field is a claim, not a measurement.
-/

set_option autoImplicit false
namespace Algal.Replay

open Algal.Core.Json (Value)
open Algal.Core.OwnMap (lookup)

/-- The request kinds the seam issues. `tool` covers both `kind:"tool"` cells
    and agent-loop tool callbacks — both replay through the armed
    `replayToolEffects` channel in production; the model keeps them in the
    one tape since a request's `kind` distinguishes them. -/
inductive Kind where
  | agent | classifier | gate | decide | recall | tool
  deriving DecidableEq, Repr, BEq

/-- Error codes the replay boundary produces or propagates. -/
inductive ErrorCode where
  | effectUnbound | effectFailed | effectUnparseable | inputMissing
  | storeMiss | budgetExhausted | digestMismatch | receiptMismatch
  | toolUnknown | parseFailed | typeMismatch | internal
  deriving DecidableEq, Repr, BEq

/-- What a dispatch returns to the scheduler. `suspended` is the recorded
    `error.code = "EFFECT_SUSPENDED"` case (`retryable:false`): not a
    failure, not an answer — the run halts on it. -/
inductive Reply where
  | output : Value → Reply
  | failure : ErrorCode → Reply
  | suspended : Reply
  deriving DecidableEq

/-- Receipt metadata replay reproduces verbatim: `receiptFor` answers the
    recorded executor id, usage, `cached`, `retryable:false`, wake handles
    and backend configuration digest (src/effects.ts:240-252). -/
structure Meta where
  executor : String
  usage : Option Value := none
  cached : Bool := false
  nonRetryable : Bool := false
  wake : List String := []
  configuration : Option String := none
  deriving DecidableEq

/-- A request is its own digest — see the digest abstraction in the module
    docstring. `payload` folds prompt/context/output-contract/budget/route/
    questions; only the digest identity matters here. -/
structure Request where
  cell : String
  kind : Kind
  payload : Value
  deriving DecidableEq

/-- One recorded effect: request, settled reply, replayed metadata. -/
structure EffectRecord where
  request : Request
  reply : Reply
  receiptMeta : Meta
  deriving DecidableEq

abbrev Tape := List EffectRecord

/-- The digest-keyed queue: first recorded occurrence for this request wins;
    later occurrences queue behind it in record order. Mirrors
    `replayExecutor`'s `Map<Digest, EffectReceipt[]>` shift. -/
def serve : Tape → Request → Option (EffectRecord × Tape)
  | [], _ => none
  | r :: rest, req =>
    if r.request = req then some (r, rest)
    else (serve rest req).map (fun p => (p.1, r :: p.2))

/-- `serves(request)` — the scheduler's replay-route check
    (src/effects.ts:238-240): true iff the tape holds an occurrence. -/
def serves (tape : Tape) (req : Request) : Bool :=
  (serve tape req).isSome

/-- All recorded occurrences for one request, in record order — the
    "repeated requests tracked by occurrence" view. -/
def occurrences (tape : Tape) (req : Request) : Tape :=
  tape.filter (fun r => decide (r.request = req))

/-- The resume tape: suspended records are dropped so the request re-issues
    live; every other recorded effect — settled and failed — stays in order
    (src/verify.ts:142-144). -/
def dropSuspended (tape : Tape) : Tape :=
  tape.filter (fun r => match r.reply with | .suspended => false | _ => true)

/-- A host-admitted live executor/tool answer: `none` means no admitted
    executor (the `unbound` arm). Live dispatch is a function here — the
    model claims nothing about what a real provider does, only about which
    answers enter the record. -/
abbrev Live := Request → Option (Reply × Meta)

/-- Verification's live oracle: none exists. -/
def noLive : Live := fun _ => none

/-- The `unbound` executor's settled failure record (src/run.ts:1700-1708). -/
def unboundRecord (req : Request) : EffectRecord :=
  { request := req, reply := .failure .effectUnbound, receiptMeta := { executor := "unbound" } }

/-- Replay overlay slot contents: name → value. Reads and writes under
    `replayStore` hit only this table — a live slot is unreachable. -/
abbrev SlotTable := List (String × Value)

/-- `replaySlots`: cell path → recorded read outcome. `some (some v)` replays
    the served value; `some none` replays the recorded `INPUT_MISSING`;
    `none` leaves the read to the overlay. -/
abbrev SlotRecord := String → Option (Option Value)

/-- No recorded reads — the live-run configuration. -/
def noRecordedSlots : SlotRecord := fun _ => none

/-- The closed content-addressed view: digest → bytes. The only fall-through
    a replay is allowed, because keys are content identities. -/
abbrev CasView := List (String × Value)

/-- Run configuration: which oracle, which recorded reads, which settled
    writes, which closed dependencies, and whether armed tool replay misses
    fall through to live tools. -/
structure Cfg where
  live : Live := noLive
  slots : SlotRecord := noRecordedSlots
  settledWrites : String → Bool := fun _ => false
  cas : CasView := []
  toolArmed : Bool := false
  toolFallthrough : Bool := false

/-- Replay first: a served occurrence resolves by digest before any live
    route is consulted (`pickExecutor`, src/run.ts:1717-1720). A miss is
    `unbound` for armed non-fallthrough tool requests and for every request
    under `noLive`; otherwise the live oracle answers. The produced record's
    `request` is always the issued request. -/
def dispatch (cfg : Cfg) (tape : Tape) (req : Request) : EffectRecord × Tape :=
  match serve tape req with
  | some hit => hit
  | none =>
    if req.kind = .tool ∧ cfg.toolArmed ∧ ¬cfg.toolFallthrough then
      (unboundRecord req, tape)
    else match cfg.live req with
      | some (reply, mta) => ({ request := req, reply, receiptMeta := mta }, tape)
      | none => (unboundRecord req, tape)

/-- Resolve a slot read the way a replayed run does: the recorded outcome
    wins — value or miss — over whatever the store holds now; an unrecorded
    read consults only the overlay contents (src/run.ts:931-949). -/
def resolveSlotRead (cfg : Cfg) (table : SlotTable) (path name : String) : Reply :=
  match cfg.slots path with
  | some (some v) => .output v
  | some none => .failure .inputMissing
  | none =>
    match lookup table name with
    | some v => .output v
    | none => .failure .inputMissing

inductive SlotMode where | read | write
  deriving DecidableEq, Repr, BEq

inductive CellStatus where | committed | skipped | failed | suspended
  deriving DecidableEq, Repr, BEq

/-- The receipt's per-cell record, restricted to fields the scheduler derives
    deterministically. `outputs` is a port map; `slot` records the touched
    durable name and mode. -/
structure CellRecord where
  path : String
  status : CellStatus
  outputs : List (String × Value) := []
  failure : Option ErrorCode := none
  work : Nat := 0
  slot : Option (String × SlotMode) := none
  deriving DecidableEq

inductive Outcome where | complete | failed | stuck | suspended
  deriving DecidableEq, Repr, BEq

/-- What the deterministic scheduler does next given the reply history. -/
inductive Directive where
  | request : Request → Directive
  | readSlot (path name : String) : Directive
  | writeSlot (path name : String) (data : Value) : Directive
  | done (outcome : Outcome) (failure : Option ErrorCode) : Directive
  deriving DecidableEq

/-- A manifest plus the admitted registry, abstracted to its decision
    function and its record projections. `manifest` is the digest identity
    `manifestDigest` binds; `closure` is the sub-manifest dependency set the
    compile step resolves through `cas`; `maxCalls` is the dispatch budget
    (production folds it into `maxAgentCalls`/`maxSteps`). -/
structure Program where
  manifest : String
  key : String
  closure : List String := []
  maxCalls : Nat := 16
  decide : Value → List Reply → Directive
  cellsOf : Value → List Reply → List CellRecord

/-- Run state: reply history, remaining replay tape, overlay slot contents,
    the live mutations actually performed, and a step counter. -/
structure St where
  hist : List Reply := []
  tape : Tape := []
  slots : SlotTable := []
  writes : List (String × String × Value) := []
  steps : Nat := 0
  deriving DecidableEq

/-- How a run stops: `done` is the program-declared end (an outcome plus the
    run-level failure, when any), `suspendedEnd` is the suspension halt,
    `exhausted` is the budget failure — `BUDGET_EXHAUSTED`, a `failed`
    outcome with `failure` populated. -/
inductive EndMarker where
  | done (outcome : Outcome) (failure : Option ErrorCode)
  | suspendedEnd | exhausted
  deriving DecidableEq, Repr, BEq

/-- The deterministic step function: one directive per step. A request
    dispatches through replay-or-live; a `.suspended` reply is recorded and
    halts the run — it is never routed back as a retry. A settled write
    produces its output without mutating (`replaySlotWrites`,
    src/run.ts:924-926); an unsettled write mutates only the overlay. -/
def steps (cfg : Cfg) (p : Program) (args : Value) : Nat → St → Tape × St × EndMarker
  | 0, s => ([], s, .exhausted)
  | fuel + 1, s =>
    match p.decide args s.hist with
    | .done o f => ([], s, .done o f)
    | .request req =>
      let (rec, tape') := dispatch cfg s.tape req
      let s' := { s with tape := tape', hist := s.hist ++ [rec.reply], steps := s.steps + 1 }
      match rec.reply with
      | .suspended => ([rec], s', .suspendedEnd)
      | _ =>
        let (rest, s'', e) := steps cfg p args fuel s'
        (rec :: rest, s'', e)
    | .readSlot path name =>
      let reply := resolveSlotRead cfg s.slots path name
      steps cfg p args fuel { s with hist := s.hist ++ [reply], steps := s.steps + 1 }
    | .writeSlot path name data =>
      let s' :=
        if cfg.settledWrites path then s
        else { s with slots := (name, data) :: s.slots, writes := s.writes ++ [(path, name, data)] }
      steps cfg p args fuel { s' with hist := s'.hist ++ [.output data], steps := s'.steps + 1 }

/-- A finished run: produced effects in dispatch order, the reply history,
    live mutations performed, the end marker, and the step count. -/
structure RunResult where
  produced : Tape
  hist : List Reply
  writes : List (String × String × Value)
  end_ : EndMarker
  steps : Nat
  deriving DecidableEq

/-- Dependency closure before any cell runs: every declared sub-manifest
    digest must sit in the closed `cas` view — compile resolution
    (`compileOrganism`, src/graph.ts:436-460) fetches through named
    transports; verification admits none, so a missing digest is a
    `STORE_MISS` rejection, not an ambient read. -/
def closureSatisfied (cfg : Cfg) (p : Program) : Bool :=
  p.closure.all (fun d => cfg.cas.any (fun kv => kv.1 == d))

def run (cfg : Cfg) (p : Program) (args : Value) (tape : Tape)
    (init : SlotTable := []) : Except ErrorCode RunResult :=
  if closureSatisfied cfg p then
    let (prod, st, e) := steps cfg p args p.maxCalls { tape, slots := init }
    .ok { produced := prod, hist := st.hist, writes := st.writes, end_ := e, steps := st.steps }
  else .error .storeMiss

def outcomeOf : EndMarker → Outcome
  | .done o _ => o
  | .suspendedEnd => .suspended
  | .exhausted => .failed

def failureOf : EndMarker → Option ErrorCode
  | .done _ f => f
  | .suspendedEnd => none
  | .exhausted => some .budgetExhausted

/-- The receipt's runtime claim: `{name: "algal", version}` — admission
    checks the name and bounds the version string; the version is not a
    supported-semantics gate (src/run.ts:1915-1918). -/
structure Stamp where
  name : String
  version : String
  deriving DecidableEq, Repr, BEq

structure Work where
  steps : Nat
  agentCalls : Nat
  units : Nat
  deriving DecidableEq, Repr, BEq

inductive EventKind where | runStart | effect | runEnd
  deriving DecidableEq, Repr, BEq

/-- Receipt events, modelled as the start marker, one `effect` entry per
    produced record carrying its request digest, and the end marker. -/
structure Event where
  seq : Nat
  kind : EventKind
  path : Option String := none
  request : Option Request := none
  deriving DecidableEq

/-- Every receipt field the parser admits (src/run.ts:1910-1982), minus the
    wire constant `contract` and the digest itself. `cells` and `events` are
    deterministic projections of the run; `runtime` is supplied, not
    derived. -/
structure Fields where
  runtime : Stamp
  manifest : String
  manifestKey : String
  args : Value
  outcome : Outcome
  cells : List CellRecord
  effects : Tape
  events : List Event
  work : Work
  failure : Option ErrorCode
  deriving DecidableEq

/-- A receipt: the fields plus the digest over them. The digest *is* the
    canonical field tuple — see the module docstring for the hash
    abstraction. -/
structure Receipt where
  fields : Fields
  digest : Fields
  deriving DecidableEq

/-- Digest self-consistency: what `resumeRun`'s `receiptDigest` check
    verifies (src/verify.ts:131-133) and what rehashing a mutated receipt
    restores. -/
def consistent (r : Receipt) : Prop := r.digest = r.fields

/-- Deterministic record projections: work accounting, the event log, the
    outcome and the failure — each a pure function of the produced
    history. -/
def workOf (res : RunResult) : Work :=
  { steps := res.steps, agentCalls := res.produced.length,
    units := res.steps * 100 + res.produced.length * 500 }

def eventsOf (res : RunResult) : List Event :=
  ⟨0, .runStart, none, none⟩
    :: (res.produced.mapIdx fun i r =>
        ⟨i + 1, .effect, some r.request.cell, some r.request⟩)
    ++ [⟨res.produced.length + 1, .runEnd, some "outcome", none⟩]

def mintFields (p : Program) (args : Value) (res : RunResult) (stamp : Stamp) : Fields :=
  { runtime := stamp
    manifest := p.manifest
    manifestKey := p.key
    args
    outcome := outcomeOf res.end_
    cells := p.cellsOf args res.hist
    effects := res.produced
    events := eventsOf res
    work := workOf res
    failure := failureOf res.end_ }

/-- Minting is content-addressed: the digest re-derives the fields. A
    receipt's stamp is the supplied `stamp`, never the executing
    implementation. -/
def mint (p : Program) (args : Value) (res : RunResult) (stamp : Stamp) : Receipt :=
  let f := mintFields p args res stamp
  { fields := f, digest := f }

/-- Rebuild `replaySlots` from the recorded cells (src/verify.ts:95-104): a
    committed read serves its recorded `outputs.data`; anything else that
    recorded a read replays the miss; unrecorded paths are not covered. -/
def replaySlotsOf (cells : List CellRecord) : SlotRecord :=
  fun path =>
    match cells.find? (fun c =>
        c.path == path &&
        (match c.slot with | some (_, .read) => true | _ => false)) with
    | some c =>
      some (if c.status == .committed then lookup c.outputs "data" else none)
    | none => none

/-- Rebuild `replaySlotWrites`: the committed write cells' paths
    (src/verify.ts:158-160). -/
def settledWritesOf (cells : List CellRecord) : String → Bool :=
  fun path =>
    cells.any (fun c =>
      c.path == path && c.status == .committed &&
        (match c.slot with | some (_, .write) => true | _ => false))

/-- The verifier's run configuration: recorded oracle and recorded slot
    answers, closed `cas`, no live executors, armed tool replay with no
    fallthrough, and a fresh overlay (`init = []`). Slot *writes* re-execute
    under verify — into the overlay, which is the only place they can
    land. -/
def verifyCfg (r : Receipt) (store : CasView) : Cfg :=
  { live := noLive
    slots := replaySlotsOf r.fields.cells
    settledWrites := fun _ => false
    cas := store
    toolArmed := true
    toolFallthrough := false }

/-- The mismatch vocabulary: one name per compared field family, plus
    `digest` for an inconsistent digest and `records` for the canonical
    catch-all (src/verify.ts:254-256). -/
inductive Mismatch where
  | manifestDigest | outcome | cells | effects | events | work | failure
  | args | runtime | manifestKey | digest | records
  deriving DecidableEq, Repr, BEq

/-- Field-wise comparison mirroring `diffReceipts`: every admitted field is
    named; the diagnostic list's incompleteness is backstopped by the
    whole-record fallback. -/
def diffFields (a b : Fields) : List Mismatch :=
  (if a.outcome = b.outcome then [] else [.outcome])
    ++ (if a.cells = b.cells then [] else [.cells])
    ++ (if a.effects = b.effects then [] else [.effects])
    ++ (if a.events = b.events then [] else [.events])
    ++ (if a.work = b.work then [] else [.work])
    ++ (if a.failure = b.failure then [] else [.failure])
    ++ (if a.args = b.args then [] else [.args])
    ++ (if a.runtime = b.runtime then [] else [.runtime])
    ++ (if a.manifestKey = b.manifestKey then [] else [.manifestKey])
    ++ (if a.manifest = b.manifest then [] else [.manifestDigest])

def diffReceipts (a b : Receipt) : List Mismatch :=
  let named := diffFields a.fields b.fields
  if named.isEmpty then
    if a.digest = b.digest then [] else [.digest]
  else named

/-- Verification: the manifest identity must match before the rerun; then the
    run replays under the recorded oracle and the minted rerun is compared
    against the presented receipt, stamped with the presented `runtime`
    claim. `ok` is empty-diff equality — the whole canonical record, digest
    included. -/
inductive Verdict where
  | verified
  | mismatch : List Mismatch → Verdict
  | rejected : ErrorCode → Verdict
  deriving DecidableEq, Repr, BEq

def verify (r : Receipt) (p : Program) (store : CasView) : Verdict :=
  if r.fields.manifest ≠ p.manifest then .mismatch [.manifestDigest]
  else
    match run (verifyCfg r store) p r.fields.args r.fields.effects with
    | .error e => .rejected e
    | .ok res =>
      let rerun := mint p r.fields.args res r.fields.runtime
      let d := diffReceipts r rerun
      if d.isEmpty then .verified else .mismatch d

/-- The resume configuration: recorded oracle minus suspended records,
    recorded slot answers, committed write cells marked settled, closed
    `cas`, armed tool replay *with* fallthrough, and the admitted live
    oracle for everything the tape cannot answer. -/
def resumeCfg (r : Receipt) (store : CasView) (live : Live) : Cfg :=
  { live
    slots := replaySlotsOf r.fields.cells
    settledWrites := settledWritesOf r.fields.cells
    cas := store
    toolArmed := true
    toolFallthrough := true }

/-- `resumeRun` (src/verify.ts:112-164): digest self-consistency and the
    manifest binding gate before replay; the whole checkpoint verifies
    before any live tail is admitted; then the run replays the continuable
    prefix and mints a fresh receipt stamped by the resuming runtime. -/
def resume (r : Receipt) (p : Program) (store : CasView) (live : Live)
    (stamp : Stamp) : Except ErrorCode Receipt :=
  if r.fields.manifest ≠ p.manifest then .error .digestMismatch
  else if r.digest ≠ r.fields then .error .digestMismatch
  else
    match verify r p store with
    | .verified =>
      match run (resumeCfg r store live) p r.fields.args
          (dropSuspended r.fields.effects) with
      | .error e => .error e
      | .ok res => .ok (mint p r.fields.args res stamp)
    | _ => .error .receiptMismatch

end Algal.Replay
