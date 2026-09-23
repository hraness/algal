# Parser fixtures

These are retained actual TLC 1.7.4 `-tool` logs used only to test the raw-output
parser. They are not admitted current model results and cannot activate a ledger
claim. Tests wrap them in explicitly synthetic command-completion metadata.

- `safety.log`, `action.log`: first Phase02 Custody model and its reachable
  `NeverAcquirePrimary` action counterexample, 2026-09-23.
- `liveness.log`: the earlier temporary three-actor custody prototype with its
  sole `EventuallyDone` property and fairness deliberately omitted, 2026-09-23.

No source/tool-currentness claim is made from these parser examples. Operational
suite admission re-executes the inventory and rechecks the live definition/tools.
