# Verification rebase audit: a86327f to 353a5ca

This report rebases the 2026-09-23 formal-verification audit onto runtime source
`353a5cac4ea2b2ae40e00bf9c2805606265a5378`, from
`a86327f76f6e632fe7fceda17b738a749a341ab6`. It is Phase 00 evidence, not a
verification result or a production repair. The comparison contains 60 changed
files, 9,904 added lines and 277 deleted lines, including generated-size query
fixtures, examples, tests and documentation.

The review read the current `AGENTS.md`, the formal-verification plan, the
changed application and inference implementations, their contracts, relevant
tests and parity drivers. It inspected the existing durability paths where the
new features depend on them. No test, build, provider request, crash experiment
or model checker was run. Existing test assertions below are evidence locations,
not fresh passing results. References and line numbers describe the pinned
runtime source above; concurrently authored verification infrastructure is not
part of that runtime revision.

## Original findings after rebasing

None of F01–F12 is closed by this source delta. Previously reproduced findings
retain their historical reproduction status; this review did not rerun them on
the new head. Source-supported schedules remain unexecuted schedules.

| Finding | Rebase result | Evidence and next phase |
| --- | --- | --- |
| F01: inherited source-port name | Relevant graph admission source unchanged. | `src/graph.ts`; Phase 01 retains the own-property counterexample. |
| F02: pure-case `maxCases` verifier gap | Unchanged predicate gap. Optional research-policy parsing does not repair the pure-case verifier. The new research verifier independently checks its corpus count. | `src/application-adaptation.ts:320` checks during production; `:335–363` verifies without the count check. The native adaptation diff only adds optional `research` parsing. `src/application-research.ts:149` checks research count. Phase 01 repair, Phase 15 imported-evidence tests. |
| F03: malformed UTF-8 FileStore acceptance | Relevant byte-decoding paths unchanged. | `src/store.ts:214`, `src/host-state.ts:39`, `crates/algal/src/canonical.rs:8`; Phase 01. |
| F04: creation-custody cutover | Selection-to-acquisition gap remains. Added serial contention records do not test or repair it. | `src/application.ts:193–217`, `crates/algal/src/application.rs:1047–1118`; Phase 02. |
| F05: filesystem directory persistence | Store/mailbox publication helpers unchanged. New application evidence uses these helpers and inherits their durability assumptions. | `crates/algal/src/store.rs:93–138`, `src/store.ts:223–255`, `src/mailbox.ts:470–505`; Phase 02. |
| F06: native first-wins effect cache | Native Store unchanged. | `crates/algal/src/store.rs:460–501`; Phase 01. |
| F07: evaluator artifact/target identity | Expression source/build/WASM unchanged. CI adds inference parity, not a source-to-WASM artifact check. | `scripts/build-expr-wasm.sh`, `crates/algal-expr/src/lib.rs:733`, `.github/workflows/ci.yml:72`; Phases 01 and 03. |
| F08: modeled work accounting | Scheduler/registry unchanged. New research accounting remains modeled work and adds a distinct per-role budget meaning. | `src/run.ts:552`, `src/registry.ts:9`, `src/application-research.ts:165–180`; Phases 07 and 15. |
| F09: raw evaluator and aggregate closure | Relevant evaluator boundary unchanged. New message evidence explicitly permits record-size omission, which must not be mistaken for universal producer/consumer closure. | `src/application-message.ts:101–104`; Phases 08, 10 and 14. |
| F10: common-mode verification/resource bounds | Memory/context/semantic source unchanged. Research uses native query verification and therefore inherits its semantic TCB. | `examples/application-research/study.ts:166`, `crates/algal/src/memory.rs:508`; Phases 08, 11 and 15. |
| F11: conditional authority/composition | Still applies. Pinned research verifier and signed example evidence add explicit authority, not independent proof of provider truth or executable provenance. | `src/application-research.ts:141–147,182–185`, `examples/application-research/study.ts:125–148`; Phases 14–17. |
| F12: mailbox custody/resource liveness | Mailbox and host lease implementations unchanged. Inference now adds another consumer of lease and persistence assumptions. | `src/mailbox.ts:692–709`, `src/host-state.ts:185–200`; Phases 05, 06 and 16. |

F04's original three-caller schedule remains applicable: A creates under the
pending-creation mutex; B observes no head, chooses that mutex, releases the
shared creation lease and pauses; A publishes and releases; C observes a head
and takes the permanent application mutex; B acquires the now-free pending
mutex. B and C can read the same expected head under different mutexes. Neither
the namespace scan nor the later quota lease rechecks that head under one
common application mutex. This is still a static schedule, not a reproduced
native or cross-runtime execution.

## New ledger obligations and phase ownership

The following identifiers append to the existing audit families. Their claims
must initially be marked unproven. The implementation and tests provide a
starting point for conformance work, not a basis for marking a theorem complete.

| ID | Precise obligation | Main evidence | Owning phases |
| --- | --- | --- | --- |
| APP-08 | Drain admission covers exactly the eligible undispatched set at the committed parent; abandonment cannot dispatch/reconcile or erase evidence; retained replay has an explicitly narrower contract; carried work preserves its admitted source identity. | `src/application-drain.ts:54–91`, `src/application.ts:290–337,429–451,539–544`; native `application_drain.rs:107–137`, `application.rs:1926–1966`. | 06 model and semantics decision; 08 adversarial/parity; 14 retained evidence; 15 migration composition. |
| APP-09 | A full interapplication delivery proof binds committed intent, original sender/operation/route, settled outbox identity, recipient and payload; optional local-channel evidence has a separate claim; a CAS-only record grants no delivery authority. | `src/application-message.ts:89–155`, `src/application.ts:568–574`; native `application_message.rs:110–220`. | 06 outbox model; 02 publication dependencies; 14 evidence closure; 16 host qualification. |
| APP-10 | Serial contention evidence binds one parent's direct child and exact commands; partial producer effects and time-dependent rejection verification are explicit; this record is not a concurrent linearizability proof. | `src/application-contention.ts:94–173`; native `application_contention.rs:142–279`; `spec/v1/application.md:350–375`. | 06 contract/model; 08 differential history cases; 14 audit semantics. |
| EVO-07 | Retained selection and experiment records join the exact application/parent/entrypoint/environment, candidate set, cases, scorer, policy and selection; promotion metadata is not evidence of committed activation. | `src/application-selection.ts:104–133`, `src/application-experiment.ts:99–228,272–289`, `src/application.ts:384–389`; native `application_selection.rs`, `application_experiment.rs`. | 14 evidence joins; 15 evolution/lineage. |
| EVO-08 | Sealed research admits only the frozen pure-strategy change, complete ordered attempts, per-role resources, no uncertainty, no case regression, holdout pass and strict development improvement, under an explicitly pinned verifier and nonfeedback assumption. | `src/application-research.ts:116–208`, `src/application-host.ts:140–152,228–246`, `examples/application-research/study.ts:107–203`; native host rejection at `application_host.rs:343–347`. | 15 admission/noninterference; 14 signed evidence; 16 verifier/engine qualification. |
| HST-08 | Portable Chat Completions preserves bounded request/response admission, explicit credentials and format, no fallback, signal/timeout semantics, configuration identity and honest transport uncertainty; loopback parity does not qualify a model. | `src/chat-completions.ts:12–147`, `src/openai-compatible.ts:20–43`, `src/gateway.ts:16–34`; native `effects.rs:282–302,429–551,957–981`; `scripts/inference-parity.ts:15–53`. | 08 malformed/differential inputs; 16 adapter qualification. |
| HST-09 | Durable inference reservations precede submission, remain charged, serialize across instances and fail closed after uncertainty; cleanup-failure stop publication must not leave a reopening window; draining ignored cancellation remains conditional on backend termination. | `examples/coding-harness/inference-budget.ts:104–221`, `src/host-state.ts:185–200`; `examples/coding-harness/model.ts:58–87`. | 16 concrete ledger model/conformance; 02 filesystem abstraction; 06 reservation-model reuse. |

## Material new observations

### R01: carried episode work has a contract/progress mismatch

Status: source-supported semantics tension; no runtime reproduction. Both
runtimes exhibit the same source behavior.

`spec/v1/application.md:160–161` says a `migrated` intent remains dispatchable
under the new revision. The implementation keeps the original intent and
source state. `src/application.ts:587` supplies that original snapshot for
dispatch; `:539–544` requires an episode plan to preserve the original
revision, memory, manifest, arguments and epoch. The standard policy host
rejects it when selected memory or revision has changed
(`src/application-host.ts:279`). Native validation and admission do the same
(`crates/algal/src/application.rs:1926–1966`,
`crates/algal/src/application_host.rs:717–722`).

Consequently, migrating with a pending `start-episode` marked `migrated` does
not establish that the standard host can dispatch it. A custom host also
cannot silently rebind it to the new revision without violating the core
captured-state validation. The added positive drain test carries a `deliver`
intent through a permissive test host (`src/application-drain.test.ts:24–29,
92–95,123–131`), which does not exercise this distinction.

Phase 06 must choose and document the intended claim before modeling progress:
either `migrated` means retained at its original binding and still subject to
host denial, or migration carries explicit verified replacement intent/binding
evidence. Do not fix the gap by silently changing source identity or bypassing
the stale-source host guard. Add separate deliver and start-episode cases with
the standard policy host.

### R02: historical drain verification is deliberately weaker than commit admission

Status: observed implementation contract limitation, not a newly demonstrated
invalid commit.

Commit admission enforces zero drains for an empty set and exactly one drain
with full coverage otherwise (`src/application.ts:290–299`). Retained history
uses a stable subset because later dispatch records are indistinguishable
from earlier ones (`:301–324`). It returns immediately if no drain is cited,
does not reproduce the original exactly-one test, and checks current outbox
state when assessing omitted dispositions.

The standalone `verifyApplicationDrain` also uses current outbox state for
the historical prefix (`src/application-drain.ts:85–90`,
`src/application.ts:442–451`). A record verified before a carried intent
dispatches can cease to pass that exact-set verifier afterward, while
retained-history inspection legitimately continues to pass.

The plan must not use these three APIs interchangeably as a proof of historical
admission. Phase 14 needs an explicit claim for each. If permanent independent
reconstruction of original coverage is required, retain enough immutable
dispatch/drain ordering evidence to prove it. Include forged-import histories,
later settlements, repeated migration and already abandoned intents in the
conformance corpus. Whole-store hostile rollback remains excluded without an
independent anchor.

### R03: contention production can commit before rejecting malformed later input

Status: direct static control-flow consequence in both runtimes; unexecuted.

The producer parses, checks and commits each attempt before validating the
next (`src/application-contention.ts:105–115`,
`crates/algal/src/application_contention.rs:158–177`). Given a valid first
command at the current parent followed by a duplicate, wrong-parent,
foreign-application or malformed command, the first can commit before the
producer throws and returns no contention record. The spec already says other
failures abort production without a record; it does not promise rollback.

The test named “production rejects malformed races before committing” first
advances the head (`src/application-contention.test.ts:91–108`). Its valid
prefix therefore becomes stale before the malformed suffix is encountered,
so it does not establish the title's stronger behavior. Phase 06 should either
prevalidate the complete bounded command list before effects or make partial
publication explicit. In either case, test a malformed suffix against a fresh
current parent and preserve any committed state on failure.

Separately, verification derives rejected-operation collisions from all current
history (`src/application-contention.ts:167–170`; native `:267–276`). After a
losing operation is reused by a later valid command at a new head, the original
stale-head reason no longer re-verifies. This agrees with the spec's “still
derives” wording but limits the record as permanent historical evidence.
Scope the claim to a supplied history/head or retain enough outcome evidence;
do not assume verification is monotone under history extension. Serial
production cannot replace F04's three-caller test or the Phase 02 custody model.

### R04: post-settlement inference cleanup failure has a stop-publication window

Status: source-supported conditional schedule; no fault injection or execution
performed. The affected guarantee is permanent fail-closed admission after an
uncertain caller outcome, not the numerical reservation ceiling.

1. Instance A reserves durably and submits one effect under its host lease
   (`examples/coding-harness/inference-budget.ts:143–164`).
2. The effect returns. A saves the row as `completed` with its output digest
   (`:183–186`).
3. Host lease marker cleanup fails. `src/host-state.ts:198–199` still rolls back
   and closes the SQLite transaction, releasing custody.
4. Before A's outer catch publishes the immutable stop marker at
   `inference-budget.ts:210`, instance B acquires custody. Its refresh sees a
   completed ledger and no marker (`:107–115`) and can reserve/submit another
   call (`:144–164`).
5. A reports an uncertain failure. If writing the stop marker itself fails,
   later instances can also see only the completed row; the in-memory stop flag
   protects A, not all instances.

The cleanup-failure regression at
`examples/coding-harness/inference-budget.test.ts:152–164` reopens only after
A has rejected and published its marker. It does not test step 4 or failed
marker publication after a persisted completion. Phase 16 should model the
acknowledgment/custody-release/stop boundary and create a bounded deterministic
barrier regression before choosing a repair. Never solve this by refunding
the reservation or treating post-submission failure as definitely unexecuted.

## Important claim boundaries in the added features

- **Interapplication messages:** CAS-level verification binds sender, operation,
  route and payload to an intent, but does not check recipient against a
  dispatch (`src/application-message.ts:113–121`). Full verification adds
  committed-history membership, settled outbox, recipient and exact record
  reproduction (`:130–148`); optional channel verification checks local host
  outcome bytes (`:149–153`). None proves a remote recipient or human actually
  observed the message. Minting precedes outbox settlement (`application.ts:573–574`),
  but record-size overflow intentionally omits the optional record
  (`application-message.ts:101–104`). Use the qualified claim “fitting settled
  deliveries retain their mint” rather than the unconditional nearby comment.
- **Selection/experiment/lineage:** selection replays every policy row through
  the existing selector. Experiment verification joins exact evaluation sets
  and identities (`application-experiment.ts:147–210`) and validates a non-null
  result against selected/accepted candidates (`:216–221`). `result.promoted`
  is copied producer metadata (`:227`), not a history proof of activation.
  Host activation binding is a separate check (`:272–289`). Lineage is a
  deterministic projection of validated history (`application.ts:384–389`),
  not an authenticity witness. F02 can propagate through the added pure-case
  experiment/selection joins until fixed.
- **Research admission:** the core checks one pure strategy change, frozen
  metadata and non-widening VM budgets (`application-research.ts:116–136`).
  Every case needs both roles, attempts are ordered and distinct, all attempts
  count, any uncertainty rejects, and work/model-call limits apply separately
  to each role (`:157–181`). The trusted callback must establish actual receipt
  semantics, signed journal completeness and holdout nonfeedback; simply
  resolving generic CAS values does not prove them. Its digest identifies the
  admitted verifier but does not hash the callback's executable implementation.
  Replay-store restriction is not an OS sandbox for that callback.
- **Research example:** `studyVerifier` checks a caller-pinned evaluator,
  Ed25519 seal, exact protocol journal, frozen corpus/strategy and native query
  evidence (`examples/application-research/study.ts:125–148,152–203`).
  Proposal input contains development cases only (`:77`), and the paired
  study journal checks its freeze before answer attempts (`:158–178`). The
  native policy host deliberately rejects research (`application_host.rs:343–347`).
  Record this supported asymmetry instead of claiming all application modes
  have TS/native admission parity. Fixture provenance and finite sample
  results do not establish live-model quality or general improvement.
- **Inference transport:** explicit schema/object/prompt formats have no silent
  fallback; credentials are explicit for a compatible endpoint; loopback HTTP
  is host configuration (`openai-compatible.ts:20–43`, `chat-completions.ts:19–29`).
  A streamed response has a byte ceiling and fatal UTF-8 decode, and transport
  failure/timeout after submission is uncertain (`chat-completions.ts:45–67,
  105–119`). Native provider behavior is in `effects.rs`, not the ACP module.
  Loopback parity verifies six fixture calls and offline replay of all three
  formats (`scripts/inference-parity.ts:39–52`), not real-provider admission,
  billing, model truth, availability or effective context limits.
- **Inference reservations:** the ledger's frozen configuration, durable
  predispatch charge and no-refund policy are meaningful safety mechanisms.
  Missing initialized accounting fails closed (`inference-budget.ts:118–125`).
  Price/token ceilings are host assumptions, not billing receipts
  (`examples/coding-harness/model.ts:58–87`). `settle()` retains outstanding
  promises (`inference-budget.ts:221`) and can wait forever when a backend
  ignores cancellation forever. Timeout closes admission but does not prove
  that arbitrary external work has terminated.

## Model and conformance additions

Phase 04's event vocabulary should include `DrainPrepared`,
`DrainAdmitted`, `IntentAbandoned`, `MintAttempted`, `MintOmittedByBound`,
`MintDurable`, `SelectionDerived`, `ResearchAttemptAdmitted`,
`InferenceReserved`, `InferenceSubmitted`, `InferenceCompleted`,
`InferenceUnknown`, `StopMarkerDurable` and `CustodyReleased`. Associate events
with operation/configuration/source digests and durable versus volatile state;
do not use nondeterministic wall-clock fields in portable receipts.

For APP-08/09/10, extend Phase 06's initial small model with two applications,
two revisions, two intents of each kind, two migrations, two dispatch outcomes
and three operations. Track original source state, current selected state,
drain set, abandoned set, outbox phase, optional mint, dispatch plan and host
grant separately. Distinguish prepare from commit-time admission, current-set
verification from historical inspection, and serial record production from
concurrent writers. The invariants should prohibit abandoned dispatch,
invented replacement bindings, drain of admitted unsettled work, acknowledged
fitting mints without durable dependencies, and authority obtained from
CAS-only messages. Include the R01–R03 histories as required witnesses.

For HST-09, use two executor instances, two calls and a two-unit reservation
ceiling. Actions must separately expose acquire, refresh, reserve, persist,
submit, receive, persist completion, marker cleanup, release custody, publish
stop, crash and reopen. Include failed writes after successful publication and
the R04 schedule. Safety requires charging before submission, no refund, bounded
total charges and no new submission after the chosen durable stop boundary.
Liveness may assume filesystem availability, fair custody acquisition and a
backend that terminates or is externally reaped. It must not assume those
properties for arbitrary host callbacks. Fairness cannot erase a retained
unknown outcome or restore exhausted budget.

For EVO-07/08, use two environments, two strategy candidates, one development
case, one holdout case, two roles and up to two attempts per group. Include
wrong-parent, cross-environment, omitted/reordered/reused-attempt,
resource-underreporting, wrong-verifier and holdout-feedback mutations. Make
the oracle/signature checker an explicit admitted interface until separately
proved. A Lean admission theorem can prove conjunction of the checker's
predicates for arbitrary bounded records; it cannot conclude universal strategy
quality from finite cases or verify a callback solely from its claimed identity.

## Existing evidence to reuse, with its limits

| Surface | Existing source-level evidence | Missing discriminating cases |
| --- | --- | --- |
| Drain | `src/application-drain.test.ts:88,134,146,158`; native inline drain tests; `scripts/application-parity.ts:581–623,1189–1222`. | Standard-host migrated episode; later-outbox verification drift; original-versus-retained coverage; multiple migrations; custody/fault cuts. |
| Message | `src/application-message.test.ts:75,93,103,121,139,157,168,192,204`; native inline message tests; parity driver `:383–402`. | Crash after result/mint/before settlement; optional overflow plus crash; CAS-only forged recipient versus full verifier; directory persistence. |
| Contention | `src/application-contention.test.ts:45,73,84,91,111,132,160,170`; native `application_contention.rs:378` onward; parity driver `:725–753`. | Fresh-head malformed suffix; losing operation reused later; actual F04 mixed-runtime concurrent cutover; producer crash after winner. |
| Experiment/selection | `src/application-experiment.test.ts:112,130,142,178,196`; native inline experiment tests; parity driver `:1038` onward. | Imported F02 evidence; promotion claim versus real history; all optional-join combinations and ambiguous candidate revisions. |
| Research | `src/application-research.test.ts:91,104,116,127,145,164`; `examples/application-research/study.test.ts`; exact fixture query corpus. | Independent signature/journal checker evidence; both role resource boundaries; callback identity/version changes; native rejection parity; held-out data-flow mutation. |
| Portable inference | `src/openai-compatible.test.ts:20,41,50,63,79,104,114,126,147,169,201`; shared gateway tests; `scripts/inference-parity.ts`. | Differential malformed UTF-8/envelopes/usage, stalled streams, abort phase matrix and endpoint configuration identities across native/TS. |
| Inference ledger | `examples/coding-harness/inference-budget.test.ts:15,38,54,63,75,101,120,133,152`; model configuration tests. | R04 two-instance cleanup/stop gap and failed marker write; crash at each publication/acknowledgment boundary; nonterminating backend ownership. |

No listed command needs to run during this read-only rebase audit. Later owners
should run focused tests after adding the missing case and reserve broad/native
parity and final aggregate gates for the converged phase tree, following current
host scheduling rules. A historical fixture path, passing example or loopback
parity run must not silently upgrade an unproven ledger claim.

## Phase 00 acceptance consequences

1. Add the seven proposed obligation IDs, their implementation/test/spec paths,
   assumptions and phase owners to the ledger without claiming proofs.
2. Preserve all original findings and their evidence status. Rebase moved line
   references; do not mark a finding closed merely because nearby code changed.
3. Include R01–R04 in the future counterexample queue with the statuses above.
   R01/R02/R03 need explicit contract choices before strong liveness or permanent
   historical-evidence claims; R04 needs a bounded fault/concurrency regression.
4. Include the explicit TS-only research admission surface, example-only
   inference accounting, optional message mint and current-history verifier
   scopes in the supported-semantics matrix.
5. Phase 01 still targets its approved production counterexamples. This report
   does not authorize folding all later application/host changes into that phase.
   No production source was changed during this review.
