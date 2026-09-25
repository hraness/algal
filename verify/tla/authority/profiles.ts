import type { ModelMutation, ModelProfile } from "../definitions";

/** Reviewed static finite profiles; see SCOPE.md for assumptions and reductions. */
export const AUTHORITY_PROFILES: ModelProfile[] = [
  {
    "id": "authority-observe",
    "suite": "authority",
    "module": "ApplicationAuthority",
    "path": "verify/tla/authority/ApplicationAuthority.tla",
    "constants": {
      "Mutation": "\"none\"",
      "Scenario": "\"observe\""
    },
    "specification": "Spec",
    "invariants": [
      "TypeOK",
      "DataCannotMint",
      "HostDenialPreserved",
      "CapturedSource",
      "FreshWriterCurrent",
      "DefaultSelection",
      "DefaultNamespace",
      "ReconcilePinned",
      "ExactCapabilityClass",
      "ExactCapabilityEdge",
      "NoDataCapabilitySource",
      "ActiveRegistryRequired",
      "RequirementNarrowing",
      "DefaultEntryNarrowing",
      "MessageClass",
      "DeliveryEvidenceBound",
      "ChannelEvidenceBound",
      "ChannelIdentityRetained"
    ],
    "properties": [],
    "actions": [
      {
        "action": "Invoke",
        "property": "NeverInvoke"
      }
    ],
    "bounds": {
      "applications": 2,
      "classes": 2,
      "handles": 3,
      "heads": 2,
      "revisions": 2,
      "memorySymbols": 2,
      "frontiers": 2,
      "attempts": 2,
      "channelIdentities": 2,
      "scenario": "observe"
    },
    "assumptions": [
      "Four finite families fix unmodeled plan/query/serialization fields; independent family completion is not a cross-family source refinement.",
      "Default-host applicability checks consume trusted query results; custom hosts and arbitrary executors remain trusted and observe is not OS isolation.",
      "Capability syntax/class is separate from active registry authority. CAS message evidence is weaker than retained delivery; even full delivery does not admit a destination mailbox or prove an external receiver.",
      "Optional channel publication composes a completed serialized helper; partial publication and production row/byte limits are separate."
    ]
  },
  {
    "id": "authority-writer",
    "suite": "authority",
    "module": "ApplicationAuthority",
    "path": "verify/tla/authority/ApplicationAuthority.tla",
    "constants": {
      "Mutation": "\"none\"",
      "Scenario": "\"writer\""
    },
    "specification": "Spec",
    "invariants": [
      "TypeOK",
      "DataCannotMint",
      "HostDenialPreserved",
      "CapturedSource",
      "FreshWriterCurrent",
      "DefaultSelection",
      "DefaultNamespace",
      "ReconcilePinned",
      "ExactCapabilityClass",
      "ExactCapabilityEdge",
      "NoDataCapabilitySource",
      "ActiveRegistryRequired",
      "RequirementNarrowing",
      "DefaultEntryNarrowing",
      "MessageClass",
      "DeliveryEvidenceBound",
      "ChannelEvidenceBound",
      "ChannelIdentityRetained"
    ],
    "properties": [],
    "actions": [
      {
        "action": "Invoke",
        "property": "NeverInvoke"
      }
    ],
    "bounds": {
      "applications": 2,
      "classes": 2,
      "handles": 3,
      "heads": 2,
      "revisions": 2,
      "memorySymbols": 2,
      "frontiers": 2,
      "attempts": 2,
      "channelIdentities": 2,
      "scenario": "writer"
    },
    "assumptions": [
      "Four finite families fix unmodeled plan/query/serialization fields; independent family completion is not a cross-family source refinement.",
      "Default-host applicability checks consume trusted query results; custom hosts and arbitrary executors remain trusted and observe is not OS isolation.",
      "Capability syntax/class is separate from active registry authority. CAS message evidence is weaker than retained delivery; even full delivery does not admit a destination mailbox or prove an external receiver.",
      "Optional channel publication composes a completed serialized helper; partial publication and production row/byte limits are separate."
    ]
  },
  {
    "id": "authority-delivery",
    "suite": "authority",
    "module": "ApplicationAuthority",
    "path": "verify/tla/authority/ApplicationAuthority.tla",
    "constants": {
      "Mutation": "\"none\"",
      "Scenario": "\"delivery\""
    },
    "specification": "Spec",
    "invariants": [
      "TypeOK",
      "DataCannotMint",
      "HostDenialPreserved",
      "CapturedSource",
      "FreshWriterCurrent",
      "DefaultSelection",
      "DefaultNamespace",
      "ReconcilePinned",
      "ExactCapabilityClass",
      "ExactCapabilityEdge",
      "NoDataCapabilitySource",
      "ActiveRegistryRequired",
      "RequirementNarrowing",
      "DefaultEntryNarrowing",
      "MessageClass",
      "DeliveryEvidenceBound",
      "ChannelEvidenceBound",
      "ChannelIdentityRetained"
    ],
    "properties": [],
    "actions": [
      {
        "action": "Invoke",
        "property": "NeverInvoke"
      }
    ],
    "bounds": {
      "applications": 2,
      "classes": 2,
      "handles": 3,
      "heads": 2,
      "revisions": 2,
      "memorySymbols": 2,
      "frontiers": 2,
      "attempts": 2,
      "channelIdentities": 2,
      "scenario": "delivery"
    },
    "assumptions": [
      "Four finite families fix unmodeled plan/query/serialization fields; independent family completion is not a cross-family source refinement.",
      "Default-host applicability checks consume trusted query results; custom hosts and arbitrary executors remain trusted and observe is not OS isolation.",
      "Capability syntax/class is separate from active registry authority. CAS message evidence is weaker than retained delivery; even full delivery does not admit a destination mailbox or prove an external receiver.",
      "Optional channel publication composes a completed serialized helper; partial publication and production row/byte limits are separate."
    ]
  },
  {
    "id": "authority-wrong-policy",
    "suite": "authority",
    "module": "ApplicationAuthority",
    "path": "verify/tla/authority/ApplicationAuthority.tla",
    "constants": {
      "Mutation": "\"none\"",
      "Scenario": "\"wrong-policy\""
    },
    "specification": "Spec",
    "invariants": [
      "TypeOK",
      "DataCannotMint",
      "HostDenialPreserved",
      "CapturedSource",
      "FreshWriterCurrent",
      "DefaultSelection",
      "DefaultNamespace",
      "ReconcilePinned",
      "ExactCapabilityClass",
      "ExactCapabilityEdge",
      "NoDataCapabilitySource",
      "ActiveRegistryRequired",
      "RequirementNarrowing",
      "DefaultEntryNarrowing",
      "MessageClass",
      "DeliveryEvidenceBound",
      "ChannelEvidenceBound",
      "ChannelIdentityRetained"
    ],
    "properties": [],
    "actions": [
      {
        "action": "HostDeny",
        "property": "NeverHostDeny"
      }
    ],
    "bounds": {
      "applications": 2,
      "classes": 2,
      "handles": 3,
      "heads": 2,
      "revisions": 2,
      "memorySymbols": 2,
      "frontiers": 2,
      "attempts": 2,
      "channelIdentities": 2,
      "scenario": "wrong-policy"
    },
    "assumptions": [
      "Four finite families fix unmodeled plan/query/serialization fields; independent family completion is not a cross-family source refinement.",
      "Default-host applicability checks consume trusted query results; custom hosts and arbitrary executors remain trusted and observe is not OS isolation.",
      "Capability syntax/class is separate from active registry authority. CAS message evidence is weaker than retained delivery; even full delivery does not admit a destination mailbox or prove an external receiver.",
      "Optional channel publication composes a completed serialized helper; partial publication and production row/byte limits are separate."
    ]
  },
  {
    "id": "authority-host-denial",
    "suite": "authority",
    "module": "ApplicationAuthority",
    "path": "verify/tla/authority/ApplicationAuthority.tla",
    "constants": {
      "Mutation": "\"none\"",
      "Scenario": "\"host-denial\""
    },
    "specification": "Spec",
    "invariants": [
      "TypeOK",
      "DataCannotMint",
      "HostDenialPreserved",
      "CapturedSource",
      "FreshWriterCurrent",
      "DefaultSelection",
      "DefaultNamespace",
      "ReconcilePinned",
      "ExactCapabilityClass",
      "ExactCapabilityEdge",
      "NoDataCapabilitySource",
      "ActiveRegistryRequired",
      "RequirementNarrowing",
      "DefaultEntryNarrowing",
      "MessageClass",
      "DeliveryEvidenceBound",
      "ChannelEvidenceBound",
      "ChannelIdentityRetained"
    ],
    "properties": [],
    "actions": [
      {
        "action": "HostDeny",
        "property": "NeverHostDeny"
      }
    ],
    "bounds": {
      "applications": 2,
      "classes": 2,
      "handles": 3,
      "heads": 2,
      "revisions": 2,
      "memorySymbols": 2,
      "frontiers": 2,
      "attempts": 2,
      "channelIdentities": 2,
      "scenario": "host-denial"
    },
    "assumptions": [
      "Four finite families fix unmodeled plan/query/serialization fields; independent family completion is not a cross-family source refinement.",
      "Default-host applicability checks consume trusted query results; custom hosts and arbitrary executors remain trusted and observe is not OS isolation.",
      "Capability syntax/class is separate from active registry authority. CAS message evidence is weaker than retained delivery; even full delivery does not admit a destination mailbox or prove an external receiver.",
      "Optional channel publication composes a completed serialized helper; partial publication and production row/byte limits are separate."
    ]
  },
  {
    "id": "authority-no-callback",
    "suite": "authority",
    "module": "ApplicationAuthority",
    "path": "verify/tla/authority/ApplicationAuthority.tla",
    "constants": {
      "Mutation": "\"none\"",
      "Scenario": "\"no-callback\""
    },
    "specification": "Spec",
    "invariants": [
      "TypeOK",
      "DataCannotMint",
      "HostDenialPreserved",
      "CapturedSource",
      "FreshWriterCurrent",
      "DefaultSelection",
      "DefaultNamespace",
      "ReconcilePinned",
      "ExactCapabilityClass",
      "ExactCapabilityEdge",
      "NoDataCapabilitySource",
      "ActiveRegistryRequired",
      "RequirementNarrowing",
      "DefaultEntryNarrowing",
      "MessageClass",
      "DeliveryEvidenceBound",
      "ChannelEvidenceBound",
      "ChannelIdentityRetained"
    ],
    "properties": [],
    "actions": [
      {
        "action": "HostDeny",
        "property": "NeverHostDeny"
      }
    ],
    "bounds": {
      "applications": 2,
      "classes": 2,
      "handles": 3,
      "heads": 2,
      "revisions": 2,
      "memorySymbols": 2,
      "frontiers": 2,
      "attempts": 2,
      "channelIdentities": 2,
      "scenario": "no-callback"
    },
    "assumptions": [
      "Four finite families fix unmodeled plan/query/serialization fields; independent family completion is not a cross-family source refinement.",
      "Default-host applicability checks consume trusted query results; custom hosts and arbitrary executors remain trusted and observe is not OS isolation.",
      "Capability syntax/class is separate from active registry authority. CAS message evidence is weaker than retained delivery; even full delivery does not admit a destination mailbox or prove an external receiver.",
      "Optional channel publication composes a completed serialized helper; partial publication and production row/byte limits are separate."
    ]
  },
  {
    "id": "authority-route-denial",
    "suite": "authority",
    "module": "ApplicationAuthority",
    "path": "verify/tla/authority/ApplicationAuthority.tla",
    "constants": {
      "Mutation": "\"none\"",
      "Scenario": "\"route-denial\""
    },
    "specification": "Spec",
    "invariants": [
      "TypeOK",
      "DataCannotMint",
      "HostDenialPreserved",
      "CapturedSource",
      "FreshWriterCurrent",
      "DefaultSelection",
      "DefaultNamespace",
      "ReconcilePinned",
      "ExactCapabilityClass",
      "ExactCapabilityEdge",
      "NoDataCapabilitySource",
      "ActiveRegistryRequired",
      "RequirementNarrowing",
      "DefaultEntryNarrowing",
      "MessageClass",
      "DeliveryEvidenceBound",
      "ChannelEvidenceBound",
      "ChannelIdentityRetained"
    ],
    "properties": [],
    "actions": [
      {
        "action": "HostDeny",
        "property": "NeverHostDeny"
      }
    ],
    "bounds": {
      "applications": 2,
      "classes": 2,
      "handles": 3,
      "heads": 2,
      "revisions": 2,
      "memorySymbols": 2,
      "frontiers": 2,
      "attempts": 2,
      "channelIdentities": 2,
      "scenario": "route-denial"
    },
    "assumptions": [
      "Four finite families fix unmodeled plan/query/serialization fields; independent family completion is not a cross-family source refinement.",
      "Default-host applicability checks consume trusted query results; custom hosts and arbitrary executors remain trusted and observe is not OS isolation.",
      "Capability syntax/class is separate from active registry authority. CAS message evidence is weaker than retained delivery; even full delivery does not admit a destination mailbox or prove an external receiver.",
      "Optional channel publication composes a completed serialized helper; partial publication and production row/byte limits are separate."
    ]
  },
  {
    "id": "authority-unsupported",
    "suite": "authority",
    "module": "ApplicationAuthority",
    "path": "verify/tla/authority/ApplicationAuthority.tla",
    "constants": {
      "Mutation": "\"none\"",
      "Scenario": "\"unsupported\""
    },
    "specification": "Spec",
    "invariants": [
      "TypeOK",
      "DataCannotMint",
      "HostDenialPreserved",
      "CapturedSource",
      "FreshWriterCurrent",
      "DefaultSelection",
      "DefaultNamespace",
      "ReconcilePinned",
      "ExactCapabilityClass",
      "ExactCapabilityEdge",
      "NoDataCapabilitySource",
      "ActiveRegistryRequired",
      "RequirementNarrowing",
      "DefaultEntryNarrowing",
      "MessageClass",
      "DeliveryEvidenceBound",
      "ChannelEvidenceBound",
      "ChannelIdentityRetained"
    ],
    "properties": [],
    "actions": [
      {
        "action": "HostDeny",
        "property": "NeverHostDeny"
      }
    ],
    "bounds": {
      "applications": 2,
      "classes": 2,
      "handles": 3,
      "heads": 2,
      "revisions": 2,
      "memorySymbols": 2,
      "frontiers": 2,
      "attempts": 2,
      "channelIdentities": 2,
      "scenario": "unsupported"
    },
    "assumptions": [
      "Four finite families fix unmodeled plan/query/serialization fields; independent family completion is not a cross-family source refinement.",
      "Default-host applicability checks consume trusted query results; custom hosts and arbitrary executors remain trusted and observe is not OS isolation.",
      "Capability syntax/class is separate from active registry authority. CAS message evidence is weaker than retained delivery; even full delivery does not admit a destination mailbox or prove an external receiver.",
      "Optional channel publication composes a completed serialized helper; partial publication and production row/byte limits are separate."
    ]
  },
  {
    "id": "authority-unverified",
    "suite": "authority",
    "module": "ApplicationAuthority",
    "path": "verify/tla/authority/ApplicationAuthority.tla",
    "constants": {
      "Mutation": "\"none\"",
      "Scenario": "\"unverified\""
    },
    "specification": "Spec",
    "invariants": [
      "TypeOK",
      "DataCannotMint",
      "HostDenialPreserved",
      "CapturedSource",
      "FreshWriterCurrent",
      "DefaultSelection",
      "DefaultNamespace",
      "ReconcilePinned",
      "ExactCapabilityClass",
      "ExactCapabilityEdge",
      "NoDataCapabilitySource",
      "ActiveRegistryRequired",
      "RequirementNarrowing",
      "DefaultEntryNarrowing",
      "MessageClass",
      "DeliveryEvidenceBound",
      "ChannelEvidenceBound",
      "ChannelIdentityRetained"
    ],
    "properties": [],
    "actions": [
      {
        "action": "HostDeny",
        "property": "NeverHostDeny"
      }
    ],
    "bounds": {
      "applications": 2,
      "classes": 2,
      "handles": 3,
      "heads": 2,
      "revisions": 2,
      "memorySymbols": 2,
      "frontiers": 2,
      "attempts": 2,
      "channelIdentities": 2,
      "scenario": "unverified"
    },
    "assumptions": [
      "Four finite families fix unmodeled plan/query/serialization fields; independent family completion is not a cross-family source refinement.",
      "Default-host applicability checks consume trusted query results; custom hosts and arbitrary executors remain trusted and observe is not OS isolation.",
      "Capability syntax/class is separate from active registry authority. CAS message evidence is weaker than retained delivery; even full delivery does not admit a destination mailbox or prove an external receiver.",
      "Optional channel publication composes a completed serialized helper; partial publication and production row/byte limits are separate."
    ]
  },
  {
    "id": "authority-default-stale-observe",
    "suite": "authority",
    "module": "ApplicationAuthority",
    "path": "verify/tla/authority/ApplicationAuthority.tla",
    "constants": {
      "Mutation": "\"none\"",
      "Scenario": "\"default-stale-observe\""
    },
    "specification": "Spec",
    "invariants": [
      "TypeOK",
      "DataCannotMint",
      "HostDenialPreserved",
      "CapturedSource",
      "FreshWriterCurrent",
      "DefaultSelection",
      "DefaultNamespace",
      "ReconcilePinned",
      "ExactCapabilityClass",
      "ExactCapabilityEdge",
      "NoDataCapabilitySource",
      "ActiveRegistryRequired",
      "RequirementNarrowing",
      "DefaultEntryNarrowing",
      "MessageClass",
      "DeliveryEvidenceBound",
      "ChannelEvidenceBound",
      "ChannelIdentityRetained"
    ],
    "properties": [],
    "actions": [
      {
        "action": "HostDeny",
        "property": "NeverHostDeny"
      }
    ],
    "bounds": {
      "applications": 2,
      "classes": 2,
      "handles": 3,
      "heads": 2,
      "revisions": 2,
      "memorySymbols": 2,
      "frontiers": 2,
      "attempts": 2,
      "channelIdentities": 2,
      "scenario": "default-stale-observe"
    },
    "assumptions": [
      "Four finite families fix unmodeled plan/query/serialization fields; independent family completion is not a cross-family source refinement.",
      "Default-host applicability checks consume trusted query results; custom hosts and arbitrary executors remain trusted and observe is not OS isolation.",
      "Capability syntax/class is separate from active registry authority. CAS message evidence is weaker than retained delivery; even full delivery does not admit a destination mailbox or prove an external receiver.",
      "Optional channel publication composes a completed serialized helper; partial publication and production row/byte limits are separate."
    ]
  },
  {
    "id": "authority-migrated-episode",
    "suite": "authority",
    "module": "ApplicationAuthority",
    "path": "verify/tla/authority/ApplicationAuthority.tla",
    "constants": {
      "Mutation": "\"none\"",
      "Scenario": "\"migrated-episode\""
    },
    "specification": "Spec",
    "invariants": [
      "TypeOK",
      "DataCannotMint",
      "HostDenialPreserved",
      "CapturedSource",
      "FreshWriterCurrent",
      "DefaultSelection",
      "DefaultNamespace",
      "ReconcilePinned",
      "ExactCapabilityClass",
      "ExactCapabilityEdge",
      "NoDataCapabilitySource",
      "ActiveRegistryRequired",
      "RequirementNarrowing",
      "DefaultEntryNarrowing",
      "MessageClass",
      "DeliveryEvidenceBound",
      "ChannelEvidenceBound",
      "ChannelIdentityRetained"
    ],
    "properties": [],
    "actions": [
      {
        "action": "HostDeny",
        "property": "NeverHostDeny"
      }
    ],
    "bounds": {
      "applications": 2,
      "classes": 2,
      "handles": 3,
      "heads": 2,
      "revisions": 2,
      "memorySymbols": 2,
      "frontiers": 2,
      "attempts": 2,
      "channelIdentities": 2,
      "scenario": "migrated-episode"
    },
    "assumptions": [
      "Four finite families fix unmodeled plan/query/serialization fields; independent family completion is not a cross-family source refinement.",
      "Default-host applicability checks consume trusted query results; custom hosts and arbitrary executors remain trusted and observe is not OS isolation.",
      "Capability syntax/class is separate from active registry authority. CAS message evidence is weaker than retained delivery; even full delivery does not admit a destination mailbox or prove an external receiver.",
      "Optional channel publication composes a completed serialized helper; partial publication and production row/byte limits are separate."
    ]
  },
  {
    "id": "authority-same-pair-observe",
    "suite": "authority",
    "module": "ApplicationAuthority",
    "path": "verify/tla/authority/ApplicationAuthority.tla",
    "constants": {
      "Mutation": "\"none\"",
      "Scenario": "\"same-pair-observe\""
    },
    "specification": "Spec",
    "invariants": [
      "TypeOK",
      "DataCannotMint",
      "HostDenialPreserved",
      "CapturedSource",
      "FreshWriterCurrent",
      "DefaultSelection",
      "DefaultNamespace",
      "ReconcilePinned",
      "ExactCapabilityClass",
      "ExactCapabilityEdge",
      "NoDataCapabilitySource",
      "ActiveRegistryRequired",
      "RequirementNarrowing",
      "DefaultEntryNarrowing",
      "MessageClass",
      "DeliveryEvidenceBound",
      "ChannelEvidenceBound",
      "ChannelIdentityRetained"
    ],
    "properties": [],
    "actions": [
      {
        "action": "Invoke",
        "property": "NeverInvoke"
      }
    ],
    "bounds": {
      "applications": 2,
      "classes": 2,
      "handles": 3,
      "heads": 2,
      "revisions": 2,
      "memorySymbols": 2,
      "frontiers": 2,
      "attempts": 2,
      "channelIdentities": 2,
      "scenario": "same-pair-observe"
    },
    "assumptions": [
      "Four finite families fix unmodeled plan/query/serialization fields; independent family completion is not a cross-family source refinement.",
      "Default-host applicability checks consume trusted query results; custom hosts and arbitrary executors remain trusted and observe is not OS isolation.",
      "Capability syntax/class is separate from active registry authority. CAS message evidence is weaker than retained delivery; even full delivery does not admit a destination mailbox or prove an external receiver.",
      "Optional channel publication composes a completed serialized helper; partial publication and production row/byte limits are separate."
    ]
  },
  {
    "id": "authority-same-pair-writer",
    "suite": "authority",
    "module": "ApplicationAuthority",
    "path": "verify/tla/authority/ApplicationAuthority.tla",
    "constants": {
      "Mutation": "\"none\"",
      "Scenario": "\"same-pair-writer\""
    },
    "specification": "Spec",
    "invariants": [
      "TypeOK",
      "DataCannotMint",
      "HostDenialPreserved",
      "CapturedSource",
      "FreshWriterCurrent",
      "DefaultSelection",
      "DefaultNamespace",
      "ReconcilePinned",
      "ExactCapabilityClass",
      "ExactCapabilityEdge",
      "NoDataCapabilitySource",
      "ActiveRegistryRequired",
      "RequirementNarrowing",
      "DefaultEntryNarrowing",
      "MessageClass",
      "DeliveryEvidenceBound",
      "ChannelEvidenceBound",
      "ChannelIdentityRetained"
    ],
    "properties": [],
    "actions": [
      {
        "action": "CoreDeny",
        "property": "NeverCoreDeny"
      }
    ],
    "bounds": {
      "applications": 2,
      "classes": 2,
      "handles": 3,
      "heads": 2,
      "revisions": 2,
      "memorySymbols": 2,
      "frontiers": 2,
      "attempts": 2,
      "channelIdentities": 2,
      "scenario": "same-pair-writer"
    },
    "assumptions": [
      "Four finite families fix unmodeled plan/query/serialization fields; independent family completion is not a cross-family source refinement.",
      "Default-host applicability checks consume trusted query results; custom hosts and arbitrary executors remain trusted and observe is not OS isolation.",
      "Capability syntax/class is separate from active registry authority. CAS message evidence is weaker than retained delivery; even full delivery does not admit a destination mailbox or prove an external receiver.",
      "Optional channel publication composes a completed serialized helper; partial publication and production row/byte limits are separate."
    ]
  },
  {
    "id": "authority-custom-stale-observe",
    "suite": "authority",
    "module": "ApplicationAuthority",
    "path": "verify/tla/authority/ApplicationAuthority.tla",
    "constants": {
      "Mutation": "\"none\"",
      "Scenario": "\"custom-stale-observe\""
    },
    "specification": "Spec",
    "invariants": [
      "TypeOK",
      "DataCannotMint",
      "HostDenialPreserved",
      "CapturedSource",
      "FreshWriterCurrent",
      "DefaultSelection",
      "DefaultNamespace",
      "ReconcilePinned",
      "ExactCapabilityClass",
      "ExactCapabilityEdge",
      "NoDataCapabilitySource",
      "ActiveRegistryRequired",
      "RequirementNarrowing",
      "DefaultEntryNarrowing",
      "MessageClass",
      "DeliveryEvidenceBound",
      "ChannelEvidenceBound",
      "ChannelIdentityRetained"
    ],
    "properties": [],
    "actions": [
      {
        "action": "Invoke",
        "property": "NeverCustomStaleObserve"
      }
    ],
    "bounds": {
      "applications": 2,
      "classes": 2,
      "handles": 3,
      "heads": 2,
      "revisions": 2,
      "memorySymbols": 2,
      "frontiers": 2,
      "attempts": 2,
      "channelIdentities": 2,
      "scenario": "custom-stale-observe"
    },
    "assumptions": [
      "Four finite families fix unmodeled plan/query/serialization fields; independent family completion is not a cross-family source refinement.",
      "Default-host applicability checks consume trusted query results; custom hosts and arbitrary executors remain trusted and observe is not OS isolation.",
      "Capability syntax/class is separate from active registry authority. CAS message evidence is weaker than retained delivery; even full delivery does not admit a destination mailbox or prove an external receiver.",
      "Optional channel publication composes a completed serialized helper; partial publication and production row/byte limits are separate."
    ]
  },
  {
    "id": "authority-custom-stale-writer",
    "suite": "authority",
    "module": "ApplicationAuthority",
    "path": "verify/tla/authority/ApplicationAuthority.tla",
    "constants": {
      "Mutation": "\"none\"",
      "Scenario": "\"custom-stale-writer\""
    },
    "specification": "Spec",
    "invariants": [
      "TypeOK",
      "DataCannotMint",
      "HostDenialPreserved",
      "CapturedSource",
      "FreshWriterCurrent",
      "DefaultSelection",
      "DefaultNamespace",
      "ReconcilePinned",
      "ExactCapabilityClass",
      "ExactCapabilityEdge",
      "NoDataCapabilitySource",
      "ActiveRegistryRequired",
      "RequirementNarrowing",
      "DefaultEntryNarrowing",
      "MessageClass",
      "DeliveryEvidenceBound",
      "ChannelEvidenceBound",
      "ChannelIdentityRetained"
    ],
    "properties": [],
    "actions": [
      {
        "action": "CoreDeny",
        "property": "NeverCoreDeny"
      }
    ],
    "bounds": {
      "applications": 2,
      "classes": 2,
      "handles": 3,
      "heads": 2,
      "revisions": 2,
      "memorySymbols": 2,
      "frontiers": 2,
      "attempts": 2,
      "channelIdentities": 2,
      "scenario": "custom-stale-writer"
    },
    "assumptions": [
      "Four finite families fix unmodeled plan/query/serialization fields; independent family completion is not a cross-family source refinement.",
      "Default-host applicability checks consume trusted query results; custom hosts and arbitrary executors remain trusted and observe is not OS isolation.",
      "Capability syntax/class is separate from active registry authority. CAS message evidence is weaker than retained delivery; even full delivery does not admit a destination mailbox or prove an external receiver.",
      "Optional channel publication composes a completed serialized helper; partial publication and production row/byte limits are separate."
    ]
  },
  {
    "id": "authority-custom-plan-drift",
    "suite": "authority",
    "module": "ApplicationAuthority",
    "path": "verify/tla/authority/ApplicationAuthority.tla",
    "constants": {
      "Mutation": "\"none\"",
      "Scenario": "\"custom-plan-drift\""
    },
    "specification": "Spec",
    "invariants": [
      "TypeOK",
      "DataCannotMint",
      "HostDenialPreserved",
      "CapturedSource",
      "FreshWriterCurrent",
      "DefaultSelection",
      "DefaultNamespace",
      "ReconcilePinned",
      "ExactCapabilityClass",
      "ExactCapabilityEdge",
      "NoDataCapabilitySource",
      "ActiveRegistryRequired",
      "RequirementNarrowing",
      "DefaultEntryNarrowing",
      "MessageClass",
      "DeliveryEvidenceBound",
      "ChannelEvidenceBound",
      "ChannelIdentityRetained"
    ],
    "properties": [],
    "actions": [
      {
        "action": "CoreDeny",
        "property": "NeverCoreDeny"
      }
    ],
    "bounds": {
      "applications": 2,
      "classes": 2,
      "handles": 3,
      "heads": 2,
      "revisions": 2,
      "memorySymbols": 2,
      "frontiers": 2,
      "attempts": 2,
      "channelIdentities": 2,
      "scenario": "custom-plan-drift"
    },
    "assumptions": [
      "Four finite families fix unmodeled plan/query/serialization fields; independent family completion is not a cross-family source refinement.",
      "Default-host applicability checks consume trusted query results; custom hosts and arbitrary executors remain trusted and observe is not OS isolation.",
      "Capability syntax/class is separate from active registry authority. CAS message evidence is weaker than retained delivery; even full delivery does not admit a destination mailbox or prove an external receiver.",
      "Optional channel publication composes a completed serialized helper; partial publication and production row/byte limits are separate."
    ]
  },
  {
    "id": "authority-reconcile-old",
    "suite": "authority",
    "module": "ApplicationAuthority",
    "path": "verify/tla/authority/ApplicationAuthority.tla",
    "constants": {
      "Mutation": "\"none\"",
      "Scenario": "\"reconcile-old\""
    },
    "specification": "Spec",
    "invariants": [
      "TypeOK",
      "DataCannotMint",
      "HostDenialPreserved",
      "CapturedSource",
      "FreshWriterCurrent",
      "DefaultSelection",
      "DefaultNamespace",
      "ReconcilePinned",
      "ExactCapabilityClass",
      "ExactCapabilityEdge",
      "NoDataCapabilitySource",
      "ActiveRegistryRequired",
      "RequirementNarrowing",
      "DefaultEntryNarrowing",
      "MessageClass",
      "DeliveryEvidenceBound",
      "ChannelEvidenceBound",
      "ChannelIdentityRetained"
    ],
    "properties": [],
    "actions": [
      {
        "action": "Invoke",
        "property": "NeverReconcileOldMemory"
      }
    ],
    "bounds": {
      "applications": 2,
      "classes": 2,
      "handles": 3,
      "heads": 2,
      "revisions": 2,
      "memorySymbols": 2,
      "frontiers": 2,
      "attempts": 2,
      "channelIdentities": 2,
      "scenario": "reconcile-old"
    },
    "assumptions": [
      "Four finite families fix unmodeled plan/query/serialization fields; independent family completion is not a cross-family source refinement.",
      "Default-host applicability checks consume trusted query results; custom hosts and arbitrary executors remain trusted and observe is not OS isolation.",
      "Capability syntax/class is separate from active registry authority. CAS message evidence is weaker than retained delivery; even full delivery does not admit a destination mailbox or prove an external receiver.",
      "Optional channel publication composes a completed serialized helper; partial publication and production row/byte limits are separate."
    ]
  },
  {
    "id": "authority-reconcile-plan",
    "suite": "authority",
    "module": "ApplicationAuthority",
    "path": "verify/tla/authority/ApplicationAuthority.tla",
    "constants": {
      "Mutation": "\"none\"",
      "Scenario": "\"reconcile-plan\""
    },
    "specification": "Spec",
    "invariants": [
      "TypeOK",
      "DataCannotMint",
      "HostDenialPreserved",
      "CapturedSource",
      "FreshWriterCurrent",
      "DefaultSelection",
      "DefaultNamespace",
      "ReconcilePinned",
      "ExactCapabilityClass",
      "ExactCapabilityEdge",
      "NoDataCapabilitySource",
      "ActiveRegistryRequired",
      "RequirementNarrowing",
      "DefaultEntryNarrowing",
      "MessageClass",
      "DeliveryEvidenceBound",
      "ChannelEvidenceBound",
      "ChannelIdentityRetained"
    ],
    "properties": [],
    "actions": [
      {
        "action": "CoreDeny",
        "property": "NeverCoreDeny"
      }
    ],
    "bounds": {
      "applications": 2,
      "classes": 2,
      "handles": 3,
      "heads": 2,
      "revisions": 2,
      "memorySymbols": 2,
      "frontiers": 2,
      "attempts": 2,
      "channelIdentities": 2,
      "scenario": "reconcile-plan"
    },
    "assumptions": [
      "Four finite families fix unmodeled plan/query/serialization fields; independent family completion is not a cross-family source refinement.",
      "Default-host applicability checks consume trusted query results; custom hosts and arbitrary executors remain trusted and observe is not OS isolation.",
      "Capability syntax/class is separate from active registry authority. CAS message evidence is weaker than retained delivery; even full delivery does not admit a destination mailbox or prove an external receiver.",
      "Optional channel publication composes a completed serialized helper; partial publication and production row/byte limits are separate."
    ]
  },
  {
    "id": "authority-advance-reconcile",
    "suite": "authority",
    "module": "ApplicationAuthority",
    "path": "verify/tla/authority/ApplicationAuthority.tla",
    "constants": {
      "Mutation": "\"none\"",
      "Scenario": "\"advance-reconcile\""
    },
    "specification": "Spec",
    "invariants": [
      "TypeOK",
      "DataCannotMint",
      "HostDenialPreserved",
      "CapturedSource",
      "FreshWriterCurrent",
      "DefaultSelection",
      "DefaultNamespace",
      "ReconcilePinned",
      "ExactCapabilityClass",
      "ExactCapabilityEdge",
      "NoDataCapabilitySource",
      "ActiveRegistryRequired",
      "RequirementNarrowing",
      "DefaultEntryNarrowing",
      "MessageClass",
      "DeliveryEvidenceBound",
      "ChannelEvidenceBound",
      "ChannelIdentityRetained"
    ],
    "properties": [],
    "actions": [
      {
        "action": "AdvanceMemory",
        "property": "NeverAdvanceMemory"
      },
      {
        "action": "Invoke",
        "property": "NeverReconcileOldMemory"
      }
    ],
    "bounds": {
      "applications": 2,
      "classes": 2,
      "handles": 3,
      "heads": 2,
      "revisions": 2,
      "memorySymbols": 2,
      "frontiers": 2,
      "attempts": 2,
      "channelIdentities": 2,
      "scenario": "advance-reconcile"
    },
    "assumptions": [
      "Four finite families fix unmodeled plan/query/serialization fields; independent family completion is not a cross-family source refinement.",
      "Default-host applicability checks consume trusted query results; custom hosts and arbitrary executors remain trusted and observe is not OS isolation.",
      "Capability syntax/class is separate from active registry authority. CAS message evidence is weaker than retained delivery; even full delivery does not admit a destination mailbox or prove an external receiver.",
      "Optional channel publication composes a completed serialized helper; partial publication and production row/byte limits are separate."
    ]
  },
  {
    "id": "authority-frontier-reconcile",
    "suite": "authority",
    "module": "ApplicationAuthority",
    "path": "verify/tla/authority/ApplicationAuthority.tla",
    "constants": {
      "Mutation": "\"none\"",
      "Scenario": "\"frontier-reconcile\""
    },
    "specification": "Spec",
    "invariants": [
      "TypeOK",
      "DataCannotMint",
      "HostDenialPreserved",
      "CapturedSource",
      "FreshWriterCurrent",
      "DefaultSelection",
      "DefaultNamespace",
      "ReconcilePinned",
      "ExactCapabilityClass",
      "ExactCapabilityEdge",
      "NoDataCapabilitySource",
      "ActiveRegistryRequired",
      "RequirementNarrowing",
      "DefaultEntryNarrowing",
      "MessageClass",
      "DeliveryEvidenceBound",
      "ChannelEvidenceBound",
      "ChannelIdentityRetained"
    ],
    "properties": [],
    "actions": [
      {
        "action": "SwitchFrontier",
        "property": "NeverSwitchFrontier"
      },
      {
        "action": "CoreDeny",
        "property": "NeverCoreDeny"
      }
    ],
    "bounds": {
      "applications": 2,
      "classes": 2,
      "handles": 3,
      "heads": 2,
      "revisions": 2,
      "memorySymbols": 2,
      "frontiers": 2,
      "attempts": 2,
      "channelIdentities": 2,
      "scenario": "frontier-reconcile"
    },
    "assumptions": [
      "Four finite families fix unmodeled plan/query/serialization fields; independent family completion is not a cross-family source refinement.",
      "Default-host applicability checks consume trusted query results; custom hosts and arbitrary executors remain trusted and observe is not OS isolation.",
      "Capability syntax/class is separate from active registry authority. CAS message evidence is weaker than retained delivery; even full delivery does not admit a destination mailbox or prove an external receiver.",
      "Optional channel publication composes a completed serialized helper; partial publication and production row/byte limits are separate."
    ]
  },
  {
    "id": "authority-cap-exact",
    "suite": "authority",
    "module": "ApplicationAuthority",
    "path": "verify/tla/authority/ApplicationAuthority.tla",
    "constants": {
      "Mutation": "\"none\"",
      "Scenario": "\"cap-exact\""
    },
    "specification": "Spec",
    "invariants": [
      "TypeOK",
      "DataCannotMint",
      "HostDenialPreserved",
      "CapturedSource",
      "FreshWriterCurrent",
      "DefaultSelection",
      "DefaultNamespace",
      "ReconcilePinned",
      "ExactCapabilityClass",
      "ExactCapabilityEdge",
      "NoDataCapabilitySource",
      "ActiveRegistryRequired",
      "RequirementNarrowing",
      "DefaultEntryNarrowing",
      "MessageClass",
      "DeliveryEvidenceBound",
      "ChannelEvidenceBound",
      "ChannelIdentityRetained"
    ],
    "properties": [],
    "actions": [
      {
        "action": "AcceptCap",
        "property": "NeverAcceptCap"
      },
      {
        "action": "ResolveMailbox",
        "property": "NeverResolveMailbox"
      }
    ],
    "bounds": {
      "applications": 2,
      "classes": 2,
      "handles": 3,
      "heads": 2,
      "revisions": 2,
      "memorySymbols": 2,
      "frontiers": 2,
      "attempts": 2,
      "channelIdentities": 2,
      "scenario": "cap-exact"
    },
    "assumptions": [
      "Four finite families fix unmodeled plan/query/serialization fields; independent family completion is not a cross-family source refinement.",
      "Default-host applicability checks consume trusted query results; custom hosts and arbitrary executors remain trusted and observe is not OS isolation.",
      "Capability syntax/class is separate from active registry authority. CAS message evidence is weaker than retained delivery; even full delivery does not admit a destination mailbox or prove an external receiver.",
      "Optional channel publication composes a completed serialized helper; partial publication and production row/byte limits are separate."
    ]
  },
  {
    "id": "authority-cap-class",
    "suite": "authority",
    "module": "ApplicationAuthority",
    "path": "verify/tla/authority/ApplicationAuthority.tla",
    "constants": {
      "Mutation": "\"none\"",
      "Scenario": "\"cap-class\""
    },
    "specification": "Spec",
    "invariants": [
      "TypeOK",
      "DataCannotMint",
      "HostDenialPreserved",
      "CapturedSource",
      "FreshWriterCurrent",
      "DefaultSelection",
      "DefaultNamespace",
      "ReconcilePinned",
      "ExactCapabilityClass",
      "ExactCapabilityEdge",
      "NoDataCapabilitySource",
      "ActiveRegistryRequired",
      "RequirementNarrowing",
      "DefaultEntryNarrowing",
      "MessageClass",
      "DeliveryEvidenceBound",
      "ChannelEvidenceBound",
      "ChannelIdentityRetained"
    ],
    "properties": [],
    "actions": [
      {
        "action": "DenyCap",
        "property": "NeverDenyCap"
      }
    ],
    "bounds": {
      "applications": 2,
      "classes": 2,
      "handles": 3,
      "heads": 2,
      "revisions": 2,
      "memorySymbols": 2,
      "frontiers": 2,
      "attempts": 2,
      "channelIdentities": 2,
      "scenario": "cap-class"
    },
    "assumptions": [
      "Four finite families fix unmodeled plan/query/serialization fields; independent family completion is not a cross-family source refinement.",
      "Default-host applicability checks consume trusted query results; custom hosts and arbitrary executors remain trusted and observe is not OS isolation.",
      "Capability syntax/class is separate from active registry authority. CAS message evidence is weaker than retained delivery; even full delivery does not admit a destination mailbox or prove an external receiver.",
      "Optional channel publication composes a completed serialized helper; partial publication and production row/byte limits are separate."
    ]
  },
  {
    "id": "authority-cap-json",
    "suite": "authority",
    "module": "ApplicationAuthority",
    "path": "verify/tla/authority/ApplicationAuthority.tla",
    "constants": {
      "Mutation": "\"none\"",
      "Scenario": "\"cap-json\""
    },
    "specification": "Spec",
    "invariants": [
      "TypeOK",
      "DataCannotMint",
      "HostDenialPreserved",
      "CapturedSource",
      "FreshWriterCurrent",
      "DefaultSelection",
      "DefaultNamespace",
      "ReconcilePinned",
      "ExactCapabilityClass",
      "ExactCapabilityEdge",
      "NoDataCapabilitySource",
      "ActiveRegistryRequired",
      "RequirementNarrowing",
      "DefaultEntryNarrowing",
      "MessageClass",
      "DeliveryEvidenceBound",
      "ChannelEvidenceBound",
      "ChannelIdentityRetained"
    ],
    "properties": [],
    "actions": [
      {
        "action": "DenyCap",
        "property": "NeverDenyCap"
      }
    ],
    "bounds": {
      "applications": 2,
      "classes": 2,
      "handles": 3,
      "heads": 2,
      "revisions": 2,
      "memorySymbols": 2,
      "frontiers": 2,
      "attempts": 2,
      "channelIdentities": 2,
      "scenario": "cap-json"
    },
    "assumptions": [
      "Four finite families fix unmodeled plan/query/serialization fields; independent family completion is not a cross-family source refinement.",
      "Default-host applicability checks consume trusted query results; custom hosts and arbitrary executors remain trusted and observe is not OS isolation.",
      "Capability syntax/class is separate from active registry authority. CAS message evidence is weaker than retained delivery; even full delivery does not admit a destination mailbox or prove an external receiver.",
      "Optional channel publication composes a completed serialized helper; partial publication and production row/byte limits are separate."
    ]
  },
  {
    "id": "authority-cap-ref",
    "suite": "authority",
    "module": "ApplicationAuthority",
    "path": "verify/tla/authority/ApplicationAuthority.tla",
    "constants": {
      "Mutation": "\"none\"",
      "Scenario": "\"cap-ref\""
    },
    "specification": "Spec",
    "invariants": [
      "TypeOK",
      "DataCannotMint",
      "HostDenialPreserved",
      "CapturedSource",
      "FreshWriterCurrent",
      "DefaultSelection",
      "DefaultNamespace",
      "ReconcilePinned",
      "ExactCapabilityClass",
      "ExactCapabilityEdge",
      "NoDataCapabilitySource",
      "ActiveRegistryRequired",
      "RequirementNarrowing",
      "DefaultEntryNarrowing",
      "MessageClass",
      "DeliveryEvidenceBound",
      "ChannelEvidenceBound",
      "ChannelIdentityRetained"
    ],
    "properties": [],
    "actions": [
      {
        "action": "DenyCap",
        "property": "NeverDenyCap"
      }
    ],
    "bounds": {
      "applications": 2,
      "classes": 2,
      "handles": 3,
      "heads": 2,
      "revisions": 2,
      "memorySymbols": 2,
      "frontiers": 2,
      "attempts": 2,
      "channelIdentities": 2,
      "scenario": "cap-ref"
    },
    "assumptions": [
      "Four finite families fix unmodeled plan/query/serialization fields; independent family completion is not a cross-family source refinement.",
      "Default-host applicability checks consume trusted query results; custom hosts and arbitrary executors remain trusted and observe is not OS isolation.",
      "Capability syntax/class is separate from active registry authority. CAS message evidence is weaker than retained delivery; even full delivery does not admit a destination mailbox or prove an external receiver.",
      "Optional channel publication composes a completed serialized helper; partial publication and production row/byte limits are separate."
    ]
  },
  {
    "id": "authority-cap-const",
    "suite": "authority",
    "module": "ApplicationAuthority",
    "path": "verify/tla/authority/ApplicationAuthority.tla",
    "constants": {
      "Mutation": "\"none\"",
      "Scenario": "\"cap-const\""
    },
    "specification": "Spec",
    "invariants": [
      "TypeOK",
      "DataCannotMint",
      "HostDenialPreserved",
      "CapturedSource",
      "FreshWriterCurrent",
      "DefaultSelection",
      "DefaultNamespace",
      "ReconcilePinned",
      "ExactCapabilityClass",
      "ExactCapabilityEdge",
      "NoDataCapabilitySource",
      "ActiveRegistryRequired",
      "RequirementNarrowing",
      "DefaultEntryNarrowing",
      "MessageClass",
      "DeliveryEvidenceBound",
      "ChannelEvidenceBound",
      "ChannelIdentityRetained"
    ],
    "properties": [],
    "actions": [
      {
        "action": "DenyCap",
        "property": "NeverDenyCap"
      }
    ],
    "bounds": {
      "applications": 2,
      "classes": 2,
      "handles": 3,
      "heads": 2,
      "revisions": 2,
      "memorySymbols": 2,
      "frontiers": 2,
      "attempts": 2,
      "channelIdentities": 2,
      "scenario": "cap-const"
    },
    "assumptions": [
      "Four finite families fix unmodeled plan/query/serialization fields; independent family completion is not a cross-family source refinement.",
      "Default-host applicability checks consume trusted query results; custom hosts and arbitrary executors remain trusted and observe is not OS isolation.",
      "Capability syntax/class is separate from active registry authority. CAS message evidence is weaker than retained delivery; even full delivery does not admit a destination mailbox or prove an external receiver.",
      "Optional channel publication composes a completed serialized helper; partial publication and production row/byte limits are separate."
    ]
  },
  {
    "id": "authority-cap-agent",
    "suite": "authority",
    "module": "ApplicationAuthority",
    "path": "verify/tla/authority/ApplicationAuthority.tla",
    "constants": {
      "Mutation": "\"none\"",
      "Scenario": "\"cap-agent\""
    },
    "specification": "Spec",
    "invariants": [
      "TypeOK",
      "DataCannotMint",
      "HostDenialPreserved",
      "CapturedSource",
      "FreshWriterCurrent",
      "DefaultSelection",
      "DefaultNamespace",
      "ReconcilePinned",
      "ExactCapabilityClass",
      "ExactCapabilityEdge",
      "NoDataCapabilitySource",
      "ActiveRegistryRequired",
      "RequirementNarrowing",
      "DefaultEntryNarrowing",
      "MessageClass",
      "DeliveryEvidenceBound",
      "ChannelEvidenceBound",
      "ChannelIdentityRetained"
    ],
    "properties": [],
    "actions": [
      {
        "action": "DenyCap",
        "property": "NeverDenyCap"
      }
    ],
    "bounds": {
      "applications": 2,
      "classes": 2,
      "handles": 3,
      "heads": 2,
      "revisions": 2,
      "memorySymbols": 2,
      "frontiers": 2,
      "attempts": 2,
      "channelIdentities": 2,
      "scenario": "cap-agent"
    },
    "assumptions": [
      "Four finite families fix unmodeled plan/query/serialization fields; independent family completion is not a cross-family source refinement.",
      "Default-host applicability checks consume trusted query results; custom hosts and arbitrary executors remain trusted and observe is not OS isolation.",
      "Capability syntax/class is separate from active registry authority. CAS message evidence is weaker than retained delivery; even full delivery does not admit a destination mailbox or prove an external receiver.",
      "Optional channel publication composes a completed serialized helper; partial publication and production row/byte limits are separate."
    ]
  },
  {
    "id": "authority-cap-unregistered",
    "suite": "authority",
    "module": "ApplicationAuthority",
    "path": "verify/tla/authority/ApplicationAuthority.tla",
    "constants": {
      "Mutation": "\"none\"",
      "Scenario": "\"cap-unregistered\""
    },
    "specification": "Spec",
    "invariants": [
      "TypeOK",
      "DataCannotMint",
      "HostDenialPreserved",
      "CapturedSource",
      "FreshWriterCurrent",
      "DefaultSelection",
      "DefaultNamespace",
      "ReconcilePinned",
      "ExactCapabilityClass",
      "ExactCapabilityEdge",
      "NoDataCapabilitySource",
      "ActiveRegistryRequired",
      "RequirementNarrowing",
      "DefaultEntryNarrowing",
      "MessageClass",
      "DeliveryEvidenceBound",
      "ChannelEvidenceBound",
      "ChannelIdentityRetained"
    ],
    "properties": [],
    "actions": [
      {
        "action": "AcceptCap",
        "property": "NeverAcceptCap"
      },
      {
        "action": "DenyResolution",
        "property": "NeverDenyResolution"
      }
    ],
    "bounds": {
      "applications": 2,
      "classes": 2,
      "handles": 3,
      "heads": 2,
      "revisions": 2,
      "memorySymbols": 2,
      "frontiers": 2,
      "attempts": 2,
      "channelIdentities": 2,
      "scenario": "cap-unregistered"
    },
    "assumptions": [
      "Four finite families fix unmodeled plan/query/serialization fields; independent family completion is not a cross-family source refinement.",
      "Default-host applicability checks consume trusted query results; custom hosts and arbitrary executors remain trusted and observe is not OS isolation.",
      "Capability syntax/class is separate from active registry authority. CAS message evidence is weaker than retained delivery; even full delivery does not admit a destination mailbox or prove an external receiver.",
      "Optional channel publication composes a completed serialized helper; partial publication and production row/byte limits are separate."
    ]
  },
  {
    "id": "authority-cap-revoked",
    "suite": "authority",
    "module": "ApplicationAuthority",
    "path": "verify/tla/authority/ApplicationAuthority.tla",
    "constants": {
      "Mutation": "\"none\"",
      "Scenario": "\"cap-revoked\""
    },
    "specification": "Spec",
    "invariants": [
      "TypeOK",
      "DataCannotMint",
      "HostDenialPreserved",
      "CapturedSource",
      "FreshWriterCurrent",
      "DefaultSelection",
      "DefaultNamespace",
      "ReconcilePinned",
      "ExactCapabilityClass",
      "ExactCapabilityEdge",
      "NoDataCapabilitySource",
      "ActiveRegistryRequired",
      "RequirementNarrowing",
      "DefaultEntryNarrowing",
      "MessageClass",
      "DeliveryEvidenceBound",
      "ChannelEvidenceBound",
      "ChannelIdentityRetained"
    ],
    "properties": [],
    "actions": [
      {
        "action": "AcceptCap",
        "property": "NeverAcceptCap"
      },
      {
        "action": "DenyResolution",
        "property": "NeverDenyResolution"
      }
    ],
    "bounds": {
      "applications": 2,
      "classes": 2,
      "handles": 3,
      "heads": 2,
      "revisions": 2,
      "memorySymbols": 2,
      "frontiers": 2,
      "attempts": 2,
      "channelIdentities": 2,
      "scenario": "cap-revoked"
    },
    "assumptions": [
      "Four finite families fix unmodeled plan/query/serialization fields; independent family completion is not a cross-family source refinement.",
      "Default-host applicability checks consume trusted query results; custom hosts and arbitrary executors remain trusted and observe is not OS isolation.",
      "Capability syntax/class is separate from active registry authority. CAS message evidence is weaker than retained delivery; even full delivery does not admit a destination mailbox or prove an external receiver.",
      "Optional channel publication composes a completed serialized helper; partial publication and production row/byte limits are separate."
    ]
  },
  {
    "id": "authority-cap-evidence",
    "suite": "authority",
    "module": "ApplicationAuthority",
    "path": "verify/tla/authority/ApplicationAuthority.tla",
    "constants": {
      "Mutation": "\"none\"",
      "Scenario": "\"cap-evidence\""
    },
    "specification": "Spec",
    "invariants": [
      "TypeOK",
      "DataCannotMint",
      "HostDenialPreserved",
      "CapturedSource",
      "FreshWriterCurrent",
      "DefaultSelection",
      "DefaultNamespace",
      "ReconcilePinned",
      "ExactCapabilityClass",
      "ExactCapabilityEdge",
      "NoDataCapabilitySource",
      "ActiveRegistryRequired",
      "RequirementNarrowing",
      "DefaultEntryNarrowing",
      "MessageClass",
      "DeliveryEvidenceBound",
      "ChannelEvidenceBound",
      "ChannelIdentityRetained"
    ],
    "properties": [],
    "actions": [
      {
        "action": "ReceiveModelData",
        "property": "NeverReceiveModelData"
      }
    ],
    "bounds": {
      "applications": 2,
      "classes": 2,
      "handles": 3,
      "heads": 2,
      "revisions": 2,
      "memorySymbols": 2,
      "frontiers": 2,
      "attempts": 2,
      "channelIdentities": 2,
      "scenario": "cap-evidence"
    },
    "assumptions": [
      "Four finite families fix unmodeled plan/query/serialization fields; independent family completion is not a cross-family source refinement.",
      "Default-host applicability checks consume trusted query results; custom hosts and arbitrary executors remain trusted and observe is not OS isolation.",
      "Capability syntax/class is separate from active registry authority. CAS message evidence is weaker than retained delivery; even full delivery does not admit a destination mailbox or prove an external receiver.",
      "Optional channel publication composes a completed serialized helper; partial publication and production row/byte limits are separate."
    ]
  },
  {
    "id": "authority-revision-base",
    "suite": "authority",
    "module": "ApplicationAuthority",
    "path": "verify/tla/authority/ApplicationAuthority.tla",
    "constants": {
      "Mutation": "\"none\"",
      "Scenario": "\"revision-base\""
    },
    "specification": "Spec",
    "invariants": [
      "TypeOK",
      "DataCannotMint",
      "HostDenialPreserved",
      "CapturedSource",
      "FreshWriterCurrent",
      "DefaultSelection",
      "DefaultNamespace",
      "ReconcilePinned",
      "ExactCapabilityClass",
      "ExactCapabilityEdge",
      "NoDataCapabilitySource",
      "ActiveRegistryRequired",
      "RequirementNarrowing",
      "DefaultEntryNarrowing",
      "MessageClass",
      "DeliveryEvidenceBound",
      "ChannelEvidenceBound",
      "ChannelIdentityRetained"
    ],
    "properties": [],
    "actions": [
      {
        "action": "AcceptRevision",
        "property": "NeverAcceptRevision"
      }
    ],
    "bounds": {
      "applications": 2,
      "classes": 2,
      "handles": 3,
      "heads": 2,
      "revisions": 2,
      "memorySymbols": 2,
      "frontiers": 2,
      "attempts": 2,
      "channelIdentities": 2,
      "scenario": "revision-base"
    },
    "assumptions": [
      "Four finite families fix unmodeled plan/query/serialization fields; independent family completion is not a cross-family source refinement.",
      "Default-host applicability checks consume trusted query results; custom hosts and arbitrary executors remain trusted and observe is not OS isolation.",
      "Capability syntax/class is separate from active registry authority. CAS message evidence is weaker than retained delivery; even full delivery does not admit a destination mailbox or prove an external receiver.",
      "Optional channel publication composes a completed serialized helper; partial publication and production row/byte limits are separate."
    ]
  },
  {
    "id": "authority-revision-custom-widen",
    "suite": "authority",
    "module": "ApplicationAuthority",
    "path": "verify/tla/authority/ApplicationAuthority.tla",
    "constants": {
      "Mutation": "\"none\"",
      "Scenario": "\"revision-custom-widen\""
    },
    "specification": "Spec",
    "invariants": [
      "TypeOK",
      "DataCannotMint",
      "HostDenialPreserved",
      "CapturedSource",
      "FreshWriterCurrent",
      "DefaultSelection",
      "DefaultNamespace",
      "ReconcilePinned",
      "ExactCapabilityClass",
      "ExactCapabilityEdge",
      "NoDataCapabilitySource",
      "ActiveRegistryRequired",
      "RequirementNarrowing",
      "DefaultEntryNarrowing",
      "MessageClass",
      "DeliveryEvidenceBound",
      "ChannelEvidenceBound",
      "ChannelIdentityRetained"
    ],
    "properties": [],
    "actions": [
      {
        "action": "AcceptRevision",
        "property": "NeverAcceptRevision"
      }
    ],
    "bounds": {
      "applications": 2,
      "classes": 2,
      "handles": 3,
      "heads": 2,
      "revisions": 2,
      "memorySymbols": 2,
      "frontiers": 2,
      "attempts": 2,
      "channelIdentities": 2,
      "scenario": "revision-custom-widen"
    },
    "assumptions": [
      "Four finite families fix unmodeled plan/query/serialization fields; independent family completion is not a cross-family source refinement.",
      "Default-host applicability checks consume trusted query results; custom hosts and arbitrary executors remain trusted and observe is not OS isolation.",
      "Capability syntax/class is separate from active registry authority. CAS message evidence is weaker than retained delivery; even full delivery does not admit a destination mailbox or prove an external receiver.",
      "Optional channel publication composes a completed serialized helper; partial publication and production row/byte limits are separate."
    ]
  },
  {
    "id": "authority-revision-entry-widen",
    "suite": "authority",
    "module": "ApplicationAuthority",
    "path": "verify/tla/authority/ApplicationAuthority.tla",
    "constants": {
      "Mutation": "\"none\"",
      "Scenario": "\"revision-entry-widen\""
    },
    "specification": "Spec",
    "invariants": [
      "TypeOK",
      "DataCannotMint",
      "HostDenialPreserved",
      "CapturedSource",
      "FreshWriterCurrent",
      "DefaultSelection",
      "DefaultNamespace",
      "ReconcilePinned",
      "ExactCapabilityClass",
      "ExactCapabilityEdge",
      "NoDataCapabilitySource",
      "ActiveRegistryRequired",
      "RequirementNarrowing",
      "DefaultEntryNarrowing",
      "MessageClass",
      "DeliveryEvidenceBound",
      "ChannelEvidenceBound",
      "ChannelIdentityRetained"
    ],
    "properties": [],
    "actions": [
      {
        "action": "DenyRevision",
        "property": "NeverDenyRevision"
      }
    ],
    "bounds": {
      "applications": 2,
      "classes": 2,
      "handles": 3,
      "heads": 2,
      "revisions": 2,
      "memorySymbols": 2,
      "frontiers": 2,
      "attempts": 2,
      "channelIdentities": 2,
      "scenario": "revision-entry-widen"
    },
    "assumptions": [
      "Four finite families fix unmodeled plan/query/serialization fields; independent family completion is not a cross-family source refinement.",
      "Default-host applicability checks consume trusted query results; custom hosts and arbitrary executors remain trusted and observe is not OS isolation.",
      "Capability syntax/class is separate from active registry authority. CAS message evidence is weaker than retained delivery; even full delivery does not admit a destination mailbox or prove an external receiver.",
      "Optional channel publication composes a completed serialized helper; partial publication and production row/byte limits are separate."
    ]
  },
  {
    "id": "authority-revision-budget",
    "suite": "authority",
    "module": "ApplicationAuthority",
    "path": "verify/tla/authority/ApplicationAuthority.tla",
    "constants": {
      "Mutation": "\"none\"",
      "Scenario": "\"revision-budget\""
    },
    "specification": "Spec",
    "invariants": [
      "TypeOK",
      "DataCannotMint",
      "HostDenialPreserved",
      "CapturedSource",
      "FreshWriterCurrent",
      "DefaultSelection",
      "DefaultNamespace",
      "ReconcilePinned",
      "ExactCapabilityClass",
      "ExactCapabilityEdge",
      "NoDataCapabilitySource",
      "ActiveRegistryRequired",
      "RequirementNarrowing",
      "DefaultEntryNarrowing",
      "MessageClass",
      "DeliveryEvidenceBound",
      "ChannelEvidenceBound",
      "ChannelIdentityRetained"
    ],
    "properties": [],
    "actions": [
      {
        "action": "DenyRevision",
        "property": "NeverDenyRevision"
      }
    ],
    "bounds": {
      "applications": 2,
      "classes": 2,
      "handles": 3,
      "heads": 2,
      "revisions": 2,
      "memorySymbols": 2,
      "frontiers": 2,
      "attempts": 2,
      "channelIdentities": 2,
      "scenario": "revision-budget"
    },
    "assumptions": [
      "Four finite families fix unmodeled plan/query/serialization fields; independent family completion is not a cross-family source refinement.",
      "Default-host applicability checks consume trusted query results; custom hosts and arbitrary executors remain trusted and observe is not OS isolation.",
      "Capability syntax/class is separate from active registry authority. CAS message evidence is weaker than retained delivery; even full delivery does not admit a destination mailbox or prove an external receiver.",
      "Optional channel publication composes a completed serialized helper; partial publication and production row/byte limits are separate."
    ]
  },
  {
    "id": "authority-revision-requirement-widen",
    "suite": "authority",
    "module": "ApplicationAuthority",
    "path": "verify/tla/authority/ApplicationAuthority.tla",
    "constants": {
      "Mutation": "\"none\"",
      "Scenario": "\"revision-requirement-widen\""
    },
    "specification": "Spec",
    "invariants": [
      "TypeOK",
      "DataCannotMint",
      "HostDenialPreserved",
      "CapturedSource",
      "FreshWriterCurrent",
      "DefaultSelection",
      "DefaultNamespace",
      "ReconcilePinned",
      "ExactCapabilityClass",
      "ExactCapabilityEdge",
      "NoDataCapabilitySource",
      "ActiveRegistryRequired",
      "RequirementNarrowing",
      "DefaultEntryNarrowing",
      "MessageClass",
      "DeliveryEvidenceBound",
      "ChannelEvidenceBound",
      "ChannelIdentityRetained"
    ],
    "properties": [],
    "actions": [
      {
        "action": "DenyRevision",
        "property": "NeverDenyRevision"
      }
    ],
    "bounds": {
      "applications": 2,
      "classes": 2,
      "handles": 3,
      "heads": 2,
      "revisions": 2,
      "memorySymbols": 2,
      "frontiers": 2,
      "attempts": 2,
      "channelIdentities": 2,
      "scenario": "revision-requirement-widen"
    },
    "assumptions": [
      "Four finite families fix unmodeled plan/query/serialization fields; independent family completion is not a cross-family source refinement.",
      "Default-host applicability checks consume trusted query results; custom hosts and arbitrary executors remain trusted and observe is not OS isolation.",
      "Capability syntax/class is separate from active registry authority. CAS message evidence is weaker than retained delivery; even full delivery does not admit a destination mailbox or prove an external receiver.",
      "Optional channel publication composes a completed serialized helper; partial publication and production row/byte limits are separate."
    ]
  },
  {
    "id": "authority-message-orphan",
    "suite": "authority",
    "module": "ApplicationAuthority",
    "path": "verify/tla/authority/ApplicationAuthority.tla",
    "constants": {
      "Mutation": "\"none\"",
      "Scenario": "\"message-orphan\""
    },
    "specification": "Spec",
    "invariants": [
      "TypeOK",
      "DataCannotMint",
      "HostDenialPreserved",
      "CapturedSource",
      "FreshWriterCurrent",
      "DefaultSelection",
      "DefaultNamespace",
      "ReconcilePinned",
      "ExactCapabilityClass",
      "ExactCapabilityEdge",
      "NoDataCapabilitySource",
      "ActiveRegistryRequired",
      "RequirementNarrowing",
      "DefaultEntryNarrowing",
      "MessageClass",
      "DeliveryEvidenceBound",
      "ChannelEvidenceBound",
      "ChannelIdentityRetained"
    ],
    "properties": [],
    "actions": [
      {
        "action": "VerifyMessageCAS",
        "property": "NeverCASWithoutSettlement"
      },
      {
        "action": "DenyDelivery",
        "property": "NeverDenyDelivery"
      }
    ],
    "bounds": {
      "applications": 2,
      "classes": 2,
      "handles": 3,
      "heads": 2,
      "revisions": 2,
      "memorySymbols": 2,
      "frontiers": 2,
      "attempts": 2,
      "channelIdentities": 2,
      "scenario": "message-orphan"
    },
    "assumptions": [
      "Four finite families fix unmodeled plan/query/serialization fields; independent family completion is not a cross-family source refinement.",
      "Default-host applicability checks consume trusted query results; custom hosts and arbitrary executors remain trusted and observe is not OS isolation.",
      "Capability syntax/class is separate from active registry authority. CAS message evidence is weaker than retained delivery; even full delivery does not admit a destination mailbox or prove an external receiver.",
      "Optional channel publication composes a completed serialized helper; partial publication and production row/byte limits are separate."
    ]
  },
  {
    "id": "authority-message-pending",
    "suite": "authority",
    "module": "ApplicationAuthority",
    "path": "verify/tla/authority/ApplicationAuthority.tla",
    "constants": {
      "Mutation": "\"none\"",
      "Scenario": "\"message-pending\""
    },
    "specification": "Spec",
    "invariants": [
      "TypeOK",
      "DataCannotMint",
      "HostDenialPreserved",
      "CapturedSource",
      "FreshWriterCurrent",
      "DefaultSelection",
      "DefaultNamespace",
      "ReconcilePinned",
      "ExactCapabilityClass",
      "ExactCapabilityEdge",
      "NoDataCapabilitySource",
      "ActiveRegistryRequired",
      "RequirementNarrowing",
      "DefaultEntryNarrowing",
      "MessageClass",
      "DeliveryEvidenceBound",
      "ChannelEvidenceBound",
      "ChannelIdentityRetained"
    ],
    "properties": [],
    "actions": [
      {
        "action": "VerifyMessageCAS",
        "property": "NeverCASWithoutSettlement"
      },
      {
        "action": "DenyDelivery",
        "property": "NeverDenyDelivery"
      }
    ],
    "bounds": {
      "applications": 2,
      "classes": 2,
      "handles": 3,
      "heads": 2,
      "revisions": 2,
      "memorySymbols": 2,
      "frontiers": 2,
      "attempts": 2,
      "channelIdentities": 2,
      "scenario": "message-pending"
    },
    "assumptions": [
      "Four finite families fix unmodeled plan/query/serialization fields; independent family completion is not a cross-family source refinement.",
      "Default-host applicability checks consume trusted query results; custom hosts and arbitrary executors remain trusted and observe is not OS isolation.",
      "Capability syntax/class is separate from active registry authority. CAS message evidence is weaker than retained delivery; even full delivery does not admit a destination mailbox or prove an external receiver.",
      "Optional channel publication composes a completed serialized helper; partial publication and production row/byte limits are separate."
    ]
  },
  {
    "id": "authority-message-valid",
    "suite": "authority",
    "module": "ApplicationAuthority",
    "path": "verify/tla/authority/ApplicationAuthority.tla",
    "constants": {
      "Mutation": "\"none\"",
      "Scenario": "\"message-valid\""
    },
    "specification": "Spec",
    "invariants": [
      "TypeOK",
      "DataCannotMint",
      "HostDenialPreserved",
      "CapturedSource",
      "FreshWriterCurrent",
      "DefaultSelection",
      "DefaultNamespace",
      "ReconcilePinned",
      "ExactCapabilityClass",
      "ExactCapabilityEdge",
      "NoDataCapabilitySource",
      "ActiveRegistryRequired",
      "RequirementNarrowing",
      "DefaultEntryNarrowing",
      "MessageClass",
      "DeliveryEvidenceBound",
      "ChannelEvidenceBound",
      "ChannelIdentityRetained"
    ],
    "properties": [],
    "actions": [
      {
        "action": "ParseMessage",
        "property": "NeverParseMessage"
      },
      {
        "action": "VerifyDelivery",
        "property": "NeverVerifyDelivery"
      }
    ],
    "bounds": {
      "applications": 2,
      "classes": 2,
      "handles": 3,
      "heads": 2,
      "revisions": 2,
      "memorySymbols": 2,
      "frontiers": 2,
      "attempts": 2,
      "channelIdentities": 2,
      "scenario": "message-valid"
    },
    "assumptions": [
      "Four finite families fix unmodeled plan/query/serialization fields; independent family completion is not a cross-family source refinement.",
      "Default-host applicability checks consume trusted query results; custom hosts and arbitrary executors remain trusted and observe is not OS isolation.",
      "Capability syntax/class is separate from active registry authority. CAS message evidence is weaker than retained delivery; even full delivery does not admit a destination mailbox or prove an external receiver.",
      "Optional channel publication composes a completed serialized helper; partial publication and production row/byte limits are separate."
    ]
  },
  {
    "id": "authority-message-recipient",
    "suite": "authority",
    "module": "ApplicationAuthority",
    "path": "verify/tla/authority/ApplicationAuthority.tla",
    "constants": {
      "Mutation": "\"none\"",
      "Scenario": "\"message-recipient\""
    },
    "specification": "Spec",
    "invariants": [
      "TypeOK",
      "DataCannotMint",
      "HostDenialPreserved",
      "CapturedSource",
      "FreshWriterCurrent",
      "DefaultSelection",
      "DefaultNamespace",
      "ReconcilePinned",
      "ExactCapabilityClass",
      "ExactCapabilityEdge",
      "NoDataCapabilitySource",
      "ActiveRegistryRequired",
      "RequirementNarrowing",
      "DefaultEntryNarrowing",
      "MessageClass",
      "DeliveryEvidenceBound",
      "ChannelEvidenceBound",
      "ChannelIdentityRetained"
    ],
    "properties": [],
    "actions": [
      {
        "action": "VerifyMessageCAS",
        "property": "NeverCASForgedRecipient"
      },
      {
        "action": "DenyDelivery",
        "property": "NeverDenyDelivery"
      }
    ],
    "bounds": {
      "applications": 2,
      "classes": 2,
      "handles": 3,
      "heads": 2,
      "revisions": 2,
      "memorySymbols": 2,
      "frontiers": 2,
      "attempts": 2,
      "channelIdentities": 2,
      "scenario": "message-recipient"
    },
    "assumptions": [
      "Four finite families fix unmodeled plan/query/serialization fields; independent family completion is not a cross-family source refinement.",
      "Default-host applicability checks consume trusted query results; custom hosts and arbitrary executors remain trusted and observe is not OS isolation.",
      "Capability syntax/class is separate from active registry authority. CAS message evidence is weaker than retained delivery; even full delivery does not admit a destination mailbox or prove an external receiver.",
      "Optional channel publication composes a completed serialized helper; partial publication and production row/byte limits are separate."
    ]
  },
  {
    "id": "authority-message-wrong-class",
    "suite": "authority",
    "module": "ApplicationAuthority",
    "path": "verify/tla/authority/ApplicationAuthority.tla",
    "constants": {
      "Mutation": "\"none\"",
      "Scenario": "\"message-wrong-class\""
    },
    "specification": "Spec",
    "invariants": [
      "TypeOK",
      "DataCannotMint",
      "HostDenialPreserved",
      "CapturedSource",
      "FreshWriterCurrent",
      "DefaultSelection",
      "DefaultNamespace",
      "ReconcilePinned",
      "ExactCapabilityClass",
      "ExactCapabilityEdge",
      "NoDataCapabilitySource",
      "ActiveRegistryRequired",
      "RequirementNarrowing",
      "DefaultEntryNarrowing",
      "MessageClass",
      "DeliveryEvidenceBound",
      "ChannelEvidenceBound",
      "ChannelIdentityRetained"
    ],
    "properties": [],
    "actions": [
      {
        "action": "DenyMessageClass",
        "property": "NeverDenyMessageClass"
      }
    ],
    "bounds": {
      "applications": 2,
      "classes": 2,
      "handles": 3,
      "heads": 2,
      "revisions": 2,
      "memorySymbols": 2,
      "frontiers": 2,
      "attempts": 2,
      "channelIdentities": 2,
      "scenario": "message-wrong-class"
    },
    "assumptions": [
      "Four finite families fix unmodeled plan/query/serialization fields; independent family completion is not a cross-family source refinement.",
      "Default-host applicability checks consume trusted query results; custom hosts and arbitrary executors remain trusted and observe is not OS isolation.",
      "Capability syntax/class is separate from active registry authority. CAS message evidence is weaker than retained delivery; even full delivery does not admit a destination mailbox or prove an external receiver.",
      "Optional channel publication composes a completed serialized helper; partial publication and production row/byte limits are separate."
    ]
  },
  {
    "id": "authority-message-channel",
    "suite": "authority",
    "module": "ApplicationAuthority",
    "path": "verify/tla/authority/ApplicationAuthority.tla",
    "constants": {
      "Mutation": "\"none\"",
      "Scenario": "\"message-channel\""
    },
    "specification": "Spec",
    "invariants": [
      "TypeOK",
      "DataCannotMint",
      "HostDenialPreserved",
      "CapturedSource",
      "FreshWriterCurrent",
      "DefaultSelection",
      "DefaultNamespace",
      "ReconcilePinned",
      "ExactCapabilityClass",
      "ExactCapabilityEdge",
      "NoDataCapabilitySource",
      "ActiveRegistryRequired",
      "RequirementNarrowing",
      "DefaultEntryNarrowing",
      "MessageClass",
      "DeliveryEvidenceBound",
      "ChannelEvidenceBound",
      "ChannelIdentityRetained"
    ],
    "properties": [],
    "actions": [
      {
        "action": "VerifyDelivery",
        "property": "NeverVerifyDelivery"
      }
    ],
    "bounds": {
      "applications": 2,
      "classes": 2,
      "handles": 3,
      "heads": 2,
      "revisions": 2,
      "memorySymbols": 2,
      "frontiers": 2,
      "attempts": 2,
      "channelIdentities": 2,
      "scenario": "message-channel"
    },
    "assumptions": [
      "Four finite families fix unmodeled plan/query/serialization fields; independent family completion is not a cross-family source refinement.",
      "Default-host applicability checks consume trusted query results; custom hosts and arbitrary executors remain trusted and observe is not OS isolation.",
      "Capability syntax/class is separate from active registry authority. CAS message evidence is weaker than retained delivery; even full delivery does not admit a destination mailbox or prove an external receiver.",
      "Optional channel publication composes a completed serialized helper; partial publication and production row/byte limits are separate."
    ]
  },
  {
    "id": "authority-message-channel-mismatch",
    "suite": "authority",
    "module": "ApplicationAuthority",
    "path": "verify/tla/authority/ApplicationAuthority.tla",
    "constants": {
      "Mutation": "\"none\"",
      "Scenario": "\"message-channel-mismatch\""
    },
    "specification": "Spec",
    "invariants": [
      "TypeOK",
      "DataCannotMint",
      "HostDenialPreserved",
      "CapturedSource",
      "FreshWriterCurrent",
      "DefaultSelection",
      "DefaultNamespace",
      "ReconcilePinned",
      "ExactCapabilityClass",
      "ExactCapabilityEdge",
      "NoDataCapabilitySource",
      "ActiveRegistryRequired",
      "RequirementNarrowing",
      "DefaultEntryNarrowing",
      "MessageClass",
      "DeliveryEvidenceBound",
      "ChannelEvidenceBound",
      "ChannelIdentityRetained"
    ],
    "properties": [],
    "actions": [
      {
        "action": "DenyDelivery",
        "property": "NeverDenyDelivery"
      }
    ],
    "bounds": {
      "applications": 2,
      "classes": 2,
      "handles": 3,
      "heads": 2,
      "revisions": 2,
      "memorySymbols": 2,
      "frontiers": 2,
      "attempts": 2,
      "channelIdentities": 2,
      "scenario": "message-channel-mismatch"
    },
    "assumptions": [
      "Four finite families fix unmodeled plan/query/serialization fields; independent family completion is not a cross-family source refinement.",
      "Default-host applicability checks consume trusted query results; custom hosts and arbitrary executors remain trusted and observe is not OS isolation.",
      "Capability syntax/class is separate from active registry authority. CAS message evidence is weaker than retained delivery; even full delivery does not admit a destination mailbox or prove an external receiver.",
      "Optional channel publication composes a completed serialized helper; partial publication and production row/byte limits are separate."
    ]
  },
  {
    "id": "authority-message-unregistered-destination",
    "suite": "authority",
    "module": "ApplicationAuthority",
    "path": "verify/tla/authority/ApplicationAuthority.tla",
    "constants": {
      "Mutation": "\"none\"",
      "Scenario": "\"message-unregistered-destination\""
    },
    "specification": "Spec",
    "invariants": [
      "TypeOK",
      "DataCannotMint",
      "HostDenialPreserved",
      "CapturedSource",
      "FreshWriterCurrent",
      "DefaultSelection",
      "DefaultNamespace",
      "ReconcilePinned",
      "ExactCapabilityClass",
      "ExactCapabilityEdge",
      "NoDataCapabilitySource",
      "ActiveRegistryRequired",
      "RequirementNarrowing",
      "DefaultEntryNarrowing",
      "MessageClass",
      "DeliveryEvidenceBound",
      "ChannelEvidenceBound",
      "ChannelIdentityRetained"
    ],
    "properties": [],
    "actions": [
      {
        "action": "VerifyDelivery",
        "property": "NeverDeliveryUnregistered"
      }
    ],
    "bounds": {
      "applications": 2,
      "classes": 2,
      "handles": 3,
      "heads": 2,
      "revisions": 2,
      "memorySymbols": 2,
      "frontiers": 2,
      "attempts": 2,
      "channelIdentities": 2,
      "scenario": "message-unregistered-destination"
    },
    "assumptions": [
      "Four finite families fix unmodeled plan/query/serialization fields; independent family completion is not a cross-family source refinement.",
      "Default-host applicability checks consume trusted query results; custom hosts and arbitrary executors remain trusted and observe is not OS isolation.",
      "Capability syntax/class is separate from active registry authority. CAS message evidence is weaker than retained delivery; even full delivery does not admit a destination mailbox or prove an external receiver.",
      "Optional channel publication composes a completed serialized helper; partial publication and production row/byte limits are separate."
    ]
  },
  {
    "id": "authority-message-revoked-destination",
    "suite": "authority",
    "module": "ApplicationAuthority",
    "path": "verify/tla/authority/ApplicationAuthority.tla",
    "constants": {
      "Mutation": "\"none\"",
      "Scenario": "\"message-revoked-destination\""
    },
    "specification": "Spec",
    "invariants": [
      "TypeOK",
      "DataCannotMint",
      "HostDenialPreserved",
      "CapturedSource",
      "FreshWriterCurrent",
      "DefaultSelection",
      "DefaultNamespace",
      "ReconcilePinned",
      "ExactCapabilityClass",
      "ExactCapabilityEdge",
      "NoDataCapabilitySource",
      "ActiveRegistryRequired",
      "RequirementNarrowing",
      "DefaultEntryNarrowing",
      "MessageClass",
      "DeliveryEvidenceBound",
      "ChannelEvidenceBound",
      "ChannelIdentityRetained"
    ],
    "properties": [],
    "actions": [
      {
        "action": "VerifyDelivery",
        "property": "NeverDeliveryRevoked"
      }
    ],
    "bounds": {
      "applications": 2,
      "classes": 2,
      "handles": 3,
      "heads": 2,
      "revisions": 2,
      "memorySymbols": 2,
      "frontiers": 2,
      "attempts": 2,
      "channelIdentities": 2,
      "scenario": "message-revoked-destination"
    },
    "assumptions": [
      "Four finite families fix unmodeled plan/query/serialization fields; independent family completion is not a cross-family source refinement.",
      "Default-host applicability checks consume trusted query results; custom hosts and arbitrary executors remain trusted and observe is not OS isolation.",
      "Capability syntax/class is separate from active registry authority. CAS message evidence is weaker than retained delivery; even full delivery does not admit a destination mailbox or prove an external receiver.",
      "Optional channel publication composes a completed serialized helper; partial publication and production row/byte limits are separate."
    ]
  },
  {
    "id": "authority-message-two-identities",
    "suite": "authority",
    "module": "ApplicationAuthority",
    "path": "verify/tla/authority/ApplicationAuthority.tla",
    "constants": {
      "Mutation": "\"none\"",
      "Scenario": "\"message-two-identities\""
    },
    "specification": "Spec",
    "invariants": [
      "TypeOK",
      "DataCannotMint",
      "HostDenialPreserved",
      "CapturedSource",
      "FreshWriterCurrent",
      "DefaultSelection",
      "DefaultNamespace",
      "ReconcilePinned",
      "ExactCapabilityClass",
      "ExactCapabilityEdge",
      "NoDataCapabilitySource",
      "ActiveRegistryRequired",
      "RequirementNarrowing",
      "DefaultEntryNarrowing",
      "MessageClass",
      "DeliveryEvidenceBound",
      "ChannelEvidenceBound",
      "ChannelIdentityRetained"
    ],
    "properties": [],
    "actions": [
      {
        "action": "AddChannelIdentity",
        "property": "NeverBothIdentities"
      },
      {
        "action": "VerifyDelivery",
        "property": "NeverVerifyDelivery"
      }
    ],
    "bounds": {
      "applications": 2,
      "classes": 2,
      "handles": 3,
      "heads": 2,
      "revisions": 2,
      "memorySymbols": 2,
      "frontiers": 2,
      "attempts": 2,
      "channelIdentities": 2,
      "scenario": "message-two-identities"
    },
    "assumptions": [
      "Four finite families fix unmodeled plan/query/serialization fields; independent family completion is not a cross-family source refinement.",
      "Default-host applicability checks consume trusted query results; custom hosts and arbitrary executors remain trusted and observe is not OS isolation.",
      "Capability syntax/class is separate from active registry authority. CAS message evidence is weaker than retained delivery; even full delivery does not admit a destination mailbox or prove an external receiver.",
      "Optional channel publication composes a completed serialized helper; partial publication and production row/byte limits are separate."
    ]
  },
  {
    "id": "authority-progress",
    "suite": "authority",
    "module": "ApplicationAuthority",
    "path": "verify/tla/authority/ApplicationAuthority.tla",
    "constants": {
      "Mutation": "\"none\"",
      "Scenario": "\"progress\""
    },
    "specification": "FairSpec",
    "invariants": [
      "TypeOK",
      "DataCannotMint",
      "HostDenialPreserved",
      "CapturedSource",
      "FreshWriterCurrent",
      "DefaultSelection",
      "DefaultNamespace",
      "ReconcilePinned",
      "ExactCapabilityClass",
      "ExactCapabilityEdge",
      "NoDataCapabilitySource",
      "ActiveRegistryRequired",
      "RequirementNarrowing",
      "DefaultEntryNarrowing",
      "MessageClass",
      "DeliveryEvidenceBound",
      "ChannelEvidenceBound",
      "ChannelIdentityRetained"
    ],
    "properties": [
      "EventuallyReturned"
    ],
    "actions": [
      {
        "action": "Invoke",
        "property": "NeverInvoke"
      }
    ],
    "bounds": {
      "applications": 2,
      "classes": 2,
      "handles": 3,
      "heads": 2,
      "revisions": 2,
      "memorySymbols": 2,
      "frontiers": 2,
      "attempts": 2,
      "channelIdentities": 2,
      "scenario": "progress"
    },
    "assumptions": [
      "Four finite families fix unmodeled plan/query/serialization fields; independent family completion is not a cross-family source refinement.",
      "Default-host applicability checks consume trusted query results; custom hosts and arbitrary executors remain trusted and observe is not OS isolation.",
      "Capability syntax/class is separate from active registry authority. CAS message evidence is weaker than retained delivery; even full delivery does not admit a destination mailbox or prove an external receiver.",
      "Optional channel publication composes a completed serialized helper; partial publication and production row/byte limits are separate.",
      "Weak fairness of the declared progressing steps; return includes denial and does not imply external success."
    ]
  }
];

export const AUTHORITY_MUTATIONS: ModelMutation[] = [
  {
    "id": "authority-data-mints",
    "base": "authority-cap-evidence",
    "mutation": "evidence-mints",
    "property": "DataCannotMint",
    "kind": "invariant"
  },
  {
    "id": "authority-ignore-denial",
    "base": "authority-host-denial",
    "mutation": "ignore-host-denial",
    "property": "HostDenialPreserved",
    "kind": "invariant"
  },
  {
    "id": "authority-old-default-source",
    "base": "authority-default-stale-observe",
    "mutation": "skip-default-selected",
    "property": "DefaultSelection",
    "kind": "invariant"
  },
  {
    "id": "authority-unbound-source",
    "base": "authority-custom-plan-drift",
    "mutation": "skip-source-binding",
    "property": "CapturedSource",
    "kind": "invariant"
  },
  {
    "id": "authority-old-writer",
    "base": "authority-same-pair-writer",
    "mutation": "stale-writer",
    "property": "FreshWriterCurrent",
    "kind": "invariant"
  },
  {
    "id": "authority-new-reconcile-plan",
    "base": "authority-reconcile-plan",
    "mutation": "change-old-plan",
    "property": "ReconcilePinned",
    "kind": "invariant"
  },
  {
    "id": "authority-new-reconcile-config",
    "base": "authority-frontier-reconcile",
    "mutation": "change-old-config",
    "property": "ReconcilePinned",
    "kind": "invariant"
  },
  {
    "id": "authority-class-widen",
    "base": "authority-cap-class",
    "mutation": "allow-class-widen",
    "property": "ExactCapabilityClass",
    "kind": "invariant"
  },
  {
    "id": "authority-json-widen",
    "base": "authority-cap-json",
    "mutation": "allow-edge-widen",
    "property": "ExactCapabilityEdge",
    "kind": "invariant"
  },
  {
    "id": "authority-const-mints",
    "base": "authority-cap-const",
    "mutation": "allow-data-source",
    "property": "NoDataCapabilitySource",
    "kind": "invariant"
  },
  {
    "id": "authority-unregistered",
    "base": "authority-cap-unregistered",
    "mutation": "skip-registry",
    "property": "ActiveRegistryRequired",
    "kind": "invariant"
  },
  {
    "id": "authority-revoked",
    "base": "authority-cap-revoked",
    "mutation": "skip-revocation",
    "property": "ActiveRegistryRequired",
    "kind": "invariant"
  },
  {
    "id": "authority-widen-requirements",
    "base": "authority-revision-requirement-widen",
    "mutation": "widen-requirements",
    "property": "RequirementNarrowing",
    "kind": "invariant"
  },
  {
    "id": "authority-widen-entry",
    "base": "authority-revision-entry-widen",
    "mutation": "widen-entry",
    "property": "DefaultEntryNarrowing",
    "kind": "invariant"
  },
  {
    "id": "authority-cas-as-delivery",
    "base": "authority-message-orphan",
    "mutation": "trust-cas",
    "property": "DeliveryEvidenceBound",
    "kind": "invariant"
  },
  {
    "id": "authority-cas-recipient",
    "base": "authority-message-recipient",
    "mutation": "trust-cas-recipient",
    "property": "DeliveryEvidenceBound",
    "kind": "invariant"
  },
  {
    "id": "authority-payload-channel",
    "base": "authority-message-channel-mismatch",
    "mutation": "payload-only-channel",
    "property": "ChannelEvidenceBound",
    "kind": "invariant"
  },
  {
    "id": "authority-payload-dedupe",
    "base": "authority-message-two-identities",
    "mutation": "dedupe-payload",
    "property": "ChannelIdentityRetained",
    "kind": "invariant"
  },
  {
    "id": "authority-unfair",
    "base": "authority-progress",
    "specification": "Spec",
    "property": "EventuallyReturned",
    "kind": "liveness"
  }
];
