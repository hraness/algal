# Phase04 portable traces and stateful evidence

This worker lane adds a closed test-only history/observation format under
`verify/traces/`. It exercises the real Bun and native Store, mailbox and
application APIs. It is sampled execution and trace consistency evidence,
not a universal implementation refinement theorem or a physical power-loss test.
The Phase02 filesystem/custody assumptions remain explicit.

## Domain and correspondence

The initial corpus has ten retained histories and 64 generated histories of
24 commands each: 1,628 commands per runtime. It uses two application/mailbox
identities, four operation keys, scalar-Unicode JSON with safe integer numbers,
payloads at most 256 canonical bytes, 4,096 events per command, and 1 MiB per
raw transcript. Separate deterministic capacity tests cover production limits
beyond this small stateful domain. Hegel's independent native generator is a
separate suite, not a second count of these 64 concrete cross-runtime histories.

The wire and exact bootstrap/target vocabulary are documented in
`verify/traces/wire.md`. Product values use an independent encoder that models
JavaScript integer-index key ordering and UTF-16 ordering for other keys.
Trace metadata sorts all keys by UTF-16. Numeric and BMP/astral Unicode-key
fixtures prevent confusing these distinct encodings.

Each command records its real returned value or error code, diagnostic message,
wake aliases and uncertainty flag, plus actual before/after production I/O
events and independently reopened cold state. Commands retain a Store instance
until an explicit restart; snapshots use fresh readers. Raw file lengths and
hashes are checked against cold semantic observations. Comparison excludes only
error-message wording, random capability handles, physical paths/inode numbers
and exact syscall sequence. Logical capability class/identity, errors, wake and
uncertainty remain checked. Physical paths map to a closed fixture namespace;
unknown managed paths reject. Inode aliases represent observed OS `dev:ino`,
not eternal allocation identity across possible inode reuse.

The checker validates semantic Store winners/slot writes, mailbox capacity,
retry/conflict/transfer/revocation, application predecessor/sequence/operation
and retries, independently observed state, actual fault reachability, and the
modeled publication ordering. It cannot establish linked-inode identity from
path-only publication hooks or enumerate every possible partial filesystem
state. Its fault abstraction preserves explicit `partial` possibilities rather
than treating every error as rollback. Scope limitations are kept in the wire
document and each suite relation.

## Stateful generation, replay and shrinking

The TS xorshift32 generator chooses each next command from the preceding real
snapshot. It checks every prefix before drawing another command. Readmission
recomputes the seed/state-to-command relation and requires every seed 1–64,
all retained fixture identities, and reached action/error/checkpoint witnesses.
This generator relation is checked by the same decision routine; the semantic
checker is separate from the production implementations.

Concrete histories replay without a seed database. The bounded shrinker removes
commands and dependent head references, renumbers references, simplifies payloads
without splitting Unicode scalar characters, and preserves the same named
semantic failure. Parse failures, unreachable injections, timeouts and tool
failures do not qualify as smaller counterexamples. The selected history must
fail again in a fresh replay. The TS deliberate wrong-get control reduces an
11-command fixture to the real put/get pair. The native Hegel control deliberately
asserts a false last-wins effect policy, retains two concrete puts, and replays
that same named predicate without a seed/database. Neither is misreported as a
production failure.

`run.ts` runs each Bun history in an owned supervised child with a 120-second
deadline and each explicit native test artifact with a 30-second deadline.
Successful admission requires actual exit, complete output and observed process
cleanup, exact worker/test completion framing, and independent raw-trace checks.
There is no fallback executable or zero-test success. Raw failure bytes and owned
state are retained if custody is not established. Archives bind source inventory,
Bun/native binary hashes, every concrete input and raw output; readmission reads
those bytes again. Native build/source correspondence remains a separate pinned
build gate. The archive is local/CI evidence, not an attestation against a hostile
same-user writer.

## Findings and repairs

- A genuine persistent native Store returned its cached value/effect after
  corruption or removal, while cold readers and Bun rejected or returned missing.
  The retained `retained-cache-corruption` and `retained-cache-removal` fixtures
  exposed it without hiding the difference behind restart. The production repair
  belongs to the integration/native lane; writable persistent reads now admit
  retained files, while memory/overlay semantics remain explicit.
- Missing application dependencies exposed Bun's generic error versus native
  `PARSE_FAILED`. The integration lane made the existing boundary explicit in Bun,
  with `DIGEST_MISMATCH` for an overridden Store returning a different record.
  Every returned record is now rehashed and the admitted copy is parsed.
- Root review caught the trace checker's initial use of metadata hashing for
  numeric-key product values. The independent product encoder and retained
  numeric/Unicode vectors repair the checker; this was an oracle defect.
- The first full 74-history parity pass completed all comparisons, then correctly
  failed archive admission because its adapter incorrectly required nonempty
  successful stderr. That adapter defect was repaired; the original archive is
  retained as rejected evidence.
- Independent review added per-history Bun process custody, exact completion
  framing and fault-branch constraints. A further negative control showed that
  dropping every successful publication event could bypass conditional ordering
  checks. Positive required-witness gates now cover Store/effect/slot writes,
  mailbox creation/send/readiness/revocation/receive, application creation/commit
  and exact retries. The regression rejects complete event erasure across all
  ten action kinds, while genuine raw traces still pass. Fresh bootstrap and
  independently read selected-head/history bindings are also mandatory.
- The last root review showed that symmetric forged `uncertain:true` flags on
  ordinary stale-writer, full-mailbox and revoked-authority rejections passed the
  independent oracle. An explicit ordinary-rejection uncertainty gate now rejects
  all three mutations without changing their events or state. The injected-fault
  branch still requires true uncertainty after application head publication.

## Cancellation is separate evidence

The portable wire's `cancel` label injects `IO_FAILED` at a real checkpoint.
Its witness is named `injected-cancel-cut`; it proves error unwinding only.
`src/application-cancellation.test.ts` separately uses an actual AbortController
to cancel a paused host admission callback for new and existing applications,
settles public rejection, checks cold committed state and admits a next contender.
It passed 2 tests/16 assertions in the integration lane. The native test aborts
and drops a real Tokio task at new-application admission, observes task cancellation
and then admits a real new owner. Phase02 owned SIGKILL/reopen schedules remain
separate process-death coverage. No new ApplicationService cancellation API or
universal remote-effect cancellation guarantee is claimed.

## Qualification status

Final source-bound archive qualification passed after the ordinary-rejection
uncertainty repair. The preceding archives remain historical. The integration owner retains
the aggregate gate and broad ledger status; this report does not promote universal
properties to proved status.
Focused checker/driver validation after both final checker repairs:

```sh
bun x tsc --noEmit
bun x eslint verify/traces
bun test --timeout 20000 verify/traces/trace.test.ts
# exit 0: 17 tests, 100 assertions, 11.81 seconds
git diff --check -- verify/traces docs/formal-verification-evidence/phase04-traces.md
```

The complete previously captured 74 Bun/native pairs also passed the strengthened
checker, as a diagnostic only: their source binding became stale when the checker
was repaired. They are not relabeled as newly executed final evidence. A fresh
archive then completed successfully under the final frozen source definition:

```sh
ALGAL_TRACE_TEST_BIN=/private/tmp/algal-core-native-JnruYt/debug/deps/algal-873652eee133519c \
  bun verify/traces/run.ts /private/tmp/algal-phase04-traces-final-uncertainty-20260923
# exit 0: 74 histories, 1,628 commands in each runtime, raw archive readmission passed
```

- Definition: `sha256:b0a810e4f32e28296afab3b03831e401406ec25fa14432392ff63f539775a67b`.
- Result: `/private/tmp/algal-phase04-traces-final-uncertainty-20260923/result.json`,
  113,148 bytes,
  `sha256:ff11af5066366cd19e1591a07829fbc673d5534e328c9023adad4a3db19834e9`.
- Complete retained archive: 55,358,313 bytes in 530 files. It contains every concrete history,
  raw Bun/native transcript and command record. Mutable fixture state was removed
  only after completed command custody and semantic admission; failure archives
  remain separately retained.
- Host profile: macOS arm64, Bun 1.3.14;
  `/Users/bg/.bun/bin/bun`,
  `sha256:e0c90ec15d33363e6b70713d56bc3b2c7585c17f40a0fe0f8fd9305901d4e233`.
- Native lib-test artifact:
  `/private/tmp/algal-core-native-JnruYt/debug/deps/algal-873652eee133519c`,
  `sha256:708f5a60283b8c639ed557c28d35917d3ebd3fd66573fc8abb308d650fd27794`.
  Its pinned Rust 1.97.1 build and Hegel evidence belong to the native lane.
- Raw terminal log: `/private/tmp/algal-phase04-traces-final-uncertainty.log`.
  Focused logs: `/private/tmp/algal-traces-{tsc8,eslint8,focused8}.log`.
  The ordinary-rejection regression first failed (0 passed, 1 failed) at
  `/private/tmp/algal-traces-uncertainty-red.log`; the unmodified checker accepted
  the forged uncertainty flag. Its final real-fixture controls are in
  `verify/traces/trace.test.ts`.

These hashes qualify that exact frozen snapshot. Subsequent bound source, tool or
fixture changes make it historical evidence; copying a normalized summary does
not restore admission. CI/release audit retention must retain the raw archive,
not only its small result index.
