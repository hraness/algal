# Coding operation adapter protocol

`algal.coding-operation.v1` is the provider-neutral host boundary implemented by
`src/coding-operations.ts`. It separates one admitted submission from exact,
read-only observation of its retained outcome. It is not a portable VM effect,
a provider SDK, an OS sandbox, or a cryptographic attestation format.

The host explicitly selects a trusted adapter. Its settlement assertion is
trusted custody evidence; parsing and hashing establish structure, integrity and
binding, not whether the adapter told the truth. The existing xcb foreground
transport does not implement this protocol and remains unchanged.

## Identities and admitted configuration

A binding is a closed object with three required fields:

```text
operationId: string
authorityId: string
requestDigest: sha256:<64 lowercase hexadecimal digits>
```

Both identity strings match `[A-Za-z0-9][A-Za-z0-9._:-]{0,159}`. The caller must
retain and reuse `operationId` for the same intended attempt. Preparation must
not silently mint a replacement operation ID. `authorityId` identifies the
particular custody ledger incarnation that owns the deduplication keys, not a
display name, PID, session title, executable path, or account nickname. A restored
ledger that has lost accepted keys must not claim its old authority identity.
Changing namespaces is not evidence that prior work stopped.

`requestDigest` is SHA-256 over the UTF-8 canonical JSON task payload, using the
repository's `digestCanonical`. It excludes the wire envelope and binding's own
digest. The task schema must include every admitted routing, source, prompt and
limit field that affects execution. The v2 coding-job payload is defined in
[coding-job-v2.md](coding-job-v2.md).

A command adapter's closed configuration is:

```text
protocol: "algal.coding-operation.v1"
authorityId: identity
executable: absolute path
argvPrefix: string[]
```

`executable` is nonempty, absolute, at most 4,096 UTF-8 bytes and 4,096 JavaScript
string code units, and contains no NUL, CR or LF. `argvPrefix` contains at most 31
arguments; each contains no NUL and is at most 4,096 UTF-8 bytes and 4,096 code
units. Empty arguments are permitted. The sum of executable and argument UTF-8
bytes is at most 16,384. Arguments are literal argv, never a shell expression.
Configuration is copied when constructing the command transport and the request
authority must match it before dispatch. Executable bytes are not pinned by this
contract; the host must protect its admitted executable and provider custody.

## Commands and request wire format

The transport invokes exactly `[executable, ...argvPrefix, action]`, where action
is the literal `submit` or `observe`. It writes one canonical JSON request on
stdin. No prompt, workspace, or response-derived text is added as executable
argv. The adapter must require that the argv action equals the parsed JSON action.
The exported `parseCodingOperationRequest` validates the JSON form:

```text
{
  contract: "algal.coding-operation-request.v1",
  action: "submit",
  binding: { operationId, authorityId, requestDigest },
  payload: JSON
}

{
  contract: "algal.coding-operation-request.v1",
  action: "observe",
  binding: { operationId, authorityId, requestDigest }
}
```

Every displayed field is required. Unknown fields are rejected. `submit` requires
`payload` and verifies its canonical digest against the binding. `observe`
forbids `payload`; lookup cannot need a task body to decide whether to launch it.

The complete canonical request is at most 1,048,576 UTF-8 bytes. Payload parsing
permits finite JSON numbers only, a maximum depth of 16 with root at depth zero,
at most 16,384 visited values, at most 256 entries per array, at most 64 entries
per object, and at most 256 UTF-8 bytes per object key. Aggregate string/key bytes
and canonical payload bytes are each bounded by 1,048,576. SDK inputs must also
be plain JSON objects or null-prototype JSON objects, not class instances.

The host supplies a deadline of 1–600,000 milliseconds and an output bound of
1,024–1,048,576 bytes. Stdout is capped at that bound before parsing; stderr is
capped at 65,536 bytes and withheld from results. Both streams are drained while
stdin and process exit settle. Pre-aborted requests do not dispatch. A launched
command's timeout, cancellation, invalid output, stream failure or nonzero exit
provides no settlement authority. The command transport reports these failures
as uncertain. Killing and joining that direct child does not establish that its
provider or descendant writers stopped. There is no built-in retry loop.

The SDK seam exposes `submit({binding, payload, signal, timeoutMs,
maxOutputBytes})` and `observe({binding, signal, timeoutMs, maxOutputBytes})`.
Both return `Promise<unknown>` and the host must parse every returned value.
An SDK transport must obey the same custody semantics and must not mutate the
admitted request. SDK cancellation is cooperative; it is not a confinement claim.

## Closed outcome union

Every outcome contains exactly the following common fields plus the fields for
its one state:

```text
contract: "algal.coding-operation.v1"
operationId: identity
authorityId: identity
requestDigest: digest
revision: integer
state: "unknown" | "accepted" | "terminal"
```

All three binding fields must exactly match the admitted operation. Revisions
are bounded by 2,147,483,647. The lower bound is zero for `unknown`, and one for
`accepted` or `terminal`. Revision is an authority record revision, not a host
clock or polling count. The state-specific fields are:

| State | Additional required fields | Meaning |
| --- | --- | --- |
| `unknown` | `reason`: `missing`, `expired`, `unavailable`, or `unresolved` | No settlement authority. |
| `accepted` | `acceptanceRef`: digest | The authority durably registered this exact attempt. |
| `terminal` | `acceptanceRef`: digest; `outcome`: `completed`, `failed`, or `cancelled`; `settlement`: `all-admitted-work-settled`; `result`: object below | The accepted attempt and all admitted work are settled. |

An unknown outcome cannot include `acceptanceRef`, result data or settlement
flags. An accepted outcome cannot include terminal fields. Acceptance does not
prove execution, liveness, successful completion, or patch correctness. A missing
lookup does not prove no work was admitted: an earlier request can still arrive.
Expired payloads, unavailable ledgers and stale records cannot release custody.

A terminal result is a closed object:

```text
text: string
digest: sha256 of text encoded as UTF-8
length: exact UTF-8 byte length of text
```

`length` is an integer from zero through the host output bound; empty text is
permitted. `digestText(text)` and `Buffer.byteLength(text, "utf8")` must match
exactly. The entire canonical outcome, including JSON overhead, must fit the
host output bound, which itself cannot exceed 1 MiB. Proof metadata is the whole
outcome with only `result.text` removed; its canonical size must not exceed
4,096 bytes. Result bytes therefore do not receive a separate extra 1 MiB budget.

`acceptanceRef` is the immutable identifier/digest of the authority's admission
record. This protocol carries its reference, not its contents. The authority
must bind it to the same operation, authority and request. A terminal assertion
must establish that every admitted local or remote effect, descendant writer,
and queued operation is settled, with no admitted action that can start later.
A closed immediate PID, echoed flag or content digest alone cannot establish
that guarantee. If the adapter lacks sufficient custody evidence, it must
return `unknown` rather than manufacture a terminal result.

## Monotonic and immutable evidence

Against previously admitted evidence, a new outcome must have a nondecreasing
revision. Equal revisions require identical canonical outcomes. Accepted and
terminal evidence must preserve every previously admitted `acceptanceRef`.
Once terminal evidence exists, only an identical whole terminal envelope is
valid, including its revision, outcome, result text, digest and length.

A terminal response may be valid without any locally retained acceptance: the
submission acknowledgement may have been lost. An intermediate unknown outcome
must not erase an earlier accepted binding. A host retaining several witnesses
must compare new evidence with all of them, or equivalently retain both the
strongest acceptance binding and latest revision. The parser's `previous` option
checks one witness; it is not a history store.

The authority must durably bind an operation key to its request before admitting
work. Repeated submission of that key and binding must not launch another worker;
a different binding must fail. This is an adapter obligation, independently of
ALGAL's stricter submit-once host behavior. Acceptance keys and terminal identity
must survive restart and payload expiry. An authority that cannot retain them
must refuse new admissions rather than forget live deduplication keys.

This protocol has no recovery mutation, cancellation command, session search,
namespace reset, or definitive never-started operation. An ordinary lookup miss
cannot close a delayed submission. Adapters must not translate `observe` into
submit, resume, retry, cancel or custody release. ALGAL cannot enforce these
semantics inside an arbitrary executable; adapter qualification and host custody
remain required before operational use.
