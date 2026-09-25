# Parser fixtures

These are retained actual TLC 1.7.4 `-tool` logs used only to test the raw-output
parser. They are not admitted current model results and cannot activate a ledger
claim. Tests wrap them in explicitly synthetic command-completion metadata.

- `safety.log`, `action.log`: first Phase02 Custody model and its reachable
  `NeverAcquirePrimary` action counterexample, 2026-09-23.
- `liveness.log`: the earlier temporary three-actor custody prototype with its
  sole `EventuallyDone` property and fairness deliberately omitted, 2026-09-23.

- `one-variable.txt`: Phase05 MailboxProtocol unsafe consumed-message revival,
  with TLC's single-variable record-state format, 2026-09-23.
- `branched-temporal.txt`: Phase05 MailboxProtocol selected-receive liveness,
  with two temporal branches, an intermediate check and the completed full-space
  check. This is actual output from the 9,280-state model, 2026-09-23.

The temporal parser pairs each start/end and binds branch counts to the actual
declaration. For the qualified full-state, non-tableau profiles it requires the
complete total to equal branch count times distinct states. General tableau graph
sizes are not admitted by that rule. TLC reports the sum of its branch graph
sizes in [LiveCheck.check0](https://github.com/tlaplus/tlaplus/blob/v1.7.4/tlatools/org.lamport.tlatools/src/tlc2/tool/liveness/LiveCheck.java#L185).

No source/tool-currentness claim is made from these parser examples. Operational
suite admission re-executes the inventory and rechecks the live definition/tools.
