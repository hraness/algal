# ALGAL correctness and formal-verification audit

Date: 2026-09-23. Status: audit and proposed work, not a certification or completed proof.

Implementation plan: [Formal verification plan](formal-verification-plan.md).

## Recommendation

Build a compositional assurance case for ALGAL. Use TLA+ to examine the state transitions that govern custody, recovery, effect dispatch, mailbox delivery, and application evolution. Use Lean for small mathematical semantics and independently checked derivations. Connect both to production with direct Rust verification, generated adversarial inputs, trace conformance, crash tests, and artifact provenance.

The immediate priority is to settle concrete admission and durability gaps before claiming that a model describes a correct implementation. A successful proof about a parallel model is useful, but does not by itself prove either runtime. The intended end state is a catalog of exact guarantees, each with explicit assumptions and executable evidence tied to the shipped source and artifacts.

“The entire system is correct” needs a specification and an environment. A practical strong claim is: for admitted programs and host implementations satisfying named contracts, the implementation preserves specified safety properties, produces verifiable execution evidence, and makes progress under stated availability and fairness assumptions. This leaves model truth, arbitrary host code, operating-system isolation, and arbitrary external exactly-once effects outside the claim.

## Inspected state and scope

| Repository | Snapshot | Audit depth |
| --- | --- | --- |
| ALGAL | HEAD a86327f76f6e632fe7fceda17b738a749a341ab6, branch site/hero-tokens; initially clean | Core implementation, contract prose, test/parity infrastructure, durability, authority, memory, evaluation, adapters, release |
| ALGAL integration reference | Locally known origin/main a1b4817d374214370fc59d22e752df6b9152070e | Same Git tree as inspected HEAD: f19f7381f80ee7745f0faa0e9e3e8eb0d43a8bfe |
| Valhalla | Checkout 28c2db2812ff82e989a95384dba4d9a3ac537d69; additional inspection of locally known origin/main ba00721c07078f5e5aca3bd879941287a417c0b7 | Verification artifacts, production relationships, Hegel/Kani/Verus practices and CI |
| xcb | a7f089789b5f7882260e2213784ac0fb8d3a212f | Bounded inspection of custody tests and qualification evidence |
| qmd | 1496cb7e99ab7f49c3cb2b56ee842f508f6382b3 | Bounded inspection of real process concurrency and runtime/CI coverage |
| algal-cloud | 56cf4abbc782a930652124604f4711593a0f1039, feat/portable-backups | Adjacent architecture, protocol/verification documentation, package surfaces; not a full cloud implementation audit |
| algal-bio | a712fbec69bd03b10c20d8078b478c38734d9c02 | Inventory only; not part of the foundation proof claim |

No remote fetch was performed; remote-tracking refs are local observations, not a statement of current GitHub state. ALGAL had 147 tracked files under src/, 48 under crates/algal/src/, 21 under crates/algal/tests/, 13 v1 specification documents, 29 scripts, and 89 TypeScript test files across the repository. This is a broad audit by semantic boundary, not a claim that every source line was independently verified. Site presentation, live providers, hostile-OS attacks, and cloud production state were not qualified.

Three independent audit lanes examined the core, durable state, and verification precedents. Integration examined memory, evaluation, adapters, release identity, and the combined claims. No runtime implementation was changed and no new formal toolchain was installed.

## Evidence actually executed

On Bun 1.3.14:

    bun test --timeout 20000 src/property.test.ts src/values.test.ts src/expr.test.ts src/verify.test.ts src/foundry.test.ts src/bench.test.ts src/semantic.test.ts

Result: 60 passed, 0 failed, 909 assertions, seven files. This is a focused baseline, not the repository aggregate gate.

Additional bounded probes reproduced:

1. An undeclared inherited port named constructor admitted by the TypeScript graph compiler.
2. An application evaluation containing four cases accepted by verification and activation admission under maxCases = 3, despite rejection by the evaluator.
3. Invalid UTF-8 bytes in a FileStore object accepted after replacement decoding.
4. A WASM expression error containing a 32-bit-saturated index for input 4294967296.

These probes exercised public functions with in-memory data or fresh temporary files. They made no external requests, published no application head, and dispatched no live effect. Native counterparts of these probes were not executed. Rust source was inspected for corresponding behavior.

Exact short commands and observed outputs are retained in [probe evidence](formal-verification-evidence/README.md).

No full Rust suite, cross-runtime aggregate, live provider qualification, power-loss experiment, TLA+ model check, Lean proof, Kani run, or Verus run was performed during this audit. Existing test code and CI configuration are evidence of verification infrastructure; they are not fresh passing-run receipts.

The written audit and plan received three independent reviews covering core semantics, durability/authority and verification precedents. Incorporated corrections include identifier grammar, evaluator regeneration ownership, runtime-stamp provenance, sampled versus universal closure, mailbox versus host timers, physical scan bounds, rollback exclusions, proposal transitions and TLC reduction/configuration safety. Final document checks passed for local links, whitespace, 20 Not started phases, required phase fields, acyclic dependency references and existing validation paths. The retained policy reproduction is byte-identical to the executed source.

## What already provides substantial confidence

| Boundary | Implementation and existing evidence | What remains to establish |
| --- | --- | --- |
| Foreign program admission | [contract](../src/contract.ts), [graph](../src/graph.ts), Rust counterparts; manifest/graph/schema admission tests; schema/compilation parity | Admission soundness across all keys, numeric representations, schemas, nested closures, and resource partitions |
| Canonical values and identities | [values](../src/values.ts), [digest](../src/digest.ts), [native canonical](../crates/algal/src/canonical.rs); fixed tests and seeded properties | Exact shared domain, UTF-16/key ordering, finite IEEE-754 numbers, malformed encoding, normalization equivalence |
| Execution | [run](../src/run.ts), [runtime](../crates/algal/src/runtime.rs); kernel, work-budget, branch and suspension tests | Transition preservation, effect isolation, bounded accounting, progress under explicit host assumptions |
| Expressions | One [Rust evaluator](../crates/algal-expr/src/lib.rs) compiled natively and to committed WASM; evaluator tests | Semantics independent of the implementation, native/WASM width behavior, panic boundaries, artifact/source identity |
| Readable source | [source](../src/source.ts), [source projects](../src/source-project.ts), source diagnostics/trace tests; source-inspection parity | Lowering preserves values, selected effects, inputs, failure behavior and inferred bounds |
| Receipts and replay | [verify](../src/verify.ts), [receipt](../crates/algal/src/receipt.rs), isolated replay store; mutation tests | Verification soundness relative to semantics, producer/consumer closure, registry trust, common-mode verifier bugs |
| CAS, effect memo and slots | [store](../src/store.ts), [native store](../crates/algal/src/store.rs); store tests and CLI parity | Consistent first-wins behavior, crash durability, concurrent histories, corruption handling |
| Host custody | [host state](../src/host-state.ts), [native lease](../crates/algal/src/lease.rs); inode/SQLite custody checks | Every operation uses one stable exclusion domain, including first publication and recovery |
| Durable processes | [process](../src/process.ts), [journal](../src/process-journal.ts), Rust counterparts; real crash fixtures and process parity | Exhaustive crash cuts, prefix preservation, uncertainty monotonicity, bounded progress |
| Portable evidence | [process evidence](../src/process-evidence.ts), native counterpart; offline demos/tamper tests | Closed dependencies, exact missing sets, no ambient-state dependence, bounded hostile bundles |
| Capability/mailbox authority | [capabilities](../src/capabilities.ts), [mailbox](../src/mailbox.ts), native counterparts; admission and lifecycle parity | Provenance preservation, revocation/dispatch ordering, crash-safe delivery and deduplication |
| Application lifecycle | [application](../src/application.ts), migration/restoration/episode/quota modules; crash and lifecycle tests | Linearizable expected-head commit through creation cutover, multi-file persistence, old work bindings |
| Memory applicability | [application memory](../src/application-memory.ts), observation/investigation/rollover modules | Scope freshness, evidence-to-authority linkage, conservative conflict/unknown/exhausted statuses |
| Logical query kernel | [memory](../crates/algal/src/memory.rs); derivation and numeric equality tests | Independent derivation checker, positive-Datalog soundness, successful-completion completeness, deterministic witness selection |
| Context projections | [context](../crates/algal/src/context.rs), [tool context](../src/tool-context.ts) | Exact recall, protected-item preservation, source retention, byte-budget guarantees |
| Semantic retrieval | [semantic](../src/semantic.ts), [embeddings](../src/embeddings.ts), Rust counterparts | Source/ranking admission, f32/f64/tie conformance, bounded ingestion, relevance separated from truth |
| Evaluation and adaptation | foundry/search/bench verifiers; adaptation/comparison/proposal/selection tests | Policy completeness at imported-evidence admission, isolated cases, stable ordering, holdout noninterference |
| Tool/provider boundary | gateway/Jev/xcb/ACP, credential and I/O tests | Contractual purity/cost, cancellation/uncertainty, byte/deadline limits, protocol versions, qualification matrix |
| Host event delivery | [host-events](../src/host-events.ts) and its tests; host-side dueAtMs/poll delivery to mailboxes | Clock eligibility, cancellation and retained send state; distinct from the VM scheduler, which recognizes mailbox readiness rather than timers |
| Coding workflows | coding-jobs, coding-operations, repair, GitHub/shepherd; subprocess/recovery fixtures | Exact repo/ref/worktree binding, no retry after ambiguous mutation, subprocess custody, adapter conformance |
| Distribution | [native release](native-release.md), [release workflow](../.github/workflows/release.yml), package/installer tests | Proof coverage bound to exact release inputs, WASM rebuilding, provenance/authenticity distinct from hashes |
| Hosted extension | algal-cloud habitat/broker/store-client/metering/egress | Separate distributed protocol and operational qualification; core proofs do not transfer automatically |

## Findings to resolve before stronger claims

### F01 — Reproduced: inherited names bypass TypeScript source-port existence

[graph.ts](../src/graph.ts), outputPortType around lines 40–47, reads a port through ordinary property lookup. A valid identifier constructor can therefore resolve Object.prototype.constructor when the declared outputs have only actual. A JSON destination accepts the resulting path in graph admission (around line 342).

The in-memory probe returned admitted: true with sourceOwnPorts: [actual]. Native graph storage uses map membership rather than JavaScript prototype inheritance. Existing constructor-name parity cases concern actual own keys; they do not establish rejection of inherited keys.

Impact: a basic prerequisite for a graph type-safety theorem is currently false at this TypeScript boundary. This is not evidence that the probe gained host authority. Repair should cover every foreign-key dictionary lookup, preserve declared constructor ports and prototype-shaped own keys in JSON data, and add generated missing/present-key parity cases. The current port identifier grammar excludes __proto__; preserving JSON data keys does not mean widening that grammar.

### F02 — Reproduced: evaluation verification omits the policy case limit

[application-adaptation.ts](../src/application-adaptation.ts) checks case count in evaluateApplicationRevision at line 317. verifyApplicationEvaluation around lines 332–360 replays reports and recomputes acceptance without repeating that policy predicate; acceptance around lines 282–296 checks work and model calls but not maxCases.

A public-API MemoryStore probe used a policy with maxCases = 3 and four frozen cases. The evaluator refused it. A genuine runFoundry report for the same pure incumbent/candidate, with correctly bound request and compatibility records, was then accepted by both verifyApplicationEvaluation and admitApplicationActivation:

    {"policyMaxCases":3,"actualCases":4,
     "evaluatorError":"Error: Evaluation case set exceeds policy bound",
     "verifierVerdict":"accepted","activationAdmitted":true}

Reproduction source is retained in [evaluation-policy-repro.txt](formal-verification-evidence/evaluation-policy-repro.txt). Copy to a temporary .ts file and run with Bun from any directory; its fixture imports this checkout by absolute path. No actual lifecycle activation was committed.

The Rust implementation has the same apparent construction/verification asymmetry; native behavior was not executed. Repair the shared admission predicate and test imported, correctly hashed evidence that violates each policy field. Rehashing a malicious record is not an attack on SHA-256; the verifier must reject its semantics.

### F03 — Reproduced: FileStore replaces malformed UTF-8

[store.ts](../src/store.ts):214 decodes with Buffer.toString("utf8") before JSON parsing; [host-state.ts](../src/host-state.ts):39 has a similar decoding boundary. Writing bytes [34,255,34] at the CAS filename for the canonical replacement-character string made FileStore.getValue accept that string. Native read_json uses serde_json::from_slice and is expected to reject invalid UTF-8.

This is a wire-admission/canonicalization-domain mismatch, not a hash collision. Add raw-byte differential vectors for malformed UTF-8, surrogates, duplicate keys, truncation and trailing bytes; document whether noncanonical but valid JSON is admitted and normalized. Do not accidentally tighten a wire contract without compatibility review.

### F04 — Static counterexample: application creation changes lock identity

[application.ts](../src/application.ts):180–204 chooses either applications/.creation/pending/APP or applications/APP based on a committed-head check, then releases the shared creation lease before acquiring the chosen per-application lease. [application.rs](../crates/algal/src/application.rs):1047–1118 has the corresponding split.

A candidate schedule is:

1. A creates genesis under the pending lease.
2. B observes no committed head, selects pending, then pauses before acquiring it.
3. A publishes genesis and releases pending.
4. C observes the head and acquires the application lease.
5. B resumes and acquires the different pending lease.
6. B and C can observe the same expected head and enter separate admissions. The quota lock serializes publication but does not recheck that head.

The head check is at [application.ts](../src/application.ts):376; publication is around lines 419–425. A deterministic public-only reproduction needs a selection-to-acquire barrier; this audit did not add one. Treat this as a high-priority, source-supported concurrency hypothesis until the exact schedule is reproduced or an overlooked exclusion rule is demonstrated. The model must include lock-namespace cutover rather than assume one permanent abstract mutex.

### F05 — Observed: directory persistence differs between runtimes

Native [store.rs](../crates/algal/src/store.rs):109–138 syncs temporary file contents but does not sync destination directory entries after hard-link/rename publication. TypeScript [store.ts](../src/store.ts):223–255 syncs the destination directory and root. Some native process paths explicitly sync their object directories; native application commit writes CAS dependencies through application_memory::put_record and then publishes a head through lease::write ([application.rs](../crates/algal/src/application.rs):1709–1717), without an equivalent values-directory sync in that path.

Conversely, TypeScript mailbox writeNew/writeReplace around lines 470–505 and receive around lines 877–879 omit parent-directory syncs that native mailbox performs, including both sides of receive around [mailbox.rs](../crates/algal/src/mailbox.rs):688–692.

The source asymmetries are confirmed. Data loss after a machine crash was not experimentally reproduced. A process SIGKILL test does not simulate loss of unsynced filesystem metadata. Specify separate process-crash and power-loss models; verify dependency-before-head persistence, new-directory creation, revocation, dequeue, cleanup and uncertain acknowledgments under the supported filesystem contract.

### F06 — Static counterexample: native effect cache can disagree with its retained winner

[store.rs](../crates/algal/src/store.rs):489–501 ignores the false result from immutable publish and inserts the proposed receipt into its in-memory cache. get_effect returns that cache before reading disk at lines 460–462. If disk already holds A and a fresh Store proposes B for the same key, its immediate read can return B while a fresh reader returns A. This violates the intended first-wins observation contract.

This follows directly from the inspected control flow; no native executable reproduction was run. Add a two-Store sequential regression before expanding to concurrency. Also align full receipt admission: the native get_effect path currently checks fewer fields than TypeScript parseEffectReceipt.

### F07 — Observed: shared evaluator source is not sufficient artifact or target evidence

[build-expr-wasm.sh](../scripts/build-expr-wasm.sh) selects an installed Rust toolchain unless explicitly overridden and builds without --locked. The inspected [CI workflow](../.github/workflows/ci.yml) tests the committed WASM and native code but does not rebuild and compare the WASM from that source.

One evaluator reduces duplicated semantic implementations, but creates common-mode risk and still has different compilation targets. A WASM probe for nth on an empty list with index 4294967296 returned “index 4294967295 out of range 0”. The f64-to-usize cast at [algal-expr/lib.rs](../crates/algal-expr/src/lib.rs):733–743 predicts a different error index on native 64-bit. Only the WASM outcome was executed.

Pin the build inputs; establish reproducibility or an explicit normalized artifact/provenance contract; compare successes, errors and fuel across targets. Audit unsafe WASM exports and host ABI allocation/pointer/length assumptions separately from Rust-level semantics.

### F08 — Observed contract limitation: maxWork is modeled accounting

[organism.md](../spec/v1/organism.md):688–707 and [work-budget.test.ts](../src/work-budget.test.ts):10–44 deliberately permit a worker activation to incur work before failing the outer budget check. [run.ts](../src/run.ts):552 checks after activation; retry accounting around lines 1388–1410 can encompass multiple attempts. Rust mirrors this order.

Do not prove or advertise units never exceed maxWork. Prove the actual check locations, preservation of spent work through failures/recovery, agent-call limits, and a finite overshoot envelope under admitted host costs and byte bounds. Arbitrary FnRegistry functions and costs are host-supplied ([registry.ts](../src/registry.ts):9–18); purity, termination and sane nonnegative finite costs need explicit admission preconditions. This is a specification clarification and proof obligation, not a demonstrated regression.

### F09 — Proof boundary: raw evaluator and aggregate output closure

The public Rust eval path enters expression operations without the run/check admission wrapper. Operations indexing positional operands therefore rely on prevalidation. No production bypass was found. A panic-free theorem must identify the public API domain or make the low-level path defensive.

Large nested/repeated outputs also need a producer/consumer closure argument: a permitted execution must either produce a receipt accepted by its parser/store/evidence transport, or return a typed bounded failure while preserving already-incurred effects. Per-value and per-manifest limits alone do not imply an aggregate receipt bound. The audit identified this as an unproven obligation, not a reproduced oversized run.

### F10 — Common-mode checking and resource-bound gaps

[memory.rs](../crates/algal/src/memory.rs):508–510 verifies a result by rerunning query. [context.rs](../crates/algal/src/context.rs):85–87 similarly reruns compact. This checks reproducibility but can reproduce a semantic bug. Memory is an especially good target for a small independent derivation checker plus Lean soundness lemmas.

The seeded TypeScript property generator has 200 cases per property, depth at most four, small containers and a narrow numeric/character range. It is useful regression evidence, not broad adversarial exploration or exhaustive checking.

Semantic index ingestion reads full files before checking some byte limits ([semantic.ts](../src/semantic.ts):154–167). The index is derived host tooling, but should still have bounded input admission. Include f32 storage, numerical tie-breaking, malformed vectors and rebuilding corruption in its evidence envelope. This is not a claim that a particular oversized input was tested.

### F11 — Composition and authority remain conditional

Content digests establish identity relative to bytes and a collision-resistance assumption. They do not authenticate an observer, prove a model answer true, or prove that an external write happened. Positive memory derivations are conditional on selected facts; missing support is not falsehood, and first-canonical-witness is not complete truth-maintenance provenance.

Verification depends on admitted function/tool/store implementations. An isolated replay overlay prevents the standard store writes from affecting live slots; it cannot make arbitrary host-supplied callbacks pure. The application VM is not an OS sandbox. Restoration and version changes must preserve old effect custody and cannot erase uncertainty.

The recorded runtime stamp is also not executable provenance. TypeScript verification passes original.runtime back into the rerun ([verify.ts](../src/verify.ts):61), so equality of that field does not establish which executable originally produced the receipt. Supported semantics-version admission and authenticated artifact attribution are separate obligations.

A whole-store rollback to an older internally consistent snapshot can preserve all hashes and history checks. Forward strategy restoration does not provide anti-rollback protection for backups or hostile replacement. Such protection needs an independently retained witness/anchor and is outside the current local-store claim.

### F12 — Observed: retained mailbox custody and storage limit progress

Mailbox mutation uses a pathname lock ([mailbox.ts](../src/mailbox.ts):692–709; native mailbox.rs:479–499), unlike process custody's crash-released SQLite transaction. A killed operation can leave a lock requiring reconciliation. Receive has no operation/idempotency key, so a missing receipt after dequeue cannot safely trigger a generic retry. This is conservative behavior to preserve, not an automatic-recovery guarantee.

Mailbox scans bound admitted matching entries rather than every encountered filesystem entry. Consumed history is retained, and application namespace quota explicitly excludes shared CAS. Formal models must not silently turn these into whole-store bounds or unconditional progress. Phases 05, 06, 08 and 16 cover explicit scan/resource contracts, uncertain receive outcomes, and bounded hostile-residue tests; a whole-store retention/GC protocol needs separate design and data-preservation evidence.

## Lessons from Valhalla and adjacent work

Valhalla combines mechanisms with different scopes:

| Practice | Value for ALGAL | Qualification |
| --- | --- | --- |
| Hegel stateful command sequences, notably ledger recovery tests | Generate operations using live model state; shrink restart/fault counterexamples into deterministic regressions | Random exploration is not universal proof; retain case counts and failing examples |
| Kani spent-nonce production harnesses, pinned 0.68.0 | Prove small admission/codec/arithmetic routines over arbitrary symbolic inputs; keep production constants | Its own instructions explicitly exclude container internals, filesystem atomicity and concurrent redemption |
| Verus ledger reference model | Prove inductive admission invariants without a fixed model-checker unwind bound | The model still uses u64 identities and machine-sized capacity; a production refinement relation is required |
| Executable small models and retained unsafe-policy counterexamples | Demonstrate why custody, delay, evidence or resource rules are necessary | Bound the search and show that deliberately broken policies are detected |
| Frozen vectors and native/WASM comparisons | Make wire semantics reviewable and stable across implementations/targets | Correlated code, shared evaluator bugs and unexercised inputs remain possible |

The precedent also supplies warnings. The inspected Valhalla verification documentation understates the CI-wired spent-nonce pilot. Its separate journal Kani harness uses one constant all-zero oversized buffer, which does not establish a universal byte-parser property. The Verus workflow paths do not cover all production ledger changes, and the reference append does not mirror every production hash-validation/capacity detail. ALGAL should transfer the layered method and explicit scope discipline, while closing these drift and refinement weaknesses.

Relevant Valhalla entry points are AGENTS.md, docs/verification.md, verify/, crates/vhalla-ledger/tests/recovery_hegel.rs, crates/vhalla-native/, crates/vhalla-journal/, and .github/workflows/rust.yml and verification.yml. The detailed phase plan requires exact source-to-property mappings, not an informal analogy.

Immutable evidence at the inspected reference:

- [Verus ledger invariant and append model](https://github.com/hraness/valhalla/blob/ba00721c07078f5e5aca3bd879941287a417c0b7/verify/ledger.rs#L148), compared with [production append validation](https://github.com/hraness/valhalla/blob/ba00721c07078f5e5aca3bd879941287a417c0b7/crates/vhalla-ledger/src/lib.rs#L172).
- [Spent-nonce Kani harnesses](https://github.com/hraness/valhalla/blob/ba00721c07078f5e5aca3bd879941287a417c0b7/crates/vhalla-native/src/spent.rs#L217) and [pinned CI invocation](https://github.com/hraness/valhalla/blob/ba00721c07078f5e5aca3bd879941287a417c0b7/.github/workflows/rust.yml#L375).
- [Hegel ledger recovery](https://github.com/hraness/valhalla/blob/ba00721c07078f5e5aca3bd879941287a417c0b7/crates/vhalla-ledger/tests/recovery_hegel.rs#L37) and [faultable journal histories](https://github.com/hraness/valhalla/blob/ba00721c07078f5e5aca3bd879941287a417c0b7/crates/vhalla-journal/src/tests.rs#L639).
- [Constant-input journal Kani harness](https://github.com/hraness/valhalla/blob/ba00721c07078f5e5aca3bd879941287a417c0b7/crates/vhalla-journal/src/lib.rs#L1161) and [reference-proof workflow triggers](https://github.com/hraness/valhalla/blob/ba00721c07078f5e5aca3bd879941287a417c0b7/.github/workflows/verification.yml#L8).
- [Device-recovery policy enumeration and unsafe variant](https://github.com/hraness/valhalla/blob/ba00721c07078f5e5aca3bd879941287a417c0b7/prototypes/device-recovery-policy/model.py#L65), [independent Python encoding vectors](https://github.com/hraness/valhalla/blob/ba00721c07078f5e5aca3bd879941287a417c0b7/prototypes/witness-vectors/verify-vectors.py#L12), and [native/WASM byte comparison](https://github.com/hraness/valhalla/blob/ba00721c07078f5e5aca3bd879941287a417c0b7/prototypes/discovery-parity/verify.cjs#L9).

The bounded sibling survey found no existing tracked TLA+ or Lean implementation to import wholesale from the inspected Valhalla/xcb/qmd snapshots. ALGAL's existing design already borrows useful boundaries from Oh/Wordcell (facts versus authority), Gobstopper (source-preserving projections) and xcb (external operation custody). Reuse their contract lessons, without importing private corpora or assuming their guarantees transfer.

xcb's qualification builder treats missing/unreadable exit evidence as failure and binds the tested executable; its custody tests require an independently witnessed process stop. qmd's concurrency tests use real child processes and verify persisted invariants; its wrapper tests ensure a Node claim actually invokes Node even when Bun runs the test. These are valuable operational evidence patterns, not formal proofs. The inspected paths are xcb/qualification/build-receipt.ts, xcb/test/cli-sandbox-auth.test.ts, qmd/test/store-concurrency.test.ts and qmd/test/bin-wrapper.test.ts.

## Tool choice and trust

| Technique | Recommended responsibility | Claim ceiling |
| --- | --- | --- |
| TLA+ / TLC | First choice for state machines, interleavings, stale writers, uncertain effects, restart and fairness | Completed exhaustive search of named finite models, under their abstractions; simulation is weaker |
| Lean | Semantic definitions, inductive preservation, memory derivation soundness, expression/core lemmas | The stated theorem under audited axioms; separate implementation-linkage evidence required |
| Kani | Direct checks of small production Rust functions, bit-width arithmetic, bounded codecs/admission | All inputs in the actual harness domain, with successful unwinding and reachability checks |
| Hegel plus deterministic examples | Stateful real-implementation histories, recovery faults and minimized counterexamples | The generated/executed histories; useful complement to model and source proofs |
| Coverage-guided fuzzing and differential testing | Raw parsers, compilers, expressions, receipts, bundles, transport and numeric/Unicode edges | Bug discovery and conformance evidence, not proof of absence |
| Aeneas-to-Lean feasibility pilot | Translate a small pure Rust routine and prove its relation to the semantic model | Translation/library models join the trusted base; do not assume whole-crate support |
| Verus fallback | Rust-local deductive verification if the chosen pure core fits better | Track external bodies, assumptions, callers' preconditions and Rust/LLVM trust |
| Apalache / TLAPS | Later, where TLC scale or parameterized invariants justify another tool | Bound-limited search differs from induction; TLAPS safety capabilities do not imply general liveness proof |

TLC distinguishes full model checking from random simulation and exposes action profiling, useful for detecting disabled transitions and vacuous invariants. Record its fingerprint settings and collision estimates as part of the result. [TLC documentation](https://tla.msr-inria.inria.fr/tlatoolbox/doc/model/tlc-options-page.html)

Lean's axiom audit is transitive: a theorem can depend on sorryAx through another theorem. Native evaluation broadens the trusted base. Export and check the axioms of every release claim, rather than grepping only local source for sorry. [Lean proof validation](https://lean-lang.org/doc/reference/latest/ValidatingProofs/), [Lean axioms](https://lean-lang.org/doc/reference/latest/Axioms/)

Kani unwinding assertions establish whether the chosen loop bound covers the harness domain; an undetermined result is not success. [Kani loop unwinding](https://model-checking.github.io/kani/tutorial-loop-unwinding.html)

Aeneas translates a supported Rust subset through Charon and has a Lean backend; missing external functions require models. Its support and ALGAL's toolchain/dependencies must be tested in a bounded pilot. [Aeneas source documentation](https://github.com/AeneasVerif/aeneas)

Verus has explicit mechanisms for assumptions and external bodies and does not verify Rust/LLVM itself. [Verus trusted components](https://verus-lang.github.io/verus/guide/tcb.html), [Verus overview](https://verus-lang.github.io/verus/guide/)

Apalache's bounded search only covers the chosen length, while inductiveness is a separate obligation. TLAPS documents support for safety proofs and a temporal-reasoning boundary. [Apalache model checking](https://apalache-mc.org/docs/tutorials/symbmc.html), [TLAPS](https://proofs.tlapl.us/doc/web/content/Home.html)

## Assurance structure and environment assumptions

The dependency chain is:

    Intended behavior and failure model
        -> precise contracts and property ledger
        -> TLA+ transition specifications + Lean semantic definitions
        -> direct-code proof / explicit implementation conformance evidence
        -> fault, adversarial, differential and package checks
        -> exact-source release evidence
        -> bounded deployment/provider qualification

Every arrow needs evidence. Generated test vectors provide sampled conformance, not a universal refinement theorem. Trace replay checks observed executions, not all possible future executions. A proof of serialization injectivity concerns the admitted normalized value domain; SHA-256 injectivity over arbitrary values is not a possible theorem.

Keep an explicit trusted-base inventory:

- Specifications and independently reviewed theorem statements.
- Lean kernel, allowed axioms, proof tooling; Kani/CBMC or Verus/SMT where used; translators and foreign-function models.
- Rust/LLVM and Bun/JavaScript/WebAssembly implementations, allocator, standard libraries, SQLite and serialization/number-formatting dependencies.
- Cryptographic collision resistance and correct hashing implementation.
- Filesystem semantics, successful persistence barriers, coherent local locking, permissions and process identity. Network filesystems and hostile same-user mutation are separate profiles.
- Host registry purity, signatures, costs and implementation identities; Store/Executor/Transport/MemoryAdmissionHost contracts.
- External providers' idempotency, acknowledgment and recovery capabilities. A timeout never proves a write did not occur.

Separate safety from liveness. A process awaiting a human decision, an unreconciled write, a full namespace, or an unavailable provider may correctly remain blocked. Conditional progress requires explicit scheduler fairness, stable availability, sufficient resources, terminating callbacks and finitely many relevant failures. Sorted bounded scheduling is not automatically starvation-free.

## Exhaustive obligation inventory for the plan

| IDs | Obligation family | Principal deliverable |
| --- | --- | --- |
| ADM-01..04 | Closed foreign schemas; own-key membership; normalized limits; malformed-byte rejection | Admission corpus and soundness relation |
| VAL-01..05 | Canonical equivalence; numeric domain; UTF-16/UTF-8 behavior; object ordering; digest domain separation | Shared vectors and semantic lemmas |
| GRF-01..05 | Port compatibility; joins; guard availability; child closure/depth; dynamic-spawn restrictions | Graph well-formedness and preservation |
| EXE-01..06 | Determinism; selected-branch effects; failures; nested execution; finite internal progress; accounting/overshoot | Small-step semantics and scheduler model |
| EXP-01..05 | Static admission; fuel; typed results/errors; intermediate allocation bounds; native/WASM ABI equivalence | Lean core and target conformance |
| SRC-01..04 | Binding/scope; import closure; lowering semantics; inferred budget/depth validity | Source-to-manifest conformance/proof boundary |
| RCP-01..06 | Request/executor/runtime binding; complete-field comparison; offline isolation; cache semantics; closure; tamper rejection | Verifier assurance and independent oracle |
| STO-01..05 | Immutable CAS; first-wins memo; mutable slots' stated consistency; corruption rejection; dependency persistence | Store model and implementation histories |
| CUS-01..04 | Stable exclusion domain; creation cutover; stale owner rejection; fail-closed recovery | Custody model and barrier regressions |
| PRO-01..07 | Intent-before-dispatch; retained prefix; uncertain write blocking; explicit reconcile; generation lineage; creation recovery; schedule progress | Process/journal model and crash cuts |
| CAP-01..04 | Host origin; exact classes; no implicit widening/minting; revocation linearization | Authority preservation and negative tests |
| MBX-01..05 | Payload-bound idempotency; dequeue/cursor durability; wake readiness and retained locks; bounded physical scans/capacity; cancellation/revocation | Mailbox model and persistence tests |
| APP-01..07 | Expected-head commit; operation idempotency; dispatch identity; quotas; migration; restoration; pending old work | Application models and conformance |
| MEM-01..07 | Fact admission; scope freshness; Datalog derivation soundness; successful completeness; witness policy; conservative statuses; rollover retention | Independent checker, Lean lemmas, state histories |
| CTX-01..03 | Protected context; exact recall; source preservation and byte bounds | Projection laws and provider-input checks |
| RET-01..03 | Bounded derived index; deterministic ranking under numeric profile; retrieval grants no authority | Retrieval differential/fuzz fixtures |
| EVO-01..06 | Case isolation; complete policy admission; holdout noninterference; deterministic selection; immutable lineage; changed-head rejection | Evaluation proof obligations and imported-evidence mutants |
| HST-01..07 | Adapter admission; cancellation; uncertainty; secrets; subprocess lifecycle; installed capability identity; host-event timer eligibility/delivery | Host conformance and qualification matrix |
| PKG-01..05 | Locked builds; WASM source link; source/proof/artifact binding; safe installation; preserved rollback data | Release assurance record |
| CLD-01..07 | Tenant isolation; fencing; outbox leases; settlement; metering; alarms; backup/restore activation guards | Separate hosted assurance case |

This inventory is exhaustive over the identified public foundation boundaries, not a proof that no unknown requirement exists. Phase 0 turns the ranges into individually stated properties, owners, assumptions, dependencies, and evidence. Newly discovered requirements must extend it.
