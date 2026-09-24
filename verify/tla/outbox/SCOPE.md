# ApplicationOutbox scratch model

This models the lifecycle's upper outbox protocol for one already admitted
application, two ordered intent identities, two fresh scan invocations and one
explicit reconciliation invocation. Source history/canonical records and host
policy are admitted typed inputs. Application selection, quota, owner custody,
parser/canonical correctness and source-to-model refinement remain separate
obligations. An orphan profile deliberately supplies an intent not in committed
history to test that the pending projection never invokes it.

Bun correspondence is to `ApplicationCore.dispatchPending`, `execute`, and
`reconcileDispatch` in `src/application-core.ts`. The filesystem adapter owns
custody/publication; `ApplicationStorage` requires those boundaries to survive
individual callback failures. Message minting and CAS checks moved to
`src/application-message-contract.ts`; retained delivery checks remain in
`src/application-message.ts`. Memory-adapter tests remain separate volatile
conformance and do not establish durable started/settled records after process exit.

`PublishStarted` composes completed quota reservation and completed durable
started-record publication. `InvokeFresh` is the subsequent `dispatcher.dispatch`
call. Returned or crashed calls can leave started without an invocation, and
`PossibleEffect` before a lost return can leave a real effect without settlement.
`Fail`/`Crash` preserve durable state and per-intent outstanding effect
possibility. `LateEffect(intent)` is independent of the current program counter
and selected intent: an older call can apply after a crash or uncertain return
while a newer intent is awaiting. Restart is an observation event; a subsequent
invocation may belong to another cooperating host. This is
process death at abstract operation boundaries, not power-loss qualification of
helpers, and at most one returned failure and one death are enabled.

`AdapterReturn` admits the three parsed statuses (settled, blocked, uncertain).
A result may be retained in CAS and a message minted before settlement allocation
fails, leaving the old started record. The result symbol stands for an already
parsed result whose work/identity/message binding passed the implementation's
checks; no parser or arbitrary provider truth is proved here. Settled status is
execution evidence, not proof that an episode accomplished its real-world task.
The oversized-message profile permits settled delivery without an optional
interapp record, as the actual bounded mint does. Recipient/class, payload and
source/destination authority need the separate authority model and real tests.

Reconciliation invokes `dispatcher.reconcile` separately from fresh dispatch.
It retains the recorded plan and configuration even when the selected memory
has advanced. Configuration/plan drift is rejected before that callback. The
model allows `PossibleEffect` and independent `LateEffect` for either callback
as an overapproximation of
trusted adapter behavior; it proves preservation of admission and the absence
of a second *fresh dispatch invocation*, not that arbitrary reconciliation code
never repeats a physical write. The applied set is saturated existence evidence,
not an effect count; re-invocation of reconciliation cannot turn that bit into
a one-physical-application theorem. Outstanding is an unresolved effect
possibility, not a claim that the local callback promise is still pending. It
can survive an observed return because this upper model does not treat an
adapter's status as physical-world truth. The default channel's observational matching-
pair reconciliation and episode journal recovery need their own implementation
and Phase05 composition evidence. An arbitrary custom host does not inherit
those guarantees merely by returning the same configuration digest.

Fresh scan budget counts completed new attempts, including blocked/uncertain
ones, while a separate counter checks actual fresh invocations stay within the
batch. Retained unsettled records and transient denial consume no fresh budget.
A settlement failure aborts the scan rather than continuing without charging
its attempted call. Batch limits one and two and explicit later-eligible
witnesses exercise the ordered bounded algorithm. They do not guarantee global
scheduler fairness or successful dispatch when policy, quota or storage refuses.

The episode profiles require the default host's selected revision+memory match;
writers additionally need source-state equality in the lifecycle core. Advancing
only the head while preserving the pair therefore still denies a fresh writer.
Memory advance may coexist with unsettled dispatch; activate/migrate/restore's
shared unsettled barrier is represented by `Activate`. `Migrate` additionally
represents a complete disposition over currently undispatched intents, retaining
or abandoning each original identity. It never rewrites an old episode into a
new source. Migration evidence replay, schema compatibility and the separate
restore/propose checks belong to ApplicationSelection/admission and are not
established by this action alone.

Two scan invocations and one reconciliation keep the model finite; no unbounded
retry sequence is implied. The fairness profile excludes faults and environment
changes and places weak fairness on the finite progressing callback/scan steps.
It promises eventual completion of the requested scans, including denial and
blocked/uncertain results, not success of every task. No symmetry, constraints or
operator overrides prune the state graph. Unsafe controls have exact named
properties and nonstuttering traces; unexpected checker failures do not count.

All 60 refreshed scratch diagnostics passed after the independent review repair:
18 positive profiles, 32 exact action witnesses, and 10 intended unsafe controls.
The late-effect witnesses cover an older started call after death while a newer
intent awaits, and an uncertain returned call while a newer intent awaits.
The strict adapter admitted every result, including completed positive fairness
and the expected unfair liveness loop. These are bounded model diagnostics.
Raw batch evidence: `/private/tmp/algal-phase06-outbox-late-diagnostics.log`;
per-run output directories are recorded in each JSON row.

Root independent review approved the repaired model within this declared scope.
Pending: real service conformance cases from SOURCE_PLAN.md and root-owned registered-suite
runtime/source qualification. These are not current operational proof receipts.

## Registered inventory

The registered candidate retains every scratch witness and unsafe control. Profiles
without an important action now also require a reachable action witness. Multiple
witnesses of the same action are separate profiles to preserve the existing strict
inventory rule. No checker limit, property, mutation or raw-output admission is
weakened. Fresh repository qualification and real conformance remain required.
