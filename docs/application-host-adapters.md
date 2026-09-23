# Application hosts and storage adapters

`ApplicationCore` runs the durable application lifecycle against an explicit
`ApplicationStorage` port and trusted `ApplicationAdmission` policy. The existing
`ApplicationService` API wraps that same core with filesystem storage. Existing
application directories and operation records keep their wire format.

```ts
import { ApplicationCore } from "@hraness/algal/application-core";
import { MemoryApplicationStorage } from "@hraness/algal/application-storage";

const storage = new MemoryApplicationStorage();
const application = new ApplicationCore(storage, {
  async admitCommit(context) {
    // The host must check its artifact, memory, capability and evidence policy.
    await ownerPolicy.admit(context);
  },
});
```

This is a host integration sketch: `ownerPolicy` is deliberately supplied by the
embedding host. Merely verifying a content digest does not admit a revision or
grant effect authority. Omitting `admitDispatch` disables dispatch admission.
Use the filesystem `ApplicationService` for a persistent local host; the memory
adapter is volatile and loses its state when the process exits.

## Storage obligations

A store of immutable artifacts alone is insufficient. A storage adapter also
owns atomic mutable heads, immutable operation identities, dispatch records,
bounded namespace allocation and one writer for each application.

| Boundary | Required behavior |
| --- | --- |
| Reads | Distinguish absence from corrupt records; do not recreate missing evidence. |
| Writer custody | Serialize every owner of an application through the complete lifecycle callback, including asynchronous admission and dispatch. |
| Publication | Reserve bounded capacity, then preserve each individual durable write even if a later step fails. |
| Operation identity | Reject conflicting reuse; recover an identical prepared operation without inventing a second transition. |
| Dispatch | Persist the started record before the external call; reconcile uncertain outcomes explicitly. |
| Limits | Enforce application, state, record and storage bounds before publication; do not silently evict retained evidence. |

Never wrap the entire lifecycle callback in a database transaction that rolls
back a previously persisted dispatch marker. An external action may have already
happened. Likewise, copied artifacts and dispatch receipts do not transfer a
writer lease or permission to perform the action again.

The filesystem adapter retains its owner leases and namespace quota. The cloud
adapter uses the Durable Object's writer queue and SQLite, explicitly flushing
each publication boundary. Its conformance cases include interrupted prepared
operations, published heads, uncertain dispatch, concurrent writers and quota
failure. Recovery archives preserve evidence while keeping dispatch disabled.

## Portability boundary

The application core's import graph avoids eager filesystem and Bun SQLite
dependencies. The qualified Cloudflare host still uses `nodejs_compat`, an
injected expression WASM module and host-supplied storage. This does not qualify
the full lifecycle in a browser. Browser applications can render captured views
and submit typed, revision-bound commands to a local or hosted authority.

The supported injection API is `setExprExports` and its `EvalExports` type from
`@hraness/algal/expr`. The exact committed artifact is exported as
`@hraness/algal/algal_expr.wasm`. A trusted host instantiates that module and
injects its exports before parsing or executing expressions. How a bundler
imports a WASM module remains host-specific. An application manifest cannot
replace the evaluator or invoke this host API; the cloud shim identifies its
vendored evaluator by its exact byte hash.

The [marketing workbench](malleable-workbench.md) demonstrates captured view,
signal and inference evidence. [Local triage](local-triage.md) uses the same
lifecycle for persistent task facts, schema migration, sessions and explicit
fork conflicts. Their bounded admission policies are examples, not a universal
policy permitting arbitrary application code or effects.
