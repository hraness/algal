export const PLANNED_SUITES = [
  "toolchain-smoke",
  "corpus", "differential", "fuzz-smoke", "evidence-mutation", "axioms", "lean-expr", "expr-conformance", "expr-abi",
  "lean-memory", "memory-oracle", "memory-mutation", "context-laws", "kani", "rust-bridge", "bridge-drift",
  "source-reference", "lean-source", "source-differential", "lean-replay", "replay-isolation", "receipt-closure",
  "evolution-model", "memory-authority", "lean-admission", "policy-mutation", "host-conformance", "assurance",
  "change-impact", "release-evidence", "gate-selftest", "hosted-model", "hosted-conformance",
] as const;

export const READY_SUITES = ["claims", "runner-selftest", "boundary", "artifact", "custody", "publication", "traces", "stateful", "fault-harness", "lean-core", "process-model", "mailbox-model", "lease-model", "application-model", "outbox-model", "quota-model", "authority-model", "process-conformance", "mailbox-conformance", "lease-conformance", "stateful-app", "scheduler-model", "scheduler-conformance"] as const;
export const SUITES: ReadonlyMap<string, "ready" | "not-started"> = new Map([
  ...READY_SUITES.map(name => [name, "ready"] as const),
  ...PLANNED_SUITES.map(name => [name, "not-started"] as const),
]);
