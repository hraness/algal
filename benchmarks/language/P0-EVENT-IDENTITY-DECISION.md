# P0 event identity decision, 2026-10-12

**Agent-decided, owner may revisit.** For one behavior revision and actor, a
source's sequence is a logical-event key. Its first admitted canonical type and
payload bind that key. Identical later input is a duplicate, including when a
host assigns another delivery identity; changed type or payload is an
`EVENT_LOOP_ID` conflict and must not trigger a second transition. Different
sources may reuse a sequence. A distinct actor or behavior revision has a
distinct key scope.

Rationale: including type and payload in the full event digest alone lets a
source silently reuse its sequence with different content and mint a new event.
Likewise, deduplicating only message ids lets a changed delivery id settle the
same logical event again. Both would undermine the north star's fail-closed
identity and duplicate-delivery rules. The additive key binding preserves the
existing full-content digest for content addressing without making a digest a
permission to overwrite a prior delivery.

`spec/v1/event-loop.md` specifies the conflict, duplicate, and retained
host/replay behavior. `event-sequence.ts` provides a bounded post-schema vector
check. The fixture-admission path in `contract.test.ts` calls it after schema,
byte-limit, and digest checks; the colocated tests exercise re-digested changed
type and payload conflicts, exact redelivery, distinct keys, canonical payload
ordering, and the 1..256 vector bound. These are contract-fixture tests, not a
runtime, durable host, or cross-runtime replay.

**Remaining delivery gates:** independently review the combined tree and obtain
a new exact-head `Required` result. The older green CI run for `023797a4` does
not cover this decision or these tests. Local application-parity timeout and
socket-restricted aggregate checks remain unresolved local results; clean CI on
the earlier head is not a local pass. Keep PR #276 draft until a fresh
integration recommendation explicitly reconciles the environment and gates.
