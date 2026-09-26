//! Deterministic sanity tests driving the same production functions as the
//! Kani harnesses (`proofs.rs`). These run under plain `cargo test` and give
//! the integrator a cheap always-on check; they are deliberately weaker than
//! the proofs — they spot-check the same properties on concrete witnesses
//! rather than quantifying over the symbolic input domains.

use algal::canonical::{MAX_DOCUMENT_BYTES, canonical, check_digest, digest, read_json};
use serde_json::{Map, Value, json};

#[test]
fn digest_roundtrip_and_rejection() {
    let d = digest(&json!({"b": 2, "a": 1})).unwrap();
    assert_eq!(d.len(), 71);
    assert_eq!(check_digest(&d).unwrap(), d);

    // Off-by-one lengths.
    assert!(check_digest(&d[..70]).is_err());
    assert!(check_digest(&format!("{d}0")).is_err());
    // Wrong prefix.
    assert!(check_digest(&format!("sha512:{}", &d[7..])).is_err());
    // Uppercase hex is not the canonical alphabet.
    assert!(check_digest(&d.to_uppercase().replace("SHA256:", "sha256:")).is_err());
    // Non-hex byte.
    assert!(check_digest(&format!("{}g", &d[..70])).is_err());
    // A path-traversal-shaped candidate cannot be admitted (this predicate is
    // what lets admitted digests become store path components).
    assert!(check_digest("sha256:../..").is_err());
    // Multibyte UTF-8 at the boundary still rejects cleanly.
    let mut bad = String::from("sha256:");
    bad.push_str(&"é".repeat(32));
    assert!(check_digest(&bad).is_err());
}

#[test]
fn canonical_index_key_order_and_depth() {
    let mut m = Map::new();
    for key in ["a", "10", "4294967295", "2", "00", "4294967294", "1"] {
        m.insert(key.to_string(), Value::Bool(false));
    }
    assert_eq!(
        canonical(&Value::Object(m)).unwrap(),
        r#"{"1":false,"2":false,"10":false,"4294967294":false,"00":false,"4294967295":false,"a":false}"#
    );

    let mut deep = Value::Null;
    for _ in 0..64 {
        deep = Value::Array(vec![deep]);
    }
    assert!(canonical(&deep).is_ok());
    deep = Value::Array(vec![deep]);
    assert!(canonical(&deep).is_err());
}

#[test]
fn canonical_scalars_and_bound() {
    for v in [
        Value::Null,
        Value::Bool(true),
        json!(-0.0),
        json!(1e21),
        Value::String("héllo \"world\"".into()),
    ] {
        let out = canonical(&v).unwrap();
        assert!(!out.is_empty() && out.len() <= MAX_DOCUMENT_BYTES);
    }
    assert_eq!(canonical(&json!(-0.0)).unwrap(), "0");
}

#[test]
fn read_json_admission() {
    assert!(read_json(&b"null"[..], 16).is_ok());
    assert!(read_json(&b"[1,2]"[..], 4).is_err()); // bytes exceed max
    assert!(read_json(&b"null"[..], MAX_DOCUMENT_BYTES + 1).is_err()); // max gate
    assert!(read_json(&b"\x00\x01"[..], 16).is_err()); // invalid JSON rejects
}
