# Phase 01 boundary repair evidence

This phase repairs concrete counterexamples before formal models rely on the
affected admission boundaries. It is regression evidence, not a universal
implementation proof. The complete claim ledger remains conservative.

## Reproduced defects and compatibility

| Boundary | Before repair | Required repaired behavior |
| --- | --- | --- |
| Foreign dictionary membership | Missing `constructor` ports, responses and expectations could resolve through `Object.prototype`; own `__proto__` decision entries could disappear | Only own declared keys satisfy membership; accepted own data keys survive; identifier grammar stays unchanged |
| Imported case binding | Foundry/benchmark verifiers could accept cases outside producer admission; foundry receipts could substantiate changed reported inputs | Share per-case admission and bind mapped declared inputs to the executed receipt |
| Benchmark result population | A genuine two-case report could repeat the first result, omit the second, recompute its digest and still verify | Each system result covers every declared workload case exactly once; result order is irrelevant |
| Input aliases | Two names targeting one port used insertion order; canonical serialization could change replay despite an unchanged report digest | Explicit canonical name ordering in both runtimes, including nested execution, generators and imported report verification |
| Imported evaluation policy | A genuine four-case foundry report was accepted under `maxCases: 3` by both application verifiers and activation admission | Producer, verifier and activation enforce the same case predicate; four cases remain accepted at limit four |
| File JSON decoding | Bun store/host readers decoded malformed UTF-8 with replacement, including overwritten duplicate members | Fatal decoding rejects malformed bytes without replacing retained evidence; correctly encoded U+FFFD remains valid |
| Native memo winner | A fresh second writer returned its proposed receipt immediately, while a reopened store returned the first disk receipt | Writable stores cache the validated retained winner; malformed retained/proposed receipts reject |
| Expression indices | Native and WASM saturated out-of-range indices to different `usize` maxima, changing full error records | Compare against bounded list length before narrowing; render the original canonical number with unchanged fuel |

Escaped lone surrogates in valid UTF-8 JSON remain supported by existing Bun
storage and replay paths. They are outside the native/shared-expression
portable Unicode-scalar domain. Duplicate keys retain last-member semantics;
native rejects a lone surrogate even in an overwritten member. The repair
does not tighten the global Bun value domain. Leading BOMs still reject.

Native readonly stores and explicit replay overlays intentionally retain
local in-memory first-wins shadowing, without changing backing files. The
persistent memo winner claim does not conflate a local overlay with the
shared disk cache.

The corrected wide-index error is a semantic bug fix. Historical receipts
containing the old saturated detail may fail replay with the fixed evaluator;
their bytes are preserved, and reproducing that historical execution requires
its original evaluator. Sharing Rust source never licensed target equality
without artifact and target qualification.

Conflicting input aliases have the same historical compatibility limitation:
their former insertion order was not represented by the canonical digest.
The repaired rule is canonical name order with the last supplied alias
winning. A native positive control refuted the initial assumption that
`serde_json::Map` iteration was sorted: dependency feature unification enabled
insertion ordering in the actual build. Both runtimes therefore sort names
explicitly; no correctness argument relies on that dependency feature.

## Completed focused checks

Native commands use explicit Rustup compiler paths, because `rustup run`
alone still selected Homebrew's different Rust ABI through PATH on this host.
Clippy additionally requires the absolute pinned `cargo-clippy` executable and
`RUSTUP_TOOLCHAIN=1.97.1`; pinning `RUSTC` alone did not pin the Clippy driver:

```sh
RUSTC="$(rustup which --toolchain 1.97.1 rustc)" \
RUSTDOC="$(rustup which --toolchain 1.97.1 rustdoc)" \
rustup run 1.97.1 cargo <arguments below>
```

| Check | Observed result |
| --- | --- |
| `bun test --timeout 20000 src/application-adaptation.test.ts` | 9 pass, 31 assertions; imported four-under-three regression failed before repair |
| `cargo test --locked -p algal --lib application_adaptation::tests` | 6 pass, including imported four-under-three and canonical alias evaluation/activation |
| `bun test src/store.test.ts src/host-state.test.ts --timeout 20000` | 25 pass, 198 assertions; seven malformed-byte negatives failed before repair |
| `cargo test -p algal --locked --test cache --test file_admission` | Cache 11 pass and file admission 9 pass; winner/malformed-receipt regressions failed before repair |
| `cargo test --locked -p algal --test graph_admission` | 9 pass, including declared/missing constructor, own JSON data and deterministic alias controls |
| `bun test src/bench.test.ts --timeout 20000` | 19 pass, 89 assertions after independently reproduced duplicate-result negative; related foundry/graph/adaptation suite previously 66 pass, 266 assertions |
| `cargo test --locked -p algal --test foundry --test bench` | Foundry 10 and benchmark 10 pass after independent red imported-case, alias and duplicate-result controls |
| `cargo test --locked -p algal-expr` | 37 pass; new native wide-index error regression failed before repair |
| `ALGAL_EXPR_TOOLCHAIN=1.97.1 sh scripts/build-expr-wasm.sh` | Rebuilt committed WASM; artifact provenance/reproducibility gate remains Phase 03 |
| `bun test --timeout 20000 src/expr.test.ts` | 17 pass, 104 assertions; new WASM wide-index error regression failed before repair |
| `cargo build --locked -p algal-expr --example verification_boundary` | Native byte-entry-point driver built with pinned compiler |
| Supervised `bun verify/boundary/run.ts` | 30 full-response comparisons, including malformed raw bytes and positive/negative static checks |
| `bun scripts/compilation-parity.ts` after native build | Shared DAG rejected in both runtimes; ordinary semantics and cross-verification agree |
| `bun scripts/schema-parity.ts` after native build | 15 cases, 30 comparisons, 3 input-boundary cases, 30 successful and 36 failed cross-verifications, 36 failed self-verifications |

No provider calls were needed. These focused receipts do not replace the
repository-wide final integration gate. The integrated phase checkpoint is recorded in the execution log after
convergence. The native foundry/benchmark/graph/adaptation lane totals 35
focused passing cases; strict pinned Clippy and rustfmt also pass.

The benchmark duplicate-result defect was independently reproduced in both
runtimes with two genuine receipt occurrences. Per-system result uniqueness,
existing result count and workload membership now enforce exact coverage.
Ordinary and reordered complete reports remain valid. Broader standalone
foundry cross-candidate population equality still needs separate adversarial
verification; application evaluation already checks its exact frozen populations. Native many-port admission also has a source-observed
4096-item cap absent from Bun's byte-bounded checker. These are tracked for
the later corpus/admission phases, not silently treated as proved by these
per-case repairs.

## Independent review

Expression review checked the bound needed before conversion (`MAX_LIST_LEN`
1024), the other narrowing operations (`get`, `take`, `drop`), unchanged ABI
exports/signatures and 228 additional full-response comparisons (four
operations, three list lengths, nineteen index/type inputs). No mismatch was
observed. This is sampled agreement, not independence from shared source bugs.

Storage and imported evaluation changes received separate source/test review.
The boundary harness review found and corrected lossy child-output decoding,
overbroad trailing-whitespace stripping, missing outer WASM deadline and
unbounded artifact reads. The supervised driver now checks regular bounded
artifacts, fatal UTF-8 output, exactly one framing LF and the complete fixed
vector inventory. Negative probes reject extra output LF, missing/empty
summaries and a claimed comparison count without its observations.

The complete native mapping review covered foundry inputs and generators,
benchmark execution and verification, nested graph input mapping and
adaptation case extraction. The alias benchmark canonical digest agrees
between runtimes: `sha256:6e443cc8309db86594d91a8f8ec6966b79896e5645ee045e8beb7d9eb0365e0a`.
The final formatted evaluator artifact is
`sha256:04fd82c3dba660b1a8eaee4541647f75e7b23e348a76f1610e3ad34d2a9f22eb`
(253227 bytes); the independent 228-vector comparison was refreshed against
these exact bytes.
