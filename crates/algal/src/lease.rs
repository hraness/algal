//! Host-owned filesystem operations and a cross-runtime, crash-released lease.
use crate::{
    Error, Result,
    canonical::{canonical, read_json},
};
use rusqlite::{Connection, OpenFlags};
use serde_json::{Value, json};
use std::{
    fs::{self, File, OpenOptions},
    io::Write,
    path::{Path, PathBuf},
};

pub(crate) fn directory(path: &Path) -> Result<()> {
    match fs::symlink_metadata(path) {
        Ok(m) if m.file_type().is_dir() && !m.file_type().is_symlink() => Ok(()),
        Ok(_) => Err(Error::new(
            "IO_FAILED",
            "host directory must be a real directory",
        )),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => {
            if let Some(parent) = path.parent() {
                directory(parent)?;
            }
            let mut builder = fs::DirBuilder::new();
            #[cfg(unix)]
            {
                use std::os::unix::fs::DirBuilderExt;
                builder.mode(0o700);
            }
            match builder.create(path) {
                Ok(()) => {
                    if let Some(parent) = path.parent() {
                        File::open(parent)?.sync_all()?;
                    }
                    Ok(())
                }
                Err(e) if e.kind() == std::io::ErrorKind::AlreadyExists => directory(path),
                Err(e) => Err(e.into()),
            }
        }
        Err(e) => Err(e.into()),
    }
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
    let value = read_json(file, max)?;
    nodes(&value)?;
    Ok(Some(value))
}
pub(crate) fn write(path: &Path, value: &Value, replace: bool) -> Result<()> {
    nodes(value)?;
    let parent = path
        .parent()
        .ok_or_else(|| Error::invalid("host file parent"))?;
    directory(parent)?;
    let bytes = canonical(value)?;
    if let Ok(meta) = fs::symlink_metadata(path) {
        if !meta.is_file() || meta.file_type().is_symlink() {
            return Err(Error::new(
                "IO_FAILED",
                "host publication target must be regular",
            ));
        }
    }
    let mut random = [0u8; 24];
    getrandom::fill(&mut random)
        .map_err(|_| Error::new("IO_FAILED", "host temporary entropy unavailable"))?;
    let nonce: String = random.iter().map(|b| format!("{b:02x}")).collect();
    let temporary = parent.join(format!(".tmp-{nonce}"));
    let mut options = OpenOptions::new();
    options.write(true).create_new(true);
    #[cfg(unix)]
    {
        use std::os::unix::fs::OpenOptionsExt;
        options.mode(0o600);
    }
    let mut file = options.open(&temporary)?;
    let result = (|| -> Result<()> {
        file.write_all(bytes.as_bytes())?;
        file.sync_all()?;
        if replace {
            fs::rename(&temporary, path)?;
        } else {
            match fs::hard_link(&temporary, path) {
                Ok(()) => (),
                Err(e) if e.kind() == std::io::ErrorKind::AlreadyExists => {
                    if read(path, bytes.len() + 1)?.as_ref() != Some(value) {
                        return Err(Error::new("IO_FAILED", "immutable host file conflict"));
                    }
                }
                Err(e) => return Err(e.into()),
            }
        }
        File::open(parent)?.sync_all()?;
        Ok(())
    })();
    let _ = fs::remove_file(temporary);
    result
}
pub(crate) fn names(path: &Path, max: usize) -> Result<Vec<String>> {
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
        out.push(name);
        if out.len() > max {
            return Err(Error::limit("host directory count"));
        }
    }
    out.sort();
    Ok(out)
}

fn sql(error: rusqlite::Error) -> Error {
    Error::new("IO_FAILED", format!("host lease database: {error}"))
}

pub(crate) struct OwnerLease {
    connection: Connection,
    path: PathBuf,
    marker: Value,
}
impl OwnerLease {
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
        connection.execute_batch("PRAGMA journal_mode=DELETE; PRAGMA synchronous=FULL; CREATE TABLE IF NOT EXISTS algal_owner(contract TEXT PRIMARY KEY); INSERT OR IGNORE INTO algal_owner(contract) VALUES('algal.process-owner.v2'); BEGIN IMMEDIATE;").map_err(sql)?;
        let rows: Vec<String> = connection
            .prepare("SELECT contract FROM algal_owner")
            .map_err(sql)?
            .query_map([], |r| r.get(0))
            .map_err(sql)?
            .collect::<std::result::Result<_, _>>()
            .map_err(sql)?;
        if rows != ["algal.process-owner.v2"] {
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
            fs::remove_file(&lock)?;
            File::open(&path)?.sync_all()?;
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
            let _ = fs::remove_file(&self.path);
            if let Some(parent) = self.path.parent() {
                let _ = File::open(parent).and_then(|f| f.sync_all());
            }
        }
        let _ = self.connection.execute_batch("ROLLBACK");
    }
}

#[cfg(test)]
mod tests {
    use super::*;
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
