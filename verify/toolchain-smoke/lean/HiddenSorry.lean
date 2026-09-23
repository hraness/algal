import Smoke

namespace ToolchainSmoke

-- The exported theorem has no local sorry; its transitive dependency does.
theorem unfinishedBase : False := by sorry
theorem indirectUnfinished : False := unfinishedBase

end ToolchainSmoke

#print axioms ToolchainSmoke.indirectUnfinished
