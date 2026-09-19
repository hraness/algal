use algal::{bench, effects::Host, graph::Transports, store::Store};
use serde_json::{Value, json};
use std::path::PathBuf;

fn repo() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../..")
}

#[tokio::test]
async fn bundled_bench_runs_and_verifies_offline() {
    let directory = tempfile::tempdir().unwrap();
    let mut store = Store::open(directory.path(), true).unwrap();
    let config = bench::load_config(&repo().join("examples/bench.config.json"), None).unwrap();
    assert!(config.scorer.is_none());
    let report = bench::run(
        &config.cases,
        &config.systems,
        config.prices,
        config.scorer.as_ref(),
        &mut store,
        &Host::default(),
        &Transports::new(),
    )
    .await
    .unwrap();
    assert_eq!(report["contract"], "algal.bench.v1");
    assert_eq!(report["pareto"], json!(["frontier-single"]));
    let totals: Vec<(String, u64)> = report["systems"]
        .as_array()
        .unwrap()
        .iter()
        .map(|s| {
            (
                s["id"].as_str().unwrap().to_owned(),
                s["passed"].as_u64().unwrap(),
            )
        })
        .collect();
    assert_eq!(
        totals,
        vec![
            ("cheap-single".to_owned(), 3),
            ("frontier-single".to_owned(), 4),
            ("circuit".to_owned(), 4),
            ("ensemble".to_owned(), 4),
        ]
    );
    let verified = bench::verify(&report, &store, &Host::default())
        .await
        .unwrap();
    assert_eq!(verified["ok"], true, "{verified}");
    assert_eq!(verified["checkedReceipts"], 16);
}

#[tokio::test]
async fn verify_rejects_a_tampered_report() {
    let directory = tempfile::tempdir().unwrap();
    let mut store = Store::open(directory.path(), true).unwrap();
    let config = bench::load_config(&repo().join("examples/bench.config.json"), None).unwrap();
    let report = bench::run(
        &config.cases,
        &config.systems,
        config.prices,
        config.scorer.as_ref(),
        &mut store,
        &Host::default(),
        &Transports::new(),
    )
    .await
    .unwrap();
    let mut tampered: Value = report.clone();
    tampered["systems"][0]["passed"] = json!(4);
    let verified = bench::verify(&tampered, &store, &Host::default())
        .await
        .unwrap();
    assert_eq!(verified["ok"], false);
    let mismatches = verified["mismatches"]
        .as_array()
        .unwrap()
        .iter()
        .filter_map(|m| m.as_str())
        .collect::<Vec<_>>()
        .join("\n");
    assert!(mismatches.contains("digest"), "{mismatches}");
    assert!(mismatches.contains("pareto"), "{mismatches}");
    assert!(mismatches.contains("passed"), "{mismatches}");
}

#[tokio::test]
async fn expr_scorer_replaces_exact_match_and_verifies() {
    let directory = tempfile::tempdir().unwrap();
    let mut store = Store::open(directory.path(), true).unwrap();
    let config =
        bench::load_config(&repo().join("examples/bench-scorer.config.json"), None).unwrap();
    assert!(config.scorer.is_some());
    let report = bench::run(
        &config.cases,
        &config.systems,
        config.prices.clone(),
        config.scorer.as_ref(),
        &mut store,
        &Host::default(),
        &Transports::new(),
    )
    .await
    .unwrap();
    assert_eq!(report["scorer"], config.scorer.clone().unwrap());
    // the scorer counts "other" as acceptable: cheap's t4 miss under
    // exact-match passes here, so both systems go 4/4 — and scripted
    // backends report no usage, so nothing separates them on cost.
    let totals: Vec<(String, u64)> = report["systems"]
        .as_array()
        .unwrap()
        .iter()
        .map(|s| {
            (
                s["id"].as_str().unwrap().to_owned(),
                s["passed"].as_u64().unwrap(),
            )
        })
        .collect();
    assert_eq!(
        totals,
        vec![
            ("cheap-single".to_owned(), 4),
            ("frontier-single".to_owned(), 4),
        ]
    );
    assert_eq!(report["pareto"], json!(["cheap-single", "frontier-single"]));
    let verified = bench::verify(&report, &store, &Host::default())
        .await
        .unwrap();
    assert_eq!(verified["ok"], true, "{verified}");
    assert_eq!(verified["checkedReceipts"], 8);

    // a tampered scorer program flips recomputed claims even when the
    // report digest is recomputed over the forgery
    let mut tampered = report.clone();
    tampered["scorer"]["program"] = json!(["eq", ["get", "outputs", "out"], "other"]);
    tampered.as_object_mut().unwrap().remove("digest");
    tampered["digest"] = json!(algal::canonical::digest(&tampered).unwrap());
    let again = bench::verify(&tampered, &store, &Host::default())
        .await
        .unwrap();
    assert_eq!(again["ok"], false);
    let mismatches = again["mismatches"]
        .as_array()
        .unwrap()
        .iter()
        .filter_map(|m| m.as_str())
        .collect::<Vec<_>>()
        .join("\n");
    assert!(mismatches.contains("invalid pass claim"), "{mismatches}");
}

#[test]
fn config_rejects_bad_specs_and_overreach() {
    let directory = tempfile::tempdir().unwrap();
    let config = json!({
        "contract":"algal.bench.config.v1",
        "cases":[{"id":"t1","args":{},"expect":{}}],
        "systems":[{
            "id":"s1",
            "manifest":"missing.json",
            "executors":{"default":"bogus:thing"}
        }]
    });
    let file = directory.path().join("config.json");
    std::fs::write(&file, serde_json::to_string(&config).unwrap()).unwrap();
    assert!(bench::load_config(&file, None).is_err());

    let contract = json!({
        "contract":"algal.bench.v2",
        "cases":[{"id":"t1","args":{},"expect":{}}],
        "systems":[]
    });
    std::fs::write(&file, serde_json::to_string(&contract).unwrap()).unwrap();
    assert!(bench::load_config(&file, None).is_err());
}
