import type { ModelMutation, ModelProfile } from "../definitions";

const invariants = [
  "TypeOK", "NoConcurrentCallbacks", "CriticalSectionCustody",
  "RecognizedEvidencePreserved", "ForeignMarkerRetained", "ArchiveBound",
  "ForeignContractRefused", "CallbackWasPublished", "AcknowledgmentWasAdmitted",
];
const witnesses = (...actions: string[]) => actions.map(action => ({ action, property: `Never${action}` }));
type Options = {
  actors?: 2 | 3; capacity?: 0 | 1 | 2;
  database?: "missing" | "empty" | "ready" | "foreign-schema" | "foreign-contract";
  marker?: "none" | "stale" | "foreign";
  archive?: "none" | "equal" | "conflict" | "full";
  runtime?: "native" | "bun"; faults?: boolean; reopens?: 0 | 1;
  progress?: "EventuallySettled" | "EventuallyAdmitted";
  actions: ModelProfile["actions"];
};
function lease(id: string, options: Options): ModelProfile {
  const actors = options.actors ?? 2, capacity = options.capacity ?? 2;
  const faults = options.faults ?? false, reopens = options.reopens ?? 0;
  return {
    id, suite: "lease", module: "OwnerLease", path: "verify/tla/lease/OwnerLease.tla",
    constants: {
      ActorCount: String(actors), Capacity: String(capacity),
      InitialDb: JSON.stringify(options.database ?? "missing"),
      InitialMarker: JSON.stringify(options.marker ?? "none"),
      InitialArchive: JSON.stringify(options.archive ?? "none"),
      Runtime: JSON.stringify(options.runtime ?? "native"), Faults: faults ? "TRUE" : "FALSE",
      Reopens: String(reopens), Mutation: '"none"',
    },
    specification: options.progress ? "FairSpec" : "Spec", invariants: [...invariants],
    properties: options.progress ? [options.progress] : [], actions: options.actions,
    bounds: {
      actors, archiveCapacity: capacity, databaseInodes: 2,
      legitimateRetainedInodes: 1, processCrashes: faults ? 1 : 0,
      reopensPerActor: reopens, nonceTokens: actors + (reopens ? 3 : 0) + 2,
    },
    assumptions: [
      "One canonical cooperating namespace; the owner database inode is retained and never replaced",
      "SQLite BEGIN IMMEDIATE provides mutual exclusion and process death releases its live transaction",
      "Distinct fresh nonce tokens; admitted marker and archive bytes have exact symbolic identity",
      "Each publication/unlink action assumes the separately qualified durable filesystem contract",
      "Database and marker classification is already admitted; no complete hostile SQL/byte parser proof",
      "Native Drop may leave a marker after successful callback return; no clean-marker acknowledgment claim",
      ...(options.progress ? ["Initialized ready database, available I/O, no crashes; weak fairness of each actor step including callback completion", "Progress allows contention rejection; it does not promise admission to every contender"] : []),
    ],
  };
}

export const LEASE_PROFILES: ModelProfile[] = [
  lease("lease-cold", { actions: witnesses("Open", "Inspect", "CreateSchema", "InitializeContract", "BootstrapBusy", "Acquire", "RejectContention", "Validate", "ReadMarker", "AdmitMarker", "Publish", "Enter", "Finish", "DropMarker", "Release", "Return") }),
  lease("lease-empty-bootstrap", { database: "empty", actions: witnesses("InitializeContract") }),
  lease("lease-three-contenders", { database: "ready", actors: 3, actions: witnesses("Acquire", "Enter") }),
  lease("lease-stale", { database: "ready", marker: "stale", capacity: 1, actions: witnesses("Archive", "ClearOld") }),
  lease("lease-zero-archive-capacity", { database: "ready", marker: "stale", capacity: 0, actions: witnesses("RejectArchive") }),
  lease("lease-full-archive", { database: "ready", marker: "stale", archive: "full", capacity: 1, actions: witnesses("RejectArchive") }),
  lease("lease-equal-full-archive", { database: "ready", marker: "stale", archive: "equal", capacity: 1, actions: witnesses("Archive") }),
  lease("lease-conflicting-archive", { database: "ready", marker: "stale", archive: "conflict", capacity: 1, actions: witnesses("RejectArchive") }),
  lease("lease-unknown-marker", { database: "ready", marker: "foreign", actions: witnesses("RejectMarker") }),
  lease("lease-foreign-schema", { database: "foreign-schema", actions: witnesses("Inspect") }),
  lease("lease-foreign-contract", { database: "foreign-contract", actions: witnesses("Inspect") }),
  lease("lease-recovery", { database: "ready", faults: true, reopens: 1, actions: witnesses("IoError", "FinishError", "DropFailure", "Crash", "Reopen", "Archive") }),
  lease("lease-bun-cleanup-error", { database: "ready", runtime: "bun", faults: true, actions: witnesses("DropFailure", "Release") }),
  lease("lease-fair-termination", { database: "ready", progress: "EventuallySettled", actions: witnesses("Return") }),
  lease("lease-fair-some-admission", { database: "ready", progress: "EventuallyAdmitted", actions: witnesses("Enter") }),
];

export const LEASE_MUTATIONS: ModelMutation[] = [
  { id: "lease-replace-inode", base: "lease-three-contenders", mutation: "replace-inode", property: "NoConcurrentCallbacks", kind: "invariant" },
  { id: "lease-skip-mutex", base: "lease-three-contenders", mutation: "skip-mutex", property: "CriticalSectionCustody", kind: "invariant" },
  { id: "lease-unlink-before-archive", base: "lease-stale", mutation: "unlink-before-archive", property: "RecognizedEvidencePreserved", kind: "invariant" },
  { id: "lease-erase-foreign-marker", base: "lease-unknown-marker", mutation: "erase-foreign-marker", property: "ForeignMarkerRetained", kind: "invariant" },
  { id: "lease-ignore-archive-bound", base: "lease-zero-archive-capacity", mutation: "ignore-archive-bound", property: "ArchiveBound", kind: "invariant" },
  { id: "lease-accept-foreign-contract", base: "lease-foreign-contract", mutation: "accept-foreign-contract", property: "ForeignContractRefused", kind: "invariant" },
  { id: "lease-no-fairness", base: "lease-fair-termination", specification: "Spec", property: "EventuallySettled", kind: "liveness" },
];

export const LEASE_LIVE_SOURCES = [
  "src/host-state.ts", "src/host-lease-model.test.ts", "src/durable-fs.ts", "crates/algal/src/lease.rs",
  "crates/algal/src/durable_fs.rs", "spec/v1/process.md", "spec/v1/process-journal.md",
];
