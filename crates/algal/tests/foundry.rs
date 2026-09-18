use algal::{effects::Host, foundry, graph::Transports, store::Store};
use serde_json::{Value, json};
use std::path::PathBuf;

fn repo() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../..")
}

fn responses(file: &str) -> serde_json::Value {
    serde_json::from_str(&std::fs::read_to_string(repo().join("examples").join(file)).unwrap())
        .unwrap()
}

#[tokio::test]
async fn bundled_foundry_selects_and_verifies_offline() {
    let directory = tempfile::tempdir().unwrap();
    let mut store = Store::open(directory.path(), true).unwrap();
    let config = foundry::load_config(&repo().join("examples/foundry.config.json"), false).unwrap();
    assert!(config.generator.is_none());
    let report = foundry::run(
        &config.candidates,
        &config.cases,
        None,
        &mut store,
        &mut Host::default(),
        &Transports::new(),
    )
    .await
    .unwrap();
    assert_eq!(report["contract"], "algal.foundry.v1");
    assert!(report.get("lineage").is_none());
    // foundry-echo sweeps every split; foundry-constant only ties train.
    let winner = report["candidates"]
        .as_array()
        .unwrap()
        .iter()
        .find(|c| c["manifestKey"] == "organism:foundry-echo")
        .unwrap();
    assert_eq!(report["promoted"], winner["manifestDigest"]);
    assert_eq!(report["holdout"]["passed"], 1);
    let verified = foundry::verify(&report, &store, &Host::default())
        .await
        .unwrap();
    assert_eq!(verified["ok"], true, "{verified}");
    assert_eq!(verified["checkedReceipts"], 7);
}

#[tokio::test]
async fn generated_candidates_carry_lineage_and_verify() {
    let directory = tempfile::tempdir().unwrap();
    let mut store = Store::open(directory.path(), true).unwrap();
    let mut config = foundry::load_config(
        &repo().join("examples/generated-foundry.config.json"),
        false,
    )
    .unwrap();
    let generator = config.generator.as_ref().unwrap();
    let mut host = Host::scripted(responses("foundry-generator.responses.json"));
    let (generator_digest, receipt_digest, generated) = foundry::generate(
        &generator.manifest,
        &generator.args,
        &generator.output,
        generator.field.as_deref(),
        &mut store,
        &mut host,
        &Transports::new(),
    )
    .await
    .unwrap();
    assert_eq!(generated.len(), 2);
    config.candidates.extend(generated);
    let report = foundry::run(
        &config.candidates,
        &config.cases,
        Some((generator_digest.clone(), receipt_digest.clone())),
        &mut store,
        &mut Host::default(),
        &Transports::new(),
    )
    .await
    .unwrap();
    assert_eq!(
        report["lineage"]["generatorDigest"],
        json!(generator_digest)
    );
    assert_eq!(report["lineage"]["receiptDigest"], json!(receipt_digest));
    assert_eq!(report["holdout"]["passed"], 1);
    let verified = foundry::verify(&report, &store, &Host::default())
        .await
        .unwrap();
    assert_eq!(verified["ok"], true, "{verified}");
    assert_eq!(verified["checkedReceipts"], 6);
}

#[tokio::test]
async fn search_preserves_survivors_and_verifies() {
    let directory = tempfile::tempdir().unwrap();
    let mut store = Store::open(directory.path(), true).unwrap();
    let config = foundry::load_config(&repo().join("examples/search.config.json"), true).unwrap();
    let generator = config.generator.as_ref().unwrap();
    let search = config.search.as_ref().unwrap();
    let mut host = Host::scripted(responses("evolving-generator.responses.json"));
    let report = foundry::search(
        generator,
        &config.candidates,
        &config.cases,
        search,
        &mut store,
        &mut host,
        &Transports::new(),
    )
    .await
    .unwrap();
    assert_eq!(report["contract"], "algal.search.v1");
    let generations = report["generations"].as_array().unwrap();
    assert_eq!(generations.len(), 2);
    // Generation one must carry the generation zero winner forward.
    let first_winner = generations[0]["promoted"].clone();
    let gen1: Vec<&str> = generations[1]["candidates"]
        .as_array()
        .unwrap()
        .iter()
        .filter_map(|c| c["manifestDigest"].as_str())
        .collect();
    assert!(gen1.contains(&first_winner.as_str().unwrap()));
    assert_eq!(report["result"]["promoted"], generations[1]["promoted"]);
    let verified = foundry::verify_search(&report, &store, &Host::default())
        .await
        .unwrap();
    assert_eq!(verified["ok"], true, "{verified}");
    assert_eq!(verified["checkedReceipts"], 14);
}

#[tokio::test]
async fn verify_rejects_tampering_and_missing_evidence() {
    let directory = tempfile::tempdir().unwrap();
    let mut store = Store::open(directory.path(), true).unwrap();
    let config = foundry::load_config(&repo().join("examples/foundry.config.json"), false).unwrap();
    let report = foundry::run(
        &config.candidates,
        &config.cases,
        None,
        &mut store,
        &mut Host::default(),
        &Transports::new(),
    )
    .await
    .unwrap();

    // Tamper with a pass claim.
    let mut tampered: Value = report.clone();
    tampered["candidates"][0]["cases"][0]["passed"] = json!(false);
    let verified = foundry::verify(&tampered, &store, &Host::default())
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
    assert!(mismatches.contains("invalid pass claim"), "{mismatches}");

    // Verify against an empty store: every receipt and manifest is missing.
    let empty = tempfile::tempdir().unwrap();
    let empty_store = Store::open(empty.path(), false).unwrap();
    let verified = foundry::verify(&report, &empty_store, &Host::default())
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
    assert!(mismatches.contains("missing"), "{mismatches}");
}

#[test]
fn config_requires_all_splits_and_rejects_search_outside_search_mode() {
    let directory = tempfile::tempdir().unwrap();
    let write = |config: Value| -> PathBuf {
        let file = directory.path().join("config.json");
        std::fs::write(&file, serde_json::to_string(&config).unwrap()).unwrap();
        file
    };
    let base_cases = |splits: &[&str]| -> Vec<Value> {
        splits
            .iter()
            .enumerate()
            .map(|(i, split)| {
                json!({
                    "id":format!("case-{i}"),
                    "split":split,
                    "args":{"q":"x"},
                    "expect":{"answer":"x"},
                })
            })
            .collect()
    };

    // Missing holdout split.
    let file = write(json!({
        "contract":"algal.foundry.config.v1",
        "candidates":["x.json"],
        "cases":base_cases(&["train","validation"]),
    }));
    assert!(foundry::load_config(&file, false).is_err());

    // A search block is only legal under the search command.
    let file = write(json!({
        "contract":"algal.foundry.config.v1",
        "candidates":["x.json"],
        "cases":base_cases(&["train","validation","holdout"]),
        "search":{"maxGenerations":2,"feedbackInput":"feedback"},
    }));
    assert!(foundry::load_config(&file, false).is_err());

    // Wrong contract.
    let file = write(json!({
        "contract":"algal.foundry.config.v2",
        "candidates":["x.json"],
        "cases":base_cases(&["train","validation","holdout"]),
    }));
    assert!(foundry::load_config(&file, false).is_err());

    // Duplicate case ids.
    let file = write(json!({
        "contract":"algal.foundry.config.v1",
        "candidates":["x.json"],
        "cases":[
            {"id":"same","split":"train","args":{"q":"x"},"expect":{"answer":"x"}},
            {"id":"same","split":"validation","args":{"q":"x"},"expect":{"answer":"x"}},
            {"id":"other","split":"holdout","args":{"q":"x"},"expect":{"answer":"x"}},
        ],
    }));
    assert!(foundry::load_config(&file, false).is_err());
}

#[test]
fn selection_prefers_validation_then_train_then_cheap() {
    let candidate = |hex: char, train: (u64, u64), validation: (u64, u64), units: u64| {
        json!({
            "manifestDigest":format!("sha256:{}",hex.to_string().repeat(64)),
            "manifestKey":"organism:x",
            "train":{"passed":train.0,"total":train.1},
            "validation":{"passed":validation.0,"total":validation.1},
            "work":{"steps":0,"agentCalls":0,"units":units},
            "usage":{"tokensIn":0,"tokensOut":0},
            "cases":[],
        })
    };
    // Higher validation ratio wins even with a weaker train score.
    let a = candidate('a', (2, 2), (1, 2), 10);
    let b = candidate('b', (1, 2), (1, 1), 10);
    assert_eq!(
        foundry::select(&[a.clone(), b.clone()]).unwrap(),
        "sha256:".to_owned() + &"b".repeat(64)
    );
    // Tied scores prefer fewer units, then lexical digest order.
    let cheap = candidate('f', (1, 1), (1, 1), 10);
    let pricey = candidate('d', (1, 1), (1, 1), 20);
    assert_eq!(
        foundry::select(&[pricey.clone(), cheap.clone()]).unwrap(),
        "sha256:".to_owned() + &"f".repeat(64)
    );
    let same = candidate('e', (1, 1), (1, 1), 10);
    assert_eq!(
        foundry::select(&[cheap.clone(), same.clone()]).unwrap(),
        "sha256:".to_owned() + &"e".repeat(64)
    );
}
