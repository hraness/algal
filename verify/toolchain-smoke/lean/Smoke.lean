import Std

set_option autoImplicit false

namespace ToolchainSmoke

-- A toy predicate, not an ALGAL production function or specification.
def canAppend (size capacity : Nat) : Prop := size < capacity

theorem admittedSuccessorBound (size capacity : Nat)
    (admitted : canAppend size capacity) : size + 1 ≤ capacity :=
  Nat.succ_le_of_lt admitted

theorem fullCapacityRejects (capacity : Nat) : ¬canAppend capacity capacity :=
  Nat.lt_irrefl capacity

theorem initialWitness : canAppend 0 1 := Nat.zero_lt_succ 0

end ToolchainSmoke

#print axioms ToolchainSmoke.admittedSuccessorBound
#print axioms ToolchainSmoke.fullCapacityRejects
#print axioms ToolchainSmoke.initialWitness
