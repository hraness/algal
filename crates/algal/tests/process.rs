use algal::{
    canonical::{canonical, digest},
    capabilities::parse_wake_capabilities,
    contract::Manifest,
    effects::{Backend, Host},
    graph::Transports,
    mailbox::{MailboxService, external_wake_key},
    process::{ProcessRecord, ProcessService},
    runtime,
    store::Store,
};
use serde_json::{Value, json};
use std::fs;

fn receiver() -> Manifest {
    Manifest::parse(&json!({
        "contract":"algal.organism.v1","key":"organism:vm-receiver","name":"VM receiver",
        "cells":[
            {"id":"a-source","kind":"input","outputs":{"inbox":{"type":"cap","capability":"mailbox-receive"},"outbox":{"type":"cap","capability":"mailbox-send"},"payload":"json"}},
            {"id":"b-send","kind":"tool","tool":"mailbox.send.v1"},
            {"id":"c-wait","kind":"tool","tool":"mailbox.receive.v1"}
        ],
        "edges":[
            {"from":{"cell":"a-source","port":"outbox"},"to":{"cell":"b-send","port":"mailbox"}},
            {"from":{"cell":"a-source","port":"payload"},"to":{"cell":"b-send","port":"message"}},
            {"from":{"cell":"a-source","port":"inbox"},"to":{"cell":"c-wait","port":"mailbox"}}
        ]
    })).unwrap()
}

fn host(mailboxes: &MailboxService) -> Host {
    let mut host = Host::default();
    host.install_mailboxes(mailboxes.clone()).unwrap();
    host
}

#[tokio::test]
async fn restart_wake_replays_prefix_and_verifies_every_generation_offline() {
    let directory = tempfile::tempdir().unwrap();
    let mailboxes = MailboxService::open(directory.path());
    let inbox = mailboxes.create("inbox", 16, 1024).unwrap();
    let outbox = mailboxes.create("outbox", 16, 1024).unwrap();
    let args =
        json!({"a-source":{"inbox":inbox.receive,"outbox":outbox.send,"payload":{"task":"ready"}}});
    let mut service = ProcessService::open(directory.path()).unwrap();
    let mut host = host(&mailboxes);
    let initial = service
        .create(
            "worker",
            receiver(),
            args.clone(),
            4,
            &host,
            &Transports::new(),
        )
        .unwrap();
    assert_eq!(initial.process.generation, 0);
    let sleeping = service
        .tick("worker", None, &mut host, &Transports::new())
        .await
        .unwrap();
    assert_eq!(sleeping.process.status, "suspended");
    assert_eq!(sleeping.process.wake, vec![inbox.receive.clone()]);
    let sent = mailboxes.receive(&outbox.receive).unwrap();
    assert!(!mailboxes.has_pending(&outbox.receive).unwrap());
    assert_eq!(
        service
            .schedule(16, &mut host, &Transports::new())
            .await
            .unwrap()["ticks"],
        0
    );
    drop(service);
    // A fresh supervisor loads all evidence from disk, as a new CLI invocation does.
    let mut service = ProcessService::open(directory.path()).unwrap();
    mailboxes
        .send(
            &inbox.send,
            json!({"approved":true}),
            &external_wake_key().unwrap(),
        )
        .unwrap();
    let scheduled = service
        .schedule(16, &mut host, &Transports::new())
        .await
        .unwrap();
    assert_eq!(scheduled["ticks"], 1);
    assert_eq!(scheduled["processes"][0]["process"]["status"], "complete");
    assert_eq!(scheduled["processes"][0]["process"]["cause"], inbox.receive);
    assert!(
        !mailboxes.has_pending(&outbox.receive).unwrap(),
        "completed send must not repeat"
    );
    let verified = service.verify("worker", &host).await.unwrap();
    assert_eq!(verified["generations"], 2);
    assert_eq!(verified["receipts"], 2);
    assert!(
        service
            .tick("worker", None, &mut host, &Transports::new())
            .await
            .is_err()
    );
    // A distinct process with identical request content receives its own effect key.
    service
        .create("other", receiver(), args, 4, &host, &Transports::new())
        .unwrap();
    service
        .tick("other", None, &mut host, &Transports::new())
        .await
        .unwrap();
    assert_ne!(
        mailboxes.receive(&outbox.receive).unwrap()["id"],
        sent["id"]
    );
}

#[tokio::test]
async fn resume_preserves_other_slot_writers_and_reads_live_suffix_slots() {
    let directory = tempfile::tempdir().unwrap();
    let mailboxes = MailboxService::open(directory.path());
    let inbox = mailboxes.create("slot-wake", 4, 1024).unwrap();
    let mut host = host(&mailboxes);
    let manifest = Manifest::parse(&json!({
        "contract":"algal.organism.v1","key":"organism:slot-resume","name":"Slot resume",
        "cells":[
            {"id":"a-source","kind":"input","outputs":{"inbox":{"type":"cap","capability":"mailbox-receive"},"data":"json"}},
            {"id":"b-write","kind":"slot","name":"shared","mode":"write"},
            {"id":"c-wait","kind":"tool","tool":"mailbox.receive.v1"},
            {"id":"d-read","kind":"slot","name":"fresh","mode":"read"}
        ],
        "edges":[
            {"from":{"cell":"a-source","port":"data"},"to":{"cell":"b-write","port":"data"}},
            {"from":{"cell":"a-source","port":"inbox"},"to":{"cell":"c-wait","port":"mailbox"}}
        ]
    })).unwrap();
    let mut store = Store::open(directory.path(), true).unwrap();
    let checkpoint = runtime::run(
        manifest.clone(),
        json!({"a-source":{"inbox":inbox.receive,"data":"old"}}),
        &mut store,
        &mut host,
        &Transports::new(),
        None,
    )
    .await
    .unwrap();
    assert_eq!(checkpoint["outcome"], "suspended");
    store.set_slot("shared", &json!("newer writer")).unwrap();
    store
        .set_slot("fresh", &json!("arrived while asleep"))
        .unwrap();
    mailboxes
        .send(&inbox.send, json!(true), &external_wake_key().unwrap())
        .unwrap();
    let mut forged = checkpoint.clone();
    forged["work"]["units"] = json!(0);
    forged["digest"] = json!(runtime::receipt_digest(&forged).unwrap());
    assert_eq!(
        runtime::resume(
            &forged,
            manifest.clone(),
            &mut store,
            &mut host,
            &Transports::new()
        )
        .await
        .unwrap_err()
        .code,
        "VERIFY_FAILED"
    );
    assert!(mailboxes.has_pending(&inbox.receive).unwrap());
    let resumed = runtime::resume(
        &checkpoint,
        manifest.clone(),
        &mut store,
        &mut host,
        &Transports::new(),
    )
    .await
    .unwrap();
    assert_eq!(resumed["outcome"], "complete");
    assert_eq!(
        store.get_slot("shared").unwrap(),
        Some(json!("newer writer"))
    );
    assert_eq!(
        resumed["cells"]["d-read"]["outputs"]["data"],
        "arrived while asleep"
    );
    assert_eq!(
        runtime::verify(&resumed, manifest, &store, &host)
            .await
            .unwrap()["ok"],
        true
    );
}

#[tokio::test]
async fn uncertain_dispatch_and_stale_locks_never_retry_automatically() {
    let directory = tempfile::tempdir().unwrap();
    let mailboxes = MailboxService::open(directory.path());
    let inbox = mailboxes.create("inbox", 4, 1024).unwrap();
    let outbox = mailboxes.create("outbox", 4, 1024).unwrap();
    let mut host = host(&mailboxes);
    let mut service = ProcessService::open(directory.path()).unwrap();
    let initial = service
        .create(
            "uncertain",
            receiver(),
            json!({"a-source":{"inbox":inbox.receive,"outbox":outbox.send,"payload":true}}),
            2,
            &host,
            &Transports::new(),
        )
        .unwrap();
    let mut intent: ProcessRecord = initial.process;
    intent.status = "uncertain".into();
    intent.generation = 1;
    intent.previous = Some(initial.digest);
    intent.cause = Some("start".into());
    let key = service
        .store
        .put("values", &serde_json::to_value(intent).unwrap())
        .unwrap();
    let path = directory.path().join("processes/uncertain/head.json");
    fs::write(
        path,
        canonical(&json!({"contract":"algal.process-head.v1","name":"uncertain","record":key}))
            .unwrap(),
    )
    .unwrap();
    assert!(
        service
            .tick("uncertain", None, &mut host, &Transports::new())
            .await
            .is_err()
    );
    assert_eq!(
        service
            .schedule(16, &mut host, &Transports::new())
            .await
            .unwrap()["ticks"],
        0
    );
    assert!(!mailboxes.has_pending(&outbox.receive).unwrap());
    assert_eq!(
        service.verify("uncertain", &host).await.unwrap()["receipts"],
        0
    );
    fs::write(
        directory.path().join("mailboxes/inbox/.lock"),
        "interrupted",
    )
    .unwrap();
    assert_eq!(
        mailboxes.has_pending(&inbox.receive).unwrap_err().code,
        "IO_FAILED"
    );
    assert!(directory.path().join("mailboxes/inbox/.lock").exists());
}

#[tokio::test]
async fn generation_budget_and_cas_corruption_fail_closed() {
    let directory = tempfile::tempdir().unwrap();
    let mailboxes = MailboxService::open(directory.path());
    let inbox = mailboxes.create("inbox", 4, 1024).unwrap();
    let outbox = mailboxes.create("outbox", 4, 1024).unwrap();
    let mut host = host(&mailboxes);
    let mut service = ProcessService::open(directory.path()).unwrap();
    let args = json!({"a-source":{"inbox":inbox.receive,"outbox":outbox.send,"payload":true}});
    service
        .create(
            "bounded",
            receiver(),
            args.clone(),
            1,
            &host,
            &Transports::new(),
        )
        .unwrap();
    let suspended = service
        .tick("bounded", None, &mut host, &Transports::new())
        .await
        .unwrap();
    assert_eq!(
        service
            .tick("bounded", None, &mut host, &Transports::new())
            .await
            .unwrap_err()
            .code,
        "BUDGET_EXHAUSTED"
    );
    assert!(
        service
            .create("bounded", receiver(), args, 1, &host, &Transports::new())
            .is_err()
    );
    let mut corrupt = serde_json::to_value(suspended.process).unwrap();
    corrupt["generation"] = json!(0);
    fs::write(
        directory
            .path()
            .join("values")
            .join(format!("{}.json", &suspended.digest[7..])),
        canonical(&corrupt).unwrap(),
    )
    .unwrap();
    // Fresh store avoids serving the legitimate in-memory copy of a now-corrupt file.
    let fresh = ProcessService::open(directory.path()).unwrap();
    assert_eq!(
        fresh.inspect("bounded").unwrap_err().code,
        "DIGEST_MISMATCH"
    );
}

#[test]
fn wake_evidence_is_bounded_and_unique() {
    let handle = format!("cap:mailbox-receive:{}", digest(&json!("wake")).unwrap());
    assert!(parse_wake_capabilities(&json!([])).is_err());
    assert!(parse_wake_capabilities(&json!([handle, handle])).is_err());
    assert!(parse_wake_capabilities(&Value::Null).is_err());
}

#[tokio::test]
async fn audit_counts_identical_checkpoints_and_rejects_rewritten_prefix_evidence() {
    let directory = tempfile::tempdir().unwrap();
    let mailboxes = MailboxService::open(directory.path());
    let inbox = mailboxes.create("inbox", 4, 1024).unwrap();
    let outbox = mailboxes.create("outbox", 4, 1024).unwrap();
    let mut host = host(&mailboxes);
    let mut service = ProcessService::open(directory.path()).unwrap();
    service
        .create(
            "audit",
            receiver(),
            json!({"a-source":{"inbox":inbox.receive,"outbox":outbox.send,"payload":true}}),
            4,
            &host,
            &Transports::new(),
        )
        .unwrap();
    let first = service
        .tick("audit", None, &mut host, &Transports::new())
        .await
        .unwrap();
    let second = service
        .tick("audit", None, &mut host, &Transports::new())
        .await
        .unwrap();
    assert_eq!(first.process.receipt, second.process.receipt);
    assert_eq!(service.verify("audit", &host).await.unwrap()["receipts"], 2);
    let mut forged = service
        .store
        .get("runs", second.process.receipt.as_ref().unwrap())
        .unwrap()
        .unwrap();
    forged["effects"][0]["output"]["id"] = json!("a different receipted send");
    forged["cells"]["b-send"]["outputs"]["id"] = json!("a different receipted send");
    forged["digest"] = json!(runtime::receipt_digest(&forged).unwrap());
    // Recompute the cell work, because the changed tool output has a new byte length.
    let previous_output = service
        .store
        .get("runs", second.process.receipt.as_ref().unwrap())
        .unwrap()
        .unwrap()["effects"][0]["output"]
        .clone();
    let delta = canonical(&forged["effects"][0]["output"]).unwrap().len() as i64
        - canonical(&previous_output).unwrap().len() as i64;
    forged["cells"]["b-send"]["work"] =
        json!(forged["cells"]["b-send"]["work"].as_i64().unwrap() + delta);
    forged["work"]["units"] = json!(forged["work"]["units"].as_i64().unwrap() + delta);
    forged["digest"] = json!(runtime::receipt_digest(&forged).unwrap());
    assert_eq!(
        runtime::verify(&forged, receiver(), &service.store, &host)
            .await
            .unwrap()["ok"],
        true
    );
    let mut record = second.process;
    record.receipt = Some(service.store.put("runs", &forged).unwrap());
    let key = service
        .store
        .put("values", &serde_json::to_value(record).unwrap())
        .unwrap();
    fs::write(
        directory.path().join("processes/audit/head.json"),
        canonical(&json!({"contract":"algal.process-head.v1","name":"audit","record":key}))
            .unwrap(),
    )
    .unwrap();
    assert!(
        service
            .inspect("audit")
            .unwrap_err()
            .message
            .contains("prefix")
    );
}

#[tokio::test]
async fn deterministic_guard_failure_after_a_live_write_settles_with_evidence() {
    let directory = tempfile::tempdir().unwrap();
    let mailboxes = MailboxService::open(directory.path());
    let inbox = mailboxes.create("inbox", 4, 1024).unwrap();
    let outbox = mailboxes.create("outbox", 4, 1024).unwrap();
    let mut host = host(&mailboxes);
    let mut service = ProcessService::open(directory.path()).unwrap();
    let mut manifest = receiver().value;
    manifest["edges"][2]["guard"] = json!({"expr":{"contract":"algal.expr.v1","program":1}});
    service
        .create(
            "exception",
            Manifest::parse(&manifest).unwrap(),
            json!({"a-source":{"inbox":inbox.receive,"outbox":outbox.send,"payload":true}}),
            4,
            &host,
            &Transports::new(),
        )
        .unwrap();
    let failed = service
        .tick("exception", None, &mut host, &Transports::new())
        .await
        .unwrap();
    assert_eq!(failed.process.status, "failed");
    let receipt = service
        .store
        .get("runs", failed.process.receipt.as_ref().unwrap())
        .unwrap()
        .unwrap();
    assert_eq!(receipt["failure"]["code"], "GUARD_INVALID");
    assert_eq!(receipt["effects"].as_array().unwrap().len(), 1);
    assert_eq!(receipt["cells"]["b-send"]["status"], "committed");
    assert_eq!(
        service.verify("exception", &host).await.unwrap()["receipts"],
        1
    );
    assert!(mailboxes.has_pending(&outbox.receive).unwrap());
    mailboxes.receive(&outbox.receive).unwrap();
    let mut restarted = ProcessService::open(directory.path()).unwrap();
    assert_eq!(
        restarted.inspect("exception").unwrap().process.status,
        "failed"
    );
    assert_eq!(
        restarted
            .schedule(16, &mut host, &Transports::new())
            .await
            .unwrap()["ticks"],
        0
    );
    assert!(
        restarted
            .tick("exception", None, &mut host, &Transports::new())
            .await
            .is_err()
    );
    assert!(!mailboxes.has_pending(&outbox.receive).unwrap());
}

#[tokio::test]
async fn receipt_publication_failure_after_a_live_write_leaves_durable_uncertain_intent() {
    let directory = tempfile::tempdir().unwrap();
    let mailboxes = MailboxService::open(directory.path());
    let inbox = mailboxes.create("inbox", 4, 1024).unwrap();
    let outbox = mailboxes.create("outbox", 4, 1024).unwrap();
    let mut host = host(&mailboxes);
    let mut service = ProcessService::open(directory.path()).unwrap();
    service
        .create(
            "exception",
            receiver(),
            json!({"a-source":{"inbox":inbox.receive,"outbox":outbox.send,"payload":true}}),
            4,
            &host,
            &Transports::new(),
        )
        .unwrap();
    // A real filesystem fault is discovered only when the receipt is published,
    // after the live mailbox send has completed. A deterministic cell failure
    // is receipted and no longer provides this exceptional exit path.
    let obstruction = directory.path().join("runs");
    fs::write(&obstruction, b"receipt namespace unavailable").unwrap();
    assert!(
        service
            .tick("exception", None, &mut host, &Transports::new())
            .await
            .is_err()
    );
    assert!(mailboxes.has_pending(&outbox.receive).unwrap());
    mailboxes.receive(&outbox.receive).unwrap();
    fs::remove_file(obstruction).unwrap();
    drop(service);
    let mut restarted = ProcessService::open(directory.path()).unwrap();
    let uncertain = restarted.inspect("exception").unwrap();
    assert_eq!(uncertain.process.status, "uncertain");
    assert!(uncertain.process.receipt.is_none());
    assert_eq!(
        restarted
            .schedule(16, &mut host, &Transports::new())
            .await
            .unwrap()["ticks"],
        0
    );
    assert!(
        restarted
            .tick("exception", None, &mut host, &Transports::new())
            .await
            .is_err()
    );
    assert_eq!(
        restarted.inspect("exception").unwrap().digest,
        uncertain.digest
    );
    assert!(!mailboxes.has_pending(&outbox.receive).unwrap());
    assert!(!directory.path().join("runs").exists());
}

#[test]
fn process_schema_rejects_explicit_null_optional_fields() {
    let directory = tempfile::tempdir().unwrap();
    let mut service = ProcessService::open(directory.path()).unwrap();
    let manifest = Manifest::parse(&json!({"contract":"algal.organism.v1","key":"organism:strict","name":"Strict","cells":[{"id":"value","kind":"const","outputs":{"out":{"type":"json","value":true}}}],"edges":[]})).unwrap();
    let initial = service
        .create(
            "strict",
            manifest,
            json!({}),
            2,
            &Host::default(),
            &Transports::new(),
        )
        .unwrap();
    for field in ["previous", "receipt", "cause"] {
        let mut forged = serde_json::to_value(&initial.process).unwrap();
        forged[field] = Value::Null;
        let key = service.store.put("values", &forged).unwrap();
        fs::write(
            directory.path().join("processes/strict/head.json"),
            canonical(&json!({"contract":"algal.process-head.v1","name":"strict","record":key}))
                .unwrap(),
        )
        .unwrap();
        assert!(
            service
                .inspect("strict")
                .unwrap_err()
                .message
                .contains("omitted")
        );
    }
}

#[test]
fn native_process_command_shortcut_matches_typescript_executor_identity() {
    let directory = tempfile::tempdir().unwrap();
    let manifest = json!({"contract":"algal.organism.v1","key":"organism:command","name":"Command","cells":[{"id":"worker","kind":"agent","prompt":"work","output":{"kind":"text"}}],"edges":[]});
    let manifest_file = directory.path().join("command.algal.json");
    fs::write(&manifest_file, canonical(&manifest).unwrap()).unwrap();
    let state = directory.path().join("state");
    let command = "cat >/dev/null; printf '\"approved\"'";
    let create = std::process::Command::new(env!("CARGO_BIN_EXE_algal"))
        .arg("--dir")
        .arg(&state)
        .args(["process", "create", "command"])
        .arg(&manifest_file)
        .output()
        .unwrap();
    assert!(
        create.status.success(),
        "{}",
        String::from_utf8_lossy(&create.stderr)
    );
    let tick = std::process::Command::new(env!("CARGO_BIN_EXE_algal"))
        .arg("--dir")
        .arg(&state)
        .args(["process", "tick", "command", "--executor-cmd", command])
        .output()
        .unwrap();
    assert!(
        tick.status.success(),
        "{}",
        String::from_utf8_lossy(&tick.stderr)
    );
    let result: Value = serde_json::from_slice(&tick.stdout).unwrap();
    assert_eq!(result["process"]["status"], "complete");
    let store = Store::open(&state, false).unwrap();
    let receipt = store
        .get("runs", result["process"]["receipt"].as_str().unwrap())
        .unwrap()
        .unwrap();
    assert_eq!(
        receipt["effects"][0]["executor"],
        format!(
            "cmd:{}",
            digest(&json!({"command":command,"options":{}})).unwrap()
        )
    );
    assert_eq!(
        receipt["effects"][0]["configurationDigest"],
        digest(
            &json!({"argv":["sh","-c",command],"cwd":null,"kind":"command","timeoutMs":120_000})
        )
        .unwrap()
    );
    assert_eq!(receipt["effects"][0]["retryable"], false);
    let verified = std::process::Command::new(env!("CARGO_BIN_EXE_algal"))
        .arg("--dir")
        .arg(&state)
        .args(["process", "verify", "command"])
        .output()
        .unwrap();
    assert!(
        verified.status.success(),
        "{}",
        String::from_utf8_lossy(&verified.stderr)
    );
}

#[test]
fn native_process_command_failure_emits_snapshot_and_exits_unsuccessfully() {
    let directory = tempfile::tempdir().unwrap();
    let manifest = json!({"contract":"algal.organism.v1","key":"organism:failure","name":"Failure","cells":[{"id":"worker","kind":"agent","prompt":"work","output":{"kind":"text"}}],"edges":[]});
    let manifest_file = directory.path().join("failure.algal.json");
    fs::write(&manifest_file, canonical(&manifest).unwrap()).unwrap();
    let state = directory.path().join("state");
    let create = std::process::Command::new(env!("CARGO_BIN_EXE_algal"))
        .arg("--dir")
        .arg(&state)
        .args(["process", "create", "failure"])
        .arg(&manifest_file)
        .output()
        .unwrap();
    assert!(
        create.status.success(),
        "{}",
        String::from_utf8_lossy(&create.stderr)
    );
    let tick = std::process::Command::new(env!("CARGO_BIN_EXE_algal"))
        .arg("--dir")
        .arg(&state)
        .args([
            "process",
            "tick",
            "failure",
            "--executor-cmd",
            "cat >/dev/null; exit 1",
        ])
        .output()
        .unwrap();
    assert_eq!(tick.status.code(), Some(1));
    let result: Value = serde_json::from_slice(&tick.stdout).unwrap();
    assert_eq!(result["process"]["status"], "failed");
    assert!(result["process"]["receipt"].as_str().is_some());
}

#[tokio::test]
async fn journal_recovers_completed_effects_without_repeating_mailbox_send() {
    let directory = tempfile::tempdir().unwrap();
    let mailboxes = MailboxService::open(directory.path());
    let inbox = mailboxes.create("journal-in", 4, 1024).unwrap();
    let outbox = mailboxes.create("journal-out", 4, 1024).unwrap();
    let mut host = host(&mailboxes);
    let mut service = ProcessService::open(directory.path()).unwrap();
    service
        .create(
            "recover",
            receiver(),
            json!({"a-source":{"inbox":inbox.receive,"outbox":outbox.send,"payload":"once"}}),
            3,
            &host,
            &Transports::new(),
        )
        .unwrap();
    let result = service
        .tick_journal("recover", None, &mut host, &Transports::new(), true, 2)
        .await
        .unwrap();
    assert_eq!(result.process.status, "suspended");
    mailboxes.receive(&outbox.receive).unwrap();
    // Recreate the precise crash window after effect completion and before outcome publication.
    let intent = result.process.previous.as_ref().unwrap();
    fs::write(
        directory.path().join("processes/recover/head.json"),
        canonical(&json!({"contract":"algal.process-head.v1","name":"recover","record":intent}))
            .unwrap(),
    )
    .unwrap();
    let nonce = "a".repeat(64);
    fs::write(
        directory.path().join("processes/recover/.lock"),
        canonical(&json!({"contract":"algal.process-owner.v2","process":"recover","nonce":nonce}))
            .unwrap(),
    )
    .unwrap();
    let recovered = service
        .recover("recover", intent, &mut host, &Transports::new())
        .await
        .unwrap();
    assert_eq!(recovered.process.receipt, result.process.receipt);
    assert_eq!(recovered.process.generation, 1);
    assert!(!mailboxes.has_pending(&outbox.receive).unwrap());
    assert!(
        directory
            .path()
            .join(format!("processes/recover/owners/{nonce}.json"))
            .exists()
    );
    assert_eq!(service.verify("recover", &host).await.unwrap()["ok"], true);
}

#[tokio::test]
async fn journal_rejects_slots_before_publishing_an_uncertain_intent() {
    let directory = tempfile::tempdir().unwrap();
    let mut host = Host::default();
    let mut service = ProcessService::open(directory.path()).unwrap();
    let manifest=Manifest::parse(&json!({"contract":"algal.organism.v1","key":"organism:no-recovery-slot","name":"Mutable slot","cells":[{"id":"slot","kind":"slot","name":"mutable","mode":"read"}],"edges":[]})).unwrap();
    let initial = service
        .create("slot", manifest, json!({}), 2, &host, &Transports::new())
        .unwrap();
    assert!(
        service
            .tick_journal("slot", None, &mut host, &Transports::new(), true, 2)
            .await
            .is_err()
    );
    assert_eq!(service.inspect("slot").unwrap().digest, initial.digest);
}

#[tokio::test]
async fn journal_cli_inspects_latest_dispatch_after_resume() {
    let directory = tempfile::tempdir().unwrap();
    let mailboxes = MailboxService::open(directory.path());
    let inbox = mailboxes.create("journal-latest-in", 4, 1024).unwrap();
    let outbox = mailboxes.create("journal-latest-out", 4, 1024).unwrap();
    let mut host = host(&mailboxes);
    let mut service = ProcessService::open(directory.path()).unwrap();
    service
        .create(
            "inspect",
            receiver(),
            json!({"a-source":{"inbox":inbox.receive,"outbox":outbox.send,"payload":true}}),
            3,
            &host,
            &Transports::new(),
        )
        .unwrap();
    service
        .tick_journal("inspect", None, &mut host, &Transports::new(), true, 2)
        .await
        .unwrap();
    mailboxes
        .send(&inbox.send, json!("awake"), &external_wake_key().unwrap())
        .unwrap();
    let completed = service
        .tick_journal("inspect", None, &mut host, &Transports::new(), true, 2)
        .await
        .unwrap();
    assert_eq!(completed.process.status, "complete");
    let output = std::process::Command::new(env!("CARGO_BIN_EXE_algal"))
        .arg("--dir")
        .arg(directory.path())
        .args(["process", "journal", "inspect"])
        .output()
        .unwrap();
    assert!(
        output.status.success(),
        "{}",
        String::from_utf8_lossy(&output.stderr)
    );
    let report: Value = serde_json::from_slice(&output.stdout).unwrap();
    assert_eq!(
        report["header"]["intent"],
        json!(completed.process.previous)
    );
    assert_eq!(report["effects"].as_array().unwrap().len(), 1);
    assert_eq!(report["effects"][0]["record"]["state"], "completed");
    assert!(report["bytes"].as_u64().unwrap() > 0);
    assert_eq!(service.inspect("inspect").unwrap().digest, completed.digest);
}

#[tokio::test]
async fn timed_out_external_write_keeps_intent_uncertain_and_blocks_failure_dispatch() {
    let directory = tempfile::tempdir().unwrap();
    let tools = directory.path().join("tools.json");
    fs::write(&tools, serde_json::to_vec(&json!({
        "slow.v1": {"signature":{"inputs":{},"outputs":{"value":"text"},"effect":"write","cost":1,"maxOutputBytes":100},
            "exec":"cmd:printf started > started; sleep 1; printf '{\"value\":\"late\"}'"},
        "fallback.v1": {"signature":{"inputs":{"error":"json"},"outputs":{"value":"text"},"effect":"write","cost":1,"maxOutputBytes":100},
            "exec":"cmd:printf fallback > fallback; printf '{\"value\":\"fallback\"}'"}
    })).unwrap()).unwrap();
    let mut host = Host::default();
    host.load_tools(&tools).unwrap();
    let mut service = ProcessService::open(&directory.path().join("store")).unwrap();
    let manifest = Manifest::parse(&json!({
        "contract":"algal.organism.v1","key":"organism:uncertain-timeout","name":"Uncertain timeout",
        "cells":[
            {"id":"slow","kind":"tool","tool":"slow.v1","budget":{"maxEffectMs":100}},
            {"id":"fallback","kind":"tool","tool":"fallback.v1"}
        ],
        "edges":[{"from":{"cell":"slow","port":"value"},"to":{"cell":"fallback","port":"error"},"on":"fail"}]
    })).unwrap();
    service
        .create("timeout", manifest, json!({}), 3, &host, &Transports::new())
        .unwrap();
    assert!(
        service
            .tick_journal("timeout", None, &mut host, &Transports::new(), true, 2)
            .await
            .is_err()
    );
    assert!(directory.path().join("started").exists());
    assert!(!directory.path().join("fallback").exists());
    let snapshot = service.inspect("timeout").unwrap();
    assert_eq!(snapshot.process.status, "uncertain");
    let journal = service.journal("timeout").unwrap();
    assert_eq!(journal["effects"].as_array().unwrap().len(), 1);
    assert_eq!(journal["effects"][0]["record"]["state"], "started");
    assert!(
        service
            .recover("timeout", &snapshot.digest, &mut host, &Transports::new())
            .await
            .is_err()
    );
    assert!(!directory.path().join("fallback").exists());
}

#[cfg(unix)]
#[tokio::test]
async fn poisoned_journal_keeps_executor_cause_without_settlement_or_redispatch() {
    let directory = tempfile::tempdir().unwrap();
    let marker = directory.path().join("dispatches");
    let root = directory.path().join("store");
    let mut host = Host::default();
    host.entries.push((
        "owned-command".into(),
        Backend::Command {
            argv: vec![
                "/bin/sh".into(),
                "-c".into(),
                "/bin/cat >/dev/null; printf x >> \"$1\"; kill -KILL $$".into(),
                "algal-uncertain-fixture".into(),
                marker.to_string_lossy().into_owned(),
            ],
            cwd: None,
            timeout_ms: 3000,
        },
    ));
    let manifest = Manifest::parse(&json!({
        "contract":"algal.organism.v1","key":"organism:uncertain-cause","name":"Uncertain cause",
        "cells":[{"id":"worker","kind":"agent","prompt":"Return one word.","output":{"kind":"text"}}],
        "edges":[]
    }))
    .unwrap();
    let mut service = ProcessService::open(&root).unwrap();
    service
        .create("cause", manifest, json!({}), 3, &host, &Transports::new())
        .unwrap();
    let error = service
        .tick_journal("cause", None, &mut host, &Transports::new(), true, 2)
        .await
        .unwrap_err();
    assert_eq!(error.code, "RECOVERY_BLOCKED");
    assert!(
        error.message.contains("execution cause EFFECT_FAILED:")
            && error.message.contains("terminated by a signal")
            && error.message.contains("cell worker"),
        "original executor failure must survive the settlement guard: {error:?}"
    );
    assert!(error.message.len() <= 1024);
    assert_eq!(fs::read(&marker).unwrap(), b"x");
    let uncertain = service.inspect("cause").unwrap();
    assert_eq!(uncertain.process.status, "uncertain");
    assert!(uncertain.process.receipt.is_none());
    assert!(!root.join("runs").exists(), "unsettled receipt was stored");
    let journal = service.journal("cause").unwrap();
    assert_eq!(journal["effects"].as_array().unwrap().len(), 1);
    assert_eq!(journal["effects"][0]["record"]["state"], "started");
    assert_eq!(journal["effects"][0]["record"]["attempt"], 0);
    assert!(journal["effects"][0]["record"].get("receipt").is_none());
    drop(service);
    let mut restarted = ProcessService::open(&root).unwrap();
    assert!(
        restarted
            .tick_journal("cause", None, &mut host, &Transports::new(), true, 2)
            .await
            .is_err()
    );
    assert_eq!(
        restarted
            .schedule_journal(16, &mut host, &Transports::new(), true, 2)
            .await
            .unwrap()["ticks"],
        0
    );
    assert_eq!(
        restarted
            .recover("cause", &uncertain.digest, &mut host, &Transports::new())
            .await
            .unwrap_err()
            .code,
        "RECOVERY_BLOCKED"
    );
    assert_eq!(fs::read(&marker).unwrap(), b"x");
    assert_eq!(restarted.inspect("cause").unwrap().digest, uncertain.digest);
    assert_eq!(restarted.journal("cause").unwrap(), journal);
    assert!(!root.join("runs").exists());
}
