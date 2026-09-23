import Algal.Core.Ports

/-!
A finite graph certificate checker, not a proof that compile() emits this
certificate. A rank certificate rules out cycles in normal AND failure edges.
The unlifted child-interface predicate covers exact declared interfaces; map,
repeat and loop interface transformations require their own later refinement.
-/
namespace Algal.Core.Graph
open Ports

structure Endpoint where
  cell : String
  port : String
  deriving DecidableEq

structure Cell where
  inputCell : Bool := false
  inputs : Declarations := []
  outputs : Declarations := []
  deriving DecidableEq

abbrev Cells := OwnMap.Entries Cell

inductive Guard where
  | none | expression | field | label (value : String)
  deriving DecidableEq

structure Edge where
  source : Endpoint
  target : Endpoint
  onFail : Bool := false
  guard : Guard := .none
  deriving DecidableEq

structure Interface where
  inputs : OwnMap.Entries Endpoint := []
  outputs : OwnMap.Entries Endpoint := []
  deriving DecidableEq

structure Graph where
  cells : Cells
  edges : List Edge
  interface : Interface := {}
  deriving DecidableEq

abbrev Ranks := OwnMap.Entries Nat

def ownInput (cells : Cells) (endpoint : Endpoint) : Option Port := do
  let cell ← OwnMap.lookup cells endpoint.cell
  OwnMap.lookup cell.inputs endpoint.port

def ownOutput (cells : Cells) (endpoint : Endpoint) : Option Port := do
  let cell ← OwnMap.lookup cells endpoint.cell
  OwnMap.lookup cell.outputs endpoint.port

def interfaceInput (cells : Cells) (endpoint : Endpoint) : Option Port := do
  let cell ← OwnMap.lookup cells endpoint.cell
  if cell.inputCell then OwnMap.lookup cell.outputs endpoint.port else none

def guardValid (producer : Port) : Guard → Bool
  | .none | .expression => true
  | .field => decide (producer.kind = .json)
  | .label label => decide (producer.kind = .choice) &&
      producer.labels.all (fun labels => labels.contains label)

def edgeValid (cells : Cells) (edge : Edge) : Bool :=
  match ownOutput cells edge.source, ownInput cells edge.target with
  | some producer, some consumer =>
    if edge.onFail then decide (edge.guard = .none ∧ consumer.kind = .json)
    else compatible producer consumer && guardValid producer edge.guard
  | _, _ => false

def rank (ranks : Ranks) (cell : String) : Nat := (OwnMap.lookup ranks cell).getD 0

def rankValid (ranks : Ranks) (edge : Edge) : Bool :=
  decide (rank ranks edge.source.cell < rank ranks edge.target.cell)

def inbound (edges : List Edge) (target : Endpoint) : List Edge :=
  edges.filter (fun edge => decide (edge.target = target))

def cardinalityValid (cells : Cells) (edges : List Edge) (edge : Edge) : Bool :=
  match ownInput cells edge.target with
  | none => false
  | some consumer =>
    (consumer.many || decide ((inbound edges edge.target).length ≤ 1)) &&
      (inbound edges edge.target).all (fun other => other.onFail == edge.onFail)

def uniqueNames {α : Type} (entries : OwnMap.Entries α) : Bool :=
  decide ((entries.map Prod.fst).Nodup)

def interfaceValid (cells : Cells) (interface : Interface) : Bool :=
  uniqueNames interface.inputs && uniqueNames interface.outputs &&
    interface.inputs.all (fun binding => (interfaceInput cells binding.2).isSome) &&
    interface.outputs.all (fun binding => (ownOutput cells binding.2).isSome)

def checkCertificate (graph : Graph) (ranks : Ranks) : Bool :=
  uniqueNames graph.cells &&
    graph.cells.all (fun cell => uniqueNames cell.2.inputs && uniqueNames cell.2.outputs) &&
    graph.edges.all (edgeValid graph.cells) &&
    graph.edges.all (rankValid ranks) &&
    graph.edges.all (cardinalityValid graph.cells graph.edges) &&
    interfaceValid graph.cells graph.interface

theorem accepted_edge_resolves_own_ports (graph : Graph) (ranks : Ranks)
    (h : checkCertificate graph ranks = true) (edge : Edge) (he : edge ∈ graph.edges) :
    ∃ producer consumer, ownOutput graph.cells edge.source = some producer ∧
      ownInput graph.cells edge.target = some consumer := by
  have hh : edgeValid graph.cells edge = true := by
    simp only [checkCertificate, Bool.and_eq_true, List.all_eq_true] at h
    exact h.1.1.1.2 edge he
  unfold edgeValid at hh
  split at hh
  next producer consumer hp hc => exact ⟨producer, consumer, hp, hc⟩
  · contradiction

theorem ownOutput_is_declared (cells : Cells) (endpoint : Endpoint) (port : Port)
    (h : ownOutput cells endpoint = some port) :
    ∃ cell, OwnMap.lookup cells endpoint.cell = some cell ∧
      OwnMap.lookup cell.outputs endpoint.port = some port := by
  unfold ownOutput at h
  cases hc : OwnMap.lookup cells endpoint.cell with
  | none => simp [hc] at h
  | some cell => exact ⟨cell, rfl, by simpa [hc] using h⟩

theorem ownInput_is_declared (cells : Cells) (endpoint : Endpoint) (port : Port)
    (h : ownInput cells endpoint = some port) :
    ∃ cell, OwnMap.lookup cells endpoint.cell = some cell ∧
      OwnMap.lookup cell.inputs endpoint.port = some port := by
  unfold ownInput at h
  cases hc : OwnMap.lookup cells endpoint.cell with
  | none => simp [hc] at h
  | some cell => exact ⟨cell, rfl, by simpa [hc] using h⟩

theorem interfaceInput_is_declared_input_cell (cells : Cells) (endpoint : Endpoint) (port : Port)
    (h : interfaceInput cells endpoint = some port) :
    ∃ cell, OwnMap.lookup cells endpoint.cell = some cell ∧ cell.inputCell = true ∧
      OwnMap.lookup cell.outputs endpoint.port = some port := by
  unfold interfaceInput at h
  cases hc : OwnMap.lookup cells endpoint.cell with
  | none => simp [hc] at h
  | some cell =>
    simp only [hc] at h
    change (if cell.inputCell then OwnMap.lookup cell.outputs endpoint.port else none) = some port at h
    split at h
    next hi => exact ⟨cell, rfl, hi, h⟩
    · contradiction

theorem accepted_interface_input_resolves (graph : Graph) (ranks : Ranks)
    (h : checkCertificate graph ranks = true) (name : String) (endpoint : Endpoint)
    (he : (name, endpoint) ∈ graph.interface.inputs) :
    ∃ port, interfaceInput graph.cells endpoint = some port := by
  simp only [checkCertificate, Bool.and_eq_true] at h
  have hh := h.2
  simp only [interfaceValid, Bool.and_eq_true, List.all_eq_true] at hh
  have hs := hh.1.2 (name, endpoint) he
  cases hp : interfaceInput graph.cells endpoint with
  | none => simp [hp] at hs
  | some port => exact ⟨port, rfl⟩

theorem accepted_interface_output_resolves (graph : Graph) (ranks : Ranks)
    (h : checkCertificate graph ranks = true) (name : String) (endpoint : Endpoint)
    (he : (name, endpoint) ∈ graph.interface.outputs) :
    ∃ port, ownOutput graph.cells endpoint = some port := by
  simp only [checkCertificate, Bool.and_eq_true] at h
  have hh := h.2
  simp only [interfaceValid, Bool.and_eq_true, List.all_eq_true] at hh
  have hs := hh.2 (name, endpoint) he
  cases hp : ownOutput graph.cells endpoint with
  | none => simp [hp] at hs
  | some port => exact ⟨port, rfl⟩

theorem accepted_edge_increases_rank (graph : Graph) (ranks : Ranks)
    (h : checkCertificate graph ranks = true) (edge : Edge) (he : edge ∈ graph.edges) :
    rank ranks edge.source.cell < rank ranks edge.target.cell := by
  simp only [checkCertificate, Bool.and_eq_true, List.all_eq_true] at h
  exact of_decide_eq_true (h.1.1.2 edge he)

inductive Reaches (graph : Graph) : String → String → Prop where
  | edge (edge : Edge) (member : edge ∈ graph.edges) : Reaches graph edge.source.cell edge.target.cell
  | trans {a b c : String} : Reaches graph a b → Reaches graph b c → Reaches graph a c

theorem accepted_path_increases_rank (graph : Graph) (ranks : Ranks)
    (h : checkCertificate graph ranks = true) (a b : String) (path : Reaches graph a b) :
    rank ranks a < rank ranks b := by
  induction path with
  | edge edge member => exact accepted_edge_increases_rank graph ranks h edge member
  | trans _ _ first second => exact Nat.lt_trans first second

theorem accepted_graph_acyclic (graph : Graph) (ranks : Ranks)
    (h : checkCertificate graph ranks = true) (cell : String) : ¬ Reaches graph cell cell := by
  intro path
  exact Nat.lt_irrefl _ (accepted_path_increases_rank graph ranks h cell cell path)

theorem accepted_scalar_cardinality (graph : Graph) (ranks : Ranks)
    (h : checkCertificate graph ranks = true) (edge : Edge) (he : edge ∈ graph.edges)
    (consumer : Port) (hc : ownInput graph.cells edge.target = some consumer)
    (hm : consumer.many = false) : (inbound graph.edges edge.target).length ≤ 1 := by
  simp only [checkCertificate, Bool.and_eq_true, List.all_eq_true] at h
  have hh := h.1.2 edge he
  simp [cardinalityValid, hc, hm] at hh
  exact hh.1

theorem accepted_no_mixed_failure_inputs (graph : Graph) (ranks : Ranks)
    (h : checkCertificate graph ranks = true) (edge : Edge) (he : edge ∈ graph.edges)
    (other : Edge) (ho : other ∈ inbound graph.edges edge.target) : other.onFail = edge.onFail := by
  simp only [checkCertificate, Bool.and_eq_true, List.all_eq_true] at h
  have hh := h.1.2 edge he
  unfold cardinalityValid at hh
  split at hh
  · contradiction
  · simp only [Bool.and_eq_true, List.all_eq_true] at hh
    simpa using hh.2 other ho

theorem accepted_normal_capability_edge_preserves_class (graph : Graph) (ranks : Ranks)
    (h : checkCertificate graph ranks = true) (edge : Edge) (he : edge ∈ graph.edges)
    (hf : edge.onFail = false) (producer consumer : Port)
    (hp : ownOutput graph.cells edge.source = some producer)
    (hc : ownInput graph.cells edge.target = some consumer)
    (name : String) (hk : producer.kind = .capability name) : consumer.kind = .capability name := by
  simp only [checkCertificate, Bool.and_eq_true, List.all_eq_true] at h
  have hh := h.1.1.1.2 edge he
  have hcompat : compatible producer consumer = true := by
    simp [edgeValid, hp, hc, hf] at hh
    exact hh.1
  exact capability_class_preserved producer consumer name hk hcompat

def exposedInput (cells : Cells) (interface : Interface) (name : String) : Option Port := do
  let endpoint ← OwnMap.lookup interface.inputs name
  interfaceInput cells endpoint

def exposedOutput (cells : Cells) (interface : Interface) (name : String) : Option Port := do
  let endpoint ← OwnMap.lookup interface.outputs name
  ownOutput cells endpoint

def unliftedChildCorresponds (childCells : Cells) (interface : Interface) (parent : Cell) : Bool :=
  interfaceValid childCells interface &&
    parent.inputs.all (fun entry => decide (exposedInput childCells interface entry.1 = some entry.2)) &&
    parent.outputs.all (fun entry => decide (exposedOutput childCells interface entry.1 = some entry.2)) &&
    interface.inputs.all (fun entry => (OwnMap.lookup parent.inputs entry.1).isSome) &&
    interface.outputs.all (fun entry => (OwnMap.lookup parent.outputs entry.1).isSome)

theorem accepted_child_output_corresponds (childCells : Cells) (interface : Interface)
    (parent : Cell) (h : unliftedChildCorresponds childCells interface parent = true)
    (name : String) (port : Port) (he : (name, port) ∈ parent.outputs) :
    ∃ endpoint, OwnMap.lookup interface.outputs name = some endpoint ∧
      ownOutput childCells endpoint = some port := by
  simp only [unliftedChildCorresponds, Bool.and_eq_true, List.all_eq_true] at h
  have hh := of_decide_eq_true (h.1.1.2 (name, port) he)
  unfold exposedOutput at hh
  cases hl : OwnMap.lookup interface.outputs name with
  | none => simp [hl] at hh
  | some endpoint => exact ⟨endpoint, rfl, by simpa [hl] using hh⟩

theorem accepted_child_input_corresponds (childCells : Cells) (interface : Interface)
    (parent : Cell) (h : unliftedChildCorresponds childCells interface parent = true)
    (name : String) (port : Port) (he : (name, port) ∈ parent.inputs) :
    ∃ endpoint, OwnMap.lookup interface.inputs name = some endpoint ∧
      interfaceInput childCells endpoint = some port := by
  simp only [unliftedChildCorresponds, Bool.and_eq_true, List.all_eq_true] at h
  have hh := of_decide_eq_true (h.1.1.1.2 (name, port) he)
  unfold exposedInput at hh
  cases hl : OwnMap.lookup interface.inputs name with
  | none => simp [hl] at hh
  | some endpoint => exact ⟨endpoint, rfl, by simpa [hl] using hh⟩

def textPort : Port := { kind := .text }
def exampleCells : Cells :=
  [("input", { inputCell := true, outputs := [("out", textPort)] }),
   ("echo", { inputs := [("in", textPort)], outputs := [("out", textPort)] })]
def exampleEdge : Edge := { source := ⟨"input", "out"⟩, target := ⟨"echo", "in"⟩ }
def exampleGraph : Graph := {
  cells := exampleCells
  edges := [exampleEdge]
  interface := { inputs := [("value", ⟨"input", "out"⟩)], outputs := [("value", ⟨"echo", "out"⟩)] }
}
def exampleRanks : Ranks := [("input", 0), ("echo", 1)]

theorem declared_acyclic_graph_admitted : checkCertificate exampleGraph exampleRanks = true := by decide
theorem duplicate_scalar_edge_rejected :
    checkCertificate { exampleGraph with edges := [exampleEdge, exampleEdge] } exampleRanks = false := by decide
theorem inherited_endpoint_rejected :
    checkCertificate { exampleGraph with edges := [{ exampleEdge with source := ⟨"input", "toString"⟩ }] }
      exampleRanks = false := by decide
theorem self_cycle_rejected :
    checkCertificate { exampleGraph with edges := [{ source := ⟨"echo", "out"⟩, target := ⟨"echo", "in"⟩ }] }
      exampleRanks = false := by decide
theorem missing_child_port_rejected :
    unliftedChildCorresponds exampleCells exampleGraph.interface
      { inputs := [("value", textPort)], outputs := [("toString", textPort)] } = false := by decide
theorem exact_child_interface_admitted :
    unliftedChildCorresponds exampleCells exampleGraph.interface
      { inputs := [("value", textPort)], outputs := [("value", textPort)] } = true := by decide

end Algal.Core.Graph
