//! Conservative application namespace accounting, not shared CAS attribution.
//! Failed publications retain durable reservations; there is no implicit refund.
use crate::{
    Error, Result,
    application_memory::{app_id, app_object as obj, app_tag as tag},
    canonical::canonical,
    contract::{integer, list},
    lease,
};
use serde_json::{Value, json};
use std::{collections::BTreeMap, fs, path::Path};

pub(crate) const APPLICATION_BYTES: u64 = 256 * 1024 * 1024;
const AGGREGATE_BYTES: u64 = 1024 * 1024 * 1024;
// Per owner: 256 x 4096-byte recovery records, four 65536-byte SQLite files,
// and a 4096-byte marker. Reserve future coordination growth independently.
const OWNER_HEADROOM: u64 = 2 * 1024 * 1024;
const ENTRIES: usize = 300_000;
const APPLICATION_ENTRIES: usize = 10_000;
const DEPTH: usize = 4;

fn fail(message: &str) -> Error {
    Error::limit(format!("Application namespace quota: {message}"))
}

fn measure(path: &Path, entries: &mut usize) -> Result<u64> {
    let start = *entries;
    fn visit(path: &Path, depth: usize, entries: &mut usize, start: usize) -> Result<u64> {
        *entries += 1;
        if *entries > ENTRIES || *entries - start > APPLICATION_ENTRIES || depth > DEPTH {
            return Err(fail("scan bound exceeded"));
        }
        let meta = fs::symlink_metadata(path)?;
        if meta.file_type().is_symlink() {
            return Err(fail("symlink is not admitted"));
        }
        if meta.is_dir() {
            let mut bytes = 0;
            for entry in fs::read_dir(path)? {
                bytes += visit(&entry?.path(), depth + 1, entries, start)?;
                if bytes > AGGREGATE_BYTES {
                    return Err(fail("aggregate bytes exhausted"));
                }
            }
            return Ok(bytes);
        }
        if !meta.is_file() {
            return Err(fail("nonregular file is not admitted"));
        }
        let file = crate::store::open_regular_file(path, AGGREGATE_BYTES as usize)?
            .ok_or_else(|| fail("file disappeared during scan"))?;
        Ok(file.metadata()?.len())
    }
    match fs::symlink_metadata(path) {
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(0),
        Err(error) => Err(error.into()),
        Ok(_) => visit(path, 0, entries, start),
    }
}

/// Reserve the actual namespace values before publication. Keep the returned
/// custody through those writes, then release it before any live dispatcher.
pub(crate) fn reserve(
    root: &Path,
    application: &str,
    writes: &[&Value],
) -> Result<lease::OwnerLease> {
    app_id(&json!(application))?;
    if writes.is_empty() || writes.len() > 64 {
        return Err(fail("invalid publication count"));
    }
    // Charge both temporary and final copies; a crash may retain both.
    let mut reservation = 0u64;
    for value in writes {
        reservation += 2 * canonical(value)?.len() as u64;
    }
    let quota = root.join(".application-quota");
    let custody = lease::OwnerLease::acquire_shared(
        &quota,
        "application-quota",
        lease::SHARED_LEASE_WAIT,
        lease::SHARED_LEASE_POLL,
    )?;
    let ledger_path = quota.join("ledger.json");
    let mut charged = BTreeMap::<String, u64>::new();
    if let Some(raw) = lease::read(&ledger_path, 8192)? {
        let ledger = obj(&raw, &["contract", "applications"])?;
        tag(&ledger["contract"], "algal.application-quota.v1")?;
        for raw in list(&ledger["applications"], 32)? {
            let row = obj(raw, &["application", "bytes"])?;
            let application = app_id(&row["application"])?;
            let bytes = integer(&row["bytes"], 0, APPLICATION_BYTES as usize)? as u64;
            if charged.insert(application.to_owned(), bytes).is_some() {
                return Err(fail("duplicate ledger identity"));
            }
        }
    }
    let mut entries = 0;
    let mut common = measure(&quota, &mut entries)?;
    let applications = root.join("applications");
    match fs::symlink_metadata(&applications) {
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => (),
        Err(error) => return Err(error.into()),
        Ok(meta) => {
            if !meta.is_dir() || meta.file_type().is_symlink() {
                return Err(fail("invalid namespace root"));
            }
            for (index, entry) in fs::read_dir(&applications)?.enumerate() {
                if index >= 33 {
                    return Err(fail("application count exceeded"));
                }
                let entry = entry?;
                let ty = entry.file_type()?;
                // Stray regular files are shared residue: charged to the
                // common allocation, never admitted as an application namespace.
                if ty.is_file() && !ty.is_symlink() {
                    common += measure(&entry.path(), &mut entries)?;
                    continue;
                }
                let name = entry
                    .file_name()
                    .into_string()
                    .map_err(|_| fail("invalid namespace entry"))?;
                if !ty.is_dir() || ty.is_symlink() {
                    return Err(fail("invalid namespace entry"));
                }
                let bytes = measure(&entry.path(), &mut entries)?;
                if name == ".creation" {
                    common += bytes;
                    continue;
                }
                app_id(&json!(name))?;
                let previous = charged.entry(name).or_default();
                *previous = (*previous).max(bytes + OWNER_HEADROOM);
            }
        }
    }
    let previous = charged.entry(application.to_owned()).or_default();
    *previous = (*previous).max(OWNER_HEADROOM) + reservation;
    if charged.len() > 32 {
        return Err(fail("retained application count exceeded"));
    }
    if charged.values().any(|bytes| *bytes > APPLICATION_BYTES) {
        return Err(fail("per-application bytes exhausted"));
    }
    if charged.values().sum::<u64>() + common + 2 * OWNER_HEADROOM + 16_384 > AGGREGATE_BYTES {
        return Err(fail("aggregate bytes exhausted"));
    }
    let applications = charged
        .into_iter()
        .map(|(application, bytes)| json!({"application":application,"bytes":bytes}))
        .collect::<Vec<_>>();
    lease::write(
        &ledger_path,
        &json!({"contract":"algal.application-quota.v1","applications":applications}),
        true,
    )?;
    Ok(custody)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sparse(path: &Path, bytes: u64) {
        fs::File::create(path).unwrap().set_len(bytes).unwrap();
    }
    fn ledger(root: &Path) -> Value {
        lease::read(&root.join(".application-quota/ledger.json"), 8192)
            .unwrap()
            .unwrap()
    }

    #[test]
    fn reservations_survive_failed_or_absent_publication() {
        let root = tempfile::tempdir().unwrap();
        let value = json!({"retained":"evidence"});
        let charge = 2 * canonical(&value).unwrap().len() as u64;
        drop(reserve(root.path(), "one", &[&value]).unwrap());
        assert_eq!(
            ledger(root.path())["applications"],
            json!([{"application":"one","bytes":OWNER_HEADROOM+charge}])
        );
        drop(reserve(root.path(), "one", &[&value]).unwrap());
        assert_eq!(
            ledger(root.path())["applications"][0]["bytes"],
            OWNER_HEADROOM + charge * 2
        );
    }

    #[test]
    fn exact_boundary_retains_charge_when_namespace_files_disappear() {
        let root = tempfile::tempdir().unwrap();
        let app = root.path().join("applications/one");
        fs::create_dir_all(&app).unwrap();
        sparse(&app.join("orphan"), APPLICATION_BYTES - OWNER_HEADROOM - 8);
        drop(reserve(root.path(), "one", &[&Value::Null]).unwrap());
        assert_eq!(
            ledger(root.path())["applications"][0]["bytes"],
            APPLICATION_BYTES
        );
        fs::remove_file(app.join("orphan")).unwrap();
        assert!(
            reserve(root.path(), "one", &[&Value::Null])
                .err()
                .unwrap()
                .message
                .contains("per-application")
        );
    }

    #[test]
    fn aggregate_counts_unindexed_prepared_temporary_and_orphaned_files() {
        let root = tempfile::tempdir().unwrap();
        for name in ["one", "two", "three", "four"] {
            let app = root.path().join("applications").join(name);
            fs::create_dir_all(&app).unwrap();
            sparse(&app.join(".tmp-retained"), 253 * 1024 * 1024);
        }
        assert!(
            reserve(root.path(), "five", &[&Value::Null])
                .err()
                .unwrap()
                .message
                .contains("aggregate")
        );
        assert!(!root.path().join(".application-quota/ledger.json").exists());
    }

    #[test]
    fn distinct_applications_share_exclusive_quota_publication_custody() {
        let root = tempfile::tempdir().unwrap();
        let first = reserve(root.path(), "one", &[&Value::Null]).unwrap();
        assert!(reserve(root.path(), "two", &[&Value::Null]).is_err());
        drop(first);
        drop(reserve(root.path(), "two", &[&Value::Null]).unwrap());
        assert_eq!(
            ledger(root.path())["applications"]
                .as_array()
                .unwrap()
                .len(),
            2
        );
    }

    #[cfg(unix)]
    #[test]
    fn scans_reject_symlinks_deep_trees_and_excessive_entries() {
        let root = tempfile::tempdir().unwrap();
        let app = root.path().join("applications/one");
        fs::create_dir_all(&app).unwrap();
        std::os::unix::fs::symlink(root.path(), app.join("link")).unwrap();
        assert!(
            reserve(root.path(), "one", &[&Value::Null])
                .err()
                .unwrap()
                .message
                .contains("symlink")
        );
        fs::remove_file(app.join("link")).unwrap();
        fs::create_dir_all(app.join("a/b/c/d/e")).unwrap();
        assert!(
            reserve(root.path(), "one", &[&Value::Null])
                .err()
                .unwrap()
                .message
                .contains("scan bound")
        );
        fs::remove_dir_all(app.join("a")).unwrap();
        for index in 0..APPLICATION_ENTRIES {
            sparse(&app.join(index.to_string()), 0);
        }
        assert!(
            reserve(root.path(), "one", &[&Value::Null])
                .err()
                .unwrap()
                .message
                .contains("scan bound")
        );
    }

    #[test]
    fn fallback_does_not_claim_unrelated_shared_cas() {
        let root = tempfile::tempdir().unwrap();
        fs::create_dir(root.path().join("values")).unwrap();
        sparse(&root.path().join("values/unrelated"), AGGREGATE_BYTES + 1);
        drop(reserve(root.path(), "one", &[&Value::Null]).unwrap());
        assert_eq!(
            ledger(root.path())["applications"][0]["bytes"],
            OWNER_HEADROOM + 8
        );
    }
}
