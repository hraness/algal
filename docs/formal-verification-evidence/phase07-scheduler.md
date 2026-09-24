# Phase 07 scheduler checkpoint

The saved evidence below identifies checkpoint `5e334ed` or an earlier snapshot.
The [upstream integration](upstream-1737.md) requires fresh checks for its changed source.

Phase 07 remains in progress. The registered independent executable oracle covers
89 ordinary fixtures and 14 foreign-command fixtures. Its 23 model/adapter tests
passed 443 assertions, including seven semantic mutants and four adapter controls.
The final integrated aggregate passed all 206 Bun/native comparisons. Saved
evidence was independently readmitted against exact source, artifact and raw
command bindings; the checker also regenerated fixture manifests and oracle projections.

- [Model receipt](../../verify/results/6265c5e2b23455f646f6282a81dd1018a7ba6f7492f6851999d72ef2f00b1c4a/scheduler-model.json).
- [Runtime conformance receipt](../../verify/results/500969487b943b6e521b44fe78fd9ccadc49a41c09193528ecfe9d044ba4321b/scheduler-conformance.json).
- [Declared fixture domain and exclusions](../../verify/reference/scheduler/SCOPE.md).
- [Reviewed finite progress and charging argument](../../verify/reference/scheduler/PROGRESS.md).

The oracle imports no production scheduler semantics. It covers declared edge
order, activation/failure/suspension, selected nested frames, repeated oracle
occurrences and exact step/call/depth/byte boundary examples. Foreign-command
cases include signals, malformed responses and journal poison/recovery with no
second call. Fixed argv, supervised process custody, exact output frames and
stderr/status admission bind each actual command. An unavailable binary, source
drift, wrong fixture inventory or missing output fails qualification.

The work exposed byte-budget overrides that could exceed the root budget: agents
in Bun and recall in both runtimes. The repaired paths clamp the effective byte
budget to the root limit, with 56 focused cases per runtime. A diagnostic mismatch
caused by an internal undefined projection and a missing stderr check was repaired
before the recorded successful qualifier; the failing diagnostics remain retained.

The pre-integration source definition was
`sha256:ffecefdf894512b360138b8357fd03c8aae086e5c21bca2bd175d34c59d43589`.
The selected native CLI SHA256 is
`9753058d83d56e880e5b3625583fb3f71326b1da21b94861401a7cb0d657e0a0`;
its build evidence is separate from a pathname or hash. Upstream integration and
subsequent source repairs invalidate current-tree use of these receipts and
required fresh qualification. That gate has now passed with frozen native CLI
SHA256 `eba4dd7d5b8c0efe06e5b855997b253767c94a5007030635522ea70619ac42ee`.
The [retained raw archive](../../verify/results/94cc81306373dfdbc69030640f2be85f350648168ff49343710a919afd9d7e30/scheduler-conformance-archive.json)
embeds every referenced scheduler file so future inspection does not depend on
the original temporary archive path.

This is bounded executable-model and sampled implementation correspondence.
It is not a TLA scheduler model, universal work/termination theorem, complete
cell/host behavior model or checked source refinement. Dynamic spawn, general
expression/schema/capability behavior, tools/turns/compaction and the full work
overshoot envelope remain explicit follow-up obligations.
