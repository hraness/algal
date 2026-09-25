`audit-positive.json` is actual pinned Lean 4.34.0 output from the reviewed
`Algal/Audit.lean` command applied to the toy theorem
`Algal.Core.Probe.accepted : True`. It is a parser fixture, not evidence for an
ALGAL property. Tests mutate its diagnostics and metadata to exercise rejection;
real theorem qualification requires fresh source/tool-bound execution.
`core-vectors.json` is the 2278-byte diagnostic output of the authored
`Algal/Core/Vectors.lean` functions. It is a parser/comparison fixture. The
execution adapter regenerates vectors from freshly staged source; this saved
copy cannot substitute for that execution or a native comparison.
