# Phase05 protocol verification

Phase05 is complete within its declared bounded model and sampled runtime
scope. The lease, process/journal and mailbox models have passed their finite
configurations, including mailbox mutation-boundary profiles. The production
protocol correspondence tests pass in both runtimes. These
are finite model checks and executed correspondence cases, not a mechanized
implementation refinement theorem or physical power-loss qualification.

## Models and actual completion

| Suite | Positive configurations | Transition witnesses | Unsafe controls | Receipt |
| --- | ---: | ---: | ---: | --- |
| Lease | 15 | 38 | 7 | [lease-model.json](../../verify/results/344bcb212f937113df0807ae782197802010134adfba2c2b8aa612c39ba3b932/lease-model.json) |
| Process and journal | 25 | 71 | 21 | [process-model.json](../../verify/results/2c68a02f3f9ee849c74d3130eaa33b0fbacfebac67ac8b19edf98d0995cdb8eb/process-model.json) |
| Mailbox | 23 | 62 | 12 | [mailbox-model.json](../../verify/results/61a2b1f16da1d9612d8ac53d646a148171c969bbf5bcac588ae8dc47b2cc5e41/mailbox-model.json) |

Every positive configuration exhausts its reachable graph; declared temporal
properties complete in separate fair profiles. Every unsafe control must fail
its intended property, and every witness must contain its declared nonstuttering
transition. The adapter rejects unexpected tool diagnostics, incomplete output,
timeouts, empty behavior, incomplete inventory and lost process custody. There
are no symmetry reductions, state/action constraints or operator overrides.
The pinned Java runtime inventory is checked before and after execution. A
separate invocation re-admitted every saved raw result against current bindings.
The final pinned adapter also refreshed the earlier custody (6/18/5) and
publication (7/40/15) suites:
[custody-model.json](../../verify/results/438c393b86841135c875f00c3beff60c66af832482b62573a6d6827c6a337e48/custody-model.json),
[publication-model.json](../../verify/results/41bd4a01ef700e359ccedef2eb4c1fcebb7ee89d35cc17657a990f08353c4014/publication-model.json).
Together the five suites executed 365 admitted runs. Branched temporal output
uses the pinned TLC 1.7.4 full-state, non-tableau graph contract, with explicit
branch counts and ordered start/completion records. Incomplete or misplaced
temporal counterexamples, contradictory counts and early completion reject.
Independent review reproduced and checked these rejection cases.

The exact finite domains, source mappings and assumptions are in
[OwnerLease scope](../../verify/tla/lease/SCOPE.md),
[ProcessJournal scope](../../verify/tla/process-journal/SCOPE.md),
[ProcessProtocol scope](../../verify/tla/process/SCOPE.md), and
[MailboxProtocol scope](../../verify/tla/mailbox/SCOPE.md). In particular,
ProcessProtocol dispatch means runtime entry and can replay completed journal
entries; it is not necessarily a new external call. Native lease Drop suppresses
cleanup failure; no clean-marker acknowledgment theorem is claimed. Unknown
writes have no automatic recovery or unconditional progress guarantee.

## Runtime correspondence

| Protocol | Bun tests | Exact native selections | Receipt |
| --- | ---: | ---: | --- |
| Process/journal | 34 | 7 | [process-conformance.json](../../verify/results/e1278c57f65384346982da84368f727928ee3be372b213a620c6dc0fb1e00ce6/process-conformance.json) |
| Mailbox | 22 | 8 | [mailbox-conformance.json](../../verify/results/aa8d63671f2195fb3820fc52d071ed3f38c904a0461b04cdbe91551315366a6a/mailbox-conformance.json) |
| Lease | 13 | 8 | [lease-conformance.json](../../verify/results/f8b83b1bd964d9831c7e0ccc9ab1de02a4143ad71df88f03a779a7a1369beee0/lease-conformance.json) |

The adapter explicitly hashes every declared Bun file and requires each to
execute a positive test count separately. A real negative control demonstrates
why an aggregate Bun summary is insufficient: a missing filename can be silently
ignored alongside a passing file. Missing, empty, duplicate and empty-inventory
controls now reject. Native selection requires exact one-test libtest framing,
zero unexpected output and observed supervised cleanup.

New cases cover equal requests at separate journal ordinals, fresh versus
recorded bindings, concurrent poison during awaited publication, a lost recovery
charge return through the actual maximum of eight, authority revocation in the
pre-lock gap, orphan claims at capacity, lost receive returns, and the actual
256-entry owner archive boundary. These use real local persistence and scoped
fault/barrier hooks, rather than replacing the production store or protocol.

## Mailbox uncertainty repair

Both runtimes previously let a receive remove pending and retain consumed, then
report lock-release failure as settled. In a real journaled process this completed
the error entry, allowed an on-fail write, and published a completed process
receipt. The red runs are retained at
`/private/tmp/algal-mailbox-journal-red.log` and
`/private/tmp/algal-mailbox-journal-native-red.log`.

Errors after the current call attempts a semantic publication now carry host-only
uncertainty, including failure before a helper's first write and after completed
transfer. Existing wire errors are preserved. Readiness, known admission
rejections and exact retained send retries do not acquire uncertainty merely
from holding the lock. Both real supervisor regressions now preserve the exact
started `recovery:never` entry, publish no outcome receipt, run no fallback write,
and reject explicit recovery without changing the uncertain head. Independent
review approved the source boundary and regression assertions. Receive still has
no retained caller operation/result identity; this repair adds no blind retry.

## Artifact and lifecycle evidence

The native unit-test executable is SHA256
`9b04b22a6d8b2446048ac08d4ba54f68ebb76d017a853cafac0820496fda8da0`.
The native CLI is SHA256
`f028228a12d34e3900c5bc116965c8be824a678740ac1477f9020a79946dd86e`.
Both were freshly built from the converged source with pinned Rust1.97.1,
`--offline --locked`, and task-owned target
`/private/tmp/algal-core-native-JnruYt`. The final workspace build/test output is retained at
`/var/folders/k3/s4y7dlcj4mz2j1kbg428r5bw0000gn/T/system-one-0VkZHf/check.log`.
Qualified copies are retained in
`/private/tmp/algal-phase05-frozen-artifacts-s65hdqei`, with source/copy hashes
checked before and after copying. A prior qualification attempt correctly
rejected artifact drift when the workspace build regenerated shared-target
executables; it is not counted as passing evidence.
A binary hash alone is not a source/build correspondence proof.

The CLI passed all 58 process lifecycle parity steps. Mailbox admission parity
also passed real Bun/native contention, forced GC before contention, owned
SIGKILL takeover, exact owner archive/readback and conflicting-bound rejection
in both directions, without any model-provider calls. Raw reports are
`/private/tmp/algal-phase05-process-parity-frozen.log` and
`/private/tmp/algal-phase05-mailbox-parity-frozen.log`. The full native workspace
suite passed 347 tests, with three explicitly invoked helper tests ignored in
the aggregate; dedicated trace and custody adapters execute their required
helpers separately. This includes all 16 process integration tests.
`cargo clippy --workspace --all-targets --offline --locked -- -D warnings`
also passed; its log is `/private/tmp/algal-phase05-clippy-final.log`.

The refreshed trace gate passed 74 histories and 1,628 commands per runtime, with
separate raw re-admission:
[traces.json](../../verify/results/06b57a22bbd8c88fab44e5bb63e6b71be56a0d49ae12f97eb2c17f18339bb53e/traces.json).
Its source definition is
`2be99f83557bfb24bbcd33369b3e488a00e9c7482d2cb41867d2a736bf5438f9`;
raw archive: `/private/tmp/algal-phase05-traces-final-frozen`.
The refreshed 64-history native Hegel run and concrete shrinking control passed:
[stateful.json](../../verify/results/65b370470de3a92ac93bc12ae9c3655d2fd66eecabf3bc4697f7364f368cbd2a/stateful.json).
The nine native and 19 Bun fault/cancellation checks also passed:
[fault-harness.json](../../verify/results/128db38b2e9f6bd75c8fb88f9c75c19ca47d009641035f41379fc30f863a5aa0/fault-harness.json).
The quiet `bun run check` passed: 1,128 tests, 20 conditional skips, zero
failures and 8,450 assertions, followed by documentation checks and the site
build. Type checking and lint passed in the same command. The skips include
optional native-memory/live-provider and platform-specific lanes; this aggregate
does not claim their qualification. Exact output is retained at
`/var/folders/k3/s4y7dlcj4mz2j1kbg428r5bw0000gn/T/system-one-EAh4nx/check.log`.
Final integrated delivery, platform and remaining plan gates still apply.
