# Recover a retained coding outcome

A provider can finish a repair even when its caller never receives the final response.
Algal can recover that result only when an admitted adapter durably identifies the
operation and can retrieve its exact terminal outcome without launching again.
The versioned coding-operation interface adds that explicit host path. Existing
xcb jobs keep their original behavior; xcb's current Algal adapter does not
implement this protocol, and existing uncertain jobs cannot be adopted into it.

## Adapter requirements

A compatible adapter must own a durable ledger and a stable `authorityId` for
that ledger's incarnation. Before admitting work, it atomically binds the supplied
`operationId` to the request digest. Duplicate submission must not create another
worker; a conflicting binding must fail. Its `observe` operation is read-only:
it cannot launch, retry, resume, cancel, clear custody, or switch accounts.

A terminal result asserts that all work admitted for that operation is settled,
including remote work and descendant writers. The adapter must retain the exact
result and its binding durably before returning it. A missing record, expired
payload, dead immediate PID, lost lease, timeout, or provider session found by
name is insufficient. If the adapter cannot establish settlement, it must return
unknown. Retention expiry must not erase identities and enable duplicate work.

The host trusts the admitted executable and its settlement assertion. Digests
bind bytes and identities; they do not authenticate a provider or prove that an
adapter is honest. A wrapper around an arbitrary CLI cannot manufacture a
settlement guarantee that the underlying execution lacks. Keep real adapters
guarded until their crash and retention behavior has been qualified.

## Admit and reconcile explicitly

Choose and retain one `operationId` for the intended attempt. Reuse that ID when
repeating preparation; do not mint another ID to escape an unknown result. Admit
a dedicated clean checkout, a configured adapter, and fixed host-owned checks as
for an ordinary [repair episode](repair.md):

```json
{
  "workspace": "/absolute/dedicated-checkout",
  "expectedHead": "FULL_40_CHARACTER_COMMIT_SHA",
  "operationId": "repair-42",
  "prompt": "Repair the identified bug. Preserve the public API. Do not commit or push.",
  "adapter": {
    "protocol": "algal.coding-operation.v1",
    "authorityId": "qualified-ledger-incarnation",
    "executable": "/absolute/path/to/adapter",
    "argvPrefix": []
  },
  "limits": {"maxRuntimeMs":180000,"maxOutputBytes":262144,"maxPatchBytes":65536,"maxChangedFiles":8}
}
```

The executable and prefix are host configuration. The command transport appends
only `submit` or `observe` and passes the protocol request on stdin; it does not
construct a shell command from provider output.

```sh
bun cli.ts job prepare-operation operation.json --dir /absolute/store
# Use the returned jobId in the remaining commands.
bun cli.ts repair start repair-42 --job sha256:… --checks checks.json --dir /absolute/store
bun cli.ts repair tick repair-42 --dir /absolute/store
bun cli.ts job run sha256:… --dir /absolute/store
# If the result is uncertain, inspect first; this does not contact the provider:
bun cli.ts job inspect sha256:… --dir /absolute/store
# An explicit host action asks only about the already-admitted operation:
bun cli.ts job reconcile sha256:… --dir /absolute/store
bun cli.ts repair tick repair-42 --dir /absolute/store
bun cli.ts repair verify repair-42 --dir /absolute/store
```

`run` submits at most once. Repeating it never performs reconciliation or another
submission. `reconcile` observes the original operation using its original
request and authority binding. Unknown or invalid evidence retains uncertainty
and workspace custody; it does not permit a new job. Inspection, VM ticks, and
offline verification never perform this remote lookup implicitly.

External settlement, patch acceptance, and successful validation remain separate.
The host must still check workspace identity and admitted source, capture the
bounded patch, and run the original independent checks. A settled operation
with an invalid patch is rejected; the host preserves its files and evidence.
Reconciliation appends a resolution and retains the original launch and uncertain
result. It does not rewrite earlier VM receipts or clear an uncertain validation
journal.

## Qualification boundary

The recovery demonstration uses a deterministic durable adapter, a real Git
checkout, separate CLI processes, and a real caller crash after the adapter
retains a terminal result. The repaired output then passes host-owned checks and
both runtimes verify the process history. This proves the host protocol path;
it does not establish that any unqualified live coding provider implements the
required ledger and settlement semantics.

See the [versioned coding-job contract](../spec/v1/coding-job-v2.md) and
[operation wire contract](../spec/v1/coding-operation.md) for exact bounds and
record formats. Neither this interface nor cwd/ACP provides OS confinement.
