/** Reviewed, finite inventories. These values select static models, never shell commands. */
export type TlcSuite = "custody" | "publication";
export type ModelProfile = {
  id: string; suite: TlcSuite; module: string; path: string;
  constants: Record<string, string>; specification: "Spec" | "FairSpec";
  invariants: string[]; properties: string[];
  actions: { action: string; property: string }[];
  bounds: Record<string, string | number>; assumptions: string[];
};
export type ModelMutation = { id: string; base: string; mutation?: string; specification?: "Spec"; property: string; kind: "invariant" | "liveness" };
const witnesses = (...names: string[]) => names.map(action => ({ action, property: `Never${action}` }));
const crashAfterAck = [
  { action: "Crash", property: "NeverCrashAfterAck" }, { action: "Reopen", property: "NeverReopenAfterAck" },
];
const custody = (id: string, options: { independent?: boolean; legacy?: boolean; capacity?: number; progress?: boolean; prepared?: boolean; actions: string[] }): ModelProfile => ({
  id, suite: "custody", module: "Custody", path: "verify/tla/custody/Custody.tla",
  constants: { Mutation: '"none"', Independent: options.independent ? "TRUE" : "FALSE", Legacy: options.legacy ? "TRUE" : "FALSE", Prepared: options.prepared ? "TRUE" : "FALSE", Capacity: String(options.capacity ?? 1) },
  specification: options.progress ? "FairSpec" : "Spec",
  invariants: ["TypeOK", "NoSibling", "AckWasPublished", "CapacityBound", "NamespaceCharged", "CriticalSectionCustody", ...(options.independent ? ["IndependentEnabled"] : [])],
  properties: options.progress ? ["EventuallyDone"] : [], actions: witnesses(...options.actions),
  bounds: { actors: options.independent ? 2 : 3, applications: options.independent ? 2 : 1, attemptsPerActor: 1, capacity: options.capacity ?? 1, legacyActors: options.legacy ? 1 : 0, preparedChargedNamespaces: options.prepared ? 1 : 0, crashes: 0 },
  assumptions: ["Cooperative canonical path identity and exclusive leases", "atomic model actions; no process or machine crash", ...(options.progress ? ["weak fairness of each actor step, including host admission resolution"] : [])],
});
const publication = (id: string, kind: string, actions: ModelProfile["actions"], existing = false): ModelProfile => ({
  id, suite: "publication", module: "Publication", path: "verify/tla/publication/Publication.tla",
  constants: { Kind: JSON.stringify(kind), Mutation: '"none"', ExistingAncestors: existing ? "TRUE" : "FALSE" }, specification: "Spec",
  invariants: ["TypeOK", "ReopenedAckReadable", "HeadHasDependency", "WinnerRetained", "CorruptionNotAcknowledged", "NoSilentRepair", "ErrorNotSuccess"],
  properties: [], actions, bounds: { activePublishers: 1, initialRetainedWinners: kind === "retained" || kind === "corrupt" ? 1 : 0, candidateInodes: 2, dependencyInodes: 1, ancestorBindings: kind === "head" ? 4 : 2, crashes: 1, retries: 0 },
  assumptions: ["Explicit durable root anchor", "file sync persists that opened inode", "directory sync persists its immediate bindings", "unmodeled concurrent namespace replacement is excluded", "background content and binding persistence are independent", "dependency directory sync abstracts complete qualification of a separate dependency branch; intermediate pre-ACK dependency barriers are assumed from the Store publication contract"],
});
const mailbox = (id: string, initial: string, actions: ModelProfile["actions"]): ModelProfile => ({
  id, suite: "publication", module: "MailboxPublication", path: "verify/tla/publication/MailboxPublication.tla",
  constants: { Mutation: '"none"', Initial: JSON.stringify(initial) }, specification: "Spec",
  invariants: ["TypeOK", "NoUnmarkedLoss", "AckCleanReopen", "AmbiguousNotAck"], properties: [], actions,
  bounds: { receivers: 1, keys: 1, payloads: 1, pathnameLocks: 1, crashes: 1, retries: 0 },
  assumptions: ["Message payload and containing ancestors are initially durable and validated", "one exclusive cooperating receiver", "independent pending, consumed and lock directory binding persistence", "retained lock or ambiguous transfer after crash is authoritative and is not reclaimed"],
});

export const MODEL_PROFILES: ModelProfile[] = [
  custody("custody-stable", { actions: ["Select", "AcquirePrimary", "AcquireLegacy", "Check", "Admit", "Deny", "Reserve", "Publish", "Release", "Ack"] }),
  custody("custody-legacy", { legacy: true, actions: ["AcquireLegacy", "Publish"] }),
  custody("custody-prepared", { prepared: true, actions: ["AcquireLegacy", "Publish"] }),
  custody("custody-zero-capacity", { capacity: 0, actions: ["RejectCapacity"] }),
  custody("custody-independent", { independent: true, capacity: 2, actions: ["Admit", "Publish"] }),
  custody("custody-progress", { progress: true, actions: ["Ack"] }),
  publication("store-fresh", "fresh", [...witnesses("MkdirOne", "WriteTemp", "FileSync", "Publish", "SyncLeaf", "SyncAncestorTwo", "SyncAncestorOne", "Ack", "Error"), ...crashAfterAck]),
  publication("store-existing-ancestors", "fresh", [...witnesses("Ack"), ...crashAfterAck], true),
  publication("store-retained", "retained", [...witnesses("ValidateRetained", "SyncRetained", "Ack"), ...crashAfterAck], true),
  publication("store-corrupt", "corrupt", witnesses("ValidateRetained", "Reopen"), true),
  publication("selected-head", "head", [...witnesses("AckDependency", "Ack"), ...crashAfterAck]),
  mailbox("mailbox-clean", "clean", [...witnesses("AcquireLock", "Inspect", "WriteTemp", "FileSync", "PublishConsumed", "SyncConsumed", "UnlinkPending", "SyncPending", "UnlinkLock", "SyncLock", "Ack"), ...crashAfterAck]),
  mailbox("mailbox-ambiguous", "ambiguous", witnesses("Inspect", "Reopen")),
];

export const MODEL_MUTATIONS: ModelMutation[] = [
  { id: "custody-cutover", base: "custody-stable", mutation: "cutover", property: "NoSibling", kind: "invariant" },
  { id: "custody-skip-check", base: "custody-stable", mutation: "skip-check", property: "NoSibling", kind: "invariant" },
  { id: "custody-early-release", base: "custody-stable", mutation: "early-release", property: "CriticalSectionCustody", kind: "invariant" },
  { id: "custody-global", base: "custody-independent", mutation: "global", property: "IndependentEnabled", kind: "invariant" },
  { id: "custody-no-fairness", base: "custody-progress", specification: "Spec", property: "EventuallyDone", kind: "liveness" },
  ...["file", "leaf", "ancestor1", "ancestor2"].map(barrier => ({ id: `store-skip-${barrier}-sync`, base: "store-fresh", mutation: `skip-${barrier}-sync`, property: "ReopenedAckReadable", kind: "invariant" as const })),
  ...["ancestor1", "ancestor2"].map(barrier => ({ id: `existing-skip-${barrier}-sync`, base: "store-existing-ancestors", mutation: `skip-${barrier}-sync`, property: "ReopenedAckReadable", kind: "invariant" as const })),
  { id: "store-skip-retained-sync", base: "store-retained", mutation: "skip-retained-sync", property: "ReopenedAckReadable", kind: "invariant" },
  { id: "store-overwrite-winner", base: "store-retained", mutation: "overwrite-winner", property: "WinnerRetained", kind: "invariant" },
  { id: "head-skip-dependency", base: "selected-head", mutation: "skip-dependency", property: "HeadHasDependency", kind: "invariant" },
  ...["delete-first", "skip-file-sync", "skip-consumed-sync"].map(mutation => ({ id: `mailbox-${mutation}`, base: "mailbox-clean", mutation, property: "NoUnmarkedLoss", kind: "invariant" as const })),
  ...["pending", "lock"].map(barrier => ({ id: `mailbox-skip-${barrier}-sync`, base: "mailbox-clean", mutation: `skip-${barrier}-sync`, property: "AckCleanReopen", kind: "invariant" as const })),
  { id: "mailbox-accept-ambiguous", base: "mailbox-ambiguous", mutation: "accept-ambiguous", property: "AmbiguousNotAck", kind: "invariant" },
];

export const LIVE_SOURCES: Record<TlcSuite, string[]> = {
  custody: ["src/application.ts", "src/application-quota.ts", "src/host-state.ts", "crates/algal/src/application.rs", "crates/algal/src/application_quota.rs", "crates/algal/src/lease.rs", "spec/v1/application.md", "spec/v1/process.md"],
  publication: ["src/store.ts", "src/host-state.ts", "src/mailbox.ts", "src/durable-fs.ts", "crates/algal/src/store.rs", "crates/algal/src/lease.rs", "crates/algal/src/mailbox.rs", "crates/algal/src/durable_fs.rs", "spec/v1/organism.md", "spec/v1/application.md", "spec/v1/process.md"],
};
export const ADAPTER_SOURCES = ["verify/lib/tlc.ts", "verify/tla/definitions.ts", "verify/tla/java-runtime.json", "verify/tla/qualify-java-runtime.py", "verify/tla/README.md", "verify/tla/run.ts", "verify/lib/proof.ts", "verify/lib/claims.ts", "verify/lib/suites.ts", "verify/lib/files.ts", "verify/lib/schema.ts", "verify/lib/runner.ts", "verify/lib/command-supervisor.ts", "verify/toolchains.json", "verify/toolchain-distributions.json", "verify/assumptions.md"];
