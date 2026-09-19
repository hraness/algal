# What distinguishes ALGAL

ALGAL's useful combination is a typed program format, bounded execution,
content-addressed evidence, and portable process checkpoints. A manifest is
JSON data: the host can inspect, hash, compose, generate, and admit it before
execution. Model judgments are bounded cells inside that program. A process
can wait for an external message and continue from recorded effects under a
new CLI invocation.

None of these individual ideas establishes uniqueness. Durable execution,
effect replay, checkpointing, and approval workflows have substantial prior
art. ALGAL's claim is narrower: the same small program and evidence contracts
join program evolution, execution, and offline verification across its
TypeScript and Rust runtimes.

## A concrete use

The [process VM demonstration](vm.md) runs an evidence review, records a
proposal, exits, waits for an approval, and resumes without invoking the
recorded decision again. Approval authority stays in a host-admitted mailbox;
the model can recommend but cannot approve. A denied actor completes without
publishing. The report measures actual subprocess invocations, verifies all
completed actor receipt generations, and can demonstrate both directions of
TypeScript/Rust handoff.

The fixture makes two decision invocations across two actors, versus four
when the same program restarts without a checkpoint. It demonstrates avoided
work under that restart policy, not better intelligence or superiority over
another durable runtime. Its local command adapter returns scripted data and
incurs no provider charges.

## How the pieces reinforce each other

- **Programs are values.** A manifest digest identifies the typed graph and
  its declared bounds. Generated candidates use the same admission path as
  hand-written programs, so evaluation and promotion can retain exact source
  identities instead of informal prompt versions.
- **Effects are explicit.** Model calls and tools have recorded requests and
  outcomes. Replay reconstructs orchestration using those outcomes, and a
  resumed process only invokes effects beyond the recorded prefix.
- **Authority is admitted by the host.** Capability ports retain their exact
  classes. A manifest cannot mint a mailbox handle from a constant. The host
  decides which tools and executors are available and which capabilities enter
  the process.
- **Execution evidence is portable.** Process records, manifests, and receipts
  have canonical representations. The local store can be handed between the
  two runtime implementations, and recorded generations can be checked without
  the original provider.
- **The outer process is bounded too.** A named process has a generation
  budget. Waiting does not require a model polling loop. Dispatch uncertainty
  remains visible rather than triggering an automatic external-action retry.

These properties are useful together when a model-generated workflow needs
admission, durable execution, and later inspection. They are unnecessary
machinery for many single-call applications.

## Neighboring systems

| System or abstraction | Established capability | ALGAL's design choice |
| --- | --- | --- |
| [Temporal workflows](https://docs.temporal.io/workflows) | Workflow histories reconstruct state and reuse recorded activity results during replay. | Typed JSON manifests and canonical execution receipts are the shared program/evidence format. ALGAL's local supervisor is much smaller in operational scope. |
| [LangGraph persistence](https://docs.langchain.com/oss/python/langgraph/persistence) | Checkpointers preserve graph state for continuity, interruptions, human review, and fault tolerance. | A data-only graph contract and independent TypeScript/Rust runtimes support the demonstrated local handoff and offline replay. |
| [WebAssembly isolation](https://bytecodealliance.org/articles/security-and-correctness-in-wasmtime) | Runtime-enforced memory and control-flow isolation restrict untrusted machine code. | ALGAL interprets bounded graph/expression data but does not isolate its host tools or command executors. An OS or Wasm sandbox is a separate host concern. |

The comparisons identify design choices, not missing capabilities in other
products. They do not establish that an equivalent design could not be built
on another workflow system. Sources were consulted on 2026-09-19.

## Evidence and trust

A matching receipt replay establishes internal consistency under the admitted
runtime, graph, and tool signatures. Content addressing detects changes
relative to an expected digest. Neither property is a cryptographic proof of
external execution, a provider attestation, an approval signature, or evidence
that the model's answer is true.

Typed graphs and bounded expressions reduce the executable surface, but
admitted functions, executors, storage, and capability custody are part of the
trusted host. Do not infer that an arbitrary manifest is safe to execute with
arbitrary tools. Distributed durability, general crash reconciliation, and OS
isolation remain outside the current process VM.
