import type { ModelMutation, ModelProfile } from "../definitions";
const invariants = ["TypeOK", "SelectedIntentHasHeader", "DispatchHasSelectedIntent", "HostAdmission", "CheckpointAdmission", "InputAdmission", "ExactRecovery", "UnknownUncharged", "UnknownNotDispatched", "ReceiptSettled", "SelectedOutcomeClosed", "LinearGeneration", "AckClosed", "UnknownPreserved"];
const witness = (action: string, property = `Never${action}`) => ({ action, property });
const witnesses = (...actions: string[]) => actions.map(action => witness(action));
type Options = { calls?: 1 | 2 | 3; faults?: boolean; checkpoint?: boolean; host?: boolean; outcome?: "suspended" | "complete" | "failed" | "stuck"; progress?: boolean; actions: ModelProfile["actions"] };
function profile(id: string, options: Options): ModelProfile {
  const calls = options.calls ?? 2;
  return { id: `process-${id}`, suite: "process", module: "ProcessProtocol", path: "verify/tla/process/ProcessProtocol.tla",
    constants: { Generations: "2", Calls: String(calls), Faults: options.faults ? "TRUE" : "FALSE", CheckpointOK: options.checkpoint === false ? "FALSE" : "TRUE", HostOK: options.host === false ? "FALSE" : "TRUE", Outcome: JSON.stringify(options.outcome ?? "suspended"), Mutation: '"none"' },
    specification: options.progress ? "FairSpec" : "Spec", invariants, properties: options.progress ? ["EventuallyDone"] : [], actions: options.actions,
    bounds: { processes: 1, generations: 2, publicCalls: calls, journalEnabled: 1, processCrashes: options.faults ? 1 : 0, injectedFailures: options.faults ? 1 : 0, recoveryCapacity: 2, intentIdentitiesPerGeneration: 1 },
    assumptions: [
      "Valid process creation and exclusive cooperating OwnerLease custody; head and record parsing already admitted",
      "One fixed symbolic intent/cause and outcome per generation; identity symbols map injectively to this finite admitted intent set, not to all possible same-generation records",
      "CAS/header/head actions compose the separately qualified publication contract; no atomic whole-store or physical power-loss claim",
      "Dispatch means runtime entry, not necessarily a new external effect; completed-prefix replay, read retry, unknown-write refusal and per-invocation charges depend on the separate journal contract",
      "At most three calls leave at most two recoveries after the initial tick, within the default journal capacity; larger call bounds require explicit charge accounting",
      "Host/checkpoint predicates summarize actual admission; parser completeness, arbitrary host behavior and automatic wake scheduling remain separate",
      ...(options.progress ? ["Weak fairness of the protocol step, available storage, terminating runtime calls and no injected failures or crashes; settlement may be rejection"] : []),
    ],
  };
}
export const PROCESS_PROFILES: ModelProfile[] = [
  profile("basic", { actions: witnesses("VerifyInputs", "PrepareIntentCAS", "CreateHeader", "PublishIntent", "Dispatch", "CompleteJournal", "FinishJournal", "PublishReceipt", "PersistOutcome", "PublishOutcome", "Return", "Done") }),
  profile("faults", { faults: true, actions: [
    witness("Crash", "NeverCrashWithUnknownWrite"), witness("IOFailure", "NeverIOFailureWithUnknownWrite"), witness("AdmitRecovery", "NeverRejectUnknownRecovery"), witness("Dispatch", "NeverRecoverCompletedJournal"), witness("PublishIntent", "NeverLostReturnNextGeneration"), witness("CheckRecovery", "NeverStaleRecoveryRejection"), ...witnesses("UnknownWrite", "Reject"),
  ] }),
  profile("three-calls", { calls: 3, actions: witnesses("RejectTick") }),
  profile("three-calls-faults", { calls: 3, faults: true, actions: [witness("Crash", "NeverCrashAfterOutcome"), witness("IOFailure", "NeverIOFailureAfterReceipt")] }),
  profile("one-call", { calls: 1, actions: witnesses("Return") }),
  profile("complete", { outcome: "complete", actions: [witness("RejectRecovery", "NeverRejectRecoveryAfterOutcome")] }),
  profile("failed", { outcome: "failed", actions: witnesses("Return") }),
  profile("stuck", { outcome: "stuck", actions: witnesses("Return") }),
  profile("bad-checkpoint", { checkpoint: false, actions: [witness("Dispatch", "NeverFreshWithoutCheckpoint"), witness("VerifyInputs", "NeverCheckpointRejection")] }),
  profile("bad-host", { host: false, actions: [witness("VerifyInputs", "NeverHostRejection")] }),
  profile("fair-progress", { progress: true, actions: witnesses("Return") }),
];
export const PROCESS_MUTATIONS: ModelMutation[] = [
  { id: "process-skip-header", base: "process-basic", mutation: "skip-header", property: "SelectedIntentHasHeader", kind: "invariant" },
  { id: "process-skip-selected", base: "process-basic", mutation: "skip-selected", property: "DispatchHasSelectedIntent", kind: "invariant" },
  { id: "process-blind-tick", base: "process-faults", mutation: "blind-tick", property: "LinearGeneration", kind: "invariant" },
  { id: "process-stale-recovery", base: "process-faults", mutation: "stale-recovery", property: "ExactRecovery", kind: "invariant" },
  { id: "process-skip-settlement", base: "process-faults", mutation: "skip-settlement", property: "ReceiptSettled", kind: "invariant" },
  { id: "process-skip-receipt", base: "process-basic", mutation: "skip-receipt", property: "SelectedOutcomeClosed", kind: "invariant" },
  { id: "process-skip-checkpoint", base: "process-bad-checkpoint", mutation: "skip-checkpoint", property: "CheckpointAdmission", kind: "invariant" },
  { id: "process-skip-host", base: "process-bad-host", mutation: "skip-host", property: "HostAdmission", kind: "invariant" },
  { id: "process-retry-unknown", base: "process-faults", mutation: "retry-unknown-write", property: "UnknownUncharged", kind: "invariant" },
  { id: "process-no-fairness", base: "process-fair-progress", specification: "Spec", property: "EventuallyDone", kind: "liveness" },
];
export const PROCESS_LIVE_SOURCES = ["src/process.ts", "src/process-journal.ts", "src/runtime-journal-contract.ts", "src/effects.ts", "src/run.ts", "src/mailbox.ts", "src/errors.ts", "crates/algal/src/process.rs", "crates/algal/src/journal.rs", "crates/algal/src/effects.rs", "crates/algal/src/runtime.rs", "crates/algal/src/mailbox.rs", "crates/algal/src/error.rs", "spec/v1/process.md", "spec/v1/process-journal.md", "src/process-recovery.test.ts", "crates/algal/tests/process.rs", "crates/algal/tests/host_executor.rs"];
