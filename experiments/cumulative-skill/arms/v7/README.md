# V7 seed-search protocol

This directory records a new protocol design after V6 stopped at its
calibration gate. It contains no runner, task snapshot, provider receipt, or
live result. No V7 provider call has occurred.

V6's `cal-c` search reached generation eight after its training output became
correct, while the writer continued to receive the same training feedback and
had no signal that selection still failed. V7 changes the seed process in a
new protocol rather than modifying V6: it adds a separate development batch,
passes only a bounded development score to the writer, rotates through eight
predeclared revision modes, and keeps a separate selection split whose records,
labels, outputs, scores, and reports never enter writer requests.

The task family, scorer threshold, route, model, resource ceilings, four-arm
comparison, and descriptive primary rule remain the V6 values. V7 uses four
fresh calibration blocks and proceeds only when every seed qualifies and at
least three fixed seeds leave headroom on eight fresh frozen tasks. If that
gate fails, the result is collected and replayed as a negative calibration;
the protocol is not tuned after seeing outcomes.

The machine-readable design is [protocol.json](protocol.json). Implementing
the driver and task-contract changes is a separate pre-inference phase. A
future implementation must freeze its source and generated tasks before any
provider credential is used.
