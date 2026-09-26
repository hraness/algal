//! Phase 12 pilot: maintainable proof over actual production Rust code.
//!
//! The code under proof is the *production* `algal` crate (`../../crates/algal`,
//! path dependency) — not a copy, not a model. Two functions, both reachable
//! from contract boundaries, are covered:
//!
//! - `algal::canonical::check_digest` — the full-width admission predicate for
//!   `sha256:<64 lowercase hex>` digest strings. Admitted digests become CAS
//!   store paths (`store.rs`), journal bindings (`journal.rs`), manifest and
//!   port digests (`contract.rs`), memory sources (`memory.rs`) and more, so
//!   an acceptance bug here widens every boundary that names a digest.
//! - `algal::canonical::canonical` — the bounded canonical JSON writer
//!   (depth <= 64, output <= 64 MiB) whose byte output the digests commit to;
//!   it exercises the private `array_index`/`key_order` index helpers that
//!   reproduce JS `[[OwnPropertyKeys]]` ordering.
//!
//! See FEASIBILITY.md for the selection rationale and proof results.

#[cfg(kani)]
mod proofs;

#[cfg(test)]
mod sanity;
