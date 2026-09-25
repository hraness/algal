import type { ModelMutation, ModelProfile } from "../definitions";

/** Reviewed static finite profiles; see SCOPE.md for assumptions and reductions. */
export const OUTBOX_PROFILES: ModelProfile[] = [
  {
    "id": "outbox-one",
    "suite": "outbox",
    "module": "ApplicationOutbox",
    "path": "verify/tla/outbox/ApplicationOutbox.tla",
    "constants": {
      "Mutation": "\"none\"",
      "Scenario": "\"plain\"",
      "BatchLimit": "1"
    },
    "specification": "Spec",
    "invariants": [
      "TypeOK",
      "Custody",
      "InvocationNeedsStarted",
      "OnlyReachableInvokes",
      "FreshSourceMatched",
      "NoFreshRedispatch",
      "AdmissionRetained",
      "ReconcilePinned",
      "BudgetCountsFreshOnly",
      "BatchBound",
      "SettlementHasResult",
      "BoundedMessageClaim",
      "AbandonUnadmitted",
      "ActivationBarrier"
    ],
    "properties": [],
    "actions": [
      {
        "action": "PublishStarted",
        "property": "NeverPublishStarted"
      },
      {
        "action": "InvokeFresh",
        "property": "NeverInvokeFresh"
      },
      {
        "action": "PossibleEffect",
        "property": "NeverPossibleEffect"
      },
      {
        "action": "RetainResult",
        "property": "NeverRetainResult"
      },
      {
        "action": "MintMessage",
        "property": "NeverMintMessage"
      },
      {
        "action": "PublishOutcome",
        "property": "NeverPublishOutcome"
      }
    ],
    "bounds": {
      "applications": 1,
      "intents": 2,
      "scans": 2,
      "reconciliations": 1,
      "configurations": 2,
      "physicalEffect": "saturated existence only",
      "freshBatch": 1,
      "scenario": "plain"
    },
    "assumptions": [
      "Started/settled record publication composes completed lower-level durable helper actions; helper cuts and power loss are separate.",
      "Parser, plan, source and policy validation are admitted abstractions; arbitrary trusted adapters are not proved.",
      "Outstanding callbacks may apply after host death or uncertain return; saturated physical-effect existence is not a count or exactly-once theorem."
    ]
  },
  {
    "id": "outbox-two",
    "suite": "outbox",
    "module": "ApplicationOutbox",
    "path": "verify/tla/outbox/ApplicationOutbox.tla",
    "constants": {
      "Mutation": "\"none\"",
      "Scenario": "\"plain\"",
      "BatchLimit": "2"
    },
    "specification": "Spec",
    "invariants": [
      "TypeOK",
      "Custody",
      "InvocationNeedsStarted",
      "OnlyReachableInvokes",
      "FreshSourceMatched",
      "NoFreshRedispatch",
      "AdmissionRetained",
      "ReconcilePinned",
      "BudgetCountsFreshOnly",
      "BatchBound",
      "SettlementHasResult",
      "BoundedMessageClaim",
      "AbandonUnadmitted",
      "ActivationBarrier"
    ],
    "properties": [],
    "actions": [
      {
        "action": "InvokeReconcile",
        "property": "NeverInvokeReconcile"
      }
    ],
    "bounds": {
      "applications": 1,
      "intents": 2,
      "scans": 2,
      "reconciliations": 1,
      "configurations": 2,
      "physicalEffect": "saturated existence only",
      "freshBatch": 2,
      "scenario": "plain"
    },
    "assumptions": [
      "Started/settled record publication composes completed lower-level durable helper actions; helper cuts and power loss are separate.",
      "Parser, plan, source and policy validation are admitted abstractions; arbitrary trusted adapters are not proved.",
      "Outstanding callbacks may apply after host death or uncertain return; saturated physical-effect existence is not a count or exactly-once theorem."
    ]
  },
  {
    "id": "outbox-blocked-first",
    "suite": "outbox",
    "module": "ApplicationOutbox",
    "path": "verify/tla/outbox/ApplicationOutbox.tla",
    "constants": {
      "Mutation": "\"none\"",
      "Scenario": "\"blocked-first\"",
      "BatchLimit": "1"
    },
    "specification": "Spec",
    "invariants": [
      "TypeOK",
      "Custody",
      "InvocationNeedsStarted",
      "OnlyReachableInvokes",
      "FreshSourceMatched",
      "NoFreshRedispatch",
      "AdmissionRetained",
      "ReconcilePinned",
      "BudgetCountsFreshOnly",
      "BatchBound",
      "SettlementHasResult",
      "BoundedMessageClaim",
      "AbandonUnadmitted",
      "ActivationBarrier"
    ],
    "properties": [],
    "actions": [
      {
        "action": "ReturnRetained",
        "property": "NeverReturnRetained"
      },
      {
        "action": "InvokeFresh",
        "property": "NeverInvokeFresh"
      }
    ],
    "bounds": {
      "applications": 1,
      "intents": 2,
      "scans": 2,
      "reconciliations": 1,
      "configurations": 2,
      "physicalEffect": "saturated existence only",
      "freshBatch": 1,
      "scenario": "blocked-first"
    },
    "assumptions": [
      "Started/settled record publication composes completed lower-level durable helper actions; helper cuts and power loss are separate.",
      "Parser, plan, source and policy validation are admitted abstractions; arbitrary trusted adapters are not proved.",
      "Outstanding callbacks may apply after host death or uncertain return; saturated physical-effect existence is not a count or exactly-once theorem."
    ]
  },
  {
    "id": "outbox-denied-first",
    "suite": "outbox",
    "module": "ApplicationOutbox",
    "path": "verify/tla/outbox/ApplicationOutbox.tla",
    "constants": {
      "Mutation": "\"none\"",
      "Scenario": "\"deny-first\"",
      "BatchLimit": "1"
    },
    "specification": "Spec",
    "invariants": [
      "TypeOK",
      "Custody",
      "InvocationNeedsStarted",
      "OnlyReachableInvokes",
      "FreshSourceMatched",
      "NoFreshRedispatch",
      "AdmissionRetained",
      "ReconcilePinned",
      "BudgetCountsFreshOnly",
      "BatchBound",
      "SettlementHasResult",
      "BoundedMessageClaim",
      "AbandonUnadmitted",
      "ActivationBarrier"
    ],
    "properties": [],
    "actions": [
      {
        "action": "DenyFresh",
        "property": "NeverDenyFresh"
      },
      {
        "action": "InvokeFresh",
        "property": "NeverInvokeFresh"
      }
    ],
    "bounds": {
      "applications": 1,
      "intents": 2,
      "scans": 2,
      "reconciliations": 1,
      "configurations": 2,
      "physicalEffect": "saturated existence only",
      "freshBatch": 1,
      "scenario": "deny-first"
    },
    "assumptions": [
      "Started/settled record publication composes completed lower-level durable helper actions; helper cuts and power loss are separate.",
      "Parser, plan, source and policy validation are admitted abstractions; arbitrary trusted adapters are not proved.",
      "Outstanding callbacks may apply after host death or uncertain return; saturated physical-effect existence is not a count or exactly-once theorem."
    ]
  },
  {
    "id": "outbox-orphan",
    "suite": "outbox",
    "module": "ApplicationOutbox",
    "path": "verify/tla/outbox/ApplicationOutbox.tla",
    "constants": {
      "Mutation": "\"none\"",
      "Scenario": "\"orphan\"",
      "BatchLimit": "2"
    },
    "specification": "Spec",
    "invariants": [
      "TypeOK",
      "Custody",
      "InvocationNeedsStarted",
      "OnlyReachableInvokes",
      "FreshSourceMatched",
      "NoFreshRedispatch",
      "AdmissionRetained",
      "ReconcilePinned",
      "BudgetCountsFreshOnly",
      "BatchBound",
      "SettlementHasResult",
      "BoundedMessageClaim",
      "AbandonUnadmitted",
      "ActivationBarrier"
    ],
    "properties": [],
    "actions": [
      {
        "action": "InvokeFresh",
        "property": "NeverInvokeFresh"
      }
    ],
    "bounds": {
      "applications": 1,
      "intents": 2,
      "scans": 2,
      "reconciliations": 1,
      "configurations": 2,
      "physicalEffect": "saturated existence only",
      "freshBatch": 2,
      "scenario": "orphan"
    },
    "assumptions": [
      "Started/settled record publication composes completed lower-level durable helper actions; helper cuts and power loss are separate.",
      "Parser, plan, source and policy validation are admitted abstractions; arbitrary trusted adapters are not proved.",
      "Outstanding callbacks may apply after host death or uncertain return; saturated physical-effect existence is not a count or exactly-once theorem."
    ]
  },
  {
    "id": "outbox-faults",
    "suite": "outbox",
    "module": "ApplicationOutbox",
    "path": "verify/tla/outbox/ApplicationOutbox.tla",
    "constants": {
      "Mutation": "\"none\"",
      "Scenario": "\"faults\"",
      "BatchLimit": "1"
    },
    "specification": "Spec",
    "invariants": [
      "TypeOK",
      "Custody",
      "InvocationNeedsStarted",
      "OnlyReachableInvokes",
      "FreshSourceMatched",
      "NoFreshRedispatch",
      "AdmissionRetained",
      "ReconcilePinned",
      "BudgetCountsFreshOnly",
      "BatchBound",
      "SettlementHasResult",
      "BoundedMessageClaim",
      "AbandonUnadmitted",
      "ActivationBarrier"
    ],
    "properties": [],
    "actions": [
      {
        "action": "Fail",
        "property": "NeverFailAfterEffect"
      },
      {
        "action": "Crash",
        "property": "NeverCrashAfterEffect"
      },
      {
        "action": "LateEffect",
        "property": "NeverLateEffectOtherInvocation"
      }
    ],
    "bounds": {
      "applications": 1,
      "intents": 2,
      "scans": 2,
      "reconciliations": 1,
      "configurations": 2,
      "physicalEffect": "saturated existence only",
      "freshBatch": 1,
      "scenario": "faults"
    },
    "assumptions": [
      "Started/settled record publication composes completed lower-level durable helper actions; helper cuts and power loss are separate.",
      "Parser, plan, source and policy validation are admitted abstractions; arbitrary trusted adapters are not proved.",
      "Outstanding callbacks may apply after host death or uncertain return; saturated physical-effect existence is not a count or exactly-once theorem."
    ]
  },
  {
    "id": "outbox-late-return",
    "suite": "outbox",
    "module": "ApplicationOutbox",
    "path": "verify/tla/outbox/ApplicationOutbox.tla",
    "constants": {
      "Mutation": "\"none\"",
      "Scenario": "\"plain\"",
      "BatchLimit": "2"
    },
    "specification": "Spec",
    "invariants": [
      "TypeOK",
      "Custody",
      "InvocationNeedsStarted",
      "OnlyReachableInvokes",
      "FreshSourceMatched",
      "NoFreshRedispatch",
      "AdmissionRetained",
      "ReconcilePinned",
      "BudgetCountsFreshOnly",
      "BatchBound",
      "SettlementHasResult",
      "BoundedMessageClaim",
      "AbandonUnadmitted",
      "ActivationBarrier"
    ],
    "properties": [],
    "actions": [
      {
        "action": "LateEffect",
        "property": "NeverLateEffectAfterUncertainReturn"
      }
    ],
    "bounds": {
      "applications": 1,
      "intents": 2,
      "scans": 2,
      "reconciliations": 1,
      "configurations": 2,
      "physicalEffect": "saturated existence only",
      "freshBatch": 2,
      "scenario": "plain"
    },
    "assumptions": [
      "Started/settled record publication composes completed lower-level durable helper actions; helper cuts and power loss are separate.",
      "Parser, plan, source and policy validation are admitted abstractions; arbitrary trusted adapters are not proved.",
      "Outstanding callbacks may apply after host death or uncertain return; saturated physical-effect existence is not a count or exactly-once theorem."
    ]
  },
  {
    "id": "outbox-settlement-quota",
    "suite": "outbox",
    "module": "ApplicationOutbox",
    "path": "verify/tla/outbox/ApplicationOutbox.tla",
    "constants": {
      "Mutation": "\"none\"",
      "Scenario": "\"settlement-quota\"",
      "BatchLimit": "1"
    },
    "specification": "Spec",
    "invariants": [
      "TypeOK",
      "Custody",
      "InvocationNeedsStarted",
      "OnlyReachableInvokes",
      "FreshSourceMatched",
      "NoFreshRedispatch",
      "AdmissionRetained",
      "ReconcilePinned",
      "BudgetCountsFreshOnly",
      "BatchBound",
      "SettlementHasResult",
      "BoundedMessageClaim",
      "AbandonUnadmitted",
      "ActivationBarrier"
    ],
    "properties": [],
    "actions": [
      {
        "action": "Fail",
        "property": "NeverFailSettlementQuota"
      }
    ],
    "bounds": {
      "applications": 1,
      "intents": 2,
      "scans": 2,
      "reconciliations": 1,
      "configurations": 2,
      "physicalEffect": "saturated existence only",
      "freshBatch": 1,
      "scenario": "settlement-quota"
    },
    "assumptions": [
      "Started/settled record publication composes completed lower-level durable helper actions; helper cuts and power loss are separate.",
      "Parser, plan, source and policy validation are admitted abstractions; arbitrary trusted adapters are not proved.",
      "Outstanding callbacks may apply after host death or uncertain return; saturated physical-effect existence is not a count or exactly-once theorem."
    ]
  },
  {
    "id": "outbox-memory-reconcile",
    "suite": "outbox",
    "module": "ApplicationOutbox",
    "path": "verify/tla/outbox/ApplicationOutbox.tla",
    "constants": {
      "Mutation": "\"none\"",
      "Scenario": "\"memory-reconcile\"",
      "BatchLimit": "1"
    },
    "specification": "Spec",
    "invariants": [
      "TypeOK",
      "Custody",
      "InvocationNeedsStarted",
      "OnlyReachableInvokes",
      "FreshSourceMatched",
      "NoFreshRedispatch",
      "AdmissionRetained",
      "ReconcilePinned",
      "BudgetCountsFreshOnly",
      "BatchBound",
      "SettlementHasResult",
      "BoundedMessageClaim",
      "AbandonUnadmitted",
      "ActivationBarrier"
    ],
    "properties": [],
    "actions": [
      {
        "action": "AdvanceMemory",
        "property": "NeverAdvanceMemory"
      },
      {
        "action": "InvokeReconcile",
        "property": "NeverReconcileAfterMemory"
      }
    ],
    "bounds": {
      "applications": 1,
      "intents": 2,
      "scans": 2,
      "reconciliations": 1,
      "configurations": 2,
      "physicalEffect": "saturated existence only",
      "freshBatch": 1,
      "scenario": "memory-reconcile"
    },
    "assumptions": [
      "Started/settled record publication composes completed lower-level durable helper actions; helper cuts and power loss are separate.",
      "Parser, plan, source and policy validation are admitted abstractions; arbitrary trusted adapters are not proved.",
      "Outstanding callbacks may apply after host death or uncertain return; saturated physical-effect existence is not a count or exactly-once theorem."
    ]
  },
  {
    "id": "outbox-stale-episode",
    "suite": "outbox",
    "module": "ApplicationOutbox",
    "path": "verify/tla/outbox/ApplicationOutbox.tla",
    "constants": {
      "Mutation": "\"none\"",
      "Scenario": "\"stale-episode\"",
      "BatchLimit": "1"
    },
    "specification": "Spec",
    "invariants": [
      "TypeOK",
      "Custody",
      "InvocationNeedsStarted",
      "OnlyReachableInvokes",
      "FreshSourceMatched",
      "NoFreshRedispatch",
      "AdmissionRetained",
      "ReconcilePinned",
      "BudgetCountsFreshOnly",
      "BatchBound",
      "SettlementHasResult",
      "BoundedMessageClaim",
      "AbandonUnadmitted",
      "ActivationBarrier"
    ],
    "properties": [],
    "actions": [
      {
        "action": "AdvanceMemory",
        "property": "NeverAdvanceMemory"
      },
      {
        "action": "DenyFresh",
        "property": "NeverDenyFresh"
      }
    ],
    "bounds": {
      "applications": 1,
      "intents": 2,
      "scans": 2,
      "reconciliations": 1,
      "configurations": 2,
      "physicalEffect": "saturated existence only",
      "freshBatch": 1,
      "scenario": "stale-episode"
    },
    "assumptions": [
      "Started/settled record publication composes completed lower-level durable helper actions; helper cuts and power loss are separate.",
      "Parser, plan, source and policy validation are admitted abstractions; arbitrary trusted adapters are not proved.",
      "Outstanding callbacks may apply after host death or uncertain return; saturated physical-effect existence is not a count or exactly-once theorem."
    ]
  },
  {
    "id": "outbox-writer",
    "suite": "outbox",
    "module": "ApplicationOutbox",
    "path": "verify/tla/outbox/ApplicationOutbox.tla",
    "constants": {
      "Mutation": "\"none\"",
      "Scenario": "\"writer\"",
      "BatchLimit": "1"
    },
    "specification": "Spec",
    "invariants": [
      "TypeOK",
      "Custody",
      "InvocationNeedsStarted",
      "OnlyReachableInvokes",
      "FreshSourceMatched",
      "NoFreshRedispatch",
      "AdmissionRetained",
      "ReconcilePinned",
      "BudgetCountsFreshOnly",
      "BatchBound",
      "SettlementHasResult",
      "BoundedMessageClaim",
      "AbandonUnadmitted",
      "ActivationBarrier"
    ],
    "properties": [],
    "actions": [
      {
        "action": "AdvanceMemory",
        "property": "NeverAdvanceMemory"
      },
      {
        "action": "DenyFresh",
        "property": "NeverDenyFresh"
      }
    ],
    "bounds": {
      "applications": 1,
      "intents": 2,
      "scans": 2,
      "reconciliations": 1,
      "configurations": 2,
      "physicalEffect": "saturated existence only",
      "freshBatch": 1,
      "scenario": "writer"
    },
    "assumptions": [
      "Started/settled record publication composes completed lower-level durable helper actions; helper cuts and power loss are separate.",
      "Parser, plan, source and policy validation are admitted abstractions; arbitrary trusted adapters are not proved.",
      "Outstanding callbacks may apply after host death or uncertain return; saturated physical-effect existence is not a count or exactly-once theorem."
    ]
  },
  {
    "id": "outbox-same-pair-writer",
    "suite": "outbox",
    "module": "ApplicationOutbox",
    "path": "verify/tla/outbox/ApplicationOutbox.tla",
    "constants": {
      "Mutation": "\"none\"",
      "Scenario": "\"same-pair-writer\"",
      "BatchLimit": "1"
    },
    "specification": "Spec",
    "invariants": [
      "TypeOK",
      "Custody",
      "InvocationNeedsStarted",
      "OnlyReachableInvokes",
      "FreshSourceMatched",
      "NoFreshRedispatch",
      "AdmissionRetained",
      "ReconcilePinned",
      "BudgetCountsFreshOnly",
      "BatchBound",
      "SettlementHasResult",
      "BoundedMessageClaim",
      "AbandonUnadmitted",
      "ActivationBarrier"
    ],
    "properties": [],
    "actions": [
      {
        "action": "AdvanceHead",
        "property": "NeverAdvanceHead"
      },
      {
        "action": "DenyFresh",
        "property": "NeverDenyFresh"
      }
    ],
    "bounds": {
      "applications": 1,
      "intents": 2,
      "scans": 2,
      "reconciliations": 1,
      "configurations": 2,
      "physicalEffect": "saturated existence only",
      "freshBatch": 1,
      "scenario": "same-pair-writer"
    },
    "assumptions": [
      "Started/settled record publication composes completed lower-level durable helper actions; helper cuts and power loss are separate.",
      "Parser, plan, source and policy validation are admitted abstractions; arbitrary trusted adapters are not proved.",
      "Outstanding callbacks may apply after host death or uncertain return; saturated physical-effect existence is not a count or exactly-once theorem."
    ]
  },
  {
    "id": "outbox-activation",
    "suite": "outbox",
    "module": "ApplicationOutbox",
    "path": "verify/tla/outbox/ApplicationOutbox.tla",
    "constants": {
      "Mutation": "\"none\"",
      "Scenario": "\"activation-barrier\"",
      "BatchLimit": "1"
    },
    "specification": "Spec",
    "invariants": [
      "TypeOK",
      "Custody",
      "InvocationNeedsStarted",
      "OnlyReachableInvokes",
      "FreshSourceMatched",
      "NoFreshRedispatch",
      "AdmissionRetained",
      "ReconcilePinned",
      "BudgetCountsFreshOnly",
      "BatchBound",
      "SettlementHasResult",
      "BoundedMessageClaim",
      "AbandonUnadmitted",
      "ActivationBarrier"
    ],
    "properties": [],
    "actions": [
      {
        "action": "Activate",
        "property": "NeverActivate"
      }
    ],
    "bounds": {
      "applications": 1,
      "intents": 2,
      "scans": 2,
      "reconciliations": 1,
      "configurations": 2,
      "physicalEffect": "saturated existence only",
      "freshBatch": 1,
      "scenario": "activation-barrier"
    },
    "assumptions": [
      "Started/settled record publication composes completed lower-level durable helper actions; helper cuts and power loss are separate.",
      "Parser, plan, source and policy validation are admitted abstractions; arbitrary trusted adapters are not proved.",
      "Outstanding callbacks may apply after host death or uncertain return; saturated physical-effect existence is not a count or exactly-once theorem."
    ]
  },
  {
    "id": "outbox-migration",
    "suite": "outbox",
    "module": "ApplicationOutbox",
    "path": "verify/tla/outbox/ApplicationOutbox.tla",
    "constants": {
      "Mutation": "\"none\"",
      "Scenario": "\"migrate-episode\"",
      "BatchLimit": "1"
    },
    "specification": "Spec",
    "invariants": [
      "TypeOK",
      "Custody",
      "InvocationNeedsStarted",
      "OnlyReachableInvokes",
      "FreshSourceMatched",
      "NoFreshRedispatch",
      "AdmissionRetained",
      "ReconcilePinned",
      "BudgetCountsFreshOnly",
      "BatchBound",
      "SettlementHasResult",
      "BoundedMessageClaim",
      "AbandonUnadmitted",
      "ActivationBarrier"
    ],
    "properties": [],
    "actions": [
      {
        "action": "Migrate",
        "property": "NeverMigrateRetainingBoth"
      },
      {
        "action": "DenyFresh",
        "property": "NeverDenyFresh"
      }
    ],
    "bounds": {
      "applications": 1,
      "intents": 2,
      "scans": 2,
      "reconciliations": 1,
      "configurations": 2,
      "physicalEffect": "saturated existence only",
      "freshBatch": 1,
      "scenario": "migrate-episode"
    },
    "assumptions": [
      "Started/settled record publication composes completed lower-level durable helper actions; helper cuts and power loss are separate.",
      "Parser, plan, source and policy validation are admitted abstractions; arbitrary trusted adapters are not proved.",
      "Outstanding callbacks may apply after host death or uncertain return; saturated physical-effect existence is not a count or exactly-once theorem."
    ]
  },
  {
    "id": "outbox-drift-plan",
    "suite": "outbox",
    "module": "ApplicationOutbox",
    "path": "verify/tla/outbox/ApplicationOutbox.tla",
    "constants": {
      "Mutation": "\"none\"",
      "Scenario": "\"drift-plan\"",
      "BatchLimit": "1"
    },
    "specification": "Spec",
    "invariants": [
      "TypeOK",
      "Custody",
      "InvocationNeedsStarted",
      "OnlyReachableInvokes",
      "FreshSourceMatched",
      "NoFreshRedispatch",
      "AdmissionRetained",
      "ReconcilePinned",
      "BudgetCountsFreshOnly",
      "BatchBound",
      "SettlementHasResult",
      "BoundedMessageClaim",
      "AbandonUnadmitted",
      "ActivationBarrier"
    ],
    "properties": [],
    "actions": [
      {
        "action": "DenyReconcile",
        "property": "NeverDenyReconcile"
      }
    ],
    "bounds": {
      "applications": 1,
      "intents": 2,
      "scans": 2,
      "reconciliations": 1,
      "configurations": 2,
      "physicalEffect": "saturated existence only",
      "freshBatch": 1,
      "scenario": "drift-plan"
    },
    "assumptions": [
      "Started/settled record publication composes completed lower-level durable helper actions; helper cuts and power loss are separate.",
      "Parser, plan, source and policy validation are admitted abstractions; arbitrary trusted adapters are not proved.",
      "Outstanding callbacks may apply after host death or uncertain return; saturated physical-effect existence is not a count or exactly-once theorem."
    ]
  },
  {
    "id": "outbox-drift-config",
    "suite": "outbox",
    "module": "ApplicationOutbox",
    "path": "verify/tla/outbox/ApplicationOutbox.tla",
    "constants": {
      "Mutation": "\"none\"",
      "Scenario": "\"drift-config\"",
      "BatchLimit": "1"
    },
    "specification": "Spec",
    "invariants": [
      "TypeOK",
      "Custody",
      "InvocationNeedsStarted",
      "OnlyReachableInvokes",
      "FreshSourceMatched",
      "NoFreshRedispatch",
      "AdmissionRetained",
      "ReconcilePinned",
      "BudgetCountsFreshOnly",
      "BatchBound",
      "SettlementHasResult",
      "BoundedMessageClaim",
      "AbandonUnadmitted",
      "ActivationBarrier"
    ],
    "properties": [],
    "actions": [
      {
        "action": "SwitchConfig",
        "property": "NeverSwitchConfig"
      },
      {
        "action": "DenyReconcile",
        "property": "NeverDenyReconcile"
      }
    ],
    "bounds": {
      "applications": 1,
      "intents": 2,
      "scans": 2,
      "reconciliations": 1,
      "configurations": 2,
      "physicalEffect": "saturated existence only",
      "freshBatch": 1,
      "scenario": "drift-config"
    },
    "assumptions": [
      "Started/settled record publication composes completed lower-level durable helper actions; helper cuts and power loss are separate.",
      "Parser, plan, source and policy validation are admitted abstractions; arbitrary trusted adapters are not proved.",
      "Outstanding callbacks may apply after host death or uncertain return; saturated physical-effect existence is not a count or exactly-once theorem."
    ]
  },
  {
    "id": "outbox-oversize",
    "suite": "outbox",
    "module": "ApplicationOutbox",
    "path": "verify/tla/outbox/ApplicationOutbox.tla",
    "constants": {
      "Mutation": "\"none\"",
      "Scenario": "\"oversize\"",
      "BatchLimit": "1"
    },
    "specification": "Spec",
    "invariants": [
      "TypeOK",
      "Custody",
      "InvocationNeedsStarted",
      "OnlyReachableInvokes",
      "FreshSourceMatched",
      "NoFreshRedispatch",
      "AdmissionRetained",
      "ReconcilePinned",
      "BudgetCountsFreshOnly",
      "BatchBound",
      "SettlementHasResult",
      "BoundedMessageClaim",
      "AbandonUnadmitted",
      "ActivationBarrier"
    ],
    "properties": [],
    "actions": [
      {
        "action": "PublishOutcome",
        "property": "NeverPublishOutcome"
      }
    ],
    "bounds": {
      "applications": 1,
      "intents": 2,
      "scans": 2,
      "reconciliations": 1,
      "configurations": 2,
      "physicalEffect": "saturated existence only",
      "freshBatch": 1,
      "scenario": "oversize"
    },
    "assumptions": [
      "Started/settled record publication composes completed lower-level durable helper actions; helper cuts and power loss are separate.",
      "Parser, plan, source and policy validation are admitted abstractions; arbitrary trusted adapters are not proved.",
      "Outstanding callbacks may apply after host death or uncertain return; saturated physical-effect existence is not a count or exactly-once theorem."
    ]
  },
  {
    "id": "outbox-progress",
    "suite": "outbox",
    "module": "ApplicationOutbox",
    "path": "verify/tla/outbox/ApplicationOutbox.tla",
    "constants": {
      "Mutation": "\"none\"",
      "Scenario": "\"plain\"",
      "BatchLimit": "1"
    },
    "specification": "FairSpec",
    "invariants": [
      "TypeOK",
      "Custody",
      "InvocationNeedsStarted",
      "OnlyReachableInvokes",
      "FreshSourceMatched",
      "NoFreshRedispatch",
      "AdmissionRetained",
      "ReconcilePinned",
      "BudgetCountsFreshOnly",
      "BatchBound",
      "SettlementHasResult",
      "BoundedMessageClaim",
      "AbandonUnadmitted",
      "ActivationBarrier"
    ],
    "properties": [
      "EventuallyScansReturn"
    ],
    "actions": [
      {
        "action": "PublishStarted",
        "property": "NeverPublishStarted"
      }
    ],
    "bounds": {
      "applications": 1,
      "intents": 2,
      "scans": 2,
      "reconciliations": 1,
      "configurations": 2,
      "physicalEffect": "saturated existence only",
      "freshBatch": 1,
      "scenario": "plain"
    },
    "assumptions": [
      "Started/settled record publication composes completed lower-level durable helper actions; helper cuts and power loss are separate.",
      "Parser, plan, source and policy validation are admitted abstractions; arbitrary trusted adapters are not proved.",
      "Outstanding callbacks may apply after host death or uncertain return; saturated physical-effect existence is not a count or exactly-once theorem.",
      "Weak fairness of the declared progressing steps; return includes denial and does not imply external success."
    ]
  }
];

export const OUTBOX_MUTATIONS: ModelMutation[] = [
  {
    "id": "outbox-early-invoke",
    "base": "outbox-one",
    "mutation": "invoke-before-started",
    "property": "InvocationNeedsStarted",
    "kind": "invariant"
  },
  {
    "id": "outbox-orphan-invoke",
    "base": "outbox-orphan",
    "mutation": "orphan-dispatch",
    "property": "OnlyReachableInvokes",
    "kind": "invariant"
  },
  {
    "id": "outbox-forget",
    "base": "outbox-blocked-first",
    "mutation": "forget-dispatch",
    "property": "AdmissionRetained",
    "kind": "invariant"
  },
  {
    "id": "outbox-new-reconciliation-plan",
    "base": "outbox-blocked-first",
    "mutation": "change-old-plan",
    "property": "ReconcilePinned",
    "kind": "invariant"
  },
  {
    "id": "outbox-new-reconciliation-config",
    "base": "outbox-drift-config",
    "mutation": "change-old-config",
    "property": "ReconcilePinned",
    "kind": "invariant"
  },
  {
    "id": "outbox-charge-retained",
    "base": "outbox-blocked-first",
    "mutation": "charge-retained",
    "property": "BudgetCountsFreshOnly",
    "kind": "invariant"
  },
  {
    "id": "outbox-charge-denied",
    "base": "outbox-denied-first",
    "mutation": "charge-denied",
    "property": "BudgetCountsFreshOnly",
    "kind": "invariant"
  },
  {
    "id": "outbox-activate-unsettled",
    "base": "outbox-activation",
    "mutation": "ignore-activation-barrier",
    "property": "ActivationBarrier",
    "kind": "invariant"
  },
  {
    "id": "outbox-stale-writer",
    "base": "outbox-same-pair-writer",
    "mutation": "stale-writer",
    "property": "FreshSourceMatched",
    "kind": "invariant"
  },
  {
    "id": "outbox-unfair",
    "base": "outbox-progress",
    "specification": "Spec",
    "property": "EventuallyScansReturn",
    "kind": "liveness"
  }
];
