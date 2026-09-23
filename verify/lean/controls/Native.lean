import Algal.Audit
theorem AlgalControl.native : (List.range 100).length = 100 := by native_decide
audit_theorem AlgalControl.native
