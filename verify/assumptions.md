# Assurance assumptions and supported profiles

These are preconditions, not established theorems. Property records name the applicable assumptions explicitly. No property is release-claimed merely because its record passes schema validation.

| ID | Assumption and obligation |
| --- | --- |
| A-SPEC | The reviewed versioned specification expresses the intended behavior. Contradictions require specification review, not weakening a failing theorem. |
| A-TOOLS | Bun, Rust/LLVM, WebAssembly, the OS, allocators, standard libraries and admitted dependencies execute their documented semantics. Proof tools add their own explicitly recorded trusted bases. |
| A-HASH | SHA-256 collision resistance and the implementation are trusted for identity. Hashes establish neither authorship, fact truth, anti-rollback nor provider attestation. |
| A-HOST | The admitted host supplies declared signatures, deterministic pure functions where required, finite nonnegative costs, bounded values and terminating callbacks. Arbitrary host code is outside the pure-core guarantee. |
| A-LOCAL | Cooperating processes share one coherent local filesystem and respect lock/lease protocols. Hostile same-user file mutation, network filesystems and privileged attackers are excluded unless separately qualified. |
| A-FSYNC | Successful file and directory persistence barriers have the documented durability/order semantics on a qualified filesystem. Process termination does not test machine power loss. |
| A-SQLITE | SQLite transactions exclude cooperating contenders and release on process death under the qualified filesystem and SQLite build. Path/inode/schema identity must still be checked by callers. |
| A-FAIR | Conditional progress additionally assumes fair scheduling, eventually available resources/providers, terminating callbacks and finitely many relevant failures. Deliberately blocked uncertain writes do not promise progress. |
| A-REMOTE | An external adapter obeys its qualified identity, acknowledgment, idempotency and cancellation contract. A timeout or missing local response never establishes remote rollback. |
| A-FACTS | Selected facts and observations are inputs, not automatically truths. A derivation establishes consequence only from the exact admitted facts/program. Missing support means unknown. |
| A-RESEARCH | A research-admission host explicitly trusts the pinned seal verifier, its complete ordered attempt journal, and separation of holdout data from generation/selection. The supplied study verifier needs its own conformance evidence; an arbitrary configured callback is an assumption, not a proved verifier. A signature does not establish provider truth. |
| A-CLOCK | Host clocks are nondeterministic external inputs. Clock eligibility is outside canonical VM receipts; clock rollback and advance need explicit event-service handling. |
| A-ARTIFACT | A tested binary/tool artifact is identified by its actual bytes and relevant build inputs. Source identity and copied runtime metadata alone do not identify executed bytes. |
| A-BROWSER | Cooperating same-origin browser clients share the qualified IndexedDB transaction and Web Locks semantics. Browser storage may be cleared or evicted; reload evidence does not establish machine power-loss durability. Service-worker scope, cached assets, worker termination and optional WebGPU execution require exact-browser qualification. Hostile same-origin scripts are excluded. |
| A-LEAN | The pinned Lean kernel and explicitly allowed transitive axioms are trusted. No sorryAx, custom axiom, native_decide/compiler axiom or unreviewed library axiom is allowed in a release claim. |
| A-TLC | TLC explores exactly the declared finite configuration to completion; constraints, overrides, symmetry, fingerprints and reachability are disclosed. A finite model is not a parameterized theorem or a production refinement proof. |
| A-KANI | The pinned Kani/CBMC translation and solver are trusted, with successful unwind/overflow/panic/reachability checks over the actual harness. Reduced constants cannot stand in for production constants. |
| A-CLOUD | Hosted tenant, transaction, fencing, outbox, metering and restore assumptions require a separate algal-cloud implementation and operational assurance case. Core claims do not qualify the hosted system. |

## Profiles

- `pure-core`: admitted in-memory contract values and deterministic host/oracle inputs; no filesystem or provider claim.
- `local-process`: cooperating local processes; process death, retained uncertainty, namespace limits and explicit reconciliation.
- `local-machine`: the local-process profile plus qualified persistence semantics and volatile/durable publication ordering. No actual power-loss qualification exists yet.
- `offline-evidence`: bounded supplied artifacts with isolated replay; no ambient-state authority or authenticated producer claim.
- `adapter`: one exact adapter/runtime/platform and an explicitly stated local-fixture or live-provider qualification. No generic provider correctness claim.
- `hosted`: inventoried only; excluded from core release guarantees until a separately scoped hosted case is delivered.

## Value and failure domains

Foreign JSON text and admitted normalized values are separate domains. Noncanonical valid JSON may normalize; malformed UTF-8, duplicate-key behavior, lone surrogates, number spelling, negative zero and UTF-16 ordering require explicit cross-runtime policy/vector evidence. A mathematical real-number model cannot replace finite IEEE-754 semantics. Existing bounds in the source are included in the governed dependency closure; each small proof/model bound must be separately recorded when that harness is admitted.

A failure can occur before an effect, after an effect but before acknowledgment, after durable publication, or during a failed persistence barrier. Only evidence for the exact boundary may classify it. Missing result evidence is not permission to retry a write, clear custody, refund a reservation or revive a consumed message. Work units are accounting, with the documented post-activation checks; they are not wall time, memory or a strict pre-dispatch spending ceiling.

## Composition and drift

Every property currently has an unestablished production relation unless explicitly upgraded with checked evidence. Passing claims validation only establishes that the inventory is well formed and its source snapshot is current. The conservative dependency inventory covers the complete governed runtime/spec/build/workflow surface, including indirect dependencies; changing any file invalidates it. Updating hashes requires reviewing affected claims and discarding invalid results, never merely relabeling old output as current.

Per-property source mappings identify the primary modules, with whole-module scope where a narrower symbol map has not yet been reviewed. The conservative global closure intentionally over-invalidates instead of assuming those primary maps are complete. Tool/checker changes similarly invalidate affected evidence. Public wording comes only from a record's licensedClaims, which is empty for an unstarted obligation.
