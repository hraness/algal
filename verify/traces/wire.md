# Portable stateful histories and observations

This is a test-only v1 format. `schema.ts` is the closed, bounded admission
grammar; `shared.ts` defines exact bootstrap values and target ordering. Histories
contain concrete commands, including prior-step references, and can replay without
a generator or its local database. Payloads use scalar Unicode and safe integers;
this corpus does not cover every admitted JSON number or legacy Unicode value.

`algal.verification-history.v1` has `seed` (u32) and 1–24 `commands`. Each command
has its exact zero-based `id`, tagged `action`, and explicit `fault` or null.
There are at most two mailbox/application identities and four operation keys.
Payload canonical JSON is at most 256 bytes. The initial suite budget is 64
generated histories, with deterministic regressions and capacity tests retained
separately. Seed and generator version supplement the concrete command history.
`product.ts` independently encodes product values with numeric array-index keys
first and remaining keys in UTF-16 order. Product CAS/message identities and cold
file bytes use that encoding. History digests and target ordering use verification
metadata encoding (`stableJson`), which sorts every object key lexically by UTF-16.
These encodings intentionally differ for integer-like keys.

`algal.verification-trace.v1` contains runtime, history digest, initial snapshot,
one row per command, and raw test-authority/alias bindings. A row contains outcome,
checkpoint events, whether the requested injection fired, and an independently
read post-state. Its pre-state is the initial or immediately preceding snapshot.
Success is recorded only when the real public method returns. Errors explicitly
record code, complete diagnostic message, logical wake aliases and the API's
uncertainty flag. Native serde skips wake/uncertainty in ordinary errors; this
driver must copy them explicitly. Cross-runtime semantic comparison omits error
message wording, raw capability handles and exact syscall sequence; these remain
available as diagnostics and are checked by their own correspondence rules.

Raw fs events are the existing production `durable-fs` before/after checkpoints.
They are normalized to physical-root-relative paths (`.` for the durable fixture
anchor, `@ancestor/N` above it), first-use `.temp-N` names within their original
parent, and first-use `iN` inode-equivalence identifiers. Alias counters last for
the entire trace. Inode aliases mean observed OS identity; OS inode reuse after
all names/handles disappear prevents a claim of eternal allocation identity.
Fault occurrences count all matching raw step/phase events,
including ancestors, before normalization. Unknown managed steps or escaping
paths are rejected. An `after` event means the actual syscall succeeded; an
absent `after` does not generally establish that a failing syscall had no effect.
Only a before-hook rejection establishes the syscall was not attempted.
The checker relates successful temporary-file sync and publication by path.
Publication hooks do not report an opened inode, so this is not a proof that the
synced descriptor and linked inode are identical. Descriptor identity remains a
production source obligation and separately tested Phase02 behavior.
Successful mutations must contain positive witnesses for their exact published
targets; retained immutable winners require their own file sync followed by all
relative ancestor-directory syncs. Mailbox create/revoke bind actual capability
file names; operations require their mailbox lock acquire/release checkpoints,
and receive requires consumed publication and directory sync before pending
deletion. Application success requires selection and primary/permanent marker
publication, with admitted/prepared/head-published checkpoints for a new head.
These marker events are not an independent proof of SQLite lease ownership or
native OwnerLease cleanup. Erasing an entire successful mutation's events rejects,
as does an altered bootstrap or a readable head/history disagreement.

Application events are the existing selected-custody diagnostic, actual host
admission callback, and prepared/head-published fault points. They are a partial
observation of custody, not assertions that every modeled lease transition ran.
`cancel` is an injected IO_FAILED cut at that checkpoint. Its named witness is
`injected-cancel-cut`, which establishes error unwinding only. It does not witness
AbortSignal cancellation, future/task drop, process termination, or remote-effect
cancellation. The separate `src/application-cancellation.test.ts` uses a real
AbortController to cancel the host admission callback, and the native trace unit
tests abort/drop the actual admission future. Phase02 custody schedules separately
exercise owned SIGKILL and reopen. Those are distinct evidence: this completed-call
wire cannot represent an invocation terminated without a settled public result.

Snapshot target lists are sorted by canonical target JSON, with duplicates
rejected. The fixed universe contains the four `BASE_VALUES`, four effects/slots,
two mailbox configs and their four messages/pending/consumed keys and locks,
two application histories/heads and both bootstrap memory objects. Extra concrete
CAS values in a history are added before replay. File observations retain exact
byte length and SHA256, with missing files represented by zero bytes and null
hash. Public getters/inspect/history provide semantic observations; bounded raw
JSON reads provide marker observations. Audit reads run outside fault probes and
use fresh Store readers. Actual commands retain their Store instance until an
explicit restart, preserving any difference between a cached return and cold data.

Getters return `{found,value}` so absent and JSON null remain distinct. Mailbox
create returns name/capacity plus logical send/receive aliases; actual minted
handles are separately bound. Application returns/history use
`{digest,previous,sequence,operation,memory}`. An application commit `head` is null,
`missing`, or the ID of a prior successful application command/inspect in the same
application. Unresolved references, missing aliases and an injection that never
fires are harness errors, not successful negative controls.

Only fresh owned directories are used. Restart constructs new services over
the retained directory; it does not erase evidence. Explicit tamper commands
operate on named fixture files. Corruption writes the exact bytes `{broken`;
removal removes only that fixture target. They never repair or delete unrelated
data. Real power-loss behavior is outside this harness; the Phase02 crash-image
models remain separately qualified conditional evidence.

Fault checking enforces the exact injected error code/wake, known API uncertainty
at application checkpoints and mailbox mutation attempts, untouched named file/config/history observations,
admitted Store publication candidates, and application head behavior before/after
publication. Its `partial` state set deliberately retains uncertainty about other
intermediate filesystem details. It is sampled consistency checking, not a complete
transition refinement or a proof of all syscall-failure behavior.
Ordinary modeled rejections require the actual API uncertainty flag to be false;
they cannot be relabeled as definite rejection while retaining `uncertain:true`.
Unexpected host errors outside these modeled outcomes reject admission. The
separate injected-fault branch retains its checkpoint-specific uncertainty rules,
including true after application head publication. For injected filesystem cuts,
mailbox send/receive/revoke uncertainty begins when a fresh claim, delivery marker
or revoked authority publication is attempted, and covers subsequent release
failures. The checker identifies the helper's first parent-directory sync from
the raw event prefix and independently observed prior claim/marker state; retained
retry syncs are distinct. Readiness and pre-admission failures stay certain. This
bounded checkpoint relation does not classify arbitrary unobserved host failures,
nor does `uncertain:false` mean that an earlier invocation never transferred data.

`run.ts` executes every Bun and native history under the owned process supervisor
with per-history deadlines, bounded raw output, actual exit and pipe EOF witnesses.
All ten retained histories and seeds 1–64 (24 commands each) are required. The
archive retains the concrete history, both raw traces, exact commands and output;
readmission rechecks current source/tool hashes, exact inventory, raw bytes, all
semantic checks and the generated seed/state-to-command relation. Hegel's native
64-case generator and its two-command shrunk negative are separate evidence. A
seed/database is never necessary to replay a retained concrete counterexample.
