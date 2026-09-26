# Host conformance contract — Phase 16 foundation

This document publishes the obligations every host-supplied callback must meet
when it participates in an admitted Algal run. It is the contract the
`verify/host/` harness checks and the reference later adapter batches cite.

Two evidence classes are distinguished throughout:

- **`testable-now`** — checkable deterministically in-process (fixture
  executors/tools/stores/transports, `mkdtemp` stores, injected clocks). Every
  obligation of this class has a case in `conformance.ts`.
- **`live-only`** — requires a real provider, subprocess, filesystem durability
  boundary, or OS surface. Fixtures document the obligation and name the
  enforcement point, but no fixture result qualifies a live adapter.

Nothing in this file upgrades evidence. Deterministic fixture conformance is
"tested" evidence in the `verify/` ledger sense — never provider qualification.

## Global invariants

These hold for every seam and are restated per seam only where the mechanism
differs.

- **Callback purity under verification.** `verifyReceipt` admits no executor
  argument; replay serves recorded receipts by request digest. A host callback
  invoked inside verification must not write receipts, memos, slots, or the
  backing store — `replayStore` absorbs any such write into an ephemeral
  overlay. `hc-ex-verify-purity`, `hc-tl-verify-purity`.
- **Exact shapes.** Every value crossing a host boundary is parsed from
  `unknown` through the contract parsers with closed key sets. Unknown keys,
  missing required fields, and wrong types fail `PARSE_FAILED` /
  `TYPE_MISMATCH` / `EFFECT_UNPARSEABLE`.
- **Bounded values.** Every byte count, depth, list length, and duration has a
  declared ceiling enforced before allocation.
- **Honest cost reporting.** Host-reported accounting inputs (`usage`,
  signature `cost`) are declared data or bounded metadata — a callback cannot
  inject an arbitrary number into `work.units` or `usage.*` unrecorded, and
  malformed values fail receipt minting.
- **Configuration identity.** `journalConfigurationFor` /
  `configurationDigest` must be a valid digest; the value recorded on the
  receipt is the execute-path claim, so a stale or malformed identity fails or
  is reported verbatim.
- **Cancellation is intent, not evidence.** `AbortSignal` delivery is advisory;
  an abort never proves remote work stopped and never substitutes for the
  authoritative completion path.
- **Uncertain completion is preserved.** Deadlines, lost acknowledgements, and
  killed children surface as `uncertain` outcomes (`retryable: false` on the
  recorded effect); the scheduler does not auto-retry them; a timeout never
  implies remote rollback.
- **Secrecy.** Credentials and subprocess diagnostics never appear in
  receipts: error messages record a fixed string; provider metadata fields
  outside the contract are dropped, not recorded.

## Executor — `src/effects.ts`, dispatched by `src/run.ts`

Obligations on `Executor` implementations (`gateway`, `openai-compatible`,
`commandExecutor`, `decisionExecutor`, `recallExecutor`, adapters):

| ID | Obligation | Class | Case |
|----|------------|-------|------|
| HC-EX-01 | `execute`/`executeEffect` results must be JSON values binding the cell's declared output contract; non-JSON results (undefined, functions, BigInt, cyclic objects) must never appear on a minted receipt | testable-now | `hc-ex-exotic-output`, `hc-ex-receipt-shape` |
| HC-EX-02 | Output exceeding `budget.maxOutputBytes` fails the cell `BUDGET_EXHAUSTED`; the oversized value may remain on the failed receipt as evidence but never binds a port | testable-now | `hc-ex-oversized-output` |
| HC-EX-03 | `metadata.usage` is `{model ≤128 chars, tokensIn/tokensOut nonneg safe int}`; malformed usage fails receipt minting (`PARSE_FAILED`/`BUDGET_EXHAUSTED`) — invalid host-reported cost cannot silently corrupt accounting | testable-now | `hc-ex-invalid-usage` |
| HC-EX-04 | `receiptFor`/`journalConfigurationFor`/`metadata.configurationDigest` must be a `sha256:` digest; the execute-path claim is what the receipt records | testable-now | `hc-ex-config-digest` |
| HC-EX-05 | Cancellation is advisory: an abort listener may not overwrite the deadline's classification, and output resolving after `maxEffectMs` is discarded — late results never merge into the receipt | testable-now | `hc-ex-late-result`, `hc-ex-abort-classification` |
| HC-EX-06 | A deadline expiry is recorded `BUDGET_EXHAUSTED` with `retryable: false`; declared `retry.attempts` is declined — uncertain completion is never auto-retried | testable-now | `hc-ex-deadline-uncertain` |
| HC-EX-07 | Under `verifyReceipt` no live executor is dispatched and no write escapes the replay overlay | testable-now | `hc-ex-verify-purity` |
| HC-EX-08 | `metadata` fields outside the closed set (executor/usage/cached/retryable/wake/configurationDigest) are dropped; a credential-shaped value in metadata cannot reach a receipt. `metadata.executor` is recorded verbatim — a claim about identity, not authority | testable-now | `hc-ex-metadata-closed` |
| HC-EX-09 | `capabilities.effects` and `route` gate dispatch: an executor is never invoked for a kind it did not declare, and an unmatched provider route fails `EFFECT_UNBOUND` | testable-now | `hc-ex-routing` |
| HC-EX-10 | Suspension requires `EFFECT_SUSPENDED` plus 1–16 well-formed `cap:` wake handles; malformed handles fail `PARSE_FAILED`/`TYPE_MISMATCH`; a suspended effect is `retryable: false` | testable-now | `hc-ex-suspension` |
| HC-EX-11 | `journal.before` returns exactly one of intent/receipt; a returned receipt must name the bound requestDigest; uncertain results are journaled then re-thrown — a journal cannot convert cancellation into settlement | live-only (journal-bearing dispatch) | — |
| HC-EX-12 | `commandExecutor`-class adapters kill only their own children; exit 75 suspends; other nonzero exits fail; a dead child still leaves completion uncertain | live-only (real subprocess) | — |

## Store — `src/store-contract.ts` (`FileStore`, `MemoryStore`, `replayStore`)

| ID | Obligation | Class | Case |
|----|------------|-------|------|
| HC-ST-01 | CAS reads return exactly the content digesting to the key; `FileStore` re-digests on read, so corrupted bytes are `DIGEST_MISMATCH`, never served | testable-now | `hc-st-cas-integrity` |
| HC-ST-02 | `putEffect`/`getEffect` are keyed by `(requestDigest, executor)` and first-wins; a retained memo claiming another requestDigest is `DIGEST_MISMATCH`; malformed receipts never publish | testable-now | `hc-st-memo-keying` |
| HC-ST-03 | Store writes are bounded (documents ≤ `STORE_BOUNDS.maxDocumentBytes`, slots ≤ `BOUNDS.maxBlobBytes`, slot names are safe ids) | testable-now | `hc-st-bounds` |
| HC-ST-04 | Under `replayStore`, `getEffect` reads only the overlay and every `put*`/`setSlot` lands in the overlay — verification mutates no live store | testable-now | `hc-ex-verify-purity` |
| HC-ST-05 | Durable fsync/publish ordering across power loss, symlink refusal on retained paths | live-only | — |

## Tool — `src/tools.ts` + `toolAttempt` in `src/run.ts`

| ID | Obligation | Class | Case |
|----|------------|-------|------|
| HC-TL-01 | `parseToolSignature` is the admission gate: closed keys, `effect` ∈ `read|write`, integer cost `0..1_000_000`, `maxOutputBytes` `1..maxValueBytes` | testable-now | `hc-tl-signature-admission` |
| HC-TL-02 | A tool returns a record bounded by `maxOutputBytes`; oversized results fail `BUDGET_EXHAUSTED`, non-record results fail `TYPE_MISMATCH`, undeclared ports are rejected | testable-now | `hc-tl-output-bound`, `hc-tl-nonrecord` |
| HC-TL-03 | Accounting charges `signature.cost + result bytes` — the callback cannot report or evade the admitted cost | testable-now | `hc-tl-cost-charge` |
| HC-TL-04 | A tool exceeding `budget.maxEffectMs` is recorded uncertain (`BUDGET_EXHAUSTED`, `retryable: false`), not retried | testable-now | `hc-tl-deadline` |
| HC-TL-05 | Under verify, tool cells replay recorded receipts; a receipt lacking the tool's effect fails `EFFECT_UNBOUND` and live tool code is never invoked | testable-now | `hc-tl-verify-purity` |
| HC-TL-06 | `context.requestDigest`/`idempotencyKey` are digest-shaped and stable under replay; a `write`-effect tool must honor idempotency — the runtime supplies identical keys, the host honors them | live-only for side-effect honoring | `hc-tl-verify-purity` covers the supply side |

## Transport — `src/transport-contract.ts`

| ID | Obligation | Class | Case |
|----|------------|-------|------|
| HC-TR-01 | `getBundle` may only deliver content under its own digests — a wrong-root bundle installs nothing under the requested name; the `via` cell fails `STORE_MISS`/`DIGEST_MISMATCH` | testable-now | `hc-tr-wrong-root` |
| HC-TR-02 | Returned bundles re-parse through `unpackBundle`: closed keys, member digests recomputed — malformed or tampered members fail `PARSE_FAILED`/`DIGEST_MISMATCH` | testable-now | `hc-tr-malformed` |
| HC-TR-03 | Nondelivery (`null`) is `STORE_MISS`; a thrown transport error propagates as failure — neither silently installs | testable-now | `hc-tr-nondelivery` |
| HC-TR-04 | Latency/size self-bounds on real transports (`httpTransport` timeout + `maxBytes`, `fileTransport` bounded reads) | live-only | — |

## MemoryAdmissionHost + MemoryQueryEngine — `src/application-memory.ts`

| ID | Obligation | Class | Case |
|----|------------|-------|------|
| HC-MA-01 | `decodeObservation` results are re-bounded (≤32 claims), re-parsed (`parseMemoryClaim`), and schema-checked — malformed, undeclared, or overflowing claims are rejected before an observation mints | testable-now | `hc-ma-claims-bound` |
| HC-MA-02 | `identity` (and the engine's) must be a `sha256:` digest at construction | testable-now | `hc-ma-identity` |
| HC-MA-03 | Decoding must be deterministic: `admit()` re-decodes and requires equality with the stored claims — a drifting decoder is caught | testable-now | `hc-ma-unstable-decode` |
| HC-MA-04 | Callback inputs are `structuredClone`d — mutating an argument cannot affect service state | testable-now | `hc-ma-input-isolation` |
| HC-MA-05 | `validateScope`/`currentFrontier`/`decodeObservation` must verify actual receipt bindings and authority — CAS strings are not authentication; callbacks must be pure validation/decoding, bounded, and must not dispatch | live-only (attestation policy is host-owned) | — |
| HC-MA-06 | A query engine must report `{complete, result}` with `snapshot`/`program`/`witnessPolicy` matching the admitted derivation or `{incomplete, status ∈ exhausted|failed|cancelled}`; a lying engine produces a failed derivation, never a resolved one; `verify` must return a boolean; `settle` must terminate | partially testable (binding mismatch → failed derivation); live-only for real engines | — |

## MailboxService — `src/mailbox.ts`

| ID | Obligation | Class | Case |
|----|------------|-------|------|
| HC-MB-01 | `send` is idempotent on `idempotencyKey`: same key + same message returns the same id; same key + different message is `DIGEST_MISMATCH`; bounded by `maxMessages`/`maxMessageBytes` | testable-now (MemoryMailboxService exercises the contract) | `hc-he-lost-ack` exercises the key path |
| HC-MB-02 | `receive` consumes (never requeues) and suspends with `EFFECT_SUSPENDED` when empty; capability handles are unforgeable and revocable | partially testable | `hc-he-lost-ack` covers consume-once |
| HC-MB-03 | Durable publication, conflict detection on partial writes, cross-process identity | live-only (`FileMailboxService`) | — |

## HostEventService — `src/host-events.ts`

| ID | Obligation | Class | Case |
|----|------------|-------|------|
| HC-HE-01 | `dueAtMs` gates delivery against the injected `HostEventClock`; host clocks never enter VM receipts | testable-now | `hc-he-due-gating` |
| HC-HE-02 | Event identity is `(source, deliveryId)`: identical re-admission deduplicates, conflicting re-admission is `DIGEST_MISMATCH` | testable-now | `hc-he-conflict` |
| HC-HE-03 | All declared bounds hold: ≤1024 events, ≤64KiB payloads, ≤72KiB records, ≤30d timer horizon; poll options bounded (passes/deliveries/duration/interval) | testable-now | `hc-he-bounds` |
| HC-HE-04 | Marker chain is `pending → sending → delivered` or `pending → cancelled`; once `sending` intent is published, cancel is too-late and delivery still completes | testable-now | `hc-he-cancel-ordering` |
| HC-HE-05 | A send whose acknowledgement is lost stays `sending`; restart retries under the same `idempotencyKey` (the event's own identity) — the message is consumed at most once, `messageId` is stable | testable-now | `hc-he-lost-ack` |
| HC-HE-06 | `poll` reasons are exactly `idle|cancelled|pass-limit|delivery-limit|duration-limit` and honor the injected clock | testable-now (partially — bound checks) | `hc-he-bounds` covers option admission |
| HC-HE-07 | Marker/event durability across power loss; lease exclusion under real multi-writer contention | live-only | — |

## Bounded streams + command envelope — `src/io-runtime.ts`

| ID | Obligation | Class | Case |
|----|------------|-------|------|
| HC-IO-01 | `boundedBytes` rejects overflow at the byte bound and cancels the reader; invalid limits are rejected before any read — the bound is checked before allocation | testable-now | `hc-io-overflow`, `hc-io-invalid-limits` |
| HC-IO-02 | Abort mid-read cancels the stream and surfaces `BUDGET_EXHAUSTED` — a bounded read cannot hang | testable-now | `hc-io-abort-mid-stream` |
| HC-IO-03 | `commandJson` validates timeout `1..600_000`, stdout bound `1..64MiB`, pre-aborted signal, and stdin ≤1MiB **before** spawning | testable-now | `hc-io-command-gates` |
| HC-IO-04 | Subprocess semantics: timeout/cancel → SIGKILL + uncertain `BUDGET_EXHAUSTED`; signal termination → uncertain `EFFECT_FAILED`; exit 75 → `EFFECT_SUSPENDED`; other nonzero → `EFFECT_FAILED` with "diagnostics withheld"; stderr bounded to 64KiB and never enters the error message | live-only (real subprocess; `src/io-runtime.test.ts` covers the parent-managed `sleep` path) | — |

## Recall + decision providers — `src/semantic-contract.ts`, `src/decisions.ts`

| ID | Obligation | Class | Case |
|----|------------|-------|------|
| HC-SE-01 | A `RecallSearcher` returns ≤`k` hits of the exact `{id, source, seq, score, text, ref?}` shape; over-k or malformed hits fail `EFFECT_UNPARSEABLE` | testable-now | `hc-se-over-k-hits` |
| HC-DA-01 | A `DecisionAsker` returns answers binding the derived question schema; malformed answers fail `EFFECT_UNPARSEABLE`; a `gate` is never routed to a decision provider | testable-now | `hc-da-decide-shape` |
| HC-DA-02 | Provider usage maps to receipt `usage` fields unchanged and bounded; state bytes bounded by `maxStateBytes` | testable-now (shape) / live-only (provider) | `hc-ex-invalid-usage` covers admission |

## Credential custody — `src/credentials.ts`

| ID | Obligation | Class | Case |
|----|------------|-------|------|
| HC-CR-01 | Keys pass `checkCredentialShape` (8..8192 chars, no whitespace); `redact` exposes at most the last 4 characters | testable-now | asserted in `conformance.test.ts` |
| HC-CR-02 | Vault backends are `keychain` or `file` under `~/.algal`; resolver results are digested for `cacheIdentity` without exposing the key; credentials never enter receipts, prompts, logs, or capability handles | live-only (real vault/OS) | — |

## What this contract does not yet cover

- Live adapters: `gateway`, `openai-compatible`, `commandExecutor`, `jev`
  (typed-decision), `xcb`/shepherd (delegated coding), ACP, GitHub, retrieval,
  repair, browser/application adapters — Phase 16 batches.
- OS-durability claims (fsync ordering, cross-process lock contention, power
  loss) — partially covered by `src/*.test.ts`, not asserted here.
- The `RuntimeJournal` protocol beyond the documented obligations — journal
  conformance lands with the adapter batches that depend on it.
