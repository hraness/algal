import type { ModelMutation, ModelProfile } from "../definitions";

/** Reviewed static finite profiles; see SCOPE.md for assumptions and reductions. */
export const APPLICATION_PROFILES: ModelProfile[] = [
  {
    "id": "selection-race",
    "suite": "application",
    "module": "ApplicationSelection",
    "path": "verify/tla/application/ApplicationSelection.tla",
    "constants": {
      "Mutation": "\"none\"",
      "Scenario": "\"race\"",
      "Kind": "\"memory\"",
      "StateLimit": "4"
    },
    "specification": "Spec",
    "invariants": [
      "TypeOK",
      "ContentIdentity",
      "Custody",
      "CommittedPrefix",
      "IdentityUnique",
      "NamespaceIsolation",
      "SelectionAtomic",
      "DependenciesBeforeHead",
      "QuotaBeforeHead",
      "HostBeforeHead",
      "SequenceEpoch",
      "CompatibleSelection",
      "SpecialKinds",
      "RequestBinding",
      "EvidenceBound",
      "ReturnBinding",
      "MutationErrorsUncertain",
      "NoInventedUncertainty"
    ],
    "properties": [],
    "actions": [
      {
        "action": "PublishDependencies",
        "property": "NeverPublishDependencies"
      },
      {
        "action": "PrepareIndex",
        "property": "NeverPrepareIndex"
      },
      {
        "action": "SelectHead",
        "property": "NeverSelectHead"
      }
    ],
    "bounds": {
      "applications": 2,
      "actors": 3,
      "newOperations": 3,
      "internedNodes": 5,
      "revisionSymbols": 2,
      "memorySymbols": 2,
      "failures": 1,
      "processDeaths": 1,
      "statesPerApplication": 4,
      "scenario": "race"
    },
    "assumptions": [
      "Completed custody/publication/quota actions compose the earlier lower-level models; arbitrary concurrent filesystem mutation and power loss are not modeled.",
      "Immutable ghost content interning assumes collision-free canonical identity; request/evidence records are finite projections, not full production serialization.",
      "Trusted evidence validation is an admitted input; singleton seeded restoration is a structural overapproximation, not a realizable retained-ancestor conformance case."
    ]
  },
  {
    "id": "selection-chain",
    "suite": "application",
    "module": "ApplicationSelection",
    "path": "verify/tla/application/ApplicationSelection.tla",
    "constants": {
      "Mutation": "\"none\"",
      "Scenario": "\"chain\"",
      "Kind": "\"memory\"",
      "StateLimit": "4"
    },
    "specification": "Spec",
    "invariants": [
      "TypeOK",
      "ContentIdentity",
      "Custody",
      "CommittedPrefix",
      "IdentityUnique",
      "NamespaceIsolation",
      "SelectionAtomic",
      "DependenciesBeforeHead",
      "QuotaBeforeHead",
      "HostBeforeHead",
      "SequenceEpoch",
      "CompatibleSelection",
      "SpecialKinds",
      "RequestBinding",
      "EvidenceBound",
      "ReturnBinding",
      "MutationErrorsUncertain",
      "NoInventedUncertainty"
    ],
    "properties": [],
    "actions": [
      {
        "action": "SelectHead",
        "property": "NeverSelectHead"
      }
    ],
    "bounds": {
      "applications": 2,
      "actors": 3,
      "newOperations": 3,
      "internedNodes": 5,
      "revisionSymbols": 2,
      "memorySymbols": 2,
      "failures": 1,
      "processDeaths": 1,
      "statesPerApplication": 4,
      "scenario": "chain"
    },
    "assumptions": [
      "Completed custody/publication/quota actions compose the earlier lower-level models; arbitrary concurrent filesystem mutation and power loss are not modeled.",
      "Immutable ghost content interning assumes collision-free canonical identity; request/evidence records are finite projections, not full production serialization.",
      "Trusted evidence validation is an admitted input; singleton seeded restoration is a structural overapproximation, not a realizable retained-ancestor conformance case."
    ]
  },
  {
    "id": "selection-retry",
    "suite": "application",
    "module": "ApplicationSelection",
    "path": "verify/tla/application/ApplicationSelection.tla",
    "constants": {
      "Mutation": "\"none\"",
      "Scenario": "\"retry\"",
      "Kind": "\"memory\"",
      "StateLimit": "4"
    },
    "specification": "Spec",
    "invariants": [
      "TypeOK",
      "ContentIdentity",
      "Custody",
      "CommittedPrefix",
      "IdentityUnique",
      "NamespaceIsolation",
      "SelectionAtomic",
      "DependenciesBeforeHead",
      "QuotaBeforeHead",
      "HostBeforeHead",
      "SequenceEpoch",
      "CompatibleSelection",
      "SpecialKinds",
      "RequestBinding",
      "EvidenceBound",
      "ReturnBinding",
      "MutationErrorsUncertain",
      "NoInventedUncertainty"
    ],
    "properties": [],
    "actions": [
      {
        "action": "ExactRetry",
        "property": "NeverRetryOldHead"
      }
    ],
    "bounds": {
      "applications": 2,
      "actors": 3,
      "newOperations": 3,
      "internedNodes": 5,
      "revisionSymbols": 2,
      "memorySymbols": 2,
      "failures": 1,
      "processDeaths": 1,
      "statesPerApplication": 4,
      "scenario": "retry"
    },
    "assumptions": [
      "Completed custody/publication/quota actions compose the earlier lower-level models; arbitrary concurrent filesystem mutation and power loss are not modeled.",
      "Immutable ghost content interning assumes collision-free canonical identity; request/evidence records are finite projections, not full production serialization.",
      "Trusted evidence validation is an admitted input; singleton seeded restoration is a structural overapproximation, not a realizable retained-ancestor conformance case."
    ]
  },
  {
    "id": "selection-retry-denied-host",
    "suite": "application",
    "module": "ApplicationSelection",
    "path": "verify/tla/application/ApplicationSelection.tla",
    "constants": {
      "Mutation": "\"none\"",
      "Scenario": "\"retry-host-denial\"",
      "Kind": "\"memory\"",
      "StateLimit": "4"
    },
    "specification": "Spec",
    "invariants": [
      "TypeOK",
      "ContentIdentity",
      "Custody",
      "CommittedPrefix",
      "IdentityUnique",
      "NamespaceIsolation",
      "SelectionAtomic",
      "DependenciesBeforeHead",
      "QuotaBeforeHead",
      "HostBeforeHead",
      "SequenceEpoch",
      "CompatibleSelection",
      "SpecialKinds",
      "RequestBinding",
      "EvidenceBound",
      "ReturnBinding",
      "MutationErrorsUncertain",
      "NoInventedUncertainty"
    ],
    "properties": [],
    "actions": [
      {
        "action": "ExactRetry",
        "property": "NeverRetryDeniedHost"
      }
    ],
    "bounds": {
      "applications": 2,
      "actors": 3,
      "newOperations": 3,
      "internedNodes": 5,
      "revisionSymbols": 2,
      "memorySymbols": 2,
      "failures": 1,
      "processDeaths": 1,
      "statesPerApplication": 4,
      "scenario": "retry-host-denial"
    },
    "assumptions": [
      "Completed custody/publication/quota actions compose the earlier lower-level models; arbitrary concurrent filesystem mutation and power loss are not modeled.",
      "Immutable ghost content interning assumes collision-free canonical identity; request/evidence records are finite projections, not full production serialization.",
      "Trusted evidence validation is an admitted input; singleton seeded restoration is a structural overapproximation, not a realizable retained-ancestor conformance case."
    ]
  },
  {
    "id": "selection-conflict",
    "suite": "application",
    "module": "ApplicationSelection",
    "path": "verify/tla/application/ApplicationSelection.tla",
    "constants": {
      "Mutation": "\"none\"",
      "Scenario": "\"conflict\"",
      "Kind": "\"memory\"",
      "StateLimit": "4"
    },
    "specification": "Spec",
    "invariants": [
      "TypeOK",
      "ContentIdentity",
      "Custody",
      "CommittedPrefix",
      "IdentityUnique",
      "NamespaceIsolation",
      "SelectionAtomic",
      "DependenciesBeforeHead",
      "QuotaBeforeHead",
      "HostBeforeHead",
      "SequenceEpoch",
      "CompatibleSelection",
      "SpecialKinds",
      "RequestBinding",
      "EvidenceBound",
      "ReturnBinding",
      "MutationErrorsUncertain",
      "NoInventedUncertainty"
    ],
    "properties": [],
    "actions": [
      {
        "action": "Reject",
        "property": "NeverRejectConflict"
      }
    ],
    "bounds": {
      "applications": 2,
      "actors": 3,
      "newOperations": 3,
      "internedNodes": 5,
      "revisionSymbols": 2,
      "memorySymbols": 2,
      "failures": 1,
      "processDeaths": 1,
      "statesPerApplication": 4,
      "scenario": "conflict"
    },
    "assumptions": [
      "Completed custody/publication/quota actions compose the earlier lower-level models; arbitrary concurrent filesystem mutation and power loss are not modeled.",
      "Immutable ghost content interning assumes collision-free canonical identity; request/evidence records are finite projections, not full production serialization.",
      "Trusted evidence validation is an admitted input; singleton seeded restoration is a structural overapproximation, not a realizable retained-ancestor conformance case."
    ]
  },
  {
    "id": "selection-missing-index",
    "suite": "application",
    "module": "ApplicationSelection",
    "path": "verify/tla/application/ApplicationSelection.tla",
    "constants": {
      "Mutation": "\"none\"",
      "Scenario": "\"missing-index\"",
      "Kind": "\"memory\"",
      "StateLimit": "4"
    },
    "specification": "Spec",
    "invariants": [
      "TypeOK",
      "ContentIdentity",
      "Custody",
      "CommittedPrefix",
      "IdentityUnique",
      "NamespaceIsolation",
      "SelectionAtomic",
      "DependenciesBeforeHead",
      "QuotaBeforeHead",
      "HostBeforeHead",
      "SequenceEpoch",
      "CompatibleSelection",
      "SpecialKinds",
      "RequestBinding",
      "EvidenceBound",
      "ReturnBinding",
      "MutationErrorsUncertain",
      "NoInventedUncertainty"
    ],
    "properties": [],
    "actions": [
      {
        "action": "RemoveIndex",
        "property": "NeverRemoveIndex"
      },
      {
        "action": "Reject",
        "property": "NeverRejectMissingIndex"
      }
    ],
    "bounds": {
      "applications": 2,
      "actors": 3,
      "newOperations": 3,
      "internedNodes": 5,
      "revisionSymbols": 2,
      "memorySymbols": 2,
      "failures": 1,
      "processDeaths": 1,
      "statesPerApplication": 4,
      "scenario": "missing-index"
    },
    "assumptions": [
      "Completed custody/publication/quota actions compose the earlier lower-level models; arbitrary concurrent filesystem mutation and power loss are not modeled.",
      "Immutable ghost content interning assumes collision-free canonical identity; request/evidence records are finite projections, not full production serialization.",
      "Trusted evidence validation is an admitted input; singleton seeded restoration is a structural overapproximation, not a realizable retained-ancestor conformance case."
    ]
  },
  {
    "id": "selection-reuse-missing",
    "suite": "application",
    "module": "ApplicationSelection",
    "path": "verify/tla/application/ApplicationSelection.tla",
    "constants": {
      "Mutation": "\"none\"",
      "Scenario": "\"reuse-missing\"",
      "Kind": "\"memory\"",
      "StateLimit": "4"
    },
    "specification": "Spec",
    "invariants": [
      "TypeOK",
      "ContentIdentity",
      "Custody",
      "CommittedPrefix",
      "IdentityUnique",
      "NamespaceIsolation",
      "SelectionAtomic",
      "DependenciesBeforeHead",
      "QuotaBeforeHead",
      "HostBeforeHead",
      "SequenceEpoch",
      "CompatibleSelection",
      "SpecialKinds",
      "RequestBinding",
      "EvidenceBound",
      "ReturnBinding",
      "MutationErrorsUncertain",
      "NoInventedUncertainty"
    ],
    "properties": [],
    "actions": [
      {
        "action": "Reject",
        "property": "NeverRejectMissingIndex"
      }
    ],
    "bounds": {
      "applications": 2,
      "actors": 3,
      "newOperations": 3,
      "internedNodes": 5,
      "revisionSymbols": 2,
      "memorySymbols": 2,
      "failures": 1,
      "processDeaths": 1,
      "statesPerApplication": 4,
      "scenario": "reuse-missing"
    },
    "assumptions": [
      "Completed custody/publication/quota actions compose the earlier lower-level models; arbitrary concurrent filesystem mutation and power loss are not modeled.",
      "Immutable ghost content interning assumes collision-free canonical identity; request/evidence records are finite projections, not full production serialization.",
      "Trusted evidence validation is an admitted input; singleton seeded restoration is a structural overapproximation, not a realizable retained-ancestor conformance case."
    ]
  },
  {
    "id": "selection-orphan",
    "suite": "application",
    "module": "ApplicationSelection",
    "path": "verify/tla/application/ApplicationSelection.tla",
    "constants": {
      "Mutation": "\"none\"",
      "Scenario": "\"orphan\"",
      "Kind": "\"memory\"",
      "StateLimit": "4"
    },
    "specification": "Spec",
    "invariants": [
      "TypeOK",
      "ContentIdentity",
      "Custody",
      "CommittedPrefix",
      "IdentityUnique",
      "NamespaceIsolation",
      "SelectionAtomic",
      "DependenciesBeforeHead",
      "QuotaBeforeHead",
      "HostBeforeHead",
      "SequenceEpoch",
      "CompatibleSelection",
      "SpecialKinds",
      "RequestBinding",
      "EvidenceBound",
      "ReturnBinding",
      "MutationErrorsUncertain",
      "NoInventedUncertainty"
    ],
    "properties": [],
    "actions": [
      {
        "action": "Crash",
        "property": "NeverCrashPrepared"
      },
      {
        "action": "SelectHead",
        "property": "NeverFinishOrphan"
      },
      {
        "action": "Reject",
        "property": "NeverRejectOrphan"
      },
      {
        "action": "Reopen",
        "property": "NeverReopen"
      }
    ],
    "bounds": {
      "applications": 2,
      "actors": 3,
      "newOperations": 3,
      "internedNodes": 5,
      "revisionSymbols": 2,
      "memorySymbols": 2,
      "failures": 1,
      "processDeaths": 1,
      "statesPerApplication": 4,
      "scenario": "orphan"
    },
    "assumptions": [
      "Completed custody/publication/quota actions compose the earlier lower-level models; arbitrary concurrent filesystem mutation and power loss are not modeled.",
      "Immutable ghost content interning assumes collision-free canonical identity; request/evidence records are finite projections, not full production serialization.",
      "Trusted evidence validation is an admitted input; singleton seeded restoration is a structural overapproximation, not a realizable retained-ancestor conformance case."
    ]
  },
  {
    "id": "selection-faults",
    "suite": "application",
    "module": "ApplicationSelection",
    "path": "verify/tla/application/ApplicationSelection.tla",
    "constants": {
      "Mutation": "\"none\"",
      "Scenario": "\"faults\"",
      "Kind": "\"memory\"",
      "StateLimit": "4"
    },
    "specification": "Spec",
    "invariants": [
      "TypeOK",
      "ContentIdentity",
      "Custody",
      "CommittedPrefix",
      "IdentityUnique",
      "NamespaceIsolation",
      "SelectionAtomic",
      "DependenciesBeforeHead",
      "QuotaBeforeHead",
      "HostBeforeHead",
      "SequenceEpoch",
      "CompatibleSelection",
      "SpecialKinds",
      "RequestBinding",
      "EvidenceBound",
      "ReturnBinding",
      "MutationErrorsUncertain",
      "NoInventedUncertainty"
    ],
    "properties": [],
    "actions": [
      {
        "action": "Fail",
        "property": "NeverFailAfterSelection"
      }
    ],
    "bounds": {
      "applications": 2,
      "actors": 3,
      "newOperations": 3,
      "internedNodes": 5,
      "revisionSymbols": 2,
      "memorySymbols": 2,
      "failures": 1,
      "processDeaths": 1,
      "statesPerApplication": 4,
      "scenario": "faults"
    },
    "assumptions": [
      "Completed custody/publication/quota actions compose the earlier lower-level models; arbitrary concurrent filesystem mutation and power loss are not modeled.",
      "Immutable ghost content interning assumes collision-free canonical identity; request/evidence records are finite projections, not full production serialization.",
      "Trusted evidence validation is an admitted input; singleton seeded restoration is a structural overapproximation, not a realizable retained-ancestor conformance case."
    ]
  },
  {
    "id": "selection-faults-additional-witness-1",
    "suite": "application",
    "module": "ApplicationSelection",
    "path": "verify/tla/application/ApplicationSelection.tla",
    "constants": {
      "Mutation": "\"none\"",
      "Scenario": "\"faults\"",
      "Kind": "\"memory\"",
      "StateLimit": "4"
    },
    "specification": "Spec",
    "invariants": [
      "TypeOK",
      "ContentIdentity",
      "Custody",
      "CommittedPrefix",
      "IdentityUnique",
      "NamespaceIsolation",
      "SelectionAtomic",
      "DependenciesBeforeHead",
      "QuotaBeforeHead",
      "HostBeforeHead",
      "SequenceEpoch",
      "CompatibleSelection",
      "SpecialKinds",
      "RequestBinding",
      "EvidenceBound",
      "ReturnBinding",
      "MutationErrorsUncertain",
      "NoInventedUncertainty"
    ],
    "properties": [],
    "actions": [
      {
        "action": "Fail",
        "property": "NeverFailBeforeSelection"
      }
    ],
    "bounds": {
      "applications": 2,
      "actors": 3,
      "newOperations": 3,
      "internedNodes": 5,
      "revisionSymbols": 2,
      "memorySymbols": 2,
      "failures": 1,
      "processDeaths": 1,
      "statesPerApplication": 4,
      "scenario": "faults"
    },
    "assumptions": [
      "Completed custody/publication/quota actions compose the earlier lower-level models; arbitrary concurrent filesystem mutation and power loss are not modeled.",
      "Immutable ghost content interning assumes collision-free canonical identity; request/evidence records are finite projections, not full production serialization.",
      "Trusted evidence validation is an admitted input; singleton seeded restoration is a structural overapproximation, not a realizable retained-ancestor conformance case."
    ]
  },
  {
    "id": "selection-quota",
    "suite": "application",
    "module": "ApplicationSelection",
    "path": "verify/tla/application/ApplicationSelection.tla",
    "constants": {
      "Mutation": "\"none\"",
      "Scenario": "\"quota-denial\"",
      "Kind": "\"memory\"",
      "StateLimit": "4"
    },
    "specification": "Spec",
    "invariants": [
      "TypeOK",
      "ContentIdentity",
      "Custody",
      "CommittedPrefix",
      "IdentityUnique",
      "NamespaceIsolation",
      "SelectionAtomic",
      "DependenciesBeforeHead",
      "QuotaBeforeHead",
      "HostBeforeHead",
      "SequenceEpoch",
      "CompatibleSelection",
      "SpecialKinds",
      "RequestBinding",
      "EvidenceBound",
      "ReturnBinding",
      "MutationErrorsUncertain",
      "NoInventedUncertainty"
    ],
    "properties": [],
    "actions": [
      {
        "action": "Fail",
        "property": "NeverDenyQuota"
      }
    ],
    "bounds": {
      "applications": 2,
      "actors": 3,
      "newOperations": 3,
      "internedNodes": 5,
      "revisionSymbols": 2,
      "memorySymbols": 2,
      "failures": 1,
      "processDeaths": 1,
      "statesPerApplication": 4,
      "scenario": "quota-denial"
    },
    "assumptions": [
      "Completed custody/publication/quota actions compose the earlier lower-level models; arbitrary concurrent filesystem mutation and power loss are not modeled.",
      "Immutable ghost content interning assumes collision-free canonical identity; request/evidence records are finite projections, not full production serialization.",
      "Trusted evidence validation is an admitted input; singleton seeded restoration is a structural overapproximation, not a realizable retained-ancestor conformance case."
    ]
  },
  {
    "id": "selection-namespace",
    "suite": "application",
    "module": "ApplicationSelection",
    "path": "verify/tla/application/ApplicationSelection.tla",
    "constants": {
      "Mutation": "\"none\"",
      "Scenario": "\"namespace\"",
      "Kind": "\"memory\"",
      "StateLimit": "4"
    },
    "specification": "Spec",
    "invariants": [
      "TypeOK",
      "ContentIdentity",
      "Custody",
      "CommittedPrefix",
      "IdentityUnique",
      "NamespaceIsolation",
      "SelectionAtomic",
      "DependenciesBeforeHead",
      "QuotaBeforeHead",
      "HostBeforeHead",
      "SequenceEpoch",
      "CompatibleSelection",
      "SpecialKinds",
      "RequestBinding",
      "EvidenceBound",
      "ReturnBinding",
      "MutationErrorsUncertain",
      "NoInventedUncertainty"
    ],
    "properties": [],
    "actions": [
      {
        "action": "Acquire",
        "property": "NeverParallelNamespaces"
      }
    ],
    "bounds": {
      "applications": 2,
      "actors": 3,
      "newOperations": 3,
      "internedNodes": 5,
      "revisionSymbols": 2,
      "memorySymbols": 2,
      "failures": 1,
      "processDeaths": 1,
      "statesPerApplication": 4,
      "scenario": "namespace"
    },
    "assumptions": [
      "Completed custody/publication/quota actions compose the earlier lower-level models; arbitrary concurrent filesystem mutation and power loss are not modeled.",
      "Immutable ghost content interning assumes collision-free canonical identity; request/evidence records are finite projections, not full production serialization.",
      "Trusted evidence validation is an admitted input; singleton seeded restoration is a structural overapproximation, not a realizable retained-ancestor conformance case."
    ]
  },
  {
    "id": "selection-limit",
    "suite": "application",
    "module": "ApplicationSelection",
    "path": "verify/tla/application/ApplicationSelection.tla",
    "constants": {
      "Mutation": "\"none\"",
      "Scenario": "\"chain\"",
      "Kind": "\"memory\"",
      "StateLimit": "2"
    },
    "specification": "Spec",
    "invariants": [
      "TypeOK",
      "ContentIdentity",
      "Custody",
      "CommittedPrefix",
      "IdentityUnique",
      "NamespaceIsolation",
      "SelectionAtomic",
      "DependenciesBeforeHead",
      "QuotaBeforeHead",
      "HostBeforeHead",
      "SequenceEpoch",
      "CompatibleSelection",
      "SpecialKinds",
      "RequestBinding",
      "EvidenceBound",
      "ReturnBinding",
      "MutationErrorsUncertain",
      "NoInventedUncertainty"
    ],
    "properties": [],
    "actions": [
      {
        "action": "SelectHead",
        "property": "NeverSelectHead"
      }
    ],
    "bounds": {
      "applications": 2,
      "actors": 3,
      "newOperations": 3,
      "internedNodes": 5,
      "revisionSymbols": 2,
      "memorySymbols": 2,
      "failures": 1,
      "processDeaths": 1,
      "statesPerApplication": 2,
      "scenario": "chain"
    },
    "assumptions": [
      "Completed custody/publication/quota actions compose the earlier lower-level models; arbitrary concurrent filesystem mutation and power loss are not modeled.",
      "Immutable ghost content interning assumes collision-free canonical identity; request/evidence records are finite projections, not full production serialization.",
      "Trusted evidence validation is an admitted input; singleton seeded restoration is a structural overapproximation, not a realizable retained-ancestor conformance case."
    ]
  },
  {
    "id": "selection-first-guard",
    "suite": "application",
    "module": "ApplicationSelection",
    "path": "verify/tla/application/ApplicationSelection.tla",
    "constants": {
      "Mutation": "\"skip-first-head\"",
      "Scenario": "\"race\"",
      "Kind": "\"memory\"",
      "StateLimit": "4"
    },
    "specification": "Spec",
    "invariants": [
      "TypeOK",
      "ContentIdentity",
      "Custody",
      "CommittedPrefix",
      "IdentityUnique",
      "NamespaceIsolation",
      "SelectionAtomic",
      "DependenciesBeforeHead",
      "QuotaBeforeHead",
      "HostBeforeHead",
      "SequenceEpoch",
      "CompatibleSelection",
      "SpecialKinds",
      "RequestBinding",
      "EvidenceBound",
      "ReturnBinding",
      "MutationErrorsUncertain",
      "NoInventedUncertainty"
    ],
    "properties": [],
    "actions": [
      {
        "action": "Reject",
        "property": "NeverRejectSecondHead"
      }
    ],
    "bounds": {
      "applications": 2,
      "actors": 3,
      "newOperations": 3,
      "internedNodes": 5,
      "revisionSymbols": 2,
      "memorySymbols": 2,
      "failures": 1,
      "processDeaths": 1,
      "statesPerApplication": 4,
      "scenario": "race"
    },
    "assumptions": [
      "Completed custody/publication/quota actions compose the earlier lower-level models; arbitrary concurrent filesystem mutation and power loss are not modeled.",
      "Immutable ghost content interning assumes collision-free canonical identity; request/evidence records are finite projections, not full production serialization.",
      "Trusted evidence validation is an admitted input; singleton seeded restoration is a structural overapproximation, not a realizable retained-ancestor conformance case."
    ]
  },
  {
    "id": "selection-activate",
    "suite": "application",
    "module": "ApplicationSelection",
    "path": "verify/tla/application/ApplicationSelection.tla",
    "constants": {
      "Mutation": "\"none\"",
      "Scenario": "\"chain\"",
      "Kind": "\"activate\"",
      "StateLimit": "4"
    },
    "specification": "Spec",
    "invariants": [
      "TypeOK",
      "ContentIdentity",
      "Custody",
      "CommittedPrefix",
      "IdentityUnique",
      "NamespaceIsolation",
      "SelectionAtomic",
      "DependenciesBeforeHead",
      "QuotaBeforeHead",
      "HostBeforeHead",
      "SequenceEpoch",
      "CompatibleSelection",
      "SpecialKinds",
      "RequestBinding",
      "EvidenceBound",
      "ReturnBinding",
      "MutationErrorsUncertain",
      "NoInventedUncertainty"
    ],
    "properties": [],
    "actions": [
      {
        "action": "SelectHead",
        "property": "NeverSelectHead"
      }
    ],
    "bounds": {
      "applications": 2,
      "actors": 3,
      "newOperations": 3,
      "internedNodes": 5,
      "revisionSymbols": 2,
      "memorySymbols": 2,
      "failures": 1,
      "processDeaths": 1,
      "statesPerApplication": 4,
      "scenario": "chain"
    },
    "assumptions": [
      "Completed custody/publication/quota actions compose the earlier lower-level models; arbitrary concurrent filesystem mutation and power loss are not modeled.",
      "Immutable ghost content interning assumes collision-free canonical identity; request/evidence records are finite projections, not full production serialization.",
      "Trusted evidence validation is an admitted input; singleton seeded restoration is a structural overapproximation, not a realizable retained-ancestor conformance case."
    ]
  },
  {
    "id": "selection-migrate",
    "suite": "application",
    "module": "ApplicationSelection",
    "path": "verify/tla/application/ApplicationSelection.tla",
    "constants": {
      "Mutation": "\"none\"",
      "Scenario": "\"chain\"",
      "Kind": "\"migrate\"",
      "StateLimit": "4"
    },
    "specification": "Spec",
    "invariants": [
      "TypeOK",
      "ContentIdentity",
      "Custody",
      "CommittedPrefix",
      "IdentityUnique",
      "NamespaceIsolation",
      "SelectionAtomic",
      "DependenciesBeforeHead",
      "QuotaBeforeHead",
      "HostBeforeHead",
      "SequenceEpoch",
      "CompatibleSelection",
      "SpecialKinds",
      "RequestBinding",
      "EvidenceBound",
      "ReturnBinding",
      "MutationErrorsUncertain",
      "NoInventedUncertainty"
    ],
    "properties": [],
    "actions": [
      {
        "action": "SelectHead",
        "property": "NeverSelectHead"
      }
    ],
    "bounds": {
      "applications": 2,
      "actors": 3,
      "newOperations": 3,
      "internedNodes": 5,
      "revisionSymbols": 2,
      "memorySymbols": 2,
      "failures": 1,
      "processDeaths": 1,
      "statesPerApplication": 4,
      "scenario": "chain"
    },
    "assumptions": [
      "Completed custody/publication/quota actions compose the earlier lower-level models; arbitrary concurrent filesystem mutation and power loss are not modeled.",
      "Immutable ghost content interning assumes collision-free canonical identity; request/evidence records are finite projections, not full production serialization.",
      "Trusted evidence validation is an admitted input; singleton seeded restoration is a structural overapproximation, not a realizable retained-ancestor conformance case."
    ]
  },
  {
    "id": "selection-restore",
    "suite": "application",
    "module": "ApplicationSelection",
    "path": "verify/tla/application/ApplicationSelection.tla",
    "constants": {
      "Mutation": "\"none\"",
      "Scenario": "\"chain\"",
      "Kind": "\"restore\"",
      "StateLimit": "4"
    },
    "specification": "Spec",
    "invariants": [
      "TypeOK",
      "ContentIdentity",
      "Custody",
      "CommittedPrefix",
      "IdentityUnique",
      "NamespaceIsolation",
      "SelectionAtomic",
      "DependenciesBeforeHead",
      "QuotaBeforeHead",
      "HostBeforeHead",
      "SequenceEpoch",
      "CompatibleSelection",
      "SpecialKinds",
      "RequestBinding",
      "EvidenceBound",
      "ReturnBinding",
      "MutationErrorsUncertain",
      "NoInventedUncertainty"
    ],
    "properties": [],
    "actions": [
      {
        "action": "SelectHead",
        "property": "NeverSelectHead"
      }
    ],
    "bounds": {
      "applications": 2,
      "actors": 3,
      "newOperations": 3,
      "internedNodes": 5,
      "revisionSymbols": 2,
      "memorySymbols": 2,
      "failures": 1,
      "processDeaths": 1,
      "statesPerApplication": 4,
      "scenario": "chain"
    },
    "assumptions": [
      "Completed custody/publication/quota actions compose the earlier lower-level models; arbitrary concurrent filesystem mutation and power loss are not modeled.",
      "Immutable ghost content interning assumes collision-free canonical identity; request/evidence records are finite projections, not full production serialization.",
      "Trusted evidence validation is an admitted input; singleton seeded restoration is a structural overapproximation, not a realizable retained-ancestor conformance case."
    ]
  },
  {
    "id": "selection-propose",
    "suite": "application",
    "module": "ApplicationSelection",
    "path": "verify/tla/application/ApplicationSelection.tla",
    "constants": {
      "Mutation": "\"none\"",
      "Scenario": "\"chain\"",
      "Kind": "\"propose\"",
      "StateLimit": "4"
    },
    "specification": "Spec",
    "invariants": [
      "TypeOK",
      "ContentIdentity",
      "Custody",
      "CommittedPrefix",
      "IdentityUnique",
      "NamespaceIsolation",
      "SelectionAtomic",
      "DependenciesBeforeHead",
      "QuotaBeforeHead",
      "HostBeforeHead",
      "SequenceEpoch",
      "CompatibleSelection",
      "SpecialKinds",
      "RequestBinding",
      "EvidenceBound",
      "ReturnBinding",
      "MutationErrorsUncertain",
      "NoInventedUncertainty"
    ],
    "properties": [],
    "actions": [
      {
        "action": "SelectHead",
        "property": "NeverSelectHead"
      }
    ],
    "bounds": {
      "applications": 2,
      "actors": 3,
      "newOperations": 3,
      "internedNodes": 5,
      "revisionSymbols": 2,
      "memorySymbols": 2,
      "failures": 1,
      "processDeaths": 1,
      "statesPerApplication": 4,
      "scenario": "chain"
    },
    "assumptions": [
      "Completed custody/publication/quota actions compose the earlier lower-level models; arbitrary concurrent filesystem mutation and power loss are not modeled.",
      "Immutable ghost content interning assumes collision-free canonical identity; request/evidence records are finite projections, not full production serialization.",
      "Trusted evidence validation is an admitted input; singleton seeded restoration is a structural overapproximation, not a realizable retained-ancestor conformance case."
    ]
  },
  {
    "id": "selection-investigate",
    "suite": "application",
    "module": "ApplicationSelection",
    "path": "verify/tla/application/ApplicationSelection.tla",
    "constants": {
      "Mutation": "\"none\"",
      "Scenario": "\"chain\"",
      "Kind": "\"investigate\"",
      "StateLimit": "4"
    },
    "specification": "Spec",
    "invariants": [
      "TypeOK",
      "ContentIdentity",
      "Custody",
      "CommittedPrefix",
      "IdentityUnique",
      "NamespaceIsolation",
      "SelectionAtomic",
      "DependenciesBeforeHead",
      "QuotaBeforeHead",
      "HostBeforeHead",
      "SequenceEpoch",
      "CompatibleSelection",
      "SpecialKinds",
      "RequestBinding",
      "EvidenceBound",
      "ReturnBinding",
      "MutationErrorsUncertain",
      "NoInventedUncertainty"
    ],
    "properties": [],
    "actions": [
      {
        "action": "SelectHead",
        "property": "NeverSelectHead"
      }
    ],
    "bounds": {
      "applications": 2,
      "actors": 3,
      "newOperations": 3,
      "internedNodes": 5,
      "revisionSymbols": 2,
      "memorySymbols": 2,
      "failures": 1,
      "processDeaths": 1,
      "statesPerApplication": 4,
      "scenario": "chain"
    },
    "assumptions": [
      "Completed custody/publication/quota actions compose the earlier lower-level models; arbitrary concurrent filesystem mutation and power loss are not modeled.",
      "Immutable ghost content interning assumes collision-free canonical identity; request/evidence records are finite projections, not full production serialization.",
      "Trusted evidence validation is an admitted input; singleton seeded restoration is a structural overapproximation, not a realizable retained-ancestor conformance case."
    ]
  },
  {
    "id": "selection-schema-activate",
    "suite": "application",
    "module": "ApplicationSelection",
    "path": "verify/tla/application/ApplicationSelection.tla",
    "constants": {
      "Mutation": "\"none\"",
      "Scenario": "\"schema-change\"",
      "Kind": "\"activate\"",
      "StateLimit": "4"
    },
    "specification": "Spec",
    "invariants": [
      "TypeOK",
      "ContentIdentity",
      "Custody",
      "CommittedPrefix",
      "IdentityUnique",
      "NamespaceIsolation",
      "SelectionAtomic",
      "DependenciesBeforeHead",
      "QuotaBeforeHead",
      "HostBeforeHead",
      "SequenceEpoch",
      "CompatibleSelection",
      "SpecialKinds",
      "RequestBinding",
      "EvidenceBound",
      "ReturnBinding",
      "MutationErrorsUncertain",
      "NoInventedUncertainty"
    ],
    "properties": [],
    "actions": [
      {
        "action": "Reject",
        "property": "NeverRejectStep"
      }
    ],
    "bounds": {
      "applications": 2,
      "actors": 3,
      "newOperations": 3,
      "internedNodes": 5,
      "revisionSymbols": 2,
      "memorySymbols": 2,
      "failures": 1,
      "processDeaths": 1,
      "statesPerApplication": 4,
      "scenario": "schema-change"
    },
    "assumptions": [
      "Completed custody/publication/quota actions compose the earlier lower-level models; arbitrary concurrent filesystem mutation and power loss are not modeled.",
      "Immutable ghost content interning assumes collision-free canonical identity; request/evidence records are finite projections, not full production serialization.",
      "Trusted evidence validation is an admitted input; singleton seeded restoration is a structural overapproximation, not a realizable retained-ancestor conformance case."
    ]
  },
  {
    "id": "selection-schema-migrate",
    "suite": "application",
    "module": "ApplicationSelection",
    "path": "verify/tla/application/ApplicationSelection.tla",
    "constants": {
      "Mutation": "\"none\"",
      "Scenario": "\"schema-change\"",
      "Kind": "\"migrate\"",
      "StateLimit": "4"
    },
    "specification": "Spec",
    "invariants": [
      "TypeOK",
      "ContentIdentity",
      "Custody",
      "CommittedPrefix",
      "IdentityUnique",
      "NamespaceIsolation",
      "SelectionAtomic",
      "DependenciesBeforeHead",
      "QuotaBeforeHead",
      "HostBeforeHead",
      "SequenceEpoch",
      "CompatibleSelection",
      "SpecialKinds",
      "RequestBinding",
      "EvidenceBound",
      "ReturnBinding",
      "MutationErrorsUncertain",
      "NoInventedUncertainty"
    ],
    "properties": [],
    "actions": [
      {
        "action": "SelectHead",
        "property": "NeverSelectHead"
      }
    ],
    "bounds": {
      "applications": 2,
      "actors": 3,
      "newOperations": 3,
      "internedNodes": 5,
      "revisionSymbols": 2,
      "memorySymbols": 2,
      "failures": 1,
      "processDeaths": 1,
      "statesPerApplication": 4,
      "scenario": "schema-change"
    },
    "assumptions": [
      "Completed custody/publication/quota actions compose the earlier lower-level models; arbitrary concurrent filesystem mutation and power loss are not modeled.",
      "Immutable ghost content interning assumes collision-free canonical identity; request/evidence records are finite projections, not full production serialization.",
      "Trusted evidence validation is an admitted input; singleton seeded restoration is a structural overapproximation, not a realizable retained-ancestor conformance case."
    ]
  },
  {
    "id": "selection-bad-runtime",
    "suite": "application",
    "module": "ApplicationSelection",
    "path": "verify/tla/application/ApplicationSelection.tla",
    "constants": {
      "Mutation": "\"none\"",
      "Scenario": "\"bad-runtime\"",
      "Kind": "\"activate\"",
      "StateLimit": "4"
    },
    "specification": "Spec",
    "invariants": [
      "TypeOK",
      "ContentIdentity",
      "Custody",
      "CommittedPrefix",
      "IdentityUnique",
      "NamespaceIsolation",
      "SelectionAtomic",
      "DependenciesBeforeHead",
      "QuotaBeforeHead",
      "HostBeforeHead",
      "SequenceEpoch",
      "CompatibleSelection",
      "SpecialKinds",
      "RequestBinding",
      "EvidenceBound",
      "ReturnBinding",
      "MutationErrorsUncertain",
      "NoInventedUncertainty"
    ],
    "properties": [],
    "actions": [
      {
        "action": "Reject",
        "property": "NeverRejectStep"
      }
    ],
    "bounds": {
      "applications": 2,
      "actors": 3,
      "newOperations": 3,
      "internedNodes": 5,
      "revisionSymbols": 2,
      "memorySymbols": 2,
      "failures": 1,
      "processDeaths": 1,
      "statesPerApplication": 4,
      "scenario": "bad-runtime"
    },
    "assumptions": [
      "Completed custody/publication/quota actions compose the earlier lower-level models; arbitrary concurrent filesystem mutation and power loss are not modeled.",
      "Immutable ghost content interning assumes collision-free canonical identity; request/evidence records are finite projections, not full production serialization.",
      "Trusted evidence validation is an admitted input; singleton seeded restoration is a structural overapproximation, not a realizable retained-ancestor conformance case."
    ]
  },
  {
    "id": "selection-widen-cap",
    "suite": "application",
    "module": "ApplicationSelection",
    "path": "verify/tla/application/ApplicationSelection.tla",
    "constants": {
      "Mutation": "\"none\"",
      "Scenario": "\"widen-cap\"",
      "Kind": "\"activate\"",
      "StateLimit": "4"
    },
    "specification": "Spec",
    "invariants": [
      "TypeOK",
      "ContentIdentity",
      "Custody",
      "CommittedPrefix",
      "IdentityUnique",
      "NamespaceIsolation",
      "SelectionAtomic",
      "DependenciesBeforeHead",
      "QuotaBeforeHead",
      "HostBeforeHead",
      "SequenceEpoch",
      "CompatibleSelection",
      "SpecialKinds",
      "RequestBinding",
      "EvidenceBound",
      "ReturnBinding",
      "MutationErrorsUncertain",
      "NoInventedUncertainty"
    ],
    "properties": [],
    "actions": [
      {
        "action": "Reject",
        "property": "NeverRejectStep"
      }
    ],
    "bounds": {
      "applications": 2,
      "actors": 3,
      "newOperations": 3,
      "internedNodes": 5,
      "revisionSymbols": 2,
      "memorySymbols": 2,
      "failures": 1,
      "processDeaths": 1,
      "statesPerApplication": 4,
      "scenario": "widen-cap"
    },
    "assumptions": [
      "Completed custody/publication/quota actions compose the earlier lower-level models; arbitrary concurrent filesystem mutation and power loss are not modeled.",
      "Immutable ghost content interning assumes collision-free canonical identity; request/evidence records are finite projections, not full production serialization.",
      "Trusted evidence validation is an admitted input; singleton seeded restoration is a structural overapproximation, not a realizable retained-ancestor conformance case."
    ]
  },
  {
    "id": "selection-drop-entry",
    "suite": "application",
    "module": "ApplicationSelection",
    "path": "verify/tla/application/ApplicationSelection.tla",
    "constants": {
      "Mutation": "\"none\"",
      "Scenario": "\"drop-entry\"",
      "Kind": "\"activate\"",
      "StateLimit": "4"
    },
    "specification": "Spec",
    "invariants": [
      "TypeOK",
      "ContentIdentity",
      "Custody",
      "CommittedPrefix",
      "IdentityUnique",
      "NamespaceIsolation",
      "SelectionAtomic",
      "DependenciesBeforeHead",
      "QuotaBeforeHead",
      "HostBeforeHead",
      "SequenceEpoch",
      "CompatibleSelection",
      "SpecialKinds",
      "RequestBinding",
      "EvidenceBound",
      "ReturnBinding",
      "MutationErrorsUncertain",
      "NoInventedUncertainty"
    ],
    "properties": [],
    "actions": [
      {
        "action": "Reject",
        "property": "NeverRejectStep"
      }
    ],
    "bounds": {
      "applications": 2,
      "actors": 3,
      "newOperations": 3,
      "internedNodes": 5,
      "revisionSymbols": 2,
      "memorySymbols": 2,
      "failures": 1,
      "processDeaths": 1,
      "statesPerApplication": 4,
      "scenario": "drop-entry"
    },
    "assumptions": [
      "Completed custody/publication/quota actions compose the earlier lower-level models; arbitrary concurrent filesystem mutation and power loss are not modeled.",
      "Immutable ghost content interning assumes collision-free canonical identity; request/evidence records are finite projections, not full production serialization.",
      "Trusted evidence validation is an admitted input; singleton seeded restoration is a structural overapproximation, not a realizable retained-ancestor conformance case."
    ]
  },
  {
    "id": "selection-bad-restore",
    "suite": "application",
    "module": "ApplicationSelection",
    "path": "verify/tla/application/ApplicationSelection.tla",
    "constants": {
      "Mutation": "\"none\"",
      "Scenario": "\"bad-special\"",
      "Kind": "\"restore\"",
      "StateLimit": "4"
    },
    "specification": "Spec",
    "invariants": [
      "TypeOK",
      "ContentIdentity",
      "Custody",
      "CommittedPrefix",
      "IdentityUnique",
      "NamespaceIsolation",
      "SelectionAtomic",
      "DependenciesBeforeHead",
      "QuotaBeforeHead",
      "HostBeforeHead",
      "SequenceEpoch",
      "CompatibleSelection",
      "SpecialKinds",
      "RequestBinding",
      "EvidenceBound",
      "ReturnBinding",
      "MutationErrorsUncertain",
      "NoInventedUncertainty"
    ],
    "properties": [],
    "actions": [
      {
        "action": "Reject",
        "property": "NeverRejectStep"
      }
    ],
    "bounds": {
      "applications": 2,
      "actors": 3,
      "newOperations": 3,
      "internedNodes": 5,
      "revisionSymbols": 2,
      "memorySymbols": 2,
      "failures": 1,
      "processDeaths": 1,
      "statesPerApplication": 4,
      "scenario": "bad-special"
    },
    "assumptions": [
      "Completed custody/publication/quota actions compose the earlier lower-level models; arbitrary concurrent filesystem mutation and power loss are not modeled.",
      "Immutable ghost content interning assumes collision-free canonical identity; request/evidence records are finite projections, not full production serialization.",
      "Trusted evidence validation is an admitted input; singleton seeded restoration is a structural overapproximation, not a realizable retained-ancestor conformance case."
    ]
  },
  {
    "id": "selection-bad-propose",
    "suite": "application",
    "module": "ApplicationSelection",
    "path": "verify/tla/application/ApplicationSelection.tla",
    "constants": {
      "Mutation": "\"none\"",
      "Scenario": "\"bad-special\"",
      "Kind": "\"propose\"",
      "StateLimit": "4"
    },
    "specification": "Spec",
    "invariants": [
      "TypeOK",
      "ContentIdentity",
      "Custody",
      "CommittedPrefix",
      "IdentityUnique",
      "NamespaceIsolation",
      "SelectionAtomic",
      "DependenciesBeforeHead",
      "QuotaBeforeHead",
      "HostBeforeHead",
      "SequenceEpoch",
      "CompatibleSelection",
      "SpecialKinds",
      "RequestBinding",
      "EvidenceBound",
      "ReturnBinding",
      "MutationErrorsUncertain",
      "NoInventedUncertainty"
    ],
    "properties": [],
    "actions": [
      {
        "action": "Reject",
        "property": "NeverRejectStep"
      }
    ],
    "bounds": {
      "applications": 2,
      "actors": 3,
      "newOperations": 3,
      "internedNodes": 5,
      "revisionSymbols": 2,
      "memorySymbols": 2,
      "failures": 1,
      "processDeaths": 1,
      "statesPerApplication": 4,
      "scenario": "bad-special"
    },
    "assumptions": [
      "Completed custody/publication/quota actions compose the earlier lower-level models; arbitrary concurrent filesystem mutation and power loss are not modeled.",
      "Immutable ghost content interning assumes collision-free canonical identity; request/evidence records are finite projections, not full production serialization.",
      "Trusted evidence validation is an admitted input; singleton seeded restoration is a structural overapproximation, not a realizable retained-ancestor conformance case."
    ]
  },
  {
    "id": "selection-bad-investigate",
    "suite": "application",
    "module": "ApplicationSelection",
    "path": "verify/tla/application/ApplicationSelection.tla",
    "constants": {
      "Mutation": "\"none\"",
      "Scenario": "\"bad-special\"",
      "Kind": "\"investigate\"",
      "StateLimit": "4"
    },
    "specification": "Spec",
    "invariants": [
      "TypeOK",
      "ContentIdentity",
      "Custody",
      "CommittedPrefix",
      "IdentityUnique",
      "NamespaceIsolation",
      "SelectionAtomic",
      "DependenciesBeforeHead",
      "QuotaBeforeHead",
      "HostBeforeHead",
      "SequenceEpoch",
      "CompatibleSelection",
      "SpecialKinds",
      "RequestBinding",
      "EvidenceBound",
      "ReturnBinding",
      "MutationErrorsUncertain",
      "NoInventedUncertainty"
    ],
    "properties": [],
    "actions": [
      {
        "action": "Reject",
        "property": "NeverRejectStep"
      }
    ],
    "bounds": {
      "applications": 2,
      "actors": 3,
      "newOperations": 3,
      "internedNodes": 5,
      "revisionSymbols": 2,
      "memorySymbols": 2,
      "failures": 1,
      "processDeaths": 1,
      "statesPerApplication": 4,
      "scenario": "bad-special"
    },
    "assumptions": [
      "Completed custody/publication/quota actions compose the earlier lower-level models; arbitrary concurrent filesystem mutation and power loss are not modeled.",
      "Immutable ghost content interning assumes collision-free canonical identity; request/evidence records are finite projections, not full production serialization.",
      "Trusted evidence validation is an admitted input; singleton seeded restoration is a structural overapproximation, not a realizable retained-ancestor conformance case."
    ]
  },
  {
    "id": "selection-migrate-after-propose",
    "suite": "application",
    "module": "ApplicationSelection",
    "path": "verify/tla/application/ApplicationSelection.tla",
    "constants": {
      "Mutation": "\"none\"",
      "Scenario": "\"migration-after-propose\"",
      "Kind": "\"migrate\"",
      "StateLimit": "4"
    },
    "specification": "Spec",
    "invariants": [
      "TypeOK",
      "ContentIdentity",
      "Custody",
      "CommittedPrefix",
      "IdentityUnique",
      "NamespaceIsolation",
      "SelectionAtomic",
      "DependenciesBeforeHead",
      "QuotaBeforeHead",
      "HostBeforeHead",
      "SequenceEpoch",
      "CompatibleSelection",
      "SpecialKinds",
      "RequestBinding",
      "EvidenceBound",
      "ReturnBinding",
      "MutationErrorsUncertain",
      "NoInventedUncertainty"
    ],
    "properties": [],
    "actions": [
      {
        "action": "SelectHead",
        "property": "NeverMigrateAfterSamePair"
      }
    ],
    "bounds": {
      "applications": 2,
      "actors": 3,
      "newOperations": 3,
      "internedNodes": 5,
      "revisionSymbols": 2,
      "memorySymbols": 2,
      "failures": 1,
      "processDeaths": 1,
      "statesPerApplication": 4,
      "scenario": "migration-after-propose"
    },
    "assumptions": [
      "Completed custody/publication/quota actions compose the earlier lower-level models; arbitrary concurrent filesystem mutation and power loss are not modeled.",
      "Immutable ghost content interning assumes collision-free canonical identity; request/evidence records are finite projections, not full production serialization.",
      "Trusted evidence validation is an admitted input; singleton seeded restoration is a structural overapproximation, not a realizable retained-ancestor conformance case."
    ]
  },
  {
    "id": "selection-evidence",
    "suite": "application",
    "module": "ApplicationSelection",
    "path": "verify/tla/application/ApplicationSelection.tla",
    "constants": {
      "Mutation": "\"none\"",
      "Scenario": "\"bad-evidence\"",
      "Kind": "\"migrate\"",
      "StateLimit": "4"
    },
    "specification": "Spec",
    "invariants": [
      "TypeOK",
      "ContentIdentity",
      "Custody",
      "CommittedPrefix",
      "IdentityUnique",
      "NamespaceIsolation",
      "SelectionAtomic",
      "DependenciesBeforeHead",
      "QuotaBeforeHead",
      "HostBeforeHead",
      "SequenceEpoch",
      "CompatibleSelection",
      "SpecialKinds",
      "RequestBinding",
      "EvidenceBound",
      "ReturnBinding",
      "MutationErrorsUncertain",
      "NoInventedUncertainty"
    ],
    "properties": [],
    "actions": [
      {
        "action": "Reject",
        "property": "NeverRejectStep"
      }
    ],
    "bounds": {
      "applications": 2,
      "actors": 3,
      "newOperations": 3,
      "internedNodes": 5,
      "revisionSymbols": 2,
      "memorySymbols": 2,
      "failures": 1,
      "processDeaths": 1,
      "statesPerApplication": 4,
      "scenario": "bad-evidence"
    },
    "assumptions": [
      "Completed custody/publication/quota actions compose the earlier lower-level models; arbitrary concurrent filesystem mutation and power loss are not modeled.",
      "Immutable ghost content interning assumes collision-free canonical identity; request/evidence records are finite projections, not full production serialization.",
      "Trusted evidence validation is an admitted input; singleton seeded restoration is a structural overapproximation, not a realizable retained-ancestor conformance case."
    ]
  },
  {
    "id": "selection-proposal-binding",
    "suite": "application",
    "module": "ApplicationSelection",
    "path": "verify/tla/application/ApplicationSelection.tla",
    "constants": {
      "Mutation": "\"none\"",
      "Scenario": "\"stale-evidence\"",
      "Kind": "\"propose\"",
      "StateLimit": "4"
    },
    "specification": "Spec",
    "invariants": [
      "TypeOK",
      "ContentIdentity",
      "Custody",
      "CommittedPrefix",
      "IdentityUnique",
      "NamespaceIsolation",
      "SelectionAtomic",
      "DependenciesBeforeHead",
      "QuotaBeforeHead",
      "HostBeforeHead",
      "SequenceEpoch",
      "CompatibleSelection",
      "SpecialKinds",
      "RequestBinding",
      "EvidenceBound",
      "ReturnBinding",
      "MutationErrorsUncertain",
      "NoInventedUncertainty"
    ],
    "properties": [],
    "actions": [
      {
        "action": "Reject",
        "property": "NeverRejectStep"
      }
    ],
    "bounds": {
      "applications": 2,
      "actors": 3,
      "newOperations": 3,
      "internedNodes": 5,
      "revisionSymbols": 2,
      "memorySymbols": 2,
      "failures": 1,
      "processDeaths": 1,
      "statesPerApplication": 4,
      "scenario": "stale-evidence"
    },
    "assumptions": [
      "Completed custody/publication/quota actions compose the earlier lower-level models; arbitrary concurrent filesystem mutation and power loss are not modeled.",
      "Immutable ghost content interning assumes collision-free canonical identity; request/evidence records are finite projections, not full production serialization.",
      "Trusted evidence validation is an admitted input; singleton seeded restoration is a structural overapproximation, not a realizable retained-ancestor conformance case."
    ]
  },
  {
    "id": "selection-host-denial",
    "suite": "application",
    "module": "ApplicationSelection",
    "path": "verify/tla/application/ApplicationSelection.tla",
    "constants": {
      "Mutation": "\"none\"",
      "Scenario": "\"host-denial\"",
      "Kind": "\"memory\"",
      "StateLimit": "4"
    },
    "specification": "Spec",
    "invariants": [
      "TypeOK",
      "ContentIdentity",
      "Custody",
      "CommittedPrefix",
      "IdentityUnique",
      "NamespaceIsolation",
      "SelectionAtomic",
      "DependenciesBeforeHead",
      "QuotaBeforeHead",
      "HostBeforeHead",
      "SequenceEpoch",
      "CompatibleSelection",
      "SpecialKinds",
      "RequestBinding",
      "EvidenceBound",
      "ReturnBinding",
      "MutationErrorsUncertain",
      "NoInventedUncertainty"
    ],
    "properties": [],
    "actions": [
      {
        "action": "Reject",
        "property": "NeverDenyHost"
      }
    ],
    "bounds": {
      "applications": 2,
      "actors": 3,
      "newOperations": 3,
      "internedNodes": 5,
      "revisionSymbols": 2,
      "memorySymbols": 2,
      "failures": 1,
      "processDeaths": 1,
      "statesPerApplication": 4,
      "scenario": "host-denial"
    },
    "assumptions": [
      "Completed custody/publication/quota actions compose the earlier lower-level models; arbitrary concurrent filesystem mutation and power loss are not modeled.",
      "Immutable ghost content interning assumes collision-free canonical identity; request/evidence records are finite projections, not full production serialization.",
      "Trusted evidence validation is an admitted input; singleton seeded restoration is a structural overapproximation, not a realizable retained-ancestor conformance case."
    ]
  },
  {
    "id": "selection-progress",
    "suite": "application",
    "module": "ApplicationSelection",
    "path": "verify/tla/application/ApplicationSelection.tla",
    "constants": {
      "Mutation": "\"none\"",
      "Scenario": "\"race\"",
      "Kind": "\"memory\"",
      "StateLimit": "4"
    },
    "specification": "FairSpec",
    "invariants": [
      "TypeOK",
      "ContentIdentity",
      "Custody",
      "CommittedPrefix",
      "IdentityUnique",
      "NamespaceIsolation",
      "SelectionAtomic",
      "DependenciesBeforeHead",
      "QuotaBeforeHead",
      "HostBeforeHead",
      "SequenceEpoch",
      "CompatibleSelection",
      "SpecialKinds",
      "RequestBinding",
      "EvidenceBound",
      "ReturnBinding",
      "MutationErrorsUncertain",
      "NoInventedUncertainty"
    ],
    "properties": [
      "EventuallyReturned"
    ],
    "actions": [
      {
        "action": "SelectHead",
        "property": "NeverSelectHead"
      }
    ],
    "bounds": {
      "applications": 2,
      "actors": 3,
      "newOperations": 3,
      "internedNodes": 5,
      "revisionSymbols": 2,
      "memorySymbols": 2,
      "failures": 1,
      "processDeaths": 1,
      "statesPerApplication": 4,
      "scenario": "race"
    },
    "assumptions": [
      "Completed custody/publication/quota actions compose the earlier lower-level models; arbitrary concurrent filesystem mutation and power loss are not modeled.",
      "Immutable ghost content interning assumes collision-free canonical identity; request/evidence records are finite projections, not full production serialization.",
      "Trusted evidence validation is an admitted input; singleton seeded restoration is a structural overapproximation, not a realizable retained-ancestor conformance case.",
      "Weak fairness of the declared progressing steps; return includes denial and does not imply external success."
    ]
  }
];

export const APPLICATION_MUTATIONS: ModelMutation[] = [
  {
    "id": "selection-stale-head",
    "base": "selection-race",
    "mutation": "skip-both-head",
    "kind": "invariant",
    "property": "CommittedPrefix"
  },
  {
    "id": "selection-reuse-identity",
    "base": "selection-reuse-missing",
    "mutation": "skip-history-identity",
    "kind": "invariant",
    "property": "IdentityUnique"
  },
  {
    "id": "selection-unbound-retry",
    "base": "selection-conflict",
    "mutation": "ignore-retry-request",
    "kind": "invariant",
    "property": "ReturnBinding"
  },
  {
    "id": "selection-missing-dependencies",
    "base": "selection-race",
    "mutation": "skip-dependencies",
    "kind": "invariant",
    "property": "DependenciesBeforeHead"
  },
  {
    "id": "selection-torn",
    "base": "selection-activate",
    "mutation": "torn-selection",
    "kind": "invariant",
    "property": "SelectionAtomic"
  },
  {
    "id": "selection-widen-authority",
    "base": "selection-widen-cap",
    "mutation": "widen-cap",
    "kind": "invariant",
    "property": "CompatibleSelection"
  },
  {
    "id": "selection-settle-uncertainty",
    "base": "selection-faults",
    "mutation": "settle-uncertain",
    "kind": "invariant",
    "property": "MutationErrorsUncertain"
  },
  {
    "id": "selection-unbound-evidence",
    "base": "selection-proposal-binding",
    "mutation": "unbound-evidence",
    "kind": "invariant",
    "property": "EvidenceBound"
  },
  {
    "id": "selection-unfair",
    "base": "selection-progress",
    "specification": "Spec",
    "kind": "liveness",
    "property": "EventuallyReturned"
  }
];
