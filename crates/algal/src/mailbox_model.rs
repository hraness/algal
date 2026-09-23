//! Bounded real-API correspondence controls for the mailbox protocol model.
use crate::{
    Error,
    canonical::digest,
    durable_fs::{Event, with_probe},
    mailbox::MailboxService,
};
use serde_json::{Value, json};
use std::{
    cell::{Cell, RefCell},
    collections::BTreeMap,
    fs,
    path::Path,
    rc::Rc,
    sync::mpsc,
    thread,
    time::Duration,
};

fn delivery_bytes(root: &Path) -> BTreeMap<String, Vec<u8>> {
    let mut result = BTreeMap::new();
    for kind in ["messages", "pending", "consumed"] {
        for entry in fs::read_dir(root.join("mailboxes/model").join(kind)).unwrap() {
            let entry = entry.unwrap();
            result.insert(
                format!("{kind}/{}", entry.file_name().to_str().unwrap()),
                fs::read(entry.path()).unwrap(),
            );
        }
    }
    result
}

fn authority_race(send: bool) {
    let temp = tempfile::tempdir().unwrap();
    let root = fs::canonicalize(temp.path()).unwrap();
    let service = MailboxService::open(&root);
    let config = service.create("model", 1, 64).unwrap();
    service
        .send(
            &config.send,
            json!("retained"),
            &digest(&json!("seed")).unwrap(),
        )
        .unwrap();
    let before = delivery_bytes(&root);
    let (selected_tx, selected_rx) = mpsc::channel();
    let (resume_tx, resume_rx) = mpsc::channel();
    let worker_root = root.clone();
    let handle = if send { &config.send } else { &config.receive }.clone();
    let worker = thread::spawn(move || {
        let paused = Cell::new(false);
        let acquired = Rc::new(Cell::new(0));
        let count = acquired.clone();
        let lock = worker_root.join("mailboxes/model/.lock");
        let probe = Rc::new(move |event: &Event| {
            if event.step != "create-lock" || event.path != lock {
                return Ok(());
            }
            if event.phase == "after" {
                count.set(count.get() + 1);
            } else if !paused.replace(true) {
                selected_tx
                    .send(())
                    .map_err(|_| Error::new("IO_FAILED", "model checkpoint receiver closed"))?;
                resume_rx
                    .recv_timeout(Duration::from_secs(5))
                    .map_err(|_| Error::new("IO_FAILED", "model checkpoint resume timed out"))?;
            }
            Ok(())
        });
        let result = with_probe(probe, || {
            let service = MailboxService::open(&worker_root);
            if send {
                service.send(&handle, json!("new"), &digest(&json!("new")).unwrap())
            } else {
                service.receive(&handle)
            }
        });
        (result, acquired.get())
    });
    let reached = selected_rx.recv_timeout(Duration::from_secs(5));
    let revoked = reached.as_ref().map(|()| {
        MailboxService::open(&root).revoke(if send { &config.send } else { &config.receive })
    });
    // Settle and join the exact owned worker before any assertion or temp cleanup.
    let _ = resume_tx.send(());
    let (result, acquired) = worker.join().unwrap();
    assert!(reached.is_ok());
    revoked.unwrap().unwrap();
    assert_eq!(acquired, 1);
    let error = result.unwrap_err();
    assert_eq!(error.code, "CAPABILITY_DENIED");
    assert!(!error.uncertain);
    assert_eq!(delivery_bytes(&root), before);
    assert!(!root.join("mailboxes/model/.lock").exists());
}

#[test]
fn send_rechecks_authority_after_prelock_revocation() {
    authority_race(true);
}

#[test]
fn receive_rechecks_authority_after_prelock_revocation() {
    authority_race(false);
}

#[test]
fn orphan_claim_needs_capacity_and_consumed_retry_never_enqueues() {
    let temp = tempfile::tempdir().unwrap();
    let root = fs::canonicalize(temp.path()).unwrap();
    let service = MailboxService::open(&root);
    let config = service.create("model", 1, 64).unwrap();
    let orphan = digest(&json!("orphan")).unwrap();
    let occupied = digest(&json!("occupied")).unwrap();
    let base = root.join("mailboxes/model");
    let marker = base.join("pending").join(format!("{}.json", &orphan[7..]));
    let claim = base.join("messages").join(format!("{}.json", &orphan[7..]));
    let reached = Rc::new(Cell::new(false));
    let observed = reached.clone();
    let result = with_probe(
        Rc::new(move |event| {
            if event.step == "link"
                && event.phase == "before"
                && event.target.as_ref() == Some(&marker)
            {
                observed.set(true);
                return Err(Error::new(
                    "IO_FAILED",
                    "model cut before pending publication",
                ));
            }
            Ok(())
        }),
        || service.send(&config.send, json!("orphan"), &orphan),
    );
    let error = result.unwrap_err();
    assert_eq!(error.code, "IO_FAILED");
    assert!(error.uncertain);
    assert!(reached.get());
    let retained = fs::read(&claim).unwrap();
    assert_eq!(fs::read_dir(base.join("pending")).unwrap().count(), 0);
    let other = service
        .send(&config.send, json!("occupied"), &occupied)
        .unwrap();
    assert_eq!(
        MailboxService::open(&root)
            .send(&config.send, json!("orphan"), &orphan)
            .unwrap_err()
            .code,
        "MAILBOX_FULL"
    );
    assert_eq!(fs::read(&claim).unwrap(), retained);
    assert_eq!(
        service.receive(&config.receive).unwrap(),
        json!({"id":other["id"], "message":"occupied"})
    );
    let admitted = service
        .send(&config.send, json!("orphan"), &orphan)
        .unwrap();
    assert_eq!(
        service.receive(&config.receive).unwrap(),
        json!({"id":admitted["id"], "message":"orphan"})
    );
    assert_eq!(
        MailboxService::open(&root)
            .send(&config.send, json!("orphan"), &orphan)
            .unwrap(),
        admitted
    );
    assert_eq!(fs::read(&claim).unwrap(), retained);
    assert_eq!(fs::read_dir(base.join("pending")).unwrap().count(), 0);
    assert_eq!(
        service.receive(&config.receive).unwrap_err().code,
        "EFFECT_SUSPENDED"
    );
}

#[test]
fn failed_return_after_transfer_does_not_restore_a_dequeued_message() {
    let temp = tempfile::tempdir().unwrap();
    let root = fs::canonicalize(temp.path()).unwrap();
    let service = MailboxService::open(&root);
    let config = service.create("model", 1, 64).unwrap();
    let key = digest(&json!("lost return")).unwrap();
    let sent = service.send(&config.send, json!("message"), &key).unwrap();
    let base = root.join("mailboxes/model");
    let probe_base = base.clone();
    let unlinked = Rc::new(Cell::new(false));
    let failed = Rc::new(Cell::new(false));
    let seen_unlink = unlinked.clone();
    let seen_failure = failed.clone();
    let result = with_probe(
        Rc::new(move |event| {
            if event.step == "unlink-lock"
                && event.phase == "after"
                && event.path == probe_base.join(".lock")
            {
                seen_unlink.set(true);
            }
            if seen_unlink.get()
                && event.step == "dir-sync"
                && event.phase == "after"
                && event.path == probe_base
            {
                seen_failure.set(true);
                return Err(Error::new(
                    "IO_FAILED",
                    "model cut after lock release barrier",
                ));
            }
            Ok(())
        }),
        || service.receive(&config.receive),
    );
    let error = result.unwrap_err();
    assert_eq!(error.code, "IO_FAILED");
    assert!(error.uncertain);
    assert!(unlinked.get() && failed.get());
    assert_eq!(fs::read_dir(base.join("pending")).unwrap().count(), 0);
    let consumed: Value = serde_json::from_slice(
        &fs::read(base.join("consumed").join(format!("{}.json", &key[7..]))).unwrap(),
    )
    .unwrap();
    assert_eq!(
        consumed,
        json!({"contract":"algal.mailbox-delivery.v1", "id":sent["id"]})
    );
    assert!(!base.join(".lock").exists());
    let reopened = MailboxService::open(&root);
    assert_eq!(
        reopened.receive(&config.receive).unwrap_err().code,
        "EFFECT_SUSPENDED"
    );
    assert_eq!(
        reopened.send(&config.send, json!("message"), &key).unwrap(),
        sent
    );
    assert!(!reopened.has_pending(&config.receive).unwrap());
}

#[test]
fn lost_receive_return_keeps_journal_started_and_blocks_fallback_and_recovery() {
    use crate::{contract::Manifest, effects::Host, graph::Transports, process::ProcessService};
    let temp = tempfile::tempdir().unwrap();
    let root = fs::canonicalize(temp.path()).unwrap();
    let mailboxes = MailboxService::open(&root);
    let inbox = mailboxes.create("model", 1, 64).unwrap();
    let fallback = mailboxes.create("fallback", 1, 4096).unwrap();
    let key = digest(&json!("lost return")).unwrap();
    let sent = mailboxes.send(&inbox.send, json!("message"), &key).unwrap();
    let mut host = Host::default();
    host.install_mailboxes(mailboxes.clone()).unwrap();
    let mut service = ProcessService::open(&root).unwrap();
    let manifest = Manifest::parse(&json!({
        "contract":"algal.organism.v1", "key":"organism:mailbox-lost-return", "name":"Mailbox lost return",
        "cells":[
            {"id":"source", "kind":"input", "outputs":{"inbox":{"type":"cap","capability":"mailbox-receive"}, "fallback":{"type":"cap","capability":"mailbox-send"}}},
            {"id":"receive", "kind":"tool", "tool":"mailbox.receive.v1"},
            {"id":"fallback", "kind":"tool", "tool":"mailbox.send.v1"}
        ],
        "edges":[
            {"from":{"cell":"source","port":"inbox"},"to":{"cell":"receive","port":"mailbox"}},
            {"from":{"cell":"source","port":"fallback"},"to":{"cell":"fallback","port":"mailbox"}},
            {"from":{"cell":"receive","port":"message"},"to":{"cell":"fallback","port":"message"},"on":"fail"}
        ]
    })).unwrap();
    service
        .create(
            "actor",
            manifest,
            json!({"source":{"inbox":inbox.receive,"fallback":fallback.send}}),
            3,
            &host,
            &Transports::new(),
        )
        .unwrap();
    let base = root.join("mailboxes/model");
    let probe_base = base.clone();
    let probe_root = root.clone();
    let unlinked = Cell::new(false);
    let reached = Rc::new(Cell::new(false));
    let observed = reached.clone();
    let started = Rc::new(RefCell::new(None));
    let captured = started.clone();
    let runtime = tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()
        .unwrap();
    let result = with_probe(
        Rc::new(move |event| {
            if event.step == "unlink-lock"
                && event.phase == "after"
                && event.path == probe_base.join(".lock")
            {
                unlinked.set(true);
            }
            if unlinked.get()
                && !observed.get()
                && event.step == "dir-sync"
                && event.phase == "after"
                && event.path == probe_base
            {
                observed.set(true);
                *captured.borrow_mut() = Some(ProcessService::open(&probe_root)?.journal("actor")?);
                return Err(Error::new(
                    "IO_FAILED",
                    "lost dequeue return after lock-release sync",
                ));
            }
            Ok(())
        }),
        || {
            runtime.block_on(service.tick_journal(
                "actor",
                None,
                &mut host,
                &Transports::new(),
                true,
                2,
            ))
        },
    );
    assert!(reached.get());
    let error = result.unwrap_err();
    assert_eq!(error.code, "RECOVERY_BLOCKED");
    assert!(!mailboxes.has_pending(&fallback.receive).unwrap());
    let uncertain = service.inspect("actor").unwrap();
    assert_eq!(uncertain.process.status, "uncertain");
    assert!(uncertain.process.receipt.is_none());
    let started = started.borrow().clone().unwrap();
    assert_eq!(started["effects"].as_array().unwrap().len(), 1);
    assert_eq!(started["effects"][0]["record"]["state"], "started");
    assert_eq!(started["effects"][0]["record"]["recovery"], "never");
    assert!(started["effects"][0]["record"].get("receipt").is_none());
    assert_eq!(service.journal("actor").unwrap(), started);
    assert_eq!(fs::read_dir(base.join("pending")).unwrap().count(), 0);
    let consumed: Value = serde_json::from_slice(
        &fs::read(base.join("consumed").join(format!("{}.json", &key[7..]))).unwrap(),
    )
    .unwrap();
    assert_eq!(
        consumed,
        json!({"contract":"algal.mailbox-delivery.v1", "id":sent["id"]})
    );
    let mut reopened = ProcessService::open(&root).unwrap();
    let error = runtime
        .block_on(reopened.recover("actor", &uncertain.digest, &mut host, &Transports::new()))
        .unwrap_err();
    assert_eq!(error.code, "RECOVERY_BLOCKED");
    assert_eq!(
        error.message,
        "unknown external write requires adapter reconciliation"
    );
    assert_eq!(reopened.inspect("actor").unwrap().digest, uncertain.digest);
    assert_eq!(reopened.journal("actor").unwrap(), started);
    assert!(!mailboxes.has_pending(&fallback.receive).unwrap());
}

#[test]
fn uncertainty_begins_at_mutation_attempt_and_survives_release_failure() {
    for operation in ["send", "receive", "revoke", "retry", "pending"] {
        for cut in ["admission", "publication", "release"] {
            if cut == "publication" && ["retry", "pending"].contains(&operation) {
                continue;
            }
            let temp = tempfile::tempdir().unwrap();
            let root = fs::canonicalize(temp.path()).unwrap();
            let service = MailboxService::open(&root);
            let config = service.create("model", 1, 64).unwrap();
            let key = digest(&json!("boundary")).unwrap();
            if !["send", "revoke"].contains(&operation) {
                service.send(&config.send, json!("message"), &key).unwrap();
            }
            let publication = if operation == "revoke" {
                root.join("capabilities")
            } else {
                root.join("mailboxes/model").join(if operation == "send" {
                    "messages"
                } else {
                    "consumed"
                })
            };
            let reached = Rc::new(Cell::new(false));
            let observed = reached.clone();
            let result = with_probe(
                Rc::new(move |event| {
                    let matches = event.phase == "before"
                        && match cut {
                            "admission" => event.step == "create-lock",
                            "publication" => event.step == "dir-sync" && event.path == publication,
                            _ => event.step == "unlink-lock",
                        };
                    if matches && !observed.replace(true) {
                        return Err(Error::new("IO_FAILED", "bounded mailbox failure"));
                    }
                    Ok(())
                }),
                || match operation {
                    "send" | "retry" => service
                        .send(&config.send, json!("message"), &key)
                        .map(|_| ()),
                    "receive" => service.receive(&config.receive).map(|_| ()),
                    "revoke" => service.revoke(&config.send),
                    _ => service.has_pending(&config.receive).map(|_| ()),
                },
            );
            assert!(reached.get(), "{operation}/{cut}");
            let error = result.unwrap_err();
            assert_eq!(error.code, "IO_FAILED");
            assert_eq!(error.message, "bounded mailbox failure");
            assert_eq!(
                error.uncertain,
                cut != "admission" && !["retry", "pending"].contains(&operation),
                "{operation}/{cut}"
            );
        }
    }
}
