use algal::{bench, effects::Host, graph::Transports, store::Store};
use serde_json::{Value, json};
use std::{collections::BTreeMap, path::PathBuf};

fn repo() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../..")
}

#[tokio::test]
async fn imported_cases_reject_interface_expectation_bypasses() {
    let directory = tempfile::tempdir().unwrap();
    let mut store = Store::open(directory.path(), true).unwrap();
    let mut config = bench::load_config(&repo().join("examples/bench.config.json"), None).unwrap();
    config.scorer = Some(json!({"contract":"algal.expr.v1","program":["eq",1,1]}));
    let report = bench::run(&config, &mut store, &Host::default(), &Transports::new())
        .await
        .unwrap();
    assert_eq!(
        bench::verify(&report, &store, &Host::default())
            .await
            .unwrap()["ok"],
        true
    );

    let mut accepted = Vec::new();
    for mutation in ["missing-expect", "extra-expect"] {
        let mut forged = report.clone();
        let expected = if mutation == "missing-expect" {
            json!({})
        } else {
            let mut expected = forged["cases"][0]["expect"].clone();
            expected["constructor"] = json!("undeclared");
            expected
        };
        forged["cases"][0]["expect"] = expected.clone();
        for system in forged["systems"].as_array_mut().unwrap() {
            system["cases"][0]["expect"] = expected.clone();
        }
        forged["workload"] = json!(algal::canonical::digest(&forged["cases"]).unwrap());
        forged.as_object_mut().unwrap().remove("digest");
        forged["digest"] = json!(algal::canonical::digest(&forged).unwrap());
        let verified = bench::verify(&forged, &store, &Host::default())
            .await
            .unwrap();
        if verified["ok"] == true {
            accepted.push(mutation);
        }
    }
    assert!(
        accepted.is_empty(),
        "admitted forged cases with unchanged real receipts: {accepted:?}"
    );
}

#[tokio::test]
async fn programmatic_cases_preserve_declared_constructor_and_validate_expectations() {
    let mut store = Store::default();
    let manifest = algal::contract::Manifest::parse(&json!({
        "contract":"algal.organism.v1","key":"organism:bench-constructor","name":"Declared constructor",
        "cells":[{"id":"constructor","kind":"input","outputs":{"constructor":"json"}}],
        "edges":[],
        "interface":{"inputs":{"constructor":{"cell":"constructor","port":"constructor"}},"outputs":{"constructor":{"cell":"constructor","port":"constructor"}}}
    })).unwrap();
    let data = json!({"__proto__":{"kept":true},"constructor":"own data"});
    let mut config = bench::BenchConfig {
        cases: vec![bench::BenchCase {
            id: "case".to_owned(),
            args: json!({"constructor":data}),
            expect: json!({"constructor":data}),
        }],
        systems: vec![bench::BenchSystem {
            id: "system".to_owned(),
            manifest,
            executors: vec![],
        }],
        prices: None,
        scorer: None,
        axes: None,
    };
    let report = bench::run(&config, &mut store, &Host::default(), &Transports::new())
        .await
        .unwrap();
    assert_eq!(
        report["systems"][0]["cases"][0]["outputs"]["constructor"],
        data
    );
    assert_eq!(
        bench::verify(&report, &store, &Host::default())
            .await
            .unwrap()["ok"],
        true
    );
    for (expectation, message) in [
        (json!({}), "missing expected output"),
        (
            json!({"constructor":data,"extra":null}),
            "unknown expected output",
        ),
    ] {
        config.cases[0].expect = expectation;
        let error = bench::run(&config, &mut store, &Host::default(), &Transports::new())
            .await
            .unwrap_err();
        assert!(error.message.contains(message), "{error}");
    }
    config.cases[0].expect = json!({"constructor":data});
    config.cases[0].args["extra"] = json!(null);
    let error = bench::run(&config, &mut store, &Host::default(), &Transports::new())
        .await
        .unwrap_err();
    assert!(error.message.contains("unknown system input"), "{error}");
}

#[tokio::test]
async fn aliased_case_inputs_use_canonical_name_order() {
    let mut store = Store::default();
    let manifest = algal::contract::Manifest::parse(&json!({
        "contract":"algal.organism.v1","key":"organism:bench-alias-order","name":"Bench alias order",
        "cells":[{"id":"source","kind":"input","outputs":{"value":"json"}}],"edges":[],
        "interface":{"inputs":{"z":{"cell":"source","port":"value"},"a":{"cell":"source","port":"value"}},"outputs":{"answer":{"cell":"source","port":"value"}}}
    })).unwrap();
    let config = bench::BenchConfig {
        cases: vec![bench::BenchCase {
            id: "case".to_owned(),
            args: serde_json::from_str(r#"{"z":"z","a":"a"}"#).unwrap(),
            expect: json!({"answer":"z"}),
        }],
        systems: vec![bench::BenchSystem {
            id: "test".to_owned(),
            manifest,
            executors: vec![],
        }],
        prices: None,
        scorer: None,
        axes: None,
    };
    let report = bench::run(&config, &mut store, &Host::default(), &Transports::new())
        .await
        .unwrap();
    assert_eq!(
        report["systems"][0]["cases"][0]["outputs"],
        json!({"answer":"z"})
    );
    // Independently produced by Bun from the identical alias fixture.
    assert_eq!(
        report["digest"],
        "sha256:6e443cc8309db86594d91a8f8ec6966b79896e5645ee045e8beb7d9eb0365e0a"
    );
    let roundtrip = serde_json::from_str(&algal::canonical::canonical(&report).unwrap()).unwrap();
    let verified = bench::verify(&roundtrip, &store, &Host::default())
        .await
        .unwrap();
    assert_eq!(verified["ok"], true, "{verified}");
}

#[tokio::test]
async fn result_cases_cover_the_workload_once_in_either_order() {
    let mut store = Store::default();
    let manifest = algal::contract::Manifest::parse(&json!({
        "contract":"algal.organism.v1","key":"organism:bench-multiplicity","name":"Workload coverage",
        "cells":[{"id":"source","kind":"input","outputs":{"value":"json"}}],"edges":[],
        "interface":{"inputs":{"q":{"cell":"source","port":"value"}},"outputs":{"answer":{"cell":"source","port":"value"}}}
    })).unwrap();
    let config = bench::BenchConfig {
        cases: vec![
            bench::BenchCase {
                id: "one".to_owned(),
                args: json!({"q":"a"}),
                expect: json!({"answer":"a"}),
            },
            bench::BenchCase {
                id: "two".to_owned(),
                args: json!({"q":"b"}),
                expect: json!({"answer":"b"}),
            },
        ],
        systems: vec![bench::BenchSystem {
            id: "system".to_owned(),
            manifest,
            executors: vec![],
        }],
        prices: None,
        scorer: None,
        axes: None,
    };
    let report = bench::run(&config, &mut store, &Host::default(), &Transports::new())
        .await
        .unwrap();
    assert_eq!(
        bench::verify(&report, &store, &Host::default())
            .await
            .unwrap()["ok"],
        true
    );
    let mut reordered = report.clone();
    reordered["systems"][0]["cases"]
        .as_array_mut()
        .unwrap()
        .reverse();
    reordered.as_object_mut().unwrap().remove("digest");
    reordered["digest"] = json!(algal::canonical::digest(&reordered).unwrap());
    let verified = bench::verify(&reordered, &store, &Host::default())
        .await
        .unwrap();
    assert_eq!(verified["ok"], true, "{verified}");

    let mut forged = report;
    forged["systems"][0]["cases"][1] = forged["systems"][0]["cases"][0].clone();
    forged.as_object_mut().unwrap().remove("digest");
    forged["digest"] = json!(algal::canonical::digest(&forged).unwrap());
    let rejected = bench::verify(&forged, &store, &Host::default())
        .await
        .unwrap();
    assert_eq!(
        rejected["ok"], false,
        "accepted duplicate result row with one workload case omitted: {rejected}"
    );
    assert_eq!(rejected["checkedReceipts"], 2);
    assert!(
        rejected["mismatches"]
            .as_array()
            .unwrap()
            .iter()
            .any(|message| message
                .as_str()
                .unwrap_or("")
                .contains("duplicate result case id \"one\"")),
        "{rejected}"
    );
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
