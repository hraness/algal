# `verify/expr` — `algal.expr.v1` verification lane

Phase-10 lane for the expression evaluator. It compares four artifacts on
the same inputs and asserts agreement at three different strengths:

| Artifact | Role |
|---|---|
| `src/algal_expr.wasm` | The committed evaluator — `crates/algal-expr` compiled to `wasm32-unknown-unknown`. Driven raw over the FFI (`algal_alloc`/`algal_eval`/`algal_check`/`algal_dealloc`/`memory`). |
| `src/expr.ts` (`evalProgram`, `checkProgram`) | The production Bun loader — the JSON envelope, fuel plumbing, packed-return decode and host error mapping. |
| `verification_boundary` | The same Rust evaluator built as a native test binary; reads `{"program","env","fuel"}` / `{"program","names"}` from a file and prints the response verbatim. |
| `verify/expr/model.ts` | An **independent TypeScript mirror of the Lean semantics** (`verify/lean/Algal/Expr/{Model,Eval}.lean`), including the ordered charge trace, `replay`, `evalFuelled` and `run` envelope bounds, plus `checkMirror` — a mirror of the production static check used only to classify a case's relation. |

The Lean model is authoritative for what the mirror *should* do; the Rust
implementation is authoritative for what production *does*. Where they
disagree the suite records a named divergence instead of hiding it (see
**Modelled subset and exclusions**).

## Suites

* **`expr-conformance`** (`conformance.test.ts`) — semantic agreement.
  For each catalog case the suite asserts, in order:
  1. **wasm ≡ native** — the raw `algal_eval`/`algal_check` response bytes are
     identical to the `verification_boundary` file-driver output.
  2. **wire ≡ pin** — `expect` pins match on `ok`/`err` code + fuel exactly,
     with values compared through canonical rendering (object key order and
     signed-zero bit patterns are invisible on the wire by design).
  3. **model agreement** — when `checkMirror` admits the program and no
     excluded op occurs (`three-way`), the model must produce the identical
     outcome (canonical value + fuel). When a case is intentionally outside
     the modelled subset (`wasm-native`), an explicit `model` pin — `mok` /
     `merr` — states exactly what the model does instead.
  4. **wrapper fidelity** — `evalProgram` through `src/expr.ts` reports the
     same ok/code/fuel as the raw bytes.
  Plus: catalog-integrity invariants (determinism, ≥200 cases, admission,
  per-op and per-`EXPR_*`-code coverage floors), model self-consistency
  (signed-zero bit patterns, UTF-16 ordering, canonical key order, fuel
  replay, the `quote` gap), a per-case fuel sweep (`used−1`/`used`/`used+1`
  asserting `EXPR_FUEL` below the needed charge and response invariance above
  it), and a `verification_lean_vectors` cross-check of canonical number
  rendering.

* **`expr-abi`** (`abi.test.ts`) — boundary evidence for the committed
  module. Module admission (exact export surface incl. signatures, zero
  imports, compile rejection of non-modules, missing-export calls throw),
  allocator/memory boundary (`algal_alloc(0) → null`, `dealloc(0, n)`
  harmless, write/decode round-trip, memory-growth buffer re-read), null /
  zero-length / out-of-bounds pointer behavior (typed null result or trap —
  never a fabricated response), packed `hi32:lo32` return decoding, fresh-
  instance determinism, eval/check envelope admission on raw bytes (44 + 8
  authored cases: malformed JSON, envelope shapes, strict `fuel` u64
  spelling, surrogate escapes, invalid UTF-8, depth), 60 seeded byte
  mutations that must fail closed, fuel pass-through and `EXPR_FUEL`
  `(cost,left)` detail pins, the native driver's input byte bound, and the
  product CLI lane (`algal check` on a good/bad manifest — rejection reports
  on **stderr** with a nonzero exit).

## Modelled subset and exclusions

Modelled ops — everything the Lean evaluator implements:
`add sub mul div neg min max abs floor ceil round clamp`, `lt lte gt gte
eq neq`, `and or not if let get`, `list len nth concat map filter fold
contains reverse take drop flat unique keys values merge has`,
`slen sconcat upper lower trim split join scontains starts ends`,
`isText isNum isBool isList isMap isNull`, `quote`.

Explicit exclusions (asserted on the wire, named in the model):

* **`mod`, `sort`, `toText`** — the model reports the model-only
  `EXPR_UNMODELED`; `unmodeled/*` cases pin the production behavior
  (`mod` = truncated `f64 %`, `sort` = `cmp_values` order + length charge,
  `toText` = canonical render + length charge) and assert wasm ≡ native.
* **`quote`** — a real model *gap*, not an exclusion: Lean dispatch has no
  `quote` arm, so the model reports `EXPR_OP` where production returns the
  payload. `gap/*` cases pin production and pin `EXPR_OP` for the model, so
  the divergence is visible rather than smoothed over.
* **Static `check` vs eval asymmetry** — production runs `check` before
  `eval`; the model folds the checker's observable envelope bounds into its
  own `run` envelope and applies per-op arity checks at dispatch.
  `reject/*` cases pin the wire response (always the checker's verdict at
  fuel 0) and pin the model's *eval-level* outcome exactly (e.g. a `map`
  with a non-string binder binds the empty name and fails `EXPR_PATH` at
  used 9 — production `check` rejects the same program `EXPR_PARSE` at 0).
  Check-rejected programs are always `wasm-native` relations; a `"agree"`
  pin on such a program throws.
* **Check-level envelope bounds** — `boundary-depth-{16,17}`,
  `boundary-nodes-513`, `boundary-bytes-over`: the wire rejects inside the
  static check while the model's run-level bound reports the same
  `(code, fuel)` — pinned as `merr("EXPR_BOUNDS", 0)`, not `"agree"`.

## Fuel and bounds coverage

The model mirrors the production charge trace exactly (base costs, per-arg
charges, count-then-charge list ops, per-key `merge` charges, per-compare
`contains`/`unique` charges, string-byte charges on `sconcat`/`join`/`split`/
`scontains`/`starts`/`ends`/`upper`/`lower`/`trim`, the `node + 2·steps`
`get` base, the `eq`/`neq` node-count charge, binder-scope push/pop and the
post-eval `value_bytes` check on every node). The `boundary/*` family
exercises every declared limit at `bound−1`/`bound`/`bound+1`:
fuel budget `[0, 1_000_000]`, program depth 16, program nodes 512, program
bytes 16384, string-bytes 65536 (including the output-render interaction: a
65536-byte string passes string-bytes but its canonical quoting exceeds
output-bytes), list-len 1024 (`concat`/`split`), object-keys 256 (env and
literal), env bytes 262144, env depth 32, output-bytes 65536 and
output-depth 32.

## What this is — and is not

* This is **sampled correspondence, not proof**. The lane demonstrates that
  the committed WASM artifact, the Bun wrapper, the native driver and the
  independent model agree bit-for-bit (wire level) or exactly (model level)
  on a deterministic corpus of 234 eval/check programs + 52 authored
  envelope byte-shapes + 60 seeded mutations. It does not establish that
  production implements the Lean model; that linkage is explicitly open
  (`verify/lean/Algal/Expr/SCOPE.md`, "no mechanized link to Rust or
  wasm32").
* The independent model is a TypeScript mirror of the Lean semantics;
  fidelity to `Model.lean`/`Eval.lean` is by inspection, and the
  `verification_lean_vectors` cross-check pins the canonical number codec
  between the native Lean-vector generator and the JS renderer.
* Number byte accounting in the model is conservative (`numberByteBound`
  = 24 per number; exact canonical rendering is unproved). Inside this
  lane's bounds (programs ≤ 16 KiB, envs ≤ 256 KiB, list-len ≤ 1024) the
  over-count cannot reach `maxValueBytes = 262144`, so no case can observe
  the conservatism — it is a documented model property, not a test result.
* Native artifacts are bound by sha256 at suite start and re-pinned on each
  call; they resolve from `~/.local/share/algal-verify/merged/artifacts/`
  unless overridden via `ALGAL_EXPR_<NAME>_BIN`
  (`ALGAL_EXPR_VERIFICATION_BOUNDARY_BIN`,
  `ALGAL_EXPR_VERIFICATION_LEAN_VECTORS_BIN`, `ALGAL_EXPR_ALGAL_BIN`).
* A zero-length request is inexpressible over the raw FFI (`algal_alloc(0)`
  returns null; `algal_eval(p, 0)` returns the null packed result → host
  `EXPR_FAILED`). The document-level `EXPR_PARSE` for empty input is
  reachable only through the native file driver; `env-empty`/`check-empty`
  assert the FFI contract on the wasm side and the `EXPR_PARSE` pin on the
  native side, rather than pretending the surfaces coincide.

## Files

| File | Contents |
|---|---|
| `model.ts` | Independent evaluator mirror: admission (`admit`), canonical rendering, bounds, charge-trace `run`/`evalFuelled`/`replay`, `checkMirror`, exclusion/gap sets. |
| `generate.ts` | Deterministic xorshift32 program/env generator (seeded corpus, byte mutations). |
| `catalog.ts` | 234-case corpus: `seeded`/`corner`/`boundary`/`reject`/`unmodeled`/`gap` families, wire pins, model pins, `admitCase` classification. |
| `harness.ts` | Artifact binding (sha256), fresh wasm instances, the raw alloc/write/pack/decode/dealloc call, native driver invocation, response projection and pin assertion. |
| `abi.ts` | `expr-abi` byte fixtures: 44 eval envelopes, 8 check envelopes, seeded mutations. |
| `conformance.test.ts` | `expr-conformance` suite. |
| `abi.test.ts` | `expr-abi` suite. |

## Verification commands

```sh
bun test verify/expr/                          # the whole lane (43 tests)
bun test verify/expr/conformance.test.ts       # expr-conformance only
bun test verify/expr/abi.test.ts               # expr-abi only
```

Measured on this tree: 43 tests, 2405 assertions, ~40 s; catalog 234 cases
(84 seeded + 150 authored), 206 three-way, 28 with explicit model pins;
envelope 44 eval + 8 check cases, 60 byte mutations, all wasm ≡ native.
Native artifacts come from the merged artifacts directory (sha256-pinned);
without them the native legs cannot run — the suite fails loudly rather than
degrading to wasm-only.
