import Smoke

namespace ToolchainSmoke

-- Lean accepts axioms. The separate claim-admission audit must refuse this.
axiom uncheckedFalse : False
theorem indirectFalse : False := uncheckedFalse

end ToolchainSmoke

#print axioms ToolchainSmoke.indirectFalse
