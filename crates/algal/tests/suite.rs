use algal::store::Store;
use std::path::PathBuf;

fn repo() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .and_then(|p| p.parent())
        .unwrap()
        .to_path_buf()
}

#[tokio::test]
async fn bundled_suite_runs_verifies_and_memoizes() {
    let directory = tempfile::tempdir().unwrap();
    let mut store = Store::open(directory.path(), true).unwrap();
    let report = algal::suite::run(&repo().join("examples"), &mut store)
        .await
        .unwrap();
    assert_eq!(report["ok"], serde_json::json!(true));
    let results = report["results"].as_array().unwrap();
    assert!(results.len() >= 39);
    assert!(results.iter().all(|r| r["verifyOk"] == true));
    let cached: Vec<_> = results
        .iter()
        .filter(|r| r.get("cacheOk").is_some())
        .collect();
    assert!(!cached.is_empty());
    assert!(cached.iter().all(|r| r["cacheOk"] == true));
    assert!(cached.iter().all(|r| r["cacheHits"].as_u64().unwrap() >= 1));
}
