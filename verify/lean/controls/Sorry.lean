import Algal.Audit
-- Hide the friendly warning so the control must reject the actual axiom.
set_option warn.sorry false
theorem AlgalControl.admitted : False := by sorry
audit_theorem AlgalControl.admitted
