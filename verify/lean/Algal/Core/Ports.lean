import Algal.Core.Json

/-!
Signature routing and runtime representation checking are different predicates.
SchemaCheck and canonical-byte size are explicit parameters: correspondence to
the production schema checker and byte codec is not assumed or proved here.
Capability syntax/class checking does not confer host authority or resolve CAS.
-/
namespace Algal.Core.Ports
open Json

inductive Kind where
  | text | json | choice | reference | capability (name : String)
  deriving DecidableEq

structure Port where
  kind : Kind
  many : Bool := false
  optional : Bool := false
  labels : Option (List String) := none
  schema : Option Value := none
  deriving DecidableEq

def kindCompatible : Kind → Kind → Bool
  | .capability a, .capability b => a == b
  | .capability _, _ | _, .capability _ => false
  | .reference, .reference => true
  | .reference, _ | _, .reference => false
  | _, .json => true
  | .text, .text | .choice, .choice | .choice, .text => true
  | _, _ => false

def labelsCompatible (producer consumer : Port) : Bool :=
  if producer.kind = .choice ∧ consumer.kind = .choice then
    match producer.labels, consumer.labels with
    | some a, some b => a.all (fun label => b.contains label)
    | _, _ => true
  else true

def compatible (producer consumer : Port) : Bool :=
  !(producer.many && !consumer.many && consumer.kind != .json) &&
    kindCompatible producer.kind consumer.kind && labelsCompatible producer consumer

theorem capability_no_json_widening (producer consumer : Port) (name : String)
    (hp : producer.kind = .capability name) (hc : consumer.kind = .json) :
    compatible producer consumer = false := by simp [compatible, hp, hc, kindCompatible]

theorem capability_class_preserved (producer consumer : Port) (name : String)
    (hp : producer.kind = .capability name) (h : compatible producer consumer = true) :
    consumer.kind = .capability name := by
  cases hc : consumer.kind <;> simp_all [compatible, kindCompatible]

theorem reference_is_not_payload (producer consumer : Port)
    (hp : producer.kind = .reference) (hc : consumer.kind = .json) :
    compatible producer consumer = false := by simp [compatible, hp, hc, kindCompatible]

theorem many_to_scalar_nonjson_rejected (producer consumer : Port)
    (hp : producer.many = true) (hc : consumer.many = false) (hk : consumer.kind ≠ .json) :
    compatible producer consumer = false := by simp [compatible, hp, hc, hk]

def lowerHex (c : Char) : Bool :=
  decide (('0' ≤ c ∧ c ≤ '9') ∨ ('a' ≤ c ∧ c ≤ 'f'))

def asciiLower (c : Char) : Bool := decide ('a' ≤ c ∧ c ≤ 'z')

def capabilityName (name : List Char) : Bool :=
  match name with
  | [] => false
  | first :: _ => asciiLower first && decide (name.length ≤ 64) &&
      name.all (fun c => asciiLower c || decide ('0' ≤ c ∧ c ≤ '9') || c == '-')

def digestSyntax (s : String) : Bool :=
  s.toList.take 7 == ['s', 'h', 'a', '2', '5', '6', ':'] &&
    s.toList.length == 71 && (s.toList.drop 7).all lowerHex

def splitColonAux : List Char → List Char → List (List Char) → List (List Char)
  | [], current, groups => (current.reverse :: groups).reverse
  | c :: cs, current, groups =>
    if c = ':' then splitColonAux cs [] (current.reverse :: groups)
    else splitColonAux cs (c :: current) groups

def splitColon (characters : List Char) : List (List Char) := splitColonAux characters [] []

def capabilityClass (s : String) : Option String :=
  match splitColon s.toList with
  | [['c', 'a', 'p'], name, ['s', 'h', 'a', '2', '5', '6'], digest] =>
    if capabilityName name && digest.length == 64 && digest.all lowerHex then
      some (String.ofList name)
    else none
  | _ => none

abbrev SchemaCheck := Value → Value → Bool
abbrev ByteSize := Value → Nat

def scalarAccepts (checkSchema : SchemaCheck) (port : Port) (value : Value) : Bool :=
  match port.kind, value with
  | .text, .text _ => true
  | .choice, .text label => port.labels.all (fun labels => labels.contains label)
  | .reference, .text token => digestSyntax token
  | .capability expected, .text handle => capabilityClass handle == some expected
  | .json, value => port.schema.all (fun schema => checkSchema schema value)
  | _, _ => false

def itemsAll (predicate : Value → Bool) : Items → Bool
  | .nil => true
  | .cons value rest => predicate value && itemsAll predicate rest

def accepts (checkSchema : SchemaCheck) (bytes : ByteSize) (port : Port) (value : Value) : Bool :=
  decide (bytes value ≤ 262144) &&
    if port.many then
      match value with
      | .array items => itemsAll
          (fun item => decide (bytes item ≤ 262144) && scalarAccepts checkSchema port item) items
      | _ => false
    else scalarAccepts checkSchema port value

theorem accepted_value_byte_bound (schema : SchemaCheck) (bytes : ByteSize)
    (port : Port) (value : Value) (h : accepts schema bytes port value = true) :
    bytes value ≤ 262144 := by
  simp only [accepts, Bool.and_eq_true, decide_eq_true_eq] at h
  exact h.1

theorem accepted_scalar_capability_class (schema : SchemaCheck) (bytes : ByteSize)
    (port : Port) (value : Value) (name : String) (hk : port.kind = .capability name)
    (hm : port.many = false) (h : accepts schema bytes port value = true) :
    ∃ handle, value = .text handle ∧ capabilityClass handle = some name := by
  cases value <;> simp_all [accepts, scalarAccepts]

theorem accepted_many_is_array (schema : SchemaCheck) (bytes : ByteSize)
    (port : Port) (value : Value) (hm : port.many = true)
    (h : accepts schema bytes port value = true) : ∃ items, value = .array items := by
  cases value <;> simp_all [accepts]

inductive CheckError where
  | undeclaredPort | rejectedValue
  deriving DecidableEq

abbrev Declarations := OwnMap.Entries Port
abbrev State := OwnMap.Entries Value

def TypedState (schema : SchemaCheck) (bytes : ByteSize)
    (declarations : Declarations) (state : State) : Prop :=
  ∀ name value, OwnMap.lookup state name = some value →
    ∃ port, OwnMap.lookup declarations name = some port ∧ accepts schema bytes port value = true

def assign (schema : SchemaCheck) (bytes : ByteSize) (declarations : Declarations)
    (state : State) (name : String) (value : Value) : Except CheckError State :=
  match OwnMap.lookup declarations name with
  | none => .error .undeclaredPort
  | some port => if accepts schema bytes port value then
      .ok (OwnMap.write state name value)
    else .error .rejectedValue

theorem checked_assignment_preserves_types (schema : SchemaCheck) (bytes : ByteSize)
    (declarations : Declarations) (before after : State) (name : String) (value : Value)
    (ht : TypedState schema bytes declarations before)
    (ha : assign schema bytes declarations before name value = .ok after) :
    TypedState schema bytes declarations after := by
  unfold assign at ha
  split at ha
  · contradiction
  next port hdecl =>
    split at ha
    next hcheck =>
      cases ha
      intro query result hread
      by_cases heq : query = name
      · subst query
        have hv : value = result := Option.some.inj
          ((OwnMap.lookup_write_same before name value).symm.trans hread)
        subst result
        exact ⟨port, hdecl, hcheck⟩
      · rw [OwnMap.lookup_write_other before name query value heq] at hread
        exact ht query result hread
    · contradiction

theorem undeclared_assignment_rejected (schema : SchemaCheck) (bytes : ByteSize)
    (declarations : Declarations) (state : State) (name : String) (value : Value)
    (h : OwnMap.lookup declarations name = none) :
    assign schema bytes declarations state name value = .error .undeclaredPort := by
  simp [assign, h]

-- Representation/schema compatibility is intentionally not inferred from routing.
theorem signature_does_not_imply_schema_satisfaction :
    compatible { kind := .text } ⟨.json, false, false, none, some .null⟩ = true ∧
      accepts (fun _ _ => false) (fun _ => 1)
        ⟨.json, false, false, none, some .null⟩ (.text "valid text") = false := by decide

theorem open_choice_does_not_imply_label_satisfaction :
    compatible { kind := .choice } { kind := .choice, labels := some ["yes"] } = true ∧
      accepts (fun _ _ => true) (fun _ => 1)
        { kind := .choice, labels := some ["yes"] } (.text "no") = false := by decide

theorem many_to_json_witness :
    compatible { kind := .text, many := true } { kind := .json } = true := by decide

def exampleHandle : String := String.ofList
  (['c', 'a', 'p', ':', 'm', 'a', 'i', 'l', 'b', 'o', 'x', ':', 's', 'h', 'a', '2', '5', '6', ':'] ++
    List.replicate 64 '0')

theorem capability_syntax_witness : capabilityClass exampleHandle = some "mailbox" := by
  simp only [capabilityClass, exampleHandle, String.toList_ofList]
  rfl
theorem capability_wrong_class_rejected :
    accepts (fun _ _ => true) (fun _ => 80) { kind := .capability "process" } (.text exampleHandle) = false := by
  simp [accepts, scalarAccepts, capability_syntax_witness]
theorem empty_digest_rejected : digestSyntax "sha256:" = false := by decide
theorem inherited_port_rejected :
    assign (fun _ _ => true) (fun _ => 1) [] [] "toString" (.text "x") =
      .error .undeclaredPort := rfl

/-- Host grants are a separate premise; a syntactically valid handle is not one. -/
def authorized (grants : List String) (handle : String) : Bool := grants.contains handle

theorem syntax_does_not_mint_authority :
    capabilityClass exampleHandle = some "mailbox" ∧ authorized [] exampleHandle = false :=
  ⟨capability_syntax_witness, rfl⟩

end Algal.Core.Ports
