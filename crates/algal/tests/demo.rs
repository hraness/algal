use algal::{canonical::digest, demo, process_evidence::verify_process_evidence};
use serde_json::{Value, json};
use std::{fs, path::Path, process::Command};

fn read(path: &Path) -> Value {
    serde_json::from_slice(&fs::read(path).unwrap()).unwrap()
}
fn messages(root: &Path, name: &str) -> usize {
    fs::read_dir(root.join("store/mailboxes").join(name).join("messages"))
        .unwrap()
        .count()
}
#[tokio::test]
async fn exact_approval_survives_restart_and_projection_loss_without_republication() {
    let temp = tempfile::tempdir().unwrap();
    let root = temp.path().join("approval");
    let evidence = json!({"change":"review this exact record","untrusted":"</script><script>alert(1)</script>"});
    let first = demo::start(&root, Some(evidence.clone())).await.unwrap();
    assert_eq!(first["status"], "waiting");
    assert_eq!(
        first["counters"],
        json!({"decisions":1,"proposals":1,"publications":0})
    );
    assert_eq!(first["evidence"]["value"], evidence);
    assert_eq!(messages(&root, "proposals"), 1);
    let proposal = first["proposal"]["digest"].as_str().unwrap();
    assert!(
        demo::choose(&root, &digest(&json!("wrong")).unwrap(), demo::ACTION, true)
            .await
            .is_err()
    );
    assert!(
        demo::choose(&root, proposal, "publish-remote", true)
            .await
            .is_err()
    );
    assert!(!root.join("decision.json").exists());
    assert_eq!(messages(&root, "publications"), 0);
    let approved = demo::choose(&root, proposal, demo::ACTION, true)
        .await
        .unwrap();
    assert_eq!(approved["status"], "approved");
    assert_eq!(
        approved["counters"],
        json!({"decisions":1,"proposals":1,"publications":1})
    );
    assert_eq!(messages(&root, "publications"), 1);
    let publication = read(&root.join("publication.json"));
    assert_eq!(publication, first["proposal"]["value"]);
    let head = approved["verification"]["digest"].clone();
    fs::remove_file(root.join("publication.json")).unwrap();
    let repeated = demo::choose(&root, proposal, demo::ACTION, true)
        .await
        .unwrap();
    assert_eq!(repeated["verification"]["digest"], head);
    assert_eq!(read(&root.join("publication.json")), publication);
    assert_eq!(messages(&root, "publications"), 1);
    assert_eq!(messages(&root, "approvals"), 1);
    assert!(
        demo::choose(&root, proposal, demo::ACTION, false)
            .await
            .is_err()
    );
    let capsule = demo::export(&root).await.unwrap();
    fs::rename(&root, temp.path().join("source-hidden")).unwrap();
    let verified = verify_process_evidence(&capsule).await.unwrap();
    assert_eq!(verified["digest"], head);
    assert_eq!(verified["status"], "complete");
}

#[tokio::test]
async fn denial_and_changed_review_are_fail_closed() {
    let temp = tempfile::tempdir().unwrap();
    let root = temp.path().join("denial");
    let first = demo::start(&root, None).await.unwrap();
    let proposal = first["proposal"]["digest"].as_str().unwrap();
    let denied = demo::choose(&root, proposal, demo::ACTION, false)
        .await
        .unwrap();
    assert_eq!(denied["status"], "denied");
    assert_eq!(denied["counters"]["publications"], 0);
    assert_eq!(messages(&root, "publications"), 0);
    assert!(!root.join("publication.json").exists());
    let repeat = demo::choose(&root, proposal, demo::ACTION, false)
        .await
        .unwrap();
    assert_eq!(repeat["verification"], denied["verification"]);
    assert!(
        demo::choose(&root, proposal, demo::ACTION, true)
            .await
            .is_err()
    );
    let mut changed = read(&root.join("review.json"));
    changed["proposal"]["summary"] = json!("modified after inspection");
    fs::write(
        root.join("review.json"),
        serde_json::to_vec(&changed).unwrap(),
    )
    .unwrap();
    assert!(demo::inspect(&root).await.is_err());
    assert!(
        demo::choose(&root, proposal, demo::ACTION, true)
            .await
            .is_err()
    );
}

#[tokio::test]
async fn roots_and_artifacts_never_follow_links_or_merge_existing_state() {
    let temp = tempfile::tempdir().unwrap();
    let root = temp.path().join("safe");
    assert!(
        demo::start(&root, Some(json!("x".repeat(9000))))
            .await
            .is_err()
    );
    assert!(!root.exists());
    let first = demo::start(&root, None).await.unwrap();
    assert!(demo::start(&root, None).await.is_err());
    let sentinel = temp.path().join("sentinel");
    fs::write(&sentinel, b"retained user content").unwrap();
    #[cfg(unix)]
    {
        use std::os::unix::fs::symlink;
        let linked = temp.path().join("linked");
        symlink(&root, &linked).unwrap();
        assert!(demo::start(&linked, None).await.is_err());
        assert!(demo::inspect(&linked).await.is_err());
        symlink(&sentinel, root.join("publication.json")).unwrap();
        assert!(
            demo::choose(
                &root,
                first["proposal"]["digest"].as_str().unwrap(),
                demo::ACTION,
                true
            )
            .await
            .is_err()
        );
        assert_eq!(fs::read(&sentinel).unwrap(), b"retained user content");
        assert!(!root.join("decision.json").exists());
    }
}

#[test]
fn staged_cli_uses_only_the_binary_and_rejects_host_flags() {
    let temp = tempfile::tempdir().unwrap();
    let root = temp.path().join("native");
    let call = |args: &[&str]| {
        Command::new(env!("CARGO_BIN_EXE_algal"))
            .env("PATH", "")
            .current_dir(temp.path())
            .args(args)
            .output()
            .unwrap()
    };
    let root_s = root.to_str().unwrap();
    let first = call(&["demo", "start", root_s]);
    assert!(
        first.status.success(),
        "{}",
        String::from_utf8_lossy(&first.stderr)
    );
    let report: Value = serde_json::from_slice(&first.stdout).unwrap();
    let proposal = report["proposal"]["digest"].as_str().unwrap();
    assert_eq!(
        report["commands"]["approve"][0],
        fs::canonicalize(env!("CARGO_BIN_EXE_algal"))
            .unwrap()
            .to_str()
            .unwrap()
    );
    let approved = call(&[
        "demo",
        "approve",
        root_s,
        "--proposal",
        proposal,
        "--action",
        demo::ACTION,
    ]);
    assert!(
        approved.status.success(),
        "{}",
        String::from_utf8_lossy(&approved.stderr)
    );
    let repeated = call(&[
        "demo",
        "approve",
        root_s,
        "--proposal",
        proposal,
        "--action",
        demo::ACTION,
    ]);
    assert!(repeated.status.success());
    assert_eq!(messages(&root, "publications"), 1);
    let exported = call(&["demo", "export", root_s]);
    assert!(
        exported.status.success(),
        "{}",
        String::from_utf8_lossy(&exported.stderr)
    );
    let portable = temp.path().join("portable.json");
    fs::write(&portable, &exported.stdout).unwrap();
    fs::rename(&root, temp.path().join("hidden")).unwrap();
    assert!(
        call(&["demo", "verify", portable.to_str().unwrap()])
            .status
            .success()
    );
    assert!(
        !call(&[
            "demo",
            "verify",
            portable.to_str().unwrap(),
            "--dir",
            "unexpected"
        ])
        .status
        .success()
    );
    assert!(!temp.path().join("unexpected").exists());
    assert!(!temp.path().join(".algal").exists());
}

#[test]
fn one_binary_proof_kills_only_owned_children_and_never_retries_unknown_writes() {
    let temp = tempfile::tempdir().unwrap();
    let root = temp.path().join("proof");
    let result = Command::new(env!("CARGO_BIN_EXE_algal"))
        .env("PATH", "")
        .current_dir(temp.path())
        .args(["demo", "prove", root.to_str().unwrap()])
        .output()
        .unwrap();
    assert!(
        result.status.success(),
        "{}",
        String::from_utf8_lossy(&result.stderr)
    );
    let report: Value = serde_json::from_slice(&result.stdout).unwrap();
    assert_eq!(report["ok"], true);
    assert_eq!(report["approval"]["publications"], 1);
    assert_eq!(report["denial"]["publications"], 0);
    assert_eq!(report["portable"]["sourceMovedAway"], true);
    assert_eq!(report["portable"]["verification"]["ok"], true);
    assert_eq!(report["readCrash"]["status"], "complete");
    assert_eq!(report["writeCrash"]["status"], "uncertain");
    for mode in ["readCrash", "writeCrash"] {
        assert_eq!(report[mode]["ownedChildKilledAndJoined"], true);
        assert_eq!(report[mode]["counters"]["prefixPublications"], 1);
        assert_eq!(report[mode]["counters"]["scheduledTicks"], 0);
    }
    assert_eq!(report["writeCrash"]["refusal"]["code"], "RECOVERY_BLOCKED");
    assert_eq!(
        report["writeCrash"]["counters"]["pendingWritePublications"],
        1
    );
    assert_eq!(
        report["writeCrash"]["journalBefore"],
        report["writeCrash"]["journalAfter"]
    );
    assert!(!temp.path().join(".algal").exists());
}
