//! Persistent reads admit the current retained namespace. Explicit local
//! memory/overlay writes remain a separate nonpersistent source of values.
use algal::{
    canonical::{canonical, digest},
    store::Store,
};
use serde_json::json;
use std::fs;

#[test]
fn persistent_cas_and_writer_overlays_reject_changed_or_missing_files() {
    for (bytes, expected) in [
        (Some(b"{broken".to_vec()), Some("PARSE_FAILED")),
        (Some(b"\"changed\"".to_vec()), Some("DIGEST_MISMATCH")),
        (None, None),
    ] {
        let root = tempfile::tempdir().unwrap();
        let mut writer = Store::open(root.path(), true).unwrap();
        let key = writer.put("values", &json!("original")).unwrap();
        let overlay = writer.overlay();
        let traced = writer.trace_source_reads();
        let path = root.path().join(format!("values/{}.json", &key[7..]));
        match &bytes {
            Some(bytes) => fs::write(&path, bytes).unwrap(),
            None => fs::remove_file(&path).unwrap(),
        }
        for reader in [&writer, &overlay, &traced] {
            let result = reader.get("values", &key);
            match expected {
                Some(code) => assert_eq!(result.unwrap_err().code, code),
                None => assert_eq!(result.unwrap(), None),
            }
        }
        assert_eq!(fs::read(&path).ok(), bytes);
        let mut local = writer.overlay();
        assert_eq!(local.put("values", &json!("original")).unwrap(), key);
        assert_eq!(local.get("values", &key).unwrap(), Some(json!("original")));
        assert_eq!(
            fs::read(&path).ok(),
            bytes,
            "explicit overlay writes never repair disk"
        );
    }
}

#[test]
fn persistent_effect_reads_revalidate_receipt_and_request_identity_after_put() {
    let request = digest(&json!("request")).unwrap();
    let receipt =
        json!({"requestDigest":request,"executor":"display-executor","output":"original"});
    let foreign = json!({"requestDigest":digest(&json!("foreign")).unwrap(),"executor":"display-executor","output":"foreign"});
    let mut malformed = receipt.clone();
    malformed["extra"] = json!(true);
    for (bytes, expected) in [
        (Some(b"{broken".to_vec()), Some("PARSE_FAILED")),
        (
            Some(canonical(&foreign).unwrap().into_bytes()),
            Some("DIGEST_MISMATCH"),
        ),
        (
            Some(canonical(&malformed).unwrap().into_bytes()),
            Some("PARSE_FAILED"),
        ),
        (None, None),
    ] {
        let root = tempfile::tempdir().unwrap();
        let mut writer = Store::open(root.path(), true).unwrap();
        writer.put_effect(&receipt, "configuration").unwrap();
        let overlay = writer.overlay();
        let memo = Store::effect_key(&request, "configuration").unwrap();
        let path = root.path().join(format!("effects/{}.json", &memo[7..]));
        match &bytes {
            Some(bytes) => fs::write(&path, bytes).unwrap(),
            None => fs::remove_file(&path).unwrap(),
        }
        for reader in [&writer, &overlay] {
            let result = reader.get_effect(&request, "configuration");
            match expected {
                Some(code) => assert_eq!(result.unwrap_err().code, code),
                None => assert_eq!(result.unwrap(), None),
            }
        }
        assert_eq!(fs::read(&path).ok(), bytes);
        let local_receipt = json!({"requestDigest":request,"executor":"local","output":"overlay"});
        let mut local = writer.overlay();
        local.put_effect(&local_receipt, "configuration").unwrap();
        local.put_effect(&receipt, "configuration").unwrap();
        assert_eq!(
            local.get_effect(&request, "configuration").unwrap(),
            Some(local_receipt)
        );
        assert_eq!(fs::read(&path).ok(), bytes);
    }
}

#[test]
fn file_source_traces_keep_real_dependencies_and_exclude_explicit_overlay_outputs() {
    let root = tempfile::tempdir().unwrap();
    let mut writer = Store::open(root.path(), true).unwrap();
    let key = writer.put("values", &json!("source")).unwrap();
    let traced = writer.trace_source_reads();
    let mut overlay = traced.overlay();
    assert_eq!(overlay.get("values", &key).unwrap(), Some(json!("source")));
    let generated = overlay.put("values", &json!("generated")).unwrap();
    assert_eq!(
        overlay.get("values", &generated).unwrap(),
        Some(json!("generated"))
    );
    let reads = traced.source_reads().unwrap();
    assert_eq!(reads.len(), 1);
    assert_eq!(
        reads.get(&("values".to_owned(), key.clone())),
        Some(&Some(json!("source")))
    );
    assert!(
        !root
            .path()
            .join(format!("values/{}.json", &generated[7..]))
            .exists()
    );
    fs::remove_file(root.path().join(format!("values/{}.json", &key[7..]))).unwrap();
    assert_eq!(
        overlay.get("values", &key).unwrap_err().code,
        "DIGEST_MISMATCH"
    );
    assert_eq!(
        traced.check_evidence_reads().unwrap_err().code,
        "VERIFY_FAILED"
    );
}
