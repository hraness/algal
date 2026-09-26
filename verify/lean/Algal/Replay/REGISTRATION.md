# `Algal.Replay` — registration

How this module relates to the rest of the verification tree, and what is
(intentionally) not wired up.

## Module map

```
Algal.Replay.Model      — tape service, replayable-state machine, receipt
                          records, verify/diff/resume definitions
Algal.Replay.Theorems   — proved properties + evidence-tagged witnesses
Algal.Replay.SCOPE.md   — scope, abstractions, exclusions
Algal.Replay.REGISTRATION.md — this file
```

Imports (existing, unchanged): `Algal.Core.Json`, `Algal.Core.OwnMap`.

The library target is built on demand:

```sh
cd verify/lean
~/.elan/bin/lake build Algal.Replay.Model Algal.Replay.Theorems
```

No file outside `verify/lean/Algal/Replay/**` imports `Algal.Replay`; the
module has no downstream consumer and cannot leak into a release surface.

## Registered suite

`verify/replay/lean-replay` stages the project and rebuilds these two
modules under the pinned toolchain, then runs the transitive-axiom audit
(`Algal.Audit`) over every public theorem — reported dependencies are the
standard set (`propext`, `Quot.sound`, `Classical.choice` where used).

## Companion suite

`verify/replay/replay-isolation` holds the *measured* side of the same
properties: instrumented `Store`/`Executor`/`ToolRegistry`/`Transport`
seams observe that production `verifyReceipt`/`resumeRun` keep replay off
the live channels. The Lean module proves the model has the property; the
suite reports the production behavior for the exercised fixtures. Neither
claims the other.

## What a future linkage step would need

To move a property from *model-proved* to *linked through translation*:

1. A machine-readable `Program` projection from `src/contract.ts` +
   `src/graph.ts` manifest shape, so a real manifest compiles to a model
   `Program`.
2. A bisimulation obligation between `runOrganism`'s sweep (src/run.ts) and
   `steps`, covering tape service, slots, and dispatch order.
3. Digest-binding discharge (the A-HASH assumption) at the boundary where
   `Fields` values become canonical bytes.
