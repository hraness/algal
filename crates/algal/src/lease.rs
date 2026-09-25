//! Host-owned filesystem operations and a cross-runtime, crash-released lease.
use crate::{
    Error, Result,
    canonical::{canonical, read_json},
    durable_fs,
};
use rusqlite::{Connection, OpenFlags};
use serde_json::{Value, json};
use std::{
    fs::{self, OpenOptions},
    io::Read,
    path::{Path, PathBuf},
    time::{Duration, Instant},
};

/// Shared coordination leases (`.creation`, `.application-quota`) are held
/// briefly by every writer; a caller waits this long, polling at this
/// interval, before reporting live contention. Identical in `host-state.ts`.
pub(crate) const SHARED_LEASE_WAIT: Duration = Duration::from_millis(2000);
pub(crate) const SHARED_LEASE_POLL: Duration = Duration::from_millis(25);

pub(crate) fn directory(path: &Path) -> Result<()> {
    durable_fs::directory(path)
}
pub(crate) fn nodes(value: &Value) -> Result<()> {
    let mut stack = vec![(value, 0)];
    let mut count = 0;
    while let Some((v, depth)) = stack.pop() {
        count += 1;
        if count > 100_000 || depth > 64 {
            return Err(Error::limit("host JSON node/depth bound"));
        }
        match v {
            Value::Array(a) => stack.extend(a.iter().map(|v| (v, depth + 1))),
            Value::Object(o) => stack.extend(o.values().map(|v| (v, depth + 1))),
            _ => (),
        }
        if count + stack.len() > 100_000 {
            return Err(Error::limit("host JSON node count"));
        }
    }
    Ok(())
}
pub(crate) fn read(path: &Path, max: usize) -> Result<Option<Value>> {
    read_admitted(path, max, |_| Ok(()), false)
}

fn read_admitted(
    path: &Path,
    max: usize,
    admit: impl FnOnce(&Value) -> Result<()>,
    retain: bool,
) -> Result<Option<Value>> {
    let mut options = OpenOptions::new();
    options.read(true);
    #[cfg(unix)]
    {
        use std::os::unix::fs::OpenOptionsExt;
        options.custom_flags(libc::O_NOFOLLOW | libc::O_NONBLOCK);
    }
    let file = match options.open(path) {
        Ok(f) => f,
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => return Ok(None),
        Err(e) => return Err(e.into()),
    };
    let meta = file.metadata()?;
    if !meta.is_file() || meta.len() > max as u64 {
        return Err(Error::limit("host file type/bytes"));
    }
    // The bytes actually read must match the opened inode's length: a file
    // growing or shrinking under the read is never interpreted.
    let mut bytes = Vec::new();
    std::io::Read::take(&file, max as u64 + 1).read_to_end(&mut bytes)?;
    if bytes.len() > max || bytes.len() as u64 != meta.len() {
        return Err(Error::new("IO_FAILED", "host state changed while reading"));
    }
    let value = read_json(std::io::Cursor::new(bytes), max)?;
    nodes(&value)?;
    admit(&value)?;
    if retain {
        durable_fs::sync_retained(&file, path)?;
    }
    Ok(Some(value))
}
pub(crate) fn write(path: &Path, value: &Value, replace: bool) -> Result<()> {
    nodes(value)?;
    let bytes = canonical(value)?;
    if let Ok(meta) = fs::symlink_metadata(path)
        && (!meta.is_file() || meta.file_type().is_symlink())
    {
        return Err(Error::new(
            "IO_FAILED",
            "host publication target must be regular",
        ));
    }
    if !durable_fs::publish(path, bytes.as_bytes(), replace)? {
        let retained = read_admitted(
            path,
            bytes.len() + 1,
            |retained| {
                if canonical(retained)? != bytes {
                    return Err(Error::new("IO_FAILED", "immutable host file conflict"));
                }
                Ok(())
            },
            true,
        )?;
        if retained.is_none() {
            return Err(Error::new(
                "IO_FAILED",
                "retained host publication disappeared",
            ));
        }
    }
    Ok(())
}
pub(crate) fn names(path: &Path, max: usize) -> Result<Vec<String>> {
    names_where(path, max, |_| true)
}
/// List published record names. Entries must be regular files; names the
/// `keep` predicate rejects are skipped as stray residue before the bound.
pub(crate) fn names_where(
    path: &Path,
    max: usize,
    keep: impl Fn(&str) -> bool,
) -> Result<Vec<String>> {
    directory(path)?;
    let mut out = Vec::new();
    for (count, entry) in fs::read_dir(path)?.enumerate() {
        if count >= max * 2 + 16 {
            return Err(Error::limit("host directory physical entry count"));
        }
        let entry = entry?;
        if !entry.file_type()?.is_file() {
            return Err(Error::new("IO_FAILED", "host state entry must be regular"));
        }
        let name = entry
            .file_name()
            .into_string()
            .map_err(|_| Error::invalid("host state filename"))?;
        if name.len() == 53
            && name.starts_with(".tmp-")
            && name.as_bytes()[5..]
                .iter()
                .all(|c| c.is_ascii_digit() || (b'a'..=b'f').contains(c))
        {
            continue;
        }
        if !keep(&name) {
            continue;
        }
        out.push(name);
        if out.len() > max {
            return Err(Error::limit("host directory count"));
        }
    }
    out.sort();
    Ok(out)
}

/// Live contention on the SQLite mutex, reported with the same message as
/// `host-state.ts` so an exhausted shared wait agrees on the wire.
const CONTENDED: &str = "host lease is held by another live operation";

fn busy(error: &rusqlite::Error) -> bool {
    matches!(
        error,
        rusqlite::Error::SqliteFailure(code, _)
            if code.code == rusqlite::ErrorCode::DatabaseBusy
    )
}

fn sql(error: rusqlite::Error) -> Error {
    if busy(&error) {
        return Error::new("IO_FAILED", CONTENDED);
    }
    Error::new("IO_FAILED", format!("host lease database: {error}"))
}

fn phase_sql(phase: &'static str) -> impl Fn(rusqlite::Error) -> Error {
    move |error| {
        if busy(&error) {
            Error::new("IO_FAILED", CONTENDED)
        } else {
            Error::new("IO_FAILED", format!("host lease database {phase}: {error}"))
        }
    }
}

// Finish every read before attempting custody. A ready database must not run
// autocommit CREATE/INSERT: competing preparatory writes can both return BUSY.
#[derive(PartialEq)]
enum OwnerState {
    Missing,
    Empty,
    Ready,
}

fn owner_state(connection: &Connection) -> Result<OwnerState> {
    let objects: Vec<String> = connection
        .prepare("SELECT type FROM sqlite_schema WHERE name='algal_owner' COLLATE NOCASE LIMIT 2")
        .map_err(sql)?
        .query_map([], |row| row.get(0))
        .map_err(sql)?
        .collect::<std::result::Result<_, _>>()
        .map_err(sql)?;
    if objects.is_empty() {
        return Ok(OwnerState::Missing);
    }
    if objects != ["table"] {
        return Err(Error::new("IO_FAILED", "unknown host lease schema"));
    }
    let rows: Vec<String> = connection
        .prepare("SELECT contract FROM algal_owner LIMIT 2")
        .map_err(sql)?
        .query_map([], |row| row.get(0))
        .map_err(sql)?
        .collect::<std::result::Result<_, _>>()
        .map_err(sql)?;
    if rows == ["algal.process-owner.v2"] {
        return Ok(OwnerState::Ready);
    }
    if !rows.is_empty() {
        return Err(Error::new("IO_FAILED", "unknown host lease contract"));
    }
    // Only the known empty bootstrap schema may be completed. Do not populate
    // arbitrary empty tables, including ones with hidden/generated columns.
    let columns: Vec<(String, String, Option<String>, i64, i64)> = connection
        .prepare("SELECT name, type, dflt_value, pk, hidden FROM pragma_table_xinfo('algal_owner') LIMIT 2")
        .map_err(sql)?
        .query_map([], |row| {
            Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?, row.get(4)?))
        })
        .map_err(sql)?
        .collect::<std::result::Result<_, _>>()
        .map_err(sql)?;
    if columns.len() != 1
        || columns[0].0 != "contract"
        || !columns[0].1.eq_ignore_ascii_case("TEXT")
        || columns[0].2.is_some()
        || columns[0].3 != 1
        || columns[0].4 != 0
    {
        return Err(Error::new("IO_FAILED", "unknown host lease schema"));
    }
    Ok(OwnerState::Empty)
}

pub(crate) struct OwnerLease {
    connection: Connection,
    path: PathBuf,
    marker: Value,
}
impl OwnerLease {
    /// Live contention on the SQLite mutex, as distinct from every other
    /// custody failure (schema, marker, filesystem), which never retries.
    fn contended(error: &Error) -> bool {
        error.code == "IO_FAILED" && error.message == CONTENDED
    }

    /// Acquire, retrying only live contention until `wait` elapses. Every
    /// other failure and the acquired custody are exactly `acquire`'s.
    pub(crate) fn acquire_shared(
        path: &Path,
        process: &str,
        wait: Duration,
        poll: Duration,
    ) -> Result<Self> {
        let deadline = Instant::now() + wait;
        loop {
            match Self::acquire(path, process) {
                Err(error) if Self::contended(&error) && Instant::now() < deadline => {
                    std::thread::sleep(poll);
                }
                result => return result,
            }
        }
    }

    pub(crate) fn acquire(path: &Path, process: &str) -> Result<Self> {
        directory(path)?;
        let path = path.canonicalize()?;
        for suffix in ["", "-journal", "-wal", "-shm"] {
            let candidate = path.join(format!(".owner.sqlite{suffix}"));
            match fs::symlink_metadata(candidate) {
                Ok(m) if !m.is_file() || m.file_type().is_symlink() || m.len() > 65_536 => {
                    return Err(Error::new("IO_FAILED", "invalid host lease database file"));
                }
                Err(e) if e.kind() != std::io::ErrorKind::NotFound => return Err(e.into()),
                _ => (),
            }
        }
        let connection = Connection::open_with_flags(
            path.join(".owner.sqlite"),
            OpenFlags::SQLITE_OPEN_READ_WRITE
                | OpenFlags::SQLITE_OPEN_CREATE
                | OpenFlags::SQLITE_OPEN_NOFOLLOW
                | OpenFlags::SQLITE_OPEN_PRIVATE_CACHE,
        )
        .map_err(sql)?;
        connection
            .busy_timeout(std::time::Duration::ZERO)
            .map_err(sql)?;
        for (phase, statement) in [
            ("journal mode", "PRAGMA journal_mode=DELETE;"),
            ("synchronous mode", "PRAGMA synchronous=FULL;"),
        ] {
            connection
                .execute_batch(statement)
                .map_err(phase_sql(phase))?;
        }
        let mut state = owner_state(&connection)?;
        if state == OwnerState::Missing {
            connection
                .execute_batch("CREATE TABLE IF NOT EXISTS algal_owner(contract TEXT PRIMARY KEY);")
                .map_err(phase_sql("schema"))?;
            state = owner_state(&connection)?;
        }
        if state == OwnerState::Empty {
            connection
                .execute_batch(
                    "INSERT OR IGNORE INTO algal_owner(contract) VALUES('algal.process-owner.v2');",
                )
                .map_err(phase_sql("contract"))?;
        }
        connection
            .execute_batch("BEGIN IMMEDIATE;")
            .map_err(phase_sql("custody"))?;
        if owner_state(&connection)? != OwnerState::Ready {
            return Err(Error::new("IO_FAILED", "unknown host lease contract"));
        }
        let lock = path.join(".lock");
        if let Some(old) = read(&lock, 4096)? {
            let nonce = old["nonce"].as_str().unwrap_or("");
            if old.as_object().is_none_or(|o| o.len() != 3)
                || old["contract"] != "algal.process-owner.v2"
                || old["process"] != process
                || nonce.len() != 64
                || !nonce
                    .bytes()
                    .all(|c| c.is_ascii_digit() || (b'a'..=b'f').contains(&c))
            {
                return Err(Error::new(
                    "IO_FAILED",
                    "legacy process lock needs operator reconciliation",
                ));
            }
            let owners = path.join("owners");
            let old_names = names(&owners, 256)?;
            if old_names.iter().any(|n| {
                n.len() != 69
                    || !n.ends_with(".json")
                    || !n.as_bytes()[..64]
                        .iter()
                        .copied()
                        .all(|c| c.is_ascii_digit() || (b'a'..=b'f').contains(&c))
            }) {
                return Err(Error::invalid("host owner archive filename"));
            }
            if old_names.len() == 256 && !old_names.contains(&format!("{nonce}.json")) {
                return Err(Error::limit("host owner archive count"));
            }
            write(&owners.join(format!("{nonce}.json")), &old, false)?;
            durable_fs::unlink(&lock, "unlink-lock")?;
        }
        let mut bytes = [0u8; 32];
        getrandom::fill(&mut bytes)
            .map_err(|_| Error::new("IO_FAILED", "host owner entropy unavailable"))?;
        let nonce: String = bytes.iter().map(|b| format!("{b:02x}")).collect();
        let marker = json!({"contract":"algal.process-owner.v2","process":process,"nonce":nonce});
        write(&lock, &marker, false)?;
        Ok(Self {
            connection,
            path: lock,
            marker,
        })
    }
}
impl Drop for OwnerLease {
    fn drop(&mut self) {
        if read(&self.path, 4096).ok().flatten().as_ref() == Some(&self.marker) {
            let _ = durable_fs::unlink(&self.path, "unlink-lock");
        }
        let _ = self.connection.execute_batch("ROLLBACK");
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[cfg(unix)]
    use std::os::unix::fs::MetadataExt;
    use std::{cell::Cell, collections::BTreeMap, rc::Rc};

    fn model_marker(n: usize, process: &str) -> Value {
        json!({"contract":"algal.process-owner.v2","process":process,"nonce":format!("{n:064x}")})
    }

    fn model_archive_name(n: usize) -> String {
        format!("{n:064x}.json")
    }

    fn model_archive_fixture(count: usize) -> (tempfile::TempDir, PathBuf) {
        let temporary = tempfile::tempdir().unwrap();
        let root = temporary.path().canonicalize().unwrap();
        drop(OwnerLease::acquire(&root, "model").unwrap());
        let owners = root.join("owners");
        fs::create_dir(&owners).unwrap();
        // Construct bounded retained state before the observed operation.
        for n in 0..count {
            fs::write(
                owners.join(model_archive_name(n)),
                canonical(&model_marker(n, "model")).unwrap(),
            )
            .unwrap();
        }
        (temporary, root)
    }

    fn model_retained(root: &Path) -> BTreeMap<String, Vec<u8>> {
        fs::read_dir(root)
            .unwrap()
            .map(|entry| {
                let entry = entry.unwrap();
                (
                    entry.file_name().into_string().unwrap(),
                    fs::read(entry.path()).unwrap(),
                )
            })
            .collect()
    }

    #[test]
    fn model_owner_archive_admits_256_then_preserves_refused_257th() {
        let (_temporary, root) = model_archive_fixture(255);
        let owners = root.join("owners");
        #[cfg(unix)]
        let inode = fs::metadata(root.join(".owner.sqlite")).unwrap().ino();
        let old = canonical(&model_marker(255, "model")).unwrap();
        fs::write(root.join(".lock"), &old).unwrap();
        let owner = OwnerLease::acquire(&root, "model").unwrap();
        assert_eq!(model_retained(&owners).len(), 256);
        assert_eq!(
            fs::read_to_string(owners.join(model_archive_name(255))).unwrap(),
            old
        );
        drop(owner);
        let before = model_retained(&owners);
        let refused = canonical(&model_marker(256, "model")).unwrap();
        fs::write(root.join(".lock"), &refused).unwrap();
        let error = OwnerLease::acquire(&root, "model")
            .err()
            .expect("new archive at capacity must fail");
        assert_eq!(error.code, "BUDGET_EXHAUSTED");
        assert_eq!(fs::read_to_string(root.join(".lock")).unwrap(), refused);
        assert_eq!(model_retained(&owners), before);
        #[cfg(unix)]
        assert_eq!(
            fs::metadata(root.join(".owner.sqlite")).unwrap().ino(),
            inode
        );
    }

    #[test]
    fn model_full_archive_admits_equal_and_preserves_conflicting_winner() {
        for conflict in [false, true] {
            let (_temporary, root) = model_archive_fixture(256);
            let owners = root.join("owners");
            #[cfg(unix)]
            let inode = fs::metadata(root.join(".owner.sqlite")).unwrap().ino();
            if conflict {
                fs::write(
                    owners.join(model_archive_name(42)),
                    canonical(&model_marker(42, "other")).unwrap(),
                )
                .unwrap();
            }
            let before = model_retained(&owners);
            let old = canonical(&model_marker(42, "model")).unwrap();
            fs::write(root.join(".lock"), &old).unwrap();
            match OwnerLease::acquire(&root, "model") {
                Ok(owner) => {
                    assert!(!conflict);
                    drop(owner);
                }
                Err(error) => {
                    assert!(conflict);
                    assert_eq!(error.code, "IO_FAILED");
                    assert_eq!(fs::read_to_string(root.join(".lock")).unwrap(), old);
                }
            }
            assert_eq!(model_retained(&owners), before);
            #[cfg(unix)]
            assert_eq!(
                fs::metadata(root.join(".owner.sqlite")).unwrap().ino(),
                inode
            );
        }
    }

    #[test]
    fn model_archive_is_retained_before_old_marker_removal_failure() {
        let (_temporary, root) = model_archive_fixture(0);
        let old = canonical(&model_marker(42, "model")).unwrap();
        fs::write(root.join(".lock"), &old).unwrap();
        let reached = Rc::new(Cell::new(false));
        let observed = reached.clone();
        let probe_root = root.clone();
        let probe_old = old.clone();
        let result = durable_fs::with_probe(
            Rc::new(move |event| {
                if event.step == "unlink-lock"
                    && event.phase == "before"
                    && event.path == probe_root.join(".lock")
                {
                    observed.set(true);
                    assert_eq!(
                        fs::read_to_string(probe_root.join("owners").join(model_archive_name(42)))
                            .unwrap(),
                        probe_old
                    );
                    return Err(Error::new("IO_FAILED", "archive-before-clear cut"));
                }
                Ok(())
            }),
            || OwnerLease::acquire(&root, "model"),
        );
        assert!(reached.get());
        assert_eq!(
            result
                .err()
                .expect("removal cut must reject admission")
                .message,
            "archive-before-clear cut"
        );
        assert_eq!(fs::read_to_string(root.join(".lock")).unwrap(), old);
        assert_eq!(model_retained(&root.join("owners")).len(), 1);
        drop(OwnerLease::acquire(&root, "model").unwrap());
        assert_eq!(
            fs::read_to_string(root.join("owners").join(model_archive_name(42))).unwrap(),
            old
        );
    }

    #[test]
    fn model_native_drop_suppresses_cleanup_error_but_releases_live_custody() {
        for before_unlink in [true, false] {
            let (_temporary, root) = model_archive_fixture(0);
            #[cfg(unix)]
            let inode = fs::metadata(root.join(".owner.sqlite")).unwrap().ino();
            let armed = Rc::new(Cell::new(false));
            let removed = Rc::new(Cell::new(false));
            let reached = Rc::new(Cell::new(false));
            let probe_armed = armed.clone();
            let probe_removed = removed.clone();
            let probe_reached = reached.clone();
            let probe_root = root.clone();
            let (returned, marker) = durable_fs::with_probe(
                Rc::new(move |event| {
                    if !probe_armed.get() {
                        return Ok(());
                    }
                    if event.step == "unlink-lock"
                        && event.phase == "after"
                        && event.path == probe_root.join(".lock")
                    {
                        probe_removed.set(true);
                    }
                    let target = if before_unlink {
                        event.step == "unlink-lock"
                            && event.phase == "before"
                            && event.path == probe_root.join(".lock")
                    } else {
                        probe_removed.get()
                            && event.step == "dir-sync"
                            && event.phase == "before"
                            && event.path == probe_root
                    };
                    if target {
                        probe_reached.set(true);
                        return Err(Error::new("IO_FAILED", "native cleanup cut"));
                    }
                    Ok(())
                }),
                || {
                    let owner = OwnerLease::acquire(&root, "model").unwrap();
                    let marker = fs::read(root.join(".lock")).unwrap();
                    armed.set(true);
                    drop(owner);
                    ("callback completed", marker)
                },
            );
            assert_eq!(returned, "callback completed");
            assert!(armed.get() && reached.get());
            if before_unlink {
                assert_eq!(fs::read(root.join(".lock")).unwrap(), marker);
            } else {
                assert!(!root.join(".lock").exists());
            } // Visibility only, not a power-loss guarantee.
            drop(OwnerLease::acquire(&root, "model").unwrap());
            let archives = model_retained(&root.join("owners"));
            assert_eq!(archives.len(), usize::from(before_unlink));
            if before_unlink {
                assert_eq!(archives.values().next().unwrap(), &marker);
            }
            #[cfg(unix)]
            assert_eq!(
                fs::metadata(root.join(".owner.sqlite")).unwrap().ino(),
                inode
            );
        }
    }
    #[test]
    fn sqlite_excludes_live_owners_and_releases_after_drop() {
        let root = tempfile::tempdir().unwrap();
        let owner = OwnerLease::acquire(root.path(), "worker").unwrap();
        assert!(OwnerLease::acquire(root.path(), "worker").is_err());
        assert!(root.path().join(".lock").exists());
        drop(owner);
        assert!(!root.path().join(".lock").exists());
        assert!(OwnerLease::acquire(root.path(), "worker").is_ok());
    }
    #[test]
    fn recognized_stale_marker_is_archived_but_legacy_marker_is_retained() {
        let root = tempfile::tempdir().unwrap();
        let nonce = "a".repeat(64);
        let marker = json!({"contract":"algal.process-owner.v2","process":"worker","nonce":nonce});
        write(&root.path().join(".lock"), &marker, false).unwrap();
        let owner = OwnerLease::acquire(root.path(), "worker").unwrap();
        assert_eq!(
            read(
                &root.path().join("owners").join(format!("{nonce}.json")),
                4096
            )
            .unwrap(),
            Some(marker)
        );
        drop(owner);
        std::fs::write(root.path().join(".lock"), "legacy interrupted owner").unwrap();
        assert!(OwnerLease::acquire(root.path(), "worker").is_err());
        assert!(root.path().join(".lock").exists());
    }
    #[test]
    fn unfinished_publications_are_preserved_and_bounded() {
        let root = tempfile::tempdir().unwrap();
        let temporary = root.path().join(format!(".tmp-{}", "a".repeat(48)));
        std::fs::write(&temporary, "partial").unwrap();
        std::fs::write(root.path().join("000000.json"), "{}").unwrap();
        assert_eq!(names(root.path(), 1).unwrap(), vec!["000000.json"]);
        assert!(temporary.exists());
        for n in 0..18 {
            std::fs::write(root.path().join(format!(".tmp-{n:048x}")), "partial").unwrap();
        }
        assert!(names(root.path(), 1).is_err());
    }

    #[cfg(unix)]
    #[test]
    fn lease_database_symlink_is_rejected() {
        let root = tempfile::tempdir().unwrap();
        let outside = tempfile::NamedTempFile::new().unwrap();
        std::os::unix::fs::symlink(outside.path(), root.path().join(".owner.sqlite")).unwrap();
        assert!(OwnerLease::acquire(root.path(), "worker").is_err());
        assert_eq!(outside.as_file().metadata().unwrap().len(), 0);
    }
}
