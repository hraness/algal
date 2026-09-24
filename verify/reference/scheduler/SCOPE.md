# Bounded independent scheduler reference

The semantics in `oracle.ts` import **no production implementation**. This is an
independent small-step machine for a deliberately restricted fixture language.
`fixtures.ts` generates 89 deterministic cases. The production adapters are
separate: `adapter.ts` materializes manifests and compares receipts, `worker.ts`
executes Bun APIs, and `run.ts` owns bounded command supervision and evidence.

`runSchedulerModel(root)` runs 23 semantic/admission/adapter tests, including seven
incorrect transition controls. `runSchedulerConformance(root, binary)` executes
89 ordinary and 14 foreign-boundary fixtures through each runtime: **206
comparisons**. The binary must be an explicit absolute frozen artifact, supplied
as the second argument or `ALGAL_SCHEDULER_NATIVE_BIN`. The adapter never builds
or discovers a native executable. Source/build provenance is a separate gate.
Neither exported function labels its evidence a TLA+ or Lean proof.

## Semantics and comparison

The machine owns a shared activation/call/work ledger, actual nested frames,
ordered edge states, occurrence-specific effects, retries, carry, each
aggregation, outcomes and inclusive cell work. One transition does not mutate
its input semantic state. Existing append-only trace entries are shared, while
the outer trace array and mutable semantic state are copied. Await makes no
progress without an explicitly supplied response.

All comparisons require exact outcome, failure code/path, cell records and
outputs, inclusive work, rounds/items, effect identity and occurrence order,
shared work, and semantic event kind/path sequence. Only failure message wording
at the run/cell envelope is omitted. Messages in effects and guest fallback JSON
remain exact. Runtime-specific command messages are independently prescribed
before execution; observed results never become oracle inputs. Requests are
independently constructed and hashed, not adopted from production receipts.

The oracle serializer covers bounded ASCII, safe small integers and finite
arrays/objects, including canonical numeric object-index ordering. It is not a
general binary64/Unicode codec. IR admission rejects unknown fields, ambiguous
aliases, mismatched wrapper signatures, unsupported agent output flags,
incompatible edge/carry signatures, unsupported guards and cycles. This does
not establish universal equivalence for every admitted IR value.

## Executed domains

The ordinary inventory covers declaration/edge-order fan-in permutations,
guard/error/work precedence, optional/many/required skips, charged invalid
inputs, pure failures, retained retry costs, byte-budget clamping, carry/until,
nested shared limits and inclusive work. Maximum controls cover exact 1,024
successful activations and refusal of the 1,025th, 64 calls and refusal of the
65th, depth 8 and refusal at bound 7, repeat 16, and each 1/63/64 with refusal of
64 against bound 63.

The foreign inventory covers success, settled exit 7, EX_TEMPFAIL suspension,
and signal uncertainty without a journal, in flat unhandled/handled and two
wrapper shapes. The command fixture is a fixed repository program with fixed
argv, not a shell string. It only signals itself. Bun invokes the production
`commandJson` boundary and native uses `algal.host.v1` with the same argv.
Every Bun API worker and native invocation runs under the existing verifier
supervisor. Bun's provider child stays in its supervised group. There is no
nested independent supervisor group inside that worker.

Without a journal, signal uncertainty is a nonretryable effect error and a guest
fail edge may handle it. Two further journaled process fixtures distinguish this
from host poison: abort without a run receipt, one exact started/never journal
record, uncertain process head, rejected explicit recovery, unchanged fresh
head, and request-log evidence that no fallback or later call happened. Bun's
in-memory error exposes `uncertain: true`; native CLI evidence uses its exact
structured error and durable state, without inventing a wire uncertainty field.
The recovery refusal codes remain independently asserted: Bun IO_FAILED and
native RECOVERY_BLOCKED.

## Admission and limits

Each conformance run retains source/artifact identity, fixture, oracle trace,
materialized input files, complete raw command output, actual receipts or
journal/poison state, request logs and hashes. It rejects any mismatch, missing
worker frame, changed result binding, unexpected command status, failed custody,
extra worker output/diagnostics, source/tool drift or retained-file drift. Failed
custody retains bounded raw stdout/stderr bytes, including non-UTF8 output.
Current source bindings conservatively include all governed production paths,
this reference directory and the relevant supervision helpers. An executable
hash alone is not native build provenance. Static input and raw result binding
are necessary; normalized success counts alone are insufficient.

The conformance result is initial execution evidence with retained raw files.
An independent offline re-admission adapter for arbitrary externally supplied
scheduler result envelopes is not implemented here; the later evidence-admission
phase must not treat an untrusted `comparisons` count as proof.

`PROGRESS.md` gives a parameterized charging argument and conservative internal
transition/work bounds for reachable, unmutated fixture states. The executable
checks the derived transition bound and all fixtures check the work bound. This
is a reviewable argument, not a machine-checked source theorem, wall-clock bound,
or guarantee that an external provider returns.

General expressions/schemas, capability/reference checks, custom function
costs, tools/turns, recall/reranking, compaction, dynamic spawn, stores/slots,
arbitrary DAGs, alias fan-out, large derived port values, receipt amplification,
full host I/O, event truncation and general work overshoot remain outside this
slice. Provider turn 16 is not claimed. The exact fixture inventory is the
qualified execution domain; independent review and the repository's final gates
remain required before integration claims.
