use algal::{bench, effects::Host, graph::Transports, store::Store};
use serde_json::{Value, json};
use std::{collections::BTreeMap, path::PathBuf};

fn repo() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../..")
}

#[tokio::test]
async fn bundled_bench_runs_and_verifies_offline() {
    let directory = tempfile::tempdir().unwrap();
    let mut store = Store::open(directory.path(), true).unwrap();
    let config = bench::load_config(&repo().join("examples/bench.config.json"), None).unwrap();
    assert!(config.scorer.is_none());
    let report = bench::run(&config, &mut store, &Host::default(), &Transports::new())
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
    let report = bench::run(&config, &mut store, &Host::default(), &Transports::new())
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
    let report = bench::run(&config, &mut store, &Host::default(), &Transports::new())
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

#[tokio::test]
async fn configured_axes_replace_the_default_pareto_and_verify() {
    let directory = tempfile::tempdir().unwrap();
    let mut store = Store::open(directory.path(), true).unwrap();
    let config = bench::load_config(&repo().join("examples/bench-axes.config.json"), None).unwrap();
    assert!(config.axes.is_some());
    let report = bench::run(&config, &mut store, &Host::default(), &Transports::new())
        .await
        .unwrap();
    // under (calls ↓, work-units ↓) cheap-single wins outright — the
    // scripted systems have no usage data, so dropping the quality axis
    // lets the cheapest system take the whole frontier
    assert_eq!(report["pareto"], json!(["cheap-single"]));
    let values: BTreeMap<String, BTreeMap<String, f64>> = report["systems"]
        .as_array()
        .unwrap()
        .iter()
        .map(|s| {
            (
                s["id"].as_str().unwrap().to_owned(),
                s["axisValues"]
                    .as_object()
                    .unwrap()
                    .iter()
                    .map(|(k, v)| (k.clone(), v.as_f64().unwrap()))
                    .collect(),
            )
        })
        .collect();
    assert_eq!(values["cheap-single"]["calls"], 4.0);
    assert_eq!(values["circuit"]["calls"], 5.0);
    assert!(values["cheap-single"]["work"] < values["frontier-single"]["work"]);
    let verified = bench::verify(&report, &store, &Host::default())
        .await
        .unwrap();
    assert_eq!(verified["ok"], true, "{verified}");

    // a tampered axis value fails recomputation even with a recomputed
    // digest
    let mut tampered = report.clone();
    tampered["systems"][2]["axisValues"]["calls"] = json!(1);
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
    assert!(mismatches.contains("axis \"calls\""), "{mismatches}");

    // a forged pareto fails even when the axis values are honest
    let mut forged = report.clone();
    forged["pareto"] = json!(["circuit"]);
    forged.as_object_mut().unwrap().remove("digest");
    forged["digest"] = json!(algal::canonical::digest(&forged).unwrap());
    let forged_check = bench::verify(&forged, &store, &Host::default())
        .await
        .unwrap();
    assert_eq!(forged_check["ok"], false);
}

#[test]
fn config_rejects_bad_axes() {
    let directory = tempfile::tempdir().unwrap();
    // axes validate before manifests resolve, so the system spec below is
    // never reached on an axis failure
    let config = |axes: Value| {
        json!({
            "contract":"algal.bench.config.v1",
            "axes":axes,
            "cases":[{"id":"t1","args":{"ticket":"hi"},"expect":{"out":"billing"}}],
            "systems":[{
                "id":"s1",
                "manifest":"missing.json",
                "executors":{"cheap":"scripted:missing.json"}
            }]
        })
    };
    let file = directory.path().join("config.json");
    let check = |axes: Value| -> algal::Result<()> {
        std::fs::write(&file, serde_json::to_string(&config(axes)).unwrap()).unwrap();
        bench::load_config(&file, None).map(|_| ())
    };
    let axis = |name: &str, dir: &str, program: Value| json!({"name":name,"dir":dir,"expr":{"contract":"algal.expr.v1","program":program}});
    // an unbound name fails static checking as AXIS_INVALID
    let err = check(json!([axis("x", "up", json!(["get", "bogus"]))]))
        .err()
        .unwrap();
    assert_eq!(err.code, "AXIS_INVALID", "{err}");
    // duplicate names
    assert!(
        check(json!([
            axis("x", "up", json!(["get", "passed"])),
            axis("x", "down", json!(["get", "effectCalls"]))
        ]))
        .is_err()
    );
    // a bad direction
    assert!(check(json!([axis("x", "sideways", json!(["get", "passed"]))])).is_err());
    // empty and oversized lists
    assert!(check(json!([])).is_err());
    assert!(
        check(json!(
            (0..9)
                .map(|i| axis(&format!("a{i}"), "up", json!(["get", "passed"])))
                .collect::<Vec<_>>()
        ))
        .is_err()
    );
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
