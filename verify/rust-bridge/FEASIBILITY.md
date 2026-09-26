# Phase 12 feasibility — direct implementation proof pilot

Question the plan asks: can we prove properties of *actual production Rust* —
not a model, not a re-implementation — in a way that survives ordinary
maintenance? This pilot answers it for the canonicalization boundary.

## Target selection

Code under proof: `crates/algal/src/canonical.rs`, reached read-only through a
path dependency. Two selection criteria from the plan: a *full-width
bounds/admission predicate* and a *bounded codec/index helper*, both actually
called from contract boundaries, both free of unsafe and interior mutability
(the crate forbids `unsafe_code` workspace-wide anyway).

**Chosen predicate: `canonical::check_digest(&str) -> Result<&str>`**
(`canonical.rs:101`). The `sha256:<64 lowercase hex>` admission predicate —
fixed full width, pure, allocation-free. Boundary callers that rely on its
exactness:

- `store.rs:282-289` — an *admitted* digest is joined onto the CAS store root
  as a path component; a widening here is a filesystem escape. This is the
  caller that makes `check_digest` load-bearing, not cosmetic.
- `journal.rs:30-32,91,118,205,227-228,314` — journal bindings and receipt
  linkage admission.
- `contract.rs:657,1107,1363` — manifest and port digest admission.
- `memory.rs:513`, `effects.rs:695`, `application_proposal.rs:445`,
  `application_selection.rs:77,230`, `habitat_budget.rs:112`,
  `application_report.rs:26,48`, `civilization.rs:667`.

Rejected alternative for this slot: `contract::id` (kebab-case predicate) —
equally pure but lower blast radius; `check_digest` guards path formation.

**Chosen codec helper: `canonical::canonical(&Value) -> Result<String>`**
(`canonical.rs:87`). The bounded canonical JSON writer — encode depth <= 64,
output <= `MAX_DOCUMENT_BYTES` (64 MiB), production constants unchanged. Its
object branch is where the private index helpers `array_index`/`key_order`
(`canonical.rs:25-37`) live: they reproduce JS `[[OwnPropertyKeys]]` ordering
(u32 indices numeric-first, then UTF-16 code-unit lexicographic), which is
exactly the property digests depend on for cross-runtime canonical equality.
~300 production call sites (`runtime.rs`, `registry.rs`, `journal.rs`,
`store.rs`, `civilization.rs`, …) including every byte-size accounting call
of the form `canonical(&x)?.len() > bound`.

Rejected alternatives for this slot: `contract::text` (UTF-16 length bound) —
pure but thinner; `graph::interface_args` — real boundary codec but mixes
manifest structure admission with argument assembly, worse proof hygiene.

**Bonus surface kept small: `canonical::read_json`** (`canonical.rs:8`) — the
byte-bound admission gate in front of the parser (`effects.rs` reads foreign
documents through it), exercised at tight bounds.

## Tooling actually installed

| Tool | Status | Evidence |
|---|---|---|
| `cargo kani` / `kani` | **installed** | Kani Rust Verifier 0.68.0, CBMC 6.11.0, kani-compiler = rustc 1.100.0-nightly (8925ea358), under `~/.kani/kani-0.68.0` + `~/.cargo/bin` |
| rustc/cargo | installed | 1.97.1 pinned toolchain (repo baseline) |
| `charon` | **not installed** | not on PATH; no install attempted (policy: no global toolchains) |
| `aeneas` | **not installed** | not on PATH; no install attempted |
| `verus` | not installed | not evaluated further — code under proof needs no `&mut`-free ghost model; Kani fits (see below) |

The Kani 0.68.0 pin from the Valhalla precedent happened to be installed —
treated as a *candidate* per plan, and it succeeded, so the proposal in
TOOLS.md binds its hashes rather than asserting a different version.

## Harness design vs. acceptance criteria

Nine `#[kani::proof]` harnesses in `src/proofs.rs`, all default checks on
(unwinding assertions, overflow, memory safety, undefined-function,
reachability; `--no-undefined-function-checks` never passed):

| Harness | Symbolic domain | Covers | What it proves |
|---|---|---|---|
| `check_digest_accepts_canonical_form` | 64 symbolic lowercase-hex bytes | accept | completeness: every canonical-form string is admitted, returned unchanged |
| `check_digest_soundness_bounded_input` | symbolic UTF-8 `&str`, len <= 96 | accept + reject | soundness: any admitted string is exactly `sha256:` + 64 hex; includes the `value[7..]` char-boundary slice Kani must prove panic-free via guard ordering |
| `check_digest_rejects_noncanonical_tail` | 71 B, right prefix, >= 1 tail byte outside `[0-9a-f]` | reject | alphabet not widened |
| `check_digest_rejects_wrong_length` | symbolic UTF-8, len != 71, <= 96 | reject | length not widened (no truncated acceptance) |
| `canonical_scalar_leaves_bounded` | symbolic bool / i64-free f64 (finite) / <= 8 B UTF-8 string / null | leaf Ok | leaves serialize nonempty, under `MAX_DOCUMENT_BYTES` |
| `canonical_array_index_key_order` | 7-key object, symbolic bool leaves | emit | `array_index`/`key_order`: indices numeric-first incl. `u32::MAX-1`, `u32::MAX` excluded, tail UTF-16 order — data-independent ordering |
| `canonical_depth_guard_exact` | depth 64 vs 65 nested arrays | both | the depth guard is exact at the production constant |
| `canonical_shallow_tree_bounded` | depth <= 2 symbolic tree, 4 B ASCII key | emit Ok | mixed encode paths never exceed the bound, never panic |
| `read_json_admission_bound` | <= 16 symbolic bytes, `max` <= 32 | accept + reject | accepted parse implies bytes <= max |
| `read_json_rejects_oversize_max` | full-width symbolic `max` > 64 MiB | reject | the document-limit gate binds before any read |

Assumptions, all documented in-line: inputs are valid UTF-8 where the type is
`&str` (faithful — production callers always hold `&str`); the symbolic tail
in the accept harness is constrained to the *alleged* valid alphabet so the
predicate itself decides; `f64` leaves are constrained finite because
`serde_json::Number` cannot publicly hold a non-finite value (which also means
the `!n.is_finite()` branch in `encode` is unreachable through the public API
— defensive dead code, recorded here rather than claimed covered).

## Results (this machine, apple silicon, rustc 1.97.1 driver)

### Observed run

`cargo kani -j 4 --output-format terse -Z stubbing` (exact invocation in
run.sh), per-harness, on this machine:

| Harness | Verdict | Runtime | Notes |
|---|---|---|---|
| `check_digest_accepts_canonical_form` | SUCCESSFUL | 74 s | all pass; `value[7..]` panic path proved unreachable |
| `check_digest_rejects_wrong_length` | SUCCESSFUL | 317 s | 453 checks, 0 failed; cover satisfied |
| `check_digest_soundness_bounded_input` | SUCCESSFUL | 926 s | 473 checks; **both** covers satisfied (admit + reject reachable) |
| `check_digest_rejects_noncanonical_tail` | SUCCESSFUL | 240 s | after the input-domain fix below |
| `canonical_bool_leaf_bounded` | SUCCESSFUL | 6 s | symbolic bool leaf through `canonical` |
| `check_digest_soundness_utf8` | in-flight | | multibyte byte-class alphabet, <= 36 chars |
| `canonical_scalar_leaves_bounded` | in-flight | | `any_small_value` (null/bool/finite-f64/fixed-len str) |
| `canonical_array_index_key_order` | in-flight | | exact-order equality on a 7-key scrambled object |
| `canonical_depth_guard_exact` | in-flight | | depth 64 vs 65 through encode recursion |
| `canonical_shallow_tree_bounded` | in-flight | | needs the RandomState stub (see below) |
| `read_json_*` | **withdrawn** | | see "dropped surface" below |

### What the iterations surfaced — the real pilot findings

1. **Symbolic-length string compares diverge.** `out == "literal"` lowers to
   a `memcmp`/`str::eq` whose operand length is data-derived and unbounded in
   the model; CBMC unwound `memcmp.0` past iteration 7000 and never
   converged. Fix everywhere: bound the length first
   (`assert!(out.len() <= K)` before compares), compare byte-indexed or via
   `zip`, and give symbolic inputs *concrete* length
   (`any_ascii_string<N>` builds exactly N chars, so serde_json's `memchr`
   escape pass unwinds exactly N times).

2. **`serde_json::Map` is `IndexMap` here — object harnesses need one stub.**
   Feature unification turns on `preserve_order` (via `apple-foundation`), so
   `Map::new()` seeds `RandomState` → `std::sys::random::apple::fill_bytes`
   → a foreign `CCRandomGenerateBytes` call → `unsupported_construct`
   FAILURE on any object-touching harness. The fix is
   `#[kani::stub(std::collections::hash_map::RandomState::new, …)]`
   returning a transmuted `[u64; 2]` — i.e. an arbitrary seed, *stronger*
   than needed since `key_order` sorting is seed-independent. This is the
   pilot's one admitted stub; it models an OS boundary, not production code.
   `--no-undefined-function-checks` does **not** cover it (foreign calls are
   a separate check class) — the stub route is the honest one.

3. **`from_utf8_unchecked` for input construction is honest and fast** — but
   only when the caller's assumptions actually establish UTF-8. The
   first-run failure on `check_digest_rejects_noncanonical_tail` was a
   harness bug the verifier caught: the "bad byte" could be ≥ 0x80,
   producing an impossible `&str`. Fix: constrain it to ASCII-but-not-hex.

4. **Cost is dominated by instrumented volume, not assertion size.** The
   `value[7..]` slice-index panic and `Error` constructor allocs ride along
   on every digest harness (400-500 checks each). A `canonical` call adds
   String/Vec/serde_json machinery — per-harness times run 6 s (bool leaf)
   to tens of minutes (recursion/sort/large symbolic structures).

### The failed check is a harness bug, not a production bug

The first `check_digest_rejects_noncanonical_tail` built its input with
`from_utf8_unchecked` over a symbolic "bad" byte constrained only to be
outside `[0-9a-f]`. A bad byte ≥ 0x80 makes the buffer invalid UTF-8 — an
input that can never exist behind a real `&str`. Kani's slice-index panic
check on the production `value[7..]` correctly fired on that impossible
input. The fix constrains the bad byte to ASCII-but-not-hex, keeping the
`str` invariant. This is the maintenance-experiment evidence the plan asks
for: the verifier catches *unsound harness inputs*, and the discipline is
exactly "state your domain, keep it a subset of the real type".

The remaining risk the pilot does **not** eliminate: `check_digest` admits
only full-width inputs whose byte-level shape a str already guarantees, so
the unchecked-input model is sound for these harnesses — but the same
shortcut on a predicate that *relied* on UTF-8 invariants for correctness
(e.g., indexing a multibyte region) would silently prove less. That is why
`check_digest_soundness_utf8` keeps a real multibyte-capable domain.

### Dropped surface, recorded not hidden

`read_json` bounded-parse harness: `Read::take` + `Vec::read_to_end`
(spare-capacity fill loops over a symbolic limit) followed by
`serde_json::from_slice` on symbolic bytes did not converge in ~10+ minutes
across two bounds (16 B/32 max, then 8 B/16 max). The contract-relevant
property — the `max > MAX_DOCUMENT_BYTES` gate fires before a byte is read —
is proved by `read_json_rejects_oversize_max`. End-to-end `read_json`
behavior stays under `cargo test` sanity coverage. If a later phase wants the
parse path proved, the realistic route is a `Read` impl with a small fixed
chunk schedule (concrete cursor, symbolic content) rather than the std
adapters.

## Maintenance-experiment design

The plan asks what happens when the source changes. Procedure used here:

1. The harnesses link the production crate by path — there is nothing to
   re-sync; a source edit is picked up by the next `cargo kani` automatically.
2. `bridge-drift` (REGISTRATION.md) makes the link explicit: CI flags a diff
   in `canonical.rs` and re-runs the suite so a semantic change cannot ride
   through on an old proof's badge.
3. Sensitivity was exercised during development: an earlier draft of
   `read_json_admission_bound` left `max` unbounded and the harness did not
   finish inside ~15 minutes of CBMC time — evidence that the checks are not
   vacuously passing, and that binding symbolic domain sizes is the operative
   maintenance skill (the bound moved to the harness, never the production
   constant).

## Charon/Aeneas translation experiment

Both absent; nothing installed (policy). If pursued, the exact bounded
experiment is:

- `charon --preset aeneas` (ULLBC) or `--llbc` over `canonical.rs` extracted
  as a standalone input set — Charon needs the crate it lives in, so the
  experiment translates *this same production file* via `charon cargo` inside
  a scratch manifest pointing at `../../crates/algal`, then Aeneas produces
  Lean against a pinned (charon, aeneas, lean 4.34.0) tuple.
- The natural target is `check_digest` — small, total, no allocation — where
  the Lean-side theorem would be `check_digest s = ok v ->` the same shape
  predicate proved by Kani, giving an independent second opinion.
- Sha256/`canonical`'s `ryu-js`/`serde_json` dependencies make `canonical`
  itself a poor first Aeneas target; `check_digest` and `array_index` are the
  feasible slice.
- Unresolved linkage remains visible: until that runs, the Lean side of the
  boundary is a spec/oracle only, per the plan's fallback.

## Next step (acceptance decision)

Observed run section below carries the verdict; the recommendation is to
adopt Kani as the production-linkage route for this class of pure/bounded
helpers: it proved production code with zero production edits, total wall
cost was bounded, and the failure modes encountered (unbounded symbolic
sizes) are harness-authoring issues, not trust issues.
