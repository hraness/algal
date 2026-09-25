//! Physical enumeration bounds include ignored residue before file filtering.
use algal::mailbox::{MAX_MAILBOX_DIRECTORY_ENTRIES, MailboxService};
use serde_json::{Value, json};
use std::{
    fs,
    path::Path,
    process::{Command, Output},
};
use tempfile::tempdir;

const LISTING_ENTRIES: usize = 4_096;
const MODULE_ENTRIES: usize = 4_096;
const MODULES: usize = 512;
const OWNER: &[u8] = b"retained owner evidence\n";
fn residue(directory: &Path, start: usize, end: usize) {
    for ordinal in start..end {
        let path = directory.join(format!("orphan-{ordinal}"));
        if ordinal % 2 == 1 {
            fs::create_dir(path).unwrap();
        } else {
            fs::write(path, format!("retained {ordinal}\n")).unwrap();
        }
    }
}
fn inventory(directory: &Path) -> Vec<(String, Option<Vec<u8>>)> {
    let mut rows: Vec<_> = fs::read_dir(directory)
        .unwrap()
        .map(|entry| {
            let entry = entry.unwrap();
            let bytes = if entry.file_type().unwrap().is_file() {
                Some(fs::read(entry.path()).unwrap())
            } else {
                None
            };
            (entry.file_name().into_string().unwrap(), bytes)
        })
        .collect();
    rows.sort();
    rows
}
fn cli(args: &[&str]) -> Output {
    Command::new(env!("CARGO_BIN_EXE_algal"))
        .args(args)
        .output()
        .unwrap()
}
fn refused(output: &Output, code: &str) {
    assert_eq!(output.status.code(), Some(2), "{output:?}");
    assert!(output.stdout.is_empty(), "{output:?}");
    let error: Value = serde_json::from_slice(&output.stderr).unwrap();
    assert_eq!(error["ok"], false);
    assert_eq!(error["error"]["code"], code, "{error}");
}
fn manifest() -> Value {
    json!({"contract":"algal.organism.v1","key":"organism:directory-admission","name":"Directory admission","cells":[{"id":"out","kind":"const","outputs":{"value":{"type":"json","value":"ok"}}}],"edges":[]})
}

#[test]
fn mailbox_namespace_counts_all_physical_entries_and_retains_owner_evidence() {
    assert_eq!(MAX_MAILBOX_DIRECTORY_ENTRIES, 2_064);
    let dir = tempdir().unwrap();
    let service = MailboxService::open(dir.path());
    let live = service.create("live", 64, 65_536).unwrap();
    let namespace = dir.path().join("mailboxes");
    let config = fs::read(namespace.join("live/config.json")).unwrap();
    fs::write(namespace.join(".held.lock"), OWNER).unwrap();
    residue(&namespace, 0, 2_061);
    assert_eq!(inventory(&namespace).len(), 2_063);
    assert_eq!(service.list().unwrap(), vec![live.clone()]);
    residue(&namespace, 2_061, 2_062);
    assert_eq!(service.list().unwrap(), vec![live]);
    residue(&namespace, 2_062, 2_063);
    let retained = inventory(&namespace);
    assert_eq!(service.list().unwrap_err().code, "BUDGET_EXHAUSTED");
    assert_eq!(
        service.create("refused", 64, 65_536).unwrap_err().code,
        "BUDGET_EXHAUSTED"
    );
    assert!(service.inspect("refused").unwrap().is_none());
    assert_eq!(inventory(&namespace), retained);
    assert_eq!(fs::read(namespace.join(".held.lock")).unwrap(), OWNER);
    assert_eq!(
        fs::read(namespace.join("live/config.json")).unwrap(),
        config
    );
    assert_eq!(
        fs::read_dir(dir.path().join("capabilities"))
            .unwrap()
            .count(),
        2
    );
}

#[test]
fn all_store_listings_enforce_physical_bounds_without_removing_residue() {
    let dir = tempdir().unwrap();
    let mut namespace = dir.path().join("runs");
    fs::create_dir(&namespace).unwrap();
    fs::write(
        namespace.join("record.json"),
        br#"{"fixture":"retained listing record"}"#,
    )
    .unwrap();
    fs::write(namespace.join(".held.lock"), OWNER).unwrap();
    residue(&namespace, 0, LISTING_ENTRIES - 3);
    for count in [LISTING_ENTRIES - 1, LISTING_ENTRIES, LISTING_ENTRIES + 1] {
        if count >= LISTING_ENTRIES {
            residue(&namespace, count - 3, count - 2);
        }
        assert_eq!(inventory(&namespace).len(), count);
        let retained = inventory(&namespace);
        for kind in ["runs", "slots", "manifests"] {
            let next = dir.path().join(kind);
            if next != namespace {
                fs::rename(&namespace, &next).unwrap();
                namespace = next;
            }
            let output = cli(&[kind, "--dir", dir.path().to_str().unwrap()]);
            if count > LISTING_ENTRIES {
                refused(&output, "BUDGET_EXHAUSTED");
            } else {
                assert!(output.status.success(), "{output:?}");
                let result: Value = serde_json::from_slice(&output.stdout).unwrap();
                assert_eq!(result[kind].as_array().unwrap().len(), 1);
            }
            assert_eq!(inventory(&namespace), retained);
            assert_eq!(fs::read(namespace.join(".held.lock")).unwrap(), OWNER);
        }
    }
}

#[test]
fn missing_listing_is_empty_but_non_directory_namespace_is_not() {
    let dir = tempdir().unwrap();
    for kind in ["runs", "slots", "manifests"] {
        let absent = cli(&[kind, "--dir", dir.path().to_str().unwrap()]);
        assert!(absent.status.success(), "{absent:?}");
        let result: Value = serde_json::from_slice(&absent.stdout).unwrap();
        assert_eq!(result[kind], json!([]));
        fs::write(dir.path().join(kind), OWNER).unwrap();
        let invalid = cli(&[kind, "--dir", dir.path().to_str().unwrap()]);
        refused(&invalid, "IO_FAILED");
        assert_eq!(fs::read(dir.path().join(kind)).unwrap(), OWNER);
    }
}

#[test]
fn module_physical_bound_precedes_loading_and_retains_ignored_entries() {
    let dir = tempdir().unwrap();
    let modules = dir.path().join("modules");
    fs::create_dir(&modules).unwrap();
    let input = modules.join("input.algal.json");
    fs::write(&input, serde_json::to_vec(&manifest()).unwrap()).unwrap();
    fs::write(modules.join(".held.lock"), OWNER).unwrap();
    residue(&modules, 0, MODULE_ENTRIES - 3);
    for count in [MODULE_ENTRIES - 1, MODULE_ENTRIES, MODULE_ENTRIES + 1] {
        if count >= MODULE_ENTRIES {
            residue(&modules, count - 3, count - 2);
        }
        assert_eq!(inventory(&modules).len(), count);
        let retained = inventory(&modules);
        let store = dir.path().join(format!("store-{count}"));
        let output = cli(&[
            "check",
            input.to_str().unwrap(),
            "--modules",
            modules.to_str().unwrap(),
            "--dir",
            store.to_str().unwrap(),
        ]);
        if count > MODULE_ENTRIES {
            refused(&output, "BUDGET_EXHAUSTED");
            assert_eq!(
                fs::symlink_metadata(store.join("manifests"))
                    .unwrap_err()
                    .kind(),
                std::io::ErrorKind::NotFound
            );
        } else {
            assert!(output.status.success(), "{output:?}");
        }
        assert_eq!(inventory(&modules), retained);
        assert_eq!(fs::read(modules.join(".held.lock")).unwrap(), OWNER);
    }
}

#[test]
fn module_filename_bound_is_separate_from_physical_entries_and_unique_content() {
    let dir = tempdir().unwrap();
    let modules = dir.path().join("modules");
    fs::create_dir(&modules).unwrap();
    let input = dir.path().join("input.algal.json");
    let body = serde_json::to_vec(&manifest()).unwrap();
    fs::write(&input, &body).unwrap();
    fs::write(modules.join(".held.lock"), OWNER).unwrap();
    for index in 0..MODULES - 1 {
        fs::write(modules.join(format!("module-{index}.algal.json")), &body).unwrap();
    }
    for count in [MODULES - 1, MODULES, MODULES + 1] {
        if count >= MODULES {
            fs::write(
                modules.join(format!("module-{}.algal.json", count - 1)),
                &body,
            )
            .unwrap();
        }
        let retained = inventory(&modules);
        let store = dir.path().join(format!("store-{count}"));
        let output = cli(&[
            "check",
            input.to_str().unwrap(),
            "--modules",
            modules.to_str().unwrap(),
            "--dir",
            store.to_str().unwrap(),
        ]);
        if count > MODULES {
            refused(&output, "BUDGET_EXHAUSTED");
        } else {
            assert!(output.status.success(), "{output:?}");
        }
        assert_eq!(inventory(&modules), retained);
        assert_eq!(fs::read(modules.join(".held.lock")).unwrap(), OWNER);
    }
}
