use algal::{
    canonical::{canonical, read_json},
    contract::Manifest,
    effects::Host,
    graph::{Transports, compile},
    runtime,
    store::{Store, pack, unpack},
};
use serde_json::{Value, json};
use std::{
    fs::{self, File},
    path::PathBuf,
};

fn root() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../..")
}
fn transports() -> Transports {
    [("bundles".into(), root().join("examples/bundles"))].into()
}

#[test]
fn every_bundled_manifest_is_admitted_and_normalizes_stably() {
    let examples = root().join("examples");
    let mut store = Store::default();
    assert!(store.load_modules(&examples).unwrap() >= 39);
    for entry in fs::read_dir(examples).unwrap() {
        let path = entry.unwrap().path();
        let name = path.file_name().unwrap().to_string_lossy();
        if !name.ends_with(".algal.json") {
            continue;
        }
        let manifest =
            Manifest::parse(&read_json(File::open(&path).unwrap(), 1_048_576).unwrap()).unwrap();
        assert_eq!(
            manifest.digest().unwrap(),
            Manifest::parse(&manifest.value).unwrap().digest().unwrap()
        );
        compile(manifest, &mut store, &Default::default(), &transports(), 0)
            .unwrap_or_else(|error| panic!("{name}: {error}"));
    }
}

#[tokio::test]
async fn every_scripted_example_runs_and_replays_without_a_provider() {
    let examples = root().join("examples");
    for entry in fs::read_dir(&examples).unwrap() {
        let path = entry.unwrap().path();
        let name = path.file_name().unwrap().to_string_lossy();
        let Some(id) = name
            .strip_suffix(".algal.json")
            .or_else(|| name.strip_suffix(".algal.json"))
        else {
            continue;
        };
        let load_optional = |suffix: &str| -> Value {
            let path = examples.join(format!("{id}.{suffix}.json"));
            if !path.exists() {
                return json!({});
            }
            read_json(File::open(path).unwrap(), 1_048_576).unwrap()
        };
        let mut store = Store::default();
        store.load_modules(&examples).unwrap();
        let manifest =
            Manifest::parse(&read_json(File::open(&path).unwrap(), 1_048_576).unwrap()).unwrap();
        let receipt = runtime::run(
            manifest.clone(),
            load_optional("args"),
            &mut store,
            &mut Host::scripted(load_optional("responses")),
            &transports(),
            None,
        )
        .await
        .unwrap();
        assert_eq!(
            receipt["outcome"],
            "complete",
            "{id}: {}",
            canonical(&receipt).unwrap()
        );
        let verified = runtime::verify(&receipt, manifest, &store, &Host::default())
            .await
            .unwrap();
        assert_eq!(verified["ok"], true, "{id}: {verified}");
    }
}

#[tokio::test]
async fn compact_triages_the_tool_log_through_a_recorded_decide_effect() {
    let manifest = Manifest::parse(&json!({
        "contract":"algal.organism.v1",
        "key":"organism:compact",
        "name":"Compact",
        "cells":[
            {"id":"src","kind":"input","outputs":{"v":"json"}},
            {"id":"a","kind":"agent","inputs":{"v":"json"},
             "prompt":"gather and summarize","output":{"kind":"text"},
             "tools":["pick.v1"],"compact":{"maxLogBytes":150,"keepRecent":1},
             "budget":{"maxTurns":4}}
        ],
        "edges":[{"from":{"cell":"src","port":"v"},"to":{"cell":"a","port":"v"}}]
    }))
    .unwrap();
    let mut store = Store::default();
    let responses = json!({"a":[
        {"tool":"pick.v1","inputs":{"record":{"name":"wisp","age":3},"field":"name"}},
        {"tool":"pick.v1","inputs":{"record":{"name":"wisp","age":3},"field":"age"}},
        {"answers":{"keep_0":{"noul":0.1}}},
        "the name is wisp, age 3"
    ]});
    let receipt = runtime::run(
        manifest.clone(),
        json!({"src":{"v":{"name":"wisp","age":3}}}),
        &mut store,
        &mut Host::scripted(responses),
        &transports(),
        None,
    )
    .await
    .unwrap();
    assert_eq!(
        receipt["outcome"],
        "complete",
        "{}",
        canonical(&receipt).unwrap()
    );
    assert_eq!(
        receipt["cells"]["a"]["outputs"]["out"],
        "the name is wisp, age 3"
    );
    // three agent effects + one recorded decide effect
    assert_eq!(receipt["effects"].as_array().unwrap().len(), 4);
    // the dropped entry left the log — the pinned tail remains verbatim
    let calls = receipt["cells"]["a"]["toolCalls"].as_array().unwrap();
    assert_eq!(calls.len(), 1);
    assert_eq!(calls[0]["inputs"]["field"], "age");
    let verified = runtime::verify(&receipt, manifest, &store, &Host::default())
        .await
        .unwrap();
    assert_eq!(verified["ok"], true, "{verified}");
}

#[test]
fn tampered_bundle_does_not_partially_install() {
    let manifest = Manifest::parse(
        &json!({"contract":"algal.organism.v1","key":"organism:empty","name":"Empty","cells":[]}),
    )
    .unwrap();
    let mut bundle = pack(&manifest, &Store::default()).unwrap();
    bundle["values"][format!("sha256:{}", "a".repeat(64))] = json!("forged");
    let mut destination = Store::default();
    assert!(unpack(&bundle, &mut destination).is_err());
    assert!(
        destination
            .get("manifests", &manifest.digest().unwrap())
            .unwrap()
            .is_none()
    );
}

#[test]
fn structural_errors_never_reach_effect_execution() {
    let manifest = Manifest::parse(
        &json!({"contract":"algal.organism.v1","key":"organism:cycle","name":"Cycle","cells":[
            {"id":"one","kind":"fn","fn":"echo.v1"},{"id":"two","kind":"fn","fn":"echo.v1"}
        ],"edges":[
            {"from":{"cell":"one","port":"value"},"to":{"cell":"two","port":"value"}},
            {"from":{"cell":"two","port":"value"},"to":{"cell":"one","port":"value"}}
        ]}),
    )
    .unwrap();
    let error = match compile(
        manifest,
        &mut Store::default(),
        &Default::default(),
        &Default::default(),
        0,
    ) {
        Ok(_) => panic!("cycle accepted"),
        Err(e) => e,
    };
    assert_eq!(error.code, "GRAPH_CYCLE");
}
