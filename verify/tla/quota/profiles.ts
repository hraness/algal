import type { ModelMutation, ModelProfile } from "../definitions";

/** Reviewed static finite profiles; see SCOPE.md for assumptions and reductions. */
export const QUOTA_PROFILES: ModelProfile[] = [
  {
    "id": "quota-base",
    "suite": "quota",
    "module": "NamespaceQuota",
    "path": "verify/tla/quota/NamespaceQuota.tla",
    "constants": {
      "Mutation": "\"none\"",
      "Scenario": "\"plain\"",
      "PerBound": "8",
      "AggregateBound": "13",
      "NameBound": "2"
    },
    "specification": "Spec",
    "invariants": [
      "TypeOK",
      "QuotaCustody",
      "NoLostReservation",
      "PublicationsReserved",
      "GrantBeforeReservation",
      "QuotaBound",
      "PhysicalCovered",
      "DeniedHasNoPublication"
    ],
    "properties": [],
    "actions": [
      {
        "action": "Acquire",
        "property": "NeverAcquire"
      },
      {
        "action": "RejectBusy",
        "property": "NeverRejectBusy"
      },
      {
        "action": "Scan",
        "property": "NeverScan"
      },
      {
        "action": "Reserve",
        "property": "NeverReserve"
      },
      {
        "action": "PublishCopies",
        "property": "NeverPublishBothCopies"
      }
    ],
    "bounds": {
      "applications": 2,
      "actors": 3,
      "byteSymbols": "1 or 2",
      "publicationCopies": 2,
      "perBound": 8,
      "aggregateBound": 13,
      "nameBound": 2,
      "scenario": "plain"
    },
    "assumptions": [
      "Completed retained ledger publication and exclusive namespace quota custody compose earlier models; lower-level failure cuts, physical scans and path/schema admission remain separate.",
      "Symbolic byte charges distinguish measured plus headroom from retained reservations, including doubled target publication; CAS storage is explicitly excluded.",
      "Failures, death and deletion never imply automatic quota refunds; the finite domain does not prove production byte/count maxima."
    ]
  },
  {
    "id": "quota-one-copy",
    "suite": "quota",
    "module": "NamespaceQuota",
    "path": "verify/tla/quota/NamespaceQuota.tla",
    "constants": {
      "Mutation": "\"none\"",
      "Scenario": "\"plain\"",
      "PerBound": "8",
      "AggregateBound": "13",
      "NameBound": "2"
    },
    "specification": "Spec",
    "invariants": [
      "TypeOK",
      "QuotaCustody",
      "NoLostReservation",
      "PublicationsReserved",
      "GrantBeforeReservation",
      "QuotaBound",
      "PhysicalCovered",
      "DeniedHasNoPublication"
    ],
    "properties": [],
    "actions": [
      {
        "action": "PublishCopies",
        "property": "NeverPublishOneCopy"
      }
    ],
    "bounds": {
      "applications": 2,
      "actors": 3,
      "byteSymbols": "1 or 2",
      "publicationCopies": 2,
      "perBound": 8,
      "aggregateBound": 13,
      "nameBound": 2,
      "scenario": "plain"
    },
    "assumptions": [
      "Completed retained ledger publication and exclusive namespace quota custody compose earlier models; lower-level failure cuts, physical scans and path/schema admission remain separate.",
      "Symbolic byte charges distinguish measured plus headroom from retained reservations, including doubled target publication; CAS storage is explicitly excluded.",
      "Failures, death and deletion never imply automatic quota refunds; the finite domain does not prove production byte/count maxima."
    ]
  },
  {
    "id": "quota-per-limit",
    "suite": "quota",
    "module": "NamespaceQuota",
    "path": "verify/tla/quota/NamespaceQuota.tla",
    "constants": {
      "Mutation": "\"none\"",
      "Scenario": "\"plain\"",
      "PerBound": "5",
      "AggregateBound": "13",
      "NameBound": "2"
    },
    "specification": "Spec",
    "invariants": [
      "TypeOK",
      "QuotaCustody",
      "NoLostReservation",
      "PublicationsReserved",
      "GrantBeforeReservation",
      "QuotaBound",
      "PhysicalCovered",
      "DeniedHasNoPublication"
    ],
    "properties": [],
    "actions": [
      {
        "action": "RejectBounds",
        "property": "NeverRejectBounds"
      }
    ],
    "bounds": {
      "applications": 2,
      "actors": 3,
      "byteSymbols": "1 or 2",
      "publicationCopies": 2,
      "perBound": 5,
      "aggregateBound": 13,
      "nameBound": 2,
      "scenario": "plain"
    },
    "assumptions": [
      "Completed retained ledger publication and exclusive namespace quota custody compose earlier models; lower-level failure cuts, physical scans and path/schema admission remain separate.",
      "Symbolic byte charges distinguish measured plus headroom from retained reservations, including doubled target publication; CAS storage is explicitly excluded.",
      "Failures, death and deletion never imply automatic quota refunds; the finite domain does not prove production byte/count maxima."
    ]
  },
  {
    "id": "quota-aggregate-limit",
    "suite": "quota",
    "module": "NamespaceQuota",
    "path": "verify/tla/quota/NamespaceQuota.tla",
    "constants": {
      "Mutation": "\"none\"",
      "Scenario": "\"plain\"",
      "PerBound": "8",
      "AggregateBound": "12",
      "NameBound": "2"
    },
    "specification": "Spec",
    "invariants": [
      "TypeOK",
      "QuotaCustody",
      "NoLostReservation",
      "PublicationsReserved",
      "GrantBeforeReservation",
      "QuotaBound",
      "PhysicalCovered",
      "DeniedHasNoPublication"
    ],
    "properties": [],
    "actions": [
      {
        "action": "RejectBounds",
        "property": "NeverRejectBounds"
      }
    ],
    "bounds": {
      "applications": 2,
      "actors": 3,
      "byteSymbols": "1 or 2",
      "publicationCopies": 2,
      "perBound": 8,
      "aggregateBound": 12,
      "nameBound": 2,
      "scenario": "plain"
    },
    "assumptions": [
      "Completed retained ledger publication and exclusive namespace quota custody compose earlier models; lower-level failure cuts, physical scans and path/schema admission remain separate.",
      "Symbolic byte charges distinguish measured plus headroom from retained reservations, including doubled target publication; CAS storage is explicitly excluded.",
      "Failures, death and deletion never imply automatic quota refunds; the finite domain does not prove production byte/count maxima."
    ]
  },
  {
    "id": "quota-name-limit",
    "suite": "quota",
    "module": "NamespaceQuota",
    "path": "verify/tla/quota/NamespaceQuota.tla",
    "constants": {
      "Mutation": "\"none\"",
      "Scenario": "\"plain\"",
      "PerBound": "8",
      "AggregateBound": "13",
      "NameBound": "1"
    },
    "specification": "Spec",
    "invariants": [
      "TypeOK",
      "QuotaCustody",
      "NoLostReservation",
      "PublicationsReserved",
      "GrantBeforeReservation",
      "QuotaBound",
      "PhysicalCovered",
      "DeniedHasNoPublication"
    ],
    "properties": [],
    "actions": [
      {
        "action": "RejectBounds",
        "property": "NeverRejectBounds"
      }
    ],
    "bounds": {
      "applications": 2,
      "actors": 3,
      "byteSymbols": "1 or 2",
      "publicationCopies": 2,
      "perBound": 8,
      "aggregateBound": 13,
      "nameBound": 1,
      "scenario": "plain"
    },
    "assumptions": [
      "Completed retained ledger publication and exclusive namespace quota custody compose earlier models; lower-level failure cuts, physical scans and path/schema admission remain separate.",
      "Symbolic byte charges distinguish measured plus headroom from retained reservations, including doubled target publication; CAS storage is explicitly excluded.",
      "Failures, death and deletion never imply automatic quota refunds; the finite domain does not prove production byte/count maxima."
    ]
  },
  {
    "id": "quota-zero-row",
    "suite": "quota",
    "module": "NamespaceQuota",
    "path": "verify/tla/quota/NamespaceQuota.tla",
    "constants": {
      "Mutation": "\"none\"",
      "Scenario": "\"zero-row\"",
      "PerBound": "8",
      "AggregateBound": "13",
      "NameBound": "1"
    },
    "specification": "Spec",
    "invariants": [
      "TypeOK",
      "QuotaCustody",
      "NoLostReservation",
      "PublicationsReserved",
      "GrantBeforeReservation",
      "QuotaBound",
      "PhysicalCovered",
      "DeniedHasNoPublication"
    ],
    "properties": [],
    "actions": [
      {
        "action": "RejectBounds",
        "property": "NeverRejectBounds"
      }
    ],
    "bounds": {
      "applications": 2,
      "actors": 3,
      "byteSymbols": "1 or 2",
      "publicationCopies": 2,
      "perBound": 8,
      "aggregateBound": 13,
      "nameBound": 1,
      "scenario": "zero-row"
    },
    "assumptions": [
      "Completed retained ledger publication and exclusive namespace quota custody compose earlier models; lower-level failure cuts, physical scans and path/schema admission remain separate.",
      "Symbolic byte charges distinguish measured plus headroom from retained reservations, including doubled target publication; CAS storage is explicitly excluded.",
      "Failures, death and deletion never imply automatic quota refunds; the finite domain does not prove production byte/count maxima."
    ]
  },
  {
    "id": "quota-measured",
    "suite": "quota",
    "module": "NamespaceQuota",
    "path": "verify/tla/quota/NamespaceQuota.tla",
    "constants": {
      "Mutation": "\"none\"",
      "Scenario": "\"measured\"",
      "PerBound": "10",
      "AggregateBound": "15",
      "NameBound": "2"
    },
    "specification": "Spec",
    "invariants": [
      "TypeOK",
      "QuotaCustody",
      "NoLostReservation",
      "PublicationsReserved",
      "GrantBeforeReservation",
      "QuotaBound",
      "PhysicalCovered",
      "DeniedHasNoPublication"
    ],
    "properties": [],
    "actions": [
      {
        "action": "Reserve",
        "property": "NeverReserve"
      }
    ],
    "bounds": {
      "applications": 2,
      "actors": 3,
      "byteSymbols": "1 or 2",
      "publicationCopies": 2,
      "perBound": 10,
      "aggregateBound": 15,
      "nameBound": 2,
      "scenario": "measured"
    },
    "assumptions": [
      "Completed retained ledger publication and exclusive namespace quota custody compose earlier models; lower-level failure cuts, physical scans and path/schema admission remain separate.",
      "Symbolic byte charges distinguish measured plus headroom from retained reservations, including doubled target publication; CAS storage is explicitly excluded.",
      "Failures, death and deletion never imply automatic quota refunds; the finite domain does not prove production byte/count maxima."
    ]
  },
  {
    "id": "quota-legacy",
    "suite": "quota",
    "module": "NamespaceQuota",
    "path": "verify/tla/quota/NamespaceQuota.tla",
    "constants": {
      "Mutation": "\"none\"",
      "Scenario": "\"legacy\"",
      "PerBound": "10",
      "AggregateBound": "15",
      "NameBound": "2"
    },
    "specification": "Spec",
    "invariants": [
      "TypeOK",
      "QuotaCustody",
      "NoLostReservation",
      "PublicationsReserved",
      "GrantBeforeReservation",
      "QuotaBound",
      "PhysicalCovered",
      "DeniedHasNoPublication"
    ],
    "properties": [],
    "actions": [
      {
        "action": "Reserve",
        "property": "NeverReserve"
      }
    ],
    "bounds": {
      "applications": 2,
      "actors": 3,
      "byteSymbols": "1 or 2",
      "publicationCopies": 2,
      "perBound": 10,
      "aggregateBound": 15,
      "nameBound": 2,
      "scenario": "legacy"
    },
    "assumptions": [
      "Completed retained ledger publication and exclusive namespace quota custody compose earlier models; lower-level failure cuts, physical scans and path/schema admission remain separate.",
      "Symbolic byte charges distinguish measured plus headroom from retained reservations, including doubled target publication; CAS storage is explicitly excluded.",
      "Failures, death and deletion never imply automatic quota refunds; the finite domain does not prove production byte/count maxima."
    ]
  },
  {
    "id": "quota-common",
    "suite": "quota",
    "module": "NamespaceQuota",
    "path": "verify/tla/quota/NamespaceQuota.tla",
    "constants": {
      "Mutation": "\"none\"",
      "Scenario": "\"common\"",
      "PerBound": "8",
      "AggregateBound": "14",
      "NameBound": "2"
    },
    "specification": "Spec",
    "invariants": [
      "TypeOK",
      "QuotaCustody",
      "NoLostReservation",
      "PublicationsReserved",
      "GrantBeforeReservation",
      "QuotaBound",
      "PhysicalCovered",
      "DeniedHasNoPublication"
    ],
    "properties": [],
    "actions": [
      {
        "action": "RejectBounds",
        "property": "NeverRejectBounds"
      }
    ],
    "bounds": {
      "applications": 2,
      "actors": 3,
      "byteSymbols": "1 or 2",
      "publicationCopies": 2,
      "perBound": 8,
      "aggregateBound": 14,
      "nameBound": 2,
      "scenario": "common"
    },
    "assumptions": [
      "Completed retained ledger publication and exclusive namespace quota custody compose earlier models; lower-level failure cuts, physical scans and path/schema admission remain separate.",
      "Symbolic byte charges distinguish measured plus headroom from retained reservations, including doubled target publication; CAS storage is explicitly excluded.",
      "Failures, death and deletion never imply automatic quota refunds; the finite domain does not prove production byte/count maxima."
    ]
  },
  {
    "id": "quota-failure",
    "suite": "quota",
    "module": "NamespaceQuota",
    "path": "verify/tla/quota/NamespaceQuota.tla",
    "constants": {
      "Mutation": "\"none\"",
      "Scenario": "\"failure\"",
      "PerBound": "8",
      "AggregateBound": "13",
      "NameBound": "2"
    },
    "specification": "Spec",
    "invariants": [
      "TypeOK",
      "QuotaCustody",
      "NoLostReservation",
      "PublicationsReserved",
      "GrantBeforeReservation",
      "QuotaBound",
      "PhysicalCovered",
      "DeniedHasNoPublication"
    ],
    "properties": [],
    "actions": [
      {
        "action": "Fail",
        "property": "NeverFailAfterReserve"
      },
      {
        "action": "Crash",
        "property": "NeverCrashAfterReserve"
      },
      {
        "action": "Reopen",
        "property": "NeverReopen"
      }
    ],
    "bounds": {
      "applications": 2,
      "actors": 3,
      "byteSymbols": "1 or 2",
      "publicationCopies": 2,
      "perBound": 8,
      "aggregateBound": 13,
      "nameBound": 2,
      "scenario": "failure"
    },
    "assumptions": [
      "Completed retained ledger publication and exclusive namespace quota custody compose earlier models; lower-level failure cuts, physical scans and path/schema admission remain separate.",
      "Symbolic byte charges distinguish measured plus headroom from retained reservations, including doubled target publication; CAS storage is explicitly excluded.",
      "Failures, death and deletion never imply automatic quota refunds; the finite domain does not prove production byte/count maxima."
    ]
  },
  {
    "id": "quota-delete",
    "suite": "quota",
    "module": "NamespaceQuota",
    "path": "verify/tla/quota/NamespaceQuota.tla",
    "constants": {
      "Mutation": "\"none\"",
      "Scenario": "\"delete\"",
      "PerBound": "8",
      "AggregateBound": "13",
      "NameBound": "2"
    },
    "specification": "Spec",
    "invariants": [
      "TypeOK",
      "QuotaCustody",
      "NoLostReservation",
      "PublicationsReserved",
      "GrantBeforeReservation",
      "QuotaBound",
      "PhysicalCovered",
      "DeniedHasNoPublication"
    ],
    "properties": [],
    "actions": [
      {
        "action": "RemoveFiles",
        "property": "NeverRemoveFiles"
      },
      {
        "action": "Reserve",
        "property": "NeverReserveAfterDelete"
      }
    ],
    "bounds": {
      "applications": 2,
      "actors": 3,
      "byteSymbols": "1 or 2",
      "publicationCopies": 2,
      "perBound": 8,
      "aggregateBound": 13,
      "nameBound": 2,
      "scenario": "delete"
    },
    "assumptions": [
      "Completed retained ledger publication and exclusive namespace quota custody compose earlier models; lower-level failure cuts, physical scans and path/schema admission remain separate.",
      "Symbolic byte charges distinguish measured plus headroom from retained reservations, including doubled target publication; CAS storage is explicitly excluded.",
      "Failures, death and deletion never imply automatic quota refunds; the finite domain does not prove production byte/count maxima."
    ]
  },
  {
    "id": "quota-progress",
    "suite": "quota",
    "module": "NamespaceQuota",
    "path": "verify/tla/quota/NamespaceQuota.tla",
    "constants": {
      "Mutation": "\"none\"",
      "Scenario": "\"plain\"",
      "PerBound": "8",
      "AggregateBound": "13",
      "NameBound": "2"
    },
    "specification": "FairSpec",
    "invariants": [
      "TypeOK",
      "QuotaCustody",
      "NoLostReservation",
      "PublicationsReserved",
      "GrantBeforeReservation",
      "QuotaBound",
      "PhysicalCovered",
      "DeniedHasNoPublication"
    ],
    "properties": [
      "EventuallyDone"
    ],
    "actions": [
      {
        "action": "Acquire",
        "property": "NeverAcquire"
      }
    ],
    "bounds": {
      "applications": 2,
      "actors": 3,
      "byteSymbols": "1 or 2",
      "publicationCopies": 2,
      "perBound": 8,
      "aggregateBound": 13,
      "nameBound": 2,
      "scenario": "plain"
    },
    "assumptions": [
      "Completed retained ledger publication and exclusive namespace quota custody compose earlier models; lower-level failure cuts, physical scans and path/schema admission remain separate.",
      "Symbolic byte charges distinguish measured plus headroom from retained reservations, including doubled target publication; CAS storage is explicitly excluded.",
      "Failures, death and deletion never imply automatic quota refunds; the finite domain does not prove production byte/count maxima.",
      "Weak fairness of the declared progressing steps; return includes denial and does not imply external success."
    ]
  }
];

export const QUOTA_MUTATIONS: ModelMutation[] = [
  {
    "id": "quota-stale-snapshot",
    "base": "quota-base",
    "mutation": "stale-snapshot",
    "property": "NoLostReservation",
    "kind": "invariant"
  },
  {
    "id": "quota-single-copy",
    "base": "quota-base",
    "mutation": "single-copy",
    "property": "PhysicalCovered",
    "kind": "invariant"
  },
  {
    "id": "quota-skip-reservation",
    "base": "quota-base",
    "mutation": "skip-reservation",
    "property": "PublicationsReserved",
    "kind": "invariant"
  },
  {
    "id": "quota-skip-aggregate",
    "base": "quota-aggregate-limit",
    "mutation": "skip-aggregate",
    "property": "QuotaBound",
    "kind": "invariant"
  },
  {
    "id": "quota-refund-failure",
    "base": "quota-failure",
    "mutation": "refund-failure",
    "property": "NoLostReservation",
    "kind": "invariant"
  },
  {
    "id": "quota-unfair",
    "base": "quota-progress",
    "specification": "Spec",
    "property": "EventuallyDone",
    "kind": "liveness"
  }
];
