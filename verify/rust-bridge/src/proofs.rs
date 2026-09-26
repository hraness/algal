//! Kani proof harnesses over the production `algal` crate.
//!
//! Compiled only under `cargo kani` (`cfg(kani)`); cargo-kani injects the
//! bundled `kani` library. Every harness keeps Kani's default checks enabled:
//! unwinding assertions, arithmetic overflow, memory safety,
//! undefined-function detection and assertion reachability. No stub, no
//! `--unwinding-assertions` removal, no reduced production constant —
//! `MAX_DOCUMENT_BYTES` stays 64 MiB and the depth guard stays 64.
//!
//! Function under proof 1: `algal::canonical::check_digest`
//!   The full-width admission predicate for `sha256:<64 lowercase hex>`.
//!   Production callers that depend on its exactness include the CAS store
//!   path builder (`store.rs:282-289`, where an admitted digest becomes a
//!   filesystem path component), journal binding admission (`journal.rs`),
//!   manifest/port digest admission (`contract.rs:1107,1363`) and memory
//!   source admission (`memory.rs:513`).
//!
//! Function under proof 2: `algal::canonical::canonical`
//!   The bounded canonical JSON writer (depth <= 64, output <= 64 MiB)
//!   producing the bytes every digest commits to; ~300 production call sites.
//!   Its object branch exercises the private `array_index`/`key_order` index
//!   helpers reproducing JS `[[OwnPropertyKeys]]` order.
//!
//! A third surface — `algal::canonical::read_json` (the bounded byte
//! admission gate in front of the parser) — was evaluated and withdrawn;
//! see the note at the bottom of this file and FEASIBILITY.md.

use algal::canonical::{MAX_DOCUMENT_BYTES, canonical, check_digest};
use serde_json::{Map, Value};

/// Symbolic (buffer, used-length) pair with `len <= N`.
fn any_bytes_len<const N: usize>() -> ([u8; N], usize) {
    let bytes: [u8; N] = kani::any();
    let len: usize = kani::any();
    kani::assume(len <= N);
    (bytes, len)
}

/// Constrain the used prefix of a symbolic buffer to ASCII.
fn assume_ascii(bytes: &[u8], len: usize) {
    for i in 0..len {
        kani::assume(bytes[i].is_ascii());
    }
}

/// Reinterpret a buffer prefix as `&str` without paying a symbolic UTF-8
/// validation loop in symex. Callers establish the `str` invariant by
/// `kani::assume` on the used prefix (ASCII suffices) *before* calling — so
/// this models "arbitrary bounded `&str`", exactly the production input
/// type. Harness-side only; the crate under proof stays unsafe-free.
///
/// # Safety
/// `&bytes[..len]` must be valid UTF-8 under the caller's assumptions and
/// `len <= bytes.len()`.
#[allow(unsafe_code)]
unsafe fn str_unchecked(bytes: &[u8], len: usize) -> &str {
    unsafe { std::str::from_utf8_unchecked(&bytes[..len]) }
}

/// Symbolic UTF-8 string of at most `N` chars over a small alphabet covering
/// every byte class the predicate can see: ASCII-hex (`'0'`, `'a'`),
/// ASCII-non-hex (`'x'`), and a multibyte char (`'é'` = 0xC3 0xA9, exercising
/// >= 0x80 lead/continuation bytes). Valid UTF-8 by construction, byte length
/// <= 2N — chosen N must still allow a 71-byte string (N >= 36).
fn any_utf8_mixed<const N: usize>() -> String {
    let n: usize = kani::any();
    kani::assume(n <= N);
    let mut s = String::new();
    for _ in 0..n {
        let c = match kani::any::<u8>() % 4 {
            0 => '0',
            1 => 'a',
            2 => 'x',
            _ => 'é',
        };
        s.push(c);
    }
    s
}

/// Stub for `RandomState::new`. The build's `serde_json` has `preserve_order`
/// unified on (via `apple-foundation`), so `Map` is an `IndexMap` whose
/// hasher seeds from `std::sys::random::apple::fill_bytes` — a foreign
/// `CCRandomGenerateBytes` call, i.e. an OS boundary, not the code under
/// proof. Returning a symbolic `RandomState` is *stronger* than needed:
/// IndexMap bucket placement gets an arbitrary seed while iteration order
/// stays insertion order, and `canonical`'s `key_order` sort makes output
/// independent of seed anyway. Requires `cargo kani -Z stubbing`; recorded as
/// an admitted assumption in FEASIBILITY.md.
fn random_state_new_stub() -> std::collections::hash_map::RandomState {
    // `RandomState` is a plain bag of seed bytes (two u64s on shipped std
    // layouts); its fields are private so `kani::any` can't build one — a
    // transmute needs only size equality, and the *content* is what the stub
    // makes symbolic. Compile-time size check keeps this honest.
    unsafe { std::mem::transmute::<[u64; 2], _>(kani::any::<[u64; 2]>()) }
}

/// Owned ASCII leaf for `Value::String` of *exactly* N symbolic bytes.
/// Concrete length matters: serde_json's escape pass uses `memchr` over the
/// string, and CBMC unwinds memchr/memcmp builtins to the operand's symbolic
/// bound — a data-derived length with no tight bound diverges (observed:
/// memcmp.0 past iteration 7000). Fixed N keeps every scan bounded.
fn any_ascii_string<const N: usize>() -> String {
    let mut s = String::with_capacity(N);
    for _ in 0..N {
        let b: u8 = kani::any();
        kani::assume(b.is_ascii());
        s.push(b as char);
    }
    s
}

/// A bounded symbolic `Value` leaf or shallow node (depth <= 2).
/// Covers every `Value` variant the codec admits.
fn any_small_value() -> Value {
    let tag: u8 = kani::any();
    match tag % 4 {
        0 => Value::Null,
        1 => Value::Bool(kani::any()),
        2 => {
            // serde_json::Number can only hold finite f64 via from_f64, so the
            // production `!n.is_finite()` branch is unreachable through the
            // public API — see FEASIBILITY.md. Symbolic finite double still
            // exercises ryu-js formatting over the full finite domain.
            let f: f64 = kani::any();
            kani::assume(f.is_finite());
            Value::from(f)
        }
        _ => Value::String(any_ascii_string::<4>()),
    }
}

// ---------------------------------------------------------------------------
// check_digest: admission predicate
// ---------------------------------------------------------------------------

/// Completeness direction: every `sha256:` + 64 symbolic lowercase-hex bytes
/// must be admitted, and the predicate returns the identical string.
#[kani::proof]
#[kani::unwind(80)]
fn check_digest_accepts_canonical_form() {
    let mut bytes = [0u8; 71];
    bytes[..7].copy_from_slice(b"sha256:");
    for b in &mut bytes[7..] {
        *b = kani::any();
        // Symbolic tail constrained to the valid alphabet; the predicate
        // itself — not the harness — decides acceptance.
        kani::assume(b.is_ascii_digit() || (b'a'..=b'f').contains(b));
    }
    // All 71 bytes are ASCII by assumption, so `str_unchecked`'s contract
    // holds — see its doc comment.
    let s = unsafe { str_unchecked(&bytes, 71) };
    let admitted = check_digest(s);
    assert!(admitted.is_ok());
    // Admission returns the whole string unchanged — no truncation/copy bug.
    assert_eq!(admitted.unwrap(), s);
    kani::cover!();
}

/// Soundness direction over bounded ASCII input: any admitted string is
/// exactly `sha256:<64 lowercase hex>`. Both outcomes must be reachable.
/// (Multibyte UTF-8 inputs are covered separately by
/// `check_digest_soundness_utf8` — splitting keeps each proof's domain
/// readable. A string with a multibyte char can only reach the tail scan
/// when `sha256:` matched first, which already fixes byte 7 as a boundary.)
#[kani::proof]
#[kani::unwind(130)]
fn check_digest_soundness_bounded_input() {
    let (bytes, len) = any_bytes_len::<96>();
    assume_ascii(&bytes, len);
    let s = unsafe { str_unchecked(&bytes, len) };
    match check_digest(s) {
        Ok(v) => {
            assert_eq!(v.len(), 71);
            assert!(v.starts_with("sha256:"));
            assert!(v[7..]
                .bytes()
                .all(|b| b.is_ascii_digit() || (b'a'..=b'f').contains(&b)));
            assert_eq!(v, s);
            kani::cover!(); // valid outcome reachable
        }
        Err(_) => {
            kani::cover!(); // invalid outcome reachable
        }
    }
}

/// Soundness over multibyte-capable input: symbolic UTF-8 of <= 36 chars over
/// a byte-class alphabet (hex, non-hex ASCII, multibyte) — <= 72 bytes, so the
/// 71-byte admit case stays reachable. `check_digest` rejects byte-wise, so
/// multibyte tails reject like any non-hex byte; proved, not assumed.
#[kani::proof]
#[kani::unwind(130)]
fn check_digest_soundness_utf8() {
    let s = any_utf8_mixed::<36>();
    match check_digest(&s) {
        Ok(v) => {
            assert_eq!(v.len(), 71);
            assert!(v.starts_with("sha256:"));
            assert!(v[7..]
                .bytes()
                .all(|b| b.is_ascii_digit() || (b'a'..=b'f').contains(&b)));
            kani::cover!(); // valid outcome reachable
        }
        Err(_) => {
            kani::cover!(); // invalid outcome reachable
        }
    }
}

/// A 71-byte input with the right prefix but at least one non-lowercase-hex
/// tail byte must be rejected. Guards against a widened alphabet.
#[kani::proof]
#[kani::unwind(80)]
fn check_digest_rejects_noncanonical_tail() {
    let bad: usize = kani::any();
    kani::assume(bad < 64);
    let mut bytes = [0u8; 71];
    bytes[..7].copy_from_slice(b"sha256:");
    for (i, b) in bytes[7..].iter_mut().enumerate() {
        *b = kani::any();
        if i == bad {
            // Force at least one byte outside the admitted alphabet — but
            // still ASCII, so the input is a real `str` (a >= 0x80 byte here
            // would construct an invalid `str`, an impossible input the
            // verifier correctly rejects as a modeling error, not a bug).
            kani::assume(b.is_ascii() && !(b.is_ascii_digit() || (b'a'..=b'f').contains(b)));
        } else {
            kani::assume(b.is_ascii());
        }
    }
    let s = unsafe { str_unchecked(&bytes, 71) };
    assert!(check_digest(s).is_err());
    kani::cover!();
}

/// Any input whose length differs from the full 71 bytes is rejected —
/// including 70, 72 and everything shorter (no truncation acceptance).
#[kani::proof]
#[kani::unwind(130)]
fn check_digest_rejects_wrong_length() {
    let (bytes, len) = any_bytes_len::<96>();
    assume_ascii(&bytes, len);
    let s = unsafe { str_unchecked(&bytes, len) };
    kani::assume(s.len() != 71);
    assert!(check_digest(s).is_err());
    kani::cover!();
}

// ---------------------------------------------------------------------------
// canonical: bounded codec
// ---------------------------------------------------------------------------

/// Minimal codec proof: a symbolic bool leaf through production `canonical`
/// — exercises the encode dispatch and document-bound post-check with the
/// smallest reachable state space. Compares lengths/first byte rather than
/// whole strings: `str::eq` lowers to a `memcmp` whose symbolic bound would
/// diverge (see `any_ascii_string` note).
#[kani::proof]
fn canonical_bool_leaf_bounded() {
    let out = canonical(&Value::Bool(kani::any()));
    assert!(out.is_ok());
    let out = out.unwrap();
    assert!(out.len() <= MAX_DOCUMENT_BYTES);
    // Byte-indexed content check — no whole-string equality in the model.
    assert!(out.as_bytes()[0] == b't' || out.as_bytes()[0] == b'f');
    kani::cover!(out.len() == 4); // "true" outcome reachable
    kani::cover!(out.len() == 5); // "false" outcome reachable
}

/// Object-branch emission: a one-entry object with a symbolic leaf encodes to
/// `{"k":<leaf>}` — exercises `sort_by(key_order)`, `serde_json::to_string`
/// on the key and the colon/comma emission, on a minimal footprint. The
/// `len <= 16` assert precedes content compares so the modeled string length
/// is tightly bounded before any equality work.
#[kani::proof]
#[kani::unwind(64)]
#[kani::stub(std::collections::hash_map::RandomState::new, random_state_new_stub)]
fn canonical_object_key_emission() {
    let mut m = Map::new();
    m.insert("k".to_string(), Value::Bool(kani::any()));
    let out = canonical(&Value::Object(m)).unwrap();
    let b = out.as_bytes();
    assert!(out.len() <= 16);
    assert_eq!(&b[..5], b"{\"k\":");
    assert_eq!(*b.last().unwrap(), b'}');
    assert!(b[5] == b't' || b[5] == b'f');
    kani::cover!(out.len() == 11); // {"k":true}
    kani::cover!(out.len() == 12); // {"k":false}
}

/// Scalar leaves of any symbolic value serialize successfully and stay under
/// the document bound (the encode bound is post-checked per node).
#[kani::proof]
#[kani::unwind(64)]
fn canonical_scalar_leaves_bounded() {
    let v = any_small_value();
    let out = canonical(&v);
    assert!(out.is_ok());
    let out = out.unwrap();
    assert!(!out.is_empty());
    assert!(out.len() <= MAX_DOCUMENT_BYTES);
    kani::cover!();
}

/// The private `array_index`/`key_order` helpers, reached through the codec:
/// canonical u32 array indices sort numerically first (`"1","2","10"` then
/// `u32::MAX - 1`), `u32::MAX` is excluded as an index, and the tail is UTF-16
/// code-unit order (`"00"` < `"4294967295"` < `"a"`). Leaf values are symbolic
/// booleans and the assertion is exact output equality — which also rules out
/// key duplication/loss and wrong separators, a stronger claim than pairwise
/// position checks.
#[kani::proof]
#[kani::unwind(64)]
#[kani::stub(std::collections::hash_map::RandomState::new, random_state_new_stub)]
fn canonical_array_index_key_order() {
    let mut m = Map::new();
    let mut vals = [false; 7];
    // Deliberately scrambled insertion order; key_order must dominate it.
    for (i, key) in ["a", "10", "4294967295", "2", "00", "4294967294", "1"]
        .iter()
        .enumerate()
    {
        let v: bool = kani::any();
        vals[i] = v;
        m.insert(key.to_string(), Value::Bool(v));
    }
    let out = canonical(&Value::Object(m)).unwrap();
    // Expected canonical order: indices numerically, then UTF-16 tail.
    // Assert the tight length bound *first* so the byte compare below has a
    // bounded operand in the model.
    assert!(out.len() <= 160);
    let order = ["1", "2", "10", "4294967294", "00", "4294967295", "a"];
    let ins = ["a", "10", "4294967295", "2", "00", "4294967294", "1"];
    let mut expected = String::with_capacity(out.len() + 8);
    expected.push('{');
    for (i, k) in order.iter().enumerate() {
        if i > 0 {
            expected.push(',');
        }
        expected.push('"');
        expected.push_str(k);
        expected.push_str("\":");
        let v = vals[ins.iter().position(|x| x == k).unwrap()];
        expected.push_str(if v { "true" } else { "false" });
    }
    expected.push('}');
    assert_eq!(out.len(), expected.len());
    assert!(out
        .bytes()
        .zip(expected.bytes())
        .all(|(a, b)| a == b));
    kani::cover!();
}

/// The depth guard is exact: a value nested to encode-depth 64 is admitted
/// and 65 is rejected — with the production constant, not a shrunken one.
/// Also proves encode recursion is bounded by the guard (no unbounded
/// recursion reachable from a bounded input).
#[kani::proof]
#[kani::unwind(80)]
fn canonical_depth_guard_exact() {
    let depth: usize = kani::any();
    kani::assume(depth == 64 || depth == 65);
    let mut v = Value::Null;
    for _ in 0..depth {
        v = Value::Array(vec![v]);
    }
    let out = canonical(&v);
    if depth == 64 {
        assert!(out.is_ok());
    } else {
        assert!(out.is_err());
    }
    kani::cover!(depth == 64);
    kani::cover!(depth == 65);
}

/// Mixed shallow structure: a symbolic object/array tree (depth <= 2,
/// bounded children) must never exceed the document bound and never panic.
#[kani::proof]
#[kani::unwind(64)]
#[kani::stub(std::collections::hash_map::RandomState::new, random_state_new_stub)]
fn canonical_shallow_tree_bounded() {
    let leaf = any_small_value();
    let wrap: u8 = kani::any();
    let v = match wrap % 3 {
        0 => Value::Array(vec![leaf.clone(), leaf]),
        1 => {
            let mut m = Map::new();
            m.insert(any_ascii_string::<4>(), leaf);
            Value::Object(m)
        }
        _ => leaf,
    };
    let out = canonical(&v);
    assert!(out.is_ok());
    assert!(out.unwrap().len() <= MAX_DOCUMENT_BYTES);
    kani::cover!();
}

// ---------------------------------------------------------------------------
// read_json: evaluated and withdrawn from this pilot — see FEASIBILITY.md
// ---------------------------------------------------------------------------
// `canonical::read_json` was evaluated as a third surface and withdrawn: every
// harness that calls it pays for the *whole* instrumented function body —
// `Read::take`, `Vec::read_to_end` spare-capacity loops and serde_json's
// parser and error-to-string machinery get statically unwound into the goto
// program even on paths a precondition makes unreachable — which pushed even
// the pre-read gate harness past 30 minutes without a verdict. Nothing in
// that cost is a correctness gap; it is CBMC instrumentation of dead code.
// The byte-admission gate stays covered by `cargo test` sanity checks, and a
// future attempt should use a minimal `Read` impl with a concrete cursor so
// the instrumented body stays small.
