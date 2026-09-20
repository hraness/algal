use algal::{
    canonical::{canonical, digest},
    mailbox::{MAILBOX_DELIVERY_CONTRACT, MAILBOX_MESSAGE_CONTRACT, MAX_MAILBOXES, MailboxService},
};
use serde_json::{Value, json};
use std::{
    fs,
    path::Path,
    sync::{Arc, Barrier},
    thread,
};

fn write(path: &Path, value: &Value) {
    fs::create_dir_all(path.parent().unwrap()).unwrap();
    fs::write(path, canonical(value).unwrap()).unwrap();
}

#[test]
fn concurrent_conflicting_creators_never_widen_the_requested_bounds() {
    let temp = tempfile::tempdir().unwrap();
    let barrier = Arc::new(Barrier::new(3));
    let threads: Vec<_> = [(1, 32), (64, 1024)]
        .into_iter()
        .map(|bounds| {
            let barrier = barrier.clone();
            let root = temp.path().to_owned();
            thread::spawn(move || {
                barrier.wait();
                (
                    bounds,
                    MailboxService::open(&root).create("same", bounds.0, bounds.1),
                )
            })
        })
        .collect();
    barrier.wait();
    let results: Vec<_> = threads
        .into_iter()
        .map(|child| child.join().unwrap())
        .collect();
    assert_eq!(
        results.iter().filter(|(_, result)| result.is_ok()).count(),
        1
    );
    for ((messages, bytes), result) in results {
        match result {
            Ok(config) => assert_eq!(
                (config.max_messages, config.max_message_bytes),
                (messages, bytes)
            ),
            Err(error) => assert!(["IO_FAILED", "PARSE_FAILED"].contains(&error.code.as_str())),
        }
    }
    let service = MailboxService::open(temp.path());
    let config = service.inspect("same").unwrap().unwrap();
    assert_eq!(
        service
            .create("same", config.max_messages, config.max_message_bytes)
            .unwrap(),
        config
    );
    assert_eq!(
        fs::read_dir(temp.path().join("capabilities"))
            .unwrap()
            .count(),
        2
    );
}

#[test]
fn admission_uses_the_shared_sqlite_lease_before_publishing_any_mailbox() {
    let temp = tempfile::tempdir().unwrap();
    let admission = temp.path().join(".mailbox-admission");
    fs::create_dir(&admission).unwrap();
    let db = rusqlite::Connection::open(admission.join(".owner.sqlite")).unwrap();
    db.execute_batch("CREATE TABLE algal_owner(contract TEXT PRIMARY KEY); INSERT INTO algal_owner VALUES('algal.process-owner.v2'); BEGIN IMMEDIATE;").unwrap();
    let service = MailboxService::open(temp.path());
    assert_eq!(
        service.create("blocked", 2, 32).unwrap_err().code,
        "IO_FAILED"
    );
    assert!(!temp.path().join("mailboxes/blocked").exists());
    assert!(!temp.path().join("capabilities").exists());
    db.execute_batch("ROLLBACK;").unwrap();
    service.create("admitted", 2, 32).unwrap();
    assert!(!admission.join(".lock").exists());
}

#[test]
fn competing_creators_at_capacity_admit_at_most_one_new_identity() {
    let temp = tempfile::tempdir().unwrap();
    let service = MailboxService::open(temp.path());
    let template = serde_json::to_value(service.create("seed", 1, 8).unwrap()).unwrap();
    // Capacity counts published configurations; unused fixture entries need no
    // message/authority directories. Avoid O(n^2) creation and thousands of fsyncs.
    for index in 1..MAX_MAILBOXES - 1 {
        let mut config = template.clone();
        let name = format!("seed-{index}");
        config["name"] = json!(name);
        write(
            &temp.path().join("mailboxes").join(name).join("config.json"),
            &config,
        );
    }
    assert_eq!(service.list().unwrap().len(), MAX_MAILBOXES - 1);
    let barrier = Arc::new(Barrier::new(3));
    let threads: Vec<_> = ["last-a", "last-b"]
        .into_iter()
        .map(|name| {
            let barrier = barrier.clone();
            let root = temp.path().to_owned();
            thread::spawn(move || {
                barrier.wait();
                (name, MailboxService::open(&root).create(name, 1, 8))
            })
        })
        .collect();
    barrier.wait();
    let results: Vec<_> = threads
        .into_iter()
        .map(|child| child.join().unwrap())
        .collect();
    assert_eq!(
        results.iter().filter(|(_, result)| result.is_ok()).count(),
        1
    );
    assert_eq!(service.list().unwrap().len(), MAX_MAILBOXES);
    for (name, result) in results {
        if let Err(error) = result {
            assert!(["IO_FAILED", "BUDGET_EXHAUSTED"].contains(&error.code.as_str()));
            assert_eq!(
                service.create(name, 1, 8).unwrap_err().code,
                "BUDGET_EXHAUSTED"
            );
            assert!(!temp.path().join("mailboxes").join(name).exists());
        }
    }
    assert_eq!(
        fs::read_dir(temp.path().join("capabilities"))
            .unwrap()
            .count(),
        4
    );
}

#[test]
fn oversized_self_consistent_claim_is_rejected_without_consumption() {
    let temp = tempfile::tempdir().unwrap();
    let service = MailboxService::open(temp.path());
    let config = service.create("small", 2, 4).unwrap();
    let key = digest(&json!("oversize")).unwrap();
    let envelope = json!({"contract":MAILBOX_MESSAGE_CONTRACT,"mailbox":"small","idempotencyKey":key,"value":"éé"});
    let id = digest(&envelope).unwrap();
    let mut claim = envelope;
    claim["id"] = json!(id);
    let name = format!("{}.json", &key[7..]);
    let message = temp.path().join("mailboxes/small/messages").join(&name);
    let pending = temp.path().join("mailboxes/small/pending").join(&name);
    write(&message, &claim);
    write(
        &pending,
        &json!({"contract":MAILBOX_DELIVERY_CONTRACT,"id":id}),
    );
    let before_message = fs::read(&message).unwrap();
    let before_pending = fs::read(&pending).unwrap();
    assert_eq!(
        service.receive(&config.receive).unwrap_err().code,
        "BUDGET_EXHAUSTED"
    );
    assert_eq!(fs::read(&message).unwrap(), before_message);
    assert_eq!(fs::read(&pending).unwrap(), before_pending);
    assert!(
        !temp
            .path()
            .join("mailboxes/small/consumed")
            .join(name)
            .exists()
    );
    let exact = service.create("exact", 2, 4).unwrap();
    service.send(&exact.send, json!("é"), &key).unwrap();
    assert_eq!(service.receive(&exact.receive).unwrap()["message"], "é");
}
