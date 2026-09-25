import type { ModelMutation, ModelProfile } from "../definitions";

const invariants = ["TypeOK", "CapacityBound", "ImmutableClaim", "NoRevival", "NoUnmarkedLoss", "DispatchAuthorized", "CriticalCustody", "RevocationPermanent", "ResidueBlocks", "BadEvidenceRetained", "AckReleased", "SendAckEvidence", "ReceiveAckEvidence", "AtMostOneReceipt", "MutationBoundaryRecorded", "MutationErrorsUncertain", "NoInventedUncertainty"];
const witness = (action: string, property = `Never${action}`) => ({ action, property });
const actions = (...names: string[]) => names.map(name => witness(name));
function profile(id: string, scenario: string, remaining: number, reached: ModelProfile["actions"], property?: string): ModelProfile {
  const revocation = scenario.startsWith("revoke-"), authorityOnly = ["wrong-class", "foreign-authority"].includes(scenario);
  const targeted = ["death", "interruption", "orphan-claim", "orphan-interruption", "ambiguous", "malformed", "conflicting-marker", "missing-claim"].includes(scenario);
  return {
    id: `mailbox-${id}`, suite: "mailbox", module: "MailboxProtocol", path: "verify/tla/mailbox/MailboxProtocol.tla",
    constants: { Mutation: '"none"', Scenario: JSON.stringify(scenario), Remaining: String(remaining) },
    specification: property ? "FairSpec" : "Spec", invariants, properties: property ? [property] : [], actions: reached,
    bounds: {
      senders: authorityOnly || targeted || revocation ? 1 : 2,
      receivers: authorityOnly ? 0 : revocation ? 1 : 2,
      revokers: revocation ? 1 : 0, keys: 2, payloads: 2, callsPerActor: 1,
      initialRemainingCapacity: remaining, productionMaxMessages: remaining === 0 ? 1 : remaining,
      initiallyPending: remaining === 0 ? 1 : 0, processDeaths: scenario === "death" ? 1 : 0,
      injectedFailures: ["interruption", "revoke-interruption", "orphan-interruption"].includes(scenario) ? 1 : 0, automaticReconciliations: 0,
    },
    assumptions: [
      "One admitted mailbox; cooperating writers and exclusive atomic pathname-lock acquisition",
      "Key symbols preserve the order of two actual delivery-key digests; admitted payload/delivery identities are distinct and retained claims immutable",
      "Claim, marker, revocation and lock-release actions compose completed Phase02 publication barriers; cuts within those helpers and machine power loss are outside this upper protocol model",
      "Named damaged initial layouts are explicit admission profiles, not arbitrary hostile concurrent filesystem mutation",
      "One bounded call per active actor; equal retries use the second sender; receive has no retained caller operation/result identity",
      "Mutation uncertainty starts before a fresh claim, pending marker, consumed marker or capability-record publication attempt; earlier admission and retained-read failures remain settled for this invocation",
      "Retained locks and ambiguous dual markers require host reconciliation; no production repair action or automatic retry is assumed",
      ...(property ? ["Weak fairness of each active actor step; this profile enables no process death or injected failure; eventual return includes rejection and is not a successful-delivery or scheduler-starvation guarantee"] : []),
    ],
  };
}

export const MAILBOX_PROFILES: ModelProfile[] = [
  profile("capacity-zero", "capacity", 0, actions("RejectSend", "RetryPending")),
  profile("capacity-one", "capacity", 1, actions("Resolve", "Acquire", "RejectBusy", "Recheck", "BeginClaim", "Claim", "BeginEnqueue", "Enqueue", "Suspend", "SelectReceive", "BeginConsume", "PublishConsumed", "UnlinkPending", "Release", "Ack")),
  profile("capacity-two", "capacity", 2, [witness("Enqueue", "NeverTwoPending")]),
  profile("equal-retry", "retry", 1, actions("UseClaim", "RetryPending", "RetryConsumed")),
  profile("conflicting-retry", "conflict", 1, [witness("RejectSend", "NeverRejectConflict")]),
  profile("revoked-send", "revoked-send", 1, [witness("Resolve", "NeverDenyResolve")]),
  profile("revoked-receive", "revoked-receive", 1, [witness("Resolve", "NeverDenyResolve")]),
  profile("wrong-class", "wrong-class", 1, [witness("Resolve", "NeverDenyResolve")]),
  profile("foreign-authority", "foreign-authority", 1, [witness("Resolve", "NeverDenyResolve")]),
  profile("revoke-send", "revoke-send", 0, [witness("BeginRevoke"), witness("Revoke"), witness("Recheck", "NeverRejectRevokedUnderLock")]),
  profile("revoke-receive", "revoke-receive", 0, [witness("Revoke"), witness("Recheck", "NeverRejectRevokedUnderLock")]),
  profile("death", "death", 0, [witness("Death", "NeverDeathAfterDequeue"), ...actions("Reopen", "RequireReconciliation", "RejectBusy")]),
  profile("interruption", "interruption", 0, [...actions("FailRelease", "FailAfterRelease", "Readiness", "RequireReconciliation"), witness("Fail", "NeverFailPreMutationReceive"), witness("Ack", "NeverAckUncertainReceive")]),
  profile("fresh-send-interruption", "interruption", 1, [witness("Ack", "NeverAckUncertainFreshSend"), witness("FailAfterRelease", "NeverFailAfterPublishedSend")]),
  profile("revoke-interruption", "revoke-interruption", 0, [witness("Ack", "NeverAckUncertainRevoke"), witness("Fail", "NeverFailPreMutationRevoke")]),
  profile("protocol-ambiguous", "ambiguous", 0, actions("RejectDelivery", "RejectReceive", "RequireReconciliation")),
  profile("malformed", "malformed", 0, actions("RejectReceive", "Readiness")),
  profile("conflicting-marker", "conflicting-marker", 0, actions("RejectDelivery", "RejectReceive")),
  profile("missing-claim", "missing-claim", 0, actions("RejectSend", "RejectReceive")),
  profile("orphan-claim", "orphan-claim", 0, actions("UseClaim", "RejectFull", "Enqueue")),
  profile("orphan-interruption", "orphan-interruption", 0, [witness("BeginEnqueue"), witness("Fail", "NeverFailPreMutationOrphanSend"), witness("Ack", "NeverAckUncertainOrphanSend")]),
  profile("return-progress", "capacity", 2, actions("Ack"), "EventuallyDone"),
  profile("selected-receive-progress", "capacity", 2, actions("BeginConsume"), "SelectedReceiveReturns"),
];

export const MAILBOX_MUTATIONS: ModelMutation[] = [
  { id: "mailbox-revive-consumed", base: "mailbox-equal-retry", mutation: "revive-consumed", property: "NoRevival", kind: "invariant" },
  { id: "mailbox-skip-locked-authority", base: "mailbox-revoke-send", mutation: "skip-locked-authority", property: "DispatchAuthorized", kind: "invariant" },
  { id: "mailbox-overwrite-claim", base: "mailbox-conflicting-retry", mutation: "overwrite-claim", property: "ImmutableClaim", kind: "invariant" },
  { id: "mailbox-skip-capacity", base: "mailbox-capacity-one", mutation: "skip-capacity", property: "CapacityBound", kind: "invariant" },
  { id: "mailbox-delete-before-consumed", base: "mailbox-capacity-zero", mutation: "delete-before-consumed", property: "NoUnmarkedLoss", kind: "invariant" },
  { id: "mailbox-skip-lock", base: "mailbox-capacity-one", mutation: "skip-lock", property: "CriticalCustody", kind: "invariant" },
  { id: "mailbox-reclaim-residue", base: "mailbox-death", mutation: "reclaim-residue", property: "ResidueBlocks", kind: "invariant" },
  { id: "mailbox-protocol-accept-ambiguous", base: "mailbox-protocol-ambiguous", mutation: "accept-ambiguous", property: "BadEvidenceRetained", kind: "invariant" },
  { id: "mailbox-no-fairness", base: "mailbox-return-progress", specification: "Spec", property: "EventuallyDone", kind: "liveness" },
  { id: "mailbox-skip-mark-enqueue", base: "mailbox-orphan-interruption", mutation: "skip-mark-enqueue", property: "MutationBoundaryRecorded", kind: "invariant" },
  { id: "mailbox-invent-uncertain", base: "mailbox-interruption", mutation: "invent-uncertain", property: "NoInventedUncertainty", kind: "invariant" },
  { id: "mailbox-settle-uncertain", base: "mailbox-interruption", mutation: "settle-uncertain", property: "MutationErrorsUncertain", kind: "invariant" },
];

export const MAILBOX_LIVE_SOURCES = [
  "src/mailbox.ts", "src/capabilities.ts", "src/durable-fs.ts",
  "src/mailbox-model.test.ts", "src/mailbox-journal.test.ts", "crates/algal/src/mailbox_model.rs",
  "crates/algal/src/mailbox.rs", "crates/algal/src/capabilities.rs", "crates/algal/src/durable_fs.rs",
  "spec/v1/organism.md", "spec/v1/process.md", "spec/v1/process-journal.md", "verify/tla/publication/MailboxPublication.tla",
  "verify/traces/wire.md", "verify/traces/check.ts", "verify/traces/fixtures/mailbox.json", "verify/traces/fixtures/mailbox-uncertainty.json",
];
