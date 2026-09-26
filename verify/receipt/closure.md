# Receipt closure

Phase 14 of `docs/formal-verification-plan.md` requires: *"Artifact
byte/depth/node closure is established or typed bounded failure preserves
custody."* In `verify/properties.json` this is RCP-05 (finding F09): *"Every
supported produced receipt/bundle is consumable within parser bounds or
execution returns a bounded typed failure preserving effect uncertainty."*

This directory states that obligation in checkable form:

- `bounds.ts` mirrors — line for line — the resource predicate in
  `checkReceiptResources` (src/run.ts:1864-1906) and the derived field caps
  in `parseReceiptFields` (src/run.ts:1853-1855, 1908-1984), and decides the
  closure class of a measured run summary.
- `closure.test.ts` + `fixtures.ts` exercise the decision on measured and
  boundary fixtures, including the F09 counterexample shape.

## The obligation, stated

For every **permitted execution** — a compiled admitted manifest plus
arguments admitted by `checkRunArgs` (src/run.ts:190-229) — `runOrganism`
terminates in exactly one of two sanctioned shapes:

1. **Minted.** It resolves with a `algal.run.v1` receipt that passed
   `checkReceiptResources` and `parseReceiptFields` at mint
   (src/run.ts:280-291), is digested, and is re-admitted by `parseRunReceipt`
   (src/run.ts:1859-1862) and by `FileStore` document admission
   (`putReceipt`/`getReceipt`, src/store.ts:178-185).
2. **Typed bounded failure.** The mint envelope check throws
   `AlgalError("BUDGET_EXHAUSTED", …)`; the mint path catches it and rethrows
   the same code carrying `details = {outcome, failure, work}` — the run's
   measured accounting — preserving `uncertain` (src/run.ts:279-288). No
   receipt object exists anywhere, so nothing unrepresentable can be stored,
   parsed or replayed. Custody is preserved: the thrown error is itself the
   bounded evidence, and journaled callers keep their started records
   (see the process-custody gap below).

Any other termination — a resolved receipt that would fail admission, a
thrown code outside the bounded-failure channel, or a summary inconsistent
with what a run can produce — is a closure violation. `decideRunClosure`
classifies these as `invalid`.

## The bound set and where each is enforced

| Bound | Value | Enforced at | Notes |
| --- | --- | --- | --- |
| receipt envelope nodes | 1,000,000 | mint `BUDGET_EXHAUSTED` (src/run.ts:280); parser `PARSE_FAILED` (src/run.ts:1860) | `checkReceiptResources` LIFO walk; array positions count (holes as null, `i in value` covers inherited/non-enumerable slots); object members via `Object.entries` — own enumerable only |
| receipt envelope depth | 64 (root = 0) | same | pops refuse `depth > 64` |
| receipt string bytes | 67,108,864 | same | accumulated UTF-8 bytes of string values + object keys; strictly under canonical bytes, so it is an early-exit for the same bound — it never changes the verdict, only which bound name fires |
| receipt canonical bytes | 67,108,864 | same | `canonicalBytes(u)` after the walk (src/run.ts:1903) |
| receipt cells | 65,536 | `parseReceiptFields` (src/run.ts:1942) | = `BOUNDS.maxSteps` × `BOUNDS.maxCells` (src/run.ts:1853) |
| receipt effects | 16,448 | `parseReceiptFields` (src/run.ts:1968) | = `maxSteps` × `maxTurns` + `maxAgentCalls` (src/run.ts:1854) |
| receipt events | 4,096 | `parseReceiptFields` (src/run.ts:1971) | `emit` hard-caps the log at the same value (src/run.ts:299-302) — a minted receipt may carry a log truncated exactly at the cap |
| receipt args bytes | 1,048,576 | `parseReceiptFields` (src/run.ts:1923) | identical accounting already applied at admission by `checkRunArgs` |
| store document | 1,000,000 nodes / 64 depth / 67,108,864 file bytes | `storeJson` (src/store.ts:27-47) on read and write; file byte cap in `read`/`publish` (src/store.ts:88-143) | a second, independent 1M-node bound on the same document class; `storeJson` counts enumerable members (`Object.values`), not serialized positions |
| process receipt custody | 100,000 nodes / 64 depth / 16,000,000 canonical bytes | `boundedValue` (src/process.ts:98-118) at `PROCESS_BOUNDS.maxReceiptBytes` (src/process.ts:67): applied post-mint at src/process.ts:791 and on `runs/` readback (src/process.ts:805, 928) | strictly tighter than the receipt envelope on nodes and bytes |
| journal value | 100,000 nodes / 64 depth | `hostValue` (src/host-state.ts:19-42) | bounds journaled effect records (`process-journal.ts:209`) and process records — not the run receipt; per-record bytes ≤ 1,048,576 and journal total ≤ 16,777,216 (`JOURNAL_BOUNDS`, process-journal.ts:8) |
| evidence export | 1,000,000 nodes / 64 depth / 67,108,864 bytes + count caps | `boundedDocument` (src/process-evidence.ts:60-109), `PROCESS_EVIDENCE_BOUNDS` (src/process-evidence.ts:36-46) | bounds the whole exported document (≤129 records, ≤64 receipts, ≤512 manifests/values/missing, ≤64 tools) — a per-receipt screen is necessary, not sufficient |
| bundle transport | 64 depth / 1,000,000 nodes / 67,108,864 bytes | `bundleDocumentBudget` (src/bundle.ts:19-80), `BOUNDS.maxBundleBytes` | closure documents carry manifests and values; receipts move through the store or evidence export |
| run args (pre-execution) | depth ≤ 64, canonical ≤ 1,048,576 bytes | `checkRunArgs` (src/run.ts:190-229) → `BUDGET_EXHAUSTED`/`PARSE_FAILED` before any cell runs | a refused run never executes — a separate, already-typed channel upstream of this obligation |
| native mirror | 1,000,000 / 64 / 67,108,864 | `resources` (crates/algal/src/receipt.rs:137-175), `validate_produced` (receipt.rs:132-135); `store.rs:114, 639` | same envelope; see walker-order note below |

### Producer-side invariants behind the field caps

The field bounds cannot be reached at mint — each has a producer-side cap
strictly below it:

- `cells` ≤ activated cells ≤ `work.steps` ≤ `budgets.maxSteps` ≤ 1,024
  (src/run.ts:487-491; manifest budgets cap at `BOUNDS.maxSteps`,
  src/contract.ts:1453).
- `events` ≤ 4,096 by `emit`'s own cap (src/run.ts:300).
- `args` canonical ≤ 1 MiB by `checkRunArgs` before the run starts.
- `effects` ≤ per-activation pushes ≤ `maxSteps`·`maxTurns` +
  `maxAgentCalls` — the constant's derivation.
- A failed outcome always carries its failure record and no other outcome
  does (src/run.ts:269-274 with the handled-edge delete at run.ts:565);
  `decideRunClosure` enforces this coherence on summaries.

Because of this, `parseReceiptFields` at mint (src/run.ts:289) is a backstop
that cannot fire on a genuinely produced receipt — it runs *outside* the
`try` that attaches `{outcome, failure, work}`. If it ever did fire, the
throw would be `PARSE_FAILED` *without* the measured-work payload. That
third arm is classified `invalid` here: it would be a producer defect, not
the designed bounded failure.

## The measured counterexample

`record-orders` size 7 (scripts/source-scaling.ts:210-240) is the F09 shape:
each of 7 regions calls 4 desks × 3 checks of 16 32-field `Order` records of
32-field `Line`s. The ~48 KB input value is copied into every input-cell
record across 120 expanded instances, so the minted envelope would carry
**1,385,149 nodes** — over the 1,000,000-node bound — at depth 7 with a body
of roughly 55 MB. The run itself had already failed `BUDGET_EXHAUSTED` at
`maxSteps` 1,024 with work {steps: 1,024, agentCalls: 0, units: 1,349,157}
(docs/scale-measurements.md; reproduced via `measuredRun`).

Pre-admission bounds pass: every input value is under `maxValueBytes`
(262,144), args are under `maxArgsBytes`, the run is schedulable. The closure
fires only at the mint envelope check — which is exactly why the typed
failure arm must exist and must carry the measured work. The amplification
(per-input values replicated per cell record) is the substance of F09.

Control: `record-orders` size 1 mints fine — measured envelope 421,330
nodes, depth 8, 16,767,671 string bytes, 19,154,560 canonical bytes, 310
cells, 0 effects, 312 events, 48,245 args bytes — yet it **already exceeds
process custody** (100,000 nodes / 16,000,000 bytes). It is a minted receipt
that a durable process cannot retain.

## Residual gaps

1. **Mintable ≠ process-storable.** The durable-process custody profile
   (100,000 nodes / 16 MiB) is strictly tighter than the mint/parser/store
   envelope (1,000,000 / 64 MiB). A receipt between the two — e.g. the
   measured size-1 fixture — mints, parses and stores, then throws
   `BUDGET_EXHAUSTED` at `executeIntent`'s post-mint `boundedValue` check
   (src/process.ts:791). That throw lands after journal settlement, so the
   process keeps custody through the journal's started records rather than
   through the receipt. RCP-05's unresolved notes record the repaired
   defect class (journaled effect records over the 100,000-node host
   reader) and the remaining open items (pre-effect capacity reservation,
   full-prefix preservation, settlement convergence). This suite's
   per-profile `admission` report exists to keep the gap visible: closure
   today means *parser + FileStore + evidence transport*, with process
   custody reported separately.
2. **The bounded failure is not a receipt.** `details = {outcome, failure,
   work}` is constant-size — always reportable, so the failure evidence
   itself cannot exceed bounds — but it has no digest, no canonical form,
   and is not admissible to `parseRunReceipt`, `verify` or replay. Custody
   is preserved operationally (a typed thrown error plus journaled intent);
   it is not preserved *as evidence*.
3. **Event truncation is silent by design.** `emit` stops at 4,096 events
   (src/run.ts:300). A minted receipt at the cap is admissible but its event
   stream is a prefix — closure is about representability, not completeness.
4. **Admission is necessary, not sufficient, for mintability.**
   `checkRunArgs` admits arg values to depth 64, but the envelope re-nests
   them — ~3 levels under `args.<cell>.<port>` and ~4 under the cell-record
   copy at `cells.<path>.outputs.<port>`. Args nested 61–62 deep are admitted
   and then refused at mint; 59–60 mint; 63 is refused at admission
   (src/receipt-closure.test.ts depth probe). The slack is closed by the typed-failure arm, not by
   tighter admission — the same holds for node/byte amplification across
   cell records, where each input is individually in-bounds.
5. **Store walker asymmetry.** `storeJson` counts enumerable members
   (`Object.values`); the receipt walker counts serialized positions (`i in
   value`, holes → null). A caller-supplied *sparse* array can pass
   store-side node counting, densify under canonicalization, and be retained
   as a document the store's own reader then refuses (up to ~16.7 M holes
   under the 64 MiB file cap). Minted receipts cannot contain sparse arrays
   — the mint walk counts positions — so this is a document-class gap, not a
   receipt-class one; worth a separate look under the store's own
   write/read closure obligation.
6. **Code overloading at mint.** `checkReceiptResources` reports *every*
   failure under the caller's code — at mint even "receipt must contain
   only JSON values" surfaces as `BUDGET_EXHAUSTED`. Typed and bounded, but
   a producer defect would masquerade as exhaustion.
7. **Native walker ordering.** `crates/algal/src/receipt.rs:137-175` applies
   the same bounds with two internal differences: its array/object
   pre-checks omit the already-visited node count the TS array arm includes,
   and it batch-extends `pending` rather than checking per push. The
   accept/reject set is identical (the pop-side `nodes > 1,000,000` still
   decides); only the trip point inside a violating tree can differ. The
   native field checks additionally cap `toolCalls` at 1,000,000 elements
   explicitly (receipt.rs:258) where TS relies on the node bound alone.
8. **This suite is finite.** The decision predicate, boundary algebra, and
   two measured runs are tested; the universal claim — *every* permitted
   execution closes — wants producer-instrumented measurement across the
   generated families and the native mirror. Nothing here mints or runs.

## How to read the decision

```ts
decideRunClosure(summary) →
  | { kind: "mintable", admission }         // all arms hold; per-consumer report
  | { kind: "bounded-failure", code: "BUDGET_EXHAUSTED", exceeded, admission, details }
  | { kind: "invalid", reason }             // malformed, inconsistent, or off-channel
```

`exceeded` names the envelope bounds a measurement violates, in predicate
order (nodes, depth, stringBytes, canonicalBytes); it is empty when the
summary reports only the thrown channel. `details` echoes the exact payload
the runtime attaches to the mint failure.
