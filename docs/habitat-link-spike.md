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
- `POST /m/:h/:capability` — deliver a `habitat-message` envelope with the
  existing idempotency-key semantics.

The worker uses the existing tenant owner check. A native peer profile will
replace that ambient tenant credential with a signed audience-bound grant.

## Non-goals

There is no global process registry, shared mutable CAS, distributed
transaction, exactly-once external effect, automatic remote program install,
or public discovery registry in this spike.

