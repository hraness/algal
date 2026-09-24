import type { ModelMutation, ModelProfile } from "../definitions";

const invariants = [
  "TypeOK", "DispatchHasIntent", "NoRepeatedWrite", "RecoveryCharged", "RecoveryChargesRetained",
  "PoisonBlocks", "PoisonReturnsBlocked", "BindingPreserved", "CompletedImmutable", "HeadHasCAS",
  "PrefixSettled", "ChainValid", "OccurrenceReturns", "ExternalApplicationWasDispatched",
  "ClosedOnMalformed", "FinishConsumesPrefix",
];
const witnesses = (...actions: string[]) => actions.map(action => ({ action, property: `Never${action}` }));
type Options = {
  count?: 1 | 2 | 3; invocations?: 2 | 3; recoveries?: 0 | 1 | 2 | 8;
  readOnly?: boolean; faults?: boolean; pending?: boolean; charged?: number;
  drift?: boolean; corruption?: "none" | "gap"; progress?: boolean;
  actions: ModelProfile["actions"];
};
function journal(id: string, options: Options): ModelProfile {
  const count = options.count ?? 2, invocations = options.invocations ?? 2;
  const recoveries = options.recoveries ?? 2, faults = options.faults ?? true;
  return {
    id, suite: "process", module: "ProcessJournal", path: "verify/tla/process-journal/ProcessJournal.tla",
    constants: {
      Count: String(count), RecoveryLimit: String(recoveries), Invocations: String(invocations),
      ReadOnly: options.readOnly ? "TRUE" : "FALSE", Faults: faults ? "TRUE" : "FALSE",
      Mutation: '"none"', InitialPending: options.pending ? "TRUE" : "FALSE",
      InitialRecoveries: String(options.charged ?? 0), Drift: options.drift ? "TRUE" : "FALSE",
      Corruption: JSON.stringify(options.corruption ?? "none"),
    },
    specification: options.progress ? "FairSpec" : "Spec", invariants: [...invariants],
    properties: options.progress ? ["EventuallyDone"] : [], actions: options.actions,
    bounds: {
      ordinals: count, hostInvocations: invocations, processIntents: 1, actualProcessGenerations: 1,
      recoveryLimit: recoveries, initialRecoveryCharges: options.charged ?? 0,
      historicalPendingDispatches: options.pending ? 1 : 0, receiptPayloads: 3,
      hostCrashes: faults ? invocations - 1 : 0, pendingAdapterTokens: count * (recoveries + 1),
    },
    assumptions: [
      "One immutable process intent under exclusive cooperating OwnerLease custody",
      "Host invocation/incarnation is not a new ProcessRecord generation; new-intent composition is separate",
      "CAS/head/charge actions assume the separately qualified durable publication contract",
      "Exact symbolic request/configuration identity and finite stored receipt payloads; no cryptographic or byte-codec proof",
      "One outstanding journal operation; concurrent Bun mutation is conservatively represented by poison during its await window",
      "Malformed retained representations are already classified as rejected; parser completeness is separate",
      "Outstanding external calls may apply after local failure or host crash without publishing journal completion",
      ...(recoveries === 0 ? ["Zero recovery capacity is an abstract stress boundary; source headers require a bound from 1 through 8"] : []),
      ...(options.progress ? ["No faults/crashes, available storage, terminating adapter calls and weak fairness of the protocol step"] : []),
    ],
  };
}

export const JOURNAL_PROFILES: ModelProfile[] = [
  journal("journal-mixed", { actions: [
    ...witnesses("PrepareIntentCAS", "CreateHeader", "PublishIntent", "Before", "WriteStartCAS", "PublishStarted", "ReturnStarted", "Dispatch", "Apply", "KnownResult", "KnownFailure", "WriteCompletedCAS", "PublishCompleted", "ReturnCompleted", "Replay", "Finish", "ConcurrentPoison", "Fail", "Crash", "Reopen", "Open"),
    { action: "LateApply", property: "NeverLateApplyAfterCrash" },
  ] }),
  journal("journal-read", { readOnly: true, actions: witnesses("PublishStarted") }),
  journal("journal-zero-recovery-capacity", { recoveries: 0, actions: witnesses("AdmitRecovery") }),
  journal("journal-unknown-write", { pending: true, actions: witnesses("AdmitRecovery", "LateApply", "LateSettle") }),
  journal("journal-pending-read", { pending: true, readOnly: true, actions: [
    ...witnesses("PublishRecoveryCharge", "ReturnRecoveryCharge"),
    { action: "Crash", property: "NeverCrashAfterCharge" },
    { action: "Fail", property: "NeverFailAfterCharge" },
  ] }),
  journal("journal-exhausted", { pending: true, readOnly: true, charged: 2, actions: witnesses("AdmitRecovery") }),
  journal("journal-precharged", { pending: true, readOnly: true, charged: 1, actions: witnesses("PublishRecoveryCharge") }),
  journal("journal-two-recoveries", { count: 1, invocations: 3, readOnly: true, actions: witnesses("PublishRecoveryCharge") }),
  journal("journal-maximum-exhausted", { count: 1, pending: true, readOnly: true, recoveries: 8, charged: 8, actions: witnesses("AdmitRecovery") }),
  journal("journal-maximum-nearfull", { count: 1, pending: true, readOnly: true, recoveries: 8, charged: 7, actions: witnesses("PublishRecoveryCharge") }),
  journal("journal-drift", { drift: true, actions: [{ action: "Dispatch", property: "NeverFreshBindingDispatch" }] }),
  journal("journal-drift-read", { drift: true, readOnly: true, actions: witnesses("Poison") }),
  journal("journal-gap", { corruption: "gap", actions: witnesses("Open") }),
  journal("journal-fair-progress", { count: 3, faults: false, progress: true, actions: witnesses("Finish") }),
];

export const JOURNAL_MUTATIONS: ModelMutation[] = [
  { id: "journal-skip-intent-cas", base: "journal-mixed", mutation: "skip-intent", property: "DispatchHasIntent", kind: "invariant" },
  { id: "journal-skip-selected-intent", base: "journal-mixed", mutation: "skip-selected-intent", property: "DispatchHasIntent", kind: "invariant" },
  { id: "journal-skip-start-health", base: "journal-mixed", mutation: "skip-start-health", property: "PoisonBlocks", kind: "invariant" },
  { id: "journal-skip-completion-health", base: "journal-mixed", mutation: "skip-completion-health", property: "PoisonReturnsBlocked", kind: "invariant" },
  { id: "journal-skip-recovery-charge", base: "journal-read", mutation: "skip-charge", property: "RecoveryCharged", kind: "invariant" },
  { id: "journal-repeat-completed", base: "journal-read", mutation: "repeat-completed", property: "CompletedImmutable", kind: "invariant" },
  { id: "journal-repeat-write", base: "journal-unknown-write", mutation: "repeat-write", property: "ChainValid", kind: "invariant" },
  { id: "journal-clear-poison", base: "journal-mixed", mutation: "clear-poison", property: "PoisonBlocks", kind: "invariant" },
  { id: "journal-wrong-occurrence-receipt", base: "journal-mixed", mutation: "replay-other-ordinal", property: "OccurrenceReturns", kind: "invariant" },
  { id: "journal-skip-binding-check", base: "journal-drift", mutation: "skip-binding-check", property: "BindingPreserved", kind: "invariant" },
  { id: "journal-no-fairness", base: "journal-fair-progress", specification: "Spec", property: "EventuallyDone", kind: "liveness" },
];

export const JOURNAL_LIVE_SOURCES = [
  "src/process-journal.ts", "src/runtime-journal-contract.ts", "src/process.ts", "src/effects.ts", "src/run.ts", "src/host-state.ts",
  "crates/algal/src/journal.rs", "crates/algal/src/process.rs", "crates/algal/src/effects.rs", "crates/algal/src/runtime.rs", "crates/algal/tests/host_executor.rs",
  "crates/algal/src/lease.rs", "spec/v1/process.md", "spec/v1/process-journal.md",
];
