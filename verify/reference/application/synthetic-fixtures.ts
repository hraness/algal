/** Shared finite fixture values for synthetic archive-admission tests only.
 * Origin: the earlier delivery-1 scratch packet, SHA256 a3bf2902406f324d9a286694e081c29a21b1bd3e47543c33bd092162d0f451ed.
 * No command record or trace in these tests claims target execution. */
import type { Fixtures } from "./schema";
export const SYNTHETIC_FIXTURES: Fixtures = {
  "revisions": [
    {
      "contract": "algal.application-revision.v1",
      "application": "history-0",
      "parent": null,
      "schema": "sha256:b5833a98d575749d949527372feb3f782a4b19a61751816f9d032c29377bea4e",
      "queries": "sha256:69c059867c680ac3a237d12bd87431124f2535b5014172533a8e0d39b017e098",
      "views": "sha256:69f3748d552c998ebe100c051fa05a257e4adbc78a33995fcc6a463143752bae",
      "runtimeProfile": "sha256:d431dd8b66b5c977b4e9b0ea7a2a6bb367a055977002d7ca3ad3adf041611e23",
      "evaluationPolicy": "sha256:45854a7d0c3f14c34e4ed6cf2f1f8d2c0e75ff9f6031fde074da2b3532aae4ad",
      "capabilityRequirements": [],
      "entrypoints": [
        {
          "name": "run",
          "manifest": "sha256:02dce705ddd68c1a9e0930055b8264810a13f18235841949b939acb959f29596",
          "applicability": "sha256:05b8fdc26ddf483c4e22722525b8c387398a47c5591338ce44c94987a2726d75",
          "maxGenerations": 1,
          "capabilities": [],
          "queries": [
            "sha256:05b8fdc26ddf483c4e22722525b8c387398a47c5591338ce44c94987a2726d75"
          ]
        }
      ]
    },
    {
      "contract": "algal.application-revision.v1",
      "application": "history-1",
      "parent": null,
      "schema": "sha256:b5833a98d575749d949527372feb3f782a4b19a61751816f9d032c29377bea4e",
      "queries": "sha256:69c059867c680ac3a237d12bd87431124f2535b5014172533a8e0d39b017e098",
      "views": "sha256:69f3748d552c998ebe100c051fa05a257e4adbc78a33995fcc6a463143752bae",
      "runtimeProfile": "sha256:d431dd8b66b5c977b4e9b0ea7a2a6bb367a055977002d7ca3ad3adf041611e23",
      "evaluationPolicy": "sha256:45854a7d0c3f14c34e4ed6cf2f1f8d2c0e75ff9f6031fde074da2b3532aae4ad",
      "capabilityRequirements": [],
      "entrypoints": [
        {
          "name": "run",
          "manifest": "sha256:02dce705ddd68c1a9e0930055b8264810a13f18235841949b939acb959f29596",
          "applicability": "sha256:05b8fdc26ddf483c4e22722525b8c387398a47c5591338ce44c94987a2726d75",
          "maxGenerations": 1,
          "capabilities": [],
          "queries": [
            "sha256:05b8fdc26ddf483c4e22722525b8c387398a47c5591338ce44c94987a2726d75"
          ]
        }
      ]
    }
  ],
  "revisionRefs": [
    "sha256:73335630c847c21980b753a1819068698a1097066878730f8eec75746c3b7de9",
    "sha256:6989540223fcc59287c7761b9244b1757dc1d754182b0af990fa75c81dfdb281"
  ],
  "memories": [
    "sha256:67f777d157fa3cd8f5d8b38817d956a03df61986fc4b2cd0494e43e62830eb32",
    "sha256:cbbc3ec1c9ee74b0aa2a98a27a5ee17bb10b5a54e93e2af22e29d36862efea2c"
  ],
  "messages": [
    "sha256:0b2e0819f4a476bf217f27d43f8a69037655c5ac8d4b7db2a366b60e16baff96",
    "sha256:3b6133211f3265f784cb2dce60aade286c9dfb37f79ba0b420c620a3469247c4"
  ],
  "manifest": "sha256:02dce705ddd68c1a9e0930055b8264810a13f18235841949b939acb959f29596",
  "input": "sha256:7dcba4f7158b144f642fd615257c952ada9d8aa7357d0964ffb361618d993a15",
  "profiles": [
    "sha256:33266ddead5cf5e0021364dfa3c22ce0999feaf3f1244002097be6eef6fcbaeb",
    "sha256:af72e6aa2a3bf1056ec85f7b477ece6b49f60dcf10661f312031c2fcc05604e0"
  ],
  "configurations": [
    "sha256:3921af9ed01af0d89201d2e850ea55a9e26c61b4d918286ca50f23480e6c4017",
    "sha256:474489098f7e06dd60a4cafeba13334accdab87ad8280bd057b14763fc045e36"
  ],
  "recipient": "cap:mailbox-send:sha256:b37c35c7476e5c22cb1faafd979350038e3581dc0e3f5b42811f82c05eba283a"
};
