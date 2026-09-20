//! Untrusted local artifacts must fail before a special file can block a CLI.
#![cfg(unix)]

use algal::{
    canonical::{canonical, digest},
    contract::Manifest,
    effects::Host,
    graph::Transports,
    mailbox::MailboxService,
    process::ProcessService,
    store::Store,
};
use serde_json::{Value, json};
use std::{
    fs,
    os::unix::fs::{FileTypeExt, symlink},
    path::Path,
    process::{Command, Output, Stdio},
    thread,
    time::{Duration, Instant},
};

fn write(path: &Path, value: &Value) {
    fs::create_dir_all(path.parent().unwrap()).unwrap();
    fs::write(path, canonical(value).unwrap()).unwrap();
}
fn fifo(path: &Path) {
    fs::create_dir_all(path.parent().unwrap()).unwrap();
    assert!(
        Command::new("/usr/bin/mkfifo")
            .arg(path)
            .status()
            .unwrap()
            .success()
    );
}
fn bounded(command: &mut Command) -> Output {
    let mut child = command
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .unwrap();
    let deadline = Instant::now() + Duration::from_secs(5);
    while child.try_wait().unwrap().is_none() {
        if Instant::now() >= deadline {
            let _ = child.kill();
            let output = child.wait_with_output().unwrap();
            panic!("artifact read did not terminate before deadline: {output:?}");
        }
        thread::sleep(Duration::from_millis(10));
    }
    child.wait_with_output().unwrap()
}
fn cli(root: &Path, args: &[&str]) -> Output {
    bounded(
        Command::new(env!("CARGO_BIN_EXE_algal"))
            .arg("--dir")
            .arg(root)
            .args(args),
    )
}
fn rejected(output: &Output, code: &str) {
    assert!(!output.status.success(), "{output:?}");
    let stderr = String::from_utf8_lossy(&output.stderr);
    assert!(stderr.contains(code), "{output:?}");
}
fn success(output: &Output) {
    assert!(output.status.success(), "{output:?}");
}

#[test]
fn explicit_inputs_reject_fifos_and_directories_but_preserve_regular_symlinks() {
    let temp = tempfile::tempdir().unwrap();
    let root = temp.path().join("store");
    let input = temp.path().join("input.json");
    fifo(&input);
    rejected(
        &cli(&root, &["store", "put", input.to_str().unwrap()]),
        "BUDGET_EXHAUSTED",
    );
    let link = temp.path().join("selected.json");
    symlink(&input, &link).unwrap();
    rejected(
        &cli(&root, &["store", "put", link.to_str().unwrap()]),
        "BUDGET_EXHAUSTED",
    );
    fs::remove_file(&input).unwrap();
    write(&input, &json!({"ok":true}));
    success(&cli(&root, &["store", "put", link.to_str().unwrap()]));
    rejected(
        &cli(&root, &["store", "put", temp.path().to_str().unwrap()]),
        "BUDGET_EXHAUSTED",
    );
    fs::write(&input, vec![b' '; 262_145]).unwrap();
    rejected(
        &cli(&root, &["store", "put", input.to_str().unwrap()]),
        "BUDGET_EXHAUSTED",
    );
}

#[test]
fn transport_bundle_descriptor_rejects_fifo_and_preserves_regular_symlink_support() {
    let temp = tempfile::tempdir().unwrap();
    let source = json!({"contract":"algal.organism.v1","key":"organism:transport-leaf","name":"Leaf","cells":[{"id":"input","kind":"input","outputs":{"v":"text"}}],"edges":[],"interface":{"inputs":{"v":{"cell":"input","port":"v"}},"outputs":{"v":{"cell":"input","port":"v"}}}});
    let leaf = Manifest::parse(&source).unwrap();
    let bundle = algal::store::pack(&leaf, &Store::default()).unwrap();
    let key = bundle["root"].as_str().unwrap();
    let path = temp.path().join(format!("{}.bundle.json", &key[7..]));
    fifo(&path);
    let outer = temp.path().join("outer.json");
    write(
        &outer,
        &json!({"contract":"algal.organism.v1","key":"organism:transport-outer","name":"Outer","cells":[{"id":"nested","kind":"organism","manifest":key,"via":"bundles"}],"edges":[]}),
    );
    let transports = temp.path().join("transports.json");
    write(
        &transports,
        &json!({"bundles":temp.path().to_str().unwrap()}),
    );
    let args = [
        "check",
        outer.to_str().unwrap(),
        "--transports",
        transports.to_str().unwrap(),
    ];
    rejected(&cli(&temp.path().join("store"), &args), "BUDGET_EXHAUSTED");
    assert!(fs::symlink_metadata(&path).unwrap().file_type().is_fifo());
    fs::remove_file(&path).unwrap();
    let content = temp.path().join("content.json");
    write(&content, &bundle);
    symlink(&content, &path).unwrap();
    success(&cli(&temp.path().join("store"), &args));
    assert!(
        fs::symlink_metadata(&path)
            .unwrap()
            .file_type()
            .is_symlink()
    );
}

#[test]
fn cas_get_and_existing_put_reject_special_files_without_mutation() {
    let temp = tempfile::tempdir().unwrap();
    let root = temp.path().join("store");
    let value = json!({"data":"retained"});
    let key = digest(&value).unwrap();
    let target = root.join("values").join(format!("{}.json", &key[7..]));
    fifo(&target);
    rejected(&cli(&root, &["store", "get", &key]), "BUDGET_EXHAUSTED");
    let input = temp.path().join("value.json");
    write(&input, &value);
    rejected(
        &cli(&root, &["store", "put", input.to_str().unwrap()]),
        "BUDGET_EXHAUSTED",
    );
    assert!(fs::symlink_metadata(&target).unwrap().file_type().is_fifo());
    fs::remove_file(&target).unwrap();
    symlink(&input, &target).unwrap();
    rejected(&cli(&root, &["store", "get", &key]), "IO_FAILED");
    fs::remove_file(&target).unwrap();
    write(&target, &value);
    success(&cli(&root, &["store", "get", &key]));
    success(&cli(&root, &["store", "put", input.to_str().unwrap()]));
}

#[test]
fn mailbox_claim_fifo_never_consumes_pending_delivery() {
    let temp = tempfile::tempdir().unwrap();
    let service = MailboxService::open(temp.path());
    let mailbox = service.create("inbox", 4, 1024).unwrap();
    let key = digest(&json!("one")).unwrap();
    service
        .send(&mailbox.send, json!({"ready":true}), &key)
        .unwrap();
    let name = format!("{}.json", &key[7..]);
    let claim = temp.path().join("mailboxes/inbox/messages").join(&name);
    let original = fs::read(&claim).unwrap();
    fs::remove_file(&claim).unwrap();
    fifo(&claim);
    rejected(
        &cli(temp.path(), &["mailbox", "receive", &mailbox.receive]),
        "BUDGET_EXHAUSTED",
    );
    assert!(
        temp.path()
            .join("mailboxes/inbox/pending")
            .join(&name)
            .exists()
    );
    assert!(
        !temp
            .path()
            .join("mailboxes/inbox/consumed")
            .join(&name)
            .exists()
    );
    assert!(!temp.path().join("mailboxes/inbox/.lock").exists());
    fs::remove_file(&claim).unwrap();
    fs::write(&claim, original).unwrap();
    success(&cli(temp.path(), &["mailbox", "receive", &mailbox.receive]));
    let config = temp.path().join("mailboxes/inbox/config.json");
    fs::remove_file(&config).unwrap();
    fifo(&config);
    rejected(&cli(temp.path(), &["mailbox", "list"]), "BUDGET_EXHAUSTED");
}

#[test]
fn process_head_and_record_reads_remain_bounded_and_absence_is_an_error() {
    let temp = tempfile::tempdir().unwrap();
    let mut service = ProcessService::open(temp.path()).unwrap();
    let manifest = Manifest::parse(&json!({"contract":"algal.organism.v1","key":"organism:file-admission","name":"File admission","cells":[{"id":"input","kind":"input","outputs":{"value":"json"}}],"edges":[]})).unwrap();
    let state = service
        .create(
            "review",
            manifest,
            json!({"input":{"value":true}}),
            2,
            &Host::default(),
            &Transports::new(),
        )
        .unwrap();
    success(&cli(temp.path(), &["process", "inspect", "review"]));
    let head = temp.path().join("processes/review/head.json");
    let original = fs::read(&head).unwrap();
    fs::remove_file(&head).unwrap();
    fifo(&head);
    rejected(
        &cli(temp.path(), &["process", "inspect", "review"]),
        "BUDGET_EXHAUSTED",
    );
    fs::remove_file(&head).unwrap();
    fs::write(&head, original).unwrap();
    let record = temp
        .path()
        .join("values")
        .join(format!("{}.json", &state.digest[7..]));
    fs::remove_file(&record).unwrap();
    fifo(&record);
    rejected(
        &cli(temp.path(), &["process", "inspect", "review"]),
        "BUDGET_EXHAUSTED",
    );
    fs::remove_file(&record).unwrap();
    rejected(
        &cli(temp.path(), &["process", "inspect", "review"]),
        "IO_FAILED",
    );
}

// Run non-CLI store entry points in a separate killable test process too.
#[test]
fn file_admission_api_child() {
    let Ok(root) = std::env::var("ALGAL_FILE_ADMISSION_CHILD_ROOT") else {
        return;
    };
    let mut store = Store::open(Path::new(&root), false).unwrap();
    let request = digest(&json!("request")).unwrap();
    assert_eq!(
        store.get_effect(&request, "fixture").unwrap_err().code,
        "BUDGET_EXHAUSTED"
    );
    assert_eq!(
        store.get_slot("blocked").unwrap_err().code,
        "BUDGET_EXHAUSTED"
    );
    assert_eq!(
        store
            .load_modules(&Path::new(&root).join("modules"))
            .unwrap_err()
            .code,
        "BUDGET_EXHAUSTED"
    );
    assert!(store.get_slot("absent").unwrap().is_none());
    assert!(store.get("values", &request).unwrap().is_none());
}

#[test]
fn cache_slots_and_modules_reject_fifos_in_a_bounded_child() {
    let temp = tempfile::tempdir().unwrap();
    let request = digest(&json!("request")).unwrap();
    let key = Store::effect_key(&request, "fixture").unwrap();
    fifo(
        &temp
            .path()
            .join("effects")
            .join(format!("{}.json", &key[7..])),
    );
    fifo(&temp.path().join("slots/blocked.json"));
    fifo(&temp.path().join("modules/blocked.algal.json"));
    success(&bounded(
        Command::new(std::env::current_exe().unwrap())
            .args(["--exact", "file_admission_api_child", "--nocapture"])
            .env("ALGAL_FILE_ADMISSION_CHILD_ROOT", temp.path()),
    ));
}
