# Habitat Link spike

This document freezes the first implementation seam for cross-habitat ALGAL
communication. It is a protocol spike, not a public compatibility promise.

## Scope

`algal.habitat-link.v1` carries durable, typed, content-addressed messages and
invocations between independently hosted habitats. A habitat owns its store,
processes, mailboxes, executors, capabilities, and admission policy. A remote
operation never receives ambient network access and never mutates another
habitat's state directly.

The first steel thread uses HTTP and the existing cloud tenant authentication.
The envelope and state machine are transport-independent. Iroh and Valhalla
adapters can carry the same records later.

## Records

All records use canonical JSON, reject unknown keys, and are bounded before
parsing. Large bodies are represented by origin-qualified CAS references.

### `algal.habitat-descriptor.v1`

```json
{
  "contract": "algal.habitat-descriptor.v1",
  "habitat": "h_<32 lowercase hex>",
  "key": "sha256:<64 lowercase hex>",
  "protocols": ["algal.habitat-link.v1"],
  "transports": [{"kind":"http","base":"https://…"}],
  "expires": 0
}
```

`key` identifies the descriptor signing key in the spike. The cloud adapter
authenticates the request with its existing tenant bearer credential; a later
profile adds detached signatures without changing the record identity.

### `algal.habitat-invocation.v1`

```json
{
  "contract": "algal.habitat-invocation.v1",
  "operationId": "<32 lowercase hex>",
  "sender": {"habitat":"h_<32 lowercase hex>","principal":"<safe id>"},
  "target": {
    "application":"<safe id>",
    "entrypoint":"<safe id>",
    "manifest":"sha256:<64 lowercase hex>",
    "interface":"sha256:<64 lowercase hex>"
  },
  "args": {},
  "reply": {"kind":"poll","reference":"<safe id>"},
  "terms": {"maxWork": 100000, "maxAgentCalls": 4, "maxBytes": 262144, "maxHops": 4},
  "grant":"sha256:<64 lowercase hex>"
}
```

`operationId` is caller-chosen and supplies retry identity. The canonical
request digest covers every other field. A retry with the same operation and
terms returns the retained acceptance; a changed body is a conflict.

The target habitat validates the manifest and interface against its retained
CAS before admission. The spike maps an admitted invocation to an existing
process deployment and returns a durable status record. It does not implement
transparent remote `spawn`.

### `algal.habitat-acceptance.v1`

```json
{
  "contract":"algal.habitat-acceptance.v1",
  "operationId":"<32 lowercase hex>",
  "invocation":"sha256:<64 lowercase hex>",
  "status":"accepted",
  "target":"h_<32 lowercase hex>",
  "process":"<safe id>",
  "replayed":false
}
```

The receiver persists the invocation before returning `accepted`. `accepted`
means durable admission only. It does not mean the target started or finished.

### `algal.habitat-result.v1`

```json
{
  "contract":"algal.habitat-result.v1",
  "operationId":"<32 lowercase hex>",
  "invocation":"sha256:<64 lowercase hex>",
  "status":"accepted|running|suspended|complete|failed|uncertain|cancelled",
  "process":"<safe id>",
  "outputs": {},
  "receipt":"sha256:<64 lowercase hex>"
}
```

`uncertain` is never inferred to be safe to retry. Cancellation is a request
to the target and cannot retract an already-started external effect.

### `algal.habitat-message.v1`

```json
{
  "contract":"algal.habitat-message.v1",
  "messageId":"<32 lowercase hex>",
  "sender":{"habitat":"h_<32 lowercase hex>","principal":"<safe id>"},
  "recipient":"cap:mailbox-send:sha256:<64 lowercase hex>",
  "body": {},
  "grant":"sha256:<64 lowercase hex>"
}
```

The existing mailbox ingress remains the durable delivery implementation. A
future remote acceptance record distinguishes `accepted`, `started`, and
`settled`; mailbox acceptance never claims that an agent read the message.

## HTTP profile

The cloud worker exposes:

- `POST /v1/habitats/:h/habitat-link/invocations` — submit an invocation;
- `GET /v1/habitats/:h/habitat-link/invocations/:operationId` — read its status;
- `POST /v1/habitats/:h/habitat-link/messages` — deliver a `habitat-message`
  envelope; the target resolves the envelope's grant before retaining
  anything and answers an `algal.habitat-message-acceptance.v1` record
  naming the delivery. The message id is the idempotency key.
- `PUT /v1/habitats/:h/habitat-link/grants` — enroll a signed grant.

The worker uses the existing tenant owner check. A native peer profile
replaces that ambient tenant credential with the signed audience-bound grant
below.

## Signed authority

`src/habitat-link-authority.ts` adds two signed records over Ed25519 with the
existing canonical-JSON digest as the signed payload.

### `algal.habitat-descriptor.v1` (signed)

The descriptor above is wrapped as `{ descriptor, publicKey, signature }`.
`descriptor.key` must equal the digest of the public key, so the identity
a peer quotes is the key that signed it. A caller `connect`s a signed
descriptor only when its public key is already in the caller's trusted set.

### `algal.habitat-grant.v1`

```json
{
  "contract":"algal.habitat-grant.v1",
  "issuer":"h_<32 lowercase hex>",
  "subject":{"habitat":"h_<32 lowercase hex>","principal":"<safe id>"},
  "audience":"h_<32 lowercase hex>",
  "permissions":["invoke"],
  "application":"<safe id>",
  "entrypoint":"<safe id>",
  "interface":"sha256:<64 lowercase hex>",
  "terms":{"maxWork":1000,"maxAgentCalls":0,"maxBytes":4096,"maxHops":1},
  "notBefore":0,
  "expires":500,
  "nonce":"<safe id>",
  "publicKey":"<base64>",
  "signature":"<base64>"
}
```

A grant is issued by the target habitat, names one subject (habitat and
principal), one audience, and a ceiling on terms. `invoke` grants may pin an
application, entrypoint, and interface digest; `message` grants may not.
Verification checks the signature, the validity window against host-supplied
logical time, the audience, the enrolled key set, the permission, and, when a
request is supplied, that the request carries this grant's digest, that its
sender is the subject, that its target matches any pinned fields, and that its
terms (or message body bytes) stay inside the ceiling. Every gate is
independent and fails closed.

## Host integration

`src/habitat-link-host.ts` connects the records to processes on both ends.

### Caller

`HabitatLinkService` holds trusted descriptors, admitted grants, and a ledger
of outstanding operations. `admit({ capability, grant })` mints a
`habitat-invoke` or `habitat-message` capability handle whose record carries
the grant digest, so the handle cannot outlive or widen the grant. `tools()`
returns two write tools for organisms:

- `habitat.invoke.v1` takes the peer handle, a `mailbox-send` reply handle,
  the target `application`, `entrypoint`, `manifest`, `interface`, and `args`.
  The operation id is derived from the process idempotency key, so a journaled
  retry submits the same operation and the target replays instead of
  admitting a second process. The tool returns the acceptance.
- `habitat.send.v1` takes the peer handle and a body and delivers a
  `habitat-message` envelope; the message id is derived the same way.

`reconcile()` polls every outstanding operation, verifies that the result
names the pending invocation digest, and on a terminal status writes an
`algal.habitat-link-reply.v1` envelope into the reply mailbox under the
operation as the wake key. The caller's continuation is an ordinary durable
process suspended on `mailbox.receive.v1`; it wakes once, with the peer's
outputs and receipt digest, and never more than once per operation.

Verification of the caller's processes replays retained effects. The link
tools are never called during verification; the host tests replace them with
throwing stubs and verify both the call and the continuation.

### Target

`LocalHabitatAcceptor` is the in-process peer profile. It `enroll`s grants
signed by its own keys, `register`s an application entrypoint as a manifest
with an interface plus host-bound process args (the target's own
capabilities, which a caller can neither supply nor override), and admits
invocations by pinning a durable process named `link-<operationId>` whose
args are the interface inputs. The durable process is the acceptance record:
after a restart the acceptor recognises the pinned process and answers
`replayed: true`, and a reused operation id with a different invocation is a
`RECEIPT_MISMATCH`. Terms above the grant are `CAPABILITY_DENIED`; terms
inside the grant but above the entrypoint's budgets are `BUDGET_EXHAUSTED`.
`getInvocation` projects the process head into a result and names the
target's receipt, which verifies offline on the target with no link.

`sendMessage` verifies the grant against the envelope, then delivers it into
the recipient mailbox with the message id as the idempotency key. Acceptance
means the message is durably in the mailbox; reading it is a separate
transition the recipient owns.

### Delivery states

- `submitted`: the caller's ledger has the operation, but no acceptance was
  retained. A journaled process that died here is `uncertain`; the kernel
  refuses to re-run the write, and `reconcile()` asks the target about the
  same operation id instead of resending.
- `accepted`: the target retained the invocation and pinned a process.
- terminal (`complete`, `failed`, `cancelled`, `uncertain`): the reply
  envelope is delivered once and the operation leaves the ledger.

`src/habitat-link-host.test.ts` runs two habitats in one process through
this profile: invoke, suspend, deliver, resume, replay under a lost
acknowledgement, operation-id reuse, every authority gate, message
acceptance before read, and restart from durable state on both ends.

## Non-goals

There is no global process registry, shared mutable CAS, distributed
transaction, exactly-once external effect, automatic remote program install,
or public discovery registry in this spike.

