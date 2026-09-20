use algal::{
    canonical::{canonical, digest},
    contract::Manifest,
    effects::Host,
    graph::Transports,
    process::{ProcessService, ProcessState},
    process_evidence::{evidence_host, export_process_evidence, verify_process_evidence},
    store::Store,
};
use serde_json::{Value, json};
use std::{collections::BTreeSet, fs};

fn input_manifest(many: bool) -> Manifest {
    Manifest::parse(&json!({"contract":"algal.organism.v1","key":"organism:portable-refs","name":"Portable refs",
        "cells":[{"id":"input","kind":"input","outputs":{"data":{"type":"ref","many":many}}}],"edges":[]})).unwrap()
}
async fn episode(
    manifest: Manifest,
    args: Value,
    seeds: &[Value],
) -> (tempfile::TempDir, ProcessService, ProcessState) {
    let directory = tempfile::tempdir().unwrap();
    let mut service = ProcessService::open(directory.path()).unwrap();
    for value in seeds {
        service.store.put("values", value).unwrap();
    }
    let mut host = Host::default();
    service
        .create("portable", manifest, args, 4, &host, &Transports::new())
        .unwrap();
    let snapshot = service
        .tick("portable", None, &mut host, &Transports::new())
        .await
        .unwrap();
    (directory, service, snapshot)
}

#[tokio::test]
async fn many_independent_ref_inputs_are_exported_and_verify_after_source_deletion() {
    let seeds: Vec<_> = (0..80).map(|entry| json!({"entry":entry})).collect();
    let refs: Vec<_> = seeds.iter().map(|value| digest(value).unwrap()).collect();
    let cells: Vec<_> = (0..5).map(|n| json!({"id":format!("input-{n}"),"kind":"input","outputs":(0..16).map(|p|(format!("item-{p}"),json!("ref"))).collect::<serde_json::Map<String,Value>>()})).collect();
    let args = Value::Object(
        (0..5)
            .map(|n| {
                (
                    format!("input-{n}"),
                    Value::Object(
                        (0..16)
                            .map(|p| (format!("item-{p}"), json!(refs[n * 16 + p])))
                            .collect(),
                    ),
                )
            })
            .collect(),
    );
    let manifest = Manifest::parse(&json!({"contract":"algal.organism.v1","key":"organism:many-source-refs","name":"Many source refs","cells":cells,"edges":[]})).unwrap();
    let (directory, service, snapshot) = episode(manifest, args, &seeds).await;
    assert_eq!(snapshot.process.status, "complete");
    let capsule = export_process_evidence(&snapshot, &service.store, &Host::default())
        .await
        .unwrap();
    assert_eq!(capsule["program"]["values"].as_object().unwrap().len(), 80);
    drop(service);
    directory.close().unwrap();
    let verified = verify_process_evidence(&capsule).await.unwrap();
    assert_eq!(
        verified,
        json!({"ok":true,"digest":snapshot.digest,"status":"complete","generations":1,"receipts":1,"evidenceDigest":digest(&capsule).unwrap()})
    );
    let mut missing = capsule.clone();
    missing["program"]["values"]
        .as_object_mut()
        .unwrap()
        .remove(&refs[0]);
    assert!(verify_process_evidence(&missing).await.is_err());
    let mut tampered = capsule.clone();
    tampered["records"][&snapshot.digest]["generation"] = json!(2);
    assert!(verify_process_evidence(&tampered).await.is_err());
}

#[tokio::test]
async fn negative_dependencies_are_explicit_sorted_and_not_proof_of_success() {
    let key = digest(&json!("never installed")).unwrap();
    let (_directory, service, snapshot) =
        episode(input_manifest(false), json!({"input":{"data":key}}), &[]).await;
    assert_eq!(snapshot.process.status, "failed");
    let capsule = export_process_evidence(&snapshot, &service.store, &Host::default())
        .await
        .unwrap();
    assert_eq!(capsule["missing"]["values"], json!([key]));
    assert_eq!(
        verify_process_evidence(&capsule).await.unwrap()["status"],
        "failed"
    );
    let mut absent = capsule.clone();
    absent["missing"]["values"] = json!([]);
    assert!(verify_process_evidence(&absent).await.is_err());
    let mut duplicate = capsule.clone();
    duplicate["missing"]["values"] = json!([key, key]);
    assert!(verify_process_evidence(&duplicate).await.is_err());
    let mut overlap = capsule;
    overlap["missing"]["values"] = json!([snapshot.digest]);
    assert!(verify_process_evidence(&overlap).await.is_err());
}

#[tokio::test]
async fn self_hashed_orphan_and_rebound_malformed_runtime_receipts_are_refused() {
    let key = digest(&json!("missing")).unwrap();
    let (_directory, service, snapshot) =
        episode(input_manifest(false), json!({"input":{"data":key}}), &[]).await;
    let capsule = export_process_evidence(&snapshot, &service.store, &Host::default())
        .await
        .unwrap();
    let mut orphan = capsule.clone();
    let receipt_key = snapshot.process.receipt.as_ref().unwrap();
    let mut extra = orphan["receipts"][receipt_key].clone();
    extra["runtime"]["version"] = json!("unused-valid-runtime");
    extra["digest"] = json!(algal::runtime::receipt_digest(&extra).unwrap());
    let extra_key = digest(&extra).unwrap();
    orphan["receipts"][extra_key] = extra;
    assert!(verify_process_evidence(&orphan).await.is_err());
    let mut via_forgery = capsule.clone();
    let mut receipt = via_forgery["receipts"][receipt_key].clone();
    receipt["cells"]["input"]["via"] = json!("x".repeat(129));
    receipt["digest"] = json!(algal::runtime::receipt_digest(&receipt).unwrap());
    let new_receipt = digest(&receipt).unwrap();
    via_forgery["receipts"] = json!({new_receipt.clone():receipt});
    let mut head = via_forgery["records"][&snapshot.digest].clone();
    head["receipt"] = json!(new_receipt);
    let new_head = digest(&head).unwrap();
    via_forgery["records"]
        .as_object_mut()
        .unwrap()
        .remove(&snapshot.digest);
    via_forgery["records"][&new_head] = head;
    via_forgery["head"] = json!(new_head);
    assert!(verify_process_evidence(&via_forgery).await.is_err());
    // Recompute all affected digests: integrity alone cannot make foreign
    // runtime metadata an admissible historical receipt.
    for metadata in [
        Value::Null,
        json!({"name":"other","version":"1"}),
        json!({"name":"algal","version":"1","exec":"forbidden"}),
    ] {
        let mut forged = capsule.clone();
        let mut receipt = forged["receipts"][receipt_key].clone();
        receipt["runtime"] = metadata;
        receipt["digest"] = json!(algal::runtime::receipt_digest(&receipt).unwrap());
        let new_receipt = digest(&receipt).unwrap();
        forged["receipts"] = json!({new_receipt.clone():receipt});
        let mut head = forged["records"][&snapshot.digest].clone();
        head["receipt"] = json!(new_receipt);
        let new_head = digest(&head).unwrap();
        forged["records"]
            .as_object_mut()
            .unwrap()
            .remove(&snapshot.digest);
        forged["records"][&new_head] = head;
        forged["head"] = json!(new_head);
        assert!(verify_process_evidence(&forged).await.is_err());
    }
}

#[test]
fn source_trace_tracks_seeded_values_and_misses_but_not_overlay_outputs() {
    let mut source = Store::default();
    let seeded = source.put("values", &json!("source")).unwrap();
    let generated_seed = source
        .put("values", &json!("already stored intermediate"))
        .unwrap();
    let traced = source.trace_source_reads();
    let mut overlay = traced.overlay();
    let generated = overlay.put("values", &json!("generated")).unwrap();
    overlay
        .put("values", &json!("already stored intermediate"))
        .unwrap();
    assert!(overlay.get("values", &generated_seed).unwrap().is_some());
    assert!(overlay.get("values", &seeded).unwrap().is_some());
    assert!(overlay.get("values", &generated).unwrap().is_some());
    let absent = digest(&json!("absent")).unwrap();
    assert!(overlay.get("values", &absent).unwrap().is_none());
    let reads = traced.source_reads().unwrap();
    assert_eq!(reads.len(), 2);
    assert!(reads.contains_key(&("values".into(), seeded)));
    assert_eq!(reads.get(&("values".into(), absent)), Some(&None));
    assert!(!reads.contains_key(&("values".into(), generated)));
    assert!(!reads.contains_key(&("values".into(), generated_seed)));
    let sealed = Store::evidence_memory(BTreeSet::new());
    assert!(
        sealed
            .overlay()
            .get("values", &digest(&json!("omitted")).unwrap())
            .is_err()
    );
    assert!(
        sealed.check_evidence_reads().is_err(),
        "caught errors must poison verification"
    );
    let original = Store::default();
    let poisoned = original.trace_source_reads();
    assert!(poisoned.overlay().get("values", "invalid-digest").is_err());
    assert!(poisoned.check_evidence_reads().is_err());
    assert!(original.check_evidence_reads().is_ok());
    assert!(original.trace_source_reads().check_evidence_reads().is_ok());
}

#[tokio::test]
async fn replay_generated_values_are_not_exported_as_source_dependencies() {
    let manifest = Manifest::parse(&json!({"contract":"algal.organism.v1","key":"organism:portable-overlay","name":"Overlay",
        "cells":[{"id":"input","kind":"input","outputs":{"data":"json"}},{"id":"pin","kind":"store"},{"id":"get","kind":"load"}],
        "edges":[{"from":{"cell":"input","port":"data"},"to":{"cell":"pin","port":"data"}},{"from":{"cell":"pin","port":"ref"},"to":{"cell":"get","port":"ref"}}]})).unwrap();
    let (directory, service, snapshot) = episode(
        manifest,
        json!({"input":{"data":{"generated":"here"}}}),
        &[],
    )
    .await;
    // A fresh source store excludes original runtime in-memory writes, matching
    // what an independent command sees. Replay must supply its own intermediate.
    let source = Store::open(directory.path(), false).unwrap();
    let capsule = export_process_evidence(&snapshot, &source, &Host::default())
        .await
        .unwrap();
    assert_eq!(capsule["program"]["values"], json!({}));
    drop(service);
    directory.close().unwrap();
    assert_eq!(verify_process_evidence(&capsule).await.unwrap()["ok"], true);
}

#[tokio::test]
async fn ready_and_uncertain_heads_remain_inactive_and_keep_status() {
    let directory = tempfile::tempdir().unwrap();
    let mut service = ProcessService::open(directory.path()).unwrap();
    let manifest = Manifest::parse(&json!({"contract":"algal.organism.v1","key":"organism:portable-tool","name":"Inactive","cells":[{"id":"invoke","kind":"tool","tool":"never.v1"}],"edges":[]})).unwrap();
    let signature = json!({"never.v1":{"inputs":{},"outputs":{"value":"text"},"cost":1,"effect":"write","maxOutputBytes":64}});
    let host = evidence_host(&signature).unwrap();
    let ready = service
        .create(
            "portable",
            manifest,
            json!({}),
            4,
            &host,
            &Transports::new(),
        )
        .unwrap();
    let ready_capsule = export_process_evidence(&ready, &service.store, &host)
        .await
        .unwrap();
    assert_eq!(
        verify_process_evidence(&ready_capsule).await.unwrap()["status"],
        "ready"
    );
    let mut process = ready.process.clone();
    process.status = "uncertain".into();
    process.generation = 1;
    process.previous = Some(ready.digest);
    process.cause = Some("start".into());
    let key = service
        .store
        .put("values", &serde_json::to_value(&process).unwrap())
        .unwrap();
    let snapshot = ProcessState {
        digest: key,
        process,
    };
    let mut capsule = export_process_evidence(&snapshot, &service.store, &host)
        .await
        .unwrap();
    assert_eq!(
        verify_process_evidence(&capsule).await.unwrap()["status"],
        "uncertain"
    );
    capsule["tools"]["never.v1"]["exec"] = json!("cmd:touch forbidden");
    assert!(verify_process_evidence(&capsule).await.is_err());
    let mut shorthand = ready_capsule;
    shorthand["tools"]["never.v1"]["outputs"]["value"] = json!("text");
    assert_eq!(
        verify_process_evidence(&shorthand).await.unwrap()["evidenceDigest"],
        digest(&shorthand).unwrap()
    );
}

#[tokio::test]
async fn cli_verifies_without_store_and_rejects_host_flags_before_store_access() {
    let key = digest(&json!("missing")).unwrap();
    let (directory, service, snapshot) =
        episode(input_manifest(false), json!({"input":{"data":key}}), &[]).await;
    let capsule = export_process_evidence(&snapshot, &service.store, &Host::default())
        .await
        .unwrap();
    let exported = std::process::Command::new(env!("CARGO_BIN_EXE_algal"))
        .args(["process", "export", "portable", "--dir"])
        .arg(directory.path())
        .output()
        .unwrap();
    assert!(
        exported.status.success(),
        "{}",
        String::from_utf8_lossy(&exported.stderr)
    );
    assert_eq!(exported.stdout.last(), Some(&b'}'));
    assert!(!exported.stdout.ends_with(b"\n"));
    let detached = tempfile::tempdir().unwrap();
    let file = detached.path().join("evidence.json");
    fs::write(&file, canonical(&capsule).unwrap()).unwrap();
    drop(service);
    directory.close().unwrap();
    let executable = env!("CARGO_BIN_EXE_algal");
    let output = std::process::Command::new(executable)
        .current_dir(detached.path())
        .args(["process", "verify-evidence"])
        .arg(&file)
        .output()
        .unwrap();
    assert!(
        output.status.success(),
        "{}",
        String::from_utf8_lossy(&output.stderr)
    );
    assert!(!detached.path().join(".algal").exists());
    for arguments in [
        vec!["--dir", "/unavailable-host-state"],
        vec!["--tools", "/unavailable-host-tools"],
        vec!["--executor-cmd", "touch forbidden"],
    ] {
        let output = std::process::Command::new(executable)
            .current_dir(detached.path())
            .args(["process", "verify-evidence"])
            .arg(&file)
            .args(arguments)
            .output()
            .unwrap();
        assert!(!output.status.success());
    }
    assert!(!detached.path().join("forbidden").exists());
}

#[tokio::test]
async fn named_heads_cannot_redirect_to_other_process_records() {
    let directory = tempfile::tempdir().unwrap();
    let mut service = ProcessService::open(directory.path()).unwrap();
    let manifest=Manifest::parse(&json!({"contract":"algal.organism.v1","key":"organism:ready","name":"Ready","cells":[],"edges":[]})).unwrap();
    service
        .create(
            "left",
            manifest.clone(),
            json!({}),
            4,
            &Host::default(),
            &Transports::new(),
        )
        .unwrap();
    let right = service
        .create(
            "right",
            manifest,
            json!({}),
            4,
            &Host::default(),
            &Transports::new(),
        )
        .unwrap();
    fs::write(
        directory.path().join("processes/left/head.json"),
        canonical(&json!({"contract":"algal.process-head.v1","name":"left","record":right.digest}))
            .unwrap(),
    )
    .unwrap();
    assert!(service.inspect("left").is_err());
}
