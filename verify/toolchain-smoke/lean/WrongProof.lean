import Smoke

-- Must fail because the proposition is false, not because a tool crashed.
theorem rejectedFalseClaim : ToolchainSmoke.canAppend 1 1 := by
  change (1 : Nat) < 1
  decide
