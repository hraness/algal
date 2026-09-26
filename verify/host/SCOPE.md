# Phase 16 foundation slice — scope

Phase 16 validates the assumptions the mathematical models leave at the host
boundary. This slice is the **foundation**: the published contract, the
violation-harness skeleton, and the first fixtures for the callback seams.
Later batches extend it to the specific adapters.

## What this slice covers

- `contract.md` — the conformance contract for the callback seams: `Store`,
  `Executor`, `Tool`/`ToolRegistry`, `Transport`, `MemoryAdmissionHost` +
  `MemoryQueryEngine`, `MailboxService`, `HostEventService`, bounded streams +
  the command envelope, recall/decision providers, and credential custody.
  Every obligation is marked `testable-now` or `live-only`.
- `fixtures.ts` — deterministic, serializable fixture data: bounded streams
  checked before allocation, a deadline-exceeding executor response, a
  stale-config digest pair, a cancellation-during-stream vehicle, the
  uncertain-completion (lost-ack) marker, malformed usage/receipt/signature
  tables, and a memory-admission fixture. No real credentials or endpoints.
- `conformance.ts` — violation wrappers (`oversizedOutputExecutor`,
  `invalidUsageExecutor`, `hangingExecutor`, `lateResolutionExecutor`,
  `abortHonoringExecutor`, `malformedConfigExecutor`, `shiftingConfigExecutor`,
  `exoticOutputExecutor`, `exoticMetadataExecutor`, `suspendingExecutor`,
  `recallOnlyExecutor`, `dishonestTransport`, `scriptedAdmission`,
  `lostAckMailboxes`, `gatedMailboxes`) plus a 40-case catalog
  (`HOST_VIOLATION_CASES`) and `runHostConformance()` producing a stable
  per-case report.
- `conformance.test.ts` — `bun:test` entry: one test per case, grouped by
  seam, plus a catalog-level invariant (every seam covered, every case
  conformant, stable obligation ids).

## Deferred to later Phase 16 batches

| Area | Why deferred |
|------|--------------|
| `gateway` / `openai-compatible` executors | live HTTP provider adapters — fixture conformance here covers the *shared* `Executor` contract they must satisfy; provider-specific request/response conformance is per-adapter work |
| `commandExecutor` / ACP boundary / native `algal.host.v1` | needs real subprocesses (signal, exit-75, kill ownership) — live-only |
| `jev` typed-decision provider | adapter-specific response handling; the generic `decisionExecutor` surface is covered |
| `xcb` / shepherd delegated coding | coding-task custody, workspace binding, non-cacheable + non-retryable uncertainty — dedicated batch |
| credential custody end-to-end | vault backends (`keychain`/`file`), resolver, env custody — needs OS surfaces; the pure shape/redact contract is covered (`hc-cr-custody`) |
| semantic index persistence / recall over real stores | index lifecycle + tamper fixtures — the searcher contract surface is covered (`hc-se-over-k-hits`) |
| retrieval / repair / GitHub adapters | later adapter batches |
| `RuntimeJournal` recovery paths | journaled dispatch + token recovery — needs the journal protocol fixtures a later batch owns |
| OS-durability claims | fsync ordering, cross-process lease contention, power-loss recovery — partially covered by `src/*.test.ts`; a durability batch may add property evidence |

## What this slice is NOT

- **Not provider qualification.** A passing `bun test verify/host/` is
  deterministic fixture evidence (`tested` in the ledger's sense). It says
  nothing about a real provider, a real subprocess, or a real filesystem under
  adversarial conditions.
- **Not a proof.** The harness demonstrates that violations are *rejected or
  handled per contract* on the exercised paths — it does not prove no path
  exists where a violation passes.
- **Not a completed Phase 16.** The HST property family stays unclaimed; this
  slice establishes the contract and the harness the adapter batches extend.
